export function getHeroState(videoCompleted, videoFailed) {
  const ready = Boolean(videoCompleted || videoFailed);
  return { videoVisible: !ready, stageVisible: ready, copyVisible: ready };
}
