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

// A campaign owns progression. Run owns all rules of one live intrusion.
export class Campaign {
  constructor(random = Math.random) {
    this.random=random;
    this.sector=1;
    this.modules=[];
    this.total=0;
    this.stage='playing';
    this.offers=[];
    this.adaptation='none';
    this.current=this.createRun();
  }
  createRun() {
    const anomaly=this.sector===1?ANOMALIES[0]:ANOMALIES[1+Math.floor(this.random()*2)];
    const links=NETWORKS[Math.floor(this.random()*NETWORKS.length)];
    return new Run(this.random,this.sector,{modules:this.modules,adaptation:this.adaptation,anomaly,links,final:this.sector===4});
  }
  resolve() {
    if(this.stage!=='playing'||!['won','lost'].includes(this.current.phase))return false;
    if(this.current.phase==='lost'){this.total=0;this.stage='lost';return true;}
    this.total+=this.current.score;
    const shard=this.current.loot.some(x=>x.id===6);
    if(!shard){this.stage='cashed';return true;}
    if(this.sector===4){this.total+=1000;this.stage='won';return true;}
    this.stage='draft';
    const remaining=DAEMONS.filter(x=>!this.modules.includes(x.id));
    for(let i=remaining.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[remaining[i],remaining[j]]=[remaining[j],remaining[i]];}
    this.offers=remaining.slice(0,3);
    this.adaptation=this.current.metrics.overloads>=2?'armor':this.current.loot.length>=2?'hunter':'observer';
    return true;
  }
  install(id) {
    if(this.stage!=='draft'||!this.offers.some(x=>x.id===id))return false;
    this.modules.push(id);
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
