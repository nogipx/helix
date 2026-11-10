import test from 'node:test';
import assert from 'node:assert/strict';
import {Run} from '../dist/engine.mjs';
import {Campaign,DAEMONS,NETWORKS,ANOMALIES} from '../dist/rogue.mjs';
function rng(seed){return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);}
function clear(c,shard=true){c.current.loot=[{id:shard?6:3,name:'fixture',size:shard?640:260}];c.current.end(true,'test');c.resolve();}
function active(config={}){const r=new Run(rng(1),2,config);r.command(`login ${r.auth}`);return r;}

test('four sectors, three unique drafts and final campaign payout',()=>{
 const c=new Campaign(rng(123));
 for(let sector=1;sector<=4;sector++){
  assert.equal(c.sector,sector);assert.equal(c.current.final,sector===4);clear(c);
  if(sector<4){assert.equal(c.stage,'draft');assert.equal(c.offers.length,3);assert.equal(new Set(c.offers.map(x=>x.id)).size,3);assert.ok(c.offers.every(x=>!c.modules.includes(x.id)));const id=c.offers[0].id;assert.equal(c.install(id),true);assert.equal(c.install(id),false);assert.equal(c.current.modules.length,sector);}
 }
 assert.equal(c.stage,'won');assert.equal(c.modules.length,3);assert.equal(c.total,4*(640+500+180)+1000 + (c.modules.includes('clock')?40*(4-c.modules.indexOf('clock')-1):0));
});
test('draft can be cashed out once and invalid choices do not advance',()=>{
 const c=new Campaign(rng(1));clear(c);const total=c.total;assert.equal(c.install('invalid'),false);assert.equal(c.sector,1);assert.equal(c.resolve(),false);assert.equal(c.total,total);assert.equal(c.cashOut(),true);assert.equal(c.stage,'cashed');assert.equal(c.cashOut(),false);assert.equal(c.install('ghost'),false);
});
test('death destroys accumulated score; a new campaign resets the whole build',()=>{
 const c=new Campaign(rng(1));clear(c);c.install(c.offers[0].id);assert.ok(c.total>0);c.current.end(false,'test');c.resolve();assert.equal(c.total,0);assert.equal(c.stage,'lost');assert.equal(c.cashOut(),false);const fresh=new Campaign(rng(2));assert.equal(fresh.sector,1);assert.deepEqual(fresh.modules,[]);assert.equal(fresh.adaptation,'none');
});
test('partial extraction ends the campaign without entering a draft',()=>{
 const c=new Campaign(rng(2));clear(c);c.install(c.offers[0].id);const total=c.total;clear(c,false);assert.equal(c.stage,'cashed');assert.ok(c.total>total);
});
test('AI counters the actual prior behavior and telegraphs it before installation',()=>{
 let c=new Campaign(rng(2));c.current.metrics.overloads=2;clear(c);assert.equal(c.adaptation,'armor');c.install(c.offers[0].id);assert.equal(c.current.adaptation,'armor');
 c=new Campaign(rng(2));c.current.loot.push({id:3,size:260});c.current.loot.push({id:6,size:640});c.current.end(true,'');c.resolve();assert.equal(c.adaptation,'hunter');
 c=new Campaign(rng(2));clear(c);assert.equal(c.adaptation,'observer');
});
test('daemon tradeoffs compose instead of overwriting each other',()=>{
 const r=active({modules:['ghost','ram','zip','clock','leech','thread'],adaptation:'armor',anomaly:ANOMALIES[2]});
 assert.equal(r.overloadCost,24);assert.equal(r.time,220);assert.equal(r.patrolRisk,11);assert.ok(Math.abs(r.passiveNoise-(.24+.1)*.6*1.5*.8)<1e-9);
 const base=active();assert.equal(r.nodes[3].transferTime,Math.ceil((base.nodes[3].transferTime+2)/2));assert.equal(r.nodes[3].breachRisk,base.nodes[3].breachRisk+7);
 r.nodes[1].open=true;r.command('connect RELAY-A');assert.equal(r.trace,0);r.command('connect VAULT-A');assert.equal(r.trace,5);
});
test('leech healing is applied after survival check; it cannot prevent lethal ICE',()=>{
 const r=active({modules:['leech']});r.command('connect RELAY-A');r.command('scan');r.trace=50;const cost=r.nodes[1].breachRisk;r.command(`breach ${r.nodes[1].key}`);assert.equal(r.trace,50+cost-6);
 const doomed=active({modules:['leech']});doomed.command('connect RELAY-A');doomed.command('scan');doomed.trace=99;doomed.command(`breach ${doomed.nodes[1].key}`);assert.equal(doomed.phase,'lost');
});
test('countermeasure patrol timings and forecasts include modified noise',()=>{
 const r=active({modules:['clock'],adaptation:'hunter',anomaly:ANOMALIES[1]});assert.equal(r.patrolPeriod,24);r.elapsed=23;r.trace=0;r.tick();assert.ok(r.trace>=11);assert.equal(r.patrolIn,24);
});
test('final root seal blocks both ICE and overload until a side archive is acquired',()=>{
 const r=active({final:true});r.at=6;r.nodes[6].scanned=true;r.command(`breach ${r.nodes[6].key}`);r.command('overload');assert.equal(r.nodes[6].open,false);assert.equal(r.trace,0);
 r.loot.push({id:3,size:260});r.command(`breach ${r.nodes[6].key}`);assert.equal(r.nodes[6].open,true);
});
test('all generated network layouts are connected with a return route',()=>{
 for(const links of NETWORKS){const seen=new Set([0]);let changed=true;while(changed){changed=false;for(const[a,b]of links){if(seen.has(a)&&!seen.has(b)){seen.add(b);changed=true;}if(seen.has(b)&&!seen.has(a)){seen.add(a);changed=true;}}}assert.equal(seen.size,7);}
 const layouts=new Set(Array.from({length:100},(_,i)=>JSON.stringify(new Campaign(rng(i*100003)).current.links)));assert.equal(layouts.size,NETWORKS.length);
});
test('every module is reachable in seeded draft offers',()=>{
 const offered=new Set();for(let i=0;i<100;i++){const c=new Campaign(rng(i*9999));clear(c);c.offers.forEach(x=>offered.add(x.id));}assert.deepEqual([...offered].sort(),DAEMONS.map(x=>x.id).sort());
});
