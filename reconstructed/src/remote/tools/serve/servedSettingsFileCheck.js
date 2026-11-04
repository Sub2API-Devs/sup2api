/**
 * remote/tools/serve/servedSettingsFileCheck.ts
 *
 * 2.1.316 新增：服务端 shell 写设置文件的检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tr0s0d0k.js (4)
 * attribution: placement 4
 */
import { join, parse, isAbsolute, resolve, basename } from "path";
import { createCombinedAbortSignal } from "../../../utils/combinedAbortSignal.js";
import { SERVED_SHELL_READ_LIMITS, CUT_SHORT, MAX_PATH_PIECES } from "./servedShellReading.js";
import { getPlatform } from "../../../utils/platform.js";
import {
  touchesProtectedPath,
  isReadOnlyCommand,
  classifyCommandForSandbox,
  getProtectedSettingsPaths,
  isHostPersonOnlyPath,
} from "../../../tools/BashTool/readOnlyShellCheck.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import {
  settingsLocationPaths,
  SETTINGS_FILE_BASENAMES,
  normalizeCaseForComparison,
} from "../../../utils/permissions/filesystem.js";
import { uniq } from "../../../utils/collections.js";
import { getClaudeConfigDirs } from "../../../utils/permissions/claudeStatePaths.js";
import { expandTildeWithHome, isUnderNetworkDirCached } from "../../../utils/networkPaths.js";
import { containsAnyPlaceholder } from "../../../utils/bash/ast.js";
import { isUncOrDeviceSpelling, isNetworkOrDevicePath } from "../../../utils/fsJunctions.js";
import {
  getFsImplementation,
  walkPermissionCheckPathsAsync,
  vetRepoSettingsPathAsync,
} from "../../../utils/fsOperations.js";
import { getErrnoCode } from "../../../utils/errors.js";
import { logError } from "../../../utils/log.js";
import { logForDebugging } from "../../../utils/debug.js";
import { isSentinelInode } from "../../../utils/slowOperations.js";

//@ chunk-tr0s0d0k.js:48209-50947 placement
/**
 * 判断云会话调用的 shell 命令是否会写到本机 Claude 设置文件（解析重定向/参数，比对设置文件身份）。
 */
async function checkServedShellSettingsWrite(name, input, cwd, stopSignal, readOnlyAllowed = false) {
  let command = input.command;
  if (typeof command !== "string")
    return {
      file: "error",
      fileOrFolder: "error",
    };
  let result = {
    file: "none",
    fileOrFolder: "none",
  };
  let combinedAbortSignal = createCombinedAbortSignal(stopSignal, {
    timeoutMs: SERVED_SHELL_READ_LIMITS,
    refTimer: true,
  });
  try {
    let isWindows = getPlatform() === "windows";
    result = {
      file:
        touchesProtectedPath(input, "file") &&
        !(readOnlyAllowed && name === BASH_TOOL_NAME && (await isReadOnlyCommand(command)))
          ? "named"
          : "none",
      fileOrFolder: touchesProtectedPath(input, "file_or_folder") ? "named" : "none",
    };
    if (result.file !== "none" && result.fileOrFolder !== "none") return result;
    if (combinedAbortSignal.signal.aborted) return withUnresolvedDefaults(result, "unresolved");
    let promise = new Promise((resolve) => {
      combinedAbortSignal.signal.addEventListener("abort", () => resolve(CUT_SHORT), {
        once: true,
      });
    });
    if (name !== BASH_TOOL_NAME) return result;
    let words = await classifyCommandForSandbox(command, cwd);
    if (words === "unparsed") return result;
    let { files, dirs } = settingsLocationPaths();
    let protectedSettingsPaths = getProtectedSettingsPaths();
    let settingsPaths = [
      ...files,
      ...dirs.flatMap((dir) => SETTINGS_FILE_BASENAMES.map((base) => join(dir, base))),
      ...protectedSettingsPaths.paths,
    ];
    let configDirs = uniq([...dirs, ...getClaudeConfigDirs()]);
    let settingsPathSet = new Set(
      [...settingsPaths, ...configDirs].map((path) => normalizeCaseForComparison(path)),
    );
    let configNameSet = new Set(
      protectedSettingsPaths.globalConfigNames.map((globalConfigName) =>
        normalizeCaseForComparison(globalConfigName),
      ),
    );
    let winner = await Promise.race([
      Promise.all(
        uniq([...settingsPaths, ...configDirs]).map((path) => settingsFileIdentity(path, "followed")),
      ),
      promise,
    ]);
    if (winner === CUT_SHORT) return withUnresolvedDefaults(result, "unresolved");
    let settingsIdentities = new Set(winner.filter((identity) => identity !== undefined));
    let separator = isWindows ? /[\\/]/ : "/";
    let flattened = words.flatMap(({ word, directories, mayBeElsewhere }) => {
      if (word === "") return [];
      let expanded = expandTildeWithHome(word);
      let byName = containsAnyPlaceholder(word) || expanded.startsWith("~") || isUncOrDeviceSpelling(word);
      let root = parse(expanded).root;
      let firstSegment = expanded.slice(root.length).split(separator)[0] ?? "";
      let mapped = (byName ? [] : isAbsolute(expanded) ? [cwd] : directories).map((base) => ({
        requested: resolve(base, expanded),
        firstPartThere: resolve(base, root, firstSegment),
      }));
      let filtered = mapped.filter(
        ({ requested, firstPartThere }) =>
          !isNetworkOrSharedPath(requested) && !isNetworkOrSharedPath(firstPartThere),
      );
      return [
        {
          word,
          local: filtered,
          byName: byName || filtered.length < mapped.length || (mayBeElsewhere && !isAbsolute(expanded)),
        },
      ];
    });
    let winner_2 = await Promise.race([
      Promise.all(
        uniq(flattened.flatMap(({ local }) => local.map(({ firstPartThere }) => firstPartThere))).map(
          (path) =>
            getFsImplementation()
              .lstat(path)
              .then(
                () => [path, true],
                (error) => {
                  let errnoCode = getErrnoCode(error);
                  return [
                    path,
                    errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR" && errnoCode !== "ENAMETOOLONG",
                  ];
                },
              ),
        ),
      ),
      promise,
    ]);
    if (winner_2 === CUT_SHORT) return withUnresolvedDefaults(result, "unresolved");
    let existsByPath = new Map(winner_2);
    let visited = new Set();
    let piecesWalked = 0;
    for (let { word, local, byName } of flattened) {
      if (byName) {
        result = {
          file:
            result.file === "none" &&
            touchesProtectedPath(
              {
                command: word,
              },
              "file",
            )
              ? "named"
              : result.file,
          fileOrFolder:
            result.fileOrFolder === "none" &&
            touchesProtectedPath(
              {
                command: word,
              },
              "file_or_folder",
            )
              ? "named"
              : result.fileOrFolder,
        };
        if (result.file !== "none" && result.fileOrFolder !== "none") return result;
      }
      for (let { requested, firstPartThere } of local) {
        if (visited.has(requested)) continue;
        visited.add(requested);
        let spellings = [requested];
        let landing;
        if (existsByPath.get(firstPartThere) !== false) {
          piecesWalked++;
          if (piecesWalked > MAX_PATH_PIECES) return withUnresolvedDefaults(result, "too_many_pieces");
          let walked = await walkPermissionCheckPathsAsync(requested, combinedAbortSignal.signal);
          if (walked.unresolved || isNetworkOrSharedPath(walked.landing))
            return withUnresolvedDefaults(result, "unresolved");
          landing = walked.landing;
          spellings = uniq([...walked.spellings, walked.landing]);
        }
        if (
          spellings.some(
            (spelling) =>
              (landing !== undefined && isHostPersonOnlyPath(spelling, cwd)) ||
              settingsPathSet.has(normalizeCaseForComparison(spelling)) ||
              configNameSet.has(normalizeCaseForComparison(basename(spelling))),
          )
        )
          return withUnresolvedDefaults(result, "on_disk");
        let identity =
          landing === undefined
            ? undefined
            : await Promise.race([settingsFileIdentity(landing, "as_landed"), promise]);
        if (identity === CUT_SHORT) return withUnresolvedDefaults(result, "unresolved");
        if (identity !== undefined && settingsIdentities.has(identity))
          return withUnresolvedDefaults(result, "on_disk");
      }
    }
    return result;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === undefined)
      logError(
        Error("a served shell line's settings identity check threw; the line counts as naming one", {
          cause: error,
        }),
      );
    else
      logForDebugging(
        `A served shell line's settings identity check could not read a path (${errnoCode}); the line counts as naming a settings file`,
        {
          level: "error",
        },
      );
    return withUnresolvedDefaults(result, "error");
  } finally {
    combinedAbortSignal.cleanup();
  }
}
//@ chunk-tr0s0d0k.js:50947-51056 placement
function withUnresolvedDefaults(result, fallback) {
  return {
    file: result.file === "none" ? fallback : result.file,
    fileOrFolder: result.fileOrFolder === "none" ? fallback : result.fileOrFolder,
  };
}
//@ chunk-tr0s0d0k.js:51056-51092 placement
function isNetworkOrSharedPath(path) {
  return isNetworkOrDevicePath(path) || isUnderNetworkDirCached(path);
}
//@ chunk-tr0s0d0k.js:51092-51445 placement
async function settingsFileIdentity(path, mode) {
  if (isNetworkOrSharedPath(path)) return;
  try {
    let fsImplementation = getFsImplementation();
    if (mode === "followed") {
      let { identity } = await vetRepoSettingsPathAsync(fsImplementation, path, {
        fileIdentity: true,
      });
      return identity === undefined || isSentinelInode(identity.ino)
        ? undefined
        : `${identity.dev}:${identity.ino}`;
    }
    let stats = await fsImplementation.lstatBigint(path);
    return isSentinelInode(stats.ino) ? undefined : `${stats.dev}:${stats.ino}`;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (
      mode === "followed" ||
      errnoCode === "ENOENT" ||
      errnoCode === "ENOTDIR" ||
      errnoCode === "ENAMETOOLONG"
    )
      return;
    throw error;
  }
}
export { checkServedShellSettingsWrite };
