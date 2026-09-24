import { CONFIG as C } from './config.js';
import { Simulation } from './simulation.js';

// Ending priority: the secret lemon ending beats everything, then a dirty sip.
export function endingFor({ lemons, dirtyHits }) {
  if (lemons >= C.lemonEndingCount) return 'lemon';
  return dirtyHits > 0 ? 'dirty' : 'clean';
}

export class Match {
  constructor(players, startingPlayer = 0) {
    this.players = players;
    this.startingPlayer = startingPlayer;
    this.roundIndex = 0;
    this.scores = [0, 0];
    this.results = [null, null];
    this.ready = [false, false];
    this.startRound();
  }
  get receiver() { return (this.startingPlayer + this.roundIndex) % 2; }
  get disruptor() { return 1 - this.receiver; }
  startRound() { this.sim = new Simulation(); this.ready = [false, false]; }
  finishRound() {
    const { score, lemonsCaught: lemons, dirtyHits } = this.sim;
    this.scores[this.receiver] = score;
    this.results[this.receiver] = { score, lemons, dirtyHits, ending: endingFor({ lemons, dirtyHits }) };
  }
  nextRound() { this.roundIndex++; this.startRound(); }
  get winner() { return this.scores[0] === this.scores[1] ? null : this.scores[0] > this.scores[1] ? 0 : 1; }
}
