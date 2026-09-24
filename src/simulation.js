import { CONFIG as C } from './config.js';

// The event clock is independent of render frames. Every packet owns its lane.
export class Simulation {
  constructor({ lemonAt = randomLemonAt(), lemonOffset = 1 + Math.floor(Math.random() * 2) } = {}) {
    this.time = 0;
    this.score = 0;
    this.cupLane = 1;
    this.cupMove = null;
    this.pendingCupLane = null;
    this.sourceLane = 1;
    this.sourceMoveReadyAt = 0;
    this.nextEmissionAt = C.emissionMs;
    this.dirtyReadyAt = C.dirtyInitialMs;
    this.dirtyUsesRemaining = C.dirtyUses;
    this.burst = null;
    this.burstId = 0;
    this.penalizedBurstIds = new Set();
    this.packets = [];
    this.events = [];
    this.packetId = 0;
    // Lemons drop in a lane away from the water, so catching them means leaving the stream.
    this.lemonAt = lemonAt;
    this.lemonOffset = lemonOffset;
    this.lemonLane = null;
    this.lemonsEmitted = 0;
    this.lemons = [];
    this.lemonsCaught = 0;
    this.finished = false;
  }
  get nextLemonAt() { return this.lemonsEmitted < C.lemonCount ? this.lemonAt + this.lemonsEmitted * C.lemonIntervalMs : Infinity; }
  get dirtyHits() { return this.penalizedBurstIds.size; }
  get sourceLocked() { return this.burst && this.time < this.burst.end; }
  get dirtyAvailable() { return !this.finished && this.dirtyUsesRemaining > 0 && this.time >= this.dirtyReadyAt; }
  get dirtyState() {
    if (this.burst && this.time < this.burst.start) return 'warning';
    if (this.burst && this.time < this.burst.end) return 'firing';
    if (this.burst && this.time < this.burst.end + C.flightMs) return 'falling';
    return this.dirtyAvailable ? 'ready' : 'cooldown';
  }
  command(type, lane) {
    if (this.finished) return false;
    if (type === 'dirty') {
      if (!this.dirtyAvailable) return false;
      this.dirtyUsesRemaining--;
      this.dirtyReadyAt = this.time + C.dirtyCooldownMs;
      this.burst = { id: ++this.burstId, start: this.time + C.dirtyWarningMs, end: this.time + C.dirtyWarningMs + C.dirtyDurationMs };
      return true;
    }
    if (![0, 1, 2].includes(lane)) return false;
    if (type === 'cup') {
      if (this.cupMove) this.pendingCupLane = lane;
      else if (lane !== this.cupLane) this.startCupMove(lane);
      return true;
    }
    if (type === 'source' && !this.sourceLocked && this.time >= this.sourceMoveReadyAt && lane !== this.sourceLane) {
      this.sourceLane = lane;
      this.sourceMoveReadyAt = this.time + C.sourceMoveMs;
      return true;
    }
    return false;
  }
  startCupMove(lane) {
    this.cupMove = { from: this.cupLane, to: lane, start: this.time, end: this.time + C.cupMoveMs };
  }
  // Inputs at a timestamp are processed after movement completion, before emission/arrival.
  advance(target, commands = []) {
    if (this.finished) return;
    target = Math.min(C.roundMs, Math.max(this.time, target));
    let inputsApplied = false;
    while (true) {
      const next = Math.min(this.cupMove?.end ?? Infinity, this.nextEmissionAt,
        this.packets[0]?.arrivesAt ?? Infinity, this.nextLemonAt, this.lemons[0]?.arrivesAt ?? Infinity,
        inputsApplied ? Infinity : target);
      if (next > target) break;
      this.time = next;
      if (next >= C.roundMs) {
        this.finished = true;
        this.packets = [];
        this.lemons = [];
        break;
      }
      if (this.cupMove && this.cupMove.end === next) {
        this.cupLane = this.cupMove.to;
        this.cupMove = null;
        const pending = this.pendingCupLane;
        this.pendingCupLane = null;
        if (pending !== null && pending !== this.cupLane) this.startCupMove(pending);
      }
      if (next === target && !inputsApplied) {
        for (const command of commands) this.command(command.type, command.lane);
        inputsApplied = true;
      }
      if (this.nextEmissionAt === next) {
        const dirty = this.burst && next >= this.burst.start && next < this.burst.end;
        this.packets.push({ id: ++this.packetId, lane: this.sourceLane, kind: dirty ? 'dirty' : 'clean',
          emittedAt: next, arrivesAt: next + C.flightMs, volumeMl: C.volumeMl, burstId: dirty ? this.burst.id : null });
        this.nextEmissionAt += C.emissionMs;
      }
      if (this.nextLemonAt === next) {
        this.lemonLane ??= (this.sourceLane + this.lemonOffset) % 3;
        this.lemons.push({ id: ++this.lemonsEmitted, lane: this.lemonLane, emittedAt: next, arrivesAt: next + C.lemonFlightMs });
      }
      while (this.packets[0]?.arrivesAt === next) {
        const packet = this.packets.shift();
        if (packet.lane !== this.cupLane) continue;
        if (packet.kind === 'clean') {
          const oldScore = this.score;
          this.score += packet.volumeMl;
          this.events.push({ type: 'catch', at: next, lane: packet.lane, full: Math.floor(oldScore / C.cupCapacityMl) < Math.floor(this.score / C.cupCapacityMl) });
        } else if (!this.penalizedBurstIds.has(packet.burstId)) {
          this.penalizedBurstIds.add(packet.burstId);
          this.score = Math.max(0, this.score - C.dirtyPenaltyMl);
          this.events.push({ type: 'hit', at: next, lane: packet.lane });
        }
      }
      while (this.lemons[0]?.arrivesAt === next) {
        const lemon = this.lemons.shift();
        if (lemon.lane !== this.cupLane) continue;
        this.lemonsCaught++;
        this.events.push({ type: 'lemon', at: next, lane: lemon.lane });
      }
    }
    this.time = target;
    this.events = this.events.filter(event => target - event.at < 600);
  }
}

export function randomLemonAt(random = Math.random) {
  const span = (C.lemonLatestMs - C.lemonEarliestMs) / C.emissionMs;
  return C.lemonEarliestMs + Math.floor(random() * (span + 1)) * C.emissionMs;
}
