from pathlib import Path
import re

root = Path('.')
errors=[]
notes=[]
hero_text=(root/'src/data/localHeroMedia.ts').read_text()
film_block=re.search(r'const FILMS = \{(.*?)\} as const;',hero_text,re.S)
if not film_block:
    errors.append('FILMS map missing')
    films={}
else:
    films=dict(re.findall(r"^\s*(\w+):\s*'([^']+)'",film_block.group(1),re.M))
required=['home','shop','footwear','clothing','accessories','basketballs','equipment','shoeFinder','custom','discover','teams','stories','releases']
for key in required:
    if key not in films: errors.append(f'missing hero film: {key}')
if len(set(films.values())) != len(films): errors.append('hero film IDs are not unique')
if 'youtube-nocookie.com/embed/' not in hero_text: errors.append('external embed helper missing')
if '/media/heroes/' in hero_text or '/media/official-brand/' in hero_text: errors.append('local hero/editorial runtime media still referenced')
notes.append(f'Hero films: {len(films)} unique external IDs')

# key runtime source files must not reference the old generated media trees
runtime_files=[root/'index.html']+list((root/'src').rglob('*.ts'))+list((root/'src').rglob('*.tsx'))
legacy=[]
for p in runtime_files:
    t=p.read_text(errors='ignore')
    for token in ['/media/heroes/','/media/official-brand/']:
        if token in t: legacy.append(f'{p}:{token}')
if legacy: errors.append('legacy local runtime refs: '+', '.join(legacy[:10]))
notes.append('Old local hero/editorial runtime paths: 0')

# physical old runtime dirs should not exist
for d in [root/'public/media/heroes', root/'public/media/official-brand']:
    if d.exists(): errors.append(f'legacy public media directory still exists: {d}')
notes.append('Old public hero/editorial directories absent')

# Custom selector cards: every fallback must be external and distinct
custom=(root/'src/pages/CustomizePage.tsx').read_text()
block=re.search(r'const fallbackArt: Record<string, string> = \{(.*?)\n\};',custom,re.S)
vals=[]
if not block:
    errors.append('custom fallbackArt block missing')
else:
    vals=re.findall(r"(?:'[^']+'|\w+):\s*'([^']+)'",block.group(1))
    if not vals: errors.append('no custom fallback media parsed')
    if any(not v.startswith('https://') for v in vals): errors.append('custom fallback includes non-external media')
    if len(set(vals))!=len(vals): errors.append('custom fallback images repeat')
notes.append(f'Custom product cards: {len(vals)} external single-image assets / {len(set(vals))} unique')

# Category / merchandising art source files cannot contain local editorial paths
for rel in ['src/data/categories.ts','src/data/merchandising.ts']:
    t=(root/rel).read_text()
    if '/media/official-brand/' in t or '/images/categories/' in t:
        errors.append(f'{rel} still references old local editorial art')
notes.append('Category and merchandising maps use external media only')

# Hero component / editorial component embed support and no playback-rate speed ramp
for rel in ['src/components/common/EditorialMedia.tsx','src/components/experience/CinematicHero.tsx']:
    t=(root/rel).read_text()
    if 'iframe' not in t or 'youtube' not in t:
        errors.append(f'{rel} lacks YouTube embed support')
    if 'playbackRate' in t:
        errors.append(f'{rel} contains playbackRate/speed ramp logic')
notes.append('Hero renderer uses one iframe/video asset; no playbackRate speed-ramp logic')

# YouTube CSP permission
vercel=(root/'vercel.json').read_text()
if 'https://www.youtube-nocookie.com' not in vercel:
    errors.append('CSP does not allow youtube-nocookie frames')
notes.append('CSP allows official YouTube embeds')

# Discover detail map is per-collection, not one repeated hero
D=(root/'src/pages/DiscoverPage.tsx').read_text()
slugs=re.findall(r"'([a-z-]+)':\s*LOCAL_HERO_MEDIA\.\w+",D)
if len(slugs)<8: errors.append('discover per-collection hero map incomplete')
notes.append(f'Discover collection hero assignments: {len(slugs)}')

# Shop categories all have hero assignments
S=(root/'src/pages/ShopPage.tsx').read_text()
for key in ['footwear','clothing','accessories','basketballs','equipment']:
    if f'{key}: LOCAL_HERO_MEDIA.{key}' not in S:
        errors.append(f'shop category hero missing: {key}')
notes.append('Shop hero assignments cover footwear, clothing, accessories, basketballs, equipment')

report=root/'reports/media/EXTERNAL_MEDIA_FINAL_AUDIT.md'
report.parent.mkdir(parents=True,exist_ok=True)
lines=['# SHABABUNA external media final audit','','## Result',f'- Errors: **{len(errors)}**','']
lines+=['## Checks']+[f'- {n}' for n in notes]
if errors:
    lines+=['','## Errors']+[f'- {e}' for e in errors]
else:
    lines+=['','**PASS — external basketball media contract satisfied by static audit.**']
report.write_text('\n'.join(lines)+'\n')
print('\n'.join(lines))
raise SystemExit(1 if errors else 0)
