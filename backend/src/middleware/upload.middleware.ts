import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ApiError } from '../utils/ApiError';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

// CSV is accepted alongside the Excel formats because staff routinely receive
// price lists over WhatsApp, where "export as CSV" is often the only thing the
// sender had. SheetJS sniffs the format from the buffer, so the parsers need no
// branch for it — only this filter does.
const SPREADSHEET_EXTENSIONS = /\.(xlsx|xls|csv)$/i;

const spreadsheetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!SPREADSHEET_EXTENSIONS.test(file.originalname)) {
      return callback(ApiError.badRequest('Only spreadsheet files (.xlsx, .xls or .csv) are accepted.'));
    }
    callback(null, true);
  },
});

/**
 * Accepts a single spreadsheet under the `file` field, kept in memory (the
 * importers parse the buffer directly — nothing is written to disk). Maps
 * multer's own errors onto the ApiError shape the error middleware expects.
 */
export function uploadSpreadsheetFile(req: Request, res: Response, next: NextFunction): void {
  spreadsheetUpload.single('file')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      return next(
        error.code === 'LIMIT_FILE_SIZE'
          ? ApiError.badRequest('The file exceeds the 5 MB upload limit.')
          : ApiError.badRequest(`Upload failed: ${error.message}`),
      );
    }
    if (error) {
      return next(error);
    }
    next();
  });
}
