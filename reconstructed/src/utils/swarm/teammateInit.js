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
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { readTeamFileAsync, setMemberActive } from "./teamHelpers.js";
import { logForDebugging } from "../debug.js";
import { agentAddress } from "./teammateIds.js";
import { TEAM_LEAD } from "./constants.js";
import { shouldAllowManagedPermissionRulesOnly } from "../permissions/permissionsLoader.js";
import { toPosixPath } from "../permissions/filesystem.js";
import { escapeRuleContent } from "../permissions/permissionRuleParser.js";
import { applyValidatedPermissionUpdate } from "../permissions/PermissionUpdate.js";
import { safeTeammateIdleResult } from "./teammateIdleResult.js";
import { createIdleNotification, writeToMailbox, logIdleResultDeliveryOutcome } from "../teammateMailbox.js";
import { jsonStringify } from "../slowOperations.js";
import { getTeammateColor } from "../teammate.js";
import { getLastApiErrorReason } from "../messages.js";
import { errorMessage } from "../errors.js";

//@ chunk-18hwfzwa.js:218085-218089 placement
init_react_production();
//@ chunk-18hwfzwa.js:218089-219727 fingerprint = initializeTeammateHooks (0.826)
/**
 * 初始化 teammate：读团队文件，把 teamAllowedPaths 转成会话级 allow 规则（仅允许受管规则时跳过）；非 leader 注册 Stop 函数钩子：标成员不活跃并写 idle_notification 到 team-lead 的 inbox。
 */
async function initializeTeammateHooks(setAppState, hookRegistry, sessionId, teammateIdentity, storage) {
  let { teamName, agentId, agentName } = teammateIdentity;
  let teamFile = await readTeamFileAsync(teamName, storage);
  if (!teamFile) {
    logForDebugging(`[TeammateInit] Team file not found for team: ${teamName}`);
    return;
  }
  let leadAgentId = agentAddress(TEAM_LEAD, teamName);
  let teamAllowedPaths = teamFile.teamAllowedPaths;
  if (teamAllowedPaths && teamAllowedPaths.length > 0 && shouldAllowManagedPermissionRulesOnly()) {
    logForDebugging(
      `[TeammateInit] Skipping ${teamAllowedPaths.length} team-wide allowed path(s): permission rules are restricted to managed settings (allowManagedPermissionRulesOnly)`,
    );
    teamAllowedPaths = [];
  }
  if (teamAllowedPaths && teamAllowedPaths.length > 0) {
    logForDebugging(`[TeammateInit] Found ${teamAllowedPaths.length} team-wide allowed path(s)`);
    for (let allowedPath of teamAllowedPaths) {
      let teamFile = toPosixPath(allowedPath.path);
      let At = escapeRuleContent(teamFile);
      let ruleContent = teamFile.startsWith("/")
        ? `/${At}/**`
        : At.startsWith("\\")
          ? `./${At}/**`
          : `${At}/**`;
      logForDebugging(
        `[TeammateInit] Applying team permission: ${allowedPath.toolName} allowed in ${allowedPath.path} (rule: ${ruleContent})`,
      );
      setAppState((prev) => ({
        ...prev,
        toolPermissionContext: applyValidatedPermissionUpdate(prev.toolPermissionContext, {
          type: "addRules",
          rules: [
            {
              toolName: allowedPath.toolName,
              ruleContent,
            },
          ],
          behavior: "allow",
          destination: "session",
        }),
      }));
    }
  }
  let leaderName = TEAM_LEAD;
  if (agentId === leadAgentId) {
    logForDebugging("[TeammateInit] This agent is the team leader - skipping idle notification hook");
    return;
  }
  logForDebugging(
    `[TeammateInit] Registering Stop hook for teammate ${agentName} to notify leader ${leaderName}`,
  );
  hookRegistry.addFunctionHook(
    sessionId,
    "Stop",
    "",
    async (messages, _signal) => {
      setMemberActive(teamName, agentName, false, storage);
      let { result: At, summary } = safeTeammateIdleResult(messages, {
        emitTelemetry: true,
      });
      let notification = createIdleNotification(agentName, {
        idleReason: "available",
        summary,
        result: At,
      });
      let Et;
      try {
        Et = await writeToMailbox(
          leaderName,
          {
            from: agentName,
            text: jsonStringify(notification),
            timestamp: new Date().toISOString(),
            color: getTeammateColor(),
          },
          undefined,
          storage,
        );
      } finally {
        logIdleResultDeliveryOutcome(notification, At, Et);
      }
      logForDebugging(
        Et !== undefined
          ? `[TeammateInit] Sent idle notification to leader ${leaderName}`
          : `[TeammateInit] Idle notification to leader ${leaderName} not delivered (mailbox write returned no id)`,
      );
      return true;
    },
    "Failed to send idle notification to team leader",
    {
      timeout: 1e4,
      id: "teammate-idle-notification",
    },
  );
}
//@ chunk-18hwfzwa.js:219727-220439 placement
async function notifyLeaderOfFailedIdle(teamContext, snapshot, aborted, storage) {
  if (aborted || !teamContext || teamContext.isLeader) return;
  let selfAgentName = teamContext.selfAgentName;
  if (!selfAgentName) return;
  let lastApiErrorReason = getLastApiErrorReason(snapshot);
  if (lastApiErrorReason === undefined) return;
  setMemberActive(teamContext.teamName, selfAgentName, false, storage);
  let { result: Re, summary } = safeTeammateIdleResult(snapshot, {
    emitTelemetry: true,
  });
  let He = TEAM_LEAD;
  let idleNotification = createIdleNotification(selfAgentName, {
    idleReason: "failed",
    failureReason: lastApiErrorReason,
    summary,
    result: Re,
  });
  let ze;
  try {
    ze = await writeToMailbox(
      He,
      {
        from: selfAgentName,
        text: jsonStringify(idleNotification),
        timestamp: new Date().toISOString(),
        color: getTeammateColor(),
      },
      undefined,
      storage,
    );
  } catch (error) {
    logForDebugging(
      `[TeammateInit] Failed to send failed idle notification to team leader: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    logIdleResultDeliveryOutcome(idleNotification, Re, undefined);
    return;
  }
  logIdleResultDeliveryOutcome(idleNotification, Re, ze);
  logForDebugging(
    ze !== undefined
      ? `[TeammateInit] Sent failed idle notification to leader ${He}`
      : `[TeammateInit] Failed idle notification to leader ${He} not delivered (mailbox write returned no id)`,
  );
}
export { initializeTeammateHooks, notifyLeaderOfFailedIdle };
