/**
 * cli/headlessCloud/servedSettings.ts
 *
 * 2.1.316 新增：无头云会话的插件转发与项目设置提供、无人值守同意。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fe6rs39h.js (10)
 * attribution: placement 10
 */
import { createSignal } from "../../utils/signal.js";
import { truncateStatusMessage } from "./servedTools.js";
import {
  SERVING_MUTED_NOTICE_KEY,
  SERVING_UNMUTED_NOTICE_KEY,
  isRemoteToolServingSwitchOn,
  isRemoteToolServingMuted,
  onServingMuteRecheck,
} from "../../services/remoteTools/servingGates.js";
import { CLOUD_SHORT_LIST_MAX } from "../cloudSession/headlessCloudClient.js";
import { loadedManagedKeyGroupsList } from "../../utils/settings/managedEnvKeys.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../../remote/tools/consentText.js";
import { servedFolderEnvWasWithheld } from "../../utils/managedEnvApply.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  primeUnattendedServingConsent,
  managedSettingsForbidUnattendedServing,
  readUnattendedServingConsent,
  unattendedServingMachineName,
  writeUnattendedServingConsent,
} from "../../services/remoteTools/unattendedConsentStore.js";
import { isUnattendedServingConsentGateOn } from "../../services/analytics/violinFretGate.js";
import { UNATTENDED_SERVING_CONSENT, unattendedServingConsentPayload } from "./consent.js";
import { logForDebugging } from "../../utils/debug.js";
import { isAbortError, errorMessage } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { isCloudPluginForwardingFlagOn } from "../../services/analytics/violinGates.js";
import { env } from "../../utils/env.js";
import {
  REAL_PLUGIN_FORWARD_CLOCK,
  cloudPluginsAdmissionReport,
  readCloudPluginsConsent,
  createUntrustedStoreJudge,
  cloudPluginsOffMessage,
  CLOUD_PLUGINS_UNDECIDED_MESSAGE,
  forwardCloudPlugins,
  classifyCloudPluginsWorkerReply,
  LOCAL_READ_TIMEOUT_MS,
  resolveCloudPluginsConsent,
} from "./cloudPlugins.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { createDeviceHookDecider } from "../../utils/hooks/deviceHooks/runDeviceHook.js";
import { createNoticeBacklog } from "../../utils/noticeBacklog.js";
import { truncateToLength } from "../../utils/stringUtils.js";

//@ chunk-fe6rs39h.js:120657-120966 placement
function createServedSettingsTracker() {
  let e = new Map();
  let signal = createSignal();
  return {
    add(s, r) {
      let h = truncateStatusMessage(r);
      if (e.get(s) === h) return;
      if (s === SERVING_MUTED_NOTICE_KEY) e.delete(SERVING_UNMUTED_NOTICE_KEY);
      else if (s === SERVING_UNMUTED_NOTICE_KEY) e.delete(SERVING_MUTED_NOTICE_KEY);
      e.set(s, h);
      let y = e.keys().next();
      if (e.size > CLOUD_SHORT_LIST_MAX && y.done !== true) e.delete(y.value);
      signal.emit();
    },
    list: () =>
      [...e].map(([s, r]) => ({
        key: s,
        text: r,
      })),
    onChanged: (s) => {
      signal.subscribe(s);
    },
  };
}
//@ chunk-fe6rs39h.js:120966-121005 placement
var SERVED_FOLDER_CONFIG_NOT_USED = "served-folder-config-not-used";
//@ chunk-fe6rs39h.js:121005-121208 placement
function servedFolderConfigNotice(e) {
  let n = loadedManagedKeyGroupsList();
  if (n.length === 0) return;
  logFeatureOk("remote_served_folder_config_withheld", {
    arm: fromEnum(e),
    keys: n.includes("keys"),
    hook: n.includes("hook"),
  });
  return REMOTE_TOOLS_CONSENT_TEXT["served_settings.folder_config_not_used"];
}
//@ chunk-fe6rs39h.js:121208-121248 placement
var SERVED_PROJECT_ENV_NOT_APPLIED = "served-project-env-not-applied";
//@ chunk-fe6rs39h.js:121248-121384 placement
function servedProjectEnvNotice(e) {
  if (!servedFolderEnvWasWithheld()) return;
  logFeatureOk("remote_served_project_env_withheld", {
    arm: fromEnum(e),
  });
  return REMOTE_TOOLS_CONSENT_TEXT["served_settings.project_env_not_applied"];
}
//@ chunk-fe6rs39h.js:121384-122229 placement
async function askUnattendedServingConsent({ dialogs, permissionMode, signal, seams = {} }) {
  let surface = lit("desktop");
  let y = (S) => {
    logEvent("tengu_served_unattended_consent", {
      action: fromEnum(S),
      surface,
    });
  };
  try {
    (seams.prime ?? primeUnattendedServingConsent)();
    if (
      dialogs === undefined ||
      (permissionMode !== "auto" && permissionMode !== "bypassPermissions") ||
      !(seams.servingOn ?? isRemoteToolServingSwitchOn)() ||
      !(await (seams.gateOn ?? isUnattendedServingConsentGateOn)().catch(() => false)) ||
      (seams.forbiddenBySettings ?? managedSettingsForbidUnattendedServing)()
    )
      return;
    if ((await (seams.readConsent ?? readUnattendedServingConsent)()) !== "unset") return;
    if (!dialogs.kinds.has(UNATTENDED_SERVING_CONSENT.kind)) {
      y("unsupported_surface");
      return;
    }
    y("shown");
    let { answer, answered } = await dialogs.request(
      UNATTENDED_SERVING_CONSENT,
      unattendedServingConsentPayload((seams.machineName ?? unattendedServingMachineName)()),
      {
        signal,
      },
    );
    if (!answered || answer === "not_now") {
      y("not_now");
      return;
    }
    let R = answer === "accept" ? "accepted" : "declined";
    y(R);
    if (!(await (seams.writeConsent ?? writeUnattendedServingConsent)(R)))
      logForDebugging("[headlessCloud] unattended-serving answer not saved; asked again next launch", {
        level: "warn",
      });
  } catch (error) {
    if (isAbortError(error))
      logForDebugging(`[headlessCloud] unattended-serving question abandoned: ${errorMessage(error)}`);
    else logError(error);
  }
}
//@ chunk-fe6rs39h.js:122229-124978 placement
/**
 * 无头云会话的插件转发特性：判断启动目录与同步根的关系、本机同意状态，决定是否把启用的插件带到云会话。
 */
function createPluginForwardingFeature(e) {
  let flagsOn = e.flagsOn ?? isCloudPluginForwardingFlagOn;
  let s = e.optedOut ?? (() => Boolean(env.CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING));
  let clock = e.clock ?? REAL_PLUGIN_FORWARD_CLOCK;
  let muted = e.muted ?? isRemoteToolServingMuted;
  let onMuteRecheck = e.onMuteRecheck ?? onServingMuteRecheck;
  return async (S) => {
    if (!(await flagsOn())) return;
    if (s())
      return {
        feature: "plugins",
        report: () => ({
          state: "off",
          reason: "switched_off",
        }),
      };
    let w = S.trigger === "attach";
    switch (S.binding) {
      case "bound":
      case "none":
        break;
      case "elsewhere":
        return cloudPluginsAdmissionReport("bound_elsewhere", "no_consent", "bound_elsewhere", w);
      case "unknown":
        return cloudPluginsAdmissionReport("binding_unknown", "no_consent", "binding_unknown", w);
      default:
        return S.binding;
    }
    let memory = e.memory;
    let k = e.consentDeps ?? readCloudPluginsConsent(S.storageV5);
    let I = (e.launchDir ?? getOriginalCwd)();
    let O = {
      launchDir: I,
      syncRoot: () => null,
      syncElsewhere: w ? (S.sessionRecordMayBeElsewhere ?? "unknown") : false,
    };
    let P =
      e.reach?.(O) ??
      createDeviceHookDecider({
        ...O,
        memory: e.reachMemory.reachFor(I),
      });
    let untrustedStoreJudge = createUntrustedStoreJudge(P);
    let cloudPluginsConsentWithTimeout = await readCloudPluginsConsentWithTimeout(
      memory.consentPin,
      k,
      untrustedStoreJudge,
      S.signal,
      clock,
    );
    if (cloudPluginsConsentWithTimeout === "declined")
      return cloudPluginsAdmissionReport("declined", "opted_out", "stored", w, "stored");
    if (cloudPluginsConsentWithTimeout === "aborted")
      return cloudPluginsAdmissionReport("unreadable", "no_consent", "detached", w);
    if (cloudPluginsConsentWithTimeout === "unreadable") {
      logFeatureBad("ccr_cloud_plugins_forward", "read_failed");
      return cloudPluginsAdmissionReport("unreadable", "no_consent", "read_failed", w);
    }
    if (cloudPluginsConsentWithTimeout !== "accepted") {
      let x = untrustedStoreJudge.withheld();
      return cloudPluginsAdmissionReport(
        "no_consent",
        "no_consent",
        x !== null ? "untrusted_store" : "undecided",
        w,
        "default",
        x !== null ? cloudPluginsOffMessage(x) : CLOUD_PLUGINS_UNDECIDED_MESSAGE,
      );
    }
    let noticeBacklog = createNoticeBacklog();
    let j = null;
    let Y = [];
    let D = false;
    let W = (x) => {
      if (x && !D) Y.forEach((ie) => ie());
      D = x;
    };
    let te = false;
    let X;
    let ee = false;
    return {
      feature: "plugins",
      status: noticeBacklog,
      onSettled: (x) => {
        Y.push(x);
        if (D) x();
      },
      sessionCallbacks: {
        onMessage: (x) => {
          if (x.type === "system" && x.subtype === "plugin_install") j?.pluginInstallFrame();
        },
      },
      onSession({ sessionId, manager }) {
        j = forwardCloudPlugins({
          sessionId,
          reattach: w,
          manager,
          memory,
          storageV5: S.storageV5,
          say: ({ line, level }) => {
            if (!ee || level === "warning") X = line;
            if (!ee) {
              ee = true;
              queueMicrotask(() => {
                ee = false;
              });
            }
            noticeBacklog.publish(line, mapLogLevel(level));
          },
          bound: S.bound,
          reach: P,
          distrust: untrustedStoreJudge,
          consentDeps: k,
          clock,
          muted,
          onMuteRecheck,
          ...(e.readChoices && {
            readChoices: e.readChoices,
          }),
          onChange: () => {
            let G = j?.state();
            W(G !== undefined && isSettledWithoutAnswer(G));
          },
        });
        if (w) j.workerKnownUp();
        if (te) j.messageSent();
      },
      onWorkerUp() {
        j?.workerCameUp();
      },
      onMessageSent() {
        if (j === null) {
          te = true;
          return;
        }
        j.messageSent();
      },
      report: () => {
        let x = j?.state();
        if (x?.muted)
          return {
            state: "off",
            source: "stored",
            reason: "muted",
          };
        let ie =
          x !== undefined && x.settled && x.admission === "admitted"
            ? classifyCloudPluginsWorkerReply(x.notice)
            : undefined;
        if (ie !== undefined)
          return {
            state: "off",
            source: "stored",
            reason: ie,
          };
        if (x?.gaveUp !== undefined && x.notice === undefined)
          return {
            state: "off",
            source: "stored",
            reason: x.gaveUp === "read_failed" ? "unreadable" : "could_not_send",
          };
        if (x !== undefined && x.settled && x.admission !== "admitted")
          return {
            state: "off",
            reason:
              x.admission === "opted_out"
                ? "declined"
                : x.source === "read_failed"
                  ? "unreadable"
                  : x.source === "internal_error"
                    ? "could_not_send"
                    : "unavailable",
          };
        return {
          state: "forwarded",
          source: "stored",
          ...(X !== undefined && {
            message: truncateToLength(X, 200),
          }),
          ...(!(x !== undefined && isSettledWithoutAnswer(x)) && {
            pending: true,
          }),
        };
      },
      async dispose() {
        j?.teardown();
        j = null;
      },
    };
  };
}
//@ chunk-fe6rs39h.js:124978-125255 placement
/**
 * 带超时与中止读取云插件同意状态：超时返回 unreadable，中止返回 aborted。
 */
function readCloudPluginsConsentWithTimeout(consentPin, n, untrustedStoreJudge, signal, clock) {
  if (signal.aborted) return Promise.resolve("aborted");
  return new Promise((resolve) => {
    let S = () => resolve("unreadable");
    let w = () => resolve("aborted");
    let R = clock.setTimeout(S, LOCAL_READ_TIMEOUT_MS);
    signal.addEventListener("abort", w, {
      once: true,
    });
    resolveCloudPluginsConsent(consentPin, n, untrustedStoreJudge)
      .then(resolve, S)
      .finally(() => {
        R();
        signal.removeEventListener("abort", w);
      });
  });
}
//@ chunk-fe6rs39h.js:125255-125305 placement
function isSettledWithoutAnswer(e) {
  return e.settled && !e.answerPending;
}
//@ chunk-fe6rs39h.js:125305-125430 placement = startFileWatcher (0.581)
function mapLogLevel(teamDir) {
  switch (teamDir) {
    case "warning":
      return "warning";
    case "notice":
      return "info";
    case "debug":
      return "debug";
    default:
      return teamDir;
  }
}
export {
  createPluginForwardingFeature,
  askUnattendedServingConsent,
  servedFolderConfigNotice,
  SERVED_FOLDER_CONFIG_NOT_USED,
  servedProjectEnvNotice,
  SERVED_PROJECT_ENV_NOT_APPLIED,
  createServedSettingsTracker,
};
