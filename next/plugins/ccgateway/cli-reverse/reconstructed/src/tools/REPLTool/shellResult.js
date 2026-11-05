/**
 * tools/REPLTool/shellResult.ts
 *
 * 把 shell 工具结果转成 REPL 可见文本：退出码、后台任务、被 hook 改写、溢出与读回事实（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (16)
 * attribution: placement 16
 */
import { getTaskOutputPath, MAX_PERSISTED_OUTPUT_BYTES } from "../../utils/task/diskOutput.js";
import { formatFileSize } from "../../utils/format.js";
import {
  isOutputOverCap,
  MAX_PERSISTED_OUTPUT_LABEL,
  UNAVAILABLE_OUTPUT_PREFIX,
  TRAILING_BYTES_ALLOWANCE,
} from "./spillRead.js";
import { cleanForDisplay, truncateToLength } from "../../utils/stringUtils.js";
import { getMaxOutputLength } from "../../utils/shell/outputLimits.js";
import { loadBundledText } from "../../utils/bundledText.js";
import { isUntrustedObject } from "../../utils/untrustedValues.js";

//@ chunk-n51jggtb.js:27261-27277 placement
/**
 * "output" 属性名常量。
 */
var OUTPUT = "output";
//@ chunk-n51jggtb.js:27277-27537 placement
/**
 * 沙箱内失败后重试的命令结果前后缀文案。
 */
var OUTSIDE_SANDBOX_TAG = "[retried outside the sandbox]";
var EXIT_CODE_PREFIX = "Command failed with exit code ";
var DOLLAR_THROWS_HINT =
  "($ throws on a non-zero exit, as Bun.$ does; use (await $`cmd`.nothrow()).exitCode to inspect it instead)";
var SANDBOX_RETRY_NOTE = `${OUTSIDE_SANDBOX_TAG} The sandbox blocked the first run; this result is the retry's.`;
//@ chunk-n51jggtb.js:27537-27638 placement
/**
 * 拼出“在沙箱外重试过”的说明，并附上第一次运行报告的违规内容。
 */
function unsandboxedRetryNote({ violation }) {
  return violation
    ? `${SANDBOX_RETRY_NOTE} What the first run's output reported as blocked:
${violation}`
    : SANDBOX_RETRY_NOTE;
}
//@ chunk-n51jggtb.js:27638-27940 placement
/**
 * 从工具结果里提取 unsandboxedRetry 与其 violation。
 */
function readUnsandboxedRetry(result) {
  if (
    result === null ||
    typeof result !== "object" ||
    !("unsandboxedRetry" in result) ||
    !Object.hasOwn(result, "unsandboxedRetry")
  )
    return;
  let unsandboxedRetry = result.unsandboxedRetry;
  if (
    unsandboxedRetry === null ||
    typeof unsandboxedRetry !== "object" ||
    !("violation" in unsandboxedRetry) ||
    !Object.hasOwn(unsandboxedRetry, "violation")
  )
    return;
  let violation = unsandboxedRetry.violation;
  return typeof violation === "string"
    ? {
        violation,
      }
    : undefined;
}
//@ chunk-n51jggtb.js:27940-27995 placement
/**
 * 安全地读出对象上某个字符串属性。
 */
function stringField(object, field) {
  return typeof object[field] === "string" ? object[field] : "";
}
//@ chunk-n51jggtb.js:30997-31143 placement
/**
 * hook 改写了 stdout 时，把结果标成已截断/已被 hook 改写，并按需标上 spillFileCut。
 */
function markStdoutRewrittenByHook(result, rewritten, cut) {
  if (!rewritten || result === null || typeof result !== "object") return result;
  return {
    ...result,
    stdoutTruncated: true,
    stdoutRewrittenByHook: true,
    ...(cut && {
      spillFileCut: true,
    }),
  };
}
//@ chunk-n51jggtb.js:31143-31922 placement
/**
 * 命令未在超时内结束时给模型的说明：超时来源、后台任务号、输出文件路径，以及“不要重复启动”。
 */
function describeStillRunning({ taskId, timedOutAfterMs, requestedMs, backgroundedByUser, ending }) {
  let formatSeconds = (ms) => `${Math.max(1, Math.round(ms / 1000))}s`;
  let timeoutPhrase =
    timedOutAfterMs === undefined
      ? "its timeout"
      : requestedMs !== undefined && requestedMs > timedOutAfterMs
        ? `the ${formatSeconds(timedOutAfterMs)} maximum (you asked for ${formatSeconds(requestedMs)})`
        : `its ${formatSeconds(timedOutAfterMs)} timeout`;
  let whyStopped = backgroundedByUser
    ? "The user moved the command to the background."
    : `The command did not finish within ${timeoutPhrase}.`;
  let readAdvice =
    ending === undefined
      ? "Read that file (cat or tail it) to check progress, and you will be notified when it exits."
      : "Read that file (cat or tail it) to check progress. It is stopped when you give your final response, so you will be notified of its exit only if it exits while you are still working.";
  return `[still running] ${whyStopped} It was NOT killed: it continues as background task ${taskId}, and its output streams to ${getTaskOutputPath(taskId)}. ${readAdvice} Do not start it again.`;
}
//@ chunk-n51jggtb.js:31922-32105 placement
/**
 * 生成“输出过大/超过留存上限”的说明并给出已保存的文件路径。
 */
function largeOutputMessage(file, persistedOutputSize) {
  let limitLabel = formatFileSize(MAX_PERSISTED_OUTPUT_BYTES);
  return persistedOutputSize >= MAX_PERSISTED_OUTPUT_BYTES
    ? `Output exceeded the ${limitLabel} persist limit; only the first ${limitLabel} were saved to: ${file}`
    : `Output too large (${formatFileSize(persistedOutputSize)}). Full output saved to: ${file}`;
}
//@ chunk-n51jggtb.js:32105-32115 placement
/**
 * 命令回显的最大字符数。
 */
var COMMAND_DISPLAY_MAX_CHARS = 60;
//@ chunk-n51jggtb.js:32115-32494 placement
/**
 * 汇总一个 shell 结果的统计事实（字符数、溢出、被 hook 改写、是否读回等），供说明文本使用。
 */
function summarizeTruncation(result, kept, facts, command) {
  return {
    command,
    stdoutChars: kept.stdout.length,
    file: kept.file,
    overCap: result.spillFileCut === true || isOutputOverCap(result.persistedOutputSize),
    rewrittenByHook: result.stdoutRewrittenByHook === true,
    refused: result.spillFileRefused === true,
    wholeReadable: kept.file !== undefined && facts.savedFileDiffers !== true,
    wholeChars: facts.whole?.text.length,
    retried: kept.unsandboxedRetry !== undefined,
    notReadBack: kept.file !== undefined && facts.readBack !== true,
  };
}
//@ chunk-n51jggtb.js:32494-35091 placement
/**
 * 生成 shell 结果被裁剪时的完整说明：区分被 hook 改写、未读回、被拒读、超上限等情形。
 */
function truncationNotice(summary, reader, wholeWanted) {
  let cleanedCommand = cleanForDisplay(summary.command);
  let shortCommand =
    cleanedCommand.length > COMMAND_DISPLAY_MAX_CHARS
      ? `${truncateToLength(cleanedCommand, COMMAND_DISPLAY_MAX_CHARS)}...`
      : cleanedCommand;
  let lead = `${summary.retried ? `${OUTSIDE_SANDBOX_TAG} ` : ""}$ \`${shortCommand}\`: .${reader}() read`;
  let { file } = summary;
  if (summary.rewrittenByHook) {
    let savedFile = file ?? "a file whose path the hook's result does not give";
    return `${lead} the text that a PostToolUse hook put in place of the start of the command's output (${summary.stdoutChars} characters). ${summary.overCap ? `The command printed ${MAX_PERSISTED_OUTPUT_LABEL} or more, and only its first ${MAX_PERSISTED_OUTPUT_LABEL}, as the command printed them, were saved, to ${savedFile}.` : `The output as the command printed it was saved to ${savedFile}.`}`;
  }
  if (file === undefined)
    return `${lead} only the first ${summary.stdoutChars} characters of the command's output. The tool's result gives no file for the rest.`;
  if (summary.notReadBack)
    return `${lead} ${summary.stdoutChars} characters, which is all that the result has in stdout. The result gives ${file} as a file that the output was saved to, and Claude Code did not read that file, so these characters may be only the start of the output.`;
  if (summary.refused)
    return `${lead} only the first ${summary.stdoutChars} characters of the command's output. The rest was saved to ${file}, and Claude Code did not read that file back, because the file did not pass the checks that it is the file the shell tool saved.`;
  if (wholeWanted && summary.wholeChars !== undefined)
    return `${lead} the first ${summary.wholeChars} characters of the command's output. The command printed ${MAX_PERSISTED_OUTPUT_LABEL} or more, and only its first ${MAX_PERSISTED_OUTPUT_LABEL} were saved, to ${file}. Anything after that was not kept, so the text can end in the middle of a line.`;
  if (!summary.wholeReadable)
    return wholeWanted
      ? `${lead} only the first ${summary.stdoutChars} characters of the command's output. The saved file ${file} does not have the size that the shell tool counted for the output, so Claude Code did not read the rest of it.`
      : `${lead} only the first ${summary.stdoutChars} characters of the command's output, which is all that .stdout has. The saved file ${file} does not have the size that the shell tool counted for the output.`;
  if (wholeWanted)
    return `${lead} only the first ${summary.stdoutChars} characters of the command's output, because Claude Code could not read all of the saved output for this call. The shell tool saved ${summary.overCap ? `only the first ${MAX_PERSISTED_OUTPUT_LABEL} of the output` : "the output"} to ${file}.`;
  let readerHint = "A reader called right after $ with no await in between, as in await $`cmd`.text(), reads";
  return summary.overCap
    ? `${lead} only the first ${summary.stdoutChars} characters of the command's output, which is all that .stdout has. The command printed ${MAX_PERSISTED_OUTPUT_LABEL} or more, and only its first ${MAX_PERSISTED_OUTPUT_LABEL} were saved, to ${file}. ${readerHint} those ${MAX_PERSISTED_OUTPUT_LABEL}.`
    : `${lead} only the first ${summary.stdoutChars} characters of the command's output, which is all that .stdout has. All of the output is in ${file}. ${readerHint} all of it.`;
}
//@ chunk-n51jggtb.js:35091-37861 placement
/**
 * 把 shell 工具结果整理成 REPL 可见的 stdout/stderr/exitCode/text 结构，处理后台任务、被中断、退出码与溢出说明。
 */
function normalizeShellResult(result, requestedMs, facts) {
  let exitCodeMatch =
    typeof result.code !== "number" && !stringField(result, "stdout") && !stringField(result, "stderr")
      ? /^Exit code (\d+)(?:\n|$)/.exec(stringField(result, "error"))
      : null;
  let stdout =
    exitCodeMatch === null
      ? stringField(result, "stdout")
      : stringField(result, "error").slice(exitCodeMatch[0].length);
  let stderr = stringField(result, "stderr");
  let errorText = exitCodeMatch === null ? stringField(result, "error") : "";
  let backgroundTaskId = stringField(result, "backgroundTaskId");
  let running = backgroundTaskId
    ? {
        taskId: backgroundTaskId,
        outputPath: getTaskOutputPath(backgroundTaskId),
      }
    : undefined;
  let runningText = backgroundTaskId
    ? describeStillRunning({
        taskId: backgroundTaskId,
        timedOutAfterMs: typeof result.timedOutAfterMs === "number" ? result.timedOutAfterMs : undefined,
        requestedMs,
        backgroundedByUser: result.backgroundedByUser === true,
        ending: result.backgroundEndsWithFinalResponse === true ? "final_response" : undefined,
      })
    : "";
  let returnCodeInterpretation =
    typeof result.code !== "number" &&
    exitCodeMatch === null &&
    result.interrupted !== true &&
    typeof result.returnCodeInterpretation === "string" &&
    result.returnCodeInterpretation !== ""
      ? result.returnCodeInterpretation
      : undefined;
  let codeFromResult =
    typeof result.code === "number"
      ? result.code
      : exitCodeMatch !== null
        ? Number(exitCodeMatch[1])
        : returnCodeInterpretation !== undefined
          ? 1
          : undefined;
  let exitCode = running ? null : (codeFromResult ?? (errorText ? 1 : 0));
  let onlyNotice = !stdout && !stderr && !errorText;
  let exitNote = runningText
    ? ""
    : result.interrupted === true && onlyNotice
      ? "[interrupted before it finished]"
      : returnCodeInterpretation !== undefined
        ? `[exit 1] ${returnCodeInterpretation}`
        : codeFromResult !== undefined && (codeFromResult !== 0 || onlyNotice)
          ? `[exit ${codeFromResult}]`
          : "";
  let outputPath = stringField(result, "persistedOutputPath") || undefined;
  let stdoutTruncated = result.stdoutTruncated === true;
  let unsandboxedRetry = readUnsandboxedRetry(result);
  let savedNote =
    result.spillFileCut === true || isOutputOverCap(result.persistedOutputSize)
      ? `the output exceeded the ${MAX_PERSISTED_OUTPUT_LABEL} persist limit, so only its first ${MAX_PERSISTED_OUTPUT_LABEL}, without the hook's changes, were saved to ${outputPath ?? "a file that the hook's result does not name"}`
      : `the whole output${outputPath ? `, without the hook's changes, is in ${outputPath}` : " is in a file that the hook's result does not name"}`;
  let joined = [
    stderr &&
      `[stderr]
${stderr}`,
    errorText && `[error] ${errorText}`,
    unsandboxedRetry && unsandboxedRetryNote(unsandboxedRetry),
    runningText,
    exitNote,
  ].filter(Boolean).join(`
`);
  let text = [
    stdout,
    stdoutTruncated &&
      (result.stdoutRewrittenByHook === true
        ? `... [only the first part of the output is here (${stdout.length} chars), rewritten by a PostToolUse hook; ${savedNote}]`
        : result.spillFileRefused === true
          ? `... [output cut at ${stdout.length} chars; the rest was saved to ${outputPath ?? "a file"}, but a check that this is the file the shell tool saved did not pass, so it was not read back]`
          : isOutputOverCap(result.persistedOutputSize)
            ? `... [output cut at ${stdout.length} chars; it exceeded the ${MAX_PERSISTED_OUTPUT_LABEL} persist limit, so only its first ${MAX_PERSISTED_OUTPUT_LABEL} were saved to ${outputPath ?? "the spill file"}]`
            : `... [output cut at ${stdout.length} chars; the whole of it is in ${outputPath ?? "the spill file"}]`),
    joined,
  ].filter(Boolean).join(`
`);
  return {
    stdout,
    stderr: stderr || errorText,
    exitCode,
    text,
    ...(errorText && {
      error: errorText,
    }),
    ...(outputPath && {
      file: outputPath,
    }),
    ...(typeof result.persistedOutputSize === "number" && {
      bytes: result.persistedOutputSize,
    }),
    truncated: stdoutTruncated,
    stdoutWhole:
      !stdoutTruncated &&
      exitCodeMatch === null &&
      running === undefined &&
      !errorText &&
      facts?.hookRewrote !== true &&
      facts?.savedFileDiffers !== true &&
      !stdout.startsWith(UNAVAILABLE_OUTPUT_PREFIX) &&
      (outputPath === undefined
        ? Buffer.byteLength(stdout) < getMaxOutputLength() - TRAILING_BYTES_ALLOWANCE
        : facts?.readBack === true),
    ...(result.stdoutRewrittenByHook === true &&
      stdoutTruncated &&
      outputPath === undefined && {
        withheld: true,
      }),
    ...(running && {
      running,
    }),
    ...(returnCodeInterpretation !== undefined && {
      note: returnCodeInterpretation,
    }),
    ...(unsandboxedRetry && {
      unsandboxedRetry,
    }),
    ...(outputPath !== undefined &&
      typeof result.persistedOutputSize === "number" && {
        savedOutput: {
          header: largeOutputMessage(outputPath, result.persistedOutputSize),
          after: joined,
          ...(typeof result.inlineChars === "number" &&
            Number.isInteger(result.inlineChars) &&
            result.inlineChars >= 0 &&
            result.inlineChars <= stdout.length && {
              inlineChars: result.inlineChars,
            }),
        },
      }),
  };
}
//@ chunk-n51jggtb.js:37861-37932 placement
/**
 * 把结果格式化成 ShellError 文本。
 */
function shellErrorText(result) {
  return `ShellError: ${EXIT_CODE_PREFIX}${result.exitCode}:
${result.text}
${DOLLAR_THROWS_HINT}`;
}
//@ chunk-n51jggtb.js:37932-37993 placement
/**
 * 惰性加载 shell 结果模块。
 */
function loadBundledShellText() {
  return loadBundledText(() => require("./default.lazy.js"));
}
//@ chunk-n51jggtb.js:37993-38299 placement
/**
 * 从定时器/命令结果里安全取出 "output" 内容。
 */
function readShellOutput(result) {
  if (result === null || typeof result !== "object" || isUntrustedObject(result)) return;
  try {
    let ownValue = (key) => {
      let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(result, key);
      return ownPropertyDescriptor !== undefined && "value" in ownPropertyDescriptor
        ? ownPropertyDescriptor.value
        : undefined;
    };
    let output = ownValue(OUTPUT);
    let exitCode = ownValue("exitCode");
    return typeof output === "string" &&
      typeof ownValue("stdout") === "string" &&
      (typeof exitCode === "number" || exitCode === null)
      ? output
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-n51jggtb.js:38299-38362 placement
/**
 * 把字符串转小写（用于大小写不敏感比对）。
 */
function toLowerCaseChars(text) {
  return text.replace(/[A-Z]/g, (char) => char.toLowerCase());
}
export {
  stringField,
  toLowerCaseChars,
  markStdoutRewrittenByHook,
  loadBundledShellText,
  normalizeShellResult,
  summarizeTruncation,
  truncationNotice,
  OUTPUT,
  readShellOutput,
  shellErrorText,
};
