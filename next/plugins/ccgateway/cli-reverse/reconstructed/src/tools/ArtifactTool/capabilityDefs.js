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
/**
 * 能力相关各步骤的超时（拉取、合约、文档、探测与长操作）。
 */
var CAPABILITY_FETCH_TIMEOUT_MS = 5000;
var CAPABILITY_ROSTER_TIMEOUT_MS = 5000;
var CAPABILITY_DOC_TIMEOUT_MS = 5000;
var CAPABILITY_PROBE_TIMEOUT_MS = 5000;
var CAPABILITY_LONG_TIMEOUT_MS = 15000;
var CLAUDE = "claude";
var CLAUDE_DTS_PATH = `/${CLAUDE}.d.ts`;
//@ chunk-hantmvxa.js:6912-7297 placement
/**
 * 在总截止时间内逐个拉取能力合约定义（每个请求超时取单项上限与剩余时间的较小值），超时或失败时记 artifact_capability_defs 埋点并跳过。
 */
async function fetchCapabilityDefs(version, capabilities, credentials) {
  let defs = {};
  let deadline = performance.now() + CAPABILITY_LONG_TIMEOUT_MS;
  for (let capability of capabilities) {
    let remainingMs = deadline - performance.now();
    if (remainingMs <= 0) {
      logFeatureSad("artifact_capability_defs", "defs_deadline");
      break;
    }
    let contractDefs = await fetchContractDefs(version, capability, {
      timeoutMs: Math.min(CAPABILITY_ROSTER_TIMEOUT_MS, remainingMs),
      credentials,
    });
    if ("err" in contractDefs) {
      logFeatureSad("artifact_capability_defs", `defs_${contractDefs.cause}`);
      continue;
    }
    defs[`${version}/${capability}.d.ts`] = contractDefs.dts;
  }
  if (Object.keys(defs).length > 0) logFeatureOk("artifact_capability_defs");
  return defs;
}
//@ chunk-hantmvxa.js:7297-7391 placement
/**
 * 能力列表前补 claude（当存在 claude 且能力非空时）。
 */
function capabilitiesWithClaude(contract) {
  return contract.claude && contract.capabilities.length > 0
    ? [CLAUDE, ...contract.capabilities]
    : contract.capabilities;
}
//@ chunk-hantmvxa.js:7391-7689 placement
/**
 * 解析能力合约（清单与版本），保存到配置，再拉取各能力的定义；失败记埋点并返回 null。
 */
async function loadCapabilityRosterWithDefs({ credentials, storageV5 }) {
  let liveState = getLiveState();
  let epoch = liveState.accountEpoch;
  let contract = await resolveContract({
    timeoutMs: CAPABILITY_FETCH_TIMEOUT_MS,
    credentials,
  });
  if ("err" in contract) {
    logFeatureSad("artifact_capability_defs", `roster_${contract.cause}`);
    return null;
  }
  saveRosterToConfig({
    session: liveState,
    epoch,
    roster: contract,
    storageV5,
  });
  return {
    version: contract.version,
    defs: await fetchCapabilityDefs(contract.version, capabilitiesWithClaude(contract), credentials),
  };
}
export {
  CLAUDE_DTS_PATH,
  fetchCapabilityDefs,
  CAPABILITY_PROBE_TIMEOUT_MS,
  loadCapabilityRosterWithDefs,
  CAPABILITY_FETCH_TIMEOUT_MS,
  capabilitiesWithClaude,
  CAPABILITY_DOC_TIMEOUT_MS,
};
