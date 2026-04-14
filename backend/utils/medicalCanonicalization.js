function normalizeLookup(text = '') {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(text = '') {
  return String(text || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function toStableCamelCase(text = '') {
  const parts = normalizeLookup(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(' ')
    .filter(Boolean);

  if (!parts.length) return '';
  return parts
    .map((part, index) => (index === 0 ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join('');
}

function createCatalog(definitions = []) {
  const byAlias = new Map();
  const byCanonical = new Map();

  definitions.forEach((definition) => {
    byCanonical.set(normalizeLookup(definition.canonical), definition);
    (definition.aliases || []).forEach((alias) => {
      byAlias.set(normalizeLookup(alias), definition);
    });
    byAlias.set(normalizeLookup(definition.canonical), definition);
  });

  return { definitions, byAlias, byCanonical };
}

const FIELD_DEFINITIONS = [
  { canonical: 'bloodSugar', display: 'Blood Sugar', aliases: [] },
  { canonical: 'fastingBloodSugar', display: 'Fasting Blood Sugar', aliases: ['fasting blood sugar', 'fasting sugar', 'fasting glucose', 'fbs'] },
  { canonical: 'postMealBloodSugar', display: 'Post-Meal Blood Sugar', aliases: ['post meal blood sugar', 'post-meal blood sugar', 'post prandial blood sugar', 'postprandial blood sugar', 'after food sugar', 'ppbs', 'pp sugar'] },
  { canonical: 'randomBloodSugar', display: 'Random Blood Sugar', aliases: ['random blood sugar', 'random sugar', 'random glucose', 'rbs'] },
  { canonical: 'hbA1c', display: 'HbA1c', aliases: ['hba1c', 'a1c', 'hb1ac'] },
  { canonical: 'weight', display: 'Weight', aliases: ['weight', 'wt'] },
  { canonical: 'height', display: 'Height', aliases: ['height'] },
  { canonical: 'bmi', display: 'BMI', aliases: ['bmi'] },
  { canonical: 'bloodPressure', display: 'Blood Pressure', aliases: ['bp', 'blood pressure'] },
  { canonical: 'bloodPressureSystolic', display: 'Blood Pressure Systolic', aliases: ['blood pressure systolic', 'systolic', 'systolic pressure'] },
  { canonical: 'bloodPressureDiastolic', display: 'Blood Pressure Diastolic', aliases: ['blood pressure diastolic', 'diastolic', 'diastolic pressure'] },
  { canonical: 'heartRate', display: 'Heart Rate', aliases: ['pulse', 'pulse rate', 'heart rate'] },
  { canonical: 'temperature', display: 'Temperature', aliases: ['temperature', 'temp'] },
  { canonical: 'thyroidTSH', display: 'TSH', aliases: ['tsh', 'serum tsh', 'thyroid tsh', 'tsh 3rd generation', 'tsh 3rd gen'] },
  { canonical: 'thyroidTPOAntibodies', display: 'Anti-TPO Antibodies', aliases: ['thyroid peroxidase autoantibodies', 'anti tpo', 'anti tpo ama', 'anti-thyroid peroxidase', 'tpo antibodies', 'anti thyroid peroxidase antibodies'] },
  { canonical: 'thyroidFreeT3', display: 'Free T3', aliases: ['free t3', 'ft3'] },
  { canonical: 'thyroidT3', display: 'T3', aliases: ['t3', 'serum t3', 'total t3'] },
  { canonical: 'thyroidFreeT4', display: 'Free T4', aliases: ['free t4', 'ft4'] },
  { canonical: 'thyroidT4', display: 'T4', aliases: ['t4', 'serum t4', 'total t4'] },
  { canonical: 'spo2', display: 'SpO2', aliases: ['spo2', 'oxygen', 'oxygen saturation'] },
  { canonical: 'reportDate', display: 'Report Date', aliases: ['report date', 'test date', 'sample date', 'collection date', 'date'] }
];

const DIAGNOSIS_DEFINITIONS = [
  { canonical: 'Hypothyroidism', aliases: ['hypothyroidism', 'primary hypothyroidism', 'subclinical hypothyroidism', 'underactive thyroid'] },
  { canonical: 'Hyperthyroidism', aliases: ['hyperthyroidism', 'thyrotoxicosis', 'overactive thyroid'] },
  { canonical: 'Thyroid Disorder', aliases: ['thyroid disorder', 'thyroid dysfunction'] },
  { canonical: 'Diabetes Mellitus', aliases: ['diabetes', 'diabetes mellitus'] },
  { canonical: 'Type 1 Diabetes Mellitus', aliases: ['type 1 diabetes', 't1dm', 'type 1 diabetes mellitus'] },
  { canonical: 'Type 2 Diabetes Mellitus', aliases: ['type 2 diabetes', 't2dm', 'type 2 diabetes mellitus'] },
  { canonical: 'Prediabetes', aliases: ['prediabetes', 'pre diabetes', 'impaired fasting glucose'] },
  { canonical: 'Hypertension', aliases: ['hypertension', 'high blood pressure'] },
  { canonical: 'Hypotension', aliases: ['hypotension', 'low blood pressure'] },
  { canonical: 'Anemia', aliases: ['anemia', 'anaemia'] },
  { canonical: 'Dyslipidemia', aliases: ['dyslipidemia', 'hyperlipidemia', 'high cholesterol'] },
  { canonical: 'Vitamin D Deficiency', aliases: ['vitamin d deficiency', 'low vitamin d'] },
  { canonical: 'Vitamin B12 Deficiency', aliases: ['vitamin b12 deficiency', 'low b12', 'b12 deficiency'] },
  { canonical: 'Chronic Kidney Disease', aliases: ['chronic kidney disease', 'ckd'] },
  { canonical: 'Urinary Tract Infection', aliases: ['urinary tract infection', 'uti'] }
];

const SPECIALIZATION_DEFINITIONS = [
  { canonical: 'Endocrinology', aliases: ['endocrinology', 'endocrinologist', 'thyroid specialist', 'diabetology', 'diabetes specialist'] },
  { canonical: 'Cardiology', aliases: ['cardiology', 'cardiologist'] },
  { canonical: 'General Medicine', aliases: ['general medicine', 'internal medicine', 'general physician', 'physician'] },
  { canonical: 'Nephrology', aliases: ['nephrology', 'nephrologist'] },
  { canonical: 'Hematology', aliases: ['hematology', 'haematology', 'hematologist'] },
  { canonical: 'Gastroenterology', aliases: ['gastroenterology', 'gastroenterologist'] },
  { canonical: 'Pulmonology', aliases: ['pulmonology', 'pulmonary medicine', 'chest medicine'] },
  { canonical: 'Neurology', aliases: ['neurology', 'neurologist'] },
  { canonical: 'Gynecology', aliases: ['gynecology', 'gynaecology', 'obg', 'obgyn', 'obstetrics and gynecology'] },
  { canonical: 'Oncology', aliases: ['oncology', 'oncologist'] },
  { canonical: 'Dermatology', aliases: ['dermatology', 'dermatologist'] },
  { canonical: 'Orthopedics', aliases: ['orthopedics', 'orthopaedics', 'orthopedic', 'orthopaedic'] }
];

const MEDICATION_DEFINITIONS = [
  { canonical: 'Levothyroxine', aliases: ['levothyroxine', 'thyroxine', 'eltroxin', 'euthyrox'] },
  { canonical: 'Metformin', aliases: ['metformin', 'glyciphage', 'glucophage'] },
  { canonical: 'Insulin', aliases: ['insulin', 'insulin glargine', 'insulin lispro', 'insulin aspart'] },
  { canonical: 'Amlodipine', aliases: ['amlodipine'] },
  { canonical: 'Telmisartan', aliases: ['telmisartan'] },
  { canonical: 'Losartan', aliases: ['losartan'] },
  { canonical: 'Atorvastatin', aliases: ['atorvastatin'] },
  { canonical: 'Rosuvastatin', aliases: ['rosuvastatin'] },
  { canonical: 'Aspirin', aliases: ['aspirin', 'ecosprin'] },
  { canonical: 'Clopidogrel', aliases: ['clopidogrel'] },
  { canonical: 'Pantoprazole', aliases: ['pantoprazole'] },
  { canonical: 'Omeprazole', aliases: ['omeprazole'] },
  { canonical: 'Vitamin D3', aliases: ['vitamin d3', 'cholecalciferol'] },
  { canonical: 'Vitamin B12', aliases: ['vitamin b12', 'mecobalamin', 'methylcobalamin'] }
];

const FIELD_CATALOG = createCatalog(FIELD_DEFINITIONS);
const DIAGNOSIS_CATALOG = createCatalog(DIAGNOSIS_DEFINITIONS);
const SPECIALIZATION_CATALOG = createCatalog(SPECIALIZATION_DEFINITIONS);
const MEDICATION_CATALOG = createCatalog(MEDICATION_DEFINITIONS);

function canonicalizeFromCatalog(value, catalog, fallbackFormatter) {
  const lookup = normalizeLookup(value);
  if (!lookup) return '';
  const match = catalog.byAlias.get(lookup) || catalog.byCanonical.get(lookup);
  if (match) return match.canonical;
  return fallbackFormatter(value);
}

function canonicalizeDiagnosis(value = '') {
  return canonicalizeFromCatalog(value, DIAGNOSIS_CATALOG, (input) => titleCase(normalizeLookup(input)));
}

function canonicalizeSpecialization(value = '') {
  return canonicalizeFromCatalog(value, SPECIALIZATION_CATALOG, (input) => titleCase(normalizeLookup(input)));
}

function canonicalizeMedicationName(value = '') {
  return canonicalizeFromCatalog(value, MEDICATION_CATALOG, (input) => titleCase(normalizeLookup(input)));
}

function canonicalizeMedicationList(values = []) {
  return Array.from(new Set((values || []).map((value) => canonicalizeMedicationName(value)).filter(Boolean)));
}

function getCanonicalFieldDefinition(key = '') {
  const lookup = normalizeLookup(key);
  return FIELD_CATALOG.byAlias.get(lookup) || FIELD_CATALOG.byCanonical.get(lookup) || null;
}

function getFieldDisplayLabel(key = '') {
  const definition = getCanonicalFieldDefinition(key);
  if (definition) return definition.display;
  const camel = String(key || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ');
  return titleCase(camel);
}

function buildCanonicalPromptSection() {
  const fieldHints = FIELD_DEFINITIONS
    .map((item) => `- ${item.canonical}: ${item.aliases.slice(0, 5).join(', ')}`)
    .join('\n');

  const diagnosisHints = DIAGNOSIS_DEFINITIONS
    .map((item) => `- ${item.canonical}: ${item.aliases.slice(0, 3).join(', ')}`)
    .join('\n');

  const specializationHints = SPECIALIZATION_DEFINITIONS
    .map((item) => `- ${item.canonical}: ${item.aliases.slice(0, 3).join(', ')}`)
    .join('\n');

  const medicationHints = MEDICATION_DEFINITIONS
    .map((item) => `- ${item.canonical}: ${item.aliases.slice(0, 3).join(', ')}`)
    .join('\n');

  return [
    'Canonical naming rules:',
    '- Use existing canonical field keys when possible. If no match exists, create a stable lowerCamelCase field key.',
    '- Standardize diagnosis names to one consistent clinical term.',
    '- Standardize specialization names to one consistent medical specialty.',
    '- Standardize medication names to one consistent generic medicine name when possible.',
    'Known canonical field keys:',
    fieldHints,
    'Known canonical diagnoses:',
    diagnosisHints,
    'Known canonical specializations:',
    specializationHints,
    'Known canonical medications:',
    medicationHints
  ].join('\n');
}

module.exports = {
  FIELD_DEFINITIONS,
  normalizeLookup,
  titleCase,
  toStableCamelCase,
  canonicalizeDiagnosis,
  canonicalizeSpecialization,
  canonicalizeMedicationName,
  canonicalizeMedicationList,
  getCanonicalFieldDefinition,
  getFieldDisplayLabel,
  buildCanonicalPromptSection
};
