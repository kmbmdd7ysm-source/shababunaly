declare const Dossier: import('react').ComponentType<{
  meta?: string;
  lede?: string | null;
  aside?: string;
  chapters?: Array<{ id?: string; title?: string; body?: import('react').ReactNode }>;
}>;
export default Dossier;
