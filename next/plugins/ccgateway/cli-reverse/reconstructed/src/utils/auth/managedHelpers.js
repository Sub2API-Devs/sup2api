/**
 * utils/auth/managedHelpers.ts
 *
 * 2.1.316 新增：云 SDK 相关环境变量集合；固定登录进程中 helper 命令不运行的提示等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (12)
 * attribution: placement 10, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { commandSyncNameState } from "../settings/commandSyncNames.js";
import { isStoredLoginPinned } from "../../cli/headlessCloud/attachServe.js";
import { claimOnce } from "../../services/api/verificationRequired.js";
import { logForDebugging } from "../debug.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { identity as identity_2 } from "../identity.js";
import { getSettingsForSource } from "../settings/settings.js";
import { withHostEnvRestored, hostWrittenEnvNames } from "../settings/hostEnvWrites.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { hostOwnedEnvNames } from "../plugins/securityDefaultPlugin.js";
import { formatNameList } from "../secureStorage/credentialLegs.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:499253-499334 placement
/**
 * 判断该 helper 命令是否来自已合并的 hook 答案（因此不运行）。
 */
function isHookedMergeAnswer(settingName) {
  let { answers } = commandSyncNameState().hookedMerge;
  return answers !== null && answers.values.has(settingName);
}
//@ chunk-exfmq47h.js:499334-499807 placement
/**
 * 固定登录进程中 helper 命令不运行的提示。
 */
function warnPinnedHelper(settingName, value) {
  if (isStoredLoginPinned() && isHookedMergeAnswer(settingName)) {
    if (claimOnce().claim(`pinned_runs_no_answered_helper:${settingName}`))
      logForDebugging(
        `${settingName}: this process is pinned to the stored login and uses that credential; a hook's answer stands as the setting, and its command is not run.`,
        {
          level: "warn",
        },
      );
    return commandSyncNameState().hookedMerge.computed?.[settingName];
  }
  if (!value || !isHttpMcpServeInvocation()) return value;
  if (claimOnce().claim(`daemon_runs_no_helper:${settingName}`))
    logForDebugging(
      `${settingName}: a tool server's daemon runs no helper; the setting stands and its command is not run.`,
      {
        level: "warn",
      },
    );
  return;
}
//@ chunk-exfmq47h.js:499807-499833 layout
var REFRESH_TOKEN_EXPIRES_FLOOR; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:499807", () => {
  REFRESH_TOKEN_EXPIRES_FLOOR = Date.UTC(2025, 0, 1);
});
//@ chunk-exfmq47h.js:499833-499911 layout
function isPlausibleRefreshTokenExpiry(refreshTokenExpiresAt) {
  return (
    typeof refreshTokenExpiresAt === "number" &&
    refreshTokenExpiresAt >= REFRESH_TOKEN_EXPIRES_FLOOR &&
    refreshTokenExpiresAt <= Date.now() + 315360000000
  );
}
//@ chunk-exfmq47h.js:499911-500436 placement
/**
 * 匹配云相关环境变量前缀（AWS_、CLOUDSDK_、GOOGLE_ 等）。
 */
var CLOUD_ENV_VARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CLOUD_ENV_VAR_PREFIX_RE;
var CLOUD_ENV_VAR_NAME_RE;
deferInit("chunk-exfmq47h.js:499911", () => {
  CLOUD_ENV_VARS = new Set([
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
  CLOUD_ENV_VAR_PREFIX_RE =
    /^(?:VERTEX_REGION_CLAUDE_\w+|(?:(?:ACCOUNT|CLUSTER|COST_CENT(?:ER|RE)|CUSTOMER|DEPARTMENT|ENVIRONMENT|ID|LOCATION|NAME|NAMESPACE|ORG|ORGANIZATION|PROFILE|PROJECT|REGION|ROLE|STAGE|TEAM|TENANT|WORKSPACE|ZONE)(?:_|$))+)$/;
  CLOUD_ENV_VAR_NAME_RE = /^[A-Za-z0-9_][\w.-]*$/;
});
//@ chunk-exfmq47h.js:500436-500491 placement
/**
 * 匹配 CLOUDSDK_CORE_ACCOUNT 的账号格式（可含 @ 域名）。
 */
var CLOUD_ACCOUNT_ENV_RE = /^[A-Za-z0-9_][\w.-]*(?:@[A-Za-z0-9][\w.-]*)?$/;
//@ chunk-exfmq47h.js:500491-500618 placement
function isCloudAccountEnvValue(envKey, envValue) {
  let upper = envKey.toUpperCase();
  return (
    envValue !== undefined &&
    (upper === "CLOUDSDK_CORE_ACCOUNT" ? CLOUD_ACCOUNT_ENV_RE : CLOUD_ENV_VAR_NAME_RE).test(envValue) &&
    (CLOUD_ENV_VARS.has(upper) || CLOUD_ENV_VAR_PREFIX_RE.test(upper))
  );
}
//@ chunk-exfmq47h.js:500618-500652 placement
/**
 * 记录托管 helper 环境注入情况的缓存。
 */
var managedHelperEnvCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:500618", () => {
  managedHelperEnvCache = identity_2(new Map(), (map) => map.clear());
});
//@ chunk-exfmq47h.js:500652-500709 placement
/**
 * 条件成立时返回保留仓库值的标记。
 */
function keepsRepositoryValueIf(check) {
  return check?.()
    ? {
        keepsRepositoryValue: isCloudAccountEnvValue,
      }
    : {};
}
//@ chunk-exfmq47h.js:500709-500785 placement (2.1.88 match: _temp7, 1)
/**
 * 策略设置一致时排除项目设置注入的环境变量再运行 helper。
 */
function managedHelperSettingsGate(settingName, settingValue, run, isProjectScopeTrustAccepted) {
  return getSettingsForSource("policySettings")?.[settingName] === settingValue
    ? withHostEnvRestored(run, keepsRepositoryValueIf(isProjectScopeTrustAccepted))
    : run();
}
//@ chunk-exfmq47h.js:500785-501124 placement
/**
 * 运行组织托管的 helper 时排除项目设置注入的环境变量。
 */
function runManagedHelperWithoutProjectEnv(settingName, settingValue, run, isProjectScopeTrustAccepted) {
  if (getSettingsForSource("policySettings")?.[settingName] !== settingValue) {
    managedHelperEnvCache.delete(settingName);
    return run();
  }
  let envPolicy = keepsRepositoryValueIf(isProjectScopeTrustAccepted);
  let result = withHostEnvRestored(run, envPolicy);
  let droppedNames = normalizeCaseForComparison_2([
    ...hostWrittenEnvNames(envPolicy.keepsRepositoryValue),
    ...hostOwnedEnvNames(),
  ]);
  managedHelperEnvCache.set(settingName, {
    command: settingValue,
    names: droppedNames,
  });
  if (droppedNames.length > 0)
    logForDebugging(
      `${settingName} is the organization's and started without what the repository settings' env or a person's plugin's $.env.set wrote to ${formatNameList(droppedNames)}`,
    );
  return result;
}
//@ chunk-exfmq47h.js:501124-501430 placement
/**
 * 托管 helper 启动时被排除的环境变量说明。
 */
function managedHelperEnvNotes() {
  return [...managedHelperEnvCache]
    .filter(
      ([settingName, { command, names }]) =>
        names.length > 0 && getSettingsForSource("policySettings")?.[settingName] === command,
    )
    .map(
      ([settingName, { names }]) =>
        `Managed ${settingName} started without ${formatNameList(names)} from project settings env or a plugin. Set them in managed settings env, ~/.claude/settings.json or the shell you start Claude Code from.`,
    );
}
export {
  managedHelperEnvNotes,
  warnPinnedHelper,
  isHookedMergeAnswer,
  runManagedHelperWithoutProjectEnv,
  managedHelperSettingsGate,
  isPlausibleRefreshTokenExpiry,
};
