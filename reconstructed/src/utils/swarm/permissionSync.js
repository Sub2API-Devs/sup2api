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
import {
  win32,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
} from "path";
import { getTeamName, getAgentId, getAgentName, getTeammateColor } from "../teammate.js";
import { y } from "../../components/teams/TeamStatus.js";
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
import { jsonStringify } from "../slowOperations.js";
import { logError } from "../log.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { readStringListAt } from "../../services/claudeGateway/desktopSettings.js";
import {
  eE,
  splitCommandWords,
  REFRESH_LOCK_ENV_KEYS,
  REFRESH_LOCK_FILES,
} from "../auth/cloudAuthRefreshLock.js";
import { computeContentHash } from "../commitAttribution.js";
import { getProjectConfigRoot } from "../../bootstrap/state.js";
import { getFsImplementation } from "../fsOperations.js";
import { getProjectDirsUpToHome } from "../secureStorage/macOsKeychainHelpers.js";
import { Mn } from "../pathClassification.js";

//@ chunk-ay9hyszk.js:884-969 fingerprint = generateRequestId (1)
function generateRequestId() {
  return `perm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
/**
 * 构造权限请求记录（id、worker 身份与颜色、团队名、工具名、输入、建议等），缺团队/worker 信息时抛错。
 */
//@ chunk-ay9hyszk.js:969-1490 fingerprint = createPermissionRequest (0.959)
function createPermissionRequest(params) {
  let r = params.teamName || getTeamName(),
    n = params.workerId || getAgentId(),
    o = params.workerName || getAgentName(),
    i = params.workerColor || getTeammateColor();
  if (!r) throw Error("Team name is required for permission requests");
  if (!n) throw Error("Worker ID is required for permission requests");
  if (!o) throw Error("Worker name is required for permission requests");
  return {
    id: generateRequestId(),
    workerId: n,
    workerName: o,
    workerColor: i,
    teamName: r,
    toolName: params.toolName,
    toolUseId: params.toolUseId,
    description: params.description,
    input: params.input,
    permissionSuggestions: params.permissionSuggestions || [],
    createdAt: Date.now(),
  };
}
//@ chunk-ay9hyszk.js:1564-1618 placement
function Yqe() {
  let e = getTeamName(),
    r = getAgentId();
  return !!e && !!r && !y();
}
/**
 * 确认团队文件存在后返回 leader 名（固定 team-lead）。
 */
//@ chunk-ay9hyszk.js:1618-1769 fingerprint = getLeaderName (0.553)
async function getLeaderName(teamName, storage) {
  let team = teamName || getTeamName();
  if (!team) return null;
  if (!(await readTeamFileAsync(team, storage)))
    return (logForDebugging(`[PermissionSync] Team file not found for team: ${team}`), null);
  return TEAM_LEAD;
}
/**
 * 写 mailbox 并记录投递成功/失败日志。
 */
//@ chunk-ay9hyszk.js:1769-1940 layout
async function deliverViaMailbox(recipient, message, teamName, label, storage) {
  if ((await writeToMailbox(recipient, message, teamName, storage)) === void 0)
    return (logForDebugging(`[PermissionSync] FAILED to deliver ${label}`, { level: "error" }), !1);
  return (logForDebugging(`[PermissionSync] Sent ${label}`), !0);
}
/**
 * worker 把权限请求作为 permission_request 帧写入 leader 的 inbox。
 */
//@ chunk-ay9hyszk.js:1940-2548 fingerprint = sendPermissionRequestViaMailbox (0.939)
async function sendPermissionRequestViaMailbox(request, storage) {
  let n = await getLeaderName(request.teamName, storage);
  if (!n)
    return (logForDebugging("[PermissionSync] Cannot send permission request: leader name not found"), !1);
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
      n,
      {
        from: request.workerName,
        text: jsonStringify(message),
        timestamp: new Date().toISOString(),
        color: request.workerColor,
      },
      request.teamName,
      `permission request ${jsonStringify(request.id)} to leader ${jsonStringify(n)} via mailbox`,
      storage,
    );
  } catch (error) {
    return (
      logForDebugging(`[PermissionSync] Failed to send permission request via mailbox: ${error}`),
      logError(error),
      !1
    );
  }
}
/**
 * leader 把审批结果（approved→success、否则 error）作为 permission_response 写入 worker 的 inbox。
 */
//@ chunk-ay9hyszk.js:2548-3140 fingerprint = sendPermissionResponseViaMailbox (0.853)
async function sendPermissionResponseViaMailbox(
  workerName,
  resolution,
  requestId,
  teamName,
  storage,
  toolUseId,
) {
  let d = teamName || getTeamName();
  if (!d)
    return (logForDebugging("[PermissionSync] Cannot send permission response: team name not found"), !1);
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
      { from: TEAM_LEAD, text: jsonStringify(message), timestamp: new Date().toISOString() },
      d,
      `permission response for ${jsonStringify(requestId)} to worker ${jsonStringify(workerName)} via mailbox`,
      storage,
    );
  } catch (error) {
    return (
      logForDebugging(`[PermissionSync] Failed to send permission response via mailbox: ${error}`),
      logError(error),
      !1
    );
  }
}
/**
 * 生成沙箱权限请求 ID：sandbox-<时间戳>-<随机>。
 */
//@ chunk-ay9hyszk.js:3140-3230 fingerprint = generateSandboxRequestId (1)
function generateSandboxRequestId() {
  return `sandbox-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
/**
 * worker 请求沙箱网络访问某主机：写 sandbox_permission_request 到 leader 的 inbox，记 swarm_sandbox_permission_request。
 */
//@ chunk-ay9hyszk.js:3230-4309 fingerprint = sendSandboxPermissionRequestViaMailbox (0.755)
async function sendSandboxPermissionRequestViaMailbox(host, requestId, teamName, storage) {
  let team = teamName || getTeamName();
  if (!team)
    return (
      logForDebugging("[PermissionSync] Cannot send sandbox permission request: team name not found"),
      logFeatureBad("swarm_sandbox_permission_request", "no_team_name"),
      !1
    );
  let a = await getLeaderName(team, storage);
  if (!a)
    return (
      logForDebugging("[PermissionSync] Cannot send sandbox permission request: leader name not found"),
      logFeatureBad("swarm_sandbox_permission_request", "no_leader"),
      !1
    );
  let workerId = getAgentId(),
    workerName = getAgentName(),
    workerColor = getTeammateColor();
  if (!workerId || !workerName)
    return (
      logForDebugging("[PermissionSync] Cannot send sandbox permission request: worker ID or name not found"),
      logFeatureBad("swarm_sandbox_permission_request", "no_worker_identity"),
      !1
    );
  try {
    let message = createSandboxPermissionRequestMessage({
        requestId: requestId,
        workerId: workerId,
        workerName: workerName,
        workerColor: workerColor,
        host: host,
      }),
      w = await deliverViaMailbox(
        a,
        {
          from: workerName,
          text: jsonStringify(message),
          timestamp: new Date().toISOString(),
          color: workerColor,
        },
        team,
        `sandbox permission request ${jsonStringify(requestId)} for host ${jsonStringify(host)} to leader ${jsonStringify(a)} via mailbox`,
        storage,
      );
    if (w) logFeatureOk("swarm_sandbox_permission_request");
    else logFeatureBad("swarm_sandbox_permission_request", "mailbox_write_failed");
    return w;
  } catch (error) {
    return (
      logForDebugging(`[PermissionSync] Failed to send sandbox permission request via mailbox: ${error}`),
      logError(error),
      logFeatureBad("swarm_sandbox_permission_request", "mailbox_write_failed"),
      !1
    );
  }
}
/**
 * leader 回复沙箱主机权限（sandbox_permission_response）。
 */
//@ chunk-ay9hyszk.js:4309-4787 fingerprint = sendSandboxPermissionResponseViaMailbox (0.884)
async function sendSandboxPermissionResponseViaMailbox(
  workerName,
  requestId,
  host,
  allow,
  teamName,
  storage,
) {
  let d = teamName || getTeamName();
  if (!d)
    return (
      logForDebugging("[PermissionSync] Cannot send sandbox permission response: team name not found"),
      !1
    );
  try {
    let message = createSandboxPermissionResponseMessage({ requestId: requestId, host: host, allow: allow });
    return await deliverViaMailbox(
      workerName,
      { from: TEAM_LEAD, text: jsonStringify(message), timestamp: new Date().toISOString() },
      d,
      `sandbox permission response for ${jsonStringify(requestId)} (host: ${jsonStringify(host)}, allow: ${jsonStringify(allow)}) to worker ${jsonStringify(workerName)} via mailbox`,
      storage,
    );
  } catch (error) {
    return (
      logForDebugging(`[PermissionSync] Failed to send sandbox permission response via mailbox: ${error}`),
      logError(error),
      !1
    );
  }
}
//@ chunk-9cjx5pnm.js:19664-19726 sole-consumer
var Rt = (e, r, s) => e.find((n) => n.plugin_id === r.id && n.status === s);
//@ chunk-9cjx5pnm.js:19726-19768 sole-consumer
var ta = (e) => (e === void 0 ? "available" : void 0);
//@ chunk-9cjx5pnm.js:19768-19806 affinity = _temp0 (1)
var sa = (a_5) => ({ kind: "plugin", id: a_5.id });
//@ chunk-9cjx5pnm.js:19806-19928 fingerprint = pollForResponse (0.385)
var buildInstallPreferenceFields = (e, r) => ({
  source: sa(e),
  proposed_install_preference: ta(Rt(r, e, "approved")),
  predecessor_uuid: Rt(r, e, "denied")?.uuid,
});
/**
 * 从设置的 permissions.deny 里挑出不带参数、非 MCP 的工具名，作为 disabledBuiltinTools。与团队权限同步无关。
 */
//@ chunk-1ny7cxrt.js:1385435-1385609 fingerprint = getPermissionDir (0.573)
function getDisabledBuiltinToolsFromSettings(settings) {
  let t = readStringListAt(settings, ["permissions", "deny"]);
  if (!t) return {};
  let filtered = t.filter((o) => !o.includes("(") && !o.startsWith("mcp__"));
  return filtered.length > 0 ? { disabledBuiltinTools: filtered } : {};
}
/**
 * 为一次带锁的操作计算锁/结果/持有者/接管请求文件路径（按命令与参数哈希）。与团队权限无关。
 */
//@ chunk-aepeg2w5.js:327126-327537 fingerprint = readPendingPermissions (0.309)
function getOperationLockPaths(e, n, r = eE) {
  let any = splitCommandWords(n).some((S) => {
      let replaced = S.replace(/["']/g, "").replace(/^--?\w[\w-]*=|^[&*]?\d*[<>]+&?/, "");
      return (
        /[\\/]/.test(replaced) &&
        !replaced.includes("://") &&
        !/^[~$%]/.test(replaced) &&
        !win32.isAbsolute(replaced)
      );
    }),
    sliced = computeContentHash(
      jsonStringify([
        n,
        ...r(REFRESH_LOCK_ENV_KEYS[e]),
        ...(any ? [getProjectConfigRoot() ?? getFsImplementation().cwd()] : []),
      ]),
    ).slice(0, 16),
    filePath = join_5(getProjectDirsUpToHome(), `${REFRESH_LOCK_FILES[e]}-${sliced}`);
  return {
    lockfilePath: `${filePath}.lock`,
    outcomePath: `${filePath}.json`,
    holderPath: `${filePath}.holder.json`,
    requestPath: `${filePath}.takeover.json`,
  };
}
//@ chunk-cgr0tezp.js:29083-29143 fingerprint = getResolvedDir (1)
function getResolvedPath(target) {
  return target.kind === "resolved" ? Mn(target.path) : void 0;
}

export {
  Yqe,
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
