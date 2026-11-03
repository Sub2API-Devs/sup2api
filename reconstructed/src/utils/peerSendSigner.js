/**
 * utils/peerSendSigner.ts
 *
 * 2.1.316 新增：对等发送签名。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fwcps4x0.js (3)
 * attribution: placement 3
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o } from "../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "./debug.js";
import { errorMessage } from "./errors.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { signClientEvent } from "./telemetry/memorySummary.js";
import { resolveCurrentDeviceBinding } from "../bridge/deviceBindingRecord.js";
import { bridgeOwnerAccount } from "./entrypointKinds.js";
import { readDeviceKeyOutcome, createClientEventSigner } from "../bridge/clientEventSigner.js";

//@ chunk-fwcps4x0.js:5673-5818 placement
var SessionSecuritySchema = DoctorLazy(() => {
  let e = u({ security_tier: o().nullish(), bound_device_uuid: o().nullish() });
  return u({ response_shape: e.nullish(), session: e.nullish() });
});
//@ chunk-fwcps4x0.js:5818-5995 placement
async function signForElevatedPeer(e, i, n, a) {
  let r = createPeerSendSigner(e, a).catch((s) => {
    (logForDebugging(`[peerSendSigner] event not signed: ${errorMessage(s)}`, { level: "warn" }),
      logFeatureSad("peer_send_signer", "unavailable"));
    return;
  });
  return signClientEvent(r, i, n);
}
/**
 * 创建跨会话发送签名器（账号、所有者、设备密钥校验）。
 */
//@ chunk-fwcps4x0.js:5995-6658 placement
async function createPeerSendSigner(e, i) {
  let n = await resolveCurrentDeviceBinding(i);
  if (n.status === "mismatch") {
    logFeatureSad("peer_send_signer", "account_mismatch");
    return;
  }
  if (n.status !== "resolved") {
    logFeatureSad("peer_send_signer", "no_account");
    return;
  }
  let a = bridgeOwnerAccount();
  if (a && a.accountUuid.toLowerCase() !== n.accountUuid.toLowerCase()) {
    logFeatureSad("peer_send_signer", "owner_mismatch");
    return;
  }
  let r = await readDeviceKeyOutcome(n.accountUuid, i);
  if (r.status !== "loaded") return;
  let safeParse = SessionSecuritySchema().safeParse(await e()),
    c = safeParse.success ? (safeParse.data.response_shape ?? safeParse.data.session) : void 0;
  if (c?.security_tier !== "elevated") return;
  let lower = r.rowPk.toLowerCase(),
    m = c.bound_device_uuid?.toLowerCase();
  if (m && m !== lower) {
    logFeatureSad("peer_send_signer", "bound_elsewhere");
    return;
  }
  return (logFeatureOk("peer_send_signer"), createClientEventSigner(lower, r.key));
}
