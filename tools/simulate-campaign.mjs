// Fixed-policy simulation, not a human win-rate estimate.
import {Campaign} from '../dist/rogue.mjs';
function rng(seed){return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);}
const rows=[];
for(const style of ['logic','ram']){
 let wins=0,score=0,depth=0;
 for(let seed=0;seed<200;seed++){
  const c=new Campaign(rng(seed*7919));
  while(c.stage==='playing'){
   const r=c.current;r.command(`login ${r.auth}`);
   const wait=n=>{for(let i=0;i<n;i++)r.tick();};
   const mitigate=()=>{if(r.trace>40&&r.phantom)r.command('phantom');if(r.trace>=55&&!r.cooldown)r.command('scrub');};
   const path=target=>{
    const q=[[r.at]],seen=new Set([r.at]);
    while(q.length){const p=q.shift(),last=p.at(-1);if(last===target)return p.slice(1);for(const[a,b]of r.links){const next=a===last?b:b===last?a:null;if(next!==null&&!seen.has(next)){seen.add(next);q.push([...p,next]);}}}
    throw Error('Disconnected map');
   };
   const travel=target=>{for(const id of path(target)){
    if(r.phase!=='active')return;
    mitigate();r.command(`connect ${r.nodes[id].name}`);wait(2);
    if(!r.nodes[id].open){
     if(style==='ram'&&r.has('ram')){mitigate();r.command('overload');wait(2);}
     else{r.command('scan');wait(2);wait(8);mitigate();r.command(`breach ${r.nodes[id].key}`);}
    }
   }};
   const download=()=>{mitigate();r.command('siphon');while(r.transfer&&r.phase==='active')r.tick();};
   if(r.final){travel(r.nodes[3].transferTime<=r.nodes[5].transferTime?3:5);download();}
   else travel(4);
   travel(6);download();travel(0);r.command('extract');
   depth+=1;c.resolve();
   if(c.stage==='draft'){
    const preference=style==='ram'?['ram','thread','clock','ghost','zip','leech']:['leech','ghost','zip','thread','clock','ram'];
    c.install(preference.find(id=>c.offers.some(x=>x.id===id)));
   }
  }
  if(c.stage==='won'){wins++;score+=c.total;}
 }
 rows.push({style,completed:`${wins}/200`,meanReachedSector:(depth/200).toFixed(2),meanVictoryScore:wins?Math.round(score/wins):0});
}
console.table(rows);
