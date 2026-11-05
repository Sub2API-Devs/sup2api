/**
 * services/pluginEval/caseSchema.ts
 *
 * 2.1.316 新增：plugin eval 用例格式：case.yaml / prompt.md frontmatter / graders 的 zod 模式与解析
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-af1hzzme.js (19)
 * attribution: placement 19
 */
import path from "path";
import { open, readdir } from "fs/promises";
import { constants } from "fs";
import {
  create_16,
  create_26,
  create_17,
  create,
  create_25,
  create_2,
  create_3,
  create_6,
  create_15,
  create_20,
  create_10,
} from "../../../vendor/zod/lib/index.mjs";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { ZodIssueCode } from "../../../vendor/zod/v3/ZodError.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isENOENT,
  getErrnoCode,
} from "../../utils/errors.js";
import { stripBom as stripBom_2 } from "../../utils/remoteFileState.js";
import { FRONTMATTER_REGEX } from "../../utils/frontmatterParser.js";
import { parseYaml } from "../../utils/yaml.js";
import { checkRepoAuthoredPath } from "../../cli/handlers/pluginEval/mockGuards.js";
import { getPlatform } from "../../utils/platform.js";
import { isSymlink, MAX_LAYERS } from "./mocks/mockResponders.js";
import { getFileKind } from "../../utils/fileKind.js";
import { deferInit, runDeferredInits } from "../../../runtime/deferred-init.js";

//@ chunk-af1hzzme.js:23353-23658 placement
/**
 * grader 的初始模板。
 */
var TODO_AGENT_PROMPT = "TODO: describe what the agent should do";
var TODO_CRITERIA_PROMPT = "TODO: describe what a successful response looks like";
var AGENT_PROMPT_TEMPLATE = `---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

TODO: describe what the agent should do
`;
var GRADER_TEMPLATE = `---
type: llm
weight: 1
---

TODO: describe what a successful response looks like
`;
//@ chunk-af1hzzme.js:23658-23676 placement
var CASE_SCHEMA_VERSION = 1;
var DEFAULT_SCHEMA_VERSION = "1.1";
//@ chunk-af1hzzme.js:23676-23812 placement
function graderInputSchema() {
  return create_16([
    create_26(["trace", "last_message", "files", "mock_calls"]),
    create_17("source", [
      create({
        source: create_25("file"),
        path: create_2(),
      }).strict(),
    ]),
  ]);
}
//@ chunk-af1hzzme.js:23812-23869 placement
function armSchema() {
  return create_26(["with-only", "both"]).optional();
}
//@ chunk-af1hzzme.js:23869-24953 placement
/**
 * 评分器定义模式（regex、last_message、文件、mock_calls、llm 等类型）。
 */
var GraderSchema; // deferred: uses graderInputSchema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-af1hzzme.js:23869", () => {
  GraderSchema = DoctorLazy(() =>
    create_17("type", [
      create({
        type: create_25("regex"),
        name: create_2(),
        target: graderInputSchema().default("last_message"),
        pattern: create_2(),
        flags: create_2()
          .regex(/^[dgimsuvy]*$/, "must be JS RegExp flags (d g i m s u v y)")
          .default(""),
        match: create_16([
          create_26(["contains", "not_contains"]),
          create_2().regex(/^count:\d+$/, "must be contains | not_contains | count:N"),
        ]).default("contains"),
        weight: create_3().positive().default(1),
        arm: armSchema(),
      }).strict(),
      create({
        type: create_25("tool_order"),
        name: create_2(),
        before: toolExpectationSchema(),
        after: toolExpectationSchema(),
        weight: create_3().positive().default(1),
        arm: armSchema(),
      }).strict(),
      create({
        type: create_25("tool_used"),
        name: create_2(),
        tool: create_2(),
        input_match: create_2().optional(),
        min: create_3().int().nonnegative().optional(),
        max: create_3().int().nonnegative().optional(),
        weight: create_3().positive().default(1),
        arm: armSchema(),
      }).strict(),
      create({
        type: create_25("file_exists"),
        name: create_2(),
        path: create_2(),
        exists: create_6().default(true),
        weight: create_3().positive().default(1),
        arm: armSchema(),
      }).strict(),
      create({
        type: create_25("llm"),
        name: create_2(),
        criteria: create_2(),
        focus: graderInputSchema().default("last_message"),
        weight: create_3().positive().default(1),
        arm: armSchema(),
      }).strict(),
      create({
        type: create_25("baseline"),
        name: create_2(),
        baseline_file: create_2(),
        criteria: create_2(),
        weight: create_3().positive().default(1),
        arm: armSchema(),
      }).strict(),
    ]),
  );
});
//@ chunk-af1hzzme.js:24953-25084 placement
function toolExpectationSchema() {
  return create_16([
    create_2().transform((tool) => ({
      tool,
      input_match: undefined,
    })),
    create({
      tool: create_2(),
      input_match: create_2().optional(),
    }).strict(),
  ]);
}
//@ chunk-af1hzzme.js:25084-26026 placement
var GradersListSchema; // deferred: uses GraderSchema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-af1hzzme.js:25084", () => {
  GradersListSchema = DoctorLazy(() =>
    create({
      schema_version: create_2(),
      name: create_2().min(1),
      description: create_2().optional(),
      tags: create_15(create_2()).default([]),
      plugins: create_15(create_2()).optional(),
      context: create({
        scaffold_script: create_2().optional(),
        history_file: create_2().optional(),
        add_dirs: create_15(create_2()).default([]),
      }).default({
        add_dirs: [],
      }),
      execution: create({
        prompt: create_2().optional(),
        max_turns: create_3().int().positive().max(200).default(10),
        timeout_seconds: create_3().int().positive().max(3600).default(300),
        model: create_2().optional(),
        allowed_tools: create_15(create_2()).default([]),
        disallowed_tools: create_15(create_2()).optional(),
        artifact_publish: create_6().optional(),
        growthbook_overrides: create_20(
          create_2(),
          create_16([create_6(), create_2(), create_3(), create_10()]),
        ).optional(),
        append_system_prompt: create_2().optional(),
        env: create_20(create_2(), create_2()).default({}),
      }),
      runs: create_3().int().positive().max(50).default(3),
      graders: create_15(GraderSchema())
        .min(1)
        .superRefine((graders, ctx) => {
          let seenNames = new Set();
          for (let grader of graders) {
            if (seenNames.has(grader.name))
              ctx.addIssue({
                code: ZodIssueCode.custom,
                message: `duplicate grader name "${grader.name}"`,
              });
            seenNames.add(grader.name);
          }
        }),
      expected_outcome: create_2().optional(),
    }),
  );
});
//@ chunk-af1hzzme.js:26026-27420 placement
/**
 * 校验 case.yaml：必须是对象且含 schema_version 等字段。
 */
function parseCaseYaml(raw) {
  if (typeof raw !== "object" || raw === null)
    return {
      ok: false,
      error: "case.yaml must be a YAML object",
    };
  let schemaVersion = raw.schema_version;
  if (typeof schemaVersion !== "string")
    return {
      ok: false,
      error: 'missing required field schema_version (e.g. "1.0")',
    };
  let schemaMajor = parseInt(firstLineOf(schemaVersion, "."), 10);
  if (Number.isNaN(schemaMajor))
    return {
      ok: false,
      error: `schema_version "${schemaVersion}" is not a valid version string`,
    };
  if (schemaMajor > CASE_SCHEMA_VERSION)
    return {
      ok: false,
      error: `schema_version "${schemaVersion}" requires a newer Claude Code (this binary supports up to ${CASE_SCHEMA_VERSION}.x)`,
    };
  let parsed = GradersListSchema().safeParse(raw);
  if (!parsed.success)
    return {
      ok: false,
      error: `invalid case.yaml:
${parsed.error.issues.map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`).join(`
`)}`,
    };
  if (!parsed.data.execution.prompt?.trim())
    return {
      ok: false,
      error: parsed.data.context.history_file
        ? "context.history_file requires execution.prompt (the resumed session needs a next turn)"
        : "execution.prompt is required (a prompt.md body, or execution.prompt in case.yaml)",
    };
  if (parsed.data.execution.prompt.includes(TODO_AGENT_PROMPT))
    return {
      ok: false,
      error: `the prompt is still the blank \`init\` template \u2014 replace the "${TODO_AGENT_PROMPT}" line with the user prompt to test (in prompt.md, or in execution.prompt if the case is written in case.yaml)`,
    };
  for (let grader of parsed.data.graders)
    if (
      ("criteria" in grader ? grader.criteria : "pattern" in grader ? grader.pattern : "").includes(
        TODO_CRITERIA_PROMPT,
      )
    )
      return {
        ok: false,
        error: `grader "${grader.name}" is still the blank \`init\` template \u2014 replace the "${TODO_CRITERIA_PROMPT}" line with concrete pass criteria`,
      };
  return {
    ok: true,
    case: parsed.data,
  };
}
//@ chunk-af1hzzme.js:27420-27688 placement
/**
 * 用例执行配置允许的键。
 */
var MAX_CASE_FILE_BYTES_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TOP_LEVEL_CASE_KEYS;
var EXECUTION_CASE_KEYS;
deferInit("chunk-af1hzzme.js:27420", () => {
  MAX_CASE_FILE_BYTES_2 = 1048576;
  TOP_LEVEL_CASE_KEYS = new Set([
    "schema_version",
    "name",
    "description",
    "tags",
    "plugins",
    "runs",
    "expected_outcome",
  ]);
  EXECUTION_CASE_KEYS = new Set([
    "model",
    "max_turns",
    "timeout_seconds",
    "allowed_tools",
    "disallowed_tools",
    "artifact_publish",
    "growthbook_overrides",
    "append_system_prompt",
    "env",
  ]);
});
//@ chunk-af1hzzme.js:27688-28901 placement
/**
 * 解析 prompt.md 的 frontmatter（graders、未知键报错）。
 */
async function parsePromptMdCase(caseDir) {
  let joined = path.join(caseDir, "prompt.md");
  let gradersDir = path.join(caseDir, "graders");
  let [text, gradersDir_2] = await Promise.all([readProseCase(joined), loadGradersDir(gradersDir)]);
  if (text === null && gradersDir_2.length === 0) return null;
  let caseBody = {
    top: {},
    execution: {},
    graders: [],
  };
  if (text !== null) {
    let { fm, body } = parseProseFrontmatter(text, joined);
    let trimmed = body.trim();
    if (trimmed.length > 0) caseBody.prompt = trimmed;
    for (let [key, value] of Object.entries(fm))
      if (TOP_LEVEL_CASE_KEYS.has(key)) caseBody.top[key] = value;
      else if (EXECUTION_CASE_KEYS.has(key)) caseBody.execution[key] = value;
      else
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${path.relative(caseDir, joined)}: unknown frontmatter key "${key}" (expected one of: ${[...TOP_LEVEL_CASE_KEYS, ...EXECUTION_CASE_KEYS].join(", ")})`,
          "prompt.md: unknown frontmatter key",
        );
  }
  let graderTexts = [];
  for (let graderPath of gradersDir_2) {
    let proseCase = await readProseCase(graderPath);
    if (proseCase === null)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path.basename(graderPath)} vanished from ${path.basename(path.dirname(graderPath))}/ while being read; try again`,
        "graders/: entry vanished during read",
      );
    graderTexts.push(proseCase);
  }
  for (let j = 0; j < gradersDir_2.length; j++) {
    let graderPath = gradersDir_2[j];
    let graderText = graderTexts[j];
    let { fm, body, hadFrontmatter } = parseProseFrontmatter(graderText, graderPath);
    if (!hadFrontmatter) continue;
    let name = path.basename(graderPath, ".md");
    if (typeof fm.type !== "string")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path.relative(caseDir, graderPath)}: frontmatter must include "type:" (regex | tool_order | tool_used | file_exists | llm | baseline)`,
        "grader .md: frontmatter missing type",
      );
    caseBody.graders.push(buildGraderEntry(name, fm, body.trim()));
  }
  if (
    caseBody.prompt === undefined &&
    caseBody.graders.length === 0 &&
    Object.keys(caseBody.top).length === 0 &&
    Object.keys(caseBody.execution).length === 0
  )
    return null;
  return caseBody;
}
//@ chunk-af1hzzme.js:28901-29333 placement
function normalizeCaseObject(caseYamlFile, promptMdCase, caseDir) {
  let yamlCase = caseYamlFile ?? {
    schema_version: DEFAULT_SCHEMA_VERSION,
    name: path.basename(caseDir),
  };
  let merged = {
    ...yamlCase,
    ...promptMdCase.top,
  };
  let execution =
    typeof yamlCase.execution === "object" && yamlCase.execution !== null ? yamlCase.execution : {};
  let disallowedTools = execution.disallowed_tools;
  let disallowedTools_2 = promptMdCase.execution.disallowed_tools;
  merged.execution = {
    ...execution,
    ...promptMdCase.execution,
    ...((disallowedTools !== undefined || disallowedTools_2 !== undefined) && {
      disallowed_tools: concatArrays(disallowedTools, disallowedTools_2),
    }),
    ...(promptMdCase.prompt !== undefined && {
      prompt: promptMdCase.prompt,
    }),
  };
  if (promptMdCase.graders.length > 0)
    merged.graders = [...(Array.isArray(yamlCase.graders) ? yamlCase.graders : []), ...promptMdCase.graders];
  return merged;
}
//@ chunk-af1hzzme.js:29333-29464 placement
function concatArrays(disallowedTools, disallowedTools_2) {
  if (disallowedTools === undefined) return disallowedTools_2;
  if (disallowedTools_2 === undefined) return disallowedTools;
  if (!Array.isArray(disallowedTools)) return disallowedTools;
  return Array.isArray(disallowedTools_2) ? [...disallowedTools, ...disallowedTools_2] : disallowedTools_2;
}
//@ chunk-af1hzzme.js:29464-29524 placement
/**
 * 评分器类型到其条件字段名的映射。
 */
var GRADER_FIELD_BY_TYPE = {
  llm: "criteria",
  baseline: "criteria",
  regex: "pattern",
};
//@ chunk-af1hzzme.js:29524-29656 placement
function buildGraderEntry(name, frontmatter, body) {
  let entry = {
    name,
    ...frontmatter,
  };
  let bodyField = typeof frontmatter.type === "string" ? GRADER_FIELD_BY_TYPE[frontmatter.type] : undefined;
  if (bodyField && entry[bodyField] === undefined && body.length > 0) entry[bodyField] = body;
  return entry;
}
//@ chunk-af1hzzme.js:29656-30368 placement
/**
 * 解析 .md 的 YAML frontmatter（未闭合、YAML 错误报告）。
 */
function parseProseFrontmatter(text, filePath) {
  text = stripBom_2(text);
  let match = text.match(FRONTMATTER_REGEX);
  if (!match) {
    if (/^---\s*\n/.test(text))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path.basename(filePath)}: unterminated frontmatter (opening "---" with no closing "---")`,
        "prose .md: unterminated frontmatter",
      );
    return {
      fm: {},
      body: text,
      hadFrontmatter: false,
    };
  }
  let frontmatter;
  try {
    frontmatter = parseYaml(match[1] ?? "");
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${path.basename(filePath)}: invalid YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
      "prose .md: invalid YAML frontmatter",
    );
  }
  if (frontmatter === null || frontmatter === undefined)
    return {
      fm: {},
      body: text.slice(match[0].length),
      hadFrontmatter: true,
    };
  if (typeof frontmatter !== "object" || Array.isArray(frontmatter))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${path.basename(filePath)}: frontmatter must be a YAML object`,
      "prose .md: frontmatter not a YAML object",
    );
  return {
    fm: frontmatter,
    body: text.slice(match[0].length),
    hadFrontmatter: true,
  };
}
//@ chunk-af1hzzme.js:30368-30441 placement
/**
 * 读取文本文件（跟随链接），失败返回 null。
 */
async function readTextFile(baseDir, relativePath, label) {
  return (await readCaseFileFollowingLinks(baseDir, relativePath, label))?.toString("utf8") ?? null;
}
//@ chunk-af1hzzme.js:30441-31533 placement
/**
 * 读取用例文件，处理悬空符号链接与 Windows 差异。
 */
async function readCaseFileFollowingLinks(filePath, maxBytes, label) {
  await checkRepoAuthoredPath(path.dirname(filePath), path.basename(filePath), label);
  let handle;
  try {
    handle = await open(
      filePath,
      constants.O_RDONLY | (getPlatform() === "windows" ? 0 : constants.O_NONBLOCK),
    );
  } catch (error) {
    if (isENOENT(error)) {
      if (await isSymlink(filePath))
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${path.basename(filePath)} is a symbolic link whose target does not exist \u2014 not read`,
            `${label}: dangling symbolic link`,
          ),
          {
            code: "ENOENT",
          },
        );
      return null;
    }
    let errnoCode = getErrnoCode(error);
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path.basename(filePath)} is unreadable (${errnoCode ?? "unknown error"})`,
        `${label}: unreadable`,
      ),
      {
        code: errnoCode,
      },
    );
  }
  try {
    let stats = await handle.stat();
    if (!stats.isFile())
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${path.basename(filePath)} is not a regular file`,
          `${label}: not a regular file`,
        ),
        {
          code: stats.isDirectory() ? "EISDIR" : undefined,
        },
      );
    let size = stats.size;
    if (size > maxBytes)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path.basename(filePath)} is ${size} bytes (cap: ${maxBytes})`,
        `${label}: over size cap`,
      );
    let buffer = Buffer.allocUnsafe(Math.min(size, maxBytes) + 1);
    let offset = 0;
    while (offset < buffer.length) {
      let { bytesRead } = await handle.read(buffer, offset, buffer.length - offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset !== size)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path.basename(filePath)} changed while being read (vetted at ${size} bytes, read ${offset > size ? "more" : String(offset)}); try again`,
        `${label}: changed during read`,
      );
    return buffer.subarray(0, offset);
  } finally {
    await handle.close().catch(() => {});
  }
}
//@ chunk-af1hzzme.js:31533-31582 placement
/**
 * 读取用例的 prose 文件。
 */
async function readProseCase(caseFilePath) {
  return readTextFile(caseFilePath, MAX_CASE_FILE_BYTES_2, "prose .md");
}
//@ chunk-af1hzzme.js:31582-32386 placement
/**
 * 加载 graders/ 目录下的评分器文件。
 */
async function loadGradersDir(gradersDir) {
  let entries;
  try {
    await checkRepoAuthoredPath(path.dirname(gradersDir), path.basename(gradersDir), "graders/");
    entries = await readdir(gradersDir, {
      withFileTypes: true,
    });
  } catch (error) {
    if (isENOENT(error)) {
      if (await isSymlink(gradersDir))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${path.basename(gradersDir)}/ is a symbolic link whose target does not exist`,
          "graders/: dangling symbolic link",
        );
      return [];
    }
    if (getErrnoCode(error) === "ENOTDIR")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path.basename(gradersDir)} is not a directory`,
        "graders/: not a directory",
      );
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    let errnoCode = getErrnoCode(error);
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path.basename(gradersDir)}/ is unreadable (${errnoCode ?? "unknown error"})`,
        "graders/: unreadable",
      ),
      {
        code: errnoCode,
      },
    );
  }
  let filtered = entries.filter((entry) => entry.name.endsWith(".md"));
  if (filtered.length > MAX_LAYERS)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${path.basename(gradersDir)}/ has ${filtered.length} .md entries (cap: ${MAX_LAYERS})`,
      "graders/: over file-count cap",
    );
  let paths = [];
  for (let entry of filtered) {
    let joined = path.join(gradersDir, entry.name);
    if ((await getFileKind(entry, joined, "other")) !== "dir") paths.push(joined);
  }
  paths.sort();
  return paths;
}

// The import cycle this module closes (2 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/services/pluginEval/caseSchema.js");
export {
  readTextFile,
  parseProseFrontmatter,
  parsePromptMdCase,
  normalizeCaseObject,
  parseCaseYaml,
  AGENT_PROMPT_TEMPLATE,
  GRADER_TEMPLATE,
};
