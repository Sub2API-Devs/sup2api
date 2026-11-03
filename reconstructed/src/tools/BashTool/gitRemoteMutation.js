/**
 * tools/BashTool/gitRemoteMutation.ts
 *
 * 识别修改远端的 git 命令（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (19)
 * attribution: placement 19
 */
import { firstLineOf } from "../../utils/stringUtils.js";
import { parseGitRemote } from "../../utils/detectRepository.js";
import { GITHUB_HOST } from "../../utils/git/githubUrl.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-s61vbvea.js:528763-528998 placement
/**
 * 远程变更检测常量：扫描长度上限、参数捕获、gh 变更类子命令正则与 git 目录选项。
 */
var MAX_REMOTE_SCAN_LENGTH = 5000;
var ARGS_CAPTURE = String.raw`([^&|;\n]*)`;
var GH_MUTATION_RE = new RegExp(
  String.raw`\bgh\s+(pr\s+create|pr\s+merge|pr\s+comment|issue\s+create|issue\s+comment|release\s+create|release\s+upload|repo\s+fork)\b${ARGS_CAPTURE}`,
  "g",
);
var GIT_DIR_OPTIONS = new Set(["-c", "-C", "--git-dir"]);
//@ chunk-s61vbvea.js:528998-529580 placement
function isGitRemoteMutation(e) {
  let n = [];
  for (let r of e.split(/[&|;\n]/)) {
    let filtered = r.trim().split(/\s+/).filter(Boolean);
    let h = 0;
    while (h < filtered.length) {
      let y = filtered[h];
      if (y !== "git" && !y.endsWith("/git")) {
        h++;
        continue;
      }
      let S = [];
      let w = h + 1;
      for (; w < filtered.length; w++) {
        let x = filtered[w];
        if (!x.startsWith("-")) break;
        S.push(x);
        if (GIT_DIR_OPTIONS.has(x) && w + 1 < filtered.length) S.push(filtered[++w]);
      }
      let R = filtered[w];
      if (R === "push") {
        n.push({
          kind: "push",
          optsSpan: S.join(" "),
          rest: filtered.slice(w + 1).join(" "),
        });
        break;
      }
      if (R === "remote" && (filtered[w + 1] === "set-url" || filtered[w + 1] === "add")) {
        n.push({
          kind: "remote-mutate",
          optsSpan: S.join(" "),
          rest: filtered.slice(w + 2).join(" "),
        });
        break;
      }
      h = Math.max(w, h + 1);
    }
  }
  return n;
}
//@ chunk-s61vbvea.js:529580-529622 placement
/**
 * 返回某个正则对命令文本的全部匹配。
 */
function matchAllCaptures(e, command) {
  return [...command.matchAll(e)];
}
//@ chunk-s61vbvea.js:529622-529673 placement
/**
 * 去掉值首尾的单引号或双引号（解析 git -C、--git-dir 参数时用）。
 */
function stripSurroundingQuotes(e) {
  return e.replace(/^['"]|['"]$/g, "");
}
//@ chunk-s61vbvea.js:529673-529814 placement
/**
 * 从命令中提取 -C 或 --git-dir 指定的目录。
 */
function getGitDirOption(e) {
  let match = e.match(/-C\s+(\S+)/);
  if (match?.[1]) return stripSurroundingQuotes(match[1]);
  let match_2 = e.match(/--git-dir[=\s]+(\S+)/);
  if (match_2?.[1]) return stripSurroundingQuotes(match_2[1]);
  return;
}
//@ chunk-s61vbvea.js:529814-530040 placement
function collectOperands(e, n, r) {
  let parts = e.trim().split(/\s+/);
  let h = [];
  for (let j = 0; j < parts.length && h.length < r; j++) {
    let S = parts[j];
    if (S === "") continue;
    if (S.startsWith("-")) {
      if (n.has(S)) j++;
      continue;
    }
    if (/^[\d*]*[<>]/.test(S)) continue;
    h.push(stripSurroundingQuotes(S));
  }
  return h;
}
//@ chunk-s61vbvea.js:530040-530077 placement
/**
 * 取第一个位置参数（跳过带值选项）。
 */
function firstOperandOf(e, n) {
  return collectOperands(e, n, 1)[0];
}
//@ chunk-s61vbvea.js:530077-530151 placement
/**
 * git push 中带值的选项集合，collectOperands 跳过它们及其值。
 */
var GIT_PUSH_VALUE_FLAGS = new Set(["-o", "--push-option", "--receive-pack", "--exec", "--repo"]);
//@ chunk-s61vbvea.js:530151-530330 placement
/**
 * 列出 gh 命令涉及的仓库（位置参数与最后一个 --repo）。
 */
function listGhRepoTargets(e) {
  let n = [];
  let r = firstOperandOf(e, GIT_PUSH_VALUE_FLAGS);
  if (r !== undefined) n.push(r);
  let s = [...e.matchAll(/(?:^|\s)--repo[=\s]+(\S+)/g)].at(-1)?.[1];
  if (s) {
    let h = stripSurroundingQuotes(s);
    if (!n.includes(h)) n.push(h);
  }
  return n;
}
//@ chunk-s61vbvea.js:530330-530358 placement
/**
 * gh 中带值的选项集合（-t 标题、-m 正文）。
 */
var GH_MSG_VALUE_FLAGS = new Set(["-t", "-m"]);
//@ chunk-s61vbvea.js:530358-530394 placement
/**
 * 取第二个位置参数。
 */
function secondOperandOf(e) {
  return collectOperands(e, GH_MSG_VALUE_FLAGS, 2)[1];
}
//@ chunk-s61vbvea.js:530394-530502 placement
/**
 * 取 gh 命令最后一个 --repo/-R 参数。
 */
function getGhRepoFlag(e) {
  let r = [...e.matchAll(/(?:^|\s)(?:--repo|-R)[=\s]+(\S+)/g)].at(-1)?.[1];
  return r ? stripSurroundingQuotes(r) : undefined;
}
//@ chunk-s61vbvea.js:530502-530654 placement
/**
 * 从 gh pr 的 --head owner:branch 参数中取 owner。
 */
function getHeadOwner(e) {
  let r = [...e.matchAll(/(?:^|\s)--head[=\s]+(\S+)/g)].at(-1)?.[1];
  let s = r ? stripSurroundingQuotes(r) : undefined;
  if (!s || !s.includes(":")) return;
  return firstLineOf(s, ":") || undefined;
}
//@ chunk-s61vbvea.js:530654-530733 placement
/**
 * gh 仓库命令里带值的选项（--org、--fork-name、--remote-name）。
 */
var GH_FORK_VALUE_FLAGS = new Set(["--org", "--fork-name", "--remote-name"]);
var REPO_PART_RE = /^[A-Za-z0-9._-]+$/;
//@ chunk-s61vbvea.js:530733-530805 placement
/**
 * 判断某段字符是否可作为仓库 owner/name。
 */
function isRepoPart(e) {
  return REPO_PART_RE.test(e) && !e.startsWith("-") && e !== "." && e !== "..";
}
//@ chunk-s61vbvea.js:530805-531158 placement
/**
 * 解析仓库说明为 {host, owner, name}：URL/SSH 形式交给远程解析，owner/name 视为 GitHub，host/owner/name 也接受；本地路径返回 null。
 */
function parseRepoSpec(e) {
  if (e.includes("://") || e.startsWith("git@")) return parseGitRemote(e);
  if (e.startsWith("/") || e.startsWith(".")) return null;
  let parts = e.replace(/\.git$/, "").split("/");
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
//@ chunk-s61vbvea.js:531158-531590 placement
/**
 * 按目录缓存 git 远程状态与具名远程的 URL，供远程变更检查复用。
 */
class GitRemoteStateCache {
  stateByDir = new Map();
  namedRemoteUrlsByDir = new Map();
  seedDir(e, n) {
    this.stateByDir.set(e, n);
  }
  seedNamedRemoteUrl(e, n, r) {
    let s = this.namedRemoteUrlsByDir.get(e) ?? new Map();
    s.set(n, r);
    this.namedRemoteUrlsByDir.set(e, s);
  }
  hasDir(e) {
    return this.stateByDir.has(e);
  }
  dirState(e) {
    return this.stateByDir.get(e);
  }
  namedRemoteUrl(e, n) {
    return this.namedRemoteUrlsByDir.get(e)?.get(n);
  }
  clear() {
    this.stateByDir.clear();
    this.namedRemoteUrlsByDir.clear();
  }
}
//@ chunk-s61vbvea.js:531590-531615 placement
/**
 * 按宿主隔离的 git 远程状态缓存。
 */
var gitRemoteStateByHost = new HostScoped(() => new GitRemoteStateCache());
//@ chunk-s61vbvea.js:531615-531652 placement
/**
 * 取出当前根会话宿主对应的 git 远程状态缓存。
 */
function getRemoteStateCache() {
  return gitRemoteStateByHost.of(getRootSession().host);
}
export {
  isGitRemoteMutation,
  getGitDirOption,
  listGhRepoTargets,
  MAX_REMOTE_SCAN_LENGTH,
  matchAllCaptures,
  GH_MUTATION_RE,
  getRemoteStateCache,
  parseRepoSpec,
  secondOperandOf,
  getGhRepoFlag,
  firstOperandOf,
  GH_FORK_VALUE_FLAGS,
  getHeadOwner,
};
