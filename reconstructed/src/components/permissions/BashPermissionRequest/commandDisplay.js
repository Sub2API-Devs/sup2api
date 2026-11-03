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
import { ox, Oft } from "../AutoModeSetupReview.js";
import {
  e,
  r,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { j, y } from "../../../../vendor/react/cjs/react.production.js";
import { wrapText } from "../../../ink/wrap-text.js";
import { hasVisibleText } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { formatOverflowHint, truncateToWidth, truncateToWidthNoEllipsis } from "../../../utils/format.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { ELLIPSIS } from "../../../ink/styles.js";
import { tE } from "../../../utils/permissions/currentPermissionContext.js";
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
function sandboxHostsSummary(h) {
  let $ = w(10),
    { hosts: hosts } = h;
  if (hosts === void 0 || hosts.length === 0) {
    return null;
  }
  let D = hosts[0],
    ee;
  if ($[0] !== D)
    ((ee = D.length > ox ? `\u2026${D.slice(D.length - (ox - 1))}` : D), ($[0] = D), ($[1] = ee));
  else ee = $[1];
  let ke;
  if ($[2] !== hosts || $[3] !== ee) {
    ke = [ee];
    let min = Math.min(ke[0].length + 2, ox / 2);
    for (const Be of hosts.slice(1)) {
      if (ke.length >= Oft) {
        break;
      }
      if (min + Be.length > ox) {
        continue;
      }
      (ke.push(Be), (min = min + (Be.length + 2)));
    }
    (($[2] = hosts), ($[3] = ee), ($[4] = ke));
  } else ke = $[4];
  let He = hosts.length - ke.length;
  const joined = ke.join(", ");
  let ze;
  if ($[5] !== joined) ((ze = e(Text, { bold: !0, children: joined })), ($[5] = joined), ($[6] = ze));
  else ze = $[6];
  const Xe = He > 0 ? ` (+${He} more, ${hosts.length} in all)` : "";
  let rt;
  if ($[7] !== ze || $[8] !== Xe)
    ((rt = r(Text, {
      children: ["Also lets this command reach, beyond the sandbox allowlist:", " ", ze, Xe],
    })),
      ($[7] = ze),
      ($[8] = Xe),
      ($[9] = rt));
  else rt = $[9];
  return rt;
}
//@ chunk-18hwfzwa.js:1321702-1321706 placement
j();
//@ chunk-18hwfzwa.js:1321706-1321734 placement
var Fft = 2,
  Bft = 8,
  q7 = 2,
  lOo = 10;
/**
 * 按宽度折行并去掉空行后，把命令限制在固定行数内，最后一行拼上 "+N lines" 提示。
 */
//@ chunk-18hwfzwa.js:1321734-1322107 placement
function truncateCommandForDisplay(h, x) {
  let max = Math.max(lOo, x),
    filtered = wrapText(
      h
        .split(
          `
`,
        )
        .filter((We) => hasVisibleText(We)).join(`
`),
      max,
      "wrap",
    )
      .split(
        `
`,
      )
      .map((We) => We.trimEnd())
      .filter((We) => hasVisibleText(We));
  if (filtered.length <= q7)
    return filtered.join(`
`);
  let ee = filtered.length - q7,
    ke = formatOverflowHint(ee, "line"),
    Re = bunStringWidth(ke) <= max ? ke : `${ELLIPSIS} +${ee}`,
    Be = max - bunStringWidth(Re) - 1,
    He = filtered[q7 - 1] ?? "";
  return [
    ...filtered.slice(0, q7 - 1),
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
/**
 * 已选定答案后把除 yes/no 外的选项置为 disabled；输入型选项把已填内容拼进标签。
 */
//@ chunk-18hwfzwa.js:1322149-1322474 placement
function freezeOptionsAfterAnswer(h, x) {
  return x === void 0
    ? h
    : h.map((D) => {
        if (!isNotYesNo(D.value)) return D;
        if (D.type !== "input" || D.value === x) return { ...D, disabled: !0 };
        let L = D.labelValueSeparator ?? ", ",
          ee = D.initialValue ?? "";
        return {
          value: D.value,
          disabled: !0,
          label:
            ee === ""
              ? D.label
              : typeof D.label === "string"
                ? `${D.label}${L}${ee}`
                : r(Fragment, { children: [D.label, L, ee] }),
        };
      });
}
//@ chunk-18hwfzwa.js:1322474-1323827 placement
function CommandDisplay(h) {
  let $ = w(24),
    { commandDisplay: commandDisplay, description: description, refinedPrefix: refinedPrefix } = h,
    [ee] = y(tE),
    ke = useIsScreenReaderEnabled(),
    columns = useTerminalSize().columns,
    He;
  if ($[0] !== commandDisplay || $[1] !== description || $[2] !== refinedPrefix)
    ((He = { commandDisplay: commandDisplay, description: description, refinedPrefix: refinedPrefix }),
      ($[0] = commandDisplay),
      ($[1] = description),
      ($[2] = refinedPrefix),
      ($[3] = He));
  else He = $[3];
  let We = He,
    ze = !ke && ee;
  const Xe = ee && commandDisplay.kind === "full";
  let rt;
  if ($[4] !== We || $[5] !== ze || $[6] !== Xe)
    ((rt = { isActive: Xe, isCut: ze, contentKey: We }), ($[4] = We), ($[5] = ze), ($[6] = Xe), ($[7] = rt));
  else rt = $[7];
  let kt = FittedOfferBody(commandDisplay.kind === "full" ? commandDisplay.text : "", rt),
    [At, It] = y(),
    Ot;
  if ($[8] !== At) ((Ot = At !== void 0 && isNotYesNo(At) ? At : null), ($[8] = At), ($[9] = Ot));
  else Ot = $[9];
  let Et = Ot,
    [Dt, Lt] = y();
  if (kt.isHeldForGood && Dt === void 0) Lt(Et);
  let showNextRows = kt.showNextRows,
    Xt;
  if ($[10] !== showNextRows)
    ((Xt = [{ action: "app:toggleTranscript", run: showNextRows }]), ($[10] = showNextRows), ($[11] = Xt));
  else Xt = $[11];
  let io = Xt,
    so;
  if ($[12] !== kt.columns || $[13] !== description || $[14] !== ze)
    ((so = ze ? truncateCommandForDisplay(description, kt.columns - 2) : description),
      ($[12] = kt.columns),
      ($[13] = description),
      ($[14] = ze),
      ($[15] = so));
  else so = $[15];
  let po = so,
    max = Math.max(
      1,
      commandDisplay.kind !== "full" ? columns - Bft : kt.columns - (commandDisplay.needsGutter ? 0 : Fft),
    );
  const co = !kt.isStandingHeld ? void 0 : Dt !== void 0 ? Dt : Et;
  let bo;
  if (
    $[16] !== kt ||
    $[17] !== ze ||
    $[18] !== ee ||
    $[19] !== io ||
    $[20] !== max ||
    $[21] !== po ||
    $[22] !== co
  )
    ((bo = {
      isFitted: ee,
      isCut: ze,
      reasonColumns: max,
      moreBindings: io,
      body: kt,
      description: po,
      noteFocus: It,
      fieldLeftOpen: co,
    }),
      ($[16] = kt),
      ($[17] = ze),
      ($[18] = ee),
      ($[19] = io),
      ($[20] = max),
      ($[21] = po),
      ($[22] = co),
      ($[23] = bo));
  else bo = $[23];
  return bo;
}
/**
 * 内容被裁剪时包一层快捷键（展开更多），未裁剪原样返回子节点。
 */
//@ chunk-18hwfzwa.js:1323827-1324156 placement
function FittedBodyKeybindings(h) {
  let $ = w(4),
    { fitted: fitted, children: children } = h;
  if (!fitted.isFitted) {
    return children;
  }
  const L = fitted.body.hiddenRows > 0 || fitted.body.hiddenAbove > 0;
  let ke;
  if ($[0] !== children || $[1] !== fitted.moreBindings || $[2] !== L)
    ((ke = e(useDialogKeybindings, {
      bindings: fitted.moreBindings,
      active: L,
      flexDirection: "column",
      children: children,
    })),
      ($[0] = children),
      ($[1] = fitted.moreBindings),
      ($[2] = L),
      ($[3] = ke));
  else ke = $[3];
  return ke;
}
//@ chunk-18hwfzwa.js:1324156-1324166 placement
var wOo = 6;
/**
 * 生成 "+N lines / N above" 隐藏行提示，按可用列宽依次尝试长短版本，剩余宽度够时再拼上操作提示。
 */
//@ chunk-18hwfzwa.js:1324166-1324506 placement
function formatHiddenRowsHint({
  hiddenRows: hiddenRows,
  hiddenAbove: hiddenAbove,
  hint: hint,
  columns: columns,
}) {
  let ee = formatOverflowHint(hiddenRows, "line"),
    ke =
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
            ],
    Re = ke.find((He) => bunStringWidth(He) <= columns) ?? truncateToWidth(ke.at(-1) ?? ee, columns),
    Be = columns - bunStringWidth(Re) - 1;
  return Be < wOo || hint === "" ? Re : `${Re} ${truncateToWidth(hint, Be)}`;
}
//@ chunk-18hwfzwa.js:1324506-1325050 placement
function SeeMoreHint(h) {
  let $ = w(7),
    { body: body } = h,
    D = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o"),
    { hiddenRows: hiddenRows, hiddenAbove: hiddenAbove } = body;
  if (hiddenRows === 0 && hiddenAbove === 0) {
    return null;
  }
  let Re;
  if ($[0] !== body.columns || $[1] !== hiddenAbove || $[2] !== hiddenRows || $[3] !== D)
    ((Re = formatHiddenRowsHint({
      hiddenRows: hiddenRows,
      hiddenAbove: hiddenAbove,
      hint: formatShortcutHint({
        chord: D,
        action: hiddenRows > 0 ? "see more" : "see the first lines",
        parens: !0,
        format: { keyCase: "lower" },
      }),
      columns: body.columns,
    })),
      ($[0] = body.columns),
      ($[1] = hiddenAbove),
      ($[2] = hiddenRows),
      ($[3] = D),
      ($[4] = Re));
  else Re = $[4];
  let Be;
  if ($[5] !== Re)
    ((Be = e(Text, { dimColor: !0, wrap: "truncate-end", children: Re })), ($[5] = Re), ($[6] = Be));
  else Be = $[6];
  return Be;
}
/**
 * 权限对话框中的命令预览框：未裁剪时直接引用显示（withheld 显示标记），裁剪时绑定测量 ref 并附 "see more" 提示。
 */
//@ chunk-18hwfzwa.js:1325050-1325527 placement
function CommandPreviewFrame({ commandDisplay: commandDisplay, fitted: fitted, inset: inset = 1 }) {
  if (!fitted.isFitted || commandDisplay.kind !== "full")
    return e(DiffFrame, {
      paddingX: inset,
      children: e(Blockquote, {
        multiline: commandDisplay.kind === "full" && commandDisplay.needsGutter,
        children: e(Text, {
          children: commandDisplay.kind === "withheld" ? commandDisplay.marker : commandDisplay.text,
        }),
      }),
    });
  return e(DiffFrame, {
    paddingX: inset,
    children: r(Box, {
      ref: fitted.body.box,
      flexDirection: "column",
      children: [
        e(Blockquote, {
          multiline: commandDisplay.needsGutter,
          children: e(Box, {
            ref: fitted.body.textBox,
            flexDirection: "column",
            flexGrow: 1,
            children: e(Text, { children: fitted.body.text }),
          }),
        }),
        e(SeeMoreHint, { body: fitted.body }),
      ],
    }),
  });
}
//@ chunk-18hwfzwa.js:1325527-1325531 placement
j();
//@ chunk-18hwfzwa.js:1325531-1325586 placement
var Kft = "\xB7 auto mode handles these prompts for you";
/**
 * 渲染"自动模式可替你处理这些提示"的粗体提示。
 */
//@ chunk-18hwfzwa.js:1325586-1325769 placement
function AutoModeTip() {
  let $ = w(1),
    x;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((x = e(Text, {
      bold: !0,
      children: 'Tip: auto mode handles these prompts for you \u2014 choose "switch to auto mode" below',
    })),
      ($[0] = x));
  else x = $[0];
  return x;
}

export {
  CommandDisplay,
  Kft,
  freezeOptionsAfterAnswer,
  isNotYesNo,
  AutoModeTip,
  FittedBodyKeybindings,
  CommandPreviewFrame,
  sandboxHostsSummary,
  SeeMoreHint,
  formatHiddenRowsHint,
};
