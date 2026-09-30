export const WORLD = Object.freeze({ width: 1000, height: 800, startY: 172, groundY: 615 });
export const FLIGHT_SECONDS = 1.15;
export const BASE_SPEED = 220;
export const WAIT_SPEED = 160;
export const WIND_VALUES = [-35, 0, 35];

export function newRound(random = Math.random) {
  return {
    targetX: Math.round(550 + random() * 210),
    wind: WIND_VALUES[Math.min(2, Math.floor(random() * 3))],
  };
}

export function waitingX(elapsedMs) {
  return 100 + ((Math.max(0, elapsedMs) / 1000) * WAIT_SPEED) % 600;
}

export function flightX(releaseX, wind, seconds) {
  return releaseX + (BASE_SPEED + wind) * Math.min(FLIGHT_SECONDS, Math.max(0, seconds));
}

export function landing(releaseX, round) {
  const x = flightX(releaseX, round.wind, FLIGHT_SECONDS);
  const error = Math.abs(x - round.targetX);
  const category = error < 10 ? 'perfect' : error <= 40 ? 'near' : error <= 90 ? 'good' : 'far';
  return { x, error, category, offset: x - round.targetX };
}

export function windLabel(wind) {
  if (wind < 0) return '← SUAVE · EMPUJA A LA IZQUIERDA';
  if (wind > 0) return 'SUAVE · EMPUJA A LA DERECHA →';
  return 'CALMA · SIN BRISA';
}
