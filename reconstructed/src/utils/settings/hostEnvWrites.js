/**
 * utils/settings/hostEnvWrites.ts
 *
 * 2.1.316 新增：宿主进程写过的环境变量快照与恢复（含托管值回填、withHostEnvRestored 作用域与缺失变量提示）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8cqcff6.js (21)
 * attribution: placement 21
 */
import { identity as identity_2 } from "../identity.js";
import {
  withHostOwnedEnvGuard,
  hostOwnedEnvNames,
  importEnvWrites,
} from "../plugins/securityDefaultPlugin.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-q8cqcff6.js:19164-19188 placement
function identityValue(value) {
  return value;
}
//@ chunk-q8cqcff6.js:19188-19260 placement
var hostEnvWrites; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var hostOwnedEnvOpen;
deferInit("chunk-q8cqcff6.js:19188", () => {
  hostEnvWrites = identity_2(new Map(), (writes) => writes.clear());
  hostOwnedEnvOpen = identity_2(
    {
      isOpen: false,
    },
    (state) => {
      state.isOpen = false;
    },
  );
});
//@ chunk-q8cqcff6.js:19260-19297 placement
function readEnvVar(name) {
  return process.env[name];
}
//@ chunk-q8cqcff6.js:19297-19375 placement
function writeEnvVar(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
//@ chunk-q8cqcff6.js:19375-19412 placement
function readEnvUnderGuard(name) {
  return withHostOwnedEnvGuard(() => readEnvVar(name));
}
//@ chunk-q8cqcff6.js:19412-19456 placement
function isHostValueIntact(write) {
  return readEnvUnderGuard(write.name) === write.theirs;
}
//@ chunk-q8cqcff6.js:19456-19631 placement
/**
 * 在宿主可能改写某个环境变量前记下它的原值，返回的回调记录宿主写入后的值。
 */
function snapshotHostOwnedEnv(name) {
  let key = identityValue(name);
  let existing = hostEnvWrites.get(key);
  if (existing !== undefined && !hostOwnedEnvOpen.isOpen && !isHostValueIntact(existing))
    hostEnvWrites.delete(key);
  let write = hostEnvWrites.get(key) ??
    hostEnvWriteFor(name) ?? {
      name,
      before: readEnvUnderGuard(name),
    };
  return () => {
    hostEnvWrites.set(key, {
      ...write,
      theirs: readEnvVar(name),
    });
  };
}
//@ chunk-q8cqcff6.js:19631-19720 placement
/**
 * forgetHostEnvWrites：忘掉某环境变量的宿主写入记录。
 */
function forgetHostEnvWrites(name) {
  hostEnvWrites.delete(identityValue(name));
  for (let [alias, write] of noAliasedEnvWrites(name))
    if (readEnvVar(write.name) === readEnvVar(name)) hostEnvWrites.delete(alias);
}
//@ chunk-q8cqcff6.js:19720-19744 placement
function noAliasedEnvWrites(name) {
  return [];
}
//@ chunk-q8cqcff6.js:19744-19828 placement
/**
 * hostWrittenEnvNames：宿主写过的环境变量名。
 */
function hostWrittenEnvNames(keepsRepositoryValue) {
  return activeHostEnvWrites()
    .filter((write) => keepsRepositoryValue?.(write.name, write.theirs) !== true)
    .map((write) => write.name);
}
//@ chunk-q8cqcff6.js:19828-19923 placement
function hostEnvWriteFor(name) {
  for (let [, write] of noAliasedEnvWrites(name))
    if (readEnvVar(write.name) === readEnvVar(name))
      return {
        name,
        before: write.before,
      };
  return;
}
//@ chunk-q8cqcff6.js:19923-19992 placement
function activeHostEnvWrites() {
  let writes = [...hostEnvWrites.values()];
  return hostOwnedEnvOpen.isOpen ? writes : writes.filter(isHostValueIntact);
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
function withHostEnvRestored_2(fn, keepsRepositoryValue) {
  if (hostOwnedEnvOpen.isOpen) return fn();
  return withHostOwnedEnvGuard(() => {
    let writes = activeHostEnvWrites();
    let release = envTakeScope.take?.();
    if (writes.length === 0 && release === undefined) return fn();
    let filtered = writes.filter((write) => keepsRepositoryValue?.(write.name, write.theirs) !== true);
    for (let write of filtered) writeEnvVar(write.name, write.before);
    hostOwnedEnvOpen.isOpen = true;
    try {
      return fn();
    } finally {
      for (let write of filtered) writeEnvVar(write.name, write.theirs);
      release?.();
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
function setManagedOverrideProvider(provider) {
  managedOverrideProvider = provider;
}
//@ chunk-q8cqcff6.js:20422-20454 placement
function managedOverrideValues() {
  return managedOverrideProvider?.() ?? {};
}
//@ chunk-q8cqcff6.js:20454-20681 placement
/**
 * 有宿主拥有的环境变量时，先读取托管设置的 env 以确定哪些属于组织，再在宿主环境守卫下执行回调。
 */
function withHostOwnedEnv(fn, isKept) {
  if (hostOwnedEnvNames().length === 0) return fn();
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
  return withHostOwnedEnvGuard(fn, isKept);
}
//@ chunk-q8cqcff6.js:20681-20759 placement
/**
 * withHostEnvRestored：在恢复宿主环境后执行。
 */
function withHostEnvRestored(fn, options = {}) {
  return withHostOwnedEnv(() => withHostEnvRestored_2(fn, options.keepsRepositoryValue), options.keepsWrite);
}
//@ chunk-q8cqcff6.js:20759-21150 placement
function formatWithheldEnvNotice(names, includeWithheld) {
  let managedNames = new Set([...hostWrittenEnvNames(), ...hostOwnedEnvNames()]);
  let withheld = includeWithheld ? names.filter((name) => managedNames.has(name)) : [];
  let message = `Missing environment variables: ${names.join(", ")}`;
  return withheld.length === 0
    ? message
    : `${message}. Withheld because your organization manages this start: ${withheld.join(", ")}. Project settings env and other plugins don't reach it. Set them in managed settings env, ~/.claude/settings.json or the shell you start Claude Code from.`;
}
export {
  formatWithheldEnvNotice,
  withHostEnvRestored,
  hostWrittenEnvNames,
  withHostOwnedEnv,
  withHostEnvRestored_2,
  withEnvTake,
  setManagedOverrideProvider,
  forgetHostEnvWrites,
  snapshotHostOwnedEnv,
};
