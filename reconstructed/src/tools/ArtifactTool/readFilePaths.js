/**
 * tools/ArtifactTool/readFilePaths.ts
 *
 * 2.1.316 新增。Artifact 读取文件路径校验。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zad29gky.js (12)
 * attribution: placement 12
 */
import { sep, join, normalize } from "path";
import { unlink } from "fs/promises";
import { getPlatform } from "../../utils/platform.js";
import { isReservedDeviceName } from "../../utils/windowsProfileFolders.js";
import { safeJsonQuote } from "../../services/artifacts/contentTypes.js";
import { readUntrustedArray, UNREADABLE_ARRAY } from "../../utils/untrustedArray.js";
import { validateReadPath } from "../../services/artifacts/publishPaths.js";
import { parseArtifactUrl } from "./constants.js";
import { getCwd } from "../../utils/cwd.js";
import { expandPath } from "../../utils/path.js";
import {
  isScratchpadEnabled,
  getScratchpadDir,
  normalizeCaseForComparison,
  isScratchpadPath,
} from "../../utils/permissions/filesystem.js";
import { MAX_SEGMENT_WITH_SLASH } from "../../services/artifacts/artifactUrl.js";
import { retryFsOp } from "../../utils/atomicPublishWrite.js";
import { getErrnoCode } from "../../utils/errors.js";
import { ATOMIC_WRITE_ERRNOS } from "../../utils/plugins/safeCopy.js";

//@ chunk-zad29gky.js:693-1114 placement
/**
 * 检查路径在 Windows 上是否不能作文件名（保留设备名、结尾点或空格、< > " | *），以及 Windows/WSL 上的 8.3 短名别名（NAME~1）。
 */
function windowsPathProblem(key) {
  let parts = key.split("/");
  let platform = getPlatform();
  if (
    platform === "windows" &&
    parts.some((e) => /[<>"|*]/.test(e) || isReservedDeviceName(e) || /[. ]$/.test(e))
  )
    return `path ${safeJsonQuote(key)} cannot be a file name on Windows (reserved device name, trailing dot or space, or one of < > " | *)`;
  if ((platform === "windows" || platform === "wsl") && parts.some((e) => /~\d/.test(e)))
    return `path ${safeJsonQuote(key)} carries a NAME~1 short-name alias, which a Windows filesystem resolves to a differently named entry`;
  return;
}
//@ chunk-zad29gky.js:1114-1323 placement
/**
 * 读取 read_file 输入中的 path、paths（只保留字符串）与 out_dir。
 */
function readFilePathArgs(n) {
  let t = n;
  let r = (i) => {
    let o = t[i];
    return typeof o === "string" ? o : undefined;
  };
  let untrustedArray = readUntrustedArray(t.paths);
  let paths =
    untrustedArray === undefined
      ? undefined
      : untrustedArray === UNREADABLE_ARRAY
        ? []
        : untrustedArray.filter((untrusted) => typeof untrusted === "string");
  return {
    path: r("path"),
    paths,
    outDir: r("out_dir"),
  };
}
//@ chunk-zad29gky.js:1323-2368 placement
function resolveReadFileOutput(n, { outDirJudged: t = false } = {}) {
  let { path, outDir } = readFilePathArgs(n);
  if (path === undefined)
    return {
      reason: "read_file requires `path` \u2014 a published path from a list_files result",
    };
  let s = validateReadPath(path);
  if ("errMsg" in s)
    return {
      reason: s.errMsg,
    };
  let parts = s.key.split("/");
  let o = windowsPathProblem(s.key);
  if (o !== undefined)
    return {
      reason: o,
    };
  let platform = getPlatform();
  let a = platform === "windows" || platform === "wsl";
  let l;
  let f = false;
  try {
    if (outDir === undefined || outDir === "") {
      let { url } = n;
      let c = typeof url === "string" ? parseArtifactUrl(url) : null;
      let p = c !== null ? scratchpadArtifactFilePath(c.slug) : null;
      f = p !== null;
      l = p ?? getCwd();
    } else l = expandPath(outDir);
  } catch {
    return {
      reason: "out_dir cannot be resolved to a local directory",
    };
  }
  if (!t && platform === "windows" && l.split(sep).some((u) => u !== "" && /[. ]$/.test(u)))
    return {
      reason: `${outDir === undefined || outDir === "" ? "the default save directory" : `out_dir ${safeJsonQuote(outDir)}`} has a name ending in a dot or space, which Windows would save under a different name`,
    };
  if (!t && a && outDir !== undefined && outDir.split(/[\\/]/).some((u) => /~\d/.test(u)))
    return {
      reason: `out_dir ${safeJsonQuote(outDir)} names a directory by a NAME~1 short-name alias, which a Windows filesystem resolves to a differently named directory`,
    };
  return {
    dest: join(l, ...parts),
    base: l,
    ...(f && {
      defaultDir: true,
    }),
  };
}
//@ chunk-zad29gky.js:2368-2386 placement
var weakMap = new WeakMap();
//@ chunk-zad29gky.js:2386-2739 placement
/**
 * 带缓存的 read_file 路径校验：以 paths 对象为键，url、out_dir、是否已判定、cwd 与草稿目录组成的串一致时复用上次结果。
 */
function validateReadFilePathsCached(n, t = {}) {
  let r = n;
  let { paths, url, out_dir: outDir } = r;
  let o = typeof paths === "object" && paths !== null ? paths : undefined;
  let joined = [
    typeof url === "string" ? url : "",
    typeof outDir === "string" ? outDir : "",
    t.outDirJudged === true ? "judged" : "",
    getCwd(),
    (isScratchpadEnabled() ? getScratchpadDir() : null) ?? "",
  ].join("\x00");
  let a = o === undefined ? undefined : weakMap.get(o);
  if (a !== undefined && a.key === joined) return a.value;
  let l = validateReadFilePaths(n, t);
  if (o !== undefined)
    weakMap.set(o, {
      key: joined,
      value: l,
    });
  return l;
}
//@ chunk-zad29gky.js:2739-3552 placement
function validateReadFilePaths(n, t) {
  let { paths } = readFilePathArgs(n);
  if (paths === undefined || paths.length === 0)
    return {
      reason: "read_file requires `path`, or `paths` naming at least one published path",
    };
  if (paths.length > MAX_SEGMENT_WITH_SLASH)
    return {
      reason: `\`paths\` names ${paths.length} paths; at most ${MAX_SEGMENT_WITH_SLASH} can be read in one call`,
    };
  let e = {
    ...n,
  };
  delete e.paths;
  let s;
  let i = [];
  let o = new Map();
  for (let path of paths) {
    let readFileOutput = resolveReadFileOutput(
      {
        ...e,
        path,
      },
      t,
    );
    if ("reason" in readFileOutput) return readFileOutput;
    let l = validateReadPath(path);
    let f = "key" in l ? l.key : path;
    let u = normalizeCaseForComparison(
      normalize(readFileOutput.dest).normalize("NFC").toUpperCase().toLowerCase(),
    );
    let c = o.get(u);
    if (c !== undefined)
      return {
        reason:
          c === f
            ? `\`paths\` names ${safeJsonQuote(path)} more than once`
            : `\`paths\` names ${safeJsonQuote(c)} and ${safeJsonQuote(path)}, which could save to the same file on a case-insensitive volume; read one of them on its own`,
      };
    o.set(u, f);
    s ??= {
      base: readFileOutput.base,
      ...(readFileOutput.defaultDir && {
        defaultDir: readFileOutput.defaultDir,
      }),
    };
    i.push({
      path: f,
      dest: readFileOutput.dest,
    });
  }
  return {
    ...s,
    files: i,
  };
}
//@ chunk-zad29gky.js:3552-3577 placement
var ARTIFACT_FILES = "artifact-files";
//@ chunk-zad29gky.js:3577-3645 placement
/**
 * 拼出 scratchpad 中制品相关文件的路径（未启用时为 null）。
 */
function scratchpadArtifactFilePath(slug) {
  let t = isScratchpadEnabled() ? getScratchpadDir() : null;
  return t === null ? null : join(t, ARTIFACT_FILES, slug);
}
//@ chunk-zad29gky.js:3645-3726 placement
/**
 * 判断路径组非空且全部位于 scratchpad 内。
 */
function isAllScratchpadPaths(n) {
  return n.length > 0 && n.every((t) => t.length > 0 && t.every((r) => isScratchpadPath(r)));
}
//@ chunk-zad29gky.js:3726-3809 placement
/**
 * 判断路径是否位于 scratchpad 目录下（忽略大小写）。
 */
function isWithinScratchpad(n) {
  let t = isScratchpadEnabled() ? getScratchpadDir() : null;
  return (
    t !== null && normalizeCaseForComparison(normalize(n)).startsWith(normalizeCaseForComparison(t) + sep)
  );
}
//@ chunk-zad29gky.js:3809-4028 placement
class PartialKeptError extends Error {
  partial;
  renameError;
  removedEarlier;
  constructor(partial, renameError, removedEarlier) {
    super("the staged file could not be moved into place");
    this.partial = partial;
    this.renameError = renameError;
    this.removedEarlier = removedEarlier;
    this.name = "PartialKeptError";
  }
}
//@ chunk-zad29gky.js:4028-4252 placement
/**
 * 重命名文件，目标已存在导致失败时先删除目标再重试；第二次失败抛出"已部分保留"错误。
 */
async function renameReplacing(tempSiblingPath, ioPath, r) {
  let e = true;
  try {
    await retryFsOp(tempSiblingPath, ioPath, r);
    return;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === undefined || !ATOMIC_WRITE_ERRNOS.has(errnoCode)) throw error;
    await unlink(ioPath).catch((error_2) => {
      if (getErrnoCode(error_2) !== "ENOENT") throw error;
      e = false;
    });
  }
  try {
    await retryFsOp(tempSiblingPath, ioPath, r);
  } catch (error) {
    throw new PartialKeptError(tempSiblingPath, error, e);
  }
}
export {
  isAllScratchpadPaths,
  renameReplacing,
  PartialKeptError,
  resolveReadFileOutput,
  scratchpadArtifactFilePath,
  isWithinScratchpad,
  readFilePathArgs,
  validateReadFilePathsCached,
  ARTIFACT_FILES,
};
