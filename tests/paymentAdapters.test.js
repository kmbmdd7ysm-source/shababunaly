import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from './test-api.js';
import { createHttpAdapter, normalizeProviderEvent, verifyHmacSha256 } from '../api/payments/adapters/base.js';
const statusMap={'payment.succeeded':{kind:'payment',status:'succeeded'},'refund.succeeded':{kind:'refund',status:'refunded'}};
const envKeys=['TEST_PROVIDER','TEST_SESSION','TEST_RETRIEVE','TEST_REFUND','TEST_SECRET','TEST_WEBHOOK','TEST_HEADER','TEST_UNIT'];
afterEach(()=>{vi.restoreAllMocks();for(const key of envKeys)delete process.env[key];});
function adapter(){return createHttpAdapter({id:'test_card',providerEnv:'TEST_PROVIDER',endpointEnv:'TEST_SESSION',retrieveEnv:'TEST_RETRIEVE',refundEnv:'TEST_REFUND',secretEnv:'TEST_SECRET',webhookSecretEnv:'TEST_WEBHOOK',signatureHeaderEnv:'TEST_HEADER',amountUnitEnv:'TEST_UNIT',statusMap});}
function configure(){process.env.TEST_PROVIDER='Test Pay';process.env.TEST_SESSION='https://pay.example/session';process.env.TEST_RETRIEVE='https://pay.example/payment/{transactionId}';process.env.TEST_REFUND='https://pay.example/refund';process.env.TEST_SECRET='secret';process.env.TEST_WEBHOOK='hook';process.env.TEST_HEADER='x-test-signature';}
describe('payment adapters',{concurrency:false},()=>{
 it('verifies hex and base64 HMAC safely',()=>{const raw=Buffer.from('{"id":"evt-1"}'),secret='test-secret';const hex=crypto.createHmac('sha256',secret).update(raw).digest('hex');const b64=crypto.createHmac('sha256',secret).update(raw).digest('base64');expect(verifyHmacSha256(raw,secret,hex)).toBe(true);expect(verifyHmacSha256(raw,secret,`sha256=${b64}`)).toBe(true);expect(verifyHmacSha256(raw,secret,`${hex}00`)).toBe(false);expect(verifyHmacSha256(raw,'','x')).toBe(false);});
 it('normalizes payment and refund events in minor and major units',()=>{const event=normalizeProviderEvent({id:'evt-1',status:'payment.succeeded',amount:2500,currency:'USD',orderNumber:'SHB-1'},'online_card','minor',statusMap);expect(event).toMatchObject({eventId:'evt-1',eventStatus:'succeeded',amount:25,provider:'online_card',entityType:'order'});const refund=normalizeProviderEvent({id:'r1',status:'refund.succeeded',data:{object:{amount_refunded:25,currency:'usd',metadata:{entityType:'quote',quoteNumber:'qt-1'}}}},'online_card','major',statusMap);expect(refund).toMatchObject({kind:'refund',amount:25,entityType:'quote',quoteNumber:'QT-1'});expect(()=>normalizeProviderEvent({status:'looks_paid'},'online_card','minor',statusMap)).toThrow('unsupported_provider_event');expect(()=>normalizeProviderEvent({status:'payment.succeeded',amount:'x'},'online_card','minor',statusMap)).toThrow('invalid_provider_amount');});
 it('reports capabilities and creates a hosted session',async()=>{configure();const a=adapter();expect(a.configured()).toBe(true);expect(a.capabilities()).toEqual({checkout:true,retrieve:true,refund:true,webhook:true});const fetchMock=vi.fn().mockResolvedValue({ok:true,status:200,text:async()=>JSON.stringify({url:'https://pay.example/checkout',id:'session-1'})});vi.stubGlobal('fetch',fetchMock);const result=await a.createSession({trustedOrder:{id:'o1'},idempotencyKey:'key-1',successUrl:'https://site/success',cancelUrl:'https://site/cancel'});expect(result).toEqual({url:'https://pay.example/checkout',providerSessionId:'session-1'});expect(fetchMock.mock.calls[0][1].headers['Idempotency-Key']).toBe('key-1');});
 it('retrieves a payment and creates a refund',async()=>{configure();const a=adapter();vi.stubGlobal('fetch',vi.fn().mockImplementation(async(url)=>({ok:true,status:200,text:async()=>JSON.stringify(String(url).includes('/refund')?{id:'ref-1',status:'pending'}:{id:'tx-1',status:'succeeded',amount:100,currency:'USD'})})));const payment=await a.retrievePayment({transactionId:'tx-1',providerSessionId:'',orderNumber:'',quoteNumber:''});expect(payment).toMatchObject({id:'tx-1',status:'succeeded',currency:'USD'});const refund=await a.refund({transactionId:'tx-1',amount:10,idempotencyKey:'refund-1',reason:'return'});expect(refund).toMatchObject({id:'ref-1',status:'pending',provider:'test_card'});});
 it('verifies provider-specific webhooks and maps errors',()=>{configure();const a=adapter(),raw=Buffer.from('event');const signature=crypto.createHmac('sha256','hook').update(raw).digest('hex');expect(a.verifyWebhook(raw,{'x-test-signature':signature})).toBe(true);expect(a.normalizeEvent({status:'payment.succeeded',amount:100})).toMatchObject({amount:1});expect(a.mapError(Object.assign(new Error('provider_timeout'),{status:504,providerCode:'TIMEOUT'}))).toEqual({status:504,code:'provider_timeout',providerCode:'TIMEOUT'});});
 it('rejects missing configuration, invalid redirects, provider errors and invalid refunds',async()=>{const a=adapter();expect(a.configured()).toBe(false);let error='';try{await a.createSession({trustedOrder:{},idempotencyKey:'',successUrl:'',cancelUrl:''});}catch(e){error=e.message;}expect(error).toContain('not_configured');configure();vi.stubGlobal('fetch',async()=>({ok:true,status:200,text:async()=>JSON.stringify({id:'missing-url'})}));try{await a.createSession({trustedOrder:{},idempotencyKey:'',successUrl:'',cancelUrl:''});}catch(e){error=e.message;}expect(error).toBe('provider_missing_checkout_url');vi.stubGlobal('fetch',async()=>({ok:false,status:429,text:async()=>JSON.stringify({code:'RATE'})}));try{await a.createSession({trustedOrder:{},idempotencyKey:'',successUrl:'',cancelUrl:''});}catch(e){expect(e.status).toBe(429);expect(e.providerCode).toBe('RATE');}try{await a.refund({transactionId:'',amount:0,idempotencyKey:''});}catch(e){expect(e.message).toBe('invalid_refund_request');}});
});

describe('payment adapter edge coverage', { concurrency: false }, () => {
 it('normalizes provider payload aliases and explicit minor amounts', () => {
   const fromObject = normalizeProviderEvent({ type:'payment.succeeded', data:{ object:{ amount_minor:1234, currency:'lyd', metadata:{ entity_type:'order', order_number:'shb-2' }, transactionId:'tx-2' } } }, 'card', 'major', statusMap);
   expect(fromObject).toMatchObject({ amount:12.34, currency:'LYD', orderNumber:'SHB-2', transactionId:'tx-2' });
   const fromData = normalizeProviderEvent({ data:{ status:'payment.succeeded', amountMinor:500, metadata:{ quote_number:'qt-2' }, id:'pay-2' }, eventId:'evt-2' }, 'card', 'minor', statusMap);
   expect(fromData).toMatchObject({ amount:5, quoteNumber:'QT-2', eventId:'evt-2', transactionId:'pay-2' });
   expect(() => normalizeProviderEvent({ status:'payment.succeeded', amount:-1 }, 'card', 'minor', statusMap)).toThrow('invalid_provider_amount');
 });

 it('reports partial capabilities and supports signature header fallbacks', () => {
   process.env.TEST_SESSION='https://pay.example/session'; process.env.TEST_SECRET='secret'; process.env.TEST_WEBHOOK='hook';
   const a=adapter(); expect(a.capabilities()).toEqual({checkout:true,retrieve:false,refund:false,webhook:true});
   const raw=Buffer.from('fallback'); const sig=crypto.createHmac('sha256','hook').update(raw).digest('hex');
   expect(a.verifyWebhook(raw,{'x-webhook-signature':sig})).toBe(true);
   expect(a.verifyWebhook(raw,{'x-signature':sig})).toBe(true);
   expect(a.verifyWebhook(raw,{})).toBe(false);
 });

 it('maps empty, malformed, client and server provider responses', async () => {
   configure(); const a=adapter();
   vi.stubGlobal('fetch',async()=>({ok:true,status:200,text:async()=>'{bad json'}));
   let error; try{await a.createSession({trustedOrder:{},idempotencyKey:'',successUrl:'',cancelUrl:''});}catch(e){error=e;} expect(error.message).toBe('provider_missing_checkout_url');
   vi.stubGlobal('fetch',async()=>({ok:false,status:400,text:async()=>''}));
   try{await a.createSession({trustedOrder:{},idempotencyKey:'',successUrl:'',cancelUrl:''});}catch(e){error=e;} expect(error.status).toBe(400);
   vi.stubGlobal('fetch',async()=>({ok:false,status:503,text:async()=>JSON.stringify({message:'DOWN'})}));
   try{await a.createSession({trustedOrder:{},idempotencyKey:'',successUrl:'',cancelUrl:''});}catch(e){error=e;} expect(error.status).toBe(502); expect(error.providerCode).toBe('DOWN');
   vi.stubGlobal('fetch',async()=>{const e=new Error('aborted');e.name='AbortError';throw e;});
   try{await a.createSession({trustedOrder:{},idempotencyKey:'',successUrl:'',cancelUrl:''});}catch(e){error=e;} expect(error.status).toBe(504); expect(error.message).toBe('provider_timeout');
 });

 it('requires HTTPS endpoints and provider secrets independently', async () => {
   process.env.TEST_SESSION='http://insecure.example/session'; process.env.TEST_SECRET='secret'; const a=adapter();
   let error; try{await a.createSession({trustedOrder:{},idempotencyKey:'',successUrl:'',cancelUrl:''});}catch(e){error=e;} expect(error.message).toContain('not_configured');
   process.env.TEST_SESSION='https://pay.example/session'; delete process.env.TEST_SECRET;
   try{await a.createSession({trustedOrder:{},idempotencyKey:'',successUrl:'',cancelUrl:''});}catch(e){error=e;} expect(error.message).toBe('payment_provider_not_connected');
 });

 it('supports major-unit normalization, URL template encoding and response fallbacks', async () => {
   configure(); process.env.TEST_UNIT='major'; const a=adapter();
   const fetchMock=vi.fn().mockImplementation(async(_unused,options)=>({ok:true,status:200,text:async()=>JSON.stringify(options.method==='GET'?{transactionId:'',status:'',currency:''}:{refundId:'r-fallback'})})); vi.stubGlobal('fetch',fetchMock);
   expect(a.normalizeEvent({status:'payment.succeeded',amount:12.5})).toMatchObject({amount:12.5});
   const payment=await a.retrievePayment({transactionId:'tx /? 1',providerSessionId:'',orderNumber:'',quoteNumber:''});
   expect(payment).toMatchObject({id:'tx /? 1',status:'',currency:'USD'});
   const called=fetchMock.mock.calls[0][0]; expect(String(called)).toContain('tx%20%2F%3F%201');
   const refund=await a.refund({transactionId:'tx',amount:5,currency:'lyd',idempotencyKey:'id',metadata:{order:'x'}});
   expect(refund).toMatchObject({id:'r-fallback',status:'pending'});
 });

 it('validates every refund input and maps default errors', async () => {
   configure(); const a=adapter();
   for (const request of [{transactionId:'',amount:1},{transactionId:'tx',amount:'x'},{transactionId:'tx',amount:-1}]) {
     let error; try{await a.refund({...request,idempotencyKey:''});}catch(e){error=e;} expect(error.message).toBe('invalid_refund_request');
   }
   expect(a.mapError(new Error())).toEqual({status:502,code:'payment_provider_error',providerCode:''});
 });
});

describe('payment adapter complete branches', { concurrency:false },()=>{
 it('uses configured provider fallback names and alternate response fields',async()=>{configure();delete process.env.TEST_PROVIDER;const a=adapter();vi.stubGlobal('fetch',vi.fn().mockImplementation(async(_unused,options)=>({ok:true,status:200,text:async()=>JSON.stringify(options.method==='GET'?{transactionId:'tx-alt',status:'pending',currency:'eur'}:{url:'https://pay.example/x',sessionId:'session-alt'})})));const session=await a.createSession({trustedOrder:{},idempotencyKey:'',successUrl:'',cancelUrl:''});expect(session.providerSessionId).toBe('session-alt');const payment=await a.retrievePayment({transactionId:'',providerSessionId:'s',orderNumber:'',quoteNumber:''});expect(payment).toMatchObject({id:'tx-alt',status:'pending',currency:'EUR'});});
 it('captures text-read failures, provider error aliases and fetch failures',async()=>{configure();const a=adapter();let error;vi.stubGlobal('fetch',async()=>({ok:false,status:422,text:async()=>{throw new Error('read-failed');}}));try{await a.createSession({trustedOrder:{},idempotencyKey:'',successUrl:'',cancelUrl:''});}catch(e){error=e;}expect(error.status).toBe(400);vi.stubGlobal('fetch',async()=>({ok:false,status:422,text:async()=>JSON.stringify({error:'BAD'})}));try{await a.createSession({trustedOrder:{},idempotencyKey:'',successUrl:'',cancelUrl:''});}catch(e){error=e;}expect(error.providerCode).toBe('BAD');vi.stubGlobal('fetch',async()=>{throw new TypeError('network down');});try{await a.createSession({trustedOrder:{},idempotencyKey:'',successUrl:'',cancelUrl:''});}catch(e){error=e;}expect(error.message).toBe('network down');});
 it('executes real abort timeout and custom timeout configuration',async()=>{configure();const a=createHttpAdapter({id:'test_card',providerEnv:'TEST_PROVIDER',endpointEnv:'TEST_SESSION',retrieveEnv:'TEST_RETRIEVE',refundEnv:'TEST_REFUND',secretEnv:'TEST_SECRET',webhookSecretEnv:'TEST_WEBHOOK',signatureHeaderEnv:'TEST_HEADER',amountUnitEnv:'TEST_UNIT',statusMap,sessionTimeoutMs:5});vi.stubGlobal('fetch',(_unused,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>{const e=new Error('aborted');e.name='AbortError';reject(e);},{once:true})));let error;try{await a.createSession({trustedOrder:{},idempotencyKey:'',successUrl:'',cancelUrl:''});}catch(e){error=e;}expect(error.message).toBe('provider_timeout');});
 it('covers missing metadata, transaction and currency fallbacks',()=>{const event=normalizeProviderEvent({status:'payment.succeeded',amount_paid:100,id:'evt-root'},'card','minor',statusMap);expect(event).toMatchObject({entityType:'order',orderNumber:'',quoteNumber:'',currency:'USD',transactionId:'evt-root'});});
});

describe('payment adapter final branch matrix', { concurrency:false },()=>{
 it('covers empty payload and all refund amount aliases',()=>{expect(()=>normalizeProviderEvent(null,'card','minor',statusMap)).toThrow('unsupported_provider_event');for(const payload of [{status:'refund.succeeded',amount_refunded:400},{status:'refund.succeeded',data:{object:{amount:500}}},{status:'refund.succeeded',amount:600},{status:'refund.succeeded',amount:700,data:{object:{}}}]){expect(normalizeProviderEvent(payload,'card','minor',statusMap).amount).toBe(Number(payload.amount_refunded||payload.amount||payload.data?.object?.amount)/100);}expect(normalizeProviderEvent({status:'payment.succeeded',amount:700,data:{object:{}}},'card','minor',statusMap).amount).toBe(7);});
 it('rejects missing secrets after valid retrieve and refund endpoint checks',async()=>{configure();delete process.env.TEST_SECRET;const a=adapter();let error;try{await a.retrievePayment({transactionId:'tx',providerSessionId:'',orderNumber:'',quoteNumber:''});}catch(e){error=e;}expect(error.message).toBe('payment_provider_not_connected');try{await a.refund({transactionId:'tx',amount:1,idempotencyKey:''});}catch(e){error=e;}expect(error.message).toBe('payment_provider_not_connected');});
 it('uses configured retrieve and refund timeouts',async()=>{configure();const a=createHttpAdapter({id:'test_card',providerEnv:'TEST_PROVIDER',endpointEnv:'TEST_SESSION',retrieveEnv:'TEST_RETRIEVE',refundEnv:'TEST_REFUND',secretEnv:'TEST_SECRET',webhookSecretEnv:'TEST_WEBHOOK',signatureHeaderEnv:'TEST_HEADER',amountUnitEnv:'TEST_UNIT',statusMap,retrieveTimeoutMs:7,refundTimeoutMs:8});vi.stubGlobal('fetch',async(_unused,options)=>({ok:true,status:200,text:async()=>JSON.stringify(options.method==='GET'?{id:'tx',status:'succeeded'}:{id:'r',status:'succeeded'})}));expect((await a.retrievePayment({transactionId:'tx',providerSessionId:'',orderNumber:'',quoteNumber:''})).id).toBe('tx');expect((await a.refund({transactionId:'tx',amount:1,idempotencyKey:''})).id).toBe('r');});
});
