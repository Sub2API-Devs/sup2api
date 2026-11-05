/**
 * components/PromptInput/PromptInputFooterStatus.tsx
 *
 * 2.1.316 新增。页脚状态段（任务、PR、桥接等）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (29)
 * attribution: placement 29
 */
import { init_react_production, useMemo } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { selectRemoteSessionUrl_2 } from "../../commands/session/session.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { BridgeStatusIndicator } from "./PromptInputFooter.js";
import { useHasComplianceTaint } from "../LogoV2/LogoV2.js";
import { useForceRender } from "../../hooks/useForceRender.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Link, Text, Box } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { PrBadge } from "../PrBadge.js";
import { prStatusHint } from "../../utils/ghPrStatus.js";
import { actionKeysNamespace } from "../pluginUi/render/actionKeys.js";
import { Byline } from "../design-system/Byline.js";
import { HIPAA_CONFIGURED_LABEL } from "../../services/policyLimits/complianceTaints.js";
import { useShortcutDisplay } from "../../keybindings/useKeybindingDisplay.js";
import { RemoteControlStatus, shortRcLabel } from "./RemoteControlPill.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { DOWN_ARROW } from "../../constants/figures.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { DEFAULT_MATCH_TEXT_STYLE, INVERSE_MATCH_TEXT_STYLE } from "../../utils/highlightMatch.js";
import {
  STANDALONE_SYMBOL_PATTERN,
  BLANK_LOOKALIKE_RE,
  INVISIBLE_SYMBOL_RE,
  regExp as regExp_7,
  COMBINING_MARK_RE,
} from "../../utils/emojiPatterns.js";
import { cleanForDisplay } from "../../utils/stringUtils.js";
import { useMergedClients } from "./Notifications.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useHasRenderHooks } from "../pluginUi/render/RenderInstance.js";
import { useIdeConnectionStatus } from "../../hooks/useIdeConnectionStatus.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { IdeStatusIndicator } from "../IdeStatusIndicator.js";
import { sequential } from "../../utils/sequential.js";
import { truncateToWidth } from "../../utils/format.js";
import { EDITOR_MODES } from "../../utils/configConstants.js";
import { checkHasTrustDialogAccepted } from "../../utils/config.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:818286-818290 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:818286", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:827828-827878 placement (2.1.88 match: _temp5, 1)
function selectRemoteConnectionStatus(s) {
  return s.remoteConnectionStatus;
}
//@ chunk-czq1j3j2.js:827878-827914 placement
function selectPrStatus(state) {
  return state.prStatus;
}
//@ chunk-czq1j3j2.js:827914-827953 placement
function selectPrNeedsAuth(state) {
  return state.prNeedsAuth;
}
//@ chunk-czq1j3j2.js:827953-827998 placement
function selectSlackTagConnected_2(state) {
  return state.slackTagConnected;
}
//@ chunk-czq1j3j2.js:827998-828234 placement
function ideStatusSuffix(appState) {
  switch (appState) {
    case "reconnecting":
      return {
        suffix: " \xB7 reconnecting\u2026",
        color: "warning",
      };
    case "disconnected":
      return {
        suffix: " \xB7 disconnected",
        color: "error",
      };
    case "connecting":
    case "connected":
      return {
        suffix: "",
        color: "ide",
      };
  }
}
//@ chunk-czq1j3j2.js:828234-830438 placement
function FooterStatusLine(props) {
  let $ = useMemoCache(42);
  let { debug, bridgeSelected, modeLabels } = props;
  let appState = useAppState(selectRemoteSessionUrl_2);
  let appState_2 = useAppState(selectRemoteConnectionStatus);
  let isFullscreen = useIsFullscreen();
  let bridgeStatus = BridgeStatusIndicator(!isFullscreen);
  let hasComplianceTaint = useHasComplianceTaint("hipaa");
  useForceRender();
  let prBadgesEnabled;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    prBadgesEnabled = getFeatureValue_CACHED_MAY_BE_STALE("tengu_copper_thistle", false);
    $[0] = prBadgesEnabled;
  } else prBadgesEnabled = $[0];
  let prBadgesFlag = prBadgesEnabled;
  let appState_3 = useAppState(selectPrStatus);
  let hint = useAppState(selectPrNeedsAuth);
  let showPrStatus = prBadgesFlag && (appState_3 !== null || hint);
  useAppState(selectSlackTagConnected_2);
  let segments;
  if (
    $[1] !== bridgeSelected ||
    $[2] !== bridgeStatus ||
    $[3] !== debug ||
    $[4] !== hasComplianceTaint ||
    $[5] !== hint ||
    $[6] !== appState_3 ||
    $[7] !== appState_2 ||
    $[8] !== appState ||
    $[9] !== showPrStatus
  ) {
    segments = [];
    if (hasComplianceTaint) {
      let hipaaBadge;
      if ($[11] === MEMO_CACHE_SENTINEL) {
        hipaaBadge = jsxProd_default(PermissionPromptPendingText, {}, "hipaa");
        $[11] = hipaaBadge;
      } else hipaaBadge = $[11];
      segments.push(hipaaBadge);
    }
    if (appState) {
      let ideSuffix;
      if ($[12] !== appState_2) {
        ideSuffix = ideStatusSuffix(appState_2);
        $[12] = appState_2;
        $[13] = ideSuffix;
      } else ideSuffix = $[13];
      let { suffix, color } = ideSuffix;
      let children;
      if ($[14] !== appState || $[15] !== suffix) {
        children = jsxProd_default_2(Link, {
          url: appState,
          children: [figures_default.circleDouble, " cloud", suffix],
        });
        $[14] = appState;
        $[15] = suffix;
        $[16] = children;
      } else children = $[16];
      let ideElement;
      if ($[17] !== color || $[18] !== children) {
        ideElement = jsxProd_default(
          Text,
          {
            color,
            wrap: "truncate",
            children,
          },
          "cloud",
        );
        $[17] = color;
        $[18] = children;
        $[19] = ideElement;
      } else ideElement = $[19];
      segments.push(ideElement);
    }
    if (debug) {
      let ideText;
      if ($[20] === MEMO_CACHE_SENTINEL) {
        ideText = jsxProd_default(
          Text,
          {
            color: "warning",
            wrap: "truncate",
            children: "Debug",
          },
          "debug",
        );
        $[20] = ideText;
      } else ideText = $[20];
      segments.push(ideText);
    }
    if (bridgeStatus !== null) {
      let bridgeElement;
      if ($[21] !== bridgeSelected || $[22] !== bridgeStatus) {
        bridgeElement = jsxProd_default(
          FooterOpenSelected,
          {
            status: bridgeStatus,
            bridgeSelected,
          },
          "bridge",
        );
        $[21] = bridgeSelected;
        $[22] = bridgeStatus;
        $[23] = bridgeElement;
      } else bridgeElement = $[23];
      segments.push(bridgeElement);
    }
    if (showPrStatus) {
      if (appState_3) {
        let prBadge;
        if (
          $[24] !== appState_3.kind ||
          $[25] !== appState_3.number ||
          $[26] !== appState_3.reviewState ||
          $[27] !== appState_3.url
        ) {
          prBadge = jsxProd_default(
            PrBadge,
            {
              number: appState_3.number,
              url: appState_3.url,
              reviewState: appState_3.reviewState,
              kind: appState_3.kind,
            },
            "pr",
          );
          $[24] = appState_3.kind;
          $[25] = appState_3.number;
          $[26] = appState_3.reviewState;
          $[27] = appState_3.url;
          $[28] = prBadge;
        } else prBadge = $[28];
        segments.push(prBadge);
      } else if (hint) {
        let children;
        if ($[29] !== hint) {
          children = prStatusHint(hint);
          $[29] = hint;
          $[30] = children;
        } else children = $[30];
        let prHintText;
        if ($[31] !== children) {
          prHintText = jsxProd_default(
            Text,
            {
              dimColor: true,
              children,
            },
            "pr",
          );
          $[31] = children;
          $[32] = prHintText;
        } else prHintText = $[32];
        segments.push(prHintText);
      }
    }
    $[1] = bridgeSelected;
    $[2] = bridgeStatus;
    $[3] = debug;
    $[4] = hasComplianceTaint;
    $[5] = hint;
    $[6] = appState_3;
    $[7] = appState_2;
    $[8] = appState;
    $[9] = showPrStatus;
    $[10] = segments;
  } else segments = $[10];
  let hasSessionModeHooks = actionKeysNamespace.useHasRenderHooks("SessionMode");
  let sessionModesElement;
  if ($[33] !== hasSessionModeHooks || $[34] !== modeLabels || $[35] !== segments.length) {
    sessionModesElement =
      modeLabels.length > 0 || hasSessionModeHooks
        ? jsxProd_default(SessionModesText, {
            modes: modeLabels,
            separated: segments.length > 0,
          })
        : null;
    $[33] = hasSessionModeHooks;
    $[34] = modeLabels;
    $[35] = segments.length;
    $[36] = sessionModesElement;
  } else sessionModesElement = $[36];
  let sessionModesNode = sessionModesElement;
  if (segments.length === 0 && sessionModesNode === null) {
    return null;
  }
  let segmentsLine;
  if ($[37] !== segments) {
    segmentsLine = jsxProd_default(Byline, {
      children: segments,
    });
    $[37] = segments;
    $[38] = segmentsLine;
  } else segmentsLine = $[38];
  let statusRow;
  if ($[39] !== sessionModesNode || $[40] !== segmentsLine) {
    statusRow = jsxProd_default_2(Box, {
      flexShrink: 0,
      children: [segmentsLine, sessionModesNode],
    });
    $[39] = sessionModesNode;
    $[40] = segmentsLine;
    $[41] = statusRow;
  } else statusRow = $[41];
  return statusRow;
}
//@ chunk-czq1j3j2.js:830438-830562 placement
function PermissionPromptPendingText() {
  let $ = useMemoCache(1);
  let hipaaElement;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    hipaaElement = jsxProd_default(Text, {
      color: "permission",
      wrap: "truncate",
      children: HIPAA_CONFIGURED_LABEL,
    });
    $[0] = hipaaElement;
  } else hipaaElement = $[0];
  return hipaaElement;
}
//@ chunk-czq1j3j2.js:830562-830969 placement
/**
 * 页脚中显示会话模式（以 & 连接）的组件，通过动作键渲染钩子挂载，可加前导分隔点。
 */
var SessionModesText = (props) => {
  let $ = useMemoCache(5);
  let { modes, separated } = props;
  let buildInput;
  let inputDeps;
  if ($[0] !== modes) {
    buildInput = () => ({
      requestId: "session-mode",
      props: {
        modes,
      },
    });
    inputDeps = [modes];
    $[0] = modes;
    $[1] = buildInput;
    $[2] = inputDeps;
  } else {
    buildInput = $[1];
    inputDeps = $[2];
  }
  const renderInput = actionKeysNamespace.useRenderInput("SessionMode", buildInput, inputDeps);
  let renderHook;
  if ($[3] !== separated) {
    renderHook = (args) =>
      args.props.modes.length === 0
        ? null
        : jsxProd_default_2(Text, {
            dimColor: true,
            children: [separated ? " \xB7 " : "", args.props.modes.join(" & ")],
          });
    $[3] = separated;
    $[4] = renderHook;
  } else renderHook = $[4];
  return actionKeysNamespace.useRenderHook(renderInput, renderHook);
};
//@ chunk-czq1j3j2.js:830969-831447 placement
function FooterOpenSelected(props) {
  let $ = useMemoCache(9);
  let { status, bridgeSelected } = props;
  let shortcutDisplay = useShortcutDisplay("footer:openSelected", "Footer", "enter");
  let statusElement;
  if ($[0] !== bridgeSelected || $[1] !== status) {
    statusElement = jsxProd_default(RemoteControlStatus, {
      status,
      highlighted: bridgeSelected,
    });
    $[0] = bridgeSelected;
    $[1] = status;
    $[2] = statusElement;
  } else statusElement = $[2];
  let openHint;
  if ($[3] !== bridgeSelected || $[4] !== shortcutDisplay) {
    openHint =
      bridgeSelected &&
      shortcutDisplay &&
      jsxProd_default_2(Text, {
        dimColor: true,
        wrap: "truncate",
        children: [
          " \xB7 ",
          jsxProd_default(KeyboardShortcutHint, {
            chord: shortcutDisplay,
            action: "view",
          }),
        ],
      });
    $[3] = bridgeSelected;
    $[4] = shortcutDisplay;
    $[5] = openHint;
  } else openHint = $[5];
  let rowElement;
  if ($[6] !== statusElement || $[7] !== openHint) {
    rowElement = jsxProd_default_2(Box, {
      children: [statusElement, openHint],
    });
    $[6] = statusElement;
    $[7] = openHint;
    $[8] = rowElement;
  } else rowElement = $[8];
  return rowElement;
}
//@ chunk-czq1j3j2.js:831447-831493 placement (2.1.88 match: SEP_WIDTH, 1)
var DOWN_ARROW_PREFIX; // deferred: uses BLACK_CIRCLE (../../constants/figures.js) of its import cycle while loading; runs once the cycle is complete
var DOWN_ARROW_PREFIX_WIDTH;
var SEPARATOR_WIDTH;
deferInit("chunk-czq1j3j2.js:831447", () => {
  DOWN_ARROW_PREFIX = `${DOWN_ARROW} `;
  DOWN_ARROW_PREFIX_WIDTH = bunStringWidth(DOWN_ARROW_PREFIX);
  SEPARATOR_WIDTH = bunStringWidth(" \xB7 ");
});
//@ chunk-czq1j3j2.js:831493-831578 placement
function rowTotalWidth(segments) {
  let total = 0;
  for (let segment of segments) total += segment.width;
  return total + Math.max(0, segments.length - 1) * SEPARATOR_WIDTH;
}
//@ chunk-czq1j3j2.js:831644-831722 placement
function footerStatusStyle(isMatched, colorless, color) {
  if (!isMatched) return DEFAULT_MATCH_TEXT_STYLE;
  return colorless
    ? INVERSE_MATCH_TEXT_STYLE
    : {
        color,
        bold: true,
        inverse: true,
      };
}
//@ chunk-czq1j3j2.js:831722-832240 placement
/**
 * 页脚状态行：可选的前导符号（按下时变亮）加分隔排列的段，单行截断。
 */
function FooterStatusRow(props) {
  let $ = useMemoCache(11);
  let { left, width, leading, leadingPressed } = props;
  let leadingArrow;
  if ($[0] !== leading || $[1] !== leadingPressed) {
    leadingArrow =
      leading &&
      jsxProd_default(Text, {
        dimColor: !leadingPressed,
        children: DOWN_ARROW_PREFIX,
      });
    $[0] = leading;
    $[1] = leadingPressed;
    $[2] = leadingArrow;
  } else leadingArrow = $[2];
  let leftElement;
  if ($[3] !== left) {
    leftElement = jsxProd_default(Byline, {
      children: left,
    });
    $[3] = left;
    $[4] = leftElement;
  } else leftElement = $[4];
  let children;
  if ($[5] !== leadingArrow || $[6] !== leftElement) {
    children = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [leadingArrow, leftElement],
    });
    $[5] = leadingArrow;
    $[6] = leftElement;
    $[7] = children;
  } else children = $[7];
  let rowElement;
  if ($[8] !== children || $[9] !== width) {
    rowElement = jsxProd_default(Box, {
      height: 1,
      width,
      overflow: "hidden",
      children,
    });
    $[8] = children;
    $[9] = width;
    $[10] = rowElement;
  } else rowElement = $[10];
  return rowElement;
}
//@ chunk-czq1j3j2.js:832240-832336 placement
var PRINTABLE_SYMBOL_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp_4;
deferInit("chunk-czq1j3j2.js:832240", () => {
  PRINTABLE_SYMBOL_RE = /^[\u0021-\u007E\u00A2\u00A3\u00A5\u20AC]+$/u;
  regExp_4 = new RegExp(`(?:${STANDALONE_SYMBOL_PATTERN}\\p{M}*)+`, "gu");
});
//@ chunk-czq1j3j2.js:832336-832574 placement
function normalizeIdeSelectionLabel(label) {
  return cleanForDisplay(
    label.replace(BLANK_LOOKALIKE_RE, " ").replace(INVISIBLE_SYMBOL_RE, " ").replace(/\s+/gu, " "),
  )
    .replace(regExp_7, (match, lead) => (PRINTABLE_SYMBOL_RE.test(match.slice(lead.length)) ? match : lead))
    .replace(COMBINING_MARK_RE, "$1")
    .replace(regExp_4, (match, offset, text) =>
      isSpaceOrOutOfRange(text, offset - 1) || isSpaceOrOutOfRange(text, offset + match.length) ? "" : match,
    )
    .replace(/\s+/gu, " ")
    .trim();
}
//@ chunk-czq1j3j2.js:832574-832628 placement
function isSpaceOrOutOfRange(text, index) {
  return index < 0 || index >= text.length || text[index] === " ";
}
//@ chunk-czq1j3j2.js:832628-833028 placement
/**
 * 页脚状态段的常量：文件名宽度上下限、Bridge/IDE 各连接状态的颜色与后缀文案。
 */
var FOOTER_FILENAME_SHARE = 0.4;
var MAX_FILENAME_WIDTH = 16;
var MIN_FILENAME_WIDTH = 8;
var EMPTY_SEGMENTS = [];
var BRIDGE_STATUS_COLORS = {
  connected: "background",
  pending: "error",
  disconnected: "error",
};
var IDE_STATUS_COLORS = {
  connecting: "warning",
  connected: "ide",
  reconnecting: "warning",
  disconnected: "error",
};
var BRIDGE_STATUS_SUFFIXES = {
  connected: "",
  pending: " \xB7 connecting\u2026",
  disconnected: " \xB7 disconnected",
};
var IDE_STATUS_SUFFIXES = {
  connecting: " \xB7 connecting\u2026",
  connected: "",
  reconnecting: " \xB7 reconnecting\u2026",
  disconnected: " \xB7 disconnected",
};
//@ chunk-czq1j3j2.js:833028-834519 placement
function FooterIndicators({ width, chrome, initialMcpClients, bridgeSelected, ideSelectionSelected }) {
  let mergedClients = useMergedClients(
    initialMcpClients,
    useAppState((appState) => appState.mcp.clients),
  );
  let ideSelection = useStoreSelector(chrome, (chromeState) => chromeState.ideSelection);
  let isViewingAgent = useAppState((appState) => appState.viewingAgentTaskId !== undefined);
  let remoteSessionUrl = useAppState((appState) => appState.remoteSessionUrl);
  let remoteConnectionStatus = useAppState((appState) => appState.remoteConnectionStatus);
  let bridgeStatus = BridgeStatusIndicator(true);
  let hasComplianceTaint = useHasComplianceTaint("hipaa");
  let hasRenderHooks = useHasRenderHooks("SessionMode");
  let ideConnectionStatus = useIdeConnectionStatus(mergedClients);
  let isRemote = isRemoteSessionAvailable();
  let status = ideConnectionStatus.ideName !== null && !isRemote ? ideConnectionStatus.status : null;
  let ideSegment = useMemo(
    () =>
      IdeStatusIndicator({
        ideStatus: ideConnectionStatus.status,
        ideName: ideConnectionStatus.ideName,
        isRemoteWorkspace: isRemote,
        isViewingAgent,
        ideSelection,
      }),
    [ideConnectionStatus.status, ideConnectionStatus.ideName, isRemote, isViewingAgent, ideSelection],
  );
  let colorless = sequential.level === 0;
  let ideItem = null;
  if (status !== null) {
    let ideLabel = `ide${colorless ? BRIDGE_STATUS_SUFFIXES[status] : ""}`;
    let ideStyle = footerStatusStyle(ideSelectionSelected, colorless, BRIDGE_STATUS_COLORS[status]);
    ideItem = {
      key: "ide",
      width: bunStringWidth(ideLabel),
      node: jsxProd_default(
        Text,
        {
          ...ideStyle,
          color: ideStyle.color ?? BRIDGE_STATUS_COLORS[status],
          children: ideLabel,
        },
        "ide",
      ),
    };
  }
  let extraItems = [];
  if (bridgeStatus !== null) {
    let rcLabel = shortRcLabel(bridgeStatus);
    extraItems.push({
      key: "bridge",
      width: bunStringWidth(rcLabel),
      node: jsxProd_default(
        RemoteControlStatus,
        {
          status: bridgeStatus,
          compact: {
            label: rcLabel,
            ink: footerStatusStyle(bridgeSelected, colorless, bridgeStatus.color),
          },
        },
        "bridge",
      ),
    });
  }
  if (remoteSessionUrl) {
    let cloudLabel = `cloud${colorless ? IDE_STATUS_SUFFIXES[remoteConnectionStatus] : ""}`;
    extraItems.push({
      key: "cloud",
      width: bunStringWidth(cloudLabel),
      node: jsxProd_default(
        Text,
        {
          color: IDE_STATUS_COLORS[remoteConnectionStatus],
          children: jsxProd_default(Link, {
            url: remoteSessionUrl,
            children: cloudLabel,
          }),
        },
        "cloud",
      ),
    });
  }
  if (hasComplianceTaint)
    extraItems.push({
      key: "hipaa",
      width: bunStringWidth(HIPAA_CONFIGURED_LABEL),
      node: jsxProd_default(PermissionPromptPendingText, {}, "hipaa"),
    });
  let floored = Math.floor(width * FOOTER_FILENAME_SHARE);
  let items;
  if (ideItem === null || ideSegment === null)
    items = ideItem === null ? extraItems : [ideItem, ...extraItems];
  else {
    let combinedItems = withIdeSelectionSegment(ideItem, ideSegment, extraItems, floored);
    items =
      rowTotalWidth(combinedItems) <= floored
        ? combinedItems
        : withIdeSelectionSegment(
            ideItem,
            ideSegment,
            extraItems.filter((item) => item.key !== "cloud"),
            floored,
          );
  }
  let modesText = hasRenderHooks
    ? jsxProd_default(SessionModesText, {
        modes: EMPTY_SEGMENTS,
        separated: items.length > 0,
      })
    : null;
  if (items.length === 0 && modesText === null) return null;
  return jsxProd_default_2(Box, {
    flexShrink: 0,
    children: [
      jsxProd_default(Box, {
        maxWidth: Math.max(floored, rowTotalWidth(items)),
        children: jsxProd_default(Text, {
          wrap: "truncate-end",
          children: jsxProd_default(Byline, {
            children: items.map((item) => item.node),
          }),
        }),
      }),
      modesText,
    ],
  });
}
//@ chunk-czq1j3j2.js:834519-834753 placement
function withIdeSelectionSegment(leading, selection, trailing, columns) {
  let availableWidth = columns - rowTotalWidth([leading, ...trailing]) - SEPARATOR_WIDTH;
  let labelText =
    selection.kind === "fileName"
      ? truncateToWidth(
          normalizeIdeSelectionLabel(selection.label),
          Math.max(MIN_FILENAME_WIDTH, Math.min(MAX_FILENAME_WIDTH, availableWidth)),
        )
      : selection.label;
  let segment = {
    key: "ide-selection",
    width: bunStringWidth(labelText),
    node: jsxProd_default(
      Text,
      {
        dimColor: true,
        children: labelText,
      },
      "ide-selection",
    ),
  };
  return [leading, segment, ...trailing];
}
//@ chunk-czq1j3j2.js:834757-834811 placement
function selectToolPermissionContextMode4(state) {
  return state.toolPermissionContext.mode;
}
//@ chunk-czq1j3j2.js:834811-834889 placement
function selectToolPermissionContextAdditionalWorkingDirectories(state) {
  return state.toolPermissionContext.additionalWorkingDirectories;
}
//@ chunk-czq1j3j2.js:834889-834929 placement
function selectFastMode_2(state) {
  return state.fastMode ?? false;
}
//@ chunk-czq1j3j2.js:834929-834972 placement
function selectThinkingEnabled(state) {
  return state.thinkingEnabled;
}
//@ chunk-czq1j3j2.js:834972-835008 placement
function selectPrStatus2(state) {
  return state.prStatus;
}
//@ chunk-czq1j3j2.js:835008-835053 placement
function selectRemoteSessionName(state) {
  return state.remoteSessionName;
}
//@ chunk-czq1j3j2.js:835053-835081 placement
function getEditorModes() {
  return EDITOR_MODES();
}
//@ chunk-czq1j3j2.js:835081-835108 placement
function isProjectTrustAccepted() {
  return checkHasTrustDialogAccepted();
}
//@ chunk-czq1j3j2.js:835108-835238 placement
function capStatuslineIssueCount(state) {
  return state.setupIssues.statuslineIssueCount === 1
    ? state
    : {
        ...state,
        setupIssues: {
          ...state.setupIssues,
          statuslineIssueCount: 1,
        },
      };
}
export {
  normalizeIdeSelectionLabel,
  DOWN_ARROW_PREFIX_WIDTH,
  FooterStatusRow,
  rowTotalWidth,
  footerStatusStyle,
  selectToolPermissionContextMode4,
  selectToolPermissionContextAdditionalWorkingDirectories,
  selectFastMode_2,
  selectThinkingEnabled,
  selectPrStatus2,
  selectRemoteSessionName,
  getEditorModes,
  isProjectTrustAccepted,
  capStatuslineIssueCount,
  FooterIndicators,
  FooterStatusLine,
};
