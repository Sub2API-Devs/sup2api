/**
 * utils/plugins/marketplaceGitCheckout.ts
 *
 * 2.1.316 新增：市场 git 检出
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { mkdtemp, rm, lstat, open } from "fs/promises";
import { join, sep, isAbsolute, dirname } from "path";
import { pluginGitUrlError } from "./pluginDirectoryTelemetry.js";
import { tmpdir } from "../tempDir.js";
import { runGitWithCeilingDirs } from "../gitSafeExec.js";
import { resolveGitSshConfig } from "./gitSshConfig.js";
import { execFileNoThrowWithCwd, execFileNoThrow } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  array,
  stringSchema,
  unknown,
  looseObject,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { writeFileAtomic as writeFileAtomic_2 } from "../atomicPublishWrite.js";
import { jsonStringify } from "../slowOperations.js";
import { safeParseJSON } from "../json.js";
import { readFileGuarded } from "../fsSafety/guardedFileRead.js";
import { logForDebugging } from "../debug.js";
import { readGitHead, resolveRef, isValidGitSha } from "../git/gitFilesystem.js";
import { errorMessage } from "../errors.js";
import { redactKnownUrls } from "../redaction/urlRedaction.js";
import { logPluginFetch, classifyFetchError } from "./fetchTelemetry.js";
import { readSmallFileText, readPluginFileSafe } from "./safeFileRead.js";
import { buildGitEnvForRepo } from "../git/gitDirResolution.js";
import { GIT_SAFE_GLOBAL_ARGS } from "../git/gitSafeEnv.js";
import { plural } from "../stringUtils.js";
import { platformNoFollowFlags, readOnlyNoFollowFlags } from "../platformTargets.js";
import {
  PLUGIN_COMPONENT_DIRS,
  PLUGIN_MANIFEST_PATH as PLUGIN_MANIFEST_PATH_2,
  PLUGIN_JSON,
} from "./commandSource.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4293274-4293791 placement
async function lsRemoteMarketplace(
  rawUrl,
  { flags = [], patterns = [], timeout, endsWithItsChildren = false } = {},
) {
  let urlError = pluginGitUrlError(rawUrl);
  if (urlError !== null)
    return {
      code: 1,
      stdout: "",
      stderr: `Refusing to query. ${urlError.message}`,
    };
  let tempDir = await mkdtemp(join(tmpdir(), "claude-lsremote-"));
  try {
    let gitEnv = runGitWithCeilingDirs(tempDir, await resolveGitSshConfig(rawUrl));
    let args = ["-C", tempDir, ...gitEnv.inCheckoutArgs, "ls-remote", ...flags, "--", rawUrl, ...patterns];
    let execOptions = {
      env: gitEnv.env,
      stdin: "ignore",
      ...(timeout !== undefined && {
        timeout,
      }),
    };
    return endsWithItsChildren
      ? await execFileNoThrowWithCwd(gitExe(), args, {
          ...execOptions,
          cwd: tempDir,
          withoutControllingTerminal: true,
        })
      : await execFileNoThrow(gitExe(), args, execOptions);
  } finally {
    await rm(tempDir, {
      recursive: true,
      force: true,
    }).catch(() => {});
  }
}
//@ chunk-5xgkngpb.js:4293791-4293876 placement
var CLAUDE_CODE_SPARSE_PATHS_JSON; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_SPARSE_PATHS_FILE_BYTES;
var sparsePathsSchema;
deferInit("chunk-5xgkngpb.js:4293791", () => {
  CLAUDE_CODE_SPARSE_PATHS_JSON = "claude-code-sparse-paths.json";
  MAX_SPARSE_PATHS_FILE_BYTES = 65536;
  sparsePathsSchema = DoctorLazy(() =>
    objectSchema({
      sparsePaths: array(stringSchema()),
    }),
  );
});
//@ chunk-5xgkngpb.js:4293876-4293951 placement
/**
 * writeSparsePaths：写入稀疏路径配置。
 */
async function writeSparsePaths(checkoutDir, sparsePaths) {
  await writeFileAtomic_2(
    join(checkoutDir, ".git", CLAUDE_CODE_SPARSE_PATHS_JSON),
    jsonStringify({
      sparsePaths: sparsePaths ?? [],
    }),
  );
}
//@ chunk-5xgkngpb.js:4293951-4295531 placement
/**
 * 探测已有的市场检出是否可复用（稀疏路径、HEAD、分支），否则重新克隆。
 */
async function probeMarketplaceCheckout(checkoutDir, remoteUrl, { ref, sparsePaths, timeout }) {
  let gitDir = join(checkoutDir, ".git");
  let parsedSparse = sparsePathsSchema().safeParse(
    safeParseJSON(
      await readFileGuarded(join(gitDir, CLAUDE_CODE_SPARSE_PATHS_JSON), MAX_SPARSE_PATHS_FILE_BYTES, {
        noFollow: true,
      }),
      false,
    ),
  );
  let sorted = (parsedSparse.success ? parsedSparse.data.sparsePaths : []).sort();
  let sorted_2 = [...(sparsePaths ?? [])].sort();
  if (sorted_2.length !== sorted.length || sorted_2.some((left, right) => left !== sorted[right])) {
    logForDebugging("Marketplace checkout probe: sparse paths changed, re-cloning");
    return "stale";
  }
  let gitHead = await readGitHead(gitDir);
  let localSha =
    gitHead === null
      ? null
      : gitHead.type === "branch"
        ? await resolveRef(gitDir, `refs/heads/${gitHead.name}`)
        : gitHead.sha;
  if (!localSha) {
    logForDebugging("Marketplace checkout probe: no readable HEAD, cloning");
    return "stale";
  }
  if (ref !== undefined && isValidGitSha(ref)) return ref === localSha ? "current" : "stale";
  let startTime = performance.now();
  let remoteResult;
  try {
    remoteResult = await lsRemoteMarketplace(remoteUrl, {
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
  let stderr = redactKnownUrls(remoteResult.stderr, remoteUrl);
  logPluginFetch(
    "marketplace_probe",
    remoteUrl,
    remoteResult.code === 0 ? "success" : "failure",
    performance.now() - startTime,
    remoteResult.code === 0 ? undefined : classifyFetchError(stderr),
  );
  if (remoteResult.code !== 0) {
    logForDebugging(`Marketplace checkout probe: ls-remote exited ${remoteResult.code}: ${stderr}`);
    return "unreachable";
  }
  let refs = new Map();
  for (let line of remoteResult.stdout.split(`
`)) {
    let index = line.indexOf("\t");
    if (index !== -1) refs.set(line.slice(index + 1).trim(), line.slice(0, index));
  }
  let remoteSha =
    ref === undefined
      ? refs.get("HEAD")
      : (refs.get(`refs/heads/${ref}`) ?? refs.get(`refs/tags/${ref}^{}`) ?? refs.get(`refs/tags/${ref}`));
  if (remoteSha === undefined) {
    logForDebugging(`Marketplace checkout probe: ${ref ?? "HEAD"} not advertised by the remote, re-cloning`);
    return "stale";
  }
  let isCurrent = remoteSha === localSha;
  logForDebugging(
    `Marketplace checkout probe: local ${localSha.slice(0, 12)} remote ${remoteSha.slice(0, 12)} \u2014 ${isCurrent ? "up to date" : "re-cloning"}`,
  );
  return isCurrent ? "current" : "stale";
}
//@ chunk-5xgkngpb.js:4295655-4295830 placement
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
//@ chunk-5xgkngpb.js:4295830-4297391 placement
/**
 * 检查市场检出中 Git LFS 跟踪的文件是否都已拉取。
 */
async function checkGitLfsFiles(repoDir) {
  try {
    let attrContent = await readSmallFileText(join(repoDir, ".gitattributes")).catch(() => {
      return;
    });
    let rootTracksLfs = attrContent !== undefined && LFS_FILTER_RE.test(attrContent);
    let execBase = {
      cwd: repoDir,
      env: buildGitEnvForRepo(repoDir),
      timeout: LFS_SCAN_LIMIT,
      maxBuffer: MAX_GITATTRIBUTES_BYTES,
    };
    let lsFiles = await execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "ls-files", "-z", "-t"], {
      ...execBase,
      stdin: "ignore",
    });
    if (lsFiles.code !== 0 && !lsFiles.maxBufferExceeded) {
      logForDebugging(
        `[git-lfs] could not list the index of ${repoDir}: ${lsFiles.stderr || lsFiles.error || `exit ${lsFiles.code}`}`,
        {
          level: "debug",
        },
      );
      return lfsScanResult;
    }
    let truncated = lsFiles.maxBufferExceeded === true;
    let parts = lsFiles.stdout.split("\x00");
    parts.pop();
    let files = [];
    for (let entry of parts) {
      if (files.length === MAX_LFS_SCANNED_FILES) {
        truncated = true;
        break;
      }
      if (entry.length > 2 && entry[1] === " " && entry[0] !== "S") files.push(entry.slice(2));
    }
    let attrCache = new Map();
    if (!rootTracksLfs) {
      let dirCount = 0;
      for (let file of files) {
        if (!file.endsWith("/.gitattributes")) continue;
        if (dirCount === MAX_LFS_DIRS) break;
        dirCount++;
        let fullPath = await safeCheckoutPath(repoDir, file, attrCache);
        let content =
          fullPath === null
            ? undefined
            : await readSmallFileText(fullPath).catch(() => {
                return;
              });
        if (content !== undefined && LFS_FILTER_RE.test(content)) {
          rootTracksLfs = true;
          break;
        }
      }
    }
    if (!rootTracksLfs) return lfsScanResult;
    if (files.length === 0)
      return {
        pointerFiles: 0,
        truncated,
      };
    let checkAttr = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "check-attr", "-z", "--stdin", "filter"],
      {
        ...execBase,
        input: `${files.join("\x00")}\x00`,
      },
    );
    if (checkAttr.code !== 0 && !checkAttr.maxBufferExceeded) {
      logForDebugging(
        `[git-lfs] could not read the filter attributes in ${repoDir}: ${checkAttr.stderr || checkAttr.error || `exit ${checkAttr.code}`}`,
        {
          level: "debug",
        },
      );
      return {
        pointerFiles: 0,
        truncated,
      };
    }
    truncated ||= checkAttr.maxBufferExceeded === true;
    let parts_2 = checkAttr.stdout.split("\x00");
    let lfsFiles = [];
    for (let idx = 0; idx + 3 < parts_2.length; idx += 3)
      if (parts_2[idx + 1] === "filter" && parts_2[idx + 2] === "lfs") lfsFiles.push(parts_2[idx]);
    let sliced = lfsFiles.slice(0, MAX_LFS_REPORTED_FILES);
    truncated ||= lfsFiles.length > sliced.length;
    let pointerCount = 0;
    for (let file of sliced) {
      let fullPath = await safeCheckoutPath(repoDir, file, attrCache);
      if (fullPath !== null && (await isLfsPointerFile(fullPath))) pointerCount++;
    }
    return {
      pointerFiles: pointerCount,
      truncated,
    };
  } catch (error) {
    logForDebugging(`[git-lfs] pointer scan of ${repoDir} skipped: ${errorMessage(error)}`, {
      level: "debug",
    });
    return lfsScanResult;
  }
}
//@ chunk-5xgkngpb.js:4297391-4297458 placement
var VALID_SPARSE_PATH_RE = /^(?![-@~=+])(?:[A-Za-z]:\/)?[\p{L}\p{N}\p{M}_@~+=./-]+$/u;
//@ chunk-5xgkngpb.js:4297458-4298170 placement
function describeGitLfsMissing(repoDir, { pointerFiles, truncated }) {
  if (pointerFiles === 0 && !truncated) return null;
  let displayPath = sep === "\\" ? repoDir.replaceAll(sep, "/") : repoDir;
  let hint = VALID_SPARSE_PATH_RE.test(displayPath)
    ? `run: git -C ${displayPath} lfs pull`
    : "run `git lfs pull` in that directory";
  if (pointerFiles === 0)
    return `${repoDir} tracks files in Git LFS and not every LFS-tracked file could be checked: some may have been checked out as Git LFS pointer files instead of their content \u2014 Claude Code never downloads Git LFS content there. To fetch it, ${hint}`;
  let isPlural = pointerFiles !== 1;
  return `${truncated ? "At least " : ""}${pointerFiles} ${plural(pointerFiles, "file")} in ${repoDir} ${isPlural ? "were" : "was"} checked out as ${isPlural ? "Git LFS pointer files" : "a Git LFS pointer file"} instead of ${isPlural ? "their" : "its"} content \u2014 Claude Code never downloads Git LFS content there. To fetch it, ${hint}`;
}
//@ chunk-5xgkngpb.js:4298170-4298408 placement
async function safeCheckoutPath(repoDir, entryPath, parentChecks) {
  let parts = entryPath.split("/");
  if (isAbsolute(entryPath) || parts.some((part) => part === "" || part === "." || part === ".."))
    return null;
  let fullPath = join(repoDir, ...parts);
  if (parts.length > 1) {
    let parentDir = dirname(fullPath);
    let pending = parentChecks.get(parentDir);
    if (pending === undefined) {
      pending = readPluginFileSafe(repoDir, parentDir);
      parentChecks.set(parentDir, pending);
    }
    if ((await pending) !== "ok") return null;
  }
  return fullPath;
}
//@ chunk-5xgkngpb.js:4298408-4298721 placement
/**
 * 文件开头是否 Git LFS 指针头。
 */
async function isLfsPointerFile(filePath) {
  if (platformNoFollowFlags() === 0) {
    if (!(await lstat(filePath).catch(() => null))?.isFile()) return false;
  }
  let buffer = Buffer.from(GIT_LFS_POINTER_PREFIX, "latin1");
  let handle;
  try {
    handle = await open(filePath, readOnlyNoFollowFlags());
    let head = Buffer.alloc(buffer.length);
    let { bytesRead } = await handle.read(head, 0, head.length, 0);
    return bytesRead === head.length && head.equals(buffer);
  } catch {
    return false;
  } finally {
    await handle?.close().catch(() => {
      return;
    });
  }
}
//@ chunk-5xgkngpb.js:4298864-4299185 placement
/**
 * 子模块挑选用的 schema、组件目录与插件根引用正则。
 */
var MarketplacePluginsSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PluginSourceSchema;
var PLUGIN_TREE_DIRS;
var PLUGIN_MANIFEST_PATHS;
var PLUGIN_CONFIG_FILES;
var PLUGIN_ROOT_REF_RE;
var MAX_SCANNED_FILES;
var MAX_SCANNED_BYTES;
var MAX_SCANNED_REFS;
deferInit("chunk-5xgkngpb.js:4298864", () => {
  MarketplacePluginsSchema = DoctorLazy(() =>
    objectSchema({
      plugins: array(unknown()),
    }),
  );
  PluginSourceSchema = DoctorLazy(() =>
    looseObject({
      source: stringSchema(),
    }),
  );
  PLUGIN_TREE_DIRS = [...PLUGIN_COMPONENT_DIRS, "bin", "hljs"];
  PLUGIN_MANIFEST_PATHS = [PLUGIN_MANIFEST_PATH_2, PLUGIN_JSON];
  PLUGIN_CONFIG_FILES = [
    ".mcp.json",
    ".lsp.json",
    join("hooks", "hooks.json"),
    join("monitors", "monitors.json"),
  ];
  PLUGIN_ROOT_REF_RE =
    /(?:(?:^|[^.\w])\.|(?:\$(?:env:)?\{?|%)CLAUDE_PLUGIN_ROOT[}%]?["']?)[/\\]([^\s"'`$,;:()[\]{}\\]+)/g;
  MAX_SCANNED_FILES = 1e4;
  MAX_SCANNED_BYTES = 24000;
  MAX_SCANNED_REFS = 1e4;
});
export {
  lsRemoteMarketplace,
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
  GIT_LFS_POINTER_PREFIX,
};
