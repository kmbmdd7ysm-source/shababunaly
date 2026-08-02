import { afterEach, describe, expect, it, vi } from './test-api.js';
import {
  DESIGN_VIEWS, createDefaultStudio, normalizeStudio, addDesignLayer, updateDesignLayer, removeDesignLayer,
  duplicateDesignLayer, moveDesignLayer, addDesignComment, resolveDesignComment, createHistory, pushHistory,
  undoHistory, redoHistory, buildProductionMetadata, autosaveDesignStudio, createSecureDesignShare,
  loadSharedDesign, addSharedDesignComment, respondToSharedDesign,
} from '../src/services/designStudio.js';
import { __resetSupabaseForTests, __setSupabaseBuildEnvForTests, __setSupabaseClientFactoryForTests, authRedirectUrl, completeAuthRedirect, getSupabase, getSupabaseConfigStatus } from '../src/services/supabase.js';

const originalLocation=globalThis.location; const originalHistory=globalThis.history; const originalDocument=globalThis.document;
afterEach(()=>{vi.restoreAllMocks();__resetSupabaseForTests();if(originalLocation===undefined)delete globalThis.location;else /** @type {any} */ (globalThis).location=originalLocation;if(originalHistory===undefined)delete globalThis.history;else globalThis.history=originalHistory;if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;});

const design={productType:'game-set',variant:'home',primary:'#010101',secondary:'#fefefe',accent:'#abcdef',pattern:'split',neckline:'v-neck',font:'modern',teamName:'Winners',playerName:'Player',number:'8',sponsorName:'Sponsor',logoPreview:'data:image/png;base64,AA==',notes:'Factory note'};

describe('design studio pure runtime exhaustive',()=>{
  it('creates all default layers and normalizes hostile values',()=>{
    const base=createDefaultStudio(design); expect(base.activeView).toBe('front'); expect(base.layers.some((l)=>l.type==='logo')).toBe(true); expect(base.layers.some((l)=>l.type==='sponsor')).toBe(true);
    const minimal=createDefaultStudio({}); expect(minimal.layers).toHaveLength(4);
    const hostile=normalizeStudio({activeView:'bad',showSafeArea:false,showBleedArea:1,layers:[{id:'',type:'bad',view:'bad',label:'',content:'x'.repeat(200),x:-9,y:999,width:0,rotation:999,color:'bad',font:'bad',visible:false,locked:1,zIndex:0},{type:'logo',content:'x'.repeat(2100000),x:'50',y:null,width:'20',rotation:'-180',color:'#123456',font:'modern'}],comments:[{id:'',view:'bad',x:-1,y:101,text:'  note  ',resolved:1},{text:'   '} ]},design);
    expect(hostile.activeView).toBe('front'); expect(hostile.showSafeArea).toBe(false); expect(hostile.showBleedArea).toBe(true); expect(hostile.layers[0]).toMatchObject({type:'text',view:'front',label:'Layer 1',x:3,y:97,width:5,rotation:180,color:'#ffffff',font:'block',visible:false,locked:true,zIndex:1}); expect(hostile.layers[0].content.length).toBe(120); expect(hostile.layers[1].content.length).toBe(2000000); expect(hostile.comments).toHaveLength(1); expect(hostile.comments[0]).toMatchObject({view:'front',x:0,y:100,text:'note',resolved:true});
    const fallback=normalizeStudio(null,design); expect(fallback.layers.length).toBeGreaterThan(4);
    const missingArrays=normalizeStudio({layers:'bad',comments:'bad'},design); expect(missingArrays.layers).toEqual([]); expect(missingArrays.comments).toEqual([]);
  });

  it('adds, edits, duplicates, moves and removes every layer type',()=>{
    let studio=createDefaultStudio({});
    const starting=studio.layers.length;
    studio=addDesignLayer(studio,{type:'number',view:'back',label:'N',x:200,y:-5,width:100,rotation:-999,color:'#112233',font:'condensed'},design); expect(studio.layers).toHaveLength(starting+1); const number=studio.layers.at(-1); expect(number).toMatchObject({type:'number',view:'back',content:'00',x:97,y:3,width:90,rotation:-180,color:'#112233',font:'condensed'});
    studio=addDesignLayer(studio,{type:'bad',view:'bad',content:'',color:'bad',font:'bad'},design); const text=studio.layers.at(-1); expect(text.type).toBe('text'); expect(text.view).toBe('front'); expect(text.content).toBe('TEXT'); expect(text.color).toBe(design.secondary); expect(text.font).toBe(design.font);
    studio=addDesignLayer(studio,{type:'logo',content:'data:image/png;base64,AA=='},design); expect(studio.layers.at(-1).content).toContain('data:image');
    studio=updateDesignLayer(studio,text.id,{content:'UPDATED',locked:true},design); expect(studio.layers.find((l)=>l.id===text.id).content).toBe('UPDATED'); const unchanged=updateDesignLayer(studio,'missing',{content:'x'},design); expect(unchanged.layers.find((l)=>l.id===text.id).content).toBe('UPDATED');
    const noDuplicate=duplicateDesignLayer(studio,'missing',design); expect(noDuplicate.layers.length).toBe(studio.layers.length); const duplicated=duplicateDesignLayer(studio,text.id,design); expect(duplicated.layers).toHaveLength(studio.layers.length+1); expect(duplicated.layers.at(-1).label).toContain('copy');
    const noMove=moveDesignLayer(studio,'missing','up',design); expect(noMove.layers.length).toBe(studio.layers.length); const firstFront=studio.layers.filter((l)=>l.view==='front').sort((a,b)=>a.zIndex-b.zIndex)[0]; expect(moveDesignLayer(studio,firstFront.id,'down',design).layers.length).toBe(studio.layers.length); const moved=moveDesignLayer(studio,firstFront.id,'up',design); expect(moved.layers.find((l)=>l.id===firstFront.id).zIndex).not.toBe(firstFront.zIndex);
    const removed=removeDesignLayer(studio,text.id,design); expect(removed.layers.some((l)=>l.id===text.id)).toBe(false);
  });

  it('manages comments, history limits and production metadata',()=>{
    let studio=createDefaultStudio({}); expect(addDesignComment(studio,{text:'   '}).comments).toHaveLength(0);
    studio=addDesignComment(studio,{view:'side',x:-1,y:120,text:' Review here '},design); expect(studio.comments[0]).toMatchObject({view:'side',x:0,y:100,text:'Review here',resolved:false});
    studio=resolveDesignComment(studio,studio.comments[0].id,design); expect(studio.comments[0].resolved).toBe(true); expect(resolveDesignComment(studio,'missing',design).comments[0].resolved).toBe(true);
    let history=createHistory({v:1},2); expect(undoHistory(history)).toBe(history); expect(redoHistory(history)).toBe(history); expect(pushHistory(history,{v:1})).toBe(history); history=pushHistory(history,{v:2}); history=pushHistory(history,{v:3}); history=pushHistory(history,{v:4}); expect(history.past).toHaveLength(2); history=undoHistory(history); expect(history.present.v).toBe(3); history=redoHistory(history); expect(history.present.v).toBe(4);
    const metadata=buildProductionMetadata({...design,notes:'x'.repeat(1300)},studio); expect(DESIGN_VIEWS).toEqual(['front','back','side']); expect(metadata.notes.length).toBe(1200); expect(Object.keys(metadata.views)).toEqual(['front','back','side']); expect(metadata.views.side.every((l)=>l.visible)).toBe(true);
  });
});

/** @param {Record<string, any>} [config] */
function runtimeConfigFetch(config={supabaseUrl:'https://project.supabase.co',supabaseAnonKey:'a'.repeat(30)}){return vi.fn().mockResolvedValue({ok:true,headers:{get:()=> 'application/json'},json:async()=>config});}

describe('Supabase client and auth redirect runtime exhaustive', {concurrency:false},()=>{
  it('reports no config, invalid content and timeout/error sources',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,headers:{get:()=>''}})); expect(await getSupabase()).toBe(null); expect(getSupabaseConfigStatus()).toMatchObject({checked:true,configured:false,source:'none'});
    __resetSupabaseForTests(); vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,headers:{get:()=> 'text/html'},json:async()=>({})})); expect(await getSupabase()).toBe(null);
    __resetSupabaseForTests(); const abort=new Error('aborted');abort.name='AbortError';vi.stubGlobal('fetch',vi.fn().mockRejectedValue(abort));expect(await getSupabase()).toBe(null);expect(getSupabaseConfigStatus().source).toBe('timeout');
    __resetSupabaseForTests();vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));expect(await getSupabase()).toBe(null);expect(getSupabaseConfigStatus().source).toBe('error');
  });

  it('creates a client directly from build-time aliases without a runtime request', async()=>{
    const createClient=vi.fn().mockReturnValue({id:'build-client'}); __setSupabaseBuildEnvForTests({VITE_SUPABASE_URL:'https://build.supabase.co',VITE_SUPABASE_ANON_KEY:'z'.repeat(30)}); __setSupabaseClientFactoryForTests(async()=>({createClient}));
    const client=await getSupabase(); expect(client).toEqual({id:'build-client'}); expect(createClient.mock.calls).toHaveLength(1); expect(getSupabaseConfigStatus()).toMatchObject({checked:true,configured:true,source:'build'});
  });

  it('creates and caches a client from valid runtime aliases',async()=>{
    const createClient=vi.fn().mockReturnValue({id:'client'});__setSupabaseClientFactoryForTests(async()=>({createClient}));vi.stubGlobal('fetch',runtimeConfigFetch({url:'https://project.supabase.co',publishableKey:'b'.repeat(30)}));const one=await getSupabase();const two=await getSupabase();expect(one).toEqual({id:'client'});expect(two).toBe(one);expect(createClient.mock.calls).toHaveLength(1);expect(createClient.mock.calls[0][2].auth.storageKey).toBe('shababuna-auth-session-v1');expect(getSupabaseConfigStatus()).toMatchObject({configured:true,source:'runtime'});
    __resetSupabaseForTests();__setSupabaseClientFactoryForTests(async()=>({createClient}));vi.stubGlobal('fetch',runtimeConfigFetch({supabaseUrl:'http://bad',anonKey:'short'}));expect(await getSupabase()).toBe(null);
  });

  it('creates confirm/recovery redirect URLs',()=>{
    vi.stubGlobal('location',{origin:'https://shop.example'});expect(authRedirectUrl()).toBe('https://shop.example/account?verified=1');expect(authRedirectUrl('recovery')).toBe('https://shop.example/account?mode=reset-password');
    vi.restoreAllMocks();delete globalThis.location;expect(authRedirectUrl()).toBe('https://shababuna.ly/account?verified=1');
  });

  it('handles callback errors, implicit sessions, PKCE codes, OTP and no-op callbacks',async()=>{
    const replacements=[];vi.stubGlobal('history',{replaceState:(...args)=>replacements.push(args)});vi.stubGlobal('document',{title:'Shop'});
    const client={auth:{setSession:vi.fn().mockResolvedValue({data:{session:1},error:null}),exchangeCodeForSession:vi.fn().mockResolvedValue({data:{session:2},error:null}),verifyOtp:vi.fn().mockResolvedValue({data:{user:1},error:null})}};
    delete globalThis.location;expect(await completeAuthRedirect(client)).toEqual({handled:false,data:null,error:null});
    vi.stubGlobal('location',{href:'https://shop.example/account?error_description=Denied&code=secret',origin:'https://shop.example'});let result=await completeAuthRedirect(client);expect(result.handled).toBe(true);expect(result.error.message).toBe('Denied');expect(replacements.at(-1)[2]).toBe('/account');
    /** @type {any} */ (globalThis).location={href:'https://shop.example/account#access_token=at&refresh_token=rt&expires_in=1',origin:'https://shop.example'};result=await completeAuthRedirect(client);expect(result.data).toEqual({session:1});expect(client.auth.setSession.mock.calls[0][0]).toEqual({access_token:'at',refresh_token:'rt'});
    /** @type {any} */ (globalThis).location={href:'https://shop.example/account?code=abc&type=recovery',origin:'https://shop.example'};result=await completeAuthRedirect(client);expect(result.data).toEqual({session:2});
    /** @type {any} */ (globalThis).location={href:'https://shop.example/account?token_hash=hash&type=signup',origin:'https://shop.example'};result=await completeAuthRedirect(client);expect(result.data).toEqual({user:1});expect(client.auth.verifyOtp.mock.calls[0][0]).toEqual({token_hash:'hash',type:'email'});
    /** @type {any} */ (globalThis).location={href:'https://shop.example/account?token_hash=hash&type=magiclink',origin:'https://shop.example'};await completeAuthRedirect(client);expect(client.auth.verifyOtp.mock.calls[1][0].type).toBe('email');
    /** @type {any} */ (globalThis).location={href:'https://shop.example/account',origin:'https://shop.example'};expect(await completeAuthRedirect(client)).toEqual({handled:false,data:null,error:null});
  });
});

describe('design studio cloud/share operations exhaustive', {concurrency:false},()=>{
  function configureClient(client){__setSupabaseClientFactoryForTests(async()=>({createClient:()=>client}));vi.stubGlobal('fetch',runtimeConfigFetch());}
  it('autosaves only trusted cloud designs and maps database errors',async()=>{
    let error;try{await autosaveDesignStudio('',design,createDefaultStudio(design));}catch(e){error=e;}expect(error.message).toBe('design_id_required');
    __resetSupabaseForTests();vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,headers:{get:()=>''}}));try{await autosaveDesignStudio('id',design,{})}catch(e){error=e;}expect(error.message).toBe('cloud_not_configured');
    __resetSupabaseForTests();const calls=[];const chain={eq(){return this;},select(){return this;},single:vi.fn().mockResolvedValue({data:{id:'saved'},error:null})};const client={from:vi.fn().mockReturnValue({update(payload){calls.push(payload);return chain;}})};configureClient(client);expect(await autosaveDesignStudio('id',design,createDefaultStudio(design))).toEqual({id:'saved'});expect(calls[0].design_data.logoPreview).toBe(undefined);
    __resetSupabaseForTests();const dbError=new Error('db');const bad={from:()=>({update:()=>({eq(){return this;},select(){return this;},single:async()=>({data:null,error:dbError})})})};configureClient(bad);try{await autosaveDesignStudio('id',design,{})}catch(e){error=e;}expect(error).toBe(dbError);
  });

  it('creates secure shares with clamped expiry and validates tokens',async()=>{
    __resetSupabaseForTests();vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,headers:{get:()=>''}}));let error;try{await createSecureDesignShare('id')}catch(e){error=e;}expect(error.message).toBe('cloud_not_configured');
    __resetSupabaseForTests();const rpc=vi.fn().mockResolvedValue({data:'t'.repeat(40),error:null});configureClient({rpc});vi.stubGlobal('window',{location:{origin:'https://shop.example'}});expect(await createSecureDesignShare('id','comment',9999)).toBe(`https://shop.example/design-share/${'t'.repeat(40)}`);expect(rpc.mock.calls[0][1].p_hours).toBe(720);
    __resetSupabaseForTests();const rpcObject=vi.fn().mockResolvedValue({data:{token:'o'.repeat(40)},error:null});configureClient({rpc:rpcObject});expect(await createSecureDesignShare('id','view',0)).toContain('/design-share/');expect(rpcObject.mock.calls[0][1].p_hours).toBe(168);
    __resetSupabaseForTests();const dbError=new Error('rpc');configureClient({rpc:vi.fn().mockResolvedValue({data:null,error:dbError})});try{await createSecureDesignShare('id')}catch(e){error=e;}expect(error).toBe(dbError);
    __resetSupabaseForTests();configureClient({rpc:vi.fn().mockResolvedValue({data:{},error:null})});try{await createSecureDesignShare('id')}catch(e){error=e;}expect(error.message).toBe('share_token_unavailable');
  });

  it('loads, comments and approves shared designs through the protected API',async()=>{
    let error;try{await loadSharedDesign('short')}catch(e){error=e;}expect(error.message).toBe('invalid_share_token');
    const token='x'.repeat(40);const replies=[
      {ok:true,status:200,json:async()=>({ok:true,design:{id:'d',productType:'game-set',designData:{teamName:'T',studio:createDefaultStudio({})}}})},
      {ok:true,status:200,json:async()=>({ok:true,comment:{id:'c'}})},
      {ok:true,status:200,json:async()=>({ok:true,result:{status:'approved'}})},
      {ok:true,status:200,json:async()=>({ok:true,result:{status:'changes_requested'}})},
      {ok:false,status:403,json:async()=>({ok:false,error:'denied'})},
      {ok:false,status:500,json:async()=>{throw new Error('invalid-json');}},
      {ok:true,status:200,json:async()=>({ok:true,design:{}})},
    ];const calls=[];vi.stubGlobal('fetch',vi.fn().mockImplementation(async(url,options)=>{calls.push([url,options]);return replies.shift();}));
    const shared=await loadSharedDesign(token);expect(shared.id).toBe('d');expect(shared.design.productType).toBe('game-set');expect(shared.studio.layers.length).toBeGreaterThan(0);expect(calls[0][1].method).toBe('GET');
    expect(await addSharedDesignComment(token,{text:'Hi'})).toEqual({id:'c'});expect(JSON.parse(calls[1][1].body)).toMatchObject({token,action:'comment',text:'Hi'});
    expect(await respondToSharedDesign(token,'approve',' yes ','captcha')).toEqual({status:'approved'});expect(await respondToSharedDesign(token,'request_changes')).toEqual({status:'changes_requested'});
    try{await respondToSharedDesign(token,'bad')}catch(e){error=e;}expect(error.message).toBe('invalid_design_decision');
    try{await loadSharedDesign(token)}catch(e){error=e;}expect(error.status).toBe(403);expect(error.message).toBe('denied');
    try{await loadSharedDesign(token)}catch(e){error=e;}expect(error.status).toBe(500);expect(error.message).toBe('design_share_unavailable');
    try{await loadSharedDesign(token)}catch(e){error=e;}expect(error.message).toBe('shared_design_not_found');
  });
});
