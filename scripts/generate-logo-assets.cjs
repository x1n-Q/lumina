const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const projectRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(projectRoot, 'public', 'lumina-logo.svg');
const outputPath = path.join(projectRoot, 'public', 'lumina-logo.png');

try {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const renderer = new Resvg(source, {
    fitTo: { mode: 'width', value: 512 },
    background: 'rgba(0, 0, 0, 0)'
  });
  const png = renderer.render().asPng();
  fs.writeFileSync(outputPath, png);
  console.log(`Generated ${outputPath} from the canonical Lumina SVG`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
