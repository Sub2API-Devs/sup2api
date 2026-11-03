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

//@ chunk-aepeg2w5.js:596653-596743 placement
var growthbookFetchMap = identity_2(new WeakMap(), (e) => {
  let n = getPolyfills().fetch;
  while (n && e.has(n)) n = e.get(n);
  setPolyfills({
    fetch: n,
  });
});
//@ chunk-aepeg2w5.js:596743-596864 placement
/**
 * 为 GrowthBook 安装走代理的 fetch（只安装一次）。
 */
function installProxyFetchForGrowthBook() {
  let e = getPolyfills().fetch;
  if (!e || growthbookFetchMap.has(e)) return;
  let n = (r, s) =>
    e(r, {
      ...s,
      ...getProxyFetchOptions({
        url: r,
      }),
    });
  growthbookFetchMap.set(n, e);
  setPolyfills({
    fetch: n,
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
var commitSkillGateSlot = new GateReaderSlot_2();
//@ chunk-aepeg2w5.js:596981-597018 placement
function registerCommitSkillGateReader(e) {
  return commitSkillGateSlot.register(e);
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
  let { value: r, source } = reader(TENGU_CINDER_RELAY, false);
  if (source === "fallback") return r;
  setCommitSkillRolloutGateLatch(r);
  return r;
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
var verifySkillGateReaderSlot = new verifySkillGateSlot();
//@ chunk-aepeg2w5.js:597288-597325 placement
function registerVerifySkillGateReader(e) {
  return verifySkillGateReaderSlot.register(e);
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
  let { value: r, source } = reader(TENGU_OPAL_CIRCUIT, false);
  if (source === "fallback") return r;
  setVerifySkillRolloutGateLatch(r);
  return r;
}
export {
  installProxyFetchForGrowthBook,
  registerVerifySkillGateReader,
  registerCommitSkillGateReader,
  isCommitSkillRolloutOn,
  isVerifySkillRolloutOn,
};
