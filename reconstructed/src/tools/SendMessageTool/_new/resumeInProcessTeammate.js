/**
 * tools/SendMessageTool/_new/resumeInProcessTeammate.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-astf3mhy.js (9)
 * attribution: sole-consumer-new 9
 */
import { normalizeNameForMCP } from "../../../services/mcp/normalization.js";
import { CCD_SESSION_MGMT } from "../constants.js";
import { findToolByName, toolMatchesName } from "../../../Tool.js";
import { getPromptIndex, isDiskless } from "../../../bootstrap/state.js";
import { DEFAULT_PEER_GUARD_LIMITS } from "../../../utils/udsMessaging/peerGuard.js";
import { runToolUse, hasTypeField } from "../../../services/tools/toolExecution.js";
import { getServerUrl } from "../../../services/artifacts/durableWatch.js";
import { isClaudeCodeRemoteServer } from "../../../services/mcp/agentRequestMeta.js";
import { hasIsolatePeerMachines } from "../../../utils/settings/settings.js";
import { buildMcpToolName } from "../../../services/mcp/mcpStringUtils.js";
import { CLAUDE_CODE_REMOTE, SEND_MESSAGE as SEND_MESSAGE_2 } from "../../../services/mcp/ccrMetaMcp.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { logError } from "../../../utils/log.js";
import { readAgentMetadata, getAgentTranscript } from "../../../utils/sessionStorage.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isAbortError,
  errorMessage,
  AbortError,
} from "../../../utils/errors.js";
import { TEAMMATES_UNAVAILABLE_MESSAGE } from "../../../utils/swarm/constants.js";
import { getTeamName } from "../../../utils/teammate.js";
import { AGENT_METADATA_ID_RE, sanitizeMetadataText } from "../../../utils/agentMetadata.js";
import { LD } from "../../../utils/sessionAddresses.js";
import { cKe } from "../../../utils/conversationRecovery.js";
import {
  filterThinkingOnlyUntilStable,
  normalizeMessagesForResume,
  regroupSplitResponsesOnResume,
} from "../../../utils/messages.js";
import {
  dropApiInvalidAssistantBlocks,
  dropMalformedAttachments,
} from "../../../utils/transcript/deserialize.js";
import { reconstructForSubagentResume } from "../../../utils/toolResultStorage.js";
import { isBuiltInAgent, loadListedAgentDefinition } from "../../AgentTool/loadAgentsDir.js";
import { getDispatchableAgents } from "../../../utils/permissions/permissions.js";
import {
  getToolPermissionContext,
  getMainLoopModel,
} from "../../../utils/permissions/toolPermissionContext.js";
import { logForDebugging } from "../../../utils/debug.js";
import { replaceControlChars } from "../../../utils/resultError.js";
import { isAgentDefinitionTrusted, NFo, agentFolderTrustHint } from "../../AgentTool/agentTrust.js";
import { ignoresPersistedTrust } from "../../../utils/config.js";
import { runResumeStartHooks, pluginDeclinedResumeMessage } from "../../AgentTool/agentLaunch.js";
import { UIr } from "../../../utils/swarm/teammateAgentIdentity.js";
import {
  markMessagesAsReadByPredicate,
  isStructuredProtocolMessage,
} from "../../../utils/teammateMailbox.js";
import { resolveSpawnProvenanceMarks } from "../../../plugins/functionHooks/agentHooks.js";
import { PERMISSION_MODES } from "../../../types/permissions.js";
import { updateTeamFile } from "../../../utils/swarm/teamHelpers.js";
import { getCwd } from "../../../utils/cwd.js";
import { parseUserSpecifiedModel } from "../../../utils/model/modelDisplay.js";

//@ chunk-astf3mhy.js:14508-14570 sole-consumer-new
var SEND_MESSAGE = "send_message",
  Gt = `mcp__${normalizeNameForMCP(CCD_SESSION_MGMT)}__${normalizeNameForMCP(SEND_MESSAGE)}`,
  st = 1000;
//@ chunk-astf3mhy.js:14570-14783 sole-consumer-new
function findDesktopSendTool(s) {
  let { tools: tools, toolAliases: toolAliases } = s,
    filtered = tools.filter(
      (y) =>
        y.mcpInfo?.serverName === CCD_SESSION_MGMT &&
        y.mcpInfo.toolName === SEND_MESSAGE &&
        y.mcpInfo.serverType === "sdk",
    ),
    a = filtered.length === 1 ? filtered[0] : void 0;
  if (!a || findToolByName(tools, a.name, toolAliases) !== a) return;
  return a;
}
//@ chunk-astf3mhy.js:14783-14833 sole-consumer-new
class us {
  promptIndexSeen = -1;
  forwardsSincePrompt = 0;
}
/**
 * 解析 Claude Desktop 转发工具：不可用时返回 unavailable；同一提示内自转发次数超过上限时返回 loop-paused。
 */
//@ chunk-astf3mhy.js:14833-15135 sole-consumer-new
function resolveDesktopForward(s) {
  let h = findDesktopSendTool(s);
  if (!h) return { kind: "unavailable" };
  let e = s.toolState.get(us),
    r = getPromptIndex();
  if (r !== e.promptIndexSeen) ((e.promptIndexSeen = r), (e.forwardsSincePrompt = 0));
  if ((e.forwardsSincePrompt++, e.forwardsSincePrompt > DEFAULT_PEER_GUARD_LIMITS.maxSelfHops))
    return { kind: "loop-paused", forwards: e.forwardsSincePrompt - 1 };
  return { tool: h };
}
/**
 * 通过 Claude Desktop 的会话管理 SendMessage 工具转发消息：以合成的 tool_use 运行该工具（权限检查计时、钩子延迟处理），收集附件与结果，返回 sent/refused。
 */
//@ chunk-astf3mhy.js:15135-16537 sole-consumer-new
async function forwardToDesktop({
  tool: tool,
  sessionId: sessionId,
  message: message,
  toolUseContext: toolUseContext,
  canUseTool: canUseTool,
  assistantMessage: assistantMessage,
}) {
  let b = {
      type: "tool_use",
      id: `${toolUseContext.toolUseId ?? "sendmessage"}_desktop`,
      name: tool.name,
      input: { session_id: sessionId, message: message },
      caller: { type: "direct" },
    },
    S = 0,
    N = async (x, re, se, ...ge) => {
      let now = Date.now();
      try {
        return await canUseTool(
          x,
          re,
          Object.keys(re).length !== 2 || re.session_id !== sessionId || re.message !== message
            ? { ...se, desktopForwardToolUseId: void 0 }
            : se,
          ...ge,
        );
      } finally {
        S += Date.now() - now;
      }
    },
    P,
    w = [],
    F = !1;
  for await (let x of runToolUse(
    b,
    assistantMessage,
    N,
    toolUseContext.autoModeClassified === !0 && toolUseContext.toolUseId !== void 0
      ? { ...toolUseContext, desktopForwardToolUseId: b.id }
      : toolUseContext,
    () => new Date().toISOString(),
  )) {
    if (hasTypeField(x)) continue;
    if (x.message.type === "attachment") {
      if (x.message.attachment.type === "hook_deferred_tool") F = !0;
      else w.push(x.message);
      continue;
    }
    if (x.message.type !== "user") continue;
    let content = x.message.message.content;
    if (!Array.isArray(content)) continue;
    for (let se of content) if (se.type === "tool_result" && se.tool_use_id === b.id) P = se;
  }
  let q = S >= st;
  if (!P)
    return {
      kind: "refused",
      message: F
        ? "a hook deferred Claude Desktop's messaging tool, so nothing was sent; send it again when you are ready (a forwarded send cannot be resumed later)."
        : "the send did not run (interrupted).",
      attachments: w,
      deferredByHook: F,
      blockedWait: q,
    };
  let ee = toolResultToText(P);
  return P.is_error
    ? {
        kind: "refused",
        message: ee || "Claude Desktop reported an error.",
        attachments: w,
        deferredByHook: F,
        blockedWait: q,
      }
    : { kind: "sent", detail: ee, attachments: w, deferredByHook: F, blockedWait: q };
}
//@ chunk-astf3mhy.js:16537-16706 sole-consumer-new
function toolResultToText(s) {
  let { content: content } = s;
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .flatMap((e) => (e.type === "text" ? [e.text] : []))
    .join(
      `
`,
    )
    .trim();
}
/**
 * 查找远程会话的 SendMessage MCP 工具：要求服务器唯一、工具唯一且与服务器配置一致、未隐藏，且功能开关开启，返回工具名。
 */
//@ chunk-astf3mhy.js:16706-17125 sole-consumer-new
function findRemoteSendTool(s, h, e) {
  try {
    let r = h(),
      a = getServerUrl(r);
    if (
      a === null ||
      !isClaudeCodeRemoteServer(a) ||
      r.some((N) => N !== a && N.name === a.name) ||
      hasIsolatePeerMachines()
    )
      return;
    let y = buildMcpToolName(CLAUDE_CODE_REMOTE, SEND_MESSAGE_2),
      filtered = s.filter((N) => toolMatchesName(N, y)),
      S = filtered[0]?.mcpInfo;
    if (
      filtered.length !== 1 ||
      (e !== void 0 && Object.hasOwn(e, y)) ||
      S?.serverName !== a.name ||
      S.toolName !== SEND_MESSAGE_2 ||
      S.scope !== a.config.scope ||
      S.serverType !== a.config.type ||
      S.hiddenFromModel === !0
    )
      return;
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_flickering_lagoon", !1) ? y : void 0;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-astf3mhy.js:17125-17218 sole-consumer-new
async function fs(s, h) {
  let e = await readAgentMetadata(s, h);
  return e?.taskKind === "in_process_teammate" ? e : null;
}
/**
 * 恢复进程内队友：校验团队与名字，加载其转录并规范化，按记录的自定义 agent 类型尝试恢复定义（不可派生或来源不可信时退化为基础工具并说明），运行恢复钩子后重新启动队友。
 */
//@ chunk-astf3mhy.js:17218-22929 sole-consumer-new
async function resumeInProcessTeammate({
  resumableAgentId: resumableAgentId,
  prompt: prompt,
  senderName: senderName,
  meta: meta,
  fallbackName: fallbackName,
  toolUseContext: toolUseContext,
}) {
  if (isDiskless())
    throw (
      logFeatureBad("swarm_in_process_resume", "diskless"),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        TEAMMATES_UNAVAILABLE_MESSAGE,
        "teammate resume refused in a session with no disk",
      )
    );
  let b = meta.name ?? fallbackName,
    S = meta.teamName ?? getTeamName(toolUseContext.getAppState().teamContext);
  if (!b || !S)
    throw (
      logFeatureBad("swarm_in_process_resume", "no_team_context"),
      Error("Cannot resume teammate: no team is active in this session")
    );
  if (typeof b !== "string" || !AGENT_METADATA_ID_RE.test(b) || LD(b))
    throw (
      logFeatureBad("swarm_in_process_resume", "unclaimable_name"),
      Error(
        "Cannot resume teammate: its recorded name is reserved, looks like an agent id, or is not a valid name",
      )
    );
  let N = sanitizeMetadataText(meta.description),
    P = sanitizeMetadataText(meta.spawnedAgentType ?? meta.customAgentType),
    w,
    F = await getAgentTranscript(resumableAgentId, toolUseContext.storageV5, {
      signal: toolUseContext.abortController.signal,
    }).catch((J) => {
      if (isAbortError(J)) throw J;
      throw (
        logFeatureBad("swarm_in_process_resume", "transcript_load_failed"),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Cannot resume teammate: ${errorMessage(J)}`,
          "Cannot resume teammate: its transcript could not be loaded",
        )
      );
    });
  if (toolUseContext.abortController.signal.aborted) throw new AbortError();
  if (F) cKe(F.messages);
  if (!F || F.messages.length === 0) w = "no_transcript";
  let q = F
      ? filterThinkingOnlyUntilStable(
          normalizeMessagesForResume(
            regroupSplitResponsesOnResume(
              dropApiInvalidAssistantBlocks(dropMalformedAttachments(F.messages), { site: "agent_resume" }),
            ),
          ),
        )
      : [],
    ee = reconstructForSubagentResume(
      toolUseContext.contentReplacementState,
      q,
      F?.contentReplacements ?? [],
    ),
    x,
    re;
  if (meta.customAgentType) {
    let found = toolUseContext.options.agentDefinitions.activeAgents.find(
        (activeAgent) => activeAgent.agentType === meta.customAgentType && !isBuiltInAgent(activeAgent),
      ),
      ye =
        found !== void 0 &&
        (
          await getDispatchableAgents(
            [found],
            toolUseContext.options.agentDefinitions.allowedAgentTypes,
            getToolPermissionContext(toolUseContext),
            toolUseContext,
          )
        ).length === 0,
      le;
    try {
      le = found && !ye ? await loadListedAgentDefinition(found, void 0) : void 0;
    } catch (error) {
      logForDebugging(
        `[resumeInProcessTeammate] agent '${replaceControlChars(meta.customAgentType)}' did not load from its plugin: ${errorMessage(error)}`,
        { level: "error" },
      );
    }
    if (ye)
      ((re =
        "Its agent definition was not restored: that agent type can no longer be spawned in this session (a permission rule, this agent's own allowed agent types or a plugin excludes it), so the teammate is running with the team-essential tools and no custom instructions."),
        logForDebugging(
          `[resumeInProcessTeammate] not restoring agent '${replaceControlChars(meta.customAgentType)}': a deny rule, the Agent(x,y) allowlist or an agent.offer hook excludes it`,
          { level: "error" },
        ),
        (w = "agent_type_withheld"));
    else if (le)
      if (isAgentDefinitionTrusted(le)) x = le;
      else {
        let me = NFo(le),
          Se = me ? replaceControlChars(me) : "the current workspace";
        ((re =
          `Its agent definition was not restored: the folder its definition file came from is not trusted (source: ${le.source}), so the teammate is running with the team-essential tools and no custom instructions. ` +
          (ignoresPersistedTrust()
            ? "It cannot be restored in this session, which ignores workspace trust records (CLAUDE_CODE_IGNORE_PERSISTED_TRUST is set); do not change trust settings or agent definitions on the user's behalf."
            : "To restore it, the user needs to run Claude Code in that folder once and accept the trust dialog (the --debug log names the folder); do not change trust settings on the user's behalf.")),
          logForDebugging(
            `[resumeInProcessTeammate] not restoring agent '${replaceControlChars(le.agentType)}': the folder its definition file came from (${Se}) is not trusted (source: ${le.source}). ${agentFolderTrustHint(le)}`,
            { level: "error" },
          ),
          (w = "agent_type_untrusted"));
      }
    else w = "agent_type_unresolved";
    if (!x)
      x = {
        agentType: meta.customAgentType,
        whenToUse: "",
        tools: [],
        getSystemPrompt: () => "",
        source: "projectSettings",
      };
  }
  let se = typeof meta.model === "string" ? meta.model : void 0,
    ge = await runResumeStartHooks(resumableAgentId, {
      tool_use_id: toolUseContext.toolUseId ?? "",
      parentModel: getMainLoopModel(toolUseContext),
      parentAgentId: toolUseContext.agentId,
      signal: toolUseContext.abortController.signal,
      origin: toolUseContext.hookOrigin,
      agent: x !== void 0 && (w === void 0 || w === "no_transcript") ? x : UIr(P),
      prompt: prompt,
      description: N ?? "(resumed)",
      model: se,
      permissionMode: getToolPermissionContext(toolUseContext).mode,
      background: !0,
      fork: !1,
      isTeammate: !0,
      name: b,
      cwd: void 0,
    });
  using starting = ge.starting;
  if (ge.deny !== void 0)
    throw (
      logFeatureBad("swarm_in_process_resume", "denied_by_hook"),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        pluginDeclinedResumeMessage(ge.deny),
        "Subagent resume denied by a plugin",
      )
    );
  if (
    !(await markMessagesAsReadByPredicate(
      b,
      (J) => isStructuredProtocolMessage(J.text),
      S,
      toolUseContext.storageV5,
    ))
  )
    logForDebugging(
      `[resumeInProcessTeammate] stale protocol-frame drop for ${b} did not land; the resumed runner may see stale protocol frames`,
      { level: "warn" },
    );
  let ie = resolveSpawnProvenanceMarks(resumableAgentId, meta, toolUseContext),
    ke = { ...toolUseContext, ...ie.marks },
    { spawnInProcessTeammate: spawnInProcessTeammate } = require("./chunk-wwmbv6ep.js"),
    { startInProcessTeammate: startInProcessTeammate } = require("./chunk-q2kyba1e.js"),
    oe = await spawnInProcessTeammate(
      {
        name: b,
        teamName: S,
        prompt: prompt,
        description: N,
        shownPrompt: N,
        spawnedWith: {
          description: N,
          agentType: P,
          parentAgentId: sanitizeMetadataText(meta.parentAgentId),
        },
        color: meta.color,
        planModeRequired: meta.planModeRequired ?? !1,
        model: meta.model,
        permissionMode:
          meta.permissionMode !== void 0 &&
          meta.permissionMode !== "bypassPermissions" &&
          PERMISSION_MODES.includes(meta.permissionMode)
            ? meta.permissionMode
            : void 0,
        resumableAgentId: resumableAgentId,
      },
      ke,
    );
  if (!oe.ok)
    throw (
      logFeatureBad("swarm_in_process_resume", "spawn_failed"),
      logForDebugging(`[resumeInProcessTeammate] spawn failed: ${oe.error}`),
      Error("Failed to respawn in-process teammate")
    );
  if (
    (ie.admit(),
    await updateTeamFile(
      S,
      (J) => {
        let found = J.members.find((member) => member.agentId === oe.agentId);
        if (found) {
          found.joinedAt = Date.now();
          return;
        }
        J.members.push({
          agentId: oe.agentId,
          name: b,
          color: meta.color,
          agentType: meta.customAgentType,
          planModeRequired: meta.planModeRequired,
          joinedAt: Date.now(),
          tmuxPaneId: "in-process",
          cwd: getCwd(),
          subscriptions: [],
          backendType: "in-process",
        });
      },
      void 0,
      toolUseContext.storageV5,
    ).catch((J) => logForDebugging(`[resumeInProcessTeammate] team file re-add failed (ad-hoc team?): ${J}`)),
    toolUseContext.agentLifecycle.setTeammate(oe.agentId, {
      name: b,
      color: meta.color,
      agentType: meta.customAgentType,
      tmuxSessionName: "in-process",
      tmuxPaneId: "in-process",
      cwd: getCwd(),
      spawnedAt: Date.now(),
    }),
    startInProcessTeammate({
      identity: oe.identity,
      taskId: oe.taskId,
      prompt: prompt,
      initialFrom: senderName,
      description: N,
      spawnedAgentType: P,
      agentDefinition: x,
      model: meta.model,
      teammateContext: oe.teammateContext,
      toolUseContext: { ...ke, messages: [] },
      abortController: oe.abortController,
      resumeMessages: q,
      resumeReplacementState: ee,
    }),
    starting?.started({
      agentId: resumableAgentId,
      model: parseUserSpecifiedModel(se ?? getMainLoopModel(toolUseContext)),
      teammateId: oe.agentId,
    }),
    logForDebugging(`[resumeInProcessTeammate] Resumed ${oe.agentId} with ${q.length} prior messages`),
    w)
  )
    logFeatureSad("swarm_in_process_resume", w);
  else logFeatureOk("swarm_in_process_resume");
  return { agentId: oe.agentId, taskId: oe.taskId, resumedMessageCount: q.length, definitionNotice: re };
}

export { resolveDesktopForward, forwardToDesktop, findRemoteSendTool, fs, resumeInProcessTeammate };
