const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgs = fs.readdirSync('.').filter(f => f.endsWith('.svg'));

(async () => {
  for (const svg of svgs) {
    const out = svg.replace('.svg', '.png');
    await sharp(Buffer.from(fs.readFileSync(svg)))
      .png()
      .toFile(out);
    console.log(`✓  ${svg}  →  ${out}`);
  }
  console.log('\nDone. Use \\includegraphics{diagrams/figX} in LaTeX (.png found automatically).');
})();
