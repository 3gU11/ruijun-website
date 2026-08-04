function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : 0));
}

function reveal(progress, start, duration = .16) {
  return clamp((progress - start) / duration);
}

export function getIntroMotion(progress) {
  const current = clamp(progress);
  return {
    progress: current,
    machineScale: 1 - current * .52,
    machineX: -current * 28,
    machineY: -current * 10,
    copyOpacity: reveal(current, .18, .28),
    copyY: (1 - reveal(current, .18, .28)) * 34,
    itemOpacity: [reveal(current, .46), reveal(current, .63), reveal(current, .8)]
  };
}
