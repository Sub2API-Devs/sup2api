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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
} from "path";
import { mkdir, mkdir as mkdir_2, writeFile, lstat, lstat as lstat_2, lstat as lstat_3 } from "fs/promises";
import {
  isHumanIngressFrame,
  VPr,
  ingressPromptContent,
  resolveIngressOrigins,
} from "../remoteIO/ingress.js";
import { isTextNotTyped, createContentBlockStopEvent } from "../../entrypoints/sdk/coreSchemas.js";
import {
  describeAttachmentFailures,
  contentWithPlannedPathRefs,
  allMissing,
  JWs,
  _Mo,
  asideSentence,
  NO_SPACE_FOR_A_FILE,
  shouldQueryInboundAttachment,
  extractInboundAttachments,
  resolveInboundAttachments,
} from "../../bridge/inboundAttachments.js";
import { NA, getUploadsDir, y4e } from "../../utils/uploadsDir.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { UNPLANNABLE_REASONS, refreshFilesPlacedByName } from "./taskListRestore.js";
import { sni, enqueueArrivingFileMessage, runBesideArrivingFiles } from "../../bridge/attachmentFilesWait.js";
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
import { getContentText, getUserMessageText, zbe } from "../../utils/messages.js";
import { startSessionActivity, endActivity } from "../../utils/sessionActivity.js";
import { createAbortController } from "../../utils/abortController.js";
import { withDeadline } from "../../utils/sleep.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnumOpt, fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { streamMessageDelta, usageForStream, streamMessageStop } from "./sdkMessageStream.js";

/**
 * 处理用户消息附带的文件（远程上传）：按 id 拉取、保存到上传目录，失败时告知模型哪些文件缺失。
 */
//@ chunk-tyg7f3ek.js:230577-232009 placement
function fetchUserPromptFiles({
  aheadOfFiles: aheadOfFiles,
  attachments: attachments,
  resolveArguments: resolveArguments,
  sessionHooks: sessionHooks,
  namedByIdHash: namedByIdHash = !1,
  tellModel: tellModel = filesNotSavedNote,
}) {
  let [S, R, w, P, L] = resolveArguments,
    q = w.isRemoteIO ? aheadOfFiles : void 0,
    x = { isRemoteIO: w.isRemoteIO, uuid: S.uuid, attachments: attachments },
    G = isHumanIngressFrame(S, w)
      ? attachments.flatMap(({ file_uuid: file_uuid, file_name: file_name, sha256: sha256 }) =>
          sha256 === void 0 ? [{ fileUuid: file_uuid, name: file_name }] : [],
        )
      : [],
    Z = [S, R, w, P, L, void 0, q, namedByIdHash],
    re =
      aheadOfFiles === "off" || attachments.length === 0
        ? "not_asked"
        : w.peerFrom !== void 0
          ? "peer"
          : !allFilesUnfetchable(attachments, aheadOfFiles)
            ? "file_kinds"
            : isTextNotTyped(S) &&
                describeAttachmentFailures(attachments).all_files_binary_ext_no_sha256 !== 1
              ? "text_not_typed"
              : hasPromptSubmitHooks(sessionHooks)
                ? "prompt_hook"
                : void 0,
    Ae = re === void 0 ? NA() : "",
    Ue = re === void 0 ? contentWithPlannedPathRefs(S, R, Ae, namedByIdHash) : void 0;
  if (Ue === void 0) {
    if (re !== "not_asked") {
      let Me = re ?? "unplannable";
      logForDiagnosticsNoPII("info", "user_message_waits_for_files", {
        reason: Me,
        reason_code: UNPLANNABLE_REASONS[Me],
        file_count: attachments.length,
      });
    }
    let ie = attachments.length > 0 ? sni() : void 0,
      Se = ie === void 0 ? VPr(...Z) : ie.then(() => VPr(...Z)),
      me =
        G.length > 0 && isFilePersistenceEnabled()
          ? Se.then(async (Me) => {
              if (AGENT_VERB(G)) await enqueueArrivingFileMessage(() => refreshFilesPlacedByName(G));
              return Me;
            })
          : Se;
    return {
      resolving: me,
      queuedAheadOfFiles: !1,
      frameAdmission: (Me) => {
        if (Me) me.then((Ee) => gP(x, Ee.missingFiles)).catch(logError);
      },
    };
  }
  let startTime = performance.now(),
    withResolvers = Promise.withResolvers();
  return (
    enqueueArrivingFileMessage(async () => {
      let ie = await VPr(S, R, w, P, L, Ae, q, namedByIdHash);
      if (AGENT_VERB(G)) await refreshFilesPlacedByName(G);
      return ie;
    }, Ue.paths)
      .then(
        (ie) => describeMissingFiles(Ue.refs, ie, startTime, withResolvers.promise, x, tellModel),
        (ie) => {
          (logError(ie),
            describeMissingFiles(
              Ue.refs,
              { content: "", missingFiles: allMissing(attachments, "not_finished") },
              startTime,
              withResolvers.promise,
              x,
              tellModel,
            ));
        },
      )
      .catch(logError),
    {
      resolving: Promise.resolve({ content: Ue.content, inlinedImagePaths: [] }),
      queuedAheadOfFiles: !0,
      frameAdmission: withResolvers.resolve,
    }
  );
}
//@ chunk-tyg7f3ek.js:232009-232216 placement
function allFilesUnfetchable(e, n) {
  if (getDisableFileMentions())
    return e.every((r) => r.is_image !== !0 && r.sha256 === void 0 && !JWs(_Mo(r)));
  return (
    describeAttachmentFailures(e)[
      n === "on_with_pdfs" ? "all_files_binary_ext_or_pdf_no_sha256" : "all_files_binary_ext_no_sha256"
    ] === 1
  );
}
//@ chunk-tyg7f3ek.js:232216-232425 placement
function hasPromptSubmitHooks(e) {
  try {
    let filtered = getPluginRegistry().loadedModules.filter((loadedModule) => !hasLink(loadedModule));
    return (
      hasSettingsHookForEvent("UserPromptSubmit", e, getSessionId(), !1) ||
      dispatchClassicEvent("UserPromptSubmit") ||
      hasModuleHookingSite("prompt.submit", void 0, filtered) ||
      hasModuleHookingSite("turn.start", void 0, filtered)
    );
  } catch (error) {
    return (logError(error), !0);
  }
}
//@ chunk-tyg7f3ek.js:232425-232499 placement
function gP({ isRemoteIO: isRemoteIO, uuid: uuid, attachments: attachments }, s) {
  if (isRemoteIO) logBridgeAttachmentsMissing(uuid, attachments.length, s);
}
//@ chunk-tyg7f3ek.js:232499-232650 placement
function missingFileRefs(e, n, r, s) {
  return r.flatMap((h, y) =>
    e.includes(n[y])
      ? [s?.find((S) => S.file_uuid === h.file_uuid) ?? { file_uuid: h.file_uuid, reason: "download" }]
      : [],
  );
}
//@ chunk-tyg7f3ek.js:232650-233618 placement
function describeMissingFiles(
  e,
  { content: content, missingFiles: missingFiles, asideOutcomes: asideOutcomes = [], noSpace: noSpace },
  y,
  S,
  R,
  w,
) {
  let P =
      typeof content === "string"
        ? content
        : content.map((Ue) => (Ue.type === "text" ? Ue.text : "")).join(`
`),
    filtered = e.filter((Ue) => !P.includes(Ue)),
    filtered_2 = asideOutcomes.filter((Ue) => !Ue.saved),
    x = new Set(filtered_2.map((Ue) => `@"${Ue.path}"`)),
    filtered_3 = filtered.filter((Ue) => !x.has(Ue)),
    Z = {
      notSaved: filtered_2.map((Ue) => asideSentence(Ue, !0)),
      moved: asideOutcomes.filter((Ue) => Ue.saved).map((Ue) => asideSentence(Ue, !0)),
    },
    re = Z.notSaved.length + Z.moved.length,
    Ae = {
      file_count: e.length,
      missing_file_count: filtered.length,
      ended_after_queue_ms: Math.round(performance.now() - y),
      ...(re > 0 && { late_aside_line_count: re }),
    };
  if (filtered.length === 0) logFeatureOk("bridge_attachment_turn_before_files", Ae);
  else if (filtered.length < e.length)
    logFeatureSad("bridge_attachment_turn_before_files", "some_missing", Ae);
  else logFeatureBad("bridge_attachment_turn_before_files", "all_missing", Ae);
  if (
    (logForDiagnosticsNoPII(
      filtered.length === 0 ? "info" : "warn",
      "user_message_files_ended_after_queue",
      Ae,
    ),
    filtered.length === 0 && re === 0)
  )
    return;
  S.then((Ue) => {
    if (Ue) {
      if ((w(e.length, filtered_3, !1, 0, noSpace, Z), filtered.length > 0))
        gP(R, missingFileRefs(filtered, e, R.attachments, missingFiles));
    }
  }).catch(logError);
}
//@ chunk-tyg7f3ek.js:233618-234608 placement
function filesNotSavedNote(e, n, r = !1, s = 0, h = !1, y = { notSaved: [], moved: [] }) {
  let S = [
      ...(n.length > 0
        ? [
            `${n.length} of the ${e} file(s) attached to a user message could not be fetched or saved${r ? " again, so these paths, which the message names, may be missing" : ", so these paths, which the message names, were not written"}: ${n.map((w) => escapeXml(w.slice(1))).join(", ")}`,
          ]
        : []),
      ...(s > 0
        ? [
            `${n.length > 0 ? `${s} more of them may be missing too` : `${s} of the ${e} file(s) attached to an earlier user message may be missing from the uploads folder`}, and it is not known which. If a file that the conversation names in the uploads folder is not found, ask the user to attach it again.`,
          ]
        : []),
      ...y.notSaved.map((w) => escapeXml(w)),
      ...(h ? [NO_SPACE_FOR_A_FILE] : []),
    ],
    mapped = y.moved.map((w) => escapeXml(w));
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
    skipAttachments: !0,
    priority: "next",
    shouldQuery: !1,
    passive: !0,
  });
}
//@ chunk-tyg7f3ek.js:234608-235279 placement
function createFetchHoldRegistry({ stopping: stopping }) {
  let n = new Map(),
    r;
  return {
    hold: (s) => {
      let h = n.get(s) ?? { holds: 0, started: !1, keptBack: void 0 };
      (h.holds++, n.set(s, h));
      let y = !1;
      return () => {
        if (y) return;
        if (((y = !0), h.holds--, h.holds > 0)) return;
        n.delete(s);
        let { keptBack: keptBack } = h;
        if (keptBack === void 0) return;
        try {
          let R = stopping();
          if (
            (logForDiagnosticsNoPII("info", "user_message_processed_after_files", {
              kept_back_ms: Math.round(performance.now() - keptBack.at),
              left_open: R ? 1 : 0,
            }),
            !R)
          )
            r?.(s, keptBack.state);
        } catch (error) {
          logError(error);
        }
      };
    },
    through: (s) => (
      (r = s),
      (h, y, S) => {
        let R = n.get(h);
        if (
          R !== void 0 &&
          (y === "completed" || (y === "cancelled" && (R.started || R.keptBack !== void 0)))
        ) {
          if (R.keptBack === void 0) R.keptBack = { state: y, at: performance.now() };
          return;
        }
        if (R !== void 0 && y === "started") R.started = !0;
        s(h, y, S);
      }
    ),
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
  },
  PARTIAL_STREAM_RETRACT_CODES = { cut_off_prompt: 1, skipped_and_left_open: 2 };
//@ chunk-tyg7f3ek.js:235576-235668 placement
function filesRefetchMode() {
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_mossy_anchor", !1) === !0) return "on";
  return isGrowthBookEnabled() && !hasFreshGrowthBookFeatures() ? "cold" : "off";
}
//@ chunk-tyg7f3ek.js:235668-235815 placement
function unfetchableFilesPlan(e, n) {
  if (!n || shouldQueryInboundAttachment(e) === !1) return;
  let r = extractInboundAttachments(e);
  return describeAttachmentFailures(r).all_files_binary_ext_or_pdf_no_sha256 === 1
    ? { files: r, sentCount: r.length }
    : void 0;
}
//@ chunk-tyg7f3ek.js:235815-236235 placement
function plannedFilePrompt(e, n, r, s) {
  let h;
  if (s === "cut_off_prompt") h = unfetchableFilesPlan(e, n);
  else {
    let R = extractInboundAttachments(e),
      filtered = R.filter((P) => P.is_image !== !0 && P.sha256 === void 0);
    h =
      n &&
      shouldQueryInboundAttachment(e) !== !1 &&
      filtered.length > 0 &&
      contentWithPlannedPathRefs(e, "", "") !== void 0
        ? { files: filtered, sentCount: R.length }
        : void 0;
  }
  if (h === void 0) return;
  let y = ingressPromptContent(e, n, r),
    S = resolveIngressOrigins(e, y, n, r, void 0);
  return S.peerFrom === void 0 &&
    !isGatedInbound({
      ingressOrigin: S.ingressOrigin,
      inboundOrigin: e.inbound_origin,
      envelopePeer: hasTeammateMessageEnvelope(y),
    })
    ? { ...h, chosenAs: s }
    : void 0;
}
//@ chunk-tyg7f3ek.js:236235-236248 placement
var _P = 60000;
//@ chunk-tyg7f3ek.js:236248-236489 placement
function holdForFilesRefetch(e) {
  let { promise: promise, resolve: resolve } = Promise.withResolvers();
  runBesideArrivingFiles(() => promise);
  let s = setTimeout(
    (h, y) => {
      (logForDiagnosticsNoPII("warn", "user_message_files_refetch_hold_expired", {
        max_ms: _P,
        chosen_as_code: y,
      }),
        h());
    },
    _P,
    resolve,
    PARTIAL_STREAM_RETRACT_CODES[e],
  );
  return (
    s.unref(),
    () => {
      (clearTimeout(s), resolve());
    }
  );
}
//@ chunk-tyg7f3ek.js:236489-236547 placement
var h0 = { uploads_elsewhere: 1, unfit_id: 2, refused: 3, threw: 4 };
//@ chunk-tyg7f3ek.js:236547-236662 placement
function logNoFileMark(e) {
  try {
    logForDiagnosticsNoPII("warn", "user_message_files_no_mark", { cause: e, cause_code: h0[e] });
  } catch (error) {
    logError(error);
  }
  return "no_mark";
}
//@ chunk-tyg7f3ek.js:236662-236710 placement
var _0 = 90000,
  FILES_FETCHED_AGAIN_HOLD = "files-fetched-again-hold",
  y0 = 2;
//@ chunk-tyg7f3ek.js:236710-237348 placement
async function refetchSessionUploads(e, n) {
  let r = !1;
  try {
    let s = getSessionId();
    if (getSessionUploadsDirOverride() !== null) return logNoFileMark("uploads_elsewhere");
    if (!isValidKeySegment(e) || e.length > 100 || !isValidKeySegment(s)) return logNoFileMark("unfit_id");
    let h = isStorageV5Enabled() ? n : void 0,
      y = join_4(getUploadsDir(), s, ".fetched-again");
    if (h === void 0) await mkdir(y, { recursive: !0, mode: 448 });
    for (let S = 1; S <= y0; S++) {
      if (h !== void 0) {
        let write = await h.write(
          STORAGE_SPACES.userConfigDir("uploads", [s, ".fetched-again", `${e}.${S}`]),
          "",
          { mode: 384, precondition: { type: "ifAbsent" } },
        );
        if (write.ok) return S;
        r ||= write.error.code !== "AlreadyExists";
        continue;
      }
      try {
        return (await writeFile(join_4(y, `${e}.${S}`), "", { flag: "wx", mode: 384 }), S);
      } catch (error) {
        r ||= getErrnoCode(error) !== "EEXIST";
      }
    }
  } catch (error) {
    return (logError(error), logNoFileMark("threw"));
  }
  return r ? logNoFileMark("refused") : "tries_spent";
}
//@ chunk-tyg7f3ek.js:237348-238288 placement
function reportFilesRefetch(
  {
    sentCount: sentCount,
    fileCount: fileCount,
    startedAt: startedAt,
    coldRead: coldRead,
    chosenAs: chosenAs,
  },
  y,
  { absent: S = 0, lost: R = 0, ...w } = {},
) {
  try {
    if (
      (logForDiagnosticsNoPII(
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
      ),
      y === "flags_off")
    )
      return;
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
function reportMissingFiles({
  uuid: uuid,
  sentCount: sentCount,
  files: files,
  refs: refs,
  lost: lost,
  listed: listed,
}) {
  try {
    return (
      filesNotSavedNote(sentCount, lost, !0),
      logBridgeAttachmentsMissing(uuid, sentCount, missingFileRefs(lost, refs, files, listed)),
      1
    );
  } catch (error) {
    return (logError(error), 0);
  }
}
//@ chunk-tyg7f3ek.js:238422-238556 placement = isRealPathWithinTeamDir (1)
async function isRegularFileOrUnknown(realCandidate) {
  if (getSessionUploadsDirOverride() !== null) return !1;
  try {
    return (await lstat(realCandidate)).isFile();
  } catch (error) {
    let code = getErrnoCode(error);
    return code !== "ENOENT" && code !== "ENOTDIR";
  }
}
/**
 * 重新拉取用户消息中缺失的附件文件（.fetched-again 标记），并替换存储的提示。
 */
//@ chunk-tyg7f3ek.js:238556-240853 placement
async function refetchUserMessageFiles({
  uuid: uuid,
  files: files,
  sentCount: sentCount,
  chosenAs: chosenAs,
  storedPrompt: storedPrompt,
  conversation: conversation,
  releasePlaceInLine: releasePlaceInLine,
  settleColdFlags: settleColdFlags,
  stopping: stopping,
  storageV5: storageV5,
  credentials: credentials,
}) {
  let q = {
      sentCount: sentCount,
      fileCount: files.length,
      startedAt: performance.now(),
      coldRead: settleColdFlags !== void 0,
      chosenAs: chosenAs,
    },
    x,
    G;
  try {
    if (settleColdFlags !== void 0) {
      await settleColdFlags().catch(logError);
      let ie = filesRefetchMode();
      if (ie !== "on") return (reportFilesRefetch(q, ie === "cold" ? "flags_not_fetched" : "flags_off"), !0);
    }
    let Z = NA(),
      re =
        chosenAs === "cut_off_prompt"
          ? storedPrompt
          : (conversation[findMessageIndex(conversation, uuid)] ?? storedPrompt),
      Ae =
        re === void 0
          ? null
          : re.type === "attachment" && re.attachment.type === "queued_command"
            ? getContentText(re.attachment.prompt)
            : getUserMessageText(re),
      Ue =
        (Ae === null
          ? void 0
          : [Z, ...y4e().map((ie) => join_4(ie, getSessionId()))].find((ie) =>
              contentWithPlannedPathRefs({ file_attachments: files }, "", ie)?.refs.some((Se) =>
                Ae.includes(Se),
              ),
            )) ?? Z;
    if (((x = contentWithPlannedPathRefs({ file_attachments: files }, "", Ue)), x === void 0))
      return (reportFilesRefetch(q, "unplannable"), !0);
    let { paths: paths, refs: refs } = x;
    startSessionActivity("files_arriving", FILES_FETCHED_AGAIN_HOLD);
    try {
      let ie = runBesideArrivingFiles(async (Se) => {
        let results = await Promise.all(paths.map(isRegularFileOrUnknown)),
          filtered = files.filter((pn, _n) => !results[_n]);
        if (filtered.length === 0) return (reportFilesRefetch(q, "all_there"), !0);
        if ((Se(paths.filter((pn, _n) => !results[_n])), stopping()))
          return (reportFilesRefetch(q, "aborted", { absent: filtered.length, lost: filtered.length }), !1);
        let Ee =
          Ue === Z || Ue === join_4(getUploadsDir(), getSessionId())
            ? await refetchSessionUploads(uuid, storageV5)
            : "kept_elsewhere";
        if (typeof Ee !== "number") {
          let filtered_2 = refs.filter((Mn, jn) => !results[jn]),
            _n = { absent: filtered.length, lost: filtered_2.length };
          if (stopping()) return (reportFilesRefetch(q, "aborted", _n), !1);
          return (
            (G = reportMissingFiles({
              uuid: uuid,
              sentCount: sentCount,
              files: files,
              refs: refs,
              lost: filtered_2,
              listed: allMissing(filtered, "not_finished"),
            })),
            reportFilesRefetch(q, Ee, { ..._n, told: G }),
            !0
          );
        }
        let He = createAbortController(),
          Xe = await withDeadline(
            resolveInboundAttachments(
              filtered,
              !1,
              !1,
              storageV5,
              credentials,
              void 0,
              !1,
              Ue,
              void 0,
              He.signal,
              !0,
            ).catch(
              (pn) => (logError(pn), { prefix: "", missingFiles: allMissing(filtered, "not_finished") }),
            ),
            _0,
          );
        if (Xe === void 0) He.abort();
        let We =
            Xe === void 0
              ? await Promise.all(paths.map(isRegularFileOrUnknown))
              : refs.map((pn, _n) => results[_n] === !0 || Xe.prefix.includes(pn)),
          filtered_2 = refs.filter((pn, _n) => !We[_n]),
          wt =
            Xe === void 0
              ? allMissing(
                  files.filter((pn, _n) => !We[_n]),
                  "not_finished",
                )
              : Xe.missingFiles,
          Lt = { absent: filtered.length, lost: filtered_2.length, try_number: Ee };
        if (filtered_2.length === 0) reportFilesRefetch(q, "fetched", Lt);
        else if (stopping()) return (reportFilesRefetch(q, "aborted", Lt), !1);
        else
          ((G = reportMissingFiles({
            uuid: uuid,
            sentCount: sentCount,
            files: files,
            refs: refs,
            lost: filtered_2,
            listed: wt,
          })),
            reportFilesRefetch(q, Xe === void 0 ? "too_slow" : "lost", { ...Lt, told: G }));
        return !0;
      });
      return (releasePlaceInLine?.(), await ie);
    } finally {
      endActivity("files_arriving", FILES_FETCHED_AGAIN_HOLD);
    }
  } catch (error) {
    logError(error);
    let re = !0;
    try {
      re = stopping();
    } catch (error) {
      logError(error);
    }
    if (re) return (reportFilesRefetch(q, "threw"), !1);
    return (
      reportFilesRefetch(q, "threw", {
        told:
          G ??
          (x === void 0
            ? 0
            : reportMissingFiles({
                uuid: uuid,
                sentCount: sentCount,
                files: files,
                refs: x.refs,
                lost: x.refs,
                listed: allMissing(files, "not_finished"),
              })),
      }),
      !0
    );
  } finally {
    releasePlaceInLine?.();
  }
}
//@ chunk-tyg7f3ek.js:240890-241076 placement
var TOOL_USE_BLOCK_TYPES = new Set(["tool_use", "server_tool_use", "mcp_tool_use"]),
  NOOP_STREAM_HANDLERS = {
    onStreamEvent: () => [],
    onAssistantMessage: () => {},
    onTombstone: () => [],
    onRefusalFallbackBanner: () => [],
    closeAtTurnEnd: () => [],
  };
//@ chunk-tyg7f3ek.js:241076-243554 placement
function createPartialStreamRetraction(e) {
  if (!e) return NOOP_STREAM_HANDLERS;
  let n = null,
    r = null,
    s = !1,
    h = !1,
    y = !1,
    S = new Map(),
    R = null;
  function w() {
    if (R === null) return [];
    let L = R;
    return (
      (R = null),
      logEvent("tengu_partial_stream_retraction_closed", {
        stop_reason: L.source === "tombstone" ? fromEnumOpt(L.retracted.stop_reason) : fromEnum("refusal"),
        had_open_block: !1,
        ...(L.source === "refusal_banner" && { source: lit("refusal_banner") }),
      }),
      L.source === "tombstone"
        ? streamMessageDelta(
            L.messageId,
            L.retracted.stop_reason,
            L.retracted.stop_sequence,
            usageForStream(L.retracted.usage),
          )
        : streamMessageDelta(L.messageId, "refusal", null, usageForStream(L.usage))
    );
  }
  function P(L, q, x) {
    if (n === null) return [];
    let G = [],
      Z = r !== null;
    if (r !== null && !y) G.push(createContentBlockStopEvent(n, r));
    if (h) G.push(streamMessageStop(n));
    else G.push(...streamMessageDelta(n, null, null, usageForStream(L), x ? void 0 : (S.get(n) ?? 0)));
    return (
      logEvent("tengu_partial_stream_retraction_closed", {
        stop_reason: void 0,
        had_open_block: Z,
        stop_reason_already_sent: h,
        source: fromEnum(q),
      }),
      (n = null),
      (r = null),
      (y = !1),
      (h = !1),
      G
    );
  }
  return {
    onStreamEvent(L, q) {
      return rm(() => {
        let x = [];
        if (R !== null)
          if (zbe(L));
          else if (L.type === "message_start") x.push(...w());
          else ((n = R.messageId), (R = null));
        if (L.type === "message_start")
          (x.push(...P(q, "stale_message_start", L.message.id === n)),
            (n = L.message.id),
            (r = null),
            (y = !1),
            (s = !1),
            (h = !1));
        else if (L.type === "content_block_start")
          ((r = L.index), (y = TOOL_USE_BLOCK_TYPES.has(L.content_block.type)), (h = !1));
        else if (L.type === "content_block_stop") ((r = null), (y = !1), (s = !0));
        else if (L.type === "message_delta") {
          if (L.delta.stop_reason != null && r === null) h = !0;
        } else if (L.type === "message_stop") ((n = null), (r = null), (y = !1), (h = !1));
        return x;
      });
    },
    onAssistantMessage(L) {
      rm(() => {
        let apiBlockIndex = L.apiBlockIndex;
        return (
          S.set(
            L.message.id,
            Math.max(
              S.get(L.message.id) ?? 0,
              apiBlockIndex !== void 0 && Number.isSafeInteger(apiBlockIndex) && apiBlockIndex >= 0
                ? apiBlockIndex + 1
                : Number.NaN,
            ),
          ),
          []
        );
      });
    },
    onTombstone(L) {
      return rm(() => {
        if (n === null || L.message.type !== "assistant" || L.message.message.id !== n) return [];
        if (L.displayOnly === !0)
          return (
            logEvent("tengu_partial_stream_retraction_display_only", { had_open_block: r !== null }),
            []
          );
        let message = L.message.message;
        if (r === null)
          return ((R = { source: "tombstone", messageId: n, retracted: message }), (n = null), []);
        let x = [
          ...(y ? [] : [createContentBlockStopEvent(n, r)]),
          ...streamMessageDelta(n, message.stop_reason, message.stop_sequence, usageForStream(message.usage)),
        ];
        return (
          logEvent("tengu_partial_stream_retraction_closed", {
            stop_reason: fromEnumOpt(message.stop_reason),
            had_open_block: !0,
          }),
          (n = null),
          (r = null),
          x
        );
      });
    },
    onRefusalFallbackBanner(L, q) {
      return rm(() => {
        if (n === null || s || L !== "retry") return [];
        if (r !== null) {
          let x = [
            ...(y ? [] : [createContentBlockStopEvent(n, r)]),
            ...streamMessageDelta(n, "refusal", null, usageForStream(q)),
          ];
          return (
            logEvent("tengu_partial_stream_retraction_closed", {
              stop_reason: fromEnum("refusal"),
              had_open_block: !0,
              source: lit("refusal_banner"),
            }),
            (n = null),
            (r = null),
            x
          );
        }
        return ((R = { source: "refusal_banner", messageId: n, usage: q }), (n = null), []);
      });
    },
    closeAtTurnEnd(L) {
      return rm(() => [...w(), ...P(L, "turn_end", !1)]);
    },
  };
}
//@ chunk-tyg7f3ek.js:243554-243609 placement
function rm(e) {
  try {
    return e();
  } catch (error) {
    return (logError(error), []);
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
    ...(e.ttftMs !== void 0 && { ttft_ms: e.ttftMs }),
    ...(e.thinkingDisplay !== void 0 && { thinking_display: e.thinkingDisplay }),
    ...(e.apiMessageId !== void 0 && { api_message_id: e.apiMessageId }),
    ...(e.abandonedBlocks !== void 0 && {
      abandoned_blocks: {
        api_message_id: e.abandonedBlocks.apiMessageId,
        from_block_index: e.abandonedBlocks.fromBlockIndex,
      },
    }),
    ...(e.textRunsJoined && { text_runs_joined: !0 }),
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
