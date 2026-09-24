export function installInput({ command, pause }) {
  const held = new Set();
  const keyMap = { KeyA: ['cup', 0], KeyS: ['cup', 1], KeyD: ['cup', 2], ArrowLeft: ['source', 0], ArrowDown: ['source', 1], ArrowRight: ['source', 2], Space: ['dirty'] };
  window.addEventListener('keydown', event => {
    if (event.target instanceof HTMLInputElement || document.querySelector('dialog[open]')) return;
    if (event.code === 'Escape') { event.preventDefault(); if (!event.repeat) pause(); return; }
    const mapped = keyMap[event.code];
    if (!mapped) return;
    if (!document.querySelector('#game').hidden) event.preventDefault();
    if (event.repeat || held.has(event.code)) return;
    held.add(event.code);
    command(...mapped);
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
