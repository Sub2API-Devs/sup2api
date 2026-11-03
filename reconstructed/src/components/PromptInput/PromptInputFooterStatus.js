/**
 * components/PromptInput/PromptInputFooterStatus.tsx
 *
 * 2.1.316 新增。页脚状态段（任务、PR、桥接等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (29)
 * attribution: placement 29
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { DOWN_ARROW } from "../../utils/permissions/autoModeRulesPrompt.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { DEFAULT_MATCH_TEXT_STYLE, INVERSE_MATCH_TEXT_STYLE } from "../../utils/highlightMatch.js";
import {
  STANDALONE_SYMBOL_PATTERN,
  BLANK_LOOKALIKE_RE,
  INVISIBLE_SYMBOL_RE,
  regExp as regExp_6,
  COMBINING_MARK_RE,
} from "../../utils/emojiPatterns.js";
import { cleanForDisplay } from "../../utils/stringUtils.js";
import { useMergedClients } from "./Notifications.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useHasRenderHooks } from "../pluginUi/render/RenderInstance.js";
import { useIdeConnectionStatus } from "../../hooks/useIdeConnectionStatus.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { Q, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { IdeStatusIndicator } from "../IdeStatusIndicator.js";
import { sequential } from "../../utils/sequential.js";
import { truncateToWidth } from "../../utils/format.js";
import { EDITOR_MODES } from "../../utils/configConstants.js";
import { checkHasTrustDialogAccepted } from "../../utils/config.js";

//@ chunk-18hwfzwa.js:795209-795259 placement = _temp5 (1)
function selectRemoteConnectionStatus(s) {
  return s.remoteConnectionStatus;
}
//@ chunk-18hwfzwa.js:795259-795295 placement
function selectPrStatus(ao) {
  return ao.prStatus;
}
//@ chunk-18hwfzwa.js:795295-795334 placement
function selectPrNeedsAuth(co) {
  return co.prNeedsAuth;
}
//@ chunk-18hwfzwa.js:795334-795379 placement
function selectSlackTagConnected_2(bo) {
  return bo.slackTagConnected;
}
//@ chunk-18hwfzwa.js:795379-795615 placement
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
//@ chunk-18hwfzwa.js:795615-797818 placement
function FooterStatusLine(props) {
  let $ = w(42);
  let { debug, bridgeSelected, modeLabels } = props;
  let appState = useAppState(selectRemoteSessionUrl_2);
  let appState_2 = useAppState(selectRemoteConnectionStatus);
  let isFullscreen = useIsFullscreen();
  let Be = BridgeStatusIndicator(!isFullscreen);
  let hasComplianceTaint = useHasComplianceTaint("hipaa");
  useForceRender();
  let ze;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    ze = getFeatureValue_CACHED_MAY_BE_STALE("tengu_copper_thistle", false);
    $[0] = ze;
  } else ze = $[0];
  let Xe = ze;
  let appState_3 = useAppState(selectPrStatus);
  let appState_4 = useAppState(selectPrNeedsAuth);
  let At = Xe && (appState_3 !== null || appState_4);
  useAppState(selectSlackTagConnected_2);
  let It;
  if (
    $[1] !== bridgeSelected ||
    $[2] !== Be ||
    $[3] !== debug ||
    $[4] !== hasComplianceTaint ||
    $[5] !== appState_4 ||
    $[6] !== appState_3 ||
    $[7] !== appState_2 ||
    $[8] !== appState ||
    $[9] !== At
  ) {
    It = [];
    if (hasComplianceTaint) {
      let Ot;
      if ($[11] === MEMO_CACHE_SENTINEL) {
        Ot = jsxProd_default(PermissionPromptPendingText, {}, "hipaa");
        $[11] = Ot;
      } else Ot = $[11];
      It.push(Ot);
    }
    if (appState) {
      let Ot;
      if ($[12] !== appState_2) {
        Ot = ideStatusSuffix(appState_2);
        $[12] = appState_2;
        $[13] = Ot;
      } else Ot = $[13];
      let { suffix, color } = Ot;
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
      let oo;
      if ($[17] !== color || $[18] !== children) {
        oo = jsxProd_default(
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
        $[19] = oo;
      } else oo = $[19];
      It.push(oo);
    }
    if (debug) {
      let Ot;
      if ($[20] === MEMO_CACHE_SENTINEL) {
        Ot = jsxProd_default(
          Text,
          {
            color: "warning",
            wrap: "truncate",
            children: "Debug",
          },
          "debug",
        );
        $[20] = Ot;
      } else Ot = $[20];
      It.push(Ot);
    }
    if (Be !== null) {
      let Ot;
      if ($[21] !== bridgeSelected || $[22] !== Be) {
        Ot = jsxProd_default(
          FooterOpenSelected,
          {
            status: Be,
            bridgeSelected,
          },
          "bridge",
        );
        $[21] = bridgeSelected;
        $[22] = Be;
        $[23] = Ot;
      } else Ot = $[23];
      It.push(Ot);
    }
    if (At) {
      if (appState_3) {
        let Ot;
        if (
          $[24] !== appState_3.kind ||
          $[25] !== appState_3.number ||
          $[26] !== appState_3.reviewState ||
          $[27] !== appState_3.url
        ) {
          Ot = jsxProd_default(
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
          $[28] = Ot;
        } else Ot = $[28];
        It.push(Ot);
      } else if (appState_4) {
        let children;
        if ($[29] !== appState_4) {
          children = prStatusHint(appState_4);
          $[29] = appState_4;
          $[30] = children;
        } else children = $[30];
        let Lt;
        if ($[31] !== children) {
          Lt = jsxProd_default(
            Text,
            {
              dimColor: true,
              children,
            },
            "pr",
          );
          $[31] = children;
          $[32] = Lt;
        } else Lt = $[32];
        It.push(Lt);
      }
    }
    $[1] = bridgeSelected;
    $[2] = Be;
    $[3] = debug;
    $[4] = hasComplianceTaint;
    $[5] = appState_4;
    $[6] = appState_3;
    $[7] = appState_2;
    $[8] = appState;
    $[9] = At;
    $[10] = It;
  } else It = $[10];
  let Xt = actionKeysNamespace.useHasRenderHooks("SessionMode");
  let Ot;
  if ($[33] !== Xt || $[34] !== modeLabels || $[35] !== It.length) {
    Ot =
      modeLabels.length > 0 || Xt
        ? jsxProd_default(SessionModesText, {
            modes: modeLabels,
            separated: It.length > 0,
          })
        : null;
    $[33] = Xt;
    $[34] = modeLabels;
    $[35] = It.length;
    $[36] = Ot;
  } else Ot = $[36];
  let io = Ot;
  if (It.length === 0 && io === null) {
    return null;
  }
  let Lt;
  if ($[37] !== It) {
    Lt = jsxProd_default(Byline, {
      children: It,
    });
    $[37] = It;
    $[38] = Lt;
  } else Lt = $[38];
  let oo;
  if ($[39] !== io || $[40] !== Lt) {
    oo = jsxProd_default_2(Box, {
      flexShrink: 0,
      children: [Lt, io],
    });
    $[39] = io;
    $[40] = Lt;
    $[41] = oo;
  } else oo = $[41];
  return oo;
}
//@ chunk-18hwfzwa.js:797818-797942 placement
function PermissionPromptPendingText() {
  let $ = w(1);
  let x;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    x = jsxProd_default(Text, {
      color: "permission",
      wrap: "truncate",
      children: HIPAA_CONFIGURED_LABEL,
    });
    $[0] = x;
  } else x = $[0];
  return x;
}
//@ chunk-18hwfzwa.js:797942-798349 placement
/**
 * 页脚中显示会话模式（以 & 连接）的组件，通过动作键渲染钩子挂载，可加前导分隔点。
 */
var SessionModesText = (props) => {
  let L = w(5);
  let { modes, separated } = props;
  let ee;
  let ke;
  if (L[0] !== modes) {
    ee = () => ({
      requestId: "session-mode",
      props: {
        modes,
      },
    });
    ke = [modes];
    L[0] = modes;
    L[1] = ee;
    L[2] = ke;
  } else {
    ee = L[1];
    ke = L[2];
  }
  const Re = actionKeysNamespace.useRenderInput("SessionMode", ee, ke);
  let Be;
  if (L[3] !== separated) {
    Be = (He) =>
      He.props.modes.length === 0
        ? null
        : jsxProd_default_2(Text, {
            dimColor: true,
            children: [separated ? " \xB7 " : "", He.props.modes.join(" & ")],
          });
    L[3] = separated;
    L[4] = Be;
  } else Be = L[4];
  return actionKeysNamespace.useRenderHook(Re, Be);
};
//@ chunk-18hwfzwa.js:798349-798827 placement
function FooterOpenSelected(props) {
  let $ = w(9);
  let { status, bridgeSelected } = props;
  let shortcutDisplay = useShortcutDisplay("footer:openSelected", "Footer", "enter");
  let ke;
  if ($[0] !== bridgeSelected || $[1] !== status) {
    ke = jsxProd_default(RemoteControlStatus, {
      status,
      highlighted: bridgeSelected,
    });
    $[0] = bridgeSelected;
    $[1] = status;
    $[2] = ke;
  } else ke = $[2];
  let Re;
  if ($[3] !== bridgeSelected || $[4] !== shortcutDisplay) {
    Re =
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
    $[5] = Re;
  } else Re = $[5];
  let Be;
  if ($[6] !== ke || $[7] !== Re) {
    Be = jsxProd_default_2(Box, {
      children: [ke, Re],
    });
    $[6] = ke;
    $[7] = Re;
    $[8] = Be;
  } else Be = $[8];
  return Be;
}
//@ chunk-18hwfzwa.js:798827-798873 placement = SEP_WIDTH (1)
var DOWN_ARROW_PREFIX = `${DOWN_ARROW} `;
var DOWN_ARROW_PREFIX_WIDTH = bunStringWidth(DOWN_ARROW_PREFIX);
var SEPARATOR_WIDTH = bunStringWidth(" \xB7 ");
//@ chunk-18hwfzwa.js:798873-798958 placement
function rowTotalWidth(h) {
  let x = 0;
  for (let D of h) x += D.width;
  return x + Math.max(0, h.length - 1) * SEPARATOR_WIDTH;
}
//@ chunk-18hwfzwa.js:799024-799102 placement
function footerStatusStyle(h, colorless, color) {
  if (!h) return DEFAULT_MATCH_TEXT_STYLE;
  return colorless
    ? INVERSE_MATCH_TEXT_STYLE
    : {
        color,
        bold: true,
        inverse: true,
      };
}
//@ chunk-18hwfzwa.js:799102-799620 placement
/**
 * 页脚状态行：可选的前导符号（按下时变亮）加分隔排列的段，单行截断。
 */
function FooterStatusRow(props) {
  let $ = w(11);
  let { left, width, leading, leadingPressed } = props;
  let Re;
  if ($[0] !== leading || $[1] !== leadingPressed) {
    Re =
      leading &&
      jsxProd_default(Text, {
        dimColor: !leadingPressed,
        children: DOWN_ARROW_PREFIX,
      });
    $[0] = leading;
    $[1] = leadingPressed;
    $[2] = Re;
  } else Re = $[2];
  let Be;
  if ($[3] !== left) {
    Be = jsxProd_default(Byline, {
      children: left,
    });
    $[3] = left;
    $[4] = Be;
  } else Be = $[4];
  let children;
  if ($[5] !== Re || $[6] !== Be) {
    children = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [Re, Be],
    });
    $[5] = Re;
    $[6] = Be;
    $[7] = children;
  } else children = $[7];
  let We;
  if ($[8] !== children || $[9] !== width) {
    We = jsxProd_default(Box, {
      height: 1,
      width,
      overflow: "hidden",
      children,
    });
    $[8] = children;
    $[9] = width;
    $[10] = We;
  } else We = $[10];
  return We;
}
//@ chunk-18hwfzwa.js:799620-799716 placement
var PRINTABLE_SYMBOL_RE = /^[\u0021-\u007E\u00A2\u00A3\u00A5\u20AC]+$/u;
var regExp_4 = new RegExp(`(?:${STANDALONE_SYMBOL_PATTERN}\\p{M}*)+`, "gu");
//@ chunk-18hwfzwa.js:799716-799954 placement
function normalizeIdeSelectionLabel(label) {
  return cleanForDisplay(
    label.replace(BLANK_LOOKALIKE_RE, " ").replace(INVISIBLE_SYMBOL_RE, " ").replace(/\s+/gu, " "),
  )
    .replace(regExp_6, (x, D) => (PRINTABLE_SYMBOL_RE.test(x.slice(D.length)) ? x : D))
    .replace(COMBINING_MARK_RE, "$1")
    .replace(regExp_4, (x, D, L) =>
      isSpaceOrOutOfRange(L, D - 1) || isSpaceOrOutOfRange(L, D + x.length) ? "" : x,
    )
    .replace(/\s+/gu, " ")
    .trim();
}
//@ chunk-18hwfzwa.js:799954-800008 placement
function isSpaceOrOutOfRange(h, x) {
  return x < 0 || x >= h.length || h[x] === " ";
}
//@ chunk-18hwfzwa.js:800008-800408 placement
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
//@ chunk-18hwfzwa.js:800408-801898 placement
function FooterIndicators({ width, chrome, initialMcpClients, bridgeSelected, ideSelectionSelected }) {
  let mergedClients = useMergedClients(
    initialMcpClients,
    useAppState((so) => so.mcp.clients),
  );
  let Re = useStoreSelector(chrome, (so) => so.ideSelection);
  let Be = useAppState((so) => so.viewingAgentTaskId !== undefined);
  let He = useAppState((so) => so.remoteSessionUrl);
  let We = useAppState((so) => so.remoteConnectionStatus);
  let ze = BridgeStatusIndicator(true);
  let hasComplianceTaint = useHasComplianceTaint("hipaa");
  let hasRenderHooks = useHasRenderHooks("SessionMode");
  let ideConnectionStatus = useIdeConnectionStatus(mergedClients);
  let At = isRemoteSessionAvailable();
  let status = ideConnectionStatus.ideName !== null && !At ? ideConnectionStatus.status : null;
  let Ot = Q(
    () =>
      IdeStatusIndicator({
        ideStatus: ideConnectionStatus.status,
        ideName: ideConnectionStatus.ideName,
        isRemoteWorkspace: At,
        isViewingAgent: Be,
        ideSelection: Re,
      }),
    [ideConnectionStatus.status, ideConnectionStatus.ideName, At, Be, Re],
  );
  let Et = sequential.level === 0;
  let Dt = null;
  if (status !== null) {
    let so = `ide${Et ? BRIDGE_STATUS_SUFFIXES[status] : ""}`;
    let po = footerStatusStyle(ideSelectionSelected, Et, BRIDGE_STATUS_COLORS[status]);
    Dt = {
      key: "ide",
      width: bunStringWidth(so),
      node: jsxProd_default(
        Text,
        {
          ...po,
          color: po.color ?? BRIDGE_STATUS_COLORS[status],
          children: so,
        },
        "ide",
      ),
    };
  }
  let Lt = [];
  if (ze !== null) {
    let so = shortRcLabel(ze);
    Lt.push({
      key: "bridge",
      width: bunStringWidth(so),
      node: jsxProd_default(
        RemoteControlStatus,
        {
          status: ze,
          compact: {
            label: so,
            ink: footerStatusStyle(bridgeSelected, Et, ze.color),
          },
        },
        "bridge",
      ),
    });
  }
  if (He) {
    let so = `cloud${Et ? IDE_STATUS_SUFFIXES[We] : ""}`;
    Lt.push({
      key: "cloud",
      width: bunStringWidth(so),
      node: jsxProd_default(
        Text,
        {
          color: IDE_STATUS_COLORS[We],
          children: jsxProd_default(Link, {
            url: He,
            children: so,
          }),
        },
        "cloud",
      ),
    });
  }
  if (hasComplianceTaint)
    Lt.push({
      key: "hipaa",
      width: bunStringWidth(HIPAA_CONFIGURED_LABEL),
      node: jsxProd_default(PermissionPromptPendingText, {}, "hipaa"),
    });
  let floored = Math.floor(width * FOOTER_FILENAME_SHARE);
  let Xt;
  if (Dt === null || Ot === null) Xt = Dt === null ? Lt : [Dt, ...Lt];
  else {
    let so = withIdeSelectionSegment(Dt, Ot, Lt, floored);
    Xt =
      rowTotalWidth(so) <= floored
        ? so
        : withIdeSelectionSegment(
            Dt,
            Ot,
            Lt.filter((po) => po.key !== "cloud"),
            floored,
          );
  }
  let io = hasRenderHooks
    ? jsxProd_default(SessionModesText, {
        modes: EMPTY_SEGMENTS,
        separated: Xt.length > 0,
      })
    : null;
  if (Xt.length === 0 && io === null) return null;
  return jsxProd_default_2(Box, {
    flexShrink: 0,
    children: [
      jsxProd_default(Box, {
        maxWidth: Math.max(floored, rowTotalWidth(Xt)),
        children: jsxProd_default(Text, {
          wrap: "truncate-end",
          children: jsxProd_default(Byline, {
            children: Xt.map((so) => so.node),
          }),
        }),
      }),
      io,
    ],
  });
}
//@ chunk-18hwfzwa.js:801898-802132 placement
function withIdeSelectionSegment(h, x, D, L) {
  let ee = L - rowTotalWidth([h, ...D]) - SEPARATOR_WIDTH;
  let ke =
    x.kind === "fileName"
      ? truncateToWidth(
          normalizeIdeSelectionLabel(x.label),
          Math.max(MIN_FILENAME_WIDTH, Math.min(MAX_FILENAME_WIDTH, ee)),
        )
      : x.label;
  let Re = {
    key: "ide-selection",
    width: bunStringWidth(ke),
    node: jsxProd_default(
      Text,
      {
        dimColor: true,
        children: ke,
      },
      "ide-selection",
    ),
  };
  return [h, Re, ...D];
}
//@ chunk-18hwfzwa.js:802132-802136 placement
init_react_production();
//@ chunk-18hwfzwa.js:802136-802190 placement
function selectToolPermissionContextMode4(vo) {
  return vo.toolPermissionContext.mode;
}
//@ chunk-18hwfzwa.js:802190-802268 placement
function selectToolPermissionContextAdditionalWorkingDirectories(Yo) {
  return Yo.toolPermissionContext.additionalWorkingDirectories;
}
//@ chunk-18hwfzwa.js:802268-802308 placement
function selectFastMode_2(kn) {
  return kn.fastMode ?? false;
}
//@ chunk-18hwfzwa.js:802308-802351 placement
function selectThinkingEnabled(Fn) {
  return Fn.thinkingEnabled;
}
//@ chunk-18hwfzwa.js:802351-802387 placement
function selectPrStatus2(bn) {
  return bn.prStatus;
}
//@ chunk-18hwfzwa.js:802387-802432 placement
function selectRemoteSessionName(Go) {
  return Go.remoteSessionName;
}
//@ chunk-18hwfzwa.js:802432-802459 placement
function getEditorModes() {
  return EDITOR_MODES();
}
//@ chunk-18hwfzwa.js:802459-802486 placement
function isProjectTrustAccepted() {
  return checkHasTrustDialogAccepted();
}
//@ chunk-18hwfzwa.js:802486-802616 placement
function capStatuslineIssueCount(hn) {
  return hn.setupIssues.statuslineIssueCount === 1
    ? hn
    : {
        ...hn,
        setupIssues: {
          ...hn.setupIssues,
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
