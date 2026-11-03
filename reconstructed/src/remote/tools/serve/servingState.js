/**
 * remote/tools/serve/servingState.ts
 *
 * 2.1.316 新增：服务状态键、通告构建与准入闸门
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5ghnps9r.js (1), chunk-ad2e1aj6.js (11)
 * attribution: placement 12
 */
import { hostname, platform, arch, homedir } from "os";
import { basename, basename as basename_2 } from "path";
import { FCt, CZo, _4 } from "../../../bridge/deviceRegistration.js";
import { firstLineOf } from "../../../utils/stringUtils.js";
import { attestationMode } from "../../../services/remoteTools/toolHostAttestation.js";
import { dkn } from "../protocolNegotiation.js";
import { getPlatform } from "../../../utils/platform.js";
import { shellCapabilityTag, UOs } from "../../../services/remoteTools/shellForwarding.js";
import { getResolvedPowerShellEdition } from "../../../utils/shell/powershellDetection.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { ZSr } from "../../../utils/shell/shellPaths.js";
import { t7o } from "../protocolSchemas.js";
import { warmDeviceSandbox } from "../deviceSandboxPosture.js";
import { createAdmissionGate } from "../../../services/remoteTools/remoteToolAdmission.js";
import { i } from "../../../tools/PowerShellTool/PowerShellTool.js";
import { getSettingsWithErrors_2 } from "../../../utils/settings/settings.js";
import { SandboxManager } from "../../../utils/sandbox/sandbox-adapter.js";

//@ chunk-ad2e1aj6.js:4093-5099 placement
var SERVING_STATE_KEY = "machine",
  Jo =
    typeof {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    } < "u"
      ? {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION
      : "unknown";
//@ chunk-ad2e1aj6.js:5099-5162 placement
function Qo(e = hostname) {
  let n = FCt(firstLineOf(e(), "."), CZo);
  return _4(n) ? n : SERVING_STATE_KEY;
}
/**
 * 组装本机对云会话的服务公告：策略、启动目录、项目同步、设备 id、文件夹关系与可同步状态。
 */
//@ chunk-ad2e1aj6.js:5162-5899 placement
function buildServingAnnouncement({
  policy: policy,
  launchDir: launchDir,
  epoch: epoch,
  deviceId: deviceId,
  getHostname: getHostname,
  projectSync: projectSync = "unknown",
  syncRoot: syncRoot,
  folderRelation: folderRelation,
  readyToSyncAtAttach: readyToSyncAtAttach = !1,
  servedToolNames: servedToolNames = [],
  inventory: inventory,
}) {
  let notes = policy.notes(),
    x = servedShellLabel(servedToolNames),
    Y = attestationMode() === "off" ? [] : ["vouched_calls"],
    F =
      policy.capabilities?.includes("standing_approvals") === !0 && isWindowsSandboxPolicyViolation()
        ? ["standing_offered_rules"]
        : [],
    D = withSyncAtAttach([...(policy.capabilities ?? []), ...F, ...Y], readyToSyncAtAttach);
  return {
    name: Qo(getHostname),
    kind: policy.kind,
    platform: platform(),
    arch: arch(),
    ...(x !== void 0 && { shell: x }),
    home_dir: homedir(),
    working_dir: launchDir,
    project_sync: projectSync,
    ...(syncRoot !== void 0 && isSyncingFolder(projectSync) && { sync_root: syncRoot }),
    ...folderRelationField(projectSync, folderRelation),
    limits: policy.limits,
    claude_code_version: Jo,
    tool_host_interface: dkn,
    ...(D.length > 0 && { capabilities: D }),
    ...(notes && { notes: notes }),
    ...(epoch !== void 0 && { epoch: epoch }),
    ...(deviceId !== void 0 && { device_id: deviceId }),
    ...(inventory !== void 0 && { inventory: inventory }),
  };
}
//@ chunk-ad2e1aj6.js:5899-5965 placement
function withSyncAtAttach(e, n) {
  let filtered = e.filter((h) => h !== SYNC_AT_ATTACH);
  return n ? [...filtered, SYNC_AT_ATTACH] : filtered;
}
//@ chunk-ad2e1aj6.js:5965-5989 placement
var SYNC_AT_ATTACH = "sync_at_attach";
//@ chunk-ad2e1aj6.js:5989-6142 placement
function servedShellLabel(e) {
  if (getPlatform() === "windows") return shellCapabilityTag(UOs(e, getResolvedPowerShellEdition()));
  let n = e.includes(BASH_TOOL_NAME) ? ZSr() : void 0,
    s = n === void 0 ? "" : basename(n);
  return s !== "" && s.length <= t7o ? s : void 0;
}
//@ chunk-ad2e1aj6.js:6142-6197 placement
function isSyncingFolder(e) {
  return e === "two_way" || e === "upload_only";
}
//@ chunk-ad2e1aj6.js:6197-6266 placement
function folderRelationField(e, n) {
  return e === "off" && n !== void 0 ? { folder_relation: n } : {};
}
//@ chunk-ad2e1aj6.js:6266-6324 placement
var er = async () => (await warmDeviceSandbox().catch(() => {}), { confined: !0 });
//@ chunk-ad2e1aj6.js:6324-6467 placement
function admissionGateFor(e, n) {
  switch (e.admission) {
    case "none":
      return;
    case "device_binding":
      return createAdmissionGate({ ...n, readPosture: er });
    case "device_gate":
      return createAdmissionGate(n);
  }
}
//@ chunk-ad2e1aj6.js:6467-6505 placement
var SESSION_APPROVAL_LIMITS = 1800000,
  ut = 300000,
  Tn = 256,
  tr = 16;
/**
 * （切分错误，权限 UI）当前设置无错误且沙箱未启用时返回 true，此时可提供常驻权限更新。
 */
//@ chunk-5ghnps9r.js:935-1078 placement = isWindowsSandboxPolicyViolation (0.526)
function isWindowsSandboxPolicyViolation() {
  if (!i()) return !1;
  try {
    return (
      getSettingsWithErrors_2().errors.length === 0 &&
      !SandboxManager.isSandboxEnabledInSettings() &&
      !SandboxManager.isSandboxingEnabled()
    );
  } catch {
    return !1;
  }
}

export {
  Tn,
  tr,
  isWindowsSandboxPolicyViolation,
  ut,
  SESSION_APPROVAL_LIMITS,
  buildServingAnnouncement,
  admissionGateFor,
  folderRelationField,
  withSyncAtAttach,
  isSyncingFolder,
};
