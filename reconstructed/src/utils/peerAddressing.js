/**
 * utils/peerAddressing.ts
 *
 * 2.1.316 新增：对等会话寻址
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (20)
 * attribution: placement 20
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

//@ chunk-e6aww6q8.js:3194653-3194703 placement
/**
 * listLocalPeerSessions：关闭时返回空列表，开启时列出本机存活的其他会话。
 */
async function listLocalPeerSessions() {
  return (await listPeerSessionsSafe()).sessions;
}
//@ chunk-e6aww6q8.js:3194703-3195114 placement
/**
 * 跨会话消息开启时列出本机存活的其他会话；会话记录无法读取时记日志并返回空列表且标记 unavailable。
 */
async function listPeerSessionsSafe() {
  if (isCrossSessionMessagingEnabled()) {
    let { listLivePeerSessions, SessionRecordsUnreadableError } = require("./chunk-ewxn4535.js");
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
//@ chunk-e6aww6q8.js:3195114-3195159 placement
/**
 * cachedBridgeListingRows：跨会话消息开启时返回缓存的桥接会话行。
 */
function cachedBridgeListingRows(e) {
  if (isCrossSessionMessagingEnabled()) return bridgeListingRows(e);
  return;
}
//@ chunk-e6aww6q8.js:3195159-3195219 placement
async function primeAndGetBridgeRows(e) {
  await primePeerIdentity({
    refresh: false,
  });
  return cachedBridgeListingRows(e);
}
//@ chunk-e6aww6q8.js:3195219-3195264 placement
/**
 * warmBridgeListingIfEnabled：开启时预热桥接会话列表。
 */
function warmBridgeListingIfEnabled(e) {
  if (isCrossSessionMessagingEnabled()) return warmBridgeListing(e);
  return;
}
//@ chunk-e6aww6q8.js:3195298-3195365 placement
var MAX_PEER_SUGGESTIONS = 20;
var MAX_SAME_NAME_CANDIDATES = 3;
var regExp_14 = new RegExp(`\\[${ADDRESS_REF_PATTERN}\\]`, "i");
var MAX_QUOTED_MENTION_LENGTH = 128;
var MAX_MENTION_NAME_LENGTH = MAX_SEED_NAME_CHARS;
//@ chunk-e6aww6q8.js:3195365-3196434 placement
/**
 * 解析对等会话的地址（主会话、队友、子代理、本机、云会话）。
 */
function resolvePeerAddress(e, n, r = Date.now()) {
  let s = describeAgentAddress(e, n);
  let h = new Set([slugifySessionName(MAIN)]);
  if (e.teamContext) h.add(slugifySessionName(TEAM_LEAD));
  let y = [];
  for (let candidate of s.candidates)
    if (candidate.kind === "main" || candidate.kind === "teammate" || candidate.kind === "subagent")
      h.add(slugifySessionName(candidate.name));
    else y.push(candidate);
  let S = (Se) => Math.min(Se.lastActive ?? 0, r);
  y.sort((Se, ke) => {
    let we = Number(ke.where === "this-machine") - Number(Se.where === "this-machine");
    return we !== 0 ? we : S(ke) - S(Se);
  });
  let w = new Set();
  let filtered = y.filter((Se) => {
    let ke = `${Se.kind}\x00${Se.id}\x00${slugifySessionName(Se.name)}`;
    if (w.has(ke)) return false;
    w.add(ke);
    return true;
  });
  let G = new Set();
  for (let session of n.sessions) {
    let ke = session.name ? normalizeSessionTitle(session.name) : null;
    if (ke) G.add(`session\x00${session.sock}\x00${slugifySessionName(ke)}`);
  }
  let q = new Set();
  let Z = new Set();
  for (let Se of [...(n.cloud ?? []), ...(n.bridge ?? [])]) if (isUntitledName(Se.title)) Z.add(Se.id);
  for (let Se of filtered)
    if ((Se.kind === "cloud-session" || Se.kind === "bridge-session") && Z.has(Se.id))
      q.add(`${Se.kind}\x00${Se.id}\x00${slugifySessionName(Se.name)}`);
  for (let session of n.sessions)
    if (!session.name && session.cwd) {
      let ke = normalizeSessionTitle(basename(session.cwd));
      let we = ke && `session\x00${session.sock}\x00${slugifySessionName(ke)}`;
      if (we && !G.has(we)) q.add(we);
    }
  return {
    candidates: filtered,
    inProcess: h,
    defaultNamed: q,
  };
}
//@ chunk-e6aww6q8.js:3196434-3196709 placement
/**
 * 判断会话名能否作为 @ 提及目标：不含引号、尖括号、换行和非法字符，不像 agent 名，且长度在上限内（纯 ASCII 与其他字符上限不同）。
 */
function isAddressablePeerName(name) {
  let n = slugifySessionName(name);
  if (
    name.includes('"') ||
    n.includes('"') ||
    /[<>]/.test(name) ||
    /[<>]/.test(n) ||
    /[\n\r\u2028\u2029]/.test(name) ||
    regExp_14.test(name) ||
    regExp_14.test(n) ||
    n.startsWith("agent-") ||
    n.endsWith("(agent)") ||
    n.length === 0
  )
    return false;
  let r = [...name].length;
  return UNQUOTED_MENTION_NAME_PATTERN.test(name)
    ? r <= MAX_QUOTED_MENTION_LENGTH
    : r <= MAX_MENTION_NAME_LENGTH;
}
//@ chunk-e6aww6q8.js:3196709-3196728 placement
var UNQUOTED_MENTION_NAME_PATTERN = /^[\w-]+$/;
//@ chunk-e6aww6q8.js:3196728-3196928 placement = resolveTeamName (0.412)
/**
 * 汇总可寻址对象（会话列表、团队文件、云端、bridge）供 @ 补全与附件使用（切分误归 AgentTool）。
 */
async function resolveTeamName(session, n, r) {
  let teamName = n.teamContext?.teamName;
  let [h, y, S] = await Promise.all([
    listLocalPeerSessions(),
    teamName ? readTeamFileAsync(teamName, r.storageV5) : Promise.resolve(null),
    primeAndGetBridgeRows(session),
  ]);
  return resolvePeerAddress(n, {
    teamFile: y,
    sessions: h,
    cloud: warmCloudSessions(session),
    bridge: S,
  });
}
//@ chunk-e6aww6q8.js:3196928-3196963 placement
function candidateDisplayText(candidate) {
  return formatMentionName(candidate.name);
}
//@ chunk-e6aww6q8.js:3196963-3197016 placement
function formatMentionName(e) {
  return UNQUOTED_MENTION_NAME_PATTERN.test(e) ? `@${e}` : `@"${e}"`;
}
//@ chunk-e6aww6q8.js:3197016-3197192 placement
function describePeerCandidate(candidate, n) {
  let r =
    candidate.lastActive === undefined
      ? ""
      : ` \xB7 active ${formatDuration(Math.max(0, n - candidate.lastActive), {
          mostSignificantOnly: true,
        })} ago`;
  return `message session \xB7 ${describeLocationWithRemoteControl(candidate.where)}${r}`;
}
//@ chunk-e6aww6q8.js:3197192-3197487 placement
/**
 * 按输入前缀生成 @ 会话提及建议：跳过进程内同名、已排除和不可寻址的候选，最多若干条，附显示文本与"最近活跃"说明。
 */
function suggestPeerMentions(roster, n, r = Date.now()) {
  if (n === "") return [];
  let suggestions = [];
  for (let candidate of roster.candidates) {
    if (suggestions.length >= MAX_PEER_SUGGESTIONS) break;
    let normalizedName = slugifySessionName(candidate.name);
    if (
      roster.inProcess.has(normalizedName) ||
      wasDefaultNamed(roster, candidate) ||
      !normalizedName.startsWith(n) ||
      !isAddressablePeerName(candidate.name)
    )
      continue;
    suggestions.push({
      id: `dm-peer-${candidate.kind}-${candidate.ref}-${normalizedName}`,
      displayText: candidateDisplayText(candidate),
      description: describePeerCandidate(candidate, r),
    });
  }
  return suggestions;
}
//@ chunk-e6aww6q8.js:3197487-3197665 placement
var regExp_15 = new RegExp(
  String.raw`(?:^|${WORD_BOUNDARY_PATTERN})@(?:"([^"\n]{1,${MAX_MENTION_NAME_LENGTH}})"|([\w-]{1,${MAX_QUOTED_MENTION_LENGTH}})(?=$|[\s,;!?)\]}>'"\u201D\u2019${CJK_PUNCTUATION}]|[.:](?:$|\s)|\[${ADDRESS_REF_PATTERN}\]))(?:[ \t]*\[(${ADDRESS_REF_PATTERN})\])?`,
  "gu",
);
//@ chunk-e6aww6q8.js:3197665-3197979 placement
/**
 * 从文本中提取 @会话 提及（名称与可选引用），去重；同名既有带引用又有不带引用时只保留带引用的。
 */
function parsePeerMentions(e) {
  let mentions = [];
  let seen = new Set();
  for (let match of e.matchAll(regExp_15)) {
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
//@ chunk-e6aww6q8.js:3197979-3198574 placement
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
    let eligible = sameName.filter((q) => !wasDefaultNamed(peers, q));
    let displayName = formatMentionName(mentionName);
    let mentionLabel = ref === undefined ? displayName : `${displayName} [${ref}]`;
    if (ref !== undefined) {
      let refMatch = sameName.find((Z) => Z.ref === ref);
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
//@ chunk-e6aww6q8.js:3198574-3198659 placement
function wasDefaultNamed(e, n) {
  return e.defaultNamed.has(`${n.kind}\x00${n.id}\x00${slugifySessionName(n.name)}`);
}
//@ chunk-e6aww6q8.js:3198659-3198715 placement
function toMentionCandidate(refMatch) {
  return {
    token: formatNameWithRef(refMatch),
    where: describeLocationWithRemoteControl(refMatch.where),
  };
}
//@ chunk-e6aww6q8.js:3198715-3198953 placement
function logPeerMentionOutcome(e) {
  logEvent(`tengu_at_mention_peer_${e}`, {});
  logAtMention({
    mentionType: "peer",
    success: e === "success",
  });
  if (e === "success") logFeatureOk("input_peer_at_mention");
  else if (e === "ask") logFeatureSad("input_peer_at_mention", "ask");
  else logFeatureBad("input_peer_at_mention", "not_found");
}
export {
  resolveTeamName,
  suggestPeerMentions,
  listLocalPeerSessions,
  cachedBridgeListingRows,
  parsePeerMentions,
  resolvePeerMentions,
  listPeerSessionsSafe,
  warmBridgeListingIfEnabled,
};
