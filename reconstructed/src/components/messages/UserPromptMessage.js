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
import {
  init_react_production,
  createContext,
  useContext,
} from "../../../vendor/react/cjs/react.production.js";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isShortSiteText, splitLongTextForCollapse } from "./UserMessageSite.js";
import { parsePastedRefs, formatImageRef } from "../../history.js";
import { isImagePlaceholder } from "../../commands.js";
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { isHumanInitiatedMessage } from "../../utils/messagePredicates.js";
import { shortUuid } from "../../utils/transcriptDiagnostics.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ah34pb7m.js:113172-113176 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:113172", () => {
  init_react_production();
});
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
function getImagePlaceholderIds(text, origin) {
  if ((origin !== undefined && origin.kind !== "human") || !isShortSiteText(text)) return new Set();
  return new Set(
    parsePastedRefs(text)
      .filter((ref) => isImagePlaceholder(ref.match))
      .map((state) => state.id),
  );
}
//@ chunk-ah34pb7m.js:113398-113402 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:113398", () => {
  init_react_production();
});
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
function placeholderImageId(imageId) {
  return `${imageId.toString(16).padStart(8, "0")}${PLACEHOLDER_ID_SUFFIX}000000000000`;
}
//@ chunk-ah34pb7m.js:113521-113559 placement
function isImagePlaceholderId(placeholderId) {
  return placeholderId.slice(8) === PLACEHOLDER_ID_SUFFIX;
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
  start(owner, value) {
    this.#o = owner;
    this.#e = true;
    this.#t = value;
  }
  stop() {
    this.#e = false;
    this.#t = "";
  }
  track(trackedOwner, trackedValue) {
    if (trackedValue.length < this.#o) {
      this.#o = 0;
      this.#e = false;
      this.#t = "";
      return true;
    }
    if (trackedValue.length > trackedOwner.length && this.#e) {
      let suffixLength = trackedValue.length - trackedOwner.length;
      if (
        (trackedOwner.length === 0 || trackedValue[0] === trackedOwner[0]
          ? trackedValue.slice(-suffixLength)
          : trackedValue.slice(0, suffixLength)
        ).some((message) => isHumanInitiatedMessage(message, this.#t))
      )
        this.#e = false;
      else this.#o = trackedValue.length;
    }
    return false;
  }
}
//@ chunk-ah34pb7m.js:113969-113986 placement
/**
 * 导出值：promptAwaitingModelSlot（等待模型的提示槽）；位于「普通用户提示回显（userMessageBackground 背景，brief 模式特殊处理）」模块。
 */
var promptAwaitingModelSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:113969", () => {
  promptAwaitingModelSlot = createContext(null);
});
//@ chunk-ah34pb7m.js:113986-114195 placement
function usePromptAwaitingModel(uuid) {
  let awaitingModel = useContext(promptAwaitingModelSlot);
  let shortId = shortUuid({
    uuid,
  });
  let showPlaceholder = useStoreSelector(
    awaitingModel === "every" ? null : awaitingModel,
    (transcript) =>
      shortId !== undefined &&
      (isImagePlaceholderId(shortId)
        ? transcript.placeholderWaitedInQueue
        : transcript.promptsAwaitingModel.size > 0 && transcript.promptsAwaitingModel.has(shortId)),
  );
  return awaitingModel === "every" || showPlaceholder === true;
}
//@ chunk-ah34pb7m.js:114195-114373 placement
function getViewedAgentLabel(state) {
  let task = state.viewingAgentTaskId ? state.tasks[state.viewingAgentTaskId] : undefined;
  return task?.type !== "local_agent" || !isSubagentHistoryEnabled()
    ? null
    : task.parentAgentId === undefined
      ? "main"
      : "another agent";
}
//@ chunk-ah34pb7m.js:114373-114411 placement
function selectIsBriefOnly_2(state) {
  return state.isBriefOnly;
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
  let $ = useMemoCache(28);
  let { messageId, origin, pluginPrompt, isExpanded } = props;
  let text = props.param.text;
  let pluginName = origin?.kind === "plugin" ? origin.name : undefined;
  let parsedPlugin;
  if ($[0] !== pluginPrompt || $[1] !== text) {
    parsedPlugin = parseWrappedPluginPrompt(text, pluginPrompt);
    $[0] = pluginPrompt;
    $[1] = text;
    $[2] = parsedPlugin;
  } else parsedPlugin = $[2];
  let isPluginPrompt = parsedPlugin;
  let content;
  if ($[3] !== pluginName || $[4] !== isPluginPrompt || $[5] !== text) {
    content =
      isPluginPrompt !== undefined &&
      pluginName !== undefined &&
      isPluginPrompt.label === sourceLabel(pluginName)
        ? isPluginPrompt.text
        : text;
    $[3] = pluginName;
    $[4] = isPluginPrompt;
    $[5] = text;
    $[6] = content;
  } else content = $[6];
  let text_2 = content;
  let appState = useAppState(getViewedAgentLabel);
  let sender = props.followsSpeakerLabel || props.followsInboundLabel;
  let headerElement;
  if ($[7] !== appState || $[8] !== sender || $[9] !== origin) {
    headerElement =
      origin?.kind === "plugin"
        ? pluginPromptLabel(sourceLabel(origin.name))
        : origin?.kind === "coordinator" && appState !== null && !sender
          ? origin.plugin === undefined
            ? `From ${appState}`
            : `From the ${sourceLabel(origin.plugin)} plugin`
          : undefined;
    $[7] = appState;
    $[8] = sender;
    $[9] = origin;
    $[10] = headerElement;
  } else headerElement = $[10];
  let bodyElement = headerElement;
  let draw;
  if ($[11] !== props || $[12] !== text || $[13] !== bodyElement) {
    draw = (columnElement) =>
      jsxProd_default(UserPromptMessage, {
        ...props,
        addMargin: bodyElement === undefined && props.addMargin,
        param:
          columnElement === text
            ? props.param
            : {
                ...props.param,
                text: columnElement,
              },
      });
    $[11] = props;
    $[12] = text;
    $[13] = bodyElement;
    $[14] = draw;
  } else draw = $[14];
  let containerElement;
  if ($[15] !== isExpanded || $[16] !== messageId || $[17] !== origin || $[18] !== draw || $[19] !== text_2) {
    containerElement = {
      messageId,
      stored: origin,
      text: text_2,
      isExpanded,
      draw,
    };
    $[15] = isExpanded;
    $[16] = messageId;
    $[17] = origin;
    $[18] = draw;
    $[19] = text_2;
    $[20] = containerElement;
  } else containerElement = $[20];
  let siteElement = BriefTimestampNamespace.useUserMessageSite(containerElement);
  if (bodyElement === undefined) {
    return siteElement;
  }
  const marginTop = props.addMargin && !sender ? 1 : 0;
  let pointerElement;
  if ($[21] === MEMO_CACHE_SENTINEL) {
    pointerElement = jsxProd_default_2(Text, {
      "aria-hidden": true,
      children: [figures_default.pointerSmall, " "],
    });
    $[21] = pointerElement;
  } else pointerElement = $[21];
  let rowElement;
  if ($[22] !== bodyElement) {
    rowElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: [pointerElement, bodyElement],
    });
    $[22] = bodyElement;
    $[23] = rowElement;
  } else rowElement = $[23];
  let boxElement;
  if ($[24] !== siteElement || $[25] !== marginTop || $[26] !== rowElement) {
    boxElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop,
      children: [rowElement, siteElement],
    });
    $[24] = siteElement;
    $[25] = marginTop;
    $[26] = rowElement;
    $[27] = boxElement;
  } else boxElement = $[27];
  return boxElement;
}
//@ chunk-ah34pb7m.js:115862-117725 fingerprint = UserPromptMessage (0.706)
function UserPromptMessage(props) {
  let $ = useMemoCache(33);
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
  let followSpeakerLabel = followsSpeakerLabel === undefined ? false : followsSpeakerLabel;
  let followInboundLabel = followsInboundLabel === undefined ? false : followsInboundLabel;
  let awaitingModel = usePromptAwaitingModel(messageId);
  let placeholderIds;
  if ($[0] !== followSpeakerLabel || $[1] !== origin || $[2] !== text) {
    placeholderIds = followSpeakerLabel && text ? [...getImagePlaceholderIds(text, origin)] : [];
    $[0] = followSpeakerLabel;
    $[1] = origin;
    $[2] = text;
    $[3] = placeholderIds;
  } else placeholderIds = $[3];
  let placeholderIds_2 = placeholderIds;
  let imagePathSelector;
  if ($[4] !== placeholderIds_2) {
    imagePathSelector = (appState) =>
      placeholderIds_2
        .map((placeholderId) => appState.storedImagePaths.get(placeholderId) ?? "")
        .join("\x00");
    $[4] = placeholderIds_2;
    $[5] = imagePathSelector;
  } else imagePathSelector = $[5];
  let appState = useAppState(imagePathSelector);
  let markLinks;
  if ($[6] !== placeholderIds_2 || $[7] !== appState) {
    let linkMap = new Map();
    let parts = appState.split("\x00");
    markLinks =
      (placeholderIds_2.forEach((placeholderId, index) => {
        let storedPath = parts[index];
        let fileUrl = storedPath ? toSafeFileUrl(storedPath) : null;
        if (fileUrl !== null) linkMap.set(formatImageRef(placeholderId), fileUrl);
      }),
      linkMap.size > 0 ? linkMap : undefined);
    $[6] = placeholderIds_2;
    $[7] = appState;
    $[8] = markLinks;
  } else markLinks = $[8];
  let markLinks_2 = markLinks;
  let isBriefOnly = useAppState(selectIsBriefOnly_2);
  let viewingAgentTaskId = useAppState(selectViewingAgentTaskId);
  let CLAUDE_CODE_BRIEF = env.CLAUDE_CODE_BRIEF;
  let useBriefLayout;
  if ($[9] !== isBriefOnly || $[10] !== isTranscriptMode || $[11] !== viewingAgentTaskId) {
    useBriefLayout =
      getUserMsgOptIn() &&
      (CLAUDE_CODE_BRIEF || getFeatureValue_CACHED_MAY_BE_STALE("tengu_kairos_brief", false)) &&
      isBriefOnly &&
      !isTranscriptMode &&
      !viewingAgentTaskId;
    $[9] = isBriefOnly;
    $[10] = isTranscriptMode;
    $[11] = viewingAgentTaskId;
    $[12] = useBriefLayout;
  } else useBriefLayout = $[12];
  let useBriefLayout_2 = useBriefLayout;
  let expandedText;
  if ($[13] !== text) {
    expandedText = isVirtualPancakeEnabled() ? expandPastedContent(text, sessionTagSalt()) : text;
    $[13] = text;
    $[14] = expandedText;
  } else expandedText = $[14];
  let splitText;
  if ($[15] !== expandedText) {
    splitText = splitLongTextForCollapse(expandedText);
    $[15] = expandedText;
    $[16] = splitText;
  } else splitText = $[16];
  let text_2 = splitText;
  if (!text) {
    logError(Error("No content found in user prompt message"));
    return null;
  }
  if (followInboundLabel) {
    let collapsibleText;
    if ($[17] !== text) {
      collapsibleText = jsxProd_default(CollapsibleText, {
        text,
      });
      $[17] = text;
      $[18] = collapsibleText;
    } else collapsibleText = $[18];
    return collapsibleText;
  }
  if (followSpeakerLabel) {
    let briefBody;
    if ($[19] !== awaitingModel || $[20] !== text_2 || $[21] !== markLinks_2) {
      briefBody = jsxProd_default(Box, {
        flexDirection: "column",
        flexGrow: 1,
        backgroundColor: "userMessageBackground",
        children: jsxProd_default(HighlightedThinkingText, {
          text: text_2,
          bodyOnly: true,
          awaitingModel,
          markLinks: markLinks_2,
        }),
      });
      $[19] = awaitingModel;
      $[20] = text_2;
      $[21] = markLinks_2;
      $[22] = briefBody;
    } else briefBody = $[22];
    return briefBody;
  }
  const marginTop = addMargin ? 1 : 0;
  const backgroundColor = useBriefLayout_2 ? undefined : "userMessageBackground";
  const paddingRight = useBriefLayout_2 ? 0 : 1;
  const timestamp_2 = useBriefLayout_2 ? timestamp : undefined;
  let children;
  if ($[23] !== awaitingModel || $[24] !== text_2 || $[25] !== timestamp_2 || $[26] !== useBriefLayout_2) {
    children = jsxProd_default(HighlightedThinkingText, {
      text: text_2,
      useBriefLayout: useBriefLayout_2,
      timestamp: timestamp_2,
      awaitingModel,
    });
    $[23] = awaitingModel;
    $[24] = text_2;
    $[25] = timestamp_2;
    $[26] = useBriefLayout_2;
    $[27] = children;
  } else children = $[27];
  let container;
  if ($[28] !== marginTop || $[29] !== backgroundColor || $[30] !== paddingRight || $[31] !== children) {
    container = jsxProd_default(Box, {
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
    $[32] = container;
  } else container = $[32];
  return container;
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
