import test from 'node:test';
import assert from 'node:assert/strict';
import {Run, matches} from '../dist/engine.mjs';
function rng(seed) {return () => ((seed = (Math.imul(seed,1664525)+1013904223) >>> 0) / 2**32);}
function enter(seed=42) {const r=new Run(rng(seed));r.command(`login ${r.auth}`);return r;}
function unlock(r) {r.command('scan');r.command(`breach ${r.nodes[r.at].key}`);}
function move(r,name) {r.command('recon');r.command(`connect ${name}`);}
function download(r) {r.command('siphon');const total=r.transfer?.total||0;for(let i=0;i<total;i++)r.tick();}
function vault(r) {move(r,'RELAY-A');unlock(r);move(r,'VAULT-A');unlock(r);}
function home(r) {move(r,'VAULT-A');move(r,'RELAY-A');move(r,'GATEWAY');}

test('full mission requires solving ICE, downloading shard and returning to gateway',()=>{
 const r=enter();vault(r);move(r,'QUANTUM');unlock(r);download(r);
 assert.equal(r.loot[0].name,'quantum.shard');r.command('extract');assert.equal(r.phase,'active');
 home(r);r.command('extract');assert.equal(r.phase,'won');assert.equal(r.credits,160);
 const time=r.time;r.tick();assert.equal(r.time,time);
});
test('each generated ICE has exactly one solution across 1,000 seeded runs',()=>{
 for(let seed=0;seed<1000;seed++)for(const n of new Run(rng(seed)).nodes){
  assert.equal(new Set(n.options).size,4);
  assert.deepEqual(n.options.filter(x=>matches(x,n.probe)===n.same),[n.key]);
 }
});
test('generator terminates and creates a valid puzzle even with constant RNG',()=>{
 for(const value of [0,.5,.999])for(const n of new Run(()=>value).nodes)
 assert.deepEqual(n.options.filter(x=>matches(x,n.probe)===n.same),[n.key]);
});
test('login is untimed; three wrong tokens fail',()=>{
 const r=new Run();r.tick();assert.equal(r.time,180);for(let i=0;i<3;i++)r.command('login wrong');assert.equal(r.phase,'lost');
});
test('locked ICE prevents forward progress but permits retreat',()=>{
 const r=enter();move(r,'RELAY-A');move(r,'VAULT-A');assert.equal(r.at,1);move(r,'GATEWAY');assert.equal(r.at,0);
});
test('wrong candidate costs trace only once and known key needs scan',()=>{
 const r=enter();move(r,'RELAY-A');const n=r.nodes[1];r.command(`breach ${n.key}`);assert.equal(n.open,false);
 r.command('scan');const wrong=n.options.find(x=>x!==n.key),trace=r.trace;r.command(`breach ${wrong}`);assert.equal(r.trace,trace+14);r.command(`breach ${wrong}`);assert.equal(r.trace,trace+14);
});
test('overload trades +22 trace for skipping puzzle, syntax errors are free',()=>{
 const r=enter();move(r,'RELAY-A');const trace=r.trace;r.command('overload');assert.equal(r.trace,trace+22);assert.equal(r.nodes[1].open,true);r.command('typo');assert.equal(r.trace,trace+22);
});
test('transfer can be cancelled without granting data and restarted in full',()=>{
 const r=enter();vault(r);r.command('siphon');r.tick();r.command('extract');assert.equal(r.phase,'active');r.command('abort');assert.equal(r.transfer,null);assert.equal(r.loot.length,0);download(r);assert.equal(r.loot.length,1);r.command('siphon');assert.equal(r.transfer,null);
});
test('forecast includes patrol when transfer crosses its boundary',()=>{
 const r=enter();vault(r);r.elapsed=28;const before=r.trace;const forecast=r.transferRisk;download(r);assert.ok(Math.abs(r.trace-before-forecast)<1);
});
test('scrub advances world time, triggers patrol and starts 25-second cooldown',()=>{
 const r=enter();r.trace=60;r.elapsed=25;r.command('scrub');assert.equal(r.elapsed,33);assert.equal(r.time,172);assert.equal(r.cooldown,25);assert.ok(r.trace>49);r.command('scrub');assert.equal(r.time,172);
});
test('Phantom is single use; sentinel reward cannot be farmed',()=>{
 const r=enter();r.trace=60;r.command('phantom');assert.equal(r.trace,30);r.command('phantom');assert.equal(r.trace,30);
 move(r,'RELAY-A');unlock(r);move(r,'SENTINEL');r.command('scan');const before=r.trace;r.command(`breach ${r.nodes[4].key}`);assert.equal(r.trace,Math.max(0,before+12-22));const after=r.trace;r.command('overload');assert.equal(r.trace,after);
});
test('failure takes precedence over transfer completion and cannot award score',()=>{
 const r=enter();vault(r);r.command('siphon');r.transfer.remaining=1;r.time=1;r.tick();assert.equal(r.phase,'lost');assert.equal(r.loot.length,0);assert.equal(r.credits,0);assert.equal(r.transfer,null);
});
test('lethal patrol on final transfer tick cannot grant loot',()=>{
 const r=enter();vault(r);r.command('siphon');r.transfer.remaining=1;r.elapsed=29;r.trace=95;r.tick();assert.equal(r.phase,'lost');assert.equal(r.loot.length,0);
});
test('partial extraction banks loot only at gateway; empty extraction is blocked',()=>{
 const r=enter();r.command('extract');assert.equal(r.phase,'active');vault(r);download(r);move(r,'RELAY-A');move(r,'GATEWAY');r.command('extract');assert.equal(r.phase,'won');assert.ok(r.credits>=65);assert.ok(r.reason.includes('Частичная'));
});
test('security costs cannot be rescued by sentinel reward after lethal exposure',()=>{
 const r=enter();move(r,'RELAY-A');unlock(r);move(r,'SENTINEL');r.trace=95;r.command('overload');assert.equal(r.phase,'lost');assert.equal(r.nodes[4].open,false);
});
test('route rewards vary by seed and difficulty escalation is bounded',()=>{
 const layouts=new Set(Array.from({length:100},(_,i)=>new Run(rng(i*100000)).nodes[3].size));assert.equal(layouts.size,2);
 assert.ok(new Run(rng(0),8).passiveNoise>new Run(rng(0),1).passiveNoise);assert.equal(new Run(rng(0),100).passiveNoise,new Run(rng(0),8).passiveNoise);
});
