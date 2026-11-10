export const LINKS = [[0,1],[0,2],[1,3],[1,4],[2,4],[2,5],[3,6],[4,6],[5,6]];
const HEX = '0123456789ABCDEF';
export const matches = (a, b) => [...a].filter((char, index) => char === b[index]).length;

export class Run {
  constructor(random = Math.random, sector = 1, config = {}) {
    this.random = random;
    this.sector = sector;
    this.modules = [...(config.modules || [])];
    this.adaptation = config.adaptation || 'none';
    this.anomaly = config.anomaly || {id:'standard',name:'Стабильный канал',description:'Базовые параметры сети.'};
    this.final = config.final || false;
    this.metrics = {overloads:0};
    this.phase = 'login';
    this.trace = 0;
    this.time = this.has('clock') ? 220 : 180;
    this.at = 0;
    this.tries = 3;
    this.loot = [];
    this.elapsed = 0;
    this.phantom = true;
    this.cooldown = 0;
    this.transfer = null;
    this.links = config.links || LINKS;
    this.auth = this.code();
    const swap = this.random() < .5;
    this.nodes = ['GATEWAY','RELAY-A','RELAY-B','VAULT-A','SENTINEL','VAULT-B','QUANTUM'].map((name, id) => {
      const challenge = this.makeChallenge();
      const premium = id === (swap ? 3 : 5);
      return {
        id, name, open: id === 0, scanned: false, visited: id === 0,
        ...challenge, guesses: [],
        file: id === 3 ? 'identity.db' : id === 5 ? 'blackledger.enc' : id === 6 ? 'quantum.shard' : null,
        size: id === 6 ? 640 : premium ? 460 : 260,
        transferTime: id === 6 ? 8 : premium ? 7 : 4,
        noise: id === 6 ? 2.6 : premium ? 3.2 : 1.5,
        breachRisk: (id === 4 ? 12 : 5 + Math.floor(this.random() * 5)) + (this.has('zip') ? 4 : 0) + (this.anomaly.id==='blackout' ? 3 : 0),
        taken: false,
      };
    });
    for (const n of this.nodes) {
      n.transferTime = Math.max(2, Math.ceil((n.transferTime + (this.has('leech') ? 2 : 0) - (this.anomaly.id==='compression' ? 2 : 0)) / (this.has('zip') ? 2 : 1)));
      if(this.anomaly.id==='compression')n.noise+=.8;
    }
  }

  has(id) { return this.modules.includes(id); }
  get overloadCost() { return 22 + (this.has('ghost') ? 6 : 0) - (this.has('ram') ? 12 : 0) + (this.adaptation==='armor' ? 8 : 0); }
  get patrolPeriod() { return this.adaptation==='hunter' ? 24 : 30; }
  get patrolRisk() { return this.has('clock') ? 11 : 7; }
  get scanCost() { return this.adaptation==='observer' ? 5 : 2; }
  get coreSealed() { return this.final && !this.loot.some(x=>x.id===3||x.id===5); }

  code() { return Array.from({length: 4}, () => HEX[Math.floor(this.random() * 16)]).join(''); }

  makeChallenge() {
    const key = this.code();
    const probeChars = [...key];
    const same = 1 + Math.floor(this.random() * 3);
    // Mutate a rotating set of positions, guaranteeing a unique solvable clue.
    const offset = Math.floor(this.random() * 4);
    for (let i = 0; i < 4 - same; i++) {
      const at = (offset + i) % 4;
      probeChars[at] = HEX[(HEX.indexOf(key[at]) + 1) % 16];
    }
    const probe = probeChars.join('');
    const options = [key];
    for (let i = 1; i < 4; i++) {
      const chars = [...probe];
      const count = (same + i) % 4;
      for (let j = count; j < 4; j++) chars[j] = HEX[(HEX.indexOf(chars[j]) + i + 1) % 16];
      options.push(chars.join(''));
    }
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return {key, probe, same, options};
  }

  adjacent(id) { return this.links.some(([a,b]) => (a === this.at && b === id) || (b === this.at && a === id)); }
  log(text, tone = 'info') { return {text, tone}; }
  end(win, reason) { this.phase = win ? 'won' : 'lost'; this.reason = reason; this.transfer = null; }
  risk(amount) {
    this.trace = Math.min(100, this.trace + amount);
    if (this.trace >= 100) this.end(false, 'Сигнал раскрыт. SENTINEL закрыл соединение.');
  }
  get passiveNoise() { return (.24 + Math.min(this.sector, 8) * .05) * (this.has('ghost') ? .6 : 1) * (this.has('ram') ? 1.5 : 1) * (this.anomaly.id==='blackout' ? .8 : 1); }
  get patrolIn() { return this.patrolPeriod - this.elapsed % this.patrolPeriod; }
  get transferRisk() {
    const n = this.nodes[this.at];
    return Math.ceil(n.noise * n.transferTime + Math.floor((this.elapsed % this.patrolPeriod + n.transferTime) / this.patrolPeriod) * this.patrolRisk);
  }

  command(raw) {
    if (!['login','active'].includes(this.phase)) return [];
    const [cmd, ...args] = raw.trim().toLowerCase().split(/\s+/);
    const arg = args.join(' ').toUpperCase();
    const n = this.nodes[this.at];
    if (cmd === 'help') return [this.log('scan · connect УЗЕЛ · breach КОД · overload · siphon · abort · scrub · phantom · extract. Эвакуация только через GATEWAY. ICE: выбери ключ с указанным числом совпадений по позиции.')];
    if (this.phase === 'login') {
      if (cmd === 'login' && arg === this.auth) {
        this.phase = 'active';
        return [this.log('Доступ разрешён. Выбери маршрут. Эвакуация — через GATEWAY.', 'success')];
      }
      if (cmd === 'scan') return [this.log(`Перехвачен токен авторизации: ${this.auth}. Введи login ${this.auth}`, 'success')];
      this.tries--;
      this.risk(8);
      if (this.tries <= 0) this.end(false, 'Три неверные попытки. Терминал заблокирован.');
      return [this.log(`Авторизация отклонена. Осталось попыток: ${this.tries}`, 'error')];
    }
    if (cmd === 'abort') {
      if (!this.transfer) return [this.log('Нет активной передачи.', 'warn')];
      this.transfer = null;
      return [this.log('Передача отменена. Незавершённый архив потерян, канал свободен.', 'warn')];
    }
    if (this.transfer) return [this.log('Идёт передача. Команда abort отменит копирование.', 'warn')];
    if (cmd === 'scan') {
      const first = !n.scanned;
      n.scanned = true;
      if (first) this.risk(this.scanCost);
      return [
        this.log(`${n.name}: ${n.open ? 'канал открыт' : `ICE / проба ${n.probe}: ${n.same}/4 совпадений ПО ПОЗИЦИИ. Кандидаты: ${n.options.join(' · ')}`}`, 'success'),
        this.log(n.file ? `${n.file} / ${n.size} MB. Передача ${n.transferTime} сек., риск около +${this.transferRisk}% с учётом патруля.` : n.id === 4 ? 'Контроллер патруля. При взломе снижает тревогу на 22% (однократно).' : 'Транзитный узел. Архивов нет.'),
      ];
    }
    if (cmd === 'connect') {
      const target = this.nodes.find(x => x.name === arg);
      if (!target || !this.adjacent(target.id)) return [this.log('Нет прямого соединения. Выбери соседний узел.', 'warn')];
      if (!n.open && !target.visited) return [this.log('ICE блокирует продвижение. Взломай узел или отступи на посещённый.', 'warn')];
      this.at = target.id;
      target.visited = true;
      this.risk(target.open ? (this.has('thread') ? 0 : 1) : (this.has('thread') ? 5 : 3));
      return [this.log(`Соединение: ${target.name}. ${target.open ? 'Канал открыт.' : 'Выполни scan для анализа ICE. Отступление доступно.'}`)];
    }
    if (cmd === 'breach' || cmd === 'overload') {
      if (n.open) return [this.log('Канал уже открыт.')];
      if(n.id===6 && this.coreSealed)return [this.log('ROOT-ICE запечатан. Сначала скопируй один боковой архив: в нём ключ подписи HELIX.', 'warn')];
      if (cmd === 'breach') {
        if (!n.scanned) return [this.log('Сначала выполни scan.', 'warn')];
        if (arg !== n.key) {
          if (n.guesses.includes(arg)) return [this.log('Этот кандидат уже отклонён. Нового штрафа нет.', 'warn')];
          n.guesses.push(arg);
          this.risk(14);
          return [this.log(`Ключ отклонён. Тревога +14%. Совпадений с пробой ${n.probe}: ${matches(arg, n.probe)}/4, нужно ${n.same}/4.`, 'error')];
        }
      }
      const cost = cmd === 'overload' ? this.overloadCost : n.breachRisk;
      if(cmd==='overload')this.metrics.overloads++;
      this.risk(cost);
      if (this.phase !== 'active') return [this.log('Взлом раскрыл соединение.', 'error')];
      n.open = true;
      if(cmd==='breach'&&this.has('leech'))this.trace=Math.max(0,this.trace-6);
      if (n.id === 4) this.trace = Math.max(0, this.trace - 22);
      return [this.log(`ICE отключён. Тревога +${cost}%.${n.id === 4 ? ' Контроллер подавлен: −22% тревоги.' : ''}`, 'success')];
    }
    if (cmd === 'siphon') {
      if (!n.open) return [this.log('Сначала отключи ICE.', 'warn')];
      if (!n.file || n.taken) return [this.log('Нет доступных архивов.', 'warn')];
      this.transfer = {id: n.id, remaining: n.transferTime, total: n.transferTime};
      return [this.log(`Копирование ${n.file}: ${n.transferTime} сек. Прогноз +${this.transferRisk}% тревоги. abort — отменить.`, 'warn')];
    }
    if (cmd === 'scrub') {
      if (this.cooldown > 0) return [this.log(`Очистка доступна через ${this.cooldown} сек.`, 'warn')];
      this.trace = Math.max(0, this.trace - 18);
      // The cost also advances patrols and cooldowns: no free world-time exploit.
      this.cooldown = 33;
      const events = [];
      for (let i = 0; i < 8 && this.phase === 'active'; i++) events.push(...this.tick());
      return [this.log('Следы очищены: −18% тревоги, затрачено 8 сек. времени сети.', 'success'), ...events];
    }
    if (cmd === 'phantom') {
      if (!this.phantom) return [this.log('Phantom уже использован.', 'warn')];
      this.phantom = false;
      this.trace = Math.max(0, this.trace - 30);
      return [this.log('PHANTOM: тревога −30%.', 'success')];
    }
    if (cmd === 'extract') {
      if (this.at !== 0) return [this.log('Эвакуация только через GATEWAY. Вернись по открытым узлам.', 'warn')];
      if (!this.loot.length) return [this.log('Сначала скопируй хотя бы один архив.', 'warn')];
      this.end(true, this.loot.some(x => x.id === 6) ? 'Quantum Shard доставлен. Основная цель выполнена.' : 'Частичная эвакуация. Добыча сохранена, Quantum Shard остался в сети.');
      return [this.log('Туннель закрыт. Эвакуация завершена.', 'success')];
    }
    // Syntax errors are feedback, not a penalty for learning the interface.
    return [this.log(`Неизвестная команда: ${cmd}. Введи help.`, 'warn')];
  }

  tick() {
    if (this.phase !== 'active') return [];
    this.time = Math.max(0, this.time - 1);
    this.elapsed++;
    this.cooldown = Math.max(0, this.cooldown - 1);
    this.risk(this.transfer ? this.nodes[this.transfer.id].noise : this.passiveNoise);
    const out = [];
    if (this.phase !== 'active') return out;
    if (this.time === 0) {
      this.end(false, 'Окно доступа закрыто. Время вышло.');
      return out;
    }
    if (this.elapsed % this.patrolPeriod === 0) {
      this.risk(this.patrolRisk);
      out.push(this.log(`SENTINEL: патруль обновил сигнатуры. Тревога +${this.patrolRisk}%.`, 'error'));
      if (this.phase !== 'active') return out;
    }
    if (this.transfer && --this.transfer.remaining <= 0) {
      const n = this.nodes[this.transfer.id];
      n.taken = true;
      this.loot.push({id: n.id, name: n.file, size: n.size});
      this.transfer = null;
      out.push(this.log(`Скопирован ${n.file}. Для эвакуации вернись в GATEWAY.`, 'success'));
    }
    return out;
  }

  get score() {
    if (this.phase !== 'won') return 0;
    return this.loot.reduce((sum,n) => sum + n.size, 0) + (this.loot.some(n => n.id === 6) ? 500 : 0) + this.time;
  }
}
