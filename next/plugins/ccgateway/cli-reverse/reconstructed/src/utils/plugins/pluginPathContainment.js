/**
 * utils/plugins/pluginPathContainment.ts
 *
 * 2.1.316 新增：插件路径包含检查
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (14)
 * attribution: placement 11, layout 3
 */
import { resolve as resolve_2, join, sep, isAbsolute, normalize, extname } from "path";
import { lstat } from "fs/promises";
import { getFsImplementation } from "../fsOperations.js";
import { isProjectLocalPlugin } from "./pluginIdentifier.js";
import { isENOENT, getErrnoCode, errorMessage, isPathAbsent } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { redactUrlQuery, replaceAll } from "../redaction/urlRedaction.js";
import { isSubpathOf } from "../pathPrefix.js";
import { getPlatform } from "../platform.js";
import { readJunction } from "../fsJunctions.js";
import { hasDotDotSegment, hasDotDotWithSpaceSegment } from "../pathClassification.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { ManifestLoadError, MANIFEST_ERROR_CLASSES } from "./pluginManifestRead.js";
import { MAX_SKILL_MANIFEST_BYTES } from "./skillFolderPlugins.js";
import { resolveWithinDir } from "./pluginLoader.js";

//@ chunk-5xgkngpb.js:606519-607184 placement
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
//@ chunk-5xgkngpb.js:607184-607345 placement
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
//@ chunk-5xgkngpb.js:607345-607927 placement
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
//@ chunk-5xgkngpb.js:607927-608330 placement
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
//@ chunk-5xgkngpb.js:608330-608453 layout
async function findEscapeForRelPath(filesAnchor, path, relPath) {
  if (isAbsolute(relPath) || hasDotDotSegment(relPath) || hasDotDotWithSpaceSegment(relPath)) return {};
  let symlinkEscape = await findSymlinkEscape(filesAnchor, path, normalize(relPath));
  return symlinkEscape === undefined
    ? undefined
    : {
        reason: symlinkEscape,
      };
}
//@ chunk-5xgkngpb.js:608453-608856 layout
async function pathEscapeError(plugin, relPath, component) {
  if (plugin.filesAnchor === undefined) return;
  let escapeReason = await findEscapeForRelPath(plugin.filesAnchor, plugin.path, relPath);
  if (escapeReason === undefined) return;
  let shownPath =
    escapeReason.reason === undefined ? redactUrlQuery(relPath) : join(plugin.path, redactUrlQuery(relPath));
  logForDebugging(
    `Plugin ${plugin.name}: did not read ${shownPath}: ${escapeReason.reason ?? 'its path is absolute or has a ".." part'}`,
    {
      level: "warn",
    },
  );
  return {
    type: "path-traversal",
    source: plugin.repository,
    plugin: plugin.name,
    path: shownPath,
    component,
    ...(escapeReason.reason !== undefined && {
      reason: escapeReason.reason,
    }),
  };
}
//@ chunk-5xgkngpb.js:608856-609134 placement
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
//@ chunk-5xgkngpb.js:609134-609602 placement
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
//@ chunk-5xgkngpb.js:609602-609656 placement (2.1.88 match: getFileIdentity, 0.795)
function getFileIdentity_2(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}
//@ chunk-5xgkngpb.js:4653028-4653377 placement
async function assertManifestContained(containedIn, pluginPath, pluginName, manifestRelPath, noTelemetry) {
  if (containedIn === undefined) return;
  let symlinkEscape = await findSymlinkEscape(containedIn, pluginPath, manifestRelPath);
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
//@ chunk-5xgkngpb.js:4653377-4653670 placement
async function reportIfPathEscapes(anchor, pluginRoot, relPath, options) {
  if (anchor === undefined) return false;
  let symlinkEscape = await findSymlinkEscape(anchor, pluginRoot, relPath);
  if (symlinkEscape === undefined) return false;
  let fullPath = join(pluginRoot, relPath);
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
//@ chunk-5xgkngpb.js:4653670-4654661 layout
async function checkPluginContainment(plugin, errors) {
  let entriesAnchor = plugin.entriesAnchor;
  if (entriesAnchor === undefined) return;
  let fsImplementation = getFsImplementation();
  let componentPaths = [
    ["skills", [plugin.skillsPath, ...(plugin.skillsPaths ?? [])]],
    ["themes", [plugin.themesPath, ...(plugin.themesPaths ?? [])]],
    ["workflows", [plugin.workflowsPath, ...(plugin.workflowsPaths ?? [])]],
  ];
  for (let [component, paths] of componentPaths) {
    let errorSink = {
      errors,
      source: plugin.source,
      plugin: plugin.name,
      component,
    };
    let checked = new Map();
    for (let dirPath of paths) {
      if (dirPath === undefined) continue;
      if (component === "skills") {
        let skillFilePath = resolve_2(dirPath, "SKILL.md");
        let escapeReason = checked.get(skillFilePath);
        if (escapeReason === undefined) {
          escapeReason = await reportIfPathEscapes(entriesAnchor, dirPath, "SKILL.md", errorSink);
          checked.set(skillFilePath, escapeReason);
        }
        if (escapeReason) checked.set(resolve_2(skillFilePath, "SKILL.md"), true);
        else
          try {
            let stats = await fsImplementation.stat(skillFilePath);
            if (stats.isFile() && stats.size <= MAX_SKILL_MANIFEST_BYTES) continue;
          } catch (error) {
            if (!isENOENT(error)) continue;
          }
      }
      let dirEntries;
      try {
        dirEntries = await fsImplementation.readdir(dirPath);
      } catch {
        continue;
      }
      let sorted = dirEntries
        .flatMap((dirent) => {
          if (component === "skills")
            return dirent.isDirectory() || dirent.isSymbolicLink() ? [join(dirent.name, "SKILL.md")] : [];
          if (component === "themes") return extname(dirent.name) === ".json" ? [dirent.name] : [];
          return (dirent.isFile() || dirent.isSymbolicLink()) && dirent.name.endsWith(".js")
            ? [dirent.name]
            : [];
        })
        .sort();
      for (let relPath of sorted) {
        let fullPath = resolve_2(dirPath, relPath);
        if (!checked.has(fullPath))
          checked.set(fullPath, await reportIfPathEscapes(entriesAnchor, dirPath, relPath, errorSink));
      }
    }
  }
}
//@ chunk-5xgkngpb.js:4654661-4654978 placement
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
//@ chunk-5xgkngpb.js:4654978-4655346 placement
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
  findSymlinkEscape,
  checkPluginContainment,
  pathEscapeError,
  resolvePluginDirComponentPath,
  findEscapeForRelPath,
};
