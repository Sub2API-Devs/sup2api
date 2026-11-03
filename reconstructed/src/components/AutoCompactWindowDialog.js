/**
 * components/AutoCompactWindowDialog.tsx
 *
 * 2.1.316 新增：自动压缩窗口设置对话框
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qqj12s77.js (5)
 * attribution: placement 5
 */
import { j, y, R } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useAppState } from "../state/AppState.js";
import { getModelContextInfo } from "../utils/model/modelContextInfo.js";
import { renderModelName } from "../utils/model/modelDisplay.js";
import { getAutoCompactWindow } from "../services/compact/autoCompact.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { isAutoCompactEnabled } from "../services/compact/compactSettings.js";
import { oKe, Zjt } from "../services/compact/autoCompactWindow.js";
import { env } from "../utils/env.js";
import { formatTokens } from "../utils/format.js";
import {
  applyAutoCompactWindow,
  advisesStayingOnAuto,
  isAboveAutoWindow,
} from "../commands/autocompact/autocompact.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { Dialog } from "./design-system/Dialog.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { logEvent } from "../services/analytics/index.js";
import { lit } from "../services/analytics/safeMetadata.js";

//@ chunk-qqj12s77.js:13233-13237 placement
j();
//@ chunk-qqj12s77.js:13237-13281 placement
function Fe(oo) {
  return oo.autoCompactWindow;
}
//@ chunk-qqj12s77.js:13281-13307 placement
var m = 1e5,
  p = 1e5,
  f = 1e6,
  t = 0;
/**
 * 自动压缩窗口设置对话框：显示模型推荐窗口、当前配置与来源（env/设置），允许覆盖。
 */
//@ chunk-qqj12s77.js:13307-17045 placement
function AutoCompactWindowDialog(J) {
  let o = w(42),
    { onDone: onDone, caller: caller } = J,
    O = useAppState(Fe),
    C = getModelContextInfo(caller.options.mainLoopModel),
    E = renderModelName(C.settingsKey),
    { window: P, configured: configured, source: source } = getAutoCompactWindow(C, O),
    ve;
  if (o[0] === MEMO_CACHE_SENTINEL) ((ve = isAutoCompactEnabled()), (o[0] = ve));
  else ve = o[0];
  let Qe = ve,
    I = configured > P,
    v = source === "env",
    ye;
  if (o[1] === MEMO_CACHE_SENTINEL) ((ye = oKe(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW)), (o[1] = ye));
  else ye = o[1];
  let B = ye,
    Ze =
      source === "env"
        ? "from CLAUDE_CODE_AUTO_COMPACT_WINDOW"
        : source === "settings"
          ? "from settings"
          : source === "unknown-model"
            ? "default for an unrecognized model"
            : source === "model-default"
              ? "default for this model"
              : "auto",
    Ke = !Zjt(source) ? t : Math.min(f, Math.max(p, Math.round(configured / m) * m)),
    [u, We] = y(Ke),
    [xe, He] = y(!1),
    De;
  if (o[2] !== v)
    ((De = function d($e) {
      if (v) {
        return;
      }
      (He(!0),
        We((be) => {
          if (be === t) {
            return $e > 0 ? p : f;
          }
          let ee = be + $e * m;
          if (ee < p) {
            return t;
          }
          if (ee > f) {
            return t;
          }
          return ee;
        }));
    }),
      (o[2] = v),
      (o[3] = De));
  else De = o[3];
  let d = De,
    Re;
  if (o[4] !== I || o[5] !== P)
    ((Re = I ? ` \xB7 capped to ${formatTokens(P)} by model` : ""), (o[4] = I), (o[5] = P), (o[6] = Re));
  else Re = o[6];
  let ke = Re,
    oe =
      source === "auto"
        ? "auto"
        : source === "experiment" || source === "clientdata"
          ? `auto (${formatTokens(configured)} tokens)${ke}`
          : `${formatTokens(configured)} tokens (${Ze})${ke}`,
    A = R(!1),
    V = function V() {
      if (A.current) {
        return;
      }
      if (!xe) {
        ((A.current = !0), onDone(`Auto-compact window for ${E} unchanged: ${oe}`));
        return;
      }
      A.current = !0;
      let Ne = u === t ? "auto" : String(u);
      applyAutoCompactWindow(Ne, caller, "dialog").then(onDone);
    },
    X,
    z;
  if (o[7] !== d) ((X = () => d(1)), (z = () => d(-1)), (o[7] = d), (o[8] = X), (o[9] = z));
  else ((X = o[8]), (z = o[9]));
  let Ae;
  if (o[10] !== V || o[11] !== X || o[12] !== z)
    ((Ae = { "select:previous": X, "select:next": z, "select:accept": V }),
      (o[10] = V),
      (o[11] = X),
      (o[12] = z),
      (o[13] = Ae));
  else Ae = o[13];
  let Le;
  if (o[14] === MEMO_CACHE_SENTINEL) ((Le = { context: "Select" }), (o[14] = Le));
  else Le = o[14];
  MessageActionsKeybindings(Ae, Le);
  let _e;
  if (o[15] !== d)
    ((_e = { "tabs:next": () => d(1), "tabs:previous": () => d(-1) }), (o[15] = d), (o[16] = _e));
  else _e = o[16];
  let Je;
  if (o[17] === MEMO_CACHE_SENTINEL) ((Je = { context: "Tabs" }), (o[17] = Je));
  else Je = o[17];
  MessageActionsKeybindings(_e, Je);
  let Me;
  if (o[18] !== u) ((Me = u === t ? "auto" : `${formatTokens(u)} tokens`), (o[18] = u), (o[19] = Me));
  else Me = o[19];
  let te = Me;
  const ne = Dialog,
    Te = "Auto-compact window",
    ce = `Current setting for ${E}: ${oe}`,
    re = () => {
      if (A.current) {
        return;
      }
      ((A.current = !0), onDone(`Auto-compact window for ${E} unchanged: ${oe}`));
    };
  let U;
  if (o[20] === MEMO_CACHE_SENTINEL)
    ((U = e(Text, {
      dimColor: !0,
      children: r(Byline, {
        children: [
          e(KeyboardShortcutHint, { chord: ["left", "right"], action: "adjust" }),
          e(KeyboardShortcutHint, { chord: "enter", action: "apply" }),
          e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
        ],
      }),
    })),
      (o[20] = U));
  else U = o[20];
  const ae = Box,
    Ie = "column",
    eo = 1;
  let Y;
  if (o[21] === MEMO_CACHE_SENTINEL)
    ((Y = e(Text, {
      children:
        "This command configures when auto-compaction happens. The actual threshold is the minimum of this setting and your model's maximum context window.",
    })),
      (o[21] = Y));
  else Y = o[21];
  const se =
    advisesStayingOnAuto(C.settingsKey) &&
    r(Text, {
      children: [
        "The auto setting picks a window tuned for your model and is",
        " ",
        e(Text, { bold: !0, children: "strongly recommended" }),
        " for the best cost and performance. You can override it below.",
      ],
    });
  let F;
  if (o[22] === MEMO_CACHE_SENTINEL)
    ((F = !Qe && e(Text, { color: "warning", children: "Auto-compact is currently disabled (see /config)" })),
      (o[22] = F));
  else F = o[22];
  const ie =
    u !== t &&
    isAboveAutoWindow(C, xe ? u : configured) &&
    e(Text, {
      color: "warning",
      children: "Overriding auto may result in high token usage, especially when resuming long sessions.",
    });
  let Q;
  if (o[23] !== B) ((Q = B !== null && e(Text, { color: "warning", children: B })), (o[23] = B), (o[24] = Q));
  else Q = o[24];
  let Z;
  if (o[25] !== te || o[26] !== v)
    ((Z = v
      ? e(Text, {
          color: "warning",
          children:
            "CLAUDE_CODE_AUTO_COMPACT_WINDOW is set and takes precedence. Unset it to change this setting here.",
        })
      : r(Box, {
          children: [
            e(Text, { children: "Select auto-compact window: " }),
            e(Text, { bold: !0, color: "suggestion", children: te }),
          ],
        })),
      (o[25] = te),
      (o[26] = v),
      (o[27] = Z));
  else Z = o[27];
  let K;
  if (
    o[28] !== ae ||
    o[29] !== Y ||
    o[30] !== se ||
    o[31] !== F ||
    o[32] !== ie ||
    o[33] !== Q ||
    o[34] !== Z
  )
    ((K = r(ae, { flexDirection: Ie, gap: eo, children: [Y, se, F, ie, Q, Z] })),
      (o[28] = ae),
      (o[29] = Y),
      (o[30] = se),
      (o[31] = F),
      (o[32] = ie),
      (o[33] = Q),
      (o[34] = Z),
      (o[35] = K));
  else K = o[35];
  let Oe;
  if (o[36] !== ne || o[37] !== ce || o[38] !== re || o[39] !== U || o[40] !== K)
    ((Oe = e(ne, { title: Te, subtitle: ce, onCancel: re, inputGuide: U, children: K })),
      (o[36] = ne),
      (o[37] = ce),
      (o[38] = re),
      (o[39] = U),
      (o[40] = K),
      (o[41] = Oe));
  else Oe = o[41];
  return Oe;
}
/**
 * /autocompact 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-qqj12s77.js:17045-17231 placement
var runAutoCompactCommand = async (onDone, context, args) => {
  let O = args?.trim() || "";
  if (O) {
    let C = await applyAutoCompactWindow(O, context, "typed");
    return (onDone(C), null);
  }
  return (
    logEvent("tengu_autocompact_dialog_opened", { source: lit("dialog") }),
    e(AutoCompactWindowDialog, { onDone: onDone, caller: context })
  );
};
