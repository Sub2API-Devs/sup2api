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
  LEADING_QUOTE_PATTERN,
  parseSendToProjectArgs,
  lookupProjectByName,
  indexProjectsByName,
} from "./projectArgs.js";
import {
  canOfferSendToProject,
  alwaysFalseRemoteGate,
  alwaysFalseGate,
} from "../../tools/ContinueInProjectsTool/submit.js";
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
var PROJECT_LIST_TTL_MS = 30000;
var PROJECT_LIST_MAX_STALE_MS = 300000;
var PROJECT_LIST_FAILED_COOLDOWN_MS = 15000;
var PROJECT_LIST_REFUSED_COOLDOWN_MS = 60000;
var PROJECT_LIST_TIMEOUT_MS = 1e4;
//@ chunk-ghbe0g3f.js:3747-3794 placement
class ProjectListCache {
  listing = null;
  inflight = null;
  failed = null;
}
//@ chunk-ghbe0g3f.js:3794-3817 placement
var _ = new HostScoped(() => new ProjectListCache());
//@ chunk-ghbe0g3f.js:3817-4060 placement
async function getProjectNameCompletions(args, token, fetchProjects = listPersonalProjects) {
  if (!(canOfferSendToProject() && !alwaysFalseRemoteGate()) && !alwaysFalseGate()) return [];
  let projectCompletionPrefix = parseProjectCompletionPrefix(args, token);
  if (projectCompletionPrefix === null) return [];
  let oauthAccountInfo = getOauthAccountInfo();
  let cachedProjectListing = await getCachedProjectListing(
    _.of(getRootSession().host),
    `${oauthAccountInfo?.accountUuid ?? ""}:${oauthAccountInfo?.organizationUuid ?? ""}`,
    Date.now(),
    fetchProjects,
  );
  return cachedProjectListing === null
    ? []
    : matchProjectCompletions(cachedProjectListing.offered, projectCompletionPrefix, new Date());
}
//@ chunk-ghbe0g3f.js:4060-4403 placement
/**
 * 从已输入的参数判断是否在补全项目名：未开引号时只有单个普通词才补全；开了引号时返回已输入的词与正在输入的部分。名字里含引号时不补全。
 */
function parseProjectCompletionPrefix(args, token) {
  let [first, ...rest] = [...args, token];
  if (first === undefined) return null;
  if (!LEADING_QUOTE_PATTERN.test(first))
    return args.length === 0 && !first.startsWith("--") && parseSendToProjectArgs(first).kind === "note"
      ? {
          before: [],
          partial: token,
          opened: false,
        }
      : null;
  let tokens = first.length === 1 && rest.length > 0 ? rest : [first.slice(1), ...rest];
  return tokens.some((token) => /["\u201C\u201D]/.test(token))
    ? null
    : {
        before: tokens.slice(0, -1),
        partial: tokens.at(-1) ?? "",
        opened: args.length > 0,
      };
}
//@ chunk-ghbe0g3f.js:4403-4913 placement
/**
 * 用已输入词与部分词匹配项目名（逐词规范化比较），按完全相等、前缀、包含三档排序，生成带引号的补全值与"最后活跃"说明。
 */
function matchProjectCompletions(offered, { before, partial, opened }, now) {
  let typedWords = before.map((word) => normalizeProjectName(word));
  let partialFolded = normalizeProjectName(partial);
  let exactMatches = [];
  let prefixMatches = [];
  let containsMatches = [];
  for (let { project, words, folded } of offered) {
    let joined = folded.slice(typedWords.length).join(" ");
    if (
      folded.length <= typedWords.length ||
      typedWords.some((typedWord, index) => folded[index] !== typedWord) ||
      (typedWords.length > 0 && !joined.startsWith(partialFolded)) ||
      !joined.includes(partialFolded)
    )
      continue;
    let recency = lastActiveLabel(project.lastMessageAtMs, now);
    let completion = {
      value: `${opened ? "" : '"'}${words.slice(typedWords.length).join(" ")}"`,
      description: typedWords.length > 0 ? `${words.join(" ")} \xB7 ${recency}` : recency,
    };
    if (joined === partialFolded) exactMatches.push(completion);
    else if (joined.startsWith(partialFolded)) prefixMatches.push(completion);
    else containsMatches.push(completion);
  }
  return exactMatches.length > 0 ? exactMatches : [...prefixMatches, ...containsMatches];
}
//@ chunk-ghbe0g3f.js:4913-5200 placement
function toCompletableProjects(projects, byName) {
  return projects.flatMap((project) => {
    let filtered = project.name.split(/\s+/).filter(Boolean);
    let mapped = filtered.map((word) => normalizeProjectName(word));
    let sendToProjectArgs = parseSendToProjectArgs(`"${filtered.join(" ")}"`);
    let lookup =
      sendToProjectArgs.kind === "name" && sendToProjectArgs.note === ""
        ? lookupProjectByName(sendToProjectArgs.name, byName)
        : null;
    return lookup?.kind === "match" &&
      lookup.project.id === project.id &&
      mapped.join(" ") === normalizeProjectName(project.name)
      ? [
          {
            project,
            words: filtered,
            folded: mapped,
          },
        ]
      : [];
  });
}
//@ chunk-ghbe0g3f.js:5200-5703 placement
/**
 * 按登录身份缓存项目列表：过期且没有在途请求、最近也没失败时发起刷新；缓存够新返回缓存，否则等在途请求；身份不符返回 null。
 */
async function getCachedProjectListing(cache, login, now, fetchProjects) {
  let listing = cache.listing?.login === login ? cache.listing : null;
  let ageMs = listing === null ? 1 / 0 : now - listing.fetchedAt;
  let isCoolingDown =
    cache.failed?.login === login &&
    now - cache.failed.at <
      (cache.failed.refused ? PROJECT_LIST_REFUSED_COOLDOWN_MS : PROJECT_LIST_FAILED_COOLDOWN_MS);
  if (ageMs >= PROJECT_LIST_TTL_MS && cache.inflight?.login !== login && !isCoolingDown) {
    let promise = fetchProjectListing(login, fetchProjects).then((projectListing) => {
      if (cache.inflight?.promise === promise) {
        cache.inflight = null;
        if (projectListing.listing === null)
          cache.failed = {
            login,
            at: Date.now(),
            refused: projectListing.refused,
          };
        else cache.listing = projectListing.listing;
      }
      return projectListing.listing;
    });
    cache.inflight = {
      login,
      promise,
    };
  }
  if (listing !== null && ageMs < PROJECT_LIST_MAX_STALE_MS) return listing;
  let inflight = cache.inflight;
  if (inflight === null || inflight.login !== login) return null;
  return inflight.promise;
}
//@ chunk-ghbe0g3f.js:5703-6008 placement
/**
 * 带超时拉取个人项目列表并转成补全候选；失败记调试日志，返回 listing=null 与是否被服务端拒绝。
 */
async function fetchProjectListing(login, fetchProjects) {
  try {
    let { projects, typedNames } = await fetchProjects(
      AbortSignal.timeout(PROJECT_LIST_TIMEOUT_MS),
      undefined,
    );
    return {
      listing: {
        login,
        offered: toCompletableProjects(projects, indexProjectsByName(projects, typedNames)),
        fetchedAt: Date.now(),
      },
    };
  } catch (error) {
    logForDebugging(`[send-to-project] listing for completions failed: ${errorMessage(error)}`, {
      level: "warn",
    });
    return {
      listing: null,
      refused: error instanceof ChannelApiError && !isRetryableChannelError(error),
    };
  }
}
export { getProjectNameCompletions };
