/**
 * tools/BashTool/gitRemoteMutation.ts
 *
 * 识别修改远端的 git 命令（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (19)
 * attribution: placement 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { firstLineOf } from "../../utils/stringUtils.js";
import { parseGitRemote } from "../../utils/detectRepository.js";
import { GITHUB_HOST } from "../../utils/git/githubUrl.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:445866-446101 placement
/**
 * 远程变更检测常量：扫描长度上限、参数捕获、gh 变更类子命令正则与 git 目录选项。
 */
var MAX_REMOTE_SCAN_LENGTH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ARGS_CAPTURE;
var GH_MUTATION_RE;
var GIT_DIR_OPTIONS;
deferInit("chunk-7jxyna5q.js:445866", () => {
  MAX_REMOTE_SCAN_LENGTH = 5000;
  ARGS_CAPTURE = String.raw`([^&|;\n]*)`;
  GH_MUTATION_RE = new RegExp(
    String.raw`\bgh\s+(pr\s+create|pr\s+merge|pr\s+comment|issue\s+create|issue\s+comment|release\s+create|release\s+upload|repo\s+fork)\b${ARGS_CAPTURE}`,
    "g",
  );
  GIT_DIR_OPTIONS = new Set(["-c", "-C", "--git-dir"]);
});
//@ chunk-7jxyna5q.js:446101-446683 placement
function isGitRemoteMutation(command) {
  let mutations = [];
  for (let segment of command.split(/[&|;\n]/)) {
    let filtered = segment.trim().split(/\s+/).filter(Boolean);
    let idx = 0;
    while (idx < filtered.length) {
      let word = filtered[idx];
      if (word !== "git" && !word.endsWith("/git")) {
        idx++;
        continue;
      }
      let optionSpan = [];
      let scanIdx = idx + 1;
      for (; scanIdx < filtered.length; scanIdx++) {
        let word = filtered[scanIdx];
        if (!word.startsWith("-")) break;
        optionSpan.push(word);
        if (GIT_DIR_OPTIONS.has(word) && scanIdx + 1 < filtered.length) optionSpan.push(filtered[++scanIdx]);
      }
      let subcommand = filtered[scanIdx];
      if (subcommand === "push") {
        mutations.push({
          kind: "push",
          optsSpan: optionSpan.join(" "),
          rest: filtered.slice(scanIdx + 1).join(" "),
        });
        break;
      }
      if (
        subcommand === "remote" &&
        (filtered[scanIdx + 1] === "set-url" || filtered[scanIdx + 1] === "add")
      ) {
        mutations.push({
          kind: "remote-mutate",
          optsSpan: optionSpan.join(" "),
          rest: filtered.slice(scanIdx + 2).join(" "),
        });
        break;
      }
      idx = Math.max(scanIdx, idx + 1);
    }
  }
  return mutations;
}
//@ chunk-7jxyna5q.js:446683-446725 placement
/**
 * 返回某个正则对命令文本的全部匹配。
 */
function matchAllCaptures(pattern, command) {
  return [...command.matchAll(pattern)];
}
//@ chunk-7jxyna5q.js:446725-446776 placement
/**
 * 去掉值首尾的单引号或双引号（解析 git -C、--git-dir 参数时用）。
 */
function stripSurroundingQuotes(text) {
  return text.replace(/^['"]|['"]$/g, "");
}
//@ chunk-7jxyna5q.js:446776-446917 placement
/**
 * 从命令中提取 -C 或 --git-dir 指定的目录。
 */
function getGitDirOption(optionSpan) {
  let match = optionSpan.match(/-C\s+(\S+)/);
  if (match?.[1]) return stripSurroundingQuotes(match[1]);
  let match_2 = optionSpan.match(/--git-dir[=\s]+(\S+)/);
  if (match_2?.[1]) return stripSurroundingQuotes(match_2[1]);
  return;
}
//@ chunk-7jxyna5q.js:446917-447143 placement
function collectOperands(rest, valueFlags, max) {
  let parts = rest.trim().split(/\s+/);
  let operands = [];
  for (let j = 0; j < parts.length && operands.length < max; j++) {
    let word = parts[j];
    if (word === "") continue;
    if (word.startsWith("-")) {
      if (valueFlags.has(word)) j++;
      continue;
    }
    if (/^[\d*]*[<>]/.test(word)) continue;
    operands.push(stripSurroundingQuotes(word));
  }
  return operands;
}
//@ chunk-7jxyna5q.js:447143-447180 placement
/**
 * 取第一个位置参数（跳过带值选项）。
 */
function firstOperandOf(rest, valueFlags) {
  return collectOperands(rest, valueFlags, 1)[0];
}
//@ chunk-7jxyna5q.js:447180-447254 placement
/**
 * git push 中带值的选项集合，collectOperands 跳过它们及其值。
 */
var GIT_PUSH_VALUE_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:447180", () => {
  GIT_PUSH_VALUE_FLAGS = new Set(["-o", "--push-option", "--receive-pack", "--exec", "--repo"]);
});
//@ chunk-7jxyna5q.js:447254-447433 placement
/**
 * 列出 gh 命令涉及的仓库（位置参数与最后一个 --repo）。
 */
function listGhRepoTargets(rest) {
  let targets = [];
  let firstOperand = firstOperandOf(rest, GIT_PUSH_VALUE_FLAGS);
  if (firstOperand !== undefined) targets.push(firstOperand);
  let repoFlagValue = [...rest.matchAll(/(?:^|\s)--repo[=\s]+(\S+)/g)].at(-1)?.[1];
  if (repoFlagValue) {
    let repo = stripSurroundingQuotes(repoFlagValue);
    if (!targets.includes(repo)) targets.push(repo);
  }
  return targets;
}
//@ chunk-7jxyna5q.js:447433-447461 placement
/**
 * gh 中带值的选项集合（-t 标题、-m 正文）。
 */
var GH_MSG_VALUE_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:447433", () => {
  GH_MSG_VALUE_FLAGS = new Set(["-t", "-m"]);
});
//@ chunk-7jxyna5q.js:447461-447497 placement
/**
 * 取第二个位置参数。
 */
function secondOperandOf(rest) {
  return collectOperands(rest, GH_MSG_VALUE_FLAGS, 2)[1];
}
//@ chunk-7jxyna5q.js:447497-447605 placement
/**
 * 取 gh 命令最后一个 --repo/-R 参数。
 */
function getGhRepoFlag(rest) {
  let repoFlagValue = [...rest.matchAll(/(?:^|\s)(?:--repo|-R)[=\s]+(\S+)/g)].at(-1)?.[1];
  return repoFlagValue ? stripSurroundingQuotes(repoFlagValue) : undefined;
}
//@ chunk-7jxyna5q.js:447605-447757 placement
/**
 * 从 gh pr 的 --head owner:branch 参数中取 owner。
 */
function getHeadOwner(rest) {
  let headFlagValue = [...rest.matchAll(/(?:^|\s)--head[=\s]+(\S+)/g)].at(-1)?.[1];
  let headSpec = headFlagValue ? stripSurroundingQuotes(headFlagValue) : undefined;
  if (!headSpec || !headSpec.includes(":")) return;
  return firstLineOf(headSpec, ":") || undefined;
}
//@ chunk-7jxyna5q.js:447757-447836 placement
/**
 * gh 仓库命令里带值的选项（--org、--fork-name、--remote-name）。
 */
var GH_FORK_VALUE_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REPO_PART_RE;
deferInit("chunk-7jxyna5q.js:447757", () => {
  GH_FORK_VALUE_FLAGS = new Set(["--org", "--fork-name", "--remote-name"]);
  REPO_PART_RE = /^[A-Za-z0-9._-]+$/;
});
//@ chunk-7jxyna5q.js:447836-447908 placement
/**
 * 判断某段字符是否可作为仓库 owner/name。
 */
function isRepoPart(part) {
  return REPO_PART_RE.test(part) && !part.startsWith("-") && part !== "." && part !== "..";
}
//@ chunk-7jxyna5q.js:447908-448261 placement
/**
 * 解析仓库说明为 {host, owner, name}：URL/SSH 形式交给远程解析，owner/name 视为 GitHub，host/owner/name 也接受；本地路径返回 null。
 */
function parseRepoSpec(spec) {
  if (spec.includes("://") || spec.startsWith("git@")) return parseGitRemote(spec);
  if (spec.startsWith("/") || spec.startsWith(".")) return null;
  let parts = spec.replace(/\.git$/, "").split("/");
  if (parts.length === 2 && isRepoPart(parts[0]) && isRepoPart(parts[1]))
    return {
      host: GITHUB_HOST,
      owner: parts[0],
      name: parts[1],
    };
  if (
    parts.length === 3 &&
    parts[0].includes(".") &&
    isRepoPart(parts[0]) &&
    isRepoPart(parts[1]) &&
    isRepoPart(parts[2])
  )
    return {
      host: parts[0],
      owner: parts[1],
      name: parts[2],
    };
  return null;
}
//@ chunk-7jxyna5q.js:448261-448693 placement
/**
 * 按目录缓存 git 远程状态与具名远程的 URL，供远程变更检查复用。
 */
class GitRemoteStateCache {
  stateByDir = new Map();
  namedRemoteUrlsByDir = new Map();
  seedDir(dir, state) {
    this.stateByDir.set(dir, state);
  }
  seedNamedRemoteUrl(dir, name, url) {
    let urlsByName = this.namedRemoteUrlsByDir.get(dir) ?? new Map();
    urlsByName.set(name, url);
    this.namedRemoteUrlsByDir.set(dir, urlsByName);
  }
  hasDir(dir) {
    return this.stateByDir.has(dir);
  }
  dirState(dir) {
    return this.stateByDir.get(dir);
  }
  namedRemoteUrl(dir, name) {
    return this.namedRemoteUrlsByDir.get(dir)?.get(name);
  }
  clear() {
    this.stateByDir.clear();
    this.namedRemoteUrlsByDir.clear();
  }
}
//@ chunk-7jxyna5q.js:448693-448718 placement
/**
 * 按宿主隔离的 git 远程状态缓存。
 */
var gitRemoteStateByHost; // deferred: uses GitRemoteStateCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:448693", () => {
  gitRemoteStateByHost = new HostScoped(() => new GitRemoteStateCache());
});
//@ chunk-7jxyna5q.js:448718-448755 placement
/**
 * 取出当前根会话宿主对应的 git 远程状态缓存。
 */
function getRemoteStateCache() {
  return gitRemoteStateByHost.of(getRootSession().host);
}
export {
  MAX_REMOTE_SCAN_LENGTH,
  isGitRemoteMutation,
  matchAllCaptures,
  GH_MUTATION_RE,
  getRemoteStateCache,
  parseRepoSpec,
  getGitDirOption,
  secondOperandOf,
  listGhRepoTargets,
  getGhRepoFlag,
  firstOperandOf,
  GH_FORK_VALUE_FLAGS,
  getHeadOwner,
};
