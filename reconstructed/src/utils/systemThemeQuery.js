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
import { gk } from "../ink/terminalCapabilities.js";
import { themeFromOscColor, setSystemTheme } from "./systemTheme.js";
import { di } from "../ink/terminal.js";
import { onTerminalFocusChanged, getTerminalFocus } from "../ink/terminal-focus-state.js";
import { waitForAttachSettle } from "./attachStamp.js";

//@ chunk-xfhnxaa2.js:3843-3854 placement
var v = 2000;
/**
 * 用 OSC 11 查询终端背景色推断系统主题（tmux/screen 下包装转发），在主题变化推送或获得焦点时重查；返回取消函数。
 */
//@ chunk-xfhnxaa2.js:3854-5008 placement
function watchSystemTheme(e, l, p) {
  let n = !1,
    u = !1,
    y = p?.muxTimeoutMs ?? v,
    a = Boolean(env.TMUX || env.STY) && !isTmuxControlMode();
  async function c() {
    if (u) return;
    u = !0;
    try {
      let r = oscColor(OSC.SET_BG_COLOR),
        s = a ? { ...r, request: wrapForMultiplexer(r.request) } : r,
        o,
        f = a ? "dcs" : "direct";
      if (a) {
        if (
          ((o = await Promise.race([
            e.send(s),
            sleep(y, void 0, { unref: !0 }).then(() => {
              return;
            }),
          ])),
          !o)
        )
          if (n) e.cancel(s);
          else (e.flush(), (f = "mux-bare"), ([o] = await Promise.all([e.send(r), e.flush()])));
      } else [o] = await Promise.all([e.send(s), e.flush()]);
      if (n) return;
      if (!o) {
        (logForDebugging(`systemTheme: OSC 11 query (via=${f}) got no response`, { level: "debug" }),
          (gk().osc11Responsive = !1));
        return;
      }
      gk().osc11Responsive = !0;
      let m = themeFromOscColor(o.data);
      if (
        (logForDebugging(`systemTheme: OSC 11 response=${o.data} detected=${m} via=${f}`, { level: "debug" }),
        m === void 0)
      )
        return;
      (setSystemTheme(m), l(m));
    } finally {
      u = !1;
    }
  }
  let d = env.CLAUDE_BG_BACKEND === "daemon";
  if (gk().osc11Responsive !== !1 && !d) c();
  let subscribeThemeChange = e.subscribeThemeChange((r) => {
      if (di().get(process.stdout)?.modes.isSet("surface")) {
        let s = r ? "dark" : "light";
        (logForDebugging(
          `systemTheme: theme-change push reported=${s}; surface override active, skipping OSC 11 query`,
          { level: "debug" },
        ),
          setSystemTheme(s),
          l(s));
        return;
      }
      c();
    }),
    h = d
      ? onTerminalFocusChanged(() => {
          if (getTerminalFocus() === "focused")
            waitForAttachSettle().then(() => {
              if (!n) c();
            });
        })
      : void 0;
  return () => {
    ((n = !0), subscribeThemeChange(), h?.());
  };
}
