/**
 * utils/commitAttribution.ts
 *
 * 按文件追踪 Claude 的字符级贡献（fileStates、内容 hash），在提交时结合 git diff 计算 Claude/人工贡献比例；另混入 3wek6r2k 的启动/模型目录代码
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/commitAttribution.ts
 * pieces: chunk-0sfjpx19.js (1), chunk-18hwfzwa.js (1), chunk-2a8yx6fc.js (1), chunk-38t4c9qz.js (2), chunk-82kqcve8.js (1), chunk-89f54s6c.js (1), chunk-gjx0rh1b.js (1), chunk-s61vbvea.js (23)
 * attribution: placement 2, fingerprint 14, callgraph-fingerprint 2, layout 11, file-local 1, sole-consumer 1
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
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
} from "path";
import { promisify } from "util";
import { realpath as realpath_2 } from "fs";
import { stat, stat as stat_2, stat as stat_3, stat as stat_4, stat as stat_5, lstat } from "fs/promises";
import { createHash } from "crypto";
import { serializeCalls } from "./promiseQueue.js";
import { getRemoteUrlForGitDir, getRemoteUrlForDir } from "./git/gitFilesystem.js";
import { isAllowedGitRemote, eM, Nnt, ZI, buildGitEnv, mee, Lnt } from "./git/builderGit/gitEnv.js";
import { getGitRepoCache } from "./git/gitRepoCache.js";
import { env } from "./env.js";
import { getFsImplementation } from "./fsOperations.js";
import { Tm, toUncLongPath } from "./windowsUncPaths.js";
import { logError } from "./log.js";
import { logForDebugging } from "./debug.js";
import {
  ty,
  checkLinguistGenerated,
  GitListingError,
  Qs,
  qs,
  gitListingError,
} from "./attributionFileClasses.js";
import { getSessionId, getOriginalCwd } from "../bootstrap/state.js";
import { findGitRootRecheckingNegative, findGitRoot, gitExe } from "./git.js";
import { getEnvCaseInsensitive } from "./plugins/securityDefaultPlugin.js";
import { getRemoteHostSessionCount } from "../commands/insights.js";
import { buildGitConfigEnv } from "./git/gitConfigEnv.js";
import { lb } from "./git/gitSafeEnv.js";
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { isENOENT } from "./errors.js";
import { findExistingRefs, qot } from "./git/gitConfigFilters.js";
import { listGitRefs } from "./git/builderGit/gitConfigAudit.js";
import {
  Nr,
  summarizeStatusEntries,
  parseNameStatusZ,
  classifyPathIdentity,
} from "./teleport/gitBundleLayout.js";

//@ chunk-s61vbvea.js:206706-207384 fingerprint = sanitizeModelName (0.64)
var sanitizeModelName = [
  ["fable-5-1", "claude-fable-5-1"],
  ["fable-5", "claude-fable-5"],
  ["mythos-5-1", "claude-mythos-5-1"],
  ["mythos-5", "claude-mythos-5"],
  ["opus-5-5", "claude-opus-5-5"],
  ["opus-5", "claude-opus-5"],
  ["opus-4-8", "claude-opus-4-8"],
  ["opus-4-7", "claude-opus-4-7"],
  ["opus-4-6", "claude-opus-4-6"],
  ["opus-4-5", "claude-opus-4-5"],
  ["opus-4-1", "claude-opus-4-1"],
  ["opus-4", "claude-opus-4"],
  ["sonnet-5-5", "claude-sonnet-5-5"],
  ["sonnet-5", "claude-sonnet-5"],
  ["sonnet-4-6", "claude-sonnet-4-6"],
  ["sonnet-4-5", "claude-sonnet-4-5"],
  ["sonnet-4", "claude-sonnet-4"],
  ["sonnet-3-7", "claude-sonnet-3-7"],
  ["haiku-5-5", "claude-haiku-5-5"],
  ["haiku-4-5", "claude-haiku-4-5"],
  ["haiku-3-5", "claude-haiku-3-5"],
];
/**
 * 判断仓库是否为 Anthropic 内部模型仓库（决定署名中能否写具体模型名），结果缓存。
 */
//@ chunk-s61vbvea.js:290187-290489 fingerprint = isInternalModelRepo (0.696)
var isInternalModelRepo = serializeCalls(async (e, n, r) => {
  if (r !== void 0) {
    let R = await getRemoteUrlForGitDir(r.gitDir, r.commonDir);
    return R !== null && isAllowedGitRemote(R);
  }
  let s = eM(e),
    repoClassByCanonicalRoot = getGitRepoCache().repoClassByCanonicalRoot,
    y = repoClassByCanonicalRoot.get(s);
  if (y !== void 0) return y === "internal";
  let remoteUrl = await getRemoteUrlForDir(e);
  if (!remoteUrl) return (repoClassByCanonicalRoot.set(s, "none"), !1);
  let w = isAllowedGitRemote(remoteUrl);
  return (repoClassByCanonicalRoot.set(s, w ? "internal" : "external"), w);
});
//@ chunk-s61vbvea.js:290489-290564 layout
function getModelFamilyForAttribution(e) {
  let found = sanitizeModelName.find(([r]) => e.includes(r));
  return found ? found[1] : "claude";
}
//@ chunk-s61vbvea.js:290564-290617 fingerprint = getClientSurface (1)
function getClientSurface() {
  return env.CLAUDE_CODE_ENTRYPOINT ?? "cli";
}
//@ chunk-s61vbvea.js:290617-290661 layout
function getAttributionFileKey(e, n) {
  return isAbsolute_4(e) ? resolveAttributionKey(e, n).key : e;
}
//@ chunk-s61vbvea.js:290661-290762 layout
function getAttributionRoots(e = Nnt()) {
  let n = e;
  try {
    n = getFsImplementation().realpathSync(e);
  } catch {}
  return { cwd: e, keyRoot: n, root: Tm(e) ?? e };
}
//@ chunk-s61vbvea.js:290762-291144 layout
function resolveAttributionKey(e, n) {
  let r = getFsImplementation(),
    s = n?.cwd ?? Nnt();
  if (isAbsolute_4(e) && ZI(s)) return { key: Tm(e) ?? e, root: void 0 };
  if (!isAbsolute_4(e)) return { key: e, root: n?.root ?? Tm(s) ?? s };
  let { keyRoot: keyRoot, root: root } = n ?? getAttributionRoots(s),
    S = e;
  try {
    S = r.realpathSync(e);
  } catch {}
  if (S.startsWith(keyRoot + sep_3) || S === keyRoot)
    return { key: relative_3(keyRoot, S).replaceAll(sep_3, "/"), root: root };
  if (e.startsWith(s + sep_3) || e === s) return { key: relative_3(s, e).replaceAll(sep_3, "/"), root: root };
  return { key: e, root: void 0 };
}
/**
 * 新建署名状态：fileStates（文件 → Claude 贡献字符数与内容 hash）、客户端 surface、起始 HEAD、各类计数（提示、权限提示、Esc）。
 */
//@ chunk-s61vbvea.js:291144-291416 fingerprint = createEmptyAttributionState (0.893)
function createEmptyAttributionState() {
  return {
    fileStates: new Map(),
    surface: getClientSurface(),
    startingHeadSha: null,
    promptCount: 0,
    promptCountAtLastCommit: 0,
    permissionPromptCount: 0,
    permissionPromptCountAtLastCommit: 0,
    escapeCount: 0,
    escapeCountAtLastCommit: 0,
    verificationMethods: [],
    verificationMethodsByCheckout: {},
  };
}
/**
 * 计算单个文件修改后的署名状态（累计 Claude 贡献、内容 hash、mtime）。
 */
//@ chunk-s61vbvea.js:291416-291847 fingerprint = computeFileModificationState (0.902)
function computeFileModificationState(e, n, r, s, h, y) {
  let { key: key, root: root } = resolveAttributionKey(n, y);
  try {
    let claudeContribution;
    if (r === "" || s === "") claudeContribution = r === "" ? s.length : r.length;
    else {
      let minLen = Math.min(r.length, s.length),
        G = 0;
      while (G < minLen && r[G] === s[G]) G++;
      let L = 0;
      while (L < minLen - G && r[r.length - 1 - L] === s[s.length - 1 - L]) L++;
      let q = r.length - G - L,
        Q = s.length - G - L;
      claudeContribution = Math.max(q, Q);
    }
    let existingContribution = e.get(key)?.claudeContribution ?? 0;
    return {
      contentHash: computeContentHash(s),
      claudeContribution: existingContribution + claudeContribution,
      mtime: h,
      ...(root !== void 0 && { root: root }),
    };
  } catch (error) {
    return (logError(error), null);
  }
}
/**
 * 记录 Claude 对一个文件的修改：按旧/新内容计算 Claude 贡献字符数并更新 fileStates（键为相对仓库根的路径）。
 */
//@ chunk-s61vbvea.js:291847-292079 fingerprint = trackFileModification (1)
function trackFileModification(state, filePath, oldContent, newContent, _userModified, mtime = Date.now()) {
  let S = getAttributionRoots(),
    w = getAttributionFileKey(filePath, S),
    R = computeFileModificationState(state.fileStates, filePath, oldContent, newContent, mtime, S);
  if (!R) return state;
  let newFileStates = new Map(state.fileStates);
  return (
    newFileStates.set(w, R),
    logForDebugging(`Attribution: Tracked ${R.claudeContribution} chars for ${w}`),
    { ...state, fileStates: newFileStates }
  );
}
//@ chunk-s61vbvea.js:292079-292120 layout
function isDeletedFileState(e) {
  return e.contentHash === "";
}
/**
 * 批量记录文件变更（含删除）到署名状态。
 */
//@ chunk-s61vbvea.js:292120-292680 fingerprint = trackBulkFileChanges (0.982)
function trackBulkFileChanges(state, changes) {
  let newFileStates = new Map(state.fileStates),
    s = getAttributionRoots();
  for (let change of changes) {
    let y = change.mtime ?? Date.now();
    if (change.type === "deleted") {
      let { key: key, root: root } = resolveAttributionKey(change.path, s),
        x = newFileStates.get(key)?.claudeContribution ?? 0,
        deletedChars = change.oldContent.length;
      (newFileStates.set(key, {
        contentHash: "",
        claudeContribution: x + deletedChars,
        mtime: y,
        ...(root !== void 0 && { root: root }),
      }),
        logForDebugging(
          `Attribution: Tracked deletion of ${key} (${deletedChars} chars removed, total contribution: ${x + deletedChars})`,
        ));
    } else {
      let S = computeFileModificationState(
        newFileStates,
        change.path,
        change.oldContent,
        change.newContent,
        y,
        s,
      );
      if (S) {
        let w = getAttributionFileKey(change.path, s);
        (newFileStates.set(w, S),
          logForDebugging(`Attribution: Tracked ${S.claudeContribution} chars for ${w}`));
      }
    }
  }
  return { ...state, fileStates: newFileStates };
}
//@ chunk-s61vbvea.js:292680-292817 layout
function relativePosixPathInside(e, n) {
  if (!isAbsolute_4(e)) return null;
  let r = relative_3(n, e);
  return r !== "" && !isAbsolute_4(r) && r !== ".." && !r.startsWith(`..${sep_3}`)
    ? r.replaceAll(sep_3, "/")
    : null;
}
//@ chunk-s61vbvea.js:292817-293128 file-local
function trackFileDeletion(e, n) {
  let r = !1;
  for (let h of e.fileStates.keys())
    if (relativePosixPathInside(h, n) !== null) {
      r = !0;
      break;
    }
  if (!r) return e;
  let s = new Map();
  for (let [h, y] of e.fileStates) {
    let S = relativePosixPathInside(h, n) ?? h,
      existingState = s.get(S);
    s.set(
      S,
      existingState === void 0
        ? y
        : {
            ...(y.mtime >= existingState.mtime ? y : existingState),
            claudeContribution: existingState.claudeContribution + y.claudeContribution,
          },
    );
  }
  return { ...e, fileStates: s };
}
/**
 * resume 时从转录中的 attribution-snapshot 记录重建署名状态。
 */
//@ chunk-s61vbvea.js:293128-294149 fingerprint = restoreAttributionStateFromSnapshots (0.305)
function restoreAttributionStateFromSnapshots(e, n) {
  switch (n.kind) {
    case "trackEdit":
      return trackFileModification(
        { ...e, surface: n.surface },
        n.filePath,
        n.oldContent,
        n.newContent,
        n.userModified,
        n.mtime,
      );
    case "trackBulk":
      return trackBulkFileChanges({ ...e, surface: n.surface }, n.changes);
    case "commitBoundary":
      return {
        ...e,
        promptCountAtLastCommit: n.promptCountAtLastCommit,
        permissionPromptCountAtLastCommit: n.permissionPromptCountAtLastCommit,
        escapeCountAtLastCommit: n.escapeCountAtLastCommit,
      };
    case "incrementPermissionPrompt":
      return { ...e, permissionPromptCount: e.permissionPromptCount + 1 };
    case "recordVerification": {
      let included = e.verificationMethods.includes(n.method),
        verificationMethodsByCheckout = e.verificationMethodsByCheckout,
        h = n.checkout === void 0 ? void 0 : (verificationMethodsByCheckout[n.checkout] ?? []);
      if (included && (h === void 0 || h.includes(n.method))) return e;
      let y =
        h?.length === 0 && Object.keys(verificationMethodsByCheckout).length >= ty
          ? Object.fromEntries(Object.entries(verificationMethodsByCheckout).slice(1))
          : verificationMethodsByCheckout;
      return {
        ...e,
        verificationMethods: included ? e.verificationMethods : [...e.verificationMethods, n.method],
        verificationMethodsByCheckout:
          n.checkout === void 0 || h === void 0 || h.includes(n.method)
            ? verificationMethodsByCheckout
            : { ...y, [n.checkout]: [...h, n.method] },
      };
    }
  }
}
//@ chunk-s61vbvea.js:294149-294225 layout
function gitDirWorkTreeArgs(e, n) {
  return n === void 0 ? [] : [`--git-dir=${n}`, `--work-tree=${e}`];
}
//@ chunk-s61vbvea.js:294225-294246 layout
var realpathNativeAsync = promisify(realpath_2.native);
//@ chunk-s61vbvea.js:294246-294310 layout
async function realpathOrSelf(e) {
  try {
    return toUncLongPath(await realpathNativeAsync(e));
  } catch {
    return e;
  }
}
/**
 * 计算一次提交的署名：合并各 surface 的 fileStates，对暂存（或指定）文件比对内容 hash 与 git diff 大小，得出 Claude 与人工贡献比例；排除生成文件。
 */
//@ chunk-s61vbvea.js:294310-296290 fingerprint = calculateCommitAttribution (0.831)
async function calculateCommitAttribution(e, n, r = { staged: !0 }) {
  let s = r.repoRoot ?? Nnt(),
    cwd = getSessionId(),
    sessionId = Nnt(),
    S = await realpathOrSelf(sessionId),
    w = s === sessionId ? S : await realpathOrSelf(s),
    R = w === S,
    x = new Map(),
    excludedGenerated = [],
    surfaces = new Set(),
    G = new Map(),
    L = 0,
    q = 0,
    mergedFileStates = new Map();
  for (let state of e) {
    surfaces.add(state.surface);
    let Ee =
      state.fileStates instanceof Map ? state.fileStates : new Map(Object.entries(state.fileStates ?? {}));
    for (let [Ie, ke] of Ee) {
      let existing = mergedFileStates.get(Ie);
      if (existing)
        mergedFileStates.set(Ie, {
          ...ke,
          claudeContribution: existing.claudeContribution + ke.claudeContribution,
        });
      else mergedFileStates.set(Ie, ke);
    }
  }
  let Z = r.gitDir !== void 0 || findGitRootRecheckingNegative(s) !== null,
    [ee, ae] = await Promise.all([
      checkLinguistGenerated(n, s, {
        env: getGitEnvForRepoRoot(s),
        inRepo: Z,
        repoArgs: gitDirWorkTreeArgs(s, r.gitDir),
      }),
      Z ? getDeletedFiles({ ...r, repoRoot: s }) : new Set(),
    ]),
    se,
    re = async (ie) => (Z ? ((await (se ??= getGitDiffSize({ ...r, repoRoot: s }))).get(ie) ?? 0) : 0),
    fileResults = await Promise.all(
      n.map(async (file) => {
        if (ee.has(file)) return { type: "generated", file: file };
        let absPath = join_6(s, file),
          Ie = R ? file : relativePosixPathInside(join_6(w, file), S),
          ke = R ? void 0 : mergedFileStates.get(file),
          Me =
            mergedFileStates.get(absPath) ??
            (Ie === null ? void 0 : mergedFileStates.get(Ie)) ??
            (ke?.root === w ? ke : void 0),
          fileSurface = e[0].surface,
          nt = 0,
          Be = 0;
        if (ae.has(file))
          if (Me && isDeletedFileState(Me)) ((nt = Me.claudeContribution), (Be = 0));
          else if (Me) return null;
          else {
            let deleted = await re(file);
            Be = deleted > 0 ? deleted : 100;
          }
        else
          try {
            let diffSize = await stat_4(absPath);
            if (Me) ((nt = Me.claudeContribution), (Be = 0));
            else {
              let stats = await re(file);
              Be = stats > 0 ? stats : diffSize.size;
            }
          } catch (error) {
            if (error instanceof GitListingError) throw error;
            return null;
          }
        ((nt = Math.max(0, nt)), (Be = Math.max(0, Be)));
        let Re = nt + Be,
          Ne = Re > 0 ? Math.round((nt / Re) * 100) : 0;
        return {
          type: "file",
          file: file,
          claudeChars: nt,
          humanChars: Be,
          percent: Ne,
          surface: fileSurface,
        };
      }),
    );
  for (let result of fileResults) {
    if (!result) continue;
    if (result.type === "generated") {
      excludedGenerated.push(result.file);
      continue;
    }
    (x.set(result.file, {
      claudeChars: result.claudeChars,
      humanChars: result.humanChars,
      percent: result.percent,
      surface: result.surface,
    }),
      (L += result.claudeChars),
      (q += result.humanChars),
      G.set(result.surface, (G.get(result.surface) ?? 0) + result.claudeChars));
  }
  let Se = L + q,
    ce = Se > 0 ? Math.round((L / Se) * 100) : 0,
    we = new Map();
  for (let [ie, Ee] of G) {
    let Ie = Se > 0 ? Math.round((Ee / Se) * 100) : 0;
    we.set(ie, { claudeChars: Ee, percent: Ie });
  }
  return {
    version: 1,
    summary: { claudePercent: ce, claudeChars: L, humanChars: q, surfaces: Array.from(surfaces) },
    files: Object.fromEntries(x),
    surfaceBreakdown: Object.fromEntries(we),
    excludedGenerated: excludedGenerated,
    sessions: [cwd],
  };
}
//@ chunk-s61vbvea.js:296290-296524 layout
function buildAttributionGitEnv(e = {}, { envGrants: n = !0, base: r, userLocale: s } = {}) {
  let h = r ?? process.env,
    y = {};
  for (let S of ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"]) {
    let w = getEnvCaseInsensitive(h, S);
    if (w !== void 0) y[S] = w;
  }
  return getRemoteHostSessionCount(
    { ...y, ...(n ? buildGitConfigEnv(h) : {}), ...e },
    { base: r, userLocale: s },
  );
}
//@ chunk-s61vbvea.js:296524-296667 layout
function getGitEnvForRepoRoot(e, { userLocale: n } = {}) {
  let r = buildGitEnv(void 0),
    s = getOriginalCwd();
  return e === s || e === findGitRoot(s)
    ? buildAttributionGitEnv({}, { base: r, userLocale: n })
    : getRemoteHostSessionCount(void 0, { base: r, userLocale: n });
}
/**
 * git diff --numstat（默认 --cached）取各文件改动大小。
 */
//@ chunk-s61vbvea.js:296667-297170 callgraph-fingerprint = getGitDiffSize (0.26)
async function getGitDiffSize(filePath = { staged: !0 }) {
  let n = filePath.repoRoot ?? Nnt(),
    r = new Map(),
    s = [...gitDirWorkTreeArgs(n, filePath.gitDir), "diff", lb];
  if (filePath.staged) s.push("--cached");
  s.push("--numstat", "--no-renames", "--relative", "-z");
  let result = await execFileNoThrowWithCwd(gitExe(), s, {
    cwd: n,
    timeout: Qs,
    maxBuffer: qs,
    env: getGitEnvForRepoRoot(n, { userLocale: !filePath.staged }),
    extendEnv: !1,
  });
  if (result.code !== 0 || result.maxBufferExceeded) throw gitListingError("git diff --numstat", result);
  for (let y of result.stdout.split("\x00")) {
    let insertMatch = y.match(/^(\d+)\t(\d+)\t(.+)$/s);
    if (insertMatch) {
      let w = parseInt(insertMatch[1], 10) + parseInt(insertMatch[2], 10);
      r.set(insertMatch[3], w * 40);
    }
  }
  return r;
}
/**
 * git diff --name-only --diff-filter=D 列出删除的文件（默认暂存区）。
 */
//@ chunk-s61vbvea.js:297170-297593 sole-consumer
async function getDeletedFiles(e = { staged: !0 }) {
  let n = e.repoRoot ?? Nnt(),
    r = [...gitDirWorkTreeArgs(n, e.gitDir), "diff", lb];
  if (e.staged) r.push("--cached");
  r.push("--name-only", "--diff-filter=D", "--no-renames", "--relative", "-z");
  let s = await execFileNoThrowWithCwd(gitExe(), r, {
    cwd: n,
    timeout: Qs,
    maxBuffer: qs,
    env: getGitEnvForRepoRoot(n, { userLocale: !e.staged }),
    extendEnv: !1,
  });
  if (s.code !== 0 || s.maxBufferExceeded) throw gitListingError("git diff --diff-filter=D", s);
  return new Set(s.stdout.split("\x00").filter(Boolean));
}
//@ chunk-38t4c9qz.js:227-251 placement
var AS = /^[0-9a-f]{64}$/;
/**
 * sha256 十六进制摘要（文本或字节），全局 140 余处用于内容比较。
 */
//@ chunk-38t4c9qz.js:251-466 callgraph-fingerprint = computeContentHash (0.567)
function computeContentHash(content) {
  if (typeof content !== "string" && !ArrayBuffer.isView(content))
    throw Object.assign(TypeError("sha256Hex: the data is neither text nor bytes"), {
      code: "ERR_INVALID_ARG_TYPE",
    });
  return createHash("sha256").update(content).digest("hex");
}
//@ chunk-0sfjpx19.js:132835-133572 placement
function createCommitAttributionState() {
  return {
    fileContentCache: new Map(),
    turnBaselines: new Map(),
    dirtyAttributions: new Map(),
    gitStatusInFlight: new Map(),
    verificationStarts: new Map(),
    pendingCommits: new Map(),
    sessionRepoRoot: null,
    sessionCanonicalRoot: null,
    launchGitDir: null,
    launchCommonDir: null,
    launchModuleDirs: new Map(),
    launchInodeIdentity: !0,
    launchPinHandles: [],
    launchHeldDirs: new Set(),
    vouchedRepos: new Map(),
    everVouchedRepos: new Set(),
    launchStateTaken: !1,
    startFolderReposDue: [],
    launchRepoRoot: null,
    nonGitLaunch: !1,
    commitGateLatched: !1,
    launchHookRepo: null,
    pendingVouches: [],
    attachedDirs: new Set(),
    registration: Promise.resolve(),
    statusCapHits: 0,
    statusBackedOff: !1,
    statusBackoffSkips: 0,
    lastStatus: null,
    hooksRegistered: !1,
    commitVerifyGateBlockCounts: new Map(),
    armedTrailerFiles: new Map(),
  };
}
//@ chunk-18hwfzwa.js:119585-119627 fingerprint = getStagedFiles (0.456)
function getStagedFiles(h) {
  return h?.source === "diff";
}
//@ chunk-2a8yx6fc.js:14314-14432 fingerprint = isInternalModelRepoCached (0.543)
function isInternalModelRepoCached(e) {
  let n = typeof e === "string" ? e.toLowerCase() : "";
  return n === "public" || n === "private" || n === "internal" ? n : null;
}
//@ chunk-82kqcve8.js:235773-235885 fingerprint = normalizeFilePath (1)
function normalizeFilePath(filePath) {
  try {
    return getFsImplementation().realpathSync(filePath);
  } catch (error) {
    if (!isENOENT(error) || dirname(filePath) === filePath) throw error;
    return join(normalizeFilePath(dirname(filePath)), basename(filePath));
  }
}
//@ chunk-89f54s6c.js:13743-13998 fingerprint = isGitTransientState (0.913)
async function isGitTransientState(i, o) {
  if (
    (
      await Promise.all(
        ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "BISECT_LOG", "rebase-merge", "rebase-apply"].map(
          (indicator) =>
            lstat(join(i, indicator)).then(
              () => !0,
              () => !1,
            ),
        ),
      )
    ).includes(!0)
  )
    return !0;
  let s = await findExistingRefs(i, qot, o);
  return s === null ? null : s.size > 0;
}
//@ chunk-gjx0rh1b.js:113077-113464 fingerprint = isFileDeleted (0.485)
async function isFileDeleted(e, n, r, o) {
  let s = (p) => listGitRefs(e, [...mee, ...p], { hardened: !1, signal: r, env: Lnt, maxBuffer: Nr }),
    [l, h] = await Promise.all([
      s(["diff", "--name-status", "-z", "--no-renames", lb, `${n}^1`, n, "--"]),
      s(["diff", "--name-status", "-z", "--no-renames", lb, `${n}^1`, `${n}^2`, "--"]),
    ]);
  if (l.code !== 0 || h.code !== 0) return null;
  let u = summarizeStatusEntries(parseNameStatusZ(l.stdout), parseNameStatusZ(h.stdout), e);
  return classifyPathIdentity(e, u.paths, u.added, o, u.deleted);
}

export {
  computeContentHash,
  AS,
  createCommitAttributionState,
  createEmptyAttributionState,
  normalizeFilePath,
  getStagedFiles,
  restoreAttributionStateFromSnapshots,
  isInternalModelRepoCached,
  isGitTransientState,
  isInternalModelRepo,
  trackFileDeletion,
  calculateCommitAttribution,
  getModelFamilyForAttribution,
  isFileDeleted,
};
