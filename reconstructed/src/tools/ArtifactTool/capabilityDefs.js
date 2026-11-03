/**
 * tools/ArtifactTool/capabilityDefs.ts
 *
 * 2.1.316 新增：能力定义
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hantmvxa.js (4)
 * attribution: placement 4
 */
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { fetchContractDefs, resolveContract } from "../../services/artifacts/contract.js";
import { getLiveState } from "../../services/liveReplica/liveReplica.js";
import { saveRosterToConfig } from "../../services/artifacts/capabilityRoster.js";

//@ chunk-hantmvxa.js:6838-6912 placement
var ft = 5000,
  En = 5000,
  Sn = 5000,
  Tn = 5000,
  An = 15000,
  CLAUDE = "claude",
  yt = `/${CLAUDE}.d.ts`;
/**
 * 在总截止时间内逐个拉取能力合约定义（每个请求超时取单项上限与剩余时间的较小值），超时或失败时记 artifact_capability_defs 埋点并跳过。
 */
//@ chunk-hantmvxa.js:6912-7297 placement
async function fetchCapabilityDefs(e, n, s) {
  let r = {},
    h = performance.now() + An;
  for (let y of n) {
    let w = h - performance.now();
    if (w <= 0) {
      logFeatureSad("artifact_capability_defs", "defs_deadline");
      break;
    }
    let b = await fetchContractDefs(e, y, { timeoutMs: Math.min(En, w), credentials: s });
    if ("err" in b) {
      logFeatureSad("artifact_capability_defs", `defs_${b.cause}`);
      continue;
    }
    r[`${e}/${y}.d.ts`] = b.dts;
  }
  if (Object.keys(r).length > 0) logFeatureOk("artifact_capability_defs");
  return r;
}
//@ chunk-hantmvxa.js:7297-7391 placement
function bt(e) {
  return e.claude && e.capabilities.length > 0 ? [CLAUDE, ...e.capabilities] : e.capabilities;
}
/**
 * 解析能力合约（清单与版本），保存到配置，再拉取各能力的定义；失败记埋点并返回 null。
 */
//@ chunk-hantmvxa.js:7391-7689 placement
async function loadCapabilityRosterWithDefs({ credentials: credentials, storageV5: storageV5 }) {
  let s = getLiveState(),
    accountEpoch = s.accountEpoch,
    h = await resolveContract({ timeoutMs: ft, credentials: credentials });
  if ("err" in h) return (logFeatureSad("artifact_capability_defs", `roster_${h.cause}`), null);
  return (
    saveRosterToConfig({ session: s, epoch: accountEpoch, roster: h, storageV5: storageV5 }),
    { version: h.version, defs: await fetchCapabilityDefs(h.version, bt(h), credentials) }
  );
}

export { yt, fetchCapabilityDefs, Tn, loadCapabilityRosterWithDefs, ft, bt, Sn };
