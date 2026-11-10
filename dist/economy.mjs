export const TOOLS = [
  {id:'sniffer',name:'Сниффер',price:35,description:'Раскрывает маршруты и классы узлов за известной границей. ICE и содержимое архивов скрыты.'},
  {id:'emp',name:'EMP-инъектор',price:70,description:'Открывает текущий ICE без тревоги. Не снимает печать финального ядра.'},
  {id:'tunnel',name:'Аварийный туннель',price:80,description:'Эвакуация с добычей из любого открытого узла. Расходуется один заряд.'},
  {id:'patch',name:'Нейропластырь',price:50,description:'Восстанавливает одну единицу целостности нейроинтерфейса.'},
];
const KEY='qrm-wallet-v1';
export class Account {
  constructor(storage){
    this.storage=storage;this.credits=120;this.inventory={};this.settled=[];this.saved=true;this.active=null;this.interrupted=false;
    try{
      const data=JSON.parse(storage?.getItem(KEY)||'null');
      if(data&&Number.isSafeInteger(data.credits)&&data.credits>=0){
        this.credits=data.credits;
        this.inventory=Object.fromEntries(TOOLS.map(t=>[t.id,Math.max(0,Math.min(3,Number.isInteger(data.inventory?.[t.id])?data.inventory[t.id]:0))]));
        if(this.load>3)this.inventory={};
        this.settled=Array.isArray(data.settled)?data.settled.filter(x=>typeof x==='string').slice(-200):[];
        if(data.active){this.inventory={};this.active=null;this.interrupted=true;this.save();}
      }
    }catch{this.saved=false;}
  }
  get load(){return Object.values(this.inventory).reduce((sum,n)=>sum+n,0);}
  save(){try{if(!this.storage)throw Error('Storage unavailable');this.storage.setItem(KEY,JSON.stringify({credits:this.credits,inventory:this.inventory,settled:this.settled,active:this.active}));this.saved=true;}catch{this.saved=false;}}
  buy(id){const tool=TOOLS.find(t=>t.id===id);if(!tool||this.credits<tool.price||this.load>=3)return false;this.credits-=tool.price;this.inventory[id]=(this.inventory[id]||0)+1;this.save();return true;}
  settle(id,amount){if(this.settled.includes(id)||!Number.isSafeInteger(amount)||amount<0)return false;this.credits+=amount;this.settled.push(id);this.settled=this.settled.slice(-200);this.save();return true;}
  loseKit(){this.active=null;for(const key of Object.keys(this.inventory))delete this.inventory[key];this.save();}
}
