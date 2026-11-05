/**
 * utils/sandbox/perCommandDeny.ts
 *
 * 2.1.316 新增：按命令拒绝
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (10)
 * attribution: placement 10
 */
import { stat, mkdir } from "fs/promises";
import { dirname } from "path";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { stripTrailingSlashIfLong } from "./windowsGitIdentity.js";
import { getErrnoCode } from "../errors.js";
import { containsGlobChars } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { getPathsForNetworkScreen } from "../fsOperations.js";
import {
  isNetworkSpelledGrantRoot,
  denyEntryCoversFolded,
  SandboxPolicyRefusalError,
  isScrubOnlySandboxMode,
  SandboxManager,
} from "./sandbox-adapter.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../../remote/tools/consentText.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { getPlatform } from "../platform.js";
import { perCommandDenyUnenforcedSaid } from "../Shell.js";
import { logForDebugging } from "../debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3133104-3133477 placement
/**
 * 为以 / 结尾的按命令拒绝路径预先创建目录（权限 700），以便沙箱可以挂载遮罩；父目录不存在或路径被文件占用时跳过，其他失败抛出带原因的错误。
 */
async function materializeDenyDirectories(denyPaths) {
  for (let denyPath of normalizeCaseForComparison_2(denyPaths)) {
    if (denyPath.length < 2 || !denyPath.endsWith("/")) continue;
    let dirPath = stripTrailingSlashIfLong(denyPath);
    let parentExists = false;
    try {
      await stat(dirname(dirPath)).catch(async (error) => {
        if (getErrnoCode(error) !== "ENOENT") throw error;
        await stat(dirname(dirname(dirPath)));
      });
      parentExists = true;
      await mkdir(dirPath, {
        recursive: true,
        mode: 448,
      });
    } catch (error) {
      let errorCode = getErrnoCode(error);
      if (!parentExists && errorCode === "ENOENT") continue;
      if (errorCode === "ENOTDIR" || errorCode === "EEXIST") continue;
      throw sandboxPolicyRefusal_2("per_command_deny_materialize_failed");
    }
  }
}
//@ chunk-5xgkngpb.js:3133477-3133598 placement
/**
 * 判断命令路径是否需要做网络位置筛查：含通配、路径未经审核，或任一路径是网络形式的授权根/被拒绝条目覆盖。
 */
function needsNetworkScreen(path, denyEntries, context) {
  if (containsGlobChars(path)) return true;
  let { paths, vetted } = getPathsForNetworkScreen(path);
  return (
    !vetted ||
    paths.some(
      (path) =>
        isNetworkSpelledGrantRoot(path) ||
        denyEntries.some((denyEntry) => denyEntryCoversFolded(denyEntry, path, context)),
    )
  );
}
//@ chunk-5xgkngpb.js:3133598-3133965 placement
/**
 * 在沙箱文件系统配置上叠加覆盖项：合并额外可写路径（去掉 /），按回调保留基础写拒绝并追加新拒绝，追加读拒绝，按回调去掉部分允许读路径。
 */
function applyFsPolicyOverrides(baseConfig, overrides) {
  let allowWrite = normalizeCaseForComparison_2([
    ...(overrides.addAllowWrite ?? []),
    ...baseConfig.allowWrite.filter((writePath) => writePath !== "/" && writePath.length > 0),
  ]);
  let keepDenyWrite = overrides.keepBaseDenyWrite ?? (() => true);
  let dropAllowRead = overrides.dropAllowRead ?? (() => false);
  return {
    ...baseConfig,
    allowWrite,
    denyWrite: normalizeCaseForComparison_2([
      ...baseConfig.denyWrite.filter((denyPath) => keepDenyWrite(denyPath, allowWrite)),
      ...(overrides.addDenyWrite ?? []),
    ]),
    denyRead: normalizeCaseForComparison_2([...baseConfig.denyRead, ...(overrides.addDenyRead ?? [])]),
    ...(baseConfig.allowRead && {
      allowRead: baseConfig.allowRead.filter((readPath) => !dropAllowRead(readPath)),
    }),
  };
}
//@ chunk-5xgkngpb.js:3133965-3134041 placement
var PER_COMMAND_DENY_ERRORS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3133965", () => {
  PER_COMMAND_DENY_ERRORS = {
    per_command_deny_materialize_failed: REMOTE_TOOLS_CONSENT_TEXT["refused.sandbox_custody"],
  };
});
//@ chunk-5xgkngpb.js:3134041-3134101 placement
function sandboxPolicyRefusal_2(reason) {
  logFeatureSad("sandbox_exec", reason);
  return new SandboxPolicyRefusalError(PER_COMMAND_DENY_ERRORS[reason], reason);
}
//@ chunk-5xgkngpb.js:3134101-3134114 placement
var MAX_PER_COMMAND_DENY_ENTRIES = 3128;
//@ chunk-5xgkngpb.js:3134114-3134318 placement
function getProxyCredentialHelperConfig() {
  if (isScrubOnlySandboxMode()) return;
  if (SandboxManager.getProxyAuthToken() === undefined) return;
  let platform = getPlatform();
  let portOrLimit =
    platform === "linux" || platform === "wsl" ? MAX_PER_COMMAND_DENY_ENTRIES : SandboxManager.getProxyPort();
  if (portOrLimit === undefined) return;
  return [`credential.http://127.0.0.1:${portOrLimit}.helper`, ""];
}
//@ chunk-5xgkngpb.js:3134318-3134342 placement
function noExtraDenyEntries() {
  return [];
}
//@ chunk-5xgkngpb.js:3134342-3134407 placement
/**
 * proxyCredentialHelpers：代理凭据 helper 列表。
 */
function proxyCredentialHelpers() {
  let proxyCredentialHelperConfig = getProxyCredentialHelperConfig();
  return [
    ...(proxyCredentialHelperConfig === undefined ? [] : [proxyCredentialHelperConfig]),
    ...noExtraDenyEntries(),
  ];
}
//@ chunk-5xgkngpb.js:3183409-3183864 placement
/**
 * 按命令拒绝遮罩没有生效时打点，并对每个上下文每种原因只记一次调试日志（无沙箱配置或本机沙箱不可用）。
 */
function warnPerCommandDenyUnenforced(host, reason) {
  logFeatureSad("sandbox_exec", `per_command_deny_unenforced_${reason}`);
  let saidReasons = perCommandDenyUnenforcedSaid.of(host);
  if (saidReasons.has(reason)) return;
  saidReasons.add(reason);
  logForDebugging(
    `[remote-tools] served command runs without the credential-file sandbox mask (${reason === "no_config" ? "no sandbox filesystem configuration here" : "this machine's sandbox filesystem policy is relaxed"}): credential files are protected by permission rules only on this machine; enable strict sandbox filesystem isolation for the additional mask`,
  );
}
export {
  proxyCredentialHelpers,
  applyFsPolicyOverrides,
  warnPerCommandDenyUnenforced,
  materializeDenyDirectories,
  needsNetworkScreen,
};
