/**
 * services/artifacts/rosterWait.ts
 *
 * Artifact 名册等待（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rsfhsjj6.js (10), chunk-s61vbvea.js (4)
 * attribution: placement 14
 */
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
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, withTelemetryMessage, toError } from "../../utils/errors.js";
import { getStoredOAuthTokenExpiresAt } from "../../utils/auth.js";
import { isOAuthTokenExpired } from "../oauth/client.js";
import { resolveContract } from "./contract.js";
import { toolMatchesAnyName } from "../tools/permissionCheckGuard.js";
import { ARTIFACT_FAMILY_TOOL_NAMES } from "../../tools/ArtifactTool/constants.js";
import { logError } from "../../utils/log.js";

//@ chunk-rsfhsjj6.js:473-512 placement
var ROSTER_COLD_AWAIT_MS = 1500;
var ROSTER_REFRESH_TTL_MS = 86400000;
var ROSTER_DENIED_TTL_MS = 14400000;
//@ chunk-rsfhsjj6.js:512-549 placement
function artifactRosterIdentityKnown() {
  return rosterAccountKey() !== undefined;
}
//@ chunk-rsfhsjj6.js:549-725 placement
function knownArtifactCapabilities() {
  let r = currentRoster();
  if (r !== undefined)
    return {
      capabilities: r.roster.capabilities,
      source: r.source,
    };
  return {
    capabilities: undefined,
    source: rosterAccountKey() === undefined ? "cold_no_identity" : "cold",
  };
}
//@ chunk-rsfhsjj6.js:725-775 placement
function artifactRosterCold() {
  return knownArtifactCapabilities().capabilities === undefined;
}
//@ chunk-rsfhsjj6.js:775-1333 placement
/**
 * 冻结 schema 前等待 artifact 能力名单。
 */
function awaitArtifactRosterForSchemaFreeze(r = ROSTER_COLD_AWAIT_MS) {
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
  liveState.rosterWait = withTimeout(liveState.rosterHeard, r, "artifact-roster")
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
//@ chunk-rsfhsjj6.js:1333-1667 placement
async function artifactRosterSettled(r) {
  let e = Date.now() + r;
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
      sleep(Math.max(0, e - Date.now()), abortController.signal, {
        unref: true,
      }).then(() => false),
    ]);
    abortController.abort();
    if (!winner) return false;
    if (getLiveState().rosterHeard === rosterHeard) return true;
  }
}
//@ chunk-rsfhsjj6.js:1667-1768 placement
function artifactRosterFresh(r = Date.now()) {
  let cachedRoster = readCachedRoster();
  if (cachedRoster === undefined) return false;
  let o = r - cachedRoster.fetchedAt;
  return o >= 0 && o < ROSTER_REFRESH_TTL_MS;
}
//@ chunk-rsfhsjj6.js:1768-1919 placement
function artifactRosterFetchDeferred(r = Date.now()) {
  let rosterDenied = readRosterDenied();
  if (rosterDenied === undefined) return false;
  let o = r - rosterDenied.deniedAt;
  return (
    o >= 0 &&
    o < ROSTER_DENIED_TTL_MS &&
    getStoredOAuthTokenExpiresAt() === rosterDenied.tokenExpiresAt &&
    !isOAuthTokenExpired(rosterDenied.tokenExpiresAt, r)
  );
}
//@ chunk-rsfhsjj6.js:1919-2002 placement
function refreshArtifactRoster(r) {
  let liveState = getLiveState();
  let o;
  liveState.rosterHeard = new Promise((resolve) => {
    o = resolve;
  });
  return refreshRosterUnchecked(liveState, r, o);
}
//@ chunk-rsfhsjj6.js:2002-2781 placement
/**
 * 刷新 artifact 能力名单并记遥测
 */
async function refreshRosterUnchecked(liveState, e, o) {
  try {
    let accountEpoch = liveState.accountEpoch;
    let storedOAuthTokenExpiresAt = getStoredOAuthTokenExpiresAt();
    let now = Date.now();
    let contract = await resolveContract({
      ...e,
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
      o(false);
      if (
        cause === "http_4xx" &&
        (status === 403 || (status === 401 && storedOAuthTokenExpiresAt_2 !== storedOAuthTokenExpiresAt)) &&
        storedOAuthTokenExpiresAt_2 !== null &&
        getLiveState() === liveState
      )
        await saveRosterDenied(liveState, accountEpoch, e.storageV5, (h) => ({
          artifactRosterDenied: {
            ...h,
            status,
            deniedAt: Date.now(),
            tokenExpiresAt: storedOAuthTokenExpiresAt_2,
          },
        }));
      return false;
    }
    logFeatureOk("artifact_roster_refresh", {
      duration_ms: durationMs,
      schema_frozen: liveState.frozenAssets !== undefined,
    });
    let { adopted, persisted } = saveRosterToConfig({
      session: liveState,
      epoch: accountEpoch,
      roster: contract,
      storageV5: e.storageV5,
    });
    if (adopted) {
      o(true);
      await persisted;
    }
    return true;
  } catch (error) {
    logForDebugging(`Artifact roster refresh: ${errorMessage(error)}`);
    return false;
  } finally {
    o(false);
  }
}
//@ chunk-s61vbvea.js:377847-377899 placement
function artifactFamilyModule() {
  return require("./chunk-rdzbcgex.js");
}
//@ chunk-s61vbvea.js:377899-377931 placement
/**
 * 导出函数 `isArtifactFamilyTool`：参数 e，返回 toolMatchesAnyName(e, ARTIFACT_FAMILY_TOOL_NAMES)。
 */
function isArtifactFamilyTool(tool) {
  return toolMatchesAnyName(tool, ARTIFACT_FAMILY_TOOL_NAMES);
}
//@ chunk-s61vbvea.js:377931-378098 placement
/**
 * 工具列表包含 Artifact 工具时，等待 Artifact 能力名册就绪以便冻结 schema；出错只记录。
 */
async function awaitArtifactRosterSafe(tools) {
  try {
    let n = artifactFamilyModule();
    if (n === null || !tools.some(isArtifactFamilyTool)) return;
    await n.awaitArtifactRosterForSchemaFreeze();
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "Artifact roster wait failed"));
  }
}
//@ chunk-s61vbvea.js:378098-378309 placement
/**
 * 查询 Artifact 能力名册是否已就绪（不可用时视为就绪）；查询失败记调试日志并返回 false。
 */
async function isArtifactRosterSettled(e) {
  try {
    let n = artifactFamilyModule();
    return n === null || (await n.artifactRosterSettled(e));
  } catch (error) {
    logForDebugging(
      `Artifact roster status check failed; context-size telemetry leaves the Artifact tools out: ${errorMessage(error)}`,
    );
    return false;
  }
}
export {
  awaitArtifactRosterSafe,
  knownArtifactCapabilities,
  isArtifactFamilyTool,
  isArtifactRosterSettled,
  refreshArtifactRoster,
};
