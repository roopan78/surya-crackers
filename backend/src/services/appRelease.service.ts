import fs from 'fs/promises';
import crypto from 'crypto';
import path from 'path';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

/**
 * Storage for the staff Android build.
 *
 * The APK lives on a Railway volume rather than in Postgres or the container
 * image: it is ~37 MB of opaque binary, which a database column has no business
 * holding, and Railway wipes the container filesystem on every deploy so an
 * in-image copy would vanish the first time the API restarted.
 *
 * Metadata sits in a small JSON manifest beside the binary rather than in its
 * own table. The two are written together and are meaningless apart — keeping
 * them on the same volume means there is no way to end up with a database row
 * pointing at an APK that is not there.
 */

/** Public shape of the manifest, as the admin portal reads it. */
export interface AppReleaseMetadata {
  versionName: string;
  versionCode: number;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  uploadedAt: string;
}

/**
 * What the APK is called *on the volume*. An implementation detail, and
 * deliberately constant: `saveAppRelease` renames onto this path atomically, so
 * it cannot vary with the build being published. What a staff member downloads
 * is [downloadFileName], which is a different thing entirely.
 */
const APK_FILE = 'app-release.apk';
const MANIFEST_FILE = 'release.json';

export const APK_CONTENT_TYPE = 'application/vnd.android.package-archive';

/**
 * The name the browser saves the download as.
 *
 * Derived from the version rather than stored, so a build published before this
 * existed still comes down with a useful name — and so a phone's Downloads
 * folder holding three of these can be told apart. `app-release.apk`, which is
 * what it used to be, says nothing about which app or which version it is.
 *
 * The version is scrubbed because it ends up in a `Content-Disposition` header
 * and then in a filename on someone's phone: a quote would end the header value
 * early, and a slash would be a path.
 */
export function downloadFileName(metadata: Pick<AppReleaseMetadata, 'versionName'> | null): string {
  const version = (metadata?.versionName ?? '').trim().replace(/[^A-Za-z0-9._-]/g, '-');
  return version ? `SuryaCrackers-${version}.apk` : 'SuryaCrackers.apk';
}

/**
 * Resolves to the Railway volume in production and a gitignored folder locally,
 * so a developer never needs the volume mounted to exercise these routes.
 */
function storageDir(): string {
  if (env.APP_RELEASE_DIR) return env.APP_RELEASE_DIR;
  return env.isProduction ? '/data/app-release' : path.resolve(process.cwd(), '.storage/app-release');
}

function apkPath(): string {
  return path.join(storageDir(), APK_FILE);
}

function manifestPath(): string {
  return path.join(storageDir(), MANIFEST_FILE);
}

/**
 * Persists a freshly built APK and its version tag, replacing whatever was
 * there. Only one build is kept: staff always want the newest, and old copies
 * on a small volume are pure liability.
 *
 * The APK is written to a temporary name and then renamed, because rename is
 * atomic within a filesystem — a download that lands mid-upload either gets the
 * whole previous build or the whole new one, never a truncated file.
 */
export async function saveAppRelease(
  buffer: Buffer,
  meta: { versionName: string; versionCode: number },
): Promise<AppReleaseMetadata> {
  const directory = storageDir();
  await fs.mkdir(directory, { recursive: true });

  const pending = path.join(directory, `${APK_FILE}.uploading`);
  await fs.writeFile(pending, buffer);
  await fs.rename(pending, apkPath());

  const metadata: AppReleaseMetadata = {
    versionName: meta.versionName,
    versionCode: meta.versionCode,
    fileName: APK_FILE,
    sizeBytes: buffer.byteLength,
    // Lets a staff member (or a script) confirm the download arrived intact.
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    uploadedAt: new Date().toISOString(),
  };

  await fs.writeFile(manifestPath(), JSON.stringify(metadata, null, 2), 'utf8');
  return metadata;
}

/** The current build's metadata, or null when nothing has been uploaded yet. */
export async function readAppReleaseMetadata(): Promise<AppReleaseMetadata | null> {
  try {
    const raw = await fs.readFile(manifestPath(), 'utf8');
    const metadata = JSON.parse(raw) as AppReleaseMetadata;

    // A manifest without its binary is a broken half-state — report "nothing
    // published" rather than handing the portal a link that 404s.
    await fs.access(apkPath());
    return metadata;
  } catch {
    return null;
  }
}

/** Absolute path of the stored APK, or throws if no build has been published. */
export async function resolveApkPath(): Promise<string> {
  const file = apkPath();
  try {
    await fs.access(file);
  } catch {
    throw ApiError.notFound('No Android build has been published yet.');
  }
  return file;
}
