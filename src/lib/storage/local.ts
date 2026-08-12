import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const root = () => path.resolve(process.env.FILE_STORAGE_PATH || "./storage");
export async function storeFile(bytes: Buffer, filename: string) {
  await fs.mkdir(root(), { recursive: true });
  const ext = path.extname(filename).replace(/[^.a-zA-Z0-9]/g, "");
  const key = `${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}${ext}`;
  const full = path.join(root(), key); await fs.mkdir(path.dirname(full), { recursive: true }); await fs.writeFile(full, bytes); return key;
}
export async function readStoredFile(key: string) { return fs.readFile(path.join(root(), key)); }
