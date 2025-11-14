import multer from 'multer';
import path from 'path';
import fs from 'fs';
// @ts-ignore - pdf-parse doesn't have types
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { logger } from '../utils/logger';

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Word, and text files are allowed.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
});

/**
 * Extract text from uploaded document
 */
export async function extractTextFromFile(filePath: string, mimetype: string): Promise<string> {
  try {
    logger.info('Extracting text from file', { filePath, mimetype });

    switch (mimetype) {
      case 'application/pdf':
        return await extractFromPDF(filePath);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        return await extractFromWord(filePath);
      case 'text/plain':
        return await extractFromText(filePath);
      default:
        throw new Error('Unsupported file type');
    }
  } catch (error) {
    logger.error('Error extracting text from file', { filePath, error });
    throw new Error('Failed to extract text from document');
  }
}

/**
 * Extract text from PDF
 */
async function extractFromPDF(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

/**
 * Extract text from Word document
 */
async function extractFromWord(filePath: string): Promise<string> {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

/**
 * Extract text from plain text file
 */
async function extractFromText(filePath: string): Promise<string> {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Clean up uploaded file
 */
export function deleteFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info('File deleted', { filePath });
    }
  } catch (error) {
    logger.error('Error deleting file', { filePath, error });
  }
}
