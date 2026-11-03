/**
 * daemon/daemonAuth.ts
 *
 * 2.1.316 新增：daemon 认证管理：令牌更新广播、401 处理、冷却、组织查询；daemon 配置 schema（目录、名称、spawnMode、容量、权限模式等）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e3de30et.js (14)
 * attribution: placement 14
 */
import { join } from "path";
import { randomUUID } from "crypto";
import { STORAGE_SPACES } from "../utils/storage/storageSpaces.js";
import { getPlatform } from "../utils/platform.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { logFeatureSad, logFeatureOk, withFeatureTelemetry } from "../services/analytics/featureTelemetry.js";
import { getClaudeConfigDir } from "../utils/envUtils.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isENOENT,
  toError,
} from "../utils/errors.js";
import { getFileReader } from "../utils/fileStore.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, string, _enum, E, preprocess, M } from "../../vendor/zod/v4/classic/schemas.js";
import { normalizePermissionModeAlias, EXTERNAL_PERMISSION_MODES } from "../types/permissions.js";
import { SANDBOX_SETTING_HINT, BRIDGE_LOGIN_ERROR } from "../bridge/types.js";
import { EXIT_CONFIG_ERROR } from "../utils/exitCodes.js";
import { getBridgeTokenOverride } from "../bridge/bridgeConfig.js";
import { logForDebugging } from "../utils/debug.js";
import { isDaemonWorkerRegistryEnabled } from "../utils/fleetGates.js";
import { sleep } from "../utils/sleep.js";
import { logError } from "../utils/log.js";
import { updateDaemonConfig, normalizeDirEntries } from "./scheduledWorker.js";
import { pickByHelper } from "../utils/git/gitSafeEnv.js";

//@ chunk-e3de30et.js:1144-1263 placement
function isDaemonAuthMessage(r) {
  return (
    typeof r === "object" &&
    r !== null &&
    "type" in r &&
    (r.type === "token_update" || r.type === "auth_401_result")
  );
}
//@ chunk-e3de30et.js:1263-1348 placement
function isAuth401Result(r) {
  return typeof r === "object" && r !== null && "type" in r && r.type === "auth_401";
}
//@ chunk-e3de30et.js:1348-1403 placement
var AUTH_COOLDOWN_MS = 300000;
var AUTH_RECHECK_MS = 240000;
var AUTH_STATUS_TTL_MS = 300000;
var AUTH_RETRY_MS = 30000;
var AUTH_STATUS_MAX_AGE_MS = 86400000;
//@ chunk-e3de30et.js:1403-1457 placement
function readAuthCooldown() {
  return STORAGE_SPACES.state("daemon-auth-cooldown");
}
//@ chunk-e3de30et.js:1457-1509 placement
function readAuthStatus() {
  return STORAGE_SPACES.state("daemon-auth-status");
}
//@ chunk-e3de30et.js:1509-8583 placement
/**
 * daemon 认证管理：令牌更新广播、401 处理、冷却、组织查询。
 */
function createDaemonAuthManager(r, n, a, s, h, w = () => false) {
  let m = () => ({
    usesLoginOffFirstParty: a(),
  });
  let k;
  let T = false;
  let y = null;
  let v = new Set();
  let b = null;
  let x = null;
  function W() {
    return (x ??= import("./chunk-7v0gj88m.js"));
  }
  function L(accessToken) {
    let i = {
      type: "token_update",
      accessToken,
    };
    for (let S of v)
      try {
        S.send(i);
      } catch {}
  }
  let F;
  async function re(accessToken, i = false) {
    if (F === accessToken || getPlatform() !== "macos" || !(i || w()) || isEssentialTrafficOnly()) return;
    F = accessToken;
    try {
      let S = await W();
      if (S.isUsing3PServices() && !m().usesLoginOffFirstParty) {
        X(accessToken);
        return;
      }
      if ((await S.getClaudeAIOAuthTokenOriginAsync(h)) !== "store") return;
      let { validateOauthTokenWithOutcome, isTransientValidateFailure } = await import("./chunk-qvg9yd32.js");
      let R = await validateOauthTokenWithOutcome(accessToken);
      if (!R.ok) {
        let de = isTransientValidateFailure(R);
        if (de) X(accessToken);
        logFeatureSad("daemon_snapshot_org_lookup", R.reason, {
          transient: de,
        });
        n(`auth: token organization lookup: no answer (${R.reason})`);
        return;
      }
      let organizationUuid = R.data?.organization_uuid;
      let O = typeof organizationUuid === "string" && organizationUuid ? organizationUuid : null;
      logFeatureOk("daemon_snapshot_org_lookup", {
        named: O !== null,
      });
      if (k?.accessToken === accessToken)
        k = {
          ...k,
          organizationUuid: O,
        };
    } catch {
      X(accessToken);
      n("auth: token organization lookup failed");
    }
  }
  function X(e) {
    if (F === e) F = undefined;
  }
  function D(e) {
    k = {
      accessToken: e.accessToken,
      scopes: e.scopes,
      subscriptionType: e.subscriptionType ?? null,
      rateLimitTier: e.rateLimitTier ?? null,
      organizationUuid: null,
    };
    re(e.accessToken);
  }
  async function H() {
    let claudeAIOAuthTokensAsync = await (await W()).getClaudeAIOAuthTokensAsync(h);
    if (claudeAIOAuthTokensAsync?.accessToken && claudeAIOAuthTokensAsync.accessToken !== k?.accessToken) {
      D(claudeAIOAuthTokensAsync);
      L(claudeAIOAuthTokensAsync.accessToken);
    }
    G(claudeAIOAuthTokensAsync?.expiresAt ?? null);
  }
  let V;
  let Z = false;
  function j(e) {
    V = e;
    if (b || r.aborted) return;
    if (y) {
      clearTimeout(y);
      y = null;
    }
    n("auth: no token found, will re-check keychain every 30s");
    b = setInterval(function () {
      W()
        .then(async (S) => {
          let A = S.isUsing3PServices() && !a() && !w();
          if (A !== Z) {
            Z = A;
            n(
              A
                ? "auth: re-check skips the keychain (3P provider, no worker uses the token)"
                : "auth: re-check reads the keychain again",
            );
          }
          if (A) return;
          S.clearOAuthTokenCache();
          let claudeAIOAuthTokensAsync = await S.getClaudeAIOAuthTokensAsync(h);
          let R;
          if (
            claudeAIOAuthTokensAsync?.accessToken &&
            claudeAIOAuthTokensAsync.accessToken !== V &&
            claudeAIOAuthTokensAsync.expiresAt &&
            claudeAIOAuthTokensAsync.expiresAt > Date.now()
          )
            R = "auth: token found via keychain re-check";
          else if (
            claudeAIOAuthTokensAsync?.refreshToken &&
            (await S.checkAndRefreshOAuthTokenIfNeeded({
              credentials: h,
              storageV5: s,
              ...m(),
            }))
          )
            R = "auth: token refreshed via keychain re-check retry";
          if (R) {
            await H();
            if (k && b) {
              clearInterval(b);
              b = null;
              n(R);
            }
          }
        })
        .catch((error) => n(`auth: keychain re-check error: ${error}`));
    }, AUTH_RETRY_MS);
    b.unref();
  }
  function G(e) {
    if (y) {
      clearTimeout(y);
      y = null;
    }
    if (!e || r.aborted) return;
    let min = Math.min(Math.max(e - Date.now() - AUTH_RECHECK_MS, 5000), AUTH_STATUS_MAX_AGE_MS);
    n(`auth: scheduling proactive refresh in ${Math.round(min / 1000)}s`);
    y = setTimeout(ce, min);
    y.unref();
  }
  async function ce() {
    if (r.aborted) return;
    try {
      n("auth: proactive refresh starting");
      let e = await W();
      let accessToken = k?.accessToken;
      let S = await e.checkAndRefreshOAuthTokenIfNeeded({
        credentials: h,
        storageV5: s,
        ...m(),
      });
      e.clearOAuthTokenCache();
      let claudeAIOAuthTokensAsync = await e.getClaudeAIOAuthTokensAsync(h);
      let expiresAt = claudeAIOAuthTokensAsync?.expiresAt ?? null;
      let R = expiresAt === null || expiresAt > Date.now() + AUTH_COOLDOWN_MS;
      if (
        claudeAIOAuthTokensAsync?.accessToken &&
        (S || claudeAIOAuthTokensAsync.accessToken !== accessToken || R) &&
        (expiresAt === null || expiresAt > Date.now() + AUTH_RECHECK_MS)
      ) {
        await H();
        n(
          S
            ? "auth: proactive refresh succeeded"
            : "auth: token still valid (cross-process refresh or not yet due)",
        );
        return;
      }
      if (claudeAIOAuthTokensAsync?.accessToken && expiresAt !== null && expiresAt > Date.now()) {
        n("auth: proactive refresh failed, retrying in ~60s (token still valid)");
        G(Date.now() + 60000 + AUTH_RECHECK_MS);
        return;
      }
      n("auth: proactive refresh failed, signalling re-auth required");
      let accessToken_2 = claudeAIOAuthTokensAsync?.accessToken ?? accessToken;
      k = undefined;
      await ie();
      j(accessToken_2);
    } catch (error) {
      n(`auth: proactive refresh error: ${error}`);
      G(Date.now() + 60000 + AUTH_RECHECK_MS);
    }
  }
  async function ne(failedToken) {
    if (T) {
      n("auth: 401 ignored (3P provider active, no OAuth)");
      return false;
    }
    n("auth: handling 401");
    let i = await W();
    if (await i.handleOAuth401Error(failedToken, h, s, m())) {
      i.clearOAuthTokenCache();
      await H();
      n("auth: 401 recovery succeeded");
      return true;
    }
    n("auth: 401 recovery failed, signalling re-auth required");
    k = undefined;
    await ie();
    i.clearOAuthTokenCache();
    let claudeAIOAuthTokensAsync = await i.getClaudeAIOAuthTokensAsync(h);
    if (
      claudeAIOAuthTokensAsync?.accessToken !== undefined &&
      claudeAIOAuthTokensAsync.accessToken !== failedToken
    ) {
      await H();
      return true;
    }
    j(failedToken);
    return false;
  }
  let B = null;
  function ie() {
    if (B) return B;
    B = se().finally(() => {
      B = null;
    });
    return B;
  }
  async function se() {
    let e = await W();
    if (e.getAnthropicApiKey()) {
      n("auth: browser login skipped (API key auth available)");
      return;
    }
    if (e.isUsing3PServices() && !a()) {
      n("auth: browser login skipped (3P provider, no OAuth-consuming worker)");
      return;
    }
    let claudeConfigDir = getClaudeConfigDir();
    let S = join(claudeConfigDir, "daemon-auth-cooldown");
    let A = join(claudeConfigDir, "daemon-auth-status.json");
    try {
      let c;
      if (isStorageV5Enabled() && s !== undefined) {
        let P = await s.read([readAuthCooldown()]);
        if (!P.ok)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `v5 cooldown read failed: ${P.error.code}${"telemetryCode" in P.error && P.error.telemetryCode ? ` (${P.error.telemetryCode})` : ""}`,
            "daemon-auth v5 cooldown read failed",
          );
        let O = P.value.items[0];
        c = O.found ? Buffer.from(O.value).toString("utf8") : null;
      } else c = await getFileReader().read(S);
      let R = c === null ? NaN : parseInt(c, 10);
      if (!Number.isNaN(R) && Date.now() - R < AUTH_STATUS_TTL_MS) {
        n("auth: browser login skipped (cooldown)");
        return;
      }
    } catch (error) {
      if (!isENOENT(error)) n(`auth: cooldown read error: ${error}`);
    }
    try {
      await getFileReader().mkdir(claudeConfigDir);
      if (isStorageV5Enabled() && s !== undefined) {
        let c = await s.write(readAuthCooldown(), String(Date.now()), {
          publishDiscipline: "inPlace",
        });
        if (!c.ok)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `v5 cooldown write failed: ${c.error.code}${"telemetryCode" in c.error && c.error.telemetryCode ? ` (${c.error.telemetryCode})` : ""}`,
            "daemon-auth v5 cooldown write failed",
          );
      } else await getFileReader().write(S, String(Date.now()));
    } catch (error) {
      n(`auth: cooldown write error: ${error}`);
    }
    try {
      let { execFileNoThrow } = await import("./chunk-xgggdgp8.js");
      execFileNoThrow("notify-send", ["Claude", "Your Claude assistant needs re-authentication"]);
    } catch {}
    try {
      if (isStorageV5Enabled() && s !== undefined) {
        let c = await s.write(
          readAuthStatus(),
          jsonStringify({
            status: "auth_required",
            since: Date.now(),
          }),
          {
            publishDiscipline: "inPlace",
          },
        );
        if (!c.ok)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `v5 status write failed: ${c.error.code}${"telemetryCode" in c.error && c.error.telemetryCode ? ` (${c.error.telemetryCode})` : ""}`,
            "daemon-auth v5 status write failed",
          );
      } else
        await getFileReader().write(
          A,
          jsonStringify({
            status: "auth_required",
            since: Date.now(),
          }),
        );
    } catch (error) {
      n(`auth: status write error: ${error}`);
    }
    n("auth: headless daemon cannot complete OAuth \u2014 run `claude auth login` to refresh");
  }
  function Q(e) {
    if (!isAuth401Result(e)) return;
    ne(e.failedToken)
      .then((refreshed) => {
        for (let S of v)
          try {
            let A = {
              type: "auth_401_result",
              refreshed,
              requestId: e.requestId,
            };
            S.send(A);
          } catch {}
      })
      .catch((error) => {
        n(`auth: 401 handler error: ${error}`);
        for (let S of v)
          try {
            let A = {
              type: "auth_401_result",
              refreshed: false,
              requestId: e.requestId,
            };
            S.send(A);
          } catch {}
      });
  }
  function K(e) {
    v.add(e);
    e.on("message", Q);
    if (k)
      try {
        let i = {
          type: "token_update",
          accessToken: k.accessToken,
        };
        e.send(i);
      } catch {}
  }
  function ae(e) {
    e.removeListener("message", Q);
    v.delete(e);
  }
  let q = (async () => {
    if (r.aborted) return;
    try {
      let e = await W();
      let claudeAIOAuthTokensAsync = await e.getClaudeAIOAuthTokensAsync(h);
      if (!claudeAIOAuthTokensAsync?.accessToken && e.isUsing3PServices()) {
        T = true;
        n("auth: 3P provider active, skipping OAuth refresh loop");
        return;
      }
      if (claudeAIOAuthTokensAsync?.accessToken) {
        D(claudeAIOAuthTokensAsync);
        G(claudeAIOAuthTokensAsync.expiresAt ?? null);
      }
      await e.checkAndRefreshOAuthTokenIfNeeded({
        credentials: h,
        storageV5: s,
        ...m(),
      });
      await H();
    } catch (error) {
      n(`auth: init error: ${error}`);
    }
  })();
  q.then(() => {
    if (r.aborted || k || T) return;
    j();
  });
  r.addEventListener(
    "abort",
    () => {
      if (y) {
        clearTimeout(y);
        y = null;
      }
      if (b) {
        clearInterval(b);
        b = null;
      }
    },
    {
      once: true,
    },
  );
  return {
    ready: q,
    getAccessToken() {
      return k?.accessToken;
    },
    getAuthSnapshot() {
      if (k && !k.organizationUuid) re(k.accessToken, true);
      return k;
    },
    attachWorker: K,
    detachWorker: ae,
    dispose: ee,
    [Symbol.dispose]: ee,
  };
  function ee() {
    if (y) {
      clearTimeout(y);
      y = null;
    }
    if (b) {
      clearInterval(b);
      b = null;
    }
    for (let e of v) e.removeListener("message", Q);
    v.clear();
  }
}
//@ chunk-e3de30et.js:8583-9560 placement
/**
 * worker 侧认证客户端：通过 IPC 接收令牌更新、请求刷新。
 */
function createWorkerAuthClient(initialAccessToken, n, a) {
  if (typeof process.send === "function") {
    let k = function (T) {
      let y = m.get(T);
      if (y) {
        m.delete(T);
        y.resolve(false);
      }
    };
    let w = initialAccessToken;
    process.on("message", (T) => {
      if (!isDaemonAuthMessage(T)) return;
      if (T.type === "token_update") w = T.accessToken;
    });
    let m = new Map();
    process.on("message", (T) => {
      if (typeof T === "object" && T !== null && "type" in T && T.type === "auth_401_result") {
        let y = T;
        let v = m.get(y.requestId);
        if (v) {
          clearTimeout(v.timer);
          m.delete(y.requestId);
          v.resolve(y.refreshed);
        }
      }
    });
    process.channel?.unref();
    return {
      getAccessToken() {
        return w;
      },
      reportAuth401(failedToken) {
        let y = randomUUID();
        let v = {
          type: "auth_401",
          failedToken,
          requestId: y,
        };
        return new Promise((resolve) => {
          let timer = setTimeout(k, 30000, y);
          timer.unref();
          m.set(y, {
            resolve,
            timer,
          });
          try {
            process.send(v);
          } catch {
            clearTimeout(timer);
            m.delete(y);
            resolve(false);
          }
        });
      },
    };
  }
  let s = null;
  async function h() {
    return (s ??= await import("./chunk-7v0gj88m.js"));
  }
  h();
  return {
    getAccessToken() {
      return s?.getClaudeAIOAuthTokens()?.accessToken;
    },
    async reportAuth401(w) {
      return (await h()).handleOAuth401Error(w, n, a, {
        usesLoginOffFirstParty: true,
      });
    },
  };
}
//@ chunk-e3de30et.js:9560-9645 placement
function isShutdownResult(r) {
  return typeof r === "object" && r !== null && "type" in r && r.type === "shutdown";
}
//@ chunk-e3de30et.js:9645-9805 placement
function getRestartCause(r) {
  if (!isShutdownResult(r) || typeof r !== "object" || r === null || !("cause" in r)) return;
  return r.cause === "upgrade" || r.cause === "reload" || r.cause === "yield" ? r.cause : undefined;
}
//@ chunk-e3de30et.js:9805-13196 placement
/**
 * daemon 配置 schema（目录、名称、spawnMode、容量、权限模式等）。
 */
var DaemonConfigSchema = DoctorLazy(() =>
  u({
    dir: string(),
    name: string().optional(),
    spawnMode: _enum(["same-dir", "worktree"]).default("same-dir"),
    capacity: E().int().positive().default(32),
    permissionMode: preprocess(normalizePermissionModeAlias, _enum(EXTERNAL_PERMISSION_MODES)).optional(),
    sandbox: M().optional(),
    sessionTimeoutSeconds: E().int().positive().optional(),
    createSessionOnStart: M().default(false),
  }).strict(),
);
var DAEMON_RESTART_WAIT_MS = 60000;
var DAEMON_POLL_MS = 500;
var handleRemoteControlInput = async (r, n, a, s, h, w) => {
  let m = DaemonConfigSchema().parse(r);
  if (m.sandbox) {
    a(`The sandbox key is not supported for Remote Control. Remove it. ${SANDBOX_SETTING_HINT}`);
    process.exit(EXIT_CONFIG_ERROR);
  }
  let { initializeErrorLogSink } = await import("./chunk-nynswhsz.js");
  let { initializeAnalyticsSink } = await import("./chunk-dn8vrmng.js");
  initializeErrorLogSink();
  initializeAnalyticsSink();
  let y = () => getBridgeTokenOverride() ?? s.getAccessToken();
  if (!y()) {
    a(BRIDGE_LOGIN_ERROR);
    process.exit(1);
  }
  let [
    { initialize1PEventLogging: v },
    { initializeGrowthBook: b, getFeatureValue_CACHED_MAY_BE_STALE: x, getUserAttributes: W },
    { flushAnalyticsSinks: L },
    { populateOAuthAccountInfoIfNeeded: F },
  ] = await Promise.all([
    import("./chunk-3x77zjqp.js"),
    import("./chunk-6df1d6re.js"),
    import("./chunk-af5wdhtv.js"),
    import("./chunk-appaeyg7.js"),
  ]);
  v(h);
  await F(w, h).catch((error) => {
    logForDebugging(
      `[daemon:remoteControl] oauthAccount backfill failed (${error instanceof Error ? error.name : typeof error})`,
    );
  });
  if (!W().organizationUUID)
    logForDebugging(
      "[daemon:remoteControl] no org identity; GrowthBook not initialized, gates serve cached/default values",
    );
  else
    b().catch((error) => {
      logForDebugging(
        `[daemon:remoteControl] GrowthBook init failed (${error instanceof Error ? error.name : typeof error}); feature gates keep serving the disk cache`,
        {
          level: "error",
        },
      );
    });
  if (!isDaemonWorkerRegistryEnabled()) {
    let e = await checkRemoteControlWorkerEligibility();
    if (e !== undefined) {
      a(e.reason);
      await L();
      process.exit(e.retry ? 1 : EXIT_CONFIG_ERROR);
    }
  }
  let { runBridgeHeadless, BridgeHeadlessPermanentError } = await import("./chunk-wbbfk060.js");
  let D = null;
  let H = false;
  let V = (e) => {
    if (typeof process.send !== "function") return;
    try {
      process.send(e);
    } catch {}
  };
  let Z = (busy) =>
    V({
      type: "rc_busy",
      busy,
    });
  let j = () => {
    if (D !== null) {
      clearInterval(D);
      D = null;
    }
  };
  let onBusyChange = (e) => {
    let busy = e > 0;
    if (busy !== H) {
      H = busy;
      Z(busy);
    }
    if (busy) {
      if (D === null) {
        D = setInterval((S) => S(true), DAEMON_RESTART_WAIT_MS, Z);
        D.unref?.();
      }
    } else j();
  };
  let persistActiveSessionsOnShutdown = x("tengu_daemon_upgrade_defer_busy", true);
  let ne = null;
  let B = () => {};
  let promise = new Promise((resolve) => {
    B = resolve;
  });
  let se = (e) => {
    if (isShutdownResult(e)) {
      ne = getRestartCause(e) ?? null;
      B();
    }
  };
  process.on("message", se);
  let awaitShutdownCause = async () => {
    await Promise.race([promise, sleep(DAEMON_POLL_MS)]);
    return ne;
  };
  let K;
  let createToolHostHandler;
  let q;
  try {
    let e = await import("./chunk-svk9hz69.js");
    let checks = e.liveToolHostChecks(m.dir, w);
    let switches = e.liveToolHostSwitches({
      dir: m.dir,
      checks,
      isOfferingFolder: () => K?.getToolHostAdvert().kind === "advertise",
      hasAccessToken: () => Boolean(y()),
    });
    let A;
    let c = false;
    K = await e.watchToolHostAdvert({
      dir: m.dir,
      log: a,
      checks,
      refuse: e.helperRefusal,
      onVerdict: (P) => {
        if (A !== undefined && e.isSwitchedOffRemotely(P))
          A.sweep("gate_off").catch((error) => logError(toError(error)));
      },
    });
    createToolHostHandler = (P) => {
      try {
        A = e.buildToolHostWorkHandler(
          {
            folder: m.dir,
            switches,
            ...P,
            onLiveCountChange: (count) =>
              V({
                type: "rc_serving_tools",
                count,
              }),
          },
          {
            unattendedGrant: undefined,
            withoutShellSecrets: false,
          },
        );
      } catch (error) {
        logError(toError(error));
      }
      return A;
    };
    let R;
    q = async () => {
      if (A !== undefined) R ??= e.sweepToolHostForShutdown(A);
      await R;
    };
    n.addEventListener("abort", () => void q?.(), {
      once: true,
    });
  } catch (error) {
    logError(toError(error));
  }
  let ee = false;
  try {
    await runBridgeHeadless(
      {
        dir: m.dir,
        name: m.name,
        spawnMode: m.spawnMode,
        capacity: m.capacity,
        permissionMode: m.permissionMode,
        createSessionOnStart: m.createSessionOnStart,
        getAccessToken: y,
        onAuth401: s.reportAuth401,
        log: a,
        storageV5: h,
        credentials: w,
        onBusyChange,
        persistActiveSessionsOnShutdown,
        awaitShutdownCause,
        getToolHostAdvert: K?.getToolHostAdvert,
        createToolHostHandler,
      },
      n,
    );
  } catch (error) {
    if (!(error instanceof BridgeHeadlessPermanentError)) throw error;
    a(error.message);
    ee = true;
  } finally {
    await q?.();
    j();
    K?.stop();
    process.off("message", se);
    await L();
  }
  if (ee) process.exit(EXIT_CONFIG_ERROR);
};
//@ chunk-e3de30et.js:13196-13634 placement
/**
 * 检查 Remote Control worker 的资格（桥接阻断码、最低版本、组织）。
 */
async function checkRemoteControlWorkerEligibility() {
  let [{ getBridgeBlockedCode: r }, { checkBridgeMinVersion: n }, { getUserAttributes: a }] =
    await Promise.all([
      import("./chunk-zke21f1q.js"),
      import("./chunk-9z591zgb.js"),
      import("./chunk-6df1d6re.js"),
    ]);
  if (!a().organizationUUID)
    return {
      reason: remoteControlStartError("token_scope_limited"),
      retry: false,
    };
  let s = await r();
  if (s !== null)
    return {
      reason: remoteControlStartError(s),
      retry: s === "flags_unreachable" || s === "not_signed_in",
    };
  let h = n();
  return h === null
    ? undefined
    : {
        reason: h,
        retry: false,
      };
}
//@ chunk-e3de30et.js:13634-13749 placement
function remoteControlStartError(r) {
  return `Remote Control cannot start (${r}). Run \`claude remote-control\` in a terminal to see why.`;
}
//@ chunk-e3de30et.js:13749-14031 placement
/**
 * 在 daemon 配置中添加或更新某目录的远程控制项，返回 added/updated。
 */
async function upsertRemoteControlDir(r, n, a) {
  return withFeatureTelemetry("daemon_rc_add", async () => {
    let s = "added";
    await updateDaemonConfig(
      (h) => {
        let w = normalizeDirEntries(h.remoteControl);
        let index = w.findIndex((k) => k.dir === r.dir);
        if (index >= 0) {
          let k = pickByHelper(r, (T) => T !== undefined);
          w[index] = {
            ...w[index],
            ...k,
          };
          s = "updated";
        } else {
          w.push(r);
          s = "added";
        }
        h.remoteControl = w;
      },
      n,
      a,
    );
    return s;
  });
}
//@ chunk-e3de30et.js:14031-14268 placement
/**
 * 从 daemon 配置中移除某目录的远程控制项，空时删除该字段。
 */
async function removeRemoteControlDir(r, n, a) {
  return withFeatureTelemetry("daemon_rc_remove", async () => {
    await updateDaemonConfig(
      (s) => {
        let h = normalizeDirEntries(s.remoteControl);
        let filtered = h.filter((m) => m.dir !== r);
        if (filtered.length === h.length) return false;
        if (filtered.length === 0) delete s.remoteControl;
        else s.remoteControl = filtered;
      },
      n,
      a,
    );
  });
}
export {
  removeRemoteControlDir,
  checkRemoteControlWorkerEligibility,
  upsertRemoteControlDir,
  DaemonConfigSchema,
  handleRemoteControlInput,
  isShutdownResult,
  createWorkerAuthClient,
  createDaemonAuthManager,
};
