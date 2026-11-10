import test from 'node:test';
import assert from 'node:assert/strict';
import {Results} from '../dist/results.mjs';
function memory(){const data=new Map();return{getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};}
function entry(id='one',status='cashed'){return{id,date:'2026-11-10T14:00:00.000Z',status,score:status==='lost'?0:1200,sector:2,modules:['Кровопийца'],reason:'test'};}
test('new journal restores completed results after browser reload',()=>{
 const storage=memory(),first=new Results(storage);first.add(entry());first.add(entry('loss','lost'));const reloaded=new Results(storage);assert.deepEqual(reloaded.entries,[entry('loss','lost'),entry()]);assert.equal(reloaded.saved,true);
});
test('repeated outcome rendering does not duplicate a campaign',()=>{
 const results=new Results(memory());results.add(entry());results.add(entry());assert.equal(results.entries.length,1);
});
test('retains only the fifty newest results',()=>{
 const storage=memory(),results=new Results(storage);for(let i=0;i<60;i++)results.add(entry(String(i)));const loaded=new Results(storage);assert.equal(loaded.entries.length,50);assert.equal(loaded.entries[0].id,'59');assert.equal(loaded.entries.at(-1).id,'10');
});
test('corrupted and malformed saved data cannot break the game',()=>{
 assert.deepEqual(new Results({getItem:()=>'{'}).entries,[]);
 const storage={getItem:()=>JSON.stringify([null,{...entry(),score:'1200'},{...entry(),modules:[null]},entry('valid')])};assert.deepEqual(new Results(storage).entries,[entry('valid')]);
});
test('unavailable browser storage preserves results for the current session',()=>{
 const results=new Results({getItem(){throw Error('denied');},setItem(){throw Error('denied');}});results.add(entry());assert.equal(results.entries.length,1);assert.equal(results.saved,false);
});
