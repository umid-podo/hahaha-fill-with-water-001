// Keys belong to a seat, not a role: the left friend keeps A S D (W) and the right
// friend keeps the arrows (↑) after roles switch. main.js resolves the current role.
export const SEAT_KEYS = [
  { lanes: ['A', 'S', 'D'], dirty: 'W' },
  { lanes: ['←', '↓', '→'], dirty: '↑' },
];
// iOS Safari ignores user-scalable=no, so browser gestures are blocked on the game
// screen itself. Pointer events (and therefore multi-touch input) keep firing.
export function installGestureGuard(root) {
  const block = event => { if (event.cancelable) event.preventDefault(); };
  // Pinch, pan and pull-to-refresh start from touchmove; it must not be passive.
  root.addEventListener('touchmove', block, { passive: false });
  // Non-standard Safari pinch events (older iOS still zooms without these).
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) root.addEventListener(type, block, { passive: false });
  root.addEventListener('dblclick', block);
  // Fast repeated taps: cancel the second touchend so it cannot become a double-tap zoom.
  // Buttons already acted on pointerdown; the click is only used by keyboards.
  let lastTouchEnd = 0;
  root.addEventListener('touchend', event => {
    const now = event.timeStamp;
    if (now - lastTouchEnd < 350) block(event);
    lastTouchEnd = now;
  }, { passive: false });
}
export function installInput({ command, seatCommand, pause }) {
  const held = new Set();
  const keyMap = {
    KeyA: [0, 'lane', 0], KeyS: [0, 'lane', 1], KeyD: [0, 'lane', 2], KeyW: [0, 'dirty'],
    ArrowLeft: [1, 'lane', 0], ArrowDown: [1, 'lane', 1], ArrowRight: [1, 'lane', 2], ArrowUp: [1, 'dirty'],
    Space: [null, 'dirty'],
  };
  window.addEventListener('keydown', event => {
    if (event.target instanceof HTMLInputElement || document.querySelector('dialog[open]')) return;
    if (event.code === 'Escape') { event.preventDefault(); if (!event.repeat) pause(); return; }
    const mapped = keyMap[event.code];
    if (!mapped) return;
    if (!document.querySelector('#game').hidden) event.preventDefault();
    if (event.repeat || held.has(event.code)) return;
    held.add(event.code);
    const [seat, action, lane] = mapped;
    if (seat === null) command(action); else seatCommand(seat, action, lane);
  });
  window.addEventListener('keyup', event => held.delete(event.code));
  for (const button of document.querySelectorAll('[data-command]')) {
    // Pointer down gives both players independent, immediate input. No shared pointer state.
    button.addEventListener('pointerdown', event => {
      if (button.disabled || event.button !== 0) return;
      event.preventDefault();
      command(button.dataset.command, Number(button.dataset.lane));
    });
    button.addEventListener('click', event => {
      if (event.detail === 0) command(button.dataset.command, Number(button.dataset.lane));
    });
    button.addEventListener('pointercancel', () => held.clear());
  }
  const clear = () => held.clear();
  window.addEventListener('blur', () => { clear(); pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clear(); pause(); } });
  return { clear };
}
