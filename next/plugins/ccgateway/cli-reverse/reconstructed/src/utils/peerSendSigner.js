/**
 * utils/peerSendSigner.ts
 *
 * 2.1.316 新增：对等发送签名。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-eb5q174j.js (3)
 * attribution: placement 3
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "./debug.js";
import { errorMessage } from "./errors.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { signClientEvent } from "./telemetry/clientEventUploader.js";
import { resolveCurrentDeviceBinding } from "../bridge/deviceBindingRecord.js";
import { bridgeOwnerAccount } from "./entrypointKinds.js";
import { readDeviceKeyOutcome, createClientEventSigner } from "../bridge/clientEventSigner.js";

//@ chunk-eb5q174j.js:5954-6099 placement
var SessionSecuritySchema = DoctorLazy(() => {
  let securitySchema = objectSchema({
    security_tier: stringSchema().nullish(),
    bound_device_uuid: stringSchema().nullish(),
  });
  return objectSchema({
    response_shape: securitySchema.nullish(),
    session: securitySchema.nullish(),
  });
});
//@ chunk-eb5q174j.js:6099-6276 placement
async function signForElevatedPeer(fetchSessionSecurity, event, context, options) {
  let signer = createPeerSendSigner(fetchSessionSecurity, options).catch((error) => {
    logForDebugging(`[peerSendSigner] event not signed: ${errorMessage(error)}`, {
      level: "warn",
    });
    logFeatureSad("peer_send_signer", "unavailable");
    return;
  });
  return signClientEvent(signer, event, context);
}
//@ chunk-eb5q174j.js:6276-6940 placement
/**
 * 创建跨会话发送签名器（账号、所有者、设备密钥校验）。
 */
async function createPeerSendSigner(fetchSessionSecurity, options) {
  let currentDeviceBinding = await resolveCurrentDeviceBinding(options);
  if (currentDeviceBinding.status === "mismatch") {
    logFeatureSad("peer_send_signer", "account_mismatch");
    return;
  }
  if (currentDeviceBinding.status !== "resolved") {
    logFeatureSad("peer_send_signer", "no_account");
    return;
  }
  let ownerAccount = bridgeOwnerAccount();
  if (
    ownerAccount &&
    ownerAccount.accountUuid.toLowerCase() !== currentDeviceBinding.accountUuid.toLowerCase()
  ) {
    logFeatureSad("peer_send_signer", "owner_mismatch");
    return;
  }
  let deviceKeyOutcome = await readDeviceKeyOutcome(currentDeviceBinding.accountUuid, options);
  if (deviceKeyOutcome.status !== "loaded") return;
  let parsed = SessionSecuritySchema().safeParse(await fetchSessionSecurity());
  let sessionSecurity = parsed.success ? (parsed.data.response_shape ?? parsed.data.session) : undefined;
  if (sessionSecurity?.security_tier !== "elevated") return;
  let lower = deviceKeyOutcome.rowPk.toLowerCase();
  let lower_2 = sessionSecurity.bound_device_uuid?.toLowerCase();
  if (lower_2 && lower_2 !== lower) {
    logFeatureSad("peer_send_signer", "bound_elsewhere");
    return;
  }
  logFeatureOk("peer_send_signer");
  return createClientEventSigner(lower, deviceKeyOutcome.key);
}
export { signForElevatedPeer };
