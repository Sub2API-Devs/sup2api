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
import { init_react_production, useState, useRef } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
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
function selectAutoCompactWindow(appState) {
  return appState.autoCompactWindow;
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
  let $ = useMemoCache(42);
  let { onDone, caller } = props;
  let appState = useAppState(selectAutoCompactWindow);
  let modelContextInfo = getModelContextInfo(caller.options.mainLoopModel);
  let modelName = renderModelName(modelContextInfo.settingsKey);
  let { window: cappedWindow, configured, source } = getAutoCompactWindow(modelContextInfo, appState);
  let isAutoCompactOnCached;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    isAutoCompactOnCached = isAutoCompactEnabled();
    $[0] = isAutoCompactOnCached;
  } else isAutoCompactOnCached = $[0];
  let isAutoCompactOn = isAutoCompactOnCached;
  let isCappedByModel = configured > cappedWindow;
  let isEnvLocked = source === "env";
  let invalidEnvWarningCached;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    invalidEnvWarningCached = reportInvalidWindowEnv(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW);
    $[1] = invalidEnvWarningCached;
  } else invalidEnvWarningCached = $[1];
  let invalidEnvWarning = invalidEnvWarningCached;
  let sourceLabel =
    source === "env"
      ? "from CLAUDE_CODE_AUTO_COMPACT_WINDOW"
      : source === "settings"
        ? "from settings"
        : source === "unknown-model"
          ? "default for an unrecognized model"
          : source === "model-default"
            ? "default for this model"
            : "auto";
  let configuredBytes = !isEnvOrSettingsSource(source)
    ? AUTOCOMPACT_DEFAULT_BYTES
    : Math.min(
        AUTOCOMPACT_MAX_BYTES,
        Math.max(
          AUTOCOMPACT_MIN_BYTES,
          Math.round(configured / AUTOCOMPACT_STEP_BYTES) * AUTOCOMPACT_STEP_BYTES,
        ),
      );
  let [windowBytes, setWindowBytes] = useState(configuredBytes);
  let [isCustomized, setIsCustomized] = useState(false);
  let adjustCached;
  if ($[2] !== isEnvLocked) {
    adjustCached = function handleAdjust(steps) {
      if (isEnvLocked) {
        return;
      }
      setIsCustomized(true);
      setWindowBytes((previous) => {
        if (previous === AUTOCOMPACT_DEFAULT_BYTES) {
          return steps > 0 ? AUTOCOMPACT_MIN_BYTES : AUTOCOMPACT_MAX_BYTES;
        }
        let nextValue = previous + steps * AUTOCOMPACT_STEP_BYTES;
        if (nextValue < AUTOCOMPACT_MIN_BYTES) {
          return AUTOCOMPACT_DEFAULT_BYTES;
        }
        if (nextValue > AUTOCOMPACT_MAX_BYTES) {
          return AUTOCOMPACT_DEFAULT_BYTES;
        }
        return nextValue;
      });
    };
    $[2] = isEnvLocked;
    $[3] = adjustCached;
  } else adjustCached = $[3];
  let adjustWindow = adjustCached;
  let cappedSuffixCached;
  if ($[4] !== isCappedByModel || $[5] !== cappedWindow) {
    cappedSuffixCached = isCappedByModel ? ` \xB7 capped to ${formatTokens(cappedWindow)} by model` : "";
    $[4] = isCappedByModel;
    $[5] = cappedWindow;
    $[6] = cappedSuffixCached;
  } else cappedSuffixCached = $[6];
  let cappedSuffix = cappedSuffixCached;
  let currentSummary =
    source === "auto"
      ? "auto"
      : source === "experiment" || source === "clientdata"
        ? `auto (${formatTokens(configured)} tokens)${cappedSuffix}`
        : `${formatTokens(configured)} tokens (${sourceLabel})${cappedSuffix}`;
  let submittedRef = useRef(false);
  let applyAndFinish = function handleApply() {
    if (submittedRef.current) {
      return;
    }
    if (!isCustomized) {
      submittedRef.current = true;
      onDone(`Auto-compact window for ${modelName} unchanged: ${currentSummary}`);
      return;
    }
    submittedRef.current = true;
    let overrideValue = windowBytes === AUTOCOMPACT_DEFAULT_BYTES ? "auto" : String(windowBytes);
    applyAutoCompactWindow(overrideValue, caller, "dialog").then(onDone);
  };
  let increaseWindow;
  let decreaseWindow;
  if ($[7] !== adjustWindow) {
    increaseWindow = () => adjustWindow(1);
    decreaseWindow = () => adjustWindow(-1);
    $[7] = adjustWindow;
    $[8] = increaseWindow;
    $[9] = decreaseWindow;
  } else {
    increaseWindow = $[8];
    decreaseWindow = $[9];
  }
  let selectKeybindings;
  if ($[10] !== applyAndFinish || $[11] !== increaseWindow || $[12] !== decreaseWindow) {
    selectKeybindings = {
      "select:previous": increaseWindow,
      "select:next": decreaseWindow,
      "select:accept": applyAndFinish,
    };
    $[10] = applyAndFinish;
    $[11] = increaseWindow;
    $[12] = decreaseWindow;
    $[13] = selectKeybindings;
  } else selectKeybindings = $[13];
  let selectKeybindingOptions;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    selectKeybindingOptions = {
      context: "Select",
    };
    $[14] = selectKeybindingOptions;
  } else selectKeybindingOptions = $[14];
  MessageActionsKeybindings(selectKeybindings, selectKeybindingOptions);
  let tabKeybindings;
  if ($[15] !== adjustWindow) {
    tabKeybindings = {
      "tabs:next": () => adjustWindow(1),
      "tabs:previous": () => adjustWindow(-1),
    };
    $[15] = adjustWindow;
    $[16] = tabKeybindings;
  } else tabKeybindings = $[16];
  let tabKeybindingOptions;
  if ($[17] === MEMO_CACHE_SENTINEL) {
    tabKeybindingOptions = {
      context: "Tabs",
    };
    $[17] = tabKeybindingOptions;
  } else tabKeybindingOptions = $[17];
  MessageActionsKeybindings(tabKeybindings, tabKeybindingOptions);
  let windowLabel;
  if ($[18] !== windowBytes) {
    windowLabel = windowBytes === AUTOCOMPACT_DEFAULT_BYTES ? "auto" : `${formatTokens(windowBytes)} tokens`;
    $[18] = windowBytes;
    $[19] = windowLabel;
  } else windowLabel = $[19];
  let children = windowLabel;
  const DialogComponent = Dialog;
  const title = "Auto-compact window";
  const subtitle = `Current setting for ${modelName}: ${currentSummary}`;
  const onCancel = () => {
    if (submittedRef.current) {
      return;
    }
    submittedRef.current = true;
    onDone(`Auto-compact window for ${modelName} unchanged: ${currentSummary}`);
  };
  let inputGuide;
  if ($[20] === MEMO_CACHE_SENTINEL) {
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
    $[20] = inputGuide;
  } else inputGuide = $[20];
  const BoxComponent = Box;
  const flexDirection = "column";
  const gap = 1;
  let introText;
  if ($[21] === MEMO_CACHE_SENTINEL) {
    introText = jsxProd_default(Text, {
      children:
        "This command configures when auto-compaction happens. The actual threshold is the minimum of this setting and your model's maximum context window.",
    });
    $[21] = introText;
  } else introText = $[21];
  const stayOnAutoNote =
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
  let disabledWarning;
  if ($[22] === MEMO_CACHE_SENTINEL) {
    disabledWarning =
      !isAutoCompactOn &&
      jsxProd_default(Text, {
        color: "warning",
        children: "Auto-compact is currently disabled (see /config)",
      });
    $[22] = disabledWarning;
  } else disabledWarning = $[22];
  const highUsageWarning =
    windowBytes !== AUTOCOMPACT_DEFAULT_BYTES &&
    isAboveAutoWindow(modelContextInfo, isCustomized ? windowBytes : configured) &&
    jsxProd_default(Text, {
      color: "warning",
      children: "Overriding auto may result in high token usage, especially when resuming long sessions.",
    });
  let envWarningElement;
  if ($[23] !== invalidEnvWarning) {
    envWarningElement =
      invalidEnvWarning !== null &&
      jsxProd_default(Text, {
        color: "warning",
        children: invalidEnvWarning,
      });
    $[23] = invalidEnvWarning;
    $[24] = envWarningElement;
  } else envWarningElement = $[24];
  let selectionElement;
  if ($[25] !== children || $[26] !== isEnvLocked) {
    selectionElement = isEnvLocked
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
    $[25] = children;
    $[26] = isEnvLocked;
    $[27] = selectionElement;
  } else selectionElement = $[27];
  let children_2;
  if (
    $[28] !== BoxComponent ||
    $[29] !== introText ||
    $[30] !== stayOnAutoNote ||
    $[31] !== disabledWarning ||
    $[32] !== highUsageWarning ||
    $[33] !== envWarningElement ||
    $[34] !== selectionElement
  ) {
    children_2 = jsxProd_default_2(BoxComponent, {
      flexDirection,
      gap,
      children: [
        introText,
        stayOnAutoNote,
        disabledWarning,
        highUsageWarning,
        envWarningElement,
        selectionElement,
      ],
    });
    $[28] = BoxComponent;
    $[29] = introText;
    $[30] = stayOnAutoNote;
    $[31] = disabledWarning;
    $[32] = highUsageWarning;
    $[33] = envWarningElement;
    $[34] = selectionElement;
    $[35] = children_2;
  } else children_2 = $[35];
  let dialogElement;
  if (
    $[36] !== DialogComponent ||
    $[37] !== subtitle ||
    $[38] !== onCancel ||
    $[39] !== inputGuide ||
    $[40] !== children_2
  ) {
    dialogElement = jsxProd_default(DialogComponent, {
      title,
      subtitle,
      onCancel,
      inputGuide,
      children: children_2,
    });
    $[36] = DialogComponent;
    $[37] = subtitle;
    $[38] = onCancel;
    $[39] = inputGuide;
    $[40] = children_2;
    $[41] = dialogElement;
  } else dialogElement = $[41];
  return dialogElement;
}
//@ chunk-qqj12s77.js:17045-17231 placement
/**
 * /autocompact 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var runAutoCompactCommand = async (onDone, context, args) => {
  let kind = args?.trim() || "";
  if (kind) {
    let detail = await applyAutoCompactWindow(kind, context, "typed");
    onDone(detail);
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
export { runAutoCompactCommand };
