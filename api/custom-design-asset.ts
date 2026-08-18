import { applyApiHeaders, guardPublicPost } from './_request-security.ts';
import { validateEncodedFiles } from './_file-security.ts';
import { resolveSupabaseUser, supabaseAdminRequest } from './_supabase-admin.ts';
import { verifyFormTurnstileToken } from './_turnstile.ts';

type ApiReq = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};
type ApiRes = { setHeader:(n:string,v:string)=>void; status:(c:number)=>{json:(b:unknown)=>unknown} };
type EncodedFile = {
  name:string; sha256:string; detectedMime:string; declaredMime?:string; extension:string;
  byteSize:number; buffer:Uint8Array|Buffer; role?:string;
};
const clean=(value:unknown,max=1000)=>String(value??'').trim().replace(/\0/g,'').slice(0,max);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function malwareScannerConfigured(): boolean {
  const endpoint=clean(process.env.MALWARE_SCAN_API_URL,1500);
  const token=clean(process.env.MALWARE_SCAN_API_KEY,5000);
  const test=process.env.NODE_ENV!=='production' && process.env.MALWARE_SCAN_TEST_MODE==='true';
  if(test) return true;
  try { return new URL(endpoint).protocol==='https:' && token.length>=16; } catch { return false; }
}

async function uploadAsset(idempotencyKey:string,file:EncodedFile,userId:string|null) {
  const path=`custom-design/${idempotencyKey}/${file.sha256.slice(0,24)}-${file.name}`;
  try {
    await supabaseAdminRequest(`/storage/v1/object/media-quarantine/${encodeURIComponent(path).replace(/%2F/g,'/')}`,{
      method:'POST', headers:{'Content-Type':file.detectedMime,'x-upsert':'false'}, body:new Uint8Array(file.buffer),
    });
  } catch(error:unknown) {
    const status=error&&typeof error==='object'&&'status' in error?Number((error as {status?:unknown}).status):0;
    if(status!==409) throw error;
  }
  const inserted=await supabaseAdminRequest('/rest/v1/media_assets?on_conflict=storage_path&select=id,original_name,scan_status,storage_path,owner_user_id,entity_type,entity_id',{
    method:'POST',
    headers:{Prefer:'resolution=ignore-duplicates,return=representation'},
    body:JSON.stringify({
      owner_user_id:userId,
      entity_type:'custom_design_logo',
      entity_id:idempotencyKey,
      bucket:'media-quarantine',
      storage_path:path,
      original_name:file.name,
      mime_type:file.detectedMime,
      byte_size:file.byteSize,
      sha256:file.sha256,
      scan_status:'quarantined',
      visibility:'private',
      metadata:{role:'team_logo',source:'customize'},
    }),
  });
  const row=Array.isArray(inserted)?inserted[0]:inserted;
  if(row?.id) return row;
  const existing=await supabaseAdminRequest(`/rest/v1/media_assets?select=id,original_name,scan_status,storage_path,owner_user_id,entity_type,entity_id&storage_path=eq.${encodeURIComponent(path)}&limit=1`);
  return Array.isArray(existing)?existing[0]:existing;
}

export default async function handler(req:ApiReq,res:ApiRes) {
  applyApiHeaders(res);
  res.setHeader('Cache-Control','no-store, private');
  if(req.method!=='POST') { res.setHeader('Allow','POST'); return res.status(405).json({ok:false,error:'method_not_allowed'}); }
  if(!(await guardPublicPost(req,res,{maxBytes:3_100_000,limit:5,windowMs:10*60_000,bucket:'custom-design-asset',allowEphemeralFallback:true}))) return;
  try {
    const body=(req.body&&typeof req.body==='object'?req.body:{}) as Record<string,unknown>;
    const key=clean(body.idempotencyKey,36);
    if(!UUID.test(key)) return res.status(400).json({ok:false,error:'invalid_idempotency_key'});
    const remoteIp=String((Array.isArray(req.headers?.['x-forwarded-for'])?req.headers?.['x-forwarded-for'][0]:req.headers?.['x-forwarded-for'])||req.socket?.remoteAddress||'');
    if(!(await verifyFormTurnstileToken(body.turnstileToken,remoteIp))) return res.status(400).json({ok:false,error:'captcha_failed'});
    const files=validateEncodedFiles(body.files) as EncodedFile[];
    const [file]=files;
    if(files.length!==1 || !file) return res.status(400).json({ok:false,error:'one_logo_required'});
    if(!file.detectedMime.startsWith('image/')) return res.status(400).json({ok:false,error:'logo_must_be_image'});
    if(process.env.NODE_ENV==='production' && !malwareScannerConfigured())
      return res.status(503).json({ok:false,error:'secure_file_scanning_unavailable'});
    const authHeader=req.headers?.authorization;
    const user=await resolveSupabaseUser(Array.isArray(authHeader)?authHeader[0]:authHeader);
    const asset=await uploadAsset(key,file,user?.id?String(user.id):null);
    if(!asset?.id) throw new Error('asset_create_failed');
    return res.status(201).json({ok:true,asset});
  } catch(error:unknown) {
    const code=clean(error&&typeof error==='object'&&'message' in error?(error as {message?:unknown}).message:error,160);
    const client=new Set(['too_many_files','unsupported_file_type','invalid_file_encoding','invalid_file_size','files_too_large','executable_file_rejected','file_signature_mismatch','file_mime_mismatch','one_logo_required','logo_must_be_image']);
    return res.status(client.has(code)?400:503).json({ok:false,error:client.has(code)?code:'custom_logo_upload_unavailable'});
  }
}

export const customDesignAssetInternals=Object.freeze({malwareScannerConfigured,uploadAsset});
