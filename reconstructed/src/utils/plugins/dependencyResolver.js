/**
 * utils/plugins/dependencyResolver.ts
 *
 * 并入已有模块：插件依赖解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/dependencyResolver.ts
 * pieces: chunk-czx62zen.js (39), chunk-e6aww6q8.js (1)
 * attribution: placement 16, callgraph-witnessed 1, layout 17, fingerprint 6
 */
import { win32 } from "path";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../../vendor/semver/index.js";
import { getPlatform } from "../platform.js";
import { parsePluginIdentifier, isOfficialMarketplace, canonicalPluginId } from "./pluginIdentifier.js";
import { builtinQualifiedId } from "./pluginPolicy.js";
import { INLINE_PLUGIN_MARKETPLACE, SYNCED } from "../telemetry/pluginTelemetry.js";
import { isReservedMarketplaceName } from "./schemas.js";
import { logForDebugging } from "../debug.js";
import { printableLabel, printableName } from "../printableName.js";
import { runCommandHint } from "../worktreeResumeHint.js";
import { nfcLower, plural } from "../stringUtils.js";
import { LEADING_INVISIBLE_TEXT_RE } from "../settings/marketplaceSettingsAliases.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czx62zen.js:3092-3109 placement
var semverModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czx62zen.js:3092", () => {
  semverModule = __toESM(require_semver_3(), 1);
});
//@ chunk-czx62zen.js:3138-3175 placement
/**
 * isSameNormalizedProjectPath：Windows 项目路径规范化后相同。
 */
function isSameNormalizedProjectPath(projectPath, otherProjectPath) {
  return normalizeWindowsProjectPath(projectPath) === normalizeWindowsProjectPath(otherProjectPath);
}
//@ chunk-czx62zen.js:3175-3231 placement
function isSameInstallTarget(record, scope, projectPath) {
  return record.scope === scope && record.projectPath === projectPath;
}
//@ chunk-czx62zen.js:3231-3366 placement
/**
 * 安装记录 scope 相同且项目路径相同。
 */
function isSameInstallScope(record, scope, projectPath) {
  if (record.scope !== scope) return false;
  if (record.projectPath === undefined || projectPath === undefined)
    return record.projectPath === projectPath;
  return isSameNormalizedProjectPath(record.projectPath, projectPath);
}
//@ chunk-czx62zen.js:3366-3414 placement
/**
 * isStaleInstallTarget：作用域相同但记录不同。
 */
function isStaleInstallTarget(record, scope, projectPath) {
  return !isSameInstallTarget(record, scope, projectPath) && isSameInstallScope(record, scope, projectPath);
}
//@ chunk-czx62zen.js:3414-3476 placement
/**
 * installationAtTarget：取某作用域/项目的安装记录。
 */
function installationAtTarget(installations, scope, projectPath) {
  let installationIndex = findInstallationIndex(installations, scope, projectPath);
  return installationIndex >= 0 ? installations?.[installationIndex] : undefined;
}
//@ chunk-czx62zen.js:3476-3595 placement
/**
 * 先精确匹配、再按 scope/项目路径找安装记录下标。
 */
function findInstallationIndex(installations, scope, projectPath) {
  if (installations === undefined) return -1;
  let index = installations.findIndex((record) => isSameInstallTarget(record, scope, projectPath));
  return index >= 0
    ? index
    : installations.findIndex((record) => isSameInstallScope(record, scope, projectPath));
}
//@ chunk-czx62zen.js:3595-3715 placement
/**
 * 精确匹配的安装记录，否则退回按 scope 匹配的一条。
 */
function findMatchingInstallations(installations, scope, projectPath) {
  let filtered = (installations ?? []).filter((record) => isSameInstallTarget(record, scope, projectPath));
  if (filtered.length > 0) return filtered;
  let fallbackRecord = installationAtTarget(installations, scope, projectPath);
  return fallbackRecord === undefined ? [] : [fallbackRecord];
}
//@ chunk-czx62zen.js:3715-3983 placement
function normalizeWindowsProjectPath(projectPath) {
  if (
    getPlatform() !== "windows" ||
    /^\/(?!\/)/.test(projectPath) ||
    /^[\\/]{2}[?.][\\/]/.test(projectPath) ||
    /(^|[\\/])\.{1,2}([\\/]|$)/.test(projectPath)
  )
    return projectPath;
  let normalized = win32.normalize(projectPath);
  let trimmed =
    normalized.length > win32.parse(normalized).root.length ? normalized.replace(/[\\/]+$/, "") : normalized;
  return /^[a-z]:/i.test(trimmed) ? trimmed[0].toLowerCase() + trimmed.slice(1) : trimmed;
}
//@ chunk-czx62zen.js:3983-4562 placement
/**
 * 读取 manifest.dependencies 中带 version 或 sha 的条目，返回 "名@市场"→{version, sha} 映射；没有则 undefined。
 */
function readManifestDependencyPins(rawCandidate) {
  if (rawCandidate === null || typeof rawCandidate !== "object") return;
  let dependencies = "dependencies" in rawCandidate ? rawCandidate.dependencies : undefined;
  if (!Array.isArray(dependencies)) return;
  let pins = new Map();
  for (let dependency of dependencies) {
    if (dependency === null || typeof dependency !== "object") continue;
    let name = "name" in dependency ? dependency.name : undefined;
    if (typeof name !== "string" || name.length === 0) continue;
    let version =
      "version" in dependency && typeof dependency.version === "string" ? dependency.version : undefined;
    let sha = "sha" in dependency && typeof dependency.sha === "string" ? dependency.sha : undefined;
    if (version === undefined && sha === undefined) continue;
    let marketplace =
      "marketplace" in dependency && typeof dependency.marketplace === "string"
        ? dependency.marketplace
        : undefined;
    let dependencyId = marketplace ? `${name}@${marketplace}` : name;
    pins.set(dependencyId, {
      version,
      sha,
    });
  }
  return pins.size > 0 ? pins : undefined;
}
//@ chunk-czx62zen.js:4562-4673 callgraph-witnessed = qualifyDependency (1)
/**
 * 依赖引用补全市场：不带 @marketplace 的依赖名按声明它的插件所在市场补全（inline 等保留市场除外）。
 */
function qualifyDependency(dep, declaringPluginId) {
  if (parsePluginIdentifier(dep).marketplace) return dep;
  let mkt = parsePluginIdentifier(declaringPluginId).marketplace;
  if (!mkt || isOfficialMarketplace(mkt)) return dep;
  return `${dep}@${mkt}`;
}
//@ chunk-czx62zen.js:4673-4834 layout
/**
 * 依赖引用是否指向给定插件（名字相同且市场一致，或 inline/同步等效 ID）。
 */
function dependencyRefMatches(dependencyId, reference, source) {
  let canonicalId = canonicalPluginId(dependencyId);
  let pluginIdentifier = parsePluginIdentifier(canonicalId);
  let pluginIdentifier_2 = parsePluginIdentifier(reference);
  if (!pluginIdentifier.marketplace)
    return (
      pluginIdentifier_2.name === pluginIdentifier.name || reference === builtinQualifiedId(dependencyId)
    );
  return (
    reference === canonicalId ||
    (pluginIdentifier_2.name === pluginIdentifier.name &&
      pluginIdentifier_2.marketplace === INLINE_PLUGIN_MARKETPLACE) ||
    reference === toSyncedDependencyId(canonicalId, source)
  );
}
//@ chunk-czx62zen.js:4834-4989 layout
function toSyncedDependencyId(dependencyId, reference) {
  let { name, marketplace } = parsePluginIdentifier(dependencyId);
  if (
    marketplace === undefined ||
    isReservedMarketplaceName(marketplace.toLowerCase()) ||
    parsePluginIdentifier(reference).marketplace !== SYNCED
  )
    return;
  let syncedId = `${name}@${SYNCED}`;
  return syncedId === reference ? undefined : syncedId;
}
//@ chunk-czx62zen.js:4989-5007 layout
var MAX_CONSTRAINT_LENGTH = 1024;
var MAX_CONSTRAINTS_TOTAL_LENGTH = 4096;
//@ chunk-czx62zen.js:5007-5135 layout
function tooComplexConstraint(reason) {
  logForDebugging(`intersectConstraints: ${reason} \u2014 treating as too complex`, {
    level: "warn",
  });
  return {
    ok: false,
    reason: "too-complex",
  };
}
//@ chunk-czx62zen.js:5135-5944 layout
/**
 * 求多个 semver 范围约束的交集（依赖插件的 @^x 约束），过长或过复杂视为 too-complex，无交集为 disjoint。
 */
function intersectVersionConstraints(ranges) {
  if (ranges.length === 0)
    return {
      ok: true,
      range: "*",
    };
  let totalLength = 0;
  for (let range of ranges) totalLength += range.length;
  if (totalLength > MAX_CONSTRAINTS_TOTAL_LENGTH)
    return tooComplexConstraint(`total input ${totalLength} chars > ${MAX_CONSTRAINTS_TOTAL_LENGTH}`);
  let alternatives = [];
  for (let range of ranges) {
    let validRange = semverModule.validRange(range);
    if (validRange === null)
      return {
        ok: false,
        reason: "invalid",
      };
    alternatives.push(
      validRange
        .split("||")
        .map((alternative) => alternative.trim())
        .filter(Boolean),
    );
  }
  let current = alternatives[0] ?? [];
  if (current.length > MAX_CONSTRAINT_LENGTH)
    return tooComplexConstraint(
      `${current.length} conjuncts after 1/${ranges.length} inputs > ${MAX_CONSTRAINT_LENGTH}`,
    );
  for (let k = 1; k < alternatives.length; k++) {
    let nextAlternatives = alternatives[k] ?? [];
    let productSize = current.length * nextAlternatives.length;
    if (productSize > MAX_CONSTRAINT_LENGTH)
      return tooComplexConstraint(
        `${productSize} conjuncts after ${k + 1}/${ranges.length} inputs > ${MAX_CONSTRAINT_LENGTH}`,
      );
    let combinations = [];
    for (let left of current) for (let right of nextAlternatives) combinations.push(`${left} ${right}`);
    current = combinations;
  }
  let filtered = current.filter((combination) => {
    let validRange = semverModule.validRange(combination);
    return validRange !== null && semverModule.minVersion(validRange) !== null;
  });
  if (filtered.length === 0)
    return {
      ok: false,
      reason: "disjoint",
    };
  let mergedRange = semverModule.validRange(filtered.join(" || "));
  return mergedRange === null
    ? {
        ok: false,
        reason: "disjoint",
      }
    : {
        ok: true,
        range: mergedRange,
      };
}
//@ chunk-czx62zen.js:5944-5954 layout
var MAX_CONSTRAINT_DISPLAY = 200;
//@ chunk-czx62zen.js:5954-6054 layout
function displayVersionRange(range) {
  return /^[\x20-\x7e]+$/.test(range) && semverModule.validRange(range) !== null
    ? range
    : printableLabel(printableName(range, 64)) || "\u201C\u201D";
}
//@ chunk-czx62zen.js:6054-6150 layout
function displayVersion(version) {
  return /^[0-9A-Za-z][0-9A-Za-z.+-]{0,63}$/.test(version)
    ? version
    : printableLabel(printableName(version, 64)) || "\u201C\u201D";
}
//@ chunk-czx62zen.js:6150-6343 layout
function truncateForDisplay(text) {
  if (text.length <= MAX_CONSTRAINT_DISPLAY) return text;
  let sliced = text.slice(0, MAX_CONSTRAINT_DISPLAY);
  let trimmed =
    sliced.lastIndexOf("\u201C") > sliced.lastIndexOf("\u201D")
      ? sliced.slice(0, sliced.lastIndexOf("\u201C"))
      : sliced;
  return `${trimmed}\u2026 (+${text.length - trimmed.length} chars)`;
}
//@ chunk-czx62zen.js:6343-6960 layout
/**
 * 依赖版本约束冲突的说明文本（disjoint、too-complex、无匹配 tag 等）。
 */
function describeConstraintConflict(targetLabel, pluginId, ranges, reason, version, suggestDependencyUpdate) {
  let rangesText = truncateForDisplay(ranges.map(displayVersionRange).join(", "));
  let quotedId = quoteName(displaySafePluginId(pluginId));
  switch (reason) {
    case "disjoint":
      return `${targetLabel} ${quotedId} has conflicting version requirements (no version satisfies all of: ${rangesText})`;
    case "too-complex":
      return `${targetLabel} ${quotedId} has version requirements too complex to intersect \u2014 simplify the ranges: ${rangesText}`;
    case "invalid":
      return `${targetLabel} ${quotedId} has an invalid version requirement among: ${rangesText}`;
    case "installed-unsatisfied":
      return `${targetLabel} ${quotedId} is installed at ${version === undefined ? "an unknown version" : displayVersion(version)}, which does not satisfy: ${rangesText}${
        suggestDependencyUpdate
          ? `. To look for a version in range, ${runCommandHint("plugin update", pluginId, {
              fallback: "update that plugin",
            })}`
          : ""
      }`;
  }
}
//@ chunk-czx62zen.js:6960-7053 layout
/**
 * “插件没有满足约束的 git tag”的说明。
 */
function noMatchingTagMessage(targetLabel, pluginId, range) {
  let rangeText = truncateForDisplay(displayVersionRange(range));
  return `${targetLabel} ${quoteName(displaySafePluginId(pluginId))} has no git tag satisfying ${rangeText}`;
}
//@ chunk-czx62zen.js:7053-7146 layout
/**
 * 版本字符串（可 coerce）是否满足 semver 范围。
 */
function versionSatisfies(version, range) {
  let normalizedVersion = semverModule.valid(version) ?? semverModule.coerce(version)?.version;
  return normalizedVersion !== undefined && semverModule.satisfies(normalizedVersion, range);
}
//@ chunk-czx62zen.js:7146-7322 layout
/**
 * 收集所有已加载插件对某依赖 ID 的版本约束。
 */
function collectConstraintsOn(dependencyId, plugins) {
  let constraints = [];
  for (let plugin of plugins) {
    if (!plugin.depConstraints) continue;
    for (let [rawDependency, constraint] of plugin.depConstraints)
      if (qualifyDependency(rawDependency, plugin.source) === dependencyId) {
        constraints.push({
          plugin,
          constraint,
        });
        break;
      }
  }
  return constraints;
}
//@ chunk-czx62zen.js:7322-8079 fingerprint = resolveDependencyClosure (0.846)
/**
 * 解析安装一个插件需要的依赖闭包（DFS）：跨市场依赖只在根市场 allowCrossMarketplaceDependenciesOn 允许时接受；检测环；已安装的跳过。返回按安装顺序的 ID 列表或错误。
 */
async function resolveDependencyClosure(
  rootId,
  lookup,
  alreadyEnabled,
  allowedCrossMarketplaces = new Set(),
  forceInclude,
) {
  let rootMarketplace = parsePluginIdentifier(rootId).marketplace;
  let closure = [];
  let visited = new Set();
  let stack = [];
  async function walk(id, requiredBy) {
    if (id !== rootId && alreadyEnabled.has(id) && !forceInclude?.has(id)) return null;
    let idMarketplace = parsePluginIdentifier(id).marketplace;
    if (
      !alreadyEnabled.has(id) &&
      idMarketplace !== rootMarketplace &&
      !(idMarketplace && allowedCrossMarketplaces.has(idMarketplace))
    )
      return {
        ok: false,
        reason: "cross-marketplace",
        dependency: id,
        requiredBy,
      };
    if (stack.includes(id))
      return {
        ok: false,
        reason: "cycle",
        chain: [...stack, id],
      };
    if (visited.has(id)) return null;
    visited.add(id);
    let entry = await lookup(id);
    if (!entry) {
      if (id !== rootId && alreadyEnabled.has(id)) {
        logForDebugging(
          `resolveDependencyClosure: force-included ${id} has no catalog entry; skipping (pinner stays demoted)`,
        );
        return null;
      }
      return {
        ok: false,
        reason: "not-found",
        missing: id,
        requiredBy,
      };
    }
    stack.push(id);
    for (let rawDep of entry.dependencies ?? []) {
      let dep = qualifyDependency(rawDep, id);
      let err = await walk(dep, id);
      if (err) return err;
    }
    stack.pop();
    closure.push(id);
    return null;
  }
  let err = await walk(rootId, rootId);
  if (err) return err;
  return {
    ok: true,
    closure,
  };
}
//@ chunk-czx62zen.js:8079-9787 fingerprint = verifyAndDemote (0.749)
/**
 * 加载后的依赖校验：反复把依赖未满足（找不到、未启用、版本约束不符）的启用插件降级为禁用，直到不动点；返回被降级集合与 dependency-unsatisfied 错误。
 */
function verifyAndDemote(plugins) {
  let known = new Set(plugins.map((plugin) => plugin.source));
  let enabled = new Set(plugins.filter((plugin) => plugin.enabled).map((plugin) => plugin.source));
  let knownByName = new Map(plugins.map((plugin) => [plugin.source, plugin]));
  let knownByName_2 = new Set(plugins.map((plugin) => parsePluginIdentifier(plugin.source).name));
  let enabledByName = new Map();
  for (let id of enabled) {
    let n = parsePluginIdentifier(id).name;
    enabledByName.set(n, (enabledByName.get(n) ?? 0) + 1);
  }
  let errors = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (let plugin of plugins) {
      if (!enabled.has(plugin.source)) continue;
      for (let rawDep of plugin.manifest.dependencies ?? []) {
        let dependencyId = canonicalPluginId(qualifyDependency(rawDep, plugin.source));
        let isUnqualified = !parsePluginIdentifier(dependencyId).marketplace;
        let builtinId = isUnqualified ? builtinQualifiedId(dependencyId) : undefined;
        let inlineId = isUnqualified
          ? undefined
          : `${parsePluginIdentifier(dependencyId).name}@${INLINE_PLUGIN_MARKETPLACE}`;
        let inlineEnabled = inlineId !== undefined && !enabled.has(dependencyId) && enabled.has(inlineId);
        let dep = toSyncedDependencyId(dependencyId, plugin.source);
        let syncedEnabled =
          dep !== undefined && !enabled.has(dependencyId) && !inlineEnabled && enabled.has(dep);
        let satisfied = isUnqualified
          ? (enabledByName.get(dependencyId) ?? 0) > 0 || (builtinId !== undefined && enabled.has(builtinId))
          : enabled.has(dependencyId) || inlineEnabled || syncedEnabled;
        let failure;
        if (!satisfied) {
          let inlineKnown = inlineId !== undefined && !known.has(dependencyId) && known.has(inlineId);
          let syncedKnown = dep !== undefined && !known.has(dependencyId) && !inlineKnown && known.has(dep);
          failure = {
            type: "dependency-unsatisfied",
            source: plugin.source,
            plugin: plugin.name,
            dependency: inlineKnown ? inlineId : syncedKnown ? dep : dependencyId,
            reason: (
              isUnqualified
                ? knownByName_2.has(dependencyId) || (builtinId !== undefined && known.has(builtinId))
                : known.has(dependencyId) || inlineKnown || syncedKnown
            )
              ? "not-enabled"
              : "not-found",
          };
        } else if (!isUnqualified && !inlineEnabled) {
          let version = plugin.depConstraints?.get(rawDep)?.version;
          if (version !== undefined) {
            let effectiveId = syncedEnabled ? dep : dependencyId;
            let dependencyPlugin = knownByName.get(effectiveId);
            let installedVersion = dependencyPlugin?.resolvedVersion ?? dependencyPlugin?.manifest.version;
            if (
              !(syncedEnabled && installedVersion === undefined) &&
              !versionSatisfies(installedVersion, version)
            )
              failure = {
                type: "dependency-version-unsatisfied",
                source: plugin.source,
                plugin: plugin.name,
                dependency: effectiveId,
                required: version,
                installed: installedVersion,
              };
          }
        }
        if (failure) {
          enabled.delete(plugin.source);
          let pluginName = parsePluginIdentifier(plugin.source).name;
          let enabledCount = enabledByName.get(pluginName) ?? 0;
          if (enabledCount <= 1) enabledByName.delete(pluginName);
          else enabledByName.set(pluginName, enabledCount - 1);
          errors.push(failure);
          changed = true;
          break;
        }
      }
    }
  }
  let demoted = new Set(
    plugins.filter((plugin) => plugin.enabled && !enabled.has(plugin.source)).map((plugin) => plugin.source),
  );
  let syncedByName = new Map();
  for (let id of enabled) {
    let { name, marketplace } = parsePluginIdentifier(id);
    if (marketplace === SYNCED) syncedByName.set(nfcLower(name), id);
  }
  return {
    demoted,
    errors: errors.map((error) => {
      if (error.type !== "dependency-unsatisfied" || error.reason !== "not-found") return error;
      let { name, marketplace } = parsePluginIdentifier(error.dependency);
      let syncedId =
        marketplace === undefined ||
        isReservedMarketplaceName(marketplace.toLowerCase()) ||
        parsePluginIdentifier(error.source).marketplace === SYNCED
          ? undefined
          : syncedByName.get(nfcLower(name));
      return syncedId === undefined
        ? error
        : {
            ...error,
            sameNameSyncedPlugin: syncedId,
          };
    }),
  };
}
//@ chunk-czx62zen.js:9787-9836 layout
/**
 * 反向依赖插件名列表。
 */
function findReverseDependentNames(pluginId, plugins) {
  return findReverseDependents(pluginId, plugins).map((dependent) => dependent.name);
}
//@ chunk-czx62zen.js:9836-9971 fingerprint = findReverseDependents (0.826)
/**
 * 找出依赖给定插件的已启用插件（反向依赖），用于禁用/卸载时警告。
 */
function findReverseDependents(pluginId, plugins) {
  return plugins.filter(
    (plugin) =>
      plugin.enabled &&
      plugin.source !== pluginId &&
      (plugin.manifest.dependencies ?? []).some((rawDependency) =>
        dependencyRefMatches(qualifyDependency(rawDependency, plugin.source), pluginId, plugin.source),
      ),
  );
}
//@ chunk-czx62zen.js:9971-10110 placement
/**
 * 递归收集反向依赖（深度优先，去重）。
 */
function collectTransitiveDependents(pluginId, plugins) {
  let seen = new Set([pluginId]);
  let dependents = [];
  let visit = (pluginId) => {
    for (let { source } of findReverseDependents(pluginId, plugins)) {
      if (seen.has(source)) continue;
      seen.add(source);
      visit(source);
      dependents.push(source);
    }
  };
  visit(pluginId);
  return dependents;
}
//@ chunk-czx62zen.js:10110-10157 placement
/**
 * isDependencyAutoInstallState：依赖自动安装标记或记录数组。
 */
function isDependencyAutoInstallState(value) {
  return value === true || Array.isArray(value);
}
//@ chunk-czx62zen.js:10267-10903 placement
/**
 * 在某作用域已安装插件里找"作为依赖自动安装、但已没有显式安装插件需要"的孤儿：先确认都能加载（否则返回 unloadable），再从显式安装的插件沿 manifest.dependencies 做可达性遍历。返回 {orphans, unloadable, autoCount}。
 */
function findOrphanedAutoDependencies(plugins, pluginEntries, scope, projectPathForScope) {
  let manualIds = new Set();
  let autoIds = new Set();
  for (let [key, value] of Object.entries(plugins)) {
    let installation = installationAtTarget(value, scope, projectPathForScope);
    if (!installation) continue;
    if (installation.auto === true) autoIds.add(key);
    else manualIds.add(key);
  }
  if (autoIds.size === 0)
    return {
      orphans: new Set(),
      unloadable: [],
      autoCount: 0,
    };
  let bySource = new Map(pluginEntries.map((plugin) => [plugin.source, plugin]));
  let unloadable = [];
  for (let source of [...manualIds, ...autoIds]) if (!bySource.has(source)) unloadable.push(source);
  if (unloadable.length > 0)
    return {
      orphans: new Set(),
      unloadable,
      autoCount: autoIds.size,
    };
  let reachable = new Set();
  function markReachable(source) {
    if (reachable.has(source)) return;
    reachable.add(source);
    let plugin = bySource.get(source);
    if (!plugin) return;
    for (let rawDependency of plugin.manifest.dependencies ?? [])
      markReachable(qualifyDependency(rawDependency, plugin.source));
  }
  for (let source of manualIds) markReachable(source);
  let orphans = new Set();
  for (let source of autoIds) if (!reachable.has(source)) orphans.add(source);
  return {
    orphans,
    unloadable: [],
    autoCount: autoIds.size,
  };
}
//@ chunk-czx62zen.js:10903-11225 placement
/**
 * 生成提示 "N auto-installed dependencies no longer needed: …. Run claude plugin prune [--scope s] to remove."（最多列 5 个）。
 */
function formatOrphanedDependenciesNotice(orphans, scope) {
  if (orphans.size === 0) return "";
  let mapped = [...orphans].map((id) => displaySafeName(parsePluginIdentifier(id).name));
  let maxShown = 5;
  let namesText =
    mapped.length <= maxShown ? mapped.join(", ") : `${mapped.slice(0, maxShown).join(", ")}, \u2026`;
  let scopeArg = scope === "user" ? "" : ` --scope ${scope}`;
  return `
${orphans.size} auto-installed ${plural(orphans.size, "dependency", "dependencies")} no longer needed: ${namesText}. Run \`claude plugin prune${scopeArg}\` to remove.`;
}
//@ chunk-czx62zen.js:11225-11281 placement
/**
 * 展示名安全化：ye 是允许的展示名字符正则；Pe 是默认长度上限 64；bJr 是完整展示名的长度上限 256；E 是一次最多列出的段数 5。
 */
var SAFE_DISPLAY_NAME_RE = /^[A-Za-z0-9][-A-Za-z0-9._]*$/;
var MAX_SAFE_DISPLAY_NAME_CHARS = 64;
var MAX_DISPLAY_NAME_LENGTH = 256;
var MAX_DISPLAY_NAME_SEGMENTS = 5;
//@ chunk-czx62zen.js:11281-11380 placement
/**
 * 名字展示安全化：合规短名原样，否则截断并去掉不可见字符。
 */
function displaySafeName(name, maxLength = MAX_SAFE_DISPLAY_NAME_CHARS) {
  return name.length <= maxLength && SAFE_DISPLAY_NAME_RE.test(name)
    ? name
    : printableLabel(printableName(name.replace(LEADING_INVISIBLE_TEXT_RE, ""), 64)) || "\u201C\u201D";
}
//@ chunk-czx62zen.js:11380-11507 layout
/**
 * 插件 ID 展示安全化（name@marketplace 两段分别处理）。
 */
function displaySafePluginId(pluginId) {
  let { name, marketplace } = parsePluginIdentifier(pluginId);
  if (marketplace === undefined) return displaySafeName(name);
  return `${name}@${marketplace}` === pluginId
    ? `${displaySafeName(name)}@${displaySafeName(marketplace)}`
    : displaySafeName(pluginId);
}
//@ chunk-czx62zen.js:11507-11564 layout
/**
 * 给名字加引号用于提示文案（已以弯引号开头的不重复加）。
 */
function quoteName(name) {
  return name.startsWith("\u201C") ? name : `"${name}"`;
}
//@ chunk-czx62zen.js:11564-11767 fingerprint = formatDependencyCountSuffix (0.804)
/**
 * 生成“（并安装了 N 个依赖：a, b…）”后缀文本。
 */
function formatDependencyCountSuffix(installedDeps) {
  if (installedDeps.length === 0) return "";
  let count = installedDeps.length;
  let mapped = installedDeps
    .slice(0, MAX_DISPLAY_NAME_SEGMENTS)
    .map((installedDep) => displaySafeName(parsePluginIdentifier(installedDep).name));
  let namesText = count <= MAX_DISPLAY_NAME_SEGMENTS ? mapped.join(", ") : `${mapped.join(", ")}, \u2026`;
  return ` (+ ${count} ${plural(count, "dependency", "dependencies")}: ${namesText})`;
}
//@ chunk-czx62zen.js:11767-12170 layout
/**
 * 依赖找不到时的提示（“marketplace X 是否已添加？”）。
 */
function missingDependenciesHint(dependencyIds, marketplaceMissing) {
  if (dependencyIds.length === 0) return "";
  let count = dependencyIds.length;
  let found = marketplaceMissing
    .map((id) => parsePluginIdentifier(id).marketplace)
    .find((marketplace) => marketplace !== undefined);
  let marketplaceHint =
    found !== undefined
      ? ` Is the ${quoteName(displaySafeName(found, MAX_DISPLAY_NAME_LENGTH))} marketplace added?`
      : marketplaceMissing.length > 0
        ? " Add the dependency's marketplace, then re-run install."
        : "";
  let joined = dependencyIds.slice(0, MAX_DISPLAY_NAME_SEGMENTS).map(displaySafePluginId).join(", ");
  let idsText =
    count <= MAX_DISPLAY_NAME_SEGMENTS
      ? `${joined}.`
      : `${joined} and ${count - MAX_DISPLAY_NAME_SEGMENTS} more.`;
  return ` \u2014 ${count} ${plural(count, "dependency", "dependencies")} still unresolved: ${idsText}${marketplaceHint}`;
}
//@ chunk-czx62zen.js:12170-12277 fingerprint = formatReverseDependentsSuffix (1)
/**
 * 生成“ — warning: required by …”后缀文本。
 */
function formatReverseDependentsSuffix(rdeps) {
  if (!rdeps || rdeps.length === 0) return "";
  return ` \u2014 warning: required by ${rdeps.map(displaySafePluginId).join(", ")}`;
}
//@ chunk-e6aww6q8.js:4320708-4320786 fingerprint = getEnabledPluginIdsForScope (0.707)
/**
 * 构造把一组插件 ID 全部设为 false 的 enabledPlugins 补丁。
 */
function getEnabledPluginIdsForScope(settingSource) {
  return {
    enabledPlugins: Object.fromEntries(settingSource.map((id) => [id, false])),
  };
}
export {
  findOrphanedAutoDependencies,
  formatOrphanedDependenciesNotice,
  installationAtTarget,
  isSameInstallScope,
  intersectVersionConstraints,
  describeConstraintConflict,
  noMatchingTagMessage,
  isDependencyAutoInstallState,
  findMatchingInstallations,
  findReverseDependentNames,
  formatReverseDependentsSuffix,
  collectTransitiveDependents,
  collectConstraintsOn,
  readManifestDependencyPins,
  verifyAndDemote,
  formatDependencyCountSuffix,
  toSyncedDependencyId,
  qualifyDependency,
  getEnabledPluginIdsForScope,
  dependencyRefMatches,
  isSameNormalizedProjectPath,
  isStaleInstallTarget,
  findInstallationIndex,
  displaySafePluginId,
  quoteName,
  displaySafeName,
  MAX_DISPLAY_NAME_LENGTH,
  versionSatisfies,
  resolveDependencyClosure,
  missingDependenciesHint,
};
