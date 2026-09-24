import test from 'node:test';
import assert from 'node:assert/strict';
import { installInput } from '../src/input.js';

test('independent pointers, seat-bound keys, keyboard repeat, cancellation, focus and visibility', () => {
  const win = new EventTarget(); const doc = new EventTarget();
  const cup = Object.assign(new EventTarget(), { dataset: { command: 'cup', lane: '0' } });
  const source = Object.assign(new EventTarget(), { dataset: { command: 'source', lane: '2' } });
  doc.querySelectorAll = () => [cup, source];
  doc.querySelector = selector => selector === '#game' ? { hidden: false } : null;
  const old = { window: globalThis.window, document: globalThis.document, HTMLInputElement: globalThis.HTMLInputElement };
  Object.assign(globalThis, { window: win, document: doc, HTMLInputElement: class {} });
  const calls = []; const seats = []; let pauses = 0;
  try {
    installInput({ command: (...args) => calls.push(args), seatCommand: (...args) => { seats.push(args); calls.push(args); }, pause: () => pauses++ });
    const fire = (target, type, props) => target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), props));
    fire(cup, 'pointerdown', { button: 0, pointerId: 1 });
    fire(source, 'pointerdown', { button: 0, pointerId: 2 });
    assert.deepEqual(calls, [['cup', 0], ['source', 2]]);
    fire(cup, 'click', { detail: 1 }); assert.equal(calls.length, 2);
    fire(win, 'keydown', { code: 'KeyA', repeat: false });
    fire(win, 'keydown', { code: 'ArrowRight', repeat: false });
    fire(win, 'keydown', { code: 'KeyA', repeat: true });
    assert.equal(calls.length, 4);
    assert.deepEqual(seats, [[0, 'lane', 0], [1, 'lane', 2]]);
    fire(cup, 'pointercancel', {}); fire(win, 'keydown', { code: 'KeyA', repeat: false });
    assert.equal(calls.length, 5);
    fire(win, 'blur', {}); assert.equal(pauses, 1);
    fire(win, 'keydown', { code: 'KeyA', repeat: false }); assert.equal(calls.length, 6);
    doc.hidden = true; fire(doc, 'visibilitychange', {}); assert.equal(pauses, 2);
    fire(win, 'keydown', { code: 'KeyW', repeat: false }); fire(win, 'keydown', { code: 'ArrowUp', repeat: false });
    fire(win, 'keydown', { code: 'Space', repeat: false });
    assert.deepEqual(calls.slice(-3), [[0, 'dirty', undefined], [1, 'dirty', undefined], ['dirty']]);
    source.disabled = true; fire(source, 'pointerdown', { button: 0 }); assert.equal(calls.length, 9);
  } finally {
    for (const [key, value] of Object.entries(old)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; }
  }
});
