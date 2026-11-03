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
import { extname, extname as extname_2 } from "path";
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
import { I1t, qFr } from "./requestMeta.js";
import { formatFrameErrorBody, UNKNOWN_FIELD_ERROR_RE, buildFrameHeaders, Xor } from "./frameApi.js";
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
  Ha,
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
import { renderDocs, renderWarnings, sa, aa, renderEmbeds, Vl, Yl, zl, Wl } from "./renderBudget.js";
import { READ_BACK_LIMITS, readBackAfterPublish } from "./readBack.js";
import { recordOwnPublish, withPublishInFlight } from "./ownPublishes.js";
import {
  contentTypeForPath,
  baseMediaType,
  lineColumnAt,
  U5n,
  Yi,
  copyPreflightFailure,
  copiedFilesSummary,
  kn,
  B5n,
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
import { HBe } from "../../constants/claudeAiOrigin.js";
import { getOauthConfig } from "../../constants/oauth.js";

/**
 * 多文件 artifact 发布：写入/删除/复制文件、路径固定检查、预检、上传与缩略图，组装遥测。
 */
//@ chunk-06y4szbn.js:103080-109169 placement
async function publishFilesVersion(e, n, r, s, h, b, y, x, w, R, C, k, V, L = void 0) {
  let q = {
      page_bytes: b.pageBytes,
      lane: fromEnum(b.lane),
      forced: b.forced,
      is_redeploy: b.isRedeploy,
      has_base_version: s !== void 0,
      ...(V !== void 0 && { reserved: !0 }),
      template: fromEnum("plain"),
      ...getThumbnailCount(n),
      ...(k !== void 0 && k.length > 0 && { n_files: k.length }),
    },
    W;
  if (w !== void 0 && k !== void 0 && k.length > 0) {
    let ie = validateFileLists(e, k, []);
    if (ie !== null) return (logFeatureBad("artifact_publish", ie.kind, q), publishError(ie.msg));
    let create = Object.create(null);
    create["index.html"] = { content: e, contentType: "text/html", live: !0 };
    let Oe = TEXT_FILE_MAX_BYTES - $t(e);
    for (let ye of k) {
      let Ee = encodeManifestContent(ye);
      if (((Oe -= $t(Ee)), Oe < 0))
        return (logFeatureBad("artifact_publish", "too_large", q), publishError("file too large"));
      create[ye.path] = { content: Ee, contentType: ye.contentType, ...(ye.live === !0 && { live: !0 }) };
    }
    W = create;
  }
  let G = null,
    P = "none",
    j = !n.slug,
    X,
    ge = trackUploadBytes(q);
  try {
    let ie = h,
      Z = s,
      Oe = !1,
      ye = V !== void 0 ? { ...n, slug: V } : n;
    logForDebugging(
      `[artifact] publish \u2192 ${w ?? "/api/frame/deploy/direct"}${W !== void 0 ? ` (files: ${Object.keys(W).length})` : ""}`,
    );
    let Ee = !0,
      bt = () => {
        let se = Ee;
        return (
          (Ee = !1),
          deployWithRetry(
            (ve) =>
              postDeploy(
                w ?? deployQuery(ve, n),
                {
                  ...publishMetadataFields(ye),
                  ...I1t(),
                  ...qFr(),
                  ...r,
                  ...(w === void 0 && ie && { force: !0 }),
                  ...(w === void 0 && Z && { baseVersion: Z }),
                  ...(w === void 0 && Oe && !Z && ye.slug && { expectUnpublished: !0 }),
                  ...(W !== void 0 ? { files: W } : { content: e }),
                },
                x,
                (zt) => (X = zt),
                ge,
                ve,
                L,
                C,
              ),
            R,
            C,
            q,
            !0,
            w === void 0 && ye.slug !== void 0,
            se,
          )
        );
      },
      Xe = { deadline: !1, icon: !1, request_id: !1 },
      He = async () => {
        let se = await bt();
        for (let ve = droppedFieldOn400(ye, se); ve !== void 0; ve = droppedFieldOn400(ye, se))
          (logFeatureSad("artifact_publish", `${ve}_rejected`, q),
            logForDebugging(`[artifact] ${ve} refused upstream \u2014 retrying without it`),
            (ye = withoutField(ye, ve)),
            (Xe[ve] = !0),
            (se = await bt()));
        return se;
      },
      Y = await He();
    if (ie && Y.ok && Y.fromFrame && Y.status === 400) {
      let se = formatFrameErrorBody(Y.data);
      if (
        UNKNOWN_FIELD_ERROR_RE.test(se) &&
        (/\bforce\b/.test(se) || (Z !== void 0 && /\bbaseVersion\b/.test(se)))
      )
        (logFeatureSad("artifact_publish", "force_field_rejected", q),
          logForDebugging("[artifact] CP rejected force/baseVersion as unknown \u2014 retrying without them"),
          (ie = !1),
          (Z = void 0),
          (Y = await He()));
    }
    if (
      ie &&
      Z &&
      Y.ok &&
      Y.fromFrame &&
      Y.status === 400 &&
      /force and baseVersion are mutually exclusive/.test(formatFrameErrorBody(Y.data))
    )
      (logFeatureSad("artifact_publish", "exclusivity_retry", q),
        logForDebugging(
          "[artifact] pre-relaxation CP rejected force+baseVersion \u2014 retrying without the precondition",
        ),
        (Z = void 0),
        (Y = await He()));
    let De = (se) =>
      se.reason === "no-auth" ? describeArtifactAuthFailure(se.detail) : `publish unavailable: ${se.reason}`;
    if (!Y.ok) return (logFeatureBad("artifact_publish", Y.reason, q), publishError(De(Y)));
    if (((G = Y.fromFrame ? strandedSlugFrom(Y.status, Y.data) : null), G && !j && G.slug !== n.slug))
      return (
        logFeatureBad("artifact_publish", "deploy_slug_mismatch", q),
        publishError(wrongArtifactAnswer())
      );
    if (G && G.kind === void 0 && w === void 0 && !C?.aborted) {
      let se = backoffMs(2, Y.response?.headers?.["retry-after"]);
      (logForDebugging(
        `[artifact] /deploy/direct 503 after commit (${G.slug}) \u2014 retrying against it in ${se}ms`,
      ),
        R?.({ status: 503, attempt: 2, maxAttempts: 2, delayMs: se }));
      try {
        if ((await sleep(se, C), !C?.aborted)) {
          if (j) ((ye = { ...ye, slug: G.slug }), (Oe = G.live === void 0), (ie = !1));
          if (G.live !== void 0) Z = G.live;
          ((P = "unknown"), (Ee = !0));
          try {
            Y = await He();
          } catch (error) {
            if (!(error instanceof RelayOnlyUnsentError)) throw error;
            return (
              (P = error instanceof RelayOnlyCancelledError ? "cancelled" : "unsent"),
              publishRetryNote(
                publishError(
                  P === "cancelled" ? "publish cancelled" : "The publish failed with a server error (503)",
                ),
                G,
                j,
                P,
              )
            );
          }
          P = "answered";
        }
      } finally {
        (logFeatureSad("artifact_publish", "deploy_stranded_retried", {
          ...q,
          fresh_publish: j,
          deploy_final_status: P === "answered" && Y.ok ? Y.status : 0,
          ...(C?.aborted && { cancelled: !0 }),
        }),
          R?.({ settled: !0 }));
      }
      if (!Y.ok)
        return (
          logFeatureBad("artifact_publish", Y.reason, q),
          publishRetryNote(publishError(De(Y)), G, j, P)
        );
    }
    if (!Y.fromFrame)
      return (
        logFeatureBad("artifact_publish", "relay_error", { ...q, deploy_status: Y.status }),
        publishRetryNote(publishError(relayHttpUnknown(Y.status)), G, j, P)
      );
    if (((Z ?? s) || Oe || isFrameBaseVersionEnabled()) && Y.status === 409) {
      let se = liveConflictOf(Y.data);
      if (se)
        return (
          logFeatureBad("artifact_publish", "conflict", q),
          publishRetryNote(
            { ...publishError(staleBaseConflictMessage(se)), conflict: !0, conflictDetail: se },
            G,
            j,
            P,
          )
        );
    }
    if (w !== void 0 && Y.status === 404)
      return (
        logFeatureBad("artifact_publish", "create_not_enabled", { ...q, deploy_status: 404 }),
        publishError("create endpoint not available (404) \u2014 nothing was created")
      );
    if (Y.status === 400 && isIgnorable400(formatFrameErrorBody(Y.data), { ldx: !1 }))
      return (
        logFeatureBad("artifact_publish", "ldx_unsupported", q),
        publishRetryNote(publishError(deploy400Fallback(formatFrameErrorBody(Y.data))), G, j, P)
      );
    if (Y.status < 200 || Y.status >= 300) {
      let se = classifyPublishResponse(
        Y.status,
        Y.data,
        b.isRedeploy,
        b.echoedPin !== void 0 ? { pin: b.echoedPin, declaredCaps: b.hasCaps } : void 0,
        b.liveFilesOn === !0,
        b.sent,
        { retryAfter: Y.response?.headers?.["retry-after"], reservedSlug: V, created: j && G !== null },
      );
      if (se.code !== "thumbnail_rejected")
        logFeatureBad("artifact_publish", se.code ?? "deploy_failed", {
          ...q,
          deploy_status: Y.status,
          ...se.extra,
        });
      let ve = se.code === "path_is_live" ? getErrnoPath_2(Y.data) : void 0;
      return publishRetryNote(
        {
          ...publishErrorResult(se, `deploy ${Y.status}: ${errBody(Y.data)}`),
          ...(ve !== void 0 && { refusedLivePath: ve }),
        },
        G,
        j,
        P,
      );
    }
    let safeParse = publishResponseSchema().safeParse(Y.data);
    if (!safeParse.success)
      return (
        logFeatureBad("artifact_publish", "deploy_incomplete", q),
        publishRetryNote(publishError(malformedDeployResponse()), G, j, P)
      );
    let { slug: slug, version: version, read: read, shared: shared, kind: kind } = safeParse.data;
    if (ye.slug && slug !== ye.slug)
      return (
        logFeatureBad("artifact_publish", "deploy_slug_mismatch", q),
        publishRetryNote(publishError(wrongArtifactAnswer()), G, j, P)
      );
    if (w !== void 0 && (FRAME_CONSTANTS == null || kind !== FRAME_CONSTANTS.LIVE_DOC_KIND))
      return (
        logFeatureBad("artifact_publish", "deploy_incomplete", q),
        publishError(malformedDeployResponse())
      );
    let Ve = renderDocs(Y.data),
      $e = Ve?.map((se) => se.path),
      Ht =
        w === void 0
          ? new Set()
          : new Set([
              "index.html",
              ...Object.entries(W ?? {})
                .filter(([, se]) => se.live === !0)
                .map(([se]) => se),
            ]),
      filtered = ($e ?? []).filter((se) => Ht.has(se)),
      sliced = [
        ...renderWarnings(Y.data),
        ...sa(filtered),
        ...aa($e, new Set(["index.html", ...Object.keys(W ?? {})])),
      ].slice(0, READ_BACK_LIMITS),
      Ot = renderEmbeds(Y.data),
      yt = parseIntHeader(Y.response?.headers?.[X_FRAME_PUSH_REMAINING]),
      et = dailyResetFromHeader(Y.response?.headers?.date),
      ut = mergedChangesFields(
        safeParse.data,
        ie ? void 0 : Z,
        new Set(["index.html", ...Object.keys(W ?? {}), ...($e ?? [])]),
      );
    recordOwnPublish(y, slug, version, { merged: isMergedResponse(Y.data) });
    let ke = typeInstanceFields(safeParse.data);
    return (
      logFeatureOk("artifact_publish", {
        ...q,
        e2e_ms: Math.round(performance.now() - b.t0),
        is_redeploy: b.isRedeploy,
        has_caps: b.hasCaps,
        push_remaining_seen: yt !== void 0,
        ...mergedTelemetry(ut.mergedOver),
        read_back_echoed: ke.readBackEchoed === !0,
      }),
      {
        url: artifactViewerUrl(slug),
        slug: slug,
        version: version,
        err: null,
        ...(yt !== void 0 && { pushRemaining: yt, pushResetAt: et }),
        ...(read !== void 0 && { read: read }),
        ...(shared !== void 0 && { shared: shared }),
        ...publishEchoFields(safeParse.data, carriesDeadline(ye)),
        ...ut,
        ...(Xe.deadline && { deadlineDropped: !0 }),
        ...(Xe.icon && { iconDropped: !0 }),
        ...capabilitiesEchoFields(safeParse.data, r, w !== void 0),
        ...ke,
        ...(kind !== void 0 && { kind: kind }),
        ...(sliced.length > 0 && { warnings: sliced }),
        ...(Ot !== void 0 && { embeds: Ot }),
        ...($e !== void 0 && { livePaths: $e }),
        ...(Ve !== void 0 && { liveDocs: Ve }),
        ...(filtered.length > 0 && { bornLive: filtered }),
      }
    );
  } catch (error) {
    if (error instanceof RelayOnlyUnsentError)
      return error instanceof RelayOnlyCancelledError ? publishCancelledResult() : relayOnlyUnsentResult(q);
    if (!isRelayOnlyCancelled(error))
      logFeatureBad(
        "artifact_publish",
        error instanceof PublishTransportError ? "relay_request_error" : "request_error",
        { ...q, ...publishErrorTelemetry(error, b.t0), ...X },
      );
    return publishRetryNote(publishError(error instanceof Error ? error.message : String(error)), G, j, P);
  }
}
//@ chunk-06y4szbn.js:109169-109179 placement
var MAX_COPY_SOURCES = 4;
//@ chunk-06y4szbn.js:109179-109242 placement
function bufferToText(e) {
  return typeof e === "string" ? e : e.toString("utf8");
}
//@ chunk-06y4szbn.js:109242-111832 placement
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
  ]),
  jn = new Set([
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
  ]),
  Rc = [
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
  ],
  Ac = [
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
function notServedFileExtra(e, n) {
  let sliced = extname(e).toLowerCase().slice(1),
    found = Rc.find((w) => w === sliced),
    h =
      sliced === ""
        ? fromEnum("none")
        : contentTypeForPath(e) !== void 0
          ? fromEnum("served")
          : found !== void 0
            ? fromEnum(found)
            : fromEnum("other");
  if (n === void 0) return { refused_ext: h };
  let b = baseMediaType(n),
    found_2 = Ac.find((w) => w === b),
    x = jn.has(b) ? fromEnum("served_variant") : found_2 !== void 0 ? fromEnum(found_2) : fromEnum("other");
  return { refused_ext: h, refused_type: x };
}
/**
 * 发布文件的限制常量：XML 类内容类型、单次清单请求预算、版本总字节、二进制文件上限、各类大小与条目数上限，以及识别 manifest/mode 字段的正则。
 */
//@ chunk-06y4szbn.js:112146-112323 placement
var XML_CONTENT_TYPES = new Set(["image/svg+xml", "text/xml", "application/xml"]),
  MANIFEST_REQUEST_BUDGET = 67108864,
  VERSION_TOTAL_BYTES = 268435456,
  BINARY_FILE_MAX_BYTES = 15728640,
  TEXT_FILE_MAX_BYTES = 12582912,
  MANIFEST_UPLOAD_THRESHOLD_BYTES = 1048576,
  MAX_REQUEST_WIRE_BYTES = 20971520,
  MAX_PATH_SEGMENT_LENGTH = 256,
  VERSION_MAX_ENTRIES = 512,
  MANIFEST_FIELD_RE = /\b(manifest|mode)\b/;
//@ chunk-06y4szbn.js:112323-112531 placement
function encodeManifestContent(e) {
  if (MANIFEST_TEXT_TYPES.has(e.contentType))
    return typeof e.content === "string" ? e.content : e.content.toString("utf8");
  return (typeof e.content === "string" ? Buffer.from(e.content, "utf8") : e.content).toString("base64");
}
//@ chunk-06y4szbn.js:112531-112645 placement
function getThumbnailCount(e) {
  let n = (e.thumbnail !== void 0 ? 1 : 0) + (e.thumbnailDark !== void 0 ? 1 : 0);
  return n > 0 && isFrameDeclaredThumbnailEnabled() ? { thumbnails: n } : {};
}
//@ chunk-06y4szbn.js:112645-112710 placement
function Ms(e) {
  return e !== void 0 && isFrameDeclaredThumbnailEnabled() ? Math.ceil(e.length / 3) * 4 : 0;
}
//@ chunk-06y4szbn.js:112710-112813 placement
function getContentByteLength(e) {
  return typeof e.content === "string" ? Buffer.byteLength(e.content, "utf8") : e.content.length;
}
//@ chunk-06y4szbn.js:112813-112868 placement
function $t(e) {
  return Buffer.byteLength(jsonStringify(e), "utf8") - 2;
}
//@ chunk-06y4szbn.js:112868-113188 placement
function manifestDeltas(e, n) {
  let create = Object.create(null),
    keys = Object.keys(e);
  if (keys.length === 0) return;
  for (let h of keys) {
    let b = e[h],
      y = n.get(h);
    if (y === void 0 || b === void 0) return;
    if (b === null) {
      if (y === null) return;
      create[h] = { delete: !0, ifMatch: y };
      continue;
    }
    if (!("contentType" in b) || b.live !== void 0 || b.reseed !== void 0) return;
    create[h] = { ...b, ifMatch: y };
  }
  return create;
}
//@ chunk-06y4szbn.js:113188-113259 placement
var PATCH_ERROR_PATTERNS = /unknown field "(live|reseed)"/,
  Pc = /manifest must not be empty/;
//@ chunk-06y4szbn.js:113259-116262 placement
function validateFileLists(e, n, r) {
  let s = (w) => ({ kind: "files_invalid", msg: w }),
    h = (w) => ({ kind: "too_large", msg: w });
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
    if ((y.add(w.path), typeof w.content === "string" && !MANIFEST_TEXT_TYPES.has(w.contentType)))
      return s(
        `file ${jsonStringify(w.path)}: contentType ${jsonStringify(w.contentType)} ` +
          "is binary \u2014 pass its content as a Buffer (raw bytes), not a string",
      );
    let R = MANIFEST_TEXT_TYPES.has(w.contentType),
      C = getContentByteLength(w),
      k = R ? MAX_ARTIFACT_BYTES : BINARY_FILE_MAX_BYTES;
    if (C > k)
      return h(
        `file ${jsonStringify(w.path)} is ${Math.ceil(C / 1024 / 1024)}MB (per-file max ${k / 1024 / 1024}MB${R ? "" : " for binary files, which must fit an upload request base64-encoded"})`,
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
    if (R && C > MAX_REQUEST_WIRE_BYTES / 6) {
      let V = $t(encodeManifestContent(w));
      if (V > MAX_REQUEST_WIRE_BYTES)
        return h(
          `file ${jsonStringify(w.path)} is ${Math.ceil(V / 1024 / 1024)}MB JSON-encoded on the wire (per-request max ${MAX_REQUEST_WIRE_BYTES / 1024 / 1024}MB) \u2014 ` +
            "heavily escaped text (quotes, backslashes, control characters) inflates when JSON-encoded; split or shrink the file",
        );
    }
    x += C;
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
  let b = new Set(["index.html", ...n.map((x) => x.path), ...s]),
    y = new Set();
  for (let x of r) {
    if (!x.path || x.path === "index.html")
      return x.path
        ? e === null
          ? `files must not contain "index.html" \u2014 it is the Artifact type's page and can't be changed here`
          : 'files must not contain "index.html" \u2014 the page argument is the index'
        : "every file needs a non-empty path";
    if (b.has(x.path))
      return `${jsonStringify(x.path)} is listed more than once in \`files\` (once as a copy from another artifact). List each path once.`;
    if ((b.add(x.path), !ARTIFACT_SLUG_RE.test(x.from.slug) || !x.from.path))
      return `file ${jsonStringify(x.path)}: its source must name an artifact and a published path`;
    if (x.from.path === "index.html")
      return `file ${jsonStringify(x.path)}: another artifact's page (index.html) is not a copyable file \u2014 read it and publish your own content`;
    for (let w of [x.path, x.from.path]) {
      let R = contentTypeForPath(w);
      if (R !== void 0 && U5n.has(baseMediaType(R)))
        return `file ${jsonStringify(x.path)}: an HTML or XML document cannot be copied from another artifact \u2014 read it with action "read_file" and publish it as your own file`;
    }
    y.add(`${x.from.slug}@${x.from.ver ?? ""}`);
  }
  if (y.size > MAX_COPY_SOURCES)
    return `files copy from ${y.size} source artifact versions; at most ${MAX_COPY_SOURCES} per publish`;
  return null;
}
//@ chunk-06y4szbn.js:118123-118323 placement
function filesOnlyPublishProblem(e, n) {
  let r = validateSupportingFiles(e, "file");
  if (r !== null) return r.err;
  if (n.length > 0 && !isFrameCopyFromEnabled())
    return (
      logFeatureBad("artifact_publish", "copy_from_flag_off", { n_copied: n.length }),
      COPY_FROM_DISABLED_TEXT
    );
  return validateFileLists(null, e, [])?.msg ?? copySourcesProblem(null, e, n, []);
}
//@ chunk-06y4szbn.js:118323-120256 placement
async function publishInstanceFiles(e, n) {
  if (getArtifactPublishStubDir() !== null)
    return publishError(
      "publishing to an Artifact created from an Artifact type is not available in eval stub mode",
    );
  let r = n.copiedFiles ?? [];
  if (!(getLiveState().frozenArtifactTypes?.typesOn ?? isFrameMultiFileEnabled())) {
    let x = n.removeFiles ?? [];
    return (
      logFeatureBad("artifact_publish", "multifile_flag_off", {
        n_files: e.length + r.length,
        n_removed: x.length,
      }),
      publishError(
        "This artifact was created from an artifact type, so it takes supporting files only, and " +
          (x.length > 0
            ? "its files can't be changed from this session. Nothing was published or removed; the artifact is unchanged."
            : "supporting files can't be published from this session. Nothing was published; the artifact is unchanged."),
      )
    );
  }
  if (r.length > 0 && !isFrameCopyFromEnabled())
    return (
      logFeatureBad("artifact_publish", "copy_from_flag_off", { n_copied: r.length }),
      publishError(COPY_FROM_DISABLED_TEXT)
    );
  let h = validateSupportingFiles(e, "file");
  if (h !== null) return h;
  let b = await checkHostGrantCarry({
    slug: n.slug,
    hostGrant: readHostGrant(env.CLAUDE_ARTIFACT_HOST_GRANT),
    storedCaps: void 0,
    signal: n.signal,
    credentials: n.credentials,
    lane: "files",
  });
  if (!b.ok) return publishError(b.err);
  let y = {
    slug: n.slug,
    title: n.title,
    favicon: n.favicon,
    ...(n.label !== void 0 && { label: n.label }),
    ...(n.note !== void 0 && { note: n.note }),
    ...(n.deadline !== void 0 && { deadline: n.deadline }),
    ...(n.requestId !== void 0 && { requestId: n.requestId }),
    ...(n.description !== void 0 && { description: n.description }),
    ...(n.publishContext !== void 0 && { publishContext: n.publishContext }),
    ...(n.originMetadata !== void 0 && { originMetadata: n.originMetadata }),
    ...(n.autoEditAttribution && { autoEditAttribution: n.autoEditAttribution }),
  };
  return withPublishInFlight(n.ownPublishes, n.slug, () =>
    readBackAfterPublish(
      sendFilesPublish(
        null,
        e,
        r,
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
            isRedeploy: !0,
            hasCaps: !1,
            forced: n.force,
            ...(n.baseRebase !== void 0 && { baseRebase: n.baseRebase }),
          },
          ...(n.copiedCrossOrgOk === !0 && { copiedCrossOrgOk: !0 }),
          ...(n.preconditions !== void 0 && { preconditions: n.preconditions }),
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
  if (!isFrameMultiFileEnabled())
    return (
      logFeatureBad("artifact_publish", "multifile_flag_off", { n_files: 0, n_removed: 0 }),
      publishError("invalid publish options")
    );
  if (![...e.base.values()].some((s) => s.live === !0)) return publishError("invalid publish options");
  let n = await checkHostGrantCarry({
    slug: e.slug,
    hostGrant: readHostGrant(env.CLAUDE_ARTIFACT_HOST_GRANT),
    storedCaps: void 0,
    signal: e.signal,
    credentials: e.credentials,
    lane: "page",
  });
  if (!n.ok) return publishError(n.err);
  let r = {
    slug: e.slug,
    title: e.title,
    favicon: e.favicon,
    ...(e.label !== void 0 && { label: e.label }),
    ...(e.deadline !== void 0 && { deadline: e.deadline }),
    ...(e.requestId !== void 0 && { requestId: e.requestId }),
    ...(e.publishContext !== void 0 && { publishContext: e.publishContext }),
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
        force: !1,
        ownPublishes: e.ownPublishes,
        tele: {
          t0: performance.now(),
          pageBytes: 0,
          lane: "inline",
          isRedeploy: !0,
          hasCaps: !1,
          forced: !1,
          liveFilesOn: !0,
        },
        liveFiles: { detach: [], base: e.base },
        onRetry: e.onRetry,
        signal: e.signal,
        credentials: e.credentials,
      },
    ),
  );
}
/**
 * 发送多文件发布请求：清单构造、内容上传（直连/中继）、合并旧版本、留空文件与重试处理。
 */
//@ chunk-06y4szbn.js:121268-147257 placement
async function sendFilesPublish(e, n, r, s, h, b, y) {
  let {
      baseVersion: baseVersion,
      force: force,
      tele: tele,
      onRetry: onRetry,
      signal: signal,
      credentials: credentials,
    } = y,
    relayOnly = y.relayOnly,
    q = y.copiedCrossOrgOk === !0,
    liveFiles = y.liveFiles,
    G = liveFiles?.detach ?? [],
    P = {
      page_bytes: tele.pageBytes,
      lane: fromEnum(tele.lane),
      n_files: n.length + r.length,
      n_copied: r.length,
      n_removed: s.length,
      forced: tele.forced,
      template: fromEnum("plain"),
      is_redeploy: tele.isRedeploy,
      has_base_version: baseVersion !== void 0,
      reserved: !1,
      ...getThumbnailCount(h),
      ...(tele.baseRebase !== void 0 && { base_rebase: fromEnum(tele.baseRebase) }),
    },
    j = (S) => (logFeatureBad("artifact_publish", "files_invalid", P), publishError(S)),
    X = (S) => (logFeatureBad("artifact_publish", "too_large", P), publishError(S)),
    ge = e === null || (h.slug !== void 0 && baseVersion !== void 0) ? "patch" : "replace";
  if (s.length > 0 && ge === "replace")
    return j(
      h.slug === void 0
        ? "A `null` entry in `files` removes a file from an existing artifact, and a first publish has nothing to remove, so nothing was published. Drop the `null` entries."
        : "A removal applies to the artifact's current version, and this publish didn't name that version (`baseVersion`), so nothing was published. Publish again with the version named, or without the `null` entries.",
    );
  if (liveFiles !== void 0 && h.slug !== void 0 && ge === "replace") return j("invalid publish options");
  if (liveFiles?.page?.reseed === !0 && liveFiles.page.live !== void 0) return j("invalid publish options");
  let ie =
    G.length > 0 ||
    liveFiles?.page?.reseed === !0 ||
    liveFiles?.page?.live === !1 ||
    n.some((S) => S.reseed === !0 || S.live === !1);
  if (ie && ge === "replace") return j("invalid publish options");
  for (let S of n) {
    if (S.reseed === !0 && S.live !== void 0) return j("invalid publish options");
    if ((S.live === !0 || S.reseed === !0) && !Yi.has(baseMediaType(S.contentType)))
      return j("invalid publish options");
    let Q = liveFiles?.base?.get(S.path);
    if (liveFiles?.base !== void 0 && Q?.live !== !0 && (S.reseed === !0 || S.live === !1))
      return j("invalid publish options");
  }
  for (let S of G)
    if (liveFiles?.base !== void 0 && liveFiles.base.get(S)?.live !== !0) return j("invalid publish options");
  if (
    liveFiles?.base !== void 0 &&
    liveFiles.base.get("index.html")?.live !== !0 &&
    (liveFiles.page?.reseed === !0 || liveFiles.page?.live === !1)
  )
    return j("invalid publish options");
  for (let S of s) if (liveFiles?.base?.get(S)?.live === !0) return j("invalid publish options");
  let Z = validateFileLists(e, n, [...s, ...G]);
  if (Z !== null) return Z.kind === "too_large" ? X(Z.msg) : j(Z.msg);
  let Oe = copySourcesProblem(e, n, r, [...s, ...G]);
  if (Oe !== null) return j(Oe);
  for (let S of r) if (liveFiles?.base?.get(S.path)?.live === !0) return j("invalid publish options");
  let ye = (S, Q) =>
      ge === "patch" && liveFiles?.base?.get(S)?.live === !0 && Q.reseed !== !0 && Q.live !== !1,
    Ee =
      ie ||
      liveFiles?.page?.live === !0 ||
      n.some((S) => S.live === !0) ||
      [...(liveFiles?.base?.values() ?? [])].some((S) => S.live),
    Xe = ge === "patch" && !force && y.preconditions === void 0 && (e !== null || Ee),
    He = (S, Q, I) => {
      let ce = Xe ? liveFiles?.base?.get(S) : void 0;
      return (
        ce !== void 0 &&
        !ce.live &&
        ce.sha256 !== void 0 &&
        ce.contentType === I &&
        ce.sha256 === computeContentHash(Q)
      );
    },
    Y = [],
    De = liveFiles?.page ?? {},
    ze = e !== null && De.live === !1,
    it = ze ? ["index.html", ...G] : G,
    Ne;
  if (ye("index.html", De)) Y.push("index.html");
  else if (
    e !== null &&
    !ze &&
    !(Ee && De.live === void 0 && De.reseed !== !0 && He("index.html", e, "text/html"))
  )
    Ne = {
      content: e,
      contentType: "text/html",
      ...(De.live !== void 0 && { live: De.live }),
      ...(De.reseed === !0 && { reseed: !0 }),
    };
  let create = Object.create(null);
  if (Ne !== void 0) create["index.html"] = Ne;
  let Be = [],
    Te = Ne?.content !== void 0 ? $t(Ne.content) : 0,
    Ve = Ms(h.thumbnail) + Ms(h.thumbnailDark),
    $e = TEXT_FILE_MAX_BYTES - Te - Ve,
    Ht = (S) => !ye(S.path, S) && (S.live === !0 || S.reseed === !0 || S.live === !1),
    create_2 = Object.create(null);
  for (let S of n.filter(Ht)) {
    let Q = encodeManifestContent(S),
      I = $t(Q);
    if (I > $e) {
      let ce = TEXT_FILE_MAX_BYTES - Te - $e;
      return X("file too large");
    }
    (($e -= I),
      (create_2[S.path] = {
        content: Q,
        contentType: S.contentType,
        ...(S.live !== void 0 && { live: S.live }),
        ...(S.reseed === !0 && { reseed: !0 }),
      }),
      (create[S.path] = create_2[S.path]));
  }
  let _t = [],
    Ot = 0;
  for (let S of n) {
    if (Ht(S)) continue;
    if (ye(S.path, S)) {
      Y.push(S.path);
      continue;
    }
    if (S.live === void 0 && He(S.path, S.content, S.contentType)) {
      Ot += 1;
      continue;
    }
    _t.push(S);
  }
  let yt = 0;
  for (let S of _t) {
    let Q = encodeManifestContent(S),
      I = $t(Q);
    if (I <= $e) (($e -= I), (yt += I), (create[S.path] = { content: Q, contentType: S.contentType }));
    else {
      let ce = computeContentHash(S.content);
      (Be.push({ f: S, sha: ce, wire: Q }), (create[S.path] = { sha256: ce, contentType: S.contentType }));
    }
  }
  for (let S of s) create[S] = null;
  for (let S of it) create[S] = { live: !1 };
  let et = {
      liveKey: it.length > 0 || Object.keys(create_2).length > 0 || Ne?.live !== void 0 || Ne?.reseed === !0,
      emptyPatch: Ee && Object.keys(create).length === 0 && r.length === 0,
      ldx: !1,
    },
    ut,
    ke = (S) => (ut = S),
    se = trackUploadBytes(P),
    ve = !1,
    zt = (S) =>
      deployWithRetry(
        (Q) =>
          postDeploy(deployQuery(Q, h), S, credentials, ke, se, Q, relayOnly, signal).then(
            (I) => ((ve = !0), I),
            (I) => {
              if (!(I instanceof RelayOnlyUnsentError)) ve = !0;
              throw I;
            },
          ),
        onRetry,
        signal,
        P,
        !1,
        typeof S.slug === "string",
        relayOnly !== void 0 && h.slug === void 0 && !ve,
      ),
    Pt = !1,
    st = (S) => {
      let Q =
        ge === "patch" && !force && y.preconditions !== void 0 ? manifestDeltas(S, y.preconditions) : void 0;
      return ((Pt = Q !== void 0), Q ?? S);
    },
    tt = { ...publishMetadataFields(h), ...I1t(), ...qFr(), ...b },
    Nt = { deadline: !1, icon: !1, request_id: !1 },
    Rt = async (S) => {
      let Q = await zt(S);
      for (let I = droppedFieldOn400(h, Q); I !== void 0 && S[I] !== void 0; I = droppedFieldOn400(h, Q)) {
        (logFeatureSad("artifact_publish", `${I}_rejected`, P),
          logForDebugging(`[artifact] ${I} refused upstream \u2014 retrying without it`),
          delete tt[I],
          (h = withoutField(h, I)),
          (Nt[I] = !0));
        let { [I]: ce, ...Ae } = S;
        ((S = Ae), (Q = await zt(S)));
      }
      return Q;
    },
    gn = 15728640,
    nt = [];
  {
    let S = [],
      Q = 0;
    for (let I of Be) {
      let ce = $t(I.wire);
      if (S.length > 0 && Q + ce > gn) (nt.push(S), (S = []), (Q = 0));
      (S.push(I), (Q += ce));
    }
    if (S.length > 0) nt.push(S);
  }
  let Wt = async (S) => {
      let Q = retryDelayMs(S);
      if (Q === void 0) return !1;
      if ((await sleep(Q, signal), signal?.aborted))
        return (logForDebugging("[artifact] 429 retry cancelled by user"), !1);
      return !0;
    },
    ft = (S) => {
      let Q = S.fromFrame && S.status === 429 ? dailyCapNotice(S.data) : void 0;
      if (Q)
        logFeatureBad("artifact_publish", "publish_cap_reached", { ...P, cap_type: fromEnum(Q.capType) });
      return Q;
    },
    mapped = r.map((S) => ({ c: S })),
    Je = [],
    Ye = [],
    Mt = { askedToLeaveOut: !1 },
    tn = (S) =>
      "c" in S
        ? {
            path: S.c.path,
            from: {
              slug: S.c.from.slug,
              path: S.c.from.path,
              ...(S.c.from.ver !== void 0 && { ver: S.c.from.ver }),
            },
          }
        : { path: S.f.path, content: S.wire, contentType: S.f.contentType },
    pt = async (S, Q) => {
      let any = Q.some((qe) => "c" in qe),
        ce = q && any,
        Ae = any ? leaveOutMissingField() : {},
        Ie = () => ({ slug: S, ...(ce && { cross_org_ok: !0 }), ...Ae, files: Q.map(tn) }),
        Fe = () => postDeploy("/api/frame/upload", Ie(), credentials, ke, se, {}, relayOnly, signal),
        Ge = async () => {
          let qe = await withPublishTiming(Fe);
          return qe.ok &&
            qe.fromFrame &&
            qe.status === 429 &&
            dailyCapNotice(qe.data) === void 0 &&
            (await Wt(qe.response?.headers?.["retry-after"]))
            ? withPublishTiming(Fe)
            : qe;
        },
        be = await Ge(),
        at =
          "leave_out_missing" in Ae && be.ok && be.fromFrame && be.status === 400
            ? leaveOutMissingRefusal(be.data, Ie())
            : void 0;
      if (at !== void 0 && !signal?.aborted) {
        if (at === "named")
          (markLeaveOutMissingRefused(), logFeatureSad("artifact_publish", "copy_leave_out_unsupported", P));
        if (
          ((Ae = {}),
          (be = await Ge()),
          at === "unnamed" && be.ok && be.fromFrame && isClientRefusalStatus(be.status, be.data))
        )
          (markLeaveOutMissingRefused(), logFeatureSad("artifact_publish", "copy_leave_out_unsupported", P));
      }
      if (any) Mt.askedToLeaveOut = "leave_out_missing" in Ae;
      return be;
    },
    It = (S, Q, I) => {
      if (Q) logForDebugging(`[artifact] manifest publish refused (HTTP ${S}): ${errBody(Q)}`);
      let ce = I?.maybeGone ? ", or the artifact no longer exists or isn't yours to update" : "";
      if (s.length > 0)
        return publishError(
          `The server didn't accept this update's file changes (HTTP ${S})${ce}. Nothing was published or removed; the artifact is unchanged. Publishing the page on its own (omitting \`files\`) would update the page but can't remove a file.${I?.debris ?? ""}`,
        );
      let Ae = I?.debris
        ? " This publish didn't finish."
        : h.slug !== void 0
          ? " Nothing was published; the artifact is unchanged."
          : " Nothing was published.";
      return publishError(
        `The server didn't accept this publish's supporting files (HTTP ${S})${ce}.${Ae} Publish the page as a single file instead: inline what it needs and omit \`files\`.${I?.debris ?? ""}`,
      );
    },
    de = "",
    ht,
    Lt = (S) => {
      ((ht = S),
        (P.reserved = !0),
        (de = ` (A slug was reserved for it: publish again to slug ${S} rather than publishing fresh.)`),
        y.onReserved?.(S));
    };
  if (h.slug === void 0 && y.reservedSlug !== void 0) Lt(y.reservedSlug);
  let D = (S) => S.fromFrame && isRateLimitedResponse(S.status, S.data),
    fe = (S, Q) => (
      logFeatureBad("artifact_publish", "rate_limited", {
        ...P,
        refused_status: S.status,
        ...refusalReasonField(S.data),
      }),
      {
        ...publishError(
          rateLimitedResult({
            retryAfter: S.response?.headers?.["retry-after"],
            reservedSlug: ht,
            ...(Q !== void 0 && { refusedStep: Q }),
          }),
        ),
        transient: "rate_limited",
      }
    ),
    K = () => publishError(`publish cancelled \u2014 nothing more was sent.${de}`);
  try {
    let S = h.slug ?? y.reservedSlug,
      Q,
      I,
      ce = baseVersion,
      Ae = async (B, te) => {
        let xe = {
            ...(B !== void 0 && { slug: B }),
            ...(te.length > 0 && { shas: te }),
            ...(B === void 0 && I1t()),
          },
          le = {
            refreshOAuth: !0,
            headers: buildFrameHeaders(),
            timeout: 30000,
            credentials: credentials,
            relayOnCredentialRefusal: !0,
          },
          he = async () => {
            if (relayOnly === void 0) return frameApi.post("/api/frame/deploy/prepare", xe, le);
            return postRelayOnlyWithBusyWait("/api/frame/deploy/prepare", xe, le, relayOnly, signal);
          },
          Se = await withPublishTiming(he);
        if (
          Se.ok &&
          Se.fromFrame &&
          Se.status === 429 &&
          dailyCapNotice(Se.data) === void 0 &&
          (await Wt(Se.response?.headers?.["retry-after"]))
        )
          Se = await withPublishTiming(he);
        return Se;
      },
      Ie = (B) => (typeof B?.slug === "string" && ARTIFACT_SLUG_RE.test(B.slug) ? B.slug : void 0),
      Fe = !1,
      Ge = !1,
      be = h.slug !== void 0 && !(Xe && liveFiles?.base !== void 0),
      at = Be.length > 0 || mapped.length > 0 || (be && yt > MANIFEST_UPLOAD_THRESHOLD_BYTES);
    if (at) {
      let mapped_2 = _t.map((le) => ({
          f: le,
          sha: computeContentHash(le.content),
          wire: encodeManifestContent(le),
        })),
        te,
        xe = "";
      for (let le = 0; le < 2; le++) {
        if (signal?.aborted) return K();
        let he = await Ae(
          S,
          mapped_2.map((re) => re.sha),
        );
        if (signal?.aborted) {
          let re = de === "" && S === void 0 && he.ok && he.status === 200 ? Ie(he.data) : void 0;
          if (re !== void 0) Lt(re);
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
          if (isFrameNotFoundBody(he.data))
            return (
              logFeatureBad("artifact_publish", "prepare_not_found", P),
              {
                ...publishError(
                  "the server does not recognize this artifact for updating (it may no longer exist or may not be yours to update). The files were NOT published.",
                ),
                ...(h.slug !== void 0 && { gone: !0 }),
              }
            );
          te = { status: 404, why: "the preflight route answered 404" };
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
            return fe(he, mapped.length > 0 ? copyPreflightFailure(mapped.length) : void 0);
          (logForDebugging("[artifact] preflight rate-limited \u2014 sending the one inline deploy instead"),
            (te = { status: 429, why: "the preflight was rate-limited" }));
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
        let Gn = Ie(he.data),
          qn = he.data?.missing;
        if (
          Gn === void 0 ||
          !Array.isArray(qn) ||
          !qn.every((re) => typeof re === "string" && /^[0-9a-f]{64}$/.test(re))
        ) {
          te = { status: 200, why: "a malformed preflight answer" };
          break;
        }
        if (S !== void 0 && Gn !== S)
          return (
            logFeatureBad("artifact_publish", "prepare_slug_mismatch", P),
            publishError(
              "the server answered the upload preflight for a different " + "artifact \u2014 not publishing.",
            )
          );
        if (((Ge = !0), (S = Gn), h.slug === void 0)) Lt(S);
        let Xa = new Set(qn),
          filtered = mapped_2.filter((re) => Xa.has(re.sha)),
          Xn = [];
        {
          let re = [],
            we = 0;
          for (let vt of filtered) {
            let rn = $t(vt.wire);
            if (re.length > 0 && we + rn > gn) (Xn.push(re), (re = []), (we = 0));
            (re.push(vt), (we += rn));
          }
          if (re.length > 0) Xn.push(re);
        }
        for (let re of Xn) {
          if (signal?.aborted) return K();
          let we = await pt(S, re);
          if (!we.ok)
            return (
              logFeatureBad("artifact_publish", we.reason, P),
              publishError(
                we.reason === "no-auth"
                  ? describeArtifactAuthFailure(we.detail) + de
                  : `upload unavailable: ${we.reason}. The publish was NOT completed; retry publishing to slug ${S}.`,
              )
            );
          if (we.status !== 200) {
            let vt = ft(we);
            if (vt)
              return publishError(
                `${vt.message} \u2014 this publish didn't finish. ` +
                  `Publish again to slug ${S} after the reset.`,
              );
            if (D(we)) return fe(we);
            return (
              logFeatureBad(
                "artifact_publish",
                we.fromFrame ? "prepare_upload_failed" : "prepare_upload_relay_error",
                { ...P, upload_status: we.status },
              ),
              publishError(
                (we.fromFrame
                  ? `file upload ${we.status} after the preflight: ${errBody(we.data)}`
                  : `file upload failed after the preflight (relay HTTP ${we.status})`) +
                  ` \u2014 the publish was NOT completed. Retry publishing to slug ${S}.`,
              )
            );
          }
        }
        if (mapped.length > 0) {
          if (signal?.aborted) return K();
          let re = await pt(S, mapped);
          if (!re.ok)
            return (
              logFeatureBad("artifact_publish", re.reason, P),
              publishError(
                re.reason === "no-auth"
                  ? describeArtifactAuthFailure(re.detail) + de
                  : `copying files from another artifact unavailable: ${re.reason}. The publish was NOT completed; retry publishing to slug ${S}.`,
              )
            );
          if (re.status !== 200) {
            let _e = ft(re);
            if (_e)
              return publishError(
                `${_e.message} \u2014 this publish didn't finish. Publish again to slug ${S} after the reset.`,
              );
            if (D(re))
              return fe(
                re,
                copiedFilesSummary(mapped.map(({ c: fi }) => ({ path: fi.path, fromSlug: fi.from.slug }))),
              );
            let ot = q && re.fromFrame && re.status === 400 && Xor(re.data, "cross_org_ok");
            logFeatureBad(
              "artifact_publish",
              ot
                ? "copy_predates_cross_org"
                : re.fromFrame
                  ? "copy_upload_failed"
                  : "copy_upload_relay_error",
              { ...P, upload_status: re.status },
            );
            let Re = errBody(re.data),
              match = /^files\[(\d+)\]: (.*)$/.exec(Re),
              lt = match !== null ? mapped[Number(match[1])]?.c : void 0,
              ui = match !== null ? match[2] : Re,
              Qn = re.fromFrame && lt !== void 0 && /not found/.test(ui) ? lt : void 0,
              Za =
                " \u2014 the source artifact doesn't exist, this account can't open it, or it can't be copied from (all three get the same answer)";
            if (ot)
              return publishError(
                "copying files from another organization's artifact isn't available on this server yet, so nothing was published. Don't retry the copy. Publish without the copied file instead, or tell the user cross-organization copies aren't supported yet.",
              );
            return {
              ...publishError(
                (re.fromFrame
                  ? lt !== void 0
                    ? `copying ${jsonStringify(lt.path)} from artifact ${lt.from.slug} (${jsonStringify(lt.from.path)}) was refused (${re.status}: ${ui})${Qn !== void 0 ? Za : ""}`
                    : re.status === 404
                      ? "the server does not recognize this artifact for staging copied files (it may no longer exist, may not be yours to update, or copying is not enabled on this path)"
                      : `staging the copied files was refused (${re.status}: ${Re})`
                  : `staging the copied files failed (relay HTTP ${re.status})`) +
                  ` \u2014 the publish was NOT completed. Retry publishing to slug ${S} once the cause is fixed.`,
              ),
              ...(Qn !== void 0 && { copySourceNotFound: Qn }),
            };
          }
          let we = () =>
              publishError(
                `the server staged the copied files but its answer was incomplete, so nothing was published \u2014 retry publishing to slug ${S}.${de}`,
              ),
            vt = re.data?.files;
          if (!Array.isArray(vt) || vt.length !== mapped.length)
            return (logFeatureBad("artifact_publish", "copy_echo_malformed", P), we());
          let rn = [],
            Gt = [];
          for (let [_e, ot] of mapped.entries()) {
            let Re = vt[_e];
            if (Re?.leftOut !== void 0) {
              if (
                !Mt.askedToLeaveOut ||
                typeof Re.leftOut !== "string" ||
                Re.leftOut === "" ||
                Re.sha256 !== void 0 ||
                Re.size !== void 0 ||
                Re.contentType !== void 0 ||
                (Re.path !== void 0 && Re.path !== ot.c.path)
              )
                return (logFeatureBad("artifact_publish", "copy_echo_malformed", P), we());
              Gt.push({ file: ot.c, why: Re.leftOut });
              continue;
            }
            if (
              typeof Re?.sha256 !== "string" ||
              !/^[0-9a-f]{64}$/.test(Re.sha256) ||
              typeof Re.contentType !== "string" ||
              !jn.has(Re.contentType)
            )
              return (logFeatureBad("artifact_publish", "copy_echo_malformed", P), we());
            ((ot.sha = Re.sha256), (ot.contentType = Re.contentType), rn.push(ot));
          }
          ((Je = rn), (Ye = Gt));
          let Ja = h.slug === void 0 && y.reservedSlug === void 0;
          if (Gt.length > 0 && !isAddOnlyPublish({ mode: ge, isFirstPublish: Ja, removedCount: s.length })) {
            let _e = { ...P, n_left_out: Gt.length };
            if (s.length > 0)
              return (
                logFeatureBad("artifact_publish", "copy_left_out_removes_files", _e),
                publishError(allFilesLeftOutMessage(Gt, "removes_files") + de)
              );
            return (
              logFeatureBad("artifact_publish", "copy_left_out_replaces_files", _e),
              publishError(allFilesLeftOutMessage(Gt, "replaces_files") + de)
            );
          }
          let filtered = Je.filter((_e) => U5n.has(baseMediaType(_e.contentType ?? "")));
          if (filtered.length > 0)
            return (
              logFeatureBad("artifact_publish", "copy_refused_document", P),
              publishError(
                `copied file ${jsonStringify(filtered[0].c.path)} is ${filtered[0].contentType}: a page or XML document cannot be copied from another artifact into a publish (its content must pass this tool's checks, which a server-side copy skips) \u2014 read it with action "read_file" and publish it from the local copy instead. Nothing was published.${de}`,
              )
            );
          let vn = (_e) => contentTypeForPath(_e) === kn,
            ci = (_e) => baseMediaType(_e ?? "") === kn,
            filtered_2 = Je.filter((_e) => !ci(_e.contentType) && (vn(_e.c.path) || vn(_e.c.from.path)));
          if (filtered_2.length > 0) {
            logFeatureBad("artifact_publish", "copy_refused_svg_mismatch", P);
            let mapped = filtered_2
                .slice(0, 20)
                .map((lt) => `${jsonStringify(lt.c.path)} (${lt.contentType})`),
              ot = filtered_2.length - mapped.length,
              Re = filtered_2.length === 1,
              Xt = filtered_2.every((lt) => !vn(lt.c.from.path))
                ? `copy ${Re ? "it" : "each"} to a path that does not end .svg, or `
                : "";
            return publishError(
              `copied ${plural(filtered_2.length, "file")} ${mapped.join(", ")}${ot > 0 ? ` and ${ot} more` : ""}: a file copied to or from a name ending .svg must be stored as an SVG image \u2014 ${Xt}read ${Re ? "it" : "each"} with action "read_file" and publish it from the local copy instead. Nothing was published.${de}`,
            );
          }
          let found = Je.find((_e) => ci(_e.contentType) && !vn(_e.c.path));
          if (found !== void 0)
            return (
              logFeatureBad("artifact_publish", "copy_refused_svg_mismatch", P),
              publishError(
                `copied file ${jsonStringify(found.c.path)} is ${found.contentType}: an SVG image is copied only to a name ending .svg \u2014 copy it to a path ending .svg, or read it with action "read_file" and publish it from the local copy instead. Nothing was published.${de}`,
              )
            );
          let di = (_e) => B5n.has(baseMediaType(contentTypeForPath(_e) ?? "")),
            Zn =
              e === null
                ? Je.find(
                    (_e) =>
                      B5n.has(baseMediaType(_e.contentType ?? "")) && !di(_e.c.path) && !di(_e.c.from.path),
                  )
                : void 0;
          if (Zn !== void 0)
            return (
              logFeatureBad("artifact_publish", "copy_refused_script", P),
              publishError(
                `copied file ${jsonStringify(Zn.c.path)} is ${Zn.contentType}: a script its source stores under a name that does not say so cannot be copied into an artifact made from a type (the approval counted it as data) \u2014 copy it to a path with a script extension, or read it with action "read_file" and publish it from the local copy instead. Nothing was published.${de}`,
              )
            );
        }
        if (signal?.aborted) return K();
        let create = Object.create(null);
        if (Ne !== void 0) create["index.html"] = Ne;
        for (let [re, we] of Object.entries(create_2)) create[re] = we;
        for (let re of mapped_2) create[re.f.path] = { sha256: re.sha, contentType: re.f.contentType };
        for (let re of Je) create[re.c.path] = { sha256: re.sha, contentType: re.contentType };
        for (let re of s) create[re] = null;
        for (let re of it) create[re] = { live: !1 };
        if (Ye.length > 0 && Object.keys(create).length === 0)
          return (
            logFeatureBad("artifact_publish", "copy_left_out_no_other_file", { ...P, n_left_out: Ye.length }),
            publishError(allFilesLeftOutMessage(Ye, "no_other_file") + de)
          );
        let Ze = await Rt({
            ...tt,
            slug: S,
            ...(force && { force: !0 }),
            ...(baseVersion && { baseVersion: baseVersion }),
            manifest: st(create),
            mode: ge,
          }),
          li = Ze.ok ? refusalReasonOf(Ze.data) : void 0;
        if (
          Ze.ok &&
          Ze.fromFrame &&
          Ze.status === 422 &&
          le === 0 &&
          (li === "content_pending" ||
            (li === void 0 &&
              !isTypeFileRefusal(Ze.data) &&
              !Ha.test(publishDeniedReason(Ze.data, 300)) &&
              !(et.liveKey && typeof Ze.data === "string")))
        ) {
          xe = errBody(Ze.data);
          continue;
        }
        if (Ze.ok && Ze.status === 200 && !Ze.data?.version)
          return (
            logFeatureBad("artifact_publish", "prepare_no_version", P),
            publishError(malformedDeployResponse() + de)
          );
        ((I = Ze), (Fe = !0));
        break;
      }
      if (mapped.length > 0 && !Fe && !Ge)
        return (
          logFeatureBad("artifact_publish", "copy_no_preflight", { ...P, prepare_status: te?.status ?? 0 }),
          publishError(
            `copying files from another artifact needs the upload preflight, which was unavailable here (${te?.why ?? "no answer"}) \u2014 nothing was published.${de}`,
          )
        );
      if (Ge && !Fe)
        return (
          logFeatureBad("artifact_publish", "prepare_rerun_failed", {
            ...P,
            prepare_status: te?.status ?? 0,
          }),
          publishError(
            `the deploy was refused (422: ${xe}), and re-checking with the server before re-sending failed (${te?.why ?? "no answer"}) \u2014 the publish was NOT ` +
              `completed. Retry publishing to slug ${S}.`,
          )
        );
    } else if (S === void 0) {
      if (signal?.aborted) return K();
      let B,
        te = "no answer",
        xe,
        le = !1;
      try {
        B = await Ae(void 0, []);
      } catch (error) {
        if (error instanceof RelayOnlyCancelledError) throw error;
        ((le = error instanceof RelayOnlyUnsentError),
          (te = errBody(error instanceof Error ? error.message : String(error))),
          (xe = publishErrorTelemetry(error, tele.t0)));
      }
      let he = B?.ok && B.status === 200 ? Ie(B.data) : void 0;
      if (he !== void 0) ((S = he), Lt(he));
      if (signal?.aborted) return K();
      if (he === void 0) {
        let Se = B?.ok ? ft(B) : void 0;
        if (Se) return publishError(`${Se.message} \u2014 nothing was published; try again after the reset.`);
        if (!le && (!B?.ok || (B.status !== 403 && B.status !== 404)))
          logFeatureSad("artifact_publish", "reserve_unavailable", {
            ...P,
            reserve_status: B?.ok ? B.status : 0,
            ...xe,
          });
        logForDebugging(
          `[artifact] could not reserve a slug before publishing (${B === void 0 ? te : B.ok ? `HTTP ${B.status}` : B.reason}); publishing without one \u2014 the server assigns it`,
        );
      }
    }
    let qe,
      bn = [],
      _n = {};
    if (!Fe && Be.length > 0 && !S) {
      let create_2 = Object.create(null);
      for (let [le, he] of Object.entries(create))
        if (he !== null && "content" in he && he.content !== void 0) create_2[le] = he;
      if (signal?.aborted) return K();
      let te = await Rt({ ...tt, ...(force && { force: !0 }), manifest: create_2, mode: "replace" });
      if (!te.ok)
        return (
          logFeatureBad("artifact_publish", te.reason, P),
          publishError(`publish unavailable: ${te.reason}`)
        );
      if (!te.fromFrame)
        return (
          logFeatureBad("artifact_publish", "relay_error", { ...P, deploy_status: te.status }),
          publishError(relayHttpUnknown(te.status))
        );
      if (te.status === 400 || te.status === 404) {
        let le = formatFrameErrorBody(te.data);
        if (te.status === 400 && isUnknownLiveFieldError(le, et))
          return (
            logFeatureBad("artifact_publish", "live_files_unsupported", P),
            publishError(deploy400Message(le, et.emptyPatch))
          );
        if (te.status === 400 && isIgnorable400(le, et))
          return (
            logFeatureBad("artifact_publish", "ldx_unsupported", P),
            publishError(deploy400Fallback(le))
          );
        if (te.status === 404 || (UNKNOWN_FIELD_ERROR_RE.test(le) && MANIFEST_FIELD_RE.test(le)))
          return (logFeatureBad("artifact_publish", "multifile_unsupported", P), It(te.status, le));
      }
      if (te.status !== 200) {
        let le = classifyPublishResponse(
          te.status,
          te.data,
          tele.isRedeploy,
          tele.echoedPin !== void 0 ? { pin: tele.echoedPin, declaredCaps: tele.hasCaps } : void 0,
          tele.liveFilesOn === !0,
          tele.sent,
          { retryAfter: te.response?.headers?.["retry-after"] },
        );
        if (le.code !== "thumbnail_rejected")
          logFeatureBad("artifact_publish", le.code ?? "deploy_failed", {
            ...P,
            deploy_status: te.status,
            ...le.extra,
          });
        return publishErrorResult(le, `deploy ${te.status}: ${errBody(te.data)}`);
      }
      let safeParse = publishResponseSchema().safeParse(te.data);
      if (!safeParse.success)
        return (
          logFeatureBad("artifact_publish", "deploy_incomplete", P),
          publishError(malformedDeployResponse())
        );
      ((S = safeParse.data.slug),
        (Q = safeParse.data.version),
        (qe = renderEmbeds(te.data)),
        (bn = renderWarnings(te.data)),
        (_n = {
          contract: safeParse.data.contract,
          preferredContract: safeParse.data.preferredContract,
          capabilities: safeParse.data.capabilities,
        }),
        recordOwnPublish(y.ownPublishes, S, Q, { merged: isMergedResponse(te.data) }),
        (de = ` (The artifact was created with its inline files: to add the remaining files, fix the problem and publish again to slug ${S}.)`));
    }
    if (!Fe && Be.length > 0) {
      if (S === void 0)
        return (
          logFeatureBad("artifact_publish", "deploy_incomplete", P),
          publishError("internal: no slug available for staged upload")
        );
      let B = new Set();
      for (let xe of nt) {
        if (signal?.aborted) return K();
        let le = await pt(S, xe);
        if (!le.ok)
          return (
            logFeatureBad("artifact_publish", le.reason, P),
            publishError(`upload unavailable: ${le.reason}.${de}`)
          );
        if (le.status === 404)
          return (
            logFeatureBad("artifact_publish", "multifile_unsupported", P),
            It(404, "", { maybeGone: h.slug !== void 0, debris: de })
          );
        if (le.status !== 200) {
          let he = ft(le);
          if (he) return publishError(`${he.message} \u2014 try again after the reset.${de}`);
          if (D(le) && Q === void 0) return fe(le);
          return (
            logFeatureBad("artifact_publish", le.fromFrame ? "upload_failed" : "upload_relay_error", {
              ...P,
              upload_status: le.status,
            }),
            publishError(
              le.fromFrame
                ? `file upload ${le.status}: ${errBody(le.data)}.${de}`
                : `file upload failed (relay HTTP ${le.status}).${de}`,
            )
          );
        }
        for (let he of le.data?.files ?? []) if (he.sha256) B.add(he.sha256);
      }
      let filtered = Be.filter((xe) => !B.has(xe.sha));
      if (filtered.length > 0)
        return (
          logFeatureBad("artifact_publish", "upload_hash_mismatch", P),
          publishError(
            `file upload did not stage ${filtered.length} file(s) under the ` +
              "expected content hash \u2014 not publishing a manifest that would " +
              `reference unstaged content.${de}`,
          )
        );
    }
    if (!Fe && Be.length > 0 && Q !== void 0) {
      let create_2 = Object.create(null);
      for (let te of Be) {
        let xe = { sha256: te.sha, contentType: te.f.contentType };
        ((create[te.f.path] = xe), (create_2[te.f.path] = xe));
      }
      if (signal?.aborted) return K();
      ((ce = Q), (I = await Rt({ ...tt, slug: S, manifest: create_2, mode: "patch", baseVersion: Q })));
    } else if (!Fe) {
      if (signal?.aborted) return K();
      I = await Rt({
        ...tt,
        ...(S && { slug: S }),
        ...(force && { force: !0 }),
        ...(baseVersion && { baseVersion: baseVersion }),
        manifest: st(create),
        mode: ge,
      });
    }
    if (I === void 0)
      return (
        logFeatureBad("artifact_publish", "deploy_incomplete", P),
        publishError("internal: publish flow completed without a deploy")
      );
    if (!I.ok)
      return (
        logFeatureBad("artifact_publish", I.reason, P),
        publishError(
          (I.reason === "no-auth"
            ? describeArtifactAuthFailure(I.detail)
            : `publish unavailable: ${I.reason}`) + de,
        )
      );
    if (!I.fromFrame)
      return (
        logFeatureBad("artifact_publish", "relay_error", { ...P, deploy_status: I.status }),
        publishError(relayHttpUnknown(I.status) + de)
      );
    if (I.status === 400 || I.status === 404) {
      let B = formatFrameErrorBody(I.data);
      if (I.status === 400 && isUnknownLiveFieldError(B, et))
        return (
          logFeatureBad("artifact_publish", "live_files_unsupported", P),
          publishError(deploy400Message(B, et.emptyPatch) + de)
        );
      if (I.status === 400 && isIgnorable400(B, et))
        return (
          logFeatureBad("artifact_publish", "ldx_unsupported", P),
          publishError(deploy400Fallback(B) + de)
        );
      let te = I.status === 404 && tele.isRedeploy && isFrameNotFoundBody(I.data);
      if ((I.status === 404 && !te) || (UNKNOWN_FIELD_ERROR_RE.test(B) && MANIFEST_FIELD_RE.test(B)))
        return (
          logFeatureBad("artifact_publish", "multifile_unsupported", P),
          It(I.status, B, { maybeGone: I.status === 404 && h.slug !== void 0, debris: de })
        );
    }
    if ((baseVersion !== void 0 || Q !== void 0 || isFrameBaseVersionEnabled()) && I.status === 409) {
      let B =
        liveConflictOf(I.data) ??
        (Pt
          ? preconditionConflictOf(I.data, new Set([...Object.keys(create), ...Je.map((te) => te.c.path)]))
          : null);
      if (B)
        return (
          logFeatureBad("artifact_publish", "conflict", {
            ...P,
            ...(tele.baseRebase !== void 0 && { if_match_sent: Pt }),
            ...(B.paths !== void 0 && {
              conflict_reason: fromEnum("precondition_failed"),
              conflict_paths: B.paths.length,
            }),
          }),
          {
            url: null,
            slug: null,
            version: null,
            err:
              (B.paths !== void 0 ? changedFilesConflictMessage(B, B.paths) : staleBaseConflictMessage(B)) +
              de,
            conflict: !0,
            conflictDetail: B,
          }
        );
    }
    if (I.status !== 200) {
      let B = classifyPublishResponse(
        I.status,
        I.data,
        tele.isRedeploy,
        tele.echoedPin !== void 0 ? { pin: tele.echoedPin, declaredCaps: tele.hasCaps } : void 0,
        tele.liveFilesOn === !0,
        tele.sent,
        {
          retryAfter: I.response?.headers?.["retry-after"],
          reservedSlug: ht,
          created: ht === void 0 && de !== "",
        },
      );
      if (B.code !== "thumbnail_rejected")
        logFeatureBad("artifact_publish", B.code ?? "deploy_failed", {
          ...P,
          deploy_status: I.status,
          ...B.extra,
        });
      let te = B.code === "path_is_live" ? getErrnoPath_2(I.data) : void 0;
      return {
        ...publishErrorResult(
          B,
          `deploy ${I.status}: ${errBody(I.data)}`,
          B.code === "rate_limited" && ht !== void 0 ? "" : de,
        ),
        ...(te !== void 0 && { refusedLivePath: te }),
        ...(h.slug === void 0 && S !== void 0 && Q !== void 0 && { created: { slug: S, version: Q } }),
      };
    }
    let safeParse = publishResponseSchema().safeParse(I.data);
    if (!safeParse.success)
      return (
        logFeatureBad("artifact_publish", "deploy_incomplete", P),
        publishError(malformedDeployResponse() + de)
      );
    let { slug: slug, version: version, read: read, shared: shared, kind: kind } = safeParse.data;
    if (S && slug !== S)
      return (
        logFeatureBad("artifact_publish", "deploy_slug_mismatch", P),
        publishError(wrongArtifactAnswer() + de)
      );
    let zn = renderDocs(I.data),
      Yt = zn?.map((B) => B.path),
      filtered = (Yt ?? []).filter((B) => (B === "index.html" ? Ne : create_2[B])?.live === !0),
      filtered_2 = (Yt ?? []).filter((B) => (B === "index.html" ? Ne : create_2[B])?.reseed === !0),
      sliced = uniq([
        ...(Ye.length > 0 ? [copiedFilesLeftOutNote(Ye)] : []),
        ...bn,
        ...renderWarnings(I.data),
        ...sa(filtered),
        ...Vl(filtered_2),
        ...Yl(Y.filter((B) => B !== "index.html")),
        ...(ze ? zl() : []),
        ...Wl(
          G,
          Object.keys(create_2).filter((B) => create_2[B]?.live === !1),
        ),
        ...aa(
          Yt?.filter((B) => !Y.includes(B)),
          new Set([...Object.keys(create), ...Je.map((B) => B.c.path)]),
        ),
      ]).slice(0, READ_BACK_LIMITS),
      included = Y.includes("index.html"),
      ri = renderEmbeds(I.data) ?? qe,
      Yn = parseIntHeader(I.response?.headers?.[X_FRAME_PUSH_REMAINING]),
      qa = dailyResetFromHeader(I.response?.headers?.date),
      ii = mergedChangesFields(
        safeParse.data,
        force ? void 0 : ce,
        new Set([...Object.keys(create), ...Je.map((B) => B.c.path), ...(Yt ?? [])]),
      );
    recordOwnPublish(y.ownPublishes, slug, version, { merged: isMergedResponse(I.data) });
    let si = typeInstanceFields(safeParse.data),
      ai = {
        ...P,
        ...(r.length > 0 && { n_left_out: Ye.length }),
        e2e_ms: Math.round(performance.now() - tele.t0),
        is_redeploy: tele.isRedeploy,
        has_caps: tele.hasCaps,
        push_remaining_seen: Yn !== void 0,
        read_back_echoed: si.readBackEchoed === !0,
        staged_files: Be.length,
        files_omitted: Ot,
        publish_path: fromEnum(Fe ? "preflight" : at ? "legacy" : "inline"),
        ...(tele.baseRebase !== void 0 && { if_match_sent: Pt }),
        ...mergedTelemetry(ii.mergedOver),
      };
    if (Ye.length > 0) logFeatureSad("artifact_publish", "copy_left_out", ai);
    else logFeatureOk("artifact_publish", ai);
    let oi = e === null ? splitManifestPaths(I.data) : void 0;
    return {
      url: artifactViewerUrl(slug),
      slug: slug,
      version: version,
      err: null,
      ...(Yn !== void 0 && { pushRemaining: Yn, pushResetAt: qa }),
      ...(Ye.length > 0 && { copiedLeftOut: Ye.map((B) => B.file) }),
      ...(read !== void 0 && { read: read }),
      ...(shared !== void 0 && { shared: shared }),
      ...publishEchoFields(safeParse.data, tt.deadline !== void 0),
      ...ii,
      ...(Nt.deadline && { deadlineDropped: !0 }),
      ...(Nt.icon && { iconDropped: !0 }),
      ...capabilitiesEchoFields(
        safeParse.data.contract !== void 0 ? safeParse.data : { ...safeParse.data, ..._n },
        b,
      ),
      ...si,
      ...(kind !== void 0 && { kind: kind }),
      ...(sliced.length > 0 && { warnings: sliced }),
      ...(ri !== void 0 && { embeds: ri }),
      ...(oi !== void 0 && { manifestPaths: oi }),
      ...(Yt !== void 0 && { livePaths: Yt }),
      ...(zn !== void 0 && { liveDocs: zn }),
      ...(filtered.length > 0 && { bornLive: filtered }),
      ...(filtered_2.length > 0 && { reseeded: filtered_2 }),
      ...(included && { pageCarriedLive: !0 }),
    };
  } catch (error) {
    if (error instanceof RelayOnlyUnsentError) {
      if (!ve && h.slug === void 0)
        return error instanceof RelayOnlyCancelledError ? publishCancelledResult() : relayOnlyUnsentResult(P);
      if (error instanceof RelayOnlyCancelledError)
        return publishError(
          outcomeUnknownMessage("the publish was cancelled before a later request of it went out") + de,
        );
      return (
        logFeatureBad("artifact_publish", "relay_only_unsent_after_deploy", P),
        publishError(
          outcomeUnknownMessage("a later request could not go through the cloud session's gateway") + de,
        )
      );
    }
    if (!isRelayOnlyCancelled(error))
      logFeatureBad(
        "artifact_publish",
        error instanceof PublishTransportError ? "relay_request_error" : "request_error",
        { ...P, ...publishErrorTelemetry(error, tele.t0), ...ut },
      );
    return publishError((error instanceof Error ? error.message : String(error)) + de);
  }
}
//@ chunk-06y4szbn.js:147257-147335 placement
function artifactViewerUrl(e) {
  return new URL(artifactViewerPath(e), HBe() ?? getOauthConfig().CLAUDE_AI_ORIGIN).toString();
}

export {
  jn,
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
  Pc,
  MANIFEST_REQUEST_BUDGET,
  MAX_COPY_SOURCES,
  filesOnlyPublishProblem,
  publishInstanceFiles,
  publishLiveDocVersion,
  VERSION_MAX_ENTRIES,
  VERSION_TOTAL_BYTES,
  BINARY_FILE_MAX_BYTES,
};
