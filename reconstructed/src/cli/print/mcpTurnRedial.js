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
import { isDeepStrictEqual, isDeepStrictEqual as isDeepStrictEqual_2 } from "util";
import { mcpClientModule } from "./hostSettingsClaims.js";
import { commandBelongsToServer, Njt, Bfn, isProxyForbiddenFailure } from "../../services/mcp/utils.js";
import { sleep } from "../../utils/sleep.js";
import {
  applyMcpReconnect,
  serverItemsOf,
  refusalStateFor,
  shouldCommitReconnect,
} from "../../services/mcp/mcpReconnect.js";
import { identityEpoch } from "../../services/mcp/identityChange.js";
import { ir, getConnectionTimeoutMs } from "../../services/mcp/client.js";
import { mcpDialBlockCause, isMcpServerDisabled } from "../../services/mcp/config.js";
import { mcpGateError } from "../../services/mcp/mcpToggleMessages.js";
import { withConfigScope } from "../../services/mcp/mcpToolDecoration.js";
import { mcpAuthToolsFor } from "../../services/mcp/needsAuthCache.js";
import { clearDiscoveryPathMemo, oq, strikeAfterLazyDialFailure } from "../../services/mcp/discoveryCache.js";
import { isSameConnectedClient } from "../../services/mcp/toolSchemaValidation.js";
import { applyMcpServerConfig } from "../../components/mcp/MCPListPanel.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { trackTransientRetryPass, Sen } from "../../services/mcp/connectionBatch.js";
import { ht } from "../../services/mcp/cliOwnedClients.js";
import { CACHED_ADOPT_SIGNAL, CACHED_DIAL_FAILED_SIGNAL } from "../../services/mcp/connectionFlags.js";
import { getMcpPrefix, isToolFromMcpServer } from "../../services/mcp/mcpStringUtils.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logError } from "../../utils/log.js";
import { count } from "../../utils/collections.js";
import { logEvent } from "../../services/analytics/index.js";
import { logForDiagnosticsNoPII, liveWeakRefs, propagateAbort } from "../../utils/diagLogs.js";
import { identityMap } from "../../remote/tools/protocolConstants.js";
import { IDn, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { oa } from "../../types/ids.js";
import {
  getHostOtelState,
  getEventLoggerOwner,
  getEventLogger,
  isOTelInitPending,
  getOTelWindowCloseCause,
} from "../../bootstrap/state.js";
import { $is, K6e } from "../../services/analytics/eventSerialization.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../../services/analytics/safeMetadata.js";
import { isVsCodeTopSession, isTopHostSession } from "../../utils/sessionShape.js";
import { env } from "../../utils/env.js";
import { shouldSkipFeedbackSurvey } from "../../utils/hostEnvironment.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { J0n } from "../../components/FeedbackSurvey/useFeedbackSurvey.js";
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
/**
 * print 模式 MCP 重连编排：轮次开始时对失败/需认证的服务器重拨（tengu_snug_reef 次数），保留缓存行。
 */
//@ chunk-tyg7f3ek.js:516760-522351 placement
function createMcpRetryOrchestrator(e) {
  let {
      getAppState: getAppState,
      storageV5: storageV5,
      credentials: credentials,
      isControlReconnectInFlight: isControlReconnectInFlight,
      ownsCachedRow: ownsCachedRow = () => !0,
      isRunEnding: isRunEnding = () => !1,
      reuseServedSchemas: reuseServedSchemas = !1,
      keepListsOnNeedsAuth: keepListsOnNeedsAuth = !1,
      onRetryRejected: onRetryRejected,
      sleep: sleep_2 = sleep,
    } = e,
    q = (ie, Se) => applyMcpReconnect(e, ie, Se),
    x = (ie) => ie?.type === "cached" || (keepListsOnNeedsAuth && ie?.type === "needs-auth"),
    G = (ie, Se) => {
      if (!ownsCachedRow(ie)) return;
      (async () => {
        let me = identityEpoch();
        try {
          let found = getAppState().mcp.clients.find((client) => client.name === ie);
          if (!x(found) || ir(ie, found.config) !== ir(ie, Se)) return;
          let Ee = mcpClientModule(),
            He = mcpDialBlockCause(ie, Se),
            Xe =
              He === "managed-policy"
                ? { name: ie, type: "failed", config: Se, ...mcpGateError(He, ie, Se) }
                : isMcpServerDisabled(ie)
                  ? { name: ie, type: "disabled", config: Se }
                  : He
                    ? { name: ie, type: "failed", config: Se, ...mcpGateError(He, ie, Se) }
                    : void 0;
          if (Xe) {
            if ((Ee.clearServerCache(ie, Se).catch(() => {}), He))
              Ee.dropDiscoveryEntry(ie, Se).catch(() => {});
            q(ie, { client: Xe, tools: [], commands: [], attemptEpoch: me });
            return;
          }
          let connectToServer = await Ee.connectToServer(ie, Se, void 0, storageV5, credentials);
          if (identityEpoch() !== me) {
            if (connectToServer.type === "connected")
              Ee.detachAndCloseConnection(connectToServer).catch(() => {});
            return;
          }
          if (isRunEnding()) return;
          if (isMcpServerDisabled(ie)) {
            q(ie, { client: connectToServer, tools: [], commands: [], attemptEpoch: me });
            return;
          }
          if (connectToServer.type === "needs-auth") {
            if (found.type === "needs-auth") return;
            q(ie, {
              client: withConfigScope(connectToServer, found.config),
              ...(keepListsOnNeedsAuth
                ? serverItemsOf(getAppState().mcp, ie)
                : { tools: mcpAuthToolsFor(ie, found.config), commands: [] }),
              attemptEpoch: me,
            });
            return;
          }
          if (connectToServer.type !== "connected") return;
          clearDiscoveryPathMemo(ie);
          let St = await oq(ie, Se);
          if (identityEpoch() !== me) {
            Ee.detachAndCloseConnection(connectToServer).catch(() => {});
            return;
          }
          let wt = !!connectToServer.capabilities?.resources,
            [Lt, pn, _n, Mn] = await Promise.all([
              Ee.fetchToolsForClient(connectToServer, storageV5),
              Ee.fetchCommandsForClient(connectToServer),
              Promise.resolve([]),
              wt ? Ee.fetchResourcesForClient(connectToServer) : Promise.resolve([]),
            ]);
          if ((await Ee.peekSettledConnection(ie, Se)) !== connectToServer) return;
          let found_2 = getAppState().mcp.clients.find((client) => client.name === ie);
          if (
            (found_2?.type !== "cached" &&
              !(
                keepListsOnNeedsAuth &&
                (found_2 === found || isSameConnectedClient(found_2, connectToServer))
              )) ||
            isRunEnding()
          )
            return;
          let mcp = getAppState().mcp;
          if (Ee.getToolsListErrorForResult(Lt) !== void 0 && hasAuthStubTools(mcp, ie)) {
            Ee.clearServerCache(ie, Se).catch(() => {});
            return;
          }
          let ze = pickServerResultsAfterRetry(mcp, ie, { tools: Lt, prompts: pn, resources: Mn }),
            Dr =
              reuseServedSchemas && ze.tools === Lt
                ? new Map(toolsOfServer(mcp, ie).map(($n) => [$n.name, $n.inputJSONSchema]))
                : void 0;
          if (
            q(
              ie,
              applyMcpServerConfig(found.config, {
                client: connectToServer,
                tools:
                  Dr === void 0
                    ? ze.tools
                    : Lt.map(($n) => {
                        let ut = Dr.get($n.name);
                        return ut !== void 0 && isDeepStrictEqual(ut, $n.inputJSONSchema)
                          ? { ...$n, inputJSONSchema: ut }
                          : $n;
                      }),
                commands: [...ze.prompts, ..._n],
                resources: ze.resources,
                attemptEpoch: me,
              }),
            ) !== "applied"
          )
            return;
          Ee.persistLiveListing(connectToServer, {
            tools: Lt,
            commands: pn,
            resources: Mn,
            identityEpoch: me,
            grantLeg: St,
          });
        } catch (error) {
          logForDebugging(
            `Failed to adopt cached MCP server ${ie} after lazy connect: ${errorMessage(error)}`,
            { level: "warn" },
          );
        }
      })();
    },
    Z = async (ie, Se, me, Me, Ee, He) => {
      let found = getAppState().mcp.clients.find((client) => client.name === ie);
      if (Me() || identityEpoch() !== me || found?.type !== "failed" || isMcpServerDisabled(ie))
        return "not_dialed";
      if (isControlReconnectInFlight(ie)) return "not_dialed";
      if (He?.(found)) return "not_yet";
      let We = mcpDialBlockCause(ie, Se);
      if (We)
        return (
          q(ie, {
            client: { name: ie, type: "failed", config: Se, ...mcpGateError(We, ie, Se) },
            tools: [],
            commands: [],
            attemptEpoch: me,
          }),
          "not_dialed"
        );
      let St = mcpClientModule(),
        wt = await St.reconnectMcpServerImpl(ie, Se, storageV5, credentials, {
          keepConnectionInUse: !0,
        }).catch(() => {
          return;
        });
      if (!wt) return "other";
      let Lt =
          wt.client.type === "connected" &&
          isSameConnectedClient(await St.peekSettledConnection(ie, Se), wt.client),
        pn = wt.client.type === "connected" && (Me() || isControlReconnectInFlight(ie) || !Lt),
        found_2 = getAppState().mcp.clients.find((client) => client.name === ie),
        Mn = wt.keptConnectionInUse === !0 && refusalStateFor(ie, wt.client) === void 0,
        jn = Mn && wt.client.type === "connected" && wt.client.toolsListError !== void 0;
      if (
        pn ||
        jn ||
        Me() ||
        found_2?.type !== "failed" ||
        !St.areMcpConfigsEqual(found_2.config, Se) ||
        (Ee !== void 0 && found_2 !== Ee)
      ) {
        if (
          wt.client.type === "connected" &&
          shouldCommitReconnect(wt.client, Se, found_2, Lt && (Mn || !Me()))
        )
          St.detachAndCloseConnection(wt.client).catch(() => {});
        if (!Mn) return "dropped";
        return jn || !Lt ? "not_yet" : "not_dialed";
      }
      if (Ee !== void 0 && Njt(wt.client)) return "transient";
      let Jn = q(ie, {
        ...wt,
        tools: wt.client.type === "needs-auth" ? mcpAuthToolsFor(ie, Se) : wt.tools,
        attemptEpoch: me,
      });
      if (Jn === "superseded" || (Ee !== void 0 && Jn !== "applied")) return Mn ? "not_dialed" : "dropped";
      if (wt.client.type === "connected")
        return wt.client.toolsListError || wt.client.discoveryBearerRejected ? "degraded" : "connected";
      return Bfn(wt.client) ? "transient" : "other";
    },
    re = async (ie, Se) => {
      using me = trackTransientRetryPass([ie]);
      let Me = identityEpoch();
      for (let [Ee, He] of Sen.entries()) {
        await sleep_2(He);
        let Xe = await Z(
          ie,
          Se,
          Me,
          isRunEnding,
          void 0,
          (We) => We.proxyConnectStatus === 403 && (Ee < Sen.length - 1 || !isProxyForbiddenFailure(We)),
        );
        if (Xe !== "transient" && Xe !== "not_yet") return;
      }
    },
    Ae = async (ie, Se) => {
      if (await mcpClientModule().hasUnsettledDial(ie.name, ie.config)) return "not_dialed";
      if (ht().transientRetryPasses.has(ie.name)) return "not_dialed";
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
            return (
              logForDebugging(
                `[MCP] Could not tell whether retrying ${ie.name} is still allowed, so it is stopped: ${errorMessage(error)}`,
                { level: "warn" },
              ),
              !0
            );
          }
        },
        ie,
      );
      return Me === "not_yet" ? "not_dialed" : Me;
    },
    Ue = (ie, Se) => {
      let { name: me, config: config } = ie;
      if (!ownsCachedRow(me)) return;
      let found = getAppState().mcp.clients.find((client) => client.name === me);
      if (!x(found) || ir(me, found.config) !== ir(me, config)) return;
      if (Se && hasAuthStubTools(getAppState().mcp, me)) return;
      if ((q(me, { client: ie, tools: [], commands: [], attemptEpoch: identityEpoch() }), Bfn(ie))) {
        let He = re(me, config);
        onRetryRejected && He.catch((Xe) => onRetryRejected(me, Xe));
      }
      if (Se) strikeAfterLazyDialFailure(me, config);
    };
  return {
    onCachedAdopt: G,
    onCachedDialFailed: Ue,
    redialFailedRow: Ae,
    subscribe: () => {
      let subscribe = CACHED_ADOPT_SIGNAL.subscribe(G),
        subscribe_2 = CACHED_DIAL_FAILED_SIGNAL.subscribe((me, Me) => {
          (mcpClientModule().takeSettledCachedDialFailure(me.name, me.config), Ue(me, Me));
        });
      return () => {
        (subscribe(), subscribe_2());
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
          let takeSettledCachedDialFailure = Se.takeSettledCachedDialFailure(me.name, me.config),
            peekSettledConnection = await Se.peekSettledConnection(me.name, me.config);
          if (peekSettledConnection?.type === "connected" || peekSettledConnection?.type === "needs-auth") {
            CACHED_ADOPT_SIGNAL.emit(me.name, me.config);
            continue;
          }
          if (
            takeSettledCachedDialFailure &&
            !(await Se.hasUnsettledDial(me.name, me.config)) &&
            !isRunEnding()
          )
            Ue(takeSettledCachedDialFailure.failure, takeSettledCachedDialFailure.ownStrike);
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
  let r = getMcpPrefix(n);
  return e.tools.filter((tool) => isToolFromMcpServer(tool, n, r));
}
//@ chunk-tyg7f3ek.js:522483-522518 placement
var MCP_REDIAL_LIMITS = 10,
  PO = 30000,
  nK = 20,
  sK = 600000;
//@ chunk-tyg7f3ek.js:522518-522559 placement
function redialTimeoutMs() {
  return Math.min(2 * getConnectionTimeoutMs(), sK);
}
//@ chunk-tyg7f3ek.js:522559-522610 placement
function isRetryableFailedRow(e) {
  return Njt(e) && e.errorCode !== void 0;
}
//@ chunk-tyg7f3ek.js:522610-522741 placement
function maxTurnRedials() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_snug_reef", 0);
  return typeof e === "number" && Number.isFinite(e)
    ? Math.min(Math.max(Math.trunc(e), 0), MCP_REDIAL_LIMITS)
    : 0;
}
/**
 * 跨轮次记录失败 MCP 服务器并在下一轮开始时重拨（tengu_mcp_next_turn_redial）。
 */
//@ chunk-tyg7f3ek.js:522741-526560 placement
function createNextTurnRedialer(e) {
  let n = new Map(),
    r = new Map(),
    s = (L) => {
      let q = n.get(L.name);
      return q?.row === L ? q : void 0;
    },
    h = (L) => (L === void 0 ? 0 : L.turns + L.heldTurns),
    y = (L) => isRetryableFailedRow(L) || (isProxyForbiddenFailure(L) && s(L) !== void 0),
    S = (L) => {
      if (L.type !== "failed") return !1;
      try {
        let q = e.isOpen() ? e.rows().find((Z) => Z.name === L.name) : void 0;
        if (q === void 0 || !y(q) || (q.config !== L.config && ir(q.name, q.config) !== ir(L.name, L.config)))
          return !1;
        let x = n.get(q.name),
          G = x !== void 0 && x.dial !== "none" ? x : s(q);
        return G?.dial === "awaited" || (h(G) < maxTurnRedials() && e.allows(q));
      } catch (error) {
        return (logError(error), !1);
      }
    },
    R = (L, q) => {
      let { name: x } = L.row;
      if (n.get(x) !== L) return;
      let found = e.rows().find((Z) => Z.name === x);
      if (
        q === "transient" &&
        found !== void 0 &&
        (isRetryableFailedRow(found) || isProxyForbiddenFailure(found))
      )
        L.row = found;
      else if (found !== L.row) n.delete(x);
    },
    w = async (L) => {
      let q = s(L),
        x = q?.turns ?? 0,
        G = { turns: x + 1, heldTurns: 0, dial: "awaited", heldBack: void 0, row: L };
      n.set(L.name, G);
      let Z = Promise.resolve()
          .then(() => e.redial(L))
          .catch(
            (Ue) => (
              logForDebugging(
                `[MCP] Retrying ${L.name} at the start of a turn threw (counted as a failed attempt): ${errorMessage(Ue)}`,
                { level: "warn" },
              ),
              "other"
            ),
          ),
        abortController = new AbortController(),
        winner = await Promise.race([
          Z,
          sleep(redialTimeoutMs(), abortController.signal, { unref: !0 }).then(() => "written_off"),
        ]);
      if ((abortController.abort(), winner !== "not_dialed")) r.set(L.name, performance.now());
      if (winner === "written_off")
        return (
          (G.dial = "written_off"),
          Z.then((Ue) => {
            ((G.dial = "none"), r.set(L.name, performance.now()), R(G, Ue));
          }).catch(logError),
          { outcome: "written_off", first: x === 0 }
        );
      if (((G.dial = "none"), winner === "not_dialed"))
        if (q === void 0) n.delete(L.name);
        else n.set(L.name, q);
      else R(G, winner);
      return {
        outcome: winner === "transient" && n.get(L.name) !== G ? "other" : winner,
        first: x === 0 && winner !== "not_dialed",
      };
    },
    P = () => {
      if (!e.isOpen()) return;
      let rows = e.rows(),
        filtered = rows.filter(y);
      for (let [He, Xe] of n)
        if (
          Xe.dial === "none"
            ? !filtered.includes(Xe.row)
            : Xe.dial === "written_off" && !filtered.some((We) => We.name === He)
        )
          n.delete(He);
      let startTime = performance.now();
      for (let [He, Xe] of r) if (startTime - Xe >= PO) r.delete(He);
      let G = filtered.length === 0 ? 0 : maxTurnRedials();
      if (G === 0) return;
      let filtered_2 = filtered.filter((He) => e.allows(He)),
        filtered_3 = rows.filter(
          (He) => He.type === "pending" && He.reconnectAttempt === void 0 && He.config.type !== "sdk",
        ),
        transientRetryPasses = ht().transientRetryPasses,
        Ue = (He) => startTime - (r.get(He) ?? Number.NEGATIVE_INFINITY) < PO,
        ce = (He, Xe) => {
          if (h(He) < G && !Ue(He.row.name)) (He[Xe]++, r.set(He.row.name, startTime));
        },
        nt = (He) => {
          ((He.heldBack = void 0), (He.heldTurns = 0));
        };
      for (let He of n.values()) if (!filtered_2.includes(He.row)) nt(He);
      let ie = 0,
        Se = 0,
        me = 0,
        Me = [];
      for (let He of filtered_2) {
        let Xe = n.get(He.name),
          We = s(He);
        if (Xe !== void 0 && Xe.dial !== "none") {
          if ((me++, Xe.dial === "written_off")) ce(Xe, "turns");
          continue;
        }
        let St = filtered_3[0] ?? (transientRetryPasses.has(He.name) ? "backoff" : void 0);
        if (St !== void 0) {
          me++;
          let wt = We ?? { turns: 0, heldTurns: 0, dial: "none", heldBack: void 0, row: He };
          if (
            (n.set(He.name, wt),
            wt.heldBack === void 0 ||
              (wt.heldBack.by !== St &&
                (wt.heldBack.by === "backoff" || !filtered_3.includes(wt.heldBack.by))))
          )
            (nt(wt), (wt.heldBack = { by: St, since: startTime }));
          if (startTime - wt.heldBack.since >= redialTimeoutMs()) ce(wt, "heldTurns");
          continue;
        }
        if (We !== void 0) nt(We);
        if (h(We) >= G) ie++;
        else if (Ue(He.name)) Se++;
        else Me.push(He);
      }
      let sliced = Me.toSorted((He, Xe) => (s(He)?.turns ?? 0) - (s(Xe)?.turns ?? 0)).slice(
        0,
        Math.max(0, nK - count([...n.values()], (He) => He.dial === "awaited")),
      );
      if (sliced.length === 0) return;
      return Promise.all(sliced.map(w))
        .then((He) => {
          let Xe = (Lt) => count(He, (pn) => pn.outcome === Lt),
            We = sliced.length - Xe("not_dialed");
          if (We === 0) return;
          let St = Xe("connected"),
            wt = {
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
          if (
            (logEvent("tengu_mcp_next_turn_redial", wt),
            logForDiagnosticsNoPII("info", "mcp_next_turn_redial", () =>
              identityMap(wt, (Lt, pn) => IDn(pn)),
            ),
            St === We)
          )
            logFeatureOk("mcp_next_turn_redial");
          else logFeatureSad("mcp_next_turn_redial", St > 0 ? "some_not_recovered" : "none_recovered");
          e.report?.(wt);
        })
        .catch(logError);
    };
  return (
    (ht().awaitsNextTurnRedial = S),
    {
      turnStarted: P,
      uninstall: () => {
        let L = ht();
        if (L.awaitsNextTurnRedial === S) L.awaitsNextTurnRedial = null;
      },
    }
  );
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
      if (r === void 0) ((r = new Set()), this.byServer.set(n.name, r));
      propagateAbort(r, oa(n.client));
    }
  }
  async closeFor(e) {
    let n = this.byServer.get(e);
    if (n === void 0) return;
    (this.byServer.delete(e), await Promise.all(liveWeakRefs(n).map((r) => r.close())));
  }
}
//@ chunk-tyg7f3ek.js:526932-527124 placement
var HOST_OTEL_LIMITS = /^(?=[\s\S]{1,64}$)[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/,
  aK = /^[a-z][a-z0-9_]{0,63}$/,
  lK = 32,
  uK = 16384,
  EVENT_ORIGIN = "event_origin",
  EVENT_ORIGIN_SERVER = "event_origin_server",
  HOST = "host.",
  SDK_HOST = "sdk_host.",
  gK = 120,
  DO = 240;
//@ chunk-tyg7f3ek.js:527124-527271 placement
function reportHostOtelDrop(e) {
  let n = getHostOtelState();
  if (n.reportedDropReasons.has(e)) return;
  if ((n.reportedDropReasons.add(e), getEventLoggerOwner() === "beta")) return;
  logFeatureSad("mcp_host_otel_route", e);
}
//@ chunk-tyg7f3ek.js:527271-527320 placement
function logHostOtelDrop(e, n, r) {
  (reportHostOtelDrop(e), logForDebugging(n, r ? { level: r } : void 0));
}
//@ chunk-tyg7f3ek.js:527320-527424 placement
function logHostOtelDropOnce(e, n, r) {
  if (getHostOtelState().reportedDropReasons.has(e)) return;
  try {
    (reportHostOtelDrop(e), logForDebugging(n, r ? { level: r } : void 0));
  } catch {}
}
//@ chunk-tyg7f3ek.js:527424-527538 placement
function logOnceByReason(e, n) {
  let r = getHostOtelState();
  if (r.reportedDropReasons.has(e)) return;
  r.reportedDropReasons.add(e);
  try {
    logForDebugging(n);
  } catch {}
}
//@ chunk-tyg7f3ek.js:527538-527647 placement
function markHostOtelRouteOk() {
  let e = getHostOtelState();
  if (!e.featureOkLogged && getEventLoggerOwner() === "org")
    ((e.featureOkLogged = !0), logFeatureOk("mcp_host_otel_route"));
}
//@ chunk-tyg7f3ek.js:527647-527856 placement
function takeHostOtelRateToken(e) {
  let n = getHostOtelState(),
    r = n.rateTokens ?? DO,
    s = n.rateLastRefillMs ?? e;
  if (
    ((n.rateTokens = Math.min(DO, r + (Math.max(0, e - s) / 60000) * gK)),
    (n.rateLastRefillMs = Math.max(s, e)),
    n.rateTokens < 1)
  )
    return !1;
  return ((n.rateTokens -= 1), !0);
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
      if (getOTelWindowCloseCause() === "init_failed")
        return (
          logHostOtelDropOnce(
            n.otlpInitFailed,
            `host OTLP ${e} record dropped: telemetry init failed before producing a logger; further drops are not logged this session`,
          ),
          !1
        );
      return (
        logOnceByReason(
          n.otlpNotConfigured,
          `host OTLP ${e} record dropped: no OTLP logs exporter configured; further drops are not logged this session`,
        ),
        !1
      );
    }
    return (
      logOnceByReason(
        n.loggerNotReady,
        `host OTLP ${e} record dropped: telemetry logger not ready; further drops are not logged this session`,
      ),
      !1
    );
  }
  if (!takeHostOtelRateToken(Date.now()))
    return (
      logHostOtelDropOnce(
        n.rateCapped,
        `host OTLP ${e} record dropped: rate cap reached; further drops are not logged this session`,
        "warn",
      ),
      !1
    );
  return !0;
}
/**
 * 校验宿主转发的 OTLP 事件名与属性（命名规则、长度、禁止 claude_code./host. 前缀）。
 */
//@ chunk-tyg7f3ek.js:528822-529886 placement
function validateHostOtelEvent(e, n, r) {
  if (typeof e !== "string" || !HOST_OTEL_LIMITS.test(e)) return { ok: !1, reason: "bad_event_name" };
  if (e.startsWith("claude_code.") || e.startsWith(HOST)) return { ok: !1, reason: "bad_event_name" };
  if (
    typeof n !== "object" ||
    n === null ||
    Array.isArray(n) ||
    (Object.getPrototypeOf(n) !== Object.prototype && Object.getPrototypeOf(n) !== null)
  )
    return { ok: !1, reason: "bad_attributes_shape" };
  let ownPropertyDescriptors = Object.getOwnPropertyDescriptors(n);
  if (Object.getOwnPropertySymbols(ownPropertyDescriptors).length > 0)
    return { ok: !1, reason: "bad_attributes_shape" };
  let h = [];
  for (let R of Object.getOwnPropertyNames(ownPropertyDescriptors)) {
    let w = ownPropertyDescriptors[R];
    if (w === void 0 || w.get !== void 0 || w.set !== void 0 || w.enumerable !== !0)
      return { ok: !1, reason: "bad_attributes_shape" };
    h.push([R, w.value]);
  }
  if (h.length > lK) return { ok: !1, reason: "too_many_attributes" };
  let y = {},
    S = e.length;
  for (let [R, w] of h) {
    if (!aK.test(R)) return { ok: !1, reason: "bad_attribute_key" };
    if (typeof w !== "string" || w.length > $is) return { ok: !1, reason: "bad_attribute_value" };
    if (((S += R.length + w.length), S > uK)) return { ok: !1, reason: "payload_too_large" };
    y[SDK_HOST + R] = K6e(w);
  }
  return (
    (y[EVENT_ORIGIN] = "sdk_host"),
    (y[EVENT_ORIGIN_SERVER] = K6e(r)),
    { ok: !0, eventName: e, attributes: y }
  );
}
//@ chunk-tyg7f3ek.js:529886-530299 placement
function routeHostOtelEnvelope(e, n) {
  try {
    if (typeof e !== "object" || e === null || Array.isArray(e)) {
      logHostOtelDropOnce(
        "bad_envelope",
        "host OTLP event dropped: bad_envelope (params is not an object); further envelope drops are not logged this session",
        "warn",
      );
      return;
    }
    let { eventName: eventName, attributes: attributes } = e;
    emitHostOtelEvent(eventName, attributes, n);
  } catch {
    logHostOtelDropOnce(
      "bad_envelope",
      "host OTLP event dropped: bad_envelope (envelope read threw); further envelope drops are not logged this session",
      "warn",
    );
  }
}
//@ chunk-tyg7f3ek.js:530299-530736 placement
function emitHostOtelEvent(e, n, r) {
  try {
    if (!canRouteHostOtel("route")) return;
    let s = validateHostOtelEvent(e, n, r);
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
        let h = r?.message;
        s = truncateToLength(typeof h === "string" ? h : String(r), 256);
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
  let notificationErrorHookedClients = ht().notificationErrorHookedClients;
  if (notificationErrorHookedClients.has(e)) return;
  notificationErrorHookedClients.add(e);
  let onerror = e.onerror,
    y = notificationErrorReporter(n, r);
  e.onerror = (S) => {
    try {
      onerror?.(S);
    } catch {}
    y(S);
  };
}
//@ chunk-tyg7f3ek.js:531139-532023 placement
var SURVEY_EVENT_TYPES = new Set([
    "appeared",
    "responded",
    "abandoned",
    "followup_prompt_appeared",
    "followup_skipped",
    "followup_submitted",
    "followup_text_submitted",
    "followup_text_failed",
  ]),
  wK = new Set(["bad", "fine", "good", "not_sure", "dismissed"]),
  vK = new Set(["session", "post_compact", "memory", "long_context"]),
  bK = new Set(["ide", "desktop"]),
  TK = new Set(["every_rating", "bad_only", "none"]),
  RK = new Set(["no_answer", "not_allowed", "gate_off", "refused", "saved_locally"]),
  CK = new Set(
    Object.keys({
      auth_error: !0,
      auth_refused: !0,
      data_residency: !0,
      http_error: !0,
      missing_feedback_id: !0,
      network_error: !0,
      not_first_party: !0,
      org_refused: !0,
      payload_too_large_413: !0,
      payload_too_large_precheck: !0,
      payload_too_large_range_error: !0,
      payload_too_large_timeout: !0,
      policy_blocked: !0,
      scope_refused: !0,
      timeout: !0,
      zdr_org: !0,
      unknown: !0,
      unavailable: !0,
    }),
  ),
  PK = new Set(["positive", "negative"]),
  MK = new Set(["tool_use", "assistant_text"]);
//@ chunk-tyg7f3ek.js:532023-532090 placement
function sanitizeEnum(e, n) {
  return typeof e === "string" && n.has(e) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : void 0;
}
//@ chunk-tyg7f3ek.js:532090-532121 placement
function surveyEventType(e) {
  return sanitizeEnum(e, SURVEY_EVENT_TYPES);
}
//@ chunk-tyg7f3ek.js:532121-532152 placement
function surveyResponse(e) {
  return sanitizeEnum(e, wK);
}
//@ chunk-tyg7f3ek.js:532152-532183 placement
function WO(e) {
  return sanitizeEnum(e, vK);
}
//@ chunk-tyg7f3ek.js:532183-532214 placement
function qO(e) {
  return sanitizeEnum(e, bK);
}
//@ chunk-tyg7f3ek.js:532214-532245 placement
function jO(e) {
  return sanitizeEnum(e, TK);
}
//@ chunk-tyg7f3ek.js:532245-532276 placement
function QO(e) {
  return sanitizeEnum(e, RK);
}
//@ chunk-tyg7f3ek.js:532276-532307 placement
function $O(e) {
  return sanitizeEnum(e, CK);
}
//@ chunk-tyg7f3ek.js:532307-532338 placement
function KO(e) {
  return sanitizeEnum(e, PK);
}
//@ chunk-tyg7f3ek.js:532338-532369 placement
function VO(e) {
  return sanitizeEnum(e, MK);
}
//@ chunk-tyg7f3ek.js:532369-532420 placement
function stringOrUndefined(e) {
  return typeof e === "string" ? e : void 0;
}
//@ chunk-tyg7f3ek.js:532420-532782 placement
function vscodeSurveyConfig() {
  if (!isVsCodeTopSession() && !isTopHostSession()) return;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_vscode_feedback_survey", !1)) return;
  if (env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY) return;
  if (shouldSkipFeedbackSurvey()) return;
  if (!isPolicyAllowed("allow_product_feedback")) return;
  let n = getFeatureValue_CACHED_MAY_BE_STALE("tengu_feedback_survey_config", J0n);
  return {
    ...n,
    probability: getInitialSettings_2().feedbackSurveyRate ?? n.probability,
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
    logs_followup: !0,
    every_rating:
      e &&
      n &&
      vscodeSurveyConfig() !== void 0 &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_curried_sparrow", !1),
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
  WO,
  stringOrUndefined,
  qO,
  jO,
  QO,
  $O,
  canRouteHostOtel,
  markHostOtelRouteOk,
  logHostOtelDropOnce,
  routeHostOtelEnvelope,
  KO,
  VO,
  hookClientNotificationErrors,
};
