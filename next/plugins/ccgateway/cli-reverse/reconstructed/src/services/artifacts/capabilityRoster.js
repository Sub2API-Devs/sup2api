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
import { objectSchema, stringSchema, array, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { invalidateOverageCreditGrantCache } from "../api/overageCreditGrant.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { arraysEqual } from "../../utils/collections.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-06y4szbn.js:2054-2124 placement
function slackConnectorName() {
  return isServerIdentityActive() ? "slack_example_com" : "claude_ai_Slack_beta";
}
//@ chunk-06y4szbn.js:2156-2290 placement
var FORCE_REFUSED_SENTENCE =
  " The server refuses force:true over a version saved from inside the page; only a publish built on that version is accepted.";
//@ chunk-06y4szbn.js:2290-2537 placement
function isHtmlCommentOnly(html) {
  let trimmed = html.trimEnd();
  if (!trimmed.startsWith("<!--") || !trimmed.endsWith("-->") || trimmed.length < 7) return false;
  let sliced = trimmed.slice(4, -3);
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
var CAPABILITY_ROSTER_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var CAPABILITY_DENIAL_SCHEMA;
deferInit("chunk-06y4szbn.js:2839", () => {
  CAPABILITY_ROSTER_SCHEMA = DoctorLazy(() =>
    objectSchema({
      accountUuid: stringSchema(),
      organizationUuid: stringSchema().nullable(),
      version: stringSchema(),
      capabilities: array(stringSchema()),
      fetchedAt: numberSchema(),
    }),
  );
  CAPABILITY_DENIAL_SCHEMA = DoctorLazy(() =>
    objectSchema({
      accountUuid: stringSchema(),
      organizationUuid: stringSchema().nullable(),
      status: numberSchema(),
      deniedAt: numberSchema(),
      tokenExpiresAt: numberSchema(),
    }),
  );
});
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
  let cachedRoster = env.CLAUDE_CODE_REMOTE ? undefined : readCachedRoster();
  return cachedRoster === undefined
    ? undefined
    : {
        roster: cachedRoster,
        source: "disk",
      };
}
//@ chunk-06y4szbn.js:3521-3536 placement
var ROSTER_CACHE_TTL_MS = 3600000;
//@ chunk-06y4szbn.js:3536-4415 placement
/**
 * 把 artifact 能力名册（capability roster）写入全局配置缓存，账号/epoch 不一致时放弃。
 */
function saveRosterToConfig(options) {
  let { session, epoch, roster, storageV5 } = options;
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
    persisted: saveRosterDenied(session, epoch, storageV5, (key, config) => {
      let parsed = CAPABILITY_ROSTER_SCHEMA().safeParse(config.cachedArtifactRoster);
      let cachedRosterValue = parsed.success ? parsed.data : undefined;
      let now = Date.now();
      if (
        config.artifactRosterDenied === undefined &&
        cachedRosterValue !== undefined &&
        cachedRosterValue.accountUuid === key.accountUuid &&
        cachedRosterValue.organizationUuid === key.organizationUuid &&
        cachedRosterValue.version === roster.version &&
        arraysEqual(cachedRosterValue.capabilities, roster.capabilities) &&
        cachedRosterValue.fetchedAt <= now &&
        now - cachedRosterValue.fetchedAt < ROSTER_CACHE_TTL_MS
      )
        return;
      return {
        cachedArtifactRoster: {
          ...key,
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
async function saveRosterDenied(session, epoch, storageV5, denied) {
  let accountKey = rosterAccountKey();
  if (accountKey === undefined || session.accountEpoch !== epoch) return;
  await saveGlobalConfig((config) => {
    if (session.accountEpoch !== epoch || rosterAccountKey()?.accountUuid !== accountKey.accountUuid)
      return config;
    let result = denied(accountKey, config);
    return result === undefined
      ? config
      : {
          ...config,
          ...result,
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
