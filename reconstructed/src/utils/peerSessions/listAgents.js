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
import { isPeerSendFileEnabled } from "../peerFileTransfer.js";
import { SENDFILE, REMOTE_CONTROL_LABEL, sessionKindLabel } from "../../tools/SendFileTool/prompt.js";
import { isCrossSessionMessagingEnabled } from "../crossSessionMessagingGate.js";
import {
  primePeerIdentity,
  fetchBridgePopulation,
  searchCloudPeers,
  excludeKnownPeerSessions,
  isTransientListingFailure,
  recordBridgeListing,
  livePeerSessionsExcludingKnown,
  forgetBridgeListing,
  isCurrentBridgeIdentity,
  CANNOT_RECEIVE_REASON,
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
  plainSessionName,
  addressRef,
  stableAddressWhenEnabled,
  isOwnSessionIdAmbiguous,
  describeAgentAddress,
  slugifySessionName,
  teamLeadAddress,
  isLocalTeamLead,
  isReservedOrInvalidName,
  normalizeSessionTitle,
  formatNameWithRef,
  addressableSessionTitle,
  looksLikeAddress,
  hasEnvironmentKindOtherThanBridge,
  isDisconnectedNonBridge,
} from "../sessionAddresses.js";
import { isOwnBridgeSession } from "../../tools/SendMessageTool/selfTarget.js";
import { getRegisteredSessionName, FORMER_NAME_HINT_TTL_MS } from "../concurrentSessions.js";
import { getUserTypedSessionName } from "../sessionNameUniqueness.js";
import { MAIN } from "../sessionPeers.js";
import { getTeamName, getAgentId } from "../teammate.js";
import { readTeamFileAsync } from "../swarm/teamHelpers.js";
import { ProactiveCountdown } from "../../components/PromptInput/PromptInputFooterLeftSide.js";

//@ chunk-5cp2fssw.js:792-885 placement
function unreachableFromCloudText() {
  return `not reachable with ${SENDMESSAGE}${isPeerSendFileEnabled() ? ` or ${SENDFILE}` : ""} from this cloud session`;
}
//@ chunk-5cp2fssw.js:885-1033 placement
var CLAUDE_DESKTOP_SESSION_LABEL = "Claude Desktop session";
var SESSION_LIST_TRUNCATED_NOTE =
  "(session list too long to fetch completely \u2014 sessions beyond the first pages are missing from this listing)";
//@ chunk-5cp2fssw.js:1033-2116 placement
async function listAllPeers(session, t, credentials) {
  let s = isCrossSessionMessagingEnabled();
  let didFocused = false;
  if (s)
    await primePeerIdentity({
      refresh: true,
      credentials,
    });
  let r = s
    ? fetchBridgePopulation(session, credentials)
    : Promise.resolve({
        rows: [],
        failed: false,
        identityKey: null,
      });
  let resolved = Promise.resolve({
    peers: [],
    warnings: [],
  });
  let localListFailed = false;
  let ownEndpointShadowed = false;
  let [p, g, o, m] = await Promise.all([
    s
      ? listLivePeerSessions().catch((error) => {
          if (error instanceof SessionRecordsUnreadableError) {
            localListFailed = true;
            return [];
          }
          throw error;
        })
      : Promise.resolve([]),
    r,
    searchCloudPeers(session, credentials),
    resolved,
    s && true && isStableAddressEnabled()
      ? isOwnEndpointShadowed().then(
          (d) => {
            ownEndpointShadowed = d;
          },
          () => {},
        )
      : Promise.resolve(),
  ]);
  let mapped = p.map((d) => ({
    transport: "uds",
    address: `uds:${d.sock}`,
    session: d,
  }));
  for (let session of o.sessions) {
    if (hasBridgeSessionId(p, session.id) || isOwnBridgeSession(session.id)) continue;
    mapped.push({
      transport: "cloud",
      address: undefined,
      session,
    });
  }
  let h = excludeKnownPeerSessions(g.rows, p, o.sessions);
  if (!isTransientListingFailure(o.unavailable))
    recordBridgeListing(session, g, livePeerSessionsExcludingKnown(g.rows, o.sessions));
  else forgetBridgeListing(session, g);
  for (let d of h)
    mapped.push({
      transport: "bridge",
      address: `bridge:${d.id}`,
      session: d,
    });
  for (let peer of m.peers)
    mapped.push({
      transport: "did",
      address: peer.did,
      session: peer,
    });
  return {
    peers: mapped,
    didWarnings: m.warnings,
    didFocused,
    bridgeWalkFailed: g.failed || (g.identityKey !== null && !isCurrentBridgeIdentity(g)),
    cloudListFailed: isTransientListingFailure(o.unavailable),
    localListFailed,
    ownEndpointShadowed,
    messagingDisabled: !s,
    listTruncated: o.truncated === true || g.truncated === true,
  };
}
//@ chunk-5cp2fssw.js:2116-2345 placement
/**
 * 本会话名字与地址标记
 */
function getSelfSessionAddress(callerIsSubagent = false) {
  let t = ownMessagingSocket();
  let i = plainSessionName(getRegisteredSessionName()?.name);
  if (!t || i === null) return null;
  return {
    name: i,
    token: `${i} [${addressRef("session", stableAddressWhenEnabled(t))}]`,
    socketToken: `${i} [${addressRef("session", t)}]`,
    sock: t,
    callerIsSubagent,
    nameIsUserChosen: getUserTypedSessionName() !== undefined,
  };
}
//@ chunk-5cp2fssw.js:2345-2925 placement
/**
 * 本会话自我说明
 */
function describeSelfSession(e, t = [], i = false) {
  if (!e) return null;
  let s = sessionAddressFor(e, t, i);
  let n =
    isStableAddressEnabled() && s === e.token
      ? " Session names and [ref]s listed here normally stay the same when a session restarts or is resumed; if one stops resolving, list again."
      : "";
  return e.callerIsSubagent
    ? `This process's main session is ${s} \u2014 the name OTHER sessions use to message it (it is not listed below; from inside this process, address the main conversation as "${MAIN}").${n}`
    : `This session is ${s} \u2014 the name other sessions use to message it (it is not listed below; a message to it would be a message to yourself).${n}`;
}
//@ chunk-5cp2fssw.js:2925-2988 placement
function sessionAddressFor(e, t, i) {
  return isOwnSessionIdAmbiguous(t, e.sock, i) ? e.socketToken : e.token;
}
//@ chunk-5cp2fssw.js:2988-3257 placement
async function buildSubagentExtras(context, callerIsSubagent) {
  let appState = context.getAppState();
  let teamName = getTeamName(appState.teamContext);
  return {
    appState,
    teamFile: teamName ? await readTeamFileAsync(teamName, context.storageV5) : null,
    callerTeammateId:
      context.teammateContext === undefined
        ? undefined
        : context.agentContext?.agentId === context.teammateContext.agentId
          ? context.teammateContext.agentId
          : null,
    self: getSelfSessionAddress(callerIsSubagent),
  };
}
//@ chunk-5cp2fssw.js:3257-5102 placement
/**
 * 生成给模型看的可达代理列表：本会话、子代理、队友、本机与云端其他会话，以及能否用 SendMessage 联系。
 */
function listAgentsForModel(
  e,
  t,
  {
    didWarnings: i = [],
    didFocused: s = false,
    bridgeWalkFailed: n = false,
    cloudListFailed: r = false,
    localListFailed: u = false,
    ownEndpointShadowed: f = false,
    messagingDisabled: c = false,
    listTruncated: p = false,
    callerCanSend: g = true,
  } = {},
) {
  let flattened = e.flatMap((l) => (l.transport === "uds" ? [l.session] : []));
  let flattened_2 = e.flatMap((l) => (l.transport === "cloud" ? [l.session] : []));
  let a = describeAgentAddress(t.appState, {
    teamFile: t.teamFile,
    sessions: flattened,
    cloud: flattened_2,
    bridge: n ? [] : e.flatMap((l) => (l.transport === "bridge" ? [l.session] : [])),
  });
  let h = new Map(a.candidates.map((candidate) => [`${candidate.kind}\x00${candidate.id}`, candidate]));
  let subagents = collectSubagents(t.appState);
  let teammates = collectTeammates(t.appState, t.teamFile, t.callerTeammateId);
  let flattened_3 = e.flatMap((l) => (l.transport === "bridge" ? [l] : []));
  let flattened_4 = e.flatMap((l) => (l.transport === "did" ? [l.session] : []));
  let k = [];
  if (subagents.length > 0) k.push(buildSubagentRows(subagents, h));
  if (teammates.length > 0) k.push(buildTeammateRows(teammates, h));
  if (!s && (flattened.length > 0 || flattened_2.length > 0 || flattened_3.length > 0 || n || r || u || p))
    k.push(buildSessionRows(flattened, h, flattened_2, flattened_3, n, r, u, p));
  let mapped = k.map((l) => l.text);
  let y = {
    sections: k
      .filter((l) => l.rows.length > 0)
      .map((l) => ({
        kind: l.kind,
        total: l.total,
        rows: l.rows.slice(0, MAX_ROW_AGENTS).map((q) => q.agent),
      })),
    notes: k.flatMap((l) => l.notes),
  };
  if (c)
    y.notes.unshift({
      kind: "messaging_disabled",
      text: MESSAGING_DISABLED_NOTE,
    });
  let b = c ? null : describeSelfSession(t.self, flattened, f);
  if (c && mapped.length > 0) mapped.unshift(MESSAGING_DISABLED_NOTE);
  let x = !g && y.sections.length > 0;
  if (x && c) mapped.splice(1, 0, LIST_AGENTS_NOTES);
  let K =
    x && !c
      ? `${LIST_AGENTS_NOTES}

`
      : "";
  if (mapped.length === 0) {
    if (c)
      return {
        listing: MESSAGING_DISABLED_NOTE,
        ...y,
      };
    if (!b)
      return {
        listing: "No reachable agents.",
        ...y,
      };
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
//@ chunk-5cp2fssw.js:5102-5504 placement
/**
 * 收集本会话子代理
 */
function collectSubagents(appState) {
  let t = new Map();
  for (let [n, r] of appState.agentNameRegistry) t.set(r, n);
  let i = new Set(Object.values(appState.teamContext?.teammates ?? {}).map((n) => n.name));
  let s = [];
  for (let task of Object.values(appState.tasks)) {
    if (task.type !== "local_agent" || task.agentType === "main-session") continue;
    let r = t.get(task.id);
    s.push({
      agentId: task.id,
      name: r !== undefined && i.has(r) ? undefined : r,
      agentType: task.agentType,
      status: task.status,
      startTime: task.startTime,
    });
  }
  return s;
}
//@ chunk-5cp2fssw.js:5504-5945 placement
/**
 * 列表中的说明文字
 */
var LIST_AGENTS_NOTES = `None of the agents below can be messaged with ${SENDMESSAGE} from here: it is not among the tools available to you.`;
var MESSAGING_DISABLED_NOTE =
  "Cross-session messaging is switched off in this session right now \u2014 no sessions were listed, and this session is not reachable by name until it is switched back on.";
var LOCAL_LIST_FAILED_NOTE =
  "(the session list on this machine could not be read just now \u2014 other local sessions may be missing from this listing; a later listing retries)";
//@ chunk-5cp2fssw.js:5945-6923 placement
/**
 * 收集队友
 */
function collectTeammates(appState, teamFile, callerTeammateId) {
  let teamContext = appState.teamContext;
  if (!teamContext && !teamFile) return [];
  let n =
    callerTeammateId === null
      ? undefined
      : (callerTeammateId ??
        (teamContext
          ? (teamContext.selfAgentId ??
            (teamContext.isLeader === false ? undefined : teamContext.leadAgentId))
          : getAgentId()));
  let r = new Map();
  for (let task of Object.values(appState.tasks))
    if (task.type === "in_process_teammate") r.set(task.identity.agentId, task.isIdle ? "idle" : task.status);
  let u = [];
  let f = new Set(n !== undefined ? [n] : []);
  let c = new Set();
  for (let key of appState.agentNameRegistry.keys()) c.add(slugifySessionName(key));
  let p = teamLeadAddress(appState);
  let g = (name, agentId) =>
    isLocalTeamLead(
      {
        name,
        agentId,
      },
      p,
    ) || !isReservedOrInvalidName(name);
  for (let [key, value] of Object.entries(teamContext?.teammates ?? {})) {
    if (f.has(key) || !g(value.name, key)) continue;
    f.add(key);
    let a = value.tmuxPaneId === "in-process" || value.tmuxPaneId === "leader";
    u.push({
      teammateId: key,
      name: value.name,
      agentType: value.agentType,
      status: a ? r.get(key) : undefined,
      backend: a ? "in-process" : "pane",
      since: value.spawnedAt,
      nameShadowed: false,
    });
  }
  for (let o of teamFile?.members ?? []) {
    if (f.has(o.agentId) || !g(o.name, o.agentId)) continue;
    f.add(o.agentId);
    u.push({
      teammateId: o.agentId,
      name: o.name,
      agentType: o.agentType,
      status: undefined,
      backend: "roster",
      since: o.joinedAt,
      nameShadowed: peerNameReachability(o.name, appState, c),
    });
  }
  return u;
}
//@ chunk-5cp2fssw.js:6923-7050 placement
function peerNameReachability(name, t, i) {
  let s = normalizeSessionTitle(name) ?? name;
  if (!i.has(slugifySessionName(s))) return false;
  return t.agentNameRegistry.has(name) || s !== name ? "unreachable" : "bare-only";
}
//@ chunk-5cp2fssw.js:7050-7225 placement
/**
 * 多久前加入或启动
 */
function describeSince(e, t) {
  if (
    typeof e.since !== "number" ||
    !Number.isFinite(e.since) ||
    e.since > t ||
    t - e.since > MAX_SINCE_AGE_MS
  )
    return;
  return `${e.backend === "roster" ? "joined" : "started"} ${ProactiveCountdown(t - e.since)} ago`;
}
//@ chunk-5cp2fssw.js:7225-7288 placement
function formatListingText(e, t, i = t.length) {
  return `${e} (${i}):
${t.join(`
`)}`;
}
//@ chunk-5cp2fssw.js:7288-7326 placement
var MAX_AGENT_ROWS = 100;
var MAX_SESSION_ROWS = 100;
var MAX_ROW_AGENTS = 100;
var MAX_SINCE_AGE_MS = 315360000000;
//@ chunk-5cp2fssw.js:7326-7482 placement
/**
 * 面向用户的分区
 */
function formatSectionForUser(e, t, i) {
  let mapped = t.slice(0, MAX_AGENT_ROWS).map(i);
  let n = t.length - mapped.length;
  if (n > 0) mapped.push(`  (\u2026 ${n} more not shown)`);
  return `${e} (${t.length}):
${mapped.join(`
`)}`;
}
//@ chunk-5cp2fssw.js:7482-7661 placement
/**
 * 曾用名说明
 */
function formerNameNote(e, t, i) {
  let s = e.formerNames?.[0];
  if (s === undefined) return;
  let n = t - s.until;
  if (n < 0 || n >= FORMER_NAME_HINT_TTL_MS) return;
  let r = i(s.name);
  return r ? `says it was ${r} until ${ProactiveCountdown(t - s.until)} ago` : undefined;
}
//@ chunk-5cp2fssw.js:7661-7945 placement
/**
 * 一行代理信息
 */
function formatAgentRow(e, t) {
  let i = {
    ...e.shown,
  };
  let s = [e.printed];
  for (let n of t) {
    if (typeof n === "string") {
      s.push(n);
      continue;
    }
    let r = n === undefined ? undefined : "type" in n ? n.type : n.status;
    if (n !== undefined && r !== undefined) {
      i["type" in n ? "type" : "status"] = r;
      s.push(n.text ?? r);
    }
  }
  return {
    agent: i,
    line: `  ${s.join("  \xB7  ")}`,
  };
}
//@ chunk-5cp2fssw.js:7945-8085 placement
function shownNameFields(e, t, printed) {
  if (e)
    return {
      shown: {
        name: e.name,
        ref: e.ref,
      },
      printed: formatNameWithRef(e),
    };
  return t === null
    ? {
        shown: {},
        printed,
      }
    : {
        shown: {
          name: t,
        },
        printed: t,
      };
}
//@ chunk-5cp2fssw.js:8085-8256 placement
/**
 * 组装列表分区
 */
function buildListingSection(kind, t, i, s = i.length) {
  let mapped = i.map((r) => r.line);
  if (s > i.length) mapped.push(`  (\u2026 ${s - i.length} more not shown)`);
  return {
    kind,
    total: s,
    rows: i,
    notes: [],
    text: formatListingText(t, mapped, s),
  };
}
//@ chunk-5cp2fssw.js:8256-8578 placement
/**
 * 子代理行
 */
function buildSubagentRows(subagents, t) {
  let now = Date.now();
  return buildListingSection(
    "subagents",
    "Subagents",
    subagents.map((s) => {
      let n = s.name ? t.get(`subagent\x00${s.agentId}`) : undefined;
      return formatAgentRow(
        n
          ? {
              shown: {
                name: n.name,
                ref: n.ref,
                id: s.agentId,
              },
              printed: formatNameWithRef(n),
            }
          : {
              shown: {
                id: s.agentId,
              },
              printed: s.agentId,
            },
        [
          {
            type: s.agentType,
          },
          {
            status: s.status,
          },
          `started ${ProactiveCountdown(now - s.startTime)} ago`,
        ],
      );
    }),
  );
}
//@ chunk-5cp2fssw.js:8578-9232 placement
/**
 * 队友行
 */
function buildTeammateRows(teammates, t) {
  let now = Date.now();
  let mapped = teammates.slice(0, MAX_AGENT_ROWS).map((n) => {
    let r = n.nameShadowed !== false ? undefined : t.get(`teammate\x00${n.teammateId}`);
    let u = addressableSessionTitle(n.status) ?? undefined;
    return formatAgentRow(shownNameFields(r, addressableSessionTitle(n.name), "(unnamed)"), [
      {
        type: addressableSessionTitle(n.agentType) ?? undefined,
      },
      {
        status: u,
      },
      u !== undefined || n.backend === "in-process" ? undefined : n.backend,
      describeSince(n, now),
      n.nameShadowed === "unreachable"
        ? "not messageable by name while a subagent in this session is registered under that name (the name reaches the subagent)"
        : n.nameShadowed === "bare-only"
          ? "message it by this exact name as printed \u2014 no [ref]: a subagent here is registered under a variant spelling of it"
          : undefined,
    ]);
  });
  return buildListingSection("teammates", "Teammates", mapped, teammates.length);
}
//@ chunk-5cp2fssw.js:9232-11111 placement
/**
 * 其他会话行
 */
function buildSessionRows(e, t, i, s, n, r, u, f) {
  let now = Date.now();
  let p = [
    ...e.map((a) => {
      let h = t.get(`session\x00${a.sock}`);
      let tmux =
        a.tmux !== undefined && /^[^\s/\\\p{Cc}\p{Cf}]{1,64}$/u.test(a.tmux) && !looksLikeAddress(a.tmux)
          ? a.tmux
          : undefined;
      let _ = formerNameNote(a, now, addressableSessionTitle);
      return formatAgentRow(
        shownNameFields(h, addressableSessionTitle(a.name || basename(a.cwd)), "(untitled)"),
        [
          _,
          {
            type: a.kind,
          },
          {
            status: a.status,
          },
          a.hostSessionId === undefined ? undefined : CLAUDE_DESKTOP_SESSION_LABEL,
          tmux === undefined ? undefined : `tmux ${tmux}`,
          `started ${ProactiveCountdown(now - a.startedAt)} ago`,
        ],
      );
    }),
    ...i.map((a) => {
      let h = t.get(`cloud-session\x00${a.id}`);
      let workerStatus = a.offline ? "offline" : a.workerStatus;
      return formatAgentRow(shownNameFields(h, addressableSessionTitle(a.title), "(untitled)"), [
        a.remoteControl
          ? {
              type: "remote_control",
              text: REMOTE_CONTROL_LABEL,
            }
          : {
              type: "cloud",
              text: "cloud session",
            },
        {
          status: workerStatus,
          text: describeRemoteStatus(workerStatus, workerStatus),
        },
        a.lastActive === undefined ? undefined : `active ${ProactiveCountdown(now - a.lastActive)} ago`,
        a.unreachableFromHere ? unreachableFromCloudText() : undefined,
        a.acceptsPeerMessages === false ? CANNOT_RECEIVE_REASON : undefined,
      ]);
    }),
    ...s.slice(0, MAX_SESSION_ROWS).map(({ session }) => {
      let h = t.get(`bridge-session\x00${session.id}`);
      return formatAgentRow(shownNameFields(h, addressableSessionTitle(session.title), "(untitled)"), [
        {
          type: hasEnvironmentKindOtherThanBridge(session) ? "cloud" : "remote_control",
          text: sessionKindLabel(session),
        },
        {
          status: isDisconnectedNonBridge(session) ? "offline" : session.status,
          text: describeSessionStatus(session, session.status),
        },
        session.acceptsPeerMessages === false ? CANNOT_RECEIVE_REASON : undefined,
      ]);
    }),
  ];
  let listingSection = buildListingSection(
    "sessions",
    "Peer sessions",
    p,
    p.length + Math.max(0, s.length - MAX_SESSION_ROWS),
  );
  let o = [];
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
  if (u)
    o.push({
      kind: "local_list_failed",
      text: LOCAL_LIST_FAILED_NOTE,
    });
  if (f)
    o.push({
      kind: "list_truncated",
      text: SESSION_LIST_TRUNCATED_NOTE,
    });
  if (o.length === 0) return listingSection;
  let joined = o.map((a) => a.text).join(`
  `);
  return {
    ...listingSection,
    notes: o,
    text:
      p.length > 0
        ? `${listingSection.text}
  ${joined}`
        : joined,
  };
}
//@ chunk-5cp2fssw.js:11111-12839 placement
function formatForUser(
  e,
  subagentExtras,
  {
    bridgeWalkFailed: i = false,
    cloudListFailed: s = false,
    localListFailed: n = false,
    ownEndpointShadowed: r = false,
    messagingDisabled: u = false,
    listTruncated: f = false,
    omitDirectories: c = false,
  } = {},
) {
  let subagents = collectSubagents(subagentExtras.appState);
  let teammates = collectTeammates(
    subagentExtras.appState,
    subagentExtras.teamFile,
    subagentExtras.callerTeammateId,
  );
  let o = [];
  if (subagents.length > 0) o.push(formatSubagentsForUser(subagents));
  if (teammates.length > 0) o.push(formatTeammatesForUser(teammates));
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
  let flattened = e.flatMap((h) => (h.transport === "uds" ? [h.session] : []));
  let a =
    u || !subagentExtras.self || (c && !subagentExtras.self.nameIsUserChosen)
      ? null
      : subagentExtras.self.callerIsSubagent
        ? `This process's main session: ${sessionAddressFor(subagentExtras.self, flattened, r)} (the name OTHER sessions use for it; from inside this process, address it as "${MAIN}")`
        : `This session: ${sessionAddressFor(subagentExtras.self, flattened, r)} (the name other sessions use to message it)`;
  if (c && o.length > 0)
    o.push(
      "(session names and directories not chosen by a human are withheld on this connection \u2014 /rename a session on its own machine to give it an addressable name here)",
    );
  if (u && o.length > 0) o.unshift(MESSAGING_DISABLED_NOTE);
  if (o.length === 0) {
    if (u) return MESSAGING_DISABLED_NOTE;
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
//@ chunk-5cp2fssw.js:12839-13041 placement
/**
 * 面向用户的子代理列表
 */
function formatSubagentsForUser(subagents) {
  let now = Date.now();
  return formatListingText(
    "Subagents",
    subagents.map((i) => {
      let s = i.name ? `${i.name}  \xB7  ${i.agentType}` : i.agentType;
      return `  [${i.status}]  \xB7  ${s}  \xB7  started ${ProactiveCountdown(now - i.startTime)} ago`;
    }),
  );
}
//@ chunk-5cp2fssw.js:13041-13426 placement
/**
 * 面向用户的队友列表
 */
function formatTeammatesForUser(teammates) {
  let now = Date.now();
  return formatSectionForUser("Teammates", teammates, (i) => {
    let s = addressableSessionTitle(i.name) ?? "(unnamed)";
    let n = addressableSessionTitle(i.agentType);
    let r = n ? `${s}  \xB7  ${n}` : s;
    let u = describeSince(i, now);
    let f =
      i.nameShadowed === "unreachable"
        ? "  \xB7  name held by a subagent here"
        : i.nameShadowed === "bare-only"
          ? "  \xB7  exact name only (a subagent holds a variant)"
          : "";
    return `  [${addressableSessionTitle(i.status) ?? i.backend}]  \xB7  ${r}${u ? `  \xB7  ${u}` : ""}${f}`;
  });
}
//@ chunk-5cp2fssw.js:13426-13494 placement
function describeRemoteStatus(e, t) {
  return e === "requires_action" ? "waiting on a human" : t;
}
//@ chunk-5cp2fssw.js:13494-13567 placement
function describeSessionStatus(session, t) {
  if (hasEnvironmentKindOtherThanBridge(session)) return describeRemoteStatus(session.status, t);
  return isDisconnectedNonBridge(session) ? "offline" : t;
}
//@ chunk-5cp2fssw.js:13567-13656 placement
function getSessionDisplayTitle(e) {
  if (!e) return;
  let t = normalizeSessionTitle(e);
  return t === null || t === "untitled session" ? undefined : t;
}
//@ chunk-5cp2fssw.js:13656-14565 placement
function buildOtherSessionsSection(e, t = false) {
  let now = Date.now();
  return formatListingText(
    "Other Claude sessions",
    e.map((s) => {
      switch (s.transport) {
        case "uds": {
          let session = s.session;
          let r = t && session.nameSource !== "user" ? undefined : getSessionDisplayTitle(session.name);
          let u = t ? undefined : (getSessionDisplayTitle(session.cwd) ?? "(unknown directory)");
          let f = t ? undefined : formerNameNote(session, now, getSessionDisplayTitle);
          let c = [r, f, u].filter(Boolean).join("  \xB7  ") || "(unnamed session)";
          let p = session.hostSessionId === undefined ? "" : `  \xB7  ${CLAUDE_DESKTOP_SESSION_LABEL}`;
          return `  [${getSessionDisplayTitle(session.status) ?? "unknown"}]  \xB7  ${c}${p}  \xB7  started ${ProactiveCountdown(now - session.startedAt)} ago`;
        }
        case "cloud": {
          let session = s.session;
          return `  [${session.offline ? "offline" : describeRemoteStatus(session.workerStatus, session.workerStatus ?? "unknown")}]  \xB7  ${getSessionDisplayTitle(session.title) ?? "(untitled)"}  \xB7  ${session.remoteControl ? REMOTE_CONTROL_LABEL : "cloud"}${session.unreachableFromHere ? `  \xB7  ${unreachableFromCloudText()}` : ""}${session.acceptsPeerMessages === false ? `  \xB7  ${CANNOT_RECEIVE_REASON}` : ""}`;
        }
        case "bridge": {
          let session = s.session;
          return `  [${describeSessionStatus(session, getSessionDisplayTitle(session.status) ?? "unknown")}]  \xB7  ${getSessionDisplayTitle(session.title) ?? "(untitled)"}  \xB7  ${sessionKindLabel(session)}${session.acceptsPeerMessages === false ? `  \xB7  ${CANNOT_RECEIVE_REASON}` : ""}`;
        }
        case "did":
          return "";
      }
    }),
  );
}
export { listAllPeers, buildSubagentExtras, formatForUser };
