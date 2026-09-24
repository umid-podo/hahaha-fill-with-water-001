import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation, randomLemonAt } from '../src/simulation.js';
import { Match, endingFor } from '../src/state.js';

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
test('dirty 350ms warning (first splash 700ms after press), lane lock, six packets, one penalty, cooldown and limits', () => {
  const s = new Simulation(); s.advance(5999); assert.equal(s.command('dirty'), false);
  s.advance(6000); assert.equal(s.command('dirty'), true); assert.equal(s.dirtyUsesRemaining, 3);
  assert.equal(s.command('dirty'), false); assert.equal(s.command('source', 0), false);
  s.advance(6349); assert.equal(s.dirtyState, 'warning');
  s.advance(6350); assert.equal(s.dirtyState, 'firing');
  s.advance(6949); assert.equal(s.packets.filter(p => p.kind === 'dirty').length, 6);
  s.advance(6950); assert.equal(s.sourceLocked, false); assert.equal(s.dirtyState, 'falling');
  const before = s.score; s.advance(7049); assert.equal(s.score, before);
  s.advance(7050); assert.equal(s.score, before - 100); s.advance(7599); assert.equal(s.score, before - 100);
  assert.equal(s.penalizedBurstIds.size, 1);
  s.advance(14000); assert.equal(s.command('dirty'), true);
  s.advance(22000); assert.equal(s.command('dirty'), true);
  s.advance(30000); assert.equal(s.command('dirty'), true);
  s.advance(38000); assert.equal(s.command('dirty'), false);
});
test('dirty never makes score negative; avoiding the burst causes no penalty', () => {
  const s = new Simulation(); s.advance(6000); s.command('dirty'); s.advance(7049); s.score = 30;
  s.advance(7599); assert.equal(s.score, 0);
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
    const s = new Simulation({ lemonAt: 14300, lemonOffset: 1 }); let index = 0;
    for (let time = step; time < 45000; time += step) {
      while (trace[index]?.[0] <= time) { const [at, type, lane] = trace[index++]; s.advance(at, [{ type, lane }]); }
      s.advance(time);
    }
    s.advance(45000); return { score: s.score, penalties: [...s.penalizedBurstIds], packets: s.packetId, lemons: s.lemonsCaught };
  };
  assert.deepEqual(run(1000 / 60), run(1000 / 120)); assert.deepEqual(run(1000 / 60), run(1000));
});
test('match stores receiver scores, alternates roles, detects ties, and resets replay', () => {
  const m = new Match([{ name: 'A' }, { name: 'B' }]);
  m.sim.score = 1000; m.sim.lemonsCaught = 3; m.finishRound();
  assert.deepEqual(m.results[0], { score: 1000, lemons: 3, dirtyHits: 0, ending: 'lemon' }); m.nextRound(); assert.equal(m.receiver, 1);
  m.sim.score = 900; m.sim.penalizedBurstIds.add(1); m.finishRound(); assert.equal(m.winner, 0);
  assert.equal(m.results[1].ending, 'dirty');
  m.scores[1] = 1000; assert.equal(m.winner, null);
  const replay = new Match(m.players, 1 - m.startingPlayer);
  assert.equal(replay.receiver, 1); assert.deepEqual(replay.scores, [0, 0]);
  assert.equal(replay.sim.packets.length, 0); assert.equal(replay.sim.dirtyUsesRemaining, 4);
});
test('five secret lemons fall fast into a lane away from the water and are counted, not scored', () => {
  const stay = new Simulation({ lemonAt: 12000, lemonOffset: 1 }); stay.advance(13000);
  assert.equal(stay.lemonLane, 2); assert.equal(stay.lemonsCaught, 0);
  const s = new Simulation({ lemonAt: 12000, lemonOffset: 1 }); s.advance(12000, [{ type: 'cup', lane: 2 }]);
  assert.equal(s.lemons.length, 1);
  s.advance(12379); assert.equal(s.lemonsCaught, 0); const score = s.score;
  s.advance(12380); assert.equal(s.lemonsCaught, 1);
  s.advance(12980); assert.equal(s.lemonsCaught, 5); assert.equal(s.lemonsEmitted, 5);
  assert.equal(s.score, score); // Water keeps falling in the centre lane, so the detour costs mL.
  s.advance(20000); assert.equal(s.lemonsCaught, 5);
  // The lane is fixed at the first slice; later faucet moves do not drag the lemons along.
  const late = new Simulation({ lemonAt: 12000, lemonOffset: 2 }); late.advance(12200, [{ type: 'source', lane: 2 }]);
  late.advance(12600, [{ type: 'cup', lane: 0 }]); assert.equal(late.lemonLane, 0);
  late.advance(13000); assert.equal(late.lemonsCaught, 2); // Reached lane 0 at 12740: slices 4 and 5.
  const end = new Simulation({ lemonAt: 44900 }); end.advance(45000); assert.equal(end.lemonsCaught, 0);
});
test('random lemon time stays inside the configured window on the emission grid', () => {
  for (const r of [0, 0.5, 0.999999]) {
    const at = randomLemonAt(() => r);
    assert.ok(at >= 12000 && at <= 36000); assert.equal(at % 100, 0);
  }
});
test('ending priority: 3+ lemons, then any dirty sip, otherwise clean', () => {
  assert.equal(endingFor({ lemons: 3, dirtyHits: 2 }), 'lemon');
  assert.equal(endingFor({ lemons: 2, dirtyHits: 1 }), 'dirty');
  assert.equal(endingFor({ lemons: 2, dirtyHits: 0 }), 'clean');
});
