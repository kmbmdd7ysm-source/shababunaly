type PdfSection = { heading?: string; rows?: Array<string | string[]> };
type TextPdfInput = { title?: string; subtitle?: string; sections?: PdfSection[] };
type DesignLike = { [key: string]: unknown };
type StudioLike = { layers?: Array<Record<string, unknown>>; showSafeArea?: boolean; showBleedArea?: boolean; [key: string]: unknown };

const encoder = new TextEncoder();
export const escapePdf = (value: unknown): string =>
  String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
export const object = (id: number, body: string): string => `${id} 0 obj\n${body}\nendobj\n`;
export const clamp = (value: unknown, min: number, max: number): number => Math.min(max, Math.max(min, Number(value) || 0));

export function hexRgb(value: unknown, fallback = '#000000'): number[] {
  const hex = /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;
  return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
}
export const rgb = (value: unknown, fallback?: string): string =>
  hexRgb(value, fallback)
    .map((part: number) => part.toFixed(4))
    .join(' ');
export const text = (value: unknown, x: number, y: number, size = 10, font = 'F1', color = '0 0 0'): string =>
  `BT ${color} rg /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdf(value)}) Tj ET`;
export const line = (x1: number, y1: number, x2: number, y2: number, color = '0 0 0', width = 1): string =>
  `${color} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`;
export const rect = (x: number, y: number, w: number, h: number, color: string, stroke: string | null = null, radius = 0): string => {
  if (radius <= 0)
    return `${color} rg ${x} ${y} ${w} ${h} re f${stroke ? ` ${stroke} RG 1 w ${x} ${y} ${w} ${h} re S` : ''}`;
  const k = 0.55228475;
  const r = Math.min(radius, w / 2, h / 2);
  const c = r * k;
  return `${color} rg ${x + r} ${y} m ${x + w - r} ${y} l ${x + w - r + c} ${y} ${x + w} ${y + r - c} ${x + w} ${y + r} c ${x + w} ${y + h - r} l ${x + w} ${y + h - r + c} ${x + w - r + c} ${y + h} ${x + w - r} ${y + h} c ${x + r} ${y + h} l ${x + r - c} ${y + h} ${x} ${y + h - r + c} ${x} ${y + h - r} c ${x} ${y + r} l ${x} ${y + r - c} ${x + r - c} ${y} ${x + r} ${y} c f`;
};

export function makePdf(pages: string[], metadata: Record<string, unknown> = {}): Blob {
  const objects: string[] = [];
  const pageIds: number[] = [];
  const contentIds: number[] = [];
  let nextId = 6;
  for (let index = 0; index < pages.length; index += 1) {
    pageIds.push(nextId++);
    contentIds.push(nextId++);
  }
  objects.push(object(1, '<< /Type /Catalog /Pages 2 0 R >>'));
  objects.push(
    object(
      2,
      `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id: number) => `${id} 0 R`).join(' ')}] >>`,
    ),
  );
  objects.push(object(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'));
  objects.push(object(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'));
  objects.push(
    object(
      5,
      `<< /Title (${escapePdf(metadata.title || 'SHABABUNA')}) /Author (SHABABUNA) /Subject (${escapePdf(metadata.subject || 'Production document')}) /Creator (SHABABUNA Production System) >>`,
    ),
  );
  pages.forEach((content: string, index: number) => {
    objects.push(
      object(
        (pageIds[index] as number),
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${(contentIds[index] as number)} 0 R >>`,
      ),
    );
    objects.push(
      object(
        (contentIds[index] as number),
        `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`,
      ),
    );
  });
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const entry of objects) {
    offsets.push(encoder.encode(pdf).length);
    pdf += entry;
  }
  const xref = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1)
    pdf += `${String((offsets[index] ?? 0)).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

export function createTextPdf({ title = 'SHABABUNA', subtitle = '', sections = [] }: TextPdfInput = {}): Blob {
  const pages: string[] = [];
  let commands = [text(title, 48, 790, 22, 'F2')];
  let y = 758;
  if (subtitle) {
    commands.push(text(subtitle, 48, y, 12));
    y -= 28;
  }
  for (const section of sections as PdfSection[]) {
    if (y < 100) {
      pages.push(commands.join('\n'));
      commands = [];
      y = 790;
    }
    commands.push(text(section.heading || '', 48, y, 15, 'F2'));
    y -= 22;
    for (const row of (section.rows || []) as Array<string | string[]>) {
      if (y < 55) {
        pages.push(commands.join('\n'));
        commands = [];
        y = 790;
      }
      commands.push(text(Array.isArray(row) ? `${row[0]}: ${row[1]}` : row, 48, y, 10.5));
      y -= 15;
    }
    y -= 10;
  }
  pages.push(commands.join('\n'));
  return makePdf(pages, { title, subject: subtitle });
}

export function coverPage({
  title,
  subtitle,
  design,
  productLabel,
  reference,
}: {
  title: string;
  subtitle: string;
  design: DesignLike;
  productLabel: string;
  reference: string;
}): string {
  const primary = rgb(design.primary, '#050505');
  const secondary = rgb(design.secondary, '#ffffff');
  const accent = rgb(design.accent, '#d6d6d6');
  const rows = [
    ['Reference', reference],
    ['Product', productLabel],
    ['Version', design.variant || 'home'],
    ['Quantity', design.quantity || '-'],
    ['Pattern', design.pattern || '-'],
    ['Neckline', design.neckline || '-'],
    ['Number font', design.font || '-'],
    ['Timeline', 'Confirmed in the approved quote'],
  ];
  const out = [
    rect(0, 0, 595, 842, '1 1 1'),
    rect(0, 680, 595, 162, '0.02 0.02 0.02'),
    text('SHABABUNA', 42, 785, 30, 'F2', '1 1 1'),
    text('BUILT DIFFERENT', 43, 755, 12, 'F2', '.82 .82 .82'),
    text(title, 42, 712, 18, 'F2', '1 1 1'),
    text(subtitle, 42, 660, 11, 'F1', '.2 .2 .2'),
  ];
  out.push(text('APPROVED COLOR SYSTEM', 42, 616, 11, 'F2'));
  (
    [
      [primary, String(design.primary || '#050505'), 42],
      [secondary, String(design.secondary || '#ffffff'), 188],
      [accent, String(design.accent || '#d6d6d6'), 334],
    ] as Array<[string, string, number]>
  ).forEach(([color, label, x]) => {
    out.push(rect(x, 555, 112, 44, color, '.55 .55 .55', 5));
    out.push(text(label, x, 536, 9, 'F2'));
  });
  let y = 488;
  out.push(text('PROJECT SPECIFICATION', 42, y, 13, 'F2'));
  y -= 28;
  (rows as Array<[string, string]>).forEach(([label, value]) => {
    out.push(text(label, 42, y, 9, 'F2', '.3 .3 .3'));
    out.push(text(value, 180, y, 10, 'F1'));
    out.push(line(42, y - 8, 550, y - 8, '.86 .86 .86', 0.5));
    y -= 29;
  });
  out.push(rect(42, 58, 508, 55, '.95 .95 .93', null, 6));
  out.push(
    text(
      'Manufacturing is authorized only after proof approval and the required payment.',
      56,
      87,
      10,
      'F2',
    ),
  );
  out.push(
    text('Any change after approval requires a new version and written approval.', 56, 70, 9),
  );
  return out.join('\n');
}

export function artworkPage({
  design,
  studio,
  view,
  productLabel,
}: {
  design: DesignLike;
  studio: StudioLike;
  view: string;
  productLabel: string;
}): string {
  const out = [
    rect(0, 0, 595, 842, '1 1 1'),
    text(`${productLabel} - ${view.toUpperCase()} VIEW`, 36, 805, 17, 'F2'),
    text('Safe area: green dashed frame | Bleed area: red frame', 36, 784, 9, 'F1', '.35 .35 .35'),
    rect(36, 95, 523, 665, '.055 .055 .055', '.15 .15 .15', 8),
  ];
  const primary = rgb(design.primary, '#050505');
  const secondary = rgb(design.secondary, '#ffffff');
  // A production silhouette that remains readable in print. The vector SVG package contains the exact editable artwork.
  out.push(rect(167, 245, 262, 390, primary, secondary, 16));
  out.push(`${secondary} RG 7 w 167 245 262 390 re S`);
  out.push(line(78, 142, 517, 142, '0 .7 .35', 1));
  out.push(line(78, 710, 517, 710, '0 .7 .35', 1));
  out.push(`${'0 .7 .35'} RG 1 w [5 4] 0 d 78 142 439 568 re S [] 0 d`);
  out.push(`${'.85 .2 .2'} RG 1 w [4 4] 0 d 55 118 485 616 re S [] 0 d`);
  const layers = (studio?.layers || [])
    .filter((layer: Record<string, unknown>) => layer.view === view && layer.visible)
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) => Number(a.zIndex) - Number(b.zIndex));
  for (const layer of layers) {
    const x = 55 + (clamp(layer.x, 0, 100) / 100) * 485;
    const y = 118 + ((100 - clamp(layer.y, 0, 100)) / 100) * 616;
    if (layer.type === 'logo') {
      out.push(rect(x - 25, y - 18, 50, 36, '.9 .9 .9', '.25 .25 .25', 3));
      out.push(text('ART', x - 12, y - 3, 8, 'F2', '.15 .15 .15'));
    } else
      out.push(
        text(
          String(layer.content || '').slice(0, 30),
          x - Math.min(45, String(layer.content || '').length * 2.2),
          y,
          Math.max(8, Math.min(28, Number(layer.width || 20) * 0.55)),
          'F2',
          rgb(layer.color, '#ffffff'),
        ),
      );
  }
  out.push(
    text(
      'Editable vector artwork: artwork/' + view + '.svg in the production ZIP.',
      36,
      52,
      9,
      'F2',
    ),
  );
  return out.join('\n');
}

export function tablePages({
  heading,
  rows,
  columns = [150, 370],
  startY = 780,
}: {
  heading: string;
  rows: Array<string[]>;
  columns?: number[];
  startY?: number;
}): string[] {
  const pages: string[] = [];
  let out = [text(heading, 38, 810, 17, 'F2')];
  let y = startY;
  for (const row of rows) {
    if (y < 55) {
      pages.push(out.join('\n'));
      out = [text(heading + ' (continued)', 38, 810, 17, 'F2')];
      y = 780;
    }
    out.push(text(row[0], 38, y, 8.5, 'F2', '.25 .25 .25'));
    out.push(text(row[1], Number(columns[0] || 150), y, 8.5));
    if (row[2] != null) out.push(text(row[2], Number(columns[1] || 370), y, 8.5));
    out.push(line(38, y - 7, 557, y - 7, '.88 .88 .88', 0.4));
    y -= 22;
  }
  pages.push(out.join('\n'));
  return pages;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadDesignDocuments({
  design,
  studio,
  productLabel = 'Custom Product',
  reference = 'DRAFT',
  roster = [],
}: {
  design?: DesignLike;
  studio?: StudioLike;
  productLabel?: string;
  reference?: string;
  roster?: unknown[];
} = {}): { proof?: Blob; tech?: Blob; [key: string]: unknown } {
  const designDoc: DesignLike = design || {};
  const studioDoc: StudioLike = studio || { layers: [] };
  const normalizedStudio = studioDoc;
  const safeRoster = Array.isArray(roster) ? roster : [];
  const proofPages = [
    coverPage({
      title: 'DESIGN PROOF',
      subtitle: 'Customer visual review and approval document',
      design: designDoc,
      productLabel,
      reference,
    }),
  ];
  for (const view of ['front', 'back', 'side'])
    proofPages.push(artworkPage({ design: designDoc, studio: normalizedStudio, view, productLabel }));
  const rosterRows = safeRoster.length
    ? safeRoster.map((row, index) => {
        const r = row as Record<string, unknown>;
        return [
          `${index + 1}. ${String(r.jerseyName || r.name || '')}`,
          `#${String(r.number || '')} | Jersey ${String(r.jerseySize || '-')} | Shorts ${String(r.shortsSize || '-')}`,
        ];
      })
    : [['Roster', 'No roster attached']];
  proofPages.push(...tablePages({ heading: 'ROSTER AND PERSONALIZATION', rows: rosterRows }));
  proofPages.push(
    ...tablePages({
      heading: 'APPROVAL RECORD',
      rows: [
        ['Customer decision', 'APPROVE / REQUEST CHANGES'],
        ['Approval name', ''],
        ['Approval date', ''],
        ['Commercial quote', 'Must be approved separately'],
        ['Production status', 'Not authorized until approval and deposit'],
      ],
    }),
  );

  const layerRows = (normalizedStudio.layers || [])
    .filter((layer: Record<string, unknown>) => layer.visible)
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) => String(a.view).localeCompare(String(b.view)) || Number(a.zIndex) - Number(b.zIndex))
    .map((layer) => [
      String(layer.view || '').toUpperCase(),
      `${layer.label}: ${String(layer.content || '').startsWith('data:') ? '[embedded artwork]' : String(layer.content || '').slice(0, 55)}`,
      `X ${layer.x}% Y ${layer.y}% W ${layer.width}% R ${layer.rotation}deg Z ${layer.zIndex}`,
    ]);
  const techPages = [
    coverPage({
      title: 'PRODUCTION TECH PACK',
      subtitle: 'Manufacturing specification and artwork-control document',
      design: designDoc,
      productLabel,
      reference,
    }),
  ];
  techPages.push(
    ...tablePages({
      heading: 'LAYER AND PLACEMENT SPECIFICATION',
      rows: layerRows.length ? layerRows : [['-', 'No visible layers', '-']],
      columns: [92, 350],
    }),
  );
  techPages.push(
    ...tablePages({
      heading: 'MANUFACTURING CONTROL',
      rows: [
        ['Safe area', '8% inside artwork boundary'],
        ['Bleed area', '3% outside final trim'],
        ['Primary color', String(designDoc.primary || '-')],
        ['Secondary color', String(designDoc.secondary || '-')],
        ['Accent color', String(designDoc.accent || '-')],
        ['Pattern', String(designDoc.pattern || '-')],
        ['Neckline', String(designDoc.neckline || '-')],
        ['Font system', String(designDoc.font || '-')],
        ['Production notes', String(designDoc.notes || 'No production notes supplied')],
        ['Artwork package', 'SVG views + manifest JSON + roster CSV supplied separately'],
      ],
    }),
  );
  techPages.push(...tablePages({ heading: 'ROSTER SPECIFICATION', rows: rosterRows }));
  return {
    proof: makePdf(proofPages, {
      title: `SHABABUNA Design Proof ${reference}`,
      subject: productLabel,
    }),
    tech: makePdf(techPages, { title: `SHABABUNA Tech Pack ${reference}`, subject: productLabel }),
  };
}
