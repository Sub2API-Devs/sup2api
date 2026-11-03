/**
 * bridge/clientEventSigner.ts
 *
 * 2.1.316 新增。JSON 规范化序列化（JCS），用于设备事件签名；本模块还提供客户端事件签名器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-869v6e0e.js (12)
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

//@ chunk-869v6e0e.js:447-509 placement
var ANTHROPIC_CCR_CLIENT_EVENT_V1 = "anthropic.ccr.client_event.v1";
var JCS_LIB = "claude-code-jcs@1";
//@ chunk-869v6e0e.js:509-1276 placement
/**
 * JSON 规范化序列化（JCS），用于设备事件签名；本模块还提供客户端事件签名器。
 */
function canonicalJson(r) {
  let n = [];
  let o = [];
  let i = (e) => {
    if (e === null || typeof e === "boolean" || typeof e === "string") n.push(jsonStringifyRaw(e));
    else if (typeof e === "number") {
      if (!Number.isFinite(e)) throw Error("canonicalJson: non-finite number");
      n.push(String(e));
    } else if (Array.isArray(e)) {
      n.push("[");
      o.push({
        values: Array.from(e, (s) => (s === undefined ? null : s)),
        next: 0,
      });
    } else if (typeof e === "object") {
      let s = e;
      let sorted = Object.keys(s)
        .filter((key) => s[key] !== undefined)
        .sort();
      n.push("{");
      o.push({
        names: sorted,
        values: sorted.map((c) => s[c]),
        next: 0,
      });
    } else throw Error("canonicalJson: a value with no JSON form");
  };
  i(r);
  while (o.length > 0) {
    let last = o.at(-1);
    if (last.next === last.values.length) {
      n.push(last.names ? "}" : "]");
      o.pop();
      continue;
    }
    if (last.next > 0) n.push(",");
    if (last.names) n.push(`${jsonStringifyRaw(last.names[last.next])}:`);
    let s = last.values[last.next];
    last.next += 1;
    i(s);
  }
  return n.join("");
}
//@ chunk-869v6e0e.js:1276-1485 placement = generateCodeChallenge (0.89)
function generateCodeChallenge(r, n) {
  let { uuid, type: i, ...e } = n;
  let s = createHash("sha256").update(canonicalJson(e), "utf8").digest();
  return Buffer.concat([
    Buffer.from(ANTHROPIC_CCR_CLIENT_EVENT_V1, "utf8"),
    buffer,
    Buffer.from(r, "utf8"),
    buffer,
    Buffer.from(uuid, "utf8"),
    buffer,
    Buffer.from(i, "utf8"),
    buffer,
    s,
  ]);
}
//@ chunk-869v6e0e.js:1485-1508 placement
var buffer = Buffer.from([0]);
//@ chunk-869v6e0e.js:1508-1693 placement
function createClientEventSigner(rowPk, key) {
  let kid = DEVICE_REGISTRY_KID_PREFIX + rowPk;
  let i = false;
  return {
    noteSignFailure: () => {
      if (i) return false;
      i = true;
      return true;
    },
    sign: async (e, s) => ({
      kid,
      signature: (await key.sign(generateCodeChallenge(e, s))).toString("base64"),
      jcs_lib: JCS_LIB,
    }),
  };
}
//@ chunk-869v6e0e.js:1693-1816 placement
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
//@ chunk-869v6e0e.js:1816-2225 placement
async function deviceEventSignerOnceBoundHere(r, n) {
  let o = await resolveCurrentDeviceBinding(n).catch(() => {
    return;
  });
  if (o?.status !== "resolved") return;
  let deviceKeyOutcome = await readDeviceKeyOutcome(o.accountUuid, n);
  let e;
  let s = 0;
  let l = 0;
  let c = (a, u) => {
    let p = ++s;
    a.then(
      (S) => {
        if (p > l) {
          l = p;
          e = u(S);
        }
      },
      () => {},
    );
  };
  c(r, (a) => (a === undefined ? undefined : signerFromDeviceKeyOutcome(deviceKeyOutcome, a)));
  return deviceKeyOutcome.status === "loaded"
    ? {
        sign: async (a, u) => e?.sign(a, u),
        noteSignFailure: () => e?.noteSignFailure() ?? false,
        rebind: (a) =>
          c(a, (u) =>
            u !== undefined && isSameDeviceRowPk(deviceKeyOutcome.rowPk, u)
              ? (e ?? signerFromDeviceKeyOutcome(deviceKeyOutcome, u))
              : undefined,
          ),
      }
    : undefined;
}
//@ chunk-869v6e0e.js:2225-2396 placement
async function deviceEventSignerFor(boundDeviceUuid, credentials, held) {
  let i = await resolveCurrentDeviceBinding(credentials).catch(() => {
    return;
  });
  return i?.status === "resolved"
    ? signerForBoundDevice({
        accountUuid: i.accountUuid,
        boundDeviceUuid,
        credentials,
        held,
      })
    : undefined;
}
//@ chunk-869v6e0e.js:2396-2620 placement
async function deviceEventSignerIfBoundHere(boundDeviceUuid, credentials) {
  let o = await resolveCurrentDeviceBinding(credentials).catch(() => {
    return;
  });
  if (o?.status !== "resolved") return;
  let deviceKeyOutcome = await readDeviceKeyOutcome(o.accountUuid, credentials);
  if (deviceKeyOutcome.status !== "loaded" || !isSameDeviceRowPk(deviceKeyOutcome.rowPk, boundDeviceUuid))
    return;
  logFeatureOk("client_event_signer");
  return createClientEventSigner(deviceKeyOutcome.rowPk, deviceKeyOutcome.key);
}
//@ chunk-869v6e0e.js:2620-2930 placement
async function readDeviceKeyOutcome(accountUuid, n, o) {
  if (o?.accountUuid === accountUuid)
    return {
      status: "loaded",
      rowPk: o.rowPk,
      key: o.key,
    };
  try {
    let registeredDevice = await loadRegisteredDevice(accountUuid, n);
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
//@ chunk-869v6e0e.js:2930-2973 placement
function isSameDeviceRowPk(rowPk, n) {
  return rowPk === n.toLowerCase();
}
//@ chunk-869v6e0e.js:2973-3218 placement
/**
 * 按设备密钥读取结果构造事件签名器，绑定到别处则不签
 */
function signerFromDeviceKeyOutcome(deviceKeyOutcome, n) {
  switch (deviceKeyOutcome.status) {
    case "no_device_key":
    case "load_failed":
      logFeatureBad("client_event_signer", deviceKeyOutcome.status);
      return;
    case "loaded":
      if (!isSameDeviceRowPk(deviceKeyOutcome.rowPk, n)) {
        logFeatureBad("client_event_signer", "bound_elsewhere");
        return;
      }
      logFeatureOk("client_event_signer");
      return createClientEventSigner(deviceKeyOutcome.rowPk, deviceKeyOutcome.key);
  }
}
export {
  deviceEventSignerFor,
  deviceEventSignerIfBoundHere,
  readDeviceKeyOutcome,
  createClientEventSigner,
  canonicalJson,
  JCS_LIB,
};
