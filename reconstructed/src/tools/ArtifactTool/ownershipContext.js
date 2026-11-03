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
import { w$o } from "../../utils/permissions/serverClassifier/context.js";
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
var Ga = null,
  weakMap_2 = new WeakMap();
//@ chunk-8wvtd8sr.js:323960-324126 placement
function rememberFirstContext(e, n, s, r) {
  let h = getLiveState(),
    y = weakMap_2.get(h);
  if (y === void 0) ((y = new Map()), weakMap_2.set(h, y));
  let p = `${s ?? ""}:${e}:${r}`,
    w = y.get(p);
  if (w === void 0) return (y.set(p, n), !0);
  return w === n;
}
//@ chunk-8wvtd8sr.js:324126-324180 placement
function Wb(e) {
  return e.probeFailed !== !0 && isWriterRole(e.role);
}
//@ chunk-8wvtd8sr.js:324180-324291 placement
function ownershipRank(e) {
  if (e.probeFailed === !0 || e.role === void 0 || e.role === "unknown") return 1;
  return e.role === "owner" ? 0 : 2;
}
//@ chunk-8wvtd8sr.js:324291-324346 placement
var Vb = { owner: 0, users: 1, agent_scoped: 1, org: 2, public: 3 };
//@ chunk-8wvtd8sr.js:324346-324405 placement
function Ap(e) {
  return e.probeFailed === !0 ? void 0 : Vb[e.mode];
}
//@ chunk-8wvtd8sr.js:324405-324537 placement
function audienceWidened(e, n) {
  let s = Ap(e),
    r = Ap(n);
  if (r === void 0) return s !== void 0;
  if (s === void 0) return r > 0;
  return r !== 0 && n.mode !== e.mode && !(r < s);
}
//@ chunk-8wvtd8sr.js:324537-324598 placement
function Sp(e) {
  return e.probeFailed === !0 || e.isSharedLive ? 1 : 0;
}
/**
 * 判断这次发布声明的连接器是否比之前存储的更多（按连接器名计数比较）；之前未知时只要声明了不在默认集合内的连接器即视为扩大。
 */
//@ chunk-8wvtd8sr.js:324598-324909 placement
function connectorsWidened(e, n) {
  if (Ga === null) return !1;
  if (e === void 0)
    return n !== void 0 && n.length > 0 && w$o(n.map((r) => Ga.connectorNameForClassifier(r)));
  if (n === void 0) return !0;
  let s = new Map();
  for (let r of e) s.set(r, (s.get(r) ?? 0) + 1);
  return n.some((r) => {
    let connectorNameForClassifier = Ga.connectorNameForClassifier(r),
      y = s.get(connectorNameForClassifier) ?? 0;
    return (s.set(connectorNameForClassifier, y - 1), y <= 0);
  });
}
//@ chunk-8wvtd8sr.js:324909-325085 placement
function shareFactsFromSnapshot(e) {
  return {
    mode: e.mode,
    isSharedLive: e.is_shared_live,
    ...(e.role !== void 0 && { role: e.role }),
    ...(e.probe_failed === !0 && { probeFailed: !0 }),
    ...(e.cowritten === !0 && { cowritten: !0 }),
  };
}
/**
 * 比较分类器上下文快照与当前分享记录，列出某 slug 已过期的方面：归属、受众、共享 live、共写、连接器、第一方类型认证、类型声明、监视停止状态。
 */
//@ chunk-8wvtd8sr.js:325085-326329 placement
function staleOwnershipFacets(slug, snapshot, includeWatch = !1, agentId, checkConnectors = !1) {
  let entry = snapshot?.by_slug[slug],
    current = shareFactsWithheld(slug) ? void 0 : getShareEntry(slug),
    stale = [];
  if (entry?.share !== void 0 && current !== void 0) {
    let T = shareFactsFromSnapshot(entry.share);
    if (ownershipRank(current) > ownershipRank(T)) stale.push("ownership");
    if (audienceWidened(T, current)) stale.push("audience");
    if (Sp(current) > Sp(T)) stale.push("shared-live");
    if (current.cowritten === !0 && T.cowritten !== !0) stale.push("co-written");
    if (checkConnectors && connectorsWidened(entry.share.endpoint_connectors, current.endpointConnectors))
      stale.push("connectors");
  } else if (snapshot !== void 0 && current !== void 0) {
    if (!Wb(current)) {
      if (rememberFirstContext(slug, snapshot, agentId, "ownership")) stale.push("ownership");
    } else if (
      checkConnectors &&
      connectorsWidened(void 0, current.endpointConnectors) &&
      rememberFirstContext(slug, snapshot, agentId, "connectors")
    )
      stale.push("connectors");
  }
  let A = getLiveState(),
    S = typeSlugOf(current);
  if (
    (entry?.attested !== void 0 && A.attestedTypeArtifacts.get(slug)?.mark === void 0) ||
    (entry?.share?.type_first_party === !0 && (S === void 0 || getAttestationKind(S) !== "first_party_type"))
  )
    stale.push("attested");
  let R = entry?.share;
  if (
    R?.type_first_party === !0 &&
    R.type_lock === !0 &&
    R.outside_writer !== !0 &&
    R.caps_read_not_found !== !0 &&
    R.capabilities_unknown !== !0 &&
    R.grant_observed === !0 &&
    isNonEmptyObject(R.capabilities) &&
    current !== void 0 &&
    (entryOutsideOrgContent(current) ||
      current.capsReadNotFound === !0 ||
      current.capabilitiesUnknown === !0 ||
      current.typeLock == null)
  )
    stale.push("type-declaration");
  if (includeWatch) {
    let T = entry?.watch;
    if (
      (A.durable.stopLatches.isStopped(slug) && T?.stopped !== !0) ||
      (A.wakes.stoppedSlugs.has(slug) && T?.auto_reply_stopped !== !0) ||
      (A.wakes.sweptSlugs.has(slug) && T?.auto_reply_swept !== !0)
    )
      stale.push("watch");
  }
  return stale;
}
/**
 * 收集一次 Artifact 调用涉及的全部 slug：url、from_url、files 中的复制来源；无 url 的发布按 file_path 找已关联的 slug，verify 动作取其目标。
 */
//@ chunk-8wvtd8sr.js:326329-326943 placement
function requestArtifactSlugs(e, n) {
  if (e === null || typeof e !== "object") return [];
  let s = e,
    r = new Set(),
    h = [s.url, s.from_url],
    files = s.files;
  if (files !== null && typeof files === "object" && !Array.isArray(files)) {
    for (let p of Object.values(files)) if (p !== null && typeof p === "object") h.push(p.artifact);
  }
  for (let p of h)
    if (typeof p === "string") {
      let w = parseArtifactUrlInput(p);
      if (w !== null) r.add(w.slug);
    }
  if (s.url === void 0) {
    if (
      (s.action === void 0 || s.action === "publish") &&
      s.type_url === void 0 &&
      typeof s.file_path === "string"
    )
      try {
        let p = expandPath(s.file_path);
        for (let w of [getArtifactSlugForPath(p), n?.by_path[toPosixPath(p)]?.slug])
          if (w !== void 0) r.add(w);
      } catch {}
    if (s.action === "verify") {
      let p = resolveVerifyTarget(s);
      if (p !== null) r.add(p.slug);
    }
  }
  return [...r];
}
//@ chunk-8wvtd8sr.js:326943-327047 placement
function isOwnershipFacet(e) {
  return e === "ownership" || e === "audience" || e === "shared-live" || e === "co-written" || e === "watch";
}
/**
 * 用自然语言描述 Artifact 的归属与共享情况：自己的/他人的（可否编辑）/归属未确认，未共享或共享对象，跨组织、实时共享、他人写入过、watch 已停止等。
 */
//@ chunk-8wvtd8sr.js:327047-327633 placement
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
  if (share.external === !0 || share.outsideOrgReader === !0)
    words.push("it belongs to another organization");
  if (share.mode !== "owner" && share.isSharedLive) words.push(audienceViewNote("live"));
  if (share.cowritten === !0) words.push("others have written to it");
  if (actions.includes("watch")) words.push("its watch has since been stopped");
  return words.join(", ");
}
/**
 * ArtifactTool.staleServerClassifierContext 的实现：判断服务端分类器看到的归属/受众等事实是否已过期，汇总需要说明的 slug 文案、探测失败信息与连接器变化，返回给分类器的补充上下文。
 */
//@ chunk-8wvtd8sr.js:327633-328893 placement
function staleServerClassifierContext(input, snapshot, agentId) {
  let r = new Set(),
    h = input !== null && typeof input === "object" ? input.action : void 0,
    y = h === "watch" || h === "resume_replies",
    p = Ga?.requestReachesConnectors(input) ?? !1,
    w = !1,
    A = !0,
    S,
    R,
    T = [],
    P = requestArtifactSlugs(input, snapshot);
  for (let M of P) {
    let x = staleOwnershipFacets(M, snapshot, y, agentId, p);
    if (x.length === 0) continue;
    for (let we of x) r.add(we);
    let q = snapshot?.by_slug[M]?.share,
      re = getShareEntry(M),
      Z = q === void 0 && (x.includes("ownership") || x.includes("connectors"));
    if (Z) w = !0;
    if (
      re?.probeFailed === !0 &&
      x.some((we) => we === "ownership" || we === "audience" || we === "shared-live")
    ) {
      S ??= re;
      continue;
    }
    let ue =
      q?.probe_failed === !0 &&
      re?.probeFailed !== !0 &&
      x.some((we) => isOwnershipFacet(we) && we !== "watch");
    if (!Z && !ue) A = !1;
    if (x.includes("connectors")) R ??= re?.endpointConnectors === void 0 ? "unknown" : "wider";
    if (re !== void 0 && re.probeFailed !== !0 && x.some(isOwnershipFacet))
      T.push({ slug: M, words: describeOwnershipWords(re, x) });
  }
  if (r.size === 0) return;
  let L =
      P.length > 1
        ? T.map(({ slug: slug, words: words }) => `artifact ${slug}: ${words}`).join("; ")
        : (T[0]?.words ?? ""),
    V;
  if (S !== void 0) {
    let probeErrorCode = S.probeErrorCode,
      x = probedOtherOrg(S) ? "other_organization" : probeErrorCode === "boot_404" ? "not_found" : void 0;
    V = {
      kind: "probe_failed",
      ...(x !== void 0 && { answer: x }),
      ...(probeErrorCode !== void 0 && { errorCode: probeErrorCode }),
    };
  } else if (A) V = { kind: "first_touch", factsNow: L, ...(R !== void 0 && { connectors: R }) };
  else V = { kind: "changed", factsNow: L, ...(R !== void 0 && { connectors: R }) };
  return { phrase: [...r].join(", "), facts: [...r], firstTouch: w, cause: V };
}
//@ chunk-8wvtd8sr.js:328893-329066 placement = countToolCallsSince (1)
function countToolCallsSince(messages, sinceUuid) {
  return (
    messages !== void 0 &&
    sinceUuid.messages.some(
      (message) =>
        message.type === "assistant" &&
        Array.isArray(message.message.content) &&
        message.message.content.some((block) => block.type === "tool_use" && block.id === messages),
    )
  );
}
//@ chunk-8wvtd8sr.js:329066-329132 placement
function Qb(e, n) {
  return e !== void 0 && (n.agentId !== void 0 || countToolCallsSince(e, n));
}

export { Qb, staleServerClassifierContext, countToolCallsSince };
