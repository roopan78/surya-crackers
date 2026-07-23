/**
 * Reads a File (e.g. from an <input type="file">) and resolves it to a
 * base64 data URL. Used by admin image-upload placeholders so a picked
 * image can be previewed and stored in local state / localStorage
 * without any backend/API integration.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
