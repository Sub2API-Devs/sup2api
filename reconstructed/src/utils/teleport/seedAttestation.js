/**
 * utils/teleport/seedAttestation.ts
 *
 * 2.1.316 新增：teleport 种子证明封装。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-j2e9tjav.js (5)
 * attribution: placement 5
 */
import { createHash, randomUUID } from "crypto";
import { canonicalJson, JCS_LIB } from "../../bridge/clientEventSigner.js";
import { uuidToBytes } from "../../bridge/deviceBinder.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { isPlainObject } from "../objectUtils.js";
import { normalizeJsonRoundTrip } from "../telemetry/memorySummary.js";
import { jsonStringify } from "../slowOperations.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";

//@ chunk-j2e9tjav.js:5710-5795 placement
var buffer = Buffer.from("anthropic.ccr.create_session_event.v1", "utf8");
var buffer_2 = Buffer.from([0]);
//@ chunk-j2e9tjav.js:5795-6424 placement
/**
 * 为种子事件生成证明：按 uuid 与类型拼接事件并计算摘要，含 NUL 时抛错。
 */
function createSeedAttestation(n, events, l) {
  let mapped = events.map((event) => {
    let { uuid, type: a, ...y } = event;
    let e = typeof uuid === "string" ? uuid : "";
    let i = typeof a === "string" ? a : "";
    if (e.includes("\x00") || i.includes("\x00"))
      throw Error("createSeedAttestation: a NUL in an event uuid or type");
    return Buffer.concat([
      Buffer.from(e, "utf8"),
      buffer_2,
      Buffer.from(i, "utf8"),
      buffer_2,
      createHash("sha256").update(canonicalJson(y), "utf8").digest(),
    ]);
  });
  let u = Buffer.alloc(4);
  u.writeUInt32BE(mapped.length);
  let o = Buffer.alloc(8);
  o.writeBigUInt64BE(BigInt(n.issuedAtMs));
  return Buffer.concat([
    buffer,
    uuidToBytes(n.orgUuid),
    uuidToBytes(n.accountUuid),
    uuidToBytes(n.deviceUuid),
    o,
    buffer_2,
    mapped[l],
    createHash("sha256")
      .update(Buffer.concat([u, ...mapped.map((s) => createHash("sha256").update(s).digest())]))
      .digest(),
  ]);
}
//@ chunk-j2e9tjav.js:6424-7358 placement
async function createSeedSealer({ attestation, key, sample }) {
  try {
    let events = sample.events;
    let signedOver = attestation.signedOver;
    if (!Array.isArray(events) || signedOver === undefined) {
      logFeatureSad("create_seed_signature", "not_signable");
      return identitySealer;
    }
    let events_2 = [];
    let s = [];
    for (let event of events) {
      let payload = isPlainObject(event) ? event.payload : undefined;
      if (!isPlainObject(payload)) {
        logFeatureSad("create_seed_signature", "not_signable");
        return identitySealer;
      }
      let S = isSetPermissionModeRequest(payload);
      let U = normalizeJsonRoundTrip(
        S && (typeof payload.uuid !== "string" || payload.uuid === "")
          ? {
              ...payload,
              uuid: randomUUID(),
            }
          : payload,
      );
      if (!isPlainObject(U)) {
        logFeatureSad("create_seed_signature", "not_signable");
        return identitySealer;
      }
      if (S) s.push(events_2.length);
      events_2.push(U);
    }
    if (s.length === 0) return identitySealer;
    let m = {
      ...signedOver,
      deviceUuid: attestation.deviceUUID,
    };
    let mapped = events_2.map((payload) => ({
      payload,
    }));
    for (let e of s)
      mapped[e].device_attestation = {
        kid: attestation.kid,
        signature: (await key.sign(createSeedAttestation(m, events_2, e))).toString("base64"),
        jcs_lib: JCS_LIB,
      };
    logFeatureOk("create_seed_signature");
    let y = jsonStringify(events);
    return (e) =>
      e.bind_attestation !== undefined && jsonStringify(e.events) === y
        ? {
            ...e,
            events: mapped,
          }
        : e;
  } catch (error) {
    logForDebugging(
      `[createSeedAttestation] the create's permission mode goes unsigned: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    logFeatureSad("create_seed_signature", "sign_failed");
    return identitySealer;
  }
}
//@ chunk-j2e9tjav.js:7358-7381 placement
function identitySealer(n) {
  return n;
}
//@ chunk-j2e9tjav.js:7381-7487 placement
function isSetPermissionModeRequest(payload) {
  return (
    payload.type === "control_request" &&
    isPlainObject(payload.request) &&
    payload.request.subtype === "set_permission_mode"
  );
}
