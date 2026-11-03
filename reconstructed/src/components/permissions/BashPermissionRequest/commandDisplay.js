/**
 * components/permissions/BashPermissionRequest/commandDisplay.tsx
 *
 * 2.1.316 新增。Bash 权限请求中的命令展示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (15)
 * attribution: placement 15
 */
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { REVIEW_DIALOG_WIDTH, REVIEW_HEADER_ROWS } from "../AutoModeSetupReview.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { init_react_production, y } from "../../../../vendor/react/cjs/react.production.js";
import { wrapText } from "../../../ink/wrap-text.js";
import { hasVisibleText } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { formatOverflowHint, truncateToWidth, truncateToWidthNoEllipsis } from "../../../utils/format.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { ELLIPSIS } from "../../../ink/styles.js";
import { currentToolPermissionContext } from "../../../utils/permissions/currentPermissionContext.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { FittedOfferBody } from "../../AutocompactOfferDialog.js";
import { useDialogKeybindings } from "../../../keybindings/dialogKeyHints.js";
import { UP_ARROW, DOWN_ARROW } from "../../../utils/permissions/autoModeRulesPrompt.js";
import { useShortcutDisplay } from "../../../keybindings/useKeybindingDisplay.js";
import { formatShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { DiffFrame } from "../../FileEditToolDiff.js";
import { Blockquote } from "../../Blockquote.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";

//@ chunk-18hwfzwa.js:1320936-1321702 placement
function sandboxHostsSummary(props) {
  let $ = w(10);
  let { hosts } = props;
  if (hosts === undefined || hosts.length === 0) {
    return null;
  }
  let D = hosts[0];
  let ee;
  if ($[0] !== D) {
    ee = D.length > REVIEW_DIALOG_WIDTH ? `\u2026${D.slice(D.length - (REVIEW_DIALOG_WIDTH - 1))}` : D;
    $[0] = D;
    $[1] = ee;
  } else ee = $[1];
  let ke;
  if ($[2] !== hosts || $[3] !== ee) {
    ke = [ee];
    let min = Math.min(ke[0].length + 2, REVIEW_DIALOG_WIDTH / 2);
    for (const host of hosts.slice(1)) {
      if (ke.length >= REVIEW_HEADER_ROWS) {
        break;
      }
      if (min + host.length > REVIEW_DIALOG_WIDTH) {
        continue;
      }
      ke.push(host);
      min = min + (host.length + 2);
    }
    $[2] = hosts;
    $[3] = ee;
    $[4] = ke;
  } else ke = $[4];
  let He = hosts.length - ke.length;
  const children = ke.join(", ");
  let ze;
  if ($[5] !== children) {
    ze = jsxProd_default(Text, {
      bold: true,
      children,
    });
    $[5] = children;
    $[6] = ze;
  } else ze = $[6];
  const Xe = He > 0 ? ` (+${He} more, ${hosts.length} in all)` : "";
  let rt;
  if ($[7] !== ze || $[8] !== Xe) {
    rt = jsxProd_default_2(Text, {
      children: ["Also lets this command reach, beyond the sandbox allowlist:", " ", ze, Xe],
    });
    $[7] = ze;
    $[8] = Xe;
    $[9] = rt;
  } else rt = $[9];
  return rt;
}
//@ chunk-18hwfzwa.js:1321702-1321706 placement
init_react_production();
//@ chunk-18hwfzwa.js:1321706-1321734 placement
var GUTTER_WIDTH = 2;
var GUTTER_WIDTH_FULL = 8;
var MAX_COMMAND_LINES = 2;
var MIN_COMMAND_LINES = 10;
//@ chunk-18hwfzwa.js:1321734-1322107 placement
/**
 * 按宽度折行并去掉空行后，把命令限制在固定行数内，最后一行拼上 "+N lines" 提示。
 */
function truncateCommandForDisplay(description, x) {
  let max = Math.max(MIN_COMMAND_LINES, x);
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
    .filter((We) => hasVisibleText(We));
  if (filtered.length <= MAX_COMMAND_LINES)
    return filtered.join(`
`);
  let ee = filtered.length - MAX_COMMAND_LINES;
  let ke = formatOverflowHint(ee, "line");
  let Re = bunStringWidth(ke) <= max ? ke : `${ELLIPSIS} +${ee}`;
  let Be = max - bunStringWidth(Re) - 1;
  let He = filtered[MAX_COMMAND_LINES - 1] ?? "";
  return [
    ...filtered.slice(0, MAX_COMMAND_LINES - 1),
    Be < 1
      ? truncateToWidth(Re, max)
      : `${bunStringWidth(He) <= Be ? He : truncateToWidthNoEllipsis(He, Be)} ${Re}`,
  ].join(`
`);
}
//@ chunk-18hwfzwa.js:1322107-1322149 placement = parseXmlBlock (0.795)
function isNotYesNo(text) {
  return text !== "yes" && text !== "no";
}
//@ chunk-18hwfzwa.js:1322149-1322474 placement
/**
 * 已选定答案后把除 yes/no 外的选项置为 disabled；输入型选项把已填内容拼进标签。
 */
function freezeOptionsAfterAnswer(h, fieldLeftOpen) {
  return fieldLeftOpen === undefined
    ? h
    : h.map((D) => {
        if (!isNotYesNo(D.value)) return D;
        if (D.type !== "input" || D.value === fieldLeftOpen)
          return {
            ...D,
            disabled: true,
          };
        let labelValueSeparator = D.labelValueSeparator ?? ", ";
        let initialValue = D.initialValue ?? "";
        return {
          value: D.value,
          disabled: true,
          label:
            initialValue === ""
              ? D.label
              : typeof D.label === "string"
                ? `${D.label}${labelValueSeparator}${initialValue}`
                : jsxProd_default_2(Fragment, {
                    children: [D.label, labelValueSeparator, initialValue],
                  }),
        };
      });
}
//@ chunk-18hwfzwa.js:1322474-1323827 placement
function CommandDisplay(props) {
  let $ = w(24);
  let { commandDisplay, description, refinedPrefix } = props;
  let [ee] = y(currentToolPermissionContext);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let columns = useTerminalSize().columns;
  let He;
  if ($[0] !== commandDisplay || $[1] !== description || $[2] !== refinedPrefix) {
    He = {
      commandDisplay,
      description,
      refinedPrefix,
    };
    $[0] = commandDisplay;
    $[1] = description;
    $[2] = refinedPrefix;
    $[3] = He;
  } else He = $[3];
  let contentKey = He;
  let ze = !isScreenReaderEnabled && ee;
  const isActive = ee && commandDisplay.kind === "full";
  let rt;
  if ($[4] !== contentKey || $[5] !== ze || $[6] !== isActive) {
    rt = {
      isActive,
      isCut: ze,
      contentKey,
    };
    $[4] = contentKey;
    $[5] = ze;
    $[6] = isActive;
    $[7] = rt;
  } else rt = $[7];
  let kt = FittedOfferBody(commandDisplay.kind === "full" ? commandDisplay.text : "", rt);
  let [At, It] = y();
  let Ot;
  if ($[8] !== At) {
    Ot = At !== undefined && isNotYesNo(At) ? At : null;
    $[8] = At;
    $[9] = Ot;
  } else Ot = $[9];
  let Et = Ot;
  let [Dt, Lt] = y();
  if (kt.isHeldForGood && Dt === undefined) Lt(Et);
  let run = kt.showNextRows;
  let Xt;
  if ($[10] !== run) {
    Xt = [
      {
        action: "app:toggleTranscript",
        run,
      },
    ];
    $[10] = run;
    $[11] = Xt;
  } else Xt = $[11];
  let moreBindings = Xt;
  let so;
  if ($[12] !== kt.columns || $[13] !== description || $[14] !== ze) {
    so = ze ? truncateCommandForDisplay(description, kt.columns - 2) : description;
    $[12] = kt.columns;
    $[13] = description;
    $[14] = ze;
    $[15] = so;
  } else so = $[15];
  let description_2 = so;
  let reasonColumns = Math.max(
    1,
    commandDisplay.kind !== "full"
      ? columns - GUTTER_WIDTH_FULL
      : kt.columns - (commandDisplay.needsGutter ? 0 : GUTTER_WIDTH),
  );
  const fieldLeftOpen = !kt.isStandingHeld ? undefined : Dt !== undefined ? Dt : Et;
  let bo;
  if (
    $[16] !== kt ||
    $[17] !== ze ||
    $[18] !== ee ||
    $[19] !== moreBindings ||
    $[20] !== reasonColumns ||
    $[21] !== description_2 ||
    $[22] !== fieldLeftOpen
  ) {
    bo = {
      isFitted: ee,
      isCut: ze,
      reasonColumns,
      moreBindings,
      body: kt,
      description: description_2,
      noteFocus: It,
      fieldLeftOpen,
    };
    $[16] = kt;
    $[17] = ze;
    $[18] = ee;
    $[19] = moreBindings;
    $[20] = reasonColumns;
    $[21] = description_2;
    $[22] = fieldLeftOpen;
    $[23] = bo;
  } else bo = $[23];
  return bo;
}
//@ chunk-18hwfzwa.js:1323827-1324156 placement
/**
 * 内容被裁剪时包一层快捷键（展开更多），未裁剪原样返回子节点。
 */
function FittedBodyKeybindings(props) {
  let $ = w(4);
  let { fitted, children } = props;
  if (!fitted.isFitted) {
    return children;
  }
  const active = fitted.body.hiddenRows > 0 || fitted.body.hiddenAbove > 0;
  let ke;
  if ($[0] !== children || $[1] !== fitted.moreBindings || $[2] !== active) {
    ke = jsxProd_default(useDialogKeybindings, {
      bindings: fitted.moreBindings,
      active,
      flexDirection: "column",
      children,
    });
    $[0] = children;
    $[1] = fitted.moreBindings;
    $[2] = active;
    $[3] = ke;
  } else ke = $[3];
  return ke;
}
//@ chunk-18hwfzwa.js:1324156-1324166 placement
var MIN_HINT_GAP = 6;
//@ chunk-18hwfzwa.js:1324166-1324506 placement
/**
 * 生成 "+N lines / N above" 隐藏行提示，按可用列宽依次尝试长短版本，剩余宽度够时再拼上操作提示。
 */
function formatHiddenRowsHint({ hiddenRows, hiddenAbove, hint, columns }) {
  let ee = formatOverflowHint(hiddenRows, "line");
  let ke =
    hiddenAbove === 0
      ? [ee]
      : hiddenRows === 0
        ? [
            `${formatOverflowHint(hiddenAbove, "line")} above`,
            `${ELLIPSIS} +${hiddenAbove} above`,
            `${UP_ARROW}${hiddenAbove}`,
          ]
        : [
            `${ee}, +${hiddenAbove} above`,
            `${ELLIPSIS} +${hiddenRows}, +${hiddenAbove} above`,
            `${UP_ARROW}${hiddenAbove} ${DOWN_ARROW}${hiddenRows}`,
          ];
  let Re = ke.find((He) => bunStringWidth(He) <= columns) ?? truncateToWidth(ke.at(-1) ?? ee, columns);
  let Be = columns - bunStringWidth(Re) - 1;
  return Be < MIN_HINT_GAP || hint === "" ? Re : `${Re} ${truncateToWidth(hint, Be)}`;
}
//@ chunk-18hwfzwa.js:1324506-1325050 placement
function SeeMoreHint(props) {
  let $ = w(7);
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
  let Be;
  if ($[5] !== children) {
    Be = jsxProd_default(Text, {
      dimColor: true,
      wrap: "truncate-end",
      children,
    });
    $[5] = children;
    $[6] = Be;
  } else Be = $[6];
  return Be;
}
//@ chunk-18hwfzwa.js:1325050-1325527 placement
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
//@ chunk-18hwfzwa.js:1325527-1325531 placement
init_react_production();
//@ chunk-18hwfzwa.js:1325531-1325586 placement
var AUTO_MODE_TIP_TEXT = "\xB7 auto mode handles these prompts for you";
//@ chunk-18hwfzwa.js:1325586-1325769 placement
/**
 * 渲染"自动模式可替你处理这些提示"的粗体提示。
 */
function AutoModeTip() {
  let $ = w(1);
  let x;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    x = jsxProd_default(Text, {
      bold: true,
      children: 'Tip: auto mode handles these prompts for you \u2014 choose "switch to auto mode" below',
    });
    $[0] = x;
  } else x = $[0];
  return x;
}
export {
  CommandDisplay,
  AUTO_MODE_TIP_TEXT,
  freezeOptionsAfterAnswer,
  isNotYesNo,
  AutoModeTip,
  FittedBodyKeybindings,
  CommandPreviewFrame,
  sandboxHostsSummary,
  SeeMoreHint,
  formatHiddenRowsHint,
};
