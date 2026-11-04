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
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { clamp } from "../../ink/screen.js";
import { invalidateCursorYankBug, hasCursorUpViewportYankBug } from "../../ink/terminal.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
function snapScrollSpeed(speed, minSpeed) {
  let snapped = speed < 1 ? Math.round(speed / SCROLL_SPEED_STEP) * SCROLL_SPEED_STEP : Math.round(speed);
  return clamp(snapped, minSpeed, SCROLL_SPEED_BAR_TICKS);
}
//@ chunk-myhtjy4v.js:5676-5709 placement
var CLAUDE_CODE_SCROLL_SPEED = "CLAUDE_CODE_SCROLL_SPEED";
//@ chunk-myhtjy4v.js:5709-5787 placement
function setScrollSpeedEnv(speed) {
  if (speed === undefined) delete process.env[CLAUDE_CODE_SCROLL_SPEED];
  else process.env[CLAUDE_CODE_SCROLL_SPEED] = speed;
  invalidateCursorYankBug();
}
//@ chunk-myhtjy4v.js:5787-10391 placement
/**
 * /scroll-speed 设置界面：显示演示标尺、编辑器滚轮灵敏度并保存到 userSettings。
 */
function ScrollSpeedDialog(props) {
  let $ = useMemoCache(63);
  let { onDone, showDemoRuler, editorSensitivity } = props;
  let showDemo = showDemoRuler === undefined ? true : showDemoRuler;
  let sensitivity = editorSensitivity === undefined ? null : editorSensitivity;
  let { storageV5 } = useTheme_2();
  let [envScrollSpeed] = useState(scrollSpeedEnvValue);
  let bugInfo;
  let autoSpeed;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    bugInfo = hasCursorUpViewportYankBug();
    autoSpeed = scrollStepLines(bugInfo.xtermJs, bugInfo.wheelFlood, bugInfo.wtSession);
    $[0] = bugInfo;
    $[1] = autoSpeed;
  } else {
    bugInfo = $[0];
    autoSpeed = $[1];
  }
  let autoSpeedLines = autoSpeed;
  let minSpeed = bugInfo.useDecayCurve ? SCROLL_SPEED_MIN : SCROLL_SPEED_DECAY_START;
  let initialSnap;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    initialSnap = () => snapScrollSpeed(bugInfo.base, minSpeed);
    $[2] = initialSnap;
  } else initialSnap = $[2];
  let [speed, setSpeed] = useState(initialSnap);
  let [isCustom, setIsCustom] = useState(envScrollSpeed !== undefined);
  let sawScrollWheel = useRef(false);
  let sawTrackpad = useRef(false);
  let finishedRef = useRef(false);
  let canWatchLive = !bugInfo.xtermJs && !bugInfo.wheelFlood;
  let liveWatchEffect;
  let liveWatchDeps;
  if ($[3] !== showDemo) {
    liveWatchEffect = () => {
      setScrollTraceLiveWatching(true, {
        demoRuler: showDemo,
      });
      let unsubscribe = canWatchLive
        ? subscribeScrollTraceLive(() => {
            let scrollTraceLiveState = getScrollTraceLiveState();
            if (!scrollTraceLiveState) {
              return;
            }
            if (scrollTraceLiveState.wheelMode) sawScrollWheel.current = true;
            else sawTrackpad.current = true;
          })
        : undefined;
      return () => {
        unsubscribe?.();
        setScrollTraceLiveWatching(false);
      };
    };
    liveWatchDeps = [showDemo, canWatchLive];
    $[3] = showDemo;
    $[4] = liveWatchEffect;
    $[5] = liveWatchDeps;
  } else {
    liveWatchEffect = $[4];
    liveWatchDeps = $[5];
  }
  useEffect(liveWatchEffect, liveWatchDeps);
  let restoreEnvEffect;
  let restoreEnvDeps;
  if ($[6] !== envScrollSpeed) {
    restoreEnvEffect = () => {
      let finishedAtMount = finishedRef;
      return () => {
        if (finishedAtMount.current) {
          return;
        }
        finishedAtMount.current = true;
        setScrollSpeedEnv(envScrollSpeed);
      };
    };
    restoreEnvDeps = [envScrollSpeed];
    $[6] = envScrollSpeed;
    $[7] = restoreEnvEffect;
    $[8] = restoreEnvDeps;
  } else {
    restoreEnvEffect = $[7];
    restoreEnvDeps = $[8];
  }
  useEffect(restoreEnvEffect, restoreEnvDeps);
  let adjustSpeedFn;
  if ($[9] !== speed) {
    adjustSpeedFn = function delta(direction) {
      let stepSize =
        direction < 0 ? (speed <= 1 ? -SCROLL_SPEED_STEP : -1) : speed < 1 ? SCROLL_SPEED_STEP : 1;
      let nextSpeed = snapScrollSpeed(speed + stepSize, minSpeed);
      if (nextSpeed === speed) {
        return;
      }
      process.env[CLAUDE_CODE_SCROLL_SPEED] = String(nextSpeed);
      invalidateCursorYankBug();
      setIsCustom(true);
      setSpeed(nextSpeed);
    };
    $[9] = speed;
    $[10] = adjustSpeedFn;
  } else adjustSpeedFn = $[10];
  let adjustSpeed = adjustSpeedFn;
  let resetToAutoFn;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    resetToAutoFn = function resetToAutoImpl() {
      delete process.env[CLAUDE_CODE_SCROLL_SPEED];
      invalidateCursorYankBug();
      setSpeed(snapScrollSpeed(autoSpeedLines, minSpeed));
      setIsCustom(false);
    };
    $[11] = resetToAutoFn;
  } else resetToAutoFn = $[11];
  let resetToAuto = resetToAutoFn;
  let restoreEnvFn;
  if ($[12] !== envScrollSpeed) {
    restoreEnvFn = function restoreEnvImpl() {
      setScrollSpeedEnv(envScrollSpeed);
    };
    $[12] = envScrollSpeed;
    $[13] = restoreEnvFn;
  } else restoreEnvFn = $[13];
  let restoreEnv = restoreEnvFn;
  let handleCancelFn;
  if ($[14] !== onDone || $[15] !== restoreEnv) {
    handleCancelFn = function handleCancelImpl() {
      if (finishedRef.current) {
        return;
      }
      finishedRef.current = true;
      restoreEnv();
      onDone("Scroll speed unchanged");
    };
    $[14] = onDone;
    $[15] = restoreEnv;
    $[16] = handleCancelFn;
  } else handleCancelFn = $[16];
  let handleCancel = handleCancelFn;
  let handleSave;
  if (
    $[17] !== sensitivity?.sensitivity ||
    $[18] !== onDone ||
    $[19] !== isCustom ||
    $[20] !== restoreEnv ||
    $[21] !== speed ||
    $[22] !== storageV5
  ) {
    handleSave = async function saveImpl() {
      if (finishedRef.current) {
        return;
      }
      finishedRef.current = true;
      let removingSpeed = !isCustom;
      let env = {
        [CLAUDE_CODE_SCROLL_SPEED]: removingSpeed ? undefined : String(speed),
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
        restoreEnv();
        onDone(`Couldn't save scroll speed: ${error.message}`);
        return;
      }
      logEvent("tengu_scroll_speed_set", {
        scroll_speed: removingSpeed ? autoSpeedLines : speed,
        scroll_speed_auto: autoSpeedLines,
        reset_to_auto: removingSpeed,
        xterm_js: bugInfo.xtermJs,
        wheel_flood: bugInfo.wheelFlood,
        wt_session: bugInfo.wtSession,
        use_decay_curve: bugInfo.useDecayCurve,
        saw_scroll_wheel: sawScrollWheel.current,
        saw_trackpad: sawTrackpad.current,
        editor_wheel_sensitivity: sensitivity?.sensitivity ?? undefined,
        term_program: sanitizeTerminalName(bugInfo.termProgram),
        term_program_version: sanitizeVersion(bugInfo.termProgramVersion),
      });
      let settingsFileText = `\`${tildify(getSettingsFilePathForSource("userSettings") ?? "settings.json")}\``;
      onDone(
        removingSpeed
          ? `Scroll speed reset to auto (${autoSpeedLines} ${plural(autoSpeedLines, "line")} per notch) \xB7 removed from ${settingsFileText}`
          : `Scroll speed set to ${speed} ${plural(speed, "line")} per notch \xB7 saved to ${settingsFileText}`,
      );
    };
    $[17] = sensitivity?.sensitivity;
    $[18] = onDone;
    $[19] = isCustom;
    $[20] = restoreEnv;
    $[21] = speed;
    $[22] = storageV5;
    $[23] = handleSave;
  } else handleSave = $[23];
  let saveScrollSpeed = handleSave;
  let handleKeyDown;
  if ($[24] !== adjustSpeed || $[25] !== handleCancel || $[26] !== saveScrollSpeed) {
    handleKeyDown = function keyEvent(event) {
      if (event.key === "left") {
        event.preventDefault();
        adjustSpeed(-1);
      } else if (event.key === "right") {
        event.preventDefault();
        adjustSpeed(1);
      } else if (event.key === "return") {
        event.preventDefault();
        saveScrollSpeed();
      } else if (event.key === "escape" || (event.ctrl && (event.key === "c" || event.key === "d"))) {
        event.preventDefault();
        handleCancel();
      } else if (event.key === "r") {
        event.preventDefault();
        resetToAuto();
      }
    };
    $[24] = adjustSpeed;
    $[25] = handleCancel;
    $[26] = saveScrollSpeed;
    $[27] = handleKeyDown;
  } else handleKeyDown = $[27];
  let onKeyDown = handleKeyDown;
  let isAuto = !isCustom;
  let emptyHintProps;
  if ($[28] === MEMO_CACHE_SENTINEL) {
    emptyHintProps = stableEmptyObject(false);
    $[28] = emptyHintProps;
  } else emptyHintProps = $[28];
  let hintProps = emptyHintProps;
  let headerRow;
  if ($[29] === MEMO_CACHE_SENTINEL) {
    headerRow =
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
    $[29] = headerRow;
  } else headerRow = $[29];
  let children;
  if ($[30] !== speed) {
    children = speedBar(speed);
    $[30] = speed;
    $[31] = children;
  } else children = $[31];
  let speedBarText;
  if ($[32] !== children) {
    speedBarText = jsxProd_default(Text, {
      color: "permission",
      children,
    });
    $[32] = children;
    $[33] = speedBarText;
  } else speedBarText = $[33];
  let lineWord;
  if ($[34] !== speed) {
    lineWord = plural(speed, "line");
    $[34] = speed;
    $[35] = lineWord;
  } else lineWord = $[35];
  let speedLine;
  if ($[36] !== speed || $[37] !== lineWord) {
    speedLine = jsxProd_default_2(Text, {
      children: ["  ", speed, " ", lineWord, " per wheel notch"],
    });
    $[36] = speed;
    $[37] = lineWord;
    $[38] = speedLine;
  } else speedLine = $[38];
  let autoSuffix;
  if ($[39] !== isAuto) {
    autoSuffix =
      isAuto &&
      jsxProd_default(Text, {
        dimColor: true,
        children: " (auto)",
      });
    $[39] = isAuto;
    $[40] = autoSuffix;
  } else autoSuffix = $[40];
  let autoHint;
  if ($[41] !== isAuto) {
    autoHint =
      !isAuto &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [" \xB7 auto is ", autoSpeedLines],
      });
    $[41] = isAuto;
    $[42] = autoHint;
  } else autoHint = $[42];
  let speedBox;
  if ($[43] !== speedBarText || $[44] !== speedLine || $[45] !== autoSuffix || $[46] !== autoHint) {
    speedBox = jsxProd_default_2(Box, {
      children: [speedBarText, speedLine, autoSuffix, autoHint],
    });
    $[43] = speedBarText;
    $[44] = speedLine;
    $[45] = autoSuffix;
    $[46] = autoHint;
    $[47] = speedBox;
  } else speedBox = $[47];
  let spacer;
  if ($[48] === MEMO_CACHE_SENTINEL) {
    spacer = jsxProd_default(Box, {
      height: 1,
    });
    $[48] = spacer;
  } else spacer = $[48];
  let terminalRow;
  if ($[49] === MEMO_CACHE_SENTINEL) {
    terminalRow = jsxProd_default(LabeledValue, {
      label: "Terminal",
      value: environmentSummary(bugInfo),
    });
    $[49] = terminalRow;
  } else terminalRow = $[49];
  let editorRow;
  if ($[50] !== sensitivity) {
    editorRow =
      sensitivity &&
      jsxProd_default(LabeledValue, {
        label: "Editor",
        value: describeWheelSensitivity(sensitivity),
      });
    $[50] = sensitivity;
    $[51] = editorRow;
  } else editorRow = $[51];
  let spacer2;
  let scrollHint;
  if ($[52] === MEMO_CACHE_SENTINEL) {
    spacer2 = jsxProd_default(Box, {
      height: 1,
    });
    scrollHint = jsxProd_default(Text, {
      dimColor: true,
      children: "Scroll to feel it",
    });
    $[52] = spacer2;
    $[53] = scrollHint;
  } else {
    spacer2 = $[52];
    scrollHint = $[53];
  }
  let byline;
  if ($[54] === MEMO_CACHE_SENTINEL) {
    byline = jsxProd_default(Text, {
      dimColor: true,
      italic: false,
      children: jsxProd_default_2(Byline, {
        children: [
          jsxProd_default(KeyboardShortcutHint, {
            chord: ["left", "right"],
            action: "adjust",
            ...hintProps,
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "r",
            action: "reset to auto",
            ...hintProps,
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "save",
            ...hintProps,
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "escape",
            action: "cancel",
            ...hintProps,
          }),
        ],
      }),
    });
    $[54] = byline;
  } else byline = $[54];
  let contentColumn;
  if ($[55] !== speedBox || $[56] !== editorRow) {
    contentColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [headerRow, speedBox, spacer, terminalRow, editorRow, spacer2, scrollHint, byline],
    });
    $[55] = speedBox;
    $[56] = editorRow;
    $[57] = contentColumn;
  } else contentColumn = $[57];
  let children_2 = contentColumn;
  let children_3;
  if ($[58] !== children_2) {
    children_3 = jsxProd_default(Pane, {
      color: "permission",
      children: children_2,
    });
    $[58] = children_2;
    $[59] = children_3;
  } else children_3 = $[59];
  let focusColumn;
  if ($[60] !== onKeyDown || $[61] !== children_3) {
    focusColumn = jsxProd_default(FocusColumn, {
      onKeyDown,
      children: children_3,
    });
    $[60] = onKeyDown;
    $[61] = children_3;
    $[62] = focusColumn;
  } else focusColumn = $[62];
  return focusColumn;
}
//@ chunk-myhtjy4v.js:10391-10691 placement
/**
 * 一行"标签: 值"的小组件。
 */
function LabeledValue(props) {
  let $ = useMemoCache(7);
  let { label, value } = props;
  let labelBox;
  if ($[0] !== label) {
    labelBox = jsxProd_default(Box, {
      width: 12,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: label,
      }),
    });
    $[0] = label;
    $[1] = labelBox;
  } else labelBox = $[1];
  let valueText;
  if ($[2] !== value) {
    valueText = jsxProd_default(Text, {
      children: value,
    });
    $[2] = value;
    $[3] = valueText;
  } else valueText = $[3];
  let row;
  if ($[4] !== labelBox || $[5] !== valueText) {
    row = jsxProd_default_2(Box, {
      children: [labelBox, valueText],
    });
    $[4] = labelBox;
    $[5] = valueText;
    $[6] = row;
  } else row = $[6];
  return row;
}
//@ chunk-myhtjy4v.js:10691-10812 placement
function speedBar(speed) {
  if (speed < 1) return "\u25AA" + repeatString("\xB7", SCROLL_SPEED_BAR_TICKS - 1);
  let ticks = clamp(Math.round(speed), SCROLL_SPEED_MIN, SCROLL_SPEED_BAR_TICKS);
  return "\u25A0".repeat(ticks) + repeatString("\xB7", SCROLL_SPEED_BAR_TICKS - ticks);
}
//@ chunk-myhtjy4v.js:10812-11014 placement
function environmentSummary(info) {
  let parts = [detectEditorHost(info), getPlatformDisplayName(info.platform)];
  if (info.wheelFlood) parts.push("high-rate wheel events");
  else if (info.xtermJs) parts.push("xterm.js");
  else if (info.wtSession) parts.push("Windows Terminal");
  return parts.join(" \xB7 ");
}
//@ chunk-myhtjy4v.js:11014-11655 placement
/**
 * 根据环境变量识别宿主编辑器（Cursor、VS Code、Devin、Antigravity 等）。
 */
function detectEditorHost(scrollInfo) {
  if (process.env.CURSOR_TRACE_ID !== undefined) return "Cursor";
  let VSCODE_GIT_ASKPASS_MAIN = env.VSCODE_GIT_ASKPASS_MAIN ?? "";
  if (VSCODE_GIT_ASKPASS_MAIN.includes("cursor")) return "Cursor (remote)";
  if (isWindsurfOrDevin(VSCODE_GIT_ASKPASS_MAIN)) return "Devin Desktop";
  if (VSCODE_GIT_ASKPASS_MAIN.includes("antigravity")) return "Antigravity";
  if (scrollInfo.termProgram === "vscode")
    return `VS Code${scrollInfo.termProgramVersion !== "unset" ? ` ${scrollInfo.termProgramVersion}` : ""}`;
  switch (scrollInfo.termProgram) {
    case "unset":
      return scrollInfo.wtSession || scrollInfo.platform === "win32" ? "Windows console" : "terminal";
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
      return scrollInfo.termProgram;
  }
}
//@ chunk-myhtjy4v.js:11655-12004 placement
/**
 * 描述编辑器滚轮灵敏度设置与推荐值。
 */
function describeWheelSensitivity(sensitivityInfo) {
  let editor = sensitivityInfo.editor === "VSCode" ? "VS Code" : sensitivityInfo.editor;
  if (sensitivityInfo.sensitivity === null)
    return `${editor} wheel sensitivity unset \xB7 /terminal-setup sets it to ${sensitivityInfo.recommended}`;
  if (sensitivityInfo.sensitivity >= sensitivityInfo.recommended)
    return `${editor} wheel sensitivity ${sensitivityInfo.sensitivity}`;
  return `${editor} wheel sensitivity ${sensitivityInfo.sensitivity} \xB7 /terminal-setup raises it to ${sensitivityInfo.recommended}`;
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
export { runScrollSpeedCommand };
