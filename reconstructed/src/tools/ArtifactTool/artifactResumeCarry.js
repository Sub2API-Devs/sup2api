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
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { artifactViewerUrlFor, canonicalArtifactTargetFor, sanitizeArtifactTitle } from "./artifactUrls.js";
import { stripRejectBreakerNotice } from "../../services/artifacts/rejectBreaker.js";
import { unlinkPath, linkPathToSlug, retainPathLinks } from "../../services/artifacts/shareEntries.js";
import { expandPath } from "../../utils/path.js";
import { sanitizeDisplayTitle } from "../../utils/textNormalize.js";
import { unescapeBasicHtmlEntities } from "../../utils/confusables.js";
import { runBundledSkillSessionResets } from "../../skills/bundledSkills.js";

//@ chunk-e6aww6q8.js:1860017-1860052 placement
var ATTACHED = "attached:";
var CREATED = "created:";
//@ chunk-e6aww6q8.js:1860052-1860100 placement
/**
 * 判断 frameUrl 键是否属于「created:」前缀。
 */
function isCreatedFrameUrl(e) {
  return e.startsWith("created:");
}
//@ chunk-e6aww6q8.js:1860100-1860117 placement
var OPENED = "opened:";
//@ chunk-e6aww6q8.js:1860117-1860210 placement
/**
 * 判断 frameUrl 键是否属于 attached/created/opened 之一。
 */
function isPersistableFrameUrl(e) {
  return e.startsWith("attached:") || e.startsWith("created:") || e.startsWith(OPENED);
}
//@ chunk-e6aww6q8.js:1860210-1860283 placement
/**
 * 去掉 opened 前缀后的 frameUrl 条目。
 */
function nonOpenedFrameUrls(frameUrls) {
  return Object.entries(frameUrls).filter(([key]) => !key.startsWith(OPENED));
}
//@ chunk-e6aww6q8.js:1860283-1860410 placement
/**
 * 选出需要持久化的 frameUrls 行：在恢复保留集合中的，或本会话经 MCP 发布的。
 */
function frameUrlRowsToPersist(e) {
  let n = new Set(nonOpenedFrameUrls(e).map(([r]) => r));
  return Object.entries(e).filter(([key, value]) => n.has(key) || value.mcpPublishedHere === true);
}
//@ chunk-e6aww6q8.js:1860410-1860536 placement
/**
 * 把 frameUrl 行转换成持久化记录（url、标题、图标、类型 frame、更新时间）。
 */
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
var MAX_CARRIED_READ_VERSIONS = 256;
//@ chunk-e6aww6q8.js:1860548-1860838 placement
/**
 * 收集压缩前需要保留的 Artifact 读版本：主线程观察过、且尚未作为同版本未注入的读取送达的 slug（最近的在前，最多 R3e 个）。
 */
function unconsumedReadVersions(e) {
  let artifactReadVersions = e.artifactReadVersions;
  if (artifactReadVersions === undefined) return;
  let { readDeliveries } = getLiveState();
  let s = [];
  for (let [key, value] of Object.entries(artifactReadVersions)) {
    let S = readDeliveries.get(replicaKey(undefined, key));
    let w = S !== undefined && S.ver === value && !S.sourced;
    if (hasMainKey(e.artifactReadObservers?.[key]) && !w)
      s.push({
        slug: key,
        ver: value,
      });
  }
  return s.reverse().slice(0, MAX_CARRIED_READ_VERSIONS);
}
//@ chunk-e6aww6q8.js:1860838-1860964 placement
/**
 * 压缩时（可恢复的情况下）把尚未送达的 Artifact 读版本写入压缩元数据。
 */
function stampPreCompactReadVersions(boundaryMarker, agentId, appState) {
  if (agentId !== undefined || !isResumeFrameSeedEligible()) return;
  let s = unconsumedReadVersions(appState);
  if (s !== undefined) boundaryMarker.compactMetadata.preCompactArtifactReadVersions = s;
}
//@ chunk-e6aww6q8.js:1860964-1861106 placement
function logResumeCarry(carry, held) {
  if (carry.boundaries === 0) return;
  logFeatureOk("artifact_resume_carry", {
    boundaries: carry.boundaries,
    carried: carry.versions,
    dropped: carry.dropped,
    held,
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
    return this.order.map((slug) => ({
      slug,
    }));
  }
}
//@ chunk-e6aww6q8.js:1861280-1861358 placement
/**
 * 取出数组里的字符串项，非数组返回空数组。
 */
function stringArrayOrEmpty(e) {
  return Array.isArray(e) ? e.filter((n) => typeof n === "string") : [];
}
//@ chunk-e6aww6q8.js:1861358-1861521 placement
function applyCompactCarry(e, n, r) {
  if (e.summarySeen && (e.lastKept === undefined || e.lastKeptSeen) && !e.foreign)
    n.versions = restoreCompactReadVersions(e.versions, r);
  else if (Array.isArray(e.versions)) n.dropped++;
}
//@ chunk-e6aww6q8.js:1861521-1864551 placement
/**
 * 恢复会话时收集需要带过的 Artifact 状态（最近的发布、读取等）。
 */
function collectArtifactResumeCarry(e, n) {
  let r = new Set();
  let s = new Map();
  let h = new Set();
  let y = new Set();
  let S = new Set();
  let w = new Map();
  let L = new Set();
  for (let Ae of e) {
    if (Ae.type !== "assistant" || !Array.isArray(Ae.message.content)) continue;
    for (let Ie of Ae.message.content)
      if (Ie.type === "tool_use") {
        if (Ae.remoteSourced === true) L.add(Ie.id);
        if (Ie.name === ARTIFACT_TOOL_NAME_2) {
          r.add(Ie.id);
          let url = Ie.input?.url;
          if (typeof url === "string") s.set(Ie.id, url);
        } else if (Ie.name === WEBFETCH) h.add(Ie.id);
        else if (Ie.name === FILE_READ_TOOL_NAME) y.add(Ie.id);
        else {
          let Me = mcpInfoFromString(Ie.name);
          if (Me?.serverName === CLAUDE_ARTIFACTS && Me.toolName !== undefined) {
            if (ARTIFACT_ACTIONS.has(Me.toolName)) S.add(Ie.id);
            else if (Me.toolName === DELETE_ARTIFACT)
              w.set(Ie.id, isPlainObject_5(Ie.input) ? Ie.input.slug : undefined);
          }
        }
      }
  }
  let frameUrls = {};
  let q = {};
  let Z = {};
  let pinsBySlug = new Map();
  let targets = new ArtifactTargetOrder();
  let we = {
    boundaries: 0,
    versions: 0,
    dropped: 0,
  };
  let Ee;
  for (let Ae of e) {
    if (Ae.type === "system" && Ae.subtype === "compact_boundary") {
      if (Ee?.preserved.has(Ae.uuid)) {
        if (Ae.uuid === Ee.lastKept) Ee.lastKeptSeen = true;
        continue;
      }
      if (Ee !== undefined) {
        applyCompactCarry(Ee, we, q);
        Ee = undefined;
      }
      if (Ae.remoteSourced !== true) {
        we.boundaries++;
        let preservedMessages = Ae.compactMetadata?.preservedMessages;
        Ee = {
          versions: Ae.compactMetadata?.preCompactArtifactReadVersions,
          preserved: new Set([
            ...stringArrayOrEmpty(preservedMessages?.allUuids),
            ...stringArrayOrEmpty(preservedMessages?.uuids),
          ]),
          lastKept: stringArrayOrEmpty(preservedMessages?.uuids).at(-1),
          lastKeptSeen: false,
          summarySeen: false,
          foreign: false,
        };
      }
      continue;
    }
    if (Ee !== undefined) {
      if (Ee.preserved.has(Ae.uuid)) {
        if (Ae.uuid === Ee.lastKept) Ee.lastKeptSeen = true;
      } else if (Ae.type === "user" && Ae.isCompactSummary === true) {
        Ee.summarySeen = true;
        Ee.foreign = Ae.remoteSourced === true;
      } else if (Ae.type === "user" || Ae.type === "assistant") {
        applyCompactCarry(Ee, we, q);
        Ee = undefined;
      }
    }
    if (Ae.type !== "user") continue;
    if (Ae.isMeta === true && typeof Ae.message.content === "string") {
      let Ie = ARTIFACT_DELETED_NOTE_RE.exec(Ae.message.content)?.[1];
      let Me = Ie !== undefined ? uuidSlugFromUrl(Ie) : null;
      if (Me !== null)
        forgetArtifactSlug(Me, {
          frameUrls,
          artifactReadVersions: q,
          target: targets,
          createdFromType: Z,
          pathPins: pinsBySlug,
          applyLinks: n?.applyLinks !== false,
        });
      else if (Ae.remoteSourced !== true)
        applyAttachedNote(Ae.message.content, Ae.timestamp, frameUrls, targets);
      continue;
    }
    if (!Array.isArray(Ae.message.content)) continue;
    for (let Ie of Ae.message.content) {
      if (Ie.type !== "tool_result" || !Ie.tool_use_id) continue;
      let Me = Ae.remoteSourced === true || L.has(Ie.tool_use_id);
      let We = n?.applyLinks !== false;
      if (w.has(Ie.tool_use_id)) {
        let lt = Ie.is_error === true ? null : deletedSlugFromResult(Ae.toolUseResult);
        if (lt !== null && w.get(Ie.tool_use_id) === lt) {
          for (let [key, value] of Object.entries(frameUrls))
            if (value.mcpPublished === true && uuidSlugFromUrl(value.url) === lt) delete frameUrls[key];
        }
        continue;
      }
      if (S.has(Ie.tool_use_id)) {
        let lt = Me || Ie.is_error === true ? null : publishedArtifactFromResult(Ae.toolUseResult);
        if (lt !== null)
          recordOpenedArtifact(frameUrls, artifactViewerUrlFor(lt), lt.title ?? null, Ae.timestamp, {
            mcpPublished: true,
          });
        continue;
      }
      let ze = r.has(Ie.tool_use_id);
      if (ze) {
        let lt = Ie.is_error === true ? slugFromToolResultText(Ie.content) : null;
        let Je = deletedArtifactSlug(Ae.toolUseResult);
        let nt = lt ?? Je?.slug ?? null;
        if (nt !== null)
          forgetArtifactSlug(nt, {
            frameUrls,
            artifactReadVersions: q,
            target: targets,
            createdFromType: Z,
            pathPins: pinsBySlug,
            applyLinks: We,
          });
        if (nt !== null || Je !== undefined) continue;
        if (!Me) {
          summarizeArtifactInput(Ae.toolUseResult, Ae.timestamp, frameUrls, q, targets, Z, We);
          collectPathPins(Ae.toolUseResult, s.get(Ie.tool_use_id), pinsBySlug);
        }
      }
      if (ze || h.has(Ie.tool_use_id)) applyArtifactReadResult(Ae.toolUseResult, q, targets, Me);
      else if (!Me && y.has(Ie.tool_use_id)) applyArtifactReadVersion(Ae.toolUseResult, q);
    }
  }
  if (Ee !== undefined) applyCompactCarry(Ee, we, q);
  return {
    frameUrls,
    artifactReadVersions: q,
    artifactRefs: targets.refs(),
    createdFromType: Z,
    pathPins: pinsBySlug,
    carry: we,
  };
}
//@ chunk-e6aww6q8.js:1864551-1864639 placement
var TOOL_ERROR_PREFIX_REGEX = /^(?:<tool_use_error>)?(?:Error: )?/;
var regExp_11 = new RegExp(`^<${ARTIFACT_DELETED_NOTE_TAG} url="([^"]+)"/>`);
//@ chunk-e6aww6q8.js:1864639-1864878 placement
function slugFromToolResultText(content) {
  let n =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content.map((h) =>
            typeof h === "object" && h !== null && "text" in h && typeof h.text === "string" ? h.text : "",
          ).join(`
`)
        : "";
  let r = stripRejectBreakerNotice(n.replace(TOOL_ERROR_PREFIX_REGEX, ""));
  let s = regExp_11.exec(r)?.[1];
  return s !== undefined ? uuidSlugFromUrl(s) : null;
}
//@ chunk-e6aww6q8.js:1864878-1865367 placement = hasSuccessfulToolCall (0.854)
function hasSuccessfulToolCall_3(messages) {
  let n = new Map();
  for (let message of messages) {
    if (message.type !== "assistant" || !Array.isArray(message.message.content)) continue;
    for (let h of message.message.content) {
      if (h.type !== "tool_use") continue;
      let serverName = mcpInfoFromString(h.name)?.serverName;
      if (serverName !== undefined) n.set(h.id, serverName);
    }
  }
  let r = new Set();
  for (let msg of messages) {
    if (msg.type !== "user" || !Array.isArray(msg.message.content)) continue;
    for (let h of msg.message.content) {
      if (h.type !== "tool_result" || h.is_error === true || !h.tool_use_id) continue;
      let y = n.get(h.tool_use_id);
      if (y !== undefined) r.add(y);
    }
  }
  return r;
}
//@ chunk-e6aww6q8.js:1865367-1865486 placement
function deletedArtifactSlug(toolUseResult) {
  let artifactDelete = toolUseResult?.artifact_delete;
  if (artifactDelete === undefined) return;
  let url = artifactDelete?.url;
  return {
    slug: typeof url === "string" ? uuidSlugFromUrl(url) : null,
  };
}
//@ chunk-e6aww6q8.js:1865486-1865799 placement
/**
 * 恢复时某个 Artifact 已被删除：从 frameUrls（可选解除路径链接）、createdFromType、读版本、路径 pin 与目标顺序中移除该 slug。
 */
function forgetArtifactSlug(e, n) {
  for (let [key, value] of Object.entries(n.frameUrls))
    if (uuidSlugFromUrl(value.url) === e) {
      delete n.frameUrls[key];
      if (n.applyLinks && !key.includes("\x00")) unlinkPath(expandPath(key));
    }
  for (let [key, value] of Object.entries(n.createdFromType))
    if (value.slug === e) delete n.createdFromType[key];
  delete n.artifactReadVersions[e];
  n.pathPins.delete(e);
  n.target.forget(e);
}
//@ chunk-e6aww6q8.js:1865799-1866223 placement
/**
 * 解析转录中的"已附加 Artifact"注记，把对应 slug 记为 ATTACHED 行写入 frameUrls（替换会话外的旧行，保留标题/图标），可选标记为当前目标。
 */
function applyAttachedNote(text, timestamp, frameUrls, targets) {
  let match = ARTIFACT_ATTACHED_NOTE_RE.exec(text);
  if (match === null) return;
  let [, y = "", S, w] = match;
  let L = uuidSlugFromUrl(y);
  if (L === null) return;
  let G = S !== undefined ? sanitizeDisplayTitle(unescapeBasicHtmlEntities(S)) : null;
  let q = false;
  let Z;
  for (let [key, value] of Object.entries(frameUrls)) {
    if (uuidSlugFromUrl(value.url) !== L) continue;
    if (isPersistableFrameUrl(key)) {
      Z = value;
      delete frameUrls[key];
    } else q = true;
  }
  if (!q) {
    let Se = G ?? Z?.title;
    frameUrls[`${ATTACHED}${L}`] = {
      url: canonicalArtifactTargetFor(y, y),
      updatedAt: Date.parse(timestamp) || 0,
      ...(Se !== undefined && {
        title: Se,
      }),
      ...(Z?.favicon !== undefined && {
        favicon: Z.favicon,
      }),
    };
  }
  if (w !== undefined) targets.touch(L);
}
//@ chunk-e6aww6q8.js:1866223-1866584 placement
/**
 * 记录打开过的 Artifact：已有同 slug 行时只在 MCP 发布时刷新时间；否则写入 OPENED 行（标题、mcpPublished 标记）。
 */
function recordOpenedArtifact(frameUrls, url, title, timestamp, { mcpPublished }) {
  let y = uuidSlugFromUrl(url);
  if (y === null) return;
  let updatedAt = Date.parse(timestamp) || 0;
  let found = nonOpenedFrameUrls(frameUrls).find(([, Z]) => uuidSlugFromUrl(Z.url) === y);
  if (found !== undefined) {
    if (mcpPublished) {
      let [Z, Se] = found;
      delete frameUrls[Z];
      frameUrls[Z] = {
        ...Se,
        updatedAt,
      };
    }
    return;
  }
  let L = `${OPENED}${y}`;
  let G = frameUrls[L];
  let q = title ?? G?.title;
  delete frameUrls[L];
  frameUrls[L] = {
    url: canonicalArtifactTargetFor(url, url),
    updatedAt,
    ...(q !== undefined && {
      title: q,
    }),
    ...((mcpPublished || G?.mcpPublished === true) && {
      mcpPublished: true,
    }),
  };
}
//@ chunk-e6aww6q8.js:1866584-1867884 placement
/**
 * 为 Artifact 工具输入生成简短摘要。
 */
function summarizeArtifactInput(toolUseResult, timestamp, frameUrls, s, h, y, S) {
  let w = toolUseResult;
  if (toolUseResult?.created_from_type === true) {
    let q = typeof w?.url === "string" ? uuidSlugFromUrl(w.url) : null;
    let url = toolUseResult.type?.url;
    let Se = typeof url === "string" ? uuidSlugFromUrl(url) : null;
    if (typeof w?.path !== "string") {
      if (q !== null && typeof w?.url === "string") {
        let ke = `${CREATED}${q}`;
        let we = typeof w.title === "string" ? sanitizeArtifactTitle(w.title) : null;
        delete frameUrls[ke];
        frameUrls[ke] = {
          url: canonicalArtifactTargetFor(w.url, w.url),
          updatedAt: Date.parse(timestamp) || 0,
          ...(we !== null && {
            title: we,
          }),
        };
        if (typeof w.version === "string") setReadVersion(s, q, w.version);
        h.touch(q);
      }
      return;
    }
    if (q !== null && Se !== null && !w.path.includes("\x00"))
      y[w.path] = {
        slug: q,
        typeSlug: Se,
      };
  }
  let L = typeof w?.url === "string" ? uuidSlugFromUrl(w.url) : null;
  if (toolUseResult?.opened === true) {
    if (typeof w?.url === "string")
      recordOpenedArtifact(
        frameUrls,
        w.url,
        typeof w.title === "string" ? sanitizeDisplayTitle(w.title) : null,
        timestamp,
        {
          mcpPublished: false,
        },
      );
    return;
  }
  if (typeof w?.url !== "string" || L === null || typeof w.path !== "string" || w.path.includes("\x00"))
    return;
  for (let [key, value] of Object.entries(frameUrls))
    if (key !== w.path && uuidSlugFromUrl(value.url) === L) {
      delete frameUrls[key];
      if (S) unlinkPath(expandPath(key));
    }
  if (S) linkPathToSlug(expandPath(w.path), L);
  delete frameUrls[w.path];
  let G = typeof w.title === "string" ? sanitizeArtifactTitle(w.title) : null;
  frameUrls[w.path] = {
    url: w.url,
    updatedAt: Date.parse(timestamp) || 0,
    ...(G !== null && {
      title: G,
    }),
    ...(w.capabilities != null &&
      typeof w.capabilities === "object" && {
        capabilities: w.capabilities,
      }),
    ...(toolUseResult.routineUnasked === true && {
      routineUnasked: true,
    }),
    ...(toolUseResult.commentUnasked === true && {
      commentUnasked: true,
    }),
  };
  if (typeof w.version === "string") setReadVersion(s, L, w.version);
  h.touch(L);
}
//@ chunk-e6aww6q8.js:1867884-1867909 placement
var SHA256_HEX_REGEX = /^[0-9a-f]{64}$/;
//@ chunk-e6aww6q8.js:1867909-1867984 placement
/**
 * 判断是否为非空且不含 NUL 的字符串。
 */
function isNonEmptyPathString(path) {
  return typeof path === "string" && path.length > 0 && !path.includes("\x00");
}
//@ chunk-e6aww6q8.js:1867984-1868385 placement
/**
 * 用发布结果里的 live 版本与 changed 列表更新路径 pin：sha 相同则清除 behind，不同则标记 behind（落后于线上）。
 */
function applyLiveChanges(mergedOver, version, r) {
  if (typeof mergedOver !== "object" || mergedOver === null) return;
  let { live, changed } = mergedOver;
  let ver = typeof live === "string" && ARTIFACT_VERSION_SAFE_RE.test(live) ? live : version;
  for (let S of Array.isArray(changed) ? changed : []) {
    let { path, sha256 } = S ?? {};
    if (
      !isNonEmptyPathString(path) ||
      !(sha256 === null || (typeof sha256 === "string" && SHA256_HEX_REGEX.test(sha256)))
    )
      continue;
    let G = r.get(path);
    if (G === undefined) continue;
    if (G.sha256 === sha256) {
      let { behind, ...Z } = G;
      r.set(path, Z);
    } else
      r.set(path, {
        ...G,
        behind: {
          sha256,
          sizeBytes: undefined,
          ver,
        },
      });
  }
}
//@ chunk-e6aww6q8.js:1868385-1870279 placement
/**
 * 从 Artifact 工具结果中收集每个 slug 的文件路径 pin（路径 → sha256 / 版本 / 来源）：发布写入、删除、复制、合并，以及 read_file 读取。
 */
function collectPathPins(result, timestamp, pinsBySlug) {
  if (typeof result !== "object" || result === null) return;
  let s = (w) => {
    let L = pinsBySlug.get(w);
    if (L === undefined) {
      L = new Map();
      pinsBySlug.set(w, L);
    }
    return L;
  };
  let h = result;
  if (
    h.files_written !== undefined ||
    h.files_removed !== undefined ||
    h.copied !== undefined ||
    h.merged_over !== undefined
  ) {
    let w = typeof h.url === "string" ? uuidSlugFromUrl(h.url) : null;
    let version = h.version;
    if (w === null || typeof version !== "string" || !ARTIFACT_VERSION_SAFE_RE.test(version)) return;
    let G = s(w);
    for (let q of Array.isArray(h.files_written) ? h.files_written : []) {
      let { path, sha256 } = q ?? {};
      if (isNonEmptyPathString(path) && typeof sha256 === "string" && SHA256_HEX_REGEX.test(sha256))
        G.set(path, {
          sha256,
          ver: version,
          via: "publish",
        });
    }
    for (let q of Array.isArray(h.files_removed) ? h.files_removed : [])
      if (isNonEmptyPathString(q))
        G.set(q, {
          sha256: null,
          ver: version,
          via: "publish",
        });
    for (let q of Array.isArray(h.copied) ? h.copied : []) {
      let path = q?.path;
      if (isNonEmptyPathString(path)) G.delete(path);
    }
    applyLiveChanges(h.merged_over, version, G);
    return;
  }
  if (typeof h.file_list === "object" && h.file_list !== null) {
    let { url, ver, files } = h.file_list;
    let q = typeof url === "string" ? uuidSlugFromUrl(url) : null;
    if (q === null || typeof ver !== "string" || !ARTIFACT_VERSION_SAFE_RE.test(ver) || !Array.isArray(files))
      return;
    let Z = s(q);
    for (let file of files.slice(0, MAX_LISTED_FILES_SHOWN)) {
      let { path, sha256 } = file ?? {};
      if (!isNonEmptyPathString(path) || typeof sha256 !== "string" || !SHA256_HEX_REGEX.test(sha256))
        continue;
      let Ee = Z.get(path);
      if (Ee === undefined || (Ee.via === "list" && Ee.sha256 !== null))
        Z.set(path, {
          sha256,
          ver,
          via: "list",
        });
    }
    return;
  }
  let y =
    typeof h.file_read === "object" && h.file_read !== null
      ? {
          slug:
            typeof h.file_read.url === "string"
              ? uuidSlugFromUrl(h.file_read.url)
              : timestamp !== undefined
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
        : undefined;
  if (
    y === undefined ||
    y.slug === null ||
    typeof y.ver !== "string" ||
    !ARTIFACT_VERSION_SAFE_RE.test(y.ver)
  )
    return;
  let S = s(y.slug);
  for (let file of y.files) {
    let { path, sha256, as_served: asServed, live } = file ?? {};
    if (!isNonEmptyPathString(path) || typeof sha256 !== "string" || live === true) continue;
    if (asServed === true || !SHA256_HEX_REGEX.test(sha256)) S.delete(path);
    else
      S.set(path, {
        sha256,
        ver: y.ver,
        via: "read",
      });
  }
}
//@ chunk-e6aww6q8.js:1870279-1870841 placement
/**
 * 回退/截断会话后重建 Artifact 状态：清空路径 pin，若可恢复则重新从剩余消息收集读版本与 pin，并保留原 pin 上的 behind 信息。
 */
function rebuildArtifactCarryAfterRewind(messages, seedEligible) {
  let r = new Set();
  for (let message of messages)
    if (message.type === "assistant" && message.message.id) r.add(message.message.id);
  pruneRefusedPublishBodies(r);
  clearHandoverReadState();
  let liveState = getLiveState();
  let h = [];
  for (let [w, L] of liveState.pathPins)
    for (let [G, q] of L) if (q.behind !== undefined) h.push([w, G, q.behind]);
  liveState.pathPins.clear();
  if (!seedEligible)
    return {
      artifactReadVersions: {},
      artifactReadObservers: {},
    };
  let { artifactReadVersions, pathPins } = collectArtifactResumeCarry(messages, {
    applyLinks: false,
  });
  installPathPins(liveState, pathPins);
  for (let [w, L, G] of h) {
    let q = liveState.pathPins.get(w);
    let Z = q?.get(L);
    if (q !== undefined && Z !== undefined && Z.sha256 !== G.sha256)
      q.set(L, {
        ...Z,
        behind: G,
      });
  }
  return {
    artifactReadVersions,
    artifactReadObservers: defaultObserverMap(artifactReadVersions),
  };
}
//@ chunk-e6aww6q8.js:1870841-1870964 placement
function installPathPins(liveState, pathPins) {
  for (let [r, s] of pathPins) {
    let h = new Map();
    for (let [y, S] of s)
      h.set(y, {
        ...S,
        seq: ++liveState.pathPinSeq,
      });
    liveState.pathPins.set(r, h);
  }
}
//@ chunk-e6aww6q8.js:1870964-1871046 placement
/**
 * 由路径键生成默认观察者映射。
 */
function defaultObserverMap(artifactReadVersions) {
  return Object.fromEntries(
    Object.keys(artifactReadVersions).map((key) => [
      key,
      {
        main: "",
      },
    ]),
  );
}
//@ chunk-e6aww6q8.js:1871046-1871277 placement
function sameObservers(e, n) {
  let keys = Object.keys(e);
  return (
    keys.length === Object.keys(n).length &&
    keys.every((s) => {
      if (!(s in n)) return false;
      let [h, y] = [e[s] ?? {}, n[s] ?? {}];
      let keys = Object.keys(h);
      return keys.length === Object.keys(y).length && keys.every((w) => h[w] === y[w]);
    })
  );
}
//@ chunk-e6aww6q8.js:1871277-1871349 placement
/**
 * 记录某 slug 的读取版本（先删除再追加，保持最近在后）。
 */
function setReadVersion(e, slug, r) {
  if (!ARTIFACT_VERSION_SAFE_RE.test(r)) return false;
  delete e[slug];
  e[slug] = r;
  return true;
}
//@ chunk-e6aww6q8.js:1871349-1871624 placement
function restoreCompactReadVersions(versions, n) {
  if (!Array.isArray(versions)) return 0;
  for (let key of Object.keys(n)) delete n[key];
  let r = 0;
  for (let s of versions.slice(0, MAX_CARRIED_READ_VERSIONS).reverse()) {
    let { slug, ver } = s ?? {};
    if (
      typeof slug === "string" &&
      uuidSlugFromUrl(`https://claude.ai/code/artifact/${slug}`) === slug &&
      typeof ver === "string" &&
      setReadVersion(n, slug, ver)
    )
      r++;
  }
  return r;
}
//@ chunk-e6aww6q8.js:1871624-1871885 placement
function applyArtifactReadResult(toolUseResult, n, r, s) {
  let artifactRead = toolUseResult?.artifactRead;
  if (
    !artifactRead ||
    typeof artifactRead.slug !== "string" ||
    uuidSlugFromUrl(`https://claude.ai/code/artifact/${artifactRead.slug}`) !== artifactRead.slug
  )
    return;
  if (artifactRead.seeded !== false) {
    if (typeof artifactRead.ver !== "string") delete n[artifactRead.slug];
    else if (!s) setReadVersion(n, artifactRead.slug, artifactRead.ver);
  }
  if (s) return;
  r.touch(artifactRead.slug);
}
//@ chunk-e6aww6q8.js:1871885-1872058 placement
function applyArtifactReadVersion(toolUseResult, n) {
  let artifactRead = toolUseResult?.artifactRead;
  if (
    artifactRead &&
    typeof artifactRead.slug === "string" &&
    typeof artifactRead.ver === "string" &&
    uuidSlugFromUrl(`https://claude.ai/code/artifact/${artifactRead.slug}`) === artifactRead.slug
  )
    setReadVersion(n, artifactRead.slug, artifactRead.ver);
}
//@ chunk-e6aww6q8.js:1872058-1872208 placement
/**
 * 把用户、助手和压缩边界消息标记为远程来源。
 */
function markRemoteSourced(e) {
  return e.map((n) =>
    n.type === "user" || n.type === "assistant" || (n.type === "system" && n.subtype === "compact_boundary")
      ? {
          ...n,
          remoteSourced: true,
        }
      : n,
  );
}
//@ chunk-e6aww6q8.js:1872208-1872320 placement
/**
 * 空的 Artifact 恢复状态（frameUrls、读版本、引用、来源类型、路径 pin 都为空）。
 */
function emptyArtifactCarry() {
  return {
    frameUrls: {},
    artifactReadVersions: {},
    artifactRefs: [],
    createdFromType: {},
    pathPins: new Map(),
  };
}
//@ chunk-e6aww6q8.js:1872320-1872490 placement
/**
 * 恢复会话时收集要带过的 Artifact 状态：仅本地来源且允许时调用 collectArtifactResumeCarry 并记 artifact_resume_carry 埋点，否则返回空状态。
 */
function collectResumeArtifactCarry(e, n) {
  if (n.origin !== "local" || !n.seedEligible) return emptyArtifactCarry();
  let artifactResumeCarry = collectArtifactResumeCarry(e);
  if (n.reportCarry !== false)
    logResumeCarry(artifactResumeCarry.carry, Object.keys(artifactResumeCarry.artifactReadVersions).length);
  return artifactResumeCarry;
}
//@ chunk-e6aww6q8.js:1872490-1873408 placement
/**
 * 把收集到的 Artifact 状态应用到新会话：重置会话状态、恢复 createdFromType 与路径 pin、保留路径链接，并合并 frameUrls / 读版本 / 观察者 / 目标引用到 AppState。
 */
function applyArtifactResumeCarry(setAppState, carry, options = {}) {
  let { continuesConversation = false, keepCloudRows = false } = options;
  let { frameUrls, artifactReadVersions, artifactRefs } = carry;
  runBundledSkillSessionResets();
  resetForNewConversation({
    continuesConversation,
  });
  let liveState = getLiveState();
  let createdFromType = liveState.createdFromType;
  for (let [key, value] of Object.entries(carry.createdFromType)) createdFromType.set(key, value);
  if (!continuesConversation) installPathPins(liveState, carry.pathPins);
  if (!continuesConversation) clearRefusedPublishBodies();
  retainPathLinks(new Set(Object.keys(frameUrls).map((key) => expandPath(key))));
  let q = defaultObserverMap(artifactReadVersions);
  setAppState((Z) => {
    let Se = keepCloudRows ? keepCloudOpenedRows(frameUrls, Z.frameUrls) : frameUrls;
    let keys = Object.keys(Z.frameUrls);
    let keys_2 = Object.keys(Se);
    let keys_3 = Object.keys(artifactReadVersions);
    let artifactReadVersions_2 = Z.artifactReadVersions ?? {};
    let artifactRefs_2 = Z.artifactRefs ?? [];
    if (
      keys.length === keys_2.length &&
      keys.every(
        (Me) => Z.frameUrls[Me]?.url === Se[Me]?.url && Z.frameUrls[Me]?.updatedAt === Se[Me]?.updatedAt,
      ) &&
      keys_3.length === Object.keys(artifactReadVersions_2).length &&
      keys_3.every((Me) => artifactReadVersions_2[Me] === artifactReadVersions[Me]) &&
      artifactRefs_2.length === artifactRefs.length &&
      artifactRefs_2.every(
        (artifactRef, We) => artifactRef.slug === artifactRefs[We]?.slug && artifactRef.pin === undefined,
      ) &&
      sameObservers(Z.artifactReadObservers ?? {}, q)
    )
      return Z;
    return {
      ...Z,
      frameUrls: Se,
      artifactReadVersions,
      artifactReadObservers: q,
      artifactRefs,
    };
  });
}
//@ chunk-e6aww6q8.js:1873408-1873574 placement
function keepCloudOpenedRows(frameUrls, frameUrls_2) {
  let filtered = Object.entries(frameUrls_2).filter(
    ([key, value]) => value.fromCloudSession === true && key.startsWith(OPENED) && !(key in frameUrls),
  );
  return filtered.length === 0
    ? frameUrls
    : {
        ...frameUrls,
        ...Object.fromEntries(filtered),
      };
}
export {
  nonOpenedFrameUrls,
  ATTACHED,
  applyArtifactResumeCarry,
  collectResumeArtifactCarry,
  rebuildArtifactCarryAfterRewind,
  OPENED,
  isPersistableFrameUrl,
  isCreatedFrameUrl,
  markRemoteSourced,
  frameUrlRowsToPersist,
  frameUrlToRecord,
  CREATED,
  hasSuccessfulToolCall_3,
  stampPreCompactReadVersions,
  emptyArtifactCarry,
};
