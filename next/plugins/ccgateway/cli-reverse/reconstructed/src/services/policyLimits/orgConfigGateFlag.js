/**
 * services/policyLimits/orgConfigGateFlag.ts
 *
 * 2.1.316 新增。读取组织配置必需开关并决定灰度分桶。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1w8nnvss.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createHash } from "crypto";
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  fetchFeatureValueServedToBearer,
  isGrowthBookCacheEmpty,
} from "../analytics/growthbook.js";
import { TENGU_ORG_CONFIG_REQUIRED } from "./orgConfigRequired.js";
import { parseRelayFlag } from "../../utils/messageProvenance.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-1w8nnvss.js:346-423 placement
function readOrgConfigRequiredFlagWithSource() {
  let { value, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_ORG_CONFIG_REQUIRED, null);
  return {
    flag: readOrgConfigRequiredFlag(value),
    source,
  };
}
//@ chunk-1w8nnvss.js:423-570 placement
function readOrgConfigRequiredFlag(value) {
  let { flag, problem } = parseRelayFlag(value);
  if (problem !== undefined)
    logForDebugging(
      `org-config gate: ${TENGU_ORG_CONFIG_REQUIRED} is malformed (${problem}); treating as off`,
      {
        level: "warn",
      },
    );
  return flag;
}
//@ chunk-1w8nnvss.js:570-686 placement
/**
 * 读取组织配置必需开关并决定灰度分桶。
 */
async function fetchOrgConfigRequiredFlagServedToBearer(accessToken, identity, timeoutMs) {
  let featureValueServedToBearer = await fetchFeatureValueServedToBearer(
    TENGU_ORG_CONFIG_REQUIRED,
    null,
    accessToken,
    identity,
    timeoutMs,
  );
  return featureValueServedToBearer.served
    ? {
        flag: readOrgConfigRequiredFlag(featureValueServedToBearer.value),
        source: "payload",
      }
    : undefined;
}
//@ chunk-1w8nnvss.js:686-774 placement (2.1.88 match: ensureTaskListLockFile, 0.505)
function orgConfigGateFlagCouldArm(
  readFlag = readOrgConfigRequiredFlagWithSource,
  isCacheEmpty = isGrowthBookCacheEmpty,
) {
  let { flag, source } = readFlag();
  return flag.enabled || (source === "fallback" && isCacheEmpty());
}
//@ chunk-1w8nnvss.js:774-890 placement
function orgConfigGateBucket(identity) {
  let hex = createHash("sha256").update(`org_config_gate:${identity}`).digest("hex");
  return parseInt(hex.slice(0, 8), 16) % 100;
}
//@ chunk-1w8nnvss.js:890-938 placement
function inOrgConfigGateRollout(flag, bucket) {
  return flag.enabled && bucket < flag.percent;
}
export {
  inOrgConfigGateRollout,
  orgConfigGateBucket,
  readOrgConfigRequiredFlagWithSource,
  fetchOrgConfigRequiredFlagServedToBearer,
  orgConfigGateFlagCouldArm,
};
