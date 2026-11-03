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
import {
  lstatSync,
  lstatSync as lstatSync_2,
  constants,
  constants as constants_2,
  openSync,
  fstatSync,
  readFileSync,
  closeSync,
} from "fs";
import { sep, sep as sep_2, sep as sep_3, normalize, join, join as join_2, relative, parse } from "path";
import { hostname, networkInterfaces } from "os";
import { lstat, realpath, stat, readlink, open } from "fs/promises";
import { ARTIFACT_EMBED_ERRORS, no, to, oo, wt } from "./artifactPeople.js";
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
import { u, o, oe, pe, M, A, E, T, U, kt, Ue } from "../../../vendor/zod/v4/classic/schemas.js";
import { VER_SHAPE } from "./ownPublishes.js";
import { MAX_EPOCH_MS, ARTIFACT_LIST_RELS } from "./listArtifacts.js";
import { j9, isArtifactPinEnabled, versionLabelSchema } from "./artifactShare.js";
import { MAX_PUBLISHED_PATH_LENGTH, JL, Rue, pathTouchesProtected, readExactBytes } from "./artifactUrl.js";
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
  w_t,
} from "../../tools/ArtifactTool/actions/uploadAsset.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import {
  isFrameMultiFileEnabled,
  isFrameHotUpdateEnabled,
  isFrameCopyFromEnabled,
  MAX_ARTIFACT_BYTES,
} from "./frameFlags.js";
import { isPathPinEnabled } from "./pathPins.js";
import { B_t } from "./createFromType.js";
import { initReferencesSchema, designSystemSchema, SWn } from "../../tools/ArtifactTool/startKitSchemas.js";
import { SHARE_ROLES } from "./leftOutFiles.js";
import { MAX_SIZE_CLAUSE_CHARS, sweptPagePath } from "../../tools/ArtifactTool/artifactUrls.js";
import { isArtifactCommentsEnabled } from "./comments/commentsGate.js";
import { MAX_EDITS_PER_CALL } from "./artifactDb.js";
import { DB_BATCH_OP } from "../../tools/ArtifactTool/promptText.js";
import { CN, V6 } from "./frameApi.js";
import { DDo, iBt } from "./publishedFiles.js";
import { MAX_MOUNT_FILE_BYTES } from "./gatewayRead.js";
import { env } from "../../utils/env.js";
import { S1 } from "../../utils/userDataRoots.js";
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
import { NA, y4e, Dot } from "../../utils/uploadsDir.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { isCoworkFramePublishSession } from "./artifactToolGates.js";
import { isPlanBypass } from "../../utils/permissions/browserToolNames.js";
import { Mn, Qn, uncHostOf, uT, gb } from "../../utils/pathClassification.js";
import { getPlatform } from "../../utils/platform.js";
import { Ya, _Li, ai, classifyHomeMount } from "../../utils/networkPaths.js";
import { getCwd } from "../../utils/cwd.js";
import { HZe, isUnsafeSymlinkChain, getWorkingDirAnchors } from "./publishPaths.js";
import { expandPath } from "../../utils/path.js";
import { isENOENT } from "../../utils/errors.js";
import { denyRulePhrase } from "../../tools/ArtifactTool/permissions/readRules.js";
import { truncatePathMiddle } from "../../utils/format.js";
import { getDenyRuleForTool } from "../../utils/permissions/permissions.js";
import { count } from "../../utils/collections.js";
import { ws, O_NONBLOCK } from "../../utils/fsFlags.js";
import { AMt } from "../../utils/fsSafety/hardenedRead.js";
import { describeTooLargePage } from "./publishReadChecks.js";
import { decodeTextStrict } from "./contentTypes.js";
import { logFeatureBad } from "../analytics/featureTelemetry.js";
import { fromEnum } from "../analytics/safeMetadata.js";

//@ chunk-0wdgqhcf.js:12464-13399 placement
function describePublishFiles(e, t) {
  if (e === void 0) return "";
  let safeParse = ARTIFACT_EMBED_ERRORS().safeParse(e);
  if (!safeParse.success) return "";
  let r = safeParse.data,
    s = [];
  if (r.pins.length > 0) {
    let joined = r.pins
      .slice(0, no)
      .map((b) => {
        let S = escapeXml(b.uuid, 8),
          y =
            b.files !== void 0 && Number.isInteger(b.files) && b.files >= 0
              ? `, ${b.files} ${b.files === 1 ? "file" : "files"}`
              : "",
          R = to.test(b.path) ? b.path : "?";
        return `${S}\u2026 \u2192 ${R}${b.module ? ", module" : ""}${y}`;
      })
      .join("; ");
    s.push(`Embedded parts pinned: ${r.pins.length} (${joined}).`);
  }
  for (let h of r.warnings.slice(0, oo)) {
    let b = h.src === void 0 ? "" : escapeXml(h.src),
      S = b !== "" ? `<artifact-embed src="${b}">` : "<artifact-embed>",
      y = h.count !== void 0 && Number.isInteger(h.count) && h.count > 1 ? ` \xD7${h.count}` : "",
      R = Object.hasOwn(wt, h.reason) ? h.reason : "unknown",
      v = Object.hasOwn(wt, R) ? `: ${wt[R]}${R === "not_embeddable" ? (t ?? "") : ""}` : "";
    s.push(`${S}${y} not resolved \u2014 ${R}${v}.`);
  }
  if (s.length === 0) return "";
  let joined = s.join(`
`),
    a = ARTIFACT_MAX_RESULT_SIZE_CHARS / 2;
  return `

${joined.length > a ? `${truncateToLength(joined, a)} \u2026 (embeds truncated)` : joined}`;
}
//@ chunk-0wdgqhcf.js:13399-13426 placement
var vt = 256,
  Ye = null,
  at = null;
/**
 * Artifact 发布结果 schema 的编译期开关（嵌入错误、路由声明、提示字段，均为 false）与发布结果 schema（url、路径、版本、能力声明与存储契约、警告、剩余发布次数、图标、受众、合并信息、实时订阅、编辑应用情况、种子线程、复制来源等），以及合并基线 schema。
 */
//@ chunk-0wdgqhcf.js:13426-15845 placement
var EMBEDS_RESULT_ENABLED = !1,
  DECLARED_BY_ROUTE_ENABLED = !1,
  PUBLISH_HINTS_ENABLED = !1,
  PUBLISH_RESULT_SCHEMA = DoctorLazy(() =>
    u({
      url: o(),
      path: o(),
      artifact_id: o().regex(ARTIFACT_SLUG_RE).optional(),
      title: o().optional(),
      version: o().regex(VER_SHAPE).optional(),
      capabilities: oe().optional(),
      stored: u({
        contract: o(),
        preferredContract: o().optional(),
        capabilities: pe(o(), oe()).optional(),
        carried: M().optional(),
        ...(DECLARED_BY_ROUTE_ENABLED && { declaredByRoute: M().optional() }),
        read: o().optional(),
      }).optional(),
      warnings: A(o()).optional(),
      publishesRemaining: E()
        .int()
        .min(0)
        .optional()
        .catch(void 0),
      publishesResetAt: E()
        .int()
        .positive()
        .optional()
        .catch(void 0),
      ...(EMBEDS_RESULT_ENABLED && {
        embeds: ARTIFACT_EMBED_ERRORS()
          .optional()
          .catch(void 0),
      }),
      contract: o().optional(),
      updated: M().optional(),
      owned: M()
        .optional()
        .catch(void 0),
      icon: o()
        .max(40)
        .optional()
        .catch(void 0),
      faviconSent: T(!0)
        .optional()
        .catch(void 0),
      iconDropped: T(!0)
        .optional()
        .catch(void 0),
      audience: o().optional(),
      seq: E()
        .int()
        .nonnegative()
        .optional()
        .catch(void 0),
      unchanged: T(!0)
        .optional()
        .catch(void 0),
      merged_over: MERGED_OVER_SCHEMA()
        .optional()
        .catch(void 0),
      ...(mo() && {
        deadline: u({ until: E().int().positive().max(MAX_EPOCH_MS) })
          .optional()
          .catch(void 0),
        deadlineDropped: T(!0)
          .optional()
          .catch(void 0),
      }),
      liveSubscription: o().optional(),
      verifyGuide: o().optional(),
      editsApplied: E()
        .int()
        .positive()
        .optional()
        .catch(void 0),
      editsNotWritten: U(["write_failed", "not_writable", "changed_during_publish", "hard_linked"])
        .optional()
        .catch(void 0),
      ...(PUBLISH_HINTS_ENABLED && {
        kindNote: T(!0)
          .optional()
          .catch(void 0),
        watchBrief: T(!0)
          .optional()
          .catch(void 0),
        previewHint: T(!0)
          .optional()
          .catch(void 0),
      }),
      seededThread: o().regex(ARTIFACT_SLUG_RE).optional(),
      ...(j9() && { room: o().optional() }),
      ...(ho() && {
        copied: A(
          u({
            path: o().max(MAX_PUBLISHED_PATH_LENGTH),
            from_url: o(),
            from_path: o().max(MAX_PUBLISHED_PATH_LENGTH),
          }),
        )
          .max(JL)
          .optional(),
      }),
      ...(Kt() && filesWrittenFields()),
      ...(ut() && { pinned: M().optional() }),
      ...(Ye && { kind: o().optional() }),
      ...(Ye && { liveDocCollab: o().optional() }),
      ...(Ye && { liveDocWorkingCopy: o().optional() }),
      ...(Ye && { liveFileWorkingCopies: o().max(8192).optional() }),
      ...(Ye && { ldxBuild: o().max(8192).optional() }),
      ...(Ye && { liveDocVersion: M().optional() }),
      ...(Ye && {
        liveDocShim: u({
          file: o().max(4096),
          edits: E().int().min(0).max(1e6),
          ontoCurrent: M().optional(),
          complete: M().optional(),
          sourceIsCopy: M().optional(),
          copyPath: o().max(4096).optional(),
          livePath: o().max(512).optional(),
        }).optional(),
      }),
      ...(Ye && { capabilitiesDefaulted: M().optional() }),
      ...(go() && typeInfoFields()),
    }),
  ),
  MERGED_OVER_SCHEMA = DoctorLazy(() =>
    u({
      base: o().regex(VER_SHAPE),
      live: o()
        .regex(VER_SHAPE)
        .optional()
        .catch(void 0),
      changed: A(u({ path: o().max(MAX_ECHO_MANIFEST_PATH), sha256: o().regex(SHA256_HEX_RE).nullable() }))
        .max(MERGED_CHANGED_KEEP)
        .optional()
        .catch(void 0),
      omitted: E()
        .int()
        .positive()
        .optional()
        .catch(void 0),
    }),
  );
//@ chunk-0wdgqhcf.js:15845-16022 placement
function filesWrittenFields() {
  return {
    files_written: A(u({ path: o().max(MAX_PUBLISHED_PATH_LENGTH), sha256: o().regex(SHA256_HEX_RE) }))
      .max(JL)
      .optional()
      .catch(void 0),
    files_removed: A(o().max(MAX_PUBLISHED_PATH_LENGTH))
      .max(JL)
      .optional()
      .catch(void 0),
  };
}
//@ chunk-0wdgqhcf.js:16022-16077 placement
function Kt() {
  return getLiveState().frozenPathPin ?? (isFrameMultiFileEnabled() && isPathPinEnabled());
}
//@ chunk-0wdgqhcf.js:16077-16126 placement
function mo() {
  return getLiveState().frozenHotUpdate ?? isFrameHotUpdateEnabled();
}
//@ chunk-0wdgqhcf.js:16126-16174 placement
function ho() {
  return getLiveState().frozenCopyFrom ?? isFrameCopyFromEnabled();
}
//@ chunk-0wdgqhcf.js:16174-16244 placement
function go() {
  return getLiveState().frozenArtifactTypes?.typesOn ?? (B_t() && isFrameMultiFileEnabled());
}
/**
 * artifact 类型锁的 schema：类型链接、当前发行版、最新发行版、阻止升级的信息（目标版本、原因、冲突数、路径）。
 */
//@ chunk-0wdgqhcf.js:16244-16467 placement
var TYPE_LOCK_SCHEMA = DoctorLazy(() =>
  u({
    url: o(),
    release: o(),
    latest: o().optional(),
    blocked: u({
      to: o().optional(),
      reason: o(),
      conflict_count: E().int().min(0).max(1e6).optional(),
      paths: A(o().max(MAX_ECHO_MANIFEST_PATH))
        .max(MAX_ECHO_MANIFEST_ENTRIES)
        .optional()
        .catch(void 0),
    }).optional(),
  }),
);
/**
 * 发布参数中与 artifact 类型相关的字段 schema（类型、自有文件、类型文件、服务位置与新增文件等）。
 */
//@ chunk-0wdgqhcf.js:16467-16813 placement
function typeInfoFields() {
  return {
    type: TYPE_LOCK_SCHEMA()
      .optional()
      .describe("The Artifact type (and release) this Artifact was created from"),
    own_files: A(o()).optional(),
    type_files: A(o()).optional(),
    served_at: o()
      .optional()
      .catch(void 0),
    served_root: o()
      .optional()
      .catch(void 0),
    new_files: A(o())
      .optional()
      .catch(void 0),
    unchanged_files: A(o())
      .optional()
      .catch(void 0),
  };
}
/**
 * 从类型创建 artifact 的结果 schema（类型、自有/类型文件、服务路径、自动打开时机、预配存储、类型说明、快速开始与设计系统信息等），以及可在存储/压缩时剥离的大字段键表。
 */
//@ chunk-0wdgqhcf.js:16813-17997 placement
var CREATED_FROM_TYPE_SCHEMA = DoctorLazy(() =>
    u({
      created_from_type: T(!0),
      already_created: T(!0).optional(),
      url: o(),
      version: o(),
      owned: M()
        .optional()
        .catch(void 0),
      path: o().optional(),
      title: o().optional(),
      type: u({ url: o(), release: o() }),
      own_files: A(o()),
      type_files: A(o()),
      served_at: o()
        .optional()
        .catch(void 0),
      served_root: o()
        .optional()
        .catch(void 0),
      ...(Kt() && filesWrittenFields()),
      auto_open: U(["at_create", "after_first_write"]).optional(),
      warnings: A(o()).optional(),
      files_error: o().optional(),
      files_error_kind: U(["type_owned_path"]).optional(),
      provisioned: u({
        store: o(),
        project_id: o(),
        file_id: o().optional(),
        node_id: o().optional(),
      }).optional(),
      liveSubscription: o().optional(),
      ...(j9() && { room: o().optional() }),
      ...(ut() && { pinned: M().optional() }),
      ...instructionsFields(),
      ...initReferencesSchema(),
      after_quickstart: u({
        design_system: o().optional(),
        saved_system: o().optional(),
        saved_system_dir: o().optional(),
        saved_pages_dir: o().optional(),
        not_listed: M().optional(),
      }).optional(),
      design_systems: TYPE_INSTANCES_RESULT_SCHEMA().shape.type_instances.optional(),
      design_systems_note: o().optional(),
      ...designSystemSchema(),
    }),
  ),
  QUICKSTART_STRIPPABLE_KEYS = {
    init_references: !0,
    after_quickstart: !0,
    design_systems: !0,
    design_systems_note: !0,
    design_system: !0,
  },
  CREATE_STRIPPABLE_KEYS = {
    instructions: !0,
    instructions_chars: !0,
    instructions_clipped: !0,
    instructions_unavailable: !0,
    ...QUICKSTART_STRIPPABLE_KEYS,
  };
//@ chunk-0wdgqhcf.js:17997-18049 placement
function ut() {
  return getLiveState().frozenArtifactPins ?? isArtifactPinEnabled();
}
//@ chunk-0wdgqhcf.js:18049-18222 placement
function instructionsFields() {
  return {
    instructions: o().optional(),
    instructions_chars: E().int().min(0).optional(),
    instructions_clipped: M().optional(),
    instructions_unavailable: o().optional(),
  };
}
/**
 * 类型目录相关的结果 schema：类型列表、类型实例列表、类型条目、快速开始（意图匹配、候选类型、设计系统、起步套件等）、类型文件读取结果及未读原因、类型详情。
 */
//@ chunk-0wdgqhcf.js:18222-20310 placement
var TYPES_LIST_RESULT_SCHEMA = DoctorLazy(() =>
    u({
      artifact_types: A(u({ title: o(), type_url: o(), description: o().optional(), tier: o().optional() })),
      query: o().optional(),
      more: M().optional(),
      dropped: E().int().min(0).optional(),
      unavailable: M().optional(),
      docs_unfillable: M().optional(),
    }),
  ),
  TYPE_INSTANCES_RESULT_SCHEMA = DoctorLazy(() =>
    u({
      type_instances: u({
        type: o().optional(),
        type_url: o().optional(),
        scope: o(),
        instances: A(
          u({
            title: o(),
            url: o(),
            description: o().optional(),
            created_at: o().optional(),
            rel: o().optional(),
            audience: o().optional(),
            outsiders_may_have_written: T(!0).optional(),
            default: o().optional(),
          }),
        ),
        more: M().optional(),
        overflow: M().optional(),
        dropped: E().int().min(0).optional(),
        unavailable: M().optional(),
      }),
    }),
  ),
  TYPE_ENTRY_SCHEMA = DoctorLazy(() =>
    u({ title: o(), type_url: o(), description: o().optional(), tier: o().optional() }),
  ),
  QUICKSTART_RESULT_SCHEMA = DoctorLazy(() =>
    u({
      quickstart: u({
        intent: o(),
        match: TYPE_ENTRY_SCHEMA().optional(),
        match_of: E().optional(),
        ask_first: M().optional(),
        types: A(TYPE_ENTRY_SCHEMA()).optional(),
        types_more: M().optional(),
        dashboard_type: TYPE_ENTRY_SCHEMA().optional(),
        motion_type: TYPE_ENTRY_SCHEMA().optional(),
        ...!1,
        ...!1,
        types_unavailable: M().optional(),
        types_ruled: M().optional(),
        types_ambiguous: M().optional(),
        types_partial: M().optional(),
        types_note: o().optional(),
        types_hooked: M().optional(),
        docs_connector: M().optional(),
        design_systems: TYPE_INSTANCES_RESULT_SCHEMA().shape.type_instances.optional(),
        design_systems_note: o().optional(),
        design_systems_off: M().optional(),
        ...designSystemSchema(),
        design_guidance: M().optional(),
        start_kit: SWn().optional(),
      }),
    }),
  ),
  TYPE_FILE_UNREAD_REASONS = [
    "withheld",
    "not_listed",
    "not_text",
    "too_large",
    "unavailable",
    "result_full",
  ],
  TYPE_FILE_RESULT_SCHEMA = DoctorLazy(() =>
    u({
      path: o(),
      content: o().optional(),
      chars: E().int().min(0).optional(),
      clipped: M().optional(),
      unread: U(TYPE_FILE_UNREAD_REASONS).optional(),
      why: o().optional(),
    }),
  ),
  DESCRIBE_TYPE_RESULT_SCHEMA = DoctorLazy(() =>
    u({
      artifact_type: u({
        title: o(),
        type_url: o(),
        description: o().optional(),
        tier: o().optional(),
        release: o().optional(),
        files: A(o()),
        files_omitted: E().int().min(0).optional(),
        instructions_file: M(),
        instructions: o().optional(),
        instructions_chars: E().int().min(0).optional(),
        instructions_clipped: M().optional(),
        instructions_unavailable: o().optional(),
        capabilities: A(o()),
        creatable: M().optional(),
      }),
      read_of_type_link: T(!0).optional(),
      type_file: TYPE_FILE_RESULT_SCHEMA().optional(),
      type_files_read: A(TYPE_FILE_RESULT_SCHEMA()).max(Rue).optional(),
    }),
  );
//@ chunk-0wdgqhcf.js:20310-20559 placement
function artifactListRowSchema() {
  let e = {
    title: o(),
    url: o(),
    favicon: o().optional(),
    updatedAt: o().optional(),
    rel: U(ARTIFACT_LIST_RELS).optional(),
    external: T(!0).optional(),
    role: U(SHARE_ROLES).optional(),
    outsidersMayHaveWritten: T(!0).optional(),
  };
  return ut() ? u({ ...e, pinned: M().optional() }) : u(e);
}
/**
 * Artifact 发布来源相关的提示文本表（共享范围、持久唤醒、实时订阅停止等）
 */
//@ chunk-0wdgqhcf.js:20559-32269 placement
var PUBLISH_SOURCE_TEXTS = DoctorLazy(() =>
    u({
      artifacts: A(artifactListRowSchema()),
      truncated: M().optional(),
      total: E().int().min(0).optional(),
      total_at_least: T(!0).optional(),
      ...(ut() && { pins_enabled: M().optional() }),
      scope: U(["shared", "all"]).optional(),
      external_listed: T(!0).optional(),
    }),
  ),
  Ro = DoctorLazy(() =>
    u({
      read: u({
        url: o(),
        bytes: E(),
        code: E(),
        codeText: o(),
        result: o(),
        durationMs: E(),
        title: o().max(vt).optional(),
      }),
      owned: M()
        .optional()
        .catch(void 0),
      artifactRead: u({ slug: o(), ver: o().optional(), seeded: T(!1).optional() }).optional(),
    }),
  ),
  $o = DoctorLazy(() =>
    u({
      threads_dropped: M().optional(),
      thread_filter: o().optional(),
      scoped_dispatch: M().optional(),
      foreign: T(!0).optional(),
      cursor: o().optional(),
      outside_org: M().optional(),
      page_owns_threads: M().optional(),
      names: pe(o(), o()).optional(),
      threads: A(
        u({
          id: o(),
          created_at: o().optional(),
          resolved: M(),
          resolved_degraded: M().optional(),
          resolved_by_claude: M().optional(),
          claude_activated: M(),
          activated_degraded: M().optional(),
          carried: M().optional(),
          anchor_path: o().optional(),
          span_quote: o().optional(),
          anchor_file: o().optional(),
          anchor_file_degraded: M().optional(),
          anchor_file_sha: o().optional(),
          anchor_moved_at: o().optional(),
          anchor_label: o().optional(),
          anchor_detail: o().optional(),
          anchor_snippet: o().optional(),
          anchor_region: M().optional(),
          region_inside: A(o()).optional(),
          comments_degraded: M().optional(),
          comments: A(
            u({
              id: o(),
              account: o(),
              role: o().optional(),
              text: o(),
              created_at: o().optional(),
              sent_to_claude: M().optional(),
              sent_to_claude_degraded: M().optional(),
              sent_by_viewer: M().optional(),
              posted_by_artifact: M().optional(),
              awaiting_reply: M().optional(),
              presence: o().optional(),
              access: o().optional(),
              outside: T(!0).optional(),
            }),
          ),
        }),
      ),
    }),
  ),
  Po = DoctorLazy(() =>
    u({
      replied: M(),
      thread_id: o(),
      comment_id: o().optional(),
      replayed: M().optional(),
      not_activated: M().optional(),
      summon_answered: M().optional(),
      summon_foreign: M().optional(),
      already_answered: M().optional(),
      page_owns_threads: M().optional(),
      standing_reply_id: o().optional(),
    }),
  ),
  To = DoctorLazy(() =>
    u({
      thread_resolved: M(),
      thread_id: o(),
      not_activated: M().optional(),
      not_authorized: M().optional(),
      summon_foreign: M().optional(),
      relayed_credential: M().optional(),
      page_owns_threads: M().optional(),
    }),
  ),
  Vvo = () =>
    u({
      liveEdit: u({
        version: E().int().min(-1),
        replayed: M(),
        noop: M().optional(),
        opCount: E(),
        created: A(o()),
        rttMs: E().optional(),
        collab: o().optional(),
      }),
    }),
  qvo = () =>
    u({
      sync: u({
        seq: E().int().min(-1),
        path: o().max(4096),
        live_path: o().max(512).optional(),
        pushed: u({
          version: E().int().min(0),
          touched: E().int().min(0),
          created: A(o().max(64)).max(64),
          createdUnlisted: E().int().min(0).optional(),
          ontoCurrent: M(),
          complete: M().optional(),
        }).optional(),
        pulled: A(o().max(4096)).max(64),
        pulledUnlisted: E().int().min(0).optional(),
        fileChanged: M(),
        fileMissing: M().optional(),
        newlyBound: M().optional(),
        diverged: T(!0).optional(),
        refused: o().max(2048).optional(),
        size: o().max(MAX_SIZE_CLAUSE_CHARS).optional(),
        ldx_build: o().max(8192).optional(),
      }),
    }),
  Yvo = () =>
    u({
      versioned: u({
        url: o(),
        artifact_id: o().regex(ARTIFACT_SLUG_RE),
        version: o().regex(VER_SHAPE),
        label: versionLabelSchema().optional(),
        warnings: A(o().max(4096)).max(64).optional(),
      }),
    }),
  Oo = DoctorLazy(() =>
    u({
      watch: u({
        url: o(),
        watching: M(),
        outcome: o(),
        reason: o().optional(),
        durable_skip_reason: o().optional(),
        task_id: o().optional(),
        since: E().optional(),
        token_expires_at: E().optional(),
        ...(isArtifactCommentsEnabled() && {
          auto_reply: o().optional(),
          can_edit: M().optional(),
          user_turn: M().optional(),
          named_by_user: M().optional(),
          replies_declined: M().optional(),
        }),
        ...(Ye && { liveDocCollab: o().optional(), liveDocPath: o().optional() }),
        rail: o().optional(),
        trigger_id: o().optional(),
        durable_since: o().optional(),
        status: E().optional(),
        detail: o().optional(),
        note: o().optional(),
        events: A(o()).optional(),
      }),
    }),
  ),
  Co = DoctorLazy(() => u({ unwatch: u({ url: o(), was_watching: M() }) })),
  Do = DoctorLazy(() =>
    u({
      resume_replies: u({
        url: o(),
        resumed: M(),
        outcome: o(),
        reason: o().optional(),
        task_id: o().optional(),
        stop_kind: o().optional(),
        in_place: M().optional(),
        connecting: M().optional(),
      }),
    }),
  ),
  xo = DoctorLazy(() =>
    u({
      url: o(),
      connected: M(),
      peers: E(),
      viewers: A(u({ peer: o(), presence: kt({}), updated_ago_ms: E() })).optional(),
    }),
  ),
  Fo = DoctorLazy(() =>
    u({
      watches: A(
        Ue([
          u({
            url: o(),
            task_id: o(),
            since: E(),
            explicit: M(),
            connected: M(),
            connecting: M().optional(),
            token_expires_at: E(),
            armed_via: o().optional(),
            ...(isArtifactCommentsEnabled() && {
              auto_reply: o().optional(),
              unread_plain_comments: E().optional(),
              summons_awaiting_reply: E().optional(),
              comments_uncounted: M().optional(),
              comments_partially_counted: M().optional(),
            }),
          }),
          u({
            url: o(),
            rail: T("durable_wake"),
            trigger_id: o(),
            since: o(),
            events: A(o()).optional(),
            restored: M().optional(),
          }),
          u({
            url: o(),
            rail: T("live_stopped"),
            since: E().optional(),
            explicit: M().optional(),
            armed_via: o().optional(),
            ...(isArtifactCommentsEnabled() && { auto_reply: o() }),
            stop_kind: o(),
          }),
        ]),
      ),
      filter_url: o().optional(),
      arms: A(
        u({
          url: o(),
          rail: o().optional(),
          state: o(),
          reconnect: M().optional(),
          failures: E().optional(),
          max_failures: E().optional(),
          next_in_s: E().optional(),
          last_failure: o().optional(),
          reason: o().optional(),
          detail: o().optional(),
          server_message: o().optional(),
          at: E().optional(),
        }),
      ).optional(),
      ...(j9() && { rooms: A(xo()).optional() }),
    }),
  ),
  No = DoctorLazy(() =>
    u({
      room_send: u({ url: o(), topic: o(), delivered: M(), peers: E().optional(), reason: o().optional() }),
    }),
  ),
  At = DoctorLazy(() =>
    u({
      db_read: u({
        op: o(),
        collection: o(),
        doc_id: o().optional(),
        found: M().optional(),
        as_level: o().max(16).optional(),
        as_level_confirmed: M().optional(),
        docs: A(
          u({ id: o(), data: pe(o(), oe()), version: E().int().optional(), updatedAt: o().optional() }),
        ).optional(),
        next_cursor: o().optional(),
        me_id: o().max(200).optional(),
        ordered_by: u({ field: o(), limit: E().int().positive() }).optional(),
        foreign: T(!0).optional(),
        outside_writer: T(!0).optional(),
        saved: u({
          dir: o().max(8192),
          files: A(
            u({
              id: o(),
              path: o().max(8192),
              bytes: E().int().nonnegative(),
              compact: M().optional(),
              version: E().int().optional(),
              updatedAt: o().optional(),
            }),
          ),
          skipped: A(u({ id: o(), reason: o() })),
        }).optional(),
      }),
    }),
  ),
  Io = DoctorLazy(() =>
    u({
      db_profiles: u({
        ids: A(o()),
        profiles: pe(o(), u({ name: o().optional(), guest: T(!0).optional() })).optional(),
        unavailable: T(!0).optional(),
      }),
    }),
  ),
  qt = DoctorLazy(() =>
    u({
      op: o(),
      collection: o(),
      doc_id: o(),
      field: o().max(MAX_EDITS_PER_CALL).optional(),
      replace_all: T(!0).optional(),
      version: E().int().optional(),
    }),
  ),
  Gt = DoctorLazy(() =>
    u({ documents: E().int().nonnegative(), max_documents: E().int().positive() })
      .optional()
      .catch(void 0),
  ),
  Yt = DoctorLazy(() =>
    u({ strings: E().int().positive(), kb: E().int().positive() })
      .optional()
      .catch(void 0),
  ),
  Xt = DoctorLazy(() =>
    A(o())
      .optional()
      .catch(void 0),
  ),
  ft = {
    written: u({ url: o() })
      .optional()
      .catch(void 0),
    owned: M()
      .optional()
      .catch(void 0),
  },
  Rt = DoctorLazy(() =>
    u({
      ...ft,
      as_level: o().max(16).optional(),
      as_level_confirmed: M().optional(),
      db_write: Ue([
        qt().extend({ committed: M(), usage: Gt(), embedded: Yt(), warnings: Xt() }),
        u({
          op: T(DB_BATCH_OP),
          committed: M(),
          results: A(qt()),
          usage: Gt(),
          embedded: Yt(),
          warnings: Xt(),
          fallback: T("sequential").optional(),
        }),
      ]),
    }),
  ),
  Zt = {
    id: o().regex(ASSET_ID_RE),
    url: o().regex(ASSET_BLOB_URL_RE),
    size_bytes: E().int().positive().max(CN),
    content_type: o().regex(CONTENT_TYPE_RE).max(100),
    sha256: o().regex(SHA256_HEX_RE).optional(),
    file_name: o().max(1024),
  },
  jo = DoctorLazy(() => u({ ...ft, asset_upload: u(Zt) })),
  Lo = DoctorLazy(() =>
    u({
      ...ft,
      asset_uploads: u({
        url: o(),
        results: A(
          Ue([
            u({ file_path: o(), status: T("uploaded"), ...Zt }),
            u({
              file_path: o(),
              status: U(["failed", "not_attempted"]),
              reason: o(),
              message: o(),
              may_be_stored: T(!0).optional(),
            }),
          ]),
        )
          .min(1)
          .max(MAX_UPLOAD_FILE_PATHS),
      }),
    }),
  ),
  Bo = DoctorLazy(() =>
    u({
      asset_list: u({
        url: o(),
        assets: A(
          u({
            id: o().regex(ASSET_ID_RE),
            url: o().regex(ASSET_BLOB_URL_RE),
            content_type: o().regex(CONTENT_TYPE_RE).max(MAX_CONTENT_TYPE_LENGTH),
            size_bytes: E().int().nonnegative().max(CN),
            sha256: o().regex(SHA256_HEX_RE).optional(),
            created_at: o().max(MAX_CONTENT_TYPE_LENGTH),
          }),
        ).max(1000),
        usage: u({
          files: E().int().nonnegative(),
          bytes: E().int().nonnegative(),
          max_files: E().int().nonnegative(),
          max_bytes: E().int().nonnegative(),
        }),
        next: o().regex(ASSET_CURSOR_RE).optional(),
        cowritten: T(!0).optional(),
        outside_writer: T(!0).optional(),
      }),
    }),
  ),
  Mo = DoctorLazy(() =>
    u({
      asset_read: u({
        id: o().regex(ASSET_ID_RE),
        path: o().max(8192),
        size_bytes: E().int().positive().max(CN),
        content_type: o().regex(CONTENT_TYPE_RE).max(100),
        sha256: o().regex(SHA256_HEX_RE),
        cowritten: T(!0).optional(),
        outside_writer: T(!0).optional(),
        public_read: T(!0).optional(),
        foreign: T(!0).optional(),
      }),
    }),
  ),
  Uo = DoctorLazy(() =>
    u({
      asset_copy: u({
        url: o(),
        from_url: o(),
        assets: A(
          u({
            from_id: o().regex(ASSET_ID_RE),
            id: o().regex(ASSET_ID_RE),
            url: o().regex(ASSET_BLOB_URL_RE),
            size_bytes: E().int().positive().max(CN),
            content_type: o().regex(CONTENT_TYPE_RE).max(100),
            sha256: o().regex(SHA256_HEX_RE).optional(),
          }),
        ).max(MAX_COPY_ASSET_IDS),
      }),
    }),
  ),
  Ho = DoctorLazy(() => u({ ...ft, asset_delete: u({ id: o().regex(ASSET_ID_RE), deleted: M() }) })),
  $t = DoctorLazy(() => u({ url: o(), title: o().max(256).optional() })),
  Xvo = DoctorLazy(() =>
    u({
      file_list: u({
        url: o(),
        ver: o().regex(V6),
        files: A(
          u({
            path: o().max(MAX_PUBLISHED_PATH_LENGTH),
            content_type: o().regex(CONTENT_TYPE_RE),
            size_bytes: E().int().nonnegative().max(DDo),
            sha256: o().regex(SHA256_HEX_RE),
            live: T(!0).optional(),
          }),
        ).max(iBt),
        cowritten: T(!0).optional(),
        outside_writer: T(!0).optional(),
        public_read: T(!0).optional(),
        narrowed: T(!0).optional(),
        single_page: T(!0).optional(),
        from_type: T(!0).optional(),
        type: $t().optional(),
        foreign: T(!0).optional(),
        stored: u({ contract: o().max(64), capabilities: pe(o().max(64), oe()).optional() })
          .optional()
          .catch(void 0),
      }),
    }),
  ),
  Jvo = DoctorLazy(() =>
    u({
      file_read: u({
        url: o().optional(),
        title: o().max(vt).optional(),
        path: o().max(MAX_PUBLISHED_PATH_LENGTH),
        saved_to: o().max(8192),
        ver: o().regex(V6),
        size_bytes: E().int().nonnegative().max(MAX_MOUNT_FILE_BYTES),
        content_type: o().regex(CONTENT_TYPE_RE),
        sha256: o().regex(SHA256_HEX_RE),
        content: o().max(ARTIFACT_FILE_INLINE_RESULT_CAP).optional(),
        content_scrubbed: T(!0).optional(),
        as_served: T(!0).optional(),
        source: T(!0).optional(),
        live: T(!0).optional(),
        live_verified: T(!0).optional(),
        seq: E().int().nonnegative().optional(),
        ...(Ye && { working_copy: U(["bound", "left"]).optional(), note: o().max(8192).optional() }),
        cowritten: T(!0).optional(),
        outside_writer: T(!0).optional(),
        public_read: T(!0).optional(),
        from_type: T(!0).optional(),
        type: $t().optional(),
        foreign: T(!0).optional(),
      }),
    }),
  ),
  Qvo = DoctorLazy(() =>
    u({
      files_read: u({
        url: o(),
        title: o().max(vt).optional(),
        ver: o().regex(V6),
        saved_dir: o().max(8192),
        files: A(
          Ue([
            u({
              path: o().max(MAX_PUBLISHED_PATH_LENGTH),
              saved_to: o().max(8192),
              size_bytes: E().int().nonnegative().max(MAX_MOUNT_FILE_BYTES),
              content_type: o().regex(CONTENT_TYPE_RE),
              sha256: o().regex(SHA256_HEX_RE),
              content: o().max(ARTIFACT_FILE_INLINE_RESULT_CAP).optional(),
              content_scrubbed: T(!0).optional(),
              as_served: T(!0).optional(),
              source: T(!0).optional(),
              foreign: T(!0).optional(),
            }),
            u({ path: o().max(MAX_PUBLISHED_PATH_LENGTH), error: o().max(8192) }),
          ]),
        ).max(Rue),
        cowritten: T(!0).optional(),
        outside_writer: T(!0).optional(),
        public_read: T(!0).optional(),
        from_type: T(!0).optional(),
        type: $t().optional(),
        foreign: T(!0).optional(),
      }),
    }),
  ),
  Vo = DoctorLazy(() =>
    u({ artifact_delete: u({ url: o(), deleted: T(!0), already_gone: M().optional() }) }),
  ),
  Zvo = DoctorLazy(() =>
    u({ pin: u({ action: U(["pin", "unpin"]), url: o(), pinned: M(), title: o().optional() }) }),
  ),
  eko = DoctorLazy(() =>
    u({
      verify: u({
        url: o(),
        ver: o(),
        state: o(),
        entries: A(oe()),
        truncated: M().optional(),
        dropped: E().int().optional(),
        waited: M().optional(),
        foreign: T(!0).optional(),
      }),
    }),
  ),
  tko = DoctorLazy(() =>
    u({
      preview: u({
        file: o().max(4096),
        bytes: E().int(),
        widths: A(E()),
        themes: A(o().max(32)),
        shots: A(
          u({
            width: E(),
            theme: o().max(32),
            height: E().optional(),
            pageHeight: E().optional(),
            path: o().optional(),
            base64: o().optional(),
            error: o().optional(),
          }),
        ),
        issues: A(u({ kind: o(), text: o() })),
        issuesDropped: E().int().optional(),
        renderError: o().optional(),
      }),
    }),
  ),
  nko = DoctorLazy(() =>
    u({
      emulatorPreview: u({
        file: o().max(4096),
        outcome: o().max(64),
        pictures: A(u({ path: o().max(4096), base64: o().optional() })).max(8),
        marks: A(o()).optional(),
        errors: A(o()).optional(),
        outline: o().optional(),
        stopped: o().optional(),
      }),
    }),
  ),
  qo = DoctorLazy(() =>
    u({
      opened: T(!0),
      url: o(),
      artifact_id: o().regex(ARTIFACT_SLUG_RE),
      title: o().optional(),
      owned: M()
        .optional()
        .catch(void 0),
    }),
  ),
  Go = DoctorLazy(() =>
    u({
      page_versions: u({
        url: o(),
        rows: A(u({ id: o(), createdAt: o().optional(), current: T(!0).optional() })),
        degraded: T(!0).optional(),
        cut: T(!0).optional(),
      }),
    }),
  ),
  rko = DoctorLazy(() =>
    u({
      shared: u({
        url: o(),
        mode: o().max(16),
        access: o().max(16),
        read_mode: o().max(32),
        added: E().int().min(0),
        editors: E().int().min(0).optional(),
        unchanged: M().optional(),
        org_name: o().max(200).optional(),
        title: o().optional(),
      }),
    }),
  ),
  GHs = DoctorLazy(() => {
    let e = [
      CREATED_FROM_TYPE_SCHEMA(),
      qo(),
      PUBLISH_RESULT_SCHEMA(),
      PUBLISH_SOURCE_TEXTS(),
      Ro(),
      TYPES_LIST_RESULT_SCHEMA(),
      DESCRIBE_TYPE_RESULT_SCHEMA(),
      TYPE_INSTANCES_RESULT_SCHEMA(),
      QUICKSTART_RESULT_SCHEMA(),
      $o(),
      Po(),
      To(),
    ];
    if (Ye) e.push(Vvo(), qvo(), Yvo());
    if (
      (e.push(Oo(), Co(), Do(), Fo()),
      e.push(
        At(),
        Io(),
        Rt(),
        No(),
        jo(),
        Lo(),
        Bo(),
        Mo(),
        Ho(),
        Uo(),
        Xvo(),
        Jvo(),
        Qvo(),
        Vo(),
        Zvo(),
        rko(),
        Go(),
      ),
      at)
    )
      e.push(at.handlersDocOutputSchema(), at.handlerResultOutputSchema(), at.scriptResultOutputSchema());
    return (e.push(eko(), tko(), nko()), Ue(e));
  });
//@ chunk-0wdgqhcf.js:32383-32596 placement
function getRemoteStageRoot() {
  if (
    env.CLAUDE_CODE_REMOTE !== !0 ||
    !S1(env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND)
  )
    return null;
  try {
    let e = resolveStageFileRoot(void 0);
    return resolveStageFileRoot(env.CLAUDE_STAGE_FILE_ROOT) === e ? e : null;
  } catch {
    return null;
  }
}
//@ chunk-0wdgqhcf.js:32596-32674 placement
function pt(e, t) {
  return e.every((n) => pathInWorkingPath(n, t, { caseFold: !1, uncShapeParity: !0 }));
}
//@ chunk-0wdgqhcf.js:32674-32690 placement
var Zo = 67108864;
/**
 * 判断路径是否是本会话的聊天附件：位于暂存根或上传目录且非硬链接；暂存根下按目录认定；上传目录下需核验文件身份与内容摘要并记入已验证附件表。返回是否在内及路径固定信息。
 */
//@ chunk-0wdgqhcf.js:32690-33069 placement
function checkChatAttachment(e, t, n) {
  let r = getPathsForPermissionCheck(e),
    s = getRemoteStageRoot(),
    d = s !== null && pt(r, s);
  if (!d && !pt(r, NA())) return { inside: !1 };
  let a = n ?? statFileIdentity(t);
  if (a.linked === !0) return { inside: !1, pin: a };
  if (d) return { inside: Qo(a), pin: a, byDirectory: !0 };
  let h = verifyAttachmentDigest(a),
    { verifiedAttachments: verifiedAttachments } = getLiveState();
  if (h === void 0 || a.identity === null)
    return (verifiedAttachments.delete(a.real), { inside: !1, pin: a });
  return (verifiedAttachments.set(a.real, a.identity), { inside: !0, pin: { ...a, digest: h } });
}
//@ chunk-0wdgqhcf.js:33069-33150 placement
function Qo(e) {
  try {
    return e.identity !== null && lstatSync(e.real).isFile();
  } catch {
    return !1;
  }
}
//@ chunk-0wdgqhcf.js:33150-33262 placement
function listStageRoots() {
  let e = new Set();
  for (let t of [void 0, env.CLAUDE_STAGE_FILE_ROOT])
    try {
      e.add(resolveStageFileRoot(t));
    } catch {}
  return [...e];
}
/**
 * 判断上传文件是否位于需要验证的目录且尚未验证（可选先做一次解析验证）。
 */
//@ chunk-0wdgqhcf.js:33262-33447 placement
function isUnverifiedUpload(e, t = {}) {
  let n = (s) => pathInWorkingPath(e, s, { caseFold: !0 });
  if (!(n(NA()) || y4e().some(n) || listStageRoots().some(n))) return !1;
  if (t.verify === !0) {
    let s = resolveLocalUploadPath(e);
    if (s.kind === "resolved") checkChatAttachment(e, s.real);
  }
  return !isVerifiedAttachment(e);
}
/**
 * 判断路径是已核验的聊天附件（位于暂存根，或在上传目录且身份与已验证记录一致、非硬链接）。
 */
//@ chunk-0wdgqhcf.js:33447-33679 placement
function isVerifiedAttachment(e) {
  let t = getPathsForPermissionCheck(e),
    n = getRemoteStageRoot(),
    r = n !== null && pt(t, n);
  if (!r && !pt(t, NA())) return !1;
  let s = statFileIdentity(t.at(-1) ?? e);
  if (s.linked === !0 || s.identity === null) return !1;
  return r || (Dot(s.real) !== void 0 && getLiveState().verifiedAttachments.get(s.real) === s.identity);
}
/**
 * 以不跟随链接的方式打开上传文件，核对文件身份与大小上限，计算内容哈希并与清单摘要比对，一致时返回摘要。
 */
//@ chunk-0wdgqhcf.js:33679-34062 placement
function verifyAttachmentDigest(e) {
  let t = Dot(e.real),
    n = e.identity === null ? void 0 : fileIdentityDev(e.identity);
  if (t === void 0 || n === void 0 || n > Zo) return;
  let r = constants.O_NOFOLLOW | constants.O_NONBLOCK,
    s;
  try {
    let d = lstatSync(e.real, { bigint: !0 });
    if (!d.isFile() || w_t(d) !== e.identity) return;
    s = openSync(e.real, constants.O_RDONLY | r);
    let a = fstatSync(s, { bigint: !0 });
    return a.isFile() && w_t(a) === e.identity && computeContentHash(readFileSync(s)) === t ? t : void 0;
  } catch {
    return;
  } finally {
    if (s !== void 0) closeSync(s);
  }
}
/**
 * 检查附件能否发布：服务端调用或 Cowork 绕过权限模式下视为不在工作目录内，否则按常规检查。
 */
//@ chunk-0wdgqhcf.js:34062-34269 placement
function checkAttachmentForPublish(e, t, n, r) {
  let s =
    isCoworkFramePublishSession() &&
    (n.mode === "bypassPermissions" ||
      isPlanBypass(n.mode, n.isBypassPermissionsModeAvailable) ||
      n.shouldAvoidPermissionPrompts === !0);
  if (n.servedCall === !0 || s) return { inside: !1 };
  return checkChatAttachment(e, t, r);
}
/**
 * 发布源文件无法安全核验时的拒绝决定，以及若干数量上限常量。
 */
//@ chunk-0wdgqhcf.js:34557-34812 placement
var UNVERIFIABLE_SOURCE_DENIAL = {
    behavior: "deny",
    message: "file_path: this source cannot be safely verified \u2014 publish the file by its resolved path",
    decisionReason: { type: "other", reason: "The publish source cannot be safely verified" },
  },
  zHs = 128,
  sko = 128,
  KHs = 128,
  iko = 1024,
  VHs = 128;
//@ chunk-0wdgqhcf.js:34812-34890 placement
function an(e) {
  let t = normalizeCaseForComparison(Mn(e));
  return getPlatform() === "windows" ? t.replace(/\//g, "\\") : t;
}
//@ chunk-0wdgqhcf.js:34890-35150 placement
function findLongestRootPrefix(e, t) {
  let n = an(e);
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
      let d = an(s),
        a = d.endsWith(sep) ? d : d + sep;
      return n === d || n.startsWith(a);
    })
    .sort((s, d) => d.length - s.length)[0];
}
/**
 * 判断主机名是否指向本机：localhost、::1、127.*、本机主机名或任一网卡地址。
 */
//@ chunk-0wdgqhcf.js:35150-35475 placement
function isLocalHostname(e) {
  let replaced = e.toLowerCase().replace(/\.+$/, "");
  if (
    replaced === "localhost" ||
    replaced === "::1" ||
    replaced.endsWith(".ipv6-literal.net") ||
    replaced.startsWith("127.") ||
    replaced === hostname().toLowerCase().replace(/\.+$/, "")
  )
    return !0;
  let replaced_2 = replaced.replace(/^\[|\]$/g, "");
  for (let r of Object.values(networkInterfaces()))
    for (let s of r ?? []) if (s.address.toLowerCase() === replaced_2) return !0;
  return !1;
}
//@ chunk-0wdgqhcf.js:35475-35560 placement
function ur(e) {
  let match = /^[\\/]{2}([^\\/]+)[\\/]/.exec(e);
  return match !== null && isLocalHostname(match[1] ?? "");
}
//@ chunk-0wdgqhcf.js:35560-35630 placement
function cr(e) {
  if (!Ya(e)) return !1;
  let t = _Li(e);
  return t !== null && isLocalHostname(t);
}
/**
 * 收集发布可用的目录：当前 cwd、去重后的额外工作目录，以及（是目录且非链接的）scratchpad 目录。
 */
//@ chunk-0wdgqhcf.js:35630-35952 placement
async function collectPublishDirs(e) {
  let t = getCwd(),
    n = (b) => HZe(normalize(expandPath(b))),
    r = n(t),
    s = new Set([r]),
    d = [];
  for (let b of allWorkingDirectories(e)) {
    let S = n(b);
    if (!s.has(S)) (s.add(S), d.push(S));
  }
  let h = (isScratchpadEnabled() ? getScratchpadDir() : null) ?? void 0;
  if (h !== void 0)
    try {
      let b = await lstat(h);
      if (b.isSymbolicLink() || !b.isDirectory()) h = void 0;
    } catch (error) {
      if (!isENOENT(error)) h = void 0;
    }
  return { cwd: t, dirs: d, scratchpad: h };
}
/**
 * 把发布锚点转换为选项（scratchpad 目录与工作目录列表）。
 */
//@ chunk-0wdgqhcf.js:35952-36060 placement
function toPublishAnchorOptions({ dirs: dirs, scratchpad: scratchpad }) {
  return {
    ...(scratchpad !== void 0 && { scratchpadDir: scratchpad }),
    ...(dirs.length > 0 && { workingDirs: dirs }),
  };
}
/**
 * 计算 scratchpad 的字面/真实路径对：不存在时原样；是真实目录且不在网络位置时返回解析结果。
 */
//@ chunk-0wdgqhcf.js:36060-36386 placement
async function getScratchpadPairs(e) {
  let { scratchpad: scratchpad } = e;
  if (scratchpad === void 0) return [];
  let n = (a) => !a.isSymbolicLink() && a.isDirectory(),
    r;
  try {
    r = await lstat(scratchpad);
  } catch (error) {
    return isENOENT(error) ? [[scratchpad, scratchpad]] : [];
  }
  if (!n(r) || (await isUnsafeSymlinkChain(scratchpad))) return [];
  let s = await realpath(scratchpad).catch(() => scratchpad),
    d = await lstat(scratchpad).catch(() => {
      return;
    });
  return d !== void 0 && n(d) && d.ino === r.ino && d.dev === r.dev ? [[scratchpad, s]] : [];
}
/**
 * 把工作目录展开为字面路径与真实路径对。
 */
//@ chunk-0wdgqhcf.js:36386-36493 placement
async function getWorkingDirPairs(e) {
  return (await getWorkingDirAnchors(e.dirs, { kind: "cwd", lex: e.cwd, real: e.cwd })).map((n) => [
    n.lex,
    n.real,
  ]);
}
/**
 * 判断路径是否位于 cwd、scratchpad 或任一工作目录之下。
 */
//@ chunk-0wdgqhcf.js:36493-36627 placement
function isUnderPublishDirs(e, t, n, r = []) {
  return [t.cwd, ...r.flatMap(([s, d]) => [s, d]), ...n.flatMap(([s, d]) => [s, d])].some(
    (s) => e === s || e.startsWith(s + sep),
  );
}
/**
 * 把发布基准路径解析为真实路径（仍在同一工作目录/scratchpad 内且无不安全链接时），返回解析后的路径与是否发生了重定向。
 */
//@ chunk-0wdgqhcf.js:36627-37219 placement
async function resolvePublishBaseRealpath(base, dirs, workingPairs = []) {
  let resolved = base,
    redirected = !1;
  if (ai(base) || Ya(base)) return { base: resolved, redirected: redirected };
  let d = (R, v) => R === v || R.startsWith(v + sep),
    { scratchpad: scratchpad } = dirs,
    h;
  if (scratchpad !== void 0 && !(await isUnsafeSymlinkChain(scratchpad)))
    h = await realpath(scratchpad).catch((R) => (isENOENT(R) ? scratchpad : void 0));
  let b = d(base, dirs.cwd) ? dirs.cwd : workingPairs.flatMap(([R, v]) => [R, v]).find((R) => d(base, R)),
    S = scratchpad !== void 0 && b === void 0 && (d(base, scratchpad) || (h !== void 0 && d(base, h))),
    y = S && scratchpad !== void 0 ? scratchpad : (b ?? dirs.cwd);
  if (
    (S ? h !== void 0 : !(await isUnsafeSymlinkChain(y))) &&
    !pathTouchesProtected(base) &&
    !(await isUnsafeSymlinkChain(base))
  )
    try {
      let R = await realpath(base),
        v = h;
      if (!S) v = await realpath(y);
      if (v !== void 0 && !ai(R) && !Ya(R) && d(R, v)) {
        resolved = R;
        let P = S && !d(base, y) ? v : y,
          V = base === P ? v : join(v, relative(P, base));
        redirected = resolved !== V;
      }
    } catch {}
  return { base: resolved, redirected: redirected };
}
/**
 * 审批暂存表满时淘汰最旧条目并标记发生过淘汰。
 */
//@ chunk-0wdgqhcf.js:37219-37335 placement
function evictOldestStash(e, t) {
  if (e.size >= t) {
    let n = e.keys().next().value;
    if (n !== void 0) (e.delete(n), (getLiveState().approvalStashEvicted = !0));
  }
}
//@ chunk-0wdgqhcf.js:37335-37412 placement
function mn(e, t, n = "") {
  return `${e}, and ${denyRulePhrase(t)} forbids reading files${n}.`;
}
/**
 * 发布源文件在审批后无法核验或已变化时的错误消息，以及"重试一次，仍被拒就停下告知用户"的说明。
 */
//@ chunk-0wdgqhcf.js:37412-37693 placement
var SOURCE_UNVERIFIED_MESSAGE =
    "file_path: could not verify the source file is unchanged since approval \u2014 retry the publish",
  SOURCE_CHANGED_MESSAGE =
    "file_path: the source file changed between approval and publish \u2014 retry the publish",
  RETRY_ONCE_NOTE = "Retry once; if the retry is refused the same way, stop and tell the user.";
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
function jon(e) {
  return `"${truncatePathMiddle(sweptPagePath(e) || "(unprintable path)", 300)}"`;
}
/**
 * 审批后 file_path 被（钩子或 SDK 宿主）改动时抛出的输入错误：未发布，不要重试。
 */
//@ chunk-0wdgqhcf.js:39486-39831 placement
function sourcePathChangedError(e, t) {
  let n = t === void 0 ? "after approval" : `after ${jon(t)} was approved`;
  return new ArtifactInputError(
    `file_path: the path was changed to ${jon(e)} ${n} (usually by a hook or SDK host), so nothing was published. Do not retry this call; if the new path is the file you mean, publish it in a new call, otherwise tell the user.`,
    "source_path_mismatch",
  );
}
/**
 * 发布需要读取文件而 Read 权限检查需要审批时的提示：重试发布以便发起询问。
 */
//@ chunk-0wdgqhcf.js:39831-39968 placement
var READ_CHECK_NEEDS_APPROVAL =
  "Publishing reads file contents and a Read permission check requires approval here \u2014 retry the publish so it can be asked.";
/**
 * 若存在拒绝读取的规则，返回发布被拒的权限结果（含规则说明）。
 */
//@ chunk-0wdgqhcf.js:39968-40116 placement
function getPublishReadDenial(e) {
  let t = getDenyRuleForTool(e, READ_PATH_PROBE);
  return t
    ? {
        behavior: "deny",
        message: mn("Publishing reads file contents", t),
        decisionReason: { type: "rule", rule: t },
      }
    : void 0;
}
/**
 * 判断路径是否在受信任的网络根下：UNC 路径需主机一致的根才算。
 */
//@ chunk-0wdgqhcf.js:40116-40292 placement
function isInTrustedNetworkRoot(e, t) {
  if (!Qn(e)) return isPathInTrustedNetworkRoot(e, t);
  let n = uncHostOf(e);
  if (n === null) return !1;
  for (let [r, s] of t ?? [])
    for (let d of s)
      if (Qn(d) && uncHostOf(d) === n && isPathInTrustedNetworkRoot(e, new Map([[r, [d]]]))) return !0;
  return !1;
}
//@ chunk-0wdgqhcf.js:40292-42093 placement
async function checkDeviceNamespacePath(e, t, n) {
  if (uT(e) || gb(e))
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
  if (ur(e) || cr(e))
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
  let r = ai(e) || Ya(e) || classifyHomeMount(e);
  if (r && !isInTrustedNetworkRoot(e, n))
    return {
      refused: {
        behavior: "deny",
        message:
          "Not published: that file is on a network share. Publish a file from this session's folders instead.",
        decisionReason: { type: "other", reason: "Network publish sources are refused" },
      },
    };
  let s = !1,
    d = !1,
    a = { kind: "network" };
  if (!r) {
    if (pathTouchesProtected(e) || (await isUnsafeSymlinkChain(e)))
      return { refused: UNVERIFIABLE_SOURCE_DENIAL };
    a = { kind: "absent" };
    let h = !1,
      b;
    try {
      let S = await lstat(e, { bigint: !0 });
      if (((h = S.isSymbolicLink()), !h)) b = { dev: S.dev, ino: S.ino };
    } catch {}
    if (h || b !== void 0) {
      s = h;
      try {
        let S = await realpath(e),
          y = await stat(S, { bigint: !0 });
        if (b !== void 0 && (y.dev !== b.dev || y.ino !== b.ino)) s = !0;
        else if (!y.isFile()) s = !0;
        else if (
          ((a = {
            kind: "file",
            dev: y.dev,
            ino: y.ino,
            sizeBytes: y.size,
            mtimeNs: y.mtimeNs,
            leafWasLink: h,
          }),
          (d = y.nlink > 1n),
          !s)
        ) {
          let R = [];
          for (let P of t) {
            if ((R.push(P), ai(P) || Ya(P) || (await isUnsafeSymlinkChain(P)))) continue;
            try {
              R.push(await realpath(P));
            } catch {}
          }
          let v = findLongestRootPrefix(e, R);
          if (v !== void 0) {
            let P = getPlatform() === "windows" ? /[\\/]+/ : /\/+/,
              filtered = v.split(P).filter(Boolean),
              filtered_2 = e.split(P).filter(Boolean),
              root = parse(e).root,
              G = count(parse(e).root.split(P), Boolean),
              ue = !0;
            for (let ie = G; ie < filtered_2.length - 1; ie++) {
              if (
                ((root = join(root, filtered_2[ie] ?? "")),
                ue && ie < filtered.length && filtered_2[ie] === filtered[ie])
              )
                continue;
              ue = !1;
              try {
                if ((await lstat(root)).isSymbolicLink()) {
                  s = !0;
                  break;
                }
              } catch {
                s = !0;
                break;
              }
            }
          }
        }
      } catch {
        ((a = { kind: "absent" }), (s = !0));
      }
    }
  }
  return { pin: a, redirected: s || d, unverifiedSpelling: s };
}
//@ chunk-0wdgqhcf.js:42093-42178 placement
async function fr(e) {
  try {
    return await readlink(`/proc/self/fd/${e.fd}`);
  } catch {
    return null;
  }
}
//@ chunk-0wdgqhcf.js:42178-42242 placement
async function hn(e, t) {
  let n = await fr(e);
  return n !== null && n === t;
}
/**
 * 安全读取已固定的发布源文件：拒绝受保护路径、链接、非普通文件、硬链接、身份变化或超大文件，读取全部字节后核对内容哈希，一致时返回字节、修改时间与身份。
 */
//@ chunk-0wdgqhcf.js:42242-42786 placement
async function readPinnedSource(path, expectedHash) {
  if (pathTouchesProtected(path)) return null;
  try {
    let lstatResult = await lstat(path, { bigint: !0 });
    if (lstatResult.isSymbolicLink() || !lstatResult.isFile()) return null;
    let handle = await open(path, constants_2.O_RDONLY | ws | O_NONBLOCK);
    try {
      let stats = await handle.stat({ bigint: !0 });
      if (
        !stats.isFile() ||
        stats.nlink !== 1n ||
        stats.ino !== lstatResult.ino ||
        stats.dev !== lstatResult.dev ||
        stats.size > BigInt(MAX_ARTIFACT_BYTES) ||
        !(await hn(handle, path)) ||
        (await handle.stat({ bigint: !0 })).nlink !== 1n
      )
        return null;
      let bytes = await readExactBytes(handle, Number(stats.size));
      if (bytes === null || computeContentHash(bytes) !== expectedHash) return null;
      return { bytes: bytes, mtimeMs: Number(stats.mtimeMs), identity: { dev: stats.dev, ino: stats.ino } };
    } finally {
      await handle.close().catch(() => {});
    }
  } catch {
    return null;
  }
}
//@ chunk-0wdgqhcf.js:42786-43908 placement
async function checkSourceUnchanged(e, t, n) {
  let filtered = n.digests.filter((digest) => digest !== void 0),
    s = filtered.length > 0;
  if (pathTouchesProtected(e) || (await isUnsafeSymlinkChain(e))) return { kind: "changed" };
  let d = t.kind === "absent" || !t.leafWasLink;
  if (d)
    try {
      if ((await lstat(e)).isSymbolicLink()) return { kind: "changed" };
    } catch {}
  let a;
  try {
    a = await open(e, constants_2.O_RDONLY | (d ? ws : O_NONBLOCK));
  } catch (error) {
    if (isENOENT(error)) return { kind: "missing" };
    if (AMt(error, "ELOOP") && d) return { kind: "changed" };
    throw error;
  }
  try {
    if (n.admittedPath !== void 0 && !(await hn(a, n.admittedPath))) return { kind: "changed" };
    let stats = await a.stat({ bigint: !0 });
    if (n.admittedPath !== void 0 && stats.nlink !== 1n) return { kind: "changed" };
    if (
      t.kind === "absent" ||
      stats.dev !== t.dev ||
      stats.ino !== t.ino ||
      stats.size !== t.sizeBytes ||
      (!s && stats.mtimeNs !== t.mtimeNs)
    )
      return { kind: "changed" };
    if (stats.size > BigInt(MAX_ARTIFACT_BYTES)) return { kind: "too_large", size: Number(stats.size) };
    if (env.CLAUDE_CODE_EVAL_CONFINED && stats.nlink > 1n) return { kind: "changed" };
    let b = await readExactBytes(a, Number(stats.size));
    if (b === null) return { kind: "changed" };
    if (s) {
      let S = computeContentHash(b);
      if (!filtered.every((y) => y === S)) return { kind: "changed" };
    } else {
      let stats_2 = await a.stat({ bigint: !0 });
      if (stats_2.mtimeNs !== stats.mtimeNs || stats_2.size !== stats.size) return { kind: "changed" };
    }
    return { kind: "ok", bytes: b, mtimeMs: Number(stats.mtimeMs) };
  } finally {
    await a.close();
  }
}
/**
 * 确认源文件未变化后计算内容哈希，出错或已变化返回 undefined。
 */
//@ chunk-0wdgqhcf.js:43908-44024 placement
async function hashSourceIfUnchanged(e, t) {
  try {
    let n = await checkSourceUnchanged(e, t, { digests: [] });
    return n.kind === "ok" ? computeContentHash(n.bytes) : void 0;
  } catch {
    return;
  }
}
/**
 * 判断两次固定的文件身份是否一致（设备、inode、叶子是否链接、大小，无哈希时还比较修改时间）。
 */
//@ chunk-0wdgqhcf.js:44024-44267 placement
function samePinIdentity(e, t) {
  if (e.pin.kind !== "file" || t.kind !== "file") return e.pin.kind === t.kind;
  return (
    e.pin.dev === t.dev &&
    e.pin.ino === t.ino &&
    e.pin.leafWasLink === t.leafWasLink &&
    e.pin.sizeBytes === t.sizeBytes &&
    (e.sha256 !== void 0 || e.pin.mtimeNs === t.mtimeNs)
  );
}
//@ chunk-0wdgqhcf.js:44267-44328 placement
function ZIr(e) {
  if (e > MAX_ARTIFACT_BYTES) throw new ArtifactInputError(describeTooLargePage(e), "too_large_raw");
}
//@ chunk-0wdgqhcf.js:44328-44907 placement
function describeUndecodableSource({ kind: kind, encoding: encoding, where: where }, r) {
  let s = r === "publish" ? "then publish again. Nothing was published." : "then preview again.";
  return kind === "undecodable"
    ? `file_path: the source file is not valid ${encoding === "utf-16le" ? "UTF-16" : "UTF-8"} text (first invalid byte at ${where}). It may be saved in another encoding or contain binary data. Rewrite it as UTF-8, ${s}`
    : `file_path: the source file has the replacement character U+FFFD at ${where}, usually left where an earlier edit or paste lost a character. Replace it with the intended text (in HTML, write an intended U+FFFD as &#xFFFD;), ${s}`;
}
/**
 * 严格把发布源文件字节解码为文本；无法解码或含替换字符时打点并抛出输入错误。
 */
//@ chunk-0wdgqhcf.js:44907-45183 placement
function decodeSourceText(e, t) {
  let n = decodeTextStrict(e);
  if (n.problem === void 0) return n.text;
  let r = n.problem.kind === "undecodable" ? "source_encoding" : "source_replacement_char";
  throw (
    logFeatureBad("artifact_publish", r, {
      source_bytes: e.length,
      encoding: fromEnum(n.problem.encoding),
      md: t.md,
    }),
    new ArtifactInputError(describeUndecodableSource(n.problem, "publish"), r)
  );
}

export {
  checkAttachmentForPublish,
  mn,
  isVerifiedAttachment,
  isUnverifiedUpload,
  At,
  Rt,
  Vvo,
  Zvo,
  describeUndecodableSource,
  tko,
  nko,
  rko,
  TYPE_FILE_UNREAD_REASONS,
  MERGED_OVER_SCHEMA,
  jon,
  GHs,
  evictOldestStash,
  sko,
  collectPublishDirs,
  getScratchpadPairs,
  getWorkingDirPairs,
  isUnderPublishDirs,
  resolvePublishBaseRealpath,
  zHs,
  getPublishReadDenial,
  checkDeviceNamespacePath,
  KHs,
  hashSourceIfUnchanged,
  Yvo,
  qvo,
  eko,
  Xvo,
  Jvo,
  Qvo,
  describePublishFiles,
  TYPE_LOCK_SCHEMA,
  readPinnedSource,
  checkPublishSourcePin,
  sourcePathChangedError,
  iko,
  READ_CHECK_NEEDS_APPROVAL,
  samePinIdentity,
  SOURCE_CHANGED_MESSAGE,
  decodeSourceText,
  SOURCE_UNVERIFIED_MESSAGE,
  isInTrustedNetworkRoot,
  UNVERIFIABLE_SOURCE_DENIAL,
  ZIr,
  checkSourceUnchanged,
  toPublishAnchorOptions,
  VHs,
};
