import {Run,LINKS} from './engine.mjs';
const $=id=>document.getElementById(id);
let run=new Run(), sector=1, started=false, history=[], historyIndex=0, sound=false, audio;
let best=0;try{best=Number(localStorage.getItem('qrm-best'))||0;}catch{}
$('best').textContent=`ЛУЧШИЙ РЕЗУЛЬТАТ ${best||'—'}`;
const points=[[85,220],[240,110],[240,330],[410,65],[410,220],[410,375],[570,220]];
function beep(type='info'){if(!sound)return;try{audio??=new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=type==='error'?150:680;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.1);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.1);}catch{}}
function add(text,tone='info'){const line=document.createElement('div');line.className=`log ${tone}`;const time=document.createElement('time');time.textContent=started?new Date(run.elapsed*1000).toISOString().slice(14,19):'SYS';const p=document.createElement('p');p.textContent=text;line.append(time,p);$('logs').append(line);$('logs').scrollTop=$('logs').scrollHeight;}
function renderMap(){
 $('network').innerHTML=LINKS.map(([a,b])=>`<line class="edge ${a===run.at||b===run.at?'traversable':''}" x1="${points[a][0]}" y1="${points[a][1]}" x2="${points[b][0]}" y2="${points[b][1]}"/>`).join('')+run.nodes.map((n)=>{const [x,y]=points[n.id],current=n.id===run.at;return `<g class="map-node ${current?'current':''}" transform="translate(${x},${y})" data-id="${n.id}" role="button" tabindex="0" aria-label="${n.name}${current?', текущий узел':run.adjacent(n.id)?', доступен для подключения':', нет прямого соединения'}"><rect class="outer" x="-29" y="-29" width="58" height="58" rx="10" ${current?'':'visibility="hidden"'}/><rect x="-23" y="-23" width="46" height="46" rx="5"/><text class="node-glyph" text-anchor="middle" y="7">${n.taken?'✓':n.id===6?'◈':n.file?'▤':n.open?'⌘':'×'}</text>${n.file&&!n.taken?'<circle class="loot-dot" cx="23" cy="-23" r="3"/>':''}<text text-anchor="middle" y="44">${n.name}</text><text class="subtext" text-anchor="middle" y="58">${n.taken?'СКОПИРОВАНО':n.id===0?'ТОЧКА ВХОДА':n.file?`${n.size} MB`:n.open?'ДОСТУП ОТКРЫТ':'ICE / АКТИВЕН'}</text></g>`;}).join('');
}
function suggestions(){if(!started||!['active','login'].includes(run.phase))return [];
 if(run.phase==='login')return [`login ${run.auth}`];
 const n=run.nodes[run.at];let cmds=[];
 if(!n.scanned)cmds.push('scan');else if(!n.open)cmds.push(`breach ${n.key}`);
 if(n.open&&n.file&&!n.taken)cmds.push('siphon');
 if(n.open||!n.file)cmds.push(...run.nodes.filter(x=>run.adjacent(x.id)).map(x=>`connect ${x.name}`));
 if(run.trace>15)cmds.push('scrub');if(run.loot.length)cmds.push('extract');return cmds;
}
function render(){
 $('timer').textContent=`${String(Math.floor(run.time/60)).padStart(2,'0')}:${String(run.time%60).padStart(2,'0')}`;
 document.body.classList.toggle('danger',run.time<30||run.trace>75);
 $('trace-number').textContent=`${Math.floor(run.trace)}%`;$('trace-bar').style.width=`${run.trace}%`;$('trace-bar').style.background=run.trace>75?'var(--red)':run.trace>45?'var(--amber)':'var(--accent)';
 $('trace-caption').textContent=run.trace>75?'КРИТИЧЕСКИЙ УРОВЕНЬ / УХОДИ':run.trace>45?'SENTINEL ищет источник':'Сигнатура не обнаружена';
 $('data').innerHTML=`${run.loot.reduce((s,n)=>s+n.size,0)} <i>MB</i>`;$('files').textContent=`${run.loot.length} / 3 архивов`;
 const active=started&&run.phase==='active',n=run.nodes[run.at];
 $('phantom').disabled=!active||!run.phantom||!!run.transfer;$('phantom').firstChild.textContent=run.phantom?'СКРЫТЬ СИГНАТУРУ ':'ИСПОЛЬЗОВАНО ';
 $('connection').textContent=active?'CONNECTED':'OFFLINE';$('sector').textContent=String(sector).padStart(2,'0');
 $('map-state').textContent=active?`УЗЕЛ ${run.at+1} / 7`:'ОЖИДАНИЕ ДОСТУПА';$('node-name').textContent=n.name;$('node-status').textContent=!active?'АВТОРИЗАЦИЯ':n.open?'КАНАЛ ОТКРЫТ':'ICE АКТИВЕН';
 $('terminal-location').textContent=`ghost@${n.name.toLowerCase()}`;
 const shard=run.loot.some(x=>x.id===6);$('objective-dot').style.background=shard?'var(--accent)':'none';$('objective-text').textContent=shard?'quantum.shard / СКОПИРОВАН':'quantum.shard';
 $('transfer').hidden=!run.transfer;if(run.transfer)$('transfer').querySelector('progress').value=5-run.transfer.remaining;
 $('command').disabled=!started||!['login','active'].includes(run.phase);$('command-form').querySelector('button').disabled=$('command').disabled;
 $('commands').replaceChildren(...suggestions().map(cmd=>{const b=document.createElement('button');b.textContent=cmd;b.disabled=!!run.transfer;b.onclick=()=>execute(cmd);return b;}));
 renderMap();
 if(started&&['won','lost'].includes(run.phase)&&!$('result').open)finish();
}
function execute(raw){if(!raw.trim()||!started)return;history.push(raw);historyIndex=history.length;add(`❯ ${raw}`,'command');run.command(raw).forEach(x=>{add(x.text,x.tone);beep(x.tone);});$('command').value='';render();if(!$('result').open)$('command').focus({preventScroll:true});}
function begin(){run=new Run(Math.random,sector);history=[];historyIndex=0;started=true;$('logs').replaceChildren();add('QUANTUM REALMS // NEURAL LINK v0.7\n--------------------------------\nHELIX CORP / RESTRICTED NETWORK','banner');add('Прокси-туннель установлен. Таймер запустится после авторизации.');add(`Перехвачен токен: ${run.auth}. Введи login ${run.auth}`,'success');add('Подсказки под строкой ввода выполняют команды. Справка: help.');render();$('command').focus();}
function finish(){const win=run.phase==='won';$('result-label').textContent=win?'СОЕДИНЕНИЕ РАЗОРВАНО / ДАННЫЕ СОХРАНЕНЫ':'SENTINEL / СОЕДИНЕНИЕ ПОТЕРЯНО';$('result-title').textContent=win?'Ты вне системы.':'Тебя обнаружили.';$('result-reason').textContent=run.reason;$('result-score').textContent=win?run.score:0;$('result-files').textContent=win?run.loot.map(n=>`${n.name} / ${n.size} MB`).join(' · '):'Незакреплённые данные потеряны. Новый туннель — новая попытка.';$('again').textContent=win?'СЛЕДУЮЩАЯ ОПЕРАЦИЯ ↗':'ПОВТОРИТЬ ОПЕРАЦИЮ ↗';if(win){best=Math.max(best,run.score);try{localStorage.setItem('qrm-best',String(best));}catch{}$('best').textContent=`ЛУЧШИЙ РЕЗУЛЬТАТ ${best}`;}$('result').showModal();}
$('command-form').onsubmit=e=>{e.preventDefault();execute($('command').value);};
$('command').onkeydown=e=>{if(e.key==='ArrowUp'){e.preventDefault();historyIndex=Math.max(0,historyIndex-1);e.target.value=history[historyIndex]||'';}if(e.key==='ArrowDown'){e.preventDefault();historyIndex=Math.min(history.length,historyIndex+1);e.target.value=history[historyIndex]||'';}if(e.key==='Tab'){e.preventDefault();const val=e.target.value.toLowerCase();const match=[...suggestions(),'scan','scrub','phantom','extract','help'].find(x=>x.toLowerCase().startsWith(val));if(match)e.target.value=match;}};
function mapAction(e){const target=e.target.closest('[data-id]');if(target&&started&&run.phase==='active')execute(`connect ${run.nodes[Number(target.dataset.id)].name}`);}
$('network').onclick=mapAction;$('network').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();mapAction(e);}};
$('start').onclick=()=>{$('briefing').close();begin();};$('again').onclick=()=>{if(run.phase==='won')sector++;$('result').close();begin();};
$('restart').onclick=()=>{if(started&&['login','active'].includes(run.phase)){add('Чтобы завершить забег с добычей: extract. Для сброса введи restart.','warn');$('command').value='restart';$('command').focus();return;}sector=1;begin();};
const originalExecute=execute; // Restart is handled at the form boundary to keep the engine deterministic.
$('command-form').onsubmit=e=>{e.preventDefault();const raw=$('command').value;if(raw.trim().toLowerCase()==='restart'){begin();return;}originalExecute(raw);};
$('help').onclick=()=>{if(started)execute('help');else $('briefing').showModal();};$('phantom').onclick=()=>execute('phantom');
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'SOUND ON':'SOUND OFF';$('sound').setAttribute('aria-label',sound?'Выключить звук':'Включить звук');beep();};
$('briefing').addEventListener('cancel',e=>{e.preventDefault();$('briefing').close();begin();});$('result').addEventListener('cancel',e=>e.preventDefault());
let last=performance.now();setInterval(()=>{const now=performance.now();const ticks=Math.floor((now-last)/1000);if(ticks>0){last+=ticks*1000;for(let i=0;i<Math.min(ticks,200);i++)run.tick().forEach(x=>add(x.text,x.tone));render();}},200);
render();$('briefing').showModal();
