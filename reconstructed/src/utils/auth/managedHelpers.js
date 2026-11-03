/**
 * utils/auth/managedHelpers.ts
 *
 * 2.1.316 新增：云 SDK 相关环境变量集合；固定登录进程中 helper 命令不运行的提示等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (10)
 * attribution: placement 10
 */
import { commandSyncNameState } from "../settings/commandSyncNames.js";
import { isStoredLoginPinned } from "../../cli/headlessCloud/attachServe.js";
import { claimOnce } from "../../services/api/verificationRequired.js";
import { logForDebugging } from "../debug.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { identity as identity_2 } from "../identity.js";
import { getSettingsForSource } from "../settings/settings.js";
import { withHostEnvRestored, hostWrittenEnvNames } from "../settings/managedSettingsFiles.js";
import { uniq } from "../collections.js";
import { hostOwnedEnvNames } from "../plugins/securityDefaultPlugin.js";
import { formatNameList } from "../secureStorage/credentialLegs.js";

//@ chunk-aepeg2w5.js:487365-487446 placement
/**
 * 判断该 helper 命令是否来自已合并的 hook 答案（因此不运行）。
 */
function isHookedMergeAnswer(e) {
  let { answers } = commandSyncNameState().hookedMerge;
  return answers !== null && answers.values.has(e);
}
//@ chunk-aepeg2w5.js:487446-487919 placement
/**
 * 固定登录进程中 helper 命令不运行的提示。
 */
function warnPinnedHelper(e, n) {
  if (isStoredLoginPinned() && isHookedMergeAnswer(e)) {
    if (claimOnce().claim(`pinned_runs_no_answered_helper:${e}`))
      logForDebugging(
        `${e}: this process is pinned to the stored login and uses that credential; a hook's answer stands as the setting, and its command is not run.`,
        {
          level: "warn",
        },
      );
    return commandSyncNameState().hookedMerge.computed?.[e];
  }
  if (!n || !isHttpMcpServeInvocation()) return n;
  if (claimOnce().claim(`daemon_runs_no_helper:${e}`))
    logForDebugging(
      `${e}: a tool server's daemon runs no helper; the setting stands and its command is not run.`,
      {
        level: "warn",
      },
    );
  return;
}
//@ chunk-aepeg2w5.js:487919-488444 placement
/**
 * 匹配云相关环境变量前缀（AWS_、CLOUDSDK_、GOOGLE_ 等）。
 */
var CLOUD_ENV_VARS = new Set([
  "AWS_DEFAULT_PROFILE",
  "AWS_DEFAULT_REGION",
  "AWS_PROFILE",
  "AWS_REGION",
  "CLOUD_ML_REGION",
  "CLOUDSDK_ACTIVE_CONFIG_NAME",
  "CLOUDSDK_COMPUTE_REGION",
  "CLOUDSDK_COMPUTE_ZONE",
  "CLOUDSDK_CORE_ACCOUNT",
  "CLOUDSDK_CORE_PROJECT",
  "GCLOUD_PROJECT",
  "GOOGLE_CLOUD_PROJECT",
]);
var CLOUD_ENV_VAR_PREFIX_RE =
  /^(?:VERTEX_REGION_CLAUDE_\w+|(?:(?:ACCOUNT|CLUSTER|COST_CENT(?:ER|RE)|CUSTOMER|DEPARTMENT|ENVIRONMENT|ID|LOCATION|NAME|NAMESPACE|ORG|ORGANIZATION|PROFILE|PROJECT|REGION|ROLE|STAGE|TEAM|TENANT|WORKSPACE|ZONE)(?:_|$))+)$/;
var CLOUD_ENV_VAR_NAME_RE = /^[A-Za-z0-9_][\w.-]*$/;
//@ chunk-aepeg2w5.js:488444-488499 placement
/**
 * 匹配 CLOUDSDK_CORE_ACCOUNT 的账号格式（可含 @ 域名）。
 */
var CLOUD_ACCOUNT_ENV_RE = /^[A-Za-z0-9_][\w.-]*(?:@[A-Za-z0-9][\w.-]*)?$/;
//@ chunk-aepeg2w5.js:488499-488626 placement
function isCloudAccountEnvValue(e, n) {
  let upper = e.toUpperCase();
  return (
    n !== undefined &&
    (upper === "CLOUDSDK_CORE_ACCOUNT" ? CLOUD_ACCOUNT_ENV_RE : CLOUD_ENV_VAR_NAME_RE).test(n) &&
    (CLOUD_ENV_VARS.has(upper) || CLOUD_ENV_VAR_PREFIX_RE.test(upper))
  );
}
//@ chunk-aepeg2w5.js:488626-488660 placement
/**
 * 记录托管 helper 环境注入情况的缓存。
 */
var managedHelperEnvCache = identity_2(new Map(), (e) => e.clear());
//@ chunk-aepeg2w5.js:488660-488717 placement
/**
 * 条件成立时返回保留仓库值的标记。
 */
function keepsRepositoryValueIf(e) {
  return e?.()
    ? {
        keepsRepositoryValue: isCloudAccountEnvValue,
      }
    : {};
}
//@ chunk-aepeg2w5.js:488717-488792 placement = _temp7 (1)
/**
 * 策略设置一致时排除项目设置注入的环境变量再运行 helper。
 */
function managedHelperSettingsGate(e, n, r, isProjectScopeTrustAccepted) {
  return getSettingsForSource("policySettings")?.[e] === n
    ? withHostEnvRestored(r, keepsRepositoryValueIf(isProjectScopeTrustAccepted))
    : r();
}
//@ chunk-aepeg2w5.js:488792-489130 placement
/**
 * 运行组织托管的 helper 时排除项目设置注入的环境变量。
 */
function runManagedHelperWithoutProjectEnv(e, n, r, isProjectScopeTrustAccepted) {
  if (getSettingsForSource("policySettings")?.[e] !== n) {
    managedHelperEnvCache.delete(e);
    return r();
  }
  let h = keepsRepositoryValueIf(isProjectScopeTrustAccepted);
  let y = withHostEnvRestored(r, h);
  let S = uniq([...hostWrittenEnvNames(h.keepsRepositoryValue), ...hostOwnedEnvNames()]);
  managedHelperEnvCache.set(e, {
    command: n,
    names: S,
  });
  if (S.length > 0)
    logForDebugging(
      `${e} is the organization's and started without what the repository settings' env or a person's plugin's $.env.set wrote to ${formatNameList(S)}`,
    );
  return y;
}
//@ chunk-aepeg2w5.js:489130-489436 placement
/**
 * 托管 helper 启动时被排除的环境变量说明。
 */
function managedHelperEnvNotes() {
  return [...managedHelperEnvCache]
    .filter(
      ([e, { command: n, names: r }]) => r.length > 0 && getSettingsForSource("policySettings")?.[e] === n,
    )
    .map(
      ([e, { names: n }]) =>
        `Managed ${e} started without ${formatNameList(n)} from project settings env or a plugin. Set them in managed settings env, ~/.claude/settings.json or the shell you start Claude Code from.`,
    );
}
export {
  managedHelperEnvNotes,
  warnPinnedHelper,
  isHookedMergeAnswer,
  runManagedHelperWithoutProjectEnv,
  managedHelperSettingsGate,
};
