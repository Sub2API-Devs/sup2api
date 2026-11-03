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
import { isLaunchConsentBlocked } from "../../utils/teleport/homeSettingsMode.js";
import { runHomeSeed } from "./runHomeSeed.js";

//@ chunk-h33znphj.js:12377-13062 placement
function createProjectSyncCheck({
  sessionId,
  boundDeviceUuid,
  isOnSelfHostedRunner,
  storageV5,
  credentials,
  signal,
  ...e
}) {
  let { launchConsent } = e;
  let plan = Promise.all([boundDeviceUuid, isOnSelfHostedRunner]).then(
    async ([a, c]) => {
      if (a === undefined)
        return {
          kind: "none",
          reason: "unbound",
        };
      if (c) {
        logSelfHostedRunnerPlan();
        return SELF_HOSTED_RUNNER_PLAN;
      }
      if (!("isProjectSynced" in e ? await e.isProjectSynced : !isLaunchConsentBlocked(launchConsent)))
        return {
          kind: "none",
          reason: "no_project_files",
        };
      return signal.aborted
        ? {
            kind: "none",
            reason: "aborted",
          }
        : planHomeSeed({
            signal,
            storageV5,
            launchConsent,
          });
    },
    () => ({
      kind: "none",
      reason: "unbound",
    }),
  );
  return runHomeSeed({
    sessionId,
    plan,
    bound: true,
    boundDeviceUuid,
    trigger: "attach",
    signal,
    credentials,
    storageV5,
    launchConsent,
    ...("isProjectStillSynced" in e && {
      isProjectStillSynced: e.isProjectStillSynced,
    }),
  });
}
