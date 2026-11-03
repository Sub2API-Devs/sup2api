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
import { vRs } from "../../components/FullscreenUpsellTrial.js";
import { getScreenReaderEnv, isScreenReaderMode } from "../../utils/accessibility/screenReader.js";
import {
  mvt,
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
import { yN, XRe } from "../../utils/promptSubmissionOrigin.js";
import { MGe } from "../../tasks/backgroundTaskLabels.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { updateSettingsForSource, getInitialSettings_2 } from "../../utils/settings/settings.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { resetFullscreenAutoDisable } from "../../utils/fullscreenBootGuard.js";
import { b9 } from "../../ink/terminal.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import {
  is1PEventLoggingEnabled,
  logEventTo1PAwaitable,
} from "../../services/analytics/firstPartyEventLogger.js";
import { logEventTo1P, submitFeedbackReport } from "../../services/feedback/feedbackBundle.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { sleep } from "../../utils/sleep.js";
import { Xh } from "../../ink/scrollConstants.js";
import { getGlobalConfig } from "../../utils/config.js";
import { WNt } from "../../utils/effortMediumNudge.js";
import { logFeatureOkAsync, logFeatureBadAsync } from "../../services/analytics/featureTelemetry.js";
import { ye } from "../../utils/startupMarks.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { Box, Text } from "../../ink/components/Text.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { TextInput } from "../../components/TextInput.js";

//@ chunk-18hwfzwa.js:161401-161434 placement
var mie = ["default", "fullscreen"];
//@ chunk-18hwfzwa.js:161434-161885 placement
async function relaunchInto(h, x, D, L, ee, { responseStreaming: responseStreaming, trial: trial }) {
  await ensureLauncherRunnable();
  let Be = await confirmRelaunch(D, "relaunch", { responseStreaming: responseStreaming }, ee);
  return relaunchOrExplain(
    Be,
    {
      freshIfNoTranscript: !0,
      extraArgs: x,
      proactivity: L,
      env: {
        CLAUDE_CODE_TUI_JUST_SWITCHED: h,
        ...(trial && h === "fullscreen" ? vRs : {}),
        ...getScreenReaderEnv(),
        ...mvt(L.toolPermissionContext.additionalWorkingDirectories),
      },
      dropEnv: [
        "CLAUDE_CODE_NO_FLICKER",
        "CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN",
        "CLAUDE_CODE_FORCE_FULLSCREEN_UPSELL",
      ],
    },
    ee,
  );
}
//@ chunk-18hwfzwa.js:161885-162041 placement
function relaunchFailedMessage(h) {
  return `Couldn't switch renderers \u2014 ${h instanceof Error ? h.message : String(h)}. The setting was saved; restart Claude Code to apply it.`;
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
/**
 * /tui 命令：查看或切换渲染器（fullscreen/default），处理全屏启动失败后自动关闭的情况。
 */
//@ chunk-18hwfzwa.js:162615-166208 placement
var call_2 = async (onDone, context, args) => {
  let lower = args.trim().toLowerCase(),
    ee = isFullscreenEnvEnabled() ? "fullscreen" : "default";
  if (lower === "") {
    let Lt =
      getFullscreenDecision() === "crash_auto_off"
        ? isFullscreenAutoDisabledForThisVersion()
          ? " (fullscreen was turned off on this machine after it repeatedly failed to start; /tui fullscreen retries)"
          : " (a fullscreen launch on this machine didn't finish starting last time; /tui fullscreen retries)"
        : "";
    return (
      onDone(`Current renderer: ${ee}${Lt}. Usage: /tui <${mie.join("|")}>`, { display: "system" }),
      null
    );
  }
  if (!mie.includes(lower))
    return (
      onDone(`Unknown renderer "${lower}". Usage: /tui <${mie.join("|")}>`, { display: "system" }),
      null
    );
  let ke = lower,
    Re = () => {
      let Lt = getToolPermissionContext(context);
      return [
        ...buildRelaunchArgs(Lt, getSessionEffort(context)),
        ...buildPermissionAndAgentArgs(Lt, getForkReplayLaunchConfig()),
      ];
    },
    Be = () => ({
      proactivityLevel: context.getProactivityLevel(),
      toolPermissionContext: getToolPermissionContext(context),
    }),
    He = () => yN(context),
    We = () => XRe(context),
    ze = () => MGe(context.taskRegistry.all());
  if (isBgSession()) {
    let Lt = getFullscreenDecision(),
      { error: error } = await updateSettingsForSource(
        "userSettings",
        { tui: ke },
        void 0,
        context.storageV5,
      );
    if (error)
      return (
        onDone(
          isBridgeOrTransport(context.session)
            ? "Failed to save setting (detail withheld on this connection)."
            : `Failed to save setting: ${error.message}`,
          { display: "system" },
        ),
        null
      );
    await resetFullscreenAutoDisable(context.storageV5);
    let Xt = b9();
    return (
      logEvent("tengu_tui_command", {
        fullscreen: ke === "fullscreen",
        from: fromEnum(ee),
        to: fromEnum(ke),
        from_entry_path: fromEnum(Lt),
        session_age_ms: Math.round(process.uptime() * 1000),
        bounce: !1,
        scroll_decay_curve: Xt.useDecayCurve,
        scroll_base: Xt.base,
        scroll_xtermjs: Xt.xtermJs,
      }),
      onDone(
        `Saved. Background sessions always use the fullscreen renderer while attached; the ${ke} renderer will apply to sessions started directly with \`claude\`.`,
        { display: "system" },
      ),
      null
    );
  }
  if (isScreenReaderMode())
    return (
      onDone(
        "Screen-reader mode always uses the classic renderer, so the tui setting has no effect while it is active.",
        { display: "system" },
      ),
      null
    );
  let Xe = ke === "fullscreen",
    rt = Xe === isFullscreenEnvEnabled();
  if (rt && getInitialSettings_2().tui === ke)
    return (
      await resetFullscreenAutoDisable(context.storageV5),
      onDone(`Already using the ${ke} renderer.`, { display: "system" }),
      null
    );
  let kt = (Lt) => {
      let oo = listUncarriedLaunchSettings(
        getToolPermissionContext(context),
        getForkRestrictedLaunchConfig(),
      );
      if (oo.length > 0)
        return (logEvent("tengu_tui_refused", { uncarriable: !0 }), cannotSwitchRendererMessage(ke, oo));
      if (ze())
        return (
          logEvent("tengu_tui_refused", { active_tasks: !0, ...(Lt && { deferred: Lt }) }),
          "Cannot switch renderers while work is running in the background \u2014 wait for it to finish (or stop it via /tasks), then run /tui again."
        );
      return;
    },
    At;
  if (!rt) {
    let Lt = kt();
    if (Lt === void 0)
      (await saveResumePoint(context.messages, context.storageV5),
        (Lt = kt(!0)),
        (At = { flags: Re(), handoff: Be() }));
    if (Lt !== void 0) return (onDone(Lt, { display: "system" }), null);
  }
  let It = getFullscreenDecision(),
    { error: error } = await updateSettingsForSource("userSettings", { tui: ke }, void 0, context.storageV5);
  if (error)
    return (
      onDone(
        isBridgeOrTransport(context.session)
          ? "Failed to save setting (detail withheld on this connection)."
          : `Failed to save setting: ${error.message}`,
        { display: "system" },
      ),
      null
    );
  await resetFullscreenAutoDisable(context.storageV5);
  let Et = b9(),
    Dt =
      (env.CLAUDE_CODE_TUI_JUST_SWITCHED === "fullscreen" ||
        It === "downsell_on" ||
        fullscreenProbeState.downsellGateCached === !0) &&
      ke === "default";
  if (
    (logEvent("tengu_tui_command", {
      fullscreen: Xe,
      from: fromEnum(ee),
      to: fromEnum(ke),
      from_entry_path: fromEnum(It),
      session_age_ms: Math.round(process.uptime() * 1000),
      bounce: Dt,
      scroll_decay_curve: Et.useDecayCurve,
      scroll_base: Et.base,
      scroll_xtermjs: Et.xtermJs,
    }),
    rt)
  )
    return (onDone(`Already using the ${ke} renderer.`, { display: "system" }), null);
  if (
    ke === "default" &&
    (Dt || It === "gb_on" || It === "settings_on") &&
    is1PEventLoggingEnabled() &&
    logEventTo1P()
  )
    return e(switchRendererFlow, {
      fromEntryPath: It,
      bounce: Dt,
      revertKind: Dt || It === "gb_on" ? "same_session" : "later_session",
      carryFlags: Re,
      getMessages: He,
      getIsResponseStreaming: We,
      proactivity: Be,
      relaunchBlocked: ze,
      storageV5: context.storageV5,
      credentials: context.credentials,
      session: context.session,
      onDone: onDone,
    });
  if (ze()) return refuseRendererSwitchWithTasks(ke, onDone);
  return relaunchInto(ke, At.flags, He(), At.handoff, context.storageV5, { responseStreaming: We() }).catch(
    (Lt) => (
      logError(Lt),
      onDone(
        isBridgeOrTransport(context.session)
          ? withResumeFlag(
              "Couldn't switch renderers (detail withheld on this connection). The setting was saved; restart Claude Code to apply it.",
              errorMessage(Lt),
            )
          : relaunchFailedMessage(Lt),
        { display: "system" },
      ),
      null
    ),
  );
};
//@ chunk-18hwfzwa.js:166208-166320 placement
function refuseRendererSwitchWithTasks(h, x) {
  return (
    logEvent("tengu_tui_refused", { active_tasks: !0, deferred: !0 }),
    x(savedWithoutRestartForTasksMessage(h), { display: "system" }),
    null
  );
}
//@ chunk-18hwfzwa.js:166320-166366 placement
var EGCOULDNTCOPYTEXT = "egcouldntcopytext",
  zBe = 5000,
  YBe = 2000;
/**
 * /tui 切换渲染器的执行流程：校验当前会话能否重启（有后台任务、受限会话等），保存偏好后用 relaunchInto 重启到新渲染器；不能重启时只保存并提示；记录 tengu_tui_optout_reason/tengu_tui_refused。
 */
//@ chunk-18hwfzwa.js:166366-169743 placement
function switchRendererFlow(h) {
  let $ = w(39),
    {
      fromEntryPath: fromEntryPath,
      bounce: bounce,
      revertKind: revertKind,
      carryFlags: carryFlags,
      getMessages: getMessages,
      getIsResponseStreaming: getIsResponseStreaming,
      proactivity: proactivity,
      relaunchBlocked: relaunchBlocked,
      storageV5: storageV5,
      credentials: credentials,
      session: session,
      onDone: onDone,
    } = h,
    [kt, At] = y(""),
    [It, Ot] = y(0),
    [Et, Dt] = y(null),
    { columns: columns } = useTerminalSize(),
    oo = R(!1),
    io;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((io = (so) => {
      if (oo.current) {
        return;
      }
      ((oo.current = !0), Dt(so.trim()));
    }),
      ($[0] = io));
  else io = $[0];
  let po = io,
    ao;
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
  )
    ((ao = () => {
      if (Et === null) {
        return;
      }
      let co = !1;
      return (
        (async () => {
          let bo = sleep(Xh * 2);
          if (Et && Et.toLowerCase().replace(/[^a-z]/g, "") !== EGCOULDNTCOPYTEXT) {
            let Ao = {
              from_entry_path: fromEnum(fromEntryPath),
              bounce: bounce,
              downsell_gate: fullscreenProbeState.downsellGateCached === !0,
              revert_kind: fromEnum(revertKind),
              downsell_seen_count: getGlobalConfig().fullscreenDownsellSeenCount ?? 0,
            };
            let timeout = AbortSignal.timeout(zBe);
            let Ro = await submitFeedbackReport({
              description: Et,
              messages: [],
              lastInterruptedAssistantAPIMessageId: null,
              fields: { tui_optout: !0, ...Ao },
              maxDescriptionChars: YBe,
              signal: timeout,
              credentials: credentials,
            }).catch(WNt);
            (await (
              Ro.success
                ? logFeatureOkAsync("tui_optout_reason")
                : logFeatureBadAsync(
                    "tui_optout_reason",
                    Ro.failureReason ?? (timeout.aborted ? "timeout" : "unknown"),
                  )
            ).catch(logError),
              await logEventTo1PAwaitable("tengu_tui_optout_reason", {
                reason_length: Et.length,
                feedback_id: Ro.success ? ye(Ro.feedbackId) : void 0,
                ...Ao,
              }).catch(logError));
          }
          if ((await bo, co)) {
            return;
          }
          let Ho = listUncarriedLaunchSettings(
            proactivity().toolPermissionContext,
            getForkRestrictedLaunchConfig(),
          );
          if (Ho.length > 0) {
            (logEvent("tengu_tui_refused", { uncarriable: !0 }),
              onDone(savedWithoutRestartMessage(Ho), { display: "system" }));
            return;
          }
          if (relaunchBlocked()) {
            refuseRendererSwitchWithTasks("default", onDone);
            return;
          }
          relaunchInto("default", carryFlags(), getMessages(), proactivity(), storageV5, {
            responseStreaming: getIsResponseStreaming(),
          }).catch((Io) => {
            (logError(Io),
              onDone(
                isBridgeOrTransport(session)
                  ? withResumeFlag(
                      "Couldn't switch renderers (detail withheld on this connection). The setting was saved; restart Claude Code to apply it.",
                      errorMessage(Io),
                    )
                  : relaunchFailedMessage(Io),
                { display: "system" },
              ));
          });
        })(),
        () => {
          co = !0;
        }
      );
    }),
      ($[1] = bounce),
      ($[2] = carryFlags),
      ($[3] = credentials),
      ($[4] = fromEntryPath),
      ($[5] = getIsResponseStreaming),
      ($[6] = getMessages),
      ($[7] = onDone),
      ($[8] = proactivity),
      ($[9] = relaunchBlocked),
      ($[10] = revertKind),
      ($[11] = session),
      ($[12] = storageV5),
      ($[13] = Et),
      ($[14] = ao));
  else ao = $[14];
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
  )
    ((Wo = [
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
    ]),
      ($[15] = bounce),
      ($[16] = carryFlags),
      ($[17] = credentials),
      ($[18] = fromEntryPath),
      ($[19] = getIsResponseStreaming),
      ($[20] = getMessages),
      ($[21] = onDone),
      ($[22] = proactivity),
      ($[23] = relaunchBlocked),
      ($[24] = revertKind),
      ($[25] = storageV5),
      ($[26] = Et),
      ($[27] = Wo));
  else Wo = $[27];
  P(ao, Wo);
  let mn, Cn;
  if ($[28] === MEMO_CACHE_SENTINEL)
    ((mn = () => po("")), (Cn = { context: "Settings" }), ($[28] = mn), ($[29] = Cn));
  else ((mn = $[28]), (Cn = $[29]));
  if ((useKeybinding("confirm:no", mn, Cn), Et !== null)) {
    let No;
    if ($[30] === MEMO_CACHE_SENTINEL)
      ((No = e(Box, {
        paddingX: 1,
        children: e(Text, { dimColor: !0, children: "Switching back to the classic renderer\u2026" }),
      })),
        ($[30] = No));
    else No = $[30];
    return No;
  }
  let No;
  if ($[31] === MEMO_CACHE_SENTINEL) ((No = () => po("")), ($[31] = No));
  else No = $[31];
  let vo, Yo;
  if ($[32] === MEMO_CACHE_SENTINEL)
    ((vo = r(Byline, {
      children: [
        e(KeyboardShortcutHint, { chord: "enter", action: "send" }),
        e(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "skip",
        }),
      ],
    })),
      (Yo = e(Text, { children: "To help us make fullscreen mode better, what made you switch back?" })),
      ($[32] = vo),
      ($[33] = Yo));
  else ((vo = $[32]), (Yo = $[33]));
  let kn;
  if ($[34] === MEMO_CACHE_SENTINEL) ((kn = e(Text, { children: ">" })), ($[34] = kn));
  else kn = $[34];
  const max = Math.max(10, columns - 8);
  let bn;
  if ($[35] !== It || $[36] !== kt || $[37] !== max)
    ((bn = r(Dialog, {
      title: "Fullscreen feedback",
      onCancel: No,
      isCancelActive: !1,
      inputGuide: vo,
      children: [
        Yo,
        r(Box, {
          flexDirection: "row",
          gap: 1,
          children: [
            kn,
            e(TextInput, {
              value: kt,
              onChange: At,
              onSubmit: po,
              focus: !0,
              showCursor: !0,
              columns: max,
              cursorOffset: It,
              onChangeCursorOffset: Ot,
            }),
          ],
        }),
      ],
    })),
      ($[35] = It),
      ($[36] = kt),
      ($[37] = max),
      ($[38] = bn));
  else bn = $[38];
  return bn;
}

export { relaunchInto, relaunchFailedMessage };
