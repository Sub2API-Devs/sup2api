/**
 * utils/permissions/repoVisibilityMeta.ts
 *
 * 2.1.316 新增：收集各目录的 git origin 与推送目标状态，生成分类器用的 repoVisibility 元数据（无法解析时追加 unknown 项）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (8)
 * attribution: sole-consumer 1, placement 7
 */
import { isAbsolute, resolve } from "path";
import { execGitNoThrow } from "../execFileNoThrow.js";
import {
  checkCurrentRepoVisibility,
  sanitizeCacheKey,
  effectiveVisibility,
  checkRepoVisibility,
  isRepoVisibilityCheckEnabled,
} from "../github/repoVisibility.js";
import { parseGitRemote } from "../detectRepository.js";
import {
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
} from "../../tools/BashTool/gitRemoteMutation.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { isRemoteOnlyCheck } from "./checkRegistry.js";
import { getCwd } from "../cwd.js";
import { gitPull } from "../plugins/marketplaceManager.js";
import { sleep } from "../sleep.js";

//@ chunk-s61vbvea.js:531881-532001 sole-consumer
/**
 * 已有目录状态缓存时直接取 branch，否则 git rev-parse --abbrev-ref HEAD。
 */
async function getGitBranchForDir(gitState, n, gitOptions) {
  if (gitState.hasDir(n)) return gitState.dirState(n)?.branch;
  return execGitNoThrow(n, ["rev-parse", "--abbrev-ref", "HEAD"], gitOptions);
}
//@ chunk-s61vbvea.js:532001-532138 placement
async function getDirRemoteState(gitState, n) {
  if (gitState.hasDir(n)) {
    let r = gitState.dirState(n);
    return r
      ? {
          slug: r.slug,
          host: r.host,
          visibility: r.visibility,
        }
      : null;
  }
  return checkCurrentRepoVisibility(n);
}
//@ chunk-s61vbvea.js:532376-532583 placement
async function getRemoteUrlForPush(e, n, r, s) {
  if (e.hasDir(n)) return e.namedRemoteUrl(n, r);
  let h = await execGitNoThrow(n, ["config", "--get", `remote.${r}.pushurl`], s);
  if (h !== undefined) return h;
  return execGitNoThrow(n, ["config", "--get", `remote.${r}.url`], s);
}
//@ chunk-s61vbvea.js:532583-533196 placement
/**
 * 把收集到的 origin 状态与推送目标去重排序，生成分类器 repoVisibility 元数据列表；有无法解析或（超时后）仍在等待的目标时追加 remote 为空、visibility 为 unknown 的一项。
 */
function buildRepoVisibilityMeta(collected, n) {
  let entries = [];
  let seen = new Set();
  let hasUnresolved = false;
  for (let origin of collected.origins.values())
    if (origin.state) {
      let w = `${origin.state.host}/${origin.state.slug}`;
      if (!seen.has(w)) {
        seen.add(w);
        entries.push({
          remote: sanitizeCacheKey(origin.state.slug),
          ...(origin.branch !== undefined && {
            branch: sanitizeCacheKey(origin.branch),
          }),
          visibility: effectiveVisibility(origin.state),
        });
      }
    } else hasUnresolved = true;
  let targets = [];
  for (let target of collected.targets)
    if (target === "unresolved") hasUnresolved = true;
    else targets.push(target);
  targets.sort((S, w) => `${S.host}/${S.slug}`.localeCompare(`${w.host}/${w.slug}`));
  for (let target of targets) {
    let w = `${target.host}/${target.slug}`;
    if (seen.has(w)) continue;
    seen.add(w);
    entries.push({
      remote: sanitizeCacheKey(target.slug),
      visibility: effectiveVisibility(target),
    });
  }
  if (n && collected.pendingTargets > 0) hasUnresolved = true;
  if (hasUnresolved)
    entries.push({
      remote: "",
      visibility: "unknown",
    });
  return entries;
}
//@ chunk-s61vbvea.js:533196-533258 placement
function looksLikeGitRemoteUrl(e) {
  return e.includes("://") || e.startsWith("git@");
}
//@ chunk-s61vbvea.js:533258-533360 placement
async function resolveRemoteVisibility(e) {
  let n = looksLikeGitRemoteUrl(e) ? parseGitRemote(e) : null;
  if (!n) return "unresolved";
  return checkRepoVisibility(n.host, n.owner, n.name);
}
//@ chunk-s61vbvea.js:533360-533523 placement
async function resolveNamedRemoteVisibility(gitState, cwdOption, r, s, gitOptions) {
  if (r === "origin") {
    await s.stateP;
    return s.state ? null : "unresolved";
  }
  let remoteUrlForPush = await getRemoteUrlForPush(gitState, cwdOption, r, gitOptions);
  if (remoteUrlForPush === undefined) return "unresolved";
  return resolveRemoteVisibility(remoteUrlForPush);
}
//@ chunk-s61vbvea.js:533523-535191 placement
/**
 * 对 Bash/PowerShell 中会把数据推到外部的 git/gh 命令（push、remote set-url、gh pr/repo/release 等），解析目标仓库并查询可见性，在时限内返回 repoVisibility 元数据（超时返回已得部分）；任何异常返回 null。
 */
async function collectRepoVisibilityMeta(toolName, input, gitOptions, timeoutMs = MAX_REMOTE_SCAN_LENGTH) {
  try {
    if (!isRepoVisibilityCheckEnabled()) return null;
    if ((toolName !== BASH_TOOL_NAME && toolName !== POWERSHELL_TOOL_NAME) || isRemoteOnlyCheck(toolName))
      return null;
    if (
      input === null ||
      typeof input !== "object" ||
      !("command" in input) ||
      typeof input.command !== "string"
    )
      return null;
    let command = input.command;
    let gitMutations = isGitRemoteMutation(command);
    let ghCommands = matchAllCaptures(GH_MUTATION_RE, command);
    if (!gitMutations.length && !ghCommands.length) return null;
    let cwd = getCwd();
    let gitState = getRemoteStateCache();
    let collected = {
      origins: new Map(),
      targets: [],
      pendingTargets: 0,
    };
    let pending = [];
    let trackOrigin = (se) => {
      let re = collected.origins.get(se);
      if (re === undefined) {
        let he = {};
        he.branchP = getGitBranchForDir(gitState, se, gitOptions).then((branch) => {
          he.branch = branch;
        });
        he.stateP = getDirRemoteState(gitState, se).then((state) => {
          he.state = state;
        });
        re = he;
        collected.origins.set(se, re);
        pending.push(re.branchP, re.stateP);
      }
      return re;
    };
    let addTarget = (se) => {
      collected.pendingTargets++;
      pending.push(
        se.then((re) => {
          collected.pendingTargets--;
          if (re !== null) collected.targets.push(re);
        }),
      );
    };
    let resolveGhRepoVisibility = async (se) => {
      let repoSpec = parseRepoSpec(se);
      if (!repoSpec) return "unresolved";
      return checkRepoVisibility(repoSpec.host, repoSpec.owner, repoSpec.name);
    };
    trackOrigin(cwd);
    let resolveCwdOption = (optsSpan) => {
      let gitDirOption = getGitDirOption(optsSpan);
      if (gitDirOption === undefined) return cwd;
      return isAbsolute(gitDirOption) ? gitDirOption : resolve(cwd, gitDirOption);
    };
    for (let gitMutation of gitMutations) {
      let cwdOption = resolveCwdOption(gitMutation.optsSpan);
      let he = trackOrigin(cwdOption);
      if (gitMutation.kind === "remote-mutate") {
        let ce = secondOperandOf(gitMutation.rest);
        if (ce !== undefined) addTarget(resolveRemoteVisibility(ce));
        continue;
      }
      let Se = listGhRepoTargets(gitMutation.rest);
      if (Se.length === 0) {
        addTarget(
          (async () => {
            await he.branchP;
            let ce = await gitPull(gitState, cwdOption, he.branch, gitOptions);
            return resolveNamedRemoteVisibility(gitState, cwdOption, ce, he, gitOptions);
          })(),
        );
        continue;
      }
      for (let ce of Se)
        if (looksLikeGitRemoteUrl(ce)) addTarget(resolveRemoteVisibility(ce));
        else addTarget(resolveNamedRemoteVisibility(gitState, cwdOption, ce, he, gitOptions));
    }
    for (let ghCommand of ghCommands) {
      let replaced = (ghCommand[1] ?? "").replace(/\s+/g, " ");
      let he = ghCommand[2] ?? "";
      let ghRepoFlag = getGhRepoFlag(he);
      let ce =
        replaced === "repo fork" && ghRepoFlag === undefined
          ? firstOperandOf(he, GH_FORK_VALUE_FLAGS)
          : undefined;
      let we = ghRepoFlag ?? ce;
      if (we !== undefined) addTarget(resolveGhRepoVisibility(we));
      if (replaced === "pr create" && getHeadOwner(he) !== undefined)
        addTarget(Promise.resolve("unresolved"));
    }
    let allSettled = Promise.all(pending).then(() => buildRepoVisibilityMeta(collected, false));
    let abortController = new AbortController();
    let timeout = sleep(timeoutMs, abortController.signal).then(() => null);
    try {
      let winner = await Promise.race([allSettled, timeout]);
      if (winner !== null) return winner.length > 0 ? winner : null;
      let repoVisibilityMeta = buildRepoVisibilityMeta(collected, true);
      return repoVisibilityMeta.length > 0 ? repoVisibilityMeta : null;
    } finally {
      abortController.abort();
      allSettled.catch(() => {});
    }
  } catch {
    return null;
  }
}
export { collectRepoVisibilityMeta };
