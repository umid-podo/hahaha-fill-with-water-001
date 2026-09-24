import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/simulation.js';
import { Match } from '../src/state.js';

test('first arrival at 750ms, exactly 443 packets before the deadline', () => {
  const s = new Simulation(); s.advance(650); assert.equal(s.score, 0);
  s.advance(750); assert.equal(s.score, 10);
  s.advance(45000); assert.equal(s.score, 4430); assert.equal(s.finished, true);
  s.advance(60000); assert.equal(s.score, 4430); assert.equal(s.packets.length, 0);
});
test('cup completion precedes arrival at the same timestamp', () => {
  const s = new Simulation(); s.advance(0, [{ type: 'cup', lane: 0 }]);
  s.advance(610, [{ type: 'cup', lane: 1 }]); s.advance(750); assert.equal(s.score, 10);
});
test('last queued cup selection wins; inputs during source lock are discarded', () => {
  const s = new Simulation(); s.command('cup', 0); s.advance(20); s.command('cup', 2); s.command('cup', 1);
  s.advance(140); assert.equal(s.cupLane, 0); assert.equal(s.cupMove.to, 1);
  s.advance(280); assert.equal(s.cupLane, 1); assert.equal(s.cupMove, null);
  assert.equal(s.command('source', 0), true); assert.equal(s.command('source', 2), false);
  s.advance(730); assert.equal(s.sourceLane, 0); assert.equal(s.command('source', 2), true);
});
test('emitted packets retain lane after source moves', () => {
  const s = new Simulation(); s.advance(100); s.command('source', 0); s.advance(200);
  assert.deepEqual(s.packets.map(p => p.lane), [1, 0]); s.advance(750); assert.equal(s.score, 10);
});
test('dirty warnings, lane lock, six packets, one penalty, cooldown and limits', () => {
  const s = new Simulation(); s.advance(5999); assert.equal(s.command('dirty'), false);
  s.advance(6000); assert.equal(s.command('dirty'), true); assert.equal(s.dirtyUsesRemaining, 3);
  assert.equal(s.command('dirty'), false); assert.equal(s.command('source', 0), false);
  s.advance(6700); assert.equal(s.dirtyState, 'firing');
  s.advance(7299); assert.equal(s.packets.filter(p => p.kind === 'dirty').length, 6);
  s.advance(7300); assert.equal(s.sourceLocked, false); assert.equal(s.dirtyState, 'falling');
  const before = s.score; s.advance(7949); assert.equal(s.score, before - 100);
  assert.equal(s.penalizedBurstIds.size, 1);
  s.advance(14000); assert.equal(s.command('dirty'), true);
  s.advance(22000); assert.equal(s.command('dirty'), true);
  s.advance(30000); assert.equal(s.command('dirty'), true);
  s.advance(38000); assert.equal(s.command('dirty'), false);
});
test('dirty never makes score negative; avoiding the burst causes no penalty', () => {
  const s = new Simulation(); s.advance(6000); s.command('dirty'); s.advance(7349); s.score = 30;
  s.advance(7949); assert.equal(s.score, 0);
  const avoid = new Simulation(); avoid.advance(6000); avoid.command('dirty'); avoid.command('cup', 0);
  avoid.advance(8000); assert.equal(avoid.penalizedBurstIds.size, 0);
});
test('input at emission time changes the new packet only', () => {
  const s = new Simulation(); s.advance(200, [{ type: 'source', lane: 2 }]);
  assert.deepEqual(s.packets.map(p => p.lane), [1, 2]);
});
test('60Hz, 120Hz and stalled frames produce the same outcome for a timestamped input trace', () => {
  const trace = [ [800, 'cup', 0], [1400, 'source', 0], [3000, 'source', 2], [3500, 'cup', 2], [6000, 'dirty'], [7000, 'cup', 1], [9000, 'source', 1], [14000, 'dirty'], [14400, 'cup', 0], [15000, 'cup', 1] ];
  const run = step => {
    const s = new Simulation(); let index = 0;
    for (let time = step; time < 45000; time += step) {
      while (trace[index]?.[0] <= time) { const [at, type, lane] = trace[index++]; s.advance(at, [{ type, lane }]); }
      s.advance(time);
    }
    s.advance(45000); return { score: s.score, penalties: [...s.penalizedBurstIds], packets: s.packetId };
  };
  assert.deepEqual(run(1000 / 60), run(1000 / 120)); assert.deepEqual(run(1000 / 60), run(1000));
});
test('match stores receiver scores, alternates roles, detects ties, and resets replay', () => {
  const m = new Match([{ name: 'A' }, { name: 'B' }]);
  m.sim.score = 1000; m.finishRound(); m.nextRound(); assert.equal(m.receiver, 1);
  m.sim.score = 900; m.finishRound(); assert.equal(m.winner, 0);
  m.scores[1] = 1000; assert.equal(m.winner, null);
  const replay = new Match(m.players, 1 - m.startingPlayer);
  assert.equal(replay.receiver, 1); assert.deepEqual(replay.scores, [0, 0]);
  assert.equal(replay.sim.packets.length, 0); assert.equal(replay.sim.dirtyUsesRemaining, 4);
});
