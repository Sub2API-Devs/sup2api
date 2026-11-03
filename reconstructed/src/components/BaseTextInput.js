/**
 * components/BaseTextInput.tsx
 *
 * 文本输入框的渲染层：把 useTextInput 的渲染结果（含光标、占位符、粘贴 pill、幽灵文本）画到终端，并声明终端光标位置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/BaseTextInput.tsx
 * pieces: chunk-81qqq1aq.js (1), chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1, placement 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { usePasteHandler } from "../hooks/usePasteHandler.js";
import { P, R } from "../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { isNativeCursorEnabled } from "../ink/nativeCursor.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { renderPlaceholder } from "../hooks/renderPlaceholder.js";
import { useFocusOnMount } from "../hooks/useFocusOnMount.js";
import { firstGrapheme } from "../utils/intl.js";
import { ZFo, mapDecorationsToRendered } from "./PromptInput/inputDecorations.js";
import { r, e, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Input } from "../ink/components/Input.js";
import { Box, Text } from "../ink/components/Text.js";
import { HighlightedInput } from "./PromptInput/ShimmeredInput.js";
import { Ansi } from "../ink/components/AnsiText.js";
import { reduceCodes } from "../utils/textHighlighting.js";
import { draftToDisplayOffset } from "../plugins/functionHooks/prompt/decorationSpans.js";

//@ chunk-81qqq1aq.js:4298-6714 fingerprint = BaseTextInput (0.631)
function BaseTextInput(t0) {
  let $ = w(7),
    {
      inputState: inputState,
      children: children,
      terminalFocus: terminalFocus,
      invert: invert,
      hidePlaceholderText: hidePlaceholderText,
      cursorCellPainted: cursorCellPainted,
      ...o
    } = t0,
    {
      handleKeyDown: handleKeyDown,
      renderedValue: renderedValue,
      cursorLine: cursorLine,
      cursorColumn: cursorColumn,
    } = inputState,
    E =
      o.focus && o.showCursor && o.parkCursor !== !1
        ? { line: cursorLine, column: cursorColumn, visible: !cursorCellPainted }
        : void 0,
    {
      handleKeyDown: handleKeyDown_2,
      handlePaste: handlePaste,
      isPasting: isPasting,
    } = usePasteHandler({
      onPaste: o.onPaste,
      handleKeyDown: (H) => {
        if ((o.onKeyDownBefore?.(H), H.defaultPrevented || H.didStopImmediatePropagation())) {
          return;
        }
        handleKeyDown(H);
      },
      onImagePaste: o.onImagePaste,
      onUnreadImagePaste: o.onUnreadImagePaste,
    }),
    { onIsPastingChange: onIsPastingChange } = o;
  P(() => {
    if (onIsPastingChange) onIsPastingChange(isPasting);
  }, [isPasting, onIsPastingChange]);
  let U;
  if ($[0] === MEMO_CACHE_SENTINEL) ((U = isNativeCursorEnabled()), ($[0] = U));
  else U = $[0];
  let He = U,
    se = useIsScreenReaderEnabled(),
    { showPlaceholder: showPlaceholder, renderedPlaceholder: renderedPlaceholder } = renderPlaceholder({
      placeholder: o.placeholder,
      value: o.value,
      showCursor: o.showCursor && !He,
      focus: o.focus,
      terminalFocus: terminalFocus,
      invert: invert,
      hidePlaceholderText: hidePlaceholderText || se,
    }),
    V = showPlaceholder ? renderedPlaceholder : void 0,
    B = o.focus !== !1,
    ne = R(null);
  useFocusOnMount(ne, B);
  let k = {
      ref: ne,
      autoFocus: B,
      disabled: !B,
      caret: E,
      onKeyDown: handleKeyDown_2,
      onPaste: handlePaste,
      allowPrintableKeybindings: o.allowPrintableKeybindings,
    },
    W = (o.value && o.value.trim().indexOf(" ") === -1) || (o.value && o.value.endsWith(" ")),
    showArgumentHint = Boolean(o.argumentHint && o.value && W && o.value.startsWith("/")),
    shown = inputState.shown,
    ke =
      shown && o.showCursor
        ? {
            start: shown.cursorOffset,
            end: shown.cursorOffset + firstGrapheme(shown.text.text.slice(shown.cursorOffset)).length,
          }
        : void 0,
    le = shown !== void 0 && shown.text.spans.some((span) => span.start === shown.cursorOffset),
    X =
      o.showCursor && o.highlights && !le
        ? o.highlights.filter(
            (h_0) => h_0.dimColor || o.cursorOffset < h_0.start || o.cursorOffset >= h_0.end,
          )
        : o.highlights,
    T = o.leadingPill?.text ?? "",
    ae = T
      ? [
          { start: 0, end: T.length - 1, color: "ide", priority: 30 },
          ...(X ?? []).map((h_1) => ({ ...h_1, start: h_1.start + T.length, end: h_1.end + T.length })),
        ]
      : X,
    K = shown ? [...splitSpansAroundOverlays(ae ?? [], shown.text), ...ZFo(shown.text, ke)] : ae,
    G =
      K && K.length > 0 ? mapDecorationsToRendered(K, renderedValue, inputState.renderedRowStartOffsets) : K;
  if (G && G.length > 0 && !V && !se) {
    return r(Input, {
      ...k,
      children: [
        e(Box, {
          flexShrink: 0,
          "aria-preserve-whitespace": !0,
          children: e(HighlightedInput, { text: renderedValue, highlights: G }),
        }),
        showArgumentHint &&
          r(Text, {
            dimColor: !0,
            wrap: "truncate-end",
            children: [o.value?.endsWith(" ") ? "" : " ", o.argumentHint],
          }),
        children,
      ],
    });
  }
  const Y = Text,
    t4 = "truncate-end",
    dimColor = o.dimColor,
    ce = V
      ? r(Fragment, {
          children: [T ? e(Text, { color: "ide", children: T }) : null, e(Ansi, { children: V })],
        })
      : e(Text, { "aria-preserve-whitespace": !0, children: e(Ansi, { children: renderedValue }) }),
    Oe =
      showArgumentHint &&
      r(Text, { dimColor: !0, children: [o.value?.endsWith(" ") ? "" : " ", o.argumentHint] });
  let rt;
  if ($[1] !== Y || $[2] !== children || $[3] !== o || $[4] !== ce || $[5] !== Oe)
    ((rt = r(Y, { wrap: t4, dimColor: dimColor, children: [ce, Oe, children] })),
      ($[1] = Y),
      ($[2] = children),
      ($[3] = o),
      ($[4] = ce),
      ($[5] = Oe),
      ($[6] = rt));
  else rt = $[6];
  return e(Input, { ...k, children: rt });
}
/**
 * 文本编辑用的区间切分（BaseTextInput 使用），与缓存检测无关，归错文件。旧版名 writeCacheBreakDiff 为错配。
 */
//@ chunk-e6aww6q8.js:66424-66686 placement = writeCacheBreakDiff (0.806)
var splitSpansAroundOverlays = (prevContent, newContent) =>
  reduceCodes(prevContent).flatMap((r) => {
    let s = draftToDisplayOffset(newContent, r.start, "after"),
      h = draftToDisplayOffset(newContent, r.end, "before"),
      y = [
        s,
        ...newContent.spans
          .filter((span) => span.start >= s && span.end <= h)
          .flatMap((S) => [S.start, S.end]),
        h,
      ];
    return y.flatMap((S, w) => {
      let L = y[w + 1] ?? S;
      return w % 2 === 0 && L > S ? [{ ...r, start: S, end: L }] : [];
    });
  });

export { BaseTextInput };
