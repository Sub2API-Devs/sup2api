/**
 * services/pluginEval/evalDir.ts
 *
 * 2.1.316 新增：plugin eval 评测目录的定位与校验（--eval-dir、manifest experimental.evals、插件声明的组件路径）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (35)
 * attribution: placement 35
 */
import path, {
  default as path_2,
  default as path_3,
  default as path_4,
  default as path_5,
  default as path_6,
  default as path_7,
  default as path_8,
  default as path_9,
  default as path_10,
  default as path_11,
  default as path_12,
  default as path_13,
  default as path_14,
  default as path_15,
  default as path_16,
  default as path_17,
  default as path_18,
} from "path";
import {
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
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
  readlink,
  readlink as readlink_2,
  readlink as readlink_3,
  readlink as readlink_4,
  readlink as readlink_5,
} from "fs/promises";
import { isPathWithin } from "../../utils/fsJunctions.js";
import { hasWindowsUnsafeSegment } from "../../utils/windowsPathNames.js";
import { Rm, formatGuardValue, checkRepoAuthoredPath } from "../../cli/handlers/pluginEval/mockGuards.js";
import { PLUGIN_COMPONENT_DIRS } from "../../utils/plugins/commandSource.js";
import { escapeNonAscii } from "../../utils/resultError.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  errorMessage,
} from "../../utils/errors.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { EvalsPathSchema } from "../../utils/plugins/schemas.js";
import { tn } from "./caseSchema.js";
import { validatePluginManifest } from "../../utils/plugins/pluginManifestRead.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { Wo } from "../../utils/json.js";
import { getPlatform } from "../../utils/platform.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-qchp9vrd.js:39526-39639 placement
function toEvalPathError(e, n, r = wu) {
  let a = r(e),
    s = r(n);
  return path_6.relative(a, s) !== "" && isPathWithin(a, s, { alreadyComparable: !0, foldCase: !1 });
}
//@ chunk-qchp9vrd.js:39639-39784 placement
function foldPathCase(e, n, r) {
  let a = r === "folded" ? (s, h) => s.toLowerCase() === h.toLowerCase() : (s, h) => s === h;
  return n.length <= e.length && n.every((s, h) => a(e[h], s));
}
//@ chunk-qchp9vrd.js:39784-39845 placement
function ro(e, n) {
  return e.length === n.length && foldPathCase(e, n, "exact");
}
/**
 * 判断路径段数组是否以另一段数组结尾（可大小写折叠比较）。
 */
//@ chunk-qchp9vrd.js:39845-39946 placement
function pathEndsWith(e, n, r = "exact") {
  return n.length > 0 && n.length <= e.length && foldPathCase(e.slice(e.length - n.length), n, r);
}
//@ chunk-qchp9vrd.js:39946-39970 placement
function wu(e) {
  return e;
}
//@ chunk-qchp9vrd.js:39970-39996 placement
var EVALS_DIR_NAME = "evals",
  ao = 1048576;
/**
 * Windows 下非法文件名（结尾点/空格、冒号流、保留设备名）说明。
 */
//@ chunk-qchp9vrd.js:39996-40232 placement
function describeWindowsUnsafeName(e) {
  if (!hasWindowsUnsafeSegment(e)) return;
  return e.endsWith(".") || e.endsWith(" ")
    ? 'ends in "." or a space, which Windows treats as another name'
    : e.includes(":")
      ? 'contains ":", a stream selector on Windows'
      : "is a reserved device name on Windows";
}
/**
 * 校验 --eval-dir / manifest 中的评测目录：相对、在插件根内、非根本身。
 */
//@ chunk-qchp9vrd.js:40232-41576 placement
function validateEvalDirSetting(e) {
  let trimmed = e.trim();
  if (trimmed === "") return { ok: !1, error: "must not be empty" };
  let replaced = trimmed.replaceAll("\\", "/");
  if (path_5.isAbsolute(trimmed) || path_5.posix.isAbsolute(replaced) || /^[A-Za-z]:/.test(trimmed))
    return { ok: !1, error: "must be a relative path inside the plugin (e.g. quality/evals), not absolute" };
  let filtered = path_5
    .normalize(replaced)
    .split(path_5.sep)
    .filter((y) => y !== "" && y !== ".");
  if (filtered.length === 0)
    return { ok: !1, error: "must name a directory below the plugin root, not the root itself" };
  if (filtered.some((y) => y === "..")) return { ok: !1, error: "must stay inside the plugin root (no ..)" };
  if (trimmed.length > 200 || filtered.length > 8)
    return { ok: !1, error: "must be a short path (at most 200 characters, 8 segments)" };
  let found = filtered.find((y) => !/^[A-Za-z0-9][A-Za-z0-9._@+-]*$/.test(y));
  if (found !== void 0)
    return {
      ok: !1,
      error: `must use plain directory names (a letter or digit first, then letters, digits, . _ - @ +); ${Rm(found)} is not`,
    };
  let at = filtered.at(-1);
  if (/\.(md|ya?ml|json)$/i.test(at))
    return { ok: !1, error: `must name a directory, not a file (${Rm(at)})` };
  for (let y of filtered) {
    let R = describeWindowsUnsafeName(y);
    if (R !== void 0) return { ok: !1, error: `${Rm(y)} ${R}` };
  }
  if (zs.has(filtered[0].toLowerCase()))
    return {
      ok: !1,
      error: `must not be inside the plugin's ${filtered[0]}/ directory (a loaded component directory)`,
    };
  let found_2 = filtered.find((y) => hr.has(y));
  if (found_2 !== void 0)
    return { ok: !1, error: `must not pass through ${Rm(found_2)}, which case discovery always skips` };
  return { ok: !0, dir: filtered.join(path_5.sep), segments: filtered };
}
//@ chunk-qchp9vrd.js:41576-41670 placement
var EVAL_DIR_EXCLUDED_NAMES = [...PLUGIN_COMPONENT_DIRS, "bin"],
  zs = new Set(EVAL_DIR_EXCLUDED_NAMES),
  hr = new Set(["node_modules", ".claude", "results", "mocks"]);
//@ chunk-qchp9vrd.js:41670-41736 placement
function isFromEvalDirFlag(e) {
  return e.source === "flag" ? ` --eval-dir ${Cn(e)}` : "";
}
//@ chunk-qchp9vrd.js:41736-41808 placement
function Cn(e) {
  return (typeof e === "string" ? e : e.dir).replaceAll("\\", "/");
}
//@ chunk-qchp9vrd.js:41808-42307 placement
async function readPluginManifestAdvisory(e) {
  let n = e.pluginRoot === null ? { kind: "absent" } : await readPluginManifest(e.pluginRoot),
    r = resolveEvalDirFromManifest(e.flag, n),
    a = e.overlapRoot === void 0 ? e.pluginRoot : e.overlapRoot;
  if (!r.ok || a === null) return r;
  let s = a === e.pluginRoot ? n : await readPluginManifest(a),
    h = await checkEvalDirAgainstComponents(r, s, a, e);
  if (!e.overlapAdvisory || h === r) return h;
  let w = h.ok ? (h.observation ?? h.value.componentOverlap) : h.observation;
  return {
    ok: !0,
    value: r.value,
    warning: [
      r.warning,
      w === void 0 ? void 0 : `${w} (advisory only: that manifest is not loaded for this run)`,
    ]
      .filter(Boolean)
      .join("; "),
  };
}
/**
 * 检查评测目录不与插件声明的组件路径（commands/agents/skills 等）重叠。
 */
//@ chunk-qchp9vrd.js:42307-45222 placement
async function checkEvalDirAgainstComponents(e, n, r, a) {
  if (n.kind === "oversize") {
    let x = `${escapeNonAscii(n.manifestPath)} could not be read to check the plugin's declared component paths (${escapeNonAscii(n.reason)})`;
    return e.value.source === "flag"
      ? a.writesToPlugin === !1
        ? {
            ok: !0,
            value: e.value,
            warning: `--eval-dir cannot be verified: ${x}`,
            observation: `cannot be verified: ${x}`,
          }
        : { ok: !1, error: `--eval-dir cannot be verified: ${x}`, observation: `cannot be verified: ${x}` }
      : {
          ok: !0,
          value: {
            ...e.value,
            componentOverlap: x,
            componentOverlapUnverifiable: !0,
            componentOverlapRecourse: `make the plugin manifest readable first (${escapeNonAscii(n.reason)})`,
          },
          warning: [e.warning, x].filter(Boolean).join("; "),
        };
  }
  let s =
      a.writesToPlugin === !1
        ? "discovery reads cases from a directory the plugin declares as a component location"
        : "files written there may be loaded as plugin components",
    h = await describeComponentSymlink(n, r),
    w = a.overlapBase ?? [],
    b = w[0]?.toLowerCase();
  if (b !== void 0 && zs.has(b)) {
    let x = `${e.value.segments.join("/")}/ (under ${w.join("/")}/ of that plugin) sits inside the plugin's ${b}/ component directory`,
      j =
        a.writesToPlugin === !1 || a.forInit
          ? "run from the plugin root"
          : "run from the plugin root, or pass --output-dir";
    return e.value.source === "flag"
      ? a.writesToPlugin === !1
        ? { ok: !0, value: e.value, warning: `--eval-dir ${x} \u2014 ${s}`, observation: x }
        : { ok: !1, error: `--eval-dir ${x} \u2014 ${j}`, observation: x }
      : {
          ok: !0,
          value: { ...e.value, componentOverlap: x, componentOverlapRecourse: j },
          warning: [e.warning, `${x} \u2014 ${s}`].filter(Boolean).join("; "),
        };
  }
  let y = describeComponentOverlap(h, [...w, ...e.value.segments], e.value.segments, w);
  if (y === void 0) return e;
  let S = h.find((x) => x.kind === "dir" && foldPathCase(w, x.segments, "folded")) !== void 0,
    N = h.some((x) => x.kind === "dir" && x.segments.length === 0)
      ? a.writesToPlugin === !1 || a.forInit
        ? "the manifest declares the whole plugin as a component location; narrow that declaration"
        : "the manifest declares the whole plugin as a component location; pass --output-dir (outside the plugin) or narrow that declaration"
      : S
        ? a.writesToPlugin === !1 || a.forInit
          ? "run from the plugin root"
          : "run from the plugin root, or pass --output-dir"
        : void 0;
  switch (e.value.source) {
    case "flag":
      return a.writesToPlugin === !1
        ? { ok: !0, value: e.value, warning: `--eval-dir ${y} \u2014 ${s}`, observation: y }
        : { ok: !1, error: `--eval-dir ${y}${N ? ` \u2014 ${N}` : ""}`, observation: y };
    case "manifest": {
      if (a.writesToPlugin === !1)
        return {
          ok: !0,
          value: e.value,
          warning: `experimental.evals in ${escapeNonAscii(e.value.manifestPath)} ${y} \u2014 ${s}`,
          observation: y,
        };
      let x = Tn(),
        j = describeComponentOverlap(h, [...w, ...x.segments], x.segments, w);
      return {
        ok: !0,
        value: j === void 0 ? x : { ...x, componentOverlap: j, componentOverlapRecourse: N },
        warning:
          `ignoring experimental.evals in ${escapeNonAscii(e.value.manifestPath)} \u2014 ${y}; using ${EVALS_DIR_NAME}/ (fix the manifest or pass --eval-dir)` +
          (j === void 0 ? "" : `; note ${j} too \u2014 ${s}`),
      };
    }
    case "default":
      return {
        ok: !0,
        value: { ...e.value, componentOverlap: y, componentOverlapRecourse: N },
        warning: [e.warning, `${y} \u2014 ${s}; ${N ?? "pass --eval-dir to use another directory"}`]
          .filter(Boolean)
          .join("; "),
      };
  }
}
//@ chunk-qchp9vrd.js:45222-46692 placement
function resolveEvalDirFromManifest(e, n) {
  if (e !== void 0) {
    let s = validateEvalDirSetting(e);
    return s.ok
      ? { ok: !0, value: { dir: s.dir, segments: s.segments, source: "flag" } }
      : { ok: !1, error: `--eval-dir ${s.error}` };
  }
  if (n.kind === "absent") return { ok: !0, value: Tn() };
  if (n.kind === "oversize" || n.kind === "broken")
    return {
      ok: !0,
      value: Tn(),
      warning: `could not read ${escapeNonAscii(n.manifestPath)} (${escapeNonAscii(n.reason)}); using ${EVALS_DIR_NAME}/`,
    };
  let r = classifyManifestComponentPath(n);
  if (r === null) return { ok: !0, value: Tn() };
  if (r.kind === "wrongType")
    return {
      ok: !0,
      value: Tn(),
      warning: `ignoring ${r.misplaced ? 'the top-level "evals" key' : "experimental.evals"} ${r.raw} in ${escapeNonAscii(r.manifestPath)} \u2014 it must be a string naming a directory relative to the plugin root, set as "experimental": {"evals": "quality/evals"}; using ${EVALS_DIR_NAME}/ (fix the manifest or pass --eval-dir)`,
    };
  if (r.kind === "misplaced") {
    let s = validateEvalDirSetting(r.value);
    return {
      ok: !0,
      value: Tn(),
      warning: s.ok
        ? `ignoring the top-level "evals" key in ${escapeNonAscii(r.manifestPath)} \u2014 set it as "experimental": {"evals": ${Rm(r.value)}} (or pass --eval-dir); using ${EVALS_DIR_NAME}/`
        : `ignoring the top-level "evals" key in ${escapeNonAscii(r.manifestPath)} \u2014 it belongs under "experimental", and its value ${Rm(r.value)} ${s.error}; using ${EVALS_DIR_NAME}/ (fix the manifest or pass --eval-dir)`,
    };
  }
  let a = validateEvalDirSetting(r.value);
  if (!a.ok)
    return {
      ok: !0,
      value: Tn(),
      warning: `ignoring experimental.evals ${Rm(r.value)} in ${escapeNonAscii(r.manifestPath)} \u2014 it ${a.error}; using ${EVALS_DIR_NAME}/ (fix the manifest or pass --eval-dir)`,
    };
  return {
    ok: !0,
    value: { dir: a.dir, segments: a.segments, source: "manifest", manifestPath: r.manifestPath },
  };
}
//@ chunk-qchp9vrd.js:46692-46752 placement
function Tn() {
  return { dir: EVALS_DIR_NAME, segments: [EVALS_DIR_NAME], source: "default" };
}
/**
 * 读取插件 manifest 以围住其列出的套件；读不了则拒绝运行。
 */
//@ chunk-qchp9vrd.js:46752-47162 placement
async function readManifestToFenceSuites(e) {
  let n = await readPluginManifest(e);
  if (n.kind !== "ok") {
    if (n.kind === "absent") return [];
    if (n.kind === "broken") return [];
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `plugin eval: cannot read the plugin manifest (${escapeNonAscii(path_5.relative(e, n.manifestPath))}${n.code ? `: ${n.code}` : ""}) to fence the suites it lists \u2014 refusing to run`,
      "plugin eval: manifest unreadable when building the read fence",
    );
  }
  return collectEvalDirSettings([n.raw, ...n.candidates.map((candidate) => candidate.data)]);
}
//@ chunk-qchp9vrd.js:47162-47355 placement
function collectEvalDirSettings(e) {
  let n = [];
  for (let r of e)
    for (let a of [Ys, Xs]) {
      let s = a(r),
        h = Array.isArray(s) ? s : [s];
      for (let w of h) {
        if (typeof w !== "string") continue;
        let b = validateEvalDirSetting(w);
        if (b.ok) n.push(b.segments);
      }
    }
  return n;
}
//@ chunk-qchp9vrd.js:47355-47536 placement
function findManifestField(e, n) {
  let r = n(e.raw);
  if (r !== void 0) return [r, e.manifestPath];
  for (let candidate of e.candidates) {
    let s = n(candidate.data);
    if (s !== void 0) return [s, candidate.sourcePath];
  }
  return [void 0, e.manifestPath];
}
//@ chunk-qchp9vrd.js:47536-47610 placement
var Ys = (e) => (isPlainObject(e.experimental) ? e.experimental.evals : void 0),
  Xs = (e) => e.evals;
//@ chunk-qchp9vrd.js:47610-48098 placement
function classifyManifestComponentPath(e) {
  let n = (y) => findManifestField(e, y),
    [r, a] = n(Ys);
  if (r !== void 0) {
    let safeParse = EvalsPathSchema().safeParse(r);
    if (!safeParse.success) return { kind: "wrongType", raw: formatGuardValue(r), manifestPath: a };
    let R = pickFirstEvalsEntry(safeParse.data, a, !0);
    return R === void 0
      ? { kind: "wrongType", raw: "[]", manifestPath: a }
      : { kind: "ok", value: R, manifestPath: a };
  }
  let [s, h] = n(Xs);
  if (s === void 0) return null;
  let safeParse = EvalsPathSchema().safeParse(s),
    b = safeParse.success ? pickFirstEvalsEntry(safeParse.data, h, !1) : void 0;
  return b === void 0
    ? { kind: "wrongType", raw: formatGuardValue(s), manifestPath: h, misplaced: !0 }
    : { kind: "misplaced", value: b, manifestPath: h };
}
/**
 * 读取评测目录中的文本文件（须为仓库内路径、有大小上限）：不存在或路径不是目录时返回 fellThrough，过大或是目录返回 oversize 及原因。
 */
//@ chunk-qchp9vrd.js:48098-48441 placement
async function readEvalTextFile(e, n, r) {
  try {
    await checkRepoAuthoredPath(e, path_5.relative(e, n), r);
    let a = await tn(n, ao, r);
    return a === null ? { kind: "fellThrough" } : { kind: "text", text: a };
  } catch (error) {
    let s = getErrnoCode(error);
    if (s === "ENOTDIR") return { kind: "fellThrough" };
    if (s === "EISDIR")
      return { kind: "oversize", reason: `${path_5.basename(n)} is a directory, not a file` };
    return { kind: "oversize", reason: errorMessage(error), code: s };
  }
}
//@ chunk-qchp9vrd.js:48441-48629 placement
function readManifestCandidate(e, n, r) {
  return validatePluginManifest(e, n, {
    pluginName:
      path_5.basename(path_5.dirname(r)) === ".claude-plugin"
        ? path_5.basename(path_5.dirname(path_5.dirname(r)))
        : path_5.basename(path_5.dirname(r)),
    manifestPath: r,
  }).rawCandidate;
}
//@ chunk-qchp9vrd.js:48629-49287 placement
async function readPluginManifest(e) {
  let n = null;
  for (let a of [path_5.join(".claude-plugin", "plugin.json"), "plugin.json"]) {
    let joined = path_5.join(e, a),
      h = await readEvalTextFile(e, joined, "plugin manifest");
    if (h.kind === "fellThrough") continue;
    if (h.kind !== "text")
      return {
        kind: h.kind,
        manifestPath: joined,
        reason: h.reason,
        ...("code" in h && h.code !== void 0 && { code: h.code }),
      };
    let w;
    try {
      w = jsonParse(Wo(h.text));
    } catch (error) {
      return { kind: "broken", manifestPath: joined, reason: errorMessage(error) };
    }
    let b = readManifestCandidate(w, "plugin-json", joined);
    if (b === null || !isPlainObject(w))
      return { kind: "broken", manifestPath: joined, reason: "it is not a JSON object" };
    n = { manifestPath: joined, raw: w, candidates: [{ sourcePath: joined, data: b }] };
    break;
  }
  let joined = path_5.join(e, "SKILL.md");
  if (n !== null) return { kind: "ok", ...n };
  return { kind: "absent" };
}
//@ chunk-qchp9vrd.js:49287-49382 placement
async function qs(e) {
  return (await readEvalTextFile(e, path_5.join(e, "SKILL.md"), "SKILL.md")).kind !== "fellThrough";
}
//@ chunk-qchp9vrd.js:49382-49506 placement
var PLUGIN_COMPONENT_DIR_KEYS = [
    "commands",
    "agents",
    "skills",
    "outputStyles",
    "themes",
    "workflows",
    "monitors",
  ],
  PLUGIN_COMPONENT_CONFIG_KEYS = ["mcpServers", "lspServers", "hooks"];
//@ chunk-qchp9vrd.js:49506-49628 placement
function getManifestFieldValues(e, n) {
  let r = [];
  if (e[n] !== void 0) r.push(e[n]);
  let experimental = e.experimental;
  if (isPlainObject(experimental) && experimental[n] !== void 0) r.push(experimental[n]);
  return r;
}
//@ chunk-qchp9vrd.js:49628-50310 placement
function listDeclaredComponentPaths(e, n) {
  let r = [],
    a = (s, h, w) => {
      for (let b of resolveDeclaredPaths(n, h)) {
        let y = normalizePathSegments(b);
        if (w === "file") {
          if (y.length === 0) continue;
          r.push({ key: s, raw: h, relative: b, segments: y.slice(0, -1), kind: w, file: y });
        } else r.push({ key: s, raw: h, relative: b, segments: y, kind: w });
      }
    };
  for (let { data: s } of e.candidates) {
    let h = (w, b) => {
      for (let y of getManifestFieldValues(s, w))
        if (typeof y === "string") a(w, y, b);
        else if (Array.isArray(y)) {
          for (let R of y) if (typeof R === "string") a(w, R, b);
        }
    };
    for (let w of PLUGIN_COMPONENT_DIR_KEYS) h(w, "dir");
    for (let w of PLUGIN_COMPONENT_CONFIG_KEYS) h(w, "file");
    for (let w of getManifestFieldValues(s, "commands")) {
      if (!isPlainObject(w)) continue;
      for (let b of Object.values(w)) {
        let y =
          typeof b === "string" ? b : isPlainObject(b) && typeof b.source === "string" ? b.source : void 0;
        if (y === void 0) continue;
        a("commands", y, "dir");
      }
    }
  }
  return r;
}
/**
 * 检查评测目录与插件声明的组件路径是否重叠（大小写折叠比较），重叠时返回说明。
 */
//@ chunk-qchp9vrd.js:50310-50675 placement
function describeComponentOverlap(e, n, r = n, a = []) {
  let found = e.find((w) =>
    w.kind === "dir"
      ? foldPathCase(n, w.segments, "folded") || foldPathCase(w.segments, n, "folded")
      : foldPathCase(w.segments, n, "folded") || (w.file !== void 0 && foldPathCase(n, w.file, "folded")),
  );
  if (found === void 0) return;
  let h = a.length > 0 ? ` (under ${a.join("/")}/ of that plugin)` : "";
  return `${r.join("/")}/${h} overlaps ${found.describe ?? `the plugin's declared ${found.key} path ${Rm(found.raw)}`}`;
}
//@ chunk-qchp9vrd.js:50675-51247 placement
async function describeDeclaredComponentPath(e, n) {
  let r;
  try {
    r = await realpath_2(n);
  } catch {
    return [];
  }
  let a = [];
  for (let s of e) {
    let h,
      joined = path_5.join(n, ...s.relative.split("/"));
    try {
      await checkRepoAuthoredPath(n, s.relative, "declared component path");
    } catch {
      continue;
    }
    try {
      h = await realpath_2(joined);
    } catch {
      try {
        if (!(await lstat_4(joined)).isSymbolicLink()) continue;
        h = path_5.resolve(path_5.dirname(joined), await readlink(joined));
      } catch {
        continue;
      }
    }
    let b = toEvalPathError(r, h) ? r : toEvalPathError(n, h) ? n : null;
    if (b === null) continue;
    let replaced = path_5.relative(b, h).replaceAll("\\", "/");
    if (replaced === s.relative) continue;
    let R = normalizePathSegments(replaced);
    a.push(
      s.kind === "file"
        ? { ...s, relative: replaced, segments: R.slice(0, -1), file: R }
        : { ...s, relative: replaced, segments: R },
    );
  }
  return a;
}
//@ chunk-qchp9vrd.js:51247-51431 placement
function resolveDeclaredPaths(e, n) {
  let r = getPlatform() === "windows",
    a = new Set();
  for (let s of r || !n.includes("\\") ? [n.replaceAll("\\", "/")] : [n, n.replaceAll("\\", "/")]) {
    let h = resolveRelativeToRoot(e, s);
    if (h !== null) a.add(h);
  }
  return [...a];
}
//@ chunk-qchp9vrd.js:51431-51686 placement
function resolveRelativeToRoot(e, n) {
  if (path_5.isAbsolute(n) || path_5.posix.isAbsolute(n)) return null;
  let replaced = e.replaceAll("\\", "/"),
    a = replaced.startsWith("/") ? replaced : `/${replaced}`,
    resolved = path_5.posix.resolve(a, n);
  if (resolved === a) return "";
  let relativePath = path_5.posix.relative(a, resolved);
  return relativePath === "" || relativePath === ".." || relativePath.startsWith("../") ? null : relativePath;
}
//@ chunk-qchp9vrd.js:51686-51788 placement
function normalizePathSegments(e) {
  return e
    .split("/")
    .map((n) => n.replace(/[. ]+$/, "").toLowerCase())
    .filter((n) => n !== "");
}
//@ chunk-qchp9vrd.js:51788-52162 placement
async function describeComponentSymlink(e, n) {
  let r = e.kind === "ok" ? listDeclaredComponentPaths(e, n) : [],
    a = [...r, ...(await describeDeclaredComponentPath(r, n))],
    results = await Promise.all(
      EVAL_DIR_EXCLUDED_NAMES.map((w) => lstat_4(path_5.join(n, w)).catch(() => null)),
    ),
    flattened = EVAL_DIR_EXCLUDED_NAMES.flatMap((w, b) =>
      results[b]?.isSymbolicLink()
        ? [
            {
              key: w,
              raw: w,
              relative: w,
              segments: [w.toLowerCase()],
              kind: "dir",
              describe: `the plugin's ${w}/ component directory (a symlink there points at it)`,
            },
          ]
        : [],
    );
  return (a.push(...(await describeDeclaredComponentPath(flattened, n))), a);
}
//@ chunk-qchp9vrd.js:52162-52409 placement
async function checkDeclaredComponentPaths(e, n) {
  let r = await readPluginManifest(e);
  switch (r.kind) {
    case "oversize":
      return `${escapeNonAscii(r.manifestPath)} could not be read to check the plugin's declared component paths (${escapeNonAscii(r.reason)})`;
    case "ok":
    case "absent":
    case "broken":
      return describeComponentOverlap(await describeComponentSymlink(r, e), n);
  }
}
//@ chunk-qchp9vrd.js:52409-52603 placement
function pickFirstEvalsEntry(e, n, r) {
  if (typeof e === "string") return e;
  if (r && e.length > 1)
    logForDebugging(
      `plugin eval: ${escapeNonAscii(n)} "evals" lists ${e.length} entries; using the first (${Rm(e[0])}) as the case directory`,
    );
  return e[0];
}

export {
  EVALS_DIR_NAME,
  Cn,
  toEvalPathError,
  foldPathCase,
  ao,
  qs,
  pathEndsWith,
  ro,
  hr,
  readPluginManifestAdvisory,
  readManifestToFenceSuites,
  isFromEvalDirFlag,
  checkDeclaredComponentPaths,
  describeWindowsUnsafeName,
};
