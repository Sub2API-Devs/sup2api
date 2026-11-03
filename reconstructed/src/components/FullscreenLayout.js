/**
 * components/FullscreenLayout.tsx
 *
 * 全屏布局：滚动区 + 底部输入区 + 侧栏/坞，提供 ScrollChromeContext、未读分隔线、"新消息"跳底药丸、置顶提示头、对话框/建议浮层。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FullscreenLayout.tsx
 * pieces: chunk-ag5x7vhf.js (57)
 * attribution: placement 34, sole-consumer 5, affinity 1, fingerprint 8, layout 7, file-local 2
 */
import { createStore } from "../state/store.js";
import { BH } from "../state/sliceHelpers.js";
import { qt, y, R, Se, P, j, yt, zt } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { topWithin, measureElement } from "../ink/hooks/useTerminalHooks.js";
import { useMeasured, useSelection, useInterval, NoSelect } from "../ink/components/Input.js";
import { calculateFeedWidth } from "./LogoV2/Feed.js";
import { isHiddenAttachmentMessage } from "./messages/nullRenderingAttachments.js";
import { Cb } from "../services/orgMemory/promptIndex.js";
import { Text, Box } from "../ink/components/Text.js";
import { fmt } from "../constants/xml.js";
import { subscribeScrollTraceLive, isScrollTraceDemoRuler } from "../ink/widest-line.js";
import { ScrollTestFiller } from "./ContextVisualization.js";
import { openClickedLink } from "../utils/browser.js";
import { isFullscreenEnvEnabled, UVe, FVe, isMouseTrackingEnabled } from "../utils/fullscreen.js";
import { di } from "../ink/terminal.js";
import { isSignedThinkingBlock } from "../utils/collapseReadSearch.js";
import { isReinjectedListingAttachment } from "../services/compact/compact.js";
import { hasStringUuid } from "../bridge/inboundMessages.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { Qtn, xyo, Ztn, PromptToast } from "./PromptInput/Notifications.js";
import { WWe, P0t, bRr } from "../context/overlayContext.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { isDecstbmRendererEnabled } from "../ink/nativeCursor.js";
import { rs, gM } from "../state/AppState.js";
import { shouldShowNotice } from "./SlashCommandLink.js";
import { lTe } from "./Spinner/SpinnerColumn.js";
import { resolveSetting } from "../utils/settings/userIntentSettings.js";
import { TerminalSizeContext } from "../ink/terminalModes.js";
import { LI } from "../ink/components/ScrollBox.js";
import { ContextSlotA, u0t } from "../context/contextSlots.js";
import { $E } from "./ScrollViewportContext.js";
import { l5 } from "./design-system/Pane.js";
import { Divider } from "./design-system/Divider.js";
import { FullscreenLayoutView } from "./_new/FullscreenLayoutView.js";
import { pTe, bye, Kj, KDe } from "../context/notifications.js";
import { kp } from "../../vendor/convert-to-spaces/dist/index.js";
import { re } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { parseChord, chordToDisplayString } from "../keybindings/parser.js";
import { getShortcutDisplayPlatform } from "../utils/keyboardShortcuts.js";
import { useShortcutDisplay } from "../keybindings/useShortcutDisplay.js";
import { plural } from "../utils/stringUtils.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { P$o } from "../utils/scrollTelemetry.js";
import { TagTabs } from "./TagTabs.js";
import { Ryo } from "./PromptInput/PromptInputFooterSuggestions.js";

//@ chunk-ag5x7vhf.js:9697-9723 placement
function MT() {
  return null;
}
//@ chunk-ag5x7vhf.js:9723-9754 placement
var wT = { data: null, dialog: null };
//@ chunk-ag5x7vhf.js:9754-9861 placement
function createFullscreenSlots() {
  let m = createStore(wT);
  return { store: m, setData: BH(m.setState, "data"), setDialog: BH(m.setState, "dialog") };
}
//@ chunk-ag5x7vhf.js:9861-9877 placement
var FullscreenSlotsContext = qt(null);
//@ chunk-ag5x7vhf.js:9877-10140 placement
function FullscreenSlotsProvider(m) {
  let _ = w(6),
    { container: container, children: children } = m,
    [T] = y(createFullscreenSlots),
    k = R(null),
    I;
  if (_[0] !== T || _[1] !== container)
    ((I = { ...T, anchor: k, container: container }), (_[0] = T), (_[1] = container), (_[2] = I));
  else I = _[2];
  let D = I,
    A;
  if (_[3] !== children || _[4] !== D)
    ((A = e(FullscreenSlotsContext, { value: D, children: children })),
      (_[3] = children),
      (_[4] = D),
      (_[5] = A));
  else A = _[5];
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
/**
 * 测量锚点在容器中的顶部位置，等于其上外边距时返回该值，否则为 0。
 */
//@ chunk-ag5x7vhf.js:10402-10738 placement
function useAnchorTopMargin() {
  let h = w(3),
    m = Se(FullscreenSlotsContext),
    x;
  if (h[0] !== m?.anchor || h[1] !== m?.container?.current)
    ((x = () => {
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
    }),
      (h[0] = m?.anchor),
      (h[1] = m?.container?.current),
      (h[2] = x));
  else x = h[2];
  return useMeasured(x);
}
//@ chunk-ag5x7vhf.js:10738-10785 placement
function rAr() {
  return useStoreSelector(Se(FullscreenSlotsContext)?.store, calculateFeedWidth) ?? !1;
}
//@ chunk-ag5x7vhf.js:10785-11045 placement
function useSetSlot(m, h) {
  let x = w(7),
    T,
    k;
  if (x[0] !== m || x[1] !== h)
    ((T = () => {
      if (!m) {
        return;
      }
      m(() => h);
    }),
      (k = [m, h]),
      (x[0] = m),
      (x[1] = h),
      (x[2] = T),
      (x[3] = k));
  else ((T = x[2]), (k = x[3]));
  P(T, k);
  let _, I;
  if (x[4] !== m)
    ((_ = () => {
      if (!m) {
        return;
      }
      return () => {
        m(MT);
      };
    }),
      (I = [m]),
      (x[4] = m),
      (x[5] = _),
      (x[6] = I));
  else ((_ = x[5]), (I = x[6]));
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
j();
//@ chunk-ag5x7vhf.js:22083-22097 placement
var dtn = qt(0);
//@ chunk-ag5x7vhf.js:22097-22101 placement
j();
//@ chunk-ag5x7vhf.js:22101-22115 placement
var ctn = qt(0);
//@ chunk-ag5x7vhf.js:22115-22119 placement
j();
//@ chunk-ag5x7vhf.js:22119-22181 placement
function debugColor(m) {
  return `rgb(${m & 255},${(m >> 8) & 255},${(m >> 16) & 255})`;
}
//@ chunk-ag5x7vhf.js:22181-22436 placement
var DEBUG_COLOR_COUNT = 64,
  DEBUG_ALT_COLOR_COUNT = 64,
  DEBUG_COLORS = Array.from({ length: DEBUG_COLOR_COUNT }, (m, h) => debugColor(h * 2043453)),
  DEBUG_ALT_COLORS = Array.from({ length: DEBUG_ALT_COLOR_COUNT }, (m, h) =>
    debugColor(h * 461587 + 8405034),
  ),
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
  ],
  GLYPH_RANGE_TOTAL = GLYPH_RANGES.reduce((m, [, h]) => m + h, 0);
//@ chunk-ag5x7vhf.js:24486-24758 placement
function isInvisibleMessage(m) {
  switch (m.type) {
    case "attachment":
      return isHiddenAttachmentMessage(m);
    case "assistant": {
      let content = m.message.content;
      if (content.length === 0) return !1;
      for (let x of content) {
        if (x.type !== "thinking") return !1;
        let thinking = x.thinking;
        if (thinking !== "" && !(thinking.startsWith("<") && Cb(thinking) === "")) return !1;
      }
      return !0;
    }
    default:
      return !1;
  }
}
//@ chunk-ag5x7vhf.js:24758-24762 placement
j();
//@ chunk-ag5x7vhf.js:24762-24790 placement
function gB(So) {
  return So + 1;
}
//@ chunk-ag5x7vhf.js:24790-24828 placement
function hB(Yt) {
  return Yt.kind === "in";
}
//@ chunk-ag5x7vhf.js:24828-24927 placement = _temp2 (0.818)
function yB(line_0, i_1) {
  return e(Text, { dimColor: !0, wrap: "truncate-end", children: fmt(line_0) }, `${line_0.ts}-${i_1}`);
}
//@ chunk-ag5x7vhf.js:24927-24987 placement
function SB(fe, Fe) {
  return e(Text, { dimColor: !0, children: fe }, Fe);
}
//@ chunk-ag5x7vhf.js:24987-25012 placement
var JT = 25,
  QT = 80,
  mB = JT * QT;
//@ chunk-ag5x7vhf.js:25012-25016 placement
j();
//@ chunk-ag5x7vhf.js:25141-25247 placement
function ScrollTraceRuler() {
  let h = w(2),
    m = yt(subscribeScrollTraceLive, isScrollTraceDemoRuler),
    x;
  if (h[0] !== m) ((x = m ? e(ScrollTestFiller, {}) : null), (h[0] = m), (h[1] = x));
  else x = h[1];
  return x;
}
//@ chunk-ag5x7vhf.js:27676-27704 sole-consumer
function bM() {
  return createStore([]);
}
//@ chunk-ag5x7vhf.js:27704-27751 sole-consumer
function SM(Yc, Ls) {
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
function TM(tr) {
  openClickedLink(tr);
}
//@ chunk-ag5x7vhf.js:27839-28016 fingerprint = _temp3 (0.652)
function repaintFullscreenInk() {
  if (!isFullscreenEnvEnabled()) {
    return;
  }
  let ink = di().get(process.stdout);
  if (!ink) {
    return;
  }
  return (
    (ink.onHyperlinkClick = TM),
    () => {
      ((ink.onHyperlinkClick = void 0), (ink.fileHyperlinkOpensInPanel = void 0));
    }
  );
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
  let m = createStore(null);
  return {
    sticky: m,
    chrome: {
      setStickyPrompt: (h) => {
        m.setState(() => h);
      },
    },
  };
}
/**
 * 统计未读分隔线之后的助手回合数（跳过 progress 与无可见文本的助手消息）。
 */
//@ chunk-ag5x7vhf.js:28367-28562 layout = countUnseenAssistantTurns (1)
function countUnseenAssistantTurns(messages, dividerIndex) {
  let count = 0,
    T = !1;
  for (let k = dividerIndex; k < messages.length; k++) {
    let _ = messages[k];
    if (_.type === "progress") continue;
    if (_.type === "assistant" && !assistantHasVisibleText(_)) continue;
    let isAssistant = _.type === "assistant";
    if (isAssistant && !T) count++;
    T = isAssistant;
  }
  return count;
}
//@ chunk-ag5x7vhf.js:28562-28694 file-local
function assistantHasVisibleText(m) {
  if (m.type !== "assistant") return !1;
  for (let h of m.message.content) if (h.type === "text" && h.text?.trim()) return !0;
  return !1;
}
//@ chunk-ag5x7vhf.js:28694-28881 layout = countToolCallsSince (1)
function countToolCallsSince(m) {
  if (m.type !== "assistant" || m.message.content.length === 0) return !1;
  for (let h of m.message.content) {
    if (h.type === "text" || h.type === "tool_use") return !1;
    if (isSignedThinkingBlock(h)) return !1;
  }
  return !0;
}
/**
 * 根据最后一次已读位置计算未读分隔线（位置与计数），跳过 progress/attachment。
 */
//@ chunk-ag5x7vhf.js:28881-29232 fingerprint = computeUnseenDivider (0.78)
function computeUnseenDivider(m, h, x) {
  if (h === null) return;
  let anchorIdx = h,
    k = -1;
  while (anchorIdx < m.length) {
    let D = m[anchorIdx];
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
  if (anchorIdx >= m.length && k !== -1) anchorIdx = k;
  let _ = m[anchorIdx];
  if (!hasStringUuid(_)) return;
  let count = countUnseenAssistantTurns(m, h);
  return { firstUnseenUuid: _.uuid, count: Math.max(1, count) };
}
/**
 * 全屏布局组件：scrollable 槽（消息列表）放在 ScrollBox 中并提供 ScrollChromeContext；底部 bottom/abovePrompt 槽、可选 sidebar/dock；未读分隔线、"新消息"药丸、置顶提示头、modal/对话框浮层与建议浮层。
 */
//@ chunk-ag5x7vhf.js:29232-39089 fingerprint = FullscreenLayout (0.489)
function FullscreenLayout(t0) {
  let $ = w(164),
    {
      scrollable: scrollable,
      sidebar: sidebar,
      sidebarWidth: sidebarWidth,
      dock: dock,
      dockWidth: dockWidth,
      dockTail: dockTail,
      top: top,
      header: header,
      abovePrompt: abovePrompt,
      bottom: bottom,
      modal: modal,
      modalScrollViewport: modalScrollViewport,
      scrollViewport: scrollViewport,
      unseen: unseen,
      hidePill: t1,
      hideSticky: t2,
      transcriptOverlay: transcriptOverlay,
    } = t0,
    ge = sidebarWidth === void 0 ? 0 : sidebarWidth,
    Re = dockWidth === void 0 ? 0 : dockWidth,
    We = t1 === void 0 ? !1 : t1,
    fe = t2 === void 0 ? !1 : t2,
    Fe = useTerminalSize(),
    { rows: rows, columns: columns } = Fe,
    se = header != null && rows >= Qtn,
    _e = rows - (se ? xyo : 0),
    ve;
  if ($[0] !== _e || $[1] !== columns || $[2] !== se || $[3] !== Fe)
    ((ve = se ? { columns: columns, rows: _e } : Fe),
      ($[0] = _e),
      ($[1] = columns),
      ($[2] = se),
      ($[3] = Fe),
      ($[4] = ve));
  else ve = $[4];
  let Ee = ve,
    He = _e - WWe - 1,
    Ue = R(null),
    lt = R(null),
    [it, ae] = y(null),
    tt = modal?.footer != null,
    ct;
  if ($[5] === MEMO_CACHE_SENTINEL) ((ct = isDecstbmRendererEnabled()), ($[5] = ct));
  else ct = $[5];
  let Je = ct,
    $e;
  if ($[6] !== tt || $[7] !== it || $[8] !== He || $[9] !== rows)
    (($e = () => {
      let Qe = Ue.current;
      let Wt = lt.current;
      if (!tt || (!Je && (it === null || it <= 0)) || Qe === null || Wt === null) {
        return !0;
      }
      return measureElement(Qe).height + measureElement(Wt).height <= (Je ? rows : He);
    }),
      ($[6] = tt),
      ($[7] = it),
      ($[8] = He),
      ($[9] = rows),
      ($[10] = $e));
  else $e = $[10];
  let Ze = useMeasured($e);
  const max = Math.max(1, columns - ge - Re);
  let Xt;
  if ($[11] !== _e || $[12] !== max)
    ((Xt = { columns: max, rows: _e }), ($[11] = _e), ($[12] = max), ($[13] = Xt));
  else Xt = $[13];
  let rt = Xt,
    qe = dock != null && Re > 0;
  const max_2 = Math.max(1, columns - Re);
  let dt;
  if ($[14] !== _e || $[15] !== max_2)
    ((dt = { columns: max_2, rows: _e }), ($[14] = _e), ($[15] = max_2), ($[16] = dt));
  else dt = $[16];
  let Pt = dt,
    Ot = P0t(),
    It = bRr(),
    kt = Ot || It ? _e - WWe : Math.floor(_e / 2),
    to = R(null),
    de = R(null),
    le = R(null),
    Be = R(null),
    st;
  if ($[17] === MEMO_CACHE_SENTINEL)
    ((st = () => (Be.current === null ? 0 : measureElement(Be.current).height)), ($[17] = st));
  else st = $[17];
  let Ge = useMeasured(st),
    max_3 = Math.max(0, kt - Ge),
    ze = modal?.visible ?? !1,
    At;
  if ($[18] !== kt || $[19] !== ze)
    ((At = () =>
      ze || to.current === null
        ? null
        : kt -
          measureElement(to.current).height -
          (le.current === null ? 0 : measureElement(le.current).height)),
      ($[18] = kt),
      ($[19] = ze),
      ($[20] = At));
  else At = $[20];
  let ut = At,
    [jt] = y(bM),
    oo = useStoreSelector(jt),
    mo;
  if ($[21] !== jt)
    ((mo = (Jt) => (
      jt.setState((Gt) => [...Gt, Jt]),
      () => jt.setState((Mo) => Mo.filter((Vo) => Vo !== Jt))
    )),
      ($[21] = jt),
      ($[22] = mo));
  else mo = $[22];
  let Po = mo,
    So;
  if ($[23] !== ut || $[24] !== oo)
    ((So = () => {
      let Yt = ut();
      return Yt === null ? null : oo.reduce(SM, Yt);
    }),
      ($[23] = ut),
      ($[24] = oo),
      ($[25] = So));
  else So = $[25];
  let Qt = So,
    [ne] = y(ScrollChromeContext),
    ee = useStoreSelector(ne.sticky),
    chrome = ne.chrome,
    Ce = rs(selectVerbose) ?? !1,
    et = shouldShowNotice(Ce) ? lTe : 0,
    Ke;
  if ($[26] !== scrollViewport || $[27] !== unseen)
    ((Ke = (listener) => {
      let je = scrollViewport?.subscribe(listener) ?? noop;
      let Xe = unseen?.subscribe(listener) ?? noop_2;
      return () => {
        (je(), Xe());
      };
    }),
      ($[26] = scrollViewport),
      ($[27] = unseen),
      ($[28] = Ke));
  else Ke = $[28];
  let Et = Ke,
    Ct;
  if ($[29] === MEMO_CACHE_SENTINEL) ((Ct = resolveSetting("autoScrollEnabled", !0)), ($[29] = Ct));
  else Ct = $[29];
  let bt = Ct.value,
    _t;
  if ($[30] !== scrollViewport?.handle || $[31] !== unseen)
    ((_t = () => {
      let xt = scrollViewport?.handle;
      if (!xt) {
        return !1;
      }
      if (xt.isSticky()) {
        return !1;
      }
      let $t = xt.getScrollTop() + xt.getPendingDelta() + xt.getViewportHeight();
      let dividerY = unseen?.getSnapshot().dividerY;
      if (dividerY != null) {
        return $t < dividerY && $t < xt.getScrollHeight();
      }
      return !bt && $t < xt.getScrollHeight();
    }),
      ($[30] = scrollViewport?.handle),
      ($[31] = unseen),
      ($[32] = _t));
  else _t = $[32];
  let pillVisible = yt(Et, _t),
    Yo = useStoreSelector(unseen, selectUnseenDividerCount) ?? 0,
    { clearSelection: clearSelection } = useSelection(),
    Li,
    Gc;
  if ($[33] !== clearSelection || $[34] !== ze)
    ((Li = () => {
      if (!ze) {
        return;
      }
      return clearSelection;
    }),
      (Gc = [ze, clearSelection]),
      ($[33] = clearSelection),
      ($[34] = ze),
      ($[35] = Li),
      ($[36] = Gc));
  else ((Li = $[35]), (Gc = $[36]));
  zt(Li, Gc);
  let Oi = Se(gM),
    $c;
  if ($[37] !== Oi) (($c = [Oi]), ($[37] = Oi), ($[38] = $c));
  else $c = $[38];
  if ((zt(repaintFullscreenInk, $c), isFullscreenEnvEnabled())) {
    let ko = fe ? null : ee;
    let jn = ko != null && ko !== "clicked" ? ko : null;
    let Gn = ko != null;
    let Ro;
    if ($[39] !== header || $[40] !== Fe)
      ((Ro =
        header != null &&
        e(Box, {
          flexShrink: 0,
          width: "100%",
          children: e(TerminalSizeContext, { value: Fe, children: header }),
        })),
        ($[39] = header),
        ($[40] = Fe),
        ($[41] = Ro));
    else Ro = $[41];
    let wo;
    if ($[42] !== jn || $[43] !== et)
      ((wo = jn && e(StickyPromptHeader, { text: jn.text, onClick: jn.scrollTo, leftMargin: et })),
        ($[42] = jn),
        ($[43] = et),
        ($[44] = wo));
    else wo = $[44];
    const Wo = scrollViewport?.attach;
    const Lo = Gn ? 0 : 1;
    let mn;
    if ($[45] === MEMO_CACHE_SENTINEL) ((mn = e(ScrollTraceRuler, {})), ($[45] = mn));
    else mn = $[45];
    let Xo;
    if ($[46] !== chrome || $[47] !== scrollable)
      ((Xo = r(ScrollChromeContextValue, { value: chrome, children: [scrollable, mn] })),
        ($[46] = chrome),
        ($[47] = scrollable),
        ($[48] = Xo));
    else Xo = $[48];
    let $n;
    if ($[49] !== Wo || $[50] !== Lo || $[51] !== Xo)
      (($n = e(LI, {
        ref: Wo,
        flexGrow: 1,
        flexDirection: "column",
        paddingTop: Lo,
        stickyScroll: !0,
        followGrowth: bt,
        children: Xo,
      })),
        ($[49] = Wo),
        ($[50] = Lo),
        ($[51] = Xo),
        ($[52] = $n));
    else $n = $[52];
    let Kn;
    if ($[53] !== We || $[54] !== Yo || $[55] !== pillVisible || $[56] !== unseen?.jumpToNew)
      ((Kn = !We && pillVisible && e(NewMessagesPill, { count: Yo, onClick: unseen?.jumpToNew })),
        ($[53] = We),
        ($[54] = Yo),
        ($[55] = pillVisible),
        ($[56] = unseen?.jumpToNew),
        ($[57] = Kn));
    else Kn = $[57];
    const _r = jn ? 1 : 0;
    let qn;
    if ($[58] !== _r || $[59] !== transcriptOverlay)
      ((qn = e(dtn, { value: _r, children: transcriptOverlay })),
        ($[58] = _r),
        ($[59] = transcriptOverlay),
        ($[60] = qn));
    else qn = $[60];
    let Xn;
    if ($[61] !== wo || $[62] !== $n || $[63] !== Kn || $[64] !== qn || $[65] !== top)
      ((Xn = r(Box, {
        flexGrow: 1,
        flexDirection: "column",
        overflow: "hidden",
        children: [top, wo, $n, Kn, qn, !1, !1],
      })),
        ($[61] = wo),
        ($[62] = $n),
        ($[63] = Kn),
        ($[64] = qn),
        ($[65] = top),
        ($[66] = Xn));
    else Xn = $[66];
    let Jn;
    if ($[67] !== rt || $[68] !== Xn)
      ((Jn = e(TerminalSizeContext, { value: rt, children: Xn })), ($[67] = rt), ($[68] = Xn), ($[69] = Jn));
    else Jn = $[69];
    let wn;
    if ($[70] !== sidebar || $[71] !== ge)
      ((wn =
        sidebar != null &&
        (ge > 0
          ? e(Box, {
              width: ge,
              flexShrink: 0,
              flexDirection: "column",
              overflow: "hidden",
              backgroundColor: "composerSidebarBackground",
              children: sidebar,
            })
          : sidebar)),
        ($[70] = sidebar),
        ($[71] = ge),
        ($[72] = wn));
    else wn = $[72];
    let Ui;
    if ($[73] !== Jn || $[74] !== wn)
      ((Ui = r(Box, { flexGrow: 1, flexDirection: "row", overflow: "hidden", children: [Jn, wn] })),
        ($[73] = Jn),
        ($[74] = wn),
        ($[75] = Ui));
    else Ui = $[75];
    const qc = ze ? "none" : "flex";
    let Qn;
    if ($[76] !== abovePrompt || $[77] !== Qt)
      ((Qn = e(Box, {
        ref: le,
        flexDirection: "column",
        flexShrink: 0,
        width: "100%",
        children: e(ContextSlotA, { value: Qt, children: abovePrompt }),
      })),
        ($[76] = abovePrompt),
        ($[77] = Qt),
        ($[78] = Qn));
    else Qn = $[78];
    let Ir;
    if ($[79] !== kt || $[80] !== qc || $[81] !== Qn)
      ((Ir = e(Box, {
        ref: Be,
        flexDirection: "column",
        flexShrink: 0,
        width: "100%",
        maxHeight: kt,
        overflowY: "hidden",
        display: qc,
        children: Qn,
      })),
        ($[79] = kt),
        ($[80] = qc),
        ($[81] = Qn),
        ($[82] = Ir));
    else Ir = $[82];
    let Hi;
    if ($[83] !== Pt || $[84] !== Ir)
      ((Hi = e(TerminalSizeContext, { value: Pt, children: Ir })), ($[83] = Pt), ($[84] = Ir), ($[85] = Hi));
    else Hi = $[85];
    let _s;
    if ($[86] !== Ui || $[87] !== Hi)
      ((_s = r(Box, { flexGrow: 1, flexDirection: "column", overflow: "hidden", children: [Ui, Hi] })),
        ($[86] = Ui),
        ($[87] = Hi),
        ($[88] = _s));
    else _s = $[88];
    let Is;
    if ($[89] !== dock || $[90] !== Re || $[91] !== qe)
      ((Is =
        dock != null &&
        e(Box, {
          width: Re,
          flexShrink: 0,
          flexDirection: "column",
          overflow: "hidden",
          display: qe ? "flex" : "none",
          children: dock,
        })),
        ($[89] = dock),
        ($[90] = Re),
        ($[91] = qe),
        ($[92] = Is));
    else Is = $[92];
    let Es;
    if ($[93] !== _s || $[94] !== Is)
      ((Es = r(Box, { flexGrow: 1, flexDirection: "row", overflow: "hidden", children: [_s, Is] })),
        ($[93] = _s),
        ($[94] = Is),
        ($[95] = Es));
    else Es = $[95];
    const Ds = ze ? "none" : "flex";
    const Vi = qe ? Re : 0;
    let Wi;
    if ($[96] !== bottom || $[97] !== Vi)
      ((Wi = e(ctn, { value: Vi, children: bottom })), ($[96] = bottom), ($[97] = Vi), ($[98] = Wi));
    else Wi = $[98];
    let ji;
    if ($[99] !== Po || $[100] !== Wi)
      ((ji = e(u0t, { value: Po, children: Wi })), ($[99] = Po), ($[100] = Wi), ($[101] = ji));
    else ji = $[101];
    let zi;
    if ($[102] !== ut || $[103] !== ji)
      ((zi = e(Box, {
        ref: to,
        flexDirection: "column",
        width: "100%",
        flexGrow: 1,
        flexShrink: 0,
        overflowY: "hidden",
        children: e(ContextSlotA, { value: ut, children: ji }),
      })),
        ($[102] = ut),
        ($[103] = ji),
        ($[104] = zi));
    else zi = $[104];
    let Gi;
    if ($[105] !== dockTail || $[106] !== Re || $[107] !== qe)
      ((Gi = qe && e(DialogOverlay, { width: Re, children: dockTail })),
        ($[105] = dockTail),
        ($[106] = Re),
        ($[107] = qe),
        ($[108] = Gi));
    else Gi = $[108];
    let Zn;
    if ($[109] !== Ge) ((Zn = e(SuggestionsOverlay, { rowsAbove: Ge })), ($[109] = Ge), ($[110] = Zn));
    else Zn = $[110];
    let Er;
    if ($[111] !== max_3 || $[112] !== Ds || $[113] !== zi || $[114] !== Gi || $[115] !== Zn)
      ((Er = r(Box, {
        ref: de,
        flexDirection: "column",
        flexShrink: 0,
        width: "100%",
        maxHeight: max_3,
        display: Ds,
        children: [zi, Gi, Zn],
      })),
        ($[111] = max_3),
        ($[112] = Ds),
        ($[113] = zi),
        ($[114] = Gi),
        ($[115] = Zn),
        ($[116] = Er));
    else Er = $[116];
    let Dr;
    if (
      $[117] !== _e ||
      $[118] !== columns ||
      $[119] !== modal ||
      $[120] !== Ze ||
      $[121] !== He ||
      $[122] !== modalScrollViewport ||
      $[123] !== ze
    )
      ((Dr =
        modal != null &&
        e($E, {
          value: {
            rows: He,
            columns: columns - 2 * l5,
            scrollViewport: modalScrollViewport ?? null,
            claimScrollBox: null,
          },
          children: r(Box, {
            flexShrink: 0,
            width: "100%",
            maxHeight: _e - WWe,
            flexDirection: "column",
            overflow: "hidden",
            display: ze ? "flex" : "none",
            children: [
              r(Box, {
                flexShrink: 0,
                flexDirection: "row",
                height: 1,
                overflow: "hidden",
                children: [
                  e(Box, {
                    flexGrow: 1,
                    flexShrink: 1,
                    overflow: "hidden",
                    children: e(Divider, { color: "permission", char: "\u2594" }),
                  }),
                  e(useHasVisibleNotification, {}),
                ],
              }),
              e(Box, {
                flexDirection: "column",
                flexShrink: 1,
                overflow: "hidden",
                children: e(Box, {
                  ref: Ue,
                  flexDirection: "column",
                  flexShrink: 0,
                  children: e(useUnseenDivider, {
                    scrollViewport: modalScrollViewport,
                    maxRows: He,
                    onClaim: ae,
                    children: modal.content,
                  }),
                }),
              }),
              e(Box, {
                flexDirection: "column",
                flexShrink: 0,
                overflow: "hidden",
                height: Ze ? void 0 : 0,
                children: e(Box, { ref: lt, flexDirection: "column", flexShrink: 0, children: modal.footer }),
              }),
            ],
          }),
        })),
        ($[117] = _e),
        ($[118] = columns),
        ($[119] = modal),
        ($[120] = Ze),
        ($[121] = He),
        ($[122] = modalScrollViewport),
        ($[123] = ze),
        ($[124] = Dr));
    else Dr = $[124];
    let er;
    if ($[125] !== Ro || $[126] !== Es || $[127] !== Er || $[128] !== Dr)
      ((er = r(FullscreenSlotsProvider, { container: de, children: [Ro, Es, Er, Dr] })),
        ($[125] = Ro),
        ($[126] = Es),
        ($[127] = Er),
        ($[128] = Dr),
        ($[129] = er));
    else er = $[129];
    let Rn = er;
    const Ns = se ? rows : null;
    let Ps;
    if ($[130] !== Ee || $[131] !== Rn)
      ((Ps = e(TerminalSizeContext, { value: Ee, children: Rn })),
        ($[130] = Ee),
        ($[131] = Rn),
        ($[132] = Ps));
    else Ps = $[132];
    let _o;
    if ($[133] !== Ns || $[134] !== Ps)
      ((_o = e(Ztn, { value: Ns, children: Ps })), ($[133] = Ns), ($[134] = Ps), ($[135] = _o));
    else _o = $[135];
    return _o;
  }
  if (isDecstbmRendererEnabled()) {
    let Ro;
    if ($[136] === MEMO_CACHE_SENTINEL) ((Ro = e(ScrollTraceRuler, {})), ($[136] = Ro));
    else Ro = $[136];
    let wo;
    if ($[137] !== chrome || $[138] !== scrollable)
      ((wo = r(ScrollChromeContextValue, { value: chrome, children: [scrollable, Ro] })),
        ($[137] = chrome),
        ($[138] = scrollable),
        ($[139] = wo));
    else wo = $[139];
    let Wo;
    if ($[140] === MEMO_CACHE_SENTINEL) ((Wo = e(SuggestionsOverlay, {})), ($[140] = Wo));
    else Wo = $[140];
    let Lo;
    if ($[141] !== abovePrompt || $[142] !== bottom)
      ((Lo = r(Box, {
        ref: de,
        flexDirection: "column",
        width: "100%",
        children: [abovePrompt, bottom, Wo],
      })),
        ($[141] = abovePrompt),
        ($[142] = bottom),
        ($[143] = Lo));
    else Lo = $[143];
    let mn;
    if (
      $[144] !== columns ||
      $[145] !== modal ||
      $[146] !== Ze ||
      $[147] !== He ||
      $[148] !== modalScrollViewport
    )
      ((mn =
        modal != null
          ? e($E, {
              value: {
                rows: He,
                columns: columns - 2 * l5,
                scrollViewport: modalScrollViewport ?? null,
                claimScrollBox: null,
              },
              children: r(Box, {
                flexDirection: "column",
                children: [
                  e(Box, { ref: Ue, flexDirection: "column", paddingX: l5, children: modal.content }),
                  e(Box, {
                    flexDirection: "column",
                    flexShrink: 0,
                    overflow: "hidden",
                    height: Ze ? void 0 : 0,
                    children: e(Box, {
                      ref: lt,
                      flexDirection: "column",
                      flexShrink: 0,
                      children: modal.footer,
                    }),
                  }),
                ],
              }),
            })
          : null),
        ($[144] = columns),
        ($[145] = modal),
        ($[146] = Ze),
        ($[147] = He),
        ($[148] = modalScrollViewport),
        ($[149] = mn));
    else mn = $[149];
    let Xo;
    if ($[150] !== scrollViewport || $[151] !== wo || $[152] !== Lo || $[153] !== mn)
      ((Xo = e(FullscreenSlotsProvider, {
        container: de,
        children: e(FullscreenLayoutView, {
          scrollViewport: scrollViewport,
          scrollable: wo,
          bottom: Lo,
          overlay: mn,
        }),
      })),
        ($[150] = scrollViewport),
        ($[151] = wo),
        ($[152] = Lo),
        ($[153] = mn),
        ($[154] = Xo));
    else Xo = $[154];
    return Xo;
  }
  let Ro;
  if ($[155] !== chrome || $[156] !== scrollable)
    ((Ro = e(ScrollChromeContextValue, { value: chrome, children: scrollable })),
      ($[155] = chrome),
      ($[156] = scrollable),
      ($[157] = Ro));
  else Ro = $[157];
  const wo = modal?.content,
    Wo = modal?.footer;
  let Lo;
  if ($[158] !== abovePrompt || $[159] !== bottom || $[160] !== Ro || $[161] !== wo || $[162] !== Wo)
    ((Lo = r(Fragment, { children: [Ro, abovePrompt, bottom, wo, Wo] })),
      ($[158] = abovePrompt),
      ($[159] = bottom),
      ($[160] = Ro),
      ($[161] = wo),
      ($[162] = Wo),
      ($[163] = Lo));
  else Lo = $[163];
  return Lo;
}
//@ chunk-ag5x7vhf.js:39089-39452 layout
function useHasVisibleNotification() {
  let $ = w(3),
    m = pTe(),
    x;
  if ($[0] !== m)
    ((x = (T) => bye(T.notifications.current, Kj(T)) && !KDe(T.notifications.current, m)),
      ($[0] = m),
      ($[1] = x));
  else x = $[1];
  if (rs(x) !== !0) {
    return null;
  }
  let _;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((_ = r(Box, {
      flexShrink: 0,
      maxWidth: "100%",
      overflow: "hidden",
      children: [
        e(Text, { children: " " }),
        e(PromptToast, {}),
        e(Text, { color: "permission", children: " \u2594" }),
      ],
    })),
      ($[2] = _));
  else _ = $[2];
  return _;
}
/**
 * 管理未读分隔线：用户向上滚动后记录 dividerIndex，响应 down/pageup/pagedown/home 等按键，回到底部时清除。
 */
//@ chunk-ag5x7vhf.js:39452-43160 file-local
function useUnseenDivider(messageCount) {
  let $ = w(46),
    { scrollViewport: scrollViewport, maxRows: maxRows, onClaim: onClaim, children: children } = messageCount,
    dividerYRef = Se($E),
    I = R(null),
    [D, A] = y(null),
    V;
  if ($[0] !== onClaim)
    ((V = (handle) => {
      ((I.current = handle), A(handle), onClaim?.(handle));
    }),
      ($[0] = onClaim),
      ($[1] = V));
  else V = $[1];
  let z = V,
    K = D !== null,
    q = maxRows - (D ?? 0),
    Y = R(null),
    pe;
  if ($[2] !== scrollViewport)
    ((pe = () => {
      if (scrollViewport && I.current === null) {
        return scrollViewport.attach(Y.current);
      }
    }),
      ($[2] = scrollViewport),
      ($[3] = pe));
  else pe = $[3];
  zt(pe);
  let xe;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((xe = { overflows: !1, above: !1, below: !1, hintTop: 0, hintBottom: 0 }), ($[4] = xe));
  else xe = $[4];
  let [ge, Re] = y(xe),
    We;
  if ($[5] !== q || $[6] !== scrollViewport?.handle)
    ((We = () => {
      let fe = scrollViewport?.handle;
      if (!fe) {
        return;
      }
      let freshScrollHeight = fe.getFreshScrollHeight();
      let te = fe.getViewportHeight() || q;
      let me = Y.current?.getViewportTop() ?? 0;
      let se = Y.current?.getViewportHeight() ?? 0;
      let max = Math.max(0, fe.getViewportTop() - me);
      let max_2 = Math.max(0, se - max - te);
      let ve = I.current !== null ? te : q;
      let Ee = freshScrollHeight > ve;
      let He = fe.getScrollTop() + fe.getPendingDelta();
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
          : { overflows: Ee, above: lt, below: it, hintTop: max, hintBottom: max_2 },
      );
    }),
      ($[5] = q),
      ($[6] = scrollViewport?.handle),
      ($[7] = We));
  else We = $[7];
  let tt = We,
    ct = R(null),
    Je = R(null),
    { focusManager: focusManager } = Se(kp),
    Qe;
  if ($[8] !== focusManager)
    ((Qe = () => {
      let Wt = ct.current;
      if (!Wt || !focusManager) {
        return;
      }
      for (let Ze = focusManager.activeElement ?? void 0; Ze; Ze = Ze.parentNode) {
        if (Ze === Wt) {
          Je.current = focusManager.activeElement;
          return;
        }
      }
      let pt = Je.current;
      for (let Xt = pt ?? void 0; Xt; Xt = Xt.parentNode) {
        if (Xt === Wt) {
          focusManager.focus(pt);
          return;
        }
      }
      focusManager.focus(Wt);
    }),
      ($[8] = focusManager),
      ($[9] = Qe));
  else Qe = $[9];
  let rt = Qe,
    qe;
  if ($[10] !== rt) ((qe = [rt]), ($[10] = rt), ($[11] = qe));
  else qe = $[11];
  P(rt, qe);
  let St, dt;
  if ($[12] !== tt || $[13] !== scrollViewport)
    ((St = () => (tt(), scrollViewport?.subscribe(tt))),
      (dt = [tt, scrollViewport]),
      ($[12] = tt),
      ($[13] = scrollViewport),
      ($[14] = St),
      ($[15] = dt));
  else ((St = $[14]), (dt = $[15]));
  P(St, dt);
  let Pt;
  if ($[16] !== tt || $[17] !== rt)
    ((Pt = () => {
      (tt(), rt());
    }),
      ($[16] = tt),
      ($[17] = rt),
      ($[18] = Pt));
  else Pt = $[18];
  useInterval(Pt, 50);
  const Ot = dividerYRef?.rows ?? maxRows,
    It = dividerYRef?.columns ?? 0,
    kt = scrollViewport ?? null;
  let to;
  if ($[19] !== z || $[20] !== Ot || $[21] !== It || $[22] !== kt)
    ((to = { rows: Ot, columns: It, scrollViewport: kt, claimScrollBox: z }),
      ($[19] = z),
      ($[20] = Ot),
      ($[21] = It),
      ($[22] = kt),
      ($[23] = to));
  else to = $[23];
  let de = to,
    le;
  if ($[24] !== q || $[25] !== scrollViewport?.handle)
    ((le = (idx) => {
      if (idx.defaultPrevented || idx.ctrl || idx.meta || idx.shift) {
        return;
      }
      let st = scrollViewport?.handle;
      if (!st) {
        return;
      }
      let freshScrollHeight = st.getFreshScrollHeight();
      let Ve = st.getViewportHeight() || q;
      let ze = I.current !== null ? Ve : q;
      if (freshScrollHeight <= ze) {
        return;
      }
      if (idx.key === "up" || idx.key === "down")
        (st.scrollBy(idx.key === "down" ? 1 : -1), idx.preventDefault());
      else if (idx.key === "pageup" || idx.key === "pagedown") {
        let max = Math.max(1, ze);
        (st.scrollBy(idx.key === "pagedown" ? max : -max), idx.preventDefault());
      } else if (idx.key === "home") (st.scrollTo(0), idx.preventDefault());
      else if (idx.key === "end") (st.scrollToBottom(), idx.preventDefault());
    }),
      ($[24] = q),
      ($[25] = scrollViewport?.handle),
      ($[26] = le));
  else le = $[26];
  const ut = !K && ge.overflows ? q : void 0;
  let jt;
  if ($[27] !== children)
    ((jt = e(Box, { flexDirection: "column", paddingX: l5, flexShrink: 0, children: children })),
      ($[27] = children),
      ($[28] = jt));
  else jt = $[28];
  let oo;
  if ($[29] !== ut || $[30] !== jt)
    ((oo = e(LI, {
      ref: Y,
      flexDirection: "column",
      flexShrink: 0,
      height: ut,
      stickyScroll: !1,
      children: jt,
    })),
      ($[29] = ut),
      ($[30] = jt),
      ($[31] = oo));
  else oo = $[31];
  let mo;
  if ($[32] !== ge.above || $[33] !== ge.hintTop)
    ((mo =
      ge.above &&
      e(Box, {
        position: "absolute",
        top: ge.hintTop,
        right: 1,
        children: e(Text, { dimColor: !0, children: re.arrowUp }),
      })),
      ($[32] = ge.above),
      ($[33] = ge.hintTop),
      ($[34] = mo));
  else mo = $[34];
  let Jt;
  if ($[35] !== ge.below || $[36] !== ge.hintBottom)
    ((Jt =
      ge.below &&
      e(Box, {
        position: "absolute",
        bottom: ge.hintBottom,
        right: 1,
        children: e(Text, { dimColor: !0, children: re.arrowDown }),
      })),
      ($[35] = ge.below),
      ($[36] = ge.hintBottom),
      ($[37] = Jt));
  else Jt = $[37];
  let Gt;
  if ($[38] !== le || $[39] !== oo || $[40] !== mo || $[41] !== Jt)
    ((Gt = r(Box, {
      ref: ct,
      flexDirection: "column",
      flexShrink: 0,
      onKeyDown: le,
      children: [oo, mo, Jt],
    })),
      ($[38] = le),
      ($[39] = oo),
      ($[40] = mo),
      ($[41] = Jt),
      ($[42] = Gt));
  else Gt = $[42];
  let Mo;
  if ($[43] !== de || $[44] !== Gt)
    ((Mo = e($E, { value: de, children: Gt })), ($[43] = de), ($[44] = Gt), ($[45] = Mo));
  else Mo = $[45];
  return Mo;
}
//@ chunk-ag5x7vhf.js:43160-43202 layout
var JUMP_TO_BOTTOM_CHORD = parseChord("ctrl+end"),
  PAGE_DOWN_CHORD = parseChord("pagedown");
/**
 * "新消息"药丸：不在底部且有未读时显示 "Jump to bottom"，点击或 scroll:bottom 快捷键跳到底部。
 */
//@ chunk-ag5x7vhf.js:43202-44640 fingerprint = NewMessagesPill (0.615)
function NewMessagesPill(t0) {
  let $ = w(20),
    { count: count, onClick: onClick } = t0,
    [T, k] = y(!1),
    { columns: columns } = useTerminalSize(),
    D,
    A,
    L;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((A = getShortcutDisplayPlatform()),
      (D = chordToDisplayString(JUMP_TO_BOTTOM_CHORD, A)),
      (L = chordToDisplayString(PAGE_DOWN_CHORD, A)),
      ($[0] = D),
      ($[1] = A),
      ($[2] = L));
  else ((D = $[0]), (A = $[1]), (L = $[2]));
  let V = L,
    W = useShortcutDisplay("scroll:bottom", "Scroll", D),
    z = useShortcutDisplay("scroll:pageDown", "Scroll", V),
    K = yt(UVe, FVe),
    q;
  if ($[3] !== count)
    ((q = count > 0 ? `${count} new ${plural(count, "message")}` : "Jump to bottom"),
      ($[3] = count),
      ($[4] = q));
  else q = $[4];
  let Y = q,
    pe = A === "macos" && (W === "" || W === D),
    xe = isMouseTrackingEnabled() === "full" && K,
    ge = z === V ? `fn+${re.arrowDown}` : z,
    Re;
  if (pe && xe) Re = `${Y} (click) ${re.arrowDown}`;
  else if (pe && ge) Re = `${Y}: ${ge} to scroll`;
  else if (W) Re = `${Y} (${W}) ${re.arrowDown}`;
  else Re = `${Y} ${re.arrowDown}`;
  let We = columns - 2;
  const fe = `${Y} ${re.arrowDown}`;
  let Fe;
  if ($[5] !== We || $[6] !== Re || $[7] !== Y || $[8] !== fe) {
    let te = [Re, fe, Y];
    Fe = te.find((me) => bunStringWidth(me) <= We) ?? Y;
    (($[5] = We), ($[6] = Re), ($[7] = Y), ($[8] = fe), ($[9] = Fe));
  } else Fe = $[9];
  let se = Fe,
    _e;
  if ($[10] !== onClick)
    ((_e = () => {
      (P$o(), onClick?.());
    }),
      ($[10] = onClick),
      ($[11] = _e));
  else _e = $[11];
  let oe, ve;
  if ($[12] === MEMO_CACHE_SENTINEL) ((oe = () => k(!0)), (ve = () => k(!1)), ($[12] = oe), ($[13] = ve));
  else ((oe = $[12]), (ve = $[13]));
  const Ee = T ? "userMessageBackgroundHover" : "userMessageBackground";
  let He;
  if ($[14] !== Ee || $[15] !== se)
    ((He = e(TagTabs, { color: Ee, textColor: "text", padded: !0, wrap: "truncate-end", children: se })),
      ($[14] = Ee),
      ($[15] = se),
      ($[16] = He));
  else He = $[16];
  let Ue;
  if ($[17] !== _e || $[18] !== He)
    ((Ue = e(Box, {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      justifyContent: "center",
      children: e(Box, { noSelect: !0, onClick: _e, onMouseEnter: oe, onMouseLeave: ve, children: He }),
    })),
      ($[17] = _e),
      ($[18] = He),
      ($[19] = Ue));
  else Ue = $[19];
  return Ue;
}
/**
 * 全屏滚动时置顶显示当前可见区域对应的用户提示（StickyPromptHeader）。
 */
//@ chunk-ag5x7vhf.js:44640-45388 fingerprint = StickyPromptHeader (0.796)
function StickyPromptHeader(t0) {
  let $ = w(13),
    { text: text, onClick: onClick, leftMargin: leftMargin } = t0,
    [k, _] = y(!1),
    D;
  if ($[0] !== leftMargin)
    ((D = leftMargin > 0 && e(NoSelect, { fromLeftEdge: !0, minWidth: leftMargin })),
      ($[0] = leftMargin),
      ($[1] = D));
  else D = $[1];
  const t1 = k ? "userMessageBackgroundHover" : "userMessageBackground";
  let L, V;
  if ($[2] === MEMO_CACHE_SENTINEL) ((L = () => _(!0)), (V = () => _(!1)), ($[2] = L), ($[3] = V));
  else ((L = $[2]), (V = $[3]));
  let W;
  if ($[4] !== text)
    ((W = r(Text, { color: "subtle", wrap: "truncate-end", children: [re.pointer, " ", text] })),
      ($[4] = text),
      ($[5] = W));
  else W = $[5];
  let z;
  if ($[6] !== onClick || $[7] !== t1 || $[8] !== W)
    ((z = e(Box, {
      flexGrow: 1,
      paddingRight: 1,
      backgroundColor: t1,
      onClick: onClick,
      onMouseEnter: L,
      onMouseLeave: V,
      children: W,
    })),
      ($[6] = onClick),
      ($[7] = t1),
      ($[8] = W),
      ($[9] = z));
  else z = $[9];
  let K;
  if ($[10] !== D || $[11] !== z)
    ((K = r(Box, { flexShrink: 0, width: "100%", height: 1, flexDirection: "row", children: [D, z] })),
      ($[10] = D),
      ($[11] = z),
      ($[12] = K));
  else K = $[12];
  return K;
}
//@ chunk-ag5x7vhf.js:45388-45658 fingerprint = DialogOverlay (0.554)
function DialogOverlay(m) {
  let $ = w(4),
    { width: width, children: children } = m,
    node = useAnchorTopMargin(),
    t0;
  if ($[0] !== children || $[1] !== node || $[2] !== width)
    ((t0 =
      node > 0
        ? e(Box, {
            position: "absolute",
            top: 0,
            right: 0,
            width: width,
            height: node,
            flexDirection: "column",
            overflow: "hidden",
            opaque: !0,
            children: children,
          })
        : null),
      ($[0] = children),
      ($[1] = node),
      ($[2] = width),
      ($[3] = t0));
  else t0 = $[3];
  return t0;
}
//@ chunk-ag5x7vhf.js:45658-46504 fingerprint = SuggestionsOverlay (0.783)
function SuggestionsOverlay(m) {
  let $ = w(10),
    { rowsAbove: rowsAbove } = m,
    x = rowsAbove === void 0 ? 0 : rowsAbove,
    data = useFullscreenSlotData(),
    k = useFullscreenSlotDialog(),
    _ = useAnchorTopMargin(),
    I = x > 0 ? x : -_,
    D = data !== null && (data.suggestions.length > 0 || !!data.emptyMessage),
    L;
  if ($[0] !== data || $[1] !== I || $[2] !== D)
    ((L =
      D &&
      e(Box, {
        position: "absolute",
        bottom: "100%",
        marginBottom: I,
        left: 0,
        right: 0,
        paddingX: 2,
        paddingTop: 1,
        flexDirection: "column",
        opaque: !0,
        children: e(Ryo, {
          suggestions: data.suggestions,
          selectedSuggestion: data.selectedSuggestion,
          maxColumnWidth: data.maxColumnWidth,
          emptyMessage: data.emptyMessage,
          hoveredId: data.hoveredId,
          onSelect: data.onSelect,
          onHoverChange: data.onHoverChange,
          overlay: !0,
          noPad: !0,
        }),
      })),
      ($[0] = data),
      ($[1] = I),
      ($[2] = D),
      ($[3] = L));
  else L = $[3];
  let V;
  if ($[4] !== k || $[5] !== I)
    ((V = k
      ? e(Box, {
          position: "absolute",
          bottom: "100%",
          marginBottom: I,
          left: 0,
          right: 0,
          opaque: !0,
          children: k,
        })
      : null),
      ($[4] = k),
      ($[5] = I),
      ($[6] = V));
  else V = $[6];
  let W;
  if ($[7] !== L || $[8] !== V) ((W = r(Fragment, { children: [L, V] })), ($[7] = L), ($[8] = V), ($[9] = W));
  else W = $[9];
  return W;
}
//@ chunk-ag5x7vhf.js:46504-46508 placement
j();
//@ chunk-ag5x7vhf.js:46508-46512 placement
j();
//@ chunk-ag5x7vhf.js:46512-46516 placement
j();

export {
  isInvisibleMessage,
  dtn,
  rAr,
  FullscreenLayout,
  ctn,
  useFullscreenDialogSlot,
  useFullscreenAnchor,
  useFullscreenFooterData,
  computeUnseenDivider,
  useScrollChrome,
};
