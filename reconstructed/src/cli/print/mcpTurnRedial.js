/**
 * cli/print/mcpTurnRedial.ts
 *
 * 2.1.316 新增：MCP 重试编排、下一回合重拨与宿主 OTel 事件转发
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (10)
 * attribution: placement 10
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

//@ chunk-tyg7f3ek.js:516479-516760 placement
function pickServerResultsAfterRetry(mcp, serverName, results) {
  let mcpApi = mcpClientModule();
  return {
    tools: mcpApi.getToolsListErrorForResult(results.tools) ? toolsOfServer(mcp, serverName) : results.tools,
    prompts: mcpApi.getDiscoveryFetchError(results.prompts)
      ? mcp.commands.filter(
          (command) => commandBelongsToServer(command, serverName) && command.loadedFrom !== "mcp",
        )
      : results.prompts,
    resources: mcpApi.getDiscoveryFetchError(results.resources)
      ? mcp.resources[serverName]
      : results.resources,
  };
}
//@ chunk-tyg7f3ek.js:516760-522351 placement
/**
 * print 模式 MCP 重连编排：轮次开始时对失败/需认证的服务器重拨（tengu_snug_reef 次数），保留缓存行。
 */
function createMcpRetryOrchestrator(options) {
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
  } = options;
  let applyReconnect = (serverName, config) => applyMcpReconnect(options, serverName, config);
  let isReusable = (entry) =>
    entry?.type === "cached" || (keepListsOnNeedsAuth && entry?.type === "needs-auth");
  let onCachedAdopt = (serverName, config) => {
    if (!ownsCachedRow(serverName)) return;
    (async () => {
      let epoch = identityEpoch();
      try {
        let entry = getAppState().mcp.clients.find((client) => client.name === serverName);
        if (
          !isReusable(entry) ||
          serverCacheKey(serverName, entry.config) !== serverCacheKey(serverName, config)
        )
          return;
        let mcpApi = mcpClientModule();
        let blockCause = mcpDialBlockCause(serverName, config);
        let failedRow =
          blockCause === "managed-policy"
            ? {
                name: serverName,
                type: "failed",
                config,
                ...mcpGateError(blockCause, serverName, config),
              }
            : isMcpServerDisabled(serverName)
              ? {
                  name: serverName,
                  type: "disabled",
                  config,
                }
              : blockCause
                ? {
                    name: serverName,
                    type: "failed",
                    config,
                    ...mcpGateError(blockCause, serverName, config),
                  }
                : undefined;
        if (failedRow) {
          mcpApi.clearServerCache(serverName, config).catch(() => {});
          if (blockCause) mcpApi.dropDiscoveryEntry(serverName, config).catch(() => {});
          applyReconnect(serverName, {
            client: failedRow,
            tools: [],
            commands: [],
            attemptEpoch: epoch,
          });
          return;
        }
        let connection = await mcpApi.connectToServer(serverName, config, undefined, storageV5, credentials);
        if (identityEpoch() !== epoch) {
          if (connection.type === "connected") mcpApi.detachAndCloseConnection(connection).catch(() => {});
          return;
        }
        if (isRunEnding()) return;
        if (isMcpServerDisabled(serverName)) {
          applyReconnect(serverName, {
            client: connection,
            tools: [],
            commands: [],
            attemptEpoch: epoch,
          });
          return;
        }
        if (connection.type === "needs-auth") {
          if (entry.type === "needs-auth") return;
          applyReconnect(serverName, {
            client: withConfigScope(connection, entry.config),
            ...(keepListsOnNeedsAuth
              ? serverItemsOf(getAppState().mcp, serverName)
              : {
                  tools: mcpAuthToolsFor(serverName, entry.config),
                  commands: [],
                }),
            attemptEpoch: epoch,
          });
          return;
        }
        if (connection.type !== "connected") return;
        clearDiscoveryPathMemo(serverName);
        let grantLeg = await cacheGrantLeg(serverName, config);
        if (identityEpoch() !== epoch) {
          mcpApi.detachAndCloseConnection(connection).catch(() => {});
          return;
        }
        let hasResources = !!connection.capabilities?.resources;
        let [tools, prompts, extraPrompts, resources] = await Promise.all([
          mcpApi.fetchToolsForClient(connection, storageV5),
          mcpApi.fetchCommandsForClient(connection),
          Promise.resolve([]),
          hasResources ? mcpApi.fetchResourcesForClient(connection) : Promise.resolve([]),
        ]);
        if ((await mcpApi.peekSettledConnection(serverName, config)) !== connection) return;
        let found = getAppState().mcp.clients.find((client) => client.name === serverName);
        if (
          (found?.type !== "cached" &&
            !(keepListsOnNeedsAuth && (found === entry || isSameConnectedClient(found, connection)))) ||
          isRunEnding()
        )
          return;
        let mcp = getAppState().mcp;
        if (mcpApi.getToolsListErrorForResult(tools) !== undefined && hasAuthStubTools(mcp, serverName)) {
          mcpApi.clearServerCache(serverName, config).catch(() => {});
          return;
        }
        let picked = pickServerResultsAfterRetry(mcp, serverName, {
          tools,
          prompts,
          resources,
        });
        let servedSchemas =
          reuseServedSchemas && picked.tools === tools
            ? new Map(toolsOfServer(mcp, serverName).map((tool) => [tool.name, tool.inputJSONSchema]))
            : undefined;
        if (
          applyReconnect(
            serverName,
            applyMcpServerConfig(entry.config, {
              client: connection,
              tools:
                servedSchemas === undefined
                  ? picked.tools
                  : tools.map((tool) => {
                      let servedSchema = servedSchemas.get(tool.name);
                      return servedSchema !== undefined &&
                        isDeepStrictEqual(servedSchema, tool.inputJSONSchema)
                        ? {
                            ...tool,
                            inputJSONSchema: servedSchema,
                          }
                        : tool;
                    }),
              commands: [...picked.prompts, ...extraPrompts],
              resources: picked.resources,
              attemptEpoch: epoch,
            }),
          ) !== "applied"
        )
          return;
        mcpApi.persistLiveListing(connection, {
          tools,
          commands: prompts,
          resources,
          identityEpoch: epoch,
          grantLeg,
        });
      } catch (error) {
        logForDebugging(
          `Failed to adopt cached MCP server ${serverName} after lazy connect: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
    })();
  };
  let dial = async (serverName, config, epoch, isRunEnding, expectedRow, shouldSkip) => {
    let found = getAppState().mcp.clients.find((client) => client.name === serverName);
    if (
      isRunEnding() ||
      identityEpoch() !== epoch ||
      found?.type !== "failed" ||
      isMcpServerDisabled(serverName)
    )
      return "not_dialed";
    if (isControlReconnectInFlight(serverName)) return "not_dialed";
    if (shouldSkip?.(found)) return "not_yet";
    let blockCause = mcpDialBlockCause(serverName, config);
    if (blockCause) {
      applyReconnect(serverName, {
        client: {
          name: serverName,
          type: "failed",
          config,
          ...mcpGateError(blockCause, serverName, config),
        },
        tools: [],
        commands: [],
        attemptEpoch: epoch,
      });
      return "not_dialed";
    }
    let mcpApi = mcpClientModule();
    let result = await mcpApi
      .reconnectMcpServerImpl(serverName, config, storageV5, credentials, {
        keepConnectionInUse: true,
      })
      .catch(() => {
        return;
      });
    if (!result) return "other";
    let settled =
      result.client.type === "connected" &&
      isSameConnectedClient(await mcpApi.peekSettledConnection(serverName, config), result.client);
    let superseded =
      result.client.type === "connected" &&
      (isRunEnding() || isControlReconnectInFlight(serverName) || !settled);
    let currentRow = getAppState().mcp.clients.find((client) => client.name === serverName);
    let keptConnection =
      result.keptConnectionInUse === true && refusalStateFor(serverName, result.client) === undefined;
    let degraded =
      keptConnection && result.client.type === "connected" && result.client.toolsListError !== undefined;
    if (
      superseded ||
      degraded ||
      isRunEnding() ||
      currentRow?.type !== "failed" ||
      !mcpApi.areMcpConfigsEqual(currentRow.config, config) ||
      (expectedRow !== undefined && currentRow !== expectedRow)
    ) {
      if (
        result.client.type === "connected" &&
        shouldCommitReconnect(
          result.client,
          config,
          currentRow,
          settled && (keptConnection || !isRunEnding()),
        )
      )
        mcpApi.detachAndCloseConnection(result.client).catch(() => {});
      if (!keptConnection) return "dropped";
      return degraded || !settled ? "not_yet" : "not_dialed";
    }
    if (expectedRow !== undefined && isRetryableConnectionFailure(result.client)) return "transient";
    let applied = applyReconnect(serverName, {
      ...result,
      tools: result.client.type === "needs-auth" ? mcpAuthToolsFor(serverName, config) : result.tools,
      attemptEpoch: epoch,
    });
    if (applied === "superseded" || (expectedRow !== undefined && applied !== "applied"))
      return keptConnection ? "not_dialed" : "dropped";
    if (result.client.type === "connected")
      return result.client.toolsListError || result.client.discoveryBearerRejected ? "degraded" : "connected";
    return isRetriableOrForbidden(result.client) ? "transient" : "other";
  };
  let retryPass = async (serverName, config) => {
    using retryScope = trackTransientRetryPass([serverName]);
    let epoch = identityEpoch();
    for (let [attempt, delay] of CONNECT_RETRY_DELAYS_MS.entries()) {
      await sleep_2(delay);
      let outcome = await dial(
        serverName,
        config,
        epoch,
        isRunEnding,
        undefined,
        (row) =>
          row.proxyConnectStatus === 403 &&
          (attempt < CONNECT_RETRY_DELAYS_MS.length - 1 || !isProxyForbiddenFailure(row)),
      );
      if (outcome !== "transient" && outcome !== "not_yet") return;
    }
  };
  let redialFailedRow = async (row, shouldRetry) => {
    if (await mcpClientModule().hasUnsettledDial(row.name, row.config)) return "not_dialed";
    if (getCliOwnedState().transientRetryPasses.has(row.name)) return "not_dialed";
    let epoch = identityEpoch();
    if (getAppState().mcp.clients.find((client) => client.name === row.name) !== row) return "not_dialed";
    let outcome = await dial(
      row.name,
      row.config,
      epoch,
      () => {
        try {
          return isRunEnding() || shouldRetry();
        } catch (error) {
          logForDebugging(
            `[MCP] Could not tell whether retrying ${row.name} is still allowed, so it is stopped: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
          return true;
        }
      },
      row,
    );
    return outcome === "not_yet" ? "not_dialed" : outcome;
  };
  let onCachedDialFailed = (row, ownStrike) => {
    let { name: serverName, config } = row;
    if (!ownsCachedRow(serverName)) return;
    let entry = getAppState().mcp.clients.find((client) => client.name === serverName);
    if (!isReusable(entry) || serverCacheKey(serverName, entry.config) !== serverCacheKey(serverName, config))
      return;
    if (ownStrike && hasAuthStubTools(getAppState().mcp, serverName)) return;
    applyReconnect(serverName, {
      client: row,
      tools: [],
      commands: [],
      attemptEpoch: identityEpoch(),
    });
    if (isRetriableOrForbidden(row)) {
      let retry = retryPass(serverName, config);
      if (onRetryRejected) retry.catch((error) => onRetryRejected(serverName, error));
    }
    if (ownStrike) strikeAfterLazyDialFailure(serverName, config);
  };
  return {
    onCachedAdopt,
    onCachedDialFailed,
    redialFailedRow,
    subscribe: () => {
      let unsubscribe = CACHED_ADOPT_SIGNAL.subscribe(onCachedAdopt);
      let unsubscribeDialFailed = CACHED_DIAL_FAILED_SIGNAL.subscribe((row, ownStrike) => {
        mcpClientModule().takeSettledCachedDialFailure(row.name, row.config);
        onCachedDialFailed(row, ownStrike);
      });
      return () => {
        unsubscribe();
        unsubscribeDialFailed();
      };
    },
    catchUp: () => {
      let filtered = getAppState().mcp.clients.filter(
        (client) => client.type === "cached" && ownsCachedRow(client.name),
      );
      if (filtered.length === 0) return;
      (async () => {
        let mcpApi = mcpClientModule();
        for (let client of filtered) {
          if (isRunEnding()) return;
          let settledFailure = mcpApi.takeSettledCachedDialFailure(client.name, client.config);
          let connection = await mcpApi.peekSettledConnection(client.name, client.config);
          if (connection?.type === "connected" || connection?.type === "needs-auth") {
            CACHED_ADOPT_SIGNAL.emit(client.name, client.config);
            continue;
          }
          if (
            settledFailure &&
            !(await mcpApi.hasUnsettledDial(client.name, client.config)) &&
            !isRunEnding()
          )
            onCachedDialFailed(settledFailure.failure, settledFailure.ownStrike);
        }
      })().catch(() => {});
    },
  };
}
//@ chunk-tyg7f3ek.js:522351-522416 placement
function hasAuthStubTools(mcp, serverName) {
  return toolsOfServer(mcp, serverName).some((tool) => tool.mcpInfo?.isAuthStub);
}
//@ chunk-tyg7f3ek.js:522416-522483 placement
function toolsOfServer(mcp, serverName) {
  let mcpPrefix = getMcpPrefix(serverName);
  return mcp.tools.filter((tool) => isToolFromMcpServer(tool, serverName, mcpPrefix));
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
function isRetryableFailedRow(row) {
  return isRetryableConnectionFailure(row) && row.errorCode !== undefined;
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
function createNextTurnRedialer(registry) {
  let states = new Map();
  let lastDialAt = new Map();
  let stateFor = (row) => {
    let state = states.get(row.name);
    return state?.row === row ? state : undefined;
  };
  let turnsUsed = (state) => (state === undefined ? 0 : state.turns + state.heldTurns);
  let isRedialable = (row) =>
    isRetryableFailedRow(row) || (isProxyForbiddenFailure(row) && stateFor(row) !== undefined);
  let awaitsRedial = (row) => {
    if (row.type !== "failed") return false;
    try {
      let current = registry.isOpen()
        ? registry.rows().find((registryRow) => registryRow.name === row.name)
        : undefined;
      if (
        current === undefined ||
        !isRedialable(current) ||
        (current.config !== row.config &&
          serverCacheKey(current.name, current.config) !== serverCacheKey(row.name, row.config))
      )
        return false;
      let state = states.get(current.name);
      let tracked = state !== undefined && state.dial !== "none" ? state : stateFor(current);
      return (
        tracked?.dial === "awaited" || (turnsUsed(tracked) < maxTurnRedials() && registry.allows(current))
      );
    } catch (error) {
      logError(error);
      return false;
    }
  };
  let updateTrackedState = (state, outcome) => {
    let { name } = state.row;
    if (states.get(name) !== state) return;
    let row = registry.rows().find((row) => row.name === name);
    if (
      outcome === "transient" &&
      row !== undefined &&
      (isRetryableFailedRow(row) || isProxyForbiddenFailure(row))
    )
      state.row = row;
    else if (row !== state.row) states.delete(name);
  };
  let dial = async (row) => {
    let previous = stateFor(row);
    let turns = previous?.turns ?? 0;
    let state = {
      turns: turns + 1,
      heldTurns: 0,
      dial: "awaited",
      heldBack: undefined,
      row,
    };
    states.set(row.name, state);
    let dialPromise = Promise.resolve()
      .then(() => registry.redial(row))
      .catch((error) => {
        logForDebugging(
          `[MCP] Retrying ${row.name} at the start of a turn threw (counted as a failed attempt): ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
        return "other";
      });
    let abortController = new AbortController();
    let winner = await Promise.race([
      dialPromise,
      sleep(redialTimeoutMs(), abortController.signal, {
        unref: true,
      }).then(() => "written_off"),
    ]);
    abortController.abort();
    if (winner !== "not_dialed") lastDialAt.set(row.name, performance.now());
    if (winner === "written_off") {
      state.dial = "written_off";
      dialPromise
        .then((outcome) => {
          state.dial = "none";
          lastDialAt.set(row.name, performance.now());
          updateTrackedState(state, outcome);
        })
        .catch(logError);
      return {
        outcome: "written_off",
        first: turns === 0,
      };
    }
    state.dial = "none";
    if (winner === "not_dialed") {
      if (previous === undefined) states.delete(row.name);
      else states.set(row.name, previous);
    } else updateTrackedState(state, winner);
    return {
      outcome: winner === "transient" && states.get(row.name) !== state ? "other" : winner,
      first: turns === 0 && winner !== "not_dialed",
    };
  };
  let turnStarted = () => {
    if (!registry.isOpen()) return;
    let rows = registry.rows();
    let filtered = rows.filter(isRedialable);
    for (let [name, state] of states)
      if (
        state.dial === "none"
          ? !filtered.includes(state.row)
          : state.dial === "written_off" && !filtered.some((row) => row.name === name)
      )
        states.delete(name);
    let startTime = performance.now();
    for (let [name, at] of lastDialAt)
      if (startTime - at >= MCP_REDIAL_RECENT_WINDOW_MS) lastDialAt.delete(name);
    let turnLimit = filtered.length === 0 ? 0 : maxTurnRedials();
    if (turnLimit === 0) return;
    let filtered_2 = filtered.filter((row) => registry.allows(row));
    let filtered_3 = rows.filter(
      (row) => row.type === "pending" && row.reconnectAttempt === undefined && row.config.type !== "sdk",
    );
    let transientRetryPasses = getCliOwnedState().transientRetryPasses;
    let recentlyDialed = (name) =>
      startTime - (lastDialAt.get(name) ?? Number.NEGATIVE_INFINITY) < MCP_REDIAL_RECENT_WINDOW_MS;
    let bump = (state, field) => {
      if (turnsUsed(state) < turnLimit && !recentlyDialed(state.row.name)) {
        state[field]++;
        lastDialAt.set(state.row.name, startTime);
      }
    };
    let clearHeld = (state) => {
      state.heldBack = undefined;
      state.heldTurns = 0;
    };
    for (let state of states.values()) if (!filtered_2.includes(state.row)) clearHeld(state);
    let skippedAtLimit = 0;
    let skippedTooSoon = 0;
    let skippedBusy = 0;
    let candidates = [];
    for (let row of filtered_2) {
      let state = states.get(row.name);
      let fallbackState = stateFor(row);
      if (state !== undefined && state.dial !== "none") {
        skippedBusy++;
        if (state.dial === "written_off") bump(state, "turns");
        continue;
      }
      let heldBy = filtered_3[0] ?? (transientRetryPasses.has(row.name) ? "backoff" : undefined);
      if (heldBy !== undefined) {
        skippedBusy++;
        let state = fallbackState ?? {
          turns: 0,
          heldTurns: 0,
          dial: "none",
          heldBack: undefined,
          row,
        };
        states.set(row.name, state);
        if (
          state.heldBack === undefined ||
          (state.heldBack.by !== heldBy &&
            (state.heldBack.by === "backoff" || !filtered_3.includes(state.heldBack.by)))
        ) {
          clearHeld(state);
          state.heldBack = {
            by: heldBy,
            since: startTime,
          };
        }
        if (startTime - state.heldBack.since >= redialTimeoutMs()) bump(state, "heldTurns");
        continue;
      }
      if (fallbackState !== undefined) clearHeld(fallbackState);
      if (turnsUsed(fallbackState) >= turnLimit) skippedAtLimit++;
      else if (recentlyDialed(row.name)) skippedTooSoon++;
      else candidates.push(row);
    }
    let sliced = candidates
      .toSorted((a, b) => (stateFor(a)?.turns ?? 0) - (stateFor(b)?.turns ?? 0))
      .slice(
        0,
        Math.max(
          0,
          MAX_CONCURRENT_MCP_DIALS - count([...states.values()], (state) => state.dial === "awaited"),
        ),
      );
    if (sliced.length === 0) return;
    return Promise.all(sliced.map(dial))
      .then((results) => {
        let countOutcome = (outcome) => count(results, (result) => result.outcome === outcome);
        let dialed = sliced.length - countOutcome("not_dialed");
        if (dialed === 0) return;
        let recovered = countOutcome("connected");
        let summary = {
          turnLimit,
          candidates: filtered_2.length,
          dialed,
          firstAttempts: count(results, (result) => result.first),
          recovered,
          connectedWithoutTools: countOutcome("degraded"),
          failedAgain: countOutcome("transient"),
          notInstalled: countOutcome("dropped"),
          writtenOff: countOutcome("written_off"),
          refused: countOutcome("not_dialed"),
          overCap: candidates.length - sliced.length,
          skippedAtLimit,
          skippedBusy,
          skippedTooSoon,
          durationMs: Math.round(performance.now() - startTime),
        };
        logEvent("tengu_mcp_next_turn_redial", summary);
        logForDiagnosticsNoPII("info", "mcp_next_turn_redial", () =>
          identityMap(summary, (value, key) => featureBadNameBuilder(key)),
        );
        if (recovered === dialed) logFeatureOk("mcp_next_turn_redial");
        else logFeatureSad("mcp_next_turn_redial", recovered > 0 ? "some_not_recovered" : "none_recovered");
        registry.report?.(summary);
      })
      .catch(logError);
  };
  getCliOwnedState().awaitsNextTurnRedial = awaitsRedial;
  return {
    turnStarted,
    uninstall: () => {
      let cliOwnedState = getCliOwnedState();
      if (cliOwnedState.awaitsNextTurnRedial === awaitsRedial) cliOwnedState.awaitsNextTurnRedial = null;
    },
  };
}
//@ chunk-tyg7f3ek.js:526560-526932 placement
class PendingMcpToolsByServer {
  byServer = new Map();
  get size() {
    let count = 0;
    for (let refs of this.byServer.values()) count += liveWeakRefs(refs).length;
    return count;
  }
  add(clients) {
    for (let client of clients) {
      let set = this.byServer.get(client.name);
      if (set === undefined) {
        set = new Set();
        this.byServer.set(client.name, set);
      }
      propagateAbort(set, identityId2(client.client));
    }
  }
  async closeFor(serverName) {
    let refs = this.byServer.get(serverName);
    if (refs === undefined) return;
    this.byServer.delete(serverName);
    await Promise.all(liveWeakRefs(refs).map((ref) => ref.close()));
  }
}
export {
  PendingMcpToolsByServer,
  createMcpRetryOrchestrator,
  createNextTurnRedialer,
  pickServerResultsAfterRetry,
};
