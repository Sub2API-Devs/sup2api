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
import { LE } from "../utils/agentId.js";
import { or } from "../utils/settings/commandSyncNames.js";
import {
  clearProjectPathForConfigCache,
  resetTrustDialogAcceptedCache,
  rechooseGlobalConfigFreshnessWatcher,
} from "../utils/config.js";
import { Tcr, Br } from "../utils/startupTiming.js";
import { addStartupContext } from "../utils/startupProfiler.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import {
  isProviderManagedEnvVar,
  isProxyEnvVar,
  isTlsOrCertEnvVar,
  oao,
  Gx,
  n8e,
} from "../utils/managedEnvConstants.js";
import { g5e } from "../utils/managedEnvSafety.js";
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
import { dxi, isCoworkCloudEntrypoint } from "../utils/settings/mdm/wslRegistry.js";
import { n1e, GOe } from "../utils/settings/mdm/settings.js";
import { cIn } from "../utils/settings/managedPluginTiers.js";
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
import { knt } from "../cli/forwardedFlags.js";

/**
 * 从 socket 读取一次备用进程认领请求（JSON 行）。
 */
//@ chunk-snmzf59g.js:1286-1787 placement
function readSpareClaim(e, r, m) {
  return new Promise((d, p) => {
    let E = (o) => {
        (n.close(), p(o));
      },
      n = createServer((o) => {
        let c = "";
        (o.setEncoding("utf8"),
          o.on("data", (f) => {
            if (((c += f), m && c.length > 8388608)) {
              o.destroy();
              return;
            }
            let index = c.indexOf(`
`);
            if (index < 0) return;
            if (m) {
              let s;
              try {
                s = jsonParse(c.slice(0, index));
              } catch {
                s = void 0;
              }
              if (!s || !timingSafeEqualStrings(s.auth, m)) {
                o.destroy();
                return;
              }
              (n.close(), d(s));
              return;
            }
            n.close();
            try {
              d(jsonParse(c.slice(0, index)));
            } catch (error) {
              p(error);
            }
          }),
          o.on("error", m ? () => o.destroy() : E));
      });
    if ((n.on("error", E), r))
      n.once("listening", () => {
        try {
          r();
        } catch (error) {
          E(error);
        }
      });
    n.listen(e);
  });
}
/**
 * 备用后台进程被认领时应用 cwd、会话 id、环境变量等并计时。
 */
//@ chunk-snmzf59g.js:1787-3095 placement
async function applySpareClaim(e, r, m) {
  let startTime = performance.now(),
    p = await canonicalizePath(e.cwd, void 0);
  processChdir(p);
  let E = { originalCwd: p, projectRoot: p, cwd: p };
  if (e.sessionId) switchSession(LE(e.sessionId), "spare_claim", null, E);
  else setSessionProject(E);
  (or(),
    clearProjectPathForConfigCache(),
    resetTrustDialogAcceptedCache(),
    resetStartTime(),
    Tcr(),
    addStartupContext({ warm_spare_claimed: 1 }));
  let n = isEnvTruthy(e.env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST);
  if (n) {
    for (let l of Object.keys(process.env))
      if (
        (isProviderManagedEnvVar(l) ||
          l === "ANTHROPIC_CUSTOM_HEADERS" ||
          isProxyEnvVar(l) ||
          isTlsOrCertEnvVar(l)) &&
        !oao(l)
      )
        delete process.env[l];
  }
  if (g5e(e.env)) purgeHostOwnedChromeVars();
  (delete process.env.ANTHROPIC_AUTH_TOKEN,
    delete process.env.ANTHROPIC_API_KEY,
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN,
    env.unset("CLAUDE_CODE_CONFIG_WATCH_EVENTS"),
    env.unset("CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS"));
  let { kept: kept, dropped: dropped } = filterInvalidEnvEntries(e.env),
    f =
      n &&
      putBackTransport(
        launchViewAtClaim(getLatchedPreSettingsEnvSnapshot() ?? {}, Object.keys(kept), kept),
        oao,
      );
  if ((Object.assign(process.env, kept), readLauncherStartAtClaim(), dxi(), isCoworkCloudEntrypoint())) {
    let {
      mdm: mdm,
      hkcu: hkcu,
      wslInherits: wslInherits,
      whereAsked: whereAsked,
      readOutcomes: readOutcomes,
    } = await n1e();
    (GOe(mdm, hkcu, wslInherits, whereAsked), cIn(readOutcomes));
  }
  if (
    ((process.argv = [process.argv[0], process.argv[1], ...e.argv]),
    or(),
    resetDebugCaches(),
    dropped.length > 0)
  )
    warnUnappliedEnv(dropped);
  (m?.(), rechooseGlobalConfigFreshnessWatcher(), startupCcrEnv.reset());
  let startTime_2 = performance.now();
  if (
    (await waitForSessionIngressToken(e.argv),
    Br("spare_claim_token_file_wait_ms", performance.now() - startTime_2, startTime_2),
    resetFdCredentialState(),
    resetEnvDerivedAuthCaches(),
    clearWIFPrecedenceCache(),
    resetRemoteSettingsSyncCache(),
    resetGrowthBook({ preservePendingExposures: !0, preserveLoggedExposures: !0 }),
    resetUserData(),
    resetPreSettingsEnvSnapshotForClaim(Object.keys(kept), kept) || f)
  )
    clearCACertsCache();
  (clearProxyCache(), configureGlobalAgents());
  let { main: main } = await r;
  (Br("spare_claim_apply_ms", performance.now() - startTime, startTime), await main());
}
//@ chunk-snmzf59g.js:3095-3103 placement
var C = 8;
/**
 * 警告未能应用到后台会话的环境变量。
 */
//@ chunk-snmzf59g.js:3103-3715 placement
function warnUnappliedEnv(e) {
  if (
    (e.slice(0, C).forEach(({ name: r, problem: problem }) => {
      logForDebugging(
        `[bg-spare] environment variable ${describeEnvEntryName(r)} was not applied to this background session: ${ENV_ENTRY_PROBLEM_TEXT[problem]}. Programs it starts will not see it.`,
        { level: "warn" },
      );
    }),
    e.length > C)
  ) {
    let r = e.length - C;
    logForDebugging(
      `[bg-spare] \u2026and ${r} more environment ${plural(r, "variable was", "variables were")} not applied.`,
      { level: "warn" },
    );
  }
  logEvent("tengu_bg_claim_env_dropped", {
    dropped: e.length,
    nul_in_value: count(e, (r) => r.problem === "nul-in-value"),
    invalid_name: count(e, (r) => r.problem === "invalid-name"),
    non_string_value: count(e, (r) => r.problem === "non-string-value"),
    name_classes: fromEnumArr(uniq(e.map((r) => classifyEnvVar(r.name)))),
  });
}
//@ chunk-snmzf59g.js:3715-3993 placement
function classifyEnvVar(e) {
  return e === "PATH"
    ? "path"
    : e.startsWith("CLAUDE_BG_") ||
        e === "CLAUDE_JOB_DIR" ||
        e === "CLAUDE_CODE_SESSION_KIND" ||
        e === "CLAUDE_CODE_SESSION_NAME"
      ? "bg_worker"
      : Gx.includes(e)
        ? "credential"
        : n8e.includes(e)
          ? "gateway"
          : knt.has(e)
            ? "provider"
            : declaredEnvVarNames(env).includes(e)
              ? "declared"
              : "other";
}

export { readSpareClaim, applySpareClaim };
