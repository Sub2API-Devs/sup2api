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
  MIN_SPAWN_INTENT_LENGTH,
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
function submitDispatch(services, event) {
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
  } = services;
  let stopEvent = () => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  let setEditorQuery = (value) => {
    editor.beginProgrammaticChange();
    editor.setQuery(value);
    view.setHelpOpen(false);
  };
  let ctrl = event.ctrl;
  if (!ctrl && willInsertNewline(event)) {
    searchKeyDown(event);
    return;
  }
  stopEvent();
  if (isRecentDispatchMark(editor)) return;
  let query_2 = editor.getSnapshot().query;
  let expanded = expandPastedTextRefs(query_2, editor.pastes);
  if (expanded.removed.removedTotal > 0) {
    stripInvisiblePromptChars(expanded.removed, "fleet_dispatch");
    markDispatchChunk(editor);
    let isNowEmpty = expanded.input.trim() === "";
    if (expanded.input !== query_2) {
      editor.beginProgrammaticChange();
      editor.setQuery(expanded.input);
    }
    if (expanded.pastedContents !== editor.pastes) editor.replacePastes(expanded.pastedContents);
    editor.setError(null);
    editor.setHint(
      formatInvisibleCharsRemoved(expanded.removed.removedTotal, isNowEmpty ? "empty" : "review"),
    );
    forceRedraw();
    return;
  }
  let commandInput =
    editor.getSnapshot().mode === "bash" ? "!" : editor.getSnapshot().query.trim().toLowerCase();
  let resetInput = () => {
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
  if (EXIT_COMMAND_WORDS.includes(commandInput)) {
    resetInput();
    exit();
    return;
  }
  if (commandInput.startsWith("/")) {
    let [commandName = "", commandArgs = ""] = editor
      .getSnapshot()
      .query.trim()
      .slice(1)
      .split(/\s+(.*)/, 2);
    let command = findCommand(commandName.toLowerCase(), getBuiltinCommands());
    if (command && isCommandEnabled(command) && meetsAvailabilityRequirement(command)) {
      if (command.fleetHostCall) {
        resetInput();
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
            commandArgs,
          )
          .catch((error) => {
            logError(error);
            editor.setError(errorMessage(error));
          });
        return;
      }
      if (command.type !== "prompt" && command.name !== "model") {
        let lower = commandName.toLowerCase();
        let suggestion = pickSuggestion();
        if (
          !skills.some(
            (skill) => skill.kind !== "command" && (skill.name === lower || skill.aliases?.includes(lower)),
          ) &&
          (!suggestion || suggestion.name === command.name || command.isHidden)
        ) {
          if (command.name === "effort") {
            let keyword = commandArgs.trim();
            let effortLevel = parseEffortLevel(keyword);
            if (/^(default|auto)$/i.test(keyword) || isReservedEffortKeyword(keyword)) {
              resetInput();
              setDispatchWindowValue(
                editor,
                dispatchDefaults,
                "effort",
                "default",
                view.getSnapshot().activeTab === "remote",
              );
            } else if (effortLevel) {
              resetInput();
              setDispatchWindowValue(
                editor,
                dispatchDefaults,
                "effort",
                effortLevel,
                view.getSnapshot().activeTab === "remote",
              );
            } else if (!keyword) {
              resetInput();
              buildDispatchValueOptions(services, "effort");
            } else {
              let [effortWord, suffixWord] = keyword.split(/\s+/);
              let isUltracodeOff =
                parseEffortKeyword(effortWord) !== undefined && suffixWord?.toLowerCase() === "off";
              editor.setError(null);
              editor.setHint(
                isUltracodeOff
                  ? !resolveDispatchDefaults({
                      launch: dispatchDefaults,
                      window: dispatchDefaultsFromJob(editor.getSnapshot()),
                    }).ultracode
                    ? "New sessions from this window don't start in ultracode"
                    : getInitialSettings_2().ultracode === true
                      ? "New sessions start in ultracode because ultracode is on in your settings"
                      : "Ultracode is on from --effort ultracode; /effort <level> turns it off"
                  : parseEffortKeyword(effortWord) !== undefined
                    ? "Ultracode can't be set for new sessions here \u2014 start agent view with claude agents --effort ultracode, or turn it on in a session with /effort ultracode"
                    : `Unknown effort '${keyword}' \u2014 use ${EFFORT_LEVELS.join(", ")} or default`,
              );
            }
            return;
          }
          if (command.name === "fast") {
            let lower = commandArgs.trim().toLowerCase();
            if (!isFastModeEnabled()) {
              editor.setError(null);
              editor.setHint(getFastModeUnavailableMessage() ?? "Fast mode is not available");
            } else if (lower === "default" || lower === "on" || lower === "off") {
              resetInput();
              setDispatchWindowValue(
                editor,
                dispatchDefaults,
                "fast",
                lower,
                view.getSnapshot().activeTab === "remote",
              );
            } else if (!lower) {
              resetInput();
              buildDispatchValueOptions(services, "fast");
            } else {
              editor.setError(null);
              editor.setHint(`Unknown /fast option '${lower}' \u2014 use on, off or default`);
            }
            return;
          }
          if (
            command.name === "resume" &&
            !commandArgs.trim() &&
            view.getSnapshot().activeTab !== "remote" &&
            !cwdFilter &&
            canLoadPastSessions()
          ) {
            resetInput();
            editor.setError(null);
            editor.setHint(null);
            let pickerGeneration = view.openResumePicker();
            let knownSessionIds = new Set(jobSessionIds);
            if (shouldListPastSessions()) {
              for (let row of builtRows) if (row.kind === "earlier") knownSessionIds.add(row.entry.sessionId);
            }
            listPastSessions(knownSessionIds, true, storageV5).then((pastSessions) => {
              if (pickerGeneration !== view.resumePickerGen) return;
              if (pastSessions === null) {
                logFeatureBad("fleet_view_resume_picker", "load_failed");
                view.setResumePicker({
                  entries: [],
                  failed: true,
                });
                return;
              }
              let filtered = pastSessions.filter(
                (session) =>
                  !roster.isDeleting(session.sessionId.slice(0, 8)) &&
                  !roster.isDeletingSession(session.sessionId),
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
  if (commandInput === "/model" || commandInput.startsWith("/model ")) {
    let suggestion = pickSuggestion();
    if (!modelArgMatch && suggestion && suggestion.kind !== "model");
    else {
      let trimmed = editor.getSnapshot().query.trim().slice(6).trim();
      let lower = trimmed.toLowerCase();
      let mapped = modelSuggestions.map((modelSuggestion) => modelSuggestion.name);
      let found = mapped.find((modelName) => modelName.toLowerCase() === lower);
      let filtered = mapped.filter((modelName) => modelName.toLowerCase().startsWith(lower));
      let matchedName = modelArgMatch ? suggestion?.name : undefined;
      let chosenModel = found ?? (filtered.length === 1 ? filtered[0] : undefined) ?? matchedName;
      if (chosenModel) {
        resetInput();
        setDispatchWindowValue(
          editor,
          dispatchDefaults,
          "model",
          chosenModel,
          view.getSnapshot().activeTab === "remote",
        );
      } else if (!trimmed) {
        resetInput();
        buildDispatchValueOptions(services, "model");
      } else editor.setHint(`Unknown model '${trimmed}' \u2014 type /model  to see options`);
      return;
    }
  }
  if (suggestions.length > 0) {
    applySuggestion(pickSuggestion());
    closeAgentBrowse();
    return;
  }
  let trimmedQuery = query_2;
  let isBashMode = editor.getSnapshot().mode === "bash";
  let parsed =
    trimmedQuery === query && !isBashMode
      ? dispatch
      : parseDispatchInput(isBashMode ? `!${trimmedQuery}` : trimmedQuery, templates, allRepos, routines);
  if (parsed?.intent || parsed?.routine || parsed?.matched) {
    let intentText = addPastedEntry(parsed.intent, editor.pastes);
    if (!parsed.routine && !parsed.matched && intentText.trim().length < MIN_SPAWN_INTENT_LENGTH) {
      editor.setError(null);
      editor.setHint("Too short \u2014 describe the task");
      return;
    }
    let cwd = parsed.cwd ?? effectiveCwd;
    let cachedTemplates = templateCache.get(cwd);
    if (parsed.matched && !parsed.exec && !(parsed.template.name.includes(":") && cwd !== effectiveCwd)) {
      if (
        cachedTemplates &&
        !cachedTemplates.some(
          (cachedTemplate) =>
            cachedTemplate.name === parsed.template.name ||
            cachedTemplate.name.endsWith(`:${parsed.template.name}`),
        )
      ) {
        editor.setError(`@${parsed.template.name} isn't available in ${basename(cwd)}`);
        return;
      }
    }
    let defaults = applyDispatchOverrides(dispatchDefaults, dispatchDefaultsFromJob(editor.getSnapshot()));
    let spareHandle = takeSpareHandle();
    let canReuseSpare =
      !parsePastedRefs(intentText).some((pasteRef) => editor.pastes[pasteRef.id]?.type === "image") &&
      intentText.length <= PASTE_THRESHOLD &&
      !intentText.includes(`
`);
    let useSpare =
      !!spareHandle &&
      spareHandle.ready &&
      !parsed.matched &&
      !parsed.routine &&
      cwd === spareHandle.cwd &&
      shallowEqualRecords(spareHandle.defaults, defaults) &&
      canReuseSpare;
    let sessionId = useSpare ? spareHandle.sessionId : randomUUID();
    let short = sessionId.slice(0, 8);
    selection.followId = short;
    editor.beginProgrammaticChange();
    let matchedTemplateName = parsed.matched && !parsed.exec ? parsed.template.name : null;
    let template = parsed.matched
      ? parsed.template
      : resolveBgAgentTemplate(dispatchDefaults, cachedTemplates);
    let pastes = editor.pastes;
    let execIntent = parsed.exec ? addPastedEntry(parsed.exec, pastes) : undefined;
    let pendingEntry = {
      id: short,
      state: makeInitialState({
        template: execIntent
          ? {
              name: "exec",
              description: "",
            }
          : parsed.routine
            ? {
                name: parsed.routine,
                description: "",
              }
            : template,
        intent: execIntent ?? intentText,
        sessionId,
        cwd,
        originCwd: cwd,
      }),
      activity: "flowing",
    };
    roster.updatePendings((pendings) => [...pendings, pendingEntry]);
    let restoredQuery = trimmedQuery;
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
    let handleDispatchError = (errorText) => {
      roster.updatePendings((entries) => {
        let filtered = entries.filter((entry) => entry.id !== short);
        if (!editor.getSnapshot().query && filtered.length === 0) {
          editor.mergeRestoredPastes(pastes);
          selection.savedFocusJobId = savedFocusJobId;
          selection.followOrigin = followOrigin;
          editor.setMode(mode);
          setEditorQuery(restoredQuery);
        }
        return filtered;
      });
      editor.setError(errorText);
    };
    (async () => {
      let resolvedTemplate =
        execIntent || parsed.matched || cachedTemplates || !dispatchDefaults?.agent
          ? template
          : resolveBgAgentTemplate(
              dispatchDefaults,
              await listUserAgentTemplates(cwd, storageV5).catch(() => []),
            );
      return execIntent
        ? dispatchFromFleetView(execIntent, sessionId, cwd, storageV5)
        : useSpare
          ? claimSpare(intentText, resolvedTemplate, storageV5)
          : materializePastedImages(intentText, pastes, short, storageV5).then((materializedIntent) =>
              dispatchBgSessionTracked(
                resolvedTemplate,
                materializedIntent,
                {
                  sessionId,
                  targetCwd: cwd,
                  routine: parsed.routine,
                  defaults,
                  displayIntent: materializedIntent !== intentText ? intentText : undefined,
                },
                storageV5,
              ),
            );
    })().then(
      (dispatchResult) => {
        if (useSpare)
          claimSpareFromPool(
            scopedFallbackOrigin,
            false,
            dispatchDefaults,
            templateCache.get(scopedFallbackOrigin),
            storageV5,
          );
        if (!dispatchResult.ok) return handleDispatchError(dispatchResult.error);
        if (useSpare && dispatchResult.jobId !== short) {
          selection.followId = dispatchResult.jobId;
          pendingEntry = {
            ...pendingEntry,
            id: dispatchResult.jobId,
            state: {
              ...pendingEntry.state,
              sessionId: dispatchResult.sessionId,
            },
          };
          roster.updatePendings((entries) =>
            entries.map((entry) => (entry.id === short ? pendingEntry : entry)),
          );
        }
        if (useSpare) roster.kick(dispatchResult.sessionId, dispatchResult.jobId);
        if (matchedTemplateName) {
          let didRecord = false;
          saveGlobalConfig((config) => {
            let now = Date.now();
            let lastUsed = config.agentLastUsed?.[matchedTemplateName];
            if (lastUsed !== undefined && now - lastUsed < 60000) return config;
            didRecord = true;
            return {
              ...config,
              agentLastUsed: {
                ...(config.agentLastUsed ?? {}),
                [matchedTemplateName]: now,
              },
            };
          }, storageV5);
          if (didRecord) bumpSuggGen();
        }
        if (ctrl) {
          attach.arm(pendingEntry.id, null);
          onAction({
            type: "open",
            job: pendingEntry,
            freshDispatch: true,
          });
        } else {
          roster.reload();
          if (!useSpare) roster.watchPendingJobDir(short);
        }
      },
      (error) => {
        if (useSpare)
          claimSpareFromPool(
            scopedFallbackOrigin,
            false,
            dispatchDefaults,
            templateCache.get(scopedFallbackOrigin),
            storageV5,
          );
        handleDispatchError(errorMessage(error));
      },
    );
  } else if (!parsed?.cwd && parsed?.exec === undefined) {
    if (parsed === null && trimmedQuery !== query) return;
    if (focusedRow?.kind === "fold") {
      selection.followOrigin = null;
      selection.followId = null;
      selection.expandCap(focusedRow.group);
      logEvent("tengu_fleetview_fold_expand", {
        hidden_count: focusedRow.hidden,
        ms_since_mount: Date.now() - mountAt,
      });
    } else if (focusedRow?.kind === "header") {
      if (isOnboarding || parsed === null) return;
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
function handlePasteIntoDispatch(context, pasteText) {
  let { editor, dispatchInputActive, insertAtCursor } = context;
  let replaced = pasteText.replace(
    /\r\n|\r/g,
    `
`,
  );
  let lastPasteId = editor.lastMintedPasteId ?? -1;
  let lastPaste = editor.pastes[lastPasteId];
  if (dispatchInputActive && lastPaste?.type === "text" && lastPaste.content === replaced) {
    let expanded = expandLastPaste(editor.getSnapshot().query, editor.pastes);
    if (expanded?.id === lastPasteId) {
      delete editor.pastes[lastPasteId];
      editor.setQueryAndCursor(expanded.expanded, expanded.cursorOffset);
      editor.setExpandHintPasteId(null);
      return;
    }
  }
  let pastedTextRefNumLines = getPastedTextRefNumLines(replaced);
  if (dispatchInputActive && (replaced.length > PASTE_THRESHOLD || pastedTextRefNumLines > 2)) {
    let pasteId = editor.mintTextPaste(replaced);
    insertAtCursor(formatPastedTextRef(pasteId, pastedTextRefNumLines));
    if (replaced.length <= MAX_HISTORY_ENTRIES) editor.setExpandHintPasteId(pasteId);
    return;
  }
  insertAtCursor(replaced);
}
//@ chunk-93kwxas0.js:70256-72623 placement
/**
 * 向会话发送回复（支持 /stop）。
 */
async function replyToJob(context, focused, replyText) {
  let { editor, roster, attach, awayLoop, storageV5 } = context;
  if (focused.id.startsWith("remote-pending-")) return STILL_STARTING_MESSAGE;
  if (replyText.trim() === "/stop" && isLocalDaemonAgent(focused.state) && !isSettled(focused.state)) {
    if (roster.getSnapshot().pendings.some((pending) => pending.id === focused.id))
      return STILL_STARTING_MESSAGE;
    try {
      await context.stop(focused);
      return null;
    } catch (error) {
      logForDebugging(`[fleetview] /stop from the peek failed: ${errorMessage(error)}`, {
        level: "warn",
      });
      return `Couldn't stop \u2014 ${errorMessage(error)}`;
    }
  }
  let releaseHold = roster.holdJob(focused.id);
  let jobKey = focused.state.resumeSessionId ?? focused.state.sessionId;
  let resumeKick = roster.kick(jobKey, focused.id);
  roster.updateJobs((jobs) => {
    if (!jobs?.some((job) => job.id === focused.id)) return jobs;
    return jobs.map((job) => {
      if (job.id !== focused.id) return job;
      let patchedState = applyReplyPatch(job.state, replyText);
      return {
        ...job,
        state: patchedState,
        activity: jobOutcome(patchedState),
      };
    });
  });
  let errorText;
  let errorCode;
  let respawnFailed = false;
  let wasQueued = false;
  let transcriptGone = false;
  try {
    let consumeLatency = () => takeNotificationLatency(awayLoop, focused.state.sessionId, Date.now());
    let result = await replyToJob_2(
      focused.id,
      replyText,
      focused.state,
      undefined,
      consumeLatency,
      storageV5,
    );
    errorText = result?.err ?? null;
    errorCode = result?.code;
    if (errorText === REPLY_ENOJOB_MSG) {
      let warming = attach.getWarming(focused.id);
      if (warming) {
        await warming;
        let retryResult = await replyToJob_2(
          focused.id,
          replyText,
          focused.state,
          undefined,
          consumeLatency,
          storageV5,
        );
        errorText = retryResult?.err ?? null;
        errorCode = retryResult?.code;
      }
    }
    if (errorText === REPLY_ENOJOB_MSG && getModeFromInput(replyText) === "prompt") {
      let respawnResult = await safeRespawnBgSession(
        focused.id,
        {
          knownState: focused.state,
          initialPrompt: replyText,
        },
        storageV5,
      );
      if (!respawnResult.ok && respawnResult.alive) {
        let retryResult = await replyToJob_2(
          focused.id,
          replyText,
          focused.state,
          undefined,
          consumeLatency,
          storageV5,
        );
        errorText = retryResult?.err ?? null;
        errorCode = retryResult?.code;
      } else {
        respawnFailed = !respawnResult.ok;
        wasQueued = !respawnResult.ok && respawnResult.queued === true;
        transcriptGone =
          !respawnResult.ok &&
          "errorCode" in respawnResult &&
          respawnResult.errorCode === "dead_epoch_transcript_gone";
        errorText = respawnResult.ok
          ? null
          : wasQueued
            ? "Reply queued \u2014 will be sent when this session restarts"
            : respawnResult.error;
      }
      if (respawnResult.ok) consumeLatency();
    }
    if (errorText) resumeKick();
  } finally {
    releaseHold();
  }
  if (errorText === null) {
    logFeatureOk("fleet_view_reply");
    editor.clearReplyFailure(jobKey);
  } else if (errorText === REPLY_PEER_NO_SOCK_MSG) {
    logFeatureOk("fleet_view_reply");
    editor.clearReplyFailure(jobKey);
  } else {
    if (respawnFailed) logForDebugging(`[fleetview] peek-reply respawn failed: ${errorText}`);
    let now = Date.now();
    if (editor.isRetryOfRecentReplyFailure(jobKey, now))
      logFeatureSad("fleet_view_reply", "retry_of_recent_failure");
    else if (errorText === REPLY_ENOJOB_MSG) logFeatureSad("fleet_view_reply", "not_running_no_respawn");
    else if (respawnFailed && wasQueued) logFeatureSad("fleet_view_reply", "queued_for_later");
    else if (transcriptGone) logFeatureSad("fleet_view_reply", "dead_epoch_transcript_gone");
    else if (respawnFailed) logFeatureBad("fleet_view_reply", "respawn_failed");
    else if (isReplyDaemonRestartingMsg(errorText)) logFeatureSad("fleet_view_reply", "daemon_restarting");
    else {
      let errorMessage = errorText;
      let errnoToken = [...errorMessage.matchAll(/\bE[A-Z]{2,14}\b/g)].find(
        (match) => !"/\\".includes(errorMessage[match.index - 1] ?? "."),
      )?.[0];
      logForDebugging(`[fleetview] peek-reply send failed: ${errorMessage}`);
      let queued =
        !errorCode &&
        errnoToken !== undefined &&
        TRANSIENT_SOCKET_ERRORS.has(errnoToken) &&
        (await queuePromptForJob(getJobDir(focused.id), focused.state, replyText, storageV5));
      let telemetryFields = {
        errno: sanitizeErrnoTokenForTelemetry(errorCode ?? errnoToken) ?? lit("unknown"),
      };
      if (queued) {
        errorText = "Reply queued \u2014 will be sent when this session restarts";
        logFeatureSad("fleet_view_reply", "queued_for_later", telemetryFields);
      } else logFeatureBad("fleet_view_reply", "send_failed", telemetryFields);
    }
    editor.noteReplyFailure(jobKey, now);
  }
  roster.reload();
  return errorText;
}
//@ chunk-93kwxas0.js:72623-72627 placement
init_react_production();
//@ chunk-93kwxas0.js:72627-72631 placement
init_react_production();
//@ chunk-93kwxas0.js:72631-72647 placement
var MAX_DISPATCH_RETRIES = 3;
var DISPATCH_TIMEOUT_MS = 1e4;
export { submitDispatch, DISPATCH_TIMEOUT_MS, handlePasteIntoDispatch, MAX_DISPATCH_RETRIES, replyToJob };
