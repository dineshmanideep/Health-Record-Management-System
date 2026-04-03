const fs = require('fs');
const path = require('path');
const {
  extractReportInsightsFromPdf,
  extractReportInsightsFromText
} = require('../utils/reportParser');

async function run() {
  const inputArg = process.argv[2];

  if (!inputArg) {
    console.log('Usage:');
    console.log('  npm run parse:report -- <path-to-report.pdf>');
    console.log('  npm run parse:report -- <path-to-extracted-text.txt>');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), inputArg);
  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    process.exit(1);
  }

  const ext = path.extname(inputPath).toLowerCase();
  let result;

  if (ext === '.pdf') {
    result = await extractReportInsightsFromPdf(inputPath);
  } else {
    const text = fs.readFileSync(inputPath, 'utf8');
    result = extractReportInsightsFromText(text);
  }

  console.log('\n--- Parser Result ---');
  console.log(`Report Tag: ${result.reportTag}`);
  console.log(`Parsed Metrics Count: ${result.parsedMetrics.length}`);

  if (result.parsedMetrics.length) {
    console.log('\nFirst 10 metrics:');
    result.parsedMetrics.slice(0, 10).forEach((metric, index) => {
      console.log(
        `${index + 1}. ${metric.name} = ${metric.value}${metric.unit ? ` ${metric.unit}` : ''}` +
          `${metric.reference ? ` | Ref: ${metric.reference}` : ''}` +
          `${metric.status ? ` | Status: ${metric.status}` : ''}`
      );
    });
  }
}

run().catch((error) => {
  console.error('Parser test failed:', error.message || error);
  process.exit(1);
});
