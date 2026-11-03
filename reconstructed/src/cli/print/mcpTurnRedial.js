/**
 * cli/print/mcpTurnRedial.ts
 *
 * 2.1.316 新增：MCP 重试编排、下一回合重拨与宿主 OTel 事件转发
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (37)
 * attribution: placement 37
 */
import { isDeepStrictEqual } from "util";
import { mcpClientModule } from "./hostSettingsClaims.js";
import {
  commandBelongsToServer,
  isRetryableConnectionFailure,
  isRetriableOrForbidden,
  isProxyForbiddenFailure,
} from "../../services/mcp/utils.js";
import { sleep } from "../../utils/sleep.js";
import {
  applyMcpReconnect,
  serverItemsOf,
  refusalStateFor,
  shouldCommitReconnect,
} from "../../services/mcp/mcpReconnect.js";
import { identityEpoch } from "../../services/mcp/identityChange.js";
import { serverCacheKey, getConnectionTimeoutMs } from "../../services/mcp/client.js";
import { mcpDialBlockCause, isMcpServerDisabled } from "../../services/mcp/config.js";
import { mcpGateError } from "../../services/mcp/mcpToggleMessages.js";
import { withConfigScope } from "../../services/mcp/mcpToolDecoration.js";
import { mcpAuthToolsFor } from "../../services/mcp/needsAuthCache.js";
import {
  clearDiscoveryPathMemo,
  cacheGrantLeg,
  strikeAfterLazyDialFailure,
} from "../../services/mcp/discoveryCache.js";
import { isSameConnectedClient } from "../../services/mcp/toolSchemaValidation.js";
import { applyMcpServerConfig } from "../../components/mcp/MCPListPanel.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { trackTransientRetryPass, CONNECT_RETRY_DELAYS_MS } from "../../services/mcp/connectionBatch.js";
import { getCliOwnedState } from "../../services/mcp/cliOwnedClients.js";
import { CACHED_ADOPT_SIGNAL, CACHED_DIAL_FAILED_SIGNAL } from "../../services/mcp/connectionFlags.js";
import { getMcpPrefix, isToolFromMcpServer } from "../../services/mcp/mcpStringUtils.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logError } from "../../utils/log.js";
import { count } from "../../utils/collections.js";
import { logEvent } from "../../services/analytics/index.js";
import { logForDiagnosticsNoPII, liveWeakRefs, propagateAbort } from "../../utils/diagLogs.js";
import { identityMap } from "../../remote/tools/protocolConstants.js";
import {
  featureBadNameBuilder,
  logFeatureOk,
  logFeatureSad,
} from "../../services/analytics/featureTelemetry.js";
import { identityId2 } from "../../types/ids.js";
import {
  getHostOtelState,
  getEventLoggerOwner,
  getEventLogger,
  isOTelInitPending,
  getOTelWindowCloseCause,
} from "../../bootstrap/state.js";
import {
  MAX_NORMALIZED_TEXT_CHARS,
  truncateNormalizedText,
} from "../../services/analytics/eventSerialization.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../../services/analytics/safeMetadata.js";
import { isVsCodeTopSession, isTopHostSession } from "../../utils/sessionShape.js";
import { env } from "../../utils/env.js";
import { shouldSkipFeedbackSurvey } from "../../utils/hostEnvironment.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { DEFAULT_SURVEY_TIMING } from "../../components/FeedbackSurvey/useFeedbackSurvey.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { getGlobalConfig } from "../../utils/config.js";
import { isConsumerSubscriber } from "../../utils/auth.js";

//@ chunk-tyg7f3ek.js:516479-516760 placement
function pickServerResultsAfterRetry(e, n, r) {
  let s = mcpClientModule();
  return {
    tools: s.getToolsListErrorForResult(r.tools) ? toolsOfServer(e, n) : r.tools,
    prompts: s.getDiscoveryFetchError(r.prompts)
      ? e.commands.filter((command) => commandBelongsToServer(command, n) && command.loadedFrom !== "mcp")
      : r.prompts,
    resources: s.getDiscoveryFetchError(r.resources) ? e.resources[n] : r.resources,
  };
}
//@ chunk-tyg7f3ek.js:516760-522351 placement
/**
 * print 模式 MCP 重连编排：轮次开始时对失败/需认证的服务器重拨（tengu_snug_reef 次数），保留缓存行。
 */
function createMcpRetryOrchestrator(e) {
  let {
    getAppState,
    storageV5,
    credentials,
    isControlReconnectInFlight,
    ownsCachedRow = () => true,
    isRunEnding = () => false,
    reuseServedSchemas = false,
    keepListsOnNeedsAuth = false,
    onRetryRejected,
    sleep: sleep_2 = sleep,
  } = e;
  let q = (ie, Se) => applyMcpReconnect(e, ie, Se);
  let x = (ie) => ie?.type === "cached" || (keepListsOnNeedsAuth && ie?.type === "needs-auth");
  let G = (ie, Se) => {
    if (!ownsCachedRow(ie)) return;
    (async () => {
      let me = identityEpoch();
      try {
        let found = getAppState().mcp.clients.find((client) => client.name === ie);
        if (!x(found) || serverCacheKey(ie, found.config) !== serverCacheKey(ie, Se)) return;
        let Ee = mcpClientModule();
        let He = mcpDialBlockCause(ie, Se);
        let Xe =
          He === "managed-policy"
            ? {
                name: ie,
                type: "failed",
                config: Se,
                ...mcpGateError(He, ie, Se),
              }
            : isMcpServerDisabled(ie)
              ? {
                  name: ie,
                  type: "disabled",
                  config: Se,
                }
              : He
                ? {
                    name: ie,
                    type: "failed",
                    config: Se,
                    ...mcpGateError(He, ie, Se),
                  }
                : undefined;
        if (Xe) {
          Ee.clearServerCache(ie, Se).catch(() => {});
          if (He) Ee.dropDiscoveryEntry(ie, Se).catch(() => {});
          q(ie, {
            client: Xe,
            tools: [],
            commands: [],
            attemptEpoch: me,
          });
          return;
        }
        let We = await Ee.connectToServer(ie, Se, undefined, storageV5, credentials);
        if (identityEpoch() !== me) {
          if (We.type === "connected") Ee.detachAndCloseConnection(We).catch(() => {});
          return;
        }
        if (isRunEnding()) return;
        if (isMcpServerDisabled(ie)) {
          q(ie, {
            client: We,
            tools: [],
            commands: [],
            attemptEpoch: me,
          });
          return;
        }
        if (We.type === "needs-auth") {
          if (found.type === "needs-auth") return;
          q(ie, {
            client: withConfigScope(We, found.config),
            ...(keepListsOnNeedsAuth
              ? serverItemsOf(getAppState().mcp, ie)
              : {
                  tools: mcpAuthToolsFor(ie, found.config),
                  commands: [],
                }),
            attemptEpoch: me,
          });
          return;
        }
        if (We.type !== "connected") return;
        clearDiscoveryPathMemo(ie);
        let grantLeg = await cacheGrantLeg(ie, Se);
        if (identityEpoch() !== me) {
          Ee.detachAndCloseConnection(We).catch(() => {});
          return;
        }
        let wt = !!We.capabilities?.resources;
        let [Lt, pn, _n, Mn] = await Promise.all([
          Ee.fetchToolsForClient(We, storageV5),
          Ee.fetchCommandsForClient(We),
          Promise.resolve([]),
          wt ? Ee.fetchResourcesForClient(We) : Promise.resolve([]),
        ]);
        if ((await Ee.peekSettledConnection(ie, Se)) !== We) return;
        let found_2 = getAppState().mcp.clients.find((client) => client.name === ie);
        if (
          (found_2?.type !== "cached" &&
            !(keepListsOnNeedsAuth && (found_2 === found || isSameConnectedClient(found_2, We)))) ||
          isRunEnding()
        )
          return;
        let mcp = getAppState().mcp;
        if (Ee.getToolsListErrorForResult(Lt) !== undefined && hasAuthStubTools(mcp, ie)) {
          Ee.clearServerCache(ie, Se).catch(() => {});
          return;
        }
        let ze = pickServerResultsAfterRetry(mcp, ie, {
          tools: Lt,
          prompts: pn,
          resources: Mn,
        });
        let Dr =
          reuseServedSchemas && ze.tools === Lt
            ? new Map(toolsOfServer(mcp, ie).map(($n) => [$n.name, $n.inputJSONSchema]))
            : undefined;
        if (
          q(
            ie,
            applyMcpServerConfig(found.config, {
              client: We,
              tools:
                Dr === undefined
                  ? ze.tools
                  : Lt.map(($n) => {
                      let ut = Dr.get($n.name);
                      return ut !== undefined && isDeepStrictEqual(ut, $n.inputJSONSchema)
                        ? {
                            ...$n,
                            inputJSONSchema: ut,
                          }
                        : $n;
                    }),
              commands: [...ze.prompts, ..._n],
              resources: ze.resources,
              attemptEpoch: me,
            }),
          ) !== "applied"
        )
          return;
        Ee.persistLiveListing(We, {
          tools: Lt,
          commands: pn,
          resources: Mn,
          identityEpoch: me,
          grantLeg,
        });
      } catch (error) {
        logForDebugging(
          `Failed to adopt cached MCP server ${ie} after lazy connect: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
    })();
  };
  let Z = async (ie, Se, me, Me, Ee, He) => {
    let found = getAppState().mcp.clients.find((client) => client.name === ie);
    if (Me() || identityEpoch() !== me || found?.type !== "failed" || isMcpServerDisabled(ie))
      return "not_dialed";
    if (isControlReconnectInFlight(ie)) return "not_dialed";
    if (He?.(found)) return "not_yet";
    let We = mcpDialBlockCause(ie, Se);
    if (We) {
      q(ie, {
        client: {
          name: ie,
          type: "failed",
          config: Se,
          ...mcpGateError(We, ie, Se),
        },
        tools: [],
        commands: [],
        attemptEpoch: me,
      });
      return "not_dialed";
    }
    let St = mcpClientModule();
    let wt = await St.reconnectMcpServerImpl(ie, Se, storageV5, credentials, {
      keepConnectionInUse: true,
    }).catch(() => {
      return;
    });
    if (!wt) return "other";
    let Lt =
      wt.client.type === "connected" &&
      isSameConnectedClient(await St.peekSettledConnection(ie, Se), wt.client);
    let pn = wt.client.type === "connected" && (Me() || isControlReconnectInFlight(ie) || !Lt);
    let found_2 = getAppState().mcp.clients.find((client) => client.name === ie);
    let Mn = wt.keptConnectionInUse === true && refusalStateFor(ie, wt.client) === undefined;
    let jn = Mn && wt.client.type === "connected" && wt.client.toolsListError !== undefined;
    if (
      pn ||
      jn ||
      Me() ||
      found_2?.type !== "failed" ||
      !St.areMcpConfigsEqual(found_2.config, Se) ||
      (Ee !== undefined && found_2 !== Ee)
    ) {
      if (
        wt.client.type === "connected" &&
        shouldCommitReconnect(wt.client, Se, found_2, Lt && (Mn || !Me()))
      )
        St.detachAndCloseConnection(wt.client).catch(() => {});
      if (!Mn) return "dropped";
      return jn || !Lt ? "not_yet" : "not_dialed";
    }
    if (Ee !== undefined && isRetryableConnectionFailure(wt.client)) return "transient";
    let Jn = q(ie, {
      ...wt,
      tools: wt.client.type === "needs-auth" ? mcpAuthToolsFor(ie, Se) : wt.tools,
      attemptEpoch: me,
    });
    if (Jn === "superseded" || (Ee !== undefined && Jn !== "applied")) return Mn ? "not_dialed" : "dropped";
    if (wt.client.type === "connected")
      return wt.client.toolsListError || wt.client.discoveryBearerRejected ? "degraded" : "connected";
    return isRetriableOrForbidden(wt.client) ? "transient" : "other";
  };
  let re = async (ie, config) => {
    using me = trackTransientRetryPass([ie]);
    let Me = identityEpoch();
    for (let [Ee, He] of CONNECT_RETRY_DELAYS_MS.entries()) {
      await sleep_2(He);
      let Xe = await Z(
        ie,
        config,
        Me,
        isRunEnding,
        undefined,
        (We) =>
          We.proxyConnectStatus === 403 &&
          (Ee < CONNECT_RETRY_DELAYS_MS.length - 1 || !isProxyForbiddenFailure(We)),
      );
      if (Xe !== "transient" && Xe !== "not_yet") return;
    }
  };
  let redialFailedRow = async (ie, Se) => {
    if (await mcpClientModule().hasUnsettledDial(ie.name, ie.config)) return "not_dialed";
    if (getCliOwnedState().transientRetryPasses.has(ie.name)) return "not_dialed";
    let me = identityEpoch();
    if (getAppState().mcp.clients.find((client) => client.name === ie.name) !== ie) return "not_dialed";
    let Me = await Z(
      ie.name,
      ie.config,
      me,
      () => {
        try {
          return isRunEnding() || Se();
        } catch (error) {
          logForDebugging(
            `[MCP] Could not tell whether retrying ${ie.name} is still allowed, so it is stopped: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
          return true;
        }
      },
      ie,
    );
    return Me === "not_yet" ? "not_dialed" : Me;
  };
  let Ue = (ie, Se) => {
    let { name: me, config } = ie;
    if (!ownsCachedRow(me)) return;
    let found = getAppState().mcp.clients.find((client) => client.name === me);
    if (!x(found) || serverCacheKey(me, found.config) !== serverCacheKey(me, config)) return;
    if (Se && hasAuthStubTools(getAppState().mcp, me)) return;
    q(me, {
      client: ie,
      tools: [],
      commands: [],
      attemptEpoch: identityEpoch(),
    });
    if (isRetriableOrForbidden(ie)) {
      let He = re(me, config);
      if (onRetryRejected) He.catch((error) => onRetryRejected(me, error));
    }
    if (Se) strikeAfterLazyDialFailure(me, config);
  };
  return {
    onCachedAdopt: G,
    onCachedDialFailed: Ue,
    redialFailedRow,
    subscribe: () => {
      let ie = CACHED_ADOPT_SIGNAL.subscribe(G);
      let Se = CACHED_DIAL_FAILED_SIGNAL.subscribe((me, Me) => {
        mcpClientModule().takeSettledCachedDialFailure(me.name, me.config);
        Ue(me, Me);
      });
      return () => {
        ie();
        Se();
      };
    },
    catchUp: () => {
      let filtered = getAppState().mcp.clients.filter(
        (client) => client.type === "cached" && ownsCachedRow(client.name),
      );
      if (filtered.length === 0) return;
      (async () => {
        let Se = mcpClientModule();
        for (let me of filtered) {
          if (isRunEnding()) return;
          let Me = Se.takeSettledCachedDialFailure(me.name, me.config);
          let Ee = await Se.peekSettledConnection(me.name, me.config);
          if (Ee?.type === "connected" || Ee?.type === "needs-auth") {
            CACHED_ADOPT_SIGNAL.emit(me.name, me.config);
            continue;
          }
          if (Me && !(await Se.hasUnsettledDial(me.name, me.config)) && !isRunEnding())
            Ue(Me.failure, Me.ownStrike);
        }
      })().catch(() => {});
    },
  };
}
//@ chunk-tyg7f3ek.js:522351-522416 placement
function hasAuthStubTools(e, n) {
  return toolsOfServer(e, n).some((r) => r.mcpInfo?.isAuthStub);
}
//@ chunk-tyg7f3ek.js:522416-522483 placement
function toolsOfServer(e, n) {
  let mcpPrefix = getMcpPrefix(n);
  return e.tools.filter((tool) => isToolFromMcpServer(tool, n, mcpPrefix));
}
//@ chunk-tyg7f3ek.js:522483-522518 placement
var MCP_REDIAL_LIMITS = 10;
var MCP_REDIAL_RECENT_WINDOW_MS = 30000;
var MAX_CONCURRENT_MCP_DIALS = 20;
var MCP_REDIAL_MAX_DELAY_MS = 600000;
//@ chunk-tyg7f3ek.js:522518-522559 placement
function redialTimeoutMs() {
  return Math.min(2 * getConnectionTimeoutMs(), MCP_REDIAL_MAX_DELAY_MS);
}
//@ chunk-tyg7f3ek.js:522559-522610 placement
function isRetryableFailedRow(e) {
  return isRetryableConnectionFailure(e) && e.errorCode !== undefined;
}
//@ chunk-tyg7f3ek.js:522610-522741 placement
function maxTurnRedials() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_snug_reef", 0);
  return typeof featureValue_CACHED_MAY_BE_STALE === "number" &&
    Number.isFinite(featureValue_CACHED_MAY_BE_STALE)
    ? Math.min(Math.max(Math.trunc(featureValue_CACHED_MAY_BE_STALE), 0), MCP_REDIAL_LIMITS)
    : 0;
}
//@ chunk-tyg7f3ek.js:522741-526560 placement
/**
 * 跨轮次记录失败 MCP 服务器并在下一轮开始时重拨（tengu_mcp_next_turn_redial）。
 */
function createNextTurnRedialer(e) {
  let n = new Map();
  let r = new Map();
  let s = (L) => {
    let q = n.get(L.name);
    return q?.row === L ? q : undefined;
  };
  let h = (L) => (L === undefined ? 0 : L.turns + L.heldTurns);
  let y = (L) => isRetryableFailedRow(L) || (isProxyForbiddenFailure(L) && s(L) !== undefined);
  let S = (L) => {
    if (L.type !== "failed") return false;
    try {
      let q = e.isOpen() ? e.rows().find((Z) => Z.name === L.name) : undefined;
      if (
        q === undefined ||
        !y(q) ||
        (q.config !== L.config && serverCacheKey(q.name, q.config) !== serverCacheKey(L.name, L.config))
      )
        return false;
      let x = n.get(q.name);
      let G = x !== undefined && x.dial !== "none" ? x : s(q);
      return G?.dial === "awaited" || (h(G) < maxTurnRedials() && e.allows(q));
    } catch (error) {
      logError(error);
      return false;
    }
  };
  let R = (L, q) => {
    let { name: x } = L.row;
    if (n.get(x) !== L) return;
    let found = e.rows().find((Z) => Z.name === x);
    if (
      q === "transient" &&
      found !== undefined &&
      (isRetryableFailedRow(found) || isProxyForbiddenFailure(found))
    )
      L.row = found;
    else if (found !== L.row) n.delete(x);
  };
  let w = async (L) => {
    let q = s(L);
    let turns = q?.turns ?? 0;
    let G = {
      turns: turns + 1,
      heldTurns: 0,
      dial: "awaited",
      heldBack: undefined,
      row: L,
    };
    n.set(L.name, G);
    let Z = Promise.resolve()
      .then(() => e.redial(L))
      .catch((error) => {
        logForDebugging(
          `[MCP] Retrying ${L.name} at the start of a turn threw (counted as a failed attempt): ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
        return "other";
      });
    let abortController = new AbortController();
    let winner = await Promise.race([
      Z,
      sleep(redialTimeoutMs(), abortController.signal, {
        unref: true,
      }).then(() => "written_off"),
    ]);
    abortController.abort();
    if (winner !== "not_dialed") r.set(L.name, performance.now());
    if (winner === "written_off") {
      G.dial = "written_off";
      Z.then((Ue) => {
        G.dial = "none";
        r.set(L.name, performance.now());
        R(G, Ue);
      }).catch(logError);
      return {
        outcome: "written_off",
        first: turns === 0,
      };
    }
    G.dial = "none";
    if (winner === "not_dialed") {
      if (q === undefined) n.delete(L.name);
      else n.set(L.name, q);
    } else R(G, winner);
    return {
      outcome: winner === "transient" && n.get(L.name) !== G ? "other" : winner,
      first: turns === 0 && winner !== "not_dialed",
    };
  };
  let turnStarted = () => {
    if (!e.isOpen()) return;
    let L = e.rows();
    let filtered = L.filter(y);
    for (let [He, Xe] of n)
      if (
        Xe.dial === "none"
          ? !filtered.includes(Xe.row)
          : Xe.dial === "written_off" && !filtered.some((We) => We.name === He)
      )
        n.delete(He);
    let startTime = performance.now();
    for (let [He, Xe] of r) if (startTime - Xe >= MCP_REDIAL_RECENT_WINDOW_MS) r.delete(He);
    let G = filtered.length === 0 ? 0 : maxTurnRedials();
    if (G === 0) return;
    let filtered_2 = filtered.filter((He) => e.allows(He));
    let filtered_3 = L.filter(
      (He) => He.type === "pending" && He.reconnectAttempt === undefined && He.config.type !== "sdk",
    );
    let transientRetryPasses = getCliOwnedState().transientRetryPasses;
    let Ue = (name) => startTime - (r.get(name) ?? Number.NEGATIVE_INFINITY) < MCP_REDIAL_RECENT_WINDOW_MS;
    let ce = (He, Xe) => {
      if (h(He) < G && !Ue(He.row.name)) {
        He[Xe]++;
        r.set(He.row.name, startTime);
      }
    };
    let nt = (He) => {
      He.heldBack = undefined;
      He.heldTurns = 0;
    };
    for (let He of n.values()) if (!filtered_2.includes(He.row)) nt(He);
    let ie = 0;
    let Se = 0;
    let me = 0;
    let Me = [];
    for (let He of filtered_2) {
      let Xe = n.get(He.name);
      let We = s(He);
      if (Xe !== undefined && Xe.dial !== "none") {
        me++;
        if (Xe.dial === "written_off") ce(Xe, "turns");
        continue;
      }
      let St = filtered_3[0] ?? (transientRetryPasses.has(He.name) ? "backoff" : undefined);
      if (St !== undefined) {
        me++;
        let wt = We ?? {
          turns: 0,
          heldTurns: 0,
          dial: "none",
          heldBack: undefined,
          row: He,
        };
        n.set(He.name, wt);
        if (
          wt.heldBack === undefined ||
          (wt.heldBack.by !== St && (wt.heldBack.by === "backoff" || !filtered_3.includes(wt.heldBack.by)))
        ) {
          nt(wt);
          wt.heldBack = {
            by: St,
            since: startTime,
          };
        }
        if (startTime - wt.heldBack.since >= redialTimeoutMs()) ce(wt, "heldTurns");
        continue;
      }
      if (We !== undefined) nt(We);
      if (h(We) >= G) ie++;
      else if (Ue(He.name)) Se++;
      else Me.push(He);
    }
    let sliced = Me.toSorted((He, Xe) => (s(He)?.turns ?? 0) - (s(Xe)?.turns ?? 0)).slice(
      0,
      Math.max(0, MAX_CONCURRENT_MCP_DIALS - count([...n.values()], (He) => He.dial === "awaited")),
    );
    if (sliced.length === 0) return;
    return Promise.all(sliced.map(w))
      .then((He) => {
        let Xe = (Lt) => count(He, (pn) => pn.outcome === Lt);
        let We = sliced.length - Xe("not_dialed");
        if (We === 0) return;
        let St = Xe("connected");
        let wt = {
          turnLimit: G,
          candidates: filtered_2.length,
          dialed: We,
          firstAttempts: count(He, (Lt) => Lt.first),
          recovered: St,
          connectedWithoutTools: Xe("degraded"),
          failedAgain: Xe("transient"),
          notInstalled: Xe("dropped"),
          writtenOff: Xe("written_off"),
          refused: Xe("not_dialed"),
          overCap: Me.length - sliced.length,
          skippedAtLimit: ie,
          skippedBusy: me,
          skippedTooSoon: Se,
          durationMs: Math.round(performance.now() - startTime),
        };
        logEvent("tengu_mcp_next_turn_redial", wt);
        logForDiagnosticsNoPII("info", "mcp_next_turn_redial", () =>
          identityMap(wt, (Lt, pn) => featureBadNameBuilder(pn)),
        );
        if (St === We) logFeatureOk("mcp_next_turn_redial");
        else logFeatureSad("mcp_next_turn_redial", St > 0 ? "some_not_recovered" : "none_recovered");
        e.report?.(wt);
      })
      .catch(logError);
  };
  getCliOwnedState().awaitsNextTurnRedial = S;
  return {
    turnStarted,
    uninstall: () => {
      let cliOwnedState = getCliOwnedState();
      if (cliOwnedState.awaitsNextTurnRedial === S) cliOwnedState.awaitsNextTurnRedial = null;
    },
  };
}
//@ chunk-tyg7f3ek.js:526560-526932 placement
class PendingMcpToolsByServer {
  byServer = new Map();
  get size() {
    let e = 0;
    for (let n of this.byServer.values()) e += liveWeakRefs(n).length;
    return e;
  }
  add(e) {
    for (let n of e) {
      let r = this.byServer.get(n.name);
      if (r === undefined) {
        r = new Set();
        this.byServer.set(n.name, r);
      }
      propagateAbort(r, identityId2(n.client));
    }
  }
  async closeFor(e) {
    let n = this.byServer.get(e);
    if (n === undefined) return;
    this.byServer.delete(e);
    await Promise.all(liveWeakRefs(n).map((r) => r.close()));
  }
}
//@ chunk-tyg7f3ek.js:526932-527124 placement
var HOST_OTEL_LIMITS = /^(?=[\s\S]{1,64}$)[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/;
var HOST_OTEL_KEY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
var MAX_OTEL_ATTRIBUTES = 32;
var MAX_OTEL_VALUE_CHARS = 16384;
var EVENT_ORIGIN = "event_origin";
var EVENT_ORIGIN_SERVER = "event_origin_server";
var HOST = "host.";
var SDK_HOST = "sdk_host.";
var HOST_OTEL_REFILL_PER_MINUTE = 120;
var HOST_OTEL_BUCKET_SIZE = 240;
//@ chunk-tyg7f3ek.js:527124-527271 placement
function reportHostOtelDrop(e) {
  let hostOtelState = getHostOtelState();
  if (hostOtelState.reportedDropReasons.has(e)) return;
  hostOtelState.reportedDropReasons.add(e);
  if (getEventLoggerOwner() === "beta") return;
  logFeatureSad("mcp_host_otel_route", e);
}
//@ chunk-tyg7f3ek.js:527271-527320 placement
function logHostOtelDrop(reason, n, r) {
  reportHostOtelDrop(reason);
  logForDebugging(
    n,
    r
      ? {
          level: r,
        }
      : undefined,
  );
}
//@ chunk-tyg7f3ek.js:527320-527424 placement
function logHostOtelDropOnce(e, n, r) {
  if (getHostOtelState().reportedDropReasons.has(e)) return;
  try {
    reportHostOtelDrop(e);
    logForDebugging(
      n,
      r
        ? {
            level: r,
          }
        : undefined,
    );
  } catch {}
}
//@ chunk-tyg7f3ek.js:527424-527538 placement
function logOnceByReason(e, n) {
  let hostOtelState = getHostOtelState();
  if (hostOtelState.reportedDropReasons.has(e)) return;
  hostOtelState.reportedDropReasons.add(e);
  try {
    logForDebugging(n);
  } catch {}
}
//@ chunk-tyg7f3ek.js:527538-527647 placement
function markHostOtelRouteOk() {
  let hostOtelState = getHostOtelState();
  if (!hostOtelState.featureOkLogged && getEventLoggerOwner() === "org") {
    hostOtelState.featureOkLogged = true;
    logFeatureOk("mcp_host_otel_route");
  }
}
//@ chunk-tyg7f3ek.js:527647-527856 placement
function takeHostOtelRateToken(e) {
  let hostOtelState = getHostOtelState();
  let rateTokens = hostOtelState.rateTokens ?? HOST_OTEL_BUCKET_SIZE;
  let rateLastRefillMs = hostOtelState.rateLastRefillMs ?? e;
  hostOtelState.rateTokens = Math.min(
    HOST_OTEL_BUCKET_SIZE,
    rateTokens + (Math.max(0, e - rateLastRefillMs) / 60000) * HOST_OTEL_REFILL_PER_MINUTE,
  );
  hostOtelState.rateLastRefillMs = Math.max(rateLastRefillMs, e);
  if (hostOtelState.rateTokens < 1) return false;
  hostOtelState.rateTokens -= 1;
  return true;
}
//@ chunk-tyg7f3ek.js:527856-528822 placement
function canRouteHostOtel(e) {
  let n =
    e === "survey"
      ? {
          loggerNotReady: "survey_logger_not_ready",
          rateCapped: "survey_rate_capped",
          otlpNotConfigured: "survey_otlp_not_configured",
          otlpInitFailed: "survey_otlp_init_failed",
        }
      : {
          loggerNotReady: "logger_not_ready",
          rateCapped: "rate_capped",
          otlpNotConfigured: "otlp_not_configured",
          otlpInitFailed: "otlp_init_failed",
        };
  if (!getEventLogger()) {
    if (!isOTelInitPending()) {
      if (getOTelWindowCloseCause() === "init_failed") {
        logHostOtelDropOnce(
          n.otlpInitFailed,
          `host OTLP ${e} record dropped: telemetry init failed before producing a logger; further drops are not logged this session`,
        );
        return false;
      }
      logOnceByReason(
        n.otlpNotConfigured,
        `host OTLP ${e} record dropped: no OTLP logs exporter configured; further drops are not logged this session`,
      );
      return false;
    }
    logOnceByReason(
      n.loggerNotReady,
      `host OTLP ${e} record dropped: telemetry logger not ready; further drops are not logged this session`,
    );
    return false;
  }
  if (!takeHostOtelRateToken(Date.now())) {
    logHostOtelDropOnce(
      n.rateCapped,
      `host OTLP ${e} record dropped: rate cap reached; further drops are not logged this session`,
      "warn",
    );
    return false;
  }
  return true;
}
//@ chunk-tyg7f3ek.js:528822-529886 placement
/**
 * 校验宿主转发的 OTLP 事件名与属性（命名规则、长度、禁止 claude_code./host. 前缀）。
 */
function validateHostOtelEvent(e, n, r) {
  if (typeof e !== "string" || !HOST_OTEL_LIMITS.test(e))
    return {
      ok: false,
      reason: "bad_event_name",
    };
  if (e.startsWith("claude_code.") || e.startsWith(HOST))
    return {
      ok: false,
      reason: "bad_event_name",
    };
  if (
    typeof n !== "object" ||
    n === null ||
    Array.isArray(n) ||
    (Object.getPrototypeOf(n) !== Object.prototype && Object.getPrototypeOf(n) !== null)
  )
    return {
      ok: false,
      reason: "bad_attributes_shape",
    };
  let ownPropertyDescriptors = Object.getOwnPropertyDescriptors(n);
  if (Object.getOwnPropertySymbols(ownPropertyDescriptors).length > 0)
    return {
      ok: false,
      reason: "bad_attributes_shape",
    };
  let h = [];
  for (let R of Object.getOwnPropertyNames(ownPropertyDescriptors)) {
    let w = ownPropertyDescriptors[R];
    if (w === undefined || w.get !== undefined || w.set !== undefined || w.enumerable !== true)
      return {
        ok: false,
        reason: "bad_attributes_shape",
      };
    h.push([R, w.value]);
  }
  if (h.length > MAX_OTEL_ATTRIBUTES)
    return {
      ok: false,
      reason: "too_many_attributes",
    };
  let y = {};
  let S = e.length;
  for (let [R, w] of h) {
    if (!HOST_OTEL_KEY_PATTERN.test(R))
      return {
        ok: false,
        reason: "bad_attribute_key",
      };
    if (typeof w !== "string" || w.length > MAX_NORMALIZED_TEXT_CHARS)
      return {
        ok: false,
        reason: "bad_attribute_value",
      };
    S += R.length + w.length;
    if (S > MAX_OTEL_VALUE_CHARS)
      return {
        ok: false,
        reason: "payload_too_large",
      };
    y[SDK_HOST + R] = truncateNormalizedText(w);
  }
  y[EVENT_ORIGIN] = "sdk_host";
  y[EVENT_ORIGIN_SERVER] = truncateNormalizedText(r);
  return {
    ok: true,
    eventName: e,
    attributes: y,
  };
}
//@ chunk-tyg7f3ek.js:529886-530299 placement
function routeHostOtelEnvelope(params, name) {
  try {
    if (typeof params !== "object" || params === null || Array.isArray(params)) {
      logHostOtelDropOnce(
        "bad_envelope",
        "host OTLP event dropped: bad_envelope (params is not an object); further envelope drops are not logged this session",
        "warn",
      );
      return;
    }
    let { eventName, attributes } = params;
    emitHostOtelEvent(eventName, attributes, name);
  } catch {
    logHostOtelDropOnce(
      "bad_envelope",
      "host OTLP event dropped: bad_envelope (envelope read threw); further envelope drops are not logged this session",
      "warn",
    );
  }
}
//@ chunk-tyg7f3ek.js:530299-530736 placement
function emitHostOtelEvent(eventName, attributes, r) {
  try {
    if (!canRouteHostOtel("route")) return;
    let s = validateHostOtelEvent(eventName, attributes, r);
    if (!s.ok) {
      logHostOtelDrop(s.reason, `host OTLP event dropped: ${s.reason}`);
      return;
    }
    logOTelEvent(`${HOST}${s.eventName}`, s.attributes)
      .then(
        () => {
          markHostOtelRouteOk();
        },
        () => {
          logHostOtelDropOnce("emit_failed", "host OTLP event emit failed");
        },
      )
      .catch(() => {});
  } catch (error) {
    let h = "unknown";
    try {
      if (error instanceof Error) {
        let y = error.name;
        if (typeof y === "string") h = truncateToLength(y, 256);
      }
    } catch {}
    try {
      logHostOtelDrop("route_error", `host OTLP event route error: ${h}`, "warn");
    } catch {}
  }
}
//@ chunk-tyg7f3ek.js:530736-530984 placement
function notificationErrorReporter(e, n) {
  return (r) => {
    try {
      let s = "unreadable error value";
      try {
        let message = r?.message;
        s = truncateToLength(typeof message === "string" ? message : String(r), 256);
      } catch {}
      logHostOtelDropOnce(
        e,
        `${n} notification channel error: ${s}; further channel errors are not logged this session`,
        "warn",
      );
    } catch {}
  };
}
//@ chunk-tyg7f3ek.js:530984-531139 placement
function hookClientNotificationErrors(e, n, r) {
  let notificationErrorHookedClients = getCliOwnedState().notificationErrorHookedClients;
  if (notificationErrorHookedClients.has(e)) return;
  notificationErrorHookedClients.add(e);
  let onerror = e.onerror;
  let y = notificationErrorReporter(n, r);
  e.onerror = (S) => {
    try {
      onerror?.(S);
    } catch {}
    y(S);
  };
}
//@ chunk-tyg7f3ek.js:531139-532023 placement
/**
 * 宿主 OTel 调查问卷的事件类型与各字段合法取值集合，以及按集合净化的 enum 构造函数。
 */
var SURVEY_EVENT_TYPES = new Set([
  "appeared",
  "responded",
  "abandoned",
  "followup_prompt_appeared",
  "followup_skipped",
  "followup_submitted",
  "followup_text_submitted",
  "followup_text_failed",
]);
var SURVEY_RESPONSE_VALUES = new Set(["bad", "fine", "good", "not_sure", "dismissed"]);
var SURVEY_TYPE_VALUES = new Set(["session", "post_compact", "memory", "long_context"]);
var SURVEY_SURFACE_VALUES = new Set(["ide", "desktop"]);
var SURVEY_FOLLOWUP_BOX_VALUES = new Set(["every_rating", "bad_only", "none"]);
var SURVEY_NO_FOLLOWUP_REASON_VALUES = new Set([
  "no_answer",
  "not_allowed",
  "gate_off",
  "refused",
  "saved_locally",
]);
var SURVEY_ERROR_CODE_VALUES = new Set(
  Object.keys({
    auth_error: true,
    auth_refused: true,
    data_residency: true,
    http_error: true,
    missing_feedback_id: true,
    network_error: true,
    not_first_party: true,
    org_refused: true,
    payload_too_large_413: true,
    payload_too_large_precheck: true,
    payload_too_large_range_error: true,
    payload_too_large_timeout: true,
    policy_blocked: true,
    scope_refused: true,
    timeout: true,
    zdr_org: true,
    unknown: true,
    unavailable: true,
  }),
);
var MESSAGE_RATING_SENTIMENT_VALUES = new Set(["positive", "negative"]);
var MESSAGE_RATING_SURFACE_VALUES = new Set(["tool_use", "assistant_text"]);
//@ chunk-tyg7f3ek.js:532023-532090 placement
function sanitizeEnum(e, n) {
  return typeof e === "string" && n.has(e) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : undefined;
}
//@ chunk-tyg7f3ek.js:532090-532121 placement
function surveyEventType(eventType) {
  return sanitizeEnum(eventType, SURVEY_EVENT_TYPES);
}
//@ chunk-tyg7f3ek.js:532121-532152 placement
function surveyResponse(response) {
  return sanitizeEnum(response, SURVEY_RESPONSE_VALUES);
}
//@ chunk-tyg7f3ek.js:532152-532183 placement
function surveyResponseEnum(surveyType) {
  return sanitizeEnum(surveyType, SURVEY_TYPE_VALUES);
}
//@ chunk-tyg7f3ek.js:532183-532214 placement
function surveySurfaceEnum(surface) {
  return sanitizeEnum(surface, SURVEY_SURFACE_VALUES);
}
//@ chunk-tyg7f3ek.js:532214-532245 placement
function surveyReasonEnum(followupBox) {
  return sanitizeEnum(followupBox, SURVEY_FOLLOWUP_BOX_VALUES);
}
//@ chunk-tyg7f3ek.js:532245-532276 placement
function surveyFollowupEnum(noFollowupReason) {
  return sanitizeEnum(noFollowupReason, SURVEY_NO_FOLLOWUP_REASON_VALUES);
}
//@ chunk-tyg7f3ek.js:532276-532307 placement
function surveyTriggerEnum(errorCode) {
  return sanitizeEnum(errorCode, SURVEY_ERROR_CODE_VALUES);
}
//@ chunk-tyg7f3ek.js:532307-532338 placement
function surveyOutcomeEnum(sentiment) {
  return sanitizeEnum(sentiment, MESSAGE_RATING_SENTIMENT_VALUES);
}
//@ chunk-tyg7f3ek.js:532338-532369 placement
function surveySourceEnum(surface) {
  return sanitizeEnum(surface, MESSAGE_RATING_SURFACE_VALUES);
}
//@ chunk-tyg7f3ek.js:532369-532420 placement
function stringOrUndefined(e) {
  return typeof e === "string" ? e : undefined;
}
//@ chunk-tyg7f3ek.js:532420-532782 placement
function vscodeSurveyConfig() {
  if (!isVsCodeTopSession() && !isTopHostSession()) return;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_feedback_survey", false)) return;
  if (env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY) return;
  if (shouldSkipFeedbackSurvey()) return;
  if (!isPolicyAllowed("allow_product_feedback")) return;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_feedback_survey_config",
    DEFAULT_SURVEY_TIMING,
  );
  return {
    ...featureValue_CACHED_MAY_BE_STALE,
    probability: getInitialSettings_2().feedbackSurveyRate ?? featureValue_CACHED_MAY_BE_STALE.probability,
    lastSurveyShownTime: getGlobalConfig().feedbackSurveyState?.lastShownTime ?? null,
  };
}
//@ chunk-tyg7f3ek.js:532782-532948 placement
function feedbackSurveyCapabilities() {
  let e = isVsCodeTopSession();
  if (!e && !isTopHostSession()) return;
  let n = isConsumerSubscriber();
  return {
    transcript_allowed: n,
    logs_followup: true,
    every_rating:
      e &&
      n &&
      vscodeSurveyConfig() !== undefined &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_curried_sparrow", false),
  };
}
export {
  PendingMcpToolsByServer,
  createMcpRetryOrchestrator,
  createNextTurnRedialer,
  pickServerResultsAfterRetry,
  vscodeSurveyConfig,
  feedbackSurveyCapabilities,
  surveyEventType,
  surveyResponse,
  surveyResponseEnum,
  stringOrUndefined,
  surveySurfaceEnum,
  surveyReasonEnum,
  surveyFollowupEnum,
  surveyTriggerEnum,
  canRouteHostOtel,
  markHostOtelRouteOk,
  logHostOtelDropOnce,
  routeHostOtelEnvelope,
  surveyOutcomeEnum,
  surveySourceEnum,
  hookClientNotificationErrors,
};
