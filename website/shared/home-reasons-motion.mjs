export function getReasonMotion(progress, count) {
  const coverProgress = Math.max(0, Math.min(1, Number(progress) || 0));
  return { activeIndex: Math.min(Math.max(0, count - 1), Math.floor(coverProgress * count)), coverProgress };
}
