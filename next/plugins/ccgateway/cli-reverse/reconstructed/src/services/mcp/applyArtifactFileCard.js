/**
 * services/mcp/applyArtifactFileCard.ts
 *
 * MCP 文件类工具的文件卡片权限包装：判断是否要弹「会把会话文件发出去」的询问（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6fpa18d8.js (39)
 * attribution: placement 39
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { posix } from "path";
import { isPlainObject } from "../../utils/isPlainObject.js";
import {
  foldedArgumentName,
  mayHoldOthersWriting,
  othersStoredTextIsTold,
  respelledArgument,
  NOT_PUBLIC_BY_THE_SERVERS_MARK,
  createNoticeDecision,
  makesANewArtifact,
} from "../../tools/ArtifactTool/artifactPermissionRules.js";
import { isServerToolName, mcpInfoFromString, getToolNameForPermissionCheck } from "./mcpStringUtils.js";
import { CLAUDE_ARTIFACTS, ARTIFACTS_SERVER_ID } from "./firstPartyServerIds.js";
import { isUnderSandboxPath } from "../../utils/permissions/sensitivePaths.js";
import {
  PROJECT_FILES_LINK,
  DEFAULT_STAGE_FILE_ROOT,
  TOOL_CONTAINER_RESULTS_ROOT,
} from "../../utils/stageFileRoots.js";
import {
  getToolsMachine,
  getPluginHookRunner,
  getMainThreadAgentHooks,
  getSessionId,
  getRegisteredHooks,
  isDiskless,
} from "../../bootstrap/state.js";
import { hasDotDotSegment } from "../../utils/pathClassification.js";
import {
  strictHumanDeciderTurn,
  isNonTypedInput,
  allUserTurnsSatisfy,
  analyzeTurnTail,
} from "../../utils/turnOrigin.js";
import { READNOTIFICATIONS } from "../../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import { FETCH_INBOX_MESSAGE_TOOL_NAME } from "../../tools/FetchInboxMessageTool/prompt.js";
import { AGENT, TASK } from "../../tools/AgentTool/constants.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import { ARTIFACT_CONTENT_AUTHORED_BY_OTHERS } from "../../constants/xml.js";
import { hasSetHook } from "../../utils/hooks/hookRunContext.js";
import { getHooksConfigFromSnapshot } from "../../utils/hooks/hooksConfigSnapshot.js";
import { HOOK_EVENTS } from "../../entrypoints/sdk/coreSchemas.js";
import { getPluginSettingsHooks } from "../../utils/hooks.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";
import {
  isVirtualConversationMessage,
  isSyntheticModelApiErrorMessage,
} from "../../bootstrap/sessionSlices.js";
import { isNoResponseRequestedMessage, isInterruptOnlyMessage } from "../../utils/messages.js";
import { isToolResultMessage } from "../../utils/messageProvenance.js";
import { isSessionTaskNotificationOrigin } from "../../utils/backgroundSessionResume.js";
import { logError } from "../../utils/log.js";
import {
  isCoworkAllowedWriteMcpIncluded,
  hasMcpServerPolicyAllow,
  getMcpRuleClassifierRoute,
  toolAlwaysAllowedRule,
} from "../../utils/permissions/permissions.js";
import {
  liftedAsksInAcceptEdits,
  makeAskDecision,
  mcpPolicyAskRule,
  registerCheckName,
} from "../../utils/permissions/mcpPolicyAsks.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { offscreenFreezeSlot, heldServer, bindingSpecOf } from "../../components/OffscreenFreeze.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  hasFreshGrowthBookFeatures,
  hasGrowthBookOverride,
  getAllGrowthBookFeatures,
} from "../analytics/growthbook.js";
import { isAutoAllowedInMode } from "../../utils/permissions/browserToolNames.js";
import { isPolicyVerdictAbsent } from "../policyLimits/policyEvidence.js";
import { plural } from "../../utils/stringUtils.js";
import { shortenPathForList } from "../fileInputs/attachmentText.js";
import { McpToolFileInputRejectedError } from "./client.js";

//@ chunk-6fpa18d8.js:7674-8133 placement
/**
 * 校验工具的 anthropic/notPublicWhen 元数据：结构不合法返回 mark_unreadable，参数名与元数据不一致返回 respelled，参数值不在允许列表返回 audience。
 */
function checkNotPublicWhen(meta, args, fallback) {
  let mark = meta?.["anthropic/notPublicWhen"];
  if (mark === undefined) return fallback;
  let entries = isPlainObject(mark) ? Object.entries(mark) : [];
  let byFoldedName = new Map(entries.map(([name]) => [foldedArgumentName(name), name]));
  if (
    entries.length === 0 ||
    byFoldedName.size !== entries.length ||
    entries.some(
      ([name, audience]) =>
        name === "" ||
        !Array.isArray(audience) ||
        audience.some((entry) => typeof entry !== "string" || entry === ""),
    )
  )
    return "mark_unreadable";
  if (Object.keys(args).some((key) => (byFoldedName.get(foldedArgumentName(key)) ?? key) !== key))
    return "respelled";
  return entries.some(
    ([name, audience]) =>
      Object.hasOwn(args, name) && Array.isArray(audience) && !audience.includes(args[name]),
  )
    ? "audience"
    : undefined;
}
//@ chunk-6fpa18d8.js:8133-8252 placement
function splitArtifactNames(list) {
  let filtered = list.split(",").filter(Boolean);
  let filtered_2 = filtered.filter((name) => isServerToolName(CLAUDE_ARTIFACTS, name));
  return {
    names: filtered_2,
    dropped: filtered.length - filtered_2.length,
  };
}
//@ chunk-6fpa18d8.js:8252-8567 placement
/**
 * 判断工具入参里的 local 路径是否位于工作目录（或 product/attach 目录）之外。
 */
function needsProjectLink(args, mark) {
  if (!isPlainObject(args)) return true;
  if (!(mark.local in args)) return !(mark.ref in args);
  let path = args[mark.local];
  if (typeof path !== "string" || !posix.isAbsolute(path) || path.includes("\x00")) return true;
  let normalized = posix.normalize(path);
  let withSep = normalized.endsWith(posix.sep) ? normalized : normalized + posix.sep;
  return (
    isUnderSandboxPath(normalized, posix.sep) ||
    [PROJECT_FILES_LINK.product, PROJECT_FILES_LINK.attach].some(
      (link) => withSep.startsWith(link + posix.sep) || (link + posix.sep).startsWith(withSep),
    )
  );
}
//@ chunk-6fpa18d8.js:8567-8664 placement
function getToolsMachineDir() {
  let normalized = posix.normalize(`${getToolsMachine()?.directory?.path ?? ""}${posix.sep}`);
  return normalized === posix.sep ? undefined : normalized;
}
//@ chunk-6fpa18d8.js:8664-8701 placement
var STAGE_ROOTS = [posix.dirname(posix.dirname(DEFAULT_STAGE_FILE_ROOT)), TOOL_CONTAINER_RESULTS_ROOT];
//@ chunk-6fpa18d8.js:8701-8949 placement
function collectPathsOutsideProject(args, mark) {
  let machineDir = getToolsMachineDir();
  return [args[mark.arg]].flat().flatMap((value) => {
    let path = isPlainObject(value) ? value[mark.local] : undefined;
    if (typeof path !== "string") return [];
    let normalized = posix.normalize(path + posix.sep);
    return machineDir !== undefined &&
      !hasDotDotSegment(path) &&
      normalized.startsWith(machineDir) &&
      normalized !== machineDir &&
      !STAGE_ROOTS.some((stageRoot) => normalized.startsWith(stageRoot + posix.sep))
      ? []
      : [path];
  });
}
//@ chunk-6fpa18d8.js:8949-8980 placement
function isStrictHumanTurn(messages) {
  return isTypedByPerson(strictHumanDeciderTurn(messages));
}
//@ chunk-6fpa18d8.js:8980-9073 placement
function isTypedByPerson(message) {
  return (
    message?.type === "user" &&
    message.typedByPerson === true &&
    message.promptRewritten !== true &&
    !isNonTypedInput(message)
  );
}
//@ chunk-6fpa18d8.js:9073-9162 placement
function holdsOthersWriting(name) {
  let mcpInfo = mcpInfoFromString(name);
  return (
    name === READNOTIFICATIONS ||
    name === FETCH_INBOX_MESSAGE_TOOL_NAME ||
    (mcpInfo?.serverName === CLAUDE_ARTIFACTS && mayHoldOthersWriting(mcpInfo.toolName ?? ""))
  );
}
//@ chunk-6fpa18d8.js:9162-9188 placement
var FORK_TOOLS = new Set([AGENT, TASK, SENDMESSAGE]);
//@ chunk-6fpa18d8.js:9188-9378 placement
function messageHoldsOthersWriting(message) {
  return message.type === "assistant"
    ? message.message.content.some(
        (block) =>
          block.type === "tool_use" && (holdsOthersWriting(block.name) || FORK_TOOLS.has(block.name)),
      )
    : message.type === "user" &&
        isPlainObject(message.toolUseResult) &&
        message.toolUseResult.status === "forked";
}
//@ chunk-6fpa18d8.js:9378-9455 placement
function othersTextState(name) {
  let mcpInfo = mcpInfoFromString(name);
  return mcpInfo?.serverName === CLAUDE_ARTIFACTS ? othersStoredTextIsTold(mcpInfo.toolName ?? "") : null;
}
//@ chunk-6fpa18d8.js:9455-9565 placement
function messageUsesOthersTextTool(message) {
  return (
    message.type === "assistant" &&
    message.message.content.some((block) => block.type === "tool_use" && othersTextState(block.name) !== null)
  );
}
//@ chunk-6fpa18d8.js:9565-9753 placement (2.1.88 match: _temp, 0.782)
function isAuthoredByOthersResult(c) {
  let blocks = typeof c.content === "string" ? [] : (c.content ?? []);
  return (
    c.is_error !== true &&
    blocks.some((block) => block.type === "text") &&
    blocks.every((block) =>
      block.type === "text"
        ? !block.text.includes(ARTIFACT_CONTENT_AUTHORED_BY_OTHERS)
        : block.type === "image",
    )
  );
}
//@ chunk-6fpa18d8.js:9753-10208 placement
/**
 * 判断本回合是否还有别的工具会读到会话文件（未回传过的 by_mark 结果、无法回读的工具）。
 */
function isOthersTextTold(messages, toolUseId) {
  let reportedIds = new Set(
    messages.flatMap((message) =>
      message.type === "user" &&
      Array.isArray(message.message.content) &&
      message.mcpMeta?.structuredContent === undefined &&
      message.mcpMeta?.structuredContentOmitted !== true
        ? message.message.content.flatMap((block) =>
            block.type === "tool_result" && isAuthoredByOthersResult(block) ? [block.tool_use_id] : [],
          )
        : [],
    ),
  );
  return messages.some(
    (message) =>
      message.type === "assistant" &&
      message.message.content.some((block) => {
        let state = block.type === "tool_use" && block.id !== toolUseId ? othersTextState(block.name) : null;
        return (
          state === "cannot" ||
          (state === "by_mark" && block.type === "tool_use" && !reportedIds.has(block.id))
        );
      }),
  );
}
//@ chunk-6fpa18d8.js:10208-10281 placement
var PROMPT_HOOK_EVENTS = new Set(["SessionStart", "UserPromptSubmit", "UserPromptExpansion"]);
//@ chunk-6fpa18d8.js:10281-10698 placement
/**
 * 判断附件消息是否值得单独提示（MCP 资源、钩子错误、有内容的钩子附加上下文等）。
 */
function isCardMaterialAttachment(message) {
  if (message.type !== "attachment") return false;
  let { attachment } = message;
  switch (attachment.type) {
    case "mcp_resource":
    case "hook_blocking_error":
    case "hook_stopped_continuation":
      return true;
    case "hook_success":
      return attachment.content !== "" && PROMPT_HOOK_EVENTS.has(attachment.hookEvent);
    case "hook_additional_context":
      return attachment.content.length > 0;
    case "async_hook_response": {
      let response = attachment.response;
      return (
        !isPlainObject(response) ||
        response.systemMessage !== undefined ||
        response.hookSpecificOutput !== undefined
      );
    }
    default:
      return false;
  }
}
//@ chunk-6fpa18d8.js:10698-11043 placement
/**
 * 判断会话里是否有任何钩子/技能/插件钩子/命令钩子登记，用于文件卡片是否要提示。
 */
function hasAnyHooks({ sessionHooksRegistry }) {
  let hasAny = (byEvent) => Object.values(byEvent).some((hooks) => (hooks?.length ?? 0) > 0);
  let pluginHookRunner = getPluginHookRunner();
  return (
    hasSetHook() ||
    hasAny(getHooksConfigFromSnapshot() ?? {}) ||
    hasAny(getMainThreadAgentHooks() ?? {}) ||
    sessionHooksRegistry.get(getSessionId()).size > 0 ||
    (sessionHooksRegistry.skillDraws(getSessionId())?.size ?? 0) > 0 ||
    Object.values(getRegisteredHooks() ?? {}).some((hooks) =>
      hooks.some((hook) => "pluginRoot" in hook || "deviceOwner" in hook),
    ) ||
    HOOK_EVENTS.some(
      (event) =>
        getPluginSettingsHooks(event).length > 0 ||
        pluginHookRunner?.owedList(event, undefined, true) !== undefined,
    )
  );
}
//@ chunk-6fpa18d8.js:11043-11155 placement
function isForkOrSkillMessage(message) {
  return (
    messageHoldsOthersWriting(message) ||
    (message.type === "assistant" &&
      message.message.content.some((block) => block.type === "tool_use" && block.name === SKILL))
  );
}
//@ chunk-6fpa18d8.js:11155-11260 placement
function messageUsesTool(message, toolUseId) {
  return (
    message.type === "assistant" &&
    message.message.content.some((block) => block.type === "tool_use" && block.id === toolUseId)
  );
}
//@ chunk-6fpa18d8.js:11260-11442 placement (2.1.88 match: hasThinkingContent, 1)
function hasThinkingContent(m) {
  return (
    m.type === "assistant" &&
    !isVirtualConversationMessage(m) &&
    !isSyntheticModelApiErrorMessage(m) &&
    !isNoResponseRequestedMessage(m) &&
    m.message.content.some((block) =>
      block.type === "text"
        ? block.text.trim() !== ""
        : block.type !== "thinking" && block.type !== "redacted_thinking",
    )
  );
}
//@ chunk-6fpa18d8.js:11442-11516 placement
function isCleanHumanTurn(previous, message) {
  return (
    isTypedByPerson(message) ||
    (message.type === "user" &&
      isInterruptOnlyMessage(message) &&
      previous === undefined &&
      !isNonTypedInput(message))
  );
}
//@ chunk-6fpa18d8.js:11516-12162 placement
/**
 * 判断工具调用与当前消息的位置关系（joined/joined_ahead/joined_call/joined_page/joined_report），决定是否必须询问。
 */
function classifyJoin(context) {
  let { messages, sameTurnToolUses, toolUseId } = context;
  try {
    if (hasAnyHooks(context)) return "joined_hook";
    let humanTurn = strictHumanDeciderTurn(messages);
    let humanTurnIndex = humanTurn === undefined ? -1 : messages.lastIndexOf(humanTurn);
    if (humanTurnIndex < 0) return "joined";
    let sliced = messages.slice(
      messages.findLastIndex((message, index) => index < humanTurnIndex && hasThinkingContent(message)) + 1,
      humanTurnIndex,
    );
    let messages_2 = messages.slice(humanTurnIndex);
    if (
      sliced.some(
        (entry) =>
          entry.type === "user" &&
          isToolResultMessage(entry) &&
          entry.turnCompanion !== true &&
          entry.toolDenialKind === undefined,
      ) ||
      sliced.some(isCardMaterialAttachment) ||
      !allUserTurnsSatisfy(
        sliced,
        (entry, index) => isCleanHumanTurn(entry, index) || isSessionTaskNotificationOrigin(entry),
      )
    )
      return "joined_ahead";
    if (
      messages_2.some(isCardMaterialAttachment) ||
      !allUserTurnsSatisfy(
        messages_2,
        (entry, index) => index === humanTurn || isSessionTaskNotificationOrigin(entry),
      )
    )
      return "joined";
    if (
      messages_2.some(messageHoldsOthersWriting) ||
      (sameTurnToolUses?.some(isForkOrSkillMessage) ??
        !messages_2.some((entry) => messageUsesTool(entry, toolUseId)))
    )
      return "joined_call";
    if (isOthersTextTold(messages_2, toolUseId) || sameTurnToolUses?.some(messageUsesOthersTextTool) === true)
      return "joined_page";
    return allUserTurnsSatisfy(sliced, isCleanHumanTurn) &&
      allUserTurnsSatisfy(messages_2, (entry, index) => index === humanTurn)
      ? undefined
      : "joined_report";
  } catch (error) {
    logError(error);
    return "joined";
  }
}
//@ chunk-6fpa18d8.js:12162-12599 placement
/**
 * 决定是否要给这次 MCP 文件工具调用弹卡片及原因（respelled/audience/contract/file/source_folder 等）。
 */
function classifyArtifactCall(args, { mark, meta }, context, useFallback) {
  if (!isPlainObject(args) || respelledArgument(args, mark) !== undefined) return "respelled";
  if (Object.hasOwn(args, "shared_live") && !NOT_PUBLIC_BY_THE_SERVERS_MARK.has(args.shared_live))
    return "audience";
  let reason = checkNotPublicWhen(meta, args, useFallback ? "mark_unreadable" : undefined);
  if (reason !== undefined) return reason;
  if (Object.hasOwn(args, "contract")) return "contract";
  if (!isStrictHumanTurn(context.messages)) return "opener";
  let joinReason = classifyJoin(context);
  if (joinReason !== undefined) return joinReason;
  if ([args[mark.arg] ?? []].flat().some((value) => needsProjectLink(value, mark))) return "file";
  return collectPathsOutsideProject(args, mark).length > 0 ? "source_folder" : undefined;
}
//@ chunk-6fpa18d8.js:12599-12644 placement
function isReplScriptInner(route) {
  return route.replScriptInner === true;
}
//@ chunk-6fpa18d8.js:12644-12702 placement
function isClassifierRouteEnabled(mcpRuleClassifierRoute) {
  return mcpRuleClassifierRoute === "serverPolicy"
    ? isCoworkAllowedWriteMcpIncluded()
    : mcpRuleClassifierRoute !== undefined;
}
//@ chunk-6fpa18d8.js:12702-12761 placement
function hasAlwaysAllowRule({ tool, check }, toolPermissionContext) {
  return liftedAsksInAcceptEdits(toolPermissionContext, check).has(getToolNameForPermissionCheck(tool));
}
//@ chunk-6fpa18d8.js:12761-12825 placement
function fallbackAskDecision({ tool }, reason) {
  logFeatureSad("mcp_file_card", reason);
  return makeAskDecision(tool, getToolNameForPermissionCheck(tool));
}
//@ chunk-6fpa18d8.js:12825-12930 placement
async function runOwnCheck(card, ...[input, context]) {
  let hasRule = hasAlwaysAllowRule(card, getToolPermissionContext(context));
  let decision = await card.ownCheck.call(card.tool, input, context);
  return decideFileCard(card, decision, hasRule, input, context);
}
//@ chunk-6fpa18d8.js:12930-13302 placement
/**
 * passthrough 结果下判定是否要升级为询问：非文件交付、非本机文件卡片开关、非 claudeai 服务器都直接放行。
 */
function passthroughRefusal({ client }, decision, session) {
  if (decision.behavior !== "passthrough") return "own_allow";
  let host = offscreenFreezeSlot.peek(session)?.host;
  if (host === undefined || !getFeatureValue_CACHED_MAY_BE_STALE("tengu_walnut_tiller", true))
    return "no_file_delivery";
  if (heldServer(host, client)?.serverId !== ARTIFACTS_SERVER_ID) return "other_entry";
  if (!hasFreshGrowthBookFeatures() && !hasGrowthBookOverride("tengu_sprightly_orbit")) return "no_flags";
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_sprightly_orbit", true) === true &&
    getAllGrowthBookFeatures().tengu_sprightly_orbit !== null
    ? undefined
    : "switched_off";
}
//@ chunk-6fpa18d8.js:13302-14296 placement
/**
 * 文件卡片的最终判定：合并自有检查与卡片原因，产生 ask 决定（suppressAlwaysAllowRule、defaultToNo）或原样放行。
 */
function decideFileCard(card, decision, hasRule, ...[input, context]) {
  if (decision.behavior === "deny") return decision;
  let { tool, client } = card;
  let noticeDecision = createNoticeDecision(tool.mcpInfo?.toolName ?? "", input, context);
  let message = noticeDecision?.behavior === "ask" ? noticeDecision.message : undefined;
  let agentId = agentKey(context);
  if (card.grantsExpiredIn.has(agentId)) {
    let expiredFor = deciderUuid(context.messages);
    if (expiredFor === undefined || expiredFor === card.grantsExpiredIn.get(agentId))
      return buildAskDecision(card, "server_holds", input, message);
    card.grantsExpiredIn.delete(agentId);
  }
  let toolPermissionContext = getToolPermissionContext(context);
  let autoAllow = isAutoAllowedInMode(tool, toolPermissionContext);
  if (hasRule) {
    if (decision.behavior === "ask") {
      if (decision.decisionReason?.type === "rule" && decision.decisionReason.rule.ruleBehavior === "ask")
        return decision;
      let { suggestions, ...rest } = decision;
      logFeatureSad("mcp_file_card", "own_ask");
      return {
        ...rest,
        matchedAskRule: mcpPolicyAskRule(getToolNameForPermissionCheck(tool)),
      };
    }
    let reason = passthroughRefusal(card, decision, context.session);
    if (reason !== undefined) return fallbackAskDecision(card, reason);
  } else if (
    decision.behavior !== "passthrough" ||
    (client.name !== CLAUDE_ARTIFACTS &&
      heldServer(offscreenFreezeSlot.peek(context.session)?.host, client) === undefined) ||
    autoAllow === "plan" ||
    autoAllow === "bypassPermissions" ||
    !hasMcpServerPolicyAllow(tool, toolPermissionContext) ||
    (!isReplScriptInner(context) &&
      isClassifierRouteEnabled(
        getMcpRuleClassifierRoute(
          toolAlwaysAllowedRule(toolPermissionContext, tool),
          tool,
          isPlainObject(input) ? input : {},
          autoAllow,
          context,
          () => "off",
        ),
      ))
  )
    return decision;
  if (noticeDecision?.behavior === "deny") {
    logFeatureSad("mcp_file_card", "create_notice");
    return noticeDecision;
  }
  let reason =
    classifyArtifactCall(input, card, context, hasRule) ??
    (noticeDecision === undefined && !makesNewArtifact(tool, input) ? undefined : "create_notice");
  if (reason === undefined) {
    logFeatureOk("mcp_file_card");
    return decision;
  }
  return buildAskDecision(card, reason, input, message);
}
//@ chunk-6fpa18d8.js:14296-14333 placement
function agentKey({ agentId }) {
  return agentId ?? "";
}
//@ chunk-6fpa18d8.js:14333-14395 placement
function makesNewArtifact({ mcpInfo }, input) {
  return isPolicyVerdictAbsent() && makesANewArtifact(mcpInfo?.toolName ?? "", input);
}
//@ chunk-6fpa18d8.js:14395-14468 placement
function deciderUuid(messages) {
  let decider = analyzeTurnTail(messages).decider;
  return decider == null ? undefined : messages[decider.index]?.uuid;
}
//@ chunk-6fpa18d8.js:14468-14780 placement
/**
 * 生成「可能在工作目录外」的说明文本，带上路径与更多文件数量。
 */
function describeOutsideFolder({ mark }, input) {
  let stagePrefix = DEFAULT_STAGE_FILE_ROOT + posix.sep;
  let paths = isPlainObject(input) ? collectPathsOutsideProject(input, mark) : [];
  let outsidePath = paths.find((path) => posix.normalize(path).startsWith(stagePrefix)) ?? paths[0];
  if (outsidePath === undefined) return;
  let machineDir = getToolsMachineDir();
  let extraCount = paths.length - 1;
  let extraText = extraCount > 0 ? ` and ${extraCount} more ${plural(extraCount, "file")}` : "";
  return `May be outside the folder that Claude works in${machineDir === undefined ? ", which is not known" : ` (${shortenPathForList(machineDir)})`}: ${shortenPathForList(outsidePath)}${extraText}.`;
}
//@ chunk-6fpa18d8.js:14780-14879 placement
async function prefixDescription(prefix, prepared) {
  let result = await prepared;
  return "error" in result
    ? result
    : {
        ...result,
        description: `${prefix}
${result.description}`,
      };
}
//@ chunk-6fpa18d8.js:14879-15282 placement
/**
 * 构造文件卡片的 ask 决定：拼接提示文案与原因，标记 safetyCheck、不可由分类器批准。
 */
function buildAskDecision(card, reason, input, message) {
  logFeatureSad("mcp_file_card", reason);
  let joined = [
    `${card.tool.mcpInfo?.toolName} can send this session's files elsewhere, so Claude asks before using it.`,
    describeOutsideFolder(card, input),
    message,
    "Allow it if you expected this.",
  ]
    .filter((part) => part !== undefined)
    .join(" ");
  return {
    behavior: "ask",
    message: joined,
    suppressAlwaysAllowRule: true,
    ...(message !== undefined && {
      personOnly: true,
      defaultToNo: true,
    }),
    decisionReason: {
      type: "safetyCheck",
      reason: joined,
      classifierApprovable: false,
    },
  };
}
//@ chunk-6fpa18d8.js:15282-15776 placement
/**
 * 未询问回合里的文件工具判定：给出规则名与替代决定，或在无原因时返回 null。
 */
function unaskedTurnDecision(permissionContext, tool, ...[input, context]) {
  let checkName = getToolNameForPermissionCheck(tool);
  if (!liftedAsksInAcceptEdits(permissionContext).has(checkName)) return null;
  let rule = mcpPolicyAskRule(checkName);
  let reason;
  let notice;
  try {
    notice = createNoticeDecision(tool.mcpInfo?.toolName ?? "", input, context);
    reason = isStrictHumanTurn(context.messages)
      ? (classifyJoin(context) ?? (makesNewArtifact(tool, input) ? "create_notice" : undefined))
      : "opener";
  } catch (error) {
    logError(error);
    reason = "opener";
  }
  if (notice?.behavior === "deny") {
    logFeatureSad("mcp_unasked_turn", "create_notice");
    return {
      rule,
      inItsPlace: notice,
    };
  }
  if (reason === undefined && notice === undefined) {
    logFeatureOk("mcp_unasked_turn");
    return null;
  }
  logFeatureSad("mcp_unasked_turn", reason ?? "create_notice");
  return {
    rule,
    inItsPlace:
      notice?.behavior === "ask"
        ? notice
        : {
            ...makeAskDecision(tool, checkName),
            suppressAlwaysAllowRule: true,
          },
  };
}
//@ chunk-6fpa18d8.js:15776-16761 placement
/**
 * 给 MCP 文件工具装上权限包装：改写 checkPermissions、失败决定、ask 输入准备与 call（捕获 put_expired）。
 */
function installFileCardChecks(tool, meta, client) {
  let mark = isDiskless() ? bindingSpecOf(meta) : undefined;
  if (mark === undefined) return;
  let check = (input, context) => runOwnCheck(card, input, context);
  let card = {
    tool,
    mark,
    meta,
    client,
    ownCheck: tool.checkPermissions,
    check,
    grantsExpiredIn: new Map(),
  };
  if (client.name === CLAUDE_ARTIFACTS) registerCheckName(check, getToolNameForPermissionCheck(tool));
  tool.checkPermissions = check;
  let permissionCheckFailureDecision = tool.permissionCheckFailureDecision;
  tool.permissionCheckFailureDecision = (input, context) => {
    let decision = permissionCheckFailureDecision?.call(tool, input, context);
    return decision?.behavior !== "deny" &&
      getToolPermissionContext(context).mcpPolicyFileAsksLiftedInAcceptEdits?.includes(
        getToolNameForPermissionCheck(tool),
      )
      ? fallbackAskDecision(card, "check_failed")
      : decision;
  };
  let askInputPreparer = tool.askInputPreparer;
  tool.askInputPreparer = async (input, context, options) => {
    let prepared = await askInputPreparer?.(input, context, options);
    if (prepared === undefined) return;
    let prefix;
    try {
      let noticeDecision = createNoticeDecision(tool.mcpInfo?.toolName ?? "", input, context);
      prefix = [
        describeOutsideFolder(card, input),
        noticeDecision?.behavior === "ask" ? noticeDecision.message : undefined,
      ]
        .filter((part) => part !== undefined)
        .join(" ");
    } catch (error) {
      logError(error);
      return prepared;
    }
    let { prepareAgain } = prepared;
    return prefix === ""
      ? prepared
      : {
          prepare: () => prefixDescription(prefix, prepared.prepare()),
          ...(prepareAgain && {
            prepareAgain: (again) => prefixDescription(prefix, prepareAgain.call(prepared, again)),
          }),
        };
  };
  let originalCall = tool.call;
  tool.call = async (input, context, ...rest) => {
    try {
      return await originalCall(input, context, ...rest);
    } catch (error) {
      if (error instanceof McpToolFileInputRejectedError && error.code === "put_expired")
        card.grantsExpiredIn.set(agentKey(context), deciderUuid(context.messages));
      throw error;
    }
  };
}
export { installFileCardChecks, unaskedTurnDecision, splitArtifactNames };
