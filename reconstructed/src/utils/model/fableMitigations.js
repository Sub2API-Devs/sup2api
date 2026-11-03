/**
 * utils/model/fableMitigations.ts
 *
 * 2.1.316 新增。Fable 模型的缓解措施。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m8whhcc1.js (5)
 * attribution: placement 5
 */
import { modelSupportsCapability } from "./modelCatalog.js";
import { isLocalAgentOrCowork } from "../entrypointKinds.js";

/**
 * 判断模型是否需要 Fable 5 缓解措施（按能力声明，claude-mythos-5 默认需要）。
 */
//@ chunk-m8whhcc1.js:264-383 placement
function needsFableMitigations(o, n) {
  let e = modelSupportsCapability(o, "fable_5_mitigations", n);
  if (e !== void 0) return e;
  if (o === "claude-mythos-5") return !0;
  return !1;
}
//@ chunk-m8whhcc1.js:383-450 placement
function YFe(o) {
  return !isLocalAgentOrCowork() && modelSupportsCapability(o, "fable_5_1_prompt_bundle") === !0;
}
//@ chunk-m8whhcc1.js:450-503 placement
function e5e(o) {
  return o.startsWith("claude-fable-");
}
//@ chunk-m8whhcc1.js:503-557 placement
function Thi(o) {
  return o.startsWith("claude-mythos-");
}
//@ chunk-m8whhcc1.js:557-582 placement
function ycr(o) {
  return !1;
}

export { needsFableMitigations, e5e, ycr, YFe, Thi };
