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
import { ge } from "../../utils/identity.js";
import { xn, Ps } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";
import {
  getCommitSkillRolloutGateLatch,
  setCommitSkillRolloutGateLatch,
  getVerifySkillRolloutGateLatch,
  setVerifySkillRolloutGateLatch,
} from "../../bootstrap/state.js";

//@ chunk-aepeg2w5.js:596653-596743 placement
var tC = ge(new WeakMap(), (e) => {
  let n = xn().fetch;
  while (n && e.has(n)) n = e.get(n);
  Ps({ fetch: n });
});
/**
 * 为 GrowthBook 安装走代理的 fetch（只安装一次）。
 */
//@ chunk-aepeg2w5.js:596743-596864 placement
function installProxyFetchForGrowthBook() {
  let e = xn().fetch;
  if (!e || tC.has(e)) return;
  let n = (r, s) => e(r, { ...s, ...getProxyFetchOptions({ url: r }) });
  (tC.set(n, e), Ps({ fetch: n }));
}
//@ chunk-aepeg2w5.js:596864-596892 placement
var TENGU_CINDER_RELAY = "tengu_cinder_relay";
//@ chunk-aepeg2w5.js:596892-596967 placement
class nC {
  reader = null;
  register(e) {
    let reader = this.reader;
    return ((this.reader = e), reader);
  }
}
//@ chunk-aepeg2w5.js:596967-596981 placement
var rC = new nC();
//@ chunk-aepeg2w5.js:596981-597018 placement
function oC(e) {
  return rC.register(e);
}
/**
 * 读取 commit 技能灰度开关（结果一旦确定就锁存）。
 */
//@ chunk-aepeg2w5.js:597018-597171 placement
function isCommitSkillRolloutOn() {
  let e = getCommitSkillRolloutGateLatch();
  if (e !== null) return e;
  let reader = rC.reader;
  if (!reader) return !1;
  let { value: r, source: source } = reader(TENGU_CINDER_RELAY, !1);
  if (source === "fallback") return r;
  return (setCommitSkillRolloutGateLatch(r), r);
}
//@ chunk-aepeg2w5.js:597171-597199 placement
var TENGU_OPAL_CIRCUIT = "tengu_opal_circuit";
//@ chunk-aepeg2w5.js:597199-597274 placement
class iC {
  reader = null;
  register(e) {
    let reader = this.reader;
    return ((this.reader = e), reader);
  }
}
//@ chunk-aepeg2w5.js:597274-597288 placement
var aC = new iC();
//@ chunk-aepeg2w5.js:597288-597325 placement
function lC(e) {
  return aC.register(e);
}
/**
 * 读取 verify 技能灰度开关（结果一旦确定就锁存）。
 */
//@ chunk-aepeg2w5.js:597325-597478 placement
function isVerifySkillRolloutOn() {
  let e = getVerifySkillRolloutGateLatch();
  if (e !== null) return e;
  let reader = aC.reader;
  if (!reader) return !1;
  let { value: r, source: source } = reader(TENGU_OPAL_CIRCUIT, !1);
  if (source === "fallback") return r;
  return (setVerifySkillRolloutGateLatch(r), r);
}

export { installProxyFetchForGrowthBook, lC, oC, isCommitSkillRolloutOn, isVerifySkillRolloutOn };
