const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

function normalizeText(text = '') {
  return String(text || '')
    .replace(/\u00A0/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

async function extractDocumentText(filePath, options = {}) {
  const maxChars = Number.isFinite(options.maxChars) ? options.maxChars : 12000;
  if (!filePath || !fs.existsSync(filePath)) return '';

  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === '.pdf') {
      const buffer = fs.readFileSync(filePath);
      const parsed = await pdfParse(buffer);
      return normalizeText(parsed?.text || '').slice(0, maxChars);
    }

    if (['.txt', '.md', '.csv', '.json'].includes(ext)) {
      const text = fs.readFileSync(filePath, 'utf8');
      return normalizeText(text).slice(0, maxChars);
    }

    return '';
  } catch {
    return '';
  }
}

module.exports = {
  extractDocumentText
};
