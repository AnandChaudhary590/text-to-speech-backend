import fs from "fs/promises";
import path from "path";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export const extractTextFromFile = async (
  filePath: string,
  mimeType: string
): Promise<string> => {
  const extension = path.extname(filePath).toLowerCase();

  // TXT
  if (extension === ".txt" || mimeType === "text/plain") {
    return await fs.readFile(filePath, "utf-8");
  }

  // PDF
  if (extension === ".pdf" || mimeType === "application/pdf") {
    const buffer = await fs.readFile(filePath);

    const parser = new PDFParse({
      data: buffer,
    });

    const result = await parser.getText();

    await parser.destroy();

    return result.text;
  }

  // DOCX
  if (
    extension === ".docx" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({
      path: filePath,
    });

    return result.value;
  }

  throw new Error("Unsupported file type");
};