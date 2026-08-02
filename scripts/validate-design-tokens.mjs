// Guards the GROUNDWORK design foundation:
//   1. every audited colour pair meets WCAG contrast,
//   2. no applied rule in a foundation stylesheet escapes its scope,
//   3. no raw hex colour is used outside the token file,
//   4. new stylesheets stay RTL-safe (logical properties, no physical
//      left/right), so the Arabic cut needs no override layer.
//
// Cheap, deterministic and dependency-free, so it can run on every phase.
import { readFileSync, existsSync } from 'node:fs';

const STYLES = 'src/styles';
const TOKENS = `${STYLES}/tokens.css`;
const GLOBAL_LAYERS = ['tokens.css', 'fonts.css'];
const SCOPED_LAYERS = [
  'typography.css',
  'motion.css',
  'geometry.css',
  'layout.css',
  'lab-home.css',
];
const SCOPE = '.lab-scope';

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

const tokenSource = read(TOKENS);
const tokens = Object.fromEntries(
  [...strip(tokenSource).matchAll(/(--sh-[a-z0-9-]+)\s*:\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [
    m[1],
    m[2].toLowerCase(),
  ]),
);
const token = (name) => {
  const value = tokens[name];
  if (!value) failures.push(`Token ${name} is missing or is not a 6-digit hex in ${TOKENS}`);
  return value;
};

// text >= 4.5:1, non-text/UI >= 3:1 (WCAG 2.2 AA, 1.4.3 and 1.4.11)
const PAIRS = [
  ['--sh-ink', '--sh-chalk', 4.5],
  ['--sh-ink-70', '--sh-chalk', 4.5],
  ['--sh-ink-50', '--sh-chalk', 4.5],
  ['--sh-ink-35', '--sh-chalk', 3],
  ['--sh-signal', '--sh-chalk', 4.5],
  ['--sh-verified', '--sh-chalk', 4.5],
  ['--sh-alert', '--sh-chalk', 4.5],
  ['--sh-warn', '--sh-chalk', 4.5],
  ['--sh-maple', '--sh-chalk', 4.5],
  ['--sh-ink', '--sh-chalk-2', 4.5],
  ['--sh-ink', '--sh-chalk-3', 4.5],
  ['--sh-ink', '--sh-maple-tint', 4.5],
  ['--sh-verified', '--sh-maple-tint', 4.5],
  ['--sh-night-ink', '--sh-night', 4.5],
  ['--sh-night-ink-70', '--sh-night', 4.5],
  ['--sh-night-ink', '--sh-night-2', 4.5],
  ['--sh-sodium', '--sh-night', 4.5],
  ['--sh-moon', '--sh-night', 4.5],
  ['--sh-signal-on-dark', '--sh-night', 3],
  ['--sh-signal-on-dark', '--sh-night-2', 3],
];

const audited = [];
for (const [fg, bg, minimum] of PAIRS) {
  const a = token(fg);
  const b = token(bg);
  if (!a || !b) continue;
  const ratio = contrast(a, b);
  audited.push({ fg, bg, ratio: Number(ratio.toFixed(2)), minimum });
  if (ratio < minimum)
    failures.push(`Contrast ${fg} on ${bg} is ${ratio.toFixed(2)}:1; WCAG needs ${minimum}:1`);
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

for (const file of SCOPED_LAYERS) {
  for (const selector of selectorsOf(read(`${STYLES}/${file}`))) {
    if (!selector.includes(SCOPE)) {
      failures.push(
        `${file}: selector escapes ${SCOPE} and could reach the live site -> "${selector.slice(0, 90)}"`,
      );
    }
  }
}

for (const file of GLOBAL_LAYERS) {
  for (const selector of selectorsOf(read(`${STYLES}/${file}`))) {
    const allowed =
      selector.startsWith(':root') ||
      selector.startsWith('[data-capability') ||
      selector.includes(SCOPE);
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

for (const file of SCOPED_LAYERS) {
  const css = strip(read(`${STYLES}/${file}`));
  for (const match of css.matchAll(/#[0-9a-f]{3,8}\b/gi)) {
    failures.push(`${file}: raw colour ${match[0]} must come from a --sh-* token`);
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
  `Design tokens passed: ${audited.length} colour pairs meet WCAG contrast, ` +
    `${SCOPED_LAYERS.length} applied layers stay inside ${SCOPE}, ` +
    `${GLOBAL_LAYERS.length} global layers declare custom properties only, ` +
    'and no scoped layer uses a raw colour or a physical left/right property.',
);
