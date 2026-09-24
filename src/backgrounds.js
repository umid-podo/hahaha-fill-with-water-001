// Arena backgrounds chosen before the match (kid's note: kitchen, bathroom, space).
// Everything is drawn on a 960×540 canvas: wall above y=463, floor below.
export const BACKGROUNDS = {
  kitchen: { label: '주방', laneText: '#b0a08a', lane: '#f8f1e344', active: '#e8f5f54d', dash: '#d8ccb377', pipe: '#ddcda9' },
  bathroom: { label: '화장실', laneText: '#89a9ad', lane: '#ffffff40', active: '#c8eef866', dash: '#a9cdd277', pipe: '#c3dade' },
  space: { label: '우주', laneText: '#6d6590', lane: '#ffffff0d', active: '#9fe3ff26', dash: '#ffffff3d', pipe: '#8f88b8' },
};
const INK = '#493c32';

function tiles(ctx, size, top, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let x = 0; x <= 960; x += size) { ctx.moveTo(x, top); ctx.lineTo(x, 463); }
  for (let y = top; y <= 463; y += size) { ctx.moveTo(0, y); ctx.lineTo(960, y); }
  ctx.stroke();
}
function line(ctx, color, width, points) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
}
function kitchen(ctx) {
  ctx.fillStyle = '#fffbf0'; ctx.fillRect(0, 0, 960, 463);
  ctx.fillStyle = '#fff4dc'; ctx.fillRect(0, 150, 960, 313);
  tiles(ctx, 48, 150, '#f0e1c2');
  // Window with a little sky.
  ctx.fillStyle = '#dff3f8'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(830, 78, 112, 104, 10); ctx.fill(); ctx.stroke();
  line(ctx, INK, 3, [[886, 78], [886, 182]]); line(ctx, INK, 3, [[830, 130], [942, 130]]);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(858, 104, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
  // Hanging ladle and spatula.
  line(ctx, '#c9a978', 4, [[8, 76], [70, 76]]);
  line(ctx, INK, 3, [[24, 76], [24, 150]]); ctx.fillStyle = '#f5ca62';
  ctx.beginPath(); ctx.ellipse(24, 160, 13, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  line(ctx, INK, 3, [[54, 76], [54, 140]]); ctx.fillStyle = '#f29b89';
  ctx.beginPath(); ctx.roundRect(44, 140, 20, 30, 5); ctx.fill(); ctx.stroke();
  // Wooden counter.
  ctx.fillStyle = '#ecd0a3'; ctx.fillRect(0, 463, 960, 77);
  ctx.fillStyle = '#d9b27c'; ctx.fillRect(0, 463, 960, 9);
  for (const x of [120, 330, 520, 760]) line(ctx, '#d7b686', 2, [[x, 480], [x + 60, 480]]);
}
function bathroom(ctx) {
  ctx.fillStyle = '#f2fafa'; ctx.fillRect(0, 0, 960, 463);
  ctx.fillStyle = '#e6f4f5'; ctx.fillRect(0, 200, 960, 263);
  tiles(ctx, 40, 200, '#d0e7ea');
  // Mirror.
  ctx.fillStyle = '#e4f5fb'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(888, 140, 44, 58, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  line(ctx, '#ffffff', 5, [[868, 110], [878, 96]]);
  // Towel on a hook.
  line(ctx, INK, 3, [[14, 112], [62, 112]]);
  ctx.fillStyle = '#f29b89'; ctx.beginPath(); ctx.roundRect(20, 112, 36, 96, [0, 0, 8, 8]); ctx.fill(); ctx.stroke();
  line(ctx, '#fff5dc', 3, [[20, 186], [56, 186]]);
  // Soap bubbles.
  ctx.lineWidth = 2; ctx.strokeStyle = '#9fcbd3';
  for (const [x, y, r] of [[32, 270, 10], [50, 246, 6], [22, 330, 7], [920, 260, 9], [938, 236, 5]]) {
    ctx.fillStyle = '#ffffff99'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  // Checker floor.
  ctx.fillStyle = '#dcecef'; ctx.fillRect(0, 463, 960, 77);
  ctx.fillStyle = '#c9e0e4';
  for (let x = 0; x < 960; x += 40) for (let y = 463; y < 540; y += 26) if ((x / 40 + Math.round((y - 463) / 26)) % 2) ctx.fillRect(x, y, 40, 26);
}
function space(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, 463);
  sky.addColorStop(0, '#1d2446'); sky.addColorStop(1, '#3a3170');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 960, 463);
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(255, 248, 220, ${0.35 + random() * 0.6})`;
    ctx.beginPath(); ctx.arc(random() * 960, random() * 455, 0.8 + random() * 1.8, 0, Math.PI * 2); ctx.fill();
  }
  // Ringed planet and a crescent moon.
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.fillStyle = '#f29b89'; ctx.beginPath(); ctx.arc(886, 132, 34, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#f5ca62'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(886, 134, 58, 13, -0.3, 0.15, Math.PI - 0.15); ctx.stroke();
  ctx.fillStyle = '#f5ca62'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(40, 150, 26, Math.PI * 0.35, Math.PI * 1.65); ctx.quadraticCurveTo(22, 150, 40 + 26 * Math.cos(Math.PI * 0.35), 150 + 26 * Math.sin(Math.PI * 0.35)); ctx.fill(); ctx.stroke();
  // Moon floor with craters.
  ctx.fillStyle = '#cfc8e0'; ctx.fillRect(0, 463, 960, 77);
  ctx.fillStyle = '#b7aecf';
  for (const [x, y, rx] of [[90, 492, 26], [300, 515, 18], [560, 488, 22], [850, 508, 30]]) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  }
}
const painters = { kitchen, bathroom, space };
export function drawBackground(ctx, key) {
  (painters[key] ?? kitchen)(ctx);
  ctx.strokeStyle = key === 'space' ? '#a79fc6' : '#00000018'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 463); ctx.bezierCurveTo(280, 457, 720, 470, 960, 461); ctx.stroke();
}
