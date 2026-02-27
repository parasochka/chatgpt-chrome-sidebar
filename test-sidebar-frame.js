// Tests for the data-sidely-frame detection logic
// Run with: node test-sidebar-frame.js

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log('  PASS:', label);
    passed++;
  } else {
    console.error('  FAIL:', label);
    failed++;
  }
}

function makeDoc() {
  const attrs = {};
  return {
    _attrs: attrs,
    documentElement: {
      setAttribute(k, v) { attrs[k] = v; },
      hasAttribute(k) { return k in attrs; }
    }
  };
}

function runDetection(win, doc) {
  if (win !== win.top) {
    doc.documentElement.setAttribute('data-sidely-frame', '');
  }
}

// ── Test 1: top-level window (regular browser tab) ────────────────────────
console.log('\nTest 1: top-level window (regular browser tab)');
{
  const doc = makeDoc();
  const win = {};
  win.top = win; // window === window.top in a normal tab

  runDetection(win, doc);

  assert(!doc.documentElement.hasAttribute('data-sidely-frame'),
    'attribute must NOT be set — CSS hide rules must not apply');
}

// ── Test 2: first-level iframe (sidebar frame) ────────────────────────────
console.log('\nTest 2: first-level iframe (sidebar frame)');
{
  const doc = makeDoc();
  const topWin = {};
  const win = {};
  win.top = topWin; // window !== window.top

  runDetection(win, doc);

  assert(doc.documentElement.hasAttribute('data-sidely-frame'),
    'attribute MUST be set — CSS hide rules must apply');
  assert(doc._attrs['data-sidely-frame'] === '',
    'attribute value must be empty string');
}

// ── Test 3: nested iframe (iframe inside iframe) ──────────────────────────
console.log('\nTest 3: nested iframe (iframe inside iframe)');
{
  const doc = makeDoc();
  const grandParent = {};
  const win = {};
  win.top = grandParent; // still !== win

  runDetection(win, doc);

  assert(doc.documentElement.hasAttribute('data-sidely-frame'),
    'nested iframe must also get the attribute');
}

// ── Test 4: idempotent — calling twice does not break anything ────────────
console.log('\nTest 4: idempotent double-call');
{
  const doc = makeDoc();
  const topWin = {};
  const win = {};
  win.top = topWin;

  runDetection(win, doc);
  runDetection(win, doc); // second call should be harmless

  assert(doc.documentElement.hasAttribute('data-sidely-frame'),
    'attribute still present after second call');
}

// ── Test 5: CSS selectors — smoke-check the file contains scoped rules ────
console.log('\nTest 5: CSS file contains properly scoped rules');
{
  const fs = require('fs');
  const css = fs.readFileSync('./css/chatgpt-overrides.css', 'utf8');

  const rules = [
    // NOTE: the original CSS file uses CSS-escaped form \.\_\_ which is equivalent
    // to .__ (underscore escaping is valid but unnecessary in CSS identifiers).
    // We check for the string as it actually appears in the file.
    'html[data-sidely-frame] .\\_\\_menu-item:has(svg path[d^="M3.51105 18.4269"])',
    'html[data-sidely-frame] [data-testid="composer-speech-button"]',
    'html[data-sidely-frame] [data-testid="composer-speech-button-container"]',
    'html[data-sidely-frame] button[data-testid="send-button"][aria-disabled="true"]',
    'html[data-sidely-frame] button[data-testid="send-button"][disabled]',
  ];

  // Also verify old unscoped rules are NOT present
  const unscopedRules = [
    /^button\.composer-btn:has/m,
    /^\[data-testid="composer-speech-button"\]/m,
    /^button\[data-testid="send-button"\]\[aria-disabled/m,
  ];

  rules.forEach(rule => {
    assert(css.includes(rule), `scoped rule present: ${rule.slice(0, 60)}...`);
  });

  unscopedRules.forEach(pattern => {
    assert(!pattern.test(css), `unscoped rule absent: ${pattern}`);
  });
}

// ── Test 6: JS file sets attribute at module top-level (not in a callback) ──
console.log('\nTest 6: JS file — detection runs at top-level, not inside a callback');
{
  const fs = require('fs');
  const js = fs.readFileSync('./js/chatgpt-overrides.js', 'utf8');

  // The check must appear before any function definition that could defer it
  const ifIdx = js.indexOf('if (window !== window.top)');
  const firstFnIdx = js.indexOf('function ');

  assert(ifIdx !== -1, 'detection block exists in JS file');
  assert(ifIdx < firstFnIdx, 'detection runs before any function (top-level, eagerly)');
  assert(js.includes("setAttribute('data-sidely-frame', '')"),
    'JS sets the correct attribute');
}

// ── Summary ───────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
