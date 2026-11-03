/**
 * tools/BashTool/utils.ts
 *
 * shell 工具共用：输出截断、图片输出缩放、cwd 重置、后台化说明文字、子代理前台时长上限；混入若干附件/图片读取函数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/utils.ts
 * pieces: chunk-e6aww6q8.js (7), chunk-qz53w8v8.js (1)
 * attribution: affinity 1, fingerprint 5, layout 2
 */
import { openTaskOutputForRead } from "../../utils/task/diskOutput.js";
import { parseDataUri, ywt } from "../../utils/task/shellOutputPersist.js";
import { maybeResizeAndDownsampleImageBuffer } from "../../utils/imageResizer.js";
import { getMaxOutputLength } from "../../utils/shell/outputLimits.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { isSubagentContext } from "../../utils/agentContext.js";
import { isPlainNonInteractive } from "../../utils/sessionShape.js";
import { M5o, l4r } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { _5e, T_ } from "../AgentTool/backgroundGates.js";
import { TASKSTOP } from "../TaskStopTool/prompt.js";
import { A5r } from "./prompt.js";
import { formatDuration } from "../../utils/format.js";
import { getCwd } from "../../utils/cwd.js";
import { xo } from "../../bootstrap/sessionSlices.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { shouldMaintainProjectWorkingDir } from "../../utils/envUtils.js";
import { pathInAllowedWorkingPath } from "../../utils/permissions/filesystem.js";
import { setCwd } from "../../utils/Shell.js";
import { logEvent } from "../../services/analytics/index.js";
import { bl } from "../../utils/toolResultStorage.js";

//@ chunk-e6aww6q8.js:3100560-3100577 affinity
var MAX_SHELL_IMAGE_OUTPUT_BYTES = 20971520;
/**
 * 把 shell 输出的 data:image base64（或输出文件，≤20MB）解析、按模型限制缩放后重新编码为 data URI；失败返回 null。
 */
//@ chunk-e6aww6q8.js:3100577-3101182 fingerprint = resizeShellImageOutput (0.84)
async function resizeShellImageOutput(e, n, r, s) {
  let source = e;
  if (n) {
    if (r !== void 0 && r > MAX_SHELL_IMAGE_OUTPUT_BYTES) return null;
    let G = await openTaskOutputForRead(n);
    if (G === null) return null;
    try {
      if ((await G.stat()).size > MAX_SHELL_IMAGE_OUTPUT_BYTES) return null;
      let q = [],
        Z = 0;
      while (Z <= MAX_SHELL_IMAGE_OUTPUT_BYTES) {
        let allocUnsafe = Buffer.allocUnsafe(65536),
          { bytesRead: bytesRead } = await G.read(allocUnsafe, 0, allocUnsafe.length, null);
        if (bytesRead === 0) break;
        (q.push(allocUnsafe.subarray(0, bytesRead)), (Z += bytesRead));
      }
      if (Z > MAX_SHELL_IMAGE_OUTPUT_BYTES) return null;
      source = Buffer.concat(q, Z).toString("utf8");
    } finally {
      await G.close();
    }
  }
  let parsed = parseDataUri(source);
  if (!parsed) return null;
  let buf = Buffer.from(parsed.data, "base64"),
    w = parsed.mediaType.split("/")[1] || "png",
    L = await maybeResizeAndDownsampleImageBuffer(buf, buf.length, w, s);
  return `data:image/${L.mediaType};base64,${L.buffer.toString("base64")}`;
}
/**
 * 按最大输出长度截断 shell 输出并附 "[N lines truncated]"；图片输出原样返回。
 */
//@ chunk-e6aww6q8.js:3101182-3101488 fingerprint = formatOutput (1)
function formatOutput(content) {
  let isImage = ywt(content);
  if (isImage) return { totalLines: 1, truncatedContent: content, isImage: isImage };
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
      isImage: isImage,
    };
  let truncatedPart = content.slice(0, maxOutputLength),
    remainingLines =
      countCharInString(
        content,
        `
`,
        maxOutputLength,
      ) + 1,
    truncated = `${truncatedPart}

... [${remainingLines} lines truncated] ...`;
  return {
    totalLines:
      countCharInString(
        content,
        `
`,
      ) + 1,
    truncatedContent: truncated,
    isImage: isImage,
  };
}
/**
 * 异步子代理（非主会话、非 hook/内部调用）里前台 shell 命令的时长上限，来自 GrowthBook tengu_maple_ferry，默认 0（不限）。
 */
//@ chunk-e6aww6q8.js:3101488-3101749 layout
function getSubagentForegroundCapMs({
  agentId: agentId,
  agentContext: agentContext,
  innerCall: innerCall,
  hookCaller: hookCaller,
  pluginUnnamed: pluginUnnamed,
}) {
  if (
    innerCall === !0 ||
    hookCaller !== void 0 ||
    pluginUnnamed === !0 ||
    !isSubagentContext(agentContext) ||
    agentContext.isMainSession === !0 ||
    agentContext.isAsync !== !0 ||
    agentContext.agentId !== agentId ||
    isPlainNonInteractive() ||
    M5o()
  )
    return 0;
  let y = getFeatureValue_CACHED_MAY_BE_STALE("tengu_maple_ferry", 0);
  return Number.isFinite(y) && y > 0 ? y : 0;
}
/**
 * 生成命令转后台后给模型的说明：转后台原因、输出文件路径、是否会收到完成通知、超时停止时间、不要重复启动、如何查看中间输出。
 */
//@ chunk-e6aww6q8.js:3101749-3104320 layout
function formatBackgroundTaskMessage({
  backgroundTaskId: backgroundTaskId,
  outputPath: outputPath,
  backgroundedByUser: backgroundedByUser,
  backgroundedToDeliverMessage: backgroundedToDeliverMessage,
  backgroundedByTurnAbort: backgroundedByTurnAbort,
  timedOutAfterMs: timedOutAfterMs,
  subagentCapApplied: subagentCapApplied,
  noOutputSeenAtTimeout: noOutputSeenAtTimeout,
  reapedAtFinalResponse: reapedAtFinalResponse,
  wakesItsOwner: wakesItsOwner,
  readToolName: readToolName,
}) {
  let max = Math.max(1, Math.round((timedOutAfterMs ?? 0) / 1000)),
    Se = backgroundedByUser
      ? `Command was manually backgrounded by user with ID: ${backgroundTaskId}. Output is being written to: ${outputPath}.`
      : backgroundedToDeliverMessage
        ? `Command was moved to the background (ID: ${backgroundTaskId}) so that a message that arrived while it was running can reach you; it was not interrupted. Output is being written to: ${outputPath}.`
        : timedOutAfterMs !== void 0
          ? subagentCapApplied
            ? `Command was moved to the background (ID: ${backgroundTaskId}) after running for ${max}s. Output is being written to: ${outputPath}.`
            : `Command did not complete within its ${max}s timeout and was moved to the background (ID: ${backgroundTaskId}). Output is being written to: ${outputPath}.`
          : `Command running in background with ID: ${backgroundTaskId}. Output is being written to: ${outputPath}.`,
    ke =
      !backgroundedByUser &&
      !backgroundedToDeliverMessage &&
      !backgroundedByTurnAbort &&
      timedOutAfterMs === void 0 &&
      !reapedAtFinalResponse &&
      l4r(),
    we = reapedAtFinalResponse
      ? "If it exits while you are still working you will be notified, but it is terminated when you give your final response and no notification can follow that \u2014 so do not end your turn to wait for it; if you need its result, wait for it before giving your final response."
      : wakesItsOwner
        ? "You will be notified when it completes, even after your final response, unless this session goes idle first, so if you need its result, wait for it before you reply."
        : _5e()
          ? "If it exits while you are still working you will be notified. After your reply you may not hear of it until the user writes again, and it will likely be stopped a few minutes later, so if you need its result, wait for it before you reply."
          : backgroundedByUser
            ? void 0
            : ke
              ? "You will be notified when it completes \u2014 do not poll that file or sleep while waiting."
              : "You will be notified when it completes.",
    Ee =
      timedOutAfterMs !== void 0 ||
      backgroundedByUser ||
      backgroundedToDeliverMessage ||
      backgroundedByTurnAbort,
    Ae =
      Ee && !backgroundedByUser
        ? `It is running now: do not start a second copy while it runs. If it is no longer needed, stop it with ${TASKSTOP}.`
        : void 0,
    Ie = Ee && !reapedAtFinalResponse ? A5r(void 0) : void 0,
    Me =
      Ie !== void 0
        ? `If it is still running after ${formatDuration(Ie, { hideTrailingZeros: !0 })} in the background, it will be stopped${T_() ? "" : " and you will be notified"}.`
        : void 0,
    We = backgroundedByUser
      ? void 0
      : ke
        ? `${readToolName} the file only if the user asks for progress, or if you need a line it prints before you can go on, such as a server's ready line or port.`
        : `To check interim output, use ${readToolName} on that file path.`;
  return [
    Se,
    we,
    Me,
    Ae,
    noOutputSeenAtTimeout && !backgroundedByUser
      ? "No output had been read from it when it was moved. A program that buffers its output, or a pipe into one such as tail, can keep the output file empty until the command finishes."
      : void 0,
    We,
  ]
    .filter(Boolean)
    .join(" ");
}
/**
 * 在 stderr 末尾附加 "Shell cwd was reset to <cwd>"；Lpn 是匹配该行的正则。
 */
//@ chunk-e6aww6q8.js:3104320-3104421 fingerprint = stdErrAppendShellResetMessage (1)
var stdErrAppendShellResetMessage = (e) => `${e.trim()}
Shell cwd was reset to ${getCwd()}`,
  CWD_RESET_WARNING_RE = /(?:^|\n)(Shell cwd was reset to .+)$/;
/**
 * 命令执行后若 cwd 跑出项目允许目录（或设置要求保持项目目录），把 cwd 重置回原始目录；返回是否重置。
 */
//@ chunk-e6aww6q8.js:3104421-3104591 fingerprint = resetCwdIfOutsideProject (1)
function resetCwdIfOutsideProject(e, n) {
  let cwd = xo(e).cwd,
    cwd_2 = getOriginalCwd(),
    originalCwd = shouldMaintainProjectWorkingDir();
  if (originalCwd || (cwd !== cwd_2 && !pathInAllowedWorkingPath(cwd, n))) {
    try {
      setCwd(cwd_2, e);
    } catch {
      return !0;
    }
    if (!originalCwd) return (logEvent("tengu_bash_tool_reset_to_original_dir", {}), !0);
  }
  return !1;
}
//@ chunk-qz53w8v8.js:4223-4368 fingerprint = buildImageToolResult (1)
function describeImageAttachment({ source: source }) {
  let t = bl(source) ? source : void 0,
    o = t?.type === "base64" ? t.media_type : void 0;
  return { type: "image", mediaType: typeof o === "string" ? o : void 0 };
}

export {
  formatBackgroundTaskMessage,
  getSubagentForegroundCapMs,
  resetCwdIfOutsideProject,
  stdErrAppendShellResetMessage,
  resizeShellImageOutput,
  CWD_RESET_WARNING_RE,
  formatOutput,
  describeImageAttachment,
};
