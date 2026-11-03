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
var ANTHROPIC_CCR_CLIENT_EVENT_V1 = "anthropic.ccr.client_event.v1",
  JCS_LIB = "claude-code-jcs@1";
/**
 * JSON 规范化序列化（JCS），用于设备事件签名；本模块还提供客户端事件签名器。
 */
//@ chunk-869v6e0e.js:509-1276 placement
function canonicalJson(r) {
  let n = [],
    o = [],
    i = (e) => {
      if (e === null || typeof e === "boolean" || typeof e === "string") n.push(jsonStringifyRaw(e));
      else if (typeof e === "number") {
        if (!Number.isFinite(e)) throw Error("canonicalJson: non-finite number");
        n.push(String(e));
      } else if (Array.isArray(e))
        (n.push("["), o.push({ values: Array.from(e, (s) => (s === void 0 ? null : s)), next: 0 }));
      else if (typeof e === "object") {
        let s = e,
          sorted = Object.keys(s)
            .filter((c) => s[c] !== void 0)
            .sort();
        (n.push("{"), o.push({ names: sorted, values: sorted.map((c) => s[c]), next: 0 }));
      } else throw Error("canonicalJson: a value with no JSON form");
    };
  i(r);
  while (o.length > 0) {
    let at = o.at(-1);
    if (at.next === at.values.length) {
      (n.push(at.names ? "}" : "]"), o.pop());
      continue;
    }
    if (at.next > 0) n.push(",");
    if (at.names) n.push(`${jsonStringifyRaw(at.names[at.next])}:`);
    let s = at.values[at.next];
    ((at.next += 1), i(s));
  }
  return n.join("");
}
//@ chunk-869v6e0e.js:1276-1485 placement = generateCodeChallenge (0.89)
function generateCodeChallenge(r, n) {
  let { uuid: uuid, type: i, ...e } = n,
    digest = createHash("sha256").update(canonicalJson(e), "utf8").digest();
  return Buffer.concat([
    Buffer.from(ANTHROPIC_CCR_CLIENT_EVENT_V1, "utf8"),
    buffer,
    Buffer.from(r, "utf8"),
    buffer,
    Buffer.from(uuid, "utf8"),
    buffer,
    Buffer.from(i, "utf8"),
    buffer,
    digest,
  ]);
}
//@ chunk-869v6e0e.js:1485-1508 placement
var buffer = Buffer.from([0]);
//@ chunk-869v6e0e.js:1508-1693 placement
function createClientEventSigner(r, n) {
  let o = DEVICE_REGISTRY_KID_PREFIX + r,
    i = !1;
  return {
    noteSignFailure: () => {
      if (i) return !1;
      return ((i = !0), !0);
    },
    sign: async (e, s) => ({
      kid: o,
      signature: (await n.sign(generateCodeChallenge(e, s))).toString("base64"),
      jcs_lib: JCS_LIB,
    }),
  };
}
//@ chunk-869v6e0e.js:1693-1816 placement
async function signerForBoundDevice({
  accountUuid: accountUuid,
  boundDeviceUuid: boundDeviceUuid,
  credentials: credentials,
  held: held,
}) {
  return signerFromDeviceKeyOutcome(
    await readDeviceKeyOutcome(accountUuid, credentials, v(held?.rowPk, boundDeviceUuid) ? held : void 0),
    boundDeviceUuid,
  );
}
//@ chunk-869v6e0e.js:1816-2225 placement
async function deviceEventSignerOnceBoundHere(r, n) {
  let o = await resolveCurrentDeviceBinding(n).catch(() => {
    return;
  });
  if (o?.status !== "resolved") return;
  let i = await readDeviceKeyOutcome(o.accountUuid, n),
    e,
    s = 0,
    l = 0,
    c = (a, u) => {
      let p = ++s;
      a.then(
        (S) => {
          if (p > l) ((l = p), (e = u(S)));
        },
        () => {},
      );
    };
  return (
    c(r, (a) => (a === void 0 ? void 0 : signerFromDeviceKeyOutcome(i, a))),
    i.status === "loaded"
      ? {
          sign: async (a, u) => e?.sign(a, u),
          noteSignFailure: () => e?.noteSignFailure() ?? !1,
          rebind: (a) =>
            c(a, (u) => (u !== void 0 && v(i.rowPk, u) ? (e ?? signerFromDeviceKeyOutcome(i, u)) : void 0)),
        }
      : void 0
  );
}
//@ chunk-869v6e0e.js:2225-2396 placement
async function deviceEventSignerFor(r, n, o) {
  let i = await resolveCurrentDeviceBinding(n).catch(() => {
    return;
  });
  return i?.status === "resolved"
    ? signerForBoundDevice({ accountUuid: i.accountUuid, boundDeviceUuid: r, credentials: n, held: o })
    : void 0;
}
//@ chunk-869v6e0e.js:2396-2620 placement
async function deviceEventSignerIfBoundHere(r, n) {
  let o = await resolveCurrentDeviceBinding(n).catch(() => {
    return;
  });
  if (o?.status !== "resolved") return;
  let i = await readDeviceKeyOutcome(o.accountUuid, n);
  if (i.status !== "loaded" || !v(i.rowPk, r)) return;
  return (logFeatureOk("client_event_signer"), createClientEventSigner(i.rowPk, i.key));
}
//@ chunk-869v6e0e.js:2620-2930 placement
async function readDeviceKeyOutcome(r, n, o) {
  if (o?.accountUuid === r) return { status: "loaded", rowPk: o.rowPk, key: o.key };
  try {
    let i = await loadRegisteredDevice(r, n);
    return i === void 0 ? { status: "no_device_key" } : { status: "loaded", rowPk: i.rowPk, key: i.key };
  } catch (error) {
    return (
      logForDebugging(`[clientEventSigner] could not load the device key: ${errorMessage(error)}`),
      { status: "load_failed" }
    );
  }
}
//@ chunk-869v6e0e.js:2930-2973 placement
function v(r, n) {
  return r === n.toLowerCase();
}
/**
 * 按设备密钥读取结果构造事件签名器，绑定到别处则不签
 */
//@ chunk-869v6e0e.js:2973-3218 placement
function signerFromDeviceKeyOutcome(r, n) {
  switch (r.status) {
    case "no_device_key":
    case "load_failed":
      logFeatureBad("client_event_signer", r.status);
      return;
    case "loaded":
      if (!v(r.rowPk, n)) {
        logFeatureBad("client_event_signer", "bound_elsewhere");
        return;
      }
      return (logFeatureOk("client_event_signer"), createClientEventSigner(r.rowPk, r.key));
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
