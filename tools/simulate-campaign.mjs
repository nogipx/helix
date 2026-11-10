// Fixed policies know the graph and ICE answers: this is not a human playtest.
import {Campaign} from '../dist/rogue.mjs';
import {Account} from '../dist/economy.mjs';
function rng(seed){return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);}
const rows=[];
for(const style of ['logic','ram']){
 let wins=0,earned=0,depth=0;
 for(let seed=0;seed<200;seed++){
  const account=new Account(),c=new Campaign(rng(seed*7919),{inventory:account.inventory});
  while(c.stage==='playing'){
   while(account.load<3&&account.credits>=70)account.buy('emp');
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
    mitigate();r.command('recon');r.command(`connect ${r.nodes[id].name}`);wait(2);
    if(r.at!==id){r.end(false,'Fixed policy could not follow its route');return;}
    if(!r.nodes[id].open){
     if(account.inventory.emp&&(r.trace>55||(style==='ram'&&r.has('ram')))){r.command('use emp');wait(2);}
     else if(style==='ram'&&r.has('ram')){mitigate();r.command('overload');wait(2);}
     else{r.command('scan');wait(2);wait(8);mitigate();r.command(`breach ${r.nodes[id].key}`);}
    }
   }};
   const download=()=>{mitigate();r.command('scan');r.command('siphon');while(r.transfer&&r.phase==='active')r.tick();};
   if(r.coreSealed){travel(r.nodes[3].transferTime<=r.nodes[5].transferTime?3:5);download();}
   else travel(4);
   travel(6);download();travel(0);r.command('extract');
   if(r.phase==='active')r.end(false,'Fixed policy failed its extraction objective');
   depth++;if(r.phase==='won')account.settle(`${seed}:${c.sector}`,r.credits);c.resolve();
   if(c.stage==='draft'){
    const route=c.routes.find(x=>x.id===(style==='ram'?'hot':'quiet'))||c.routes.find(x=>x.id==='deep')||c.routes[0];c.selectContract(route.id);
    const preference=style==='ram'?['ram','thread','clock','ghost','zip','leech']:['leech','ghost','zip','thread','clock','ram'];
    c.install(preference.find(id=>c.offers.some(x=>x.id===id)));
   }
  }
  if(c.stage==='won'){wins++;earned+=c.earned;}
 }
 rows.push({style,completed:`${wins}/200`,meanReachedSector:(depth/200).toFixed(2),meanGrossCredits:wins?Math.round(earned/wins):0});
}
console.table(rows);
