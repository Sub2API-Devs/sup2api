/**
 * utils/settings/managedSettingsFiles.ts
 *
 * 托管设置文件加载（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8cqcff6.js (24)
 * attribution: placement 24
 */
import { join, join as join_2, join as join_3 } from "path";
import { getErrnoCode, errorMessage } from "../errors.js";
import { WSL_MANAGED_SETTINGS_DIR } from "./mdm/wslRegistry.js";
import { readManagedDocumentText, managedFileHasContent } from "./mdm/settings.js";
import { unreadableSettingsFileError, unparseablePolicyDocumentError } from "./settingsFileParsing.js";
import { resolvePathStepsAsync } from "../../services/mcp/managedMcpPolicy.js";
import { safeParseJSON } from "../json.js";
import { isPlainObject } from "../isPlainObject.js";
import { combinedLoadState } from "./policySettings.js";
import { readWslInheritFlag } from "./types.js";
import { getFsImplementation } from "../fsOperations.js";
import { isManagedSettingsDropInName } from "./managedFileSettings.js";
import { ge } from "../identity.js";
import { withHostOwnedEnvGuard, hostOwnedEnvNames, Mxi } from "../plugins/securityDefaultPlugin.js";
import { logForDebugging } from "../debug.js";

//@ chunk-q8cqcff6.js:17707-17768 placement = isRealPathWithinTeamDir (1)
function isNotFoundErrno_5(realCandidate) {
  let code = getErrnoCode(realCandidate);
  return code === "ENOENT" || code === "ENOTDIR";
}
//@ chunk-q8cqcff6.js:17768-18852 placement
async function loadManagedSettingsFile(e) {
  let n = [],
    r = "absent",
    s = [],
    S = new Map();
  async function E(v, M) {
    let x = join_3(WSL_MANAGED_SETTINGS_DIR, ...v),
      L;
    try {
      L = await readManagedDocumentText(x, e);
    } catch (error) {
      if (isNotFoundErrno_5(error)) return "disarmed";
      (n.push(unreadableSettingsFileError(x, error)), (r = "didNotLoad"));
    }
    let G = await resolvePathStepsAsync(WSL_MANAGED_SETTINGS_DIR, v, M, S);
    if (G !== null) s.push(G);
    if (L === void 0) return "disarmed";
    let q = L.trim() === "" ? {} : safeParseJSON(L, !1);
    if (!isPlainObject(q)) return (n.push(unparseablePolicyDocumentError(x)), (r = "didNotLoad"), "disarmed");
    return ((r = combinedLoadState(r, "loaded")), readWslInheritFlag(q));
  }
  let h = join_3(WSL_MANAGED_SETTINGS_DIR, "managed-settings.json"),
    y = await E(["managed-settings.json"]);
  if (y === "armed") return { flag: y, records: n, loadState: r, links: s };
  let P = y === "unreadable" ? h : void 0,
    O = join_3(WSL_MANAGED_SETTINGS_DIR, "managed-settings.d"),
    T;
  try {
    T = await getFsImplementation().readdir(O);
  } catch (error) {
    if (!isNotFoundErrno_5(error))
      (n.push(unreadableSettingsFileError(O, error, "directory")), (r = "didNotLoad"));
    return { flag: y, unreadableFlagPath: P, records: n, loadState: r, links: s };
  }
  for (let v of T) {
    if (!(v.isFile() || v.isSymbolicLink()) || !v.name.endsWith(".json") || v.name.startsWith(".")) continue;
    let M = await E(["managed-settings.d", v.name], v.isSymbolicLink());
    if (M === "armed") return { flag: M, records: n, loadState: r, links: s };
    if (M === "unreadable") ((y = M), (P ??= join_3(O, v.name)));
  }
  return { flag: y, unreadableFlagPath: P, records: n, loadState: r, links: s };
}
//@ chunk-q8cqcff6.js:18852-19122 placement
async function hasManagedSettingsDocument(e, n) {
  if (await managedFileHasContent(join_3(e, "managed-settings.json"), n)) return !0;
  let r = join_3(e, "managed-settings.d"),
    s;
  try {
    s = await getFsImplementation().readdir(r);
  } catch (error) {
    return !isNotFoundErrno_5(error);
  }
  for (let S of s)
    if (
      (S.isFile() || S.isSymbolicLink()) &&
      isManagedSettingsDropInName(S.name) &&
      (await managedFileHasContent(join_3(r, S.name), n))
    )
      return !0;
  return !1;
}
//@ chunk-q8cqcff6.js:19164-19188 placement
function sn(e) {
  return e;
}
//@ chunk-q8cqcff6.js:19188-19260 placement
var ue = ge(new Map(), (e) => e.clear()),
  Oe = ge({ isOpen: !1 }, (e) => {
    e.isOpen = !1;
  });
//@ chunk-q8cqcff6.js:19260-19297 placement
function Pe(e) {
  return process.env[e];
}
//@ chunk-q8cqcff6.js:19297-19375 placement
function on(e, n) {
  if (n === void 0) {
    delete process.env[e];
    return;
  }
  process.env[e] = n;
}
//@ chunk-q8cqcff6.js:19375-19412 placement
function an(e) {
  return withHostOwnedEnvGuard(() => Pe(e));
}
//@ chunk-q8cqcff6.js:19412-19456 placement
function ln(e) {
  return an(e.name) === e.theirs;
}
/**
 * 在宿主可能改写某个环境变量前记下它的原值，返回的回调记录宿主写入后的值。
 */
//@ chunk-q8cqcff6.js:19456-19631 placement
function snapshotHostOwnedEnv(e) {
  let n = sn(e),
    r = ue.get(n);
  if (r !== void 0 && !Oe.isOpen && !ln(r)) ue.delete(n);
  let s = ue.get(n) ?? Ui(e) ?? { name: e, before: an(e) };
  return () => {
    ue.set(n, { ...s, theirs: Pe(e) });
  };
}
//@ chunk-q8cqcff6.js:19631-19720 placement
function Eus(e) {
  ue.delete(sn(e));
  for (let [n, r] of dn(e)) if (Pe(r.name) === Pe(e)) ue.delete(n);
}
//@ chunk-q8cqcff6.js:19720-19744 placement
function dn(e) {
  return [];
}
//@ chunk-q8cqcff6.js:19744-19828 placement
function RXt(e) {
  return un()
    .filter((n) => e?.(n.name, n.theirs) !== !0)
    .map((n) => n.name);
}
//@ chunk-q8cqcff6.js:19828-19923 placement
function Ui(e) {
  for (let [, n] of dn(e)) if (Pe(n.name) === Pe(e)) return { name: e, before: n.before };
  return;
}
//@ chunk-q8cqcff6.js:19923-19992 placement
function un() {
  let e = [...ue.values()];
  return Oe.isOpen ? e : e.filter(ln);
}
//@ chunk-q8cqcff6.js:19992-20013 placement
var $e = { take: void 0 };
//@ chunk-q8cqcff6.js:20013-20092 placement
function MRi(e) {
  let take = $e.take;
  return (
    ($e.take = e),
    {
      [Symbol.dispose]() {
        $e.take = take;
      },
    }
  );
}
/**
 * 在回调执行期间把宿主拥有的环境变量临时恢复为插件写入前的值（可按名字排除），执行完再改回；已在恢复中则直接执行。
 */
//@ chunk-q8cqcff6.js:20092-20389 placement
function withHostEnvRestored(e, n) {
  if (Oe.isOpen) return e();
  return withHostOwnedEnvGuard(() => {
    let r = un(),
      s = $e.take?.();
    if (r.length === 0 && s === void 0) return e();
    let filtered = r.filter((E) => n?.(E.name, E.theirs) !== !0);
    for (let E of filtered) on(E.name, E.before);
    Oe.isOpen = !0;
    try {
      return e();
    } finally {
      for (let E of filtered) on(E.name, E.theirs);
      (s?.(), (Oe.isOpen = !1));
    }
  });
}
//@ chunk-q8cqcff6.js:20389-20401 placement
var gn = null;
//@ chunk-q8cqcff6.js:20401-20422 placement
function DRi(e) {
  gn = e;
}
//@ chunk-q8cqcff6.js:20422-20454 placement
function pn() {
  return gn?.() ?? {};
}
/**
 * 有宿主拥有的环境变量时，先读取托管设置的 env 以确定哪些属于组织，再在宿主环境守卫下执行回调。
 */
//@ chunk-q8cqcff6.js:20454-20681 placement
function withHostOwnedEnv(e, n) {
  if (hostOwnedEnvNames().length === 0) return e();
  try {
    Mxi(pn());
  } catch (error) {
    logForDebugging(
      `managed settings' env could not be read, so no variable a person's plugin wrote is read as the organization's: ${errorMessage(error)}`,
      { level: "error" },
    );
  }
  return withHostOwnedEnvGuard(e, n);
}
//@ chunk-q8cqcff6.js:20681-20759 placement
function AQ(e, n = {}) {
  return withHostOwnedEnv(() => withHostEnvRestored(e, n.keepsRepositoryValue), n.keepsWrite);
}
//@ chunk-q8cqcff6.js:20759-21150 placement
function formatWithheldEnvNotice(e, n) {
  let r = new Set([...RXt(), ...hostOwnedEnvNames()]),
    s = n ? e.filter((E) => r.has(E)) : [],
    S = `Missing environment variables: ${e.join(", ")}`;
  return s.length === 0
    ? S
    : `${S}. Withheld because your organization manages this start: ${s.join(", ")}. Project settings env and other plugins don't reach it. Set them in managed settings env, ~/.claude/settings.json or the shell you start Claude Code from.`;
}

export {
  formatWithheldEnvNotice,
  AQ,
  RXt,
  withHostOwnedEnv,
  withHostEnvRestored,
  loadManagedSettingsFile,
  hasManagedSettingsDocument,
  isNotFoundErrno_5,
  MRi,
  DRi,
  Eus,
  snapshotHostOwnedEnv,
};
