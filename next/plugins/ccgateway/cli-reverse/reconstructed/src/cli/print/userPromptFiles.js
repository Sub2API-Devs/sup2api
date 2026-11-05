/**
 * cli/print/userPromptFiles.ts
 *
 * 2.1.316 新增：用户提示附带文件的获取、重取与缺失说明，部分流撤回
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (26)
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
import { agentId } from "../../components/tasks/RemoteSessionDetailDialog.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0yw3taqg.js:258172-259607 placement
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
  let [first, second, third, fourth, fifth] = resolveArguments;
  let aheadArg = third.isRemoteIO ? aheadOfFiles : undefined;
  let frameInfo = {
    isRemoteIO: third.isRemoteIO,
    uuid: first.uuid,
    attachments,
  };
  let unhinted = isHumanIngressFrame(first, third)
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
  let ingressArgs = [first, second, third, fourth, fifth, undefined, aheadArg, namedByIdHash];
  let reason =
    aheadOfFiles === "off" || attachments.length === 0
      ? "not_asked"
      : third.peerFrom !== undefined
        ? "peer"
        : !allFilesUnfetchable(attachments, aheadOfFiles)
          ? "file_kinds"
          : isTextNotTyped(first) &&
              describeAttachmentFailures(attachments).all_files_binary_ext_no_sha256 !== 1
            ? "text_not_typed"
            : hasPromptSubmitHooks(sessionHooks)
              ? "prompt_hook"
              : undefined;
  let dir = reason === undefined ? sessionUploadsDir() : "";
  let planned =
    reason === undefined ? contentWithPlannedPathRefs(first, second, dir, namedByIdHash) : undefined;
  if (planned === undefined) {
    if (reason !== "not_asked") {
      let reasonCode = reason ?? "unplannable";
      logForDiagnosticsNoPII("info", "user_message_waits_for_files", {
        reason: reasonCode,
        reason_code: UNPLANNABLE_REASONS[reasonCode],
        file_count: attachments.length,
      });
    }
    let arrivalId = attachments.length > 0 ? lastInlineArrivingMessageId() : undefined;
    let resolved =
      arrivalId === undefined
        ? prependIngressFiles(...ingressArgs)
        : arrivalId.then(() => prependIngressFiles(...ingressArgs));
    let resolving =
      unhinted.length > 0 && isFilePersistenceEnabled()
        ? resolved.then(async (res) => {
            if (agentId(unhinted)) await enqueueArrivingFileMessage(() => refreshFilesPlacedByName(unhinted));
            return res;
          })
        : resolved;
    return {
      resolving,
      queuedAheadOfFiles: false,
      frameAdmission: (frame) => {
        if (frame)
          resolving
            .then((result) => reportMissingBridgeAttachments(frameInfo, result.missingFiles))
            .catch(logError);
      },
    };
  }
  let startTime = performance.now();
  let deferred = Promise.withResolvers();
  enqueueArrivingFileMessage(async () => {
    let result = await prependIngressFiles(first, second, third, fourth, fifth, dir, aheadArg, namedByIdHash);
    if (agentId(unhinted)) await refreshFilesPlacedByName(unhinted);
    return result;
  }, planned.paths)
    .then(
      (resolved) =>
        describeMissingFiles(planned.refs, resolved, startTime, deferred.promise, frameInfo, tellModel),
      (error) => {
        logError(error);
        describeMissingFiles(
          planned.refs,
          {
            content: "",
            missingFiles: allMissing(attachments, "not_finished"),
          },
          startTime,
          deferred.promise,
          frameInfo,
          tellModel,
        );
      },
    )
    .catch(logError);
  return {
    resolving: Promise.resolve({
      content: planned.content,
      inlinedImagePaths: [],
    }),
    queuedAheadOfFiles: true,
    frameAdmission: deferred.resolve,
  };
}
//@ chunk-0yw3taqg.js:259607-259814 placement
function allFilesUnfetchable(attachments, aheadOfFiles) {
  if (getDisableFileMentions())
    return attachments.every(
      (attachment) =>
        attachment.is_image !== true &&
        attachment.sha256 === undefined &&
        !isQueryableAttachmentFile(sanitizedAttachmentInnerName(attachment)),
    );
  return (
    describeAttachmentFailures(attachments)[
      aheadOfFiles === "on_with_pdfs"
        ? "all_files_binary_ext_or_pdf_no_sha256"
        : "all_files_binary_ext_no_sha256"
    ] === 1
  );
}
//@ chunk-0yw3taqg.js:259814-260023 placement
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
//@ chunk-0yw3taqg.js:260023-260097 placement
function reportMissingBridgeAttachments({ isRemoteIO, uuid, attachments }, missingFiles) {
  if (isRemoteIO) logBridgeAttachmentsMissing(uuid, attachments.length, missingFiles);
}
//@ chunk-0yw3taqg.js:260097-260248 placement
function missingFileRefs(missing, refs, attachments, missingFiles) {
  return attachments.flatMap((attachment, index) =>
    missing.includes(refs[index])
      ? [
          missingFiles?.find((file) => file.file_uuid === attachment.file_uuid) ?? {
            file_uuid: attachment.file_uuid,
            reason: "download",
          },
        ]
      : [],
  );
}
//@ chunk-0yw3taqg.js:260248-261220 placement
function describeMissingFiles(
  refs,
  { content, missingFiles, asideOutcomes = [], noSpace },
  startedAt,
  promise,
  frameInfo,
  tellModel,
) {
  let text =
    typeof content === "string"
      ? content
      : content.map((block) => (block.type === "text" ? block.text : "")).join(`
`);
  let missing = refs.filter((ref) => !text.includes(ref));
  let filtered = asideOutcomes.filter((asideOutcome) => !asideOutcome.saved);
  let lostPaths = new Set(filtered.map((outcome) => `@"${outcome.path}"`));
  let filtered_2 = missing.filter((ref) => !lostPaths.has(ref));
  let notes = {
    notSaved: filtered.map((outcome) => asideSentence(outcome, true)),
    moved: asideOutcomes
      .filter((asideOutcome) => asideOutcome.saved)
      .map((asideOutcome) => asideSentence(asideOutcome, true)),
  };
  let noteCount = notes.notSaved.length + notes.moved.length;
  let fields = {
    file_count: refs.length,
    missing_file_count: missing.length,
    ended_after_queue_ms: Math.round(performance.now() - startedAt),
    ...(noteCount > 0 && {
      late_aside_line_count: noteCount,
    }),
  };
  if (missing.length === 0) logFeatureOk("bridge_attachment_turn_before_files", fields);
  else if (missing.length < refs.length)
    logFeatureSad("bridge_attachment_turn_before_files", "some_missing", fields);
  else logFeatureBad("bridge_attachment_turn_before_files", "all_missing", fields);
  logForDiagnosticsNoPII(
    missing.length === 0 ? "info" : "warn",
    "user_message_files_ended_after_queue",
    fields,
  );
  if (missing.length === 0 && noteCount === 0) return;
  promise
    .then((ok) => {
      if (ok) {
        tellModel(refs.length, filtered_2, false, 0, noSpace, notes);
        if (missing.length > 0)
          reportMissingBridgeAttachments(
            frameInfo,
            missingFileRefs(missing, refs, frameInfo.attachments, missingFiles),
          );
      }
    })
    .catch(logError);
}
//@ chunk-0yw3taqg.js:261220-262210 placement
function filesNotSavedNote(
  sentCount,
  lost,
  again = false,
  unknown = 0,
  noSpace = false,
  notes = {
    notSaved: [],
    moved: [],
  },
) {
  let lines = [
    ...(lost.length > 0
      ? [
          `${lost.length} of the ${sentCount} file(s) attached to a user message could not be fetched or saved${again ? " again, so these paths, which the message names, may be missing" : ", so these paths, which the message names, were not written"}: ${lost.map((ref) => escapeXml(ref.slice(1))).join(", ")}`,
        ]
      : []),
    ...(unknown > 0
      ? [
          `${lost.length > 0 ? `${unknown} more of them may be missing too` : `${unknown} of the ${sentCount} file(s) attached to an earlier user message may be missing from the uploads folder`}, and it is not known which. If a file that the conversation names in the uploads folder is not found, ask the user to attach it again.`,
        ]
      : []),
    ...notes.notSaved.map((line) => escapeXml(line)),
    ...(noSpace ? [NO_SPACE_FOR_A_FILE] : []),
  ];
  let mapped = notes.moved.map((line) => escapeXml(line));
  if (lines.length === 0 && mapped.length === 0) return;
  enqueuePendingNotification({
    value: formatTaskNotification({
      body: `${
        lines.length > 0
          ? `
<${MESSAGE_FILES_MISSING}>
${lines.join(`
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
//@ chunk-0yw3taqg.js:262210-262881 placement
function createFetchHoldRegistry({ stopping }) {
  let bySession = new Map();
  let dropTimer;
  return {
    hold: (uuid) => {
      let hold = bySession.get(uuid) ?? {
        holds: 0,
        started: false,
        keptBack: undefined,
      };
      hold.holds++;
      bySession.set(uuid, hold);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        hold.holds--;
        if (hold.holds > 0) return;
        bySession.delete(uuid);
        let { keptBack } = hold;
        if (keptBack === undefined) return;
        try {
          let isStopping = stopping();
          logForDiagnosticsNoPII("info", "user_message_processed_after_files", {
            kept_back_ms: Math.round(performance.now() - keptBack.at),
            left_open: isStopping ? 1 : 0,
          });
          if (!isStopping) dropTimer?.(uuid, keptBack.state);
        } catch (error) {
          logError(error);
        }
      };
    },
    through: (forward) => {
      dropTimer = forward;
      return (uuid, state, opts) => {
        let hold = bySession.get(uuid);
        if (
          hold !== undefined &&
          (state === "completed" || (state === "cancelled" && (hold.started || hold.keptBack !== undefined)))
        ) {
          if (hold.keptBack === undefined)
            hold.keptBack = {
              state,
              at: performance.now(),
            };
          return;
        }
        if (hold !== undefined && state === "started") hold.started = true;
        forward(uuid, state, opts);
      };
    },
  };
}
//@ chunk-0yw3taqg.js:262975-263178 placement
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
//@ chunk-0yw3taqg.js:263178-263270 placement
function filesRefetchMode() {
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_mossy_anchor", false) === true) return "on";
  return isGrowthBookEnabled() && !hasFreshGrowthBookFeatures() ? "cold" : "off";
}
//@ chunk-0yw3taqg.js:263270-263417 placement
function unfetchableFilesPlan(message, shouldQuery) {
  if (!shouldQuery || shouldQueryInboundAttachment(message) === false) return;
  let inboundAttachments = extractInboundAttachments(message);
  return describeAttachmentFailures(inboundAttachments).all_files_binary_ext_or_pdf_no_sha256 === 1
    ? {
        files: inboundAttachments,
        sentCount: inboundAttachments.length,
      }
    : undefined;
}
//@ chunk-0yw3taqg.js:263417-263837 placement
function plannedFilePrompt(message, shouldQuery, origin, chosenAs) {
  let plan;
  if (chosenAs === "cut_off_prompt") plan = unfetchableFilesPlan(message, shouldQuery);
  else {
    let inboundAttachments = extractInboundAttachments(message);
    let filtered = inboundAttachments.filter(
      (inboundAttachment) => inboundAttachment.is_image !== true && inboundAttachment.sha256 === undefined,
    );
    plan =
      shouldQuery &&
      shouldQueryInboundAttachment(message) !== false &&
      filtered.length > 0 &&
      contentWithPlannedPathRefs(message, "", "") !== undefined
        ? {
            files: filtered,
            sentCount: inboundAttachments.length,
          }
        : undefined;
  }
  if (plan === undefined) return;
  let content = ingressPromptContent(message, shouldQuery, origin);
  let ingressOrigins = resolveIngressOrigins(message, content, shouldQuery, origin, undefined);
  return ingressOrigins.peerFrom === undefined &&
    !isGatedInbound({
      ingressOrigin: ingressOrigins.ingressOrigin,
      inboundOrigin: message.inbound_origin,
      envelopePeer: hasTeammateMessageEnvelope(content),
    })
    ? {
        ...plan,
        chosenAs,
      }
    : undefined;
}
//@ chunk-0yw3taqg.js:263837-263850 placement
var FETCH_USER_FILES_MAX_MS = 60000;
//@ chunk-0yw3taqg.js:263850-264091 placement
function holdForFilesRefetch(chosenAs) {
  let { promise, resolve } = Promise.withResolvers();
  runBesideArrivingFiles(() => promise);
  let timer = setTimeout(
    (resolve, chosenAsCode) => {
      logForDiagnosticsNoPII("warn", "user_message_files_refetch_hold_expired", {
        max_ms: FETCH_USER_FILES_MAX_MS,
        chosen_as_code: chosenAsCode,
      });
      resolve();
    },
    FETCH_USER_FILES_MAX_MS,
    resolve,
    PARTIAL_STREAM_RETRACT_CODES[chosenAs],
  );
  timer.unref();
  return () => {
    clearTimeout(timer);
    resolve();
  };
}
//@ chunk-0yw3taqg.js:264091-264149 placement
var USER_FILE_FAILURE_CODES = {
  uploads_elsewhere: 1,
  unfit_id: 2,
  refused: 3,
  threw: 4,
};
//@ chunk-0yw3taqg.js:264149-264264 placement
function logNoFileMark(cause) {
  try {
    logForDiagnosticsNoPII("warn", "user_message_files_no_mark", {
      cause,
      cause_code: USER_FILE_FAILURE_CODES[cause],
    });
  } catch (error) {
    logError(error);
  }
  return "no_mark";
}
//@ chunk-0yw3taqg.js:264264-264312 placement
var FILES_REFETCH_HOLD_MS = 90000;
var FILES_FETCHED_AGAIN_HOLD = "files-fetched-again-hold";
var FILES_REFETCH_MAX_ATTEMPTS = 2;
//@ chunk-0yw3taqg.js:264312-264950 placement
async function refetchSessionUploads(uuid, storageV5) {
  let refused = false;
  try {
    let sessionId = getSessionId();
    if (getSessionUploadsDirOverride() !== null) return logNoFileMark("uploads_elsewhere");
    if (!isValidKeySegment(uuid) || uuid.length > 100 || !isValidKeySegment(sessionId))
      return logNoFileMark("unfit_id");
    let store = isStorageV5Enabled() ? storageV5 : undefined;
    let dir = join(getUploadsDir(), sessionId, ".fetched-again");
    if (store === undefined)
      await mkdir(dir, {
        recursive: true,
        mode: 448,
      });
    for (let j = 1; j <= FILES_REFETCH_MAX_ATTEMPTS; j++) {
      if (store !== undefined) {
        let result = await store.write(
          STORAGE_SPACES.userConfigDir("uploads", [sessionId, ".fetched-again", `${uuid}.${j}`]),
          "",
          {
            mode: 384,
            precondition: {
              type: "ifAbsent",
            },
          },
        );
        if (result.ok) return j;
        refused ||= result.error.code !== "AlreadyExists";
        continue;
      }
      try {
        await writeFile(join(dir, `${uuid}.${j}`), "", {
          flag: "wx",
          mode: 384,
        });
        return j;
      } catch (error) {
        refused ||= getErrnoCode(error) !== "EEXIST";
      }
    }
  } catch (error) {
    logError(error);
    return logNoFileMark("threw");
  }
  return refused ? logNoFileMark("refused") : "tries_spent";
}
//@ chunk-0yw3taqg.js:264950-265890 placement
function reportFilesRefetch(
  { sentCount, fileCount, startedAt, coldRead, chosenAs },
  outcome,
  { absent = 0, lost = 0, ...rest } = {},
) {
  try {
    logForDiagnosticsNoPII(
      outcome === "all_there" || outcome === "fetched" || outcome === "flags_off" ? "info" : "warn",
      "user_message_files_fetched_again",
      {
        outcome,
        outcome_code: FILE_FETCH_OUTCOME_CODES[outcome],
        sent_file_count: sentCount,
        file_count: fileCount,
        absent_file_count: absent,
        lost_file_count: lost,
        ended_after_ms: Math.round(performance.now() - startedAt),
        cold_read: coldRead ? 1 : 0,
        chosen_as: chosenAs,
        chosen_as_code: PARTIAL_STREAM_RETRACT_CODES[chosenAs],
        ...rest,
      },
    );
    if (outcome === "flags_off") return;
    if (
      outcome === "lost" ||
      outcome === "threw" ||
      outcome === "tries_spent" ||
      outcome === "no_mark" ||
      outcome === "too_slow" ||
      outcome === "kept_elsewhere"
    )
      logFeatureBad(
        chosenAs === "cut_off_prompt"
          ? "bridge_attachment_files_fetched_again"
          : "bridge_attachment_follow_up_files_fetched_again",
        outcome,
      );
    else if (outcome === "all_there" || outcome === "fetched")
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
        outcome,
      );
  } catch (error) {
    logError(error);
  }
}
//@ chunk-0yw3taqg.js:265890-266024 placement
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
//@ chunk-0yw3taqg.js:266024-266158 placement (2.1.88 match: isRealPathWithinTeamDir, 1)
async function isRegularFileOrUnknown(realCandidate) {
  if (getSessionUploadsDirOverride() !== null) return false;
  try {
    return (await lstat(realCandidate)).isFile();
  } catch (error) {
    let code = getErrnoCode(error);
    return code !== "ENOENT" && code !== "ENOTDIR";
  }
}
//@ chunk-0yw3taqg.js:266158-268460 placement
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
  let stats = {
    sentCount,
    fileCount: files.length,
    startedAt: performance.now(),
    coldRead: settleColdFlags !== undefined,
    chosenAs,
  };
  let planned;
  let told;
  try {
    if (settleColdFlags !== undefined) {
      await settleColdFlags().catch(logError);
      let refetchMode = filesRefetchMode();
      if (refetchMode !== "on") {
        reportFilesRefetch(stats, refetchMode === "cold" ? "flags_not_fetched" : "flags_off");
        return true;
      }
    }
    let dir = sessionUploadsDir();
    let stored =
      chosenAs === "cut_off_prompt"
        ? storedPrompt
        : (conversation[findMessageIndex(conversation, uuid)] ?? storedPrompt);
    let text =
      stored === undefined
        ? null
        : stored.type === "attachment" && stored.attachment.type === "queued_command"
          ? getContentText(stored.attachment.prompt)
          : getUserMessageText(stored);
    let chosenDir =
      (text === null
        ? undefined
        : [dir, ...uploadsRootCandidates().map((root) => join(root, getSessionId()))].find((dir) =>
            contentWithPlannedPathRefs(
              {
                file_attachments: files,
              },
              "",
              dir,
            )?.refs.some((ref) => text.includes(ref)),
          )) ?? dir;
    planned = contentWithPlannedPathRefs(
      {
        file_attachments: files,
      },
      "",
      chosenDir,
    );
    if (planned === undefined) {
      reportFilesRefetch(stats, "unplannable");
      return true;
    }
    let { paths, refs } = planned;
    startSessionActivity("files_arriving", FILES_FETCHED_AGAIN_HOLD);
    try {
      let run = runBesideArrivingFiles(async (placeParents) => {
        let results = await Promise.all(paths.map(isRegularFileOrUnknown));
        let attachments = files.filter((file, index) => !results[index]);
        if (attachments.length === 0) {
          reportFilesRefetch(stats, "all_there");
          return true;
        }
        placeParents(paths.filter((path, index) => !results[index]));
        if (stopping()) {
          reportFilesRefetch(stats, "aborted", {
            absent: attachments.length,
            lost: attachments.length,
          });
          return false;
        }
        let tryNumber =
          chosenDir === dir || chosenDir === join(getUploadsDir(), getSessionId())
            ? await refetchSessionUploads(uuid, storageV5)
            : "kept_elsewhere";
        if (typeof tryNumber !== "number") {
          let filtered = refs.filter((ref, index) => !results[index]);
          let fields = {
            absent: attachments.length,
            lost: filtered.length,
          };
          if (stopping()) {
            reportFilesRefetch(stats, "aborted", fields);
            return false;
          }
          told = reportMissingFiles({
            uuid,
            sentCount,
            files,
            refs,
            lost: filtered,
            listed: allMissing(attachments, "not_finished"),
          });
          reportFilesRefetch(stats, tryNumber, {
            ...fields,
            told,
          });
          return true;
        }
        let abortController = createAbortController();
        let resolved = await withDeadline(
          resolveInboundAttachments(
            attachments,
            false,
            false,
            storageV5,
            credentials,
            undefined,
            false,
            chosenDir,
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
        if (resolved === undefined) abortController.abort();
        let kept =
          resolved === undefined
            ? await Promise.all(paths.map(isRegularFileOrUnknown))
            : refs.map((ref, index) => results[index] === true || resolved.prefix.includes(ref));
        let filtered = refs.filter((ref, index) => !kept[index]);
        let listed =
          resolved === undefined
            ? allMissing(
                files.filter((file, index) => !kept[index]),
                "not_finished",
              )
            : resolved.missingFiles;
        let fields = {
          absent: attachments.length,
          lost: filtered.length,
          try_number: tryNumber,
        };
        if (filtered.length === 0) reportFilesRefetch(stats, "fetched", fields);
        else if (stopping()) {
          reportFilesRefetch(stats, "aborted", fields);
          return false;
        } else {
          told = reportMissingFiles({
            uuid,
            sentCount,
            files,
            refs,
            lost: filtered,
            listed,
          });
          reportFilesRefetch(stats, resolved === undefined ? "too_slow" : "lost", {
            ...fields,
            told,
          });
        }
        return true;
      });
      releasePlaceInLine?.();
      return await run;
    } finally {
      endActivity("files_arriving", FILES_FETCHED_AGAIN_HOLD);
    }
  } catch (error) {
    logError(error);
    let isStopping = true;
    try {
      isStopping = stopping();
    } catch (error) {
      logError(error);
    }
    if (isStopping) {
      reportFilesRefetch(stats, "threw");
      return false;
    }
    reportFilesRefetch(stats, "threw", {
      told:
        told ??
        (planned === undefined
          ? 0
          : reportMissingFiles({
              uuid,
              sentCount,
              files,
              refs: planned.refs,
              lost: planned.refs,
              listed: allMissing(files, "not_finished"),
            })),
    });
    return true;
  } finally {
    releasePlaceInLine?.();
  }
}
//@ chunk-0yw3taqg.js:268497-268683 placement
var TOOL_USE_BLOCK_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NOOP_STREAM_HANDLERS;
deferInit("chunk-0yw3taqg.js:268497", () => {
  TOOL_USE_BLOCK_TYPES = new Set(["tool_use", "server_tool_use", "mcp_tool_use"]);
  NOOP_STREAM_HANDLERS = {
    onStreamEvent: () => [],
    onAssistantMessage: () => {},
    onTombstone: () => [],
    onRefusalFallbackBanner: () => [],
    closeAtTurnEnd: () => [],
  };
});
//@ chunk-0yw3taqg.js:268683-271163 placement
function createPartialStreamRetraction(includePartialMessages) {
  if (!includePartialMessages) return NOOP_STREAM_HANDLERS;
  let apiMessageId = null;
  let index = null;
  let blockClosed = false;
  let stopSent = false;
  let toolUseBlock = false;
  let blockCounts = new Map();
  let retracted = null;
  function closeRetracted() {
    if (retracted === null) return [];
    let pending = retracted;
    retracted = null;
    logEvent("tengu_partial_stream_retraction_closed", {
      stop_reason:
        pending.source === "tombstone" ? fromEnumOpt(pending.retracted.stop_reason) : fromEnum("refusal"),
      had_open_block: false,
      ...(pending.source === "refusal_banner" && {
        source: lit("refusal_banner"),
      }),
    });
    return pending.source === "tombstone"
      ? streamMessageDelta(
          pending.messageId,
          pending.retracted.stop_reason,
          pending.retracted.stop_sequence,
          usageForStream(pending.retracted.usage),
        )
      : streamMessageDelta(pending.messageId, "refusal", null, usageForStream(pending.usage));
  }
  function close(usage, source, sameMessage) {
    if (apiMessageId === null) return [];
    let writes = [];
    let hadOpenBlock = index !== null;
    if (index !== null && !toolUseBlock) writes.push(createContentBlockStopEvent(apiMessageId, index));
    if (stopSent) writes.push(streamMessageStop(apiMessageId));
    else
      writes.push(
        ...streamMessageDelta(
          apiMessageId,
          null,
          null,
          usageForStream(usage),
          sameMessage ? undefined : (blockCounts.get(apiMessageId) ?? 0),
        ),
      );
    logEvent("tengu_partial_stream_retraction_closed", {
      stop_reason: undefined,
      had_open_block: hadOpenBlock,
      stop_reason_already_sent: stopSent,
      source: fromEnum(source),
    });
    apiMessageId = null;
    index = null;
    toolUseBlock = false;
    stopSent = false;
    return writes;
  }
  return {
    onStreamEvent(event, usage) {
      return safeCallOrEmptyArray(() => {
        let out = [];
        if (retracted !== null)
          if (isPingStreamEvent(event));
          else if (event.type === "message_start") out.push(...closeRetracted());
          else {
            apiMessageId = retracted.messageId;
            retracted = null;
          }
        if (event.type === "message_start") {
          out.push(...close(usage, "stale_message_start", event.message.id === apiMessageId));
          apiMessageId = event.message.id;
          index = null;
          toolUseBlock = false;
          blockClosed = false;
          stopSent = false;
        } else if (event.type === "content_block_start") {
          index = event.index;
          toolUseBlock = TOOL_USE_BLOCK_TYPES.has(event.content_block.type);
          stopSent = false;
        } else if (event.type === "content_block_stop") {
          index = null;
          toolUseBlock = false;
          blockClosed = true;
        } else if (event.type === "message_delta") {
          if (event.delta.stop_reason != null && index === null) stopSent = true;
        } else if (event.type === "message_stop") {
          apiMessageId = null;
          index = null;
          toolUseBlock = false;
          stopSent = false;
        }
        return out;
      });
    },
    onAssistantMessage(message) {
      safeCallOrEmptyArray(() => {
        let apiBlockIndex = message.apiBlockIndex;
        blockCounts.set(
          message.message.id,
          Math.max(
            blockCounts.get(message.message.id) ?? 0,
            apiBlockIndex !== undefined && Number.isSafeInteger(apiBlockIndex) && apiBlockIndex >= 0
              ? apiBlockIndex + 1
              : Number.NaN,
          ),
        );
        return [];
      });
    },
    onTombstone(tombstone) {
      return safeCallOrEmptyArray(() => {
        if (
          apiMessageId === null ||
          tombstone.message.type !== "assistant" ||
          tombstone.message.message.id !== apiMessageId
        )
          return [];
        if (tombstone.displayOnly === true) {
          logEvent("tengu_partial_stream_retraction_display_only", {
            had_open_block: index !== null,
          });
          return [];
        }
        let message = tombstone.message.message;
        if (index === null) {
          retracted = {
            source: "tombstone",
            messageId: apiMessageId,
            retracted: message,
          };
          apiMessageId = null;
          return [];
        }
        let stopEvents = [
          ...(toolUseBlock ? [] : [createContentBlockStopEvent(apiMessageId, index)]),
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
        return stopEvents;
      });
    },
    onRefusalFallbackBanner(mode, usage) {
      return safeCallOrEmptyArray(() => {
        if (apiMessageId === null || blockClosed || mode !== "retry") return [];
        if (index !== null) {
          let stopEvents = [
            ...(toolUseBlock ? [] : [createContentBlockStopEvent(apiMessageId, index)]),
            ...streamMessageDelta(apiMessageId, "refusal", null, usageForStream(usage)),
          ];
          logEvent("tengu_partial_stream_retraction_closed", {
            stop_reason: fromEnum("refusal"),
            had_open_block: true,
            source: lit("refusal_banner"),
          });
          apiMessageId = null;
          index = null;
          return stopEvents;
        }
        retracted = {
          source: "refusal_banner",
          messageId: apiMessageId,
          usage,
        };
        apiMessageId = null;
        return [];
      });
    },
    closeAtTurnEnd(usage) {
      return safeCallOrEmptyArray(() => [...closeRetracted(), ...close(usage, "turn_end", false)]);
    },
  };
}
//@ chunk-0yw3taqg.js:271163-271218 placement
function safeCallOrEmptyArray(fn) {
  try {
    return fn();
  } catch (error) {
    logError(error);
    return [];
  }
}
//@ chunk-0yw3taqg.js:271218-271697 placement
function toStreamEventMessage(frame, message) {
  return {
    type: "stream_event",
    event: frame.event,
    session_id: message.session_id,
    parent_tool_use_id: null,
    uuid: message.uuid,
    ...(frame.ttftMs !== undefined && {
      ttft_ms: frame.ttftMs,
    }),
    ...(frame.thinkingDisplay !== undefined && {
      thinking_display: frame.thinkingDisplay,
    }),
    ...(frame.apiMessageId !== undefined && {
      api_message_id: frame.apiMessageId,
    }),
    ...(frame.abandonedBlocks !== undefined && {
      abandoned_blocks: {
        api_message_id: frame.abandonedBlocks.apiMessageId,
        from_block_index: frame.abandonedBlocks.fromBlockIndex,
      },
    }),
    ...(frame.textRunsJoined && {
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
