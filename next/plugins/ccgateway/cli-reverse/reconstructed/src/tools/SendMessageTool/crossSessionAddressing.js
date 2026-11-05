/**
 * tools/SendMessageTool/crossSessionAddressing.ts
 *
 * 2.1.316 新增：跨会话消息寻址
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-k7agbjgj.js (47)
 * attribution: placement 47
 */
import { getAPIProvider } from "../../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isAsyncSnowglobeOn } from "../../utils/settings/settingsSourceTrust.js";
import {
  slugifySessionName,
  isStableSessionAddress,
  stableSessionAddress,
  addressRef,
  looksLikeAddress,
  parseNameWithRef,
  addressableTeamMembers,
  teamLeadAddress,
  isLocalTeamLead,
  isReservedOrInvalidName,
  describeAgentAddress,
  bridgeSessionIds,
  isReservedSessionName,
  findSessionByName,
  resolveUniqueCandidate,
  stableSessionKey,
  isStableAddressEnabled,
  isNotStableAddress,
} from "../../utils/sessionAddresses.js";
import { clipTeammateText } from "../../utils/swarm/teammateIds.js";
import { plural } from "../../utils/stringUtils.js";
import {
  primePeerIdentity,
  searchCloudPeers,
  isTransientListingFailure,
  fetchBridgePopulation,
  recordBridgeListing,
  livePeerSessionsExcludingKnown,
  isCurrentBridgeIdentity,
  forgetBridgeListing,
} from "../../utils/peerSessions/cloudPeers.js";
import { getTeamName } from "../../utils/teammate.js";
import { MAIN } from "../../utils/sessionPeers.js";
import { normalizeAgentIdOrNull, identityAgentId2 } from "../../utils/agentId.js";
import { TEAM_LEAD } from "../../utils/swarm/constants.js";
import { readTeamFileAsync } from "../../utils/swarm/teamHelpers.js";
import { listPeerSessionsSafe, warmBridgeListingIfEnabled } from "../../utils/peerAddressing.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isCrossSessionMessagingEnabled } from "../../utils/crossSessionMessagingGate.js";
import { withDeadline } from "../../utils/sleep.js";
import { logForDebugging } from "../../utils/debug.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { isMainSessionTask } from "../../tasks/LocalMainSessionTask.js";
import { mayBeSamePath, isSamePath } from "../../utils/peerAddress.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { similarNames } from "../../utils/settings/managedEnvKeys.js";

//@ chunk-k7agbjgj.js:964-1270 placement
/**
 * 跨会话发送的组织策略键（Remote Control / 云会话）、未知类型时的合并标签与无策略允许时的说明。
 */
var REMOTE_SEND_POLICY_KEYS = {
  "remote-control": ["allow_remote_control"],
  cloud: ["allow_remote_sessions"],
  unknown: ["allow_remote_control", "allow_remote_sessions"],
};
var COMBINED_REMOTE_FEATURE_LABEL = {
  featureLabel: "Remote Control and Cloud sessions",
  verb: "are",
};
var NO_POLICY_ALLOWS_REASON =
  "No organization policy allows sends to this kind of session, so it can't be shown as permitted.";
//@ chunk-k7agbjgj.js:1270-1786 placement
/**
 * 判断能否向某类远程会话发送：非第一方/仅必要流量时为 residency；组织策略都拒绝时记录并返回第一个拒绝原因；允许时返回 null。
 */
function getRemoteSendBlock(via) {
  if (getAPIProvider() !== "firstParty" || isEssentialTrafficOnly())
    return {
      cause: "residency",
    };
  if (isAsyncSnowglobeOn()) return null;
  let policyModule = require("../../services/policyLimits/CLIENT_POLICY_KEYS.lazy.js");
  let policyKeys = REMOTE_SEND_POLICY_KEYS[via];
  let deniedReasons = [];
  for (let policyKey of policyKeys) {
    let { featureLabel, verb } = policyModule.policyKeyLabel(policyKey);
    let deniedReason = policyModule.policyDeniedReason(policyKey, featureLabel, verb);
    if (deniedReason === null) return null;
    deniedReasons.push(deniedReason);
  }
  let [firstPolicyKey] = policyKeys;
  if (firstPolicyKey === undefined)
    return {
      cause: "policy",
      reason: NO_POLICY_ALLOWS_REASON,
    };
  let { logOrgPolicyDenied } = require("../../services/policyLimits/orgPolicyDeniedEvent.js");
  logOrgPolicyDenied(firstPolicyKey, "tool");
  return {
    cause: "policy",
    reason:
      (via === "unknown" && deniedReasons.length > 1
        ? (policyModule.policyDeniedReason(
            firstPolicyKey,
            COMBINED_REMOTE_FEATURE_LABEL.featureLabel,
            COMBINED_REMOTE_FEATURE_LABEL.verb,
          ) ?? deniedReasons[0])
        : deniedReasons[0]) ?? NO_POLICY_ALLOWS_REASON,
  };
}
//@ chunk-k7agbjgj.js:1786-2147 placement
/**
 * 记录本会话对某名字的发送目标（id、ref、socket），身份变化时更新 sendMessagePins，保留更稳定的会话 id。
 */
function pinSendTarget(setSendMessagePins, displayName, target) {
  let slotName = slugifySessionName(displayName);
  setSendMessagePins((state) => {
    let existingPin = Object.hasOwn(state.sendMessagePins, slotName)
      ? state.sendMessagePins[slotName]
      : undefined;
    let id =
      existingPin !== undefined &&
      isStableSessionAddress(existingPin.id) &&
      !isStableSessionAddress(target.id) &&
      (target.claimedSessionIds ?? []).some((claimedId) => stableSessionAddress(claimedId) === existingPin.id)
        ? existingPin.id
        : target.id;
    return existingPin?.id === id && existingPin.sock === target.sock
      ? state
      : {
          ...state,
          sendMessagePins: {
            ...state.sendMessagePins,
            [slotName]: {
              id,
              name: displayName,
              ref: addressRef(target.kind, id),
              ...(target.sock !== undefined && {
                sock: target.sock,
              }),
            },
          },
        };
  });
}
//@ chunk-k7agbjgj.js:2147-2255 placement
/**
 * 用曾用名字首次给一个新会话发消息时的提示（对方是否重启过？）。
 */
var PREVIOUSLY_PINNED_NOTE =
  "Note: messaging a new session for the first time under a previously used name (was it restarted?)";
//@ chunk-k7agbjgj.js:2255-2454 placement
/**
 * 说明本机某会话现名为 X、其旧名之一为目标名（会话改名提示）。
 */
function renamedSessionNote(previousName, name) {
  return `
A session on this machine now named '${name}' reports '${previousName}' as one of its former names \u2014 if that is the session you meant, it goes by '${name}' now (a rename, not a stop).`;
}
//@ chunk-k7agbjgj.js:2454-2545 placement
/**
 * 说明某会话把该名字作为旧名（已改名）的提示文本。
 */
function renamedSessionNoteText(name) {
  return ` A session now named '${name}' reports it as a former name (renamed).`;
}
//@ chunk-k7agbjgj.js:2545-3108 placement
/**
 * 跨会话发送的提示：本机另有会话记录声称同一身份、目标会话自上次联系后重启，以及本机会话的通用称呼。
 */
var IDENTITY_CONTESTED_NOTE =
  "Note: another live session record on this machine currently claims this session's identity (the same conversation open in two places, or a record impersonating it). This went to the socket confirmed earlier in this conversation; if that is unexpected, check with the user before sending it anything sensitive.";
var RESTARTED_SINCE_PIN_NOTE =
  "Note: this session has restarted since this conversation last reached it (same session, new process). If you were not expecting that, check with the user before sending it anything sensitive.";
var LOCAL_SESSION_LABEL = "another Claude session on this machine";
//@ chunk-k7agbjgj.js:3108-3545 placement
/**
 * 子代理发送跨会话消息时的说明：以本会话地址发出，回复会送到主对话（单向时只说明发送身份）。
 */
function describeSubagentSender(agentId, from, options) {
  if (agentId === undefined)
    return {
      message: "",
      display: "",
    };
  let senderLabel = (from && clipTeammateText(from)) || "an agent in this session";
  return options.oneWay
    ? {
        message: "; sent under this session's address, not this agent's",
        display: ` (sent by ${senderLabel}, under this session's name)`,
      }
    : {
        message:
          "; sent under this session's address: any reply will be delivered to this session's main conversation, not to this agent",
        display: ` (sent by ${senderLabel}; replies go to the main conversation)`,
      };
}
//@ chunk-k7agbjgj.js:3545-3679 placement
/**
 * 描述远程会话类型：云端会话或经 Remote Control 的其他机器会话。
 */
function describeRemoteSessionKind(kind) {
  return kind === "cloud"
    ? "a Claude session running in the cloud"
    : "a Claude session on another machine, over Remote Control";
}
//@ chunk-k7agbjgj.js:3679-4380 placement
/**
 * 跨会话投递状态说明：服务端已接受但未确认送达（对方可能是旧版本），或已进入对方收件箱尚未读取（是否会回报取决于本地是否绑定收件箱）。
 */
var UNCONFIRMED_DELIVERY_NOTE =
  "; accepted by the server for that session, but delivery is not confirmed: it has not reported that it can receive cross-session messages and may be on an older version that cannot";
var UNCONFIRMED_DELIVERY_DISPLAY =
  " (accepted by the server; delivery not confirmed, that session may be on an older version)";
var INBOX_WITH_NOTICE_NOTE =
  "; in that session's inbox, not yet read by its Claude \u2014 a [Cross-session delivery notice] follows if that session holds it (usually a different permission mode) or refuses it";
var INBOX_NO_NOTICE_NOTE =
  "; in that session's inbox, not yet read by its Claude \u2014 that session may hold it (usually a different permission mode) or refuse it, and with no inbox bound here nothing reports back, so never treat silence as agreement";
//@ chunk-k7agbjgj.js:4380-4411 placement
/**
 * 按是否有投递说明返回对应的 inbox 提示。
 */
function inboxNoticeNote(hasInboxNotice) {
  return hasInboxNotice ? INBOX_WITH_NOTICE_NOTE : INBOX_NO_NOTICE_NOTE;
}
//@ chunk-k7agbjgj.js:4411-4628 placement
/**
 * 跨会话消息无已读回执的说明（对方可能保留或拒绝，此路由不回报）。
 */
var NO_READ_RECEIPT_NOTE =
  "; not confirmed read \u2014 that session may hold it (usually a different permission mode) or refuse it, and this route reports nothing back";
var NO_READ_RECEIPT_DISPLAY = " (that session's settings decide delivery; no read receipt)";
//@ chunk-k7agbjgj.js:4628-4702 placement
/**
 * 未确认投递时的说明（message 与 display 两份）。
 */
function unconfirmedDeliveryNote(unreported) {
  return unreported
    ? {
        message: UNCONFIRMED_DELIVERY_NOTE,
        display: UNCONFIRMED_DELIVERY_DISPLAY,
      }
    : {
        message: "",
        display: "",
      };
}
//@ chunk-k7agbjgj.js:4702-4970 placement
/**
 * 生成本机目标会话的附加说明（也通过 Remote Control 连接、同名远程会话被本地认领等）。
 */
function describeLocalTargetCaveats(resolvedRecipient) {
  return `${resolvedRecipient.alsoListedRemotely ? "; it is also connected via Remote Control" : ""}${resolvedRecipient.remoteNamesakeClaimedLocally ? `; a Remote Control or cloud session also named '${resolvedRecipient.displayName}' is registered to a session on this machine` : ""}${resolvedRecipient.searchTruncated ? TRUNCATED_SEARCH_NOTE : ""}`;
}
//@ chunk-k7agbjgj.js:4970-5212 placement
/**
 * 生成"已发往本对话确认过的会话"的说明，并提示如何改发给其他同名目标。
 */
function describePinnedChoice(resolvedRecipient, retryHint, kindNoun = "live session", what = "delivery") {
  return describePinCaveats(
    resolvedRecipient,
    `. ${what === "subscription" ? "The subscription" : "This"} went to the one this conversation confirmed; to switch, re-send with that ${kindNoun === "agent" ? "agent" : "session"}'s 'name [ref]'${retryHint}.`,
    kindNoun,
  );
}
//@ chunk-k7agbjgj.js:5212-5381 placement
/**
 * 生成"已发往本对话先前确认的那个"的简短说明。
 */
function describeConfirmedChoice(resolvedRecipient, kindNoun = "live session", what = "delivery") {
  return describePinCaveats(
    resolvedRecipient,
    `; ${what === "subscription" ? "the subscription" : "this"} went to the one confirmed earlier in this conversation.`,
    kindNoun,
  );
}
//@ chunk-k7agbjgj.js:5381-5660 placement
function describePinCaveats(resolved, extraNote, kindNoun) {
  let pinNote = resolved.previouslyPinned
    ? `
${PREVIOUSLY_PINNED_NOTE}`
    : resolved.restartedSincePin
      ? `
${RESTARTED_SINCE_PIN_NOTE}`
      : resolved.identityContested
        ? `
${IDENTITY_CONTESTED_NOTE}`
        : "";
  let siblingsNote = resolved.sameNamedSiblings
    ? `
Note: ${resolved.sameNamedSiblings} other ${plural(resolved.sameNamedSiblings, `${kindNoun} is`, `${kindNoun}s are`)} also named '${resolved.displayName}'${extraNote}`
    : "";
  return `${pinNote}${siblingsNote}`;
}
//@ chunk-k7agbjgj.js:5660-5858 placement
/**
 * 生成远程目标会话的附加说明（离线、同名会话已在本机注册等）。
 */
function describeRemoteTargetCaveats(target) {
  return `${target.offline ? OFFLINE_QUEUED_NOTE : ""}${target.remoteNamesakeClaimedLocally ? `; another session also named '${target.displayName}' is registered to a session on this machine` : ""}${target.searchTruncated ? TRUNCATED_SEARCH_NOTE : ""}`;
}
//@ chunk-k7agbjgj.js:5858-5949 placement
/**
 * 目标机离线、投递排队中的说明。
 */
var OFFLINE_QUEUED_NOTE = "; it is offline right now \u2014 delivery is queued until that machine reconnects";
//@ chunk-k7agbjgj.js:5949-6260 placement
/**
 * 说明哪些会话来源未能搜索：本机会话列表不可用、本机与账号会话都未能全部检查，或账号会话未能检查。
 */
function describeUnsearchedSessions(resolvedRecipient) {
  return resolvedRecipient.localUnavailable &&
    !resolvedRecipient.bridgeUnavailable &&
    !resolvedRecipient.cloudUnavailable
    ? "the sessions on this machine could not be listed just now"
    : resolvedRecipient.localUnavailable
      ? "this machine's and your account's other sessions could not all be checked just now"
      : "your account's other sessions could not be checked just now";
}
//@ chunk-k7agbjgj.js:6260-6386 placement
/**
 * 本机会话声称是先前确认在别处的会话时的说明。
 */
function claimedElsewhereMessage(pinnedIdentityClaimedLocally) {
  return `A session on this machine now claims to be '${pinnedIdentityClaimedLocally}', which was confirmed earlier as a session elsewhere`;
}
//@ chunk-k7agbjgj.js:6386-6701 placement
/**
 * 会话列表过长未能完整搜索时的说明（附加在结果、段落与简短形式中）。
 */
var TRUNCATED_SEARCH_NOTE =
  "; your session list was too long to check completely, so a same-named session beyond what was searched would not have been seen";
var TRUNCATED_SEARCH_PARAGRAPH = `
Your session list was too long to check completely, so a session by that name may exist beyond what was searched.`;
var TRUNCATED_SEARCH_SHORT = "your session list was too long to check completely";
//@ chunk-k7agbjgj.js:6701-11056 placement
/**
 * 解析 SendMessage 的跨会话收件人（会话名/团队成员），返回匹配或最接近的候选。
 */
async function resolveCrossSessionAddress(
  session,
  agentName,
  resolverContext,
  toolContext,
  storageV5,
  credentials,
) {
  await primePeerIdentity({
    refresh: true,
    credentials,
  });
  let slug = slugifySessionName(agentName);
  let teamName = getTeamName(toolContext.teamContext);
  let teamFile = null;
  if (looksLikeAddress(agentName))
    return {
      kind: "not-found",
      closest: [],
    };
  if (typeof resolverContext === "string") {
    if (agentName === MAIN)
      return {
        kind: "main",
      };
    let teammates = toolContext.teamContext?.teammates ?? {};
    let found = Object.entries(teammates).find(([, value]) => value.name === agentName);
    let normalizedId = normalizeAgentIdOrNull(agentName) ?? normalizeAgentIdOrNull(slug);
    let registryAgentId = found || normalizedId ? undefined : toolContext.agentNameRegistry.get(agentName);
    let agentId = normalizedId ?? registryAgentId;
    if (agentId) return subagentRoute(toolContext, agentId, agentName);
    if (found)
      return {
        kind: "mailbox",
        recipientName: agentName,
        memberAgentId: found[0],
        memberIdentitySource: "team-context",
      };
    let nameWithRef = parseNameWithRef(agentName);
    if (teamName) {
      if (agentName === TEAM_LEAD)
        return {
          kind: "mailbox",
          recipientName: agentName,
        };
      teamFile = await readTeamFileAsync(teamName, storageV5);
      if (nameWithRef === null && teamFile !== null) {
        let found = addressableTeamMembers(teamFile, teamLeadAddress(toolContext)).find(
          (member) => member.name === agentName,
        );
        if (found !== undefined)
          return {
            kind: "mailbox",
            recipientName: agentName,
            memberAgentId: found.agentId,
            memberIdentitySource: "roster",
          };
      }
    }
    let leadAddress = teamLeadAddress(toolContext);
    let found_2 = Object.entries(teammates).find(
      ([key, value]) =>
        (isLocalTeamLead(
          {
            name: value.name,
            agentId: key,
          },
          leadAddress,
        ) ||
          !isReservedOrInvalidName(value.name)) &&
        slugifySessionName(value.name) === slug,
    );
    if (found_2 !== undefined)
      return {
        kind: "mailbox",
        recipientName: found_2[1].name,
        memberAgentId: found_2[0],
        memberIdentitySource: "team-context",
      };
    for (let [agentName, registeredAgentId] of toolContext.agentNameRegistry)
      if (!isReservedOrInvalidName(agentName) && slugifySessionName(agentName) === slug)
        return subagentRoute(toolContext, registeredAgentId, agentName);
    let parsedNameWithRef = nameWithRef;
    if (parsedNameWithRef) {
      let [localListing, cloudListing] = await Promise.all([
        listPeerSessionsSafe(),
        searchCloudPeers(session, credentials),
      ]);
      let sessions = localListing.sessions;
      let remoteRowsForPin = await loadRemoteRowsForPin(
        session,
        toolContext.sendMessagePins,
        slugifySessionName(parsedNameWithRef.name),
        cloudListing,
        slug,
        warmBridgeListingIfEnabled(session),
        credentials,
      );
      let { rows, unavailable } = remoteRowsForPin;
      let addressIndex = describeAgentAddress(toolContext, {
        teamFile,
        sessions,
        cloud: cloudListing.sessions,
        bridge: rows,
      });
      let refSlug = slugifySessionName(parsedNameWithRef.name);
      let toRoute = (candidateByRef, extraNote, rows, truncated) => {
        let route = candidateToRoute(candidateByRef, toolContext);
        return route.kind === "local-session" || route.kind === "cloud-session"
          ? {
              ...route,
              ...describeRouteFlags(
                route,
                refSlug,
                extraNote,
                {
                  socksMirroredRemotely: getMirroredSockets(sessions, cloudListing, rows),
                  searchTruncated: cloudListing.truncated === true || truncated,
                },
                toolContext.sendMessagePins,
              ),
            }
          : route;
      };
      let candidateByRef = findCandidateByRef(addressIndex, refSlug, parsedNameWithRef.ref);
      if (candidateByRef) return toRoute(candidateByRef, addressIndex, rows, remoteRowsForPin.truncated);
      let remoteUnavailable = unavailable;
      let remoteTruncated = remoteRowsForPin.truncated;
      if (rows === undefined) {
        let remoteSessionRows = await fetchRemoteSessionRows(session, cloudListing, slug, credentials);
        remoteUnavailable = remoteSessionRows.unavailable;
        remoteTruncated = remoteSessionRows.truncated;
        if (remoteSessionRows.rows.length > 0) {
          addressIndex = describeAgentAddress(toolContext, {
            teamFile,
            sessions,
            cloud: cloudListing.sessions,
            bridge: remoteSessionRows.rows,
          });
          let candidateByRef = findCandidateByRef(addressIndex, refSlug, parsedNameWithRef.ref);
          if (candidateByRef)
            return toRoute(candidateByRef, addressIndex, remoteSessionRows.rows, remoteSessionRows.truncated);
        }
      }
      return {
        ...notFoundWithSuggestions(refSlug, addressIndex),
        ...findRenamedSession(refSlug, sessions, addressIndex, toolContext.sendMessagePins),
        ...describeSearchGaps(cloudListing, remoteUnavailable, localListing.unavailable, {
          remoteTruncated,
        }),
        ...findLocallyClaimedPin(toolContext.sendMessagePins, [refSlug], bridgeSessionIds(sessions)),
      };
    }
  }
  if (typeof resolverContext !== "string") {
    if (resolverContext.type === "shutdown_response")
      return {
        kind: "mailbox",
        recipientName: agentName,
      };
    if (agentName !== TEAM_LEAD && isReservedSessionName(agentName))
      return notFoundWithSuggestions(
        slugifySessionName(agentName),
        describeAgentAddress(toolContext, {
          teamFile: null,
          sessions: [],
        }),
        (entry) => entry.kind === "teammate",
      );
    if (!teamName)
      return {
        kind: "mailbox",
        recipientName: agentName,
      };
    if (agentName === TEAM_LEAD)
      return {
        kind: "mailbox",
        recipientName: agentName,
      };
    let filtered = Object.entries(toolContext.teamContext?.teammates ?? {}).filter(
      ([key, value]) =>
        isLocalTeamLead(
          {
            name: value.name,
            agentId: key,
          },
          teamLeadAddress(toolContext),
        ) || !isReservedOrInvalidName(value.name),
    );
    let found = filtered.find(([, teammate]) => teammate.name === agentName);
    if (found)
      return {
        kind: "mailbox",
        recipientName: agentName,
        memberAgentId: found[0],
        memberIdentitySource: "team-context",
      };
    teamFile = await readTeamFileAsync(teamName, storageV5);
    if (parseNameWithRef(agentName) === null && teamFile !== null) {
      let found = addressableTeamMembers(teamFile, teamLeadAddress(toolContext)).find(
        (member) => member.name === agentName,
      );
      if (found !== undefined)
        return {
          kind: "mailbox",
          recipientName: agentName,
          memberAgentId: found.agentId,
          memberIdentitySource: "roster",
        };
    }
    let found_2 = filtered.find(([, teammate]) => slugifySessionName(teammate.name) === slug);
    if (found_2 !== undefined)
      return {
        kind: "mailbox",
        recipientName: found_2[1].name,
        memberAgentId: found_2[0],
        memberIdentitySource: "team-context",
      };
    if (parseNameWithRef(agentName) === null && teamFile !== null) {
      let sessionByName = findSessionByName(
        addressableTeamMembers(teamFile, teamLeadAddress(toolContext)),
        agentName,
      );
      if (sessionByName !== undefined)
        return {
          kind: "mailbox",
          recipientName: sessionByName.name,
          displayName: agentName,
          memberAgentId: sessionByName.agentId,
          memberIdentitySource: "roster",
        };
    }
    if (teamFile === null)
      return {
        kind: "mailbox",
        recipientName: agentName,
      };
    return notFoundWithSuggestions(
      slug,
      describeAgentAddress(toolContext, {
        teamFile,
        sessions: [],
      }),
      (entry) => entry.kind === "teammate",
    );
  }
  if (teamName && teamFile === null) {
    if (isReservedSessionName(agentName))
      return notFoundWithSuggestions(
        slug,
        describeAgentAddress(toolContext, {
          teamFile,
          sessions: [],
        }),
      );
    return {
      kind: "mailbox",
      recipientName: agentName,
    };
  }
  let [localListing, cloudListing] = await Promise.all([
    listPeerSessionsSafe(),
    searchCloudPeers(session, credentials),
  ]);
  let sessions = localListing.sessions;
  let remoteRowsForPin = await loadRemoteRowsForPin(
    session,
    toolContext.sendMessagePins,
    slug,
    cloudListing,
    slug,
    warmBridgeListingIfEnabled(session),
    credentials,
  );
  let { rows, unavailable, truncated } = remoteRowsForPin;
  let localClaimedBodies = bridgeSessionIds(sessions);
  let listingGaps = () => ({
    cloudUnavailable: definedIf(cloudListing.unavailable),
    bridgeUnavailable: unavailable,
    localClaimedRemoteBodies: localClaimedBodies,
    bridgeSettled: rows !== undefined,
    localUnavailable: localListing.unavailable,
    socksMirroredRemotely: getMirroredSockets(sessions, cloudListing, rows),
    searchTruncated: cloudListing.truncated === true || truncated,
  });
  let addressIndex = describeAgentAddress(toolContext, {
    teamFile,
    sessions,
    cloud: cloudListing.sessions,
    bridge: rows,
  });
  let singleByName =
    addressIndex.byName.get(slug)?.length === 1 ? addressIndex.byName.get(slug)[0] : undefined;
  let pinKind = getPinKind(toolContext.sendMessagePins, slug);
  let pinMatches =
    singleByName !== undefined &&
    pinKind !== undefined &&
    Object.hasOwn(toolContext.sendMessagePins, slug) &&
    matchesPin(toolContext.sendMessagePins[slug], singleByName);
  let needsRemoteRows =
    singleByName !== undefined &&
    (singleByName.kind === "session" || singleByName.kind === "cloud-session") &&
    pinKind !== "agent" &&
    !pinMatches;
  if (rows === undefined && needsRemoteRows) {
    let remoteSessionRows = await fetchRemoteSessionRows(session, cloudListing, slug, credentials);
    rows = remoteSessionRows.rows;
    unavailable = remoteSessionRows.unavailable;
    truncated = remoteSessionRows.truncated;
    addressIndex = describeAgentAddress(toolContext, {
      teamFile,
      sessions,
      cloud: cloudListing.sessions,
      bridge: remoteSessionRows.rows,
    });
  }
  let exactName = resolveExactName(addressIndex, slug, agentName, toolContext, listingGaps());
  if (exactName) return exactName;
  if (rows === undefined) {
    let remoteSessionRows = await fetchRemoteSessionRows(session, cloudListing, slug, credentials);
    rows = remoteSessionRows.rows;
    unavailable = remoteSessionRows.unavailable;
    truncated = remoteSessionRows.truncated;
    if (remoteSessionRows.rows.length > 0) {
      addressIndex = describeAgentAddress(toolContext, {
        teamFile,
        sessions,
        cloud: cloudListing.sessions,
        bridge: remoteSessionRows.rows,
      });
      let exactName = resolveExactName(addressIndex, slug, agentName, toolContext, listingGaps());
      if (exactName) return exactName;
    }
  }
  return (
    resolveNamePrefix(addressIndex, slug, toolContext, listingGaps()) ?? {
      ...notFoundWithSuggestions(slug, addressIndex),
      ...findRenamedSession(slug, sessions, addressIndex, toolContext.sendMessagePins),
      ...describeSearchGaps(cloudListing, unavailable, localListing.unavailable, {
        remoteTruncated: truncated,
      }),
      ...findLocallyClaimedPin(toolContext.sendMessagePins, [slug], localClaimedBodies),
    }
  );
}
//@ chunk-k7agbjgj.js:11056-11180 placement
function getLocallyClaimedPinName(sendMessagePins, pinName, localClaimedBodies) {
  let pinKind = getPinKind(sendMessagePins, pinName);
  if (pinKind !== "cloud" && pinKind !== "remote-control") return;
  let pin = sendMessagePins[pinName];
  return localClaimedBodies.has(sessionIdBody(pin.id)) ? pin.name : undefined;
}
//@ chunk-k7agbjgj.js:11180-11350 placement
function expandPinPrefixes(sendMessagePins, names) {
  let firstName = names[0];
  if (firstName === undefined || firstName.length < 3) return names;
  let filtered = Object.keys(sendMessagePins).filter(
    (key) => key !== firstName && key.startsWith(firstName) && !names.includes(key),
  );
  return filtered.length === 0 ? names : [...names, ...filtered];
}
//@ chunk-k7agbjgj.js:11350-11468 placement
function findLocallyClaimedPin(sendMessagePins, names, localClaimedBodies) {
  for (let name of expandPinPrefixes(sendMessagePins, names)) {
    let locallyClaimedPinName = getLocallyClaimedPinName(sendMessagePins, name, localClaimedBodies);
    if (locallyClaimedPinName !== undefined)
      return {
        pinnedIdentityClaimedLocally: locallyClaimedPinName,
      };
  }
  return {};
}
//@ chunk-k7agbjgj.js:11468-11664 placement
function getPinKind(sendMessagePins, pinName) {
  let pin = Object.hasOwn(sendMessagePins, pinName) ? sendMessagePins[pinName] : undefined;
  if (pin === undefined) return;
  if (normalizeAgentIdOrNull(pin.id) !== null) return "agent";
  if (pin.id.startsWith("cse_")) return "cloud";
  return sessionIdBody(pin.id) !== pin.id ? "remote-control" : "local";
}
//@ chunk-k7agbjgj.js:11664-11979 placement
/**
 * 按需为固定目标加载远程会话列表：不需要时沿用已有结果，需要时拉取并在失败时回退到已有行。
 */
async function loadRemoteRowsForPin(
  session,
  sendMessagePins,
  pinName,
  cloudListing,
  slug,
  warmListing,
  credentials,
) {
  let rows = warmListing?.rows;
  if (!needsRemoteLookupForPin(sendMessagePins, pinName, cloudListing.sessions, rows))
    return {
      rows,
      unavailable: undefined,
      truncated: warmListing !== undefined && warmListing.truncated,
    };
  let remoteSessionRows = await fetchRemoteSessionRows(session, cloudListing, slug, credentials);
  return {
    rows: remoteSessionRows.unavailable === undefined || rows === undefined ? remoteSessionRows.rows : rows,
    unavailable: remoteSessionRows.unavailable,
    truncated:
      remoteSessionRows.unavailable === undefined || warmListing === undefined
        ? remoteSessionRows.truncated
        : warmListing.truncated,
  };
}
//@ chunk-k7agbjgj.js:11979-12161 placement
function needsRemoteLookupForPin(sendMessagePins, pinName, sessions, rows) {
  let pinKind = getPinKind(sendMessagePins, pinName);
  if (pinKind !== "remote-control" && pinKind !== "cloud") return false;
  let pinBody = sessionIdBody(sendMessagePins[pinName].id);
  if (sessions.some((session) => sessionIdBody(session.id) === pinBody)) return false;
  return rows === undefined || !rows.some((row) => sessionIdBody(row.id) === pinBody);
}
//@ chunk-k7agbjgj.js:12161-12396 placement
function searchGaps(gaps) {
  return {
    ...(gaps.cloudUnavailable && {
      cloudUnavailable: gaps.cloudUnavailable,
    }),
    ...(gaps.bridgeUnavailable && {
      bridgeUnavailable: gaps.bridgeUnavailable,
    }),
    ...(gaps.localUnavailable && {
      localUnavailable: true,
    }),
    ...(gaps.searchTruncated && {
      searchTruncated: true,
    }),
  };
}
//@ chunk-k7agbjgj.js:12396-13121 placement
/**
 * 按名字精确解析发送目标：唯一时直接转为路由；同名多个时优先使用已固定的目标，若只有一个会话且所有来源都已搜索则视为唯一，否则返回 ambiguous 并带搜索缺口说明。
 */
function resolveExactName(index, slug, agentName, toolContext, listingGaps) {
  let uniqueCandidate = resolveUniqueCandidate(index.byName, slug, agentName);
  if (uniqueCandidate) {
    if (uniqueCandidate.kind === "ambiguous") {
      let candidates = index.byName.get(slug);
      let pinnedCandidate = findPinnedCandidate(
        toolContext.sendMessagePins,
        slug,
        candidates,
        agentName,
        listingGaps,
      );
      if (pinnedCandidate)
        return pinnedRoute(pinnedCandidate, candidates, toolContext, slug, index, listingGaps);
      let locallyClaimedPin = findLocallyClaimedPin(
        toolContext.sendMessagePins,
        [slug],
        listingGaps.localClaimedRemoteBodies,
      );
      let firstCandidate = candidates[0];
      let pinKind = getPinKind(toolContext.sendMessagePins, slug);
      if (
        candidates.length === 1 &&
        (firstCandidate.kind === "session" ||
          firstCandidate.kind === "cloud-session" ||
          firstCandidate.kind === "bridge-session") &&
        !listingGaps.cloudUnavailable &&
        listingGaps.bridgeSettled &&
        !listingGaps.bridgeUnavailable &&
        !listingGaps.localUnavailable &&
        locallyClaimedPin.pinnedIdentityClaimedLocally === undefined &&
        pinKind !== "agent" &&
        !firstCandidate.derivedName
      ) {
        let route = candidateToRoute(firstCandidate, toolContext);
        if (route.kind === "local-session" || route.kind === "cloud-session")
          return {
            ...route,
            exactUnique: true,
            ...(pinKind !== undefined && {
              previouslyPinned: true,
            }),
            ...describeRouteFlags(route, slug, index, listingGaps, toolContext.sendMessagePins),
          };
      }
      return {
        ...ambiguousMatch(candidates, "exact"),
        ...searchGaps(listingGaps),
        ...locallyClaimedPin,
      };
    }
    return candidateToRoute(uniqueCandidate.candidate, toolContext);
  }
  return;
}
//@ chunk-k7agbjgj.js:13121-14769 placement
/**
 * 按名字前缀（≥3 字符）解析发送目标：唯一前缀匹配时处理已固定目标与同名歧义、未搜索完整的来源；多个前缀匹配返回 ambiguous；记录 send_message_prefix_match 遥测。
 */
function resolveNamePrefix(index, slug, toolContext, listingGaps) {
  if (slug.length >= 3) {
    let filtered = [...index.byName.keys()].filter((key) => key.startsWith(slug));
    if (filtered.length === 1) {
      let uniqueCandidate = resolveUniqueCandidate(index.byName, filtered[0]);
      let pinKind = getPinKind(toolContext.sendMessagePins, slug);
      let claimedLocally =
        findLocallyClaimedPin(toolContext.sendMessagePins, [slug], listingGaps.localClaimedRemoteBodies)
          .pinnedIdentityClaimedLocally !== undefined;
      if ((pinKind !== undefined && pinKind !== "agent") || claimedLocally) {
        let candidates = index.byName.get(filtered[0]);
        logFeatureSad(
          "send_message_prefix_match",
          pinKind !== undefined && pinKind !== "agent" ? "typed_name_pinned" : "prefix_of_claimed_pin",
        );
        return {
          ...ambiguousMatch(
            uniqueCandidate.kind === "one" ? [uniqueCandidate.candidate] : candidates,
            "prefix",
          ),
          ...searchGaps(listingGaps),
          ...findLocallyClaimedPin(
            toolContext.sendMessagePins,
            [slug, filtered[0]],
            listingGaps.localClaimedRemoteBodies,
          ),
        };
      }
      if (uniqueCandidate.kind === "ambiguous") {
        let candidates = index.byName.get(filtered[0]);
        let pinnedCandidate = findPinnedCandidate(
          toolContext.sendMessagePins,
          filtered[0],
          candidates,
          undefined,
          listingGaps,
          true,
        );
        if (pinnedCandidate) {
          logFeatureOk("send_message_prefix_match", {
            input_len: slug.length,
            index_size: index.candidates.length,
            pinned: 1,
          });
          return pinnedRoute(pinnedCandidate, candidates, toolContext, filtered[0], index, listingGaps);
        }
        if (candidates.length === 1) logFeatureSad("send_message_prefix_match", "confirm_required");
        else logFeatureBad("send_message_prefix_match", "ambiguous_name");
        return {
          ...ambiguousMatch(candidates, "prefix"),
          ...searchGaps(listingGaps),
          ...findLocallyClaimedPin(
            toolContext.sendMessagePins,
            [slug, filtered[0]],
            listingGaps.localClaimedRemoteBodies,
          ),
        };
      }
      if (listingGaps.cloudUnavailable || listingGaps.bridgeUnavailable || listingGaps.localUnavailable) {
        logFeatureSad(
          "send_message_prefix_match",
          listingGaps.cloudUnavailable || listingGaps.bridgeUnavailable
            ? "remote_unsearched"
            : "local_unsearched",
        );
        return {
          ...ambiguousMatch([uniqueCandidate.candidate], "prefix"),
          ...searchGaps(listingGaps),
          ...findLocallyClaimedPin(
            toolContext.sendMessagePins,
            [slug, filtered[0]],
            listingGaps.localClaimedRemoteBodies,
          ),
        };
      }
      logFeatureOk("send_message_prefix_match", {
        input_len: slug.length,
        index_size: index.candidates.length,
        ...(listingGaps.searchTruncated && {
          search_truncated: true,
        }),
      });
      return candidateToRoute(uniqueCandidate.candidate, toolContext);
    }
    if (filtered.length > 1) {
      logFeatureBad("send_message_prefix_match", "ambiguous_prefix");
      return {
        ...searchGaps(listingGaps),
        ...findLocallyClaimedPin(
          toolContext.sendMessagePins,
          [slug, ...filtered],
          listingGaps.localClaimedRemoteBodies,
        ),
        ...ambiguousMatch(
          filtered.flatMap((name) => {
            let candidates = index.byName.get(name);
            let uniqueCandidate = resolveUniqueCandidate(index.byName, name);
            return uniqueCandidate?.kind === "one" ? [uniqueCandidate.candidate] : candidates;
          }),
          "prefix",
        ),
      };
    }
  }
  return;
}
//@ chunk-k7agbjgj.js:14769-14893 placement
function findCandidateByRef(index, slug, ref) {
  let candidates = index.byName.get(slug) ?? [];
  let uniqueCandidate = resolveUniqueCandidate(index.byName, slug);
  return (uniqueCandidate?.kind === "one" ? [uniqueCandidate.candidate] : candidates).find(
    (candidate) => candidate.ref === ref,
  );
}
//@ chunk-k7agbjgj.js:14893-15826 placement
/**
 * 冷启动时拉取 Remote Control 会话列表（有超时），失败或超时返回 unavailable 原因，成功时与云会话列表去重并按需记录。
 */
async function fetchRemoteSessionRows(session, cloudListing, slug, credentials) {
  if (isCrossSessionMessagingEnabled()) {
    let mayRecordListing = !isTransientListingFailure(cloudListing.unavailable);
    let bridgePopulation = fetchBridgePopulation(session, credentials);
    let population = await withDeadline(bridgePopulation, REMOTE_POPULATION_TIMEOUT_MS);
    if (population === undefined) {
      logForDebugging(
        `[bridge:resolve] "${slug}": Remote Control population not ready within ${REMOTE_POPULATION_TIMEOUT_MS}ms (cold) \u2014 not searched, disclosing a hedge`,
        {
          level: "warn",
        },
      );
      if (mayRecordListing)
        bridgePopulation.then((latePopulation) =>
          recordBridgeListing(
            session,
            latePopulation,
            livePeerSessionsExcludingKnown(latePopulation.rows, cloudListing.sessions),
          ),
        );
      return {
        rows: [],
        unavailable: "timeout",
        truncated: false,
      };
    }
    if (population.failed || (population.identityKey !== null && !isCurrentBridgeIdentity(population))) {
      logForDebugging(
        `[bridge:resolve] "${slug}": Remote Control walk ${population.failed ? "failed" : "ran under a previous handle"} (cold) \u2014 not searched, disclosing a hedge`,
        {
          level: "warn",
        },
      );
      return {
        rows: [],
        unavailable: "fetch_failed",
        truncated: false,
      };
    }
    let liveRows = livePeerSessionsExcludingKnown(population.rows, cloudListing.sessions);
    if (mayRecordListing) recordBridgeListing(session, population, liveRows);
    else forgetBridgeListing(session, population);
    logForDebugging(
      `[bridge:resolve] "${slug}": ${population.rows.length} Remote Control rows, ${liveRows.length} listed (cold${mayRecordListing ? ", recorded" : ", not recorded \u2014 cloud list failed"})`,
    );
    return {
      rows: liveRows,
      unavailable: undefined,
      truncated: population.truncated === true,
    };
  }
  return {
    rows: [],
    unavailable: undefined,
    truncated: false,
  };
}
//@ chunk-k7agbjgj.js:15826-15864 placement
/**
 * 值有效时原样返回，否则 undefined。
 */
function definedIf(unavailable) {
  return isTransientListingFailure(unavailable) ? unavailable : undefined;
}
//@ chunk-k7agbjgj.js:15864-16058 placement
function describeSearchGaps(cloudListing, bridgeUnavailable, unavailable, { remoteTruncated }) {
  return {
    cloudUnavailable: definedIf(cloudListing.unavailable),
    ...(bridgeUnavailable !== undefined && {
      bridgeUnavailable,
    }),
    ...(unavailable && {
      localUnavailable: true,
    }),
    ...((cloudListing.truncated === true || remoteTruncated) && {
      searchTruncated: true,
    }),
  };
}
//@ chunk-k7agbjgj.js:16058-16370 placement
/**
 * 把子代理 id 转换为路由：运行中、被用户停止、已停止（带状态）或已从任务表逐出。
 */
function subagentRoute(toolContext, agentId, agentName) {
  let task = toolContext.tasks[agentId];
  if (isLocalAgent(task) && !isMainSessionTask(task)) {
    if (task.status === "running")
      return {
        kind: "agent-live",
        agentId,
        agentName,
      };
    if (task.stoppedByUser)
      return {
        kind: "agent-stopped-by-user",
        agentName,
      };
    return {
      kind: "agent-stopped",
      agentId,
      status: task.status,
      agentName,
    };
  }
  return {
    kind: "agent-evicted",
    agentId,
    agentName,
  };
}
//@ chunk-k7agbjgj.js:16370-17138 placement
/**
 * 把寻址候选转换为投递路由：main、队友邮箱、子代理（运行中/已停止/已逐出）、本机会话（socket 与 pin id）、云/Remote Control 会话。
 */
function candidateToRoute(candidate, toolContext) {
  switch (candidate.kind) {
    case "main":
      return {
        kind: "main",
      };
    case "teammate":
      return {
        kind: "mailbox",
        recipientName: candidate.name,
        memberAgentId: candidate.id,
        memberIdentitySource: candidate.where === "in-process" ? "team-context" : "roster",
      };
    case "subagent":
      return subagentRoute(toolContext, identityAgentId2(candidate.id), candidate.name);
    case "session":
      return {
        kind: "local-session",
        sock: candidate.sock,
        pinId: stableSessionKey(candidate),
        ...(candidate.claimedSessionIds !== undefined && {
          claimedSessionIds: candidate.claimedSessionIds,
        }),
        displayName: candidate.name,
        ...(candidate.hostSessionId !== undefined && {
          hostSessionId: candidate.hostSessionId,
        }),
      };
    case "cloud-session":
    case "bridge-session":
      return {
        kind: "cloud-session",
        via: candidate.where === "cloud" ? "cloud" : "remote-control",
        refKind: candidate.kind,
        sessionId: candidate.id,
        displayName: candidate.name,
        ...(candidate.offline && {
          offline: true,
        }),
        ...(candidate.reportsInbound && {
          reportsInbound: true,
        }),
        ...(candidate.inboundReportUnavailable && {
          inboundReportUnavailable: true,
        }),
      };
  }
}
//@ chunk-k7agbjgj.js:17138-17155 placement
/**
 * 名字有歧义时最多列出的候选数（3）。
 */
var MAX_AMBIGUOUS_CANDIDATES = 3;
var REMOTE_POPULATION_TIMEOUT_MS = 5000;
//@ chunk-k7agbjgj.js:17155-17248 placement
/**
 * 构造“名字有歧义”的结果（候选、总数与匹配方式）。
 */
function ambiguousMatch(candidates, matchedBy) {
  return {
    kind: "ambiguous",
    candidates: candidates.slice(0, MAX_AMBIGUOUS_CANDIDATES),
    total: candidates.length,
    matchedBy,
  };
}
//@ chunk-k7agbjgj.js:17248-17786 placement
/**
 * 查找改过名的会话：唯一一条记录的旧名等于目标名、socket 唯一且对应候选名唯一时，返回改名提示与候选。
 */
function findRenamedSession(slug, sessions, index, sendMessagePins) {
  if (!isStableAddressEnabled()) return {};
  let filtered = sessions.filter(
    (session) =>
      isNotStableAddress(session) &&
      session.sessionId !== undefined &&
      session.formerNames?.some(
        (formerName) =>
          formerName.sessionId === session.sessionId && slugifySessionName(formerName.name) === slug,
      ),
  );
  if (filtered.length !== 1) return {};
  let renamedSession = filtered[0];
  if (
    sessions.filter(
      (session) => isNotStableAddress(session) && mayBeSamePath(session.sock, renamedSession.sock),
    ).length !== 1
  )
    return {};
  let found = index.candidates.find(
    (candidate) =>
      candidate.kind === "session" &&
      candidate.sock !== undefined &&
      isSamePath(candidate.sock, renamedSession.sock),
  );
  if (
    found === undefined ||
    parseNameWithRef(found.name) !== null ||
    isReservedSessionName(found.name) ||
    (index.byName.get(slugifySessionName(found.name))?.length ?? 0) !== 1
  )
    return {};
  let pin = Object.hasOwn(sendMessagePins, slug) ? sendMessagePins[slug] : undefined;
  if (pin !== undefined && pin.id !== stableSessionKey(found)) return {};
  return {
    renamedTo: found,
  };
}
//@ chunk-k7agbjgj.js:17786-17959 placement
function notFoundWithSuggestions(inputName, index, filter) {
  let pool = filter ? index.candidates.filter(filter) : index.candidates;
  let names = normalizeCaseForComparison_2(pool.map((candidate) => slugifySessionName(candidate.name)));
  return {
    kind: "not-found",
    closest: similarNames(inputName, names, MAX_AMBIGUOUS_CANDIDATES).map((name) =>
      pool.find((candidate) => slugifySessionName(candidate.name) === name),
    ),
  };
}
//@ chunk-k7agbjgj.js:17959-18675 placement
/**
 * 按会话固定的 pin 查找候选：跳过代理类与被本地认领的远程 pin，相关来源不可用时放弃；按 id 或 socket 匹配，找不到记录 pin 失效。
 */
function findPinnedCandidate(
  sendMessagePins,
  pinName,
  candidates,
  typedName,
  listingGaps,
  strictGaps = false,
) {
  let pin = Object.hasOwn(sendMessagePins, pinName) ? sendMessagePins[pinName] : undefined;
  if (pin === undefined) return;
  let pinKind = getPinKind(sendMessagePins, pinName);
  if (pinKind === "agent") return;
  let isRemotePin = pinKind !== "local";
  if (isRemotePin && listingGaps.localClaimedRemoteBodies.has(sessionIdBody(pin.id))) return;
  if (
    (pinKind === "cloud" && listingGaps.cloudUnavailable) ||
    (pinKind === "remote-control" && listingGaps.bridgeUnavailable) ||
    (pinKind === "local" && listingGaps.localUnavailable) ||
    (strictGaps &&
      (listingGaps.cloudUnavailable || listingGaps.bridgeUnavailable || listingGaps.localUnavailable))
  )
    return;
  let filtered = candidates.filter(
    (candidate) =>
      (isRemotePin
        ? candidate.kind === "cloud-session" || candidate.kind === "bridge-session"
        : candidate.kind === "session") && candidate.where !== "in-process",
  );
  let match =
    filtered.find((candidate) => stableSessionKey(candidate) === pin.id) ??
    filtered.find((candidate) => matchesPin(pin, candidate));
  if (match === undefined) {
    if (!(isRemotePin && listingGaps.searchTruncated)) logFeatureSad("send_message_pin", "stale");
    return;
  }
  if (
    typedName !== undefined &&
    match.name !== typedName &&
    candidates.some((candidate) => candidate.name === typedName)
  )
    return;
  logFeatureOk("send_message_pin");
  return match;
}
//@ chunk-k7agbjgj.js:18675-19095 placement
/**
 * 把固定的候选转换为路由：本机会话 pin id 与持有的更稳定 id 不符时标记身份冲突，附加同名兄弟数量与路由标记。
 */
function pinnedRoute(pinnedCandidate, candidates, toolContext, slug, index, listingGaps) {
  let route = candidateToRoute(pinnedCandidate, toolContext);
  if (route.kind !== "local-session" && route.kind !== "cloud-session") return route;
  let pin = Object.hasOwn(toolContext.sendMessagePins, slug) ? toolContext.sendMessagePins[slug] : undefined;
  let effectiveRoute =
    route.kind === "local-session" &&
    pin !== undefined &&
    pin.id !== route.pinId &&
    pin.sock !== undefined &&
    isSamePath(pin.sock, route.sock) &&
    isStableSessionAddress(pin.id) &&
    !isStableSessionAddress(route.pinId)
      ? {
          ...route,
          pinId: pin.id,
          identityContested: true,
        }
      : route;
  return {
    ...effectiveRoute,
    ...(candidates.length > 1 && {
      sameNamedSiblings: candidates.length - 1,
    }),
    ...describeRouteFlags(effectiveRoute, slug, index, listingGaps, toolContext.sendMessagePins),
  };
}
//@ chunk-k7agbjgj.js:19095-19295 placement
function getMirroredSockets(sessions, cloudListing, rows) {
  let remoteBodies = new Set([
    ...cloudListing.sessions.map((session) => sessionIdBody(session.id)),
    ...(rows ?? []).map((row) => sessionIdBody(row.id)),
  ]);
  return new Set(
    sessions.flatMap((session) =>
      session.bridgeSessionId !== undefined && remoteBodies.has(sessionIdBody(session.bridgeSessionId))
        ? [session.sock]
        : [],
    ),
  );
}
//@ chunk-k7agbjgj.js:19295-19514 placement
function matchesPin(pin, candidate) {
  if (stableSessionKey(candidate) === pin.id) return true;
  if (
    pin.sock === undefined ||
    candidate.kind !== "session" ||
    candidate.sock === undefined ||
    !isSamePath(candidate.sock, pin.sock)
  )
    return false;
  return (
    !isStableSessionAddress(pin.id) ||
    (candidate.stableId === undefined &&
      (candidate.claimedSessionIds ?? []).some((claimedId) => stableSessionAddress(claimedId) === pin.id))
  );
}
//@ chunk-k7agbjgj.js:19514-19951 placement
/**
 * 生成路由附加标记：自固定后已重启、也在远程列表中、同名远程会话被本地认领、搜索被截断。
 */
function describeRouteFlags(route, slug, index, listingGaps, sendMessagePins) {
  let pin = Object.hasOwn(sendMessagePins, slug) ? sendMessagePins[slug] : undefined;
  return {
    ...(route.kind === "local-session" &&
      pin?.sock !== undefined &&
      pin.id === route.pinId &&
      !isSamePath(pin.sock, route.sock) && {
        restartedSincePin: true,
      }),
    ...(route.kind === "local-session" &&
      listingGaps.socksMirroredRemotely.has(route.sock) && {
        alsoListedRemotely: true,
      }),
    ...([...(index.remoteNamesClaimedLocally.get(slug) ?? [])].some(
      (sock) => route.kind !== "local-session" || sock !== route.sock,
    ) && {
      remoteNamesakeClaimedLocally: true,
    }),
    ...(listingGaps.searchTruncated && {
      searchTruncated: true,
    }),
  };
}
export {
  getRemoteSendBlock,
  resolveCrossSessionAddress,
  describeSubagentSender,
  NO_READ_RECEIPT_NOTE,
  NO_READ_RECEIPT_DISPLAY,
  unconfirmedDeliveryNote,
  inboxNoticeNote,
  renamedSessionNote,
  TRUNCATED_SEARCH_PARAGRAPH,
  renamedSessionNoteText,
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
