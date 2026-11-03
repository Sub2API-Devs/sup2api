/**
 * components/cloud/HostDeviceMcpConsent.tsx
 *
 * 2.1.316 新增：询问是否把本机 MCP 服务器共享给云会话（首次/重新同意），记录 tengu_device_mcp_host_consent。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8fq1kyxh.js (1)
 * attribution: placement 1
 */
import { hostname } from "os";
import { isAttachServeEnabled } from "../../cli/headlessCloud/attachServe.js";
import { isRemoteToolServingSwitchOn } from "../../services/remoteTools/servingGates.js";
import { getDeviceBindingRefusal } from "../../bridge/deviceBindingPolicy.js";
import {
  readDeviceMcpSnapshot,
  createSnapshotStore,
  Ipo,
  Ppo,
  writeDeviceMcpSnapshot,
  applyConsentChoice,
} from "../../services/deviceBridge/deviceMcpSnapshot.js";
import {
  readDeviceMcpConsent,
  deviceMcpConsentStore,
  writeDeviceMcpNotNow,
  deviceMcpNotNowStore,
  clearDeviceMcpNotNow,
  ppt,
  readDeviceMcpNotNow,
  t9,
  writeDeviceMcpConsent,
} from "../../services/deviceBridge/deviceMcpConsent.js";
import { Do } from "../../utils/git/gitSafeEnv.js";
import {
  getDeviceBridgeMcpServers,
  isDeviceBridgeTransport,
  isForwardableDeviceMcp,
} from "../../services/mcp/deviceMcpServers.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { CZt, buildMcpServeConsentPayload } from "../../cli/headlessCloud/consent.js";
import { normalizeHostname } from "../../services/remoteTools/unattendedConsentStore.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logForDebugging } from "../../utils/debug.js";
import { isAbortError, errorMessage } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";

/**
 * 询问是否把本机 MCP 服务器共享给云会话（首次/重新同意），记录 tengu_device_mcp_host_consent。
 */
//@ chunk-8fq1kyxh.js:12735-15635 placement
async function askHostDeviceMcpConsent({
  dialogs: dialogs,
  storageV5: storageV5,
  signal: signal,
  seams: seams = {},
}) {
  let e = { kind: "not_asked" };
  try {
    if (
      dialogs === void 0 ||
      !(await (seams.gateOn ?? isAttachServeEnabled)().catch(() => !1)) ||
      !(seams.servingOn ?? isRemoteToolServingSwitchOn)() ||
      (seams.egressDenied ?? (() => getDeviceBindingRefusal() !== void 0))()
    )
      return e;
    let v = seams.readSnapshot ?? (() => readDeviceMcpSnapshot(createSnapshotStore(storageV5))),
      _ = seams.readConsent ?? (() => readDeviceMcpConsent(deviceMcpConsentStore(storageV5))),
      j = seams.writeNotNow ?? ((o) => writeDeviceMcpNotNow(o, deviceMcpNotNowStore(storageV5))),
      S = seams.clearNotNow ?? (() => clearDeviceMcpNotNow(deviceMcpNotNowStore(storageV5))),
      C = await _();
    if (C === "declined" || C === "unreadable") return e;
    let M = await v(),
      n = C === "unset" ? void 0 : M === "unreadable" ? {} : Do(M.withheld, Ipo);
    if (n !== void 0 && Object.keys(n).length === 0) return e;
    let E = await (seams.resolveConfigs ?? (() => getDeviceBridgeMcpServers({ storageV5: storageV5 })))(),
      filtered = Object.entries(E).filter(
        ([o, A]) => isDeviceBridgeTransport(A) && isForwardableDeviceMcp(o, A),
      ),
      filtered_2 = filtered.map(([o]) => o).filter((o) => n === void 0 || Object.hasOwn(n, o));
    if (filtered_2.length === 0) return e;
    let D = n === void 0 ? "first" : "reconsent",
      i = (o) => {
        logEvent("tengu_device_mcp_host_consent", {
          action: fromEnum(o),
          mode: fromEnum(D),
          server_count: filtered_2.length,
        });
      };
    if (!dialogs.kinds.has(CZt.kind)) return (i("unsupported_surface"), e);
    if (
      D === "first" &&
      ppt(
        await (seams.readNotNow ?? (() => readDeviceMcpNotNow(deviceMcpNotNowStore(storageV5))))(),
        filtered_2,
      )
    )
      return (i("suppressed_by_not_now"), e);
    let k = buildMcpServeConsentPayload({
      machineName: (seams.machineName ?? (() => t9(normalizeHostname(hostname()))))(),
      offered: filtered,
      snapshot: M,
      ...(n !== void 0 && { withheld: n }),
      diffNamesCap: Ppo,
    });
    if (k === null)
      return (i("not_presentable"), logFeatureSad("device_mcp_host_consent", "not_presentable"), e);
    (i("shown"), (e = { kind: "asked", answer: "as_stored" }));
    let { answer: answer, answered: answered } = await dialogs.request(CZt, k, { signal: signal });
    if (!answered) return (i("unanswered"), logFeatureSad("device_mcp_host_consent", "unanswered"), e);
    if (answer === "not_now") {
      if ((i("not_now"), D === "first" && (await _()) === "unset")) await j(filtered_2);
      return (logFeatureOk("device_mcp_host_consent"), e);
    }
    let p = answer === "allow" ? "accepted" : "declined";
    e = { kind: "asked", answer: p === "declined" ? "declined" : "as_stored" };
    let y = { kind: "asked", answer: n === void 0 ? p : "as_stored" },
      r = await (n === void 0 ? _() : v());
    if (r === "unreadable" || (p === "accepted" && r === "declined"))
      return (
        i(r === "unreadable" ? "not_saved" : "superseded"),
        logFeatureSad("device_mcp_host_consent", r === "unreadable" ? "not_saved" : "superseded"),
        r === "declined" ? { kind: "asked", answer: "declined" } : e
      );
    let O =
      p === "declined" || typeof r !== "object"
        ? filtered_2
        : filtered_2.filter(
            (o) =>
              n !== void 0 &&
              Object.hasOwn(r.withheld, o) &&
              En(r.withheld[o], n[o]) &&
              r.servers[o] !== "declined",
          );
    if (r === p || O.length === 0) {
      if (((e = y), n === void 0)) await S();
      return (i("superseded"), logFeatureOk("device_mcp_host_consent"), e);
    }
    let P = () =>
      typeof r === "object"
        ? (seams.writeSnapshot ?? ((o) => writeDeviceMcpSnapshot(o, createSnapshotStore(storageV5))))(
            applyConsentChoice(r, O, p),
          )
        : (seams.writeConsent ?? ((o) => writeDeviceMcpConsent(o, deviceMcpConsentStore(storageV5))))(p);
    if (!((await P()) || (p === "declined" && (await P()))))
      return (
        i("not_saved"),
        logFeatureSad("device_mcp_host_consent", "not_saved"),
        logForDebugging(
          p === "declined"
            ? "[headlessCloud] device-MCP refusal not saved; this computer offers none of its MCP servers for this attach"
            : "[headlessCloud] device-MCP answer not saved; asked again at the next attach",
          { level: "warn" },
        ),
        e
      );
    if (((e = y), n === void 0)) await S();
    return (i(answer === "allow" ? "allowed" : "denied"), logFeatureOk("device_mcp_host_consent"), e);
  } catch (error) {
    if (isAbortError(error))
      logForDebugging(`[headlessCloud] device-MCP question abandoned: ${errorMessage(error)}`);
    else (logFeatureBad("device_mcp_host_consent", "failed"), logError(error));
    return e;
  }
}
