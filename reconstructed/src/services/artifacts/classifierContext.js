/**
 * services/artifacts/classifierContext.ts
 *
 * 自动模式分类器的 Artifact 上下文（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3jhw7vrg.js (5)
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

//@ chunk-3jhw7vrg.js:13405-13435 placement
/**
 * 自动模式分类器的 Artifact 上下文占位（handlers/room_client 恒 false）与路径/房间/连接器信息。
 */
var NO_CLIENT = false;
var classifierWorkingCopy = null;
var classifierLiveGates = null;
var classifierConnectors = null;
//@ chunk-3jhw7vrg.js:13435-15671 placement
/**
 * 为自动模式分类器构造 Artifact 相关上下文（路径、房间）
 */
function buildArtifactClassifierContext({ tools: t } = {}) {
  if (
    !(t === undefined
      ? isArtifactToolRegistered()
      : t.some((e) => ARTIFACT_FAMILY_TOOL_NAMES.includes(e.name)))
  )
    return;
  let u = hasLiveState();
  let antBuild = false;
  let m = {
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
  if (!u) return clampArtifactClassifierState(m);
  runCommentMonitorWithIntent();
  let liveState = getLiveState();
  let { shareStatus } = liveState;
  let p = {};
  let a = (e) => (p[e] ??= {});
  let h = (e) => Math.max(e.lastProbeLandedAt ?? 0, e.lastCapsLandedAt ?? 0, e.lastProbeIssuedAt ?? 0);
  let b = (e) => {
    for (let s of e) if (!shareStatus.bySlug.has(s)) a(s);
  };
  let n = new Set([
    ...liveState.durable.stopLatches.stoppedSlugs(),
    ...liveState.wakes.stoppedSlugs,
    ...liveState.wakes.sweptSlugs,
    ...liveState.live.repliesConsent.declined.keys(),
  ]);
  b(
    [
      ...liveState.attestedTypeArtifacts.keys(),
      ...shareStatus.pendingNoticeSlugs.keys(),
      ...liveState.ownPublishedSlugs.keys(),
    ].filter((e) => !n.has(e)),
  );
  for (let [e, entry] of [...shareStatus.bySlug].sort(
    ([r, c], [k, C]) => Number(n.has(r)) - Number(n.has(k)) || h(c) - h(C),
  )) {
    let r = a(e);
    if (!shareFactsWithheld(e)) r.share = getArtifactEntryContext(entry);
  }
  b(n);
  for (let [e, s] of liveState.attestedTypeArtifacts) if (s.mark !== undefined) a(e).attested = s.mark.kind;
  for (let key of shareStatus.pendingNoticeSlugs.keys()) a(key).notice_pending = true;
  for (let [e, s] of liveState.ownPublishedSlugs) a(e).published_env = s.env;
  for (let key of Object.keys(p)) {
    let s = {
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
    if (Object.keys(s).length > 0) a(key).watch = s;
  }
  let l = {};
  for (let [e, s] of shareStatus.filePathToSlug)
    l[toPosixPath(e)] = {
      slug: s,
    };
  for (let [e, s] of liveState.gatedThumbnailHrefs) {
    let posixPath = toPosixPath(e);
    l[posixPath] = {
      ...l[posixPath],
      thumbnail_named: [...s.named],
    };
  }
  let g = [];
  if (classifierWorkingCopy !== null)
    for (let [e, s] of shareStatus.bySlug)
      for (let r of s.livePaths ?? []) {
        let c = classifierWorkingCopy.workingCopyOf(e, r);
        if (c !== undefined)
          g.push({
            slug: e,
            live_path: r,
            working_copy: toPosixPath(c.path),
          });
      }
  return clampArtifactClassifierState({
    ...m,
    by_slug: p,
    by_path: l,
    live_docs: g,
    room_armed: Array.from(liveState.roomJoinArming, (e) =>
      e.startsWith("path:") ? `path:${toPosixPath(e.slice(5))}` : e,
    ),
    type_reads: Object.fromEntries(
      Array.from(liveState.typeCapabilityReads, ([e, s]) => [
        e,
        {
          declares_room: s.capabilities?.includes("room") === true,
        },
      ]),
    ),
    ...(liveState.verify.lastPublish !== undefined && {
      last_publish: liveState.verify.lastPublish,
    }),
  });
}
//@ chunk-3jhw7vrg.js:15671-15985 placement
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
//@ chunk-3jhw7vrg.js:15985-16943 placement
/**
 * 给自动模式分类器的单个 artifact 上下文：模式、是否共享实时、角色、探测情况、协作/外部写者、类型与类型锁、实时路径、能力声明、授权观察结果、端点连接器名等。
 */
function getArtifactEntryContext(entry) {
  let d = typeSlugOf(entry);
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
      ...(d !== undefined &&
        getAttestationKind(d) === "first_party_type" && {
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
//@ chunk-3jhw7vrg.js:16943-17018 placement
function scratchpadDirPosix() {
  if (!isScratchpadEnabled()) return null;
  let scratchpadDir = getScratchpadDir(getSessionId());
  return scratchpadDir === null ? null : toPosixPath(scratchpadDir);
}
