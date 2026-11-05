/**
 * components/pluginUi/PromptHint.tsx
 *
 * 2.1.316 新增。插件在输入框的提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (20)
 * attribution: placement 20
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __export } from "../../../runtime/bun-runtime.js";
import {
  init_react_production,
  useState,
  useLayoutEffect,
  useRef,
} from "../../../vendor/react/cjs/react.production.js";
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
import { findEngineRef, VALIDATE_TREE_NAMESPACE } from "../../plugins/functionHooks/ui/index.js";
import { heldRenderInput } from "../../plugins/functionHooks/ui/renderDispatch.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:37568-37578 placement
var PromptHintNamespace = {};
//@ chunk-czq1j3j2.js:37578-37800 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:37578", () => {
  __export(PromptHintNamespace, {
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
});
//@ chunk-czq1j3j2.js:37800-37810 placement
var PromptHintNamespace2 = {};
//@ chunk-czq1j3j2.js:37810-37880 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:37810", () => {
  __export(PromptHintNamespace2, {
    PromptHintPart: () => PromptHintPart,
    TAIL_MIN_COLUMNS: () => TAIL_MIN_COLUMNS,
    default: () => PromptHintNamespace2,
  });
});
//@ chunk-czq1j3j2.js:37880-37890 placement
var PromptHintNamespace3 = {};
//@ chunk-czq1j3j2.js:37890-37940 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:37890", () => {
  __export(PromptHintNamespace3, {
    clean: () => clean,
    default: () => PromptHintNamespace3,
    read: () => read,
  });
});
//@ chunk-czq1j3j2.js:37940-37950 placement
var PromptHintNamespace4 = {};
//@ chunk-czq1j3j2.js:37950-38077 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:37950", () => {
  __export(PromptHintNamespace4, {
    IS_READ_AS_ROW_WIDE: () => IS_READ_AS_ROW_WIDE,
    PromptHintSite: () => PromptHintSite,
    default: () => PromptHintNamespace4,
    isTailStandingIn: () => isTailStandingIn,
    standsIn: () => standsIn,
    tailOf: () => tailOf,
  });
});
//@ chunk-czq1j3j2.js:848856-848860 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:848856", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:873489-873536 placement
var clean = (text) => truncateToLength(text.replace(/\s+/g, " ").trim(), MAX_KEPT_TEXT_CHARS);
//@ chunk-czq1j3j2.js:873536-873586 placement
var EMPTY_HINT_RE = /^(-- [A-Z ]+ -- )?(\u2193 )?$| \u00B7 $/;
//@ chunk-czq1j3j2.js:873586-873991 placement
function read(component, mode, reading, isComposer) {
  let fullText = clean(screenReaderText(component));
  let modeText = isComposer ? permissionModeLabelLower(mode) : `${permissionModeIndicator(mode)} on`;
  let modeIndex = isComposer ? -1 : fullText.indexOf(modeText);
  for (
    let searchIndex = isComposer && modeText !== "" ? fullText.indexOf(modeText) : -1;
    searchIndex !== -1;
    searchIndex = fullText.indexOf(modeText, searchIndex + 1)
  ) {
    let sliced = fullText.slice(0, searchIndex);
    let sliced_2 = fullText.slice(searchIndex + modeText.length);
    if (EMPTY_HINT_RE.test(sliced) && (sliced_2 === "" || sliced_2.startsWith(" \xB7 ")))
      modeIndex = searchIndex;
  }
  let strippedHint =
    modeIndex === -1
      ? fullText
      : clean(
          fullText.slice(0, modeIndex) + fullText.slice(modeIndex + modeText.length).replace(/^ \u00B7 /, ""),
        );
  let hint = isComposer ? strippedHint.replace(/ \u00B7$/, "") : strippedHint;
  return {
    ...reading,
    hint,
  };
}
//@ chunk-czq1j3j2.js:873991-874001 placement
var IS_READ_AS_ROW_WIDE = false;
//@ chunk-czq1j3j2.js:874001-874081 placement
var isTailStandingIn = ({ tail, isHeldOver, wasTailStoodIn, isRewritten }) =>
  tail !== "" && (isHeldOver ? wasTailStoodIn : !isRewritten);
//@ chunk-czq1j3j2.js:874085-874248 placement
function tailOf(component, reading) {
  let engineRef = findEngineRef(component);
  let renderInput = engineRef === undefined ? undefined : heldRenderInput(component, engineRef);
  return renderInput !== undefined &&
    renderInput.props.isDraft === reading.isDraft &&
    renderInput.props.isWorking === reading.isWorking
    ? clean(renderInput.props.tail ?? "")
    : "";
}
//@ chunk-czq1j3j2.js:874248-874424 placement
function standsIn(component, reading, checkTail) {
  let engineRef = findEngineRef(component);
  let renderInput = engineRef === undefined ? undefined : heldRenderInput(component, engineRef);
  let isEngineNode = typeof component !== "string" && component.type === "engine";
  if (renderInput === undefined) return !isEngineNode;
  return renderInput.props.hint !== reading.hint || (checkTail && tailOf(component, reading) !== "");
}
//@ chunk-czq1j3j2.js:874424-876401 placement
function PromptHintSite(props) {
  let $ = useMemoCache(40);
  let { reading, onHidden, onTail } = props;
  let renderInput;
  let renderDeps;
  if ($[0] !== reading) {
    renderInput = () => ({
      requestId: "prompt-hint",
      props: reading,
    });
    renderDeps = [reading];
    $[0] = reading;
    $[1] = renderInput;
    $[2] = renderDeps;
  } else {
    renderInput = $[1];
    renderDeps = $[2];
  }
  let renderKey = actionKeysNamespace.useRenderInput("PromptHint", renderInput, renderDeps);
  let [wasHeld, setWasHeld] = useState(false);
  let [wasRowWide, setWasRowWide] = useState(false);
  let hasHooks;
  if ($[3] !== renderKey) {
    hasHooks = VALIDATE_TREE_NAMESPACE.hasRenderHooksFor(renderKey);
    $[3] = renderKey;
    $[4] = hasHooks;
  } else hasHooks = $[4];
  let hasHooks_2 = hasHooks;
  let settledDraw = actionKeysNamespace.useSettledDraw(renderKey);
  let isSwarmGate = showSwarmFooterGate();
  let standsInBand;
  if ($[5] !== isSwarmGate || $[6] !== reading || $[7] !== settledDraw) {
    standsInBand = settledDraw !== undefined && standsIn(settledDraw, reading, isSwarmGate);
    $[5] = isSwarmGate;
    $[6] = reading;
    $[7] = settledDraw;
    $[8] = standsInBand;
  } else standsInBand = $[8];
  let standsInBand2 = standsInBand;
  let standsWide;
  if ($[9] !== standsInBand2 || $[10] !== reading || $[11] !== settledDraw) {
    standsWide =
      settledDraw !== undefined && standsInBand2 && !standsIn(settledDraw, reading, IS_READ_AS_ROW_WIDE);
    $[9] = standsInBand2;
    $[10] = reading;
    $[11] = settledDraw;
    $[12] = standsWide;
  } else standsWide = $[12];
  let standsWide_2 = standsWide;
  let showHint = settledDraw === undefined ? wasHeld : standsInBand2;
  let isHeldOver = settledDraw === undefined && hasHooks_2;
  let renderHint;
  if (
    $[13] !== isHeldOver ||
    $[14] !== showHint ||
    $[15] !== isSwarmGate ||
    $[16] !== reading ||
    $[17] !== wasRowWide
  ) {
    renderHint = (draw) => {
      let hintChanged = draw.props.hint !== reading.hint;
      let tail = isSwarmGate ? PromptHintNamespace3.clean(draw.props.tail ?? "") : "";
      let useTail = isTailStandingIn({
        tail,
        isHeldOver,
        wasTailStoodIn: wasRowWide,
        isRewritten: hintChanged,
      });
      return showHint && (isHeldOver || hintChanged || useTail)
        ? jsxProd_default(Text, {
            dimColor: true,
            wrap: "truncate",
            children: useTail ? tail : PromptHintNamespace3.clean(draw.props.hint),
          })
        : null;
    };
    $[13] = isHeldOver;
    $[14] = showHint;
    $[15] = isSwarmGate;
    $[16] = reading;
    $[17] = wasRowWide;
    $[18] = renderHint;
  } else renderHint = $[18];
  let drawing = actionKeysNamespace.useRenderDrawing(renderKey, renderHint);
  let drawn = showHint || isSwarmGate || !hasHooks_2 ? undefined : drawing.drawn;
  let tail;
  if ($[19] !== drawn || $[20] !== reading) {
    tail = drawn === undefined ? "" : tailOf(drawn, reading);
    $[19] = drawn;
    $[20] = reading;
    $[21] = tail;
  } else tail = $[21];
  let tail_2 = tail;
  let isFallback =
    settledDraw === undefined &&
    hasHooks_2 &&
    drawing.drawn !== undefined &&
    drawing.drawn !== SITE_RULES_NAMESPACE.RENDER_ENGINE_FALLBACK;
  let { drawn: drawn_2, hasThrown } = drawing;
  let notifyHidden;
  let notifyHiddenDeps;
  if (
    $[22] !== drawn_2 ||
    $[23] !== hasThrown ||
    $[24] !== isFallback ||
    $[25] !== standsInBand2 ||
    $[26] !== standsWide_2 ||
    $[27] !== onHidden
  ) {
    notifyHidden = () => {
      if (!isFallback && !hasThrown(drawn_2)) {
        setWasHeld(standsInBand2);
        setWasRowWide(standsWide_2);
        onHidden(standsInBand2);
      }
    };
    notifyHiddenDeps = [isFallback, standsInBand2, standsWide_2, onHidden, hasThrown, drawn_2];
    $[22] = drawn_2;
    $[23] = hasThrown;
    $[24] = isFallback;
    $[25] = standsInBand2;
    $[26] = standsWide_2;
    $[27] = onHidden;
    $[28] = notifyHidden;
    $[29] = notifyHiddenDeps;
  } else {
    notifyHidden = $[28];
    notifyHiddenDeps = $[29];
  }
  useLayoutEffect(notifyHidden, notifyHiddenDeps);
  let notifyTail;
  let notifyTailDeps;
  if ($[30] !== drawn_2 || $[31] !== hasThrown || $[32] !== onTail || $[33] !== tail_2) {
    notifyTail = () => {
      if (!hasThrown(drawn_2)) onTail(tail_2);
    };
    notifyTailDeps = [onTail, tail_2, hasThrown, drawn_2];
    $[30] = drawn_2;
    $[31] = hasThrown;
    $[32] = onTail;
    $[33] = tail_2;
    $[34] = notifyTail;
    $[35] = notifyTailDeps;
  } else {
    notifyTail = $[34];
    notifyTailDeps = $[35];
  }
  useLayoutEffect(notifyTail, notifyTailDeps);
  let cleanup;
  let cleanupDeps;
  if ($[36] !== onHidden || $[37] !== onTail) {
    cleanup = () => () => {
      onHidden(false);
      onTail("");
    };
    cleanupDeps = [onHidden, onTail];
    $[36] = onHidden;
    $[37] = onTail;
    $[38] = cleanup;
    $[39] = cleanupDeps;
  } else {
    cleanup = $[38];
    cleanupDeps = $[39];
  }
  useLayoutEffect(cleanup, cleanupDeps);
  return drawing.node;
}
//@ chunk-czq1j3j2.js:876401-876410 placement
var TAIL_MIN_COLUMNS = 4;
//@ chunk-czq1j3j2.js:876410-878467 placement
function PromptHintPart(props) {
  let $ = useMemoCache(35);
  let { isDraft, isWorking, isInteractive, mode, rowColumns, wrappedRowColumns, children } = props;
  let effectiveColumns = wrappedRowColumns === undefined ? rowColumns : wrappedRowColumns;
  let containerRef = useRef(null);
  let [isHidden, setHidden] = useState(false);
  let [tailText, setTailText] = useState("");
  let hasHooks = actionKeysNamespace.useHasRenderHooks("PromptHint") && !isInteractive;
  let isSwarmGate = showSwarmFooterGate();
  let readHint;
  if ($[0] !== isDraft || $[1] !== hasHooks || $[2] !== isSwarmGate || $[3] !== isWorking || $[4] !== mode) {
    readHint = () => {
      let hookKey = hasHooks ? containerRef.current : null;
      if (hookKey === null) {
        return null;
      }
      return PromptHintNamespace3.read(
        hookKey,
        mode,
        {
          isDraft,
          isWorking,
        },
        isSwarmGate,
      ).hint;
    };
    $[0] = isDraft;
    $[1] = hasHooks;
    $[2] = isSwarmGate;
    $[3] = isWorking;
    $[4] = mode;
    $[5] = readHint;
  } else readHint = $[5];
  let measured = useMeasured(readHint);
  let reading;
  if ($[6] !== measured || $[7] !== isDraft || $[8] !== isWorking) {
    reading =
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
    $[9] = reading;
  } else reading = $[9];
  let reading_2 = reading;
  let measureTail;
  if ($[10] !== tailText) {
    measureTail = () =>
      tailText === "" || containerRef.current === null ? 0 : measureElement(containerRef.current).width;
    $[10] = tailText;
    $[11] = measureTail;
  } else measureTail = $[11];
  let measured_2 = useMeasured(measureTail);
  let separator = measured_2 > 0 ? " \xB7 " : "";
  let effectiveRowColumns =
    rowColumns !== undefined && measured_2 > Math.max(rowColumns, 0) ? effectiveColumns : rowColumns;
  let tailRoom = effectiveRowColumns === undefined ? undefined : effectiveRowColumns - measured_2;
  const tailTextFull = separator + tailText;
  let tailTextWidth;
  if ($[12] !== tailTextFull) {
    tailTextWidth = bunStringWidth(tailTextFull);
    $[12] = tailTextFull;
    $[13] = tailTextWidth;
  } else tailTextWidth = $[13];
  let min = Math.min(tailTextWidth, bunStringWidth(separator) + TAIL_MIN_COLUMNS + 1);
  let showTail = tailText !== "" && (tailRoom === undefined || tailRoom >= min);
  const display = isHidden ? "none" : "flex";
  const flexShrink = showTail ? 0 : 1;
  let childrenBox;
  if ($[14] !== children || $[15] !== flexShrink) {
    childrenBox = jsxProd_default(Box, {
      ref: containerRef,
      flexShrink,
      children,
    });
    $[14] = children;
    $[15] = flexShrink;
    $[16] = childrenBox;
  } else childrenBox = $[16];
  let tailBox;
  if ($[17] !== showTail || $[18] !== separator || $[19] !== tailText || $[20] !== tailRoom) {
    tailBox =
      showTail &&
      jsxProd_default(Box, {
        maxWidth: tailRoom,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          wrap: "truncate",
          children: [separator, tailText],
        }),
      });
    $[17] = showTail;
    $[18] = separator;
    $[19] = tailText;
    $[20] = tailRoom;
    $[21] = tailBox;
  } else tailBox = $[21];
  let row;
  if ($[22] !== tailBox || $[23] !== display || $[24] !== childrenBox) {
    row = jsxProd_default_2(Box, {
      display,
      children: [childrenBox, tailBox],
    });
    $[22] = tailBox;
    $[23] = display;
    $[24] = childrenBox;
    $[25] = row;
  } else row = $[25];
  let hintBox;
  if (
    $[26] !== isHidden ||
    $[27] !== hasHooks ||
    $[28] !== isSwarmGate ||
    $[29] !== mode ||
    $[30] !== reading_2
  ) {
    hintBox =
      hasHooks &&
      reading_2 !== undefined &&
      jsxProd_default_2(Box, {
        children: [
          isHidden &&
            !isSwarmGate &&
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
            reading: reading_2,
            onHidden: setHidden,
            onTail: setTailText,
          }),
          isHidden &&
            isSwarmGate &&
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
    $[26] = isHidden;
    $[27] = hasHooks;
    $[28] = isSwarmGate;
    $[29] = mode;
    $[30] = reading_2;
    $[31] = hintBox;
  } else hintBox = $[31];
  let content;
  if ($[32] !== row || $[33] !== hintBox) {
    content = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [row, hintBox],
    });
    $[32] = row;
    $[33] = hintBox;
    $[34] = content;
  } else content = $[34];
  return content;
}
//@ chunk-czq1j3j2.js:878467-879241 placement
var FooterHintLine = (props) => {
  let $ = useMemoCache(14);
  let footerProps;
  let wrappedRowWidth;
  if ($[0] !== props) {
    ({ wrappedRowWidth, ...footerProps } = props);
    $[0] = props;
    $[1] = footerProps;
    $[2] = wrappedRowWidth;
  } else {
    footerProps = $[1];
    wrappedRowWidth = $[2];
  }
  const isDraft = !footerProps.isInputEmpty;
  const isInteractive =
    footerProps.isSearching ||
    footerProps.exitMessage.show ||
    footerProps.isPasting === true ||
    footerProps.showExpandPasteHint === true ||
    (footerProps.row1Hint ?? null) !== null;
  let children;
  if ($[3] !== footerProps || $[4] !== wrappedRowWidth) {
    children = jsxProd_default(PromptInputFooterLeftSide, {
      ...footerProps,
      wrappedRowWidth,
    });
    $[3] = footerProps;
    $[4] = wrappedRowWidth;
    $[5] = children;
  } else children = $[5];
  let hintElement;
  if (
    $[6] !== footerProps.isLoading ||
    $[7] !== footerProps.rowWidth ||
    $[8] !== footerProps.toolPermissionContext.mode ||
    $[9] !== isDraft ||
    $[10] !== isInteractive ||
    $[11] !== children ||
    $[12] !== wrappedRowWidth
  ) {
    hintElement = jsxProd_default(PromptHintNamespace2.PromptHintPart, {
      isDraft,
      isWorking: footerProps.isLoading,
      isInteractive,
      mode: footerProps.toolPermissionContext.mode,
      rowColumns: footerProps.rowWidth,
      wrappedRowColumns: wrappedRowWidth,
      children,
    });
    $[6] = footerProps.isLoading;
    $[7] = footerProps.rowWidth;
    $[8] = footerProps.toolPermissionContext.mode;
    $[9] = isDraft;
    $[10] = isInteractive;
    $[11] = children;
    $[12] = wrappedRowWidth;
    $[13] = hintElement;
  } else hintElement = $[13];
  return hintElement;
};
export { PromptHintNamespace };
