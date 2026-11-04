/**
 * utils/worktree/sparseCheckout.ts
 *
 * 2.1.316 新增：稀疏检出
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { resolve as resolve_2, posix, join } from "path";
import { open, mkdtemp, rm as rm_2 } from "fs/promises";
import { tmpdir as tmpdir_2 } from "os";
import { randomUUID } from "crypto";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { GIT_SAFE_GLOBAL_ARGS } from "../git/gitSafeEnv.js";
import { buildGitEnvForRepo, resolveGitDirsOrPlaceholder } from "../git/gitDirResolution.js";
import { readPositionIsUnsafe } from "../git/gitFilesystem.js";
import { nonblockingReadFlags, readHandleUpTo } from "../fsOperations.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { MISSING_TOO_MANY_TEXT, MAX_LISTED_MISSING_BYTES } from "./partialClone.js";
import { truncateMiddle as truncateMiddle_2 } from "../../memdir/memoryTool.js";
import { hideUnsafeText } from "../unsafePathGlyphs.js";
import { stripProgressLines } from "./worktreeRegistrations.js";
import { firstLineOf } from "../stringUtils.js";
import { SandboxManager, getEffectiveFilesystemPolicy } from "../sandbox/sandbox-adapter.js";

//@ chunk-e6aww6q8.js:3591246-3591456 placement
async function uploadPackArgForRemote(a, b) {
  let configResult = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "config", "--local", "--get", `remote.${b}.uploadpack`],
    {
      cwd: a,
      env: buildGitEnvForRepo(a),
      stdin: "ignore",
    },
  );
  let trimmed = configResult.stdout.trim();
  return configResult.code === 0 && trimmed !== "" ? `--upload-pack=${trimmed}` : undefined;
}
//@ chunk-e6aww6q8.js:3591456-3591870 placement
/**
 * 根据 sparse-checkout 模式生成需要检出的 .gitattributes 路径模式。
 */
function gitattributesSparsePatterns({ text, cone }) {
  let filtered = text
    .toString()
    .split(
      `
`,
    )
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line !== "" && !line.startsWith("#"));
  let conePatternRe = /^\/\*$|^!?\/.*\/$/;
  if (!cone || filtered.some((pattern) => !conePatternRe.test(pattern)))
    return `.gitattributes
`;
  let attributesPaths = new Set(["/.gitattributes"]);
  for (let pattern of filtered) {
    let dirPath = /^\/(.*)\/$/.exec(pattern)?.[1];
    let config = dirPath ? dirPath.split("/") : [];
    for (let idx = 1; idx < config.length; idx++)
      attributesPaths.add(`/${config.slice(0, idx).join("/")}/.gitattributes`);
  }
  return [...attributesPaths, ""].join(`
`);
}
//@ chunk-e6aww6q8.js:3591870-3591886 placement
var MAX_SPARSE_CONFIG_BYTES = 1048576;
//@ chunk-e6aww6q8.js:3591886-3592665 placement
async function readSparseCheckoutConfig(worktreePath) {
  let runGit = (args) =>
    execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...args], {
      cwd: worktreePath,
      env: buildGitEnvForRepo(worktreePath),
      stdin: "ignore",
    });
  let configResult = await runGit([
    "config",
    "--type=bool",
    "--get-regexp",
    "^core\\.sparsecheckout(cone)?$",
  ]);
  let isConfigTrue = (configKey) =>
    [...configResult.stdout.matchAll(new RegExp(`^core\\.${configKey} (\\S+)$`, "gim"))].at(-1)?.[1] ===
    "true";
  if (configResult.code !== 0 || !isConfigTrue("sparsecheckout")) return null;
  let pathResult = await runGit(["rev-parse", "--git-path", "info/sparse-checkout"]);
  if (pathResult.code !== 0) return null;
  let coneMode = isConfigTrue("sparsecheckoutcone");
  let conePrelude = coneMode
    ? `/*
!/*/
`
    : "";
  let configPath = resolve_2(worktreePath, pathResult.stdout.trim());
  if (readPositionIsUnsafe(configPath, resolveGitDirsOrPlaceholder(worktreePath).gitDir)) return null;
  try {
    await using handle = await open(configPath, nonblockingReadFlags());
    let stats = await handle.stat();
    if (!stats.isFile() || stats.size > MAX_SPARSE_CONFIG_BYTES) return null;
    let handleUpTo = await readHandleUpTo(handle, MAX_SPARSE_CONFIG_BYTES, "file");
    let hasBom = handleUpTo.subarray(0, 3).equals(Buffer.from([239, 187, 191]));
    return {
      text: Buffer.concat([Buffer.from(conePrelude), handleUpTo.subarray(hasBom ? 3 : 0)]),
      cone: coneMode,
    };
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:3592665-3593207 placement
/**
 * 把稀疏检出路径规范化并合并为最少的目录集合，含非法路径时返回 null。
 */
function minimalSparseDirs(paths) {
  let filtered = paths
    .map((path) => posix.normalize(path.replace(/\\/g, "/")).replace(/^\/+/, "").replace(/\/+$/, ""))
    .filter((path) => path !== "" && path !== ".");
  if (filtered.length < paths.length) return null;
  let roots = [];
  for (let root of [...filtered].sort())
    if (!roots.some((root_2) => root === root_2 || root.startsWith(`${root_2}/`))) roots.push(root);
  let parentDirs = new Set();
  for (let root of roots) {
    let parts = root.split("/");
    for (let idx = 1; idx < parts.length; idx++) parentDirs.add(parts.slice(0, idx).join("/"));
  }
  let escapeGlobChars = (dir) => dir.replace(/[*?[\\]/g, "\\$&");
  return {
    text: [
      "/*",
      "!/*/",
      ...[...parentDirs]
        .sort()
        .flatMap((dir) => [`/${escapeGlobChars(dir)}/`, `!/${escapeGlobChars(dir)}/*/`]),
      ...roots.map((root) => `/${escapeGlobChars(root)}/`),
      "",
    ].join(`
`),
    cone: true,
  };
}
//@ chunk-e6aww6q8.js:3593207-3593326 placement
async function hasMissingSparseObjects(repoRoot, commit, sparseConfig) {
  await using patterns = await writeSparsePatterns(repoRoot, sparseConfig);
  let missing = await patterns.missing(commit);
  return typeof missing === "string" || missing.length > 0;
}
//@ chunk-e6aww6q8.js:3593326-3594255 placement
async function writeSparsePatterns(cwd, sparseConfig) {
  let sideDir =
    sparseConfig === null
      ? null
      : await mkdtemp(join(tmpdir_2(), "claude-sparse-")).catch((error) => {
          logForDebugging(
            `[worktree] could not make a side directory for the sparse patterns (${errorMessage(error)}); listing the whole tree`,
            {
              level: "warn",
            },
          );
          return null;
        });
  let patternsObject = null;
  if (sideDir !== null && sparseConfig !== null) {
    let hashResult = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "hash-object", "-w", "--stdin"],
      {
        cwd,
        env: buildGitEnvForRepo(cwd, {
          GIT_OBJECT_DIRECTORY: sideDir,
        }),
        input: Buffer.concat([
          Buffer.from(sparseConfig.text),
          Buffer.from(`
${gitattributesSparsePatterns(sparseConfig)}# ${randomUUID()}
`),
        ]),
      },
    );
    patternsObject = hashResult.code === 0 ? hashResult.stdout.trim() : null;
    if (patternsObject === null)
      logForDebugging(
        `[worktree] could not hand git the sparse patterns (${hashResult.stderr.trim()}); listing the whole tree`,
        {
          level: "warn",
        },
      );
  }
  return {
    async missing(commit) {
      if (patternsObject !== null && sideDir !== null) {
        let missing = await listMissingObjects(cwd, commit, {
          filter: patternsObject,
          side: sideDir,
        });
        if (typeof missing !== "string" || missing === MISSING_TOO_MANY_TEXT) return missing;
      }
      return listMissingObjects(cwd, commit);
    },
    async [Symbol.asyncDispose]() {
      if (sideDir !== null)
        await rm_2(sideDir, {
          recursive: true,
          force: true,
        }).catch((error) =>
          logForDebugging(
            `[worktree] could not remove the sparse patterns' side directory ${sideDir}: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          ),
        );
    },
  };
}
//@ chunk-e6aww6q8.js:3594255-3594818 placement
/**
 * 用 rev-list --missing=print 列出提交缺失的对象，失败时返回错误说明。
 */
async function listMissingObjects(cwd, commit, sparseFilter) {
  let result = await execFileNoThrowWithCwd(
    gitExe(),
    [
      ...GIT_SAFE_GLOBAL_ARGS,
      ...(sparseFilter ? ["-c", "core.sparseCheckoutCone=false"] : []),
      "rev-list",
      "--objects",
      "--quiet",
      "--missing=print",
      "--no-walk",
      ...(sparseFilter ? [`--filter=sparse:oid=${sparseFilter.filter}`] : []),
      commit,
      "--",
    ],
    {
      cwd,
      env: buildGitEnvForRepo(
        cwd,
        sparseFilter && {
          GIT_ALTERNATE_OBJECT_DIRECTORIES: sparseFilter.side,
        },
      ),
      stdin: "ignore",
      maxBuffer: MAX_LISTED_MISSING_BYTES,
    },
  );
  if (result.code !== 0) {
    logForDebugging(`[worktree] could not list the missing objects of ${commit}: ${result.stderr}`, {
      level: "warn",
    });
    return result.maxBufferExceeded
      ? MISSING_TOO_MANY_TEXT
      : truncateMiddle_2(hideUnsafeText(stripProgressLines(result.stderr), "git's error"));
  }
  return result.stdout
    .split(
      `
`,
    )
    .filter((line) => line.startsWith("?"))
    .map((line) => firstLineOf(line.slice(1), " "));
}
//@ chunk-e6aww6q8.js:3594848-3594932 placement
function isStrictSandboxFilesystem() {
  try {
    return SandboxManager.isSandboxingEnabled() && getEffectiveFilesystemPolicy() === "strict";
  } catch {
    return true;
  }
}
export {
  isStrictSandboxFilesystem,
  readSparseCheckoutConfig,
  hasMissingSparseObjects,
  minimalSparseDirs,
  writeSparsePatterns,
  uploadPackArgForRemote,
};
