import * as XLSX from 'xlsx';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

/**
 * Bulk category import from a spreadsheet (.xlsx/.xls/.csv).
 *
 * The slug is the business identifier, mirroring how the product importer uses
 * SKU: an existing slug updates that category, a new one creates it. Name is
 * deliberately *not* the key — `Category.name` carries no unique constraint, so
 * matching on it would make "Sparklers" vs "sparklers" an ambiguous write.
 *
 * When the Slug column is blank the slug is derived from the name, which is what
 * the product importer already does when it auto-creates a category. That makes
 * a name-only sheet the simple case it looks like, while a round-tripped export
 * that carries slugs updates in place rather than duplicating.
 *
 * Preview never writes; import runs in one transaction.
 */

// Canonical template headers. Matching is trim + case-insensitive on parse.
export const CATEGORY_IMPORT_COLUMNS = [
  'Category Name',
  'Slug',
  'Description',
  'Image URL',
  'Active',
] as const;

const REQUIRED_COLUMNS = ['Category Name'] as const;

const TEMPLATE_EXAMPLE_ROW = [
  'Sparklers',
  'sparklers',
  'Hand-held sparkler varieties for all ages.',
  'https://example.com/images/sparklers.jpg',
  'TRUE',
];

export type CategoryImportRowStatus = 'CREATE' | 'UPDATE' | 'SKIPPED';

export interface CategoryImportRowReport {
  row: number;
  slug: string;
  categoryName: string;
  status: CategoryImportRowStatus;
  reason: string;
}

export interface CategoryImportPreviewSummary {
  totalRows: number;
  validRows: number;
  rowsToCreate: number;
  rowsToUpdate: number;
  skippedRows: number;
  errors: CategoryImportRowReport[];
}

export interface CategoryImportResultSummary {
  totalRows: number;
  processedRows: number;
  createdCategories: number;
  updatedCategories: number;
  skippedRows: number;
  errors: CategoryImportRowReport[];
}

interface NormalizedRow {
  row: number;
  slug: string;
  name: string;
  // Optional cells: undefined = "cell left blank" (default on create, keep current value on update)
  description?: string;
  imagePath?: string;
  isActive?: boolean;
}

// ---------- Template ----------

export function buildCategoryTemplateWorkbook(): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet([[...CATEGORY_IMPORT_COLUMNS], TEMPLATE_EXAMPLE_ROW]);
  sheet['!cols'] = CATEGORY_IMPORT_COLUMNS.map((header, i) => {
    const example = String(TEMPLATE_EXAMPLE_ROW[i] ?? '');
    return { wch: Math.max(header.length + 2, example.length > 40 ? 45 : example.length + 2) };
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Categories');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

// ---------- Parsing & validation ----------

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/** TRUE/FALSE/YES/NO/1/0 (any case), real Excel booleans, or blank. Invalid -> Error. */
function parseBooleanCell(value: unknown, column: string): boolean | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (text === '') return undefined;
  if (['true', 'yes', '1'].includes(text)) return true;
  if (['false', 'no', '0'].includes(text)) return false;
  throw new Error(`${column} must be TRUE/FALSE, YES/NO or 1/0`);
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface ParsedSheet {
  headerIndex: Map<string, number>;
  rows: { rowNumber: number; cells: unknown[] }[];
}

function parseWorkbook(buffer: Buffer): ParsedSheet {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch {
    throw ApiError.badRequest('Could not read this file — it does not look like a valid spreadsheet.');
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw ApiError.badRequest('The workbook has no worksheets.');
  }

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheetName], {
    header: 1,
    raw: true,
    defval: null,
  });
  if (aoa.length === 0) {
    throw ApiError.badRequest('The first worksheet is empty.');
  }

  const headerIndex = new Map<string, number>();
  aoa[0].forEach((cell, index) => {
    const header = normalizeHeader(cell);
    if (header && !headerIndex.has(header)) {
      headerIndex.set(header, index);
    }
  });

  const missing = REQUIRED_COLUMNS.filter((column) => !headerIndex.has(column.toLowerCase()));
  if (missing.length > 0) {
    throw ApiError.badRequest(
      `Missing required column header(s): ${missing.join(', ')}. Please use the sample template without renaming headers.`,
    );
  }

  const rows = aoa
    .slice(1)
    .map((cells, index) => ({ rowNumber: index + 2, cells }))
    .filter(({ cells }) => cells.some((cell) => cellText(cell) !== ''));

  return { headerIndex, rows };
}

interface AnalyzedSheet {
  totalRows: number;
  validRows: NormalizedRow[];
  reports: CategoryImportRowReport[]; // one entry per non-empty row, in row order
}

function analyzeRows({ headerIndex, rows }: ParsedSheet): AnalyzedSheet {
  const cell = (cells: unknown[], column: (typeof CATEGORY_IMPORT_COLUMNS)[number]): unknown => {
    const index = headerIndex.get(column.toLowerCase());
    return index === undefined ? null : cells[index];
  };

  const validRows: NormalizedRow[] = [];
  const reports: CategoryImportRowReport[] = [];
  const seenSlugs = new Set<string>();

  for (const { rowNumber, cells } of rows) {
    const name = cellText(cell(cells, 'Category Name'));
    const explicitSlug = cellText(cell(cells, 'Slug'));
    const slug = toSlug(explicitSlug || name);

    const skip = (reason: string) => {
      reports.push({ row: rowNumber, slug, categoryName: name, status: 'SKIPPED', reason });
    };

    try {
      if (!name) {
        skip('Category Name missing');
        continue;
      }
      // A name of only punctuation ("---", "!!") slugs to an empty string, which
      // would collide with every other such row and break the unique index.
      if (!slug) {
        skip('Category Name has no letters or digits to build a slug from');
        continue;
      }
      if (seenSlugs.has(slug)) {
        skip('Duplicate category earlier in this file');
        continue;
      }

      const normalized: NormalizedRow = {
        row: rowNumber,
        slug,
        name,
        description: cellText(cell(cells, 'Description')) || undefined,
        imagePath: cellText(cell(cells, 'Image URL')) || undefined,
        isActive: parseBooleanCell(cell(cells, 'Active'), 'Active'),
      };

      seenSlugs.add(slug);
      validRows.push(normalized);
      // Status/reason are filled in later once existing slugs are known.
      reports.push({ row: rowNumber, slug, categoryName: name, status: 'CREATE', reason: '' });
    } catch (error) {
      skip(error instanceof Error ? error.message : 'Corrupted row');
    }
  }

  return { totalRows: rows.length, validRows, reports };
}

// ---------- Shared planning ----------

interface ImportPlan {
  analyzed: AnalyzedSheet;
  existingSlugs: Set<string>;
}

async function planImport(buffer: Buffer): Promise<ImportPlan> {
  const analyzed = analyzeRows(parseWorkbook(buffer));

  const slugs = analyzed.validRows.map((row) => row.slug);
  const existing =
    slugs.length > 0
      ? await prisma.category.findMany({ where: { slug: { in: slugs } }, select: { slug: true } })
      : [];
  const existingSlugs = new Set(existing.map((category) => category.slug));

  for (const report of analyzed.reports) {
    if (report.status !== 'SKIPPED' && existingSlugs.has(report.slug)) {
      report.status = 'UPDATE';
      report.reason = 'Existing category found';
    }
  }

  return { analyzed, existingSlugs };
}

// ---------- Preview (no writes) ----------

export async function buildCategoryImportPreview(buffer: Buffer): Promise<CategoryImportPreviewSummary> {
  const { analyzed, existingSlugs } = await planImport(buffer);

  const rowsToUpdate = analyzed.validRows.filter((row) => existingSlugs.has(row.slug)).length;

  return {
    totalRows: analyzed.totalRows,
    validRows: analyzed.validRows.length,
    rowsToCreate: analyzed.validRows.length - rowsToUpdate,
    rowsToUpdate,
    skippedRows: analyzed.totalRows - analyzed.validRows.length,
    errors: analyzed.reports,
  };
}

// ---------- Import (single transaction) ----------

export async function runCategoryImport(buffer: Buffer): Promise<CategoryImportResultSummary> {
  const { analyzed, existingSlugs } = await planImport(buffer);

  if (analyzed.validRows.length === 0) {
    throw ApiError.badRequest('No valid rows to import — fix the reported errors and try again.');
  }

  const creates = analyzed.validRows.filter((row) => !existingSlugs.has(row.slug));
  const updates = analyzed.validRows.filter((row) => existingSlugs.has(row.slug));

  await prisma.$transaction(
    async (tx) => {
      if (creates.length > 0) {
        const data: Prisma.CategoryCreateManyInput[] = creates.map((row) => ({
          name: row.name,
          slug: row.slug,
          description: row.description ?? '',
          imagePath: row.imagePath ?? null,
          isActive: row.isActive ?? true,
        }));
        await tx.category.createMany({ data });
      }

      // Blank optional cells keep the current value, matching the product importer.
      for (const row of updates) {
        await tx.category.update({
          where: { slug: row.slug },
          data: {
            name: row.name,
            ...(row.description !== undefined ? { description: row.description } : {}),
            ...(row.imagePath !== undefined ? { imagePath: row.imagePath } : {}),
            ...(row.isActive !== undefined ? { isActive: row.isActive } : {}),
          },
        });
      }
    },
    { timeout: 120_000 },
  );

  return {
    totalRows: analyzed.totalRows,
    processedRows: analyzed.validRows.length,
    createdCategories: creates.length,
    updatedCategories: updates.length,
    skippedRows: analyzed.totalRows - analyzed.validRows.length,
    errors: analyzed.reports.filter((report) => report.status === 'SKIPPED'),
  };
}
