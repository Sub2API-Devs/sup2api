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
import { emptyConsentState } from "../../../cli/headlessCloud/cloudPlugins.js";
import { createSignal } from "../../signal.js";
import { HostScoped } from "../../hostScoped.js";

//@ chunk-mthxbav8.js:2800-2824 placement
var SHA256_HEX_RE = /^[0-9a-f]{64}$/;
//@ chunk-mthxbav8.js:2824-3075 placement
function isShowableToolInput(e) {
  let { description } = e;
  let input = e.input;
  if (typeof input !== "object" || input === null) return false;
  let keys = Object.keys(input);
  let contentDigest = "content_digest" in input ? input.content_digest : undefined;
  return (
    typeof description === "string" &&
    description.length <= MAX_DISPLAY_UNITS &&
    hasVisibleText(description) &&
    keys.length === 1 &&
    typeof contentDigest === "string" &&
    SHA256_HEX_RE.test(contentDigest)
  );
}
//@ chunk-mthxbav8.js:3075-3162 placement
function deviceProofState(e, n) {
  if (!isShowableToolInput(e)) return "unshowable";
  return n === false ? "proves_no_device" : undefined;
}
//@ chunk-mthxbav8.js:3162-3309 placement
function createGenerationCounter() {
  let e = new Map();
  return {
    known(n) {
      let max = Math.max(e.get(n) ?? 0, 1);
      e.set(n, max);
      return max;
    },
    next(n) {
      let r = (e.get(n) ?? 0) + 1;
      e.set(n, r);
      return r;
    },
  };
}
//@ chunk-mthxbav8.js:3309-3431 placement
function createDeviceProofState() {
  return {
    consentPin: emptyConsentState(),
    generations: createGenerationCounter(),
    pointedToCommand: {
      shown: false,
    },
    setAsideSessions: new Set(),
    decided: createSignal(),
  };
}
//@ chunk-mthxbav8.js:3431-3449 placement
/**
 * 宿主隔离的设备证明状态注册表。
 */
var deviceProofStateRegistry = new HostScoped(createDeviceProofState);
export { deviceProofState, deviceProofStateRegistry };
