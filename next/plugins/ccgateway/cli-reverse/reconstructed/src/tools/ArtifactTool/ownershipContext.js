/**
 * tools/ArtifactTool/ownershipContext.ts
 *
 * 2.1.316 新增：所有权上下文
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (17)
 * attribution: placement 17
 */
import { getLiveState } from "../../services/liveReplica/liveReplica.js";
import { isWriterRole } from "../../services/artifacts/audience.js";
import { fitsContextLimits } from "../../utils/permissions/serverClassifier/context.js";
import {
  shareFactsWithheld,
  getShareEntry,
  typeSlugOf,
  entryOutsideOrgContent,
  getArtifactSlugForPath,
  ownedByUser,
  isSomeoneElses,
  shareAudience,
  audienceViewNote,
  probedOtherOrg,
} from "../../services/artifacts/shareEntries.js";
import { getAttestationKind } from "../../services/artifacts/attestation.js";
import { isNonEmptyObject } from "../../services/artifacts/capabilityDeclaration.js";
import { parseArtifactUrlInput } from "./constants.js";
import { expandPath } from "../../utils/path.js";
import { toPosixPath } from "../../utils/permissions/filesystem.js";
import { resolveVerifyTarget } from "./permissions/consentStamps.js";

//@ chunk-8wvtd8sr.js:323933-323960 placement
/**
 * 处理器模块的注入槽（未注入时为 null）。
 */
var artifactHandlersModule = null;
var weakMap_2 = new WeakMap();
//@ chunk-8wvtd8sr.js:323960-324126 placement
function rememberFirstContext(slug, snapshot, agentId, facet) {
  let liveState = getLiveState();
  let byKey = weakMap_2.get(liveState);
  if (byKey === undefined) {
    byKey = new Map();
    weakMap_2.set(liveState, byKey);
  }
  let key = `${agentId ?? ""}:${slug}:${facet}`;
  let existing = byKey.get(key);
  if (existing === undefined) {
    byKey.set(key, snapshot);
    return true;
  }
  return existing === snapshot;
}
//@ chunk-8wvtd8sr.js:324126-324180 placement
/**
 * 判断归属记录是否为可写角色。
 */
function isWriterOwnership(shareEntry) {
  return shareEntry.probeFailed !== true && isWriterRole(shareEntry.role);
}
//@ chunk-8wvtd8sr.js:324180-324291 placement
function ownershipRank(shareEntry) {
  if (shareEntry.probeFailed === true || shareEntry.role === undefined || shareEntry.role === "unknown")
    return 1;
  return shareEntry.role === "owner" ? 0 : 2;
}
//@ chunk-8wvtd8sr.js:324291-324346 placement
/**
 * 可见范围到排序权重的映射。
 */
var AUDIENCE_RANK = {
  owner: 0,
  users: 1,
  agent_scoped: 1,
  org: 2,
  public: 3,
};
//@ chunk-8wvtd8sr.js:324346-324405 placement
/**
 * 取可见范围权重，探测失败返回 undefined。
 */
function audienceRankOf(shareEntry) {
  return shareEntry.probeFailed === true ? undefined : AUDIENCE_RANK[shareEntry.mode];
}
//@ chunk-8wvtd8sr.js:324405-324537 placement
function audienceWidened(snapshotEntry, current) {
  let snapshotRank = audienceRankOf(snapshotEntry);
  let currentRank = audienceRankOf(current);
  if (currentRank === undefined) return snapshotRank !== undefined;
  if (snapshotRank === undefined) return currentRank > 0;
  return currentRank !== 0 && current.mode !== snapshotEntry.mode && !(currentRank < snapshotRank);
}
//@ chunk-8wvtd8sr.js:324537-324598 placement
/**
 * 共享 live 的可见性增量。
 */
function sharedLiveRank(shareEntry) {
  return shareEntry.probeFailed === true || shareEntry.isSharedLive ? 1 : 0;
}
//@ chunk-8wvtd8sr.js:324598-324909 placement
/**
 * 判断这次发布声明的连接器是否比之前存储的更多（按连接器名计数比较）；之前未知时只要声明了不在默认集合内的连接器即视为扩大。
 */
function connectorsWidened(snapshotConnectors, endpointConnectors) {
  if (artifactHandlersModule === null) return false;
  if (snapshotConnectors === undefined)
    return (
      endpointConnectors !== undefined &&
      endpointConnectors.length > 0 &&
      fitsContextLimits(
        endpointConnectors.map((connector) => artifactHandlersModule.connectorNameForClassifier(connector)),
      )
    );
  if (endpointConnectors === undefined) return true;
  let counts = new Map();
  for (let connector of snapshotConnectors) counts.set(connector, (counts.get(connector) ?? 0) + 1);
  return endpointConnectors.some((connector) => {
    let name = artifactHandlersModule.connectorNameForClassifier(connector);
    let remaining = counts.get(name) ?? 0;
    counts.set(name, remaining - 1);
    return remaining <= 0;
  });
}
//@ chunk-8wvtd8sr.js:324909-325085 placement
function shareFactsFromSnapshot(share) {
  return {
    mode: share.mode,
    isSharedLive: share.is_shared_live,
    ...(share.role !== undefined && {
      role: share.role,
    }),
    ...(share.probe_failed === true && {
      probeFailed: true,
    }),
    ...(share.cowritten === true && {
      cowritten: true,
    }),
  };
}
//@ chunk-8wvtd8sr.js:325085-326329 placement
/**
 * 比较分类器上下文快照与当前分享记录，列出某 slug 已过期的方面：归属、受众、共享 live、共写、连接器、第一方类型认证、类型声明、监视停止状态。
 */
function staleOwnershipFacets(slug, snapshot, includeWatch = false, agentId, checkConnectors = false) {
  let entry = snapshot?.by_slug[slug];
  let current = shareFactsWithheld(slug) ? undefined : getShareEntry(slug);
  let stale = [];
  if (entry?.share !== undefined && current !== undefined) {
    let snapshotShare = shareFactsFromSnapshot(entry.share);
    if (ownershipRank(current) > ownershipRank(snapshotShare)) stale.push("ownership");
    if (audienceWidened(snapshotShare, current)) stale.push("audience");
    if (sharedLiveRank(current) > sharedLiveRank(snapshotShare)) stale.push("shared-live");
    if (current.cowritten === true && snapshotShare.cowritten !== true) stale.push("co-written");
    if (checkConnectors && connectorsWidened(entry.share.endpoint_connectors, current.endpointConnectors))
      stale.push("connectors");
  } else if (snapshot !== undefined && current !== undefined) {
    if (!isWriterOwnership(current)) {
      if (rememberFirstContext(slug, snapshot, agentId, "ownership")) stale.push("ownership");
    } else if (
      checkConnectors &&
      connectorsWidened(undefined, current.endpointConnectors) &&
      rememberFirstContext(slug, snapshot, agentId, "connectors")
    )
      stale.push("connectors");
  }
  let liveState = getLiveState();
  let typeSlug = typeSlugOf(current);
  if (
    (entry?.attested !== undefined && liveState.attestedTypeArtifacts.get(slug)?.mark === undefined) ||
    (entry?.share?.type_first_party === true &&
      (typeSlug === undefined || getAttestationKind(typeSlug) !== "first_party_type"))
  )
    stale.push("attested");
  let share = entry?.share;
  if (
    share?.type_first_party === true &&
    share.type_lock === true &&
    share.outside_writer !== true &&
    share.caps_read_not_found !== true &&
    share.capabilities_unknown !== true &&
    share.grant_observed === true &&
    isNonEmptyObject(share.capabilities) &&
    current !== undefined &&
    (entryOutsideOrgContent(current) ||
      current.capsReadNotFound === true ||
      current.capabilitiesUnknown === true ||
      current.typeLock == null)
  )
    stale.push("type-declaration");
  if (includeWatch) {
    let watch = entry?.watch;
    if (
      (liveState.durable.stopLatches.isStopped(slug) && watch?.stopped !== true) ||
      (liveState.wakes.stoppedSlugs.has(slug) && watch?.auto_reply_stopped !== true) ||
      (liveState.wakes.sweptSlugs.has(slug) && watch?.auto_reply_swept !== true)
    )
      stale.push("watch");
  }
  return stale;
}
//@ chunk-8wvtd8sr.js:326329-326943 placement
/**
 * 收集一次 Artifact 调用涉及的全部 slug：url、from_url、files 中的复制来源；无 url 的发布按 file_path 找已关联的 slug，verify 动作取其目标。
 */
function requestArtifactSlugs(input, snapshot) {
  if (input === null || typeof input !== "object") return [];
  let record = input;
  let slugs = new Set();
  let urls = [record.url, record.from_url];
  let files = record.files;
  if (files !== null && typeof files === "object" && !Array.isArray(files)) {
    for (let requestUrls of Object.values(files))
      if (requestUrls !== null && typeof requestUrls === "object") urls.push(requestUrls.artifact);
  }
  for (let files of urls)
    if (typeof files === "string") {
      let artifactUrlInput = parseArtifactUrlInput(files);
      if (artifactUrlInput !== null) slugs.add(artifactUrlInput.slug);
    }
  if (record.url === undefined) {
    if (
      (record.action === undefined || record.action === "publish") &&
      record.type_url === undefined &&
      typeof record.file_path === "string"
    )
      try {
        let file = expandPath(record.file_path);
        for (let entry of [getArtifactSlugForPath(file), snapshot?.by_path[toPosixPath(file)]?.slug])
          if (entry !== undefined) slugs.add(entry);
      } catch {}
    if (record.action === "verify") {
      let verifyTarget = resolveVerifyTarget(record);
      if (verifyTarget !== null) slugs.add(verifyTarget.slug);
    }
  }
  return [...slugs];
}
//@ chunk-8wvtd8sr.js:326943-327047 placement
function isOwnershipFacet(facet) {
  return (
    facet === "ownership" ||
    facet === "audience" ||
    facet === "shared-live" ||
    facet === "co-written" ||
    facet === "watch"
  );
}
//@ chunk-8wvtd8sr.js:327047-327633 placement
/**
 * 用自然语言描述 Artifact 的归属与共享情况：自己的/他人的（可否编辑）/归属未确认，未共享或共享对象，跨组织、实时共享、他人写入过、watch 已停止等。
 */
function describeOwnershipWords(share, actions) {
  let words = [
    ownedByUser(share)
      ? "the user's own artifact"
      : isSomeoneElses(share)
        ? isWriterRole(share.role)
          ? "someone else's artifact that the user can edit"
          : "someone else's artifact"
        : "an artifact whose owner could not be confirmed",
    share.mode === "owner"
      ? "not shared"
      : `shared with ${share.mode === "org" ? "the user's organization" : shareAudience(share.mode)}`,
  ];
  if (share.external === true || share.outsideOrgReader === true)
    words.push("it belongs to another organization");
  if (share.mode !== "owner" && share.isSharedLive) words.push(audienceViewNote("live"));
  if (share.cowritten === true) words.push("others have written to it");
  if (actions.includes("watch")) words.push("its watch has since been stopped");
  return words.join(", ");
}
//@ chunk-8wvtd8sr.js:327633-328893 placement
/**
 * ArtifactTool.staleServerClassifierContext 的实现：判断服务端分类器看到的归属/受众等事实是否已过期，汇总需要说明的 slug 文案、探测失败信息与连接器变化，返回给分类器的补充上下文。
 */
function staleServerClassifierContext(input, snapshot, agentId) {
  let facets = new Set();
  let action = input !== null && typeof input === "object" ? input.action : undefined;
  let includeWatch = action === "watch" || action === "resume_replies";
  let checkConnectors = artifactHandlersModule?.requestReachesConnectors(input) ?? false;
  let firstTouch = false;
  let allFirstTouch = true;
  let probeFailedEntry;
  let connectorsChange;
  let ownershipNotes = [];
  let slugs = requestArtifactSlugs(input, snapshot);
  for (let slug of slugs) {
    let actions = staleOwnershipFacets(slug, snapshot, includeWatch, agentId, checkConnectors);
    if (actions.length === 0) continue;
    for (let facet of actions) facets.add(facet);
    let share = snapshot?.by_slug[slug]?.share;
    let share_2 = getShareEntry(slug);
    let isFirstTouch =
      share === undefined && (actions.includes("ownership") || actions.includes("connectors"));
    if (isFirstTouch) firstTouch = true;
    if (
      share_2?.probeFailed === true &&
      actions.some((facet) => facet === "ownership" || facet === "audience" || facet === "shared-live")
    ) {
      probeFailedEntry ??= share_2;
      continue;
    }
    let probeNowWorks =
      share?.probe_failed === true &&
      share_2?.probeFailed !== true &&
      actions.some((facet) => isOwnershipFacet(facet) && facet !== "watch");
    if (!isFirstTouch && !probeNowWorks) allFirstTouch = false;
    if (actions.includes("connectors"))
      connectorsChange ??= share_2?.endpointConnectors === undefined ? "unknown" : "wider";
    if (share_2 !== undefined && share_2.probeFailed !== true && actions.some(isOwnershipFacet))
      ownershipNotes.push({
        slug,
        words: describeOwnershipWords(share_2, actions),
      });
  }
  if (facets.size === 0) return;
  let factsNow =
    slugs.length > 1
      ? ownershipNotes.map(({ slug, words }) => `artifact ${slug}: ${words}`).join("; ")
      : (ownershipNotes[0]?.words ?? "");
  let cause;
  if (probeFailedEntry !== undefined) {
    let probeErrorCode = probeFailedEntry.probeErrorCode;
    let answer = probedOtherOrg(probeFailedEntry)
      ? "other_organization"
      : probeErrorCode === "boot_404"
        ? "not_found"
        : undefined;
    cause = {
      kind: "probe_failed",
      ...(answer !== undefined && {
        answer,
      }),
      ...(probeErrorCode !== undefined && {
        errorCode: probeErrorCode,
      }),
    };
  } else if (allFirstTouch)
    cause = {
      kind: "first_touch",
      factsNow,
      ...(connectorsChange !== undefined && {
        connectors: connectorsChange,
      }),
    };
  else
    cause = {
      kind: "changed",
      factsNow,
      ...(connectorsChange !== undefined && {
        connectors: connectorsChange,
      }),
    };
  return {
    phrase: [...facets].join(", "),
    facts: [...facets],
    firstTouch,
    cause,
  };
}
//@ chunk-8wvtd8sr.js:328893-329066 placement (2.1.88 match: countToolCallsSince, 1)
function countToolCallsSince(messages, sinceUuid) {
  return (
    messages !== undefined &&
    sinceUuid.messages.some(
      (message) =>
        message.type === "assistant" &&
        Array.isArray(message.message.content) &&
        message.message.content.some((block) => block.type === "tool_use" && block.id === messages),
    )
  );
}
//@ chunk-8wvtd8sr.js:329066-329132 placement
/**
 * 判断是否有更新的上下文（带 agentId 或此后有工具调用）。
 */
function hasNewerToolCalls(messages, sinceUuid) {
  return (
    messages !== undefined && (sinceUuid.agentId !== undefined || countToolCallsSince(messages, sinceUuid))
  );
}
export { hasNewerToolCalls, staleServerClassifierContext, countToolCallsSince };
