import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const storageRoot = () => path.resolve(process.env.STORAGE_DIR || path.join(process.cwd(), "storage"));

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const target = path.resolve(storageRoot(), key);
  if (!target.startsWith(`${storageRoot()}${path.sep}`)) throw new Error("Caminho de storage inválido.");
  await mkdir(path.dirname(target), { recursive: true });
  const contents = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  await writeFile(target, contents, { flag: "wx" });
  return { key, url: `/storage/${encodeURI(key)}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/storage/${encodeURI(key)}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  return (await storageGet(relKey)).url;
}

export async function storageRead(relKey: string) {
  const key = normalizeKey(relKey);
  const root = storageRoot();
  const target = path.resolve(root, key);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Caminho de storage inválido.");
  return readFile(target);
}
