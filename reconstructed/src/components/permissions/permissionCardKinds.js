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
import { isAbsolute, relative, posix, basename, basename as basename_2 } from "path";
import { withHideWhile } from "../dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { Fh } from "../../utils/deepFreezePlainData.js";
import { CONFIRM } from "../../utils/permissions/confirmWithUser.js";
import {
  pAn,
  displayField,
  mcpServerLabel,
  Uur,
  safeLabel,
  serializeApprovalPayload,
  MAX_PAYLOAD_UNITS,
  replaceLineBreaks,
  mat,
  HH,
  markBrokenSequences,
  P5e,
  isCleanText,
  $Rt,
  hasSuspiciousText,
  ubi,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import { toSafeFileUrl } from "../../services/mcp/xaa.js";
import { tildify, expandPath } from "../../utils/path.js";
import { STRING_FORMATS } from "../../utils/mcp/elicitationValidation.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import { isRebindableLegacyGrant } from "../../services/mcp/mcpStandardKeys.js";
import { shouldShowAlwaysAllowOptions } from "../../utils/permissions/permissionsLoader.js";
import {
  isRemoteOrPluginAgent,
  ygr,
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
import { websocketSubprotocols, IDr } from "../../utils/websocketSummary.js";
import { truncateToLength, plural } from "../../utils/stringUtils.js";
import { hl, n_, ai } from "../../utils/networkPaths.js";
import { readFileSync, Cj, readFileChecked, bde } from "../../utils/fileRead.js";
import { BOUNDED_READ_MAX } from "../../utils/fsSafety/atomicWriteStaging.js";
import { isENOENT } from "../../utils/errors.js";
import { getPlanFilePath, notePlanFileForgotten, getPlan } from "../../utils/plans.js";
import { getTokenCountFromUsage } from "../../utils/messages/usageAndStopReason.js";
import {
  IOr,
  staysOnMachineLines,
  manifestWriteLines,
  Y0s,
  cTo,
  manifestEntryLines,
} from "../../utils/teleport/uploadManifestText.js";
import { printableOrEmpty } from "../../utils/printableName.js";
import { formatFileSize } from "../../utils/format.js";
import { AWn } from "../../utils/sessionScopedMaps.js";
import { PUBLISH_PLUGIN_INPUT_SCHEMA } from "../../tools/PublishPluginTool/constants.js";
import { u, o, A, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { FileEditTool } from "../../tools/FileEditTool/FileEditTool.js";
import { FileWriteTool } from "../../tools/FileWriteTool/FileWriteTool.js";
import { NotebookEditTool } from "../../tools/NotebookEditTool/NotebookEditTool.js";
import { GlobTool } from "../../tools/GlobTool/GlobTool.js";
import { GrepTool } from "../../tools/GrepTool/GrepTool.js";
import { FileReadTool } from "../../tools/FileReadTool/FileReadTool.js";
import { walkPermissionCheckPaths, getFsImplementation } from "../../utils/fsOperations.js";
import { symlinkLanding } from "../../utils/permissions/filesystem.js";
import { hr } from "../../utils/invisibleChars.js";
import { getCwd } from "../../utils/cwd.js";
import { tv } from "../../utils/remoteFileState.js";
import { findNotebookCellSource, SW } from "../../utils/notebook.js";
import { labelsMemoryItem } from "../../tools/MemoryTool/memoryWrite.js";
import { languageForFilePath } from "../../utils/highlight/pluginLanguages.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { createLazySignal } from "../../utils/signal.js";
import { uiSignals } from "../../state/uiSignals.js";

/**
 * 权限卡片注册项（qo 定义 kind + payload/result schema）：AskUserQuestion、Bash、Browser、EnterPlanMode、File、Monitor、PowerShell、Skill、WebFetch、PublishPlugin、ExitPlanMode v2 等。
 */
//@ chunk-s4bxxzsw.js:4589-4877 placement
var ASK_USER_QUESTION_PERMISSION_CARD = withHideWhile({
  kind: "permission_ask_user_question",
  payload: DoctorLazy(() =>
    Fh(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "requestId" in e &&
        "toolName" in e &&
        "permissionResult" in e &&
        "questions" in e,
    ),
  ),
  result: DoctorLazy(() => Fh((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: { behavior: "cancelled" },
});
//@ chunk-s4bxxzsw.js:4877-4913 placement
function isNotAskUserQuestionCard(e) {
  return e !== ASK_USER_QUESTION_PERMISSION_CARD.kind;
}
//@ chunk-s4bxxzsw.js:4913-5211 placement
var BASH_PERMISSION_CARD = withHideWhile({
  kind: "permission_bash",
  payload: DoctorLazy(() =>
    Fh(
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
  result: DoctorLazy(() => Fh((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: { behavior: "cancelled" },
});
/**
 * 解释为什么已允许的操作仍要询问：auto 模式不可用的原因（组织关闭、托管设置、设置文件 disableAutoMode、模型不支持、fast 模式、不可用）。
 */
//@ chunk-s4bxxzsw.js:5211-6333 placement
function describeAutoModeGrantBlock(e, r) {
  let n = `${r} is allowed, but Claude asks before actions like this because they can only be approved automatically when auto mode is available, and`;
  switch (e.cause) {
    case "organization":
      return `${n} your organization has turned auto mode off.`;
    case "managed-settings":
      return `${n} auto mode is turned off in this computer's managed settings.`;
    case "settings": {
      if (e.files.length === 0 && e.startup)
        return `${n} auto mode is turned off by the disableAutoMode setting Claude Code was started with. Start Claude Code without it to change this.`;
      let s = [...e.files, ...(e.startup ? ["the settings Claude Code was started with"] : [])],
        y = s.length === 0 ? "your settings files" : s.join(" and ");
      return `${n} auto mode is turned off by the disableAutoMode setting in ${y}. Remove it and restart Claude Code to change this.`;
    }
    case "model":
      return `${n} ${e.model} doesn't support auto mode. Switch models with /model to change this.`;
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
    Fh(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "requestId" in e &&
        "toolName" in e &&
        "permissionResult" in e &&
        "verbPhrase" in e,
    ),
  ),
  result: DoctorLazy(() => Fh((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: { behavior: "cancelled" },
});
//@ chunk-s4bxxzsw.js:6612-6879 placement
var ENTER_PLAN_MODE_PERMISSION_CARD = withHideWhile({
  kind: "permission_enter_plan_mode",
  payload: DoctorLazy(() =>
    Fh(
      (e) =>
        typeof e === "object" && e !== null && "requestId" in e && "toolName" in e && "permissionResult" in e,
    ),
  ),
  result: DoctorLazy(() => Fh((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: { behavior: "cancelled" },
});
//@ chunk-s4bxxzsw.js:6951-7038 placement
var ht = /\[([^[\]\n]*)\]\(([^()\s]*)\)/g,
  Ao = (e) => typeof e === "string" && e.startsWith(CONFIRM);
/**
 * 把问题文本拆成标题（第一行）与正文行列表。
 */
//@ chunk-s4bxxzsw.js:7038-7223 placement
function splitQuestionTitleBody(e) {
  let r = pAn(e),
    index = r.indexOf(`

`);
  if (index === -1) return { title: displayField(r).text, body: [] };
  let replaced = r.slice(index + 2).replace(/^\n+/, "");
  return {
    title: displayField(r.slice(0, index)).text,
    body: replaced === "" ? [] : parseFileLinkSegments(replaced),
  };
}
/**
 * 把文本中的 markdown file:/// 链接拆成 text 与 fileLink 片段（只接受绝对路径的安全文件 URL）。
 */
//@ chunk-s4bxxzsw.js:7223-7605 placement
function parseFileLinkSegments(e) {
  let r = [],
    n = "",
    s = 0;
  for (let y of e.matchAll(ht)) {
    let [R, C = "", D = ""] = y,
      S = fileUrlToAbsolutePath(D),
      k = S === null ? null : toSafeFileUrl(S);
    if (((n += e.slice(s, y.index)), (s = y.index + R.length), S === null || k === null)) {
      n += R;
      continue;
    }
    if (n !== "") (r.push({ kind: "text", text: displayField(n).text }), (n = ""));
    r.push({ kind: "fileLink", label: displayField(C).text, url: k, path: displayField(tildify(S)).text });
  }
  if (((n += e.slice(s)), n !== "")) r.push({ kind: "text", text: displayField(n).text });
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
/**
 * getParamFormatHints：工具 inputJSONSchema 中 format=date-time 的参数表，供权限 UI 提示。
 */
//@ chunk-s4bxxzsw.js:7745-8009 sole-consumer = hasStringFormat (0.863)
function getParamFormatHints(schema) {
  let r = schema?.properties;
  if (r === null || typeof r !== "object" || Array.isArray(r)) return;
  let n;
  for (let [s, y] of Object.entries(r)) {
    if (y === null || typeof y !== "object" || !("format" in y)) continue;
    let format = y.format;
    if (typeof format === "string" && STRING_FORMATS.has(format)) ((n ??= {}), (n[s] = format));
  }
  return n;
}
/**
 * buildPermissionPromptPayload：把一次权限请求整理成发给宿主/桥接 UI 的载荷（显示名、渲染后的输入、卡片、always-allow 可用性、MCP 标记等）。归属疑为权限/桥接（见 lead 建议）。
 */
//@ chunk-s4bxxzsw.js:8009-10003 placement
function buildPermissionPromptPayload(e) {
  let r = e.tool.isMcp === !0 ? e.tool.mcpInfo : void 0,
    n = e.tool.isMcp === !0,
    s;
  if (r) s = mcpServerLabel(r);
  else {
    let h;
    try {
      h = e.tool.userFacingName(e.input) || e.tool.name;
    } catch {
      h = e.tool.name;
    }
    let w = e.tool.isMcp === !0 && h.endsWith(" (MCP)") ? h.slice(0, -6) : h;
    s = Uur(w);
  }
  let y = "",
    R;
  if (e.tool.isMcp !== !0)
    try {
      let h = e.tool.renderToolUseMessage?.(e.input, { theme: e.theme, verbose: !0 }) ?? null;
      y = typeof h === "string" ? stripNonPrintable(h) : h;
    } catch {
      ((y = "parameters could not be rendered \u2014 deny unless expected"), (R = !0));
    }
  let decisionReason = e.permissionResult.decisionReason,
    S = !(
      !R &&
      e.permissionResult.matchedAskRule === void 0 &&
      e.permissionResult.denialLimitFallback === void 0 &&
      e.permissionResult.autoDenyWindow === void 0 &&
      (decisionReason === void 0 || decisionReason.type === "safetyCheck" || decisionReason.type === "other")
    )
      ? void 0
      : e.servedCard !== void 0
        ? e.servedCard.card
        : decisionReason !== void 0
          ? e.tool.permissionCard?.(e.input, e.toolUseID, decisionReason.reason)
          : void 0;
  if (e.servedCard !== void 0 && S !== void 0) s = safeLabel(e.servedCard.name);
  let k = e.requestSource === void 0 && isRebindableLegacyGrant(e.tool),
    T = e.tool.permissionNote?.(e.input, e.permissionMode);
  return {
    requestId: e.toolUseID,
    toolName: e.tool.name,
    input: e.input,
    description: displayField(e.description).text,
    permissionResult: e.permissionResult,
    userFacingName: s,
    hasMcpSuffix: n,
    renderedToolUseMessage: y,
    toolUseRenderFailed: R,
    paramFormatHints: getParamFormatHints(e.tool.inputJSONSchema),
    card: S && {
      question: displayField(S.question).text,
      lines: S.lines.map((line) => displayField(line).text),
      values: S.values.map((h) => displayField(h).text),
    },
    ...(T !== void 0 && { note: displayField(T).text }),
    messageId: e.assistantMessage.message.id,
    isMcp: e.tool.isMcp ?? !1,
    isAskCappedByOrg: e.tool.mcpInfo?.effectiveMaxPermission === "ask",
    showAlwaysAllow:
      shouldShowAlwaysAllowOptions() &&
      !(e.permissionResult.behavior === "ask" && e.permissionResult.suppressAlwaysAllowRule === !0) &&
      (e.tool.suppressesAlwaysAllowRule?.(e.input) !== !0 || k) &&
      e.tool.suppressesAllPermissionUpdates?.(e.input) !== !0 &&
      !isRemoteOrPluginAgent(e.requestSource),
    ...(k && { takesOverServerName: k }),
    requestSource: e.requestSource,
    ...(e.roomyDescription === !0 && { roomyDescription: !0 }),
    hasExternalRacer: e.hasExternalRacer ?? !1,
    ...(e.networkAllowListHonoured === !0 && {
      networkAllowHosts: getCommandNetworkLists(e.input)?.allow.map(stripNonPrintable),
    }),
  };
}
//@ chunk-s4bxxzsw.js:10003-10637 placement
function permissionRequestOrigin(e) {
  if (e.forRemoteExecution === !0) return { type: "remote-agent" };
  let r = ygr(e);
  if (r !== void 0) return { type: "plugin", pluginName: r };
  if (isHookOrPluginSteered(e)) return { type: "plugin" };
  let n =
      isSubagentContext(e.agentContext) && e.agentContext.isAsync === !0 ? { stoppableByKillAgents: !0 } : {},
    spawnedByWorkflowRunId = e.spawnedByWorkflowRunId;
  if (spawnedByWorkflowRunId !== void 0)
    return {
      type: "workflow-agent",
      workflowName: Object.values(e.taskRegistry.all()).find(
        (C) => C.type === "local_workflow" && C.workflowRunId === spawnedByWorkflowRunId,
      )?.workflowName,
      ...n,
    };
  let agentContext = e.agentContext;
  if (agentContext.agentType === "teammate") return { type: "subagent", agentName: agentContext.agentName };
  if (isSubagentContext(agentContext) && isNonMainSessionSubagent(agentContext))
    return { type: "subagent", agentName: agentContext.displayName ?? agentContext.subagentName, ...n };
  return;
}
/**
 * 构造 Chrome 权限卡片载荷：host/url（缺省从 input.url 解析）、域名是否已允许、auto 模式不可用提示、动词短语。
 */
//@ chunk-s4bxxzsw.js:10637-11137 placement
function buildChromePermissionPayload(e) {
  let r = buildPermissionPromptPayload(e),
    n = e.permissionResult.metadata?.command?.chrome,
    s = n ? { host: n.host, url: n.url } : void 0,
    y = n?.domainAllowed === !0,
    decisionReason = e.permissionResult.decisionReason,
    C =
      y &&
      n?.classifierUnavailable === !0 &&
      decisionReason?.type === "other" &&
      e.permissionResult.matchedAskRule === void 0 &&
      !r.isAskCappedByOrg;
  if (!s && typeof e.input.url === "string")
    try {
      let D = new URL(e.input.url);
      if (D.host) s = { host: D.host, url: D.href };
    } catch {}
  return {
    ...r,
    chrome: s,
    domainAllowed: y,
    grantNotice: C ? getAutoModeGrantBlockCause() : void 0,
    verbPhrase: describeBrowserToolAction(e.tool.name, e.input),
  };
}
/**
 * 读取 auto 模式不可用原因并转换为 {cause, files, startup, model} 结构供提示文案使用。
 */
//@ chunk-s4bxxzsw.js:11137-11582 placement
function getAutoModeGrantBlockCause() {
  switch (getAutoModeUnavailableReason()) {
    case "settings": {
      let e = getDisableAutoModeSettingSources();
      if (e.includes("policySettings"))
        return { cause: isAutoModeDisabledByPolicySettings() ? "organization" : "managed-settings" };
      return {
        cause: "settings",
        files: e.flatMap((r) => {
          if (r === "flagSettings") return [];
          let n = getSettingsFilePathForSource(r);
          return n === void 0 ? [] : [n];
        }),
        startup: e.includes("flagSettings"),
      };
    }
    case "model":
      return { cause: "model", model: renderModelName(getMainLoopModel()) };
    case "fast-mode":
      return { cause: "fast-mode" };
    case "circuit-breaker":
    case null:
      return { cause: "unavailable" };
  }
}
/**
 * 构建 WebFetch 权限卡片数据：在通用载荷上附加目标 URL 的主机名。
 */
//@ chunk-s4bxxzsw.js:11582-11712 placement
function buildWebFetchPermissionPayload(e) {
  let r = buildPermissionPromptPayload(e),
    url = e.input.url,
    s = "";
  if (typeof url === "string")
    try {
      s = new URL(url).hostname;
    } catch {
      s = "";
    }
  return { ...r, hostname: s };
}
/**
 * 构建 AskUserQuestion 权限卡片数据：问题列表、来源元数据，以及是否为引擎强制确认。
 */
//@ chunk-s4bxxzsw.js:11712-11999 placement
function buildAskUserQuestionPayload(e) {
  let r = buildPermissionPromptPayload(e),
    safeParse = AskUserQuestionTool.inputSchema.safeParse(e.input),
    s = safeParse.success ? (safeParse.data.questions ?? []) : [],
    y = safeParse.success ? safeParse.data.metadata?.source : void 0,
    R = e.permissionResult.forcedByCaller === !0 && e.requestSource === void 0 && Ao(e.toolUseID);
  return { ...r, questions: s, metadataSource: y, isEngineConfirm: R };
}
//@ chunk-s4bxxzsw.js:11999-12099 placement
function serializeMcpArgsDisplay(e) {
  if (!("args" in e) || e.args === void 0) return;
  return serializeApprovalPayload(e.args, { scrub: "key", maxUnits: MAX_PAYLOAD_UNITS });
}
/**
 * 构造 Monitor 权限卡片载荷：命令、MCP 服务器/工具/参数、WebSocket url 与子协议（不可显示的标记 withheld）、轮询间隔与描述。
 */
//@ chunk-s4bxxzsw.js:12099-12810 placement
function buildMonitorPermissionPayload(e) {
  let r = buildPermissionPromptPayload(e),
    n =
      typeof e.input.command === "string"
        ? serializeApprovalPayload(e.input.command, { maxUnits: MAX_PAYLOAD_UNITS })
        : void 0,
    s = readStringField(e.input.mcp, "server"),
    y = readStringField(e.input.mcp, "tool"),
    R =
      s !== void 0 && y !== void 0
        ? {
            server: _o(s, "(unnamed server)"),
            tool: _o(y, "(unnamed tool)"),
            argsDisplay: serializeMcpArgsDisplay(e.input.mcp),
          }
        : void 0,
    C = readStringField(e.input.ws, "url"),
    D = websocketSubprotocols(e.input.ws),
    S =
      C !== void 0
        ? {
            url: serializeApprovalPayload(v$t(C), { maxUnits: MAX_PAYLOAD_UNITS }),
            protocols: D?.map((h, w) => (w < IDr ? replaceLineBreaks(mat(truncateToLength(h, HH))) : "")),
            protocolsWithheld: D?.slice(0, IDr).some((h) => {
              let w = truncateToLength(h, HH);
              return markBrokenSequences(w) !== w;
            }),
          }
        : void 0,
    k = typeof e.input.interval_ms === "number" ? e.input.interval_ms : 30000,
    T = typeof e.input.description === "string" ? displayField(e.input.description).text : void 0;
  return { ...r, command: n, mcp: R, ws: S, intervalMs: k, monitorDescription: T };
}
//@ chunk-s4bxxzsw.js:12810-12895 placement
function _o(e, r) {
  let trimmed = replaceLineBreaks(P5e(truncateToLength(e, HH)))
    .replace(/\s+/g, " ")
    .trim();
  return isCleanText(trimmed) ? trimmed : r;
}
//@ chunk-s4bxxzsw.js:12895-13010 placement
function readStringField(e, r) {
  if (e === null || typeof e !== "object" || !(r in e)) return;
  let n = e[r];
  return typeof n === "string" ? n : void 0;
}
//@ chunk-s4bxxzsw.js:13010-13069 placement
function v$t(e) {
  try {
    return new URL(e).href;
  } catch {
    return e;
  }
}
/**
 * 构造 Workflow 权限卡片载荷：脚本（runId 时取渲染文本）、脚本是否被伪造为非字符串、工作流名、参数。
 */
//@ chunk-s4bxxzsw.js:13069-13672 placement
function buildWorkflowPermissionPayload(e) {
  let r = buildPermissionPromptPayload(e),
    n = typeof e.input.runId === "string" && typeof e.input.script !== "string",
    s =
      typeof e.input.script === "string"
        ? e.input.script
        : n && typeof r.renderedToolUseMessage === "string"
          ? r.renderedToolUseMessage
          : "",
    y = e.input.script !== void 0 && typeof e.input.script !== "string",
    R =
      typeof e.input.name === "string" &&
      e.input.name !== "" &&
      !e.input.scriptPath &&
      stripNonPrintable(e.input.name) === e.input.name
        ? e.input.name
        : void 0,
    C =
      typeof r.renderedToolUseMessage === "string"
        ? stripNonPrintable(r.renderedToolUseMessage)
        : r.renderedToolUseMessage,
    args = e.input.args;
  return { ...r, renderedToolUseMessage: C, script: s, scriptForged: y, workflowName: R, args: args };
}
/**
 * 构造 Artifact 权限卡片载荷：文件路径、标题与选项（过滤并安全化）、文件内容预览（网络路径/过大/不存在/读错误给出占位）。
 */
//@ chunk-s4bxxzsw.js:13672-14492 placement
function buildArtifactPermissionPayload(e) {
  let r = buildPermissionPromptPayload(e),
    n = typeof e.input.filePath === "string" ? e.input.filePath : "",
    s = typeof e.input.title === "string" ? e.input.title : "",
    y = $Rt(s) ? "" : safeLabel(s),
    mapped = (Array.isArray(e.input.options) ? e.input.options : [])
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
        label: $Rt(k.label) ? "" : safeLabel(k.label),
        description: displayField(k.description).text,
        value: k.value,
      })),
    D,
    S = !1;
  if (hl(n) || n_(n)) ((D = `(Network path \u2014 content not previewed: ${n})`), (S = !0));
  else
    try {
      D = readFileSync(n, BOUNDED_READ_MAX);
    } catch (error) {
      if (Cj(error)) D = `(Artifact too large for preview: ${n})`;
      else D = isENOENT(error) ? `(File not found: ${n})` : `(Error reading file: ${String(error)})`;
      S = !0;
    }
  return { ...r, filePath: n, artifactTitle: y, artifactOptions: mapped, fileContent: D, contentWithheld: S };
}
/**
 * 构造 Skill 权限卡片载荷：技能名（input.skill 或元数据命令名）、描述、转发的 MCP 技能名。
 */
//@ chunk-s4bxxzsw.js:14492-14995 placement
function buildSkillPermissionPayload(e) {
  let r = buildPermissionPromptPayload(e),
    metadata = e.permissionResult.metadata,
    s =
      metadata !== null &&
      typeof metadata === "object" &&
      "command" in metadata &&
      metadata.command !== null &&
      typeof metadata.command === "object"
        ? metadata.command
        : void 0,
    y = s !== void 0 && typeof s.name === "string" ? s.name : void 0,
    R = s !== void 0 && typeof s.description === "string" ? s.description : e.forwardedMcpSkill?.description,
    D = (typeof e.input.skill === "string" ? e.input.skill : void 0) ?? y ?? "";
  return {
    ...r,
    skill: D,
    skillDescription: R,
    ...(e.forwardedMcpSkill !== void 0 && { forwardedMcpSkill: { name: e.forwardedMcpSkill.name } }),
  };
}
/**
 * 构建 PowerShell 权限卡片数据：清理不可打印字符后的命令（有长度上限）与渲染的工具消息。
 */
//@ chunk-s4bxxzsw.js:14995-15256 placement
function buildPowerShellPermissionPayload(e) {
  let r = buildPermissionPromptPayload(e),
    n =
      typeof e.input.command === "string" && e.input.command.length <= MAX_PAYLOAD_UNITS
        ? stripNonPrintable(e.input.command)
        : "",
    s =
      typeof r.renderedToolUseMessage === "string"
        ? stripNonPrintable(r.renderedToolUseMessage)
        : r.renderedToolUseMessage;
  return { ...r, renderedToolUseMessage: s, command: n };
}
/**
 * 构造 ExitPlanMode 权限卡片载荷：当前计划、计划文件路径、本条助手消息的 token 用量。
 */
//@ chunk-s4bxxzsw.js:15256-15627 placement
function buildExitPlanModePermissionPayload(e) {
  let r = buildPermissionPromptPayload(e),
    n = getPlanFilePath();
  notePlanFileForgotten(n);
  let s = getPlan() ?? "",
    y = e.assistantMessage.isUnmetered === !0 ? void 0 : e.assistantMessage.message.usage,
    R;
  if (y && typeof y.input_tokens === "number") {
    let C = getTokenCountFromUsage(y);
    R = {
      input_tokens: C.input_tokens,
      cache_creation_input_tokens: C.cache_creation_input_tokens,
      cache_read_input_tokens: C.cache_read_input_tokens,
    };
  }
  return { ...r, plan: s, planFilePath: n, usage: R };
}
/**
 * 构造 Bash 权限卡片载荷：命令（过长置空、去不可打印字符）、分类器状态、已有允许规则描述。
 */
//@ chunk-s4bxxzsw.js:15627-15952 placement
function buildBashPermissionPayload(e) {
  let r = buildPermissionPromptPayload(e),
    n =
      typeof e.input.command === "string" && e.input.command.length <= MAX_PAYLOAD_UNITS
        ? stripNonPrintable(e.input.command)
        : "",
    s =
      typeof r.renderedToolUseMessage === "string"
        ? stripNonPrintable(r.renderedToolUseMessage)
        : r.renderedToolUseMessage;
  return {
    ...r,
    renderedToolUseMessage: s,
    command: n,
    classifierState: e.classifierState,
    existingAllowDescriptions: [],
  };
}
//@ chunk-s4bxxzsw.js:15952-16238 placement
var buildPublishPluginCard = (e) => ({
  question: IOr(e.title),
  lines: [
    `Folder: ${printableOrEmpty(e.folder)}`,
    `Sends ${e.sends.files} ${plural(e.sends.files, "file")}, ` + formatFileSize(e.sends.bytes),
    ...e.warnings,
    ...staysOnMachineLines(e.staying),
    ...e.steps,
    ...manifestWriteLines(e.writes),
  ].map(IOr),
  values: e.files
    .map(Y0s)
    .concat(cTo(e.unnamed?.files ?? 0, "file"))
    .map(IOr),
});
/**
 * 构建发布插件权限卡片数据：卡片内容与全部条目（优先取会话缓存，否则从输入问题解析）。
 */
//@ chunk-s4bxxzsw.js:16238-16429 placement
function buildPublishPluginPayload(e) {
  let r = e.session && AWn.of(e.session).get(e.toolUseID),
    n = PUBLISH_PLUGIN_INPUT_SCHEMA().safeParse(e.input).data?.question;
  return {
    ...buildPermissionPromptPayload(e),
    card: r?.card ?? (n && buildPublishPluginCard(n)),
    everything: r?.everything ?? (n ? manifestEntryLines(n) : []),
  };
}
//@ chunk-s4bxxzsw.js:16429-16439 placement
var QHi = 6;
//@ chunk-s4bxxzsw.js:16439-16450 placement
var CHROME_ROWS = 14;
//@ chunk-s4bxxzsw.js:16450-16736 placement
var PUBLISH_PLUGIN_PERMISSION_CARD = withHideWhile({
  kind: "permission_publish_plugin",
  payload: DoctorLazy(() =>
    Fh(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "requestId" in e &&
        "toolName" in e &&
        "permissionResult" in e &&
        "everything" in e,
    ),
  ),
  result: DoctorLazy(() => Fh((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: { behavior: "cancelled" },
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
    Fh(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "requestId" in e &&
        "toolName" in e &&
        "permissionResult" in e &&
        "plan" in e,
    ),
  ),
  result: DoctorLazy(() => Fh((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: { behavior: "cancelled" },
});
//@ chunk-s4bxxzsw.js:17129-17426 placement
var FILE_PERMISSION_CARD = withHideWhile({
  kind: "permission_file",
  payload: DoctorLazy(() =>
    Fh(
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
  result: DoctorLazy(() => Fh((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: { behavior: "cancelled" },
});
//@ chunk-s4bxxzsw.js:17486-17865 placement
var OUTSIDE_READS_TITLE = "Read outside the working directories",
  oo = "Allow this read outside the working directories?",
  Ze = ["allow", "block", "ask_again", "allow_once"],
  T$t = {
    allow: "Yes, and keep allowing any reads outside the working directories",
    block: "No, and block reads outside the working directories from now on",
    ask_again: "No, and ask again next time",
    allow_once: "Yes, but ask again next time",
  };
/**
 * 工作目录外读取对话框的说明文字，按沙箱是否能隔离 home 目录给出不同提示。
 */
//@ chunk-s4bxxzsw.js:17865-18623 placement
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
      toolName: o(),
      path: o(),
      title: o(),
      question: o(),
      explainer: o(),
      options: A(u({ value: U(Ze), label: o() })),
    }),
  ),
  result: DoctorLazy(() => U(Ze)),
  default: "ask_again",
});
/**
 * 构建"读取工作区外文件"对话框数据：标题、问题、说明（区分沙箱隔离）与选项。
 */
//@ chunk-s4bxxzsw.js:18824-18983 placement
function buildOutsideReadsDialog({ toolName: toolName, path: path, sandboxFenced: sandboxFenced }) {
  return {
    toolName: toolName,
    path: path,
    title: OUTSIDE_READS_TITLE,
    question: oo,
    explainer: getOutsideReadsExplainer(sandboxFenced),
    options: Ze.map((s) => ({ value: s, label: T$t[s] })),
  };
}
//@ chunk-s4bxxzsw.js:18983-18997 placement
var Ie = 200000;
/**
 * 判断工具是否为文件类工具（编辑、写入、Notebook、Glob、Grep、读取）。
 */
//@ chunk-s4bxxzsw.js:18997-19099 placement
function isFileTool(e) {
  switch (e) {
    case FileEditTool:
    case FileWriteTool:
    case NotebookEditTool:
    case GlobTool:
    case GrepTool:
    case FileReadTool:
      return !0;
    default:
      return !1;
  }
}
//@ chunk-s4bxxzsw.js:19099-19177 placement
function C0s(e) {
  switch (e) {
    case FileEditTool:
    case FileWriteTool:
    case NotebookEditTool:
      return !0;
    default:
      return !1;
  }
}
/**
 * 调用工具的 getPath 获取输入中的路径，非空字符串时返回，出错返回 null。
 */
//@ chunk-s4bxxzsw.js:19177-19332 placement
function getToolInputPath(e, r) {
  try {
    let n = e;
    if (typeof n.getPath !== "function") return null;
    let path = n.getPath(r);
    return typeof path === "string" && path !== "" ? path : null;
  } catch {
    return null;
  }
}
//@ chunk-s4bxxzsw.js:19332-19577 placement
function resolveSymlinkTarget(e, r, n) {
  if (r) return { target: null, unchecked: !1 };
  if (n !== void 0) return { target: n, unchecked: !1 };
  try {
    let s = walkPermissionCheckPaths(expandPath(e));
    if (s.unresolved) return { target: null, unchecked: !0 };
    return { target: symlinkLanding(s), unchecked: !1 };
  } catch {
    return { target: null, unchecked: !0 };
  }
}
//@ chunk-s4bxxzsw.js:19577-19620 placement
function No(e, r) {
  return hr(r ? e : relative(getCwd(), e));
}
//@ chunk-s4bxxzsw.js:19620-19671 placement
function io(e, r) {
  return hr(r ? posix.basename(e) : basename(e));
}
/**
 * 为 Edit/Write/NotebookEdit 等文件工具构造权限卡片：标题、文件名问题、diff 或占位说明；内容过大、含可疑字符、网络路径、远程不可读时标记 contentWithheld（仅一次性批准）。
 */
//@ chunk-s4bxxzsw.js:19671-24519 placement
async function buildFileToolPermissionCard(request) {
  let { tool: parsed, input: tooLarge, remoteWorkspace: suspicious, remoteOldContent: withheld } = request;
  if (parsed === FileEditTool) {
    let parse = FileEditTool.inputSchema.parse(tooLarge),
      S = parse.old_string.length > Ie || parse.new_string.length > Ie,
      k = !S && (hasSuspiciousText(parse.old_string) || hasSuspiciousText(parse.new_string)),
      T = S || k;
    return {
      title: "Edit file",
      subtitle: No(parse.file_path, suspicious),
      question: {
        kind: "file-action",
        verbPhrase: "make this edit to",
        fileName: io(parse.file_path, suspicious),
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
              filePath: parse.file_path,
              edits: [
                {
                  old_string: parse.old_string,
                  new_string: parse.new_string,
                  replace_all: parse.replace_all || !1,
                },
              ],
              remoteOldContent: withheld ?? void 0,
              skipLocalRead: suspicious,
            },
      contentWithheld: T,
    };
  }
  if (parsed === FileWriteTool) {
    let parse = FileWriteTool.inputSchema.parse(tooLarge),
      S = "",
      k = !1,
      T = !1,
      h,
      w;
    if (suspicious)
      if (typeof withheld === "string") ((S = withheld), (k = !0), (h = "Overwrite file"), (w = "overwrite"));
      else if (withheld === null) ((h = "Create file"), (w = "create"));
      else ((h = "Write file"), (w = "write to"), (T = !0));
    else {
      let q = ai(parse.file_path) || n_(parse.file_path);
      if (!q)
        try {
          ((S = tv((await readFileChecked(parse.file_path, BOUNDED_READ_MAX)).content)), (k = !0));
        } catch (error) {
          if (Cj(error)) ((k = !0), (T = !0));
          else if (!isENOENT(error) && !bde(error)) throw error;
        }
      if (q) ((T = !0), (h = "Write file"), (w = "write to"));
      else ((h = k ? "Overwrite file" : "Create file"), (w = k ? "overwrite" : "create"));
    }
    let B = parse.content.length > Ie,
      F = !B && hasSuspiciousText(parse.content),
      P = B || F,
      E = k && ubi(S),
      V = k && !E && hasSuspiciousText(S),
      x = P || T || E || V;
    return {
      title: h,
      subtitle: No(parse.file_path, suspicious),
      question: { kind: "file-action", verbPhrase: w, fileName: io(parse.file_path, suspicious) },
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
                  ? `Existing file is too large to preview \u2014 approving will overwrite ${hr(parse.file_path)}.`
                  : suspicious
                    ? `The remote file could not be checked \u2014 approving will write to ${hr(parse.file_path)}.`
                    : `File may be on a network path, so it was not previewed \u2014 approving will write to ${hr(parse.file_path)}.`,
              }
            : E
              ? {
                  kind: "no-changes",
                  message: `Current contents of ${hr(parse.file_path)} cannot be shown in full \u2014 the overwrite cannot be reviewed, so approval is one-time only (deny unless expected).`,
                }
              : {
                  kind: "file-write-diff",
                  filePath: parse.file_path,
                  content: parse.content,
                  fileExists: k,
                  oldContent: S,
                  ...(V && {
                    notice: `Current contents of ${hr(parse.file_path)} cannot be shown in full \u2014 the overwrite cannot be fully reviewed, so approval is one-time only (deny unless expected).`,
                  }),
                },
      contentWithheld: x,
    };
  }
  if (parsed === NotebookEditTool) {
    let parse = NotebookEditTool.inputSchema.parse(tooLarge),
      S =
        parse.edit_mode === "insert"
          ? "insert this cell into"
          : parse.edit_mode === "delete"
            ? "delete this cell from"
            : "make this edit to",
      k = (parse.new_source?.length ?? 0) > Ie || hasSuspiciousText(parse.new_source ?? ""),
      T = parse.edit_mode !== "insert",
      h,
      w;
    if (T)
      if (suspicious)
        if (typeof withheld === "string") {
          let F = findNotebookCellSource(withheld, parse.cell_id);
          if (F.kind === "found")
            if (F.source.length > Ie || hasSuspiciousText(F.source))
              w = "the current cell contents cannot be shown in full";
            else h = F.source;
          else
            w =
              F.kind === "unparsable"
                ? "the notebook could not be parsed for preview"
                : "the target cell was not found in the notebook";
        } else if (withheld === null) w = "the notebook was not found in the remote workspace";
        else w = "the remote notebook could not be fetched";
      else if (ai(parse.notebook_path) || n_(parse.notebook_path))
        w = "the notebook may be on a network path";
      else
        try {
          if (!(await getFsImplementation().stat(parse.notebook_path)).isFile())
            w = "the notebook could not be read";
          else {
            let fileBytes = await getFsImplementation().readFileBytes(parse.notebook_path, SW + 1);
            if (fileBytes.length > SW) w = "the notebook is too large to preview";
            else {
              let E = findNotebookCellSource(fileBytes.toString("utf-8"), parse.cell_id);
              if (E.kind === "found")
                if (E.source.length > Ie || hasSuspiciousText(E.source))
                  w = "the current cell contents cannot be shown in full";
                else h = E.source;
              else
                w =
                  E.kind === "unparsable"
                    ? "the notebook could not be parsed for preview"
                    : "the target cell was not found in the notebook";
            }
          }
        } catch {
          w = "the notebook could not be read";
        }
    let B = k || w !== void 0;
    return {
      title: "Edit notebook",
      subtitle: void 0,
      question: { kind: "file-action", verbPhrase: S, fileName: io(parse.notebook_path, suspicious) },
      content: k
        ? {
            kind: "no-changes",
            message:
              "Proposed cell content is too large to show \u2014 cannot be reviewed, so approval is one-time only (deny unless expected).",
          }
        : w !== void 0
          ? {
              kind: "no-changes",
              message: `Current cell contents cannot be shown (${w}) \u2014 the ${parse.edit_mode === "delete" ? "deletion" : "edit"} cannot be reviewed, so approval is one-time only (deny unless expected).`,
            }
          : {
              kind: "notebook-edit-diff",
              notebookPath: parse.notebook_path,
              cellId: parse.cell_id,
              newSource: parse.new_source,
              cellType: parse.cell_type,
              editMode: parse.edit_mode,
              remoteOldContent: withheld ?? void 0,
              skipLocalRead: suspicious,
              oldCellSource: h,
            },
      contentWithheld: B,
    };
  }
  return {
    title: `${parsed.isReadOnly(tooLarge) ? "Read" : "Edit"} file`,
    subtitle: void 0,
    question: { kind: "plain", text: "Do you want to proceed?" },
    content: { kind: "tool-use-line" },
  };
}
//@ chunk-s4bxxzsw.js:24519-25254 placement
async function buildFilePermissionDescriptor(e) {
  let r = buildPermissionPromptPayload(e),
    tool = e.tool;
  if (!isFileTool(tool))
    throw Error(`buildFilePermissionDescriptor called with non-file tool: ${e.tool.name}`);
  let s = e.remoteWorkspace === !0,
    y = tool.isReadOnly(e.input) ? "read" : "write",
    {
      title: title,
      subtitle: subtitle,
      question: question,
      content: content,
      contentWithheld: contentWithheld,
    } = await buildFileToolPermissionCard({
      tool: tool,
      input: e.input,
      remoteWorkspace: s,
      remoteOldContent: e.remoteOldContent,
    }),
    T = resolveSymlinkTarget(e.filePath, s, e.permissionResult.blockedPath),
    offersBlockOutsideReads = e.permissionResult.offersBlockOutsideReads,
    w =
      y === "write" &&
      !s &&
      (tool === FileEditTool || tool === FileWriteTool) &&
      (await labelsMemoryItem(e.filePath));
  return {
    ...r,
    ...(w && { memoryItemHeader: w }),
    title: offersBlockOutsideReads ? OUTSIDE_READS_TITLE : title,
    subtitle: subtitle,
    question: offersBlockOutsideReads ? { kind: "plain", text: oo } : question,
    content: content,
    contentWithheld: contentWithheld,
    filePath: e.filePath,
    operationType: y,
    symlinkTarget: T.target,
    ...(T.unchecked && { symlinkUnchecked: !0 }),
  };
}
/**
 * 按工具类型返回权限卡片遥测用的补全类型与语言：编辑为 str_replace_single、写入为 write_file_single、Notebook 按单元类型取 markdown/python，其他为 tool_use_single。
 */
//@ chunk-s4bxxzsw.js:25254-25605 placement
function getCompletionTypeForTool(e, r, n) {
  if (e === FileEditTool)
    return { completion_type: "str_replace_single", language_name: languageForFilePath(n) };
  if (e === FileWriteTool)
    return { completion_type: "write_file_single", language_name: languageForFilePath(n) };
  if (e === NotebookEditTool)
    return {
      completion_type: "tool_use_single",
      language_name: r.cell_type === "markdown" ? lit("markdown") : lit("python"),
    };
  return { completion_type: "tool_use_single", language_name: languageForFilePath(n) };
}
//@ chunk-s4bxxzsw.js:25605-25884 placement
var MONITOR_PERMISSION_CARD = withHideWhile({
  kind: "permission_monitor",
  payload: DoctorLazy(() =>
    Fh(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "requestId" in e &&
        "toolName" in e &&
        "permissionResult" in e &&
        "intervalMs" in e,
    ),
  ),
  result: DoctorLazy(() => Fh((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: { behavior: "cancelled" },
});
//@ chunk-s4bxxzsw.js:25884-26163 placement
var POWERSHELL_PERMISSION_CARD = withHideWhile({
  kind: "permission_powershell",
  payload: DoctorLazy(() =>
    Fh(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "requestId" in e &&
        "toolName" in e &&
        "permissionResult" in e &&
        "command" in e,
    ),
  ),
  result: DoctorLazy(() => Fh((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: { behavior: "cancelled" },
});
//@ chunk-s4bxxzsw.js:26163-26435 placement
var SKILL_PERMISSION_CARD = withHideWhile({
  kind: "permission_skill",
  payload: DoctorLazy(() =>
    Fh(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "requestId" in e &&
        "toolName" in e &&
        "permissionResult" in e &&
        "skill" in e,
    ),
  ),
  result: DoctorLazy(() => Fh((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: { behavior: "cancelled" },
});
//@ chunk-s4bxxzsw.js:26435-26713 placement
var WEBFETCH_PERMISSION_CARD = withHideWhile({
  kind: "permission_webfetch",
  payload: DoctorLazy(() =>
    Fh(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "requestId" in e &&
        "toolName" in e &&
        "permissionResult" in e &&
        "hostname" in e,
    ),
  ),
  result: DoctorLazy(() => Fh((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: { behavior: "cancelled" },
});
//@ chunk-s4bxxzsw.js:26713-26748 placement
var Lo = createLazySignal(() => uiSignals.autoDenyPresence);

export {
  QHi,
  buildPermissionPromptPayload,
  BROWSER_PERMISSION_CARD,
  isFileTool,
  getToolInputPath,
  buildFilePermissionDescriptor,
  C0s,
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
  v$t,
  splitQuestionTitleBody,
  describeAutoModeGrantBlock,
  T$t,
  getOutsideReadsExplainer,
  permissionRequestOrigin,
  getCompletionTypeForTool,
  Lo,
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
