export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

export function getTimelineMotion({
  progress,
  panelWidth,
  trackDistance,
  cursorStart,
  cursorWidth,
  copyLeft,
  copyWidth
}) {
  const normalizedProgress = clamp(progress, 0, 1);
  const startX = panelWidth * 0.88;
  const trackX = startX + (-trackDistance - startX) * normalizedProgress;
  const copyX = trackX - startX;
  const cursorTravel = Math.max(0, panelWidth + cursorWidth + 30 - cursorStart);
  const cursorX = cursorTravel * normalizedProgress;
  const cursorTipX = cursorStart + cursorX + cursorWidth + 25;
  const titleLeft = copyLeft + copyX;
  return {
    trackX,
    cursorX,
    copyX,
    titleRevealProgress: clamp((cursorTipX - titleLeft) / Math.max(1, copyWidth), 0, 1)
  };
}

export function getSequentialLineReveal(progress, lineWidths) {
  const widths = lineWidths.map((width) => Math.max(1, width));
  const revealedWidth = clamp(progress, 0, 1) * widths.reduce((total, width) => total + width, 0);
  let precedingWidth = 0;
  return widths.map((width) => {
    const lineProgress = clamp((revealedWidth - precedingWidth) / width, 0, 1);
    precedingWidth += width;
    return lineProgress;
  });
}

export function getStoryMotion(progress) {
  const normalizedProgress = clamp(progress, 0, 1);
  const travel = normalizedProgress === 0 ? 0 : normalizedProgress;
  return {
    backdropY: travel ? -44 * travel : 0,
    backdropScale: 1 + 0.045 * travel,
    backdropRotation: travel ? -0.3 * travel : 0,
    copyY: travel ? -28 * travel : 0,
    copyOpacity: 1 - 0.16 * travel
  };
}

export function nextSlideIndex(currentIndex, direction, count) {
  if (!Number.isInteger(count) || count < 1) return 0;
  return (currentIndex + direction % count + count) % count;
}
