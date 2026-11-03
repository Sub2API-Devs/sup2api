/**
 * commands/tui/tui.ts
 *
 * 2.1.316 新增。/tui 命令（切换全屏/经典界面）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (10)
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
import { updateSettingsForSource, getInitialSettings_2 } from "../../utils/settings/settings.js";
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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y, R, P } from "../../../vendor/react/cjs/react.production.js";
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

//@ chunk-18hwfzwa.js:161401-161434 placement
var RENDERER_NAMES = ["default", "fullscreen"];
//@ chunk-18hwfzwa.js:161434-161885 placement
async function relaunchInto(h, extraArgs, messages, L, storageV5, { responseStreaming, trial }) {
  await ensureLauncherRunnable();
  let Be = await confirmRelaunch(
    messages,
    "relaunch",
    {
      responseStreaming,
    },
    storageV5,
  );
  return relaunchOrExplain(
    Be,
    {
      freshIfNoTranscript: true,
      extraArgs,
      proactivity: L,
      env: {
        CLAUDE_CODE_TUI_JUST_SWITCHED: h,
        ...(trial && h === "fullscreen" ? TRIAL_ENV : {}),
        ...getScreenReaderEnv(),
        ...sessionAddDirsEnv(L.toolPermissionContext.additionalWorkingDirectories),
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
//@ chunk-18hwfzwa.js:161885-162041 placement
function relaunchFailedMessage(error) {
  return `Couldn't switch renderers \u2014 ${error instanceof Error ? error.message : String(error)}. The setting was saved; restart Claude Code to apply it.`;
}
//@ chunk-18hwfzwa.js:162041-162287 placement
function cannotSwitchRendererMessage(h, x) {
  return `Cannot switch renderers in this session \u2014 it has restrictions a restart can't carry over (${x.join("; ")}). Nothing was changed. Running /tui ${h} in a session started without them switches every later session too.`;
}
//@ chunk-18hwfzwa.js:162287-162473 placement
function savedWithoutRestartMessage(h) {
  return `Staying on the default renderer without a restart \u2014 this session now has restrictions a restart can't carry over (${h.join("; ")}); the preference is saved.`;
}
//@ chunk-18hwfzwa.js:162473-162615 placement
function savedWithoutRestartForTasksMessage(h) {
  return `Staying on the ${h} renderer without a restart \u2014 work is now running in the background; the preference is saved.`;
}
//@ chunk-18hwfzwa.js:162615-166208 placement
/**
 * /tui 命令：查看或切换渲染器（fullscreen/default），处理全屏启动失败后自动关闭的情况。
 */
var call_2 = async (onDone, context, args) => {
  let lower = args.trim().toLowerCase();
  let ee = isFullscreenEnvEnabled() ? "fullscreen" : "default";
  if (lower === "") {
    let Lt =
      getFullscreenDecision() === "crash_auto_off"
        ? isFullscreenAutoDisabledForThisVersion()
          ? " (fullscreen was turned off on this machine after it repeatedly failed to start; /tui fullscreen retries)"
          : " (a fullscreen launch on this machine didn't finish starting last time; /tui fullscreen retries)"
        : "";
    onDone(`Current renderer: ${ee}${Lt}. Usage: /tui <${RENDERER_NAMES.join("|")}>`, {
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
  let ke = lower;
  let Re = () => {
    let toolPermissionContext = getToolPermissionContext(context);
    return [
      ...buildRelaunchArgs(toolPermissionContext, getSessionEffort(context)),
      ...buildPermissionAndAgentArgs(toolPermissionContext, getForkReplayLaunchConfig()),
    ];
  };
  let Be = () => ({
    proactivityLevel: context.getProactivityLevel(),
    toolPermissionContext: getToolPermissionContext(context),
  });
  let He = () => submittedMessages(context);
  let We = () => isMidTurnStreaming(context);
  let ze = () => hasRunningBackgroundTask(context.taskRegistry.all());
  if (isBgSession()) {
    let fullscreenDecision = getFullscreenDecision();
    let { error } = await updateSettingsForSource(
      "userSettings",
      {
        tui: ke,
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
    let Xt = hasCursorUpViewportYankBug();
    logEvent("tengu_tui_command", {
      fullscreen: ke === "fullscreen",
      from: fromEnum(ee),
      to: fromEnum(ke),
      from_entry_path: fromEnum(fullscreenDecision),
      session_age_ms: Math.round(process.uptime() * 1000),
      bounce: false,
      scroll_decay_curve: Xt.useDecayCurve,
      scroll_base: Xt.base,
      scroll_xtermjs: Xt.xtermJs,
    });
    onDone(
      `Saved. Background sessions always use the fullscreen renderer while attached; the ${ke} renderer will apply to sessions started directly with \`claude\`.`,
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
  let Xe = ke === "fullscreen";
  let rt = Xe === isFullscreenEnvEnabled();
  if (rt && getInitialSettings_2().tui === ke) {
    await resetFullscreenAutoDisable(context.storageV5);
    onDone(`Already using the ${ke} renderer.`, {
      display: "system",
    });
    return null;
  }
  let kt = (Lt) => {
    let oo = listUncarriedLaunchSettings(getToolPermissionContext(context), getForkRestrictedLaunchConfig());
    if (oo.length > 0) {
      logEvent("tengu_tui_refused", {
        uncarriable: true,
      });
      return cannotSwitchRendererMessage(ke, oo);
    }
    if (ze()) {
      logEvent("tengu_tui_refused", {
        active_tasks: true,
        ...(Lt && {
          deferred: Lt,
        }),
      });
      return "Cannot switch renderers while work is running in the background \u2014 wait for it to finish (or stop it via /tasks), then run /tui again.";
    }
    return;
  };
  let At;
  if (!rt) {
    let Lt = kt();
    if (Lt === undefined) {
      await saveResumePoint(context.messages, context.storageV5);
      Lt = kt(true);
      At = {
        flags: Re(),
        handoff: Be(),
      };
    }
    if (Lt !== undefined) {
      onDone(Lt, {
        display: "system",
      });
      return null;
    }
  }
  let fullscreenDecision = getFullscreenDecision();
  let { error } = await updateSettingsForSource(
    "userSettings",
    {
      tui: ke,
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
  let Et = hasCursorUpViewportYankBug();
  let Dt =
    (env.CLAUDE_CODE_TUI_JUST_SWITCHED === "fullscreen" ||
      fullscreenDecision === "downsell_on" ||
      fullscreenProbeState.downsellGateCached === true) &&
    ke === "default";
  logEvent("tengu_tui_command", {
    fullscreen: Xe,
    from: fromEnum(ee),
    to: fromEnum(ke),
    from_entry_path: fromEnum(fullscreenDecision),
    session_age_ms: Math.round(process.uptime() * 1000),
    bounce: Dt,
    scroll_decay_curve: Et.useDecayCurve,
    scroll_base: Et.base,
    scroll_xtermjs: Et.xtermJs,
  });
  if (rt) {
    onDone(`Already using the ${ke} renderer.`, {
      display: "system",
    });
    return null;
  }
  if (
    ke === "default" &&
    (Dt || fullscreenDecision === "gb_on" || fullscreenDecision === "settings_on") &&
    is1PEventLoggingEnabled() &&
    logEventTo1P()
  )
    return jsxProd_default(switchRendererFlow, {
      fromEntryPath: fullscreenDecision,
      bounce: Dt,
      revertKind: Dt || fullscreenDecision === "gb_on" ? "same_session" : "later_session",
      carryFlags: Re,
      getMessages: He,
      getIsResponseStreaming: We,
      proactivity: Be,
      relaunchBlocked: ze,
      storageV5: context.storageV5,
      credentials: context.credentials,
      session: context.session,
      onDone,
    });
  if (ze()) return refuseRendererSwitchWithTasks(ke, onDone);
  return relaunchInto(ke, At.flags, He(), At.handoff, context.storageV5, {
    responseStreaming: We(),
  }).catch((error) => {
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
//@ chunk-18hwfzwa.js:166208-166320 placement
function refuseRendererSwitchWithTasks(h, onDone) {
  logEvent("tengu_tui_refused", {
    active_tasks: true,
    deferred: true,
  });
  onDone(savedWithoutRestartForTasksMessage(h), {
    display: "system",
  });
  return null;
}
//@ chunk-18hwfzwa.js:166320-166366 placement
var EGCOULDNTCOPYTEXT = "egcouldntcopytext";
var COPY_TEXT_TIMEOUT_MS = 5000;
var MAX_DESCRIPTION_CHARS = 2000;
//@ chunk-18hwfzwa.js:166366-169743 placement
/**
 * /tui 切换渲染器的执行流程：校验当前会话能否重启（有后台任务、受限会话等），保存偏好后用 relaunchInto 重启到新渲染器；不能重启时只保存并提示；记录 tengu_tui_optout_reason/tengu_tui_refused。
 */
function switchRendererFlow(props) {
  let $ = w(39);
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
  let [kt, At] = y("");
  let [It, Ot] = y(0);
  let [Et, Dt] = y(null);
  let { columns } = useTerminalSize();
  let oo = R(false);
  let io;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    io = (so) => {
      if (oo.current) {
        return;
      }
      oo.current = true;
      Dt(so.trim());
    };
    $[0] = io;
  } else io = $[0];
  let po = io;
  let ao;
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
    $[13] !== Et
  ) {
    ao = () => {
      if (Et === null) {
        return;
      }
      let co = false;
      (async () => {
        let bo = sleep(SCROLL_JUMP_LINES * 2);
        if (Et && Et.toLowerCase().replace(/[^a-z]/g, "") !== EGCOULDNTCOPYTEXT) {
          let Ao = {
            from_entry_path: fromEnum(fromEntryPath),
            bounce,
            downsell_gate: fullscreenProbeState.downsellGateCached === true,
            revert_kind: fromEnum(revertKind),
            downsell_seen_count: getGlobalConfig().fullscreenDownsellSeenCount ?? 0,
          };
          let Bo = AbortSignal.timeout(COPY_TEXT_TIMEOUT_MS);
          let Ro = await submitFeedbackReport({
            description: Et,
            messages: [],
            lastInterruptedAssistantAPIMessageId: null,
            fields: {
              tui_optout: true,
              ...Ao,
            },
            maxDescriptionChars: MAX_DESCRIPTION_CHARS,
            signal: Bo,
            credentials,
          }).catch(rejectNudgeOnError);
          await (
            Ro.success
              ? logFeatureOkAsync("tui_optout_reason")
              : logFeatureBadAsync(
                  "tui_optout_reason",
                  Ro.failureReason ?? (Bo.aborted ? "timeout" : "unknown"),
                )
          ).catch(logError);
          await logEventTo1PAwaitable("tengu_tui_optout_reason", {
            reason_length: Et.length,
            feedback_id: Ro.success ? sanitizeMarkName(Ro.feedbackId) : undefined,
            ...Ao,
          }).catch(logError);
        }
        await bo;
        if (co) {
          return;
        }
        let Ho = listUncarriedLaunchSettings(
          proactivity().toolPermissionContext,
          getForkRestrictedLaunchConfig(),
        );
        if (Ho.length > 0) {
          logEvent("tengu_tui_refused", {
            uncarriable: true,
          });
          onDone(savedWithoutRestartMessage(Ho), {
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
        co = true;
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
    $[13] = Et;
    $[14] = ao;
  } else ao = $[14];
  let Wo;
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
    $[26] !== Et
  ) {
    Wo = [
      Et,
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
    $[26] = Et;
    $[27] = Wo;
  } else Wo = $[27];
  P(ao, Wo);
  let mn;
  let Cn;
  if ($[28] === MEMO_CACHE_SENTINEL) {
    mn = () => po("");
    Cn = {
      context: "Settings",
    };
    $[28] = mn;
    $[29] = Cn;
  } else {
    mn = $[28];
    Cn = $[29];
  }
  useKeybinding("confirm:no", mn, Cn);
  if (Et !== null) {
    let No;
    if ($[30] === MEMO_CACHE_SENTINEL) {
      No = jsxProd_default(Box, {
        paddingX: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "Switching back to the classic renderer\u2026",
        }),
      });
      $[30] = No;
    } else No = $[30];
    return No;
  }
  let onCancel;
  if ($[31] === MEMO_CACHE_SENTINEL) {
    onCancel = () => po("");
    $[31] = onCancel;
  } else onCancel = $[31];
  let inputGuide;
  let Yo;
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
    Yo = jsxProd_default(Text, {
      children: "To help us make fullscreen mode better, what made you switch back?",
    });
    $[32] = inputGuide;
    $[33] = Yo;
  } else {
    inputGuide = $[32];
    Yo = $[33];
  }
  let kn;
  if ($[34] === MEMO_CACHE_SENTINEL) {
    kn = jsxProd_default(Text, {
      children: ">",
    });
    $[34] = kn;
  } else kn = $[34];
  const columns_2 = Math.max(10, columns - 8);
  let bn;
  if ($[35] !== It || $[36] !== kt || $[37] !== columns_2) {
    bn = jsxProd_default_2(Dialog, {
      title: "Fullscreen feedback",
      onCancel,
      isCancelActive: false,
      inputGuide,
      children: [
        Yo,
        jsxProd_default_2(Box, {
          flexDirection: "row",
          gap: 1,
          children: [
            kn,
            jsxProd_default(TextInput, {
              value: kt,
              onChange: At,
              onSubmit: po,
              focus: true,
              showCursor: true,
              columns: columns_2,
              cursorOffset: It,
              onChangeCursorOffset: Ot,
            }),
          ],
        }),
      ],
    });
    $[35] = It;
    $[36] = kt;
    $[37] = columns_2;
    $[38] = bn;
  } else bn = $[38];
  return bn;
}
export { relaunchInto, relaunchFailedMessage };
