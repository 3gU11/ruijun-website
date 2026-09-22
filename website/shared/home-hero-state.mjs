export function getHeroState(videoCompleted, videoFailed) {
  const ready = Boolean(videoCompleted || videoFailed);
  return { videoVisible: !videoFailed, stageVisible: ready, copyVisible: true };
}
