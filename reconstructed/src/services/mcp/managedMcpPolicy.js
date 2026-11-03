/**
 * services/mcp/managedMcpPolicy.ts
 *
 * 2.1.316 新增：判断托管 MCP 设置键是否由该文档设定；逐段解析路径（生成器，询问 realpath/junction）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (14)
 * attribution: placement 13, sole-consumer 1
 */
import { basename, join, resolve, dirname } from "path";
import { realpathSync, accessSync, constants, realpath } from "fs";
import { promisify } from "util";
import { access } from "fs/promises";
import { MCP_POLICY_SETTING_KEYS, shouldAllowManagedMcpServersOnly } from "./config.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { isPosixPlatform } from "../../utils/tmuxSocket.js";
import { isUntouchableSpelling, isWslUncPath } from "../../utils/networkPaths.js";
import { getErrnoCode } from "../../utils/errors.js";
import { writabilityFromError } from "../../utils/settings/managedPath.js";

//@ chunk-dcmhvw5a.js:423061-423187 placement
function getAllowedMcpServersFromTiers({ slot, adminTiers }) {
  return (
    slot?.allowedMcpServers ??
    adminTiers.find((adminTier) => adminTier.allowedMcpServers !== undefined)?.allowedMcpServers
  );
}
//@ chunk-dcmhvw5a.js:423187-423254 placement
/**
 * 列出该文档里存在但不由该文档托管的 MCP 设置键。
 */
function unmanagedPolicyKeys(e, n) {
  return MCP_POLICY_SETTING_KEYS.filter((r) => e[r] !== undefined && !isManagedMcpKeySet(r, e, n));
}
//@ chunk-dcmhvw5a.js:423254-424162 placement
/**
 * 判断托管 MCP 设置键是否由该文档设定。
 */
function isManagedMcpKeySet(e, n, r) {
  let slot = r.slot ?? {};
  switch (e) {
    case "deniedMcpServers":
      return true;
    case "allowManagedMcpServersOnly":
      return n.allowManagedMcpServersOnly === shouldAllowManagedMcpServersOnly(r);
    case "disableClaudeAiConnectors":
      return (
        n.disableClaudeAiConnectors ===
        (slot.disableClaudeAiConnectors === true ||
          r.adminTiers.some((adminTier) => adminTier.disableClaudeAiConnectors === true))
      );
    case "allowedMcpServers":
      return En(
        n.allowedMcpServers,
        shouldAllowManagedMcpServersOnly(r) ? getAllowedMcpServersFromTiers(r) : slot.allowedMcpServers,
      );
    case "disabledMcpjsonServers":
      return (n.disabledMcpjsonServers ?? []).every((a) => slot.disabledMcpjsonServers?.includes(a) === true);
    case "enabledMcpjsonServers":
      return (n.enabledMcpjsonServers ?? []).every((a) => slot.enabledMcpjsonServers?.includes(a) === true);
    case "enableAllProjectMcpServers":
      return (n.enableAllProjectMcpServers ?? false) === (slot.enableAllProjectMcpServers ?? false);
    case "managedMcpServers": {
      let managedMcpServers = slot.managedMcpServers ?? {};
      return Object.entries(n.managedMcpServers ?? {}).every(
        ([key, value]) => Object.hasOwn(managedMcpServers, key) && En(managedMcpServers[key], value),
      );
    }
  }
}
//@ chunk-dcmhvw5a.js:424446-424881 placement
/**
 * 描述经过链接到达的路径（外部/无法确认）。
 */
function describeLinkedPath(e) {
  let n = `${cleanForDisplay(e.path)}: ${cleanForDisplay(basename(e.path))} is reached through a link`;
  let r = cleanForDisplay(e.folder);
  let s;
  switch (e.kind) {
    case "inside":
      return null;
    case "outside":
      s = `${n} that leads outside ${r}.`;
      break;
    case "unverified":
      s = `${n}, and Claude Code couldn't tell whether the link leads outside ${r}.`;
      break;
  }
  return [
    `${s} Claude Code still reads it.`,
    "Suggested fix: Ask your administrator to replace the link with the file or folder it points to.",
  ];
}
//@ chunk-dcmhvw5a.js:424881-425042 placement
/**
 * 同步执行路径解析步骤生成器（逐步执行文件系统询问）。
 */
function resolvePathStepsSync(e, n, r, s, a) {
  let fsImplementation = getFsImplementation();
  let pathSteps = resolvePathSteps(e, n, r, s);
  let m = pathSteps.next();
  while (!m.done) {
    let f;
    try {
      f = answerPathAskSync(fsImplementation, m.value, a);
    } catch (error) {
      m = pathSteps.throw(error);
      continue;
    }
    m = pathSteps.next(f);
  }
  return m.value;
}
//@ chunk-dcmhvw5a.js:425042-425211 placement
/**
 * 异步执行路径解析步骤生成器（逐步执行文件系统询问）。
 */
async function resolvePathStepsAsync(e, n, r, s) {
  let fsImplementation = getFsImplementation();
  let pathSteps = resolvePathSteps(e, n, r, s);
  let g = pathSteps.next();
  while (!g.done) {
    let m;
    try {
      m = await answerPathAskAsync(fsImplementation, g.value);
    } catch (error) {
      g = pathSteps.throw(error);
      continue;
    }
    g = pathSteps.next(m);
  }
  return g.value;
}
//@ chunk-dcmhvw5a.js:425211-425298 placement
/**
 * 检查 UNC 交接点时使用的保守选项。
 */
var UNC_JUNCTION_OPTIONS = {
  unreadableAncestry: "unverified",
  surfaceNetworkRaw: true,
  literalLinkText: "opaque",
};
//@ chunk-dcmhvw5a.js:425298-425563 placement
function answerPathAskSync(fsImplementation, { ask, path }, s) {
  switch (ask) {
    case "isLink": {
      let a = fsImplementation.lstatSync(path);
      s.set(path, {
        uid: a.uid,
        gid: a.gid,
        mode: a.mode,
      });
      return a.isSymbolicLink();
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
//@ chunk-dcmhvw5a.js:425563-425799 placement
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
//@ chunk-dcmhvw5a.js:425799-426432 placement
/**
 * 逐段解析路径（生成器，询问 realpath/junction）。
 */
function* resolvePathSteps(e, n, r, s) {
  let a = join(e, ...n);
  let c;
  try {
    c = yield* askIsLink(resolve(e), s);
    if (!c) {
      let h = e;
      let y = false;
      for (let [b, S] of n.entries()) {
        h = join(h, S);
        y = b === n.length - 1 ? (r ?? (yield* askIsLink(h))) : yield* askIsLink(h, s);
        if (y) break;
      }
      if (!y) return null;
    }
  } catch {
    return null;
  }
  if (c) {
    let targetWritable = isPosixPlatform()
      ? yield* isPathOrParentWritable(yield* resolveNetworkJunction(a))
      : "unknown";
    return {
      path: a,
      folder: e,
      kind: "outside",
      targetWritable,
    };
  }
  let g = yield* resolveNetworkJunction(a);
  let m = yield* resolveNetworkJunction(e);
  if (g === "gone" || m === "gone") return null;
  if (m === "unverified" || "network" in m || g === "unverified")
    return {
      path: a,
      folder: e,
      kind: "unverified",
    };
  if ("real" in g && isSpelledStrictAncestor(m.real, g.real))
    return {
      path: a,
      folder: e,
      kind: "inside",
    };
  let targetWritable = yield* isPathOrParentWritable(g);
  return {
    path: a,
    folder: e,
    kind: "outside",
    targetWritable,
  };
}
//@ chunk-dcmhvw5a.js:426432-426536 placement
function* askIsLink(e, n) {
  let r = n?.get(e);
  if (r === undefined) {
    r =
      (yield {
        ask: "isLink",
        path: e,
      }) === true;
    n?.set(e, r);
  }
  return r;
}
//@ chunk-dcmhvw5a.js:426536-426871 placement
/**
 * 解析网络路径或 junction。
 */
function* resolveNetworkJunction(e) {
  if (isUntouchableSpelling(e) && !isWslUncPath(e))
    return {
      network: e,
    };
  try {
    let n = yield {
      ask: "networkJunction",
      path: e,
    };
    if (n === UNVERIFIED_ANCESTRY || n === OPAQUE_LINK_TEXT) return "unverified";
    if (typeof n === "string")
      return {
        network: n,
      };
    let r = yield {
      ask: "realpath",
      path: e,
    };
    return typeof r === "string"
      ? {
          real: r,
        }
      : "unverified";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "gone" : "unverified";
  }
}
//@ chunk-dcmhvw5a.js:426947-427191 placement
function* isPathOrParentWritable(e) {
  try {
    if (typeof e === "string" || !("real" in e) || !isPosixPlatform()) return "unknown";
    let n = yield* probeWritabilityAsync(e.real);
    if (n === "yes") return "yes";
    let r = yield* probeWritabilityAsync(dirname(e.real));
    if (r === "yes") return "yes";
    return n === "no" && r === "no" ? "no" : "unknown";
  } catch {
    return "unknown";
  }
}
//@ chunk-dcmhvw5a.js:427191-427275 sole-consumer
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
  getAllowedMcpServersFromTiers,
  resolvePathStepsSync,
  describeLinkedPath,
  unmanagedPolicyKeys,
  resolvePathStepsAsync,
};
