/**
 * components/BaseTextInput.tsx
 *
 * 文本输入框的渲染层：把 useTextInput 的渲染结果（含光标、占位符、粘贴 pill、幽灵文本）画到终端，并声明终端光标位置。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/BaseTextInput.tsx
 * pieces: chunk-3t80v0fz.js (1), chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1, placement 1
 */
import { reduceCodes } from "../utils/textHighlighting.js";
import { draftToDisplayOffset } from "../plugins/functionHooks/prompt/decorationSpans.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { usePasteHandler } from "../hooks/usePasteHandler.js";
import { useEffect, useRef } from "../../vendor/react/cjs/react.production.js";
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

//@ chunk-5xgkngpb.js:68965-69227 placement (2.1.88 match: writeCacheBreakDiff, 0.805)
/**
 * 文本编辑用的区间切分（BaseTextInput 使用），与缓存检测无关，归错文件。旧版名 writeCacheBreakDiff 为错配。
 */
var splitSpansAroundOverlays = (prevContent, newContent) =>
  reduceCodes(prevContent).flatMap((span) => {
    let start = draftToDisplayOffset(newContent, span.start, "after");
    let end = draftToDisplayOffset(newContent, span.end, "before");
    let boundaries = [
      start,
      ...newContent.spans
        .filter((span) => span.start >= start && span.end <= end)
        .flatMap((span) => [span.start, span.end]),
      end,
    ];
    return boundaries.flatMap((boundary, index) => {
      let nextBoundary = boundaries[index + 1] ?? boundary;
      return index % 2 === 0 && nextBoundary > boundary
        ? [
            {
              ...span,
              start: boundary,
              end: nextBoundary,
            },
          ]
        : [];
    });
  });
//@ chunk-3t80v0fz.js:4299-6717 fingerprint (2.1.88 match: BaseTextInput, 0.631)
function BaseTextInput(props) {
  let $ = useMemoCache(7);
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
  useEffect(() => {
    if (onIsPastingChange) onIsPastingChange(isPasting);
  }, [isPasting, onIsPastingChange]);
  let nativeCursor;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    nativeCursor = isNativeCursorEnabled();
    $[0] = nativeCursor;
  } else nativeCursor = $[0];
  let useNativeCursor = nativeCursor;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let { showPlaceholder, renderedPlaceholder } = renderPlaceholder({
    placeholder: props_2.placeholder,
    value: props_2.value,
    showCursor: props_2.showCursor && !useNativeCursor,
    focus: props_2.focus,
    terminalFocus,
    invert,
    hidePlaceholderText: hidePlaceholderText || isScreenReaderEnabled,
  });
  let placeholder = showPlaceholder ? renderedPlaceholder : undefined;
  let isFocused = props_2.focus !== false;
  let inputRef = useRef(null);
  useFocusOnMount(inputRef, isFocused);
  let inputProps = {
    ref: inputRef,
    autoFocus: isFocused,
    disabled: !isFocused,
    caret,
    onKeyDown: handleKeyDown_2,
    onPaste: handlePaste,
    allowPrintableKeybindings: props_2.allowPrintableKeybindings,
  };
  let endsWithToken =
    (props_2.value && props_2.value.trim().indexOf(" ") === -1) ||
    (props_2.value && props_2.value.endsWith(" "));
  let showArgumentHint = Boolean(
    props_2.argumentHint && props_2.value && endsWithToken && props_2.value.startsWith("/"),
  );
  let shown = inputState.shown;
  let caretSelection =
    shown && props_2.showCursor
      ? {
          start: shown.cursorOffset,
          end: shown.cursorOffset + firstGrapheme(shown.text.text.slice(shown.cursorOffset)).length,
        }
      : undefined;
  let caretOnSpan = shown !== undefined && shown.text.spans.some((span) => span.start === shown.cursorOffset);
  let highlights =
    props_2.showCursor && props_2.highlights && !caretOnSpan
      ? props_2.highlights.filter(
          (h_0) => h_0.dimColor || props_2.cursorOffset < h_0.start || props_2.cursorOffset >= h_0.end,
        )
      : props_2.highlights;
  let text = props_2.leadingPill?.text ?? "";
  let decorations = text
    ? [
        {
          start: 0,
          end: text.length - 1,
          color: "ide",
          priority: 30,
        },
        ...(highlights ?? []).map((h_1) => ({
          ...h_1,
          start: h_1.start + text.length,
          end: h_1.end + text.length,
        })),
      ]
    : highlights;
  let splitDecorations = shown
    ? [
        ...splitSpansAroundOverlays(decorations ?? [], shown.text),
        ...domSpansToDecorations(shown.text, caretSelection),
      ]
    : decorations;
  let renderedDecorations =
    splitDecorations && splitDecorations.length > 0
      ? mapDecorationsToRendered(splitDecorations, renderedValue, inputState.renderedRowStartOffsets)
      : splitDecorations;
  if (renderedDecorations && renderedDecorations.length > 0 && !placeholder && !isScreenReaderEnabled) {
    return jsxProd_default_2(Input, {
      ...inputProps,
      children: [
        jsxProd_default(Box, {
          flexShrink: 0,
          "aria-preserve-whitespace": true,
          children: jsxProd_default(HighlightedInput, {
            text: renderedValue,
            highlights: renderedDecorations,
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
  const TextComponent = Text;
  const wrap = "truncate-end";
  const dimColor = props_2.dimColor;
  const renderedChild = placeholder
    ? jsxProd_default_2(Fragment, {
        children: [
          text
            ? jsxProd_default(Text, {
                color: "ide",
                children: text,
              })
            : null,
          jsxProd_default(Ansi, {
            children: placeholder,
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
  if (
    $[1] !== TextComponent ||
    $[2] !== children ||
    $[3] !== props_2 ||
    $[4] !== renderedChild ||
    $[5] !== t6
  ) {
    children_2 = jsxProd_default_2(TextComponent, {
      wrap,
      dimColor,
      children: [renderedChild, t6, children],
    });
    $[1] = TextComponent;
    $[2] = children;
    $[3] = props_2;
    $[4] = renderedChild;
    $[5] = t6;
    $[6] = children_2;
  } else children_2 = $[6];
  return jsxProd_default(Input, {
    ...inputProps,
    children: children_2,
  });
}
export { BaseTextInput };
