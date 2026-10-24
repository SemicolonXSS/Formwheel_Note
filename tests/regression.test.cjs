'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
function editor() {
  const nodes = new Map(), stored = new Map(), confirmations = [], answers = [];
  const document = {getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, {value:'',selectedIndex:0,files:[],textContent:'',innerHTML:'',addEventListener(type,fn){this[type]=fn},click(){}});
    return nodes.get(id);
  }};
  const source = fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(source, {document,window:{addEventListener(){}},localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},confirm:msg=>{confirmations.push(msg);return answers.length?answers.shift():true},crypto:{randomUUID:()=> 'original'},Date,JSON,Map,Blob,URL,setTimeout});
  return {get:id=>document.getElementById(id),stored,confirmations,answers};
}
const backup = {app:'Formwheel_Note',version:1,notes:[{id:'imported',date:'2026-10-24',title:'백업',content:'내용',mood:'😊 행복',updated:1}]};
async function importBackup(e) {
  const input=e.get('importFile');input.files=[{size:100,text:async()=>JSON.stringify(backup)}];
  await input.onchange({target:input});
}
test('import warns before discarding unsaved edits, merges records and clears the editor', async()=>{
  const e=editor();e.get('title').value='기존 일기';e.get('content').value='기존 내용';e.get('save').onclick();
  e.get('content').value='미저장 초안';e.get('content').input();await importBackup(e);
  assert.equal(e.confirmations.length,2);
  assert.match(e.confirmations[0],/저장하지 않은/);
  assert.equal(e.get('title').value,'');assert.equal(e.get('content').value,'');
  assert.equal(JSON.parse(e.stored.get('formwheel-note-v1')).length,2);
  e.get('entries').click({target:{closest:()=>({dataset:{id:'imported'}})}});
  assert.equal(e.get('title').value,'백업');assert.equal(e.get('content').value,'내용');
});
test('cancelling import keeps unsaved text and stored records intact',async()=>{
  const e=editor();e.get('content').value='초안';e.get('content').input();e.answers.push(false);await importBackup(e);
  assert.equal(e.get('content').value,'초안');assert.equal(e.stored.size,0);assert.equal(e.confirmations.length,1);
});
