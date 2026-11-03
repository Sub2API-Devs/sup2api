/**
 * components/messages/UserPromptMessage.tsx
 *
 * 普通用户提示回显（userMessageBackground 背景，brief 模式特殊处理）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserPromptMessage.tsx
 * pieces: chunk-ah34pb7m.js (15)
 * attribution: placement 14, fingerprint 1
 */
import { init_react_production, qt, Se } from "../../../vendor/react/cjs/react.production.js";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isShortSiteText, splitLongTextForCollapse } from "./UserMessageSite.js";
import { parsePastedRefs, formatImageRef } from "../../history.js";
import { isImagePlaceholder } from "../../commands.js";
import { string } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { isHumanInitiatedMessage } from "../../utils/messagePredicates.js";
import { shortUuid } from "../../utils/transcriptDiagnostics.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { parseWrappedPluginPrompt, pluginPromptLabel } from "../../utils/messages/pluginPrompts.js";
import { sourceLabel } from "../../utils/messages/nonUserMessages.js";
import { useAppState } from "../../state/AppState.js";
import { BriefTimestampNamespace } from "../../utils/formatBriefTimestamp.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text, Box } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { toSafeFileUrl } from "../../services/mcp/xaa.js";
import { getUserMsgOptIn } from "../../bootstrap/state.js";
import { isVirtualPancakeEnabled } from "../../utils/permissions/permissionSetup.js";
import { expandPastedContent } from "../../utils/pastedContent.js";
import { sessionTagSalt } from "../../utils/userTurnTags.js";
import { logError } from "../../utils/log.js";
import { CollapsibleText } from "./CollapsedLines.js";
import { HighlightedThinkingText } from "./HighlightedThinkingText.js";

//@ chunk-ah34pb7m.js:113172-113176 placement
init_react_production();
//@ chunk-ah34pb7m.js:113176-113262 placement
/**
 * 是否显示子代理历史（CLAUDE_CODE_SUBAGENT_HISTORY 或开关 tengu_rustling_crescent）。
 */
function isSubagentHistoryEnabled() {
  return (
    env.CLAUDE_CODE_SUBAGENT_HISTORY ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_rustling_crescent", false)
  );
}
//@ chunk-ah34pb7m.js:113262-113398 placement
/**
 * 人工输入的提示里，返回图片占位符的 id 集合（非人工来源返回空集）。
 */
function getImagePlaceholderIds(m, d) {
  if ((d !== undefined && d.kind !== "human") || !isShortSiteText(m)) return new Set();
  return new Set(
    parsePastedRefs(m)
      .filter((c) => isImagePlaceholder(c.match))
      .map((c) => c.id),
  );
}
//@ chunk-ah34pb7m.js:113398-113402 placement
init_react_production();
//@ chunk-ah34pb7m.js:113402-113446 placement
/**
 * 导出值：PLACEHOLDER_ID_SUFFIX（图片占位 id 固定后缀）；位于「普通用户提示回显（userMessageBackground 背景，brief 模式特殊处理）」模块。
 */
var PLACEHOLDER = "placeholder";
var PLACEHOLDER_ID_SUFFIX = "-c1a0-4de0-8e00-";
//@ chunk-ah34pb7m.js:113446-113521 placement
/**
 * 函数 placeholderImageId（由序号生成图片占位 id）；位于「普通用户提示回显（userMessageBackground 背景，brief 模式特殊处理）」模块。
 */
function placeholderImageId(m) {
  return `${m.toString(16).padStart(8, "0")}${PLACEHOLDER_ID_SUFFIX}000000000000`;
}
//@ chunk-ah34pb7m.js:113521-113559 placement
function isImagePlaceholderId(m) {
  return m.slice(8) === PLACEHOLDER_ID_SUFFIX;
}
//@ chunk-ah34pb7m.js:113559-113969 placement
/**
 * 跟踪粘贴基线与挂起状态。
 */
class PasteTracker {
  #o = 0;
  #e = false;
  #t = "";
  get baseline() {
    return this.#o;
  }
  get pending() {
    return this.#e;
  }
  start(m, d) {
    this.#o = m;
    this.#e = true;
    this.#t = d;
  }
  stop() {
    this.#e = false;
    this.#t = "";
  }
  track(m, d) {
    if (d.length < this.#o) {
      this.#o = 0;
      this.#e = false;
      this.#t = "";
      return true;
    }
    if (d.length > m.length && this.#e) {
      let c = d.length - m.length;
      if (
        (m.length === 0 || d[0] === m[0] ? d.slice(-c) : d.slice(0, c)).some((f) =>
          isHumanInitiatedMessage(f, this.#t),
        )
      )
        this.#e = false;
      else this.#o = d.length;
    }
    return false;
  }
}
//@ chunk-ah34pb7m.js:113969-113986 placement
/**
 * 导出值：promptAwaitingModelSlot（等待模型的提示槽）；位于「普通用户提示回显（userMessageBackground 背景，brief 模式特殊处理）」模块。
 */
var promptAwaitingModelSlot = qt(null);
//@ chunk-ah34pb7m.js:113986-114195 placement
function usePromptAwaitingModel(uuid) {
  let d = Se(promptAwaitingModelSlot);
  let c = shortUuid({
    uuid,
  });
  let g = useStoreSelector(
    d === "every" ? null : d,
    (f) =>
      c !== undefined &&
      (isImagePlaceholderId(c)
        ? f.placeholderWaitedInQueue
        : f.promptsAwaitingModel.size > 0 && f.promptsAwaitingModel.has(c)),
  );
  return d === "every" || g === true;
}
//@ chunk-ah34pb7m.js:114195-114373 placement
function getViewedAgentLabel(ge) {
  let ae = ge.viewingAgentTaskId ? ge.tasks[ge.viewingAgentTaskId] : undefined;
  return ae?.type !== "local_agent" || !isSubagentHistoryEnabled()
    ? null
    : ae.parentAgentId === undefined
      ? "main"
      : "another agent";
}
//@ chunk-ah34pb7m.js:114373-114411 placement
function selectIsBriefOnly_2(Pe) {
  return Pe.isBriefOnly;
}
//@ chunk-ah34pb7m.js:114411-114456 placement = _temp2 (1)
function selectViewingAgentTaskId(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-ah34pb7m.js:114456-115862 placement
/**
 * 用户提示消息（插件提示词来源、展开）。
 */
function UserPromptText(props) {
  let T = w(28);
  let { messageId, origin, pluginPrompt, isExpanded } = props;
  let text = props.param.text;
  let M = origin?.kind === "plugin" ? origin.name : undefined;
  let x;
  if (T[0] !== pluginPrompt || T[1] !== text) {
    x = parseWrappedPluginPrompt(text, pluginPrompt);
    T[0] = pluginPrompt;
    T[1] = text;
    T[2] = x;
  } else x = T[2];
  let k = x;
  let b;
  if (T[3] !== M || T[4] !== k || T[5] !== text) {
    b = k !== undefined && M !== undefined && k.label === sourceLabel(M) ? k.text : text;
    T[3] = M;
    T[4] = k;
    T[5] = text;
    T[6] = b;
  } else b = T[6];
  let text_2 = b;
  let appState = useAppState(getViewedAgentLabel);
  let L = props.followsSpeakerLabel || props.followsInboundLabel;
  let N;
  if (T[7] !== appState || T[8] !== L || T[9] !== origin) {
    N =
      origin?.kind === "plugin"
        ? pluginPromptLabel(sourceLabel(origin.name))
        : origin?.kind === "coordinator" && appState !== null && !L
          ? origin.plugin === undefined
            ? `From ${appState}`
            : `From the ${sourceLabel(origin.plugin)} plugin`
          : undefined;
    T[7] = appState;
    T[8] = L;
    T[9] = origin;
    T[10] = N;
  } else N = T[10];
  let W = N;
  let draw;
  if (T[11] !== props || T[12] !== text || T[13] !== W) {
    draw = (K) =>
      jsxProd_default(UserPromptMessage, {
        ...props,
        addMargin: W === undefined && props.addMargin,
        param:
          K === text
            ? props.param
            : {
                ...props.param,
                text: K,
              },
      });
    T[11] = props;
    T[12] = text;
    T[13] = W;
    T[14] = draw;
  } else draw = T[14];
  let V;
  if (T[15] !== isExpanded || T[16] !== messageId || T[17] !== origin || T[18] !== draw || T[19] !== text_2) {
    V = {
      messageId,
      stored: origin,
      text: text_2,
      isExpanded,
      draw,
    };
    T[15] = isExpanded;
    T[16] = messageId;
    T[17] = origin;
    T[18] = draw;
    T[19] = text_2;
    T[20] = V;
  } else V = T[20];
  let Y = BriefTimestampNamespace.useUserMessageSite(V);
  if (W === undefined) {
    return Y;
  }
  const marginTop = props.addMargin && !L ? 1 : 0;
  let z;
  if (T[21] === MEMO_CACHE_SENTINEL) {
    z = jsxProd_default_2(Text, {
      "aria-hidden": true,
      children: [figures_default.pointerSmall, " "],
    });
    T[21] = z;
  } else z = T[21];
  let ee;
  if (T[22] !== W) {
    ee = jsxProd_default_2(Text, {
      dimColor: true,
      children: [z, W],
    });
    T[22] = W;
    T[23] = ee;
  } else ee = T[23];
  let le;
  if (T[24] !== Y || T[25] !== marginTop || T[26] !== ee) {
    le = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop,
      children: [ee, Y],
    });
    T[24] = Y;
    T[25] = marginTop;
    T[26] = ee;
    T[27] = le;
  } else le = T[27];
  return le;
}
//@ chunk-ah34pb7m.js:115862-117725 fingerprint = UserPromptMessage (0.706)
function UserPromptMessage(props) {
  let $ = w(33);
  let {
    addMargin,
    param,
    isTranscriptMode,
    timestamp,
    messageId,
    origin,
    followsSpeakerLabel,
    followsInboundLabel,
  } = props;
  let { text } = param;
  let b = followsSpeakerLabel === undefined ? false : followsSpeakerLabel;
  let E = followsInboundLabel === undefined ? false : followsInboundLabel;
  let awaitingModel = usePromptAwaitingModel(messageId);
  let N;
  if ($[0] !== b || $[1] !== origin || $[2] !== text) {
    N = b && text ? [...getImagePlaceholderIds(text, origin)] : [];
    $[0] = b;
    $[1] = origin;
    $[2] = text;
    $[3] = N;
  } else N = $[3];
  let W = N;
  let U;
  if ($[4] !== W) {
    U = (K) => W.map((V) => K.storedImagePaths.get(V) ?? "").join("\x00");
    $[4] = W;
    $[5] = U;
  } else U = $[5];
  let appState = useAppState(U);
  let X;
  if ($[6] !== W || $[7] !== appState) {
    let z = new Map();
    let parts = appState.split("\x00");
    X =
      (W.forEach((le, ge) => {
        let ae = parts[ge];
        let pe = ae ? toSafeFileUrl(ae) : null;
        if (pe !== null) z.set(formatImageRef(le), pe);
      }),
      z.size > 0 ? z : undefined);
    $[6] = W;
    $[7] = appState;
    $[8] = X;
  } else X = $[8];
  let markLinks = X;
  let isBriefOnly = useAppState(selectIsBriefOnly_2);
  let viewingAgentTaskId = useAppState(selectViewingAgentTaskId);
  let CLAUDE_CODE_BRIEF = env.CLAUDE_CODE_BRIEF;
  let se;
  if ($[9] !== isBriefOnly || $[10] !== isTranscriptMode || $[11] !== viewingAgentTaskId) {
    se =
      getUserMsgOptIn() &&
      (CLAUDE_CODE_BRIEF || getFeatureValue_CACHED_MAY_BE_STALE("tengu_kairos_brief", false)) &&
      isBriefOnly &&
      !isTranscriptMode &&
      !viewingAgentTaskId;
    $[9] = isBriefOnly;
    $[10] = isTranscriptMode;
    $[11] = viewingAgentTaskId;
    $[12] = se;
  } else se = $[12];
  let ye = se;
  let Te;
  if ($[13] !== text) {
    Te = isVirtualPancakeEnabled() ? expandPastedContent(text, sessionTagSalt()) : text;
    $[13] = text;
    $[14] = Te;
  } else Te = $[14];
  let Me;
  if ($[15] !== Te) {
    Me = splitLongTextForCollapse(Te);
    $[15] = Te;
    $[16] = Me;
  } else Me = $[16];
  let text_2 = Me;
  if (!text) {
    logError(Error("No content found in user prompt message"));
    return null;
  }
  if (E) {
    let ve;
    if ($[17] !== text) {
      ve = jsxProd_default(CollapsibleText, {
        text,
      });
      $[17] = text;
      $[18] = ve;
    } else ve = $[18];
    return ve;
  }
  if (b) {
    let ve;
    if ($[19] !== awaitingModel || $[20] !== text_2 || $[21] !== markLinks) {
      ve = jsxProd_default(Box, {
        flexDirection: "column",
        flexGrow: 1,
        backgroundColor: "userMessageBackground",
        children: jsxProd_default(HighlightedThinkingText, {
          text: text_2,
          bodyOnly: true,
          awaitingModel,
          markLinks,
        }),
      });
      $[19] = awaitingModel;
      $[20] = text_2;
      $[21] = markLinks;
      $[22] = ve;
    } else ve = $[22];
    return ve;
  }
  const marginTop = addMargin ? 1 : 0;
  const backgroundColor = ye ? undefined : "userMessageBackground";
  const paddingRight = ye ? 0 : 1;
  const timestamp_2 = ye ? timestamp : undefined;
  let children;
  if ($[23] !== awaitingModel || $[24] !== text_2 || $[25] !== timestamp_2 || $[26] !== ye) {
    children = jsxProd_default(HighlightedThinkingText, {
      text: text_2,
      useBriefLayout: ye,
      timestamp: timestamp_2,
      awaitingModel,
    });
    $[23] = awaitingModel;
    $[24] = text_2;
    $[25] = timestamp_2;
    $[26] = ye;
    $[27] = children;
  } else children = $[27];
  let xe;
  if ($[28] !== marginTop || $[29] !== backgroundColor || $[30] !== paddingRight || $[31] !== children) {
    xe = jsxProd_default(Box, {
      flexDirection: "column",
      marginTop,
      backgroundColor,
      paddingRight,
      children,
    });
    $[28] = marginTop;
    $[29] = backgroundColor;
    $[30] = paddingRight;
    $[31] = children;
    $[32] = xe;
  } else xe = $[32];
  return xe;
}
export {
  isSubagentHistoryEnabled,
  placeholderImageId,
  PasteTracker,
  promptAwaitingModelSlot,
  PLACEHOLDER,
  getImagePlaceholderIds,
  UserPromptText,
};
