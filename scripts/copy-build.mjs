import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const source = path.resolve(__dirname, '../artifacts/deadline-guardian/dist');
const destination = path.resolve(__dirname, '../dist');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log(`Copying built frontend from ${source} to ${destination}...`);
if (fs.existsSync(source)) {
  fs.mkdirSync(destination, { recursive: true });
  copyRecursiveSync(source, destination);
  console.log('Frontend assets successfully copied.');
} else {
  console.error(`Error: Source directory ${source} does not exist. Make sure the frontend built successfully.`);
  process.exit(1);
}
