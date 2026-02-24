import { promises as fs } from 'fs';
import path from 'path';

const ROOT = process.cwd(); 
const BASE_DIR = process.env.NODE_ENV === 'production' 
  ? '/app/uploads' 
  : path.join(ROOT, 'uploads');  

console.log('BASE_DIR configured as:', BASE_DIR);

function sanitizeFolder(name = '') {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9-_]/gi, '_')
    .replace(/^_+|_+$/g, '') || 'misc';
}

export async function saveBufferLocally(file, subfolder = 'class') {
  try {
    const folder = sanitizeFolder(subfolder);
    const orig = file.originalname || 'image';
    const ext = path.extname(orig).toLowerCase();
    const base = path.basename(orig, ext).replace(/[^a-z0-9-_]/gi, '_') || 'image';
    const name = `${base}_${Date.now()}${ext || ''}`;

    const absDir = path.join(BASE_DIR, folder);
    const absPath = path.join(absDir, name);

    await fs.mkdir(absDir, { recursive: true });
    console.log('Ensured directory exists:', absDir);

    await fs.writeFile(absPath, file.buffer);
    console.log('Saved file to:', absPath);

    return { absPath, relPath: `/files/${folder}/${name}` };
  } catch (err) {
    console.error('Error saving file locally:', err);
    throw err;
  }
}