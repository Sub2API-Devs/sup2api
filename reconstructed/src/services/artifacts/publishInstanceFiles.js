/**
 * services/artifacts/publishInstanceFiles.ts
 *
 * 2.1.316 新增：多文件（实例文件）发布与清单校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (21)
 * attribution: placement 21
 */
import { extname } from "path";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import {
  publishError,
  strandedSlugFrom,
  publishRetryNote,
  staleBaseConflictMessage,
  checkHostGrantCarry,
  changedFilesConflictMessage,
} from "./publishConflicts.js";
import {
  trackUploadBytes,
  deployWithRetry,
  postDeploy,
  deployQuery,
  droppedFieldOn400,
  withoutField,
  wrongArtifactAnswer,
  backoffMs,
  RelayOnlyUnsentError,
  RelayOnlyCancelledError,
  malformedDeployResponse,
  parseIntHeader,
  X_FRAME_PUSH_REMAINING,
  dailyResetFromHeader,
  publishCancelledResult,
  relayOnlyUnsentResult,
  isRelayOnlyCancelled,
  PublishTransportError,
  publishErrorTelemetry,
  retryDelayMs,
  dailyCapNotice,
  withPublishTiming,
  postRelayOnlyWithBusyWait,
} from "./publishArtifact.js";
import { logForDebugging } from "../../utils/debug.js";
import { publishMetadataFields, carriesDeadline, splitManifestPaths } from "./pagePreparation.js";
import { entrypointHint, sessionIdHint } from "./requestMeta.js";
import {
  formatFrameErrorBody,
  UNKNOWN_FIELD_ERROR_RE,
  buildFrameHeaders,
  isUnknownFieldErrorFor,
} from "./frameApi.js";
import {
  describeArtifactAuthFailure,
  isFrameBaseVersionEnabled,
  FRAME_CONSTANTS,
  isFrameDeclaredThumbnailEnabled,
  MAX_ARTIFACT_BYTES,
  isFrameCopyFromEnabled,
  isFrameMultiFileEnabled,
} from "./frameFlags.js";
import { sleep } from "../../utils/sleep.js";
import {
  relayHttpUnknown,
  liveConflictOf,
  isIgnorable400,
  deploy400Fallback,
  classifyPublishResponse,
  publishErrorResult,
  errBody,
  isRateLimitedResponse,
  refusalReasonField,
  rateLimitedResult,
  refusalReasonOf,
  isTypeFileRefusal,
  TYPE_INSTANCE_TEXT_RE,
  publishDeniedReason,
  isUnknownLiveFieldError,
  deploy400Message,
  preconditionConflictOf,
  outcomeUnknownMessage,
} from "./publishErrors.js";
import { getErrnoPath_2 } from "../../utils/errors.js";
import {
  publishResponseSchema,
  mergedChangesFields,
  isMergedResponse,
  typeInstanceFields,
  mergedTelemetry,
  publishEchoFields,
  capabilitiesEchoFields,
} from "./listArtifacts.js";
import {
  renderDocs,
  renderWarnings,
  embedsToDocs,
  newWarnings,
  renderEmbeds,
  pinsToDocs,
  docsToDocs,
  emptyList,
  warningsToDocs,
} from "./renderBudget.js";
import { READ_BACK_LIMITS, readBackAfterPublish } from "./readBack.js";
import { recordOwnPublish, withPublishInFlight } from "./ownPublishes.js";
import {
  contentTypeForPath,
  baseMediaType,
  lineColumnAt,
  MARKUP_WITHOUT_SVG_TYPES,
  HTML_CONTENT_TYPES,
  copyPreflightFailure,
  copiedFilesSummary,
  SVG_CONTENT_TYPE,
  SCRIPT_CONTENT_TYPES,
} from "./contentTypes.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { plural, isWellFormedString } from "../../utils/stringUtils.js";
import {
  ARTIFACT_SLUG_RE,
  getArtifactPublishStubDir,
  artifactViewerPath,
} from "../../tools/ArtifactTool/constants.js";
import { validateSupportingFiles } from "./publishFiles.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { readHostGrant } from "./capabilityDeclaration.js";
import { env } from "../../utils/env.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import {
  leaveOutMissingField,
  leaveOutMissingRefusal,
  markLeaveOutMissingRefused,
  isClientRefusalStatus,
  isAddOnlyPublish,
  allFilesLeftOutMessage,
  copiedFilesLeftOutNote,
} from "./leftOutFiles.js";
import { frameApi, isFrameNotFoundBody } from "./frameRelay.js";
import { uniq } from "../../utils/collections.js";
import { getArtifactHostOverride } from "../../constants/claudeAiOrigin.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-06y4szbn.js:103080-109169 placement
/**
 * 多文件 artifact 发布：写入/删除/复制文件、路径固定检查、预检、上传与缩略图，组装遥测。
 */
async function publishFilesVersion(
  html,
  request,
  response,
  baseVersion,
  forced,
  meta,
  ownPublishes,
  credentials,
  createPath,
  onRetryStatus,
  signal,
  files,
  reservedSlug,
  relayBudget = undefined,
) {
  let telemetry = {
    page_bytes: meta.pageBytes,
    lane: fromEnum(meta.lane),
    forced: meta.forced,
    is_redeploy: meta.isRedeploy,
    has_base_version: baseVersion !== undefined,
    ...(reservedSlug !== undefined && {
      reserved: true,
    }),
    template: fromEnum("plain"),
    ...getThumbnailCount(request),
    ...(files !== undefined &&
      files.length > 0 && {
        n_files: files.length,
      }),
  };
  let manifestFiles;
  if (createPath !== undefined && files !== undefined && files.length > 0) {
    let fileError = validateFileLists(html, files, []);
    if (fileError !== null) {
      logFeatureBad("artifact_publish", fileError.kind, telemetry);
      return publishError(fileError.msg);
    }
    let manifest = Object.create(null);
    manifest["index.html"] = {
      content: html,
      contentType: "text/html",
      live: true,
    };
    let remainingBytes = TEXT_FILE_MAX_BYTES - jsonBodyBytes(html);
    for (let file of files) {
      let encoded = encodeManifestContent(file);
      remainingBytes -= jsonBodyBytes(encoded);
      if (remainingBytes < 0) {
        logFeatureBad("artifact_publish", "too_large", telemetry);
        return publishError("file too large");
      }
      manifest[file.path] = {
        content: encoded,
        contentType: file.contentType,
        ...(file.live === true && {
          live: true,
        }),
      };
    }
    manifestFiles = manifest;
  }
  let response_2 = null;
  let refusedKind = "none";
  let isCreate = !request.slug;
  let prepareCb;
  let onEncoding = trackUploadBytes(telemetry);
  try {
    let canForce = forced;
    let baseVer = baseVersion;
    let expectUnpublished = false;
    let currentRequest =
      reservedSlug !== undefined
        ? {
            ...request,
            slug: reservedSlug,
          }
        : request;
    logForDebugging(
      `[artifact] publish \u2192 ${createPath ?? "/api/frame/deploy/direct"}${manifestFiles !== undefined ? ` (files: ${Object.keys(manifestFiles).length})` : ""}`,
    );
    let firstSend = true;
    let sendOnce = () => {
      let isFirst = firstSend;
      firstSend = false;
      return deployWithRetry(
        (requestState) =>
          postDeploy(
            createPath ?? deployQuery(requestState, request),
            {
              ...publishMetadataFields(currentRequest),
              ...entrypointHint(),
              ...sessionIdHint(),
              ...response,
              ...(createPath === undefined &&
                canForce && {
                  force: true,
                }),
              ...(createPath === undefined &&
                baseVer && {
                  baseVersion: baseVer,
                }),
              ...(createPath === undefined &&
                expectUnpublished &&
                !baseVer &&
                currentRequest.slug && {
                  expectUnpublished: true,
                }),
              ...(manifestFiles !== undefined
                ? {
                    files: manifestFiles,
                  }
                : {
                    content: html,
                  }),
            },
            credentials,
            (seen) => (prepareCb = seen),
            onEncoding,
            requestState,
            relayBudget,
            signal,
          ),
        onRetryStatus,
        signal,
        telemetry,
        true,
        createPath === undefined && currentRequest.slug !== undefined,
        isFirst,
      );
    };
    let droppedFields = {
      deadline: false,
      icon: false,
      request_id: false,
    };
    let sendDroppingFields = async () => {
      let res = await sendOnce();
      for (
        let dropped = droppedFieldOn400(currentRequest, res);
        dropped !== undefined;
        dropped = droppedFieldOn400(currentRequest, res)
      ) {
        logFeatureSad("artifact_publish", `${dropped}_rejected`, telemetry);
        logForDebugging(`[artifact] ${dropped} refused upstream \u2014 retrying without it`);
        currentRequest = withoutField(currentRequest, dropped);
        droppedFields[dropped] = true;
        res = await sendOnce();
      }
      return res;
    };
    let deployResponse = await sendDroppingFields();
    if (canForce && deployResponse.ok && deployResponse.fromFrame && deployResponse.status === 400) {
      let text = formatFrameErrorBody(deployResponse.data);
      if (
        UNKNOWN_FIELD_ERROR_RE.test(text) &&
        (/\bforce\b/.test(text) || (baseVer !== undefined && /\bbaseVersion\b/.test(text)))
      ) {
        logFeatureSad("artifact_publish", "force_field_rejected", telemetry);
        logForDebugging("[artifact] CP rejected force/baseVersion as unknown \u2014 retrying without them");
        canForce = false;
        baseVer = undefined;
        deployResponse = await sendDroppingFields();
      }
    }
    if (
      canForce &&
      baseVer &&
      deployResponse.ok &&
      deployResponse.fromFrame &&
      deployResponse.status === 400 &&
      /force and baseVersion are mutually exclusive/.test(formatFrameErrorBody(deployResponse.data))
    ) {
      logFeatureSad("artifact_publish", "exclusivity_retry", telemetry);
      logForDebugging(
        "[artifact] pre-relaxation CP rejected force+baseVersion \u2014 retrying without the precondition",
      );
      baseVer = undefined;
      deployResponse = await sendDroppingFields();
    }
    let describeUnavailable = (reason) =>
      reason.reason === "no-auth"
        ? describeArtifactAuthFailure(reason.detail)
        : `publish unavailable: ${reason.reason}`;
    if (!deployResponse.ok) {
      logFeatureBad("artifact_publish", deployResponse.reason, telemetry);
      return publishError(describeUnavailable(deployResponse));
    }
    response_2 = deployResponse.fromFrame
      ? strandedSlugFrom(deployResponse.status, deployResponse.data)
      : null;
    if (response_2 && !isCreate && response_2.slug !== request.slug) {
      logFeatureBad("artifact_publish", "deploy_slug_mismatch", telemetry);
      return publishError(wrongArtifactAnswer());
    }
    if (response_2 && response_2.kind === undefined && createPath === undefined && !signal?.aborted) {
      let delayMs = backoffMs(2, deployResponse.response?.headers?.["retry-after"]);
      logForDebugging(
        `[artifact] /deploy/direct 503 after commit (${response_2.slug}) \u2014 retrying against it in ${delayMs}ms`,
      );
      onRetryStatus?.({
        status: 503,
        attempt: 2,
        maxAttempts: 2,
        delayMs,
      });
      try {
        await sleep(delayMs, signal);
        if (!signal?.aborted) {
          if (isCreate) {
            currentRequest = {
              ...currentRequest,
              slug: response_2.slug,
            };
            expectUnpublished = response_2.live === undefined;
            canForce = false;
          }
          if (response_2.live !== undefined) baseVer = response_2.live;
          refusedKind = "unknown";
          firstSend = true;
          try {
            deployResponse = await sendDroppingFields();
          } catch (error) {
            if (!(error instanceof RelayOnlyUnsentError)) throw error;
            refusedKind = error instanceof RelayOnlyCancelledError ? "cancelled" : "unsent";
            return publishRetryNote(
              publishError(
                refusedKind === "cancelled"
                  ? "publish cancelled"
                  : "The publish failed with a server error (503)",
              ),
              response_2,
              isCreate,
              refusedKind,
            );
          }
          refusedKind = "answered";
        }
      } finally {
        logFeatureSad("artifact_publish", "deploy_stranded_retried", {
          ...telemetry,
          fresh_publish: isCreate,
          deploy_final_status: refusedKind === "answered" && deployResponse.ok ? deployResponse.status : 0,
          ...(signal?.aborted && {
            cancelled: true,
          }),
        });
        onRetryStatus?.({
          settled: true,
        });
      }
      if (!deployResponse.ok) {
        logFeatureBad("artifact_publish", deployResponse.reason, telemetry);
        return publishRetryNote(
          publishError(describeUnavailable(deployResponse)),
          response_2,
          isCreate,
          refusedKind,
        );
      }
    }
    if (!deployResponse.fromFrame) {
      logFeatureBad("artifact_publish", "relay_error", {
        ...telemetry,
        deploy_status: deployResponse.status,
      });
      return publishRetryNote(
        publishError(relayHttpUnknown(deployResponse.status)),
        response_2,
        isCreate,
        refusedKind,
      );
    }
    if (
      ((baseVer ?? baseVersion) || expectUnpublished || isFrameBaseVersionEnabled()) &&
      deployResponse.status === 409
    ) {
      let liveConflict = liveConflictOf(deployResponse.data);
      if (liveConflict) {
        logFeatureBad("artifact_publish", "conflict", telemetry);
        return publishRetryNote(
          {
            ...publishError(staleBaseConflictMessage(liveConflict)),
            conflict: true,
            conflictDetail: liveConflict,
          },
          response_2,
          isCreate,
          refusedKind,
        );
      }
    }
    if (createPath !== undefined && deployResponse.status === 404) {
      logFeatureBad("artifact_publish", "create_not_enabled", {
        ...telemetry,
        deploy_status: 404,
      });
      return publishError("create endpoint not available (404) \u2014 nothing was created");
    }
    if (
      deployResponse.status === 400 &&
      isIgnorable400(formatFrameErrorBody(deployResponse.data), {
        ldx: false,
      })
    ) {
      logFeatureBad("artifact_publish", "ldx_unsupported", telemetry);
      return publishRetryNote(
        publishError(deploy400Fallback(formatFrameErrorBody(deployResponse.data))),
        response_2,
        isCreate,
        refusedKind,
      );
    }
    if (deployResponse.status < 200 || deployResponse.status >= 300) {
      let classified = classifyPublishResponse(
        deployResponse.status,
        deployResponse.data,
        meta.isRedeploy,
        meta.echoedPin !== undefined
          ? {
              pin: meta.echoedPin,
              declaredCaps: meta.hasCaps,
            }
          : undefined,
        meta.liveFilesOn === true,
        meta.sent,
        {
          retryAfter: deployResponse.response?.headers?.["retry-after"],
          reservedSlug,
          created: isCreate && response_2 !== null,
        },
      );
      if (classified.code !== "thumbnail_rejected")
        logFeatureBad("artifact_publish", classified.code ?? "deploy_failed", {
          ...telemetry,
          deploy_status: deployResponse.status,
          ...classified.extra,
        });
      let errnoPath = classified.code === "path_is_live" ? getErrnoPath_2(deployResponse.data) : undefined;
      return publishRetryNote(
        {
          ...publishErrorResult(
            classified,
            `deploy ${deployResponse.status}: ${errBody(deployResponse.data)}`,
          ),
          ...(errnoPath !== undefined && {
            refusedLivePath: errnoPath,
          }),
        },
        response_2,
        isCreate,
        refusedKind,
      );
    }
    let parsed = publishResponseSchema().safeParse(deployResponse.data);
    if (!parsed.success) {
      logFeatureBad("artifact_publish", "deploy_incomplete", telemetry);
      return publishRetryNote(publishError(malformedDeployResponse()), response_2, isCreate, refusedKind);
    }
    let { slug, version, read, shared, kind } = parsed.data;
    if (currentRequest.slug && slug !== currentRequest.slug) {
      logFeatureBad("artifact_publish", "deploy_slug_mismatch", telemetry);
      return publishRetryNote(publishError(wrongArtifactAnswer()), response_2, isCreate, refusedKind);
    }
    if (createPath !== undefined && (FRAME_CONSTANTS == null || kind !== FRAME_CONSTANTS.LIVE_DOC_KIND)) {
      logFeatureBad("artifact_publish", "deploy_incomplete", telemetry);
      return publishError(malformedDeployResponse());
    }
    let docs = renderDocs(deployResponse.data);
    let paths = docs?.map((path) => path.path);
    let known =
      createPath === undefined
        ? new Set()
        : new Set([
            "index.html",
            ...Object.entries(manifestFiles ?? {})
              .filter(([, value]) => value.live === true)
              .map(([key]) => key),
          ]);
    let docs_2 = (paths ?? []).filter((path) => known.has(path));
    let sliced = [
      ...renderWarnings(deployResponse.data),
      ...embedsToDocs(docs_2),
      ...newWarnings(paths, new Set(["index.html", ...Object.keys(manifestFiles ?? {})])),
    ].slice(0, READ_BACK_LIMITS);
    let embeds = renderEmbeds(deployResponse.data);
    let intHeader = parseIntHeader(deployResponse.response?.headers?.[X_FRAME_PUSH_REMAINING]);
    let pushResetAt = dailyResetFromHeader(deployResponse.response?.headers?.date);
    let merged = mergedChangesFields(
      parsed.data,
      canForce ? undefined : baseVer,
      new Set(["index.html", ...Object.keys(manifestFiles ?? {}), ...(paths ?? [])]),
    );
    recordOwnPublish(ownPublishes, slug, version, {
      merged: isMergedResponse(deployResponse.data),
    });
    let typeFields = typeInstanceFields(parsed.data);
    logFeatureOk("artifact_publish", {
      ...telemetry,
      e2e_ms: Math.round(performance.now() - meta.t0),
      is_redeploy: meta.isRedeploy,
      has_caps: meta.hasCaps,
      push_remaining_seen: intHeader !== undefined,
      ...mergedTelemetry(merged.mergedOver),
      read_back_echoed: typeFields.readBackEchoed === true,
    });
    return {
      url: artifactViewerUrl(slug),
      slug,
      version,
      err: null,
      ...(intHeader !== undefined && {
        pushRemaining: intHeader,
        pushResetAt,
      }),
      ...(read !== undefined && {
        read,
      }),
      ...(shared !== undefined && {
        shared,
      }),
      ...publishEchoFields(parsed.data, carriesDeadline(currentRequest)),
      ...merged,
      ...(droppedFields.deadline && {
        deadlineDropped: true,
      }),
      ...(droppedFields.icon && {
        iconDropped: true,
      }),
      ...capabilitiesEchoFields(parsed.data, response, createPath !== undefined),
      ...typeFields,
      ...(kind !== undefined && {
        kind,
      }),
      ...(sliced.length > 0 && {
        warnings: sliced,
      }),
      ...(embeds !== undefined && {
        embeds,
      }),
      ...(paths !== undefined && {
        livePaths: paths,
      }),
      ...(docs !== undefined && {
        liveDocs: docs,
      }),
      ...(docs_2.length > 0 && {
        bornLive: docs_2,
      }),
    };
  } catch (error) {
    if (error instanceof RelayOnlyUnsentError)
      return error instanceof RelayOnlyCancelledError
        ? publishCancelledResult()
        : relayOnlyUnsentResult(telemetry);
    if (!isRelayOnlyCancelled(error))
      logFeatureBad(
        "artifact_publish",
        error instanceof PublishTransportError ? "relay_request_error" : "request_error",
        {
          ...telemetry,
          ...publishErrorTelemetry(error, meta.t0),
          ...prepareCb,
        },
      );
    return publishRetryNote(
      publishError(error instanceof Error ? error.message : String(error)),
      response_2,
      isCreate,
      refusedKind,
    );
  }
}
//@ chunk-06y4szbn.js:109169-109179 placement
var MAX_COPY_SOURCES = 4;
//@ chunk-06y4szbn.js:109179-109242 placement
function bufferToText(content) {
  return typeof content === "string" ? content : content.toString("utf8");
}
//@ chunk-06y4szbn.js:109242-111832 placement
/**
 * 类型实例发布清单的类型表：可作为文本发布的 MIME、可服务的 MIME 全集，以及只按扩展名识别的代码与办公文档后缀。
 */
var MANIFEST_TEXT_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MANIFEST_SERVABLE_TYPES;
var MANIFEST_CODE_EXTENSIONS;
var MANIFEST_OTHER_EXTENSIONS;
deferInit("chunk-06y4szbn.js:109242", () => {
  MANIFEST_TEXT_TYPES = new Set([
    "text/html",
    ...[],
    "text/css",
    "text/plain",
    "text/markdown",
    "text/csv",
    "text/javascript",
    "application/javascript",
    "application/json",
    "application/manifest+json",
    "application/xml",
    "text/xml",
    "image/svg+xml",
  ]);
  MANIFEST_SERVABLE_TYPES = new Set([
    ...MANIFEST_TEXT_TYPES,
    "application/wasm",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/avif",
    "image/x-icon",
    "image/vnd.microsoft.icon",
    "font/woff",
    "font/woff2",
    "font/ttf",
    "font/otf",
    "application/font-woff",
    "application/font-woff2",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/webm",
    "video/mp4",
    "video/webm",
    "video/ogg",
    "application/pdf",
  ]);
  MANIFEST_CODE_EXTENSIONS = [
    "py",
    "ipynb",
    "yaml",
    "yml",
    "toml",
    "ini",
    "cfg",
    "conf",
    "env",
    "lock",
    "sh",
    "bash",
    "ps1",
    "bat",
    "ts",
    "tsx",
    "jsx",
    "vue",
    "scss",
    "less",
    "rs",
    "go",
    "java",
    "kt",
    "c",
    "h",
    "cpp",
    "cs",
    "rb",
    "php",
    "r",
    "swift",
    "lua",
    "sql",
    "db",
    "sqlite",
    "parquet",
    "jsonl",
    "ndjson",
    "log",
    "tex",
    "rtf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "odt",
    "ods",
    "epub",
    "key",
    "pages",
    "numbers",
    "zip",
    "tar",
    "gz",
    "tgz",
    "7z",
    "rar",
    "mov",
    "avi",
    "m4a",
    "aac",
    "flac",
    "heic",
    "bmp",
    "tif",
    "tiff",
    "psd",
    "fig",
    "eot",
    "xhtml",
    "htm",
    "bin",
    "exe",
    "dmg",
    "tsv",
    "pkl",
    "npy",
    "npz",
    "pt",
    "onnx",
    "safetensors",
    "h5",
    "svelte",
    "mdx",
    "jsonc",
  ];
  MANIFEST_OTHER_EXTENSIONS = [
    "text/x-python",
    "text/x-python-script",
    "application/x-python-code",
    "application/x-ipynb+json",
    "application/x-yaml",
    "application/yaml",
    "text/yaml",
    "text/x-yaml",
    "application/toml",
    "text/x-toml",
    "text/x-sh",
    "text/x-shellscript",
    "application/x-sh",
    "application/typescript",
    "text/typescript",
    "text/x-typescript",
    "text/jsx",
    "text/x-scss",
    "text/x-sql",
    "application/sql",
    "application/x-sqlite3",
    "application/vnd.apache.parquet",
    "application/x-ndjson",
    "application/jsonl",
    "application/ld+json",
    "application/geo+json",
    "application/octet-stream",
    "text/x-log",
    "text/rtf",
    "application/rtf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.oasis.opendocument.text",
    "application/epub+zip",
    "application/zip",
    "application/x-zip-compressed",
    "application/gzip",
    "application/x-tar",
    "application/x-7z-compressed",
    "video/quicktime",
    "video/x-msvideo",
    "audio/mp4",
    "audio/x-m4a",
    "audio/aac",
    "audio/flac",
    "image/heic",
    "image/bmp",
    "image/tiff",
    "image/vnd.adobe.photoshop",
    "application/x-figma",
    "application/vnd.ms-fontobject",
    "application/xhtml+xml",
    "application/x-www-form-urlencoded",
    "multipart/form-data",
    "image/jpg",
    "text/json",
    "text/x-markdown",
    "application/x-javascript",
    "text/x-java-source",
    "text/x-c",
  ];
});
//@ chunk-06y4szbn.js:111832-112146 placement
function notServedFileExtra(path, contentType) {
  let sliced = extname(path).toLowerCase().slice(1);
  let found = MANIFEST_CODE_EXTENSIONS.find((ext) => ext === sliced);
  let refusedExt =
    sliced === ""
      ? fromEnum("none")
      : contentTypeForPath(path) !== undefined
        ? fromEnum("served")
        : found !== undefined
          ? fromEnum(found)
          : fromEnum("other");
  if (contentType === undefined)
    return {
      refused_ext: refusedExt,
    };
  let mediaType = baseMediaType(contentType);
  let found_2 = MANIFEST_OTHER_EXTENSIONS.find((ext) => ext === mediaType);
  let refusedType = MANIFEST_SERVABLE_TYPES.has(mediaType)
    ? fromEnum("served_variant")
    : found_2 !== undefined
      ? fromEnum(found_2)
      : fromEnum("other");
  return {
    refused_ext: refusedExt,
    refused_type: refusedType,
  };
}
//@ chunk-06y4szbn.js:112146-112323 placement
/**
 * 发布文件的限制常量：XML 类内容类型、单次清单请求预算、版本总字节、二进制文件上限、各类大小与条目数上限，以及识别 manifest/mode 字段的正则。
 */
var XML_CONTENT_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MANIFEST_REQUEST_BUDGET;
var VERSION_TOTAL_BYTES;
var BINARY_FILE_MAX_BYTES;
var TEXT_FILE_MAX_BYTES;
var MANIFEST_UPLOAD_THRESHOLD_BYTES;
var MAX_REQUEST_WIRE_BYTES;
var MAX_PATH_SEGMENT_LENGTH;
var VERSION_MAX_ENTRIES;
var MANIFEST_FIELD_RE;
deferInit("chunk-06y4szbn.js:112146", () => {
  XML_CONTENT_TYPES = new Set(["image/svg+xml", "text/xml", "application/xml"]);
  MANIFEST_REQUEST_BUDGET = 67108864;
  VERSION_TOTAL_BYTES = 268435456;
  BINARY_FILE_MAX_BYTES = 15728640;
  TEXT_FILE_MAX_BYTES = 12582912;
  MANIFEST_UPLOAD_THRESHOLD_BYTES = 1048576;
  MAX_REQUEST_WIRE_BYTES = 20971520;
  MAX_PATH_SEGMENT_LENGTH = 256;
  VERSION_MAX_ENTRIES = 512;
  MANIFEST_FIELD_RE = /\b(manifest|mode)\b/;
});
//@ chunk-06y4szbn.js:112323-112531 placement
function encodeManifestContent(file) {
  if (MANIFEST_TEXT_TYPES.has(file.contentType))
    return typeof file.content === "string" ? file.content : file.content.toString("utf8");
  return (typeof file.content === "string" ? Buffer.from(file.content, "utf8") : file.content).toString(
    "base64",
  );
}
//@ chunk-06y4szbn.js:112531-112645 placement
function getThumbnailCount(request) {
  let count = (request.thumbnail !== undefined ? 1 : 0) + (request.thumbnailDark !== undefined ? 1 : 0);
  return count > 0 && isFrameDeclaredThumbnailEnabled()
    ? {
        thumbnails: count,
      }
    : {};
}
//@ chunk-06y4szbn.js:112645-112710 placement
function thumbnailByteCount(bytes) {
  return bytes !== undefined && isFrameDeclaredThumbnailEnabled() ? Math.ceil(bytes.length / 3) * 4 : 0;
}
//@ chunk-06y4szbn.js:112710-112813 placement
function getContentByteLength(file) {
  return typeof file.content === "string" ? Buffer.byteLength(file.content, "utf8") : file.content.length;
}
//@ chunk-06y4szbn.js:112813-112868 placement
function jsonBodyBytes(value) {
  return Buffer.byteLength(jsonStringify(value), "utf8") - 2;
}
//@ chunk-06y4szbn.js:112868-113188 placement
function manifestDeltas(files, preconditions) {
  let deltas = Object.create(null);
  let keys = Object.keys(files);
  if (keys.length === 0) return;
  for (let path of keys) {
    let entry = files[path];
    let expected = preconditions.get(path);
    if (expected === undefined || entry === undefined) return;
    if (entry === null) {
      if (expected === null) return;
      deltas[path] = {
        delete: true,
        ifMatch: expected,
      };
      continue;
    }
    if (!("contentType" in entry) || entry.live !== undefined || entry.reseed !== undefined) return;
    deltas[path] = {
      ...entry,
      ifMatch: expected,
    };
  }
  return deltas;
}
//@ chunk-06y4szbn.js:113188-113259 placement
var PATCH_ERROR_PATTERNS = /unknown field "(live|reseed)"/;
var EMPTY_MANIFEST_RE = /manifest must not be empty/;
//@ chunk-06y4szbn.js:113259-116262 placement
function validateFileLists(html, files, removes) {
  let invalid = (msg) => ({
    kind: "files_invalid",
    msg,
  });
  let tooLarge = (msg) => ({
    kind: "too_large",
    msg,
  });
  if (files.length + removes.length + (html === null ? 0 : 1) > MAX_PATH_SEGMENT_LENGTH)
    return invalid(
      `This publish lists ${files.length} ${plural(files.length, "file")}${removes.length > 0 ? ` and ${removes.length} ${plural(removes.length, "removal")}` : ""}${html === null ? "" : " plus the page"}, which is over the limit of ${MAX_PATH_SEGMENT_LENGTH} entries in one publish. Nothing was published: send at most ${MAX_PATH_SEGMENT_LENGTH - 1} files now and add the rest with another publish to the same url \u2014 files left out of a later publish are kept, and a version holds up to ${VERSION_MAX_ENTRIES} in all.`,
    );
  let seenPaths = new Set(["index.html"]);
  for (let path of removes) {
    if (!path || path === "index.html")
      return invalid(
        path
          ? `"index.html" is the page itself and can't be removed. Drop that entry.`
          : "A removal in `files` has an empty path. Name the published path to remove.",
      );
    if (seenPaths.has(path))
      return invalid(`${jsonStringify(path)} is listed more than once in \`files\`. List each path once.`);
    seenPaths.add(path);
  }
  let totalBytes = html === null ? 0 : Buffer.byteLength(html, "utf8");
  for (let file of files) {
    if (!file.path || file.path === "index.html")
      return invalid(
        file.path
          ? html === null
            ? `files must not contain "index.html" \u2014 it is the Artifact type's page and can't be changed here`
            : 'files must not contain "index.html" \u2014 the page argument is the index'
          : "every file needs a non-empty path",
      );
    if (seenPaths.has(file.path))
      return invalid(
        `${jsonStringify(file.path)} is listed more than once in \`files\`. List each path once.`,
      );
    seenPaths.add(file.path);
    if (typeof file.content === "string" && !MANIFEST_TEXT_TYPES.has(file.contentType))
      return invalid(
        `file ${jsonStringify(file.path)}: contentType ${jsonStringify(file.contentType)} ` +
          "is binary \u2014 pass its content as a Buffer (raw bytes), not a string",
      );
    let isText = MANIFEST_TEXT_TYPES.has(file.contentType);
    let contentByteLength = getContentByteLength(file);
    let limit = isText ? MAX_ARTIFACT_BYTES : BINARY_FILE_MAX_BYTES;
    if (contentByteLength > limit)
      return tooLarge(
        `file ${jsonStringify(file.path)} is ${Math.ceil(contentByteLength / 1024 / 1024)}MB (per-file max ${limit / 1024 / 1024}MB${isText ? "" : " for binary files, which must fit an upload request base64-encoded"})`,
      );
    if (isText) {
      let base64 = typeof file.content === "string" ? file.content : file.content.toString("utf8");
      if (typeof file.content !== "string" && !Buffer.from(base64, "utf8").equals(file.content))
        return invalid(
          `file ${jsonStringify(file.path)}: contentType ${jsonStringify(file.contentType)} ` +
            "is a text type but the Buffer is not valid UTF-8 \u2014 fix the " +
            "encoding, or use a binary contentType",
        );
      let offset = base64.indexOf("\uFFFD");
      if (offset !== -1 || !isWellFormedString(base64))
        return invalid(
          `file ${jsonStringify(file.path)} ` +
            (offset !== -1
              ? `has the replacement character U+FFFD at ${lineColumnAt(base64, offset)}`
              : "holds an unpaired surrogate (half of a split character)") +
            " \u2014 replace it with the intended text" +
            (file.contentType === "text/html" ? " (in HTML, write an intended U+FFFD as &#xFFFD;)" : ""),
        );
    }
    if (isText && contentByteLength > MAX_REQUEST_WIRE_BYTES / 6) {
      let wireBytes = jsonBodyBytes(encodeManifestContent(file));
      if (wireBytes > MAX_REQUEST_WIRE_BYTES)
        return tooLarge(
          `file ${jsonStringify(file.path)} is ${Math.ceil(wireBytes / 1024 / 1024)}MB JSON-encoded on the wire (per-request max ${MAX_REQUEST_WIRE_BYTES / 1024 / 1024}MB) \u2014 ` +
            "heavily escaped text (quotes, backslashes, control characters) inflates when JSON-encoded; split or shrink the file",
        );
    }
    totalBytes += contentByteLength;
  }
  if (totalBytes > MANIFEST_REQUEST_BUDGET)
    return tooLarge(
      `total content is ${Math.ceil(totalBytes / 1024 / 1024)}MB \u2014 one publish may send at most ${MANIFEST_REQUEST_BUDGET / 1024 / 1024}MB. Nothing was published: send part of the files now and the rest with another publish to the same url (files left out of a later publish are kept; a version may total ${VERSION_TOTAL_BYTES / 1024 / 1024}MB).`,
    );
  return null;
}
//@ chunk-06y4szbn.js:116262-116402 placement
var COPY_FROM_DISABLED_TEXT =
  "copying files from another artifact is not enabled for this account \u2014 nothing was published; publish with local files instead";
//@ chunk-06y4szbn.js:116402-118123 placement
function copySourcesProblem(html, files, copied, removes) {
  if (copied.length === 0) return null;
  if (files.length + copied.length + removes.length + (html === null ? 0 : 1) > MAX_PATH_SEGMENT_LENGTH)
    return `This publish lists ${files.length + copied.length} ${plural(files.length + copied.length, "file")} (copies included)${removes.length > 0 ? ` and ${removes.length} ${plural(removes.length, "removal")}` : ""}${html === null ? "" : " plus the page"}, which is over the limit of ${MAX_PATH_SEGMENT_LENGTH} entries in one publish. Nothing was published: send at most ${MAX_PATH_SEGMENT_LENGTH - 1} files now and add the rest with another publish to the same url \u2014 files left out of a later publish are kept, and a version holds up to ${VERSION_MAX_ENTRIES} in all.`;
  let taken = new Set(["index.html", ...files.map((file) => file.path), ...removes]);
  let sources = new Set();
  for (let copy of copied) {
    if (!copy.path || copy.path === "index.html")
      return copy.path
        ? html === null
          ? `files must not contain "index.html" \u2014 it is the Artifact type's page and can't be changed here`
          : 'files must not contain "index.html" \u2014 the page argument is the index'
        : "every file needs a non-empty path";
    if (taken.has(copy.path))
      return `${jsonStringify(copy.path)} is listed more than once in \`files\` (once as a copy from another artifact). List each path once.`;
    taken.add(copy.path);
    if (!ARTIFACT_SLUG_RE.test(copy.from.slug) || !copy.from.path)
      return `file ${jsonStringify(copy.path)}: its source must name an artifact and a published path`;
    if (copy.from.path === "index.html")
      return `file ${jsonStringify(copy.path)}: another artifact's page (index.html) is not a copyable file \u2014 read it and publish your own content`;
    for (let path of [copy.path, copy.from.path]) {
      let contentType = contentTypeForPath(path);
      if (contentType !== undefined && MARKUP_WITHOUT_SVG_TYPES.has(baseMediaType(contentType)))
        return `file ${jsonStringify(copy.path)}: an HTML or XML document cannot be copied from another artifact \u2014 read it with action "read_file" and publish it as your own file`;
    }
    sources.add(`${copy.from.slug}@${copy.from.ver ?? ""}`);
  }
  if (sources.size > MAX_COPY_SOURCES)
    return `files copy from ${sources.size} source artifact versions; at most ${MAX_COPY_SOURCES} per publish`;
  return null;
}
//@ chunk-06y4szbn.js:118123-118323 placement
function filesOnlyPublishProblem(files, copied) {
  let problem = validateSupportingFiles(files, "file");
  if (problem !== null) return problem.err;
  if (copied.length > 0 && !isFrameCopyFromEnabled()) {
    logFeatureBad("artifact_publish", "copy_from_flag_off", {
      n_copied: copied.length,
    });
    return COPY_FROM_DISABLED_TEXT;
  }
  return validateFileLists(null, files, [])?.msg ?? copySourcesProblem(null, files, copied, []);
}
//@ chunk-06y4szbn.js:118323-120256 placement
async function publishInstanceFiles(files, options) {
  if (getArtifactPublishStubDir() !== null)
    return publishError(
      "publishing to an Artifact created from an Artifact type is not available in eval stub mode",
    );
  let copiedFiles = options.copiedFiles ?? [];
  if (!(getLiveState().frozenArtifactTypes?.typesOn ?? isFrameMultiFileEnabled())) {
    let removeFiles = options.removeFiles ?? [];
    logFeatureBad("artifact_publish", "multifile_flag_off", {
      n_files: files.length + copiedFiles.length,
      n_removed: removeFiles.length,
    });
    return publishError(
      "This artifact was created from an artifact type, so it takes supporting files only, and " +
        (removeFiles.length > 0
          ? "its files can't be changed from this session. Nothing was published or removed; the artifact is unchanged."
          : "supporting files can't be published from this session. Nothing was published; the artifact is unchanged."),
    );
  }
  if (copiedFiles.length > 0 && !isFrameCopyFromEnabled()) {
    logFeatureBad("artifact_publish", "copy_from_flag_off", {
      n_copied: copiedFiles.length,
    });
    return publishError(COPY_FROM_DISABLED_TEXT);
  }
  let fileProblem = validateSupportingFiles(files, "file");
  if (fileProblem !== null) return fileProblem;
  let carry = await checkHostGrantCarry({
    slug: options.slug,
    hostGrant: readHostGrant(env.CLAUDE_ARTIFACT_HOST_GRANT),
    storedCaps: undefined,
    signal: options.signal,
    credentials: options.credentials,
    lane: "files",
  });
  if (!carry.ok) return publishError(carry.err);
  let fields = {
    slug: options.slug,
    title: options.title,
    favicon: options.favicon,
    ...(options.label !== undefined && {
      label: options.label,
    }),
    ...(options.note !== undefined && {
      note: options.note,
    }),
    ...(options.deadline !== undefined && {
      deadline: options.deadline,
    }),
    ...(options.requestId !== undefined && {
      requestId: options.requestId,
    }),
    ...(options.description !== undefined && {
      description: options.description,
    }),
    ...(options.publishContext !== undefined && {
      publishContext: options.publishContext,
    }),
    ...(options.originMetadata !== undefined && {
      originMetadata: options.originMetadata,
    }),
    ...(options.autoEditAttribution && {
      autoEditAttribution: options.autoEditAttribution,
    }),
  };
  return withPublishInFlight(options.ownPublishes, options.slug, () =>
    readBackAfterPublish(
      sendFilesPublish(
        null,
        files,
        copiedFiles,
        options.removeFiles ?? [],
        fields,
        {},
        {
          baseVersion: options.baseVersion,
          force: options.force,
          ownPublishes: options.ownPublishes,
          tele: {
            t0: performance.now(),
            pageBytes: 0,
            lane: "inline",
            isRedeploy: true,
            hasCaps: false,
            forced: options.force,
            ...(options.baseRebase !== undefined && {
              baseRebase: options.baseRebase,
            }),
          },
          ...(options.copiedCrossOrgOk === true && {
            copiedCrossOrgOk: true,
          }),
          ...(options.preconditions !== undefined && {
            preconditions: options.preconditions,
          }),
          onRetry: options.onRetry,
          signal: options.signal,
          credentials: options.credentials,
        },
      ),
      options.slug,
      options.credentials,
      options.signal,
    ),
  );
}
//@ chunk-06y4szbn.js:120256-121268 placement
async function publishLiveDocVersion(request) {
  if (getArtifactPublishStubDir() !== null) return publishError("invalid publish options");
  if (!isFrameMultiFileEnabled()) {
    logFeatureBad("artifact_publish", "multifile_flag_off", {
      n_files: 0,
      n_removed: 0,
    });
    return publishError("invalid publish options");
  }
  if (![...request.base.values()].some((file) => file.live === true))
    return publishError("invalid publish options");
  let carry = await checkHostGrantCarry({
    slug: request.slug,
    hostGrant: readHostGrant(env.CLAUDE_ARTIFACT_HOST_GRANT),
    storedCaps: undefined,
    signal: request.signal,
    credentials: request.credentials,
    lane: "page",
  });
  if (!carry.ok) return publishError(carry.err);
  let fields = {
    slug: request.slug,
    title: request.title,
    favicon: request.favicon,
    ...(request.label !== undefined && {
      label: request.label,
    }),
    ...(request.deadline !== undefined && {
      deadline: request.deadline,
    }),
    ...(request.requestId !== undefined && {
      requestId: request.requestId,
    }),
    ...(request.publishContext !== undefined && {
      publishContext: request.publishContext,
    }),
  };
  return withPublishInFlight(request.ownPublishes, request.slug, () =>
    sendFilesPublish(
      null,
      [],
      [],
      [],
      fields,
      {},
      {
        baseVersion: request.baseVersion,
        force: false,
        ownPublishes: request.ownPublishes,
        tele: {
          t0: performance.now(),
          pageBytes: 0,
          lane: "inline",
          isRedeploy: true,
          hasCaps: false,
          forced: false,
          liveFilesOn: true,
        },
        liveFiles: {
          detach: [],
          base: request.base,
        },
        onRetry: request.onRetry,
        signal: request.signal,
        credentials: request.credentials,
      },
    ),
  );
}
//@ chunk-06y4szbn.js:121268-147257 placement
/**
 * 发送多文件发布请求：清单构造、内容上传（直连/中继）、合并旧版本、留空文件与重试处理。
 */
async function sendFilesPublish(pageContent, files, copied, removedPaths, meta, extras, opts) {
  let { baseVersion, force, tele, onRetry, signal, credentials } = opts;
  let relayOnly = opts.relayOnly;
  let crossOrgOk = opts.copiedCrossOrgOk === true;
  let liveFiles = opts.liveFiles;
  let detach = liveFiles?.detach ?? [];
  let telemetryProps = {
    page_bytes: tele.pageBytes,
    lane: fromEnum(tele.lane),
    n_files: files.length + copied.length,
    n_copied: copied.length,
    n_removed: removedPaths.length,
    forced: tele.forced,
    template: fromEnum("plain"),
    is_redeploy: tele.isRedeploy,
    has_base_version: baseVersion !== undefined,
    reserved: false,
    ...getThumbnailCount(meta),
    ...(tele.baseRebase !== undefined && {
      base_rebase: fromEnum(tele.baseRebase),
    }),
  };
  let failClient = (msg) => {
    logFeatureBad("artifact_publish", "files_invalid", telemetryProps);
    return publishError(msg);
  };
  let failTooLarge = (msg) => {
    logFeatureBad("artifact_publish", "too_large", telemetryProps);
    return publishError(msg);
  };
  let mode =
    pageContent === null || (meta.slug !== undefined && baseVersion !== undefined) ? "patch" : "replace";
  if (removedPaths.length > 0 && mode === "replace")
    return failClient(
      meta.slug === undefined
        ? "A `null` entry in `files` removes a file from an existing artifact, and a first publish has nothing to remove, so nothing was published. Drop the `null` entries."
        : "A removal applies to the artifact's current version, and this publish didn't name that version (`baseVersion`), so nothing was published. Publish again with the version named, or without the `null` entries.",
    );
  if (liveFiles !== undefined && meta.slug !== undefined && mode === "replace")
    return failClient("invalid publish options");
  if (liveFiles?.page?.reseed === true && liveFiles.page.live !== undefined)
    return failClient("invalid publish options");
  let wantsLiveChanges =
    detach.length > 0 ||
    liveFiles?.page?.reseed === true ||
    liveFiles?.page?.live === false ||
    files.some((file) => file.reseed === true || file.live === false);
  if (wantsLiveChanges && mode === "replace") return failClient("invalid publish options");
  for (let file of files) {
    if (file.reseed === true && file.live !== undefined) return failClient("invalid publish options");
    if (
      (file.live === true || file.reseed === true) &&
      !HTML_CONTENT_TYPES.has(baseMediaType(file.contentType))
    )
      return failClient("invalid publish options");
    let baseEntry = liveFiles?.base?.get(file.path);
    if (
      liveFiles?.base !== undefined &&
      baseEntry?.live !== true &&
      (file.reseed === true || file.live === false)
    )
      return failClient("invalid publish options");
  }
  for (let removed of detach)
    if (liveFiles?.base !== undefined && liveFiles.base.get(removed)?.live !== true)
      return failClient("invalid publish options");
  if (
    liveFiles?.base !== undefined &&
    liveFiles.base.get("index.html")?.live !== true &&
    (liveFiles.page?.reseed === true || liveFiles.page?.live === false)
  )
    return failClient("invalid publish options");
  for (let removed of removedPaths)
    if (liveFiles?.base?.get(removed)?.live === true) return failClient("invalid publish options");
  let listProblem = validateFileLists(pageContent, files, [...removedPaths, ...detach]);
  if (listProblem !== null)
    return listProblem.kind === "too_large" ? failTooLarge(listProblem.msg) : failClient(listProblem.msg);
  let copyProblem = copySourcesProblem(pageContent, files, copied, [...removedPaths, ...detach]);
  if (copyProblem !== null) return failClient(copyProblem);
  for (let copy of copied)
    if (liveFiles?.base?.get(copy.path)?.live === true) return failClient("invalid publish options");
  let isUnchangedLive = (path, file) =>
    mode === "patch" &&
    liveFiles?.base?.get(path)?.live === true &&
    file.reseed !== true &&
    file.live !== false;
  let pageWillGoLive =
    wantsLiveChanges ||
    liveFiles?.page?.live === true ||
    files.some((file) => file.live === true) ||
    [...(liveFiles?.base?.values() ?? [])].some((entry) => entry.live);
  let needsPreconditions =
    mode === "patch" &&
    !force &&
    opts.preconditions === undefined &&
    (pageContent !== null || pageWillGoLive);
  let isSameAsBase = (path, content, contentType) => {
    let baseEntry = needsPreconditions ? liveFiles?.base?.get(path) : undefined;
    return (
      baseEntry !== undefined &&
      !baseEntry.live &&
      baseEntry.sha256 !== undefined &&
      baseEntry.contentType === contentType &&
      baseEntry.sha256 === computeContentHash(content)
    );
  };
  let unchangedPaths = [];
  let page = liveFiles?.page ?? {};
  let pageGoesDead = pageContent !== null && page.live === false;
  let deadPaths = pageGoesDead ? ["index.html", ...detach] : detach;
  let pageEntry;
  if (isUnchangedLive("index.html", page)) unchangedPaths.push("index.html");
  else if (
    pageContent !== null &&
    !pageGoesDead &&
    !(
      pageWillGoLive &&
      page.live === undefined &&
      page.reseed !== true &&
      isSameAsBase("index.html", pageContent, "text/html")
    )
  )
    pageEntry = {
      content: pageContent,
      contentType: "text/html",
      ...(page.live !== undefined && {
        live: page.live,
      }),
      ...(page.reseed === true && {
        reseed: true,
      }),
    };
  let manifest = Object.create(null);
  if (pageEntry !== undefined) manifest["index.html"] = pageEntry;
  let stagedFiles = [];
  let pageBytes = pageEntry?.content !== undefined ? jsonBodyBytes(pageEntry.content) : 0;
  let thumbnailBytes = thumbnailByteCount(meta.thumbnail) + thumbnailByteCount(meta.thumbnailDark);
  let budget = TEXT_FILE_MAX_BYTES - pageBytes - thumbnailBytes;
  let goesLive = (file) =>
    !isUnchangedLive(file.path, file) && (file.live === true || file.reseed === true || file.live === false);
  let inlineLive = Object.create(null);
  for (let file of files.filter(goesLive)) {
    let wire = encodeManifestContent(file);
    let wireBytes = jsonBodyBytes(wire);
    if (wireBytes > budget) {
      let remaining = TEXT_FILE_MAX_BYTES - pageBytes - budget;
      return failTooLarge("file too large");
    }
    budget -= wireBytes;
    inlineLive[file.path] = {
      content: wire,
      contentType: file.contentType,
      ...(file.live !== undefined && {
        live: file.live,
      }),
      ...(file.reseed === true && {
        reseed: true,
      }),
    };
    manifest[file.path] = inlineLive[file.path];
  }
  let toEncode = [];
  let filesOmitted = 0;
  for (let file of files) {
    if (goesLive(file)) continue;
    if (isUnchangedLive(file.path, file)) {
      unchangedPaths.push(file.path);
      continue;
    }
    if (file.live === undefined && isSameAsBase(file.path, file.content, file.contentType)) {
      filesOmitted += 1;
      continue;
    }
    toEncode.push(file);
  }
  let uploadWireBytes = 0;
  for (let file of toEncode) {
    let wire = encodeManifestContent(file);
    let wireBytes = jsonBodyBytes(wire);
    if (wireBytes <= budget) {
      budget -= wireBytes;
      uploadWireBytes += wireBytes;
      manifest[file.path] = {
        content: wire,
        contentType: file.contentType,
      };
    } else {
      let contentHash = computeContentHash(file.content);
      stagedFiles.push({
        f: file,
        sha: contentHash,
        wire,
      });
      manifest[file.path] = {
        sha256: contentHash,
        contentType: file.contentType,
      };
    }
  }
  for (let path of removedPaths) manifest[path] = null;
  for (let path of deadPaths)
    manifest[path] = {
      live: false,
    };
  let deployFlags = {
    liveKey:
      deadPaths.length > 0 ||
      Object.keys(inlineLive).length > 0 ||
      pageEntry?.live !== undefined ||
      pageEntry?.reseed === true,
    emptyPatch: pageWillGoLive && Object.keys(manifest).length === 0 && copied.length === 0,
    ldx: false,
  };
  let encodingStats;
  let onEncoding = (stats) => (encodingStats = stats);
  let onEncoding_2 = trackUploadBytes(telemetryProps);
  let sawDoubt = false;
  let postOnce = (body) =>
    deployWithRetry(
      (attempt) =>
        postDeploy(
          deployQuery(attempt, meta),
          body,
          credentials,
          onEncoding,
          onEncoding_2,
          attempt,
          relayOnly,
          signal,
        ).then(
          (result) => {
            sawDoubt = true;
            return result;
          },
          (error) => {
            if (!(error instanceof RelayOnlyUnsentError)) sawDoubt = true;
            throw error;
          },
        ),
      onRetry,
      signal,
      telemetryProps,
      false,
      typeof body.slug === "string",
      relayOnly !== undefined && meta.slug === undefined && !sawDoubt,
    );
  let hasPreconditions = false;
  let prepareManifest = (manifest) => {
    let deltas =
      mode === "patch" && !force && opts.preconditions !== undefined
        ? manifestDeltas(manifest, opts.preconditions)
        : undefined;
    hasPreconditions = deltas !== undefined;
    return deltas ?? manifest;
  };
  let publishFields = {
    ...publishMetadataFields(meta),
    ...entrypointHint(),
    ...sessionIdHint(),
    ...extras,
  };
  let droppedFields = {
    deadline: false,
    icon: false,
    request_id: false,
  };
  let deployWithDroppedFieldRetry = async (body) => {
    let result = await postOnce(body);
    for (
      let field = droppedFieldOn400(meta, result);
      field !== undefined && body[field] !== undefined;
      field = droppedFieldOn400(meta, result)
    ) {
      logFeatureSad("artifact_publish", `${field}_rejected`, telemetryProps);
      logForDebugging(`[artifact] ${field} refused upstream \u2014 retrying without it`);
      delete publishFields[field];
      meta = withoutField(meta, field);
      droppedFields[field] = true;
      let { [field]: dropped, ...rest } = body;
      body = rest;
      result = await postOnce(body);
    }
    return result;
  };
  let uploadBatchBytes = 15728640;
  let uploadBatches = [];
  {
    let batch = [];
    let batchBytes = 0;
    for (let item of stagedFiles) {
      let size = jsonBodyBytes(item.wire);
      if (batch.length > 0 && batchBytes + size > uploadBatchBytes) {
        uploadBatches.push(batch);
        batch = [];
        batchBytes = 0;
      }
      batch.push(item);
      batchBytes += size;
    }
    if (batch.length > 0) uploadBatches.push(batch);
  }
  let awaitRetryAfter = async (res) => {
    let delay = retryDelayMs(res);
    if (delay === undefined) return false;
    await sleep(delay, signal);
    if (signal?.aborted) {
      logForDebugging("[artifact] 429 retry cancelled by user");
      return false;
    }
    return true;
  };
  let capNoticeOf = (res) => {
    let notice = res.fromFrame && res.status === 429 ? dailyCapNotice(res.data) : undefined;
    if (notice)
      logFeatureBad("artifact_publish", "publish_cap_reached", {
        ...telemetryProps,
        cap_type: fromEnum(notice.capType),
      });
    return notice;
  };
  let mapped = copied.map((copy) => ({
    c: copy,
  }));
  let copiedStaged = [];
  let leftOut = [];
  let leaveOutState = {
    askedToLeaveOut: false,
  };
  let toWire = (item) =>
    "c" in item
      ? {
          path: item.c.path,
          from: {
            slug: item.c.from.slug,
            path: item.c.from.path,
            ...(item.c.from.ver !== undefined && {
              ver: item.c.from.ver,
            }),
          },
        }
      : {
          path: item.f.path,
          content: item.wire,
          contentType: item.f.contentType,
        };
  let uploadBatch = async (slug, items) => {
    let any = items.some((item) => "c" in item);
    let sendCrossOrg = crossOrgOk && any;
    let leaveOutField = any ? leaveOutMissingField() : {};
    let buildBody = () => ({
      slug,
      ...(sendCrossOrg && {
        cross_org_ok: true,
      }),
      ...leaveOutField,
      files: items.map(toWire),
    });
    let send = () =>
      postDeploy(
        "/api/frame/upload",
        buildBody(),
        credentials,
        onEncoding,
        onEncoding_2,
        {},
        relayOnly,
        signal,
      );
    let sendWithCapRetry = async () => {
      let res = await withPublishTiming(send);
      return res.ok &&
        res.fromFrame &&
        res.status === 429 &&
        dailyCapNotice(res.data) === undefined &&
        (await awaitRetryAfter(res.response?.headers?.["retry-after"]))
        ? withPublishTiming(send)
        : res;
    };
    let res = await sendWithCapRetry();
    let refusal =
      "leave_out_missing" in leaveOutField && res.ok && res.fromFrame && res.status === 400
        ? leaveOutMissingRefusal(res.data, buildBody())
        : undefined;
    if (refusal !== undefined && !signal?.aborted) {
      if (refusal === "named") {
        markLeaveOutMissingRefused();
        logFeatureSad("artifact_publish", "copy_leave_out_unsupported", telemetryProps);
      }
      leaveOutField = {};
      res = await sendWithCapRetry();
      if (refusal === "unnamed" && res.ok && res.fromFrame && isClientRefusalStatus(res.status, res.data)) {
        markLeaveOutMissingRefused();
        logFeatureSad("artifact_publish", "copy_leave_out_unsupported", telemetryProps);
      }
    }
    if (any) leaveOutState.askedToLeaveOut = "leave_out_missing" in leaveOutField;
    return res;
  };
  let describeManifestRefusal = (status, body, info) => {
    if (body) logForDebugging(`[artifact] manifest publish refused (HTTP ${status}): ${errBody(body)}`);
    let maybeGoneSuffix = info?.maybeGone
      ? ", or the artifact no longer exists or isn't yours to update"
      : "";
    if (removedPaths.length > 0)
      return publishError(
        `The server didn't accept this update's file changes (HTTP ${status})${maybeGoneSuffix}. Nothing was published or removed; the artifact is unchanged. Publishing the page on its own (omitting \`files\`) would update the page but can't remove a file.${info?.debris ?? ""}`,
      );
    let nothingSuffix = info?.debris
      ? " This publish didn't finish."
      : meta.slug !== undefined
        ? " Nothing was published; the artifact is unchanged."
        : " Nothing was published.";
    return publishError(
      `The server didn't accept this publish's supporting files (HTTP ${status})${maybeGoneSuffix}.${nothingSuffix} Publish the page as a single file instead: inline what it needs and omit \`files\`.${info?.debris ?? ""}`,
    );
  };
  let createdNote = "";
  let reservedSlug;
  let noteReserved = (slug) => {
    reservedSlug = slug;
    telemetryProps.reserved = true;
    createdNote = ` (A slug was reserved for it: publish again to slug ${slug} rather than publishing fresh.)`;
    opts.onReserved?.(slug);
  };
  if (meta.slug === undefined && opts.reservedSlug !== undefined) noteReserved(opts.reservedSlug);
  let isRateLimited = (res) => res.fromFrame && isRateLimitedResponse(res.status, res.data);
  let rateLimitedFailure = (res, step) => {
    logFeatureBad("artifact_publish", "rate_limited", {
      ...telemetryProps,
      refused_status: res.status,
      ...refusalReasonField(res.data),
    });
    return {
      ...publishError(
        rateLimitedResult({
          retryAfter: res.response?.headers?.["retry-after"],
          reservedSlug,
          ...(step !== undefined && {
            refusedStep: step,
          }),
        }),
      ),
      transient: "rate_limited",
    };
  };
  let cancelled = () => publishError(`publish cancelled \u2014 nothing more was sent.${createdNote}`);
  try {
    let slug = meta.slug ?? opts.reservedSlug;
    let version;
    let deployResult;
    let baseVersionUsed = baseVersion;
    let preflight = async (slug, shas) => {
      let body = {
        ...(slug !== undefined && {
          slug,
        }),
        ...(shas.length > 0 && {
          shas,
        }),
        ...(slug === undefined && entrypointHint()),
      };
      let requestOptions = {
        refreshOAuth: true,
        headers: buildFrameHeaders(),
        timeout: 30000,
        credentials,
        relayOnCredentialRefusal: true,
      };
      let sendPrepare = async () => {
        if (relayOnly === undefined) return frameApi.post("/api/frame/deploy/prepare", body, requestOptions);
        return postRelayOnlyWithBusyWait(
          "/api/frame/deploy/prepare",
          body,
          requestOptions,
          relayOnly,
          signal,
        );
      };
      let res = await withPublishTiming(sendPrepare);
      if (
        res.ok &&
        res.fromFrame &&
        res.status === 429 &&
        dailyCapNotice(res.data) === undefined &&
        (await awaitRetryAfter(res.response?.headers?.["retry-after"]))
      )
        res = await withPublishTiming(sendPrepare);
      return res;
    };
    let slugOf = (data) =>
      typeof data?.slug === "string" && ARTIFACT_SLUG_RE.test(data.slug) ? data.slug : undefined;
    let deployed = false;
    let preflightDone = false;
    let manifestNeeded = meta.slug !== undefined && !(needsPreconditions && liveFiles?.base !== undefined);
    let needsUpload =
      stagedFiles.length > 0 ||
      mapped.length > 0 ||
      (manifestNeeded && uploadWireBytes > MANIFEST_UPLOAD_THRESHOLD_BYTES);
    if (needsUpload) {
      let mapped_2 = toEncode.map((file) => ({
        f: file,
        sha: computeContentHash(file.content),
        wire: encodeManifestContent(file),
      }));
      let prepareFailure;
      let lastRefusalBody = "";
      for (let idx = 0; idx < 2; idx++) {
        if (signal?.aborted) return cancelled();
        let prepareRes = await preflight(
          slug,
          mapped_2.map((item) => item.sha),
        );
        if (signal?.aborted) {
          let reservedOnAbort =
            createdNote === "" && slug === undefined && prepareRes.ok && prepareRes.status === 200
              ? slugOf(prepareRes.data)
              : undefined;
          if (reservedOnAbort !== undefined) noteReserved(reservedOnAbort);
          return cancelled();
        }
        if (!prepareRes.ok) {
          prepareFailure = {
            status: 0,
            why:
              prepareRes.reason === "no-auth"
                ? describeArtifactAuthFailure(prepareRes.detail)
                : `preflight unavailable: ${prepareRes.reason}`,
          };
          break;
        }
        if (prepareRes.status === 404) {
          if (isFrameNotFoundBody(prepareRes.data)) {
            logFeatureBad("artifact_publish", "prepare_not_found", telemetryProps);
            return {
              ...publishError(
                "the server does not recognize this artifact for updating (it may no longer exist or may not be yours to update). The files were NOT published.",
              ),
              ...(meta.slug !== undefined && {
                gone: true,
              }),
            };
          }
          prepareFailure = {
            status: 404,
            why: "the preflight route answered 404",
          };
          break;
        }
        let capNotice = capNoticeOf(prepareRes);
        if (capNotice)
          return publishError(
            createdNote
              ? `${capNotice.message} \u2014 this publish didn't finish; try again after the reset.${createdNote}`
              : `${capNotice.message} \u2014 nothing was published; try again after the reset.`,
          );
        if (isRateLimited(prepareRes)) {
          if (mapped.length > 0 || stagedFiles.length > 0 || preflightDone)
            return rateLimitedFailure(
              prepareRes,
              mapped.length > 0 ? copyPreflightFailure(mapped.length) : undefined,
            );
          logForDebugging("[artifact] preflight rate-limited \u2014 sending the one inline deploy instead");
          prepareFailure = {
            status: 429,
            why: "the preflight was rate-limited",
          };
          break;
        }
        if (prepareRes.status !== 200) {
          prepareFailure = {
            status: prepareRes.status,
            why: prepareRes.fromFrame
              ? `preflight ${prepareRes.status}: ${errBody(prepareRes.data)}`
              : `preflight relay HTTP ${prepareRes.status}`,
          };
          break;
        }
        let preparedSlug = slugOf(prepareRes.data);
        let missing = prepareRes.data?.missing;
        if (
          preparedSlug === undefined ||
          !Array.isArray(missing) ||
          !missing.every((sha) => typeof sha === "string" && /^[0-9a-f]{64}$/.test(sha))
        ) {
          prepareFailure = {
            status: 200,
            why: "a malformed preflight answer",
          };
          break;
        }
        if (slug !== undefined && preparedSlug !== slug) {
          logFeatureBad("artifact_publish", "prepare_slug_mismatch", telemetryProps);
          return publishError(
            "the server answered the upload preflight for a different " + "artifact \u2014 not publishing.",
          );
        }
        preflightDone = true;
        slug = preparedSlug;
        if (meta.slug === undefined) noteReserved(slug);
        let missingSet = new Set(missing);
        let filtered = mapped_2.filter((item) => missingSet.has(item.sha));
        let missingBatches = [];
        {
          let batch = [];
          let batchBytes = 0;
          for (let item of filtered) {
            let size = jsonBodyBytes(item.wire);
            if (batch.length > 0 && batchBytes + size > uploadBatchBytes) {
              missingBatches.push(batch);
              batch = [];
              batchBytes = 0;
            }
            batch.push(item);
            batchBytes += size;
          }
          if (batch.length > 0) missingBatches.push(batch);
        }
        for (let batch of missingBatches) {
          if (signal?.aborted) return cancelled();
          let res = await uploadBatch(slug, batch);
          if (!res.ok) {
            logFeatureBad("artifact_publish", res.reason, telemetryProps);
            return publishError(
              res.reason === "no-auth"
                ? describeArtifactAuthFailure(res.detail) + createdNote
                : `upload unavailable: ${res.reason}. The publish was NOT completed; retry publishing to slug ${slug}.`,
            );
          }
          if (res.status !== 200) {
            let capNotice = capNoticeOf(res);
            if (capNotice)
              return publishError(
                `${capNotice.message} \u2014 this publish didn't finish. ` +
                  `Publish again to slug ${slug} after the reset.`,
              );
            if (isRateLimited(res)) return rateLimitedFailure(res);
            logFeatureBad(
              "artifact_publish",
              res.fromFrame ? "prepare_upload_failed" : "prepare_upload_relay_error",
              {
                ...telemetryProps,
                upload_status: res.status,
              },
            );
            return publishError(
              (res.fromFrame
                ? `file upload ${res.status} after the preflight: ${errBody(res.data)}`
                : `file upload failed after the preflight (relay HTTP ${res.status})`) +
                ` \u2014 the publish was NOT completed. Retry publishing to slug ${slug}.`,
            );
          }
        }
        if (mapped.length > 0) {
          if (signal?.aborted) return cancelled();
          let res = await uploadBatch(slug, mapped);
          if (!res.ok) {
            logFeatureBad("artifact_publish", res.reason, telemetryProps);
            return publishError(
              res.reason === "no-auth"
                ? describeArtifactAuthFailure(res.detail) + createdNote
                : `copying files from another artifact unavailable: ${res.reason}. The publish was NOT completed; retry publishing to slug ${slug}.`,
            );
          }
          if (res.status !== 200) {
            let capNotice = capNoticeOf(res);
            if (capNotice)
              return publishError(
                `${capNotice.message} \u2014 this publish didn't finish. Publish again to slug ${slug} after the reset.`,
              );
            if (isRateLimited(res))
              return rateLimitedFailure(
                res,
                copiedFilesSummary(
                  mapped.map(({ c: copy }) => ({
                    path: copy.path,
                    fromSlug: copy.from.slug,
                  })),
                ),
              );
            let predatesCrossOrg =
              crossOrgOk &&
              res.fromFrame &&
              res.status === 400 &&
              isUnknownFieldErrorFor(res.data, "cross_org_ok");
            logFeatureBad(
              "artifact_publish",
              predatesCrossOrg
                ? "copy_predates_cross_org"
                : res.fromFrame
                  ? "copy_upload_failed"
                  : "copy_upload_relay_error",
              {
                ...telemetryProps,
                upload_status: res.status,
              },
            );
            let body = errBody(res.data);
            let match = /^files\[(\d+)\]: (.*)$/.exec(body);
            let copy = match !== null ? mapped[Number(match[1])]?.c : undefined;
            let reason = match !== null ? match[2] : body;
            let sourceNotFound =
              res.fromFrame && copy !== undefined && /not found/.test(reason) ? copy : undefined;
            let sourceHint =
              " \u2014 the source artifact doesn't exist, this account can't open it, or it can't be copied from (all three get the same answer)";
            if (predatesCrossOrg)
              return publishError(
                "copying files from another organization's artifact isn't available on this server yet, so nothing was published. Don't retry the copy. Publish without the copied file instead, or tell the user cross-organization copies aren't supported yet.",
              );
            return {
              ...publishError(
                (res.fromFrame
                  ? copy !== undefined
                    ? `copying ${jsonStringify(copy.path)} from artifact ${copy.from.slug} (${jsonStringify(copy.from.path)}) was refused (${res.status}: ${reason})${sourceNotFound !== undefined ? sourceHint : ""}`
                    : res.status === 404
                      ? "the server does not recognize this artifact for staging copied files (it may no longer exist, may not be yours to update, or copying is not enabled on this path)"
                      : `staging the copied files was refused (${res.status}: ${body})`
                  : `staging the copied files failed (relay HTTP ${res.status})`) +
                  ` \u2014 the publish was NOT completed. Retry publishing to slug ${slug} once the cause is fixed.`,
              ),
              ...(sourceNotFound !== undefined && {
                copySourceNotFound: sourceNotFound,
              }),
            };
          }
          let incompleteEcho = () =>
            publishError(
              `the server staged the copied files but its answer was incomplete, so nothing was published \u2014 retry publishing to slug ${slug}.${createdNote}`,
            );
          let files = res.data?.files;
          if (!Array.isArray(files) || files.length !== mapped.length) {
            logFeatureBad("artifact_publish", "copy_echo_malformed", telemetryProps);
            return incompleteEcho();
          }
          let accepted = [];
          let leftOutFiles = [];
          for (let [idx, copy] of mapped.entries()) {
            let echo = files[idx];
            if (echo?.leftOut !== undefined) {
              if (
                !leaveOutState.askedToLeaveOut ||
                typeof echo.leftOut !== "string" ||
                echo.leftOut === "" ||
                echo.sha256 !== undefined ||
                echo.size !== undefined ||
                echo.contentType !== undefined ||
                (echo.path !== undefined && echo.path !== copy.c.path)
              ) {
                logFeatureBad("artifact_publish", "copy_echo_malformed", telemetryProps);
                return incompleteEcho();
              }
              leftOutFiles.push({
                file: copy.c,
                why: echo.leftOut,
              });
              continue;
            }
            if (
              typeof echo?.sha256 !== "string" ||
              !/^[0-9a-f]{64}$/.test(echo.sha256) ||
              typeof echo.contentType !== "string" ||
              !MANIFEST_SERVABLE_TYPES.has(echo.contentType)
            ) {
              logFeatureBad("artifact_publish", "copy_echo_malformed", telemetryProps);
              return incompleteEcho();
            }
            copy.sha = echo.sha256;
            copy.contentType = echo.contentType;
            accepted.push(copy);
          }
          copiedStaged = accepted;
          leftOut = leftOutFiles;
          let isFirstPublish = meta.slug === undefined && opts.reservedSlug === undefined;
          if (
            leftOutFiles.length > 0 &&
            !isAddOnlyPublish({
              mode,
              isFirstPublish,
              removedCount: removedPaths.length,
            })
          ) {
            let leftOutTelemetry = {
              ...telemetryProps,
              n_left_out: leftOutFiles.length,
            };
            if (removedPaths.length > 0) {
              logFeatureBad("artifact_publish", "copy_left_out_removes_files", leftOutTelemetry);
              return publishError(allFilesLeftOutMessage(leftOutFiles, "removes_files") + createdNote);
            }
            logFeatureBad("artifact_publish", "copy_left_out_replaces_files", leftOutTelemetry);
            return publishError(allFilesLeftOutMessage(leftOutFiles, "replaces_files") + createdNote);
          }
          let filtered = copiedStaged.filter((item) =>
            MARKUP_WITHOUT_SVG_TYPES.has(baseMediaType(item.contentType ?? "")),
          );
          if (filtered.length > 0) {
            logFeatureBad("artifact_publish", "copy_refused_document", telemetryProps);
            return publishError(
              `copied file ${jsonStringify(filtered[0].c.path)} is ${filtered[0].contentType}: a page or XML document cannot be copied from another artifact into a publish (its content must pass this tool's checks, which a server-side copy skips) \u2014 read it with action "read_file" and publish it from the local copy instead. Nothing was published.${createdNote}`,
            );
          }
          let isSvgPath = (path) => contentTypeForPath(path) === SVG_CONTENT_TYPE;
          let isSvgType = (contentType) => baseMediaType(contentType ?? "") === SVG_CONTENT_TYPE;
          let filtered_2 = copiedStaged.filter(
            (item) => !isSvgType(item.contentType) && (isSvgPath(item.c.path) || isSvgPath(item.c.from.path)),
          );
          if (filtered_2.length > 0) {
            logFeatureBad("artifact_publish", "copy_refused_svg_mismatch", telemetryProps);
            let mapped = filtered_2
              .slice(0, 20)
              .map((item) => `${jsonStringify(item.c.path)} (${item.contentType})`);
            let moreCount = filtered_2.length - mapped.length;
            let isSingle = filtered_2.length === 1;
            let renameHint = filtered_2.every((item) => !isSvgPath(item.c.from.path))
              ? `copy ${isSingle ? "it" : "each"} to a path that does not end .svg, or `
              : "";
            return publishError(
              `copied ${plural(filtered_2.length, "file")} ${mapped.join(", ")}${moreCount > 0 ? ` and ${moreCount} more` : ""}: a file copied to or from a name ending .svg must be stored as an SVG image \u2014 ${renameHint}read ${isSingle ? "it" : "each"} with action "read_file" and publish it from the local copy instead. Nothing was published.${createdNote}`,
            );
          }
          let found = copiedStaged.find((item) => isSvgType(item.contentType) && !isSvgPath(item.c.path));
          if (found !== undefined) {
            logFeatureBad("artifact_publish", "copy_refused_svg_mismatch", telemetryProps);
            return publishError(
              `copied file ${jsonStringify(found.c.path)} is ${found.contentType}: an SVG image is copied only to a name ending .svg \u2014 copy it to a path ending .svg, or read it with action "read_file" and publish it from the local copy instead. Nothing was published.${createdNote}`,
            );
          }
          let isScriptPath = (path) =>
            SCRIPT_CONTENT_TYPES.has(baseMediaType(contentTypeForPath(path) ?? ""));
          let scriptMismatch =
            pageContent === null
              ? copiedStaged.find(
                  (item) =>
                    SCRIPT_CONTENT_TYPES.has(baseMediaType(item.contentType ?? "")) &&
                    !isScriptPath(item.c.path) &&
                    !isScriptPath(item.c.from.path),
                )
              : undefined;
          if (scriptMismatch !== undefined) {
            logFeatureBad("artifact_publish", "copy_refused_script", telemetryProps);
            return publishError(
              `copied file ${jsonStringify(scriptMismatch.c.path)} is ${scriptMismatch.contentType}: a script its source stores under a name that does not say so cannot be copied into an artifact made from a type (the approval counted it as data) \u2014 copy it to a path with a script extension, or read it with action "read_file" and publish it from the local copy instead. Nothing was published.${createdNote}`,
            );
          }
        }
        if (signal?.aborted) return cancelled();
        let manifestWithStaged = Object.create(null);
        if (pageEntry !== undefined) manifestWithStaged["index.html"] = pageEntry;
        for (let [key, value] of Object.entries(inlineLive)) manifestWithStaged[key] = value;
        for (let item of mapped_2)
          manifestWithStaged[item.f.path] = {
            sha256: item.sha,
            contentType: item.f.contentType,
          };
        for (let item of copiedStaged)
          manifestWithStaged[item.c.path] = {
            sha256: item.sha,
            contentType: item.contentType,
          };
        for (let path of removedPaths) manifestWithStaged[path] = null;
        for (let path of deadPaths)
          manifestWithStaged[path] = {
            live: false,
          };
        if (leftOut.length > 0 && Object.keys(manifestWithStaged).length === 0) {
          logFeatureBad("artifact_publish", "copy_left_out_no_other_file", {
            ...telemetryProps,
            n_left_out: leftOut.length,
          });
          return publishError(allFilesLeftOutMessage(leftOut, "no_other_file") + createdNote);
        }
        let res = await deployWithDroppedFieldRetry({
          ...publishFields,
          slug,
          ...(force && {
            force: true,
          }),
          ...(baseVersion && {
            baseVersion,
          }),
          manifest: prepareManifest(manifestWithStaged),
          mode,
        });
        let refusalReason = res.ok ? refusalReasonOf(res.data) : undefined;
        if (
          res.ok &&
          res.fromFrame &&
          res.status === 422 &&
          idx === 0 &&
          (refusalReason === "content_pending" ||
            (refusalReason === undefined &&
              !isTypeFileRefusal(res.data) &&
              !TYPE_INSTANCE_TEXT_RE.test(publishDeniedReason(res.data, 300)) &&
              !(deployFlags.liveKey && typeof res.data === "string")))
        ) {
          lastRefusalBody = errBody(res.data);
          continue;
        }
        if (res.ok && res.status === 200 && !res.data?.version) {
          logFeatureBad("artifact_publish", "prepare_no_version", telemetryProps);
          return publishError(malformedDeployResponse() + createdNote);
        }
        deployResult = res;
        deployed = true;
        break;
      }
      if (mapped.length > 0 && !deployed && !preflightDone) {
        logFeatureBad("artifact_publish", "copy_no_preflight", {
          ...telemetryProps,
          prepare_status: prepareFailure?.status ?? 0,
        });
        return publishError(
          `copying files from another artifact needs the upload preflight, which was unavailable here (${prepareFailure?.why ?? "no answer"}) \u2014 nothing was published.${createdNote}`,
        );
      }
      if (preflightDone && !deployed) {
        logFeatureBad("artifact_publish", "prepare_rerun_failed", {
          ...telemetryProps,
          prepare_status: prepareFailure?.status ?? 0,
        });
        return publishError(
          `the deploy was refused (422: ${lastRefusalBody}), and re-checking with the server before re-sending failed (${prepareFailure?.why ?? "no answer"}) \u2014 the publish was NOT ` +
            `completed. Retry publishing to slug ${slug}.`,
        );
      }
    } else if (slug === undefined) {
      if (signal?.aborted) return cancelled();
      let reserveRes;
      let why = "no answer";
      let failureTelemetry;
      let relayUnsent = false;
      try {
        reserveRes = await preflight(undefined, []);
      } catch (error) {
        if (error instanceof RelayOnlyCancelledError) throw error;
        relayUnsent = error instanceof RelayOnlyUnsentError;
        why = errBody(error instanceof Error ? error.message : String(error));
        failureTelemetry = publishErrorTelemetry(error, tele.t0);
      }
      let slugValue = reserveRes?.ok && reserveRes.status === 200 ? slugOf(reserveRes.data) : undefined;
      if (slugValue !== undefined) {
        slug = slugValue;
        noteReserved(slugValue);
      }
      if (signal?.aborted) return cancelled();
      if (slugValue === undefined) {
        let capNotice = reserveRes?.ok ? capNoticeOf(reserveRes) : undefined;
        if (capNotice)
          return publishError(
            `${capNotice.message} \u2014 nothing was published; try again after the reset.`,
          );
        if (!relayUnsent && (!reserveRes?.ok || (reserveRes.status !== 403 && reserveRes.status !== 404)))
          logFeatureSad("artifact_publish", "reserve_unavailable", {
            ...telemetryProps,
            reserve_status: reserveRes?.ok ? reserveRes.status : 0,
            ...failureTelemetry,
          });
        logForDebugging(
          `[artifact] could not reserve a slug before publishing (${reserveRes === undefined ? why : reserveRes.ok ? `HTTP ${reserveRes.status}` : reserveRes.reason}); publishing without one \u2014 the server assigns it`,
        );
      }
    }
    let embeds;
    let warnings = [];
    let echoExtras = {};
    if (!deployed && stagedFiles.length > 0 && !slug) {
      let inlineManifest = Object.create(null);
      for (let [key, value] of Object.entries(manifest))
        if (value !== null && "content" in value && value.content !== undefined) inlineManifest[key] = value;
      if (signal?.aborted) return cancelled();
      let res = await deployWithDroppedFieldRetry({
        ...publishFields,
        ...(force && {
          force: true,
        }),
        manifest: inlineManifest,
        mode: "replace",
      });
      if (!res.ok) {
        logFeatureBad("artifact_publish", res.reason, telemetryProps);
        return publishError(`publish unavailable: ${res.reason}`);
      }
      if (!res.fromFrame) {
        logFeatureBad("artifact_publish", "relay_error", {
          ...telemetryProps,
          deploy_status: res.status,
        });
        return publishError(relayHttpUnknown(res.status));
      }
      if (res.status === 400 || res.status === 404) {
        let body = formatFrameErrorBody(res.data);
        if (res.status === 400 && isUnknownLiveFieldError(body, deployFlags)) {
          logFeatureBad("artifact_publish", "live_files_unsupported", telemetryProps);
          return publishError(deploy400Message(body, deployFlags.emptyPatch));
        }
        if (res.status === 400 && isIgnorable400(body, deployFlags)) {
          logFeatureBad("artifact_publish", "ldx_unsupported", telemetryProps);
          return publishError(deploy400Fallback(body));
        }
        if (res.status === 404 || (UNKNOWN_FIELD_ERROR_RE.test(body) && MANIFEST_FIELD_RE.test(body))) {
          logFeatureBad("artifact_publish", "multifile_unsupported", telemetryProps);
          return describeManifestRefusal(res.status, body);
        }
      }
      if (res.status !== 200) {
        let classification = classifyPublishResponse(
          res.status,
          res.data,
          tele.isRedeploy,
          tele.echoedPin !== undefined
            ? {
                pin: tele.echoedPin,
                declaredCaps: tele.hasCaps,
              }
            : undefined,
          tele.liveFilesOn === true,
          tele.sent,
          {
            retryAfter: res.response?.headers?.["retry-after"],
          },
        );
        if (classification.code !== "thumbnail_rejected")
          logFeatureBad("artifact_publish", classification.code ?? "deploy_failed", {
            ...telemetryProps,
            deploy_status: res.status,
            ...classification.extra,
          });
        return publishErrorResult(classification, `deploy ${res.status}: ${errBody(res.data)}`);
      }
      let parsed = publishResponseSchema().safeParse(res.data);
      if (!parsed.success) {
        logFeatureBad("artifact_publish", "deploy_incomplete", telemetryProps);
        return publishError(malformedDeployResponse());
      }
      slug = parsed.data.slug;
      version = parsed.data.version;
      embeds = renderEmbeds(res.data);
      warnings = renderWarnings(res.data);
      echoExtras = {
        contract: parsed.data.contract,
        preferredContract: parsed.data.preferredContract,
        capabilities: parsed.data.capabilities,
      };
      recordOwnPublish(opts.ownPublishes, slug, version, {
        merged: isMergedResponse(res.data),
      });
      createdNote = ` (The artifact was created with its inline files: to add the remaining files, fix the problem and publish again to slug ${slug}.)`;
    }
    if (!deployed && stagedFiles.length > 0) {
      if (slug === undefined) {
        logFeatureBad("artifact_publish", "deploy_incomplete", telemetryProps);
        return publishError("internal: no slug available for staged upload");
      }
      let stagedShas = new Set();
      for (let batch of uploadBatches) {
        if (signal?.aborted) return cancelled();
        let res = await uploadBatch(slug, batch);
        if (!res.ok) {
          logFeatureBad("artifact_publish", res.reason, telemetryProps);
          return publishError(`upload unavailable: ${res.reason}.${createdNote}`);
        }
        if (res.status === 404) {
          logFeatureBad("artifact_publish", "multifile_unsupported", telemetryProps);
          return describeManifestRefusal(404, "", {
            maybeGone: meta.slug !== undefined,
            debris: createdNote,
          });
        }
        if (res.status !== 200) {
          let capNotice = capNoticeOf(res);
          if (capNotice)
            return publishError(`${capNotice.message} \u2014 try again after the reset.${createdNote}`);
          if (isRateLimited(res) && version === undefined) return rateLimitedFailure(res);
          logFeatureBad("artifact_publish", res.fromFrame ? "upload_failed" : "upload_relay_error", {
            ...telemetryProps,
            upload_status: res.status,
          });
          return publishError(
            res.fromFrame
              ? `file upload ${res.status}: ${errBody(res.data)}.${createdNote}`
              : `file upload failed (relay HTTP ${res.status}).${createdNote}`,
          );
        }
        for (let file of res.data?.files ?? []) if (file.sha256) stagedShas.add(file.sha256);
      }
      let filtered = stagedFiles.filter((item) => !stagedShas.has(item.sha));
      if (filtered.length > 0) {
        logFeatureBad("artifact_publish", "upload_hash_mismatch", telemetryProps);
        return publishError(
          `file upload did not stage ${filtered.length} file(s) under the ` +
            "expected content hash \u2014 not publishing a manifest that would " +
            `reference unstaged content.${createdNote}`,
        );
      }
    }
    if (!deployed && stagedFiles.length > 0 && version !== undefined) {
      let stagedManifest = Object.create(null);
      for (let item of stagedFiles) {
        let entry = {
          sha256: item.sha,
          contentType: item.f.contentType,
        };
        manifest[item.f.path] = entry;
        stagedManifest[item.f.path] = entry;
      }
      if (signal?.aborted) return cancelled();
      baseVersionUsed = version;
      deployResult = await deployWithDroppedFieldRetry({
        ...publishFields,
        slug,
        manifest: stagedManifest,
        mode: "patch",
        baseVersion: version,
      });
    } else if (!deployed) {
      if (signal?.aborted) return cancelled();
      deployResult = await deployWithDroppedFieldRetry({
        ...publishFields,
        ...(slug && {
          slug,
        }),
        ...(force && {
          force: true,
        }),
        ...(baseVersion && {
          baseVersion,
        }),
        manifest: prepareManifest(manifest),
        mode,
      });
    }
    if (deployResult === undefined) {
      logFeatureBad("artifact_publish", "deploy_incomplete", telemetryProps);
      return publishError("internal: publish flow completed without a deploy");
    }
    if (!deployResult.ok) {
      logFeatureBad("artifact_publish", deployResult.reason, telemetryProps);
      return publishError(
        (deployResult.reason === "no-auth"
          ? describeArtifactAuthFailure(deployResult.detail)
          : `publish unavailable: ${deployResult.reason}`) + createdNote,
      );
    }
    if (!deployResult.fromFrame) {
      logFeatureBad("artifact_publish", "relay_error", {
        ...telemetryProps,
        deploy_status: deployResult.status,
      });
      return publishError(relayHttpUnknown(deployResult.status) + createdNote);
    }
    if (deployResult.status === 400 || deployResult.status === 404) {
      let body = formatFrameErrorBody(deployResult.data);
      if (deployResult.status === 400 && isUnknownLiveFieldError(body, deployFlags)) {
        logFeatureBad("artifact_publish", "live_files_unsupported", telemetryProps);
        return publishError(deploy400Message(body, deployFlags.emptyPatch) + createdNote);
      }
      if (deployResult.status === 400 && isIgnorable400(body, deployFlags)) {
        logFeatureBad("artifact_publish", "ldx_unsupported", telemetryProps);
        return publishError(deploy400Fallback(body) + createdNote);
      }
      let goneOnRedeploy =
        deployResult.status === 404 && tele.isRedeploy && isFrameNotFoundBody(deployResult.data);
      if (
        (deployResult.status === 404 && !goneOnRedeploy) ||
        (UNKNOWN_FIELD_ERROR_RE.test(body) && MANIFEST_FIELD_RE.test(body))
      ) {
        logFeatureBad("artifact_publish", "multifile_unsupported", telemetryProps);
        return describeManifestRefusal(deployResult.status, body, {
          maybeGone: deployResult.status === 404 && meta.slug !== undefined,
          debris: createdNote,
        });
      }
    }
    if (
      (baseVersion !== undefined || version !== undefined || isFrameBaseVersionEnabled()) &&
      deployResult.status === 409
    ) {
      let conflict =
        liveConflictOf(deployResult.data) ??
        (hasPreconditions
          ? preconditionConflictOf(
              deployResult.data,
              new Set([...Object.keys(manifest), ...copiedStaged.map((item) => item.c.path)]),
            )
          : null);
      if (conflict) {
        logFeatureBad("artifact_publish", "conflict", {
          ...telemetryProps,
          ...(tele.baseRebase !== undefined && {
            if_match_sent: hasPreconditions,
          }),
          ...(conflict.paths !== undefined && {
            conflict_reason: fromEnum("precondition_failed"),
            conflict_paths: conflict.paths.length,
          }),
        });
        return {
          url: null,
          slug: null,
          version: null,
          err:
            (conflict.paths !== undefined
              ? changedFilesConflictMessage(conflict, conflict.paths)
              : staleBaseConflictMessage(conflict)) + createdNote,
          conflict: true,
          conflictDetail: conflict,
        };
      }
    }
    if (deployResult.status !== 200) {
      let classification = classifyPublishResponse(
        deployResult.status,
        deployResult.data,
        tele.isRedeploy,
        tele.echoedPin !== undefined
          ? {
              pin: tele.echoedPin,
              declaredCaps: tele.hasCaps,
            }
          : undefined,
        tele.liveFilesOn === true,
        tele.sent,
        {
          retryAfter: deployResult.response?.headers?.["retry-after"],
          reservedSlug,
          created: reservedSlug === undefined && createdNote !== "",
        },
      );
      if (classification.code !== "thumbnail_rejected")
        logFeatureBad("artifact_publish", classification.code ?? "deploy_failed", {
          ...telemetryProps,
          deploy_status: deployResult.status,
          ...classification.extra,
        });
      let refusedPath =
        classification.code === "path_is_live" ? getErrnoPath_2(deployResult.data) : undefined;
      return {
        ...publishErrorResult(
          classification,
          `deploy ${deployResult.status}: ${errBody(deployResult.data)}`,
          classification.code === "rate_limited" && reservedSlug !== undefined ? "" : createdNote,
        ),
        ...(refusedPath !== undefined && {
          refusedLivePath: refusedPath,
        }),
        ...(meta.slug === undefined &&
          slug !== undefined &&
          version !== undefined && {
            created: {
              slug,
              version,
            },
          }),
      };
    }
    let parsed = publishResponseSchema().safeParse(deployResult.data);
    if (!parsed.success) {
      logFeatureBad("artifact_publish", "deploy_incomplete", telemetryProps);
      return publishError(malformedDeployResponse() + createdNote);
    }
    let { slug: slug_2, version: version_2, read, shared, kind } = parsed.data;
    if (slug && slug_2 !== slug) {
      logFeatureBad("artifact_publish", "deploy_slug_mismatch", telemetryProps);
      return publishError(wrongArtifactAnswer() + createdNote);
    }
    let liveDocs = renderDocs(deployResult.data);
    let mapped_2 = liveDocs?.map((doc) => doc.path);
    let docs = (mapped_2 ?? []).filter(
      (path) => (path === "index.html" ? pageEntry : inlineLive[path])?.live === true,
    );
    let docs_2 = (mapped_2 ?? []).filter(
      (path) => (path === "index.html" ? pageEntry : inlineLive[path])?.reseed === true,
    );
    let sliced = uniq([
      ...(leftOut.length > 0 ? [copiedFilesLeftOutNote(leftOut)] : []),
      ...warnings,
      ...renderWarnings(deployResult.data),
      ...embedsToDocs(docs),
      ...pinsToDocs(docs_2),
      ...docsToDocs(unchangedPaths.filter((path) => path !== "index.html")),
      ...(pageGoesDead ? emptyList() : []),
      ...warningsToDocs(
        detach,
        Object.keys(inlineLive).filter((key) => inlineLive[key]?.live === false),
      ),
      ...newWarnings(
        mapped_2?.filter((path) => !unchangedPaths.includes(path)),
        new Set([...Object.keys(manifest), ...copiedStaged.map((item) => item.c.path)]),
      ),
    ]).slice(0, READ_BACK_LIMITS);
    let included = unchangedPaths.includes("index.html");
    let embedsEcho = renderEmbeds(deployResult.data) ?? embeds;
    let intHeader = parseIntHeader(deployResult.response?.headers?.[X_FRAME_PUSH_REMAINING]);
    let pushResetAt = dailyResetFromHeader(deployResult.response?.headers?.date);
    let mergedFields = mergedChangesFields(
      parsed.data,
      force ? undefined : baseVersionUsed,
      new Set([...Object.keys(manifest), ...copiedStaged.map((item) => item.c.path), ...(mapped_2 ?? [])]),
    );
    recordOwnPublish(opts.ownPublishes, slug_2, version_2, {
      merged: isMergedResponse(deployResult.data),
    });
    let typeFields = typeInstanceFields(parsed.data);
    let successTelemetry = {
      ...telemetryProps,
      ...(copied.length > 0 && {
        n_left_out: leftOut.length,
      }),
      e2e_ms: Math.round(performance.now() - tele.t0),
      is_redeploy: tele.isRedeploy,
      has_caps: tele.hasCaps,
      push_remaining_seen: intHeader !== undefined,
      read_back_echoed: typeFields.readBackEchoed === true,
      staged_files: stagedFiles.length,
      files_omitted: filesOmitted,
      publish_path: fromEnum(deployed ? "preflight" : needsUpload ? "legacy" : "inline"),
      ...(tele.baseRebase !== undefined && {
        if_match_sent: hasPreconditions,
      }),
      ...mergedTelemetry(mergedFields.mergedOver),
    };
    if (leftOut.length > 0) logFeatureSad("artifact_publish", "copy_left_out", successTelemetry);
    else logFeatureOk("artifact_publish", successTelemetry);
    let manifestPaths = pageContent === null ? splitManifestPaths(deployResult.data) : undefined;
    return {
      url: artifactViewerUrl(slug_2),
      slug: slug_2,
      version: version_2,
      err: null,
      ...(intHeader !== undefined && {
        pushRemaining: intHeader,
        pushResetAt,
      }),
      ...(leftOut.length > 0 && {
        copiedLeftOut: leftOut.map((item) => item.file),
      }),
      ...(read !== undefined && {
        read,
      }),
      ...(shared !== undefined && {
        shared,
      }),
      ...publishEchoFields(parsed.data, publishFields.deadline !== undefined),
      ...mergedFields,
      ...(droppedFields.deadline && {
        deadlineDropped: true,
      }),
      ...(droppedFields.icon && {
        iconDropped: true,
      }),
      ...capabilitiesEchoFields(
        parsed.data.contract !== undefined
          ? parsed.data
          : {
              ...parsed.data,
              ...echoExtras,
            },
        extras,
      ),
      ...typeFields,
      ...(kind !== undefined && {
        kind,
      }),
      ...(sliced.length > 0 && {
        warnings: sliced,
      }),
      ...(embedsEcho !== undefined && {
        embeds: embedsEcho,
      }),
      ...(manifestPaths !== undefined && {
        manifestPaths,
      }),
      ...(mapped_2 !== undefined && {
        livePaths: mapped_2,
      }),
      ...(liveDocs !== undefined && {
        liveDocs,
      }),
      ...(docs.length > 0 && {
        bornLive: docs,
      }),
      ...(docs_2.length > 0 && {
        reseeded: docs_2,
      }),
      ...(included && {
        pageCarriedLive: true,
      }),
    };
  } catch (error) {
    if (error instanceof RelayOnlyUnsentError) {
      if (!sawDoubt && meta.slug === undefined)
        return error instanceof RelayOnlyCancelledError
          ? publishCancelledResult()
          : relayOnlyUnsentResult(telemetryProps);
      if (error instanceof RelayOnlyCancelledError)
        return publishError(
          outcomeUnknownMessage("the publish was cancelled before a later request of it went out") +
            createdNote,
        );
      logFeatureBad("artifact_publish", "relay_only_unsent_after_deploy", telemetryProps);
      return publishError(
        outcomeUnknownMessage("a later request could not go through the cloud session's gateway") +
          createdNote,
      );
    }
    if (!isRelayOnlyCancelled(error))
      logFeatureBad(
        "artifact_publish",
        error instanceof PublishTransportError ? "relay_request_error" : "request_error",
        {
          ...telemetryProps,
          ...publishErrorTelemetry(error, tele.t0),
          ...encodingStats,
        },
      );
    return publishError((error instanceof Error ? error.message : String(error)) + createdNote);
  }
}
//@ chunk-06y4szbn.js:147257-147335 placement
function artifactViewerUrl(slug) {
  return new URL(
    artifactViewerPath(slug),
    getArtifactHostOverride() ?? getOauthConfig().CLAUDE_AI_ORIGIN,
  ).toString();
}
export {
  MANIFEST_SERVABLE_TYPES,
  notServedFileExtra,
  MANIFEST_TEXT_TYPES,
  XML_CONTENT_TYPES,
  validateFileLists,
  copySourcesProblem,
  bufferToText,
  COPY_FROM_DISABLED_TEXT,
  publishFilesVersion,
  sendFilesPublish,
  artifactViewerUrl,
  PATCH_ERROR_PATTERNS,
  EMPTY_MANIFEST_RE,
  MANIFEST_REQUEST_BUDGET,
  MAX_COPY_SOURCES,
  filesOnlyPublishProblem,
  publishInstanceFiles,
  publishLiveDocVersion,
  VERSION_MAX_ENTRIES,
  VERSION_TOTAL_BYTES,
  BINARY_FILE_MAX_BYTES,
};
