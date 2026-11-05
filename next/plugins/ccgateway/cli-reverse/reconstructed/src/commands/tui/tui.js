/**
 * commands/tui/tui.ts
 *
 * 2.1.316 新增。/tui 命令（切换全屏/经典界面）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (10)
 * attribution: placement 10
 */
import {
  ensureLauncherRunnable,
  confirmRelaunch,
  relaunchOrExplain,
  saveResumePoint,
  withResumeFlag,
} from "../../utils/processRelaunch.js";
import { TRIAL_ENV } from "../../components/FullscreenUpsellTrial.js";
import { getScreenReaderEnv, isScreenReaderMode } from "../../utils/accessibility/screenReader.js";
import {
  sessionAddDirsEnv,
  buildRelaunchArgs,
  buildPermissionAndAgentArgs,
  listUncarriedLaunchSettings,
} from "../../services/daemon/relaunchArgs.js";
import {
  isFullscreenEnvEnabled,
  getFullscreenDecision,
  isFullscreenAutoDisabledForThisVersion,
  fullscreenProbeState,
} from "../../utils/fullscreen.js";
import { getToolPermissionContext, getSessionEffort } from "../../utils/permissions/toolPermissionContext.js";
import { getForkReplayLaunchConfig, getForkRestrictedLaunchConfig } from "../../bootstrap/state.js";
import { submittedMessages, isMidTurnStreaming } from "../../utils/promptSubmissionOrigin.js";
import { hasRunningBackgroundTask } from "../../tasks/backgroundTaskLabels.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { updateSettingsForSource, getInitialSettings } from "../../utils/settings/settings.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { resetFullscreenAutoDisable } from "../../utils/fullscreenBootGuard.js";
import { hasCursorUpViewportYankBug } from "../../ink/terminal.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import {
  is1PEventLoggingEnabled,
  logEventTo1PAwaitable,
} from "../../services/analytics/firstPartyEventLogger.js";
import { logEventTo1P, submitFeedbackReport } from "../../services/feedback/feedbackBundle.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useState, useRef, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { sleep } from "../../utils/sleep.js";
import { SCROLL_JUMP_LINES } from "../../ink/scrollConstants.js";
import { getGlobalConfig } from "../../utils/config.js";
import { rejectNudgeOnError } from "../../utils/effortMediumNudge.js";
import { logFeatureOkAsync, logFeatureBadAsync } from "../../services/analytics/featureTelemetry.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { Box, Text } from "../../ink/components/Text.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { TextInput } from "../../components/TextInput.js";

//@ chunk-czq1j3j2.js:165497-165530 placement
var RENDERER_NAMES = ["default", "fullscreen"];
//@ chunk-czq1j3j2.js:165530-165980 placement
async function relaunchInto(
  renderer,
  extraArgs,
  messages,
  proactivity,
  storageV5,
  { responseStreaming, trial },
) {
  await ensureLauncherRunnable();
  let confirmed = await confirmRelaunch(
    messages,
    "relaunch",
    {
      responseStreaming,
    },
    storageV5,
  );
  return relaunchOrExplain(
    confirmed,
    {
      freshIfNoTranscript: true,
      extraArgs,
      proactivity,
      env: {
        CLAUDE_CODE_TUI_JUST_SWITCHED: renderer,
        ...(trial && renderer === "fullscreen" ? TRIAL_ENV : {}),
        ...getScreenReaderEnv(),
        ...sessionAddDirsEnv(proactivity.toolPermissionContext.additionalWorkingDirectories),
      },
      dropEnv: [
        "CLAUDE_CODE_NO_FLICKER",
        "CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN",
        "CLAUDE_CODE_FORCE_FULLSCREEN_UPSELL",
      ],
    },
    storageV5,
  );
}
//@ chunk-czq1j3j2.js:165980-166136 placement
function relaunchFailedMessage(error) {
  return `Couldn't switch renderers \u2014 ${error instanceof Error ? error.message : String(error)}. The setting was saved; restart Claude Code to apply it.`;
}
//@ chunk-czq1j3j2.js:166136-166382 placement
function cannotSwitchRendererMessage(renderer, uncarriedSettings) {
  return `Cannot switch renderers in this session \u2014 it has restrictions a restart can't carry over (${uncarriedSettings.join("; ")}). Nothing was changed. Running /tui ${renderer} in a session started without them switches every later session too.`;
}
//@ chunk-czq1j3j2.js:166382-166568 placement
function savedWithoutRestartMessage(uncarriedSettings) {
  return `Staying on the default renderer without a restart \u2014 this session now has restrictions a restart can't carry over (${uncarriedSettings.join("; ")}); the preference is saved.`;
}
//@ chunk-czq1j3j2.js:166568-166710 placement
function savedWithoutRestartForTasksMessage(renderer) {
  return `Staying on the ${renderer} renderer without a restart \u2014 work is now running in the background; the preference is saved.`;
}
//@ chunk-czq1j3j2.js:166710-170302 placement
/**
 * /tui 命令：查看或切换渲染器（fullscreen/default），处理全屏启动失败后自动关闭的情况。
 */
var call_2 = async (onDone, context, args) => {
  let lower = args.trim().toLowerCase();
  let currentRenderer = isFullscreenEnvEnabled() ? "fullscreen" : "default";
  if (lower === "") {
    let crashNote =
      getFullscreenDecision() === "crash_auto_off"
        ? isFullscreenAutoDisabledForThisVersion()
          ? " (fullscreen was turned off on this machine after it repeatedly failed to start; /tui fullscreen retries)"
          : " (a fullscreen launch on this machine didn't finish starting last time; /tui fullscreen retries)"
        : "";
    onDone(`Current renderer: ${currentRenderer}${crashNote}. Usage: /tui <${RENDERER_NAMES.join("|")}>`, {
      display: "system",
    });
    return null;
  }
  if (!RENDERER_NAMES.includes(lower)) {
    onDone(`Unknown renderer "${lower}". Usage: /tui <${RENDERER_NAMES.join("|")}>`, {
      display: "system",
    });
    return null;
  }
  let renderer = lower;
  let carryFlags = () => {
    let toolPermissionContext = getToolPermissionContext(context);
    return [
      ...buildRelaunchArgs(toolPermissionContext, getSessionEffort(context)),
      ...buildPermissionAndAgentArgs(toolPermissionContext, getForkReplayLaunchConfig()),
    ];
  };
  let proactivity = () => ({
    proactivityLevel: context.getProactivityLevel(),
    toolPermissionContext: getToolPermissionContext(context),
  });
  let getMessages = () => submittedMessages(context);
  let getIsResponseStreaming = () => isMidTurnStreaming(context);
  let relaunchBlocked = () => hasRunningBackgroundTask(context.taskRegistry.all());
  if (isBgSession()) {
    let fullscreenDecision = getFullscreenDecision();
    let { error } = await updateSettingsForSource(
      "userSettings",
      {
        tui: renderer,
      },
      undefined,
      context.storageV5,
    );
    if (error) {
      onDone(
        isBridgeOrTransport(context.session)
          ? "Failed to save setting (detail withheld on this connection)."
          : `Failed to save setting: ${error.message}`,
        {
          display: "system",
        },
      );
      return null;
    }
    await resetFullscreenAutoDisable(context.storageV5);
    let bugInfo = hasCursorUpViewportYankBug();
    logEvent("tengu_tui_command", {
      fullscreen: renderer === "fullscreen",
      from: fromEnum(currentRenderer),
      to: fromEnum(renderer),
      from_entry_path: fromEnum(fullscreenDecision),
      session_age_ms: Math.round(process.uptime() * 1000),
      bounce: false,
      scroll_decay_curve: bugInfo.useDecayCurve,
      scroll_base: bugInfo.base,
      scroll_xtermjs: bugInfo.xtermJs,
    });
    onDone(
      `Saved. Background sessions always use the fullscreen renderer while attached; the ${renderer} renderer will apply to sessions started directly with \`claude\`.`,
      {
        display: "system",
      },
    );
    return null;
  }
  if (isScreenReaderMode()) {
    onDone(
      "Screen-reader mode always uses the classic renderer, so the tui setting has no effect while it is active.",
      {
        display: "system",
      },
    );
    return null;
  }
  let isFullscreen = renderer === "fullscreen";
  let alreadyActive = isFullscreen === isFullscreenEnvEnabled();
  if (alreadyActive && getInitialSettings().tui === renderer) {
    await resetFullscreenAutoDisable(context.storageV5);
    onDone(`Already using the ${renderer} renderer.`, {
      display: "system",
    });
    return null;
  }
  let refusalReason = (deferred) => {
    let uncarriedSettings = listUncarriedLaunchSettings(
      getToolPermissionContext(context),
      getForkRestrictedLaunchConfig(),
    );
    if (uncarriedSettings.length > 0) {
      logEvent("tengu_tui_refused", {
        uncarriable: true,
      });
      return cannotSwitchRendererMessage(renderer, uncarriedSettings);
    }
    if (relaunchBlocked()) {
      logEvent("tengu_tui_refused", {
        active_tasks: true,
        ...(deferred && {
          deferred,
        }),
      });
      return "Cannot switch renderers while work is running in the background \u2014 wait for it to finish (or stop it via /tasks), then run /tui again.";
    }
    return;
  };
  let relaunchState;
  if (!alreadyActive) {
    let refusal = refusalReason();
    if (refusal === undefined) {
      await saveResumePoint(context.messages, context.storageV5);
      refusal = refusalReason(true);
      relaunchState = {
        flags: carryFlags(),
        handoff: proactivity(),
      };
    }
    if (refusal !== undefined) {
      onDone(refusal, {
        display: "system",
      });
      return null;
    }
  }
  let fullscreenDecision = getFullscreenDecision();
  let { error } = await updateSettingsForSource(
    "userSettings",
    {
      tui: renderer,
    },
    undefined,
    context.storageV5,
  );
  if (error) {
    onDone(
      isBridgeOrTransport(context.session)
        ? "Failed to save setting (detail withheld on this connection)."
        : `Failed to save setting: ${error.message}`,
      {
        display: "system",
      },
    );
    return null;
  }
  await resetFullscreenAutoDisable(context.storageV5);
  let bugInfo = hasCursorUpViewportYankBug();
  let isBounce =
    (env.CLAUDE_CODE_TUI_JUST_SWITCHED === "fullscreen" ||
      fullscreenDecision === "downsell_on" ||
      fullscreenProbeState.downsellGateCached === true) &&
    renderer === "default";
  logEvent("tengu_tui_command", {
    fullscreen: isFullscreen,
    from: fromEnum(currentRenderer),
    to: fromEnum(renderer),
    from_entry_path: fromEnum(fullscreenDecision),
    session_age_ms: Math.round(process.uptime() * 1000),
    bounce: isBounce,
    scroll_decay_curve: bugInfo.useDecayCurve,
    scroll_base: bugInfo.base,
    scroll_xtermjs: bugInfo.xtermJs,
  });
  if (alreadyActive) {
    onDone(`Already using the ${renderer} renderer.`, {
      display: "system",
    });
    return null;
  }
  if (
    renderer === "default" &&
    (isBounce || fullscreenDecision === "gb_on" || fullscreenDecision === "settings_on") &&
    is1PEventLoggingEnabled() &&
    logEventTo1P()
  )
    return jsxProd_default(switchRendererFlow, {
      fromEntryPath: fullscreenDecision,
      bounce: isBounce,
      revertKind: isBounce || fullscreenDecision === "gb_on" ? "same_session" : "later_session",
      carryFlags,
      getMessages,
      getIsResponseStreaming,
      proactivity,
      relaunchBlocked,
      storageV5: context.storageV5,
      credentials: context.credentials,
      session: context.session,
      onDone,
    });
  if (relaunchBlocked()) return refuseRendererSwitchWithTasks(renderer, onDone);
  return relaunchInto(
    renderer,
    relaunchState.flags,
    getMessages(),
    relaunchState.handoff,
    context.storageV5,
    {
      responseStreaming: getIsResponseStreaming(),
    },
  ).catch((error) => {
    logError(error);
    onDone(
      isBridgeOrTransport(context.session)
        ? withResumeFlag(
            "Couldn't switch renderers (detail withheld on this connection). The setting was saved; restart Claude Code to apply it.",
            errorMessage(error),
          )
        : relaunchFailedMessage(error),
      {
        display: "system",
      },
    );
    return null;
  });
};
//@ chunk-czq1j3j2.js:170302-170414 placement
function refuseRendererSwitchWithTasks(renderer, onDone) {
  logEvent("tengu_tui_refused", {
    active_tasks: true,
    deferred: true,
  });
  onDone(savedWithoutRestartForTasksMessage(renderer), {
    display: "system",
  });
  return null;
}
//@ chunk-czq1j3j2.js:170414-170460 placement
var EGCOULDNTCOPYTEXT = "egcouldntcopytext";
var COPY_TEXT_TIMEOUT_MS = 5000;
var MAX_DESCRIPTION_CHARS = 2000;
//@ chunk-czq1j3j2.js:170460-173836 placement
/**
 * /tui 切换渲染器的执行流程：校验当前会话能否重启（有后台任务、受限会话等），保存偏好后用 relaunchInto 重启到新渲染器；不能重启时只保存并提示；记录 tengu_tui_optout_reason/tengu_tui_refused。
 */
function switchRendererFlow(props) {
  let $ = useMemoCache(39);
  let {
    fromEntryPath,
    bounce,
    revertKind,
    carryFlags,
    getMessages,
    getIsResponseStreaming,
    proactivity,
    relaunchBlocked,
    storageV5,
    credentials,
    session,
    onDone,
  } = props;
  let [reason, setReason] = useState("");
  let [cursorOffset, setCursorOffset] = useState(0);
  let [submittedReason, setSubmittedReason] = useState(null);
  let { columns } = useTerminalSize();
  let submittedRef = useRef(false);
  let onSubmit;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    onSubmit = (text) => {
      if (submittedRef.current) {
        return;
      }
      submittedRef.current = true;
      setSubmittedReason(text.trim());
    };
    $[0] = onSubmit;
  } else onSubmit = $[0];
  let submitReason = onSubmit;
  let submitEffect;
  if (
    $[1] !== bounce ||
    $[2] !== carryFlags ||
    $[3] !== credentials ||
    $[4] !== fromEntryPath ||
    $[5] !== getIsResponseStreaming ||
    $[6] !== getMessages ||
    $[7] !== onDone ||
    $[8] !== proactivity ||
    $[9] !== relaunchBlocked ||
    $[10] !== revertKind ||
    $[11] !== session ||
    $[12] !== storageV5 ||
    $[13] !== submittedReason
  ) {
    submitEffect = () => {
      if (submittedReason === null) {
        return;
      }
      let cancelled = false;
      (async () => {
        let delay = sleep(SCROLL_JUMP_LINES * 2);
        if (submittedReason && submittedReason.toLowerCase().replace(/[^a-z]/g, "") !== EGCOULDNTCOPYTEXT) {
          let feedbackFields = {
            from_entry_path: fromEnum(fromEntryPath),
            bounce,
            downsell_gate: fullscreenProbeState.downsellGateCached === true,
            revert_kind: fromEnum(revertKind),
            downsell_seen_count: getGlobalConfig().fullscreenDownsellSeenCount ?? 0,
          };
          let timeoutSignal = AbortSignal.timeout(COPY_TEXT_TIMEOUT_MS);
          let report = await submitFeedbackReport({
            description: submittedReason,
            messages: [],
            lastInterruptedAssistantAPIMessageId: null,
            fields: {
              tui_optout: true,
              ...feedbackFields,
            },
            maxDescriptionChars: MAX_DESCRIPTION_CHARS,
            signal: timeoutSignal,
            credentials,
          }).catch(rejectNudgeOnError);
          await (
            report.success
              ? logFeatureOkAsync("tui_optout_reason")
              : logFeatureBadAsync(
                  "tui_optout_reason",
                  report.failureReason ?? (timeoutSignal.aborted ? "timeout" : "unknown"),
                )
          ).catch(logError);
          await logEventTo1PAwaitable("tengu_tui_optout_reason", {
            reason_length: submittedReason.length,
            feedback_id: report.success ? sanitizeMarkName(report.feedbackId) : undefined,
            ...feedbackFields,
          }).catch(logError);
        }
        await delay;
        if (cancelled) {
          return;
        }
        let uncarriedSettings = listUncarriedLaunchSettings(
          proactivity().toolPermissionContext,
          getForkRestrictedLaunchConfig(),
        );
        if (uncarriedSettings.length > 0) {
          logEvent("tengu_tui_refused", {
            uncarriable: true,
          });
          onDone(savedWithoutRestartMessage(uncarriedSettings), {
            display: "system",
          });
          return;
        }
        if (relaunchBlocked()) {
          refuseRendererSwitchWithTasks("default", onDone);
          return;
        }
        relaunchInto("default", carryFlags(), getMessages(), proactivity(), storageV5, {
          responseStreaming: getIsResponseStreaming(),
        }).catch((error) => {
          logError(error);
          onDone(
            isBridgeOrTransport(session)
              ? withResumeFlag(
                  "Couldn't switch renderers (detail withheld on this connection). The setting was saved; restart Claude Code to apply it.",
                  errorMessage(error),
                )
              : relaunchFailedMessage(error),
            {
              display: "system",
            },
          );
        });
      })();
      return () => {
        cancelled = true;
      };
    };
    $[1] = bounce;
    $[2] = carryFlags;
    $[3] = credentials;
    $[4] = fromEntryPath;
    $[5] = getIsResponseStreaming;
    $[6] = getMessages;
    $[7] = onDone;
    $[8] = proactivity;
    $[9] = relaunchBlocked;
    $[10] = revertKind;
    $[11] = session;
    $[12] = storageV5;
    $[13] = submittedReason;
    $[14] = submitEffect;
  } else submitEffect = $[14];
  let submitDeps;
  if (
    $[15] !== bounce ||
    $[16] !== carryFlags ||
    $[17] !== credentials ||
    $[18] !== fromEntryPath ||
    $[19] !== getIsResponseStreaming ||
    $[20] !== getMessages ||
    $[21] !== onDone ||
    $[22] !== proactivity ||
    $[23] !== relaunchBlocked ||
    $[24] !== revertKind ||
    $[25] !== storageV5 ||
    $[26] !== submittedReason
  ) {
    submitDeps = [
      submittedReason,
      fromEntryPath,
      bounce,
      revertKind,
      carryFlags,
      getMessages,
      getIsResponseStreaming,
      proactivity,
      relaunchBlocked,
      storageV5,
      credentials,
      onDone,
    ];
    $[15] = bounce;
    $[16] = carryFlags;
    $[17] = credentials;
    $[18] = fromEntryPath;
    $[19] = getIsResponseStreaming;
    $[20] = getMessages;
    $[21] = onDone;
    $[22] = proactivity;
    $[23] = relaunchBlocked;
    $[24] = revertKind;
    $[25] = storageV5;
    $[26] = submittedReason;
    $[27] = submitDeps;
  } else submitDeps = $[27];
  useEffect(submitEffect, submitDeps);
  let cancel;
  let keybindingsContext;
  if ($[28] === MEMO_CACHE_SENTINEL) {
    cancel = () => submitReason("");
    keybindingsContext = {
      context: "Settings",
    };
    $[28] = cancel;
    $[29] = keybindingsContext;
  } else {
    cancel = $[28];
    keybindingsContext = $[29];
  }
  useKeybinding("confirm:no", cancel, keybindingsContext);
  if (submittedReason !== null) {
    let switchingBox;
    if ($[30] === MEMO_CACHE_SENTINEL) {
      switchingBox = jsxProd_default(Box, {
        paddingX: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "Switching back to the classic renderer\u2026",
        }),
      });
      $[30] = switchingBox;
    } else switchingBox = $[30];
    return switchingBox;
  }
  let onCancel;
  if ($[31] === MEMO_CACHE_SENTINEL) {
    onCancel = () => submitReason("");
    $[31] = onCancel;
  } else onCancel = $[31];
  let inputGuide;
  let questionText;
  if ($[32] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "send",
        }),
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "skip",
        }),
      ],
    });
    questionText = jsxProd_default(Text, {
      children: "To help us make fullscreen mode better, what made you switch back?",
    });
    $[32] = inputGuide;
    $[33] = questionText;
  } else {
    inputGuide = $[32];
    questionText = $[33];
  }
  let promptMark;
  if ($[34] === MEMO_CACHE_SENTINEL) {
    promptMark = jsxProd_default(Text, {
      children: ">",
    });
    $[34] = promptMark;
  } else promptMark = $[34];
  const columns_2 = Math.max(10, columns - 8);
  let dialog;
  if ($[35] !== cursorOffset || $[36] !== reason || $[37] !== columns_2) {
    dialog = jsxProd_default_2(Dialog, {
      title: "Fullscreen feedback",
      onCancel,
      isCancelActive: false,
      inputGuide,
      children: [
        questionText,
        jsxProd_default_2(Box, {
          flexDirection: "row",
          gap: 1,
          children: [
            promptMark,
            jsxProd_default(TextInput, {
              value: reason,
              onChange: setReason,
              onSubmit: submitReason,
              focus: true,
              showCursor: true,
              columns: columns_2,
              cursorOffset,
              onChangeCursorOffset: setCursorOffset,
            }),
          ],
        }),
      ],
    });
    $[35] = cursorOffset;
    $[36] = reason;
    $[37] = columns_2;
    $[38] = dialog;
  } else dialog = $[38];
  return dialog;
}
export {
  relaunchInto,
  relaunchFailedMessage,
  call_2,
  cannotSwitchRendererMessage,
  savedWithoutRestartForTasksMessage,
  savedWithoutRestartMessage,
};
