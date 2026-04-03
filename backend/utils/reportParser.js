const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const pdfParse = require('pdf-parse');

const REPORT_TAG_PATTERNS = [
  { tag: 'blood test report', patterns: [/cbc/i, /complete blood/i, /hemoglobin/i, /wbc/i, /rbc/i, /platelet/i] },
  { tag: 'lipid profile report', patterns: [/lipid/i, /cholesterol/i, /hdl/i, /ldl/i, /triglyceride/i] },
  { tag: 'thyroid report', patterns: [/thyroid/i, /tsh/i, /t3\b/i, /t4\b/i] },
  { tag: 'liver function report', patterns: [/liver/i, /sgot/i, /sgpt/i, /alt\b/i, /ast\b/i, /bilirubin/i] },
  { tag: 'kidney function report', patterns: [/kidney/i, /creatinine/i, /urea/i, /egfr/i] },
  { tag: 'urine report', patterns: [/urine/i, /urinalysis/i] },
  { tag: 'diabetes report', patterns: [/hba1c/i, /glucose/i, /fasting sugar/i, /postprandial/i] }
];

function inferReportTag(text = '') {
  const source = String(text || '');
  for (const item of REPORT_TAG_PATTERNS) {
    if (item.patterns.some((pattern) => pattern.test(source))) {
      return item.tag;
    }
  }
  return 'general test report';
}

function toNumber(value) {
  const normalized = String(value || '')
    .replace(/,/g, '')
    .replace(/(\d)\s+(?=\d)/g, '$1');
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : null;
}

function parseReferenceRange(reference = '') {
  const ref = String(reference || '').trim();
  if (!ref) return { min: null, max: null };

  const between = ref.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
  if (between) {
    return { min: Number(between[1]), max: Number(between[2]) };
  }

  const lt = ref.match(/(?:<|<=)\s*(-?\d+(?:\.\d+)?)/);
  if (lt) {
    return { min: null, max: Number(lt[1]) };
  }

  const gt = ref.match(/(?:>|>=)\s*(-?\d+(?:\.\d+)?)/);
  if (gt) {
    return { min: Number(gt[1]), max: null };
  }

  const single = ref.match(/(-?\d+(?:\.\d+)?)/);
  if (single) {
    const value = Number(single[1]);
    return { min: null, max: value };
  }

  return { min: null, max: null };
}

function statusFromReference(value, min, max) {
  if (value == null) return 'unknown';
  if (min != null && value < min) return 'low';
  if (max != null && value > max) return 'high';
  if (min == null && max == null) return 'unknown';
  return 'normal';
}

function normalizeLine(text = '') {
  let normalized = String(text || '')
    .replace(/\u00A0/g, ' ')
    .trim();

  normalized = normalized
    .replace(/\b(TSH)(\d+(?:\.\d+)?)/gi, '$1 $2')
    .replace(/\b(T[34])(\d+(?:\.\d+)?)/gi, '$1 $2')
    .replace(/([A-Za-z]{2,})([0-9])/g, '$1 $2')
    .replace(/([0-9])([A-Za-zµμ])/g, '$1 $2')
    .replace(/([<>]=?)([0-9])/g, '$1 $2')
    .replace(/([0-9])([<>]=?)/g, '$1 $2')
    .replace(/(-?\d+(?:\.\d+)?)([LH])\b/g, '$1 $2')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return normalized;
}

function isLikelyNonMetricName(name = '') {
  return /(patient|report|sample|specimen|name|age|gender|date|time|doctor|hospital|id|bill|invoice|accurate|reliable|trusted|flag|result|unit|reference|profile|test)$/i.test(String(name || '').trim());
}

function splitEmbeddedReferenceFromUnit(unit = '', reference = '', flag = '') {
  const safeUnit = String(unit || '').trim();
  const safeReference = String(reference || '').trim();
  const safeFlag = String(flag || '').trim();

  if (!safeUnit || safeReference) {
    return { unit: safeUnit, reference: safeReference, flag: safeFlag };
  }

  const embedded = safeUnit.match(
    /^(.*?)(<\s*-?\d+(?:\.\d+)?|>\s*-?\d+(?:\.\d+)?|-?\d+(?:\.\d+)?\s*[-–]\s*-?\d+(?:\.\d+)?)([LH])?$/i
  );

  if (!embedded) {
    return { unit: safeUnit, reference: safeReference, flag: safeFlag };
  }

  const cleanedUnit = String(embedded[1] || '').trim();
  let cleanedReference = String(embedded[2] || '').trim();
  const cleanedFlag = safeFlag || String(embedded[3] || '').trim();

  if (/\/m\s*2$/i.test(cleanedUnit)) {
    const prefixedRange = cleanedReference.match(/^2(\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?)$/);
    if (prefixedRange) {
      cleanedReference = prefixedRange[1];
    }
  }

  return {
    unit: cleanedUnit,
    reference: cleanedReference,
    flag: cleanedFlag
  };
}

function parseMetricsFromLine(line) {
  const normalizedLine = normalizeLine(line);
  const parts = line
    .split(/\t|\|\s*|\s{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  let name = '';
  let result = '';
  let unit = '';
  let reference = '';
  let flag = '';

  if (parts.length >= 2) {
    name = parts[0];
    result = parts[1];
    unit = parts[2] || '';
    reference = parts[3] || '';
    flag = parts[4] || '';
  } else {
    const fallback = normalizedLine.match(/^([A-Za-z][A-Za-z0-9()/%+.,\-\s]{1,80}?)\s+(-?\d+(?:\.\d+)?)(?:\s*([A-Za-z%µμ/^.-][A-Za-z%µμ0-9/^.-]*(?:\s*\/\s*[A-Za-z%µμ0-9^.-]+)*))?(?:\s*(<\s*-?\d+(?:\.\d+)?|>\s*-?\d+(?:\.\d+)?|-?\d+(?:\.\d+)?\s*[-–]\s*-?\d+(?:\.\d+)?))?(?:\s*([LH]))?$/i);
    if (!fallback) return null;

    if (isLikelyNonMetricName(fallback[1])) return null;

    name = fallback[1].trim();
    result = fallback[2].trim();
    unit = (fallback[3] || '').replace(/\s*\/\s*/g, '/').trim();
    reference = (fallback[4] || '').trim();
    flag = (fallback[5] || '').trim();
  }

  const value = toNumber(result);

  if (!name || value == null) return null;

  if (isLikelyNonMetricName(name)) return null;

  if (name.split(' ').length > 6) return null;

  const separated = splitEmbeddedReferenceFromUnit(unit, reference, flag);
  unit = separated.unit;
  reference = separated.reference;
  flag = separated.flag;

  const { min, max } = parseReferenceRange(reference);
  const derivedStatus = statusFromReference(value, min, max);
  const status = /^l$/i.test(flag) ? 'low' : /^h$/i.test(flag) ? 'high' : derivedStatus;

  return {
    name,
    value,
    unit,
    reference,
    referenceMin: min,
    referenceMax: max,
    status
  };
}

function extractMetricsFromText(text = '') {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const metrics = [];
  const seen = new Set();

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      /(test\s*name|parameter|result|reference|unit)/.test(lower) ||
      /^(patient|report\s*id|age\/?gender|date|ref\s*doctor|city\s+diagnostic|accurate|reliable|trusted)/.test(lower) ||
      line.includes(':')
    ) {
      continue;
    }

    const parsed = parseMetricsFromLine(line);
    if (!parsed) continue;

    const key = `${parsed.name.toLowerCase()}|${parsed.value}|${parsed.unit}`;
    if (seen.has(key)) continue;
    seen.add(key);
    metrics.push(parsed);
  }

  return metrics.slice(0, 100);
}

function extractReportInsightsFromText(text = '') {
  const source = String(text || '');
  return {
    reportTag: inferReportTag(source),
    parsedMetrics: extractMetricsFromText(source)
  };
}

async function extractReportInsightsFromPdf(filePath) {
  const parsePdfText = async (targetPath) => {
    const dataBuffer = fs.readFileSync(targetPath);
    const parsed = await pdfParse(dataBuffer);
    return parsed?.text || '';
  };

  const canRun = (cmd, args = ['--version']) => {
    const result = spawnSync(cmd, args, { stdio: 'ignore' });
    return !result.error;
  };

  const buildRepairCandidates = (sourcePath) => {
    const safeBase = path.basename(sourcePath, path.extname(sourcePath)).replace(/[^a-zA-Z0-9._-]/g, '_');
    const stamp = Date.now();
    const candidates = [];

    if (canRun('qpdf')) {
      const qpdfPath = path.join(os.tmpdir(), `${safeBase}-qpdf-${stamp}.pdf`);
      const qpdf = spawnSync('qpdf', [sourcePath, qpdfPath], { stdio: 'ignore' });
      if (!qpdf.error && qpdf.status === 0 && fs.existsSync(qpdfPath)) {
        candidates.push(qpdfPath);
      }
    }

    if (canRun('gs', ['-v'])) {
      const gsPath = path.join(os.tmpdir(), `${safeBase}-gs-${stamp}.pdf`);
      const gs = spawnSync(
        'gs',
        ['-o', gsPath, '-sDEVICE=pdfwrite', '-dPDFSETTINGS=/prepress', sourcePath],
        { stdio: 'ignore' }
      );
      if (!gs.error && gs.status === 0 && fs.existsSync(gsPath)) {
        candidates.push(gsPath);
      }
    }

    return candidates;
  };

  try {
    const text = await parsePdfText(filePath);
    return extractReportInsightsFromText(text);
  } catch (primaryError) {
    const repairedCandidates = buildRepairCandidates(filePath);
    if (!repairedCandidates.length) {
      throw primaryError;
    }

    let lastRepairError = primaryError;
    for (const repairedPath of repairedCandidates) {
      try {
        const repairedText = await parsePdfText(repairedPath);
        return extractReportInsightsFromText(repairedText);
      } catch (repairError) {
        lastRepairError = repairError;
      }
    }

    throw lastRepairError;
  }
}

module.exports = {
  inferReportTag,
  extractMetricsFromText,
  extractReportInsightsFromText,
  extractReportInsightsFromPdf
};
