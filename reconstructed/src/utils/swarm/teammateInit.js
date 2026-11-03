/**
 * utils/swarm/teammateInit.ts
 *
 * 并入旧版已有路径：队友初始化。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/teammateInit.ts
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { j } from "../../../vendor/react/cjs/react.production.js";
import { readTeamFileAsync, setMemberActive } from "./teamHelpers.js";
import { logForDebugging } from "../debug.js";
import { MG } from "./teammateIds.js";
import { TEAM_LEAD } from "./constants.js";
import { shouldAllowManagedPermissionRulesOnly } from "../permissions/permissionsLoader.js";
import { toPosixPath } from "../permissions/filesystem.js";
import { escapeRuleContent } from "../permissions/permissionRuleParser.js";
import { applyValidatedPermissionUpdate } from "../permissions/PermissionUpdate.js";
import { yht } from "./teammateIdleResult.js";
import { createIdleNotification, writeToMailbox, logIdleResultDeliveryOutcome } from "../teammateMailbox.js";
import { jsonStringify } from "../slowOperations.js";
import { getTeammateColor } from "../teammate.js";
import { getLastApiErrorReason } from "../messages.js";
import { errorMessage } from "../errors.js";

//@ chunk-18hwfzwa.js:218085-218089 placement
j();
/**
 * 初始化 teammate：读团队文件，把 teamAllowedPaths 转成会话级 allow 规则（仅允许受管规则时跳过）；非 leader 注册 Stop 函数钩子：标成员不活跃并写 idle_notification 到 team-lead 的 inbox。
 */
//@ chunk-18hwfzwa.js:218089-219727 fingerprint = initializeTeammateHooks (0.826)
async function initializeTeammateHooks(setAppState, hookRegistry, sessionId, teammateIdentity, storage) {
  let { teamName: teamName, agentId: agentId, agentName: agentName } = teammateIdentity,
    teamFile = await readTeamFileAsync(teamName, storage);
  if (!teamFile) {
    logForDebugging(`[TeammateInit] Team file not found for team: ${teamName}`);
    return;
  }
  let leadAgentId = MG(TEAM_LEAD, teamName),
    teamAllowedPaths = teamFile.teamAllowedPaths;
  if (teamAllowedPaths && teamAllowedPaths.length > 0 && shouldAllowManagedPermissionRulesOnly())
    (logForDebugging(
      `[TeammateInit] Skipping ${teamAllowedPaths.length} team-wide allowed path(s): permission rules are restricted to managed settings (allowManagedPermissionRulesOnly)`,
    ),
      (teamAllowedPaths = []));
  if (teamAllowedPaths && teamAllowedPaths.length > 0) {
    logForDebugging(`[TeammateInit] Found ${teamAllowedPaths.length} team-wide allowed path(s)`);
    for (let rt of teamAllowedPaths) {
      let teamFile = toPosixPath(rt.path),
        At = escapeRuleContent(teamFile),
        ruleContent = teamFile.startsWith("/")
          ? `/${At}/**`
          : At.startsWith("\\")
            ? `./${At}/**`
            : `${At}/**`;
      (logForDebugging(
        `[TeammateInit] Applying team permission: ${rt.toolName} allowed in ${rt.path} (rule: ${ruleContent})`,
      ),
        setAppState((prev) => ({
          ...prev,
          toolPermissionContext: applyValidatedPermissionUpdate(prev.toolPermissionContext, {
            type: "addRules",
            rules: [{ toolName: rt.toolName, ruleContent: ruleContent }],
            behavior: "allow",
            destination: "session",
          }),
        })));
    }
  }
  let leaderName = TEAM_LEAD;
  if (agentId === leadAgentId) {
    logForDebugging("[TeammateInit] This agent is the team leader - skipping idle notification hook");
    return;
  }
  (logForDebugging(
    `[TeammateInit] Registering Stop hook for teammate ${agentName} to notify leader ${leaderName}`,
  ),
    hookRegistry.addFunctionHook(
      sessionId,
      "Stop",
      "",
      async (messages, kt) => {
        setMemberActive(teamName, agentName, !1, storage);
        let { result: At, summary: summary } = yht(messages, { emitTelemetry: !0 }),
          notification = createIdleNotification(agentName, {
            idleReason: "available",
            summary: summary,
            result: At,
          }),
          Et;
        try {
          Et = await writeToMailbox(
            leaderName,
            {
              from: agentName,
              text: jsonStringify(notification),
              timestamp: new Date().toISOString(),
              color: getTeammateColor(),
            },
            void 0,
            storage,
          );
        } finally {
          logIdleResultDeliveryOutcome(notification, At, Et);
        }
        return (
          logForDebugging(
            Et !== void 0
              ? `[TeammateInit] Sent idle notification to leader ${leaderName}`
              : `[TeammateInit] Idle notification to leader ${leaderName} not delivered (mailbox write returned no id)`,
          ),
          !0
        );
      },
      "Failed to send idle notification to team leader",
      { timeout: 1e4, id: "teammate-idle-notification" },
    ));
}
//@ chunk-18hwfzwa.js:219727-220439 placement
async function notifyLeaderOfFailedIdle(h, x, D, L) {
  if (D || !h || h.isLeader) return;
  let selfAgentName = h.selfAgentName;
  if (!selfAgentName) return;
  let ke = getLastApiErrorReason(x);
  if (ke === void 0) return;
  setMemberActive(h.teamName, selfAgentName, !1, L);
  let { result: Re, summary: summary } = yht(x, { emitTelemetry: !0 }),
    He = TEAM_LEAD,
    We = createIdleNotification(selfAgentName, {
      idleReason: "failed",
      failureReason: ke,
      summary: summary,
      result: Re,
    }),
    ze;
  try {
    ze = await writeToMailbox(
      He,
      {
        from: selfAgentName,
        text: jsonStringify(We),
        timestamp: new Date().toISOString(),
        color: getTeammateColor(),
      },
      void 0,
      L,
    );
  } catch (error) {
    (logForDebugging(
      `[TeammateInit] Failed to send failed idle notification to team leader: ${errorMessage(error)}`,
      { level: "error" },
    ),
      logIdleResultDeliveryOutcome(We, Re, void 0));
    return;
  }
  (logIdleResultDeliveryOutcome(We, Re, ze),
    logForDebugging(
      ze !== void 0
        ? `[TeammateInit] Sent failed idle notification to leader ${He}`
        : `[TeammateInit] Failed idle notification to leader ${He} not delivered (mailbox write returned no id)`,
    ));
}

export { initializeTeammateHooks, notifyLeaderOfFailedIdle };
