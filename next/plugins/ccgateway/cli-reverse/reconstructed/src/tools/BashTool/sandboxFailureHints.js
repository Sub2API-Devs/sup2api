/**
 * tools/BashTool/sandboxFailureHints.ts
 *
 * 2.1.316 新增：沙箱失败（只读文件系统、无权限）时的提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (19)
 * attribution: placement 6, layout 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { homedir } from "os";
import { isAbsolute, dirname } from "path";
import { statfs, unlink } from "fs/promises";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { sanitizeLogLine } from "../../utils/sanitization.js";
import { expandTildeWithHome } from "../../utils/networkPaths.js";
import { withDeadline, sleep } from "../../utils/sleep.js";
import { classifyBashCommand } from "./commandClassification.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";
import { getPlatform } from "../../utils/platform.js";
import { isDiskless } from "../../bootstrap/state.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  stringSchema,
  union,
  literal,
  zodStrictObject,
  _enum,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import {
  MAX_PERSISTED_OUTPUT_BYTES,
  getTaskOutputPath,
  openTaskOutputForAppend,
  unlinkTaskOutput,
  getTaskOutputSize,
  openVerifiedTaskOutput,
} from "../../utils/task/diskOutput.js";
import { generateTaskId } from "../../Task.js";
import { createAbortController } from "../../utils/abortController.js";
import { logForDebugging } from "../../utils/debug.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { errorMessage } from "../../utils/errors.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { hasCcrFamily, shouldBuildLargeOutputMessage, persistBashOutput } from "./BashTool.js";
import {
  getOriginalCwd as getOriginalCwd_2,
  ensureToolResultsDir,
  getToolResultFilePath,
} from "../../utils/toolResultStorage.js";
import { formatFileSize } from "../../utils/format.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4945067-4945504 placement
/**
 * 沙箱失败提示常量：扫描长度与条目上限、失败类型及匹配正则（Operation not permitted、Read-only file system、LaunchServices、沙箱不可用），以及路径字符相关正则。
 */
var MAX_HINT_OUTPUT_SCAN = 65536;
var MAX_HINT_PATHS = 128;
var MAX_HINT_COMMANDS = 256;
var MAX_HINT_PATH_LENGTH = 256;
var SANDBOX_FAILURE_PATTERNS = [
  ["operation_not_permitted", /Operation not permitted/i],
  ["read_only_file_system", /Read-only file system/i],
  ["launch_services", /-10810\b|kLSUnknownErr|LSOpenURLsWithRole\(\)/],
  ["sandbox_unavailable", /^(?:\s*(?:bwrap|sandbox-exec): [^\n]*(?:\n|$))+\s*$/],
];
var GLOB_CHAR_RE_2 = /[*?[{]/;
var PATH_CHAR_RE = /[\p{L}\p{M}\p{N}._@+%~$/\\-]/u;
var PATH_TAIL_RE = /^[^\s"'`:;,|&<>(){}[\]]*/;
var SAFE_PATH_RE = /^[\p{L}\p{M}\p{N}._@+%~$/\\:,=#-]+$/u;
var SPACE_OR_CONTROL_RE = /[\s\p{Cc}]/u;
//@ chunk-5xgkngpb.js:4945504-4946579 placement
/**
 * 沙箱失败（权限不允许、只读文件系统、沙箱不可用）时给出提示。
 */
function buildSandboxFailureHint(hintInput) {
  let output =
    hintInput.output.length <= MAX_HINT_OUTPUT_SCAN
      ? hintInput.output
      : hintInput.output.slice(0, MAX_HINT_OUTPUT_SCAN / 2) +
        `
` +
        hintInput.output.slice(-MAX_HINT_OUTPUT_SCAN / 2);
  let isStrictPolicy = hintInput.filesystemPolicy === "strict";
  let symptoms = hintInput.failed
    ? SANDBOX_FAILURE_PATTERNS.flatMap(([symptom, pattern]) =>
        (isStrictPolicy || (symptom !== "operation_not_permitted" && symptom !== "read_only_file_system")) &&
        (symptom !== "sandbox_unavailable" || !hintInput.violationRecorded) &&
        pattern.test(output)
          ? [symptom]
          : [],
      )
    : [];
  let scanText = hintInput.failed || hintInput.violationRecorded ? output : "";
  let deniedPathsNamed = [];
  if (isStrictPolicy) {
    let fsReadConfig = SandboxManager.getFsReadConfig();
    let allowedPaths = (fsReadConfig.allowWithinDeny ?? []).flatMap((allowedPath) => {
      let normalized = normalizeHintPath(allowedPath);
      if (normalized === undefined) return [];
      let match = GLOB_CHAR_RE_2.exec(normalized);
      if (match === null) return [normalized];
      let sliced = normalized.slice(
        0,
        Math.max(normalized.lastIndexOf("/", match.index), normalized.lastIndexOf("\\", match.index)),
      );
      return sliced.length < 2 ? [] : [sliced];
    });
    let homeDir = homedir();
    let seen = new Set();
    for (let path of [
      ...collectHintPaths(fsReadConfig.denyOnly).slice(0, MAX_HINT_PATHS),
      ...collectHintPaths(hintInput.additionalDenyRead()),
    ].slice(0, MAX_HINT_COMMANDS)) {
      if (seen.has(path)) continue;
      seen.add(path);
      if (
        (path === homeDir
          ? [path, "~", "$HOME"]
          : path.startsWith(homeDir + "/") || path.startsWith(homeDir + "\\")
            ? [path, `~${path.slice(homeDir.length)}`, `$HOME${path.slice(homeDir.length)}`]
            : [path]
        ).some(
          (spelling) =>
            mentionsPathOutsideAllowed(hintInput.command, spelling, path, allowedPaths) ||
            mentionsPathOutsideAllowed(scanText, spelling, path, allowedPaths),
        )
      )
        deniedPathsNamed.push(path);
    }
  }
  return {
    key: "sandboxed",
    failed: hintInput.failed,
    violationRecorded: hintInput.violationRecorded,
    filesystemConfined: isStrictPolicy,
    symptoms,
    deniedPathsNamed,
  };
}
//@ chunk-5xgkngpb.js:4946579-4946702 placement
function collectHintPaths(paths) {
  return paths.flatMap((path) => {
    let normalized = normalizeHintPath(path);
    return normalized === undefined ||
      !SAFE_PATH_RE.test(normalized) ||
      sanitizeLogLine(normalized.normalize("NFKC")) !== normalized
      ? []
      : [normalized];
  });
}
//@ chunk-5xgkngpb.js:4946702-4946815 placement
function normalizeHintPath(path) {
  let replaced = expandTildeWithHome(path).replace(/[\\/]+$/, "");
  return replaced.length < 2 ||
    replaced.length > MAX_HINT_PATH_LENGTH ||
    SPACE_OR_CONTROL_RE.test(replaced) ||
    !isAbsolute(replaced)
    ? undefined
    : replaced;
}
//@ chunk-5xgkngpb.js:4946815-4947133 placement
/**
 * 判断输出中某路径片段的出现处（作为完整路径成分）是否指向允许目录之外。
 */
function mentionsPathOutsideAllowed(text, needle, needlePath, allowedPaths) {
  let from = 0;
  for (;;) {
    let index = text.indexOf(needle, from);
    if (index === -1) return false;
    from = index + 1;
    let before = text[index - 1];
    let after = text[index + needle.length];
    if (
      (before !== undefined && PATH_CHAR_RE.test(before)) ||
      (after !== undefined && after !== "/" && after !== "\\" && PATH_CHAR_RE.test(after))
    )
      continue;
    let fullPath = needlePath + (PATH_TAIL_RE.exec(text.slice(index + needle.length))?.[0] ?? "");
    if (
      !allowedPaths.some(
        (allowed) =>
          fullPath === allowed || fullPath.startsWith(allowed + "/") || fullPath.startsWith(allowed + "\\"),
      )
    )
      return true;
  }
}
//@ chunk-5xgkngpb.js:4947244-4947257 layout
var STATFS_TIMEOUT_MS = 2000;
//@ chunk-5xgkngpb.js:4947257-4947527 layout
async function freeBytesOf(dirPath) {
  let stat = await withDeadline(
    statfs(dirPath, {
      bigint: true,
    }).catch(() => {
      return;
    }),
    STATFS_TIMEOUT_MS,
  );
  if (stat === undefined || stat.blocks <= 0n || stat.bavail < 0n) return;
  if (stat.files > 0n && stat.ffree < 1000n) return 0;
  let blockSize =
    "frsize" in stat && typeof stat.frsize === "bigint" && stat.frsize > 0n ? stat.frsize : stat.bsize;
  return Number(stat.bavail * blockSize);
}
//@ chunk-5xgkngpb.js:4947527-4947677 layout
var MIN_SHELL_USAGE_MS = 1e4;
var MIB = 1048576;
var MIN_FREE_BYTES = 1024 * MIB;
var POLL_MS = 1000;
var POLL_COST_BYTES = 4 * MIB;
var TAIL_PIPE_RE = /(^|[^|])\|&?\s*tail([ \t]+(-\d+|-n[ \t]*[+-]?\d+|--lines=[+-]?\d+))?[ \t]*($|[;&|)\n])/g;
//@ chunk-5xgkngpb.js:4947677-4948275 layout
function tailInputKind(command) {
  let tailCount = command.match(TAIL_PIPE_RE)?.length;
  if (
    tailCount === undefined ||
    tailCount !== command.match(/\btail\b/g)?.length ||
    /\btail\b[^;&|\n]*\|(?!\|)/.test(command) ||
    /\b(tee|enable|coproc)\b/.test(command) ||
    /[<>]\(/.test(command)
  )
    return;
  if (tailCount > 1 && /[(){}`]|\b(do|done|then|fi|esac)\b/.test(command)) return;
  let parts = classifyBashCommand(command).bash_command_kinds.split(",");
  if (parts.includes("starts_background_job")) return;
  if (parts.includes("runs_tests") || parts.includes("builds") || parts.includes("lints")) return "check";
  return parts.includes("unparsed") ||
    parts.includes("incomplete") ||
    parts.includes("wait") ||
    /(^|[;&|(){}\n!]|\b(then|else|do|time))\s*(for|while|until|select)(\s|\(\()/.test(command)
    ? undefined
    : "other";
}
//@ chunk-5xgkngpb.js:4948275-4948374 layout
function tailNoteRule() {
  return isRemoteManagedEnvironment() &&
    !env.CLAUDE_CODE_SHELL_PREFIX &&
    getPlatform() === "linux" &&
    !isDiskless()
    ? tailNoteSetting() !== undefined
    : undefined;
}
//@ chunk-5xgkngpb.js:4948374-4948443 layout
function isTailNoteWanted(kind, enabled) {
  return enabled === true && (kind === "check" || tailNoteSetting()?.lines === "any");
}
//@ chunk-5xgkngpb.js:4948443-4948714 layout
var tailNoteWording; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var tailNoteRuleSchema;
deferInit("chunk-5xgkngpb.js:4948443", () => {
  tailNoteWording = DoctorLazy(() =>
    stringSchema()
      .max(400)
      .regex(/^[!-;=-Z\\^-~](?:[ -;=-Z\\^-~\n]*[!-;=-Z\\^-~])?$/)
      .includes("{path}"),
  );
  tailNoteRuleSchema = DoctorLazy(() =>
    union([
      literal(true).transform(() => ({
        lines: "checks",
      })),
      tailNoteWording().transform((wording) => ({
        lines: "checks",
        wording,
      })),
      zodStrictObject({
        lines: _enum(["checks", "any"]),
        wording: tailNoteWording().optional(),
      }),
    ]),
  );
});
//@ chunk-5xgkngpb.js:4948714-4948798 layout
function tailNoteSetting() {
  let featureValue_SESSION_PINNED = getFeatureValue_SESSION_PINNED("tengu_peaceful_origami", false);
  return tailNoteRuleSchema().safeParse(featureValue_SESSION_PINNED).data;
}
//@ chunk-5xgkngpb.js:4948798-4949235 layout
async function watchDiskFree(persisted, freeBytes, signal) {
  for (;;) {
    await sleep(Math.min(POLL_MS, freeBytes / (2 * POLL_COST_BYTES)), signal, {
      unref: true,
    });
    if (signal.aborted) return;
    let { size, blocks } = await persisted.handle.stat().catch(() => ({
      size: 0,
      blocks: 0,
    }));
    if (persisted.givenUp !== undefined) {
      if (size < MAX_PERSISTED_OUTPUT_BYTES || blocks > 0) await persisted.giveUp(persisted.givenUp);
      freeBytes = 1 / 0;
      continue;
    }
    let free = size < MAX_PERSISTED_OUTPUT_BYTES ? await freeBytesOf(dirname(persisted.path)) : undefined;
    if (free !== undefined && free >= MIN_FREE_BYTES) {
      freeBytes = free;
      continue;
    }
    await persisted.giveUp(
      size >= MAX_PERSISTED_OUTPUT_BYTES
        ? "over_size_cap"
        : free === undefined
          ? "disk_check_failed_while_running"
          : "low_disk_while_running",
    );
  }
}
//@ chunk-5xgkngpb.js:4949235-4950577 layout
async function startTailInputCapture() {
  try {
    let taskId = generateTaskId("local_bash");
    let taskOutputPath = getTaskOutputPath(taskId);
    let taskOutputForAppend = await openTaskOutputForAppend(taskOutputPath, "w");
    let freeAtStartBytes = await freeBytesOf(dirname(taskOutputPath));
    let freeAtStart =
      freeAtStartBytes === undefined
        ? undefined
        : freeAtStartBytes < 64 * MIB
          ? "under_64_mib"
          : freeAtStartBytes < 256 * MIB
            ? "under_256_mib"
            : freeAtStartBytes < 1024 * MIB
              ? "under_1_gib"
              : "1_gib_or_more";
    if (
      freeAtStartBytes === undefined ||
      freeAtStartBytes < MIN_FREE_BYTES + 2 * MAX_PERSISTED_OUTPUT_BYTES
    ) {
      await taskOutputForAppend.close().catch(() => {});
      await unlinkTaskOutput(taskOutputPath).catch(() => {});
      return {
        refused: freeAtStartBytes === undefined ? "disk_check_failed_at_start" : "low_disk_at_start",
        freeAtStart,
      };
    }
    let cleanupRegistration;
    let givenUpReason;
    let abortController = createAbortController();
    let diskCheckFailedAtEnd = false;
    let released = false;
    let file = {
      taskId,
      path: taskOutputPath,
      handle: taskOutputForAppend,
      get givenUp() {
        return givenUpReason;
      },
      async giveUp(reason) {
        if (givenUpReason === undefined) {
          givenUpReason = reason;
          logForDebugging(
            `Bash: not saving what was piped into tail to a file (the command is not affected): ${reason}`,
          );
        }
        await taskOutputForAppend.truncate(0).catch(() => {});
        await taskOutputForAppend.truncate(MAX_PERSISTED_OUTPUT_BYTES).catch(() => {});
        await unlinkTaskOutput(taskOutputPath).catch(() => {});
      },
      async stopLooking() {
        abortController.abort();
        if (
          !diskCheckFailedAtEnd &&
          (await withDeadline(
            watchPromise.then(() => true),
            STATFS_TIMEOUT_MS,
          )) === undefined
        ) {
          diskCheckFailedAtEnd = true;
          file.giveUp("disk_check_failed_at_end");
        }
      },
      passToBackgroundEnd() {
        cleanupRegistration ??= registerCleanup(file.release);
      },
      get isPassedOn() {
        return cleanupRegistration !== undefined;
      },
      get isReleased() {
        return released;
      },
      isBeingCopied: false,
      async release() {
        released = true;
        cleanupRegistration?.();
        await file.stopLooking();
        await taskOutputForAppend.truncate(0).catch(() => {});
        if (!file.isBeingCopied)
          await taskOutputForAppend.truncate(MAX_PERSISTED_OUTPUT_BYTES).catch(() => {});
        await taskOutputForAppend.close().catch(() => {});
        await unlinkTaskOutput(taskOutputPath).catch(() => {});
      },
      async [Symbol.asyncDispose]() {
        if (cleanupRegistration === undefined) await file.release();
      },
    };
    let watchPromise = watchDiskFree(file, freeAtStartBytes, abortController.signal);
    return {
      file,
      freeAtStart,
    };
  } catch (error) {
    logForDebugging(`Bash: could not create the file for what is piped into tail: ${errorMessage(error)}`, {
      level: "warn",
    });
    return {};
  }
}
//@ chunk-5xgkngpb.js:4950577-4950750 layout
function withTailNote(created) {
  let refusal = created?.refused ?? created?.file?.givenUp;
  return {
    ...(created?.freeAtStart !== undefined && {
      tail_input_free_at_start: fromEnum(created.freeAtStart),
    }),
    ...(refusal !== undefined && {
      tail_input_given_up: fromEnum(refusal),
    }),
  };
}
//@ chunk-5xgkngpb.js:4950750-4952474 layout
async function persistTailInput(
  file,
  command,
  result,
  session,
  storageV5,
  toolUseContext,
  isPassedOn = false,
) {
  if (
    !hasCcrFamily(toolUseContext) ||
    result.interrupted ||
    result.timedOut === true ||
    isPassedOn !== file.isPassedOn ||
    isPassedOn !== (result.backgroundTaskId !== undefined) ||
    result.shellUsage === undefined ||
    result.shellUsage.wallMs < MIN_SHELL_USAGE_MS ||
    (result.code !== 0 && !shouldBuildLargeOutputMessage())
  )
    return;
  await file.stopLooking();
  if (file.givenUp !== undefined) return;
  let outputBytes =
    result.backgroundTaskId !== undefined
      ? await getTaskOutputSize(result.backgroundTaskId).catch(() => 1 / 0)
      : (result.outputFileSize ?? Buffer.byteLength(result.stdout));
  let { size } = await file.handle.stat().catch(() => ({
    size: 0,
  }));
  if (size <= outputBytes) return;
  let resultPath;
  let freeBytes;
  try {
    let dirPath = getOriginalCwd_2(session);
    await ensureToolResultsDir(dirPath, storageV5);
    resultPath = getToolResultFilePath(dirPath, file.taskId, false);
    freeBytes = await freeBytesOf(dirPath);
  } catch {}
  if (resultPath === undefined || freeBytes === undefined || freeBytes - size < MIN_FREE_BYTES) {
    await file.giveUp(freeBytes === undefined ? "disk_check_failed_at_end" : "low_disk_at_end");
    return;
  }
  let everyPipeIsTail =
    command.match(/((^|[\s;&|(){}])2>&1[ \t]*\||\|&)\s*tail\b/g)?.length ===
    command.match(/(^|[^|])\|(?!\|)/g)?.length;
  let wording =
    tailNoteSetting()?.wording ??
    `${everyPipeIsTail ? "Full output" : "Full input to tail"} ({size}): {path} Read it instead of re-running.`;
  let lineCount = 0;
  if (wording.includes("{lines}"))
    try {
      let { handle } = await openVerifiedTaskOutput(file.path, MAX_PERSISTED_OUTPUT_BYTES);
      await using outputHandle = handle;
      let buffer = Buffer.allocUnsafe(65536);
      let lastByte = 10;
      for (let offset = 0; offset < size;) {
        let { bytesRead } = await handle.read(buffer, 0, Math.min(buffer.length, size - offset), offset);
        if (bytesRead === 0) break;
        let chunk = buffer.subarray(0, bytesRead);
        for (let index = chunk.indexOf(10); index !== -1; index = chunk.indexOf(10, index + 1)) lineCount++;
        lastByte = chunk[bytesRead - 1] ?? lastByte;
        offset += bytesRead;
      }
      if (lastByte !== 10) lineCount++;
    } catch (error) {
      logForDebugging(`Bash: could not read the file of what was piped into tail: ${errorMessage(error)}`, {
        level: "warn",
      });
      return;
    }
  let persisted;
  if (!file.isReleased) {
    file.isBeingCopied = true;
    persisted = await persistBashOutput(
      {
        outputFilePath: file.path,
        outputTaskId: file.taskId,
      },
      session,
      storageV5,
    );
    file.isBeingCopied = false;
  }
  if (persisted === undefined || file.isReleased) {
    await file.giveUp("keep_failed");
    await unlink(resultPath).catch(() => {});
    return;
  }
  return {
    path: persisted.path,
    bytes: Math.min(persisted.size, MAX_PERSISTED_OUTPUT_BYTES),
    note: `[${wording
      .replaceAll("{size}", formatFileSize(size))
      .replaceAll("{lines}", lineCount.toLocaleString("en-US"))
      .replaceAll("{path}", () => persisted.path)}]`,
  };
}
//@ chunk-5xgkngpb.js:4952474-4952987 layout
function tailInputAsker(file, command, session, storageV5, outsideResultReader, fallback) {
  return file === undefined
    ? fallback
    : {
        hold() {
          file.passToBackgroundEnd();
        },
        async ask(shellUsage, args) {
          let persisted = await persistTailInput(
            file,
            command,
            shellUsage,
            session,
            storageV5,
            outsideResultReader,
            true,
          );
          let fallbackResult = persisted === undefined ? await fallback.ask(shellUsage, args) : undefined;
          return {
            note: persisted?.note ?? fallbackResult?.note,
            namesFullerOutput: persisted !== undefined,
            telemetry: {
              triggered_note_rule: fallbackResult?.telemetry.triggered_note_rule ?? 0,
              triggered_note_shown: fallbackResult?.telemetry.triggered_note_shown ?? false,
              tail_input_kept: persisted !== undefined,
              ...(persisted !== undefined && {
                tail_input_kept_bytes: persisted.bytes,
              }),
              ...(file.givenUp !== undefined && {
                tail_input_given_up: fromEnum(file.givenUp),
              }),
            },
          };
        },
        release() {
          return file.release();
        },
      };
}
//@ chunk-5xgkngpb.js:4952987-4953453 placement
/**
 * 命令运行期间内核因内存不足杀死进程时附加的说明（会话共享同一内存上限，建议减少并行），以及每会话最多附加次数。
 */
var OOM_KILL_NOTE =
  "[While this command ran, the kernel killed at least one process for lack of memory. All commands in this session share one memory limit. The killed process may have been a worker that a test or build runner replaced, so this output may not show it. It may also have belonged to another command, a background task or another program under the same limit. If this command was the heavy one, run fewer workers in parallel, or a smaller part at a time.]";
var MAX_OOM_NOTES = 3;
export {
  MAX_OOM_NOTES,
  OOM_KILL_NOTE,
  tailInputKind,
  tailNoteRule,
  isTailNoteWanted,
  startTailInputCapture,
  tailInputAsker,
  persistTailInput,
  buildSandboxFailureHint,
  withTailNote,
};
