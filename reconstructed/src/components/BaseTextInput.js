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
import { domSpansToDecorations, mapDecorationsToRendered } from "./PromptInput/inputDecorations.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Input } from "../ink/components/Input.js";
import { Box, Text } from "../ink/components/Text.js";
import { HighlightedInput } from "./PromptInput/ShimmeredInput.js";
import { Ansi } from "../ink/components/AnsiText.js";
import { reduceCodes } from "../utils/textHighlighting.js";
import { draftToDisplayOffset } from "../plugins/functionHooks/prompt/decorationSpans.js";

//@ chunk-81qqq1aq.js:4298-6714 fingerprint = BaseTextInput (0.631)
function BaseTextInput(props) {
  let $ = w(7);
  let { inputState, children, terminalFocus, invert, hidePlaceholderText, cursorCellPainted, ...props_2 } =
    props;
  let { handleKeyDown, renderedValue, cursorLine, cursorColumn } = inputState;
  let caret =
    props_2.focus && props_2.showCursor && props_2.parkCursor !== false
      ? {
          line: cursorLine,
          column: cursorColumn,
          visible: !cursorCellPainted,
        }
      : undefined;
  let {
    handleKeyDown: handleKeyDown_2,
    handlePaste,
    isPasting,
  } = usePasteHandler({
    onPaste: props_2.onPaste,
    handleKeyDown: (event) => {
      props_2.onKeyDownBefore?.(event);
      if (event.defaultPrevented || event.didStopImmediatePropagation()) {
        return;
      }
      handleKeyDown(event);
    },
    onImagePaste: props_2.onImagePaste,
    onUnreadImagePaste: props_2.onUnreadImagePaste,
  });
  let { onIsPastingChange } = props_2;
  P(() => {
    if (onIsPastingChange) onIsPastingChange(isPasting);
  }, [isPasting, onIsPastingChange]);
  let U;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    U = isNativeCursorEnabled();
    $[0] = U;
  } else U = $[0];
  let He = U;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let { showPlaceholder, renderedPlaceholder } = renderPlaceholder({
    placeholder: props_2.placeholder,
    value: props_2.value,
    showCursor: props_2.showCursor && !He,
    focus: props_2.focus,
    terminalFocus,
    invert,
    hidePlaceholderText: hidePlaceholderText || isScreenReaderEnabled,
  });
  let V = showPlaceholder ? renderedPlaceholder : undefined;
  let B = props_2.focus !== false;
  let ne = R(null);
  useFocusOnMount(ne, B);
  let k = {
    ref: ne,
    autoFocus: B,
    disabled: !B,
    caret,
    onKeyDown: handleKeyDown_2,
    onPaste: handlePaste,
    allowPrintableKeybindings: props_2.allowPrintableKeybindings,
  };
  let W =
    (props_2.value && props_2.value.trim().indexOf(" ") === -1) ||
    (props_2.value && props_2.value.endsWith(" "));
  let showArgumentHint = Boolean(props_2.argumentHint && props_2.value && W && props_2.value.startsWith("/"));
  let shown = inputState.shown;
  let ke =
    shown && props_2.showCursor
      ? {
          start: shown.cursorOffset,
          end: shown.cursorOffset + firstGrapheme(shown.text.text.slice(shown.cursorOffset)).length,
        }
      : undefined;
  let le = shown !== undefined && shown.text.spans.some((span) => span.start === shown.cursorOffset);
  let X =
    props_2.showCursor && props_2.highlights && !le
      ? props_2.highlights.filter(
          (h_0) => h_0.dimColor || props_2.cursorOffset < h_0.start || props_2.cursorOffset >= h_0.end,
        )
      : props_2.highlights;
  let text = props_2.leadingPill?.text ?? "";
  let ae = text
    ? [
        {
          start: 0,
          end: text.length - 1,
          color: "ide",
          priority: 30,
        },
        ...(X ?? []).map((h_1) => ({
          ...h_1,
          start: h_1.start + text.length,
          end: h_1.end + text.length,
        })),
      ]
    : X;
  let K = shown
    ? [...splitSpansAroundOverlays(ae ?? [], shown.text), ...domSpansToDecorations(shown.text, ke)]
    : ae;
  let G =
    K && K.length > 0 ? mapDecorationsToRendered(K, renderedValue, inputState.renderedRowStartOffsets) : K;
  if (G && G.length > 0 && !V && !isScreenReaderEnabled) {
    return jsxProd_default_2(Input, {
      ...k,
      children: [
        jsxProd_default(Box, {
          flexShrink: 0,
          "aria-preserve-whitespace": true,
          children: jsxProd_default(HighlightedInput, {
            text: renderedValue,
            highlights: G,
          }),
        }),
        showArgumentHint &&
          jsxProd_default_2(Text, {
            dimColor: true,
            wrap: "truncate-end",
            children: [props_2.value?.endsWith(" ") ? "" : " ", props_2.argumentHint],
          }),
        children,
      ],
    });
  }
  const Y = Text;
  const wrap = "truncate-end";
  const dimColor = props_2.dimColor;
  const ce = V
    ? jsxProd_default_2(Fragment, {
        children: [
          text
            ? jsxProd_default(Text, {
                color: "ide",
                children: text,
              })
            : null,
          jsxProd_default(Ansi, {
            children: V,
          }),
        ],
      })
    : jsxProd_default(Text, {
        "aria-preserve-whitespace": true,
        children: jsxProd_default(Ansi, {
          children: renderedValue,
        }),
      });
  const t6 =
    showArgumentHint &&
    jsxProd_default_2(Text, {
      dimColor: true,
      children: [props_2.value?.endsWith(" ") ? "" : " ", props_2.argumentHint],
    });
  let children_2;
  if ($[1] !== Y || $[2] !== children || $[3] !== props_2 || $[4] !== ce || $[5] !== t6) {
    children_2 = jsxProd_default_2(Y, {
      wrap,
      dimColor,
      children: [ce, t6, children],
    });
    $[1] = Y;
    $[2] = children;
    $[3] = props_2;
    $[4] = ce;
    $[5] = t6;
    $[6] = children_2;
  } else children_2 = $[6];
  return jsxProd_default(Input, {
    ...k,
    children: children_2,
  });
}
//@ chunk-e6aww6q8.js:66424-66686 placement = writeCacheBreakDiff (0.806)
/**
 * 文本编辑用的区间切分（BaseTextInput 使用），与缓存检测无关，归错文件。旧版名 writeCacheBreakDiff 为错配。
 */
var splitSpansAroundOverlays = (prevContent, newContent) =>
  reduceCodes(prevContent).flatMap((r) => {
    let s = draftToDisplayOffset(newContent, r.start, "after");
    let h = draftToDisplayOffset(newContent, r.end, "before");
    let y = [
      s,
      ...newContent.spans
        .filter((span) => span.start >= s && span.end <= h)
        .flatMap((span) => [span.start, span.end]),
      h,
    ];
    return y.flatMap((S, w) => {
      let L = y[w + 1] ?? S;
      return w % 2 === 0 && L > S
        ? [
            {
              ...r,
              start: S,
              end: L,
            },
          ]
        : [];
    });
  });
export { BaseTextInput };
