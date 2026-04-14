const MedicalFieldCatalog = require('../models/MedicalFieldCatalog');
const {
  FIELD_DEFINITIONS,
  normalizeLookup,
  titleCase,
  toStableCamelCase
} = require('./medicalCanonicalization');

const BLOOD_SUGAR_CLARIFICATION_OPTIONS = ['fasting', 'post_meal', 'random'];
const AMBIGUOUS_BLOOD_SUGAR_ALIASES = new Set([
  'blood sugar',
  'blood glucose',
  'glucose',
  'glucose test',
  'sugar test',
  'sugar level',
  'sugar'
]);

const BLOOD_SUGAR_SPECIFIC_MATCHERS = [
  { choice: 'fasting', canonicalKey: 'fastingBloodSugar', patterns: ['fasting', 'fbs'] },
  { choice: 'post_meal', canonicalKey: 'postMealBloodSugar', patterns: ['post meal', 'post-meal', 'post prandial', 'postprandial', 'after food', 'ppbs', 'pp sugar'] },
  { choice: 'random', canonicalKey: 'randomBloodSugar', patterns: ['random', 'rbs'] }
];

function compactLookup(text = '') {
  return normalizeLookup(text).replace(/[^a-z0-9]/g, '');
}

function scoreSimilarity(left = '', right = '') {
  const leftLookup = normalizeLookup(left);
  const rightLookup = normalizeLookup(right);
  if (!leftLookup || !rightLookup) return 0;
  if (leftLookup === rightLookup) return 1;

  const leftCompact = compactLookup(leftLookup);
  const rightCompact = compactLookup(rightLookup);
  if (leftCompact && rightCompact && leftCompact === rightCompact) return 0.98;
  if (leftCompact && rightCompact && (leftCompact.includes(rightCompact) || rightCompact.includes(leftCompact))) {
    return 0.92;
  }

  const leftTokens = new Set(leftLookup.split(' ').filter(Boolean));
  const rightTokens = new Set(rightLookup.split(' ').filter(Boolean));
  const intersection = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? intersection / union : 0;
}

async function ensureCatalogSeeded() {
  await Promise.all(FIELD_DEFINITIONS.map((definition) =>
    MedicalFieldCatalog.updateOne(
      { canonicalKey: definition.canonical },
      {
        $setOnInsert: {
          canonicalKey: definition.canonical,
          displayName: definition.display,
          source: 'system'
        },
        $addToSet: {
          aliases: { $each: definition.aliases || [] }
        }
      },
      { upsert: true }
    )
  ));
}

function detectBloodSugarResolution(rawFieldName = '', clarificationChoice = '') {
  const lookup = normalizeLookup(rawFieldName);
  if (!lookup) {
    return { isBloodSugar: false, canonicalKey: '', needsClarification: false };
  }

  const matchedSpecific = BLOOD_SUGAR_SPECIFIC_MATCHERS.find((matcher) =>
    matcher.patterns.some((pattern) => lookup.includes(pattern))
  );
  if (matchedSpecific) {
    return {
      isBloodSugar: true,
      canonicalKey: matchedSpecific.canonicalKey,
      needsClarification: false
    };
  }

  if (!AMBIGUOUS_BLOOD_SUGAR_ALIASES.has(lookup)) {
    return { isBloodSugar: false, canonicalKey: '', needsClarification: false };
  }

  const selected = BLOOD_SUGAR_SPECIFIC_MATCHERS.find((matcher) => matcher.choice === clarificationChoice);
  if (selected) {
    return {
      isBloodSugar: true,
      canonicalKey: selected.canonicalKey,
      needsClarification: false
    };
  }

  return {
    isBloodSugar: true,
    canonicalKey: '',
    needsClarification: true
  };
}

function buildClarificationIssue(rawFieldName = '') {
  return {
    code: 'blood_sugar_context_required',
    fieldKey: 'bloodSugar',
    rawFieldName,
    message: 'Blood sugar needs nurse confirmation to classify it as fasting, post-meal, or random.',
    options: BLOOD_SUGAR_CLARIFICATION_OPTIONS
  };
}

async function loadCatalogEntries() {
  await ensureCatalogSeeded();
  return MedicalFieldCatalog.find({ isActive: true }).lean();
}

async function buildCatalogPromptSection(limit = 120) {
  const entries = await loadCatalogEntries();
  const lines = entries
    .slice(0, limit)
    .map((entry) => {
      const aliases = (entry.aliases || []).slice(0, 6).join(', ');
      return `- ${entry.canonicalKey} | ${entry.displayName}${aliases ? ` | aliases: ${aliases}` : ''}`;
    });

  return [
    'Existing field catalog from the database:',
    ...lines
  ].join('\n');
}

async function findCatalogMatch(rawFieldName = '', entries = []) {
  const rawLookup = normalizeLookup(rawFieldName);
  const rawCompact = compactLookup(rawFieldName);
  if (!rawLookup) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const entry of entries) {
    const candidates = [entry.canonicalKey, entry.displayName, ...(entry.aliases || [])];
    for (const candidate of candidates) {
      const candidateLookup = normalizeLookup(candidate);
      if (!candidateLookup) continue;
      if (candidateLookup === rawLookup || compactLookup(candidate) === rawCompact) {
        return entry;
      }
      const score = scoreSimilarity(rawFieldName, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }
  }

  return bestScore >= 0.88 ? bestMatch : null;
}

async function createLearnedField(rawFieldName = '') {
  const canonicalKey = toStableCamelCase(rawFieldName) || `field${Date.now()}`;
  const displayName = titleCase(normalizeLookup(rawFieldName));

  return MedicalFieldCatalog.findOneAndUpdate(
    { canonicalKey },
    {
      $setOnInsert: {
        canonicalKey,
        displayName: displayName || rawFieldName,
        source: 'learned'
      },
      $addToSet: {
        aliases: rawFieldName
      }
    },
    {
      upsert: true,
      returnDocument: 'after'
    }
  ).lean();
}

async function resolveFieldCatalogEntry(rawFieldName = '', clarificationChoice = '') {
  const bloodSugarResolution = detectBloodSugarResolution(rawFieldName, clarificationChoice);
  if (bloodSugarResolution.needsClarification) {
    return {
      status: 'clarification_required',
      ambiguity: buildClarificationIssue(rawFieldName)
    };
  }

  const entries = await loadCatalogEntries();
  if (bloodSugarResolution.canonicalKey) {
    const bloodSugarEntry = entries.find((entry) => entry.canonicalKey === bloodSugarResolution.canonicalKey);
    if (bloodSugarEntry) {
      await MedicalFieldCatalog.updateOne(
        { _id: bloodSugarEntry._id },
        { $addToSet: { aliases: rawFieldName } }
      );
      return {
        status: 'resolved',
        entry: bloodSugarEntry
      };
    }
  }

  const matched = await findCatalogMatch(rawFieldName, entries);
  if (matched) {
    await MedicalFieldCatalog.updateOne(
      { _id: matched._id },
      { $addToSet: { aliases: rawFieldName } }
    );
    return {
      status: 'resolved',
      entry: matched
    };
  }

  return {
    status: 'resolved',
    entry: await createLearnedField(rawFieldName)
  };
}

module.exports = {
  BLOOD_SUGAR_CLARIFICATION_OPTIONS,
  ensureCatalogSeeded,
  resolveFieldCatalogEntry,
  detectBloodSugarResolution,
  buildClarificationIssue,
  loadCatalogEntries,
  buildCatalogPromptSection
};
