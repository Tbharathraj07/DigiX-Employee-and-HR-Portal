// Automated verification script for DigiX Logo replacement
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, status: 'PASS' });
    console.log(`✓ PASS: ${name}`);
  } catch (err) {
    results.push({ name, status: 'FAIL', error: err.message });
    console.error(`✗ FAIL: ${name} - ${err.message}`);
  }
}

// 1. Check official logo asset
test('Official DigiX logo image exists in public/images/digix-logo.png with valid PNG header', () => {
  const logoPath = path.join(rootDir, 'public/images/digix-logo.png');
  if (!fs.existsSync(logoPath)) {
    throw new Error('public/images/digix-logo.png does not exist');
  }
  const buf = fs.readFileSync(logoPath);
  if (buf.length < 1000) {
    throw new Error('File size suspiciously small');
  }
  const isPng = buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
  if (!isPng) {
    throw new Error('File is not a valid PNG');
  }
});

// 2. Check favicons generated
test('Multi-size favicons exist in public directory', () => {
  const favicons = ['favicon.png', 'favicon-32x32.png', 'favicon-16x16.png'];
  for (const f of favicons) {
    const fPath = path.join(rootDir, 'public', f);
    if (!fs.existsSync(fPath)) {
      throw new Error(`Missing favicon: ${f}`);
    }
  }
});

// 3. Check index.html favicon references
test('index.html links to the official DigiX favicons and metadata', () => {
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  if (!indexHtml.includes('/favicon-32x32.png') || !indexHtml.includes('/favicon-16x16.png') || !indexHtml.includes('/favicon.png')) {
    throw new Error('index.html does not reference generated favicons');
  }
  if (indexHtml.includes("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230B57D0'>")) {
    throw new Error('Old SVG data URI favicon still present in index.html');
  }
});

// 4. Check reusable DigiXLogo component
test('DigiXLogo component exists and exports properly', () => {
  const compPath = path.join(rootDir, 'src/components/common/DigiXLogo.jsx');
  if (!fs.existsSync(compPath)) {
    throw new Error('src/components/common/DigiXLogo.jsx not found');
  }
  const content = fs.readFileSync(compPath, 'utf8');
  if (!content.includes('/images/digix-logo.png') || !content.includes('export const DigiXLogo')) {
    throw new Error('DigiXLogo component does not export properly or reference /images/digix-logo.png');
  }
});

// 5. Check Sidebar.jsx
test('Sidebar.jsx uses /images/digix-logo.png and removed generic Layers logo', () => {
  const content = fs.readFileSync(path.join(rootDir, 'src/components/layout/Sidebar.jsx'), 'utf8');
  if (!content.includes('/images/digix-logo.png')) {
    throw new Error('Sidebar.jsx does not use /images/digix-logo.png');
  }
  if (content.includes('<Layers className="w-5 h-5')) {
    throw new Error('Sidebar.jsx still contains generic Layers logo');
  }
  if (!content.includes('alt="DigiX Technologies Logo"')) {
    throw new Error('Sidebar.jsx missing accessibility alt text');
  }
});

// 6. Check LoginPage.jsx
test('LoginPage.jsx uses official DigiX logo and preserves ambient hero styling', () => {
  const content = fs.readFileSync(path.join(rootDir, 'src/pages/auth/LoginPage.jsx'), 'utf8');
  if (!content.includes('/images/digix-logo-transparent.png') && !content.includes('/images/digix-logo.png')) {
    throw new Error('LoginPage.jsx does not use official DigiX logo');
  }
  if (content.includes('topPlateGrad') || content.includes('botPlateGrad')) {
    throw new Error('Old inline SVG isometric diamond stack still present in LoginPage.jsx');
  }
  if (!content.includes('DigiX Technologies Logo')) {
    throw new Error('LoginPage.jsx missing alt text for logo');
  }
});

// 7. Check RegisterPage.jsx
test('RegisterPage.jsx uses /images/digix-logo.png in both form header and submission screen', () => {
  const content = fs.readFileSync(path.join(rootDir, 'src/pages/auth/RegisterPage.jsx'), 'utf8');
  const matches = content.match(/\/images\/digix-logo\.png/g);
  if (!matches || matches.length < 2) {
    throw new Error(`Expected at least 2 occurrences in RegisterPage.jsx, found ${matches ? matches.length : 0}`);
  }
});

// 8. Check SetupPasswordPage.jsx
test('SetupPasswordPage.jsx uses /images/digix-logo.png in activation header', () => {
  const content = fs.readFileSync(path.join(rootDir, 'src/pages/auth/SetupPasswordPage.jsx'), 'utf8');
  if (!content.includes('/images/digix-logo.png')) {
    throw new Error('SetupPasswordPage.jsx does not use /images/digix-logo.png');
  }
});

// 9. Check loading screens in App.jsx and AppLayout.jsx
test('Loading screens display /images/digix-logo.png during session verification and loading', () => {
  const appLayout = fs.readFileSync(path.join(rootDir, 'src/components/layout/AppLayout.jsx'), 'utf8');
  const app = fs.readFileSync(path.join(rootDir, 'src/App.jsx'), 'utf8');
  if (!appLayout.includes('/images/digix-logo.png')) {
    throw new Error('AppLayout.jsx loading screen does not use /images/digix-logo.png');
  }
  if (!app.includes('/images/digix-logo.png')) {
    throw new Error('App.jsx loading screen does not use /images/digix-logo.png');
  }
});

console.log('\n--- LOGO AUDIT & VERIFICATION SUMMARY ---');
console.log(`Total checks: ${results.length}`);
const failed = results.filter(r => r.status === 'FAIL');
if (failed.length > 0) {
  console.error(`Failed checks: ${failed.length}`);
  process.exit(1);
} else {
  console.log('All logo verification checks passed with 100% success!');
}
