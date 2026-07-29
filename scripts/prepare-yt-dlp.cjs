const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const YTDLP_VERSION = '2026.07.04';
const RELEASE_BASE_URL = `https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}`;
const PROJECT_ROOT = path.resolve(__dirname, '..');

const RUNTIMES = {
  linux: {
    asset: 'yt-dlp_linux',
    checksum: '6bbb3d314cde4febe36e5fa1d55462e29c974f63444e707871834f6d8cc210ae',
    destination: path.join(PROJECT_ROOT, 'build-resources', 'bin', 'linux', 'yt-dlp'),
    mode: 0o755
  },
  win: {
    asset: 'yt-dlp.exe',
    checksum: '52fe3c26dcf71fbdc85b528589020bb0b8e383155cfa81b64dd447bbe35e24b8',
    destination: path.join(PROJECT_ROOT, 'build-resources', 'bin', 'win', 'yt-dlp.exe')
  }
};

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function readVerifiedRuntime(runtime) {
  try {
    const buffer = await fs.promises.readFile(runtime.destination);
    return sha256(buffer) === runtime.checksum;
  } catch {
    return false;
  }
}

async function prepareRuntime(platform) {
  const runtime = RUNTIMES[platform];
  if (await readVerifiedRuntime(runtime)) {
    console.log(`✓ ${runtime.asset} ${YTDLP_VERSION} already verified`);
    return;
  }

  const response = await fetch(`${RELEASE_BASE_URL}/${runtime.asset}`, {
    headers: { 'User-Agent': 'Lumina desktop release builder' },
    redirect: 'follow'
  });
  if (!response.ok) {
    throw new Error(`Could not download ${runtime.asset}: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const checksum = sha256(buffer);
  if (checksum !== runtime.checksum) {
    throw new Error(
      `${runtime.asset} checksum mismatch: expected ${runtime.checksum}, received ${checksum}`
    );
  }

  await fs.promises.mkdir(path.dirname(runtime.destination), { recursive: true });
  const temporaryPath = `${runtime.destination}.tmp`;
  await fs.promises.writeFile(temporaryPath, buffer);
  await fs.promises.rename(temporaryPath, runtime.destination);
  if (runtime.mode) await fs.promises.chmod(runtime.destination, runtime.mode);
  console.log(`✓ Downloaded and verified ${runtime.asset} ${YTDLP_VERSION}`);
}

async function main() {
  const requested = new Set(process.argv.slice(2));
  const platforms = requested.size === 0
    ? Object.keys(RUNTIMES)
    : Object.keys(RUNTIMES).filter((platform) => requested.has(`--${platform}`));

  if (platforms.length === 0) {
    throw new Error('Use --linux, --win, or no flag to prepare every desktop runtime');
  }

  for (const platform of platforms) {
    await prepareRuntime(platform);
  }
}

main().catch((error) => {
  console.error(`Runtime preparation failed: ${error.message}`);
  process.exitCode = 1;
});
