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
import { basename } from "path";
import { randomUUID } from "crypto";
import {
  isRecentDispatchMark,
  markDispatchChunk,
  setDispatchWindowValue,
  buildDispatchValueOptions,
  canLoadPastSessions,
  shouldListPastSessions,
  listPastSessions,
  parseDispatchInput,
  MAX_SPAWN_RETRIES,
  STILL_STARTING_MESSAGE,
  safeRespawnBgSession,
  TRANSIENT_SOCKET_ERRORS,
} from "./fleetSessions.js";
import {
  expandPastedTextRefs,
  stripInvisiblePromptChars,
  forceRedraw,
} from "../../utils/promptTextSanitize.js";
import { formatInvisibleCharsRemoved } from "../../utils/invisibleChars.js";
import { sweepDraft } from "../../daemon/jobs/draftSweep.js";
import { EXIT_COMMAND_WORDS } from "../../utils/handlePromptSubmit.js";
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
  dispatchDefaultsFromJob,
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
  addPastedEntry,
  parsePastedRefs,
  expandLastPaste,
  getPastedTextRefNumLines,
  formatPastedTextRef,
  MAX_HISTORY_ENTRIES,
} from "../../history.js";
import {
  takeSpareHandle,
  shallowEqualRecords,
  dispatchFromFleetView,
  claimSpare,
  claimSpareFromPool,
} from "../../cli/bg/bgSpare.js";
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
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-93kwxas0.js:61752-69788 placement
/**
 * 提交派发输入：解析模板/技能/仓库/模型，创建后台会话或执行命令。
 */
function submitDispatch(submit, event) {
  let {
    editor,
    roster,
    selection,
    view,
    attach,
    storageV5,
    credentials,
    onAction,
    exit,
    relaunchForUpdate,
    searchKeyDown,
    willInsertNewline,
    canonicalLauncherCwd,
    launcherCwd,
    effectiveCwd,
    scopedFallbackOrigin,
    cwdFilter,
    dispatchDefaults,
    query,
    dispatch,
    templates,
    allRepos,
    routines,
    templateCache,
    suggestions,
    skills,
    modelArgMatch,
    modelSuggestions,
    pickSuggestion,
    applySuggestion,
    closeAgentBrowse,
    jobSessionIds,
    builtRows,
    bumpSuggGen,
    mountAt,
    focusedRow,
    focused,
    isOnboarding,
    toggleCollapse,
    openEarlier,
    openNewSessionRow,
    openOrRespawn,
  } = submit;
  let Ot = () => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  let Yt = (gt) => {
    editor.beginProgrammaticChange();
    editor.setQuery(gt);
    view.setHelpOpen(false);
  };
  let ctrl = event.ctrl;
  if (!ctrl && willInsertNewline(event)) {
    searchKeyDown(event);
    return;
  }
  Ot();
  if (isRecentDispatchMark(editor)) return;
  let query_2 = editor.getSnapshot().query;
  let tt = expandPastedTextRefs(query_2, editor.pastes);
  if (tt.removed.removedTotal > 0) {
    stripInvisiblePromptChars(tt.removed, "fleet_dispatch");
    markDispatchChunk(editor);
    let gt = tt.input.trim() === "";
    if (tt.input !== query_2) {
      editor.beginProgrammaticChange();
      editor.setQuery(tt.input);
    }
    if (tt.pastedContents !== editor.pastes) editor.replacePastes(tt.pastedContents);
    editor.setError(null);
    editor.setHint(formatInvisibleCharsRemoved(tt.removed.removedTotal, gt ? "empty" : "review"));
    forceRedraw();
    return;
  }
  let ze = editor.getSnapshot().mode === "bash" ? "!" : editor.getSnapshot().query.trim().toLowerCase();
  let Fe = () => {
    editor.beginProgrammaticChange();
    editor.setQuery("");
    sweepDraft(
      canonicalLauncherCwd,
      {
        q: "",
        collapsed: [...selection.getSnapshot().collapsed],
      },
      storageV5,
    );
  };
  if (EXIT_COMMAND_WORDS.includes(ze)) {
    Fe();
    exit();
    return;
  }
  if (ze.startsWith("/")) {
    let [gt = "", kt = ""] = editor
      .getSnapshot()
      .query.trim()
      .slice(1)
      .split(/\s+(.*)/, 2);
    let command = findCommand(gt.toLowerCase(), getBuiltinCommands());
    if (command && isCommandEnabled(command) && meetsAvailabilityRequirement(command)) {
      if (command.fleetHostCall) {
        Fe();
        command
          .fleetHostCall(
            {
              exit,
              relaunch: () => relaunchForUpdate("manual"),
              login: () =>
                onAction({
                  type: "login",
                }),
              setError: editor.setError,
              setInfo: editor.setHint,
              storageV5,
            },
            kt,
          )
          .catch((error) => {
            logError(error);
            editor.setError(errorMessage(error));
          });
        return;
      }
      if (command.type !== "prompt" && command.name !== "model") {
        let lower = gt.toLowerCase();
        let jt = pickSuggestion();
        if (
          !skills.some(
            (skill) => skill.kind !== "command" && (skill.name === lower || skill.aliases?.includes(lower)),
          ) &&
          (!jt || jt.name === command.name || command.isHidden)
        ) {
          if (command.name === "effort") {
            let trimmed = kt.trim();
            let effortLevel = parseEffortLevel(trimmed);
            if (/^(default|auto)$/i.test(trimmed) || isReservedEffortKeyword(trimmed)) {
              Fe();
              setDispatchWindowValue(
                editor,
                dispatchDefaults,
                "effort",
                "default",
                view.getSnapshot().activeTab === "remote",
              );
            } else if (effortLevel) {
              Fe();
              setDispatchWindowValue(
                editor,
                dispatchDefaults,
                "effort",
                effortLevel,
                view.getSnapshot().activeTab === "remote",
              );
            } else if (!trimmed) {
              Fe();
              buildDispatchValueOptions(submit, "effort");
            } else {
              let [vt, rt] = trimmed.split(/\s+/);
              let Qe = parseEffortKeyword(vt) !== undefined && rt?.toLowerCase() === "off";
              editor.setError(null);
              editor.setHint(
                Qe
                  ? !resolveDispatchDefaults({
                      launch: dispatchDefaults,
                      window: dispatchDefaultsFromJob(editor.getSnapshot()),
                    }).ultracode
                    ? "New sessions from this window don't start in ultracode"
                    : getInitialSettings_2().ultracode === true
                      ? "New sessions start in ultracode because ultracode is on in your settings"
                      : "Ultracode is on from --effort ultracode; /effort <level> turns it off"
                  : parseEffortKeyword(vt) !== undefined
                    ? "Ultracode can't be set for new sessions here \u2014 start agent view with claude agents --effort ultracode, or turn it on in a session with /effort ultracode"
                    : `Unknown effort '${trimmed}' \u2014 use ${EFFORT_LEVELS.join(", ")} or default`,
              );
            }
            return;
          }
          if (command.name === "fast") {
            let lower = kt.trim().toLowerCase();
            if (!isFastModeEnabled()) {
              editor.setError(null);
              editor.setHint(getFastModeUnavailableMessage() ?? "Fast mode is not available");
            } else if (lower === "default" || lower === "on" || lower === "off") {
              Fe();
              setDispatchWindowValue(
                editor,
                dispatchDefaults,
                "fast",
                lower,
                view.getSnapshot().activeTab === "remote",
              );
            } else if (!lower) {
              Fe();
              buildDispatchValueOptions(submit, "fast");
            } else {
              editor.setError(null);
              editor.setHint(`Unknown /fast option '${lower}' \u2014 use on, off or default`);
            }
            return;
          }
          if (
            command.name === "resume" &&
            !kt.trim() &&
            view.getSnapshot().activeTab !== "remote" &&
            !cwdFilter &&
            canLoadPastSessions()
          ) {
            Fe();
            editor.setError(null);
            editor.setHint(null);
            let He = view.openResumePicker();
            let ct = new Set(jobSessionIds);
            if (shouldListPastSessions()) {
              for (let rt of builtRows) if (rt.kind === "earlier") ct.add(rt.entry.sessionId);
            }
            listPastSessions(ct, true, storageV5).then((rt) => {
              if (He !== view.resumePickerGen) return;
              if (rt === null) {
                logFeatureBad("fleet_view_resume_picker", "load_failed");
                view.setResumePicker({
                  entries: [],
                  failed: true,
                });
                return;
              }
              let filtered = rt.filter(
                (Xe) =>
                  !roster.isDeleting(Xe.sessionId.slice(0, 8)) && !roster.isDeletingSession(Xe.sessionId),
              );
              logFeatureOk("fleet_view_resume_picker", {
                count: filtered.length,
              });
              view.setResumePicker({
                entries: filtered,
                failed: false,
              });
            });
            return;
          }
          editor.setError(null);
          let { sanitizedName, skillNameHash } = sanitizeSkillNameForTelemetry({
            rawName: command.name,
            canonicalName: command.name,
            isMcp: false,
            isBuiltIn: builtInCommandNames().has(command.name),
            isBundled: false,
            isOfficial: false,
          });
          logEvent("tengu_slash_command_unavailable", {
            command_name: sanitizedName,
            ...skillNameHash,
            surface: view.getSnapshot().activeTab === "remote" ? lit("fleet-cloud") : lit("fleet-local"),
            reason: lit("unavailable_in_agent_view"),
          });
          editor.setHint(
            command.name === "config" && getGlobalConfig().defaultToAgentsView === true
              ? "Run /config in a session. /config defaultToAgentsView=false stops opening here"
              : `/${command.name} isn't available in agent view \u2014 open a session and run it there`,
          );
          return;
        }
      }
    }
  }
  if (ze === "/model" || ze.startsWith("/model ")) {
    let gt = pickSuggestion();
    if (!modelArgMatch && gt && gt.kind !== "model");
    else {
      let trimmed = editor.getSnapshot().query.trim().slice(6).trim();
      let lower = trimmed.toLowerCase();
      let mapped = modelSuggestions.map((modelSuggestion) => modelSuggestion.name);
      let found = mapped.find((He) => He.toLowerCase() === lower);
      let filtered = mapped.filter((He) => He.toLowerCase().startsWith(lower));
      let Jt = modelArgMatch ? gt?.name : undefined;
      let qe = found ?? (filtered.length === 1 ? filtered[0] : undefined) ?? Jt;
      if (qe) {
        Fe();
        setDispatchWindowValue(
          editor,
          dispatchDefaults,
          "model",
          qe,
          view.getSnapshot().activeTab === "remote",
        );
      } else if (!trimmed) {
        Fe();
        buildDispatchValueOptions(submit, "model");
      } else editor.setHint(`Unknown model '${trimmed}' \u2014 type /model  to see options`);
      return;
    }
  }
  if (suggestions.length > 0) {
    applySuggestion(pickSuggestion());
    closeAgentBrowse();
    return;
  }
  let Rt = query_2;
  let Vt = editor.getSnapshot().mode === "bash";
  let Be =
    Rt === query && !Vt ? dispatch : parseDispatchInput(Vt ? `!${Rt}` : Rt, templates, allRepos, routines);
  if (Be?.intent || Be?.routine || Be?.matched) {
    let gt = addPastedEntry(Be.intent, editor.pastes);
    if (!Be.routine && !Be.matched && gt.trim().length < MAX_SPAWN_RETRIES) {
      editor.setError(null);
      editor.setHint("Too short \u2014 describe the task");
      return;
    }
    let cwd = Be.cwd ?? effectiveCwd;
    let $e = templateCache.get(cwd);
    if (Be.matched && !Be.exec && !(Be.template.name.includes(":") && cwd !== effectiveCwd)) {
      if ($e && !$e.some((pt) => pt.name === Be.template.name || pt.name.endsWith(`:${Be.template.name}`))) {
        editor.setError(`@${Be.template.name} isn't available in ${basename(cwd)}`);
        return;
      }
    }
    let ht = applyDispatchOverrides(dispatchDefaults, dispatchDefaultsFromJob(editor.getSnapshot()));
    let jt = takeSpareHandle();
    let Jt =
      !parsePastedRefs(gt).some((pt) => editor.pastes[pt.id]?.type === "image") &&
      gt.length <= PASTE_THRESHOLD &&
      !gt.includes(`
`);
    let qe =
      !!jt &&
      jt.ready &&
      !Be.matched &&
      !Be.routine &&
      cwd === jt.cwd &&
      shallowEqualRecords(jt.defaults, ht) &&
      Jt;
    let He = qe ? jt.sessionId : randomUUID();
    let sliced = He.slice(0, 8);
    selection.followId = sliced;
    editor.beginProgrammaticChange();
    let vt = Be.matched && !Be.exec ? Be.template.name : null;
    let rt = Be.matched ? Be.template : resolveBgAgentTemplate(dispatchDefaults, $e);
    let pastes = editor.pastes;
    let Xe = Be.exec ? addPastedEntry(Be.exec, pastes) : undefined;
    let St = {
      id: sliced,
      state: makeInitialState({
        template: Xe
          ? {
              name: "exec",
              description: "",
            }
          : Be.routine
            ? {
                name: Be.routine,
                description: "",
              }
            : rt,
        intent: Xe ?? gt,
        sessionId: He,
        cwd,
        originCwd: cwd,
      }),
      activity: "flowing",
    };
    roster.updatePendings((pt) => [...pt, St]);
    let Ne = Rt;
    let mode = editor.getSnapshot().mode;
    let { savedFocusJobId, followOrigin } = selection;
    selection.savedFocusJobId = null;
    selection.followOrigin = null;
    editor.setQuery("");
    editor.setMode("prompt");
    sweepDraft(
      canonicalLauncherCwd,
      {
        q: "",
        collapsed: [...selection.getSnapshot().collapsed],
      },
      storageV5,
    );
    editor.replacePastes({
      ...editor.pastes,
    });
    editor.pruneOrphanedPastes({
      pruneTextPastes: true,
    });
    let At = (pt) => {
      roster.updatePendings((Nt) => {
        let filtered = Nt.filter((Ce) => Ce.id !== sliced);
        if (!editor.getSnapshot().query && filtered.length === 0) {
          editor.mergeRestoredPastes(pastes);
          selection.savedFocusJobId = savedFocusJobId;
          selection.followOrigin = followOrigin;
          editor.setMode(mode);
          Yt(Ne);
        }
        return filtered;
      });
      editor.setError(pt);
    };
    (async () => {
      let pt =
        Xe || Be.matched || $e || !dispatchDefaults?.agent
          ? rt
          : resolveBgAgentTemplate(
              dispatchDefaults,
              await listUserAgentTemplates(cwd, storageV5).catch(() => []),
            );
      return Xe
        ? dispatchFromFleetView(Xe, He, cwd, storageV5)
        : qe
          ? claimSpare(gt, pt, storageV5)
          : materializePastedImages(gt, pastes, sliced, storageV5).then((Nt) =>
              dispatchBgSessionTracked(
                pt,
                Nt,
                {
                  sessionId: He,
                  targetCwd: cwd,
                  routine: Be.routine,
                  defaults: ht,
                  displayIntent: Nt !== gt ? gt : undefined,
                },
                storageV5,
              ),
            );
    })().then(
      (pt) => {
        if (qe)
          claimSpareFromPool(
            scopedFallbackOrigin,
            false,
            dispatchDefaults,
            templateCache.get(scopedFallbackOrigin),
            storageV5,
          );
        if (!pt.ok) return At(pt.error);
        if (qe && pt.jobId !== sliced) {
          selection.followId = pt.jobId;
          St = {
            ...St,
            id: pt.jobId,
            state: {
              ...St.state,
              sessionId: pt.sessionId,
            },
          };
          roster.updatePendings((Nt) => Nt.map((oo) => (oo.id === sliced ? St : oo)));
        }
        if (qe) roster.kick(pt.sessionId, pt.jobId);
        if (vt) {
          let Nt = false;
          saveGlobalConfig((oo) => {
            let now = Date.now();
            let Ke = oo.agentLastUsed?.[vt];
            if (Ke !== undefined && now - Ke < 60000) return oo;
            Nt = true;
            return {
              ...oo,
              agentLastUsed: {
                ...(oo.agentLastUsed ?? {}),
                [vt]: now,
              },
            };
          }, storageV5);
          if (Nt) bumpSuggGen();
        }
        if (ctrl) {
          attach.arm(St.id, null);
          onAction({
            type: "open",
            job: St,
            freshDispatch: true,
          });
        } else {
          roster.reload();
          if (!qe) roster.watchPendingJobDir(sliced);
        }
      },
      (error) => {
        if (qe)
          claimSpareFromPool(
            scopedFallbackOrigin,
            false,
            dispatchDefaults,
            templateCache.get(scopedFallbackOrigin),
            storageV5,
          );
        At(errorMessage(error));
      },
    );
  } else if (!Be?.cwd && Be?.exec === undefined) {
    if (Be === null && Rt !== query) return;
    if (focusedRow?.kind === "fold") {
      selection.followOrigin = null;
      selection.followId = null;
      selection.expandCap(focusedRow.group);
      logEvent("tengu_fleetview_fold_expand", {
        hidden_count: focusedRow.hidden,
        ms_since_mount: Date.now() - mountAt,
      });
    } else if (focusedRow?.kind === "header") {
      if (isOnboarding || Be === null) return;
      selection.followOrigin = focusedRow.group;
      selection.followId = null;
      toggleCollapse(focusedRow.group);
    } else if (focusedRow?.kind === "earlier") openEarlier(focusedRow.entry, "section");
    else if (focusedRow?.kind === "newsession") openNewSessionRow(focusedRow.origin);
    else openOrRespawn(focused);
  }
}
//@ chunk-93kwxas0.js:69788-70256 placement
/**
 * 处理粘贴到派发输入框的内容。
 */
function handlePasteIntoDispatch(h, E) {
  let { editor, dispatchInputActive, insertAtCursor } = h;
  let replaced = E.replace(
    /\r\n|\r/g,
    `
`,
  );
  let A = editor.lastMintedPasteId ?? -1;
  let L = editor.pastes[A];
  if (dispatchInputActive && L?.type === "text" && L.content === replaced) {
    let D = expandLastPaste(editor.getSnapshot().query, editor.pastes);
    if (D?.id === A) {
      delete editor.pastes[A];
      editor.setQueryAndCursor(D.expanded, D.cursorOffset);
      editor.setExpandHintPasteId(null);
      return;
    }
  }
  let pastedTextRefNumLines = getPastedTextRefNumLines(replaced);
  if (dispatchInputActive && (replaced.length > PASTE_THRESHOLD || pastedTextRefNumLines > 2)) {
    let D = editor.mintTextPaste(replaced);
    insertAtCursor(formatPastedTextRef(D, pastedTextRefNumLines));
    if (replaced.length <= MAX_HISTORY_ENTRIES) editor.setExpandHintPasteId(D);
    return;
  }
  insertAtCursor(replaced);
}
//@ chunk-93kwxas0.js:70256-72623 placement
/**
 * 向会话发送回复（支持 /stop）。
 */
async function replyToJob(h, focused, k) {
  let { editor, roster, attach, awayLoop, storageV5 } = h;
  if (focused.id.startsWith("remote-pending-")) return STILL_STARTING_MESSAGE;
  if (k.trim() === "/stop" && isLocalDaemonAgent(focused.state) && !isSettled(focused.state)) {
    if (roster.getSnapshot().pendings.some((pending) => pending.id === focused.id))
      return STILL_STARTING_MESSAGE;
    try {
      await h.stop(focused);
      return null;
    } catch (error) {
      logForDebugging(`[fleetview] /stop from the peek failed: ${errorMessage(error)}`, {
        level: "warn",
      });
      return `Couldn't stop \u2014 ${errorMessage(error)}`;
    }
  }
  let V = roster.holdJob(focused.id);
  let D = focused.state.resumeSessionId ?? focused.state.sessionId;
  let U = roster.kick(D, focused.id);
  roster.updateJobs((oe) => {
    if (!oe?.some((ge) => ge.id === focused.id)) return oe;
    return oe.map((ge) => {
      if (ge.id !== focused.id) return ge;
      let se = applyReplyPatch(ge.state, k);
      return {
        ...ge,
        state: se,
        activity: jobOutcome(se),
      };
    });
  });
  let N;
  let X;
  let K = false;
  let W = false;
  let z = false;
  try {
    let oe = () => takeNotificationLatency(awayLoop, focused.state.sessionId, Date.now());
    let ge = await replyToJob_2(focused.id, k, focused.state, undefined, oe, storageV5);
    N = ge?.err ?? null;
    X = ge?.code;
    if (N === REPLY_ENOJOB_MSG) {
      let warming = attach.getWarming(focused.id);
      if (warming) {
        await warming;
        let ne = await replyToJob_2(focused.id, k, focused.state, undefined, oe, storageV5);
        N = ne?.err ?? null;
        X = ne?.code;
      }
    }
    if (N === REPLY_ENOJOB_MSG && getModeFromInput(k) === "prompt") {
      let se = await safeRespawnBgSession(
        focused.id,
        {
          knownState: focused.state,
          initialPrompt: k,
        },
        storageV5,
      );
      if (!se.ok && se.alive) {
        let ne = await replyToJob_2(focused.id, k, focused.state, undefined, oe, storageV5);
        N = ne?.err ?? null;
        X = ne?.code;
      } else {
        K = !se.ok;
        W = !se.ok && se.queued === true;
        z = !se.ok && "errorCode" in se && se.errorCode === "dead_epoch_transcript_gone";
        N = se.ok ? null : W ? "Reply queued \u2014 will be sent when this session restarts" : se.error;
      }
      if (se.ok) oe();
    }
    if (N) U();
  } finally {
    V();
  }
  if (N === null) {
    logFeatureOk("fleet_view_reply");
    editor.clearReplyFailure(D);
  } else if (N === REPLY_PEER_NO_SOCK_MSG) {
    logFeatureOk("fleet_view_reply");
    editor.clearReplyFailure(D);
  } else {
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
      let ge = N;
      let se = [...ge.matchAll(/\bE[A-Z]{2,14}\b/g)].find(
        (me) => !"/\\".includes(ge[me.index - 1] ?? "."),
      )?.[0];
      logForDebugging(`[fleetview] peek-reply send failed: ${ge}`);
      let ne =
        !X &&
        se !== undefined &&
        TRANSIENT_SOCKET_ERRORS.has(se) &&
        (await queuePromptForJob(getJobDir(focused.id), focused.state, k, storageV5));
      let ae = {
        errno: sanitizeErrnoTokenForTelemetry(X ?? se) ?? lit("unknown"),
      };
      if (ne) {
        N = "Reply queued \u2014 will be sent when this session restarts";
        logFeatureSad("fleet_view_reply", "queued_for_later", ae);
      } else logFeatureBad("fleet_view_reply", "send_failed", ae);
    }
    editor.noteReplyFailure(D, now);
  }
  roster.reload();
  return N;
}
//@ chunk-93kwxas0.js:72623-72627 placement
init_react_production();
//@ chunk-93kwxas0.js:72627-72631 placement
init_react_production();
//@ chunk-93kwxas0.js:72631-72647 placement
var MAX_DISPATCH_RETRIES = 3;
var DISPATCH_TIMEOUT_MS = 1e4;
export { submitDispatch, DISPATCH_TIMEOUT_MS, handlePasteIntoDispatch, MAX_DISPATCH_RETRIES, replyToJob };
