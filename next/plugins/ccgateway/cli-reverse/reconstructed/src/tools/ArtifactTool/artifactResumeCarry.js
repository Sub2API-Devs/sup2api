/**
 * tools/ArtifactTool/artifactResumeCarry.ts
 *
 * 2.1.316 新增：恢复会话时带过 Artifact 状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (40)
 * attribution: placement 40
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { READ } from "../FileReadTool/constants.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import { CLAUDE_ARTIFACTS } from "../../services/mcp/firstPartyServerIds.js";
import {
  ARTIFACT_ACTIONS,
  DELETE_ARTIFACT,
  deletedSlugFromResult,
  publishedArtifactFromResult,
} from "./actionNames.js";
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { artifactViewerUrlFor, canonicalArtifactTargetFor, sanitizeArtifactTitle } from "./artifactUrls.js";
import { stripRejectBreakerNotice } from "../../services/artifacts/rejectBreaker.js";
import { unlinkPath, linkPathToSlug, retainPathLinks } from "../../services/artifacts/shareEntries.js";
import { expandPath } from "../../utils/path.js";
import { sanitizeDisplayTitle } from "../../utils/textNormalize.js";
import { unescapeBasicHtmlEntities } from "../../utils/confusables.js";
import { runBundledSkillSessionResets } from "../../skills/bundledSkills.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1938778-1938813 placement
var ATTACHED = "attached:";
var CREATED = "created:";
//@ chunk-5xgkngpb.js:1938813-1938861 placement
/**
 * 判断 frameUrl 键是否属于「created:」前缀。
 */
function isCreatedFrameUrl(url) {
  return url.startsWith("created:");
}
//@ chunk-5xgkngpb.js:1938861-1938878 placement
var OPENED = "opened:";
//@ chunk-5xgkngpb.js:1938878-1938971 placement
/**
 * 判断 frameUrl 键是否属于 attached/created/opened 之一。
 */
function isPersistableFrameUrl(url) {
  return url.startsWith("attached:") || url.startsWith("created:") || url.startsWith(OPENED);
}
//@ chunk-5xgkngpb.js:1938971-1939044 placement
/**
 * 去掉 opened 前缀后的 frameUrl 条目。
 */
function nonOpenedFrameUrls(frameUrls) {
  return Object.entries(frameUrls).filter(([key]) => !key.startsWith(OPENED));
}
//@ chunk-5xgkngpb.js:1939044-1939171 placement
/**
 * 选出需要持久化的 frameUrls 行：在恢复保留集合中的，或本会话经 MCP 发布的。
 */
function frameUrlRowsToPersist(frameUrls) {
  let persistableKeys = new Set(nonOpenedFrameUrls(frameUrls).map(([key]) => key));
  return Object.entries(frameUrls).filter(
    ([key, value]) => persistableKeys.has(key) || value.mcpPublishedHere === true,
  );
}
//@ chunk-5xgkngpb.js:1939171-1939297 placement
/**
 * 把 frameUrl 行转换成持久化记录（url、标题、图标、类型 frame、更新时间）。
 */
function frameUrlToRecord(entry) {
  return {
    url: entry.url,
    title: entry.title,
    favicon: entry.favicon,
    kind: "frame",
    updated_at: new Date(entry.updatedAt).toISOString(),
  };
}
//@ chunk-5xgkngpb.js:1939297-1939309 placement
var MAX_CARRIED_READ_VERSIONS = 256;
//@ chunk-5xgkngpb.js:1939309-1939599 placement
/**
 * 收集压缩前需要保留的 Artifact 读版本：主线程观察过、且尚未作为同版本未注入的读取送达的 slug（最近的在前，最多 R3e 个）。
 */
function unconsumedReadVersions(appState) {
  let artifactReadVersions = appState.artifactReadVersions;
  if (artifactReadVersions === undefined) return;
  let { readDeliveries } = getLiveState();
  let result = [];
  for (let [key, value] of Object.entries(artifactReadVersions)) {
    let delivery = readDeliveries.get(replicaKey(undefined, key));
    let alreadyDelivered = delivery !== undefined && delivery.ver === value && !delivery.sourced;
    if (hasMainKey(appState.artifactReadObservers?.[key]) && !alreadyDelivered)
      result.push({
        slug: key,
        ver: value,
      });
  }
  return result.reverse().slice(0, MAX_CARRIED_READ_VERSIONS);
}
//@ chunk-5xgkngpb.js:1939599-1939726 placement
/**
 * 压缩时（可恢复的情况下）把尚未送达的 Artifact 读版本写入压缩元数据。
 */
function stampPreCompactReadVersions(boundaryMarker, agentId, appState) {
  if (agentId !== undefined || !isResumeFrameSeedEligible()) return;
  let versions = unconsumedReadVersions(appState);
  if (versions !== undefined) boundaryMarker.compactMetadata.preCompactArtifactReadVersions = versions;
}
//@ chunk-5xgkngpb.js:1939726-1939868 placement
function logResumeCarry(carry, held) {
  if (carry.boundaries === 0) return;
  logFeatureOk("artifact_resume_carry", {
    boundaries: carry.boundaries,
    carried: carry.versions,
    dropped: carry.dropped,
    held,
  });
}
//@ chunk-5xgkngpb.js:1939868-1940042 placement
class ArtifactTargetOrder {
  order = [];
  touch(slug) {
    this.order = [slug, ...this.order.filter((entry) => entry !== slug)];
  }
  forget(slug) {
    this.order = this.order.filter((entry) => entry !== slug);
  }
  refs() {
    return this.order.map((slug) => ({
      slug,
    }));
  }
}
//@ chunk-5xgkngpb.js:1940042-1940120 placement
/**
 * 取出数组里的字符串项，非数组返回空数组。
 */
function stringArrayOrEmpty(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
//@ chunk-5xgkngpb.js:1940120-1940283 placement
function applyCompactCarry(segment, stats, versions) {
  if (segment.summarySeen && (segment.lastKept === undefined || segment.lastKeptSeen) && !segment.foreign)
    stats.versions = restoreCompactReadVersions(segment.versions, versions);
  else if (Array.isArray(segment.versions)) stats.dropped++;
}
//@ chunk-5xgkngpb.js:1940283-1943318 placement
/**
 * 恢复会话时收集需要带过的 Artifact 状态（最近的发布、读取等）。
 */
function collectArtifactResumeCarry(messages, options) {
  let artifactToolUseIds = new Set();
  let urlByToolUseId = new Map();
  let webFetchIds = new Set();
  let fileReadIds = new Set();
  let mcpActionIds = new Set();
  let deleteSlugByToolUseId = new Map();
  let remoteIds = new Set();
  for (let message of messages) {
    if (message.type !== "assistant" || !Array.isArray(message.message.content)) continue;
    for (let block of message.message.content)
      if (block.type === "tool_use") {
        if (message.remoteSourced === true) remoteIds.add(block.id);
        if (block.name === ARTIFACT_TOOL_NAME_2) {
          artifactToolUseIds.add(block.id);
          let url = block.input?.url;
          if (typeof url === "string") urlByToolUseId.set(block.id, url);
        } else if (block.name === WEBFETCH) webFetchIds.add(block.id);
        else if (block.name === READ) fileReadIds.add(block.id);
        else {
          let mcpInfo = mcpInfoFromString(block.name);
          if (mcpInfo?.serverName === CLAUDE_ARTIFACTS && mcpInfo.toolName !== undefined) {
            if (ARTIFACT_ACTIONS.has(mcpInfo.toolName)) mcpActionIds.add(block.id);
            else if (mcpInfo.toolName === DELETE_ARTIFACT)
              deleteSlugByToolUseId.set(
                block.id,
                isPlainObject_6(block.input) ? block.input.slug : undefined,
              );
          }
        }
      }
  }
  let frameUrls = {};
  let readVersions = {};
  let createdFromType = {};
  let pinsBySlug = new Map();
  let targets = new ArtifactTargetOrder();
  let stats = {
    boundaries: 0,
    versions: 0,
    dropped: 0,
  };
  let compactSegment;
  for (let message of messages) {
    if (message.type === "system" && message.subtype === "compact_boundary") {
      if (compactSegment?.preserved.has(message.uuid)) {
        if (message.uuid === compactSegment.lastKept) compactSegment.lastKeptSeen = true;
        continue;
      }
      if (compactSegment !== undefined) {
        applyCompactCarry(compactSegment, stats, readVersions);
        compactSegment = undefined;
      }
      if (message.remoteSourced !== true) {
        stats.boundaries++;
        let preservedMessages = message.compactMetadata?.preservedMessages;
        compactSegment = {
          versions: message.compactMetadata?.preCompactArtifactReadVersions,
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
    if (compactSegment !== undefined) {
      if (compactSegment.preserved.has(message.uuid)) {
        if (message.uuid === compactSegment.lastKept) compactSegment.lastKeptSeen = true;
      } else if (message.type === "user" && message.isCompactSummary === true) {
        compactSegment.summarySeen = true;
        compactSegment.foreign = message.remoteSourced === true;
      } else if (message.type === "user" || message.type === "assistant") {
        applyCompactCarry(compactSegment, stats, readVersions);
        compactSegment = undefined;
      }
    }
    if (message.type !== "user") continue;
    if (message.isMeta === true && typeof message.message.content === "string") {
      let url = ARTIFACT_DELETED_NOTE_RE.exec(message.message.content)?.[1];
      let slug = url !== undefined ? uuidSlugFromUrl(url) : null;
      if (slug !== null)
        forgetArtifactSlug(slug, {
          frameUrls,
          artifactReadVersions: readVersions,
          target: targets,
          createdFromType,
          pathPins: pinsBySlug,
          applyLinks: options?.applyLinks !== false,
        });
      else if (message.remoteSourced !== true)
        applyAttachedNote(message.message.content, message.timestamp, frameUrls, targets);
      continue;
    }
    if (!Array.isArray(message.message.content)) continue;
    for (let block of message.message.content) {
      if (block.type !== "tool_result" || !block.tool_use_id) continue;
      let isRemote = message.remoteSourced === true || remoteIds.has(block.tool_use_id);
      let applyLinks = options?.applyLinks !== false;
      if (deleteSlugByToolUseId.has(block.tool_use_id)) {
        let deletedSlug = block.is_error === true ? null : deletedSlugFromResult(message.toolUseResult);
        if (deletedSlug !== null && deleteSlugByToolUseId.get(block.tool_use_id) === deletedSlug) {
          for (let [key, value] of Object.entries(frameUrls))
            if (value.mcpPublished === true && uuidSlugFromUrl(value.url) === deletedSlug)
              delete frameUrls[key];
        }
        continue;
      }
      if (mcpActionIds.has(block.tool_use_id)) {
        let published =
          isRemote || block.is_error === true ? null : publishedArtifactFromResult(message.toolUseResult);
        if (published !== null)
          recordOpenedArtifact(
            frameUrls,
            artifactViewerUrlFor(published),
            published.title ?? null,
            message.timestamp,
            {
              mcpPublished: true,
            },
          );
        continue;
      }
      let isArtifactCall = artifactToolUseIds.has(block.tool_use_id);
      if (isArtifactCall) {
        let textSlug = block.is_error === true ? slugFromToolResultText(block.content) : null;
        let deleted = deletedArtifactSlug(message.toolUseResult);
        let forgottenSlug = textSlug ?? deleted?.slug ?? null;
        if (forgottenSlug !== null)
          forgetArtifactSlug(forgottenSlug, {
            frameUrls,
            artifactReadVersions: readVersions,
            target: targets,
            createdFromType,
            pathPins: pinsBySlug,
            applyLinks,
          });
        if (forgottenSlug !== null || deleted !== undefined) continue;
        if (!isRemote) {
          summarizeArtifactInput(
            message.toolUseResult,
            message.timestamp,
            frameUrls,
            readVersions,
            targets,
            createdFromType,
            applyLinks,
          );
          collectPathPins(message.toolUseResult, urlByToolUseId.get(block.tool_use_id), pinsBySlug);
        }
      }
      if (isArtifactCall || webFetchIds.has(block.tool_use_id))
        applyArtifactReadResult(message.toolUseResult, readVersions, targets, isRemote);
      else if (!isRemote && fileReadIds.has(block.tool_use_id))
        applyArtifactReadVersion(message.toolUseResult, readVersions);
    }
  }
  if (compactSegment !== undefined) applyCompactCarry(compactSegment, stats, readVersions);
  return {
    frameUrls,
    artifactReadVersions: readVersions,
    artifactRefs: targets.refs(),
    createdFromType,
    pathPins: pinsBySlug,
    carry: stats,
  };
}
//@ chunk-5xgkngpb.js:1943318-1943406 placement
var TOOL_ERROR_PREFIX_REGEX; // deferred: uses ARTIFACT_DELETED_NOTE_TAG (./constants.js) of its import cycle while loading; runs once the cycle is complete
var regExp_12;
deferInit("chunk-5xgkngpb.js:1943318", () => {
  TOOL_ERROR_PREFIX_REGEX = /^(?:<tool_use_error>)?(?:Error: )?/;
  regExp_12 = new RegExp(`^<${ARTIFACT_DELETED_NOTE_TAG} url="([^"]+)"/>`);
});
//@ chunk-5xgkngpb.js:1943406-1943645 placement
function slugFromToolResultText(content) {
  let text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content.map((part) =>
            typeof part === "object" && part !== null && "text" in part && typeof part.text === "string"
              ? part.text
              : "",
          ).join(`
`)
        : "";
  let cleaned = stripRejectBreakerNotice(text.replace(TOOL_ERROR_PREFIX_REGEX, ""));
  let urlMatch = regExp_12.exec(cleaned)?.[1];
  return urlMatch !== undefined ? uuidSlugFromUrl(urlMatch) : null;
}
//@ chunk-5xgkngpb.js:1943645-1944134 placement (2.1.88 match: createToolResultStopMessage, 0.693)
function createToolResultStopMessage(messages) {
  let serverByToolUseId = new Map();
  for (let delegated of messages) {
    if (delegated.type !== "assistant" || !Array.isArray(delegated.message.content)) continue;
    for (let block of delegated.message.content) {
      if (block.type !== "tool_use") continue;
      let serverName = mcpInfoFromString(block.name)?.serverName;
      if (serverName !== undefined) serverByToolUseId.set(block.id, serverName);
    }
  }
  let servers = new Set();
  for (let msg of messages) {
    if (msg.type !== "user" || !Array.isArray(msg.message.content)) continue;
    for (let block of msg.message.content) {
      if (block.type !== "tool_result" || block.is_error === true || !block.tool_use_id) continue;
      let serverName = serverByToolUseId.get(block.tool_use_id);
      if (serverName !== undefined) servers.add(serverName);
    }
  }
  return servers;
}
//@ chunk-5xgkngpb.js:1944134-1944253 placement
function deletedArtifactSlug(toolUseResult) {
  let artifactDelete = toolUseResult?.artifact_delete;
  if (artifactDelete === undefined) return;
  let url = artifactDelete?.url;
  return {
    slug: typeof url === "string" ? uuidSlugFromUrl(url) : null,
  };
}
//@ chunk-5xgkngpb.js:1944253-1944566 placement
/**
 * 恢复时某个 Artifact 已被删除：从 frameUrls（可选解除路径链接）、createdFromType、读版本、路径 pin 与目标顺序中移除该 slug。
 */
function forgetArtifactSlug(slug, carry) {
  for (let [key, value] of Object.entries(carry.frameUrls))
    if (uuidSlugFromUrl(value.url) === slug) {
      delete carry.frameUrls[key];
      if (carry.applyLinks && !key.includes("\x00")) unlinkPath(expandPath(key));
    }
  for (let [key, value] of Object.entries(carry.createdFromType))
    if (value.slug === slug) delete carry.createdFromType[key];
  delete carry.artifactReadVersions[slug];
  carry.pathPins.delete(slug);
  carry.target.forget(slug);
}
//@ chunk-5xgkngpb.js:1944566-1944995 placement
/**
 * 解析转录中的"已附加 Artifact"注记，把对应 slug 记为 ATTACHED 行写入 frameUrls（替换会话外的旧行，保留标题/图标），可选标记为当前目标。
 */
function applyAttachedNote(text, timestamp, frameUrls, targets) {
  let match = ARTIFACT_ATTACHED_NOTE_RE.exec(text);
  if (match === null) return;
  let [, url = "", titleText, targetSlug] = match;
  let slug = uuidSlugFromUrl(url);
  if (slug === null) return;
  let title = titleText !== undefined ? sanitizeDisplayTitle(unescapeBasicHtmlEntities(titleText)) : null;
  let keptOtherKey = false;
  let removed;
  for (let [key, value] of Object.entries(frameUrls)) {
    if (uuidSlugFromUrl(value.url) !== slug) continue;
    if (isPersistableFrameUrl(key)) {
      removed = value;
      delete frameUrls[key];
    } else keptOtherKey = true;
  }
  if (!keptOtherKey) {
    let finalTitle = title ?? removed?.title;
    frameUrls[`${ATTACHED}${slug}`] = {
      url: canonicalArtifactTargetFor(url, url),
      updatedAt: Date.parse(timestamp) || 0,
      ...(finalTitle !== undefined && {
        title: finalTitle,
      }),
      ...(removed?.favicon !== undefined && {
        favicon: removed.favicon,
      }),
    };
  }
  if (targetSlug !== undefined) targets.touch(slug);
}
//@ chunk-5xgkngpb.js:1944995-1945361 placement
/**
 * 记录打开过的 Artifact：已有同 slug 行时只在 MCP 发布时刷新时间；否则写入 OPENED 行（标题、mcpPublished 标记）。
 */
function recordOpenedArtifact(frameUrls, url, title, timestamp, { mcpPublished }) {
  let slug = uuidSlugFromUrl(url);
  if (slug === null) return;
  let updatedAt = Date.parse(timestamp) || 0;
  let found = nonOpenedFrameUrls(frameUrls).find(([, entry]) => uuidSlugFromUrl(entry.url) === slug);
  if (found !== undefined) {
    if (mcpPublished) {
      let [existingKey, existing] = found;
      delete frameUrls[existingKey];
      frameUrls[existingKey] = {
        ...existing,
        updatedAt,
      };
    }
    return;
  }
  let openedKey = `${OPENED}${slug}`;
  let previous = frameUrls[openedKey];
  let resolvedTitle = title ?? previous?.title;
  delete frameUrls[openedKey];
  frameUrls[openedKey] = {
    url: canonicalArtifactTargetFor(url, url),
    updatedAt,
    ...(resolvedTitle !== undefined && {
      title: resolvedTitle,
    }),
    ...((mcpPublished || previous?.mcpPublished === true) && {
      mcpPublished: true,
    }),
  };
}
//@ chunk-5xgkngpb.js:1945361-1946668 placement
/**
 * 为 Artifact 工具输入生成简短摘要。
 */
function summarizeArtifactInput(
  toolUseResult,
  timestamp,
  frameUrls,
  readVersions,
  targets,
  createdFromType,
  applyLinks,
) {
  let result = toolUseResult;
  if (toolUseResult?.created_from_type === true) {
    let slug = typeof result?.url === "string" ? uuidSlugFromUrl(result.url) : null;
    let url = toolUseResult.type?.url;
    let typeSlug = typeof url === "string" ? uuidSlugFromUrl(url) : null;
    if (typeof result?.path !== "string") {
      if (slug !== null && typeof result?.url === "string") {
        let createdKey = `${CREATED}${slug}`;
        let title = typeof result.title === "string" ? sanitizeArtifactTitle(result.title) : null;
        delete frameUrls[createdKey];
        frameUrls[createdKey] = {
          url: canonicalArtifactTargetFor(result.url, result.url),
          updatedAt: Date.parse(timestamp) || 0,
          ...(title !== null && {
            title,
          }),
        };
        if (typeof result.version === "string") setReadVersion(readVersions, slug, result.version);
        targets.touch(slug);
      }
      return;
    }
    if (slug !== null && typeSlug !== null && !result.path.includes("\x00"))
      createdFromType[result.path] = {
        slug,
        typeSlug,
      };
  }
  let slug = typeof result?.url === "string" ? uuidSlugFromUrl(result.url) : null;
  if (toolUseResult?.opened === true) {
    if (typeof result?.url === "string")
      recordOpenedArtifact(
        frameUrls,
        result.url,
        typeof result.title === "string" ? sanitizeDisplayTitle(result.title) : null,
        timestamp,
        {
          mcpPublished: false,
        },
      );
    return;
  }
  if (
    typeof result?.url !== "string" ||
    slug === null ||
    typeof result.path !== "string" ||
    result.path.includes("\x00")
  )
    return;
  for (let [key, value] of Object.entries(frameUrls))
    if (key !== result.path && uuidSlugFromUrl(value.url) === slug) {
      delete frameUrls[key];
      if (applyLinks) unlinkPath(expandPath(key));
    }
  if (applyLinks) linkPathToSlug(expandPath(result.path), slug);
  delete frameUrls[result.path];
  let title = typeof result.title === "string" ? sanitizeArtifactTitle(result.title) : null;
  frameUrls[result.path] = {
    url: result.url,
    updatedAt: Date.parse(timestamp) || 0,
    ...(title !== null && {
      title,
    }),
    ...(result.capabilities != null &&
      typeof result.capabilities === "object" && {
        capabilities: result.capabilities,
      }),
    ...(toolUseResult.routineUnasked === true && {
      routineUnasked: true,
    }),
    ...(toolUseResult.commentUnasked === true && {
      commentUnasked: true,
    }),
  };
  if (typeof result.version === "string") setReadVersion(readVersions, slug, result.version);
  targets.touch(slug);
}
//@ chunk-5xgkngpb.js:1946668-1946693 placement
var SHA256_HEX_REGEX = /^[0-9a-f]{64}$/;
//@ chunk-5xgkngpb.js:1946693-1946768 placement
/**
 * 判断是否为非空且不含 NUL 的字符串。
 */
function isNonEmptyPathString(path) {
  return typeof path === "string" && path.length > 0 && !path.includes("\x00");
}
//@ chunk-5xgkngpb.js:1946768-1947171 placement
/**
 * 用发布结果里的 live 版本与 changed 列表更新路径 pin：sha 相同则清除 behind，不同则标记 behind（落后于线上）。
 */
function applyLiveChanges(mergedOver, version, pins) {
  if (typeof mergedOver !== "object" || mergedOver === null) return;
  let { live, changed } = mergedOver;
  let ver = typeof live === "string" && ARTIFACT_VERSION_SAFE_RE.test(live) ? live : version;
  for (let change of Array.isArray(changed) ? changed : []) {
    let { path, sha256 } = change ?? {};
    if (
      !isNonEmptyPathString(path) ||
      !(sha256 === null || (typeof sha256 === "string" && SHA256_HEX_REGEX.test(sha256)))
    )
      continue;
    let pin = pins.get(path);
    if (pin === undefined) continue;
    if (pin.sha256 === sha256) {
      let { behind, ...rest } = pin;
      pins.set(path, rest);
    } else
      pins.set(path, {
        ...pin,
        behind: {
          sha256,
          sizeBytes: undefined,
          ver,
        },
      });
  }
}
//@ chunk-5xgkngpb.js:1947171-1949076 placement
/**
 * 从 Artifact 工具结果中收集每个 slug 的文件路径 pin（路径 → sha256 / 版本 / 来源）：发布写入、删除、复制、合并，以及 read_file 读取。
 */
function collectPathPins(result, timestamp, pinsBySlug) {
  if (typeof result !== "object" || result === null) return;
  let pinsFor = (slug) => {
    let pins = pinsBySlug.get(slug);
    if (pins === undefined) {
      pins = new Map();
      pinsBySlug.set(slug, pins);
    }
    return pins;
  };
  let record = result;
  if (
    record.files_written !== undefined ||
    record.files_removed !== undefined ||
    record.copied !== undefined ||
    record.merged_over !== undefined
  ) {
    let slug = typeof record.url === "string" ? uuidSlugFromUrl(record.url) : null;
    let version = record.version;
    if (slug === null || typeof version !== "string" || !ARTIFACT_VERSION_SAFE_RE.test(version)) return;
    let pins = pinsFor(slug);
    for (let written of Array.isArray(record.files_written) ? record.files_written : []) {
      let { path, sha256 } = written ?? {};
      if (isNonEmptyPathString(path) && typeof sha256 === "string" && SHA256_HEX_REGEX.test(sha256))
        pins.set(path, {
          sha256,
          ver: version,
          via: "publish",
        });
    }
    for (let path of Array.isArray(record.files_removed) ? record.files_removed : [])
      if (isNonEmptyPathString(path))
        pins.set(path, {
          sha256: null,
          ver: version,
          via: "publish",
        });
    for (let copied of Array.isArray(record.copied) ? record.copied : []) {
      let path = copied?.path;
      if (isNonEmptyPathString(path)) pins.delete(path);
    }
    applyLiveChanges(record.merged_over, version, pins);
    return;
  }
  if (typeof record.file_list === "object" && record.file_list !== null) {
    let { url, ver, files } = record.file_list;
    let slug = typeof url === "string" ? uuidSlugFromUrl(url) : null;
    if (
      slug === null ||
      typeof ver !== "string" ||
      !ARTIFACT_VERSION_SAFE_RE.test(ver) ||
      !Array.isArray(files)
    )
      return;
    let pins = pinsFor(slug);
    for (let file of files.slice(0, MAX_LISTED_FILES_SHOWN)) {
      let { path, sha256 } = file ?? {};
      if (!isNonEmptyPathString(path) || typeof sha256 !== "string" || !SHA256_HEX_REGEX.test(sha256))
        continue;
      let existing = pins.get(path);
      if (existing === undefined || (existing.via === "list" && existing.sha256 !== null))
        pins.set(path, {
          sha256,
          ver,
          via: "list",
        });
    }
    return;
  }
  let readPin =
    typeof record.file_read === "object" && record.file_read !== null
      ? {
          slug:
            typeof record.file_read.url === "string"
              ? uuidSlugFromUrl(record.file_read.url)
              : timestamp !== undefined
                ? (parseArtifactUrlInput(timestamp)?.slug ?? null)
                : null,
          ver: record.file_read.ver,
          files: [record.file_read],
        }
      : typeof record.files_read === "object" && record.files_read !== null
        ? {
            slug: typeof record.files_read.url === "string" ? uuidSlugFromUrl(record.files_read.url) : null,
            ver: record.files_read.ver,
            files: Array.isArray(record.files_read.files) ? record.files_read.files : [],
          }
        : undefined;
  if (
    readPin === undefined ||
    readPin.slug === null ||
    typeof readPin.ver !== "string" ||
    !ARTIFACT_VERSION_SAFE_RE.test(readPin.ver)
  )
    return;
  let pins = pinsFor(readPin.slug);
  for (let file of readPin.files) {
    let { path, sha256, as_served: asServed, live } = file ?? {};
    if (!isNonEmptyPathString(path) || typeof sha256 !== "string" || live === true) continue;
    if (asServed === true || !SHA256_HEX_REGEX.test(sha256)) pins.delete(path);
    else
      pins.set(path, {
        sha256,
        ver: readPin.ver,
        via: "read",
      });
  }
}
//@ chunk-5xgkngpb.js:1949076-1949642 placement
/**
 * 回退/截断会话后重建 Artifact 状态：清空路径 pin，若可恢复则重新从剩余消息收集读版本与 pin，并保留原 pin 上的 behind 信息。
 */
function rebuildArtifactCarryAfterRewind(messages, seedEligible) {
  let messageIds = new Set();
  for (let message of messages)
    if (message.type === "assistant" && message.message.id) messageIds.add(message.message.id);
  pruneRefusedPublishBodies(messageIds);
  clearHandoverReadState();
  let liveState = getLiveState();
  let behindPins = [];
  for (let [slug, pins] of liveState.pathPins)
    for (let [path, pin] of pins) if (pin.behind !== undefined) behindPins.push([slug, path, pin.behind]);
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
  for (let [slug, path, behind] of behindPins) {
    let pins = liveState.pathPins.get(slug);
    let pin = pins?.get(path);
    if (pins !== undefined && pin !== undefined && pin.sha256 !== behind.sha256)
      pins.set(path, {
        ...pin,
        behind,
      });
  }
  return {
    artifactReadVersions,
    artifactReadObservers: defaultObserverMap(artifactReadVersions),
  };
}
//@ chunk-5xgkngpb.js:1949642-1949765 placement
function installPathPins(liveState, pathPins) {
  for (let [slug, pins] of pathPins) {
    let installed = new Map();
    for (let [path, pin] of pins)
      installed.set(path, {
        ...pin,
        seq: ++liveState.pathPinSeq,
      });
    liveState.pathPins.set(slug, installed);
  }
}
//@ chunk-5xgkngpb.js:1949765-1949847 placement
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
//@ chunk-5xgkngpb.js:1949847-1950078 placement
function sameObservers(left, right) {
  let keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every((slug) => {
      if (!(slug in right)) return false;
      let [leftObservers, rightObservers] = [left[slug] ?? {}, right[slug] ?? {}];
      let keys = Object.keys(leftObservers);
      return (
        keys.length === Object.keys(rightObservers).length &&
        keys.every((key) => leftObservers[key] === rightObservers[key])
      );
    })
  );
}
//@ chunk-5xgkngpb.js:1950078-1950151 placement
/**
 * 记录某 slug 的读取版本（先删除再追加，保持最近在后）。
 */
function setReadVersion(versions, slug, ver) {
  if (!ARTIFACT_VERSION_SAFE_RE.test(ver)) return false;
  delete versions[slug];
  versions[slug] = ver;
  return true;
}
//@ chunk-5xgkngpb.js:1950151-1950427 placement
function restoreCompactReadVersions(versions, targetVersions) {
  if (!Array.isArray(versions)) return 0;
  for (let key of Object.keys(targetVersions)) delete targetVersions[key];
  let count = 0;
  for (let entry of versions.slice(0, MAX_CARRIED_READ_VERSIONS).reverse()) {
    let { slug, ver } = entry ?? {};
    if (
      typeof slug === "string" &&
      uuidSlugFromUrl(`https://claude.ai/code/artifact/${slug}`) === slug &&
      typeof ver === "string" &&
      setReadVersion(targetVersions, slug, ver)
    )
      count++;
  }
  return count;
}
//@ chunk-5xgkngpb.js:1950427-1950689 placement
function applyArtifactReadResult(toolUseResult, versions, targets, isRemote) {
  let artifactRead = toolUseResult?.artifactRead;
  if (
    !artifactRead ||
    typeof artifactRead.slug !== "string" ||
    uuidSlugFromUrl(`https://claude.ai/code/artifact/${artifactRead.slug}`) !== artifactRead.slug
  )
    return;
  if (artifactRead.seeded !== false) {
    if (typeof artifactRead.ver !== "string") delete versions[artifactRead.slug];
    else if (!isRemote) setReadVersion(versions, artifactRead.slug, artifactRead.ver);
  }
  if (isRemote) return;
  targets.touch(artifactRead.slug);
}
//@ chunk-5xgkngpb.js:1950689-1950863 placement
function applyArtifactReadVersion(toolUseResult, versions) {
  let artifactRead = toolUseResult?.artifactRead;
  if (
    artifactRead &&
    typeof artifactRead.slug === "string" &&
    typeof artifactRead.ver === "string" &&
    uuidSlugFromUrl(`https://claude.ai/code/artifact/${artifactRead.slug}`) === artifactRead.slug
  )
    setReadVersion(versions, artifactRead.slug, artifactRead.ver);
}
//@ chunk-5xgkngpb.js:1950863-1951013 placement
/**
 * 把用户、助手和压缩边界消息标记为远程来源。
 */
function markRemoteSourced(messages) {
  return messages.map((message) =>
    message.type === "user" ||
    message.type === "assistant" ||
    (message.type === "system" && message.subtype === "compact_boundary")
      ? {
          ...message,
          remoteSourced: true,
        }
      : message,
  );
}
//@ chunk-5xgkngpb.js:1951013-1951125 placement
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
//@ chunk-5xgkngpb.js:1951125-1951295 placement
/**
 * 恢复会话时收集要带过的 Artifact 状态：仅本地来源且允许时调用 collectArtifactResumeCarry 并记 artifact_resume_carry 埋点，否则返回空状态。
 */
function collectResumeArtifactCarry(messages, options) {
  if (options.origin !== "local" || !options.seedEligible) return emptyArtifactCarry();
  let artifactResumeCarry = collectArtifactResumeCarry(messages);
  if (options.reportCarry !== false)
    logResumeCarry(artifactResumeCarry.carry, Object.keys(artifactResumeCarry.artifactReadVersions).length);
  return artifactResumeCarry;
}
//@ chunk-5xgkngpb.js:1951295-1952227 placement
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
  let observers = defaultObserverMap(artifactReadVersions);
  setAppState((state) => {
    let nextFrameUrls = keepCloudRows ? keepCloudOpenedRows(frameUrls, state.frameUrls) : frameUrls;
    let keys = Object.keys(state.frameUrls);
    let keys_2 = Object.keys(nextFrameUrls);
    let keys_3 = Object.keys(artifactReadVersions);
    let artifactReadVersions_2 = state.artifactReadVersions ?? {};
    let artifactRefs_2 = state.artifactRefs ?? [];
    if (
      keys.length === keys_2.length &&
      keys.every(
        (key) =>
          state.frameUrls[key]?.url === nextFrameUrls[key]?.url &&
          state.frameUrls[key]?.updatedAt === nextFrameUrls[key]?.updatedAt,
      ) &&
      keys_3.length === Object.keys(artifactReadVersions_2).length &&
      keys_3.every((slug) => artifactReadVersions_2[slug] === artifactReadVersions[slug]) &&
      artifactRefs_2.length === artifactRefs.length &&
      artifactRefs_2.every(
        (artifactRef, index) =>
          artifactRef.slug === artifactRefs[index]?.slug && artifactRef.pin === undefined,
      ) &&
      sameObservers(state.artifactReadObservers ?? {}, observers)
    )
      return state;
    return {
      ...state,
      frameUrls: nextFrameUrls,
      artifactReadVersions,
      artifactReadObservers: observers,
      artifactRefs,
    };
  });
}
//@ chunk-5xgkngpb.js:1952227-1952393 placement
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
  applyArtifactResumeCarry,
  collectResumeArtifactCarry,
  OPENED,
  isPersistableFrameUrl,
  isCreatedFrameUrl,
  nonOpenedFrameUrls,
  CREATED,
  createToolResultStopMessage,
  frameUrlRowsToPersist,
  frameUrlToRecord,
  stampPreCompactReadVersions,
  markRemoteSourced,
  rebuildArtifactCarryAfterRewind,
  emptyArtifactCarry,
  ATTACHED,
};
