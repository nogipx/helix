export const LINKS = [[0,1],[0,2],[1,3],[1,4],[2,4],[2,5],[3,6],[4,6],[5,6]];
export class Run {
  constructor(random = Math.random, sector = 1) {
    this.random=random; this.sector=sector; this.phase='login'; this.trace=0; this.time=180; this.at=0; this.tries=3; this.loot=[]; this.elapsed=0; this.phantom=true; this.cooldown=0; this.transfer=null;
    this.code=()=>Math.floor(this.random()*65536).toString(16).padStart(4,'0').toUpperCase();
    this.auth=this.code();
    this.nodes=['GATEWAY','RELAY-A','RELAY-B','VAULT-A','SENTINEL','VAULT-B','QUANTUM'].map((name,id)=>({id,name,open:id===0,scanned:false,key:this.code(),file:id===3?'identity.db':id===5?'blackledger.enc':id===6?'quantum.shard':null,size:id===6?640:240+Math.floor(this.random()*150),taken:false}));
  }
  adjacent(id) {return LINKS.some(([a,b])=>(a===this.at&&b===id)||(b===this.at&&a===id));}
  log(text,tone='info') {return {text,tone};}
  end(win,reason) {this.phase=win?'won':'lost';this.reason=reason;this.transfer=null;}
  risk(amount) {this.trace=Math.min(100,this.trace+amount); if(this.trace>=100)this.end(false,'Сигнал раскрыт. SENTINEL закрыл соединение.');}
  command(raw) {
    if(!['login','active'].includes(this.phase)) return [];
    const [cmd,...args]=raw.trim().toLowerCase().split(/\s+/); const arg=args.join(' ').toUpperCase(); const n=this.nodes[this.at]; const out=[];
    if(cmd==='help') return [this.log('login КОД · scan · connect УЗЕЛ · breach КОД · siphon · scrub · phantom · extract')];
    if(this.phase==='login') {
      if(cmd==='login' && arg===this.auth){this.phase='active';return [this.log('Доступ разрешён. Просканируй шлюз: scan','success')];}
      if(cmd==='scan')return [this.log(`Перехвачен токен авторизации: ${this.auth}. Введи login ${this.auth}`,'success')];
      this.tries--;this.risk(8);if(this.tries<=0)this.end(false,'Три неверные попытки. Терминал заблокирован.');return [this.log(`Авторизация отклонена. Осталось попыток: ${this.tries}`,'error')];
    }
    if(this.transfer && cmd!=='help')return [this.log('Передача данных: дождись завершения.','warn')];
    if(cmd==='scan') {
      n.scanned=true; this.risk(3);
      out.push(this.log(`${n.name}: ${n.open?'защита отключена':`ключ ICE — ${n.key}`}. ${n.file?(n.taken?'Архив уже скопирован.':`Найден ${n.file} / ${n.size} MB.`):'Архивов нет.'}`,'success'));
      out.push(this.log('Доступные маршруты: '+this.nodes.filter(x=>this.adjacent(x.id)).map(x=>x.name).join(' · ')));return out;
    }
    if(cmd==='connect') {
      if(!n.open)return [this.log('ICE блокирует маршрутизацию. Отключи защиту этого узла.','warn')];
      const target=this.nodes.find(x=>x.name===arg);
      if(!target || !this.adjacent(target.id))return [this.log('Узел недоступен. Выбери соседний узел на карте.','warn')];
      this.at=target.id;this.risk(4);return [this.log(`Соединение: ${target.name}. ${target.open?'Доступ открыт.':'Обнаружен ICE. Выполни scan, затем breach КОД.'}`)];
    }
    if(cmd==='breach') {
      if(n.open)return [this.log('Защита этого узла уже отключена.')];
      if(!n.scanned)return [this.log('Сначала просканируй узел: scan','warn')];
      if(arg!==n.key){this.risk(16);return [this.log('Неверный ключ. ICE усилил трассировку: +16%.','error')];}
      n.open=true;this.risk(7);return [this.log('ICE отключён. Канал открыт.','success')];
    }
    if(cmd==='siphon') {
      if(!n.open)return [this.log('Сначала отключи ICE: breach КОД','warn')];
      if(!n.file || n.taken)return [this.log('Нет доступных архивов.','warn')];
      this.transfer={id:n.id,remaining:5};return [this.log(`Копирование ${n.file}. Удерживай соединение 5 секунд…`,'warn')];
    }
    if(cmd==='scrub') {
      if(this.cooldown>0)return [this.log(`Очистка доступна через ${this.cooldown} сек.`, 'warn')];
      this.trace=Math.max(0,this.trace-18);this.time=Math.max(0,this.time-8);this.cooldown=25;
      if(this.time===0)this.end(false,'Окно доступа закрыто. Время вышло.');
      return [this.log('Следы очищены: −18% тревоги, −8 сек. окна доступа.','success')];
    }
    if(cmd==='phantom') {
      if(!this.phantom)return [this.log('Phantom уже использован.','warn')];
      this.phantom=false;this.trace=Math.max(0,this.trace-30);return [this.log('PHANTOM: подпись скрыта. Тревога −30%.','success')];
    }
    if(cmd==='extract') {
      if(!this.loot.length)return [this.log('Сначала скопируй хотя бы один архив.','warn')];
      this.end(true,this.loot.some(x=>x.id===6)?'Quantum Shard у нас. Баланс сил изменился.':'Данные сохранены. Центральный архив остался в сети.');
      return [this.log('Туннель закрыт. Эвакуация завершена.','success')];
    }
    this.risk(5);return [this.log(`Неизвестная команда: ${cmd}. Введи help. Тревога +5%.`,'error')];
  }
  tick() {
    if(this.phase!=='active')return [];
    this.time=Math.max(0,this.time-1);this.elapsed++;this.cooldown=Math.max(0,this.cooldown-1);
    this.risk(this.transfer?1.8:0.28+this.sector*0.06);const out=[];
    if(this.phase==='lost')return out;
    if(this.time===0){this.end(false,'Окно доступа закрыто. Время вышло.');return out;}
    if(this.transfer && --this.transfer.remaining<=0){const n=this.nodes[this.transfer.id];n.taken=true;this.loot.push({id:n.id,name:n.file,size:n.size});this.transfer=null;out.push(this.log(`Скопирован ${n.file}. Можно эвакуироваться: extract`,'success'));}
    if(this.elapsed%30===0){this.risk(7);out.push(this.log('SENTINEL: патруль обновил сигнатуры. Тревога +7%.','error'));}
    return out;
  }
  get score(){return this.loot.reduce((sum,n)=>sum+n.size,0)+(this.loot.some(n=>n.id===6)?500:0)+(this.phase==='won'?Math.floor(this.time*2):0);}
}
