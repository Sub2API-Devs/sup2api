/**
 * tools/ArtifactTool/readFilePaths.ts
 *
 * 2.1.316 新增。Artifact 读取文件路径校验。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1k5m5eth.js (12)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1k5m5eth.js:693-1114 placement
/**
 * 检查路径在 Windows 上是否不能作文件名（保留设备名、结尾点或空格、< > " | *），以及 Windows/WSL 上的 8.3 短名别名（NAME~1）。
 */
function windowsPathProblem(key) {
  let parts = key.split("/");
  let pathList = getPlatform();
  if (
    pathList === "windows" &&
    parts.some((segment) => /[<>"|*]/.test(segment) || isReservedDeviceName(segment) || /[. ]$/.test(segment))
  )
    return `path ${safeJsonQuote(key)} cannot be a file name on Windows (reserved device name, trailing dot or space, or one of < > " | *)`;
  if ((pathList === "windows" || pathList === "wsl") && parts.some((segment) => /~\d/.test(segment)))
    return `path ${safeJsonQuote(key)} carries a NAME~1 short-name alias, which a Windows filesystem resolves to a differently named entry`;
  return;
}
//@ chunk-1k5m5eth.js:1114-1324 placement
/**
 * 读取 read_file 输入中的 path、paths（只保留字符串）与 out_dir。
 */
function readFilePathArgs(input) {
  let record = input;
  let readField = (key) => {
    let value = record[key];
    return typeof value === "string" ? value : undefined;
  };
  let untrustedArray = readUntrustedArray(record.paths);
  let paths =
    untrustedArray === undefined
      ? undefined
      : untrustedArray === UNREADABLE_ARRAY
        ? []
        : untrustedArray.filter((untrusted) => typeof untrusted === "string");
  return {
    path: readField("path"),
    paths,
    outDir: readField("out_dir"),
  };
}
//@ chunk-1k5m5eth.js:1324-2370 placement
function resolveReadFileOutput(input, { outDirJudged: options = false } = {}) {
  let { path, outDir } = readFilePathArgs(input);
  if (path === undefined)
    return {
      reason: "read_file requires `path` \u2014 a published path from a list_files result",
    };
  let checked = validateReadPath(path);
  if ("errMsg" in checked)
    return {
      reason: checked.errMsg,
    };
  let parts = checked.key.split("/");
  let pathProblem = windowsPathProblem(checked.key);
  if (pathProblem !== undefined)
    return {
      reason: pathProblem,
    };
  let platform = getPlatform();
  let isWindowsLike = platform === "windows" || platform === "wsl";
  let dir;
  let isDefaultDir = false;
  try {
    if (outDir === undefined || outDir === "") {
      let { url } = input;
      let artifactUrl = typeof url === "string" ? parseArtifactUrl(url) : null;
      let scratchPath = artifactUrl !== null ? scratchpadArtifactFilePath(artifactUrl.slug) : null;
      isDefaultDir = scratchPath !== null;
      dir = scratchPath ?? getCwd();
    } else dir = expandPath(outDir);
  } catch {
    return {
      reason: "out_dir cannot be resolved to a local directory",
    };
  }
  if (
    !options &&
    platform === "windows" &&
    dir.split(sep).some((segment) => segment !== "" && /[. ]$/.test(segment))
  )
    return {
      reason: `${outDir === undefined || outDir === "" ? "the default save directory" : `out_dir ${safeJsonQuote(outDir)}`} has a name ending in a dot or space, which Windows would save under a different name`,
    };
  if (
    !options &&
    isWindowsLike &&
    outDir !== undefined &&
    outDir.split(/[\\/]/).some((options) => /~\d/.test(options))
  )
    return {
      reason: `out_dir ${safeJsonQuote(outDir)} names a directory by a NAME~1 short-name alias, which a Windows filesystem resolves to a differently named directory`,
    };
  return {
    dest: join(dir, ...parts),
    base: dir,
    ...(isDefaultDir && {
      defaultDir: true,
    }),
  };
}
//@ chunk-1k5m5eth.js:2370-2388 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1k5m5eth.js:2370", () => {
  weakMap = new WeakMap();
});
//@ chunk-1k5m5eth.js:2388-2741 placement
/**
 * 带缓存的 read_file 路径校验：以 paths 对象为键，url、out_dir、是否已判定、cwd 与草稿目录组成的串一致时复用上次结果。
 */
function validateReadFilePathsCached(input, options = {}) {
  let record = input;
  let { paths, url, out_dir: outDir } = record;
  let rawPaths = typeof paths === "object" && paths !== null ? paths : undefined;
  let joined = [
    typeof url === "string" ? url : "",
    typeof outDir === "string" ? outDir : "",
    options.outDirJudged === true ? "judged" : "",
    getCwd(),
    (isScratchpadEnabled() ? getScratchpadDir() : null) ?? "",
  ].join("\x00");
  let key = rawPaths === undefined ? undefined : weakMap.get(rawPaths);
  if (key !== undefined && key.key === joined) return key.value;
  let cached = validateReadFilePaths(input, options);
  if (rawPaths !== undefined)
    weakMap.set(rawPaths, {
      key: joined,
      value: cached,
    });
  return cached;
}
//@ chunk-1k5m5eth.js:2741-3555 placement
function validateReadFilePaths(input, options) {
  let { paths } = readFilePathArgs(input);
  if (paths === undefined || paths.length === 0)
    return {
      reason: "read_file requires `path`, or `paths` naming at least one published path",
    };
  if (paths.length > MAX_SEGMENT_WITH_SLASH)
    return {
      reason: `\`paths\` names ${paths.length} paths; at most ${MAX_SEGMENT_WITH_SLASH} can be read in one call`,
    };
  let singleInput = {
    ...input,
  };
  delete singleInput.paths;
  let common;
  let files = [];
  let destByKey = new Map();
  for (let path of paths) {
    let readFileOutput = resolveReadFileOutput(
      {
        ...singleInput,
        path,
      },
      options,
    );
    if ("reason" in readFileOutput) return readFileOutput;
    let checked = validateReadPath(path);
    let key = "key" in checked ? checked.key : path;
    let normalizedDest = normalizeCaseForComparison(
      normalize(readFileOutput.dest).normalize("NFC").toUpperCase().toLowerCase(),
    );
    let existingKey = destByKey.get(normalizedDest);
    if (existingKey !== undefined)
      return {
        reason:
          existingKey === key
            ? `\`paths\` names ${safeJsonQuote(path)} more than once`
            : `\`paths\` names ${safeJsonQuote(existingKey)} and ${safeJsonQuote(path)}, which could save to the same file on a case-insensitive volume; read one of them on its own`,
      };
    destByKey.set(normalizedDest, key);
    common ??= {
      base: readFileOutput.base,
      ...(readFileOutput.defaultDir && {
        defaultDir: readFileOutput.defaultDir,
      }),
    };
    files.push({
      path: key,
      dest: readFileOutput.dest,
    });
  }
  return {
    ...common,
    files,
  };
}
//@ chunk-1k5m5eth.js:3555-3580 placement
var ARTIFACT_FILES = "artifact-files";
//@ chunk-1k5m5eth.js:3580-3648 placement
/**
 * 拼出 scratchpad 中制品相关文件的路径（未启用时为 null）。
 */
function scratchpadArtifactFilePath(slug) {
  let scratchpadDir = isScratchpadEnabled() ? getScratchpadDir() : null;
  return scratchpadDir === null ? null : join(scratchpadDir, ARTIFACT_FILES, slug);
}
//@ chunk-1k5m5eth.js:3648-3729 placement
/**
 * 判断路径组非空且全部位于 scratchpad 内。
 */
function isAllScratchpadPaths(spellings) {
  return (
    spellings.length > 0 &&
    spellings.every(
      (spellingList) =>
        spellingList.length > 0 && spellingList.every((spelling) => isScratchpadPath(spelling)),
    )
  );
}
//@ chunk-1k5m5eth.js:3729-3812 placement
/**
 * 判断路径是否位于 scratchpad 目录下（忽略大小写）。
 */
function isWithinScratchpad(path) {
  let scratchpadDir = isScratchpadEnabled() ? getScratchpadDir() : null;
  return (
    scratchpadDir !== null &&
    normalizeCaseForComparison(normalize(path)).startsWith(normalizeCaseForComparison(scratchpadDir) + sep)
  );
}
//@ chunk-1k5m5eth.js:3812-4030 placement
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
//@ chunk-1k5m5eth.js:4030-4253 placement
/**
 * 重命名文件，目标已存在导致失败时先删除目标再重试；第二次失败抛出"已部分保留"错误。
 */
async function renameReplacing(tempSiblingPath, targetPath, rename) {
  let removedOriginal = true;
  try {
    await retryFsOp(tempSiblingPath, targetPath, rename);
    return;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === undefined || !ATOMIC_WRITE_ERRNOS.has(errnoCode)) throw error;
    await unlink(targetPath).catch((error_2) => {
      if (getErrnoCode(error_2) !== "ENOENT") throw error;
      removedOriginal = false;
    });
  }
  try {
    await retryFsOp(tempSiblingPath, targetPath, rename);
  } catch (error) {
    throw new PartialKeptError(tempSiblingPath, error, removedOriginal);
  }
}
export {
  isAllScratchpadPaths,
  resolveReadFileOutput,
  renameReplacing,
  PartialKeptError,
  isWithinScratchpad,
  readFilePathArgs,
  validateReadFilePathsCached,
  scratchpadArtifactFilePath,
  ARTIFACT_FILES,
};
