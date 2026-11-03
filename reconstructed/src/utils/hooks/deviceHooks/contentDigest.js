/**
 * utils/hooks/deviceHooks/contentDigest.ts
 *
 * 2.1.316 新增：设备钩子内容摘要与可展示判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mthxbav8.js (6)
 * attribution: placement 6
 */
import { MAX_DISPLAY_UNITS, hasVisibleText } from "../../permissions/approvalPayloadSerialization.js";
import { Hxs } from "../../../cli/headlessCloud/cloudPlugins.js";
import { createSignal } from "../../signal.js";
import { HostScoped } from "../../hostScoped.js";

//@ chunk-mthxbav8.js:2800-2824 placement
var mr = /^[0-9a-f]{64}$/;
//@ chunk-mthxbav8.js:2824-3075 placement
function isShowableToolInput(e) {
  let { description: description } = e,
    input = e.input;
  if (typeof input !== "object" || input === null) return !1;
  let keys = Object.keys(input),
    u = "content_digest" in input ? input.content_digest : void 0;
  return (
    typeof description === "string" &&
    description.length <= MAX_DISPLAY_UNITS &&
    hasVisibleText(description) &&
    keys.length === 1 &&
    typeof u === "string" &&
    mr.test(u)
  );
}
//@ chunk-mthxbav8.js:3075-3162 placement
function deviceProofState(e, n) {
  if (!isShowableToolInput(e)) return "unshowable";
  return n === !1 ? "proves_no_device" : void 0;
}
//@ chunk-mthxbav8.js:3162-3309 placement
function createGenerationCounter() {
  let e = new Map();
  return {
    known(n) {
      let max = Math.max(e.get(n) ?? 0, 1);
      return (e.set(n, max), max);
    },
    next(n) {
      let r = (e.get(n) ?? 0) + 1;
      return (e.set(n, r), r);
    },
  };
}
//@ chunk-mthxbav8.js:3309-3431 placement
function createDeviceProofState() {
  return {
    consentPin: Hxs(),
    generations: createGenerationCounter(),
    pointedToCommand: { shown: !1 },
    setAsideSessions: new Set(),
    decided: createSignal(),
  };
}
//@ chunk-mthxbav8.js:3431-3449 placement
var kpt = new HostScoped(createDeviceProofState);

export { deviceProofState, kpt };
