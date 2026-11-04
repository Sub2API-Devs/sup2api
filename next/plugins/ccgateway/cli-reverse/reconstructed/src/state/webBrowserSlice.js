/**
 * state/webBrowserSlice.ts
 *
 * 2.1.316 新增。AppState 的 webBrowser 片段。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wy2s2mmv.js (2)
 * attribution: placement 2
 */

//@ chunk-wy2s2mmv.js:191-287 placement
function getDefaultWebBrowserState() {
  return {
    view: undefined,
    logs: [],
    unreadErrors: 0,
    unreadWarnings: 0,
    cleanupRegistered: false,
  };
}
//@ chunk-wy2s2mmv.js:287-483 placement
/**
 * AppState 的 webBrowser 片段。
 */
function makeSetWebBrowserSlice(setAppState) {
  return (updater) =>
    setAppState((state) => {
      let slice = {
        webBrowser: state.webBrowser,
        bagelActive: state.bagelActive,
        bagelUrl: state.bagelUrl,
        bagelPanelVisible: state.bagelPanelVisible,
      };
      let nextSlice = updater(slice);
      if (nextSlice === slice) return state;
      return {
        ...state,
        ...nextSlice,
      };
    });
}
export { getDefaultWebBrowserState, makeSetWebBrowserSlice };
