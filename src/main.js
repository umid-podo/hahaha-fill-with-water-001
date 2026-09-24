import { CONFIG as C } from './config.js';
import { Match } from './state.js';
import { Renderer, loadAssets } from './render.js';
import { installInput } from './input.js';
const $ = id => document.getElementById(id);
const colors = { sunny: ['노랑', '#f5ca62'], coral: ['코랄', '#f29b89'], sky: ['하늘', '#a3d9e8'] };
let chosenColors = ['sunny', 'coral'];
let match, renderer, phase = 'setup', previousPhase, countdown = 0, lastFrame = performance.now();
let saved;
try { saved = JSON.parse(localStorage.getItem('water-friends')); } catch { /* Storage is optional. */ }
if (Array.isArray(saved) && saved.length === 2) saved.forEach((p, i) => {
  if (!p || typeof p !== 'object') return;
  if (typeof p.name === 'string') $(`name-${i}`).value = p.name.slice(0, 12);
  if (Object.hasOwn(colors, p.color)) chosenColors[i] = p.color;
});
for (const picker of document.querySelectorAll('.color-picker')) {
  const player = Number(picker.dataset.player);
  picker.setAttribute('role', 'radiogroup'); picker.setAttribute('aria-label', `친구 ${player + 1} 컵 색`);
  for (const [key, [label, color]] of Object.entries(colors)) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'color-option'; button.style.background = color;
    button.setAttribute('role', 'radio'); button.setAttribute('aria-label', `${label} 컵`);
    button.dataset.color = key;
    button.addEventListener('click', () => { chosenColors[player] = key; updateColors(); });
    picker.append(button);
  }
}
function updateColors() {
  document.querySelectorAll('.color-picker').forEach(picker => {
    const i = Number(picker.dataset.player);
    picker.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', b.dataset.color === chosenColors[i]));
    $(`cup-preview-${i}`).src = `assets/props/cup-${chosenColors[i]}.svg`;
    $(`cup-preview-${i}`).alt = `${colors[chosenColors[i]][0]} 컵`;
  });
}
updateColors();
for (const [id, type, keys] of [['cup-controls', 'cup', ['A', 'S', 'D']], ['source-controls', 'source', ['←', '↓', '→']]]) {
  ['left', 'center', 'right'].forEach((direction, lane) => {
    const button = document.createElement('button'); button.className = 'lane-button';
    button.dataset.command = type; button.dataset.lane = lane;
    button.setAttribute('aria-label', `${type === 'cup' ? '컵' : '물줄기'} ${['왼쪽', '가운데', '오른쪽'][lane]} (${keys[lane]})`);
    button.innerHTML = `<img src="assets/ui/lane-${direction}.svg" alt=""><span>${['좌', '중앙', '우'][lane]}</span><kbd>${keys[lane]}</kbd>`;
    $(id).append(button);
  });
}
$('dirty-button').dataset.command = 'dirty';
const input = installInput({ command, pause });
function screen(id) { ['setup', 'game', 'result'].forEach(name => $(name).hidden = name !== id); }
function focusHeading() { const heading = $('result').querySelector('h1'); heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
function startMatch(players, startingPlayer = 0) {
  match = new Match(players, startingPlayer); beginCountdown();
}
function beginCountdown() {
  phase = 'countdown'; countdown = 0; lastFrame = performance.now(); input.clear();
  screen('game'); $('pause-button').focus({ preventScroll: true });
  const receiver = match.players[match.receiver], disruptor = match.players[match.disruptor];
  $('round-label').textContent = `ROUND 0${match.roundIndex + 1} / 02`;
  $('receiver-label').textContent = `${receiver.name}의 도전`;
  $('receiver-name').textContent = receiver.name; $('disruptor-name').textContent = disruptor.name;
  updateGame();
}
$('setup-form').addEventListener('submit', event => {
  event.preventDefault(); if (!renderer || phase !== 'setup') return;
  const players = [0, 1].map(i => ({ name: $(`name-${i}`).value.trim() || `친구 ${i + 1}`, color: chosenColors[i] }));
  try { localStorage.setItem('water-friends', JSON.stringify(players)); } catch { /* Play without persistence. */ }
  startMatch(players);
});
function command(type, lane) {
  if (phase !== 'playing') return;
  const now = performance.now();
  match.sim.advance(match.sim.time + now - lastFrame, [{ type, lane }]); lastFrame = now;
  if (match.sim.finished) endRound(); else updateGame();
}
function tick(now) {
  const delta = Math.max(0, now - lastFrame); lastFrame = now;
  if (phase === 'countdown') {
    countdown += delta;
    if (countdown >= C.countdownMs) {
      phase = 'playing'; match.sim.advance(countdown - C.countdownMs);
    }
    updateGame();
  } else if (phase === 'playing') {
    match.sim.advance(match.sim.time + delta);
    if (match.sim.finished) endRound(); else updateGame();
  }
  requestAnimationFrame(tick);
}
function updateGame() {
  const sim = match.sim;
  $('timer').textContent = `00:${String(Math.ceil((C.roundMs - sim.time) / 1000)).padStart(2, '0')}`;
  $('timer').parentElement.classList.toggle('urgent', sim.time >= C.roundMs - 10000);
  $('score').textContent = sim.score.toLocaleString('ko-KR');
  document.querySelectorAll('[data-command="cup"]').forEach(b => {
    b.disabled = phase !== 'playing'; b.setAttribute('aria-pressed', Number(b.dataset.lane) === (sim.cupMove?.to ?? sim.cupLane));
  });
  document.querySelectorAll('[data-command="source"]').forEach(b => {
    b.disabled = phase !== 'playing' || Boolean(sim.sourceLocked) || sim.time < sim.sourceMoveReadyAt;
    b.setAttribute('aria-pressed', Number(b.dataset.lane) === sim.sourceLane);
    b.querySelector('kbd').textContent = sim.sourceLocked ? '잠금' : sim.time < sim.sourceMoveReadyAt ? `${((sim.sourceMoveReadyAt - sim.time) / 1000).toFixed(1)}s` : ['←', '↓', '→'][Number(b.dataset.lane)];
  });
  $('source-status').textContent = sim.sourceLocked ? '똥물 발사까지 위치 고정!' : sim.time < sim.sourceMoveReadyAt ? `${((sim.sourceMoveReadyAt - sim.time) / 1000).toFixed(1)}초 뒤 이동` : '물줄기를 옮겨요!';
  $('dirty-button').disabled = phase !== 'playing' || !sim.dirtyAvailable;
  $('dirty-status').textContent = sim.dirtyUsesRemaining === 0 ? '모두 사용했어요' : `${sim.dirtyAvailable ? '준비 완료' : `${Math.ceil((sim.dirtyReadyAt - sim.time) / 1000)}초`} · ${sim.dirtyUsesRemaining}회`;
  const count = phase === 'countdown' ? String(Math.max(1, Math.ceil((C.countdownMs - countdown) / 1000))) : '';
  if ($('arena-message').dataset.count !== count) {
    $('arena-message').dataset.count = count;
    $('arena-message').replaceChildren();
    if (count) {
      const label = document.createElement('small'); label.textContent = `${match.players[match.receiver].name} · A S D로 물 받기`;
      $('arena-message').append(label, document.createTextNode(count));
    }
  }
  renderer.draw(sim, match.players[match.receiver].color);
}
function pause() {
  if (!['playing', 'countdown'].includes(phase)) return;
  // Settle elapsed active time before freezing it.
  const now = performance.now();
  if (phase === 'playing') {
    match.sim.advance(match.sim.time + now - lastFrame);
    if (match.sim.finished) { endRound(); return; }
  } else countdown += now - lastFrame;
  previousPhase = phase; phase = 'paused'; input.clear(); lastFrame = now;
  $('pause-dialog').showModal();
}
function resume() {
  if (phase !== 'paused') return;
  $('pause-dialog').close(); phase = previousPhase; lastFrame = performance.now(); input.clear();
  $('pause-button').focus({ preventScroll: true });
}
$('pause-button').addEventListener('click', pause);
$('resume-button').addEventListener('click', resume);
$('pause-dialog').addEventListener('cancel', e => { e.preventDefault(); resume(); });
$('quit-button').addEventListener('click', () => { $('pause-dialog').close(); goHome(); });
$('help-button').addEventListener('click', () => { pause(); $('help-dialog').showModal(); });
$('help-close').addEventListener('click', () => $('help-dialog').close());
function goHome() { phase = 'setup'; match = null; input.clear(); screen('setup'); $('start-button').focus(); }
// Player names are always assigned through textContent, never interpolated as markup.
function endRound() {
  match.finishRound(); phase = match.roundIndex === 0 ? 'round-result' : 'match-result'; input.clear(); screen('result');
  const roundResult = phase === 'round-result';
  $('result').innerHTML = `<div class="result-illustration"><img class="result-friend" src="assets/characters/friend-idle.png" alt="축하하는 동그란 친구">${roundResult ? '' : '<img class="result-crown" src="assets/ui/winner-crown.svg" alt="우승 왕관">'}</div><div class="eyebrow">${roundResult ? 'HALF TIME · SWITCH IT UP' : 'GOOD GAME · WELL PLAYED'}</div><h1></h1><p class="result-description"></p><div class="result-cards"></div><div class="result-actions"></div>`;
  $('result').querySelector('h1').textContent = roundResult ? '이번엔 역할 바꾸기!' : match.winner === null ? '둘 다 최고! 공동 우승' : `${match.players[match.winner].name} 승리!`;
  $('result').querySelector('.result-description').textContent = roundResult ? `${match.players[match.receiver].name}, ${match.sim.score.toLocaleString()}mL를 받았어요! 두 친구 모두 준비하면 다음 라운드를 시작해요.` : '한 방울 한 방울, 멋진 승부였어요. 한 판 더 해볼까요?';
  match.players.forEach((player, i) => {
    const card = document.createElement('article'); card.className = 'result-card';
    if (!roundResult && (match.winner === i || match.winner === null)) card.classList.add('winner');
    const image = document.createElement('img'); image.src = `assets/props/cup-${player.color}.svg`; image.alt = `${colors[player.color][0]} 컵`; image.className = 'mini-cup';
    const name = document.createElement('h2'); name.textContent = player.name;
    card.append(image, name);
    if (roundResult) {
      const receivingNext = i === match.disruptor;
      const role = document.createElement('p'); role.textContent = receivingNext ? '이번엔 물 받기!\n키보드 A / S / D' : '이번엔 방해하기!\n방향키 ← / ↓ / → · Space'; role.style.whiteSpace = 'pre-line';
      const ready = document.createElement('button'); ready.className = 'ready-button'; ready.textContent = '준비 완료'; ready.setAttribute('aria-label', `${player.name} 준비 완료`);
      ready.addEventListener('click', () => { match.ready[i] = true; ready.disabled = true; ready.textContent = '✓ 준비됐어요'; if (match.ready.every(Boolean)) { match.nextRound(); beginCountdown(); } });
      card.append(role, ready);
    } else {
      const score = document.createElement('strong'); score.textContent = match.scores[i].toLocaleString(); const unit = document.createElement('small'); unit.textContent = ' mL'; score.append(unit); card.append(score);
    }
    $('result').querySelector('.result-cards').append(card);
  });
  const actions = $('result').querySelector('.result-actions');
  if (!roundResult) {
    const replay = document.createElement('button'); replay.className = 'primary-button'; replay.textContent = '한 판 더! ↗'; replay.addEventListener('click', () => startMatch(match.players, 1 - match.startingPlayer)); actions.append(replay);
  }
  const home = document.createElement('button'); home.className = 'text-button'; home.textContent = '처음으로'; home.addEventListener('click', goHome); actions.append(home);
  focusHeading();
}
try {
  renderer = new Renderer($('arena'), await loadAssets());
  $('start-button').disabled = false; $('start-button').innerHTML = '대결 시작! <span>↗</span>';
  requestAnimationFrame(tick);
} catch (error) {
  $('start-button').textContent = '새로고침 후 다시 시도해 주세요';
  $('load-error').hidden = false; $('load-error').textContent = error.message;
}
