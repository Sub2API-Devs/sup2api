/**
 * utils/plugins/marketplaceGitCheckout.ts
 *
 * 2.1.316 新增：市场 git 检出
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (11)
 * attribution: placement 11
 */
import {
  mkdtemp,
  mkdtemp as mkdtemp_2,
  mkdtemp as mkdtemp_3,
  mkdtemp as mkdtemp_4,
  mkdtemp as mkdtemp_5,
  mkdtemp as mkdtemp_6,
  mkdtemp as mkdtemp_7,
  mkdtemp as mkdtemp_8,
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  rm as rm_6,
  rm as rm_7,
  rm as rm_8,
  rm as rm_9,
  rm as rm_10,
  rm as rm_11,
  rm as rm_12,
  rm as rm_13,
  rm as rm_14,
  rm as rm_15,
  rm as rm_16,
  rm as rm_17,
  rm as rm_18,
  rm as rm_19,
  rm as rm_20,
  rm as rm_21,
  rm as rm_22,
  rm as rm_23,
  rm as rm_24,
  rm as rm_25,
  rm as rm_26,
  rm as rm_27,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  open as open_8,
  open as open_9,
  open as open_10,
  open as open_11,
  open as open_12,
  open as open_13,
  open as open_14,
  open as open_15,
  open as open_16,
  open as open_17,
  open as open_18,
  open as open_19,
  open as open_20,
  open as open_21,
  open as open_22,
  open as open_23,
  open as open_24,
  open as open_25,
  open as open_26,
  open as open_27,
} from "fs/promises";
import {
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
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
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
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
} from "path";
import { krt } from "./pluginDirectoryTelemetry.js";
import { tmpdir } from "../tempDir.js";
import { SMe } from "../gitSafeExec.js";
import { resolveGitSshConfig } from "./gitSshConfig.js";
import { execFileNoThrowWithCwd, execFileNoThrow } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, A, o, oe, kt } from "../../../vendor/zod/v4/classic/schemas.js";
import { writeFileAtomic as writeFileAtomic_2 } from "../atomicPublishWrite.js";
import { jsonStringify } from "../slowOperations.js";
import { safeParseJSON } from "../json.js";
import { readFileGuarded } from "../fsSafety/guardedFileRead.js";
import { logForDebugging } from "../debug.js";
import { readGitHead, resolveRef, isValidGitSha } from "../git/gitFilesystem.js";
import { errorMessage } from "../errors.js";
import { redactKnownUrls } from "../redaction/urlRedaction.js";
import { logPluginFetch, classifyFetchError } from "./fetchTelemetry.js";
import { ZB, readPluginFileSafe } from "./safeFileRead.js";
import { buildGitEnvForRepo } from "../git/gitDirResolution.js";
import { freeze as freeze_23 } from "../git/gitSafeEnv.js";
import { plural } from "../stringUtils.js";
import { zq, $c } from "../platformTargets.js";
import { PLUGIN_COMPONENT_DIRS, PLUGIN_MANIFEST_PATH, PLUGIN_JSON } from "./commandSource.js";

//@ chunk-e6aww6q8.js:4186897-4187414 placement
async function lsRemoteMarketplace(
  e,
  { flags: n = [], patterns: r = [], timeout: s, endsWithItsChildren: h = !1 } = {},
) {
  let y = krt(e);
  if (y !== null) return { code: 1, stdout: "", stderr: `Refusing to query. ${y.message}` };
  let S = await mkdtemp_8(join_113(tmpdir(), "claude-lsremote-"));
  try {
    let w = SMe(S, await resolveGitSshConfig(e)),
      L = ["-C", S, ...w.inCheckoutArgs, "ls-remote", ...n, "--", e, ...r],
      G = { env: w.env, stdin: "ignore", ...(s !== void 0 && { timeout: s }) };
    return h
      ? await execFileNoThrowWithCwd(gitExe(), L, { ...G, cwd: S, withoutControllingTerminal: !0 })
      : await execFileNoThrow(gitExe(), L, G);
  } finally {
    await rm_23(S, { recursive: !0, force: !0 }).catch(() => {});
  }
}
//@ chunk-e6aww6q8.js:4187414-4187499 placement
var CLAUDE_CODE_SPARSE_PATHS_JSON = "claude-code-sparse-paths.json",
  Dms = 65536,
  Lms = DoctorLazy(() => u({ sparsePaths: A(o()) }));
//@ chunk-e6aww6q8.js:4187499-4187574 placement
async function qWn(e, n) {
  await writeFileAtomic_2(
    join_112(e, ".git", CLAUDE_CODE_SPARSE_PATHS_JSON),
    jsonStringify({ sparsePaths: n ?? [] }),
  );
}
/**
 * 探测已有的市场检出是否可复用（稀疏路径、HEAD、分支），否则重新克隆。
 */
//@ chunk-e6aww6q8.js:4187574-4189152 placement
async function probeMarketplaceCheckout(e, n, { ref: ref, sparsePaths: sparsePaths, timeout: timeout }) {
  let y = join_112(e, ".git"),
    safeParse = Lms().safeParse(
      safeParseJSON(
        await readFileGuarded(join_112(y, CLAUDE_CODE_SPARSE_PATHS_JSON), Dms, { noFollow: !0 }),
        !1,
      ),
    ),
    sorted = (safeParse.success ? safeParse.data.sparsePaths : []).sort(),
    sorted_2 = [...(sparsePaths ?? [])].sort();
  if (sorted_2.length !== sorted.length || sorted_2.some((Ie, Me) => Ie !== sorted[Me]))
    return (logForDebugging("Marketplace checkout probe: sparse paths changed, re-cloning"), "stale");
  let G = await readGitHead(y),
    q = G === null ? null : G.type === "branch" ? await resolveRef(y, `refs/heads/${G.name}`) : G.sha;
  if (!q) return (logForDebugging("Marketplace checkout probe: no readable HEAD, cloning"), "stale");
  if (ref !== void 0 && isValidGitSha(ref)) return ref === q ? "current" : "stale";
  let startTime = performance.now(),
    Se;
  try {
    Se = await lsRemoteMarketplace(n, {
      patterns: ref === void 0 ? ["HEAD"] : [`refs/heads/${ref}`, `refs/tags/${ref}^{}`, `refs/tags/${ref}`],
      timeout: timeout,
    });
  } catch (error) {
    return (
      logForDebugging(`Marketplace checkout probe: ls-remote not run (${errorMessage(error)}), re-cloning`, {
        level: "warn",
      }),
      "stale"
    );
  }
  let ke = redactKnownUrls(Se.stderr, n);
  if (
    (logPluginFetch(
      "marketplace_probe",
      n,
      Se.code === 0 ? "success" : "failure",
      performance.now() - startTime,
      Se.code === 0 ? void 0 : classifyFetchError(ke),
    ),
    Se.code !== 0)
  )
    return (logForDebugging(`Marketplace checkout probe: ls-remote exited ${Se.code}: ${ke}`), "unreachable");
  let we = new Map();
  for (let Ie of Se.stdout.split(`
`)) {
    let index = Ie.indexOf("\t");
    if (index !== -1) we.set(Ie.slice(index + 1).trim(), Ie.slice(0, index));
  }
  let Ee =
    ref === void 0
      ? we.get("HEAD")
      : (we.get(`refs/heads/${ref}`) ?? we.get(`refs/tags/${ref}^{}`) ?? we.get(`refs/tags/${ref}`));
  if (Ee === void 0)
    return (
      logForDebugging(
        `Marketplace checkout probe: ${ref ?? "HEAD"} not advertised by the remote, re-cloning`,
      ),
      "stale"
    );
  let Ae = Ee === q;
  return (
    logForDebugging(
      `Marketplace checkout probe: local ${q.slice(0, 12)} remote ${Ee.slice(0, 12)} \u2014 ${Ae ? "up to date" : "re-cloning"}`,
    ),
    Ae ? "current" : "stale"
  );
}
/**
 * Git LFS 指针文件头与扫描限额。
 */
//@ chunk-e6aww6q8.js:4189276-4189451 placement
var GIT_LFS_POINTER_PREFIX = `version https://git-lfs.github.com/spec/v1
`,
  MAX_LFS_REPORTED_FILES = 100,
  MAX_LFS_SCANNED_FILES = 20000,
  MAX_GITATTRIBUTES_BYTES = 4194304,
  LFS_SCAN_LIMIT = 1e4,
  LFS_FILTER_RE = /(?:^|[ \t])filter=lfs(?:[ \t\r]|$)/m,
  MAX_LFS_DIRS = 50,
  lfsScanResult = { pointerFiles: 0, truncated: !1 };
/**
 * 检查市场检出中 Git LFS 跟踪的文件是否都已拉取。
 */
//@ chunk-e6aww6q8.js:4189451-4191008 placement
async function checkGitLfsFiles(e) {
  try {
    let n = await ZB(join_114(e, ".gitattributes")).catch(() => {
        return;
      }),
      r = n !== void 0 && LFS_FILTER_RE.test(n),
      s = { cwd: e, env: buildGitEnvForRepo(e), timeout: LFS_SCAN_LIMIT, maxBuffer: MAX_GITATTRIBUTES_BYTES },
      h = await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "ls-files", "-z", "-t"], {
        ...s,
        stdin: "ignore",
      });
    if (h.code !== 0 && !h.maxBufferExceeded)
      return (
        logForDebugging(
          `[git-lfs] could not list the index of ${e}: ${h.stderr || h.error || `exit ${h.code}`}`,
          { level: "debug" },
        ),
        lfsScanResult
      );
    let y = h.maxBufferExceeded === !0,
      parts = h.stdout.split("\x00");
    parts.pop();
    let w = [];
    for (let we of parts) {
      if (w.length === MAX_LFS_SCANNED_FILES) {
        y = !0;
        break;
      }
      if (we.length > 2 && we[1] === " " && we[0] !== "S") w.push(we.slice(2));
    }
    let L = new Map();
    if (!r) {
      let we = 0;
      for (let Ee of w) {
        if (!Ee.endsWith("/.gitattributes")) continue;
        if (we === MAX_LFS_DIRS) break;
        we++;
        let Ae = await safeCheckoutPath(e, Ee, L),
          Ie =
            Ae === null
              ? void 0
              : await ZB(Ae).catch(() => {
                  return;
                });
        if (Ie !== void 0 && LFS_FILTER_RE.test(Ie)) {
          r = !0;
          break;
        }
      }
    }
    if (!r) return lfsScanResult;
    if (w.length === 0) return { pointerFiles: 0, truncated: y };
    let G = await execFileNoThrowWithCwd(gitExe(), [...freeze_23, "check-attr", "-z", "--stdin", "filter"], {
      ...s,
      input: `${w.join("\x00")}\x00`,
    });
    if (G.code !== 0 && !G.maxBufferExceeded)
      return (
        logForDebugging(
          `[git-lfs] could not read the filter attributes in ${e}: ${G.stderr || G.error || `exit ${G.code}`}`,
          { level: "debug" },
        ),
        { pointerFiles: 0, truncated: y }
      );
    y ||= G.maxBufferExceeded === !0;
    let parts_2 = G.stdout.split("\x00"),
      Z = [];
    for (let we = 0; we + 3 < parts_2.length; we += 3)
      if (parts_2[we + 1] === "filter" && parts_2[we + 2] === "lfs") Z.push(parts_2[we]);
    let sliced = Z.slice(0, MAX_LFS_REPORTED_FILES);
    y ||= Z.length > sliced.length;
    let ke = 0;
    for (let we of sliced) {
      let Ee = await safeCheckoutPath(e, we, L);
      if (Ee !== null && (await isLfsPointerFile(Ee))) ke++;
    }
    return { pointerFiles: ke, truncated: y };
  } catch (error) {
    return (
      logForDebugging(`[git-lfs] pointer scan of ${e} skipped: ${errorMessage(error)}`, { level: "debug" }),
      lfsScanResult
    );
  }
}
//@ chunk-e6aww6q8.js:4191008-4191075 placement
var zms = /^(?![-@~=+])(?:[A-Za-z]:\/)?[\p{L}\p{N}\p{M}_@~+=./-]+$/u;
//@ chunk-e6aww6q8.js:4191075-4191787 placement
function describeGitLfsMissing(e, { pointerFiles: pointerFiles, truncated: truncated }) {
  if (pointerFiles === 0 && !truncated) return null;
  let s = sep_66 === "\\" ? e.replaceAll(sep_66, "/") : e,
    h = zms.test(s) ? `run: git -C ${s} lfs pull` : "run `git lfs pull` in that directory";
  if (pointerFiles === 0)
    return `${e} tracks files in Git LFS and not every LFS-tracked file could be checked: some may have been checked out as Git LFS pointer files instead of their content \u2014 Claude Code never downloads Git LFS content there. To fetch it, ${h}`;
  let y = pointerFiles !== 1;
  return `${truncated ? "At least " : ""}${pointerFiles} ${plural(pointerFiles, "file")} in ${e} ${y ? "were" : "was"} checked out as ${y ? "Git LFS pointer files" : "a Git LFS pointer file"} instead of ${y ? "their" : "its"} content \u2014 Claude Code never downloads Git LFS content there. To fetch it, ${h}`;
}
//@ chunk-e6aww6q8.js:4191787-4192025 placement
async function safeCheckoutPath(e, n, r) {
  let parts = n.split("/");
  if (isAbsolute_53(n) || parts.some((y) => y === "" || y === "." || y === "..")) return null;
  let h = join_114(e, ...parts);
  if (parts.length > 1) {
    let y = dirname_66(h),
      S = r.get(y);
    if (S === void 0) ((S = readPluginFileSafe(e, y)), r.set(y, S));
    if ((await S) !== "ok") return null;
  }
  return h;
}
/**
 * 文件开头是否 Git LFS 指针头。
 */
//@ chunk-e6aww6q8.js:4192025-4192338 placement
async function isLfsPointerFile(e) {
  if (zq() === 0) {
    if (!(await lstat_35(e).catch(() => null))?.isFile()) return !1;
  }
  let buffer = Buffer.from(GIT_LFS_POINTER_PREFIX, "latin1"),
    r;
  try {
    r = await open_22(e, $c());
    let alloc = Buffer.alloc(buffer.length),
      { bytesRead: bytesRead } = await r.read(alloc, 0, alloc.length, 0);
    return bytesRead === alloc.length && alloc.equals(buffer);
  } catch {
    return !1;
  } finally {
    await r?.close().catch(() => {
      return;
    });
  }
}
/**
 * 子模块挑选用的 schema、组件目录与插件根引用正则。
 */
//@ chunk-e6aww6q8.js:4192481-4192802 placement
var MarketplacePluginsSchema = DoctorLazy(() => u({ plugins: A(oe()) })),
  PluginSourceSchema = DoctorLazy(() => kt({ source: o() })),
  PLUGIN_TREE_DIRS = [...PLUGIN_COMPONENT_DIRS, "bin", "hljs"],
  PLUGIN_MANIFEST_PATHS = [PLUGIN_MANIFEST_PATH, PLUGIN_JSON],
  PLUGIN_CONFIG_FILES = [
    ".mcp.json",
    ".lsp.json",
    join_115("hooks", "hooks.json"),
    join_115("monitors", "monitors.json"),
  ],
  PLUGIN_ROOT_REF_RE =
    /(?:(?:^|[^.\w])\.|(?:\$(?:env:)?\{?|%)CLAUDE_PLUGIN_ROOT[}%]?["']?)[/\\]([^\s"'`$,;:()[\]{}\\]+)/g,
  MAX_SCANNED_FILES = 1e4,
  MAX_SCANNED_BYTES = 24000,
  MAX_SCANNED_REFS = 1e4;

export {
  MAX_SCANNED_BYTES,
  probeMarketplaceCheckout,
  qWn,
  checkGitLfsFiles,
  describeGitLfsMissing,
  MAX_SCANNED_REFS,
  MarketplacePluginsSchema,
  PluginSourceSchema,
  MAX_SCANNED_FILES,
  PLUGIN_MANIFEST_PATHS,
  PLUGIN_CONFIG_FILES,
  PLUGIN_TREE_DIRS,
  PLUGIN_ROOT_REF_RE,
  lsRemoteMarketplace,
  GIT_LFS_POINTER_PREFIX,
};
