type ApiReq = { method?: string };
type ApiRes = { setHeader:(n:string,v:string)=>void; status:(c:number)=>{json:(b:unknown)=>unknown} };

function decodePayload(token: string) {
  const part = token.split('.')[1];
  if (!part) return null;
  try { return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>; }
  catch { return null; }
}

export default function handler(req: ApiReq, res: ApiRes) {
  res.setHeader('Cache-Control','no-store, private');
  if (req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({ok:false}); }
  const token = String(process.env.VERCEL_OIDC_TOKEN || '').trim();
  const payload = token ? decodePayload(token) : null;
  return res.status(200).json({
    configured: Boolean(token && payload),
    issuer: payload?.iss ?? null,
    audience: payload?.aud ?? null,
    subject: payload?.sub ?? null,
    environment: process.env.VERCEL_ENV || null,
    project: process.env.VERCEL_PROJECT_PRODUCTION_URL || null,
  });
}
