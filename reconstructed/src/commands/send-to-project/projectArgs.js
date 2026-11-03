/**
 * commands/send-to-project/projectArgs.ts
 *
 * 2.1.316 新增：/send-to-project 参数解析。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2ygwbyvf.js (9)
 * attribution: placement 9
 */
import { printableName } from "../../utils/printableName.js";
import { TARGET_PROJECT_ROWS_MAX } from "../../components/projects/continueInProjectsTargetRequest.js";
import {
  CHANNEL_ID_REGEX,
  normalizeProjectName,
  CHANNEL_LIST_PAGE_SIZE,
  listChannelsPage,
  projectNotTargetReason,
} from "../../services/projects/channelApi.js";
import { parseProjectReference } from "../../services/projects/disclosure.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";

//@ chunk-2ygwbyvf.js:356-911 placement
/**
 * 把 /send-to-project 参数问题（flag：--project 已废弃；quotes：名字引号不对；link：不是 Claude Project 链接）转成提示文字。
 */
function describeProjectArgProblem(problem) {
  switch (problem) {
    case "flag":
      return '--project is gone. Put the project first, by its name in double quotes, its id or its link, as in /send-to-project "Billing service".';
    case "quotes":
      return 'Put the project\u2019s name between one pair of double quotes, as in /send-to-project "Billing service". For a name that holds a quote, run /send-to-project alone and pick the project.';
    case "link":
      return "That link is not a Claude Project\u2019s. Use the project\u2019s name in double quotes or its id, or run /send-to-project alone and pick the project.";
  }
}
//@ chunk-2ygwbyvf.js:911-1378 placement
/**
 * 按名字找项目失败时的提示：多个同名项目（ambiguous）或没有同名的个人项目（列表被截断时注明只看了最近 N 个）。
 */
function describeProjectNameMiss(name, projectByName, truncated) {
  return projectByName.kind === "ambiguous"
    ? `More than one of your Claude Projects is named \u201C${printableName(projectByName.name, 80)}\u201D. ${"Run /send-to-project alone to pick the project."}`
    : `None of your ${truncated ? `${TARGET_PROJECT_ROWS_MAX} most recently active ` : ""}personal projects is named \u201C${printableName(name.trim(), 80)}\u201D. A project that is shared, paused or archived can\u2019t be named here, and a message can\u2019t open with a double quote. ${"Run /send-to-project alone to pick the project."}`;
}
//@ chunk-2ygwbyvf.js:1378-1399 placement
/**
 * /send-to-project 参数里项目名开头的双引号（含中文引号）匹配正则。
 */
var LEADING_QUOTE_PATTERN = /^["\u201C]/;
//@ chunk-2ygwbyvf.js:1399-2024 placement
/**
 * 解析 /send-to-project 参数：开头双引号里的项目名、项目 id 或项目链接，其余部分作为附言；旧 --project、引号不配对、非项目链接返回 problem；都不是时整个参数作为附言。
 */
function parseSendToProjectArgs(args) {
  let trimmed = args.trimStart();
  let firstToken = /^\S+/.exec(trimmed)?.[0] ?? "";
  if (firstToken === "--project" || firstToken.startsWith("--project="))
    return {
      kind: "problem",
      problem: "flag",
    };
  if (LEADING_QUOTE_PATTERN.test(firstToken)) {
    let quotedMatch = /^["\u201C]([^"\u201C\u201D\n]*)["\u201D](?=[\s,.;:!?]|$)/.exec(trimmed);
    let s = quotedMatch?.[1]?.trim() ?? "";
    return quotedMatch === null || s === ""
      ? {
          kind: "problem",
          problem: "quotes",
        }
      : {
          kind: "name",
          name: s,
          note: trimmed
            .slice(quotedMatch[0].length)
            .replace(/^[,.;:!?]+/, "")
            .trim(),
        };
  }
  let o = CHANNEL_ID_REGEX.test(firstToken)
    ? firstToken
    : (parseProjectReference(firstToken)?.projectId ?? "");
  if (CHANNEL_ID_REGEX.test(o))
    return {
      kind: "id",
      projectId: o,
      note: trimmed.slice(firstToken.length).trim(),
    };
  return /^[a-z][a-z0-9+.-]*:\/\/\S*(\/project\/|chan_)/i.test(firstToken)
    ? {
        kind: "problem",
        problem: "link",
      }
    : {
        kind: "note",
        note: args,
      };
}
//@ chunk-2ygwbyvf.js:2024-2183 placement
/**
 * 按规范化名字（以及用户输入过的名字）建立 名字 → 项目列表 的索引。
 */
function indexProjectsByName(projects, typedNames) {
  let e = new Map();
  for (let o of projects) {
    let r = new Set([normalizeProjectName(o.name), typedNames.get(o.id) ?? ""]);
    r.delete("");
    for (let s of r) e.set(s, [...(e.get(s) ?? []), o]);
  }
  return e;
}
//@ chunk-2ygwbyvf.js:2183-2339 placement
/**
 * 在名字索引里查项目：none、ambiguous（多个同名）或 match。
 */
function lookupProjectByName(name, t) {
  let [e, ...o] = t.get(normalizeProjectName(name)) ?? [];
  if (e === undefined)
    return {
      kind: "none",
    };
  return o.length > 0
    ? {
        kind: "ambiguous",
        name: e.name,
      }
    : {
        kind: "match",
        project: e,
      };
}
//@ chunk-2ygwbyvf.js:2339-2364 placement
var l = Math.ceil(TARGET_PROJECT_ROWS_MAX / CHANNEL_LIST_PAGE_SIZE);
//@ chunk-2ygwbyvf.js:2364-2721 placement
/**
 * 分页拉取个人 Claude Projects 频道（有页数上限），过滤掉不适用的频道，按活跃度排序截取前 N 个；返回项目、是否截断、id → 规范名映射。
 */
async function listPersonalProjects(signal, credentials) {
  let e = [];
  let o = new Map();
  let r = null;
  let truncated = false;
  for (let i = 0; i < l; i++) {
    let c = await listChannelsPage(r, signal, credentials);
    for (let channel of c.channels)
      if (projectNotTargetReason(channel) === null && CHANNEL_ID_REGEX.test(channel.id)) {
        e.push({
          id: channel.id,
          name: stripNonPrintable(printableName(channel.name, 80)),
          lastMessageAtMs: channel.lastMessageAtMs,
        });
        o.set(channel.id, normalizeProjectName(channel.name));
      }
    r = c.nextCursor;
    if (r === null) break;
    truncated = i === l - 1;
  }
  return {
    projects: sortProjectsByRecency(e).slice(0, TARGET_PROJECT_ROWS_MAX),
    truncated,
    typedNames: o,
  };
}
//@ chunk-2ygwbyvf.js:2721-2809 placement
function sortProjectsByRecency(n) {
  return n.toSorted((t, e) => (e.lastMessageAtMs ?? -1) - (t.lastMessageAtMs ?? -1));
}
export {
  listPersonalProjects,
  parseSendToProjectArgs,
  describeProjectArgProblem,
  lookupProjectByName,
  indexProjectsByName,
  describeProjectNameMiss,
  LEADING_QUOTE_PATTERN,
};
