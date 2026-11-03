/**
 * services/homeSeed/projectSyncCheck.ts
 *
 * 2.1.316 新增：项目是否已同步的检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-h33znphj.js (1)
 * attribution: placement 1
 */
import { logSelfHostedRunnerPlan, SELF_HOSTED_RUNNER_PLAN, planHomeSeed } from "./planHomeSeed.js";
import { oN } from "../../utils/teleport/homeSettingsMode.js";
import { runHomeSeed } from "./runHomeSeed.js";

//@ chunk-h33znphj.js:12377-13062 placement
function createProjectSyncCheck({
  sessionId: sessionId,
  boundDeviceUuid: boundDeviceUuid,
  isOnSelfHostedRunner: isOnSelfHostedRunner,
  storageV5: storageV5,
  credentials: credentials,
  signal: signal,
  ...e
}) {
  let { launchConsent: launchConsent } = e,
    S = Promise.all([boundDeviceUuid, isOnSelfHostedRunner]).then(
      async ([a, c]) => {
        if (a === void 0) return { kind: "none", reason: "unbound" };
        if (c) return (logSelfHostedRunnerPlan(), SELF_HOSTED_RUNNER_PLAN);
        if (!("isProjectSynced" in e ? await e.isProjectSynced : !oN(launchConsent)))
          return { kind: "none", reason: "no_project_files" };
        return signal.aborted
          ? { kind: "none", reason: "aborted" }
          : planHomeSeed({ signal: signal, storageV5: storageV5, launchConsent: launchConsent });
      },
      () => ({ kind: "none", reason: "unbound" }),
    );
  return runHomeSeed({
    sessionId: sessionId,
    plan: S,
    bound: !0,
    boundDeviceUuid: boundDeviceUuid,
    trigger: "attach",
    signal: signal,
    credentials: credentials,
    storageV5: storageV5,
    launchConsent: launchConsent,
    ...("isProjectStillSynced" in e && { isProjectStillSynced: e.isProjectStillSynced }),
  });
}
