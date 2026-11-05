/**
 * utils/teleport/seedAttestation.ts
 *
 * 2.1.316 新增：teleport 种子证明封装。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qhcf4xzy.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createHash, randomUUID } from "crypto";
import { canonicalJson, JCS_LIB } from "../../bridge/clientEventSigner.js";
import { uuidToBytes } from "../../bridge/deviceBinder.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { isPlainObject } from "../objectUtils.js";
import { normalizeJsonRoundTrip } from "../telemetry/clientEventUploader.js";
import { jsonStringify } from "../slowOperations.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";

//@ chunk-qhcf4xzy.js:5990-6075 placement
var buffer = Buffer.from("anthropic.ccr.create_session_event.v1", "utf8");
var buffer_2 = Buffer.from([0]);
//@ chunk-qhcf4xzy.js:6075-6704 placement
/**
 * 为种子事件生成证明：按 uuid 与类型拼接事件并计算摘要，含 NUL 时抛错。
 */
function createSeedAttestation(signedOver, events, signIndex) {
  let mapped = events.map((event) => {
    let { uuid, type, ...rest } = event;
    let eventUuid = typeof uuid === "string" ? uuid : "";
    let eventType = typeof type === "string" ? type : "";
    if (eventUuid.includes("\x00") || eventType.includes("\x00"))
      throw Error("createSeedAttestation: a NUL in an event uuid or type");
    return Buffer.concat([
      Buffer.from(eventUuid, "utf8"),
      buffer_2,
      Buffer.from(eventType, "utf8"),
      buffer_2,
      createHash("sha256").update(canonicalJson(rest), "utf8").digest(),
    ]);
  });
  let countBuffer = Buffer.alloc(4);
  countBuffer.writeUInt32BE(mapped.length);
  let issuedAtBuffer = Buffer.alloc(8);
  issuedAtBuffer.writeBigUInt64BE(BigInt(signedOver.issuedAtMs));
  return Buffer.concat([
    buffer,
    uuidToBytes(signedOver.orgUuid),
    uuidToBytes(signedOver.accountUuid),
    uuidToBytes(signedOver.deviceUuid),
    issuedAtBuffer,
    buffer_2,
    mapped[signIndex],
    createHash("sha256")
      .update(
        Buffer.concat([
          countBuffer,
          ...mapped.map((eventBytes) => createHash("sha256").update(eventBytes).digest()),
        ]),
      )
      .digest(),
  ]);
}
//@ chunk-qhcf4xzy.js:6704-7638 placement
async function createSeedSealer({ attestation, key, sample }) {
  try {
    let events = sample.events;
    let signedOver = attestation.signedOver;
    if (!Array.isArray(events) || signedOver === undefined) {
      logFeatureSad("create_seed_signature", "not_signable");
      return identitySealer;
    }
    let events_2 = [];
    let modeEventIndexes = [];
    for (let event of events) {
      let payload = isPlainObject(event) ? event.payload : undefined;
      if (!isPlainObject(payload)) {
        logFeatureSad("create_seed_signature", "not_signable");
        return identitySealer;
      }
      let isModeRequest = isSetPermissionModeRequest(payload);
      let normalizedPayload = normalizeJsonRoundTrip(
        isModeRequest && (typeof payload.uuid !== "string" || payload.uuid === "")
          ? {
              ...payload,
              uuid: randomUUID(),
            }
          : payload,
      );
      if (!isPlainObject(normalizedPayload)) {
        logFeatureSad("create_seed_signature", "not_signable");
        return identitySealer;
      }
      if (isModeRequest) modeEventIndexes.push(events_2.length);
      events_2.push(normalizedPayload);
    }
    if (modeEventIndexes.length === 0) return identitySealer;
    let signedOver_2 = {
      ...signedOver,
      deviceUuid: attestation.deviceUUID,
    };
    let mapped = events_2.map((payload) => ({
      payload,
    }));
    for (let eventIndex of modeEventIndexes)
      mapped[eventIndex].device_attestation = {
        kid: attestation.kid,
        signature: (await key.sign(createSeedAttestation(signedOver_2, events_2, eventIndex))).toString(
          "base64",
        ),
        jcs_lib: JCS_LIB,
      };
    logFeatureOk("create_seed_signature");
    let originalJson = jsonStringify(events);
    return (body) =>
      body.bind_attestation !== undefined && jsonStringify(body.events) === originalJson
        ? {
            ...body,
            events: mapped,
          }
        : body;
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
//@ chunk-qhcf4xzy.js:7638-7661 placement
function identitySealer(input) {
  return input;
}
//@ chunk-qhcf4xzy.js:7661-7767 placement
function isSetPermissionModeRequest(payload) {
  return (
    payload.type === "control_request" &&
    isPlainObject(payload.request) &&
    payload.request.subtype === "set_permission_mode"
  );
}
export { createSeedSealer };
