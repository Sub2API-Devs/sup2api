/**
 * tools/REPLTool/spillRead.ts
 *
 * 安全读回 shell 溢出文件：校验路径在工具结果目录内、单链普通文件，再按预算读入并截断（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (8)
 * attribution: placement 8
 */
import { basename, relative, join, sep, isAbsolute } from "path";
import { realpath, lstat } from "fs/promises";
import { formatFileSize } from "../../utils/format.js";
import { MAX_PERSISTED_OUTPUT_BYTES } from "../../utils/task/diskOutput.js";
import { stringField, toLowerCaseChars } from "./shellResult.js";
import { logForDebugging } from "../../utils/debug.js";
import { getMaxOutputLength } from "../../utils/shell/outputLimits.js";
import { extractClaudeCodeHints_2 } from "../../utils/claudeCodeHints.js";
import { openNoFollow_2, verifyOpenedPath, hasInode } from "../../utils/fsSafety/hardenedRead.js";
import { getPlatform } from "../../utils/platform.js";

//@ chunk-n51jggtb.js:27138-27212 placement
/**
 * 溢出文件读取的大小上限与“bash 输出不可用”前缀常量。
 */
var MAX_READ_BACK_BYTES = 1048576;
var MAX_PERSISTED_OUTPUT_LABEL = formatFileSize(MAX_PERSISTED_OUTPUT_BYTES);
var TRAILING_BYTES_ALLOWANCE = 4;
var UNAVAILABLE_OUTPUT_PREFIX = "<bash output unavailable: output file ";
//@ chunk-n51jggtb.js:27212-27261 placement
/**
 * 判断值是否是达到溢出下限的字节数。
 */
function isOutputOverCap(persistedOutputSize) {
  return typeof persistedOutputSize === "number" && persistedOutputSize >= MAX_PERSISTED_OUTPUT_BYTES;
}
//@ chunk-n51jggtb.js:27995-29289 placement
/**
 * 把持久化输出文件读回内存：校验是工具结果目录里的普通单链文件，再按预算读取并截断。
 */
async function inlinePersistedOutput(result, paths, options) {
  if (result === null || typeof result !== "object") return result;
  let input = result;
  let outputPath = stringField(input, "persistedOutputPath");
  if (!outputPath) return result;
  try {
    let opened = await openPersistedOutput(outputPath, paths);
    if ("refused" in opened) {
      logForDebugging(`saved shell output not read back: ${opened.refused}`, {
        level: "warn",
      });
      return {
        ...input,
        stdoutTruncated: true,
        spillFileRefused: true,
      };
    }
    let handle = opened.handle;
    try {
      let expectedSize =
        typeof input.persistedOutputSize === "number" ? input.persistedOutputSize : opened.size;
      let ownBytes =
        options?.ownBytes === undefined ? undefined : Math.min(options.ownBytes, MAX_PERSISTED_OUTPUT_BYTES);
      if (options !== undefined && ownBytes !== undefined && opened.size !== ownBytes)
        options.facts.savedFileDiffers = true;
      let readLimit =
        options?.readWhole === true && ownBytes !== undefined && opened.size === ownBytes
          ? Math.max(MAX_READ_BACK_BYTES, ownBytes)
          : MAX_READ_BACK_BYTES;
      let buffer = Buffer.allocUnsafe(readLimit);
      let totalRead = 0;
      while (totalRead < readLimit) {
        let { bytesRead } = await handle.read(buffer, totalRead, readLimit - totalRead, totalRead);
        if (bytesRead === 0) break;
        totalRead += bytesRead;
      }
      let min = Math.min(totalRead, MAX_READ_BACK_BYTES);
      let str = buffer.toString("utf8", 0, min);
      let truncated = expectedSize > min;
      if (truncated) {
        let index = str.lastIndexOf(`
`);
        if (index > 0) str = str.slice(0, index + 1);
      }
      let inlineLength = buffer.toString("utf8", 0, Math.min(getMaxOutputLength(), min)).length;
      let stripped = extractClaudeCodeHints_2(str.slice(0, inlineLength), "").stripped;
      str = stripped + str.slice(inlineLength);
      if (options?.readWhole === true && truncated && readLimit === ownBytes && totalRead === readLimit) {
        let wholeCapped = isOutputOverCap(options.ownBytes);
        let wholeText = wholeCapped
          ? new TextDecoder("utf-8", {
              ignoreBOM: true,
            }).decode(buffer.subarray(0, totalRead), {
              stream: true,
            })
          : buffer.toString("utf8", 0, totalRead);
        options.facts.whole = {
          text:
            extractClaudeCodeHints_2(wholeText.slice(0, inlineLength), "").stripped +
            wholeText.slice(inlineLength),
          capped: wholeCapped,
        };
      } else if (options !== undefined && totalRead < Math.min(readLimit, opened.size))
        options.facts.savedFileDiffers = true;
      return {
        ...input,
        stdout: str,
        stdoutTruncated: truncated,
        inlineChars: stripped.length,
      };
    } finally {
      await handle.close();
    }
  } catch {
    return {
      ...input,
      stdoutTruncated: true,
    };
  }
}
//@ chunk-n51jggtb.js:29289-30149 placement
/**
 * 只读打开工具结果文件：拒绝目录穿越、软链接路径、非单链文件，返回句柄与大小。
 */
async function openPersistedOutput(outputPath, { folder, projectsDir }) {
  let fileName = basename(outputPath);
  let relativeToProjects = relative(projectsDir, folder);
  if (
    fileName === "." ||
    fileName === ".." ||
    outputPath !== join(folder, fileName) ||
    relativeToProjects === "" ||
    relativeToProjects === ".." ||
    relativeToProjects.startsWith(".." + sep) ||
    isAbsolute(relativeToProjects)
  )
    return {
      refused: "the path is not a file name in the tool-results folder",
    };
  let resolved = await Promise.all([realpath(folder), realpath(projectsDir)]).catch(() => {
    return;
  });
  if (resolved === undefined)
    return {
      refused: "the tool-results folder could not be resolved",
    };
  let [realFolder, realProjectsDir] = resolved;
  if (!(await isSameFolderChain(projectsDir, relativeToProjects, realProjectsDir, realFolder)))
    return {
      refused: "a folder below the projects folder is a link or is not the same folder on disk",
    };
  let filePath = join(realFolder, fileName);
  let noFollow = await openNoFollow_2(filePath);
  if (!noFollow.ok)
    return {
      refused: "the no-follow open failed",
    };
  let handle = noFollow.value;
  try {
    let stats = await handle.stat({
      bigint: true,
    });
    let verified =
      stats.isFile() && stats.nlink === 1n ? await verifyOpenedPath(handle, filePath) : undefined;
    if (verified?.ok === true && verified.value === true)
      return {
        handle,
        size: Number(stats.size),
      };
  } catch {}
  await handle.close();
  return {
    refused: "the opened file could not be shown to be a regular file with one name at that path",
  };
}
//@ chunk-n51jggtb.js:30149-30713 placement
/**
 * 逐级比对两条路径的目录 inode，判断 projects 目录下的子目录与解析后的真实路径是否同一个目录。
 */
async function isSameFolderChain(projectsDir, relativePath, realRoot, root) {
  let parts = relativePath.split(sep);
  let otherParts = relative(realRoot, root);
  let parts_2 = otherParts.split(sep);
  if (
    otherParts === "" ||
    otherParts === ".." ||
    otherParts.startsWith(".." + sep) ||
    isAbsolute(otherParts) ||
    parts_2.length !== parts.length ||
    join(realRoot, otherParts) !== root
  )
    return false;
  let platform = getPlatform();
  let caseInsensitiveFs = platform === "macos" || platform === "windows";
  if (
    parts.some((part, index) =>
      caseInsensitiveFs
        ? toLowerCaseChars(part) !== toLowerCaseChars(parts_2[index] ?? "")
        : part !== parts_2[index],
    )
  )
    return false;
  for (let j = 1; j <= parts.length; j++) {
    let statPair = await Promise.all([
      lstat(join(projectsDir, ...parts.slice(0, j)), {
        bigint: true,
      }),
      lstat(join(realRoot, ...parts_2.slice(0, j)), {
        bigint: true,
      }),
    ]).catch(() => {
      return;
    });
    if (statPair === undefined || statPair[0].isSymbolicLink() || !statPair[0].isDirectory()) return false;
    let [statA, statB] = statPair;
    if (hasInode(statA.ino) && hasInode(statB.ino) && (statA.ino !== statB.ino || statA.dev !== statB.dev))
      return false;
  }
  return true;
}
//@ chunk-n51jggtb.js:30713-30799 placement
/**
 * 判断结果是否带 persistedOutputPath。
 */
function hasPersistedOutput(result) {
  return result !== null && typeof result === "object" && stringField(result, "persistedOutputPath") !== "";
}
//@ chunk-n51jggtb.js:30799-30918 placement
/**
 * 读出 persistedOutputSize（数字）。
 */
function persistedOutputSizeOf(result) {
  if (result === null || typeof result !== "object") return;
  let persistedOutputSize = result.persistedOutputSize;
  return typeof persistedOutputSize === "number" ? persistedOutputSize : undefined;
}
//@ chunk-n51jggtb.js:30918-30997 placement
/**
 * 判断 persistedOutputSize 是否达到溢出下限。
 */
function isPersistedOutputOverCap(result) {
  return result !== null && typeof result === "object" && isOutputOverCap(result.persistedOutputSize);
}
export {
  isOutputOverCap,
  MAX_PERSISTED_OUTPUT_LABEL,
  UNAVAILABLE_OUTPUT_PREFIX,
  TRAILING_BYTES_ALLOWANCE,
  hasPersistedOutput,
  isPersistedOutputOverCap,
  persistedOutputSizeOf,
  inlinePersistedOutput,
};
