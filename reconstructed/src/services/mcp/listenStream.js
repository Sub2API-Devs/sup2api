/**
 * services/mcp/listenStream.ts
 *
 * 2.1.316 新增：MCP list_changed 监听流的重开与重新拉取。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8t8n4kdh.js (7)
 * attribution: placement 7
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { ht } from "./cliOwnedClients.js";
import { REOPEN_REFETCH } from "./mcpCallConstants.js";
import { logMCPDebug } from "../../utils/log.js";
import { describeConnectError } from "./auth.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logEvent } from "../analytics/index.js";
import { toolNameForTelemetry } from "../analytics/metadata.js";
import { lit, fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { sleep } from "../../utils/sleep.js";
import { getConnectionTimeoutMs } from "./client.js";

//@ chunk-8t8n4kdh.js:49905-50091 placement
var LISTEN_REOPEN_DELAYS_MS = [1000, 2000, 4000],
  dc = 1e4,
  uc = 5000,
  lc = 3600000,
  pc = 5,
  fc = 21600000,
  mc = 5000,
  hc = DoctorLazy(() =>
    u({ windowMax: E().int().min(1).max(100).optional(), parkDelayMinutes: E().min(1).max(1440).optional() }),
  );
//@ chunk-8t8n4kdh.js:50091-50181 placement
function _r(e, n, r) {
  let listChangedRefetchHandlers = ht().listChangedRefetchHandlers,
    h = listChangedRefetchHandlers.get(e) ?? {};
  ((h[n] = r), listChangedRefetchHandlers.set(e, h));
}
/**
 * 监听流重新打开后，按服务器声明补拉工具、提示词与资源列表。
 */
//@ chunk-8t8n4kdh.js:50181-50526 placement
function refetchAfterReopen(e, n, r, s) {
  let h = ht().listChangedRefetchHandlers.get(e);
  if (h === void 0) return;
  let y = [
    ["toolsListChanged", "tools"],
    ["promptsListChanged", "prompts"],
    ["resourcesListChanged", "resources"],
  ];
  for (let [S, w] of y) {
    let P = s[S] ? h[w] : void 0;
    if (P === void 0) continue;
    (async () => P(REOPEN_REFETCH))().catch((M) => {
      logMCPDebug(n, `post-reopen list refetch failed: ${describeConnectError(M, r)}`);
    });
  }
}
//@ chunk-8t8n4kdh.js:50526-50924 placement
function ensureListenSubscription(e, n, r, s, h) {
  let y = s ?? e.autoOpenedSubscription;
  if (y === void 0 && e.getProtocolEra?.() !== "modern") return;
  if (y === void 0)
    logMCPDebug(
      n,
      "no auto-opened subscriptions/listen on a modern connection; running the listen open through the reopen machinery (no-op if the server advertises no listChanged capability)",
    );
  maintainListenSubscription(e, n, r, y, h).catch((S) => {
    logMCPDebug(n, `subscriptions/listen re-open watcher stopped: ${describeConnectError(S, r)}`);
  });
}
/**
 * 维护 subscriptions/listen 监听流：流被远端关闭时按退避重开并在重开后补拉列表；短时间内重开过多则按 GrowthBook 配置暂停一段时间；优雅关闭时等待部署宽限期后再试，重试用尽则放弃。
 */
//@ chunk-8t8n4kdh.js:50924-52450 placement
async function maintainListenSubscription(client, serverName, config, subscription, discoverSource) {
  let current = subscription,
    delayIndex = 0,
    recentReopens = [],
    trigger = subscription === void 0 ? "connect" : "remote";
  for (;;) {
    if (current !== void 0) {
      let now = Date.now(),
        closed = await current.closed;
      if (closed === "local") return;
      if (client.transport === void 0) return;
      if (Date.now() - now >= dc) delayIndex = 0;
      ((trigger = closed), (recentReopens = recentReopens.filter((Ie) => Date.now() - Ie < lc)));
      let safeParse = hc().safeParse(
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_listen_reopen_park_tuning", null),
        ),
        Q = safeParse.success ? safeParse.data : {},
        ie = Q.windowMax ?? pc,
        ge = Q.parkDelayMinutes !== void 0 ? Math.round(Q.parkDelayMinutes * 60000) : fc;
      if (
        recentReopens.length >= ie &&
        delayIndex < LISTEN_REOPEN_DELAYS_MS.length &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_listen_reopen_park", !0)
      ) {
        (logMCPDebug(
          serverName,
          `subscriptions/listen reopened ${recentReopens.length} times in the trailing window (the server keeps killing held streams); parking re-listen`,
        ),
          logEvent("tengu_mcp_listen_reopen", {
            mcpServerKeyHash: toolNameForTelemetry(serverName),
            outcome: lit("parked"),
            attempts: recentReopens.length,
            trigger: fromEnum(trigger),
            discoverSource: fromEnumOpt(discoverSource),
          }));
        let Ie = Date.now() + Math.round(ge * (0.8 + Math.random() * 0.4));
        while (Date.now() < Ie) {
          if ((await sleep(Math.min(mc, Ie - Date.now())), client.transport === void 0)) return;
          if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_listen_reopen_park", !0)) break;
        }
        delayIndex = 0;
      } else if (closed === "graceful") {
        if (delayIndex >= LISTEN_REOPEN_DELAYS_MS.length)
          logMCPDebug(serverName, "subscriptions/listen keeps closing gracefully; giving up on re-listen");
        else if (
          (logMCPDebug(
            serverName,
            "subscriptions/listen closed gracefully (server shutdown); re-listening after the redeploy grace window",
          ),
          await sleep(uc),
          client.transport === void 0)
        )
          return;
      } else
        logMCPDebug(
          serverName,
          delayIndex >= LISTEN_REOPEN_DELAYS_MS.length
            ? "subscriptions/listen stream keeps dropping; giving up on re-listen"
            : "subscriptions/listen stream dropped (remote); attempting to re-listen",
        );
    }
    let M = await reopenListenSubscription(client, serverName, config, delayIndex, trigger, discoverSource);
    if (M === void 0) return;
    (recentReopens.push(Date.now()),
      refetchAfterReopen(client, serverName, config, M.filter),
      (current = M.subscription),
      (delayIndex = M.delayIndex + 1));
  }
}
//@ chunk-8t8n4kdh.js:52450-52699 placement
function listChangedCapabilities(e) {
  let serverCapabilities = e.getServerCapabilities(),
    r = {
      ...(serverCapabilities?.tools?.listChanged && { toolsListChanged: !0 }),
      ...(serverCapabilities?.prompts?.listChanged && { promptsListChanged: !0 }),
      ...(serverCapabilities?.resources?.listChanged && { resourcesListChanged: !0 }),
    };
  return Object.keys(r).length === 0 ? void 0 : r;
}
//@ chunk-8t8n4kdh.js:52699-53597 placement
async function reopenListenSubscription(e, n, r, s, h, y) {
  let S = listChangedCapabilities(e);
  if (S === void 0) return;
  for (let P = s; P < LISTEN_REOPEN_DELAYS_MS.length; P++) {
    if (e.transport === void 0) return;
    if ((await sleep(LISTEN_REOPEN_DELAYS_MS[P] ?? 0), e.transport === void 0)) return;
    try {
      let listen = await e.listen(S, { timeout: getConnectionTimeoutMs() });
      return (
        logMCPDebug(
          n,
          h === "connect"
            ? `Opened subscriptions/listen stream from zero (connect-time listen never established; attempt ${P + 1})`
            : `Re-opened subscriptions/listen stream (attempt ${P + 1})`,
        ),
        logEvent("tengu_mcp_listen_reopen", {
          mcpServerKeyHash: toolNameForTelemetry(n),
          outcome: h === "connect" ? lit("opened_from_zero") : lit("reopened"),
          attempts: P + 1,
          trigger: fromEnum(h),
          discoverSource: fromEnumOpt(y),
        }),
        { subscription: listen, delayIndex: P, filter: S }
      );
    } catch (error) {
      logMCPDebug(
        n,
        `subscriptions/listen re-open attempt ${P + 1} failed: ${describeConnectError(error, r)}`,
      );
    }
  }
  if (e.transport === void 0) return;
  let max = Math.max(0, LISTEN_REOPEN_DELAYS_MS.length - s);
  logEvent("tengu_mcp_listen_reopen", {
    mcpServerKeyHash: toolNameForTelemetry(n),
    outcome: max === 0 ? lit("budget_exhausted") : lit("gave_up"),
    attempts: max,
    trigger: fromEnum(h),
    discoverSource: fromEnumOpt(y),
  });
  return;
}

export { listChangedCapabilities, ensureListenSubscription, _r };
