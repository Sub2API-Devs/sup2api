/**
 * utils/hooks/deviceHooks/contentDigest.ts
 *
 * 2.1.316 新增：设备钩子内容摘要与可展示判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4z1ntdgk.js (6)
 * attribution: placement 6
 */
import { MAX_DISPLAY_UNITS, hasVisibleText } from "../../permissions/approvalPayloadSerialization.js";
import { emptyConsentState } from "../../../cli/headlessCloud/cloudPlugins.js";
import { createSignal } from "../../signal.js";
import { HostScoped } from "../../hostScoped.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-4z1ntdgk.js:3157-3181 placement
var SHA256_HEX_RE = /^[0-9a-f]{64}$/;
//@ chunk-4z1ntdgk.js:3181-3432 placement
function isShowableToolInput(call) {
  let { description } = call;
  let input = call.input;
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
//@ chunk-4z1ntdgk.js:3432-3519 placement
function deviceProofState(call, provesNoDevice) {
  if (!isShowableToolInput(call)) return "unshowable";
  return provesNoDevice === false ? "proves_no_device" : undefined;
}
//@ chunk-4z1ntdgk.js:3519-3666 placement
function createGenerationCounter() {
  let counters = new Map();
  return {
    known(key) {
      let max = Math.max(counters.get(key) ?? 0, 1);
      counters.set(key, max);
      return max;
    },
    next(key) {
      let value = (counters.get(key) ?? 0) + 1;
      counters.set(key, value);
      return value;
    },
  };
}
//@ chunk-4z1ntdgk.js:3666-3788 placement
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
//@ chunk-4z1ntdgk.js:3788-3806 placement
/**
 * 宿主隔离的设备证明状态注册表。
 */
var deviceProofStateRegistry; // deferred: uses createDeviceProofState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4z1ntdgk.js:3788", () => {
  deviceProofStateRegistry = new HostScoped(createDeviceProofState);
});
export { deviceProofState, deviceProofStateRegistry };
