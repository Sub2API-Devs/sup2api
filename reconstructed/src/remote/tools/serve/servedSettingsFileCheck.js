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
async function checkServedShellSettingsWrite(name, n, cwd, stopSignal, s = false) {
  let command = n.command;
  if (typeof command !== "string")
    return {
      file: "error",
      fileOrFolder: "error",
    };
  let u = {
    file: "none",
    fileOrFolder: "none",
  };
  let combinedAbortSignal = createCombinedAbortSignal(stopSignal, {
    timeoutMs: SERVED_SHELL_READ_LIMITS,
    refTimer: true,
  });
  try {
    let h = getPlatform() === "windows";
    u = {
      file:
        touchesProtectedPath(n, "file") &&
        !(s && name === BASH_TOOL_NAME && (await isReadOnlyCommand(command)))
          ? "named"
          : "none",
      fileOrFolder: touchesProtectedPath(n, "file_or_folder") ? "named" : "none",
    };
    if (u.file !== "none" && u.fileOrFolder !== "none") return u;
    if (combinedAbortSignal.signal.aborted) return withUnresolvedDefaults(u, "unresolved");
    let promise = new Promise((resolve) => {
      combinedAbortSignal.signal.addEventListener("abort", () => resolve(CUT_SHORT), {
        once: true,
      });
    });
    if (name !== BASH_TOOL_NAME) return u;
    let S = await classifyCommandForSandbox(command, cwd);
    if (S === "unparsed") return u;
    let { files, dirs } = settingsLocationPaths();
    let protectedSettingsPaths = getProtectedSettingsPaths();
    let V = [
      ...files,
      ...dirs.flatMap((dir) => SETTINGS_FILE_BASENAMES.map((re) => join(dir, re))),
      ...protectedSettingsPaths.paths,
    ];
    let A = uniq([...dirs, ...getClaudeConfigDirs()]);
    let O = new Set([...V, ...A].map((x) => normalizeCaseForComparison(x)));
    let X = new Set(
      protectedSettingsPaths.globalConfigNames.map((globalConfigName) =>
        normalizeCaseForComparison(globalConfigName),
      ),
    );
    let winner = await Promise.race([
      Promise.all(uniq([...V, ...A]).map((x) => settingsFileIdentity(x, "followed"))),
      promise,
    ]);
    if (winner === CUT_SHORT) return withUnresolvedDefaults(u, "unresolved");
    let K = new Set(winner.filter((x) => x !== undefined));
    let j = h ? /[\\/]/ : "/";
    let flattened = S.flatMap(({ word, directories, mayBeElsewhere }) => {
      if (word === "") return [];
      let Y = expandTildeWithHome(word);
      let ie = containsAnyPlaceholder(word) || Y.startsWith("~") || isUncOrDeviceSpelling(word);
      let root = parse(Y).root;
      let E = Y.slice(root.length).split(j)[0] ?? "";
      let mapped = (ie ? [] : isAbsolute(Y) ? [cwd] : directories).map((T) => ({
        requested: resolve(T, Y),
        firstPartThere: resolve(T, root, E),
      }));
      let filtered = mapped.filter(
        ({ requested, firstPartThere }) =>
          !isNetworkOrSharedPath(requested) && !isNetworkOrSharedPath(firstPartThere),
      );
      return [
        {
          word,
          local: filtered,
          byName: ie || filtered.length < mapped.length || (mayBeElsewhere && !isAbsolute(Y)),
        },
      ];
    });
    let winner_2 = await Promise.race([
      Promise.all(
        uniq(flattened.flatMap(({ local }) => local.map(({ firstPartThere }) => firstPartThere))).map((x) =>
          getFsImplementation()
            .lstat(x)
            .then(
              () => [x, true],
              (error) => {
                let errnoCode = getErrnoCode(error);
                return [x, errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR" && errnoCode !== "ENAMETOOLONG"];
              },
            ),
        ),
      ),
      promise,
    ]);
    if (winner_2 === CUT_SHORT) return withUnresolvedDefaults(u, "unresolved");
    let Z = new Map(winner_2);
    let ce = new Set();
    let ue = 0;
    for (let { word, local, byName } of flattened) {
      if (byName) {
        u = {
          file:
            u.file === "none" &&
            touchesProtectedPath(
              {
                command: word,
              },
              "file",
            )
              ? "named"
              : u.file,
          fileOrFolder:
            u.fileOrFolder === "none" &&
            touchesProtectedPath(
              {
                command: word,
              },
              "file_or_folder",
            )
              ? "named"
              : u.fileOrFolder,
        };
        if (u.file !== "none" && u.fileOrFolder !== "none") return u;
      }
      for (let { requested, firstPartThere } of local) {
        if (ce.has(requested)) continue;
        ce.add(requested);
        let y = [requested];
        let E;
        if (Z.get(firstPartThere) !== false) {
          ue++;
          if (ue > MAX_PATH_PIECES) return withUnresolvedDefaults(u, "too_many_pieces");
          let w = await walkPermissionCheckPathsAsync(requested, combinedAbortSignal.signal);
          if (w.unresolved || isNetworkOrSharedPath(w.landing))
            return withUnresolvedDefaults(u, "unresolved");
          E = w.landing;
          y = uniq([...w.spellings, w.landing]);
        }
        if (
          y.some(
            (w) =>
              (E !== undefined && isHostPersonOnlyPath(w, cwd)) ||
              O.has(normalizeCaseForComparison(w)) ||
              X.has(normalizeCaseForComparison(basename(w))),
          )
        )
          return withUnresolvedDefaults(u, "on_disk");
        let P =
          E === undefined ? undefined : await Promise.race([settingsFileIdentity(E, "as_landed"), promise]);
        if (P === CUT_SHORT) return withUnresolvedDefaults(u, "unresolved");
        if (P !== undefined && K.has(P)) return withUnresolvedDefaults(u, "on_disk");
      }
    }
    return u;
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
    return withUnresolvedDefaults(u, "error");
  } finally {
    combinedAbortSignal.cleanup();
  }
}
//@ chunk-tr0s0d0k.js:50947-51056 placement
function withUnresolvedDefaults(e, n) {
  return {
    file: e.file === "none" ? n : e.file,
    fileOrFolder: e.fileOrFolder === "none" ? n : e.fileOrFolder,
  };
}
//@ chunk-tr0s0d0k.js:51056-51092 placement
function isNetworkOrSharedPath(e) {
  return isNetworkOrDevicePath(e) || isUnderNetworkDirCached(e);
}
//@ chunk-tr0s0d0k.js:51092-51445 placement
async function settingsFileIdentity(e, n) {
  if (isNetworkOrSharedPath(e)) return;
  try {
    let fsImplementation = getFsImplementation();
    if (n === "followed") {
      let { identity } = await vetRepoSettingsPathAsync(fsImplementation, e, {
        fileIdentity: true,
      });
      return identity === undefined || isSentinelInode(identity.ino)
        ? undefined
        : `${identity.dev}:${identity.ino}`;
    }
    let r = await fsImplementation.lstatBigint(e);
    return isSentinelInode(r.ino) ? undefined : `${r.dev}:${r.ino}`;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (n === "followed" || errnoCode === "ENOENT" || errnoCode === "ENOTDIR" || errnoCode === "ENAMETOOLONG")
      return;
    throw error;
  }
}
export { checkServedShellSettingsWrite };
