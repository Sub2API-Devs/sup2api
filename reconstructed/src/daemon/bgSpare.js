/**
 * daemon/bgSpare.ts
 *
 * 2.1.316 新增：备用后台进程被认领时应用 cwd、会话 id、环境变量等并计时；警告未能应用到后台会话的环境变量等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-snmzf59g.js (5)
 * attribution: placement 5
 */
import { createServer } from "net";
import { jsonParse } from "../utils/slowOperations.js";
import { timingSafeEqualStrings } from "../utils/sessionRecords.js";
import { canonicalizePath } from "../utils/sessionStoragePortable.js";
import { processChdir } from "../utils/fsOperations.js";
import {
  switchSession,
  setSessionProject,
  resetStartTime,
  resetFdCredentialState,
} from "../bootstrap/state.js";
import { identityAgentId } from "../utils/agentId.js";
import { invalidateCommandNames } from "../utils/settings/commandSyncNames.js";
import {
  clearProjectPathForConfigCache,
  resetTrustDialogAcceptedCache,
  rechooseGlobalConfigFreshnessWatcher,
} from "../utils/config.js";
import { markWarmSpareClaimed, recordPhase } from "../utils/startupTiming.js";
import { addStartupContext } from "../utils/startupProfiler.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import {
  isProviderManagedEnvVar,
  isProxyEnvVar,
  isTlsOrCertEnvVar,
  isTraceOrCertEnvVar,
  PROVIDER_CREDENTIAL_ENV_VARS,
  PROVIDER_ENDPOINT_COMPANION_VARS,
} from "../utils/managedEnvConstants.js";
import { isRemoteLikeEnv } from "../utils/managedEnvSafety.js";
import {
  purgeHostOwnedChromeVars,
  putBackTransport,
  launchViewAtClaim,
  getLatchedPreSettingsEnvSnapshot,
  resetPreSettingsEnvSnapshotForClaim,
} from "../utils/managedEnvApply.js";
import { env, declaredEnvVarNames } from "../utils/env.js";
import {
  filterInvalidEnvEntries,
  describeEnvEntryName,
  ENV_ENTRY_PROBLEM_TEXT,
} from "../utils/envValidation.js";
import { readLauncherStartAtClaim } from "../utils/auth/launcherHostLogin.js";
import { resetCoworkCloudCache, isCoworkCloudEntrypoint } from "../utils/settings/mdm/wslRegistry.js";
import { readMdmSnapshot, replaceMdmSetting } from "../utils/settings/mdm/settings.js";
import { setMdmReadOutcomes } from "../utils/settings/managedPluginTiers.js";
import { resetDebugCaches, logForDebugging } from "../utils/debug.js";
import { startupCcrEnv } from "../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { waitForSessionIngressToken } from "../cli/transports/sessionIngressToken.js";
import { resetEnvDerivedAuthCaches } from "../utils/auth.js";
import { clearWIFPrecedenceCache } from "../utils/wifProfile.js";
import { resetRemoteSettingsSyncCache } from "../services/cloudSessions/eligibility.js";
import { resetGrowthBook, resetUserData } from "../services/analytics/growthbook.js";
import { clearCACertsCache } from "../utils/caCerts.js";
import { clearProxyCache, configureGlobalAgents } from "../utils/proxy.js";
import { plural } from "../utils/stringUtils.js";
import { logEvent } from "../services/analytics/index.js";
import { count, uniq } from "../utils/collections.js";
import { fromEnumArr } from "../services/analytics/safeMetadata.js";
import { BACKGROUND_ALLOWED_ENV_NAMES } from "../cli/forwardedFlags.js";

//@ chunk-snmzf59g.js:1286-1787 placement
/**
 * 从 socket 读取一次备用进程认领请求（JSON 行）。
 */
function readSpareClaim(e, r, claimAuth) {
  return new Promise((resolve, reject) => {
    let E = (error) => {
      server.close();
      reject(error);
    };
    let server = createServer((o) => {
      let c = "";
      o.setEncoding("utf8");
      o.on("data", (f) => {
        c += f;
        if (claimAuth && c.length > 8388608) {
          o.destroy();
          return;
        }
        let index = c.indexOf(`
`);
        if (index < 0) return;
        if (claimAuth) {
          let s;
          try {
            s = jsonParse(c.slice(0, index));
          } catch {
            s = undefined;
          }
          if (!s || !timingSafeEqualStrings(s.auth, claimAuth)) {
            o.destroy();
            return;
          }
          server.close();
          resolve(s);
          return;
        }
        server.close();
        try {
          resolve(jsonParse(c.slice(0, index)));
        } catch (error) {
          reject(error);
        }
      });
      o.on("error", claimAuth ? () => o.destroy() : E);
    });
    server.on("error", E);
    if (r)
      server.once("listening", () => {
        try {
          r();
        } catch (error) {
          E(error);
        }
      });
    server.listen(e);
  });
}
//@ chunk-snmzf59g.js:1787-3095 placement
/**
 * 备用后台进程被认领时应用 cwd、会话 id、环境变量等并计时。
 */
async function applySpareClaim(e, r, m) {
  let startTime = performance.now();
  let p = await canonicalizePath(e.cwd, undefined);
  processChdir(p);
  let E = {
    originalCwd: p,
    projectRoot: p,
    cwd: p,
  };
  if (e.sessionId) switchSession(identityAgentId(e.sessionId), "spare_claim", null, E);
  else setSessionProject(E);
  invalidateCommandNames();
  clearProjectPathForConfigCache();
  resetTrustDialogAcceptedCache();
  resetStartTime();
  markWarmSpareClaimed();
  addStartupContext({
    warm_spare_claimed: 1,
  });
  let n = isEnvTruthy(e.env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST);
  if (n) {
    for (let key of Object.keys(process.env))
      if (
        (isProviderManagedEnvVar(key) ||
          key === "ANTHROPIC_CUSTOM_HEADERS" ||
          isProxyEnvVar(key) ||
          isTlsOrCertEnvVar(key)) &&
        !isTraceOrCertEnvVar(key)
      )
        delete process.env[key];
  }
  if (isRemoteLikeEnv(e.env)) purgeHostOwnedChromeVars();
  delete process.env.ANTHROPIC_AUTH_TOKEN;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
  env.unset("CLAUDE_CODE_CONFIG_WATCH_EVENTS");
  env.unset("CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS");
  let { kept, dropped } = filterInvalidEnvEntries(e.env);
  let f =
    n &&
    putBackTransport(
      launchViewAtClaim(getLatchedPreSettingsEnvSnapshot() ?? {}, Object.keys(kept), kept),
      isTraceOrCertEnvVar,
    );
  Object.assign(process.env, kept);
  readLauncherStartAtClaim();
  resetCoworkCloudCache();
  if (isCoworkCloudEntrypoint()) {
    let { mdm, hkcu, wslInherits, whereAsked, readOutcomes } = await readMdmSnapshot();
    replaceMdmSetting(mdm, hkcu, wslInherits, whereAsked);
    setMdmReadOutcomes(readOutcomes);
  }
  process.argv = [process.argv[0], process.argv[1], ...e.argv];
  invalidateCommandNames();
  resetDebugCaches();
  if (dropped.length > 0) warnUnappliedEnv(dropped);
  m?.();
  rechooseGlobalConfigFreshnessWatcher();
  startupCcrEnv.reset();
  let startTime_2 = performance.now();
  await waitForSessionIngressToken(e.argv);
  recordPhase("spare_claim_token_file_wait_ms", performance.now() - startTime_2, startTime_2);
  resetFdCredentialState();
  resetEnvDerivedAuthCaches();
  clearWIFPrecedenceCache();
  resetRemoteSettingsSyncCache();
  resetGrowthBook({
    preservePendingExposures: true,
    preserveLoggedExposures: true,
  });
  resetUserData();
  if (resetPreSettingsEnvSnapshotForClaim(Object.keys(kept), kept) || f) clearCACertsCache();
  clearProxyCache();
  configureGlobalAgents();
  let { main } = await r;
  recordPhase("spare_claim_apply_ms", performance.now() - startTime, startTime);
  await main();
}
//@ chunk-snmzf59g.js:3095-3103 placement
var SPARE_POOL_SIZE = 8;
//@ chunk-snmzf59g.js:3103-3715 placement
/**
 * 警告未能应用到后台会话的环境变量。
 */
function warnUnappliedEnv(dropped) {
  dropped.slice(0, SPARE_POOL_SIZE).forEach(({ name: r, problem }) => {
    logForDebugging(
      `[bg-spare] environment variable ${describeEnvEntryName(r)} was not applied to this background session: ${ENV_ENTRY_PROBLEM_TEXT[problem]}. Programs it starts will not see it.`,
      {
        level: "warn",
      },
    );
  });
  if (dropped.length > SPARE_POOL_SIZE) {
    let r = dropped.length - SPARE_POOL_SIZE;
    logForDebugging(
      `[bg-spare] \u2026and ${r} more environment ${plural(r, "variable was", "variables were")} not applied.`,
      {
        level: "warn",
      },
    );
  }
  logEvent("tengu_bg_claim_env_dropped", {
    dropped: dropped.length,
    nul_in_value: count(dropped, (r) => r.problem === "nul-in-value"),
    invalid_name: count(dropped, (r) => r.problem === "invalid-name"),
    non_string_value: count(dropped, (r) => r.problem === "non-string-value"),
    name_classes: fromEnumArr(uniq(dropped.map((r) => classifyEnvVar(r.name)))),
  });
}
//@ chunk-snmzf59g.js:3715-3993 placement
function classifyEnvVar(name) {
  return name === "PATH"
    ? "path"
    : name.startsWith("CLAUDE_BG_") ||
        name === "CLAUDE_JOB_DIR" ||
        name === "CLAUDE_CODE_SESSION_KIND" ||
        name === "CLAUDE_CODE_SESSION_NAME"
      ? "bg_worker"
      : PROVIDER_CREDENTIAL_ENV_VARS.includes(name)
        ? "credential"
        : PROVIDER_ENDPOINT_COMPANION_VARS.includes(name)
          ? "gateway"
          : BACKGROUND_ALLOWED_ENV_NAMES.has(name)
            ? "provider"
            : declaredEnvVarNames(env).includes(name)
              ? "declared"
              : "other";
}
export { readSpareClaim, applySpareClaim };
