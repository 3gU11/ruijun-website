export function shouldShowFaq(path, homeHeroReady) { return path !== '/' || Boolean(homeHeroReady); }

export function getFaqRouteState(path) {
  return {
    homeHeroReady: path !== '/',
    closeDialog: path === '/'
  };
}
