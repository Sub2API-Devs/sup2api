/**
 * tools/ArtifactTool/artifactResumeCarry.ts
 *
 * 2.1.316 新增：恢复会话时带过 Artifact 状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (40)
 * attribution: placement 40
 */
import {
  getLiveState,
  replicaKey,
  pruneRefusedPublishBodies,
  clearHandoverReadState,
  resetForNewConversation,
  clearRefusedPublishBodies,
} from "../../services/liveReplica/liveReplica.js";
import { hasMainKey } from "../../utils/agentContext.js";
import { isResumeFrameSeedEligible } from "../../services/artifacts/artifactToolGates.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import {
  ARTIFACT_TOOL_NAME as ARTIFACT_TOOL_NAME_2,
  ARTIFACT_DELETED_NOTE_RE,
  uuidSlugFromUrl,
  ARTIFACT_DELETED_NOTE_TAG,
  ARTIFACT_ATTACHED_NOTE_RE,
  ARTIFACT_VERSION_SAFE_RE,
  MAX_LISTED_FILES_SHOWN,
  parseArtifactUrlInput,
} from "./constants.js";
import { WEBFETCH } from "../WebFetchTool/prompt.js";
import { FILE_READ_TOOL_NAME } from "../FileReadTool/constants.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import { CLAUDE_ARTIFACTS } from "../../services/mcp/firstPartyServerIds.js";
import {
  ARTIFACT_ACTIONS,
  DELETE_ARTIFACT,
  deletedSlugFromResult,
  publishedArtifactFromResult,
} from "./actionNames.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { artifactViewerUrlFor, canonicalArtifactTargetFor, sanitizeArtifactTitle } from "./artifactUrls.js";
import { vkt } from "../../services/artifacts/rejectBreaker.js";
import { unlinkPath, linkPathToSlug, retainPathLinks } from "../../services/artifacts/shareEntries.js";
import { expandPath } from "../../utils/path.js";
import { sanitizeDisplayTitle } from "../../utils/textNormalize.js";
import { ove } from "../../utils/confusables.js";
import { runBundledSkillSessionResets } from "../../skills/bundledSkills.js";

//@ chunk-e6aww6q8.js:1860017-1860052 placement
var ATTACHED = "attached:",
  CREATED = "created:";
//@ chunk-e6aww6q8.js:1860052-1860100 placement
function Qet(e) {
  return e.startsWith("created:");
}
//@ chunk-e6aww6q8.js:1860100-1860117 placement
var OPENED = "opened:";
//@ chunk-e6aww6q8.js:1860117-1860210 placement
function rRe(e) {
  return e.startsWith("attached:") || e.startsWith("created:") || e.startsWith(OPENED);
}
//@ chunk-e6aww6q8.js:1860210-1860283 placement
function Zz(e) {
  return Object.entries(e).filter(([n]) => !n.startsWith(OPENED));
}
/**
 * 选出需要持久化的 frameUrls 行：在恢复保留集合中的，或本会话经 MCP 发布的。
 */
//@ chunk-e6aww6q8.js:1860283-1860410 placement
function frameUrlRowsToPersist(e) {
  let n = new Set(Zz(e).map(([r]) => r));
  return Object.entries(e).filter(([r, s]) => n.has(r) || s.mcpPublishedHere === !0);
}
/**
 * 把 frameUrl 行转换成持久化记录（url、标题、图标、类型 frame、更新时间）。
 */
//@ chunk-e6aww6q8.js:1860410-1860536 placement
function frameUrlToRecord(e) {
  return {
    url: e.url,
    title: e.title,
    favicon: e.favicon,
    kind: "frame",
    updated_at: new Date(e.updatedAt).toISOString(),
  };
}
//@ chunk-e6aww6q8.js:1860536-1860548 placement
var R3e = 256;
/**
 * 收集压缩前需要保留的 Artifact 读版本：主线程观察过、且尚未作为同版本未注入的读取送达的 slug（最近的在前，最多 R3e 个）。
 */
//@ chunk-e6aww6q8.js:1860548-1860838 placement
function unconsumedReadVersions(e) {
  let artifactReadVersions = e.artifactReadVersions;
  if (artifactReadVersions === void 0) return;
  let { readDeliveries: readDeliveries } = getLiveState(),
    s = [];
  for (let [h, y] of Object.entries(artifactReadVersions)) {
    let S = readDeliveries.get(replicaKey(void 0, h)),
      w = S !== void 0 && S.ver === y && !S.sourced;
    if (hasMainKey(e.artifactReadObservers?.[h]) && !w) s.push({ slug: h, ver: y });
  }
  return s.reverse().slice(0, R3e);
}
/**
 * 压缩时（可恢复的情况下）把尚未送达的 Artifact 读版本写入压缩元数据。
 */
//@ chunk-e6aww6q8.js:1860838-1860964 placement
function stampPreCompactReadVersions(e, n, r) {
  if (n !== void 0 || !isResumeFrameSeedEligible()) return;
  let s = unconsumedReadVersions(r);
  if (s !== void 0) e.compactMetadata.preCompactArtifactReadVersions = s;
}
//@ chunk-e6aww6q8.js:1860964-1861106 placement
function logResumeCarry(e, n) {
  if (e.boundaries === 0) return;
  logFeatureOk("artifact_resume_carry", {
    boundaries: e.boundaries,
    carried: e.versions,
    dropped: e.dropped,
    held: n,
  });
}
//@ chunk-e6aww6q8.js:1861106-1861280 placement
class ArtifactTargetOrder {
  order = [];
  touch(e) {
    this.order = [e, ...this.order.filter((n) => n !== e)];
  }
  forget(e) {
    this.order = this.order.filter((n) => n !== e);
  }
  refs() {
    return this.order.map((e) => ({ slug: e }));
  }
}
//@ chunk-e6aww6q8.js:1861280-1861358 placement
function C3e(e) {
  return Array.isArray(e) ? e.filter((n) => typeof n === "string") : [];
}
//@ chunk-e6aww6q8.js:1861358-1861521 placement
function applyCompactCarry(e, n, r) {
  if (e.summarySeen && (e.lastKept === void 0 || e.lastKeptSeen) && !e.foreign)
    n.versions = restoreCompactReadVersions(e.versions, r);
  else if (Array.isArray(e.versions)) n.dropped++;
}
/**
 * 恢复会话时收集需要带过的 Artifact 状态（最近的发布、读取等）。
 */
//@ chunk-e6aww6q8.js:1861521-1864551 placement
function collectArtifactResumeCarry(e, n) {
  let r = new Set(),
    s = new Map(),
    h = new Set(),
    y = new Set(),
    S = new Set(),
    w = new Map(),
    L = new Set();
  for (let Ae of e) {
    if (Ae.type !== "assistant" || !Array.isArray(Ae.message.content)) continue;
    for (let Ie of Ae.message.content)
      if (Ie.type === "tool_use") {
        if (Ae.remoteSourced === !0) L.add(Ie.id);
        if (Ie.name === ARTIFACT_TOOL_NAME_2) {
          r.add(Ie.id);
          let Me = Ie.input?.url;
          if (typeof Me === "string") s.set(Ie.id, Me);
        } else if (Ie.name === WEBFETCH) h.add(Ie.id);
        else if (Ie.name === FILE_READ_TOOL_NAME) y.add(Ie.id);
        else {
          let Me = mcpInfoFromString(Ie.name);
          if (Me?.serverName === CLAUDE_ARTIFACTS && Me.toolName !== void 0) {
            if (ARTIFACT_ACTIONS.has(Me.toolName)) S.add(Ie.id);
            else if (Me.toolName === DELETE_ARTIFACT)
              w.set(Ie.id, isPlainObject_4(Ie.input) ? Ie.input.slug : void 0);
          }
        }
      }
  }
  let G = {},
    q = {},
    Z = {},
    Se = new Map(),
    ke = new ArtifactTargetOrder(),
    we = { boundaries: 0, versions: 0, dropped: 0 },
    Ee;
  for (let Ae of e) {
    if (Ae.type === "system" && Ae.subtype === "compact_boundary") {
      if (Ee?.preserved.has(Ae.uuid)) {
        if (Ae.uuid === Ee.lastKept) Ee.lastKeptSeen = !0;
        continue;
      }
      if (Ee !== void 0) (applyCompactCarry(Ee, we, q), (Ee = void 0));
      if (Ae.remoteSourced !== !0) {
        we.boundaries++;
        let Ie = Ae.compactMetadata?.preservedMessages;
        Ee = {
          versions: Ae.compactMetadata?.preCompactArtifactReadVersions,
          preserved: new Set([...C3e(Ie?.allUuids), ...C3e(Ie?.uuids)]),
          lastKept: C3e(Ie?.uuids).at(-1),
          lastKeptSeen: !1,
          summarySeen: !1,
          foreign: !1,
        };
      }
      continue;
    }
    if (Ee !== void 0) {
      if (Ee.preserved.has(Ae.uuid)) {
        if (Ae.uuid === Ee.lastKept) Ee.lastKeptSeen = !0;
      } else if (Ae.type === "user" && Ae.isCompactSummary === !0)
        ((Ee.summarySeen = !0), (Ee.foreign = Ae.remoteSourced === !0));
      else if (Ae.type === "user" || Ae.type === "assistant") (applyCompactCarry(Ee, we, q), (Ee = void 0));
    }
    if (Ae.type !== "user") continue;
    if (Ae.isMeta === !0 && typeof Ae.message.content === "string") {
      let Ie = ARTIFACT_DELETED_NOTE_RE.exec(Ae.message.content)?.[1],
        Me = Ie !== void 0 ? uuidSlugFromUrl(Ie) : null;
      if (Me !== null)
        forgetArtifactSlug(Me, {
          frameUrls: G,
          artifactReadVersions: q,
          target: ke,
          createdFromType: Z,
          pathPins: Se,
          applyLinks: n?.applyLinks !== !1,
        });
      else if (Ae.remoteSourced !== !0) applyAttachedNote(Ae.message.content, Ae.timestamp, G, ke);
      continue;
    }
    if (!Array.isArray(Ae.message.content)) continue;
    for (let Ie of Ae.message.content) {
      if (Ie.type !== "tool_result" || !Ie.tool_use_id) continue;
      let Me = Ae.remoteSourced === !0 || L.has(Ie.tool_use_id),
        We = n?.applyLinks !== !1;
      if (w.has(Ie.tool_use_id)) {
        let lt = Ie.is_error === !0 ? null : deletedSlugFromResult(Ae.toolUseResult);
        if (lt !== null && w.get(Ie.tool_use_id) === lt) {
          for (let [Je, nt] of Object.entries(G))
            if (nt.mcpPublished === !0 && uuidSlugFromUrl(nt.url) === lt) delete G[Je];
        }
        continue;
      }
      if (S.has(Ie.tool_use_id)) {
        let lt = Me || Ie.is_error === !0 ? null : publishedArtifactFromResult(Ae.toolUseResult);
        if (lt !== null)
          recordOpenedArtifact(G, artifactViewerUrlFor(lt), lt.title ?? null, Ae.timestamp, {
            mcpPublished: !0,
          });
        continue;
      }
      let ze = r.has(Ie.tool_use_id);
      if (ze) {
        let lt = Ie.is_error === !0 ? slugFromToolResultText(Ie.content) : null,
          Je = deletedArtifactSlug(Ae.toolUseResult),
          nt = lt ?? Je?.slug ?? null;
        if (nt !== null)
          forgetArtifactSlug(nt, {
            frameUrls: G,
            artifactReadVersions: q,
            target: ke,
            createdFromType: Z,
            pathPins: Se,
            applyLinks: We,
          });
        if (nt !== null || Je !== void 0) continue;
        if (!Me)
          (summarizeArtifactInput(Ae.toolUseResult, Ae.timestamp, G, q, ke, Z, We),
            collectPathPins(Ae.toolUseResult, s.get(Ie.tool_use_id), Se));
      }
      if (ze || h.has(Ie.tool_use_id)) applyArtifactReadResult(Ae.toolUseResult, q, ke, Me);
      else if (!Me && y.has(Ie.tool_use_id)) applyArtifactReadVersion(Ae.toolUseResult, q);
    }
  }
  if (Ee !== void 0) applyCompactCarry(Ee, we, q);
  return {
    frameUrls: G,
    artifactReadVersions: q,
    artifactRefs: ke.refs(),
    createdFromType: Z,
    pathPins: Se,
    carry: we,
  };
}
//@ chunk-e6aww6q8.js:1864551-1864639 placement
var FJo = /^(?:<tool_use_error>)?(?:Error: )?/,
  regExp_11 = new RegExp(`^<${ARTIFACT_DELETED_NOTE_TAG} url="([^"]+)"/>`);
//@ chunk-e6aww6q8.js:1864639-1864878 placement
function slugFromToolResultText(e) {
  let n =
      typeof e === "string"
        ? e
        : Array.isArray(e)
          ? e.map((h) =>
              typeof h === "object" && h !== null && "text" in h && typeof h.text === "string" ? h.text : "",
            ).join(`
`)
          : "",
    r = vkt(n.replace(FJo, "")),
    s = regExp_11.exec(r)?.[1];
  return s !== void 0 ? uuidSlugFromUrl(s) : null;
}
//@ chunk-e6aww6q8.js:1864878-1865367 placement = hasSuccessfulToolCall (0.854)
function hasSuccessfulToolCall_3(e) {
  let n = new Map();
  for (let s of e) {
    if (s.type !== "assistant" || !Array.isArray(s.message.content)) continue;
    for (let h of s.message.content) {
      if (h.type !== "tool_use") continue;
      let y = mcpInfoFromString(h.name)?.serverName;
      if (y !== void 0) n.set(h.id, y);
    }
  }
  let r = new Set();
  for (let s of e) {
    if (s.type !== "user" || !Array.isArray(s.message.content)) continue;
    for (let h of s.message.content) {
      if (h.type !== "tool_result" || h.is_error === !0 || !h.tool_use_id) continue;
      let y = n.get(h.tool_use_id);
      if (y !== void 0) r.add(y);
    }
  }
  return r;
}
//@ chunk-e6aww6q8.js:1865367-1865486 placement
function deletedArtifactSlug(e) {
  let n = e?.artifact_delete;
  if (n === void 0) return;
  let r = n?.url;
  return { slug: typeof r === "string" ? uuidSlugFromUrl(r) : null };
}
/**
 * 恢复时某个 Artifact 已被删除：从 frameUrls（可选解除路径链接）、createdFromType、读版本、路径 pin 与目标顺序中移除该 slug。
 */
//@ chunk-e6aww6q8.js:1865486-1865799 placement
function forgetArtifactSlug(e, n) {
  for (let [r, s] of Object.entries(n.frameUrls))
    if (uuidSlugFromUrl(s.url) === e) {
      if ((delete n.frameUrls[r], n.applyLinks && !r.includes("\x00"))) unlinkPath(expandPath(r));
    }
  for (let [r, s] of Object.entries(n.createdFromType)) if (s.slug === e) delete n.createdFromType[r];
  (delete n.artifactReadVersions[e], n.pathPins.delete(e), n.target.forget(e));
}
/**
 * 解析转录中的"已附加 Artifact"注记，把对应 slug 记为 ATTACHED 行写入 frameUrls（替换会话外的旧行，保留标题/图标），可选标记为当前目标。
 */
//@ chunk-e6aww6q8.js:1865799-1866223 placement
function applyAttachedNote(text, timestamp, frameUrls, targets) {
  let match = ARTIFACT_ATTACHED_NOTE_RE.exec(text);
  if (match === null) return;
  let [, y = "", S, w] = match,
    L = uuidSlugFromUrl(y);
  if (L === null) return;
  let G = S !== void 0 ? sanitizeDisplayTitle(ove(S)) : null,
    q = !1,
    Z;
  for (let [Se, ke] of Object.entries(frameUrls)) {
    if (uuidSlugFromUrl(ke.url) !== L) continue;
    if (rRe(Se)) ((Z = ke), delete frameUrls[Se]);
    else q = !0;
  }
  if (!q) {
    let Se = G ?? Z?.title;
    frameUrls[`${ATTACHED}${L}`] = {
      url: canonicalArtifactTargetFor(y, y),
      updatedAt: Date.parse(timestamp) || 0,
      ...(Se !== void 0 && { title: Se }),
      ...(Z?.favicon !== void 0 && { favicon: Z.favicon }),
    };
  }
  if (w !== void 0) targets.touch(L);
}
/**
 * 记录打开过的 Artifact：已有同 slug 行时只在 MCP 发布时刷新时间；否则写入 OPENED 行（标题、mcpPublished 标记）。
 */
//@ chunk-e6aww6q8.js:1866223-1866584 placement
function recordOpenedArtifact(frameUrls, url, title, timestamp, { mcpPublished: mcpPublished }) {
  let y = uuidSlugFromUrl(url);
  if (y === null) return;
  let S = Date.parse(timestamp) || 0,
    found = Zz(frameUrls).find(([, Z]) => uuidSlugFromUrl(Z.url) === y);
  if (found !== void 0) {
    if (mcpPublished) {
      let [Z, Se] = found;
      (delete frameUrls[Z], (frameUrls[Z] = { ...Se, updatedAt: S }));
    }
    return;
  }
  let L = `${OPENED}${y}`,
    G = frameUrls[L],
    q = title ?? G?.title;
  (delete frameUrls[L],
    (frameUrls[L] = {
      url: canonicalArtifactTargetFor(url, url),
      updatedAt: S,
      ...(q !== void 0 && { title: q }),
      ...((mcpPublished || G?.mcpPublished === !0) && { mcpPublished: !0 }),
    }));
}
/**
 * 为 Artifact 工具输入生成简短摘要。
 */
//@ chunk-e6aww6q8.js:1866584-1867884 placement
function summarizeArtifactInput(e, n, r, s, h, y, S) {
  let w = e;
  if (e?.created_from_type === !0) {
    let q = typeof w?.url === "string" ? uuidSlugFromUrl(w.url) : null,
      Z = e.type?.url,
      Se = typeof Z === "string" ? uuidSlugFromUrl(Z) : null;
    if (typeof w?.path !== "string") {
      if (q !== null && typeof w?.url === "string") {
        let ke = `${CREATED}${q}`,
          we = typeof w.title === "string" ? sanitizeArtifactTitle(w.title) : null;
        if (
          (delete r[ke],
          (r[ke] = {
            url: canonicalArtifactTargetFor(w.url, w.url),
            updatedAt: Date.parse(n) || 0,
            ...(we !== null && { title: we }),
          }),
          typeof w.version === "string")
        )
          rZ(s, q, w.version);
        h.touch(q);
      }
      return;
    }
    if (q !== null && Se !== null && !w.path.includes("\x00")) y[w.path] = { slug: q, typeSlug: Se };
  }
  let L = typeof w?.url === "string" ? uuidSlugFromUrl(w.url) : null;
  if (e?.opened === !0) {
    if (typeof w?.url === "string")
      recordOpenedArtifact(r, w.url, typeof w.title === "string" ? sanitizeDisplayTitle(w.title) : null, n, {
        mcpPublished: !1,
      });
    return;
  }
  if (typeof w?.url !== "string" || L === null || typeof w.path !== "string" || w.path.includes("\x00"))
    return;
  for (let [q, Z] of Object.entries(r))
    if (q !== w.path && uuidSlugFromUrl(Z.url) === L) {
      if ((delete r[q], S)) unlinkPath(expandPath(q));
    }
  if (S) linkPathToSlug(expandPath(w.path), L);
  delete r[w.path];
  let G = typeof w.title === "string" ? sanitizeArtifactTitle(w.title) : null;
  if (
    ((r[w.path] = {
      url: w.url,
      updatedAt: Date.parse(n) || 0,
      ...(G !== null && { title: G }),
      ...(w.capabilities != null && typeof w.capabilities === "object" && { capabilities: w.capabilities }),
      ...(e.routineUnasked === !0 && { routineUnasked: !0 }),
      ...(e.commentUnasked === !0 && { commentUnasked: !0 }),
    }),
    typeof w.version === "string")
  )
    rZ(s, L, w.version);
  h.touch(L);
}
//@ chunk-e6aww6q8.js:1867884-1867909 placement
var Jwe = /^[0-9a-f]{64}$/;
//@ chunk-e6aww6q8.js:1867909-1867984 placement
function w2(e) {
  return typeof e === "string" && e.length > 0 && !e.includes("\x00");
}
/**
 * 用发布结果里的 live 版本与 changed 列表更新路径 pin：sha 相同则清除 behind，不同则标记 behind（落后于线上）。
 */
//@ chunk-e6aww6q8.js:1867984-1868385 placement
function applyLiveChanges(e, n, r) {
  if (typeof e !== "object" || e === null) return;
  let { live: live, changed: changed } = e,
    y = typeof live === "string" && ARTIFACT_VERSION_SAFE_RE.test(live) ? live : n;
  for (let S of Array.isArray(changed) ? changed : []) {
    let { path: path, sha256: sha256 } = S ?? {};
    if (!w2(path) || !(sha256 === null || (typeof sha256 === "string" && Jwe.test(sha256)))) continue;
    let G = r.get(path);
    if (G === void 0) continue;
    if (G.sha256 === sha256) {
      let { behind: behind, ...Z } = G;
      r.set(path, Z);
    } else r.set(path, { ...G, behind: { sha256: sha256, sizeBytes: void 0, ver: y } });
  }
}
/**
 * 从 Artifact 工具结果中收集每个 slug 的文件路径 pin（路径 → sha256 / 版本 / 来源）：发布写入、删除、复制、合并，以及 read_file 读取。
 */
//@ chunk-e6aww6q8.js:1868385-1870279 placement
function collectPathPins(result, timestamp, pinsBySlug) {
  if (typeof result !== "object" || result === null) return;
  let s = (w) => {
      let L = pinsBySlug.get(w);
      if (L === void 0) ((L = new Map()), pinsBySlug.set(w, L));
      return L;
    },
    h = result;
  if (
    h.files_written !== void 0 ||
    h.files_removed !== void 0 ||
    h.copied !== void 0 ||
    h.merged_over !== void 0
  ) {
    let w = typeof h.url === "string" ? uuidSlugFromUrl(h.url) : null,
      version = h.version;
    if (w === null || typeof version !== "string" || !ARTIFACT_VERSION_SAFE_RE.test(version)) return;
    let G = s(w);
    for (let q of Array.isArray(h.files_written) ? h.files_written : []) {
      let { path: path, sha256: sha256 } = q ?? {};
      if (w2(path) && typeof sha256 === "string" && Jwe.test(sha256))
        G.set(path, { sha256: sha256, ver: version, via: "publish" });
    }
    for (let q of Array.isArray(h.files_removed) ? h.files_removed : [])
      if (w2(q)) G.set(q, { sha256: null, ver: version, via: "publish" });
    for (let q of Array.isArray(h.copied) ? h.copied : []) {
      let Z = q?.path;
      if (w2(Z)) G.delete(Z);
    }
    applyLiveChanges(h.merged_over, version, G);
    return;
  }
  if (typeof h.file_list === "object" && h.file_list !== null) {
    let { url: url, ver: ver, files: files } = h.file_list,
      q = typeof url === "string" ? uuidSlugFromUrl(url) : null;
    if (q === null || typeof ver !== "string" || !ARTIFACT_VERSION_SAFE_RE.test(ver) || !Array.isArray(files))
      return;
    let Z = s(q);
    for (let Se of files.slice(0, MAX_LISTED_FILES_SHOWN)) {
      let { path: path, sha256: sha256 } = Se ?? {};
      if (!w2(path) || typeof sha256 !== "string" || !Jwe.test(sha256)) continue;
      let Ee = Z.get(path);
      if (Ee === void 0 || (Ee.via === "list" && Ee.sha256 !== null))
        Z.set(path, { sha256: sha256, ver: ver, via: "list" });
    }
    return;
  }
  let y =
    typeof h.file_read === "object" && h.file_read !== null
      ? {
          slug:
            typeof h.file_read.url === "string"
              ? uuidSlugFromUrl(h.file_read.url)
              : timestamp !== void 0
                ? (parseArtifactUrlInput(timestamp)?.slug ?? null)
                : null,
          ver: h.file_read.ver,
          files: [h.file_read],
        }
      : typeof h.files_read === "object" && h.files_read !== null
        ? {
            slug: typeof h.files_read.url === "string" ? uuidSlugFromUrl(h.files_read.url) : null,
            ver: h.files_read.ver,
            files: Array.isArray(h.files_read.files) ? h.files_read.files : [],
          }
        : void 0;
  if (y === void 0 || y.slug === null || typeof y.ver !== "string" || !ARTIFACT_VERSION_SAFE_RE.test(y.ver))
    return;
  let S = s(y.slug);
  for (let file of y.files) {
    let { path: path, sha256: sha256, as_served: as_served, live: live } = file ?? {};
    if (!w2(path) || typeof sha256 !== "string" || live === !0) continue;
    if (as_served === !0 || !Jwe.test(sha256)) S.delete(path);
    else S.set(path, { sha256: sha256, ver: y.ver, via: "read" });
  }
}
/**
 * 回退/截断会话后重建 Artifact 状态：清空路径 pin，若可恢复则重新从剩余消息收集读版本与 pin，并保留原 pin 上的 behind 信息。
 */
//@ chunk-e6aww6q8.js:1870279-1870841 placement
function rebuildArtifactCarryAfterRewind(messages, seedEligible) {
  let r = new Set();
  for (let w of messages) if (w.type === "assistant" && w.message.id) r.add(w.message.id);
  (pruneRefusedPublishBodies(r), clearHandoverReadState());
  let s = getLiveState(),
    h = [];
  for (let [w, L] of s.pathPins) for (let [G, q] of L) if (q.behind !== void 0) h.push([w, G, q.behind]);
  if ((s.pathPins.clear(), !seedEligible)) return { artifactReadVersions: {}, artifactReadObservers: {} };
  let { artifactReadVersions: artifactReadVersions, pathPins: pathPins } = collectArtifactResumeCarry(
    messages,
    { applyLinks: !1 },
  );
  installPathPins(s, pathPins);
  for (let [w, L, G] of h) {
    let q = s.pathPins.get(w),
      Z = q?.get(L);
    if (q !== void 0 && Z !== void 0 && Z.sha256 !== G.sha256) q.set(L, { ...Z, behind: G });
  }
  return { artifactReadVersions: artifactReadVersions, artifactReadObservers: tnn(artifactReadVersions) };
}
//@ chunk-e6aww6q8.js:1870841-1870964 placement
function installPathPins(e, n) {
  for (let [r, s] of n) {
    let h = new Map();
    for (let [y, S] of s) h.set(y, { ...S, seq: ++e.pathPinSeq });
    e.pathPins.set(r, h);
  }
}
//@ chunk-e6aww6q8.js:1870964-1871046 placement
function tnn(e) {
  return Object.fromEntries(Object.keys(e).map((n) => [n, { main: "" }]));
}
//@ chunk-e6aww6q8.js:1871046-1871277 placement
function sameObservers(e, n) {
  let keys = Object.keys(e);
  return (
    keys.length === Object.keys(n).length &&
    keys.every((s) => {
      if (!(s in n)) return !1;
      let [h, y] = [e[s] ?? {}, n[s] ?? {}],
        keys = Object.keys(h);
      return keys.length === Object.keys(y).length && keys.every((w) => h[w] === y[w]);
    })
  );
}
//@ chunk-e6aww6q8.js:1871277-1871349 placement
function rZ(e, n, r) {
  if (!ARTIFACT_VERSION_SAFE_RE.test(r)) return !1;
  return (delete e[n], (e[n] = r), !0);
}
//@ chunk-e6aww6q8.js:1871349-1871624 placement
function restoreCompactReadVersions(e, n) {
  if (!Array.isArray(e)) return 0;
  for (let s of Object.keys(n)) delete n[s];
  let r = 0;
  for (let s of e.slice(0, R3e).reverse()) {
    let { slug: slug, ver: ver } = s ?? {};
    if (
      typeof slug === "string" &&
      uuidSlugFromUrl(`https://claude.ai/code/artifact/${slug}`) === slug &&
      typeof ver === "string" &&
      rZ(n, slug, ver)
    )
      r++;
  }
  return r;
}
//@ chunk-e6aww6q8.js:1871624-1871885 placement
function applyArtifactReadResult(e, n, r, s) {
  let h = e?.artifactRead;
  if (
    !h ||
    typeof h.slug !== "string" ||
    uuidSlugFromUrl(`https://claude.ai/code/artifact/${h.slug}`) !== h.slug
  )
    return;
  if (h.seeded !== !1) {
    if (typeof h.ver !== "string") delete n[h.slug];
    else if (!s) rZ(n, h.slug, h.ver);
  }
  if (s) return;
  r.touch(h.slug);
}
//@ chunk-e6aww6q8.js:1871885-1872058 placement
function applyArtifactReadVersion(e, n) {
  let r = e?.artifactRead;
  if (
    r &&
    typeof r.slug === "string" &&
    typeof r.ver === "string" &&
    uuidSlugFromUrl(`https://claude.ai/code/artifact/${r.slug}`) === r.slug
  )
    rZ(n, r.slug, r.ver);
}
/**
 * 把用户、助手和压缩边界消息标记为远程来源。
 */
//@ chunk-e6aww6q8.js:1872058-1872208 placement
function markRemoteSourced(e) {
  return e.map((n) =>
    n.type === "user" || n.type === "assistant" || (n.type === "system" && n.subtype === "compact_boundary")
      ? { ...n, remoteSourced: !0 }
      : n,
  );
}
/**
 * 空的 Artifact 恢复状态（frameUrls、读版本、引用、来源类型、路径 pin 都为空）。
 */
//@ chunk-e6aww6q8.js:1872208-1872320 placement
function emptyArtifactCarry() {
  return {
    frameUrls: {},
    artifactReadVersions: {},
    artifactRefs: [],
    createdFromType: {},
    pathPins: new Map(),
  };
}
/**
 * 恢复会话时收集要带过的 Artifact 状态：仅本地来源且允许时调用 collectArtifactResumeCarry 并记 artifact_resume_carry 埋点，否则返回空状态。
 */
//@ chunk-e6aww6q8.js:1872320-1872490 placement
function collectResumeArtifactCarry(e, n) {
  if (n.origin !== "local" || !n.seedEligible) return emptyArtifactCarry();
  let r = collectArtifactResumeCarry(e);
  if (n.reportCarry !== !1) logResumeCarry(r.carry, Object.keys(r.artifactReadVersions).length);
  return r;
}
/**
 * 把收集到的 Artifact 状态应用到新会话：重置会话状态、恢复 createdFromType 与路径 pin、保留路径链接，并合并 frameUrls / 读版本 / 观察者 / 目标引用到 AppState。
 */
//@ chunk-e6aww6q8.js:1872490-1873408 placement
function applyArtifactResumeCarry(setAppState, carry, options = {}) {
  let { continuesConversation: continuesConversation = !1, keepCloudRows: keepCloudRows = !1 } = options,
    { frameUrls: frameUrls, artifactReadVersions: artifactReadVersions, artifactRefs: artifactRefs } = carry;
  (runBundledSkillSessionResets(), resetForNewConversation({ continuesConversation: continuesConversation }));
  let L = getLiveState(),
    createdFromType = L.createdFromType;
  for (let [Z, Se] of Object.entries(carry.createdFromType)) createdFromType.set(Z, Se);
  if (!continuesConversation) installPathPins(L, carry.pathPins);
  if (!continuesConversation) clearRefusedPublishBodies();
  retainPathLinks(new Set(Object.keys(frameUrls).map((Z) => expandPath(Z))));
  let q = tnn(artifactReadVersions);
  setAppState((Z) => {
    let Se = keepCloudRows ? keepCloudOpenedRows(frameUrls, Z.frameUrls) : frameUrls,
      keys = Object.keys(Z.frameUrls),
      keys_2 = Object.keys(Se),
      keys_3 = Object.keys(artifactReadVersions),
      Ae = Z.artifactReadVersions ?? {},
      Ie = Z.artifactRefs ?? [];
    if (
      keys.length === keys_2.length &&
      keys.every(
        (Me) => Z.frameUrls[Me]?.url === Se[Me]?.url && Z.frameUrls[Me]?.updatedAt === Se[Me]?.updatedAt,
      ) &&
      keys_3.length === Object.keys(Ae).length &&
      keys_3.every((Me) => Ae[Me] === artifactReadVersions[Me]) &&
      Ie.length === artifactRefs.length &&
      Ie.every((Me, We) => Me.slug === artifactRefs[We]?.slug && Me.pin === void 0) &&
      sameObservers(Z.artifactReadObservers ?? {}, q)
    )
      return Z;
    return {
      ...Z,
      frameUrls: Se,
      artifactReadVersions: artifactReadVersions,
      artifactReadObservers: q,
      artifactRefs: artifactRefs,
    };
  });
}
//@ chunk-e6aww6q8.js:1873408-1873574 placement
function keepCloudOpenedRows(e, n) {
  let filtered = Object.entries(n).filter(
    ([s, h]) => h.fromCloudSession === !0 && s.startsWith(OPENED) && !(s in e),
  );
  return filtered.length === 0 ? e : { ...e, ...Object.fromEntries(filtered) };
}

export {
  Zz,
  ATTACHED,
  applyArtifactResumeCarry,
  collectResumeArtifactCarry,
  rebuildArtifactCarryAfterRewind,
  OPENED,
  rRe,
  Qet,
  markRemoteSourced,
  frameUrlRowsToPersist,
  frameUrlToRecord,
  CREATED,
  hasSuccessfulToolCall_3,
  stampPreCompactReadVersions,
  emptyArtifactCarry,
};
