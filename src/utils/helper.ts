import fs from "fs";
import path from "path";


export async function uploadFile(file: File | null): Promise<string | undefined> {
  if (!file) return undefined;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const fileName = `${Date.now()}-${file.name}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads");

  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, fileName);
  await fs.promises.writeFile(filePath, buffer);

  
  return `/uploads/${fileName}`;
}
