/**
 * services/pluginEval/graders.ts
 *
 * 2.1.316 新增：plugin eval 评分器：正则、文件存在/内容、工具使用/顺序、mock 调用、LLM 评分
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (35)
 * attribution: placement 34, layout 1
 */
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
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
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
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { buildRunToolRules, buildDisallowedTools, or } from "./runToolRules.js";
import { getAllBaseTools } from "../../tools.js";
import { toolMatchesAnyName } from "../tools/permissionCheckGuard.js";
import { ARTIFACT_TOOL_NAME } from "../../tools/ArtifactTool/constants.js";
import { CLAUDE_ARTIFACTS } from "../mcp/firstPartyServerIds.js";
import { vun, Eun } from "../artifacts/artifactsMcpServer.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { mcpInfoFromString } from "../mcp/mcpStringUtils.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";
import { getTotalCostUSD } from "../../bootstrap/state.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
} from "../../utils/errors.js";
import { count } from "../../utils/collections.js";
import { checkCasePathInsideRoot, resolveCaseFileInsideSuite } from "./evalFence.js";
import { Ph } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { Wo } from "../../utils/json.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { sniffDocumentType, detectHtmlDocument, parseWebpHeader } from "../../utils/imageFormats.js";
import { maybeResizeAndDownsampleImageBlock } from "../../utils/imageResizer.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { getSmallFastModel } from "../../utils/model/smallFastModel.js";
import { formatFileSize } from "../../utils/format.js";
import { truncateMiddle } from "../../utils/stringUtils.js";
import { tn } from "./caseSchema.js";
import { asSystemPrompt } from "../../utils/systemPromptType.js";
import { mainAgentContext } from "../../utils/agentContext.js";
import { queryHaiku, queryHaikuWithFallback } from "../api/claude.js";
import { extractTextContent_2 } from "../../utils/messages.js";
import { Pre } from "../../bootstrap/sessionSlices.js";
import { Nb } from "../../utils/model/modelIds.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { fdRealPath } from "../../utils/plugins/npmPluginSource.js";
import { toEvalPathError, pathEndsWith } from "./evalDir.js";
import { readExactBytes } from "../artifacts/artifactUrl.js";
import { getPlatform } from "../../utils/platform.js";
import { Kt } from "./artifactStub.js";
import { ft, Mt } from "./caseDiscovery.js";

//@ chunk-qchp9vrd.js:226805-226838 placement
var Hl = new Set([
  FILE_WRITE_TOOL_NAME,
  FILE_EDIT_TOOL_NAME,
  NOTEBOOK_EDIT_TOOL_NAME,
  BASH_TOOL_NAME,
  POWERSHELL_TOOL_NAME,
]);
/**
 * 检查评分器在授予的工具下能否通过（例如检查运行创建的文件却没有写工具）。
 */
//@ chunk-qchp9vrd.js:226838-229800 placement
function checkGradersSatisfiable(
  e,
  n,
  {
    scaffolded: scaffolded,
    artifactPublishGranted: artifactPublishGranted,
    mockedTools: mockedTools = [],
    withheldServers: withheldServers = [],
    disallowedTools: disallowedTools = [],
  },
) {
  let allowed = buildRunToolRules(e.execution.allowed_tools, n, {
      artifactPublishGranted: artifactPublishGranted,
      mockedTools: mockedTools,
      disallowedTools: disallowedTools,
    }).allowed,
    y = [],
    filtered = e.graders.filter((grader) => gradeFileExists(grader, scaffolded));
  if (
    filtered.length > 0 &&
    !artifactPublishGranted &&
    !allowed.some((T) => !mockedTools.includes(T) && !_m(T, withheldServers) && ym(T))
  ) {
    let filtered_2 = disallowedTools.filter((N) => Hl.has(N));
    for (let N of filtered)
      y.push({
        grader: N.name,
        text:
          filtered_2.length > 0
            ? `grader "${N.name}" cannot pass: it checks a file the run creates, but no tool the run may use can create one (a plugin hook still could), and the case's disallowed_tools or --disallow-tools lists ${filtered_2.join(", ")} \u2014 take one off that list and grant it (allowed_tools and --allow-tools), or drop the grader`
            : `grader "${N.name}" cannot pass with the granted tools: it checks a file the run creates, but no tool the run may use can create one (a plugin hook still could; a skill's own allowed-tools does not count inside a run) \u2014 add Write (or Edit / Bash) to the case's allowed_tools and grant it with --allow-tools`,
      });
  }
  let flattened = e.graders.flatMap((grader) => {
    switch (grader.type) {
      case "tool_used":
        return (grader.min ?? 1) >= 1 ? [{ grader: grader.name, tools: [grader.tool] }] : [];
      case "tool_order":
        return [{ grader: grader.name, tools: [grader.before.tool, grader.after.tool] }];
      default:
        return [];
    }
  });
  if (flattened.length > 0) {
    let T = getAllBaseTools(),
      N = (X) => {
        let W = new Set(X),
          G = new Set(W);
        for (let J of T) if (toolMatchesAnyName(J, W)) G.add(J.name);
        return G;
      },
      x = N(buildDisallowedTools(allowed, disallowedTools)),
      j = (X) => (disallowedTools.includes(X) ? X : disallowedTools.find((W) => N([W]).has(X))),
      K = new Set([ARTIFACT_TOOL_NAME]);
    for (let X of T) if (X.familyParentToolName === ARTIFACT_TOOL_NAME) K.add(X.name);
    for (let { grader: grader, tools: tools } of flattened)
      for (let G of new Set(tools)) {
        if (artifactPublishGranted && K.has(G)) {
          y.push({
            grader: grader,
            text: `grader "${grader}" cannot pass: it needs a ${G} call in the trace, but a run opted into artifact publishing is offered the ${CLAUDE_ARTIFACTS} MCP tools in its place \u2014 name the tool the run calls (${vun(Eun).join(", ")}), or grade the publish itself under .eval-artifacts/`,
          });
          continue;
        }
        if (!x.has(G)) continue;
        let J = or.includes(G) ? void 0 : j(G);
        if (J !== void 0) {
          let se =
            J === G
              ? `${G} is in the case's disallowed_tools or --disallow-tools`
              : `${J} is in the case's disallowed_tools or --disallow-tools, which also withholds ${G}`;
          y.push({
            grader: grader,
            text: `grader "${grader}" cannot pass: it needs a ${G} call in the trace, but ${se}, so no call can occur \u2014 change that list (and grant the tool if it is not granted), drop the grader, or invert it (max: 0) if absence is the point`,
          });
          continue;
        }
        let Z = or.includes(G)
          ? `${G} is never available inside an eval run \u2014 drop the grader, or invert it (max: 0) if absence is the point`
          : K.has(G)
            ? `${G} comes only with the artifact-publishing opt-in this run does not have (not --allow-tools) \u2014 opt the case in, or drop the grader`
            : `add ${G} to the case's allowed_tools and grant it with --allow-tools ${G}`;
        y.push({
          grader: grader,
          text: `grader "${grader}" cannot pass with the granted tools: it needs a ${G} call in the trace, but ${G} is not granted, so the run withholds it from the model and no call (not even a refused one) can occur \u2014 ${Z}`,
        });
      }
  }
  return y;
}
//@ chunk-qchp9vrd.js:229800-229867 placement
function ym(e) {
  let toolName = permissionRuleValueFromString(e).toolName;
  return Hl.has(toolName) || mcpInfoFromString(toolName) !== null;
}
//@ chunk-qchp9vrd.js:229867-229951 placement
function _m(e, n) {
  let r = mcpInfoFromString(permissionRuleValueFromString(e).toolName);
  return r !== null && n.includes(r.serverName);
}
//@ chunk-qchp9vrd.js:229951-230224 placement
function gradeFileExists(e, n) {
  switch (e.type) {
    case "file_exists":
      return e.exists;
    case "regex":
      if (typeof e.target === "object" && e.target.source === "file") return !n;
      return e.target === "files" && !Em(e.match);
    case "llm":
      return typeof e.focus === "object" && e.focus.source === "file" && !n;
    default:
      return !1;
  }
}
//@ chunk-qchp9vrd.js:230224-230313 placement
function Em(e) {
  return e === "not_contains" || (e.startsWith("count:") && Number(e.slice(6)) === 0);
}
//@ chunk-qchp9vrd.js:230429-230501 placement
function Sm(e) {
  return e.arm === void 0 && e.type === "tool_used" && e.tool === SKILL;
}
//@ chunk-qchp9vrd.js:230501-231055 placement
async function gradeCase(e) {
  let n = [],
    r = getTotalCostUSD(),
    a = (y) =>
      e.mockCallsWithOnly === !0 &&
      y.arm === void 0 &&
      ((y.type === "regex" && y.target === "mock_calls") || (y.type === "llm" && y.focus === "mock_calls")),
    s = (y) => y.arm === "with-only" || Sm(y) || a(y),
    all = e.case_.graders.every(s),
    w = e.arm === "without" && !all ? e.case_.graders.filter((grader) => !s(grader)) : e.case_.graders,
    b = !!e.skipPaidGraders && w.some((y) => y.type === "llm" || y.type === "baseline");
  for (let y of w) {
    let R = await runGrader(y, e);
    if (e.arm !== void 0 && !all && s(y)) R.with_only = !0;
    ((R.scored = !R.with_only), n.push(R));
  }
  return { results: n, judgeCostUsd: getTotalCostUSD() - r, paidGradersSkipped: b };
}
//@ chunk-qchp9vrd.js:231055-231497 placement
async function runGrader(e, n) {
  try {
    switch (e.type) {
      case "regex":
        return await gradeLastMessage(e, n);
      case "tool_order":
        return gradeToolOrder(e, n);
      case "tool_used":
        return gradeToolCallCount(e, n);
      case "file_exists":
        return gradeFileState(e, n);
      case "llm":
      case "baseline":
        if (n.skipPaidGraders)
          return { name: e.name, passed: !1, weight: e.weight, explanation: "skipped: cost ceiling" };
        return e.type === "llm" ? await gradeWithLlm(e, n) : await compareWithBaseline(e, n);
    }
  } catch (error) {
    return {
      name: e.name,
      passed: !1,
      weight: e.weight,
      explanation: `grader threw: ${errorMessage(error)}`,
    };
  }
}
//@ chunk-qchp9vrd.js:231497-232578 placement
async function gradeLastMessage(e, n) {
  let r = await readGraderFocusFile(e.target, n),
    a = No(e.target);
  if (r.kind === "unavailable") return an(e, r.reason);
  if (r.kind === "image") {
    let S =
      e.match === "not_contains" || e.match === "count:0"
        ? "to assert something is absent, have the case also write a text rendering and run this grader over that"
        : `grade what is visible with an llm grader (focus: {source: file, path: ${r.path}})`;
    return an(e, `${a} is an image (${r.mediaType}); a regex grader needs text \u2014 ${S}`);
  }
  let text = r.text,
    regExp = new RegExp(e.pattern, e.flags),
    w = e.flags.includes("g") ? e.flags : `${e.flags}g`,
    b = text.match(new RegExp(e.pattern, w)) ?? [],
    y,
    R;
  if (e.match === "contains")
    ((y = regExp.test(text)), (R = y ? `matched ${e.pattern}` : `pattern not found in ${a}`));
  else if (e.match === "not_contains")
    ((y = !regExp.test(text)), (R = y ? "pattern absent as expected" : "pattern found (expected absent)"));
  else if (e.match.startsWith("count:")) {
    let S = parseInt(e.match.slice(6), 10);
    ((y = b.length === S), (R = `found ${b.length} matches (expected ${S})`));
  } else ((y = !1), (R = `unknown match mode "${e.match}" (use contains | not_contains | count:N)`));
  return { name: e.name, passed: y, weight: e.weight, explanation: R };
}
//@ chunk-qchp9vrd.js:232578-232979 placement
function gradeToolOrder(e, { run: run }) {
  let r = Kl(run.toolCalls, e.before),
    a = Kl(run.toolCalls, e.after);
  if (r === -1) return an(e, `"before" tool ${e.before.tool} never called`);
  if (a === -1) return an(e, `"after" tool ${e.after.tool} never called`);
  let s = r < a;
  return {
    name: e.name,
    passed: s,
    weight: e.weight,
    explanation: s
      ? `${e.before.tool}@${r} precedes ${e.after.tool}@${a}`
      : `${e.before.tool}@${r} does NOT precede ${e.after.tool}@${a}`,
  };
}
//@ chunk-qchp9vrd.js:232979-233278 placement
function gradeToolCallCount(e, { run: run }) {
  let r = { tool: e.tool, input_match: e.input_match },
    a = count(run.toolCalls, (b) => matchesToolExpectation(b, r)),
    s = e.min ?? 1,
    h = e.max ?? Number.POSITIVE_INFINITY,
    w = a >= s && a <= h;
  return {
    name: e.name,
    passed: w,
    weight: e.weight,
    explanation: `${e.tool} called ${a}x (expected ${s}..${h === Number.POSITIVE_INFINITY ? "\u221E" : h})`,
  };
}
//@ chunk-qchp9vrd.js:233278-233599 placement
function gradeFileState(e, { cwdDiff: cwdDiff }) {
  let r = fileGlobToRegExp(e.path),
    any = (cwdDiff ?? "")
      .split(
        `
`,
      )
      .filter((h) => h.trim())
      .some((h) => r.test(h.trim())),
    s = any === e.exists;
  return {
    name: e.name,
    passed: s,
    weight: e.weight,
    explanation: s
      ? `${e.path} ${e.exists ? "exists" : "absent"} as expected`
      : `${e.path} ${any ? "exists" : "missing"} (expected ${e.exists ? "present" : "absent"})`,
  };
}
//@ chunk-qchp9vrd.js:233599-233649 placement
function Kl(e, n) {
  return e.findIndex((r) => matchesToolExpectation(r, n));
}
//@ chunk-qchp9vrd.js:233649-233771 placement
function matchesToolExpectation(e, n) {
  if (e.name !== n.tool) return !1;
  if (n.input_match) return new RegExp(n.input_match).test(e.inputText);
  return !0;
}
//@ chunk-qchp9vrd.js:233771-233803 placement
var Pm = new Set(".+^${}()|[]\\");
//@ chunk-qchp9vrd.js:233803-234073 placement
function fileGlobToRegExp(e) {
  let n = "^";
  for (let r = 0; r < e.length; r++) {
    let charAt = e.charAt(r);
    if (charAt === "*")
      if (e.charAt(r + 1) === "*")
        if (e.charAt(r + 2) === "/") ((n += "(?:.*/)?"), (r += 2));
        else ((n += ".*"), r++);
      else n += "[^/]*";
    else if (charAt === "?") n += ".";
    else if (Pm.has(charAt)) n += `\\${charAt}`;
    else n += charAt;
  }
  return new RegExp(`${n}$`);
}
//@ chunk-qchp9vrd.js:234073-234150 placement
function an(e, n) {
  return { name: e.name, passed: !1, weight: e.weight, explanation: n };
}
//@ chunk-qchp9vrd.js:234150-234174 placement
var Dm = 8000,
  Ki = 10485760;
/**
 * 读取评分关注的文件（防止链接逃逸、不存在或过大）。
 */
//@ chunk-qchp9vrd.js:234174-235454 placement
async function readGraderFocusFile(
  e,
  {
    run: run,
    cwdDiff: cwdDiff,
    sandboxCwd: sandboxCwd,
    stubPublishDir: stubPublishDir,
    case_: case_,
    signal: signal,
  },
) {
  if (typeof e === "object") {
    let b = EVAL_RUN_BASE_PATH(e.path);
    if (b !== null && stubPublishDir === void 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `focus file ${e.path} does not exist (artifact publishing was not granted for this run, so nothing was published)`,
        "grader focus file does not exist",
      );
    let y = b !== null && stubPublishDir !== void 0 ? stubPublishDir : sandboxCwd,
      R = await checkCasePathInsideRoot(
        y,
        b ?? e.path,
        `case "${case_.name}" grader focus file "${e.path}"`,
        b !== null ? "stub publish directory" : "run sandbox",
      );
    signal.throwIfAborted();
    let S = await openFocusFileSafely(y, R, e.path);
    signal.throwIfAborted();
    let T = Ph(S);
    if (T !== null) return { kind: "image", bytes: S, path: e.path, mediaType: T };
    return { kind: "text", text: Wo(S.toString("utf8")), binaryHead: describeBinaryContent(S) };
  }
  if (e === "last_message") return { kind: "text", text: run.lastAssistantText };
  if (e === "files") return { kind: "text", text: cwdDiff ?? "" };
  if (e === "mock_calls") {
    if (run.mockTally === null)
      return {
        kind: "unavailable",
        reason:
          "no mock stand-ins were active in this run (--mocks off, or no mocks/ directory applies to this case) \u2014 a mock_calls grader has nothing to check",
      };
    return {
      kind: "text",
      text: run.toolCalls
        .filter((toolCall) => toolCall.mock !== void 0)
        .map((b) =>
          jsonStringify({
            tool: b.name,
            input: b.input,
            ...(b.output !== void 0 && { output: b.output }),
            ...(b.isError && { isError: !0 }),
            verdict: b.mock?.verdict,
          }),
        ).join(`
`),
    };
  }
  return {
    kind: "text",
    text: run.trace.map((b) => jsonStringify(b)).join(`
`),
  };
}
//@ chunk-qchp9vrd.js:235454-235714 placement
function describeBinaryContent(e) {
  if (sniffDocumentType(e) !== null) return `it is a ${detectHtmlDocument(e)}`;
  let index = e.indexOf(0);
  if (index !== -1)
    return `it contains a NUL byte at offset ${index} (binary data, UTF-16 text \u2014 save such artifacts as UTF-8 \u2014 or NUL-separated output; leading bytes: ${detectHtmlDocument(e)})`;
  return;
}
//@ chunk-qchp9vrd.js:235714-235775 placement
function No(e) {
  return typeof e === "object" ? `file ${e.path}` : e;
}
//@ chunk-qchp9vrd.js:235775-235800 placement
var Lm = 3,
  Mm = 1e5,
  Vl = 20000;
/**
 * 用模型按标准评分（构建评分提示词、附图片与 trace 摘要）。
 */
//@ chunk-qchp9vrd.js:235800-237977 placement
async function gradeWithLlm(e, n) {
  let r =
    e.focus === "trace"
      ? { kind: "text", text: elideMessages(n.run.trace) }
      : await readGraderFocusFile(e.focus, n);
  if (r.kind === "unavailable") return an(e, r.reason);
  let a = `You are grading the output of a coding agent against a criterion.

Criterion:
${e.criteria}`,
    s = "Respond with exactly one word: PASS or FAIL.",
    h,
    w,
    b = "";
  if (r.kind === "text" && r.binaryHead !== void 0)
    return an(
      e,
      `${No(e.focus)} cannot be shown to the judge as text \u2014 ${r.binaryHead}. It is not a supported image either (PNG/JPEG/GIF/WebP), so have the case render it to an image or write its content as a UTF-8 text file, and grade that.`,
    );
  if (r.kind === "image") {
    let { block: block, dimensions: dimensions } = await maybeResizeAndDownsampleImageBlock({
      data: r.bytes,
      mediaType: r.mediaType,
      limits: imageLimitsForModel(Wr(n.judgeModel) ?? getSmallFastModel()),
    });
    if (block.type !== "image" || block.source.type !== "base64")
      return an(
        e,
        `focus file ${r.path} could not be prepared as an image for the judge: ${block.type === "text" ? block.text : "unexpected image source"}`,
      );
    h = [
      {
        type: "text",
        text: `${a}

Agent output (${No(e.focus)}) is the attached image:`,
      },
      block,
      { type: "text", text: s },
    ];
    let N = dimensions?.displayWidth ? `, ${dimensions.displayWidth}x${dimensions.displayHeight}px` : "",
      x = parseWebpHeader(r.bytes),
      j = x ? `, ${x.width}x${x.height}px` : "";
    ((w = `[image shown to the judge: ${r.path} \u2014 sent as ${block.source.media_type}, ${formatFileSize(Buffer.byteLength(block.source.data, "base64"))}${N}; file on disk: ${r.mediaType}, ${formatFileSize(r.bytes.length)}${j}]`),
      (b = " (image)"));
  } else {
    let S =
      r.text === "" && e.focus === "files"
        ? "(no file changes)"
        : r.text === "" && e.focus === "mock_calls"
          ? "(no mocked tool calls)"
          : r.text;
    ((w = truncateMiddle(
      S,
      Mm - Vl,
      Vl,
      (T) => `
[\u2026${T} chars elided\u2026]
`,
    )),
      (h = `${a}


Agent output (${No(e.focus)}):
${w}


${s}`),
      (b =
        typeof e.focus === "object" && S.length > Dm
          ? ` \u2014 note: long file (${S.length} chars); llm judges are noisy on long inputs, prefer a regex grader for large artifacts`
          : ""));
  }
  let y;
  try {
    y = await runEvalJudgeTrials(h, n);
  } catch (error) {
    if (r.kind === "image" && error instanceof AttachedMediaRejectedError)
      return an(
        e,
        `focus file ${r.path} was rejected by the API as an image (${error.reason}) \u2014 the artifact may be truncated or corrupt, or the judge route does not accept images`,
      );
    throw error;
  }
  let R = count(y, Boolean) > y.length / 2;
  return {
    name: e.name,
    passed: R,
    weight: e.weight,
    explanation: `judge votes: ${y.map((S) => (S ? "PASS" : "FAIL")).join(" ")}${b}`,
    judge_votes: y,
    evidence: w,
  };
}
//@ chunk-qchp9vrd.js:237977-238811 placement
async function compareWithBaseline(e, n) {
  let { case_: case_, run: run } = n,
    s;
  try {
    let y = await resolveCaseFileInsideSuite(case_, e.baseline_file, "baseline_file"),
      R = await tn(y, Ki, "baseline file");
    if (R === null) return an(e, `baseline file ${e.baseline_file} does not exist`);
    s = R.split(
      `
`,
    )
      .filter((S) => S.trim())
      .map((S) => jsonParse(S));
  } catch (error) {
    return an(e, `failed to read baseline: ${error instanceof Error ? error.message : String(error)}`);
  }
  let joined = [
      "You are comparing a NEW coding-agent trajectory against a BASELINE.",
      `Criterion:
${e.criteria}`,
      `
BASELINE trajectory:
${elideMessages(s)}`,
      `
NEW trajectory:
${elideMessages(run.trace)}`,
      `
Does the NEW trajectory satisfy the criterion at least as well as the BASELINE?`,
      "Respond with exactly one word: PASS or FAIL.",
    ].join(`

`),
    w = await runEvalJudgeTrials(joined, n),
    b = count(w, Boolean) > w.length / 2;
  return {
    name: e.name,
    passed: b,
    weight: e.weight,
    explanation: `judge votes: ${w.map((y) => (y ? "PASS" : "FAIL")).join(" ")}`,
    judge_votes: w,
  };
}
//@ chunk-qchp9vrd.js:238811-238944 placement
async function runEvalJudgeTrials(e, n) {
  let r = [];
  for (let a = 0; a < Lm; a++) {
    let s = await runEvalJudge(e, n);
    r.push(/\bPASS\b/i.test(s) && !/\bFAIL\b/i.test(s));
  }
  return r;
}
//@ chunk-qchp9vrd.js:238944-239610 placement = generateTitleAndBranch (0.267)
async function runEvalJudge(description, signal) {
  let r = asSystemPrompt(["You are a strict, terse evaluation judge for coding-agent traces."]),
    a,
    s = {
      querySource: "plugin_eval_judge",
      agents: [],
      isNonInteractiveSession: !0,
      hasAppendSystemPrompt: !1,
      mcpTools: [],
      agentContext: mainAgentContext(),
      onMediaStripped: (y, R) => {
        a = R;
      },
      credentials: signal.credentials,
    },
    h = Wr(signal.judgeModel),
    w = h
      ? await queryHaiku({
          systemPrompt: r,
          userPrompt: description,
          signal: signal.signal,
          options: { ...s, model: h },
        })
      : await queryHaikuWithFallback({
          systemPrompt: r,
          userPrompt: description,
          signal: signal.signal,
          options: s,
        }),
    parsed = extractTextContent_2(w.message.content);
  if (Pre(w))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `judge call failed: ${parsed}${a !== void 0 ? ` (after the attached image was rejected: ${a})` : ""}`,
      "plugin eval judge call failed",
    );
  if (a !== void 0) throw new AttachedMediaRejectedError(a);
  return parsed;
}
//@ chunk-qchp9vrd.js:239610-239753 layout
class AttachedMediaRejectedError extends Error {
  reason;
  constructor(e) {
    super("attached media rejected by the API");
    this.reason = e;
    this.name = "AttachedMediaRejectedError";
  }
}
//@ chunk-qchp9vrd.js:239753-239813 placement
function Wr(e) {
  return e && Nb(e.toLowerCase().trim()) ? parseUserSpecifiedModel(e) : e;
}
//@ chunk-qchp9vrd.js:239813-240021 placement
function elideMessages(e) {
  if (e.length <= 24)
    return e.map((h) => jsonStringify(h)).join(`
`);
  let mapped = e.slice(0, 12).map((h) => jsonStringify(h)),
    mapped_2 = e.slice(-12).map((h) => jsonStringify(h));
  return [...mapped, `[\u2026${e.length - 12 - 12} messages elided\u2026]`, ...mapped_2].join(`
`);
}
//@ chunk-qchp9vrd.js:240021-241664 placement
async function openFocusFileSafely(e, n, r) {
  let a = () =>
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `focus file ${r} leaves the run directory through a link`,
        "grader focus file escapes the run directory via link",
      ),
    s = await lstat_12(e, { bigint: !0 }).catch(() => null);
  if (s === null || !s.isDirectory() || s.isSymbolicLink()) throw a();
  let h = await realpath_9(e).catch(() => null);
  if (h === null || h !== e) throw a();
  let w = await lstat_12(h, { bigint: !0 }).catch(() => null);
  if (w === null || w.ino !== s.ino || w.dev !== s.dev) throw a();
  let b;
  try {
    b = await open_7(n, constants_7.O_RDONLY | Hm);
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `focus file ${r} does not exist`,
        "grader focus file does not exist",
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `focus file ${r} is unreadable (${getErrnoCode(error) ?? "unknown error"})`,
      "grader focus file unreadable",
    );
  }
  try {
    let stats = await b.stat({ bigint: !0 });
    if (!stats.isFile())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `focus file ${r} is not a regular file`,
        "grader focus file not a regular file",
      );
    if (stats.nlink > 1n)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `focus file ${r} has more than one hard link, so the grader cannot tell whether it also lives outside the run directory \u2014 not read (point the focus at a file with a single link, e.g. a copy)`,
        "grader focus file has multiple hard links",
      );
    if (stats.ino === 0n) throw a();
    let R = await fdRealPath(b.fd),
      S = R ?? (await realpath_9(n).catch(() => null));
    if (S === null || !toEvalPathError(h, S)) throw a();
    if (R === null) {
      let x = await lstat_12(S, { bigint: !0 }).catch(() => null);
      if (x === null || x.ino !== stats.ino || x.dev !== stats.dev || x.nlink !== 1n) throw a();
    }
    if (stats.size > BigInt(Ki))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `focus file ${r} exceeds ${formatFileSize(Ki)}`,
        "grader focus file too large",
      );
    let T = Number(stats.size),
      N = await readExactBytes(b, T);
    if (N === null)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `focus file ${r} changed while being read (vetted at ${T} bytes); try again`,
        "grader focus file changed during read",
      );
    return N;
  } finally {
    await b.close().catch(() => {});
  }
}
//@ chunk-qchp9vrd.js:241664-241703 placement
var Hm = getPlatform() === "windows" ? 0 : constants_7.O_NONBLOCK;
//@ chunk-qchp9vrd.js:241703-241918 placement
function EVAL_RUN_BASE_PATH(e) {
  let resolved = path_16.resolve("/eval-run-base"),
    resolved_2 = path_16.resolve(resolved, e.replaceAll("\\", "/")),
    relativePath = path_16.relative(path_16.join(resolved, Kt), resolved_2);
  if (relativePath === "") return ".";
  return relativePath.startsWith("..") || path_16.isAbsolute(relativePath)
    ? null
    : relativePath.split(path_16.sep).join("/");
}
/**
 * 从文件路径向上查找最近的、以指定段结尾的模拟基准目录（不超出根）。
 */
//@ chunk-qchp9vrd.js:241992-242163 placement
function findMockBaseDir(e, n, r) {
  if (r.length > 0) {
    let a = null,
      resolved = path_17.resolve(e);
    while (ft(resolved, n) && resolved !== n) {
      if (pathEndsWith(Mt(resolved), r)) a = resolved;
      let dir = path_17.dirname(resolved);
      if (dir === resolved) break;
      resolved = dir;
    }
    if (a !== null) return a;
  }
  return n;
}
/**
 * 列出路径在根目录内的祖先目录链。
 */
//@ chunk-qchp9vrd.js:242163-242327 placement
function listAncestorChain(e, n) {
  let dir = path_17.dirname(e);
  if (!ft(dir, n)) return [e];
  let a = [],
    s = dir;
  for (;;) {
    a.push(s);
    let dir = path_17.dirname(s);
    if (dir === s || !ft(dir, n)) break;
    s = dir;
  }
  return [...a.reverse(), e];
}

export { listAncestorChain, findMockBaseDir, checkGradersSatisfiable, Wr, gradeCase };
