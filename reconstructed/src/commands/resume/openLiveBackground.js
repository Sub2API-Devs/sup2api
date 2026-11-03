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
import { Qn, gb, cl } from "../../utils/pathClassification.js";
import { Qg } from "../../utils/networkPaths.js";
import { logForDebugging } from "../../utils/debug.js";

/**
 * 可直接打开的运行中后台会话 jobId。
 */
//@ chunk-47mye09a.js:4554-4680 placement
function liveBackgroundJobId(e, { replacesProcess: replacesProcess }) {
  return envSessionKind() === void 0 &&
    isAgentsFleetEnabled() &&
    !(replacesProcess && getCliSessionConfigCarried()) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_resume_open_live_bg", !0)
    ? e.jobId
    : void 0;
}
/**
 * 尝试打开运行中的后台会话并上报原因。
 */
//@ chunk-47mye09a.js:4680-4799 placement
async function tryOpenLiveBackground(e) {
  let r = await openLiveBackground(e);
  return (logFeatureSad("resume_live_background_open", r.reason, { entrypoint: fromEnum(e.entrypoint) }), r);
}
/**
 * 打开运行中的后台会话：校验终端与启动器，可先发送提示。
 */
//@ chunk-47mye09a.js:4799-6113 placement
async function openLiveBackground({
  holder: holder,
  entrypoint: entrypoint,
  prompt: prompt,
  storageV5: storageV5,
}) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return { reason: "not_openable" };
  let i = liveBackgroundJobId(holder, { replacesProcess: !0 });
  if (i === void 0) return { reason: "not_openable" };
  try {
    await ensureLauncherRunnable();
  } catch (error) {
    return { reason: "open_failed", detail: errorMessage(error), promptSent: !1 };
  }
  let u = typeof prompt === "string" && prompt.trim() !== "";
  if (u) {
    let trimStart = prompt.trimStart();
    if (trimStart.startsWith("!") || trimStart.startsWith("/"))
      return {
        reason: "prompt_undelivered",
        detail: `a prompt starting with ${trimStart.startsWith("!") ? "!" : "/"} would run as a command there`,
        delivery: "failed",
      };
    let [{ replyToJob: m }, { getJobDir: h, readJobState: F }] = await Promise.all([
      import("./chunk-swfw3r1m.js"),
      import("./chunk-bytagq68.js"),
    ]);
    if ((await F(h(i), storageV5))?.block !== void 0)
      return {
        reason: "prompt_undelivered",
        detail: "it is waiting on your answer to a question",
        delivery: "failed",
      };
    process.stdout.write(
      sequential.dim(`Sending your prompt to the background session (${i})\u2026
`),
    );
    let p = await m(i, prompt, void 0, void 0, void 0, storageV5, { nextTurn: !0 });
    if (p) {
      let S = p.code === "ENOCONN" || p.code === "ETIMEOUT";
      return {
        reason: "prompt_undelivered",
        detail: S ? "its supervisor did not answer" : p.code === "ENOJOB" ? "it is no longer running" : p.err,
        delivery: p.queued === !0 ? "queued" : S ? "unconfirmed" : "failed",
      };
    }
  }
  try {
    return await attachToBackgroundSession(i, entrypoint, storageV5, { promptSent: u });
  } catch (error) {
    return { reason: "open_failed", detail: errorMessage(error), promptSent: u };
  }
}
/**
 * 重启为 attach 后台会话（打印提示）。
 */
//@ chunk-47mye09a.js:6113-6421 placement
async function attachToBackgroundSession(e, r, n, { promptSent: o = !1 } = {}) {
  return (
    logFeatureOk("resume_live_background_open", { entrypoint: fromEnum(r), prompt_sent: o }),
    relaunchClaudeCode(
      {
        args: ["attach", e],
        preSpawn: () =>
          process.stdout.write(
            sequential.dim(
              o
                ? `Sent your prompt to the background session (${e}); opening it\u2026
`
                : `Opening the background session (${e})\u2026
`,
            ),
          ),
      },
      n,
    )
  );
}
/**
 * 会话报告的工作目录可否采用（拒绝网络路径）。
 */
//@ chunk-47mye09a.js:6479-6852 placement
async function isAdoptableSessionCwd(e, r, n = NodeFsOperations) {
  if (
    !(isAbsolute(e) || win32.isAbsolute(e)) ||
    Qn(e) ||
    gb(e) ||
    gb(win32.normalize(e)) ||
    Qg(e) ||
    Qg(resolve(e)) ||
    cl(e)
  )
    return (
      logForDebugging(`[${r}] session reported a network-path cwd \u2014 not adopting`, { level: "warn" }),
      !1
    );
  if (await entryReachesForeignNetwork(e, getPermissionScreenAnchor(), n))
    return (
      logForDebugging(
        `[${r}] session-reported cwd's local ancestry could not be verified as network-free \u2014 not adopting`,
        { level: "warn" },
      ),
      !1
    );
  return !0;
}

export { tryOpenLiveBackground, isAdoptableSessionCwd, liveBackgroundJobId, attachToBackgroundSession };
