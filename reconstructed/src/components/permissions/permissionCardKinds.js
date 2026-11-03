/**
 * components/permissions/permissionCardKinds.ts
 *
 * 2.1.316 新增：权限卡片定义：各工具（Bash、文件、WebFetch、Monitor、PowerShell、Skill、PublishPlugin、ExitPlanMode 等）的卡片 kind 与载荷构造。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s4bxxzsw.js (58)
 * attribution: placement 57, sole-consumer 1
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
import { STRING_FORMATS } from "../../utils/mcp/elicitationValidation.js";
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
import { getTokenCountFromUsage } from "../../utils/messages/usageAndStopReason.js";
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
import { u, string, array, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-s4bxxzsw.js:4589-4877 placement
/**
 * 权限卡片注册项（qo 定义 kind + payload/result schema）：AskUserQuestion、Bash、Browser、EnterPlanMode、File、Monitor、PowerShell、Skill、WebFetch、PublishPlugin、ExitPlanMode v2 等。
 */
var ASK_USER_QUESTION_PERMISSION_CARD = withHideWhile({
  kind: "permission_ask_user_question",
  payload: DoctorLazy(() =>
    deepFreezeToolName(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "requestId" in e &&
        "toolName" in e &&
        "permissionResult" in e &&
        "questions" in e,
    ),
  ),
  result: DoctorLazy(() => deepFreezeToolName((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: {
    behavior: "cancelled",
  },
});
//@ chunk-s4bxxzsw.js:4877-4913 placement
function isNotAskUserQuestionCard(kind) {
  return kind !== ASK_USER_QUESTION_PERMISSION_CARD.kind;
}
//@ chunk-s4bxxzsw.js:4913-5211 placement
var BASH_PERMISSION_CARD = withHideWhile({
  kind: "permission_bash",
  payload: DoctorLazy(() =>
    deepFreezeToolName(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "requestId" in e &&
        "toolName" in e &&
        "permissionResult" in e &&
        "command" in e &&
        "classifierState" in e,
    ),
  ),
  result: DoctorLazy(() => deepFreezeToolName((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: {
    behavior: "cancelled",
  },
});
//@ chunk-s4bxxzsw.js:5211-6333 placement
/**
 * 解释为什么已允许的操作仍要询问：auto 模式不可用的原因（组织关闭、托管设置、设置文件 disableAutoMode、模型不支持、fast 模式、不可用）。
 */
function describeAutoModeGrantBlock(grantNotice, display) {
  let n = `${display} is allowed, but Claude asks before actions like this because they can only be approved automatically when auto mode is available, and`;
  switch (grantNotice.cause) {
    case "organization":
      return `${n} your organization has turned auto mode off.`;
    case "managed-settings":
      return `${n} auto mode is turned off in this computer's managed settings.`;
    case "settings": {
      if (grantNotice.files.length === 0 && grantNotice.startup)
        return `${n} auto mode is turned off by the disableAutoMode setting Claude Code was started with. Start Claude Code without it to change this.`;
      let s = [
        ...grantNotice.files,
        ...(grantNotice.startup ? ["the settings Claude Code was started with"] : []),
      ];
      let y = s.length === 0 ? "your settings files" : s.join(" and ");
      return `${n} auto mode is turned off by the disableAutoMode setting in ${y}. Remove it and restart Claude Code to change this.`;
    }
    case "model":
      return `${n} ${grantNotice.model} doesn't support auto mode. Switch models with /model to change this.`;
    case "fast-mode":
      return `${n} auto mode is off while fast mode is on. Run /fast off to change this.`;
    case "unavailable":
      return `${n} auto mode isn't available in this session. Restart Claude Code to check again.`;
  }
}
//@ chunk-s4bxxzsw.js:6333-6612 placement
var BROWSER_PERMISSION_CARD = withHideWhile({
  kind: "permission_browser",
  payload: DoctorLazy(() =>
    deepFreezeToolName(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "requestId" in e &&
        "toolName" in e &&
        "permissionResult" in e &&
        "verbPhrase" in e,
    ),
  ),
  result: DoctorLazy(() => deepFreezeToolName((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: {
    behavior: "cancelled",
  },
});
//@ chunk-s4bxxzsw.js:6612-6879 placement
var ENTER_PLAN_MODE_PERMISSION_CARD = withHideWhile({
  kind: "permission_enter_plan_mode",
  payload: DoctorLazy(() =>
    deepFreezeToolName(
      (e) =>
        typeof e === "object" && e !== null && "requestId" in e && "toolName" in e && "permissionResult" in e,
    ),
  ),
  result: DoctorLazy(() => deepFreezeToolName((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: {
    behavior: "cancelled",
  },
});
//@ chunk-s4bxxzsw.js:6951-7038 placement
var MARKDOWN_LINK_RE = /\[([^[\]\n]*)\]\(([^()\s]*)\)/g;
var isAuthedLinkText = (toolUseID) => typeof toolUseID === "string" && toolUseID.startsWith(CONFIRM);
//@ chunk-s4bxxzsw.js:7038-7223 placement
/**
 * 把问题文本拆成标题（第一行）与正文行列表。
 */
function splitQuestionTitleBody(question) {
  let r = truncateForDisplayText(question);
  let index = r.indexOf(`

`);
  if (index === -1)
    return {
      title: displayField(r).text,
      body: [],
    };
  let replaced = r.slice(index + 2).replace(/^\n+/, "");
  return {
    title: displayField(r.slice(0, index)).text,
    body: replaced === "" ? [] : parseFileLinkSegments(replaced),
  };
}
//@ chunk-s4bxxzsw.js:7223-7605 placement
/**
 * 把文本中的 markdown file:/// 链接拆成 text 与 fileLink 片段（只接受绝对路径的安全文件 URL）。
 */
function parseFileLinkSegments(e) {
  let r = [];
  let n = "";
  let s = 0;
  for (let y of e.matchAll(MARKDOWN_LINK_RE)) {
    let [R, C = "", D = ""] = y;
    let S = fileUrlToAbsolutePath(D);
    let k = S === null ? null : toSafeFileUrl(S);
    n += e.slice(s, y.index);
    s = y.index + R.length;
    if (S === null || k === null) {
      n += R;
      continue;
    }
    if (n !== "") {
      r.push({
        kind: "text",
        text: displayField(n).text,
      });
      n = "";
    }
    r.push({
      kind: "fileLink",
      label: displayField(C).text,
      url: k,
      path: displayField(tildify(S)).text,
    });
  }
  n += e.slice(s);
  if (n !== "")
    r.push({
      kind: "text",
      text: displayField(n).text,
    });
  return r;
}
//@ chunk-s4bxxzsw.js:7605-7715 placement
function fileUrlToAbsolutePath(e) {
  if (!/^file:\/\/\//i.test(e)) return null;
  try {
    let r = fileURLToPath(e);
    return isAbsolute(r) ? r : null;
  } catch {
    return null;
  }
}
//@ chunk-s4bxxzsw.js:7745-8009 sole-consumer = hasStringFormat (0.863)
/**
 * getParamFormatHints：工具 inputJSONSchema 中 format=date-time 的参数表，供权限 UI 提示。
 */
function getParamFormatHints(schema) {
  let properties = schema?.properties;
  if (properties === null || typeof properties !== "object" || Array.isArray(properties)) return;
  let n;
  for (let [key, value] of Object.entries(properties)) {
    if (value === null || typeof value !== "object" || !("format" in value)) continue;
    let format = value.format;
    if (typeof format === "string" && STRING_FORMATS.has(format)) {
      n ??= {};
      n[key] = format;
    }
  }
  return n;
}
//@ chunk-s4bxxzsw.js:8009-10003 placement
/**
 * buildPermissionPromptPayload：把一次权限请求整理成发给宿主/桥接 UI 的载荷（显示名、渲染后的输入、卡片、always-allow 可用性、MCP 标记等）。归属疑为权限/桥接（见 lead 建议）。
 */
function buildPermissionPromptPayload(e) {
  let mcpInfo = e.tool.isMcp === true ? e.tool.mcpInfo : undefined;
  let hasMcpSuffix = e.tool.isMcp === true;
  let s;
  if (mcpInfo) s = mcpServerLabel(mcpInfo);
  else {
    let h;
    try {
      h = e.tool.userFacingName(e.input) || e.tool.name;
    } catch {
      h = e.tool.name;
    }
    let w = e.tool.isMcp === true && h.endsWith(" (MCP)") ? h.slice(0, -6) : h;
    s = displayLabelOrUnnamedTool(w);
  }
  let y = "";
  let R;
  if (e.tool.isMcp !== true)
    try {
      let h =
        e.tool.renderToolUseMessage?.(e.input, {
          theme: e.theme,
          verbose: true,
        }) ?? null;
      y = typeof h === "string" ? stripNonPrintable(h) : h;
    } catch {
      y = "parameters could not be rendered \u2014 deny unless expected";
      R = true;
    }
  let decisionReason = e.permissionResult.decisionReason;
  let S = !(
    !R &&
    e.permissionResult.matchedAskRule === undefined &&
    e.permissionResult.denialLimitFallback === undefined &&
    e.permissionResult.autoDenyWindow === undefined &&
    (decisionReason === undefined || decisionReason.type === "safetyCheck" || decisionReason.type === "other")
  )
    ? undefined
    : e.servedCard !== undefined
      ? e.servedCard.card
      : decisionReason !== undefined
        ? e.tool.permissionCard?.(e.input, e.toolUseID, decisionReason.reason)
        : undefined;
  if (e.servedCard !== undefined && S !== undefined) s = safeLabel(e.servedCard.name);
  let k = e.requestSource === undefined && isRebindableLegacyGrant(e.tool);
  let T = e.tool.permissionNote?.(e.input, e.permissionMode);
  return {
    requestId: e.toolUseID,
    toolName: e.tool.name,
    input: e.input,
    description: displayField(e.description).text,
    permissionResult: e.permissionResult,
    userFacingName: s,
    hasMcpSuffix,
    renderedToolUseMessage: y,
    toolUseRenderFailed: R,
    paramFormatHints: getParamFormatHints(e.tool.inputJSONSchema),
    card: S && {
      question: displayField(S.question).text,
      lines: S.lines.map((line) => displayField(line).text),
      values: S.values.map((h) => displayField(h).text),
    },
    ...(T !== undefined && {
      note: displayField(T).text,
    }),
    messageId: e.assistantMessage.message.id,
    isMcp: e.tool.isMcp ?? false,
    isAskCappedByOrg: e.tool.mcpInfo?.effectiveMaxPermission === "ask",
    showAlwaysAllow:
      shouldShowAlwaysAllowOptions() &&
      !(e.permissionResult.behavior === "ask" && e.permissionResult.suppressAlwaysAllowRule === true) &&
      (e.tool.suppressesAlwaysAllowRule?.(e.input) !== true || k) &&
      e.tool.suppressesAllPermissionUpdates?.(e.input) !== true &&
      !isRemoteOrPluginAgent(e.requestSource),
    ...(k && {
      takesOverServerName: k,
    }),
    requestSource: e.requestSource,
    ...(e.roomyDescription === true && {
      roomyDescription: true,
    }),
    hasExternalRacer: e.hasExternalRacer ?? false,
    ...(e.networkAllowListHonoured === true && {
      networkAllowHosts: getCommandNetworkLists(e.input)?.allow.map(stripNonPrintable),
    }),
  };
}
//@ chunk-s4bxxzsw.js:10003-10637 placement
function permissionRequestOrigin(toolUseContext) {
  if (toolUseContext.forRemoteExecution === true)
    return {
      type: "remote-agent",
    };
  let hookCallerOf = getHookCallerOf(toolUseContext);
  if (hookCallerOf !== undefined)
    return {
      type: "plugin",
      pluginName: hookCallerOf,
    };
  if (isHookOrPluginSteered(toolUseContext))
    return {
      type: "plugin",
    };
  let n =
    isSubagentContext(toolUseContext.agentContext) && toolUseContext.agentContext.isAsync === true
      ? {
          stoppableByKillAgents: true,
        }
      : {};
  let spawnedByWorkflowRunId = toolUseContext.spawnedByWorkflowRunId;
  if (spawnedByWorkflowRunId !== undefined)
    return {
      type: "workflow-agent",
      workflowName: Object.values(toolUseContext.taskRegistry.all()).find(
        (C) => C.type === "local_workflow" && C.workflowRunId === spawnedByWorkflowRunId,
      )?.workflowName,
      ...n,
    };
  let agentContext = toolUseContext.agentContext;
  if (agentContext.agentType === "teammate")
    return {
      type: "subagent",
      agentName: agentContext.agentName,
    };
  if (isSubagentContext(agentContext) && isNonMainSessionSubagent(agentContext))
    return {
      type: "subagent",
      agentName: agentContext.displayName ?? agentContext.subagentName,
      ...n,
    };
  return;
}
//@ chunk-s4bxxzsw.js:10637-11137 placement
/**
 * 构造 Chrome 权限卡片载荷：host/url（缺省从 input.url 解析）、域名是否已允许、auto 模式不可用提示、动词短语。
 */
function buildChromePermissionPayload(e) {
  let permissionPromptPayload = buildPermissionPromptPayload(e);
  let chrome = e.permissionResult.metadata?.command?.chrome;
  let s = chrome
    ? {
        host: chrome.host,
        url: chrome.url,
      }
    : undefined;
  let y = chrome?.domainAllowed === true;
  let decisionReason = e.permissionResult.decisionReason;
  let C =
    y &&
    chrome?.classifierUnavailable === true &&
    decisionReason?.type === "other" &&
    e.permissionResult.matchedAskRule === undefined &&
    !permissionPromptPayload.isAskCappedByOrg;
  if (!s && typeof e.input.url === "string")
    try {
      let D = new URL(e.input.url);
      if (D.host)
        s = {
          host: D.host,
          url: D.href,
        };
    } catch {}
  return {
    ...permissionPromptPayload,
    chrome: s,
    domainAllowed: y,
    grantNotice: C ? getAutoModeGrantBlockCause() : undefined,
    verbPhrase: describeBrowserToolAction(e.tool.name, e.input),
  };
}
//@ chunk-s4bxxzsw.js:11137-11582 placement
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
//@ chunk-s4bxxzsw.js:11582-11712 placement
/**
 * 构建 WebFetch 权限卡片数据：在通用载荷上附加目标 URL 的主机名。
 */
function buildWebFetchPermissionPayload(e) {
  let permissionPromptPayload = buildPermissionPromptPayload(e);
  let url = e.input.url;
  let s = "";
  if (typeof url === "string")
    try {
      s = new URL(url).hostname;
    } catch {
      s = "";
    }
  return {
    ...permissionPromptPayload,
    hostname: s,
  };
}
//@ chunk-s4bxxzsw.js:11712-11999 placement
/**
 * 构建 AskUserQuestion 权限卡片数据：问题列表、来源元数据，以及是否为引擎强制确认。
 */
function buildAskUserQuestionPayload(e) {
  let permissionPromptPayload = buildPermissionPromptPayload(e);
  let n = AskUserQuestionTool.inputSchema.safeParse(e.input);
  let questions = n.success ? (n.data.questions ?? []) : [];
  let metadataSource = n.success ? n.data.metadata?.source : undefined;
  let isEngineConfirm =
    e.permissionResult.forcedByCaller === true &&
    e.requestSource === undefined &&
    isAuthedLinkText(e.toolUseID);
  return {
    ...permissionPromptPayload,
    questions,
    metadataSource,
    isEngineConfirm,
  };
}
//@ chunk-s4bxxzsw.js:11999-12099 placement
function serializeMcpArgsDisplay(e) {
  if (!("args" in e) || e.args === undefined) return;
  return serializeApprovalPayload(e.args, {
    scrub: "key",
    maxUnits: MAX_PAYLOAD_UNITS,
  });
}
//@ chunk-s4bxxzsw.js:12099-12810 placement
/**
 * 构造 Monitor 权限卡片载荷：命令、MCP 服务器/工具/参数、WebSocket url 与子协议（不可显示的标记 withheld）、轮询间隔与描述。
 */
function buildMonitorPermissionPayload(e) {
  let permissionPromptPayload = buildPermissionPromptPayload(e);
  let command =
    typeof e.input.command === "string"
      ? serializeApprovalPayload(e.input.command, {
          maxUnits: MAX_PAYLOAD_UNITS,
        })
      : undefined;
  let stringField = readStringField(e.input.mcp, "server");
  let stringField_2 = readStringField(e.input.mcp, "tool");
  let mcp =
    stringField !== undefined && stringField_2 !== undefined
      ? {
          server: sanitizeCardText(stringField, "(unnamed server)"),
          tool: sanitizeCardText(stringField_2, "(unnamed tool)"),
          argsDisplay: serializeMcpArgsDisplay(e.input.mcp),
        }
      : undefined;
  let stringField_3 = readStringField(e.input.ws, "url");
  let D = websocketSubprotocols(e.input.ws);
  let ws =
    stringField_3 !== undefined
      ? {
          url: serializeApprovalPayload(normalizeUrlHref(stringField_3), {
            maxUnits: MAX_PAYLOAD_UNITS,
          }),
          protocols: D?.map((h, w) =>
            w < MAX_QUOTED_ITEMS
              ? replaceLineBreaks(sanitizeForDisplay(truncateToLength(h, MAX_RAW_DISPLAY_CHARS)))
              : "",
          ),
          protocolsWithheld: D?.slice(0, MAX_QUOTED_ITEMS).some((h) => {
            let w = truncateToLength(h, MAX_RAW_DISPLAY_CHARS);
            return markBrokenSequences(w) !== w;
          }),
        }
      : undefined;
  let intervalMs = typeof e.input.interval_ms === "number" ? e.input.interval_ms : 30000;
  let monitorDescription =
    typeof e.input.description === "string" ? displayField(e.input.description).text : undefined;
  return {
    ...permissionPromptPayload,
    command,
    mcp,
    ws,
    intervalMs,
    monitorDescription,
  };
}
//@ chunk-s4bxxzsw.js:12810-12895 placement
function sanitizeCardText(stringField, r) {
  let trimmed = replaceLineBreaks(renderableText(truncateToLength(stringField, MAX_RAW_DISPLAY_CHARS)))
    .replace(/\s+/g, " ")
    .trim();
  return isCleanText(trimmed) ? trimmed : r;
}
//@ chunk-s4bxxzsw.js:12895-13010 placement
function readStringField(e, r) {
  if (e === null || typeof e !== "object" || !(r in e)) return;
  let n = e[r];
  return typeof n === "string" ? n : undefined;
}
//@ chunk-s4bxxzsw.js:13010-13069 placement
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
//@ chunk-s4bxxzsw.js:13069-13672 placement
/**
 * 构造 Workflow 权限卡片载荷：脚本（runId 时取渲染文本）、脚本是否被伪造为非字符串、工作流名、参数。
 */
function buildWorkflowPermissionPayload(e) {
  let permissionPromptPayload = buildPermissionPromptPayload(e);
  let n = typeof e.input.runId === "string" && typeof e.input.script !== "string";
  let script =
    typeof e.input.script === "string"
      ? e.input.script
      : n && typeof permissionPromptPayload.renderedToolUseMessage === "string"
        ? permissionPromptPayload.renderedToolUseMessage
        : "";
  let scriptForged = e.input.script !== undefined && typeof e.input.script !== "string";
  let workflowName =
    typeof e.input.name === "string" &&
    e.input.name !== "" &&
    !e.input.scriptPath &&
    stripNonPrintable(e.input.name) === e.input.name
      ? e.input.name
      : undefined;
  let renderedToolUseMessage =
    typeof permissionPromptPayload.renderedToolUseMessage === "string"
      ? stripNonPrintable(permissionPromptPayload.renderedToolUseMessage)
      : permissionPromptPayload.renderedToolUseMessage;
  let args = e.input.args;
  return {
    ...permissionPromptPayload,
    renderedToolUseMessage,
    script,
    scriptForged,
    workflowName,
    args,
  };
}
//@ chunk-s4bxxzsw.js:13672-14492 placement
/**
 * 构造 Artifact 权限卡片载荷：文件路径、标题与选项（过滤并安全化）、文件内容预览（网络路径/过大/不存在/读错误给出占位）。
 */
function buildArtifactPermissionPayload(e) {
  let permissionPromptPayload = buildPermissionPromptPayload(e);
  let filePath = typeof e.input.filePath === "string" ? e.input.filePath : "";
  let title = typeof e.input.title === "string" ? e.input.title : "";
  let artifactTitle = hasNoVisibleText(title) ? "" : safeLabel(title);
  let artifactOptions = (Array.isArray(e.input.options) ? e.input.options : [])
    .filter(
      (k) =>
        k !== null &&
        typeof k === "object" &&
        "label" in k &&
        typeof k.label === "string" &&
        "description" in k &&
        typeof k.description === "string" &&
        "value" in k &&
        typeof k.value === "string",
    )
    .map((k) => ({
      label: hasNoVisibleText(k.label) ? "" : safeLabel(k.label),
      description: displayField(k.description).text,
      value: k.value,
    }));
  let D;
  let S = false;
  if (isUntouchableSpelling(filePath) || isNetworkOrSpecialPath(filePath)) {
    D = `(Network path \u2014 content not previewed: ${filePath})`;
    S = true;
  } else
    try {
      D = readFileSync(filePath, BOUNDED_READ_MAX);
    } catch (error) {
      if (isFileTooLargeError(error)) D = `(Artifact too large for preview: ${filePath})`;
      else D = isENOENT(error) ? `(File not found: ${filePath})` : `(Error reading file: ${String(error)})`;
      S = true;
    }
  return {
    ...permissionPromptPayload,
    filePath,
    artifactTitle,
    artifactOptions,
    fileContent: D,
    contentWithheld: S,
  };
}
//@ chunk-s4bxxzsw.js:14492-14995 placement
/**
 * 构造 Skill 权限卡片载荷：技能名（input.skill 或元数据命令名）、描述、转发的 MCP 技能名。
 */
function buildSkillPermissionPayload(e) {
  let permissionPromptPayload = buildPermissionPromptPayload(e);
  let metadata = e.permissionResult.metadata;
  let command =
    metadata !== null &&
    typeof metadata === "object" &&
    "command" in metadata &&
    metadata.command !== null &&
    typeof metadata.command === "object"
      ? metadata.command
      : undefined;
  let y = command !== undefined && typeof command.name === "string" ? command.name : undefined;
  let skillDescription =
    command !== undefined && typeof command.description === "string"
      ? command.description
      : e.forwardedMcpSkill?.description;
  let skill = (typeof e.input.skill === "string" ? e.input.skill : undefined) ?? y ?? "";
  return {
    ...permissionPromptPayload,
    skill,
    skillDescription,
    ...(e.forwardedMcpSkill !== undefined && {
      forwardedMcpSkill: {
        name: e.forwardedMcpSkill.name,
      },
    }),
  };
}
//@ chunk-s4bxxzsw.js:14995-15256 placement
/**
 * 构建 PowerShell 权限卡片数据：清理不可打印字符后的命令（有长度上限）与渲染的工具消息。
 */
function buildPowerShellPermissionPayload(e) {
  let permissionPromptPayload = buildPermissionPromptPayload(e);
  let command =
    typeof e.input.command === "string" && e.input.command.length <= MAX_PAYLOAD_UNITS
      ? stripNonPrintable(e.input.command)
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
//@ chunk-s4bxxzsw.js:15256-15627 placement
/**
 * 构造 ExitPlanMode 权限卡片载荷：当前计划、计划文件路径、本条助手消息的 token 用量。
 */
function buildExitPlanModePermissionPayload(e) {
  let permissionPromptPayload = buildPermissionPromptPayload(e);
  let planFilePath = getPlanFilePath();
  notePlanFileForgotten(planFilePath);
  let plan = getPlan() ?? "";
  let usage = e.assistantMessage.isUnmetered === true ? undefined : e.assistantMessage.message.usage;
  let usage_2;
  if (usage && typeof usage.input_tokens === "number") {
    let tokenCountFromUsage = getTokenCountFromUsage(usage);
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
//@ chunk-s4bxxzsw.js:15627-15952 placement
/**
 * 构造 Bash 权限卡片载荷：命令（过长置空、去不可打印字符）、分类器状态、已有允许规则描述。
 */
function buildBashPermissionPayload(e) {
  let permissionPromptPayload = buildPermissionPromptPayload(e);
  let command =
    typeof e.input.command === "string" && e.input.command.length <= MAX_PAYLOAD_UNITS
      ? stripNonPrintable(e.input.command)
      : "";
  let renderedToolUseMessage =
    typeof permissionPromptPayload.renderedToolUseMessage === "string"
      ? stripNonPrintable(permissionPromptPayload.renderedToolUseMessage)
      : permissionPromptPayload.renderedToolUseMessage;
  return {
    ...permissionPromptPayload,
    renderedToolUseMessage,
    command,
    classifierState: e.classifierState,
    existingAllowDescriptions: [],
  };
}
//@ chunk-s4bxxzsw.js:15952-16238 placement
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
//@ chunk-s4bxxzsw.js:16238-16429 placement
/**
 * 构建发布插件权限卡片数据：卡片内容与全部条目（优先取会话缓存，否则从输入问题解析）。
 */
function buildPublishPluginPayload(e) {
  let r = e.session && sessionScopedMapsSlot.of(e.session).get(e.toolUseID);
  let question = PUBLISH_PLUGIN_INPUT_SCHEMA().safeParse(e.input).data?.question;
  return {
    ...buildPermissionPromptPayload(e),
    card: r?.card ?? (question && buildPublishPluginCard(question)),
    everything: r?.everything ?? (question ? manifestEntryLines(question) : []),
  };
}
//@ chunk-s4bxxzsw.js:16429-16439 placement
/**
 * 导出值：MAX_CARD_ACTIONS（6：权限卡动作上限）。
 */
var MAX_CARD_ACTIONS = 6;
//@ chunk-s4bxxzsw.js:16439-16450 placement
var CHROME_ROWS = 14;
//@ chunk-s4bxxzsw.js:16450-16736 placement
var PUBLISH_PLUGIN_PERMISSION_CARD = withHideWhile({
  kind: "permission_publish_plugin",
  payload: DoctorLazy(() =>
    deepFreezeToolName(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "requestId" in e &&
        "toolName" in e &&
        "permissionResult" in e &&
        "everything" in e,
    ),
  ),
  result: DoctorLazy(() => deepFreezeToolName((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: {
    behavior: "cancelled",
  },
});
//@ chunk-s4bxxzsw.js:16736-16747 placement
var LIST_CHROME_ROWS = 10;
//@ chunk-s4bxxzsw.js:16747-16758 placement
var LIST_GUTTER = 10;
//@ chunk-s4bxxzsw.js:16758-16768 placement
var MIN_LIST_ROWS = 5;
//@ chunk-s4bxxzsw.js:16768-16846 placement
var PUBLISH_WAITING_MESSAGE = "Claude Code is waiting for your answer before it publishes a plugin";
//@ chunk-s4bxxzsw.js:16846-17129 placement
var EXIT_PLAN_MODE_V2_PERMISSION_CARD = withHideWhile({
  kind: "permission_exit_plan_mode_v2",
  payload: DoctorLazy(() =>
    deepFreezeToolName(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "requestId" in e &&
        "toolName" in e &&
        "permissionResult" in e &&
        "plan" in e,
    ),
  ),
  result: DoctorLazy(() => deepFreezeToolName((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: {
    behavior: "cancelled",
  },
});
//@ chunk-s4bxxzsw.js:17129-17426 placement
var FILE_PERMISSION_CARD = withHideWhile({
  kind: "permission_file",
  payload: DoctorLazy(() =>
    deepFreezeToolName(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "requestId" in e &&
        "toolName" in e &&
        "permissionResult" in e &&
        "filePath" in e &&
        "operationType" in e,
    ),
  ),
  result: DoctorLazy(() => deepFreezeToolName((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: {
    behavior: "cancelled",
  },
});
//@ chunk-s4bxxzsw.js:17486-17865 placement
var OUTSIDE_READS_TITLE = "Read outside the working directories";
var OUTSIDE_READ_TITLE = "Allow this read outside the working directories?";
var OUTSIDE_READ_ACTIONS = ["allow", "block", "ask_again", "allow_once"];
var OUTSIDE_READ_ACTION_LABELS = {
  allow: "Yes, and keep allowing any reads outside the working directories",
  block: "No, and block reads outside the working directories from now on",
  ask_again: "No, and ask again next time",
  allow_once: "Yes, but ask again next time",
};
//@ chunk-s4bxxzsw.js:17865-18623 placement
/**
 * 工作目录外读取对话框的说明文字，按沙箱是否能隔离 home 目录给出不同提示。
 */
function getOutsideReadsExplainer(e) {
  return (
    "Auto mode and the sandbox read outside the working directories without asking. Yes or No answers for this read; the rest is for later reads. Block: the file tools refuse reads outside the working directories in every project. " +
    (e
      ? "Sandboxed commands lose your home directory (SSH keys, home-installed tools) until you re-open paths with sandbox.filesystem.allowRead."
      : "The sandbox doesn't enforce it on this machine (off, filesystem rules relaxed, managed read-path lock on, or working directory name has glob characters). Auto mode asks before each shell command it can't check.") +
    " To undo, remove permissions.blockReadsOutsideWorkingDirectories from your user settings; file tools follow next session, sandboxed commands at once."
  );
}
//@ chunk-s4bxxzsw.js:18623-18824 placement
var AUTO_MODE_OUTSIDE_READS_DIALOG = withHideWhile({
  kind: "auto_mode_outside_reads",
  payload: DoctorLazy(() =>
    u({
      toolName: string(),
      path: string(),
      title: string(),
      question: string(),
      explainer: string(),
      options: array(
        u({
          value: _enum(OUTSIDE_READ_ACTIONS),
          label: string(),
        }),
      ),
    }),
  ),
  result: DoctorLazy(() => _enum(OUTSIDE_READ_ACTIONS)),
  default: "ask_again",
});
//@ chunk-s4bxxzsw.js:18824-18983 placement
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
    options: OUTSIDE_READ_ACTIONS.map((s) => ({
      value: s,
      label: OUTSIDE_READ_ACTION_LABELS[s],
    })),
  };
}
//@ chunk-s4bxxzsw.js:18983-18997 placement
var MAX_CARD_INPUT_CHARS = 200000;
//@ chunk-s4bxxzsw.js:18997-19099 placement
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
//@ chunk-s4bxxzsw.js:19099-19177 placement
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
//@ chunk-s4bxxzsw.js:19177-19332 placement
/**
 * 调用工具的 getPath 获取输入中的路径，非空字符串时返回，出错返回 null。
 */
function getToolInputPath(tool, r) {
  try {
    let n = tool;
    if (typeof n.getPath !== "function") return null;
    let path = n.getPath(r);
    return typeof path === "string" && path !== "" ? path : null;
  } catch {
    return null;
  }
}
//@ chunk-s4bxxzsw.js:19332-19577 placement
function resolveSymlinkTarget(filePath, r, blockedPath) {
  if (r)
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
//@ chunk-s4bxxzsw.js:19577-19620 placement
function safeRelativeDisplay(filePath, suspicious) {
  return stripInvisibleChars(suspicious ? filePath : relative(getCwd(), filePath));
}
//@ chunk-s4bxxzsw.js:19620-19671 placement
function basenameOrPath(e, suspicious) {
  return stripInvisibleChars(suspicious ? posix.basename(e) : basename(e));
}
//@ chunk-s4bxxzsw.js:19671-24519 placement
/**
 * 为 Edit/Write/NotebookEdit 等文件工具构造权限卡片：标题、文件名问题、diff 或占位说明；内容过大、含可疑字符、网络路径、远程不可读时标记 contentWithheld（仅一次性批准）。
 */
async function buildFileToolPermissionCard(request) {
  let { tool: parsed, input: tooLarge, remoteWorkspace: suspicious, remoteOldContent: withheld } = request;
  if (parsed === FileEditTool) {
    let D = FileEditTool.inputSchema.parse(tooLarge);
    let S = D.old_string.length > MAX_CARD_INPUT_CHARS || D.new_string.length > MAX_CARD_INPUT_CHARS;
    let k = !S && (hasSuspiciousText(D.old_string) || hasSuspiciousText(D.new_string));
    let contentWithheld = S || k;
    return {
      title: "Edit file",
      subtitle: safeRelativeDisplay(D.file_path, suspicious),
      question: {
        kind: "file-action",
        verbPhrase: "make this edit to",
        fileName: basenameOrPath(D.file_path, suspicious),
      },
      content: S
        ? {
            kind: "no-changes",
            message:
              "Proposed edit is too large to show \u2014 cannot be reviewed, so approval is one-time only (deny unless expected).",
          }
        : k
          ? {
              kind: "no-changes",
              message:
                "Proposed edit cannot be shown in full \u2014 cannot be reviewed, so approval is one-time only (deny unless expected).",
            }
          : {
              kind: "file-edit-diff",
              filePath: D.file_path,
              edits: [
                {
                  old_string: D.old_string,
                  new_string: D.new_string,
                  replace_all: D.replace_all || false,
                },
              ],
              remoteOldContent: withheld ?? undefined,
              skipLocalRead: suspicious,
            },
      contentWithheld,
    };
  }
  if (parsed === FileWriteTool) {
    let D = FileWriteTool.inputSchema.parse(tooLarge);
    let S = "";
    let k = false;
    let T = false;
    let h;
    let w;
    if (suspicious) {
      if (typeof withheld === "string") {
        S = withheld;
        k = true;
        h = "Overwrite file";
        w = "overwrite";
      } else if (withheld === null) {
        h = "Create file";
        w = "create";
      } else {
        h = "Write file";
        w = "write to";
        T = true;
      }
    } else {
      let q = isNonWslUncPath(D.file_path) || isNetworkOrSpecialPath(D.file_path);
      if (!q)
        try {
          S = stripBom((await readFileChecked(D.file_path, BOUNDED_READ_MAX)).content);
          k = true;
        } catch (error) {
          if (isFileTooLargeError(error)) {
            k = true;
            T = true;
          } else if (!isENOENT(error) && !isNotRegularFileError(error)) throw error;
        }
      if (q) {
        T = true;
        h = "Write file";
        w = "write to";
      } else {
        h = k ? "Overwrite file" : "Create file";
        w = k ? "overwrite" : "create";
      }
    }
    let B = D.content.length > MAX_CARD_INPUT_CHARS;
    let F = !B && hasSuspiciousText(D.content);
    let P = B || F;
    let E = k && hasBrokenSequences(S);
    let V = k && !E && hasSuspiciousText(S);
    let contentWithheld = P || T || E || V;
    return {
      title: h,
      subtitle: safeRelativeDisplay(D.file_path, suspicious),
      question: {
        kind: "file-action",
        verbPhrase: w,
        fileName: basenameOrPath(D.file_path, suspicious),
      },
      content: B
        ? {
            kind: "no-changes",
            message:
              "Proposed content is too large to show \u2014 cannot be reviewed, so approval is one-time only (deny unless expected).",
          }
        : F
          ? {
              kind: "no-changes",
              message:
                "Proposed content cannot be shown in full \u2014 cannot be reviewed, so approval is one-time only (deny unless expected).",
            }
          : T
            ? {
                kind: "no-changes",
                message: k
                  ? `Existing file is too large to preview \u2014 approving will overwrite ${stripInvisibleChars(D.file_path)}.`
                  : suspicious
                    ? `The remote file could not be checked \u2014 approving will write to ${stripInvisibleChars(D.file_path)}.`
                    : `File may be on a network path, so it was not previewed \u2014 approving will write to ${stripInvisibleChars(D.file_path)}.`,
              }
            : E
              ? {
                  kind: "no-changes",
                  message: `Current contents of ${stripInvisibleChars(D.file_path)} cannot be shown in full \u2014 the overwrite cannot be reviewed, so approval is one-time only (deny unless expected).`,
                }
              : {
                  kind: "file-write-diff",
                  filePath: D.file_path,
                  content: D.content,
                  fileExists: k,
                  oldContent: S,
                  ...(V && {
                    notice: `Current contents of ${stripInvisibleChars(D.file_path)} cannot be shown in full \u2014 the overwrite cannot be fully reviewed, so approval is one-time only (deny unless expected).`,
                  }),
                },
      contentWithheld,
    };
  }
  if (parsed === NotebookEditTool) {
    let D = NotebookEditTool.inputSchema.parse(tooLarge);
    let verbPhrase =
      D.edit_mode === "insert"
        ? "insert this cell into"
        : D.edit_mode === "delete"
          ? "delete this cell from"
          : "make this edit to";
    let k = (D.new_source?.length ?? 0) > MAX_CARD_INPUT_CHARS || hasSuspiciousText(D.new_source ?? "");
    let T = D.edit_mode !== "insert";
    let h;
    let w;
    if (T)
      if (suspicious) {
        if (typeof withheld === "string") {
          let notebookCellSource = findNotebookCellSource(withheld, D.cell_id);
          if (notebookCellSource.kind === "found") {
            if (
              notebookCellSource.source.length > MAX_CARD_INPUT_CHARS ||
              hasSuspiciousText(notebookCellSource.source)
            )
              w = "the current cell contents cannot be shown in full";
            else h = notebookCellSource.source;
          } else
            w =
              notebookCellSource.kind === "unparsable"
                ? "the notebook could not be parsed for preview"
                : "the target cell was not found in the notebook";
        } else if (withheld === null) w = "the notebook was not found in the remote workspace";
        else w = "the remote notebook could not be fetched";
      } else if (isNonWslUncPath(D.notebook_path) || isNetworkOrSpecialPath(D.notebook_path))
        w = "the notebook may be on a network path";
      else
        try {
          if (!(await getFsImplementation().stat(D.notebook_path)).isFile())
            w = "the notebook could not be read";
          else {
            let fileBytes = await getFsImplementation().readFileBytes(
              D.notebook_path,
              MAX_NOTEBOOK_BYTES + 1,
            );
            if (fileBytes.length > MAX_NOTEBOOK_BYTES) w = "the notebook is too large to preview";
            else {
              let notebookCellSource = findNotebookCellSource(fileBytes.toString("utf-8"), D.cell_id);
              if (notebookCellSource.kind === "found") {
                if (
                  notebookCellSource.source.length > MAX_CARD_INPUT_CHARS ||
                  hasSuspiciousText(notebookCellSource.source)
                )
                  w = "the current cell contents cannot be shown in full";
                else h = notebookCellSource.source;
              } else
                w =
                  notebookCellSource.kind === "unparsable"
                    ? "the notebook could not be parsed for preview"
                    : "the target cell was not found in the notebook";
            }
          }
        } catch {
          w = "the notebook could not be read";
        }
    let contentWithheld = k || w !== undefined;
    return {
      title: "Edit notebook",
      subtitle: undefined,
      question: {
        kind: "file-action",
        verbPhrase,
        fileName: basenameOrPath(D.notebook_path, suspicious),
      },
      content: k
        ? {
            kind: "no-changes",
            message:
              "Proposed cell content is too large to show \u2014 cannot be reviewed, so approval is one-time only (deny unless expected).",
          }
        : w !== undefined
          ? {
              kind: "no-changes",
              message: `Current cell contents cannot be shown (${w}) \u2014 the ${D.edit_mode === "delete" ? "deletion" : "edit"} cannot be reviewed, so approval is one-time only (deny unless expected).`,
            }
          : {
              kind: "notebook-edit-diff",
              notebookPath: D.notebook_path,
              cellId: D.cell_id,
              newSource: D.new_source,
              cellType: D.cell_type,
              editMode: D.edit_mode,
              remoteOldContent: withheld ?? undefined,
              skipLocalRead: suspicious,
              oldCellSource: h,
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
//@ chunk-s4bxxzsw.js:24519-25254 placement
async function buildFilePermissionDescriptor(e) {
  let permissionPromptPayload = buildPermissionPromptPayload(e);
  let tool = e.tool;
  if (!isFileTool(tool))
    throw Error(`buildFilePermissionDescriptor called with non-file tool: ${e.tool.name}`);
  let s = e.remoteWorkspace === true;
  let y = tool.isReadOnly(e.input) ? "read" : "write";
  let { title, subtitle, question, content, contentWithheld } = await buildFileToolPermissionCard({
    tool,
    input: e.input,
    remoteWorkspace: s,
    remoteOldContent: e.remoteOldContent,
  });
  let symlinkTarget = resolveSymlinkTarget(e.filePath, s, e.permissionResult.blockedPath);
  let offersBlockOutsideReads = e.permissionResult.offersBlockOutsideReads;
  let w =
    y === "write" &&
    !s &&
    (tool === FileEditTool || tool === FileWriteTool) &&
    (await labelsMemoryItem(e.filePath));
  return {
    ...permissionPromptPayload,
    ...(w && {
      memoryItemHeader: w,
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
    filePath: e.filePath,
    operationType: y,
    symlinkTarget: symlinkTarget.target,
    ...(symlinkTarget.unchecked && {
      symlinkUnchecked: true,
    }),
  };
}
//@ chunk-s4bxxzsw.js:25254-25605 placement
/**
 * 按工具类型返回权限卡片遥测用的补全类型与语言：编辑为 str_replace_single、写入为 write_file_single、Notebook 按单元类型取 markdown/python，其他为 tool_use_single。
 */
function getCompletionTypeForTool(tool, r, toolInputPath) {
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
      language_name: r.cell_type === "markdown" ? lit("markdown") : lit("python"),
    };
  return {
    completion_type: "tool_use_single",
    language_name: languageForFilePath(toolInputPath),
  };
}
//@ chunk-s4bxxzsw.js:25605-25884 placement
var MONITOR_PERMISSION_CARD = withHideWhile({
  kind: "permission_monitor",
  payload: DoctorLazy(() =>
    deepFreezeToolName(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "requestId" in e &&
        "toolName" in e &&
        "permissionResult" in e &&
        "intervalMs" in e,
    ),
  ),
  result: DoctorLazy(() => deepFreezeToolName((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: {
    behavior: "cancelled",
  },
});
//@ chunk-s4bxxzsw.js:25884-26163 placement
var POWERSHELL_PERMISSION_CARD = withHideWhile({
  kind: "permission_powershell",
  payload: DoctorLazy(() =>
    deepFreezeToolName(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "requestId" in e &&
        "toolName" in e &&
        "permissionResult" in e &&
        "command" in e,
    ),
  ),
  result: DoctorLazy(() => deepFreezeToolName((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: {
    behavior: "cancelled",
  },
});
//@ chunk-s4bxxzsw.js:26163-26435 placement
var SKILL_PERMISSION_CARD = withHideWhile({
  kind: "permission_skill",
  payload: DoctorLazy(() =>
    deepFreezeToolName(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "requestId" in e &&
        "toolName" in e &&
        "permissionResult" in e &&
        "skill" in e,
    ),
  ),
  result: DoctorLazy(() => deepFreezeToolName((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: {
    behavior: "cancelled",
  },
});
//@ chunk-s4bxxzsw.js:26435-26713 placement
var WEBFETCH_PERMISSION_CARD = withHideWhile({
  kind: "permission_webfetch",
  payload: DoctorLazy(() =>
    deepFreezeToolName(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "requestId" in e &&
        "toolName" in e &&
        "permissionResult" in e &&
        "hostname" in e,
    ),
  ),
  result: DoctorLazy(() => deepFreezeToolName((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: {
    behavior: "cancelled",
  },
});
//@ chunk-s4bxxzsw.js:26713-26748 placement
var autoDenyPresenceSignal = createLazySignal(() => uiSignals.autoDenyPresence);
export {
  MAX_CARD_ACTIONS,
  buildPermissionPromptPayload,
  BROWSER_PERMISSION_CARD,
  isFileTool,
  getToolInputPath,
  buildFilePermissionDescriptor,
  isAutoDenyKind,
  FILE_PERMISSION_CARD,
  BASH_PERMISSION_CARD,
  buildBashPermissionPayload,
  isNotAskUserQuestionCard,
  ASK_USER_QUESTION_PERMISSION_CARD,
  POWERSHELL_PERMISSION_CARD,
  WEBFETCH_PERMISSION_CARD,
  SKILL_PERMISSION_CARD,
  MONITOR_PERMISSION_CARD,
  ENTER_PLAN_MODE_PERMISSION_CARD,
  EXIT_PLAN_MODE_V2_PERMISSION_CARD,
  PUBLISH_PLUGIN_PERMISSION_CARD,
  PUBLISH_WAITING_MESSAGE,
  normalizeUrlHref,
  splitQuestionTitleBody,
  describeAutoModeGrantBlock,
  OUTSIDE_READ_ACTION_LABELS,
  getOutsideReadsExplainer,
  permissionRequestOrigin,
  getCompletionTypeForTool,
  autoDenyPresenceSignal,
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
