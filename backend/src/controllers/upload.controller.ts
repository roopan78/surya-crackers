import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import { createUploadSignature, isUploadConfigured } from '../services/upload.service';

// POST /api/admin/uploads/signature — admin-only (inherits the /admin guard)
export const getUploadSignature = asyncHandler(async (_req: Request, res: Response) => {
  if (!isUploadConfigured()) {
    throw ApiError.badRequest(
      'Image uploads are not configured. Add the CLOUDINARY_* environment variables, or paste an image URL instead.',
    );
  }
  return sendSuccess(res, createUploadSignature());
});
