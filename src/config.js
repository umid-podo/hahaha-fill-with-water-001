export const CONFIG = Object.freeze({
  roundMs: 45000, countdownMs: 3000, cupMoveMs: 140, sourceMoveMs: 450,
  emissionMs: 100, volumeMl: 10, flightMs: 650, cupCapacityMl: 250,
  dirtyInitialMs: 6000, dirtyWarningMs: 350, dirtyDurationMs: 600,
  dirtyCooldownMs: 8000, dirtyUses: 4, dirtyPenaltyMl: 100,
  // Secret lemons: two waves per round. Slices come out spaced apart but fall faster
  // than water, into a lane away from the stream. One caught slice earns the lemon ending.
  lemonWaves: [[10000, 20000], [26000, 36000]], lemonsPerWave: 3, lemonIntervalMs: 350,
  lemonFlightMs: 480, lemonEndingCount: 1,
});
