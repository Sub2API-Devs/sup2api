/**
 * services/pluginEval/evalDir.ts
 *
 * 2.1.316 新增：plugin eval 评测目录的定位与校验（--eval-dir、manifest experimental.evals、插件声明的组件路径）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-af1hzzme.js (35)
 * attribution: placement 35
 */
import { default as path_2 } from "path";
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

//@ chunk-af1hzzme.js:40866-40979 placement
function toEvalPathError(parent, child, nfcKeyIfEnabled = identity) {
  let parentKey = nfcKeyIfEnabled(parent);
  let childKey = nfcKeyIfEnabled(child);
  return (
    path_2.relative(parentKey, childKey) !== "" &&
    isPathWithin(parentKey, childKey, {
      alreadyComparable: true,
      foldCase: false,
    })
  );
}
//@ chunk-af1hzzme.js:40979-41124 placement
function foldPathCase(segments, prefixSegments, mode) {
  let equals =
    mode === "folded"
      ? (left, right) => left.toLowerCase() === right.toLowerCase()
      : (left, right) => left === right;
  return (
    prefixSegments.length <= segments.length &&
    prefixSegments.every((prefixSegment, index) => equals(segments[index], prefixSegment))
  );
}
//@ chunk-af1hzzme.js:41124-41185 placement
/**
 * 判断两组路径段是否等长且完全相同。
 */
function isSameLengthAndPath(left, right) {
  return left.length === right.length && foldPathCase(left, right, "exact");
}
//@ chunk-af1hzzme.js:41185-41286 placement
/**
 * 判断路径段数组是否以另一段数组结尾（可大小写折叠比较）。
 */
function pathEndsWith(parts, suffix, foldMode = "exact") {
  return (
    suffix.length > 0 &&
    suffix.length <= parts.length &&
    foldPathCase(parts.slice(parts.length - suffix.length), suffix, foldMode)
  );
}
//@ chunk-af1hzzme.js:41286-41310 placement
/**
 * 恒等函数。
 */
function identity(value) {
  return value;
}
//@ chunk-af1hzzme.js:41310-41336 placement
/**
 * 读取文本文件时的最大字节数（1 MiB）。
 */
var EVALS_DIR_NAME = "evals";
var MAX_TEXT_FILE_BYTES = 1048576;
//@ chunk-af1hzzme.js:41336-41572 placement
/**
 * Windows 下非法文件名（结尾点/空格、冒号流、保留设备名）说明。
 */
function describeWindowsUnsafeName(segment) {
  if (!hasWindowsUnsafeSegment(segment)) return;
  return segment.endsWith(".") || segment.endsWith(" ")
    ? 'ends in "." or a space, which Windows treats as another name'
    : segment.includes(":")
      ? 'contains ":", a stream selector on Windows'
      : "is a reserved device name on Windows";
}
//@ chunk-af1hzzme.js:41572-42916 placement
/**
 * 校验 --eval-dir / manifest 中的评测目录：相对、在插件根内、非根本身。
 */
function validateEvalDirSetting(setting) {
  let trimmed = setting.trim();
  if (trimmed === "")
    return {
      ok: false,
      error: "must not be empty",
    };
  let replaced = trimmed.replaceAll("\\", "/");
  if (path_2.isAbsolute(trimmed) || path_2.posix.isAbsolute(replaced) || /^[A-Za-z]:/.test(trimmed))
    return {
      ok: false,
      error: "must be a relative path inside the plugin (e.g. quality/evals), not absolute",
    };
  let filtered = path_2
    .normalize(replaced)
    .split(path_2.sep)
    .filter((segment) => segment !== "" && segment !== ".");
  if (filtered.length === 0)
    return {
      ok: false,
      error: "must name a directory below the plugin root, not the root itself",
    };
  if (filtered.some((segment) => segment === ".."))
    return {
      ok: false,
      error: "must stay inside the plugin root (no ..)",
    };
  if (trimmed.length > 200 || filtered.length > 8)
    return {
      ok: false,
      error: "must be a short path (at most 200 characters, 8 segments)",
    };
  let found = filtered.find((segment) => !/^[A-Za-z0-9][A-Za-z0-9._@+-]*$/.test(segment));
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
  for (let segment of filtered) {
    let problem = describeWindowsUnsafeName(segment);
    if (problem !== undefined)
      return {
        ok: false,
        error: `${formatGuardValueJson(segment)} ${problem}`,
      };
  }
  if (evalDirExcludedSet.has(filtered[0].toLowerCase()))
    return {
      ok: false,
      error: `must not be inside the plugin's ${filtered[0]}/ directory (a loaded component directory)`,
    };
  let found_2 = filtered.find((segment) => SKIPPED_SUBDIR_NAMES.has(segment));
  if (found_2 !== undefined)
    return {
      ok: false,
      error: `must not pass through ${formatGuardValueJson(found_2)}, which case discovery always skips`,
    };
  return {
    ok: true,
    dir: filtered.join(path_2.sep),
    segments: filtered,
  };
}
//@ chunk-af1hzzme.js:42916-43010 placement
/**
 * 扫描时跳过的子目录（node_modules、.claude 等）。
 */
var EVAL_DIR_EXCLUDED_NAMES = [...PLUGIN_COMPONENT_DIRS, "bin"];
var evalDirExcludedSet = new Set(EVAL_DIR_EXCLUDED_NAMES);
var SKIPPED_SUBDIR_NAMES = new Set(["node_modules", ".claude", "results", "mocks"]);
//@ chunk-af1hzzme.js:43010-43076 placement
function isFromEvalDirFlag(evalDir) {
  return evalDir.source === "flag" ? ` --eval-dir ${displayDir(evalDir)}` : "";
}
//@ chunk-af1hzzme.js:43076-43148 placement
/**
 * 展示用目录（反斜杠统一成 /）。
 */
function displayDir(evalDir) {
  return (typeof evalDir === "string" ? evalDir : evalDir.dir).replaceAll("\\", "/");
}
//@ chunk-af1hzzme.js:43148-43647 placement
async function readPluginManifestAdvisory(request) {
  let manifestRead =
    request.pluginRoot === null
      ? {
          kind: "absent",
        }
      : await readPluginManifest(request.pluginRoot);
  let evalDirFromManifest = resolveEvalDirFromManifest(request.flag, manifestRead);
  let overlapRoot = request.overlapRoot === undefined ? request.pluginRoot : request.overlapRoot;
  if (!evalDirFromManifest.ok || overlapRoot === null) return evalDirFromManifest;
  let overlapManifest =
    overlapRoot === request.pluginRoot ? manifestRead : await readPluginManifest(overlapRoot);
  let checked = await checkEvalDirAgainstComponents(
    evalDirFromManifest,
    overlapManifest,
    overlapRoot,
    request,
  );
  if (!request.overlapAdvisory || checked === evalDirFromManifest) return checked;
  let observation = checked.ok
    ? (checked.observation ?? checked.value.componentOverlap)
    : checked.observation;
  return {
    ok: true,
    value: evalDirFromManifest.value,
    warning: [
      evalDirFromManifest.warning,
      observation === undefined
        ? undefined
        : `${observation} (advisory only: that manifest is not loaded for this run)`,
    ]
      .filter(Boolean)
      .join("; "),
  };
}
//@ chunk-af1hzzme.js:43647-46562 placement
/**
 * 检查评测目录不与插件声明的组件路径（commands/agents/skills 等）重叠。
 */
async function checkEvalDirAgainstComponents(evalDirFromManifest, manifestState, manifestPath, options) {
  if (manifestState.kind === "oversize") {
    let reason = `${escapeNonAscii(manifestState.manifestPath)} could not be read to check the plugin's declared component paths (${escapeNonAscii(manifestState.reason)})`;
    return evalDirFromManifest.value.source === "flag"
      ? options.writesToPlugin === false
        ? {
            ok: true,
            value: evalDirFromManifest.value,
            warning: `--eval-dir cannot be verified: ${reason}`,
            observation: `cannot be verified: ${reason}`,
          }
        : {
            ok: false,
            error: `--eval-dir cannot be verified: ${reason}`,
            observation: `cannot be verified: ${reason}`,
          }
      : {
          ok: true,
          value: {
            ...evalDirFromManifest.value,
            componentOverlap: reason,
            componentOverlapUnverifiable: true,
            componentOverlapRecourse: `make the plugin manifest readable first (${escapeNonAscii(manifestState.reason)})`,
          },
          warning: [evalDirFromManifest.warning, reason].filter(Boolean).join("; "),
        };
  }
  let overlapConsequence =
    options.writesToPlugin === false
      ? "discovery reads cases from a directory the plugin declares as a component location"
      : "files written there may be loaded as plugin components";
  let componentPaths = await describeComponentSymlink(manifestState, manifestPath);
  let overlapBase = options.overlapBase ?? [];
  let lower = overlapBase[0]?.toLowerCase();
  if (lower !== undefined && evalDirExcludedSet.has(lower)) {
    let overlapDescription = `${evalDirFromManifest.value.segments.join("/")}/ (under ${overlapBase.join("/")}/ of that plugin) sits inside the plugin's ${lower}/ component directory`;
    let recourse =
      options.writesToPlugin === false || options.forInit
        ? "run from the plugin root"
        : "run from the plugin root, or pass --output-dir";
    return evalDirFromManifest.value.source === "flag"
      ? options.writesToPlugin === false
        ? {
            ok: true,
            value: evalDirFromManifest.value,
            warning: `--eval-dir ${overlapDescription} \u2014 ${overlapConsequence}`,
            observation: overlapDescription,
          }
        : {
            ok: false,
            error: `--eval-dir ${overlapDescription} \u2014 ${recourse}`,
            observation: overlapDescription,
          }
      : {
          ok: true,
          value: {
            ...evalDirFromManifest.value,
            componentOverlap: overlapDescription,
            componentOverlapRecourse: recourse,
          },
          warning: [evalDirFromManifest.warning, `${overlapDescription} \u2014 ${overlapConsequence}`]
            .filter(Boolean)
            .join("; "),
        };
  }
  let overlap = describeComponentOverlap(
    componentPaths,
    [...overlapBase, ...evalDirFromManifest.value.segments],
    evalDirFromManifest.value.segments,
    overlapBase,
  );
  if (overlap === undefined) return evalDirFromManifest;
  let overlapsBaseDir =
    componentPaths.find(
      (componentPath) =>
        componentPath.kind === "dir" && foldPathCase(overlapBase, componentPath.segments, "folded"),
    ) !== undefined;
  let overlapRecourse = componentPaths.some(
    (componentPath) => componentPath.kind === "dir" && componentPath.segments.length === 0,
  )
    ? options.writesToPlugin === false || options.forInit
      ? "the manifest declares the whole plugin as a component location; narrow that declaration"
      : "the manifest declares the whole plugin as a component location; pass --output-dir (outside the plugin) or narrow that declaration"
    : overlapsBaseDir
      ? options.writesToPlugin === false || options.forInit
        ? "run from the plugin root"
        : "run from the plugin root, or pass --output-dir"
      : undefined;
  switch (evalDirFromManifest.value.source) {
    case "flag":
      return options.writesToPlugin === false
        ? {
            ok: true,
            value: evalDirFromManifest.value,
            warning: `--eval-dir ${overlap} \u2014 ${overlapConsequence}`,
            observation: overlap,
          }
        : {
            ok: false,
            error: `--eval-dir ${overlap}${overlapRecourse ? ` \u2014 ${overlapRecourse}` : ""}`,
            observation: overlap,
          };
    case "manifest": {
      if (options.writesToPlugin === false)
        return {
          ok: true,
          value: evalDirFromManifest.value,
          warning: `experimental.evals in ${escapeNonAscii(evalDirFromManifest.value.manifestPath)} ${overlap} \u2014 ${overlapConsequence}`,
          observation: overlap,
        };
      let fallbackDir = defaultEvalDir();
      let fallbackOverlap = describeComponentOverlap(
        componentPaths,
        [...overlapBase, ...fallbackDir.segments],
        fallbackDir.segments,
        overlapBase,
      );
      return {
        ok: true,
        value:
          fallbackOverlap === undefined
            ? fallbackDir
            : {
                ...fallbackDir,
                componentOverlap: fallbackOverlap,
                componentOverlapRecourse: overlapRecourse,
              },
        warning:
          `ignoring experimental.evals in ${escapeNonAscii(evalDirFromManifest.value.manifestPath)} \u2014 ${overlap}; using ${EVALS_DIR_NAME}/ (fix the manifest or pass --eval-dir)` +
          (fallbackOverlap === undefined ? "" : `; note ${fallbackOverlap} too \u2014 ${overlapConsequence}`),
      };
    }
    case "default":
      return {
        ok: true,
        value: {
          ...evalDirFromManifest.value,
          componentOverlap: overlap,
          componentOverlapRecourse: overlapRecourse,
        },
        warning: [
          evalDirFromManifest.warning,
          `${overlap} \u2014 ${overlapConsequence}; ${overlapRecourse ?? "pass --eval-dir to use another directory"}`,
        ]
          .filter(Boolean)
          .join("; "),
      };
  }
}
//@ chunk-af1hzzme.js:46562-48032 placement
function resolveEvalDirFromManifest(flag, manifestRead) {
  if (flag !== undefined) {
    let validated = validateEvalDirSetting(flag);
    return validated.ok
      ? {
          ok: true,
          value: {
            dir: validated.dir,
            segments: validated.segments,
            source: "flag",
          },
        }
      : {
          ok: false,
          error: `--eval-dir ${validated.error}`,
        };
  }
  if (manifestRead.kind === "absent")
    return {
      ok: true,
      value: defaultEvalDir(),
    };
  if (manifestRead.kind === "oversize" || manifestRead.kind === "broken")
    return {
      ok: true,
      value: defaultEvalDir(),
      warning: `could not read ${escapeNonAscii(manifestRead.manifestPath)} (${escapeNonAscii(manifestRead.reason)}); using ${EVALS_DIR_NAME}/`,
    };
  let component = classifyManifestComponentPath(manifestRead);
  if (component === null)
    return {
      ok: true,
      value: defaultEvalDir(),
    };
  if (component.kind === "wrongType")
    return {
      ok: true,
      value: defaultEvalDir(),
      warning: `ignoring ${component.misplaced ? 'the top-level "evals" key' : "experimental.evals"} ${component.raw} in ${escapeNonAscii(component.manifestPath)} \u2014 it must be a string naming a directory relative to the plugin root, set as "experimental": {"evals": "quality/evals"}; using ${EVALS_DIR_NAME}/ (fix the manifest or pass --eval-dir)`,
    };
  if (component.kind === "misplaced") {
    let validated = validateEvalDirSetting(component.value);
    return {
      ok: true,
      value: defaultEvalDir(),
      warning: validated.ok
        ? `ignoring the top-level "evals" key in ${escapeNonAscii(component.manifestPath)} \u2014 set it as "experimental": {"evals": ${formatGuardValueJson(component.value)}} (or pass --eval-dir); using ${EVALS_DIR_NAME}/`
        : `ignoring the top-level "evals" key in ${escapeNonAscii(component.manifestPath)} \u2014 it belongs under "experimental", and its value ${formatGuardValueJson(component.value)} ${validated.error}; using ${EVALS_DIR_NAME}/ (fix the manifest or pass --eval-dir)`,
    };
  }
  let validated = validateEvalDirSetting(component.value);
  if (!validated.ok)
    return {
      ok: true,
      value: defaultEvalDir(),
      warning: `ignoring experimental.evals ${formatGuardValueJson(component.value)} in ${escapeNonAscii(component.manifestPath)} \u2014 it ${validated.error}; using ${EVALS_DIR_NAME}/ (fix the manifest or pass --eval-dir)`,
    };
  return {
    ok: true,
    value: {
      dir: validated.dir,
      segments: validated.segments,
      source: "manifest",
      manifestPath: component.manifestPath,
    },
  };
}
//@ chunk-af1hzzme.js:48032-48092 placement
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
//@ chunk-af1hzzme.js:48092-48502 placement
/**
 * 读取插件 manifest 以围住其列出的套件；读不了则拒绝运行。
 */
async function readManifestToFenceSuites(pluginRoot) {
  let pluginManifest = await readPluginManifest(pluginRoot);
  if (pluginManifest.kind !== "ok") {
    if (pluginManifest.kind === "absent") return [];
    if (pluginManifest.kind === "broken") return [];
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `plugin eval: cannot read the plugin manifest (${escapeNonAscii(path_2.relative(pluginRoot, pluginManifest.manifestPath))}${pluginManifest.code ? `: ${pluginManifest.code}` : ""}) to fence the suites it lists \u2014 refusing to run`,
      "plugin eval: manifest unreadable when building the read fence",
    );
  }
  return collectEvalDirSettings([
    pluginManifest.raw,
    ...pluginManifest.candidates.map((candidate) => candidate.data),
  ]);
}
//@ chunk-af1hzzme.js:48502-48695 placement
function collectEvalDirSettings(candidates) {
  let segmentsList = [];
  for (let candidate of candidates)
    for (let readSetting of [experimentalEvalConfig, evalConfig]) {
      let setting = readSetting(candidate);
      let entries = Array.isArray(setting) ? setting : [setting];
      for (let entry of entries) {
        if (typeof entry !== "string") continue;
        let validated = validateEvalDirSetting(entry);
        if (validated.ok) segmentsList.push(validated.segments);
      }
    }
  return segmentsList;
}
//@ chunk-af1hzzme.js:48695-48876 placement
function findManifestField(manifest, readField) {
  let value = readField(manifest.raw);
  if (value !== undefined) return [value, manifest.manifestPath];
  for (let candidate of manifest.candidates) {
    let value = readField(candidate.data);
    if (value !== undefined) return [value, candidate.sourcePath];
  }
  return [undefined, manifest.manifestPath];
}
//@ chunk-af1hzzme.js:48876-48950 placement
/**
 * 从 evals 取评测配置。
 */
var experimentalEvalConfig = (raw) => (isPlainObject(raw.experimental) ? raw.experimental.evals : undefined);
var evalConfig = (raw) => raw.evals;
//@ chunk-af1hzzme.js:48950-49438 placement
function classifyManifestComponentPath(manifest) {
  let findField = (configKey) => findManifestField(manifest, configKey);
  let [experimentalValue, experimentalPath] = findField(experimentalEvalConfig);
  if (experimentalValue !== undefined) {
    let parsed = EvalsPathSchema().safeParse(experimentalValue);
    if (!parsed.success)
      return {
        kind: "wrongType",
        raw: formatGuardValue(experimentalValue),
        manifestPath: experimentalPath,
      };
    let firstEntry = pickFirstEvalsEntry(parsed.data, experimentalPath, true);
    return firstEntry === undefined
      ? {
          kind: "wrongType",
          raw: "[]",
          manifestPath: experimentalPath,
        }
      : {
          kind: "ok",
          value: firstEntry,
          manifestPath: experimentalPath,
        };
  }
  let [legacyValue, legacyPath] = findField(evalConfig);
  if (legacyValue === undefined) return null;
  let parsed = EvalsPathSchema().safeParse(legacyValue);
  let firstEntry = parsed.success ? pickFirstEvalsEntry(parsed.data, legacyPath, false) : undefined;
  return firstEntry === undefined
    ? {
        kind: "wrongType",
        raw: formatGuardValue(legacyValue),
        manifestPath: legacyPath,
        misplaced: true,
      }
    : {
        kind: "misplaced",
        value: firstEntry,
        manifestPath: legacyPath,
      };
}
//@ chunk-af1hzzme.js:49438-49781 placement
/**
 * 读取评测目录中的文本文件（须为仓库内路径、有大小上限）：不存在或路径不是目录时返回 fellThrough，过大或是目录返回 oversize 及原因。
 */
async function readEvalTextFile(root, filePath, label) {
  try {
    await checkRepoAuthoredPath(root, path_2.relative(root, filePath), label);
    let textFile = await readTextFile(filePath, MAX_TEXT_FILE_BYTES, label);
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
        reason: `${path_2.basename(filePath)} is a directory, not a file`,
      };
    return {
      kind: "oversize",
      reason: errorMessage(error),
      code: errnoCode,
    };
  }
}
//@ chunk-af1hzzme.js:49781-49969 placement
function readManifestCandidate(raw, pluginName, manifestPath) {
  return validatePluginManifest(raw, pluginName, {
    pluginName:
      path_2.basename(path_2.dirname(manifestPath)) === ".claude-plugin"
        ? path_2.basename(path_2.dirname(path_2.dirname(manifestPath)))
        : path_2.basename(path_2.dirname(manifestPath)),
    manifestPath,
  }).rawCandidate;
}
//@ chunk-af1hzzme.js:49969-50627 placement
async function readPluginManifest(pluginRoot) {
  let found = null;
  for (let relativePath of [path_2.join(".claude-plugin", "plugin.json"), "plugin.json"]) {
    let joined = path_2.join(pluginRoot, relativePath);
    let evalTextFile = await readEvalTextFile(pluginRoot, joined, "plugin manifest");
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
    let parsed;
    try {
      parsed = jsonParse(stripBom(evalTextFile.text));
    } catch (error) {
      return {
        kind: "broken",
        manifestPath: joined,
        reason: errorMessage(error),
      };
    }
    let manifestCandidate = readManifestCandidate(parsed, "plugin-json", joined);
    if (manifestCandidate === null || !isPlainObject(parsed))
      return {
        kind: "broken",
        manifestPath: joined,
        reason: "it is not a JSON object",
      };
    found = {
      manifestPath: joined,
      raw: parsed,
      candidates: [
        {
          sourcePath: joined,
          data: manifestCandidate,
        },
      ],
    };
    break;
  }
  let joined = path_2.join(pluginRoot, "SKILL.md");
  if (found !== null)
    return {
      kind: "ok",
      ...found,
    };
  return {
    kind: "absent",
  };
}
//@ chunk-af1hzzme.js:50627-50722 placement
/**
 * 目录里是否有 SKILL.md。
 */
async function hasSkillFile(dir) {
  return (await readEvalTextFile(dir, path_2.join(dir, "SKILL.md"), "SKILL.md")).kind !== "fellThrough";
}
//@ chunk-af1hzzme.js:50722-50846 placement
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
//@ chunk-af1hzzme.js:50846-50968 placement
function getManifestFieldValues(manifest, field) {
  let values = [];
  if (manifest[field] !== undefined) values.push(manifest[field]);
  let experimental = manifest.experimental;
  if (isPlainObject(experimental) && experimental[field] !== undefined) values.push(experimental[field]);
  return values;
}
//@ chunk-af1hzzme.js:50968-51650 placement
function listDeclaredComponentPaths(manifestInfo, manifestPath) {
  let paths = [];
  let addPath = (key, rawValue, kind) => {
    for (let resolved of resolveDeclaredPaths(manifestPath, rawValue)) {
      let segments = normalizePathSegments(resolved);
      if (kind === "file") {
        if (segments.length === 0) continue;
        paths.push({
          key,
          raw: rawValue,
          relative: resolved,
          segments: segments.slice(0, -1),
          kind,
          file: segments,
        });
      } else
        paths.push({
          key,
          raw: rawValue,
          relative: resolved,
          segments,
          kind,
        });
    }
  };
  for (let { data: candidateData } of manifestInfo.candidates) {
    let addFieldPaths = (fieldName, kind) => {
      for (let fieldValue of getManifestFieldValues(candidateData, fieldName))
        if (typeof fieldValue === "string") addPath(fieldName, fieldValue, kind);
        else if (Array.isArray(fieldValue)) {
          for (let entry of fieldValue) if (typeof entry === "string") addPath(fieldName, entry, kind);
        }
    };
    for (let dirKey of PLUGIN_COMPONENT_DIR_KEYS) addFieldPaths(dirKey, "dir");
    for (let fileKey of PLUGIN_COMPONENT_CONFIG_KEYS) addFieldPaths(fileKey, "file");
    for (let commandEntry of getManifestFieldValues(candidateData, "commands")) {
      if (!isPlainObject(commandEntry)) continue;
      for (let commandValue of Object.values(commandEntry)) {
        let commandPath =
          typeof commandValue === "string"
            ? commandValue
            : isPlainObject(commandValue) && typeof commandValue.source === "string"
              ? commandValue.source
              : undefined;
        if (commandPath === undefined) continue;
        addPath("commands", commandPath, "dir");
      }
    }
  }
  return paths;
}
//@ chunk-af1hzzme.js:51650-52015 placement
/**
 * 检查评测目录与插件声明的组件路径是否重叠（大小写折叠比较），重叠时返回说明。
 */
function describeComponentOverlap(components, segments, segments_2 = segments, overlapBase = []) {
  let found = components.find((component) =>
    component.kind === "dir"
      ? foldPathCase(segments, component.segments, "folded") ||
        foldPathCase(component.segments, segments, "folded")
      : foldPathCase(component.segments, segments, "folded") ||
        (component.file !== undefined && foldPathCase(segments, component.file, "folded")),
  );
  if (found === undefined) return;
  let underText = overlapBase.length > 0 ? ` (under ${overlapBase.join("/")}/ of that plugin)` : "";
  return `${segments_2.join("/")}/${underText} overlaps ${found.describe ?? `the plugin's declared ${found.key} path ${formatGuardValueJson(found.raw)}`}`;
}
//@ chunk-af1hzzme.js:52015-52587 placement
async function describeDeclaredComponentPath(paths, rootDir) {
  let rootReal;
  try {
    rootReal = await realpath(rootDir);
  } catch {
    return [];
  }
  let results = [];
  for (let componentPath of paths) {
    let componentReal;
    let joined = path_2.join(rootDir, ...componentPath.relative.split("/"));
    try {
      await checkRepoAuthoredPath(rootDir, componentPath.relative, "declared component path");
    } catch {
      continue;
    }
    try {
      componentReal = await realpath(joined);
    } catch {
      try {
        if (!(await lstat(joined)).isSymbolicLink()) continue;
        componentReal = path_2.resolve(path_2.dirname(joined), await readlink(joined));
      } catch {
        continue;
      }
    }
    let ancestorDir = toEvalPathError(rootReal, componentReal)
      ? rootReal
      : toEvalPathError(rootDir, componentReal)
        ? rootDir
        : null;
    if (ancestorDir === null) continue;
    let path = path_2.relative(ancestorDir, componentReal).replaceAll("\\", "/");
    if (path === componentPath.relative) continue;
    let segments = normalizePathSegments(path);
    results.push(
      componentPath.kind === "file"
        ? {
            ...componentPath,
            relative: path,
            segments: segments.slice(0, -1),
            file: segments,
          }
        : {
            ...componentPath,
            relative: path,
            segments,
          },
    );
  }
  return results;
}
//@ chunk-af1hzzme.js:52587-52771 placement
function resolveDeclaredPaths(pluginRoot, declaredPath) {
  let isWindows = getPlatform() === "windows";
  let resolved = new Set();
  for (let candidate of isWindows || !declaredPath.includes("\\")
    ? [declaredPath.replaceAll("\\", "/")]
    : [declaredPath, declaredPath.replaceAll("\\", "/")]) {
    let relativeToRoot = resolveRelativeToRoot(pluginRoot, candidate);
    if (relativeToRoot !== null) resolved.add(relativeToRoot);
  }
  return [...resolved];
}
//@ chunk-af1hzzme.js:52771-53026 placement
function resolveRelativeToRoot(relativeRoot, path) {
  if (path_2.isAbsolute(path) || path_2.posix.isAbsolute(path)) return null;
  let replaced = relativeRoot.replaceAll("\\", "/");
  let absoluteRoot = replaced.startsWith("/") ? replaced : `/${replaced}`;
  let resolved = path_2.posix.resolve(absoluteRoot, path);
  if (resolved === absoluteRoot) return "";
  let relativePath = path_2.posix.relative(absoluteRoot, resolved);
  return relativePath === "" || relativePath === ".." || relativePath.startsWith("../") ? null : relativePath;
}
//@ chunk-af1hzzme.js:53026-53128 placement
function normalizePathSegments(path) {
  return path
    .split("/")
    .map((segment) => segment.replace(/[. ]+$/, "").toLowerCase())
    .filter((segment) => segment !== "");
}
//@ chunk-af1hzzme.js:53128-53502 placement
async function describeComponentSymlink(manifestState, manifestPath) {
  let declaredPaths =
    manifestState.kind === "ok" ? listDeclaredComponentPaths(manifestState, manifestPath) : [];
  let allPaths = [...declaredPaths, ...(await describeDeclaredComponentPath(declaredPaths, manifestPath))];
  let results = await Promise.all(
    EVAL_DIR_EXCLUDED_NAMES.map((excludedName) =>
      lstat(path_2.join(manifestPath, excludedName)).catch(() => null),
    ),
  );
  let paths = EVAL_DIR_EXCLUDED_NAMES.flatMap((excludedName, excludedIndex) =>
    results[excludedIndex]?.isSymbolicLink()
      ? [
          {
            key: excludedName,
            raw: excludedName,
            relative: excludedName,
            segments: [excludedName.toLowerCase()],
            kind: "dir",
            describe: `the plugin's ${excludedName}/ component directory (a symlink there points at it)`,
          },
        ]
      : [],
  );
  allPaths.push(...(await describeDeclaredComponentPath(paths, manifestPath)));
  return allPaths;
}
//@ chunk-af1hzzme.js:53502-53749 placement
async function checkDeclaredComponentPaths(pluginRoot, segments) {
  let manifestState = await readPluginManifest(pluginRoot);
  switch (manifestState.kind) {
    case "oversize":
      return `${escapeNonAscii(manifestState.manifestPath)} could not be read to check the plugin's declared component paths (${escapeNonAscii(manifestState.reason)})`;
    case "ok":
    case "absent":
    case "broken":
      return describeComponentOverlap(await describeComponentSymlink(manifestState, pluginRoot), segments);
  }
}
//@ chunk-af1hzzme.js:53749-53943 placement
function pickFirstEvalsEntry(value, manifestPath, warnIfMany) {
  if (typeof value === "string") return value;
  if (warnIfMany && value.length > 1)
    logForDebugging(
      `plugin eval: ${escapeNonAscii(manifestPath)} "evals" lists ${value.length} entries; using the first (${formatGuardValueJson(value[0])}) as the case directory`,
    );
  return value[0];
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
