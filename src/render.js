import { CONFIG as C } from './config.js';
import { BACKGROUNDS, drawBackground } from './backgrounds.js';
const lanes = [160, 440, 720];
export async function loadAssets() {
  const paths = {
    friend: 'characters/friend-idle.png', faucet: 'props/faucet.svg',
    sunny: 'props/cup-sunny.svg', coral: 'props/cup-coral.svg', sky: 'props/cup-sky.svg',
    clean: 'fx/drop-clean.svg', dirty: 'fx/drop-dirty.svg',
    splash: 'fx/splash-clean.svg', hit: 'fx/splash-dirty.svg', warning: 'ui/dirty-warning.svg',
    lemon: 'fx/lemon.svg',
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
    this.background = 'kitchen';
    this.backgroundCache = null;
  }
  // The static scene is painted once per background and device pixel ratio.
  backdrop(dpr) {
    const key = `${this.background}@${dpr}`;
    if (this.backgroundCache?.key !== key) {
      const canvas = document.createElement('canvas');
      canvas.width = 960 * dpr; canvas.height = 540 * dpr;
      const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
      drawBackground(ctx, this.background);
      this.backgroundCache = { key, canvas };
    }
    return this.backgroundCache.canvas;
  }
  // Outlined labels stay readable on light walls and the dark space sky.
  label(text, x, y, size, color) {
    const ctx = this.ctx;
    ctx.font = `bold ${size}px sans-serif`; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#fffdf6'; ctx.lineWidth = 5; ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  draw(sim, color) {
    const ctx = this.ctx, a = this.assets;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.canvas.width !== 960 * dpr) { this.canvas.width = 960 * dpr; this.canvas.height = 540 * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, 960, 540);
    const theme = BACKGROUNDS[this.background] ?? BACKGROUNDS.kitchen;
    ctx.drawImage(this.backdrop(dpr), 0, 0, 960, 540);
    ctx.lineWidth = 2;
    lanes.forEach((x, lane) => {
      ctx.fillStyle = lane === sim.sourceLane ? theme.active : theme.lane;
      ctx.beginPath(); ctx.roundRect(x - 87, 123, 174, 313, 25); ctx.fill();
      ctx.setLineDash([4, 10]); ctx.strokeStyle = theme.dash;
      ctx.beginPath(); ctx.moveTo(x, 133); ctx.lineTo(x, 359); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = theme.laneText;
      ctx.fillText(['왼쪽', '가운데', '오른쪽'][lane], x, 506);
    });
    const sourceX = lanes[sim.sourceLane];
    ctx.strokeStyle = theme.pipe; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(0, 45); ctx.lineTo(960, 45); ctx.stroke();
    ctx.drawImage(a.faucet, sourceX - 124, -10, 160, 128);
    if (['warning', 'firing', 'falling'].includes(sim.dirtyState)) {
      ctx.drawImage(a.warning, sourceX + 46, 34, 45, 45);
      this.label(sim.dirtyState === 'warning' ? '똥물 준비!' : '똥물 조심!', sourceX, 137, 17, '#946347');
    }
    for (const packet of sim.packets) {
      const progress = (sim.time - packet.emittedAt) / C.flightMs;
      const y = 100 + progress * 280;
      ctx.drawImage(a[packet.kind], lanes[packet.lane] - 13, y - 20, 26, 33);
    }
    for (const lemon of sim.lemons) {
      const progress = (sim.time - lemon.emittedAt) / C.lemonFlightMs;
      ctx.save(); ctx.translate(lanes[lemon.lane], 100 + progress * 280);
      if (!this.reducedMotion.matches) ctx.rotate(progress * Math.PI * 2);
      ctx.drawImage(a.lemon, -16, -16, 32, 32); ctx.restore();
    }
    let cupX = lanes[sim.cupLane];
    if (sim.cupMove) {
      const p = Math.min(1, (sim.time - sim.cupMove.start) / C.cupMoveMs);
      cupX += (lanes[sim.cupMove.to] - cupX) * (p * p * (3 - 2 * p));
    }
    const hit = sim.events.findLast(e => e.type === 'hit');
    const caught = sim.events.findLast(e => e.type === 'catch');
    const full = sim.events.findLast(e => e.full);
    const lemon = sim.events.findLast(e => e.type === 'lemon');
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
      this.label('−100 mL', cupX, 326, 24, '#936343');
      ctx.globalAlpha = 1;
    } else if (lemon && sim.time - lemon.at < 500) {
      this.label('새콤! ✧', cupX, 337, 20, '#c9971c');
    } else if (full && sim.time - full.at < 500) {
      this.label('한 컵 더! ✧', cupX, 337, 18, '#2996b2');
    }
  }
}
