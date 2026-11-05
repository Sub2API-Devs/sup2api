/**
 * components/cloud/HostDeviceMcpConsent.tsx
 *
 * 2.1.316 新增：询问是否把本机 MCP 服务器共享给云会话（首次/重新同意），记录 tengu_device_mcp_host_consent。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c8kx2jjn.js (1)
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
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logForDebugging } from "../../utils/debug.js";
import { isAbortError, errorMessage } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";

//@ chunk-c8kx2jjn.js:13939-16839 placement
/**
 * 询问是否把本机 MCP 服务器共享给云会话（首次/重新同意），记录 tengu_device_mcp_host_consent。
 */
async function askHostDeviceMcpConsent({ dialogs, storageV5, signal, seams = {} }) {
  let result = {
    kind: "not_asked",
  };
  try {
    if (
      dialogs === undefined ||
      !(await (seams.gateOn ?? isAttachServeEnabled)().catch(() => false)) ||
      !(seams.servingOn ?? isRemoteToolServingSwitchOn)() ||
      (seams.egressDenied ?? (() => getDeviceBindingRefusal() !== undefined))()
    )
      return result;
    let readSnapshot = seams.readSnapshot ?? (() => readDeviceMcpSnapshot(createSnapshotStore(storageV5)));
    let readConsent = seams.readConsent ?? (() => readDeviceMcpConsent(deviceMcpConsentStore(storageV5)));
    let writeNotNow =
      seams.writeNotNow ?? ((servers) => writeDeviceMcpNotNow(servers, deviceMcpNotNowStore(storageV5)));
    let clearNotNow = seams.clearNotNow ?? (() => clearDeviceMcpNotNow(deviceMcpNotNowStore(storageV5)));
    let consent = await readConsent();
    if (consent === "declined" || consent === "unreadable") return result;
    let snapshot = await readSnapshot();
    let withheld =
      consent === "unset"
        ? undefined
        : snapshot === "unreadable"
          ? {}
          : pickByHelper(snapshot.withheld, hasSnapshotChanges);
    if (withheld !== undefined && Object.keys(withheld).length === 0) return result;
    let servers = await (
      seams.resolveConfigs ??
      (() =>
        getDeviceBridgeMcpServers({
          storageV5,
        }))
    )();
    let filtered = Object.entries(servers).filter(
      ([key, value]) => isDeviceBridgeTransport(value) && isForwardableDeviceMcp(key, value),
    );
    let required = filtered
      .map(([serverName]) => serverName)
      .filter((serverName) => withheld === undefined || Object.hasOwn(withheld, serverName));
    if (required.length === 0) return result;
    let mode = withheld === undefined ? "first" : "reconsent";
    let logAction = (action) => {
      logEvent("tengu_device_mcp_host_consent", {
        action: fromEnum(action),
        mode: fromEnum(mode),
        server_count: required.length,
      });
    };
    if (!dialogs.kinds.has(deviceMcpConsentSpec.kind)) {
      logAction("unsupported_surface");
      return result;
    }
    if (
      mode === "first" &&
      containsAll(
        await (seams.readNotNow ?? (() => readDeviceMcpNotNow(deviceMcpNotNowStore(storageV5))))(),
        required,
      )
    ) {
      logAction("suppressed_by_not_now");
      return result;
    }
    let mcpServeConsentPayload = buildMcpServeConsentPayload({
      machineName: (seams.machineName ?? (() => shortServerLabel(normalizeHostname(hostname()))))(),
      offered: filtered,
      snapshot,
      ...(withheld !== undefined && {
        withheld,
      }),
      diffNamesCap: MAX_SNAPSHOT_SERVERS,
    });
    if (mcpServeConsentPayload === null) {
      logAction("not_presentable");
      logFeatureSad("device_mcp_host_consent", "not_presentable");
      return result;
    }
    logAction("shown");
    result = {
      kind: "asked",
      answer: "as_stored",
    };
    let { answer, answered } = await dialogs.request(deviceMcpConsentSpec, mcpServeConsentPayload, {
      signal,
    });
    if (!answered) {
      logAction("unanswered");
      logFeatureSad("device_mcp_host_consent", "unanswered");
      return result;
    }
    if (answer === "not_now") {
      logAction("not_now");
      if (mode === "first" && (await readConsent()) === "unset") await writeNotNow(required);
      logFeatureOk("device_mcp_host_consent");
      return result;
    }
    let answerKind = answer === "allow" ? "accepted" : "declined";
    result = {
      kind: "asked",
      answer: answerKind === "declined" ? "declined" : "as_stored",
    };
    let askedResult = {
      kind: "asked",
      answer: withheld === undefined ? answerKind : "as_stored",
    };
    let currentState = await (withheld === undefined ? readConsent() : readSnapshot());
    if (currentState === "unreadable" || (answerKind === "accepted" && currentState === "declined")) {
      logAction(currentState === "unreadable" ? "not_saved" : "superseded");
      logFeatureSad("device_mcp_host_consent", currentState === "unreadable" ? "not_saved" : "superseded");
      return currentState === "declined"
        ? {
            kind: "asked",
            answer: "declined",
          }
        : result;
    }
    let toApply =
      answerKind === "declined" || typeof currentState !== "object"
        ? required
        : required.filter(
            (serverName) =>
              withheld !== undefined &&
              Object.hasOwn(currentState.withheld, serverName) &&
              import_sortedIndex_2(currentState.withheld[serverName], withheld[serverName]) &&
              currentState.servers[serverName] !== "declined",
          );
    if (currentState === answerKind || toApply.length === 0) {
      result = askedResult;
      if (withheld === undefined) await clearNotNow();
      logAction("superseded");
      logFeatureOk("device_mcp_host_consent");
      return result;
    }
    let save = () =>
      typeof currentState === "object"
        ? (
            seams.writeSnapshot ??
            ((nextSnapshot) => writeDeviceMcpSnapshot(nextSnapshot, createSnapshotStore(storageV5)))
          )(applyConsentChoice(currentState, toApply, answerKind))
        : (
            seams.writeConsent ??
            ((choice) => writeDeviceMcpConsent(choice, deviceMcpConsentStore(storageV5)))
          )(answerKind);
    if (!((await save()) || (answerKind === "declined" && (await save())))) {
      logAction("not_saved");
      logFeatureSad("device_mcp_host_consent", "not_saved");
      logForDebugging(
        answerKind === "declined"
          ? "[headlessCloud] device-MCP refusal not saved; this computer offers none of its MCP servers for this attach"
          : "[headlessCloud] device-MCP answer not saved; asked again at the next attach",
        {
          level: "warn",
        },
      );
      return result;
    }
    result = askedResult;
    if (withheld === undefined) await clearNotNow();
    logAction(answer === "allow" ? "allowed" : "denied");
    logFeatureOk("device_mcp_host_consent");
    return result;
  } catch (error) {
    if (isAbortError(error))
      logForDebugging(`[headlessCloud] device-MCP question abandoned: ${errorMessage(error)}`);
    else {
      logFeatureBad("device_mcp_host_consent", "failed");
      logError(error);
    }
    return result;
  }
}
export { askHostDeviceMcpConsent };
