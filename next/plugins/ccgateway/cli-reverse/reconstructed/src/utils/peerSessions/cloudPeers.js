/**
 * utils/peerSessions/cloudPeers.ts
 *
 * 2.1.316 新增。云端同伴会话查找。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rwnj2eyf.js (27)
 * attribution: placement 27
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import {
  bridgeSessionIds,
  hasBridgeSessionId,
  hasEnvironmentKindOtherThanBridge,
} from "../sessionAddresses.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { withDeadline } from "../sleep.js";
import { env } from "../env.js";
import { describeAxiosError } from "../../bridge/debugUtils.js";
import { parseCrossSessionInboundCapability } from "../sessionState.js";
import { stripAnsiAndControls } from "../printableName.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-rwnj2eyf.js:1874-1887 placement
var BRIDGE_LISTING_TTL_MS = 300000;
//@ chunk-rwnj2eyf.js:1887-2108 placement
class BridgeListingSlot {
  listed = undefined;
  inFlight = undefined;
  record(listed, identityKey, truncated) {
    this.listed = {
      at: Date.now(),
      listed,
      identityKey,
      truncated,
    };
  }
  forget() {
    this.listed = undefined;
  }
  begin(inFlight) {
    this.inFlight = inFlight;
  }
  settle(record) {
    if (this.inFlight === record) this.inFlight = undefined;
  }
}
//@ chunk-rwnj2eyf.js:2108-2132 placement
var bridgeListingSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rwnj2eyf.js:2108", () => {
  bridgeListingSlot = new SessionRootSlot(() => new BridgeListingSlot());
});
//@ chunk-rwnj2eyf.js:2132-2241 placement
/**
 * 预热同伴身份归属。
 */
async function primePeerIdentity(
  options = {
    refresh: true,
  },
) {
  {
    let { primePeerIdentityOwner } = require("../../bridge/replBridgeHandle.js");
    await primePeerIdentityOwner(options);
  }
}
//@ chunk-rwnj2eyf.js:2241-2346 placement
function currentBridgeIdentityKey() {
  let { getPeerBridgeIdentity } = require("../../bridge/replBridgeHandle.js");
  let peerBridgeIdentity = getPeerBridgeIdentity();
  return peerBridgeIdentity?.live ? peerBridgeIdentity.key : null;
}
//@ chunk-rwnj2eyf.js:2346-3184 placement
async function fetchBridgePopulation(session, options) {
  {
    let identityKey = currentBridgeIdentityKey();
    if (!identityKey)
      return {
        rows: [],
        failed: false,
        identityKey: null,
      };
    let slot = bridgeListingSlot.of(session);
    let inFlight = slot.inFlight;
    if (inFlight !== undefined && inFlight.identityKey === identityKey) return inFlight.promise;
    let { listBridgePeerSessions } = require("../../bridge/classifyBridgeSendError.lazy.js");
    let holder = {
      record: undefined,
    };
    let now = Date.now();
    let promise = (async () => {
      try {
        let fetchState = {
          failed: false,
          truncated: false,
        };
        let rows;
        try {
          rows = await listBridgePeerSessions(fetchState, options);
        } catch (error) {
          logForDebugging(
            `[bridge:population] fetch threw: ${errorMessage(error)} \u2014 treated as failed`,
            {
              level: "warn",
            },
          );
          return {
            rows: [],
            failed: true,
            identityKey,
          };
        }
        logForDebugging(
          `[bridge:population] fetched ${rows.length} rows in ${Date.now() - now}ms${fetchState.failed ? " (FAILED \u2014 not recordable)" : ""}${fetchState.truncated ? " (truncated at page budget)" : ""}`,
        );
        return {
          rows,
          failed: fetchState.failed,
          ...(fetchState.truncated && {
            truncated: true,
          }),
          identityKey,
        };
      } finally {
        slot.settle(holder.record);
      }
    })();
    holder.record = {
      identityKey,
      promise,
    };
    slot.begin(holder.record);
    return promise;
  }
  return {
    rows: [],
    failed: false,
    identityKey: null,
  };
}
//@ chunk-rwnj2eyf.js:3184-3255 placement
/**
 * isCurrentBridgeIdentity：桥接列表记录是否属于当前身份。
 */
function isCurrentBridgeIdentity(result) {
  {
    let identityKey = currentBridgeIdentityKey();
    return identityKey !== null && result.identityKey === identityKey;
  }
  return false;
}
//@ chunk-rwnj2eyf.js:3255-3730 placement
/**
 * 记录桥接列表结果（身份已变则忽略，失败时清空已记录集合）。
 */
function recordBridgeListing(session, fetchResult, rows) {
  {
    let identityKey = currentBridgeIdentityKey();
    if (!identityKey) return;
    if (fetchResult.identityKey !== identityKey) {
      logForDebugging(
        "[bridge:population] walk ran under a previous identity \u2014 ignoring its outcome for the current one",
      );
      return;
    }
    let slot = bridgeListingSlot.of(session);
    if (fetchResult.failed) {
      let listed = slot.listed;
      if (listed !== undefined && listed.identityKey === identityKey) {
        slot.forget();
        logForDebugging(
          "[bridge:population] failed walk \u2014 cleared the printed set (going cold, never sticky)",
        );
      }
      return;
    }
    slot.record(rows, identityKey, fetchResult.truncated === true);
    logForDebugging(`[bridge:population] recorded ${rows.length} bridge rows (cloud-deduped)`);
  }
}
//@ chunk-rwnj2eyf.js:3730-3950 placement
/**
 * 不可记录的列表取代时清除已记录集合。
 */
function forgetBridgeListing(session, fetchResult) {
  {
    let identityKey = currentBridgeIdentityKey();
    if (!identityKey || fetchResult.identityKey !== identityKey) return;
    let slot = bridgeListingSlot.of(session);
    let listed = slot.listed;
    if (listed !== undefined && listed.identityKey === identityKey) {
      slot.forget();
      logForDebugging("[bridge:population] forgot the recorded set (an unrecordable listing superseded it)");
    }
  }
}
//@ chunk-rwnj2eyf.js:3950-3986 placement
/**
 * bridgeListingRows：未过期且身份一致的桥接会话行。
 */
function bridgeListingRows(session) {
  return warmBridgeListing(session)?.rows;
}
//@ chunk-rwnj2eyf.js:3986-4242 placement
/**
 * 未过期且身份一致的已记录桥接列表。
 */
function warmBridgeListing(session) {
  {
    let identityKey = currentBridgeIdentityKey();
    let listed = bridgeListingSlot.of(session).listed;
    if (!identityKey || listed === undefined || listed.identityKey !== identityKey) return;
    let age = Date.now() - listed.at;
    if (age >= 0 && age < BRIDGE_LISTING_TTL_MS) {
      logForDebugging(`[bridge:population] warm recorded set: ${listed.listed.length} rows (age ${age}ms)`);
      return {
        rows: listed.listed,
        truncated: listed.truncated,
      };
    }
  }
  return;
}
//@ chunk-rwnj2eyf.js:4242-4399 placement
/**
 * 排除云端已列出或本机已知的会话。
 */
function excludeKnownPeerSessions(candidates, bridge, known) {
  let bridgeIds = bridgeSessionIds(bridge);
  let knownIds = new Set(
    known
      .filter((knownSession) => !hasBridgeSessionId(bridge, knownSession.id))
      .map((knownSession) => sessionIdBody(knownSession.id)),
  );
  return candidates.filter((candidate) => {
    let candidateId = sessionIdBody(candidate.id);
    return !bridgeIds.has(candidateId) && !knownIds.has(candidateId);
  });
}
//@ chunk-rwnj2eyf.js:4399-4436 placement
/**
 * livePeerSessionsExcludingKnown：排除已知会话后的存活会话列表。
 */
function livePeerSessionsExcludingKnown(rows, sessions) {
  return excludeKnownPeerSessions(rows, [], sessions);
}
//@ chunk-rwnj2eyf.js:4436-4493 placement
/**
 * isTransientListingFailure：判断列表失败是否可重试（超时/取回失败）。
 */
function isTransientListingFailure(unavailable) {
  return unavailable === "timeout" || unavailable === "fetch_failed";
}
//@ chunk-rwnj2eyf.js:4493-4512 placement
var CLOUD_SESSIONS_MEMO_TTL_MS = 30000;
var CLOUD_SESSION_LIST_DEADLINE_MS = 5000;
//@ chunk-rwnj2eyf.js:4512-4865 placement
/**
 * 云端会话列表缓存（按凭证，含进行中请求）。
 */
class CloudSessionsMemo {
  memo = undefined;
  inFlight = undefined;
  record(sessions, truncated, credentialKey) {
    if (credentialKey !== currentWalkCredentialKey()) return;
    this.memo = {
      at: Date.now(),
      sessions,
      truncated,
      credential: credentialKey,
    };
  }
  begin(promise, credential) {
    this.inFlight = {
      promise,
      credential,
    };
  }
  settle(promise) {
    if (this.inFlight?.promise === promise) this.inFlight = undefined;
  }
  warm(credentialKey) {
    let memo = this.memo;
    if (memo === undefined || memo.credential !== credentialKey) return;
    let age = Date.now() - memo.at;
    return age >= 0 && age < CLOUD_SESSIONS_MEMO_TTL_MS ? memo : undefined;
  }
}
//@ chunk-rwnj2eyf.js:4865-4945 placement
function currentWalkCredentialKey() {
  let { walkCredentialKey } = require("../../bridge/replBridgeHandle.js");
  return walkCredentialKey();
}
//@ chunk-rwnj2eyf.js:4945-4969 placement
var cloudSessionsMemoSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rwnj2eyf.js:4945", () => {
  cloudSessionsMemoSlot = new SessionRootSlot(() => new CloudSessionsMemo());
});
//@ chunk-rwnj2eyf.js:4969-5759 placement
async function searchCloudPeers(session, credentials) {
  {
    let { hasCloudPeerAccess } = require("../../bridge/hasCloudPeerAccess.lazy.js");
    if (!hasCloudPeerAccess())
      return {
        sessions: [],
        unavailable: "gate_off",
      };
    let { walkCcrSessionList } = require("../../services/cloudSessions/ccrSessionList.js");
    let memo = cloudSessionsMemoSlot.of(session);
    let credentialKey = currentWalkCredentialKey();
    let warm = memo.warm(credentialKey);
    if (warm !== undefined)
      return {
        sessions: warm.sessions,
        unavailable: undefined,
        ...(warm.truncated && {
          truncated: true,
        }),
      };
    let inFlight = memo.inFlight;
    let listPromise =
      inFlight !== undefined && inFlight.credential === credentialKey
        ? inFlight.promise
        : walkCcrSessionList_2(memo, walkCcrSessionList, credentialKey, credentials);
    let result = await withDeadline(listPromise, CLOUD_SESSION_LIST_DEADLINE_MS);
    if (result === undefined) {
      logForDebugging(
        `[agents:cloud] session list not ready within ${CLOUD_SESSION_LIST_DEADLINE_MS}ms \u2014 not searched this call, disclosing`,
        {
          level: "warn",
        },
      );
      return {
        sessions: [],
        unavailable: "timeout",
      };
    }
    if (credentialKey !== currentWalkCredentialKey()) {
      logForDebugging(
        "[agents:cloud] session list walk ran under a superseded credential \u2014 not served, disclosing",
        {
          level: "warn",
        },
      );
      return {
        sessions: [],
        unavailable: "fetch_failed",
      };
    }
    return result;
  }
  return {
    sessions: [],
    unavailable: undefined,
  };
}
//@ chunk-rwnj2eyf.js:5759-7071 placement
function walkCcrSessionList_2(session, walkCcrSessionList, credentialKey, credentials) {
  let isRemote = env.CLAUDE_CODE_REMOTE === true;
  let ownSessionBody = isRemote ? sessionIdBody(env.CLAUDE_CODE_REMOTE_SESSION_ID ?? "") : "";
  if (ownSessionBody === "") {
    let { getPeerBridgeIdentity } = require("../../bridge/replBridgeHandle.js");
    let bridgeSessionId = getPeerBridgeIdentity()?.bridgeSessionId;
    ownSessionBody = typeof bridgeSessionId === "string" ? sessionIdBody(bridgeSessionId) : "";
  }
  let promise = (async () => {
    let sessions;
    let walkState = {
      truncated: false,
    };
    try {
      sessions = await walkCcrSessionList({
        status: walkState,
        throwOnError: true,
        exhaustive: true,
        includeBridgeKind: isRemote,
        credentials,
      });
    } catch (error) {
      logForDebugging(
        `[agents:cloud] session list threw: ${error instanceof TypeError ? "malformed session-list response \u2014 " : ""}${describeAxiosError(error)}`,
        {
          level: "error",
        },
      );
      return {
        sessions: [],
        unavailable: "fetch_failed",
      };
    }
    let truncated = false;
    if (isRemote) {
      let { isRemoteControlPeerUnreachableFromHere } = require("../../bridge/trustedDevice.js");
      truncated = isRemoteControlPeerUnreachableFromHere();
    }
    let mapped = (
      ownSessionBody === ""
        ? sessions
        : sessions.filter((session) => sessionIdBody(session.id) !== ownSessionBody)
    ).map((session) => {
      let timestamp = Date.parse(session.last_event_at ?? session.created_at ?? "");
      return {
        id: session.id,
        title: session.title ?? null,
        lastActive: Number.isNaN(timestamp) ? undefined : timestamp,
        workerStatus:
          session.worker_status === "running" ||
          session.worker_status === "idle" ||
          session.worker_status === "requires_action"
            ? session.worker_status
            : undefined,
        remoteControl: session.environment_kind === "bridge",
        unreachableFromHere: truncated && session.environment_kind === "bridge",
        ...parseCrossSessionInboundCapability(session.external_metadata),
        ...(session.environment_kind === "bridge" &&
          session.connection_status === "disconnected" && {
            offline: true,
          }),
      };
    });
    session.record(mapped, walkState.truncated, credentialKey);
    return {
      sessions: mapped,
      unavailable: undefined,
      ...(walkState.truncated && {
        truncated: true,
      }),
    };
  })();
  session.begin(promise, credentialKey);
  promise.finally(() => session.settle(promise));
  return promise;
}
//@ chunk-rwnj2eyf.js:7071-7202 placement
/**
 * 未过期的云端会话列表（需云端同伴权限）。
 */
function warmCloudSessions(session) {
  {
    let { hasCloudPeerAccess } = require("../../bridge/hasCloudPeerAccess.lazy.js");
    if (!hasCloudPeerAccess()) return;
    return cloudSessionsMemoSlot.of(session).warm(currentWalkCredentialKey())?.sessions;
  }
  return;
}
//@ chunk-rwnj2eyf.js:7202-7354 placement
/**
 * 高安全会话不可达与对方不收消息的拒绝原因。
 */
var ELEVATED_UNREACHABLE_REASON = "target is an elevated-security session unreachable from a cloud session";
var RECIPIENT_CANNOT_RECEIVE_REASON = "target session reports it cannot receive cross-session messages";
//@ chunk-rwnj2eyf.js:7354-7593 placement
/**
 * 发送被拒的类别（handler_rewrite/bridge_auth/recipient_gate_off/permission_denied）。
 */
function sendDenialKind(decision) {
  if (decision.reason !== "denied") return "handler_rewrite";
  if (decision.decisionReason?.type === "other") {
    if (decision.decisionReason.reason === ELEVATED_UNREACHABLE_REASON) return "bridge_auth";
    if (decision.decisionReason.reason === RECIPIENT_CANNOT_RECEIVE_REASON) return "recipient_gate_off";
  }
  return "permission_denied";
}
//@ chunk-rwnj2eyf.js:7593-8025 placement
/**
 * 目标是云端不可达的高安全会话时生成拒绝文案。
 */
function unreachableElevatedRefusal(session, sessionId, displayName, describeSendTool) {
  try {
    let found = warmCloudSessions(session)?.find(
      (cloudSession) => sessionIdBody(cloudSession.id) === sessionIdBody(sessionId),
    );
    if (!found?.unreachableFromHere) return;
    let { formatUnreachableElevatedRefusal } = require("../../bridge/trustedDevice.js");
    let sendTool;
    try {
      sendTool = found.acceptsPeerMessages === false ? undefined : describeSendTool?.();
    } catch {
      sendTool = undefined;
    }
    return formatUnreachableElevatedRefusal(
      displayName,
      sendTool === undefined
        ? undefined
        : {
            sendTool,
            sessionId: found.id,
          },
    );
  } catch (error) {
    logForDebugging(
      `[agents:cloud] warm unreachable lookup failed (${stripAnsiAndControls(errorMessage(error))}) \u2014 treating as not known unreachable`,
      {
        level: "warn",
      },
    );
    return;
  }
}
//@ chunk-rwnj2eyf.js:8025-8094 placement
/**
 * CANNOT_RECEIVE_REASON：目标会话不接收跨会话消息时的拒绝原因文案。
 */
var CANNOT_RECEIVE_REASON = "can't receive cross-session messages (off in that session)";
//@ chunk-rwnj2eyf.js:8094-8759 placement
/**
 * 目标会话设置为不接收跨会话消息时生成拒绝文案。
 */
function cannotReceiveRefusal(session, sessionId, displayName) {
  try {
    let sessionBody = sessionIdBody(sessionId);
    if (!(
      warmCloudSessions(session)?.some(
        (cloudSession) =>
          sessionIdBody(cloudSession.id) === sessionBody && cloudSession.acceptsPeerMessages === false,
      ) === true ||
      bridgeListingRows(session)?.some(
        (bridgeRow) => sessionIdBody(bridgeRow.id) === sessionBody && bridgeRow.acceptsPeerMessages === false,
      ) === true
    ))
      return;
    return `Not sent: '${displayName}' ${CANNOT_RECEIVE_REASON} \u2014 its Claude would never see the message. That session is set not to accept cross-session messages (the feature is off on its platform, or a setting or policy there refuses them); reach that machine another way, or ask its user to enable it (listings refresh within a few minutes \u2014 re-run ListAgents after they do).`;
  } catch (error) {
    logForDebugging(
      `[agents:cloud] warm cannot-receive lookup failed (${stripAnsiAndControls(errorMessage(error))}) \u2014 treating as unknown`,
      {
        level: "warn",
      },
    );
    return;
  }
}
//@ chunk-rwnj2eyf.js:8759-9194 placement
/**
 * 目标会话是否未报告能否接收消息。
 */
function isInboundUnreported(session, target) {
  try {
    let targetSessionId = sessionIdBody(target);
    let found = warmCloudSessions(session)?.find(
      (cloudSession) => sessionIdBody(cloudSession.id) === targetSessionId,
    );
    let found_2 = bridgeListingRows(session)?.find(
      (bridgeSession) => sessionIdBody(bridgeSession.id) === targetSessionId,
    );
    if (
      (found !== undefined && !found.remoteControl) ||
      (found_2 !== undefined && hasEnvironmentKindOtherThanBridge(found_2))
    )
      return false;
    if (found_2?.inboundReportUnavailable && found?.acceptsPeerMessages === undefined) return false;
    return !(found?.acceptsPeerMessages === true || found_2?.acceptsPeerMessages === true);
  } catch (error) {
    logForDebugging(
      `[agents:cloud] warm inbound-report lookup failed (${stripAnsiAndControls(errorMessage(error))}) \u2014 treating as unreported`,
      {
        level: "warn",
      },
    );
    return true;
  }
}
export {
  unreachableElevatedRefusal,
  ELEVATED_UNREACHABLE_REASON,
  cannotReceiveRefusal,
  RECIPIENT_CANNOT_RECEIVE_REASON,
  sendDenialKind,
  isInboundUnreported,
  searchCloudPeers,
  primePeerIdentity,
  fetchBridgePopulation,
  excludeKnownPeerSessions,
  isTransientListingFailure,
  recordBridgeListing,
  livePeerSessionsExcludingKnown,
  forgetBridgeListing,
  isCurrentBridgeIdentity,
  CANNOT_RECEIVE_REASON,
  bridgeListingRows,
  warmBridgeListing,
  warmCloudSessions,
};
