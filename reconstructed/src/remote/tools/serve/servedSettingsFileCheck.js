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
import {
  join,
  join as join_2,
  join as join_3,
  parse,
  isAbsolute,
  resolve,
  basename,
  basename as basename_2,
} from "path";
import { createCombinedAbortSignal } from "../../../utils/combinedAbortSignal.js";
import { SERVED_SHELL_READ_LIMITS, xe, vs } from "./servedShellReading.js";
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
import { Lu, isUnderNetworkDirCached } from "../../../utils/networkPaths.js";
import { containsAnyPlaceholder } from "../../../utils/bash/ast.js";
import { CL, lks } from "../../../utils/fsJunctions.js";
import {
  getFsImplementation,
  walkPermissionCheckPathsAsync,
  vetRepoSettingsPathAsync,
} from "../../../utils/fsOperations.js";
import { getErrnoCode } from "../../../utils/errors.js";
import { logError } from "../../../utils/log.js";
import { logForDebugging } from "../../../utils/debug.js";
import { isSentinelInode } from "../../../utils/slowOperations.js";

/**
 * 判断云会话调用的 shell 命令是否会写到本机 Claude 设置文件（解析重定向/参数，比对设置文件身份）。
 */
//@ chunk-tr0s0d0k.js:48209-50947 placement
async function checkServedShellSettingsWrite(e, n, o, r, s = !1) {
  let command = n.command;
  if (typeof command !== "string") return { file: "error", fileOrFolder: "error" };
  let u = { file: "none", fileOrFolder: "none" },
    p = createCombinedAbortSignal(r, { timeoutMs: SERVED_SHELL_READ_LIMITS, refTimer: !0 });
  try {
    let h = getPlatform() === "windows";
    if (
      ((u = {
        file:
          touchesProtectedPath(n, "file") &&
          !(s && e === BASH_TOOL_NAME && (await isReadOnlyCommand(command)))
            ? "named"
            : "none",
        fileOrFolder: touchesProtectedPath(n, "file_or_folder") ? "named" : "none",
      }),
      u.file !== "none" && u.fileOrFolder !== "none")
    )
      return u;
    if (p.signal.aborted) return withUnresolvedDefaults(u, "unresolved");
    let promise = new Promise((x) => {
      p.signal.addEventListener("abort", () => x(xe), { once: !0 });
    });
    if (e !== BASH_TOOL_NAME) return u;
    let S = await classifyCommandForSandbox(command, o);
    if (S === "unparsed") return u;
    let { files: files, dirs: dirs } = settingsLocationPaths(),
      L = getProtectedSettingsPaths(),
      V = [...files, ...dirs.flatMap((x) => SETTINGS_FILE_BASENAMES.map((re) => join_3(x, re))), ...L.paths],
      A = uniq([...dirs, ...getClaudeConfigDirs()]),
      O = new Set([...V, ...A].map((x) => normalizeCaseForComparison(x))),
      X = new Set(
        L.globalConfigNames.map((globalConfigName) => normalizeCaseForComparison(globalConfigName)),
      ),
      winner = await Promise.race([
        Promise.all(uniq([...V, ...A]).map((x) => settingsFileIdentity(x, "followed"))),
        promise,
      ]);
    if (winner === xe) return withUnresolvedDefaults(u, "unresolved");
    let K = new Set(winner.filter((x) => x !== void 0)),
      j = h ? /[\\/]/ : "/",
      flattened = S.flatMap(({ word: word, directories: directories, mayBeElsewhere: mayBeElsewhere }) => {
        if (word === "") return [];
        let Y = Lu(word),
          ie = containsAnyPlaceholder(word) || Y.startsWith("~") || CL(word),
          root = parse(Y).root,
          E = Y.slice(root.length).split(j)[0] ?? "",
          mapped = (ie ? [] : isAbsolute(Y) ? [o] : directories).map((T) => ({
            requested: resolve(T, Y),
            firstPartThere: resolve(T, root, E),
          })),
          filtered = mapped.filter(
            ({ requested: requested, firstPartThere: firstPartThere }) =>
              !De(requested) && !De(firstPartThere),
          );
        return [
          {
            word: word,
            local: filtered,
            byName: ie || filtered.length < mapped.length || (mayBeElsewhere && !isAbsolute(Y)),
          },
        ];
      }),
      winner_2 = await Promise.race([
        Promise.all(
          uniq(
            flattened.flatMap(({ local: local }) =>
              local.map(({ firstPartThere: firstPartThere }) => firstPartThere),
            ),
          ).map((x) =>
            getFsImplementation()
              .lstat(x)
              .then(
                () => [x, !0],
                (re) => {
                  let U = getErrnoCode(re);
                  return [x, U !== "ENOENT" && U !== "ENOTDIR" && U !== "ENAMETOOLONG"];
                },
              ),
          ),
        ),
        promise,
      ]);
    if (winner_2 === xe) return withUnresolvedDefaults(u, "unresolved");
    let Z = new Map(winner_2),
      ce = new Set(),
      ue = 0;
    for (let { word: word, local: local, byName: byName } of flattened) {
      if (byName) {
        if (
          ((u = {
            file: u.file === "none" && touchesProtectedPath({ command: word }, "file") ? "named" : u.file,
            fileOrFolder:
              u.fileOrFolder === "none" && touchesProtectedPath({ command: word }, "file_or_folder")
                ? "named"
                : u.fileOrFolder,
          }),
          u.file !== "none" && u.fileOrFolder !== "none")
        )
          return u;
      }
      for (let { requested: requested, firstPartThere: firstPartThere } of local) {
        if (ce.has(requested)) continue;
        ce.add(requested);
        let y = [requested],
          E;
        if (Z.get(firstPartThere) !== !1) {
          if ((ue++, ue > vs)) return withUnresolvedDefaults(u, "too_many_pieces");
          let w = await walkPermissionCheckPathsAsync(requested, p.signal);
          if (w.unresolved || De(w.landing)) return withUnresolvedDefaults(u, "unresolved");
          ((E = w.landing), (y = uniq([...w.spellings, w.landing])));
        }
        if (
          y.some(
            (w) =>
              (E !== void 0 && isHostPersonOnlyPath(w, o)) ||
              O.has(normalizeCaseForComparison(w)) ||
              X.has(normalizeCaseForComparison(basename_2(w))),
          )
        )
          return withUnresolvedDefaults(u, "on_disk");
        let P = E === void 0 ? void 0 : await Promise.race([settingsFileIdentity(E, "as_landed"), promise]);
        if (P === xe) return withUnresolvedDefaults(u, "unresolved");
        if (P !== void 0 && K.has(P)) return withUnresolvedDefaults(u, "on_disk");
      }
    }
    return u;
  } catch (error) {
    let _ = getErrnoCode(error);
    if (_ === void 0)
      logError(
        Error("a served shell line's settings identity check threw; the line counts as naming one", {
          cause: error,
        }),
      );
    else
      logForDebugging(
        `A served shell line's settings identity check could not read a path (${_}); the line counts as naming a settings file`,
        { level: "error" },
      );
    return withUnresolvedDefaults(u, "error");
  } finally {
    p.cleanup();
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
function De(e) {
  return lks(e) || isUnderNetworkDirCached(e);
}
//@ chunk-tr0s0d0k.js:51092-51445 placement
async function settingsFileIdentity(e, n) {
  if (De(e)) return;
  try {
    let o = getFsImplementation();
    if (n === "followed") {
      let { identity: identity } = await vetRepoSettingsPathAsync(o, e, { fileIdentity: !0 });
      return identity === void 0 || isSentinelInode(identity.ino)
        ? void 0
        : `${identity.dev}:${identity.ino}`;
    }
    let lstatBigint = await o.lstatBigint(e);
    return isSentinelInode(lstatBigint.ino) ? void 0 : `${lstatBigint.dev}:${lstatBigint.ino}`;
  } catch (error) {
    let r = getErrnoCode(error);
    if (n === "followed" || r === "ENOENT" || r === "ENOTDIR" || r === "ENAMETOOLONG") return;
    throw error;
  }
}

export { checkServedShellSettingsWrite };
