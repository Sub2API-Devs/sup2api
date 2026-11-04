/**
 * utils/plugins/pluginPathContainment.ts
 *
 * 2.1.316 新增：插件路径包含检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (11)
 * attribution: placement 11
 */
import { resolve as resolve_2, join, sep } from "path";
import { lstat } from "fs/promises";
import { getFsImplementation } from "../fsOperations.js";
import { isProjectLocalPlugin } from "./pluginIdentifier.js";
import { isENOENT, getErrnoCode, errorMessage, isPathAbsent } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { redactUrlQuery, replaceAll } from "../redaction/urlRedaction.js";
import { isSubpathOf } from "../pathPrefix.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { ManifestLoadError, MANIFEST_ERROR_CLASSES } from "./pluginManifestRead.js";
import { getPlatform } from "../platform.js";
import { readJunction } from "../fsJunctions.js";
import { resolveWithinDir } from "./pluginLoader.js";

//@ chunk-e6aww6q8.js:597571-598239 placement
async function resolvePluginDirComponentPath(plugin, relPath) {
  let fsImplementation = getFsImplementation();
  let pluginRoot = isProjectLocalPlugin(plugin) ? resolve_2(plugin.path, "..", "..", "..") : plugin.path;
  let paths;
  try {
    paths = await Promise.all([
      fsImplementation.realpath(pluginRoot),
      fsImplementation.realpath(plugin.path),
      fsImplementation.realpath(join(plugin.path, relPath)),
    ]);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(
        `Skipping "${redactUrlQuery(relPath)}" for directory-loaded plugin "${plugin.name}": could not resolve it inside the plugin directory (${getErrnoCode(error) ?? replaceAll(errorMessage(error), join(plugin.path, relPath), join(plugin.path, redactUrlQuery(relPath)))}).`,
        {
          level: "warn",
        },
      );
    return null;
  }
  let [realRoot, realPlugin, realTarget] = paths;
  if (!isSubpathOf(realRoot, realPlugin, true) || !isSubpathOf(realPlugin, realTarget, false)) {
    logForDebugging(
      `Skipping "${redactUrlQuery(relPath)}" for directory-loaded plugin "${plugin.name}": it resolves outside the plugin directory (or the plugin directory resolves outside ${realRoot}), which a directory-loaded plugin may not reference here.`,
      {
        level: "warn",
      },
    );
    return null;
  }
  return realTarget;
}
//@ chunk-e6aww6q8.js:598239-598400 placement
async function resolveContainmentRoots(paths, boundary) {
  try {
    let fsImplementation = getFsImplementation();
    return {
      roots: await Promise.all(paths.map((path) => fsImplementation.realpath(path))),
      boundary,
    };
  } catch (error) {
    return {
      unresolvable: getErrnoCode(error) ?? errorMessage(error),
      boundary,
    };
  }
}
//@ chunk-e6aww6q8.js:598400-598982 placement
async function checkPathContained(anchor, fullPath) {
  if ("unresolvable" in anchor)
    return {
      kind: "escapes",
      reason: `the ${anchor.boundary} could not be resolved (${anchor.unresolvable})`,
    };
  if (fullPath.includes("\\"))
    return {
      kind: "escapes",
      reason: "its path contains a backslash, which is not resolved reliably on this platform",
    };
  let fsImplementation = getFsImplementation();
  let real;
  try {
    real = await fsImplementation.realpath(fullPath);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")
      return await classifyUnresolvablePath(fsImplementation, fullPath);
    return {
      kind: "escapes",
      reason: `it could not be resolved (${errnoCode ?? errorMessage(error)})`,
    };
  }
  if (!anchor.roots.some((root) => isSubpathOf(root, real, true)))
    return {
      kind: "escapes",
      reason: `it resolves to ${real}, outside the ${anchor.boundary}`,
    };
  return verifyResolvedIdentity(fsImplementation, fullPath, real);
}
//@ chunk-e6aww6q8.js:598982-599260 placement
async function classifyUnresolvablePath(fsImplementation, path) {
  try {
    await fsImplementation.stat(path);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")
      return {
        kind: "absent",
      };
    return {
      kind: "escapes",
      reason: `its existence could not be confirmed (${errnoCode ?? errorMessage(error)})`,
    };
  }
  return {
    kind: "escapes",
    reason: "it exists but could not be resolved as spelled",
  };
}
//@ chunk-e6aww6q8.js:599260-599728 placement
/**
 * 原路径与 realpath 结果 stat 身份一致才算 inside。
 */
async function verifyResolvedIdentity(fsImplementation, declaredPath, realPath) {
  let stats;
  try {
    stats = await Promise.all([
      fsImplementation.statBigint(declaredPath),
      fsImplementation.statBigint(realPath),
    ]);
  } catch (error) {
    return {
      kind: "escapes",
      reason: `its identity could not be verified (${getErrnoCode(error) ?? errorMessage(error)})`,
    };
  }
  let [declaredStat, realStat] = stats;
  if (declaredStat.ino === 0n || realStat.ino === 0n)
    return {
      kind: "escapes",
      reason: "its identity could not be verified (the filesystem reports no inode number)",
    };
  if (!getFileIdentity_2(declaredStat, realStat))
    return {
      kind: "escapes",
      reason: `it is read as a different file from the one it resolves to (${realPath})`,
    };
  return {
    kind: "inside",
    real: realPath,
  };
}
//@ chunk-e6aww6q8.js:599728-599782 placement (2.1.88 match: getFileIdentity, 0.794)
function getFileIdentity_2(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}
//@ chunk-e6aww6q8.js:4546074-4546424 placement
async function assertManifestContained(anchor, pluginPath, pluginName, manifestRelPath, noTelemetry) {
  if (anchor === undefined) return;
  let symlinkEscape = await findSymlinkEscape(anchor, pluginPath, manifestRelPath);
  if (symlinkEscape === undefined) return;
  if (!noTelemetry) logFeatureBad("plugin_load_manifest", "plugin_load_manifest_containment_refused");
  let manifestPath = join(pluginPath, manifestRelPath);
  let message = `Plugin ${pluginName}: did not read the manifest at ${manifestPath}: ${symlinkEscape}`;
  logForDebugging(message, {
    level: "error",
  });
  throw new ManifestLoadError(
    message,
    "plugin manifest not confirmed inside the plugin",
    MANIFEST_ERROR_CLASSES.containment,
    manifestPath,
    [symlinkEscape],
  );
}
//@ chunk-e6aww6q8.js:4546424-4546825 placement
async function findSymlinkEscape(anchor, pluginPath, relPath) {
  let current = pluginPath;
  let escaped = false;
  for (let segment of relPath.split(sep)) {
    current = join(current, segment);
    let stat;
    try {
      stat = await lstat(current);
    } catch (error) {
      if (isPathAbsent(error)) return;
      escaped = true;
      break;
    }
    if (stat.isSymbolicLink()) {
      escaped = true;
      break;
    }
    if (getPlatform() === "windows" && stat.isDirectory()) {
      switch ((await readJunction(current)).kind) {
        case "directory":
          break;
        case "absent":
          return;
        case "junction":
        case "error":
          escaped = true;
      }
      if (escaped) break;
    }
  }
  if (!escaped) return;
  let containment = await checkPathContained(anchor, join(pluginPath, relPath));
  return containment.kind === "escapes" ? containment.reason : undefined;
}
//@ chunk-e6aww6q8.js:4546825-4547120 placement
async function reportIfPathEscapes(anchor, pluginPath, relPath, options) {
  if (anchor === undefined) return false;
  let symlinkEscape = await findSymlinkEscape(anchor, pluginPath, relPath);
  if (symlinkEscape === undefined) return false;
  let fullPath = join(pluginPath, relPath);
  logForDebugging(`Plugin ${options.plugin}: did not read ${fullPath}: ${symlinkEscape}`, {
    level: "error",
  });
  options.errors.push({
    type: "path-traversal",
    source: options.source,
    plugin: options.plugin,
    path: fullPath,
    component: options.component,
    reason: symlinkEscape,
  });
  return true;
}
//@ chunk-e6aww6q8.js:4547120-4547437 placement
async function resolveComponentPath(resolvePath, anchor, pluginPath, relPath) {
  let fullPath = resolvePath(pluginPath, relPath);
  if (fullPath === null)
    return {
      fullPath: null,
      reason: undefined,
      real: undefined,
    };
  let containment = await checkPathContained(anchor, fullPath);
  switch (containment.kind) {
    case "escapes":
      return {
        fullPath: null,
        reason: containment.reason,
        real: undefined,
      };
    case "inside":
      return {
        fullPath,
        reason: undefined,
        real: containment.real,
      };
    case "absent":
      return {
        fullPath,
        reason: undefined,
        real: undefined,
      };
  }
}
//@ chunk-e6aww6q8.js:4547437-4547805 placement
function specCoversDefaultDir(spec, baseDir, defaultDir) {
  let sources = [];
  if (typeof spec === "string") sources.push(spec);
  else if (Array.isArray(spec)) {
    for (let item of spec) if (typeof item === "string") sources.push(item);
  } else if (spec && typeof spec === "object") {
    for (let value of Object.values(spec))
      if (value && typeof value === "object" && "source" in value && typeof value.source === "string")
        sources.push(value.source);
  }
  let dirPrefix = defaultDir + sep;
  return sources.some((source) => {
    let withinDir = resolveWithinDir(baseDir, source);
    return withinDir !== null && (withinDir + sep).startsWith(dirPrefix);
  });
}
export {
  assertManifestContained,
  resolveComponentPath,
  reportIfPathEscapes,
  resolveContainmentRoots,
  specCoversDefaultDir,
  resolvePluginDirComponentPath,
};
