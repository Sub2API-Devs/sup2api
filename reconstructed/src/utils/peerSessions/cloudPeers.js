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
import { Y9t, hasBridgeSessionId, b3e } from "../sessionAddresses.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { withDeadline } from "../sleep.js";
import { env } from "../env.js";
import { describeAxiosError } from "../../bridge/debugUtils.js";
import { parseCrossSessionInboundCapability } from "../sessionState.js";
import { stripAnsiAndControls } from "../printableName.js";

//@ chunk-rwnj2eyf.js:1874-1887 placement
var v = 300000;
//@ chunk-rwnj2eyf.js:1887-2108 placement
class BridgeListingSlot {
  listed = void 0;
  inFlight = void 0;
  record(e, r, n) {
    this.listed = { at: Date.now(), listed: e, identityKey: r, truncated: n };
  }
  forget() {
    this.listed = void 0;
  }
  begin(e) {
    this.inFlight = e;
  }
  settle(e) {
    if (this.inFlight === e) this.inFlight = void 0;
  }
}
//@ chunk-rwnj2eyf.js:2108-2132 placement
var b = new SessionRootSlot(() => new BridgeListingSlot());
/**
 * 预热同伴身份归属。
 */
//@ chunk-rwnj2eyf.js:2132-2241 placement
async function primePeerIdentity(e = { refresh: !0 }) {
  {
    let { primePeerIdentityOwner: primePeerIdentityOwner } = require("./chunk-y0hca4vs.js");
    await primePeerIdentityOwner(e);
  }
}
//@ chunk-rwnj2eyf.js:2241-2346 placement
function currentBridgeIdentityKey() {
  let { getPeerBridgeIdentity: getPeerBridgeIdentity } = require("./chunk-y0hca4vs.js"),
    r = getPeerBridgeIdentity();
  return r?.live ? r.key : null;
}
//@ chunk-rwnj2eyf.js:2346-3184 placement
async function fetchBridgePopulation(e, r) {
  {
    let n = currentBridgeIdentityKey();
    if (!n) return { rows: [], failed: !1, identityKey: null };
    let of = b.of(e),
      inFlight = of.inFlight;
    if (inFlight !== void 0 && inFlight.identityKey === n) return inFlight.promise;
    let { listBridgePeerSessions: listBridgePeerSessions } = require("./chunk-ypjxapg8.js"),
      l = { record: void 0 },
      now = Date.now(),
      f = (async () => {
        try {
          let g = { failed: !1, truncated: !1 },
            h;
          try {
            h = await listBridgePeerSessions(g, r);
          } catch (error) {
            return (
              logForDebugging(
                `[bridge:population] fetch threw: ${errorMessage(error)} \u2014 treated as failed`,
                { level: "warn" },
              ),
              { rows: [], failed: !0, identityKey: n }
            );
          }
          return (
            logForDebugging(
              `[bridge:population] fetched ${h.length} rows in ${Date.now() - now}ms${g.failed ? " (FAILED \u2014 not recordable)" : ""}${g.truncated ? " (truncated at page budget)" : ""}`,
            ),
            { rows: h, failed: g.failed, ...(g.truncated && { truncated: !0 }), identityKey: n }
          );
        } finally {
          of.settle(l.record);
        }
      })();
    return ((l.record = { identityKey: n, promise: f }), of.begin(l.record), f);
  }
  return { rows: [], failed: !1, identityKey: null };
}
//@ chunk-rwnj2eyf.js:3184-3255 placement
function snr(e) {
  {
    let r = currentBridgeIdentityKey();
    return r !== null && e.identityKey === r;
  }
  return !1;
}
/**
 * 记录桥接列表结果（身份已变则忽略，失败时清空已记录集合）。
 */
//@ chunk-rwnj2eyf.js:3255-3730 placement
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
    let of = b.of(e);
    if (r.failed) {
      let listed = of.listed;
      if (listed !== void 0 && listed.identityKey === o)
        (of.forget(),
          logForDebugging(
            "[bridge:population] failed walk \u2014 cleared the printed set (going cold, never sticky)",
          ));
      return;
    }
    (of.record(n, o, r.truncated === !0),
      logForDebugging(`[bridge:population] recorded ${n.length} bridge rows (cloud-deduped)`));
  }
}
/**
 * 不可记录的列表取代时清除已记录集合。
 */
//@ chunk-rwnj2eyf.js:3730-3950 placement
function forgetBridgeListing(e, r) {
  {
    let n = currentBridgeIdentityKey();
    if (!n || r.identityKey !== n) return;
    let of = b.of(e),
      listed = of.listed;
    if (listed !== void 0 && listed.identityKey === n)
      (of.forget(),
        logForDebugging(
          "[bridge:population] forgot the recorded set (an unrecordable listing superseded it)",
        ));
  }
}
//@ chunk-rwnj2eyf.js:3950-3986 placement
function anr(e) {
  return warmBridgeListing(e)?.rows;
}
/**
 * 未过期且身份一致的已记录桥接列表。
 */
//@ chunk-rwnj2eyf.js:3986-4242 placement
function warmBridgeListing(e) {
  {
    let r = currentBridgeIdentityKey(),
      listed = b.of(e).listed;
    if (!r || listed === void 0 || listed.identityKey !== r) return;
    let o = Date.now() - listed.at;
    if (o >= 0 && o < v)
      return (
        logForDebugging(`[bridge:population] warm recorded set: ${listed.listed.length} rows (age ${o}ms)`),
        { rows: listed.listed, truncated: listed.truncated }
      );
  }
  return;
}
/**
 * 排除云端已列出或本机已知的会话。
 */
//@ chunk-rwnj2eyf.js:4242-4399 placement
function excludeKnownPeerSessions(e, r, n) {
  let o = Y9t(r),
    s = new Set(n.filter((a) => !hasBridgeSessionId(r, a.id)).map((a) => sessionIdBody(a.id)));
  return e.filter((a) => {
    let l = sessionIdBody(a.id);
    return !o.has(l) && !s.has(l);
  });
}
//@ chunk-rwnj2eyf.js:4399-4436 placement
function obn(e, r) {
  return excludeKnownPeerSessions(e, [], r);
}
//@ chunk-rwnj2eyf.js:4436-4493 placement
function dVt(e) {
  return e === "timeout" || e === "fetch_failed";
}
//@ chunk-rwnj2eyf.js:4493-4512 placement
var I = 30000,
  P = 5000;
/**
 * 云端会话列表缓存（按凭证，含进行中请求）。
 */
//@ chunk-rwnj2eyf.js:4512-4865 placement
class CloudSessionsMemo {
  memo = void 0;
  inFlight = void 0;
  record(e, r, n) {
    if (n !== S()) return;
    this.memo = { at: Date.now(), sessions: e, truncated: r, credential: n };
  }
  begin(e, r) {
    this.inFlight = { promise: e, credential: r };
  }
  settle(e) {
    if (this.inFlight?.promise === e) this.inFlight = void 0;
  }
  warm(e) {
    let memo = this.memo;
    if (memo === void 0 || memo.credential !== e) return;
    let n = Date.now() - memo.at;
    return n >= 0 && n < I ? memo : void 0;
  }
}
//@ chunk-rwnj2eyf.js:4865-4945 placement
function S() {
  let { walkCredentialKey: walkCredentialKey } = require("./chunk-y0hca4vs.js");
  return walkCredentialKey();
}
//@ chunk-rwnj2eyf.js:4945-4969 placement
var B = new SessionRootSlot(() => new CloudSessionsMemo());
//@ chunk-rwnj2eyf.js:4969-5759 placement
async function searchCloudPeers(e, r) {
  {
    let { hasCloudPeerAccess: hasCloudPeerAccess } = require("./chunk-96k5yyba.js");
    if (!hasCloudPeerAccess()) return { sessions: [], unavailable: "gate_off" };
    let { walkCcrSessionList: walkCcrSessionList } = require("./chunk-52hnbzac.js"),
      of = B.of(e),
      a = S(),
      warm = of.warm(a);
    if (warm !== void 0)
      return { sessions: warm.sessions, unavailable: void 0, ...(warm.truncated && { truncated: !0 }) };
    let inFlight = of.inFlight,
      f =
        inFlight !== void 0 && inFlight.credential === a
          ? inFlight.promise
          : walkCcrSessionList_2(of, walkCcrSessionList, a, r),
      g = await withDeadline(f, P);
    if (g === void 0)
      return (
        logForDebugging(
          `[agents:cloud] session list not ready within ${P}ms \u2014 not searched this call, disclosing`,
          { level: "warn" },
        ),
        { sessions: [], unavailable: "timeout" }
      );
    if (a !== S())
      return (
        logForDebugging(
          "[agents:cloud] session list walk ran under a superseded credential \u2014 not served, disclosing",
          { level: "warn" },
        ),
        { sessions: [], unavailable: "fetch_failed" }
      );
    return g;
  }
  return { sessions: [], unavailable: void 0 };
}
//@ chunk-rwnj2eyf.js:5759-7071 placement
function walkCcrSessionList_2(e, r, n, o) {
  let s = env.CLAUDE_CODE_REMOTE === !0,
    a = s ? sessionIdBody(env.CLAUDE_CODE_REMOTE_SESSION_ID ?? "") : "";
  if (a === "") {
    let { getPeerBridgeIdentity: getPeerBridgeIdentity } = require("./chunk-y0hca4vs.js"),
      f = getPeerBridgeIdentity()?.bridgeSessionId;
    a = typeof f === "string" ? sessionIdBody(f) : "";
  }
  let l = (async () => {
    let c,
      f = { truncated: !1 };
    try {
      c = await r({ status: f, throwOnError: !0, exhaustive: !0, includeBridgeKind: s, credentials: o });
    } catch (error) {
      return (
        logForDebugging(
          `[agents:cloud] session list threw: ${error instanceof TypeError ? "malformed session-list response \u2014 " : ""}${describeAxiosError(error)}`,
          { level: "error" },
        ),
        { sessions: [], unavailable: "fetch_failed" }
      );
    }
    let g = !1;
    if (s) {
      let {
        isRemoteControlPeerUnreachableFromHere: isRemoteControlPeerUnreachableFromHere,
      } = require("./chunk-3kb57csj.js");
      g = isRemoteControlPeerUnreachableFromHere();
    }
    let mapped = (a === "" ? c : c.filter((u) => sessionIdBody(u.id) !== a)).map((u) => {
      let parse = Date.parse(u.last_event_at ?? u.created_at ?? "");
      return {
        id: u.id,
        title: u.title ?? null,
        lastActive: Number.isNaN(parse) ? void 0 : parse,
        workerStatus:
          u.worker_status === "running" || u.worker_status === "idle" || u.worker_status === "requires_action"
            ? u.worker_status
            : void 0,
        remoteControl: u.environment_kind === "bridge",
        unreachableFromHere: g && u.environment_kind === "bridge",
        ...parseCrossSessionInboundCapability(u.external_metadata),
        ...(u.environment_kind === "bridge" && u.connection_status === "disconnected" && { offline: !0 }),
      };
    });
    return (
      e.record(mapped, f.truncated, n),
      { sessions: mapped, unavailable: void 0, ...(f.truncated && { truncated: !0 }) }
    );
  })();
  return (e.begin(l, n), l.finally(() => e.settle(l)), l);
}
/**
 * 未过期的云端会话列表（需云端同伴权限）。
 */
//@ chunk-rwnj2eyf.js:7071-7202 placement
function warmCloudSessions(e) {
  {
    let { hasCloudPeerAccess: hasCloudPeerAccess } = require("./chunk-96k5yyba.js");
    if (!hasCloudPeerAccess()) return;
    return B.of(e).warm(S())?.sessions;
  }
  return;
}
/**
 * 高安全会话不可达与对方不收消息的拒绝原因。
 */
//@ chunk-rwnj2eyf.js:7202-7354 placement
var ELEVATED_UNREACHABLE_REASON = "target is an elevated-security session unreachable from a cloud session",
  RECIPIENT_CANNOT_RECEIVE_REASON = "target session reports it cannot receive cross-session messages";
/**
 * 发送被拒的类别（handler_rewrite/bridge_auth/recipient_gate_off/permission_denied）。
 */
//@ chunk-rwnj2eyf.js:7354-7593 placement
function sendDenialKind(e) {
  if (e.reason !== "denied") return "handler_rewrite";
  if (e.decisionReason?.type === "other") {
    if (e.decisionReason.reason === ELEVATED_UNREACHABLE_REASON) return "bridge_auth";
    if (e.decisionReason.reason === RECIPIENT_CANNOT_RECEIVE_REASON) return "recipient_gate_off";
  }
  return "permission_denied";
}
/**
 * 目标是云端不可达的高安全会话时生成拒绝文案。
 */
//@ chunk-rwnj2eyf.js:7593-8025 placement
function unreachableElevatedRefusal(e, r, n, o) {
  try {
    let s = warmCloudSessions(e)?.find((c) => sessionIdBody(c.id) === sessionIdBody(r));
    if (!s?.unreachableFromHere) return;
    let {
        formatUnreachableElevatedRefusal: formatUnreachableElevatedRefusal,
      } = require("./chunk-3kb57csj.js"),
      l;
    try {
      l = s.acceptsPeerMessages === !1 ? void 0 : o?.();
    } catch {
      l = void 0;
    }
    return formatUnreachableElevatedRefusal(n, l === void 0 ? void 0 : { sendTool: l, sessionId: s.id });
  } catch (error) {
    logForDebugging(
      `[agents:cloud] warm unreachable lookup failed (${stripAnsiAndControls(errorMessage(error))}) \u2014 treating as not known unreachable`,
      { level: "warn" },
    );
    return;
  }
}
//@ chunk-rwnj2eyf.js:8025-8094 placement
var sbn = "can't receive cross-session messages (off in that session)";
/**
 * 目标会话设置为不接收跨会话消息时生成拒绝文案。
 */
//@ chunk-rwnj2eyf.js:8094-8759 placement
function cannotReceiveRefusal(e, r, n) {
  try {
    let o = sessionIdBody(r);
    if (!(
      warmCloudSessions(e)?.some((a) => sessionIdBody(a.id) === o && a.acceptsPeerMessages === !1) === !0 ||
      anr(e)?.some((a) => sessionIdBody(a.id) === o && a.acceptsPeerMessages === !1) === !0
    ))
      return;
    return `Not sent: '${n}' ${sbn} \u2014 its Claude would never see the message. That session is set not to accept cross-session messages (the feature is off on its platform, or a setting or policy there refuses them); reach that machine another way, or ask its user to enable it (listings refresh within a few minutes \u2014 re-run ListAgents after they do).`;
  } catch (error) {
    logForDebugging(
      `[agents:cloud] warm cannot-receive lookup failed (${stripAnsiAndControls(errorMessage(error))}) \u2014 treating as unknown`,
      { level: "warn" },
    );
    return;
  }
}
/**
 * 目标会话是否未报告能否接收消息。
 */
//@ chunk-rwnj2eyf.js:8759-9194 placement
function isInboundUnreported(e, r) {
  try {
    let n = sessionIdBody(r),
      o = warmCloudSessions(e)?.find((a) => sessionIdBody(a.id) === n),
      s = anr(e)?.find((a) => sessionIdBody(a.id) === n);
    if ((o !== void 0 && !o.remoteControl) || (s !== void 0 && b3e(s))) return !1;
    if (s?.inboundReportUnavailable && o?.acceptsPeerMessages === void 0) return !1;
    return !(o?.acceptsPeerMessages === !0 || s?.acceptsPeerMessages === !0);
  } catch (error) {
    return (
      logForDebugging(
        `[agents:cloud] warm inbound-report lookup failed (${stripAnsiAndControls(errorMessage(error))}) \u2014 treating as unreported`,
        { level: "warn" },
      ),
      !0
    );
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
  dVt,
  recordBridgeListing,
  obn,
  forgetBridgeListing,
  snr,
  sbn,
  anr,
  warmBridgeListing,
  warmCloudSessions,
};
