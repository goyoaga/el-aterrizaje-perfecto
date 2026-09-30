import test from 'node:test';
import assert from 'node:assert/strict';
import { flightX, landing, newRound, waitingX, FLIGHT_SECONDS } from './model.js';

test('el dibujo del último fotograma y la puntuación usan la misma coordenada', () => {
  const round = { targetX: 633, wind: 0 };
  const result = landing(380, round);
  assert.equal(result.x, 633);
  assert.equal(flightX(380, 0, FLIGHT_SECONDS), result.x);
  assert.equal(result.error, 0);
  assert.equal(result.category, 'perfect');
});

test('brisa y límites de premio se evalúan antes de redondear', () => {
  const round = { targetX: 633, wind: -35 };
  assert.equal(landing(380, round).error, 40.25);
  assert.equal(landing(380, round).category, 'good');
  assert.equal(landing(633 - 253 - 9.9, { targetX: 633, wind: 0 }).category, 'perfect');
  assert.equal(landing(633 - 253 - 10, { targetX: 633, wind: 0 }).category, 'near');
});

test('todas las rondas generadas dejan un instante alcanzable en el carril', () => {
  for (let i = 0; i <= 100; i++) {
    const round = newRound(() => i / 100);
    const exactRelease = round.targetX - (220 + round.wind) * FLIGHT_SECONDS;
    assert.ok(exactRelease >= 100 && exactRelease <= 700);
  }
  assert.equal(waitingX(0), 100);
  assert.equal(waitingX(3750), 100);
});
