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

//@ chunk-06y4szbn.js:103080-109169 placement
/**
 * 多文件 artifact 发布：写入/删除/复制文件、路径固定检查、预检、上传与缩略图，组装遥测。
 */
async function publishFilesVersion(
  e,
  n,
  fields,
  s,
  h,
  b,
  ownPublishes,
  credentials,
  createPath,
  onRetry,
  signal,
  k,
  V,
  L = undefined,
) {
  let q = {
    page_bytes: b.pageBytes,
    lane: fromEnum(b.lane),
    forced: b.forced,
    is_redeploy: b.isRedeploy,
    has_base_version: s !== undefined,
    ...(V !== undefined && {
      reserved: true,
    }),
    template: fromEnum("plain"),
    ...getThumbnailCount(n),
    ...(k !== undefined &&
      k.length > 0 && {
        n_files: k.length,
      }),
  };
  let W;
  if (createPath !== undefined && k !== undefined && k.length > 0) {
    let ie = validateFileLists(e, k, []);
    if (ie !== null) {
      logFeatureBad("artifact_publish", ie.kind, q);
      return publishError(ie.msg);
    }
    let Z = Object.create(null);
    Z["index.html"] = {
      content: e,
      contentType: "text/html",
      live: true,
    };
    let Oe = TEXT_FILE_MAX_BYTES - jsonBodyBytes(e);
    for (let ye of k) {
      let Ee = encodeManifestContent(ye);
      Oe -= jsonBodyBytes(Ee);
      if (Oe < 0) {
        logFeatureBad("artifact_publish", "too_large", q);
        return publishError("file too large");
      }
      Z[ye.path] = {
        content: Ee,
        contentType: ye.contentType,
        ...(ye.live === true && {
          live: true,
        }),
      };
    }
    W = Z;
  }
  let G = null;
  let P = "none";
  let j = !n.slug;
  let X;
  let onEncoding = trackUploadBytes(q);
  try {
    let ie = h;
    let Z = s;
    let Oe = false;
    let ye =
      V !== undefined
        ? {
            ...n,
            slug: V,
          }
        : n;
    logForDebugging(
      `[artifact] publish \u2192 ${createPath ?? "/api/frame/deploy/direct"}${W !== undefined ? ` (files: ${Object.keys(W).length})` : ""}`,
    );
    let Ee = true;
    let bt = () => {
      let se = Ee;
      Ee = false;
      return deployWithRetry(
        (ve) =>
          postDeploy(
            createPath ?? deployQuery(ve, n),
            {
              ...publishMetadataFields(ye),
              ...entrypointHint(),
              ...sessionIdHint(),
              ...fields,
              ...(createPath === undefined &&
                ie && {
                  force: true,
                }),
              ...(createPath === undefined &&
                Z && {
                  baseVersion: Z,
                }),
              ...(createPath === undefined &&
                Oe &&
                !Z &&
                ye.slug && {
                  expectUnpublished: true,
                }),
              ...(W !== undefined
                ? {
                    files: W,
                  }
                : {
                    content: e,
                  }),
            },
            credentials,
            (zt) => (X = zt),
            onEncoding,
            ve,
            L,
            signal,
          ),
        onRetry,
        signal,
        q,
        true,
        createPath === undefined && ye.slug !== undefined,
        se,
      );
    };
    let Xe = {
      deadline: false,
      icon: false,
      request_id: false,
    };
    let He = async () => {
      let se = await bt();
      for (let ve = droppedFieldOn400(ye, se); ve !== undefined; ve = droppedFieldOn400(ye, se)) {
        logFeatureSad("artifact_publish", `${ve}_rejected`, q);
        logForDebugging(`[artifact] ${ve} refused upstream \u2014 retrying without it`);
        ye = withoutField(ye, ve);
        Xe[ve] = true;
        se = await bt();
      }
      return se;
    };
    let Y = await He();
    if (ie && Y.ok && Y.fromFrame && Y.status === 400) {
      let se = formatFrameErrorBody(Y.data);
      if (
        UNKNOWN_FIELD_ERROR_RE.test(se) &&
        (/\bforce\b/.test(se) || (Z !== undefined && /\bbaseVersion\b/.test(se)))
      ) {
        logFeatureSad("artifact_publish", "force_field_rejected", q);
        logForDebugging("[artifact] CP rejected force/baseVersion as unknown \u2014 retrying without them");
        ie = false;
        Z = undefined;
        Y = await He();
      }
    }
    if (
      ie &&
      Z &&
      Y.ok &&
      Y.fromFrame &&
      Y.status === 400 &&
      /force and baseVersion are mutually exclusive/.test(formatFrameErrorBody(Y.data))
    ) {
      logFeatureSad("artifact_publish", "exclusivity_retry", q);
      logForDebugging(
        "[artifact] pre-relaxation CP rejected force+baseVersion \u2014 retrying without the precondition",
      );
      Z = undefined;
      Y = await He();
    }
    let De = (se) =>
      se.reason === "no-auth" ? describeArtifactAuthFailure(se.detail) : `publish unavailable: ${se.reason}`;
    if (!Y.ok) {
      logFeatureBad("artifact_publish", Y.reason, q);
      return publishError(De(Y));
    }
    G = Y.fromFrame ? strandedSlugFrom(Y.status, Y.data) : null;
    if (G && !j && G.slug !== n.slug) {
      logFeatureBad("artifact_publish", "deploy_slug_mismatch", q);
      return publishError(wrongArtifactAnswer());
    }
    if (G && G.kind === undefined && createPath === undefined && !signal?.aborted) {
      let se = backoffMs(2, Y.response?.headers?.["retry-after"]);
      logForDebugging(
        `[artifact] /deploy/direct 503 after commit (${G.slug}) \u2014 retrying against it in ${se}ms`,
      );
      onRetry?.({
        status: 503,
        attempt: 2,
        maxAttempts: 2,
        delayMs: se,
      });
      try {
        await sleep(se, signal);
        if (!signal?.aborted) {
          if (j) {
            ye = {
              ...ye,
              slug: G.slug,
            };
            Oe = G.live === undefined;
            ie = false;
          }
          if (G.live !== undefined) Z = G.live;
          P = "unknown";
          Ee = true;
          try {
            Y = await He();
          } catch (error) {
            if (!(error instanceof RelayOnlyUnsentError)) throw error;
            P = error instanceof RelayOnlyCancelledError ? "cancelled" : "unsent";
            return publishRetryNote(
              publishError(
                P === "cancelled" ? "publish cancelled" : "The publish failed with a server error (503)",
              ),
              G,
              j,
              P,
            );
          }
          P = "answered";
        }
      } finally {
        logFeatureSad("artifact_publish", "deploy_stranded_retried", {
          ...q,
          fresh_publish: j,
          deploy_final_status: P === "answered" && Y.ok ? Y.status : 0,
          ...(signal?.aborted && {
            cancelled: true,
          }),
        });
        onRetry?.({
          settled: true,
        });
      }
      if (!Y.ok) {
        logFeatureBad("artifact_publish", Y.reason, q);
        return publishRetryNote(publishError(De(Y)), G, j, P);
      }
    }
    if (!Y.fromFrame) {
      logFeatureBad("artifact_publish", "relay_error", {
        ...q,
        deploy_status: Y.status,
      });
      return publishRetryNote(publishError(relayHttpUnknown(Y.status)), G, j, P);
    }
    if (((Z ?? s) || Oe || isFrameBaseVersionEnabled()) && Y.status === 409) {
      let se = liveConflictOf(Y.data);
      if (se) {
        logFeatureBad("artifact_publish", "conflict", q);
        return publishRetryNote(
          {
            ...publishError(staleBaseConflictMessage(se)),
            conflict: true,
            conflictDetail: se,
          },
          G,
          j,
          P,
        );
      }
    }
    if (createPath !== undefined && Y.status === 404) {
      logFeatureBad("artifact_publish", "create_not_enabled", {
        ...q,
        deploy_status: 404,
      });
      return publishError("create endpoint not available (404) \u2014 nothing was created");
    }
    if (
      Y.status === 400 &&
      isIgnorable400(formatFrameErrorBody(Y.data), {
        ldx: false,
      })
    ) {
      logFeatureBad("artifact_publish", "ldx_unsupported", q);
      return publishRetryNote(publishError(deploy400Fallback(formatFrameErrorBody(Y.data))), G, j, P);
    }
    if (Y.status < 200 || Y.status >= 300) {
      let se = classifyPublishResponse(
        Y.status,
        Y.data,
        b.isRedeploy,
        b.echoedPin !== undefined
          ? {
              pin: b.echoedPin,
              declaredCaps: b.hasCaps,
            }
          : undefined,
        b.liveFilesOn === true,
        b.sent,
        {
          retryAfter: Y.response?.headers?.["retry-after"],
          reservedSlug: V,
          created: j && G !== null,
        },
      );
      if (se.code !== "thumbnail_rejected")
        logFeatureBad("artifact_publish", se.code ?? "deploy_failed", {
          ...q,
          deploy_status: Y.status,
          ...se.extra,
        });
      let ve = se.code === "path_is_live" ? getErrnoPath_2(Y.data) : undefined;
      return publishRetryNote(
        {
          ...publishErrorResult(se, `deploy ${Y.status}: ${errBody(Y.data)}`),
          ...(ve !== undefined && {
            refusedLivePath: ve,
          }),
        },
        G,
        j,
        P,
      );
    }
    let ze = publishResponseSchema().safeParse(Y.data);
    if (!ze.success) {
      logFeatureBad("artifact_publish", "deploy_incomplete", q);
      return publishRetryNote(publishError(malformedDeployResponse()), G, j, P);
    }
    let { slug, version, read, shared, kind } = ze.data;
    if (ye.slug && slug !== ye.slug) {
      logFeatureBad("artifact_publish", "deploy_slug_mismatch", q);
      return publishRetryNote(publishError(wrongArtifactAnswer()), G, j, P);
    }
    if (createPath !== undefined && (FRAME_CONSTANTS == null || kind !== FRAME_CONSTANTS.LIVE_DOC_KIND)) {
      logFeatureBad("artifact_publish", "deploy_incomplete", q);
      return publishError(malformedDeployResponse());
    }
    let Ve = renderDocs(Y.data);
    let mapped = Ve?.map((se) => se.path);
    let Ht =
      createPath === undefined
        ? new Set()
        : new Set([
            "index.html",
            ...Object.entries(W ?? {})
              .filter(([, value]) => value.live === true)
              .map(([key]) => key),
          ]);
    let filtered = (mapped ?? []).filter((se) => Ht.has(se));
    let sliced = [
      ...renderWarnings(Y.data),
      ...embedsToDocs(filtered),
      ...newWarnings(mapped, new Set(["index.html", ...Object.keys(W ?? {})])),
    ].slice(0, READ_BACK_LIMITS);
    let Ot = renderEmbeds(Y.data);
    let intHeader = parseIntHeader(Y.response?.headers?.[X_FRAME_PUSH_REMAINING]);
    let pushResetAt = dailyResetFromHeader(Y.response?.headers?.date);
    let ut = mergedChangesFields(
      ze.data,
      ie ? undefined : Z,
      new Set(["index.html", ...Object.keys(W ?? {}), ...(mapped ?? [])]),
    );
    recordOwnPublish(ownPublishes, slug, version, {
      merged: isMergedResponse(Y.data),
    });
    let ke = typeInstanceFields(ze.data);
    logFeatureOk("artifact_publish", {
      ...q,
      e2e_ms: Math.round(performance.now() - b.t0),
      is_redeploy: b.isRedeploy,
      has_caps: b.hasCaps,
      push_remaining_seen: intHeader !== undefined,
      ...mergedTelemetry(ut.mergedOver),
      read_back_echoed: ke.readBackEchoed === true,
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
      ...publishEchoFields(ze.data, carriesDeadline(ye)),
      ...ut,
      ...(Xe.deadline && {
        deadlineDropped: true,
      }),
      ...(Xe.icon && {
        iconDropped: true,
      }),
      ...capabilitiesEchoFields(ze.data, fields, createPath !== undefined),
      ...ke,
      ...(kind !== undefined && {
        kind,
      }),
      ...(sliced.length > 0 && {
        warnings: sliced,
      }),
      ...(Ot !== undefined && {
        embeds: Ot,
      }),
      ...(mapped !== undefined && {
        livePaths: mapped,
      }),
      ...(Ve !== undefined && {
        liveDocs: Ve,
      }),
      ...(filtered.length > 0 && {
        bornLive: filtered,
      }),
    };
  } catch (error) {
    if (error instanceof RelayOnlyUnsentError)
      return error instanceof RelayOnlyCancelledError ? publishCancelledResult() : relayOnlyUnsentResult(q);
    if (!isRelayOnlyCancelled(error))
      logFeatureBad(
        "artifact_publish",
        error instanceof PublishTransportError ? "relay_request_error" : "request_error",
        {
          ...q,
          ...publishErrorTelemetry(error, b.t0),
          ...X,
        },
      );
    return publishRetryNote(publishError(error instanceof Error ? error.message : String(error)), G, j, P);
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
var MANIFEST_TEXT_TYPES = new Set([
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
var MANIFEST_SERVABLE_TYPES = new Set([
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
var MANIFEST_CODE_EXTENSIONS = [
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
var MANIFEST_OTHER_EXTENSIONS = [
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
//@ chunk-06y4szbn.js:111832-112146 placement
function notServedFileExtra(e, contentType) {
  let sliced = extname(e).toLowerCase().slice(1);
  let found = MANIFEST_CODE_EXTENSIONS.find((w) => w === sliced);
  let refusedExt =
    sliced === ""
      ? fromEnum("none")
      : contentTypeForPath(e) !== undefined
        ? fromEnum("served")
        : found !== undefined
          ? fromEnum(found)
          : fromEnum("other");
  if (contentType === undefined)
    return {
      refused_ext: refusedExt,
    };
  let b = baseMediaType(contentType);
  let found_2 = MANIFEST_OTHER_EXTENSIONS.find((w) => w === b);
  let refusedType = MANIFEST_SERVABLE_TYPES.has(b)
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
var XML_CONTENT_TYPES = new Set(["image/svg+xml", "text/xml", "application/xml"]);
var MANIFEST_REQUEST_BUDGET = 67108864;
var VERSION_TOTAL_BYTES = 268435456;
var BINARY_FILE_MAX_BYTES = 15728640;
var TEXT_FILE_MAX_BYTES = 12582912;
var MANIFEST_UPLOAD_THRESHOLD_BYTES = 1048576;
var MAX_REQUEST_WIRE_BYTES = 20971520;
var MAX_PATH_SEGMENT_LENGTH = 256;
var VERSION_MAX_ENTRIES = 512;
var MANIFEST_FIELD_RE = /\b(manifest|mode)\b/;
//@ chunk-06y4szbn.js:112323-112531 placement
function encodeManifestContent(e) {
  if (MANIFEST_TEXT_TYPES.has(e.contentType))
    return typeof e.content === "string" ? e.content : e.content.toString("utf8");
  return (typeof e.content === "string" ? Buffer.from(e.content, "utf8") : e.content).toString("base64");
}
//@ chunk-06y4szbn.js:112531-112645 placement
function getThumbnailCount(e) {
  let n = (e.thumbnail !== undefined ? 1 : 0) + (e.thumbnailDark !== undefined ? 1 : 0);
  return n > 0 && isFrameDeclaredThumbnailEnabled()
    ? {
        thumbnails: n,
      }
    : {};
}
//@ chunk-06y4szbn.js:112645-112710 placement
function thumbnailByteCount(e) {
  return e !== undefined && isFrameDeclaredThumbnailEnabled() ? Math.ceil(e.length / 3) * 4 : 0;
}
//@ chunk-06y4szbn.js:112710-112813 placement
function getContentByteLength(e) {
  return typeof e.content === "string" ? Buffer.byteLength(e.content, "utf8") : e.content.length;
}
//@ chunk-06y4szbn.js:112813-112868 placement
function jsonBodyBytes(e) {
  return Buffer.byteLength(jsonStringify(e), "utf8") - 2;
}
//@ chunk-06y4szbn.js:112868-113188 placement
function manifestDeltas(e, preconditions) {
  let r = Object.create(null);
  let keys = Object.keys(e);
  if (keys.length === 0) return;
  for (let h of keys) {
    let b = e[h];
    let y = preconditions.get(h);
    if (y === undefined || b === undefined) return;
    if (b === null) {
      if (y === null) return;
      r[h] = {
        delete: true,
        ifMatch: y,
      };
      continue;
    }
    if (!("contentType" in b) || b.live !== undefined || b.reseed !== undefined) return;
    r[h] = {
      ...b,
      ifMatch: y,
    };
  }
  return r;
}
//@ chunk-06y4szbn.js:113188-113259 placement
var PATCH_ERROR_PATTERNS = /unknown field "(live|reseed)"/;
var EMPTY_MANIFEST_RE = /manifest must not be empty/;
//@ chunk-06y4szbn.js:113259-116262 placement
function validateFileLists(e, n, r) {
  let s = (msg) => ({
    kind: "files_invalid",
    msg,
  });
  let h = (msg) => ({
    kind: "too_large",
    msg,
  });
  if (n.length + r.length + (e === null ? 0 : 1) > MAX_PATH_SEGMENT_LENGTH)
    return s(
      `This publish lists ${n.length} ${plural(n.length, "file")}${r.length > 0 ? ` and ${r.length} ${plural(r.length, "removal")}` : ""}${e === null ? "" : " plus the page"}, which is over the limit of ${MAX_PATH_SEGMENT_LENGTH} entries in one publish. Nothing was published: send at most ${MAX_PATH_SEGMENT_LENGTH - 1} files now and add the rest with another publish to the same url \u2014 files left out of a later publish are kept, and a version holds up to ${VERSION_MAX_ENTRIES} in all.`,
    );
  let y = new Set(["index.html"]);
  for (let w of r) {
    if (!w || w === "index.html")
      return s(
        w
          ? `"index.html" is the page itself and can't be removed. Drop that entry.`
          : "A removal in `files` has an empty path. Name the published path to remove.",
      );
    if (y.has(w)) return s(`${jsonStringify(w)} is listed more than once in \`files\`. List each path once.`);
    y.add(w);
  }
  let x = e === null ? 0 : Buffer.byteLength(e, "utf8");
  for (let w of n) {
    if (!w.path || w.path === "index.html")
      return s(
        w.path
          ? e === null
            ? `files must not contain "index.html" \u2014 it is the Artifact type's page and can't be changed here`
            : 'files must not contain "index.html" \u2014 the page argument is the index'
          : "every file needs a non-empty path",
      );
    if (y.has(w.path))
      return s(`${jsonStringify(w.path)} is listed more than once in \`files\`. List each path once.`);
    y.add(w.path);
    if (typeof w.content === "string" && !MANIFEST_TEXT_TYPES.has(w.contentType))
      return s(
        `file ${jsonStringify(w.path)}: contentType ${jsonStringify(w.contentType)} ` +
          "is binary \u2014 pass its content as a Buffer (raw bytes), not a string",
      );
    let R = MANIFEST_TEXT_TYPES.has(w.contentType);
    let contentByteLength = getContentByteLength(w);
    let k = R ? MAX_ARTIFACT_BYTES : BINARY_FILE_MAX_BYTES;
    if (contentByteLength > k)
      return h(
        `file ${jsonStringify(w.path)} is ${Math.ceil(contentByteLength / 1024 / 1024)}MB (per-file max ${k / 1024 / 1024}MB${R ? "" : " for binary files, which must fit an upload request base64-encoded"})`,
      );
    if (R) {
      let V = typeof w.content === "string" ? w.content : w.content.toString("utf8");
      if (typeof w.content !== "string" && !Buffer.from(V, "utf8").equals(w.content))
        return s(
          `file ${jsonStringify(w.path)}: contentType ${jsonStringify(w.contentType)} ` +
            "is a text type but the Buffer is not valid UTF-8 \u2014 fix the " +
            "encoding, or use a binary contentType",
        );
      let index = V.indexOf("\uFFFD");
      if (index !== -1 || !isWellFormedString(V))
        return s(
          `file ${jsonStringify(w.path)} ` +
            (index !== -1
              ? `has the replacement character U+FFFD at ${lineColumnAt(V, index)}`
              : "holds an unpaired surrogate (half of a split character)") +
            " \u2014 replace it with the intended text" +
            (w.contentType === "text/html" ? " (in HTML, write an intended U+FFFD as &#xFFFD;)" : ""),
        );
    }
    if (R && contentByteLength > MAX_REQUEST_WIRE_BYTES / 6) {
      let V = jsonBodyBytes(encodeManifestContent(w));
      if (V > MAX_REQUEST_WIRE_BYTES)
        return h(
          `file ${jsonStringify(w.path)} is ${Math.ceil(V / 1024 / 1024)}MB JSON-encoded on the wire (per-request max ${MAX_REQUEST_WIRE_BYTES / 1024 / 1024}MB) \u2014 ` +
            "heavily escaped text (quotes, backslashes, control characters) inflates when JSON-encoded; split or shrink the file",
        );
    }
    x += contentByteLength;
  }
  if (x > MANIFEST_REQUEST_BUDGET)
    return h(
      `total content is ${Math.ceil(x / 1024 / 1024)}MB \u2014 one publish may send at most ${MANIFEST_REQUEST_BUDGET / 1024 / 1024}MB. Nothing was published: send part of the files now and the rest with another publish to the same url (files left out of a later publish are kept; a version may total ${VERSION_TOTAL_BYTES / 1024 / 1024}MB).`,
    );
  return null;
}
//@ chunk-06y4szbn.js:116262-116402 placement
var COPY_FROM_DISABLED_TEXT =
  "copying files from another artifact is not enabled for this account \u2014 nothing was published; publish with local files instead";
//@ chunk-06y4szbn.js:116402-118123 placement
function copySourcesProblem(e, n, r, s) {
  if (r.length === 0) return null;
  if (n.length + r.length + s.length + (e === null ? 0 : 1) > MAX_PATH_SEGMENT_LENGTH)
    return `This publish lists ${n.length + r.length} ${plural(n.length + r.length, "file")} (copies included)${s.length > 0 ? ` and ${s.length} ${plural(s.length, "removal")}` : ""}${e === null ? "" : " plus the page"}, which is over the limit of ${MAX_PATH_SEGMENT_LENGTH} entries in one publish. Nothing was published: send at most ${MAX_PATH_SEGMENT_LENGTH - 1} files now and add the rest with another publish to the same url \u2014 files left out of a later publish are kept, and a version holds up to ${VERSION_MAX_ENTRIES} in all.`;
  let b = new Set(["index.html", ...n.map((x) => x.path), ...s]);
  let y = new Set();
  for (let x of r) {
    if (!x.path || x.path === "index.html")
      return x.path
        ? e === null
          ? `files must not contain "index.html" \u2014 it is the Artifact type's page and can't be changed here`
          : 'files must not contain "index.html" \u2014 the page argument is the index'
        : "every file needs a non-empty path";
    if (b.has(x.path))
      return `${jsonStringify(x.path)} is listed more than once in \`files\` (once as a copy from another artifact). List each path once.`;
    b.add(x.path);
    if (!ARTIFACT_SLUG_RE.test(x.from.slug) || !x.from.path)
      return `file ${jsonStringify(x.path)}: its source must name an artifact and a published path`;
    if (x.from.path === "index.html")
      return `file ${jsonStringify(x.path)}: another artifact's page (index.html) is not a copyable file \u2014 read it and publish your own content`;
    for (let w of [x.path, x.from.path]) {
      let R = contentTypeForPath(w);
      if (R !== undefined && MARKUP_WITHOUT_SVG_TYPES.has(baseMediaType(R)))
        return `file ${jsonStringify(x.path)}: an HTML or XML document cannot be copied from another artifact \u2014 read it with action "read_file" and publish it as your own file`;
    }
    y.add(`${x.from.slug}@${x.from.ver ?? ""}`);
  }
  if (y.size > MAX_COPY_SOURCES)
    return `files copy from ${y.size} source artifact versions; at most ${MAX_COPY_SOURCES} per publish`;
  return null;
}
//@ chunk-06y4szbn.js:118123-118323 placement
function filesOnlyPublishProblem(e, copied) {
  let r = validateSupportingFiles(e, "file");
  if (r !== null) return r.err;
  if (copied.length > 0 && !isFrameCopyFromEnabled()) {
    logFeatureBad("artifact_publish", "copy_from_flag_off", {
      n_copied: copied.length,
    });
    return COPY_FROM_DISABLED_TEXT;
  }
  return validateFileLists(null, e, [])?.msg ?? copySourcesProblem(null, e, copied, []);
}
//@ chunk-06y4szbn.js:118323-120256 placement
async function publishInstanceFiles(e, n) {
  if (getArtifactPublishStubDir() !== null)
    return publishError(
      "publishing to an Artifact created from an Artifact type is not available in eval stub mode",
    );
  let copiedFiles = n.copiedFiles ?? [];
  if (!(getLiveState().frozenArtifactTypes?.typesOn ?? isFrameMultiFileEnabled())) {
    let removeFiles = n.removeFiles ?? [];
    logFeatureBad("artifact_publish", "multifile_flag_off", {
      n_files: e.length + copiedFiles.length,
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
  let h = validateSupportingFiles(e, "file");
  if (h !== null) return h;
  let b = await checkHostGrantCarry({
    slug: n.slug,
    hostGrant: readHostGrant(env.CLAUDE_ARTIFACT_HOST_GRANT),
    storedCaps: undefined,
    signal: n.signal,
    credentials: n.credentials,
    lane: "files",
  });
  if (!b.ok) return publishError(b.err);
  let y = {
    slug: n.slug,
    title: n.title,
    favicon: n.favicon,
    ...(n.label !== undefined && {
      label: n.label,
    }),
    ...(n.note !== undefined && {
      note: n.note,
    }),
    ...(n.deadline !== undefined && {
      deadline: n.deadline,
    }),
    ...(n.requestId !== undefined && {
      requestId: n.requestId,
    }),
    ...(n.description !== undefined && {
      description: n.description,
    }),
    ...(n.publishContext !== undefined && {
      publishContext: n.publishContext,
    }),
    ...(n.originMetadata !== undefined && {
      originMetadata: n.originMetadata,
    }),
    ...(n.autoEditAttribution && {
      autoEditAttribution: n.autoEditAttribution,
    }),
  };
  return withPublishInFlight(n.ownPublishes, n.slug, () =>
    readBackAfterPublish(
      sendFilesPublish(
        null,
        e,
        copiedFiles,
        n.removeFiles ?? [],
        y,
        {},
        {
          baseVersion: n.baseVersion,
          force: n.force,
          ownPublishes: n.ownPublishes,
          tele: {
            t0: performance.now(),
            pageBytes: 0,
            lane: "inline",
            isRedeploy: true,
            hasCaps: false,
            forced: n.force,
            ...(n.baseRebase !== undefined && {
              baseRebase: n.baseRebase,
            }),
          },
          ...(n.copiedCrossOrgOk === true && {
            copiedCrossOrgOk: true,
          }),
          ...(n.preconditions !== undefined && {
            preconditions: n.preconditions,
          }),
          onRetry: n.onRetry,
          signal: n.signal,
          credentials: n.credentials,
        },
      ),
      n.slug,
      n.credentials,
      n.signal,
    ),
  );
}
//@ chunk-06y4szbn.js:120256-121268 placement
async function publishLiveDocVersion(e) {
  if (getArtifactPublishStubDir() !== null) return publishError("invalid publish options");
  if (!isFrameMultiFileEnabled()) {
    logFeatureBad("artifact_publish", "multifile_flag_off", {
      n_files: 0,
      n_removed: 0,
    });
    return publishError("invalid publish options");
  }
  if (![...e.base.values()].some((s) => s.live === true)) return publishError("invalid publish options");
  let n = await checkHostGrantCarry({
    slug: e.slug,
    hostGrant: readHostGrant(env.CLAUDE_ARTIFACT_HOST_GRANT),
    storedCaps: undefined,
    signal: e.signal,
    credentials: e.credentials,
    lane: "page",
  });
  if (!n.ok) return publishError(n.err);
  let r = {
    slug: e.slug,
    title: e.title,
    favicon: e.favicon,
    ...(e.label !== undefined && {
      label: e.label,
    }),
    ...(e.deadline !== undefined && {
      deadline: e.deadline,
    }),
    ...(e.requestId !== undefined && {
      requestId: e.requestId,
    }),
    ...(e.publishContext !== undefined && {
      publishContext: e.publishContext,
    }),
  };
  return withPublishInFlight(e.ownPublishes, e.slug, () =>
    sendFilesPublish(
      null,
      [],
      [],
      [],
      r,
      {},
      {
        baseVersion: e.baseVersion,
        force: false,
        ownPublishes: e.ownPublishes,
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
          base: e.base,
        },
        onRetry: e.onRetry,
        signal: e.signal,
        credentials: e.credentials,
      },
    ),
  );
}
//@ chunk-06y4szbn.js:121268-147257 placement
/**
 * 发送多文件发布请求：清单构造、内容上传（直连/中继）、合并旧版本、留空文件与重试处理。
 */
async function sendFilesPublish(e, n, copiedFiles, s, h, b, y) {
  let { baseVersion, force, tele, onRetry, signal, credentials } = y;
  let relayOnly = y.relayOnly;
  let q = y.copiedCrossOrgOk === true;
  let liveFiles = y.liveFiles;
  let detach = liveFiles?.detach ?? [];
  let P = {
    page_bytes: tele.pageBytes,
    lane: fromEnum(tele.lane),
    n_files: n.length + copiedFiles.length,
    n_copied: copiedFiles.length,
    n_removed: s.length,
    forced: tele.forced,
    template: fromEnum("plain"),
    is_redeploy: tele.isRedeploy,
    has_base_version: baseVersion !== undefined,
    reserved: false,
    ...getThumbnailCount(h),
    ...(tele.baseRebase !== undefined && {
      base_rebase: fromEnum(tele.baseRebase),
    }),
  };
  let j = (S) => {
    logFeatureBad("artifact_publish", "files_invalid", P);
    return publishError(S);
  };
  let X = (msg) => {
    logFeatureBad("artifact_publish", "too_large", P);
    return publishError(msg);
  };
  let ge = e === null || (h.slug !== undefined && baseVersion !== undefined) ? "patch" : "replace";
  if (s.length > 0 && ge === "replace")
    return j(
      h.slug === undefined
        ? "A `null` entry in `files` removes a file from an existing artifact, and a first publish has nothing to remove, so nothing was published. Drop the `null` entries."
        : "A removal applies to the artifact's current version, and this publish didn't name that version (`baseVersion`), so nothing was published. Publish again with the version named, or without the `null` entries.",
    );
  if (liveFiles !== undefined && h.slug !== undefined && ge === "replace")
    return j("invalid publish options");
  if (liveFiles?.page?.reseed === true && liveFiles.page.live !== undefined)
    return j("invalid publish options");
  let ie =
    detach.length > 0 ||
    liveFiles?.page?.reseed === true ||
    liveFiles?.page?.live === false ||
    n.some((S) => S.reseed === true || S.live === false);
  if (ie && ge === "replace") return j("invalid publish options");
  for (let S of n) {
    if (S.reseed === true && S.live !== undefined) return j("invalid publish options");
    if ((S.live === true || S.reseed === true) && !HTML_CONTENT_TYPES.has(baseMediaType(S.contentType)))
      return j("invalid publish options");
    let Q = liveFiles?.base?.get(S.path);
    if (liveFiles?.base !== undefined && Q?.live !== true && (S.reseed === true || S.live === false))
      return j("invalid publish options");
  }
  for (let S of detach)
    if (liveFiles?.base !== undefined && liveFiles.base.get(S)?.live !== true)
      return j("invalid publish options");
  if (
    liveFiles?.base !== undefined &&
    liveFiles.base.get("index.html")?.live !== true &&
    (liveFiles.page?.reseed === true || liveFiles.page?.live === false)
  )
    return j("invalid publish options");
  for (let S of s) if (liveFiles?.base?.get(S)?.live === true) return j("invalid publish options");
  let Z = validateFileLists(e, n, [...s, ...detach]);
  if (Z !== null) return Z.kind === "too_large" ? X(Z.msg) : j(Z.msg);
  let Oe = copySourcesProblem(e, n, copiedFiles, [...s, ...detach]);
  if (Oe !== null) return j(Oe);
  for (let S of copiedFiles)
    if (liveFiles?.base?.get(S.path)?.live === true) return j("invalid publish options");
  let ye = (path, Q) =>
    ge === "patch" && liveFiles?.base?.get(path)?.live === true && Q.reseed !== true && Q.live !== false;
  let Ee =
    ie ||
    liveFiles?.page?.live === true ||
    n.some((S) => S.live === true) ||
    [...(liveFiles?.base?.values() ?? [])].some((S) => S.live);
  let Xe = ge === "patch" && !force && y.preconditions === undefined && (e !== null || Ee);
  let He = (S, Q, I) => {
    let ce = Xe ? liveFiles?.base?.get(S) : undefined;
    return (
      ce !== undefined &&
      !ce.live &&
      ce.sha256 !== undefined &&
      ce.contentType === I &&
      ce.sha256 === computeContentHash(Q)
    );
  };
  let Y = [];
  let page = liveFiles?.page ?? {};
  let ze = e !== null && page.live === false;
  let it = ze ? ["index.html", ...detach] : detach;
  let Ne;
  if (ye("index.html", page)) Y.push("index.html");
  else if (
    e !== null &&
    !ze &&
    !(Ee && page.live === undefined && page.reseed !== true && He("index.html", e, "text/html"))
  )
    Ne = {
      content: e,
      contentType: "text/html",
      ...(page.live !== undefined && {
        live: page.live,
      }),
      ...(page.reseed === true && {
        reseed: true,
      }),
    };
  let Ce = Object.create(null);
  if (Ne !== undefined) Ce["index.html"] = Ne;
  let Be = [];
  let Te = Ne?.content !== undefined ? jsonBodyBytes(Ne.content) : 0;
  let Ve = thumbnailByteCount(h.thumbnail) + thumbnailByteCount(h.thumbnailDark);
  let $e = TEXT_FILE_MAX_BYTES - Te - Ve;
  let Ht = (S) => !ye(S.path, S) && (S.live === true || S.reseed === true || S.live === false);
  let Me = Object.create(null);
  for (let S of n.filter(Ht)) {
    let Q = encodeManifestContent(S);
    let I = jsonBodyBytes(Q);
    if (I > $e) {
      let ce = TEXT_FILE_MAX_BYTES - Te - $e;
      return X("file too large");
    }
    $e -= I;
    Me[S.path] = {
      content: Q,
      contentType: S.contentType,
      ...(S.live !== undefined && {
        live: S.live,
      }),
      ...(S.reseed === true && {
        reseed: true,
      }),
    };
    Ce[S.path] = Me[S.path];
  }
  let _t = [];
  let filesOmitted = 0;
  for (let S of n) {
    if (Ht(S)) continue;
    if (ye(S.path, S)) {
      Y.push(S.path);
      continue;
    }
    if (S.live === undefined && He(S.path, S.content, S.contentType)) {
      filesOmitted += 1;
      continue;
    }
    _t.push(S);
  }
  let yt = 0;
  for (let S of _t) {
    let Q = encodeManifestContent(S);
    let I = jsonBodyBytes(Q);
    if (I <= $e) {
      $e -= I;
      yt += I;
      Ce[S.path] = {
        content: Q,
        contentType: S.contentType,
      };
    } else {
      let contentHash = computeContentHash(S.content);
      Be.push({
        f: S,
        sha: contentHash,
        wire: Q,
      });
      Ce[S.path] = {
        sha256: contentHash,
        contentType: S.contentType,
      };
    }
  }
  for (let S of s) Ce[S] = null;
  for (let S of it)
    Ce[S] = {
      live: false,
    };
  let et = {
    liveKey: it.length > 0 || Object.keys(Me).length > 0 || Ne?.live !== undefined || Ne?.reseed === true,
    emptyPatch: Ee && Object.keys(Ce).length === 0 && copiedFiles.length === 0,
    ldx: false,
  };
  let ut;
  let ke = (S) => (ut = S);
  let onEncoding = trackUploadBytes(P);
  let ve = false;
  let zt = (S) =>
    deployWithRetry(
      (Q) =>
        postDeploy(deployQuery(Q, h), S, credentials, ke, onEncoding, Q, relayOnly, signal).then(
          (I) => {
            ve = true;
            return I;
          },
          (error) => {
            if (!(error instanceof RelayOnlyUnsentError)) ve = true;
            throw error;
          },
        ),
      onRetry,
      signal,
      P,
      false,
      typeof S.slug === "string",
      relayOnly !== undefined && h.slug === undefined && !ve,
    );
  let Pt = false;
  let st = (S) => {
    let Q =
      ge === "patch" && !force && y.preconditions !== undefined
        ? manifestDeltas(S, y.preconditions)
        : undefined;
    Pt = Q !== undefined;
    return Q ?? S;
  };
  let tt = {
    ...publishMetadataFields(h),
    ...entrypointHint(),
    ...sessionIdHint(),
    ...b,
  };
  let Nt = {
    deadline: false,
    icon: false,
    request_id: false,
  };
  let Rt = async (S) => {
    let Q = await zt(S);
    for (
      let I = droppedFieldOn400(h, Q);
      I !== undefined && S[I] !== undefined;
      I = droppedFieldOn400(h, Q)
    ) {
      logFeatureSad("artifact_publish", `${I}_rejected`, P);
      logForDebugging(`[artifact] ${I} refused upstream \u2014 retrying without it`);
      delete tt[I];
      h = withoutField(h, I);
      Nt[I] = true;
      let { [I]: ce, ...Ae } = S;
      S = Ae;
      Q = await zt(S);
    }
    return Q;
  };
  let gn = 15728640;
  let nt = [];
  {
    let S = [];
    let Q = 0;
    for (let I of Be) {
      let ce = jsonBodyBytes(I.wire);
      if (S.length > 0 && Q + ce > gn) {
        nt.push(S);
        S = [];
        Q = 0;
      }
      S.push(I);
      Q += ce;
    }
    if (S.length > 0) nt.push(S);
  }
  let Wt = async (S) => {
    let Q = retryDelayMs(S);
    if (Q === undefined) return false;
    await sleep(Q, signal);
    if (signal?.aborted) {
      logForDebugging("[artifact] 429 retry cancelled by user");
      return false;
    }
    return true;
  };
  let ft = (S) => {
    let Q = S.fromFrame && S.status === 429 ? dailyCapNotice(S.data) : undefined;
    if (Q)
      logFeatureBad("artifact_publish", "publish_cap_reached", {
        ...P,
        cap_type: fromEnum(Q.capType),
      });
    return Q;
  };
  let mapped = copiedFiles.map((S) => ({
    c: S,
  }));
  let Je = [];
  let Ye = [];
  let Mt = {
    askedToLeaveOut: false,
  };
  let tn = (S) =>
    "c" in S
      ? {
          path: S.c.path,
          from: {
            slug: S.c.from.slug,
            path: S.c.from.path,
            ...(S.c.from.ver !== undefined && {
              ver: S.c.from.ver,
            }),
          },
        }
      : {
          path: S.f.path,
          content: S.wire,
          contentType: S.f.contentType,
        };
  let pt = async (slug, Q) => {
    let any = Q.some((qe) => "c" in qe);
    let ce = q && any;
    let Ae = any ? leaveOutMissingField() : {};
    let Ie = () => ({
      slug,
      ...(ce && {
        cross_org_ok: true,
      }),
      ...Ae,
      files: Q.map(tn),
    });
    let Fe = () => postDeploy("/api/frame/upload", Ie(), credentials, ke, onEncoding, {}, relayOnly, signal);
    let Ge = async () => {
      let qe = await withPublishTiming(Fe);
      return qe.ok &&
        qe.fromFrame &&
        qe.status === 429 &&
        dailyCapNotice(qe.data) === undefined &&
        (await Wt(qe.response?.headers?.["retry-after"]))
        ? withPublishTiming(Fe)
        : qe;
    };
    let be = await Ge();
    let at =
      "leave_out_missing" in Ae && be.ok && be.fromFrame && be.status === 400
        ? leaveOutMissingRefusal(be.data, Ie())
        : undefined;
    if (at !== undefined && !signal?.aborted) {
      if (at === "named") {
        markLeaveOutMissingRefused();
        logFeatureSad("artifact_publish", "copy_leave_out_unsupported", P);
      }
      Ae = {};
      be = await Ge();
      if (at === "unnamed" && be.ok && be.fromFrame && isClientRefusalStatus(be.status, be.data)) {
        markLeaveOutMissingRefused();
        logFeatureSad("artifact_publish", "copy_leave_out_unsupported", P);
      }
    }
    if (any) Mt.askedToLeaveOut = "leave_out_missing" in Ae;
    return be;
  };
  let It = (status, Q, I) => {
    if (Q) logForDebugging(`[artifact] manifest publish refused (HTTP ${status}): ${errBody(Q)}`);
    let ce = I?.maybeGone ? ", or the artifact no longer exists or isn't yours to update" : "";
    if (s.length > 0)
      return publishError(
        `The server didn't accept this update's file changes (HTTP ${status})${ce}. Nothing was published or removed; the artifact is unchanged. Publishing the page on its own (omitting \`files\`) would update the page but can't remove a file.${I?.debris ?? ""}`,
      );
    let Ae = I?.debris
      ? " This publish didn't finish."
      : h.slug !== undefined
        ? " Nothing was published; the artifact is unchanged."
        : " Nothing was published.";
    return publishError(
      `The server didn't accept this publish's supporting files (HTTP ${status})${ce}.${Ae} Publish the page as a single file instead: inline what it needs and omit \`files\`.${I?.debris ?? ""}`,
    );
  };
  let de = "";
  let ht;
  let Lt = (S) => {
    ht = S;
    P.reserved = true;
    de = ` (A slug was reserved for it: publish again to slug ${S} rather than publishing fresh.)`;
    y.onReserved?.(S);
  };
  if (h.slug === undefined && y.reservedSlug !== undefined) Lt(y.reservedSlug);
  let D = (S) => S.fromFrame && isRateLimitedResponse(S.status, S.data);
  let fe = (S, Q) => {
    logFeatureBad("artifact_publish", "rate_limited", {
      ...P,
      refused_status: S.status,
      ...refusalReasonField(S.data),
    });
    return {
      ...publishError(
        rateLimitedResult({
          retryAfter: S.response?.headers?.["retry-after"],
          reservedSlug: ht,
          ...(Q !== undefined && {
            refusedStep: Q,
          }),
        }),
      ),
      transient: "rate_limited",
    };
  };
  let K = () => publishError(`publish cancelled \u2014 nothing more was sent.${de}`);
  try {
    let slug = h.slug ?? y.reservedSlug;
    let Q;
    let I;
    let ce = baseVersion;
    let Ae = async (B, te) => {
      let xe = {
        ...(B !== undefined && {
          slug: B,
        }),
        ...(te.length > 0 && {
          shas: te,
        }),
        ...(B === undefined && entrypointHint()),
      };
      let le = {
        refreshOAuth: true,
        headers: buildFrameHeaders(),
        timeout: 30000,
        credentials,
        relayOnCredentialRefusal: true,
      };
      let he = async () => {
        if (relayOnly === undefined) return frameApi.post("/api/frame/deploy/prepare", xe, le);
        return postRelayOnlyWithBusyWait("/api/frame/deploy/prepare", xe, le, relayOnly, signal);
      };
      let Se = await withPublishTiming(he);
      if (
        Se.ok &&
        Se.fromFrame &&
        Se.status === 429 &&
        dailyCapNotice(Se.data) === undefined &&
        (await Wt(Se.response?.headers?.["retry-after"]))
      )
        Se = await withPublishTiming(he);
      return Se;
    };
    let Ie = (B) => (typeof B?.slug === "string" && ARTIFACT_SLUG_RE.test(B.slug) ? B.slug : undefined);
    let Fe = false;
    let Ge = false;
    let be = h.slug !== undefined && !(Xe && liveFiles?.base !== undefined);
    let at = Be.length > 0 || mapped.length > 0 || (be && yt > MANIFEST_UPLOAD_THRESHOLD_BYTES);
    if (at) {
      let mapped_2 = _t.map((le) => ({
        f: le,
        sha: computeContentHash(le.content),
        wire: encodeManifestContent(le),
      }));
      let te;
      let xe = "";
      for (let idx = 0; idx < 2; idx++) {
        if (signal?.aborted) return K();
        let he = await Ae(
          slug,
          mapped_2.map((re) => re.sha),
        );
        if (signal?.aborted) {
          let re = de === "" && slug === undefined && he.ok && he.status === 200 ? Ie(he.data) : undefined;
          if (re !== undefined) Lt(re);
          return K();
        }
        if (!he.ok) {
          te = {
            status: 0,
            why:
              he.reason === "no-auth"
                ? describeArtifactAuthFailure(he.detail)
                : `preflight unavailable: ${he.reason}`,
          };
          break;
        }
        if (he.status === 404) {
          if (isFrameNotFoundBody(he.data)) {
            logFeatureBad("artifact_publish", "prepare_not_found", P);
            return {
              ...publishError(
                "the server does not recognize this artifact for updating (it may no longer exist or may not be yours to update). The files were NOT published.",
              ),
              ...(h.slug !== undefined && {
                gone: true,
              }),
            };
          }
          te = {
            status: 404,
            why: "the preflight route answered 404",
          };
          break;
        }
        let Se = ft(he);
        if (Se)
          return publishError(
            de
              ? `${Se.message} \u2014 this publish didn't finish; try again after the reset.${de}`
              : `${Se.message} \u2014 nothing was published; try again after the reset.`,
          );
        if (D(he)) {
          if (mapped.length > 0 || Be.length > 0 || Ge)
            return fe(he, mapped.length > 0 ? copyPreflightFailure(mapped.length) : undefined);
          logForDebugging("[artifact] preflight rate-limited \u2014 sending the one inline deploy instead");
          te = {
            status: 429,
            why: "the preflight was rate-limited",
          };
          break;
        }
        if (he.status !== 200) {
          te = {
            status: he.status,
            why: he.fromFrame
              ? `preflight ${he.status}: ${errBody(he.data)}`
              : `preflight relay HTTP ${he.status}`,
          };
          break;
        }
        let Gn = Ie(he.data);
        let missing = he.data?.missing;
        if (
          Gn === undefined ||
          !Array.isArray(missing) ||
          !missing.every((re) => typeof re === "string" && /^[0-9a-f]{64}$/.test(re))
        ) {
          te = {
            status: 200,
            why: "a malformed preflight answer",
          };
          break;
        }
        if (slug !== undefined && Gn !== slug) {
          logFeatureBad("artifact_publish", "prepare_slug_mismatch", P);
          return publishError(
            "the server answered the upload preflight for a different " + "artifact \u2014 not publishing.",
          );
        }
        Ge = true;
        slug = Gn;
        if (h.slug === undefined) Lt(slug);
        let Xa = new Set(missing);
        let filtered = mapped_2.filter((re) => Xa.has(re.sha));
        let Xn = [];
        {
          let re = [];
          let we = 0;
          for (let vt of filtered) {
            let rn = jsonBodyBytes(vt.wire);
            if (re.length > 0 && we + rn > gn) {
              Xn.push(re);
              re = [];
              we = 0;
            }
            re.push(vt);
            we += rn;
          }
          if (re.length > 0) Xn.push(re);
        }
        for (let re of Xn) {
          if (signal?.aborted) return K();
          let we = await pt(slug, re);
          if (!we.ok) {
            logFeatureBad("artifact_publish", we.reason, P);
            return publishError(
              we.reason === "no-auth"
                ? describeArtifactAuthFailure(we.detail) + de
                : `upload unavailable: ${we.reason}. The publish was NOT completed; retry publishing to slug ${slug}.`,
            );
          }
          if (we.status !== 200) {
            let vt = ft(we);
            if (vt)
              return publishError(
                `${vt.message} \u2014 this publish didn't finish. ` +
                  `Publish again to slug ${slug} after the reset.`,
              );
            if (D(we)) return fe(we);
            logFeatureBad(
              "artifact_publish",
              we.fromFrame ? "prepare_upload_failed" : "prepare_upload_relay_error",
              {
                ...P,
                upload_status: we.status,
              },
            );
            return publishError(
              (we.fromFrame
                ? `file upload ${we.status} after the preflight: ${errBody(we.data)}`
                : `file upload failed after the preflight (relay HTTP ${we.status})`) +
                ` \u2014 the publish was NOT completed. Retry publishing to slug ${slug}.`,
            );
          }
        }
        if (mapped.length > 0) {
          if (signal?.aborted) return K();
          let re = await pt(slug, mapped);
          if (!re.ok) {
            logFeatureBad("artifact_publish", re.reason, P);
            return publishError(
              re.reason === "no-auth"
                ? describeArtifactAuthFailure(re.detail) + de
                : `copying files from another artifact unavailable: ${re.reason}. The publish was NOT completed; retry publishing to slug ${slug}.`,
            );
          }
          if (re.status !== 200) {
            let _e = ft(re);
            if (_e)
              return publishError(
                `${_e.message} \u2014 this publish didn't finish. Publish again to slug ${slug} after the reset.`,
              );
            if (D(re))
              return fe(
                re,
                copiedFilesSummary(
                  mapped.map(({ c: fi }) => ({
                    path: fi.path,
                    fromSlug: fi.from.slug,
                  })),
                ),
              );
            let ot =
              q && re.fromFrame && re.status === 400 && isUnknownFieldErrorFor(re.data, "cross_org_ok");
            logFeatureBad(
              "artifact_publish",
              ot
                ? "copy_predates_cross_org"
                : re.fromFrame
                  ? "copy_upload_failed"
                  : "copy_upload_relay_error",
              {
                ...P,
                upload_status: re.status,
              },
            );
            let Re = errBody(re.data);
            let match = /^files\[(\d+)\]: (.*)$/.exec(Re);
            let lt = match !== null ? mapped[Number(match[1])]?.c : undefined;
            let ui = match !== null ? match[2] : Re;
            let Qn = re.fromFrame && lt !== undefined && /not found/.test(ui) ? lt : undefined;
            let Za =
              " \u2014 the source artifact doesn't exist, this account can't open it, or it can't be copied from (all three get the same answer)";
            if (ot)
              return publishError(
                "copying files from another organization's artifact isn't available on this server yet, so nothing was published. Don't retry the copy. Publish without the copied file instead, or tell the user cross-organization copies aren't supported yet.",
              );
            return {
              ...publishError(
                (re.fromFrame
                  ? lt !== undefined
                    ? `copying ${jsonStringify(lt.path)} from artifact ${lt.from.slug} (${jsonStringify(lt.from.path)}) was refused (${re.status}: ${ui})${Qn !== undefined ? Za : ""}`
                    : re.status === 404
                      ? "the server does not recognize this artifact for staging copied files (it may no longer exist, may not be yours to update, or copying is not enabled on this path)"
                      : `staging the copied files was refused (${re.status}: ${Re})`
                  : `staging the copied files failed (relay HTTP ${re.status})`) +
                  ` \u2014 the publish was NOT completed. Retry publishing to slug ${slug} once the cause is fixed.`,
              ),
              ...(Qn !== undefined && {
                copySourceNotFound: Qn,
              }),
            };
          }
          let we = () =>
            publishError(
              `the server staged the copied files but its answer was incomplete, so nothing was published \u2014 retry publishing to slug ${slug}.${de}`,
            );
          let files = re.data?.files;
          if (!Array.isArray(files) || files.length !== mapped.length) {
            logFeatureBad("artifact_publish", "copy_echo_malformed", P);
            return we();
          }
          let rn = [];
          let Gt = [];
          for (let [_e, ot] of mapped.entries()) {
            let Re = files[_e];
            if (Re?.leftOut !== undefined) {
              if (
                !Mt.askedToLeaveOut ||
                typeof Re.leftOut !== "string" ||
                Re.leftOut === "" ||
                Re.sha256 !== undefined ||
                Re.size !== undefined ||
                Re.contentType !== undefined ||
                (Re.path !== undefined && Re.path !== ot.c.path)
              ) {
                logFeatureBad("artifact_publish", "copy_echo_malformed", P);
                return we();
              }
              Gt.push({
                file: ot.c,
                why: Re.leftOut,
              });
              continue;
            }
            if (
              typeof Re?.sha256 !== "string" ||
              !/^[0-9a-f]{64}$/.test(Re.sha256) ||
              typeof Re.contentType !== "string" ||
              !MANIFEST_SERVABLE_TYPES.has(Re.contentType)
            ) {
              logFeatureBad("artifact_publish", "copy_echo_malformed", P);
              return we();
            }
            ot.sha = Re.sha256;
            ot.contentType = Re.contentType;
            rn.push(ot);
          }
          Je = rn;
          Ye = Gt;
          let isFirstPublish = h.slug === undefined && y.reservedSlug === undefined;
          if (
            Gt.length > 0 &&
            !isAddOnlyPublish({
              mode: ge,
              isFirstPublish,
              removedCount: s.length,
            })
          ) {
            let _e = {
              ...P,
              n_left_out: Gt.length,
            };
            if (s.length > 0) {
              logFeatureBad("artifact_publish", "copy_left_out_removes_files", _e);
              return publishError(allFilesLeftOutMessage(Gt, "removes_files") + de);
            }
            logFeatureBad("artifact_publish", "copy_left_out_replaces_files", _e);
            return publishError(allFilesLeftOutMessage(Gt, "replaces_files") + de);
          }
          let filtered = Je.filter((_e) => MARKUP_WITHOUT_SVG_TYPES.has(baseMediaType(_e.contentType ?? "")));
          if (filtered.length > 0) {
            logFeatureBad("artifact_publish", "copy_refused_document", P);
            return publishError(
              `copied file ${jsonStringify(filtered[0].c.path)} is ${filtered[0].contentType}: a page or XML document cannot be copied from another artifact into a publish (its content must pass this tool's checks, which a server-side copy skips) \u2014 read it with action "read_file" and publish it from the local copy instead. Nothing was published.${de}`,
            );
          }
          let vn = (path) => contentTypeForPath(path) === SVG_CONTENT_TYPE;
          let ci = (contentType) => baseMediaType(contentType ?? "") === SVG_CONTENT_TYPE;
          let filtered_2 = Je.filter((_e) => !ci(_e.contentType) && (vn(_e.c.path) || vn(_e.c.from.path)));
          if (filtered_2.length > 0) {
            logFeatureBad("artifact_publish", "copy_refused_svg_mismatch", P);
            let mapped = filtered_2
              .slice(0, 20)
              .map((lt) => `${jsonStringify(lt.c.path)} (${lt.contentType})`);
            let ot = filtered_2.length - mapped.length;
            let Re = filtered_2.length === 1;
            let Xt = filtered_2.every((lt) => !vn(lt.c.from.path))
              ? `copy ${Re ? "it" : "each"} to a path that does not end .svg, or `
              : "";
            return publishError(
              `copied ${plural(filtered_2.length, "file")} ${mapped.join(", ")}${ot > 0 ? ` and ${ot} more` : ""}: a file copied to or from a name ending .svg must be stored as an SVG image \u2014 ${Xt}read ${Re ? "it" : "each"} with action "read_file" and publish it from the local copy instead. Nothing was published.${de}`,
            );
          }
          let found = Je.find((_e) => ci(_e.contentType) && !vn(_e.c.path));
          if (found !== undefined) {
            logFeatureBad("artifact_publish", "copy_refused_svg_mismatch", P);
            return publishError(
              `copied file ${jsonStringify(found.c.path)} is ${found.contentType}: an SVG image is copied only to a name ending .svg \u2014 copy it to a path ending .svg, or read it with action "read_file" and publish it from the local copy instead. Nothing was published.${de}`,
            );
          }
          let di = (path) => SCRIPT_CONTENT_TYPES.has(baseMediaType(contentTypeForPath(path) ?? ""));
          let Zn =
            e === null
              ? Je.find(
                  (_e) =>
                    SCRIPT_CONTENT_TYPES.has(baseMediaType(_e.contentType ?? "")) &&
                    !di(_e.c.path) &&
                    !di(_e.c.from.path),
                )
              : undefined;
          if (Zn !== undefined) {
            logFeatureBad("artifact_publish", "copy_refused_script", P);
            return publishError(
              `copied file ${jsonStringify(Zn.c.path)} is ${Zn.contentType}: a script its source stores under a name that does not say so cannot be copied into an artifact made from a type (the approval counted it as data) \u2014 copy it to a path with a script extension, or read it with action "read_file" and publish it from the local copy instead. Nothing was published.${de}`,
            );
          }
        }
        if (signal?.aborted) return K();
        let At = Object.create(null);
        if (Ne !== undefined) At["index.html"] = Ne;
        for (let [key, value] of Object.entries(Me)) At[key] = value;
        for (let re of mapped_2)
          At[re.f.path] = {
            sha256: re.sha,
            contentType: re.f.contentType,
          };
        for (let re of Je)
          At[re.c.path] = {
            sha256: re.sha,
            contentType: re.contentType,
          };
        for (let re of s) At[re] = null;
        for (let re of it)
          At[re] = {
            live: false,
          };
        if (Ye.length > 0 && Object.keys(At).length === 0) {
          logFeatureBad("artifact_publish", "copy_left_out_no_other_file", {
            ...P,
            n_left_out: Ye.length,
          });
          return publishError(allFilesLeftOutMessage(Ye, "no_other_file") + de);
        }
        let Ze = await Rt({
          ...tt,
          slug,
          ...(force && {
            force: true,
          }),
          ...(baseVersion && {
            baseVersion,
          }),
          manifest: st(At),
          mode: ge,
        });
        let li = Ze.ok ? refusalReasonOf(Ze.data) : undefined;
        if (
          Ze.ok &&
          Ze.fromFrame &&
          Ze.status === 422 &&
          idx === 0 &&
          (li === "content_pending" ||
            (li === undefined &&
              !isTypeFileRefusal(Ze.data) &&
              !TYPE_INSTANCE_TEXT_RE.test(publishDeniedReason(Ze.data, 300)) &&
              !(et.liveKey && typeof Ze.data === "string")))
        ) {
          xe = errBody(Ze.data);
          continue;
        }
        if (Ze.ok && Ze.status === 200 && !Ze.data?.version) {
          logFeatureBad("artifact_publish", "prepare_no_version", P);
          return publishError(malformedDeployResponse() + de);
        }
        I = Ze;
        Fe = true;
        break;
      }
      if (mapped.length > 0 && !Fe && !Ge) {
        logFeatureBad("artifact_publish", "copy_no_preflight", {
          ...P,
          prepare_status: te?.status ?? 0,
        });
        return publishError(
          `copying files from another artifact needs the upload preflight, which was unavailable here (${te?.why ?? "no answer"}) \u2014 nothing was published.${de}`,
        );
      }
      if (Ge && !Fe) {
        logFeatureBad("artifact_publish", "prepare_rerun_failed", {
          ...P,
          prepare_status: te?.status ?? 0,
        });
        return publishError(
          `the deploy was refused (422: ${xe}), and re-checking with the server before re-sending failed (${te?.why ?? "no answer"}) \u2014 the publish was NOT ` +
            `completed. Retry publishing to slug ${slug}.`,
        );
      }
    } else if (slug === undefined) {
      if (signal?.aborted) return K();
      let B;
      let te = "no answer";
      let xe;
      let le = false;
      try {
        B = await Ae(undefined, []);
      } catch (error) {
        if (error instanceof RelayOnlyCancelledError) throw error;
        le = error instanceof RelayOnlyUnsentError;
        te = errBody(error instanceof Error ? error.message : String(error));
        xe = publishErrorTelemetry(error, tele.t0);
      }
      let he = B?.ok && B.status === 200 ? Ie(B.data) : undefined;
      if (he !== undefined) {
        slug = he;
        Lt(he);
      }
      if (signal?.aborted) return K();
      if (he === undefined) {
        let Se = B?.ok ? ft(B) : undefined;
        if (Se) return publishError(`${Se.message} \u2014 nothing was published; try again after the reset.`);
        if (!le && (!B?.ok || (B.status !== 403 && B.status !== 404)))
          logFeatureSad("artifact_publish", "reserve_unavailable", {
            ...P,
            reserve_status: B?.ok ? B.status : 0,
            ...xe,
          });
        logForDebugging(
          `[artifact] could not reserve a slug before publishing (${B === undefined ? te : B.ok ? `HTTP ${B.status}` : B.reason}); publishing without one \u2014 the server assigns it`,
        );
      }
    }
    let qe;
    let bn = [];
    let _n = {};
    if (!Fe && Be.length > 0 && !slug) {
      let B = Object.create(null);
      for (let [key, value] of Object.entries(Ce))
        if (value !== null && "content" in value && value.content !== undefined) B[key] = value;
      if (signal?.aborted) return K();
      let te = await Rt({
        ...tt,
        ...(force && {
          force: true,
        }),
        manifest: B,
        mode: "replace",
      });
      if (!te.ok) {
        logFeatureBad("artifact_publish", te.reason, P);
        return publishError(`publish unavailable: ${te.reason}`);
      }
      if (!te.fromFrame) {
        logFeatureBad("artifact_publish", "relay_error", {
          ...P,
          deploy_status: te.status,
        });
        return publishError(relayHttpUnknown(te.status));
      }
      if (te.status === 400 || te.status === 404) {
        let le = formatFrameErrorBody(te.data);
        if (te.status === 400 && isUnknownLiveFieldError(le, et)) {
          logFeatureBad("artifact_publish", "live_files_unsupported", P);
          return publishError(deploy400Message(le, et.emptyPatch));
        }
        if (te.status === 400 && isIgnorable400(le, et)) {
          logFeatureBad("artifact_publish", "ldx_unsupported", P);
          return publishError(deploy400Fallback(le));
        }
        if (te.status === 404 || (UNKNOWN_FIELD_ERROR_RE.test(le) && MANIFEST_FIELD_RE.test(le))) {
          logFeatureBad("artifact_publish", "multifile_unsupported", P);
          return It(te.status, le);
        }
      }
      if (te.status !== 200) {
        let le = classifyPublishResponse(
          te.status,
          te.data,
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
            retryAfter: te.response?.headers?.["retry-after"],
          },
        );
        if (le.code !== "thumbnail_rejected")
          logFeatureBad("artifact_publish", le.code ?? "deploy_failed", {
            ...P,
            deploy_status: te.status,
            ...le.extra,
          });
        return publishErrorResult(le, `deploy ${te.status}: ${errBody(te.data)}`);
      }
      let xe = publishResponseSchema().safeParse(te.data);
      if (!xe.success) {
        logFeatureBad("artifact_publish", "deploy_incomplete", P);
        return publishError(malformedDeployResponse());
      }
      slug = xe.data.slug;
      Q = xe.data.version;
      qe = renderEmbeds(te.data);
      bn = renderWarnings(te.data);
      _n = {
        contract: xe.data.contract,
        preferredContract: xe.data.preferredContract,
        capabilities: xe.data.capabilities,
      };
      recordOwnPublish(y.ownPublishes, slug, Q, {
        merged: isMergedResponse(te.data),
      });
      de = ` (The artifact was created with its inline files: to add the remaining files, fix the problem and publish again to slug ${slug}.)`;
    }
    if (!Fe && Be.length > 0) {
      if (slug === undefined) {
        logFeatureBad("artifact_publish", "deploy_incomplete", P);
        return publishError("internal: no slug available for staged upload");
      }
      let B = new Set();
      for (let xe of nt) {
        if (signal?.aborted) return K();
        let le = await pt(slug, xe);
        if (!le.ok) {
          logFeatureBad("artifact_publish", le.reason, P);
          return publishError(`upload unavailable: ${le.reason}.${de}`);
        }
        if (le.status === 404) {
          logFeatureBad("artifact_publish", "multifile_unsupported", P);
          return It(404, "", {
            maybeGone: h.slug !== undefined,
            debris: de,
          });
        }
        if (le.status !== 200) {
          let he = ft(le);
          if (he) return publishError(`${he.message} \u2014 try again after the reset.${de}`);
          if (D(le) && Q === undefined) return fe(le);
          logFeatureBad("artifact_publish", le.fromFrame ? "upload_failed" : "upload_relay_error", {
            ...P,
            upload_status: le.status,
          });
          return publishError(
            le.fromFrame
              ? `file upload ${le.status}: ${errBody(le.data)}.${de}`
              : `file upload failed (relay HTTP ${le.status}).${de}`,
          );
        }
        for (let he of le.data?.files ?? []) if (he.sha256) B.add(he.sha256);
      }
      let filtered = Be.filter((xe) => !B.has(xe.sha));
      if (filtered.length > 0) {
        logFeatureBad("artifact_publish", "upload_hash_mismatch", P);
        return publishError(
          `file upload did not stage ${filtered.length} file(s) under the ` +
            "expected content hash \u2014 not publishing a manifest that would " +
            `reference unstaged content.${de}`,
        );
      }
    }
    if (!Fe && Be.length > 0 && Q !== undefined) {
      let B = Object.create(null);
      for (let te of Be) {
        let xe = {
          sha256: te.sha,
          contentType: te.f.contentType,
        };
        Ce[te.f.path] = xe;
        B[te.f.path] = xe;
      }
      if (signal?.aborted) return K();
      ce = Q;
      I = await Rt({
        ...tt,
        slug,
        manifest: B,
        mode: "patch",
        baseVersion: Q,
      });
    } else if (!Fe) {
      if (signal?.aborted) return K();
      I = await Rt({
        ...tt,
        ...(slug && {
          slug,
        }),
        ...(force && {
          force: true,
        }),
        ...(baseVersion && {
          baseVersion,
        }),
        manifest: st(Ce),
        mode: ge,
      });
    }
    if (I === undefined) {
      logFeatureBad("artifact_publish", "deploy_incomplete", P);
      return publishError("internal: publish flow completed without a deploy");
    }
    if (!I.ok) {
      logFeatureBad("artifact_publish", I.reason, P);
      return publishError(
        (I.reason === "no-auth"
          ? describeArtifactAuthFailure(I.detail)
          : `publish unavailable: ${I.reason}`) + de,
      );
    }
    if (!I.fromFrame) {
      logFeatureBad("artifact_publish", "relay_error", {
        ...P,
        deploy_status: I.status,
      });
      return publishError(relayHttpUnknown(I.status) + de);
    }
    if (I.status === 400 || I.status === 404) {
      let B = formatFrameErrorBody(I.data);
      if (I.status === 400 && isUnknownLiveFieldError(B, et)) {
        logFeatureBad("artifact_publish", "live_files_unsupported", P);
        return publishError(deploy400Message(B, et.emptyPatch) + de);
      }
      if (I.status === 400 && isIgnorable400(B, et)) {
        logFeatureBad("artifact_publish", "ldx_unsupported", P);
        return publishError(deploy400Fallback(B) + de);
      }
      let te = I.status === 404 && tele.isRedeploy && isFrameNotFoundBody(I.data);
      if ((I.status === 404 && !te) || (UNKNOWN_FIELD_ERROR_RE.test(B) && MANIFEST_FIELD_RE.test(B))) {
        logFeatureBad("artifact_publish", "multifile_unsupported", P);
        return It(I.status, B, {
          maybeGone: I.status === 404 && h.slug !== undefined,
          debris: de,
        });
      }
    }
    if ((baseVersion !== undefined || Q !== undefined || isFrameBaseVersionEnabled()) && I.status === 409) {
      let B =
        liveConflictOf(I.data) ??
        (Pt
          ? preconditionConflictOf(I.data, new Set([...Object.keys(Ce), ...Je.map((te) => te.c.path)]))
          : null);
      if (B) {
        logFeatureBad("artifact_publish", "conflict", {
          ...P,
          ...(tele.baseRebase !== undefined && {
            if_match_sent: Pt,
          }),
          ...(B.paths !== undefined && {
            conflict_reason: fromEnum("precondition_failed"),
            conflict_paths: B.paths.length,
          }),
        });
        return {
          url: null,
          slug: null,
          version: null,
          err:
            (B.paths !== undefined ? changedFilesConflictMessage(B, B.paths) : staleBaseConflictMessage(B)) +
            de,
          conflict: true,
          conflictDetail: B,
        };
      }
    }
    if (I.status !== 200) {
      let B = classifyPublishResponse(
        I.status,
        I.data,
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
          retryAfter: I.response?.headers?.["retry-after"],
          reservedSlug: ht,
          created: ht === undefined && de !== "",
        },
      );
      if (B.code !== "thumbnail_rejected")
        logFeatureBad("artifact_publish", B.code ?? "deploy_failed", {
          ...P,
          deploy_status: I.status,
          ...B.extra,
        });
      let te = B.code === "path_is_live" ? getErrnoPath_2(I.data) : undefined;
      return {
        ...publishErrorResult(
          B,
          `deploy ${I.status}: ${errBody(I.data)}`,
          B.code === "rate_limited" && ht !== undefined ? "" : de,
        ),
        ...(te !== undefined && {
          refusedLivePath: te,
        }),
        ...(h.slug === undefined &&
          slug !== undefined &&
          Q !== undefined && {
            created: {
              slug,
              version: Q,
            },
          }),
      };
    }
    let Le = publishResponseSchema().safeParse(I.data);
    if (!Le.success) {
      logFeatureBad("artifact_publish", "deploy_incomplete", P);
      return publishError(malformedDeployResponse() + de);
    }
    let { slug: slug_2, version, read, shared, kind } = Le.data;
    if (slug && slug_2 !== slug) {
      logFeatureBad("artifact_publish", "deploy_slug_mismatch", P);
      return publishError(wrongArtifactAnswer() + de);
    }
    let zn = renderDocs(I.data);
    let mapped_2 = zn?.map((B) => B.path);
    let filtered = (mapped_2 ?? []).filter((B) => (B === "index.html" ? Ne : Me[B])?.live === true);
    let filtered_2 = (mapped_2 ?? []).filter((B) => (B === "index.html" ? Ne : Me[B])?.reseed === true);
    let sliced = uniq([
      ...(Ye.length > 0 ? [copiedFilesLeftOutNote(Ye)] : []),
      ...bn,
      ...renderWarnings(I.data),
      ...embedsToDocs(filtered),
      ...pinsToDocs(filtered_2),
      ...docsToDocs(Y.filter((B) => B !== "index.html")),
      ...(ze ? emptyList() : []),
      ...warningsToDocs(
        detach,
        Object.keys(Me).filter((key) => Me[key]?.live === false),
      ),
      ...newWarnings(
        mapped_2?.filter((B) => !Y.includes(B)),
        new Set([...Object.keys(Ce), ...Je.map((B) => B.c.path)]),
      ),
    ]).slice(0, READ_BACK_LIMITS);
    let included = Y.includes("index.html");
    let ri = renderEmbeds(I.data) ?? qe;
    let intHeader = parseIntHeader(I.response?.headers?.[X_FRAME_PUSH_REMAINING]);
    let pushResetAt = dailyResetFromHeader(I.response?.headers?.date);
    let ii = mergedChangesFields(
      Le.data,
      force ? undefined : ce,
      new Set([...Object.keys(Ce), ...Je.map((B) => B.c.path), ...(mapped_2 ?? [])]),
    );
    recordOwnPublish(y.ownPublishes, slug_2, version, {
      merged: isMergedResponse(I.data),
    });
    let si = typeInstanceFields(Le.data);
    let ai = {
      ...P,
      ...(copiedFiles.length > 0 && {
        n_left_out: Ye.length,
      }),
      e2e_ms: Math.round(performance.now() - tele.t0),
      is_redeploy: tele.isRedeploy,
      has_caps: tele.hasCaps,
      push_remaining_seen: intHeader !== undefined,
      read_back_echoed: si.readBackEchoed === true,
      staged_files: Be.length,
      files_omitted: filesOmitted,
      publish_path: fromEnum(Fe ? "preflight" : at ? "legacy" : "inline"),
      ...(tele.baseRebase !== undefined && {
        if_match_sent: Pt,
      }),
      ...mergedTelemetry(ii.mergedOver),
    };
    if (Ye.length > 0) logFeatureSad("artifact_publish", "copy_left_out", ai);
    else logFeatureOk("artifact_publish", ai);
    let oi = e === null ? splitManifestPaths(I.data) : undefined;
    return {
      url: artifactViewerUrl(slug_2),
      slug: slug_2,
      version,
      err: null,
      ...(intHeader !== undefined && {
        pushRemaining: intHeader,
        pushResetAt,
      }),
      ...(Ye.length > 0 && {
        copiedLeftOut: Ye.map((B) => B.file),
      }),
      ...(read !== undefined && {
        read,
      }),
      ...(shared !== undefined && {
        shared,
      }),
      ...publishEchoFields(Le.data, tt.deadline !== undefined),
      ...ii,
      ...(Nt.deadline && {
        deadlineDropped: true,
      }),
      ...(Nt.icon && {
        iconDropped: true,
      }),
      ...capabilitiesEchoFields(
        Le.data.contract !== undefined
          ? Le.data
          : {
              ...Le.data,
              ..._n,
            },
        b,
      ),
      ...si,
      ...(kind !== undefined && {
        kind,
      }),
      ...(sliced.length > 0 && {
        warnings: sliced,
      }),
      ...(ri !== undefined && {
        embeds: ri,
      }),
      ...(oi !== undefined && {
        manifestPaths: oi,
      }),
      ...(mapped_2 !== undefined && {
        livePaths: mapped_2,
      }),
      ...(zn !== undefined && {
        liveDocs: zn,
      }),
      ...(filtered.length > 0 && {
        bornLive: filtered,
      }),
      ...(filtered_2.length > 0 && {
        reseeded: filtered_2,
      }),
      ...(included && {
        pageCarriedLive: true,
      }),
    };
  } catch (error) {
    if (error instanceof RelayOnlyUnsentError) {
      if (!ve && h.slug === undefined)
        return error instanceof RelayOnlyCancelledError ? publishCancelledResult() : relayOnlyUnsentResult(P);
      if (error instanceof RelayOnlyCancelledError)
        return publishError(
          outcomeUnknownMessage("the publish was cancelled before a later request of it went out") + de,
        );
      logFeatureBad("artifact_publish", "relay_only_unsent_after_deploy", P);
      return publishError(
        outcomeUnknownMessage("a later request could not go through the cloud session's gateway") + de,
      );
    }
    if (!isRelayOnlyCancelled(error))
      logFeatureBad(
        "artifact_publish",
        error instanceof PublishTransportError ? "relay_request_error" : "request_error",
        {
          ...P,
          ...publishErrorTelemetry(error, tele.t0),
          ...ut,
        },
      );
    return publishError((error instanceof Error ? error.message : String(error)) + de);
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
