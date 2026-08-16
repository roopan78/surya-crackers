import * as XLSX from 'xlsx';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

/**
 * Bulk product import from a spreadsheet (.xlsx/.xls/.csv), SKU as the business
 * identifier: existing SKUs update, new SKUs create, missing categories are
 * created automatically. Preview never writes; import runs in one transaction.
 *
 * The template/export column set deliberately mirrors the real Product model
 * (not a generic storefront schema) so a future "Export Products" feature can
 * emit this exact format and round-trip without edits.
 */

// Canonical template headers. Matching is trim + case-insensitive on parse.
export const IMPORT_COLUMNS = [
  'SKU',
  'Category',
  'Product Name',
  'Price',
  'Box Quantity',
  'Stock',
  'Image URL',
  'Video URL',
  'Safety Instructions',
  'Featured',
  'Active',
] as const;

const REQUIRED_COLUMNS = ['SKU', 'Category', 'Product Name', 'Price'] as const;

const TEMPLATE_EXAMPLE_ROW = [
  'SPR-10CM-001',
  'Sparklers',
  '10 CM Electric Sparklers',
  120,
  '10 Pcs per box',
  50,
  'https://example.com/images/spr-10cm.jpg',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'Light one at a time. Keep away from the face and flammable materials.',
  'TRUE',
  'TRUE',
];

const DEFAULT_BOX_QUANTITY = '1 Box';
const DEFAULT_SAFETY_INSTRUCTIONS =
  'Use under adult supervision. Light one piece at a time and keep away from flammable materials.';

export type ImportRowStatus = 'CREATE' | 'UPDATE' | 'SKIPPED';

export interface ImportRowReport {
  row: number;
  sku: string;
  productName: string;
  status: ImportRowStatus;
  reason: string;
}

export interface ImportPreviewSummary {
  totalRows: number;
  validRows: number;
  rowsToCreate: number;
  rowsToUpdate: number;
  categoriesToCreate: number;
  skippedRows: number;
  errors: ImportRowReport[];
}

export interface ImportResultSummary {
  totalRows: number;
  processedRows: number;
  createdCategories: number;
  createdProducts: number;
  updatedProducts: number;
  skippedRows: number;
  errors: ImportRowReport[];
}

interface NormalizedRow {
  row: number;
  sku: string;
  categoryName: string;
  name: string;
  price: number;
  // Optional cells: undefined = "cell left blank" (default on create, keep current value on update)
  boxQuantity?: string;
  stockCount?: number;
  imageUrl?: string;
  videoUrl?: string;
  safetyInstructions?: string;
  isFeatured?: boolean;
  isActive?: boolean;
}

// ---------- Template ----------

export function buildTemplateWorkbook(): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet([[...IMPORT_COLUMNS], TEMPLATE_EXAMPLE_ROW]);
  sheet['!cols'] = IMPORT_COLUMNS.map((header, i) => ({
    wch: Math.max(header.length + 2, String(TEMPLATE_EXAMPLE_ROW[i] ?? '').length > 40 ? 45 : String(TEMPLATE_EXAMPLE_ROW[i] ?? '').length + 2),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Products');
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

function parseNumberCell(value: unknown, column: string): number | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  if (text === '') return undefined;
  const parsed = Number(text.replace(/,/g, ''));
  if (!Number.isFinite(parsed)) {
    throw new Error(`${column} is not a valid number`);
  }
  return parsed;
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
  reports: ImportRowReport[]; // one entry per non-empty row, in row order
}

function analyzeRows({ headerIndex, rows }: ParsedSheet): AnalyzedSheet {
  const cell = (cells: unknown[], column: (typeof IMPORT_COLUMNS)[number]): unknown => {
    const index = headerIndex.get(column.toLowerCase());
    return index === undefined ? null : cells[index];
  };

  const validRows: NormalizedRow[] = [];
  const reports: ImportRowReport[] = [];
  const seenSkus = new Set<string>();

  for (const { rowNumber, cells } of rows) {
    const sku = cellText(cell(cells, 'SKU'));
    const name = cellText(cell(cells, 'Product Name'));
    const categoryName = cellText(cell(cells, 'Category'));

    const skip = (reason: string) => {
      reports.push({ row: rowNumber, sku, productName: name, status: 'SKIPPED', reason });
    };

    try {
      if (!sku) {
        skip('SKU missing');
        continue;
      }
      if (!categoryName) {
        skip('Category missing');
        continue;
      }
      if (!name) {
        skip('Product Name missing');
        continue;
      }
      const skuKey = sku.toLowerCase();
      if (seenSkus.has(skuKey)) {
        skip('Duplicate SKU earlier in this file');
        continue;
      }

      const price = parseNumberCell(cell(cells, 'Price'), 'Price');
      if (price === undefined) {
        skip('Price missing');
        continue;
      }
      if (price <= 0) {
        skip('Price must be greater than 0');
        continue;
      }

      const stockCount = parseNumberCell(cell(cells, 'Stock'), 'Stock');
      if (stockCount !== undefined && (!Number.isInteger(stockCount) || stockCount < 0)) {
        skip('Stock must be a whole number of 0 or more');
        continue;
      }

      const normalized: NormalizedRow = {
        row: rowNumber,
        sku,
        categoryName,
        name,
        price,
        stockCount,
        boxQuantity: cellText(cell(cells, 'Box Quantity')) || undefined,
        imageUrl: cellText(cell(cells, 'Image URL')) || undefined,
        videoUrl: cellText(cell(cells, 'Video URL')) || undefined,
        safetyInstructions: cellText(cell(cells, 'Safety Instructions')) || undefined,
        isFeatured: parseBooleanCell(cell(cells, 'Featured'), 'Featured'),
        isActive: parseBooleanCell(cell(cells, 'Active'), 'Active'),
      };

      seenSkus.add(skuKey);
      validRows.push(normalized);
      // Status/reason are filled in later once existing SKUs are known.
      reports.push({ row: rowNumber, sku, productName: name, status: 'CREATE', reason: '' });
    } catch (error) {
      skip(error instanceof Error ? error.message : 'Corrupted row');
    }
  }

  return { totalRows: rows.length, validRows, reports };
}

// ---------- Shared lookups ----------

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Returns a slug unique against `taken`, and reserves it. */
function uniqueSlug(base: string, taken: Set<string>): string {
  const root = toSlug(base) || 'item';
  let candidate = root;
  let suffix = 2;
  while (taken.has(candidate)) {
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }
  taken.add(candidate);
  return candidate;
}

interface ImportPlan {
  analyzed: AnalyzedSheet;
  categoryIdByKey: Map<string, string>; // lowercased category name -> existing id
  newCategoryNames: string[]; // insertion order, deduped case-insensitively
  existingSkuKey: Set<string>;
}

async function planImport(buffer: Buffer): Promise<ImportPlan> {
  const analyzed = analyzeRows(parseWorkbook(buffer));

  const skus = analyzed.validRows.map((row) => row.sku);
  const [existingProducts, existingCategories] = await Promise.all([
    skus.length > 0
      ? prisma.product.findMany({ where: { sku: { in: skus } }, select: { sku: true } })
      : Promise.resolve([]),
    prisma.category.findMany({ select: { id: true, name: true } }),
  ]);

  const existingSkuKey = new Set(existingProducts.map((p) => p.sku.toLowerCase()));
  const categoryIdByKey = new Map(existingCategories.map((c) => [c.name.trim().toLowerCase(), c.id]));

  const newCategoryNames: string[] = [];
  const plannedCategoryKeys = new Set<string>();
  for (const row of analyzed.validRows) {
    const key = row.categoryName.toLowerCase();
    if (!categoryIdByKey.has(key) && !plannedCategoryKeys.has(key)) {
      plannedCategoryKeys.add(key);
      newCategoryNames.push(row.categoryName);
    }
  }

  // Fill in CREATE vs UPDATE on the per-row report now that existing SKUs are known.
  for (const report of analyzed.reports) {
    if (report.status !== 'SKIPPED' && existingSkuKey.has(report.sku.toLowerCase())) {
      report.status = 'UPDATE';
      report.reason = 'Existing SKU found';
    }
  }

  return { analyzed, categoryIdByKey, newCategoryNames, existingSkuKey };
}

// ---------- Preview (no writes) ----------

export async function buildImportPreview(buffer: Buffer): Promise<ImportPreviewSummary> {
  const { analyzed, newCategoryNames, existingSkuKey } = await planImport(buffer);

  const rowsToUpdate = analyzed.validRows.filter((row) => existingSkuKey.has(row.sku.toLowerCase())).length;

  return {
    totalRows: analyzed.totalRows,
    validRows: analyzed.validRows.length,
    rowsToCreate: analyzed.validRows.length - rowsToUpdate,
    rowsToUpdate,
    categoriesToCreate: newCategoryNames.length,
    skippedRows: analyzed.totalRows - analyzed.validRows.length,
    errors: analyzed.reports,
  };
}

// ---------- Import (single transaction) ----------

export async function runImport(buffer: Buffer): Promise<ImportResultSummary> {
  const { analyzed, categoryIdByKey, newCategoryNames, existingSkuKey } = await planImport(buffer);

  if (analyzed.validRows.length === 0) {
    throw ApiError.badRequest('No valid rows to import — fix the reported errors and try again.');
  }

  const [productSlugs, categorySlugs] = await Promise.all([
    prisma.product.findMany({ select: { slug: true } }),
    prisma.category.findMany({ select: { slug: true } }),
  ]);
  const takenProductSlugs = new Set(productSlugs.map((p) => p.slug));
  const takenCategorySlugs = new Set(categorySlugs.map((c) => c.slug));

  const creates = analyzed.validRows.filter((row) => !existingSkuKey.has(row.sku.toLowerCase()));
  const updates = analyzed.validRows.filter((row) => existingSkuKey.has(row.sku.toLowerCase()));

  await prisma.$transaction(
    async (tx) => {
      // 1. Create missing categories and record their ids.
      for (const name of newCategoryNames) {
        const category = await tx.category.create({
          data: { name, slug: uniqueSlug(name, takenCategorySlugs), description: '' },
        });
        categoryIdByKey.set(name.trim().toLowerCase(), category.id);
      }

      // 2. Bulk-create new products (slugs pre-reserved, so no collisions).
      if (creates.length > 0) {
        const data: Prisma.ProductCreateManyInput[] = creates.map((row) => ({
          name: row.name,
          sku: row.sku,
          slug: uniqueSlug(row.name, takenProductSlugs),
          categoryId: categoryIdByKey.get(row.categoryName.toLowerCase())!,
          price: row.price,
          boxQuantity: row.boxQuantity ?? DEFAULT_BOX_QUANTITY,
          imageUrls: row.imageUrl ? [row.imageUrl] : [],
          videoUrl: row.videoUrl ?? null,
          safetyInstructions: row.safetyInstructions ?? DEFAULT_SAFETY_INSTRUCTIONS,
          isFeatured: row.isFeatured ?? false,
          isActive: row.isActive ?? true,
          stockCount: row.stockCount ?? 0,
        }));
        await tx.product.createMany({ data });
      }

      // 3. Update existing products. Blank optional cells keep the current value.
      for (const row of updates) {
        await tx.product.update({
          where: { sku: row.sku },
          data: {
            name: row.name,
            categoryId: categoryIdByKey.get(row.categoryName.toLowerCase())!,
            price: row.price,
            ...(row.boxQuantity !== undefined ? { boxQuantity: row.boxQuantity } : {}),
            ...(row.imageUrl !== undefined ? { imageUrls: [row.imageUrl] } : {}),
            ...(row.videoUrl !== undefined ? { videoUrl: row.videoUrl } : {}),
            ...(row.safetyInstructions !== undefined ? { safetyInstructions: row.safetyInstructions } : {}),
            ...(row.isFeatured !== undefined ? { isFeatured: row.isFeatured } : {}),
            ...(row.isActive !== undefined ? { isActive: row.isActive } : {}),
            ...(row.stockCount !== undefined ? { stockCount: row.stockCount } : {}),
          },
        });
      }
    },
    { timeout: 120_000 },
  );

  return {
    totalRows: analyzed.totalRows,
    processedRows: analyzed.validRows.length,
    createdCategories: newCategoryNames.length,
    createdProducts: creates.length,
    updatedProducts: updates.length,
    skippedRows: analyzed.totalRows - analyzed.validRows.length,
    errors: analyzed.reports.filter((report) => report.status === 'SKIPPED'),
  };
}
