// Automated verification script for Animated Transparent DigiX Logo on Login Page
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

// 1. Verify Transparent Logo Asset
test('public/images/digix-logo-transparent.png exists with genuine alpha transparency', () => {
  const logoPath = path.join(rootDir, 'public/images/digix-logo-transparent.png');
  if (!fs.existsSync(logoPath)) {
    throw new Error('public/images/digix-logo-transparent.png missing');
  }
  const buf = fs.readFileSync(logoPath);
  if (buf.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error('Not a valid PNG file');
  }
  // Check IHDR has color type 6 (RGBA)
  if (buf[25] !== 6) {
    throw new Error(`Expected color type 6 (RGBA with alpha), found ${buf[25]}`);
  }
});

// 2. Verify LoginPage.jsx Logo & Structure
test('LoginPage.jsx uses transparent logo without white tile/card container', () => {
  const loginCode = fs.readFileSync(path.join(rootDir, 'src/pages/auth/LoginPage.jsx'), 'utf8');
  if (!loginCode.includes('/images/digix-logo-transparent.png')) {
    throw new Error('LoginPage.jsx does not reference /images/digix-logo-transparent.png');
  }
  // Ensure no white card wrapping the logo
  if (loginCode.includes('bg-white p-2') && loginCode.includes('rounded-2xl bg-white')) {
    throw new Error('LoginPage.jsx still contains white container around logo');
  }
  // Ensure headings are preserved
  if (!loginCode.includes('Digi<span className="text-[#38BDF8]">X</span> Technologies')) {
    throw new Error('DigiX Technologies heading modified or missing');
  }
  if (!loginCode.includes('Enterprise Employee &amp; HR Portal')) {
    throw new Error('Enterprise Employee & HR Portal subtitle missing');
  }
});

// 3. Verify All 5 Animations in LoginPage.jsx and index.css
test('All 5 Animations (Entrance, Glow, Nodes, Text Entrance, Idle Float) are configured', () => {
  const loginCode = fs.readFileSync(path.join(rootDir, 'src/pages/auth/LoginPage.jsx'), 'utf8');
  const cssCode = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf8');

  // Animation A: Entrance
  if (!loginCode.includes('digix-logo-entrance') || !cssCode.includes('@keyframes digixLogoEntrance')) {
    throw new Error('Animation A (Smooth Entrance) missing');
  }

  // Animation B: Glow
  if (!loginCode.includes('digix-logo-glow') || !cssCode.includes('@keyframes digixLogoGlowPulse')) {
    throw new Error('Animation B (Network Glow Pulse) missing');
  }

  // Animation C: Connecting Node Pulses
  if (!loginCode.includes('digix-node-pulse') || !cssCode.includes('@keyframes digixNodePulse')) {
    throw new Error('Animation C (Node Pulses) missing');
  }
  const nodeMatches = loginCode.match(/digix-node-pulse/g);
  if (!nodeMatches || nodeMatches.length < 8) {
    throw new Error(`Expected 8 node pulse elements, found ${nodeMatches ? nodeMatches.length : 0}`);
  }

  // Animation D: Brand Text Entrance
  if (!loginCode.includes('digix-brand-text-entrance') || !cssCode.includes('@keyframes digixBrandTextEntrance')) {
    throw new Error('Animation D (Brand Text Entrance) missing');
  }

  // Animation E: Idle Float
  if (!loginCode.includes('digix-logo-idle') || !cssCode.includes('@keyframes digixFloatSubtle')) {
    throw new Error('Animation E (Idle Float) missing');
  }
});

// 4. Verify Reduced Motion Support
test('prefers-reduced-motion media query disables all logo animations', () => {
  const cssCode = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf8');
  if (!cssCode.includes('@media (prefers-reduced-motion: reduce)')) {
    throw new Error('prefers-reduced-motion media query missing in index.css');
  }
  const reducedBlock = cssCode.slice(cssCode.indexOf('@media (prefers-reduced-motion: reduce)'));
  if (!reducedBlock.includes('digix-logo-entrance') ||
      !reducedBlock.includes('digix-logo-glow') ||
      !reducedBlock.includes('digix-node-pulse') ||
      !reducedBlock.includes('digix-brand-text-entrance') ||
      !reducedBlock.includes('digix-logo-idle')) {
    throw new Error('prefers-reduced-motion does not cover all logo animation classes');
  }
  if (!reducedBlock.includes('animation: none !important')) {
    throw new Error('prefers-reduced-motion does not set animation: none !important');
  }
});

// 5. Verify Login Form and Functional Components are Intact
test('Login form functionality (inputs, submit, forgot password, register link) is preserved', () => {
  const loginCode = fs.readFileSync(path.join(rootDir, 'src/pages/auth/LoginPage.jsx'), 'utf8');
  if (!loginCode.includes('handleCustomLogin') || !loginCode.includes('login(trimmedEmail, password)')) {
    throw new Error('Login submission handler missing');
  }
  if (!loginCode.includes('showPassword') || !loginCode.includes('setShowPassword')) {
    throw new Error('Password visibility toggle missing');
  }
  if (!loginCode.includes('handleForgotPassword') || !loginCode.includes('Forgot password?')) {
    throw new Error('Forgot password functionality missing');
  }
  if (!loginCode.includes('/register') || !loginCode.includes('Request Account Access')) {
    throw new Error('Request Account Access link missing');
  }
});

console.log('\n--- ANIMATED LOGO VERIFICATION SUMMARY ---');
console.log(`Total checks: ${results.length}`);
const failed = results.filter(r => r.status === 'FAIL');
if (failed.length > 0) {
  console.error(`Failed checks: ${failed.length}`);
  process.exit(1);
} else {
  console.log('All login animated logo checks passed with 100% success!');
}
