type VercelRequest = {
  headers: Record<string, string | string[] | undefined>;
};
type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
};

export default function handler(req: VercelRequest, res: VercelResponse): void {
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).json({
    country: String(req.headers['x-vercel-ip-country'] || '').toUpperCase(),
  });
}
