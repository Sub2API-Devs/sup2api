/**
 * components/PrBadge.tsx
 *
 * PR 徽章：PR 号 + 审查状态颜色（approved/changes_requested/pending/merged…）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PrBadge.tsx
 * pieces: chunk-qgpgvvwv.js (10)
 * attribution: placement 4, fingerprint 2, layout 4
 */
import { init_react_production, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useAppState } from "../state/AppState.js";
import { expandPrUrlIfTemplate } from "../utils/ghPrStatus.js";
import {
  jsxProd_default_2,
  Fragment,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link } from "../ink/components/Text.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-qgpgvvwv.js:595-599 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qgpgvvwv.js:595", () => {
  init_react_production();
});
//@ chunk-qgpgvvwv.js:599-603 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qgpgvvwv.js:599", () => {
  init_react_production();
});
//@ chunk-qgpgvvwv.js:603-624 placement
var CURRENT_PR = "current-pr";
//@ chunk-qgpgvvwv.js:808-976 fingerprint = getPrStatusColor (1)
function getPrStatusColor(state) {
  switch (state) {
    case "approved":
      return "success";
    case "changes_requested":
      return "error";
    case "pending":
      return "warning";
    case "merged":
      return "merged";
    default:
      return;
  }
}
//@ chunk-qgpgvvwv.js:976-1001 layout
function noopPrAction(state, url, isMergeRequest) {
  return;
}
//@ chunk-qgpgvvwv.js:1001-1085 layout
/**
 * 函数 usePrActionEffect（PR 动作 effect）；位于「PR 徽章：PR 号 + 审查状态颜色（approved/changes_requested/pending/merged…）」模块。
 */
function usePrActionEffect(state, url, kind) {
  useEffect(() => {
    if (url === undefined) return;
    noopPrAction(state, url, kind === "cr" || kind === "mr");
  }, [state, url, kind]);
}
//@ chunk-qgpgvvwv.js:1085-1135 layout
function selectPrUrlTemplate(state) {
  return state.settings?.prUrlTemplate;
}
//@ chunk-qgpgvvwv.js:1135-2596 fingerprint = PrBadge (0.723)
function PrBadge(props) {
  let $ = useMemoCache(41);
  let { number, url, reviewState, bold, color, dimColor, inverse, underline, hidePrefix, kind } = props;
  let isUnderlined = underline === undefined ? true : underline;
  let isGitLab = kind === "cr" && false;
  let isMergeRequest = kind === "mr";
  let sigil = isMergeRequest ? "!" : "#";
  let appState = useAppState(selectPrUrlTemplate);
  let resolvedUrl;
  if ($[0] !== isGitLab || $[1] !== isMergeRequest || $[2] !== appState || $[3] !== url) {
    resolvedUrl = isGitLab || isMergeRequest ? url : expandPrUrlIfTemplate(url, appState);
    $[0] = isGitLab;
    $[1] = isMergeRequest;
    $[2] = appState;
    $[3] = url;
    $[4] = resolvedUrl;
  } else resolvedUrl = $[4];
  let resolvedUrlValue = resolvedUrl;
  let actionEffect;
  let actionDeps;
  if ($[5] !== isGitLab || $[6] !== isMergeRequest || $[7] !== url || $[8] !== resolvedUrlValue) {
    actionEffect = () => {
      noopPrAction(resolvedUrlValue, url, isGitLab || isMergeRequest);
    };
    actionDeps = [resolvedUrlValue, url, isGitLab, isMergeRequest];
    $[5] = isGitLab;
    $[6] = isMergeRequest;
    $[7] = url;
    $[8] = resolvedUrlValue;
    $[9] = actionEffect;
    $[10] = actionDeps;
  } else {
    actionEffect = $[9];
    actionDeps = $[10];
  }
  useEffect(actionEffect, actionDeps);
  let statusColor;
  if ($[11] !== color || $[12] !== reviewState) {
    statusColor = color ?? getPrStatusColor_2(reviewState);
    $[11] = color;
    $[12] = reviewState;
    $[13] = statusColor;
  } else statusColor = $[13];
  let statusColorValue = statusColor;
  let dimColor_2 = !inverse && (dimColor || (!statusColorValue && !bold));
  let outerElement;
  if (
    $[14] !== bold ||
    $[15] !== dimColor_2 ||
    $[16] !== sigil ||
    $[17] !== inverse ||
    $[18] !== number ||
    $[19] !== statusColorValue
  ) {
    outerElement = jsxProd_default_2(Text, {
      color: statusColorValue,
      dimColor: dimColor_2,
      bold,
      inverse,
      children: [sigil, number],
    });
    $[14] = bold;
    $[15] = dimColor_2;
    $[16] = sigil;
    $[17] = inverse;
    $[18] = number;
    $[19] = statusColorValue;
    $[20] = outerElement;
  } else outerElement = $[20];
  let fallback = outerElement;
  let prefixElement;
  if ($[21] !== bold || $[22] !== dimColor || $[23] !== hidePrefix || $[24] !== isMergeRequest) {
    prefixElement =
      !hidePrefix &&
      jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(Text, {
            dimColor: dimColor || !bold,
            children: isMergeRequest ? "MR" : "PR",
          }),
          " ",
        ],
      });
    $[21] = bold;
    $[22] = dimColor;
    $[23] = hidePrefix;
    $[24] = isMergeRequest;
    $[25] = prefixElement;
  } else prefixElement = $[25];
  const underline_2 = !inverse && isUnderlined;
  let children;
  if (
    $[26] !== bold ||
    $[27] !== dimColor_2 ||
    $[28] !== sigil ||
    $[29] !== inverse ||
    $[30] !== number ||
    $[31] !== statusColorValue ||
    $[32] !== underline_2
  ) {
    children = jsxProd_default_2(Text, {
      color: statusColorValue,
      dimColor: dimColor_2,
      underline: underline_2,
      bold,
      inverse,
      children: [sigil, number],
    });
    $[26] = bold;
    $[27] = dimColor_2;
    $[28] = sigil;
    $[29] = inverse;
    $[30] = number;
    $[31] = statusColorValue;
    $[32] = underline_2;
    $[33] = children;
  } else children = $[33];
  let linkElement;
  if ($[34] !== fallback || $[35] !== children || $[36] !== resolvedUrlValue) {
    linkElement = jsxProd_default(Link, {
      url: resolvedUrlValue,
      fallback,
      assumeSupport: true,
      children,
    });
    $[34] = fallback;
    $[35] = children;
    $[36] = resolvedUrlValue;
    $[37] = linkElement;
  } else linkElement = $[37];
  let rowElement;
  if ($[38] !== linkElement || $[39] !== prefixElement) {
    rowElement = jsxProd_default_2(Text, {
      children: [prefixElement, linkElement],
    });
    $[38] = linkElement;
    $[39] = prefixElement;
    $[40] = rowElement;
  } else rowElement = $[40];
  return rowElement;
}
//@ chunk-qgpgvvwv.js:2596-2763 layout = getPrStatusColor (1)
function getPrStatusColor_2(state) {
  switch (state) {
    case "approved":
      return "success";
    case "changes_requested":
      return "error";
    case "pending":
      return "warning";
    case "merged":
      return "merged";
    default:
      return;
  }
}
//@ chunk-qgpgvvwv.js:2763-3227 placement
/**
 * 显示增删行数（+N 绿色、-N 红色），都为 0 时不渲染。
 */
function DiffStatCounts(props) {
  let $ = useMemoCache(10);
  let { added, removed, bold } = props;
  if (added === 0 && removed === 0) {
    return null;
  }
  let addedElement;
  if ($[0] !== added || $[1] !== bold) {
    addedElement =
      added > 0 &&
      jsxProd_default_2(Text, {
        color: "diffAddedWord",
        bold,
        children: ["+", added],
      });
    $[0] = added;
    $[1] = bold;
    $[2] = addedElement;
  } else addedElement = $[2];
  const removedElement = added > 0 && removed > 0 && " ";
  let countsElement;
  if ($[3] !== bold || $[4] !== removed) {
    countsElement =
      removed > 0 &&
      jsxProd_default_2(Text, {
        color: "diffRemovedWord",
        bold,
        children: ["-", removed],
      });
    $[3] = bold;
    $[4] = removed;
    $[5] = countsElement;
  } else countsElement = $[5];
  let textElement;
  if ($[6] !== addedElement || $[7] !== removedElement || $[8] !== countsElement) {
    textElement = jsxProd_default_2(Text, {
      children: [addedElement, removedElement, countsElement],
    });
    $[6] = addedElement;
    $[7] = removedElement;
    $[8] = countsElement;
    $[9] = textElement;
  } else textElement = $[9];
  return textElement;
}
export { DiffStatCounts, usePrActionEffect, CURRENT_PR, PrBadge, getPrStatusColor };
