/**
 * services/selfHostedRunner/repoSettingsConfinement.ts
 *
 * 2.1.316 新增：自托管 runner 检查仓库提交的 .claude 设置，拒绝越权的写入范围条目（SELF_HOSTED_RUNNER_CONFINE_REPO_SETTINGS）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hm0ce8vc.js (6)
 * attribution: placement 6
 */
import { realpath, lstat, mkdir } from "fs/promises";
import { dirname, isAbsolute, sep, join, resolve } from "path";
import { tagFailureStage } from "./launcherHooks.js";
import {
  getErrnoCode,
  errorMessage,
  isENOENT,
  isEISDIR,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { isNetworkRelatedPath } from "../../utils/networkPaths.js";
import { isDevicePrefixPath, isUncOrDevicePath } from "../../utils/pathClassification.js";
import { withFsOpTimeout, withBoundedTimeout, FS_OP_TIMEOUT_MS } from "../../utils/boundedTimeout.js";
import { examineEntryChain } from "../../utils/fsOperations.js";
import { removeTrailingGlobSuffix } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { expandPath } from "../../utils/path.js";
import { readFileChecked, isFileTooLargeError } from "../../utils/fileRead.js";
import { MAX_SETTINGS_JSON_BYTES } from "../../utils/settings/settings.js";
import { safeParseJSON } from "../../utils/json.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { patternWithRootFor } from "../../utils/permissions/filesystem.js";
import {
  resolvePathPatternForSandboxAt,
  parseRuleForSandbox,
  resolveSandboxFilesystemPathAt,
} from "../../utils/sandbox/sandbox-adapter.js";

//@ chunk-hm0ce8vc.js:195214-195571 placement
class RepoSettingsRejectedError extends Error {
  entry;
  detail;
  constructor(entry, detail) {
    super(
      `[runner:session] repo-committed ${entry.kind} entry '${entry.raw}' in ${entry.sourceFile} ${detail} \u2014 refusing to spawn. Host-specific write-scope entries belong in the operator's user-level settings.json (userSettings source, not trust-gated \u2014 see --trust-workspace docs).`,
    );
    this.entry = entry;
    this.detail = detail;
  }
}
//@ chunk-hm0ce8vc.js:195571-203425 placement
/**
 * 扫描仓库 .claude/settings*.json 等，发现主机特定写入范围条目则拒绝启动（SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED）。
 */
async function checkRepoCommittedSettings(rootDir, extraDirs, findings) {
  let entries = [];
  let reject = (error) => tagFailureStage(error, "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED");
  let onStatError = (path, entryInfo, opName) => (error) => {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return;
    throw new RepoSettingsRejectedError(
      {
        ...entryInfo,
        path,
        kind: "scan-fs-error",
      },
      `could not be probed (${opName} failed: ${error instanceof Error ? error.message : String(error)}) \u2014 refusing rather than fold a non-ENOENT error into "does not exist" (fail-closed)`,
    );
  };
  let isNetworkLikePath = (path) => isNetworkRelatedPath(path) || isDevicePrefixPath(path);
  let maxPathBytes = 4096;
  let rootRealpath;
  let resolveRoot = () =>
    (rootRealpath ??= withFsOpTimeout(
      realpath(rootDir).catch(() => null),
      `realpath ${rootDir}`,
    ));
  let screenCache = new Map();
  let screenPath = async (path) => {
    let rootReal = await resolveRoot();
    let cached = screenCache.get(path);
    if (cached === undefined) {
      let abortController = new AbortController();
      cached = {
        verdict: examineEntryChain(path, rootReal, {
          signal: abortController.signal,
        }),
        walk: abortController,
      };
      screenCache.set(path, cached);
    }
    try {
      return await withBoundedTimeout(cached.verdict, FS_OP_TIMEOUT_MS, `network-path screen of ${path}`);
    } catch (error) {
      cached.walk.abort();
      throw error;
    }
  };
  let probeEntryPath = async (path, entryInfo) => {
    if (isUncOrDevicePath(path) || isNetworkLikePath(path)) return;
    if (Buffer.byteLength(path) > 4096)
      throw new RepoSettingsRejectedError(
        {
          ...entryInfo,
          path,
          kind: "scan-fs-error",
        },
        `could not be probed (its resolved path is ${Buffer.byteLength(path)} bytes; this scan examines paths up to ${"4096"} bytes) \u2014 refusing rather than examine it (fail-closed)`,
      );
    let screen = await screenPath(path).catch((error) => {
      throw new RepoSettingsRejectedError(
        {
          ...entryInfo,
          path,
          kind: "scan-fs-error",
        },
        `could not be probed (${errorMessage(error)} \u2014 a hung mount on that path, or a symlink chain in the checkout too long to examine in time) \u2014 refusing rather than resolve through an unexamined path (fail-closed)`,
      );
    });
    if (screen.verdict === "unverified")
      throw new RepoSettingsRejectedError(
        {
          ...entryInfo,
          path,
          kind: "scan-fs-error",
        },
        `could not be probed (its resolved path '${path}' could not be inspected without following links \u2014 a permission, I/O or resource error on a directory or link on it, a link whose target could not be read, or too many symlinks on the path; check that path on the runner host) \u2014 refusing rather than resolve through it (fail-closed)`,
      );
    if (screen.verdict !== "clean")
      throw new RepoSettingsRejectedError(
        {
          ...entryInfo,
          path,
        },
        `resolves to '${path}', where a symlink on the path leads to the network path '${screen.reaches}' \u2014 resolving it would reach the network before any trust decision; refused without resolving (fail-closed)`,
      );
    let realPath = await withFsOpTimeout(
      realpath(path).catch(onStatError(path, entryInfo, "realpath")),
      `realpath ${path}`,
    );
    if (realPath !== undefined) return realPath;
    let candidate = path;
    for (let j = 0; j < 64; j++) {
      let stats = await withFsOpTimeout(
        lstat(candidate).catch(onStatError(path, entryInfo, "lstat")),
        `lstat ${candidate}`,
      );
      if (stats?.isSymbolicLink())
        throw new RepoSettingsRejectedError(
          {
            ...entryInfo,
            path,
          },
          `traverses a symlink at ${candidate} whose target path cannot be realpath'd \u2014 a repo-shipped link (dangling, or pointing outside the workspace with a nonexistent leaf) can be retargeted at use time`,
        );
      if (stats !== undefined) return;
      let parent = dirname(candidate);
      if (parent === candidate) return;
      candidate = parent;
    }
    throw new RepoSettingsRejectedError(
      {
        ...entryInfo,
        path,
      },
      "has too many nonexistent path components (ancestor-walk hop bound exhausted) \u2014 refusing rather than skip the symlink probe",
    );
  };
  let checkDotDotSegment = async (path, entryInfo) => {
    if (!isAbsolute(path)) return;
    let filtered = path.split(sep).filter((segment) => segment.length > 0);
    if (!filtered.includes("..")) return;
    if (isNetworkLikePath(path))
      throw new RepoSettingsRejectedError(
        {
          ...entryInfo,
          path,
        },
        "names an automount/NT-namespace-transiting spelling with '..' \u2014 the kernel-divergence probe cannot run without performing the automount lookup itself; refusing (fail-closed)",
      );
    let prefix = path.startsWith(sep) ? sep : "";
    for (let segment of filtered) {
      if (segment === ".") continue;
      if (segment === "..") {
        prefix = dirname(prefix);
        continue;
      }
      prefix = prefix === sep ? sep + segment : join(prefix, segment);
      let stats = await withFsOpTimeout(
        lstat(prefix).catch(onStatError(path, entryInfo, "lstat")),
        `lstat ${prefix}`,
      );
      if (stats?.isSymbolicLink())
        throw new RepoSettingsRejectedError(
          {
            ...entryInfo,
            path,
          },
          `contains a '..' after symlink ${prefix} \u2014 the kernel resolves the symlink before the '..' at bind time, diverging from the lexically-collapsed form the confine check saw`,
        );
      if (stats === undefined) return;
    }
  };
  let projectPath = (rawPath) => {
    let expanded = removeTrailingGlobSuffix(rawPath) || sep;
    return expandPath(expanded, rootDir);
  };
  let normalizePath = (rawPath) => removeTrailingGlobSuffix(rawPath) || sep;
  for (let workspacePath of new Set([rootDir, ...extraDirs])) {
    let claudeDir = join(workspacePath, ".claude");
    let dirStats = await withFsOpTimeout(
      lstat(claudeDir).catch((error) => {
        if (isENOENT(error)) return;
        throw error;
      }),
      `lstat ${claudeDir}`,
    );
    if (dirStats === undefined) continue;
    if (dirStats.isSymbolicLink())
      throw new RepoSettingsRejectedError(
        {
          path: claudeDir,
          sourceFile: claudeDir,
          raw: ".claude",
          kind: "permissions.additionalDirectories",
        },
        "is a symlink \u2014 refusing to follow (the settings read below would escape the workspace)",
      );
    for (let fileName of ["settings.json", "settings.local.json"]) {
      let settingsPath = join(claudeDir, fileName);
      let fileStats = await withFsOpTimeout(
        lstat(settingsPath).catch((error) => {
          if (isENOENT(error)) return;
          let rejection = new RepoSettingsRejectedError(
            {
              path: settingsPath,
              sourceFile: settingsPath,
              raw: fileName,
              kind: "scan-fs-error",
            },
            `could not be lstat'd (${error instanceof Error ? error.message : String(error)}) \u2014 refusing rather than skip the scan`,
          );
          throw getErrnoCode(error) === "ENOTDIR" ? reject(rejection) : rejection;
        }),
        `lstat ${settingsPath}`,
      );
      if (fileStats === undefined) continue;
      if (fileStats.isSymbolicLink())
        throw new RepoSettingsRejectedError(
          {
            path: settingsPath,
            sourceFile: settingsPath,
            raw: fileName,
            kind: "permissions.additionalDirectories",
          },
          "is a symlink \u2014 refusing to follow (the settings read below would escape the workspace; same posture as the .claude-dir lstat guard)",
        );
      let content;
      try {
        content = await withFsOpTimeout(
          readFileChecked(settingsPath, MAX_SETTINGS_JSON_BYTES).then((fileChecked) => fileChecked.content),
          `readFile ${settingsPath}`,
        );
      } catch (error) {
        if (isENOENT(error)) continue;
        let rejection = new RepoSettingsRejectedError(
          {
            path: settingsPath,
            sourceFile: settingsPath,
            raw: fileName,
            kind: "scan-fs-error",
          },
          `could not be read (${error instanceof Error ? error.message : String(error)}) \u2014 refusing rather than skip the scan`,
        );
        throw isEISDIR(error) || isFileTooLargeError(error) ? reject(rejection) : rejection;
      }
      let settings = safeParseJSON(content, false);
      if (
        findings &&
        (workspacePath === rootDir || rootDir.startsWith(workspacePath + sep)) &&
        settings?.disableAllHooks === true
      )
        findings.repoDisablesAllHooks = true;
      if (
        settings?.env !== undefined &&
        settings?.env !== null &&
        typeof settings.env === "object" &&
        Object.keys(settings.env).length > 0
      )
        throw new RepoSettingsRejectedError(
          {
            path: settingsPath,
            sourceFile: settingsPath,
            raw: `env: {${Object.keys(settings.env).slice(0, 3).join(", ")}${Object.keys(settings.env).length > 3 ? ", \u2026" : ""}}`,
            kind: "operator-posture override",
          },
          "sets env vars that reach every child subprocess (BASH_ENV/LD_PRELOAD/NODE_OPTIONS/GIT_* are unsandboxed-exec inlets). Runner-level env belongs in the operator wrapper script or runner env, not repo settings",
        );
      for (let [postureName, actual, forbidden] of [
        ["sandbox.enabled", settings?.sandbox?.enabled, false],
        ["disableAllHooks", settings?.disableAllHooks, false],
        ["sandbox.allowUnsandboxedCommands", settings?.sandbox?.allowUnsandboxedCommands, true],
        ["sandbox.failIfUnavailable", settings?.sandbox?.failIfUnavailable, false],
      ])
        if (actual === forbidden)
          throw new RepoSettingsRejectedError(
            {
              path: settingsPath,
              sourceFile: settingsPath,
              raw: `${postureName}: ${String(forbidden)}`,
              kind: "operator-posture override",
            },
            `negates the operator's ${postureName} posture (projectSettings overrides userSettings in the merged read). Remove it from the repo settings; operator posture belongs in the user-level settings.json`,
          );
      let permissions = settings?.permissions;
      let allow = Array.isArray(permissions?.allow) ? permissions.allow : [];
      for (let rule of allow) {
        if (typeof rule !== "string") continue;
        let parsedRule = permissionRuleValueFromString(rule);
        if (
          ![FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME].includes(parsedRule.toolName)
        )
          continue;
        if (parsedRule.ruleContent === undefined) {
          entries.push({
            path: sep,
            sourceFile: settingsPath,
            raw: rule,
            kind: "permissions.allow (bare write-tool rule)",
          });
          continue;
        }
        let { root } = patternWithRootFor(parsedRule.ruleContent, workspacePath);
        {
          let entryInfo = {
            sourceFile: settingsPath,
            raw: rule,
            kind: "permissions.allow (sandbox-arm projection)",
          };
          let projectedPath;
          let resolvedPath;
          try {
            projectedPath = resolvePathPatternForSandboxAt(
              parseRuleForSandbox(rule).ruleContent ?? parsedRule.ruleContent,
              workspacePath,
            );
            resolvedPath = projectPath(projectedPath);
          } catch (error) {
            throw new RepoSettingsRejectedError(
              {
                ...entryInfo,
                path: parsedRule.ruleContent,
              },
              `could not be resolved (${error instanceof Error ? error.message : String(error)}) \u2014 refusing rather than trust an entry the confine check cannot project`,
            );
          }
          entries.push({
            ...entryInfo,
            path: resolvedPath,
          });
          let realPath = await probeEntryPath(resolvedPath, entryInfo);
          if (realPath !== undefined && realPath !== resolvedPath)
            entries.push({
              ...entryInfo,
              path: realPath,
            });
          await checkDotDotSegment(normalizePath(projectedPath), entryInfo);
        }
        if (root === null) continue;
        let entryInfo = {
          sourceFile: settingsPath,
          raw: rule,
          kind: "permissions.allow",
        };
        entries.push({
          ...entryInfo,
          path: root,
        });
        let realPath = await probeEntryPath(root, entryInfo);
        if (realPath !== undefined && realPath !== root)
          entries.push({
            ...entryInfo,
            path: realPath,
          });
      }
      for (let [listName, list] of [
        ["allowWrite", settings?.sandbox?.filesystem?.allowWrite],
        ["allowRead", settings?.sandbox?.filesystem?.allowRead],
      ]) {
        if (!Array.isArray(list)) continue;
        for (let dirEntry of list) {
          if (typeof dirEntry !== "string") continue;
          let entryInfo = {
            sourceFile: settingsPath,
            raw: dirEntry,
            kind: `sandbox.filesystem.${listName}`,
          };
          let resolvedPath;
          let projectedPath;
          try {
            projectedPath = resolveSandboxFilesystemPathAt(dirEntry, workspacePath);
            resolvedPath = projectPath(projectedPath);
          } catch (error) {
            throw new RepoSettingsRejectedError(
              {
                ...entryInfo,
                path: dirEntry,
              },
              `could not be resolved (${error instanceof Error ? error.message : String(error)}) \u2014 refusing rather than trust an entry the confine check cannot project`,
            );
          }
          entries.push({
            ...entryInfo,
            path: resolvedPath,
          });
          let realPath = await probeEntryPath(resolvedPath, entryInfo);
          if (realPath !== undefined && realPath !== resolvedPath)
            entries.push({
              ...entryInfo,
              path: realPath,
            });
          await checkDotDotSegment(normalizePath(projectedPath), entryInfo);
        }
      }
      let additionalDirectories = permissions?.additionalDirectories;
      if (!Array.isArray(additionalDirectories)) continue;
      for (let additionalDirectory of additionalDirectories) {
        if (typeof additionalDirectory !== "string") continue;
        let entryInfo = {
          sourceFile: settingsPath,
          raw: additionalDirectory,
          kind: "permissions.additionalDirectories",
        };
        let resolvedPath;
        try {
          resolvedPath = resolve(expandPath(additionalDirectory, rootDir));
        } catch (error) {
          throw new RepoSettingsRejectedError(
            {
              ...entryInfo,
              path: String(additionalDirectory),
            },
            `could not be resolved (${error instanceof Error ? error.message : String(error)}) \u2014 refusing rather than trust an entry the confine check cannot project`,
          );
        }
        entries.push({
          ...entryInfo,
          path: resolvedPath,
        });
        let realPath = await probeEntryPath(resolvedPath, entryInfo);
        if (realPath !== undefined && realPath !== resolvedPath)
          entries.push({
            ...entryInfo,
            path: realPath,
          });
        await checkDotDotSegment(normalizePath(additionalDirectory), entryInfo);
      }
    }
  }
  return entries;
}
//@ chunk-hm0ce8vc.js:203425-203810 placement
/**
 * 会话目录与子进程自动允许写入范围重叠时拒绝启动。
 */
function checkSessionDirOutsideWriteScope(dirPath, label, childCwd, addDirs) {
  let path = dirPath.toLowerCase();
  let withSep = (path) => (path.endsWith(sep) ? path : path + sep);
  for (let allowedPath of [childCwd, ...addDirs]) {
    let path_2 = allowedPath.toLowerCase();
    if (path === path_2 || path.startsWith(withSep(path_2)) || path_2.startsWith(withSep(path)))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `[runner:session] per-session ${label} ${dirPath} overlaps the child's auto-allowed write scope (${allowedPath}) \u2014 refusing to spawn`,
        "per-session dir overlaps the child auto-allowed write scope \u2014 refusing to spawn",
      );
  }
}
//@ chunk-hm0ce8vc.js:203810-203922 placement
function resolveInside(basePath, targetPath) {
  let baseResolved = resolve(basePath);
  let targetResolved = isAbsolute(targetPath) ? resolve(targetPath) : resolve(baseResolved, targetPath);
  if (targetResolved === baseResolved) return targetResolved;
  if (targetResolved.startsWith(baseResolved + sep)) return targetResolved;
  return null;
}
//@ chunk-hm0ce8vc.js:203922-204220 placement
async function ensureDirsNoSymlinks(basePath, inside) {
  let baseResolved = resolve(basePath);
  let insideResolved = resolve(inside);
  if (insideResolved !== baseResolved && !insideResolved.startsWith(baseResolved + sep)) return false;
  let filtered = insideResolved.slice(baseResolved.length).split(sep).filter(Boolean);
  for (let segment of filtered) {
    baseResolved = join(baseResolved, segment);
    try {
      let stats = await lstat(baseResolved);
      if (stats.isSymbolicLink() || !stats.isDirectory()) return false;
    } catch (error) {
      if (!isENOENT(error)) return false;
      try {
        await mkdir(baseResolved);
      } catch {
        return false;
      }
    }
  }
  return true;
}
//@ chunk-hm0ce8vc.js:204220-204328 placement
async function isRealpathInside(basePath, inside) {
  try {
    let baseReal = await realpath(basePath);
    let insideReal = await realpath(inside);
    return insideReal === baseReal || insideReal.startsWith(baseReal + sep);
  } catch {
    return false;
  }
}
export {
  resolveInside,
  ensureDirsNoSymlinks,
  isRealpathInside,
  checkSessionDirOutsideWriteScope,
  checkRepoCommittedSettings,
  RepoSettingsRejectedError,
};
