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
import { MAX_KEPT_TEXT_CHARS } from "../../plugins/functionHooks/sites/siteRules.js";
import { screenReaderText } from "../../ink/render-to-screen-reader.js";
import {
  permissionModeLabelLower,
  PermissionModeLabel,
  PermissionModeLabel_2,
  PromptInputFooterLeftSide,
} from "../PromptInput/PromptInputFooterLeftSide.js";
import { permissionModeIndicator } from "../../utils/permissions/PermissionMode.js";
import { init_react_production, y, zt, R } from "../../../vendor/react/cjs/react.production.js";
import { findEngineRef, VALIDATE_TREE_NAMESPACE } from "../../plugins/functionHooks/ui/index.js";
import { heldRenderInput } from "../../plugins/functionHooks/ui/renderDispatch.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { actionKeysNamespace } from "./render/actionKeys.js";
import { showSwarmFooterGate } from "../PromptInput/footerGates.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { SITE_RULES_NAMESPACE } from "../../plugins/functionHooks/sites/index.js";
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
Ar(PromptHintNamespace3, {
  clean: () => clean,
  default: () => PromptHintNamespace3,
  read: () => read,
});
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
var clean = (h) => truncateToLength(h.replace(/\s+/g, " ").trim(), MAX_KEPT_TEXT_CHARS);
//@ chunk-18hwfzwa.js:840679-840729 placement
var EMPTY_HINT_RE = /^(-- [A-Z ]+ -- )?(\u2193 )?$| \u00B7 $/;
//@ chunk-18hwfzwa.js:840729-841134 placement
function read(h, x, D, L) {
  let ee = clean(screenReaderText(h));
  let ke = L ? permissionModeLabelLower(x) : `${permissionModeIndicator(x)} on`;
  let Re = L ? -1 : ee.indexOf(ke);
  for (let ze = L && ke !== "" ? ee.indexOf(ke) : -1; ze !== -1; ze = ee.indexOf(ke, ze + 1)) {
    let sliced = ee.slice(0, ze);
    let sliced_2 = ee.slice(ze + ke.length);
    if (EMPTY_HINT_RE.test(sliced) && (sliced_2 === "" || sliced_2.startsWith(" \xB7 "))) Re = ze;
  }
  let He = Re === -1 ? ee : clean(ee.slice(0, Re) + ee.slice(Re + ke.length).replace(/^ \u00B7 /, ""));
  let hint = L ? He.replace(/ \u00B7$/, "") : He;
  return {
    ...D,
    hint,
  };
}
//@ chunk-18hwfzwa.js:841134-841144 placement
var IS_READ_AS_ROW_WIDE = false;
//@ chunk-18hwfzwa.js:841144-841224 placement
var isTailStandingIn = ({ tail, isHeldOver, wasTailStoodIn, isRewritten }) =>
  tail !== "" && (isHeldOver ? wasTailStoodIn : !isRewritten);
//@ chunk-18hwfzwa.js:841224-841228 placement
init_react_production();
//@ chunk-18hwfzwa.js:841228-841391 placement
function tailOf(h, x) {
  let engineRef = findEngineRef(h);
  let L = engineRef === undefined ? undefined : heldRenderInput(h, engineRef);
  return L !== undefined && L.props.isDraft === x.isDraft && L.props.isWorking === x.isWorking
    ? clean(L.props.tail ?? "")
    : "";
}
//@ chunk-18hwfzwa.js:841391-841567 placement
function standsIn(h, reading, D) {
  let engineRef = findEngineRef(h);
  let ee = engineRef === undefined ? undefined : heldRenderInput(h, engineRef);
  let ke = typeof h !== "string" && h.type === "engine";
  if (ee === undefined) return !ke;
  return ee.props.hint !== reading.hint || (D && tailOf(h, reading) !== "");
}
//@ chunk-18hwfzwa.js:841567-843544 placement
function PromptHintSite(props) {
  let $ = w(40);
  let { reading, onHidden, onTail } = props;
  let ke;
  let Re;
  if ($[0] !== reading) {
    ke = () => ({
      requestId: "prompt-hint",
      props: reading,
    });
    Re = [reading];
    $[0] = reading;
    $[1] = ke;
    $[2] = Re;
  } else {
    ke = $[1];
    Re = $[2];
  }
  let Be = actionKeysNamespace.useRenderInput("PromptHint", ke, Re);
  let [He, We] = y(false);
  let [ze, Xe] = y(false);
  let rt;
  if ($[3] !== Be) {
    rt = VALIDATE_TREE_NAMESPACE.hasRenderHooksFor(Be);
    $[3] = Be;
    $[4] = rt;
  } else rt = $[4];
  let kt = rt;
  let At = actionKeysNamespace.useSettledDraw(Be);
  let It = showSwarmFooterGate();
  let Ot;
  if ($[5] !== It || $[6] !== reading || $[7] !== At) {
    Ot = At !== undefined && standsIn(At, reading, It);
    $[5] = It;
    $[6] = reading;
    $[7] = At;
    $[8] = Ot;
  } else Ot = $[8];
  let Et = Ot;
  let Dt;
  if ($[9] !== Et || $[10] !== reading || $[11] !== At) {
    Dt = At !== undefined && Et && !standsIn(At, reading, IS_READ_AS_ROW_WIDE);
    $[9] = Et;
    $[10] = reading;
    $[11] = At;
    $[12] = Dt;
  } else Dt = $[12];
  let Lt = Dt;
  let oo = At === undefined ? He : Et;
  let Xt = At === undefined && kt;
  let io;
  if ($[13] !== Xt || $[14] !== oo || $[15] !== It || $[16] !== reading || $[17] !== ze) {
    io = (so) => {
      let po = so.props.hint !== reading.hint;
      let ao = It ? PromptHintNamespace3.clean(so.props.tail ?? "") : "";
      let co = isTailStandingIn({
        tail: ao,
        isHeldOver: Xt,
        wasTailStoodIn: ze,
        isRewritten: po,
      });
      return oo && (Xt || po || co)
        ? jsxProd_default(Text, {
            dimColor: true,
            wrap: "truncate",
            children: co ? ao : PromptHintNamespace3.clean(so.props.hint),
          })
        : null;
    };
    $[13] = Xt;
    $[14] = oo;
    $[15] = It;
    $[16] = reading;
    $[17] = ze;
    $[18] = io;
  } else io = $[18];
  let bo = actionKeysNamespace.useRenderDrawing(Be, io);
  let drawn = oo || It || !kt ? undefined : bo.drawn;
  let Bo;
  if ($[19] !== drawn || $[20] !== reading) {
    Bo = drawn === undefined ? "" : tailOf(drawn, reading);
    $[19] = drawn;
    $[20] = reading;
    $[21] = Bo;
  } else Bo = $[21];
  let Ro = Bo;
  let Ho =
    At === undefined &&
    kt &&
    bo.drawn !== undefined &&
    bo.drawn !== SITE_RULES_NAMESPACE.RENDER_ENGINE_FALLBACK;
  let { drawn: drawn_2, hasThrown } = bo;
  let mn;
  let Cn;
  if (
    $[22] !== drawn_2 ||
    $[23] !== hasThrown ||
    $[24] !== Ho ||
    $[25] !== Et ||
    $[26] !== Lt ||
    $[27] !== onHidden
  ) {
    mn = () => {
      if (!Ho && !hasThrown(drawn_2)) {
        We(Et);
        Xe(Lt);
        onHidden(Et);
      }
    };
    Cn = [Ho, Et, Lt, onHidden, hasThrown, drawn_2];
    $[22] = drawn_2;
    $[23] = hasThrown;
    $[24] = Ho;
    $[25] = Et;
    $[26] = Lt;
    $[27] = onHidden;
    $[28] = mn;
    $[29] = Cn;
  } else {
    mn = $[28];
    Cn = $[29];
  }
  zt(mn, Cn);
  let No;
  let vo;
  if ($[30] !== drawn_2 || $[31] !== hasThrown || $[32] !== onTail || $[33] !== Ro) {
    No = () => {
      if (!hasThrown(drawn_2)) onTail(Ro);
    };
    vo = [onTail, Ro, hasThrown, drawn_2];
    $[30] = drawn_2;
    $[31] = hasThrown;
    $[32] = onTail;
    $[33] = Ro;
    $[34] = No;
    $[35] = vo;
  } else {
    No = $[34];
    vo = $[35];
  }
  zt(No, vo);
  let Yo;
  let kn;
  if ($[36] !== onHidden || $[37] !== onTail) {
    Yo = () => () => {
      onHidden(false);
      onTail("");
    };
    kn = [onHidden, onTail];
    $[36] = onHidden;
    $[37] = onTail;
    $[38] = Yo;
    $[39] = kn;
  } else {
    Yo = $[38];
    kn = $[39];
  }
  zt(Yo, kn);
  return bo.node;
}
//@ chunk-18hwfzwa.js:843544-843553 placement
var TAIL_MIN_COLUMNS = 4;
//@ chunk-18hwfzwa.js:843553-845610 placement
function PromptHintPart(props) {
  let $ = w(35);
  let { isDraft, isWorking, isInteractive, mode, rowColumns, wrappedRowColumns, children } = props;
  let He = wrappedRowColumns === undefined ? rowColumns : wrappedRowColumns;
  let We = R(null);
  let [ze, Xe] = y(false);
  let [rt, kt] = y("");
  let At = actionKeysNamespace.useHasRenderHooks("PromptHint") && !isInteractive;
  let It = showSwarmFooterGate();
  let Et;
  if ($[0] !== isDraft || $[1] !== At || $[2] !== It || $[3] !== isWorking || $[4] !== mode) {
    Et = () => {
      let Dt = At ? We.current : null;
      if (Dt === null) {
        return null;
      }
      return PromptHintNamespace3.read(
        Dt,
        mode,
        {
          isDraft,
          isWorking,
        },
        It,
      ).hint;
    };
    $[0] = isDraft;
    $[1] = At;
    $[2] = It;
    $[3] = isWorking;
    $[4] = mode;
    $[5] = Et;
  } else Et = $[5];
  let measured = useMeasured(Et);
  let oo;
  if ($[6] !== measured || $[7] !== isDraft || $[8] !== isWorking) {
    oo =
      measured === null
        ? undefined
        : {
            isDraft,
            isWorking,
            hint: measured,
          };
    $[6] = measured;
    $[7] = isDraft;
    $[8] = isWorking;
    $[9] = oo;
  } else oo = $[9];
  let Xt = oo;
  let io;
  if ($[10] !== rt) {
    io = () => (rt === "" || We.current === null ? 0 : measureElement(We.current).width);
    $[10] = rt;
    $[11] = io;
  } else io = $[11];
  let measured_2 = useMeasured(io);
  let po = measured_2 > 0 ? " \xB7 " : "";
  let co = rowColumns !== undefined && measured_2 > Math.max(rowColumns, 0) ? He : rowColumns;
  let bo = co === undefined ? undefined : co - measured_2;
  const Ao = po + rt;
  let Bo;
  if ($[12] !== Ao) {
    Bo = bunStringWidth(Ao);
    $[12] = Ao;
    $[13] = Bo;
  } else Bo = $[13];
  let min = Math.min(Bo, bunStringWidth(po) + TAIL_MIN_COLUMNS + 1);
  let Ho = rt !== "" && (bo === undefined || bo >= min);
  const display = ze ? "none" : "flex";
  const flexShrink = Ho ? 0 : 1;
  let mn;
  if ($[14] !== children || $[15] !== flexShrink) {
    mn = jsxProd_default(Box, {
      ref: We,
      flexShrink,
      children,
    });
    $[14] = children;
    $[15] = flexShrink;
    $[16] = mn;
  } else mn = $[16];
  let Cn;
  if ($[17] !== Ho || $[18] !== po || $[19] !== rt || $[20] !== bo) {
    Cn =
      Ho &&
      jsxProd_default(Box, {
        maxWidth: bo,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          wrap: "truncate",
          children: [po, rt],
        }),
      });
    $[17] = Ho;
    $[18] = po;
    $[19] = rt;
    $[20] = bo;
    $[21] = Cn;
  } else Cn = $[21];
  let No;
  if ($[22] !== Cn || $[23] !== display || $[24] !== mn) {
    No = jsxProd_default_2(Box, {
      display,
      children: [mn, Cn],
    });
    $[22] = Cn;
    $[23] = display;
    $[24] = mn;
    $[25] = No;
  } else No = $[25];
  let vo;
  if ($[26] !== ze || $[27] !== At || $[28] !== It || $[29] !== mode || $[30] !== Xt) {
    vo =
      At &&
      Xt !== undefined &&
      jsxProd_default_2(Box, {
        children: [
          ze &&
            !It &&
            jsxProd_default_2(Text, {
              children: [
                jsxProd_default(PermissionModeLabel, {
                  mode,
                }),
                jsxProd_default(Text, {
                  dimColor: true,
                  children: " \xB7 ",
                }),
              ],
            }),
          jsxProd_default(PromptHintNamespace4.PromptHintSite, {
            reading: Xt,
            onHidden: Xe,
            onTail: kt,
          }),
          ze &&
            It &&
            jsxProd_default_2(Text, {
              children: [
                jsxProd_default(Text, {
                  dimColor: true,
                  children: " \xB7 ",
                }),
                jsxProd_default(PermissionModeLabel_2, {
                  mode,
                }),
              ],
            }),
        ],
      });
    $[26] = ze;
    $[27] = At;
    $[28] = It;
    $[29] = mode;
    $[30] = Xt;
    $[31] = vo;
  } else vo = $[31];
  let Yo;
  if ($[32] !== No || $[33] !== vo) {
    Yo = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [No, vo],
    });
    $[32] = No;
    $[33] = vo;
    $[34] = Yo;
  } else Yo = $[34];
  return Yo;
}
//@ chunk-18hwfzwa.js:845610-846384 placement
var FooterHintLine = (h) => {
  let x = w(14);
  let D;
  let L;
  if (x[0] !== h) {
    ({ wrappedRowWidth: L, ...D } = h);
    x[0] = h;
    x[1] = D;
    x[2] = L;
  } else {
    D = x[1];
    L = x[2];
  }
  const isDraft = !D.isInputEmpty;
  const isInteractive =
    D.isSearching ||
    D.exitMessage.show ||
    D.isPasting === true ||
    D.showExpandPasteHint === true ||
    (D.row1Hint ?? null) !== null;
  let children;
  if (x[3] !== D || x[4] !== L) {
    children = jsxProd_default(PromptInputFooterLeftSide, {
      ...D,
      wrappedRowWidth: L,
    });
    x[3] = D;
    x[4] = L;
    x[5] = children;
  } else children = x[5];
  let Be;
  if (
    x[6] !== D.isLoading ||
    x[7] !== D.rowWidth ||
    x[8] !== D.toolPermissionContext.mode ||
    x[9] !== isDraft ||
    x[10] !== isInteractive ||
    x[11] !== children ||
    x[12] !== L
  ) {
    Be = jsxProd_default(PromptHintNamespace2.PromptHintPart, {
      isDraft,
      isWorking: D.isLoading,
      isInteractive,
      mode: D.toolPermissionContext.mode,
      rowColumns: D.rowWidth,
      wrappedRowColumns: L,
      children,
    });
    x[6] = D.isLoading;
    x[7] = D.rowWidth;
    x[8] = D.toolPermissionContext.mode;
    x[9] = isDraft;
    x[10] = isInteractive;
    x[11] = children;
    x[12] = L;
    x[13] = Be;
  } else Be = x[13];
  return Be;
};
export { PromptHintNamespace };
