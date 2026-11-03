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
import { join } from "path";
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
import { identity as identity_2 } from "../identity.js";
import {
  withHostOwnedEnvGuard,
  hostOwnedEnvNames,
  importEnvWrites,
} from "../plugins/securityDefaultPlugin.js";
import { logForDebugging } from "../debug.js";

//@ chunk-q8cqcff6.js:17707-17768 placement = isRealPathWithinTeamDir (1)
function isNotFoundErrno_5(realCandidate) {
  let code = getErrnoCode(realCandidate);
  return code === "ENOENT" || code === "ENOTDIR";
}
//@ chunk-q8cqcff6.js:17768-18852 placement
async function loadManagedSettingsFile(e) {
  let n = [];
  let r = "absent";
  let s = [];
  let S = new Map();
  async function E(v, M) {
    let x = join(WSL_MANAGED_SETTINGS_DIR, ...v);
    let L;
    try {
      L = await readManagedDocumentText(x, e);
    } catch (error) {
      if (isNotFoundErrno_5(error)) return "disarmed";
      n.push(unreadableSettingsFileError(x, error));
      r = "didNotLoad";
    }
    let pathSteps = await resolvePathStepsAsync(WSL_MANAGED_SETTINGS_DIR, v, M, S);
    if (pathSteps !== null) s.push(pathSteps);
    if (L === undefined) return "disarmed";
    let q = L.trim() === "" ? {} : safeParseJSON(L, false);
    if (!isPlainObject(q)) {
      n.push(unparseablePolicyDocumentError(x));
      r = "didNotLoad";
      return "disarmed";
    }
    r = combinedLoadState(r, "loaded");
    return readWslInheritFlag(q);
  }
  let h = join(WSL_MANAGED_SETTINGS_DIR, "managed-settings.json");
  let y = await E(["managed-settings.json"]);
  if (y === "armed")
    return {
      flag: y,
      records: n,
      loadState: r,
      links: s,
    };
  let unreadableFlagPath = y === "unreadable" ? h : undefined;
  let O = join(WSL_MANAGED_SETTINGS_DIR, "managed-settings.d");
  let T;
  try {
    T = await getFsImplementation().readdir(O);
  } catch (error) {
    if (!isNotFoundErrno_5(error)) {
      n.push(unreadableSettingsFileError(O, error, "directory"));
      r = "didNotLoad";
    }
    return {
      flag: y,
      unreadableFlagPath,
      records: n,
      loadState: r,
      links: s,
    };
  }
  for (let v of T) {
    if (!(v.isFile() || v.isSymbolicLink()) || !v.name.endsWith(".json") || v.name.startsWith(".")) continue;
    let M = await E(["managed-settings.d", v.name], v.isSymbolicLink());
    if (M === "armed")
      return {
        flag: M,
        records: n,
        loadState: r,
        links: s,
      };
    if (M === "unreadable") {
      y = M;
      unreadableFlagPath ??= join(O, v.name);
    }
  }
  return {
    flag: y,
    unreadableFlagPath,
    records: n,
    loadState: r,
    links: s,
  };
}
//@ chunk-q8cqcff6.js:18852-19122 placement
async function hasManagedSettingsDocument(e, n) {
  if (await managedFileHasContent(join(e, "managed-settings.json"), n)) return true;
  let r = join(e, "managed-settings.d");
  let s;
  try {
    s = await getFsImplementation().readdir(r);
  } catch (error) {
    return !isNotFoundErrno_5(error);
  }
  for (let S of s)
    if (
      (S.isFile() || S.isSymbolicLink()) &&
      isManagedSettingsDropInName(S.name) &&
      (await managedFileHasContent(join(r, S.name), n))
    )
      return true;
  return false;
}
//@ chunk-q8cqcff6.js:19164-19188 placement
function identityValue(e) {
  return e;
}
//@ chunk-q8cqcff6.js:19188-19260 placement
var hostEnvWrites = identity_2(new Map(), (e) => e.clear());
var hostOwnedEnvOpen = identity_2(
  {
    isOpen: false,
  },
  (e) => {
    e.isOpen = false;
  },
);
//@ chunk-q8cqcff6.js:19260-19297 placement
function readEnvVar(e) {
  return process.env[e];
}
//@ chunk-q8cqcff6.js:19297-19375 placement
function writeEnvVar(name, n) {
  if (n === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = n;
}
//@ chunk-q8cqcff6.js:19375-19412 placement
function readEnvUnderGuard(e) {
  return withHostOwnedEnvGuard(() => readEnvVar(e));
}
//@ chunk-q8cqcff6.js:19412-19456 placement
function isHostValueIntact(e) {
  return readEnvUnderGuard(e.name) === e.theirs;
}
//@ chunk-q8cqcff6.js:19456-19631 placement
/**
 * 在宿主可能改写某个环境变量前记下它的原值，返回的回调记录宿主写入后的值。
 */
function snapshotHostOwnedEnv(e) {
  let n = identityValue(e);
  let r = hostEnvWrites.get(n);
  if (r !== undefined && !hostOwnedEnvOpen.isOpen && !isHostValueIntact(r)) hostEnvWrites.delete(n);
  let s = hostEnvWrites.get(n) ??
    hostEnvWriteFor(e) ?? {
      name: e,
      before: readEnvUnderGuard(e),
    };
  return () => {
    hostEnvWrites.set(n, {
      ...s,
      theirs: readEnvVar(e),
    });
  };
}
//@ chunk-q8cqcff6.js:19631-19720 placement
/**
 * forgetHostEnvWrites：忘掉某环境变量的宿主写入记录。
 */
function forgetHostEnvWrites(e) {
  hostEnvWrites.delete(identityValue(e));
  for (let [n, r] of noAliasedEnvWrites(e)) if (readEnvVar(r.name) === readEnvVar(e)) hostEnvWrites.delete(n);
}
//@ chunk-q8cqcff6.js:19720-19744 placement
function noAliasedEnvWrites(e) {
  return [];
}
//@ chunk-q8cqcff6.js:19744-19828 placement
/**
 * hostWrittenEnvNames：宿主写过的环境变量名。
 */
function hostWrittenEnvNames(keepsRepositoryValue) {
  return activeHostEnvWrites()
    .filter((n) => keepsRepositoryValue?.(n.name, n.theirs) !== true)
    .map((n) => n.name);
}
//@ chunk-q8cqcff6.js:19828-19923 placement
function hostEnvWriteFor(e) {
  for (let [, n] of noAliasedEnvWrites(e))
    if (readEnvVar(n.name) === readEnvVar(e))
      return {
        name: e,
        before: n.before,
      };
  return;
}
//@ chunk-q8cqcff6.js:19923-19992 placement
function activeHostEnvWrites() {
  let e = [...hostEnvWrites.values()];
  return hostOwnedEnvOpen.isOpen ? e : e.filter(isHostValueIntact);
}
//@ chunk-q8cqcff6.js:19992-20013 placement
var envTakeScope = {
  take: undefined,
};
//@ chunk-q8cqcff6.js:20013-20092 placement
/**
 * withEnvTake：临时替换取值函数并恢复。
 */
function withEnvTake(take) {
  let take_2 = envTakeScope.take;
  envTakeScope.take = take;
  return {
    [Symbol.dispose]() {
      envTakeScope.take = take_2;
    },
  };
}
//@ chunk-q8cqcff6.js:20092-20389 placement
/**
 * 在回调执行期间把宿主拥有的环境变量临时恢复为插件写入前的值（可按名字排除），执行完再改回；已在恢复中则直接执行。
 */
function withHostEnvRestored_2(e, keepsRepositoryValue) {
  if (hostOwnedEnvOpen.isOpen) return e();
  return withHostOwnedEnvGuard(() => {
    let r = activeHostEnvWrites();
    let s = envTakeScope.take?.();
    if (r.length === 0 && s === undefined) return e();
    let filtered = r.filter((E) => keepsRepositoryValue?.(E.name, E.theirs) !== true);
    for (let E of filtered) writeEnvVar(E.name, E.before);
    hostOwnedEnvOpen.isOpen = true;
    try {
      return e();
    } finally {
      for (let E of filtered) writeEnvVar(E.name, E.theirs);
      s?.();
      hostOwnedEnvOpen.isOpen = false;
    }
  });
}
//@ chunk-q8cqcff6.js:20389-20401 placement
var managedOverrideProvider = null;
//@ chunk-q8cqcff6.js:20401-20422 placement
/**
 * setManagedOverrideProvider：设置托管覆盖提供者。
 */
function setManagedOverrideProvider(e) {
  managedOverrideProvider = e;
}
//@ chunk-q8cqcff6.js:20422-20454 placement
function managedOverrideValues() {
  return managedOverrideProvider?.() ?? {};
}
//@ chunk-q8cqcff6.js:20454-20681 placement
/**
 * 有宿主拥有的环境变量时，先读取托管设置的 env 以确定哪些属于组织，再在宿主环境守卫下执行回调。
 */
function withHostOwnedEnv(e, keepsWrite) {
  if (hostOwnedEnvNames().length === 0) return e();
  try {
    importEnvWrites(managedOverrideValues());
  } catch (error) {
    logForDebugging(
      `managed settings' env could not be read, so no variable a person's plugin wrote is read as the organization's: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
  }
  return withHostOwnedEnvGuard(e, keepsWrite);
}
//@ chunk-q8cqcff6.js:20681-20759 placement
/**
 * withHostEnvRestored：在恢复宿主环境后执行。
 */
function withHostEnvRestored(e, n = {}) {
  return withHostOwnedEnv(() => withHostEnvRestored_2(e, n.keepsRepositoryValue), n.keepsWrite);
}
//@ chunk-q8cqcff6.js:20759-21150 placement
function formatWithheldEnvNotice(e, n) {
  let r = new Set([...hostWrittenEnvNames(), ...hostOwnedEnvNames()]);
  let s = n ? e.filter((E) => r.has(E)) : [];
  let S = `Missing environment variables: ${e.join(", ")}`;
  return s.length === 0
    ? S
    : `${S}. Withheld because your organization manages this start: ${s.join(", ")}. Project settings env and other plugins don't reach it. Set them in managed settings env, ~/.claude/settings.json or the shell you start Claude Code from.`;
}
export {
  formatWithheldEnvNotice,
  withHostEnvRestored,
  hostWrittenEnvNames,
  withHostOwnedEnv,
  withHostEnvRestored_2,
  loadManagedSettingsFile,
  hasManagedSettingsDocument,
  isNotFoundErrno_5,
  withEnvTake,
  setManagedOverrideProvider,
  forgetHostEnvWrites,
  snapshotHostOwnedEnv,
};
