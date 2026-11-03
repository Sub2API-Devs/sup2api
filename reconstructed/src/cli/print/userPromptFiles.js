/**
 * cli/print/userPromptFiles.ts
 *
 * 2.1.316 新增：用户提示附带文件的获取、重取与缺失说明，部分流撤回
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (26)
 * attribution: placement 26
 */
import { join } from "path";
import { mkdir, writeFile, lstat } from "fs/promises";
import {
  isHumanIngressFrame,
  prependIngressFiles,
  ingressPromptContent,
  resolveIngressOrigins,
} from "../remoteIO/ingress.js";
import { isTextNotTyped, createContentBlockStopEvent } from "../../entrypoints/sdk/coreSchemas.js";
import {
  describeAttachmentFailures,
  contentWithPlannedPathRefs,
  allMissing,
  isQueryableAttachmentFile,
  sanitizedAttachmentInnerName,
  asideSentence,
  NO_SPACE_FOR_A_FILE,
  shouldQueryInboundAttachment,
  extractInboundAttachments,
  resolveInboundAttachments,
} from "../../bridge/inboundAttachments.js";
import { sessionUploadsDir, getUploadsDir, uploadsRootCandidates } from "../../utils/uploadsDir.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { UNPLANNABLE_REASONS, refreshFilesPlacedByName } from "./taskListRestore.js";
import {
  lastInlineArrivingMessageId,
  enqueueArrivingFileMessage,
  runBesideArrivingFiles,
} from "../../bridge/attachmentFilesWait.js";
import { isFilePersistenceEnabled } from "../../utils/filePersistence/filePersistence.js";
import { AGENT_VERB } from "../../components/tasks/RemoteSessionDetailDialog.js";
import { logError } from "../../utils/log.js";
import {
  getDisableFileMentions,
  getSessionId,
  mainAgentId,
  getSessionUploadsDirOverride,
} from "../../bootstrap/state.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { hasLink } from "../../utils/hasLink.js";
import { hasSettingsHookForEvent } from "../../utils/hooks.js";
import { dispatchClassicEvent } from "../../plugins/functionHooks/modAdmission.js";
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import { logBridgeAttachmentsMissing } from "./resumeTurnBoundaries.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { enqueuePendingNotification } from "../../utils/messageQueueManager.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { MESSAGE_FILES_MISSING, MESSAGE_FILES_MOVED } from "../../constants/xml.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  isGrowthBookEnabled,
  hasFreshGrowthBookFeatures,
} from "../../services/analytics/growthbook.js";
import { isGatedInbound } from "../../utils/crossSessionInbound/inboundGate.js";
import { hasTeammateMessageEnvelope } from "../../bridge/inboundMessageOrigin.js";
import { isValidKeySegment, STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getErrnoCode } from "../../utils/errors.js";
import { findMessageIndex } from "./queuedMessageUtils.js";
import { getContentText, getUserMessageText, isPingStreamEvent } from "../../utils/messages.js";
import { startSessionActivity, endActivity } from "../../utils/sessionActivity.js";
import { createAbortController } from "../../utils/abortController.js";
import { withDeadline } from "../../utils/sleep.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnumOpt, fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { streamMessageDelta, usageForStream, streamMessageStop } from "./sdkMessageStream.js";

//@ chunk-tyg7f3ek.js:230577-232009 placement
/**
 * 处理用户消息附带的文件（远程上传）：按 id 拉取、保存到上传目录，失败时告知模型哪些文件缺失。
 */
function fetchUserPromptFiles({
  aheadOfFiles,
  attachments,
  resolveArguments,
  sessionHooks,
  namedByIdHash = false,
  tellModel = filesNotSavedNote,
}) {
  let [S, R, w, P, L] = resolveArguments;
  let q = w.isRemoteIO ? aheadOfFiles : undefined;
  let x = {
    isRemoteIO: w.isRemoteIO,
    uuid: S.uuid,
    attachments,
  };
  let G = isHumanIngressFrame(S, w)
    ? attachments.flatMap(({ file_uuid: fileUuid, file_name: fileName, sha256 }) =>
        sha256 === undefined
          ? [
              {
                fileUuid,
                name: fileName,
              },
            ]
          : [],
      )
    : [];
  let Z = [S, R, w, P, L, undefined, q, namedByIdHash];
  let re =
    aheadOfFiles === "off" || attachments.length === 0
      ? "not_asked"
      : w.peerFrom !== undefined
        ? "peer"
        : !allFilesUnfetchable(attachments, aheadOfFiles)
          ? "file_kinds"
          : isTextNotTyped(S) && describeAttachmentFailures(attachments).all_files_binary_ext_no_sha256 !== 1
            ? "text_not_typed"
            : hasPromptSubmitHooks(sessionHooks)
              ? "prompt_hook"
              : undefined;
  let Ae = re === undefined ? sessionUploadsDir() : "";
  let Ue = re === undefined ? contentWithPlannedPathRefs(S, R, Ae, namedByIdHash) : undefined;
  if (Ue === undefined) {
    if (re !== "not_asked") {
      let Me = re ?? "unplannable";
      logForDiagnosticsNoPII("info", "user_message_waits_for_files", {
        reason: Me,
        reason_code: UNPLANNABLE_REASONS[Me],
        file_count: attachments.length,
      });
    }
    let ie = attachments.length > 0 ? lastInlineArrivingMessageId() : undefined;
    let Se = ie === undefined ? prependIngressFiles(...Z) : ie.then(() => prependIngressFiles(...Z));
    let me =
      G.length > 0 && isFilePersistenceEnabled()
        ? Se.then(async (Me) => {
            if (AGENT_VERB(G)) await enqueueArrivingFileMessage(() => refreshFilesPlacedByName(G));
            return Me;
          })
        : Se;
    return {
      resolving: me,
      queuedAheadOfFiles: false,
      frameAdmission: (Me) => {
        if (Me) me.then((Ee) => reportMissingBridgeAttachments(x, Ee.missingFiles)).catch(logError);
      },
    };
  }
  let startTime = performance.now();
  let deferred = Promise.withResolvers();
  enqueueArrivingFileMessage(async () => {
    let ie = await prependIngressFiles(S, R, w, P, L, Ae, q, namedByIdHash);
    if (AGENT_VERB(G)) await refreshFilesPlacedByName(G);
    return ie;
  }, Ue.paths)
    .then(
      (ie) => describeMissingFiles(Ue.refs, ie, startTime, deferred.promise, x, tellModel),
      (error) => {
        logError(error);
        describeMissingFiles(
          Ue.refs,
          {
            content: "",
            missingFiles: allMissing(attachments, "not_finished"),
          },
          startTime,
          deferred.promise,
          x,
          tellModel,
        );
      },
    )
    .catch(logError);
  return {
    resolving: Promise.resolve({
      content: Ue.content,
      inlinedImagePaths: [],
    }),
    queuedAheadOfFiles: true,
    frameAdmission: deferred.resolve,
  };
}
//@ chunk-tyg7f3ek.js:232009-232216 placement
function allFilesUnfetchable(attachments, aheadOfFiles) {
  if (getDisableFileMentions())
    return attachments.every(
      (r) =>
        r.is_image !== true &&
        r.sha256 === undefined &&
        !isQueryableAttachmentFile(sanitizedAttachmentInnerName(r)),
    );
  return (
    describeAttachmentFailures(attachments)[
      aheadOfFiles === "on_with_pdfs"
        ? "all_files_binary_ext_or_pdf_no_sha256"
        : "all_files_binary_ext_no_sha256"
    ] === 1
  );
}
//@ chunk-tyg7f3ek.js:232216-232425 placement
function hasPromptSubmitHooks(sessionHooks) {
  try {
    let filtered = getPluginRegistry().loadedModules.filter((loadedModule) => !hasLink(loadedModule));
    return (
      hasSettingsHookForEvent("UserPromptSubmit", sessionHooks, getSessionId(), false) ||
      dispatchClassicEvent("UserPromptSubmit") ||
      hasModuleHookingSite("prompt.submit", undefined, filtered) ||
      hasModuleHookingSite("turn.start", undefined, filtered)
    );
  } catch (error) {
    logError(error);
    return true;
  }
}
//@ chunk-tyg7f3ek.js:232425-232499 placement
function reportMissingBridgeAttachments({ isRemoteIO, uuid, attachments }, s) {
  if (isRemoteIO) logBridgeAttachmentsMissing(uuid, attachments.length, s);
}
//@ chunk-tyg7f3ek.js:232499-232650 placement
function missingFileRefs(e, n, r, s) {
  return r.flatMap((h, y) =>
    e.includes(n[y])
      ? [
          s?.find((S) => S.file_uuid === h.file_uuid) ?? {
            file_uuid: h.file_uuid,
            reason: "download",
          },
        ]
      : [],
  );
}
//@ chunk-tyg7f3ek.js:232650-233618 placement
function describeMissingFiles(
  refs,
  { content, missingFiles, asideOutcomes = [], noSpace },
  y,
  promise,
  R,
  tellModel,
) {
  let P =
    typeof content === "string"
      ? content
      : content.map((Ue) => (Ue.type === "text" ? Ue.text : "")).join(`
`);
  let filtered = refs.filter((Ue) => !P.includes(Ue));
  let filtered_2 = asideOutcomes.filter((asideOutcome) => !asideOutcome.saved);
  let x = new Set(filtered_2.map((Ue) => `@"${Ue.path}"`));
  let filtered_3 = filtered.filter((Ue) => !x.has(Ue));
  let Z = {
    notSaved: filtered_2.map((Ue) => asideSentence(Ue, true)),
    moved: asideOutcomes
      .filter((asideOutcome) => asideOutcome.saved)
      .map((asideOutcome) => asideSentence(asideOutcome, true)),
  };
  let re = Z.notSaved.length + Z.moved.length;
  let Ae = {
    file_count: refs.length,
    missing_file_count: filtered.length,
    ended_after_queue_ms: Math.round(performance.now() - y),
    ...(re > 0 && {
      late_aside_line_count: re,
    }),
  };
  if (filtered.length === 0) logFeatureOk("bridge_attachment_turn_before_files", Ae);
  else if (filtered.length < refs.length)
    logFeatureSad("bridge_attachment_turn_before_files", "some_missing", Ae);
  else logFeatureBad("bridge_attachment_turn_before_files", "all_missing", Ae);
  logForDiagnosticsNoPII(filtered.length === 0 ? "info" : "warn", "user_message_files_ended_after_queue", Ae);
  if (filtered.length === 0 && re === 0) return;
  promise
    .then((Ue) => {
      if (Ue) {
        tellModel(refs.length, filtered_3, false, 0, noSpace, Z);
        if (filtered.length > 0)
          reportMissingBridgeAttachments(R, missingFileRefs(filtered, refs, R.attachments, missingFiles));
      }
    })
    .catch(logError);
}
//@ chunk-tyg7f3ek.js:233618-234608 placement
function filesNotSavedNote(
  sentCount,
  lost,
  r = false,
  s = 0,
  h = false,
  y = {
    notSaved: [],
    moved: [],
  },
) {
  let S = [
    ...(lost.length > 0
      ? [
          `${lost.length} of the ${sentCount} file(s) attached to a user message could not be fetched or saved${r ? " again, so these paths, which the message names, may be missing" : ", so these paths, which the message names, were not written"}: ${lost.map((w) => escapeXml(w.slice(1))).join(", ")}`,
        ]
      : []),
    ...(s > 0
      ? [
          `${lost.length > 0 ? `${s} more of them may be missing too` : `${s} of the ${sentCount} file(s) attached to an earlier user message may be missing from the uploads folder`}, and it is not known which. If a file that the conversation names in the uploads folder is not found, ask the user to attach it again.`,
        ]
      : []),
    ...y.notSaved.map((w) => escapeXml(w)),
    ...(h ? [NO_SPACE_FOR_A_FILE] : []),
  ];
  let mapped = y.moved.map((w) => escapeXml(w));
  if (S.length === 0 && mapped.length === 0) return;
  enqueuePendingNotification({
    value: formatTaskNotification({
      body: `${
        S.length > 0
          ? `
<${MESSAGE_FILES_MISSING}>
${S.join(`
`)}
</${MESSAGE_FILES_MISSING}>`
          : ""
      }${
        mapped.length > 0
          ? `
<${MESSAGE_FILES_MOVED}>
${mapped.join(`
`)}
</${MESSAGE_FILES_MOVED}>`
          : ""
      }`,
    }),
    agentId: mainAgentId(),
    mode: "task-notification",
    skipAttachments: true,
    priority: "next",
    shouldQuery: false,
    passive: true,
  });
}
//@ chunk-tyg7f3ek.js:234608-235279 placement
function createFetchHoldRegistry({ stopping }) {
  let n = new Map();
  let r;
  return {
    hold: (s) => {
      let h = n.get(s) ?? {
        holds: 0,
        started: false,
        keptBack: undefined,
      };
      h.holds++;
      n.set(s, h);
      let y = false;
      return () => {
        if (y) return;
        y = true;
        h.holds--;
        if (h.holds > 0) return;
        n.delete(s);
        let { keptBack } = h;
        if (keptBack === undefined) return;
        try {
          let R = stopping();
          logForDiagnosticsNoPII("info", "user_message_processed_after_files", {
            kept_back_ms: Math.round(performance.now() - keptBack.at),
            left_open: R ? 1 : 0,
          });
          if (!R) r?.(s, keptBack.state);
        } catch (error) {
          logError(error);
        }
      };
    },
    through: (s) => {
      r = s;
      return (h, y, S) => {
        let R = n.get(h);
        if (
          R !== undefined &&
          (y === "completed" || (y === "cancelled" && (R.started || R.keptBack !== undefined)))
        ) {
          if (R.keptBack === undefined)
            R.keptBack = {
              state: y,
              at: performance.now(),
            };
          return;
        }
        if (R !== undefined && y === "started") R.started = true;
        s(h, y, S);
      };
    },
  };
}
//@ chunk-tyg7f3ek.js:235373-235576 placement
var FILE_FETCH_OUTCOME_CODES = {
  all_there: 1,
  fetched: 2,
  lost: 3,
  aborted: 4,
  unplannable: 5,
  flags_not_fetched: 6,
  threw: 7,
  tries_spent: 8,
  no_mark: 9,
  too_slow: 10,
  flags_off: 11,
  kept_elsewhere: 12,
};
var PARTIAL_STREAM_RETRACT_CODES = {
  cut_off_prompt: 1,
  skipped_and_left_open: 2,
};
//@ chunk-tyg7f3ek.js:235576-235668 placement
function filesRefetchMode() {
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_mossy_anchor", false) === true) return "on";
  return isGrowthBookEnabled() && !hasFreshGrowthBookFeatures() ? "cold" : "off";
}
//@ chunk-tyg7f3ek.js:235668-235815 placement
function unfetchableFilesPlan(e, n) {
  if (!n || shouldQueryInboundAttachment(e) === false) return;
  let inboundAttachments = extractInboundAttachments(e);
  return describeAttachmentFailures(inboundAttachments).all_files_binary_ext_or_pdf_no_sha256 === 1
    ? {
        files: inboundAttachments,
        sentCount: inboundAttachments.length,
      }
    : undefined;
}
//@ chunk-tyg7f3ek.js:235815-236235 placement
function plannedFilePrompt(e, n, r, s) {
  let h;
  if (s === "cut_off_prompt") h = unfetchableFilesPlan(e, n);
  else {
    let inboundAttachments = extractInboundAttachments(e);
    let filtered = inboundAttachments.filter(
      (inboundAttachment) => inboundAttachment.is_image !== true && inboundAttachment.sha256 === undefined,
    );
    h =
      n &&
      shouldQueryInboundAttachment(e) !== false &&
      filtered.length > 0 &&
      contentWithPlannedPathRefs(e, "", "") !== undefined
        ? {
            files: filtered,
            sentCount: inboundAttachments.length,
          }
        : undefined;
  }
  if (h === undefined) return;
  let y = ingressPromptContent(e, n, r);
  let ingressOrigins = resolveIngressOrigins(e, y, n, r, undefined);
  return ingressOrigins.peerFrom === undefined &&
    !isGatedInbound({
      ingressOrigin: ingressOrigins.ingressOrigin,
      inboundOrigin: e.inbound_origin,
      envelopePeer: hasTeammateMessageEnvelope(y),
    })
    ? {
        ...h,
        chosenAs: s,
      }
    : undefined;
}
//@ chunk-tyg7f3ek.js:236235-236248 placement
var FETCH_USER_FILES_MAX_MS = 60000;
//@ chunk-tyg7f3ek.js:236248-236489 placement
function holdForFilesRefetch(e) {
  let { promise, resolve } = Promise.withResolvers();
  runBesideArrivingFiles(() => promise);
  let timer = setTimeout(
    (h, chosenAsCode) => {
      logForDiagnosticsNoPII("warn", "user_message_files_refetch_hold_expired", {
        max_ms: FETCH_USER_FILES_MAX_MS,
        chosen_as_code: chosenAsCode,
      });
      h();
    },
    FETCH_USER_FILES_MAX_MS,
    resolve,
    PARTIAL_STREAM_RETRACT_CODES[e],
  );
  timer.unref();
  return () => {
    clearTimeout(timer);
    resolve();
  };
}
//@ chunk-tyg7f3ek.js:236489-236547 placement
var USER_FILE_FAILURE_CODES = {
  uploads_elsewhere: 1,
  unfit_id: 2,
  refused: 3,
  threw: 4,
};
//@ chunk-tyg7f3ek.js:236547-236662 placement
function logNoFileMark(e) {
  try {
    logForDiagnosticsNoPII("warn", "user_message_files_no_mark", {
      cause: e,
      cause_code: USER_FILE_FAILURE_CODES[e],
    });
  } catch (error) {
    logError(error);
  }
  return "no_mark";
}
//@ chunk-tyg7f3ek.js:236662-236710 placement
var FILES_REFETCH_HOLD_MS = 90000;
var FILES_FETCHED_AGAIN_HOLD = "files-fetched-again-hold";
var FILES_REFETCH_MAX_ATTEMPTS = 2;
//@ chunk-tyg7f3ek.js:236710-237348 placement
async function refetchSessionUploads(uuid, storageV5) {
  let r = false;
  try {
    let sessionId = getSessionId();
    if (getSessionUploadsDirOverride() !== null) return logNoFileMark("uploads_elsewhere");
    if (!isValidKeySegment(uuid) || uuid.length > 100 || !isValidKeySegment(sessionId))
      return logNoFileMark("unfit_id");
    let h = isStorageV5Enabled() ? storageV5 : undefined;
    let y = join(getUploadsDir(), sessionId, ".fetched-again");
    if (h === undefined)
      await mkdir(y, {
        recursive: true,
        mode: 448,
      });
    for (let j = 1; j <= FILES_REFETCH_MAX_ATTEMPTS; j++) {
      if (h !== undefined) {
        let R = await h.write(
          STORAGE_SPACES.userConfigDir("uploads", [sessionId, ".fetched-again", `${uuid}.${j}`]),
          "",
          {
            mode: 384,
            precondition: {
              type: "ifAbsent",
            },
          },
        );
        if (R.ok) return j;
        r ||= R.error.code !== "AlreadyExists";
        continue;
      }
      try {
        await writeFile(join(y, `${uuid}.${j}`), "", {
          flag: "wx",
          mode: 384,
        });
        return j;
      } catch (error) {
        r ||= getErrnoCode(error) !== "EEXIST";
      }
    }
  } catch (error) {
    logError(error);
    return logNoFileMark("threw");
  }
  return r ? logNoFileMark("refused") : "tries_spent";
}
//@ chunk-tyg7f3ek.js:237348-238288 placement
function reportFilesRefetch(
  { sentCount, fileCount, startedAt, coldRead, chosenAs },
  y,
  { absent: S = 0, lost: R = 0, ...w } = {},
) {
  try {
    logForDiagnosticsNoPII(
      y === "all_there" || y === "fetched" || y === "flags_off" ? "info" : "warn",
      "user_message_files_fetched_again",
      {
        outcome: y,
        outcome_code: FILE_FETCH_OUTCOME_CODES[y],
        sent_file_count: sentCount,
        file_count: fileCount,
        absent_file_count: S,
        lost_file_count: R,
        ended_after_ms: Math.round(performance.now() - startedAt),
        cold_read: coldRead ? 1 : 0,
        chosen_as: chosenAs,
        chosen_as_code: PARTIAL_STREAM_RETRACT_CODES[chosenAs],
        ...w,
      },
    );
    if (y === "flags_off") return;
    if (
      y === "lost" ||
      y === "threw" ||
      y === "tries_spent" ||
      y === "no_mark" ||
      y === "too_slow" ||
      y === "kept_elsewhere"
    )
      logFeatureBad(
        chosenAs === "cut_off_prompt"
          ? "bridge_attachment_files_fetched_again"
          : "bridge_attachment_follow_up_files_fetched_again",
        y,
      );
    else if (y === "all_there" || y === "fetched")
      logFeatureOk(
        chosenAs === "cut_off_prompt"
          ? "bridge_attachment_files_fetched_again"
          : "bridge_attachment_follow_up_files_fetched_again",
      );
    else
      logFeatureSad(
        chosenAs === "cut_off_prompt"
          ? "bridge_attachment_files_fetched_again"
          : "bridge_attachment_follow_up_files_fetched_again",
        y,
      );
  } catch (error) {
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:238288-238422 placement
function reportMissingFiles({ uuid, sentCount, files, refs, lost, listed }) {
  try {
    filesNotSavedNote(sentCount, lost, true);
    logBridgeAttachmentsMissing(uuid, sentCount, missingFileRefs(lost, refs, files, listed));
    return 1;
  } catch (error) {
    logError(error);
    return 0;
  }
}
//@ chunk-tyg7f3ek.js:238422-238556 placement = isRealPathWithinTeamDir (1)
async function isRegularFileOrUnknown(realCandidate) {
  if (getSessionUploadsDirOverride() !== null) return false;
  try {
    return (await lstat(realCandidate)).isFile();
  } catch (error) {
    let code = getErrnoCode(error);
    return code !== "ENOENT" && code !== "ENOTDIR";
  }
}
//@ chunk-tyg7f3ek.js:238556-240853 placement
/**
 * 重新拉取用户消息中缺失的附件文件（.fetched-again 标记），并替换存储的提示。
 */
async function refetchUserMessageFiles({
  uuid,
  files,
  sentCount,
  chosenAs,
  storedPrompt,
  conversation,
  releasePlaceInLine,
  settleColdFlags,
  stopping,
  storageV5,
  credentials,
}) {
  let q = {
    sentCount,
    fileCount: files.length,
    startedAt: performance.now(),
    coldRead: settleColdFlags !== undefined,
    chosenAs,
  };
  let x;
  let G;
  try {
    if (settleColdFlags !== undefined) {
      await settleColdFlags().catch(logError);
      let ie = filesRefetchMode();
      if (ie !== "on") {
        reportFilesRefetch(q, ie === "cold" ? "flags_not_fetched" : "flags_off");
        return true;
      }
    }
    let Z = sessionUploadsDir();
    let re =
      chosenAs === "cut_off_prompt"
        ? storedPrompt
        : (conversation[findMessageIndex(conversation, uuid)] ?? storedPrompt);
    let Ae =
      re === undefined
        ? null
        : re.type === "attachment" && re.attachment.type === "queued_command"
          ? getContentText(re.attachment.prompt)
          : getUserMessageText(re);
    let Ue =
      (Ae === null
        ? undefined
        : [Z, ...uploadsRootCandidates().map((ie) => join(ie, getSessionId()))].find((ie) =>
            contentWithPlannedPathRefs(
              {
                file_attachments: files,
              },
              "",
              ie,
            )?.refs.some((ref) => Ae.includes(ref)),
          )) ?? Z;
    x = contentWithPlannedPathRefs(
      {
        file_attachments: files,
      },
      "",
      Ue,
    );
    if (x === undefined) {
      reportFilesRefetch(q, "unplannable");
      return true;
    }
    let { paths, refs } = x;
    startSessionActivity("files_arriving", FILES_FETCHED_AGAIN_HOLD);
    try {
      let ie = runBesideArrivingFiles(async (Se) => {
        let results = await Promise.all(paths.map(isRegularFileOrUnknown));
        let attachments = files.filter((file, _n) => !results[_n]);
        if (attachments.length === 0) {
          reportFilesRefetch(q, "all_there");
          return true;
        }
        Se(paths.filter((path, _n) => !results[_n]));
        if (stopping()) {
          reportFilesRefetch(q, "aborted", {
            absent: attachments.length,
            lost: attachments.length,
          });
          return false;
        }
        let Ee =
          Ue === Z || Ue === join(getUploadsDir(), getSessionId())
            ? await refetchSessionUploads(uuid, storageV5)
            : "kept_elsewhere";
        if (typeof Ee !== "number") {
          let filtered = refs.filter((ref, jn) => !results[jn]);
          let _n = {
            absent: attachments.length,
            lost: filtered.length,
          };
          if (stopping()) {
            reportFilesRefetch(q, "aborted", _n);
            return false;
          }
          G = reportMissingFiles({
            uuid,
            sentCount,
            files,
            refs,
            lost: filtered,
            listed: allMissing(attachments, "not_finished"),
          });
          reportFilesRefetch(q, Ee, {
            ..._n,
            told: G,
          });
          return true;
        }
        let abortController = createAbortController();
        let Xe = await withDeadline(
          resolveInboundAttachments(
            attachments,
            false,
            false,
            storageV5,
            credentials,
            undefined,
            false,
            Ue,
            undefined,
            abortController.signal,
            true,
          ).catch((error) => {
            logError(error);
            return {
              prefix: "",
              missingFiles: allMissing(attachments, "not_finished"),
            };
          }),
          FILES_REFETCH_HOLD_MS,
        );
        if (Xe === undefined) abortController.abort();
        let We =
          Xe === undefined
            ? await Promise.all(paths.map(isRegularFileOrUnknown))
            : refs.map((ref, _n) => results[_n] === true || Xe.prefix.includes(ref));
        let filtered = refs.filter((ref, _n) => !We[_n]);
        let listed =
          Xe === undefined
            ? allMissing(
                files.filter((file, _n) => !We[_n]),
                "not_finished",
              )
            : Xe.missingFiles;
        let Lt = {
          absent: attachments.length,
          lost: filtered.length,
          try_number: Ee,
        };
        if (filtered.length === 0) reportFilesRefetch(q, "fetched", Lt);
        else if (stopping()) {
          reportFilesRefetch(q, "aborted", Lt);
          return false;
        } else {
          G = reportMissingFiles({
            uuid,
            sentCount,
            files,
            refs,
            lost: filtered,
            listed,
          });
          reportFilesRefetch(q, Xe === undefined ? "too_slow" : "lost", {
            ...Lt,
            told: G,
          });
        }
        return true;
      });
      releasePlaceInLine?.();
      return await ie;
    } finally {
      endActivity("files_arriving", FILES_FETCHED_AGAIN_HOLD);
    }
  } catch (error) {
    logError(error);
    let re = true;
    try {
      re = stopping();
    } catch (error) {
      logError(error);
    }
    if (re) {
      reportFilesRefetch(q, "threw");
      return false;
    }
    reportFilesRefetch(q, "threw", {
      told:
        G ??
        (x === undefined
          ? 0
          : reportMissingFiles({
              uuid,
              sentCount,
              files,
              refs: x.refs,
              lost: x.refs,
              listed: allMissing(files, "not_finished"),
            })),
    });
    return true;
  } finally {
    releasePlaceInLine?.();
  }
}
//@ chunk-tyg7f3ek.js:240890-241076 placement
var TOOL_USE_BLOCK_TYPES = new Set(["tool_use", "server_tool_use", "mcp_tool_use"]);
var NOOP_STREAM_HANDLERS = {
  onStreamEvent: () => [],
  onAssistantMessage: () => {},
  onTombstone: () => [],
  onRefusalFallbackBanner: () => [],
  closeAtTurnEnd: () => [],
};
//@ chunk-tyg7f3ek.js:241076-243554 placement
function createPartialStreamRetraction(includePartialMessages) {
  if (!includePartialMessages) return NOOP_STREAM_HANDLERS;
  let apiMessageId = null;
  let index = null;
  let s = false;
  let h = false;
  let y = false;
  let S = new Map();
  let R = null;
  function w() {
    if (R === null) return [];
    let L = R;
    R = null;
    logEvent("tengu_partial_stream_retraction_closed", {
      stop_reason: L.source === "tombstone" ? fromEnumOpt(L.retracted.stop_reason) : fromEnum("refusal"),
      had_open_block: false,
      ...(L.source === "refusal_banner" && {
        source: lit("refusal_banner"),
      }),
    });
    return L.source === "tombstone"
      ? streamMessageDelta(
          L.messageId,
          L.retracted.stop_reason,
          L.retracted.stop_sequence,
          usageForStream(L.retracted.usage),
        )
      : streamMessageDelta(L.messageId, "refusal", null, usageForStream(L.usage));
  }
  function P(L, q, x) {
    if (apiMessageId === null) return [];
    let G = [];
    let hadOpenBlock = index !== null;
    if (index !== null && !y) G.push(createContentBlockStopEvent(apiMessageId, index));
    if (h) G.push(streamMessageStop(apiMessageId));
    else
      G.push(
        ...streamMessageDelta(
          apiMessageId,
          null,
          null,
          usageForStream(L),
          x ? undefined : (S.get(apiMessageId) ?? 0),
        ),
      );
    logEvent("tengu_partial_stream_retraction_closed", {
      stop_reason: undefined,
      had_open_block: hadOpenBlock,
      stop_reason_already_sent: h,
      source: fromEnum(q),
    });
    apiMessageId = null;
    index = null;
    y = false;
    h = false;
    return G;
  }
  return {
    onStreamEvent(L, q) {
      return safeCallOrEmptyArray(() => {
        let x = [];
        if (R !== null)
          if (isPingStreamEvent(L));
          else if (L.type === "message_start") x.push(...w());
          else {
            apiMessageId = R.messageId;
            R = null;
          }
        if (L.type === "message_start") {
          x.push(...P(q, "stale_message_start", L.message.id === apiMessageId));
          apiMessageId = L.message.id;
          index = null;
          y = false;
          s = false;
          h = false;
        } else if (L.type === "content_block_start") {
          index = L.index;
          y = TOOL_USE_BLOCK_TYPES.has(L.content_block.type);
          h = false;
        } else if (L.type === "content_block_stop") {
          index = null;
          y = false;
          s = true;
        } else if (L.type === "message_delta") {
          if (L.delta.stop_reason != null && index === null) h = true;
        } else if (L.type === "message_stop") {
          apiMessageId = null;
          index = null;
          y = false;
          h = false;
        }
        return x;
      });
    },
    onAssistantMessage(L) {
      safeCallOrEmptyArray(() => {
        let apiBlockIndex = L.apiBlockIndex;
        S.set(
          L.message.id,
          Math.max(
            S.get(L.message.id) ?? 0,
            apiBlockIndex !== undefined && Number.isSafeInteger(apiBlockIndex) && apiBlockIndex >= 0
              ? apiBlockIndex + 1
              : Number.NaN,
          ),
        );
        return [];
      });
    },
    onTombstone(L) {
      return safeCallOrEmptyArray(() => {
        if (apiMessageId === null || L.message.type !== "assistant" || L.message.message.id !== apiMessageId)
          return [];
        if (L.displayOnly === true) {
          logEvent("tengu_partial_stream_retraction_display_only", {
            had_open_block: index !== null,
          });
          return [];
        }
        let message = L.message.message;
        if (index === null) {
          R = {
            source: "tombstone",
            messageId: apiMessageId,
            retracted: message,
          };
          apiMessageId = null;
          return [];
        }
        let x = [
          ...(y ? [] : [createContentBlockStopEvent(apiMessageId, index)]),
          ...streamMessageDelta(
            apiMessageId,
            message.stop_reason,
            message.stop_sequence,
            usageForStream(message.usage),
          ),
        ];
        logEvent("tengu_partial_stream_retraction_closed", {
          stop_reason: fromEnumOpt(message.stop_reason),
          had_open_block: true,
        });
        apiMessageId = null;
        index = null;
        return x;
      });
    },
    onRefusalFallbackBanner(L, q) {
      return safeCallOrEmptyArray(() => {
        if (apiMessageId === null || s || L !== "retry") return [];
        if (index !== null) {
          let x = [
            ...(y ? [] : [createContentBlockStopEvent(apiMessageId, index)]),
            ...streamMessageDelta(apiMessageId, "refusal", null, usageForStream(q)),
          ];
          logEvent("tengu_partial_stream_retraction_closed", {
            stop_reason: fromEnum("refusal"),
            had_open_block: true,
            source: lit("refusal_banner"),
          });
          apiMessageId = null;
          index = null;
          return x;
        }
        R = {
          source: "refusal_banner",
          messageId: apiMessageId,
          usage: q,
        };
        apiMessageId = null;
        return [];
      });
    },
    closeAtTurnEnd(L) {
      return safeCallOrEmptyArray(() => [...w(), ...P(L, "turn_end", false)]);
    },
  };
}
//@ chunk-tyg7f3ek.js:243554-243609 placement
function safeCallOrEmptyArray(e) {
  try {
    return e();
  } catch (error) {
    logError(error);
    return [];
  }
}
//@ chunk-tyg7f3ek.js:243609-244088 placement
function toStreamEventMessage(e, n) {
  return {
    type: "stream_event",
    event: e.event,
    session_id: n.session_id,
    parent_tool_use_id: null,
    uuid: n.uuid,
    ...(e.ttftMs !== undefined && {
      ttft_ms: e.ttftMs,
    }),
    ...(e.thinkingDisplay !== undefined && {
      thinking_display: e.thinkingDisplay,
    }),
    ...(e.apiMessageId !== undefined && {
      api_message_id: e.apiMessageId,
    }),
    ...(e.abandonedBlocks !== undefined && {
      abandoned_blocks: {
        api_message_id: e.abandonedBlocks.apiMessageId,
        from_block_index: e.abandonedBlocks.fromBlockIndex,
      },
    }),
    ...(e.textRunsJoined && {
      text_runs_joined: true,
    }),
  };
}
export {
  createFetchHoldRegistry,
  filesRefetchMode,
  plannedFilePrompt,
  holdForFilesRefetch,
  refetchUserMessageFiles,
  fetchUserPromptFiles,
  toStreamEventMessage,
  createPartialStreamRetraction,
};
