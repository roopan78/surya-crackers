import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import {
  buildCategoryImportPreview,
  buildCategoryTemplateWorkbook,
  runCategoryImport,
} from '../services/categoryImport.service';

function requireSpreadsheetBuffer(req: Request): Buffer {
  if (!req.file || req.file.size === 0) {
    throw ApiError.badRequest('Please attach a non-empty spreadsheet under the "file" field.');
  }
  return req.file.buffer;
}

// GET /api/admin/categories/import/template — dynamically generated sample workbook
export const downloadCategoryImportTemplate = asyncHandler(async (_req: Request, res: Response) => {
  const buffer = buildCategoryTemplateWorkbook();
  res
    .setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    .setHeader('Content-Disposition', 'attachment; filename="category-import-template.xlsx"')
    .send(buffer);
});

// POST /api/admin/categories/import/preview — parse + validate + summarize, zero writes
export const previewCategoryImport = asyncHandler(async (req: Request, res: Response) => {
  const summary = await buildCategoryImportPreview(requireSpreadsheetBuffer(req));
  return sendSuccess(res, summary);
});

// POST /api/admin/categories/import — the actual transactional write
export const importCategories = asyncHandler(async (req: Request, res: Response) => {
  const result = await runCategoryImport(requireSpreadsheetBuffer(req));
  return sendSuccess(res, result);
});
