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
import { init_react_production, Uy, R, ce, zt, P, Q } from "../../../vendor/react/cjs/react.production.js";
import { topWithin } from "../../ink/hooks/useTerminalHooks.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { SiteColumns, SiteRows } from "./render/elements.js";
import { useWheelScrollStep } from "../ScrollKeybindingHandler.js";
import { useLatestState } from "../CustomSelect/option-map.js";
import { logRejection } from "../../plugins/functionHooks/uiApi.js";
import { dispatchUiScroll, siteKey, scrollSites } from "../../plugins/functionHooks/uiHooks.js";

//@ chunk-18hwfzwa.js:475900-475910 placement
var BORDER_COLUMNS = 4;
//@ chunk-18hwfzwa.js:475910-475944 placement
var chromeRows = (h, x) => (h || !x ? 1 : 0) + (x ? 2 : 0);
//@ chunk-18hwfzwa.js:475944-475953 placement
var BORDER_MARK_INSET = 2;
//@ chunk-18hwfzwa.js:475953-475957 placement
init_react_production();
//@ chunk-18hwfzwa.js:475957-475961 placement
init_react_production();
//@ chunk-18hwfzwa.js:477875-478015 placement
var toLocalPoint = (h) => (x) => {
  let cachedLayout = h.current?.cachedLayout;
  return x.col !== undefined && x.row !== undefined && cachedLayout !== undefined
    ? {
        column: x.col - cachedLayout.x,
        row: x.row - cachedLayout.y,
      }
    : undefined;
};
//@ chunk-18hwfzwa.js:478015-478222 placement
function heldRowOffset(h, x) {
  let { held, index, content } = h;
  if (held === null || index === null || held.index !== index || content === null) return -1;
  let Re = topWithin(held.node, content);
  let Be = held.node.yogaNode?.getComputedHeight() ?? 0;
  return Re < 0 ? -1 : Re + (x === "bottom" ? Be : 0);
}
//@ chunk-18hwfzwa.js:478222-478594 placement
/**
 * 在节点树中按 elementKey/插件查找元素上下边界。
 */
function findElementBounds(h, x, D) {
  let L = [h];
  for (let ee = L.pop(); ee; ee = L.pop()) {
    let { elementKey, elementPlugin } = ee.attributes;
    if (ee !== h && elementKey === x && (elementPlugin === undefined || elementPlugin === D)) {
      let He = topWithin(ee, h);
      let We = ee.yogaNode?.getComputedHeight() ?? 0;
      return He < 0
        ? undefined
        : {
            top: He,
            bottom: He + We,
          };
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
  let { bodyRows, contentRows, scrollBy } = h;
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
var wheelScrollHandler = (h, x, D) => (event) => {
  let ee = event.deltaY < 0 ? -1 : 1;
  h.scrollBy(ee * x(ee), D(event));
  event.preventDefault();
  event.stopPropagation();
};
//@ chunk-18hwfzwa.js:478919-479120 placement
var PaneContent = (h) =>
  jsxProd_default(Box, {
    ref: h.content,
    marginTop: -h.offset,
    flexDirection: "column",
    flexShrink: 0,
    marginRight: h.keptColumns,
    children: jsxProd_default(SiteColumns, {
      value: h.columns,
      children: jsxProd_default(SiteRows, {
        value: h.rows,
        children: h.children,
      }),
    }),
  });
//@ chunk-18hwfzwa.js:479120-479199 placement
function wheelScrollRows(h, localPoint) {
  let wheelScrollStep = useWheelScrollStep();
  return wheelScrollHandler(h, (L) => wheelScrollStep(L, performance.now()).rows, localPoint);
}
//@ chunk-18hwfzwa.js:479199-479228 placement
var mergeShallow = (h, x) => ({
  ...h,
  ...x,
});
//@ chunk-18hwfzwa.js:479228-479232 placement
init_react_production();
//@ chunk-18hwfzwa.js:479232-479270 placement
var floorClampZero = (h) => Math.max(0, Math.floor(h));
//@ chunk-18hwfzwa.js:479270-481263 placement
function PaneBody(props) {
  let { component, requestId, owner, content } = props;
  let { bodyRows, contentRows, maxOffset } = props;
  let [He, We, ze] = useLatestState(0);
  let [Xe, rt, kt] = useLatestState(false);
  let [At, It] = Uy((Ro) => Ro + 1, 0);
  let Ot = R({
    bodyRows,
    contentRows,
    maxOffset,
  });
  let Et = R(false);
  let Dt = R(undefined);
  let Lt = R(false);
  let oo = R(0);
  let Xt = R(undefined);
  let io = R(true);
  let so = ce(() => (kt() ? Ot.current.maxOffset : Math.min(ze(), Ot.current.maxOffset)), [ze, kt]);
  let po = ce(
    (Ro) => {
      let Ho = floorClampZero(Ro);
      if (Ho !== so()) {
        Lt.current = Et.current;
        oo.current = 0;
        Xt.current = undefined;
      }
      rt(false);
      We(Ho);
    },
    [We, rt, so],
  );
  let ao = ce(
    (Ro, Ho) => {
      if (Ho.kind === "plugin") {
        po(Ro);
        return true;
      }
      if (Lt.current) return false;
      let Io = floorClampZero(Ro);
      let Wo = Dt.current;
      if (!(kt() && Wo !== undefined && Wo.by > 0 && Io === Wo.offset) && Io !== so()) {
        rt(false);
        We(Io);
      }
      return true;
    },
    [We, rt, po, so, kt],
  );
  let co = ce(
    (Ro) => {
      let Ho = so();
      let Io = Ro();
      if (so() !== Ho) It();
      return Io;
    },
    [so],
  );
  let bo = ce(
    (Ro, Ho) => {
      let Io = Ot.current;
      let offset = Math.min(Io.maxOffset, floorClampZero(so() + Ro));
      Et.current = true;
      Dt.current = {
        by: Ro,
        offset,
      };
      Lt.current = false;
      logRejection(
        `ui.scroll ${component} ${requestId}`,
        dispatchUiScroll({
          input: {
            component,
            requestId,
            offset,
            by: Ro,
            bodyRows: Io.bodyRows,
            contentRows: Io.contentRows,
            origin: {
              kind: "person",
            },
            ...(Ho !== undefined && {
              pointer: Ho,
            }),
          },
        }),
      ).finally(() => {
        Et.current = false;
        Dt.current = undefined;
        let mn = oo.current;
        let Cn = Xt.current;
        oo.current = 0;
        Xt.current = undefined;
        if (io.current && mn !== 0) bo(mn, Cn);
      });
    },
    [component, requestId, so],
  );
  let place = ce((Ro) => po(Ro(ze())), [po, ze]);
  function Bo(Ro, Ho) {
    if (Ro === 0) return;
    if (Et.current) {
      oo.current += Ro;
      Xt.current = Ho;
      return;
    }
    bo(Ro, Ho);
  }
  zt(() => {
    Ot.current = {
      bodyRows,
      contentRows,
      maxOffset,
    };
  }, [bodyRows, contentRows, maxOffset]);
  zt(() => {
    if (Xe && ze() !== maxOffset) We(maxOffset);
  }, [Xe, maxOffset, ze, We]);
  P(() => {
    let Ro = siteKey(component, requestId);
    scrollSites().set(Ro, {
      component,
      requestId,
      owner,
      bodyRows,
      contentRows,
      maxOffset,
      offset: () => (kt() ? maxOffset : Math.min(ze(), maxOffset)),
      keyRows: (Ho, Io) => {
        let Wo = content.current;
        return Wo ? findElementBounds(Wo, Io, Ho) : undefined;
      },
      commit: (Ho, Io) => co(() => ao(Math.min(maxOffset, Ho), Io)),
      followEnd: () => co(() => rt(true)),
    });
    return () => {
      scrollSites().delete(Ro);
    };
  }, [component, requestId, owner, bodyRows, contentRows, maxOffset, content, ao, co, ze, kt, rt]);
  P(
    () => () => {
      io.current = false;
    },
    [],
  );
  return mergeShallow(
    {
      offset: Xe ? maxOffset : Math.min(He, maxOffset),
      bodyRows,
      contentRows,
      maxOffset,
      scrollBy: Bo,
    },
    {
      placed: Xe ? maxOffset : He,
      place,
      raised: At,
    },
  );
}
//@ chunk-18hwfzwa.js:481263-481267 placement
init_react_production();
//@ chunk-18hwfzwa.js:481267-481394 placement
function withScrollOffset(renderInput, x) {
  let { offset, raised } = x;
  return Q(
    () => ({
      ...renderInput,
      props: {
        ...renderInput.props,
        scroll: {
          ...renderInput.props.scroll,
          offset,
        },
      },
    }),
    [renderInput, raised],
  );
}
//@ chunk-18hwfzwa.js:481394-481398 placement
init_react_production();
export {
  BORDER_COLUMNS,
  BORDER_MARK_INSET,
  chromeRows,
  paneScrollHandlers,
  PaneBody,
  wheelScrollRows,
  toLocalPoint,
  withScrollOffset,
  heldRowOffset,
  PaneContent,
};
