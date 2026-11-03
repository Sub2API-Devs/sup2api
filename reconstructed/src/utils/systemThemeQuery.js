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
function watchSystemTheme(e, l, p) {
  let n = false;
  let u = false;
  let muxTimeoutMs = p?.muxTimeoutMs ?? DEFAULT_THEME_QUERY_TIMEOUT_MS;
  let a = Boolean(env.TMUX || env.STY) && !isTmuxControlMode();
  async function c() {
    if (u) return;
    u = true;
    try {
      let r = oscColor(OSC.SET_BG_COLOR);
      let s = a
        ? {
            ...r,
            request: wrapForMultiplexer(r.request),
          }
        : r;
      let o;
      let f = a ? "dcs" : "direct";
      if (a) {
        o = await Promise.race([
          e.send(s),
          sleep(muxTimeoutMs, undefined, {
            unref: true,
          }).then(() => {
            return;
          }),
        ]);
        if (!o)
          if (n) e.cancel(s);
          else {
            e.flush();
            f = "mux-bare";
            [o] = await Promise.all([e.send(r), e.flush()]);
          }
      } else [o] = await Promise.all([e.send(s), e.flush()]);
      if (n) return;
      if (!o) {
        logForDebugging(`systemTheme: OSC 11 query (via=${f}) got no response`, {
          level: "debug",
        });
        getTerminalProbeState().osc11Responsive = false;
        return;
      }
      getTerminalProbeState().osc11Responsive = true;
      let m = themeFromOscColor(o.data);
      logForDebugging(`systemTheme: OSC 11 response=${o.data} detected=${m} via=${f}`, {
        level: "debug",
      });
      if (m === undefined) return;
      setSystemTheme(m);
      l(m);
    } finally {
      u = false;
    }
  }
  let d = env.CLAUDE_BG_BACKEND === "daemon";
  if (getTerminalProbeState().osc11Responsive !== false && !d) c();
  let T = e.subscribeThemeChange((r) => {
    if (getSecondRootError().get(process.stdout)?.modes.isSet("surface")) {
      let s = r ? "dark" : "light";
      logForDebugging(
        `systemTheme: theme-change push reported=${s}; surface override active, skipping OSC 11 query`,
        {
          level: "debug",
        },
      );
      setSystemTheme(s);
      l(s);
      return;
    }
    c();
  });
  let h = d
    ? onTerminalFocusChanged(() => {
        if (getTerminalFocus() === "focused")
          waitForAttachSettle().then(() => {
            if (!n) c();
          });
      })
    : undefined;
  return () => {
    n = true;
    T();
    h?.();
  };
}
