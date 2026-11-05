/**
 * utils/permissions/repoVisibilityMeta.ts
 *
 * 2.1.316 新增：收集各目录的 git origin 与推送目标状态，生成分类器用的 repoVisibility 元数据（无法解析时追加 unknown 项）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (8)
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

//@ chunk-7jxyna5q.js:448984-449104 sole-consumer
/**
 * 已有目录状态缓存时直接取 branch，否则 git rev-parse --abbrev-ref HEAD。
 */
async function getGitBranchForDir(gitState, directory, gitOptions) {
  if (gitState.hasDir(directory)) return gitState.dirState(directory)?.branch;
  return execGitNoThrow(directory, ["rev-parse", "--abbrev-ref", "HEAD"], gitOptions);
}
//@ chunk-7jxyna5q.js:449104-449241 placement
async function getDirRemoteState(gitState, dir) {
  if (gitState.hasDir(dir)) {
    let state = gitState.dirState(dir);
    return state
      ? {
          slug: state.slug,
          host: state.host,
          visibility: state.visibility,
        }
      : null;
  }
  return checkCurrentRepoVisibility(dir);
}
//@ chunk-7jxyna5q.js:449479-449686 placement
async function getRemoteUrlForPush(gitState, dir, remote, gitOptions) {
  if (gitState.hasDir(dir)) return gitState.namedRemoteUrl(dir, remote);
  let pushUrl = await execGitNoThrow(dir, ["config", "--get", `remote.${remote}.pushurl`], gitOptions);
  if (pushUrl !== undefined) return pushUrl;
  return execGitNoThrow(dir, ["config", "--get", `remote.${remote}.url`], gitOptions);
}
//@ chunk-7jxyna5q.js:449686-450299 placement
/**
 * 把收集到的 origin 状态与推送目标去重排序，生成分类器 repoVisibility 元数据列表；有无法解析或（超时后）仍在等待的目标时追加 remote 为空、visibility 为 unknown 的一项。
 */
function buildRepoVisibilityMeta(collected, timedOut) {
  let entries = [];
  let seen = new Set();
  let hasUnresolved = false;
  for (let origin of collected.origins.values())
    if (origin.state) {
      let entryKey = `${origin.state.host}/${origin.state.slug}`;
      if (!seen.has(entryKey)) {
        seen.add(entryKey);
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
  targets.sort((left, right) => `${left.host}/${left.slug}`.localeCompare(`${right.host}/${right.slug}`));
  for (let target of targets) {
    let targetKey = `${target.host}/${target.slug}`;
    if (seen.has(targetKey)) continue;
    seen.add(targetKey);
    entries.push({
      remote: sanitizeCacheKey(target.slug),
      visibility: effectiveVisibility(target),
    });
  }
  if (timedOut && collected.pendingTargets > 0) hasUnresolved = true;
  if (hasUnresolved)
    entries.push({
      remote: "",
      visibility: "unknown",
    });
  return entries;
}
//@ chunk-7jxyna5q.js:450299-450361 placement
function looksLikeGitRemoteUrl(remoteUrl) {
  return remoteUrl.includes("://") || remoteUrl.startsWith("git@");
}
//@ chunk-7jxyna5q.js:450361-450463 placement
async function resolveRemoteVisibility(remoteUrl) {
  let parsed = looksLikeGitRemoteUrl(remoteUrl) ? parseGitRemote(remoteUrl) : null;
  if (!parsed) return "unresolved";
  return checkRepoVisibility(parsed.host, parsed.owner, parsed.name);
}
//@ chunk-7jxyna5q.js:450463-450626 placement
async function resolveNamedRemoteVisibility(gitState, dir, remote, origin, gitOptions) {
  if (remote === "origin") {
    await origin.stateP;
    return origin.state ? null : "unresolved";
  }
  let remoteUrl = await getRemoteUrlForPush(gitState, dir, remote, gitOptions);
  if (remoteUrl === undefined) return "unresolved";
  return resolveRemoteVisibility(remoteUrl);
}
//@ chunk-7jxyna5q.js:450626-452297 placement
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
    let trackOrigin = (dir) => {
      let entry = collected.origins.get(dir);
      if (entry === undefined) {
        let newEntry = {};
        newEntry.branchP = getGitBranchForDir(gitState, dir, gitOptions).then((branch) => {
          newEntry.branch = branch;
        });
        newEntry.stateP = getDirRemoteState(gitState, dir).then((state) => {
          newEntry.state = state;
        });
        entry = newEntry;
        collected.origins.set(dir, entry);
        pending.push(entry.branchP, entry.stateP);
      }
      return entry;
    };
    let addTarget = (targetPromise) => {
      collected.pendingTargets++;
      pending.push(
        targetPromise.then((target) => {
          collected.pendingTargets--;
          if (target !== null) collected.targets.push(target);
        }),
      );
    };
    let resolveGhRepoVisibility = async (repoSpecText) => {
      let repoSpec = parseRepoSpec(repoSpecText);
      if (!repoSpec) return "unresolved";
      return checkRepoVisibility(repoSpec.host, repoSpec.owner, repoSpec.name);
    };
    trackOrigin(cwd);
    let resolveCwdOption = (optionSpan) => {
      let gitDirOption = getGitDirOption(optionSpan);
      if (gitDirOption === undefined) return cwd;
      return isAbsolute(gitDirOption) ? gitDirOption : resolve(cwd, gitDirOption);
    };
    for (let gitMutation of gitMutations) {
      let dir = resolveCwdOption(gitMutation.optsSpan);
      let origin = trackOrigin(dir);
      if (gitMutation.kind === "remote-mutate") {
        let url = secondOperandOf(gitMutation.rest);
        if (url !== undefined) addTarget(resolveRemoteVisibility(url));
        continue;
      }
      let targets = listGhRepoTargets(gitMutation.rest);
      if (targets.length === 0) {
        addTarget(
          (async () => {
            await origin.branchP;
            let branch = await gitPull(gitState, dir, origin.branch, gitOptions);
            return resolveNamedRemoteVisibility(gitState, dir, branch, origin, gitOptions);
          })(),
        );
        continue;
      }
      for (let target of targets)
        if (looksLikeGitRemoteUrl(target)) addTarget(resolveRemoteVisibility(target));
        else addTarget(resolveNamedRemoteVisibility(gitState, dir, target, origin, gitOptions));
    }
    for (let ghCommand of ghCommands) {
      let replaced = (ghCommand[1] ?? "").replace(/\s+/g, " ");
      let repoSpec = ghCommand[2] ?? "";
      let ghRepoFlag = getGhRepoFlag(repoSpec);
      let forkSpec =
        replaced === "repo fork" && ghRepoFlag === undefined
          ? firstOperandOf(repoSpec, GH_FORK_VALUE_FLAGS)
          : undefined;
      let repoTarget = ghRepoFlag ?? forkSpec;
      if (repoTarget !== undefined) addTarget(resolveGhRepoVisibility(repoTarget));
      if (replaced === "pr create" && getHeadOwner(repoSpec) !== undefined)
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
