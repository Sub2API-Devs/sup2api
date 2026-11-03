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
import { u, o, U, E, Ka, M } from "../../vendor/zod/v4/classic/schemas.js";
import { normalizePermissionModeAlias, EXTERNAL_PERMISSION_MODES } from "../types/permissions.js";
import { SANDBOX_SETTING_HINT, BRIDGE_LOGIN_ERROR } from "../bridge/types.js";
import { EXIT_CONFIG_ERROR } from "../utils/exitCodes.js";
import { getBridgeTokenOverride } from "../bridge/bridgeConfig.js";
import { logForDebugging } from "../utils/debug.js";
import { isDaemonWorkerRegistryEnabled } from "../utils/fleetGates.js";
import { sleep } from "../utils/sleep.js";
import { logError } from "../utils/log.js";
import { updateDaemonConfig, normalizeDirEntries } from "./scheduledWorker.js";
import { Do } from "../utils/git/gitSafeEnv.js";

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
function Te(r) {
  return typeof r === "object" && r !== null && "type" in r && r.type === "auth_401";
}
//@ chunk-e3de30et.js:1348-1403 placement
var Ae = 300000,
  ue = 240000,
  Se = 300000,
  be = 30000,
  _e = 86400000;
//@ chunk-e3de30et.js:1403-1457 placement
function pe() {
  return STORAGE_SPACES.state("daemon-auth-cooldown");
}
//@ chunk-e3de30et.js:1457-1509 placement
function Ce() {
  return STORAGE_SPACES.state("daemon-auth-status");
}
/**
 * daemon 认证管理：令牌更新广播、401 处理、冷却、组织查询。
 */
//@ chunk-e3de30et.js:1509-8583 placement
function createDaemonAuthManager(r, n, a, s, h, w = () => !1) {
  let m = () => ({ usesLoginOffFirstParty: a() }),
    k,
    T = !1,
    y = null,
    v = new Set(),
    b = null,
    x = null;
  function W() {
    return (x ??= import("./chunk-7v0gj88m.js"));
  }
  function L(e) {
    let i = { type: "token_update", accessToken: e };
    for (let S of v)
      try {
        S.send(i);
      } catch {}
  }
  let F;
  async function re(e, i = !1) {
    if (F === e || getPlatform() !== "macos" || !(i || w()) || isEssentialTrafficOnly()) return;
    F = e;
    try {
      let S = await W();
      if (S.isUsing3PServices() && !m().usesLoginOffFirstParty) {
        X(e);
        return;
      }
      if ((await S.getClaudeAIOAuthTokenOriginAsync(h)) !== "store") return;
      let {
          validateOauthTokenWithOutcome: validateOauthTokenWithOutcome,
          isTransientValidateFailure: isTransientValidateFailure,
        } = await import("./chunk-qvg9yd32.js"),
        R = await validateOauthTokenWithOutcome(e);
      if (!R.ok) {
        let de = isTransientValidateFailure(R);
        if (de) X(e);
        (logFeatureSad("daemon_snapshot_org_lookup", R.reason, { transient: de }),
          n(`auth: token organization lookup: no answer (${R.reason})`));
        return;
      }
      let P = R.data?.organization_uuid,
        O = typeof P === "string" && P ? P : null;
      if ((logFeatureOk("daemon_snapshot_org_lookup", { named: O !== null }), k?.accessToken === e))
        k = { ...k, organizationUuid: O };
    } catch {
      (X(e), n("auth: token organization lookup failed"));
    }
  }
  function X(e) {
    if (F === e) F = void 0;
  }
  function D(e) {
    ((k = {
      accessToken: e.accessToken,
      scopes: e.scopes,
      subscriptionType: e.subscriptionType ?? null,
      rateLimitTier: e.rateLimitTier ?? null,
      organizationUuid: null,
    }),
      re(e.accessToken));
  }
  async function H() {
    let claudeAIOAuthTokensAsync = await (await W()).getClaudeAIOAuthTokensAsync(h);
    if (claudeAIOAuthTokensAsync?.accessToken && claudeAIOAuthTokensAsync.accessToken !== k?.accessToken)
      (D(claudeAIOAuthTokensAsync), L(claudeAIOAuthTokensAsync.accessToken));
    G(claudeAIOAuthTokensAsync?.expiresAt ?? null);
  }
  let V,
    Z = !1;
  function j(e) {
    if (((V = e), b || r.aborted)) return;
    if (y) (clearTimeout(y), (y = null));
    (n("auth: no token found, will re-check keychain every 30s"),
      (b = setInterval(function () {
        W()
          .then(async (S) => {
            let A = S.isUsing3PServices() && !a() && !w();
            if (A !== Z)
              ((Z = A),
                n(
                  A
                    ? "auth: re-check skips the keychain (3P provider, no worker uses the token)"
                    : "auth: re-check reads the keychain again",
                ));
            if (A) return;
            S.clearOAuthTokenCache();
            let claudeAIOAuthTokensAsync = await S.getClaudeAIOAuthTokensAsync(h),
              R;
            if (
              claudeAIOAuthTokensAsync?.accessToken &&
              claudeAIOAuthTokensAsync.accessToken !== V &&
              claudeAIOAuthTokensAsync.expiresAt &&
              claudeAIOAuthTokensAsync.expiresAt > Date.now()
            )
              R = "auth: token found via keychain re-check";
            else if (
              claudeAIOAuthTokensAsync?.refreshToken &&
              (await S.checkAndRefreshOAuthTokenIfNeeded({ credentials: h, storageV5: s, ...m() }))
            )
              R = "auth: token refreshed via keychain re-check retry";
            if (R) {
              if ((await H(), k && b)) (clearInterval(b), (b = null), n(R));
            }
          })
          .catch((S) => n(`auth: keychain re-check error: ${S}`));
      }, be)),
      b.unref());
  }
  function G(e) {
    if (y) (clearTimeout(y), (y = null));
    if (!e || r.aborted) return;
    let min = Math.min(Math.max(e - Date.now() - ue, 5000), _e);
    (n(`auth: scheduling proactive refresh in ${Math.round(min / 1000)}s`),
      (y = setTimeout(ce, min)),
      y.unref());
  }
  async function ce() {
    if (r.aborted) return;
    try {
      n("auth: proactive refresh starting");
      let e = await W(),
        i = k?.accessToken,
        checkAndRefreshOAuthTokenIfNeeded = await e.checkAndRefreshOAuthTokenIfNeeded({
          credentials: h,
          storageV5: s,
          ...m(),
        });
      e.clearOAuthTokenCache();
      let claudeAIOAuthTokensAsync = await e.getClaudeAIOAuthTokensAsync(h),
        c = claudeAIOAuthTokensAsync?.expiresAt ?? null,
        R = c === null || c > Date.now() + Ae;
      if (
        claudeAIOAuthTokensAsync?.accessToken &&
        (checkAndRefreshOAuthTokenIfNeeded || claudeAIOAuthTokensAsync.accessToken !== i || R) &&
        (c === null || c > Date.now() + ue)
      ) {
        (await H(),
          n(
            checkAndRefreshOAuthTokenIfNeeded
              ? "auth: proactive refresh succeeded"
              : "auth: token still valid (cross-process refresh or not yet due)",
          ));
        return;
      }
      if (claudeAIOAuthTokensAsync?.accessToken && c !== null && c > Date.now()) {
        (n("auth: proactive refresh failed, retrying in ~60s (token still valid)"),
          G(Date.now() + 60000 + ue));
        return;
      }
      n("auth: proactive refresh failed, signalling re-auth required");
      let P = claudeAIOAuthTokensAsync?.accessToken ?? i;
      ((k = void 0), await ie(), j(P));
    } catch (error) {
      (n(`auth: proactive refresh error: ${error}`), G(Date.now() + 60000 + ue));
    }
  }
  async function ne(e) {
    if (T) return (n("auth: 401 ignored (3P provider active, no OAuth)"), !1);
    n("auth: handling 401");
    let i = await W();
    if (await i.handleOAuth401Error(e, h, s, m()))
      return (i.clearOAuthTokenCache(), await H(), n("auth: 401 recovery succeeded"), !0);
    (n("auth: 401 recovery failed, signalling re-auth required"),
      (k = void 0),
      await ie(),
      i.clearOAuthTokenCache());
    let claudeAIOAuthTokensAsync = await i.getClaudeAIOAuthTokensAsync(h);
    if (claudeAIOAuthTokensAsync?.accessToken !== void 0 && claudeAIOAuthTokensAsync.accessToken !== e)
      return (await H(), !0);
    return (j(e), !1);
  }
  let B = null;
  function ie() {
    if (B) return B;
    return (
      (B = se().finally(() => {
        B = null;
      })),
      B
    );
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
    let i = getClaudeConfigDir(),
      S = join(i, "daemon-auth-cooldown"),
      A = join(i, "daemon-auth-status.json");
    try {
      let c;
      if (isStorageV5Enabled() && s !== void 0) {
        let read = await s.read([pe()]);
        if (!read.ok)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `v5 cooldown read failed: ${read.error.code}${"telemetryCode" in read.error && read.error.telemetryCode ? ` (${read.error.telemetryCode})` : ""}`,
            "daemon-auth v5 cooldown read failed",
          );
        let O = read.value.items[0];
        c = O.found ? Buffer.from(O.value).toString("utf8") : null;
      } else c = await getFileReader().read(S);
      let R = c === null ? NaN : parseInt(c, 10);
      if (!Number.isNaN(R) && Date.now() - R < Se) {
        n("auth: browser login skipped (cooldown)");
        return;
      }
    } catch (error) {
      if (!isENOENT(error)) n(`auth: cooldown read error: ${error}`);
    }
    try {
      if ((await getFileReader().mkdir(i), isStorageV5Enabled() && s !== void 0)) {
        let write = await s.write(pe(), String(Date.now()), { publishDiscipline: "inPlace" });
        if (!write.ok)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `v5 cooldown write failed: ${write.error.code}${"telemetryCode" in write.error && write.error.telemetryCode ? ` (${write.error.telemetryCode})` : ""}`,
            "daemon-auth v5 cooldown write failed",
          );
      } else await getFileReader().write(S, String(Date.now()));
    } catch (error) {
      n(`auth: cooldown write error: ${error}`);
    }
    try {
      let { execFileNoThrow: execFileNoThrow } = await import("./chunk-xgggdgp8.js");
      execFileNoThrow("notify-send", ["Claude", "Your Claude assistant needs re-authentication"]);
    } catch {}
    try {
      if (isStorageV5Enabled() && s !== void 0) {
        let write = await s.write(Ce(), jsonStringify({ status: "auth_required", since: Date.now() }), {
          publishDiscipline: "inPlace",
        });
        if (!write.ok)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `v5 status write failed: ${write.error.code}${"telemetryCode" in write.error && write.error.telemetryCode ? ` (${write.error.telemetryCode})` : ""}`,
            "daemon-auth v5 status write failed",
          );
      } else await getFileReader().write(A, jsonStringify({ status: "auth_required", since: Date.now() }));
    } catch (error) {
      n(`auth: status write error: ${error}`);
    }
    n("auth: headless daemon cannot complete OAuth \u2014 run `claude auth login` to refresh");
  }
  function Q(e) {
    if (!Te(e)) return;
    ne(e.failedToken)
      .then((i) => {
        for (let S of v)
          try {
            let A = { type: "auth_401_result", refreshed: i, requestId: e.requestId };
            S.send(A);
          } catch {}
      })
      .catch((i) => {
        n(`auth: 401 handler error: ${i}`);
        for (let S of v)
          try {
            let A = { type: "auth_401_result", refreshed: !1, requestId: e.requestId };
            S.send(A);
          } catch {}
      });
  }
  function K(e) {
    if ((v.add(e), e.on("message", Q), k))
      try {
        let i = { type: "token_update", accessToken: k.accessToken };
        e.send(i);
      } catch {}
  }
  function ae(e) {
    (e.removeListener("message", Q), v.delete(e));
  }
  let q = (async () => {
    if (r.aborted) return;
    try {
      let e = await W(),
        claudeAIOAuthTokensAsync = await e.getClaudeAIOAuthTokensAsync(h);
      if (!claudeAIOAuthTokensAsync?.accessToken && e.isUsing3PServices()) {
        ((T = !0), n("auth: 3P provider active, skipping OAuth refresh loop"));
        return;
      }
      if (claudeAIOAuthTokensAsync?.accessToken)
        (D(claudeAIOAuthTokensAsync), G(claudeAIOAuthTokensAsync.expiresAt ?? null));
      (await e.checkAndRefreshOAuthTokenIfNeeded({ credentials: h, storageV5: s, ...m() }), await H());
    } catch (error) {
      n(`auth: init error: ${error}`);
    }
  })();
  return (
    q.then(() => {
      if (r.aborted || k || T) return;
      j();
    }),
    r.addEventListener(
      "abort",
      () => {
        if (y) (clearTimeout(y), (y = null));
        if (b) (clearInterval(b), (b = null));
      },
      { once: !0 },
    ),
    {
      ready: q,
      getAccessToken() {
        return k?.accessToken;
      },
      getAuthSnapshot() {
        if (k && !k.organizationUuid) re(k.accessToken, !0);
        return k;
      },
      attachWorker: K,
      detachWorker: ae,
      dispose: ee,
      [Symbol.dispose]: ee,
    }
  );
  function ee() {
    if (y) (clearTimeout(y), (y = null));
    if (b) (clearInterval(b), (b = null));
    for (let e of v) e.removeListener("message", Q);
    v.clear();
  }
}
/**
 * worker 侧认证客户端：通过 IPC 接收令牌更新、请求刷新。
 */
//@ chunk-e3de30et.js:8583-9560 placement
function createWorkerAuthClient(r, n, a) {
  if (typeof process.send === "function") {
    let k = function (T) {
        let y = m.get(T);
        if (y) (m.delete(T), y.resolve(!1));
      },
      w = r;
    process.on("message", (T) => {
      if (!isDaemonAuthMessage(T)) return;
      if (T.type === "token_update") w = T.accessToken;
    });
    let m = new Map();
    return (
      process.on("message", (T) => {
        if (typeof T === "object" && T !== null && "type" in T && T.type === "auth_401_result") {
          let y = T,
            v = m.get(y.requestId);
          if (v) (clearTimeout(v.timer), m.delete(y.requestId), v.resolve(y.refreshed));
        }
      }),
      process.channel?.unref(),
      {
        getAccessToken() {
          return w;
        },
        reportAuth401(T) {
          let y = randomUUID(),
            v = { type: "auth_401", failedToken: T, requestId: y };
          return new Promise((b) => {
            let x = setTimeout(k, 30000, y);
            (x.unref(), m.set(y, { resolve: b, timer: x }));
            try {
              process.send(v);
            } catch {
              (clearTimeout(x), m.delete(y), b(!1));
            }
          });
        },
      }
    );
  }
  let s = null;
  async function h() {
    return (s ??= await import("./chunk-7v0gj88m.js"));
  }
  return (
    h(),
    {
      getAccessToken() {
        return s?.getClaudeAIOAuthTokens()?.accessToken;
      },
      async reportAuth401(w) {
        return (await h()).handleOAuth401Error(w, n, a, { usesLoginOffFirstParty: !0 });
      },
    }
  );
}
//@ chunk-e3de30et.js:9560-9645 placement
function oe(r) {
  return typeof r === "object" && r !== null && "type" in r && r.type === "shutdown";
}
//@ chunk-e3de30et.js:9645-9805 placement
function getRestartCause(r) {
  if (!oe(r) || typeof r !== "object" || r === null || !("cause" in r)) return;
  return r.cause === "upgrade" || r.cause === "reload" || r.cause === "yield" ? r.cause : void 0;
}
/**
 * daemon 配置 schema（目录、名称、spawnMode、容量、权限模式等）。
 */
//@ chunk-e3de30et.js:9805-13196 placement
var DaemonConfigSchema = DoctorLazy(() =>
    u({
      dir: o(),
      name: o().optional(),
      spawnMode: U(["same-dir", "worktree"]).default("same-dir"),
      capacity: E().int().positive().default(32),
      permissionMode: Ka(normalizePermissionModeAlias, U(EXTERNAL_PERMISSION_MODES)).optional(),
      sandbox: M().optional(),
      sessionTimeoutSeconds: E().int().positive().optional(),
      createSessionOnStart: M().default(!1),
    }).strict(),
  ),
  Ee = 60000,
  Pe = 500,
  ye = async (r, n, a, s, h, w) => {
    let parse = DaemonConfigSchema().parse(r);
    if (parse.sandbox)
      (a(`The sandbox key is not supported for Remote Control. Remove it. ${SANDBOX_SETTING_HINT}`),
        process.exit(EXIT_CONFIG_ERROR));
    let { initializeErrorLogSink: initializeErrorLogSink } = await import("./chunk-nynswhsz.js"),
      { initializeAnalyticsSink: initializeAnalyticsSink } = await import("./chunk-dn8vrmng.js");
    (initializeErrorLogSink(), initializeAnalyticsSink());
    let y = () => getBridgeTokenOverride() ?? s.getAccessToken();
    if (!y()) (a(BRIDGE_LOGIN_ERROR), process.exit(1));
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
    if (
      (v(h),
      await F(w, h).catch((e) => {
        logForDebugging(
          `[daemon:remoteControl] oauthAccount backfill failed (${e instanceof Error ? e.name : typeof e})`,
        );
      }),
      !W().organizationUUID)
    )
      logForDebugging(
        "[daemon:remoteControl] no org identity; GrowthBook not initialized, gates serve cached/default values",
      );
    else
      b().catch((e) => {
        logForDebugging(
          `[daemon:remoteControl] GrowthBook init failed (${e instanceof Error ? e.name : typeof e}); feature gates keep serving the disk cache`,
          { level: "error" },
        );
      });
    if (!isDaemonWorkerRegistryEnabled()) {
      let e = await checkRemoteControlWorkerEligibility();
      if (e !== void 0) (a(e.reason), await L(), process.exit(e.retry ? 1 : EXIT_CONFIG_ERROR));
    }
    let { runBridgeHeadless: runBridgeHeadless, BridgeHeadlessPermanentError: BridgeHeadlessPermanentError } =
        await import("./chunk-wbbfk060.js"),
      D = null,
      H = !1,
      V = (e) => {
        if (typeof process.send !== "function") return;
        try {
          process.send(e);
        } catch {}
      },
      Z = (e) => V({ type: "rc_busy", busy: e }),
      j = () => {
        if (D !== null) (clearInterval(D), (D = null));
      },
      G = (e) => {
        let i = e > 0;
        if (i !== H) ((H = i), Z(i));
        if (i) {
          if (D === null) ((D = setInterval((S) => S(!0), Ee, Z)), D.unref?.());
        } else j();
      },
      ce = x("tengu_daemon_upgrade_defer_busy", !0),
      ne = null,
      B = () => {},
      promise = new Promise((e) => {
        B = e;
      }),
      se = (e) => {
        if (oe(e)) ((ne = getRestartCause(e) ?? null), B());
      };
    process.on("message", se);
    let Q = async () => (await Promise.race([promise, sleep(Pe)]), ne),
      K,
      ae,
      q;
    try {
      let e = await import("./chunk-svk9hz69.js"),
        liveToolHostChecks = e.liveToolHostChecks(parse.dir, w),
        liveToolHostSwitches = e.liveToolHostSwitches({
          dir: parse.dir,
          checks: liveToolHostChecks,
          isOfferingFolder: () => K?.getToolHostAdvert().kind === "advertise",
          hasAccessToken: () => Boolean(y()),
        }),
        A,
        c = !1;
      ((K = await e.watchToolHostAdvert({
        dir: parse.dir,
        log: a,
        checks: liveToolHostChecks,
        refuse: e.helperRefusal,
        onVerdict: (P) => {
          if (A !== void 0 && e.isSwitchedOffRemotely(P))
            A.sweep("gate_off").catch((O) => logError(toError(O)));
        },
      })),
        (ae = (P) => {
          try {
            A = e.buildToolHostWorkHandler(
              {
                folder: parse.dir,
                switches: liveToolHostSwitches,
                ...P,
                onLiveCountChange: (O) => V({ type: "rc_serving_tools", count: O }),
              },
              { unattendedGrant: void 0, withoutShellSecrets: !1 },
            );
          } catch (error) {
            logError(toError(error));
          }
          return A;
        }));
      let R;
      ((q = async () => {
        if (A !== void 0) R ??= e.sweepToolHostForShutdown(A);
        await R;
      }),
        n.addEventListener("abort", () => void q?.(), { once: !0 }));
    } catch (error) {
      logError(toError(error));
    }
    let ee = !1;
    try {
      await runBridgeHeadless(
        {
          dir: parse.dir,
          name: parse.name,
          spawnMode: parse.spawnMode,
          capacity: parse.capacity,
          permissionMode: parse.permissionMode,
          createSessionOnStart: parse.createSessionOnStart,
          getAccessToken: y,
          onAuth401: s.reportAuth401,
          log: a,
          storageV5: h,
          credentials: w,
          onBusyChange: G,
          persistActiveSessionsOnShutdown: ce,
          awaitShutdownCause: Q,
          getToolHostAdvert: K?.getToolHostAdvert,
          createToolHostHandler: ae,
        },
        n,
      );
    } catch (error) {
      if (!(error instanceof BridgeHeadlessPermanentError)) throw error;
      (a(error.message), (ee = !0));
    } finally {
      (await q?.(), j(), K?.stop(), process.off("message", se), await L());
    }
    if (ee) process.exit(EXIT_CONFIG_ERROR);
  };
/**
 * 检查 Remote Control worker 的资格（桥接阻断码、最低版本、组织）。
 */
//@ chunk-e3de30et.js:13196-13634 placement
async function checkRemoteControlWorkerEligibility() {
  let [{ getBridgeBlockedCode: r }, { checkBridgeMinVersion: n }, { getUserAttributes: a }] =
    await Promise.all([
      import("./chunk-zke21f1q.js"),
      import("./chunk-9z591zgb.js"),
      import("./chunk-6df1d6re.js"),
    ]);
  if (!a().organizationUUID) return { reason: remoteControlStartError("token_scope_limited"), retry: !1 };
  let s = await r();
  if (s !== null)
    return { reason: remoteControlStartError(s), retry: s === "flags_unreachable" || s === "not_signed_in" };
  let h = n();
  return h === null ? void 0 : { reason: h, retry: !1 };
}
//@ chunk-e3de30et.js:13634-13749 placement
function remoteControlStartError(r) {
  return `Remote Control cannot start (${r}). Run \`claude remote-control\` in a terminal to see why.`;
}
/**
 * 在 daemon 配置中添加或更新某目录的远程控制项，返回 added/updated。
 */
//@ chunk-e3de30et.js:13749-14031 placement
async function upsertRemoteControlDir(r, n, a) {
  return withFeatureTelemetry("daemon_rc_add", async () => {
    let s = "added";
    return (
      await updateDaemonConfig(
        (h) => {
          let w = normalizeDirEntries(h.remoteControl),
            index = w.findIndex((k) => k.dir === r.dir);
          if (index >= 0) {
            let k = Do(r, (T) => T !== void 0);
            ((w[index] = { ...w[index], ...k }), (s = "updated"));
          } else (w.push(r), (s = "added"));
          h.remoteControl = w;
        },
        n,
        a,
      ),
      s
    );
  });
}
/**
 * 从 daemon 配置中移除某目录的远程控制项，空时删除该字段。
 */
//@ chunk-e3de30et.js:14031-14268 placement
async function removeRemoteControlDir(r, n, a) {
  return withFeatureTelemetry("daemon_rc_remove", async () => {
    await updateDaemonConfig(
      (s) => {
        let h = normalizeDirEntries(s.remoteControl),
          filtered = h.filter((m) => m.dir !== r);
        if (filtered.length === h.length) return !1;
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
  ye,
  oe,
  createWorkerAuthClient,
  createDaemonAuthManager,
};
