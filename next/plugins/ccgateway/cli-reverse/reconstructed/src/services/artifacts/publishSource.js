/**
 * services/artifacts/publishSource.ts
 *
 * Artifact 发布来源校验与提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1dbza2qv.js (57)
 * attribution: placement 57
 */
import { lstatSync, constants, openSync, fstatSync, readFileSync, closeSync } from "fs";
import { sep, normalize, join, relative, parse } from "path";
import { hostname, networkInterfaces } from "os";
import { lstat, realpath, stat, readlink, open } from "fs/promises";
import {
  ARTIFACT_EMBED_ERRORS,
  MAX_EMBED_WARNINGS,
  DEP_MODULE_PATH_RE,
  MAX_EMBED_PINS,
  EMBED_ERROR_TEXTS,
} from "./artifactPeople.js";
import { escapeXml } from "../../utils/xml.js";
import {
  ARTIFACT_MAX_RESULT_SIZE_CHARS,
  ARTIFACT_SLUG_RE,
  ASSET_ID_RE,
  ARTIFACT_FILE_INLINE_RESULT_CAP,
  ArtifactInputError,
} from "../../tools/ArtifactTool/constants.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  unknown,
  record,
  booleanSchema,
  array,
  numberSchema,
  literal,
  _enum,
  looseObject,
  union,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { VER_SHAPE } from "./ownPublishes.js";
import { MAX_EPOCH_MS, ARTIFACT_LIST_RELS } from "./listArtifacts.js";
import { isArtifactRoomEnabledStub, isArtifactPinEnabled, versionLabelSchema } from "./artifactShare.js";
import {
  MAX_PUBLISHED_PATH_LENGTH,
  MAX_URL_SEGMENT_CHARS,
  MAX_SEGMENT_WITH_SLASH,
  pathTouchesProtected,
  readExactBytes,
} from "./artifactUrl.js";
import { MAX_ECHO_MANIFEST_PATH, MERGED_CHANGED_KEEP, MAX_ECHO_MANIFEST_ENTRIES } from "./pagePreparation.js";
import {
  SHA256_HEX_RE,
  ASSET_BLOB_URL_RE,
  CONTENT_TYPE_RE,
  MAX_UPLOAD_FILE_PATHS,
  MAX_CONTENT_TYPE_LENGTH,
  ASSET_CURSOR_RE,
  MAX_COPY_ASSET_IDS,
  statFileIdentity,
  resolveLocalUploadPath,
  fileIdentityDev,
  fileIdentityOf,
} from "../../tools/ArtifactTool/actions/uploadAsset.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import {
  isFrameMultiFileEnabled,
  isFrameHotUpdateEnabled,
  isFrameCopyFromEnabled,
  MAX_ARTIFACT_BYTES,
} from "./frameFlags.js";
import { isPathPinEnabled } from "./pathPins.js";
import { artifactTypesEnabled } from "./createFromType.js";
import {
  initReferencesSchema,
  designSystemSchema,
  startKitSchema,
} from "../../tools/ArtifactTool/startKitSchemas.js";
import { SHARE_ROLES } from "./leftOutFiles.js";
import { MAX_SIZE_CLAUSE_CHARS, sweptPagePath } from "../../tools/ArtifactTool/artifactUrls.js";
import { isArtifactCommentsEnabled } from "./comments/commentsGate.js";
import { MAX_EDITS_PER_CALL } from "./artifactDb.js";
import { DB_BATCH_OP } from "../../tools/ArtifactTool/promptText.js";
import { MAX_FRAME_RESPONSE_BYTES, SAFE_ERROR_CODE_RE } from "./frameApi.js";
import { MAX_FILE_SIZE, MAX_LISTED_FILES } from "./publishedFiles.js";
import { FILE_READ_BYTE_CAP } from "./gatewayRead.js";
import { env } from "../../utils/env.js";
import { isFirstPartyRemoteSession } from "../../utils/userDataRoots.js";
import { resolveStageFileRoot } from "../../utils/stageFileRoots.js";
import {
  pathInWorkingPath,
  normalizeCaseForComparison,
  allWorkingDirectories,
  isScratchpadEnabled,
  getScratchpadDir,
  READ_PATH_PROBE,
  isPathInTrustedNetworkRoot,
} from "../../utils/permissions/filesystem.js";
import { getPathsForPermissionCheck } from "../../utils/fsOperations.js";
import { sessionUploadsDir, uploadsRootCandidates, attachmentDigestOf } from "../../utils/uploadsDir.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { isCoworkFramePublishSession } from "./artifactToolGates.js";
import { isPlanBypass } from "../../utils/permissions/browserToolNames.js";
import {
  identity,
  isUncOrDevicePath,
  uncHostOf,
  isDeviceNamespacePath,
  isDevicePrefixPath,
} from "../../utils/pathClassification.js";
import { getPlatform } from "../../utils/platform.js";
import {
  isNetworkMountPath,
  networkMountName,
  isNonWslUncPath,
  classifyHomeMount,
} from "../../utils/networkPaths.js";
import { getCwd } from "../../utils/cwd.js";
import { normalizeTrailingSlash, isUnsafeSymlinkChain, getWorkingDirAnchors } from "./publishPaths.js";
import { expandPath } from "../../utils/path.js";
import { isENOENT } from "../../utils/errors.js";
import { denyRulePhrase } from "../../tools/ArtifactTool/permissions/readRules.js";
import { truncatePathMiddle } from "../../utils/format.js";
import { getDenyRuleForTool } from "../../utils/permissions/permissions.js";
import { countWhere } from "../../utils/collections.js";
import { NOFOLLOW_NONBLOCK_FLAGS, O_NONBLOCK } from "../../utils/fsFlags.js";
import { isErrnoCode } from "../../utils/fsSafety/hardenedRead.js";
import { describeTooLargePage } from "./publishReadChecks.js";
import { decodeTextStrict } from "./contentTypes.js";
import { logFeatureBad } from "../analytics/featureTelemetry.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1dbza2qv.js:13750-14684 placement
function describePublishFiles(errors, options) {
  if (errors === undefined) return "";
  let parsed = ARTIFACT_EMBED_ERRORS().safeParse(errors);
  if (!parsed.success) return "";
  let data = parsed.data;
  let lines = [];
  if (data.pins.length > 0) {
    let joined = data.pins
      .slice(0, MAX_EMBED_WARNINGS)
      .map((pin) => {
        let uuidPrefix = escapeXml(pin.uuid, 8);
        let fileCountText =
          pin.files !== undefined && Number.isInteger(pin.files) && pin.files >= 0
            ? `, ${pin.files} ${pin.files === 1 ? "file" : "files"}`
            : "";
        let path = DEP_MODULE_PATH_RE.test(pin.path) ? pin.path : "?";
        return `${uuidPrefix}\u2026 \u2192 ${path}${pin.module ? ", module" : ""}${fileCountText}`;
      })
      .join("; ");
    lines.push(`Embedded parts pinned: ${data.pins.length} (${joined}).`);
  }
  for (let warning of data.warnings.slice(0, MAX_EMBED_PINS)) {
    let srcXml = warning.src === undefined ? "" : escapeXml(warning.src);
    let embedTag = srcXml !== "" ? `<artifact-embed src="${srcXml}">` : "<artifact-embed>";
    let detail =
      warning.count !== undefined && Number.isInteger(warning.count) && warning.count > 1
        ? ` \xD7${warning.count}`
        : "";
    let reason = Object.hasOwn(EMBED_ERROR_TEXTS, warning.reason) ? warning.reason : "unknown";
    let knownReason = Object.hasOwn(EMBED_ERROR_TEXTS, reason)
      ? `: ${EMBED_ERROR_TEXTS[reason]}${reason === "not_embeddable" ? (options ?? "") : ""}`
      : "";
    lines.push(`${embedTag}${detail} not resolved \u2014 ${reason}${knownReason}.`);
  }
  if (lines.length === 0) return "";
  let joined = lines.join(`
`);
  let halfLimit = ARTIFACT_MAX_RESULT_SIZE_CHARS / 2;
  return `

${joined.length > halfLimit ? `${truncateToLength(joined, halfLimit)} \u2026 (embeds truncated)` : joined}`;
}
//@ chunk-1dbza2qv.js:14684-14711 placement
/**
 * 导出常量或表：vt = 256 是 schema 里 title 字段的字符上限（o().max(vt)）；Ye / at 是外部构建为 null、内部构建才赋值的可选 schema 槽，与字符上限无关。
 */
var MAX_TITLE_CHARS = 256;
var COLLAB_SCHEMA_INCLUDED = null;
var handlersSchemas = null;
//@ chunk-1dbza2qv.js:14711-17130 placement
/**
 * Artifact 发布结果 schema 的编译期开关（嵌入错误、路由声明、提示字段，均为 false）与发布结果 schema（url、路径、版本、能力声明与存储契约、警告、剩余发布次数、图标、受众、合并信息、实时订阅、编辑应用情况、种子线程、复制来源等），以及合并基线 schema。
 */
var EMBEDS_RESULT_ENABLED; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var DECLARED_BY_ROUTE_ENABLED;
var PUBLISH_HINTS_ENABLED;
var PUBLISH_RESULT_SCHEMA;
var MERGED_OVER_SCHEMA;
deferInit("chunk-1dbza2qv.js:14711", () => {
  EMBEDS_RESULT_ENABLED = false;
  DECLARED_BY_ROUTE_ENABLED = false;
  PUBLISH_HINTS_ENABLED = false;
  PUBLISH_RESULT_SCHEMA = DoctorLazy(() =>
    objectSchema({
      url: stringSchema(),
      path: stringSchema(),
      artifact_id: stringSchema().regex(ARTIFACT_SLUG_RE).optional(),
      title: stringSchema().optional(),
      version: stringSchema().regex(VER_SHAPE).optional(),
      capabilities: unknown().optional(),
      stored: objectSchema({
        contract: stringSchema(),
        preferredContract: stringSchema().optional(),
        capabilities: record(stringSchema(), unknown()).optional(),
        carried: booleanSchema().optional(),
        ...(DECLARED_BY_ROUTE_ENABLED && {
          declaredByRoute: booleanSchema().optional(),
        }),
        read: stringSchema().optional(),
      }).optional(),
      warnings: array(stringSchema()).optional(),
      publishesRemaining: numberSchema().int().min(0).optional().catch(undefined),
      publishesResetAt: numberSchema().int().positive().optional().catch(undefined),
      ...(EMBEDS_RESULT_ENABLED && {
        embeds: ARTIFACT_EMBED_ERRORS().optional().catch(undefined),
      }),
      contract: stringSchema().optional(),
      updated: booleanSchema().optional(),
      owned: booleanSchema().optional().catch(undefined),
      icon: stringSchema().max(40).optional().catch(undefined),
      faviconSent: literal(true).optional().catch(undefined),
      iconDropped: literal(true).optional().catch(undefined),
      audience: stringSchema().optional(),
      seq: numberSchema().int().nonnegative().optional().catch(undefined),
      unchanged: literal(true).optional().catch(undefined),
      merged_over: MERGED_OVER_SCHEMA().optional().catch(undefined),
      ...(hotUpdateOn() && {
        deadline: objectSchema({
          until: numberSchema().int().positive().max(MAX_EPOCH_MS),
        })
          .optional()
          .catch(undefined),
        deadlineDropped: literal(true).optional().catch(undefined),
      }),
      liveSubscription: stringSchema().optional(),
      verifyGuide: stringSchema().optional(),
      editsApplied: numberSchema().int().positive().optional().catch(undefined),
      editsNotWritten: _enum(["write_failed", "not_writable", "changed_during_publish", "hard_linked"])
        .optional()
        .catch(undefined),
      ...(PUBLISH_HINTS_ENABLED && {
        kindNote: literal(true).optional().catch(undefined),
        watchBrief: literal(true).optional().catch(undefined),
        previewHint: literal(true).optional().catch(undefined),
      }),
      seededThread: stringSchema().regex(ARTIFACT_SLUG_RE).optional(),
      ...(isArtifactRoomEnabledStub() && {
        room: stringSchema().optional(),
      }),
      ...(copyFromOn() && {
        copied: array(
          objectSchema({
            path: stringSchema().max(MAX_PUBLISHED_PATH_LENGTH),
            from_url: stringSchema(),
            from_path: stringSchema().max(MAX_PUBLISHED_PATH_LENGTH),
          }),
        )
          .max(MAX_URL_SEGMENT_CHARS)
          .optional(),
      }),
      ...(pathPinsOn() && filesWrittenFields()),
      ...(artifactPinsOn() && {
        pinned: booleanSchema().optional(),
      }),
      ...(COLLAB_SCHEMA_INCLUDED && {
        kind: stringSchema().optional(),
      }),
      ...(COLLAB_SCHEMA_INCLUDED && {
        liveDocCollab: stringSchema().optional(),
      }),
      ...(COLLAB_SCHEMA_INCLUDED && {
        liveDocWorkingCopy: stringSchema().optional(),
      }),
      ...(COLLAB_SCHEMA_INCLUDED && {
        liveFileWorkingCopies: stringSchema().max(8192).optional(),
      }),
      ...(COLLAB_SCHEMA_INCLUDED && {
        ldxBuild: stringSchema().max(8192).optional(),
      }),
      ...(COLLAB_SCHEMA_INCLUDED && {
        liveDocVersion: booleanSchema().optional(),
      }),
      ...(COLLAB_SCHEMA_INCLUDED && {
        liveDocShim: objectSchema({
          file: stringSchema().max(4096),
          edits: numberSchema().int().min(0).max(1e6),
          ontoCurrent: booleanSchema().optional(),
          complete: booleanSchema().optional(),
          sourceIsCopy: booleanSchema().optional(),
          copyPath: stringSchema().max(4096).optional(),
          livePath: stringSchema().max(512).optional(),
        }).optional(),
      }),
      ...(COLLAB_SCHEMA_INCLUDED && {
        capabilitiesDefaulted: booleanSchema().optional(),
      }),
      ...(artifactTypesOn() && typeInfoFields()),
    }),
  );
  MERGED_OVER_SCHEMA = DoctorLazy(() =>
    objectSchema({
      base: stringSchema().regex(VER_SHAPE),
      live: stringSchema().regex(VER_SHAPE).optional().catch(undefined),
      changed: array(
        objectSchema({
          path: stringSchema().max(MAX_ECHO_MANIFEST_PATH),
          sha256: stringSchema().regex(SHA256_HEX_RE).nullable(),
        }),
      )
        .max(MERGED_CHANGED_KEEP)
        .optional()
        .catch(undefined),
      omitted: numberSchema().int().positive().optional().catch(undefined),
    }),
  );
});
//@ chunk-1dbza2qv.js:17130-17307 placement
function filesWrittenFields() {
  return {
    files_written: array(
      objectSchema({
        path: stringSchema().max(MAX_PUBLISHED_PATH_LENGTH),
        sha256: stringSchema().regex(SHA256_HEX_RE),
      }),
    )
      .max(MAX_URL_SEGMENT_CHARS)
      .optional()
      .catch(undefined),
    files_removed: array(stringSchema().max(MAX_PUBLISHED_PATH_LENGTH))
      .max(MAX_URL_SEGMENT_CHARS)
      .optional()
      .catch(undefined),
  };
}
//@ chunk-1dbza2qv.js:17307-17362 placement
function pathPinsOn() {
  return getLiveState().frozenPathPin ?? (isFrameMultiFileEnabled() && isPathPinEnabled());
}
//@ chunk-1dbza2qv.js:17362-17411 placement
function hotUpdateOn() {
  return getLiveState().frozenHotUpdate ?? isFrameHotUpdateEnabled();
}
//@ chunk-1dbza2qv.js:17411-17459 placement
function copyFromOn() {
  return getLiveState().frozenCopyFrom ?? isFrameCopyFromEnabled();
}
//@ chunk-1dbza2qv.js:17459-17529 placement
function artifactTypesOn() {
  return getLiveState().frozenArtifactTypes?.typesOn ?? (artifactTypesEnabled() && isFrameMultiFileEnabled());
}
//@ chunk-1dbza2qv.js:17529-17752 placement
/**
 * artifact 类型锁的 schema：类型链接、当前发行版、最新发行版、阻止升级的信息（目标版本、原因、冲突数、路径）。
 */
var TYPE_LOCK_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-1dbza2qv.js:17529", () => {
  TYPE_LOCK_SCHEMA = DoctorLazy(() =>
    objectSchema({
      url: stringSchema(),
      release: stringSchema(),
      latest: stringSchema().optional(),
      blocked: objectSchema({
        to: stringSchema().optional(),
        reason: stringSchema(),
        conflict_count: numberSchema().int().min(0).max(1e6).optional(),
        paths: array(stringSchema().max(MAX_ECHO_MANIFEST_PATH))
          .max(MAX_ECHO_MANIFEST_ENTRIES)
          .optional()
          .catch(undefined),
      }).optional(),
    }),
  );
});
//@ chunk-1dbza2qv.js:17752-18098 placement
/**
 * 发布参数中与 artifact 类型相关的字段 schema（类型、自有文件、类型文件、服务位置与新增文件等）。
 */
function typeInfoFields() {
  return {
    type: TYPE_LOCK_SCHEMA()
      .optional()
      .describe("The Artifact type (and release) this Artifact was created from"),
    own_files: array(stringSchema()).optional(),
    type_files: array(stringSchema()).optional(),
    served_at: stringSchema().optional().catch(undefined),
    served_root: stringSchema().optional().catch(undefined),
    new_files: array(stringSchema()).optional().catch(undefined),
    unchanged_files: array(stringSchema()).optional().catch(undefined),
  };
}
//@ chunk-1dbza2qv.js:18098-19282 placement
/**
 * 从类型创建 artifact 的结果 schema（类型、自有/类型文件、服务路径、自动打开时机、预配存储、类型说明、快速开始与设计系统信息等），以及可在存储/压缩时剥离的大字段键表。
 */
var CREATED_FROM_TYPE_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var QUICKSTART_STRIPPABLE_KEYS;
var CREATE_STRIPPABLE_KEYS;
deferInit("chunk-1dbza2qv.js:18098", () => {
  CREATED_FROM_TYPE_SCHEMA = DoctorLazy(() =>
    objectSchema({
      created_from_type: literal(true),
      already_created: literal(true).optional(),
      url: stringSchema(),
      version: stringSchema(),
      owned: booleanSchema().optional().catch(undefined),
      path: stringSchema().optional(),
      title: stringSchema().optional(),
      type: objectSchema({
        url: stringSchema(),
        release: stringSchema(),
      }),
      own_files: array(stringSchema()),
      type_files: array(stringSchema()),
      served_at: stringSchema().optional().catch(undefined),
      served_root: stringSchema().optional().catch(undefined),
      ...(pathPinsOn() && filesWrittenFields()),
      auto_open: _enum(["at_create", "after_first_write"]).optional(),
      warnings: array(stringSchema()).optional(),
      files_error: stringSchema().optional(),
      files_error_kind: _enum(["type_owned_path"]).optional(),
      provisioned: objectSchema({
        store: stringSchema(),
        project_id: stringSchema(),
        file_id: stringSchema().optional(),
        node_id: stringSchema().optional(),
      }).optional(),
      liveSubscription: stringSchema().optional(),
      ...(isArtifactRoomEnabledStub() && {
        room: stringSchema().optional(),
      }),
      ...(artifactPinsOn() && {
        pinned: booleanSchema().optional(),
      }),
      ...instructionsFields(),
      ...initReferencesSchema(),
      after_quickstart: objectSchema({
        design_system: stringSchema().optional(),
        saved_system: stringSchema().optional(),
        saved_system_dir: stringSchema().optional(),
        saved_pages_dir: stringSchema().optional(),
        not_listed: booleanSchema().optional(),
      }).optional(),
      design_systems: TYPE_INSTANCES_RESULT_SCHEMA().shape.type_instances.optional(),
      design_systems_note: stringSchema().optional(),
      ...designSystemSchema(),
    }),
  );
  QUICKSTART_STRIPPABLE_KEYS = {
    init_references: true,
    after_quickstart: true,
    design_systems: true,
    design_systems_note: true,
    design_system: true,
  };
  CREATE_STRIPPABLE_KEYS = {
    instructions: true,
    instructions_chars: true,
    instructions_clipped: true,
    instructions_unavailable: true,
    ...QUICKSTART_STRIPPABLE_KEYS,
  };
});
//@ chunk-1dbza2qv.js:19282-19334 placement
function artifactPinsOn() {
  return getLiveState().frozenArtifactPins ?? isArtifactPinEnabled();
}
//@ chunk-1dbza2qv.js:19334-19507 placement
function instructionsFields() {
  return {
    instructions: stringSchema().optional(),
    instructions_chars: numberSchema().int().min(0).optional(),
    instructions_clipped: booleanSchema().optional(),
    instructions_unavailable: stringSchema().optional(),
  };
}
//@ chunk-1dbza2qv.js:19507-21595 placement
/**
 * 类型目录相关的结果 schema：类型列表、类型实例列表、类型条目、快速开始（意图匹配、候选类型、设计系统、起步套件等）、类型文件读取结果及未读原因、类型详情。
 */
var TYPES_LIST_RESULT_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var TYPE_INSTANCES_RESULT_SCHEMA;
var TYPE_ENTRY_SCHEMA;
var QUICKSTART_RESULT_SCHEMA;
var TYPE_FILE_UNREAD_REASONS;
var TYPE_FILE_RESULT_SCHEMA;
var DESCRIBE_TYPE_RESULT_SCHEMA;
deferInit("chunk-1dbza2qv.js:19507", () => {
  TYPES_LIST_RESULT_SCHEMA = DoctorLazy(() =>
    objectSchema({
      artifact_types: array(
        objectSchema({
          title: stringSchema(),
          type_url: stringSchema(),
          description: stringSchema().optional(),
          tier: stringSchema().optional(),
        }),
      ),
      query: stringSchema().optional(),
      more: booleanSchema().optional(),
      dropped: numberSchema().int().min(0).optional(),
      unavailable: booleanSchema().optional(),
      docs_unfillable: booleanSchema().optional(),
    }),
  );
  TYPE_INSTANCES_RESULT_SCHEMA = DoctorLazy(() =>
    objectSchema({
      type_instances: objectSchema({
        type: stringSchema().optional(),
        type_url: stringSchema().optional(),
        scope: stringSchema(),
        instances: array(
          objectSchema({
            title: stringSchema(),
            url: stringSchema(),
            description: stringSchema().optional(),
            created_at: stringSchema().optional(),
            rel: stringSchema().optional(),
            audience: stringSchema().optional(),
            outsiders_may_have_written: literal(true).optional(),
            default: stringSchema().optional(),
          }),
        ),
        more: booleanSchema().optional(),
        overflow: booleanSchema().optional(),
        dropped: numberSchema().int().min(0).optional(),
        unavailable: booleanSchema().optional(),
      }),
    }),
  );
  TYPE_ENTRY_SCHEMA = DoctorLazy(() =>
    objectSchema({
      title: stringSchema(),
      type_url: stringSchema(),
      description: stringSchema().optional(),
      tier: stringSchema().optional(),
    }),
  );
  QUICKSTART_RESULT_SCHEMA = DoctorLazy(() =>
    objectSchema({
      quickstart: objectSchema({
        intent: stringSchema(),
        match: TYPE_ENTRY_SCHEMA().optional(),
        match_of: numberSchema().optional(),
        ask_first: booleanSchema().optional(),
        types: array(TYPE_ENTRY_SCHEMA()).optional(),
        types_more: booleanSchema().optional(),
        dashboard_type: TYPE_ENTRY_SCHEMA().optional(),
        motion_type: TYPE_ENTRY_SCHEMA().optional(),
        ...false,
        ...false,
        types_unavailable: booleanSchema().optional(),
        types_ruled: booleanSchema().optional(),
        types_ambiguous: booleanSchema().optional(),
        types_partial: booleanSchema().optional(),
        types_note: stringSchema().optional(),
        types_hooked: booleanSchema().optional(),
        docs_connector: booleanSchema().optional(),
        design_systems: TYPE_INSTANCES_RESULT_SCHEMA().shape.type_instances.optional(),
        design_systems_note: stringSchema().optional(),
        design_systems_off: booleanSchema().optional(),
        ...designSystemSchema(),
        design_guidance: booleanSchema().optional(),
        start_kit: startKitSchema().optional(),
      }),
    }),
  );
  TYPE_FILE_UNREAD_REASONS = [
    "withheld",
    "not_listed",
    "not_text",
    "too_large",
    "unavailable",
    "result_full",
  ];
  TYPE_FILE_RESULT_SCHEMA = DoctorLazy(() =>
    objectSchema({
      path: stringSchema(),
      content: stringSchema().optional(),
      chars: numberSchema().int().min(0).optional(),
      clipped: booleanSchema().optional(),
      unread: _enum(TYPE_FILE_UNREAD_REASONS).optional(),
      why: stringSchema().optional(),
    }),
  );
  DESCRIBE_TYPE_RESULT_SCHEMA = DoctorLazy(() =>
    objectSchema({
      artifact_type: objectSchema({
        title: stringSchema(),
        type_url: stringSchema(),
        description: stringSchema().optional(),
        tier: stringSchema().optional(),
        release: stringSchema().optional(),
        files: array(stringSchema()),
        files_omitted: numberSchema().int().min(0).optional(),
        instructions_file: booleanSchema(),
        instructions: stringSchema().optional(),
        instructions_chars: numberSchema().int().min(0).optional(),
        instructions_clipped: booleanSchema().optional(),
        instructions_unavailable: stringSchema().optional(),
        capabilities: array(stringSchema()),
        creatable: booleanSchema().optional(),
      }),
      read_of_type_link: literal(true).optional(),
      type_file: TYPE_FILE_RESULT_SCHEMA().optional(),
      type_files_read: array(TYPE_FILE_RESULT_SCHEMA()).max(MAX_SEGMENT_WITH_SLASH).optional(),
    }),
  );
});
//@ chunk-1dbza2qv.js:21595-21844 placement
function artifactListRowSchema() {
  let call = {
    title: stringSchema(),
    url: stringSchema(),
    favicon: stringSchema().optional(),
    updatedAt: stringSchema().optional(),
    rel: _enum(ARTIFACT_LIST_RELS).optional(),
    external: literal(true).optional(),
    role: _enum(SHARE_ROLES).optional(),
    outsidersMayHaveWritten: literal(true).optional(),
  };
  return artifactPinsOn()
    ? objectSchema({
        ...call,
        pinned: booleanSchema().optional(),
      })
    : objectSchema(call);
}
//@ chunk-1dbza2qv.js:21844-33585 placement
/**
 * Artifact 发布来源相关的提示文本表（共享范围、持久唤醒、实时订阅停止等）
 */
var PUBLISH_SOURCE_TEXTS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var readSourceSchema;
var commentsListSourceSchema;
var replyCommentSourceSchema;
var resolveCommentSourceSchema;
var liveEditSourceSchema;
var liveSyncSourceSchema;
var versionedPublishSourceSchema;
var watchSourceSchema;
var unwatchSourceSchema;
var resumeRepliesSourceSchema;
var roomPeerSourceSchema;
var watchesListSourceSchema;
var roomSendSourceSchema;
var dbReadSourceSchema;
var dbProfilesSourceSchema;
var dbWriteOpSourceSchema;
var dbUsageSourceSchema;
var embeddedUsageSourceSchema;
var warningsSourceSchema;
var writtenCommonFields;
var dbWriteSourceSchema;
var assetRecordSchema;
var assetUploadSourceSchema;
var assetUploadsSourceSchema;
var assetListSourceSchema;
var assetReadSourceSchema;
var assetCopySourceSchema;
var assetDeleteSourceSchema;
var artifactTitleRefSchema;
var fileListSourceSchema;
var fileReadSourceSchema;
var filesReadSourceSchema;
var artifactDeleteSourceSchema;
var pinSourceSchema;
var verifySourceSchema;
var previewSourceSchema;
var emulatorPreviewSourceSchema;
var openSourceSchema;
var pageVersionsSourceSchema;
var sharedSourceSchema;
var allActionSourceSchemas;
deferInit("chunk-1dbza2qv.js:21844", () => {
  PUBLISH_SOURCE_TEXTS = DoctorLazy(() =>
    objectSchema({
      artifacts: array(artifactListRowSchema()),
      truncated: booleanSchema().optional(),
      total: numberSchema().int().min(0).optional(),
      total_at_least: literal(true).optional(),
      next_page_token: stringSchema().optional(),
      ...(artifactPinsOn() && {
        pins_enabled: booleanSchema().optional(),
      }),
      scope: _enum(["shared", "all"]).optional(),
      external_listed: literal(true).optional(),
    }),
  );
  readSourceSchema = DoctorLazy(() =>
    objectSchema({
      read: objectSchema({
        url: stringSchema(),
        bytes: numberSchema(),
        code: numberSchema(),
        codeText: stringSchema(),
        result: stringSchema(),
        durationMs: numberSchema(),
        title: stringSchema().max(MAX_TITLE_CHARS).optional(),
      }),
      owned: booleanSchema().optional().catch(undefined),
      artifactRead: objectSchema({
        slug: stringSchema(),
        ver: stringSchema().optional(),
        seeded: literal(false).optional(),
      }).optional(),
    }),
  );
  commentsListSourceSchema = DoctorLazy(() =>
    objectSchema({
      threads_dropped: booleanSchema().optional(),
      thread_filter: stringSchema().optional(),
      scoped_dispatch: booleanSchema().optional(),
      foreign: literal(true).optional(),
      cursor: stringSchema().optional(),
      outside_org: booleanSchema().optional(),
      page_owns_threads: booleanSchema().optional(),
      names: record(stringSchema(), stringSchema()).optional(),
      threads: array(
        objectSchema({
          id: stringSchema(),
          created_at: stringSchema().optional(),
          resolved: booleanSchema(),
          resolved_degraded: booleanSchema().optional(),
          resolved_by_claude: booleanSchema().optional(),
          claude_activated: booleanSchema(),
          activated_degraded: booleanSchema().optional(),
          carried: booleanSchema().optional(),
          anchor_path: stringSchema().optional(),
          span_quote: stringSchema().optional(),
          anchor_file: stringSchema().optional(),
          anchor_file_degraded: booleanSchema().optional(),
          anchor_file_sha: stringSchema().optional(),
          anchor_moved_at: stringSchema().optional(),
          anchor_label: stringSchema().optional(),
          anchor_detail: stringSchema().optional(),
          anchor_snippet: stringSchema().optional(),
          anchor_region: booleanSchema().optional(),
          region_inside: array(stringSchema()).optional(),
          comments_degraded: booleanSchema().optional(),
          comments: array(
            objectSchema({
              id: stringSchema(),
              account: stringSchema(),
              role: stringSchema().optional(),
              text: stringSchema(),
              created_at: stringSchema().optional(),
              sent_to_claude: booleanSchema().optional(),
              sent_to_claude_degraded: booleanSchema().optional(),
              sent_by_viewer: booleanSchema().optional(),
              posted_by_artifact: booleanSchema().optional(),
              awaiting_reply: booleanSchema().optional(),
              presence: stringSchema().optional(),
              access: stringSchema().optional(),
              outside: literal(true).optional(),
            }),
          ),
        }),
      ),
    }),
  );
  replyCommentSourceSchema = DoctorLazy(() =>
    objectSchema({
      replied: booleanSchema(),
      thread_id: stringSchema(),
      comment_id: stringSchema().optional(),
      replayed: booleanSchema().optional(),
      not_activated: booleanSchema().optional(),
      summon_answered: booleanSchema().optional(),
      summon_foreign: booleanSchema().optional(),
      already_answered: booleanSchema().optional(),
      page_owns_threads: booleanSchema().optional(),
      standing_reply_id: stringSchema().optional(),
    }),
  );
  resolveCommentSourceSchema = DoctorLazy(() =>
    objectSchema({
      thread_resolved: booleanSchema(),
      thread_id: stringSchema(),
      not_activated: booleanSchema().optional(),
      not_authorized: booleanSchema().optional(),
      summon_foreign: booleanSchema().optional(),
      relayed_credential: booleanSchema().optional(),
      page_owns_threads: booleanSchema().optional(),
    }),
  );
  liveEditSourceSchema = () =>
    objectSchema({
      liveEdit: objectSchema({
        version: numberSchema().int().min(-1),
        replayed: booleanSchema(),
        noop: booleanSchema().optional(),
        opCount: numberSchema(),
        created: array(stringSchema()),
        rttMs: numberSchema().optional(),
        collab: stringSchema().optional(),
      }),
    });
  liveSyncSourceSchema = () =>
    objectSchema({
      sync: objectSchema({
        seq: numberSchema().int().min(-1),
        path: stringSchema().max(4096),
        live_path: stringSchema().max(512).optional(),
        pushed: objectSchema({
          version: numberSchema().int().min(0),
          touched: numberSchema().int().min(0),
          created: array(stringSchema().max(64)).max(64),
          createdUnlisted: numberSchema().int().min(0).optional(),
          ontoCurrent: booleanSchema(),
          complete: booleanSchema().optional(),
        }).optional(),
        pulled: array(stringSchema().max(4096)).max(64),
        pulledUnlisted: numberSchema().int().min(0).optional(),
        fileChanged: booleanSchema(),
        fileMissing: booleanSchema().optional(),
        newlyBound: booleanSchema().optional(),
        diverged: literal(true).optional(),
        refused: stringSchema().max(2048).optional(),
        size: stringSchema().max(MAX_SIZE_CLAUSE_CHARS).optional(),
        ldx_build: stringSchema().max(8192).optional(),
      }),
    });
  versionedPublishSourceSchema = () =>
    objectSchema({
      versioned: objectSchema({
        url: stringSchema(),
        artifact_id: stringSchema().regex(ARTIFACT_SLUG_RE),
        version: stringSchema().regex(VER_SHAPE),
        label: versionLabelSchema().optional(),
        warnings: array(stringSchema().max(4096)).max(64).optional(),
      }),
    });
  watchSourceSchema = DoctorLazy(() =>
    objectSchema({
      watch: objectSchema({
        url: stringSchema(),
        watching: booleanSchema(),
        outcome: stringSchema(),
        reason: stringSchema().optional(),
        durable_skip_reason: stringSchema().optional(),
        task_id: stringSchema().optional(),
        since: numberSchema().optional(),
        token_expires_at: numberSchema().optional(),
        ...(isArtifactCommentsEnabled() && {
          auto_reply: stringSchema().optional(),
          can_edit: booleanSchema().optional(),
          user_turn: booleanSchema().optional(),
          named_by_user: booleanSchema().optional(),
          replies_declined: booleanSchema().optional(),
        }),
        ...(COLLAB_SCHEMA_INCLUDED && {
          liveDocCollab: stringSchema().optional(),
          liveDocPath: stringSchema().optional(),
        }),
        rail: stringSchema().optional(),
        trigger_id: stringSchema().optional(),
        durable_since: stringSchema().optional(),
        status: numberSchema().optional(),
        detail: stringSchema().optional(),
        note: stringSchema().optional(),
        events: array(stringSchema()).optional(),
      }),
    }),
  );
  unwatchSourceSchema = DoctorLazy(() =>
    objectSchema({
      unwatch: objectSchema({
        url: stringSchema(),
        was_watching: booleanSchema(),
      }),
    }),
  );
  resumeRepliesSourceSchema = DoctorLazy(() =>
    objectSchema({
      resume_replies: objectSchema({
        url: stringSchema(),
        resumed: booleanSchema(),
        outcome: stringSchema(),
        reason: stringSchema().optional(),
        task_id: stringSchema().optional(),
        stop_kind: stringSchema().optional(),
        in_place: booleanSchema().optional(),
        connecting: booleanSchema().optional(),
      }),
    }),
  );
  roomPeerSourceSchema = DoctorLazy(() =>
    objectSchema({
      url: stringSchema(),
      connected: booleanSchema(),
      peers: numberSchema(),
      viewers: array(
        objectSchema({
          peer: stringSchema(),
          presence: looseObject({}),
          updated_ago_ms: numberSchema(),
        }),
      ).optional(),
    }),
  );
  watchesListSourceSchema = DoctorLazy(() =>
    objectSchema({
      watches: array(
        union([
          objectSchema({
            url: stringSchema(),
            task_id: stringSchema(),
            since: numberSchema(),
            explicit: booleanSchema(),
            connected: booleanSchema(),
            connecting: booleanSchema().optional(),
            token_expires_at: numberSchema(),
            armed_via: stringSchema().optional(),
            ...(isArtifactCommentsEnabled() && {
              auto_reply: stringSchema().optional(),
              unread_plain_comments: numberSchema().optional(),
              summons_awaiting_reply: numberSchema().optional(),
              comments_uncounted: booleanSchema().optional(),
              comments_partially_counted: booleanSchema().optional(),
            }),
          }),
          objectSchema({
            url: stringSchema(),
            rail: literal("durable_wake"),
            trigger_id: stringSchema(),
            since: stringSchema(),
            events: array(stringSchema()).optional(),
            restored: booleanSchema().optional(),
          }),
          objectSchema({
            url: stringSchema(),
            rail: literal("live_stopped"),
            since: numberSchema().optional(),
            explicit: booleanSchema().optional(),
            armed_via: stringSchema().optional(),
            ...(isArtifactCommentsEnabled() && {
              auto_reply: stringSchema(),
            }),
            stop_kind: stringSchema(),
          }),
        ]),
      ),
      filter_url: stringSchema().optional(),
      arms: array(
        objectSchema({
          url: stringSchema(),
          rail: stringSchema().optional(),
          state: stringSchema(),
          reconnect: booleanSchema().optional(),
          failures: numberSchema().optional(),
          max_failures: numberSchema().optional(),
          next_in_s: numberSchema().optional(),
          last_failure: stringSchema().optional(),
          reason: stringSchema().optional(),
          detail: stringSchema().optional(),
          server_message: stringSchema().optional(),
          at: numberSchema().optional(),
        }),
      ).optional(),
      ...(isArtifactRoomEnabledStub() && {
        rooms: array(roomPeerSourceSchema()).optional(),
      }),
    }),
  );
  roomSendSourceSchema = DoctorLazy(() =>
    objectSchema({
      room_send: objectSchema({
        url: stringSchema(),
        topic: stringSchema(),
        delivered: booleanSchema(),
        peers: numberSchema().optional(),
        reason: stringSchema().optional(),
      }),
    }),
  );
  dbReadSourceSchema = DoctorLazy(() =>
    objectSchema({
      db_read: objectSchema({
        op: stringSchema(),
        collection: stringSchema(),
        doc_id: stringSchema().optional(),
        found: booleanSchema().optional(),
        as_level: stringSchema().max(16).optional(),
        as_level_confirmed: booleanSchema().optional(),
        docs: array(
          objectSchema({
            id: stringSchema(),
            data: record(stringSchema(), unknown()),
            version: numberSchema().int().optional(),
            updatedAt: stringSchema().optional(),
          }),
        ).optional(),
        next_cursor: stringSchema().optional(),
        me_id: stringSchema().max(200).optional(),
        ordered_by: objectSchema({
          field: stringSchema(),
          limit: numberSchema().int().positive(),
        }).optional(),
        foreign: literal(true).optional(),
        outside_writer: literal(true).optional(),
        saved: objectSchema({
          dir: stringSchema().max(8192),
          files: array(
            objectSchema({
              id: stringSchema(),
              path: stringSchema().max(8192),
              bytes: numberSchema().int().nonnegative(),
              compact: booleanSchema().optional(),
              version: numberSchema().int().optional(),
              updatedAt: stringSchema().optional(),
            }),
          ),
          skipped: array(
            objectSchema({
              id: stringSchema(),
              reason: stringSchema(),
            }),
          ),
        }).optional(),
      }),
    }),
  );
  dbProfilesSourceSchema = DoctorLazy(() =>
    objectSchema({
      db_profiles: objectSchema({
        ids: array(stringSchema()),
        profiles: record(
          stringSchema(),
          objectSchema({
            name: stringSchema().optional(),
            guest: literal(true).optional(),
          }),
        ).optional(),
        unavailable: literal(true).optional(),
      }),
    }),
  );
  dbWriteOpSourceSchema = DoctorLazy(() =>
    objectSchema({
      op: stringSchema(),
      collection: stringSchema(),
      doc_id: stringSchema(),
      field: stringSchema().max(MAX_EDITS_PER_CALL).optional(),
      replace_all: literal(true).optional(),
      version: numberSchema().int().optional(),
    }),
  );
  dbUsageSourceSchema = DoctorLazy(() =>
    objectSchema({
      documents: numberSchema().int().nonnegative(),
      max_documents: numberSchema().int().positive(),
    })
      .optional()
      .catch(undefined),
  );
  embeddedUsageSourceSchema = DoctorLazy(() =>
    objectSchema({
      strings: numberSchema().int().positive(),
      kb: numberSchema().int().positive(),
    })
      .optional()
      .catch(undefined),
  );
  warningsSourceSchema = DoctorLazy(() => array(stringSchema()).optional().catch(undefined));
  writtenCommonFields = {
    written: objectSchema({
      url: stringSchema(),
    })
      .optional()
      .catch(undefined),
    owned: booleanSchema().optional().catch(undefined),
  };
  dbWriteSourceSchema = DoctorLazy(() =>
    objectSchema({
      ...writtenCommonFields,
      as_level: stringSchema().max(16).optional(),
      as_level_confirmed: booleanSchema().optional(),
      db_write: union([
        dbWriteOpSourceSchema().extend({
          committed: booleanSchema(),
          usage: dbUsageSourceSchema(),
          embedded: embeddedUsageSourceSchema(),
          warnings: warningsSourceSchema(),
        }),
        objectSchema({
          op: literal(DB_BATCH_OP),
          committed: booleanSchema(),
          results: array(dbWriteOpSourceSchema()),
          usage: dbUsageSourceSchema(),
          embedded: embeddedUsageSourceSchema(),
          warnings: warningsSourceSchema(),
          fallback: literal("sequential").optional(),
        }),
      ]),
    }),
  );
  assetRecordSchema = {
    id: stringSchema().regex(ASSET_ID_RE),
    url: stringSchema().regex(ASSET_BLOB_URL_RE),
    size_bytes: numberSchema().int().positive().max(MAX_FRAME_RESPONSE_BYTES),
    content_type: stringSchema().regex(CONTENT_TYPE_RE).max(100),
    sha256: stringSchema().regex(SHA256_HEX_RE).optional(),
    file_name: stringSchema().max(1024),
  };
  assetUploadSourceSchema = DoctorLazy(() =>
    objectSchema({
      ...writtenCommonFields,
      asset_upload: objectSchema(assetRecordSchema),
    }),
  );
  assetUploadsSourceSchema = DoctorLazy(() =>
    objectSchema({
      ...writtenCommonFields,
      asset_uploads: objectSchema({
        url: stringSchema(),
        results: array(
          union([
            objectSchema({
              file_path: stringSchema(),
              status: literal("uploaded"),
              ...assetRecordSchema,
            }),
            objectSchema({
              file_path: stringSchema(),
              status: _enum(["failed", "not_attempted"]),
              reason: stringSchema(),
              message: stringSchema(),
              may_be_stored: literal(true).optional(),
            }),
          ]),
        )
          .min(1)
          .max(MAX_UPLOAD_FILE_PATHS),
      }),
    }),
  );
  assetListSourceSchema = DoctorLazy(() =>
    objectSchema({
      asset_list: objectSchema({
        url: stringSchema(),
        assets: array(
          objectSchema({
            id: stringSchema().regex(ASSET_ID_RE),
            url: stringSchema().regex(ASSET_BLOB_URL_RE),
            content_type: stringSchema().regex(CONTENT_TYPE_RE).max(MAX_CONTENT_TYPE_LENGTH),
            size_bytes: numberSchema().int().nonnegative().max(MAX_FRAME_RESPONSE_BYTES),
            sha256: stringSchema().regex(SHA256_HEX_RE).optional(),
            created_at: stringSchema().max(MAX_CONTENT_TYPE_LENGTH),
          }),
        ).max(1000),
        usage: objectSchema({
          files: numberSchema().int().nonnegative(),
          bytes: numberSchema().int().nonnegative(),
          max_files: numberSchema().int().nonnegative(),
          max_bytes: numberSchema().int().nonnegative(),
        }),
        next: stringSchema().regex(ASSET_CURSOR_RE).optional(),
        cowritten: literal(true).optional(),
        outside_writer: literal(true).optional(),
      }),
    }),
  );
  assetReadSourceSchema = DoctorLazy(() =>
    objectSchema({
      asset_read: objectSchema({
        id: stringSchema().regex(ASSET_ID_RE),
        path: stringSchema().max(8192),
        size_bytes: numberSchema().int().positive().max(MAX_FRAME_RESPONSE_BYTES),
        content_type: stringSchema().regex(CONTENT_TYPE_RE).max(100),
        sha256: stringSchema().regex(SHA256_HEX_RE),
        cowritten: literal(true).optional(),
        outside_writer: literal(true).optional(),
        public_read: literal(true).optional(),
        foreign: literal(true).optional(),
      }),
    }),
  );
  assetCopySourceSchema = DoctorLazy(() =>
    objectSchema({
      asset_copy: objectSchema({
        url: stringSchema(),
        from_url: stringSchema(),
        assets: array(
          objectSchema({
            from_id: stringSchema().regex(ASSET_ID_RE),
            id: stringSchema().regex(ASSET_ID_RE),
            url: stringSchema().regex(ASSET_BLOB_URL_RE),
            size_bytes: numberSchema().int().positive().max(MAX_FRAME_RESPONSE_BYTES),
            content_type: stringSchema().regex(CONTENT_TYPE_RE).max(100),
            sha256: stringSchema().regex(SHA256_HEX_RE).optional(),
          }),
        ).max(MAX_COPY_ASSET_IDS),
      }),
    }),
  );
  assetDeleteSourceSchema = DoctorLazy(() =>
    objectSchema({
      ...writtenCommonFields,
      asset_delete: objectSchema({
        id: stringSchema().regex(ASSET_ID_RE),
        deleted: booleanSchema(),
      }),
    }),
  );
  artifactTitleRefSchema = DoctorLazy(() =>
    objectSchema({
      url: stringSchema(),
      title: stringSchema().max(256).optional(),
    }),
  );
  fileListSourceSchema = DoctorLazy(() =>
    objectSchema({
      file_list: objectSchema({
        url: stringSchema(),
        ver: stringSchema().regex(SAFE_ERROR_CODE_RE),
        files: array(
          objectSchema({
            path: stringSchema().max(MAX_PUBLISHED_PATH_LENGTH),
            content_type: stringSchema().regex(CONTENT_TYPE_RE),
            size_bytes: numberSchema().int().nonnegative().max(MAX_FILE_SIZE),
            sha256: stringSchema().regex(SHA256_HEX_RE),
            live: literal(true).optional(),
          }),
        ).max(MAX_LISTED_FILES),
        cowritten: literal(true).optional(),
        outside_writer: literal(true).optional(),
        public_read: literal(true).optional(),
        narrowed: literal(true).optional(),
        single_page: literal(true).optional(),
        from_type: literal(true).optional(),
        type: artifactTitleRefSchema().optional(),
        foreign: literal(true).optional(),
        stored: objectSchema({
          contract: stringSchema().max(64),
          capabilities: record(stringSchema().max(64), unknown()).optional(),
        })
          .optional()
          .catch(undefined),
      }),
    }),
  );
  fileReadSourceSchema = DoctorLazy(() =>
    objectSchema({
      file_read: objectSchema({
        url: stringSchema().optional(),
        title: stringSchema().max(MAX_TITLE_CHARS).optional(),
        path: stringSchema().max(MAX_PUBLISHED_PATH_LENGTH),
        saved_to: stringSchema().max(8192),
        ver: stringSchema().regex(SAFE_ERROR_CODE_RE),
        size_bytes: numberSchema().int().nonnegative().max(FILE_READ_BYTE_CAP),
        content_type: stringSchema().regex(CONTENT_TYPE_RE),
        sha256: stringSchema().regex(SHA256_HEX_RE),
        content: stringSchema().max(ARTIFACT_FILE_INLINE_RESULT_CAP).optional(),
        content_scrubbed: literal(true).optional(),
        as_served: literal(true).optional(),
        source: literal(true).optional(),
        live: literal(true).optional(),
        live_verified: literal(true).optional(),
        seq: numberSchema().int().nonnegative().optional(),
        ...(COLLAB_SCHEMA_INCLUDED && {
          working_copy: _enum(["bound", "left"]).optional(),
          note: stringSchema().max(8192).optional(),
        }),
        cowritten: literal(true).optional(),
        outside_writer: literal(true).optional(),
        public_read: literal(true).optional(),
        from_type: literal(true).optional(),
        type: artifactTitleRefSchema().optional(),
        foreign: literal(true).optional(),
      }),
    }),
  );
  filesReadSourceSchema = DoctorLazy(() =>
    objectSchema({
      files_read: objectSchema({
        url: stringSchema(),
        title: stringSchema().max(MAX_TITLE_CHARS).optional(),
        ver: stringSchema().regex(SAFE_ERROR_CODE_RE),
        saved_dir: stringSchema().max(8192),
        files: array(
          union([
            objectSchema({
              path: stringSchema().max(MAX_PUBLISHED_PATH_LENGTH),
              saved_to: stringSchema().max(8192),
              size_bytes: numberSchema().int().nonnegative().max(FILE_READ_BYTE_CAP),
              content_type: stringSchema().regex(CONTENT_TYPE_RE),
              sha256: stringSchema().regex(SHA256_HEX_RE),
              content: stringSchema().max(ARTIFACT_FILE_INLINE_RESULT_CAP).optional(),
              content_scrubbed: literal(true).optional(),
              as_served: literal(true).optional(),
              source: literal(true).optional(),
              foreign: literal(true).optional(),
            }),
            objectSchema({
              path: stringSchema().max(MAX_PUBLISHED_PATH_LENGTH),
              error: stringSchema().max(8192),
            }),
          ]),
        ).max(MAX_SEGMENT_WITH_SLASH),
        cowritten: literal(true).optional(),
        outside_writer: literal(true).optional(),
        public_read: literal(true).optional(),
        from_type: literal(true).optional(),
        type: artifactTitleRefSchema().optional(),
        foreign: literal(true).optional(),
      }),
    }),
  );
  artifactDeleteSourceSchema = DoctorLazy(() =>
    objectSchema({
      artifact_delete: objectSchema({
        url: stringSchema(),
        deleted: literal(true),
        already_gone: booleanSchema().optional(),
      }),
    }),
  );
  pinSourceSchema = DoctorLazy(() =>
    objectSchema({
      pin: objectSchema({
        action: _enum(["pin", "unpin"]),
        url: stringSchema(),
        pinned: booleanSchema(),
        title: stringSchema().optional(),
      }),
    }),
  );
  verifySourceSchema = DoctorLazy(() =>
    objectSchema({
      verify: objectSchema({
        url: stringSchema(),
        ver: stringSchema(),
        state: stringSchema(),
        entries: array(unknown()),
        truncated: booleanSchema().optional(),
        dropped: numberSchema().int().optional(),
        waited: booleanSchema().optional(),
        foreign: literal(true).optional(),
      }),
    }),
  );
  previewSourceSchema = DoctorLazy(() =>
    objectSchema({
      preview: objectSchema({
        file: stringSchema().max(4096),
        bytes: numberSchema().int(),
        widths: array(numberSchema()),
        themes: array(stringSchema().max(32)),
        shots: array(
          objectSchema({
            width: numberSchema(),
            theme: stringSchema().max(32),
            height: numberSchema().optional(),
            pageHeight: numberSchema().optional(),
            path: stringSchema().optional(),
            base64: stringSchema().optional(),
            error: stringSchema().optional(),
          }),
        ),
        issues: array(
          objectSchema({
            kind: stringSchema(),
            text: stringSchema(),
          }),
        ),
        issuesDropped: numberSchema().int().optional(),
        renderError: stringSchema().optional(),
      }),
    }),
  );
  emulatorPreviewSourceSchema = DoctorLazy(() =>
    objectSchema({
      emulatorPreview: objectSchema({
        file: stringSchema().max(4096),
        outcome: stringSchema().max(64),
        pictures: array(
          objectSchema({
            path: stringSchema().max(4096),
            base64: stringSchema().optional(),
          }),
        ).max(8),
        marks: array(stringSchema()).optional(),
        errors: array(stringSchema()).optional(),
        outline: stringSchema().optional(),
        stopped: stringSchema().optional(),
      }),
    }),
  );
  openSourceSchema = DoctorLazy(() =>
    objectSchema({
      opened: literal(true),
      url: stringSchema(),
      artifact_id: stringSchema().regex(ARTIFACT_SLUG_RE),
      title: stringSchema().optional(),
      owned: booleanSchema().optional().catch(undefined),
    }),
  );
  pageVersionsSourceSchema = DoctorLazy(() =>
    objectSchema({
      page_versions: objectSchema({
        url: stringSchema(),
        rows: array(
          objectSchema({
            id: stringSchema(),
            createdAt: stringSchema().optional(),
            current: literal(true).optional(),
          }),
        ),
        degraded: literal(true).optional(),
        cut: literal(true).optional(),
      }),
    }),
  );
  sharedSourceSchema = DoctorLazy(() =>
    objectSchema({
      shared: objectSchema({
        url: stringSchema(),
        mode: stringSchema().max(16),
        access: stringSchema().max(16),
        read_mode: stringSchema().max(32),
        added: numberSchema().int().min(0),
        editors: numberSchema().int().min(0).optional(),
        unchanged: booleanSchema().optional(),
        org_name: stringSchema().max(200).optional(),
        title: stringSchema().optional(),
      }),
    }),
  );
  allActionSourceSchemas = DoctorLazy(() => {
    let options = [
      CREATED_FROM_TYPE_SCHEMA(),
      openSourceSchema(),
      PUBLISH_RESULT_SCHEMA(),
      PUBLISH_SOURCE_TEXTS(),
      readSourceSchema(),
      TYPES_LIST_RESULT_SCHEMA(),
      DESCRIBE_TYPE_RESULT_SCHEMA(),
      TYPE_INSTANCES_RESULT_SCHEMA(),
      QUICKSTART_RESULT_SCHEMA(),
      commentsListSourceSchema(),
      replyCommentSourceSchema(),
      resolveCommentSourceSchema(),
    ];
    if (COLLAB_SCHEMA_INCLUDED)
      options.push(liveEditSourceSchema(), liveSyncSourceSchema(), versionedPublishSourceSchema());
    options.push(
      watchSourceSchema(),
      unwatchSourceSchema(),
      resumeRepliesSourceSchema(),
      watchesListSourceSchema(),
    );
    options.push(
      dbReadSourceSchema(),
      dbProfilesSourceSchema(),
      dbWriteSourceSchema(),
      roomSendSourceSchema(),
      assetUploadSourceSchema(),
      assetUploadsSourceSchema(),
      assetListSourceSchema(),
      assetReadSourceSchema(),
      assetDeleteSourceSchema(),
      assetCopySourceSchema(),
      fileListSourceSchema(),
      fileReadSourceSchema(),
      filesReadSourceSchema(),
      artifactDeleteSourceSchema(),
      pinSourceSchema(),
      sharedSourceSchema(),
      pageVersionsSourceSchema(),
    );
    if (handlersSchemas)
      options.push(
        handlersSchemas.handlersDocOutputSchema(),
        handlersSchemas.handlerResultOutputSchema(),
        handlersSchemas.scriptResultOutputSchema(),
      );
    options.push(verifySourceSchema(), previewSourceSchema(), emulatorPreviewSourceSchema());
    return union(options);
  });
});
//@ chunk-1dbza2qv.js:33699-33912 placement
function getRemoteStageRoot() {
  if (
    env.CLAUDE_CODE_REMOTE !== true ||
    !isFirstPartyRemoteSession(env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND)
  )
    return null;
  try {
    let stageFileRoot = resolveStageFileRoot(undefined);
    return resolveStageFileRoot(env.CLAUDE_STAGE_FILE_ROOT) === stageFileRoot ? stageFileRoot : null;
  } catch {
    return null;
  }
}
//@ chunk-1dbza2qv.js:33912-33990 placement
function allPathsInWorkingPath(pathsForPermissionCheck, remoteStageRoot) {
  return pathsForPermissionCheck.every((path) =>
    pathInWorkingPath(path, remoteStageRoot, {
      caseFold: false,
      uncShapeParity: true,
    }),
  );
}
//@ chunk-1dbza2qv.js:33990-34006 placement
var MAX_ATTACHMENT_BYTES = 67108864;
//@ chunk-1dbza2qv.js:34006-34385 placement
/**
 * 判断路径是否是本会话的聊天附件：位于暂存根或上传目录且非硬链接；暂存根下按目录认定；上传目录下需核验文件身份与内容摘要并记入已验证附件表。返回是否在内及路径固定信息。
 */
function checkChatAttachment(context, path, identity) {
  let pathsForPermissionCheck = getPathsForPermissionCheck(context);
  let remoteStageRoot = getRemoteStageRoot();
  let inStageRoot =
    remoteStageRoot !== null && allPathsInWorkingPath(pathsForPermissionCheck, remoteStageRoot);
  if (!inStageRoot && !allPathsInWorkingPath(pathsForPermissionCheck, sessionUploadsDir()))
    return {
      inside: false,
    };
  let fileIdentity = identity ?? statFileIdentity(path);
  if (fileIdentity.linked === true)
    return {
      inside: false,
      pin: fileIdentity,
    };
  if (inStageRoot)
    return {
      inside: isVerifiedAttachmentFile(fileIdentity),
      pin: fileIdentity,
      byDirectory: true,
    };
  let digest = verifyAttachmentDigest(fileIdentity);
  let { verifiedAttachments } = getLiveState();
  if (digest === undefined || fileIdentity.identity === null) {
    verifiedAttachments.delete(fileIdentity.real);
    return {
      inside: false,
      pin: fileIdentity,
    };
  }
  verifiedAttachments.set(fileIdentity.real, fileIdentity.identity);
  return {
    inside: true,
    pin: {
      ...fileIdentity,
      digest,
    },
  };
}
//@ chunk-1dbza2qv.js:34385-34466 placement
function isVerifiedAttachmentFile(input) {
  try {
    return input.identity !== null && lstatSync(input.real).isFile();
  } catch {
    return false;
  }
}
//@ chunk-1dbza2qv.js:34466-34578 placement
function listStageRoots() {
  let roots = new Set();
  for (let root of [undefined, env.CLAUDE_STAGE_FILE_ROOT])
    try {
      roots.add(resolveStageFileRoot(root));
    } catch {}
  return [...roots];
}
//@ chunk-1dbza2qv.js:34578-34762 placement
/**
 * 判断上传文件是否位于需要验证的目录且尚未验证（可选先做一次解析验证）。
 */
function isUnverifiedUpload(path, options = {}) {
  let check = (candidate) =>
    pathInWorkingPath(path, candidate, {
      caseFold: true,
    });
  if (!(check(sessionUploadsDir()) || uploadsRootCandidates().some(check) || listStageRoots().some(check)))
    return false;
  if (options.verify === true) {
    let localUploadPath = resolveLocalUploadPath(path);
    if (localUploadPath.kind === "resolved") checkChatAttachment(path, localUploadPath.real);
  }
  return !isVerifiedAttachment(path);
}
//@ chunk-1dbza2qv.js:34762-34994 placement
/**
 * 判断路径是已核验的聊天附件（位于暂存根，或在上传目录且身份与已验证记录一致、非硬链接）。
 */
function isVerifiedAttachment(input) {
  let pathsForPermissionCheck = getPathsForPermissionCheck(input);
  let remoteStageRoot = getRemoteStageRoot();
  let inStageRoot =
    remoteStageRoot !== null && allPathsInWorkingPath(pathsForPermissionCheck, remoteStageRoot);
  if (!inStageRoot && !allPathsInWorkingPath(pathsForPermissionCheck, sessionUploadsDir())) return false;
  let identity = statFileIdentity(pathsForPermissionCheck.at(-1) ?? input);
  if (identity.linked === true || identity.identity === null) return false;
  return (
    inStageRoot ||
    (attachmentDigestOf(identity.real) !== undefined &&
      getLiveState().verifiedAttachments.get(identity.real) === identity.identity)
  );
}
//@ chunk-1dbza2qv.js:34994-35377 placement
/**
 * 以不跟随链接的方式打开上传文件，核对文件身份与大小上限，计算内容哈希并与清单摘要比对，一致时返回摘要。
 */
function verifyAttachmentDigest(attachment) {
  let expectedDigest = attachmentDigestOf(attachment.real);
  let dev = attachment.identity === null ? undefined : fileIdentityDev(attachment.identity);
  if (expectedDigest === undefined || dev === undefined || dev > MAX_ATTACHMENT_BYTES) return;
  let openFlags = constants.O_NOFOLLOW | constants.O_NONBLOCK;
  let fd;
  try {
    let before = lstatSync(attachment.real, {
      bigint: true,
    });
    if (!before.isFile() || fileIdentityOf(before) !== attachment.identity) return;
    fd = openSync(attachment.real, constants.O_RDONLY | openFlags);
    let after = fstatSync(fd, {
      bigint: true,
    });
    return after.isFile() &&
      fileIdentityOf(after) === attachment.identity &&
      computeContentHash(readFileSync(fd)) === expectedDigest
      ? expectedDigest
      : undefined;
  } catch {
    return;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
//@ chunk-1dbza2qv.js:35377-35584 placement
/**
 * 检查附件能否发布：服务端调用或 Cowork 绕过权限模式下视为不在工作目录内，否则按常规检查。
 */
function checkAttachmentForPublish(path, path_2, realPath, options) {
  let check =
    isCoworkFramePublishSession() &&
    (realPath.mode === "bypassPermissions" ||
      isPlanBypass(realPath.mode, realPath.isBypassPermissionsModeAvailable) ||
      realPath.shouldAvoidPermissionPrompts === true);
  if (realPath.servedCall === true || check)
    return {
      inside: false,
    };
  return checkChatAttachment(path, path_2, options);
}
//@ chunk-1dbza2qv.js:35872-36127 placement
/**
 * 发布源文件无法安全核验时的拒绝决定，以及若干数量上限常量。
 */
var UNVERIFIABLE_SOURCE_DENIAL = {
  behavior: "deny",
  message: "file_path: this source cannot be safely verified \u2014 publish the file by its resolved path",
  decisionReason: {
    type: "other",
    reason: "The publish source cannot be safely verified",
  },
};
var MAX_LISTED_ARTIFACTS = 128;
var MAX_SOURCE_PATHS = 128;
var MAX_QUERY_CURSOR_CHARS = 128;
var MAX_COMMENT_TEXT_CHARS = 1024;
var MAX_PAGE_NAMES = 128;
//@ chunk-1dbza2qv.js:36127-36205 placement
function pathForCompare(path) {
  let normalized = normalizeCaseForComparison(identity(path));
  return getPlatform() === "windows" ? normalized.replace(/\//g, "\\") : normalized;
}
//@ chunk-1dbza2qv.js:36205-36465 placement
function findLongestRootPrefix(path, roots) {
  let comparison = pathForCompare(path);
  return roots
    .map((root) => {
      let replaced = root.replace(/[\\/]+$/, "");
      return replaced === ""
        ? root.slice(0, 1)
        : /^[A-Za-z]:$/.test(replaced)
          ? replaced + root.charAt(2)
          : replaced;
    })
    .filter((root) => {
      let normalized = pathForCompare(root);
      let withSep = normalized.endsWith(sep) ? normalized : normalized + sep;
      return comparison === normalized || comparison.startsWith(withSep);
    })
    .sort((a, b) => b.length - a.length)[0];
}
//@ chunk-1dbza2qv.js:36465-36790 placement
/**
 * 判断主机名是否指向本机：localhost、::1、127.*、本机主机名或任一网卡地址。
 */
function isLocalHostname(host) {
  let replaced = host.toLowerCase().replace(/\.+$/, "");
  if (
    replaced === "localhost" ||
    replaced === "::1" ||
    replaced.endsWith(".ipv6-literal.net") ||
    replaced.startsWith("127.") ||
    replaced === hostname().toLowerCase().replace(/\.+$/, "")
  )
    return true;
  let replaced_2 = replaced.replace(/^\[|\]$/g, "");
  for (let ifaces of Object.values(networkInterfaces()))
    for (let addr of ifaces ?? []) if (addr.address.toLowerCase() === replaced_2) return true;
  return false;
}
//@ chunk-1dbza2qv.js:36790-36875 placement
function isLocalUncPath(path) {
  let match = /^[\\/]{2}([^\\/]+)[\\/]/.exec(path);
  return match !== null && isLocalHostname(match[1] ?? "");
}
//@ chunk-1dbza2qv.js:36875-36945 placement
function isLocalPathWithHost(path) {
  if (!isNetworkMountPath(path)) return false;
  let mountName = networkMountName(path);
  return mountName !== null && isLocalHostname(mountName);
}
//@ chunk-1dbza2qv.js:36945-37267 placement
/**
 * 收集发布可用的目录：当前 cwd、去重后的额外工作目录，以及（是目录且非链接的）scratchpad 目录。
 */
async function collectPublishDirs(toolPermissionContext) {
  let dir = getCwd();
  let normalizeDir = (dir) => normalizeTrailingSlash(normalize(expandPath(dir)));
  let cwdDir = normalizeDir(dir);
  let seen = new Set([cwdDir]);
  let dirs = [];
  for (let dir of allWorkingDirectories(toolPermissionContext)) {
    let normalized = normalizeDir(dir);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      dirs.push(normalized);
    }
  }
  let scratchpad = (isScratchpadEnabled() ? getScratchpadDir() : null) ?? undefined;
  if (scratchpad !== undefined)
    try {
      let stat = await lstat(scratchpad);
      if (stat.isSymbolicLink() || !stat.isDirectory()) scratchpad = undefined;
    } catch (error) {
      if (!isENOENT(error)) scratchpad = undefined;
    }
  return {
    cwd: dir,
    dirs,
    scratchpad,
  };
}
//@ chunk-1dbza2qv.js:37267-37375 placement
/**
 * 把发布锚点转换为选项（scratchpad 目录与工作目录列表）。
 */
function toPublishAnchorOptions({ dirs, scratchpad }) {
  return {
    ...(scratchpad !== undefined && {
      scratchpadDir: scratchpad,
    }),
    ...(dirs.length > 0 && {
      workingDirs: dirs,
    }),
  };
}
//@ chunk-1dbza2qv.js:37375-37702 placement
/**
 * 计算 scratchpad 的字面/真实路径对：不存在时原样；是真实目录且不在网络位置时返回解析结果。
 */
async function getScratchpadPairs(publishDirs) {
  let { scratchpad } = publishDirs;
  if (scratchpad === undefined) return [];
  let isDir = (entry) => !entry.isSymbolicLink() && entry.isDirectory();
  let realPath;
  try {
    realPath = await lstat(scratchpad);
  } catch (error) {
    return isENOENT(error) ? [[scratchpad, scratchpad]] : [];
  }
  if (!isDir(realPath) || (await isUnsafeSymlinkChain(scratchpad))) return [];
  let real = await realpath(scratchpad).catch(() => scratchpad);
  let stat = await lstat(scratchpad).catch(() => {
    return;
  });
  return stat !== undefined && isDir(stat) && stat.ino === realPath.ino && stat.dev === realPath.dev
    ? [[scratchpad, real]]
    : [];
}
//@ chunk-1dbza2qv.js:37702-37809 placement
/**
 * 把工作目录展开为字面路径与真实路径对。
 */
async function getWorkingDirPairs(publishDirs) {
  return (
    await getWorkingDirAnchors(publishDirs.dirs, {
      kind: "cwd",
      lex: publishDirs.cwd,
      real: publishDirs.cwd,
    })
  ).map((pair) => [pair.lex, pair.real]);
}
//@ chunk-1dbza2qv.js:37809-37943 placement
/**
 * 判断路径是否位于 cwd、scratchpad 或任一工作目录之下。
 */
function isUnderPublishDirs(path, publishDirs, scratchpadPairs, workingDirPairs = []) {
  return [
    publishDirs.cwd,
    ...workingDirPairs.flatMap(([lex, real]) => [lex, real]),
    ...scratchpadPairs.flatMap(([lex, real]) => [lex, real]),
  ].some((prefix) => path === prefix || path.startsWith(prefix + sep));
}
//@ chunk-1dbza2qv.js:37943-38538 placement
/**
 * 把发布基准路径解析为真实路径（仍在同一工作目录/scratchpad 内且无不安全链接时），返回解析后的路径与是否发生了重定向。
 */
async function resolvePublishBaseRealpath(base, dirs, workingPairs = []) {
  let resolved = base;
  let redirected = false;
  if (isNonWslUncPath(base) || isNetworkMountPath(base))
    return {
      base: resolved,
      redirected,
    };
  let under = (base, parent) => base === parent || base.startsWith(parent + sep);
  let { scratchpad } = dirs;
  let realScratchpad;
  if (scratchpad !== undefined && !(await isUnsafeSymlinkChain(scratchpad)))
    realScratchpad = await realpath(scratchpad).catch((error) => (isENOENT(error) ? scratchpad : undefined));
  let matchedWorkingDir = under(base, dirs.cwd)
    ? dirs.cwd
    : workingPairs.flatMap(([lex, real]) => [lex, real]).find((candidate) => under(base, candidate));
  let inScratchpad =
    scratchpad !== undefined &&
    matchedWorkingDir === undefined &&
    (under(base, scratchpad) || (realScratchpad !== undefined && under(base, realScratchpad)));
  let root = inScratchpad && scratchpad !== undefined ? scratchpad : (matchedWorkingDir ?? dirs.cwd);
  if (
    (inScratchpad ? realScratchpad !== undefined : !(await isUnsafeSymlinkChain(root))) &&
    !pathTouchesProtected(base) &&
    !(await isUnsafeSymlinkChain(base))
  )
    try {
      let realBase = await realpath(base);
      let realRoot = realScratchpad;
      if (!inScratchpad) realRoot = await realpath(root);
      if (
        realRoot !== undefined &&
        !isNonWslUncPath(realBase) &&
        !isNetworkMountPath(realBase) &&
        under(realBase, realRoot)
      ) {
        resolved = realBase;
        let chosenRoot = inScratchpad && !under(base, root) ? realRoot : root;
        let relativePath = base === chosenRoot ? realRoot : join(realRoot, relative(chosenRoot, base));
        redirected = resolved !== relativePath;
      }
    } catch {}
  return {
    base: resolved,
    redirected,
  };
}
//@ chunk-1dbza2qv.js:38538-38654 placement
/**
 * 审批暂存表满时淘汰最旧条目并标记发生过淘汰。
 */
function evictOldestStash(stash, limit) {
  if (stash.size >= limit) {
    let oldest = stash.keys().next().value;
    if (oldest !== undefined) {
      stash.delete(oldest);
      getLiveState().approvalStashEvicted = true;
    }
  }
}
//@ chunk-1dbza2qv.js:38654-38731 placement
function publishingReadDeniedText(path, denyRuleForTool, suffix = "") {
  return `${path}, and ${denyRulePhrase(denyRuleForTool)} forbids reading files${suffix}.`;
}
//@ chunk-1dbza2qv.js:38731-39012 placement
/**
 * 发布源文件在审批后无法核验或已变化时的错误消息，以及"重试一次，仍被拒就停下告知用户"的说明。
 */
var SOURCE_UNVERIFIED_MESSAGE =
  "file_path: could not verify the source file is unchanged since approval \u2014 retry the publish";
var SOURCE_CHANGED_MESSAGE =
  "file_path: the source file changed between approval and publish \u2014 retry the publish";
var RETRY_ONCE_NOTE = "Retry once; if the retry is refused the same way, stop and tell the user.";
//@ chunk-1dbza2qv.js:39012-40740 placement
function checkPublishSourcePin(input) {
  switch (input) {
    case "source_pin_stale_build":
      return new ArtifactInputError(
        `file_path: this publish was approved under an earlier Claude Code version and needs to be approved again. ${RETRY_ONCE_NOTE}`,
        input,
      );
    case "source_pin_missing":
    case "source_pin_unreadable":
      return new ArtifactInputError(
        `file_path: the approval for this publish cannot be matched to the source file (another Claude Code version gave it, or a hook or SDK host rewrote it), so nothing was published. ${RETRY_ONCE_NOTE}`,
        input,
      );
    case "approval_replayed":
      return new ArtifactInputError(
        "file_path: the approval for this publish was already used by an earlier run of the same tool call, so nothing was published by this run \u2014 retry the publish as a new call",
        input,
      );
    case "source_pin_evicted":
      return new ArtifactInputError(
        "file_path: could not verify the source file is unchanged since approval (this session may have dropped its record of the approval) \u2014 retry the publish",
        input,
      );
    case "source_pin_unobserved":
      return new ArtifactInputError(
        "file_path: the permission check for this publish did not record this file, so it cannot be verified and nothing was published. Retrying the same call will not help: do not retry; tell the user.",
        input,
      );
    case "source_check_failed":
      return new ArtifactInputError(
        "file_path: the permission check for this publish hit an internal error before it recorded the file, so nothing was published. Retrying is unlikely to help: do not retry; tell the user Claude Code could not check this publish.",
        input,
      );
    case "source_redirected_on_resume":
      return new ArtifactInputError(
        "file_path: the source is a symlink, a hard link, or not a plain file, and its approval came from another process, so it cannot be verified here and nothing was published. Retrying this path will likely fail again: publish the file at its resolved path (for a hard link, a plain copy), or tell the user.",
        input,
      );
  }
}
//@ chunk-1dbza2qv.js:40740-40805 placement
/**
 * 导出函数 `quotedSweptPath`：参数 e，返回 `"${truncatePathMiddle(sweptPagePath(e) || "(unprintable path)", 300)}"`。
 */
function quotedSweptPath(text) {
  return `"${truncatePathMiddle(sweptPagePath(text) || "(unprintable path)", 300)}"`;
}
//@ chunk-1dbza2qv.js:40805-41150 placement
/**
 * 审批后 file_path 被（钩子或 SDK 宿主）改动时抛出的输入错误：未发布，不要重试。
 */
function sourcePathChangedError(path, shownPath) {
  let when = shownPath === undefined ? "after approval" : `after ${quotedSweptPath(shownPath)} was approved`;
  return new ArtifactInputError(
    `file_path: the path was changed to ${quotedSweptPath(path)} ${when} (usually by a hook or SDK host), so nothing was published. Do not retry this call; if the new path is the file you mean, publish it in a new call, otherwise tell the user.`,
    "source_path_mismatch",
  );
}
//@ chunk-1dbza2qv.js:41150-41287 placement
/**
 * 发布需要读取文件而 Read 权限检查需要审批时的提示：重试发布以便发起询问。
 */
var READ_CHECK_NEEDS_APPROVAL =
  "Publishing reads file contents and a Read permission check requires approval here \u2014 retry the publish so it can be asked.";
//@ chunk-1dbza2qv.js:41287-41435 placement
/**
 * 若存在拒绝读取的规则，返回发布被拒的权限结果（含规则说明）。
 */
function getPublishReadDenial(toolPermissionContext) {
  let denyRuleForTool = getDenyRuleForTool(toolPermissionContext, READ_PATH_PROBE);
  return denyRuleForTool
    ? {
        behavior: "deny",
        message: publishingReadDeniedText("Publishing reads file contents", denyRuleForTool),
        decisionReason: {
          type: "rule",
          rule: denyRuleForTool,
        },
      }
    : undefined;
}
//@ chunk-1dbza2qv.js:41435-41611 placement
/**
 * 判断路径是否在受信任的网络根下：UNC 路径需主机一致的根才算。
 */
function isInTrustedNetworkRoot(path, roots) {
  if (!isUncOrDevicePath(path)) return isPathInTrustedNetworkRoot(path, roots);
  let host = uncHostOf(path);
  if (host === null) return false;
  for (let [root, paths] of roots ?? [])
    for (let rootPath of paths)
      if (
        isUncOrDevicePath(rootPath) &&
        uncHostOf(rootPath) === host &&
        isPathInTrustedNetworkRoot(path, new Map([[root, [rootPath]]]))
      )
        return true;
  return false;
}
//@ chunk-1dbza2qv.js:41611-43414 placement
async function checkDeviceNamespacePath(path, trustedDirs, roots) {
  if (isDeviceNamespacePath(path) || isDevicePrefixPath(path))
    return {
      refused: {
        behavior: "deny",
        message: "file_path: device- or NT-namespace paths cannot be published \u2014 spell the path plainly",
        decisionReason: {
          type: "other",
          reason: "Device-namespace publish sources cannot be safely classified",
        },
      },
    };
  if (isLocalUncPath(path) || isLocalPathWithHost(path))
    return {
      refused: {
        behavior: "deny",
        message:
          "file_path: loopback network paths name local files but skip their verification \u2014 spell the path plainly",
        decisionReason: {
          type: "other",
          reason: "Loopback network publish sources cannot be safely classified",
        },
      },
    };
  let isNetwork = isNonWslUncPath(path) || isNetworkMountPath(path) || classifyHomeMount(path);
  if (isNetwork && !isInTrustedNetworkRoot(path, roots))
    return {
      refused: {
        behavior: "deny",
        message:
          "Not published: that file is on a network share. Publish a file from this session's folders instead.",
        decisionReason: {
          type: "other",
          reason: "Network publish sources are refused",
        },
      },
    };
  let isLink = false;
  let unreadable = false;
  let result = {
    kind: "network",
  };
  if (!isNetwork) {
    if (pathTouchesProtected(path) || (await isUnsafeSymlinkChain(path)))
      return {
        refused: UNVERIFIABLE_SOURCE_DENIAL,
      };
    result = {
      kind: "absent",
    };
    let hasLink = false;
    let linkStat;
    try {
      let lstatResult = await lstat(path, {
        bigint: true,
      });
      hasLink = lstatResult.isSymbolicLink();
      if (!hasLink)
        linkStat = {
          dev: lstatResult.dev,
          ino: lstatResult.ino,
        };
    } catch {}
    if (hasLink || linkStat !== undefined) {
      isLink = hasLink;
      try {
        let real = await realpath(path);
        let realStat = await stat(real, {
          bigint: true,
        });
        if (linkStat !== undefined && (realStat.dev !== linkStat.dev || realStat.ino !== linkStat.ino))
          isLink = true;
        else if (!realStat.isFile()) isLink = true;
        else {
          result = {
            kind: "file",
            dev: realStat.dev,
            ino: realStat.ino,
            sizeBytes: realStat.size,
            mtimeNs: realStat.mtimeNs,
            leafWasLink: hasLink,
          };
          unreadable = realStat.nlink > 1n;
          if (!isLink) {
            let hits = [];
            for (let dir of trustedDirs) {
              hits.push(dir);
              if (isNonWslUncPath(dir) || isNetworkMountPath(dir) || (await isUnsafeSymlinkChain(dir)))
                continue;
              try {
                hits.push(await realpath(dir));
              } catch {}
            }
            let longestRootPrefix = findLongestRootPrefix(path, hits);
            if (longestRootPrefix !== undefined) {
              let sepRe = getPlatform() === "windows" ? /[\\/]+/ : /\/+/;
              let filtered = longestRootPrefix.split(sepRe).filter(Boolean);
              let filtered_2 = path.split(sepRe).filter(Boolean);
              let root = parse(path).root;
              let rootDepth = countWhere(parse(path).root.split(sepRe), Boolean);
              let sawSymlink = true;
              for (let depth = rootDepth; depth < filtered_2.length - 1; depth++) {
                root = join(root, filtered_2[depth] ?? "");
                if (sawSymlink && depth < filtered.length && filtered_2[depth] === filtered[depth]) continue;
                sawSymlink = false;
                try {
                  if ((await lstat(root)).isSymbolicLink()) {
                    isLink = true;
                    break;
                  }
                } catch {
                  isLink = true;
                  break;
                }
              }
            }
          }
        }
      } catch {
        result = {
          kind: "absent",
        };
        isLink = true;
      }
    }
  }
  return {
    pin: result,
    redirected: isLink || unreadable,
    unverifiedSpelling: isLink,
  };
}
//@ chunk-1dbza2qv.js:43414-43499 placement
async function readFdTarget(fd) {
  try {
    return await readlink(`/proc/self/fd/${fd.fd}`);
  } catch {
    return null;
  }
}
//@ chunk-1dbza2qv.js:43499-43563 placement
async function fdPointsAtPath(fd, path) {
  let fdTarget = await readFdTarget(fd);
  return fdTarget !== null && fdTarget === path;
}
//@ chunk-1dbza2qv.js:43563-44107 placement
/**
 * 安全读取已固定的发布源文件：拒绝受保护路径、链接、非普通文件、硬链接、身份变化或超大文件，读取全部字节后核对内容哈希，一致时返回字节、修改时间与身份。
 */
async function readPinnedSource(path, expectedHash) {
  if (pathTouchesProtected(path)) return null;
  try {
    let lstatResult = await lstat(path, {
      bigint: true,
    });
    if (lstatResult.isSymbolicLink() || !lstatResult.isFile()) return null;
    let handle = await open(path, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS | O_NONBLOCK);
    try {
      let stats = await handle.stat({
        bigint: true,
      });
      if (
        !stats.isFile() ||
        stats.nlink !== 1n ||
        stats.ino !== lstatResult.ino ||
        stats.dev !== lstatResult.dev ||
        stats.size > BigInt(MAX_ARTIFACT_BYTES) ||
        !(await fdPointsAtPath(handle, path)) ||
        (
          await handle.stat({
            bigint: true,
          })
        ).nlink !== 1n
      )
        return null;
      let bytes = await readExactBytes(handle, Number(stats.size));
      if (bytes === null || computeContentHash(bytes) !== expectedHash) return null;
      return {
        bytes,
        mtimeMs: Number(stats.mtimeMs),
        identity: {
          dev: stats.dev,
          ino: stats.ino,
        },
      };
    } finally {
      await handle.close().catch(() => {});
    }
  } catch {
    return null;
  }
}
//@ chunk-1dbza2qv.js:44107-45230 placement
async function checkSourceUnchanged(path, lstatInfo, expected) {
  let filtered = expected.digests.filter((digest) => digest !== undefined);
  let hasDigests = filtered.length > 0;
  if (pathTouchesProtected(path) || (await isUnsafeSymlinkChain(path)))
    return {
      kind: "changed",
    };
  let followOk = lstatInfo.kind === "absent" || !lstatInfo.leafWasLink;
  if (followOk)
    try {
      if ((await lstat(path)).isSymbolicLink())
        return {
          kind: "changed",
        };
    } catch {}
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | (followOk ? NOFOLLOW_NONBLOCK_FLAGS : O_NONBLOCK));
  } catch (error) {
    if (isENOENT(error))
      return {
        kind: "missing",
      };
    if (isErrnoCode(error, "ELOOP") && followOk)
      return {
        kind: "changed",
      };
    throw error;
  }
  try {
    if (expected.admittedPath !== undefined && !(await fdPointsAtPath(handle, expected.admittedPath)))
      return {
        kind: "changed",
      };
    let stats = await handle.stat({
      bigint: true,
    });
    if (expected.admittedPath !== undefined && stats.nlink !== 1n)
      return {
        kind: "changed",
      };
    if (
      lstatInfo.kind === "absent" ||
      stats.dev !== lstatInfo.dev ||
      stats.ino !== lstatInfo.ino ||
      stats.size !== lstatInfo.sizeBytes ||
      (!hasDigests && stats.mtimeNs !== lstatInfo.mtimeNs)
    )
      return {
        kind: "changed",
      };
    if (stats.size > BigInt(MAX_ARTIFACT_BYTES))
      return {
        kind: "too_large",
        size: Number(stats.size),
      };
    if (env.CLAUDE_CODE_EVAL_CONFINED && stats.nlink > 1n)
      return {
        kind: "changed",
      };
    let exactBytes = await readExactBytes(handle, Number(stats.size));
    if (exactBytes === null)
      return {
        kind: "changed",
      };
    if (hasDigests) {
      let contentHash = computeContentHash(exactBytes);
      if (!filtered.every((digest) => digest === contentHash))
        return {
          kind: "changed",
        };
    } else {
      let stats_2 = await handle.stat({
        bigint: true,
      });
      if (stats_2.mtimeNs !== stats.mtimeNs || stats_2.size !== stats.size)
        return {
          kind: "changed",
        };
    }
    return {
      kind: "ok",
      bytes: exactBytes,
      mtimeMs: Number(stats.mtimeMs),
    };
  } finally {
    await handle.close();
  }
}
//@ chunk-1dbza2qv.js:45230-45346 placement
/**
 * 确认源文件未变化后计算内容哈希，出错或已变化返回 undefined。
 */
async function hashSourceIfUnchanged(path, pin) {
  try {
    let check = await checkSourceUnchanged(path, pin, {
      digests: [],
    });
    return check.kind === "ok" ? computeContentHash(check.bytes) : undefined;
  } catch {
    return;
  }
}
//@ chunk-1dbza2qv.js:45346-45589 placement
/**
 * 判断两次固定的文件身份是否一致（设备、inode、叶子是否链接、大小，无哈希时还比较修改时间）。
 */
function samePinIdentity(a, b) {
  if (a.pin.kind !== "file" || b.kind !== "file") return a.pin.kind === b.kind;
  return (
    a.pin.dev === b.dev &&
    a.pin.ino === b.ino &&
    a.pin.leafWasLink === b.leafWasLink &&
    a.pin.sizeBytes === b.sizeBytes &&
    (a.sha256 !== undefined || a.pin.mtimeNs === b.mtimeNs)
  );
}
//@ chunk-1dbza2qv.js:45589-45650 placement
/**
 * 导出函数 `assertArtifactWithinLimit`：参数 e。
 */
function assertArtifactWithinLimit(artifact) {
  if (artifact > MAX_ARTIFACT_BYTES)
    throw new ArtifactInputError(describeTooLargePage(artifact), "too_large_raw");
}
//@ chunk-1dbza2qv.js:45650-46229 placement
function describeUndecodableSource({ kind, encoding, where }, desc) {
  let text = desc === "publish" ? "then publish again. Nothing was published." : "then preview again.";
  return kind === "undecodable"
    ? `file_path: the source file is not valid ${encoding === "utf-16le" ? "UTF-16" : "UTF-8"} text (first invalid byte at ${where}). It may be saved in another encoding or contain binary data. Rewrite it as UTF-8, ${text}`
    : `file_path: the source file has the replacement character U+FFFD at ${where}, usually left where an earlier edit or paste lost a character. Replace it with the intended text (in HTML, write an intended U+FFFD as &#xFFFD;), ${text}`;
}
//@ chunk-1dbza2qv.js:46229-46505 placement
/**
 * 严格把发布源文件字节解码为文本；无法解码或含替换字符时打点并抛出输入错误。
 */
function decodeSourceText(buffer, whose) {
  let decoded = decodeTextStrict(buffer);
  if (decoded.problem === undefined) return decoded.text;
  let kind = decoded.problem.kind === "undecodable" ? "source_encoding" : "source_replacement_char";
  logFeatureBad("artifact_publish", kind, {
    source_bytes: buffer.length,
    encoding: fromEnum(decoded.problem.encoding),
    md: whose.md,
  });
  throw new ArtifactInputError(describeUndecodableSource(decoded.problem, "publish"), kind);
}
export {
  checkAttachmentForPublish,
  publishingReadDeniedText,
  isVerifiedAttachment,
  isUnverifiedUpload,
  dbReadSourceSchema,
  dbWriteSourceSchema,
  quotedSweptPath,
  allActionSourceSchemas,
  evictOldestStash,
  MAX_SOURCE_PATHS,
  collectPublishDirs,
  getScratchpadPairs,
  getWorkingDirPairs,
  isUnderPublishDirs,
  resolvePublishBaseRealpath,
  MAX_LISTED_ARTIFACTS,
  getPublishReadDenial,
  checkDeviceNamespacePath,
  MAX_QUERY_CURSOR_CHARS,
  hashSourceIfUnchanged,
  versionedPublishSourceSchema,
  liveSyncSourceSchema,
  verifySourceSchema,
  fileListSourceSchema,
  fileReadSourceSchema,
  filesReadSourceSchema,
  describePublishFiles,
  TYPE_LOCK_SCHEMA,
  readPinnedSource,
  checkPublishSourcePin,
  sourcePathChangedError,
  MAX_COMMENT_TEXT_CHARS,
  READ_CHECK_NEEDS_APPROVAL,
  samePinIdentity,
  SOURCE_CHANGED_MESSAGE,
  decodeSourceText,
  SOURCE_UNVERIFIED_MESSAGE,
  isInTrustedNetworkRoot,
  UNVERIFIABLE_SOURCE_DENIAL,
  assertArtifactWithinLimit,
  checkSourceUnchanged,
  toPublishAnchorOptions,
  MAX_PAGE_NAMES,
  liveEditSourceSchema,
  pinSourceSchema,
  describeUndecodableSource,
  previewSourceSchema,
  emulatorPreviewSourceSchema,
  sharedSourceSchema,
  TYPE_FILE_UNREAD_REASONS,
  MERGED_OVER_SCHEMA,
};
