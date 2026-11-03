/**
 * utils/permissions/_new/collectRepoVisibilityMeta.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (6)
 * attribution: sole-consumer-new 6
 */
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
} from "path";
import { execGitNoThrow, getGitBranchForDir } from "../../execFileNoThrow.js";
import {
  oqe,
  effectiveVisibility,
  checkRepoVisibility,
  isRepoVisibilityCheckEnabled,
} from "../../github/repoVisibility.js";
import { parseGitRemote } from "../../detectRepository.js";
import {
  MAX_REMOTE_SCAN_LENGTH,
  isGitRemoteMutation,
  U$,
  GH_MUTATION_RE,
  X$,
  parseRepoSpec,
  getGitDirOption,
  G$,
  listGhRepoTargets,
  getGhRepoFlag,
  fk,
  K$,
  getHeadOwner,
} from "../../../tools/BashTool/gitRemoteMutation.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../../tools/PowerShellTool/toolName.js";
import { isRemoteOnlyCheck } from "../checkRegistry.js";
import { getCwd } from "../../cwd.js";
import { getDirRemoteState } from "./_new/getDirRemoteState.js";
import { gitPull } from "../../plugins/marketplaceManager.js";
import { sleep } from "../../sleep.js";

//@ chunk-s61vbvea.js:532376-532583 sole-consumer-new
async function getRemoteUrlForPush(e, n, r, s) {
  if (e.hasDir(n)) return e.namedRemoteUrl(n, r);
  let h = await execGitNoThrow(n, ["config", "--get", `remote.${r}.pushurl`], s);
  if (h !== void 0) return h;
  return execGitNoThrow(n, ["config", "--get", `remote.${r}.url`], s);
}
/**
 * 把收集到的 origin 状态与推送目标去重排序，生成分类器 repoVisibility 元数据列表；有无法解析或（超时后）仍在等待的目标时追加 remote 为空、visibility 为 unknown 的一项。
 */
//@ chunk-s61vbvea.js:532583-533196 sole-consumer-new
function buildRepoVisibilityMeta(e, n) {
  let entries = [],
    seen = new Set(),
    hasUnresolved = !1;
  for (let S of e.origins.values())
    if (S.state) {
      let w = `${S.state.host}/${S.state.slug}`;
      if (!seen.has(w))
        (seen.add(w),
          entries.push({
            remote: oqe(S.state.slug),
            ...(S.branch !== void 0 && { branch: oqe(S.branch) }),
            visibility: effectiveVisibility(S.state),
          }));
    } else hasUnresolved = !0;
  let targets = [];
  for (let target of e.targets)
    if (target === "unresolved") hasUnresolved = !0;
    else targets.push(target);
  targets.sort((S, w) => `${S.host}/${S.slug}`.localeCompare(`${w.host}/${w.slug}`));
  for (let S of targets) {
    let w = `${S.host}/${S.slug}`;
    if (seen.has(w)) continue;
    (seen.add(w), entries.push({ remote: oqe(S.slug), visibility: effectiveVisibility(S) }));
  }
  if (n && e.pendingTargets > 0) hasUnresolved = !0;
  if (hasUnresolved) entries.push({ remote: "", visibility: "unknown" });
  return entries;
}
//@ chunk-s61vbvea.js:533196-533258 sole-consumer-new
function mk(e) {
  return e.includes("://") || e.startsWith("git@");
}
//@ chunk-s61vbvea.js:533258-533360 sole-consumer-new
async function resolveRemoteVisibility(e) {
  let n = mk(e) ? parseGitRemote(e) : null;
  if (!n) return "unresolved";
  return checkRepoVisibility(n.host, n.owner, n.name);
}
//@ chunk-s61vbvea.js:533360-533523 sole-consumer-new
async function resolveNamedRemoteVisibility(e, n, r, s, h) {
  if (r === "origin") return (await s.stateP, s.state ? null : "unresolved");
  let y = await getRemoteUrlForPush(e, n, r, h);
  if (y === void 0) return "unresolved";
  return resolveRemoteVisibility(y);
}
/**
 * 对 Bash/PowerShell 中会把数据推到外部的 git/gh 命令（push、remote set-url、gh pr/repo/release 等），解析目标仓库并查询可见性，在时限内返回 repoVisibility 元数据（超时返回已得部分）；任何异常返回 null。
 */
//@ chunk-s61vbvea.js:533523-535191 sole-consumer-new
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
    let command = input.command,
      gitMutations = isGitRemoteMutation(command),
      ghCommands = U$(GH_MUTATION_RE, command);
    if (!gitMutations.length && !ghCommands.length) return null;
    let cwd = getCwd(),
      gitState = X$(),
      collected = { origins: new Map(), targets: [], pendingTargets: 0 },
      pending = [],
      trackOrigin = (se) => {
        let re = collected.origins.get(se);
        if (re === void 0) {
          let he = {};
          ((he.branchP = getGitBranchForDir(gitState, se, gitOptions).then((Se) => {
            he.branch = Se;
          })),
            (he.stateP = getDirRemoteState(gitState, se).then((Se) => {
              he.state = Se;
            })),
            (re = he),
            collected.origins.set(se, re),
            pending.push(re.branchP, re.stateP));
        }
        return re;
      },
      addTarget = (se) => {
        (collected.pendingTargets++,
          pending.push(
            se.then((re) => {
              if ((collected.pendingTargets--, re !== null)) collected.targets.push(re);
            }),
          ));
      },
      resolveGhRepoVisibility = async (se) => {
        let re = parseRepoSpec(se);
        if (!re) return "unresolved";
        return checkRepoVisibility(re.host, re.owner, re.name);
      };
    trackOrigin(cwd);
    let resolveCwdOption = (se) => {
      let re = getGitDirOption(se);
      if (re === void 0) return cwd;
      return isAbsolute_14(re) ? re : resolve_10(cwd, re);
    };
    for (let se of gitMutations) {
      let re = resolveCwdOption(se.optsSpan),
        he = trackOrigin(re);
      if (se.kind === "remote-mutate") {
        let ce = G$(se.rest);
        if (ce !== void 0) addTarget(resolveRemoteVisibility(ce));
        continue;
      }
      let Se = listGhRepoTargets(se.rest);
      if (Se.length === 0) {
        addTarget(
          (async () => {
            await he.branchP;
            let ce = await gitPull(gitState, re, he.branch, gitOptions);
            return resolveNamedRemoteVisibility(gitState, re, ce, he, gitOptions);
          })(),
        );
        continue;
      }
      for (let ce of Se)
        if (mk(ce)) addTarget(resolveRemoteVisibility(ce));
        else addTarget(resolveNamedRemoteVisibility(gitState, re, ce, he, gitOptions));
    }
    for (let se of ghCommands) {
      let replaced = (se[1] ?? "").replace(/\s+/g, " "),
        he = se[2] ?? "",
        Se = getGhRepoFlag(he),
        ce = replaced === "repo fork" && Se === void 0 ? fk(he, K$) : void 0,
        we = Se ?? ce;
      if (we !== void 0) addTarget(resolveGhRepoVisibility(we));
      if (replaced === "pr create" && getHeadOwner(he) !== void 0) addTarget(Promise.resolve("unresolved"));
    }
    let allSettled = Promise.all(pending).then(() => buildRepoVisibilityMeta(collected, !1)),
      abortController = new AbortController(),
      timeout = sleep(timeoutMs, abortController.signal).then(() => null);
    try {
      let winner = await Promise.race([allSettled, timeout]);
      if (winner !== null) return winner.length > 0 ? winner : null;
      let re = buildRepoVisibilityMeta(collected, !0);
      return re.length > 0 ? re : null;
    } finally {
      (abortController.abort(), allSettled.catch(() => {}));
    }
  } catch {
    return null;
  }
}

export { collectRepoVisibilityMeta };
