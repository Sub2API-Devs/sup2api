/**
 * services/pluginEval/caseSchema.ts
 *
 * 2.1.316 新增：plugin eval 用例格式：case.yaml / prompt.md frontmatter / graders 的 zod 模式与解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (19)
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

//@ chunk-qchp9vrd.js:22013-22318 placement
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
//@ chunk-qchp9vrd.js:22318-22336 placement
var CASE_SCHEMA_VERSION = 1;
var DEFAULT_SCHEMA_VERSION = "1.1";
//@ chunk-qchp9vrd.js:22336-22472 placement
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
//@ chunk-qchp9vrd.js:22472-22529 placement
function armSchema() {
  return create_26(["with-only", "both"]).optional();
}
//@ chunk-qchp9vrd.js:22529-23613 placement
/**
 * 评分器定义模式（regex、last_message、文件、mock_calls、llm 等类型）。
 */
var GraderSchema = DoctorLazy(() =>
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
//@ chunk-qchp9vrd.js:23613-23744 placement
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
//@ chunk-qchp9vrd.js:23744-24686 placement
var GradersListSchema = DoctorLazy(() =>
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
      .superRefine((e, n) => {
        let r = new Set();
        for (let a of e) {
          if (r.has(a.name))
            n.addIssue({
              code: ZodIssueCode.custom,
              message: `duplicate grader name "${a.name}"`,
            });
          r.add(a.name);
        }
      }),
    expected_outcome: create_2().optional(),
  }),
);
//@ chunk-qchp9vrd.js:24686-26080 placement
/**
 * 校验 case.yaml：必须是对象且含 schema_version 等字段。
 */
function parseCaseYaml(e) {
  if (typeof e !== "object" || e === null)
    return {
      ok: false,
      error: "case.yaml must be a YAML object",
    };
  let schemaVersion = e.schema_version;
  if (typeof schemaVersion !== "string")
    return {
      ok: false,
      error: 'missing required field schema_version (e.g. "1.0")',
    };
  let r = parseInt(firstLineOf(schemaVersion, "."), 10);
  if (Number.isNaN(r))
    return {
      ok: false,
      error: `schema_version "${schemaVersion}" is not a valid version string`,
    };
  if (r > CASE_SCHEMA_VERSION)
    return {
      ok: false,
      error: `schema_version "${schemaVersion}" requires a newer Claude Code (this binary supports up to ${CASE_SCHEMA_VERSION}.x)`,
    };
  let a = GradersListSchema().safeParse(e);
  if (!a.success)
    return {
      ok: false,
      error: `invalid case.yaml:
${a.error.issues.map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`).join(`
`)}`,
    };
  if (!a.data.execution.prompt?.trim())
    return {
      ok: false,
      error: a.data.context.history_file
        ? "context.history_file requires execution.prompt (the resumed session needs a next turn)"
        : "execution.prompt is required (a prompt.md body, or execution.prompt in case.yaml)",
    };
  if (a.data.execution.prompt.includes(TODO_AGENT_PROMPT))
    return {
      ok: false,
      error: `the prompt is still the blank \`init\` template \u2014 replace the "${TODO_AGENT_PROMPT}" line with the user prompt to test (in prompt.md, or in execution.prompt if the case is written in case.yaml)`,
    };
  for (let grader of a.data.graders)
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
    case: a.data,
  };
}
//@ chunk-qchp9vrd.js:26080-26348 placement
/**
 * 用例执行配置允许的键。
 */
var MAX_CASE_FILE_BYTES_2 = 1048576;
var TOP_LEVEL_CASE_KEYS = new Set([
  "schema_version",
  "name",
  "description",
  "tags",
  "plugins",
  "runs",
  "expected_outcome",
]);
var EXECUTION_CASE_KEYS = new Set([
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
//@ chunk-qchp9vrd.js:26348-27561 placement
/**
 * 解析 prompt.md 的 frontmatter（graders、未知键报错）。
 */
async function parsePromptMdCase(caseDir) {
  let joined = path.join(caseDir, "prompt.md");
  let joined_2 = path.join(caseDir, "graders");
  let [proseCase, gradersDir] = await Promise.all([readProseCase(joined), loadGradersDir(joined_2)]);
  if (proseCase === null && gradersDir.length === 0) return null;
  let h = {
    top: {},
    execution: {},
    graders: [],
  };
  if (proseCase !== null) {
    let { fm, body } = parseProseFrontmatter(proseCase, joined);
    let trimmed = body.trim();
    if (trimmed.length > 0) h.prompt = trimmed;
    for (let [key, value] of Object.entries(fm))
      if (TOP_LEVEL_CASE_KEYS.has(key)) h.top[key] = value;
      else if (EXECUTION_CASE_KEYS.has(key)) h.execution[key] = value;
      else
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${path.relative(caseDir, joined)}: unknown frontmatter key "${key}" (expected one of: ${[...TOP_LEVEL_CASE_KEYS, ...EXECUTION_CASE_KEYS].join(", ")})`,
          "prompt.md: unknown frontmatter key",
        );
  }
  let w = [];
  for (let b of gradersDir) {
    let proseCase = await readProseCase(b);
    if (proseCase === null)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path.basename(b)} vanished from ${path.basename(path.dirname(b))}/ while being read; try again`,
        "graders/: entry vanished during read",
      );
    w.push(proseCase);
  }
  for (let j = 0; j < gradersDir.length; j++) {
    let y = gradersDir[j];
    let R = w[j];
    let { fm, body, hadFrontmatter } = parseProseFrontmatter(R, y);
    if (!hadFrontmatter) continue;
    let name = path.basename(y, ".md");
    if (typeof fm.type !== "string")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path.relative(caseDir, y)}: frontmatter must include "type:" (regex | tool_order | tool_used | file_exists | llm | baseline)`,
        "grader .md: frontmatter missing type",
      );
    h.graders.push(buildGraderEntry(name, fm, body.trim()));
  }
  if (
    h.prompt === undefined &&
    h.graders.length === 0 &&
    Object.keys(h.top).length === 0 &&
    Object.keys(h.execution).length === 0
  )
    return null;
  return h;
}
//@ chunk-qchp9vrd.js:27561-27993 placement
function normalizeCaseObject(caseYamlFile, promptMdCase, caseDir) {
  let a = caseYamlFile ?? {
    schema_version: DEFAULT_SCHEMA_VERSION,
    name: path.basename(caseDir),
  };
  let s = {
    ...a,
    ...promptMdCase.top,
  };
  let execution = typeof a.execution === "object" && a.execution !== null ? a.execution : {};
  let disallowedTools = execution.disallowed_tools;
  let disallowedTools_2 = promptMdCase.execution.disallowed_tools;
  s.execution = {
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
    s.graders = [...(Array.isArray(a.graders) ? a.graders : []), ...promptMdCase.graders];
  return s;
}
//@ chunk-qchp9vrd.js:27993-28124 placement
function concatArrays(disallowedTools, disallowedTools_2) {
  if (disallowedTools === undefined) return disallowedTools_2;
  if (disallowedTools_2 === undefined) return disallowedTools;
  if (!Array.isArray(disallowedTools)) return disallowedTools;
  return Array.isArray(disallowedTools_2) ? [...disallowedTools, ...disallowedTools_2] : disallowedTools_2;
}
//@ chunk-qchp9vrd.js:28124-28184 placement
/**
 * 评分器类型到其条件字段名的映射。
 */
var GRADER_FIELD_BY_TYPE = {
  llm: "criteria",
  baseline: "criteria",
  regex: "pattern",
};
//@ chunk-qchp9vrd.js:28184-28316 placement
function buildGraderEntry(name, n, r) {
  let a = {
    name,
    ...n,
  };
  let s = typeof n.type === "string" ? GRADER_FIELD_BY_TYPE[n.type] : undefined;
  if (s && a[s] === undefined && r.length > 0) a[s] = r;
  return a;
}
//@ chunk-qchp9vrd.js:28316-29028 placement
/**
 * 解析 .md 的 YAML frontmatter（未闭合、YAML 错误报告）。
 */
function parseProseFrontmatter(e, n) {
  e = stripBom_2(e);
  let match = e.match(FRONTMATTER_REGEX);
  if (!match) {
    if (/^---\s*\n/.test(e))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path.basename(n)}: unterminated frontmatter (opening "---" with no closing "---")`,
        "prose .md: unterminated frontmatter",
      );
    return {
      fm: {},
      body: e,
      hadFrontmatter: false,
    };
  }
  let a;
  try {
    a = parseYaml(match[1] ?? "");
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${path.basename(n)}: invalid YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
      "prose .md: invalid YAML frontmatter",
    );
  }
  if (a === null || a === undefined)
    return {
      fm: {},
      body: e.slice(match[0].length),
      hadFrontmatter: true,
    };
  if (typeof a !== "object" || Array.isArray(a))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${path.basename(n)}: frontmatter must be a YAML object`,
      "prose .md: frontmatter not a YAML object",
    );
  return {
    fm: a,
    body: e.slice(match[0].length),
    hadFrontmatter: true,
  };
}
//@ chunk-qchp9vrd.js:29028-29101 placement
/**
 * 读取文本文件（跟随链接），失败返回 null。
 */
async function readTextFile(e, n, r) {
  return (await readCaseFileFollowingLinks(e, n, r))?.toString("utf8") ?? null;
}
//@ chunk-qchp9vrd.js:29101-30193 placement
/**
 * 读取用例文件，处理悬空符号链接与 Windows 差异。
 */
async function readCaseFileFollowingLinks(e, n, r) {
  await checkRepoAuthoredPath(path.dirname(e), path.basename(e), r);
  let a;
  try {
    a = await open(e, constants.O_RDONLY | (getPlatform() === "windows" ? 0 : constants.O_NONBLOCK));
  } catch (error) {
    if (isENOENT(error)) {
      if (await isSymlink(e))
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${path.basename(e)} is a symbolic link whose target does not exist \u2014 not read`,
            `${r}: dangling symbolic link`,
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
        `${path.basename(e)} is unreadable (${errnoCode ?? "unknown error"})`,
        `${r}: unreadable`,
      ),
      {
        code: errnoCode,
      },
    );
  }
  try {
    let stats = await a.stat();
    if (!stats.isFile())
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${path.basename(e)} is not a regular file`,
          `${r}: not a regular file`,
        ),
        {
          code: stats.isDirectory() ? "EISDIR" : undefined,
        },
      );
    let size = stats.size;
    if (size > n)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path.basename(e)} is ${size} bytes (cap: ${n})`,
        `${r}: over size cap`,
      );
    let w = Buffer.allocUnsafe(Math.min(size, n) + 1);
    let b = 0;
    while (b < w.length) {
      let { bytesRead } = await a.read(w, b, w.length - b);
      if (bytesRead === 0) break;
      b += bytesRead;
    }
    if (b !== size)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path.basename(e)} changed while being read (vetted at ${size} bytes, read ${b > size ? "more" : String(b)}); try again`,
        `${r}: changed during read`,
      );
    return w.subarray(0, b);
  } finally {
    await a.close().catch(() => {});
  }
}
//@ chunk-qchp9vrd.js:30193-30242 placement
/**
 * 读取用例的 prose 文件。
 */
async function readProseCase(e) {
  return readTextFile(e, MAX_CASE_FILE_BYTES_2, "prose .md");
}
//@ chunk-qchp9vrd.js:30242-31046 placement
/**
 * 加载 graders/ 目录下的评分器文件。
 */
async function loadGradersDir(e) {
  let n;
  try {
    await checkRepoAuthoredPath(path.dirname(e), path.basename(e), "graders/");
    n = await readdir(e, {
      withFileTypes: true,
    });
  } catch (error) {
    if (isENOENT(error)) {
      if (await isSymlink(e))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${path.basename(e)}/ is a symbolic link whose target does not exist`,
          "graders/: dangling symbolic link",
        );
      return [];
    }
    if (getErrnoCode(error) === "ENOTDIR")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path.basename(e)} is not a directory`,
        "graders/: not a directory",
      );
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    let errnoCode = getErrnoCode(error);
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path.basename(e)}/ is unreadable (${errnoCode ?? "unknown error"})`,
        "graders/: unreadable",
      ),
      {
        code: errnoCode,
      },
    );
  }
  let filtered = n.filter((s) => s.name.endsWith(".md"));
  if (filtered.length > MAX_LAYERS)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${path.basename(e)}/ has ${filtered.length} .md entries (cap: ${MAX_LAYERS})`,
      "graders/: over file-count cap",
    );
  let a = [];
  for (let s of filtered) {
    let joined = path.join(e, s.name);
    if ((await getFileKind(s, joined, "other")) !== "dir") a.push(joined);
  }
  a.sort();
  return a;
}
export {
  readTextFile,
  parseProseFrontmatter,
  parsePromptMdCase,
  normalizeCaseObject,
  parseCaseYaml,
  AGENT_PROMPT_TEMPLATE,
  GRADER_TEMPLATE,
};
