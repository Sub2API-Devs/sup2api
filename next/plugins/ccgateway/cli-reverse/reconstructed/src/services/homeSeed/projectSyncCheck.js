/**
 * services/homeSeed/projectSyncCheck.ts
 *
 * 2.1.316 新增：项目是否已同步的检查
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ad32y8t0.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logSelfHostedRunnerPlan, SELF_HOSTED_RUNNER_PLAN, planHomeSeed } from "./planHomeSeed.js";
import { isLaunchConsentBlocked } from "../../utils/teleport/homeSettingsMode.js";
import { runHomeSeed } from "./runHomeSeed.js";

//@ chunk-ad32y8t0.js:13525-14210 placement
function createProjectSyncCheck({
  sessionId,
  boundDeviceUuid,
  isOnSelfHostedRunner,
  storageV5,
  credentials,
  signal,
  ...opts
}) {
  let { launchConsent } = opts;
  let plan = Promise.all([boundDeviceUuid, isOnSelfHostedRunner]).then(
    async ([deviceUuid, isSelfHosted]) => {
      if (deviceUuid === undefined)
        return {
          kind: "none",
          reason: "unbound",
        };
      if (isSelfHosted) {
        logSelfHostedRunnerPlan();
        return SELF_HOSTED_RUNNER_PLAN;
      }
      if (!("isProjectSynced" in opts ? await opts.isProjectSynced : !isLaunchConsentBlocked(launchConsent)))
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
    ...("isProjectStillSynced" in opts && {
      isProjectStillSynced: opts.isProjectStillSynced,
    }),
  });
}
export { createProjectSyncCheck };
