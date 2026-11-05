/**
 * services/artifacts/rosterWait.ts
 *
 * Artifact 名册等待（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (4), chunk-j1a63p6d.js (10)
 * attribution: placement 14
 */
import { toolMatchesAnyName } from "../tools/permissionCheckGuard.js";
import { ARTIFACT_FAMILY_TOOL_NAMES } from "../../tools/ArtifactTool/constants.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  rosterAccountKey,
  currentRoster,
  readCachedRoster,
  readRosterDenied,
  saveRosterDenied,
  saveRosterToConfig,
} from "./capabilityRoster.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { withTimeout, sleep } from "../../utils/sleep.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { getStoredOAuthTokenExpiresAt } from "../../utils/auth.js";
import { isOAuthTokenExpired } from "../oauth/client.js";
import { resolveContract } from "./contract.js";

//@ chunk-7jxyna5q.js:302242-302294 placement
function artifactFamilyModule() {
  return require("./rosterWait.js");
}
//@ chunk-7jxyna5q.js:302294-302326 placement
/**
 * 导出函数 `isArtifactFamilyTool`：参数 e，返回 toolMatchesAnyName(e, ARTIFACT_FAMILY_TOOL_NAMES)。
 */
function isArtifactFamilyTool(tool) {
  return toolMatchesAnyName(tool, ARTIFACT_FAMILY_TOOL_NAMES);
}
//@ chunk-7jxyna5q.js:302326-302493 placement
/**
 * 工具列表包含 Artifact 工具时，等待 Artifact 能力名册就绪以便冻结 schema；出错只记录。
 */
async function awaitArtifactRosterSafe(tools) {
  try {
    let mod = artifactFamilyModule();
    if (mod === null || !tools.some(isArtifactFamilyTool)) return;
    await mod.awaitArtifactRosterForSchemaFreeze();
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "Artifact roster wait failed"));
  }
}
//@ chunk-7jxyna5q.js:302493-302704 placement
/**
 * 查询 Artifact 能力名册是否已就绪（不可用时视为就绪）；查询失败记调试日志并返回 false。
 */
async function isArtifactRosterSettled(roster) {
  try {
    let mod = artifactFamilyModule();
    return mod === null || (await mod.artifactRosterSettled(roster));
  } catch (error) {
    logForDebugging(
      `Artifact roster status check failed; context-size telemetry leaves the Artifact tools out: ${errorMessage(error)}`,
    );
    return false;
  }
}
//@ chunk-j1a63p6d.js:473-512 placement
var ROSTER_COLD_AWAIT_MS = 1500;
var ROSTER_REFRESH_TTL_MS = 86400000;
var ROSTER_DENIED_TTL_MS = 14400000;
//@ chunk-j1a63p6d.js:512-549 placement
function artifactRosterIdentityKnown() {
  return rosterAccountKey() !== undefined;
}
//@ chunk-j1a63p6d.js:549-725 placement
function knownArtifactCapabilities() {
  let roster = currentRoster();
  if (roster !== undefined)
    return {
      capabilities: roster.roster.capabilities,
      source: roster.source,
    };
  return {
    capabilities: undefined,
    source: rosterAccountKey() === undefined ? "cold_no_identity" : "cold",
  };
}
//@ chunk-j1a63p6d.js:725-775 placement
function artifactRosterCold() {
  return knownArtifactCapabilities().capabilities === undefined;
}
//@ chunk-j1a63p6d.js:775-1333 placement
/**
 * 冻结 schema 前等待 artifact 能力名单。
 */
function awaitArtifactRosterForSchemaFreeze(waitMs = ROSTER_COLD_AWAIT_MS) {
  let liveState = getLiveState();
  if (
    liveState.frozenAssets !== undefined ||
    liveState.rosterHeard === undefined ||
    liveState.rosterWaitOver ||
    !artifactRosterCold()
  )
    return;
  if (liveState.rosterWait !== undefined) return liveState.rosterWait;
  let now = Date.now();
  let accountEpoch = liveState.accountEpoch;
  liveState.rosterWait = withTimeout(liveState.rosterHeard, waitMs, "artifact-roster")
    .then(
      (heard) => {
        logFeatureOk("artifact_roster_wait", {
          wait_ms: Date.now() - now,
          heard,
          cold: artifactRosterCold(),
        });
      },
      () => {
        logFeatureSad("artifact_roster_wait", "timeout", {
          wait_ms: Date.now() - now,
          cold: artifactRosterCold(),
        });
      },
    )
    .catch((error) => {
      logForDebugging(`Artifact roster wait: recording its outcome failed: ${errorMessage(error)}`);
    })
    .finally(() => {
      if (liveState.accountEpoch === accountEpoch) liveState.rosterWaitOver = true;
    });
  return liveState.rosterWait;
}
//@ chunk-j1a63p6d.js:1333-1667 placement
async function artifactRosterSettled(waitMs) {
  let deadline = Date.now() + waitMs;
  for (;;) {
    let liveState = getLiveState();
    let rosterHeard = liveState.rosterHeard;
    if (liveState.frozenAssets !== undefined || rosterHeard === undefined || liveState.rosterWaitOver)
      return true;
    let abortController = new AbortController();
    let winner = await Promise.race([
      rosterHeard.then(
        () => true,
        () => true,
      ),
      sleep(Math.max(0, deadline - Date.now()), abortController.signal, {
        unref: true,
      }).then(() => false),
    ]);
    abortController.abort();
    if (!winner) return false;
    if (getLiveState().rosterHeard === rosterHeard) return true;
  }
}
//@ chunk-j1a63p6d.js:1667-1768 placement
function artifactRosterFresh(now = Date.now()) {
  let cachedRoster = readCachedRoster();
  if (cachedRoster === undefined) return false;
  let age = now - cachedRoster.fetchedAt;
  return age >= 0 && age < ROSTER_REFRESH_TTL_MS;
}
//@ chunk-j1a63p6d.js:1768-1919 placement
function artifactRosterFetchDeferred(now = Date.now()) {
  let rosterDenied = readRosterDenied();
  if (rosterDenied === undefined) return false;
  let age = now - rosterDenied.deniedAt;
  return (
    age >= 0 &&
    age < ROSTER_DENIED_TTL_MS &&
    getStoredOAuthTokenExpiresAt() === rosterDenied.tokenExpiresAt &&
    !isOAuthTokenExpired(rosterDenied.tokenExpiresAt, now)
  );
}
//@ chunk-j1a63p6d.js:1919-2002 placement
function refreshArtifactRoster(options) {
  let liveState = getLiveState();
  let promise;
  liveState.rosterHeard = new Promise((resolve) => {
    promise = resolve;
  });
  return refreshRosterUnchecked(liveState, options, promise);
}
//@ chunk-j1a63p6d.js:2002-2781 placement
/**
 * 刷新 artifact 能力名单并记遥测
 */
async function refreshRosterUnchecked(session, options, epoch) {
  try {
    let accountEpoch = session.accountEpoch;
    let storedOAuthTokenExpiresAt = getStoredOAuthTokenExpiresAt();
    let now = Date.now();
    let contract = await resolveContract({
      ...options,
      recoverOAuth401: true,
    });
    let durationMs = Date.now() - now;
    if ("err" in contract) {
      logFeatureSad("artifact_roster_refresh", contract.cause, {
        duration_ms: durationMs,
        ...(contract.status !== undefined && {
          status: contract.status,
        }),
      });
      logForDebugging(`Artifact roster refresh failed (${contract.cause}): ${contract.err}`);
      let storedOAuthTokenExpiresAt_2 = getStoredOAuthTokenExpiresAt();
      let { cause, status } = contract;
      epoch(false);
      if (
        cause === "http_4xx" &&
        (status === 403 || (status === 401 && storedOAuthTokenExpiresAt_2 !== storedOAuthTokenExpiresAt)) &&
        storedOAuthTokenExpiresAt_2 !== null &&
        getLiveState() === session
      )
        await saveRosterDenied(session, accountEpoch, options.storageV5, (config) => ({
          artifactRosterDenied: {
            ...config,
            status,
            deniedAt: Date.now(),
            tokenExpiresAt: storedOAuthTokenExpiresAt_2,
          },
        }));
      return false;
    }
    logFeatureOk("artifact_roster_refresh", {
      duration_ms: durationMs,
      schema_frozen: session.frozenAssets !== undefined,
    });
    let { adopted, persisted } = saveRosterToConfig({
      session,
      epoch: accountEpoch,
      roster: contract,
      storageV5: options.storageV5,
    });
    if (adopted) {
      epoch(true);
      await persisted;
    }
    return true;
  } catch (error) {
    logForDebugging(`Artifact roster refresh: ${errorMessage(error)}`);
    return false;
  } finally {
    epoch(false);
  }
}
export {
  awaitArtifactRosterSafe,
  isArtifactFamilyTool,
  isArtifactRosterSettled,
  knownArtifactCapabilities,
  refreshArtifactRoster,
  ROSTER_COLD_AWAIT_MS,
  ROSTER_DENIED_TTL_MS,
  ROSTER_REFRESH_TTL_MS,
  artifactRosterCold,
  artifactRosterFetchDeferred,
  artifactRosterFresh,
  artifactRosterIdentityKnown,
  artifactRosterSettled,
  awaitArtifactRosterForSchemaFreeze,
};
