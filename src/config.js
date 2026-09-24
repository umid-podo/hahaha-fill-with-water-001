export const CONFIG = Object.freeze({
  roundMs: 45000, countdownMs: 3000, cupMoveMs: 140, sourceMoveMs: 450,
  emissionMs: 100, volumeMl: 10, flightMs: 650, cupCapacityMl: 250,
  dirtyInitialMs: 6000, dirtyWarningMs: 350, dirtyDurationMs: 600,
  dirtyCooldownMs: 8000, dirtyUses: 4, dirtyPenaltyMl: 100,
  // Secret lemons: once per round, five slices drop quickly into a lane away from the water.
  lemonCount: 5, lemonIntervalMs: 150, lemonFlightMs: 380,
  lemonEarliestMs: 12000, lemonLatestMs: 36000, lemonEndingCount: 3,
});
