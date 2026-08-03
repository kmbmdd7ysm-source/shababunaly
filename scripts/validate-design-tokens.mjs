// Guards the GROUNDWORK design foundation:
//   1. every audited colour pair meets WCAG contrast,
//   2. no applied rule targets anything but a gw-* class or an owned base element,
//   3. no raw hex colour is used outside the token file,
//   4. new stylesheets stay RTL-safe (logical properties, no physical
//      left/right), so the Arabic cut needs no override layer.
//
// Cheap, deterministic and dependency-free, so it can run on every phase.
import { readFileSync, existsSync } from 'node:fs';

const STYLES = 'src/styles';
const TOKENS = `${STYLES}/tokens.css`;
const GLOBAL_LAYERS = ['tokens.css', 'fonts.css'];
// The Phase 2A shell bridge is allowed to target legacy shell class names —
// that is its entire purpose — but it is still held to tokens-only colours and
// logical-properties-only layout.
const BRIDGE_LAYERS = [
  'shell.css',
  'catalog.css',
  'studio.css',
  'workspace.css',
  'content.css',
  'transact.css',
  'operations.css',
  'masthead.css',
  'colophon.css',
  'catalogue.css',
  'stage.css',
  'ledger.css',
  'checkout.css',
  'composition.css',
  'account.css',
  'command.css',
  'rail.css',
  'journey.css',
  'runs.css',
  'buildmarker.css',
];
const SCOPED_LAYERS = [
  'typography.css',
  'motion.css',
  'geometry.css',
  'layout.css',
  'lab-home.css',
  'home.css',
  'product.css',
];

const failures = [];
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const read = (file) => {
  if (!existsSync(file)) {
    failures.push(`Missing foundation stylesheet: ${file}`);
    return '';
  }
  return readFileSync(file, 'utf8');
};

/* -------------------------------------------------------------- contrast -- */

const toRgb = (hex) => {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
};
const channel = (raw) => {
  const c = raw / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const [r, g, b] = toRgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const tokenSource = strip(read(TOKENS));

// Remove balanced at-rule blocks so the BASE palette is read from `:root`
// alone. Reading the whole file let the `prefers-contrast: more` overrides
// shadow the base values, which silently disarmed the contrast audit.
function withoutAtRules(css) {
  let out = '';
  let index = 0;
  while (index < css.length) {
    const at = css.indexOf('@', index);
    if (at === -1) return out + css.slice(index);
    const open = css.indexOf('{', at);
    if (open === -1) return out + css.slice(index);
    out += css.slice(index, at);
    let depth = 1;
    let cursor = open + 1;
    while (cursor < css.length && depth > 0) {
      if (css[cursor] === '{') depth += 1;
      if (css[cursor] === '}') depth -= 1;
      cursor += 1;
    }
    index = cursor;
  }
  return out;
}

function blockAfter(css, marker) {
  const at = css.indexOf(marker);
  if (at === -1) return '';
  const open = css.indexOf('{', at);
  let depth = 1;
  let cursor = open + 1;
  while (cursor < css.length && depth > 0) {
    if (css[cursor] === '{') depth += 1;
    if (css[cursor] === '}') depth -= 1;
    cursor += 1;
  }
  return css.slice(open, cursor);
}

const readPalette = (css) =>
  Object.fromEntries(
    [...css.matchAll(/(--sh-[a-z0-9-]+)\s*:\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [
      m[1],
      m[2].toLowerCase(),
    ]),
  );

const basePalette = readPalette(withoutAtRules(tokenSource));
// The high-contrast palette must clear the same bars: it is a real rendering
// mode, not a decoration.
const contrastPalette = {
  ...basePalette,
  ...readPalette(blockAfter(tokenSource, '@media (prefers-contrast: more)')),
};

const PALETTES = [
  ['default', basePalette],
  ['prefers-contrast', contrastPalette],
];

const tokenFrom = (palette, name, mode) => {
  const value = palette[name];
  if (!value)
    failures.push(`Token ${name} is missing or is not a 6-digit hex in ${TOKENS} (${mode})`);
  return value;
};

// Every foreground is checked against EVERY surface it can legitimately land
// on, not against a hand-picked shortlist. The first pass of this system only
// audited against the lightest surface and shipped four failures that axe then
// found on the darker ones, so the matrix is generated rather than curated.
const LIGHT_SURFACES = ['--sh-chalk', '--sh-chalk-2', '--sh-chalk-3', '--sh-maple-tint'];
const DARK_SURFACES = ['--sh-night', '--sh-night-2'];
// text >= 4.5:1 (WCAG 1.4.3), non-text/UI >= 3:1 (1.4.11)
const LIGHT_FOREGROUNDS = [
  ['--sh-ink', 4.5],
  ['--sh-ink-70', 4.5],
  ['--sh-ink-50', 4.5],
  ['--sh-ink-35', 3],
  ['--sh-signal', 4.5],
  ['--sh-verified', 4.5],
  ['--sh-alert', 4.5],
  ['--sh-warn', 4.5],
  ['--sh-maple', 4.5],
];
const DARK_FOREGROUNDS = [
  ['--sh-night-ink', 4.5],
  ['--sh-night-ink-70', 4.5],
  ['--sh-sodium', 4.5],
  ['--sh-moon', 4.5],
  ['--sh-signal-on-dark', 3],
];
const PAIRS = [
  ...LIGHT_FOREGROUNDS.flatMap(([fg, min]) => LIGHT_SURFACES.map((bg) => [fg, bg, min])),
  ...DARK_FOREGROUNDS.flatMap(([fg, min]) => DARK_SURFACES.map((bg) => [fg, bg, min])),
];

const audited = [];
for (const [mode, palette] of PALETTES) {
  for (const [fg, bg, rawMinimum] of PAIRS) {
    const a = tokenFrom(palette, String(fg), mode);
    const b = tokenFrom(palette, String(bg), mode);
    if (!a || !b) continue;
    const minimum = Number(rawMinimum);
    const ratio = contrast(a, b);
    audited.push({ mode, fg, bg, ratio: Number(ratio.toFixed(2)), minimum });
    if (ratio < minimum) {
      failures.push(
        `Contrast ${fg} on ${bg} is ${ratio.toFixed(2)}:1 in ${mode}; WCAG needs ${minimum}:1`,
      );
    }
  }
}

/* ------------------------------------------------------- undefined tokens -- */

// A `var(--sh-...)` reference to a token that was never declared fails
// silently and takes its whole declaration with it. This phase shipped a
// `var(--sh-alarm)` typo that quietly dropped an error colour, so every
// reference is now checked against the declared set.
{
  const declared = new Set();
  for (const file of ['tokens.css', ...GLOBAL_LAYERS]) {
    for (const match of read(`${STYLES}/${file}`).matchAll(/(--sh-[a-z0-9-]+)\s*:/gi)) {
      declared.add(match[1]);
    }
  }
  for (const file of [...SCOPED_LAYERS, ...BRIDGE_LAYERS]) {
    const css = read(`${STYLES}/${file}`);
    for (const match of css.matchAll(/var\(\s*(--sh-[a-z0-9-]+)\s*(,)?/gi)) {
      // A reference carrying its own fallback degrades safely and is a
      // deliberate pattern; a bare reference to a missing token is a typo.
      if (!match[2] && !declared.has(match[1])) {
        failures.push(`${file}: var(${match[1]}) is not a declared token`);
      }
    }
  }
}

/* --------------------------------------------------------------- scoping -- */

// Minimal CSS block walker. Descends into at-rule bodies, reports only real
// selectors, and ignores keyframe stops, which are offsets rather than
// selectors and cannot match anything in the document.
function walk(css, visit) {
  const source = strip(css);
  let index = 0;
  const parse = (end, insideKeyframes) => {
    let prelude = '';
    while (index < end) {
      const character = source[index];
      if (character === '{') {
        index += 1;
        let depth = 1;
        const start = index;
        while (index < end && depth > 0) {
          if (source[index] === '{') depth += 1;
          if (source[index] === '}') depth -= 1;
          index += 1;
        }
        const body = source.slice(start, index - 1);
        const head = prelude.trim();
        prelude = '';
        if (head.startsWith('@')) {
          const name = head.split(/[\s(]/)[0].toLowerCase();
          if (name === '@font-face') visit({ selector: head, body, atRule: true });
          else {
            const saved = index;
            index = 0;
            const nested = body;
            const sub = walk.bind(null, nested);
            index = saved;
            sub((entry) =>
              visit({ ...entry, insideKeyframes: entry.insideKeyframes || name === '@keyframes' }),
            );
          }
        } else if (!insideKeyframes) {
          for (const selector of head.split(','))
            if (selector.trim()) visit({ selector: selector.trim(), body });
        }
      } else if (character === '}') {
        index += 1;
      } else {
        prelude += character;
        index += 1;
      }
    }
  };
  parse(source.length, false);
}

const selectorsOf = (css) => {
  const found = [];
  walk(css, ({ selector, atRule, insideKeyframes }) => {
    if (atRule || insideKeyframes) return;
    found.push(selector);
  });
  return found;
};

// Phase 2 promoted the applied layers from a prototype scope to global, so the
// isolation rule changes shape. It is no longer "everything sits under
// .lab-scope"; it is now "nothing may target a legacy class name". Every
// selector in an applied layer must be built from `gw-*` classes, the handful
// of base elements the system deliberately owns, or a documented state hook.
const OWNED_ELEMENTS = new Set([':root', 'body', 'html']);
const STATE_HOOKS = ['[dir=', '[lang=', '[data-capability=', '[data-gw'];

function isOwnedSelector(selector) {
  const trimmed = selector.trim();
  if (OWNED_ELEMENTS.has(trimmed)) return true;
  const compounds = trimmed.split(/\s+|>|\+|~/).filter(Boolean);
  // A `gw-*` class anywhere in the selector confines the whole rule to markup
  // this system owns, so descendants such as `.gw-spec-table th` are safe.
  const anchored = compounds.some((c) => c.includes('.gw-'));
  if (anchored) return true;
  // Otherwise every compound must be an owned element or a documented hook.
  return compounds.every((compound) => {
    const bare = compound.replace(/::?[a-zA-Z-]+(\([^)]*\))?/g, '');
    if (!bare) return true;
    if (OWNED_ELEMENTS.has(bare)) return true;
    return STATE_HOOKS.some((hook) => bare.startsWith(hook));
  });
}

for (const file of SCOPED_LAYERS) {
  for (const selector of selectorsOf(read(`${STYLES}/${file}`))) {
    if (!isOwnedSelector(selector)) {
      failures.push(
        `${file}: selector is neither a gw-* class nor an owned base element, so it may collide with legacy styles -> "${selector.slice(0, 90)}"`,
      );
    }
  }
}

for (const file of GLOBAL_LAYERS) {
  for (const selector of selectorsOf(read(`${STYLES}/${file}`))) {
    const allowed = selector.startsWith(':root') || selector.startsWith('[data-capability');
    if (!allowed)
      failures.push(
        `${file}: global selector must declare custom properties only -> "${selector.slice(0, 90)}"`,
      );
  }
}

// A global layer may only ever set custom properties, never applied
// declarations. @font-face is the one exception: it is a resource contract,
// not a rule that can match an element.
for (const file of GLOBAL_LAYERS) {
  walk(read(`${STYLES}/${file}`), ({ selector, body, atRule }) => {
    if (atRule) return;
    for (const declaration of body.split(';')) {
      const property = declaration.split(':')[0].trim();
      if (property && !property.startsWith('--')) {
        failures.push(
          `${file}: "${selector.slice(0, 50)}" applies "${property}"; global layers may declare custom properties only`,
        );
      }
    }
  });
}

/* --------------------------------------------------------- raw hex / RTL -- */

for (const file of [...SCOPED_LAYERS, ...BRIDGE_LAYERS]) {
  const css = strip(read(`${STYLES}/${file}`));
  for (const match of css.matchAll(/#[0-9a-f]{3,8}\b/gi)) {
    failures.push(`${file}: raw colour ${match[0]} must come from a --sh-* token`);
  }
  for (const match of css.matchAll(/\b(?:rgba?|hsla?)\([^)]*\)/gi)) {
    failures.push(`${file}: raw colour ${match[0].slice(0, 40)} must come from a --sh-* token`);
  }
  for (const match of css.matchAll(/(?:^|[;{\s])(margin|padding|border)-(left|right)\s*:/g)) {
    failures.push(
      `${file}: physical property "${match[1]}-${match[2]}" breaks RTL; use the logical equivalent`,
    );
  }
  for (const match of css.matchAll(/(?:^|[;{\s])(left|right)\s*:/g)) {
    failures.push(`${file}: physical offset "${match[1]}" breaks RTL; use inset-inline-start/end`);
  }
}

/* ----------------------------------------------------------------- report -- */

if (failures.length) {
  console.error(
    `Design-token validation failed:\n${failures.map((item) => `- ${item}`).join('\n')}`,
  );
  process.exit(1);
}
console.info(
  `Design tokens passed: ${audited.length} colour pairs meet WCAG contrast across ${PALETTES.length} palettes, ` +
    `${SCOPED_LAYERS.length} applied layers use only gw-* selectors, ${BRIDGE_LAYERS.length} bridge layer checked for tokens and logical properties, ` +
    `${GLOBAL_LAYERS.length} global layers declare custom properties only, ` +
    'and no scoped layer uses a raw colour or a physical left/right property.',
);
