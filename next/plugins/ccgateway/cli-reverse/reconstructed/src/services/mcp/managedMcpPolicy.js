/**
 * services/mcp/managedMcpPolicy.ts
 *
 * 2.1.316 新增：判断托管 MCP 设置键是否由该文档设定；逐段解析路径（生成器，询问 realpath/junction）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (15)
 * attribution: placement 13, layout 1, sole-consumer 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename, join, resolve, dirname } from "path";
import { realpathSync, accessSync, constants, realpath } from "fs";
import { promisify } from "util";
import { access } from "fs/promises";
import { MCP_POLICY_SETTING_KEYS, shouldAllowManagedMcpServersOnly } from "./config.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { cleanForDisplay } from "../../utils/stringUtils.js";
import {
  getFsImplementation,
  findIntermediateUncJunction,
  findIntermediateUncJunctionAsync,
  isSpelledStrictAncestor,
  UNVERIFIED_ANCESTRY,
  OPAQUE_LINK_TEXT,
} from "../../utils/fsOperations.js";
import { toUncLongPath } from "../../utils/windowsUncPaths.js";
import { isUntouchableSpelling, isWslUncPath } from "../../utils/networkPaths.js";
import { getErrnoCode } from "../../utils/errors.js";
import { getPlatform } from "../../utils/platform.js";
import { writabilityFromError } from "../../utils/settings/managedPath.js";

//@ chunk-z20c443b.js:421524-421650 placement
function getAllowedMcpServersFromTiers({ slot, adminTiers }) {
  return (
    slot?.allowedMcpServers ??
    adminTiers.find((adminTier) => adminTier.allowedMcpServers !== undefined)?.allowedMcpServers
  );
}
//@ chunk-z20c443b.js:421650-421717 placement
/**
 * 列出该文档里存在但不由该文档托管的 MCP 设置键。
 */
function unmanagedPolicyKeys(settings, policy) {
  return MCP_POLICY_SETTING_KEYS.filter(
    (key) => settings[key] !== undefined && !isManagedMcpKeySet(key, settings, policy),
  );
}
//@ chunk-z20c443b.js:421717-422625 placement
/**
 * 判断托管 MCP 设置键是否由该文档设定。
 */
function isManagedMcpKeySet(key, settings, context) {
  let slot = context.slot ?? {};
  switch (key) {
    case "deniedMcpServers":
      return true;
    case "allowManagedMcpServersOnly":
      return settings.allowManagedMcpServersOnly === shouldAllowManagedMcpServersOnly(context);
    case "disableClaudeAiConnectors":
      return (
        settings.disableClaudeAiConnectors ===
        (slot.disableClaudeAiConnectors === true ||
          context.adminTiers.some((adminTier) => adminTier.disableClaudeAiConnectors === true))
      );
    case "allowedMcpServers":
      return import_sortedIndex_2(
        settings.allowedMcpServers,
        shouldAllowManagedMcpServersOnly(context)
          ? getAllowedMcpServersFromTiers(context)
          : slot.allowedMcpServers,
      );
    case "disabledMcpjsonServers":
      return (settings.disabledMcpjsonServers ?? []).every(
        (name) => slot.disabledMcpjsonServers?.includes(name) === true,
      );
    case "enabledMcpjsonServers":
      return (settings.enabledMcpjsonServers ?? []).every(
        (name) => slot.enabledMcpjsonServers?.includes(name) === true,
      );
    case "enableAllProjectMcpServers":
      return (settings.enableAllProjectMcpServers ?? false) === (slot.enableAllProjectMcpServers ?? false);
    case "managedMcpServers": {
      let managedMcpServers = slot.managedMcpServers ?? {};
      return Object.entries(settings.managedMcpServers ?? {}).every(
        ([key, value]) =>
          Object.hasOwn(managedMcpServers, key) && import_sortedIndex_2(managedMcpServers[key], value),
      );
    }
  }
}
//@ chunk-z20c443b.js:422909-423344 placement
/**
 * 描述经过链接到达的路径（外部/无法确认）。
 */
function describeLinkedPath(link) {
  let linkText = `${cleanForDisplay(link.path)}: ${cleanForDisplay(basename(link.path))} is reached through a link`;
  let folderText = cleanForDisplay(link.folder);
  let sentence;
  switch (link.kind) {
    case "inside":
      return null;
    case "outside":
      sentence = `${linkText} that leads outside ${folderText}.`;
      break;
    case "unverified":
      sentence = `${linkText}, and Claude Code couldn't tell whether the link leads outside ${folderText}.`;
      break;
  }
  return [
    `${sentence} Claude Code still reads it.`,
    "Suggested fix: Ask your administrator to replace the link with the file or folder it points to.",
  ];
}
//@ chunk-z20c443b.js:423344-423505 placement
/**
 * 同步执行路径解析步骤生成器（逐步执行文件系统询问）。
 */
function resolvePathStepsSync(folder, segments, knownReal, linkCache, statCache) {
  let fsImplementation = getFsImplementation();
  let pathSteps = resolvePathSteps(folder, segments, knownReal, linkCache);
  let step = pathSteps.next();
  while (!step.done) {
    let answer;
    try {
      answer = answerPathAskSync(fsImplementation, step.value, statCache);
    } catch (error) {
      step = pathSteps.throw(error);
      continue;
    }
    step = pathSteps.next(answer);
  }
  return step.value;
}
//@ chunk-z20c443b.js:423505-423674 placement
/**
 * 异步执行路径解析步骤生成器（逐步执行文件系统询问）。
 */
async function resolvePathStepsAsync(folder, segments, knownReal, linkCache) {
  let fsImplementation = getFsImplementation();
  let pathSteps = resolvePathSteps(folder, segments, knownReal, linkCache);
  let step = pathSteps.next();
  while (!step.done) {
    let answer;
    try {
      answer = await answerPathAskAsync(fsImplementation, step.value);
    } catch (error) {
      step = pathSteps.throw(error);
      continue;
    }
    step = pathSteps.next(answer);
  }
  return step.value;
}
//@ chunk-z20c443b.js:423674-423761 placement
/**
 * 检查 UNC 交接点时使用的保守选项。
 */
var UNC_JUNCTION_OPTIONS = {
  unreadableAncestry: "unverified",
  surfaceNetworkRaw: true,
  literalLinkText: "opaque",
};
//@ chunk-z20c443b.js:423761-424026 placement
function answerPathAskSync(fsImplementation, { ask, path }, statCache) {
  switch (ask) {
    case "isLink": {
      let stats = fsImplementation.lstatSync(path);
      statCache.set(path, {
        uid: stats.uid,
        gid: stats.gid,
        mode: stats.mode,
      });
      return stats.isSymbolicLink();
    }
    case "networkJunction":
      return findIntermediateUncJunction(fsImplementation, path, UNC_JUNCTION_OPTIONS);
    case "realpath":
      return toUncLongPath(realpathSync.native(path));
    case "writable":
      accessSync(path, constants.W_OK);
      return true;
  }
}
//@ chunk-z20c443b.js:424026-424262 placement
async function answerPathAskAsync(fsImplementation, { ask, path }) {
  switch (ask) {
    case "isLink":
      return (await fsImplementation.lstat(path)).isSymbolicLink();
    case "networkJunction":
      return findIntermediateUncJunctionAsync(fsImplementation, path, UNC_JUNCTION_OPTIONS);
    case "realpath":
      return toUncLongPath(await promisify(realpath.native)(path));
    case "writable":
      await access(path, constants.W_OK);
      return true;
  }
}
//@ chunk-z20c443b.js:424262-424895 placement
/**
 * 逐段解析路径（生成器，询问 realpath/junction）。
 */
function* resolvePathSteps(folder, segments, knownReal, linkCache) {
  let candidatePath = join(folder, ...segments);
  let folderIsLink;
  try {
    folderIsLink = yield* askIsLink(resolve(folder), linkCache);
    if (!folderIsLink) {
      let prefix = folder;
      let foundLink = false;
      for (let [index, segment] of segments.entries()) {
        prefix = join(prefix, segment);
        foundLink =
          index === segments.length - 1
            ? (knownReal ?? (yield* askIsLink(prefix)))
            : yield* askIsLink(prefix, linkCache);
        if (foundLink) break;
      }
      if (!foundLink) return null;
    }
  } catch {
    return null;
  }
  if (folderIsLink) {
    let targetWritable = isPosixPlatform()
      ? yield* isPathOrParentWritable(yield* resolveNetworkJunction(candidatePath))
      : "unknown";
    return {
      path: candidatePath,
      folder,
      kind: "outside",
      targetWritable,
    };
  }
  let candidateResolved = yield* resolveNetworkJunction(candidatePath);
  let folderResolved = yield* resolveNetworkJunction(folder);
  if (candidateResolved === "gone" || folderResolved === "gone") return null;
  if (folderResolved === "unverified" || "network" in folderResolved || candidateResolved === "unverified")
    return {
      path: candidatePath,
      folder,
      kind: "unverified",
    };
  if ("real" in candidateResolved && isSpelledStrictAncestor(folderResolved.real, candidateResolved.real))
    return {
      path: candidatePath,
      folder,
      kind: "inside",
    };
  let targetWritable = yield* isPathOrParentWritable(candidateResolved);
  return {
    path: candidatePath,
    folder,
    kind: "outside",
    targetWritable,
  };
}
//@ chunk-z20c443b.js:424895-424999 placement
function* askIsLink(path, linkCache) {
  let isLink = linkCache?.get(path);
  if (isLink === undefined) {
    isLink =
      (yield {
        ask: "isLink",
        path,
      }) === true;
    linkCache?.set(path, isLink);
  }
  return isLink;
}
//@ chunk-z20c443b.js:424999-425334 placement
/**
 * 解析网络路径或 junction。
 */
function* resolveNetworkJunction(path) {
  if (isUntouchableSpelling(path) && !isWslUncPath(path))
    return {
      network: path,
    };
  try {
    let junction = yield {
      ask: "networkJunction",
      path,
    };
    if (junction === UNVERIFIED_ANCESTRY || junction === OPAQUE_LINK_TEXT) return "unverified";
    if (typeof junction === "string")
      return {
        network: junction,
      };
    let realPath = yield {
      ask: "realpath",
      path,
    };
    return typeof realPath === "string"
      ? {
          real: realPath,
        }
      : "unverified";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "gone" : "unverified";
  }
}
//@ chunk-z20c443b.js:425334-425410 layout (2.1.88 match: execTmux, 1)
function isPosixPlatform() {
  try {
    let state = getPlatform();
    return state !== "windows" && state !== "wsl";
  } catch {
    return false;
  }
}
//@ chunk-z20c443b.js:425410-425654 placement
function* isPathOrParentWritable(resolved) {
  try {
    if (typeof resolved === "string" || !("real" in resolved) || !isPosixPlatform()) return "unknown";
    let selfStatus = yield* probeWritabilityAsync(resolved.real);
    if (selfStatus === "yes") return "yes";
    let parentStatus = yield* probeWritabilityAsync(dirname(resolved.real));
    if (parentStatus === "yes") return "yes";
    return selfStatus === "no" && parentStatus === "no" ? "no" : "unknown";
  } catch {
    return "unknown";
  }
}
//@ chunk-z20c443b.js:425654-425738 sole-consumer
/**
 * probeWritabilityAsync：异步探测路径可写。
 */
function* probeWritabilityAsync(path) {
  try {
    yield {
      ask: "writable",
      path,
    };
    return "yes";
  } catch (error) {
    return writabilityFromError(error);
  }
}
export {
  resolvePathStepsAsync,
  getAllowedMcpServersFromTiers,
  describeLinkedPath,
  resolvePathStepsSync,
  unmanagedPolicyKeys,
};
