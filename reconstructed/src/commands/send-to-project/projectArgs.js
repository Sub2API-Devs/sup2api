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
  Rz,
  normalizeProjectName,
  DTo,
  listChannelsPage,
  projectNotTargetReason,
} from "../../services/projects/channelApi.js";
import { parseProjectReference } from "../../services/projects/disclosure.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";

/**
 * 把 /send-to-project 参数问题（flag：--project 已废弃；quotes：名字引号不对；link：不是 Claude Project 链接）转成提示文字。
 */
//@ chunk-2ygwbyvf.js:356-911 placement
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
/**
 * 按名字找项目失败时的提示：多个同名项目（ambiguous）或没有同名的个人项目（列表被截断时注明只看了最近 N 个）。
 */
//@ chunk-2ygwbyvf.js:911-1378 placement
function describeProjectNameMiss(n, t, e) {
  return t.kind === "ambiguous"
    ? `More than one of your Claude Projects is named \u201C${printableName(t.name, 80)}\u201D. ${"Run /send-to-project alone to pick the project."}`
    : `None of your ${e ? `${TARGET_PROJECT_ROWS_MAX} most recently active ` : ""}personal projects is named \u201C${printableName(n.trim(), 80)}\u201D. A project that is shared, paused or archived can\u2019t be named here, and a message can\u2019t open with a double quote. ${"Run /send-to-project alone to pick the project."}`;
}
//@ chunk-2ygwbyvf.js:1378-1399 placement
var FTo = /^["\u201C]/;
/**
 * 解析 /send-to-project 参数：开头双引号里的项目名、项目 id 或项目链接，其余部分作为附言；旧 --project、引号不配对、非项目链接返回 problem；都不是时整个参数作为附言。
 */
//@ chunk-2ygwbyvf.js:1399-2024 placement
function parseSendToProjectArgs(args) {
  let trimmed = args.trimStart(),
    firstToken = /^\S+/.exec(trimmed)?.[0] ?? "";
  if (firstToken === "--project" || firstToken.startsWith("--project="))
    return { kind: "problem", problem: "flag" };
  if (FTo.test(firstToken)) {
    let quotedMatch = /^["\u201C]([^"\u201C\u201D\n]*)["\u201D](?=[\s,.;:!?]|$)/.exec(trimmed),
      s = quotedMatch?.[1]?.trim() ?? "";
    return quotedMatch === null || s === ""
      ? { kind: "problem", problem: "quotes" }
      : {
          kind: "name",
          name: s,
          note: trimmed
            .slice(quotedMatch[0].length)
            .replace(/^[,.;:!?]+/, "")
            .trim(),
        };
  }
  let o = Rz.test(firstToken) ? firstToken : (parseProjectReference(firstToken)?.projectId ?? "");
  if (Rz.test(o)) return { kind: "id", projectId: o, note: trimmed.slice(firstToken.length).trim() };
  return /^[a-z][a-z0-9+.-]*:\/\/\S*(\/project\/|chan_)/i.test(firstToken)
    ? { kind: "problem", problem: "link" }
    : { kind: "note", note: args };
}
/**
 * 按规范化名字（以及用户输入过的名字）建立 名字 → 项目列表 的索引。
 */
//@ chunk-2ygwbyvf.js:2024-2183 placement
function indexProjectsByName(n, t) {
  let e = new Map();
  for (let o of n) {
    let r = new Set([normalizeProjectName(o.name), t.get(o.id) ?? ""]);
    r.delete("");
    for (let s of r) e.set(s, [...(e.get(s) ?? []), o]);
  }
  return e;
}
/**
 * 在名字索引里查项目：none、ambiguous（多个同名）或 match。
 */
//@ chunk-2ygwbyvf.js:2183-2339 placement
function lookupProjectByName(n, t) {
  let [e, ...o] = t.get(normalizeProjectName(n)) ?? [];
  if (e === void 0) return { kind: "none" };
  return o.length > 0 ? { kind: "ambiguous", name: e.name } : { kind: "match", project: e };
}
//@ chunk-2ygwbyvf.js:2339-2364 placement
var ceil = Math.ceil(TARGET_PROJECT_ROWS_MAX / DTo);
/**
 * 分页拉取个人 Claude Projects 频道（有页数上限），过滤掉不适用的频道，按活跃度排序截取前 N 个；返回项目、是否截断、id → 规范名映射。
 */
//@ chunk-2ygwbyvf.js:2364-2721 placement
async function listPersonalProjects(n, t) {
  let e = [],
    o = new Map(),
    r = null,
    s = !1;
  for (let i = 0; i < ceil; i++) {
    let c = await listChannelsPage(r, n, t);
    for (let channel of c.channels)
      if (projectNotTargetReason(channel) === null && Rz.test(channel.id))
        (e.push({
          id: channel.id,
          name: stripNonPrintable(printableName(channel.name, 80)),
          lastMessageAtMs: channel.lastMessageAtMs,
        }),
          o.set(channel.id, normalizeProjectName(channel.name)));
    if (((r = c.nextCursor), r === null)) break;
    s = i === ceil - 1;
  }
  return { projects: d(e).slice(0, TARGET_PROJECT_ROWS_MAX), truncated: s, typedNames: o };
}
//@ chunk-2ygwbyvf.js:2721-2809 placement
function d(n) {
  return n.toSorted((t, e) => (e.lastMessageAtMs ?? -1) - (t.lastMessageAtMs ?? -1));
}

export {
  listPersonalProjects,
  parseSendToProjectArgs,
  describeProjectArgProblem,
  lookupProjectByName,
  indexProjectsByName,
  describeProjectNameMiss,
  FTo,
};
