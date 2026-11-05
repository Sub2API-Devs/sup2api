/**
 * services/artifacts/classifierContext.ts
 *
 * 自动模式分类器的 Artifact 上下文（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fnsx7q86.js (5)
 * attribution: placement 5
 */
import { isArtifactToolRegistered, isArtifactToolsetSplit } from "./artifactToolGates.js";
import { ARTIFACT_FAMILY_TOOL_NAMES, getArtifactPublishStubDir } from "../../tools/ArtifactTool/constants.js";
import { hasLiveState, getLiveState } from "../liveReplica/liveReplica.js";
import { claudeAiEnvironment, getArtifactHostOverride } from "../../constants/claudeAiOrigin.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { isCobaltGateOn } from "../policyLimits/capabilityBlocks.js";
import { isArtifactsAvailable } from "./artifactAvailability.js";
import { isDiskless, getSessionId } from "../../bootstrap/state.js";
import { toPosixPath, isScratchpadEnabled, getScratchpadDir } from "../../utils/permissions/filesystem.js";
import { toolResultsDir } from "../../utils/toolResultStorage.js";
import { clampArtifactClassifierState } from "../../utils/permissions/serverClassifier/clamp.js";
import { runCommentMonitorWithIntent } from "./commentMonitor.js";
import {
  shareFactsWithheld,
  typeSlugOf,
  issuedUnderDepartedAccount,
  entryOutsideOrgContent,
  storedGrantObserved,
} from "./shareEntries.js";
import { repliesConsentDeclined } from "./frameLiveReplies.js";
import {
  artifactLivePathsSchemaOpen,
  artifactCopyFromFrozen,
  sessionWatchRail,
} from "./artifactToolSchema.js";
import { isDbStrReplaceEnabledCached } from "../../tools/ArtifactTool/actions/database.js";
import { isInheritedTypeGrantEnabled } from "../../tools/ArtifactTool/permissions/consentStamps.js";
import { isAutoReactEnabled } from "./comments/postReply.js";
import { getAttestationKind } from "./attestation.js";

//@ chunk-fnsx7q86.js:14580-14610 placement
/**
 * 自动模式分类器的 Artifact 上下文占位（handlers/room_client 恒 false）与路径/房间/连接器信息。
 */
var NO_CLIENT = false;
var classifierWorkingCopy = null;
var classifierLiveGates = null;
var classifierConnectors = null;
//@ chunk-fnsx7q86.js:14610-16846 placement
/**
 * 为自动模式分类器构造 Artifact 相关上下文（路径、房间）
 */
function buildArtifactClassifierContext({ tools } = {}) {
  if (
    !(tools === undefined
      ? isArtifactToolRegistered()
      : tools.some((tool) => ARTIFACT_FAMILY_TOOL_NAMES.includes(tool.name)))
  )
    return;
  let hasState = hasLiveState();
  let antBuild = false;
  let context = {
    by_slug: {},
    by_path: {},
    live_docs: [],
    room_armed: [],
    type_reads: {},
    session: {
      frame_env: claudeAiEnvironment(),
      viewer_origin: getArtifactHostOverride() ?? getOauthConfig().CLAUDE_AI_ORIGIN,
      ...(getArtifactHostOverride() !== undefined && {
        dev_viewer_origin: getArtifactHostOverride(),
      }),
      short_links: isCobaltGateOn(),
      ant_build: antBuild,
      comments_in_schema: isArtifactsAvailable(),
      handlers: NO_CLIENT,
      room_client: NO_CLIENT,
      ...(classifierConnectors !== null && {
        connectors_mark: true,
      }),
      eval_stub: getArtifactPublishStubDir() !== null,
      scratchpad_dir: scratchpadDirPosix(),
      ...(!isDiskless() && {
        tool_results_dir: toPosixPath(toolResultsDir()),
      }),
      ...getArtifactGateContext(),
    },
  };
  if (!hasState) return clampArtifactClassifierState(context);
  runCommentMonitorWithIntent();
  let liveState = getLiveState();
  let { shareStatus } = liveState;
  let bySlug = {};
  let slotFor = (slug) => (bySlug[slug] ??= {});
  let markLive = (slug) =>
    Math.max(slug.lastProbeLandedAt ?? 0, slug.lastCapsLandedAt ?? 0, slug.lastProbeIssuedAt ?? 0);
  let markMany = (slugs) => {
    for (let slug of slugs) if (!shareStatus.bySlug.has(slug)) slotFor(slug);
  };
  let handled = new Set([
    ...liveState.durable.stopLatches.stoppedSlugs(),
    ...liveState.wakes.stoppedSlugs,
    ...liveState.wakes.sweptSlugs,
    ...liveState.live.repliesConsent.declined.keys(),
  ]);
  markMany(
    [
      ...liveState.attestedTypeArtifacts.keys(),
      ...shareStatus.pendingNoticeSlugs.keys(),
      ...liveState.ownPublishedSlugs.keys(),
    ].filter((slug) => !handled.has(slug)),
  );
  for (let [slug, entry] of [...shareStatus.bySlug].sort(
    ([keyA, entryA], [keyB, entryB]) =>
      Number(handled.has(keyA)) - Number(handled.has(keyB)) || markLive(entryA) - markLive(entryB),
  )) {
    let slot = slotFor(slug);
    if (!shareFactsWithheld(slug)) slot.share = getArtifactEntryContext(entry);
  }
  markMany(handled);
  for (let [slug, record] of liveState.attestedTypeArtifacts)
    if (record.mark !== undefined) slotFor(slug).attested = record.mark.kind;
  for (let key of shareStatus.pendingNoticeSlugs.keys()) slotFor(key).notice_pending = true;
  for (let [slug, version] of liveState.ownPublishedSlugs) slotFor(slug).published_env = version.env;
  for (let key of Object.keys(bySlug)) {
    let entry = {
      ...(liveState.durable.stopLatches.isStopped(key) && {
        stopped: true,
      }),
      ...(liveState.wakes.stoppedSlugs.has(key) && {
        auto_reply_stopped: true,
      }),
      ...(liveState.wakes.sweptSlugs.has(key) && {
        auto_reply_swept: true,
      }),
      ...(repliesConsentDeclined(key) && {
        replies_declined: true,
      }),
    };
    if (Object.keys(entry).length > 0) slotFor(key).watch = entry;
  }
  let pathToSlug = {};
  for (let [path, slug] of shareStatus.filePathToSlug)
    pathToSlug[toPosixPath(path)] = {
      slug,
    };
  for (let [href, slug] of liveState.gatedThumbnailHrefs) {
    let posixPath = toPosixPath(href);
    pathToSlug[posixPath] = {
      ...pathToSlug[posixPath],
      thumbnail_named: [...slug.named],
    };
  }
  let workingCopies = [];
  if (classifierWorkingCopy !== null)
    for (let [slug, share] of shareStatus.bySlug)
      for (let path of share.livePaths ?? []) {
        let copy = classifierWorkingCopy.workingCopyOf(slug, path);
        if (copy !== undefined)
          workingCopies.push({
            slug,
            live_path: path,
            working_copy: toPosixPath(copy.path),
          });
      }
  return clampArtifactClassifierState({
    ...context,
    by_slug: bySlug,
    by_path: pathToSlug,
    live_docs: workingCopies,
    room_armed: Array.from(liveState.roomJoinArming, (entry) =>
      entry.startsWith("path:") ? `path:${toPosixPath(entry.slice(5))}` : entry,
    ),
    type_reads: Object.fromEntries(
      Array.from(liveState.typeCapabilityReads, ([slug, caps]) => [
        slug,
        {
          declares_room: caps.capabilities?.includes("room") === true,
        },
      ]),
    ),
    ...(liveState.verify.lastPublish !== undefined && {
      last_publish: liveState.verify.lastPublish,
    }),
  });
}
//@ chunk-fnsx7q86.js:16846-17160 placement
/**
 * 给自动模式分类器的 Artifact 全局开关快照：工具集是否拆分、实时编辑/文档流、live_paths、copy_from、数据库 str_replace、类型目录、监听通道、自动回复等。
 */
function getArtifactGateContext() {
  return {
    toolset: isArtifactToolsetSplit(),
    live_edit: classifierLiveGates?.liveEditGateOpen() === true,
    live_doc_stream: classifierLiveGates?.liveDocStreamGateOpen() === true,
    live_paths_schema: artifactLivePathsSchemaOpen(),
    copy_from: artifactCopyFromFrozen(),
    db_str_replace: isDbStrReplaceEnabledCached(),
    types_on: getLiveState().frozenArtifactTypes?.typesOn === true,
    five_class_asks: true,
    ...(isInheritedTypeGrantEnabled() && {
      inherited_type_grant: true,
    }),
    watch_rail: sessionWatchRail(),
    auto_react: isAutoReactEnabled(),
  };
}
//@ chunk-fnsx7q86.js:17160-18117 placement
/**
 * 给自动模式分类器的单个 artifact 上下文：模式、是否共享实时、角色、探测情况、协作/外部写者、类型与类型锁、实时路径、能力声明、授权观察结果、端点连接器名等。
 */
function getArtifactEntryContext(entry) {
  let typeEntry = typeSlugOf(entry);
  return {
    mode: entry.mode,
    is_shared_live: entry.isSharedLive,
    ...(entry.role !== undefined && {
      role: entry.role,
    }),
    ...(entry.probeFailed === true && {
      probe_failed: true,
    }),
    probed: entry.lastProbeAt !== undefined || entry.lastProbeLandedAt !== undefined,
    probe_current_account:
      entry.lastProbeIssuedAt !== undefined && !issuedUnderDepartedAccount(entry.lastProbeIssuedAt),
    ...(entry.cowritten === true && {
      cowritten: true,
    }),
    ...(entryOutsideOrgContent(entry) && {
      outside_writer: true,
    }),
    ...(entry.artifactKind !== undefined && {
      artifact_kind: entry.artifactKind,
    }),
    ...(entry.typeLocked === true && {
      type_locked: true,
    }),
    ...(entry.typeLock !== undefined && {
      type_lock: entry.typeLock !== null,
    }),
    ...(isInheritedTypeGrantEnabled() && {
      ...(typeEntry !== undefined &&
        getAttestationKind(typeEntry) === "first_party_type" && {
          type_first_party: true,
        }),
      ...(entry.capsReadNotFound === true && {
        caps_read_not_found: true,
      }),
    }),
    ...(entry.livePaths !== undefined && {
      live_paths: [...entry.livePaths],
    }),
    ...(entry.capabilities !== undefined && {
      capabilities: entry.capabilities,
    }),
    ...(entry.capabilitiesUnknown === true && {
      capabilities_unknown: true,
    }),
    grant_observed: storedGrantObserved(entry),
    ...(classifierConnectors !== null &&
      entry.endpointConnectors !== undefined && {
        endpoint_connectors: entry.endpointConnectors.map((endpointConnector) =>
          classifierConnectors.connectorNameForClassifier(endpointConnector),
        ),
      }),
  };
}
//@ chunk-fnsx7q86.js:18117-18192 placement
function scratchpadDirPosix() {
  if (!isScratchpadEnabled()) return null;
  let scratchpadDir = getScratchpadDir(getSessionId());
  return scratchpadDir === null ? null : toPosixPath(scratchpadDir);
}
export { buildArtifactClassifierContext };
