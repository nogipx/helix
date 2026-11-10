import test from 'node:test';
import assert from 'node:assert/strict';
import {Run} from '../dist/engine.mjs';
const enter=()=>{const r=new Run();r.command(`login ${r.auth}`);return r;};
const unlock=r=>{r.command('scan');r.command(`breach ${r.nodes[r.at].key}`);};
test('complete run: login, navigate, breach, transfer, extract Quantum Shard',()=>{
 const r=enter();r.command('connect RELAY-A');unlock(r);r.command('connect VAULT-A');unlock(r);r.command('connect QUANTUM');unlock(r);r.command('siphon');
 for(let i=0;i<5;i++)r.tick();assert.equal(r.loot[0].name,'quantum.shard');assert.equal(r.nodes[6].taken,true);
 r.command('extract');assert.equal(r.phase,'won');assert.ok(r.score>1000);const time=r.time;r.tick();assert.equal(r.time,time);
});
test('three bad tokens lock terminal; login does not start the timer',()=>{
 const r=new Run();r.tick();assert.equal(r.time,180);for(let i=0;i<3;i++)r.command('login wrong');assert.equal(r.phase,'lost');assert.equal(r.tries,0);
});
test('ICE blocks copying and unscanned keys; wrong keys raise trace',()=>{
 const r=enter();r.command('connect RELAY-A');r.command(`breach ${r.nodes[1].key}`);assert.equal(r.nodes[1].open,false);
 r.command('scan');const trace=r.trace;r.command('breach WRONG');assert.equal(r.trace,trace+16);
 unlock(r);r.command('connect VAULT-A');r.command('siphon');assert.equal(r.transfer,null);
});
test('transfers lock commands, complete once, and cannot duplicate loot',()=>{
 const r=enter();r.command('connect RELAY-B');unlock(r);r.command('connect VAULT-B');unlock(r);r.command('siphon');r.command('connect RELAY-B');assert.equal(r.at,5);r.command('extract');assert.equal(r.phase,'active');
 for(let i=0;i<5;i++)r.tick();r.command('siphon');assert.equal(r.transfer,null);assert.equal(r.loot.length,1);
});
test('Phantom is single use; scrub consumes time and has cooldown',()=>{
 const r=enter();r.trace=60;r.command('phantom');assert.equal(r.trace,30);r.command('phantom');assert.equal(r.trace,30);
 r.command('scrub');assert.equal(r.trace,12);assert.equal(r.time,172);r.command('scrub');assert.equal(r.time,172);for(let i=0;i<25;i++)r.tick();assert.equal(r.cooldown,0);
});
test('timer and detection both fail the run',()=>{
 let r=enter();r.time=1;r.tick();assert.equal(r.phase,'lost');r=enter();r.trace=99;r.command('invalid');assert.equal(r.phase,'lost');assert.equal(r.transfer,null);
});
test('cannot extract empty-handed or play after failure',()=>{
 const r=enter();r.command('extract');assert.equal(r.phase,'active');r.trace=100;r.tick();const at=r.at;r.command('connect RELAY-A');assert.equal(r.at,at);
});
test('locked node cannot be used to skip security',()=>{
 const r=enter();r.command('connect RELAY-A');r.command('connect VAULT-A');assert.equal(r.at,1);
});
test('patrol pulses and higher sectors create additional pressure',()=>{
 const a=enter(),b=new Run(Math.random,3);b.command(`login ${b.auth}`);for(let i=0;i<30;i++){a.tick();b.tick();}assert.ok(a.trace>=17);assert.ok(b.trace>a.trace);
});
