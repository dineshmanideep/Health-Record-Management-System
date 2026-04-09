const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { OLLAMA_CONFIG, callOllamaGenerate } = require('./aiSummarizer');
const { extractDocumentText } = require('./aiDocumentTextExtractor');
const { validateMedicalExtractionResponse } = require('./medicalExtractionValidator');
const { normalizeFieldEntries } = require('./medicalFieldNormalization');
const {
  canonicalizeDiagnosis,
  canonicalizeSpecialization,
  canonicalizeMedicationList,
  buildCanonicalPromptSection
} = require('./medicalCanonicalization');

const execFileAsync = promisify(execFile);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function buildExtractionPrompt({ text }) {
  return [
    'You are a medical data extraction system.',
    '',
    'Extract structured medical information from the given text.',
    '',
    'Return ONLY valid JSON.',
    '',
    'Do not include explanation or extra text.',
    '',
    'Format:',
    '',
    '{',
    '"diagnosis": "...",',
    '"specialization": "...",',
    '"reportDate": "YYYY-MM-DD",',
    '"fields": {',
    '"field_name": {',
    '"value": 0,',
    '"unit": "",',
    '"reference": "",',
    '"status": "high|low|normal|unknown"',
    '}',
    '},',
    '"medications": [],',
    '"nextVisit": "YYYY-MM-DD"',
    '}',
    '',
    'Only include relevant medical fields.',
    'Use numeric values where applicable.',
    'If a report or sample date is visible, include it in reportDate.',
    'For important lab values, preserve unit, reference range, and status when visible.',
    '',
    buildCanonicalPromptSection(),
    '',
    'INPUT:',
    text || ''
  ].join('\n');
}

function detectMimeType(filePath = '') {
  const ext = path.extname(filePath || '').toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.pdf') return 'application/pdf';
  return 'application/octet-stream';
}

async function createPdfPreviewImage(filePath = '') {
  if (!filePath || path.extname(filePath).toLowerCase() !== '.pdf' || !fs.existsSync(filePath)) {
    return '';
  }

  const outputDir = path.join(os.tmpdir(), 'medical-pdf-previews');
  fs.mkdirSync(outputDir, { recursive: true });

  const previewBaseName = `${path.basename(filePath, '.pdf')}-${crypto.createHash('md5').update(filePath).digest('hex')}`;

  try {
    await execFileAsync('/usr/bin/qlmanage', ['-t', '-s', '1000', '-o', outputDir, filePath], {
      timeout: 15000
    });
  } catch {
    return '';
  }

  const previewPath = path.join(outputDir, `${previewBaseName}.pdf.png`);
  if (fs.existsSync(previewPath)) return previewPath;

  const fallbackName = `${path.basename(filePath)}.png`;
  const fallbackPath = path.join(outputDir, fallbackName);
  return fs.existsSync(fallbackPath) ? fallbackPath : '';
}

function buildOllamaImages(filePath = '') {
  if (!filePath || !fs.existsSync(filePath)) return [];
  if (!IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) return [];
  return [fs.readFileSync(filePath).toString('base64')];
}

async function requestMedicalExtraction({ filePath, fallbackText }) {
  const sourceText = await extractDocumentText(filePath, { maxChars: OLLAMA_CONFIG.maxInputChars });
  const visionInputPath = sourceText
    ? ''
    : (
      detectMimeType(filePath) === 'application/pdf'
        ? await createPdfPreviewImage(filePath)
        : filePath
    );

  const prompt = buildExtractionPrompt({
    text: sourceText || String(fallbackText || '').slice(0, OLLAMA_CONFIG.maxInputChars)
  });

  return callOllamaGenerate({
    prompt,
    images: buildOllamaImages(visionInputPath)
  });
}

async function extractStructuredMedicalData(options = {}) {
  const result = await requestMedicalExtraction(options);
  const rawResponse = result?.content || '';
  const providerError = result?.error || '';

  if (!rawResponse) {
    return {
      success: false,
      status: 'failed',
      rawResponse: '',
      validationErrors: [providerError || 'LLM extraction returned no content'],
      normalizedFields: {},
      numericFields: {},
      medications: [],
      unknownFields: [],
      conflicts: []
    };
  }

  const validation = validateMedicalExtractionResponse(rawResponse);
  if (!validation.valid) {
    return {
      success: false,
      status: 'failed',
      rawResponse,
      validationErrors: validation.errors,
      normalizedFields: {},
      numericFields: {},
      medications: [],
      unknownFields: [],
      conflicts: []
    };
  }

  const normalized = normalizeFieldEntries(validation.data.fields);
  const diagnosis = canonicalizeDiagnosis(validation.data.diagnosis);
  const specialization = canonicalizeSpecialization(validation.data.specialization);
  const medications = canonicalizeMedicationList(validation.data.medications);

  return {
    success: true,
    status: 'completed',
    rawResponse,
    diagnosis,
    specialization,
    reportDate: normalized.reportDate || validation.data.reportDate || null,
    medications,
    nextVisitDate: validation.data.nextVisit,
    normalizedFields: normalized.normalizedFields,
    numericFields: normalized.numericFields,
    parsedMetrics: normalized.parsedMetrics,
    importantFindings: normalized.importantFindings,
    unknownFields: normalized.unknownFields,
    conflicts: normalized.conflicts,
    validationErrors: []
  };
}

module.exports = {
  extractStructuredMedicalData
};
