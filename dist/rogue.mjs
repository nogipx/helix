import {Run} from './engine.mjs';

export const DAEMONS = [
  {id:'ghost', name:'Тихий паразит', tag:'МАСКИРОВКА', benefit:'Пассивная трассировка −40%.', cost:'Перегрузка ICE стоит на 6% больше.'},
  {id:'leech', name:'Кровопийца', tag:'ЛОГИКА', benefit:'Верное решение ICE снимает 6% тревоги.', cost:'Каждая передача длится на 2 секунды дольше.'},
  {id:'ram', name:'Красный таран', tag:'ПЕРЕГРУЗКА', benefit:'overload стоит на 12% меньше.', cost:'Пассивная трассировка +50%.'},
  {id:'zip', name:'Голодный архиватор', tag:'ДОБЫЧА', benefit:'Копирование вдвое быстрее.', cost:'Правильный взлом ICE стоит на 4% больше.'},
  {id:'thread', name:'Нить Ариадны', tag:'МАРШРУТ', benefit:'Переход по открытым узлам не даёт тревоги.', cost:'Вход в закрытый узел: +5% вместо +3%.'},
  {id:'clock', name:'Краденая вечность', tag:'ВРЕМЯ', benefit:'Окно доступа длиннее на 40 секунд.', cost:'Каждый патруль добавляет ещё 4% тревоги.'},
];
export const ADAPTATIONS = {
  none:{name:'Чистая сигнатура', description:'HELIX ещё не знает твой стиль.'},
  armor:{name:'Керамический ICE', description:'За частые перегрузки: overload стоит ещё +8%.'},
  hunter:{name:'Охота за данными', description:'За сбор нескольких архивов: патруль каждые 24 секунды.'},
  observer:{name:'Глубокая инспекция', description:'За точечное проникновение: первое scan даёт +5% вместо +2%.'},
};
export const ANOMALIES = [
  {id:'standard', name:'Стабильный канал', description:'Базовые параметры сети.'},
  {id:'compression', name:'Сжатый поток', description:'Копирование короче на 2 сек., но шумнее на 0,8% в секунду.'},
  {id:'blackout', name:'Слепая зона', description:'Пассивная тревога −20%, правильный взлом дороже на 3%.'},
];
export const NETWORKS = [
  [[0,1],[0,2],[1,3],[1,4],[2,4],[2,5],[3,6],[4,6],[5,6]],
  [[0,1],[0,2],[1,3],[2,5],[3,4],[4,5],[3,6],[5,6]],
  [[0,1],[0,2],[1,4],[2,4],[4,3],[4,5],[3,6],[5,6]],
];

export const CONTRACTS = [
  {id:'quiet',name:'Тихий архив',time:180,pay:1,pressure:1,requiresArchive:false,description:'180 секунд. Обычная оплата. Укради Shard и вернись.'},
  {id:'hot',name:'Горячий сервер',time:140,pay:1.5,pressure:1.25,requiresArchive:false,description:'140 секунд, пассивная тревога +25%. Оплата ×1,5.'},
  {id:'deep',name:'Холодное хранилище',time:240,pay:1.4,pressure:1,requiresArchive:true,description:'240 секунд. Перед ядром нужен боковой архив. Оплата ×1,4.'},
];

// A campaign owns progression. Run owns all rules of one live intrusion.
export class Campaign {
  constructor(random = Math.random, config = {}) {
    this.random=random;
    this.sector=1;
    this.inventory=config.inventory||{};this.integrity=3;this.phantom=true;this.earned=0;
    this.contract=CONTRACTS[0];this.routes=[];
    this.modules=[];
    this.stage='playing';
    this.offers=[];
    this.adaptation='none';
    this.current=this.createRun();
  }
  createRun() {
    const anomaly=this.sector===1?ANOMALIES[0]:ANOMALIES[1+Math.floor(this.random()*2)];
    const links=NETWORKS[Math.floor(this.random()*NETWORKS.length)];
    return new Run(this.random,this.sector,{modules:this.modules,adaptation:this.adaptation,anomaly,links,final:this.sector===4,inventory:this.inventory,integrity:this.integrity,phantom:this.phantom,contract:this.contract});
  }
  resolve() {
    if(this.stage!=='playing'||!['won','lost'].includes(this.current.phase))return false;
    if(this.current.phase==='lost'){this.stage='lost';return true;}
    this.earned+=this.current.credits;
    this.integrity=this.current.integrity;this.phantom=this.current.phantom;
    const shard=this.current.loot.some(x=>x.id===6);
    if(!shard){this.stage='cashed';return true;}
    if(this.sector===4){this.stage='won';return true;}
    this.stage='draft';
    const routeStart=Math.floor(this.random()*CONTRACTS.length);
    this.routes=[CONTRACTS[routeStart],CONTRACTS[(routeStart+1)%CONTRACTS.length]];
    this.nextContract=this.routes[0];
    const remaining=DAEMONS.filter(x=>!this.modules.includes(x.id));
    for(let i=remaining.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[remaining[i],remaining[j]]=[remaining[j],remaining[i]];}
    this.offers=remaining.slice(0,3);
    this.adaptation=this.current.metrics.overloads>=2?'armor':this.current.loot.length>=2?'hunter':'observer';
    return true;
  }
  selectContract(id){if(this.stage!=='draft')return false;const contract=this.routes.find(x=>x.id===id);if(!contract)return false;this.nextContract=contract;return true;}
  install(id) {
    if(this.stage!=='draft'||!this.offers.some(x=>x.id===id))return false;
    this.modules.push(id);this.contract=this.nextContract;
    this.sector++;
    this.stage='playing';
    this.offers=[];
    this.current=this.createRun();
    return true;
  }
  cashOut() {
    if(this.stage!=='draft')return false;
    this.stage='cashed';this.offers=[];return true;
  }
}
