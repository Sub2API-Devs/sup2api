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
  return { view: void 0, logs: [], unreadErrors: 0, unreadWarnings: 0, cleanupRegistered: !1 };
}
/**
 * AppState 的 webBrowser 片段。
 */
//@ chunk-wy2s2mmv.js:287-483 placement
function makeSetWebBrowserSlice(n) {
  return (o) =>
    n((e) => {
      let r = {
          webBrowser: e.webBrowser,
          bagelActive: e.bagelActive,
          bagelUrl: e.bagelUrl,
          bagelPanelVisible: e.bagelPanelVisible,
        },
        t = o(r);
      if (t === r) return e;
      return { ...e, ...t };
    });
}

export { getDefaultWebBrowserState, makeSetWebBrowserSlice };
