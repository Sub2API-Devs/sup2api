/**
 * bridge/clientEventSigner.ts
 *
 * 2.1.316 新增。JSON 规范化序列化（JCS），用于设备事件签名；本模块还提供客户端事件签名器。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xbe812hz.js (12)
 * attribution: placement 12
 */
import { createHash } from "crypto";
import { jsonStringifyRaw } from "../utils/slowOperations.js";
import { DEVICE_REGISTRY_KID_PREFIX } from "./deviceBinder.js";
import { resolveCurrentDeviceBinding } from "./deviceBindingRecord.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { loadRegisteredDevice } from "./deviceRegistry.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-xbe812hz.js:448-510 placement
var ANTHROPIC_CCR_CLIENT_EVENT_V1 = "anthropic.ccr.client_event.v1";
var JCS_LIB = "claude-code-jcs@1";
//@ chunk-xbe812hz.js:510-1277 placement
/**
 * JSON 规范化序列化（JCS），用于设备事件签名；本模块还提供客户端事件签名器。
 */
function canonicalJson(value) {
  let out = [];
  let stack = [];
  let emitValue = (node) => {
    if (node === null || typeof node === "boolean" || typeof node === "string")
      out.push(jsonStringifyRaw(node));
    else if (typeof node === "number") {
      if (!Number.isFinite(node)) throw Error("canonicalJson: non-finite number");
      out.push(String(node));
    } else if (Array.isArray(node)) {
      out.push("[");
      stack.push({
        values: Array.from(node, (item) => (item === undefined ? null : item)),
        next: 0,
      });
    } else if (typeof node === "object") {
      let object = node;
      let sorted = Object.keys(object)
        .filter((key) => object[key] !== undefined)
        .sort();
      out.push("{");
      stack.push({
        names: sorted,
        values: sorted.map((name) => object[name]),
        next: 0,
      });
    } else throw Error("canonicalJson: a value with no JSON form");
  };
  emitValue(value);
  while (stack.length > 0) {
    let last = stack.at(-1);
    if (last.next === last.values.length) {
      out.push(last.names ? "}" : "]");
      stack.pop();
      continue;
    }
    if (last.next > 0) out.push(",");
    if (last.names) out.push(`${jsonStringifyRaw(last.names[last.next])}:`);
    let child = last.values[last.next];
    last.next += 1;
    emitValue(child);
  }
  return out.join("");
}
//@ chunk-xbe812hz.js:1277-1486 placement (2.1.88 match: generateCodeChallenge, 0.89)
function generateCodeChallenge(rowPk, event) {
  let { uuid, type: eventType, ...payload } = event;
  let payloadHash = createHash("sha256").update(canonicalJson(payload), "utf8").digest();
  return Buffer.concat([
    Buffer.from(ANTHROPIC_CCR_CLIENT_EVENT_V1, "utf8"),
    buffer,
    Buffer.from(rowPk, "utf8"),
    buffer,
    Buffer.from(uuid, "utf8"),
    buffer,
    Buffer.from(eventType, "utf8"),
    buffer,
    payloadHash,
  ]);
}
//@ chunk-xbe812hz.js:1486-1509 placement
var buffer; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xbe812hz.js:1486", () => {
  buffer = Buffer.from([0]);
});
//@ chunk-xbe812hz.js:1509-1694 placement
function createClientEventSigner(rowPk, key) {
  let kid = DEVICE_REGISTRY_KID_PREFIX + rowPk;
  let signFailureNoted = false;
  return {
    noteSignFailure: () => {
      if (signFailureNoted) return false;
      signFailureNoted = true;
      return true;
    },
    sign: async (rowPk, event) => ({
      kid,
      signature: (await key.sign(generateCodeChallenge(rowPk, event))).toString("base64"),
      jcs_lib: JCS_LIB,
    }),
  };
}
//@ chunk-xbe812hz.js:1694-1817 placement
async function signerForBoundDevice({ accountUuid, boundDeviceUuid, credentials, held }) {
  return signerFromDeviceKeyOutcome(
    await readDeviceKeyOutcome(
      accountUuid,
      credentials,
      isSameDeviceRowPk(held?.rowPk, boundDeviceUuid) ? held : undefined,
    ),
    boundDeviceUuid,
  );
}
//@ chunk-xbe812hz.js:1817-2227 placement
async function deviceEventSignerOnceBoundHere(bindingPromise, credentials) {
  let binding = await resolveCurrentDeviceBinding(credentials).catch(() => {
    return;
  });
  if (binding?.status !== "resolved") return;
  let deviceKeyOutcome = await readDeviceKeyOutcome(binding.accountUuid, credentials);
  let signer;
  let issuedCount = 0;
  let appliedSeq = 0;
  let adoptWhenReady = (promise, makeSigner) => {
    let seq = ++issuedCount;
    promise.then(
      (boundUuid) => {
        if (seq > appliedSeq) {
          appliedSeq = seq;
          signer = makeSigner(boundUuid);
        }
      },
      () => {},
    );
  };
  adoptWhenReady(bindingPromise, (boundUuid) =>
    boundUuid === undefined ? undefined : signerFromDeviceKeyOutcome(deviceKeyOutcome, boundUuid),
  );
  return deviceKeyOutcome.status === "loaded"
    ? {
        sign: async (rowPk, event) => signer?.sign(rowPk, event),
        noteSignFailure: () => signer?.noteSignFailure() ?? false,
        rebind: (promise) =>
          adoptWhenReady(promise, (boundUuid) =>
            boundUuid !== undefined && isSameDeviceRowPk(deviceKeyOutcome.rowPk, boundUuid)
              ? (signer ?? signerFromDeviceKeyOutcome(deviceKeyOutcome, boundUuid))
              : undefined,
          ),
      }
    : undefined;
}
//@ chunk-xbe812hz.js:2227-2399 placement
async function deviceEventSignerFor(boundDeviceUuid, credentials, held) {
  let binding = await resolveCurrentDeviceBinding(credentials).catch(() => {
    return;
  });
  return binding?.status === "resolved"
    ? signerForBoundDevice({
        accountUuid: binding.accountUuid,
        boundDeviceUuid,
        credentials,
        held,
      })
    : undefined;
}
//@ chunk-xbe812hz.js:2399-2624 placement
async function deviceEventSignerIfBoundHere(boundDeviceUuid, credentials) {
  let binding = await resolveCurrentDeviceBinding(credentials).catch(() => {
    return;
  });
  if (binding?.status !== "resolved") return;
  let deviceKeyOutcome = await readDeviceKeyOutcome(binding.accountUuid, credentials);
  if (deviceKeyOutcome.status !== "loaded" || !isSameDeviceRowPk(deviceKeyOutcome.rowPk, boundDeviceUuid))
    return;
  logFeatureOk("client_event_signer");
  return createClientEventSigner(deviceKeyOutcome.rowPk, deviceKeyOutcome.key);
}
//@ chunk-xbe812hz.js:2624-2934 placement
async function readDeviceKeyOutcome(accountUuid, credentials, held) {
  if (held?.accountUuid === accountUuid)
    return {
      status: "loaded",
      rowPk: held.rowPk,
      key: held.key,
    };
  try {
    let registeredDevice = await loadRegisteredDevice(accountUuid, credentials);
    return registeredDevice === undefined
      ? {
          status: "no_device_key",
        }
      : {
          status: "loaded",
          rowPk: registeredDevice.rowPk,
          key: registeredDevice.key,
        };
  } catch (error) {
    logForDebugging(`[clientEventSigner] could not load the device key: ${errorMessage(error)}`);
    return {
      status: "load_failed",
    };
  }
}
//@ chunk-xbe812hz.js:2934-2977 placement
function isSameDeviceRowPk(rowPk, boundDeviceUuid) {
  return rowPk === boundDeviceUuid.toLowerCase();
}
//@ chunk-xbe812hz.js:2977-3222 placement
/**
 * 按设备密钥读取结果构造事件签名器，绑定到别处则不签
 */
function signerFromDeviceKeyOutcome(deviceKeyOutcome, boundDeviceUuid) {
  switch (deviceKeyOutcome.status) {
    case "no_device_key":
    case "load_failed":
      logFeatureBad("client_event_signer", deviceKeyOutcome.status);
      return;
    case "loaded":
      if (!isSameDeviceRowPk(deviceKeyOutcome.rowPk, boundDeviceUuid)) {
        logFeatureBad("client_event_signer", "bound_elsewhere");
        return;
      }
      logFeatureOk("client_event_signer");
      return createClientEventSigner(deviceKeyOutcome.rowPk, deviceKeyOutcome.key);
  }
}
export {
  readDeviceKeyOutcome,
  createClientEventSigner,
  deviceEventSignerFor,
  deviceEventSignerIfBoundHere,
  canonicalJson,
  JCS_LIB,
  deviceEventSignerOnceBoundHere,
};
