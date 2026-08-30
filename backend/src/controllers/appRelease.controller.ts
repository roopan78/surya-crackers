import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import {
  APK_CONTENT_TYPE,
  AppReleaseMetadata,
  downloadFileName,
  readAppReleaseMetadata,
  resolveApkPath,
  saveAppRelease,
} from '../services/appRelease.service';

/** Where the portal points the download button. Public, so a browser can follow it. */
const DOWNLOAD_PATH = '/api/app-release/download';

/**
 * The manifest as clients see it.
 *
 * `fileName` is deliberately the *download* name rather than the name on the
 * volume: nothing outside this server has any business knowing the storage
 * layout, and this is the name the portal shows and the browser saves.
 */
function toResponse(metadata: AppReleaseMetadata) {
  return {
    ...metadata,
    fileName: downloadFileName(metadata),
    downloadUrl: DOWNLOAD_PATH,
  };
}

const uploadSchema = z.object({
  versionName: z.string().trim().min(1, 'versionName is required').max(32),
  // Multipart fields arrive as strings, so coerce before checking it is a
  // positive integer — a versionCode of 0 or "abc" is a broken build tag. The
  // message is repeated on each rule because coercion fails first for "abc",
  // and Zod's own "Expected number, received nan" means nothing to a caller.
  versionCode: z.coerce
    .number({ invalid_type_error: 'versionCode must be a positive integer' })
    .int('versionCode must be a positive integer')
    .positive('versionCode must be a positive integer'),
});

// POST /api/admin/app-release — publishes a new build (ADMIN + SUPER_ADMIN)
export const uploadAppRelease = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file || req.file.size === 0) {
    throw ApiError.badRequest('Attach the built APK under the "file" field.');
  }

  const parsed = uploadSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(parsed.error.issues[0].message);
  }

  const metadata = await saveAppRelease(req.file.buffer, parsed.data);
  return sendSuccess(res, toResponse(metadata), 201);
});

// GET /api/admin/app-release — what the admin portal renders next to the icon
export const getAppRelease = asyncHandler(async (_req: Request, res: Response) => {
  const metadata = await readAppReleaseMetadata();

  // Deliberately a 200 with null rather than a 404: "no build published yet" is
  // an ordinary state for the portal to render, not an error worth a red toast.
  return sendSuccess(res, metadata ? toResponse(metadata) : null);
});

/**
 * GET /api/app-release/download — the APK itself.
 *
 * Unauthenticated on purpose: this is followed by the phone's browser, which
 * cannot attach the portal's bearer token to a plain navigation. The build
 * carries no secrets — the only credential in it is the public OAuth client id
 * — and every screen behind it still requires an admin sign-in, so the exposure
 * is the binary itself rather than any data in it.
 */
export const downloadAppRelease = asyncHandler(async (_req: Request, res: Response) => {
  const [file, metadata] = await Promise.all([resolveApkPath(), readAppReleaseMetadata()]);

  res.setHeader('Content-Type', APK_CONTENT_TYPE);
  // Named from the version, so a phone's Downloads folder holding three of
  // these can tell them apart — "app-release.apk" said nothing about either
  // which app it was or which build.
  res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName(metadata)}"`);
  if (metadata) {
    // Not standard headers, but they let a client verify the download without a
    // second round trip to the metadata route.
    res.setHeader('X-App-Version-Name', metadata.versionName);
    res.setHeader('X-App-Version-Code', String(metadata.versionCode));
  }

  res.sendFile(file);
});
