/**
 * utils/systemThemeQuery.ts
 *
 * 2.1.316 新增：系统主题查询
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xfhnxaa2.js (2)
 * attribution: placement 2
 */
import { env } from "./env.js";
import { isTmuxControlMode } from "./fullscreen.js";
import { oscColor } from "../ink/terminal-querier.js";
import { OSC, wrapForMultiplexer } from "../ink/termio/osc.js";
import { sleep } from "./sleep.js";
import { logForDebugging } from "./debug.js";
import { getTerminalProbeState } from "../ink/terminalCapabilities.js";
import { themeFromOscColor, setSystemTheme } from "./systemTheme.js";
import { getSecondRootError } from "../ink/terminal.js";
import { onTerminalFocusChanged, getTerminalFocus } from "../ink/terminal-focus-state.js";
import { waitForAttachSettle } from "./attachStamp.js";

//@ chunk-xfhnxaa2.js:3843-3854 placement
var DEFAULT_THEME_QUERY_TIMEOUT_MS = 2000;
//@ chunk-xfhnxaa2.js:3854-5008 placement
/**
 * 用 OSC 11 查询终端背景色推断系统主题（tmux/screen 下包装转发），在主题变化推送或获得焦点时重查；返回取消函数。
 */
function watchSystemTheme(querier, onTheme, options) {
  let disposed = false;
  let querying = false;
  let muxTimeoutMs = options?.muxTimeoutMs ?? DEFAULT_THEME_QUERY_TIMEOUT_MS;
  let viaMultiplexer = Boolean(env.TMUX || env.STY) && !isTmuxControlMode();
  async function queryOsc11() {
    if (querying) return;
    querying = true;
    try {
      let directRequest = oscColor(OSC.SET_BG_COLOR);
      let muxRequest = viaMultiplexer
        ? {
            ...directRequest,
            request: wrapForMultiplexer(directRequest.request),
          }
        : directRequest;
      let response;
      let via = viaMultiplexer ? "dcs" : "direct";
      if (viaMultiplexer) {
        response = await Promise.race([
          querier.send(muxRequest),
          sleep(muxTimeoutMs, undefined, {
            unref: true,
          }).then(() => {
            return;
          }),
        ]);
        if (!response)
          if (disposed) querier.cancel(muxRequest);
          else {
            querier.flush();
            via = "mux-bare";
            [response] = await Promise.all([querier.send(directRequest), querier.flush()]);
          }
      } else [response] = await Promise.all([querier.send(muxRequest), querier.flush()]);
      if (disposed) return;
      if (!response) {
        logForDebugging(`systemTheme: OSC 11 query (via=${via}) got no response`, {
          level: "debug",
        });
        getTerminalProbeState().osc11Responsive = false;
        return;
      }
      getTerminalProbeState().osc11Responsive = true;
      let detectedTheme = themeFromOscColor(response.data);
      logForDebugging(`systemTheme: OSC 11 response=${response.data} detected=${detectedTheme} via=${via}`, {
        level: "debug",
      });
      if (detectedTheme === undefined) return;
      setSystemTheme(detectedTheme);
      onTheme(detectedTheme);
    } finally {
      querying = false;
    }
  }
  let isDaemonBackend = env.CLAUDE_BG_BACKEND === "daemon";
  if (getTerminalProbeState().osc11Responsive !== false && !isDaemonBackend) queryOsc11();
  let unsubscribe = querier.subscribeThemeChange((isDarkPush) => {
    if (getSecondRootError().get(process.stdout)?.modes.isSet("surface")) {
      let pushedTheme = isDarkPush ? "dark" : "light";
      logForDebugging(
        `systemTheme: theme-change push reported=${pushedTheme}; surface override active, skipping OSC 11 query`,
        {
          level: "debug",
        },
      );
      setSystemTheme(pushedTheme);
      onTheme(pushedTheme);
      return;
    }
    queryOsc11();
  });
  let unsubscribeFocus = isDaemonBackend
    ? onTerminalFocusChanged(() => {
        if (getTerminalFocus() === "focused")
          waitForAttachSettle().then(() => {
            if (!disposed) queryOsc11();
          });
      })
    : undefined;
  return () => {
    disposed = true;
    unsubscribe();
    unsubscribeFocus?.();
  };
}
export { watchSystemTheme };
