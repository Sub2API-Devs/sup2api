/**
 * services/projectsRelay/relayGates.ts
 *
 * 2.1.316 新增：项目中继的开关与回退判断（tengu_opal_circuit、tengu_cinder_relay）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (12)
 * attribution: placement 12
 */
import { identity as identity_2 } from "../../utils/identity.js";
import { getPolyfills, setPolyfills } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";
import {
  getCommitSkillRolloutGateLatch,
  setCommitSkillRolloutGateLatch,
  getVerifySkillRolloutGateLatch,
  setVerifySkillRolloutGateLatch,
} from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:596653-596743 placement
var growthbookFetchMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aepeg2w5.js:596653", () => {
  growthbookFetchMap = identity_2(new WeakMap(), (map) => {
    let original = getPolyfills().fetch;
    while (original && map.has(original)) original = map.get(original);
    setPolyfills({
      fetch: original,
    });
  });
});
//@ chunk-aepeg2w5.js:596743-596864 placement
/**
 * 为 GrowthBook 安装走代理的 fetch（只安装一次）。
 */
function installProxyFetchForGrowthBook() {
  let originalFetch = getPolyfills().fetch;
  if (!originalFetch || growthbookFetchMap.has(originalFetch)) return;
  let proxiedFetch = (url, options) =>
    originalFetch(url, {
      ...options,
      ...getProxyFetchOptions({
        url,
      }),
    });
  growthbookFetchMap.set(proxiedFetch, originalFetch);
  setPolyfills({
    fetch: proxiedFetch,
  });
}
//@ chunk-aepeg2w5.js:596864-596892 placement
var TENGU_CINDER_RELAY = "tengu_cinder_relay";
//@ chunk-aepeg2w5.js:596892-596967 placement
class GateReaderSlot_2 {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
}
//@ chunk-aepeg2w5.js:596967-596981 placement
var commitSkillGateSlot; // deferred: uses GateReaderSlot_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:596967", () => {
  commitSkillGateSlot = new GateReaderSlot_2();
});
//@ chunk-aepeg2w5.js:596981-597018 placement
function registerCommitSkillGateReader(reader) {
  return commitSkillGateSlot.register(reader);
}
//@ chunk-aepeg2w5.js:597018-597171 placement
/**
 * 读取 commit 技能灰度开关（结果一旦确定就锁存）。
 */
function isCommitSkillRolloutOn() {
  let commitSkillRolloutGateLatch = getCommitSkillRolloutGateLatch();
  if (commitSkillRolloutGateLatch !== null) return commitSkillRolloutGateLatch;
  let reader = commitSkillGateSlot.reader;
  if (!reader) return false;
  let { value, source } = reader(TENGU_CINDER_RELAY, false);
  if (source === "fallback") return value;
  setCommitSkillRolloutGateLatch(value);
  return value;
}
//@ chunk-aepeg2w5.js:597171-597199 placement
var TENGU_OPAL_CIRCUIT = "tengu_opal_circuit";
//@ chunk-aepeg2w5.js:597199-597274 placement
class verifySkillGateSlot {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
}
//@ chunk-aepeg2w5.js:597274-597288 placement
var verifySkillGateReaderSlot; // deferred: uses verifySkillGateSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:597274", () => {
  verifySkillGateReaderSlot = new verifySkillGateSlot();
});
//@ chunk-aepeg2w5.js:597288-597325 placement
function registerVerifySkillGateReader(reader) {
  return verifySkillGateReaderSlot.register(reader);
}
//@ chunk-aepeg2w5.js:597325-597478 placement
/**
 * 读取 verify 技能灰度开关（结果一旦确定就锁存）。
 */
function isVerifySkillRolloutOn() {
  let verifySkillRolloutGateLatch = getVerifySkillRolloutGateLatch();
  if (verifySkillRolloutGateLatch !== null) return verifySkillRolloutGateLatch;
  let reader = verifySkillGateReaderSlot.reader;
  if (!reader) return false;
  let { value, source } = reader(TENGU_OPAL_CIRCUIT, false);
  if (source === "fallback") return value;
  setVerifySkillRolloutGateLatch(value);
  return value;
}
export {
  installProxyFetchForGrowthBook,
  registerVerifySkillGateReader,
  registerCommitSkillGateReader,
  isCommitSkillRolloutOn,
  isVerifySkillRolloutOn,
};
