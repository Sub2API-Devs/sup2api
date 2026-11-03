/**
 * components/fleet/fleetDispatch.ts
 *
 * 2.1.316 新增：提交派发输入：解析模板/技能/仓库/模型，创建后台会话或执行命令；向会话发送回复（支持 /stop）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-93kwxas0.js (6)
 * attribution: placement 6
 */
import { basename, basename as basename_2, basename as basename_3 } from "path";
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import {
  Ah,
  markDispatchChunk,
  setDispatchWindowValue,
  buildDispatchValueOptions,
  wd,
  vs,
  listPastSessions,
  parseDispatchInput,
  MAX_SPAWN_RETRIES,
  STILL_STARTING_MESSAGE,
  safeRespawnBgSession,
  TRANSIENT_SOCKET_ERRORS,
} from "./fleetSessions.js";
import { expandPastedTextRefs, stripInvisiblePromptChars, M1r } from "../../utils/promptTextSanitize.js";
import { formatInvisibleCharsRemoved } from "../../utils/invisibleChars.js";
import { TVn } from "../../daemon/jobs/draftSweep.js";
import { cX } from "../../utils/handlePromptSubmit.js";
import {
  findCommand,
  getBuiltinCommands,
  isCommandEnabled,
  meetsAvailabilityRequirement,
  builtInCommandNames,
} from "../../commands.js";
import { logError } from "../../utils/log.js";
import { errorMessage, sanitizeErrnoTokenForTelemetry } from "../../utils/errors.js";
import { parseEffortLevel, parseEffortKeyword, EFFORT_LEVELS } from "../../utils/effort.js";
import { isReservedEffortKeyword } from "../../utils/permissions/permissionSetup.js";
import {
  resolveDispatchDefaults,
  gi,
  applyDispatchOverrides,
  takeNotificationLatency,
} from "./dispatchDefaults.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { isFastModeEnabled, getFastModeUnavailableMessage } from "../../utils/fastMode.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { sanitizeSkillNameForTelemetry } from "../../utils/telemetry/skillLoadedEvent.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import {
  rpe,
  parsePastedRefs,
  expandLastPaste,
  getPastedTextRefNumLines,
  formatPastedTextRef,
  ert,
} from "../../history.js";
import { hAr, shallowEqualRecords, dispatchFromFleetView, claimSpare, Y$n } from "../../cli/bg/bgSpare.js";
import { PASTE_THRESHOLD } from "../../utils/imagePaste.js";
import {
  resolveBgAgentTemplate,
  listUserAgentTemplates,
  materializePastedImages,
  dispatchBgSessionTracked,
} from "../../cli/bg/bgSpawnEnv.js";
import {
  makeInitialState,
  isLocalDaemonAgent,
  isSettled,
  getJobDir,
} from "../../services/daemon/jobState.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  applyReplyPatch,
  replyToJob as replyToJob_2,
  REPLY_ENOJOB_MSG,
  REPLY_PEER_NO_SOCK_MSG,
  isReplyDaemonRestartingMsg,
} from "../../daemon/jobs/killJob.js";
import { jobOutcome } from "./fleetRows.js";
import { getModeFromInput } from "../PromptInput/inputModes.js";
import { queuePromptForJob } from "../../services/daemon/spawnLauncher.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

/**
 * 提交派发输入：解析模板/技能/仓库/模型，创建后台会话或执行命令。
 */
//@ chunk-93kwxas0.js:61752-69788 placement
function submitDispatch(h, E) {
  let {
      editor: editor,
      roster: roster,
      selection: selection,
      view: view,
      attach: attach,
      storageV5: storageV5,
      credentials: credentials,
      onAction: onAction,
      exit: exit,
      relaunchForUpdate: relaunchForUpdate,
      searchKeyDown: searchKeyDown,
      willInsertNewline: willInsertNewline,
      canonicalLauncherCwd: canonicalLauncherCwd,
      launcherCwd: launcherCwd,
      effectiveCwd: effectiveCwd,
      scopedFallbackOrigin: scopedFallbackOrigin,
      cwdFilter: cwdFilter,
      dispatchDefaults: dispatchDefaults,
      query: query,
      dispatch: dispatch,
      templates: templates,
      allRepos: allRepos,
      routines: routines,
      templateCache: templateCache,
      suggestions: suggestions,
      skills: skills,
      modelArgMatch: modelArgMatch,
      modelSuggestions: modelSuggestions,
      pickSuggestion: pickSuggestion,
      applySuggestion: applySuggestion,
      closeAgentBrowse: closeAgentBrowse,
      jobSessionIds: jobSessionIds,
      builtRows: builtRows,
      bumpSuggGen: bumpSuggGen,
      mountAt: mountAt,
      focusedRow: focusedRow,
      focused: focused,
      isOnboarding: isOnboarding,
      toggleCollapse: toggleCollapse,
      openEarlier: openEarlier,
      openNewSessionRow: openNewSessionRow,
      openOrRespawn: openOrRespawn,
    } = h,
    Ot = () => {
      (E.preventDefault(), E.stopImmediatePropagation());
    },
    Yt = (gt) => {
      (editor.beginProgrammaticChange(), editor.setQuery(gt), view.setHelpOpen(!1));
    },
    ctrl = E.ctrl;
  if (!ctrl && willInsertNewline(E)) {
    searchKeyDown(E);
    return;
  }
  if ((Ot(), Ah(editor))) return;
  let query_2 = editor.getSnapshot().query,
    tt = expandPastedTextRefs(query_2, editor.pastes);
  if (tt.removed.removedTotal > 0) {
    (stripInvisiblePromptChars(tt.removed, "fleet_dispatch"), markDispatchChunk(editor));
    let gt = tt.input.trim() === "";
    if (tt.input !== query_2) (editor.beginProgrammaticChange(), editor.setQuery(tt.input));
    if (tt.pastedContents !== editor.pastes) editor.replacePastes(tt.pastedContents);
    (editor.setError(null),
      editor.setHint(formatInvisibleCharsRemoved(tt.removed.removedTotal, gt ? "empty" : "review")),
      M1r());
    return;
  }
  let ze = editor.getSnapshot().mode === "bash" ? "!" : editor.getSnapshot().query.trim().toLowerCase(),
    Fe = () => {
      (editor.beginProgrammaticChange(),
        editor.setQuery(""),
        TVn(canonicalLauncherCwd, { q: "", collapsed: [...selection.getSnapshot().collapsed] }, storageV5));
    };
  if (cX.includes(ze)) {
    (Fe(), exit());
    return;
  }
  if (ze.startsWith("/")) {
    let [gt = "", kt = ""] = editor
        .getSnapshot()
        .query.trim()
        .slice(1)
        .split(/\s+(.*)/, 2),
      $e = findCommand(gt.toLowerCase(), getBuiltinCommands());
    if ($e && isCommandEnabled($e) && meetsAvailabilityRequirement($e)) {
      if ($e.fleetHostCall) {
        (Fe(),
          $e
            .fleetHostCall(
              {
                exit: exit,
                relaunch: () => relaunchForUpdate("manual"),
                login: () => onAction({ type: "login" }),
                setError: editor.setError,
                setInfo: editor.setHint,
                storageV5: storageV5,
              },
              kt,
            )
            .catch((ht) => {
              (logError(ht), editor.setError(errorMessage(ht)));
            }));
        return;
      }
      if ($e.type !== "prompt" && $e.name !== "model") {
        let lower = gt.toLowerCase(),
          jt = pickSuggestion();
        if (
          !skills.some((Jt) => Jt.kind !== "command" && (Jt.name === lower || Jt.aliases?.includes(lower))) &&
          (!jt || jt.name === $e.name || $e.isHidden)
        ) {
          if ($e.name === "effort") {
            let trimmed = kt.trim(),
              ct = parseEffortLevel(trimmed);
            if (/^(default|auto)$/i.test(trimmed) || isReservedEffortKeyword(trimmed))
              (Fe(),
                setDispatchWindowValue(
                  editor,
                  dispatchDefaults,
                  "effort",
                  "default",
                  view.getSnapshot().activeTab === "remote",
                ));
            else if (ct)
              (Fe(),
                setDispatchWindowValue(
                  editor,
                  dispatchDefaults,
                  "effort",
                  ct,
                  view.getSnapshot().activeTab === "remote",
                ));
            else if (!trimmed) (Fe(), buildDispatchValueOptions(h, "effort"));
            else {
              let [vt, rt] = trimmed.split(/\s+/),
                Qe = parseEffortKeyword(vt) !== void 0 && rt?.toLowerCase() === "off";
              (editor.setError(null),
                editor.setHint(
                  Qe
                    ? !resolveDispatchDefaults({ launch: dispatchDefaults, window: gi(editor.getSnapshot()) })
                        .ultracode
                      ? "New sessions from this window don't start in ultracode"
                      : getInitialSettings_2().ultracode === !0
                        ? "New sessions start in ultracode because ultracode is on in your settings"
                        : "Ultracode is on from --effort ultracode; /effort <level> turns it off"
                    : parseEffortKeyword(vt) !== void 0
                      ? "Ultracode can't be set for new sessions here \u2014 start agent view with claude agents --effort ultracode, or turn it on in a session with /effort ultracode"
                      : `Unknown effort '${trimmed}' \u2014 use ${EFFORT_LEVELS.join(", ")} or default`,
                ));
            }
            return;
          }
          if ($e.name === "fast") {
            let lower = kt.trim().toLowerCase();
            if (!isFastModeEnabled())
              (editor.setError(null),
                editor.setHint(getFastModeUnavailableMessage() ?? "Fast mode is not available"));
            else if (lower === "default" || lower === "on" || lower === "off")
              (Fe(),
                setDispatchWindowValue(
                  editor,
                  dispatchDefaults,
                  "fast",
                  lower,
                  view.getSnapshot().activeTab === "remote",
                ));
            else if (!lower) (Fe(), buildDispatchValueOptions(h, "fast"));
            else
              (editor.setError(null),
                editor.setHint(`Unknown /fast option '${lower}' \u2014 use on, off or default`));
            return;
          }
          if (
            $e.name === "resume" &&
            !kt.trim() &&
            view.getSnapshot().activeTab !== "remote" &&
            !cwdFilter &&
            wd()
          ) {
            (Fe(), editor.setError(null), editor.setHint(null));
            let openResumePicker = view.openResumePicker(),
              ct = new Set(jobSessionIds);
            if (vs()) {
              for (let rt of builtRows) if (rt.kind === "earlier") ct.add(rt.entry.sessionId);
            }
            listPastSessions(ct, !0, storageV5).then((rt) => {
              if (openResumePicker !== view.resumePickerGen) return;
              if (rt === null) {
                (logFeatureBad("fleet_view_resume_picker", "load_failed"),
                  view.setResumePicker({ entries: [], failed: !0 }));
                return;
              }
              let filtered = rt.filter(
                (Xe) =>
                  !roster.isDeleting(Xe.sessionId.slice(0, 8)) && !roster.isDeletingSession(Xe.sessionId),
              );
              (logFeatureOk("fleet_view_resume_picker", { count: filtered.length }),
                view.setResumePicker({ entries: filtered, failed: !1 }));
            });
            return;
          }
          editor.setError(null);
          let { sanitizedName: sanitizedName, skillNameHash: skillNameHash } = sanitizeSkillNameForTelemetry({
            rawName: $e.name,
            canonicalName: $e.name,
            isMcp: !1,
            isBuiltIn: builtInCommandNames().has($e.name),
            isBundled: !1,
            isOfficial: !1,
          });
          (logEvent("tengu_slash_command_unavailable", {
            command_name: sanitizedName,
            ...skillNameHash,
            surface: view.getSnapshot().activeTab === "remote" ? lit("fleet-cloud") : lit("fleet-local"),
            reason: lit("unavailable_in_agent_view"),
          }),
            editor.setHint(
              $e.name === "config" && getGlobalConfig().defaultToAgentsView === !0
                ? "Run /config in a session. /config defaultToAgentsView=false stops opening here"
                : `/${$e.name} isn't available in agent view \u2014 open a session and run it there`,
            ));
          return;
        }
      }
    }
  }
  if (ze === "/model" || ze.startsWith("/model ")) {
    let gt = pickSuggestion();
    if (!modelArgMatch && gt && gt.kind !== "model");
    else {
      let trimmed = editor.getSnapshot().query.trim().slice(6).trim(),
        lower = trimmed.toLowerCase(),
        mapped = modelSuggestions.map((He) => He.name),
        found = mapped.find((He) => He.toLowerCase() === lower),
        filtered = mapped.filter((He) => He.toLowerCase().startsWith(lower)),
        Jt = modelArgMatch ? gt?.name : void 0,
        qe = found ?? (filtered.length === 1 ? filtered[0] : void 0) ?? Jt;
      if (qe)
        (Fe(),
          setDispatchWindowValue(
            editor,
            dispatchDefaults,
            "model",
            qe,
            view.getSnapshot().activeTab === "remote",
          ));
      else if (!trimmed) (Fe(), buildDispatchValueOptions(h, "model"));
      else editor.setHint(`Unknown model '${trimmed}' \u2014 type /model  to see options`);
      return;
    }
  }
  if (suggestions.length > 0) {
    (applySuggestion(pickSuggestion()), closeAgentBrowse());
    return;
  }
  let Rt = query_2,
    Vt = editor.getSnapshot().mode === "bash",
    Be =
      Rt === query && !Vt ? dispatch : parseDispatchInput(Vt ? `!${Rt}` : Rt, templates, allRepos, routines);
  if (Be?.intent || Be?.routine || Be?.matched) {
    let gt = rpe(Be.intent, editor.pastes);
    if (!Be.routine && !Be.matched && gt.trim().length < MAX_SPAWN_RETRIES) {
      (editor.setError(null), editor.setHint("Too short \u2014 describe the task"));
      return;
    }
    let kt = Be.cwd ?? effectiveCwd,
      $e = templateCache.get(kt);
    if (Be.matched && !Be.exec && !(Be.template.name.includes(":") && kt !== effectiveCwd)) {
      if ($e && !$e.some((pt) => pt.name === Be.template.name || pt.name.endsWith(`:${Be.template.name}`))) {
        editor.setError(`@${Be.template.name} isn't available in ${basename(kt)}`);
        return;
      }
    }
    let ht = applyDispatchOverrides(dispatchDefaults, gi(editor.getSnapshot())),
      jt = hAr(),
      Jt =
        !parsePastedRefs(gt).some((pt) => editor.pastes[pt.id]?.type === "image") &&
        gt.length <= PASTE_THRESHOLD &&
        !gt.includes(`
`),
      qe =
        !!jt &&
        jt.ready &&
        !Be.matched &&
        !Be.routine &&
        kt === jt.cwd &&
        shallowEqualRecords(jt.defaults, ht) &&
        Jt,
      He = qe ? jt.sessionId : randomUUID_3(),
      sliced = He.slice(0, 8);
    ((selection.followId = sliced), editor.beginProgrammaticChange());
    let vt = Be.matched && !Be.exec ? Be.template.name : null,
      rt = Be.matched ? Be.template : resolveBgAgentTemplate(dispatchDefaults, $e),
      pastes = editor.pastes,
      Xe = Be.exec ? rpe(Be.exec, pastes) : void 0,
      St = {
        id: sliced,
        state: makeInitialState({
          template: Xe
            ? { name: "exec", description: "" }
            : Be.routine
              ? { name: Be.routine, description: "" }
              : rt,
          intent: Xe ?? gt,
          sessionId: He,
          cwd: kt,
          originCwd: kt,
        }),
        activity: "flowing",
      };
    roster.updatePendings((pt) => [...pt, St]);
    let Ne = Rt,
      mode = editor.getSnapshot().mode,
      { savedFocusJobId: savedFocusJobId, followOrigin: followOrigin } = selection;
    ((selection.savedFocusJobId = null),
      (selection.followOrigin = null),
      editor.setQuery(""),
      editor.setMode("prompt"),
      TVn(canonicalLauncherCwd, { q: "", collapsed: [...selection.getSnapshot().collapsed] }, storageV5),
      editor.replacePastes({ ...editor.pastes }),
      editor.pruneOrphanedPastes({ pruneTextPastes: !0 }));
    let At = (pt) => {
      (roster.updatePendings((Nt) => {
        let filtered = Nt.filter((Ce) => Ce.id !== sliced);
        if (!editor.getSnapshot().query && filtered.length === 0)
          (editor.mergeRestoredPastes(pastes),
            (selection.savedFocusJobId = savedFocusJobId),
            (selection.followOrigin = followOrigin),
            editor.setMode(mode),
            Yt(Ne));
        return filtered;
      }),
        editor.setError(pt));
    };
    (async () => {
      let pt =
        Xe || Be.matched || $e || !dispatchDefaults?.agent
          ? rt
          : resolveBgAgentTemplate(
              dispatchDefaults,
              await listUserAgentTemplates(kt, storageV5).catch(() => []),
            );
      return Xe
        ? dispatchFromFleetView(Xe, He, kt, storageV5)
        : qe
          ? claimSpare(gt, pt, storageV5)
          : materializePastedImages(gt, pastes, sliced, storageV5).then((Nt) =>
              dispatchBgSessionTracked(
                pt,
                Nt,
                {
                  sessionId: He,
                  targetCwd: kt,
                  routine: Be.routine,
                  defaults: ht,
                  displayIntent: Nt !== gt ? gt : void 0,
                },
                storageV5,
              ),
            );
    })().then(
      (pt) => {
        if (qe)
          Y$n(scopedFallbackOrigin, !1, dispatchDefaults, templateCache.get(scopedFallbackOrigin), storageV5);
        if (!pt.ok) return At(pt.error);
        if (qe && pt.jobId !== sliced)
          ((selection.followId = pt.jobId),
            (St = { ...St, id: pt.jobId, state: { ...St.state, sessionId: pt.sessionId } }),
            roster.updatePendings((Nt) => Nt.map((oo) => (oo.id === sliced ? St : oo))));
        if (qe) roster.kick(pt.sessionId, pt.jobId);
        if (vt) {
          let Nt = !1;
          if (
            (saveGlobalConfig((oo) => {
              let now = Date.now(),
                Ke = oo.agentLastUsed?.[vt];
              if (Ke !== void 0 && now - Ke < 60000) return oo;
              return ((Nt = !0), { ...oo, agentLastUsed: { ...(oo.agentLastUsed ?? {}), [vt]: now } });
            }, storageV5),
            Nt)
          )
            bumpSuggGen();
        }
        if (ctrl) (attach.arm(St.id, null), onAction({ type: "open", job: St, freshDispatch: !0 }));
        else if ((roster.reload(), !qe)) roster.watchPendingJobDir(sliced);
      },
      (pt) => {
        if (qe)
          Y$n(scopedFallbackOrigin, !1, dispatchDefaults, templateCache.get(scopedFallbackOrigin), storageV5);
        At(errorMessage(pt));
      },
    );
  } else if (!Be?.cwd && Be?.exec === void 0) {
    if (Be === null && Rt !== query) return;
    if (focusedRow?.kind === "fold")
      ((selection.followOrigin = null),
        (selection.followId = null),
        selection.expandCap(focusedRow.group),
        logEvent("tengu_fleetview_fold_expand", {
          hidden_count: focusedRow.hidden,
          ms_since_mount: Date.now() - mountAt,
        }));
    else if (focusedRow?.kind === "header") {
      if (isOnboarding || Be === null) return;
      ((selection.followOrigin = focusedRow.group),
        (selection.followId = null),
        toggleCollapse(focusedRow.group));
    } else if (focusedRow?.kind === "earlier") openEarlier(focusedRow.entry, "section");
    else if (focusedRow?.kind === "newsession") openNewSessionRow(focusedRow.origin);
    else openOrRespawn(focused);
  }
}
/**
 * 处理粘贴到派发输入框的内容。
 */
//@ chunk-93kwxas0.js:69788-70256 placement
function handlePasteIntoDispatch(h, E) {
  let { editor: editor, dispatchInputActive: dispatchInputActive, insertAtCursor: insertAtCursor } = h,
    replaced = E.replace(
      /\r\n|\r/g,
      `
`,
    ),
    A = editor.lastMintedPasteId ?? -1,
    L = editor.pastes[A];
  if (dispatchInputActive && L?.type === "text" && L.content === replaced) {
    let D = expandLastPaste(editor.getSnapshot().query, editor.pastes);
    if (D?.id === A) {
      (delete editor.pastes[A],
        editor.setQueryAndCursor(D.expanded, D.cursorOffset),
        editor.setExpandHintPasteId(null));
      return;
    }
  }
  let V = getPastedTextRefNumLines(replaced);
  if (dispatchInputActive && (replaced.length > PASTE_THRESHOLD || V > 2)) {
    let mintTextPaste = editor.mintTextPaste(replaced);
    if ((insertAtCursor(formatPastedTextRef(mintTextPaste, V)), replaced.length <= ert))
      editor.setExpandHintPasteId(mintTextPaste);
    return;
  }
  insertAtCursor(replaced);
}
/**
 * 向会话发送回复（支持 /stop）。
 */
//@ chunk-93kwxas0.js:70256-72623 placement
async function replyToJob(h, E, k) {
  let { editor: editor, roster: roster, attach: attach, awayLoop: awayLoop, storageV5: storageV5 } = h;
  if (E.id.startsWith("remote-pending-")) return STILL_STARTING_MESSAGE;
  if (k.trim() === "/stop" && isLocalDaemonAgent(E.state) && !isSettled(E.state)) {
    if (roster.getSnapshot().pendings.some((pending) => pending.id === E.id)) return STILL_STARTING_MESSAGE;
    try {
      return (await h.stop(E), null);
    } catch (error) {
      return (
        logForDebugging(`[fleetview] /stop from the peek failed: ${errorMessage(error)}`, { level: "warn" }),
        `Couldn't stop \u2014 ${errorMessage(error)}`
      );
    }
  }
  let holdJob = roster.holdJob(E.id),
    D = E.state.resumeSessionId ?? E.state.sessionId,
    kick = roster.kick(D, E.id);
  roster.updateJobs((oe) => {
    if (!oe?.some((ge) => ge.id === E.id)) return oe;
    return oe.map((ge) => {
      if (ge.id !== E.id) return ge;
      let se = applyReplyPatch(ge.state, k);
      return { ...ge, state: se, activity: jobOutcome(se) };
    });
  });
  let N,
    X,
    K = !1,
    W = !1,
    z = !1;
  try {
    let oe = () => takeNotificationLatency(awayLoop, E.state.sessionId, Date.now()),
      ge = await replyToJob_2(E.id, k, E.state, void 0, oe, storageV5);
    if (((N = ge?.err ?? null), (X = ge?.code), N === REPLY_ENOJOB_MSG)) {
      let warming = attach.getWarming(E.id);
      if (warming) {
        await warming;
        let ne = await replyToJob_2(E.id, k, E.state, void 0, oe, storageV5);
        ((N = ne?.err ?? null), (X = ne?.code));
      }
    }
    if (N === REPLY_ENOJOB_MSG && getModeFromInput(k) === "prompt") {
      let se = await safeRespawnBgSession(E.id, { knownState: E.state, initialPrompt: k }, storageV5);
      if (!se.ok && se.alive) {
        let ne = await replyToJob_2(E.id, k, E.state, void 0, oe, storageV5);
        ((N = ne?.err ?? null), (X = ne?.code));
      } else
        ((K = !se.ok),
          (W = !se.ok && se.queued === !0),
          (z = !se.ok && "errorCode" in se && se.errorCode === "dead_epoch_transcript_gone"),
          (N = se.ok ? null : W ? "Reply queued \u2014 will be sent when this session restarts" : se.error));
      if (se.ok) oe();
    }
    if (N) kick();
  } finally {
    holdJob();
  }
  if (N === null) (logFeatureOk("fleet_view_reply"), editor.clearReplyFailure(D));
  else if (N === REPLY_PEER_NO_SOCK_MSG) (logFeatureOk("fleet_view_reply"), editor.clearReplyFailure(D));
  else {
    if (K) logForDebugging(`[fleetview] peek-reply respawn failed: ${N}`);
    let now = Date.now();
    if (editor.isRetryOfRecentReplyFailure(D, now))
      logFeatureSad("fleet_view_reply", "retry_of_recent_failure");
    else if (N === REPLY_ENOJOB_MSG) logFeatureSad("fleet_view_reply", "not_running_no_respawn");
    else if (K && W) logFeatureSad("fleet_view_reply", "queued_for_later");
    else if (z) logFeatureSad("fleet_view_reply", "dead_epoch_transcript_gone");
    else if (K) logFeatureBad("fleet_view_reply", "respawn_failed");
    else if (isReplyDaemonRestartingMsg(N)) logFeatureSad("fleet_view_reply", "daemon_restarting");
    else {
      let ge = N,
        se = [...ge.matchAll(/\bE[A-Z]{2,14}\b/g)].find(
          (me) => !"/\\".includes(ge[me.index - 1] ?? "."),
        )?.[0];
      logForDebugging(`[fleetview] peek-reply send failed: ${ge}`);
      let ne =
          !X &&
          se !== void 0 &&
          TRANSIENT_SOCKET_ERRORS.has(se) &&
          (await queuePromptForJob(getJobDir(E.id), E.state, k, storageV5)),
        ae = { errno: sanitizeErrnoTokenForTelemetry(X ?? se) ?? lit("unknown") };
      if (ne)
        ((N = "Reply queued \u2014 will be sent when this session restarts"),
          logFeatureSad("fleet_view_reply", "queued_for_later", ae));
      else logFeatureBad("fleet_view_reply", "send_failed", ae);
    }
    editor.noteReplyFailure(D, now);
  }
  return (roster.reload(), N);
}
//@ chunk-93kwxas0.js:72623-72627 placement
j();
//@ chunk-93kwxas0.js:72627-72631 placement
j();
//@ chunk-93kwxas0.js:72631-72647 placement
var Lh = 3,
  Bs = 1e4;

export { submitDispatch, Bs, handlePasteIntoDispatch, Lh, replyToJob };
