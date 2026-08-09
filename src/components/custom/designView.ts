export type DesignView = Record<string, unknown> & {
  primary: string;
  secondary: string;
  accent: string;
  pattern?: string;
  neckline?: string;
  font?: string;
  teamName?: string;
  playerName?: string;
  number?: string;
  sponsorName?: string;
  logoPreview?: string;
  variant?: string;
  productType?: string;
};

export function asDesign(input: unknown): DesignView {
  const d = (input || {}) as Record<string, unknown>;
  const next: DesignView = {
    ...d,
    primary: String(d.primary || '#050505'),
    secondary: String(d.secondary || '#ffffff'),
    accent: String(d.accent || '#d6d6d6'),
  };
  if (d.pattern != null) next.pattern = String(d.pattern);
  if (d.neckline != null) next.neckline = String(d.neckline);
  if (d.font != null) next.font = String(d.font);
  if (d.teamName != null) next.teamName = String(d.teamName);
  if (d.playerName != null) next.playerName = String(d.playerName);
  if (d.number != null) next.number = String(d.number);
  if (d.sponsorName != null) next.sponsorName = String(d.sponsorName);
  if (d.logoPreview != null) next.logoPreview = String(d.logoPreview);
  if (d.variant != null) next.variant = String(d.variant);
  if (d.productType != null) next.productType = String(d.productType);
  return next;
}
