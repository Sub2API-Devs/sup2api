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
import { Wis } from "../telemetry/memorySummary.js";
import { jsonStringify } from "../slowOperations.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";

//@ chunk-j2e9tjav.js:5710-5795 placement
var buffer = Buffer.from("anthropic.ccr.create_session_event.v1", "utf8"),
  buffer_2 = Buffer.from([0]);
/**
 * 为种子事件生成证明：按 uuid 与类型拼接事件并计算摘要，含 NUL 时抛错。
 */
//@ chunk-j2e9tjav.js:5795-6424 placement
function createSeedAttestation(n, events, l) {
  let mapped = events.map((s) => {
      let { uuid: uuid, type: a, ...y } = s,
        e = typeof uuid === "string" ? uuid : "",
        i = typeof a === "string" ? a : "";
      if (e.includes("\x00") || i.includes("\x00"))
        throw Error("createSeedAttestation: a NUL in an event uuid or type");
      return Buffer.concat([
        Buffer.from(e, "utf8"),
        buffer_2,
        Buffer.from(i, "utf8"),
        buffer_2,
        createHash("sha256").update(canonicalJson(y), "utf8").digest(),
      ]);
    }),
    alloc = Buffer.alloc(4);
  alloc.writeUInt32BE(mapped.length);
  let alloc_2 = Buffer.alloc(8);
  return (
    alloc_2.writeBigUInt64BE(BigInt(n.issuedAtMs)),
    Buffer.concat([
      buffer,
      uuidToBytes(n.orgUuid),
      uuidToBytes(n.accountUuid),
      uuidToBytes(n.deviceUuid),
      alloc_2,
      buffer_2,
      mapped[l],
      createHash("sha256")
        .update(Buffer.concat([alloc, ...mapped.map((s) => createHash("sha256").update(s).digest())]))
        .digest(),
    ])
  );
}
//@ chunk-j2e9tjav.js:6424-7358 placement
async function createSeedSealer({ attestation: attestation, key: key, sample: sample }) {
  try {
    let events = sample.events,
      signedOver = attestation.signedOver;
    if (!Array.isArray(events) || signedOver === void 0)
      return (logFeatureSad("create_seed_signature", "not_signable"), c);
    let o = [],
      s = [];
    for (let e of events) {
      let i = isPlainObject(e) ? e.payload : void 0;
      if (!isPlainObject(i)) return (logFeatureSad("create_seed_signature", "not_signable"), c);
      let S = isSetPermissionModeRequest(i),
        U = Wis(S && (typeof i.uuid !== "string" || i.uuid === "") ? { ...i, uuid: randomUUID() } : i);
      if (!isPlainObject(U)) return (logFeatureSad("create_seed_signature", "not_signable"), c);
      if (S) s.push(o.length);
      o.push(U);
    }
    if (s.length === 0) return c;
    let m = { ...signedOver, deviceUuid: attestation.deviceUUID },
      mapped = o.map((e) => ({ payload: e }));
    for (let e of s)
      mapped[e].device_attestation = {
        kid: attestation.kid,
        signature: (await key.sign(createSeedAttestation(m, o, e))).toString("base64"),
        jcs_lib: JCS_LIB,
      };
    logFeatureOk("create_seed_signature");
    let y = jsonStringify(events);
    return (e) =>
      e.bind_attestation !== void 0 && jsonStringify(e.events) === y ? { ...e, events: mapped } : e;
  } catch (error) {
    return (
      logForDebugging(
        `[createSeedAttestation] the create's permission mode goes unsigned: ${errorMessage(error)}`,
        { level: "warn" },
      ),
      logFeatureSad("create_seed_signature", "sign_failed"),
      c
    );
  }
}
//@ chunk-j2e9tjav.js:7358-7381 placement
function c(n) {
  return n;
}
//@ chunk-j2e9tjav.js:7381-7487 placement
function isSetPermissionModeRequest(n) {
  return (
    n.type === "control_request" && isPlainObject(n.request) && n.request.subtype === "set_permission_mode"
  );
}
