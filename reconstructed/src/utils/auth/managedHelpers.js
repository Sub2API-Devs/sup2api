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
import { is } from "../settings/commandSyncNames.js";
import { isStoredLoginPinned } from "../../cli/headlessCloud/attachServe.js";
import { claimOnce } from "../../services/api/verificationRequired.js";
import { logForDebugging } from "../debug.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { ge } from "../identity.js";
import { getSettingsForSource } from "../settings/settings.js";
import { AQ, RXt } from "../settings/managedSettingsFiles.js";
import { uniq } from "../collections.js";
import { hostOwnedEnvNames } from "../plugins/securityDefaultPlugin.js";
import { formatNameList } from "../secureStorage/credentialLegs.js";

//@ chunk-aepeg2w5.js:487365-487446 placement
function C6e(e) {
  let { answers: answers } = is().hookedMerge;
  return answers !== null && answers.values.has(e);
}
/**
 * 固定登录进程中 helper 命令不运行的提示。
 */
//@ chunk-aepeg2w5.js:487446-487919 placement
function warnPinnedHelper(e, n) {
  if (isStoredLoginPinned() && C6e(e)) {
    if (claimOnce().claim(`pinned_runs_no_answered_helper:${e}`))
      logForDebugging(
        `${e}: this process is pinned to the stored login and uses that credential; a hook's answer stands as the setting, and its command is not run.`,
        { level: "warn" },
      );
    return is().hookedMerge.computed?.[e];
  }
  if (!n || !isHttpMcpServeInvocation()) return n;
  if (claimOnce().claim(`daemon_runs_no_helper:${e}`))
    logForDebugging(
      `${e}: a tool server's daemon runs no helper; the setting stands and its command is not run.`,
      { level: "warn" },
    );
  return;
}
/**
 * 云 SDK 相关环境变量集合。
 */
//@ chunk-aepeg2w5.js:487919-488444 placement
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
  ]),
  h$ =
    /^(?:VERTEX_REGION_CLAUDE_\w+|(?:(?:ACCOUNT|CLUSTER|COST_CENT(?:ER|RE)|CUSTOMER|DEPARTMENT|ENVIRONMENT|ID|LOCATION|NAME|NAMESPACE|ORG|ORGANIZATION|PROFILE|PROJECT|REGION|ROLE|STAGE|TEAM|TENANT|WORKSPACE|ZONE)(?:_|$))+)$/,
  y$ = /^[A-Za-z0-9_][\w.-]*$/;
//@ chunk-aepeg2w5.js:488444-488499 placement
var b$ = /^[A-Za-z0-9_][\w.-]*(?:@[A-Za-z0-9][\w.-]*)?$/;
//@ chunk-aepeg2w5.js:488499-488626 placement
function isCloudAccountEnvValue(e, n) {
  let upper = e.toUpperCase();
  return (
    n !== void 0 &&
    (upper === "CLOUDSDK_CORE_ACCOUNT" ? b$ : y$).test(n) &&
    (CLOUD_ENV_VARS.has(upper) || h$.test(upper))
  );
}
//@ chunk-aepeg2w5.js:488626-488660 placement
var fm = ge(new Map(), (e) => e.clear());
//@ chunk-aepeg2w5.js:488660-488717 placement
function gA(e) {
  return e?.() ? { keepsRepositoryValue: isCloudAccountEnvValue } : {};
}
//@ chunk-aepeg2w5.js:488717-488792 placement = _temp7 (1)
function flt(e, n, r, s) {
  return getSettingsForSource("policySettings")?.[e] === n ? AQ(r, gA(s)) : r();
}
/**
 * 运行组织托管的 helper 时排除项目设置注入的环境变量。
 */
//@ chunk-aepeg2w5.js:488792-489130 placement
function runManagedHelperWithoutProjectEnv(e, n, r, s) {
  if (getSettingsForSource("policySettings")?.[e] !== n) return (fm.delete(e), r());
  let h = gA(s),
    y = AQ(r, h),
    S = uniq([...RXt(h.keepsRepositoryValue), ...hostOwnedEnvNames()]);
  if ((fm.set(e, { command: n, names: S }), S.length > 0))
    logForDebugging(
      `${e} is the organization's and started without what the repository settings' env or a person's plugin's $.env.set wrote to ${formatNameList(S)}`,
    );
  return y;
}
/**
 * 托管 helper 启动时被排除的环境变量说明。
 */
//@ chunk-aepeg2w5.js:489130-489436 placement
function managedHelperEnvNotes() {
  return [...fm]
    .filter(
      ([e, { command: n, names: r }]) => r.length > 0 && getSettingsForSource("policySettings")?.[e] === n,
    )
    .map(
      ([e, { names: n }]) =>
        `Managed ${e} started without ${formatNameList(n)} from project settings env or a plugin. Set them in managed settings env, ~/.claude/settings.json or the shell you start Claude Code from.`,
    );
}

export { managedHelperEnvNotes, warnPinnedHelper, C6e, runManagedHelperWithoutProjectEnv, flt };
