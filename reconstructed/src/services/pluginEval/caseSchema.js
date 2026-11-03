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
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
} from "fs/promises";
import {
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
} from "fs";
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
import { arrayToEnum_2 } from "../../../vendor/zod/v3/ZodError.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isENOENT,
  getErrnoCode,
} from "../../utils/errors.js";
import { tv } from "../../utils/remoteFileState.js";
import { FRONTMATTER_REGEX } from "../../utils/frontmatterParser.js";
import { parseYaml } from "../../utils/yaml.js";
import { checkRepoAuthoredPath } from "../../cli/handlers/pluginEval/mockGuards.js";
import { getPlatform } from "../../utils/platform.js";
import { Ps, As } from "./mocks/mockResponders.js";
import { getFileKind } from "../../utils/fileKind.js";

/**
 * eval init 生成的用例模板（prompt.md、grader 骨架）。
 */
//@ chunk-qchp9vrd.js:22013-22318 placement
var TODO_AGENT_PROMPT = "TODO: describe what the agent should do",
  Zo = "TODO: describe what a successful response looks like",
  ws = `---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

TODO: describe what the agent should do
`,
  ys = `---
type: llm
weight: 1
---

TODO: describe what a successful response looks like
`;
//@ chunk-qchp9vrd.js:22318-22336 placement
var CASE_SCHEMA_VERSION = 1,
  Es = "1.1";
//@ chunk-qchp9vrd.js:22336-22472 placement
function graderInputSchema() {
  return create_16([
    create_26(["trace", "last_message", "files", "mock_calls"]),
    create_17("source", [create({ source: create_25("file"), path: create_2() }).strict()]),
  ]);
}
//@ chunk-qchp9vrd.js:22472-22529 placement
function Ln() {
  return create_26(["with-only", "both"]).optional();
}
/**
 * 评分器定义模式（regex、last_message、文件、mock_calls、llm 等类型）。
 */
//@ chunk-qchp9vrd.js:22529-23613 placement
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
      arm: Ln(),
    }).strict(),
    create({
      type: create_25("tool_order"),
      name: create_2(),
      before: toolExpectationSchema(),
      after: toolExpectationSchema(),
      weight: create_3().positive().default(1),
      arm: Ln(),
    }).strict(),
    create({
      type: create_25("tool_used"),
      name: create_2(),
      tool: create_2(),
      input_match: create_2().optional(),
      min: create_3().int().nonnegative().optional(),
      max: create_3().int().nonnegative().optional(),
      weight: create_3().positive().default(1),
      arm: Ln(),
    }).strict(),
    create({
      type: create_25("file_exists"),
      name: create_2(),
      path: create_2(),
      exists: create_6().default(!0),
      weight: create_3().positive().default(1),
      arm: Ln(),
    }).strict(),
    create({
      type: create_25("llm"),
      name: create_2(),
      criteria: create_2(),
      focus: graderInputSchema().default("last_message"),
      weight: create_3().positive().default(1),
      arm: Ln(),
    }).strict(),
    create({
      type: create_25("baseline"),
      name: create_2(),
      baseline_file: create_2(),
      criteria: create_2(),
      weight: create_3().positive().default(1),
      arm: Ln(),
    }).strict(),
  ]),
);
//@ chunk-qchp9vrd.js:23613-23744 placement
function toolExpectationSchema() {
  return create_16([
    create_2().transform((e) => ({ tool: e, input_match: void 0 })),
    create({ tool: create_2(), input_match: create_2().optional() }).strict(),
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
    }).default({ add_dirs: [] }),
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
            n.addIssue({ code: arrayToEnum_2.custom, message: `duplicate grader name "${a.name}"` });
          r.add(a.name);
        }
      }),
    expected_outcome: create_2().optional(),
  }),
);
/**
 * 校验 case.yaml：必须是对象且含 schema_version 等字段。
 */
//@ chunk-qchp9vrd.js:24686-26080 placement
function parseCaseYaml(e) {
  if (typeof e !== "object" || e === null) return { ok: !1, error: "case.yaml must be a YAML object" };
  let schema_version = e.schema_version;
  if (typeof schema_version !== "string")
    return { ok: !1, error: 'missing required field schema_version (e.g. "1.0")' };
  let r = parseInt(firstLineOf(schema_version, "."), 10);
  if (Number.isNaN(r))
    return { ok: !1, error: `schema_version "${schema_version}" is not a valid version string` };
  if (r > CASE_SCHEMA_VERSION)
    return {
      ok: !1,
      error: `schema_version "${schema_version}" requires a newer Claude Code (this binary supports up to ${CASE_SCHEMA_VERSION}.x)`,
    };
  let safeParse = GradersListSchema().safeParse(e);
  if (!safeParse.success)
    return {
      ok: !1,
      error: `invalid case.yaml:
${safeParse.error.issues.map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`).join(`
`)}`,
    };
  if (!safeParse.data.execution.prompt?.trim())
    return {
      ok: !1,
      error: safeParse.data.context.history_file
        ? "context.history_file requires execution.prompt (the resumed session needs a next turn)"
        : "execution.prompt is required (a prompt.md body, or execution.prompt in case.yaml)",
    };
  if (safeParse.data.execution.prompt.includes(TODO_AGENT_PROMPT))
    return {
      ok: !1,
      error: `the prompt is still the blank \`init\` template \u2014 replace the "${TODO_AGENT_PROMPT}" line with the user prompt to test (in prompt.md, or in execution.prompt if the case is written in case.yaml)`,
    };
  for (let grader of safeParse.data.graders)
    if (("criteria" in grader ? grader.criteria : "pattern" in grader ? grader.pattern : "").includes(Zo))
      return {
        ok: !1,
        error: `grader "${grader.name}" is still the blank \`init\` template \u2014 replace the "${Zo}" line with concrete pass criteria`,
      };
  return { ok: !0, case: safeParse.data };
}
//@ chunk-qchp9vrd.js:26080-26348 placement
var MAX_CASE_FILE_BYTES = 1048576,
  Ss = new Set(["schema_version", "name", "description", "tags", "plugins", "runs", "expected_outcome"]),
  Ts = new Set([
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
/**
 * 解析 prompt.md 的 frontmatter（graders、未知键报错）。
 */
//@ chunk-qchp9vrd.js:26348-27561 placement
async function parsePromptMdCase(e) {
  let joined = path_4.join(e, "prompt.md"),
    joined_2 = path_4.join(e, "graders"),
    [a, s] = await Promise.all([Cs(joined), loadGradersDir(joined_2)]);
  if (a === null && s.length === 0) return null;
  let h = { top: {}, execution: {}, graders: [] };
  if (a !== null) {
    let { fm: fm, body: body } = parseProseFrontmatter(a, joined),
      trimmed = body.trim();
    if (trimmed.length > 0) h.prompt = trimmed;
    for (let [S, T] of Object.entries(fm))
      if (Ss.has(S)) h.top[S] = T;
      else if (Ts.has(S)) h.execution[S] = T;
      else
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${path_4.relative(e, joined)}: unknown frontmatter key "${S}" (expected one of: ${[...Ss, ...Ts].join(", ")})`,
          "prompt.md: unknown frontmatter key",
        );
  }
  let w = [];
  for (let b of s) {
    let y = await Cs(b);
    if (y === null)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path_4.basename(b)} vanished from ${path_4.basename(path_4.dirname(b))}/ while being read; try again`,
        "graders/: entry vanished during read",
      );
    w.push(y);
  }
  for (let b = 0; b < s.length; b++) {
    let y = s[b],
      R = w[b],
      { fm: fm, body: body, hadFrontmatter: hadFrontmatter } = parseProseFrontmatter(R, y);
    if (!hadFrontmatter) continue;
    let base = path_4.basename(y, ".md");
    if (typeof fm.type !== "string")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path_4.relative(e, y)}: frontmatter must include "type:" (regex | tool_order | tool_used | file_exists | llm | baseline)`,
        "grader .md: frontmatter missing type",
      );
    h.graders.push(buildGraderEntry(base, fm, body.trim()));
  }
  if (
    h.prompt === void 0 &&
    h.graders.length === 0 &&
    Object.keys(h.top).length === 0 &&
    Object.keys(h.execution).length === 0
  )
    return null;
  return h;
}
//@ chunk-qchp9vrd.js:27561-27993 placement
function normalizeCaseObject(e, n, r) {
  let a = e ?? { schema_version: Es, name: path_4.basename(r) },
    s = { ...a, ...n.top },
    h = typeof a.execution === "object" && a.execution !== null ? a.execution : {},
    disallowed_tools = h.disallowed_tools,
    disallowed_tools_2 = n.execution.disallowed_tools;
  if (
    ((s.execution = {
      ...h,
      ...n.execution,
      ...((disallowed_tools !== void 0 || disallowed_tools_2 !== void 0) && {
        disallowed_tools: concatArrays(disallowed_tools, disallowed_tools_2),
      }),
      ...(n.prompt !== void 0 && { prompt: n.prompt }),
    }),
    n.graders.length > 0)
  )
    s.graders = [...(Array.isArray(a.graders) ? a.graders : []), ...n.graders];
  return s;
}
//@ chunk-qchp9vrd.js:27993-28124 placement
function concatArrays(e, n) {
  if (e === void 0) return n;
  if (n === void 0) return e;
  if (!Array.isArray(e)) return e;
  return Array.isArray(n) ? [...e, ...n] : n;
}
//@ chunk-qchp9vrd.js:28124-28184 placement
var tu = { llm: "criteria", baseline: "criteria", regex: "pattern" };
//@ chunk-qchp9vrd.js:28184-28316 placement
function buildGraderEntry(e, n, r) {
  let a = { name: e, ...n },
    s = typeof n.type === "string" ? tu[n.type] : void 0;
  if (s && a[s] === void 0 && r.length > 0) a[s] = r;
  return a;
}
/**
 * 解析 .md 的 YAML frontmatter（未闭合、YAML 错误报告）。
 */
//@ chunk-qchp9vrd.js:28316-29028 placement
function parseProseFrontmatter(e, n) {
  e = tv(e);
  let match = e.match(FRONTMATTER_REGEX);
  if (!match) {
    if (/^---\s*\n/.test(e))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path_4.basename(n)}: unterminated frontmatter (opening "---" with no closing "---")`,
        "prose .md: unterminated frontmatter",
      );
    return { fm: {}, body: e, hadFrontmatter: !1 };
  }
  let a;
  try {
    a = parseYaml(match[1] ?? "");
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${path_4.basename(n)}: invalid YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
      "prose .md: invalid YAML frontmatter",
    );
  }
  if (a === null || a === void 0) return { fm: {}, body: e.slice(match[0].length), hadFrontmatter: !0 };
  if (typeof a !== "object" || Array.isArray(a))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${path_4.basename(n)}: frontmatter must be a YAML object`,
      "prose .md: frontmatter not a YAML object",
    );
  return { fm: a, body: e.slice(match[0].length), hadFrontmatter: !0 };
}
//@ chunk-qchp9vrd.js:29028-29101 placement
async function tn(e, n, r) {
  return (await readCaseFileFollowingLinks(e, n, r))?.toString("utf8") ?? null;
}
/**
 * 读取用例文件，处理悬空符号链接与 Windows 差异。
 */
//@ chunk-qchp9vrd.js:29101-30193 placement
async function readCaseFileFollowingLinks(e, n, r) {
  await checkRepoAuthoredPath(path_4.dirname(e), path_4.basename(e), r);
  let a;
  try {
    a = await open(e, constants.O_RDONLY | (getPlatform() === "windows" ? 0 : constants.O_NONBLOCK));
  } catch (error) {
    if (isENOENT(error)) {
      if (await Ps(e))
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${path_4.basename(e)} is a symbolic link whose target does not exist \u2014 not read`,
            `${r}: dangling symbolic link`,
          ),
          { code: "ENOENT" },
        );
      return null;
    }
    let h = getErrnoCode(error);
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path_4.basename(e)} is unreadable (${h ?? "unknown error"})`,
        `${r}: unreadable`,
      ),
      { code: h },
    );
  }
  try {
    let stats = await a.stat();
    if (!stats.isFile())
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${path_4.basename(e)} is not a regular file`,
          `${r}: not a regular file`,
        ),
        { code: stats.isDirectory() ? "EISDIR" : void 0 },
      );
    let size = stats.size;
    if (size > n)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path_4.basename(e)} is ${size} bytes (cap: ${n})`,
        `${r}: over size cap`,
      );
    let allocUnsafe = Buffer.allocUnsafe(Math.min(size, n) + 1),
      b = 0;
    while (b < allocUnsafe.length) {
      let { bytesRead: bytesRead } = await a.read(allocUnsafe, b, allocUnsafe.length - b);
      if (bytesRead === 0) break;
      b += bytesRead;
    }
    if (b !== size)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path_4.basename(e)} changed while being read (vetted at ${size} bytes, read ${b > size ? "more" : String(b)}); try again`,
        `${r}: changed during read`,
      );
    return allocUnsafe.subarray(0, b);
  } finally {
    await a.close().catch(() => {});
  }
}
//@ chunk-qchp9vrd.js:30193-30242 placement
async function Cs(e) {
  return tn(e, MAX_CASE_FILE_BYTES, "prose .md");
}
/**
 * 加载 graders/ 目录下的评分器文件。
 */
//@ chunk-qchp9vrd.js:30242-31046 placement
async function loadGradersDir(e) {
  let n;
  try {
    (await checkRepoAuthoredPath(path_4.dirname(e), path_4.basename(e), "graders/"),
      (n = await readdir_4(e, { withFileTypes: !0 })));
  } catch (error) {
    if (isENOENT(error)) {
      if (await Ps(e))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${path_4.basename(e)}/ is a symbolic link whose target does not exist`,
          "graders/: dangling symbolic link",
        );
      return [];
    }
    if (getErrnoCode(error) === "ENOTDIR")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path_4.basename(e)} is not a directory`,
        "graders/: not a directory",
      );
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    let h = getErrnoCode(error);
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${path_4.basename(e)}/ is unreadable (${h ?? "unknown error"})`,
        "graders/: unreadable",
      ),
      { code: h },
    );
  }
  let filtered = n.filter((s) => s.name.endsWith(".md"));
  if (filtered.length > As)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${path_4.basename(e)}/ has ${filtered.length} .md entries (cap: ${As})`,
      "graders/: over file-count cap",
    );
  let a = [];
  for (let s of filtered) {
    let joined = path_4.join(e, s.name);
    if ((await getFileKind(s, joined, "other")) !== "dir") a.push(joined);
  }
  return (a.sort(), a);
}

export { tn, parseProseFrontmatter, parsePromptMdCase, normalizeCaseObject, parseCaseYaml, ws, ys };
