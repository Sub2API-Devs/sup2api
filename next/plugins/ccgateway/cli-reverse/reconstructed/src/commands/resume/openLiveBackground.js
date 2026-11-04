/**
 * commands/resume/openLiveBackground.ts
 *
 * 2.1.316 新增：/resume 打开运行中的后台会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-47mye09a.js (5)
 * attribution: placement 5
 */
import { isAbsolute, win32, resolve } from "path";
import { envSessionKind } from "../../utils/concurrentSessions.js";
import { isAgentsFleetEnabled } from "../../utils/fleetGates.js";
import { getCliSessionConfigCarried, getPermissionScreenAnchor } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { ensureLauncherRunnable, relaunchClaudeCode } from "../../utils/processRelaunch.js";
import { errorMessage } from "../../utils/errors.js";
import { sequential } from "../../utils/sequential.js";
import { NodeFsOperations, entryReachesForeignNetwork } from "../../utils/fsOperations.js";
import { isUncOrDevicePath, isDevicePrefixPath, hasDotSegment } from "../../utils/pathClassification.js";
import { isNetworkRelatedPath } from "../../utils/networkPaths.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-47mye09a.js:4554-4680 placement
/**
 * 可直接打开的运行中后台会话 jobId。
 */
function liveBackgroundJobId(holder, { replacesProcess }) {
  return envSessionKind() === undefined &&
    isAgentsFleetEnabled() &&
    !(replacesProcess && getCliSessionConfigCarried()) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_resume_open_live_bg", true)
    ? holder.jobId
    : undefined;
}
//@ chunk-47mye09a.js:4680-4799 placement
/**
 * 尝试打开运行中的后台会话并上报原因。
 */
async function tryOpenLiveBackground(options) {
  let liveBackground = await openLiveBackground(options);
  logFeatureSad("resume_live_background_open", liveBackground.reason, {
    entrypoint: fromEnum(options.entrypoint),
  });
  return liveBackground;
}
//@ chunk-47mye09a.js:4799-6113 placement
/**
 * 打开运行中的后台会话：校验终端与启动器，可先发送提示。
 */
async function openLiveBackground({ holder, entrypoint, prompt, storageV5 }) {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    return {
      reason: "not_openable",
    };
  let jobId = liveBackgroundJobId(holder, {
    replacesProcess: true,
  });
  if (jobId === undefined)
    return {
      reason: "not_openable",
    };
  try {
    await ensureLauncherRunnable();
  } catch (error) {
    return {
      reason: "open_failed",
      detail: errorMessage(error),
      promptSent: false,
    };
  }
  let hasPrompt = typeof prompt === "string" && prompt.trim() !== "";
  if (hasPrompt) {
    let trimmedPrompt = prompt.trimStart();
    if (trimmedPrompt.startsWith("!") || trimmedPrompt.startsWith("/"))
      return {
        reason: "prompt_undelivered",
        detail: `a prompt starting with ${trimmedPrompt.startsWith("!") ? "!" : "/"} would run as a command there`,
        delivery: "failed",
      };
    let [{ replyToJob }, { getJobDir, readJobState }] = await Promise.all([
      import("../../daemon/jobs/killJob.js"),
      import("../../services/daemon/jobState.js"),
    ]);
    if ((await readJobState(getJobDir(jobId), storageV5))?.block !== undefined)
      return {
        reason: "prompt_undelivered",
        detail: "it is waiting on your answer to a question",
        delivery: "failed",
      };
    process.stdout.write(
      sequential.dim(`Sending your prompt to the background session (${jobId})\u2026
`),
    );
    let sendResult = await replyToJob(jobId, prompt, undefined, undefined, undefined, storageV5, {
      nextTurn: true,
    });
    if (sendResult) {
      let isSupervisorUnreachable = sendResult.code === "ENOCONN" || sendResult.code === "ETIMEOUT";
      return {
        reason: "prompt_undelivered",
        detail: isSupervisorUnreachable
          ? "its supervisor did not answer"
          : sendResult.code === "ENOJOB"
            ? "it is no longer running"
            : sendResult.err,
        delivery: sendResult.queued === true ? "queued" : isSupervisorUnreachable ? "unconfirmed" : "failed",
      };
    }
  }
  try {
    return await attachToBackgroundSession(jobId, entrypoint, storageV5, {
      promptSent: hasPrompt,
    });
  } catch (error) {
    return {
      reason: "open_failed",
      detail: errorMessage(error),
      promptSent: hasPrompt,
    };
  }
}
//@ chunk-47mye09a.js:6113-6421 placement
/**
 * 重启为 attach 后台会话（打印提示）。
 */
async function attachToBackgroundSession(jobId, entrypoint, storageV5, { promptSent = false } = {}) {
  logFeatureOk("resume_live_background_open", {
    entrypoint: fromEnum(entrypoint),
    prompt_sent: promptSent,
  });
  return relaunchClaudeCode(
    {
      args: ["attach", jobId],
      preSpawn: () =>
        process.stdout.write(
          sequential.dim(
            promptSent
              ? `Sent your prompt to the background session (${jobId}); opening it\u2026
`
              : `Opening the background session (${jobId})\u2026
`,
          ),
        ),
    },
    storageV5,
  );
}
//@ chunk-47mye09a.js:6479-6852 placement
/**
 * 会话报告的工作目录可否采用（拒绝网络路径）。
 */
async function isAdoptableSessionCwd(cwd, label, fsOperations = NodeFsOperations) {
  if (
    !(isAbsolute(cwd) || win32.isAbsolute(cwd)) ||
    isUncOrDevicePath(cwd) ||
    isDevicePrefixPath(cwd) ||
    isDevicePrefixPath(win32.normalize(cwd)) ||
    isNetworkRelatedPath(cwd) ||
    isNetworkRelatedPath(resolve(cwd)) ||
    hasDotSegment(cwd)
  ) {
    logForDebugging(`[${label}] session reported a network-path cwd \u2014 not adopting`, {
      level: "warn",
    });
    return false;
  }
  if (await entryReachesForeignNetwork(cwd, getPermissionScreenAnchor(), fsOperations)) {
    logForDebugging(
      `[${label}] session-reported cwd's local ancestry could not be verified as network-free \u2014 not adopting`,
      {
        level: "warn",
      },
    );
    return false;
  }
  return true;
}
export { tryOpenLiveBackground, isAdoptableSessionCwd, liveBackgroundJobId, attachToBackgroundSession };
