// Deterministic balance model. This is not a human playtest or a difficulty benchmark.
import {Run} from '../dist/engine.mjs';
function rng(seed) {return () => ((seed = (Math.imul(seed,1664525)+1013904223) >>> 0) / 2**32);}
const policies = {
  'partial': ['RELAY-A','VAULT-A','RELAY-A','GATEWAY'],
  'shard': ['RELAY-A','SENTINEL','QUANTUM','SENTINEL','RELAY-A','GATEWAY'],
  'all-loot': ['RELAY-A','VAULT-A','QUANTUM','VAULT-B','RELAY-B','GATEWAY'],
};
const table=[];
for(const puzzleSeconds of [4,8,12])for(const [policy,route] of Object.entries(policies)){
 let wins=0,totalTime=0,totalTrace=0;
 for(let seed=0;seed<100;seed++){
  const r=new Run(rng(seed));r.command(`login ${r.auth}`);
  const wait=seconds=>{for(let i=0;i<seconds;i++)r.tick();};
  const mitigate=()=>{if(r.trace>=48&&r.phantom)r.command('phantom');if(r.trace>=65&&!r.cooldown)r.command('scrub');};
  for(const name of route){
   mitigate();r.command('recon');r.command(`connect ${name}`);wait(2);
   const n=r.nodes[r.at];
   if(!n.open){r.command('scan');wait(2);wait(puzzleSeconds);mitigate();r.command(`breach ${n.key}`);}
   if(n.file&&!n.taken){mitigate();r.command('siphon');while(r.transfer&&r.phase==='active')r.tick();}
   if(r.phase!=='active')break;
  }
  r.command('extract');if(r.phase==='won'){wins++;totalTime+=r.time;totalTrace+=r.trace;}
 }
 table.push({puzzleSeconds,policy,completed:`${wins}/100`,remainingSeconds:wins?Math.round(totalTime/wins):null,trace:wins?Math.round(totalTrace/wins):null});
}
console.table(table);
