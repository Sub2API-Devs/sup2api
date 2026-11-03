/**
 * components/pluginUi/PaneBody.tsx
 *
 * 2.1.316 新增。插件面板内容区。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (19)
 * attribution: placement 19
 */
import { j, Uy, R, ce, zt, P, Q } from "../../../vendor/react/cjs/react.production.js";
import { topWithin } from "../../ink/hooks/useTerminalHooks.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { SiteColumns, SiteRows } from "./render/elements.js";
import { useWheelScrollStep } from "../ScrollKeybindingHandler.js";
import { useLatestState } from "../CustomSelect/option-map.js";
import { SRe } from "../../plugins/functionHooks/uiApi.js";
import { dispatchUiScroll, s6, KCe } from "../../plugins/functionHooks/uiHooks.js";

//@ chunk-18hwfzwa.js:475900-475910 placement
var BORDER_COLUMNS = 4;
//@ chunk-18hwfzwa.js:475910-475944 placement
var chromeRows = (h, x) => (h || !x ? 1 : 0) + (x ? 2 : 0);
//@ chunk-18hwfzwa.js:475944-475953 placement
var BORDER_MARK_INSET = 2;
//@ chunk-18hwfzwa.js:475953-475957 placement
j();
//@ chunk-18hwfzwa.js:475957-475961 placement
j();
//@ chunk-18hwfzwa.js:477875-478015 placement
var toLocalPoint = (h) => (x) => {
  let D = h.current?.cachedLayout;
  return x.col !== void 0 && x.row !== void 0 && D !== void 0
    ? { column: x.col - D.x, row: x.row - D.y }
    : void 0;
};
//@ chunk-18hwfzwa.js:478015-478222 placement
function heldRowOffset(h, x) {
  let { held: held, index: index, content: content } = h;
  if (held === null || index === null || held.index !== index || content === null) return -1;
  let Re = topWithin(held.node, content),
    Be = held.node.yogaNode?.getComputedHeight() ?? 0;
  return Re < 0 ? -1 : Re + (x === "bottom" ? Be : 0);
}
/**
 * 在节点树中按 elementKey/插件查找元素上下边界。
 */
//@ chunk-18hwfzwa.js:478222-478594 placement
function findElementBounds(h, x, D) {
  let L = [h];
  for (let ee = L.pop(); ee; ee = L.pop()) {
    let { elementKey: elementKey, elementPlugin: elementPlugin } = ee.attributes;
    if (ee !== h && elementKey === x && (elementPlugin === void 0 || elementPlugin === D)) {
      let He = topWithin(ee, h),
        We = ee.yogaNode?.getComputedHeight() ?? 0;
      return He < 0 ? void 0 : { top: He, bottom: He + We };
    }
    for (let He = ee.childNodes.length - 1; He >= 0; He -= 1) {
      let We = ee.childNodes[He];
      if (We && We.nodeName !== "#text") L.push(We);
    }
  }
  return;
}
//@ chunk-18hwfzwa.js:478594-478807 placement
function paneScrollHandlers(h) {
  let { bodyRows: bodyRows, contentRows: contentRows, scrollBy: scrollBy } = h;
  return {
    "pane:scrollUp": () => scrollBy(-1),
    "pane:scrollDown": () => scrollBy(1),
    "pane:pageUp": () => scrollBy(-bodyRows),
    "pane:pageDown": () => scrollBy(bodyRows),
    "pane:top": () => scrollBy(-contentRows),
    "pane:bottom": () => scrollBy(contentRows),
  };
}
//@ chunk-18hwfzwa.js:478807-478919 placement
var wheelScrollHandler = (h, x, D) => (L) => {
  let ee = L.deltaY < 0 ? -1 : 1;
  (h.scrollBy(ee * x(ee), D(L)), L.preventDefault(), L.stopPropagation());
};
//@ chunk-18hwfzwa.js:478919-479120 placement
var PaneContent = (h) =>
  e(Box, {
    ref: h.content,
    marginTop: -h.offset,
    flexDirection: "column",
    flexShrink: 0,
    marginRight: h.keptColumns,
    children: e(SiteColumns, {
      value: h.columns,
      children: e(SiteRows, { value: h.rows, children: h.children }),
    }),
  });
//@ chunk-18hwfzwa.js:479120-479199 placement
function l1e(h, x) {
  let D = useWheelScrollStep();
  return wheelScrollHandler(h, (L) => D(L, performance.now()).rows, x);
}
//@ chunk-18hwfzwa.js:479199-479228 placement
var d1e = (h, x) => ({ ...h, ...x });
//@ chunk-18hwfzwa.js:479228-479232 placement
j();
//@ chunk-18hwfzwa.js:479232-479270 placement
var rY = (h) => Math.max(0, Math.floor(h));
//@ chunk-18hwfzwa.js:479270-481263 placement
function PaneBody(h) {
  let { component: component, requestId: requestId, owner: owner, content: content } = h,
    { bodyRows: bodyRows, contentRows: contentRows, maxOffset: maxOffset } = h,
    [He, We, ze] = useLatestState(0),
    [Xe, rt, kt] = useLatestState(!1),
    [At, It] = Uy((Ro) => Ro + 1, 0),
    Ot = R({ bodyRows: bodyRows, contentRows: contentRows, maxOffset: maxOffset }),
    Et = R(!1),
    Dt = R(void 0),
    Lt = R(!1),
    oo = R(0),
    Xt = R(void 0),
    io = R(!0),
    so = ce(() => (kt() ? Ot.current.maxOffset : Math.min(ze(), Ot.current.maxOffset)), [ze, kt]),
    po = ce(
      (Ro) => {
        let Ho = rY(Ro);
        if (Ho !== so()) ((Lt.current = Et.current), (oo.current = 0), (Xt.current = void 0));
        (rt(!1), We(Ho));
      },
      [We, rt, so],
    ),
    ao = ce(
      (Ro, Ho) => {
        if (Ho.kind === "plugin") return (po(Ro), !0);
        if (Lt.current) return !1;
        let Io = rY(Ro),
          Wo = Dt.current;
        if (!(kt() && Wo !== void 0 && Wo.by > 0 && Io === Wo.offset) && Io !== so()) (rt(!1), We(Io));
        return !0;
      },
      [We, rt, po, so, kt],
    ),
    co = ce(
      (Ro) => {
        let Ho = so(),
          Io = Ro();
        if (so() !== Ho) It();
        return Io;
      },
      [so],
    ),
    bo = ce(
      (Ro, Ho) => {
        let Io = Ot.current,
          min = Math.min(Io.maxOffset, rY(so() + Ro));
        ((Et.current = !0),
          (Dt.current = { by: Ro, offset: min }),
          (Lt.current = !1),
          SRe(
            `ui.scroll ${component} ${requestId}`,
            dispatchUiScroll({
              input: {
                component: component,
                requestId: requestId,
                offset: min,
                by: Ro,
                bodyRows: Io.bodyRows,
                contentRows: Io.contentRows,
                origin: { kind: "person" },
                ...(Ho !== void 0 && { pointer: Ho }),
              },
            }),
          ).finally(() => {
            ((Et.current = !1), (Dt.current = void 0));
            let mn = oo.current,
              Cn = Xt.current;
            if (((oo.current = 0), (Xt.current = void 0), io.current && mn !== 0)) bo(mn, Cn);
          }));
      },
      [component, requestId, so],
    ),
    Ao = ce((Ro) => po(Ro(ze())), [po, ze]);
  function Bo(Ro, Ho) {
    if (Ro === 0) return;
    if (Et.current) {
      ((oo.current += Ro), (Xt.current = Ho));
      return;
    }
    bo(Ro, Ho);
  }
  return (
    zt(() => {
      Ot.current = { bodyRows: bodyRows, contentRows: contentRows, maxOffset: maxOffset };
    }, [bodyRows, contentRows, maxOffset]),
    zt(() => {
      if (Xe && ze() !== maxOffset) We(maxOffset);
    }, [Xe, maxOffset, ze, We]),
    P(() => {
      let Ro = s6(component, requestId);
      return (
        KCe().set(Ro, {
          component: component,
          requestId: requestId,
          owner: owner,
          bodyRows: bodyRows,
          contentRows: contentRows,
          maxOffset: maxOffset,
          offset: () => (kt() ? maxOffset : Math.min(ze(), maxOffset)),
          keyRows: (Ho, Io) => {
            let Wo = content.current;
            return Wo ? findElementBounds(Wo, Io, Ho) : void 0;
          },
          commit: (Ho, Io) => co(() => ao(Math.min(maxOffset, Ho), Io)),
          followEnd: () => co(() => rt(!0)),
        }),
        () => {
          KCe().delete(Ro);
        }
      );
    }, [component, requestId, owner, bodyRows, contentRows, maxOffset, content, ao, co, ze, kt, rt]),
    P(
      () => () => {
        io.current = !1;
      },
      [],
    ),
    d1e(
      {
        offset: Xe ? maxOffset : Math.min(He, maxOffset),
        bodyRows: bodyRows,
        contentRows: contentRows,
        maxOffset: maxOffset,
        scrollBy: Bo,
      },
      { placed: Xe ? maxOffset : He, place: Ao, raised: At },
    )
  );
}
//@ chunk-18hwfzwa.js:481263-481267 placement
j();
//@ chunk-18hwfzwa.js:481267-481394 placement
function withScrollOffset(h, x) {
  let { offset: offset, raised: raised } = x;
  return Q(
    () => ({ ...h, props: { ...h.props, scroll: { ...h.props.scroll, offset: offset } } }),
    [h, raised],
  );
}
//@ chunk-18hwfzwa.js:481394-481398 placement
j();

export {
  BORDER_COLUMNS,
  BORDER_MARK_INSET,
  chromeRows,
  paneScrollHandlers,
  PaneBody,
  l1e,
  toLocalPoint,
  withScrollOffset,
  heldRowOffset,
  PaneContent,
};
