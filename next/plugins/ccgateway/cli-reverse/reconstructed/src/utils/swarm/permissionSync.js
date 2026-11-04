/**
 * utils/swarm/permissionSync.ts
 *
 * 并入权限同步的小声明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/permissionSync.ts
 * pieces: chunk-1ny7cxrt.js (1), chunk-9cjx5pnm.js (4), chunk-aepeg2w5.js (1), chunk-ay9hyszk.js (10), chunk-cgr0tezp.js (1)
 * attribution: fingerprint 12, sole-consumer 2, affinity 1, placement 1, layout 1
 */
import { win32, join } from "path";
import { identity } from "../pathClassification.js";
import {
  identityReader,
  splitCommandWords,
  REFRESH_LOCK_ENV_KEYS,
  REFRESH_LOCK_FILES,
} from "../auth/cloudAuthRefreshLock.js";
import { computeContentHash } from "../commitAttribution.js";
import { jsonStringify } from "../slowOperations.js";
import { getProjectConfigRoot } from "../../bootstrap/state.js";
import { getFsImplementation } from "../fsOperations.js";
import { getProjectDirsUpToHome } from "../secureStorage/macOsKeychainHelpers.js";
import { getTeamName, getAgentId, getAgentName, getTeammateColor } from "../teammate.js";
import { isTeamLeadDefault } from "../../components/teams/TeamStatus.js";
import { readTeamFileAsync } from "./teamHelpers.js";
import { logForDebugging } from "../debug.js";
import { TEAM_LEAD } from "./constants.js";
import {
  writeToMailbox,
  createPermissionRequestMessage,
  createPermissionResponseMessage,
  createSandboxPermissionRequestMessage,
  createSandboxPermissionResponseMessage,
} from "../teammateMailbox.js";
import { logError } from "../log.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { readStringListAt } from "../../services/claudeGateway/desktopSettings.js";

//@ chunk-cgr0tezp.js:29083-29143 fingerprint (2.1.88 match: getResolvedDir, 1)
function getResolvedPath(target) {
  return target.kind === "resolved" ? identity(target.path) : undefined;
}
//@ chunk-aepeg2w5.js:327126-327537 fingerprint (2.1.88 match: readPendingPermissions, 0.309)
/**
 * 为一次带锁的操作计算锁/结果/持有者/接管请求文件路径（按命令与参数哈希）。与团队权限无关。
 */
function getOperationLockPaths(operation, command, readEnv = identityReader) {
  let any = splitCommandWords(command).some((word) => {
    let replaced = word.replace(/["']/g, "").replace(/^--?\w[\w-]*=|^[&*]?\d*[<>]+&?/, "");
    return (
      /[\\/]/.test(replaced) &&
      !replaced.includes("://") &&
      !/^[~$%]/.test(replaced) &&
      !win32.isAbsolute(replaced)
    );
  });
  let sliced = computeContentHash(
    jsonStringify([
      command,
      ...readEnv(REFRESH_LOCK_ENV_KEYS[operation]),
      ...(any ? [getProjectConfigRoot() ?? getFsImplementation().cwd()] : []),
    ]),
  ).slice(0, 16);
  let filePath = join(getProjectDirsUpToHome(), `${REFRESH_LOCK_FILES[operation]}-${sliced}`);
  return {
    lockfilePath: `${filePath}.lock`,
    outcomePath: `${filePath}.json`,
    holderPath: `${filePath}.holder.json`,
    requestPath: `${filePath}.takeover.json`,
  };
}
//@ chunk-ay9hyszk.js:884-969 fingerprint (2.1.88 match: generateRequestId, 1)
function generateRequestId() {
  return `perm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
//@ chunk-ay9hyszk.js:969-1490 fingerprint (2.1.88 match: createPermissionRequest, 0.959)
/**
 * 构造权限请求记录（id、worker 身份与颜色、团队名、工具名、输入、建议等），缺团队/worker 信息时抛错。
 */
function createPermissionRequest(params) {
  let teamName = params.teamName || getTeamName();
  let workerId = params.workerId || getAgentId();
  let workerName = params.workerName || getAgentName();
  let workerColor = params.workerColor || getTeammateColor();
  if (!teamName) throw Error("Team name is required for permission requests");
  if (!workerId) throw Error("Worker ID is required for permission requests");
  if (!workerName) throw Error("Worker name is required for permission requests");
  return {
    id: generateRequestId(),
    workerId,
    workerName,
    workerColor,
    teamName,
    toolName: params.toolName,
    toolUseId: params.toolUseId,
    description: params.description,
    input: params.input,
    permissionSuggestions: params.permissionSuggestions || [],
    createdAt: Date.now(),
  };
}
//@ chunk-ay9hyszk.js:1564-1618 placement
/**
 * 是否处于可发权限请求的队友上下文（有团队与 agent id 且非主进程）。
 */
function isTeammateContextReady() {
  let teamName = getTeamName();
  let agentId = getAgentId();
  return !!teamName && !!agentId && !isTeamLeadDefault();
}
//@ chunk-ay9hyszk.js:1618-1769 fingerprint (2.1.88 match: getLeaderName, 0.553)
/**
 * 确认团队文件存在后返回 leader 名（固定 team-lead）。
 */
async function getLeaderName(teamName, storage) {
  let team = teamName || getTeamName();
  if (!team) return null;
  if (!(await readTeamFileAsync(team, storage))) {
    logForDebugging(`[PermissionSync] Team file not found for team: ${team}`);
    return null;
  }
  return TEAM_LEAD;
}
//@ chunk-ay9hyszk.js:1769-1940 layout
/**
 * 写 mailbox 并记录投递成功/失败日志。
 */
async function deliverViaMailbox(recipient, message, teamName, label, storage) {
  if ((await writeToMailbox(recipient, message, teamName, storage)) === undefined) {
    logForDebugging(`[PermissionSync] FAILED to deliver ${label}`, {
      level: "error",
    });
    return false;
  }
  logForDebugging(`[PermissionSync] Sent ${label}`);
  return true;
}
//@ chunk-ay9hyszk.js:1940-2548 fingerprint (2.1.88 match: sendPermissionRequestViaMailbox, 0.939)
/**
 * worker 把权限请求作为 permission_request 帧写入 leader 的 inbox。
 */
async function sendPermissionRequestViaMailbox(request, storage) {
  let leaderName = await getLeaderName(request.teamName, storage);
  if (!leaderName) {
    logForDebugging("[PermissionSync] Cannot send permission request: leader name not found");
    return false;
  }
  try {
    let message = createPermissionRequestMessage({
      request_id: request.id,
      agent_id: request.workerName,
      tool_name: request.toolName,
      tool_use_id: request.toolUseId,
      description: request.description,
      input: request.input,
      permission_suggestions: request.permissionSuggestions,
    });
    return await deliverViaMailbox(
      leaderName,
      {
        from: request.workerName,
        text: jsonStringify(message),
        timestamp: new Date().toISOString(),
        color: request.workerColor,
      },
      request.teamName,
      `permission request ${jsonStringify(request.id)} to leader ${jsonStringify(leaderName)} via mailbox`,
      storage,
    );
  } catch (error) {
    logForDebugging(`[PermissionSync] Failed to send permission request via mailbox: ${error}`);
    logError(error);
    return false;
  }
}
//@ chunk-ay9hyszk.js:2548-3140 fingerprint (2.1.88 match: sendPermissionResponseViaMailbox, 0.853)
/**
 * leader 把审批结果（approved→success、否则 error）作为 permission_response 写入 worker 的 inbox。
 */
async function sendPermissionResponseViaMailbox(
  workerName,
  resolution,
  requestId,
  teamName,
  storage,
  toolUseId,
) {
  let team = teamName || getTeamName();
  if (!team) {
    logForDebugging("[PermissionSync] Cannot send permission response: team name not found");
    return false;
  }
  try {
    let message = createPermissionResponseMessage({
      request_id: requestId,
      subtype: resolution.decision === "approved" ? "success" : "error",
      error: resolution.feedback,
      updated_input: resolution.updatedInput,
      permission_updates: resolution.permissionUpdates,
      tool_use_id: toolUseId,
      approved_request: resolution.approvedRequest,
    });
    return await deliverViaMailbox(
      workerName,
      {
        from: TEAM_LEAD,
        text: jsonStringify(message),
        timestamp: new Date().toISOString(),
      },
      team,
      `permission response for ${jsonStringify(requestId)} to worker ${jsonStringify(workerName)} via mailbox`,
      storage,
    );
  } catch (error) {
    logForDebugging(`[PermissionSync] Failed to send permission response via mailbox: ${error}`);
    logError(error);
    return false;
  }
}
//@ chunk-ay9hyszk.js:3140-3230 fingerprint (2.1.88 match: generateSandboxRequestId, 1)
/**
 * 生成沙箱权限请求 ID：sandbox-<时间戳>-<随机>。
 */
function generateSandboxRequestId() {
  return `sandbox-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
//@ chunk-ay9hyszk.js:3230-4309 fingerprint (2.1.88 match: sendSandboxPermissionRequestViaMailbox, 0.755)
/**
 * worker 请求沙箱网络访问某主机：写 sandbox_permission_request 到 leader 的 inbox，记 swarm_sandbox_permission_request。
 */
async function sendSandboxPermissionRequestViaMailbox(host, requestId, teamName, storage) {
  let team = teamName || getTeamName();
  if (!team) {
    logForDebugging("[PermissionSync] Cannot send sandbox permission request: team name not found");
    logFeatureBad("swarm_sandbox_permission_request", "no_team_name");
    return false;
  }
  let leaderName = await getLeaderName(team, storage);
  if (!leaderName) {
    logForDebugging("[PermissionSync] Cannot send sandbox permission request: leader name not found");
    logFeatureBad("swarm_sandbox_permission_request", "no_leader");
    return false;
  }
  let workerId = getAgentId();
  let workerName = getAgentName();
  let workerColor = getTeammateColor();
  if (!workerId || !workerName) {
    logForDebugging("[PermissionSync] Cannot send sandbox permission request: worker ID or name not found");
    logFeatureBad("swarm_sandbox_permission_request", "no_worker_identity");
    return false;
  }
  try {
    let message = createSandboxPermissionRequestMessage({
      requestId,
      workerId,
      workerName,
      workerColor,
      host,
    });
    let delivered = await deliverViaMailbox(
      leaderName,
      {
        from: workerName,
        text: jsonStringify(message),
        timestamp: new Date().toISOString(),
        color: workerColor,
      },
      team,
      `sandbox permission request ${jsonStringify(requestId)} for host ${jsonStringify(host)} to leader ${jsonStringify(leaderName)} via mailbox`,
      storage,
    );
    if (delivered) logFeatureOk("swarm_sandbox_permission_request");
    else logFeatureBad("swarm_sandbox_permission_request", "mailbox_write_failed");
    return delivered;
  } catch (error) {
    logForDebugging(`[PermissionSync] Failed to send sandbox permission request via mailbox: ${error}`);
    logError(error);
    logFeatureBad("swarm_sandbox_permission_request", "mailbox_write_failed");
    return false;
  }
}
//@ chunk-ay9hyszk.js:4309-4787 fingerprint (2.1.88 match: sendSandboxPermissionResponseViaMailbox, 0.884)
/**
 * leader 回复沙箱主机权限（sandbox_permission_response）。
 */
async function sendSandboxPermissionResponseViaMailbox(
  workerName,
  requestId,
  host,
  allow,
  teamName,
  storage,
) {
  let team = teamName || getTeamName();
  if (!team) {
    logForDebugging("[PermissionSync] Cannot send sandbox permission response: team name not found");
    return false;
  }
  try {
    let message = createSandboxPermissionResponseMessage({
      requestId,
      host,
      allow,
    });
    return await deliverViaMailbox(
      workerName,
      {
        from: TEAM_LEAD,
        text: jsonStringify(message),
        timestamp: new Date().toISOString(),
      },
      team,
      `sandbox permission response for ${jsonStringify(requestId)} (host: ${jsonStringify(host)}, allow: ${jsonStringify(allow)}) to worker ${jsonStringify(workerName)} via mailbox`,
      storage,
    );
  } catch (error) {
    logForDebugging(`[PermissionSync] Failed to send sandbox permission response via mailbox: ${error}`);
    logError(error);
    return false;
  }
}
//@ chunk-9cjx5pnm.js:19664-19726 sole-consumer
var findInstallPreferenceEntry = (entries, plugin, status) =>
  entries.find((entry) => entry.plugin_id === plugin.id && entry.status === status);
//@ chunk-9cjx5pnm.js:19726-19768 sole-consumer
var installPreferenceValue = (installPreferenceEntry) =>
  installPreferenceEntry === undefined ? "available" : undefined;
//@ chunk-9cjx5pnm.js:19768-19806 affinity (2.1.88 match: _temp0, 1)
var pluginInstallSource = (a_5) => ({
  kind: "plugin",
  id: a_5.id,
});
//@ chunk-9cjx5pnm.js:19806-19928 fingerprint (2.1.88 match: pollForResponse, 0.385)
var buildInstallPreferenceFields = (plugin, entries) => ({
  source: pluginInstallSource(plugin),
  proposed_install_preference: installPreferenceValue(
    findInstallPreferenceEntry(entries, plugin, "approved"),
  ),
  predecessor_uuid: findInstallPreferenceEntry(entries, plugin, "denied")?.uuid,
});
//@ chunk-1ny7cxrt.js:1385435-1385609 fingerprint (2.1.88 match: getPermissionDir, 0.573)
/**
 * 从设置的 permissions.deny 里挑出不带参数、非 MCP 的工具名，作为 disabledBuiltinTools。与团队权限同步无关。
 */
function getDisabledBuiltinToolsFromSettings(settings) {
  let stringListAt = readStringListAt(settings, ["permissions", "deny"]);
  if (!stringListAt) return {};
  let filtered = stringListAt.filter((name) => !name.includes("(") && !name.startsWith("mcp__"));
  return filtered.length > 0
    ? {
        disabledBuiltinTools: filtered,
      }
    : {};
}
export {
  isTeammateContextReady,
  getOperationLockPaths,
  generateSandboxRequestId,
  sendSandboxPermissionRequestViaMailbox,
  createPermissionRequest,
  sendPermissionRequestViaMailbox,
  sendPermissionResponseViaMailbox,
  sendSandboxPermissionResponseViaMailbox,
  getDisabledBuiltinToolsFromSettings,
  buildInstallPreferenceFields,
  getResolvedPath,
};
