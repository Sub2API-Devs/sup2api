/**
 * utils/sandbox/perCommandDeny.ts
 *
 * 2.1.316 新增：按命令拒绝
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
 * attribution: placement 10
 */
import {
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  stat as stat_6,
  stat as stat_7,
  stat as stat_8,
  stat as stat_9,
  stat as stat_10,
  stat as stat_11,
  stat as stat_12,
  stat as stat_13,
  stat as stat_14,
  stat as stat_15,
  stat as stat_16,
  stat as stat_17,
  stat as stat_18,
  stat as stat_19,
  stat as stat_20,
  stat as stat_21,
  stat as stat_22,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  mkdir as mkdir_6,
  mkdir as mkdir_7,
  mkdir as mkdir_8,
  mkdir as mkdir_9,
  mkdir as mkdir_10,
  mkdir as mkdir_11,
  mkdir as mkdir_12,
  mkdir as mkdir_13,
  mkdir as mkdir_14,
  mkdir as mkdir_15,
  mkdir as mkdir_16,
  mkdir as mkdir_17,
  mkdir as mkdir_18,
  mkdir as mkdir_19,
  mkdir as mkdir_20,
  mkdir as mkdir_21,
  mkdir as mkdir_22,
  mkdir as mkdir_23,
  mkdir as mkdir_24,
  mkdir as mkdir_25,
  mkdir as mkdir_26,
} from "fs/promises";
import {
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
} from "path";
import { uniq } from "../collections.js";
import { iCe } from "./windowsGitIdentity.js";
import { getErrnoCode } from "../errors.js";
import { Ad } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
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

/**
 * 为以 / 结尾的按命令拒绝路径预先创建目录（权限 700），以便沙箱可以挂载遮罩；父目录不存在或路径被文件占用时跳过，其他失败抛出带原因的错误。
 */
//@ chunk-e6aww6q8.js:3049007-3049380 placement
async function materializeDenyDirectories(e) {
  for (let denyPath of uniq(e)) {
    if (denyPath.length < 2 || !denyPath.endsWith("/")) continue;
    let dirPath = iCe(denyPath),
      parentExists = !1;
    try {
      (await stat_15(dirname_46(dirPath)).catch(async (h) => {
        if (getErrnoCode(h) !== "ENOENT") throw h;
        await stat_15(dirname_46(dirname_46(dirPath)));
      }),
        (parentExists = !0),
        await mkdir_15(dirPath, { recursive: !0, mode: 448 }));
    } catch (error) {
      let errorCode = getErrnoCode(error);
      if (!parentExists && errorCode === "ENOENT") continue;
      if (errorCode === "ENOTDIR" || errorCode === "EEXIST") continue;
      throw bvr("per_command_deny_materialize_failed");
    }
  }
}
/**
 * 判断命令路径是否需要做网络位置筛查：含通配、路径未经审核，或任一路径是网络形式的授权根/被拒绝条目覆盖。
 */
//@ chunk-e6aww6q8.js:3049380-3049501 placement
function needsNetworkScreen(e, n, r) {
  if (Ad(e)) return !0;
  let { paths: paths, vetted: vetted } = getPathsForNetworkScreen(e);
  return (
    !vetted ||
    paths.some((y) => isNetworkSpelledGrantRoot(y) || n.some((S) => denyEntryCoversFolded(S, y, r)))
  );
}
/**
 * 在沙箱文件系统配置上叠加覆盖项：合并额外可写路径（去掉 /），按回调保留基础写拒绝并追加新拒绝，追加读拒绝，按回调去掉部分允许读路径。
 */
//@ chunk-e6aww6q8.js:3049501-3049868 placement
function applyFsPolicyOverrides(baseConfig, overrides) {
  let allowWrite = uniq([
      ...(overrides.addAllowWrite ?? []),
      ...baseConfig.allowWrite.filter((y) => y !== "/" && y.length > 0),
    ]),
    keepDenyWrite = overrides.keepBaseDenyWrite ?? (() => !0),
    dropAllowRead = overrides.dropAllowRead ?? (() => !1);
  return {
    ...baseConfig,
    allowWrite: allowWrite,
    denyWrite: uniq([
      ...baseConfig.denyWrite.filter((y) => keepDenyWrite(y, allowWrite)),
      ...(overrides.addDenyWrite ?? []),
    ]),
    denyRead: uniq([...baseConfig.denyRead, ...(overrides.addDenyRead ?? [])]),
    ...(baseConfig.allowRead && { allowRead: baseConfig.allowRead.filter((y) => !dropAllowRead(y)) }),
  };
}
//@ chunk-e6aww6q8.js:3049868-3049944 placement
var kvr = { per_command_deny_materialize_failed: REMOTE_TOOLS_CONSENT_TEXT["refused.sandbox_custody"] };
//@ chunk-e6aww6q8.js:3049944-3050004 placement
function bvr(e) {
  return (logFeatureSad("sandbox_exec", e), new SandboxPolicyRefusalError(kvr[e], e));
}
//@ chunk-e6aww6q8.js:3050004-3050017 placement
var wvr = 3128;
//@ chunk-e6aww6q8.js:3050017-3050221 placement
function getProxyCredentialHelperConfig() {
  if (isScrubOnlySandboxMode()) return;
  if (SandboxManager.getProxyAuthToken() === void 0) return;
  let e = getPlatform(),
    n = e === "linux" || e === "wsl" ? wvr : SandboxManager.getProxyPort();
  if (n === void 0) return;
  return [`credential.http://127.0.0.1:${n}.helper`, ""];
}
//@ chunk-e6aww6q8.js:3050221-3050245 placement
function vvr() {
  return [];
}
//@ chunk-e6aww6q8.js:3050245-3050310 placement
function Twn() {
  let e = getProxyCredentialHelperConfig();
  return [...(e === void 0 ? [] : [e]), ...vvr()];
}
/**
 * 按命令拒绝遮罩没有生效时打点，并对每个上下文每种原因只记一次调试日志（无沙箱配置或本机沙箱不可用）。
 */
//@ chunk-e6aww6q8.js:3097020-3097475 placement
function warnPerCommandDenyUnenforced(e, n) {
  logFeatureSad("sandbox_exec", `per_command_deny_unenforced_${n}`);
  let saidReasons = perCommandDenyUnenforcedSaid.of(e);
  if (saidReasons.has(n)) return;
  (saidReasons.add(n),
    logForDebugging(
      `[remote-tools] served command runs without the credential-file sandbox mask (${n === "no_config" ? "no sandbox filesystem configuration here" : "this machine's sandbox filesystem policy is relaxed"}): credential files are protected by permission rules only on this machine; enable strict sandbox filesystem isolation for the additional mask`,
    ));
}

export {
  Twn,
  applyFsPolicyOverrides,
  warnPerCommandDenyUnenforced,
  materializeDenyDirectories,
  needsNetworkScreen,
};
