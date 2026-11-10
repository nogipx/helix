import test from 'node:test';
import assert from 'node:assert/strict';
import {Account} from '../dist/economy.mjs';
import {Run} from '../dist/engine.mjs';
import {Campaign,CONTRACTS} from '../dist/rogue.mjs';
const memory=()=>{const map=new Map();return{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};
const active=(config={})=>{const r=new Run(Math.random,1,config);r.command(`login ${r.auth}`);return r;};
function move(r,name){r.command('recon');r.command(`connect ${name}`);}
function open(r){r.command('scan');r.command(`breach ${r.nodes[r.at].key}`);}
function clear(c){c.current.loot=[{id:6,size:640,name:'quantum.shard'}];c.current.end(true,'fixture');c.resolve();}

test('wallet spends credits, respects three charge capacity and survives reload',()=>{
 const storage=memory(),a=new Account(storage);assert.equal(a.credits,120);assert.equal(a.buy('sniffer'),true);assert.equal(a.credits,85);a.buy('sniffer');a.buy('sniffer');assert.equal(a.load,3);assert.equal(a.buy('sniffer'),false);const b=new Account(storage);assert.equal(b.credits,15);assert.equal(b.inventory.sniffer,3);assert.equal(b.buy('emp'),false);
});
test('delivered-data payments are idempotent and defeat destroys gear, not wallet',()=>{
 const a=new Account(memory());a.buy('emp');assert.equal(a.settle('sector1',160),true);assert.equal(a.settle('sector1',160),false);assert.equal(a.credits,210);a.loseKit();assert.equal(a.load,0);assert.equal(a.credits,210);assert.equal(a.settle('bad',-100),false);
});
test('interrupted expedition loses carried tools and retains payments on reload',()=>{
 const storage=memory(),a=new Account(storage);a.buy('sniffer');a.settle('raid:1',160);a.active='raid';a.save();const b=new Account(storage);assert.equal(b.credits,245);assert.equal(b.load,0);assert.equal(b.active,null);assert.equal(b.settle('raid:1',160),false);assert.equal(new Account(storage).credits,245);
});
test('only gateway is initially known and guessing an address does not bypass fog',()=>{
 const r=active();assert.deepEqual([...r.discovered],[0]);assert.equal(r.revealedEdges.size,0);r.command('connect RELAY-A');assert.equal(r.at,0);r.command(`connect ${r.nodes[1].address}`);assert.equal(r.at,0);r.command('recon');assert.deepEqual([...r.discovered].sort(),[0,1,2]);assert.equal(r.revealedEdges.size,2);r.command(`connect ${r.nodes[1].address}`);assert.equal(r.at,1);assert.equal(r.label(r.nodes[1]),r.nodes[1].address);r.command('scan');assert.equal(r.label(r.nodes[1]),'RELAY-A');
});
test('recon cannot see beyond locked ICE; opening it permits deeper exploration',()=>{
 const r=active();move(r,'RELAY-A');const known=r.discovered.size;r.command('recon');assert.equal(r.discovered.size,known);open(r);r.command('recon');assert.ok(r.discovered.has(3));assert.ok(!r.discovered.has(6));r.command('connect QUANTUM');assert.equal(r.at,1);
});
test('sniffer reveals routes without revealing archive contents and uses one charge',()=>{
 const inventory={sniffer:1},r=active({inventory});r.command('use sniffer');assert.equal(inventory.sniffer,0);assert.ok(r.discovered.size>3);assert.ok(r.nodes.slice(1).every(n=>!n.scanned));assert.ok([...r.discovered].every(id=>r.nodes[id].identified));const count=r.discovered.size;r.command('use sniffer');assert.equal(r.discovered.size,count);
});
test('EMP consumes only when it can actually open ICE and cannot bypass final seal',()=>{
 const inventory={emp:2},r=active({inventory,final:true});r.command('use emp');assert.equal(inventory.emp,2);move(r,'RELAY-A');const trace=r.trace;r.command('use emp');assert.equal(r.nodes[1].open,true);assert.equal(r.trace,trace);assert.equal(inventory.emp,1);r.at=6;r.command('use emp');assert.equal(inventory.emp,1);assert.equal(r.nodes[6].open,false);
});
test('tunnel pays only for successfully extracted data and cannot extract empty hands',()=>{
 const inventory={tunnel:1},r=active({inventory});r.command('use tunnel');assert.equal(inventory.tunnel,1);move(r,'RELAY-A');open(r);r.loot=[{id:3,size:260,name:'identity.db'}];r.command('use tunnel');assert.equal(r.phase,'won');assert.equal(inventory.tunnel,0);assert.equal(r.credits,65);
});
test('wrong ICE permanently wounds the expedition and patch restores one point',()=>{
 const inventory={patch:1},c=new Campaign(Math.random,{inventory});const r=c.current;r.command(`login ${r.auth}`);move(r,'RELAY-A');r.command('scan');const wrong=r.nodes[1].options.find(x=>x!==r.nodes[1].key);r.command(`breach ${wrong}`);assert.equal(r.integrity,2);r.command('phantom');r.command(`breach ${r.nodes[1].key}`);clear(c);c.install(c.offers[0].id);assert.equal(c.current.integrity,2);assert.equal(c.current.phantom,false);assert.equal(c.current.inventory,inventory);c.current.command(`login ${c.current.auth}`);c.current.command('use patch');assert.equal(c.current.integrity,3);assert.equal(inventory.patch,0);
});
test('third distinct wrong ICE guess ends the expedition even at low trace',()=>{
 const r=active();move(r,'RELAY-A');r.command('scan');for(const code of r.nodes[1].options.filter(x=>x!==r.nodes[1].key))r.command(`breach ${code}`);assert.equal(r.phase,'lost');assert.equal(r.integrity,0);assert.ok(r.trace<100);assert.equal(r.credits,0);
});
test('contract choice changes deadline, payout and core objective in next sector',()=>{
 const c=new Campaign(()=>.9);clear(c);assert.equal(c.selectContract('missing'),false);const route=c.routes.find(x=>x.id==='deep')||c.routes[0];assert.equal(c.selectContract(route.id),true);c.install(c.offers[0].id);assert.equal(c.current.contract.id,route.id);assert.equal(c.current.time,route.time+(c.modules.includes('clock')?40:0));
 const deep=active({contract:CONTRACTS[2]});assert.equal(deep.time,240);assert.equal(deep.coreSealed,true);deep.loot=[{id:3,size:260}];assert.equal(deep.coreSealed,false);deep.end(true,'');assert.equal(deep.credits,91);
});
test('credits reflect sold data rather than remaining time, never unsold loot',()=>{
 const a=active(),b=active();for(const r of[a,b])r.loot=[{id:6,size:640}];a.time=170;b.time=5;assert.equal(a.credits,0);a.end(true,'');b.end(true,'');assert.equal(a.credits,160);assert.equal(a.credits,b.credits);
});
