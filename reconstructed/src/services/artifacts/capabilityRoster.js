/**
 * services/artifacts/capabilityRoster.ts
 *
 * 2.1.316 新增：artifact 能力名册的保存与读取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (11)
 * attribution: placement 11
 */
import { isServerIdentityActive } from "../mcp/serverIdentity.js";
import { env } from "../../utils/env.js";
import { getGatewayAccountInfo } from "../../utils/gatewayCredential.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, array, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { invalidateOverageCreditGrantCache } from "../api/overageCreditGrant.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { arraysEqual } from "../../utils/collections.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-06y4szbn.js:2054-2124 placement
function slackConnectorName() {
  return isServerIdentityActive() ? "slack_example_com" : "claude_ai_Slack_beta";
}
//@ chunk-06y4szbn.js:2156-2290 placement
var FORCE_REFUSED_SENTENCE =
  " The server refuses force:true over a version saved from inside the page; only a publish built on that version is accepted.";
//@ chunk-06y4szbn.js:2290-2537 placement
function isHtmlCommentOnly(e) {
  let n = e.trimEnd();
  if (!n.startsWith("<!--") || !n.endsWith("-->") || n.length < 7) return false;
  let sliced = n.slice(4, -3);
  return (
    !sliced.startsWith(">") &&
    !sliced.startsWith("->") &&
    !sliced.includes("-->") &&
    !sliced.includes("--!>") &&
    !sliced.includes("<!--") &&
    !sliced.endsWith("<!-")
  );
}
//@ chunk-06y4szbn.js:2537-2839 placement
function rosterAccountKey() {
  let CLAUDE_CODE_ACCOUNT_UUID = env.CLAUDE_CODE_ACCOUNT_UUID;
  let CLAUDE_CODE_ORGANIZATION_UUID = env.CLAUDE_CODE_ORGANIZATION_UUID;
  if (CLAUDE_CODE_ACCOUNT_UUID && CLAUDE_CODE_ORGANIZATION_UUID)
    return {
      accountUuid: CLAUDE_CODE_ACCOUNT_UUID.toLowerCase(),
      organizationUuid: CLAUDE_CODE_ORGANIZATION_UUID.toLowerCase(),
    };
  let gatewayAccountInfo = getGatewayAccountInfo();
  if (!gatewayAccountInfo?.accountUuid) return;
  return {
    accountUuid: gatewayAccountInfo.accountUuid.toLowerCase(),
    organizationUuid: gatewayAccountInfo.organizationUuid?.toLowerCase() ?? null,
  };
}
//@ chunk-06y4szbn.js:2839-3058 placement
/**
 * 能力名册缓存的 schema（账号/组织、版本、能力列表、拉取时间），以及被拒记录的 schema（状态码、拒绝时间、令牌过期时间）。
 */
var CAPABILITY_ROSTER_SCHEMA = DoctorLazy(() =>
  u({
    accountUuid: string(),
    organizationUuid: string().nullable(),
    version: string(),
    capabilities: array(string()),
    fetchedAt: E(),
  }),
);
var CAPABILITY_DENIAL_SCHEMA = DoctorLazy(() =>
  u({
    accountUuid: string(),
    organizationUuid: string().nullable(),
    status: E(),
    deniedAt: E(),
    tokenExpiresAt: E(),
  }),
);
//@ chunk-06y4szbn.js:3214-3282 placement
function readCachedRoster() {
  return invalidateOverageCreditGrantCache(
    CAPABILITY_ROSTER_SCHEMA().safeParse(getGlobalConfig().cachedArtifactRoster),
  );
}
//@ chunk-06y4szbn.js:3282-3350 placement
function readRosterDenied() {
  return invalidateOverageCreditGrantCache(
    CAPABILITY_DENIAL_SCHEMA().safeParse(getGlobalConfig().artifactRosterDenied),
  );
}
//@ chunk-06y4szbn.js:3350-3521 placement
function currentRoster() {
  let roster = getLiveState().roster;
  if (roster !== undefined)
    return {
      roster,
      source: "session",
    };
  let n = env.CLAUDE_CODE_REMOTE ? undefined : readCachedRoster();
  return n === undefined
    ? undefined
    : {
        roster: n,
        source: "disk",
      };
}
//@ chunk-06y4szbn.js:3521-3536 placement
var ROSTER_CACHE_TTL_MS = 3600000;
//@ chunk-06y4szbn.js:3536-4415 placement
/**
 * 把 artifact 能力名册（capability roster）写入全局配置缓存，账号/epoch 不一致时放弃。
 */
function saveRosterToConfig(e) {
  let { session, epoch, roster, storageV5 } = e;
  if (getLiveState() !== session || session.accountEpoch !== epoch)
    return {
      adopted: false,
      persisted: Promise.resolve(),
    };
  session.roster = roster;
  if (roster.capabilities.includes("assets")) session.assetsOnRoster = true;
  if (env.CLAUDE_CODE_REMOTE)
    return {
      adopted: true,
      persisted: Promise.resolve(),
    };
  return {
    adopted: true,
    persisted: saveRosterDenied(session, epoch, storageV5, (y, x) => {
      let w = CAPABILITY_ROSTER_SCHEMA().safeParse(x.cachedArtifactRoster);
      let R = w.success ? w.data : undefined;
      let now = Date.now();
      if (
        x.artifactRosterDenied === undefined &&
        R !== undefined &&
        R.accountUuid === y.accountUuid &&
        R.organizationUuid === y.organizationUuid &&
        R.version === roster.version &&
        arraysEqual(R.capabilities, roster.capabilities) &&
        R.fetchedAt <= now &&
        now - R.fetchedAt < ROSTER_CACHE_TTL_MS
      )
        return;
      return {
        cachedArtifactRoster: {
          ...y,
          version: roster.version,
          capabilities: [...roster.capabilities],
          fetchedAt: now,
        },
        artifactRosterDenied: undefined,
      };
    }).catch((error) => {
      logForDebugging(
        `Could not save the artifact capability roster to config; it will be fetched again next start: ${errorMessage(error)}`,
      );
    }),
  };
}
//@ chunk-06y4szbn.js:4415-4627 placement
async function saveRosterDenied(e, n, storageV5, s) {
  let h = rosterAccountKey();
  if (h === undefined || e.accountEpoch !== n) return;
  await saveGlobalConfig((b) => {
    if (e.accountEpoch !== n || rosterAccountKey()?.accountUuid !== h.accountUuid) return b;
    let y = s(h, b);
    return y === undefined
      ? b
      : {
          ...b,
          ...y,
        };
  }, storageV5);
}
export {
  rosterAccountKey,
  currentRoster,
  saveRosterToConfig,
  isHtmlCommentOnly,
  slackConnectorName,
  FORCE_REFUSED_SENTENCE,
  readCachedRoster,
  readRosterDenied,
  saveRosterDenied,
};
