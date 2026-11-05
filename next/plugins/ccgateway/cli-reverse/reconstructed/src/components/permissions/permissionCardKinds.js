/**
 * components/permissions/permissionCardKinds.ts
 *
 * 2.1.316 新增：权限卡片定义：各工具（Bash、文件、WebFetch、Monitor、PowerShell、Skill、PublishPlugin、ExitPlanMode 等）的卡片 kind 与载荷构造。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-g4tsxwy3.js (59)
 * attribution: placement 57, layout 2
 */
import { fileURLToPath } from "url";
import { isAbsolute, relative, posix, basename } from "path";
import { withHideWhile } from "../dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { deepFreezeToolName } from "../../utils/deepFreezePlainData.js";
import { CONFIRM } from "../../utils/permissions/confirmWithUser.js";
import {
  truncateForDisplayText,
  displayField,
  mcpServerLabel,
  displayLabelOrUnnamedTool,
  safeLabel,
  serializeApprovalPayload,
  MAX_PAYLOAD_UNITS,
  replaceLineBreaks,
  sanitizeForDisplay,
  MAX_RAW_DISPLAY_CHARS,
  markBrokenSequences,
  renderableText,
  isCleanText,
  hasNoVisibleText,
  hasSuspiciousText,
  hasBrokenSequences,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import { toSafeFileUrl } from "../../services/mcp/xaa.js";
import { tildify, expandPath } from "../../utils/path.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import { isRebindableLegacyGrant } from "../../services/mcp/mcpStandardKeys.js";
import { shouldShowAlwaysAllowOptions } from "../../utils/permissions/permissionsLoader.js";
import {
  isRemoteOrPluginAgent,
  getHookCallerOf,
  isHookOrPluginSteered,
  isSubagentContext,
  isNonMainSessionSubagent,
} from "../../utils/agentContext.js";
import { getCommandNetworkLists } from "../../tools/BashTool/sandboxNetwork.js";
import { describeBrowserToolAction } from "../TrustDialog/utils.js";
import {
  getAutoModeUnavailableReason,
  getDisableAutoModeSettingSources,
  isAutoModeDisabledByPolicySettings,
} from "../../utils/permissions/permissionSetup.js";
import { getSettingsFilePathForSource } from "../../utils/settings/settings.js";
import { renderModelName } from "../../utils/model/modelDisplay.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { AskUserQuestionTool } from "../../tools/AskUserQuestionTool/AskUserQuestionTool.js";
import { websocketSubprotocols, MAX_QUOTED_ITEMS } from "../../utils/websocketSummary.js";
import { truncateToLength, plural } from "../../utils/stringUtils.js";
import { isUntouchableSpelling, isNetworkOrSpecialPath, isNonWslUncPath } from "../../utils/networkPaths.js";
import {
  readFileSync,
  isFileTooLargeError,
  readFileChecked,
  isNotRegularFileError,
} from "../../utils/fileRead.js";
import { BOUNDED_READ_MAX } from "../../utils/fsSafety/atomicWriteStaging.js";
import { isENOENT } from "../../utils/errors.js";
import { getPlanFilePath, notePlanFileForgotten, getPlan } from "../../utils/plans.js";
import { getTokenCountFromUsage_2 } from "../../utils/messages/usageAndStopReason.js";
import {
  indentedPrintableName,
  staysOnMachineLines,
  manifestWriteLines,
  fileEntryLine,
  moreFilesNote,
  manifestEntryLines,
} from "../../utils/teleport/uploadManifestText.js";
import { printableOrEmpty } from "../../utils/printableName.js";
import { formatFileSize } from "../../utils/format.js";
import { sessionScopedMapsSlot } from "../../utils/sessionScopedMaps.js";
import { PUBLISH_PLUGIN_INPUT_SCHEMA } from "../../tools/PublishPluginTool/constants.js";
import { objectSchema, stringSchema, array, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { FileEditTool } from "../../tools/FileEditTool/FileEditTool.js";
import { FileWriteTool } from "../../tools/FileWriteTool/FileWriteTool.js";
import { NotebookEditTool } from "../../tools/NotebookEditTool/NotebookEditTool.js";
import { GlobTool } from "../../tools/GlobTool/GlobTool.js";
import { GrepTool } from "../../tools/GrepTool/GrepTool.js";
import { FileReadTool } from "../../tools/FileReadTool/FileReadTool.js";
import { walkPermissionCheckPaths, getFsImplementation } from "../../utils/fsOperations.js";
import { symlinkLanding } from "../../utils/permissions/filesystem.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { getCwd } from "../../utils/cwd.js";
import { stripBom } from "../../utils/remoteFileState.js";
import { findNotebookCellSource, MAX_NOTEBOOK_BYTES } from "../../utils/notebook.js";
import { labelsMemoryItem } from "../../tools/MemoryTool/memoryWrite.js";
import { languageForFilePath } from "../../utils/highlight/pluginLanguages.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { createLazySignal } from "../../utils/signal.js";
import { uiSignals } from "../../state/uiSignals.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-g4tsxwy3.js:4765-5053 placement
/**
 * 权限卡片注册项（qo 定义 kind + payload/result schema）：AskUserQuestion、Bash、Browser、EnterPlanMode、File、Monitor、PowerShell、Skill、WebFetch、PublishPlugin、ExitPlanMode v2 等。
 */
var ASK_USER_QUESTION_PERMISSION_CARD; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g4tsxwy3.js:4765", () => {
  ASK_USER_QUESTION_PERMISSION_CARD = withHideWhile({
    kind: "permission_ask_user_question",
    payload: DoctorLazy(() =>
      deepFreezeToolName(
        (payload) =>
          typeof payload === "object" &&
          payload !== null &&
          "requestId" in payload &&
          "toolName" in payload &&
          "permissionResult" in payload &&
          "questions" in payload,
      ),
    ),
    result: DoctorLazy(() =>
      deepFreezeToolName((value) => typeof value === "object" && value !== null && "behavior" in value),
    ),
    default: {
      behavior: "cancelled",
    },
  });
});
//@ chunk-g4tsxwy3.js:5053-5089 placement
function isNotAskUserQuestionCard(kind) {
  return kind !== ASK_USER_QUESTION_PERMISSION_CARD.kind;
}
//@ chunk-g4tsxwy3.js:5089-5387 placement
var BASH_PERMISSION_CARD; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g4tsxwy3.js:5089", () => {
  BASH_PERMISSION_CARD = withHideWhile({
    kind: "permission_bash",
    payload: DoctorLazy(() =>
      deepFreezeToolName(
        (payload) =>
          typeof payload === "object" &&
          payload !== null &&
          "requestId" in payload &&
          "toolName" in payload &&
          "permissionResult" in payload &&
          "command" in payload &&
          "classifierState" in payload,
      ),
    ),
    result: DoctorLazy(() =>
      deepFreezeToolName((value) => typeof value === "object" && value !== null && "behavior" in value),
    ),
    default: {
      behavior: "cancelled",
    },
  });
});
//@ chunk-g4tsxwy3.js:5387-6509 placement
/**
 * 解释为什么已允许的操作仍要询问：auto 模式不可用的原因（组织关闭、托管设置、设置文件 disableAutoMode、模型不支持、fast 模式、不可用）。
 */
function describeAutoModeGrantBlock(grantNotice, display) {
  let leadIn = `${display} is allowed, but Claude asks before actions like this because they can only be approved automatically when auto mode is available, and`;
  switch (grantNotice.cause) {
    case "organization":
      return `${leadIn} your organization has turned auto mode off.`;
    case "managed-settings":
      return `${leadIn} auto mode is turned off in this computer's managed settings.`;
    case "settings": {
      if (grantNotice.files.length === 0 && grantNotice.startup)
        return `${leadIn} auto mode is turned off by the disableAutoMode setting Claude Code was started with. Start Claude Code without it to change this.`;
      let settingFiles = [
        ...grantNotice.files,
        ...(grantNotice.startup ? ["the settings Claude Code was started with"] : []),
      ];
      let filesLabel = settingFiles.length === 0 ? "your settings files" : settingFiles.join(" and ");
      return `${leadIn} auto mode is turned off by the disableAutoMode setting in ${filesLabel}. Remove it and restart Claude Code to change this.`;
    }
    case "model":
      return `${leadIn} ${grantNotice.model} doesn't support auto mode. Switch models with /model to change this.`;
    case "fast-mode":
      return `${leadIn} auto mode is off while fast mode is on. Run /fast off to change this.`;
    case "unavailable":
      return `${leadIn} auto mode isn't available in this session. Restart Claude Code to check again.`;
  }
}
//@ chunk-g4tsxwy3.js:6509-6788 placement
var BROWSER_PERMISSION_CARD; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g4tsxwy3.js:6509", () => {
  BROWSER_PERMISSION_CARD = withHideWhile({
    kind: "permission_browser",
    payload: DoctorLazy(() =>
      deepFreezeToolName(
        (payload) =>
          typeof payload === "object" &&
          payload !== null &&
          "requestId" in payload &&
          "toolName" in payload &&
          "permissionResult" in payload &&
          "verbPhrase" in payload,
      ),
    ),
    result: DoctorLazy(() =>
      deepFreezeToolName((value) => typeof value === "object" && value !== null && "behavior" in value),
    ),
    default: {
      behavior: "cancelled",
    },
  });
});
//@ chunk-g4tsxwy3.js:6788-7055 placement
var ENTER_PLAN_MODE_PERMISSION_CARD; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g4tsxwy3.js:6788", () => {
  ENTER_PLAN_MODE_PERMISSION_CARD = withHideWhile({
    kind: "permission_enter_plan_mode",
    payload: DoctorLazy(() =>
      deepFreezeToolName(
        (payload) =>
          typeof payload === "object" &&
          payload !== null &&
          "requestId" in payload &&
          "toolName" in payload &&
          "permissionResult" in payload,
      ),
    ),
    result: DoctorLazy(() =>
      deepFreezeToolName((value) => typeof value === "object" && value !== null && "behavior" in value),
    ),
    default: {
      behavior: "cancelled",
    },
  });
});
//@ chunk-g4tsxwy3.js:7127-7214 placement
var MARKDOWN_LINK_RE = /\[([^[\]\n]*)\]\(([^()\s]*)\)/g;
var isAuthedLinkText = (toolUseID) => typeof toolUseID === "string" && toolUseID.startsWith(CONFIRM);
//@ chunk-g4tsxwy3.js:7214-7399 placement
/**
 * 把问题文本拆成标题（第一行）与正文行列表。
 */
function splitQuestionTitleBody(text) {
  let rawQuestion = truncateForDisplayText(text);
  let index = rawQuestion.indexOf(`

`);
  if (index === -1)
    return {
      title: displayField(rawQuestion).text,
      body: [],
    };
  let text_2 = rawQuestion.slice(index + 2).replace(/^\n+/, "");
  return {
    title: displayField(rawQuestion.slice(0, index)).text,
    body: text_2 === "" ? [] : parseFileLinkSegments(text_2),
  };
}
//@ chunk-g4tsxwy3.js:7399-7781 placement
/**
 * 把文本中的 markdown file:/// 链接拆成 text 与 fileLink 片段（只接受绝对路径的安全文件 URL）。
 */
function parseFileLinkSegments(text) {
  let segments = [];
  let pending = "";
  let cursor = 0;
  for (let match of text.matchAll(MARKDOWN_LINK_RE)) {
    let [fullMatch, label = "", url = ""] = match;
    let targetPath = fileUrlToAbsolutePath(url);
    let safeUrl = targetPath === null ? null : toSafeFileUrl(targetPath);
    pending += text.slice(cursor, match.index);
    cursor = match.index + fullMatch.length;
    if (targetPath === null || safeUrl === null) {
      pending += fullMatch;
      continue;
    }
    if (pending !== "") {
      segments.push({
        kind: "text",
        text: displayField(pending).text,
      });
      pending = "";
    }
    segments.push({
      kind: "fileLink",
      label: displayField(label).text,
      url: safeUrl,
      path: displayField(tildify(targetPath)).text,
    });
  }
  pending += text.slice(cursor);
  if (pending !== "")
    segments.push({
      kind: "text",
      text: displayField(pending).text,
    });
  return segments;
}
//@ chunk-g4tsxwy3.js:7781-7891 placement
function fileUrlToAbsolutePath(value) {
  if (!/^file:\/\/\//i.test(value)) return null;
  try {
    let filePath = fileURLToPath(value);
    return isAbsolute(filePath) ? filePath : null;
  } catch {
    return null;
  }
}
//@ chunk-g4tsxwy3.js:7891-7921 layout
var DATE_TIME_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-g4tsxwy3.js:7891", () => {
  DATE_TIME_TYPES = new Set(["date-time"]);
});
//@ chunk-g4tsxwy3.js:7921-8185 layout (2.1.88 match: hasStringFormat, 0.864)
/**
 * getParamFormatHints：工具 inputJSONSchema 中 format=date-time 的参数表，供权限 UI 提示。
 */
function getParamFormatHints(schema) {
  let properties = schema?.properties;
  if (properties === null || typeof properties !== "object" || Array.isArray(properties)) return;
  let hint;
  for (let [key, value] of Object.entries(properties)) {
    if (value === null || typeof value !== "object" || !("format" in value)) continue;
    let format = value.format;
    if (typeof format === "string" && DATE_TIME_TYPES.has(format)) {
      hint ??= {};
      hint[key] = format;
    }
  }
  return hint;
}
//@ chunk-g4tsxwy3.js:8185-10179 placement
/**
 * buildPermissionPromptPayload：把一次权限请求整理成发给宿主/桥接 UI 的载荷（显示名、渲染后的输入、卡片、always-allow 可用性、MCP 标记等）。归属疑为权限/桥接（见 lead 建议）。
 */
function buildPermissionPromptPayload(request) {
  let mcpInfo = request.tool.isMcp === true ? request.tool.mcpInfo : undefined;
  let hasMcpSuffix = request.tool.isMcp === true;
  let serverLabel;
  if (mcpInfo) serverLabel = mcpServerLabel(mcpInfo);
  else {
    let userFacingName;
    try {
      userFacingName = request.tool.userFacingName(request.input) || request.tool.name;
    } catch {
      userFacingName = request.tool.name;
    }
    let toolName =
      request.tool.isMcp === true && userFacingName.endsWith(" (MCP)")
        ? userFacingName.slice(0, -6)
        : userFacingName;
    serverLabel = displayLabelOrUnnamedTool(toolName);
  }
  let renderedMessage = "";
  let renderFailed;
  if (request.tool.isMcp !== true)
    try {
      let rendered =
        request.tool.renderToolUseMessage?.(request.input, {
          theme: request.theme,
          verbose: true,
        }) ?? null;
      renderedMessage = typeof rendered === "string" ? stripNonPrintable(rendered) : rendered;
    } catch {
      renderedMessage = "parameters could not be rendered \u2014 deny unless expected";
      renderFailed = true;
    }
  let decisionReason = request.permissionResult.decisionReason;
  let customCard = !(
    !renderFailed &&
    request.permissionResult.matchedAskRule === undefined &&
    request.permissionResult.denialLimitFallback === undefined &&
    request.permissionResult.autoDenyWindow === undefined &&
    (decisionReason === undefined || decisionReason.type === "safetyCheck" || decisionReason.type === "other")
  )
    ? undefined
    : request.servedCard !== undefined
      ? request.servedCard.card
      : decisionReason !== undefined
        ? request.tool.permissionCard?.(request.input, request.toolUseID, decisionReason.reason)
        : undefined;
  if (request.servedCard !== undefined && customCard !== undefined)
    serverLabel = safeLabel(request.servedCard.name);
  let isLegacyGrant = request.requestSource === undefined && isRebindableLegacyGrant(request.tool);
  let permissionNote = request.tool.permissionNote?.(request.input, request.permissionMode);
  return {
    requestId: request.toolUseID,
    toolName: request.tool.name,
    input: request.input,
    description: displayField(request.description).text,
    permissionResult: request.permissionResult,
    userFacingName: serverLabel,
    hasMcpSuffix,
    renderedToolUseMessage: renderedMessage,
    toolUseRenderFailed: renderFailed,
    paramFormatHints: getParamFormatHints(request.tool.inputJSONSchema),
    card: customCard && {
      question: displayField(customCard.question).text,
      lines: customCard.lines.map((line) => displayField(line).text),
      values: customCard.values.map((value) => displayField(value).text),
    },
    ...(permissionNote !== undefined && {
      note: displayField(permissionNote).text,
    }),
    messageId: request.assistantMessage.message.id,
    isMcp: request.tool.isMcp ?? false,
    isAskCappedByOrg: request.tool.mcpInfo?.effectiveMaxPermission === "ask",
    showAlwaysAllow:
      shouldShowAlwaysAllowOptions() &&
      !(
        request.permissionResult.behavior === "ask" &&
        request.permissionResult.suppressAlwaysAllowRule === true
      ) &&
      (request.tool.suppressesAlwaysAllowRule?.(request.input) !== true || isLegacyGrant) &&
      request.tool.suppressesAllPermissionUpdates?.(request.input) !== true &&
      !isRemoteOrPluginAgent(request.requestSource),
    ...(isLegacyGrant && {
      takesOverServerName: isLegacyGrant,
    }),
    requestSource: request.requestSource,
    ...(request.roomyDescription === true && {
      roomyDescription: true,
    }),
    hasExternalRacer: request.hasExternalRacer ?? false,
    ...(request.networkAllowListHonoured === true && {
      networkAllowHosts: getCommandNetworkLists(request.input)?.allow.map(stripNonPrintable),
    }),
  };
}
//@ chunk-g4tsxwy3.js:10179-10813 placement
function permissionRequestOrigin(context) {
  if (context.forRemoteExecution === true)
    return {
      type: "remote-agent",
    };
  let hookCallerOf = getHookCallerOf(context);
  if (hookCallerOf !== undefined)
    return {
      type: "plugin",
      pluginName: hookCallerOf,
    };
  if (isHookOrPluginSteered(context))
    return {
      type: "plugin",
    };
  let context_2 =
    isSubagentContext(context.agentContext) && context.agentContext.isAsync === true
      ? {
          stoppableByKillAgents: true,
        }
      : {};
  let spawnedByWorkflowRunId = context.spawnedByWorkflowRunId;
  if (spawnedByWorkflowRunId !== undefined)
    return {
      type: "workflow-agent",
      workflowName: Object.values(context.taskRegistry.all()).find(
        (state) => state.type === "local_workflow" && state.workflowRunId === spawnedByWorkflowRunId,
      )?.workflowName,
      ...context_2,
    };
  let agentContext = context.agentContext;
  if (agentContext.agentType === "teammate")
    return {
      type: "subagent",
      agentName: agentContext.agentName,
    };
  if (isSubagentContext(agentContext) && isNonMainSessionSubagent(agentContext))
    return {
      type: "subagent",
      agentName: agentContext.displayName ?? agentContext.subagentName,
      ...context_2,
    };
  return;
}
//@ chunk-g4tsxwy3.js:10813-11313 placement
/**
 * 构造 Chrome 权限卡片载荷：host/url（缺省从 input.url 解析）、域名是否已允许、auto 模式不可用提示、动词短语。
 */
function buildChromePermissionPayload(request) {
  let permissionPromptPayload = buildPermissionPromptPayload(request);
  let chrome = request.permissionResult.metadata?.command?.chrome;
  let chromeInfo = chrome
    ? {
        host: chrome.host,
        url: chrome.url,
      }
    : undefined;
  let isDomainAllowed = chrome?.domainAllowed === true;
  let decisionReason = request.permissionResult.decisionReason;
  let domainAllowed =
    isDomainAllowed &&
    chrome?.classifierUnavailable === true &&
    decisionReason?.type === "other" &&
    request.permissionResult.matchedAskRule === undefined &&
    !permissionPromptPayload.isAskCappedByOrg;
  if (!chromeInfo && typeof request.input.url === "string")
    try {
      let url = new URL(request.input.url);
      if (url.host)
        chromeInfo = {
          host: url.host,
          url: url.href,
        };
    } catch {}
  return {
    ...permissionPromptPayload,
    chrome: chromeInfo,
    domainAllowed: isDomainAllowed,
    grantNotice: domainAllowed ? getAutoModeGrantBlockCause() : undefined,
    verbPhrase: describeBrowserToolAction(request.tool.name, request.input),
  };
}
//@ chunk-g4tsxwy3.js:11313-11758 placement
/**
 * 读取 auto 模式不可用原因并转换为 {cause, files, startup, model} 结构供提示文案使用。
 */
function getAutoModeGrantBlockCause() {
  switch (getAutoModeUnavailableReason()) {
    case "settings": {
      let disableAutoModeSettingSources = getDisableAutoModeSettingSources();
      if (disableAutoModeSettingSources.includes("policySettings"))
        return {
          cause: isAutoModeDisabledByPolicySettings() ? "organization" : "managed-settings",
        };
      return {
        cause: "settings",
        files: disableAutoModeSettingSources.flatMap((disableAutoModeSettingSource) => {
          if (disableAutoModeSettingSource === "flagSettings") return [];
          let settingsFilePathForSource = getSettingsFilePathForSource(disableAutoModeSettingSource);
          return settingsFilePathForSource === undefined ? [] : [settingsFilePathForSource];
        }),
        startup: disableAutoModeSettingSources.includes("flagSettings"),
      };
    }
    case "model":
      return {
        cause: "model",
        model: renderModelName(getMainLoopModel()),
      };
    case "fast-mode":
      return {
        cause: "fast-mode",
      };
    case "circuit-breaker":
    case null:
      return {
        cause: "unavailable",
      };
  }
}
//@ chunk-g4tsxwy3.js:11758-11888 placement
/**
 * 构建 WebFetch 权限卡片数据：在通用载荷上附加目标 URL 的主机名。
 */
function buildWebFetchPermissionPayload(request) {
  let permissionPromptPayload = buildPermissionPromptPayload(request);
  let url = request.input.url;
  let hostname = "";
  if (typeof url === "string")
    try {
      hostname = new URL(url).hostname;
    } catch {
      hostname = "";
    }
  return {
    ...permissionPromptPayload,
    hostname,
  };
}
//@ chunk-g4tsxwy3.js:11888-12174 placement
/**
 * 构建 AskUserQuestion 权限卡片数据：问题列表、来源元数据，以及是否为引擎强制确认。
 */
function buildAskUserQuestionPayload(request) {
  let permissionPromptPayload = buildPermissionPromptPayload(request);
  let parsedInput = AskUserQuestionTool.inputSchema.safeParse(request.input);
  let questions = parsedInput.success ? (parsedInput.data.questions ?? []) : [];
  let metadataSource = parsedInput.success ? parsedInput.data.metadata?.source : undefined;
  let isEngineConfirm =
    request.permissionResult.forcedByCaller === true &&
    request.requestSource === undefined &&
    isAuthedLinkText(request.toolUseID);
  return {
    ...permissionPromptPayload,
    questions,
    metadataSource,
    isEngineConfirm,
  };
}
//@ chunk-g4tsxwy3.js:12174-12274 placement
function serializeMcpArgsDisplay(input) {
  if (!("args" in input) || input.args === undefined) return;
  return serializeApprovalPayload(input.args, {
    scrub: "key",
    maxUnits: MAX_PAYLOAD_UNITS,
  });
}
//@ chunk-g4tsxwy3.js:12274-12983 placement
/**
 * 构造 Monitor 权限卡片载荷：命令、MCP 服务器/工具/参数、WebSocket url 与子协议（不可显示的标记 withheld）、轮询间隔与描述。
 */
function buildMonitorPermissionPayload(request) {
  let permissionPromptPayload = buildPermissionPromptPayload(request);
  let command =
    typeof request.input.command === "string"
      ? serializeApprovalPayload(request.input.command, {
          maxUnits: MAX_PAYLOAD_UNITS,
        })
      : undefined;
  let stringField = readStringField(request.input.mcp, "server");
  let stringField_2 = readStringField(request.input.mcp, "tool");
  let mcp =
    stringField !== undefined && stringField_2 !== undefined
      ? {
          server: sanitizeCardText(stringField, "(unnamed server)"),
          tool: sanitizeCardText(stringField_2, "(unnamed tool)"),
          argsDisplay: serializeMcpArgsDisplay(request.input.mcp),
        }
      : undefined;
  let stringField_3 = readStringField(request.input.ws, "url");
  let protocols = websocketSubprotocols(request.input.ws);
  let ws =
    stringField_3 !== undefined
      ? {
          url: serializeApprovalPayload(normalizeUrlHref(stringField_3), {
            maxUnits: MAX_PAYLOAD_UNITS,
          }),
          protocols: protocols?.map((protocol, index) =>
            index < MAX_QUOTED_ITEMS
              ? replaceLineBreaks(sanitizeForDisplay(truncateToLength(protocol, MAX_RAW_DISPLAY_CHARS)))
              : "",
          ),
          protocolsWithheld: protocols?.slice(0, MAX_QUOTED_ITEMS).some((protocol) => {
            let clippedProtocol = truncateToLength(protocol, MAX_RAW_DISPLAY_CHARS);
            return markBrokenSequences(clippedProtocol) !== clippedProtocol;
          }),
        }
      : undefined;
  let intervalMs = typeof request.input.interval_ms === "number" ? request.input.interval_ms : 30000;
  let monitorDescription =
    typeof request.input.description === "string" ? displayField(request.input.description).text : undefined;
  return {
    ...permissionPromptPayload,
    command,
    mcp,
    ws,
    intervalMs,
    monitorDescription,
  };
}
//@ chunk-g4tsxwy3.js:12983-13067 placement
function sanitizeCardText(stringField, fallback) {
  let trimmed = replaceLineBreaks(renderableText(truncateToLength(stringField, MAX_RAW_DISPLAY_CHARS)))
    .replace(/\s+/g, " ")
    .trim();
  return isCleanText(trimmed) ? trimmed : fallback;
}
//@ chunk-g4tsxwy3.js:13067-13182 placement
function readStringField(record, key) {
  if (record === null || typeof record !== "object" || !(key in record)) return;
  let value = record[key];
  return typeof value === "string" ? value : undefined;
}
//@ chunk-g4tsxwy3.js:13182-13241 placement
/**
 * 函数 normalizeUrlHref（URL 规范化，失败原样返回）。
 */
function normalizeUrlHref(url) {
  try {
    return new URL(url).href;
  } catch {
    return url;
  }
}
//@ chunk-g4tsxwy3.js:13241-13844 placement
/**
 * 构造 Workflow 权限卡片载荷：脚本（runId 时取渲染文本）、脚本是否被伪造为非字符串、工作流名、参数。
 */
function buildWorkflowPermissionPayload(request) {
  let permissionPromptPayload = buildPermissionPromptPayload(request);
  let isInlineScript = typeof request.input.runId === "string" && typeof request.input.script !== "string";
  let script =
    typeof request.input.script === "string"
      ? request.input.script
      : isInlineScript && typeof permissionPromptPayload.renderedToolUseMessage === "string"
        ? permissionPromptPayload.renderedToolUseMessage
        : "";
  let scriptForged = request.input.script !== undefined && typeof request.input.script !== "string";
  let workflowName =
    typeof request.input.name === "string" &&
    request.input.name !== "" &&
    !request.input.scriptPath &&
    stripNonPrintable(request.input.name) === request.input.name
      ? request.input.name
      : undefined;
  let renderedToolUseMessage =
    typeof permissionPromptPayload.renderedToolUseMessage === "string"
      ? stripNonPrintable(permissionPromptPayload.renderedToolUseMessage)
      : permissionPromptPayload.renderedToolUseMessage;
  let args = request.input.args;
  return {
    ...permissionPromptPayload,
    renderedToolUseMessage,
    script,
    scriptForged,
    workflowName,
    args,
  };
}
//@ chunk-g4tsxwy3.js:13844-14664 placement
/**
 * 构造 Artifact 权限卡片载荷：文件路径、标题与选项（过滤并安全化）、文件内容预览（网络路径/过大/不存在/读错误给出占位）。
 */
function buildArtifactPermissionPayload(request) {
  let permissionPromptPayload = buildPermissionPromptPayload(request);
  let filePath = typeof request.input.filePath === "string" ? request.input.filePath : "";
  let title = typeof request.input.title === "string" ? request.input.title : "";
  let artifactTitle = hasNoVisibleText(title) ? "" : safeLabel(title);
  let artifactOptions = (Array.isArray(request.input.options) ? request.input.options : [])
    .filter(
      (payload) =>
        payload !== null &&
        typeof payload === "object" &&
        "label" in payload &&
        typeof payload.label === "string" &&
        "description" in payload &&
        typeof payload.description === "string" &&
        "value" in payload &&
        typeof payload.value === "string",
    )
    .map((result) => ({
      label: hasNoVisibleText(result.label) ? "" : safeLabel(result.label),
      description: displayField(result.description).text,
      value: result.value,
    }));
  let warning;
  let notPreviewed = false;
  if (isUntouchableSpelling(filePath) || isNetworkOrSpecialPath(filePath)) {
    warning = `(Network path \u2014 content not previewed: ${filePath})`;
    notPreviewed = true;
  } else
    try {
      warning = readFileSync(filePath, BOUNDED_READ_MAX);
    } catch (error) {
      if (isFileTooLargeError(error)) warning = `(Artifact too large for preview: ${filePath})`;
      else
        warning = isENOENT(error)
          ? `(File not found: ${filePath})`
          : `(Error reading file: ${String(error)})`;
      notPreviewed = true;
    }
  return {
    ...permissionPromptPayload,
    filePath,
    artifactTitle,
    artifactOptions,
    fileContent: warning,
    contentWithheld: notPreviewed,
  };
}
//@ chunk-g4tsxwy3.js:14664-15167 placement
/**
 * 构造 Skill 权限卡片载荷：技能名（input.skill 或元数据命令名）、描述、转发的 MCP 技能名。
 */
function buildSkillPermissionPayload(request) {
  let permissionPromptPayload = buildPermissionPromptPayload(request);
  let metadata = request.permissionResult.metadata;
  let command =
    metadata !== null &&
    typeof metadata === "object" &&
    "command" in metadata &&
    metadata.command !== null &&
    typeof metadata.command === "object"
      ? metadata.command
      : undefined;
  let skillMetadata = command !== undefined && typeof command.name === "string" ? command.name : undefined;
  let skillDescription =
    command !== undefined && typeof command.description === "string"
      ? command.description
      : request.forwardedMcpSkill?.description;
  let skill =
    (typeof request.input.skill === "string" ? request.input.skill : undefined) ?? skillMetadata ?? "";
  return {
    ...permissionPromptPayload,
    skill,
    skillDescription,
    ...(request.forwardedMcpSkill !== undefined && {
      forwardedMcpSkill: {
        name: request.forwardedMcpSkill.name,
      },
    }),
  };
}
//@ chunk-g4tsxwy3.js:15167-15428 placement
/**
 * 构建 PowerShell 权限卡片数据：清理不可打印字符后的命令（有长度上限）与渲染的工具消息。
 */
function buildPowerShellPermissionPayload(request) {
  let permissionPromptPayload = buildPermissionPromptPayload(request);
  let command =
    typeof request.input.command === "string" && request.input.command.length <= MAX_PAYLOAD_UNITS
      ? stripNonPrintable(request.input.command)
      : "";
  let renderedToolUseMessage =
    typeof permissionPromptPayload.renderedToolUseMessage === "string"
      ? stripNonPrintable(permissionPromptPayload.renderedToolUseMessage)
      : permissionPromptPayload.renderedToolUseMessage;
  return {
    ...permissionPromptPayload,
    renderedToolUseMessage,
    command,
  };
}
//@ chunk-g4tsxwy3.js:15428-15799 placement
/**
 * 构造 ExitPlanMode 权限卡片载荷：当前计划、计划文件路径、本条助手消息的 token 用量。
 */
function buildExitPlanModePermissionPayload(request) {
  let permissionPromptPayload = buildPermissionPromptPayload(request);
  let planFilePath = getPlanFilePath();
  notePlanFileForgotten(planFilePath);
  let plan = getPlan() ?? "";
  let usage =
    request.assistantMessage.isUnmetered === true ? undefined : request.assistantMessage.message.usage;
  let usage_2;
  if (usage && typeof usage.input_tokens === "number") {
    let tokenCountFromUsage = getTokenCountFromUsage_2(usage);
    usage_2 = {
      input_tokens: tokenCountFromUsage.input_tokens,
      cache_creation_input_tokens: tokenCountFromUsage.cache_creation_input_tokens,
      cache_read_input_tokens: tokenCountFromUsage.cache_read_input_tokens,
    };
  }
  return {
    ...permissionPromptPayload,
    plan,
    planFilePath,
    usage: usage_2,
  };
}
//@ chunk-g4tsxwy3.js:15799-16124 placement
/**
 * 构造 Bash 权限卡片载荷：命令（过长置空、去不可打印字符）、分类器状态、已有允许规则描述。
 */
function buildBashPermissionPayload(request) {
  let permissionPromptPayload = buildPermissionPromptPayload(request);
  let command =
    typeof request.input.command === "string" && request.input.command.length <= MAX_PAYLOAD_UNITS
      ? stripNonPrintable(request.input.command)
      : "";
  let renderedToolUseMessage =
    typeof permissionPromptPayload.renderedToolUseMessage === "string"
      ? stripNonPrintable(permissionPromptPayload.renderedToolUseMessage)
      : permissionPromptPayload.renderedToolUseMessage;
  return {
    ...permissionPromptPayload,
    renderedToolUseMessage,
    command,
    classifierState: request.classifierState,
    existingAllowDescriptions: [],
  };
}
//@ chunk-g4tsxwy3.js:16124-16410 placement
var buildPublishPluginCard = (question) => ({
  question: indentedPrintableName(question.title),
  lines: [
    `Folder: ${printableOrEmpty(question.folder)}`,
    `Sends ${question.sends.files} ${plural(question.sends.files, "file")}, ` +
      formatFileSize(question.sends.bytes),
    ...question.warnings,
    ...staysOnMachineLines(question.staying),
    ...question.steps,
    ...manifestWriteLines(question.writes),
  ].map(indentedPrintableName),
  values: question.files
    .map(fileEntryLine)
    .concat(moreFilesNote(question.unnamed?.files ?? 0, "file"))
    .map(indentedPrintableName),
});
//@ chunk-g4tsxwy3.js:16410-16601 placement
/**
 * 构建发布插件权限卡片数据：卡片内容与全部条目（优先取会话缓存，否则从输入问题解析）。
 */
function buildPublishPluginPayload(request) {
  let stashedQuestion = request.session && sessionScopedMapsSlot.of(request.session).get(request.toolUseID);
  let question = PUBLISH_PLUGIN_INPUT_SCHEMA().safeParse(request.input).data?.question;
  return {
    ...buildPermissionPromptPayload(request),
    card: stashedQuestion?.card ?? (question && buildPublishPluginCard(question)),
    everything: stashedQuestion?.everything ?? (question ? manifestEntryLines(question) : []),
  };
}
//@ chunk-g4tsxwy3.js:16601-16611 placement
/**
 * 导出值：MAX_CARD_ACTIONS（6：权限卡动作上限）。
 */
var MAX_CARD_ACTIONS = 6;
//@ chunk-g4tsxwy3.js:16611-16622 placement
var CHROME_ROWS = 14;
//@ chunk-g4tsxwy3.js:16622-16908 placement
var PUBLISH_PLUGIN_PERMISSION_CARD; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g4tsxwy3.js:16622", () => {
  PUBLISH_PLUGIN_PERMISSION_CARD = withHideWhile({
    kind: "permission_publish_plugin",
    payload: DoctorLazy(() =>
      deepFreezeToolName(
        (payload) =>
          typeof payload === "object" &&
          payload !== null &&
          "requestId" in payload &&
          "toolName" in payload &&
          "permissionResult" in payload &&
          "everything" in payload,
      ),
    ),
    result: DoctorLazy(() =>
      deepFreezeToolName((result) => typeof result === "object" && result !== null && "behavior" in result),
    ),
    default: {
      behavior: "cancelled",
    },
  });
});
//@ chunk-g4tsxwy3.js:16908-16919 placement
var LIST_CHROME_ROWS = 10;
//@ chunk-g4tsxwy3.js:16919-16930 placement
var LIST_GUTTER = 10;
//@ chunk-g4tsxwy3.js:16930-16940 placement
var MIN_LIST_ROWS = 5;
//@ chunk-g4tsxwy3.js:16940-17018 placement
var PUBLISH_WAITING_MESSAGE = "Claude Code is waiting for your answer before it publishes a plugin";
//@ chunk-g4tsxwy3.js:17018-17301 placement
var EXIT_PLAN_MODE_V2_PERMISSION_CARD; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g4tsxwy3.js:17018", () => {
  EXIT_PLAN_MODE_V2_PERMISSION_CARD = withHideWhile({
    kind: "permission_exit_plan_mode_v2",
    payload: DoctorLazy(() =>
      deepFreezeToolName(
        (payload) =>
          typeof payload === "object" &&
          payload !== null &&
          "requestId" in payload &&
          "toolName" in payload &&
          "permissionResult" in payload &&
          "plan" in payload,
      ),
    ),
    result: DoctorLazy(() =>
      deepFreezeToolName((result) => typeof result === "object" && result !== null && "behavior" in result),
    ),
    default: {
      behavior: "cancelled",
    },
  });
});
//@ chunk-g4tsxwy3.js:17301-17598 placement
var FILE_PERMISSION_CARD; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g4tsxwy3.js:17301", () => {
  FILE_PERMISSION_CARD = withHideWhile({
    kind: "permission_file",
    payload: DoctorLazy(() =>
      deepFreezeToolName(
        (payload) =>
          typeof payload === "object" &&
          payload !== null &&
          "requestId" in payload &&
          "toolName" in payload &&
          "permissionResult" in payload &&
          "filePath" in payload &&
          "operationType" in payload,
      ),
    ),
    result: DoctorLazy(() =>
      deepFreezeToolName((result) => typeof result === "object" && result !== null && "behavior" in result),
    ),
    default: {
      behavior: "cancelled",
    },
  });
});
//@ chunk-g4tsxwy3.js:17658-18037 placement
var OUTSIDE_READS_TITLE = "Read outside the working directories";
var OUTSIDE_READ_TITLE = "Allow this read outside the working directories?";
var OUTSIDE_READ_ACTIONS = ["allow", "block", "ask_again", "allow_once"];
var OUTSIDE_READ_ACTION_LABELS = {
  allow: "Yes, and keep allowing any reads outside the working directories",
  block: "No, and block reads outside the working directories from now on",
  ask_again: "No, and ask again next time",
  allow_once: "Yes, but ask again next time",
};
//@ chunk-g4tsxwy3.js:18037-18795 placement
/**
 * 工作目录外读取对话框的说明文字，按沙箱是否能隔离 home 目录给出不同提示。
 */
function getOutsideReadsExplainer(explainer) {
  return (
    "Auto mode and the sandbox read outside the working directories without asking. Yes or No answers for this read; the rest is for later reads. Block: the file tools refuse reads outside the working directories in every project. " +
    (explainer
      ? "Sandboxed commands lose your home directory (SSH keys, home-installed tools) until you re-open paths with sandbox.filesystem.allowRead."
      : "The sandbox doesn't enforce it on this machine (off, filesystem rules relaxed, managed read-path lock on, or working directory name has glob characters). Auto mode asks before each shell command it can't check.") +
    " To undo, remove permissions.blockReadsOutsideWorkingDirectories from your user settings; file tools follow next session, sandboxed commands at once."
  );
}
//@ chunk-g4tsxwy3.js:18795-18996 placement
var AUTO_MODE_OUTSIDE_READS_DIALOG; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g4tsxwy3.js:18795", () => {
  AUTO_MODE_OUTSIDE_READS_DIALOG = withHideWhile({
    kind: "auto_mode_outside_reads",
    payload: DoctorLazy(() =>
      objectSchema({
        toolName: stringSchema(),
        path: stringSchema(),
        title: stringSchema(),
        question: stringSchema(),
        explainer: stringSchema(),
        options: array(
          objectSchema({
            value: _enum(OUTSIDE_READ_ACTIONS),
            label: stringSchema(),
          }),
        ),
      }),
    ),
    result: DoctorLazy(() => _enum(OUTSIDE_READ_ACTIONS)),
    default: "ask_again",
  });
});
//@ chunk-g4tsxwy3.js:18996-19155 placement
/**
 * 构建"读取工作区外文件"对话框数据：标题、问题、说明（区分沙箱隔离）与选项。
 */
function buildOutsideReadsDialog({ toolName, path, sandboxFenced }) {
  return {
    toolName,
    path,
    title: OUTSIDE_READS_TITLE,
    question: OUTSIDE_READ_TITLE,
    explainer: getOutsideReadsExplainer(sandboxFenced),
    options: OUTSIDE_READ_ACTIONS.map((action) => ({
      value: action,
      label: OUTSIDE_READ_ACTION_LABELS[action],
    })),
  };
}
//@ chunk-g4tsxwy3.js:19155-19169 placement
var MAX_CARD_INPUT_CHARS = 200000;
//@ chunk-g4tsxwy3.js:19169-19271 placement
/**
 * 判断工具是否为文件类工具（编辑、写入、Notebook、Glob、Grep、读取）。
 */
function isFileTool(tool) {
  switch (tool) {
    case FileEditTool:
    case FileWriteTool:
    case NotebookEditTool:
    case GlobTool:
    case GrepTool:
    case FileReadTool:
      return true;
    default:
      return false;
  }
}
//@ chunk-g4tsxwy3.js:19271-19349 placement
/**
 * 函数 isAutoDenyKind（这几类默认拒绝）。
 */
function isAutoDenyKind(tool) {
  switch (tool) {
    case FileEditTool:
    case FileWriteTool:
    case NotebookEditTool:
      return true;
    default:
      return false;
  }
}
//@ chunk-g4tsxwy3.js:19349-19504 placement
/**
 * 调用工具的 getPath 获取输入中的路径，非空字符串时返回，出错返回 null。
 */
function getToolInputPath(tool, input) {
  try {
    let toolInfo = tool;
    if (typeof toolInfo.getPath !== "function") return null;
    let path = toolInfo.getPath(input);
    return typeof path === "string" && path !== "" ? path : null;
  } catch {
    return null;
  }
}
//@ chunk-g4tsxwy3.js:19504-19749 placement
function resolveSymlinkTarget(filePath, blocked, blockedPath) {
  if (blocked)
    return {
      target: null,
      unchecked: false,
    };
  if (blockedPath !== undefined)
    return {
      target: blockedPath,
      unchecked: false,
    };
  try {
    let pathsToCheck = walkPermissionCheckPaths(expandPath(filePath));
    if (pathsToCheck.unresolved)
      return {
        target: null,
        unchecked: true,
      };
    return {
      target: symlinkLanding(pathsToCheck),
      unchecked: false,
    };
  } catch {
    return {
      target: null,
      unchecked: true,
    };
  }
}
//@ chunk-g4tsxwy3.js:19749-19792 placement
function safeRelativeDisplay(filePath, suspicious) {
  return stripInvisibleChars(suspicious ? filePath : relative(getCwd(), filePath));
}
//@ chunk-g4tsxwy3.js:19792-19843 placement
function basenameOrPath(filePath, suspicious) {
  return stripInvisibleChars(suspicious ? posix.basename(filePath) : basename(filePath));
}
//@ chunk-g4tsxwy3.js:19843-24691 placement
/**
 * 为 Edit/Write/NotebookEdit 等文件工具构造权限卡片：标题、文件名问题、diff 或占位说明；内容过大、含可疑字符、网络路径、远程不可读时标记 contentWithheld（仅一次性批准）。
 */
async function buildFileToolPermissionCard(request) {
  let { tool: parsed, input: tooLarge, remoteWorkspace: suspicious, remoteOldContent: withheld } = request;
  if (parsed === FileEditTool) {
    let editInput = FileEditTool.inputSchema.parse(tooLarge);
    let isTooLarge =
      editInput.old_string.length > MAX_CARD_INPUT_CHARS ||
      editInput.new_string.length > MAX_CARD_INPUT_CHARS;
    let isSuspicious =
      !isTooLarge && (hasSuspiciousText(editInput.old_string) || hasSuspiciousText(editInput.new_string));
    let contentWithheld = isTooLarge || isSuspicious;
    return {
      title: "Edit file",
      subtitle: safeRelativeDisplay(editInput.file_path, suspicious),
      question: {
        kind: "file-action",
        verbPhrase: "make this edit to",
        fileName: basenameOrPath(editInput.file_path, suspicious),
      },
      content: isTooLarge
        ? {
            kind: "no-changes",
            message:
              "Proposed edit is too large to show \u2014 cannot be reviewed, so approval is one-time only (deny unless expected).",
          }
        : isSuspicious
          ? {
              kind: "no-changes",
              message:
                "Proposed edit cannot be shown in full \u2014 cannot be reviewed, so approval is one-time only (deny unless expected).",
            }
          : {
              kind: "file-edit-diff",
              filePath: editInput.file_path,
              edits: [
                {
                  old_string: editInput.old_string,
                  new_string: editInput.new_string,
                  replace_all: editInput.replace_all || false,
                },
              ],
              remoteOldContent: withheld ?? undefined,
              skipLocalRead: suspicious,
            },
      contentWithheld,
    };
  }
  if (parsed === FileWriteTool) {
    let writeInput = FileWriteTool.inputSchema.parse(tooLarge);
    let oldContent = "";
    let fileExists = false;
    let cannotPreview = false;
    let title;
    let verbPhrase;
    if (suspicious) {
      if (typeof withheld === "string") {
        oldContent = withheld;
        fileExists = true;
        title = "Overwrite file";
        verbPhrase = "overwrite";
      } else if (withheld === null) {
        title = "Create file";
        verbPhrase = "create";
      } else {
        title = "Write file";
        verbPhrase = "write to";
        cannotPreview = true;
      }
    } else {
      let isNetworkPath =
        isNonWslUncPath(writeInput.file_path) || isNetworkOrSpecialPath(writeInput.file_path);
      if (!isNetworkPath)
        try {
          oldContent = stripBom((await readFileChecked(writeInput.file_path, BOUNDED_READ_MAX)).content);
          fileExists = true;
        } catch (error) {
          if (isFileTooLargeError(error)) {
            fileExists = true;
            cannotPreview = true;
          } else if (!isENOENT(error) && !isNotRegularFileError(error)) throw error;
        }
      if (isNetworkPath) {
        cannotPreview = true;
        title = "Write file";
        verbPhrase = "write to";
      } else {
        title = fileExists ? "Overwrite file" : "Create file";
        verbPhrase = fileExists ? "overwrite" : "create";
      }
    }
    let contentTooLarge = writeInput.content.length > MAX_CARD_INPUT_CHARS;
    let contentSuspicious = !contentTooLarge && hasSuspiciousText(writeInput.content);
    let contentWithheldInput = contentTooLarge || contentSuspicious;
    let oldContentBroken = fileExists && hasBrokenSequences(oldContent);
    let oldContentSuspicious = fileExists && !oldContentBroken && hasSuspiciousText(oldContent);
    let contentWithheld = contentWithheldInput || cannotPreview || oldContentBroken || oldContentSuspicious;
    return {
      title,
      subtitle: safeRelativeDisplay(writeInput.file_path, suspicious),
      question: {
        kind: "file-action",
        verbPhrase,
        fileName: basenameOrPath(writeInput.file_path, suspicious),
      },
      content: contentTooLarge
        ? {
            kind: "no-changes",
            message:
              "Proposed content is too large to show \u2014 cannot be reviewed, so approval is one-time only (deny unless expected).",
          }
        : contentSuspicious
          ? {
              kind: "no-changes",
              message:
                "Proposed content cannot be shown in full \u2014 cannot be reviewed, so approval is one-time only (deny unless expected).",
            }
          : cannotPreview
            ? {
                kind: "no-changes",
                message: fileExists
                  ? `Existing file is too large to preview \u2014 approving will overwrite ${stripInvisibleChars(writeInput.file_path)}.`
                  : suspicious
                    ? `The remote file could not be checked \u2014 approving will write to ${stripInvisibleChars(writeInput.file_path)}.`
                    : `File may be on a network path, so it was not previewed \u2014 approving will write to ${stripInvisibleChars(writeInput.file_path)}.`,
              }
            : oldContentBroken
              ? {
                  kind: "no-changes",
                  message: `Current contents of ${stripInvisibleChars(writeInput.file_path)} cannot be shown in full \u2014 the overwrite cannot be reviewed, so approval is one-time only (deny unless expected).`,
                }
              : {
                  kind: "file-write-diff",
                  filePath: writeInput.file_path,
                  content: writeInput.content,
                  fileExists,
                  oldContent,
                  ...(oldContentSuspicious && {
                    notice: `Current contents of ${stripInvisibleChars(writeInput.file_path)} cannot be shown in full \u2014 the overwrite cannot be fully reviewed, so approval is one-time only (deny unless expected).`,
                  }),
                },
      contentWithheld,
    };
  }
  if (parsed === NotebookEditTool) {
    let notebookInput = NotebookEditTool.inputSchema.parse(tooLarge);
    let verbPhrase =
      notebookInput.edit_mode === "insert"
        ? "insert this cell into"
        : notebookInput.edit_mode === "delete"
          ? "delete this cell from"
          : "make this edit to";
    let newSourceWithheld =
      (notebookInput.new_source?.length ?? 0) > MAX_CARD_INPUT_CHARS ||
      hasSuspiciousText(notebookInput.new_source ?? "");
    let needsCurrentSource = notebookInput.edit_mode !== "insert";
    let oldCellSource;
    let previewProblem;
    if (needsCurrentSource)
      if (suspicious) {
        if (typeof withheld === "string") {
          let notebookCellSource = findNotebookCellSource(withheld, notebookInput.cell_id);
          if (notebookCellSource.kind === "found") {
            if (
              notebookCellSource.source.length > MAX_CARD_INPUT_CHARS ||
              hasSuspiciousText(notebookCellSource.source)
            )
              previewProblem = "the current cell contents cannot be shown in full";
            else oldCellSource = notebookCellSource.source;
          } else
            previewProblem =
              notebookCellSource.kind === "unparsable"
                ? "the notebook could not be parsed for preview"
                : "the target cell was not found in the notebook";
        } else if (withheld === null) previewProblem = "the notebook was not found in the remote workspace";
        else previewProblem = "the remote notebook could not be fetched";
      } else if (
        isNonWslUncPath(notebookInput.notebook_path) ||
        isNetworkOrSpecialPath(notebookInput.notebook_path)
      )
        previewProblem = "the notebook may be on a network path";
      else
        try {
          if (!(await getFsImplementation().stat(notebookInput.notebook_path)).isFile())
            previewProblem = "the notebook could not be read";
          else {
            let fileBytes = await getFsImplementation().readFileBytes(
              notebookInput.notebook_path,
              MAX_NOTEBOOK_BYTES + 1,
            );
            if (fileBytes.length > MAX_NOTEBOOK_BYTES)
              previewProblem = "the notebook is too large to preview";
            else {
              let notebookCellSource = findNotebookCellSource(
                fileBytes.toString("utf-8"),
                notebookInput.cell_id,
              );
              if (notebookCellSource.kind === "found") {
                if (
                  notebookCellSource.source.length > MAX_CARD_INPUT_CHARS ||
                  hasSuspiciousText(notebookCellSource.source)
                )
                  previewProblem = "the current cell contents cannot be shown in full";
                else oldCellSource = notebookCellSource.source;
              } else
                previewProblem =
                  notebookCellSource.kind === "unparsable"
                    ? "the notebook could not be parsed for preview"
                    : "the target cell was not found in the notebook";
            }
          }
        } catch {
          previewProblem = "the notebook could not be read";
        }
    let contentWithheld = newSourceWithheld || previewProblem !== undefined;
    return {
      title: "Edit notebook",
      subtitle: undefined,
      question: {
        kind: "file-action",
        verbPhrase,
        fileName: basenameOrPath(notebookInput.notebook_path, suspicious),
      },
      content: newSourceWithheld
        ? {
            kind: "no-changes",
            message:
              "Proposed cell content is too large to show \u2014 cannot be reviewed, so approval is one-time only (deny unless expected).",
          }
        : previewProblem !== undefined
          ? {
              kind: "no-changes",
              message: `Current cell contents cannot be shown (${previewProblem}) \u2014 the ${notebookInput.edit_mode === "delete" ? "deletion" : "edit"} cannot be reviewed, so approval is one-time only (deny unless expected).`,
            }
          : {
              kind: "notebook-edit-diff",
              notebookPath: notebookInput.notebook_path,
              cellId: notebookInput.cell_id,
              newSource: notebookInput.new_source,
              cellType: notebookInput.cell_type,
              editMode: notebookInput.edit_mode,
              remoteOldContent: withheld ?? undefined,
              skipLocalRead: suspicious,
              oldCellSource,
            },
      contentWithheld,
    };
  }
  return {
    title: `${parsed.isReadOnly(tooLarge) ? "Read" : "Edit"} file`,
    subtitle: undefined,
    question: {
      kind: "plain",
      text: "Do you want to proceed?",
    },
    content: {
      kind: "tool-use-line",
    },
  };
}
//@ chunk-g4tsxwy3.js:24691-25426 placement
async function buildFilePermissionDescriptor(request) {
  let permissionPromptPayload = buildPermissionPromptPayload(request);
  let tool = request.tool;
  if (!isFileTool(tool))
    throw Error(`buildFilePermissionDescriptor called with non-file tool: ${request.tool.name}`);
  let filePath = request.remoteWorkspace === true;
  let fileContent = tool.isReadOnly(request.input) ? "read" : "write";
  let { title, subtitle, question, content, contentWithheld } = await buildFileToolPermissionCard({
    tool,
    input: request.input,
    remoteWorkspace: filePath,
    remoteOldContent: request.remoteOldContent,
  });
  let symlinkTarget = resolveSymlinkTarget(request.filePath, filePath, request.permissionResult.blockedPath);
  let offersBlockOutsideReads = request.permissionResult.offersBlockOutsideReads;
  let operation =
    fileContent === "write" &&
    !filePath &&
    (tool === FileEditTool || tool === FileWriteTool) &&
    (await labelsMemoryItem(request.filePath));
  return {
    ...permissionPromptPayload,
    ...(operation && {
      memoryItemHeader: operation,
    }),
    title: offersBlockOutsideReads ? OUTSIDE_READS_TITLE : title,
    subtitle,
    question: offersBlockOutsideReads
      ? {
          kind: "plain",
          text: OUTSIDE_READ_TITLE,
        }
      : question,
    content,
    contentWithheld,
    filePath: request.filePath,
    operationType: fileContent,
    symlinkTarget: symlinkTarget.target,
    ...(symlinkTarget.unchecked && {
      symlinkUnchecked: true,
    }),
  };
}
//@ chunk-g4tsxwy3.js:25426-25777 placement
/**
 * 按工具类型返回权限卡片遥测用的补全类型与语言：编辑为 str_replace_single、写入为 write_file_single、Notebook 按单元类型取 markdown/python，其他为 tool_use_single。
 */
function getCompletionTypeForTool(tool, notebook, toolInputPath) {
  if (tool === FileEditTool)
    return {
      completion_type: "str_replace_single",
      language_name: languageForFilePath(toolInputPath),
    };
  if (tool === FileWriteTool)
    return {
      completion_type: "write_file_single",
      language_name: languageForFilePath(toolInputPath),
    };
  if (tool === NotebookEditTool)
    return {
      completion_type: "tool_use_single",
      language_name: notebook.cell_type === "markdown" ? lit("markdown") : lit("python"),
    };
  return {
    completion_type: "tool_use_single",
    language_name: languageForFilePath(toolInputPath),
  };
}
//@ chunk-g4tsxwy3.js:25777-26056 placement
var MONITOR_PERMISSION_CARD; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g4tsxwy3.js:25777", () => {
  MONITOR_PERMISSION_CARD = withHideWhile({
    kind: "permission_monitor",
    payload: DoctorLazy(() =>
      deepFreezeToolName(
        (payload) =>
          typeof payload === "object" &&
          payload !== null &&
          "requestId" in payload &&
          "toolName" in payload &&
          "permissionResult" in payload &&
          "intervalMs" in payload,
      ),
    ),
    result: DoctorLazy(() =>
      deepFreezeToolName((result) => typeof result === "object" && result !== null && "behavior" in result),
    ),
    default: {
      behavior: "cancelled",
    },
  });
});
//@ chunk-g4tsxwy3.js:26056-26335 placement
var POWERSHELL_PERMISSION_CARD; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g4tsxwy3.js:26056", () => {
  POWERSHELL_PERMISSION_CARD = withHideWhile({
    kind: "permission_powershell",
    payload: DoctorLazy(() =>
      deepFreezeToolName(
        (payload) =>
          typeof payload === "object" &&
          payload !== null &&
          "requestId" in payload &&
          "toolName" in payload &&
          "permissionResult" in payload &&
          "command" in payload,
      ),
    ),
    result: DoctorLazy(() =>
      deepFreezeToolName((result) => typeof result === "object" && result !== null && "behavior" in result),
    ),
    default: {
      behavior: "cancelled",
    },
  });
});
//@ chunk-g4tsxwy3.js:26335-26607 placement
var SKILL_PERMISSION_CARD; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g4tsxwy3.js:26335", () => {
  SKILL_PERMISSION_CARD = withHideWhile({
    kind: "permission_skill",
    payload: DoctorLazy(() =>
      deepFreezeToolName(
        (payload) =>
          typeof payload === "object" &&
          payload !== null &&
          "requestId" in payload &&
          "toolName" in payload &&
          "permissionResult" in payload &&
          "skill" in payload,
      ),
    ),
    result: DoctorLazy(() =>
      deepFreezeToolName((result) => typeof result === "object" && result !== null && "behavior" in result),
    ),
    default: {
      behavior: "cancelled",
    },
  });
});
//@ chunk-g4tsxwy3.js:26607-26885 placement
var WEBFETCH_PERMISSION_CARD; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g4tsxwy3.js:26607", () => {
  WEBFETCH_PERMISSION_CARD = withHideWhile({
    kind: "permission_webfetch",
    payload: DoctorLazy(() =>
      deepFreezeToolName(
        (payload) =>
          typeof payload === "object" &&
          payload !== null &&
          "requestId" in payload &&
          "toolName" in payload &&
          "permissionResult" in payload &&
          "hostname" in payload,
      ),
    ),
    result: DoctorLazy(() =>
      deepFreezeToolName((result) => typeof result === "object" && result !== null && "behavior" in result),
    ),
    default: {
      behavior: "cancelled",
    },
  });
});
//@ chunk-g4tsxwy3.js:26885-26920 placement
var autoDenyPresenceSignal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-g4tsxwy3.js:26885", () => {
  autoDenyPresenceSignal = createLazySignal(() => uiSignals.autoDenyPresence);
});
export {
  MAX_CARD_ACTIONS,
  permissionRequestOrigin,
  buildPermissionPromptPayload,
  BROWSER_PERMISSION_CARD,
  isFileTool,
  getToolInputPath,
  buildFilePermissionDescriptor,
  FILE_PERMISSION_CARD,
  getCompletionTypeForTool,
  BASH_PERMISSION_CARD,
  buildBashPermissionPayload,
  isNotAskUserQuestionCard,
  autoDenyPresenceSignal,
  OUTSIDE_READ_ACTION_LABELS,
  normalizeUrlHref,
  isAutoDenyKind,
  ASK_USER_QUESTION_PERMISSION_CARD,
  POWERSHELL_PERMISSION_CARD,
  WEBFETCH_PERMISSION_CARD,
  SKILL_PERMISSION_CARD,
  MONITOR_PERMISSION_CARD,
  ENTER_PLAN_MODE_PERMISSION_CARD,
  EXIT_PLAN_MODE_V2_PERMISSION_CARD,
  PUBLISH_PLUGIN_PERMISSION_CARD,
  PUBLISH_WAITING_MESSAGE,
  splitQuestionTitleBody,
  describeAutoModeGrantBlock,
  getOutsideReadsExplainer,
  CHROME_ROWS,
  LIST_CHROME_ROWS,
  LIST_GUTTER,
  MIN_LIST_ROWS,
  AUTO_MODE_OUTSIDE_READS_DIALOG,
  buildOutsideReadsDialog,
  buildWebFetchPermissionPayload,
  buildChromePermissionPayload,
  buildAskUserQuestionPayload,
  buildPublishPluginPayload,
  buildExitPlanModePermissionPayload,
  buildSkillPermissionPayload,
  buildPowerShellPermissionPayload,
  buildMonitorPermissionPayload,
  buildArtifactPermissionPayload,
  buildWorkflowPermissionPayload,
};
