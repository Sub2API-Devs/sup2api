/**
 * components/permissions/BashPermissionRequest/commandDisplay.tsx
 *
 * 2.1.316 新增。Bash 权限请求中的命令展示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8prszgkd.js (10), chunk-czq1j3j2.js (5)
 * attribution: placement 15
 */
import { wrapText } from "../../../ink/wrap-text.js";
import { hasVisibleText } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { formatOverflowHint, truncateToWidth, truncateToWidthNoEllipsis } from "../../../utils/format.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { ELLIPSIS } from "../../../ink/styles.js";
import {
  jsxProd_default_2,
  Fragment,
  jsxProd_default,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { useState, init_react_production } from "../../../../vendor/react/cjs/react.production.js";
import { currentToolPermissionContext } from "../../../utils/permissions/currentPermissionContext.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { FittedOfferBody } from "../../AutocompactOfferDialog.js";
import { useDialogKeybindings } from "../../../keybindings/dialogKeyHints.js";
import { UP_ARROW, DOWN_ARROW } from "../../../constants/figures.js";
import { useShortcutDisplay } from "../../../keybindings/useKeybindingDisplay.js";
import { formatShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { DiffFrame } from "../../FileEditToolDiff.js";
import { Blockquote } from "../../Blockquote.js";
import { REVIEW_DIALOG_WIDTH, REVIEW_HEADER_ROWS } from "../AutoModeSetupReview.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-8prszgkd.js:30296-30321 placement
var GUTTER_WIDTH = 2;
var GUTTER_WIDTH_FULL = 8;
var MAX_COMMAND_LINES = 2;
var MIN_COMMAND_LINES = 10;
//@ chunk-8prszgkd.js:30321-30668 placement
/**
 * 按宽度折行并去掉空行后，把命令限制在固定行数内，最后一行拼上 "+N lines" 提示。
 */
function truncateCommandForDisplay(description, columns) {
  let max = Math.max(MIN_COMMAND_LINES, columns);
  let filtered = wrapText(
    description
      .split(
        `
`,
      )
      .filter((line) => hasVisibleText(line)).join(`
`),
    max,
    "wrap",
  )
    .split(
      `
`,
    )
    .map((line) => line.trimEnd())
    .filter((line) => hasVisibleText(line));
  if (filtered.length <= MAX_COMMAND_LINES)
    return filtered.join(`
`);
  let overflowCount = filtered.length - MAX_COMMAND_LINES;
  let overflowHint = formatOverflowHint(overflowCount, "line");
  let fittedHint = bunStringWidth(overflowHint) <= max ? overflowHint : `${ELLIPSIS} +${overflowCount}`;
  let lastLineBudget = max - bunStringWidth(fittedHint) - 1;
  let lastLine = filtered[MAX_COMMAND_LINES - 1] ?? "";
  return [
    ...filtered.slice(0, MAX_COMMAND_LINES - 1),
    lastLineBudget < 1
      ? truncateToWidth(fittedHint, max)
      : `${bunStringWidth(lastLine) <= lastLineBudget ? lastLine : truncateToWidthNoEllipsis(lastLine, lastLineBudget)} ${fittedHint}`,
  ].join(`
`);
}
//@ chunk-8prszgkd.js:30668-30711 placement (2.1.88 match: parseXmlBlock, 0.796)
function isNotYesNo(text) {
  return text !== "yes" && text !== "no";
}
//@ chunk-8prszgkd.js:30711-31035 placement
/**
 * 已选定答案后把除 yes/no 外的选项置为 disabled；输入型选项把已填内容拼进标签。
 */
function freezeOptionsAfterAnswer(options, fieldLeftOpen) {
  return fieldLeftOpen === undefined
    ? options
    : options.map((option) => {
        if (!isNotYesNo(option.value)) return option;
        if (option.type !== "input" || option.value === fieldLeftOpen)
          return {
            ...option,
            disabled: true,
          };
        let labelValueSeparator = option.labelValueSeparator ?? ", ";
        let initialValue = option.initialValue ?? "";
        return {
          value: option.value,
          disabled: true,
          label:
            initialValue === ""
              ? option.label
              : typeof option.label === "string"
                ? `${option.label}${labelValueSeparator}${initialValue}`
                : jsxProd_default_2(Fragment, {
                    children: [option.label, labelValueSeparator, initialValue],
                  }),
        };
      });
}
//@ chunk-8prszgkd.js:31035-32236 placement
function CommandDisplay(props) {
  let $ = useMemoCache(24);
  let { commandDisplay, description, refinedPrefix } = props;
  let [permissionContext] = useState(currentToolPermissionContext);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let columns = useTerminalSize().columns;
  let contentKey;
  if ($[0] !== commandDisplay || $[1] !== description || $[2] !== refinedPrefix) {
    contentKey = {
      commandDisplay,
      description,
      refinedPrefix,
    };
    $[0] = commandDisplay;
    $[1] = description;
    $[2] = refinedPrefix;
    $[3] = contentKey;
  } else contentKey = $[3];
  let contentKey_2 = contentKey;
  let isCut = !isScreenReaderEnabled && permissionContext;
  const isActive = permissionContext && commandDisplay.kind === "full";
  let bodyOptions;
  if ($[4] !== contentKey_2 || $[5] !== isCut || $[6] !== isActive) {
    bodyOptions = {
      isActive,
      isCut,
      contentKey: contentKey_2,
    };
    $[4] = contentKey_2;
    $[5] = isCut;
    $[6] = isActive;
    $[7] = bodyOptions;
  } else bodyOptions = $[7];
  let body = FittedOfferBody(commandDisplay.kind === "full" ? commandDisplay.text : "", bodyOptions);
  let [noteValue, setNoteValue] = useState();
  let currentNote;
  if ($[8] !== noteValue) {
    currentNote = noteValue !== undefined && isNotYesNo(noteValue) ? noteValue : null;
    $[8] = noteValue;
    $[9] = currentNote;
  } else currentNote = $[9];
  let note = currentNote;
  let [leftOpenField, setLeftOpenField] = useState();
  if (body.isHeldForGood && leftOpenField === undefined) setLeftOpenField(note);
  let run = body.showNextRows;
  let moreBindings;
  if ($[10] !== run) {
    moreBindings = [
      {
        action: "app:toggleTranscript",
        run,
      },
    ];
    $[10] = run;
    $[11] = moreBindings;
  } else moreBindings = $[11];
  let moreBindings_2 = moreBindings;
  let displayDescription;
  if ($[12] !== body.columns || $[13] !== description || $[14] !== isCut) {
    displayDescription = isCut ? truncateCommandForDisplay(description, body.columns - 2) : description;
    $[12] = body.columns;
    $[13] = description;
    $[14] = isCut;
    $[15] = displayDescription;
  } else displayDescription = $[15];
  let description_2 = displayDescription;
  let reasonColumns = Math.max(
    1,
    commandDisplay.kind !== "full"
      ? columns - GUTTER_WIDTH_FULL
      : body.columns - (commandDisplay.needsGutter ? 0 : GUTTER_WIDTH),
  );
  const fieldLeftOpen = !body.isStandingHeld ? undefined : leftOpenField !== undefined ? leftOpenField : note;
  let fitted;
  if (
    $[16] !== body ||
    $[17] !== isCut ||
    $[18] !== permissionContext ||
    $[19] !== moreBindings_2 ||
    $[20] !== reasonColumns ||
    $[21] !== description_2 ||
    $[22] !== fieldLeftOpen
  ) {
    fitted = {
      isFitted: permissionContext,
      isCut,
      reasonColumns,
      moreBindings: moreBindings_2,
      body,
      description: description_2,
      noteFocus: setNoteValue,
      fieldLeftOpen,
    };
    $[16] = body;
    $[17] = isCut;
    $[18] = permissionContext;
    $[19] = moreBindings_2;
    $[20] = reasonColumns;
    $[21] = description_2;
    $[22] = fieldLeftOpen;
    $[23] = fitted;
  } else fitted = $[23];
  return fitted;
}
//@ chunk-8prszgkd.js:32236-32552 placement
/**
 * 内容被裁剪时包一层快捷键（展开更多），未裁剪原样返回子节点。
 */
function FittedBodyKeybindings(props) {
  let $ = useMemoCache(4);
  let { fitted, children } = props;
  if (!fitted.isFitted) {
    return children;
  }
  const active = fitted.body.hiddenRows > 0 || fitted.body.hiddenAbove > 0;
  let bodyElement;
  if ($[0] !== children || $[1] !== fitted.moreBindings || $[2] !== active) {
    bodyElement = jsxProd_default(useDialogKeybindings, {
      bindings: fitted.moreBindings,
      active,
      flexDirection: "column",
      children,
    });
    $[0] = children;
    $[1] = fitted.moreBindings;
    $[2] = active;
    $[3] = bodyElement;
  } else bodyElement = $[3];
  return bodyElement;
}
//@ chunk-8prszgkd.js:32552-32561 placement
var MIN_HINT_GAP = 6;
//@ chunk-8prszgkd.js:32561-32884 placement
/**
 * 生成 "+N lines / N above" 隐藏行提示，按可用列宽依次尝试长短版本，剩余宽度够时再拼上操作提示。
 */
function formatHiddenRowsHint({ hiddenRows, hiddenAbove, hint, columns }) {
  let rowsHint = formatOverflowHint(hiddenRows, "line");
  let candidates =
    hiddenAbove === 0
      ? [rowsHint]
      : hiddenRows === 0
        ? [
            `${formatOverflowHint(hiddenAbove, "line")} above`,
            `${ELLIPSIS} +${hiddenAbove} above`,
            `${UP_ARROW}${hiddenAbove}`,
          ]
        : [
            `${rowsHint}, +${hiddenAbove} above`,
            `${ELLIPSIS} +${hiddenRows}, +${hiddenAbove} above`,
            `${UP_ARROW}${hiddenAbove} ${DOWN_ARROW}${hiddenRows}`,
          ];
  let baseHint =
    candidates.find((candidate) => bunStringWidth(candidate) <= columns) ??
    truncateToWidth(candidates.at(-1) ?? rowsHint, columns);
  let hintBudget = columns - bunStringWidth(baseHint) - 1;
  return hintBudget < MIN_HINT_GAP || hint === ""
    ? baseHint
    : `${baseHint} ${truncateToWidth(hint, hintBudget)}`;
}
//@ chunk-8prszgkd.js:32884-33397 placement
function SeeMoreHint(props) {
  let $ = useMemoCache(7);
  let { body } = props;
  let chord = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  let { hiddenRows, hiddenAbove } = body;
  if (hiddenRows === 0 && hiddenAbove === 0) {
    return null;
  }
  let children;
  if ($[0] !== body.columns || $[1] !== hiddenAbove || $[2] !== hiddenRows || $[3] !== chord) {
    children = formatHiddenRowsHint({
      hiddenRows,
      hiddenAbove,
      hint: formatShortcutHint({
        chord,
        action: hiddenRows > 0 ? "see more" : "see the first lines",
        parens: true,
        format: {
          keyCase: "lower",
        },
      }),
      columns: body.columns,
    });
    $[0] = body.columns;
    $[1] = hiddenAbove;
    $[2] = hiddenRows;
    $[3] = chord;
    $[4] = children;
  } else children = $[4];
  let hintElement;
  if ($[5] !== children) {
    hintElement = jsxProd_default(Text, {
      dimColor: true,
      wrap: "truncate-end",
      children,
    });
    $[5] = children;
    $[6] = hintElement;
  } else hintElement = $[6];
  return hintElement;
}
//@ chunk-8prszgkd.js:33397-33876 placement
/**
 * 权限对话框中的命令预览框：未裁剪时直接引用显示（withheld 显示标记），裁剪时绑定测量 ref 并附 "see more" 提示。
 */
function CommandPreviewFrame({ commandDisplay, fitted, inset = 1 }) {
  if (!fitted.isFitted || commandDisplay.kind !== "full")
    return jsxProd_default(DiffFrame, {
      paddingX: inset,
      children: jsxProd_default(Blockquote, {
        multiline: commandDisplay.kind === "full" && commandDisplay.needsGutter,
        children: jsxProd_default(Text, {
          children: commandDisplay.kind === "withheld" ? commandDisplay.marker : commandDisplay.text,
        }),
      }),
    });
  return jsxProd_default(DiffFrame, {
    paddingX: inset,
    children: jsxProd_default_2(Box, {
      ref: fitted.body.box,
      flexDirection: "column",
      children: [
        jsxProd_default(Blockquote, {
          multiline: commandDisplay.needsGutter,
          children: jsxProd_default(Box, {
            ref: fitted.body.textBox,
            flexDirection: "column",
            flexGrow: 1,
            children: jsxProd_default(Text, {
              children: fitted.body.text,
            }),
          }),
        }),
        jsxProd_default(SeeMoreHint, {
          body: fitted.body,
        }),
      ],
    }),
  });
}
//@ chunk-czq1j3j2.js:1339036-1339040 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1339036", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1340963-1340967 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1340963", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1347058-1347824 placement
function sandboxHostsSummary(props) {
  let $ = useMemoCache(10);
  let { hosts } = props;
  if (hosts === undefined || hosts.length === 0) {
    return null;
  }
  let primaryHost = hosts[0];
  let primaryHostLabel;
  if ($[0] !== primaryHost) {
    primaryHostLabel =
      primaryHost.length > REVIEW_DIALOG_WIDTH
        ? `\u2026${primaryHost.slice(primaryHost.length - (REVIEW_DIALOG_WIDTH - 1))}`
        : primaryHost;
    $[0] = primaryHost;
    $[1] = primaryHostLabel;
  } else primaryHostLabel = $[1];
  let visibleHosts;
  if ($[2] !== hosts || $[3] !== primaryHostLabel) {
    visibleHosts = [primaryHostLabel];
    let min = Math.min(visibleHosts[0].length + 2, REVIEW_DIALOG_WIDTH / 2);
    for (const host of hosts.slice(1)) {
      if (visibleHosts.length >= REVIEW_HEADER_ROWS) {
        break;
      }
      if (min + host.length > REVIEW_DIALOG_WIDTH) {
        continue;
      }
      visibleHosts.push(host);
      min = min + (host.length + 2);
    }
    $[2] = hosts;
    $[3] = primaryHostLabel;
    $[4] = visibleHosts;
  } else visibleHosts = $[4];
  let hiddenHostCount = hosts.length - visibleHosts.length;
  const children = visibleHosts.join(", ");
  let hostsText;
  if ($[5] !== children) {
    hostsText = jsxProd_default(Text, {
      bold: true,
      children,
    });
    $[5] = children;
    $[6] = hostsText;
  } else hostsText = $[6];
  const moreSuffix = hiddenHostCount > 0 ? ` (+${hiddenHostCount} more, ${hosts.length} in all)` : "";
  let summaryText;
  if ($[7] !== hostsText || $[8] !== moreSuffix) {
    summaryText = jsxProd_default_2(Text, {
      children: ["Also lets this command reach, beyond the sandbox allowlist:", " ", hostsText, moreSuffix],
    });
    $[7] = hostsText;
    $[8] = moreSuffix;
    $[9] = summaryText;
  } else summaryText = $[9];
  return summaryText;
}
//@ chunk-czq1j3j2.js:1347828-1347883 placement
var AUTO_MODE_TIP_TEXT = "\xB7 auto mode handles these prompts for you";
//@ chunk-czq1j3j2.js:1347883-1348066 placement
/**
 * 渲染"自动模式可替你处理这些提示"的粗体提示。
 */
function AutoModeTip() {
  let $ = useMemoCache(1);
  let tipElement;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    tipElement = jsxProd_default(Text, {
      bold: true,
      children: 'Tip: auto mode handles these prompts for you \u2014 choose "switch to auto mode" below',
    });
    $[0] = tipElement;
  } else tipElement = $[0];
  return tipElement;
}
export {
  CommandDisplay,
  CommandPreviewFrame,
  FittedBodyKeybindings,
  AUTO_MODE_TIP_TEXT,
  freezeOptionsAfterAnswer,
  isNotYesNo,
  AutoModeTip,
  sandboxHostsSummary,
  SeeMoreHint,
  formatHiddenRowsHint,
};
