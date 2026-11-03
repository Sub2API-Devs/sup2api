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
import path from "path";
import { realpath, lstat, readlink } from "fs/promises";
import { isPathWithin } from "../../utils/fsJunctions.js";
import { hasWindowsUnsafeSegment } from "../../utils/windowsPathNames.js";
import {
  formatGuardValueJson,
  formatGuardValue,
  checkRepoAuthoredPath,
} from "../../cli/handlers/pluginEval/mockGuards.js";
import { PLUGIN_COMPONENT_DIRS } from "../../utils/plugins/commandSource.js";
import { escapeNonAscii } from "../../utils/resultError.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  errorMessage,
} from "../../utils/errors.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { EvalsPathSchema } from "../../utils/plugins/schemas.js";
import { readTextFile } from "./caseSchema.js";
import { validatePluginManifest } from "../../utils/plugins/pluginManifestRead.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { stripBom } from "../../utils/json.js";
import { getPlatform } from "../../utils/platform.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-qchp9vrd.js:39526-39639 placement
function toEvalPathError(e, n, nfcKeyIfEnabled = identity) {
  let a = nfcKeyIfEnabled(e);
  let s = nfcKeyIfEnabled(n);
  return (
    path.relative(a, s) !== "" &&
    isPathWithin(a, s, {
      alreadyComparable: true,
      foldCase: false,
    })
  );
}
//@ chunk-qchp9vrd.js:39639-39784 placement
function foldPathCase(e, n, r) {
  let a = r === "folded" ? (s, h) => s.toLowerCase() === h.toLowerCase() : (s, h) => s === h;
  return n.length <= e.length && n.every((s, h) => a(e[h], s));
}
//@ chunk-qchp9vrd.js:39784-39845 placement
/**
 * 判断两组路径段是否等长且完全相同。
 */
function isSameLengthAndPath(e, n) {
  return e.length === n.length && foldPathCase(e, n, "exact");
}
//@ chunk-qchp9vrd.js:39845-39946 placement
/**
 * 判断路径段数组是否以另一段数组结尾（可大小写折叠比较）。
 */
function pathEndsWith(e, n, r = "exact") {
  return n.length > 0 && n.length <= e.length && foldPathCase(e.slice(e.length - n.length), n, r);
}
//@ chunk-qchp9vrd.js:39946-39970 placement
/**
 * 恒等函数。
 */
function identity(e) {
  return e;
}
//@ chunk-qchp9vrd.js:39970-39996 placement
/**
 * 读取文本文件时的最大字节数（1 MiB）。
 */
var EVALS_DIR_NAME = "evals";
var MAX_TEXT_FILE_BYTES = 1048576;
//@ chunk-qchp9vrd.js:39996-40232 placement
/**
 * Windows 下非法文件名（结尾点/空格、冒号流、保留设备名）说明。
 */
function describeWindowsUnsafeName(e) {
  if (!hasWindowsUnsafeSegment(e)) return;
  return e.endsWith(".") || e.endsWith(" ")
    ? 'ends in "." or a space, which Windows treats as another name'
    : e.includes(":")
      ? 'contains ":", a stream selector on Windows'
      : "is a reserved device name on Windows";
}
//@ chunk-qchp9vrd.js:40232-41576 placement
/**
 * 校验 --eval-dir / manifest 中的评测目录：相对、在插件根内、非根本身。
 */
function validateEvalDirSetting(e) {
  let trimmed = e.trim();
  if (trimmed === "")
    return {
      ok: false,
      error: "must not be empty",
    };
  let replaced = trimmed.replaceAll("\\", "/");
  if (path.isAbsolute(trimmed) || path.posix.isAbsolute(replaced) || /^[A-Za-z]:/.test(trimmed))
    return {
      ok: false,
      error: "must be a relative path inside the plugin (e.g. quality/evals), not absolute",
    };
  let filtered = path
    .normalize(replaced)
    .split(path.sep)
    .filter((y) => y !== "" && y !== ".");
  if (filtered.length === 0)
    return {
      ok: false,
      error: "must name a directory below the plugin root, not the root itself",
    };
  if (filtered.some((y) => y === ".."))
    return {
      ok: false,
      error: "must stay inside the plugin root (no ..)",
    };
  if (trimmed.length > 200 || filtered.length > 8)
    return {
      ok: false,
      error: "must be a short path (at most 200 characters, 8 segments)",
    };
  let found = filtered.find((y) => !/^[A-Za-z0-9][A-Za-z0-9._@+-]*$/.test(y));
  if (found !== undefined)
    return {
      ok: false,
      error: `must use plain directory names (a letter or digit first, then letters, digits, . _ - @ +); ${formatGuardValueJson(found)} is not`,
    };
  let last = filtered.at(-1);
  if (/\.(md|ya?ml|json)$/i.test(last))
    return {
      ok: false,
      error: `must name a directory, not a file (${formatGuardValueJson(last)})`,
    };
  for (let y of filtered) {
    let R = describeWindowsUnsafeName(y);
    if (R !== undefined)
      return {
        ok: false,
        error: `${formatGuardValueJson(y)} ${R}`,
      };
  }
  if (evalDirExcludedSet.has(filtered[0].toLowerCase()))
    return {
      ok: false,
      error: `must not be inside the plugin's ${filtered[0]}/ directory (a loaded component directory)`,
    };
  let found_2 = filtered.find((y) => SKIPPED_SUBDIR_NAMES.has(y));
  if (found_2 !== undefined)
    return {
      ok: false,
      error: `must not pass through ${formatGuardValueJson(found_2)}, which case discovery always skips`,
    };
  return {
    ok: true,
    dir: filtered.join(path.sep),
    segments: filtered,
  };
}
//@ chunk-qchp9vrd.js:41576-41670 placement
/**
 * 扫描时跳过的子目录（node_modules、.claude 等）。
 */
var EVAL_DIR_EXCLUDED_NAMES = [...PLUGIN_COMPONENT_DIRS, "bin"];
var evalDirExcludedSet = new Set(EVAL_DIR_EXCLUDED_NAMES);
var SKIPPED_SUBDIR_NAMES = new Set(["node_modules", ".claude", "results", "mocks"]);
//@ chunk-qchp9vrd.js:41670-41736 placement
function isFromEvalDirFlag(e) {
  return e.source === "flag" ? ` --eval-dir ${displayDir(e)}` : "";
}
//@ chunk-qchp9vrd.js:41736-41808 placement
/**
 * 展示用目录（反斜杠统一成 /）。
 */
function displayDir(e) {
  return (typeof e === "string" ? e : e.dir).replaceAll("\\", "/");
}
//@ chunk-qchp9vrd.js:41808-42307 placement
async function readPluginManifestAdvisory(e) {
  let n =
    e.pluginRoot === null
      ? {
          kind: "absent",
        }
      : await readPluginManifest(e.pluginRoot);
  let evalDirFromManifest = resolveEvalDirFromManifest(e.flag, n);
  let a = e.overlapRoot === undefined ? e.pluginRoot : e.overlapRoot;
  if (!evalDirFromManifest.ok || a === null) return evalDirFromManifest;
  let s = a === e.pluginRoot ? n : await readPluginManifest(a);
  let h = await checkEvalDirAgainstComponents(evalDirFromManifest, s, a, e);
  if (!e.overlapAdvisory || h === evalDirFromManifest) return h;
  let w = h.ok ? (h.observation ?? h.value.componentOverlap) : h.observation;
  return {
    ok: true,
    value: evalDirFromManifest.value,
    warning: [
      evalDirFromManifest.warning,
      w === undefined ? undefined : `${w} (advisory only: that manifest is not loaded for this run)`,
    ]
      .filter(Boolean)
      .join("; "),
  };
}
//@ chunk-qchp9vrd.js:42307-45222 placement
/**
 * 检查评测目录不与插件声明的组件路径（commands/agents/skills 等）重叠。
 */
async function checkEvalDirAgainstComponents(evalDirFromManifest, n, r, a) {
  if (n.kind === "oversize") {
    let x = `${escapeNonAscii(n.manifestPath)} could not be read to check the plugin's declared component paths (${escapeNonAscii(n.reason)})`;
    return evalDirFromManifest.value.source === "flag"
      ? a.writesToPlugin === false
        ? {
            ok: true,
            value: evalDirFromManifest.value,
            warning: `--eval-dir cannot be verified: ${x}`,
            observation: `cannot be verified: ${x}`,
          }
        : {
            ok: false,
            error: `--eval-dir cannot be verified: ${x}`,
            observation: `cannot be verified: ${x}`,
          }
      : {
          ok: true,
          value: {
            ...evalDirFromManifest.value,
            componentOverlap: x,
            componentOverlapUnverifiable: true,
            componentOverlapRecourse: `make the plugin manifest readable first (${escapeNonAscii(n.reason)})`,
          },
          warning: [evalDirFromManifest.warning, x].filter(Boolean).join("; "),
        };
  }
  let s =
    a.writesToPlugin === false
      ? "discovery reads cases from a directory the plugin declares as a component location"
      : "files written there may be loaded as plugin components";
  let h = await describeComponentSymlink(n, r);
  let overlapBase = a.overlapBase ?? [];
  let lower = overlapBase[0]?.toLowerCase();
  if (lower !== undefined && evalDirExcludedSet.has(lower)) {
    let x = `${evalDirFromManifest.value.segments.join("/")}/ (under ${overlapBase.join("/")}/ of that plugin) sits inside the plugin's ${lower}/ component directory`;
    let j =
      a.writesToPlugin === false || a.forInit
        ? "run from the plugin root"
        : "run from the plugin root, or pass --output-dir";
    return evalDirFromManifest.value.source === "flag"
      ? a.writesToPlugin === false
        ? {
            ok: true,
            value: evalDirFromManifest.value,
            warning: `--eval-dir ${x} \u2014 ${s}`,
            observation: x,
          }
        : {
            ok: false,
            error: `--eval-dir ${x} \u2014 ${j}`,
            observation: x,
          }
      : {
          ok: true,
          value: {
            ...evalDirFromManifest.value,
            componentOverlap: x,
            componentOverlapRecourse: j,
          },
          warning: [evalDirFromManifest.warning, `${x} \u2014 ${s}`].filter(Boolean).join("; "),
        };
  }
  let y = describeComponentOverlap(
    h,
    [...overlapBase, ...evalDirFromManifest.value.segments],
    evalDirFromManifest.value.segments,
    overlapBase,
  );
  if (y === undefined) return evalDirFromManifest;
  let S = h.find((x) => x.kind === "dir" && foldPathCase(overlapBase, x.segments, "folded")) !== undefined;
  let N = h.some((x) => x.kind === "dir" && x.segments.length === 0)
    ? a.writesToPlugin === false || a.forInit
      ? "the manifest declares the whole plugin as a component location; narrow that declaration"
      : "the manifest declares the whole plugin as a component location; pass --output-dir (outside the plugin) or narrow that declaration"
    : S
      ? a.writesToPlugin === false || a.forInit
        ? "run from the plugin root"
        : "run from the plugin root, or pass --output-dir"
      : undefined;
  switch (evalDirFromManifest.value.source) {
    case "flag":
      return a.writesToPlugin === false
        ? {
            ok: true,
            value: evalDirFromManifest.value,
            warning: `--eval-dir ${y} \u2014 ${s}`,
            observation: y,
          }
        : {
            ok: false,
            error: `--eval-dir ${y}${N ? ` \u2014 ${N}` : ""}`,
            observation: y,
          };
    case "manifest": {
      if (a.writesToPlugin === false)
        return {
          ok: true,
          value: evalDirFromManifest.value,
          warning: `experimental.evals in ${escapeNonAscii(evalDirFromManifest.value.manifestPath)} ${y} \u2014 ${s}`,
          observation: y,
        };
      let x = defaultEvalDir();
      let j = describeComponentOverlap(h, [...overlapBase, ...x.segments], x.segments, overlapBase);
      return {
        ok: true,
        value:
          j === undefined
            ? x
            : {
                ...x,
                componentOverlap: j,
                componentOverlapRecourse: N,
              },
        warning:
          `ignoring experimental.evals in ${escapeNonAscii(evalDirFromManifest.value.manifestPath)} \u2014 ${y}; using ${EVALS_DIR_NAME}/ (fix the manifest or pass --eval-dir)` +
          (j === undefined ? "" : `; note ${j} too \u2014 ${s}`),
      };
    }
    case "default":
      return {
        ok: true,
        value: {
          ...evalDirFromManifest.value,
          componentOverlap: y,
          componentOverlapRecourse: N,
        },
        warning: [
          evalDirFromManifest.warning,
          `${y} \u2014 ${s}; ${N ?? "pass --eval-dir to use another directory"}`,
        ]
          .filter(Boolean)
          .join("; "),
      };
  }
}
//@ chunk-qchp9vrd.js:45222-46692 placement
function resolveEvalDirFromManifest(flag, n) {
  if (flag !== undefined) {
    let s = validateEvalDirSetting(flag);
    return s.ok
      ? {
          ok: true,
          value: {
            dir: s.dir,
            segments: s.segments,
            source: "flag",
          },
        }
      : {
          ok: false,
          error: `--eval-dir ${s.error}`,
        };
  }
  if (n.kind === "absent")
    return {
      ok: true,
      value: defaultEvalDir(),
    };
  if (n.kind === "oversize" || n.kind === "broken")
    return {
      ok: true,
      value: defaultEvalDir(),
      warning: `could not read ${escapeNonAscii(n.manifestPath)} (${escapeNonAscii(n.reason)}); using ${EVALS_DIR_NAME}/`,
    };
  let r = classifyManifestComponentPath(n);
  if (r === null)
    return {
      ok: true,
      value: defaultEvalDir(),
    };
  if (r.kind === "wrongType")
    return {
      ok: true,
      value: defaultEvalDir(),
      warning: `ignoring ${r.misplaced ? 'the top-level "evals" key' : "experimental.evals"} ${r.raw} in ${escapeNonAscii(r.manifestPath)} \u2014 it must be a string naming a directory relative to the plugin root, set as "experimental": {"evals": "quality/evals"}; using ${EVALS_DIR_NAME}/ (fix the manifest or pass --eval-dir)`,
    };
  if (r.kind === "misplaced") {
    let s = validateEvalDirSetting(r.value);
    return {
      ok: true,
      value: defaultEvalDir(),
      warning: s.ok
        ? `ignoring the top-level "evals" key in ${escapeNonAscii(r.manifestPath)} \u2014 set it as "experimental": {"evals": ${formatGuardValueJson(r.value)}} (or pass --eval-dir); using ${EVALS_DIR_NAME}/`
        : `ignoring the top-level "evals" key in ${escapeNonAscii(r.manifestPath)} \u2014 it belongs under "experimental", and its value ${formatGuardValueJson(r.value)} ${s.error}; using ${EVALS_DIR_NAME}/ (fix the manifest or pass --eval-dir)`,
    };
  }
  let a = validateEvalDirSetting(r.value);
  if (!a.ok)
    return {
      ok: true,
      value: defaultEvalDir(),
      warning: `ignoring experimental.evals ${formatGuardValueJson(r.value)} in ${escapeNonAscii(r.manifestPath)} \u2014 it ${a.error}; using ${EVALS_DIR_NAME}/ (fix the manifest or pass --eval-dir)`,
    };
  return {
    ok: true,
    value: {
      dir: a.dir,
      segments: a.segments,
      source: "manifest",
      manifestPath: r.manifestPath,
    },
  };
}
//@ chunk-qchp9vrd.js:46692-46752 placement
/**
 * 默认的评测目录描述（evals 目录）。
 */
function defaultEvalDir() {
  return {
    dir: EVALS_DIR_NAME,
    segments: [EVALS_DIR_NAME],
    source: "default",
  };
}
//@ chunk-qchp9vrd.js:46752-47162 placement
/**
 * 读取插件 manifest 以围住其列出的套件；读不了则拒绝运行。
 */
async function readManifestToFenceSuites(e) {
  let pluginManifest = await readPluginManifest(e);
  if (pluginManifest.kind !== "ok") {
    if (pluginManifest.kind === "absent") return [];
    if (pluginManifest.kind === "broken") return [];
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `plugin eval: cannot read the plugin manifest (${escapeNonAscii(path.relative(e, pluginManifest.manifestPath))}${pluginManifest.code ? `: ${pluginManifest.code}` : ""}) to fence the suites it lists \u2014 refusing to run`,
      "plugin eval: manifest unreadable when building the read fence",
    );
  }
  return collectEvalDirSettings([
    pluginManifest.raw,
    ...pluginManifest.candidates.map((candidate) => candidate.data),
  ]);
}
//@ chunk-qchp9vrd.js:47162-47355 placement
function collectEvalDirSettings(e) {
  let n = [];
  for (let r of e)
    for (let a of [experimentalEvalConfig, evalConfig]) {
      let s = a(r);
      let h = Array.isArray(s) ? s : [s];
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
  if (r !== undefined) return [r, e.manifestPath];
  for (let candidate of e.candidates) {
    let s = n(candidate.data);
    if (s !== undefined) return [s, candidate.sourcePath];
  }
  return [undefined, e.manifestPath];
}
//@ chunk-qchp9vrd.js:47536-47610 placement
/**
 * 从 evals 取评测配置。
 */
var experimentalEvalConfig = (e) => (isPlainObject(e.experimental) ? e.experimental.evals : undefined);
var evalConfig = (e) => e.evals;
//@ chunk-qchp9vrd.js:47610-48098 placement
function classifyManifestComponentPath(e) {
  let n = (y) => findManifestField(e, y);
  let [r, a] = n(experimentalEvalConfig);
  if (r !== undefined) {
    let y = EvalsPathSchema().safeParse(r);
    if (!y.success)
      return {
        kind: "wrongType",
        raw: formatGuardValue(r),
        manifestPath: a,
      };
    let R = pickFirstEvalsEntry(y.data, a, true);
    return R === undefined
      ? {
          kind: "wrongType",
          raw: "[]",
          manifestPath: a,
        }
      : {
          kind: "ok",
          value: R,
          manifestPath: a,
        };
  }
  let [s, h] = n(evalConfig);
  if (s === undefined) return null;
  let w = EvalsPathSchema().safeParse(s);
  let b = w.success ? pickFirstEvalsEntry(w.data, h, false) : undefined;
  return b === undefined
    ? {
        kind: "wrongType",
        raw: formatGuardValue(s),
        manifestPath: h,
        misplaced: true,
      }
    : {
        kind: "misplaced",
        value: b,
        manifestPath: h,
      };
}
//@ chunk-qchp9vrd.js:48098-48441 placement
/**
 * 读取评测目录中的文本文件（须为仓库内路径、有大小上限）：不存在或路径不是目录时返回 fellThrough，过大或是目录返回 oversize 及原因。
 */
async function readEvalTextFile(e, n, r) {
  try {
    await checkRepoAuthoredPath(e, path.relative(e, n), r);
    let textFile = await readTextFile(n, MAX_TEXT_FILE_BYTES, r);
    return textFile === null
      ? {
          kind: "fellThrough",
        }
      : {
          kind: "text",
          text: textFile,
        };
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOTDIR")
      return {
        kind: "fellThrough",
      };
    if (errnoCode === "EISDIR")
      return {
        kind: "oversize",
        reason: `${path.basename(n)} is a directory, not a file`,
      };
    return {
      kind: "oversize",
      reason: errorMessage(error),
      code: errnoCode,
    };
  }
}
//@ chunk-qchp9vrd.js:48441-48629 placement
function readManifestCandidate(e, n, r) {
  return validatePluginManifest(e, n, {
    pluginName:
      path.basename(path.dirname(r)) === ".claude-plugin"
        ? path.basename(path.dirname(path.dirname(r)))
        : path.basename(path.dirname(r)),
    manifestPath: r,
  }).rawCandidate;
}
//@ chunk-qchp9vrd.js:48629-49287 placement
async function readPluginManifest(e) {
  let n = null;
  for (let a of [path.join(".claude-plugin", "plugin.json"), "plugin.json"]) {
    let joined = path.join(e, a);
    let evalTextFile = await readEvalTextFile(e, joined, "plugin manifest");
    if (evalTextFile.kind === "fellThrough") continue;
    if (evalTextFile.kind !== "text")
      return {
        kind: evalTextFile.kind,
        manifestPath: joined,
        reason: evalTextFile.reason,
        ...("code" in evalTextFile &&
          evalTextFile.code !== undefined && {
            code: evalTextFile.code,
          }),
      };
    let w;
    try {
      w = jsonParse(stripBom(evalTextFile.text));
    } catch (error) {
      return {
        kind: "broken",
        manifestPath: joined,
        reason: errorMessage(error),
      };
    }
    let manifestCandidate = readManifestCandidate(w, "plugin-json", joined);
    if (manifestCandidate === null || !isPlainObject(w))
      return {
        kind: "broken",
        manifestPath: joined,
        reason: "it is not a JSON object",
      };
    n = {
      manifestPath: joined,
      raw: w,
      candidates: [
        {
          sourcePath: joined,
          data: manifestCandidate,
        },
      ],
    };
    break;
  }
  let joined = path.join(e, "SKILL.md");
  if (n !== null)
    return {
      kind: "ok",
      ...n,
    };
  return {
    kind: "absent",
  };
}
//@ chunk-qchp9vrd.js:49287-49382 placement
/**
 * 目录里是否有 SKILL.md。
 */
async function hasSkillFile(e) {
  return (await readEvalTextFile(e, path.join(e, "SKILL.md"), "SKILL.md")).kind !== "fellThrough";
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
];
var PLUGIN_COMPONENT_CONFIG_KEYS = ["mcpServers", "lspServers", "hooks"];
//@ chunk-qchp9vrd.js:49506-49628 placement
function getManifestFieldValues(e, n) {
  let r = [];
  if (e[n] !== undefined) r.push(e[n]);
  let experimental = e.experimental;
  if (isPlainObject(experimental) && experimental[n] !== undefined) r.push(experimental[n]);
  return r;
}
//@ chunk-qchp9vrd.js:49628-50310 placement
function listDeclaredComponentPaths(e, n) {
  let r = [];
  let a = (key, h, w) => {
    for (let b of resolveDeclaredPaths(n, h)) {
      let y = normalizePathSegments(b);
      if (w === "file") {
        if (y.length === 0) continue;
        r.push({
          key,
          raw: h,
          relative: b,
          segments: y.slice(0, -1),
          kind: w,
          file: y,
        });
      } else
        r.push({
          key,
          raw: h,
          relative: b,
          segments: y,
          kind: w,
        });
    }
  };
  for (let { data: s } of e.candidates) {
    let h = (key, b) => {
      for (let y of getManifestFieldValues(s, key))
        if (typeof y === "string") a(key, y, b);
        else if (Array.isArray(y)) {
          for (let R of y) if (typeof R === "string") a(key, R, b);
        }
    };
    for (let w of PLUGIN_COMPONENT_DIR_KEYS) h(w, "dir");
    for (let w of PLUGIN_COMPONENT_CONFIG_KEYS) h(w, "file");
    for (let w of getManifestFieldValues(s, "commands")) {
      if (!isPlainObject(w)) continue;
      for (let b of Object.values(w)) {
        let y =
          typeof b === "string" ? b : isPlainObject(b) && typeof b.source === "string" ? b.source : undefined;
        if (y === undefined) continue;
        a("commands", y, "dir");
      }
    }
  }
  return r;
}
//@ chunk-qchp9vrd.js:50310-50675 placement
/**
 * 检查评测目录与插件声明的组件路径是否重叠（大小写折叠比较），重叠时返回说明。
 */
function describeComponentOverlap(e, n, segments = n, overlapBase = []) {
  let found = e.find((w) =>
    w.kind === "dir"
      ? foldPathCase(n, w.segments, "folded") || foldPathCase(w.segments, n, "folded")
      : foldPathCase(w.segments, n, "folded") || (w.file !== undefined && foldPathCase(n, w.file, "folded")),
  );
  if (found === undefined) return;
  let h = overlapBase.length > 0 ? ` (under ${overlapBase.join("/")}/ of that plugin)` : "";
  return `${segments.join("/")}/${h} overlaps ${found.describe ?? `the plugin's declared ${found.key} path ${formatGuardValueJson(found.raw)}`}`;
}
//@ chunk-qchp9vrd.js:50675-51247 placement
async function describeDeclaredComponentPath(e, n) {
  let r;
  try {
    r = await realpath(n);
  } catch {
    return [];
  }
  let a = [];
  for (let s of e) {
    let h;
    let joined = path.join(n, ...s.relative.split("/"));
    try {
      await checkRepoAuthoredPath(n, s.relative, "declared component path");
    } catch {
      continue;
    }
    try {
      h = await realpath(joined);
    } catch {
      try {
        if (!(await lstat(joined)).isSymbolicLink()) continue;
        h = path.resolve(path.dirname(joined), await readlink(joined));
      } catch {
        continue;
      }
    }
    let b = toEvalPathError(r, h) ? r : toEvalPathError(n, h) ? n : null;
    if (b === null) continue;
    let replaced = path.relative(b, h).replaceAll("\\", "/");
    if (replaced === s.relative) continue;
    let R = normalizePathSegments(replaced);
    a.push(
      s.kind === "file"
        ? {
            ...s,
            relative: replaced,
            segments: R.slice(0, -1),
            file: R,
          }
        : {
            ...s,
            relative: replaced,
            segments: R,
          },
    );
  }
  return a;
}
//@ chunk-qchp9vrd.js:51247-51431 placement
function resolveDeclaredPaths(e, n) {
  let r = getPlatform() === "windows";
  let a = new Set();
  for (let s of r || !n.includes("\\") ? [n.replaceAll("\\", "/")] : [n, n.replaceAll("\\", "/")]) {
    let relativeToRoot = resolveRelativeToRoot(e, s);
    if (relativeToRoot !== null) a.add(relativeToRoot);
  }
  return [...a];
}
//@ chunk-qchp9vrd.js:51431-51686 placement
function resolveRelativeToRoot(e, n) {
  if (path.isAbsolute(n) || path.posix.isAbsolute(n)) return null;
  let replaced = e.replaceAll("\\", "/");
  let a = replaced.startsWith("/") ? replaced : `/${replaced}`;
  let resolved = path.posix.resolve(a, n);
  if (resolved === a) return "";
  let relativePath = path.posix.relative(a, resolved);
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
  let r = e.kind === "ok" ? listDeclaredComponentPaths(e, n) : [];
  let a = [...r, ...(await describeDeclaredComponentPath(r, n))];
  let results = await Promise.all(
    EVAL_DIR_EXCLUDED_NAMES.map((w) => lstat(path.join(n, w)).catch(() => null)),
  );
  let flattened = EVAL_DIR_EXCLUDED_NAMES.flatMap((w, b) =>
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
  a.push(...(await describeDeclaredComponentPath(flattened, n)));
  return a;
}
//@ chunk-qchp9vrd.js:52162-52409 placement
async function checkDeclaredComponentPaths(e, n) {
  let pluginManifest = await readPluginManifest(e);
  switch (pluginManifest.kind) {
    case "oversize":
      return `${escapeNonAscii(pluginManifest.manifestPath)} could not be read to check the plugin's declared component paths (${escapeNonAscii(pluginManifest.reason)})`;
    case "ok":
    case "absent":
    case "broken":
      return describeComponentOverlap(await describeComponentSymlink(pluginManifest, e), n);
  }
}
//@ chunk-qchp9vrd.js:52409-52603 placement
function pickFirstEvalsEntry(e, n, r) {
  if (typeof e === "string") return e;
  if (r && e.length > 1)
    logForDebugging(
      `plugin eval: ${escapeNonAscii(n)} "evals" lists ${e.length} entries; using the first (${formatGuardValueJson(e[0])}) as the case directory`,
    );
  return e[0];
}
export {
  EVALS_DIR_NAME,
  displayDir,
  toEvalPathError,
  foldPathCase,
  MAX_TEXT_FILE_BYTES,
  hasSkillFile,
  pathEndsWith,
  isSameLengthAndPath,
  SKIPPED_SUBDIR_NAMES,
  readPluginManifestAdvisory,
  readManifestToFenceSuites,
  isFromEvalDirFlag,
  checkDeclaredComponentPaths,
  describeWindowsUnsafeName,
};
