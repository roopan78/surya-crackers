import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ApiError } from '../utils/ApiError';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const EXCEL_EXTENSIONS = /\.(xlsx|xls)$/i;

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!EXCEL_EXTENSIONS.test(file.originalname)) {
      return callback(ApiError.badRequest('Only Excel files (.xlsx or .xls) are accepted.'));
    }
    callback(null, true);
  },
});

/**
 * Accepts a single Excel file under the `file` field, kept in memory (the
 * importer parses the buffer directly — nothing is written to disk). Maps
 * multer's own errors onto the ApiError shape the error middleware expects.
 */
export function uploadExcelFile(req: Request, res: Response, next: NextFunction): void {
  excelUpload.single('file')(req, res, (error: unknown) => {
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
