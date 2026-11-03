/**
 * components/pluginUi/PromptHint.tsx
 *
 * 2.1.316 新增。插件在输入框的提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (20)
 * attribution: placement 20
 */
import { Ar } from "../../../runtime/bun-runtime.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { cR } from "../../plugins/functionHooks/sites/siteRules.js";
import { screenReaderText } from "../../ink/render-to-screen-reader.js";
import {
  Rj,
  PermissionModeLabel,
  PermissionModeLabel_2,
  PromptInputFooterLeftSide,
} from "../PromptInput/PromptInputFooterLeftSide.js";
import { permissionModeIndicator } from "../../utils/permissions/PermissionMode.js";
import { j, y, zt, R } from "../../../vendor/react/cjs/react.production.js";
import { findEngineRef, x6 } from "../../plugins/functionHooks/ui/index.js";
import { heldRenderInput } from "../../plugins/functionHooks/ui/renderDispatch.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { actionKeysNamespace } from "./render/actionKeys.js";
import { Oy } from "../PromptInput/footerGates.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { h3t } from "../../plugins/functionHooks/sites/index.js";
import { useMeasured } from "../../ink/components/Input.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { bunStringWidth } from "../../ink/stringWidth.js";

//@ chunk-18hwfzwa.js:36007-36017 placement
var PromptHintNamespace = {};
//@ chunk-18hwfzwa.js:36017-36239 placement
Ar(PromptHintNamespace, {
  FooterHintLine: () => FooterHintLine,
  IS_READ_AS_ROW_WIDE: () => IS_READ_AS_ROW_WIDE,
  PromptHintPart: () => PromptHintPart,
  PromptHintSite: () => PromptHintSite,
  TAIL_MIN_COLUMNS: () => TAIL_MIN_COLUMNS,
  clean: () => clean,
  default: () => PromptHintNamespace,
  isTailStandingIn: () => isTailStandingIn,
  read: () => read,
  standsIn: () => standsIn,
  tailOf: () => tailOf,
});
//@ chunk-18hwfzwa.js:36239-36249 placement
var PromptHintNamespace2 = {};
//@ chunk-18hwfzwa.js:36249-36319 placement
Ar(PromptHintNamespace2, {
  PromptHintPart: () => PromptHintPart,
  TAIL_MIN_COLUMNS: () => TAIL_MIN_COLUMNS,
  default: () => PromptHintNamespace2,
});
//@ chunk-18hwfzwa.js:36319-36329 placement
var PromptHintNamespace3 = {};
//@ chunk-18hwfzwa.js:36329-36379 placement
Ar(PromptHintNamespace3, { clean: () => clean, default: () => PromptHintNamespace3, read: () => read });
//@ chunk-18hwfzwa.js:36379-36389 placement
var PromptHintNamespace4 = {};
//@ chunk-18hwfzwa.js:36389-36516 placement
Ar(PromptHintNamespace4, {
  IS_READ_AS_ROW_WIDE: () => IS_READ_AS_ROW_WIDE,
  PromptHintSite: () => PromptHintSite,
  default: () => PromptHintNamespace4,
  isTailStandingIn: () => isTailStandingIn,
  standsIn: () => standsIn,
  tailOf: () => tailOf,
});
//@ chunk-18hwfzwa.js:840631-840679 placement
var clean = (h) => truncateToLength(h.replace(/\s+/g, " ").trim(), cR);
//@ chunk-18hwfzwa.js:840679-840729 placement
var gto = /^(-- [A-Z ]+ -- )?(\u2193 )?$| \u00B7 $/;
//@ chunk-18hwfzwa.js:840729-841134 placement
function read(h, x, D, L) {
  let ee = clean(screenReaderText(h)),
    ke = L ? Rj(x) : `${permissionModeIndicator(x)} on`,
    Re = L ? -1 : ee.indexOf(ke);
  for (let ze = L && ke !== "" ? ee.indexOf(ke) : -1; ze !== -1; ze = ee.indexOf(ke, ze + 1)) {
    let sliced = ee.slice(0, ze),
      sliced_2 = ee.slice(ze + ke.length);
    if (gto.test(sliced) && (sliced_2 === "" || sliced_2.startsWith(" \xB7 "))) Re = ze;
  }
  let He = Re === -1 ? ee : clean(ee.slice(0, Re) + ee.slice(Re + ke.length).replace(/^ \u00B7 /, "")),
    We = L ? He.replace(/ \u00B7$/, "") : He;
  return { ...D, hint: We };
}
//@ chunk-18hwfzwa.js:841134-841144 placement
var IS_READ_AS_ROW_WIDE = !1;
//@ chunk-18hwfzwa.js:841144-841224 placement
var isTailStandingIn = ({
  tail: tail,
  isHeldOver: isHeldOver,
  wasTailStoodIn: wasTailStoodIn,
  isRewritten: isRewritten,
}) => tail !== "" && (isHeldOver ? wasTailStoodIn : !isRewritten);
//@ chunk-18hwfzwa.js:841224-841228 placement
j();
//@ chunk-18hwfzwa.js:841228-841391 placement
function tailOf(h, x) {
  let D = findEngineRef(h),
    L = D === void 0 ? void 0 : heldRenderInput(h, D);
  return L !== void 0 && L.props.isDraft === x.isDraft && L.props.isWorking === x.isWorking
    ? clean(L.props.tail ?? "")
    : "";
}
//@ chunk-18hwfzwa.js:841391-841567 placement
function standsIn(h, x, D) {
  let L = findEngineRef(h),
    ee = L === void 0 ? void 0 : heldRenderInput(h, L),
    ke = typeof h !== "string" && h.type === "engine";
  if (ee === void 0) return !ke;
  return ee.props.hint !== x.hint || (D && tailOf(h, x) !== "");
}
//@ chunk-18hwfzwa.js:841567-843544 placement
function PromptHintSite(h) {
  let $ = w(40),
    { reading: reading, onHidden: onHidden, onTail: onTail } = h,
    ke,
    Re;
  if ($[0] !== reading)
    ((ke = () => ({ requestId: "prompt-hint", props: reading })),
      (Re = [reading]),
      ($[0] = reading),
      ($[1] = ke),
      ($[2] = Re));
  else ((ke = $[1]), (Re = $[2]));
  let useRenderInput = actionKeysNamespace.useRenderInput("PromptHint", ke, Re),
    [He, We] = y(!1),
    [ze, Xe] = y(!1),
    rt;
  if ($[3] !== useRenderInput)
    ((rt = x6.hasRenderHooksFor(useRenderInput)), ($[3] = useRenderInput), ($[4] = rt));
  else rt = $[4];
  let kt = rt,
    useSettledDraw = actionKeysNamespace.useSettledDraw(useRenderInput),
    It = Oy(),
    Ot;
  if ($[5] !== It || $[6] !== reading || $[7] !== useSettledDraw)
    ((Ot = useSettledDraw !== void 0 && standsIn(useSettledDraw, reading, It)),
      ($[5] = It),
      ($[6] = reading),
      ($[7] = useSettledDraw),
      ($[8] = Ot));
  else Ot = $[8];
  let Et = Ot,
    Dt;
  if ($[9] !== Et || $[10] !== reading || $[11] !== useSettledDraw)
    ((Dt = useSettledDraw !== void 0 && Et && !standsIn(useSettledDraw, reading, IS_READ_AS_ROW_WIDE)),
      ($[9] = Et),
      ($[10] = reading),
      ($[11] = useSettledDraw),
      ($[12] = Dt));
  else Dt = $[12];
  let Lt = Dt,
    oo = useSettledDraw === void 0 ? He : Et,
    Xt = useSettledDraw === void 0 && kt,
    io;
  if ($[13] !== Xt || $[14] !== oo || $[15] !== It || $[16] !== reading || $[17] !== ze)
    ((io = (so) => {
      let po = so.props.hint !== reading.hint;
      let ao = It ? PromptHintNamespace3.clean(so.props.tail ?? "") : "";
      let co = isTailStandingIn({ tail: ao, isHeldOver: Xt, wasTailStoodIn: ze, isRewritten: po });
      return oo && (Xt || po || co)
        ? e(Text, {
            dimColor: !0,
            wrap: "truncate",
            children: co ? ao : PromptHintNamespace3.clean(so.props.hint),
          })
        : null;
    }),
      ($[13] = Xt),
      ($[14] = oo),
      ($[15] = It),
      ($[16] = reading),
      ($[17] = ze),
      ($[18] = io));
  else io = $[18];
  let useRenderDrawing = actionKeysNamespace.useRenderDrawing(useRenderInput, io),
    Ao = oo || It || !kt ? void 0 : useRenderDrawing.drawn,
    Bo;
  if ($[19] !== Ao || $[20] !== reading)
    ((Bo = Ao === void 0 ? "" : tailOf(Ao, reading)), ($[19] = Ao), ($[20] = reading), ($[21] = Bo));
  else Bo = $[21];
  let Ro = Bo,
    Ho =
      useSettledDraw === void 0 &&
      kt &&
      useRenderDrawing.drawn !== void 0 &&
      useRenderDrawing.drawn !== h3t.RENDER_ENGINE_FALLBACK,
    { drawn: drawn, hasThrown: hasThrown } = useRenderDrawing,
    mn,
    Cn;
  if (
    $[22] !== drawn ||
    $[23] !== hasThrown ||
    $[24] !== Ho ||
    $[25] !== Et ||
    $[26] !== Lt ||
    $[27] !== onHidden
  )
    ((mn = () => {
      if (!Ho && !hasThrown(drawn)) (We(Et), Xe(Lt), onHidden(Et));
    }),
      (Cn = [Ho, Et, Lt, onHidden, hasThrown, drawn]),
      ($[22] = drawn),
      ($[23] = hasThrown),
      ($[24] = Ho),
      ($[25] = Et),
      ($[26] = Lt),
      ($[27] = onHidden),
      ($[28] = mn),
      ($[29] = Cn));
  else ((mn = $[28]), (Cn = $[29]));
  zt(mn, Cn);
  let No, vo;
  if ($[30] !== drawn || $[31] !== hasThrown || $[32] !== onTail || $[33] !== Ro)
    ((No = () => {
      if (!hasThrown(drawn)) onTail(Ro);
    }),
      (vo = [onTail, Ro, hasThrown, drawn]),
      ($[30] = drawn),
      ($[31] = hasThrown),
      ($[32] = onTail),
      ($[33] = Ro),
      ($[34] = No),
      ($[35] = vo));
  else ((No = $[34]), (vo = $[35]));
  zt(No, vo);
  let Yo, kn;
  if ($[36] !== onHidden || $[37] !== onTail)
    ((Yo = () => () => {
      (onHidden(!1), onTail(""));
    }),
      (kn = [onHidden, onTail]),
      ($[36] = onHidden),
      ($[37] = onTail),
      ($[38] = Yo),
      ($[39] = kn));
  else ((Yo = $[38]), (kn = $[39]));
  return (zt(Yo, kn), useRenderDrawing.node);
}
//@ chunk-18hwfzwa.js:843544-843553 placement
var TAIL_MIN_COLUMNS = 4;
//@ chunk-18hwfzwa.js:843553-845610 placement
function PromptHintPart(h) {
  let $ = w(35),
    {
      isDraft: isDraft,
      isWorking: isWorking,
      isInteractive: isInteractive,
      mode: mode,
      rowColumns: rowColumns,
      wrappedRowColumns: wrappedRowColumns,
      children: children,
    } = h,
    He = wrappedRowColumns === void 0 ? rowColumns : wrappedRowColumns,
    We = R(null),
    [ze, Xe] = y(!1),
    [rt, kt] = y(""),
    At = actionKeysNamespace.useHasRenderHooks("PromptHint") && !isInteractive,
    It = Oy(),
    Et;
  if ($[0] !== isDraft || $[1] !== At || $[2] !== It || $[3] !== isWorking || $[4] !== mode)
    ((Et = () => {
      let Dt = At ? We.current : null;
      if (Dt === null) {
        return null;
      }
      return PromptHintNamespace3.read(Dt, mode, { isDraft: isDraft, isWorking: isWorking }, It).hint;
    }),
      ($[0] = isDraft),
      ($[1] = At),
      ($[2] = It),
      ($[3] = isWorking),
      ($[4] = mode),
      ($[5] = Et));
  else Et = $[5];
  let Lt = useMeasured(Et),
    oo;
  if ($[6] !== Lt || $[7] !== isDraft || $[8] !== isWorking)
    ((oo = Lt === null ? void 0 : { isDraft: isDraft, isWorking: isWorking, hint: Lt }),
      ($[6] = Lt),
      ($[7] = isDraft),
      ($[8] = isWorking),
      ($[9] = oo));
  else oo = $[9];
  let Xt = oo,
    io;
  if ($[10] !== rt)
    ((io = () => (rt === "" || We.current === null ? 0 : measureElement(We.current).width)),
      ($[10] = rt),
      ($[11] = io));
  else io = $[11];
  let so = useMeasured(io),
    po = so > 0 ? " \xB7 " : "",
    co = rowColumns !== void 0 && so > Math.max(rowColumns, 0) ? He : rowColumns,
    bo = co === void 0 ? void 0 : co - so;
  const Ao = po + rt;
  let Bo;
  if ($[12] !== Ao) ((Bo = bunStringWidth(Ao)), ($[12] = Ao), ($[13] = Bo));
  else Bo = $[13];
  let min = Math.min(Bo, bunStringWidth(po) + TAIL_MIN_COLUMNS + 1),
    Ho = rt !== "" && (bo === void 0 || bo >= min);
  const Io = ze ? "none" : "flex",
    Wo = Ho ? 0 : 1;
  let mn;
  if ($[14] !== children || $[15] !== Wo)
    ((mn = e(Box, { ref: We, flexShrink: Wo, children: children })),
      ($[14] = children),
      ($[15] = Wo),
      ($[16] = mn));
  else mn = $[16];
  let Cn;
  if ($[17] !== Ho || $[18] !== po || $[19] !== rt || $[20] !== bo)
    ((Cn =
      Ho &&
      e(Box, { maxWidth: bo, children: r(Text, { dimColor: !0, wrap: "truncate", children: [po, rt] }) })),
      ($[17] = Ho),
      ($[18] = po),
      ($[19] = rt),
      ($[20] = bo),
      ($[21] = Cn));
  else Cn = $[21];
  let No;
  if ($[22] !== Cn || $[23] !== Io || $[24] !== mn)
    ((No = r(Box, { display: Io, children: [mn, Cn] })),
      ($[22] = Cn),
      ($[23] = Io),
      ($[24] = mn),
      ($[25] = No));
  else No = $[25];
  let vo;
  if ($[26] !== ze || $[27] !== At || $[28] !== It || $[29] !== mode || $[30] !== Xt)
    ((vo =
      At &&
      Xt !== void 0 &&
      r(Box, {
        children: [
          ze &&
            !It &&
            r(Text, {
              children: [
                e(PermissionModeLabel, { mode: mode }),
                e(Text, { dimColor: !0, children: " \xB7 " }),
              ],
            }),
          e(PromptHintNamespace4.PromptHintSite, { reading: Xt, onHidden: Xe, onTail: kt }),
          ze &&
            It &&
            r(Text, {
              children: [
                e(Text, { dimColor: !0, children: " \xB7 " }),
                e(PermissionModeLabel_2, { mode: mode }),
              ],
            }),
        ],
      })),
      ($[26] = ze),
      ($[27] = At),
      ($[28] = It),
      ($[29] = mode),
      ($[30] = Xt),
      ($[31] = vo));
  else vo = $[31];
  let Yo;
  if ($[32] !== No || $[33] !== vo)
    ((Yo = r(Box, { flexDirection: "column", children: [No, vo] })),
      ($[32] = No),
      ($[33] = vo),
      ($[34] = Yo));
  else Yo = $[34];
  return Yo;
}
//@ chunk-18hwfzwa.js:845610-846384 placement
var FooterHintLine = (h) => {
  let x = w(14),
    D,
    L;
  if (x[0] !== h) (({ wrappedRowWidth: L, ...D } = h), (x[0] = h), (x[1] = D), (x[2] = L));
  else ((D = x[1]), (L = x[2]));
  const ee = !D.isInputEmpty,
    ke =
      D.isSearching ||
      D.exitMessage.show ||
      D.isPasting === !0 ||
      D.showExpandPasteHint === !0 ||
      (D.row1Hint ?? null) !== null;
  let Re;
  if (x[3] !== D || x[4] !== L)
    ((Re = e(PromptInputFooterLeftSide, { ...D, wrappedRowWidth: L })), (x[3] = D), (x[4] = L), (x[5] = Re));
  else Re = x[5];
  let Be;
  if (
    x[6] !== D.isLoading ||
    x[7] !== D.rowWidth ||
    x[8] !== D.toolPermissionContext.mode ||
    x[9] !== ee ||
    x[10] !== ke ||
    x[11] !== Re ||
    x[12] !== L
  )
    ((Be = e(PromptHintNamespace2.PromptHintPart, {
      isDraft: ee,
      isWorking: D.isLoading,
      isInteractive: ke,
      mode: D.toolPermissionContext.mode,
      rowColumns: D.rowWidth,
      wrappedRowColumns: L,
      children: Re,
    })),
      (x[6] = D.isLoading),
      (x[7] = D.rowWidth),
      (x[8] = D.toolPermissionContext.mode),
      (x[9] = ee),
      (x[10] = ke),
      (x[11] = Re),
      (x[12] = L),
      (x[13] = Be));
  else Be = x[13];
  return Be;
};

export { PromptHintNamespace };
