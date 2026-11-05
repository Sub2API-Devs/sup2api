/**
 * components/FullscreenLayout.tsx
 *
 * 全屏布局：滚动区 + 底部输入区 + 侧栏/坞，提供 ScrollChromeContext、未读分隔线、"新消息"跳底药丸、置顶提示头、对话框/建议浮层。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FullscreenLayout.tsx
 * pieces: chunk-hnxhr3bs.js (65)
 * attribution: placement 42, sole-consumer 5, affinity 1, fingerprint 8, layout 7, file-local 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createStore } from "../state/store.js";
import { setSliceField } from "../state/sliceHelpers.js";
import {
  createContext,
  useState,
  useRef,
  useContext,
  useEffect,
  init_react_production,
  useInsertionEffect,
  useLayoutEffect,
  useSyncExternalStore,
} from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { topWithin, measureElement } from "../ink/hooks/useTerminalHooks.js";
import { useMeasured, useSelection, useInterval, NoSelect } from "../ink/components/Input.js";
import { calculateFeedWidth } from "./LogoV2/Feed.js";
import {
  ReplayHandleSlot,
  ScreenReplayWriter,
  serializeNodeScreenRows,
  ScrollAnchorContext,
  CHROME_ROWS,
} from "../ink/outputReplay.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { getSecondRootError } from "../ink/terminal.js";
import { serializeScreenRow } from "../ink/output.js";
import { renderToScreen } from "../ink/render-to-screen.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { ScrollBoxDefault } from "../ink/components/ScrollBox.js";
import { BaseBox } from "../ink/components/Box.js";
import { isHiddenAttachmentMessage } from "./messages/nullRenderingAttachments.js";
import { stripMemoryTags } from "../services/orgMemory/promptIndex.js";
import { Text, Box } from "../ink/components/Text.js";
import { subscribeScrollTraceLive, isScrollTraceDemoRuler } from "../ink/widest-line.js";
import { openClickedLink } from "../utils/browser.js";
import {
  isFullscreenEnvEnabled,
  subscribeFullscreenObserved,
  hasFullscreenBeenObserved,
  isMouseTrackingEnabled,
} from "../utils/fullscreen.js";
import { isSignedThinkingBlock } from "../utils/collapseReadSearch.js";
import { isReinjectedListingAttachment } from "../services/compact/compact.js";
import { hasStringUuid } from "../bridge/inboundMessages.js";
import {
  NOTICE_WIDTH_LIMIT,
  MAX_NOTICE_LINES,
  noticeDialogSlot,
  PromptToast,
} from "./PromptInput/Notifications.js";
import { OVERLAY_BATCH_SIZE, useOverlayFlagA, useOverlayFlagB } from "../context/overlayContext.js";
import { isDecstbmRendererEnabled } from "../ink/nativeCursor.js";
import { useAppStateSlice, appStoreContext } from "../state/AppState.js";
import { shouldShowNotice } from "./SlashCommandLink.js";
import { SPINNER_COLUMN_MIN_WIDTH } from "./Spinner/SpinnerColumn.js";
import { resolveSetting } from "../utils/settings/userIntentSettings.js";
import { TerminalSizeContext } from "../ink/terminalModes.js";
import { ContextSlotA, contextSlot } from "../context/contextSlots.js";
import { scrollViewportContext } from "./ScrollViewportContext.js";
import { PANE_WIDTH_RESERVE } from "./design-system/Pane.js";
import { Divider } from "./design-system/Divider.js";
import { useHeaderGauge, isHeldNotice, holdsToasts, isGaugeSurface } from "../context/notifications.js";
import { APP_CONTEXT } from "../../vendor/convert-to-spaces/dist/index.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { parseChord, chordToDisplayString } from "../keybindings/parser.js";
import { getShortcutDisplayPlatform } from "../utils/keyboardShortcuts.js";
import { useShortcutDisplay } from "../keybindings/useShortcutDisplay.js";
import { plural } from "../utils/stringUtils.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { countJumpToBottom } from "../utils/scrollTelemetry.js";
import { TagTabs } from "./TagTabs.js";
import { FooterSuggestionsMemo } from "./PromptInput/PromptInputFooterSuggestions.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-hnxhr3bs.js:8544-8570 placement
function renderNull() {
  return null;
}
//@ chunk-hnxhr3bs.js:8570-8601 placement
var EMPTY_FULLSCREEN_SLOTS = {
  data: null,
  dialog: null,
};
//@ chunk-hnxhr3bs.js:8601-8708 placement
function createFullscreenSlots() {
  let store = createStore(EMPTY_FULLSCREEN_SLOTS);
  return {
    store,
    setData: setSliceField(store.setState, "data"),
    setDialog: setSliceField(store.setState, "dialog"),
  };
}
//@ chunk-hnxhr3bs.js:8708-8724 placement
var FullscreenSlotsContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:8708", () => {
  FullscreenSlotsContext = createContext(null);
});
//@ chunk-hnxhr3bs.js:8724-8987 placement
function FullscreenSlotsProvider(props) {
  let $ = useMemoCache(6);
  let { container, children } = props;
  let [slots] = useState(createFullscreenSlots);
  let anchor = useRef(null);
  let value;
  if ($[0] !== slots || $[1] !== container) {
    value = {
      ...slots,
      anchor,
      container,
    };
    $[0] = slots;
    $[1] = container;
    $[2] = value;
  } else value = $[2];
  let value_2 = value;
  let provider;
  if ($[3] !== children || $[4] !== value_2) {
    provider = jsxProd_default(FullscreenSlotsContext, {
      value: value_2,
      children,
    });
    $[3] = children;
    $[4] = value_2;
    $[5] = provider;
  } else provider = $[5];
  return provider;
}
//@ chunk-hnxhr3bs.js:8987-9016 placement
function selectSlotData(slots) {
  return slots.data;
}
//@ chunk-hnxhr3bs.js:9016-9047 placement
function selectSlotDialog(slots) {
  return slots.dialog;
}
//@ chunk-hnxhr3bs.js:9153-9201 placement
function useFullscreenSlotData() {
  return useStoreSelector(useContext(FullscreenSlotsContext)?.store, selectSlotData) ?? null;
}
//@ chunk-hnxhr3bs.js:9201-9249 placement
function useFullscreenSlotDialog() {
  return useStoreSelector(useContext(FullscreenSlotsContext)?.store, selectSlotDialog) ?? null;
}
//@ chunk-hnxhr3bs.js:9249-9585 placement
/**
 * 测量锚点在容器中的顶部位置，等于其上外边距时返回该值，否则为 0。
 */
function useAnchorTopMargin() {
  let $ = useMemoCache(3);
  let slots = useContext(FullscreenSlotsContext);
  let measureMargin;
  if ($[0] !== slots?.anchor || $[1] !== slots?.container?.current) {
    measureMargin = () => {
      let containerNode = slots?.container?.current;
      let anchorNode = slots?.anchor.current;
      if (!containerNode || !anchorNode?.yogaNode) {
        return 0;
      }
      let top = topWithin(anchorNode, containerNode);
      if (top < 0) {
        return 0;
      }
      let computedMargin = anchorNode.yogaNode.getComputedMargin(1);
      return top === computedMargin ? computedMargin : 0;
    };
    $[0] = slots?.anchor;
    $[1] = slots?.container?.current;
    $[2] = measureMargin;
  } else measureMargin = $[2];
  return useMeasured(measureMargin);
}
//@ chunk-hnxhr3bs.js:9585-9632 placement
/**
 * 函数 useFeedIsWide（全屏 feed 是否够宽）；位于「全屏布局：滚动区 + 底部输入区 + 侧栏/坞，提供 ScrollChromeContext、未读分隔线、"新消息"跳底药丸、置顶提示头、对话框/建议浮层」模块。
 */
function useFeedIsWide() {
  return useStoreSelector(useContext(FullscreenSlotsContext)?.store, calculateFeedWidth) ?? false;
}
//@ chunk-hnxhr3bs.js:9632-9892 placement
function useSetSlot(setSlot, value) {
  let $ = useMemoCache(7);
  let setEffect;
  let setDeps;
  if ($[0] !== setSlot || $[1] !== value) {
    setEffect = () => {
      if (!setSlot) {
        return;
      }
      setSlot(() => value);
    };
    setDeps = [setSlot, value];
    $[0] = setSlot;
    $[1] = value;
    $[2] = setEffect;
    $[3] = setDeps;
  } else {
    setEffect = $[2];
    setDeps = $[3];
  }
  useEffect(setEffect, setDeps);
  let clearEffect;
  let clearDeps;
  if ($[4] !== setSlot) {
    clearEffect = () => {
      if (!setSlot) {
        return;
      }
      return () => {
        setSlot(renderNull);
      };
    };
    clearDeps = [setSlot];
    $[4] = setSlot;
    $[5] = clearEffect;
    $[6] = clearDeps;
  } else {
    clearEffect = $[5];
    clearDeps = $[6];
  }
  useEffect(clearEffect, clearDeps);
}
//@ chunk-hnxhr3bs.js:9892-9930 placement
function useFullscreenFooterData(data) {
  useSetSlot(useContext(FullscreenSlotsContext)?.setData, data);
}
//@ chunk-hnxhr3bs.js:9930-9970 placement
function useFullscreenDialogSlot(dialog) {
  useSetSlot(useContext(FullscreenSlotsContext)?.setDialog, dialog);
}
//@ chunk-hnxhr3bs.js:9970-10007 placement
function useFullscreenAnchor() {
  return useContext(FullscreenSlotsContext)?.anchor;
}
//@ chunk-hnxhr3bs.js:10007-10011 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:10007", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:17351-17380 placement
function newReplayHandleSlot() {
  return new ReplayHandleSlot();
}
//@ chunk-hnxhr3bs.js:17380-20020 placement
/**
 * 全屏布局：可滚动区、底部区、上推区与浮层，维护滚动视口与缓存布局。
 */
function FullscreenLayoutView(props) {
  let $ = useMemoCache(28);
  let { scrollable, bottom, pushUp, overlay, scrollViewport } = props;
  let terminalSize = useTerminalSize();
  let { columns, rows } = terminalSize;
  let writerRef = useRef(null);
  let bottomRef = useRef(null);
  let overlayRef = useRef(null);
  let anchorRef = useRef(null);
  let [replaySlot] = useState(newReplayHandleSlot);
  let replay = scrollViewport ?? replaySlot;
  let { attach } = replay;
  let setupReplay;
  if ($[0] !== columns || $[1] !== rows || $[2] !== replay.handle) {
    setupReplay = () => {
      let terminal = getSecondRootError().get(process.stdout);
      if (!terminal) {
        return;
      }
      let writer = new ScreenReplayWriter(process.stdout, columns, rows, terminal.recordContentWrite);
      writer.setup();
      writerRef.current = writer;
      let suspended = false;
      terminal.frameSink = (frame, stylePool) => {
        let activeWriter = writerRef.current;
        if (!activeWriter) {
          return false;
        }
        if (terminal.isAltScreenActive) {
          if (!suspended) {
            activeWriter.suspend();
            suspended = true;
          }
          return false;
        }
        if (suspended) {
          suspended = false;
          activeWriter.resume(activeWriter.cols, activeWriter.rows);
        }
        let needsTick = activeWriter.tickPump();
        let scrollableRows = serializeNodeScreenRows(frame, stylePool, bottomRef.current);
        let overlayRows = serializeNodeScreenRows(frame, stylePool, overlayRef.current);
        let layout = activeWriter.computeLayout(scrollableRows, overlayRows);
        let scrollNode = replay.handle?.getDomElement() ?? null;
        if (scrollNode) {
          let cachedLayout = scrollNode.cachedLayout;
          let transcriptLines = [];
          if (cachedLayout && cachedLayout.height > 0) {
            let min = Math.min(cachedLayout.y + cachedLayout.height, frame.screen.height);
            for (let row = cachedLayout.y; row < min; row++)
              transcriptLines.push(serializeScreenRow(frame.screen, stylePool, row));
          }
          let scrollHeight = scrollNode.scrollHeight ?? 0;
          let transcriptEnd = offsetWithinParent(anchorRef.current, scrollNode) ?? scrollHeight;
          activeWriter.syncViewport(
            {
              lines: transcriptLines,
              scrollTop: scrollNode.scrollTop ?? 0,
              scrollHeight,
              transcriptEnd,
            },
            layout.contentHeight,
          );
        }
        let backfilled = false;
        if (scrollNode) {
          let gap = activeWriter.consumeGapRange();
          let backfillNeeded = activeWriter.consumeBackfillNeeded();
          if (gap || backfillNeeded) {
            let from = gap ? gap.from : 0;
            let toRow = gap ? gap.to : (scrollNode.scrollTop ?? 0);
            let backfillRows = renderToScreen(
              scrollNode,
              from,
              toRow,
              activeWriter.cols,
              terminal.getStylePool(),
            );
            if (backfillRows.length > 0) {
              activeWriter.primeBackfill(backfillRows);
              backfilled = true;
            }
          }
        }
        activeWriter.draw(layout);
        return needsTick || backfilled ? "tick" : true;
      };
      return () => {
        terminal.frameSink = null;
        writer.restore();
        writerRef.current = null;
      };
    };
    $[0] = columns;
    $[1] = rows;
    $[2] = replay.handle;
    $[3] = setupReplay;
  } else setupReplay = $[3];
  let emptyDeps;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    emptyDeps = [];
    $[4] = emptyDeps;
  } else emptyDeps = $[4];
  useInsertionEffect(setupReplay, emptyDeps);
  let size;
  if ($[5] !== columns || $[6] !== rows) {
    size = {
      cols: columns,
      rows,
    };
    $[5] = columns;
    $[6] = rows;
    $[7] = size;
  } else size = $[7];
  let sizeRef = useRef(size);
  let onResize;
  let resizeDeps;
  if ($[8] !== columns || $[9] !== rows) {
    onResize = () => {
      if (columns === sizeRef.current.cols && rows === sizeRef.current.rows) {
        return;
      }
      sizeRef.current = {
        cols: columns,
        rows,
      };
      writerRef.current?.handleResize(columns, rows);
    };
    resizeDeps = [columns, rows];
    $[8] = columns;
    $[9] = rows;
    $[10] = onResize;
    $[11] = resizeDeps;
  } else {
    onResize = $[10];
    resizeDeps = $[11];
  }
  useLayoutEffect(onResize, resizeDeps);
  let children;
  if ($[12] !== scrollable) {
    children = jsxProd_default(ScrollAnchorContext.Provider, {
      value: anchorRef,
      children: scrollable,
    });
    $[12] = scrollable;
    $[13] = children;
  } else children = $[13];
  let scrollBox;
  if ($[14] !== attach || $[15] !== children) {
    scrollBox = jsxProd_default(ScrollBoxDefault, {
      ref: attach,
      flexGrow: 1,
      flexDirection: "column",
      stickyScroll: true,
      children,
    });
    $[14] = attach;
    $[15] = children;
    $[16] = scrollBox;
  } else scrollBox = $[16];
  const maxHeight = rows - 2;
  let bottomBox;
  if ($[17] !== bottom || $[18] !== pushUp || $[19] !== maxHeight) {
    bottomBox = jsxProd_default_2(BaseBox, {
      ref: bottomRef,
      flexDirection: "column",
      flexShrink: 0,
      minHeight: CHROME_ROWS,
      maxHeight,
      children: [pushUp, bottom],
    });
    $[17] = bottom;
    $[18] = pushUp;
    $[19] = maxHeight;
    $[20] = bottomBox;
  } else bottomBox = $[20];
  let overlayBox;
  if ($[21] !== overlay) {
    overlayBox =
      overlay != null
        ? jsxProd_default(BaseBox, {
            ref: overlayRef,
            flexDirection: "column",
            flexShrink: 0,
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            opaque: true,
            children: overlay,
          })
        : null;
    $[21] = overlay;
    $[22] = overlayBox;
  } else overlayBox = $[22];
  let root;
  if ($[23] !== rows || $[24] !== overlayBox || $[25] !== scrollBox || $[26] !== bottomBox) {
    root = jsxProd_default_2(BaseBox, {
      flexDirection: "column",
      height: rows,
      width: "100%",
      flexShrink: 0,
      children: [scrollBox, bottomBox, overlayBox],
    });
    $[23] = rows;
    $[24] = overlayBox;
    $[25] = scrollBox;
    $[26] = bottomBox;
    $[27] = root;
  } else root = $[27];
  return root;
}
//@ chunk-hnxhr3bs.js:20020-20156 placement (2.1.88 match: siblingSharesY, 0.858)
function offsetWithinParent(node, yogaNode) {
  if (!node) return;
  let offset = 0;
  let node_2 = node;
  while (node_2 && node_2.parentNode !== yogaNode) {
    offset += node_2.yogaNode?.getComputedTop() ?? 0;
    node_2 = node_2.parentNode;
  }
  return node_2 ? offset : undefined;
}
//@ chunk-hnxhr3bs.js:20930-20944 placement
/**
 * 导出值：TranscriptOverlaySlot（transcript 叠加层槽）；位于「全屏布局：滚动区 + 底部输入区 + 侧栏/坞，提供 ScrollChromeContext、未读分隔线、"新消息"跳底药丸、置顶提示头、对话框/建议浮层」模块。
 */
var TranscriptOverlaySlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:20930", () => {
  TranscriptOverlaySlot = createContext(0);
});
//@ chunk-hnxhr3bs.js:20944-20948 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:20944", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:20948-20962 placement
/**
 * 导出值：FooterSlot（页脚槽）；位于「全屏布局：滚动区 + 底部输入区 + 侧栏/坞，提供 ScrollChromeContext、未读分隔线、"新消息"跳底药丸、置顶提示头、对话框/建议浮层」模块。
 */
var FooterSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:20948", () => {
  FooterSlot = createContext(0);
});
//@ chunk-hnxhr3bs.js:20962-20966 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:20962", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:20966-21028 placement
function debugColor(color) {
  return `rgb(${color & 255},${(color >> 8) & 255},${(color >> 16) & 255})`;
}
//@ chunk-hnxhr3bs.js:21028-21283 placement
var DEBUG_COLOR_COUNT; // deferred: uses debugColor of its import cycle while loading; runs once the cycle is complete
var DEBUG_ALT_COLOR_COUNT;
var DEBUG_COLORS;
var DEBUG_ALT_COLORS;
var GLYPH_RANGES;
var GLYPH_RANGE_TOTAL;
deferInit("chunk-hnxhr3bs.js:21028", () => {
  DEBUG_COLOR_COUNT = 64;
  DEBUG_ALT_COLOR_COUNT = 64;
  DEBUG_COLORS = Array.from(
    {
      length: DEBUG_COLOR_COUNT,
    },
    (value, index) => debugColor(index * 2043453),
  );
  DEBUG_ALT_COLORS = Array.from(
    {
      length: DEBUG_ALT_COLOR_COUNT,
    },
    (value, index) => debugColor(index * 461587 + 8405034),
  );
  GLYPH_RANGES = [
    [33, 94],
    [161, 431],
    [592, 96],
    [880, 144],
    [1024, 256],
    [8592, 112],
    [8704, 256],
    [9472, 128],
    [9600, 32],
    [9632, 96],
  ];
  GLYPH_RANGE_TOTAL = GLYPH_RANGES.reduce((acc, [, count]) => acc + count, 0);
});
//@ chunk-hnxhr3bs.js:23518-23790 placement
function isInvisibleMessage(message) {
  switch (message.type) {
    case "attachment":
      return isHiddenAttachmentMessage(message);
    case "assistant": {
      let content = message.message.content;
      if (content.length === 0) return false;
      for (let block of content) {
        if (block.type !== "thinking") return false;
        let thinking = block.thinking;
        if (thinking !== "" && !(thinking.startsWith("<") && stripMemoryTags(thinking) === "")) return false;
      }
      return true;
    }
    default:
      return false;
  }
}
//@ chunk-hnxhr3bs.js:23790-23794 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:23790", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:23794-23822 placement
function incrementByOne(value) {
  return value + 1;
}
//@ chunk-hnxhr3bs.js:23822-23860 placement
function isInKind(part) {
  return part.kind === "in";
}
//@ chunk-hnxhr3bs.js:23860-23959 placement (2.1.88 match: _temp2, 0.818)
function renderDebugLine(line, i_1) {
  return jsxProd_default(
    Text,
    {
      dimColor: true,
      wrap: "truncate-end",
      children: fmt(line),
    },
    `${line.ts}-${i_1}`,
  );
}
//@ chunk-hnxhr3bs.js:23959-24019 placement
function renderDimChildren(children, key) {
  return jsxProd_default(
    Text,
    {
      dimColor: true,
      children,
    },
    key,
  );
}
//@ chunk-hnxhr3bs.js:24019-24044 placement
var FULLSCREEN_COLUMNS = 25;
var FULLSCREEN_ROWS = 80;
var FULLSCREEN_CELL_BUDGET = FULLSCREEN_COLUMNS * FULLSCREEN_ROWS;
//@ chunk-hnxhr3bs.js:24044-24048 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:24044", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:24048-24163 placement
function renderScrollTestLine(line, key) {
  return jsxProd_default_2(
    Text,
    {
      dimColor: true,
      children: [
        "  ",
        line.num,
        line.text &&
          jsxProd_default_2(Fragment, {
            children: ["  ", line.indent, line.text],
          }),
      ],
    },
    key,
  );
}
//@ chunk-hnxhr3bs.js:24163-24174 placement
var SCROLL_TEST_LINE_COUNT = 200;
//@ chunk-hnxhr3bs.js:24174-24280 placement
function ScrollTraceRuler() {
  let $ = useMemoCache(2);
  let isDemoRuler = useSyncExternalStore(subscribeScrollTraceLive, isScrollTraceDemoRuler);
  let ruler;
  if ($[0] !== isDemoRuler) {
    ruler = isDemoRuler ? jsxProd_default(ScrollTestFiller, {}) : null;
    $[0] = isDemoRuler;
    $[1] = ruler;
  } else ruler = $[1];
  return ruler;
}
//@ chunk-hnxhr3bs.js:24280-24574 placement (2.1.88 match: _temp25, 0.357)
/**
 * 全屏布局里的"scroll test"占位区块：生成固定行数的拉丁文编号行，用于测试滚动，关闭对话框后消失。
 */
function ScrollTestFiller() {
  let $ = useMemoCache(2);
  let builtLines;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    builtLines = buildScrollTestLines(SCROLL_TEST_LINE_COUNT);
    $[0] = builtLines;
  } else builtLines = $[0];
  let lines_ = builtLines;
  let fillerBox;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    fillerBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [
        jsxProd_default(Text, {
          dimColor: true,
          children: "\u2500\u2500 scroll test \u2014 disappears when you close the dialog \u2500\u2500",
        }),
        lines_.map(renderScrollTestLine),
      ],
    });
    $[1] = fillerBox;
  } else fillerBox = $[1];
  return fillerBox;
}
//@ chunk-hnxhr3bs.js:24574-26185 placement
/**
 * 滚动测试用的拉丁文填充文本。
 */
var SCROLL_TEST_LOREM =
  "Vivere omnes beate volunt sed ad pervidendum quid sit quod beatam vitam efficiat caligant et adeo non est facile consequi beatam vitam ut eo quisque ab ea longius recedat quo ad illam concitatius fertur si via lapsus est quae ubi in contrarium ducit ipsa velocitas maioris intervalli causa fit proponendum est itaque primum quid sit quod adpetamus tunc circumspiciendum qua contendere illo celerrime possimus intellecturi in ipso itinere si modo rectum erit quantum cotidie profligetur quantoque propius ab eo simus ad quod nos cupiditas naturalis inpellit quam diu quidem passim vagamur non ducem secuti sed fremitum et clamorem dissonum in diversa vocantium conteretur vita inter errores brevis etiam si dies noctesque bonae menti laboremus decernatur itaque et quo tendamus et qua non sine perito aliquo cui explorata sint ea in quae procedimus quoniam quidem non eadem hic quae in ceteris peregrinationibus condicio est in illis comprensus aliquis limes et interrogati incolae non patiuntur errare at hic tritissima quaeque via et celeberrima maxime decipit nihil ergo magis praestandum est quam ne pecorum ritu sequamur antecedentium gregem pergentes non quo eundum est sed quo itur atqui nulla res nos maioribus malis implicat quam quod ad rumorem componimur optima rati ea quae magno adsensu recepta sunt quodque exempla nobis pro bonis multa sunt nec ad rationem sed ad similitudinem vivimus ";
var SCROLL_TEST_LINE_WIDTH = 56;
var SCROLL_TEST_PARAGRAPH_SHAPES = [
  {
    lines: 1,
    indent: 0,
  },
  {
    lines: 5,
    indent: 0,
  },
  {
    lines: 3,
    indent: 2,
  },
  {
    lines: 2,
    indent: 0,
  },
  {
    lines: 7,
    indent: 0,
  },
  {
    lines: 4,
    indent: 2,
  },
  {
    lines: 1,
    indent: 0,
  },
  {
    lines: 6,
    indent: 0,
  },
  {
    lines: 2,
    indent: 2,
  },
  {
    lines: 3,
    indent: 0,
  },
];
//@ chunk-hnxhr3bs.js:26185-26630 placement
/**
 * 用填充文本生成指定行数的滚动测试行，每行带行号。
 */
function buildScrollTestLines(lineCount) {
  let parts = SCROLL_TEST_LOREM.trim().split(/\s+/);
  let numberWidth = String(lineCount).length;
  let lines = [];
  let wordIndex = 0;
  let shapeIndex = 0;
  while (lines.length < lineCount) {
    let shape = SCROLL_TEST_PARAGRAPH_SHAPES[shapeIndex % SCROLL_TEST_PARAGRAPH_SHAPES.length];
    shapeIndex++;
    let indent = " ".repeat(shape.indent);
    for (let idx = 0; idx < shape.lines && lines.length < lineCount; idx++) {
      let targetWidth = idx === shape.lines - 1 ? 12 + ((shapeIndex * 11) % 28) : SCROLL_TEST_LINE_WIDTH;
      let words = [];
      let width = 0;
      while (width < targetWidth) {
        let word = parts[wordIndex % parts.length];
        words.push(word);
        width += word.length + 1;
        wordIndex++;
      }
      lines.push({
        num: String(lines.length + 1).padStart(numberWidth),
        text: words.join(" "),
        indent,
      });
    }
    if (lines.length < lineCount)
      lines.push({
        num: String(lines.length + 1).padStart(numberWidth),
        text: "",
        indent: "",
      });
  }
  return lines;
}
//@ chunk-hnxhr3bs.js:26709-26737 sole-consumer
function createEmptyStore() {
  return createStore([]);
}
//@ chunk-hnxhr3bs.js:26737-26784 sole-consumer
function sumRowsMinusOwed(baseRows, layout) {
  return baseRows + layout.rows() - layout.owed;
}
//@ chunk-hnxhr3bs.js:26784-26818 sole-consumer
function selectVerbose(state) {
  return state.verbose;
}
//@ chunk-hnxhr3bs.js:26818-26833 sole-consumer
function noop() {}
//@ chunk-hnxhr3bs.js:26833-26848 sole-consumer
function noop_2() {}
//@ chunk-hnxhr3bs.js:26848-26872 affinity
function openHyperlink(url) {
  openClickedLink(url);
}
//@ chunk-hnxhr3bs.js:26872-27049 fingerprint (2.1.88 match: _temp3, 0.653)
function repaintFullscreenInk() {
  if (!isFullscreenEnvEnabled()) {
    return;
  }
  let ink = getSecondRootError().get(process.stdout);
  if (!ink) {
    return;
  }
  ink.onHyperlinkClick = openHyperlink;
  return () => {
    ink.onHyperlinkClick = undefined;
    ink.fileHyperlinkOpensInPanel = undefined;
  };
}
//@ chunk-hnxhr3bs.js:27049-27097 layout
function selectUnseenDividerCount(state) {
  return state.unseenDivider?.count ?? 0;
}
//@ chunk-hnxhr3bs.js:27097-27113 layout
var ScrollChromeContextValue; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:27097", () => {
  ScrollChromeContextValue = createContext(null);
});
//@ chunk-hnxhr3bs.js:27113-27304 layout
function useScrollChrome() {
  let chrome = useContext(ScrollChromeContextValue);
  if (!chrome) {
    throw ReferenceError(
      "useScrollChrome cannot be called outside of a <FullscreenLayout /> (it provides ScrollChromeContext to its scrollable slot)",
    );
  }
  return chrome;
}
//@ chunk-hnxhr3bs.js:27304-27400 fingerprint (2.1.88 match: ScrollChromeContext, 0.479)
function ScrollChromeContext() {
  let store = createStore(null);
  return {
    sticky: store,
    chrome: {
      setStickyPrompt: (prompt) => {
        store.setState(() => prompt);
      },
    },
  };
}
//@ chunk-hnxhr3bs.js:27400-27595 layout (2.1.88 match: countUnseenAssistantTurns, 1)
/**
 * 统计未读分隔线之后的助手回合数（跳过 progress 与无可见文本的助手消息）。
 */
function countUnseenAssistantTurns(messages, dividerIndex) {
  let count = 0;
  let prevWasAssistant = false;
  for (let i = dividerIndex; i < messages.length; i++) {
    let m = messages[i];
    if (m.type === "progress") continue;
    if (m.type === "assistant" && !assistantHasVisibleText(m)) continue;
    let isAssistant = m.type === "assistant";
    if (isAssistant && !prevWasAssistant) count++;
    prevWasAssistant = isAssistant;
  }
  return count;
}
//@ chunk-hnxhr3bs.js:27595-27727 file-local
function assistantHasVisibleText(message) {
  if (message.type !== "assistant") return false;
  for (let block of message.message.content) if (block.type === "text" && block.text?.trim()) return true;
  return false;
}
//@ chunk-hnxhr3bs.js:27727-27914 layout
function isThinkingOnlyMessage(message) {
  if (message.type !== "assistant" || message.message.content.length === 0) return false;
  for (let block of message.message.content) {
    if (block.type === "text" || block.type === "tool_use") return false;
    if (isSignedThinkingBlock(block)) return false;
  }
  return true;
}
//@ chunk-hnxhr3bs.js:27914-28265 fingerprint (2.1.88 match: computeUnseenDivider, 0.741)
/**
 * 根据最后一次已读位置计算未读分隔线（位置与计数），跳过 progress/attachment。
 */
function computeUnseenDivider(messages, dividerIndex, skipReinjected) {
  if (dividerIndex === null) return;
  let anchorIdx = dividerIndex;
  let fallbackAnchorIdx = -1;
  while (anchorIdx < messages.length) {
    let message = messages[anchorIdx];
    if (message.type === "progress" || isInvisibleMessage(message)) {
      anchorIdx++;
      continue;
    }
    if (
      skipReinjected &&
      message.type === "attachment" &&
      isReinjectedListingAttachment(message.attachment)
    ) {
      anchorIdx++;
      continue;
    }
    if (skipReinjected && isThinkingOnlyMessage(message)) {
      if (fallbackAnchorIdx === -1) fallbackAnchorIdx = anchorIdx;
      anchorIdx++;
      continue;
    }
    break;
  }
  if (anchorIdx >= messages.length && fallbackAnchorIdx !== -1) anchorIdx = fallbackAnchorIdx;
  let uuid = messages[anchorIdx];
  if (!hasStringUuid(uuid)) return;
  let count = countUnseenAssistantTurns(messages, dividerIndex);
  return {
    firstUnseenUuid: uuid.uuid,
    count: Math.max(1, count),
  };
}
//@ chunk-hnxhr3bs.js:28265-38123 fingerprint (2.1.88 match: FullscreenLayout, 0.482)
/**
 * 全屏布局组件：scrollable 槽（消息列表）放在 ScrollBox 中并提供 ScrollChromeContext；底部 bottom/abovePrompt 槽、可选 sidebar/dock；未读分隔线、"新消息"药丸、置顶提示头、modal/对话框浮层与建议浮层。
 */
function FullscreenLayout(props) {
  let $ = useMemoCache(164);
  let {
    scrollable,
    sidebar,
    sidebarWidth,
    dock,
    dockWidth,
    dockTail,
    top,
    header,
    abovePrompt,
    bottom,
    modal,
    modalScrollViewport,
    scrollViewport,
    unseen,
    hidePill,
    hideSticky,
    transcriptOverlay,
  } = props;
  let sidebarW = sidebarWidth === undefined ? 0 : sidebarWidth;
  let dockW = dockWidth === undefined ? 0 : dockWidth;
  let pillHidden = hidePill === undefined ? false : hidePill;
  let stickyHidden = hideSticky === undefined ? false : hideSticky;
  let terminalSize = useTerminalSize();
  let { rows, columns } = terminalSize;
  let showNotice = header != null && rows >= NOTICE_WIDTH_LIMIT;
  let bodyRows = rows - (showNotice ? MAX_NOTICE_LINES : 0);
  let bodySize;
  if ($[0] !== bodyRows || $[1] !== columns || $[2] !== showNotice || $[3] !== terminalSize) {
    bodySize = showNotice
      ? {
          columns,
          rows: bodyRows,
        }
      : terminalSize;
    $[0] = bodyRows;
    $[1] = columns;
    $[2] = showNotice;
    $[3] = terminalSize;
    $[4] = bodySize;
  } else bodySize = $[4];
  let value = bodySize;
  let modalRows = bodyRows - OVERLAY_BATCH_SIZE - 1;
  let modalContentRef = useRef(null);
  let modalFooterRef = useRef(null);
  let [claimedRows, onClaimRows] = useState(null);
  let hasModalFooter = modal?.footer != null;
  let decstbmEnabled;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    decstbmEnabled = isDecstbmRendererEnabled();
    $[5] = decstbmEnabled;
  } else decstbmEnabled = $[5];
  let decstbm = decstbmEnabled;
  let measureModalFits;
  if ($[6] !== hasModalFooter || $[7] !== claimedRows || $[8] !== modalRows || $[9] !== rows) {
    measureModalFits = () => {
      let contentNode = modalContentRef.current;
      let footerNode = modalFooterRef.current;
      if (
        !hasModalFooter ||
        (!decstbm && (claimedRows === null || claimedRows <= 0)) ||
        contentNode === null ||
        footerNode === null
      ) {
        return true;
      }
      return (
        measureElement(contentNode).height + measureElement(footerNode).height <= (decstbm ? rows : modalRows)
      );
    };
    $[6] = hasModalFooter;
    $[7] = claimedRows;
    $[8] = modalRows;
    $[9] = rows;
    $[10] = measureModalFits;
  } else measureModalFits = $[10];
  let measured = useMeasured(measureModalFits);
  const columns_2 = Math.max(1, columns - sidebarW - dockW);
  let contentSize;
  if ($[11] !== bodyRows || $[12] !== columns_2) {
    contentSize = {
      columns: columns_2,
      rows: bodyRows,
    };
    $[11] = bodyRows;
    $[12] = columns_2;
    $[13] = contentSize;
  } else contentSize = $[13];
  let value_2 = contentSize;
  let dockVisible = dock != null && dockW > 0;
  const columns_3 = Math.max(1, columns - dockW);
  let dockContentSize;
  if ($[14] !== bodyRows || $[15] !== columns_3) {
    dockContentSize = {
      columns: columns_3,
      rows: bodyRows,
    };
    $[14] = bodyRows;
    $[15] = columns_3;
    $[16] = dockContentSize;
  } else dockContentSize = $[16];
  let value_3 = dockContentSize;
  let overlayFlagA = useOverlayFlagA();
  let overlayFlagB = useOverlayFlagB();
  let overlayRows = overlayFlagA || overlayFlagB ? bodyRows - OVERLAY_BATCH_SIZE : Math.floor(bodyRows / 2);
  let promptRef = useRef(null);
  let containerRef = useRef(null);
  let abovePromptRef = useRef(null);
  let promptAreaRef = useRef(null);
  let measurePromptArea;
  if ($[17] === MEMO_CACHE_SENTINEL) {
    measurePromptArea = () =>
      promptAreaRef.current === null ? 0 : measureElement(promptAreaRef.current).height;
    $[17] = measurePromptArea;
  } else measurePromptArea = $[17];
  let measured_2 = useMeasured(measurePromptArea);
  let maxHeight = Math.max(0, overlayRows - measured_2);
  let visible = modal?.visible ?? false;
  let measureAbovePrompt;
  if ($[18] !== overlayRows || $[19] !== visible) {
    measureAbovePrompt = () =>
      visible || promptRef.current === null
        ? null
        : overlayRows -
          measureElement(promptRef.current).height -
          (abovePromptRef.current === null ? 0 : measureElement(abovePromptRef.current).height);
    $[18] = overlayRows;
    $[19] = visible;
    $[20] = measureAbovePrompt;
  } else measureAbovePrompt = $[20];
  let measureRows = measureAbovePrompt;
  let [claimsStore] = useState(createEmptyStore);
  let storeSelector = useStoreSelector(claimsStore);
  let registerClaim;
  if ($[21] !== claimsStore) {
    registerClaim = (claim) => {
      claimsStore.setState((claims) => [...claims, claim]);
      return () => claimsStore.setState((claims) => claims.filter((otherClaim) => otherClaim !== claim));
    };
    $[21] = claimsStore;
    $[22] = registerClaim;
  } else registerClaim = $[22];
  let value_4 = registerClaim;
  let measureWithClaims;
  if ($[23] !== measureRows || $[24] !== storeSelector) {
    measureWithClaims = () => {
      let base = measureRows();
      return base === null ? null : storeSelector.reduce(sumRowsMinusOwed, base);
    };
    $[23] = measureRows;
    $[24] = storeSelector;
    $[25] = measureWithClaims;
  } else measureWithClaims = $[25];
  let value_5 = measureWithClaims;
  let [scrollChrome] = useState(ScrollChromeContext);
  let storeSelector_2 = useStoreSelector(scrollChrome.sticky);
  let value_6 = scrollChrome.chrome;
  let verbose = useAppStateSlice(selectVerbose) ?? false;
  let leftMargin = shouldShowNotice(verbose) ? SPINNER_COLUMN_MIN_WIDTH : 0;
  let subscribeScroll;
  if ($[26] !== scrollViewport || $[27] !== unseen) {
    subscribeScroll = (listener) => {
      let unsubViewport = scrollViewport?.subscribe(listener) ?? noop;
      let unsubUnseen = unseen?.subscribe(listener) ?? noop_2;
      return () => {
        unsubViewport();
        unsubUnseen();
      };
    };
    $[26] = scrollViewport;
    $[27] = unseen;
    $[28] = subscribeScroll;
  } else subscribeScroll = $[28];
  let scrollSubscriber = subscribeScroll;
  let autoScrollSetting;
  if ($[29] === MEMO_CACHE_SENTINEL) {
    autoScrollSetting = resolveSetting("autoScrollEnabled", true);
    $[29] = autoScrollSetting;
  } else autoScrollSetting = $[29];
  let autoScroll = autoScrollSetting.value;
  let computePillVisible;
  if ($[30] !== scrollViewport?.handle || $[31] !== unseen) {
    computePillVisible = () => {
      let handle = scrollViewport?.handle;
      if (!handle) {
        return false;
      }
      if (handle.isSticky()) {
        return false;
      }
      let bottomEdge = handle.getScrollTop() + handle.getPendingDelta() + handle.getViewportHeight();
      let dividerY = unseen?.getSnapshot().dividerY;
      if (dividerY != null) {
        return bottomEdge < dividerY && bottomEdge < handle.getScrollHeight();
      }
      return !autoScroll && bottomEdge < handle.getScrollHeight();
    };
    $[30] = scrollViewport?.handle;
    $[31] = unseen;
    $[32] = computePillVisible;
  } else computePillVisible = $[32];
  let pillVisible = useSyncExternalStore(scrollSubscriber, computePillVisible);
  let count = useStoreSelector(unseen, selectUnseenDividerCount) ?? 0;
  let { clearSelection } = useSelection();
  let clearWhenVisible;
  let clearDeps;
  if ($[33] !== clearSelection || $[34] !== visible) {
    clearWhenVisible = () => {
      if (!visible) {
        return;
      }
      return clearSelection;
    };
    clearDeps = [visible, clearSelection];
    $[33] = clearSelection;
    $[34] = visible;
    $[35] = clearWhenVisible;
    $[36] = clearDeps;
  } else {
    clearWhenVisible = $[35];
    clearDeps = $[36];
  }
  useLayoutEffect(clearWhenVisible, clearDeps);
  let appStore = useContext(appStoreContext);
  let repaintDeps;
  if ($[37] !== appStore) {
    repaintDeps = [appStore];
    $[37] = appStore;
    $[38] = repaintDeps;
  } else repaintDeps = $[38];
  useLayoutEffect(repaintFullscreenInk, repaintDeps);
  if (isFullscreenEnvEnabled()) {
    let sticky = stickyHidden ? null : storeSelector_2;
    let stickyPrompt = sticky != null && sticky !== "clicked" ? sticky : null;
    let hasSticky = sticky != null;
    let headerBox;
    if ($[39] !== header || $[40] !== terminalSize) {
      headerBox =
        header != null &&
        jsxProd_default(Box, {
          flexShrink: 0,
          width: "100%",
          children: jsxProd_default(TerminalSizeContext, {
            value: terminalSize,
            children: header,
          }),
        });
      $[39] = header;
      $[40] = terminalSize;
      $[41] = headerBox;
    } else headerBox = $[41];
    let stickyHeader;
    if ($[42] !== stickyPrompt || $[43] !== leftMargin) {
      stickyHeader =
        stickyPrompt &&
        jsxProd_default(StickyPromptHeader, {
          text: stickyPrompt.text,
          onClick: stickyPrompt.scrollTo,
          leftMargin,
        });
      $[42] = stickyPrompt;
      $[43] = leftMargin;
      $[44] = stickyHeader;
    } else stickyHeader = $[44];
    const ref = scrollViewport?.attach;
    const paddingTop = hasSticky ? 0 : 1;
    let traceRuler;
    if ($[45] === MEMO_CACHE_SENTINEL) {
      traceRuler = jsxProd_default(ScrollTraceRuler, {});
      $[45] = traceRuler;
    } else traceRuler = $[45];
    let children;
    if ($[46] !== value_6 || $[47] !== scrollable) {
      children = jsxProd_default_2(ScrollChromeContextValue, {
        value: value_6,
        children: [scrollable, traceRuler],
      });
      $[46] = value_6;
      $[47] = scrollable;
      $[48] = children;
    } else children = $[48];
    let scrollBox;
    if ($[49] !== ref || $[50] !== paddingTop || $[51] !== children) {
      scrollBox = jsxProd_default(ScrollBoxDefault, {
        ref,
        flexGrow: 1,
        flexDirection: "column",
        paddingTop,
        stickyScroll: true,
        followGrowth: autoScroll,
        children,
      });
      $[49] = ref;
      $[50] = paddingTop;
      $[51] = children;
      $[52] = scrollBox;
    } else scrollBox = $[52];
    let pill;
    if ($[53] !== pillHidden || $[54] !== count || $[55] !== pillVisible || $[56] !== unseen?.jumpToNew) {
      pill =
        !pillHidden &&
        pillVisible &&
        jsxProd_default(NewMessagesPill, {
          count,
          onClick: unseen?.jumpToNew,
        });
      $[53] = pillHidden;
      $[54] = count;
      $[55] = pillVisible;
      $[56] = unseen?.jumpToNew;
      $[57] = pill;
    } else pill = $[57];
    const value_7 = stickyPrompt ? 1 : 0;
    let transcriptSlot;
    if ($[58] !== value_7 || $[59] !== transcriptOverlay) {
      transcriptSlot = jsxProd_default(TranscriptOverlaySlot, {
        value: value_7,
        children: transcriptOverlay,
      });
      $[58] = value_7;
      $[59] = transcriptOverlay;
      $[60] = transcriptSlot;
    } else transcriptSlot = $[60];
    let children_2;
    if (
      $[61] !== stickyHeader ||
      $[62] !== scrollBox ||
      $[63] !== pill ||
      $[64] !== transcriptSlot ||
      $[65] !== top
    ) {
      children_2 = jsxProd_default_2(Box, {
        flexGrow: 1,
        flexDirection: "column",
        overflow: "hidden",
        children: [top, stickyHeader, scrollBox, pill, transcriptSlot, false, false],
      });
      $[61] = stickyHeader;
      $[62] = scrollBox;
      $[63] = pill;
      $[64] = transcriptSlot;
      $[65] = top;
      $[66] = children_2;
    } else children_2 = $[66];
    let mainColumn;
    if ($[67] !== value_2 || $[68] !== children_2) {
      mainColumn = jsxProd_default(TerminalSizeContext, {
        value: value_2,
        children: children_2,
      });
      $[67] = value_2;
      $[68] = children_2;
      $[69] = mainColumn;
    } else mainColumn = $[69];
    let sidebarBox;
    if ($[70] !== sidebar || $[71] !== sidebarW) {
      sidebarBox =
        sidebar != null &&
        (sidebarW > 0
          ? jsxProd_default(Box, {
              width: sidebarW,
              flexShrink: 0,
              flexDirection: "column",
              overflow: "hidden",
              backgroundColor: "composerSidebarBackground",
              children: sidebar,
            })
          : sidebar);
      $[70] = sidebar;
      $[71] = sidebarW;
      $[72] = sidebarBox;
    } else sidebarBox = $[72];
    let mainRow;
    if ($[73] !== mainColumn || $[74] !== sidebarBox) {
      mainRow = jsxProd_default_2(Box, {
        flexGrow: 1,
        flexDirection: "row",
        overflow: "hidden",
        children: [mainColumn, sidebarBox],
      });
      $[73] = mainColumn;
      $[74] = sidebarBox;
      $[75] = mainRow;
    } else mainRow = $[75];
    const display = visible ? "none" : "flex";
    let children_3;
    if ($[76] !== abovePrompt || $[77] !== value_5) {
      children_3 = jsxProd_default(Box, {
        ref: abovePromptRef,
        flexDirection: "column",
        flexShrink: 0,
        width: "100%",
        children: jsxProd_default(ContextSlotA, {
          value: value_5,
          children: abovePrompt,
        }),
      });
      $[76] = abovePrompt;
      $[77] = value_5;
      $[78] = children_3;
    } else children_3 = $[78];
    let children_4;
    if ($[79] !== overlayRows || $[80] !== display || $[81] !== children_3) {
      children_4 = jsxProd_default(Box, {
        ref: promptAreaRef,
        flexDirection: "column",
        flexShrink: 0,
        width: "100%",
        maxHeight: overlayRows,
        overflowY: "hidden",
        display,
        children: children_3,
      });
      $[79] = overlayRows;
      $[80] = display;
      $[81] = children_3;
      $[82] = children_4;
    } else children_4 = $[82];
    let abovePromptBox;
    if ($[83] !== value_3 || $[84] !== children_4) {
      abovePromptBox = jsxProd_default(TerminalSizeContext, {
        value: value_3,
        children: children_4,
      });
      $[83] = value_3;
      $[84] = children_4;
      $[85] = abovePromptBox;
    } else abovePromptBox = $[85];
    let bodyBox;
    if ($[86] !== mainRow || $[87] !== abovePromptBox) {
      bodyBox = jsxProd_default_2(Box, {
        flexGrow: 1,
        flexDirection: "column",
        overflow: "hidden",
        children: [mainRow, abovePromptBox],
      });
      $[86] = mainRow;
      $[87] = abovePromptBox;
      $[88] = bodyBox;
    } else bodyBox = $[88];
    let dockBox;
    if ($[89] !== dock || $[90] !== dockW || $[91] !== dockVisible) {
      dockBox =
        dock != null &&
        jsxProd_default(Box, {
          width: dockW,
          flexShrink: 0,
          flexDirection: "column",
          overflow: "hidden",
          display: dockVisible ? "flex" : "none",
          children: dock,
        });
      $[89] = dock;
      $[90] = dockW;
      $[91] = dockVisible;
      $[92] = dockBox;
    } else dockBox = $[92];
    let bodyRow;
    if ($[93] !== bodyBox || $[94] !== dockBox) {
      bodyRow = jsxProd_default_2(Box, {
        flexGrow: 1,
        flexDirection: "row",
        overflow: "hidden",
        children: [bodyBox, dockBox],
      });
      $[93] = bodyBox;
      $[94] = dockBox;
      $[95] = bodyRow;
    } else bodyRow = $[95];
    const display_2 = visible ? "none" : "flex";
    const value_8 = dockVisible ? dockW : 0;
    let children_5;
    if ($[96] !== bottom || $[97] !== value_8) {
      children_5 = jsxProd_default(FooterSlot, {
        value: value_8,
        children: bottom,
      });
      $[96] = bottom;
      $[97] = value_8;
      $[98] = children_5;
    } else children_5 = $[98];
    let children_6;
    if ($[99] !== value_4 || $[100] !== children_5) {
      children_6 = jsxProd_default(contextSlot, {
        value: value_4,
        children: children_5,
      });
      $[99] = value_4;
      $[100] = children_5;
      $[101] = children_6;
    } else children_6 = $[101];
    let promptColumn;
    if ($[102] !== measureRows || $[103] !== children_6) {
      promptColumn = jsxProd_default(Box, {
        ref: promptRef,
        flexDirection: "column",
        width: "100%",
        flexGrow: 1,
        flexShrink: 0,
        overflowY: "hidden",
        children: jsxProd_default(ContextSlotA, {
          value: measureRows,
          children: children_6,
        }),
      });
      $[102] = measureRows;
      $[103] = children_6;
      $[104] = promptColumn;
    } else promptColumn = $[104];
    let dockTailBox;
    if ($[105] !== dockTail || $[106] !== dockW || $[107] !== dockVisible) {
      dockTailBox =
        dockVisible &&
        jsxProd_default(DialogOverlay, {
          width: dockW,
          children: dockTail,
        });
      $[105] = dockTail;
      $[106] = dockW;
      $[107] = dockVisible;
      $[108] = dockTailBox;
    } else dockTailBox = $[108];
    let suggestionsBox;
    if ($[109] !== measured_2) {
      suggestionsBox = jsxProd_default(SuggestionsOverlay, {
        rowsAbove: measured_2,
      });
      $[109] = measured_2;
      $[110] = suggestionsBox;
    } else suggestionsBox = $[110];
    let promptArea;
    if (
      $[111] !== maxHeight ||
      $[112] !== display_2 ||
      $[113] !== promptColumn ||
      $[114] !== dockTailBox ||
      $[115] !== suggestionsBox
    ) {
      promptArea = jsxProd_default_2(Box, {
        ref: containerRef,
        flexDirection: "column",
        flexShrink: 0,
        width: "100%",
        maxHeight,
        display: display_2,
        children: [promptColumn, dockTailBox, suggestionsBox],
      });
      $[111] = maxHeight;
      $[112] = display_2;
      $[113] = promptColumn;
      $[114] = dockTailBox;
      $[115] = suggestionsBox;
      $[116] = promptArea;
    } else promptArea = $[116];
    let modalOverlay;
    if (
      $[117] !== bodyRows ||
      $[118] !== columns ||
      $[119] !== modal ||
      $[120] !== measured ||
      $[121] !== modalRows ||
      $[122] !== modalScrollViewport ||
      $[123] !== visible
    ) {
      modalOverlay =
        modal != null &&
        jsxProd_default(scrollViewportContext, {
          value: {
            rows: modalRows,
            columns: columns - 2 * PANE_WIDTH_RESERVE,
            scrollViewport: modalScrollViewport ?? null,
            claimScrollBox: null,
          },
          children: jsxProd_default_2(Box, {
            flexShrink: 0,
            width: "100%",
            maxHeight: bodyRows - OVERLAY_BATCH_SIZE,
            flexDirection: "column",
            overflow: "hidden",
            display: visible ? "flex" : "none",
            children: [
              jsxProd_default_2(Box, {
                flexShrink: 0,
                flexDirection: "row",
                height: 1,
                overflow: "hidden",
                children: [
                  jsxProd_default(Box, {
                    flexGrow: 1,
                    flexShrink: 1,
                    overflow: "hidden",
                    children: jsxProd_default(Divider, {
                      color: "permission",
                      char: "\u2594",
                    }),
                  }),
                  jsxProd_default(useHasVisibleNotification, {}),
                ],
              }),
              jsxProd_default(Box, {
                flexDirection: "column",
                flexShrink: 1,
                overflow: "hidden",
                children: jsxProd_default(Box, {
                  ref: modalContentRef,
                  flexDirection: "column",
                  flexShrink: 0,
                  children: jsxProd_default(useUnseenDivider, {
                    scrollViewport: modalScrollViewport,
                    maxRows: modalRows,
                    onClaim: onClaimRows,
                    children: modal.content,
                  }),
                }),
              }),
              jsxProd_default(Box, {
                flexDirection: "column",
                flexShrink: 0,
                overflow: "hidden",
                height: measured ? undefined : 0,
                children: jsxProd_default(Box, {
                  ref: modalFooterRef,
                  flexDirection: "column",
                  flexShrink: 0,
                  children: modal.footer,
                }),
              }),
            ],
          }),
        });
      $[117] = bodyRows;
      $[118] = columns;
      $[119] = modal;
      $[120] = measured;
      $[121] = modalRows;
      $[122] = modalScrollViewport;
      $[123] = visible;
      $[124] = modalOverlay;
    } else modalOverlay = $[124];
    let layoutContent;
    if ($[125] !== headerBox || $[126] !== bodyRow || $[127] !== promptArea || $[128] !== modalOverlay) {
      layoutContent = jsxProd_default_2(FullscreenSlotsProvider, {
        container: containerRef,
        children: [headerBox, bodyRow, promptArea, modalOverlay],
      });
      $[125] = headerBox;
      $[126] = bodyRow;
      $[127] = promptArea;
      $[128] = modalOverlay;
      $[129] = layoutContent;
    } else layoutContent = $[129];
    let children_7 = layoutContent;
    const value_9 = showNotice ? rows : null;
    let children_8;
    if ($[130] !== value || $[131] !== children_7) {
      children_8 = jsxProd_default(TerminalSizeContext, {
        value,
        children: children_7,
      });
      $[130] = value;
      $[131] = children_7;
      $[132] = children_8;
    } else children_8 = $[132];
    let noticeSlot;
    if ($[133] !== value_9 || $[134] !== children_8) {
      noticeSlot = jsxProd_default(noticeDialogSlot, {
        value: value_9,
        children: children_8,
      });
      $[133] = value_9;
      $[134] = children_8;
      $[135] = noticeSlot;
    } else noticeSlot = $[135];
    return noticeSlot;
  }
  if (isDecstbmRendererEnabled()) {
    let traceRuler;
    if ($[136] === MEMO_CACHE_SENTINEL) {
      traceRuler = jsxProd_default(ScrollTraceRuler, {});
      $[136] = traceRuler;
    } else traceRuler = $[136];
    let scrollable_2;
    if ($[137] !== value_6 || $[138] !== scrollable) {
      scrollable_2 = jsxProd_default_2(ScrollChromeContextValue, {
        value: value_6,
        children: [scrollable, traceRuler],
      });
      $[137] = value_6;
      $[138] = scrollable;
      $[139] = scrollable_2;
    } else scrollable_2 = $[139];
    let suggestionsBox;
    if ($[140] === MEMO_CACHE_SENTINEL) {
      suggestionsBox = jsxProd_default(SuggestionsOverlay, {});
      $[140] = suggestionsBox;
    } else suggestionsBox = $[140];
    let bottom_2;
    if ($[141] !== abovePrompt || $[142] !== bottom) {
      bottom_2 = jsxProd_default_2(Box, {
        ref: containerRef,
        flexDirection: "column",
        width: "100%",
        children: [abovePrompt, bottom, suggestionsBox],
      });
      $[141] = abovePrompt;
      $[142] = bottom;
      $[143] = bottom_2;
    } else bottom_2 = $[143];
    let overlay;
    if (
      $[144] !== columns ||
      $[145] !== modal ||
      $[146] !== measured ||
      $[147] !== modalRows ||
      $[148] !== modalScrollViewport
    ) {
      overlay =
        modal != null
          ? jsxProd_default(scrollViewportContext, {
              value: {
                rows: modalRows,
                columns: columns - 2 * PANE_WIDTH_RESERVE,
                scrollViewport: modalScrollViewport ?? null,
                claimScrollBox: null,
              },
              children: jsxProd_default_2(Box, {
                flexDirection: "column",
                children: [
                  jsxProd_default(Box, {
                    ref: modalContentRef,
                    flexDirection: "column",
                    paddingX: PANE_WIDTH_RESERVE,
                    children: modal.content,
                  }),
                  jsxProd_default(Box, {
                    flexDirection: "column",
                    flexShrink: 0,
                    overflow: "hidden",
                    height: measured ? undefined : 0,
                    children: jsxProd_default(Box, {
                      ref: modalFooterRef,
                      flexDirection: "column",
                      flexShrink: 0,
                      children: modal.footer,
                    }),
                  }),
                ],
              }),
            })
          : null;
      $[144] = columns;
      $[145] = modal;
      $[146] = measured;
      $[147] = modalRows;
      $[148] = modalScrollViewport;
      $[149] = overlay;
    } else overlay = $[149];
    let legacyLayout;
    if ($[150] !== scrollViewport || $[151] !== scrollable_2 || $[152] !== bottom_2 || $[153] !== overlay) {
      legacyLayout = jsxProd_default(FullscreenSlotsProvider, {
        container: containerRef,
        children: jsxProd_default(FullscreenLayoutView, {
          scrollViewport,
          scrollable: scrollable_2,
          bottom: bottom_2,
          overlay,
        }),
      });
      $[150] = scrollViewport;
      $[151] = scrollable_2;
      $[152] = bottom_2;
      $[153] = overlay;
      $[154] = legacyLayout;
    } else legacyLayout = $[154];
    return legacyLayout;
  }
  let chromeProvider;
  if ($[155] !== value_6 || $[156] !== scrollable) {
    chromeProvider = jsxProd_default(ScrollChromeContextValue, {
      value: value_6,
      children: scrollable,
    });
    $[155] = value_6;
    $[156] = scrollable;
    $[157] = chromeProvider;
  } else chromeProvider = $[157];
  const content = modal?.content;
  const footer = modal?.footer;
  let plainLayout;
  if (
    $[158] !== abovePrompt ||
    $[159] !== bottom ||
    $[160] !== chromeProvider ||
    $[161] !== content ||
    $[162] !== footer
  ) {
    plainLayout = jsxProd_default_2(Fragment, {
      children: [chromeProvider, abovePrompt, bottom, content, footer],
    });
    $[158] = abovePrompt;
    $[159] = bottom;
    $[160] = chromeProvider;
    $[161] = content;
    $[162] = footer;
    $[163] = plainLayout;
  } else plainLayout = $[163];
  return plainLayout;
}
//@ chunk-hnxhr3bs.js:38123-38486 layout
function useHasVisibleNotification() {
  let $ = useMemoCache(3);
  let headerGauge = useHeaderGauge();
  let selectHasHeldNotice;
  if ($[0] !== headerGauge) {
    selectHasHeldNotice = (appState) =>
      isHeldNotice(appState.notifications.current, holdsToasts(appState)) &&
      !isGaugeSurface(appState.notifications.current, headerGauge);
    $[0] = headerGauge;
    $[1] = selectHasHeldNotice;
  } else selectHasHeldNotice = $[1];
  if (useAppStateSlice(selectHasHeldNotice) !== true) {
    return null;
  }
  let toastRow;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    toastRow = jsxProd_default_2(Box, {
      flexShrink: 0,
      maxWidth: "100%",
      overflow: "hidden",
      children: [
        jsxProd_default(Text, {
          children: " ",
        }),
        jsxProd_default(PromptToast, {}),
        jsxProd_default(Text, {
          color: "permission",
          children: " \u2594",
        }),
      ],
    });
    $[2] = toastRow;
  } else toastRow = $[2];
  return toastRow;
}
//@ chunk-hnxhr3bs.js:38486-42194 file-local
/**
 * 管理未读分隔线：用户向上滚动后记录 dividerIndex，响应 down/pageup/pagedown/home 等按键，回到底部时清除。
 */
function useUnseenDivider(messageCount) {
  let $ = useMemoCache(46);
  let { scrollViewport, maxRows, onClaim, children } = messageCount;
  let dividerYRef = useContext(scrollViewportContext);
  let handleRef = useRef(null);
  let [claimedHeight, setClaimedHeight] = useState(null);
  let claimScrollBox;
  if ($[0] !== onClaim) {
    claimScrollBox = (handle) => {
      handleRef.current = handle;
      setClaimedHeight(handle);
      onClaim?.(handle);
    };
    $[0] = onClaim;
    $[1] = claimScrollBox;
  } else claimScrollBox = $[1];
  let claimScrollBox_2 = claimScrollBox;
  let hasClaim = claimedHeight !== null;
  let availableRows = maxRows - (claimedHeight ?? 0);
  let scrollBoxRef = useRef(null);
  let attachViewport;
  if ($[2] !== scrollViewport) {
    attachViewport = () => {
      if (scrollViewport && handleRef.current === null) {
        return scrollViewport.attach(scrollBoxRef.current);
      }
    };
    $[2] = scrollViewport;
    $[3] = attachViewport;
  } else attachViewport = $[3];
  useLayoutEffect(attachViewport);
  let initialOverflow;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    initialOverflow = {
      overflows: false,
      above: false,
      below: false,
      hintTop: 0,
      hintBottom: 0,
    };
    $[4] = initialOverflow;
  } else initialOverflow = $[4];
  let [overflow, setOverflow] = useState(initialOverflow);
  let updateOverflow;
  if ($[5] !== availableRows || $[6] !== scrollViewport?.handle) {
    updateOverflow = () => {
      let handle = scrollViewport?.handle;
      if (!handle) {
        return;
      }
      let freshScrollHeight = handle.getFreshScrollHeight();
      let viewportHeight = handle.getViewportHeight() || availableRows;
      let boxViewportTop = scrollBoxRef.current?.getViewportTop() ?? 0;
      let boxViewportHeight = scrollBoxRef.current?.getViewportHeight() ?? 0;
      let max = Math.max(0, handle.getViewportTop() - boxViewportTop);
      let max_2 = Math.max(0, boxViewportHeight - max - viewportHeight);
      let effectiveRows = handleRef.current !== null ? viewportHeight : availableRows;
      let overflows = freshScrollHeight > effectiveRows;
      let scrollTop = handle.getScrollTop() + handle.getPendingDelta();
      let hasMore = freshScrollHeight - effectiveRows > 2;
      let hasAbove = hasMore && scrollTop > 0;
      let hasBelow = hasMore && scrollTop < freshScrollHeight - viewportHeight;
      setOverflow((handle_0) =>
        handle_0.overflows === overflows &&
        handle_0.above === hasAbove &&
        handle_0.below === hasBelow &&
        handle_0.hintTop === max &&
        handle_0.hintBottom === max_2
          ? handle_0
          : {
              overflows,
              above: hasAbove,
              below: hasBelow,
              hintTop: max,
              hintBottom: max_2,
            },
      );
    };
    $[5] = availableRows;
    $[6] = scrollViewport?.handle;
    $[7] = updateOverflow;
  } else updateOverflow = $[7];
  let recomputeOverflow = updateOverflow;
  let boxRef = useRef(null);
  let activeElementRef = useRef(null);
  let { focusManager } = useContext(APP_CONTEXT);
  let restoreFocus;
  if ($[8] !== focusManager) {
    restoreFocus = () => {
      let boxNode = boxRef.current;
      if (!boxNode || !focusManager) {
        return;
      }
      for (
        let activeElement = focusManager.activeElement ?? undefined;
        activeElement;
        activeElement = activeElement.parentNode
      ) {
        if (activeElement === boxNode) {
          activeElementRef.current = focusManager.activeElement;
          return;
        }
      }
      let previousActive = activeElementRef.current;
      for (let node = previousActive ?? undefined; node; node = node.parentNode) {
        if (node === boxNode) {
          focusManager.focus(previousActive);
          return;
        }
      }
      focusManager.focus(boxNode);
    };
    $[8] = focusManager;
    $[9] = restoreFocus;
  } else restoreFocus = $[9];
  let restoreFocusEffect = restoreFocus;
  let focusDeps;
  if ($[10] !== restoreFocusEffect) {
    focusDeps = [restoreFocusEffect];
    $[10] = restoreFocusEffect;
    $[11] = focusDeps;
  } else focusDeps = $[11];
  useEffect(restoreFocusEffect, focusDeps);
  let subscribeEffect;
  let subscribeDeps;
  if ($[12] !== recomputeOverflow || $[13] !== scrollViewport) {
    subscribeEffect = () => {
      recomputeOverflow();
      return scrollViewport?.subscribe(recomputeOverflow);
    };
    subscribeDeps = [recomputeOverflow, scrollViewport];
    $[12] = recomputeOverflow;
    $[13] = scrollViewport;
    $[14] = subscribeEffect;
    $[15] = subscribeDeps;
  } else {
    subscribeEffect = $[14];
    subscribeDeps = $[15];
  }
  useEffect(subscribeEffect, subscribeDeps);
  let pollTick;
  if ($[16] !== recomputeOverflow || $[17] !== restoreFocusEffect) {
    pollTick = () => {
      recomputeOverflow();
      restoreFocusEffect();
    };
    $[16] = recomputeOverflow;
    $[17] = restoreFocusEffect;
    $[18] = pollTick;
  } else pollTick = $[18];
  useInterval(pollTick, 50);
  const rows = dividerYRef?.rows ?? maxRows;
  const columns = dividerYRef?.columns ?? 0;
  const scrollViewport_2 = scrollViewport ?? null;
  let contextValue;
  if ($[19] !== claimScrollBox_2 || $[20] !== rows || $[21] !== columns || $[22] !== scrollViewport_2) {
    contextValue = {
      rows,
      columns,
      scrollViewport: scrollViewport_2,
      claimScrollBox: claimScrollBox_2,
    };
    $[19] = claimScrollBox_2;
    $[20] = rows;
    $[21] = columns;
    $[22] = scrollViewport_2;
    $[23] = contextValue;
  } else contextValue = $[23];
  let value = contextValue;
  let onKeyDown;
  if ($[24] !== availableRows || $[25] !== scrollViewport?.handle) {
    onKeyDown = (idx) => {
      if (idx.defaultPrevented || idx.ctrl || idx.meta || idx.shift) {
        return;
      }
      let handle = scrollViewport?.handle;
      if (!handle) {
        return;
      }
      let freshScrollHeight = handle.getFreshScrollHeight();
      let viewportHeight = handle.getViewportHeight() || availableRows;
      let effectiveRows = handleRef.current !== null ? viewportHeight : availableRows;
      if (freshScrollHeight <= effectiveRows) {
        return;
      }
      if (idx.key === "up" || idx.key === "down") {
        handle.scrollBy(idx.key === "down" ? 1 : -1);
        idx.preventDefault();
      } else if (idx.key === "pageup" || idx.key === "pagedown") {
        let max = Math.max(1, effectiveRows);
        handle.scrollBy(idx.key === "pagedown" ? max : -max);
        idx.preventDefault();
      } else if (idx.key === "home") {
        handle.scrollTo(0);
        idx.preventDefault();
      } else if (idx.key === "end") {
        handle.scrollToBottom();
        idx.preventDefault();
      }
    };
    $[24] = availableRows;
    $[25] = scrollViewport?.handle;
    $[26] = onKeyDown;
  } else onKeyDown = $[26];
  const height = !hasClaim && overflow.overflows ? availableRows : undefined;
  let children_2;
  if ($[27] !== children) {
    children_2 = jsxProd_default(Box, {
      flexDirection: "column",
      paddingX: PANE_WIDTH_RESERVE,
      flexShrink: 0,
      children,
    });
    $[27] = children;
    $[28] = children_2;
  } else children_2 = $[28];
  let scrollBox;
  if ($[29] !== height || $[30] !== children_2) {
    scrollBox = jsxProd_default(ScrollBoxDefault, {
      ref: scrollBoxRef,
      flexDirection: "column",
      flexShrink: 0,
      height,
      stickyScroll: false,
      children: children_2,
    });
    $[29] = height;
    $[30] = children_2;
    $[31] = scrollBox;
  } else scrollBox = $[31];
  let aboveHint;
  if ($[32] !== overflow.above || $[33] !== overflow.hintTop) {
    aboveHint =
      overflow.above &&
      jsxProd_default(Box, {
        position: "absolute",
        top: overflow.hintTop,
        right: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: figures_default.arrowUp,
        }),
      });
    $[32] = overflow.above;
    $[33] = overflow.hintTop;
    $[34] = aboveHint;
  } else aboveHint = $[34];
  let belowHint;
  if ($[35] !== overflow.below || $[36] !== overflow.hintBottom) {
    belowHint =
      overflow.below &&
      jsxProd_default(Box, {
        position: "absolute",
        bottom: overflow.hintBottom,
        right: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: figures_default.arrowDown,
        }),
      });
    $[35] = overflow.below;
    $[36] = overflow.hintBottom;
    $[37] = belowHint;
  } else belowHint = $[37];
  let children_3;
  if ($[38] !== onKeyDown || $[39] !== scrollBox || $[40] !== aboveHint || $[41] !== belowHint) {
    children_3 = jsxProd_default_2(Box, {
      ref: boxRef,
      flexDirection: "column",
      flexShrink: 0,
      onKeyDown,
      children: [scrollBox, aboveHint, belowHint],
    });
    $[38] = onKeyDown;
    $[39] = scrollBox;
    $[40] = aboveHint;
    $[41] = belowHint;
    $[42] = children_3;
  } else children_3 = $[42];
  let root;
  if ($[43] !== value || $[44] !== children_3) {
    root = jsxProd_default(scrollViewportContext, {
      value,
      children: children_3,
    });
    $[43] = value;
    $[44] = children_3;
    $[45] = root;
  } else root = $[45];
  return root;
}
//@ chunk-hnxhr3bs.js:42194-42236 layout
var JUMP_TO_BOTTOM_CHORD; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PAGE_DOWN_CHORD;
deferInit("chunk-hnxhr3bs.js:42194", () => {
  JUMP_TO_BOTTOM_CHORD = parseChord("ctrl+end");
  PAGE_DOWN_CHORD = parseChord("pagedown");
});
//@ chunk-hnxhr3bs.js:42236-43674 fingerprint (2.1.88 match: NewMessagesPill, 0.608)
/**
 * "新消息"药丸：不在底部且有未读时显示 "Jump to bottom"，点击或 scroll:bottom 快捷键跳到底部。
 */
function NewMessagesPill(props) {
  let $ = useMemoCache(20);
  let { count, onClick } = props;
  let [hover, setHover] = useState(false);
  let { columns } = useTerminalSize();
  let jumpChord;
  let platform;
  let pageDownChord;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    platform = getShortcutDisplayPlatform();
    jumpChord = chordToDisplayString(JUMP_TO_BOTTOM_CHORD, platform);
    pageDownChord = chordToDisplayString(PAGE_DOWN_CHORD, platform);
    $[0] = jumpChord;
    $[1] = platform;
    $[2] = pageDownChord;
  } else {
    jumpChord = $[0];
    platform = $[1];
    pageDownChord = $[2];
  }
  let pageDownChord_2 = pageDownChord;
  let shortcutDisplay = useShortcutDisplay("scroll:bottom", "Scroll", jumpChord);
  let shortcutDisplay_2 = useShortcutDisplay("scroll:pageDown", "Scroll", pageDownChord_2);
  let hasBeenObserved = useSyncExternalStore(subscribeFullscreenObserved, hasFullscreenBeenObserved);
  let label;
  if ($[3] !== count) {
    label = count > 0 ? `${count} new ${plural(count, "message")}` : "Jump to bottom";
    $[3] = count;
    $[4] = label;
  } else label = $[4];
  let label_2 = label;
  let isMac = platform === "macos" && (shortcutDisplay === "" || shortcutDisplay === jumpChord);
  let mouseFull = isMouseTrackingEnabled() === "full" && hasBeenObserved;
  let pageDownHint =
    shortcutDisplay_2 === pageDownChord_2 ? `fn+${figures_default.arrowDown}` : shortcutDisplay_2;
  let fullLabel;
  if (isMac && mouseFull) fullLabel = `${label_2} (click) ${figures_default.arrowDown}`;
  else if (isMac && pageDownHint) fullLabel = `${label_2}: ${pageDownHint} to scroll`;
  else if (shortcutDisplay) fullLabel = `${label_2} (${shortcutDisplay}) ${figures_default.arrowDown}`;
  else fullLabel = `${label_2} ${figures_default.arrowDown}`;
  let availableWidth = columns - 2;
  const shortLabel = `${label_2} ${figures_default.arrowDown}`;
  let label_3;
  if ($[5] !== availableWidth || $[6] !== fullLabel || $[7] !== label_2 || $[8] !== shortLabel) {
    let candidates = [fullLabel, shortLabel, label_2];
    label_3 = candidates.find((candidate) => bunStringWidth(candidate) <= availableWidth) ?? label_2;
    $[5] = availableWidth;
    $[6] = fullLabel;
    $[7] = label_2;
    $[8] = shortLabel;
    $[9] = label_3;
  } else label_3 = $[9];
  let children = label_3;
  let onClick_2;
  if ($[10] !== onClick) {
    onClick_2 = () => {
      countJumpToBottom();
      onClick?.();
    };
    $[10] = onClick;
    $[11] = onClick_2;
  } else onClick_2 = $[11];
  let onMouseEnter;
  let onMouseLeave;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => setHover(true);
    onMouseLeave = () => setHover(false);
    $[12] = onMouseEnter;
    $[13] = onMouseLeave;
  } else {
    onMouseEnter = $[12];
    onMouseLeave = $[13];
  }
  const color = hover ? "userMessageBackgroundHover" : "userMessageBackground";
  let children_2;
  if ($[14] !== color || $[15] !== children) {
    children_2 = jsxProd_default(TagTabs, {
      color,
      textColor: "text",
      padded: true,
      wrap: "truncate-end",
      children,
    });
    $[14] = color;
    $[15] = children;
    $[16] = children_2;
  } else children_2 = $[16];
  let pill;
  if ($[17] !== onClick_2 || $[18] !== children_2) {
    pill = jsxProd_default(Box, {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      justifyContent: "center",
      children: jsxProd_default(Box, {
        noSelect: true,
        onClick: onClick_2,
        onMouseEnter,
        onMouseLeave,
        children: children_2,
      }),
    });
    $[17] = onClick_2;
    $[18] = children_2;
    $[19] = pill;
  } else pill = $[19];
  return pill;
}
//@ chunk-hnxhr3bs.js:43674-44422 fingerprint (2.1.88 match: StickyPromptHeader, 0.796)
/**
 * 全屏滚动时置顶显示当前可见区域对应的用户提示（StickyPromptHeader）。
 */
function StickyPromptHeader(props) {
  let $ = useMemoCache(13);
  let { text, onClick, leftMargin } = props;
  let [hover, setHover] = useState(false);
  let gutter;
  if ($[0] !== leftMargin) {
    gutter =
      leftMargin > 0 &&
      jsxProd_default(NoSelect, {
        fromLeftEdge: true,
        minWidth: leftMargin,
      });
    $[0] = leftMargin;
    $[1] = gutter;
  } else gutter = $[1];
  const backgroundColor = hover ? "userMessageBackgroundHover" : "userMessageBackground";
  let onMouseEnter;
  let onMouseLeave;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => setHover(true);
    onMouseLeave = () => setHover(false);
    $[2] = onMouseEnter;
    $[3] = onMouseLeave;
  } else {
    onMouseEnter = $[2];
    onMouseLeave = $[3];
  }
  let children;
  if ($[4] !== text) {
    children = jsxProd_default_2(Text, {
      color: "subtle",
      wrap: "truncate-end",
      children: [figures_default.pointer, " ", text],
    });
    $[4] = text;
    $[5] = children;
  } else children = $[5];
  let promptBox;
  if ($[6] !== onClick || $[7] !== backgroundColor || $[8] !== children) {
    promptBox = jsxProd_default(Box, {
      flexGrow: 1,
      paddingRight: 1,
      backgroundColor,
      onClick,
      onMouseEnter,
      onMouseLeave,
      children,
    });
    $[6] = onClick;
    $[7] = backgroundColor;
    $[8] = children;
    $[9] = promptBox;
  } else promptBox = $[9];
  let header;
  if ($[10] !== gutter || $[11] !== promptBox) {
    header = jsxProd_default_2(Box, {
      flexShrink: 0,
      width: "100%",
      height: 1,
      flexDirection: "row",
      children: [gutter, promptBox],
    });
    $[10] = gutter;
    $[11] = promptBox;
    $[12] = header;
  } else header = $[12];
  return header;
}
//@ chunk-hnxhr3bs.js:44422-44692 fingerprint (2.1.88 match: DialogOverlay, 0.554)
function DialogOverlay(props) {
  let $ = useMemoCache(4);
  let { width, children } = props;
  let node = useAnchorTopMargin();
  let t0;
  if ($[0] !== children || $[1] !== node || $[2] !== width) {
    t0 =
      node > 0
        ? jsxProd_default(Box, {
            position: "absolute",
            top: 0,
            right: 0,
            width,
            height: node,
            flexDirection: "column",
            overflow: "hidden",
            opaque: true,
            children,
          })
        : null;
    $[0] = children;
    $[1] = node;
    $[2] = width;
    $[3] = t0;
  } else t0 = $[3];
  return t0;
}
//@ chunk-hnxhr3bs.js:44692-45539 fingerprint (2.1.88 match: SuggestionsOverlay, 0.783)
function SuggestionsOverlay(props) {
  let $ = useMemoCache(10);
  let { rowsAbove } = props;
  let rowsAboveValue = rowsAbove === undefined ? 0 : rowsAbove;
  let data = useFullscreenSlotData();
  let fullscreenSlotDialog = useFullscreenSlotDialog();
  let anchorTopMargin = useAnchorTopMargin();
  let marginBottom = rowsAboveValue > 0 ? rowsAboveValue : -anchorTopMargin;
  let hasSuggestions = data !== null && (data.suggestions.length > 0 || !!data.emptyMessage);
  let suggestionsBox;
  if ($[0] !== data || $[1] !== marginBottom || $[2] !== hasSuggestions) {
    suggestionsBox =
      hasSuggestions &&
      jsxProd_default(Box, {
        position: "absolute",
        bottom: "100%",
        marginBottom,
        left: 0,
        right: 0,
        paddingX: 2,
        paddingTop: 1,
        flexDirection: "column",
        opaque: true,
        children: jsxProd_default(FooterSuggestionsMemo, {
          suggestions: data.suggestions,
          selectedSuggestion: data.selectedSuggestion,
          maxColumnWidth: data.maxColumnWidth,
          emptyMessage: data.emptyMessage,
          hoveredId: data.hoveredId,
          onSelect: data.onSelect,
          onHoverChange: data.onHoverChange,
          overlay: true,
          noPad: true,
        }),
      });
    $[0] = data;
    $[1] = marginBottom;
    $[2] = hasSuggestions;
    $[3] = suggestionsBox;
  } else suggestionsBox = $[3];
  let dialogBox;
  if ($[4] !== fullscreenSlotDialog || $[5] !== marginBottom) {
    dialogBox = fullscreenSlotDialog
      ? jsxProd_default(Box, {
          position: "absolute",
          bottom: "100%",
          marginBottom,
          left: 0,
          right: 0,
          opaque: true,
          children: fullscreenSlotDialog,
        })
      : null;
    $[4] = fullscreenSlotDialog;
    $[5] = marginBottom;
    $[6] = dialogBox;
  } else dialogBox = $[6];
  let overlay;
  if ($[7] !== suggestionsBox || $[8] !== dialogBox) {
    overlay = jsxProd_default_2(Fragment, {
      children: [suggestionsBox, dialogBox],
    });
    $[7] = suggestionsBox;
    $[8] = dialogBox;
    $[9] = overlay;
  } else overlay = $[9];
  return overlay;
}
//@ chunk-hnxhr3bs.js:45539-45543 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:45539", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:45543-45547 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:45543", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:45547-45551 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:45547", () => {
  init_react_production();
});
export {
  isInvisibleMessage,
  TranscriptOverlaySlot,
  useFullscreenDialogSlot,
  useFullscreenAnchor,
  useFeedIsWide,
  FullscreenLayout,
  FooterSlot,
  useFullscreenFooterData,
  computeUnseenDivider,
  useScrollChrome,
};
