import { Simulation } from './simulation.js';

export class Match {
  constructor(players, startingPlayer = 0) {
    this.players = players;
    this.startingPlayer = startingPlayer;
    this.roundIndex = 0;
    this.scores = [0, 0];
    this.ready = [false, false];
    this.startRound();
  }
  get receiver() { return (this.startingPlayer + this.roundIndex) % 2; }
  get disruptor() { return 1 - this.receiver; }
  startRound() { this.sim = new Simulation(); this.ready = [false, false]; }
  finishRound() { this.scores[this.receiver] = this.sim.score; }
  nextRound() { this.roundIndex++; this.startRound(); }
  get winner() { return this.scores[0] === this.scores[1] ? null : this.scores[0] > this.scores[1] ? 0 : 1; }
}
