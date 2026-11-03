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
async function resolvePluginDirComponentPath(e, n) {
  let fsImplementation = getFsImplementation();
  let s = isProjectLocalPlugin(e) ? resolve_2(e.path, "..", "..", "..") : e.path;
  let h;
  try {
    h = await Promise.all([
      fsImplementation.realpath(s),
      fsImplementation.realpath(e.path),
      fsImplementation.realpath(join(e.path, n)),
    ]);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(
        `Skipping "${redactUrlQuery(n)}" for directory-loaded plugin "${e.name}": could not resolve it inside the plugin directory (${getErrnoCode(error) ?? replaceAll(errorMessage(error), join(e.path, n), join(e.path, redactUrlQuery(n)))}).`,
        {
          level: "warn",
        },
      );
    return null;
  }
  let [y, S, w] = h;
  if (!isSubpathOf(y, S, true) || !isSubpathOf(S, w, false)) {
    logForDebugging(
      `Skipping "${redactUrlQuery(n)}" for directory-loaded plugin "${e.name}": it resolves outside the plugin directory (or the plugin directory resolves outside ${y}), which a directory-loaded plugin may not reference here.`,
      {
        level: "warn",
      },
    );
    return null;
  }
  return w;
}
//@ chunk-e6aww6q8.js:598239-598400 placement
async function resolveContainmentRoots(e, boundary) {
  try {
    let fsImplementation = getFsImplementation();
    return {
      roots: await Promise.all(e.map((s) => fsImplementation.realpath(s))),
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
async function checkPathContained(e, n) {
  if ("unresolvable" in e)
    return {
      kind: "escapes",
      reason: `the ${e.boundary} could not be resolved (${e.unresolvable})`,
    };
  if (n.includes("\\"))
    return {
      kind: "escapes",
      reason: "its path contains a backslash, which is not resolved reliably on this platform",
    };
  let fsImplementation = getFsImplementation();
  let s;
  try {
    s = await fsImplementation.realpath(n);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")
      return await classifyUnresolvablePath(fsImplementation, n);
    return {
      kind: "escapes",
      reason: `it could not be resolved (${errnoCode ?? errorMessage(error)})`,
    };
  }
  if (!e.roots.some((root) => isSubpathOf(root, s, true)))
    return {
      kind: "escapes",
      reason: `it resolves to ${s}, outside the ${e.boundary}`,
    };
  return verifyResolvedIdentity(fsImplementation, n, s);
}
//@ chunk-e6aww6q8.js:598982-599260 placement
async function classifyUnresolvablePath(fsImplementation, n) {
  try {
    await fsImplementation.stat(n);
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
async function verifyResolvedIdentity(fsImplementation, n, r) {
  let s;
  try {
    s = await Promise.all([fsImplementation.statBigint(n), fsImplementation.statBigint(r)]);
  } catch (error) {
    return {
      kind: "escapes",
      reason: `its identity could not be verified (${getErrnoCode(error) ?? errorMessage(error)})`,
    };
  }
  let [h, y] = s;
  if (h.ino === 0n || y.ino === 0n)
    return {
      kind: "escapes",
      reason: "its identity could not be verified (the filesystem reports no inode number)",
    };
  if (!getFileIdentity_2(h, y))
    return {
      kind: "escapes",
      reason: `it is read as a different file from the one it resolves to (${r})`,
    };
  return {
    kind: "inside",
    real: r,
  };
}
//@ chunk-e6aww6q8.js:599728-599782 placement = getFileIdentity (0.794)
function getFileIdentity_2(e, n) {
  return e.dev === n.dev && e.ino === n.ino;
}
//@ chunk-e6aww6q8.js:4546074-4546424 placement
async function assertManifestContained(containedIn, pluginPath, pluginName, s, noTelemetry) {
  if (containedIn === undefined) return;
  let symlinkEscape = await findSymlinkEscape(containedIn, pluginPath, s);
  if (symlinkEscape === undefined) return;
  if (!noTelemetry) logFeatureBad("plugin_load_manifest", "plugin_load_manifest_containment_refused");
  let manifestPath = join(pluginPath, s);
  let w = `Plugin ${pluginName}: did not read the manifest at ${manifestPath}: ${symlinkEscape}`;
  logForDebugging(w, {
    level: "error",
  });
  throw new ManifestLoadError(
    w,
    "plugin manifest not confirmed inside the plugin",
    MANIFEST_ERROR_CLASSES.containment,
    manifestPath,
    [symlinkEscape],
  );
}
//@ chunk-e6aww6q8.js:4546424-4546825 placement
async function findSymlinkEscape(e, n, r) {
  let s = n;
  let h = false;
  for (let S of r.split(sep)) {
    s = join(s, S);
    let w;
    try {
      w = await lstat(s);
    } catch (error) {
      if (isPathAbsent(error)) return;
      h = true;
      break;
    }
    if (w.isSymbolicLink()) {
      h = true;
      break;
    }
    if (getPlatform() === "windows" && w.isDirectory()) {
      switch ((await readJunction(s)).kind) {
        case "directory":
          break;
        case "absent":
          return;
        case "junction":
        case "error":
          h = true;
      }
      if (h) break;
    }
  }
  if (!h) return;
  let y = await checkPathContained(e, join(n, r));
  return y.kind === "escapes" ? y.reason : undefined;
}
//@ chunk-e6aww6q8.js:4546825-4547120 placement
async function reportIfPathEscapes(e, pluginPath, r, s) {
  if (e === undefined) return false;
  let symlinkEscape = await findSymlinkEscape(e, pluginPath, r);
  if (symlinkEscape === undefined) return false;
  let y = join(pluginPath, r);
  logForDebugging(`Plugin ${s.plugin}: did not read ${y}: ${symlinkEscape}`, {
    level: "error",
  });
  s.errors.push({
    type: "path-traversal",
    source: s.source,
    plugin: s.plugin,
    path: y,
    component: s.component,
    reason: symlinkEscape,
  });
  return true;
}
//@ chunk-e6aww6q8.js:4547120-4547437 placement
async function resolveComponentPath(e, anchor, pluginPath, s) {
  let h = e(pluginPath, s);
  if (h === null)
    return {
      fullPath: null,
      reason: undefined,
      real: undefined,
    };
  let y = await checkPathContained(anchor, h);
  switch (y.kind) {
    case "escapes":
      return {
        fullPath: null,
        reason: y.reason,
        real: undefined,
      };
    case "inside":
      return {
        fullPath: h,
        reason: undefined,
        real: y.real,
      };
    case "absent":
      return {
        fullPath: h,
        reason: undefined,
        real: undefined,
      };
  }
}
//@ chunk-e6aww6q8.js:4547437-4547805 placement
function specCoversDefaultDir(e, pluginPath, r) {
  let s = [];
  if (typeof e === "string") s.push(e);
  else if (Array.isArray(e)) {
    for (let y of e) if (typeof y === "string") s.push(y);
  } else if (e && typeof e === "object") {
    for (let y of Object.values(e))
      if (y && typeof y === "object" && "source" in y && typeof y.source === "string") s.push(y.source);
  }
  let h = r + sep;
  return s.some((y) => {
    let withinDir = resolveWithinDir(pluginPath, y);
    return withinDir !== null && (withinDir + sep).startsWith(h);
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
