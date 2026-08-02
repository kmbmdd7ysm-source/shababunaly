import { afterEach, describe, expect, it, vi } from './test-api.js';
import { applyApiHeaders, guardPublicPost, guardPublicRequest, verifyBearerSecret } from '../api/_request-security.js';
import { getSupabaseAdminConfig, resolveSupabaseUser, supabaseAdminRequest, supabaseUserRequest } from '../api/_supabase-admin.js';
import { verifyTurnstileToken } from '../api/_turnstile.js';
import { configuredPaymentMethods, getPaymentAdapter } from '../api/payments/registry.js';

const ENV = ['NODE_ENV','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','EDGE_RATE_LIMIT_SALT','CRON_SECRET','TURNSTILE_SECRET_KEY','TURNSTILE_TEST_MODE','PAYMENTS_SESSION_URL','PAYMENTS_SECRET_KEY','LIBYAN_BANK_CARD_SESSION_URL','LIBYAN_BANK_CARD_SECRET_KEY'];
afterEach(() => { vi.restoreAllMocks(); for (const key of ENV) delete process.env[key]; });

function res() { return { statusCode: 0, body: null, headers: {}, ended: false, setHeader(k,v){this.headers[k]=v;}, status(c){this.statusCode=c;return this;}, json(b){this.body=b;return this;}, end(){this.ended=true;return this;} }; }
function req(body = {}, headers = {}, socket = {}) { return { body, headers: { origin:'http://localhost:5173','user-agent':'test-agent','x-forwarded-for':'127.0.0.1',...headers }, socket: { remoteAddress:'127.0.0.2',...socket } }; }

describe('request security helpers exhaustive', { concurrency: false }, () => {
  it('sets every API hardening header', () => {
    const response = res(); applyApiHeaders(response);
    expect(response.headers).toMatchObject({'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'});
    expect(response.headers['Permissions-Policy']).toContain('camera=()');
  });

  it('rejects bad origins, oversized requests and quietly consumes honeypots', async () => {
    process.env.NODE_ENV='test';
    const origin=res(); expect(await guardPublicRequest(req({}, {origin:'https://evil.example'}), origin)).toBe(false); expect(origin.statusCode).toBe(403);
    const size=res(); expect(await guardPublicRequest(req({}, {'content-length':'99'}), size, {maxBytes:10})).toBe(false); expect(size.statusCode).toBe(413);
    const honeypot=res(); expect(await guardPublicPost(req({website:'bot'}), honeypot)).toBe(false); expect(honeypot.statusCode).toBe(200);
    const malformed=res(); expect(await guardPublicPost(req('text'), malformed, {honeypot:false,bucket:'malformed'})).toBe(true);
  });

  it('uses durable limits for allow and deny decisions', async () => {
    process.env.NODE_ENV='production'; process.env.SUPABASE_URL='https://db.example'; process.env.SUPABASE_SERVICE_ROLE_KEY='service'; process.env.EDGE_RATE_LIMIT_SALT='r'.repeat(64);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>true}));
    const allowed=res(); expect(await guardPublicRequest(req(), allowed, {bucket:'durable-allow'})).toBe(true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>false}));
    const denied=res(); expect(await guardPublicRequest(req(), denied, {bucket:'durable-deny',windowMs:1001})).toBe(false); expect(denied.statusCode).toBe(429); expect(denied.headers['Retry-After']).toBe('2');
  });

  it('fails closed in production when durable protection is unavailable', async () => {
    process.env.NODE_ENV='production';
    const absent=res(); expect(await guardPublicRequest(req(), absent, {bucket:'prod-absent'})).toBe(false); expect(absent.statusCode).toBe(503);
    process.env.SUPABASE_URL='https://db.example'; process.env.SUPABASE_SERVICE_ROLE_KEY='service'; process.env.EDGE_RATE_LIMIT_SALT='r'.repeat(64);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:false,status:500,json:async()=>false}));
    const failed=res(); expect(await guardPublicRequest(req(), failed, {bucket:'prod-failed'})).toBe(false); expect(failed.statusCode).toBe(503);
  });

  it('uses and exhausts the development fallback bucket', async () => {
    process.env.NODE_ENV='test';
    const first=res(); const second=res();
    expect(await guardPublicRequest(req(), first, {bucket:'dev-once',limit:1,windowMs:60000})).toBe(true);
    expect(await guardPublicRequest(req(), second, {bucket:'dev-once',limit:1,windowMs:60000})).toBe(false);
    expect(second.statusCode).toBe(429); expect(Number(second.headers['Retry-After'])).toBeGreaterThan(0);
  });

  it('compares bearer credentials in constant-time-compatible form', () => {
    expect(verifyBearerSecret('Bearer top-secret','top-secret')).toBe(true);
    expect(verifyBearerSecret('bearer wrong','top-secret')).toBe(false);
    expect(verifyBearerSecret('x','')).toBe(false);
    expect(verifyBearerSecret('much-longer','short')).toBe(false);
  });
});

describe('Supabase REST helpers exhaustive', { concurrency: false }, () => {
  it('validates admin configuration', () => {
    expect(() => getSupabaseAdminConfig()).toThrow('supabase_not_configured');
    process.env.SUPABASE_URL='https://db.example/'; process.env.SUPABASE_SERVICE_ROLE_KEY=' role ';
    expect(getSupabaseAdminConfig()).toEqual({base:'https://db.example',serviceKey:'role'});
  });

  it('handles JSON, text, empty, binary and upstream errors for admin requests', async () => {
    process.env.SUPABASE_URL='https://db.example'; process.env.SUPABASE_SERVICE_ROLE_KEY='role';
    const responses = [
      {ok:true,status:200,text:async()=>'{"ok":true}'},
      {ok:true,status:200,text:async()=>'plain'},
      {ok:true,status:204,text:async()=>''},
      {ok:true,status:200,text:async()=>'{}'},
      {ok:false,status:422,text:async()=>'bad request'},
    ];
    const calls=[]; vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url, options)=>{calls.push([url,options]);return responses.shift();}));
    expect(await supabaseAdminRequest('/json',{method:'POST',body:'{}'})).toEqual({ok:true});
    expect(await supabaseAdminRequest('/text')).toBe('plain');
    expect(await supabaseAdminRequest('/empty')).toBe(null);
    expect(await supabaseAdminRequest('/binary',{method:'POST',body:new Uint8Array([1]),headers:{'X-Test':'yes'}})).toEqual({});
    expect(calls[0][1].headers['Content-Type']).toBe('application/json');
    expect(calls[3][1].headers['Content-Type']).toBe(undefined); expect(calls[3][1].headers['X-Test']).toBe('yes');
    let error; try { await supabaseAdminRequest('/error'); } catch (caught) { error=caught; }
    expect(error.status).toBe(422); expect(error.message).toContain('bad request');
  });

  it('resolves valid users and safely handles missing, denied, invalid and failed auth', async () => {
    expect(await resolveSupabaseUser('')).toBe(null);
    process.env.SUPABASE_URL='https://db.example'; process.env.SUPABASE_SERVICE_ROLE_KEY='role';
    const responses=[
      {status:401,ok:false,json:async()=>({})},
      {status:403,ok:false,json:async()=>({})},
      {status:500,ok:false,json:async()=>({})},
      {status:200,ok:true,json:async()=>({email:'no-id'})},
      {status:200,ok:true,json:async()=>({id:'user-1'})},
    ];
    vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>responses.shift()));
    expect(await resolveSupabaseUser('Bearer a')).toBe(null);
    expect(await resolveSupabaseUser('Bearer b')).toBe(null);
    await expect(async()=>resolveSupabaseUser('Bearer c')).not.toBe(undefined);
    let failed=false; try{await resolveSupabaseUser('Bearer c');}catch(e){failed=String(e.message).includes('supabase_auth:500');} expect(failed).toBe(true);
    expect(await resolveSupabaseUser('Bearer d')).toBe(null);
    expect(await resolveSupabaseUser('Bearer e')).toEqual({id:'user-1'});
  });

  it('performs user-scoped requests with all response forms', async () => {
    let authError; try { await supabaseUserRequest('/x',''); } catch (error) { authError=error; }
    expect(authError.status).toBe(401);
    process.env.SUPABASE_URL='https://db.example'; process.env.SUPABASE_SERVICE_ROLE_KEY='role';
    const responses=[
      {ok:true,status:200,text:async()=>'{"id":1}'},
      {ok:true,status:200,text:async()=>'text'},
      {ok:true,status:204,text:async()=>''},
      {ok:true,status:200,text:async()=>'{}'},
      {ok:false,status:409,text:async()=>'conflict'},
    ];
    const calls=[];vi.stubGlobal('fetch',vi.fn().mockImplementation(async(url,options)=>{calls.push([url,options]);return responses.shift();}));
    expect(await supabaseUserRequest('/json','Bearer user',{method:'POST',body:'{}'})).toEqual({id:1});
    expect(await supabaseUserRequest('/text','user')).toBe('text');
    expect(await supabaseUserRequest('/empty','user')).toBe(null);
    expect(await supabaseUserRequest('/binary','user',{body:new Uint8Array([1]),headers:{'X-Test':'ok'}})).toEqual({});
    expect(calls[0][1].headers.Authorization).toBe('Bearer user'); expect(calls[3][1].headers['Content-Type']).toBe(undefined);
    let error;try{await supabaseUserRequest('/error','user');}catch(caught){error=caught;}expect(error.status).toBe(409);expect(error.message).toContain('conflict');
  });
});

describe('Turnstile and payment registry exhaustive', { concurrency: false }, () => {
  it('covers test mode, missing configuration and all remote responses', async () => {
    process.env.NODE_ENV='test'; process.env.TURNSTILE_TEST_MODE='true';
    expect(await verifyTurnstileToken('test-pass')).toBe(true);
    expect(await verifyTurnstileToken('other')).toBe(false);
    process.env.TURNSTILE_SECRET_KEY='secret';
    const remote=[{ok:false},{ok:true,json:async()=>({success:true})},{ok:true,json:async()=>({success:false})},new Error('offline')]; vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>{const next=remote.shift(); if(next instanceof Error) throw next; return next;}));
    expect(await verifyTurnstileToken('one','1.2.3.4')).toBe(false);
    expect(await verifyTurnstileToken('two')).toBe(true);
    expect(await verifyTurnstileToken('three')).toBe(false);
    expect(await verifyTurnstileToken('four')).toBe(false);
  });

  it('normalizes adapter IDs and reports only configured methods', () => {
    expect(getPaymentAdapter(' ONLINE_CARD ')?.id).toBe('online_card');
    expect(getPaymentAdapter('missing')).toBe(null); expect(getPaymentAdapter(null)).toBe(null);
    expect(configuredPaymentMethods()).toEqual([]);
    process.env.PAYMENTS_SESSION_URL='https://pay.example'; process.env.PAYMENTS_SECRET_KEY='secret';
    process.env.LIBYAN_BANK_CARD_SESSION_URL='https://bank.example'; process.env.LIBYAN_BANK_CARD_SECRET_KEY='secret';
    expect(configuredPaymentMethods()).toEqual(['online_card','libyan_bank_card']);
  });
});
