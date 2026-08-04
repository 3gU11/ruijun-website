function finiteNonNegative(value) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function getHeaderLifecycle({ scrollY, firstPanelTop, firstPanelHeight, headerHeight }) {
  const panelTop = finiteNonNegative(firstPanelTop);
  const panelHeight = finiteNonNegative(firstPanelHeight);
  const safeHeaderHeight = finiteNonNegative(headerHeight);
  const expandAt = Math.max(0, panelTop + panelHeight - safeHeaderHeight);
  return {
    expandAt,
    isWide: finiteNonNegative(scrollY) >= expandAt && panelHeight > 0
  };
}
