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
function rememberFirstContext(slug, snapshot, agentId, r) {
  let liveState = getLiveState();
  let y = weakMap_2.get(liveState);
  if (y === undefined) {
    y = new Map();
    weakMap_2.set(liveState, y);
  }
  let p = `${agentId ?? ""}:${slug}:${r}`;
  let w = y.get(p);
  if (w === undefined) {
    y.set(p, snapshot);
    return true;
  }
  return w === snapshot;
}
//@ chunk-8wvtd8sr.js:324126-324180 placement
/**
 * 判断归属记录是否为可写角色。
 */
function isWriterOwnership(e) {
  return e.probeFailed !== true && isWriterRole(e.role);
}
//@ chunk-8wvtd8sr.js:324180-324291 placement
function ownershipRank(e) {
  if (e.probeFailed === true || e.role === undefined || e.role === "unknown") return 1;
  return e.role === "owner" ? 0 : 2;
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
function audienceRankOf(e) {
  return e.probeFailed === true ? undefined : AUDIENCE_RANK[e.mode];
}
//@ chunk-8wvtd8sr.js:324405-324537 placement
function audienceWidened(e, n) {
  let s = audienceRankOf(e);
  let r = audienceRankOf(n);
  if (r === undefined) return s !== undefined;
  if (s === undefined) return r > 0;
  return r !== 0 && n.mode !== e.mode && !(r < s);
}
//@ chunk-8wvtd8sr.js:324537-324598 placement
/**
 * 共享 live 的可见性增量。
 */
function sharedLiveRank(e) {
  return e.probeFailed === true || e.isSharedLive ? 1 : 0;
}
//@ chunk-8wvtd8sr.js:324598-324909 placement
/**
 * 判断这次发布声明的连接器是否比之前存储的更多（按连接器名计数比较）；之前未知时只要声明了不在默认集合内的连接器即视为扩大。
 */
function connectorsWidened(e, endpointConnectors) {
  if (artifactHandlersModule === null) return false;
  if (e === undefined)
    return (
      endpointConnectors !== undefined &&
      endpointConnectors.length > 0 &&
      fitsContextLimits(endpointConnectors.map((r) => artifactHandlersModule.connectorNameForClassifier(r)))
    );
  if (endpointConnectors === undefined) return true;
  let s = new Map();
  for (let r of e) s.set(r, (s.get(r) ?? 0) + 1);
  return endpointConnectors.some((r) => {
    let h = artifactHandlersModule.connectorNameForClassifier(r);
    let y = s.get(h) ?? 0;
    s.set(h, y - 1);
    return y <= 0;
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
    let T = shareFactsFromSnapshot(entry.share);
    if (ownershipRank(current) > ownershipRank(T)) stale.push("ownership");
    if (audienceWidened(T, current)) stale.push("audience");
    if (sharedLiveRank(current) > sharedLiveRank(T)) stale.push("shared-live");
    if (current.cowritten === true && T.cowritten !== true) stale.push("co-written");
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
  let S = typeSlugOf(current);
  if (
    (entry?.attested !== undefined && liveState.attestedTypeArtifacts.get(slug)?.mark === undefined) ||
    (entry?.share?.type_first_party === true &&
      (S === undefined || getAttestationKind(S) !== "first_party_type"))
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
function requestArtifactSlugs(e, snapshot) {
  if (e === null || typeof e !== "object") return [];
  let s = e;
  let r = new Set();
  let h = [s.url, s.from_url];
  let files = s.files;
  if (files !== null && typeof files === "object" && !Array.isArray(files)) {
    for (let p of Object.values(files)) if (p !== null && typeof p === "object") h.push(p.artifact);
  }
  for (let p of h)
    if (typeof p === "string") {
      let artifactUrlInput = parseArtifactUrlInput(p);
      if (artifactUrlInput !== null) r.add(artifactUrlInput.slug);
    }
  if (s.url === undefined) {
    if (
      (s.action === undefined || s.action === "publish") &&
      s.type_url === undefined &&
      typeof s.file_path === "string"
    )
      try {
        let p = expandPath(s.file_path);
        for (let w of [getArtifactSlugForPath(p), snapshot?.by_path[toPosixPath(p)]?.slug])
          if (w !== undefined) r.add(w);
      } catch {}
    if (s.action === "verify") {
      let verifyTarget = resolveVerifyTarget(s);
      if (verifyTarget !== null) r.add(verifyTarget.slug);
    }
  }
  return [...r];
}
//@ chunk-8wvtd8sr.js:326943-327047 placement
function isOwnershipFacet(e) {
  return e === "ownership" || e === "audience" || e === "shared-live" || e === "co-written" || e === "watch";
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
  let r = new Set();
  let action = input !== null && typeof input === "object" ? input.action : undefined;
  let includeWatch = action === "watch" || action === "resume_replies";
  let checkConnectors = artifactHandlersModule?.requestReachesConnectors(input) ?? false;
  let firstTouch = false;
  let A = true;
  let S;
  let R;
  let T = [];
  let P = requestArtifactSlugs(input, snapshot);
  for (let M of P) {
    let actions = staleOwnershipFacets(M, snapshot, includeWatch, agentId, checkConnectors);
    if (actions.length === 0) continue;
    for (let we of actions) r.add(we);
    let share = snapshot?.by_slug[M]?.share;
    let share_2 = getShareEntry(M);
    let Z = share === undefined && (actions.includes("ownership") || actions.includes("connectors"));
    if (Z) firstTouch = true;
    if (
      share_2?.probeFailed === true &&
      actions.some((we) => we === "ownership" || we === "audience" || we === "shared-live")
    ) {
      S ??= share_2;
      continue;
    }
    let ue =
      share?.probe_failed === true &&
      share_2?.probeFailed !== true &&
      actions.some((we) => isOwnershipFacet(we) && we !== "watch");
    if (!Z && !ue) A = false;
    if (actions.includes("connectors")) R ??= share_2?.endpointConnectors === undefined ? "unknown" : "wider";
    if (share_2 !== undefined && share_2.probeFailed !== true && actions.some(isOwnershipFacet))
      T.push({
        slug: M,
        words: describeOwnershipWords(share_2, actions),
      });
  }
  if (r.size === 0) return;
  let factsNow =
    P.length > 1 ? T.map(({ slug, words }) => `artifact ${slug}: ${words}`).join("; ") : (T[0]?.words ?? "");
  let V;
  if (S !== undefined) {
    let probeErrorCode = S.probeErrorCode;
    let x = probedOtherOrg(S)
      ? "other_organization"
      : probeErrorCode === "boot_404"
        ? "not_found"
        : undefined;
    V = {
      kind: "probe_failed",
      ...(x !== undefined && {
        answer: x,
      }),
      ...(probeErrorCode !== undefined && {
        errorCode: probeErrorCode,
      }),
    };
  } else if (A)
    V = {
      kind: "first_touch",
      factsNow,
      ...(R !== undefined && {
        connectors: R,
      }),
    };
  else
    V = {
      kind: "changed",
      factsNow,
      ...(R !== undefined && {
        connectors: R,
      }),
    };
  return {
    phrase: [...r].join(", "),
    facts: [...r],
    firstTouch,
    cause: V,
  };
}
//@ chunk-8wvtd8sr.js:328893-329066 placement = countToolCallsSince (1)
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
