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
import { claudeAiEnvironment, HBe } from "../../constants/claudeAiOrigin.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { zhr } from "../policyLimits/capabilityBlocks.js";
import { Xb } from "./artifactAvailability.js";
import { isDiskless, getSessionId } from "../../bootstrap/state.js";
import { toPosixPath, isScratchpadEnabled, getScratchpadDir } from "../../utils/permissions/filesystem.js";
import { toolResultsDir } from "../../utils/toolResultStorage.js";
import { clampArtifactClassifierState } from "../../utils/permissions/serverClassifier/clamp.js";
import { v5 } from "./commentMonitor.js";
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
import { SLe } from "../../tools/ArtifactTool/actions/database.js";
import { isInheritedTypeGrantEnabled } from "../../tools/ArtifactTool/permissions/consentStamps.js";
import { isAutoReactEnabled } from "./comments/postReply.js";
import { getAttestationKind } from "./attestation.js";

//@ chunk-3jhw7vrg.js:13405-13435 placement
var v = !1,
  y = null,
  A = null,
  f = null;
/**
 * 为自动模式分类器构造 Artifact 相关上下文（路径、房间）
 */
//@ chunk-3jhw7vrg.js:13435-15671 placement
function buildArtifactClassifierContext({ tools: t } = {}) {
  if (
    !(t === void 0 ? isArtifactToolRegistered() : t.some((e) => ARTIFACT_FAMILY_TOOL_NAMES.includes(e.name)))
  )
    return;
  let u = hasLiveState(),
    S = !1,
    m = {
      by_slug: {},
      by_path: {},
      live_docs: [],
      room_armed: [],
      type_reads: {},
      session: {
        frame_env: claudeAiEnvironment(),
        viewer_origin: HBe() ?? getOauthConfig().CLAUDE_AI_ORIGIN,
        ...(HBe() !== void 0 && { dev_viewer_origin: HBe() }),
        short_links: zhr(),
        ant_build: S,
        comments_in_schema: Xb(),
        handlers: v,
        room_client: v,
        ...(f !== null && { connectors_mark: !0 }),
        eval_stub: getArtifactPublishStubDir() !== null,
        scratchpad_dir: N(),
        ...(!isDiskless() && { tool_results_dir: toPosixPath(toolResultsDir()) }),
        ...getArtifactGateContext(),
      },
    };
  if (!u) return clampArtifactClassifierState(m);
  v5();
  let o = getLiveState(),
    { shareStatus: shareStatus } = o,
    p = {},
    a = (e) => (p[e] ??= {}),
    h = (e) => Math.max(e.lastProbeLandedAt ?? 0, e.lastCapsLandedAt ?? 0, e.lastProbeIssuedAt ?? 0),
    b = (e) => {
      for (let s of e) if (!shareStatus.bySlug.has(s)) a(s);
    },
    n = new Set([
      ...o.durable.stopLatches.stoppedSlugs(),
      ...o.wakes.stoppedSlugs,
      ...o.wakes.sweptSlugs,
      ...o.live.repliesConsent.declined.keys(),
    ]);
  b(
    [
      ...o.attestedTypeArtifacts.keys(),
      ...shareStatus.pendingNoticeSlugs.keys(),
      ...o.ownPublishedSlugs.keys(),
    ].filter((e) => !n.has(e)),
  );
  for (let [e, s] of [...shareStatus.bySlug].sort(
    ([r, c], [k, C]) => Number(n.has(r)) - Number(n.has(k)) || h(c) - h(C),
  )) {
    let r = a(e);
    if (!shareFactsWithheld(e)) r.share = getArtifactEntryContext(s);
  }
  b(n);
  for (let [e, s] of o.attestedTypeArtifacts) if (s.mark !== void 0) a(e).attested = s.mark.kind;
  for (let e of shareStatus.pendingNoticeSlugs.keys()) a(e).notice_pending = !0;
  for (let [e, s] of o.ownPublishedSlugs) a(e).published_env = s.env;
  for (let e of Object.keys(p)) {
    let s = {
      ...(o.durable.stopLatches.isStopped(e) && { stopped: !0 }),
      ...(o.wakes.stoppedSlugs.has(e) && { auto_reply_stopped: !0 }),
      ...(o.wakes.sweptSlugs.has(e) && { auto_reply_swept: !0 }),
      ...(repliesConsentDeclined(e) && { replies_declined: !0 }),
    };
    if (Object.keys(s).length > 0) a(e).watch = s;
  }
  let l = {};
  for (let [e, s] of shareStatus.filePathToSlug) l[toPosixPath(e)] = { slug: s };
  for (let [e, s] of o.gatedThumbnailHrefs) {
    let r = toPosixPath(e);
    l[r] = { ...l[r], thumbnail_named: [...s.named] };
  }
  let g = [];
  if (y !== null)
    for (let [e, s] of shareStatus.bySlug)
      for (let r of s.livePaths ?? []) {
        let workingCopyOf = y.workingCopyOf(e, r);
        if (workingCopyOf !== void 0)
          g.push({ slug: e, live_path: r, working_copy: toPosixPath(workingCopyOf.path) });
      }
  return clampArtifactClassifierState({
    ...m,
    by_slug: p,
    by_path: l,
    live_docs: g,
    room_armed: Array.from(o.roomJoinArming, (e) =>
      e.startsWith("path:") ? `path:${toPosixPath(e.slice(5))}` : e,
    ),
    type_reads: Object.fromEntries(
      Array.from(o.typeCapabilityReads, ([e, s]) => [
        e,
        { declares_room: s.capabilities?.includes("room") === !0 },
      ]),
    ),
    ...(o.verify.lastPublish !== void 0 && { last_publish: o.verify.lastPublish }),
  });
}
/**
 * 给自动模式分类器的 Artifact 全局开关快照：工具集是否拆分、实时编辑/文档流、live_paths、copy_from、数据库 str_replace、类型目录、监听通道、自动回复等。
 */
//@ chunk-3jhw7vrg.js:15671-15985 placement
function getArtifactGateContext() {
  return {
    toolset: isArtifactToolsetSplit(),
    live_edit: A?.liveEditGateOpen() === !0,
    live_doc_stream: A?.liveDocStreamGateOpen() === !0,
    live_paths_schema: artifactLivePathsSchemaOpen(),
    copy_from: artifactCopyFromFrozen(),
    db_str_replace: SLe(),
    types_on: getLiveState().frozenArtifactTypes?.typesOn === !0,
    five_class_asks: !0,
    ...(isInheritedTypeGrantEnabled() && { inherited_type_grant: !0 }),
    watch_rail: sessionWatchRail(),
    auto_react: isAutoReactEnabled(),
  };
}
/**
 * 给自动模式分类器的单个 artifact 上下文：模式、是否共享实时、角色、探测情况、协作/外部写者、类型与类型锁、实时路径、能力声明、授权观察结果、端点连接器名等。
 */
//@ chunk-3jhw7vrg.js:15985-16943 placement
function getArtifactEntryContext(entry) {
  let d = typeSlugOf(entry);
  return {
    mode: entry.mode,
    is_shared_live: entry.isSharedLive,
    ...(entry.role !== void 0 && { role: entry.role }),
    ...(entry.probeFailed === !0 && { probe_failed: !0 }),
    probed: entry.lastProbeAt !== void 0 || entry.lastProbeLandedAt !== void 0,
    probe_current_account:
      entry.lastProbeIssuedAt !== void 0 && !issuedUnderDepartedAccount(entry.lastProbeIssuedAt),
    ...(entry.cowritten === !0 && { cowritten: !0 }),
    ...(entryOutsideOrgContent(entry) && { outside_writer: !0 }),
    ...(entry.artifactKind !== void 0 && { artifact_kind: entry.artifactKind }),
    ...(entry.typeLocked === !0 && { type_locked: !0 }),
    ...(entry.typeLock !== void 0 && { type_lock: entry.typeLock !== null }),
    ...(isInheritedTypeGrantEnabled() && {
      ...(d !== void 0 && getAttestationKind(d) === "first_party_type" && { type_first_party: !0 }),
      ...(entry.capsReadNotFound === !0 && { caps_read_not_found: !0 }),
    }),
    ...(entry.livePaths !== void 0 && { live_paths: [...entry.livePaths] }),
    ...(entry.capabilities !== void 0 && { capabilities: entry.capabilities }),
    ...(entry.capabilitiesUnknown === !0 && { capabilities_unknown: !0 }),
    grant_observed: storedGrantObserved(entry),
    ...(f !== null &&
      entry.endpointConnectors !== void 0 && {
        endpoint_connectors: entry.endpointConnectors.map((endpointConnector) =>
          f.connectorNameForClassifier(endpointConnector),
        ),
      }),
  };
}
//@ chunk-3jhw7vrg.js:16943-17018 placement
function N() {
  if (!isScratchpadEnabled()) return null;
  let t = getScratchpadDir(getSessionId());
  return t === null ? null : toPosixPath(t);
}
