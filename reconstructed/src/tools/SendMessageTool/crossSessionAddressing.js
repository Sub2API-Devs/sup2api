/**
 * tools/SendMessageTool/crossSessionAddressing.ts
 *
 * 2.1.316 新增：跨会话消息寻址
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-n0beqxxz.js (47)
 * attribution: placement 47
 */
import { getAPIProvider } from "../../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { Rxi } from "../../utils/settings/settingsSourceTrust.js";
import {
  slugifySessionName,
  dIt,
  V9t,
  pdt,
  q9t,
  d8,
  fdt,
  teamLeadAddress,
  cIt,
  udt,
  describeAgentAddress,
  Y9t,
  LD,
  Lhr,
  resolveUniqueCandidate,
  ePn,
  isStableAddressEnabled,
  cdt,
} from "../../utils/sessionAddresses.js";
import { Hb } from "../../utils/swarm/teammateIds.js";
import { plural } from "../../utils/stringUtils.js";
import {
  primePeerIdentity,
  searchCloudPeers,
  dVt,
  fetchBridgePopulation,
  recordBridgeListing,
  obn,
  snr,
  forgetBridgeListing,
} from "../../utils/peerSessions/cloudPeers.js";
import { getTeamName } from "../../utils/teammate.js";
import { MAIN } from "../../utils/sessionPeers.js";
import { Um, Mr } from "../../utils/agentId.js";
import { TEAM_LEAD } from "../../utils/swarm/constants.js";
import { readTeamFileAsync } from "../../utils/swarm/teamHelpers.js";
import { listPeerSessionsSafe, EFo } from "../../utils/peerAddressing.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isCrossSessionMessagingEnabled } from "../../utils/crossSessionMessagingGate.js";
import { withDeadline } from "../../utils/sleep.js";
import { logForDebugging } from "../../utils/debug.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { isMainSessionTask } from "../../tasks/LocalMainSessionTask.js";
import { mayBeSamePath, isSamePath } from "../../utils/peerAddress.js";
import { uniq } from "../../utils/collections.js";
import { similarNames } from "../../utils/settings/managedEnvKeys.js";

/**
 * 跨会话发送的组织策略键（Remote Control / 云会话）、未知类型时的合并标签与无策略允许时的说明。
 */
//@ chunk-n0beqxxz.js:963-1269 placement
var REMOTE_SEND_POLICY_KEYS = {
    "remote-control": ["allow_remote_control"],
    cloud: ["allow_remote_sessions"],
    unknown: ["allow_remote_control", "allow_remote_sessions"],
  },
  COMBINED_REMOTE_FEATURE_LABEL = { featureLabel: "Remote Control and Cloud sessions", verb: "are" },
  NO_POLICY_ALLOWS_REASON =
    "No organization policy allows sends to this kind of session, so it can't be shown as permitted.";
/**
 * 判断能否向某类远程会话发送：非第一方/仅必要流量时为 residency；组织策略都拒绝时记录并返回第一个拒绝原因；允许时返回 null。
 */
//@ chunk-n0beqxxz.js:1269-1785 placement
function getRemoteSendBlock(e) {
  if (getAPIProvider() !== "firstParty" || isEssentialTrafficOnly()) return { cause: "residency" };
  if (Rxi()) return null;
  let n = require("./chunk-sbc4zy7a.js"),
    i = REMOTE_SEND_POLICY_KEYS[e],
    s = [];
  for (let d of i) {
    let { featureLabel: featureLabel, verb: verb } = n.policyKeyLabel(d),
      policyDeniedReason = n.policyDeniedReason(d, featureLabel, verb);
    if (policyDeniedReason === null) return null;
    s.push(policyDeniedReason);
  }
  let [o] = i;
  if (o === void 0) return { cause: "policy", reason: NO_POLICY_ALLOWS_REASON };
  let { logOrgPolicyDenied: logOrgPolicyDenied } = require("./chunk-g8qt1yya.js");
  return (
    logOrgPolicyDenied(o, "tool"),
    {
      cause: "policy",
      reason:
        (e === "unknown" && s.length > 1
          ? (n.policyDeniedReason(
              o,
              COMBINED_REMOTE_FEATURE_LABEL.featureLabel,
              COMBINED_REMOTE_FEATURE_LABEL.verb,
            ) ?? s[0])
          : s[0]) ?? NO_POLICY_ALLOWS_REASON,
    }
  );
}
/**
 * 记录本会话对某名字的发送目标（id、ref、socket），身份变化时更新 sendMessagePins，保留更稳定的会话 id。
 */
//@ chunk-n0beqxxz.js:1785-2146 placement
function pinSendTarget(e, n, i) {
  let s = slugifySessionName(n);
  e((o) => {
    let a = Object.hasOwn(o.sendMessagePins, s) ? o.sendMessagePins[s] : void 0,
      r =
        a !== void 0 && dIt(a.id) && !dIt(i.id) && (i.claimedSessionIds ?? []).some((d) => V9t(d) === a.id)
          ? a.id
          : i.id;
    return a?.id === r && a.sock === i.sock
      ? o
      : {
          ...o,
          sendMessagePins: {
            ...o.sendMessagePins,
            [s]: { id: r, name: n, ref: pdt(i.kind, r), ...(i.sock !== void 0 && { sock: i.sock }) },
          },
        };
  });
}
/**
 * 用曾用名字首次给一个新会话发消息时的提示（对方是否重启过？）。
 */
//@ chunk-n0beqxxz.js:2146-2254 placement
var PREVIOUSLY_PINNED_NOTE =
  "Note: messaging a new session for the first time under a previously used name (was it restarted?)";
/**
 * 说明本机某会话现名为 X、其旧名之一为目标名（会话改名提示）。
 */
//@ chunk-n0beqxxz.js:2254-2453 placement
function renamedSessionNote(e, n) {
  return `
A session on this machine now named '${n}' reports '${e}' as one of its former names \u2014 if that is the session you meant, it goes by '${n}' now (a rename, not a stop).`;
}
//@ chunk-n0beqxxz.js:2453-2544 placement
function EHs(e) {
  return ` A session now named '${e}' reports it as a former name (renamed).`;
}
/**
 * 跨会话发送的提示：本机另有会话记录声称同一身份、目标会话自上次联系后重启，以及本机会话的通用称呼。
 */
//@ chunk-n0beqxxz.js:2544-3107 placement
var IDENTITY_CONTESTED_NOTE =
    "Note: another live session record on this machine currently claims this session's identity (the same conversation open in two places, or a record impersonating it). This went to the socket confirmed earlier in this conversation; if that is unexpected, check with the user before sending it anything sensitive.",
  RESTARTED_SINCE_PIN_NOTE =
    "Note: this session has restarted since this conversation last reached it (same session, new process). If you were not expecting that, check with the user before sending it anything sensitive.",
  LOCAL_SESSION_LABEL = "another Claude session on this machine";
/**
 * 子代理发送跨会话消息时的说明：以本会话地址发出，回复会送到主对话（单向时只说明发送身份）。
 */
//@ chunk-n0beqxxz.js:3107-3544 placement
function describeSubagentSender(e, n, i) {
  if (e === void 0) return { message: "", display: "" };
  let s = (n && Hb(n)) || "an agent in this session";
  return i.oneWay
    ? {
        message: "; sent under this session's address, not this agent's",
        display: ` (sent by ${s}, under this session's name)`,
      }
    : {
        message:
          "; sent under this session's address: any reply will be delivered to this session's main conversation, not to this agent",
        display: ` (sent by ${s}; replies go to the main conversation)`,
      };
}
/**
 * 描述远程会话类型：云端会话或经 Remote Control 的其他机器会话。
 */
//@ chunk-n0beqxxz.js:3544-3678 placement
function describeRemoteSessionKind(e) {
  return e === "cloud"
    ? "a Claude session running in the cloud"
    : "a Claude session on another machine, over Remote Control";
}
/**
 * 跨会话投递状态说明：服务端已接受但未确认送达（对方可能是旧版本），或已进入对方收件箱尚未读取（是否会回报取决于本地是否绑定收件箱）。
 */
//@ chunk-n0beqxxz.js:3678-4379 placement
var UNCONFIRMED_DELIVERY_NOTE =
    "; accepted by the server for that session, but delivery is not confirmed: it has not reported that it can receive cross-session messages and may be on an older version that cannot",
  UNCONFIRMED_DELIVERY_DISPLAY =
    " (accepted by the server; delivery not confirmed, that session may be on an older version)",
  INBOX_WITH_NOTICE_NOTE =
    "; in that session's inbox, not yet read by its Claude \u2014 a [Cross-session delivery notice] follows if that session holds it (usually a different permission mode) or refuses it",
  INBOX_NO_NOTICE_NOTE =
    "; in that session's inbox, not yet read by its Claude \u2014 that session may hold it (usually a different permission mode) or refuse it, and with no inbox bound here nothing reports back, so never treat silence as agreement";
//@ chunk-n0beqxxz.js:4379-4410 placement
function Pvo(e) {
  return e ? INBOX_WITH_NOTICE_NOTE : INBOX_NO_NOTICE_NOTE;
}
/**
 * 跨会话消息无已读回执的说明（对方可能保留或拒绝，此路由不回报）。
 */
//@ chunk-n0beqxxz.js:4410-4627 placement
var NO_READ_RECEIPT_NOTE =
    "; not confirmed read \u2014 that session may hold it (usually a different permission mode) or refuse it, and this route reports nothing back",
  NO_READ_RECEIPT_DISPLAY = " (that session's settings decide delivery; no read receipt)";
//@ chunk-n0beqxxz.js:4627-4701 placement
function Ivo(e) {
  return e
    ? { message: UNCONFIRMED_DELIVERY_NOTE, display: UNCONFIRMED_DELIVERY_DISPLAY }
    : { message: "", display: "" };
}
/**
 * 生成本机目标会话的附加说明（也通过 Remote Control 连接、同名远程会话被本地认领等）。
 */
//@ chunk-n0beqxxz.js:4701-4969 placement
function describeLocalTargetCaveats(e) {
  return `${e.alsoListedRemotely ? "; it is also connected via Remote Control" : ""}${e.remoteNamesakeClaimedLocally ? `; a Remote Control or cloud session also named '${e.displayName}' is registered to a session on this machine` : ""}${e.searchTruncated ? TRUNCATED_SEARCH_NOTE : ""}`;
}
/**
 * 生成"已发往本对话确认过的会话"的说明，并提示如何改发给其他同名目标。
 */
//@ chunk-n0beqxxz.js:4969-5211 placement
function describePinnedChoice(e, n, i = "live session", s = "delivery") {
  return describePinCaveats(
    e,
    `. ${s === "subscription" ? "The subscription" : "This"} went to the one this conversation confirmed; to switch, re-send with that ${i === "agent" ? "agent" : "session"}'s 'name [ref]'${n}.`,
    i,
  );
}
/**
 * 生成"已发往本对话先前确认的那个"的简短说明。
 */
//@ chunk-n0beqxxz.js:5211-5380 placement
function describeConfirmedChoice(e, n = "live session", i = "delivery") {
  return describePinCaveats(
    e,
    `; ${i === "subscription" ? "the subscription" : "this"} went to the one confirmed earlier in this conversation.`,
    n,
  );
}
//@ chunk-n0beqxxz.js:5380-5659 placement
function describePinCaveats(e, n, i) {
  let s = e.previouslyPinned
      ? `
${PREVIOUSLY_PINNED_NOTE}`
      : e.restartedSincePin
        ? `
${RESTARTED_SINCE_PIN_NOTE}`
        : e.identityContested
          ? `
${IDENTITY_CONTESTED_NOTE}`
          : "",
    o = e.sameNamedSiblings
      ? `
Note: ${e.sameNamedSiblings} other ${plural(e.sameNamedSiblings, `${i} is`, `${i}s are`)} also named '${e.displayName}'${n}`
      : "";
  return `${s}${o}`;
}
/**
 * 生成远程目标会话的附加说明（离线、同名会话已在本机注册等）。
 */
//@ chunk-n0beqxxz.js:5659-5857 placement
function describeRemoteTargetCaveats(e) {
  return `${e.offline ? Ee : ""}${e.remoteNamesakeClaimedLocally ? `; another session also named '${e.displayName}' is registered to a session on this machine` : ""}${e.searchTruncated ? TRUNCATED_SEARCH_NOTE : ""}`;
}
//@ chunk-n0beqxxz.js:5857-5948 placement
var Ee = "; it is offline right now \u2014 delivery is queued until that machine reconnects";
/**
 * 说明哪些会话来源未能搜索：本机会话列表不可用、本机与账号会话都未能全部检查，或账号会话未能检查。
 */
//@ chunk-n0beqxxz.js:5948-6259 placement
function describeUnsearchedSessions(e) {
  return e.localUnavailable && !e.bridgeUnavailable && !e.cloudUnavailable
    ? "the sessions on this machine could not be listed just now"
    : e.localUnavailable
      ? "this machine's and your account's other sessions could not all be checked just now"
      : "your account's other sessions could not be checked just now";
}
/**
 * 本机会话声称是先前确认在别处的会话时的说明。
 */
//@ chunk-n0beqxxz.js:6259-6385 placement
function claimedElsewhereMessage(e) {
  return `A session on this machine now claims to be '${e}', which was confirmed earlier as a session elsewhere`;
}
/**
 * 会话列表过长未能完整搜索时的说明（附加在结果、段落与简短形式中）。
 */
//@ chunk-n0beqxxz.js:6385-6700 placement
var TRUNCATED_SEARCH_NOTE =
    "; your session list was too long to check completely, so a same-named session beyond what was searched would not have been seen",
  TRUNCATED_SEARCH_PARAGRAPH = `
Your session list was too long to check completely, so a session by that name may exist beyond what was searched.`,
  TRUNCATED_SEARCH_SHORT = "your session list was too long to check completely";
/**
 * 解析 SendMessage 的跨会话收件人（会话名/团队成员），返回匹配或最接近的候选。
 */
//@ chunk-n0beqxxz.js:6700-11055 placement
async function resolveCrossSessionAddress(e, n, i, s, o, a) {
  await primePeerIdentity({ refresh: !0, credentials: a });
  let r = slugifySessionName(n),
    d = getTeamName(s.teamContext),
    l = null;
  if (q9t(n)) return { kind: "not-found", closest: [] };
  if (typeof i === "string") {
    if (n === MAIN) return { kind: "main" };
    let h = s.teamContext?.teammates ?? {},
      found = Object.entries(h).find(([, v]) => v.name === n),
      P = Um(n) ?? Um(r),
      y = found || P ? void 0 : s.agentNameRegistry.get(n),
      S = P ?? y;
    if (S) return subagentRoute(s, S, n);
    if (found)
      return {
        kind: "mailbox",
        recipientName: n,
        memberAgentId: found[0],
        memberIdentitySource: "team-context",
      };
    let ne = d8(n);
    if (d) {
      if (n === TEAM_LEAD) return { kind: "mailbox", recipientName: n };
      if (((l = await readTeamFileAsync(d, o)), ne === null && l !== null)) {
        let found = fdt(l, teamLeadAddress(s)).find((p) => p.name === n);
        if (found !== void 0)
          return {
            kind: "mailbox",
            recipientName: n,
            memberAgentId: found.agentId,
            memberIdentitySource: "roster",
          };
      }
    }
    let Se = teamLeadAddress(s),
      found_2 = Object.entries(h).find(
        ([v, p]) =>
          (cIt({ name: p.name, agentId: v }, Se) || !udt(p.name)) && slugifySessionName(p.name) === r,
      );
    if (found_2 !== void 0)
      return {
        kind: "mailbox",
        recipientName: found_2[1].name,
        memberAgentId: found_2[0],
        memberIdentitySource: "team-context",
      };
    for (let [v, p] of s.agentNameRegistry)
      if (!udt(v) && slugifySessionName(v) === r) return subagentRoute(s, p, v);
    let M = ne;
    if (M) {
      let [v, p] = await Promise.all([listPeerSessionsSafe(), searchCloudPeers(e, a)]),
        sessions = v.sessions,
        Y = await loadRemoteRowsForPin(e, s.sendMessagePins, slugifySessionName(M.name), p, r, EFo(e), a),
        { rows: rows, unavailable: unavailable } = Y,
        _ = describeAgentAddress(s, { teamFile: l, sessions: sessions, cloud: p.sessions, bridge: rows }),
        x = slugifySessionName(M.name),
        se = (I, W, Pe, xe) => {
          let L = candidateToRoute(I, s);
          return L.kind === "local-session" || L.kind === "cloud-session"
            ? {
                ...L,
                ...describeRouteFlags(
                  L,
                  x,
                  W,
                  {
                    socksMirroredRemotely: getMirroredSockets(sessions, p, Pe),
                    searchTruncated: p.truncated === !0 || xe,
                  },
                  s.sendMessagePins,
                ),
              }
            : L;
        },
        ie = findCandidateByRef(_, x, M.ref);
      if (ie) return se(ie, _, rows, Y.truncated);
      let te = unavailable,
        truncated = Y.truncated;
      if (rows === void 0) {
        let I = await fetchRemoteSessionRows(e, p, r, a);
        if (((te = I.unavailable), (truncated = I.truncated), I.rows.length > 0)) {
          _ = describeAgentAddress(s, { teamFile: l, sessions: sessions, cloud: p.sessions, bridge: I.rows });
          let W = findCandidateByRef(_, x, M.ref);
          if (W) return se(W, _, I.rows, I.truncated);
        }
      }
      return {
        ...notFoundWithSuggestions(x, _),
        ...findRenamedSession(x, sessions, _, s.sendMessagePins),
        ...describeSearchGaps(p, te, v.unavailable, { remoteTruncated: truncated }),
        ...findLocallyClaimedPin(s.sendMessagePins, [x], Y9t(sessions)),
      };
    }
  }
  if (typeof i !== "string") {
    if (i.type === "shutdown_response") return { kind: "mailbox", recipientName: n };
    if (n !== TEAM_LEAD && LD(n))
      return notFoundWithSuggestions(
        slugifySessionName(n),
        describeAgentAddress(s, { teamFile: null, sessions: [] }),
        (y) => y.kind === "teammate",
      );
    if (!d) return { kind: "mailbox", recipientName: n };
    if (n === TEAM_LEAD) return { kind: "mailbox", recipientName: n };
    let filtered = Object.entries(s.teamContext?.teammates ?? {}).filter(
        ([y, S]) => cIt({ name: S.name, agentId: y }, teamLeadAddress(s)) || !udt(S.name),
      ),
      found = filtered.find(([, y]) => y.name === n);
    if (found)
      return {
        kind: "mailbox",
        recipientName: n,
        memberAgentId: found[0],
        memberIdentitySource: "team-context",
      };
    if (((l = await readTeamFileAsync(d, o)), d8(n) === null && l !== null)) {
      let found = fdt(l, teamLeadAddress(s)).find((S) => S.name === n);
      if (found !== void 0)
        return {
          kind: "mailbox",
          recipientName: n,
          memberAgentId: found.agentId,
          memberIdentitySource: "roster",
        };
    }
    let found_2 = filtered.find(([, y]) => slugifySessionName(y.name) === r);
    if (found_2 !== void 0)
      return {
        kind: "mailbox",
        recipientName: found_2[1].name,
        memberAgentId: found_2[0],
        memberIdentitySource: "team-context",
      };
    if (d8(n) === null && l !== null) {
      let y = Lhr(fdt(l, teamLeadAddress(s)), n);
      if (y !== void 0)
        return {
          kind: "mailbox",
          recipientName: y.name,
          displayName: n,
          memberAgentId: y.agentId,
          memberIdentitySource: "roster",
        };
    }
    if (l === null) return { kind: "mailbox", recipientName: n };
    return notFoundWithSuggestions(
      r,
      describeAgentAddress(s, { teamFile: l, sessions: [] }),
      (y) => y.kind === "teammate",
    );
  }
  if (d && l === null) {
    if (LD(n)) return notFoundWithSuggestions(r, describeAgentAddress(s, { teamFile: l, sessions: [] }));
    return { kind: "mailbox", recipientName: n };
  }
  let [c, u] = await Promise.all([listPeerSessionsSafe(), searchCloudPeers(e, a)]),
    sessions = c.sessions,
    q = await loadRemoteRowsForPin(e, s.sendMessagePins, r, u, r, EFo(e), a),
    { rows: rows, unavailable: unavailable, truncated: truncated } = q,
    Q = Y9t(sessions),
    V = () => ({
      cloudUnavailable: he(u.unavailable),
      bridgeUnavailable: unavailable,
      localClaimedRemoteBodies: Q,
      bridgeSettled: rows !== void 0,
      localUnavailable: c.unavailable,
      socksMirroredRemotely: getMirroredSockets(sessions, u, rows),
      searchTruncated: u.truncated === !0 || truncated,
    }),
    k = describeAgentAddress(s, { teamFile: l, sessions: sessions, cloud: u.sessions, bridge: rows }),
    A = k.byName.get(r)?.length === 1 ? k.byName.get(r)[0] : void 0,
    Z = getPinKind(s.sendMessagePins, r),
    Ie =
      A !== void 0 &&
      Z !== void 0 &&
      Object.hasOwn(s.sendMessagePins, r) &&
      matchesPin(s.sendMessagePins[r], A),
    Ne = A !== void 0 && (A.kind === "session" || A.kind === "cloud-session") && Z !== "agent" && !Ie;
  if (rows === void 0 && Ne) {
    let h = await fetchRemoteSessionRows(e, u, r, a);
    ((rows = h.rows),
      (unavailable = h.unavailable),
      (truncated = h.truncated),
      (k = describeAgentAddress(s, { teamFile: l, sessions: sessions, cloud: u.sessions, bridge: h.rows })));
  }
  let ee = resolveExactName(k, r, n, s, V());
  if (ee) return ee;
  if (rows === void 0) {
    let h = await fetchRemoteSessionRows(e, u, r, a);
    if (((rows = h.rows), (unavailable = h.unavailable), (truncated = h.truncated), h.rows.length > 0)) {
      k = describeAgentAddress(s, { teamFile: l, sessions: sessions, cloud: u.sessions, bridge: h.rows });
      let R = resolveExactName(k, r, n, s, V());
      if (R) return R;
    }
  }
  return (
    resolveNamePrefix(k, r, s, V()) ?? {
      ...notFoundWithSuggestions(r, k),
      ...findRenamedSession(r, sessions, k, s.sendMessagePins),
      ...describeSearchGaps(u, unavailable, c.unavailable, { remoteTruncated: truncated }),
      ...findLocallyClaimedPin(s.sendMessagePins, [r], Q),
    }
  );
}
//@ chunk-n0beqxxz.js:11055-11179 placement
function getLocallyClaimedPinName(e, n, i) {
  let s = getPinKind(e, n);
  if (s !== "cloud" && s !== "remote-control") return;
  let o = e[n];
  return i.has(sessionIdBody(o.id)) ? o.name : void 0;
}
//@ chunk-n0beqxxz.js:11179-11349 placement
function expandPinPrefixes(e, n) {
  let i = n[0];
  if (i === void 0 || i.length < 3) return n;
  let filtered = Object.keys(e).filter((o) => o !== i && o.startsWith(i) && !n.includes(o));
  return filtered.length === 0 ? n : [...n, ...filtered];
}
//@ chunk-n0beqxxz.js:11349-11467 placement
function findLocallyClaimedPin(e, n, i) {
  for (let s of expandPinPrefixes(e, n)) {
    let o = getLocallyClaimedPinName(e, s, i);
    if (o !== void 0) return { pinnedIdentityClaimedLocally: o };
  }
  return {};
}
//@ chunk-n0beqxxz.js:11467-11663 placement
function getPinKind(e, n) {
  let i = Object.hasOwn(e, n) ? e[n] : void 0;
  if (i === void 0) return;
  if (Um(i.id) !== null) return "agent";
  if (i.id.startsWith("cse_")) return "cloud";
  return sessionIdBody(i.id) !== i.id ? "remote-control" : "local";
}
/**
 * 按需为固定目标加载远程会话列表：不需要时沿用已有结果，需要时拉取并在失败时回退到已有行。
 */
//@ chunk-n0beqxxz.js:11663-11978 placement
async function loadRemoteRowsForPin(e, n, i, s, o, a, r) {
  let d = a?.rows;
  if (!needsRemoteLookupForPin(n, i, s.sessions, d))
    return { rows: d, unavailable: void 0, truncated: a !== void 0 && a.truncated };
  let l = await fetchRemoteSessionRows(e, s, o, r);
  return {
    rows: l.unavailable === void 0 || d === void 0 ? l.rows : d,
    unavailable: l.unavailable,
    truncated: l.unavailable === void 0 || a === void 0 ? l.truncated : a.truncated,
  };
}
//@ chunk-n0beqxxz.js:11978-12160 placement
function needsRemoteLookupForPin(e, n, i, s) {
  let o = getPinKind(e, n);
  if (o !== "remote-control" && o !== "cloud") return !1;
  let a = sessionIdBody(e[n].id);
  if (i.some((r) => sessionIdBody(r.id) === a)) return !1;
  return s === void 0 || !s.some((r) => sessionIdBody(r.id) === a);
}
//@ chunk-n0beqxxz.js:12160-12395 placement
function searchGaps(e) {
  return {
    ...(e.cloudUnavailable && { cloudUnavailable: e.cloudUnavailable }),
    ...(e.bridgeUnavailable && { bridgeUnavailable: e.bridgeUnavailable }),
    ...(e.localUnavailable && { localUnavailable: !0 }),
    ...(e.searchTruncated && { searchTruncated: !0 }),
  };
}
/**
 * 按名字精确解析发送目标：唯一时直接转为路由；同名多个时优先使用已固定的目标，若只有一个会话且所有来源都已搜索则视为唯一，否则返回 ambiguous 并带搜索缺口说明。
 */
//@ chunk-n0beqxxz.js:12395-13120 placement
function resolveExactName(e, n, i, s, o) {
  let a = resolveUniqueCandidate(e.byName, n, i);
  if (a) {
    if (a.kind === "ambiguous") {
      let r = e.byName.get(n),
        d = findPinnedCandidate(s.sendMessagePins, n, r, i, o);
      if (d) return pinnedRoute(d, r, s, n, e, o);
      let l = findLocallyClaimedPin(s.sendMessagePins, [n], o.localClaimedRemoteBodies),
        c = r[0],
        u = getPinKind(s.sendMessagePins, n);
      if (
        r.length === 1 &&
        (c.kind === "session" || c.kind === "cloud-session" || c.kind === "bridge-session") &&
        !o.cloudUnavailable &&
        o.bridgeSettled &&
        !o.bridgeUnavailable &&
        !o.localUnavailable &&
        l.pinnedIdentityClaimedLocally === void 0 &&
        u !== "agent" &&
        !c.derivedName
      ) {
        let b = candidateToRoute(c, s);
        if (b.kind === "local-session" || b.kind === "cloud-session")
          return {
            ...b,
            exactUnique: !0,
            ...(u !== void 0 && { previouslyPinned: !0 }),
            ...describeRouteFlags(b, n, e, o, s.sendMessagePins),
          };
      }
      return { ...D(r, "exact"), ...searchGaps(o), ...l };
    }
    return candidateToRoute(a.candidate, s);
  }
  return;
}
/**
 * 按名字前缀（≥3 字符）解析发送目标：唯一前缀匹配时处理已固定目标与同名歧义、未搜索完整的来源；多个前缀匹配返回 ambiguous；记录 send_message_prefix_match 遥测。
 */
//@ chunk-n0beqxxz.js:13120-14768 placement
function resolveNamePrefix(e, n, i, s) {
  if (n.length >= 3) {
    let filtered = [...e.byName.keys()].filter((a) => a.startsWith(n));
    if (filtered.length === 1) {
      let a = resolveUniqueCandidate(e.byName, filtered[0]),
        r = getPinKind(i.sendMessagePins, n),
        d =
          findLocallyClaimedPin(i.sendMessagePins, [n], s.localClaimedRemoteBodies)
            .pinnedIdentityClaimedLocally !== void 0;
      if ((r !== void 0 && r !== "agent") || d) {
        let l = e.byName.get(filtered[0]);
        return (
          logFeatureSad(
            "send_message_prefix_match",
            r !== void 0 && r !== "agent" ? "typed_name_pinned" : "prefix_of_claimed_pin",
          ),
          {
            ...D(a.kind === "one" ? [a.candidate] : l, "prefix"),
            ...searchGaps(s),
            ...findLocallyClaimedPin(i.sendMessagePins, [n, filtered[0]], s.localClaimedRemoteBodies),
          }
        );
      }
      if (a.kind === "ambiguous") {
        let l = e.byName.get(filtered[0]),
          c = findPinnedCandidate(i.sendMessagePins, filtered[0], l, void 0, s, !0);
        if (c)
          return (
            logFeatureOk("send_message_prefix_match", {
              input_len: n.length,
              index_size: e.candidates.length,
              pinned: 1,
            }),
            pinnedRoute(c, l, i, filtered[0], e, s)
          );
        if (l.length === 1) logFeatureSad("send_message_prefix_match", "confirm_required");
        else logFeatureBad("send_message_prefix_match", "ambiguous_name");
        return {
          ...D(l, "prefix"),
          ...searchGaps(s),
          ...findLocallyClaimedPin(i.sendMessagePins, [n, filtered[0]], s.localClaimedRemoteBodies),
        };
      }
      if (s.cloudUnavailable || s.bridgeUnavailable || s.localUnavailable)
        return (
          logFeatureSad(
            "send_message_prefix_match",
            s.cloudUnavailable || s.bridgeUnavailable ? "remote_unsearched" : "local_unsearched",
          ),
          {
            ...D([a.candidate], "prefix"),
            ...searchGaps(s),
            ...findLocallyClaimedPin(i.sendMessagePins, [n, filtered[0]], s.localClaimedRemoteBodies),
          }
        );
      return (
        logFeatureOk("send_message_prefix_match", {
          input_len: n.length,
          index_size: e.candidates.length,
          ...(s.searchTruncated && { search_truncated: !0 }),
        }),
        candidateToRoute(a.candidate, i)
      );
    }
    if (filtered.length > 1)
      return (
        logFeatureBad("send_message_prefix_match", "ambiguous_prefix"),
        {
          ...searchGaps(s),
          ...findLocallyClaimedPin(i.sendMessagePins, [n, ...filtered], s.localClaimedRemoteBodies),
          ...D(
            filtered.flatMap((a) => {
              let r = e.byName.get(a),
                d = resolveUniqueCandidate(e.byName, a);
              return d?.kind === "one" ? [d.candidate] : r;
            }),
            "prefix",
          ),
        }
      );
  }
  return;
}
//@ chunk-n0beqxxz.js:14768-14892 placement
function findCandidateByRef(e, n, i) {
  let s = e.byName.get(n) ?? [],
    o = resolveUniqueCandidate(e.byName, n);
  return (o?.kind === "one" ? [o.candidate] : s).find((r) => r.ref === i);
}
/**
 * 冷启动时拉取 Remote Control 会话列表（有超时），失败或超时返回 unavailable 原因，成功时与云会话列表去重并按需记录。
 */
//@ chunk-n0beqxxz.js:14892-15825 placement
async function fetchRemoteSessionRows(e, n, i, s) {
  if (isCrossSessionMessagingEnabled()) {
    let o = !dVt(n.unavailable),
      a = fetchBridgePopulation(e, s),
      r = await withDeadline(a, ge);
    if (r === void 0) {
      if (
        (logForDebugging(
          `[bridge:resolve] "${i}": Remote Control population not ready within ${ge}ms (cold) \u2014 not searched, disclosing a hedge`,
          { level: "warn" },
        ),
        o)
      )
        a.then((l) => recordBridgeListing(e, l, obn(l.rows, n.sessions)));
      return { rows: [], unavailable: "timeout", truncated: !1 };
    }
    if (r.failed || (r.identityKey !== null && !snr(r)))
      return (
        logForDebugging(
          `[bridge:resolve] "${i}": Remote Control walk ${r.failed ? "failed" : "ran under a previous handle"} (cold) \u2014 not searched, disclosing a hedge`,
          { level: "warn" },
        ),
        { rows: [], unavailable: "fetch_failed", truncated: !1 }
      );
    let d = obn(r.rows, n.sessions);
    if (o) recordBridgeListing(e, r, d);
    else forgetBridgeListing(e, r);
    return (
      logForDebugging(
        `[bridge:resolve] "${i}": ${r.rows.length} Remote Control rows, ${d.length} listed (cold${o ? ", recorded" : ", not recorded \u2014 cloud list failed"})`,
      ),
      { rows: d, unavailable: void 0, truncated: r.truncated === !0 }
    );
  }
  return { rows: [], unavailable: void 0, truncated: !1 };
}
//@ chunk-n0beqxxz.js:15825-15863 placement
function he(e) {
  return dVt(e) ? e : void 0;
}
//@ chunk-n0beqxxz.js:15863-16057 placement
function describeSearchGaps(e, n, i, { remoteTruncated: remoteTruncated }) {
  return {
    cloudUnavailable: he(e.unavailable),
    ...(n !== void 0 && { bridgeUnavailable: n }),
    ...(i && { localUnavailable: !0 }),
    ...((e.truncated === !0 || remoteTruncated) && { searchTruncated: !0 }),
  };
}
/**
 * 把子代理 id 转换为路由：运行中、被用户停止、已停止（带状态）或已从任务表逐出。
 */
//@ chunk-n0beqxxz.js:16057-16369 placement
function subagentRoute(e, n, i) {
  let s = e.tasks[n];
  if (isLocalAgent(s) && !isMainSessionTask(s)) {
    if (s.status === "running") return { kind: "agent-live", agentId: n, agentName: i };
    if (s.stoppedByUser) return { kind: "agent-stopped-by-user", agentName: i };
    return { kind: "agent-stopped", agentId: n, status: s.status, agentName: i };
  }
  return { kind: "agent-evicted", agentId: n, agentName: i };
}
/**
 * 把寻址候选转换为投递路由：main、队友邮箱、子代理（运行中/已停止/已逐出）、本机会话（socket 与 pin id）、云/Remote Control 会话。
 */
//@ chunk-n0beqxxz.js:16369-17137 placement
function candidateToRoute(e, n) {
  switch (e.kind) {
    case "main":
      return { kind: "main" };
    case "teammate":
      return {
        kind: "mailbox",
        recipientName: e.name,
        memberAgentId: e.id,
        memberIdentitySource: e.where === "in-process" ? "team-context" : "roster",
      };
    case "subagent":
      return subagentRoute(n, Mr(e.id), e.name);
    case "session":
      return {
        kind: "local-session",
        sock: e.sock,
        pinId: ePn(e),
        ...(e.claimedSessionIds !== void 0 && { claimedSessionIds: e.claimedSessionIds }),
        displayName: e.name,
        ...(e.hostSessionId !== void 0 && { hostSessionId: e.hostSessionId }),
      };
    case "cloud-session":
    case "bridge-session":
      return {
        kind: "cloud-session",
        via: e.where === "cloud" ? "cloud" : "remote-control",
        refKind: e.kind,
        sessionId: e.id,
        displayName: e.name,
        ...(e.offline && { offline: !0 }),
        ...(e.reportsInbound && { reportsInbound: !0 }),
        ...(e.inboundReportUnavailable && { inboundReportUnavailable: !0 }),
      };
  }
}
//@ chunk-n0beqxxz.js:17137-17154 placement
var pe = 3,
  ge = 5000;
//@ chunk-n0beqxxz.js:17154-17247 placement
function D(e, n) {
  return { kind: "ambiguous", candidates: e.slice(0, pe), total: e.length, matchedBy: n };
}
/**
 * 查找改过名的会话：唯一一条记录的旧名等于目标名、socket 唯一且对应候选名唯一时，返回改名提示与候选。
 */
//@ chunk-n0beqxxz.js:17247-17785 placement
function findRenamedSession(e, n, i, s) {
  if (!isStableAddressEnabled()) return {};
  let filtered = n.filter(
    (c) =>
      cdt(c) &&
      c.sessionId !== void 0 &&
      c.formerNames?.some((u) => u.sessionId === c.sessionId && slugifySessionName(u.name) === e),
  );
  if (filtered.length !== 1) return {};
  let a = filtered[0];
  if (n.filter((c) => cdt(c) && mayBeSamePath(c.sock, a.sock)).length !== 1) return {};
  let found = i.candidates.find(
    (candidate) =>
      candidate.kind === "session" && candidate.sock !== void 0 && isSamePath(candidate.sock, a.sock),
  );
  if (
    found === void 0 ||
    d8(found.name) !== null ||
    LD(found.name) ||
    (i.byName.get(slugifySessionName(found.name))?.length ?? 0) !== 1
  )
    return {};
  let l = Object.hasOwn(s, e) ? s[e] : void 0;
  if (l !== void 0 && l.id !== ePn(found)) return {};
  return { renamedTo: found };
}
//@ chunk-n0beqxxz.js:17785-17957 placement
function notFoundWithSuggestions(e, n, i) {
  let s = i ? n.candidates.filter(i) : n.candidates,
    o = uniq(s.map((r) => slugifySessionName(r.name)));
  return {
    kind: "not-found",
    closest: similarNames(e, o, pe).map((r) => s.find((d) => slugifySessionName(d.name) === r)),
  };
}
/**
 * 按会话固定的 pin 查找候选：跳过代理类与被本地认领的远程 pin，相关来源不可用时放弃；按 id 或 socket 匹配，找不到记录 pin 失效。
 */
//@ chunk-n0beqxxz.js:17957-18673 placement
function findPinnedCandidate(e, n, i, s, o, a = !1) {
  let r = Object.hasOwn(e, n) ? e[n] : void 0;
  if (r === void 0) return;
  let d = getPinKind(e, n);
  if (d === "agent") return;
  let l = d !== "local";
  if (l && o.localClaimedRemoteBodies.has(sessionIdBody(r.id))) return;
  if (
    (d === "cloud" && o.cloudUnavailable) ||
    (d === "remote-control" && o.bridgeUnavailable) ||
    (d === "local" && o.localUnavailable) ||
    (a && (o.cloudUnavailable || o.bridgeUnavailable || o.localUnavailable))
  )
    return;
  let filtered = i.filter(
      (b) =>
        (l ? b.kind === "cloud-session" || b.kind === "bridge-session" : b.kind === "session") &&
        b.where !== "in-process",
    ),
    u = filtered.find((b) => ePn(b) === r.id) ?? filtered.find((b) => matchesPin(r, b));
  if (u === void 0) {
    if (!(l && o.searchTruncated)) logFeatureSad("send_message_pin", "stale");
    return;
  }
  if (s !== void 0 && u.name !== s && i.some((b) => b.name === s)) return;
  return (logFeatureOk("send_message_pin"), u);
}
/**
 * 把固定的候选转换为路由：本机会话 pin id 与持有的更稳定 id 不符时标记身份冲突，附加同名兄弟数量与路由标记。
 */
//@ chunk-n0beqxxz.js:18673-19093 placement
function pinnedRoute(e, n, i, s, o, a) {
  let r = candidateToRoute(e, i);
  if (r.kind !== "local-session" && r.kind !== "cloud-session") return r;
  let d = Object.hasOwn(i.sendMessagePins, s) ? i.sendMessagePins[s] : void 0,
    c =
      r.kind === "local-session" &&
      d !== void 0 &&
      d.id !== r.pinId &&
      d.sock !== void 0 &&
      isSamePath(d.sock, r.sock) &&
      dIt(d.id) &&
      !dIt(r.pinId)
        ? { ...r, pinId: d.id, identityContested: !0 }
        : r;
  return {
    ...c,
    ...(n.length > 1 && { sameNamedSiblings: n.length - 1 }),
    ...describeRouteFlags(c, s, o, a, i.sendMessagePins),
  };
}
//@ chunk-n0beqxxz.js:19093-19293 placement
function getMirroredSockets(e, n, i) {
  let s = new Set([
    ...n.sessions.map((session) => sessionIdBody(session.id)),
    ...(i ?? []).map((o) => sessionIdBody(o.id)),
  ]);
  return new Set(
    e.flatMap((o) =>
      o.bridgeSessionId !== void 0 && s.has(sessionIdBody(o.bridgeSessionId)) ? [o.sock] : [],
    ),
  );
}
//@ chunk-n0beqxxz.js:19293-19512 placement
function matchesPin(e, n) {
  if (ePn(n) === e.id) return !0;
  if (e.sock === void 0 || n.kind !== "session" || n.sock === void 0 || !isSamePath(n.sock, e.sock))
    return !1;
  return !dIt(e.id) || (n.stableId === void 0 && (n.claimedSessionIds ?? []).some((i) => V9t(i) === e.id));
}
/**
 * 生成路由附加标记：自固定后已重启、也在远程列表中、同名远程会话被本地认领、搜索被截断。
 */
//@ chunk-n0beqxxz.js:19512-19949 placement
function describeRouteFlags(e, n, i, s, o) {
  let a = Object.hasOwn(o, n) ? o[n] : void 0;
  return {
    ...(e.kind === "local-session" &&
      a?.sock !== void 0 &&
      a.id === e.pinId &&
      !isSamePath(a.sock, e.sock) && { restartedSincePin: !0 }),
    ...(e.kind === "local-session" && s.socksMirroredRemotely.has(e.sock) && { alsoListedRemotely: !0 }),
    ...([...(i.remoteNamesClaimedLocally.get(n) ?? [])].some(
      (r) => e.kind !== "local-session" || r !== e.sock,
    ) && { remoteNamesakeClaimedLocally: !0 }),
    ...(s.searchTruncated && { searchTruncated: !0 }),
  };
}

export {
  getRemoteSendBlock,
  resolveCrossSessionAddress,
  describeSubagentSender,
  NO_READ_RECEIPT_NOTE,
  NO_READ_RECEIPT_DISPLAY,
  Ivo,
  Pvo,
  renamedSessionNote,
  TRUNCATED_SEARCH_PARAGRAPH,
  EHs,
  describeUnsearchedSessions,
  TRUNCATED_SEARCH_SHORT,
  claimedElsewhereMessage,
  LOCAL_SESSION_LABEL,
  pinSendTarget,
  describePinnedChoice,
  describeConfirmedChoice,
  describeLocalTargetCaveats,
  describeRemoteTargetCaveats,
  describeRemoteSessionKind,
  UNCONFIRMED_DELIVERY_NOTE,
  PREVIOUSLY_PINNED_NOTE,
  RESTARTED_SINCE_PIN_NOTE,
  IDENTITY_CONTESTED_NOTE,
};
