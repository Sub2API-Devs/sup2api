/**
 * services/policyLimits/orgConfigGateFlag.ts
 *
 * 2.1.316 新增。读取组织配置必需开关并决定灰度分桶。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ad1qk1kv.js (6)
 * attribution: placement 6
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

//@ chunk-ad1qk1kv.js:346-423 placement
function readOrgConfigRequiredFlagWithSource() {
  let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
    TENGU_ORG_CONFIG_REQUIRED,
    null,
  );
  return { flag: readOrgConfigRequiredFlag(e), source: source };
}
//@ chunk-ad1qk1kv.js:423-570 placement
function readOrgConfigRequiredFlag(e) {
  let { flag: flag, problem: problem } = parseRelayFlag(e);
  if (problem !== void 0)
    logForDebugging(
      `org-config gate: ${TENGU_ORG_CONFIG_REQUIRED} is malformed (${problem}); treating as off`,
      { level: "warn" },
    );
  return flag;
}
/**
 * 读取组织配置必需开关并决定灰度分桶。
 */
//@ chunk-ad1qk1kv.js:570-686 placement
async function fetchOrgConfigRequiredFlagServedToBearer(e, r, o) {
  let a = await fetchFeatureValueServedToBearer(TENGU_ORG_CONFIG_REQUIRED, null, e, r, o);
  return a.served ? { flag: readOrgConfigRequiredFlag(a.value), source: "payload" } : void 0;
}
//@ chunk-ad1qk1kv.js:686-774 placement = ensureTaskListLockFile (0.505)
function orgConfigGateFlagCouldArm(e = readOrgConfigRequiredFlagWithSource, r = isGrowthBookCacheEmpty) {
  let { flag: flag, source: source } = e();
  return flag.enabled || (source === "fallback" && r());
}
//@ chunk-ad1qk1kv.js:774-890 placement
function orgConfigGateBucket(e) {
  let digest = createHash("sha256").update(`org_config_gate:${e}`).digest("hex");
  return parseInt(digest.slice(0, 8), 16) % 100;
}
//@ chunk-ad1qk1kv.js:890-938 placement
function inOrgConfigGateRollout(e, r) {
  return e.enabled && r < e.percent;
}

export {
  inOrgConfigGateRollout,
  orgConfigGateBucket,
  readOrgConfigRequiredFlagWithSource,
  fetchOrgConfigRequiredFlagServedToBearer,
};
