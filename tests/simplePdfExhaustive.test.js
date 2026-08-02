import { describe, expect, it } from './test-api.js';
import {
  artworkPage, clamp, coverPage, createTextPdf, downloadDesignDocuments, escapePdf, hexRgb,
  line, makePdf, object, rect, rgb, tablePages, text,
} from '../src/utils/simplePdf.js';

const decode = async (blob) => new TextDecoder().decode(await blob.arrayBuffer());

describe('simple PDF renderer branch-complete behavior', () => {
  it('escapes primitive values and renders every low-level primitive branch', () => {
    expect(escapePdf(null)).toBe(''); expect(escapePdf('é(a)\\b\nnext')).toBe('e?\\(a\\)\\\\b next');
    expect(object(7,'BODY')).toContain('7 0 obj');
    expect(clamp('x',1,5)).toBe(1); expect(clamp(-4,1,5)).toBe(1); expect(clamp(8,1,5)).toBe(5); expect(clamp(3,1,5)).toBe(3);
    expect(hexRgb('#ff0000')).toEqual([1,0,0]); expect(hexRgb('bad','#00ff00')).toEqual([0,1,0]); expect(hexRgb('bad')).toEqual([0,0,0]);
    expect(rgb('#0000ff')).toBe('0.0000 0.0000 1.0000'); expect(text('A',1,2)).toContain('/F1 10'); expect(text('A',1,2,12,'F2','1 1 1')).toContain('/F2 12'); expect(line(1,2,3,4)).toContain('1 w'); expect(line(1,2,3,4,'1 0 0',2)).toContain('2 w');
    expect(rect(0,0,10,10,'0 0 0')).toContain(' re f'); expect(rect(0,0,10,10,'0 0 0','1 1 1')).toContain(' re S'); expect(rect(0,0,10,10,'0 0 0',null,8)).toContain(' c f');
  });

  it('builds raw PDFs with default and supplied metadata', async () => {
    const defaultPdf=await decode(makePdf(['BT ET'])); expect(defaultPdf).toContain('/Title (SHABABUNA)'); expect(defaultPdf).toContain('/Subject (Production document)'); expect(defaultPdf).toContain('/Count 1');
    const named=await decode(makePdf(['A','B'],{title:'T',subject:'S'})); expect(named).toContain('/Title (T)'); expect(named).toContain('/Subject (S)'); expect(named).toContain('/Count 2');
  });

  it('covers text document pagination, empty sections and every row shape', async () => {
    const rows=Array.from({length:105},(_,index)=>index===0?['Key','Value']:`Row ${index}`);
    const blob=createTextPdf({title:'',subtitle:'Sub',sections:[{heading:'',rows},{heading:'After',rows:undefined}]}); const pdf=await decode(blob); expect(pdf).toContain('/Count 3'); expect(pdf).toContain('Key: Value'); expect(pdf).toContain('After');
    const withoutSubtitle=await decode(createTextPdf({sections:[]})); expect(withoutSubtitle).toContain('SHABABUNA');
  });

  it('renders cover, artwork and tables with every fallback and optional column', () => {
    const emptyDesign={}; const cover=coverPage({title:'T',subtitle:'S',design:emptyDesign,productLabel:'P',reference:'R'}); expect(cover).toContain('#050505'); expect(cover).toContain('home'); expect(cover).toContain('30-60 days');
    const design={primary:'#010203',secondary:'#fefefe',accent:'#abcdef',variant:'away',quantity:12,pattern:'grid',neckline:'v',font:'block'};
    const layers=[
      {type:'logo',view:'front',visible:true,x:-5,y:105,width:20,zIndex:2},
      {type:'text',view:'front',visible:true,x:50,y:50,width:0,zIndex:1,content:null,color:'bad'},
      {type:'text',view:'back',visible:true,x:50,y:50,width:100,zIndex:1,content:'BACK',color:'#ffffff'},
      {type:'text',view:'front',visible:false,x:1,y:1,width:1,zIndex:9,content:'HIDDEN'},
    ];
    const front=artworkPage({design,studio:{layers},view:'front',productLabel:'P'}); expect(front).toContain('ART'); expect(front).not.toContain('HIDDEN');
    const none=artworkPage({design,studio:null,view:'side',productLabel:'P'}); expect(none).toContain('SIDE VIEW');
    const tables=tablePages({heading:'H',rows:[["A","B"],["C","D","E"]],columns:[100,200],startY:60}); expect(tables.length).toBeGreaterThan(1); expect(tables.join('\n')).toContain('continued'); expect(tables.join('\n')).toContain('(E)');
    const defaults=tablePages({heading:'D',rows:[['A','B']]}); expect(defaults).toHaveLength(1);
  });

  it('creates documents from empty/full projects and all roster/layer fallbacks', async () => {
    const empty=downloadDesignDocuments({design:{},studio:null}); const emptyProof=await decode(empty.proof); const emptyTech=await decode(empty.tech); expect(emptyProof).toContain('No roster attached'); expect(emptyTech).toContain('No visible layers'); expect(emptyTech).toContain('No production notes supplied');
    const studio={layers:[
      {view:'',visible:true,zIndex:2,label:'Text',content:null,x:1,y:2,width:3,rotation:0},
      {view:'front',visible:true,zIndex:1,label:'Logo',content:'data:image/png;base64,AA==',x:4,y:5,width:6,rotation:7},
      {view:'front',visible:false,zIndex:0,label:'Hidden',content:'x',x:0,y:0,width:1,rotation:0},
    ]};
    const design={primary:'#000000',secondary:'#ffffff',accent:'#cccccc',variant:'home',quantity:10,pattern:'solid',neckline:'crew',font:'block',notes:'Ready'};
    const roster=[{name:'Name',jerseyName:'',number:'7',jerseySize:'',shortsSize:''},{name:'Other',jerseyName:'O',number:'8',jerseySize:'L',shortsSize:'M'}];
    const full=downloadDesignDocuments({design,studio,productLabel:'Set',roster,reference:'REF'}); const proof=await decode(full.proof); const tech=await decode(full.tech); expect(proof).toContain('1. Name'); expect(proof).toContain('Jersey -'); expect(tech).toContain('[embedded artwork]'); expect(tech).toContain('Ready');
  });
});
