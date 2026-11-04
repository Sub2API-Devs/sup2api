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
  let entries = new Map();
  let signal = createSignal();
  return {
    add(key, text) {
      let hash = truncateStatusMessage(text);
      if (entries.get(key) === hash) return;
      if (key === SERVING_MUTED_NOTICE_KEY) entries.delete(SERVING_UNMUTED_NOTICE_KEY);
      else if (key === SERVING_UNMUTED_NOTICE_KEY) entries.delete(SERVING_MUTED_NOTICE_KEY);
      entries.set(key, hash);
      let oldest = entries.keys().next();
      if (entries.size > CLOUD_SHORT_LIST_MAX && oldest.done !== true) entries.delete(oldest.value);
      signal.emit();
    },
    list: () =>
      [...entries].map(([listener, mode]) => ({
        key: listener,
        text: mode,
      })),
    onChanged: (served) => {
      signal.subscribe(served);
    },
  };
}
//@ chunk-fe6rs39h.js:120966-121005 placement
var SERVED_FOLDER_CONFIG_NOT_USED = "served-folder-config-not-used";
//@ chunk-fe6rs39h.js:121005-121208 placement
function servedFolderConfigNotice(mode) {
  let withheld = loadedManagedKeyGroupsList();
  if (withheld.length === 0) return;
  logFeatureOk("remote_served_folder_config_withheld", {
    arm: fromEnum(mode),
    keys: withheld.includes("keys"),
    hook: withheld.includes("hook"),
  });
  return REMOTE_TOOLS_CONSENT_TEXT["served_settings.folder_config_not_used"];
}
//@ chunk-fe6rs39h.js:121208-121248 placement
var SERVED_PROJECT_ENV_NOT_APPLIED = "served-project-env-not-applied";
//@ chunk-fe6rs39h.js:121248-121384 placement
function servedProjectEnvNotice(mode) {
  if (!servedFolderEnvWasWithheld()) return;
  logFeatureOk("remote_served_project_env_withheld", {
    arm: fromEnum(mode),
  });
  return REMOTE_TOOLS_CONSENT_TEXT["served_settings.project_env_not_applied"];
}
//@ chunk-fe6rs39h.js:121384-122229 placement
async function askUnattendedServingConsent({ dialogs, permissionMode, signal, seams = {} }) {
  let surface = lit("desktop");
  let logAction = (action) => {
    logEvent("tengu_served_unattended_consent", {
      action: fromEnum(action),
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
      logAction("unsupported_surface");
      return;
    }
    logAction("shown");
    let { answer, answered } = await dialogs.request(
      UNATTENDED_SERVING_CONSENT,
      unattendedServingConsentPayload((seams.machineName ?? unattendedServingMachineName)()),
      {
        signal,
      },
    );
    if (!answered || answer === "not_now") {
      logAction("not_now");
      return;
    }
    let choice = answer === "accept" ? "accepted" : "declined";
    logAction(choice);
    if (!(await (seams.writeConsent ?? writeUnattendedServingConsent)(choice)))
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
function createPluginForwardingFeature(options) {
  let flagsOn = options.flagsOn ?? isCloudPluginForwardingFlagOn;
  let isOptedOut = options.optedOut ?? (() => Boolean(env.CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING));
  let clock = options.clock ?? REAL_PLUGIN_FORWARD_CLOCK;
  let muted = options.muted ?? isRemoteToolServingMuted;
  let onMuteRecheck = options.onMuteRecheck ?? onServingMuteRecheck;
  return async (session) => {
    if (!(await flagsOn())) return;
    if (isOptedOut())
      return {
        feature: "plugins",
        report: () => ({
          state: "off",
          reason: "switched_off",
        }),
      };
    let isAttach = session.trigger === "attach";
    switch (session.binding) {
      case "bound":
      case "none":
        break;
      case "elsewhere":
        return cloudPluginsAdmissionReport("bound_elsewhere", "no_consent", "bound_elsewhere", isAttach);
      case "unknown":
        return cloudPluginsAdmissionReport("binding_unknown", "no_consent", "binding_unknown", isAttach);
      default:
        return session.binding;
    }
    let memory = options.memory;
    let consentDeps = options.consentDeps ?? readCloudPluginsConsent(session.storageV5);
    let launchDir = (options.launchDir ?? getOriginalCwd)();
    let reachArgs = {
      launchDir,
      syncRoot: () => null,
      syncElsewhere: isAttach ? (session.sessionRecordMayBeElsewhere ?? "unknown") : false,
    };
    let reach =
      options.reach?.(reachArgs) ??
      createDeviceHookDecider({
        ...reachArgs,
        memory: options.reachMemory.reachFor(launchDir),
      });
    let untrustedStoreJudge = createUntrustedStoreJudge(reach);
    let cloudPluginsConsentWithTimeout = await readCloudPluginsConsentWithTimeout(
      memory.consentPin,
      consentDeps,
      untrustedStoreJudge,
      session.signal,
      clock,
    );
    if (cloudPluginsConsentWithTimeout === "declined")
      return cloudPluginsAdmissionReport("declined", "opted_out", "stored", isAttach, "stored");
    if (cloudPluginsConsentWithTimeout === "aborted")
      return cloudPluginsAdmissionReport("unreadable", "no_consent", "detached", isAttach);
    if (cloudPluginsConsentWithTimeout === "unreadable") {
      logFeatureBad("ccr_cloud_plugins_forward", "read_failed");
      return cloudPluginsAdmissionReport("unreadable", "no_consent", "read_failed", isAttach);
    }
    if (cloudPluginsConsentWithTimeout !== "accepted") {
      let withheld = untrustedStoreJudge.withheld();
      return cloudPluginsAdmissionReport(
        "no_consent",
        "no_consent",
        withheld !== null ? "untrusted_store" : "undecided",
        isAttach,
        "default",
        withheld !== null ? cloudPluginsOffMessage(withheld) : CLOUD_PLUGINS_UNDECIDED_MESSAGE,
      );
    }
    let noticeBacklog = createNoticeBacklog();
    let forwarder = null;
    let pendingSettles = [];
    let isSettled = false;
    let setSettled = (settled) => {
      if (settled && !isSettled) pendingSettles.forEach((finish) => finish());
      isSettled = settled;
    };
    let sawMessageBeforeSession = false;
    let lastNotice;
    let isPendingNotice = false;
    return {
      feature: "plugins",
      status: noticeBacklog,
      onSettled: (finish) => {
        pendingSettles.push(finish);
        if (isSettled) finish();
      },
      sessionCallbacks: {
        onMessage: (message) => {
          if (message.type === "system" && message.subtype === "plugin_install")
            forwarder?.pluginInstallFrame();
        },
      },
      onSession({ sessionId, manager }) {
        forwarder = forwardCloudPlugins({
          sessionId,
          reattach: isAttach,
          manager,
          memory,
          storageV5: session.storageV5,
          say: ({ line, level }) => {
            if (!isPendingNotice || level === "warning") lastNotice = line;
            if (!isPendingNotice) {
              isPendingNotice = true;
              queueMicrotask(() => {
                isPendingNotice = false;
              });
            }
            noticeBacklog.publish(line, mapLogLevel(level));
          },
          bound: session.bound,
          reach,
          distrust: untrustedStoreJudge,
          consentDeps,
          clock,
          muted,
          onMuteRecheck,
          ...(options.readChoices && {
            readChoices: options.readChoices,
          }),
          onChange: () => {
            let state = forwarder?.state();
            setSettled(state !== undefined && isSettledWithoutAnswer(state));
          },
        });
        if (isAttach) forwarder.workerKnownUp();
        if (sawMessageBeforeSession) forwarder.messageSent();
      },
      onWorkerUp() {
        forwarder?.workerCameUp();
      },
      onMessageSent() {
        if (forwarder === null) {
          sawMessageBeforeSession = true;
          return;
        }
        forwarder.messageSent();
      },
      report: () => {
        let state = forwarder?.state();
        if (state?.muted)
          return {
            state: "off",
            source: "stored",
            reason: "muted",
          };
        let replyReason =
          state !== undefined && state.settled && state.admission === "admitted"
            ? classifyCloudPluginsWorkerReply(state.notice)
            : undefined;
        if (replyReason !== undefined)
          return {
            state: "off",
            source: "stored",
            reason: replyReason,
          };
        if (state?.gaveUp !== undefined && state.notice === undefined)
          return {
            state: "off",
            source: "stored",
            reason: state.gaveUp === "read_failed" ? "unreadable" : "could_not_send",
          };
        if (state !== undefined && state.settled && state.admission !== "admitted")
          return {
            state: "off",
            reason:
              state.admission === "opted_out"
                ? "declined"
                : state.source === "read_failed"
                  ? "unreadable"
                  : state.source === "internal_error"
                    ? "could_not_send"
                    : "unavailable",
          };
        return {
          state: "forwarded",
          source: "stored",
          ...(lastNotice !== undefined && {
            message: truncateToLength(lastNotice, 200),
          }),
          ...(!(state !== undefined && isSettledWithoutAnswer(state)) && {
            pending: true,
          }),
        };
      },
      async dispose() {
        forwarder?.teardown();
        forwarder = null;
      },
    };
  };
}
//@ chunk-fe6rs39h.js:124978-125255 placement
/**
 * 带超时与中止读取云插件同意状态：超时返回 unreadable，中止返回 aborted。
 */
function readCloudPluginsConsentWithTimeout(consentPin, pin, untrustedStoreJudge, signal, clock) {
  if (signal.aborted) return Promise.resolve("aborted");
  return new Promise((resolve) => {
    let onTimeout = () => resolve("unreadable");
    let onAbort = () => resolve("aborted");
    let timer = clock.setTimeout(onTimeout, LOCAL_READ_TIMEOUT_MS);
    signal.addEventListener("abort", onAbort, {
      once: true,
    });
    resolveCloudPluginsConsent(consentPin, pin, untrustedStoreJudge)
      .then(resolve, onTimeout)
      .finally(() => {
        timer();
        signal.removeEventListener("abort", onAbort);
      });
  });
}
//@ chunk-fe6rs39h.js:125255-125305 placement
function isSettledWithoutAnswer(state) {
  return state.settled && !state.answerPending;
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
