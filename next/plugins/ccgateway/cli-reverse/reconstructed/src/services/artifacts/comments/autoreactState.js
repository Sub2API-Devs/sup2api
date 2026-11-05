/**
 * services/artifacts/comments/autoreactState.ts
 *
 * 2.1.316 新增：评论自动响应的内存状态与通知解析
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c0pq6qyx.js (6), chunk-r9a43qwr.js (27)
 * attribution: placement 33
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../analytics/growthbook.js";
import {
  TENGU_MADRONE_SPINDLE_CORBEL,
  COMMENT_NOTICE_HEADER,
  COMMENTS_NOTICE_HEADER,
  ARTIFACT_LINE_PREFIX,
  THREAD_LINE_PREFIX,
  SENT_AT_LINE_PREFIX,
  THREADS_LINE_PREFIX,
  MAX_OPEN_SUMMONS,
  DESKTOP_APP,
  MAX_READ_CLAIMS,
  MAX_SUMMON_CLAIMS,
  SUMMON_GRACE_MS,
  SUMMON_POLL_MS,
} from "./commentNotifications.js";
import { parseArtifactUrl } from "../../../tools/ArtifactTool/constants.js";
import { normalizeUuidOrNull } from "../../../utils/agentId.js";
import { recordCommentHandIn, recordUnaccountedComments } from "../shareEntries.js";
import { getLiveState } from "../../liveReplica/liveReplica.js";
import { getCommentsAwaitingReply } from "./commentState.js";
import { sleep } from "../../../utils/sleep.js";
import {
  MAX_ANCHOR_FILES,
  MAX_ANCHORS_PER_FILE,
  resolveAnchorElements,
  ANCHOR_CACHE_MAX_PAGES,
} from "./pageAnchors.js";

//@ chunk-r9a43qwr.js:692-727 placement
function isCommentNotificationGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MADRONE_SPINDLE_CORBEL, false) === true;
}
//@ chunk-r9a43qwr.js:727-796 placement
var ISO_SECOND_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
var NUMBER_STRING_RE = /^[1-9][0-9]{0,5}$/;
//@ chunk-r9a43qwr.js:796-838 placement
function isToClaudeTimestamp(toClaudeAt) {
  return toClaudeAt != null && ISO_SECOND_UTC_RE.test(toClaudeAt);
}
//@ chunk-r9a43qwr.js:838-907 placement
function summonKey(slug, threadId, gestureAt) {
  return `${slug.toLowerCase()}:${threadId.toLowerCase()}:${gestureAt}`;
}
//@ chunk-r9a43qwr.js:907-957 placement
function summonSlugKey(slug, key) {
  return `${slug.toLowerCase()}:*:${key}`;
}
//@ chunk-r9a43qwr.js:957-1038 placement
function isCommentNotificationText(text) {
  let promptText = getPromptText(text);
  return (
    promptText !== null &&
    (promptText.startsWith(COMMENT_NOTICE_HEADER) || promptText.startsWith(COMMENTS_NOTICE_HEADER))
  );
}
//@ chunk-r9a43qwr.js:1038-1418 placement
/**
 * 解析"[Artifact comment sent to Claude]"格式的通知文本，取出 artifact、线程与发送时间。
 */
function parseCommentNotification(notificationText) {
  if (!notificationText.startsWith(COMMENT_NOTICE_HEADER)) return null;
  let lines = notificationText.split(
    `
`,
    4,
  );
  if (lines.length < 4 || lines[0] !== COMMENT_NOTICE_HEADER) return null;
  let line2 = lines[1];
  let line3 = lines[2];
  let line4 = lines[3];
  if (
    !line2.startsWith(ARTIFACT_LINE_PREFIX) ||
    !line3.startsWith(THREAD_LINE_PREFIX) ||
    !line4.startsWith(SENT_AT_LINE_PREFIX)
  )
    return null;
  let slug = parseArtifactUrl(line2.slice(ARTIFACT_LINE_PREFIX.length).trim())?.slug;
  let trimmed = line3.slice(THREAD_LINE_PREFIX.length).trim();
  let sliced = line4.slice(SENT_AT_LINE_PREFIX.length);
  if (slug === undefined || normalizeUuidOrNull(trimmed) === null || !ISO_SECOND_UTC_RE.test(sliced))
    return null;
  return {
    slug,
    threadId: trimmed,
    gestureAt: sliced,
  };
}
//@ chunk-r9a43qwr.js:1418-1792 placement
function parseMultiCommentNotification(text) {
  if (!text.startsWith(COMMENTS_NOTICE_HEADER)) return null;
  let lines = text.split(
    `
`,
    4,
  );
  if (lines.length < 4 || lines[0] !== COMMENTS_NOTICE_HEADER) return null;
  let line2 = lines[1];
  let line3 = lines[2];
  let line4 = lines[3];
  if (
    !line2.startsWith(ARTIFACT_LINE_PREFIX) ||
    !line3.startsWith(THREADS_LINE_PREFIX) ||
    !line4.startsWith(SENT_AT_LINE_PREFIX)
  )
    return null;
  let slug = parseArtifactUrl(line2.slice(ARTIFACT_LINE_PREFIX.length).trim())?.slug;
  let sliced = line3.slice(THREADS_LINE_PREFIX.length);
  let sliced_2 = line4.slice(SENT_AT_LINE_PREFIX.length);
  if (slug === undefined || !NUMBER_STRING_RE.test(sliced) || !ISO_SECOND_UTC_RE.test(sliced_2)) return null;
  return {
    slug,
    count: Number(sliced),
    gestureAt: sliced_2,
  };
}
//@ chunk-r9a43qwr.js:1792-1925 placement
function summonKeyFromNotification(text) {
  let commentNotification = parseCommentNotification(text);
  if (commentNotification !== null)
    return summonKey(commentNotification.slug, commentNotification.threadId, commentNotification.gestureAt);
  let multiCommentNotification = parseMultiCommentNotification(text);
  return multiCommentNotification === null
    ? null
    : summonSlugKey(multiCommentNotification.slug, multiCommentNotification.gestureAt);
}
//@ chunk-r9a43qwr.js:1925-2219 placement
function consumeSeededSummon(promptText) {
  if (promptText.seededSummon !== true) return null;
  let text = getPromptText(promptText.value);
  let key = text === null ? null : summonKeyFromNotification(text);
  if (text === null || key === null) return null;
  let commentNotification = parseCommentNotification(text);
  if (commentNotification !== null)
    recordCommentHandIn(
      commentNotification.slug,
      commentNotification.threadId,
      commentNotification.gestureAt,
    );
  else {
    let multiCommentNotification = parseMultiCommentNotification(text);
    if (multiCommentNotification !== null) recordUnaccountedComments(multiCommentNotification.slug);
  }
  if (promptText.shouldQuery === false) return null;
  addSummonClaim([key]);
  if (commentNotification !== null) rememberOpenSummon(key, commentNotification);
  return key;
}
//@ chunk-r9a43qwr.js:2219-2440 placement
/**
 * 用户提示词是宿主预置的评论召唤时，解析通知得到召唤键（单条或多条评论），记录评论交入并登记为已认领；不是召唤时返回 null。
 */
function takeSeededSummon(promptText) {
  if (promptText.seededSummon !== true || promptText.shouldQuery === false) return null;
  let promptText_2 = getPromptText(promptText.value);
  let key = promptText_2 === null ? null : summonKeyFromNotification(promptText_2);
  if (promptText_2 === null || key === null) return null;
  let commentNotification = parseCommentNotification(promptText_2);
  if (commentNotification !== null)
    recordCommentHandIn(
      commentNotification.slug,
      commentNotification.threadId,
      commentNotification.gestureAt,
    );
  addSummonClaim([key]);
  return key;
}
//@ chunk-r9a43qwr.js:2440-2667 placement
function rememberOpenSummon(notification, commentNotification) {
  let { open } = getLiveState().summonSeeds;
  open.delete(notification);
  open.set(notification, {
    slug: commentNotification.slug.toLowerCase(),
    threadId: commentNotification.threadId.toLowerCase(),
    gestureAt: commentNotification.gestureAt,
  });
  while (open.size > MAX_OPEN_SUMMONS) {
    let oldest = open.keys().next().value;
    if (oldest === undefined) break;
    open.delete(oldest);
  }
}
//@ chunk-r9a43qwr.js:2667-3056 placement
function settleSummonSeed(slug, threadId, text) {
  let { open, settled } = getLiveState().summonSeeds;
  let lower = slug.toLowerCase();
  let lower_2 = threadId.toLowerCase();
  for (let [key, entry] of open) if (entry.slug === lower && entry.threadId === lower_2) open.delete(key);
  let parsed = text == null ? null : parseCommentNotification(text);
  if (parsed !== null && parsed.slug.toLowerCase() === lower && parsed.threadId.toLowerCase() === lower_2) {
    let key = summonKey(parsed.slug, parsed.threadId, parsed.gestureAt);
    settled.delete(key);
    settled.add(key);
    while (settled.size > MAX_OPEN_SUMMONS) {
      let oldest = settled.values().next().value;
      if (oldest === undefined) break;
      settled.delete(oldest);
    }
  }
}
//@ chunk-r9a43qwr.js:3056-3142 placement
/**
 * 导出函数 `isSummonSettled`：参数 e，返回 getLiveState().summonSeeds.settled.has(Me(e.slug, e.threadId, e.gestureAt))。
 */
function isSummonSettled(key) {
  return getLiveState().summonSeeds.settled.has(summonKey(key.slug, key.threadId, key.gestureAt));
}
//@ chunk-r9a43qwr.js:3142-3225 placement
/**
 * 导出函数 `openSummonFor`：参数 e，返回 getLiveState().summonSeeds.open.get(Me(e.slug, e.threadId, e.gestureAt))。
 */
function openSummonFor(key) {
  return getLiveState().summonSeeds.open.get(summonKey(key.slug, key.threadId, key.gestureAt));
}
//@ chunk-r9a43qwr.js:3225-3396 placement
/**
 * 判断提示词来自本地真实用户输入：已声明、非远程 IO、非合成、非对等投递、没有入站来源，且客户端平台为空或是桌面应用。
 */
function isLocalDesktopPrompt(text) {
  return (
    text.declared === true &&
    !text.isRemoteIO &&
    text.isSynthetic !== true &&
    !text.peerDelivered &&
    text.inboundOrigin === undefined &&
    (text.clientPlatform === undefined || text.clientPlatform === DESKTOP_APP)
  );
}
//@ chunk-r9a43qwr.js:3396-3561 placement
/**
 * 为线程里等待回复且时间戳有效的评论生成召唤键，登记为已读认领（有上限），返回数量。
 */
function claimAwaitingReplies(slug, ids) {
  let out = [];
  for (let id of ids)
    for (let comment of getCommentsAwaitingReply(id))
      if (isToClaudeTimestamp(comment.toClaudeAt)) out.push(summonKey(slug, id.id, comment.toClaudeAt));
  addToBoundedSet(getLiveState().summonSeeds.readClaims, out, MAX_READ_CLAIMS);
  return out.length;
}
//@ chunk-r9a43qwr.js:3561-3694 placement
/**
 * 把一组值按最近使用顺序加入集合（已有的移到末尾），超过上限时淘汰最早的。
 */
function addToBoundedSet(set, values, max) {
  for (let value of values) {
    set.delete(value);
    set.add(value);
  }
  while (set.size > max) {
    let oldest = set.values().next().value;
    if (oldest === undefined) break;
    set.delete(oldest);
  }
}
//@ chunk-r9a43qwr.js:3694-3739 placement
function addSummonClaim(key) {
  addToBoundedSet(getLiveState().summonSeeds.claims, key, MAX_SUMMON_CLAIMS);
}
//@ chunk-r9a43qwr.js:3739-3761 placement
var DEFAULT_SEED_OPTIONS = {
  hostSeeded: true,
};
//@ chunk-r9a43qwr.js:3761-3860 placement
function hasSummonClaim(slug, id, slugArg, options = DEFAULT_SEED_OPTIONS) {
  return (
    getLiveState().summonSeeds.readClaims.has(summonKey(slug, id, slugArg)) ||
    (options.hostSeeded && hasHostClaim(slug, id, slugArg))
  );
}
//@ chunk-r9a43qwr.js:3860-3949 placement
function hasHostClaim(slug, id, idArg) {
  let { claims } = getLiveState().summonSeeds;
  return claims.has(summonKey(slug, id, idArg)) || claims.has(summonSlugKey(slug, idArg));
}
//@ chunk-r9a43qwr.js:3949-4017 placement
function allSummonsClaimed(slug, threadId, ids, options = DEFAULT_SEED_OPTIONS) {
  return ids.length > 0 && ids.every((id) => hasSummonClaim(slug, threadId, id, options));
}
//@ chunk-r9a43qwr.js:4017-4187 placement
/**
 * 消费召唤种子的认领记录：校验通过后删除对应的读认领（由宿主预置时一并删除认领）。
 */
function consumeSummonClaims(slug, threadId, ids, options = DEFAULT_SEED_OPTIONS) {
  if (!allSummonsClaimed(slug, threadId, ids, options)) return false;
  let { claims, readClaims } = getLiveState().summonSeeds;
  for (let claimId of ids) {
    readClaims.delete(summonKey(slug, threadId, claimId));
    if (options.hostSeeded) claims.delete(summonKey(slug, threadId, claimId));
  }
  return true;
}
//@ chunk-r9a43qwr.js:4187-4276 placement
function consumeReadClaims(slug, id, ids) {
  let { readClaims } = getLiveState().summonSeeds;
  for (let claimId of ids) readClaims.delete(summonKey(slug, id, claimId));
}
//@ chunk-r9a43qwr.js:4276-4488 placement
/**
 * 在宽限期内轮询等待某线程的召唤认领出现（可中止），到期后再检查一次。
 */
async function waitForSummonClaim(slug, threadId, ids, signal) {
  let graceMsOverride = getLiveState().summonSeeds.graceMsOverride ?? SUMMON_GRACE_MS;
  let deadline = Date.now() + graceMsOverride;
  while (Date.now() < deadline) {
    if (signal.aborted) return false;
    if (allSummonsClaimed(slug, threadId, ids)) return true;
    await sleep(Math.min(SUMMON_POLL_MS, Math.max(1, deadline - Date.now())), signal);
  }
  return allSummonsClaimed(slug, threadId, ids);
}
//@ chunk-r9a43qwr.js:4488-4644 placement
/**
 * 取提示词文本：字符串直接返回；内容块数组取最后一个 text 块的文字；否则 null。
 */
function getPromptText(prompt) {
  if (typeof prompt === "string") return prompt;
  if (Array.isArray(prompt)) {
    let last = prompt.at(-1);
    if (last?.type === "text" && typeof last.text === "string") return last.text;
  }
  return null;
}
//@ chunk-c0pq6qyx.js:31245-31400 placement
function getWholeFileAnchor(thread) {
  return thread.anchor_path !== undefined &&
    (thread.span_quote === undefined || thread.span_quote === "") &&
    thread.anchor_file_degraded !== true &&
    thread.carried !== true
    ? thread.anchor_path
    : undefined;
}
//@ chunk-c0pq6qyx.js:31400-31518 placement
function getLatestCommentTime(thread) {
  return thread.comments.reduce(
    (acc, comment) =>
      comment.created_at !== undefined && comment.created_at > acc ? comment.created_at : acc,
    thread.created_at ?? "",
  );
}
//@ chunk-c0pq6qyx.js:31518-33579 placement
async function collectThreadAnchorSnippets(threads, readAnchorFile, options = {}) {
  let { onlyThreadIds, memoKey, regionKids } = options;
  let liveState = getLiveState();
  let { anchorSnippets, accountEpoch } = liveState;
  let readMemo = (anchorFile) =>
    memoKey === undefined ? undefined : anchorSnippets.get(`${memoKey}|${anchorFile ?? ""}`);
  let anchorOf = (thread) => {
    if (onlyThreadIds !== undefined && !onlyThreadIds.has(thread.id)) return;
    let wholeFileAnchor = getWholeFileAnchor(thread);
    if (wholeFileAnchor === undefined) return;
    let kids = thread.anchor_region ? regionKids?.get(thread.id) : undefined;
    return kids === undefined || kids.length === 0
      ? {
          path: wholeFileAnchor,
          key: wholeFileAnchor,
        }
      : {
          path: wholeFileAnchor,
          kids,
          key: `${wholeFileAnchor}|k${kids.join(",")}`,
        };
  };
  let rankOf = (thread) =>
    (thread.comments.some((comment) => comment.sent_to_claude === true) ? 0 : 2) + (thread.resolved ? 1 : 0);
  let sorted = threads
    .filter((thread) => anchorOf(thread) !== undefined)
    .sort((a, b) => rankOf(a) - rankOf(b) || getLatestCommentTime(b).localeCompare(getLatestCommentTime(a)));
  let requestsByFile = new Map();
  let memoHitsByFile = new Map();
  for (let thread of sorted) {
    let anchor = anchorOf(thread);
    let memo = readMemo(thread.anchor_file);
    if (memo?.has(anchor.key)) {
      let perFile = memoHitsByFile.get(thread.anchor_file) ?? new Map();
      perFile.set(anchor.key, memo.get(anchor.key));
      memoHitsByFile.set(thread.anchor_file, perFile);
      continue;
    }
    if (!requestsByFile.has(thread.anchor_file)) {
      if (requestsByFile.size >= MAX_ANCHOR_FILES) continue;
      requestsByFile.set(thread.anchor_file, {
        paths: new Set(),
        requests: new Map(),
      });
    }
    let { paths, requests } = requestsByFile.get(thread.anchor_file);
    if (paths.size < MAX_ANCHORS_PER_FILE || paths.has(anchor.path)) {
      paths.add(anchor.path);
      requests.set(anchor.key, anchor);
    }
  }
  if (memoKey !== undefined)
    for (let key of memoHitsByFile.keys()) {
      let memoKeyWithPath = `${memoKey}|${key ?? ""}`;
      let cached = anchorSnippets.get(memoKeyWithPath);
      if (cached !== undefined) {
        anchorSnippets.delete(memoKeyWithPath);
        anchorSnippets.set(memoKeyWithPath, cached);
      }
    }
  let out = new Map();
  await Promise.all(
    [...requestsByFile].map(async ([path, { paths, requests }]) => {
      let read = await readAnchorFile(path).catch(() => {
        return;
      });
      if (read === undefined) return;
      let snippets = new Map();
      for (let { path, kids } of requests.values())
        if (kids !== undefined) snippets.set(path, [...(snippets.get(path) ?? []), ...kids]);
      let anchorElements = await resolveAnchorElements(read, [...paths], snippets);
      let seenKeys = new Set();
      let pending = new Map();
      for (let { path, kids, key } of requests.values()) {
        let located = anchorElements.get(path);
        if (located === undefined) {
          pending.set(key, null);
          continue;
        }
        let mapped = kids?.map((kid) => located.kids?.get(kid));
        if (mapped?.includes(undefined)) seenKeys.add(key);
        let known = seenKeys.has(key) ? [] : mapped?.filter((text) => typeof text === "string");
        pending.set(key, {
          snippet: located.snippet,
          ...(known !== undefined &&
            known.length > 0 && {
              inside: known,
            }),
        });
      }
      out.set(path, pending);
      if (memoKey === undefined || liveState.accountEpoch !== accountEpoch) return;
      let cacheKey = `${memoKey}|${path ?? ""}`;
      let perFileOut = anchorSnippets.get(cacheKey) ?? new Map();
      for (let [key, value] of pending) if (!seenKeys.has(key)) perFileOut.set(key, value);
      anchorSnippets.delete(cacheKey);
      anchorSnippets.set(cacheKey, perFileOut);
      while (anchorSnippets.size > ANCHOR_CACHE_MAX_PAGES)
        anchorSnippets.delete(anchorSnippets.keys().next().value);
    }),
  );
  return threads.map((thread) => {
    let anchor = anchorOf(thread);
    if (anchor === undefined) return thread;
    let snippet =
      out.get(thread.anchor_file)?.get(anchor.key) ??
      memoHitsByFile.get(thread.anchor_file)?.get(anchor.key) ??
      undefined;
    return snippet === undefined || snippet === null
      ? thread
      : {
          ...thread,
          anchor_snippet: snippet.snippet,
          ...(snippet.inside !== undefined && {
            region_inside: [...snippet.inside],
          }),
        };
  });
}
//@ chunk-c0pq6qyx.js:33579-33674 placement
function rememberSummonAnswer(answer) {
  let entry = {
    ...answer,
    consumed: false,
  };
  getLiveState().summonAnswers.set(answer.expectedToolUseId, entry);
  return entry;
}
//@ chunk-c0pq6qyx.js:33674-33946 placement
/**
 * 某次回复工具调用对应的召唤答复还没用过且属于同一线程时，标记为已用；返回是否算作回应召唤，或需要延续的回复 id。
 */
function consumeSummonAnswer(slug, threadId, toolUseId) {
  let entry = toolUseId === undefined ? undefined : getLiveState().summonAnswers.get(toolUseId);
  if (entry === undefined || entry.consumed || entry.slug !== slug || entry.threadId !== threadId)
    return {
      answersSummon: false,
    };
  entry.consumed = true;
  return entry.continuesReplyId === undefined
    ? {
        answersSummon: true,
      }
    : {
        answersSummon: false,
        continuesReplyId: entry.continuesReplyId,
      };
}
//@ chunk-c0pq6qyx.js:33946-34050 placement
/**
 * 若召唤回答仍是当前记录，则按预期工具调用 id 删除它。
 */
function clearSummonAnswer(toolUseId) {
  let summonAnswers = getLiveState().summonAnswers;
  if (summonAnswers.get(toolUseId.expectedToolUseId) === toolUseId)
    summonAnswers.delete(toolUseId.expectedToolUseId);
}
export {
  isLocalDesktopPrompt,
  takeSeededSummon,
  consumeSeededSummon,
  getPromptText,
  parseCommentNotification,
  isCommentNotificationText,
  isCommentNotificationGateOn,
  openSummonFor,
  isSummonSettled,
  rememberSummonAnswer,
  clearSummonAnswer,
  hasSummonClaim,
  isToClaudeTimestamp,
  hasHostClaim,
  consumeReadClaims,
  consumeSummonClaims,
  waitForSummonClaim,
  settleSummonSeed,
  collectThreadAnchorSnippets,
  claimAwaitingReplies,
  consumeSummonAnswer,
};
