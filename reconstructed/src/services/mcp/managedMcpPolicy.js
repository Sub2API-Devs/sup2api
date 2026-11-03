/**
 * services/mcp/managedMcpPolicy.ts
 *
 * 2.1.316 新增：判断托管 MCP 设置键是否由该文档设定；逐段解析路径（生成器，询问 realpath/junction）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (12)
 * attribution: placement 12
 */
import {
  basename,
  basename as basename_2,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
} from "path";
import {
  realpathSync,
  accessSync,
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  realpath,
} from "fs";
import { promisify, promisify as promisify_2 } from "util";
import { access } from "fs/promises";
import { MCP_POLICY_SETTING_KEYS, shouldAllowManagedMcpServersOnly } from "./config.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { ql } from "../../utils/stringUtils.js";
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
import { isPathOrParentWritable } from "./_new/isPathOrParentWritable.js";
import { hl, isWslUncPath } from "../../utils/networkPaths.js";
import { getErrnoCode } from "../../utils/errors.js";

//@ chunk-dcmhvw5a.js:423061-423187 placement
function getAllowedMcpServersFromTiers({ slot: slot, adminTiers: adminTiers }) {
  return slot?.allowedMcpServers ?? adminTiers.find((r) => r.allowedMcpServers !== void 0)?.allowedMcpServers;
}
//@ chunk-dcmhvw5a.js:423187-423254 placement
function bp(e, n) {
  return MCP_POLICY_SETTING_KEYS.filter((r) => e[r] !== void 0 && !isManagedMcpKeySet(r, e, n));
}
/**
 * 判断托管 MCP 设置键是否由该文档设定。
 */
//@ chunk-dcmhvw5a.js:423254-424162 placement
function isManagedMcpKeySet(e, n, r) {
  let s = r.slot ?? {};
  switch (e) {
    case "deniedMcpServers":
      return !0;
    case "allowManagedMcpServersOnly":
      return n.allowManagedMcpServersOnly === shouldAllowManagedMcpServersOnly(r);
    case "disableClaudeAiConnectors":
      return (
        n.disableClaudeAiConnectors ===
        (s.disableClaudeAiConnectors === !0 ||
          r.adminTiers.some((adminTier) => adminTier.disableClaudeAiConnectors === !0))
      );
    case "allowedMcpServers":
      return En(
        n.allowedMcpServers,
        shouldAllowManagedMcpServersOnly(r) ? getAllowedMcpServersFromTiers(r) : s.allowedMcpServers,
      );
    case "disabledMcpjsonServers":
      return (n.disabledMcpjsonServers ?? []).every((a) => s.disabledMcpjsonServers?.includes(a) === !0);
    case "enabledMcpjsonServers":
      return (n.enabledMcpjsonServers ?? []).every((a) => s.enabledMcpjsonServers?.includes(a) === !0);
    case "enableAllProjectMcpServers":
      return (n.enableAllProjectMcpServers ?? !1) === (s.enableAllProjectMcpServers ?? !1);
    case "managedMcpServers": {
      let a = s.managedMcpServers ?? {};
      return Object.entries(n.managedMcpServers ?? {}).every(([c, g]) => Object.hasOwn(a, c) && En(a[c], g));
    }
  }
}
/**
 * 描述经过链接到达的路径（外部/无法确认）。
 */
//@ chunk-dcmhvw5a.js:424446-424881 placement
function describeLinkedPath(e) {
  let n = `${ql(e.path)}: ${ql(basename_2(e.path))} is reached through a link`,
    r = ql(e.folder),
    s;
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
/**
 * 同步执行路径解析步骤生成器（逐步执行文件系统询问）。
 */
//@ chunk-dcmhvw5a.js:424881-425042 placement
function resolvePathStepsSync(e, n, r, s, a) {
  let c = getFsImplementation(),
    g = resolvePathSteps(e, n, r, s),
    m = g.next();
  while (!m.done) {
    let f;
    try {
      f = answerPathAskSync(c, m.value, a);
    } catch (error) {
      m = g.throw(error);
      continue;
    }
    m = g.next(f);
  }
  return m.value;
}
/**
 * 异步执行路径解析步骤生成器（逐步执行文件系统询问）。
 */
//@ chunk-dcmhvw5a.js:425042-425211 placement
async function resolvePathStepsAsync(e, n, r, s) {
  let a = getFsImplementation(),
    c = resolvePathSteps(e, n, r, s),
    g = c.next();
  while (!g.done) {
    let m;
    try {
      m = await answerPathAskAsync(a, g.value);
    } catch (error) {
      g = c.throw(error);
      continue;
    }
    g = c.next(m);
  }
  return g.value;
}
//@ chunk-dcmhvw5a.js:425211-425298 placement
var Rp = { unreadableAncestry: "unverified", surfaceNetworkRaw: !0, literalLinkText: "opaque" };
//@ chunk-dcmhvw5a.js:425298-425563 placement
function answerPathAskSync(e, { ask: ask, path: path }, s) {
  switch (ask) {
    case "isLink": {
      let lstatSync = e.lstatSync(path);
      return (
        s.set(path, { uid: lstatSync.uid, gid: lstatSync.gid, mode: lstatSync.mode }),
        lstatSync.isSymbolicLink()
      );
    }
    case "networkJunction":
      return findIntermediateUncJunction(e, path, Rp);
    case "realpath":
      return toUncLongPath(realpathSync.native(path));
    case "writable":
      return (accessSync(path, constants_4.W_OK), !0);
  }
}
//@ chunk-dcmhvw5a.js:425563-425799 placement
async function answerPathAskAsync(e, { ask: ask, path: path }) {
  switch (ask) {
    case "isLink":
      return (await e.lstat(path)).isSymbolicLink();
    case "networkJunction":
      return findIntermediateUncJunctionAsync(e, path, Rp);
    case "realpath":
      return toUncLongPath(await promisify_2(realpath.native)(path));
    case "writable":
      return (await access(path, constants_4.W_OK), !0);
  }
}
/**
 * 逐段解析路径（生成器，询问 realpath/junction）。
 */
//@ chunk-dcmhvw5a.js:425799-426432 placement
function* resolvePathSteps(e, n, r, s) {
  let a = join_3(e, ...n),
    c;
  try {
    if (((c = yield* askIsLink(resolve_3(e), s)), !c)) {
      let h = e,
        y = !1;
      for (let [b, S] of n.entries())
        if (
          ((h = join_3(h, S)),
          (y = b === n.length - 1 ? (r ?? (yield* askIsLink(h))) : yield* askIsLink(h, s)),
          y)
        )
          break;
      if (!y) return null;
    }
  } catch {
    return null;
  }
  if (c) {
    let h = isPosixPlatform() ? yield* isPathOrParentWritable(yield* resolveNetworkJunction(a)) : "unknown";
    return { path: a, folder: e, kind: "outside", targetWritable: h };
  }
  let g = yield* resolveNetworkJunction(a),
    m = yield* resolveNetworkJunction(e);
  if (g === "gone" || m === "gone") return null;
  if (m === "unverified" || "network" in m || g === "unverified")
    return { path: a, folder: e, kind: "unverified" };
  if ("real" in g && isSpelledStrictAncestor(m.real, g.real)) return { path: a, folder: e, kind: "inside" };
  let f = yield* isPathOrParentWritable(g);
  return { path: a, folder: e, kind: "outside", targetWritable: f };
}
//@ chunk-dcmhvw5a.js:426432-426536 placement
function* askIsLink(e, n) {
  let r = n?.get(e);
  if (r === void 0) ((r = (yield { ask: "isLink", path: e }) === !0), n?.set(e, r));
  return r;
}
/**
 * 解析网络路径或 junction。
 */
//@ chunk-dcmhvw5a.js:426536-426871 placement
function* resolveNetworkJunction(e) {
  if (hl(e) && !isWslUncPath(e)) return { network: e };
  try {
    let n = yield { ask: "networkJunction", path: e };
    if (n === UNVERIFIED_ANCESTRY || n === OPAQUE_LINK_TEXT) return "unverified";
    if (typeof n === "string") return { network: n };
    let r = yield { ask: "realpath", path: e };
    return typeof r === "string" ? { real: r } : "unverified";
  } catch (error) {
    let r = getErrnoCode(error);
    return r === "ENOENT" || r === "ENOTDIR" ? "gone" : "unverified";
  }
}

export { getAllowedMcpServersFromTiers, resolvePathStepsSync, describeLinkedPath, bp, resolvePathStepsAsync };
