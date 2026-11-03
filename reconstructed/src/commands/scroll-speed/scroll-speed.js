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
import { init_react_production, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { clamp } from "../../ink/screen.js";
import { invalidateCursorYankBug, hasCursorUpViewportYankBug } from "../../ink/terminal.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
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
import { sanitizeTerminalName } from "../../utils/terminalProbe.js";
import { sanitizeVersion } from "../../services/analytics/metadata.js";
import { tildify } from "../../utils/path.js";
import { plural, repeatString } from "../../utils/stringUtils.js";
import { stableEmptyObject } from "../../utils/stableEmptyObject.js";
import {
  jsxProd_default_2,
  Fragment,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
init_react_production();
//@ chunk-myhtjy4v.js:5518-5554 placement
function scrollSpeedEnvValue() {
  return process.env[CLAUDE_CODE_SCROLL_SPEED];
}
//@ chunk-myhtjy4v.js:5554-5601 placement
var SCROLL_SPEED_TITLE = "Scroll speed";
var SCROLL_SPEED_MIN = 1;
var SCROLL_SPEED_DECAY_START = 0.25;
var SCROLL_SPEED_STEP = 0.25;
var SCROLL_SPEED_BAR_TICKS = 10;
//@ chunk-myhtjy4v.js:5601-5676 placement
function snapScrollSpeed(t, o) {
  let D = t < 1 ? Math.round(t / SCROLL_SPEED_STEP) * SCROLL_SPEED_STEP : Math.round(t);
  return clamp(D, o, SCROLL_SPEED_BAR_TICKS);
}
//@ chunk-myhtjy4v.js:5676-5709 placement
var CLAUDE_CODE_SCROLL_SPEED = "CLAUDE_CODE_SCROLL_SPEED";
//@ chunk-myhtjy4v.js:5709-5787 placement
function setScrollSpeedEnv(t) {
  if (t === undefined) delete process.env[CLAUDE_CODE_SCROLL_SPEED];
  else process.env[CLAUDE_CODE_SCROLL_SPEED] = t;
  invalidateCursorYankBug();
}
//@ chunk-myhtjy4v.js:5787-10391 placement
/**
 * /scroll-speed 设置界面：显示演示标尺、编辑器滚轮灵敏度并保存到 userSettings。
 */
function ScrollSpeedDialog(props) {
  let d = w(63);
  let { onDone, showDemoRuler, editorSensitivity } = props;
  let C = showDemoRuler === undefined ? true : showDemoRuler;
  let g = editorSensitivity === undefined ? null : editorSensitivity;
  let { storageV5 } = useTheme_2();
  let [_] = y(scrollSpeedEnvValue);
  let u;
  let Ie;
  if (d[0] === MEMO_CACHE_SENTINEL) {
    u = hasCursorUpViewportYankBug();
    Ie = scrollStepLines(u.xtermJs, u.wheelFlood, u.wtSession);
    d[0] = u;
    d[1] = Ie;
  } else {
    u = d[0];
    Ie = d[1];
  }
  let x = Ie;
  let ye = u.useDecayCurve ? SCROLL_SPEED_MIN : SCROLL_SPEED_DECAY_START;
  let Ne;
  if (d[2] === MEMO_CACHE_SENTINEL) {
    Ne = () => snapScrollSpeed(u.base, ye);
    d[2] = Ne;
  } else Ne = d[2];
  let [m, Ue] = y(Ne);
  let [B, Ge] = y(_ !== undefined);
  let Xe = R(false);
  let Be = R(false);
  let J = R(false);
  let Le = !u.xtermJs && !u.wheelFlood;
  let ze;
  let Qe;
  if (d[3] !== C) {
    ze = () => {
      setScrollTraceLiveWatching(true, {
        demoRuler: C,
      });
      let Mt = Le
        ? subscribeScrollTraceLive(() => {
            let scrollTraceLiveState = getScrollTraceLiveState();
            if (!scrollTraceLiveState) {
              return;
            }
            if (scrollTraceLiveState.wheelMode) Xe.current = true;
            else Be.current = true;
          })
        : undefined;
      return () => {
        Mt?.();
        setScrollTraceLiveWatching(false);
      };
    };
    Qe = [C, Le];
    d[3] = C;
    d[4] = ze;
    d[5] = Qe;
  } else {
    ze = d[4];
    Qe = d[5];
  }
  P(ze, Qe);
  let Ze;
  let qe;
  if (d[6] !== _) {
    Ze = () => {
      let He = J;
      return () => {
        if (He.current) {
          return;
        }
        He.current = true;
        setScrollSpeedEnv(_);
      };
    };
    qe = [_];
    d[6] = _;
    d[7] = Ze;
    d[8] = qe;
  } else {
    Ze = d[7];
    qe = d[8];
  }
  P(Ze, qe);
  let et;
  if (d[9] !== m) {
    et = function K(Ft) {
      let Vt = Ft < 0 ? (m <= 1 ? -SCROLL_SPEED_STEP : -1) : m < 1 ? SCROLL_SPEED_STEP : 1;
      let he = snapScrollSpeed(m + Vt, ye);
      if (he === m) {
        return;
      }
      process.env[CLAUDE_CODE_SCROLL_SPEED] = String(he);
      invalidateCursorYankBug();
      Ge(true);
      Ue(he);
    };
    d[9] = m;
    d[10] = et;
  } else et = d[10];
  let K = et;
  let tt;
  if (d[11] === MEMO_CACHE_SENTINEL) {
    tt = function rt() {
      delete process.env[CLAUDE_CODE_SCROLL_SPEED];
      invalidateCursorYankBug();
      Ue(snapScrollSpeed(x, ye));
      Ge(false);
    };
    d[11] = tt;
  } else tt = d[11];
  let rt = tt;
  let ot;
  if (d[12] !== _) {
    ot = function b() {
      setScrollSpeedEnv(_);
    };
    d[12] = _;
    d[13] = ot;
  } else ot = d[13];
  let b = ot;
  let nt;
  if (d[14] !== onDone || d[15] !== b) {
    nt = function L() {
      if (J.current) {
        return;
      }
      J.current = true;
      b();
      onDone("Scroll speed unchanged");
    };
    d[14] = onDone;
    d[15] = b;
    d[16] = nt;
  } else nt = d[16];
  let L = nt;
  let it;
  if (
    d[17] !== g?.sensitivity ||
    d[18] !== onDone ||
    d[19] !== B ||
    d[20] !== b ||
    d[21] !== m ||
    d[22] !== storageV5
  ) {
    it = async function Q() {
      if (J.current) {
        return;
      }
      J.current = true;
      let z = !B;
      let env = {
        [CLAUDE_CODE_SCROLL_SPEED]: z ? undefined : String(m),
      };
      let { error } = await updateSettingsForSource(
        "userSettings",
        {
          env,
        },
        undefined,
        storageV5,
      );
      if (error) {
        logError(error);
        b();
        onDone(`Couldn't save scroll speed: ${error.message}`);
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
        editor_wheel_sensitivity: g?.sensitivity ?? undefined,
        term_program: sanitizeTerminalName(u.termProgram),
        term_program_version: sanitizeVersion(u.termProgramVersion),
      });
      let st = `\`${tildify(getSettingsFilePathForSource("userSettings") ?? "settings.json")}\``;
      onDone(
        z
          ? `Scroll speed reset to auto (${x} ${plural(x, "line")} per notch) \xB7 removed from ${st}`
          : `Scroll speed set to ${m} ${plural(m, "line")} per notch \xB7 saved to ${st}`,
      );
    };
    d[17] = g?.sensitivity;
    d[18] = onDone;
    d[19] = B;
    d[20] = b;
    d[21] = m;
    d[22] = storageV5;
    d[23] = it;
  } else it = d[23];
  let Q = it;
  let at;
  if (d[24] !== K || d[25] !== L || d[26] !== Q) {
    at = function Y(event) {
      if (event.key === "left") {
        event.preventDefault();
        K(-1);
      } else if (event.key === "right") {
        event.preventDefault();
        K(1);
      } else if (event.key === "return") {
        event.preventDefault();
        Q();
      } else if (event.key === "escape" || (event.ctrl && (event.key === "c" || event.key === "d"))) {
        event.preventDefault();
        L();
      } else if (event.key === "r") {
        event.preventDefault();
        rt();
      }
    };
    d[24] = K;
    d[25] = L;
    d[26] = Q;
    d[27] = at;
  } else at = d[27];
  let onKeyDown = at;
  let M = !B;
  let lt;
  if (d[28] === MEMO_CACHE_SENTINEL) {
    lt = stableEmptyObject(false);
    d[28] = lt;
  } else lt = d[28];
  let H = lt;
  let dt;
  if (d[29] === MEMO_CACHE_SENTINEL) {
    dt =
      true &&
      jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(Text, {
            bold: true,
            children: SCROLL_SPEED_TITLE,
          }),
          jsxProd_default(Box, {
            height: 1,
          }),
        ],
      });
    d[29] = dt;
  } else dt = d[29];
  let children;
  if (d[30] !== m) {
    children = speedBar(m);
    d[30] = m;
    d[31] = children;
  } else children = d[31];
  let te;
  if (d[32] !== children) {
    te = jsxProd_default(Text, {
      color: "permission",
      children,
    });
    d[32] = children;
    d[33] = te;
  } else te = d[33];
  let re;
  if (d[34] !== m) {
    re = plural(m, "line");
    d[34] = m;
    d[35] = re;
  } else re = d[35];
  let oe;
  if (d[36] !== m || d[37] !== re) {
    oe = jsxProd_default_2(Text, {
      children: ["  ", m, " ", re, " per wheel notch"],
    });
    d[36] = m;
    d[37] = re;
    d[38] = oe;
  } else oe = d[38];
  let ne;
  if (d[39] !== M) {
    ne =
      M &&
      jsxProd_default(Text, {
        dimColor: true,
        children: " (auto)",
      });
    d[39] = M;
    d[40] = ne;
  } else ne = d[40];
  let ie;
  if (d[41] !== M) {
    ie =
      !M &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [" \xB7 auto is ", x],
      });
    d[41] = M;
    d[42] = ie;
  } else ie = d[42];
  let se;
  if (d[43] !== te || d[44] !== oe || d[45] !== ne || d[46] !== ie) {
    se = jsxProd_default_2(Box, {
      children: [te, oe, ne, ie],
    });
    d[43] = te;
    d[44] = oe;
    d[45] = ne;
    d[46] = ie;
    d[47] = se;
  } else se = d[47];
  let mt;
  if (d[48] === MEMO_CACHE_SENTINEL) {
    mt = jsxProd_default(Box, {
      height: 1,
    });
    d[48] = mt;
  } else mt = d[48];
  let ut;
  if (d[49] === MEMO_CACHE_SENTINEL) {
    ut = jsxProd_default(LabeledValue, {
      label: "Terminal",
      value: environmentSummary(u),
    });
    d[49] = ut;
  } else ut = d[49];
  let ae;
  if (d[50] !== g) {
    ae =
      g &&
      jsxProd_default(LabeledValue, {
        label: "Editor",
        value: describeWheelSensitivity(g),
      });
    d[50] = g;
    d[51] = ae;
  } else ae = d[51];
  let ct;
  let pt;
  if (d[52] === MEMO_CACHE_SENTINEL) {
    ct = jsxProd_default(Box, {
      height: 1,
    });
    pt = jsxProd_default(Text, {
      dimColor: true,
      children: "Scroll to feel it",
    });
    d[52] = ct;
    d[53] = pt;
  } else {
    ct = d[52];
    pt = d[53];
  }
  let ft;
  if (d[54] === MEMO_CACHE_SENTINEL) {
    ft = jsxProd_default(Text, {
      dimColor: true,
      italic: false,
      children: jsxProd_default_2(Byline, {
        children: [
          jsxProd_default(KeyboardShortcutHint, {
            chord: ["left", "right"],
            action: "adjust",
            ...H,
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "r",
            action: "reset to auto",
            ...H,
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "save",
            ...H,
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "escape",
            action: "cancel",
            ...H,
          }),
        ],
      }),
    });
    d[54] = ft;
  } else ft = d[54];
  let vt;
  if (d[55] !== se || d[56] !== ae) {
    vt = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [dt, se, mt, ut, ae, ct, pt, ft],
    });
    d[55] = se;
    d[56] = ae;
    d[57] = vt;
  } else vt = d[57];
  let children_2 = vt;
  let children_3;
  if (d[58] !== children_2) {
    children_3 = jsxProd_default(Pane, {
      color: "permission",
      children: children_2,
    });
    d[58] = children_2;
    d[59] = children_3;
  } else children_3 = d[59];
  let gt;
  if (d[60] !== onKeyDown || d[61] !== children_3) {
    gt = jsxProd_default(FocusColumn, {
      onKeyDown,
      children: children_3,
    });
    d[60] = onKeyDown;
    d[61] = children_3;
    d[62] = gt;
  } else gt = d[62];
  return gt;
}
//@ chunk-myhtjy4v.js:10391-10691 placement
/**
 * 一行"标签: 值"的小组件。
 */
function LabeledValue(props) {
  let E = w(7);
  let { label, value: D } = props;
  let C;
  if (E[0] !== label) {
    C = jsxProd_default(Box, {
      width: 12,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: label,
      }),
    });
    E[0] = label;
    E[1] = C;
  } else C = E[1];
  let g;
  if (E[2] !== D) {
    g = jsxProd_default(Text, {
      children: D,
    });
    E[2] = D;
    E[3] = g;
  } else g = E[3];
  let W;
  if (E[4] !== C || E[5] !== g) {
    W = jsxProd_default_2(Box, {
      children: [C, g],
    });
    E[4] = C;
    E[5] = g;
    E[6] = W;
  } else W = E[6];
  return W;
}
//@ chunk-myhtjy4v.js:10691-10812 placement
function speedBar(t) {
  if (t < 1) return "\u25AA" + repeatString("\xB7", SCROLL_SPEED_BAR_TICKS - 1);
  let o = clamp(Math.round(t), SCROLL_SPEED_MIN, SCROLL_SPEED_BAR_TICKS);
  return "\u25A0".repeat(o) + repeatString("\xB7", SCROLL_SPEED_BAR_TICKS - o);
}
//@ chunk-myhtjy4v.js:10812-11014 placement
function environmentSummary(t) {
  let o = [detectEditorHost(t), getPlatformDisplayName(t.platform)];
  if (t.wheelFlood) o.push("high-rate wheel events");
  else if (t.xtermJs) o.push("xterm.js");
  else if (t.wtSession) o.push("Windows Terminal");
  return o.join(" \xB7 ");
}
//@ chunk-myhtjy4v.js:11014-11655 placement
/**
 * 根据环境变量识别宿主编辑器（Cursor、VS Code、Devin、Antigravity 等）。
 */
function detectEditorHost(t) {
  if (process.env.CURSOR_TRACE_ID !== undefined) return "Cursor";
  let VSCODE_GIT_ASKPASS_MAIN = env.VSCODE_GIT_ASKPASS_MAIN ?? "";
  if (VSCODE_GIT_ASKPASS_MAIN.includes("cursor")) return "Cursor (remote)";
  if (isWindsurfOrDevin(VSCODE_GIT_ASKPASS_MAIN)) return "Devin Desktop";
  if (VSCODE_GIT_ASKPASS_MAIN.includes("antigravity")) return "Antigravity";
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
//@ chunk-myhtjy4v.js:11655-12004 placement
/**
 * 描述编辑器滚轮灵敏度设置与推荐值。
 */
function describeWheelSensitivity(t) {
  let editor = t.editor === "VSCode" ? "VS Code" : t.editor;
  if (t.sensitivity === null)
    return `${editor} wheel sensitivity unset \xB7 /terminal-setup sets it to ${t.recommended}`;
  if (t.sensitivity >= t.recommended) return `${editor} wheel sensitivity ${t.sensitivity}`;
  return `${editor} wheel sensitivity ${t.sensitivity} \xB7 /terminal-setup raises it to ${t.recommended}`;
}
//@ chunk-myhtjy4v.js:12004-12204 placement
/**
 * 消息少于此数时显示演示标尺。
 */
var DEMO_RULER_MAX_MESSAGES = 20;
var runScrollSpeedCommand = async (onDone, context) => {
  let showDemoRuler = context.messages.length < DEMO_RULER_MAX_MESSAGES;
  let editorSensitivity = await withTimeout(
    readVSCodeScrollSensitivity(context.session.host),
    250,
    "VS Code settings read timed out",
  ).catch(() => null);
  return jsxProd_default(ScrollSpeedDialog, {
    onDone,
    showDemoRuler,
    editorSensitivity,
  });
};
