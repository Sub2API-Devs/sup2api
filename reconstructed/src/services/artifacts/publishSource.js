/**
 * services/artifacts/publishSource.ts
 *
 * Artifact 发布来源校验与提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0wdgqhcf.js (57)
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
  u,
  string,
  unknown,
  record,
  M,
  array,
  E,
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
import { MAX_MOUNT_FILE_BYTES } from "./gatewayRead.js";
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
import { count } from "../../utils/collections.js";
import { NOFOLLOW_NONBLOCK_FLAGS, O_NONBLOCK } from "../../utils/fsFlags.js";
import { isErrnoCode } from "../../utils/fsSafety/hardenedRead.js";
import { describeTooLargePage } from "./publishReadChecks.js";
import { decodeTextStrict } from "./contentTypes.js";
import { logFeatureBad } from "../analytics/featureTelemetry.js";
import { fromEnum } from "../analytics/safeMetadata.js";

//@ chunk-0wdgqhcf.js:12464-13399 placement
function describePublishFiles(e, t) {
  if (e === undefined) return "";
  let n = ARTIFACT_EMBED_ERRORS().safeParse(e);
  if (!n.success) return "";
  let r = n.data;
  let s = [];
  if (r.pins.length > 0) {
    let joined = r.pins
      .slice(0, MAX_EMBED_WARNINGS)
      .map((pin) => {
        let S = escapeXml(pin.uuid, 8);
        let y =
          pin.files !== undefined && Number.isInteger(pin.files) && pin.files >= 0
            ? `, ${pin.files} ${pin.files === 1 ? "file" : "files"}`
            : "";
        let path = DEP_MODULE_PATH_RE.test(pin.path) ? pin.path : "?";
        return `${S}\u2026 \u2192 ${path}${pin.module ? ", module" : ""}${y}`;
      })
      .join("; ");
    s.push(`Embedded parts pinned: ${r.pins.length} (${joined}).`);
  }
  for (let warning of r.warnings.slice(0, MAX_EMBED_PINS)) {
    let b = warning.src === undefined ? "" : escapeXml(warning.src);
    let S = b !== "" ? `<artifact-embed src="${b}">` : "<artifact-embed>";
    let y =
      warning.count !== undefined && Number.isInteger(warning.count) && warning.count > 1
        ? ` \xD7${warning.count}`
        : "";
    let reason = Object.hasOwn(EMBED_ERROR_TEXTS, warning.reason) ? warning.reason : "unknown";
    let v = Object.hasOwn(EMBED_ERROR_TEXTS, reason)
      ? `: ${EMBED_ERROR_TEXTS[reason]}${reason === "not_embeddable" ? (t ?? "") : ""}`
      : "";
    s.push(`${S}${y} not resolved \u2014 ${reason}${v}.`);
  }
  if (s.length === 0) return "";
  let joined = s.join(`
`);
  let a = ARTIFACT_MAX_RESULT_SIZE_CHARS / 2;
  return `

${joined.length > a ? `${truncateToLength(joined, a)} \u2026 (embeds truncated)` : joined}`;
}
//@ chunk-0wdgqhcf.js:13399-13426 placement
/**
 * 导出常量或表 `MAX_TITLE_CHARS`：值为 256, Ye = null, at = null。
 */
var MAX_TITLE_CHARS = 256;
var COLLAB_SCHEMA_INCLUDED = null;
var HANDLERS_SCHEMA = null;
//@ chunk-0wdgqhcf.js:13426-15845 placement
/**
 * Artifact 发布结果 schema 的编译期开关（嵌入错误、路由声明、提示字段，均为 false）与发布结果 schema（url、路径、版本、能力声明与存储契约、警告、剩余发布次数、图标、受众、合并信息、实时订阅、编辑应用情况、种子线程、复制来源等），以及合并基线 schema。
 */
var EMBEDS_RESULT_ENABLED = false;
var DECLARED_BY_ROUTE_ENABLED = false;
var PUBLISH_HINTS_ENABLED = false;
var PUBLISH_RESULT_SCHEMA = DoctorLazy(() =>
  u({
    url: string(),
    path: string(),
    artifact_id: string().regex(ARTIFACT_SLUG_RE).optional(),
    title: string().optional(),
    version: string().regex(VER_SHAPE).optional(),
    capabilities: unknown().optional(),
    stored: u({
      contract: string(),
      preferredContract: string().optional(),
      capabilities: record(string(), unknown()).optional(),
      carried: M().optional(),
      ...(DECLARED_BY_ROUTE_ENABLED && {
        declaredByRoute: M().optional(),
      }),
      read: string().optional(),
    }).optional(),
    warnings: array(string()).optional(),
    publishesRemaining: E().int().min(0).optional().catch(undefined),
    publishesResetAt: E().int().positive().optional().catch(undefined),
    ...(EMBEDS_RESULT_ENABLED && {
      embeds: ARTIFACT_EMBED_ERRORS().optional().catch(undefined),
    }),
    contract: string().optional(),
    updated: M().optional(),
    owned: M().optional().catch(undefined),
    icon: string().max(40).optional().catch(undefined),
    faviconSent: literal(true).optional().catch(undefined),
    iconDropped: literal(true).optional().catch(undefined),
    audience: string().optional(),
    seq: E().int().nonnegative().optional().catch(undefined),
    unchanged: literal(true).optional().catch(undefined),
    merged_over: MERGED_OVER_SCHEMA().optional().catch(undefined),
    ...(hotUpdateOn() && {
      deadline: u({
        until: E().int().positive().max(MAX_EPOCH_MS),
      })
        .optional()
        .catch(undefined),
      deadlineDropped: literal(true).optional().catch(undefined),
    }),
    liveSubscription: string().optional(),
    verifyGuide: string().optional(),
    editsApplied: E().int().positive().optional().catch(undefined),
    editsNotWritten: _enum(["write_failed", "not_writable", "changed_during_publish", "hard_linked"])
      .optional()
      .catch(undefined),
    ...(PUBLISH_HINTS_ENABLED && {
      kindNote: literal(true).optional().catch(undefined),
      watchBrief: literal(true).optional().catch(undefined),
      previewHint: literal(true).optional().catch(undefined),
    }),
    seededThread: string().regex(ARTIFACT_SLUG_RE).optional(),
    ...(isArtifactRoomEnabledStub() && {
      room: string().optional(),
    }),
    ...(copyFromOn() && {
      copied: array(
        u({
          path: string().max(MAX_PUBLISHED_PATH_LENGTH),
          from_url: string(),
          from_path: string().max(MAX_PUBLISHED_PATH_LENGTH),
        }),
      )
        .max(MAX_URL_SEGMENT_CHARS)
        .optional(),
    }),
    ...(pathPinsOn() && filesWrittenFields()),
    ...(artifactPinsOn() && {
      pinned: M().optional(),
    }),
    ...(COLLAB_SCHEMA_INCLUDED && {
      kind: string().optional(),
    }),
    ...(COLLAB_SCHEMA_INCLUDED && {
      liveDocCollab: string().optional(),
    }),
    ...(COLLAB_SCHEMA_INCLUDED && {
      liveDocWorkingCopy: string().optional(),
    }),
    ...(COLLAB_SCHEMA_INCLUDED && {
      liveFileWorkingCopies: string().max(8192).optional(),
    }),
    ...(COLLAB_SCHEMA_INCLUDED && {
      ldxBuild: string().max(8192).optional(),
    }),
    ...(COLLAB_SCHEMA_INCLUDED && {
      liveDocVersion: M().optional(),
    }),
    ...(COLLAB_SCHEMA_INCLUDED && {
      liveDocShim: u({
        file: string().max(4096),
        edits: E().int().min(0).max(1e6),
        ontoCurrent: M().optional(),
        complete: M().optional(),
        sourceIsCopy: M().optional(),
        copyPath: string().max(4096).optional(),
        livePath: string().max(512).optional(),
      }).optional(),
    }),
    ...(COLLAB_SCHEMA_INCLUDED && {
      capabilitiesDefaulted: M().optional(),
    }),
    ...(artifactTypesOn() && typeInfoFields()),
  }),
);
var MERGED_OVER_SCHEMA = DoctorLazy(() =>
  u({
    base: string().regex(VER_SHAPE),
    live: string().regex(VER_SHAPE).optional().catch(undefined),
    changed: array(
      u({
        path: string().max(MAX_ECHO_MANIFEST_PATH),
        sha256: string().regex(SHA256_HEX_RE).nullable(),
      }),
    )
      .max(MERGED_CHANGED_KEEP)
      .optional()
      .catch(undefined),
    omitted: E().int().positive().optional().catch(undefined),
  }),
);
//@ chunk-0wdgqhcf.js:15845-16022 placement
function filesWrittenFields() {
  return {
    files_written: array(
      u({
        path: string().max(MAX_PUBLISHED_PATH_LENGTH),
        sha256: string().regex(SHA256_HEX_RE),
      }),
    )
      .max(MAX_URL_SEGMENT_CHARS)
      .optional()
      .catch(undefined),
    files_removed: array(string().max(MAX_PUBLISHED_PATH_LENGTH))
      .max(MAX_URL_SEGMENT_CHARS)
      .optional()
      .catch(undefined),
  };
}
//@ chunk-0wdgqhcf.js:16022-16077 placement
function pathPinsOn() {
  return getLiveState().frozenPathPin ?? (isFrameMultiFileEnabled() && isPathPinEnabled());
}
//@ chunk-0wdgqhcf.js:16077-16126 placement
function hotUpdateOn() {
  return getLiveState().frozenHotUpdate ?? isFrameHotUpdateEnabled();
}
//@ chunk-0wdgqhcf.js:16126-16174 placement
function copyFromOn() {
  return getLiveState().frozenCopyFrom ?? isFrameCopyFromEnabled();
}
//@ chunk-0wdgqhcf.js:16174-16244 placement
function artifactTypesOn() {
  return getLiveState().frozenArtifactTypes?.typesOn ?? (artifactTypesEnabled() && isFrameMultiFileEnabled());
}
//@ chunk-0wdgqhcf.js:16244-16467 placement
/**
 * artifact 类型锁的 schema：类型链接、当前发行版、最新发行版、阻止升级的信息（目标版本、原因、冲突数、路径）。
 */
var TYPE_LOCK_SCHEMA = DoctorLazy(() =>
  u({
    url: string(),
    release: string(),
    latest: string().optional(),
    blocked: u({
      to: string().optional(),
      reason: string(),
      conflict_count: E().int().min(0).max(1e6).optional(),
      paths: array(string().max(MAX_ECHO_MANIFEST_PATH))
        .max(MAX_ECHO_MANIFEST_ENTRIES)
        .optional()
        .catch(undefined),
    }).optional(),
  }),
);
//@ chunk-0wdgqhcf.js:16467-16813 placement
/**
 * 发布参数中与 artifact 类型相关的字段 schema（类型、自有文件、类型文件、服务位置与新增文件等）。
 */
function typeInfoFields() {
  return {
    type: TYPE_LOCK_SCHEMA()
      .optional()
      .describe("The Artifact type (and release) this Artifact was created from"),
    own_files: array(string()).optional(),
    type_files: array(string()).optional(),
    served_at: string().optional().catch(undefined),
    served_root: string().optional().catch(undefined),
    new_files: array(string()).optional().catch(undefined),
    unchanged_files: array(string()).optional().catch(undefined),
  };
}
//@ chunk-0wdgqhcf.js:16813-17997 placement
/**
 * 从类型创建 artifact 的结果 schema（类型、自有/类型文件、服务路径、自动打开时机、预配存储、类型说明、快速开始与设计系统信息等），以及可在存储/压缩时剥离的大字段键表。
 */
var CREATED_FROM_TYPE_SCHEMA = DoctorLazy(() =>
  u({
    created_from_type: literal(true),
    already_created: literal(true).optional(),
    url: string(),
    version: string(),
    owned: M().optional().catch(undefined),
    path: string().optional(),
    title: string().optional(),
    type: u({
      url: string(),
      release: string(),
    }),
    own_files: array(string()),
    type_files: array(string()),
    served_at: string().optional().catch(undefined),
    served_root: string().optional().catch(undefined),
    ...(pathPinsOn() && filesWrittenFields()),
    auto_open: _enum(["at_create", "after_first_write"]).optional(),
    warnings: array(string()).optional(),
    files_error: string().optional(),
    files_error_kind: _enum(["type_owned_path"]).optional(),
    provisioned: u({
      store: string(),
      project_id: string(),
      file_id: string().optional(),
      node_id: string().optional(),
    }).optional(),
    liveSubscription: string().optional(),
    ...(isArtifactRoomEnabledStub() && {
      room: string().optional(),
    }),
    ...(artifactPinsOn() && {
      pinned: M().optional(),
    }),
    ...instructionsFields(),
    ...initReferencesSchema(),
    after_quickstart: u({
      design_system: string().optional(),
      saved_system: string().optional(),
      saved_system_dir: string().optional(),
      saved_pages_dir: string().optional(),
      not_listed: M().optional(),
    }).optional(),
    design_systems: TYPE_INSTANCES_RESULT_SCHEMA().shape.type_instances.optional(),
    design_systems_note: string().optional(),
    ...designSystemSchema(),
  }),
);
var QUICKSTART_STRIPPABLE_KEYS = {
  init_references: true,
  after_quickstart: true,
  design_systems: true,
  design_systems_note: true,
  design_system: true,
};
var CREATE_STRIPPABLE_KEYS = {
  instructions: true,
  instructions_chars: true,
  instructions_clipped: true,
  instructions_unavailable: true,
  ...QUICKSTART_STRIPPABLE_KEYS,
};
//@ chunk-0wdgqhcf.js:17997-18049 placement
function artifactPinsOn() {
  return getLiveState().frozenArtifactPins ?? isArtifactPinEnabled();
}
//@ chunk-0wdgqhcf.js:18049-18222 placement
function instructionsFields() {
  return {
    instructions: string().optional(),
    instructions_chars: E().int().min(0).optional(),
    instructions_clipped: M().optional(),
    instructions_unavailable: string().optional(),
  };
}
//@ chunk-0wdgqhcf.js:18222-20310 placement
/**
 * 类型目录相关的结果 schema：类型列表、类型实例列表、类型条目、快速开始（意图匹配、候选类型、设计系统、起步套件等）、类型文件读取结果及未读原因、类型详情。
 */
var TYPES_LIST_RESULT_SCHEMA = DoctorLazy(() =>
  u({
    artifact_types: array(
      u({
        title: string(),
        type_url: string(),
        description: string().optional(),
        tier: string().optional(),
      }),
    ),
    query: string().optional(),
    more: M().optional(),
    dropped: E().int().min(0).optional(),
    unavailable: M().optional(),
    docs_unfillable: M().optional(),
  }),
);
var TYPE_INSTANCES_RESULT_SCHEMA = DoctorLazy(() =>
  u({
    type_instances: u({
      type: string().optional(),
      type_url: string().optional(),
      scope: string(),
      instances: array(
        u({
          title: string(),
          url: string(),
          description: string().optional(),
          created_at: string().optional(),
          rel: string().optional(),
          audience: string().optional(),
          outsiders_may_have_written: literal(true).optional(),
          default: string().optional(),
        }),
      ),
      more: M().optional(),
      overflow: M().optional(),
      dropped: E().int().min(0).optional(),
      unavailable: M().optional(),
    }),
  }),
);
var TYPE_ENTRY_SCHEMA = DoctorLazy(() =>
  u({
    title: string(),
    type_url: string(),
    description: string().optional(),
    tier: string().optional(),
  }),
);
var QUICKSTART_RESULT_SCHEMA = DoctorLazy(() =>
  u({
    quickstart: u({
      intent: string(),
      match: TYPE_ENTRY_SCHEMA().optional(),
      match_of: E().optional(),
      ask_first: M().optional(),
      types: array(TYPE_ENTRY_SCHEMA()).optional(),
      types_more: M().optional(),
      dashboard_type: TYPE_ENTRY_SCHEMA().optional(),
      motion_type: TYPE_ENTRY_SCHEMA().optional(),
      ...false,
      ...false,
      types_unavailable: M().optional(),
      types_ruled: M().optional(),
      types_ambiguous: M().optional(),
      types_partial: M().optional(),
      types_note: string().optional(),
      types_hooked: M().optional(),
      docs_connector: M().optional(),
      design_systems: TYPE_INSTANCES_RESULT_SCHEMA().shape.type_instances.optional(),
      design_systems_note: string().optional(),
      design_systems_off: M().optional(),
      ...designSystemSchema(),
      design_guidance: M().optional(),
      start_kit: startKitSchema().optional(),
    }),
  }),
);
var TYPE_FILE_UNREAD_REASONS = [
  "withheld",
  "not_listed",
  "not_text",
  "too_large",
  "unavailable",
  "result_full",
];
var TYPE_FILE_RESULT_SCHEMA = DoctorLazy(() =>
  u({
    path: string(),
    content: string().optional(),
    chars: E().int().min(0).optional(),
    clipped: M().optional(),
    unread: _enum(TYPE_FILE_UNREAD_REASONS).optional(),
    why: string().optional(),
  }),
);
var DESCRIBE_TYPE_RESULT_SCHEMA = DoctorLazy(() =>
  u({
    artifact_type: u({
      title: string(),
      type_url: string(),
      description: string().optional(),
      tier: string().optional(),
      release: string().optional(),
      files: array(string()),
      files_omitted: E().int().min(0).optional(),
      instructions_file: M(),
      instructions: string().optional(),
      instructions_chars: E().int().min(0).optional(),
      instructions_clipped: M().optional(),
      instructions_unavailable: string().optional(),
      capabilities: array(string()),
      creatable: M().optional(),
    }),
    read_of_type_link: literal(true).optional(),
    type_file: TYPE_FILE_RESULT_SCHEMA().optional(),
    type_files_read: array(TYPE_FILE_RESULT_SCHEMA()).max(MAX_SEGMENT_WITH_SLASH).optional(),
  }),
);
//@ chunk-0wdgqhcf.js:20310-20559 placement
function artifactListRowSchema() {
  let e = {
    title: string(),
    url: string(),
    favicon: string().optional(),
    updatedAt: string().optional(),
    rel: _enum(ARTIFACT_LIST_RELS).optional(),
    external: literal(true).optional(),
    role: _enum(SHARE_ROLES).optional(),
    outsidersMayHaveWritten: literal(true).optional(),
  };
  return artifactPinsOn()
    ? u({
        ...e,
        pinned: M().optional(),
      })
    : u(e);
}
//@ chunk-0wdgqhcf.js:20559-32269 placement
/**
 * Artifact 发布来源相关的提示文本表（共享范围、持久唤醒、实时订阅停止等）
 */
var PUBLISH_SOURCE_TEXTS = DoctorLazy(() =>
  u({
    artifacts: array(artifactListRowSchema()),
    truncated: M().optional(),
    total: E().int().min(0).optional(),
    total_at_least: literal(true).optional(),
    ...(artifactPinsOn() && {
      pins_enabled: M().optional(),
    }),
    scope: _enum(["shared", "all"]).optional(),
    external_listed: literal(true).optional(),
  }),
);
var readSourceSchema = DoctorLazy(() =>
  u({
    read: u({
      url: string(),
      bytes: E(),
      code: E(),
      codeText: string(),
      result: string(),
      durationMs: E(),
      title: string().max(MAX_TITLE_CHARS).optional(),
    }),
    owned: M().optional().catch(undefined),
    artifactRead: u({
      slug: string(),
      ver: string().optional(),
      seeded: literal(false).optional(),
    }).optional(),
  }),
);
var commentsListSourceSchema = DoctorLazy(() =>
  u({
    threads_dropped: M().optional(),
    thread_filter: string().optional(),
    scoped_dispatch: M().optional(),
    foreign: literal(true).optional(),
    cursor: string().optional(),
    outside_org: M().optional(),
    page_owns_threads: M().optional(),
    names: record(string(), string()).optional(),
    threads: array(
      u({
        id: string(),
        created_at: string().optional(),
        resolved: M(),
        resolved_degraded: M().optional(),
        resolved_by_claude: M().optional(),
        claude_activated: M(),
        activated_degraded: M().optional(),
        carried: M().optional(),
        anchor_path: string().optional(),
        span_quote: string().optional(),
        anchor_file: string().optional(),
        anchor_file_degraded: M().optional(),
        anchor_file_sha: string().optional(),
        anchor_moved_at: string().optional(),
        anchor_label: string().optional(),
        anchor_detail: string().optional(),
        anchor_snippet: string().optional(),
        anchor_region: M().optional(),
        region_inside: array(string()).optional(),
        comments_degraded: M().optional(),
        comments: array(
          u({
            id: string(),
            account: string(),
            role: string().optional(),
            text: string(),
            created_at: string().optional(),
            sent_to_claude: M().optional(),
            sent_to_claude_degraded: M().optional(),
            sent_by_viewer: M().optional(),
            posted_by_artifact: M().optional(),
            awaiting_reply: M().optional(),
            presence: string().optional(),
            access: string().optional(),
            outside: literal(true).optional(),
          }),
        ),
      }),
    ),
  }),
);
var replyCommentSourceSchema = DoctorLazy(() =>
  u({
    replied: M(),
    thread_id: string(),
    comment_id: string().optional(),
    replayed: M().optional(),
    not_activated: M().optional(),
    summon_answered: M().optional(),
    summon_foreign: M().optional(),
    already_answered: M().optional(),
    page_owns_threads: M().optional(),
    standing_reply_id: string().optional(),
  }),
);
var resolveCommentSourceSchema = DoctorLazy(() =>
  u({
    thread_resolved: M(),
    thread_id: string(),
    not_activated: M().optional(),
    not_authorized: M().optional(),
    summon_foreign: M().optional(),
    relayed_credential: M().optional(),
    page_owns_threads: M().optional(),
  }),
);
var liveEditSourceSchema = () =>
  u({
    liveEdit: u({
      version: E().int().min(-1),
      replayed: M(),
      noop: M().optional(),
      opCount: E(),
      created: array(string()),
      rttMs: E().optional(),
      collab: string().optional(),
    }),
  });
var liveSyncSourceSchema = () =>
  u({
    sync: u({
      seq: E().int().min(-1),
      path: string().max(4096),
      live_path: string().max(512).optional(),
      pushed: u({
        version: E().int().min(0),
        touched: E().int().min(0),
        created: array(string().max(64)).max(64),
        createdUnlisted: E().int().min(0).optional(),
        ontoCurrent: M(),
        complete: M().optional(),
      }).optional(),
      pulled: array(string().max(4096)).max(64),
      pulledUnlisted: E().int().min(0).optional(),
      fileChanged: M(),
      fileMissing: M().optional(),
      newlyBound: M().optional(),
      diverged: literal(true).optional(),
      refused: string().max(2048).optional(),
      size: string().max(MAX_SIZE_CLAUSE_CHARS).optional(),
      ldx_build: string().max(8192).optional(),
    }),
  });
var versionedPublishSourceSchema = () =>
  u({
    versioned: u({
      url: string(),
      artifact_id: string().regex(ARTIFACT_SLUG_RE),
      version: string().regex(VER_SHAPE),
      label: versionLabelSchema().optional(),
      warnings: array(string().max(4096)).max(64).optional(),
    }),
  });
var watchSourceSchema = DoctorLazy(() =>
  u({
    watch: u({
      url: string(),
      watching: M(),
      outcome: string(),
      reason: string().optional(),
      durable_skip_reason: string().optional(),
      task_id: string().optional(),
      since: E().optional(),
      token_expires_at: E().optional(),
      ...(isArtifactCommentsEnabled() && {
        auto_reply: string().optional(),
        can_edit: M().optional(),
        user_turn: M().optional(),
        named_by_user: M().optional(),
        replies_declined: M().optional(),
      }),
      ...(COLLAB_SCHEMA_INCLUDED && {
        liveDocCollab: string().optional(),
        liveDocPath: string().optional(),
      }),
      rail: string().optional(),
      trigger_id: string().optional(),
      durable_since: string().optional(),
      status: E().optional(),
      detail: string().optional(),
      note: string().optional(),
      events: array(string()).optional(),
    }),
  }),
);
var unwatchSourceSchema = DoctorLazy(() =>
  u({
    unwatch: u({
      url: string(),
      was_watching: M(),
    }),
  }),
);
var resumeRepliesSourceSchema = DoctorLazy(() =>
  u({
    resume_replies: u({
      url: string(),
      resumed: M(),
      outcome: string(),
      reason: string().optional(),
      task_id: string().optional(),
      stop_kind: string().optional(),
      in_place: M().optional(),
      connecting: M().optional(),
    }),
  }),
);
var roomPeerSourceSchema = DoctorLazy(() =>
  u({
    url: string(),
    connected: M(),
    peers: E(),
    viewers: array(
      u({
        peer: string(),
        presence: looseObject({}),
        updated_ago_ms: E(),
      }),
    ).optional(),
  }),
);
var watchesListSourceSchema = DoctorLazy(() =>
  u({
    watches: array(
      union([
        u({
          url: string(),
          task_id: string(),
          since: E(),
          explicit: M(),
          connected: M(),
          connecting: M().optional(),
          token_expires_at: E(),
          armed_via: string().optional(),
          ...(isArtifactCommentsEnabled() && {
            auto_reply: string().optional(),
            unread_plain_comments: E().optional(),
            summons_awaiting_reply: E().optional(),
            comments_uncounted: M().optional(),
            comments_partially_counted: M().optional(),
          }),
        }),
        u({
          url: string(),
          rail: literal("durable_wake"),
          trigger_id: string(),
          since: string(),
          events: array(string()).optional(),
          restored: M().optional(),
        }),
        u({
          url: string(),
          rail: literal("live_stopped"),
          since: E().optional(),
          explicit: M().optional(),
          armed_via: string().optional(),
          ...(isArtifactCommentsEnabled() && {
            auto_reply: string(),
          }),
          stop_kind: string(),
        }),
      ]),
    ),
    filter_url: string().optional(),
    arms: array(
      u({
        url: string(),
        rail: string().optional(),
        state: string(),
        reconnect: M().optional(),
        failures: E().optional(),
        max_failures: E().optional(),
        next_in_s: E().optional(),
        last_failure: string().optional(),
        reason: string().optional(),
        detail: string().optional(),
        server_message: string().optional(),
        at: E().optional(),
      }),
    ).optional(),
    ...(isArtifactRoomEnabledStub() && {
      rooms: array(roomPeerSourceSchema()).optional(),
    }),
  }),
);
var roomSendSourceSchema = DoctorLazy(() =>
  u({
    room_send: u({
      url: string(),
      topic: string(),
      delivered: M(),
      peers: E().optional(),
      reason: string().optional(),
    }),
  }),
);
var dbReadSourceSchema = DoctorLazy(() =>
  u({
    db_read: u({
      op: string(),
      collection: string(),
      doc_id: string().optional(),
      found: M().optional(),
      as_level: string().max(16).optional(),
      as_level_confirmed: M().optional(),
      docs: array(
        u({
          id: string(),
          data: record(string(), unknown()),
          version: E().int().optional(),
          updatedAt: string().optional(),
        }),
      ).optional(),
      next_cursor: string().optional(),
      me_id: string().max(200).optional(),
      ordered_by: u({
        field: string(),
        limit: E().int().positive(),
      }).optional(),
      foreign: literal(true).optional(),
      outside_writer: literal(true).optional(),
      saved: u({
        dir: string().max(8192),
        files: array(
          u({
            id: string(),
            path: string().max(8192),
            bytes: E().int().nonnegative(),
            compact: M().optional(),
            version: E().int().optional(),
            updatedAt: string().optional(),
          }),
        ),
        skipped: array(
          u({
            id: string(),
            reason: string(),
          }),
        ),
      }).optional(),
    }),
  }),
);
var dbProfilesSourceSchema = DoctorLazy(() =>
  u({
    db_profiles: u({
      ids: array(string()),
      profiles: record(
        string(),
        u({
          name: string().optional(),
          guest: literal(true).optional(),
        }),
      ).optional(),
      unavailable: literal(true).optional(),
    }),
  }),
);
var dbWriteOpSourceSchema = DoctorLazy(() =>
  u({
    op: string(),
    collection: string(),
    doc_id: string(),
    field: string().max(MAX_EDITS_PER_CALL).optional(),
    replace_all: literal(true).optional(),
    version: E().int().optional(),
  }),
);
var dbUsageSourceSchema = DoctorLazy(() =>
  u({
    documents: E().int().nonnegative(),
    max_documents: E().int().positive(),
  })
    .optional()
    .catch(undefined),
);
var embeddedUsageSourceSchema = DoctorLazy(() =>
  u({
    strings: E().int().positive(),
    kb: E().int().positive(),
  })
    .optional()
    .catch(undefined),
);
var warningsSourceSchema = DoctorLazy(() => array(string()).optional().catch(undefined));
var writtenCommonFields = {
  written: u({
    url: string(),
  })
    .optional()
    .catch(undefined),
  owned: M().optional().catch(undefined),
};
var dbWriteSourceSchema = DoctorLazy(() =>
  u({
    ...writtenCommonFields,
    as_level: string().max(16).optional(),
    as_level_confirmed: M().optional(),
    db_write: union([
      dbWriteOpSourceSchema().extend({
        committed: M(),
        usage: dbUsageSourceSchema(),
        embedded: embeddedUsageSourceSchema(),
        warnings: warningsSourceSchema(),
      }),
      u({
        op: literal(DB_BATCH_OP),
        committed: M(),
        results: array(dbWriteOpSourceSchema()),
        usage: dbUsageSourceSchema(),
        embedded: embeddedUsageSourceSchema(),
        warnings: warningsSourceSchema(),
        fallback: literal("sequential").optional(),
      }),
    ]),
  }),
);
var assetRecordSchema = {
  id: string().regex(ASSET_ID_RE),
  url: string().regex(ASSET_BLOB_URL_RE),
  size_bytes: E().int().positive().max(MAX_FRAME_RESPONSE_BYTES),
  content_type: string().regex(CONTENT_TYPE_RE).max(100),
  sha256: string().regex(SHA256_HEX_RE).optional(),
  file_name: string().max(1024),
};
var assetUploadSourceSchema = DoctorLazy(() =>
  u({
    ...writtenCommonFields,
    asset_upload: u(assetRecordSchema),
  }),
);
var assetUploadsSourceSchema = DoctorLazy(() =>
  u({
    ...writtenCommonFields,
    asset_uploads: u({
      url: string(),
      results: array(
        union([
          u({
            file_path: string(),
            status: literal("uploaded"),
            ...assetRecordSchema,
          }),
          u({
            file_path: string(),
            status: _enum(["failed", "not_attempted"]),
            reason: string(),
            message: string(),
            may_be_stored: literal(true).optional(),
          }),
        ]),
      )
        .min(1)
        .max(MAX_UPLOAD_FILE_PATHS),
    }),
  }),
);
var assetListSourceSchema = DoctorLazy(() =>
  u({
    asset_list: u({
      url: string(),
      assets: array(
        u({
          id: string().regex(ASSET_ID_RE),
          url: string().regex(ASSET_BLOB_URL_RE),
          content_type: string().regex(CONTENT_TYPE_RE).max(MAX_CONTENT_TYPE_LENGTH),
          size_bytes: E().int().nonnegative().max(MAX_FRAME_RESPONSE_BYTES),
          sha256: string().regex(SHA256_HEX_RE).optional(),
          created_at: string().max(MAX_CONTENT_TYPE_LENGTH),
        }),
      ).max(1000),
      usage: u({
        files: E().int().nonnegative(),
        bytes: E().int().nonnegative(),
        max_files: E().int().nonnegative(),
        max_bytes: E().int().nonnegative(),
      }),
      next: string().regex(ASSET_CURSOR_RE).optional(),
      cowritten: literal(true).optional(),
      outside_writer: literal(true).optional(),
    }),
  }),
);
var assetReadSourceSchema = DoctorLazy(() =>
  u({
    asset_read: u({
      id: string().regex(ASSET_ID_RE),
      path: string().max(8192),
      size_bytes: E().int().positive().max(MAX_FRAME_RESPONSE_BYTES),
      content_type: string().regex(CONTENT_TYPE_RE).max(100),
      sha256: string().regex(SHA256_HEX_RE),
      cowritten: literal(true).optional(),
      outside_writer: literal(true).optional(),
      public_read: literal(true).optional(),
      foreign: literal(true).optional(),
    }),
  }),
);
var assetCopySourceSchema = DoctorLazy(() =>
  u({
    asset_copy: u({
      url: string(),
      from_url: string(),
      assets: array(
        u({
          from_id: string().regex(ASSET_ID_RE),
          id: string().regex(ASSET_ID_RE),
          url: string().regex(ASSET_BLOB_URL_RE),
          size_bytes: E().int().positive().max(MAX_FRAME_RESPONSE_BYTES),
          content_type: string().regex(CONTENT_TYPE_RE).max(100),
          sha256: string().regex(SHA256_HEX_RE).optional(),
        }),
      ).max(MAX_COPY_ASSET_IDS),
    }),
  }),
);
var assetDeleteSourceSchema = DoctorLazy(() =>
  u({
    ...writtenCommonFields,
    asset_delete: u({
      id: string().regex(ASSET_ID_RE),
      deleted: M(),
    }),
  }),
);
var artifactTitleRefSchema = DoctorLazy(() =>
  u({
    url: string(),
    title: string().max(256).optional(),
  }),
);
var fileListSourceSchema = DoctorLazy(() =>
  u({
    file_list: u({
      url: string(),
      ver: string().regex(SAFE_ERROR_CODE_RE),
      files: array(
        u({
          path: string().max(MAX_PUBLISHED_PATH_LENGTH),
          content_type: string().regex(CONTENT_TYPE_RE),
          size_bytes: E().int().nonnegative().max(MAX_FILE_SIZE),
          sha256: string().regex(SHA256_HEX_RE),
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
      stored: u({
        contract: string().max(64),
        capabilities: record(string().max(64), unknown()).optional(),
      })
        .optional()
        .catch(undefined),
    }),
  }),
);
var fileReadSourceSchema = DoctorLazy(() =>
  u({
    file_read: u({
      url: string().optional(),
      title: string().max(MAX_TITLE_CHARS).optional(),
      path: string().max(MAX_PUBLISHED_PATH_LENGTH),
      saved_to: string().max(8192),
      ver: string().regex(SAFE_ERROR_CODE_RE),
      size_bytes: E().int().nonnegative().max(MAX_MOUNT_FILE_BYTES),
      content_type: string().regex(CONTENT_TYPE_RE),
      sha256: string().regex(SHA256_HEX_RE),
      content: string().max(ARTIFACT_FILE_INLINE_RESULT_CAP).optional(),
      content_scrubbed: literal(true).optional(),
      as_served: literal(true).optional(),
      source: literal(true).optional(),
      live: literal(true).optional(),
      live_verified: literal(true).optional(),
      seq: E().int().nonnegative().optional(),
      ...(COLLAB_SCHEMA_INCLUDED && {
        working_copy: _enum(["bound", "left"]).optional(),
        note: string().max(8192).optional(),
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
var filesReadSourceSchema = DoctorLazy(() =>
  u({
    files_read: u({
      url: string(),
      title: string().max(MAX_TITLE_CHARS).optional(),
      ver: string().regex(SAFE_ERROR_CODE_RE),
      saved_dir: string().max(8192),
      files: array(
        union([
          u({
            path: string().max(MAX_PUBLISHED_PATH_LENGTH),
            saved_to: string().max(8192),
            size_bytes: E().int().nonnegative().max(MAX_MOUNT_FILE_BYTES),
            content_type: string().regex(CONTENT_TYPE_RE),
            sha256: string().regex(SHA256_HEX_RE),
            content: string().max(ARTIFACT_FILE_INLINE_RESULT_CAP).optional(),
            content_scrubbed: literal(true).optional(),
            as_served: literal(true).optional(),
            source: literal(true).optional(),
            foreign: literal(true).optional(),
          }),
          u({
            path: string().max(MAX_PUBLISHED_PATH_LENGTH),
            error: string().max(8192),
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
var artifactDeleteSourceSchema = DoctorLazy(() =>
  u({
    artifact_delete: u({
      url: string(),
      deleted: literal(true),
      already_gone: M().optional(),
    }),
  }),
);
var pinSourceSchema = DoctorLazy(() =>
  u({
    pin: u({
      action: _enum(["pin", "unpin"]),
      url: string(),
      pinned: M(),
      title: string().optional(),
    }),
  }),
);
var verifySourceSchema = DoctorLazy(() =>
  u({
    verify: u({
      url: string(),
      ver: string(),
      state: string(),
      entries: array(unknown()),
      truncated: M().optional(),
      dropped: E().int().optional(),
      waited: M().optional(),
      foreign: literal(true).optional(),
    }),
  }),
);
var previewSourceSchema = DoctorLazy(() =>
  u({
    preview: u({
      file: string().max(4096),
      bytes: E().int(),
      widths: array(E()),
      themes: array(string().max(32)),
      shots: array(
        u({
          width: E(),
          theme: string().max(32),
          height: E().optional(),
          pageHeight: E().optional(),
          path: string().optional(),
          base64: string().optional(),
          error: string().optional(),
        }),
      ),
      issues: array(
        u({
          kind: string(),
          text: string(),
        }),
      ),
      issuesDropped: E().int().optional(),
      renderError: string().optional(),
    }),
  }),
);
var emulatorPreviewSourceSchema = DoctorLazy(() =>
  u({
    emulatorPreview: u({
      file: string().max(4096),
      outcome: string().max(64),
      pictures: array(
        u({
          path: string().max(4096),
          base64: string().optional(),
        }),
      ).max(8),
      marks: array(string()).optional(),
      errors: array(string()).optional(),
      outline: string().optional(),
      stopped: string().optional(),
    }),
  }),
);
var openSourceSchema = DoctorLazy(() =>
  u({
    opened: literal(true),
    url: string(),
    artifact_id: string().regex(ARTIFACT_SLUG_RE),
    title: string().optional(),
    owned: M().optional().catch(undefined),
  }),
);
var pageVersionsSourceSchema = DoctorLazy(() =>
  u({
    page_versions: u({
      url: string(),
      rows: array(
        u({
          id: string(),
          createdAt: string().optional(),
          current: literal(true).optional(),
        }),
      ),
      degraded: literal(true).optional(),
      cut: literal(true).optional(),
    }),
  }),
);
var sharedSourceSchema = DoctorLazy(() =>
  u({
    shared: u({
      url: string(),
      mode: string().max(16),
      access: string().max(16),
      read_mode: string().max(32),
      added: E().int().min(0),
      editors: E().int().min(0).optional(),
      unchanged: M().optional(),
      org_name: string().max(200).optional(),
      title: string().optional(),
    }),
  }),
);
var allActionSourceSchemas = DoctorLazy(() => {
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
  if (HANDLERS_SCHEMA)
    options.push(
      HANDLERS_SCHEMA.handlersDocOutputSchema(),
      HANDLERS_SCHEMA.handlerResultOutputSchema(),
      HANDLERS_SCHEMA.scriptResultOutputSchema(),
    );
  options.push(verifySourceSchema(), previewSourceSchema(), emulatorPreviewSourceSchema());
  return union(options);
});
//@ chunk-0wdgqhcf.js:32383-32596 placement
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
//@ chunk-0wdgqhcf.js:32596-32674 placement
function allPathsInWorkingPath(pathsForPermissionCheck, remoteStageRoot) {
  return pathsForPermissionCheck.every((n) =>
    pathInWorkingPath(n, remoteStageRoot, {
      caseFold: false,
      uncShapeParity: true,
    }),
  );
}
//@ chunk-0wdgqhcf.js:32674-32690 placement
var MAX_ATTACHMENT_BYTES = 67108864;
//@ chunk-0wdgqhcf.js:32690-33069 placement
/**
 * 判断路径是否是本会话的聊天附件：位于暂存根或上传目录且非硬链接；暂存根下按目录认定；上传目录下需核验文件身份与内容摘要并记入已验证附件表。返回是否在内及路径固定信息。
 */
function checkChatAttachment(e, t, n) {
  let pathsForPermissionCheck = getPathsForPermissionCheck(e);
  let remoteStageRoot = getRemoteStageRoot();
  let d = remoteStageRoot !== null && allPathsInWorkingPath(pathsForPermissionCheck, remoteStageRoot);
  if (!d && !allPathsInWorkingPath(pathsForPermissionCheck, sessionUploadsDir()))
    return {
      inside: false,
    };
  let a = n ?? statFileIdentity(t);
  if (a.linked === true)
    return {
      inside: false,
      pin: a,
    };
  if (d)
    return {
      inside: isVerifiedAttachmentFile(a),
      pin: a,
      byDirectory: true,
    };
  let h = verifyAttachmentDigest(a);
  let { verifiedAttachments } = getLiveState();
  if (h === undefined || a.identity === null) {
    verifiedAttachments.delete(a.real);
    return {
      inside: false,
      pin: a,
    };
  }
  verifiedAttachments.set(a.real, a.identity);
  return {
    inside: true,
    pin: {
      ...a,
      digest: h,
    },
  };
}
//@ chunk-0wdgqhcf.js:33069-33150 placement
function isVerifiedAttachmentFile(e) {
  try {
    return e.identity !== null && lstatSync(e.real).isFile();
  } catch {
    return false;
  }
}
//@ chunk-0wdgqhcf.js:33150-33262 placement
function listStageRoots() {
  let e = new Set();
  for (let t of [undefined, env.CLAUDE_STAGE_FILE_ROOT])
    try {
      e.add(resolveStageFileRoot(t));
    } catch {}
  return [...e];
}
//@ chunk-0wdgqhcf.js:33262-33447 placement
/**
 * 判断上传文件是否位于需要验证的目录且尚未验证（可选先做一次解析验证）。
 */
function isUnverifiedUpload(e, t = {}) {
  let n = (s) =>
    pathInWorkingPath(e, s, {
      caseFold: true,
    });
  if (!(n(sessionUploadsDir()) || uploadsRootCandidates().some(n) || listStageRoots().some(n))) return false;
  if (t.verify === true) {
    let localUploadPath = resolveLocalUploadPath(e);
    if (localUploadPath.kind === "resolved") checkChatAttachment(e, localUploadPath.real);
  }
  return !isVerifiedAttachment(e);
}
//@ chunk-0wdgqhcf.js:33447-33679 placement
/**
 * 判断路径是已核验的聊天附件（位于暂存根，或在上传目录且身份与已验证记录一致、非硬链接）。
 */
function isVerifiedAttachment(e) {
  let pathsForPermissionCheck = getPathsForPermissionCheck(e);
  let remoteStageRoot = getRemoteStageRoot();
  let r = remoteStageRoot !== null && allPathsInWorkingPath(pathsForPermissionCheck, remoteStageRoot);
  if (!r && !allPathsInWorkingPath(pathsForPermissionCheck, sessionUploadsDir())) return false;
  let s = statFileIdentity(pathsForPermissionCheck.at(-1) ?? e);
  if (s.linked === true || s.identity === null) return false;
  return (
    r ||
    (attachmentDigestOf(s.real) !== undefined &&
      getLiveState().verifiedAttachments.get(s.real) === s.identity)
  );
}
//@ chunk-0wdgqhcf.js:33679-34062 placement
/**
 * 以不跟随链接的方式打开上传文件，核对文件身份与大小上限，计算内容哈希并与清单摘要比对，一致时返回摘要。
 */
function verifyAttachmentDigest(e) {
  let t = attachmentDigestOf(e.real);
  let n = e.identity === null ? undefined : fileIdentityDev(e.identity);
  if (t === undefined || n === undefined || n > MAX_ATTACHMENT_BYTES) return;
  let r = constants.O_NOFOLLOW | constants.O_NONBLOCK;
  let s;
  try {
    let d = lstatSync(e.real, {
      bigint: true,
    });
    if (!d.isFile() || fileIdentityOf(d) !== e.identity) return;
    s = openSync(e.real, constants.O_RDONLY | r);
    let a = fstatSync(s, {
      bigint: true,
    });
    return a.isFile() && fileIdentityOf(a) === e.identity && computeContentHash(readFileSync(s)) === t
      ? t
      : undefined;
  } catch {
    return;
  } finally {
    if (s !== undefined) closeSync(s);
  }
}
//@ chunk-0wdgqhcf.js:34062-34269 placement
/**
 * 检查附件能否发布：服务端调用或 Cowork 绕过权限模式下视为不在工作目录内，否则按常规检查。
 */
function checkAttachmentForPublish(e, real, n, r) {
  let s =
    isCoworkFramePublishSession() &&
    (n.mode === "bypassPermissions" ||
      isPlanBypass(n.mode, n.isBypassPermissionsModeAvailable) ||
      n.shouldAvoidPermissionPrompts === true);
  if (n.servedCall === true || s)
    return {
      inside: false,
    };
  return checkChatAttachment(e, real, r);
}
//@ chunk-0wdgqhcf.js:34557-34812 placement
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
//@ chunk-0wdgqhcf.js:34812-34890 placement
function pathForCompare(e) {
  let t = normalizeCaseForComparison(identity(e));
  return getPlatform() === "windows" ? t.replace(/\//g, "\\") : t;
}
//@ chunk-0wdgqhcf.js:34890-35150 placement
function findLongestRootPrefix(e, t) {
  let n = pathForCompare(e);
  return t
    .map((s) => {
      let replaced = s.replace(/[\\/]+$/, "");
      return replaced === ""
        ? s.slice(0, 1)
        : /^[A-Za-z]:$/.test(replaced)
          ? replaced + s.charAt(2)
          : replaced;
    })
    .filter((s) => {
      let d = pathForCompare(s);
      let a = d.endsWith(sep) ? d : d + sep;
      return n === d || n.startsWith(a);
    })
    .sort((s, d) => d.length - s.length)[0];
}
//@ chunk-0wdgqhcf.js:35150-35475 placement
/**
 * 判断主机名是否指向本机：localhost、::1、127.*、本机主机名或任一网卡地址。
 */
function isLocalHostname(e) {
  let replaced = e.toLowerCase().replace(/\.+$/, "");
  if (
    replaced === "localhost" ||
    replaced === "::1" ||
    replaced.endsWith(".ipv6-literal.net") ||
    replaced.startsWith("127.") ||
    replaced === hostname().toLowerCase().replace(/\.+$/, "")
  )
    return true;
  let replaced_2 = replaced.replace(/^\[|\]$/g, "");
  for (let r of Object.values(networkInterfaces()))
    for (let s of r ?? []) if (s.address.toLowerCase() === replaced_2) return true;
  return false;
}
//@ chunk-0wdgqhcf.js:35475-35560 placement
function isLocalUncPath(e) {
  let match = /^[\\/]{2}([^\\/]+)[\\/]/.exec(e);
  return match !== null && isLocalHostname(match[1] ?? "");
}
//@ chunk-0wdgqhcf.js:35560-35630 placement
function isLocalPathWithHost(e) {
  if (!isNetworkMountPath(e)) return false;
  let t = networkMountName(e);
  return t !== null && isLocalHostname(t);
}
//@ chunk-0wdgqhcf.js:35630-35952 placement
/**
 * 收集发布可用的目录：当前 cwd、去重后的额外工作目录，以及（是目录且非链接的）scratchpad 目录。
 */
async function collectPublishDirs(toolPermissionContext) {
  let cwd = getCwd();
  let n = (b) => normalizeTrailingSlash(normalize(expandPath(b)));
  let r = n(cwd);
  let s = new Set([r]);
  let d = [];
  for (let b of allWorkingDirectories(toolPermissionContext)) {
    let S = n(b);
    if (!s.has(S)) {
      s.add(S);
      d.push(S);
    }
  }
  let h = (isScratchpadEnabled() ? getScratchpadDir() : null) ?? undefined;
  if (h !== undefined)
    try {
      let b = await lstat(h);
      if (b.isSymbolicLink() || !b.isDirectory()) h = undefined;
    } catch (error) {
      if (!isENOENT(error)) h = undefined;
    }
  return {
    cwd,
    dirs: d,
    scratchpad: h,
  };
}
//@ chunk-0wdgqhcf.js:35952-36060 placement
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
//@ chunk-0wdgqhcf.js:36060-36386 placement
/**
 * 计算 scratchpad 的字面/真实路径对：不存在时原样；是真实目录且不在网络位置时返回解析结果。
 */
async function getScratchpadPairs(publishDirs) {
  let { scratchpad } = publishDirs;
  if (scratchpad === undefined) return [];
  let n = (a) => !a.isSymbolicLink() && a.isDirectory();
  let r;
  try {
    r = await lstat(scratchpad);
  } catch (error) {
    return isENOENT(error) ? [[scratchpad, scratchpad]] : [];
  }
  if (!n(r) || (await isUnsafeSymlinkChain(scratchpad))) return [];
  let s = await realpath(scratchpad).catch(() => scratchpad);
  let d = await lstat(scratchpad).catch(() => {
    return;
  });
  return d !== undefined && n(d) && d.ino === r.ino && d.dev === r.dev ? [[scratchpad, s]] : [];
}
//@ chunk-0wdgqhcf.js:36386-36493 placement
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
  ).map((n) => [n.lex, n.real]);
}
//@ chunk-0wdgqhcf.js:36493-36627 placement
/**
 * 判断路径是否位于 cwd、scratchpad 或任一工作目录之下。
 */
function isUnderPublishDirs(e, publishDirs, scratchpadPairs, workingDirPairs = []) {
  return [
    publishDirs.cwd,
    ...workingDirPairs.flatMap(([s, d]) => [s, d]),
    ...scratchpadPairs.flatMap(([s, d]) => [s, d]),
  ].some((s) => e === s || e.startsWith(s + sep));
}
//@ chunk-0wdgqhcf.js:36627-37219 placement
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
  let d = (base, v) => base === v || base.startsWith(v + sep);
  let { scratchpad } = dirs;
  let h;
  if (scratchpad !== undefined && !(await isUnsafeSymlinkChain(scratchpad)))
    h = await realpath(scratchpad).catch((error) => (isENOENT(error) ? scratchpad : undefined));
  let b = d(base, dirs.cwd) ? dirs.cwd : workingPairs.flatMap(([R, v]) => [R, v]).find((R) => d(base, R));
  let S =
    scratchpad !== undefined && b === undefined && (d(base, scratchpad) || (h !== undefined && d(base, h)));
  let y = S && scratchpad !== undefined ? scratchpad : (b ?? dirs.cwd);
  if (
    (S ? h !== undefined : !(await isUnsafeSymlinkChain(y))) &&
    !pathTouchesProtected(base) &&
    !(await isUnsafeSymlinkChain(base))
  )
    try {
      let R = await realpath(base);
      let v = h;
      if (!S) v = await realpath(y);
      if (v !== undefined && !isNonWslUncPath(R) && !isNetworkMountPath(R) && d(R, v)) {
        resolved = R;
        let P = S && !d(base, y) ? v : y;
        let V = base === P ? v : join(v, relative(P, base));
        redirected = resolved !== V;
      }
    } catch {}
  return {
    base: resolved,
    redirected,
  };
}
//@ chunk-0wdgqhcf.js:37219-37335 placement
/**
 * 审批暂存表满时淘汰最旧条目并标记发生过淘汰。
 */
function evictOldestStash(e, t) {
  if (e.size >= t) {
    let n = e.keys().next().value;
    if (n !== undefined) {
      e.delete(n);
      getLiveState().approvalStashEvicted = true;
    }
  }
}
//@ chunk-0wdgqhcf.js:37335-37412 placement
function publishingReadDeniedText(e, denyRuleForTool, n = "") {
  return `${e}, and ${denyRulePhrase(denyRuleForTool)} forbids reading files${n}.`;
}
//@ chunk-0wdgqhcf.js:37412-37693 placement
/**
 * 发布源文件在审批后无法核验或已变化时的错误消息，以及"重试一次，仍被拒就停下告知用户"的说明。
 */
var SOURCE_UNVERIFIED_MESSAGE =
  "file_path: could not verify the source file is unchanged since approval \u2014 retry the publish";
var SOURCE_CHANGED_MESSAGE =
  "file_path: the source file changed between approval and publish \u2014 retry the publish";
var RETRY_ONCE_NOTE = "Retry once; if the retry is refused the same way, stop and tell the user.";
//@ chunk-0wdgqhcf.js:37693-39421 placement
function checkPublishSourcePin(e) {
  switch (e) {
    case "source_pin_stale_build":
      return new ArtifactInputError(
        `file_path: this publish was approved under an earlier Claude Code version and needs to be approved again. ${RETRY_ONCE_NOTE}`,
        e,
      );
    case "source_pin_missing":
    case "source_pin_unreadable":
      return new ArtifactInputError(
        `file_path: the approval for this publish cannot be matched to the source file (another Claude Code version gave it, or a hook or SDK host rewrote it), so nothing was published. ${RETRY_ONCE_NOTE}`,
        e,
      );
    case "approval_replayed":
      return new ArtifactInputError(
        "file_path: the approval for this publish was already used by an earlier run of the same tool call, so nothing was published by this run \u2014 retry the publish as a new call",
        e,
      );
    case "source_pin_evicted":
      return new ArtifactInputError(
        "file_path: could not verify the source file is unchanged since approval (this session may have dropped its record of the approval) \u2014 retry the publish",
        e,
      );
    case "source_pin_unobserved":
      return new ArtifactInputError(
        "file_path: the permission check for this publish did not record this file, so it cannot be verified and nothing was published. Retrying the same call will not help: do not retry; tell the user.",
        e,
      );
    case "source_check_failed":
      return new ArtifactInputError(
        "file_path: the permission check for this publish hit an internal error before it recorded the file, so nothing was published. Retrying is unlikely to help: do not retry; tell the user Claude Code could not check this publish.",
        e,
      );
    case "source_redirected_on_resume":
      return new ArtifactInputError(
        "file_path: the source is a symlink, a hard link, or not a plain file, and its approval came from another process, so it cannot be verified here and nothing was published. Retrying this path will likely fail again: publish the file at its resolved path (for a hard link, a plain copy), or tell the user.",
        e,
      );
  }
}
//@ chunk-0wdgqhcf.js:39421-39486 placement
/**
 * 导出函数 `quotedSweptPath`：参数 e，返回 `"${truncatePathMiddle(sweptPagePath(e) || "(unprintable path)", 300)}"`。
 */
function quotedSweptPath(e) {
  return `"${truncatePathMiddle(sweptPagePath(e) || "(unprintable path)", 300)}"`;
}
//@ chunk-0wdgqhcf.js:39486-39831 placement
/**
 * 审批后 file_path 被（钩子或 SDK 宿主）改动时抛出的输入错误：未发布，不要重试。
 */
function sourcePathChangedError(e, t) {
  let n = t === undefined ? "after approval" : `after ${quotedSweptPath(t)} was approved`;
  return new ArtifactInputError(
    `file_path: the path was changed to ${quotedSweptPath(e)} ${n} (usually by a hook or SDK host), so nothing was published. Do not retry this call; if the new path is the file you mean, publish it in a new call, otherwise tell the user.`,
    "source_path_mismatch",
  );
}
//@ chunk-0wdgqhcf.js:39831-39968 placement
/**
 * 发布需要读取文件而 Read 权限检查需要审批时的提示：重试发布以便发起询问。
 */
var READ_CHECK_NEEDS_APPROVAL =
  "Publishing reads file contents and a Read permission check requires approval here \u2014 retry the publish so it can be asked.";
//@ chunk-0wdgqhcf.js:39968-40116 placement
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
//@ chunk-0wdgqhcf.js:40116-40292 placement
/**
 * 判断路径是否在受信任的网络根下：UNC 路径需主机一致的根才算。
 */
function isInTrustedNetworkRoot(e, t) {
  if (!isUncOrDevicePath(e)) return isPathInTrustedNetworkRoot(e, t);
  let n = uncHostOf(e);
  if (n === null) return false;
  for (let [r, s] of t ?? [])
    for (let d of s)
      if (isUncOrDevicePath(d) && uncHostOf(d) === n && isPathInTrustedNetworkRoot(e, new Map([[r, [d]]])))
        return true;
  return false;
}
//@ chunk-0wdgqhcf.js:40292-42093 placement
async function checkDeviceNamespacePath(e, t, trustedNetworkDirectories) {
  if (isDeviceNamespacePath(e) || isDevicePrefixPath(e))
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
  if (isLocalUncPath(e) || isLocalPathWithHost(e))
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
  let r = isNonWslUncPath(e) || isNetworkMountPath(e) || classifyHomeMount(e);
  if (r && !isInTrustedNetworkRoot(e, trustedNetworkDirectories))
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
  let s = false;
  let d = false;
  let a = {
    kind: "network",
  };
  if (!r) {
    if (pathTouchesProtected(e) || (await isUnsafeSymlinkChain(e)))
      return {
        refused: UNVERIFIABLE_SOURCE_DENIAL,
      };
    a = {
      kind: "absent",
    };
    let h = false;
    let b;
    try {
      let S = await lstat(e, {
        bigint: true,
      });
      h = S.isSymbolicLink();
      if (!h)
        b = {
          dev: S.dev,
          ino: S.ino,
        };
    } catch {}
    if (h || b !== undefined) {
      s = h;
      try {
        let S = await realpath(e);
        let y = await stat(S, {
          bigint: true,
        });
        if (b !== undefined && (y.dev !== b.dev || y.ino !== b.ino)) s = true;
        else if (!y.isFile()) s = true;
        else {
          a = {
            kind: "file",
            dev: y.dev,
            ino: y.ino,
            sizeBytes: y.size,
            mtimeNs: y.mtimeNs,
            leafWasLink: h,
          };
          d = y.nlink > 1n;
          if (!s) {
            let R = [];
            for (let P of t) {
              R.push(P);
              if (isNonWslUncPath(P) || isNetworkMountPath(P) || (await isUnsafeSymlinkChain(P))) continue;
              try {
                R.push(await realpath(P));
              } catch {}
            }
            let longestRootPrefix = findLongestRootPrefix(e, R);
            if (longestRootPrefix !== undefined) {
              let P = getPlatform() === "windows" ? /[\\/]+/ : /\/+/;
              let filtered = longestRootPrefix.split(P).filter(Boolean);
              let filtered_2 = e.split(P).filter(Boolean);
              let root = parse(e).root;
              let G = count(parse(e).root.split(P), Boolean);
              let ue = true;
              for (let ie = G; ie < filtered_2.length - 1; ie++) {
                root = join(root, filtered_2[ie] ?? "");
                if (ue && ie < filtered.length && filtered_2[ie] === filtered[ie]) continue;
                ue = false;
                try {
                  if ((await lstat(root)).isSymbolicLink()) {
                    s = true;
                    break;
                  }
                } catch {
                  s = true;
                  break;
                }
              }
            }
          }
        }
      } catch {
        a = {
          kind: "absent",
        };
        s = true;
      }
    }
  }
  return {
    pin: a,
    redirected: s || d,
    unverifiedSpelling: s,
  };
}
//@ chunk-0wdgqhcf.js:42093-42178 placement
async function readFdTarget(e) {
  try {
    return await readlink(`/proc/self/fd/${e.fd}`);
  } catch {
    return null;
  }
}
//@ chunk-0wdgqhcf.js:42178-42242 placement
async function fdPointsAtPath(e, t) {
  let fdTarget = await readFdTarget(e);
  return fdTarget !== null && fdTarget === t;
}
//@ chunk-0wdgqhcf.js:42242-42786 placement
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
//@ chunk-0wdgqhcf.js:42786-43908 placement
async function checkSourceUnchanged(e, t, n) {
  let filtered = n.digests.filter((digest) => digest !== undefined);
  let s = filtered.length > 0;
  if (pathTouchesProtected(e) || (await isUnsafeSymlinkChain(e)))
    return {
      kind: "changed",
    };
  let d = t.kind === "absent" || !t.leafWasLink;
  if (d)
    try {
      if ((await lstat(e)).isSymbolicLink())
        return {
          kind: "changed",
        };
    } catch {}
  let a;
  try {
    a = await open(e, constants.O_RDONLY | (d ? NOFOLLOW_NONBLOCK_FLAGS : O_NONBLOCK));
  } catch (error) {
    if (isENOENT(error))
      return {
        kind: "missing",
      };
    if (isErrnoCode(error, "ELOOP") && d)
      return {
        kind: "changed",
      };
    throw error;
  }
  try {
    if (n.admittedPath !== undefined && !(await fdPointsAtPath(a, n.admittedPath)))
      return {
        kind: "changed",
      };
    let stats = await a.stat({
      bigint: true,
    });
    if (n.admittedPath !== undefined && stats.nlink !== 1n)
      return {
        kind: "changed",
      };
    if (
      t.kind === "absent" ||
      stats.dev !== t.dev ||
      stats.ino !== t.ino ||
      stats.size !== t.sizeBytes ||
      (!s && stats.mtimeNs !== t.mtimeNs)
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
    let exactBytes = await readExactBytes(a, Number(stats.size));
    if (exactBytes === null)
      return {
        kind: "changed",
      };
    if (s) {
      let contentHash = computeContentHash(exactBytes);
      if (!filtered.every((y) => y === contentHash))
        return {
          kind: "changed",
        };
    } else {
      let stats_2 = await a.stat({
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
    await a.close();
  }
}
//@ chunk-0wdgqhcf.js:43908-44024 placement
/**
 * 确认源文件未变化后计算内容哈希，出错或已变化返回 undefined。
 */
async function hashSourceIfUnchanged(e, t) {
  try {
    let n = await checkSourceUnchanged(e, t, {
      digests: [],
    });
    return n.kind === "ok" ? computeContentHash(n.bytes) : undefined;
  } catch {
    return;
  }
}
//@ chunk-0wdgqhcf.js:44024-44267 placement
/**
 * 判断两次固定的文件身份是否一致（设备、inode、叶子是否链接、大小，无哈希时还比较修改时间）。
 */
function samePinIdentity(e, t) {
  if (e.pin.kind !== "file" || t.kind !== "file") return e.pin.kind === t.kind;
  return (
    e.pin.dev === t.dev &&
    e.pin.ino === t.ino &&
    e.pin.leafWasLink === t.leafWasLink &&
    e.pin.sizeBytes === t.sizeBytes &&
    (e.sha256 !== undefined || e.pin.mtimeNs === t.mtimeNs)
  );
}
//@ chunk-0wdgqhcf.js:44267-44328 placement
/**
 * 导出函数 `assertArtifactWithinLimit`：参数 e。
 */
function assertArtifactWithinLimit(e) {
  if (e > MAX_ARTIFACT_BYTES) throw new ArtifactInputError(describeTooLargePage(e), "too_large_raw");
}
//@ chunk-0wdgqhcf.js:44328-44907 placement
function describeUndecodableSource({ kind, encoding, where }, r) {
  let s = r === "publish" ? "then publish again. Nothing was published." : "then preview again.";
  return kind === "undecodable"
    ? `file_path: the source file is not valid ${encoding === "utf-16le" ? "UTF-16" : "UTF-8"} text (first invalid byte at ${where}). It may be saved in another encoding or contain binary data. Rewrite it as UTF-8, ${s}`
    : `file_path: the source file has the replacement character U+FFFD at ${where}, usually left where an earlier edit or paste lost a character. Replace it with the intended text (in HTML, write an intended U+FFFD as &#xFFFD;), ${s}`;
}
//@ chunk-0wdgqhcf.js:44907-45183 placement
/**
 * 严格把发布源文件字节解码为文本；无法解码或含替换字符时打点并抛出输入错误。
 */
function decodeSourceText(e, t) {
  let n = decodeTextStrict(e);
  if (n.problem === undefined) return n.text;
  let r = n.problem.kind === "undecodable" ? "source_encoding" : "source_replacement_char";
  logFeatureBad("artifact_publish", r, {
    source_bytes: e.length,
    encoding: fromEnum(n.problem.encoding),
    md: t.md,
  });
  throw new ArtifactInputError(describeUndecodableSource(n.problem, "publish"), r);
}
export {
  checkAttachmentForPublish,
  publishingReadDeniedText,
  isVerifiedAttachment,
  isUnverifiedUpload,
  dbReadSourceSchema,
  dbWriteSourceSchema,
  liveEditSourceSchema,
  pinSourceSchema,
  describeUndecodableSource,
  previewSourceSchema,
  emulatorPreviewSourceSchema,
  sharedSourceSchema,
  TYPE_FILE_UNREAD_REASONS,
  MERGED_OVER_SCHEMA,
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
};
