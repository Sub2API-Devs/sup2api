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
  settle(e) {
    if (this.inFlight === e) this.inFlight = undefined;
  }
}
//@ chunk-rwnj2eyf.js:2108-2132 placement
var bridgeListingSlot = new SessionRootSlot(() => new BridgeListingSlot());
//@ chunk-rwnj2eyf.js:2132-2241 placement
/**
 * 预热同伴身份归属。
 */
async function primePeerIdentity(
  e = {
    refresh: true,
  },
) {
  {
    let { primePeerIdentityOwner } = require("./chunk-y0hca4vs.js");
    await primePeerIdentityOwner(e);
  }
}
//@ chunk-rwnj2eyf.js:2241-2346 placement
function currentBridgeIdentityKey() {
  let { getPeerBridgeIdentity } = require("./chunk-y0hca4vs.js");
  let peerBridgeIdentity = getPeerBridgeIdentity();
  return peerBridgeIdentity?.live ? peerBridgeIdentity.key : null;
}
//@ chunk-rwnj2eyf.js:2346-3184 placement
async function fetchBridgePopulation(e, r) {
  {
    let n = currentBridgeIdentityKey();
    if (!n)
      return {
        rows: [],
        failed: false,
        identityKey: null,
      };
    let o = bridgeListingSlot.of(e);
    let inFlight = o.inFlight;
    if (inFlight !== undefined && inFlight.identityKey === n) return inFlight.promise;
    let { listBridgePeerSessions } = require("./chunk-ypjxapg8.js");
    let l = {
      record: undefined,
    };
    let now = Date.now();
    let f = (async () => {
      try {
        let g = {
          failed: false,
          truncated: false,
        };
        let h;
        try {
          h = await listBridgePeerSessions(g, r);
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
            identityKey: n,
          };
        }
        logForDebugging(
          `[bridge:population] fetched ${h.length} rows in ${Date.now() - now}ms${g.failed ? " (FAILED \u2014 not recordable)" : ""}${g.truncated ? " (truncated at page budget)" : ""}`,
        );
        return {
          rows: h,
          failed: g.failed,
          ...(g.truncated && {
            truncated: true,
          }),
          identityKey: n,
        };
      } finally {
        o.settle(l.record);
      }
    })();
    l.record = {
      identityKey: n,
      promise: f,
    };
    o.begin(l.record);
    return f;
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
function isCurrentBridgeIdentity(e) {
  {
    let r = currentBridgeIdentityKey();
    return r !== null && e.identityKey === r;
  }
  return false;
}
//@ chunk-rwnj2eyf.js:3255-3730 placement
/**
 * 记录桥接列表结果（身份已变则忽略，失败时清空已记录集合）。
 */
function recordBridgeListing(e, r, n) {
  {
    let o = currentBridgeIdentityKey();
    if (!o) return;
    if (r.identityKey !== o) {
      logForDebugging(
        "[bridge:population] walk ran under a previous identity \u2014 ignoring its outcome for the current one",
      );
      return;
    }
    let s = bridgeListingSlot.of(e);
    if (r.failed) {
      let listed = s.listed;
      if (listed !== undefined && listed.identityKey === o) {
        s.forget();
        logForDebugging(
          "[bridge:population] failed walk \u2014 cleared the printed set (going cold, never sticky)",
        );
      }
      return;
    }
    s.record(n, o, r.truncated === true);
    logForDebugging(`[bridge:population] recorded ${n.length} bridge rows (cloud-deduped)`);
  }
}
//@ chunk-rwnj2eyf.js:3730-3950 placement
/**
 * 不可记录的列表取代时清除已记录集合。
 */
function forgetBridgeListing(e, r) {
  {
    let n = currentBridgeIdentityKey();
    if (!n || r.identityKey !== n) return;
    let o = bridgeListingSlot.of(e);
    let listed = o.listed;
    if (listed !== undefined && listed.identityKey === n) {
      o.forget();
      logForDebugging("[bridge:population] forgot the recorded set (an unrecordable listing superseded it)");
    }
  }
}
//@ chunk-rwnj2eyf.js:3950-3986 placement
/**
 * bridgeListingRows：未过期且身份一致的桥接会话行。
 */
function bridgeListingRows(e) {
  return warmBridgeListing(e)?.rows;
}
//@ chunk-rwnj2eyf.js:3986-4242 placement
/**
 * 未过期且身份一致的已记录桥接列表。
 */
function warmBridgeListing(e) {
  {
    let r = currentBridgeIdentityKey();
    let listed = bridgeListingSlot.of(e).listed;
    if (!r || listed === undefined || listed.identityKey !== r) return;
    let o = Date.now() - listed.at;
    if (o >= 0 && o < BRIDGE_LISTING_TTL_MS) {
      logForDebugging(`[bridge:population] warm recorded set: ${listed.listed.length} rows (age ${o}ms)`);
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
function excludeKnownPeerSessions(e, r, n) {
  let o = bridgeSessionIds(r);
  let s = new Set(n.filter((a) => !hasBridgeSessionId(r, a.id)).map((a) => sessionIdBody(a.id)));
  return e.filter((a) => {
    let l = sessionIdBody(a.id);
    return !o.has(l) && !s.has(l);
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
  record(sessions, truncated, n) {
    if (n !== currentWalkCredentialKey()) return;
    this.memo = {
      at: Date.now(),
      sessions,
      truncated,
      credential: n,
    };
  }
  begin(promise, credential) {
    this.inFlight = {
      promise,
      credential,
    };
  }
  settle(e) {
    if (this.inFlight?.promise === e) this.inFlight = undefined;
  }
  warm(e) {
    let memo = this.memo;
    if (memo === undefined || memo.credential !== e) return;
    let n = Date.now() - memo.at;
    return n >= 0 && n < CLOUD_SESSIONS_MEMO_TTL_MS ? memo : undefined;
  }
}
//@ chunk-rwnj2eyf.js:4865-4945 placement
function currentWalkCredentialKey() {
  let { walkCredentialKey } = require("./chunk-y0hca4vs.js");
  return walkCredentialKey();
}
//@ chunk-rwnj2eyf.js:4945-4969 placement
var cloudSessionsMemoSlot = new SessionRootSlot(() => new CloudSessionsMemo());
//@ chunk-rwnj2eyf.js:4969-5759 placement
async function searchCloudPeers(e, credentials) {
  {
    let { hasCloudPeerAccess } = require("./chunk-96k5yyba.js");
    if (!hasCloudPeerAccess())
      return {
        sessions: [],
        unavailable: "gate_off",
      };
    let { walkCcrSessionList } = require("./chunk-52hnbzac.js");
    let s = cloudSessionsMemoSlot.of(e);
    let a = currentWalkCredentialKey();
    let l = s.warm(a);
    if (l !== undefined)
      return {
        sessions: l.sessions,
        unavailable: undefined,
        ...(l.truncated && {
          truncated: true,
        }),
      };
    let inFlight = s.inFlight;
    let f =
      inFlight !== undefined && inFlight.credential === a
        ? inFlight.promise
        : walkCcrSessionList_2(s, walkCcrSessionList, a, credentials);
    let g = await withDeadline(f, CLOUD_SESSION_LIST_DEADLINE_MS);
    if (g === undefined) {
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
    if (a !== currentWalkCredentialKey()) {
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
    return g;
  }
  return {
    sessions: [],
    unavailable: undefined,
  };
}
//@ chunk-rwnj2eyf.js:5759-7071 placement
function walkCcrSessionList_2(e, walkCcrSessionList, n, credentials) {
  let s = env.CLAUDE_CODE_REMOTE === true;
  let a = s ? sessionIdBody(env.CLAUDE_CODE_REMOTE_SESSION_ID ?? "") : "";
  if (a === "") {
    let { getPeerBridgeIdentity } = require("./chunk-y0hca4vs.js");
    let bridgeSessionId = getPeerBridgeIdentity()?.bridgeSessionId;
    a = typeof bridgeSessionId === "string" ? sessionIdBody(bridgeSessionId) : "";
  }
  let l = (async () => {
    let c;
    let f = {
      truncated: false,
    };
    try {
      c = await walkCcrSessionList({
        status: f,
        throwOnError: true,
        exhaustive: true,
        includeBridgeKind: s,
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
    let g = false;
    if (s) {
      let { isRemoteControlPeerUnreachableFromHere } = require("./chunk-3kb57csj.js");
      g = isRemoteControlPeerUnreachableFromHere();
    }
    let mapped = (a === "" ? c : c.filter((u) => sessionIdBody(u.id) !== a)).map((u) => {
      let timestamp = Date.parse(u.last_event_at ?? u.created_at ?? "");
      return {
        id: u.id,
        title: u.title ?? null,
        lastActive: Number.isNaN(timestamp) ? undefined : timestamp,
        workerStatus:
          u.worker_status === "running" || u.worker_status === "idle" || u.worker_status === "requires_action"
            ? u.worker_status
            : undefined,
        remoteControl: u.environment_kind === "bridge",
        unreachableFromHere: g && u.environment_kind === "bridge",
        ...parseCrossSessionInboundCapability(u.external_metadata),
        ...(u.environment_kind === "bridge" &&
          u.connection_status === "disconnected" && {
            offline: true,
          }),
      };
    });
    e.record(mapped, f.truncated, n);
    return {
      sessions: mapped,
      unavailable: undefined,
      ...(f.truncated && {
        truncated: true,
      }),
    };
  })();
  e.begin(l, n);
  l.finally(() => e.settle(l));
  return l;
}
//@ chunk-rwnj2eyf.js:7071-7202 placement
/**
 * 未过期的云端会话列表（需云端同伴权限）。
 */
function warmCloudSessions(e) {
  {
    let { hasCloudPeerAccess } = require("./chunk-96k5yyba.js");
    if (!hasCloudPeerAccess()) return;
    return cloudSessionsMemoSlot.of(e).warm(currentWalkCredentialKey())?.sessions;
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
function sendDenialKind(e) {
  if (e.reason !== "denied") return "handler_rewrite";
  if (e.decisionReason?.type === "other") {
    if (e.decisionReason.reason === ELEVATED_UNREACHABLE_REASON) return "bridge_auth";
    if (e.decisionReason.reason === RECIPIENT_CANNOT_RECEIVE_REASON) return "recipient_gate_off";
  }
  return "permission_denied";
}
//@ chunk-rwnj2eyf.js:7593-8025 placement
/**
 * 目标是云端不可达的高安全会话时生成拒绝文案。
 */
function unreachableElevatedRefusal(session, r, n, o) {
  try {
    let found = warmCloudSessions(session)?.find((c) => sessionIdBody(c.id) === sessionIdBody(r));
    if (!found?.unreachableFromHere) return;
    let { formatUnreachableElevatedRefusal } = require("./chunk-3kb57csj.js");
    let l;
    try {
      l = found.acceptsPeerMessages === false ? undefined : o?.();
    } catch {
      l = undefined;
    }
    return formatUnreachableElevatedRefusal(
      n,
      l === undefined
        ? undefined
        : {
            sendTool: l,
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
function cannotReceiveRefusal(session, r, n) {
  try {
    let o = sessionIdBody(r);
    if (!(
      warmCloudSessions(session)?.some(
        (a) => sessionIdBody(a.id) === o && a.acceptsPeerMessages === false,
      ) === true ||
      bridgeListingRows(session)?.some(
        (a) => sessionIdBody(a.id) === o && a.acceptsPeerMessages === false,
      ) === true
    ))
      return;
    return `Not sent: '${n}' ${CANNOT_RECEIVE_REASON} \u2014 its Claude would never see the message. That session is set not to accept cross-session messages (the feature is off on its platform, or a setting or policy there refuses them); reach that machine another way, or ask its user to enable it (listings refresh within a few minutes \u2014 re-run ListAgents after they do).`;
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
    let n = sessionIdBody(target);
    let found = warmCloudSessions(session)?.find((a) => sessionIdBody(a.id) === n);
    let found_2 = bridgeListingRows(session)?.find((a) => sessionIdBody(a.id) === n);
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
