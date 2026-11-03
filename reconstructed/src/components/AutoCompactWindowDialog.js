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
import { init_react_production, y, R } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useAppState } from "../state/AppState.js";
import { getModelContextInfo } from "../utils/model/modelContextInfo.js";
import { renderModelName } from "../utils/model/modelDisplay.js";
import { getAutoCompactWindow } from "../services/compact/autoCompact.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { isAutoCompactEnabled } from "../services/compact/compactSettings.js";
import { reportInvalidWindowEnv, isEnvOrSettingsSource } from "../services/compact/autoCompactWindow.js";
import { env } from "../utils/env.js";
import { formatTokens } from "../utils/format.js";
import {
  applyAutoCompactWindow,
  advisesStayingOnAuto,
  isAboveAutoWindow,
} from "../commands/autocompact/autocompact.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { Dialog } from "./design-system/Dialog.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { logEvent } from "../services/analytics/index.js";
import { lit } from "../services/analytics/safeMetadata.js";

//@ chunk-qqj12s77.js:13233-13237 placement
init_react_production();
//@ chunk-qqj12s77.js:13237-13281 placement
function selectAutoCompactWindow(oo) {
  return oo.autoCompactWindow;
}
//@ chunk-qqj12s77.js:13281-13307 placement
var AUTOCOMPACT_STEP_BYTES = 1e5;
var AUTOCOMPACT_MIN_BYTES = 1e5;
var AUTOCOMPACT_MAX_BYTES = 1e6;
var AUTOCOMPACT_DEFAULT_BYTES = 0;
//@ chunk-qqj12s77.js:13307-17045 placement
/**
 * 自动压缩窗口设置对话框：显示模型推荐窗口、当前配置与来源（env/设置），允许覆盖。
 */
function AutoCompactWindowDialog(props) {
  let o = w(42);
  let { onDone, caller } = props;
  let appState = useAppState(selectAutoCompactWindow);
  let modelContextInfo = getModelContextInfo(caller.options.mainLoopModel);
  let E = renderModelName(modelContextInfo.settingsKey);
  let { window: P, configured, source } = getAutoCompactWindow(modelContextInfo, appState);
  let ve;
  if (o[0] === MEMO_CACHE_SENTINEL) {
    ve = isAutoCompactEnabled();
    o[0] = ve;
  } else ve = o[0];
  let Qe = ve;
  let I = configured > P;
  let v = source === "env";
  let ye;
  if (o[1] === MEMO_CACHE_SENTINEL) {
    ye = reportInvalidWindowEnv(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW);
    o[1] = ye;
  } else ye = o[1];
  let B = ye;
  let Ze =
    source === "env"
      ? "from CLAUDE_CODE_AUTO_COMPACT_WINDOW"
      : source === "settings"
        ? "from settings"
        : source === "unknown-model"
          ? "default for an unrecognized model"
          : source === "model-default"
            ? "default for this model"
            : "auto";
  let Ke = !isEnvOrSettingsSource(source)
    ? AUTOCOMPACT_DEFAULT_BYTES
    : Math.min(
        AUTOCOMPACT_MAX_BYTES,
        Math.max(
          AUTOCOMPACT_MIN_BYTES,
          Math.round(configured / AUTOCOMPACT_STEP_BYTES) * AUTOCOMPACT_STEP_BYTES,
        ),
      );
  let [u, We] = y(Ke);
  let [xe, He] = y(false);
  let De;
  if (o[2] !== v) {
    De = function d($e) {
      if (v) {
        return;
      }
      He(true);
      We((be) => {
        if (be === AUTOCOMPACT_DEFAULT_BYTES) {
          return $e > 0 ? AUTOCOMPACT_MIN_BYTES : AUTOCOMPACT_MAX_BYTES;
        }
        let ee = be + $e * AUTOCOMPACT_STEP_BYTES;
        if (ee < AUTOCOMPACT_MIN_BYTES) {
          return AUTOCOMPACT_DEFAULT_BYTES;
        }
        if (ee > AUTOCOMPACT_MAX_BYTES) {
          return AUTOCOMPACT_DEFAULT_BYTES;
        }
        return ee;
      });
    };
    o[2] = v;
    o[3] = De;
  } else De = o[3];
  let d = De;
  let Re;
  if (o[4] !== I || o[5] !== P) {
    Re = I ? ` \xB7 capped to ${formatTokens(P)} by model` : "";
    o[4] = I;
    o[5] = P;
    o[6] = Re;
  } else Re = o[6];
  let ke = Re;
  let oe =
    source === "auto"
      ? "auto"
      : source === "experiment" || source === "clientdata"
        ? `auto (${formatTokens(configured)} tokens)${ke}`
        : `${formatTokens(configured)} tokens (${Ze})${ke}`;
  let A = R(false);
  let V = function V() {
    if (A.current) {
      return;
    }
    if (!xe) {
      A.current = true;
      onDone(`Auto-compact window for ${E} unchanged: ${oe}`);
      return;
    }
    A.current = true;
    let Ne = u === AUTOCOMPACT_DEFAULT_BYTES ? "auto" : String(u);
    applyAutoCompactWindow(Ne, caller, "dialog").then(onDone);
  };
  let X;
  let z;
  if (o[7] !== d) {
    X = () => d(1);
    z = () => d(-1);
    o[7] = d;
    o[8] = X;
    o[9] = z;
  } else {
    X = o[8];
    z = o[9];
  }
  let Ae;
  if (o[10] !== V || o[11] !== X || o[12] !== z) {
    Ae = {
      "select:previous": X,
      "select:next": z,
      "select:accept": V,
    };
    o[10] = V;
    o[11] = X;
    o[12] = z;
    o[13] = Ae;
  } else Ae = o[13];
  let Le;
  if (o[14] === MEMO_CACHE_SENTINEL) {
    Le = {
      context: "Select",
    };
    o[14] = Le;
  } else Le = o[14];
  MessageActionsKeybindings(Ae, Le);
  let _e;
  if (o[15] !== d) {
    _e = {
      "tabs:next": () => d(1),
      "tabs:previous": () => d(-1),
    };
    o[15] = d;
    o[16] = _e;
  } else _e = o[16];
  let Je;
  if (o[17] === MEMO_CACHE_SENTINEL) {
    Je = {
      context: "Tabs",
    };
    o[17] = Je;
  } else Je = o[17];
  MessageActionsKeybindings(_e, Je);
  let Me;
  if (o[18] !== u) {
    Me = u === AUTOCOMPACT_DEFAULT_BYTES ? "auto" : `${formatTokens(u)} tokens`;
    o[18] = u;
    o[19] = Me;
  } else Me = o[19];
  let children = Me;
  const ne = Dialog;
  const title = "Auto-compact window";
  const subtitle = `Current setting for ${E}: ${oe}`;
  const onCancel = () => {
    if (A.current) {
      return;
    }
    A.current = true;
    onDone(`Auto-compact window for ${E} unchanged: ${oe}`);
  };
  let inputGuide;
  if (o[20] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default_2(Byline, {
        children: [
          jsxProd_default(KeyboardShortcutHint, {
            chord: ["left", "right"],
            action: "adjust",
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "apply",
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "escape",
            action: "cancel",
          }),
        ],
      }),
    });
    o[20] = inputGuide;
  } else inputGuide = o[20];
  const ae = Box;
  const flexDirection = "column";
  const gap = 1;
  let Y;
  if (o[21] === MEMO_CACHE_SENTINEL) {
    Y = jsxProd_default(Text, {
      children:
        "This command configures when auto-compaction happens. The actual threshold is the minimum of this setting and your model's maximum context window.",
    });
    o[21] = Y;
  } else Y = o[21];
  const se =
    advisesStayingOnAuto(modelContextInfo.settingsKey) &&
    jsxProd_default_2(Text, {
      children: [
        "The auto setting picks a window tuned for your model and is",
        " ",
        jsxProd_default(Text, {
          bold: true,
          children: "strongly recommended",
        }),
        " for the best cost and performance. You can override it below.",
      ],
    });
  let F;
  if (o[22] === MEMO_CACHE_SENTINEL) {
    F =
      !Qe &&
      jsxProd_default(Text, {
        color: "warning",
        children: "Auto-compact is currently disabled (see /config)",
      });
    o[22] = F;
  } else F = o[22];
  const ie =
    u !== AUTOCOMPACT_DEFAULT_BYTES &&
    isAboveAutoWindow(modelContextInfo, xe ? u : configured) &&
    jsxProd_default(Text, {
      color: "warning",
      children: "Overriding auto may result in high token usage, especially when resuming long sessions.",
    });
  let Q;
  if (o[23] !== B) {
    Q =
      B !== null &&
      jsxProd_default(Text, {
        color: "warning",
        children: B,
      });
    o[23] = B;
    o[24] = Q;
  } else Q = o[24];
  let Z;
  if (o[25] !== children || o[26] !== v) {
    Z = v
      ? jsxProd_default(Text, {
          color: "warning",
          children:
            "CLAUDE_CODE_AUTO_COMPACT_WINDOW is set and takes precedence. Unset it to change this setting here.",
        })
      : jsxProd_default_2(Box, {
          children: [
            jsxProd_default(Text, {
              children: "Select auto-compact window: ",
            }),
            jsxProd_default(Text, {
              bold: true,
              color: "suggestion",
              children,
            }),
          ],
        });
    o[25] = children;
    o[26] = v;
    o[27] = Z;
  } else Z = o[27];
  let children_2;
  if (
    o[28] !== ae ||
    o[29] !== Y ||
    o[30] !== se ||
    o[31] !== F ||
    o[32] !== ie ||
    o[33] !== Q ||
    o[34] !== Z
  ) {
    children_2 = jsxProd_default_2(ae, {
      flexDirection,
      gap,
      children: [Y, se, F, ie, Q, Z],
    });
    o[28] = ae;
    o[29] = Y;
    o[30] = se;
    o[31] = F;
    o[32] = ie;
    o[33] = Q;
    o[34] = Z;
    o[35] = children_2;
  } else children_2 = o[35];
  let Oe;
  if (
    o[36] !== ne ||
    o[37] !== subtitle ||
    o[38] !== onCancel ||
    o[39] !== inputGuide ||
    o[40] !== children_2
  ) {
    Oe = jsxProd_default(ne, {
      title,
      subtitle,
      onCancel,
      inputGuide,
      children: children_2,
    });
    o[36] = ne;
    o[37] = subtitle;
    o[38] = onCancel;
    o[39] = inputGuide;
    o[40] = children_2;
    o[41] = Oe;
  } else Oe = o[41];
  return Oe;
}
//@ chunk-qqj12s77.js:17045-17231 placement
/**
 * /autocompact 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var runAutoCompactCommand = async (onDone, context, args) => {
  let O = args?.trim() || "";
  if (O) {
    let C = await applyAutoCompactWindow(O, context, "typed");
    onDone(C);
    return null;
  }
  logEvent("tengu_autocompact_dialog_opened", {
    source: lit("dialog"),
  });
  return jsxProd_default(AutoCompactWindowDialog, {
    onDone,
    caller: context,
  });
};
