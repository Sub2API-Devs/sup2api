/**
 * components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx
 *
 * 托管设置（企业策略）含危险设置时的安全确认对话框：列出变化的危险项，要求用户批准或退出。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx
 * pieces: chunk-7sw8gya5.js (13)
 * attribution: placement 11, layout 1, fingerprint 1
 */
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { countCharInString, plural } from "../../utils/stringUtils.js";
import { wrapText } from "../../ink/wrap-text.js";
import { count } from "../../utils/collections.js";
import { RECENT_INPUT_GUARD_MS } from "../../hooks/useRecentInputGuard.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import {
  summarizeManagedSettingsRisk,
  extractDangerousSettings,
  hasDangerousManagedSettings,
  isTelemetryOnlyChange,
  hasDangerousSettings,
} from "./utils.js";
import { shellHelperRows } from "../../utils/settings/otelEndpointValidation.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import {
  useInputRefusalWindow,
  useRefusalTracker,
  useMountTime,
  settleKey,
} from "../CustomSelect/selectTypeahead.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { AgentNavigationFooter } from "../agents/AgentNavigationFooter.js";
import { Byline } from "../design-system/Byline.js";
import { PermissionDialog_2 } from "../permissions/PermissionDialog.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7sw8gya5.js:909-913 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7sw8gya5.js:909", () => {
  init_react_production();
});
//@ chunk-7sw8gya5.js:913-941 layout
function incrementByOne(value) {
  return value + 1;
}
//@ chunk-7sw8gya5.js:941-1077 placement = renderToolResultMessage (0.676)
/**
 * 渲染一行 "· 文本"（灰色圆点前缀），供托管设置安全对话框使用。
 */
function renderToolResultMessage(children, key) {
  return jsxProd_default_2(
    Box,
    {
      paddingLeft: 2,
      flexDirection: "row",
      children: [
        jsxProd_default(Text, {
          dimColor: true,
          children: "\xB7 ",
        }),
        jsxProd_default(Text, {
          children,
        }),
      ],
    },
    key,
  );
}
//@ chunk-7sw8gya5.js:1077-1223 placement
function renderTailRow(children, index) {
  return jsxProd_default_2(
    Box,
    {
      paddingLeft: 2,
      flexDirection: "row",
      children: [
        jsxProd_default(Text, {
          dimColor: true,
          children: "\xB7 ",
        }),
        jsxProd_default(Text, {
          children,
        }),
      ],
    },
    `tail-${index}`,
  );
}
//@ chunk-7sw8gya5.js:1223-1254 placement
var DIALOG_MIN_ROWS = 20;
var DIALOG_MAX_ROWS = 40;
var DIALOG_HEADER_ROWS = 14;
var DIALOG_FOOTER_ROWS = 4;
var DIALOG_SIDE_PADDING = 6;
//@ chunk-7sw8gya5.js:1254-1325 placement
function textHeight(text, width) {
  let max = Math.max(1, width - DIALOG_SIDE_PADDING);
  return (
    countCharInString(
      wrapText(text, max, "wrap"),
      `
`,
    ) + 1
  );
}
//@ chunk-7sw8gya5.js:1325-1405 placement
function clampBodyRows(rows, columns, headerLines) {
  let headerRows = DIALOG_HEADER_ROWS + headerLines.reduce((acc, line) => acc + textHeight(line, columns), 0);
  return Math.min(DIALOG_MAX_ROWS, rows - headerRows);
}
//@ chunk-7sw8gya5.js:1405-1876 placement
/**
 * 托管设置确认框中"还有 N 项未显示"的说明行，附带其中执行命令、沙箱、隔离设置的数量，并提醒除非预期全部设置否则选 No。
 */
function hiddenSettingsLine(hiddenCount, useEllipsis, atMost, commandCount, sandboxCount, isolationCount) {
  let atMostText = atMost ? `(at most ${DIALOG_MIN_ROWS} are listed)` : "(list trimmed to fit the screen)";
  let countsSuffix =
    (commandCount > 0 ? `, ${commandCount} executing ${plural(commandCount, "a command", "commands")}` : "") +
    (sandboxCount > 0 ? `, ${sandboxCount} ${plural(sandboxCount, "sandbox setting")}` : "") +
    (isolationCount > 0 ? `, ${isolationCount} ${plural(isolationCount, "isolation setting")}` : "");
  return useEllipsis
    ? `\u22EF and ${hiddenCount} more not shown ${atMostText}${countsSuffix} \u2014 choose No unless you expected every one of these settings`
    : `${hiddenCount} ${plural(hiddenCount, "setting")} not shown ${atMostText}${countsSuffix} \u2014 choose No unless you expected every one of these settings`;
}
//@ chunk-7sw8gya5.js:1876-2392 placement
/**
 * 让危险设置列表适应屏幕：最多 z 行，优先保留首行与尾部若干行，按渲染高度在预算内填充，返回 {head, tail, elided}。
 */
function fitSettingsList(rows, width, budget) {
  if (rows.length === 0)
    return {
      head: [],
      tail: [],
      elided: 0,
    };
  let mapped = rows.map((line) => textHeight(line, width));
  let reduced = mapped.reduce((acc, height) => acc + height, 0);
  let max = Math.max(
    textHeight(hiddenSettingsLine(rows.length, true, false, rows.length, rows.length, rows.length), width),
    textHeight(hiddenSettingsLine(rows.length, true, true, rows.length, rows.length, rows.length), width),
  );
  if (rows.length <= DIALOG_MIN_ROWS && reduced <= Math.max(budget, max))
    return {
      head: rows,
      tail: [],
      elided: 0,
    };
  let usedRows = max;
  let headCount = 0;
  let tailStart = rows.length;
  let fits = (index) => usedRows + mapped[index] <= budget;
  if (fits(0)) {
    usedRows += mapped[0];
    headCount = 1;
  }
  while (
    tailStart - 1 >= Math.max(headCount, rows.length - DIALOG_FOOTER_ROWS) &&
    tailStart - 1 > 0 &&
    fits(tailStart - 1)
  ) {
    tailStart--;
    usedRows += mapped[tailStart];
  }
  while (
    headCount < tailStart &&
    headCount + (rows.length - tailStart) < DIALOG_MIN_ROWS &&
    fits(headCount)
  ) {
    usedRows += mapped[headCount];
    headCount++;
  }
  return {
    head: rows.slice(0, headCount),
    tail: rows.slice(tailStart),
    elided: tailStart - headCount,
  };
}
//@ chunk-7sw8gya5.js:2392-2892 placement
/**
 * 汇总托管设置各类别数量的文字（命令设置、沙箱、隔离、环境变量、hooks），用逗号连接。
 */
function describeSettingCounts(settings, { commandRows, sandboxRows, isolationRows, envRows, categoryRows }) {
  let hookSlots = count(
    Object.values(settings.payloadSlots),
    (slot) => slot?.shellSettings.hooks !== undefined,
  );
  let commandCount = commandRows.length - hookSlots;
  let parts = [];
  if (commandCount > 0) parts.push(`${plural(commandCount, "command setting")} \xD7${commandCount}`);
  if (sandboxRows.length > 0)
    parts.push(`${plural(sandboxRows.length, "sandbox setting")} \xD7${sandboxRows.length}`);
  if (isolationRows.length > 0)
    parts.push(`${plural(isolationRows.length, "isolation setting")} \xD7${isolationRows.length}`);
  if (envRows.length > 0) parts.push(`${plural(envRows.length, "env var")} \xD7${envRows.length}`);
  if (categoryRows.length > 0 || hookSlots > 0) parts.push("hooks");
  return parts.join(", ");
}
//@ chunk-7sw8gya5.js:2892-3898 placement
/**
 * 托管设置确认对话框三种文案：危险设置（可执行代码/截获流量）、仅遥测目的地、VM 隔离设置。
 */
var RISKY_SETTINGS_COPY = {
  intro:
    "Your organization has configured managed settings that could allow execution of arbitrary code or interception of your prompts and responses.",
  listLabel: "Settings requiring approval:",
  advice:
    "Only accept if you trust your organization's IT administration and expect these settings to be configured.",
  risk: "these can run code or redirect traffic on this machine.",
};
var TELEMETRY_SETTINGS_COPY = {
  intro:
    "Your organization has configured Claude Code to send telemetry to the destination below. Depending on your organization's settings, this can include the content of your prompts and responses.",
  listLabel: "Telemetry destination:",
  advice: "Only accept if you recognize this as your organization's telemetry collector.",
  risk: "this redirects where telemetry from this machine is sent.",
};
var ISOLATION_SETTINGS_COPY = {
  intro:
    "Your organization has configured virtual machine (VM) isolation settings for Claude Code on this machine.",
  listLabel: RISKY_SETTINGS_COPY.listLabel,
  advice: RISKY_SETTINGS_COPY.advice,
  risk: "these can change where Claude Code runs or what it can connect to.",
};
var ACCENT_COLOR = RECENT_INPUT_GUARD_MS;
//@ chunk-7sw8gya5.js:3898-3998 placement
/**
 * 托管设置安全对话框的外壳：以 reveal 作为 key 渲染对话框，使每次重新显示都重置内部状态。
 */
function ManagedSettingsSecurityDialogHost(props) {
  let $ = useMemoCache(2);
  let dialog;
  if ($[0] !== props) {
    dialog = jsxProd_default(
      ManagedSettingsSecurityDialog,
      {
        ...props,
      },
      props.reveal,
    );
    $[0] = props;
    $[1] = dialog;
  } else dialog = $[1];
  return dialog;
}
//@ chunk-7sw8gya5.js:3998-9257 fingerprint = ManagedSettingsSecurityDialog (0.312)
/**
 * 托管设置安全对话框：比较危险设置与上次批准时是否变化，列出变化项（hooks、apiKeyHelper、env 等），批准后记录，拒绝则退出。
 */
function ManagedSettingsSecurityDialog(props) {
  let $ = useMemoCache(98);
  let { settings, baseline, reveal, onAccept, onReject, wouldTakeAnswer } = props;
  let isInterstitial = reveal !== "default";
  let { columns, rows } = useTerminalSize();
  let commandRows;
  let copy;
  let unchangedLine;
  let isolationRows;
  let removedLine;
  let riskLine;
  let rows_2;
  let sandboxRows;
  let fitted;
  if ($[0] !== baseline || $[1] !== columns || $[2] !== settings || $[3] !== rows) {
    let dangerous = summarizeManagedSettingsRisk(settings);
    let dangerousSettings = extractDangerousSettings(baseline, dangerous);
    let changedSettings = hasDangerousManagedSettings(dangerousSettings.changed)
      ? dangerousSettings.changed
      : dangerous;
    copy = isTelemetryOnlyChange(changedSettings, settings)
      ? TELEMETRY_SETTINGS_COPY
      : hasDangerousSettings(changedSettings, settings)
        ? ISOLATION_SETTINGS_COPY
        : RISKY_SETTINGS_COPY;
    let unchangedCount = changedSettings === dangerousSettings.changed ? dangerousSettings.unchangedCount : 0;
    let removedCount = dangerousSettings.removedCount;
    unchangedLine =
      unchangedCount > 0
        ? `\uFF0B ${unchangedCount} other active ${plural(unchangedCount, "setting")} unchanged since your last approval`
        : null;
    let removedNotice;
    if ($[13] !== removedCount) {
      removedNotice =
        removedCount > 0
          ? `\u2212 ${removedCount} previously approved ${plural(removedCount, "setting")} no longer ${removedCount === 1 ? "requires" : "require"} approval`
          : null;
      $[13] = removedCount;
      $[14] = removedNotice;
    } else removedNotice = $[14];
    removedLine = removedNotice;
    let settingsList = shellHelperRows(changedSettings);
    riskLine = `Approving applies: ${describeSettingCounts(changedSettings, settingsList)} \u2014 ${copy.risk}`;
    let budget = clampBodyRows(rows, columns, [
      copy.intro,
      copy.advice,
      riskLine,
      ...(unchangedLine ? [unchangedLine] : []),
      ...(removedLine ? [removedLine] : []),
    ]);
    let {
      commandRows: commandRows_2,
      sandboxRows: sandboxRows_2,
      isolationRows: isolationRows_2,
      envRows,
      categoryRows,
    } = settingsList;
    commandRows = commandRows_2;
    sandboxRows = sandboxRows_2;
    isolationRows = isolationRows_2;
    rows_2 = [...commandRows, ...sandboxRows, ...isolationRows, ...envRows, ...categoryRows];
    fitted = fitSettingsList(rows_2, columns, budget);
    $[0] = baseline;
    $[1] = columns;
    $[2] = settings;
    $[3] = rows;
    $[4] = commandRows;
    $[5] = copy;
    $[6] = unchangedLine;
    $[7] = isolationRows;
    $[8] = removedLine;
    $[9] = riskLine;
    $[10] = rows_2;
    $[11] = sandboxRows;
    $[12] = fitted;
  } else {
    commandRows = $[4];
    copy = $[5];
    unchangedLine = $[6];
    isolationRows = $[7];
    removedLine = $[8];
    riskLine = $[9];
    rows_2 = $[10];
    sandboxRows = $[11];
    fitted = $[12];
  }
  let fitted_2 = fitted;
  let headCount = fitted_2.head.length;
  let tailStart = rows_2.length - fitted_2.tail.length;
  let elidedCommandCount = Math.max(0, Math.min(commandRows.length, tailStart) - headCount);
  let throughSandbox = commandRows.length + sandboxRows.length;
  let elidedSandboxCount = Math.max(
    0,
    Math.min(throughSandbox, tailStart) - Math.max(commandRows.length, headCount),
  );
  let throughIsolation = throughSandbox + isolationRows.length;
  let elidedIsolationCount = Math.max(
    0,
    Math.min(throughIsolation, tailStart) - Math.max(throughSandbox, headCount),
  );
  let view;
  if (
    $[15] !== copy ||
    $[16] !== elidedCommandCount ||
    $[17] !== elidedIsolationCount ||
    $[18] !== elidedSandboxCount ||
    $[19] !== unchangedLine ||
    $[20] !== removedLine ||
    $[21] !== riskLine ||
    $[22] !== fitted_2
  ) {
    view = {
      ...fitted_2,
      elidedCommandCount,
      elidedSandboxCount,
      elidedIsolationCount,
      copy,
      riskLine,
      hiddenLine: unchangedLine,
      removedLine,
    };
    $[15] = copy;
    $[16] = elidedCommandCount;
    $[17] = elidedIsolationCount;
    $[18] = elidedSandboxCount;
    $[19] = unchangedLine;
    $[20] = removedLine;
    $[21] = riskLine;
    $[22] = fitted_2;
    $[23] = view;
  } else view = $[23];
  let {
    head,
    tail,
    elided,
    elidedCommandCount: elidedCommandCount_2,
    elidedSandboxCount: elidedSandboxCount_2,
    elidedIsolationCount: elidedIsolationCount_2,
    copy: copy_2,
    riskLine: riskLine_2,
    hiddenLine,
    removedLine: removedLine_2,
  } = view;
  let onAnswer;
  if ($[24] !== onAccept || $[25] !== onReject) {
    onAnswer = (answer) => (answer === "confirm" ? onAccept() : onReject());
    $[24] = onAccept;
    $[25] = onReject;
    $[26] = onAnswer;
  } else onAnswer = $[26];
  let refusableAnswer = useRefusableAnswer(onAnswer);
  let inputRefusalWindow = useInputRefusalWindow(ACCENT_COLOR);
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let exitState = useMountTime();
  let [resetCount, setResetCount] = useState(0);
  let bumpReset;
  if ($[27] === MEMO_CACHE_SENTINEL) {
    bumpReset = () => {
      setResetCount(incrementByOne);
    };
    $[27] = bumpReset;
  } else bumpReset = $[27];
  let settingsDeps;
  if ($[28] !== settings) {
    settingsDeps = [settings];
    $[28] = settings;
    $[29] = settingsDeps;
  } else settingsDeps = $[29];
  useEffect(bumpReset, settingsDeps);
  let settle = settleKey(`${epoch}:${resetCount}`, ACCENT_COLOR);
  let windowGuard;
  if (
    $[30] !== isInterstitial ||
    $[31] !== inputRefusalWindow ||
    $[32] !== noteRefused ||
    $[33] !== refusedWithin
  ) {
    windowGuard = function windowGuard() {
      if (!isInterstitial) {
        return false;
      }
      if (inputRefusalWindow() || refusedWithin(ACCENT_COLOR)) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[30] = isInterstitial;
    $[31] = inputRefusalWindow;
    $[32] = noteRefused;
    $[33] = refusedWithin;
    $[34] = windowGuard;
  } else windowGuard = $[34];
  let windowGuard_2 = windowGuard;
  let refuseInput;
  if ($[35] !== windowGuard_2 || $[36] !== wouldTakeAnswer) {
    refuseInput = function refuseInput() {
      if (windowGuard_2()) {
        return true;
      }
      return wouldTakeAnswer?.() === false;
    };
    $[35] = windowGuard_2;
    $[36] = wouldTakeAnswer;
    $[37] = refuseInput;
  } else refuseInput = $[37];
  let refuseInput_2 = refuseInput;
  let answerValue;
  if ($[38] !== refusableAnswer || $[39] !== windowGuard_2) {
    answerValue = function answerValue(value) {
      if (windowGuard_2()) {
        return;
      }
      refusableAnswer.answer(value);
    };
    $[38] = refusableAnswer;
    $[39] = windowGuard_2;
    $[40] = answerValue;
  } else answerValue = $[40];
  let answer = answerValue;
  let onCancel;
  if ($[41] !== answer) {
    onCancel = () => answer("cancel");
    $[41] = answer;
    $[42] = onCancel;
  } else onCancel = $[42];
  let keyOpts;
  if ($[43] === MEMO_CACHE_SENTINEL) {
    keyOpts = {
      context: "Confirmation",
    };
    $[43] = keyOpts;
  } else keyOpts = $[43];
  useKeybinding("confirm:no", onCancel, keyOpts);
  let introText;
  if ($[44] !== copy_2.intro) {
    introText = jsxProd_default(Text, {
      children: copy_2.intro,
    });
    $[44] = copy_2.intro;
    $[45] = introText;
  } else introText = $[45];
  let listLabel;
  if ($[46] !== copy_2.listLabel) {
    listLabel = jsxProd_default(Text, {
      dimColor: true,
      children: copy_2.listLabel,
    });
    $[46] = copy_2.listLabel;
    $[47] = listLabel;
  } else listLabel = $[47];
  let headRows;
  if ($[48] !== head) {
    headRows = head.map(renderToolResultMessage);
    $[48] = head;
    $[49] = headRows;
  } else headRows = $[49];
  let elidedRow;
  if (
    $[50] !== elided ||
    $[51] !== elidedCommandCount_2 ||
    $[52] !== elidedIsolationCount_2 ||
    $[53] !== elidedSandboxCount_2 ||
    $[54] !== head.length ||
    $[55] !== tail.length
  ) {
    elidedRow =
      elided > 0 &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: jsxProd_default(Text, {
          color: "warning",
          children: hiddenSettingsLine(
            elided,
            head.length + tail.length > 0,
            head.length + tail.length === DIALOG_MIN_ROWS,
            elidedCommandCount_2,
            elidedSandboxCount_2,
            elidedIsolationCount_2,
          ),
        }),
      });
    $[50] = elided;
    $[51] = elidedCommandCount_2;
    $[52] = elidedIsolationCount_2;
    $[53] = elidedSandboxCount_2;
    $[54] = head.length;
    $[55] = tail.length;
    $[56] = elidedRow;
  } else elidedRow = $[56];
  let tailRows;
  if ($[57] !== tail) {
    tailRows = tail.map(renderTailRow);
    $[57] = tail;
    $[58] = tailRows;
  } else tailRows = $[58];
  let unchangedBox;
  if ($[59] !== hiddenLine) {
    unchangedBox =
      hiddenLine &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: hiddenLine,
        }),
      });
    $[59] = hiddenLine;
    $[60] = unchangedBox;
  } else unchangedBox = $[60];
  let removedBox;
  if ($[61] !== removedLine_2) {
    removedBox =
      removedLine_2 &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: removedLine_2,
        }),
      });
    $[61] = removedLine_2;
    $[62] = removedBox;
  } else removedBox = $[62];
  let settingsBox;
  if (
    $[63] !== listLabel ||
    $[64] !== headRows ||
    $[65] !== elidedRow ||
    $[66] !== tailRows ||
    $[67] !== unchangedBox ||
    $[68] !== removedBox
  ) {
    settingsBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [listLabel, headRows, elidedRow, tailRows, unchangedBox, removedBox],
    });
    $[63] = listLabel;
    $[64] = headRows;
    $[65] = elidedRow;
    $[66] = tailRows;
    $[67] = unchangedBox;
    $[68] = removedBox;
    $[69] = settingsBox;
  } else settingsBox = $[69];
  let adviceText;
  if ($[70] !== copy_2.advice) {
    adviceText = jsxProd_default(Text, {
      children: copy_2.advice,
    });
    $[70] = copy_2.advice;
    $[71] = adviceText;
  } else adviceText = $[71];
  let riskText;
  if ($[72] !== riskLine_2) {
    riskText = jsxProd_default(Text, {
      color: "warning",
      children: riskLine_2,
    });
    $[72] = riskLine_2;
    $[73] = riskText;
  } else riskText = $[73];
  const selectKey = isInterstitial
    ? `${refusableAnswer.attempts}:${settle.remountKey}`
    : `${refusableAnswer.attempts}`;
  const windowMs = isInterstitial ? ACCENT_COLOR : undefined;
  const focus = isInterstitial ? "cancel" : (refusableAnswer.refused ?? "confirm");
  let onConfirm;
  let onCancel_2;
  if ($[74] !== answer) {
    onConfirm = () => answer("confirm");
    onCancel_2 = () => answer("cancel");
    $[74] = answer;
    $[75] = onConfirm;
    $[76] = onCancel_2;
  } else {
    onConfirm = $[75];
    onCancel_2 = $[76];
  }
  let confirmSelect;
  if (
    $[77] !== isInterstitial ||
    $[78] !== refuseInput_2 ||
    $[79] !== exitState ||
    $[80] !== selectKey ||
    $[81] !== windowMs ||
    $[82] !== focus ||
    $[83] !== onConfirm ||
    $[84] !== onCancel_2
  ) {
    confirmSelect = jsxProd_default(
      ConfirmSelect,
      {
        openedAt: exitState,
        windowMs,
        refuseInput: refuseInput_2,
        confirmLabel: "Yes, I trust these settings",
        cancelLabel: "No, exit Claude Code",
        cancelFirst: isInterstitial,
        focus,
        hideIndexes: isInterstitial,
        disablePrintableKeybindings: isInterstitial,
        onConfirm,
        onCancel: onCancel_2,
      },
      selectKey,
    );
    $[77] = isInterstitial;
    $[78] = refuseInput_2;
    $[79] = exitState;
    $[80] = selectKey;
    $[81] = windowMs;
    $[82] = focus;
    $[83] = onConfirm;
    $[84] = onCancel_2;
    $[85] = confirmSelect;
  } else confirmSelect = $[85];
  const action = isInterstitial ? "select" : "confirm";
  let confirmHint;
  if ($[86] !== action) {
    confirmHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "enter",
      action,
    });
    $[86] = action;
    $[87] = confirmHint;
  } else confirmHint = $[87];
  let exitHint;
  if ($[88] === MEMO_CACHE_SENTINEL) {
    exitHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "exit",
    });
    $[88] = exitHint;
  } else exitHint = $[88];
  let footer;
  if ($[89] !== confirmHint) {
    footer = jsxProd_default(AgentNavigationFooter, {
      children: jsxProd_default_2(Byline, {
        children: [confirmHint, exitHint],
      }),
    });
    $[89] = confirmHint;
    $[90] = footer;
  } else footer = $[90];
  let dialog;
  if (
    $[91] !== introText ||
    $[92] !== settingsBox ||
    $[93] !== adviceText ||
    $[94] !== riskText ||
    $[95] !== confirmSelect ||
    $[96] !== footer
  ) {
    dialog = jsxProd_default(PermissionDialog_2, {
      color: "warning",
      titleColor: "warning",
      title: "Managed settings require approval",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        paddingTop: 1,
        children: [introText, settingsBox, adviceText, riskText, confirmSelect, footer],
      }),
    });
    $[91] = introText;
    $[92] = settingsBox;
    $[93] = adviceText;
    $[94] = riskText;
    $[95] = confirmSelect;
    $[96] = footer;
    $[97] = dialog;
  } else dialog = $[97];
  return dialog;
}
export { ManagedSettingsSecurityDialogHost };
