/**
 * utils/peerAddressing.ts
 *
 * 2.1.316 新增：对等会话寻址
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (20)
 * attribution: placement 20
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename } from "path";
import { isCrossSessionMessagingEnabled } from "./crossSessionMessagingGate.js";
import { logForDebugging } from "./debug.js";
import {
  bridgeListingRows,
  primePeerIdentity,
  warmBridgeListing,
  warmCloudSessions,
} from "./peerSessions/cloudPeers.js";
import {
  ADDRESS_REF_PATTERN,
  describeAgentAddress,
  slugifySessionName,
  normalizeSessionTitle,
  isUntitledName,
  describeLocationWithRemoteControl,
  formatNameWithRef,
} from "./sessionAddresses.js";
import { MAX_SEED_NAME_CHARS } from "./swarm/teammateIds.js";
import { MAIN } from "./sessionPeers.js";
import { TEAM_LEAD } from "./swarm/constants.js";
import { readTeamFileAsync } from "./swarm/teamHelpers.js";
import { formatDuration } from "./format.js";
import { WORD_BOUNDARY_PATTERN, CJK_PUNCTUATION } from "./attachments/atMentions.js";
import { logEvent } from "../services/analytics/index.js";
import { logAtMention } from "./telemetry/thirdPartyEventRecords.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3279284-3279334 placement
/**
 * listLocalPeerSessions：关闭时返回空列表，开启时列出本机存活的其他会话。
 */
async function listLocalPeerSessions() {
  return (await listPeerSessionsSafe()).sessions;
}
//@ chunk-5xgkngpb.js:3279334-3279745 placement
/**
 * 跨会话消息开启时列出本机存活的其他会话；会话记录无法读取时记日志并返回空列表且标记 unavailable。
 */
async function listPeerSessionsSafe() {
  if (isCrossSessionMessagingEnabled()) {
    let {
      listLivePeerSessions,
      SessionRecordsUnreadableError,
    } = require("./udsMessaging/SessionRecordsUnreadableError.lazy.js");
    try {
      return {
        sessions: await listLivePeerSessions(),
        unavailable: false,
      };
    } catch (error) {
      if (error instanceof SessionRecordsUnreadableError) {
        logForDebugging(
          `[agents:local] ${error.message} (${error.code ?? "unknown"}) \u2014 this machine's sessions not searched this call, disclosing`,
          {
            level: "warn",
          },
        );
        return {
          sessions: [],
          unavailable: true,
        };
      }
      throw error;
    }
  }
  return {
    sessions: [],
    unavailable: false,
  };
}
//@ chunk-5xgkngpb.js:3279745-3279790 placement
/**
 * cachedBridgeListingRows：跨会话消息开启时返回缓存的桥接会话行。
 */
function cachedBridgeListingRows(options) {
  if (isCrossSessionMessagingEnabled()) return bridgeListingRows(options);
  return;
}
//@ chunk-5xgkngpb.js:3279790-3279850 placement
async function primeAndGetBridgeRows(options) {
  await primePeerIdentity({
    refresh: false,
  });
  return cachedBridgeListingRows(options);
}
//@ chunk-5xgkngpb.js:3279850-3279895 placement
/**
 * warmBridgeListingIfEnabled：开启时预热桥接会话列表。
 */
function warmBridgeListingIfEnabled(options) {
  if (isCrossSessionMessagingEnabled()) return warmBridgeListing(options);
  return;
}
//@ chunk-5xgkngpb.js:3279929-3279996 placement
var MAX_PEER_SUGGESTIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_SAME_NAME_CANDIDATES;
var regExp_16;
var MAX_QUOTED_MENTION_LENGTH;
var MAX_MENTION_NAME_LENGTH;
deferInit("chunk-5xgkngpb.js:3279929", () => {
  MAX_PEER_SUGGESTIONS = 20;
  MAX_SAME_NAME_CANDIDATES = 3;
  regExp_16 = new RegExp(`\\[${ADDRESS_REF_PATTERN}\\]`, "i");
  MAX_QUOTED_MENTION_LENGTH = 128;
  MAX_MENTION_NAME_LENGTH = MAX_SEED_NAME_CHARS;
});
//@ chunk-5xgkngpb.js:3279996-3281068 placement
/**
 * 解析对等会话的地址（主会话、队友、子代理、本机、云会话）。
 */
function resolvePeerAddress(session, address, now = Date.now()) {
  let described = describeAgentAddress(session, address);
  let inProcess = new Set([slugifySessionName(MAIN)]);
  if (session.teamContext) inProcess.add(slugifySessionName(TEAM_LEAD));
  let external = [];
  for (let candidate of described.candidates)
    if (candidate.kind === "main" || candidate.kind === "teammate" || candidate.kind === "subagent")
      inProcess.add(slugifySessionName(candidate.name));
    else external.push(candidate);
  let lastActiveAt = (candidate) => Math.min(candidate.lastActive ?? 0, now);
  external.sort((left, right) => {
    let localFirst = Number(right.where === "this-machine") - Number(left.where === "this-machine");
    return localFirst !== 0 ? localFirst : lastActiveAt(right) - lastActiveAt(left);
  });
  let seenKeys = new Set();
  let filtered = external.filter((candidate) => {
    let dedupeKey = `${candidate.kind}\x00${candidate.id}\x00${slugifySessionName(candidate.name)}`;
    if (seenKeys.has(dedupeKey)) return false;
    seenKeys.add(dedupeKey);
    return true;
  });
  let namedSessionKeys = new Set();
  for (let session of address.sessions) {
    let normalizedTitle = session.name ? normalizeSessionTitle(session.name) : null;
    if (normalizedTitle)
      namedSessionKeys.add(`session\x00${session.sock}\x00${slugifySessionName(normalizedTitle)}`);
  }
  let defaultNamed = new Set();
  let untitledIds = new Set();
  for (let remoteSession of [...(address.cloud ?? []), ...(address.bridge ?? [])])
    if (isUntitledName(remoteSession.title)) untitledIds.add(remoteSession.id);
  for (let candidate of filtered)
    if (
      (candidate.kind === "cloud-session" || candidate.kind === "bridge-session") &&
      untitledIds.has(candidate.id)
    )
      defaultNamed.add(`${candidate.kind}\x00${candidate.id}\x00${slugifySessionName(candidate.name)}`);
  for (let session of address.sessions)
    if (!session.name && session.cwd) {
      let cwdTitle = normalizeSessionTitle(basename(session.cwd));
      let candidateKey = cwdTitle && `session\x00${session.sock}\x00${slugifySessionName(cwdTitle)}`;
      if (candidateKey && !namedSessionKeys.has(candidateKey)) defaultNamed.add(candidateKey);
    }
  return {
    candidates: filtered,
    inProcess,
    defaultNamed,
  };
}
//@ chunk-5xgkngpb.js:3281068-3281343 placement
/**
 * 判断会话名能否作为 @ 提及目标：不含引号、尖括号、换行和非法字符，不像 agent 名，且长度在上限内（纯 ASCII 与其他字符上限不同）。
 */
function isAddressablePeerName(name) {
  let slug = slugifySessionName(name);
  if (
    name.includes('"') ||
    slug.includes('"') ||
    /[<>]/.test(name) ||
    /[<>]/.test(slug) ||
    /[\n\r\u2028\u2029]/.test(name) ||
    regExp_16.test(name) ||
    regExp_16.test(slug) ||
    slug.startsWith("agent-") ||
    slug.endsWith("(agent)") ||
    slug.length === 0
  )
    return false;
  let nameLength = [...name].length;
  return UNQUOTED_MENTION_NAME_PATTERN.test(name)
    ? nameLength <= MAX_QUOTED_MENTION_LENGTH
    : nameLength <= MAX_MENTION_NAME_LENGTH;
}
//@ chunk-5xgkngpb.js:3281343-3281362 placement
var UNQUOTED_MENTION_NAME_PATTERN = /^[\w-]+$/;
//@ chunk-5xgkngpb.js:3281362-3281562 placement
/**
 * 汇总可寻址对象（会话列表、团队文件、云端、bridge）供 @ 补全与附件使用（切分误归 AgentTool）。
 */
async function resolvePeerAddressFromState(options, address, sourceSession) {
  let teamName = address.teamContext?.teamName;
  let [localSessions, teamFile, bridgeRows] = await Promise.all([
    listLocalPeerSessions(),
    teamName ? readTeamFileAsync(teamName, sourceSession.storageV5) : Promise.resolve(null),
    primeAndGetBridgeRows(options),
  ]);
  return resolvePeerAddress(address, {
    teamFile,
    sessions: localSessions,
    cloud: warmCloudSessions(options),
    bridge: bridgeRows,
  });
}
//@ chunk-5xgkngpb.js:3281562-3281597 placement
function candidateDisplayText(candidate) {
  return formatMentionName(candidate.name);
}
//@ chunk-5xgkngpb.js:3281597-3281650 placement
function formatMentionName(name) {
  return UNQUOTED_MENTION_NAME_PATTERN.test(name) ? `@${name}` : `@"${name}"`;
}
//@ chunk-5xgkngpb.js:3281650-3281826 placement
function describePeerCandidate(candidate, now) {
  let activeSuffix =
    candidate.lastActive === undefined
      ? ""
      : ` \xB7 active ${formatDuration(Math.max(0, now - candidate.lastActive), {
          mostSignificantOnly: true,
        })} ago`;
  return `message session \xB7 ${describeLocationWithRemoteControl(candidate.where)}${activeSuffix}`;
}
//@ chunk-5xgkngpb.js:3281826-3282121 placement
/**
 * 按输入前缀生成 @ 会话提及建议：跳过进程内同名、已排除和不可寻址的候选，最多若干条，附显示文本与"最近活跃"说明。
 */
function suggestPeerMentions(roster, query, now = Date.now()) {
  if (query === "") return [];
  let suggestions = [];
  for (let candidate of roster.candidates) {
    if (suggestions.length >= MAX_PEER_SUGGESTIONS) break;
    let normalizedName = slugifySessionName(candidate.name);
    if (
      roster.inProcess.has(normalizedName) ||
      wasDefaultNamed(roster, candidate) ||
      !normalizedName.startsWith(query) ||
      !isAddressablePeerName(candidate.name)
    )
      continue;
    suggestions.push({
      id: `dm-peer-${candidate.kind}-${candidate.ref}-${normalizedName}`,
      displayText: candidateDisplayText(candidate),
      description: describePeerCandidate(candidate, now),
    });
  }
  return suggestions;
}
//@ chunk-5xgkngpb.js:3282121-3282299 placement
var regExp_17; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3282121", () => {
  regExp_17 = new RegExp(
    String.raw`(?:^|${WORD_BOUNDARY_PATTERN})@(?:"([^"\n]{1,${MAX_MENTION_NAME_LENGTH}})"|([\w-]{1,${MAX_QUOTED_MENTION_LENGTH}})(?=$|[\s,;!?)\]}>'"\u201D\u2019${CJK_PUNCTUATION}]|[.:](?:$|\s)|\[${ADDRESS_REF_PATTERN}\]))(?:[ \t]*\[(${ADDRESS_REF_PATTERN})\])?`,
    "gu",
  );
});
//@ chunk-5xgkngpb.js:3282299-3282613 placement
/**
 * 从文本中提取 @会话 提及（名称与可选引用），去重；同名既有带引用又有不带引用时只保留带引用的。
 */
function parsePeerMentions(text) {
  let mentions = [];
  let seen = new Set();
  for (let match of text.matchAll(regExp_17)) {
    let name = match[1] ?? match[2];
    if (!isAddressablePeerName(name)) continue;
    let ref = match[3];
    let dedupeKey = `${slugifySessionName(name)}\x00${ref ?? ""}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    mentions.push({
      name,
      ref,
    });
  }
  let namesWithRef = new Set(
    mentions
      .filter((mention) => mention.ref !== undefined)
      .map((mention) => slugifySessionName(mention.name)),
  );
  return mentions.filter(
    (mention) => mention.ref !== undefined || !namesWithRef.has(slugifySessionName(mention.name)),
  );
}
//@ chunk-5xgkngpb.js:3282613-3283210 placement
/**
 * 把 @会话 提及解析为目标：有引用时按引用精确匹配；唯一候选直接 resolved；多个候选返回 ask 让用户选择；并记录提及结果打点。
 */
function resolvePeerMentions(mentions, peers) {
  let results = [];
  for (let { name: mentionName, ref } of mentions) {
    let normalizedName = slugifySessionName(mentionName);
    if (peers.inProcess.has(normalizedName)) continue;
    let sameName = peers.candidates.filter(
      (candidate) => slugifySessionName(candidate.name) === normalizedName,
    );
    let eligible = sameName.filter((candidate) => !wasDefaultNamed(peers, candidate));
    let displayName = formatMentionName(mentionName);
    let mentionLabel = ref === undefined ? displayName : `${displayName} [${ref}]`;
    if (ref !== undefined) {
      let refMatch = sameName.find((candidate) => candidate.ref === ref);
      if (refMatch)
        results.push({
          kind: "resolved",
          mention: mentionLabel,
          candidate: toMentionCandidate(refMatch),
        });
      logPeerMentionOutcome(refMatch !== undefined ? "success" : "not_found");
      continue;
    }
    if (eligible.length === 0) continue;
    if (eligible.length === 1 && sameName.length === 1) {
      results.push({
        kind: "resolved",
        mention: mentionLabel,
        candidate: toMentionCandidate(eligible[0]),
      });
      logPeerMentionOutcome("success");
      continue;
    }
    results.push({
      kind: "ask",
      mention: mentionLabel,
      candidates: sameName.slice(0, MAX_SAME_NAME_CANDIDATES).map(toMentionCandidate),
      total: sameName.length,
    });
    logPeerMentionOutcome("ask");
  }
  return results;
}
//@ chunk-5xgkngpb.js:3283210-3283295 placement
function wasDefaultNamed(roster, candidate) {
  return roster.defaultNamed.has(
    `${candidate.kind}\x00${candidate.id}\x00${slugifySessionName(candidate.name)}`,
  );
}
//@ chunk-5xgkngpb.js:3283295-3283351 placement
function toMentionCandidate(refMatch) {
  return {
    token: formatNameWithRef(refMatch),
    where: describeLocationWithRemoteControl(refMatch.where),
  };
}
//@ chunk-5xgkngpb.js:3283351-3283589 placement
function logPeerMentionOutcome(outcome) {
  logEvent(`tengu_at_mention_peer_${outcome}`, {});
  logAtMention({
    mentionType: "peer",
    success: outcome === "success",
  });
  if (outcome === "success") logFeatureOk("input_peer_at_mention");
  else if (outcome === "ask") logFeatureSad("input_peer_at_mention", "ask");
  else logFeatureBad("input_peer_at_mention", "not_found");
}
export {
  parsePeerMentions,
  resolvePeerAddressFromState,
  resolvePeerMentions,
  listLocalPeerSessions,
  cachedBridgeListingRows,
  suggestPeerMentions,
  listPeerSessionsSafe,
  warmBridgeListingIfEnabled,
};
