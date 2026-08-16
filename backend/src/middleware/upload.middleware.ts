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
  spreadsheetUpload.single('file')(req, res, wrapMulterError(next));
}

// The staff Android build is ~37 MB, so it needs its own ceiling — the
// spreadsheet limit exists to stop someone pasting a database into the importer
// and has no bearing on a release binary.
const MAX_APK_BYTES = 150 * 1024 * 1024;

const apkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_APK_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!/\.apk$/i.test(file.originalname)) {
      return callback(ApiError.badRequest('Only an .apk file can be published as the Android build.'));
    }
    callback(null, true);
  },
});

/** Accepts the release APK under the `file` field. */
export function uploadApkFile(req: Request, res: Response, next: NextFunction): void {
  apkUpload.single('file')(req, res, wrapMulterError(next, 'The APK exceeds the 150 MB upload limit.'));
}

function wrapMulterError(next: NextFunction, sizeMessage = 'The file exceeds the 5 MB upload limit.') {
  return (error: unknown) => {
    if (error instanceof multer.MulterError) {
      return next(
        error.code === 'LIMIT_FILE_SIZE'
          ? ApiError.badRequest(sizeMessage)
          : ApiError.badRequest(`Upload failed: ${error.message}`),
      );
    }
    if (error) {
      return next(error);
    }
    next();
  };
}
