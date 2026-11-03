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
var ROSTER_COLD_AWAIT_MS = 1500,
  ROSTER_REFRESH_TTL_MS = 86400000,
  ROSTER_DENIED_TTL_MS = 14400000;
//@ chunk-rsfhsjj6.js:512-549 placement
function artifactRosterIdentityKnown() {
  return rosterAccountKey() !== void 0;
}
//@ chunk-rsfhsjj6.js:549-725 placement
function knownArtifactCapabilities() {
  let r = currentRoster();
  if (r !== void 0) return { capabilities: r.roster.capabilities, source: r.source };
  return { capabilities: void 0, source: rosterAccountKey() === void 0 ? "cold_no_identity" : "cold" };
}
//@ chunk-rsfhsjj6.js:725-775 placement
function artifactRosterCold() {
  return knownArtifactCapabilities().capabilities === void 0;
}
/**
 * 冻结 schema 前等待 artifact 能力名单。
 */
//@ chunk-rsfhsjj6.js:775-1333 placement
function awaitArtifactRosterForSchemaFreeze(r = ROSTER_COLD_AWAIT_MS) {
  let e = getLiveState();
  if (e.frozenAssets !== void 0 || e.rosterHeard === void 0 || e.rosterWaitOver || !artifactRosterCold())
    return;
  if (e.rosterWait !== void 0) return e.rosterWait;
  let now = Date.now(),
    accountEpoch = e.accountEpoch;
  return (
    (e.rosterWait = withTimeout(e.rosterHeard, r, "artifact-roster")
      .then(
        (a) => {
          logFeatureOk("artifact_roster_wait", {
            wait_ms: Date.now() - now,
            heard: a,
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
      .catch((a) => {
        logForDebugging(`Artifact roster wait: recording its outcome failed: ${errorMessage(a)}`);
      })
      .finally(() => {
        if (e.accountEpoch === accountEpoch) e.rosterWaitOver = !0;
      })),
    e.rosterWait
  );
}
//@ chunk-rsfhsjj6.js:1333-1667 placement
async function artifactRosterSettled(r) {
  let e = Date.now() + r;
  for (;;) {
    let o = getLiveState(),
      rosterHeard = o.rosterHeard;
    if (o.frozenAssets !== void 0 || rosterHeard === void 0 || o.rosterWaitOver) return !0;
    let abortController = new AbortController(),
      winner = await Promise.race([
        rosterHeard.then(
          () => !0,
          () => !0,
        ),
        sleep(Math.max(0, e - Date.now()), abortController.signal, { unref: !0 }).then(() => !1),
      ]);
    if ((abortController.abort(), !winner)) return !1;
    if (getLiveState().rosterHeard === rosterHeard) return !0;
  }
}
//@ chunk-rsfhsjj6.js:1667-1768 placement
function artifactRosterFresh(r = Date.now()) {
  let e = readCachedRoster();
  if (e === void 0) return !1;
  let o = r - e.fetchedAt;
  return o >= 0 && o < ROSTER_REFRESH_TTL_MS;
}
//@ chunk-rsfhsjj6.js:1768-1919 placement
function artifactRosterFetchDeferred(r = Date.now()) {
  let e = readRosterDenied();
  if (e === void 0) return !1;
  let o = r - e.deniedAt;
  return (
    o >= 0 &&
    o < ROSTER_DENIED_TTL_MS &&
    getStoredOAuthTokenExpiresAt() === e.tokenExpiresAt &&
    !isOAuthTokenExpired(e.tokenExpiresAt, r)
  );
}
//@ chunk-rsfhsjj6.js:1919-2002 placement
function refreshArtifactRoster(r) {
  let e = getLiveState(),
    o;
  return (
    (e.rosterHeard = new Promise((n) => {
      o = n;
    })),
    refreshRosterUnchecked(e, r, o)
  );
}
/**
 * 刷新 artifact 能力名单并记遥测
 */
//@ chunk-rsfhsjj6.js:2002-2781 placement
async function refreshRosterUnchecked(r, e, o) {
  try {
    let accountEpoch = r.accountEpoch,
      a = getStoredOAuthTokenExpiresAt(),
      now = Date.now(),
      s = await resolveContract({ ...e, recoverOAuth401: !0 }),
      l = Date.now() - now;
    if ("err" in s) {
      (logFeatureSad("artifact_roster_refresh", s.cause, {
        duration_ms: l,
        ...(s.status !== void 0 && { status: s.status }),
      }),
        logForDebugging(`Artifact roster refresh failed (${s.cause}): ${s.err}`));
      let c = getStoredOAuthTokenExpiresAt(),
        { cause: cause, status: status } = s;
      if (
        (o(!1),
        cause === "http_4xx" &&
          (status === 403 || (status === 401 && c !== a)) &&
          c !== null &&
          getLiveState() === r)
      )
        await saveRosterDenied(r, accountEpoch, e.storageV5, (h) => ({
          artifactRosterDenied: { ...h, status: status, deniedAt: Date.now(), tokenExpiresAt: c },
        }));
      return !1;
    }
    logFeatureOk("artifact_roster_refresh", { duration_ms: l, schema_frozen: r.frozenAssets !== void 0 });
    let { adopted: adopted, persisted: persisted } = saveRosterToConfig({
      session: r,
      epoch: accountEpoch,
      roster: s,
      storageV5: e.storageV5,
    });
    if (adopted) (o(!0), await persisted);
    return !0;
  } catch (error) {
    return (logForDebugging(`Artifact roster refresh: ${errorMessage(error)}`), !1);
  } finally {
    o(!1);
  }
}
//@ chunk-s61vbvea.js:377847-377899 placement
function T_() {
  return require("./chunk-rdzbcgex.js");
}
//@ chunk-s61vbvea.js:377899-377931 placement
function mSe(e) {
  return toolMatchesAnyName(e, ARTIFACT_FAMILY_TOOL_NAMES);
}
/**
 * 工具列表包含 Artifact 工具时，等待 Artifact 能力名册就绪以便冻结 schema；出错只记录。
 */
//@ chunk-s61vbvea.js:377931-378098 placement
async function awaitArtifactRosterSafe(e) {
  try {
    let n = T_();
    if (n === null || !e.some(mSe)) return;
    await n.awaitArtifactRosterForSchemaFreeze();
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "Artifact roster wait failed"));
  }
}
/**
 * 查询 Artifact 能力名册是否已就绪（不可用时视为就绪）；查询失败记调试日志并返回 false。
 */
//@ chunk-s61vbvea.js:378098-378309 placement
async function isArtifactRosterSettled(e) {
  try {
    let n = T_();
    return n === null || (await n.artifactRosterSettled(e));
  } catch (error) {
    return (
      logForDebugging(
        `Artifact roster status check failed; context-size telemetry leaves the Artifact tools out: ${errorMessage(error)}`,
      ),
      !1
    );
  }
}

export {
  awaitArtifactRosterSafe,
  knownArtifactCapabilities,
  mSe,
  isArtifactRosterSettled,
  refreshArtifactRoster,
};
