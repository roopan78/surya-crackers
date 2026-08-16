import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import { buildImportPreview, buildTemplateWorkbook, runImport } from '../services/productImport.service';

function requireSpreadsheetBuffer(req: Request): Buffer {
  if (!req.file || req.file.size === 0) {
    throw ApiError.badRequest('Please attach a non-empty spreadsheet under the "file" field.');
  }
  return req.file.buffer;
}

// GET /api/admin/products/import/template — dynamically generated sample workbook
export const downloadImportTemplate = asyncHandler(async (_req: Request, res: Response) => {
  const buffer = buildTemplateWorkbook();
  res
    .setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    .setHeader('Content-Disposition', 'attachment; filename="product-import-template.xlsx"')
    .send(buffer);
});

// POST /api/admin/products/import/preview — parse + validate + summarize, zero writes
export const previewProductImport = asyncHandler(async (req: Request, res: Response) => {
  const summary = await buildImportPreview(requireSpreadsheetBuffer(req));
  return sendSuccess(res, summary);
});

// POST /api/admin/products/import — the actual transactional write
export const importProducts = asyncHandler(async (req: Request, res: Response) => {
  const result = await runImport(requireSpreadsheetBuffer(req));
  return sendSuccess(res, result);
});
