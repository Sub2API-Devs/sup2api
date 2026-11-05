/**
 * tools/BashTool/utils.ts
 *
 * shell 工具共用：输出截断、图片输出缩放、cwd 重置、后台化说明文字、子代理前台时长上限；混入若干附件/图片读取函数
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/utils.ts
 * pieces: chunk-5xgkngpb.js (9), chunk-rkc3d9jc.js (1)
 * attribution: fingerprint 6, affinity 1, layout 3
 */
import { isObjectBlock } from "../../utils/toolResultStorage.js";
import { PERSONAL_BLOCKING_EVENTS } from "../../utils/hooks/hookFailures.js";
import { openTaskOutputForRead } from "../../utils/task/diskOutput.js";
import { parseDataUri, isBase64DataUri } from "../../utils/task/shellOutputPersist.js";
import { maybeResizeAndDownsampleImageBuffer } from "../../utils/imageResizer.js";
import { getMaxOutputLength } from "../../utils/shell/outputLimits.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { getCacheCreationTtl } from "../../services/api/promptCacheBreakDetection.js";
import { isSubagentContext } from "../../utils/agentContext.js";
import { isPlainNonInteractive } from "../../utils/sessionShape.js";
import {
  isPrintInputDone,
  shouldMentionBackgroundNotice,
} from "../../tasks/LocalShellTask/backgroundNotices.js";
import {
  backgroundShellsKeptElsewhere,
  hasBackgroundBashStopAfterReply,
} from "../AgentTool/backgroundGates.js";
import { TASKSTOP } from "../TaskStopTool/prompt.js";
import { getBackgroundTimeoutNote } from "./prompt.js";
import { formatDuration } from "../../utils/format.js";
import { isSendNowAndMellowMinskyOnce } from "../../components/PromptInput/promptFlags.js";
import { getCwd } from "../../utils/cwd.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { shouldMaintainProjectWorkingDir } from "../../utils/envUtils.js";
import { pathInAllowedWorkingPath } from "../../utils/permissions/filesystem.js";
import { setCwd } from "../../utils/Shell.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-rkc3d9jc.js:3252-3397 fingerprint (2.1.88 match: buildImageToolResult, 1)
function describeImageAttachment({ source }) {
  let sourceBlock = isObjectBlock(source) ? source : undefined;
  let mediaType = sourceBlock?.type === "base64" ? sourceBlock.media_type : undefined;
  return {
    type: "image",
    mediaType: typeof mediaType === "string" ? mediaType : undefined,
  };
}
//@ chunk-5xgkngpb.js:934321-934399 fingerprint (2.1.88 match: createContentSummary, 0.502)
function createContentSummary(hookEventName, input, outcome) {
  return (
    outcome === "block" && !PERSONAL_BLOCKING_EVENTS.has(hookEventName) && Object.keys(input).length === 0
  );
}
//@ chunk-5xgkngpb.js:3186950-3186967 affinity
var MAX_SHELL_IMAGE_OUTPUT_BYTES = 20971520;
//@ chunk-5xgkngpb.js:3186967-3187577 fingerprint (2.1.88 match: resizeShellImageOutput, 0.841)
/**
 * 把 shell 输出的 data:image base64（或输出文件，≤20MB）解析、按模型限制缩放后重新编码为 data URI；失败返回 null。
 */
async function resizeShellImageOutput(stdout, outputFilePath, knownSize, imageLimits) {
  let source = stdout;
  if (outputFilePath) {
    if (knownSize !== undefined && knownSize > MAX_SHELL_IMAGE_OUTPUT_BYTES) return null;
    let taskOutputForRead = await openTaskOutputForRead(outputFilePath);
    if (taskOutputForRead === null) return null;
    try {
      if ((await taskOutputForRead.stat()).size > MAX_SHELL_IMAGE_OUTPUT_BYTES) return null;
      let chunks = [];
      let totalBytes = 0;
      while (totalBytes <= MAX_SHELL_IMAGE_OUTPUT_BYTES) {
        let chunk = Buffer.allocUnsafe(65536);
        let { bytesRead } = await taskOutputForRead.read(chunk, 0, chunk.length, null);
        if (bytesRead === 0) break;
        chunks.push(chunk.subarray(0, bytesRead));
        totalBytes += bytesRead;
      }
      if (totalBytes > MAX_SHELL_IMAGE_OUTPUT_BYTES) return null;
      source = Buffer.concat(chunks, totalBytes).toString("utf8");
    } finally {
      await taskOutputForRead.close();
    }
  }
  let parsed = parseDataUri(source);
  if (!parsed) return null;
  let buf = Buffer.from(parsed.data, "base64");
  let format = parsed.mediaType.split("/")[1] || "png";
  let resized = await maybeResizeAndDownsampleImageBuffer(buf, buf.length, format, imageLimits);
  return `data:image/${resized.mediaType};base64,${resized.buffer.toString("base64")}`;
}
//@ chunk-5xgkngpb.js:3187577-3187883 fingerprint (2.1.88 match: formatOutput, 1)
/**
 * 按最大输出长度截断 shell 输出并附 "[N lines truncated]"；图片输出原样返回。
 */
function formatOutput(content) {
  let isImage = isBase64DataUri(content);
  if (isImage)
    return {
      totalLines: 1,
      truncatedContent: content,
      isImage,
    };
  let maxOutputLength = getMaxOutputLength();
  if (content.length <= maxOutputLength)
    return {
      totalLines:
        countCharInString(
          content,
          `
`,
        ) + 1,
      truncatedContent: content,
      isImage,
    };
  let truncatedPart = content.slice(0, maxOutputLength);
  let remainingLines =
    countCharInString(
      content,
      `
`,
      maxOutputLength,
    ) + 1;
  let truncated = `${truncatedPart}

... [${remainingLines} lines truncated] ...`;
  return {
    totalLines:
      countCharInString(
        content,
        `
`,
      ) + 1,
    truncatedContent: truncated,
    isImage,
  };
}
//@ chunk-5xgkngpb.js:3187883-3187898 layout
var SUBAGENT_FOREGROUND_CAP_MS = 180000;
//@ chunk-5xgkngpb.js:3187898-3188180 layout
/**
 * 异步子代理（非主会话、非 hook/内部调用）里前台 shell 命令的时长上限，来自 GrowthBook tengu_maple_ferry，默认 0（不限）。
 */
function getSubagentForegroundCapMs(
  { agentId, agentContext, innerCall, hookCaller, pluginUnnamed },
  parentMessage,
) {
  let cacheTtl = getCacheCreationTtl(parentMessage?.message.usage) ?? parentMessage?.promptCacheRequested;
  if (
    innerCall === true ||
    hookCaller !== undefined ||
    pluginUnnamed === true ||
    !isSubagentContext(agentContext) ||
    agentContext.isMainSession === true ||
    agentContext.isAsync !== true ||
    agentContext.agentId !== agentId ||
    isPlainNonInteractive() ||
    isPrintInputDone() ||
    cacheTtl === "off" ||
    cacheTtl === "1h"
  )
    return 0;
  return SUBAGENT_FOREGROUND_CAP_MS;
}
//@ chunk-5xgkngpb.js:3188180-3190840 layout
/**
 * 生成命令转后台后给模型的说明：转后台原因、输出文件路径、是否会收到完成通知、超时停止时间、不要重复启动、如何查看中间输出。
 */
function formatBackgroundTaskMessage({
  backgroundTaskId,
  outputPath,
  backgroundedByUser,
  backgroundedToDeliverMessage,
  backgroundedByTurnAbort,
  timedOutAfterMs,
  subagentCapApplied,
  noOutputSeenAtTimeout,
  reapedAtFinalResponse,
  wakesItsOwner,
  readToolName,
}) {
  let max = Math.max(1, Math.round((timedOutAfterMs ?? 0) / 1000));
  let intro = backgroundedByUser
    ? `Command was manually backgrounded by user with ID: ${backgroundTaskId}. Output is being written to: ${outputPath}.`
    : backgroundedToDeliverMessage
      ? `Command was moved to the background (ID: ${backgroundTaskId}) so that a message that arrived while it was running can reach you; it was not interrupted. Output is being written to: ${outputPath}.`
      : timedOutAfterMs !== undefined
        ? subagentCapApplied
          ? `Command was moved to the background (ID: ${backgroundTaskId}) after running for ${max}s. Output is being written to: ${outputPath}.`
          : `Command did not complete within its ${max}s timeout and was moved to the background (ID: ${backgroundTaskId}). Output is being written to: ${outputPath}.`
        : `Command running in background with ID: ${backgroundTaskId}. Output is being written to: ${outputPath}.`;
  let expectsNotification =
    !backgroundedByUser &&
    !backgroundedToDeliverMessage &&
    !backgroundedByTurnAbort &&
    timedOutAfterMs === undefined &&
    !reapedAtFinalResponse &&
    shouldMentionBackgroundNotice();
  let notificationNote = reapedAtFinalResponse
    ? "If it exits while you are still working you will be notified, but it is terminated when you give your final response and no notification can follow that \u2014 so do not end your turn to wait for it; if you need its result, wait for it before giving your final response."
    : wakesItsOwner
      ? "You will be notified when it completes, even after your final response, unless this session goes idle first, so if you need its result, wait for it before you reply."
      : backgroundShellsKeptElsewhere()
        ? "If it exits while you are still working you will be notified. After your reply you may not hear of it until the user writes again, and it will likely be stopped a few minutes later, so if you need its result, wait for it before you reply."
        : backgroundedByUser
          ? undefined
          : expectsNotification
            ? "You will be notified when it completes \u2014 do not poll that file or sleep while waiting."
            : "You will be notified when it completes.";
  let isRunningNow =
    timedOutAfterMs !== undefined ||
    backgroundedByUser ||
    backgroundedToDeliverMessage ||
    backgroundedByTurnAbort;
  let duplicateNote =
    isRunningNow && !backgroundedByUser
      ? `It is running now: do not start a second copy while it runs. If it is no longer needed, stop it with ${TASKSTOP}.`
      : undefined;
  let timeoutMs = isRunningNow && !reapedAtFinalResponse ? getBackgroundTimeoutNote(undefined) : undefined;
  let timeoutNote =
    timeoutMs !== undefined
      ? `If it is still running after ${formatDuration(timeoutMs, {
          hideTrailingZeros: true,
        })} in the background${backgroundedToDeliverMessage && isSendNowAndMellowMinskyOnce() ? " (plus the timeout it was started with, up to the background maximum)" : ""}, it will be stopped${hasBackgroundBashStopAfterReply() ? "" : " and you will be notified"}.`
      : undefined;
  let pollNote = backgroundedByUser
    ? undefined
    : expectsNotification
      ? `${readToolName} the file only if the user asks for progress, or if you need a line it prints before you can go on, such as a server's ready line or port.`
      : `To check interim output, use ${readToolName} on that file path.`;
  return [
    intro,
    notificationNote,
    timeoutNote,
    duplicateNote,
    noOutputSeenAtTimeout && !backgroundedByUser
      ? "No output had been read from it when it was moved. A program that buffers its output, or a pipe into one such as tail, can keep the output file empty until the command finishes."
      : undefined,
    pollNote,
  ]
    .filter(Boolean)
    .join(" ");
}
//@ chunk-5xgkngpb.js:3190840-3190941 fingerprint (2.1.88 match: stdErrAppendShellResetMessage, 1)
/**
 * 在 stderr 末尾附加 "Shell cwd was reset to <cwd>"；Lpn 是匹配该行的正则。
 */
var stdErrAppendShellResetMessage = (stderr) => `${stderr.trim()}
Shell cwd was reset to ${getCwd()}`;
var CWD_RESET_WARNING_RE = /(?:^|\n)(Shell cwd was reset to .+)$/;
//@ chunk-5xgkngpb.js:3190941-3191111 fingerprint (2.1.88 match: resetCwdIfOutsideProject, 1)
/**
 * 命令执行后若 cwd 跑出项目允许目录（或设置要求保持项目目录），把 cwd 重置回原始目录；返回是否重置。
 */
function resetCwdIfOutsideProject(session, allowedDirs) {
  let cwd = getSessionProject(session).cwd;
  let originalCwd = getOriginalCwd();
  let shouldMaintain = shouldMaintainProjectWorkingDir();
  if (shouldMaintain || (cwd !== originalCwd && !pathInAllowedWorkingPath(cwd, allowedDirs))) {
    try {
      setCwd(originalCwd, session);
    } catch {
      return true;
    }
    if (!shouldMaintain) {
      logEvent("tengu_bash_tool_reset_to_original_dir", {});
      return true;
    }
  }
  return false;
}
export {
  createContentSummary,
  CWD_RESET_WARNING_RE,
  formatBackgroundTaskMessage,
  getSubagentForegroundCapMs,
  resetCwdIfOutsideProject,
  stdErrAppendShellResetMessage,
  resizeShellImageOutput,
  formatOutput,
  describeImageAttachment,
};
