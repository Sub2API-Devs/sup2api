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
import { mkdtemp, rm as rm_2, lstat, open } from "fs/promises";
import { join, sep, isAbsolute, dirname } from "path";
import { pluginGitUrlError } from "./pluginDirectoryTelemetry.js";
import { tmpdir } from "../tempDir.js";
import { runGitWithCeilingDirs } from "../gitSafeExec.js";
import { resolveGitSshConfig } from "./gitSshConfig.js";
import { execFileNoThrowWithCwd, execFileNoThrow } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, array, string, unknown, looseObject } from "../../../vendor/zod/v4/classic/schemas.js";
import { writeFileAtomic as writeFileAtomic_2 } from "../atomicPublishWrite.js";
import { jsonStringify } from "../slowOperations.js";
import { safeParseJSON } from "../json.js";
import { readFileGuarded } from "../fsSafety/guardedFileRead.js";
import { logForDebugging } from "../debug.js";
import { readGitHead, resolveRef, isValidGitSha } from "../git/gitFilesystem.js";
import { errorMessage } from "../errors.js";
import { redactKnownUrls } from "../redaction/urlRedaction.js";
import { logPluginFetch, classifyFetchError } from "./fetchTelemetry.js";
import { mcpAuthCacheContent, readPluginFileSafe } from "./safeFileRead.js";
import { buildGitEnvForRepo } from "../git/gitDirResolution.js";
import { GIT_SAFE_GLOBAL_ARGS } from "../git/gitSafeEnv.js";
import { plural } from "../stringUtils.js";
import { platformNoFollowFlags, readOnlyNoFollowFlags } from "../platformTargets.js";
import {
  PLUGIN_COMPONENT_DIRS,
  PLUGIN_MANIFEST_PATH as PLUGIN_MANIFEST_PATH_2,
  PLUGIN_JSON,
} from "./commandSource.js";

//@ chunk-e6aww6q8.js:4186897-4187414 placement
async function lsRemoteMarketplace(
  e,
  { flags: n = [], patterns: r = [], timeout: s, endsWithItsChildren: h = false } = {},
) {
  let y = pluginGitUrlError(e);
  if (y !== null)
    return {
      code: 1,
      stdout: "",
      stderr: `Refusing to query. ${y.message}`,
    };
  let S = await mkdtemp(join(tmpdir(), "claude-lsremote-"));
  try {
    let w = runGitWithCeilingDirs(S, await resolveGitSshConfig(e));
    let L = ["-C", S, ...w.inCheckoutArgs, "ls-remote", ...n, "--", e, ...r];
    let G = {
      env: w.env,
      stdin: "ignore",
      ...(s !== undefined && {
        timeout: s,
      }),
    };
    return h
      ? await execFileNoThrowWithCwd(gitExe(), L, {
          ...G,
          cwd: S,
          withoutControllingTerminal: true,
        })
      : await execFileNoThrow(gitExe(), L, G);
  } finally {
    await rm_2(S, {
      recursive: true,
      force: true,
    }).catch(() => {});
  }
}
//@ chunk-e6aww6q8.js:4187414-4187499 placement
var CLAUDE_CODE_SPARSE_PATHS_JSON = "claude-code-sparse-paths.json";
var MAX_SPARSE_PATHS_FILE_BYTES = 65536;
var sparsePathsSchema = DoctorLazy(() =>
  u({
    sparsePaths: array(string()),
  }),
);
//@ chunk-e6aww6q8.js:4187499-4187574 placement
/**
 * writeSparsePaths：写入稀疏路径配置。
 */
async function writeSparsePaths(e, n) {
  await writeFileAtomic_2(
    join(e, ".git", CLAUDE_CODE_SPARSE_PATHS_JSON),
    jsonStringify({
      sparsePaths: n ?? [],
    }),
  );
}
//@ chunk-e6aww6q8.js:4187574-4189152 placement
/**
 * 探测已有的市场检出是否可复用（稀疏路径、HEAD、分支），否则重新克隆。
 */
async function probeMarketplaceCheckout(e, n, { ref, sparsePaths, timeout }) {
  let y = join(e, ".git");
  let S = sparsePathsSchema().safeParse(
    safeParseJSON(
      await readFileGuarded(join(y, CLAUDE_CODE_SPARSE_PATHS_JSON), MAX_SPARSE_PATHS_FILE_BYTES, {
        noFollow: true,
      }),
      false,
    ),
  );
  let sorted = (S.success ? S.data.sparsePaths : []).sort();
  let sorted_2 = [...(sparsePaths ?? [])].sort();
  if (sorted_2.length !== sorted.length || sorted_2.some((Ie, Me) => Ie !== sorted[Me])) {
    logForDebugging("Marketplace checkout probe: sparse paths changed, re-cloning");
    return "stale";
  }
  let gitHead = await readGitHead(y);
  let q =
    gitHead === null
      ? null
      : gitHead.type === "branch"
        ? await resolveRef(y, `refs/heads/${gitHead.name}`)
        : gitHead.sha;
  if (!q) {
    logForDebugging("Marketplace checkout probe: no readable HEAD, cloning");
    return "stale";
  }
  if (ref !== undefined && isValidGitSha(ref)) return ref === q ? "current" : "stale";
  let startTime = performance.now();
  let Se;
  try {
    Se = await lsRemoteMarketplace(n, {
      patterns:
        ref === undefined ? ["HEAD"] : [`refs/heads/${ref}`, `refs/tags/${ref}^{}`, `refs/tags/${ref}`],
      timeout,
    });
  } catch (error) {
    logForDebugging(`Marketplace checkout probe: ls-remote not run (${errorMessage(error)}), re-cloning`, {
      level: "warn",
    });
    return "stale";
  }
  let ke = redactKnownUrls(Se.stderr, n);
  logPluginFetch(
    "marketplace_probe",
    n,
    Se.code === 0 ? "success" : "failure",
    performance.now() - startTime,
    Se.code === 0 ? undefined : classifyFetchError(ke),
  );
  if (Se.code !== 0) {
    logForDebugging(`Marketplace checkout probe: ls-remote exited ${Se.code}: ${ke}`);
    return "unreachable";
  }
  let we = new Map();
  for (let line of Se.stdout.split(`
`)) {
    let index = line.indexOf("\t");
    if (index !== -1) we.set(line.slice(index + 1).trim(), line.slice(0, index));
  }
  let Ee =
    ref === undefined
      ? we.get("HEAD")
      : (we.get(`refs/heads/${ref}`) ?? we.get(`refs/tags/${ref}^{}`) ?? we.get(`refs/tags/${ref}`));
  if (Ee === undefined) {
    logForDebugging(`Marketplace checkout probe: ${ref ?? "HEAD"} not advertised by the remote, re-cloning`);
    return "stale";
  }
  let Ae = Ee === q;
  logForDebugging(
    `Marketplace checkout probe: local ${q.slice(0, 12)} remote ${Ee.slice(0, 12)} \u2014 ${Ae ? "up to date" : "re-cloning"}`,
  );
  return Ae ? "current" : "stale";
}
//@ chunk-e6aww6q8.js:4189276-4189451 placement
/**
 * Git LFS 指针文件头与扫描限额。
 */
var GIT_LFS_POINTER_PREFIX = `version https://git-lfs.github.com/spec/v1
`;
var MAX_LFS_REPORTED_FILES = 100;
var MAX_LFS_SCANNED_FILES = 20000;
var MAX_GITATTRIBUTES_BYTES = 4194304;
var LFS_SCAN_LIMIT = 1e4;
var LFS_FILTER_RE = /(?:^|[ \t])filter=lfs(?:[ \t\r]|$)/m;
var MAX_LFS_DIRS = 50;
var lfsScanResult = {
  pointerFiles: 0,
  truncated: false,
};
//@ chunk-e6aww6q8.js:4189451-4191008 placement
/**
 * 检查市场检出中 Git LFS 跟踪的文件是否都已拉取。
 */
async function checkGitLfsFiles(e) {
  try {
    let n = await mcpAuthCacheContent(join(e, ".gitattributes")).catch(() => {
      return;
    });
    let r = n !== undefined && LFS_FILTER_RE.test(n);
    let s = {
      cwd: e,
      env: buildGitEnvForRepo(e),
      timeout: LFS_SCAN_LIMIT,
      maxBuffer: MAX_GITATTRIBUTES_BYTES,
    };
    let h = await execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "ls-files", "-z", "-t"], {
      ...s,
      stdin: "ignore",
    });
    if (h.code !== 0 && !h.maxBufferExceeded) {
      logForDebugging(
        `[git-lfs] could not list the index of ${e}: ${h.stderr || h.error || `exit ${h.code}`}`,
        {
          level: "debug",
        },
      );
      return lfsScanResult;
    }
    let y = h.maxBufferExceeded === true;
    let parts = h.stdout.split("\x00");
    parts.pop();
    let w = [];
    for (let we of parts) {
      if (w.length === MAX_LFS_SCANNED_FILES) {
        y = true;
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
        let Ae = await safeCheckoutPath(e, Ee, L);
        let Ie =
          Ae === null
            ? undefined
            : await mcpAuthCacheContent(Ae).catch(() => {
                return;
              });
        if (Ie !== undefined && LFS_FILTER_RE.test(Ie)) {
          r = true;
          break;
        }
      }
    }
    if (!r) return lfsScanResult;
    if (w.length === 0)
      return {
        pointerFiles: 0,
        truncated: y,
      };
    let G = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "check-attr", "-z", "--stdin", "filter"],
      {
        ...s,
        input: `${w.join("\x00")}\x00`,
      },
    );
    if (G.code !== 0 && !G.maxBufferExceeded) {
      logForDebugging(
        `[git-lfs] could not read the filter attributes in ${e}: ${G.stderr || G.error || `exit ${G.code}`}`,
        {
          level: "debug",
        },
      );
      return {
        pointerFiles: 0,
        truncated: y,
      };
    }
    y ||= G.maxBufferExceeded === true;
    let parts_2 = G.stdout.split("\x00");
    let Z = [];
    for (let we = 0; we + 3 < parts_2.length; we += 3)
      if (parts_2[we + 1] === "filter" && parts_2[we + 2] === "lfs") Z.push(parts_2[we]);
    let sliced = Z.slice(0, MAX_LFS_REPORTED_FILES);
    y ||= Z.length > sliced.length;
    let ke = 0;
    for (let we of sliced) {
      let Ee = await safeCheckoutPath(e, we, L);
      if (Ee !== null && (await isLfsPointerFile(Ee))) ke++;
    }
    return {
      pointerFiles: ke,
      truncated: y,
    };
  } catch (error) {
    logForDebugging(`[git-lfs] pointer scan of ${e} skipped: ${errorMessage(error)}`, {
      level: "debug",
    });
    return lfsScanResult;
  }
}
//@ chunk-e6aww6q8.js:4191008-4191075 placement
var VALID_SPARSE_PATH_RE = /^(?![-@~=+])(?:[A-Za-z]:\/)?[\p{L}\p{N}\p{M}_@~+=./-]+$/u;
//@ chunk-e6aww6q8.js:4191075-4191787 placement
function describeGitLfsMissing(e, { pointerFiles, truncated }) {
  if (pointerFiles === 0 && !truncated) return null;
  let s = sep === "\\" ? e.replaceAll(sep, "/") : e;
  let h = VALID_SPARSE_PATH_RE.test(s) ? `run: git -C ${s} lfs pull` : "run `git lfs pull` in that directory";
  if (pointerFiles === 0)
    return `${e} tracks files in Git LFS and not every LFS-tracked file could be checked: some may have been checked out as Git LFS pointer files instead of their content \u2014 Claude Code never downloads Git LFS content there. To fetch it, ${h}`;
  let y = pointerFiles !== 1;
  return `${truncated ? "At least " : ""}${pointerFiles} ${plural(pointerFiles, "file")} in ${e} ${y ? "were" : "was"} checked out as ${y ? "Git LFS pointer files" : "a Git LFS pointer file"} instead of ${y ? "their" : "its"} content \u2014 Claude Code never downloads Git LFS content there. To fetch it, ${h}`;
}
//@ chunk-e6aww6q8.js:4191787-4192025 placement
async function safeCheckoutPath(e, n, r) {
  let parts = n.split("/");
  if (isAbsolute(n) || parts.some((y) => y === "" || y === "." || y === "..")) return null;
  let h = join(e, ...parts);
  if (parts.length > 1) {
    let y = dirname(h);
    let S = r.get(y);
    if (S === undefined) {
      S = readPluginFileSafe(e, y);
      r.set(y, S);
    }
    if ((await S) !== "ok") return null;
  }
  return h;
}
//@ chunk-e6aww6q8.js:4192025-4192338 placement
/**
 * 文件开头是否 Git LFS 指针头。
 */
async function isLfsPointerFile(e) {
  if (platformNoFollowFlags() === 0) {
    if (!(await lstat(e).catch(() => null))?.isFile()) return false;
  }
  let buffer = Buffer.from(GIT_LFS_POINTER_PREFIX, "latin1");
  let r;
  try {
    r = await open(e, readOnlyNoFollowFlags());
    let s = Buffer.alloc(buffer.length);
    let { bytesRead } = await r.read(s, 0, s.length, 0);
    return bytesRead === s.length && s.equals(buffer);
  } catch {
    return false;
  } finally {
    await r?.close().catch(() => {
      return;
    });
  }
}
//@ chunk-e6aww6q8.js:4192481-4192802 placement
/**
 * 子模块挑选用的 schema、组件目录与插件根引用正则。
 */
var MarketplacePluginsSchema = DoctorLazy(() =>
  u({
    plugins: array(unknown()),
  }),
);
var PluginSourceSchema = DoctorLazy(() =>
  looseObject({
    source: string(),
  }),
);
var PLUGIN_TREE_DIRS = [...PLUGIN_COMPONENT_DIRS, "bin", "hljs"];
var PLUGIN_MANIFEST_PATHS = [PLUGIN_MANIFEST_PATH_2, PLUGIN_JSON];
var PLUGIN_CONFIG_FILES = [
  ".mcp.json",
  ".lsp.json",
  join("hooks", "hooks.json"),
  join("monitors", "monitors.json"),
];
var PLUGIN_ROOT_REF_RE =
  /(?:(?:^|[^.\w])\.|(?:\$(?:env:)?\{?|%)CLAUDE_PLUGIN_ROOT[}%]?["']?)[/\\]([^\s"'`$,;:()[\]{}\\]+)/g;
var MAX_SCANNED_FILES = 1e4;
var MAX_SCANNED_BYTES = 24000;
var MAX_SCANNED_REFS = 1e4;
export {
  MAX_SCANNED_BYTES,
  probeMarketplaceCheckout,
  writeSparsePaths,
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
