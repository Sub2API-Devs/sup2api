/**
 * commands/scroll-speed/scroll-speed.tsx
 *
 * 2.1.316 新增：/scroll-speed 设置界面：显示演示标尺、编辑器滚轮灵敏度并保存到 userSettings；根据环境变量识别宿主编辑器（Cursor、VS Code、Devin、Antigravity 等）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-myhtjy4v.js (13)
 * attribution: placement 13
 */
import { j, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { clamp } from "../../ink/screen.js";
import { crn, b9 } from "../../ink/terminal.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { scrollStepLines } from "../../components/ScrollKeybindingHandler.js";
import {
  setScrollTraceLiveWatching,
  subscribeScrollTraceLive,
  getScrollTraceLiveState,
} from "../../ink/widest-line.js";
import { updateSettingsForSource, getSettingsFilePathForSource } from "../../utils/settings/settings.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../../services/analytics/index.js";
import { gnn } from "../../utils/terminalProbe.js";
import { sanitizeVersion } from "../../services/analytics/metadata.js";
import { tildify } from "../../utils/path.js";
import { plural, repeatString } from "../../utils/stringUtils.js";
import { nd } from "../../utils/stableEmptyObject.js";
import { r, Fragment, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { Pane } from "../../components/design-system/Pane.js";
import { FocusColumn } from "../../components/design-system/FocusColumn.js";
import { getPlatformDisplayName } from "../../utils/platform.js";
import { env, isWindsurfOrDevin } from "../../utils/env.js";
import { withTimeout } from "../../utils/sleep.js";
import { readVSCodeScrollSensitivity } from "../terminalSetup/terminalSetup.js";

//@ chunk-myhtjy4v.js:5514-5518 placement
j();
//@ chunk-myhtjy4v.js:5518-5554 placement
function xt() {
  return process.env[CLAUDE_CODE_SCROLL_SPEED];
}
//@ chunk-myhtjy4v.js:5554-5601 placement
var Se = "Scroll speed",
  ve = 1,
  Ce = 0.25,
  A = 0.25,
  X = 10;
//@ chunk-myhtjy4v.js:5601-5676 placement
function T(t, o) {
  let D = t < 1 ? Math.round(t / A) * A : Math.round(t);
  return clamp(D, o, X);
}
//@ chunk-myhtjy4v.js:5676-5709 placement
var CLAUDE_CODE_SCROLL_SPEED = "CLAUDE_CODE_SCROLL_SPEED";
//@ chunk-myhtjy4v.js:5709-5787 placement
function I(t) {
  if (t === void 0) delete process.env[CLAUDE_CODE_SCROLL_SPEED];
  else process.env[CLAUDE_CODE_SCROLL_SPEED] = t;
  crn();
}
/**
 * /scroll-speed 设置界面：显示演示标尺、编辑器滚轮灵敏度并保存到 userSettings。
 */
//@ chunk-myhtjy4v.js:5787-10391 placement
function ScrollSpeedDialog(t) {
  let d = w(63),
    { onDone: onDone, showDemoRuler: showDemoRuler, editorSensitivity: editorSensitivity } = t,
    C = showDemoRuler === void 0 ? !0 : showDemoRuler,
    g = editorSensitivity === void 0 ? null : editorSensitivity,
    { storageV5: storageV5 } = Me(),
    [_] = y(xt),
    u,
    Ie;
  if (d[0] === MEMO_CACHE_SENTINEL)
    ((u = b9()), (Ie = scrollStepLines(u.xtermJs, u.wheelFlood, u.wtSession)), (d[0] = u), (d[1] = Ie));
  else ((u = d[0]), (Ie = d[1]));
  let x = Ie,
    ye = u.useDecayCurve ? ve : Ce,
    Ne;
  if (d[2] === MEMO_CACHE_SENTINEL) ((Ne = () => T(u.base, ye)), (d[2] = Ne));
  else Ne = d[2];
  let [m, Ue] = y(Ne),
    [B, Ge] = y(_ !== void 0),
    Xe = R(!1),
    Be = R(!1),
    J = R(!1),
    Le = !u.xtermJs && !u.wheelFlood,
    ze,
    Qe;
  if (d[3] !== C)
    ((ze = () => {
      setScrollTraceLiveWatching(!0, { demoRuler: C });
      let Mt = Le
        ? subscribeScrollTraceLive(() => {
            let Ye = getScrollTraceLiveState();
            if (!Ye) {
              return;
            }
            if (Ye.wheelMode) Xe.current = !0;
            else Be.current = !0;
          })
        : void 0;
      return () => {
        (Mt?.(), setScrollTraceLiveWatching(!1));
      };
    }),
      (Qe = [C, Le]),
      (d[3] = C),
      (d[4] = ze),
      (d[5] = Qe));
  else ((ze = d[4]), (Qe = d[5]));
  P(ze, Qe);
  let Ze, qe;
  if (d[6] !== _)
    ((Ze = () => {
      let He = J;
      return () => {
        if (He.current) {
          return;
        }
        ((He.current = !0), I(_));
      };
    }),
      (qe = [_]),
      (d[6] = _),
      (d[7] = Ze),
      (d[8] = qe));
  else ((Ze = d[7]), (qe = d[8]));
  P(Ze, qe);
  let et;
  if (d[9] !== m)
    ((et = function K(Ft) {
      let Vt = Ft < 0 ? (m <= 1 ? -A : -1) : m < 1 ? A : 1;
      let he = T(m + Vt, ye);
      if (he === m) {
        return;
      }
      ((process.env[CLAUDE_CODE_SCROLL_SPEED] = String(he)), crn(), Ge(!0), Ue(he));
    }),
      (d[9] = m),
      (d[10] = et));
  else et = d[10];
  let K = et,
    tt;
  if (d[11] === MEMO_CACHE_SENTINEL)
    ((tt = function rt() {
      (delete process.env[CLAUDE_CODE_SCROLL_SPEED], crn(), Ue(T(x, ye)), Ge(!1));
    }),
      (d[11] = tt));
  else tt = d[11];
  let rt = tt,
    ot;
  if (d[12] !== _)
    ((ot = function b() {
      I(_);
    }),
      (d[12] = _),
      (d[13] = ot));
  else ot = d[13];
  let b = ot,
    nt;
  if (d[14] !== onDone || d[15] !== b)
    ((nt = function L() {
      if (J.current) {
        return;
      }
      ((J.current = !0), b(), onDone("Scroll speed unchanged"));
    }),
      (d[14] = onDone),
      (d[15] = b),
      (d[16] = nt));
  else nt = d[16];
  let L = nt,
    it;
  if (
    d[17] !== g?.sensitivity ||
    d[18] !== onDone ||
    d[19] !== B ||
    d[20] !== b ||
    d[21] !== m ||
    d[22] !== storageV5
  )
    ((it = async function Q() {
      if (J.current) {
        return;
      }
      J.current = !0;
      let z = !B;
      let jt = { [CLAUDE_CODE_SCROLL_SPEED]: z ? void 0 : String(m) };
      let { error: error } = await updateSettingsForSource("userSettings", { env: jt }, void 0, storageV5);
      if (error) {
        (logError(error), b(), onDone(`Couldn't save scroll speed: ${error.message}`));
        return;
      }
      logEvent("tengu_scroll_speed_set", {
        scroll_speed: z ? x : m,
        scroll_speed_auto: x,
        reset_to_auto: z,
        xterm_js: u.xtermJs,
        wheel_flood: u.wheelFlood,
        wt_session: u.wtSession,
        use_decay_curve: u.useDecayCurve,
        saw_scroll_wheel: Xe.current,
        saw_trackpad: Be.current,
        editor_wheel_sensitivity: g?.sensitivity ?? void 0,
        term_program: gnn(u.termProgram),
        term_program_version: sanitizeVersion(u.termProgramVersion),
      });
      let st = `\`${tildify(getSettingsFilePathForSource("userSettings") ?? "settings.json")}\``;
      onDone(
        z
          ? `Scroll speed reset to auto (${x} ${plural(x, "line")} per notch) \xB7 removed from ${st}`
          : `Scroll speed set to ${m} ${plural(m, "line")} per notch \xB7 saved to ${st}`,
      );
    }),
      (d[17] = g?.sensitivity),
      (d[18] = onDone),
      (d[19] = B),
      (d[20] = b),
      (d[21] = m),
      (d[22] = storageV5),
      (d[23] = it));
  else it = d[23];
  let Q = it,
    at;
  if (d[24] !== K || d[25] !== L || d[26] !== Q)
    ((at = function Y(f) {
      if (f.key === "left") (f.preventDefault(), K(-1));
      else if (f.key === "right") (f.preventDefault(), K(1));
      else if (f.key === "return") (f.preventDefault(), Q());
      else if (f.key === "escape" || (f.ctrl && (f.key === "c" || f.key === "d"))) (f.preventDefault(), L());
      else if (f.key === "r") (f.preventDefault(), rt());
    }),
      (d[24] = K),
      (d[25] = L),
      (d[26] = Q),
      (d[27] = at));
  else at = d[27];
  let Y = at,
    M = !B,
    lt;
  if (d[28] === MEMO_CACHE_SENTINEL) ((lt = nd(!1)), (d[28] = lt));
  else lt = d[28];
  let H = lt,
    dt;
  if (d[29] === MEMO_CACHE_SENTINEL)
    ((dt = !0 && r(Fragment, { children: [e(Text, { bold: !0, children: Se }), e(Box, { height: 1 })] })),
      (d[29] = dt));
  else dt = d[29];
  let ee;
  if (d[30] !== m) ((ee = speedBar(m)), (d[30] = m), (d[31] = ee));
  else ee = d[31];
  let te;
  if (d[32] !== ee) ((te = e(Text, { color: "permission", children: ee })), (d[32] = ee), (d[33] = te));
  else te = d[33];
  let re;
  if (d[34] !== m) ((re = plural(m, "line")), (d[34] = m), (d[35] = re));
  else re = d[35];
  let oe;
  if (d[36] !== m || d[37] !== re)
    ((oe = r(Text, { children: ["  ", m, " ", re, " per wheel notch"] })),
      (d[36] = m),
      (d[37] = re),
      (d[38] = oe));
  else oe = d[38];
  let ne;
  if (d[39] !== M) ((ne = M && e(Text, { dimColor: !0, children: " (auto)" })), (d[39] = M), (d[40] = ne));
  else ne = d[40];
  let ie;
  if (d[41] !== M)
    ((ie = !M && r(Text, { dimColor: !0, children: [" \xB7 auto is ", x] })), (d[41] = M), (d[42] = ie));
  else ie = d[42];
  let se;
  if (d[43] !== te || d[44] !== oe || d[45] !== ne || d[46] !== ie)
    ((se = r(Box, { children: [te, oe, ne, ie] })),
      (d[43] = te),
      (d[44] = oe),
      (d[45] = ne),
      (d[46] = ie),
      (d[47] = se));
  else se = d[47];
  let mt;
  if (d[48] === MEMO_CACHE_SENTINEL) ((mt = e(Box, { height: 1 })), (d[48] = mt));
  else mt = d[48];
  let ut;
  if (d[49] === MEMO_CACHE_SENTINEL)
    ((ut = e(LabeledValue, { label: "Terminal", value: environmentSummary(u) })), (d[49] = ut));
  else ut = d[49];
  let ae;
  if (d[50] !== g)
    ((ae = g && e(LabeledValue, { label: "Editor", value: describeWheelSensitivity(g) })),
      (d[50] = g),
      (d[51] = ae));
  else ae = d[51];
  let ct, pt;
  if (d[52] === MEMO_CACHE_SENTINEL)
    ((ct = e(Box, { height: 1 })),
      (pt = e(Text, { dimColor: !0, children: "Scroll to feel it" })),
      (d[52] = ct),
      (d[53] = pt));
  else ((ct = d[52]), (pt = d[53]));
  let ft;
  if (d[54] === MEMO_CACHE_SENTINEL)
    ((ft = e(Text, {
      dimColor: !0,
      italic: !1,
      children: r(Byline, {
        children: [
          e(KeyboardShortcutHint, { chord: ["left", "right"], action: "adjust", ...H }),
          e(KeyboardShortcutHint, { chord: "r", action: "reset to auto", ...H }),
          e(KeyboardShortcutHint, { chord: "enter", action: "save", ...H }),
          e(KeyboardShortcutHint, { chord: "escape", action: "cancel", ...H }),
        ],
      }),
    })),
      (d[54] = ft));
  else ft = d[54];
  let vt;
  if (d[55] !== se || d[56] !== ae)
    ((vt = r(Box, { flexDirection: "column", children: [dt, se, mt, ut, ae, ct, pt, ft] })),
      (d[55] = se),
      (d[56] = ae),
      (d[57] = vt));
  else vt = d[57];
  let we = vt,
    le;
  if (d[58] !== we) ((le = e(Pane, { color: "permission", children: we })), (d[58] = we), (d[59] = le));
  else le = d[59];
  let gt;
  if (d[60] !== Y || d[61] !== le)
    ((gt = e(FocusColumn, { onKeyDown: Y, children: le })), (d[60] = Y), (d[61] = le), (d[62] = gt));
  else gt = d[62];
  return gt;
}
/**
 * 一行"标签: 值"的小组件。
 */
//@ chunk-myhtjy4v.js:10391-10691 placement
function LabeledValue(t) {
  let E = w(7),
    { label: label, value: D } = t,
    C;
  if (E[0] !== label)
    ((C = e(Box, { width: 12, children: e(Text, { dimColor: !0, children: label }) })),
      (E[0] = label),
      (E[1] = C));
  else C = E[1];
  let g;
  if (E[2] !== D) ((g = e(Text, { children: D })), (E[2] = D), (E[3] = g));
  else g = E[3];
  let W;
  if (E[4] !== C || E[5] !== g) ((W = r(Box, { children: [C, g] })), (E[4] = C), (E[5] = g), (E[6] = W));
  else W = E[6];
  return W;
}
//@ chunk-myhtjy4v.js:10691-10812 placement
function speedBar(t) {
  if (t < 1) return "\u25AA" + repeatString("\xB7", X - 1);
  let o = clamp(Math.round(t), ve, X);
  return "\u25A0".repeat(o) + repeatString("\xB7", X - o);
}
//@ chunk-myhtjy4v.js:10812-11014 placement
function environmentSummary(t) {
  let o = [detectEditorHost(t), getPlatformDisplayName(t.platform)];
  if (t.wheelFlood) o.push("high-rate wheel events");
  else if (t.xtermJs) o.push("xterm.js");
  else if (t.wtSession) o.push("Windows Terminal");
  return o.join(" \xB7 ");
}
/**
 * 根据环境变量识别宿主编辑器（Cursor、VS Code、Devin、Antigravity 等）。
 */
//@ chunk-myhtjy4v.js:11014-11655 placement
function detectEditorHost(t) {
  if (process.env.CURSOR_TRACE_ID !== void 0) return "Cursor";
  let o = env.VSCODE_GIT_ASKPASS_MAIN ?? "";
  if (o.includes("cursor")) return "Cursor (remote)";
  if (isWindsurfOrDevin(o)) return "Devin Desktop";
  if (o.includes("antigravity")) return "Antigravity";
  if (t.termProgram === "vscode")
    return `VS Code${t.termProgramVersion !== "unset" ? ` ${t.termProgramVersion}` : ""}`;
  switch (t.termProgram) {
    case "unset":
      return t.wtSession || t.platform === "win32" ? "Windows console" : "terminal";
    case "iTerm.app":
      return "iTerm2";
    case "Apple_Terminal":
      return "Terminal.app";
    case "ghostty":
      return "Ghostty";
    case "WezTerm":
      return "WezTerm";
    case "WarpTerminal":
      return "Warp";
    default:
      return t.termProgram;
  }
}
/**
 * 描述编辑器滚轮灵敏度设置与推荐值。
 */
//@ chunk-myhtjy4v.js:11655-12004 placement
function describeWheelSensitivity(t) {
  let o = t.editor === "VSCode" ? "VS Code" : t.editor;
  if (t.sensitivity === null)
    return `${o} wheel sensitivity unset \xB7 /terminal-setup sets it to ${t.recommended}`;
  if (t.sensitivity >= t.recommended) return `${o} wheel sensitivity ${t.sensitivity}`;
  return `${o} wheel sensitivity ${t.sensitivity} \xB7 /terminal-setup raises it to ${t.recommended}`;
}
/**
 * 消息少于此数时显示演示标尺。
 */
//@ chunk-myhtjy4v.js:12004-12204 placement
var DEMO_RULER_MAX_MESSAGES = 20,
  runScrollSpeedCommand = async (onDone, context) => {
    let D = context.messages.length < DEMO_RULER_MAX_MESSAGES,
      E = await withTimeout(
        readVSCodeScrollSensitivity(context.session.host),
        250,
        "VS Code settings read timed out",
      ).catch(() => null);
    return e(ScrollSpeedDialog, { onDone: onDone, showDemoRuler: D, editorSensitivity: E });
  };
