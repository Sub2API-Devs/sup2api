/**
 * commands/send-to-project/projectCompletions.ts
 *
 * 2.1.316 新增。/send-to-project 的 Project 名补全。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ghbe0g3f.js (9)
 * attribution: placement 9
 */
import { HostScoped } from "../../utils/hostScoped.js";
import {
  listPersonalProjects,
  FTo,
  parseSendToProjectArgs,
  lookupProjectByName,
  indexProjectsByName,
} from "./projectArgs.js";
import { kht, H$t, kNs } from "../../tools/ContinueInProjectsTool/submit.js";
import { getOauthAccountInfo } from "../../utils/auth.js";
import { getRootSession } from "../../bootstrap/state.js";
import {
  normalizeProjectName,
  ChannelApiError,
  isRetryableChannelError,
} from "../../services/projects/channelApi.js";
import { lastActiveLabel } from "../../components/projects/continueInProjectsTargetRequest.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-ghbe0g3f.js:3704-3747 placement
var A = 30000,
  T = 300000,
  N = 15000,
  S = 60000,
  I = 1e4;
//@ chunk-ghbe0g3f.js:3747-3794 placement
class P {
  listing = null;
  inflight = null;
  failed = null;
}
//@ chunk-ghbe0g3f.js:3794-3817 placement
var _ = new HostScoped(() => new P());
//@ chunk-ghbe0g3f.js:3817-4060 placement
async function getProjectNameCompletions(n, o, e = listPersonalProjects) {
  if (!(kht() && !H$t()) && !kNs()) return [];
  let i = parseProjectCompletionPrefix(n, o);
  if (i === null) return [];
  let s = getOauthAccountInfo(),
    r = await getCachedProjectListing(
      _.of(getRootSession().host),
      `${s?.accountUuid ?? ""}:${s?.organizationUuid ?? ""}`,
      Date.now(),
      e,
    );
  return r === null ? [] : matchProjectCompletions(r.offered, i, new Date());
}
/**
 * 从已输入的参数判断是否在补全项目名：未开引号时只有单个普通词才补全；开了引号时返回已输入的词与正在输入的部分。名字里含引号时不补全。
 */
//@ chunk-ghbe0g3f.js:4060-4403 placement
function parseProjectCompletionPrefix(n, o) {
  let [e, ...i] = [...n, o];
  if (e === void 0) return null;
  if (!FTo.test(e))
    return n.length === 0 && !e.startsWith("--") && parseSendToProjectArgs(e).kind === "note"
      ? { before: [], partial: o, opened: !1 }
      : null;
  let s = e.length === 1 && i.length > 0 ? i : [e.slice(1), ...i];
  return s.some((r) => /["\u201C\u201D]/.test(r))
    ? null
    : { before: s.slice(0, -1), partial: s.at(-1) ?? "", opened: n.length > 0 };
}
/**
 * 用已输入词与部分词匹配项目名（逐词规范化比较），按完全相等、前缀、包含三档排序，生成带引号的补全值与"最后活跃"说明。
 */
//@ chunk-ghbe0g3f.js:4403-4913 placement
function matchProjectCompletions(offered, { before: before, partial: partial, opened: opened }, now) {
  let typedWords = before.map((g) => normalizeProjectName(g)),
    partialFolded = normalizeProjectName(partial),
    exactMatches = [],
    prefixMatches = [],
    containsMatches = [];
  for (let { project: project, words: words, folded: folded } of offered) {
    let joined = folded.slice(typedWords.length).join(" ");
    if (
      folded.length <= typedWords.length ||
      typedWords.some((y, C) => folded[C] !== y) ||
      (typedWords.length > 0 && !joined.startsWith(partialFolded)) ||
      !joined.includes(partialFolded)
    )
      continue;
    let h = lastActiveLabel(project.lastMessageAtMs, now),
      p = {
        value: `${opened ? "" : '"'}${words.slice(typedWords.length).join(" ")}"`,
        description: typedWords.length > 0 ? `${words.join(" ")} \xB7 ${h}` : h,
      };
    if (joined === partialFolded) exactMatches.push(p);
    else if (joined.startsWith(partialFolded)) prefixMatches.push(p);
    else containsMatches.push(p);
  }
  return exactMatches.length > 0 ? exactMatches : [...prefixMatches, ...containsMatches];
}
//@ chunk-ghbe0g3f.js:4913-5200 placement
function toCompletableProjects(n, o) {
  return n.flatMap((e) => {
    let filtered = e.name.split(/\s+/).filter(Boolean),
      mapped = filtered.map((a) => normalizeProjectName(a)),
      r = parseSendToProjectArgs(`"${filtered.join(" ")}"`),
      l = r.kind === "name" && r.note === "" ? lookupProjectByName(r.name, o) : null;
    return l?.kind === "match" && l.project.id === e.id && mapped.join(" ") === normalizeProjectName(e.name)
      ? [{ project: e, words: filtered, folded: mapped }]
      : [];
  });
}
/**
 * 按登录身份缓存项目列表：过期且没有在途请求、最近也没失败时发起刷新；缓存够新返回缓存，否则等在途请求；身份不符返回 null。
 */
//@ chunk-ghbe0g3f.js:5200-5703 placement
async function getCachedProjectListing(cache, login, now, fetchProjects) {
  let listing = cache.listing?.login === login ? cache.listing : null,
    r = listing === null ? 1 / 0 : now - listing.fetchedAt,
    l = cache.failed?.login === login && now - cache.failed.at < (cache.failed.refused ? S : N);
  if (r >= A && cache.inflight?.login !== login && !l) {
    let m = fetchProjectListing(login, fetchProjects).then((u) => {
      if (cache.inflight?.promise === m)
        if (((cache.inflight = null), u.listing === null))
          cache.failed = { login: login, at: Date.now(), refused: u.refused };
        else cache.listing = u.listing;
      return u.listing;
    });
    cache.inflight = { login: login, promise: m };
  }
  if (listing !== null && r < T) return listing;
  let inflight = cache.inflight;
  if (inflight === null || inflight.login !== login) return null;
  return inflight.promise;
}
/**
 * 带超时拉取个人项目列表并转成补全候选；失败记调试日志，返回 listing=null 与是否被服务端拒绝。
 */
//@ chunk-ghbe0g3f.js:5703-6008 placement
async function fetchProjectListing(n, o) {
  try {
    let { projects: projects, typedNames: typedNames } = await o(AbortSignal.timeout(I), void 0);
    return {
      listing: {
        login: n,
        offered: toCompletableProjects(projects, indexProjectsByName(projects, typedNames)),
        fetchedAt: Date.now(),
      },
    };
  } catch (error) {
    return (
      logForDebugging(`[send-to-project] listing for completions failed: ${errorMessage(error)}`, {
        level: "warn",
      }),
      { listing: null, refused: error instanceof ChannelApiError && !isRetryableChannelError(error) }
    );
  }
}
