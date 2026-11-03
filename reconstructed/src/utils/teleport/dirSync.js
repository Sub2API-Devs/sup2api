/**
 * utils/teleport/dirSync.ts
 *
 * 2.1.316 新增：目录同步
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (56)
 * attribution: placement 56
 */
import { sep, join, resolve as resolve_2, parse, dirname, isAbsolute, relative } from "path";
import { readdir, lstat } from "fs/promises";
import { homedir } from "os";
import { readdirSync, realpathSync, readlinkSync, lstatSync, writeSync } from "fs";
import { sanitizeErrnoForTelemetry, isPathAbsent, getErrnoCode, errorMessage, toError } from "../errors.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { GIT_SAFE_GLOBAL_ARGS, IGNORE_SUBMODULES_DIRTY_FLAG } from "../git/gitSafeEnv.js";
import { uniq } from "../collections.js";
import { pMap } from "../../../vendor/p-map/index.js";
import { CHANGED_FILE_SCAN_CONCURRENCY } from "./repositoriesTrusted.js";
import { byteBudgetedRetry } from "../fsJunctions.js";
import { MAX_REALPATH_WORK, toUncLongPath } from "../windowsUncPaths.js";
import {
  isCaseInsensitivePlatform as isCaseInsensitivePlatform_2,
  foldPathCase,
} from "../pathCaseFolding.js";
import { foldName } from "../permissions/protectedDirNames.js";
import {
  parentDirsOf,
  nfcLowerNfc,
  hasSpecialLatinLetter,
  foldPathCaseKeepingIgnorables,
} from "./remoteTaskLabels.js";
import { hasBackslash } from "../pathClassification.js";
import { isNetworkMountPath, isNetworkMountRoot_2, neverOtherHostMount } from "../networkPaths.js";
import { getPathNormalizationVariants, isSensitiveNameOrVariant } from "../permissions/sensitivePaths.js";
import { hasDosShortNameSegment } from "../windowsPathNames.js";
import { env } from "../env.js";
import { HostScoped } from "../hostScoped.js";
import {
  getRootSession,
  getFlagSettingsPath,
  isDiskless,
  getFlagAgentsFilePaths,
  getFlagMcpConfigFilePaths,
  getIsInteractive,
} from "../../bootstrap/state.js";
import { permissionRuleValueFromString } from "../permissions/permissionRuleParser.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { require_picomatch_2 } from "../../../vendor/picomatch/index.js";
import {
  stripExtendedPathPrefix,
  removeTrailingGlobSuffix,
  containsGlobChars,
} from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import {
  denyEntryCovers,
  posixCovers,
  matchesGuardedGlob,
  matchesNameReading,
  nameReadingsOfGlobSpelling,
} from "../sandbox/sandbox-adapter.js";
import { getPlatform } from "../platform.js";
import { getClaudeConfigDirs, claudeStatePathPatterns } from "../permissions/claudeStatePaths.js";
import { managedFileSettingsDirs, isManagedSettingsDropInName } from "../settings/managedFileSettings.js";
import { getManagedFilePath } from "../settings/managedPath.js";
import { logError } from "../log.js";
import { logDirSyncHostConfig } from "./dirSyncRules.js";
import { logForDebugging } from "../debug.js";
import { createSignal } from "../signal.js";
import { toInfraSessionId } from "../../bridge/sessionIdCompat.js";
import { string, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { CLEANUP_TIMEOUT_MS, registerCleanup } from "../cleanupRegistry.js";
import { stripControlChars as stripControlChars_3 } from "../settings/writeQueues.js";

//@ chunk-e6aww6q8.js:1882524-1882609 placement
function joinAsLatin1Buffer(e, n) {
  return Buffer.concat([Buffer.from(e + sep), Buffer.from(n, "latin1")]);
}
//@ chunk-e6aww6q8.js:1882609-1883138 placement
/**
 * 检查目录同步目标子目录是否已有内容、为空还是无权限，并识别沿途符号链接。
 */
async function probeSyncedSubdir(repoRoot, n) {
  let r = (error) => ({
    failedWith: sanitizeErrnoForTelemetry(error),
  });
  let s = await readdir(joinAsLatin1Buffer(repoRoot, n)).then(
    (L) => (L.length > 0 ? "stands" : "clear"),
    (error) =>
      isPathAbsent(error)
        ? "clear"
        : ["EACCES", "EPERM"].includes(getErrnoCode(error) ?? "")
          ? "denied"
          : r(error),
  );
  if (s === "clear") return "clear";
  let parts = n.split("/");
  let y = (L) => lstat(joinAsLatin1Buffer(repoRoot, parts.slice(0, L).join("/"))).catch(r);
  let [S, w] = await Promise.all([y(parts.length), Promise.all(parts.slice(1).map((L, G) => y(G + 1)))]);
  if ([S, ...w].some((L) => !("failedWith" in L) && L.isSymbolicLink())) return "clear";
  if (s !== "denied") return s;
  return "failedWith" in S ? S : S.isDirectory() ? "stands" : "clear";
}
//@ chunk-e6aww6q8.js:1883138-1884157 placement
/**
 * 列出工作目录中被跟踪且有改动的文件（git 命令），没有 .git 时返回失败。
 */
async function listChangedTrackedFiles(repoRoot, env) {
  if (!(await lstat(join(repoRoot, ".git")).catch(() => null)))
    return {
      kind: "failed",
      cause: "no_dot_git_seen_at_cwd",
    };
  let r = (Z) =>
    execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...Z], {
      cwd: repoRoot,
      preserveOutputOnError: false,
      env,
      encoding: "latin1",
      maxBuffer: 67108864,
    });
  let [s, h] = await Promise.all([
    r(["diff-index", "-z", "--diff-filter=DT", IGNORE_SUBMODULES_DIRTY_FLAG, "HEAD", "--"]),
    r(["ls-files", "-z", "-v", "-s"]),
  ]);
  if (s.code !== 0)
    return {
      kind: "failed",
      cause: "changed_listing",
    };
  let parts = s.stdout.split("\x00");
  let filtered = parts.filter((Z, Se) => Se % 2 === 1 && !parts[Se - 1]?.startsWith(":160000"));
  let w =
    h.code === 0
      ? Array.from(h.stdout.matchAll(/(?:^|\0)h (?!160000)\d{6} [0-9a-f]+ \d\t([^\0]+)/g), (Z) => Z[1] ?? "")
      : [];
  let L = uniq([...filtered, ...w]);
  if (L.some((Z) => Z.startsWith("/") || Z.split(sep === "\\" ? /[\\/]/ : "/").includes("..")))
    return {
      kind: "failed",
      cause: "tracked_path_leaves_checkout",
    };
  let G = await pMap(L, (Z) => probeSyncedSubdir(repoRoot, Z), {
    concurrency: CHANGED_FILE_SCAN_CONCURRENCY,
  });
  let found = G.find((Z) => typeof Z === "object");
  return found !== undefined
    ? {
        kind: "failed",
        cause: "path_read",
        errno: found.failedWith,
      }
    : {
        kind: "looked",
        replaced: L.filter((Z, Se) => G[Se] === "stands"),
        isAssumeUnchangedListed: h.code === 0,
      };
}
//@ chunk-e6aww6q8.js:1884510-1885139 placement
/**
 * 目录同步时排除的目录名（代理记忆、缓存、备份等）。
 */
var DIR_SYNC_EXCLUDED_DIRS = new Set([
  "agent-memory",
  "agent-memory-local",
  "agent-memory-project",
  "api-dumps",
  "backups",
  "cache",
  "chrome",
  "cowork_plugins",
  "daemon",
  "debug",
  "downloads",
  "dump-prompts",
  "feedback",
  "feedback-bundles",
  "file-history",
  "file-transfers",
  "ide",
  "image-cache",
  "jobs",
  "local",
  "local-settings",
  "logs",
  "mcp-discovery-cache",
  "mcp-skill-archives",
  "paste-cache",
  "plans",
  "plugins",
  "project-settings",
  "projects",
  "remote",
  "remote-control",
  "scratch",
  "seed-admin",
  "session-env",
  "sessions",
  "shares",
  "shell-snapshots",
  "startup-perf",
  "state",
  "statsig",
  "storage-v2",
  "systemd",
  "tasks",
  "teams",
  "telemetry",
  "todos",
  "traces",
  "uploads",
  "usage-data",
]);
//@ chunk-e6aww6q8.js:1885139-1885168 placement
var MAX_SYNC_SCAN_ENTRIES = 20000;
var MAX_SYNC_SCAN_DEPTH = 64;
var MAX_SYNC_SCAN_NODES = 256;
//@ chunk-e6aww6q8.js:1885168-1885388 placement
var UNSUPPORTED_REALPATH_ERRNOS = new Set(["EINVAL", "UNKNOWN", "ENOTSUP"]);
var SYNCED_STATE_DIR_NAMES = new Set(["plugins", "cowork_plugins", "state"]);
var SKIPPED_DEPENDENCY_DIRS = new Set(["node_modules", "venv", ".venv", "__pycache__"]);
var UNCOVERED_ROOT = {
  covers: () => false,
  ground: null,
  targetCount: 0,
  entriesExamined: 0,
};
//@ chunk-e6aww6q8.js:1885388-1890193 placement
/**
 * 判断目录同步的根目录类型（网络位置、家目录内、链接根等）。
 */
function classifyDirSyncRoot(
  e,
  {
    configHomes,
    configFiles,
    configDirs = [],
    peekedDirs = [],
    unwalkedDirs = [],
    vouchedDirs = [],
    home = homedir(),
    maxEntries = MAX_SYNC_SCAN_ENTRIES,
    probes,
  },
) {
  let q = probes?.settled ?? byteBudgetedRetry(MAX_REALPATH_WORK);
  let Z = probes?.real ?? createRealpathCache(q);
  let mapped = e.map((ko) => ({
    root: ko,
    resolved: Z(ko),
  }));
  let found = mapped.find(({ resolved }) => resolved === "unexamined");
  if (found !== undefined)
    return {
      ...UNCOVERED_ROOT,
      ground: {
        kind: "unexamined",
        at: found.root,
        why: "unreadable",
      },
    };
  let we = uniq([
    ...e,
    ...mapped.flatMap(({ resolved }) => (resolved === null || resolved === "unexamined" ? [] : [resolved])),
  ]);
  let any = we.some((ko) => isCaseInsensitivePlatform_2(ko));
  let Ae = (ko, un) => relativeWithCaseFold(ko, un, any);
  let Ie = (ko, un) => !escapesRoot(Ae(ko, un));
  let Me = (ko, un) => Ae(ko, un) === "";
  let We = new Set();
  let ze = () => {};
  let lt = uniq(configHomes.map((configHome) => resolve_2(configHome)));
  let Je = lt[0];
  if (Je !== undefined && we.some((ko) => Me(Je, ko))) return UNCOVERED_ROOT;
  let nt = (ground) => ({
    ...UNCOVERED_ROOT,
    ground,
  });
  let pt = homeSpellings(home, Z);
  let Et = uniq(peekedDirs.map((peekedDir) => resolve_2(peekedDir)));
  let yt = [
    ...pt,
    ...we,
    ...lt,
    ...vouchedDirs
      .map((vouchedDir) => resolve_2(vouchedDir))
      .filter((ko) => !we.some((un) => Ie(un, ko)))
      .flatMap((ko) => {
        let un = classifySyncRootPath(ko, Z, (ao, $o) => !$o.some((yo) => we.some((Ho) => Ie(Ho, yo))));
        return un !== null && typeof un === "object" ? [ko, un.spelling] : [ko];
      })
      .filter(hasNetworkAncestor),
  ];
  let gt = (spelling) => yt.some((un) => Ie(un, spelling));
  let At = (ko) => gt(ko) || yt.some((un) => Ie(ko, un));
  let It = [];
  let Yt = [];
  for (let ko of lt) {
    let un = classifySyncRootPath(ko, Z, () => true, ze);
    if (un === "unexamined" || un === "network")
      return nt({
        kind: "unexamined",
        at: ko,
        why: "unreadable",
      });
    if (un !== null) ze(un.passed);
    if (un !== null && !un.exists) {
      Yt.push({
        path: ko,
        spelling: un.spelling,
      });
      continue;
    }
    let spelling = un === null ? null : un.spelling;
    if (we.some(($o) => Ie(ko, $o)))
      return nt({
        kind: "inside_home",
        home: ko,
      });
    if (spelling !== null && !It.some(($o) => $o.real === spelling)) {
      if (we.some(($o) => Me(spelling, $o)))
        return nt({
          kind: "root_linked",
          link: ko,
        });
      if (we.some(($o) => Ie(spelling, $o)))
        return nt({
          kind: "inside_home",
          home: ko,
        });
      It.push({
        path: ko,
        real: spelling,
      });
      yt.push(spelling);
    }
  }
  let qt = new Set();
  let ground = null;
  let rn = maxEntries;
  let pn = new Set();
  let no = false;
  let hn = (spelling) => Et.length === 0 && pt.some((un) => Ie(spelling, un));
  let ho = (link, spelling) => {
    for (let ao of we) {
      let $o = Ae(ao, spelling);
      if ($o === "")
        ground ??= {
          kind: "root_linked",
          link,
        };
      else if (!escapesRoot($o)) qt.add(foldPathCase($o.split(sep).join("/")));
      else if (Ie(spelling, ao) && !hn(spelling))
        ground ??= {
          kind: "root_linked",
          link,
        };
    }
  };
  let yn = (name, un) => {
    let ao = foldName(name);
    return (
      !name.startsWith(".") && !SKIPPED_DEPENDENCY_DIRS.has(ao) && !(un && DIR_SYNC_EXCLUDED_DIRS.has(ao))
    );
  };
  let Kn = (spelling) =>
    It.some(({ real }) => {
      let ao = Ae(real, spelling);
      return !escapesRoot(ao) && ao !== "" && DIR_SYNC_EXCLUDED_DIRS.has(foldName(ao.split(sep)[0] ?? ""));
    });
  let Xn = (ko, un, ao, $o = false) => {
    let yo = classifySyncRootPath(ko, Z, At, ze);
    if (yo === "unexamined") {
      ground ??= {
        kind: "unexamined",
        at: ko,
        why: "unreadable",
      };
      return;
    }
    if (yo === null) return;
    let Ho = un || $o || no;
    if (yo === "network") {
      if (Ho)
        ground ??= {
          kind: "unexamined",
          at: ko,
          why: "on_share",
        };
      return;
    }
    ze(yo.passed);
    ho(ko, yo.spelling);
    if (
      Ho &&
      ground === null &&
      isUnsafeSyncRootSpelling(yo.spelling) &&
      !gt(yo.spelling) &&
      !hn(yo.spelling)
    ) {
      ground = {
        kind: "unexamined",
        at: ko,
        why: "on_share",
      };
      return;
    }
    let rr =
      yo.exists &&
      ground === null &&
      (!isUnsafeSyncRootSpelling(yo.spelling) || gt(yo.spelling)) &&
      !hn(yo.spelling) &&
      !It.some(({ real }) => Me(real, yo.spelling)) &&
      !Kn(yo.spelling);
    if (un && rr) fo(yo.spelling, false, ao + 1);
    else if ($o && rr) To(yo.spelling, ao + 1);
  };
  let fo = (ko, un, ao) => {
    if (pn.has(ko) || (!un && It.some(({ real }) => Me(real, ko)))) return;
    if (ao > MAX_SYNC_SCAN_NODES) {
      ground ??= {
        kind: "unexamined",
        at: ko,
        why: "too_many",
      };
      return;
    }
    pn.add(ko);
    let $o;
    try {
      $o = q(() =>
        readdirSync(ko, {
          withFileTypes: true,
        }),
      );
    } catch (error) {
      if (!(getErrnoCode(error) === "ENOTDIR" || (!un && isNotFoundErrno(error))))
        ground ??= {
          kind: "unexamined",
          at: ko,
          why: "unreadable",
        };
      return;
    }
    rn -= $o.length + 1;
    if (rn < 0)
      ground ??= {
        kind: "unexamined",
        at: ko,
        why: "too_many",
      };
    for (let yo of $o) {
      if (ground !== null) return;
      let Ho = join(ko, yo.name);
      let rr = classifyDirEntryForCompletion(yo, Ho, Z, q);
      if (rr === "unexamined") {
        ground ??= {
          kind: "unexamined",
          at: Ho,
          why: "unreadable",
        };
        return;
      }
      if (rr === "link") Xn(Ho, yn(yo.name, un), ao, un && SYNCED_STATE_DIR_NAMES.has(foldName(yo.name)));
      else if (rr === "directory") {
        if (yn(yo.name, un)) fo(Ho, false, ao + 1);
        else if (un && SYNCED_STATE_DIR_NAMES.has(foldName(yo.name))) To(Ho, ao + 1);
      }
    }
  };
  let To = (ko, un) => {
    let ao;
    try {
      ao = q(() =>
        readdirSync(ko, {
          withFileTypes: true,
        }),
      );
    } catch (error) {
      if (!isNotFoundErrno(error))
        ground ??= {
          kind: "unexamined",
          at: ko,
          why: "unreadable",
        };
      return;
    }
    rn -= ao.length + 1;
    if (rn < 0)
      ground ??= {
        kind: "unexamined",
        at: ko,
        why: "too_many",
      };
    for (let $o of ao) {
      if (ground !== null) return;
      let yo = join(ko, $o.name);
      let Ho = classifyDirEntryForCompletion($o, yo, Z, q);
      if (Ho === "unexamined") {
        ground ??= {
          kind: "unexamined",
          at: yo,
          why: "unreadable",
        };
        return;
      }
      if (Ho === "link") Xn(yo, false, un);
    }
  };
  for (let { path, spelling } of Yt) ho(path, spelling);
  let flattened = configDirs.flatMap(({ path, accepts }) => {
    let ao = resolve_2(path);
    let $o = classifySyncRootPath(ao, Z, At, ze);
    if ($o === "unexamined") {
      ground ??= {
        kind: "unexamined",
        at: ao,
        why: "unreadable",
      };
      return [];
    }
    if ($o !== null && $o !== "network") {
      ze($o.passed);
      ho(ao, $o.spelling);
    }
    try {
      return q(() => readdirSync(ao))
        .filter(accepts)
        .map((yo) => join(ao, yo));
    } catch (error) {
      if (!isUnreadableRealpathError(error))
        ground ??= {
          kind: "unexamined",
          at: ao,
          why: "unreadable",
        };
      return [];
    }
  });
  let mapped_2 = unwalkedDirs.map((unwalkedDir) => resolve_2(unwalkedDir));
  for (let ko of uniq([
    ...configFiles.map((configFile) => resolve_2(configFile)),
    ...mapped_2,
    ...flattened,
  ])) {
    let un = classifySyncRootPath(ko, Z, At, ze);
    if (un === "unexamined")
      return nt({
        kind: "unexamined",
        at: ko,
        why: "unreadable",
      });
    if (un !== null && un !== "network") {
      ze(un.passed);
      ho(ko, un.spelling);
    }
  }
  for (let { path, real } of It) {
    ho(path, real);
    if (ground === null) fo(real, true, 0);
  }
  no = true;
  for (let ko of Et) if (ground === null) Xn(ko, false, 0, true);
  let entriesExamined = maxEntries - Math.max(rn, 0);
  if (ground !== null)
    return {
      ...nt(ground),
      entriesExamined,
    };
  let So = (ko) => qt.has(ko) || parentDirsOf(ko).some((un) => qt.has(un));
  return {
    covers: (ko) => qt.size > 0 && So(foldPathCase(ko)),
    ground: null,
    targetCount: qt.size,
    entriesExamined,
    ...{},
  };
}
//@ chunk-e6aww6q8.js:1890193-1890347 placement
function classifySyncRootPath(
  e,
  n = createRealpathCache(byteBudgetedRetry(MAX_REALPATH_WORK)),
  r = () => false,
  s,
) {
  let h = classifySyncRootFromScope(e, n, r, s);
  return h !== null && typeof h === "object"
    ? {
        spelling: h.spelling,
        exists: h.exists,
        passed: h.passed,
      }
    : h;
}
//@ chunk-e6aww6q8.js:1890347-1890397 placement
function classifySyncRootFromScope(targetPath, n, r, s) {
  return classifySyncRoot(targetPath, n, r, 0, [], [], s);
}
//@ chunk-e6aww6q8.js:1890397-1891437 placement
/**
 * 沿根目录逐级检查目录同步根的类型：网络位置、家目录及其隐藏目录、链接根等，用于拒绝不安全的同步根。
 */
function classifySyncRoot(targetPath, fs, r, depth = 0, visited = [], y = [], S) {
  let root = parse(targetPath).root || sep;
  let L = [...y];
  let G = (ke) => ke;
  let q = (ke, we = visited) => isUnsafeSyncRootSpelling(ke) && !r(ke, we);
  if (q(targetPath) || (isUnsafeSyncRootSpelling(root) && !r(targetPath, visited))) return G("network");
  let filtered = targetPath
    .slice(root.length)
    .split(sep === "/" ? "/" : /[\\/]+/)
    .filter((ke) => ke !== "" && ke !== ".");
  let current = root;
  for (let [ke, we] of filtered.entries()) {
    if (we === "..") {
      current = dirname(current);
      continue;
    }
    let next = join(current, we);
    if (q(next)) return G("network");
    let Ae = fs.linkText(next);
    if (Ae === "unexamined") return G("unexamined");
    let Ie = Ae;
    if (Ie === "unexamined") return G("unexamined");
    if (Ie !== null) {
      if (depth >= MAX_SYNC_SCAN_DEPTH) return G(null);
      if (q(Ie, [...visited, current])) return G("network");
      let We = !isAbsolute(Ie)
        ? `${current}${sep}${Ie}`
        : /^[\\/](?![\\/])/.test(Ie)
          ? `${parse(current).root}${Ie.slice(1)}`
          : Ie;
      return classifySyncRoot(
        [We, ...filtered.slice(ke + 1)].join(sep),
        fs,
        r,
        depth + 1,
        [...visited, current],
        L,
        S,
      );
    }
    let Me = fs(next);
    if (Me === "unexamined") return G("unexamined");
    if (Me !== null && q(Me)) return G("network");
    if (Me === null) {
      let sliced = filtered.slice(ke + 1);
      if (sliced.includes("..")) {
        let ze = [];
        return classifySyncRoot(resolve_2(next, ...sliced), fs, r, depth + 1, visited, [...L, ...ze], S);
      }
      return {
        spelling: join(next, ...sliced),
        exists: false,
        stoodIn: visited,
        passed: L,
      };
    }
    current = Me;
  }
  return {
    spelling: current,
    exists: true,
    stoodIn: visited,
    passed: L,
  };
}
//@ chunk-e6aww6q8.js:1891437-1891980 placement
/**
 * 创建带缓存的 realpath 与 lstat 查询器，避免重复访问文件系统。
 */
function createRealpathCache(e) {
  let n = new Map();
  let r = new Map();
  let s = (S, w, L) => {
    let G = S.get(w);
    if (G !== undefined) return G;
    let q = L();
    S.set(w, q);
    return q;
  };
  return Object.assign(
    (S) =>
      s(n, S, () => {
        if (hasBackslash(S)) return "unexamined";
        try {
          return toUncLongPath(e(() => realpathSync.native(S)));
        } catch (error) {
          return isUnreadableRealpathError(error) ? null : "unexamined";
        }
      }),
    {
      linkText: (S) =>
        s(r, S, () => {
          try {
            let w = e(() => readlinkSync(S));
            return w.includes("\uFFFD") ? "unexamined" : w;
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            if (errnoCode === "EINVAL" || isUnreadableRealpathError(error)) return null;
            if (UNSUPPORTED_REALPATH_ERRNOS.has(errnoCode))
              try {
                return e(() => lstatSync(S)).isFile() ? null : "unexamined";
              } catch (error) {
                return isUnreadableRealpathError(error) ? null : "unexamined";
              }
            return "unexamined";
          }
        }),
    },
  );
}
//@ chunk-e6aww6q8.js:1891980-1892302 placement
function classifyDirEntryForCompletion(e, n, r, s) {
  if (e.isSymbolicLink()) return "link";
  if (e.isDirectory()) return scanDirectory_3(n, r);
  if (e.isFile() || e.isFIFO() || e.isSocket() || e.isBlockDevice() || e.isCharacterDevice()) return "other";
  try {
    let h = s(() => lstatSync(n));
    return h.isSymbolicLink() ? "link" : h.isDirectory() ? scanDirectory_3(n, r) : "other";
  } catch (error) {
    return isUnreadableRealpathError(error) ? "other" : "unexamined";
  }
}
//@ chunk-e6aww6q8.js:1892302-1892338 placement = scanDirectory (0.766)
function scanDirectory_3(e, n) {
  return "directory";
}
//@ chunk-e6aww6q8.js:1892338-1892401 placement
function homeSpellings(home, n = createRealpathCache(byteBudgetedRetry(MAX_REALPATH_WORK))) {
  return uniq([resolve_2(home), resolveIfKnown(n, resolve_2(home))]);
}
//@ chunk-e6aww6q8.js:1892401-1892468 placement
function resolveIfKnown(e, n) {
  let r = e(n);
  return r === null || r === "unexamined" ? n : r;
}
//@ chunk-e6aww6q8.js:1892468-1892522 placement
function hasNetworkAncestor(e) {
  return isUnsafeSyncRootSpelling(e) || (dirname(e) !== e && hasNetworkAncestor(dirname(e)));
}
//@ chunk-e6aww6q8.js:1892522-1892564 placement
function isUnsafeSyncRootSpelling(e) {
  return isNetworkMountPath(e) || isNetworkMountRoot_2(e) || neverOtherHostMount(e);
}
//@ chunk-e6aww6q8.js:1892564-1892626 placement = isRealPathWithinTeamDir (1)
function isNotFoundErrno(realCandidate) {
  let code = getErrnoCode(realCandidate);
  return code === "ENOENT" || code === "ENOTDIR";
}
//@ chunk-e6aww6q8.js:1892626-1892671 placement
function isUnreadableRealpathError(error) {
  return isNotFoundErrno(error) || getErrnoCode(error) === "ELOOP";
}
//@ chunk-e6aww6q8.js:1892671-1892771 placement
function relativeWithCaseFold(cwd, cwd_2, r) {
  let s = relative(cwd, cwd_2);
  if (!r || !escapesRoot(s)) return s;
  let h = relative(nfcLowerNfc(cwd), nfcLowerNfc(cwd_2));
  return escapesRoot(h) ? s : h;
}
//@ chunk-e6aww6q8.js:1892771-1892835 placement
function escapesRoot(e) {
  return e === ".." || e.startsWith(`..${sep}`) || isAbsolute(e);
}
//@ chunk-e6aww6q8.js:1892835-1892860 placement
var ASCII_ONLY_RE = /^[\x00-\x7f]*$/;
//@ chunk-e6aww6q8.js:1892860-1893022 placement
function isSensitiveSyncedPath(
  e,
  { tracked, readings = getPathNormalizationVariants(e), namesCredential = isSensitiveNameOrVariant },
) {
  if (readings === null) return true;
  return (
    (ASCII_ONLY_RE.test(e) ? [e] : [e, foldPathCase(e)]).some(namesCredential) ||
    hasSpecialLatinLetter(e) ||
    (tracked && hasDosShortNameSegment(e)) ||
    readings.some(hasDosShortNameSegment)
  );
}
//@ chunk-e6aww6q8.js:1893022-1893218 placement
var EMPTY_TYPED_TOOL_FLAGS = {
  disallowedTools: [],
  tools: [],
};
var EMPTY_LAUNCH_PERMISSIONS = {
  allowRules: [],
  denyRules: [],
  sessionDenyRules: [],
  toolsNarrowingDenyRules: [],
  additionalWorkingDirectories: new Map(),
  launchedInAutoMode: false,
  typedToolFlags: EMPTY_TYPED_TOOL_FLAGS,
};
//@ chunk-e6aww6q8.js:1893218-1893872 placement
/**
 * 启动权限快照：发布并保存会话启动时的权限规则与工具开关。
 */
class LaunchPermissionsSnapshot {
  snapshot = EMPTY_LAUNCH_PERMISSIONS;
  get() {
    return this.snapshot;
  }
  publish(e, n, r) {
    let s = env.CLAUDE_CODE_SESSION_KIND === "bg";
    let h = new Set(n);
    let filtered = [...e.additionalWorkingDirectories].filter(
      ([S, w]) => !(w.source === "session" && h.has(S)),
    );
    this.snapshot = {
      allowRules: s ? [] : [...(e.alwaysAllowRules.cliArg ?? [])],
      denyRules: [...(e.alwaysDenyRules.cliArg ?? [])],
      sessionDenyRules: [...(e.alwaysDenyRules.session ?? [])],
      toolsNarrowingDenyRules: [...(e.alwaysDenyRules.toolsNarrowing ?? [])],
      additionalWorkingDirectories: new Map(
        s ? filtered.filter(([, S]) => S.source === "session") : filtered,
      ),
      launchedInAutoMode: e.mode === "auto",
      typedToolFlags: {
        disallowedTools: [...r.disallowedTools],
        tools: [...r.tools],
      },
    };
  }
  reset() {
    this.snapshot = EMPTY_LAUNCH_PERMISSIONS;
  }
}
//@ chunk-e6aww6q8.js:1893872-1893899 placement
var launchPermissionsByHost = new HostScoped(() => new LaunchPermissionsSnapshot());
//@ chunk-e6aww6q8.js:1893899-1893938 placement
function launchPermissions() {
  return launchPermissionsByHost.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1893938-1893972 placement
/**
 * 取启动权限快照。
 */
function getLaunchPermissions() {
  return launchPermissions().get();
}
//@ chunk-e6aww6q8.js:1893972-1894013 placement
/**
 * 发布启动权限快照。
 */
function publishLaunchPermissions(toolPermissionContext, inheritedSessionDirectories, r) {
  launchPermissions().publish(toolPermissionContext, inheritedSessionDirectories, r);
}
//@ chunk-e6aww6q8.js:1894013-1894170 placement
function launchDenyRules(launchPermissions) {
  return [
    ["cliArg", launchPermissions.denyRules],
    ["session", launchPermissions.sessionDenyRules],
  ].flatMap(([r, s]) =>
    s.map((h) => ({
      source: r,
      ruleBehavior: "deny",
      ruleValue: permissionRuleValueFromString(h),
    })),
  );
}
//@ chunk-e6aww6q8.js:1894170-1894190 placement
var minimatch = Re(require_picomatch_2(), 1);
//@ chunk-e6aww6q8.js:1894220-1894266 placement
var EMPTY_DIR_SYNC_RULES = {
  denies: [],
  credentials: [],
  reopens: [],
};
//@ chunk-e6aww6q8.js:1894266-1894390 placement
function normalizeRulePathSlashes(e) {
  let n = stripExtendedPathPrefix(e);
  return (/^(?:[A-Za-z]:)?\\|^[A-Za-z]:\//.test(n) ? n.replace(/\\/g, "/") : n).replace(/\/+$/, "") || "/";
}
//@ chunk-e6aww6q8.js:1894390-1894424 placement
function normalizeRulePath(e) {
  return removeTrailingGlobSuffix(normalizeRulePathSlashes(e));
}
//@ chunk-e6aww6q8.js:1894424-1894514 placement
function globBaseDir(e) {
  let n = e.split(/[*?[\]]/)[0] ?? "";
  return n.slice(0, n.lastIndexOf("/")) || "/";
}
//@ chunk-e6aww6q8.js:1894514-1894607 placement
function expandRuleGlobBase(e) {
  if (!containsGlobChars(e)) return e;
  try {
    minimatch.default(e, {
      dot: true,
    });
    return e;
  } catch {
    return globBaseDir(e);
  }
}
//@ chunk-e6aww6q8.js:1894607-1894816 placement
function createDenyMatcher(e) {
  let n = new Map();
  let r = new Map();
  let s = new Set();
  let h = () => n;
  return {
    covers: (y, S) => (containsGlobChars(y) ? denyEntryCovers(y, S, h(y)) : posixCovers(y, S)),
    coversReopen: (y, S) => denyEntryCovers(y, S, n),
    matchesAt: (y, S) =>
      containsGlobChars(y)
        ? matchesGuardedGlob(S, y, h(y)) ||
          (containsGlobChars(S) && matchesNameReading(S, nameReadingsOfGlobSpelling(y), h(y)))
        : y === S,
  };
}
//@ chunk-e6aww6q8.js:1894816-1894961 placement
function pathPrefixesBetween(e, n) {
  if (n === e) return [];
  let r = e === "/" ? "" : e;
  return n
    .slice(r.length + 1)
    .split("/")
    .reduce((acc, h) => {
      acc.push(`${acc.at(-1) ?? r}/${h}`);
      return acc;
    }, []);
}
//@ chunk-e6aww6q8.js:1894961-1895571 placement
/**
 * 根据 deny/credentials/reopen 规则构造上传过滤的匹配函数（含大小写折叠与 reopen 例外）。
 */
function createDenyFilterEntries({ denies, credentials, reopens }, s, h, y, S) {
  let w = (ke, we) => posixCovers(ke, we) || y.covers(ke, we);
  let L = (deny) => expandRuleGlobBase(h(s(normalizeRulePath(deny))));
  let mapped = credentials.map(L);
  let mapped_2 = denies.map((deny) => {
    let we = L(deny);
    return {
      spelled: we,
      matchesAllBeneath: normalizeRulePathSlashes(deny).endsWith("/**") && containsGlobChars(we),
    };
  });
  let mapped_3 = reopens
    .filter((reopen) => !containsGlobChars(reopen))
    .map((reopen) => s(normalizeRulePathSlashes(reopen)))
    .map((ke) => ({
      named: ke,
      inDeny: h(ke),
    }));
  let Se = (ke, inDeny, Ee) =>
    S &&
    (ke.matchesAllBeneath
      ? Ee !== inDeny
      : pathPrefixesBetween(inDeny, Ee).some((Ae) => y.matchesAt(ke.spelled, Ae)));
  return (ke) => {
    let we = s(ke);
    let Ee = h(we);
    return (
      mapped.some((Ae) => w(Ae, Ee)) ||
      mapped_2.some(
        (Ae) =>
          w(Ae.spelled, Ee) &&
          !mapped_3.some(
            (Ie) =>
              y.coversReopen(Ae.spelled, Ie.inDeny) && posixCovers(Ie.named, we) && !Se(Ae, Ie.inDeny, Ee),
          ),
      )
    );
  };
}
//@ chunk-e6aww6q8.js:1895571-1895596 placement
function identityPath(e) {
  return e;
}
//@ chunk-e6aww6q8.js:1895596-1895659 placement
function escapeLineBreaks(e) {
  return e.replace(/[\n\r\u2028\u2029]/g, "\x01");
}
//@ chunk-e6aww6q8.js:1895659-1895705 placement
function memoizeFold(e) {
  let n;
  return (r) => (n ??= e())(r);
}
//@ chunk-e6aww6q8.js:1895705-1896125 placement
/**
 * 创建目录同步的拒绝过滤器：根据 deny/credentials/reopen 规则，对路径的原样、大小写折叠等多种拼写判断是否应被排除上传；没有规则时始终放行。
 */
function createSyncDenyFilter(launchDirSpellings, n, platform = getPlatform(), s = false) {
  if (n.denies.length === 0 && n.credentials.length === 0) return () => false;
  let h = false;
  let y = [createDenyMatcher(s)];
  let S = (q) =>
    y.map((Z) => {
      let Se = (ke) => createDenyFilterEntries(n, ke, q, Z, h);
      return {
        asWritten: Se(identityPath),
        folded: Se(foldPathCase),
        foldedKeepingIgnorables: memoizeFold(() =>
          Se((ke) => foldPathCaseKeepingIgnorables(ke) ?? foldPathCase(ke)),
        ),
      };
    });
  let w = S(identityPath);
  let L = false;
  let G;
  return (q) =>
    launchDirSpellings.some((Z) => {
      let Se = normalizeRulePathSlashes(join(Z, q));
      let ke = false;
      return [...w, ...(escapeLineBreaks(Se) === Se ? [] : (G ??= S(escapeLineBreaks)))].some(
        (we) => we.asWritten(Se) || we.folded(Se) || false,
      );
    });
}
//@ chunk-e6aww6q8.js:1896125-1896990 placement
function checkManagedConfigFile(e, n) {
  let startTime = performance.now();
  let flagSettingsPath = getFlagSettingsPath();
  let claudeConfigDirs = getClaudeConfigDirs();
  if (isDiskless()) return unexaminedRoot(claudeConfigDirs[0] ?? n);
  let y = (() => {
    let S = managedFileSettingsDirs(true);
    try {
      return classifyDirSyncRoot(n === e ? [e] : [e, n], {
        configHomes: claudeConfigDirs,
        configFiles: [
          ...claudeStatePathPatterns(),
          ...S.map((w) => join(w, "managed-settings.json")),
          join(getManagedFilePath(), "managed-mcp.json"),
          ...(flagSettingsPath === undefined ? [] : [flagSettingsPath]),
          ...getFlagAgentsFilePaths(),
          ...getFlagMcpConfigFilePaths(),
        ],
        configDirs: S.map((w) => ({
          path: join(w, "managed-settings.d"),
          accepts: isManagedSettingsDropInName,
        })),
      });
    } catch (error) {
      logError(error);
      return unexaminedRoot(claudeConfigDirs[0] ?? n);
    }
  })();
  if (y === UNCOVERED_ROOT) return y;
  logDirSyncHostConfig(
    n,
    {
      targets: y.targetCount,
      ground_root_linked: y.ground?.kind === "root_linked",
      ground_inside_home: y.ground?.kind === "inside_home",
      ground_unreadable: y.ground?.kind === "unexamined" && y.ground.why === "unreadable",
      ground_too_many: y.ground?.kind === "unexamined" && y.ground.why === "too_many",
      ground_on_share: y.ground?.kind === "unexamined" && y.ground.why === "on_share",
    },
    {
      entries_examined: y.entriesExamined,
      duration_ms: Math.round(performance.now() - startTime),
    },
  );
  return y;
}
//@ chunk-e6aww6q8.js:1896990-1897069 placement
function unexaminedRoot(at) {
  return {
    ...UNCOVERED_ROOT,
    ground: {
      kind: "unexamined",
      at,
      why: "unreadable",
    },
  };
}
//@ chunk-e6aww6q8.js:1912185-1912554 placement
/**
 * 目录同步的待答复搁置表：按会话登记、关闭时通知订阅者。
 */
class PendingSyncHold {
  #e = new Map();
  #t = createSignal();
  hold(e) {
    this.#e.set(e.sessionId, e);
    e.onAnswered(() => this.#t.emit(e.sessionId));
    this.#t.emit(e.sessionId);
  }
  release(e) {
    if (e.close()) this.#t.emit(e.sessionId);
  }
  of(e) {
    return this.#e.get(toInfraSessionId(e));
  }
  ready(e) {
    return this.of(e)?.open() === true;
  }
  concerns(e) {
    return this.of(e) !== undefined;
  }
  onChanged(e, n) {
    let infraSessionId = toInfraSessionId(e);
    return this.#t.subscribe((s) => {
      if (s === infraSessionId) n();
    });
  }
}
//@ chunk-e6aww6q8.js:1912554-1912573 placement
var MAX_HELD_SESSIONS = 8;
var HOLD_NOTIFY_INTERVAL_MS = 2000;
//@ chunk-e6aww6q8.js:1912573-1915274 placement
/**
 * 目录同步会话对象。
 */
class DirSyncSession {
  attachSyncs = new PendingSyncHold();
  servedCallHolds = null;
  #e = new Map();
  #t = new Map();
  #n = new Map();
  #o = new Map();
  #r;
  #i = null;
  #s = new Map();
  #a = false;
  #d = false;
  #c = new Set();
  #l = new Set();
  register(e, n) {
    let infraSessionId = toInfraSessionId(e);
    this.#e.delete(infraSessionId);
    this.#t.delete(infraSessionId);
    this.#n.delete(infraSessionId);
    oldestKeys(this.#e).forEach((h) => {
      let y = this.#e.get(h);
      this.#e.delete(h);
      y?.then(
        (S) => this.retire(S.sessionId),
        () => {},
      );
    });
    this.#e.set(infraSessionId, n);
  }
  noteSilentlyNotArmed(e, n) {
    let infraSessionId = toInfraSessionId(e);
    this.#t.delete(infraSessionId);
    oldestKeys(this.#t).forEach((s) => this.#t.delete(s));
    this.#t.set(infraSessionId, n);
  }
  silentlyNotArmed(e) {
    return this.#t.get(toInfraSessionId(e));
  }
  noteNotOptedIn(e, n) {
    let infraSessionId = toInfraSessionId(e);
    this.#n.delete(infraSessionId);
    oldestKeys(this.#n).forEach((s) => this.#n.delete(s));
    this.#n.set(infraSessionId, n);
  }
  notOptedIn(e) {
    return this.#n.get(toInfraSessionId(e));
  }
  take(e) {
    let infraSessionId = toInfraSessionId(e);
    let r = this.#e.get(infraSessionId);
    this.#e.delete(infraSessionId);
    return r;
  }
  reportSendGateAnswers(e, n) {
    return Promise.resolve(false);
  }
  noteResumeCommandOnScreen(e) {
    this.#i = toInfraSessionId(e);
  }
  hold(e, n) {
    let infraSessionId = toInfraSessionId(e.sessionId);
    this.retire(infraSessionId);
    this.#t.delete(infraSessionId);
    this.#n.delete(infraSessionId);
    let s = getIsInteractive()
      ? (S, w) => writeStderrSafely(this.#i === infraSessionId ? (w ?? S) : S)
      : undefined;
    let h = null;
    let y = (S) =>
      (h ??= (async () => {
        await e.sync.shutdown(n, S);
        await e.sync.drain(CLEANUP_TIMEOUT_MS);
      })());
    this.#s.set(infraSessionId, {
      unregister: registerCleanup(() => y(s)),
      shutDownOnce: y,
      sync: e.sync,
      root: e.gitRoot,
    });
    this.#u(infraSessionId);
  }
  consentMayHaveChanged() {}
  retire(e) {
    let infraSessionId = toInfraSessionId(e);
    let r = this.#s.get(infraSessionId);
    if (r === undefined) return;
    this.#s.delete(infraSessionId);
    r.unregister();
    r.sync.shutdown(0);
    this.#u(infraSessionId);
  }
  async shutDown(e) {
    let infraSessionId = toInfraSessionId(e);
    let r = this.#s.get(infraSessionId);
    if (r === undefined) return;
    let now = Date.now();
    let h = await r.shutDownOnce(undefined).then(
      () => false,
      (error) => {
        logError(toError(error));
        return true;
      },
    );
    if (this.#s.get(infraSessionId) === r) {
      this.#s.delete(infraSessionId);
      r.unregister();
      this.#u(infraSessionId);
    }
  }
  watchState(e, n) {
    let infraSessionId = toInfraSessionId(e);
    let s = this.#o.get(infraSessionId);
    if (s === undefined) {
      s = {
        changed: createSignal(),
        listening: 0,
        last: describeDirSyncState(this.stateOf(infraSessionId)),
      };
      this.#o.set(infraSessionId, s);
    }
    let h = s;
    let y = h.changed.subscribe(n);
    h.listening += 1;
    if (this.#r === undefined) {
      this.#r = setInterval(() => {
        [...this.#o.keys()].forEach((key) => this.#u(key));
      }, HOLD_NOTIFY_INTERVAL_MS);
      this.#r.unref?.();
    }
    let S = true;
    return () => {
      if (!S) return;
      S = false;
      y();
      h.listening -= 1;
      if (h.listening === 0 && this.#o.get(infraSessionId) === h) this.#o.delete(infraSessionId);
      if (this.#o.size === 0 && this.#r !== undefined) {
        clearInterval(this.#r);
        this.#r = undefined;
      }
    };
  }
  #u(e) {
    let n = this.#o.get(e);
    if (n === undefined) return;
    let r = this.stateOf(e);
    let s = describeDirSyncState(r);
    if (s === n.last) return;
    n.last = s;
    try {
      n.changed.emit(r);
    } catch (error) {
      logError(toError(error));
    }
  }
  stateOf(e) {
    return this.#s.get(toInfraSessionId(e))?.sync.state();
  }
  syncOf(e) {
    return this.#s.get(toInfraSessionId(e))?.sync;
  }
  servedCallFaceOf(e) {
    let infraSessionId = toInfraSessionId(e);
    return this.syncOf(infraSessionId);
  }
  rootOf(e) {
    return this.#s.get(toInfraSessionId(e))?.root;
  }
  tellUnknownEngineWord() {
    if (this.#a) return false;
    this.#a = true;
    return true;
  }
  sayUnknownEngineWord() {
    if (this.#d) return false;
    this.#d = true;
    return true;
  }
  sayGitNotOnStartPath(e) {
    if (this.#c.has(e)) return false;
    this.#c.add(e);
    return true;
  }
  wholeListingOutgrew(e) {
    return this.#l.has(e);
  }
  noteWholeListingOutgrew(e) {
    this.#l.add(e);
  }
  get heldCount() {
    return this.#e.size;
  }
  get exitHookCount() {
    return this.#s.size;
  }
}
//@ chunk-e6aww6q8.js:1915274-1915304 placement
function createDirSyncSession() {
  return new DirSyncSession();
}
//@ chunk-e6aww6q8.js:1915304-1915323 placement
/**
 * 按宿主缓存的目录同步会话。
 */
var dirSyncSessionByHost = new HostScoped(createDirSyncSession);
//@ chunk-e6aww6q8.js:1915323-1915361 placement
/**
 * 取当前宿主的目录同步会话。
 */
function dirSyncSession() {
  return dirSyncSessionByHost.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1915361-1915397 placement
/**
 * 取出目录同步句柄。
 */
function takeDirSyncHandle(e) {
  return dirSyncSession().take(e);
}
//@ chunk-e6aww6q8.js:1915397-1915444 placement
function writeStderrSafely(e) {
  try {
    writeSync(
      2,
      `${stripControlChars_3(e)}
`,
    );
  } catch {}
}
//@ chunk-e6aww6q8.js:1915444-1915514 placement
function oldestKeys(e) {
  return [...e.keys()].slice(0, Math.max(0, e.size + 1 - MAX_HELD_SESSIONS));
}
//@ chunk-e6aww6q8.js:1915514-1915732 placement
function describeDirSyncState(e) {
  switch (e?.state) {
    case undefined:
      return "none";
    case "seeding":
      return "seeding";
    case "armed":
      return `armed:${e.engine}:${e.direction}`;
    case "off":
      return `off:${e.reason}`;
    case "stopped":
      return `stopped:${e.reason}`;
  }
}
//@ chunk-e6aww6q8.js:1915732-1915792 placement
var gitVersionCacheByHost = new HostScoped(() => new Map());
var gitProbeCacheByHost = new HostScoped(() => new Map());
var GIT_VERSION_PROBE_TIMEOUT_MS = 15000;
export {
  dirSyncSessionByHost,
  listChangedTrackedFiles,
  dirSyncSession,
  publishLaunchPermissions,
  getLaunchPermissions,
  DIR_SYNC_EXCLUDED_DIRS,
  checkManagedConfigFile,
  createSyncDenyFilter,
  EMPTY_DIR_SYNC_RULES,
  isSensitiveSyncedPath,
  launchDenyRules,
  UNCOVERED_ROOT,
  gitVersionCacheByHost,
  GIT_VERSION_PROBE_TIMEOUT_MS,
  gitProbeCacheByHost,
  takeDirSyncHandle,
};
