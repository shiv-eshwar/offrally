import {readFileSync} from 'node:fs';import {JSDOM} from 'jsdom';import test from 'node:test';import assert from 'node:assert/strict';
const rules=JSON.parse(readFileSync('policy/rules.json')),src=readFileSync('policy/filter.js','utf8');
for(const [site,flag,bad,good] of [['youtube','shorts','/shorts/test','/watch?v=test'],['instagram','reels','/reel/test','/p/test']]){
 test(site+' filters later inserts and preserves ordinary links when enabled or disabled',()=>{for(const enabled of [true,false]){
 const dom=new JSDOM('<head></head><body></body>',{url:rules[site].home,runScripts:'outside-only'}),w=dom.window;
 try{w.eval(src)(rules[site],{[flag]:enabled});const doc=w.document;
 for(const [url,hidden] of [[bad,enabled],[good,false]]){let a=doc.createElement('a');a.href=url;doc.body.append(a);assert.equal(w.getComputedStyle(a).display==='none',hidden);const ev=new w.MouseEvent('click',{bubbles:true,cancelable:true});doc.addEventListener('click',e=>e.preventDefault(),{once:true});let reached=false;a.onclick=()=>{reached=true};a.dispatchEvent(ev);assert.equal(reached,!hidden)}
 }finally{w.close()}}})
}
