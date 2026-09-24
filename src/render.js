import { CONFIG as C } from './config.js';
const lanes = [160, 440, 720];
export async function loadAssets() {
  const paths = {
    friend: 'characters/friend-idle.png', faucet: 'props/faucet.svg',
    sunny: 'props/cup-sunny.svg', coral: 'props/cup-coral.svg', sky: 'props/cup-sky.svg',
    clean: 'fx/drop-clean.svg', dirty: 'fx/drop-dirty.svg',
    splash: 'fx/splash-clean.svg', hit: 'fx/splash-dirty.svg', warning: 'ui/dirty-warning.svg',
  };
  const assets = {};
  await Promise.all(Object.entries(paths).map(([key, path]) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { assets[key] = img; resolve(); };
    img.onerror = () => reject(new Error(`이미지를 불러오지 못했어요: ${path}`));
    img.src = new URL(`../assets/${path}`, import.meta.url).href;
  })));
  return assets;
}
export class Renderer {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assets = assets;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.clip = new Path2D('M21 40 H89 L83 122 Q55 129 27 122 Z');
  }
  draw(sim, color) {
    const ctx = this.ctx, a = this.assets;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.canvas.width !== 960 * dpr) { this.canvas.width = 960 * dpr; this.canvas.height = 540 * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, 960, 540);
    ctx.fillStyle = '#fffdf6'; ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = '#f6eedb'; ctx.fillRect(0, 463, 960, 77);
    ctx.strokeStyle = '#e4d8c1'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 463); ctx.bezierCurveTo(280, 457, 720, 470, 960, 461); ctx.stroke();
    lanes.forEach((x, lane) => {
      ctx.fillStyle = lane === sim.sourceLane ? '#e8f5f54d' : '#f8f1e344';
      ctx.beginPath(); ctx.roundRect(x - 87, 123, 174, 313, 25); ctx.fill();
      ctx.setLineDash([4, 10]); ctx.strokeStyle = '#d8ccb377';
      ctx.beginPath(); ctx.moveTo(x, 133); ctx.lineTo(x, 359); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#b0a08a';
      ctx.fillText(['왼쪽', '가운데', '오른쪽'][lane], x, 506);
    });
    const sourceX = lanes[sim.sourceLane];
    ctx.strokeStyle = '#ddcda9'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(0, 45); ctx.lineTo(960, 45); ctx.stroke();
    ctx.drawImage(a.faucet, sourceX - 124, -10, 160, 128);
    if (['warning', 'firing', 'falling'].includes(sim.dirtyState)) {
      ctx.drawImage(a.warning, sourceX + 46, 34, 45, 45);
      ctx.fillStyle = '#946347'; ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(sim.dirtyState === 'warning' ? '똥물 준비!' : '똥물 조심!', sourceX, 137);
    }
    for (const packet of sim.packets) {
      const progress = (sim.time - packet.emittedAt) / C.flightMs;
      const y = 100 + progress * 280;
      ctx.drawImage(a[packet.kind], lanes[packet.lane] - 13, y - 20, 26, 33);
    }
    let cupX = lanes[sim.cupLane];
    if (sim.cupMove) {
      const p = Math.min(1, (sim.time - sim.cupMove.start) / C.cupMoveMs);
      cupX += (lanes[sim.cupMove.to] - cupX) * (p * p * (3 - 2 * p));
    }
    const hit = sim.events.findLast(e => e.type === 'hit');
    const caught = sim.events.findLast(e => e.type === 'catch');
    const full = sim.events.findLast(e => e.full);
    if (hit && !this.reducedMotion.matches) cupX += Math.sin((sim.time - hit.at) / 25) * 4 * (1 - (sim.time - hit.at) / 600);
    ctx.fillStyle = '#d6c8a44d'; ctx.beginPath(); ctx.ellipse(cupX + 78, 464, 125, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(cupX - 55, 351);
    ctx.save(); ctx.clip(this.clip);
    const ratio = full && sim.time - full.at < 170 ? 1 : (sim.score % C.cupCapacityMl) / C.cupCapacityMl;
    ctx.fillStyle = '#70cbe6bb'; ctx.fillRect(16, 124 - ratio * 84, 80, ratio * 84 + 6);
    ctx.restore(); ctx.drawImage(a[color], 0, 0, 128, 144); ctx.restore();
    const bounce = caught && !this.reducedMotion.matches ? Math.sin(Math.min(1, (sim.time - caught.at) / 180) * Math.PI) * 4 : 0;
    // Align the PNG left hand (0.19, 0.63) with the cup handle (123, 74).
    ctx.drawImage(a.friend, cupX + 68 - .19 * 225, 425 - .63 * 231 - bounce, 225, 231);
    if (caught && sim.time - caught.at < 200 && !this.reducedMotion.matches) {
      ctx.globalAlpha = 1 - (sim.time - caught.at) / 200;
      ctx.drawImage(a.splash, cupX - 60, 351, 120, 60); ctx.globalAlpha = 1;
    }
    if (hit) {
      ctx.globalAlpha = 1 - (sim.time - hit.at) / 600;
      ctx.drawImage(a.hit, cupX - 70, 338, 140, 70);
      ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#936343'; ctx.fillText('−100 mL', cupX, 326);
      ctx.globalAlpha = 1;
    } else if (full && sim.time - full.at < 500) {
      ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#2996b2'; ctx.fillText('한 컵 더! ✧', cupX, 337);
    }
  }
}
