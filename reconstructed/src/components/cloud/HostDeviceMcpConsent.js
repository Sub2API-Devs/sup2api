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
  hasSnapshotChanges,
  MAX_SNAPSHOT_SERVERS,
  writeDeviceMcpSnapshot,
  applyConsentChoice,
} from "../../services/deviceBridge/deviceMcpSnapshot.js";
import {
  readDeviceMcpConsent,
  deviceMcpConsentStore,
  writeDeviceMcpNotNow,
  deviceMcpNotNowStore,
  clearDeviceMcpNotNow,
  containsAll,
  readDeviceMcpNotNow,
  shortServerLabel,
  writeDeviceMcpConsent,
} from "../../services/deviceBridge/deviceMcpConsent.js";
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";
import {
  getDeviceBridgeMcpServers,
  isDeviceBridgeTransport,
  isForwardableDeviceMcp,
} from "../../services/mcp/deviceMcpServers.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { deviceMcpConsentSpec, buildMcpServeConsentPayload } from "../../cli/headlessCloud/consent.js";
import { normalizeHostname } from "../../services/remoteTools/unattendedConsentStore.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logForDebugging } from "../../utils/debug.js";
import { isAbortError, errorMessage } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";

//@ chunk-8fq1kyxh.js:12735-15635 placement
/**
 * 询问是否把本机 MCP 服务器共享给云会话（首次/重新同意），记录 tengu_device_mcp_host_consent。
 */
async function askHostDeviceMcpConsent({ dialogs, storageV5, signal, seams = {} }) {
  let e = {
    kind: "not_asked",
  };
  try {
    if (
      dialogs === undefined ||
      !(await (seams.gateOn ?? isAttachServeEnabled)().catch(() => false)) ||
      !(seams.servingOn ?? isRemoteToolServingSwitchOn)() ||
      (seams.egressDenied ?? (() => getDeviceBindingRefusal() !== undefined))()
    )
      return e;
    let v = seams.readSnapshot ?? (() => readDeviceMcpSnapshot(createSnapshotStore(storageV5)));
    let _ = seams.readConsent ?? (() => readDeviceMcpConsent(deviceMcpConsentStore(storageV5)));
    let j =
      seams.writeNotNow ?? ((servers) => writeDeviceMcpNotNow(servers, deviceMcpNotNowStore(storageV5)));
    let S = seams.clearNotNow ?? (() => clearDeviceMcpNotNow(deviceMcpNotNowStore(storageV5)));
    let C = await _();
    if (C === "declined" || C === "unreadable") return e;
    let M = await v();
    let n =
      C === "unset" ? undefined : M === "unreadable" ? {} : pickByHelper(M.withheld, hasSnapshotChanges);
    if (n !== undefined && Object.keys(n).length === 0) return e;
    let E = await (
      seams.resolveConfigs ??
      (() =>
        getDeviceBridgeMcpServers({
          storageV5,
        }))
    )();
    let filtered = Object.entries(E).filter(
      ([key, value]) => isDeviceBridgeTransport(value) && isForwardableDeviceMcp(key, value),
    );
    let filtered_2 = filtered.map(([o]) => o).filter((o) => n === undefined || Object.hasOwn(n, o));
    if (filtered_2.length === 0) return e;
    let D = n === undefined ? "first" : "reconsent";
    let i = (o) => {
      logEvent("tengu_device_mcp_host_consent", {
        action: fromEnum(o),
        mode: fromEnum(D),
        server_count: filtered_2.length,
      });
    };
    if (!dialogs.kinds.has(deviceMcpConsentSpec.kind)) {
      i("unsupported_surface");
      return e;
    }
    if (
      D === "first" &&
      containsAll(
        await (seams.readNotNow ?? (() => readDeviceMcpNotNow(deviceMcpNotNowStore(storageV5))))(),
        filtered_2,
      )
    ) {
      i("suppressed_by_not_now");
      return e;
    }
    let mcpServeConsentPayload = buildMcpServeConsentPayload({
      machineName: (seams.machineName ?? (() => shortServerLabel(normalizeHostname(hostname()))))(),
      offered: filtered,
      snapshot: M,
      ...(n !== undefined && {
        withheld: n,
      }),
      diffNamesCap: MAX_SNAPSHOT_SERVERS,
    });
    if (mcpServeConsentPayload === null) {
      i("not_presentable");
      logFeatureSad("device_mcp_host_consent", "not_presentable");
      return e;
    }
    i("shown");
    e = {
      kind: "asked",
      answer: "as_stored",
    };
    let { answer, answered } = await dialogs.request(deviceMcpConsentSpec, mcpServeConsentPayload, {
      signal,
    });
    if (!answered) {
      i("unanswered");
      logFeatureSad("device_mcp_host_consent", "unanswered");
      return e;
    }
    if (answer === "not_now") {
      i("not_now");
      if (D === "first" && (await _()) === "unset") await j(filtered_2);
      logFeatureOk("device_mcp_host_consent");
      return e;
    }
    let p = answer === "allow" ? "accepted" : "declined";
    e = {
      kind: "asked",
      answer: p === "declined" ? "declined" : "as_stored",
    };
    let y = {
      kind: "asked",
      answer: n === undefined ? p : "as_stored",
    };
    let r = await (n === undefined ? _() : v());
    if (r === "unreadable" || (p === "accepted" && r === "declined")) {
      i(r === "unreadable" ? "not_saved" : "superseded");
      logFeatureSad("device_mcp_host_consent", r === "unreadable" ? "not_saved" : "superseded");
      return r === "declined"
        ? {
            kind: "asked",
            answer: "declined",
          }
        : e;
    }
    let O =
      p === "declined" || typeof r !== "object"
        ? filtered_2
        : filtered_2.filter(
            (o) =>
              n !== undefined &&
              Object.hasOwn(r.withheld, o) &&
              En(r.withheld[o], n[o]) &&
              r.servers[o] !== "declined",
          );
    if (r === p || O.length === 0) {
      e = y;
      if (n === undefined) await S();
      i("superseded");
      logFeatureOk("device_mcp_host_consent");
      return e;
    }
    let P = () =>
      typeof r === "object"
        ? (seams.writeSnapshot ?? ((o) => writeDeviceMcpSnapshot(o, createSnapshotStore(storageV5))))(
            applyConsentChoice(r, O, p),
          )
        : (
            seams.writeConsent ??
            ((choice) => writeDeviceMcpConsent(choice, deviceMcpConsentStore(storageV5)))
          )(p);
    if (!((await P()) || (p === "declined" && (await P())))) {
      i("not_saved");
      logFeatureSad("device_mcp_host_consent", "not_saved");
      logForDebugging(
        p === "declined"
          ? "[headlessCloud] device-MCP refusal not saved; this computer offers none of its MCP servers for this attach"
          : "[headlessCloud] device-MCP answer not saved; asked again at the next attach",
        {
          level: "warn",
        },
      );
      return e;
    }
    e = y;
    if (n === undefined) await S();
    i(answer === "allow" ? "allowed" : "denied");
    logFeatureOk("device_mcp_host_consent");
    return e;
  } catch (error) {
    if (isAbortError(error))
      logForDebugging(`[headlessCloud] device-MCP question abandoned: ${errorMessage(error)}`);
    else {
      logFeatureBad("device_mcp_host_consent", "failed");
      logError(error);
    }
    return e;
  }
}
