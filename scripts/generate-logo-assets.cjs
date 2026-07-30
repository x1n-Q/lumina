const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const projectRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(projectRoot, 'public', 'lumina-logo.svg');
const publicPath = path.join(projectRoot, 'public');

function renderSvg(source, size, outputName) {
  const renderer = new Resvg(source, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0, 0, 0, 0)'
  });
  const outputPath = path.join(publicPath, outputName);
  fs.writeFileSync(outputPath, renderer.render().asPng());
  console.log(`Generated ${outputPath}`);
}

try {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const embeddedLogo = Buffer.from(source).toString('base64');
  const maskableSource = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <rect width="512" height="512" fill="#08090d"/>
      <image x="82" y="82" width="348" height="348"
        href="data:image/svg+xml;base64,${embeddedLogo}"/>
    </svg>
  `;

  renderSvg(source, 512, 'lumina-logo.png');
  renderSvg(source, 180, 'apple-touch-icon.png');
  renderSvg(source, 192, 'pwa-icon-192.png');
  renderSvg(source, 512, 'pwa-icon-512.png');
  renderSvg(maskableSource, 512, 'pwa-maskable-512.png');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
