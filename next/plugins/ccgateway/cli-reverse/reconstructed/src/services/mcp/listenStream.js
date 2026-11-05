/**
 * services/mcp/listenStream.ts
 *
 * 2.1.316 新增：MCP list_changed 监听流的重开与重新拉取。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sywnjtqb.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
import { REOPEN_REFETCH } from "./mcpCallConstants.js";
import { logMCPDebug } from "../../utils/log.js";
import { describeConnectError } from "./auth.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logEvent } from "../analytics/index.js";
import { toolNameForTelemetry } from "../analytics/metadata.js";
import { lit, fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { sleep } from "../../utils/sleep.js";
import { getConnectionTimeoutMs } from "./client.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-sywnjtqb.js:49917-50103 placement
/**
 * 停摆配置的 schema（windowMax、parkDelayMinutes）。
 */
var LISTEN_REOPEN_DELAYS_MS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var REOPEN_BACKOFF_RESET_MS;
var LISTEN_RETRY_SLEEP_MS;
var REOPEN_WINDOW_MS;
var DEFAULT_WINDOW_MAX;
var DEFAULT_PARK_DELAY_MS;
var MIN_PARK_SLEEP_MS;
var parkConfigSchema;
deferInit("chunk-sywnjtqb.js:49917", () => {
  LISTEN_REOPEN_DELAYS_MS = [1000, 2000, 4000];
  REOPEN_BACKOFF_RESET_MS = 1e4;
  LISTEN_RETRY_SLEEP_MS = 5000;
  REOPEN_WINDOW_MS = 3600000;
  DEFAULT_WINDOW_MAX = 5;
  DEFAULT_PARK_DELAY_MS = 21600000;
  MIN_PARK_SLEEP_MS = 5000;
  parkConfigSchema = DoctorLazy(() =>
    objectSchema({
      windowMax: numberSchema().int().min(1).max(100).optional(),
      parkDelayMinutes: numberSchema().min(1).max(1440).optional(),
    }),
  );
});
//@ chunk-sywnjtqb.js:50103-50193 placement
/**
 * 记录某服务器某类列表变化的重新拉取处理器。
 */
function recordListChangedRefetcher(client, kind, refetch) {
  let listChangedRefetchHandlers = getCliOwnedState().listChangedRefetchHandlers;
  let handlers = listChangedRefetchHandlers.get(client) ?? {};
  handlers[kind] = refetch;
  listChangedRefetchHandlers.set(client, handlers);
}
//@ chunk-sywnjtqb.js:50193-50538 placement
/**
 * 监听流重新打开后，按服务器声明补拉工具、提示词与资源列表。
 */
function refetchAfterReopen(client, serverName, config, filter) {
  let handlers = getCliOwnedState().listChangedRefetchHandlers.get(client);
  if (handlers === undefined) return;
  let refetchKinds = [
    ["toolsListChanged", "tools"],
    ["promptsListChanged", "prompts"],
    ["resourcesListChanged", "resources"],
  ];
  for (let [filterKey, handlerKey] of refetchKinds) {
    let refetch = filter[filterKey] ? handlers[handlerKey] : undefined;
    if (refetch === undefined) continue;
    (async () => refetch(REOPEN_REFETCH))().catch((error) => {
      logMCPDebug(serverName, `post-reopen list refetch failed: ${describeConnectError(error, config)}`);
    });
  }
}
//@ chunk-sywnjtqb.js:50538-50936 placement
function ensureListenSubscription(client, serverName, config, autoSubscription, discoverSource) {
  let subscription = autoSubscription ?? client.autoOpenedSubscription;
  if (subscription === undefined && client.getProtocolEra?.() !== "modern") return;
  if (subscription === undefined)
    logMCPDebug(
      serverName,
      "no auto-opened subscriptions/listen on a modern connection; running the listen open through the reopen machinery (no-op if the server advertises no listChanged capability)",
    );
  maintainListenSubscription(client, serverName, config, subscription, discoverSource).catch((error) => {
    logMCPDebug(
      serverName,
      `subscriptions/listen re-open watcher stopped: ${describeConnectError(error, config)}`,
    );
  });
}
//@ chunk-sywnjtqb.js:50936-52460 placement
/**
 * 维护 subscriptions/listen 监听流：流被远端关闭时按退避重开并在重开后补拉列表；短时间内重开过多则按 GrowthBook 配置暂停一段时间；优雅关闭时等待部署宽限期后再试，重试用尽则放弃。
 */
async function maintainListenSubscription(client, serverName, config, subscription, discoverSource) {
  let current = subscription;
  let delayIndex = 0;
  let recentReopens = [];
  let trigger = subscription === undefined ? "connect" : "remote";
  for (;;) {
    if (current !== undefined) {
      let now = Date.now();
      let closed = await current.closed;
      if (closed === "local") return;
      if (client.transport === undefined) return;
      if (Date.now() - now >= REOPEN_BACKOFF_RESET_MS) delayIndex = 0;
      trigger = closed;
      recentReopens = recentReopens.filter((recentReopen) => Date.now() - recentReopen < REOPEN_WINDOW_MS);
      let tuningParse = parkConfigSchema().safeParse(
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_listen_reopen_park_tuning", null),
      );
      let tuning = tuningParse.success ? tuningParse.data : {};
      let windowMax = tuning.windowMax ?? DEFAULT_WINDOW_MAX;
      let parkDelayMs =
        tuning.parkDelayMinutes !== undefined
          ? Math.round(tuning.parkDelayMinutes * 60000)
          : DEFAULT_PARK_DELAY_MS;
      if (
        recentReopens.length >= windowMax &&
        delayIndex < LISTEN_REOPEN_DELAYS_MS.length &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_listen_reopen_park", true)
      ) {
        logMCPDebug(
          serverName,
          `subscriptions/listen reopened ${recentReopens.length} times in the trailing window (the server keeps killing held streams); parking re-listen`,
        );
        logEvent("tengu_mcp_listen_reopen", {
          mcpServerKeyHash: toolNameForTelemetry(serverName),
          outcome: lit("parked"),
          attempts: recentReopens.length,
          trigger: fromEnum(trigger),
          discoverSource: fromEnumOpt(discoverSource),
        });
        let parkUntil = Date.now() + Math.round(parkDelayMs * (0.8 + Math.random() * 0.4));
        while (Date.now() < parkUntil) {
          await sleep(Math.min(MIN_PARK_SLEEP_MS, parkUntil - Date.now()));
          if (client.transport === undefined) return;
          if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_listen_reopen_park", true)) break;
        }
        delayIndex = 0;
      } else if (closed === "graceful") {
        if (delayIndex >= LISTEN_REOPEN_DELAYS_MS.length)
          logMCPDebug(serverName, "subscriptions/listen keeps closing gracefully; giving up on re-listen");
        else {
          logMCPDebug(
            serverName,
            "subscriptions/listen closed gracefully (server shutdown); re-listening after the redeploy grace window",
          );
          await sleep(LISTEN_RETRY_SLEEP_MS);
          if (client.transport === undefined) return;
        }
      } else
        logMCPDebug(
          serverName,
          delayIndex >= LISTEN_REOPEN_DELAYS_MS.length
            ? "subscriptions/listen stream keeps dropping; giving up on re-listen"
            : "subscriptions/listen stream dropped (remote); attempting to re-listen",
        );
    }
    let reopenResult = await reopenListenSubscription(
      client,
      serverName,
      config,
      delayIndex,
      trigger,
      discoverSource,
    );
    if (reopenResult === undefined) return;
    recentReopens.push(Date.now());
    refetchAfterReopen(client, serverName, config, reopenResult.filter);
    current = reopenResult.subscription;
    delayIndex = reopenResult.delayIndex + 1;
  }
}
//@ chunk-sywnjtqb.js:52460-52709 placement
function listChangedCapabilities(client) {
  let serverCapabilities = client.getServerCapabilities();
  let flags = {
    ...(serverCapabilities?.tools?.listChanged && {
      toolsListChanged: true,
    }),
    ...(serverCapabilities?.prompts?.listChanged && {
      promptsListChanged: true,
    }),
    ...(serverCapabilities?.resources?.listChanged && {
      resourcesListChanged: true,
    }),
  };
  return Object.keys(flags).length === 0 ? undefined : flags;
}
//@ chunk-sywnjtqb.js:52709-53607 placement
async function reopenListenSubscription(client, serverName, config, delayIndex, trigger, discoverSource) {
  let capabilities = listChangedCapabilities(client);
  if (capabilities === undefined) return;
  for (let attempt = delayIndex; attempt < LISTEN_REOPEN_DELAYS_MS.length; attempt++) {
    if (client.transport === undefined) return;
    await sleep(LISTEN_REOPEN_DELAYS_MS[attempt] ?? 0);
    if (client.transport === undefined) return;
    try {
      let subscription = await client.listen(capabilities, {
        timeout: getConnectionTimeoutMs(),
      });
      logMCPDebug(
        serverName,
        trigger === "connect"
          ? `Opened subscriptions/listen stream from zero (connect-time listen never established; attempt ${attempt + 1})`
          : `Re-opened subscriptions/listen stream (attempt ${attempt + 1})`,
      );
      logEvent("tengu_mcp_listen_reopen", {
        mcpServerKeyHash: toolNameForTelemetry(serverName),
        outcome: trigger === "connect" ? lit("opened_from_zero") : lit("reopened"),
        attempts: attempt + 1,
        trigger: fromEnum(trigger),
        discoverSource: fromEnumOpt(discoverSource),
      });
      return {
        subscription,
        delayIndex: attempt,
        filter: capabilities,
      };
    } catch (error) {
      logMCPDebug(
        serverName,
        `subscriptions/listen re-open attempt ${attempt + 1} failed: ${describeConnectError(error, config)}`,
      );
    }
  }
  if (client.transport === undefined) return;
  let max = Math.max(0, LISTEN_REOPEN_DELAYS_MS.length - delayIndex);
  logEvent("tengu_mcp_listen_reopen", {
    mcpServerKeyHash: toolNameForTelemetry(serverName),
    outcome: max === 0 ? lit("budget_exhausted") : lit("gave_up"),
    attempts: max,
    trigger: fromEnum(trigger),
    discoverSource: fromEnumOpt(discoverSource),
  });
  return;
}
export {
  listChangedCapabilities,
  ensureListenSubscription,
  recordListChangedRefetcher,
  LISTEN_REOPEN_DELAYS_MS,
};
