/**
 * utils/peerSessions/listAgents.ts
 *
 * 2.1.316 新增。生成给模型看的可达代理列表：本会话、子代理、队友、本机与云端其他会话，以及能否用 SendMessage 联系。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5cp2fssw.js (30)
 * attribution: placement 30
 */
import { basename } from "path";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import { y2e } from "../peerFileTransfer.js";
import { SENDFILE, DYr, pYo } from "../../tools/SendFileTool/prompt.js";
import { isCrossSessionMessagingEnabled } from "../crossSessionMessagingGate.js";
import {
  primePeerIdentity,
  fetchBridgePopulation,
  searchCloudPeers,
  excludeKnownPeerSessions,
  dVt,
  recordBridgeListing,
  obn,
  forgetBridgeListing,
  snr,
  sbn,
} from "./cloudPeers.js";
import {
  listLivePeerSessions,
  SessionRecordsUnreadableError,
  isOwnEndpointShadowed,
  ownMessagingSocket,
} from "../udsMessaging/udsClient.js";
import {
  isStableAddressEnabled,
  hasBridgeSessionId,
  Zxn,
  pdt,
  fds,
  isOwnSessionIdAmbiguous,
  describeAgentAddress,
  slugifySessionName,
  teamLeadAddress,
  cIt,
  udt,
  normalizeSessionTitle,
  bOe,
  IBe,
  q9t,
  b3e,
  Boo,
} from "../sessionAddresses.js";
import { isOwnBridgeSession } from "../../tools/SendMessageTool/selfTarget.js";
import { getRegisteredSessionName, FORMER_NAME_HINT_TTL_MS } from "../concurrentSessions.js";
import { getUserTypedSessionName } from "../sessionNameUniqueness.js";
import { MAIN } from "../sessionPeers.js";
import { getTeamName, getAgentId } from "../teammate.js";
import { readTeamFileAsync } from "../swarm/teamHelpers.js";
import { ProactiveCountdown } from "../../components/PromptInput/PromptInputFooterLeftSide.js";

//@ chunk-5cp2fssw.js:792-885 placement
function v() {
  return `not reachable with ${SENDMESSAGE}${y2e() ? ` or ${SENDFILE}` : ""} from this cloud session`;
}
//@ chunk-5cp2fssw.js:885-1033 placement
var CLAUDE_DESKTOP_SESSION_LABEL = "Claude Desktop session",
  SESSION_LIST_TRUNCATED_NOTE =
    "(session list too long to fetch completely \u2014 sessions beyond the first pages are missing from this listing)";
//@ chunk-5cp2fssw.js:1033-2116 placement
async function listAllPeers(e, t, i) {
  let s = isCrossSessionMessagingEnabled(),
    n = !1;
  if (s) await primePeerIdentity({ refresh: !0, credentials: i });
  let r = s ? fetchBridgePopulation(e, i) : Promise.resolve({ rows: [], failed: !1, identityKey: null }),
    resolved = Promise.resolve({ peers: [], warnings: [] }),
    f = !1,
    c = !1,
    [p, g, o, m] = await Promise.all([
      s
        ? listLivePeerSessions().catch((d) => {
            if (d instanceof SessionRecordsUnreadableError) return ((f = !0), []);
            throw d;
          })
        : Promise.resolve([]),
      r,
      searchCloudPeers(e, i),
      resolved,
      s && !0 && isStableAddressEnabled()
        ? isOwnEndpointShadowed().then(
            (d) => {
              c = d;
            },
            () => {},
          )
        : Promise.resolve(),
    ]),
    mapped = p.map((d) => ({ transport: "uds", address: `uds:${d.sock}`, session: d }));
  for (let session of o.sessions) {
    if (hasBridgeSessionId(p, session.id) || isOwnBridgeSession(session.id)) continue;
    mapped.push({ transport: "cloud", address: void 0, session: session });
  }
  let h = excludeKnownPeerSessions(g.rows, p, o.sessions);
  if (!dVt(o.unavailable)) recordBridgeListing(e, g, obn(g.rows, o.sessions));
  else forgetBridgeListing(e, g);
  for (let d of h) mapped.push({ transport: "bridge", address: `bridge:${d.id}`, session: d });
  for (let peer of m.peers) mapped.push({ transport: "did", address: peer.did, session: peer });
  return {
    peers: mapped,
    didWarnings: m.warnings,
    didFocused: n,
    bridgeWalkFailed: g.failed || (g.identityKey !== null && !snr(g)),
    cloudListFailed: dVt(o.unavailable),
    localListFailed: f,
    ownEndpointShadowed: c,
    messagingDisabled: !s,
    listTruncated: o.truncated === !0 || g.truncated === !0,
  };
}
/**
 * 本会话名字与地址标记
 */
//@ chunk-5cp2fssw.js:2116-2345 placement
function getSelfSessionAddress(e = !1) {
  let t = ownMessagingSocket(),
    i = Zxn(getRegisteredSessionName()?.name);
  if (!t || i === null) return null;
  return {
    name: i,
    token: `${i} [${pdt("session", fds(t))}]`,
    socketToken: `${i} [${pdt("session", t)}]`,
    sock: t,
    callerIsSubagent: e,
    nameIsUserChosen: getUserTypedSessionName() !== void 0,
  };
}
/**
 * 本会话自我说明
 */
//@ chunk-5cp2fssw.js:2345-2925 placement
function describeSelfSession(e, t = [], i = !1) {
  if (!e) return null;
  let s = R(e, t, i),
    n =
      isStableAddressEnabled() && s === e.token
        ? " Session names and [ref]s listed here normally stay the same when a session restarts or is resumed; if one stops resolving, list again."
        : "";
  return e.callerIsSubagent
    ? `This process's main session is ${s} \u2014 the name OTHER sessions use to message it (it is not listed below; from inside this process, address the main conversation as "${MAIN}").${n}`
    : `This session is ${s} \u2014 the name other sessions use to message it (it is not listed below; a message to it would be a message to yourself).${n}`;
}
//@ chunk-5cp2fssw.js:2925-2988 placement
function R(e, t, i) {
  return isOwnSessionIdAmbiguous(t, e.sock, i) ? e.socketToken : e.token;
}
//@ chunk-5cp2fssw.js:2988-3257 placement
async function buildSubagentExtras(e, t) {
  let appState = e.getAppState(),
    s = getTeamName(appState.teamContext);
  return {
    appState: appState,
    teamFile: s ? await readTeamFileAsync(s, e.storageV5) : null,
    callerTeammateId:
      e.teammateContext === void 0
        ? void 0
        : e.agentContext?.agentId === e.teammateContext.agentId
          ? e.teammateContext.agentId
          : null,
    self: getSelfSessionAddress(t),
  };
}
/**
 * 生成给模型看的可达代理列表：本会话、子代理、队友、本机与云端其他会话，以及能否用 SendMessage 联系。
 */
//@ chunk-5cp2fssw.js:3257-5102 placement
function listAgentsForModel(
  e,
  t,
  {
    didWarnings: i = [],
    didFocused: s = !1,
    bridgeWalkFailed: n = !1,
    cloudListFailed: r = !1,
    localListFailed: u = !1,
    ownEndpointShadowed: f = !1,
    messagingDisabled: c = !1,
    listTruncated: p = !1,
    callerCanSend: g = !0,
  } = {},
) {
  let flattened = e.flatMap((l) => (l.transport === "uds" ? [l.session] : [])),
    flattened_2 = e.flatMap((l) => (l.transport === "cloud" ? [l.session] : [])),
    a = describeAgentAddress(t.appState, {
      teamFile: t.teamFile,
      sessions: flattened,
      cloud: flattened_2,
      bridge: n ? [] : e.flatMap((l) => (l.transport === "bridge" ? [l.session] : [])),
    }),
    h = new Map(a.candidates.map((candidate) => [`${candidate.kind}\x00${candidate.id}`, candidate])),
    d = collectSubagents(t.appState),
    _ = collectTeammates(t.appState, t.teamFile, t.callerTeammateId),
    flattened_3 = e.flatMap((l) => (l.transport === "bridge" ? [l] : [])),
    flattened_4 = e.flatMap((l) => (l.transport === "did" ? [l.session] : [])),
    k = [];
  if (d.length > 0) k.push(buildSubagentRows(d, h));
  if (_.length > 0) k.push(buildTeammateRows(_, h));
  if (!s && (flattened.length > 0 || flattened_2.length > 0 || flattened_3.length > 0 || n || r || u || p))
    k.push(buildSessionRows(flattened, h, flattened_2, flattened_3, n, r, u, p));
  let mapped = k.map((l) => l.text),
    y = {
      sections: k
        .filter((l) => l.rows.length > 0)
        .map((l) => ({ kind: l.kind, total: l.total, rows: l.rows.slice(0, Z).map((q) => q.agent) })),
      notes: k.flatMap((l) => l.notes),
    };
  if (c) y.notes.unshift({ kind: "messaging_disabled", text: P });
  let b = c ? null : describeSelfSession(t.self, flattened, f);
  if (c && mapped.length > 0) mapped.unshift(P);
  let x = !g && y.sections.length > 0;
  if (x && c) mapped.splice(1, 0, LIST_AGENTS_NOTES);
  let K =
    x && !c
      ? `${LIST_AGENTS_NOTES}

`
      : "";
  if (mapped.length === 0) {
    if (c) return { listing: P, ...y };
    if (!b) return { listing: "No reachable agents.", ...y };
    if (!g)
      return {
        listing:
          !s && !n
            ? `${b}

No reachable agents \u2014 no other Claude session is running on this machine right now.`
            : `${b}

No other session appears in this listing right now.`,
        ...y,
      };
    return {
      listing:
        !s && !n
          ? `${b}

No reachable agents \u2014 no other Claude session is running on this machine right now (peer messaging itself is available; a session appears here once it is started).`
          : `${b}

No other session appears in this listing right now (peer messaging itself is available).`,
      ...y,
    };
  }
  return {
    listing: `${K}${
      b
        ? `${b}

${mapped.join(`

`)}`
        : mapped.join(`

`)
    }`,
    ...y,
  };
}
/**
 * 收集本会话子代理
 */
//@ chunk-5cp2fssw.js:5102-5504 placement
function collectSubagents(e) {
  let t = new Map();
  for (let [n, r] of e.agentNameRegistry) t.set(r, n);
  let i = new Set(Object.values(e.teamContext?.teammates ?? {}).map((n) => n.name)),
    s = [];
  for (let n of Object.values(e.tasks)) {
    if (n.type !== "local_agent" || n.agentType === "main-session") continue;
    let r = t.get(n.id);
    s.push({
      agentId: n.id,
      name: r !== void 0 && i.has(r) ? void 0 : r,
      agentType: n.agentType,
      status: n.status,
      startTime: n.startTime,
    });
  }
  return s;
}
/**
 * 列表中的说明文字
 */
//@ chunk-5cp2fssw.js:5504-5945 placement
var LIST_AGENTS_NOTES = `None of the agents below can be messaged with ${SENDMESSAGE} from here: it is not among the tools available to you.`,
  P =
    "Cross-session messaging is switched off in this session right now \u2014 no sessions were listed, and this session is not reachable by name until it is switched back on.",
  J =
    "(the session list on this machine could not be read just now \u2014 other local sessions may be missing from this listing; a later listing retries)";
/**
 * 收集队友
 */
//@ chunk-5cp2fssw.js:5945-6923 placement
function collectTeammates(e, t, i) {
  let teamContext = e.teamContext;
  if (!teamContext && !t) return [];
  let n =
      i === null
        ? void 0
        : (i ??
          (teamContext
            ? (teamContext.selfAgentId ?? (teamContext.isLeader === !1 ? void 0 : teamContext.leadAgentId))
            : getAgentId())),
    r = new Map();
  for (let o of Object.values(e.tasks))
    if (o.type === "in_process_teammate") r.set(o.identity.agentId, o.isIdle ? "idle" : o.status);
  let u = [],
    f = new Set(n !== void 0 ? [n] : []),
    c = new Set();
  for (let o of e.agentNameRegistry.keys()) c.add(slugifySessionName(o));
  let p = teamLeadAddress(e),
    g = (o, m) => cIt({ name: o, agentId: m }, p) || !udt(o);
  for (let [o, m] of Object.entries(teamContext?.teammates ?? {})) {
    if (f.has(o) || !g(m.name, o)) continue;
    f.add(o);
    let a = m.tmuxPaneId === "in-process" || m.tmuxPaneId === "leader";
    u.push({
      teammateId: o,
      name: m.name,
      agentType: m.agentType,
      status: a ? r.get(o) : void 0,
      backend: a ? "in-process" : "pane",
      since: m.spawnedAt,
      nameShadowed: !1,
    });
  }
  for (let o of t?.members ?? []) {
    if (f.has(o.agentId) || !g(o.name, o.agentId)) continue;
    (f.add(o.agentId),
      u.push({
        teammateId: o.agentId,
        name: o.name,
        agentType: o.agentType,
        status: void 0,
        backend: "roster",
        since: o.joinedAt,
        nameShadowed: peerNameReachability(o.name, e, c),
      }));
  }
  return u;
}
//@ chunk-5cp2fssw.js:6923-7050 placement
function peerNameReachability(e, t, i) {
  let s = normalizeSessionTitle(e) ?? e;
  if (!i.has(slugifySessionName(s))) return !1;
  return t.agentNameRegistry.has(e) || s !== e ? "unreachable" : "bare-only";
}
/**
 * 多久前加入或启动
 */
//@ chunk-5cp2fssw.js:7050-7225 placement
function describeSince(e, t) {
  if (typeof e.since !== "number" || !Number.isFinite(e.since) || e.since > t || t - e.since > ee) return;
  return `${e.backend === "roster" ? "joined" : "started"} ${ProactiveCountdown(t - e.since)} ago`;
}
//@ chunk-5cp2fssw.js:7225-7288 placement
function A(e, t, i = t.length) {
  return `${e} (${i}):
${t.join(`
`)}`;
}
//@ chunk-5cp2fssw.js:7288-7326 placement
var W = 100,
  F = 100,
  Z = 100,
  ee = 315360000000;
/**
 * 面向用户的分区
 */
//@ chunk-5cp2fssw.js:7326-7482 placement
function formatSectionForUser(e, t, i) {
  let mapped = t.slice(0, W).map(i),
    n = t.length - mapped.length;
  if (n > 0) mapped.push(`  (\u2026 ${n} more not shown)`);
  return `${e} (${t.length}):
${mapped.join(`
`)}`;
}
/**
 * 曾用名说明
 */
//@ chunk-5cp2fssw.js:7482-7661 placement
function formerNameNote(e, t, i) {
  let s = e.formerNames?.[0];
  if (s === void 0) return;
  let n = t - s.until;
  if (n < 0 || n >= FORMER_NAME_HINT_TTL_MS) return;
  let r = i(s.name);
  return r ? `says it was ${r} until ${ProactiveCountdown(t - s.until)} ago` : void 0;
}
/**
 * 一行代理信息
 */
//@ chunk-5cp2fssw.js:7661-7945 placement
function formatAgentRow(e, t) {
  let i = { ...e.shown },
    s = [e.printed];
  for (let n of t) {
    if (typeof n === "string") {
      s.push(n);
      continue;
    }
    let r = n === void 0 ? void 0 : "type" in n ? n.type : n.status;
    if (n !== void 0 && r !== void 0) ((i["type" in n ? "type" : "status"] = r), s.push(n.text ?? r));
  }
  return { agent: i, line: `  ${s.join("  \xB7  ")}` };
}
//@ chunk-5cp2fssw.js:7945-8085 placement
function shownNameFields(e, t, i) {
  if (e) return { shown: { name: e.name, ref: e.ref }, printed: bOe(e) };
  return t === null ? { shown: {}, printed: i } : { shown: { name: t }, printed: t };
}
/**
 * 组装列表分区
 */
//@ chunk-5cp2fssw.js:8085-8256 placement
function buildListingSection(e, t, i, s = i.length) {
  let mapped = i.map((r) => r.line);
  if (s > i.length) mapped.push(`  (\u2026 ${s - i.length} more not shown)`);
  return { kind: e, total: s, rows: i, notes: [], text: A(t, mapped, s) };
}
/**
 * 子代理行
 */
//@ chunk-5cp2fssw.js:8256-8578 placement
function buildSubagentRows(e, t) {
  let now = Date.now();
  return buildListingSection(
    "subagents",
    "Subagents",
    e.map((s) => {
      let n = s.name ? t.get(`subagent\x00${s.agentId}`) : void 0;
      return formatAgentRow(
        n
          ? { shown: { name: n.name, ref: n.ref, id: s.agentId }, printed: bOe(n) }
          : { shown: { id: s.agentId }, printed: s.agentId },
        [{ type: s.agentType }, { status: s.status }, `started ${ProactiveCountdown(now - s.startTime)} ago`],
      );
    }),
  );
}
/**
 * 队友行
 */
//@ chunk-5cp2fssw.js:8578-9232 placement
function buildTeammateRows(e, t) {
  let now = Date.now(),
    mapped = e.slice(0, W).map((n) => {
      let r = n.nameShadowed !== !1 ? void 0 : t.get(`teammate\x00${n.teammateId}`),
        u = IBe(n.status) ?? void 0;
      return formatAgentRow(shownNameFields(r, IBe(n.name), "(unnamed)"), [
        { type: IBe(n.agentType) ?? void 0 },
        { status: u },
        u !== void 0 || n.backend === "in-process" ? void 0 : n.backend,
        describeSince(n, now),
        n.nameShadowed === "unreachable"
          ? "not messageable by name while a subagent in this session is registered under that name (the name reaches the subagent)"
          : n.nameShadowed === "bare-only"
            ? "message it by this exact name as printed \u2014 no [ref]: a subagent here is registered under a variant spelling of it"
            : void 0,
      ]);
    });
  return buildListingSection("teammates", "Teammates", mapped, e.length);
}
/**
 * 其他会话行
 */
//@ chunk-5cp2fssw.js:9232-11111 placement
function buildSessionRows(e, t, i, s, n, r, u, f) {
  let now = Date.now(),
    p = [
      ...e.map((a) => {
        let h = t.get(`session\x00${a.sock}`),
          d =
            a.tmux !== void 0 && /^[^\s/\\\p{Cc}\p{Cf}]{1,64}$/u.test(a.tmux) && !q9t(a.tmux)
              ? a.tmux
              : void 0,
          _ = formerNameNote(a, now, IBe);
        return formatAgentRow(shownNameFields(h, IBe(a.name || basename(a.cwd)), "(untitled)"), [
          _,
          { type: a.kind },
          { status: a.status },
          a.hostSessionId === void 0 ? void 0 : CLAUDE_DESKTOP_SESSION_LABEL,
          d === void 0 ? void 0 : `tmux ${d}`,
          `started ${ProactiveCountdown(now - a.startedAt)} ago`,
        ]);
      }),
      ...i.map((a) => {
        let h = t.get(`cloud-session\x00${a.id}`),
          d = a.offline ? "offline" : a.workerStatus;
        return formatAgentRow(shownNameFields(h, IBe(a.title), "(untitled)"), [
          a.remoteControl ? { type: "remote_control", text: DYr } : { type: "cloud", text: "cloud session" },
          { status: d, text: describeRemoteStatus(d, d) },
          a.lastActive === void 0 ? void 0 : `active ${ProactiveCountdown(now - a.lastActive)} ago`,
          a.unreachableFromHere ? v() : void 0,
          a.acceptsPeerMessages === !1 ? sbn : void 0,
        ]);
      }),
      ...s.slice(0, F).map(({ session: session }) => {
        let h = t.get(`bridge-session\x00${session.id}`);
        return formatAgentRow(shownNameFields(h, IBe(session.title), "(untitled)"), [
          { type: b3e(session) ? "cloud" : "remote_control", text: pYo(session) },
          {
            status: Boo(session) ? "offline" : session.status,
            text: describeSessionStatus(session, session.status),
          },
          session.acceptsPeerMessages === !1 ? sbn : void 0,
        ]);
      }),
    ],
    g = buildListingSection("sessions", "Peer sessions", p, p.length + Math.max(0, s.length - F)),
    o = [];
  if (n)
    o.push({
      kind: "account_list_failed",
      text:
        s.length > 0
          ? "(account session list incomplete just now \u2014 those rows carry no [ref] and are not messageable by name until a later listing completes)"
          : "(the Remote Control session list for your account did not complete just now \u2014 Remote Control sessions on other machines may be missing from this listing; a later listing retries)",
    });
  if (r)
    o.push({
      kind: "cloud_list_failed",
      text: "(cloud session list could not be fetched just now \u2014 cloud sessions are missing from this listing; a later listing retries)",
    });
  if (u) o.push({ kind: "local_list_failed", text: J });
  if (f) o.push({ kind: "list_truncated", text: SESSION_LIST_TRUNCATED_NOTE });
  if (o.length === 0) return g;
  let joined = o.map((a) => a.text).join(`
  `);
  return {
    ...g,
    notes: o,
    text:
      p.length > 0
        ? `${g.text}
  ${joined}`
        : joined,
  };
}
//@ chunk-5cp2fssw.js:11111-12839 placement
function formatForUser(
  e,
  t,
  {
    bridgeWalkFailed: i = !1,
    cloudListFailed: s = !1,
    localListFailed: n = !1,
    ownEndpointShadowed: r = !1,
    messagingDisabled: u = !1,
    listTruncated: f = !1,
    omitDirectories: c = !1,
  } = {},
) {
  let p = collectSubagents(t.appState),
    g = collectTeammates(t.appState, t.teamFile, t.callerTeammateId),
    o = [];
  if (p.length > 0) o.push(formatSubagentsForUser(p));
  if (g.length > 0) o.push(formatTeammatesForUser(g));
  if (e.length > 0) o.push(buildOtherSessionsSection(e, c));
  if (s)
    o.push(
      "(cloud session list could not be fetched just now \u2014 cloud sessions are missing from this listing; try /list-agents again shortly)",
    );
  if (n)
    o.push(
      "(the session list on this machine could not be read just now \u2014 other local sessions may be missing from this listing; try /list-agents again shortly)",
    );
  if (i)
    o.push(
      "(the Remote Control session list for your account did not complete just now \u2014 Remote Control sessions on other machines may be missing from this listing; try /list-agents again shortly)",
    );
  if (f) o.push(SESSION_LIST_TRUNCATED_NOTE);
  let flattened = e.flatMap((h) => (h.transport === "uds" ? [h.session] : [])),
    a =
      u || !t.self || (c && !t.self.nameIsUserChosen)
        ? null
        : t.self.callerIsSubagent
          ? `This process's main session: ${R(t.self, flattened, r)} (the name OTHER sessions use for it; from inside this process, address it as "${MAIN}")`
          : `This session: ${R(t.self, flattened, r)} (the name other sessions use to message it)`;
  if (c && o.length > 0)
    o.push(
      "(session names and directories not chosen by a human are withheld on this connection \u2014 /rename a session on its own machine to give it an addressable name here)",
    );
  if (u && o.length > 0) o.unshift(P);
  if (o.length === 0) {
    if (u) return P;
    return a
      ? `${a}

No subagents, teammates or other Claude sessions \u2014 no other session is running on this machine right now; peer messaging itself is available.`
      : "No subagents, teammates or other Claude sessions.";
  }
  return a
    ? `${a}

${o.join(`

`)}`
    : o.join(`

`);
}
/**
 * 面向用户的子代理列表
 */
//@ chunk-5cp2fssw.js:12839-13041 placement
function formatSubagentsForUser(e) {
  let now = Date.now();
  return A(
    "Subagents",
    e.map((i) => {
      let s = i.name ? `${i.name}  \xB7  ${i.agentType}` : i.agentType;
      return `  [${i.status}]  \xB7  ${s}  \xB7  started ${ProactiveCountdown(now - i.startTime)} ago`;
    }),
  );
}
/**
 * 面向用户的队友列表
 */
//@ chunk-5cp2fssw.js:13041-13426 placement
function formatTeammatesForUser(e) {
  let now = Date.now();
  return formatSectionForUser("Teammates", e, (i) => {
    let s = IBe(i.name) ?? "(unnamed)",
      n = IBe(i.agentType),
      r = n ? `${s}  \xB7  ${n}` : s,
      u = describeSince(i, now),
      f =
        i.nameShadowed === "unreachable"
          ? "  \xB7  name held by a subagent here"
          : i.nameShadowed === "bare-only"
            ? "  \xB7  exact name only (a subagent holds a variant)"
            : "";
    return `  [${IBe(i.status) ?? i.backend}]  \xB7  ${r}${u ? `  \xB7  ${u}` : ""}${f}`;
  });
}
//@ chunk-5cp2fssw.js:13426-13494 placement
function describeRemoteStatus(e, t) {
  return e === "requires_action" ? "waiting on a human" : t;
}
//@ chunk-5cp2fssw.js:13494-13567 placement
function describeSessionStatus(e, t) {
  if (b3e(e)) return describeRemoteStatus(e.status, t);
  return Boo(e) ? "offline" : t;
}
//@ chunk-5cp2fssw.js:13567-13656 placement
function getSessionDisplayTitle(e) {
  if (!e) return;
  let t = normalizeSessionTitle(e);
  return t === null || t === "untitled session" ? void 0 : t;
}
//@ chunk-5cp2fssw.js:13656-14565 placement
function buildOtherSessionsSection(e, t = !1) {
  let now = Date.now();
  return A(
    "Other Claude sessions",
    e.map((s) => {
      switch (s.transport) {
        case "uds": {
          let session = s.session,
            r = t && session.nameSource !== "user" ? void 0 : getSessionDisplayTitle(session.name),
            u = t ? void 0 : (getSessionDisplayTitle(session.cwd) ?? "(unknown directory)"),
            f = t ? void 0 : formerNameNote(session, now, getSessionDisplayTitle),
            c = [r, f, u].filter(Boolean).join("  \xB7  ") || "(unnamed session)",
            p = session.hostSessionId === void 0 ? "" : `  \xB7  ${CLAUDE_DESKTOP_SESSION_LABEL}`;
          return `  [${getSessionDisplayTitle(session.status) ?? "unknown"}]  \xB7  ${c}${p}  \xB7  started ${ProactiveCountdown(now - session.startedAt)} ago`;
        }
        case "cloud": {
          let session = s.session;
          return `  [${session.offline ? "offline" : describeRemoteStatus(session.workerStatus, session.workerStatus ?? "unknown")}]  \xB7  ${getSessionDisplayTitle(session.title) ?? "(untitled)"}  \xB7  ${session.remoteControl ? DYr : "cloud"}${session.unreachableFromHere ? `  \xB7  ${v()}` : ""}${session.acceptsPeerMessages === !1 ? `  \xB7  ${sbn}` : ""}`;
        }
        case "bridge": {
          let session = s.session;
          return `  [${describeSessionStatus(session, getSessionDisplayTitle(session.status) ?? "unknown")}]  \xB7  ${getSessionDisplayTitle(session.title) ?? "(untitled)"}  \xB7  ${pYo(session)}${session.acceptsPeerMessages === !1 ? `  \xB7  ${sbn}` : ""}`;
        }
        case "did":
          return "";
      }
    }),
  );
}

export { listAllPeers, buildSubagentExtras, formatForUser };
