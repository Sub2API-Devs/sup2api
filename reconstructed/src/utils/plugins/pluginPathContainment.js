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
import {
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
} from "path";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
} from "fs/promises";
import { getFsImplementation } from "../fsOperations.js";
import { isProjectLocalPlugin } from "./pluginIdentifier.js";
import { isENOENT, getErrnoCode, errorMessage, isPathAbsent } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { redactUrlQuery, replaceAll } from "../redaction/urlRedaction.js";
import { hm } from "../pathPrefix.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { ManifestLoadError, MANIFEST_ERROR_CLASSES } from "./pluginManifestRead.js";
import { getPlatform } from "../platform.js";
import { readJunction } from "../fsJunctions.js";
import { resolveWithinDir } from "./pluginLoader.js";

//@ chunk-e6aww6q8.js:597571-598239 placement
async function resolvePluginDirComponentPath(e, n) {
  let r = getFsImplementation(),
    s = isProjectLocalPlugin(e) ? resolve_4(e.path, "..", "..", "..") : e.path,
    h;
  try {
    h = await Promise.all([r.realpath(s), r.realpath(e.path), r.realpath(join_8(e.path, n))]);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(
        `Skipping "${redactUrlQuery(n)}" for directory-loaded plugin "${e.name}": could not resolve it inside the plugin directory (${getErrnoCode(error) ?? replaceAll(errorMessage(error), join_8(e.path, n), join_8(e.path, redactUrlQuery(n)))}).`,
        { level: "warn" },
      );
    return null;
  }
  let [y, S, w] = h;
  if (!hm(y, S, !0) || !hm(S, w, !1))
    return (
      logForDebugging(
        `Skipping "${redactUrlQuery(n)}" for directory-loaded plugin "${e.name}": it resolves outside the plugin directory (or the plugin directory resolves outside ${y}), which a directory-loaded plugin may not reference here.`,
        { level: "warn" },
      ),
      null
    );
  return w;
}
//@ chunk-e6aww6q8.js:598239-598400 placement
async function resolveContainmentRoots(e, n) {
  try {
    let r = getFsImplementation();
    return { roots: await Promise.all(e.map((s) => r.realpath(s))), boundary: n };
  } catch (error) {
    return { unresolvable: getErrnoCode(error) ?? errorMessage(error), boundary: n };
  }
}
//@ chunk-e6aww6q8.js:598400-598982 placement
async function checkPathContained(e, n) {
  if ("unresolvable" in e)
    return { kind: "escapes", reason: `the ${e.boundary} could not be resolved (${e.unresolvable})` };
  if (n.includes("\\"))
    return {
      kind: "escapes",
      reason: "its path contains a backslash, which is not resolved reliably on this platform",
    };
  let r = getFsImplementation(),
    s;
  try {
    s = await r.realpath(n);
  } catch (error) {
    let y = getErrnoCode(error);
    if (y === "ENOENT" || y === "ENOTDIR") return await classifyUnresolvablePath(r, n);
    return { kind: "escapes", reason: `it could not be resolved (${y ?? errorMessage(error)})` };
  }
  if (!e.roots.some((root) => hm(root, s, !0)))
    return { kind: "escapes", reason: `it resolves to ${s}, outside the ${e.boundary}` };
  return verifyResolvedIdentity(r, n, s);
}
//@ chunk-e6aww6q8.js:598982-599260 placement
async function classifyUnresolvablePath(e, n) {
  try {
    await e.stat(n);
  } catch (error) {
    let s = getErrnoCode(error);
    if (s === "ENOENT" || s === "ENOTDIR") return { kind: "absent" };
    return { kind: "escapes", reason: `its existence could not be confirmed (${s ?? errorMessage(error)})` };
  }
  return { kind: "escapes", reason: "it exists but could not be resolved as spelled" };
}
/**
 * 原路径与 realpath 结果 stat 身份一致才算 inside。
 */
//@ chunk-e6aww6q8.js:599260-599728 placement
async function verifyResolvedIdentity(e, n, r) {
  let s;
  try {
    s = await Promise.all([e.statBigint(n), e.statBigint(r)]);
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
    return { kind: "escapes", reason: `it is read as a different file from the one it resolves to (${r})` };
  return { kind: "inside", real: r };
}
//@ chunk-e6aww6q8.js:599728-599782 placement = getFileIdentity (0.794)
function getFileIdentity_2(e, n) {
  return e.dev === n.dev && e.ino === n.ino;
}
//@ chunk-e6aww6q8.js:4546074-4546424 placement
async function assertManifestContained(e, n, r, s, h) {
  if (e === void 0) return;
  let y = await findSymlinkEscape(e, n, s);
  if (y === void 0) return;
  if (!h) logFeatureBad("plugin_load_manifest", "plugin_load_manifest_containment_refused");
  let S = join_9(n, s),
    w = `Plugin ${r}: did not read the manifest at ${S}: ${y}`;
  throw (
    logForDebugging(w, { level: "error" }),
    new ManifestLoadError(
      w,
      "plugin manifest not confirmed inside the plugin",
      MANIFEST_ERROR_CLASSES.containment,
      S,
      [y],
    )
  );
}
//@ chunk-e6aww6q8.js:4546424-4546825 placement
async function findSymlinkEscape(e, n, r) {
  let s = n,
    h = !1;
  for (let S of r.split(sep_8)) {
    s = join_9(s, S);
    let w;
    try {
      w = await lstat_3(s);
    } catch (error) {
      if (isPathAbsent(error)) return;
      h = !0;
      break;
    }
    if (w.isSymbolicLink()) {
      h = !0;
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
          h = !0;
      }
      if (h) break;
    }
  }
  if (!h) return;
  let y = await checkPathContained(e, join_9(n, r));
  return y.kind === "escapes" ? y.reason : void 0;
}
//@ chunk-e6aww6q8.js:4546825-4547120 placement
async function reportIfPathEscapes(e, n, r, s) {
  if (e === void 0) return !1;
  let h = await findSymlinkEscape(e, n, r);
  if (h === void 0) return !1;
  let y = join_9(n, r);
  return (
    logForDebugging(`Plugin ${s.plugin}: did not read ${y}: ${h}`, { level: "error" }),
    s.errors.push({
      type: "path-traversal",
      source: s.source,
      plugin: s.plugin,
      path: y,
      component: s.component,
      reason: h,
    }),
    !0
  );
}
//@ chunk-e6aww6q8.js:4547120-4547437 placement
async function resolveComponentPath(e, n, r, s) {
  let h = e(r, s);
  if (h === null) return { fullPath: null, reason: void 0, real: void 0 };
  let y = await checkPathContained(n, h);
  switch (y.kind) {
    case "escapes":
      return { fullPath: null, reason: y.reason, real: void 0 };
    case "inside":
      return { fullPath: h, reason: void 0, real: y.real };
    case "absent":
      return { fullPath: h, reason: void 0, real: void 0 };
  }
}
//@ chunk-e6aww6q8.js:4547437-4547805 placement
function specCoversDefaultDir(e, n, r) {
  let s = [];
  if (typeof e === "string") s.push(e);
  else if (Array.isArray(e)) {
    for (let y of e) if (typeof y === "string") s.push(y);
  } else if (e && typeof e === "object") {
    for (let y of Object.values(e))
      if (y && typeof y === "object" && "source" in y && typeof y.source === "string") s.push(y.source);
  }
  let h = r + sep_8;
  return s.some((y) => {
    let S = resolveWithinDir(n, y);
    return S !== null && (S + sep_8).startsWith(h);
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
