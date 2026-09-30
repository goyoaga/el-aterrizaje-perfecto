import { play, setEnabled, setTheme, setVolume } from 'cuelume';
import { WORLD, FLIGHT_SECONDS, flightX, landing, newRound, waitingX, windLabel } from './model.js';
import './style.css';

// Audio is opt-in for every page load, including a returning visitor.
setEnabled(false);
setTheme('bubble');
setVolume(0.55);

const $ = (id) => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let audioOn = false;
let best = Infinity;
try {
  const saved = Number(localStorage.getItem('aterrizaje-perfecto-best'));
  if (Number.isFinite(saved) && saved >= 0 && localStorage.getItem('aterrizaje-perfecto-best') !== null) best = saved;
} catch { /* Private browsing can block storage; the game remains playable. */ }

let round;
let roundNumber = 0;
let roundStarted = 0;
let releaseX = 0;
let flightStarted = 0;
let finalResult = null;
let phase = 'ready';
let renderedFrame = 0;

function sound(name, options = {}) {
  if (!audioOn) return;
  try { play(name, options); } catch { /* Optional sound never blocks a round. */ }
}

function updatePhase() {
  $('ready').hidden = phase !== 'ready';
  $('flying').hidden = phase !== 'flying';
  $('result').hidden = phase !== 'result';
  $('scene-label').textContent = phase === 'ready' ? 'TOCA PARA SOLTAR EL AVIÓN' : phase === 'flying' ? 'EN VUELO · UN SOLO INTENTO' : 'ATERRIZAJE REGISTRADO';
  $('scene').classList.toggle('can-launch', phase === 'ready' && !!ctx);
}

function startRound() {
  const previous = round;
  round = newRound();
  if (previous && round.targetX === previous.targetX && round.wind === previous.wind) round.targetX = round.targetX === 760 ? 759 : round.targetX + 1;
  roundNumber++;
  phase = 'ready';
  finalResult = null;
  roundStarted = performance.now();
  $('round-label').textContent = `VUELO ${String(roundNumber).padStart(2, '0')}`;
  $('wind').textContent = windLabel(round.wind);
  $('scene-overlay').replaceChildren();
  updatePhase();
  $('launch').focus({ preventScroll: true });
}

function launch() {
  if (phase !== 'ready' || !ctx) return;
  const now = performance.now();
  releaseX = waitingX(now - roundStarted);
  flightStarted = now;
  phase = 'flying';
  updatePhase();
  sound('navigate', { volume: 0.6 });
  if (reduceMotion.matches) finish();
}

function celebrate() {
  if (reduceMotion.matches) return;
  const layer = $('scene-overlay');
  const colors = ['#c56e4b', '#e5bc73', '#85a99d', '#f8f1d9', '#456a6a'];
  for (let i = 0; i < 30; i++) {
    const piece = document.createElement('i');
    piece.className = 'confetti';
    piece.style.left = `${30 + Math.random() * 48}%`;
    piece.style.top = `${25 + Math.random() * 22}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty('--dx', `${(Math.random() - 0.5) * 280}px`);
    piece.style.setProperty('--dy', `${100 + Math.random() * 180}px`);
    piece.style.animationDelay = `${Math.random() * 0.18}s`;
    layer.append(piece);
  }
  setTimeout(() => layer.replaceChildren(), 1650);
}

function trackCompletedRound() {
  try { window.goatcounter?.count?.({ path: 'ronda-completada', title: 'Ronda completada', event: true, no_session: true }); }
  catch { /* Analytics is optional and never affects play. */ }
}

function finish() {
  if (phase !== 'flying') return;
  finalResult = landing(releaseX, round);
  phase = 'result';
  const messages = { perfect: '¡Aterrizaje perfecto!', near: '¡Casi lo tienes!', good: 'Buen intento.', far: 'Una más y sale.' };
  $('verdict').textContent = messages[finalResult.category];
  $('distance').textContent = String(Math.round(finalResult.error));
  $('side').textContent = finalResult.error < 0.5 ? 'Justo en el centro.' : finalResult.offset < 0 ? 'Aterrizó antes del centro.' : 'Aterrizó después del centro.';
  if (finalResult.error < best) {
    best = finalResult.error;
    try { localStorage.setItem('aterrizaje-perfecto-best', String(best)); } catch { /* Session-only best. */ }
  }
  $('best').textContent = `MEJOR MARCA PERSONAL · ${Math.round(best)} CM`;
  updatePhase();
  if (window.innerWidth <= 700) $('result').scrollIntoView({ block: 'nearest', behavior: reduceMotion.matches ? 'instant' : 'smooth' });
  sound(finalResult.category === 'perfect' ? 'success' : 'ready', { emphasis: finalResult.category === 'perfect' ? 'strong' : 'subtle' });
  if (finalResult.category === 'perfect') celebrate();
  trackCompletedRound();
}

function path(points, fill, stroke, width = 1) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

function ellipse(x, y, rx, ry, fill, stroke, width = 1) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

function drawBackdrop(now) {
  const sky = ctx.createLinearGradient(0, 0, 0, 640);
  sky.addColorStop(0, '#e7eee9'); sky.addColorStop(0.57, '#f4f2ea'); sky.addColorStop(1, '#e9e8dc');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 1000, 800);
  ellipse(805, 123, 80, 80, 'rgba(232,188,119,.34)');
  // A couple of paper-like layers make depth without affecting the scoring axis.
  path([[0, 455], [250, 432], [525, 470], [780, 425], [1000, 448], [1000, 800], [0, 800]], '#dce7de');
  path([[0, 535], [260, 505], [620, 533], [1000, 487], [1000, 800], [0, 800]], '#c4d7cc');
  path([[0, 605], [1000, 578], [1000, 800], [0, 800]], '#e6dcca');
  ctx.strokeStyle = 'rgba(68,92,80,.13)'; ctx.lineWidth = 2;
  for (let i = 0; i <= 5; i++) {
    ctx.beginPath(); ctx.moveTo(i * 220 - 25, 590); ctx.lineTo(i * 220 - 175, 800); ctx.stroke();
  }
  const windShift = Math.sin(now / 2500) * 7;
  ctx.fillStyle = 'rgba(255,255,255,.57)';
  ellipse(150 + windShift, 175, 104, 18, ctx.fillStyle);
  ellipse(335 + windShift * 0.5, 270, 70, 12, ctx.fillStyle);
  ctx.save(); ctx.font = '600 16px sans-serif'; ctx.letterSpacing = '3px'; ctx.fillStyle = '#608176';
  ctx.fillText('UN SOLO INTENTO', 62, 65);
  ctx.restore();
}

function drawTarget(x) {
  ellipse(x + 14, 636, 119, 35, 'rgba(51,62,49,.14)');
  ellipse(x, WORLD.groundY, 102, 32, '#f7eee0', '#7f9b91', 3);
  ellipse(x, WORLD.groundY, 87, 27, '#be7154');
  ellipse(x, WORLD.groundY, 58, 18, '#f4eee0');
  ellipse(x, WORLD.groundY, 38, 12, '#d3a766');
  ellipse(x, WORLD.groundY, 11, 5, '#274e50');
  ctx.strokeStyle = 'rgba(255,255,255,.56)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, WORLD.groundY - 2, 99, 30, 0, Math.PI * 1.1, Math.PI * 1.94); ctx.stroke();
  ctx.fillStyle = '#53655a'; ctx.font = '600 15px sans-serif'; ctx.letterSpacing = '2px';
  ctx.textAlign = 'center'; ctx.fillText('CENTRO', x, 687); ctx.textAlign = 'left';
}

function drawPlane(x, y, tilt, progress) {
  const shadowWidth = 27 + progress * 54;
  ellipse(x + 16, WORLD.groundY + 34, shadowWidth, 8 + progress * 9, `rgba(47,61,50,${0.09 + progress * 0.15})`);
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  ctx.shadowColor = 'rgba(27,56,57,.22)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 11;
  path([[-76,-38], [70,-3], [-54,44], [-21,2]], '#fefbf1', '#839a94', 2);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  path([[-76,-38], [-21,2], [70,-3]], '#fbf8ee', '#d9d9ca', 1);
  path([[-21,2], [-54,44], [70,-3]], '#bed6ce', '#92aea6', 1.5);
  path([[-76,-38], [-21,2], [-35,18], [-54,44]], '#e9ede1');
  ctx.beginPath(); ctx.moveTo(-21,2); ctx.lineTo(70,-3); ctx.strokeStyle = '#748e8b'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

function drawFlightTrail(x, y, progress) {
  ctx.save(); ctx.strokeStyle = 'rgba(68,118,112,.48)'; ctx.lineWidth = 3; ctx.setLineDash([5, 13]);
  ctx.beginPath(); ctx.moveTo(releaseX - 54, WORLD.startY + 7);
  for (let i = 1; i <= 24; i++) {
    const t = progress * i / 24;
    ctx.lineTo(flightX(releaseX, round.wind, t * FLIGHT_SECONDS) - 60, WORLD.startY + (WORLD.groundY - WORLD.startY) * (t * t * (3 - 2 * t)) + 7);
  }
  ctx.stroke(); ctx.restore();
}

function draw(now) {
  if (!ctx || !round) return;
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
  drawBackdrop(now);
  drawTarget(round.targetX);
  const x = phase === 'ready' ? waitingX(now - roundStarted) : phase === 'result' ? finalResult.x : flightX(releaseX, round.wind, Math.min(FLIGHT_SECONDS, (now - flightStarted) / 1000));
  const progress = phase === 'ready' ? 0 : phase === 'result' ? 1 : Math.min(1, (now - flightStarted) / (FLIGHT_SECONDS * 1000));
  const eased = progress * progress * (3 - 2 * progress);
  const y = WORLD.startY + (WORLD.groundY - WORLD.startY) * eased;
  if (phase === 'flying') drawFlightTrail(x, y, progress);
  if (phase === 'result') {
    ctx.strokeStyle = 'rgba(39,78,80,.7)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(round.targetX, 707); ctx.lineTo(finalResult.x, 707); ctx.stroke(); ctx.setLineDash([]);
  }
  drawPlane(x, y, phase === 'ready' ? -0.07 : -0.07 + progress * 0.27, progress);
  if (phase === 'flying' && progress >= 1) finish();
}

function tick(now) { renderedFrame = requestAnimationFrame(tick); draw(now); }

$('launch').addEventListener('click', launch);
$('scene').addEventListener('click', launch);
$('again').addEventListener('click', () => { sound('navigate', { volume: 0.5 }); startRound(); });
document.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat || phase !== 'ready' || $('bookmark-dialog').open || ['BUTTON', 'A', 'INPUT'].includes(document.activeElement?.tagName)) return;
  event.preventDefault(); launch();
});
$('sound').addEventListener('click', () => {
  audioOn = !audioOn;
  setEnabled(audioOn);
  $('sound').setAttribute('aria-pressed', String(audioOn));
  $('sound').setAttribute('aria-label', audioOn ? 'Desactivar sonido' : 'Activar sonido');
  $('sound-label').textContent = audioOn ? 'ON' : 'OFF';
  $('sound-icon').textContent = audioOn ? '◖))' : '◖̸';
  if (audioOn) sound('ready', { volume: 0.5 });
});
function bookmarkHelp() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'En Safari, pulsa Compartir y elige «Añadir a favoritos». Si estás dentro de Instagram, abre antes el enlace en Safari.';
  if (/Android/i.test(ua)) return 'Abre el menú ⋮ del navegador y elige «Añadir a marcadores» o toca la estrella.';
  return 'Pulsa Ctrl+D (Windows/Linux) o ⌘+D (Mac) y confirma el marcador en tu navegador.';
}
$('bookmark').addEventListener('click', () => {
  $('bookmark-text').textContent = bookmarkHelp();
  $('bookmark-dialog').showModal();
  sound('open', { volume: 0.35 });
});

if (!ctx) {
  $('scene-label').textContent = 'No se pudo iniciar la escena. Recarga la página o prueba otro navegador.';
  $('launch').disabled = true;
  $('scene').classList.remove('can-launch');
} else {
  startRound();
  renderedFrame = requestAnimationFrame(tick);
}
