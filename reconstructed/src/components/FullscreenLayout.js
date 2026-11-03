/**
 * components/FullscreenLayout.tsx
 *
 * 全屏布局：滚动区 + 底部输入区 + 侧栏/坞，提供 ScrollChromeContext、未读分隔线、"新消息"跳底药丸、置顶提示头、对话框/建议浮层。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FullscreenLayout.tsx
 * pieces: chunk-ag5x7vhf.js (60)
 * attribution: placement 37, sole-consumer 5, affinity 1, fingerprint 8, layout 7, file-local 2
 */
import { createStore } from "../state/store.js";
import { setSliceField } from "../state/sliceHelpers.js";
import {
  qt,
  y,
  R,
  Se,
  P,
  init_react_production,
  NSe,
  zt,
  yt,
} from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
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
import { isBashOutputText } from "../constants/xml.js";
import { subscribeScrollTraceLive, isScrollTraceDemoRuler } from "../ink/widest-line.js";
import { ScrollTestFiller } from "./ContextVisualization.js";
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
import { kp } from "../../vendor/convert-to-spaces/dist/index.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { parseChord, chordToDisplayString } from "../keybindings/parser.js";
import { getShortcutDisplayPlatform } from "../utils/keyboardShortcuts.js";
import { useShortcutDisplay } from "../keybindings/useShortcutDisplay.js";
import { plural } from "../utils/stringUtils.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { countJumpToBottom } from "../utils/scrollTelemetry.js";
import { TagTabs } from "./TagTabs.js";
import { FooterSuggestionsMemo } from "./PromptInput/PromptInputFooterSuggestions.js";

//@ chunk-ag5x7vhf.js:9697-9723 placement
function renderNull() {
  return null;
}
//@ chunk-ag5x7vhf.js:9723-9754 placement
var EMPTY_FULLSCREEN_SLOTS = {
  data: null,
  dialog: null,
};
//@ chunk-ag5x7vhf.js:9754-9861 placement
function createFullscreenSlots() {
  let store = createStore(EMPTY_FULLSCREEN_SLOTS);
  return {
    store,
    setData: setSliceField(store.setState, "data"),
    setDialog: setSliceField(store.setState, "dialog"),
  };
}
//@ chunk-ag5x7vhf.js:9861-9877 placement
var FullscreenSlotsContext = qt(null);
//@ chunk-ag5x7vhf.js:9877-10140 placement
function FullscreenSlotsProvider(props) {
  let _ = w(6);
  let { container, children } = props;
  let [T] = y(createFullscreenSlots);
  let anchor = R(null);
  let I;
  if (_[0] !== T || _[1] !== container) {
    I = {
      ...T,
      anchor,
      container,
    };
    _[0] = T;
    _[1] = container;
    _[2] = I;
  } else I = _[2];
  let value = I;
  let A;
  if (_[3] !== children || _[4] !== value) {
    A = jsxProd_default(FullscreenSlotsContext, {
      value,
      children,
    });
    _[3] = children;
    _[4] = value;
    _[5] = A;
  } else A = _[5];
  return A;
}
//@ chunk-ag5x7vhf.js:10140-10169 placement
function selectSlotData(m) {
  return m.data;
}
//@ chunk-ag5x7vhf.js:10169-10200 placement
function selectSlotDialog(m) {
  return m.dialog;
}
//@ chunk-ag5x7vhf.js:10306-10354 placement
function useFullscreenSlotData() {
  return useStoreSelector(Se(FullscreenSlotsContext)?.store, selectSlotData) ?? null;
}
//@ chunk-ag5x7vhf.js:10354-10402 placement
function useFullscreenSlotDialog() {
  return useStoreSelector(Se(FullscreenSlotsContext)?.store, selectSlotDialog) ?? null;
}
//@ chunk-ag5x7vhf.js:10402-10738 placement
/**
 * 测量锚点在容器中的顶部位置，等于其上外边距时返回该值，否则为 0。
 */
function useAnchorTopMargin() {
  let h = w(3);
  let m = Se(FullscreenSlotsContext);
  let x;
  if (h[0] !== m?.anchor || h[1] !== m?.container?.current) {
    x = () => {
      let T = m?.container?.current;
      let k = m?.anchor.current;
      if (!T || !k?.yogaNode) {
        return 0;
      }
      let _ = topWithin(k, T);
      if (_ < 0) {
        return 0;
      }
      let computedMargin = k.yogaNode.getComputedMargin(1);
      return _ === computedMargin ? computedMargin : 0;
    };
    h[0] = m?.anchor;
    h[1] = m?.container?.current;
    h[2] = x;
  } else x = h[2];
  return useMeasured(x);
}
//@ chunk-ag5x7vhf.js:10738-10785 placement
/**
 * 函数 useFeedIsWide（全屏 feed 是否够宽）；位于「全屏布局：滚动区 + 底部输入区 + 侧栏/坞，提供 ScrollChromeContext、未读分隔线、"新消息"跳底药丸、置顶提示头、对话框/建议浮层」模块。
 */
function useFeedIsWide() {
  return useStoreSelector(Se(FullscreenSlotsContext)?.store, calculateFeedWidth) ?? false;
}
//@ chunk-ag5x7vhf.js:10785-11045 placement
function useSetSlot(m, h) {
  let x = w(7);
  let T;
  let k;
  if (x[0] !== m || x[1] !== h) {
    T = () => {
      if (!m) {
        return;
      }
      m(() => h);
    };
    k = [m, h];
    x[0] = m;
    x[1] = h;
    x[2] = T;
    x[3] = k;
  } else {
    T = x[2];
    k = x[3];
  }
  P(T, k);
  let _;
  let I;
  if (x[4] !== m) {
    _ = () => {
      if (!m) {
        return;
      }
      return () => {
        m(renderNull);
      };
    };
    I = [m];
    x[4] = m;
    x[5] = _;
    x[6] = I;
  } else {
    _ = x[5];
    I = x[6];
  }
  P(_, I);
}
//@ chunk-ag5x7vhf.js:11045-11083 placement
function useFullscreenFooterData(m) {
  useSetSlot(Se(FullscreenSlotsContext)?.setData, m);
}
//@ chunk-ag5x7vhf.js:11083-11123 placement
function useFullscreenDialogSlot(m) {
  useSetSlot(Se(FullscreenSlotsContext)?.setDialog, m);
}
//@ chunk-ag5x7vhf.js:11123-11160 placement
function useFullscreenAnchor() {
  return Se(FullscreenSlotsContext)?.anchor;
}
//@ chunk-ag5x7vhf.js:11160-11164 placement
init_react_production();
//@ chunk-ag5x7vhf.js:18504-18533 placement
function newReplayHandleSlot() {
  return new ReplayHandleSlot();
}
//@ chunk-ag5x7vhf.js:18533-21173 placement
/**
 * 全屏布局：可滚动区、底部区、上推区与浮层，维护滚动视口与缓存布局。
 */
function FullscreenLayoutView(props) {
  let pe = w(28);
  let { scrollable, bottom, pushUp, overlay, scrollViewport } = props;
  let terminalSize = useTerminalSize();
  let { columns, rows } = terminalSize;
  let L = R(null);
  let V = R(null);
  let W = R(null);
  let z = R(null);
  let [K] = y(newReplayHandleSlot);
  let q = scrollViewport ?? K;
  let { attach } = q;
  let xe;
  if (pe[0] !== columns || pe[1] !== rows || pe[2] !== q.handle) {
    xe = () => {
      let ge = getSecondRootError().get(process.stdout);
      if (!ge) {
        return;
      }
      let Re = new ScreenReplayWriter(process.stdout, columns, rows, ge.recordContentWrite);
      Re.setup();
      L.current = Re;
      let We = false;
      ge.frameSink = (fe, stylePool) => {
        let te = L.current;
        if (!te) {
          return false;
        }
        if (ge.isAltScreenActive) {
          if (!We) {
            te.suspend();
            We = true;
          }
          return false;
        }
        if (We) {
          We = false;
          te.resume(te.cols, te.rows);
        }
        let me = te.tickPump();
        let se = serializeNodeScreenRows(fe, stylePool, V.current);
        let _e = serializeNodeScreenRows(fe, stylePool, W.current);
        let layout = te.computeLayout(se, _e);
        let ve = q.handle?.getDomElement() ?? null;
        if (ve) {
          let cachedLayout = ve.cachedLayout;
          let He = [];
          if (cachedLayout && cachedLayout.height > 0) {
            let min = Math.min(cachedLayout.y + cachedLayout.height, fe.screen.height);
            for (let row = cachedLayout.y; row < min; row++)
              He.push(serializeScreenRow(fe.screen, stylePool, row));
          }
          let scrollHeight = ve.scrollHeight ?? 0;
          let transcriptEnd = offsetWithinParent(z.current, ve) ?? scrollHeight;
          te.syncViewport(
            {
              lines: He,
              scrollTop: ve.scrollTop ?? 0,
              scrollHeight,
              transcriptEnd,
            },
            layout.contentHeight,
          );
        }
        let tt = false;
        if (ve) {
          let ct = te.consumeGapRange();
          let Je = te.consumeBackfillNeeded();
          if (ct || Je) {
            let from = ct ? ct.from : 0;
            let toRow = ct ? ct.to : (ve.scrollTop ?? 0);
            let Wt = renderToScreen(ve, from, toRow, te.cols, ge.getStylePool());
            if (Wt.length > 0) {
              te.primeBackfill(Wt);
              tt = true;
            }
          }
        }
        te.draw(layout);
        return me || tt ? "tick" : true;
      };
      return () => {
        ge.frameSink = null;
        Re.restore();
        L.current = null;
      };
    };
    pe[0] = columns;
    pe[1] = rows;
    pe[2] = q.handle;
    pe[3] = xe;
  } else xe = pe[3];
  let Ze;
  if (pe[4] === MEMO_CACHE_SENTINEL) {
    Ze = [];
    pe[4] = Ze;
  } else Ze = pe[4];
  NSe(xe, Ze);
  let pt;
  if (pe[5] !== columns || pe[6] !== rows) {
    pt = {
      cols: columns,
      rows,
    };
    pe[5] = columns;
    pe[6] = rows;
    pe[7] = pt;
  } else pt = pe[7];
  let Xt = R(pt);
  let rt;
  let qe;
  if (pe[8] !== columns || pe[9] !== rows) {
    rt = () => {
      if (columns === Xt.current.cols && rows === Xt.current.rows) {
        return;
      }
      Xt.current = {
        cols: columns,
        rows,
      };
      L.current?.handleResize(columns, rows);
    };
    qe = [columns, rows];
    pe[8] = columns;
    pe[9] = rows;
    pe[10] = rt;
    pe[11] = qe;
  } else {
    rt = pe[10];
    qe = pe[11];
  }
  zt(rt, qe);
  let children;
  if (pe[12] !== scrollable) {
    children = jsxProd_default(ScrollAnchorContext.Provider, {
      value: z,
      children: scrollable,
    });
    pe[12] = scrollable;
    pe[13] = children;
  } else children = pe[13];
  let dt;
  if (pe[14] !== attach || pe[15] !== children) {
    dt = jsxProd_default(ScrollBoxDefault, {
      ref: attach,
      flexGrow: 1,
      flexDirection: "column",
      stickyScroll: true,
      children,
    });
    pe[14] = attach;
    pe[15] = children;
    pe[16] = dt;
  } else dt = pe[16];
  const maxHeight = rows - 2;
  let Ot;
  if (pe[17] !== bottom || pe[18] !== pushUp || pe[19] !== maxHeight) {
    Ot = jsxProd_default_2(BaseBox, {
      ref: V,
      flexDirection: "column",
      flexShrink: 0,
      minHeight: CHROME_ROWS,
      maxHeight,
      children: [pushUp, bottom],
    });
    pe[17] = bottom;
    pe[18] = pushUp;
    pe[19] = maxHeight;
    pe[20] = Ot;
  } else Ot = pe[20];
  let It;
  if (pe[21] !== overlay) {
    It =
      overlay != null
        ? jsxProd_default(BaseBox, {
            ref: W,
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
    pe[21] = overlay;
    pe[22] = It;
  } else It = pe[22];
  let kt;
  if (pe[23] !== rows || pe[24] !== It || pe[25] !== dt || pe[26] !== Ot) {
    kt = jsxProd_default_2(BaseBox, {
      flexDirection: "column",
      height: rows,
      width: "100%",
      flexShrink: 0,
      children: [dt, Ot, It],
    });
    pe[23] = rows;
    pe[24] = It;
    pe[25] = dt;
    pe[26] = Ot;
    pe[27] = kt;
  } else kt = pe[27];
  return kt;
}
//@ chunk-ag5x7vhf.js:21173-21309 placement = siblingSharesY (0.858)
function offsetWithinParent(node, yogaNode) {
  if (!node) return;
  let x = 0;
  let T = node;
  while (T && T.parentNode !== yogaNode) {
    x += T.yogaNode?.getComputedTop() ?? 0;
    T = T.parentNode;
  }
  return T ? x : undefined;
}
//@ chunk-ag5x7vhf.js:22083-22097 placement
/**
 * 导出值：TranscriptOverlaySlot（transcript 叠加层槽）；位于「全屏布局：滚动区 + 底部输入区 + 侧栏/坞，提供 ScrollChromeContext、未读分隔线、"新消息"跳底药丸、置顶提示头、对话框/建议浮层」模块。
 */
var TranscriptOverlaySlot = qt(0);
//@ chunk-ag5x7vhf.js:22097-22101 placement
init_react_production();
//@ chunk-ag5x7vhf.js:22101-22115 placement
/**
 * 导出值：FooterSlot（页脚槽）；位于「全屏布局：滚动区 + 底部输入区 + 侧栏/坞，提供 ScrollChromeContext、未读分隔线、"新消息"跳底药丸、置顶提示头、对话框/建议浮层」模块。
 */
var FooterSlot = qt(0);
//@ chunk-ag5x7vhf.js:22115-22119 placement
init_react_production();
//@ chunk-ag5x7vhf.js:22119-22181 placement
function debugColor(m) {
  return `rgb(${m & 255},${(m >> 8) & 255},${(m >> 16) & 255})`;
}
//@ chunk-ag5x7vhf.js:22181-22436 placement
var DEBUG_COLOR_COUNT = 64;
var DEBUG_ALT_COLOR_COUNT = 64;
var DEBUG_COLORS = Array.from(
  {
    length: DEBUG_COLOR_COUNT,
  },
  (m, h) => debugColor(h * 2043453),
);
var DEBUG_ALT_COLORS = Array.from(
  {
    length: DEBUG_ALT_COLOR_COUNT,
  },
  (m, h) => debugColor(h * 461587 + 8405034),
);
var GLYPH_RANGES = [
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
var GLYPH_RANGE_TOTAL = GLYPH_RANGES.reduce((acc, [, h]) => acc + h, 0);
//@ chunk-ag5x7vhf.js:24486-24758 placement
function isInvisibleMessage(m) {
  switch (m.type) {
    case "attachment":
      return isHiddenAttachmentMessage(m);
    case "assistant": {
      let content = m.message.content;
      if (content.length === 0) return false;
      for (let x of content) {
        if (x.type !== "thinking") return false;
        let thinking = x.thinking;
        if (thinking !== "" && !(thinking.startsWith("<") && stripMemoryTags(thinking) === "")) return false;
      }
      return true;
    }
    default:
      return false;
  }
}
//@ chunk-ag5x7vhf.js:24758-24762 placement
init_react_production();
//@ chunk-ag5x7vhf.js:24762-24790 placement
function incrementByOne(So) {
  return So + 1;
}
//@ chunk-ag5x7vhf.js:24790-24828 placement
function isInKind(Yt) {
  return Yt.kind === "in";
}
//@ chunk-ag5x7vhf.js:24828-24927 placement = _temp2 (0.818)
function renderDebugLine(line, i_1) {
  return jsxProd_default(
    Text,
    {
      dimColor: true,
      wrap: "truncate-end",
      children: isBashOutputText(line),
    },
    `${line.ts}-${i_1}`,
  );
}
//@ chunk-ag5x7vhf.js:24927-24987 placement
function renderDimChildren(children, Fe) {
  return jsxProd_default(
    Text,
    {
      dimColor: true,
      children,
    },
    Fe,
  );
}
//@ chunk-ag5x7vhf.js:24987-25012 placement
var FULLSCREEN_COLUMNS = 25;
var FULLSCREEN_ROWS = 80;
var FULLSCREEN_CELL_BUDGET = FULLSCREEN_COLUMNS * FULLSCREEN_ROWS;
//@ chunk-ag5x7vhf.js:25012-25016 placement
init_react_production();
//@ chunk-ag5x7vhf.js:25141-25247 placement
function ScrollTraceRuler() {
  let h = w(2);
  let m = yt(subscribeScrollTraceLive, isScrollTraceDemoRuler);
  let x;
  if (h[0] !== m) {
    x = m ? jsxProd_default(ScrollTestFiller, {}) : null;
    h[0] = m;
    h[1] = x;
  } else x = h[1];
  return x;
}
//@ chunk-ag5x7vhf.js:27676-27704 sole-consumer
function createEmptyStore() {
  return createStore([]);
}
//@ chunk-ag5x7vhf.js:27704-27751 sole-consumer
function sumRowsMinusOwed(Yc, Ls) {
  return Yc + Ls.rows() - Ls.owed;
}
//@ chunk-ag5x7vhf.js:27751-27785 sole-consumer
function selectVerbose(UL) {
  return UL.verbose;
}
//@ chunk-ag5x7vhf.js:27785-27800 sole-consumer
function noop() {}
//@ chunk-ag5x7vhf.js:27800-27815 sole-consumer
function noop_2() {}
//@ chunk-ag5x7vhf.js:27815-27839 affinity
function openHyperlink(tr) {
  openClickedLink(tr);
}
//@ chunk-ag5x7vhf.js:27839-28016 fingerprint = _temp3 (0.652)
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
//@ chunk-ag5x7vhf.js:28016-28064 layout
function selectUnseenDividerCount(m) {
  return m.unseenDivider?.count ?? 0;
}
//@ chunk-ag5x7vhf.js:28064-28080 layout
var ScrollChromeContextValue = qt(null);
//@ chunk-ag5x7vhf.js:28080-28271 layout
function useScrollChrome() {
  let m = Se(ScrollChromeContextValue);
  if (!m) {
    throw ReferenceError(
      "useScrollChrome cannot be called outside of a <FullscreenLayout /> (it provides ScrollChromeContext to its scrollable slot)",
    );
  }
  return m;
}
//@ chunk-ag5x7vhf.js:28271-28367 fingerprint = ScrollChromeContext (0.478)
function ScrollChromeContext() {
  let store = createStore(null);
  return {
    sticky: store,
    chrome: {
      setStickyPrompt: (h) => {
        store.setState(() => h);
      },
    },
  };
}
//@ chunk-ag5x7vhf.js:28367-28562 layout = countUnseenAssistantTurns (1)
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
//@ chunk-ag5x7vhf.js:28562-28694 file-local
function assistantHasVisibleText(m) {
  if (m.type !== "assistant") return false;
  for (let h of m.message.content) if (h.type === "text" && h.text?.trim()) return true;
  return false;
}
//@ chunk-ag5x7vhf.js:28694-28881 layout = countToolCallsSince (1)
function countToolCallsSince(m) {
  if (m.type !== "assistant" || m.message.content.length === 0) return false;
  for (let h of m.message.content) {
    if (h.type === "text" || h.type === "tool_use") return false;
    if (isSignedThinkingBlock(h)) return false;
  }
  return true;
}
//@ chunk-ag5x7vhf.js:28881-29232 fingerprint = computeUnseenDivider (0.78)
/**
 * 根据最后一次已读位置计算未读分隔线（位置与计数），跳过 progress/attachment。
 */
function computeUnseenDivider(messages, dividerIndex, x) {
  if (dividerIndex === null) return;
  let anchorIdx = dividerIndex;
  let k = -1;
  while (anchorIdx < messages.length) {
    let D = messages[anchorIdx];
    if (D.type === "progress" || isInvisibleMessage(D)) {
      anchorIdx++;
      continue;
    }
    if (x && D.type === "attachment" && isReinjectedListingAttachment(D.attachment)) {
      anchorIdx++;
      continue;
    }
    if (x && countToolCallsSince(D)) {
      if (k === -1) k = anchorIdx;
      anchorIdx++;
      continue;
    }
    break;
  }
  if (anchorIdx >= messages.length && k !== -1) anchorIdx = k;
  let uuid = messages[anchorIdx];
  if (!hasStringUuid(uuid)) return;
  let count = countUnseenAssistantTurns(messages, dividerIndex);
  return {
    firstUnseenUuid: uuid.uuid,
    count: Math.max(1, count),
  };
}
//@ chunk-ag5x7vhf.js:29232-39089 fingerprint = FullscreenLayout (0.489)
/**
 * 全屏布局组件：scrollable 槽（消息列表）放在 ScrollBox 中并提供 ScrollChromeContext；底部 bottom/abovePrompt 槽、可选 sidebar/dock；未读分隔线、"新消息"药丸、置顶提示头、modal/对话框浮层与建议浮层。
 */
function FullscreenLayout(props) {
  let $ = w(164);
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
  let ge = sidebarWidth === undefined ? 0 : sidebarWidth;
  let Re = dockWidth === undefined ? 0 : dockWidth;
  let We = hidePill === undefined ? false : hidePill;
  let fe = hideSticky === undefined ? false : hideSticky;
  let terminalSize = useTerminalSize();
  let { rows, columns } = terminalSize;
  let se = header != null && rows >= NOTICE_WIDTH_LIMIT;
  let _e = rows - (se ? MAX_NOTICE_LINES : 0);
  let ve;
  if ($[0] !== _e || $[1] !== columns || $[2] !== se || $[3] !== terminalSize) {
    ve = se
      ? {
          columns,
          rows: _e,
        }
      : terminalSize;
    $[0] = _e;
    $[1] = columns;
    $[2] = se;
    $[3] = terminalSize;
    $[4] = ve;
  } else ve = $[4];
  let value = ve;
  let He = _e - OVERLAY_BATCH_SIZE - 1;
  let Ue = R(null);
  let lt = R(null);
  let [it, ae] = y(null);
  let tt = modal?.footer != null;
  let ct;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    ct = isDecstbmRendererEnabled();
    $[5] = ct;
  } else ct = $[5];
  let Je = ct;
  let $e;
  if ($[6] !== tt || $[7] !== it || $[8] !== He || $[9] !== rows) {
    $e = () => {
      let Qe = Ue.current;
      let Wt = lt.current;
      if (!tt || (!Je && (it === null || it <= 0)) || Qe === null || Wt === null) {
        return true;
      }
      return measureElement(Qe).height + measureElement(Wt).height <= (Je ? rows : He);
    };
    $[6] = tt;
    $[7] = it;
    $[8] = He;
    $[9] = rows;
    $[10] = $e;
  } else $e = $[10];
  let measured = useMeasured($e);
  const columns_2 = Math.max(1, columns - ge - Re);
  let Xt;
  if ($[11] !== _e || $[12] !== columns_2) {
    Xt = {
      columns: columns_2,
      rows: _e,
    };
    $[11] = _e;
    $[12] = columns_2;
    $[13] = Xt;
  } else Xt = $[13];
  let value_2 = Xt;
  let qe = dock != null && Re > 0;
  const columns_3 = Math.max(1, columns - Re);
  let dt;
  if ($[14] !== _e || $[15] !== columns_3) {
    dt = {
      columns: columns_3,
      rows: _e,
    };
    $[14] = _e;
    $[15] = columns_3;
    $[16] = dt;
  } else dt = $[16];
  let value_3 = dt;
  let overlayFlagA = useOverlayFlagA();
  let overlayFlagB = useOverlayFlagB();
  let kt = overlayFlagA || overlayFlagB ? _e - OVERLAY_BATCH_SIZE : Math.floor(_e / 2);
  let to = R(null);
  let de = R(null);
  let le = R(null);
  let Be = R(null);
  let st;
  if ($[17] === MEMO_CACHE_SENTINEL) {
    st = () => (Be.current === null ? 0 : measureElement(Be.current).height);
    $[17] = st;
  } else st = $[17];
  let measured_2 = useMeasured(st);
  let maxHeight = Math.max(0, kt - measured_2);
  let visible = modal?.visible ?? false;
  let At;
  if ($[18] !== kt || $[19] !== visible) {
    At = () =>
      visible || to.current === null
        ? null
        : kt -
          measureElement(to.current).height -
          (le.current === null ? 0 : measureElement(le.current).height);
    $[18] = kt;
    $[19] = visible;
    $[20] = At;
  } else At = $[20];
  let ut = At;
  let [jt] = y(createEmptyStore);
  let storeSelector = useStoreSelector(jt);
  let mo;
  if ($[21] !== jt) {
    mo = (Jt) => {
      jt.setState((Gt) => [...Gt, Jt]);
      return () => jt.setState((Mo) => Mo.filter((Vo) => Vo !== Jt));
    };
    $[21] = jt;
    $[22] = mo;
  } else mo = $[22];
  let value_4 = mo;
  let So;
  if ($[23] !== ut || $[24] !== storeSelector) {
    So = () => {
      let Yt = ut();
      return Yt === null ? null : storeSelector.reduce(sumRowsMinusOwed, Yt);
    };
    $[23] = ut;
    $[24] = storeSelector;
    $[25] = So;
  } else So = $[25];
  let value_5 = So;
  let [ne] = y(ScrollChromeContext);
  let storeSelector_2 = useStoreSelector(ne.sticky);
  let value_6 = ne.chrome;
  let Ce = useAppStateSlice(selectVerbose) ?? false;
  let leftMargin = shouldShowNotice(Ce) ? SPINNER_COLUMN_MIN_WIDTH : 0;
  let Ke;
  if ($[26] !== scrollViewport || $[27] !== unseen) {
    Ke = (listener) => {
      let je = scrollViewport?.subscribe(listener) ?? noop;
      let Xe = unseen?.subscribe(listener) ?? noop_2;
      return () => {
        je();
        Xe();
      };
    };
    $[26] = scrollViewport;
    $[27] = unseen;
    $[28] = Ke;
  } else Ke = $[28];
  let Et = Ke;
  let Ct;
  if ($[29] === MEMO_CACHE_SENTINEL) {
    Ct = resolveSetting("autoScrollEnabled", true);
    $[29] = Ct;
  } else Ct = $[29];
  let bt = Ct.value;
  let _t;
  if ($[30] !== scrollViewport?.handle || $[31] !== unseen) {
    _t = () => {
      let handle = scrollViewport?.handle;
      if (!handle) {
        return false;
      }
      if (handle.isSticky()) {
        return false;
      }
      let $t = handle.getScrollTop() + handle.getPendingDelta() + handle.getViewportHeight();
      let dividerY = unseen?.getSnapshot().dividerY;
      if (dividerY != null) {
        return $t < dividerY && $t < handle.getScrollHeight();
      }
      return !bt && $t < handle.getScrollHeight();
    };
    $[30] = scrollViewport?.handle;
    $[31] = unseen;
    $[32] = _t;
  } else _t = $[32];
  let pillVisible = yt(Et, _t);
  let count = useStoreSelector(unseen, selectUnseenDividerCount) ?? 0;
  let { clearSelection } = useSelection();
  let Li;
  let Gc;
  if ($[33] !== clearSelection || $[34] !== visible) {
    Li = () => {
      if (!visible) {
        return;
      }
      return clearSelection;
    };
    Gc = [visible, clearSelection];
    $[33] = clearSelection;
    $[34] = visible;
    $[35] = Li;
    $[36] = Gc;
  } else {
    Li = $[35];
    Gc = $[36];
  }
  zt(Li, Gc);
  let Oi = Se(appStoreContext);
  let $c;
  if ($[37] !== Oi) {
    $c = [Oi];
    $[37] = Oi;
    $[38] = $c;
  } else $c = $[38];
  zt(repaintFullscreenInk, $c);
  if (isFullscreenEnvEnabled()) {
    let ko = fe ? null : storeSelector_2;
    let jn = ko != null && ko !== "clicked" ? ko : null;
    let Gn = ko != null;
    let Ro;
    if ($[39] !== header || $[40] !== terminalSize) {
      Ro =
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
      $[41] = Ro;
    } else Ro = $[41];
    let wo;
    if ($[42] !== jn || $[43] !== leftMargin) {
      wo =
        jn &&
        jsxProd_default(StickyPromptHeader, {
          text: jn.text,
          onClick: jn.scrollTo,
          leftMargin,
        });
      $[42] = jn;
      $[43] = leftMargin;
      $[44] = wo;
    } else wo = $[44];
    const ref = scrollViewport?.attach;
    const paddingTop = Gn ? 0 : 1;
    let mn;
    if ($[45] === MEMO_CACHE_SENTINEL) {
      mn = jsxProd_default(ScrollTraceRuler, {});
      $[45] = mn;
    } else mn = $[45];
    let children;
    if ($[46] !== value_6 || $[47] !== scrollable) {
      children = jsxProd_default_2(ScrollChromeContextValue, {
        value: value_6,
        children: [scrollable, mn],
      });
      $[46] = value_6;
      $[47] = scrollable;
      $[48] = children;
    } else children = $[48];
    let $n;
    if ($[49] !== ref || $[50] !== paddingTop || $[51] !== children) {
      $n = jsxProd_default(ScrollBoxDefault, {
        ref,
        flexGrow: 1,
        flexDirection: "column",
        paddingTop,
        stickyScroll: true,
        followGrowth: bt,
        children,
      });
      $[49] = ref;
      $[50] = paddingTop;
      $[51] = children;
      $[52] = $n;
    } else $n = $[52];
    let Kn;
    if ($[53] !== We || $[54] !== count || $[55] !== pillVisible || $[56] !== unseen?.jumpToNew) {
      Kn =
        !We &&
        pillVisible &&
        jsxProd_default(NewMessagesPill, {
          count,
          onClick: unseen?.jumpToNew,
        });
      $[53] = We;
      $[54] = count;
      $[55] = pillVisible;
      $[56] = unseen?.jumpToNew;
      $[57] = Kn;
    } else Kn = $[57];
    const value_7 = jn ? 1 : 0;
    let qn;
    if ($[58] !== value_7 || $[59] !== transcriptOverlay) {
      qn = jsxProd_default(TranscriptOverlaySlot, {
        value: value_7,
        children: transcriptOverlay,
      });
      $[58] = value_7;
      $[59] = transcriptOverlay;
      $[60] = qn;
    } else qn = $[60];
    let children_2;
    if ($[61] !== wo || $[62] !== $n || $[63] !== Kn || $[64] !== qn || $[65] !== top) {
      children_2 = jsxProd_default_2(Box, {
        flexGrow: 1,
        flexDirection: "column",
        overflow: "hidden",
        children: [top, wo, $n, Kn, qn, false, false],
      });
      $[61] = wo;
      $[62] = $n;
      $[63] = Kn;
      $[64] = qn;
      $[65] = top;
      $[66] = children_2;
    } else children_2 = $[66];
    let Jn;
    if ($[67] !== value_2 || $[68] !== children_2) {
      Jn = jsxProd_default(TerminalSizeContext, {
        value: value_2,
        children: children_2,
      });
      $[67] = value_2;
      $[68] = children_2;
      $[69] = Jn;
    } else Jn = $[69];
    let wn;
    if ($[70] !== sidebar || $[71] !== ge) {
      wn =
        sidebar != null &&
        (ge > 0
          ? jsxProd_default(Box, {
              width: ge,
              flexShrink: 0,
              flexDirection: "column",
              overflow: "hidden",
              backgroundColor: "composerSidebarBackground",
              children: sidebar,
            })
          : sidebar);
      $[70] = sidebar;
      $[71] = ge;
      $[72] = wn;
    } else wn = $[72];
    let Ui;
    if ($[73] !== Jn || $[74] !== wn) {
      Ui = jsxProd_default_2(Box, {
        flexGrow: 1,
        flexDirection: "row",
        overflow: "hidden",
        children: [Jn, wn],
      });
      $[73] = Jn;
      $[74] = wn;
      $[75] = Ui;
    } else Ui = $[75];
    const display = visible ? "none" : "flex";
    let children_3;
    if ($[76] !== abovePrompt || $[77] !== value_5) {
      children_3 = jsxProd_default(Box, {
        ref: le,
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
    if ($[79] !== kt || $[80] !== display || $[81] !== children_3) {
      children_4 = jsxProd_default(Box, {
        ref: Be,
        flexDirection: "column",
        flexShrink: 0,
        width: "100%",
        maxHeight: kt,
        overflowY: "hidden",
        display,
        children: children_3,
      });
      $[79] = kt;
      $[80] = display;
      $[81] = children_3;
      $[82] = children_4;
    } else children_4 = $[82];
    let Hi;
    if ($[83] !== value_3 || $[84] !== children_4) {
      Hi = jsxProd_default(TerminalSizeContext, {
        value: value_3,
        children: children_4,
      });
      $[83] = value_3;
      $[84] = children_4;
      $[85] = Hi;
    } else Hi = $[85];
    let _s;
    if ($[86] !== Ui || $[87] !== Hi) {
      _s = jsxProd_default_2(Box, {
        flexGrow: 1,
        flexDirection: "column",
        overflow: "hidden",
        children: [Ui, Hi],
      });
      $[86] = Ui;
      $[87] = Hi;
      $[88] = _s;
    } else _s = $[88];
    let Is;
    if ($[89] !== dock || $[90] !== Re || $[91] !== qe) {
      Is =
        dock != null &&
        jsxProd_default(Box, {
          width: Re,
          flexShrink: 0,
          flexDirection: "column",
          overflow: "hidden",
          display: qe ? "flex" : "none",
          children: dock,
        });
      $[89] = dock;
      $[90] = Re;
      $[91] = qe;
      $[92] = Is;
    } else Is = $[92];
    let Es;
    if ($[93] !== _s || $[94] !== Is) {
      Es = jsxProd_default_2(Box, {
        flexGrow: 1,
        flexDirection: "row",
        overflow: "hidden",
        children: [_s, Is],
      });
      $[93] = _s;
      $[94] = Is;
      $[95] = Es;
    } else Es = $[95];
    const display_2 = visible ? "none" : "flex";
    const value_8 = qe ? Re : 0;
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
    let zi;
    if ($[102] !== ut || $[103] !== children_6) {
      zi = jsxProd_default(Box, {
        ref: to,
        flexDirection: "column",
        width: "100%",
        flexGrow: 1,
        flexShrink: 0,
        overflowY: "hidden",
        children: jsxProd_default(ContextSlotA, {
          value: ut,
          children: children_6,
        }),
      });
      $[102] = ut;
      $[103] = children_6;
      $[104] = zi;
    } else zi = $[104];
    let Gi;
    if ($[105] !== dockTail || $[106] !== Re || $[107] !== qe) {
      Gi =
        qe &&
        jsxProd_default(DialogOverlay, {
          width: Re,
          children: dockTail,
        });
      $[105] = dockTail;
      $[106] = Re;
      $[107] = qe;
      $[108] = Gi;
    } else Gi = $[108];
    let Zn;
    if ($[109] !== measured_2) {
      Zn = jsxProd_default(SuggestionsOverlay, {
        rowsAbove: measured_2,
      });
      $[109] = measured_2;
      $[110] = Zn;
    } else Zn = $[110];
    let Er;
    if ($[111] !== maxHeight || $[112] !== display_2 || $[113] !== zi || $[114] !== Gi || $[115] !== Zn) {
      Er = jsxProd_default_2(Box, {
        ref: de,
        flexDirection: "column",
        flexShrink: 0,
        width: "100%",
        maxHeight,
        display: display_2,
        children: [zi, Gi, Zn],
      });
      $[111] = maxHeight;
      $[112] = display_2;
      $[113] = zi;
      $[114] = Gi;
      $[115] = Zn;
      $[116] = Er;
    } else Er = $[116];
    let Dr;
    if (
      $[117] !== _e ||
      $[118] !== columns ||
      $[119] !== modal ||
      $[120] !== measured ||
      $[121] !== He ||
      $[122] !== modalScrollViewport ||
      $[123] !== visible
    ) {
      Dr =
        modal != null &&
        jsxProd_default(scrollViewportContext, {
          value: {
            rows: He,
            columns: columns - 2 * PANE_WIDTH_RESERVE,
            scrollViewport: modalScrollViewport ?? null,
            claimScrollBox: null,
          },
          children: jsxProd_default_2(Box, {
            flexShrink: 0,
            width: "100%",
            maxHeight: _e - OVERLAY_BATCH_SIZE,
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
                  ref: Ue,
                  flexDirection: "column",
                  flexShrink: 0,
                  children: jsxProd_default(useUnseenDivider, {
                    scrollViewport: modalScrollViewport,
                    maxRows: He,
                    onClaim: ae,
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
                  ref: lt,
                  flexDirection: "column",
                  flexShrink: 0,
                  children: modal.footer,
                }),
              }),
            ],
          }),
        });
      $[117] = _e;
      $[118] = columns;
      $[119] = modal;
      $[120] = measured;
      $[121] = He;
      $[122] = modalScrollViewport;
      $[123] = visible;
      $[124] = Dr;
    } else Dr = $[124];
    let er;
    if ($[125] !== Ro || $[126] !== Es || $[127] !== Er || $[128] !== Dr) {
      er = jsxProd_default_2(FullscreenSlotsProvider, {
        container: de,
        children: [Ro, Es, Er, Dr],
      });
      $[125] = Ro;
      $[126] = Es;
      $[127] = Er;
      $[128] = Dr;
      $[129] = er;
    } else er = $[129];
    let children_7 = er;
    const value_9 = se ? rows : null;
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
    let _o;
    if ($[133] !== value_9 || $[134] !== children_8) {
      _o = jsxProd_default(noticeDialogSlot, {
        value: value_9,
        children: children_8,
      });
      $[133] = value_9;
      $[134] = children_8;
      $[135] = _o;
    } else _o = $[135];
    return _o;
  }
  if (isDecstbmRendererEnabled()) {
    let Ro;
    if ($[136] === MEMO_CACHE_SENTINEL) {
      Ro = jsxProd_default(ScrollTraceRuler, {});
      $[136] = Ro;
    } else Ro = $[136];
    let scrollable_2;
    if ($[137] !== value_6 || $[138] !== scrollable) {
      scrollable_2 = jsxProd_default_2(ScrollChromeContextValue, {
        value: value_6,
        children: [scrollable, Ro],
      });
      $[137] = value_6;
      $[138] = scrollable;
      $[139] = scrollable_2;
    } else scrollable_2 = $[139];
    let Wo;
    if ($[140] === MEMO_CACHE_SENTINEL) {
      Wo = jsxProd_default(SuggestionsOverlay, {});
      $[140] = Wo;
    } else Wo = $[140];
    let bottom_2;
    if ($[141] !== abovePrompt || $[142] !== bottom) {
      bottom_2 = jsxProd_default_2(Box, {
        ref: de,
        flexDirection: "column",
        width: "100%",
        children: [abovePrompt, bottom, Wo],
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
      $[147] !== He ||
      $[148] !== modalScrollViewport
    ) {
      overlay =
        modal != null
          ? jsxProd_default(scrollViewportContext, {
              value: {
                rows: He,
                columns: columns - 2 * PANE_WIDTH_RESERVE,
                scrollViewport: modalScrollViewport ?? null,
                claimScrollBox: null,
              },
              children: jsxProd_default_2(Box, {
                flexDirection: "column",
                children: [
                  jsxProd_default(Box, {
                    ref: Ue,
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
                      ref: lt,
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
      $[147] = He;
      $[148] = modalScrollViewport;
      $[149] = overlay;
    } else overlay = $[149];
    let Xo;
    if ($[150] !== scrollViewport || $[151] !== scrollable_2 || $[152] !== bottom_2 || $[153] !== overlay) {
      Xo = jsxProd_default(FullscreenSlotsProvider, {
        container: de,
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
      $[154] = Xo;
    } else Xo = $[154];
    return Xo;
  }
  let Ro;
  if ($[155] !== value_6 || $[156] !== scrollable) {
    Ro = jsxProd_default(ScrollChromeContextValue, {
      value: value_6,
      children: scrollable,
    });
    $[155] = value_6;
    $[156] = scrollable;
    $[157] = Ro;
  } else Ro = $[157];
  const content = modal?.content;
  const footer = modal?.footer;
  let Lo;
  if (
    $[158] !== abovePrompt ||
    $[159] !== bottom ||
    $[160] !== Ro ||
    $[161] !== content ||
    $[162] !== footer
  ) {
    Lo = jsxProd_default_2(Fragment, {
      children: [Ro, abovePrompt, bottom, content, footer],
    });
    $[158] = abovePrompt;
    $[159] = bottom;
    $[160] = Ro;
    $[161] = content;
    $[162] = footer;
    $[163] = Lo;
  } else Lo = $[163];
  return Lo;
}
//@ chunk-ag5x7vhf.js:39089-39452 layout
function useHasVisibleNotification() {
  let $ = w(3);
  let headerGauge = useHeaderGauge();
  let x;
  if ($[0] !== headerGauge) {
    x = (T) =>
      isHeldNotice(T.notifications.current, holdsToasts(T)) &&
      !isGaugeSurface(T.notifications.current, headerGauge);
    $[0] = headerGauge;
    $[1] = x;
  } else x = $[1];
  if (useAppStateSlice(x) !== true) {
    return null;
  }
  let _;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    _ = jsxProd_default_2(Box, {
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
    $[2] = _;
  } else _ = $[2];
  return _;
}
//@ chunk-ag5x7vhf.js:39452-43160 file-local
/**
 * 管理未读分隔线：用户向上滚动后记录 dividerIndex，响应 down/pageup/pagedown/home 等按键，回到底部时清除。
 */
function useUnseenDivider(messageCount) {
  let $ = w(46);
  let { scrollViewport, maxRows, onClaim, children } = messageCount;
  let dividerYRef = Se(scrollViewportContext);
  let handleRef = R(null);
  let [D, A] = y(null);
  let V;
  if ($[0] !== onClaim) {
    V = (handle) => {
      handleRef.current = handle;
      A(handle);
      onClaim?.(handle);
    };
    $[0] = onClaim;
    $[1] = V;
  } else V = $[1];
  let claimScrollBox = V;
  let K = D !== null;
  let q = maxRows - (D ?? 0);
  let Y = R(null);
  let pe;
  if ($[2] !== scrollViewport) {
    pe = () => {
      if (scrollViewport && handleRef.current === null) {
        return scrollViewport.attach(Y.current);
      }
    };
    $[2] = scrollViewport;
    $[3] = pe;
  } else pe = $[3];
  zt(pe);
  let xe;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    xe = {
      overflows: false,
      above: false,
      below: false,
      hintTop: 0,
      hintBottom: 0,
    };
    $[4] = xe;
  } else xe = $[4];
  let [ge, Re] = y(xe);
  let We;
  if ($[5] !== q || $[6] !== scrollViewport?.handle) {
    We = () => {
      let handle = scrollViewport?.handle;
      if (!handle) {
        return;
      }
      let freshScrollHeight = handle.getFreshScrollHeight();
      let te = handle.getViewportHeight() || q;
      let me = Y.current?.getViewportTop() ?? 0;
      let se = Y.current?.getViewportHeight() ?? 0;
      let max = Math.max(0, handle.getViewportTop() - me);
      let max_2 = Math.max(0, se - max - te);
      let ve = handleRef.current !== null ? te : q;
      let Ee = freshScrollHeight > ve;
      let He = handle.getScrollTop() + handle.getPendingDelta();
      let Ue = freshScrollHeight - ve > 2;
      let lt = Ue && He > 0;
      let it = Ue && He < freshScrollHeight - te;
      Re((handle_0) =>
        handle_0.overflows === Ee &&
        handle_0.above === lt &&
        handle_0.below === it &&
        handle_0.hintTop === max &&
        handle_0.hintBottom === max_2
          ? handle_0
          : {
              overflows: Ee,
              above: lt,
              below: it,
              hintTop: max,
              hintBottom: max_2,
            },
      );
    };
    $[5] = q;
    $[6] = scrollViewport?.handle;
    $[7] = We;
  } else We = $[7];
  let tt = We;
  let ct = R(null);
  let activeElementRef = R(null);
  let { focusManager } = Se(kp);
  let Qe;
  if ($[8] !== focusManager) {
    Qe = () => {
      let Wt = ct.current;
      if (!Wt || !focusManager) {
        return;
      }
      for (
        let activeElement = focusManager.activeElement ?? undefined;
        activeElement;
        activeElement = activeElement.parentNode
      ) {
        if (activeElement === Wt) {
          activeElementRef.current = focusManager.activeElement;
          return;
        }
      }
      let pt = activeElementRef.current;
      for (let Xt = pt ?? undefined; Xt; Xt = Xt.parentNode) {
        if (Xt === Wt) {
          focusManager.focus(pt);
          return;
        }
      }
      focusManager.focus(Wt);
    };
    $[8] = focusManager;
    $[9] = Qe;
  } else Qe = $[9];
  let rt = Qe;
  let qe;
  if ($[10] !== rt) {
    qe = [rt];
    $[10] = rt;
    $[11] = qe;
  } else qe = $[11];
  P(rt, qe);
  let St;
  let dt;
  if ($[12] !== tt || $[13] !== scrollViewport) {
    St = () => {
      tt();
      return scrollViewport?.subscribe(tt);
    };
    dt = [tt, scrollViewport];
    $[12] = tt;
    $[13] = scrollViewport;
    $[14] = St;
    $[15] = dt;
  } else {
    St = $[14];
    dt = $[15];
  }
  P(St, dt);
  let Pt;
  if ($[16] !== tt || $[17] !== rt) {
    Pt = () => {
      tt();
      rt();
    };
    $[16] = tt;
    $[17] = rt;
    $[18] = Pt;
  } else Pt = $[18];
  useInterval(Pt, 50);
  const rows = dividerYRef?.rows ?? maxRows;
  const columns = dividerYRef?.columns ?? 0;
  const scrollViewport_2 = scrollViewport ?? null;
  let to;
  if ($[19] !== claimScrollBox || $[20] !== rows || $[21] !== columns || $[22] !== scrollViewport_2) {
    to = {
      rows,
      columns,
      scrollViewport: scrollViewport_2,
      claimScrollBox,
    };
    $[19] = claimScrollBox;
    $[20] = rows;
    $[21] = columns;
    $[22] = scrollViewport_2;
    $[23] = to;
  } else to = $[23];
  let value = to;
  let onKeyDown;
  if ($[24] !== q || $[25] !== scrollViewport?.handle) {
    onKeyDown = (idx) => {
      if (idx.defaultPrevented || idx.ctrl || idx.meta || idx.shift) {
        return;
      }
      let handle = scrollViewport?.handle;
      if (!handle) {
        return;
      }
      let freshScrollHeight = handle.getFreshScrollHeight();
      let Ve = handle.getViewportHeight() || q;
      let ze = handleRef.current !== null ? Ve : q;
      if (freshScrollHeight <= ze) {
        return;
      }
      if (idx.key === "up" || idx.key === "down") {
        handle.scrollBy(idx.key === "down" ? 1 : -1);
        idx.preventDefault();
      } else if (idx.key === "pageup" || idx.key === "pagedown") {
        let max = Math.max(1, ze);
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
    $[24] = q;
    $[25] = scrollViewport?.handle;
    $[26] = onKeyDown;
  } else onKeyDown = $[26];
  const height = !K && ge.overflows ? q : undefined;
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
  let oo;
  if ($[29] !== height || $[30] !== children_2) {
    oo = jsxProd_default(ScrollBoxDefault, {
      ref: Y,
      flexDirection: "column",
      flexShrink: 0,
      height,
      stickyScroll: false,
      children: children_2,
    });
    $[29] = height;
    $[30] = children_2;
    $[31] = oo;
  } else oo = $[31];
  let mo;
  if ($[32] !== ge.above || $[33] !== ge.hintTop) {
    mo =
      ge.above &&
      jsxProd_default(Box, {
        position: "absolute",
        top: ge.hintTop,
        right: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: figures_default.arrowUp,
        }),
      });
    $[32] = ge.above;
    $[33] = ge.hintTop;
    $[34] = mo;
  } else mo = $[34];
  let Jt;
  if ($[35] !== ge.below || $[36] !== ge.hintBottom) {
    Jt =
      ge.below &&
      jsxProd_default(Box, {
        position: "absolute",
        bottom: ge.hintBottom,
        right: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: figures_default.arrowDown,
        }),
      });
    $[35] = ge.below;
    $[36] = ge.hintBottom;
    $[37] = Jt;
  } else Jt = $[37];
  let children_3;
  if ($[38] !== onKeyDown || $[39] !== oo || $[40] !== mo || $[41] !== Jt) {
    children_3 = jsxProd_default_2(Box, {
      ref: ct,
      flexDirection: "column",
      flexShrink: 0,
      onKeyDown,
      children: [oo, mo, Jt],
    });
    $[38] = onKeyDown;
    $[39] = oo;
    $[40] = mo;
    $[41] = Jt;
    $[42] = children_3;
  } else children_3 = $[42];
  let Mo;
  if ($[43] !== value || $[44] !== children_3) {
    Mo = jsxProd_default(scrollViewportContext, {
      value,
      children: children_3,
    });
    $[43] = value;
    $[44] = children_3;
    $[45] = Mo;
  } else Mo = $[45];
  return Mo;
}
//@ chunk-ag5x7vhf.js:43160-43202 layout
var JUMP_TO_BOTTOM_CHORD = parseChord("ctrl+end");
var PAGE_DOWN_CHORD = parseChord("pagedown");
//@ chunk-ag5x7vhf.js:43202-44640 fingerprint = NewMessagesPill (0.615)
/**
 * "新消息"药丸：不在底部且有未读时显示 "Jump to bottom"，点击或 scroll:bottom 快捷键跳到底部。
 */
function NewMessagesPill(props) {
  let $ = w(20);
  let { count, onClick } = props;
  let [T, k] = y(false);
  let { columns } = useTerminalSize();
  let D;
  let A;
  let L;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    A = getShortcutDisplayPlatform();
    D = chordToDisplayString(JUMP_TO_BOTTOM_CHORD, A);
    L = chordToDisplayString(PAGE_DOWN_CHORD, A);
    $[0] = D;
    $[1] = A;
    $[2] = L;
  } else {
    D = $[0];
    A = $[1];
    L = $[2];
  }
  let V = L;
  let shortcutDisplay = useShortcutDisplay("scroll:bottom", "Scroll", D);
  let shortcutDisplay_2 = useShortcutDisplay("scroll:pageDown", "Scroll", V);
  let K = yt(subscribeFullscreenObserved, hasFullscreenBeenObserved);
  let q;
  if ($[3] !== count) {
    q = count > 0 ? `${count} new ${plural(count, "message")}` : "Jump to bottom";
    $[3] = count;
    $[4] = q;
  } else q = $[4];
  let Y = q;
  let pe = A === "macos" && (shortcutDisplay === "" || shortcutDisplay === D);
  let xe = isMouseTrackingEnabled() === "full" && K;
  let ge = shortcutDisplay_2 === V ? `fn+${figures_default.arrowDown}` : shortcutDisplay_2;
  let Re;
  if (pe && xe) Re = `${Y} (click) ${figures_default.arrowDown}`;
  else if (pe && ge) Re = `${Y}: ${ge} to scroll`;
  else if (shortcutDisplay) Re = `${Y} (${shortcutDisplay}) ${figures_default.arrowDown}`;
  else Re = `${Y} ${figures_default.arrowDown}`;
  let We = columns - 2;
  const fe = `${Y} ${figures_default.arrowDown}`;
  let Fe;
  if ($[5] !== We || $[6] !== Re || $[7] !== Y || $[8] !== fe) {
    let te = [Re, fe, Y];
    Fe = te.find((me) => bunStringWidth(me) <= We) ?? Y;
    $[5] = We;
    $[6] = Re;
    $[7] = Y;
    $[8] = fe;
    $[9] = Fe;
  } else Fe = $[9];
  let children = Fe;
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
    onMouseEnter = () => k(true);
    onMouseLeave = () => k(false);
    $[12] = onMouseEnter;
    $[13] = onMouseLeave;
  } else {
    onMouseEnter = $[12];
    onMouseLeave = $[13];
  }
  const color = T ? "userMessageBackgroundHover" : "userMessageBackground";
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
  let Ue;
  if ($[17] !== onClick_2 || $[18] !== children_2) {
    Ue = jsxProd_default(Box, {
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
    $[19] = Ue;
  } else Ue = $[19];
  return Ue;
}
//@ chunk-ag5x7vhf.js:44640-45388 fingerprint = StickyPromptHeader (0.796)
/**
 * 全屏滚动时置顶显示当前可见区域对应的用户提示（StickyPromptHeader）。
 */
function StickyPromptHeader(props) {
  let $ = w(13);
  let { text, onClick, leftMargin } = props;
  let [hover, setHover] = y(false);
  let D;
  if ($[0] !== leftMargin) {
    D =
      leftMargin > 0 &&
      jsxProd_default(NoSelect, {
        fromLeftEdge: true,
        minWidth: leftMargin,
      });
    $[0] = leftMargin;
    $[1] = D;
  } else D = $[1];
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
  let z;
  if ($[6] !== onClick || $[7] !== backgroundColor || $[8] !== children) {
    z = jsxProd_default(Box, {
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
    $[9] = z;
  } else z = $[9];
  let K;
  if ($[10] !== D || $[11] !== z) {
    K = jsxProd_default_2(Box, {
      flexShrink: 0,
      width: "100%",
      height: 1,
      flexDirection: "row",
      children: [D, z],
    });
    $[10] = D;
    $[11] = z;
    $[12] = K;
  } else K = $[12];
  return K;
}
//@ chunk-ag5x7vhf.js:45388-45658 fingerprint = DialogOverlay (0.554)
function DialogOverlay(props) {
  let $ = w(4);
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
//@ chunk-ag5x7vhf.js:45658-46504 fingerprint = SuggestionsOverlay (0.783)
function SuggestionsOverlay(props) {
  let $ = w(10);
  let { rowsAbove } = props;
  let x = rowsAbove === undefined ? 0 : rowsAbove;
  let data = useFullscreenSlotData();
  let fullscreenSlotDialog = useFullscreenSlotDialog();
  let anchorTopMargin = useAnchorTopMargin();
  let marginBottom = x > 0 ? x : -anchorTopMargin;
  let D = data !== null && (data.suggestions.length > 0 || !!data.emptyMessage);
  let L;
  if ($[0] !== data || $[1] !== marginBottom || $[2] !== D) {
    L =
      D &&
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
    $[2] = D;
    $[3] = L;
  } else L = $[3];
  let V;
  if ($[4] !== fullscreenSlotDialog || $[5] !== marginBottom) {
    V = fullscreenSlotDialog
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
    $[6] = V;
  } else V = $[6];
  let W;
  if ($[7] !== L || $[8] !== V) {
    W = jsxProd_default_2(Fragment, {
      children: [L, V],
    });
    $[7] = L;
    $[8] = V;
    $[9] = W;
  } else W = $[9];
  return W;
}
//@ chunk-ag5x7vhf.js:46504-46508 placement
init_react_production();
//@ chunk-ag5x7vhf.js:46508-46512 placement
init_react_production();
//@ chunk-ag5x7vhf.js:46512-46516 placement
init_react_production();
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
