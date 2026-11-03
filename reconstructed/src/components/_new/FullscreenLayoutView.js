/**
 * components/_new/FullscreenLayoutView.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (3)
 * attribution: sole-consumer-new 3
 */
import {
  ReplayHandleSlot,
  ScreenReplayWriter,
  serializeNodeScreenRows,
  ScrollAnchorContext,
  UXe,
} from "../../ink/outputReplay.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { R, y, NSe, zt } from "../../../vendor/react/cjs/react.production.js";
import { di } from "../../ink/terminal.js";
import { serializeScreenRow } from "../../ink/output.js";
import { renderToScreen } from "../../ink/render-to-screen.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { LI } from "../../ink/components/ScrollBox.js";
import { BaseBox } from "../../ink/components/Box.js";

//@ chunk-ag5x7vhf.js:18504-18533 sole-consumer-new
function GT() {
  return new ReplayHandleSlot();
}
/**
 * 全屏布局：可滚动区、底部区、上推区与浮层，维护滚动视口与缓存布局。
 */
//@ chunk-ag5x7vhf.js:18533-21173 sole-consumer-new
function FullscreenLayoutView(m) {
  let pe = w(28),
    {
      scrollable: scrollable,
      bottom: bottom,
      pushUp: pushUp,
      overlay: overlay,
      scrollViewport: scrollViewport,
    } = m,
    I = useTerminalSize(),
    { columns: columns, rows: rows } = I,
    L = R(null),
    V = R(null),
    W = R(null),
    z = R(null),
    [K] = y(GT),
    q = scrollViewport ?? K,
    { attach: attach } = q,
    xe;
  if (pe[0] !== columns || pe[1] !== rows || pe[2] !== q.handle)
    ((xe = () => {
      let ge = di().get(process.stdout);
      if (!ge) {
        return;
      }
      let Re = new ScreenReplayWriter(process.stdout, columns, rows, ge.recordContentWrite);
      (Re.setup(), (L.current = Re));
      let We = !1;
      return (
        (ge.frameSink = (fe, Fe) => {
          let te = L.current;
          if (!te) {
            return !1;
          }
          if (ge.isAltScreenActive) {
            if (!We) (te.suspend(), (We = !0));
            return !1;
          }
          if (We) ((We = !1), te.resume(te.cols, te.rows));
          let tickPump = te.tickPump();
          let se = serializeNodeScreenRows(fe, Fe, V.current);
          let _e = serializeNodeScreenRows(fe, Fe, W.current);
          let layout = te.computeLayout(se, _e);
          let ve = q.handle?.getDomElement() ?? null;
          if (ve) {
            let cachedLayout = ve.cachedLayout;
            let He = [];
            if (cachedLayout && cachedLayout.height > 0) {
              let min = Math.min(cachedLayout.y + cachedLayout.height, fe.screen.height);
              for (let lt = cachedLayout.y; lt < min; lt++) He.push(serializeScreenRow(fe.screen, Fe, lt));
            }
            let it = ve.scrollHeight ?? 0;
            let ae = offsetWithinParent(z.current, ve) ?? it;
            te.syncViewport(
              { lines: He, scrollTop: ve.scrollTop ?? 0, scrollHeight: it, transcriptEnd: ae },
              layout.contentHeight,
            );
          }
          let tt = !1;
          if (ve) {
            let consumeGapRange = te.consumeGapRange();
            let consumeBackfillNeeded = te.consumeBackfillNeeded();
            if (consumeGapRange || consumeBackfillNeeded) {
              let $e = consumeGapRange ? consumeGapRange.from : 0;
              let Qe = consumeGapRange ? consumeGapRange.to : (ve.scrollTop ?? 0);
              let Wt = renderToScreen(ve, $e, Qe, te.cols, ge.getStylePool());
              if (Wt.length > 0) (te.primeBackfill(Wt), (tt = !0));
            }
          }
          return (te.draw(layout), tickPump || tt ? "tick" : !0);
        }),
        () => {
          ((ge.frameSink = null), Re.restore(), (L.current = null));
        }
      );
    }),
      (pe[0] = columns),
      (pe[1] = rows),
      (pe[2] = q.handle),
      (pe[3] = xe));
  else xe = pe[3];
  let Ze;
  if (pe[4] === MEMO_CACHE_SENTINEL) ((Ze = []), (pe[4] = Ze));
  else Ze = pe[4];
  NSe(xe, Ze);
  let pt;
  if (pe[5] !== columns || pe[6] !== rows)
    ((pt = { cols: columns, rows: rows }), (pe[5] = columns), (pe[6] = rows), (pe[7] = pt));
  else pt = pe[7];
  let Xt = R(pt),
    rt,
    qe;
  if (pe[8] !== columns || pe[9] !== rows)
    ((rt = () => {
      if (columns === Xt.current.cols && rows === Xt.current.rows) {
        return;
      }
      ((Xt.current = { cols: columns, rows: rows }), L.current?.handleResize(columns, rows));
    }),
      (qe = [columns, rows]),
      (pe[8] = columns),
      (pe[9] = rows),
      (pe[10] = rt),
      (pe[11] = qe));
  else ((rt = pe[10]), (qe = pe[11]));
  zt(rt, qe);
  let St;
  if (pe[12] !== scrollable)
    ((St = e(ScrollAnchorContext.Provider, { value: z, children: scrollable })),
      (pe[12] = scrollable),
      (pe[13] = St));
  else St = pe[13];
  let dt;
  if (pe[14] !== attach || pe[15] !== St)
    ((dt = e(LI, { ref: attach, flexGrow: 1, flexDirection: "column", stickyScroll: !0, children: St })),
      (pe[14] = attach),
      (pe[15] = St),
      (pe[16] = dt));
  else dt = pe[16];
  const Pt = rows - 2;
  let Ot;
  if (pe[17] !== bottom || pe[18] !== pushUp || pe[19] !== Pt)
    ((Ot = r(BaseBox, {
      ref: V,
      flexDirection: "column",
      flexShrink: 0,
      minHeight: UXe,
      maxHeight: Pt,
      children: [pushUp, bottom],
    })),
      (pe[17] = bottom),
      (pe[18] = pushUp),
      (pe[19] = Pt),
      (pe[20] = Ot));
  else Ot = pe[20];
  let It;
  if (pe[21] !== overlay)
    ((It =
      overlay != null
        ? e(BaseBox, {
            ref: W,
            flexDirection: "column",
            flexShrink: 0,
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            opaque: !0,
            children: overlay,
          })
        : null),
      (pe[21] = overlay),
      (pe[22] = It));
  else It = pe[22];
  let kt;
  if (pe[23] !== rows || pe[24] !== It || pe[25] !== dt || pe[26] !== Ot)
    ((kt = r(BaseBox, {
      flexDirection: "column",
      height: rows,
      width: "100%",
      flexShrink: 0,
      children: [dt, Ot, It],
    })),
      (pe[23] = rows),
      (pe[24] = It),
      (pe[25] = dt),
      (pe[26] = Ot),
      (pe[27] = kt));
  else kt = pe[27];
  return kt;
}
//@ chunk-ag5x7vhf.js:21173-21309 sole-consumer-new = siblingSharesY (0.858)
function offsetWithinParent(node, yogaNode) {
  if (!node) return;
  let x = 0,
    T = node;
  while (T && T.parentNode !== yogaNode) ((x += T.yogaNode?.getComputedTop() ?? 0), (T = T.parentNode));
  return T ? x : void 0;
}

export { FullscreenLayoutView };
