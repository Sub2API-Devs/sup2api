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
async function listAllPeers(session, context, options) {
  let messagingEnabled = isCrossSessionMessagingEnabled();
  let didFocused = false;
  if (messagingEnabled)
    await primePeerIdentity({
      refresh: true,
      credentials: options,
    });
  let bridgePromise = messagingEnabled
    ? fetchBridgePopulation(session, options)
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
  let [localSessions, bridgeResult, cloudResult, didResult] = await Promise.all([
    messagingEnabled
      ? listLivePeerSessions().catch((error) => {
          if (error instanceof SessionRecordsUnreadableError) {
            localListFailed = true;
            return [];
          }
          throw error;
        })
      : Promise.resolve([]),
    bridgePromise,
    searchCloudPeers(session, options),
    resolved,
    messagingEnabled && true && isStableAddressEnabled()
      ? isOwnEndpointShadowed().then(
          (shadowed) => {
            ownEndpointShadowed = shadowed;
          },
          () => {},
        )
      : Promise.resolve(),
  ]);
  let mapped = localSessions.map((localSession) => ({
    transport: "uds",
    address: `uds:${localSession.sock}`,
    session: localSession,
  }));
  for (let session of cloudResult.sessions) {
    if (hasBridgeSessionId(localSessions, session.id) || isOwnBridgeSession(session.id)) continue;
    mapped.push({
      transport: "cloud",
      address: undefined,
      session,
    });
  }
  let bridgeOnlyRows = excludeKnownPeerSessions(bridgeResult.rows, localSessions, cloudResult.sessions);
  if (!isTransientListingFailure(cloudResult.unavailable))
    recordBridgeListing(
      session,
      bridgeResult,
      livePeerSessionsExcludingKnown(bridgeResult.rows, cloudResult.sessions),
    );
  else forgetBridgeListing(session, bridgeResult);
  for (let bridgeRow of bridgeOnlyRows)
    mapped.push({
      transport: "bridge",
      address: `bridge:${bridgeRow.id}`,
      session: bridgeRow,
    });
  for (let peer of didResult.peers)
    mapped.push({
      transport: "did",
      address: peer.did,
      session: peer,
    });
  return {
    peers: mapped,
    didWarnings: didResult.warnings,
    didFocused,
    bridgeWalkFailed:
      bridgeResult.failed || (bridgeResult.identityKey !== null && !isCurrentBridgeIdentity(bridgeResult)),
    cloudListFailed: isTransientListingFailure(cloudResult.unavailable),
    localListFailed,
    ownEndpointShadowed,
    messagingDisabled: !messagingEnabled,
    listTruncated: cloudResult.truncated === true || bridgeResult.truncated === true,
  };
}
//@ chunk-5cp2fssw.js:2116-2345 placement
/**
 * 本会话名字与地址标记
 */
function getSelfSessionAddress(callerIsSubagent = false) {
  let socket = ownMessagingSocket();
  let sessionName = plainSessionName(getRegisteredSessionName()?.name);
  if (!socket || sessionName === null) return null;
  return {
    name: sessionName,
    token: `${sessionName} [${addressRef("session", stableAddressWhenEnabled(socket))}]`,
    socketToken: `${sessionName} [${addressRef("session", socket)}]`,
    sock: socket,
    callerIsSubagent,
    nameIsUserChosen: getUserTypedSessionName() !== undefined,
  };
}
//@ chunk-5cp2fssw.js:2345-2925 placement
/**
 * 本会话自我说明
 */
function describeSelfSession(session, localSessions = [], shadowed = false) {
  if (!session) return null;
  let address = sessionAddressFor(session, localSessions, shadowed);
  let stableAddressNote =
    isStableAddressEnabled() && address === session.token
      ? " Session names and [ref]s listed here normally stay the same when a session restarts or is resumed; if one stops resolving, list again."
      : "";
  return session.callerIsSubagent
    ? `This process's main session is ${address} \u2014 the name OTHER sessions use to message it (it is not listed below; from inside this process, address the main conversation as "${MAIN}").${stableAddressNote}`
    : `This session is ${address} \u2014 the name other sessions use to message it (it is not listed below; a message to it would be a message to yourself).${stableAddressNote}`;
}
//@ chunk-5cp2fssw.js:2925-2988 placement
function sessionAddressFor(session, localSessions, shadowed) {
  return isOwnSessionIdAmbiguous(localSessions, session.sock, shadowed) ? session.socketToken : session.token;
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
  peers,
  context,
  {
    didWarnings = [],
    didFocused = false,
    bridgeWalkFailed = false,
    cloudListFailed = false,
    localListFailed = false,
    ownEndpointShadowed = false,
    messagingDisabled = false,
    listTruncated = false,
    callerCanSend = true,
  } = {},
) {
  let localSessions = peers.flatMap((peer) => (peer.transport === "uds" ? [peer.session] : []));
  let cloudSessions = peers.flatMap((peer) => (peer.transport === "cloud" ? [peer.session] : []));
  let roster = describeAgentAddress(context.appState, {
    teamFile: context.teamFile,
    sessions: localSessions,
    cloud: cloudSessions,
    bridge: bridgeWalkFailed
      ? []
      : peers.flatMap((peer) => (peer.transport === "bridge" ? [peer.session] : [])),
  });
  let candidateByKey = new Map(
    roster.candidates.map((candidate) => [`${candidate.kind}\x00${candidate.id}`, candidate]),
  );
  let subagents = collectSubagents(context.appState);
  let teammates = collectTeammates(context.appState, context.teamFile, context.callerTeammateId);
  let bridgePeers = peers.flatMap((peer) => (peer.transport === "bridge" ? [peer] : []));
  let flattened = peers.flatMap((peer) => (peer.transport === "did" ? [peer.session] : []));
  let sections = [];
  if (subagents.length > 0) sections.push(buildSubagentRows(subagents, candidateByKey));
  if (teammates.length > 0) sections.push(buildTeammateRows(teammates, candidateByKey));
  if (
    !didFocused &&
    (localSessions.length > 0 ||
      cloudSessions.length > 0 ||
      bridgePeers.length > 0 ||
      bridgeWalkFailed ||
      cloudListFailed ||
      localListFailed ||
      listTruncated)
  )
    sections.push(
      buildSessionRows(
        localSessions,
        candidateByKey,
        cloudSessions,
        bridgePeers,
        bridgeWalkFailed,
        cloudListFailed,
        localListFailed,
        listTruncated,
      ),
    );
  let mapped = sections.map((section) => section.text);
  let structured = {
    sections: sections
      .filter((section) => section.rows.length > 0)
      .map((section) => ({
        kind: section.kind,
        total: section.total,
        rows: section.rows.slice(0, MAX_ROW_AGENTS).map((row) => row.agent),
      })),
    notes: sections.flatMap((section) => section.notes),
  };
  if (messagingDisabled)
    structured.notes.unshift({
      kind: "messaging_disabled",
      text: MESSAGING_DISABLED_NOTE,
    });
  let selfDescription = messagingDisabled
    ? null
    : describeSelfSession(context.self, localSessions, ownEndpointShadowed);
  if (messagingDisabled && mapped.length > 0) mapped.unshift(MESSAGING_DISABLED_NOTE);
  let needsCallerNote = !callerCanSend && structured.sections.length > 0;
  if (needsCallerNote && messagingDisabled) mapped.splice(1, 0, LIST_AGENTS_NOTES);
  let callerNotePrefix =
    needsCallerNote && !messagingDisabled
      ? `${LIST_AGENTS_NOTES}

`
      : "";
  if (mapped.length === 0) {
    if (messagingDisabled)
      return {
        listing: MESSAGING_DISABLED_NOTE,
        ...structured,
      };
    if (!selfDescription)
      return {
        listing: "No reachable agents.",
        ...structured,
      };
    if (!callerCanSend)
      return {
        listing:
          !didFocused && !bridgeWalkFailed
            ? `${selfDescription}

No reachable agents \u2014 no other Claude session is running on this machine right now.`
            : `${selfDescription}

No other session appears in this listing right now.`,
        ...structured,
      };
    return {
      listing:
        !didFocused && !bridgeWalkFailed
          ? `${selfDescription}

No reachable agents \u2014 no other Claude session is running on this machine right now (peer messaging itself is available; a session appears here once it is started).`
          : `${selfDescription}

No other session appears in this listing right now (peer messaging itself is available).`,
      ...structured,
    };
  }
  return {
    listing: `${callerNotePrefix}${
      selfDescription
        ? `${selfDescription}

${mapped.join(`

`)}`
        : mapped.join(`

`)
    }`,
    ...structured,
  };
}
//@ chunk-5cp2fssw.js:5102-5504 placement
/**
 * 收集本会话子代理
 */
function collectSubagents(appState) {
  let nameById = new Map();
  for (let [agentId, name] of appState.agentNameRegistry) nameById.set(name, agentId);
  let teammateNames = new Set(
    Object.values(appState.teamContext?.teammates ?? {}).map((teammate) => teammate.name),
  );
  let subagents = [];
  for (let task of Object.values(appState.tasks)) {
    if (task.type !== "local_agent" || task.agentType === "main-session") continue;
    let registeredName = nameById.get(task.id);
    subagents.push({
      agentId: task.id,
      name: registeredName !== undefined && teammateNames.has(registeredName) ? undefined : registeredName,
      agentType: task.agentType,
      status: task.status,
      startTime: task.startTime,
    });
  }
  return subagents;
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
  let selfId =
    callerTeammateId === null
      ? undefined
      : (callerTeammateId ??
        (teamContext
          ? (teamContext.selfAgentId ??
            (teamContext.isLeader === false ? undefined : teamContext.leadAgentId))
          : getAgentId()));
  let inProcessStatus = new Map();
  for (let task of Object.values(appState.tasks))
    if (task.type === "in_process_teammate")
      inProcessStatus.set(task.identity.agentId, task.isIdle ? "idle" : task.status);
  let teammatesList = [];
  let seen = new Set(selfId !== undefined ? [selfId] : []);
  let reservedSlugs = new Set();
  for (let key of appState.agentNameRegistry.keys()) reservedSlugs.add(slugifySessionName(key));
  let leadAddress = teamLeadAddress(appState);
  let isListable = (name, agentId) =>
    isLocalTeamLead(
      {
        name,
        agentId,
      },
      leadAddress,
    ) || !isReservedOrInvalidName(name);
  for (let [key, value] of Object.entries(teamContext?.teammates ?? {})) {
    if (seen.has(key) || !isListable(value.name, key)) continue;
    seen.add(key);
    let isInProcess = value.tmuxPaneId === "in-process" || value.tmuxPaneId === "leader";
    teammatesList.push({
      teammateId: key,
      name: value.name,
      agentType: value.agentType,
      status: isInProcess ? inProcessStatus.get(key) : undefined,
      backend: isInProcess ? "in-process" : "pane",
      since: value.spawnedAt,
      nameShadowed: false,
    });
  }
  for (let member of teamFile?.members ?? []) {
    if (seen.has(member.agentId) || !isListable(member.name, member.agentId)) continue;
    seen.add(member.agentId);
    teammatesList.push({
      teammateId: member.agentId,
      name: member.name,
      agentType: member.agentType,
      status: undefined,
      backend: "roster",
      since: member.joinedAt,
      nameShadowed: peerNameReachability(member.name, appState, reservedSlugs),
    });
  }
  return teammatesList;
}
//@ chunk-5cp2fssw.js:6923-7050 placement
function peerNameReachability(name, appState, reservedSlugs) {
  let normalizedName = normalizeSessionTitle(name) ?? name;
  if (!reservedSlugs.has(slugifySessionName(normalizedName))) return false;
  return appState.agentNameRegistry.has(name) || normalizedName !== name ? "unreachable" : "bare-only";
}
//@ chunk-5cp2fssw.js:7050-7225 placement
/**
 * 多久前加入或启动
 */
function describeSince(entry, now) {
  if (
    typeof entry.since !== "number" ||
    !Number.isFinite(entry.since) ||
    entry.since > now ||
    now - entry.since > MAX_SINCE_AGE_MS
  )
    return;
  return `${entry.backend === "roster" ? "joined" : "started"} ${ProactiveCountdown(now - entry.since)} ago`;
}
//@ chunk-5cp2fssw.js:7225-7288 placement
function formatListingText(title, lines, total = lines.length) {
  return `${title} (${total}):
${lines.join(`
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
function formatSectionForUser(title, entries, format) {
  let mapped = entries.slice(0, MAX_AGENT_ROWS).map(format);
  let remaining = entries.length - mapped.length;
  if (remaining > 0) mapped.push(`  (\u2026 ${remaining} more not shown)`);
  return `${title} (${entries.length}):
${mapped.join(`
`)}`;
}
//@ chunk-5cp2fssw.js:7482-7661 placement
/**
 * 曾用名说明
 */
function formerNameNote(entry, now, formatName) {
  let formerName = entry.formerNames?.[0];
  if (formerName === undefined) return;
  let age = now - formerName.until;
  if (age < 0 || age >= FORMER_NAME_HINT_TTL_MS) return;
  let formattedName = formatName(formerName.name);
  return formattedName
    ? `says it was ${formattedName} until ${ProactiveCountdown(now - formerName.until)} ago`
    : undefined;
}
//@ chunk-5cp2fssw.js:7661-7945 placement
/**
 * 一行代理信息
 */
function formatAgentRow(row, extras) {
  let agent = {
    ...row.shown,
  };
  let lineParts = [row.printed];
  for (let extra of extras) {
    if (typeof extra === "string") {
      lineParts.push(extra);
      continue;
    }
    let statusValue = extra === undefined ? undefined : "type" in extra ? extra.type : extra.status;
    if (extra !== undefined && statusValue !== undefined) {
      agent["type" in extra ? "type" : "status"] = statusValue;
      lineParts.push(extra.text ?? statusValue);
    }
  }
  return {
    agent,
    line: `  ${lineParts.join("  \xB7  ")}`,
  };
}
//@ chunk-5cp2fssw.js:7945-8085 placement
function shownNameFields(candidate, fallbackName, printed) {
  if (candidate)
    return {
      shown: {
        name: candidate.name,
        ref: candidate.ref,
      },
      printed: formatNameWithRef(candidate),
    };
  return fallbackName === null
    ? {
        shown: {},
        printed,
      }
    : {
        shown: {
          name: fallbackName,
        },
        printed: fallbackName,
      };
}
//@ chunk-5cp2fssw.js:8085-8256 placement
/**
 * 组装列表分区
 */
function buildListingSection(kind, title, rows, total = rows.length) {
  let lines = rows.map((row) => row.line);
  if (total > rows.length) lines.push(`  (\u2026 ${total - rows.length} more not shown)`);
  return {
    kind,
    total,
    rows,
    notes: [],
    text: formatListingText(title, lines, total),
  };
}
//@ chunk-5cp2fssw.js:8256-8578 placement
/**
 * 子代理行
 */
function buildSubagentRows(subagents, candidateByKey) {
  let now = Date.now();
  return buildListingSection(
    "subagents",
    "Subagents",
    subagents.map((subagent) => {
      let candidate = subagent.name ? candidateByKey.get(`subagent\x00${subagent.agentId}`) : undefined;
      return formatAgentRow(
        candidate
          ? {
              shown: {
                name: candidate.name,
                ref: candidate.ref,
                id: subagent.agentId,
              },
              printed: formatNameWithRef(candidate),
            }
          : {
              shown: {
                id: subagent.agentId,
              },
              printed: subagent.agentId,
            },
        [
          {
            type: subagent.agentType,
          },
          {
            status: subagent.status,
          },
          `started ${ProactiveCountdown(now - subagent.startTime)} ago`,
        ],
      );
    }),
  );
}
//@ chunk-5cp2fssw.js:8578-9232 placement
/**
 * 队友行
 */
function buildTeammateRows(teammates, candidateByKey) {
  let now = Date.now();
  let rows = teammates.slice(0, MAX_AGENT_ROWS).map((teammate) => {
    let candidate =
      teammate.nameShadowed !== false ? undefined : candidateByKey.get(`teammate\x00${teammate.teammateId}`);
    let statusLabel = addressableSessionTitle(teammate.status) ?? undefined;
    return formatAgentRow(shownNameFields(candidate, addressableSessionTitle(teammate.name), "(unnamed)"), [
      {
        type: addressableSessionTitle(teammate.agentType) ?? undefined,
      },
      {
        status: statusLabel,
      },
      statusLabel !== undefined || teammate.backend === "in-process" ? undefined : teammate.backend,
      describeSince(teammate, now),
      teammate.nameShadowed === "unreachable"
        ? "not messageable by name while a subagent in this session is registered under that name (the name reaches the subagent)"
        : teammate.nameShadowed === "bare-only"
          ? "message it by this exact name as printed \u2014 no [ref]: a subagent here is registered under a variant spelling of it"
          : undefined,
    ]);
  });
  return buildListingSection("teammates", "Teammates", rows, teammates.length);
}
//@ chunk-5cp2fssw.js:9232-11111 placement
/**
 * 其他会话行
 */
function buildSessionRows(
  localSessions,
  candidateByKey,
  cloudSessions,
  bridgePeers,
  bridgeWalkFailed,
  cloudListFailed,
  localListFailed,
  listTruncated,
) {
  let now = Date.now();
  let rows = [
    ...localSessions.map((localSession) => {
      let candidate = candidateByKey.get(`session\x00${localSession.sock}`);
      let tmux =
        localSession.tmux !== undefined &&
        /^[^\s/\\\p{Cc}\p{Cf}]{1,64}$/u.test(localSession.tmux) &&
        !looksLikeAddress(localSession.tmux)
          ? localSession.tmux
          : undefined;
      let formerNote = formerNameNote(localSession, now, addressableSessionTitle);
      return formatAgentRow(
        shownNameFields(
          candidate,
          addressableSessionTitle(localSession.name || basename(localSession.cwd)),
          "(untitled)",
        ),
        [
          formerNote,
          {
            type: localSession.kind,
          },
          {
            status: localSession.status,
          },
          localSession.hostSessionId === undefined ? undefined : CLAUDE_DESKTOP_SESSION_LABEL,
          tmux === undefined ? undefined : `tmux ${tmux}`,
          `started ${ProactiveCountdown(now - localSession.startedAt)} ago`,
        ],
      );
    }),
    ...cloudSessions.map((cloudSession) => {
      let candidate = candidateByKey.get(`cloud-session\x00${cloudSession.id}`);
      let workerStatus = cloudSession.offline ? "offline" : cloudSession.workerStatus;
      return formatAgentRow(
        shownNameFields(candidate, addressableSessionTitle(cloudSession.title), "(untitled)"),
        [
          cloudSession.remoteControl
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
          cloudSession.lastActive === undefined
            ? undefined
            : `active ${ProactiveCountdown(now - cloudSession.lastActive)} ago`,
          cloudSession.unreachableFromHere ? unreachableFromCloudText() : undefined,
          cloudSession.acceptsPeerMessages === false ? CANNOT_RECEIVE_REASON : undefined,
        ],
      );
    }),
    ...bridgePeers.slice(0, MAX_SESSION_ROWS).map(({ session }) => {
      let candidate = candidateByKey.get(`bridge-session\x00${session.id}`);
      return formatAgentRow(
        shownNameFields(candidate, addressableSessionTitle(session.title), "(untitled)"),
        [
          {
            type: hasEnvironmentKindOtherThanBridge(session) ? "cloud" : "remote_control",
            text: sessionKindLabel(session),
          },
          {
            status: isDisconnectedNonBridge(session) ? "offline" : session.status,
            text: describeSessionStatus(session, session.status),
          },
          session.acceptsPeerMessages === false ? CANNOT_RECEIVE_REASON : undefined,
        ],
      );
    }),
  ];
  let listingSection = buildListingSection(
    "sessions",
    "Peer sessions",
    rows,
    rows.length + Math.max(0, bridgePeers.length - MAX_SESSION_ROWS),
  );
  let notes = [];
  if (bridgeWalkFailed)
    notes.push({
      kind: "account_list_failed",
      text:
        bridgePeers.length > 0
          ? "(account session list incomplete just now \u2014 those rows carry no [ref] and are not messageable by name until a later listing completes)"
          : "(the Remote Control session list for your account did not complete just now \u2014 Remote Control sessions on other machines may be missing from this listing; a later listing retries)",
    });
  if (cloudListFailed)
    notes.push({
      kind: "cloud_list_failed",
      text: "(cloud session list could not be fetched just now \u2014 cloud sessions are missing from this listing; a later listing retries)",
    });
  if (localListFailed)
    notes.push({
      kind: "local_list_failed",
      text: LOCAL_LIST_FAILED_NOTE,
    });
  if (listTruncated)
    notes.push({
      kind: "list_truncated",
      text: SESSION_LIST_TRUNCATED_NOTE,
    });
  if (notes.length === 0) return listingSection;
  let joined = notes.map((note) => note.text).join(`
  `);
  return {
    ...listingSection,
    notes,
    text:
      rows.length > 0
        ? `${listingSection.text}
  ${joined}`
        : joined,
  };
}
//@ chunk-5cp2fssw.js:11111-12839 placement
function formatForUser(
  peers,
  subagentExtras,
  {
    bridgeWalkFailed = false,
    cloudListFailed = false,
    localListFailed = false,
    ownEndpointShadowed = false,
    messagingDisabled = false,
    listTruncated = false,
    omitDirectories = false,
  } = {},
) {
  let subagents = collectSubagents(subagentExtras.appState);
  let teammates = collectTeammates(
    subagentExtras.appState,
    subagentExtras.teamFile,
    subagentExtras.callerTeammateId,
  );
  let parts = [];
  if (subagents.length > 0) parts.push(formatSubagentsForUser(subagents));
  if (teammates.length > 0) parts.push(formatTeammatesForUser(teammates));
  if (peers.length > 0) parts.push(buildOtherSessionsSection(peers, omitDirectories));
  if (cloudListFailed)
    parts.push(
      "(cloud session list could not be fetched just now \u2014 cloud sessions are missing from this listing; try /list-agents again shortly)",
    );
  if (localListFailed)
    parts.push(
      "(the session list on this machine could not be read just now \u2014 other local sessions may be missing from this listing; try /list-agents again shortly)",
    );
  if (bridgeWalkFailed)
    parts.push(
      "(the Remote Control session list for your account did not complete just now \u2014 Remote Control sessions on other machines may be missing from this listing; try /list-agents again shortly)",
    );
  if (listTruncated) parts.push(SESSION_LIST_TRUNCATED_NOTE);
  let localSessions = peers.flatMap((peer) => (peer.transport === "uds" ? [peer.session] : []));
  let selfText =
    messagingDisabled || !subagentExtras.self || (omitDirectories && !subagentExtras.self.nameIsUserChosen)
      ? null
      : subagentExtras.self.callerIsSubagent
        ? `This process's main session: ${sessionAddressFor(subagentExtras.self, localSessions, ownEndpointShadowed)} (the name OTHER sessions use for it; from inside this process, address it as "${MAIN}")`
        : `This session: ${sessionAddressFor(subagentExtras.self, localSessions, ownEndpointShadowed)} (the name other sessions use to message it)`;
  if (omitDirectories && parts.length > 0)
    parts.push(
      "(session names and directories not chosen by a human are withheld on this connection \u2014 /rename a session on its own machine to give it an addressable name here)",
    );
  if (messagingDisabled && parts.length > 0) parts.unshift(MESSAGING_DISABLED_NOTE);
  if (parts.length === 0) {
    if (messagingDisabled) return MESSAGING_DISABLED_NOTE;
    return selfText
      ? `${selfText}

No subagents, teammates or other Claude sessions \u2014 no other session is running on this machine right now; peer messaging itself is available.`
      : "No subagents, teammates or other Claude sessions.";
  }
  return selfText
    ? `${selfText}

${parts.join(`

`)}`
    : parts.join(`

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
    subagents.map((subagent) => {
      let label = subagent.name ? `${subagent.name}  \xB7  ${subagent.agentType}` : subagent.agentType;
      return `  [${subagent.status}]  \xB7  ${label}  \xB7  started ${ProactiveCountdown(now - subagent.startTime)} ago`;
    }),
  );
}
//@ chunk-5cp2fssw.js:13041-13426 placement
/**
 * 面向用户的队友列表
 */
function formatTeammatesForUser(entries) {
  let now = Date.now();
  return formatSectionForUser("Teammates", entries, (teammate) => {
    let nameLabel = addressableSessionTitle(teammate.name) ?? "(unnamed)";
    let agentTypeLabel = addressableSessionTitle(teammate.agentType);
    let label = agentTypeLabel ? `${nameLabel}  \xB7  ${agentTypeLabel}` : nameLabel;
    let sinceText = describeSince(teammate, now);
    let shadowNote =
      teammate.nameShadowed === "unreachable"
        ? "  \xB7  name held by a subagent here"
        : teammate.nameShadowed === "bare-only"
          ? "  \xB7  exact name only (a subagent holds a variant)"
          : "";
    return `  [${addressableSessionTitle(teammate.status) ?? teammate.backend}]  \xB7  ${label}${sinceText ? `  \xB7  ${sinceText}` : ""}${shadowNote}`;
  });
}
//@ chunk-5cp2fssw.js:13426-13494 placement
function describeRemoteStatus(remoteStatus, fallbackStatus) {
  return remoteStatus === "requires_action" ? "waiting on a human" : fallbackStatus;
}
//@ chunk-5cp2fssw.js:13494-13567 placement
function describeSessionStatus(bridge, fallbackStatus) {
  if (hasEnvironmentKindOtherThanBridge(bridge)) return describeRemoteStatus(bridge.status, fallbackStatus);
  return isDisconnectedNonBridge(bridge) ? "offline" : fallbackStatus;
}
//@ chunk-5cp2fssw.js:13567-13656 placement
function getSessionDisplayTitle(rawTitle) {
  if (!rawTitle) return;
  let normalizedTitle = normalizeSessionTitle(rawTitle);
  return normalizedTitle === null || normalizedTitle === "untitled session" ? undefined : normalizedTitle;
}
//@ chunk-5cp2fssw.js:13656-14565 placement
function buildOtherSessionsSection(peers, omitDirectories = false) {
  let now = Date.now();
  return formatListingText(
    "Other Claude sessions",
    peers.map((peer) => {
      switch (peer.transport) {
        case "uds": {
          let session = peer.session;
          let nameLabel =
            omitDirectories && session.nameSource !== "user"
              ? undefined
              : getSessionDisplayTitle(session.name);
          let dirLabel = omitDirectories
            ? undefined
            : (getSessionDisplayTitle(session.cwd) ?? "(unknown directory)");
          let formerNote = omitDirectories ? undefined : formerNameNote(session, now, getSessionDisplayTitle);
          let description =
            [nameLabel, formerNote, dirLabel].filter(Boolean).join("  \xB7  ") || "(unnamed session)";
          let desktopSuffix =
            session.hostSessionId === undefined ? "" : `  \xB7  ${CLAUDE_DESKTOP_SESSION_LABEL}`;
          return `  [${getSessionDisplayTitle(session.status) ?? "unknown"}]  \xB7  ${description}${desktopSuffix}  \xB7  started ${ProactiveCountdown(now - session.startedAt)} ago`;
        }
        case "cloud": {
          let session = peer.session;
          return `  [${session.offline ? "offline" : describeRemoteStatus(session.workerStatus, session.workerStatus ?? "unknown")}]  \xB7  ${getSessionDisplayTitle(session.title) ?? "(untitled)"}  \xB7  ${session.remoteControl ? REMOTE_CONTROL_LABEL : "cloud"}${session.unreachableFromHere ? `  \xB7  ${unreachableFromCloudText()}` : ""}${session.acceptsPeerMessages === false ? `  \xB7  ${CANNOT_RECEIVE_REASON}` : ""}`;
        }
        case "bridge": {
          let session = peer.session;
          return `  [${describeSessionStatus(session, getSessionDisplayTitle(session.status) ?? "unknown")}]  \xB7  ${getSessionDisplayTitle(session.title) ?? "(untitled)"}  \xB7  ${sessionKindLabel(session)}${session.acceptsPeerMessages === false ? `  \xB7  ${CANNOT_RECEIVE_REASON}` : ""}`;
        }
        case "did":
          return "";
      }
    }),
  );
}
export { listAllPeers, buildSubagentExtras, formatForUser, listAgentsForModel };
