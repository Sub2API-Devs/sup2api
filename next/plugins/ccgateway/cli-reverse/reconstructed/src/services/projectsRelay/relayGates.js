/**
 * services/projectsRelay/relayGates.ts
 *
 * 2.1.316 新增：项目中继的开关与回退判断（tengu_opal_circuit、tengu_cinder_relay）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (12)
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

//@ chunk-exfmq47h.js:609137-609227 placement
var growthbookFetchMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:609137", () => {
  growthbookFetchMap = identity_2(new WeakMap(), (map) => {
    let original = getPolyfills().fetch;
    while (original && map.has(original)) original = map.get(original);
    setPolyfills({
      fetch: original,
    });
  });
});
//@ chunk-exfmq47h.js:609227-609348 placement
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
//@ chunk-exfmq47h.js:609348-609376 placement
var TENGU_CINDER_RELAY = "tengu_cinder_relay";
//@ chunk-exfmq47h.js:609376-609451 placement
class GateReaderSlot_2 {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
}
//@ chunk-exfmq47h.js:609451-609465 placement
var commitSkillGateSlot; // deferred: uses GateReaderSlot_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:609451", () => {
  commitSkillGateSlot = new GateReaderSlot_2();
});
//@ chunk-exfmq47h.js:609465-609502 placement
function registerCommitSkillGateReader(reader) {
  return commitSkillGateSlot.register(reader);
}
//@ chunk-exfmq47h.js:609502-609655 placement
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
//@ chunk-exfmq47h.js:609655-609683 placement
var TENGU_OPAL_CIRCUIT = "tengu_opal_circuit";
//@ chunk-exfmq47h.js:609683-609758 placement
class verifySkillGateSlot {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
}
//@ chunk-exfmq47h.js:609758-609772 placement
var verifySkillGateReaderSlot; // deferred: uses verifySkillGateSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:609758", () => {
  verifySkillGateReaderSlot = new verifySkillGateSlot();
});
//@ chunk-exfmq47h.js:609772-609809 placement
function registerVerifySkillGateReader(reader) {
  return verifySkillGateReaderSlot.register(reader);
}
//@ chunk-exfmq47h.js:609809-609962 placement
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
  isCommitSkillRolloutOn,
  installProxyFetchForGrowthBook,
  registerVerifySkillGateReader,
  registerCommitSkillGateReader,
  isVerifySkillRolloutOn,
};
