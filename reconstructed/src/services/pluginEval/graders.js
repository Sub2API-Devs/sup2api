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
import { lstat, realpath, open } from "fs/promises";
import { constants } from "fs";
import { default as path_2 } from "path";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { buildRunToolRules, buildDisallowedTools, WORKTREE_TOOLS } from "./runToolRules.js";
import { getAllBaseTools } from "../../tools.js";
import { toolMatchesAnyName } from "../tools/permissionCheckGuard.js";
import { ARTIFACT_TOOL_NAME } from "../../tools/ArtifactTool/constants.js";
import { CLAUDE_ARTIFACTS } from "../mcp/firstPartyServerIds.js";
import { mcpToolNames, PUBLISH_TOOL_NAMES } from "../artifacts/artifactsMcpServer.js";
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
import { stripBom } from "../../utils/json.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { sniffDocumentType, detectHtmlDocument, parseWebpHeader } from "../../utils/imageFormats.js";
import { maybeResizeAndDownsampleImageBlock } from "../../utils/imageResizer.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { getSmallFastModel } from "../../utils/model/smallFastModel.js";
import { formatFileSize } from "../../utils/format.js";
import { truncateMiddle } from "../../utils/stringUtils.js";
import { readTextFile } from "./caseSchema.js";
import { asSystemPrompt } from "../../utils/systemPromptType.js";
import { mainAgentContext } from "../../utils/agentContext.js";
import { queryHaiku, queryHaikuWithFallback } from "../api/claude.js";
import { extractTextContent_2 } from "../../utils/messages.js";
import { isSyntheticModelApiErrorMessage } from "../../bootstrap/sessionSlices.js";
import { isModelKeyAlias } from "../../utils/model/modelIds.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { fdRealPath } from "../../utils/plugins/npmPluginSource.js";
import { toEvalPathError, pathEndsWith } from "./evalDir.js";
import { readExactBytes } from "../artifacts/artifactUrl.js";
import { getPlatform } from "../../utils/platform.js";
import { EVAL_ARTIFACTS_DIR } from "./artifactStub.js";
import { isSameOrInside, pathSegments } from "./caseDiscovery.js";

//@ chunk-qchp9vrd.js:226805-226838 placement
/**
 * 会产生写入副作用的工具集合。
 */
var WRITE_LIKE_TOOLS = new Set([
  FILE_WRITE_TOOL_NAME,
  FILE_EDIT_TOOL_NAME,
  NOTEBOOK_EDIT_TOOL_NAME,
  BASH_TOOL_NAME,
  POWERSHELL_TOOL_NAME,
]);
//@ chunk-qchp9vrd.js:226838-229800 placement
/**
 * 检查评分器在授予的工具下能否通过（例如检查运行创建的文件却没有写工具）。
 */
function checkGradersSatisfiable(
  e,
  allowTools,
  { scaffolded, artifactPublishGranted, mockedTools = [], withheldServers = [], disallowedTools = [] },
) {
  let allowed = buildRunToolRules(e.execution.allowed_tools, allowTools, {
    artifactPublishGranted,
    mockedTools,
    disallowedTools,
  }).allowed;
  let y = [];
  let filtered = e.graders.filter((grader) => gradeFileExists(grader, scaffolded));
  if (
    filtered.length > 0 &&
    !artifactPublishGranted &&
    !allowed.some(
      (T) => !mockedTools.includes(T) && !isWithheldServerTool(T, withheldServers) && isWriteLikeTool(T),
    )
  ) {
    let filtered_2 = disallowedTools.filter((disallowedTool) => WRITE_LIKE_TOOLS.has(disallowedTool));
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
        return (grader.min ?? 1) >= 1
          ? [
              {
                grader: grader.name,
                tools: [grader.tool],
              },
            ]
          : [];
      case "tool_order":
        return [
          {
            grader: grader.name,
            tools: [grader.before.tool, grader.after.tool],
          },
        ];
      default:
        return [];
    }
  });
  if (flattened.length > 0) {
    let allBaseTools = getAllBaseTools();
    let N = (disallowedTools) => {
      let W = new Set(disallowedTools);
      let G = new Set(W);
      for (let baseTool of allBaseTools) if (toolMatchesAnyName(baseTool, W)) G.add(baseTool.name);
      return G;
    };
    let x = N(buildDisallowedTools(allowed, disallowedTools));
    let j = (X) =>
      disallowedTools.includes(X) ? X : disallowedTools.find((disallowedTool) => N([disallowedTool]).has(X));
    let K = new Set([ARTIFACT_TOOL_NAME]);
    for (let baseTool of allBaseTools)
      if (baseTool.familyParentToolName === ARTIFACT_TOOL_NAME) K.add(baseTool.name);
    for (let { grader, tools } of flattened)
      for (let G of new Set(tools)) {
        if (artifactPublishGranted && K.has(G)) {
          y.push({
            grader,
            text: `grader "${grader}" cannot pass: it needs a ${G} call in the trace, but a run opted into artifact publishing is offered the ${CLAUDE_ARTIFACTS} MCP tools in its place \u2014 name the tool the run calls (${mcpToolNames(PUBLISH_TOOL_NAMES).join(", ")}), or grade the publish itself under .eval-artifacts/`,
          });
          continue;
        }
        if (!x.has(G)) continue;
        let J = WORKTREE_TOOLS.includes(G) ? undefined : j(G);
        if (J !== undefined) {
          let se =
            J === G
              ? `${G} is in the case's disallowed_tools or --disallow-tools`
              : `${J} is in the case's disallowed_tools or --disallow-tools, which also withholds ${G}`;
          y.push({
            grader,
            text: `grader "${grader}" cannot pass: it needs a ${G} call in the trace, but ${se}, so no call can occur \u2014 change that list (and grant the tool if it is not granted), drop the grader, or invert it (max: 0) if absence is the point`,
          });
          continue;
        }
        let Z = WORKTREE_TOOLS.includes(G)
          ? `${G} is never available inside an eval run \u2014 drop the grader, or invert it (max: 0) if absence is the point`
          : K.has(G)
            ? `${G} comes only with the artifact-publishing opt-in this run does not have (not --allow-tools) \u2014 opt the case in, or drop the grader`
            : `add ${G} to the case's allowed_tools and grant it with --allow-tools ${G}`;
        y.push({
          grader,
          text: `grader "${grader}" cannot pass with the granted tools: it needs a ${G} call in the trace, but ${G} is not granted, so the run withholds it from the model and no call (not even a refused one) can occur \u2014 ${Z}`,
        });
      }
  }
  return y;
}
//@ chunk-qchp9vrd.js:229800-229867 placement
/**
 * 判断工具是否为写入类或来自 MCP 服务器。
 */
function isWriteLikeTool(e) {
  let toolName = permissionRuleValueFromString(e).toolName;
  return WRITE_LIKE_TOOLS.has(toolName) || mcpInfoFromString(toolName) !== null;
}
//@ chunk-qchp9vrd.js:229867-229951 placement
/**
 * 判断工具是否属于被扣留的服务器。
 */
function isWithheldServerTool(e, withheldServers) {
  let r = mcpInfoFromString(permissionRuleValueFromString(e).toolName);
  return r !== null && withheldServers.includes(r.serverName);
}
//@ chunk-qchp9vrd.js:229951-230224 placement
function gradeFileExists(grader, scaffolded) {
  switch (grader.type) {
    case "file_exists":
      return grader.exists;
    case "regex":
      if (typeof grader.target === "object" && grader.target.source === "file") return !scaffolded;
      return grader.target === "files" && !isNeverMatched(grader.match);
    case "llm":
      return typeof grader.focus === "object" && grader.focus.source === "file" && !scaffolded;
    default:
      return false;
  }
}
//@ chunk-qchp9vrd.js:230224-230313 placement
/**
 * 判断匹配条件是否表示“永远不匹配”。
 */
function isNeverMatched(match) {
  return match === "not_contains" || (match.startsWith("count:") && Number(match.slice(6)) === 0);
}
//@ chunk-qchp9vrd.js:230429-230501 placement
/**
 * 判断评分器是否为无 arm 的 skill 工具使用检查。
 */
function isSkillToolUsed(e) {
  return e.arm === undefined && e.type === "tool_used" && e.tool === SKILL;
}
//@ chunk-qchp9vrd.js:230501-231055 placement
async function gradeCase(e) {
  let n = [];
  let totalCostUSD = getTotalCostUSD();
  let a = (y) =>
    e.mockCallsWithOnly === true &&
    y.arm === undefined &&
    ((y.type === "regex" && y.target === "mock_calls") || (y.type === "llm" && y.focus === "mock_calls"));
  let s = (y) => y.arm === "with-only" || isSkillToolUsed(y) || a(y);
  let all = e.case_.graders.every(s);
  let w = e.arm === "without" && !all ? e.case_.graders.filter((grader) => !s(grader)) : e.case_.graders;
  let paidGradersSkipped = !!e.skipPaidGraders && w.some((y) => y.type === "llm" || y.type === "baseline");
  for (let y of w) {
    let R = await runGrader(y, e);
    if (e.arm !== undefined && !all && s(y)) R.with_only = true;
    R.scored = !R.with_only;
    n.push(R);
  }
  return {
    results: n,
    judgeCostUsd: getTotalCostUSD() - totalCostUSD,
    paidGradersSkipped,
  };
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
          return {
            name: e.name,
            passed: false,
            weight: e.weight,
            explanation: "skipped: cost ceiling",
          };
        return e.type === "llm" ? await gradeWithLlm(e, n) : await compareWithBaseline(e, n);
    }
  } catch (error) {
    return {
      name: e.name,
      passed: false,
      weight: e.weight,
      explanation: `grader threw: ${errorMessage(error)}`,
    };
  }
}
//@ chunk-qchp9vrd.js:231497-232578 placement
async function gradeLastMessage(e, n) {
  let graderFocusFile = await readGraderFocusFile(e.target, n);
  let a = describeTarget(e.target);
  if (graderFocusFile.kind === "unavailable") return failedGrader(e, graderFocusFile.reason);
  if (graderFocusFile.kind === "image") {
    let S =
      e.match === "not_contains" || e.match === "count:0"
        ? "to assert something is absent, have the case also write a text rendering and run this grader over that"
        : `grade what is visible with an llm grader (focus: {source: file, path: ${graderFocusFile.path}})`;
    return failedGrader(
      e,
      `${a} is an image (${graderFocusFile.mediaType}); a regex grader needs text \u2014 ${S}`,
    );
  }
  let text = graderFocusFile.text;
  let regExp = new RegExp(e.pattern, e.flags);
  let w = e.flags.includes("g") ? e.flags : `${e.flags}g`;
  let b = text.match(new RegExp(e.pattern, w)) ?? [];
  let y;
  let R;
  if (e.match === "contains") {
    y = regExp.test(text);
    R = y ? `matched ${e.pattern}` : `pattern not found in ${a}`;
  } else if (e.match === "not_contains") {
    y = !regExp.test(text);
    R = y ? "pattern absent as expected" : "pattern found (expected absent)";
  } else if (e.match.startsWith("count:")) {
    let S = parseInt(e.match.slice(6), 10);
    y = b.length === S;
    R = `found ${b.length} matches (expected ${S})`;
  } else {
    y = false;
    R = `unknown match mode "${e.match}" (use contains | not_contains | count:N)`;
  }
  return {
    name: e.name,
    passed: y,
    weight: e.weight,
    explanation: R,
  };
}
//@ chunk-qchp9vrd.js:232578-232979 placement
function gradeToolOrder(e, { run }) {
  let toolCallIndex = findToolCallIndex(run.toolCalls, e.before);
  let toolCallIndex_2 = findToolCallIndex(run.toolCalls, e.after);
  if (toolCallIndex === -1) return failedGrader(e, `"before" tool ${e.before.tool} never called`);
  if (toolCallIndex_2 === -1) return failedGrader(e, `"after" tool ${e.after.tool} never called`);
  let s = toolCallIndex < toolCallIndex_2;
  return {
    name: e.name,
    passed: s,
    weight: e.weight,
    explanation: s
      ? `${e.before.tool}@${toolCallIndex} precedes ${e.after.tool}@${toolCallIndex_2}`
      : `${e.before.tool}@${toolCallIndex} does NOT precede ${e.after.tool}@${toolCallIndex_2}`,
  };
}
//@ chunk-qchp9vrd.js:232979-233278 placement
function gradeToolCallCount(e, { run }) {
  let r = {
    tool: e.tool,
    input_match: e.input_match,
  };
  let a = count(run.toolCalls, (b) => matchesToolExpectation(b, r));
  let min = e.min ?? 1;
  let h = e.max ?? Number.POSITIVE_INFINITY;
  let passed = a >= min && a <= h;
  return {
    name: e.name,
    passed,
    weight: e.weight,
    explanation: `${e.tool} called ${a}x (expected ${min}..${h === Number.POSITIVE_INFINITY ? "\u221E" : h})`,
  };
}
//@ chunk-qchp9vrd.js:233278-233599 placement
function gradeFileState(e, { cwdDiff }) {
  let r = fileGlobToRegExp(e.path);
  let any = (cwdDiff ?? "")
    .split(
      `
`,
    )
    .filter((line) => line.trim())
    .some((line) => r.test(line.trim()));
  let s = any === e.exists;
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
/**
 * 找到第一个匹配工具期望的调用下标。
 */
function findToolCallIndex(toolCalls, n) {
  return toolCalls.findIndex((r) => matchesToolExpectation(r, n));
}
//@ chunk-qchp9vrd.js:233649-233771 placement
function matchesToolExpectation(e, n) {
  if (e.name !== n.tool) return false;
  if (n.input_match) return new RegExp(n.input_match).test(e.inputText);
  return true;
}
//@ chunk-qchp9vrd.js:233771-233803 placement
/**
 * 需要转义的正则元字符。
 */
var REGEX_META_CHARS = new Set(".+^${}()|[]\\");
//@ chunk-qchp9vrd.js:233803-234073 placement
function fileGlobToRegExp(path) {
  let n = "^";
  for (let j = 0; j < path.length; j++) {
    let a = path.charAt(j);
    if (a === "*") {
      if (path.charAt(j + 1) === "*") {
        if (path.charAt(j + 2) === "/") {
          n += "(?:.*/)?";
          j += 2;
        } else {
          n += ".*";
          j++;
        }
      } else n += "[^/]*";
    } else if (a === "?") n += ".";
    else if (REGEX_META_CHARS.has(a)) n += `\\${a}`;
    else n += a;
  }
  return new RegExp(`${n}$`);
}
//@ chunk-qchp9vrd.js:234073-234150 placement
/**
 * 构造判失败的评分器结果。
 */
function failedGrader(e, explanation) {
  return {
    name: e.name,
    passed: false,
    weight: e.weight,
    explanation,
  };
}
//@ chunk-qchp9vrd.js:234150-234174 placement
/**
 * 关注文件的最大字节数（10 MiB）。
 */
var MAX_FOCUS_SPECS = 8000;
var MAX_FOCUS_FILE_BYTES = 10485760;
//@ chunk-qchp9vrd.js:234174-235454 placement
/**
 * 读取评分关注的文件（防止链接逃逸、不存在或过大）。
 */
async function readGraderFocusFile(e, { run, cwdDiff, sandboxCwd, stubPublishDir, case_, signal }) {
  if (typeof e === "object") {
    let b = EVAL_RUN_BASE_PATH(e.path);
    if (b !== null && stubPublishDir === undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `focus file ${e.path} does not exist (artifact publishing was not granted for this run, so nothing was published)`,
        "grader focus file does not exist",
      );
    let y = b !== null && stubPublishDir !== undefined ? stubPublishDir : sandboxCwd;
    let R = await checkCasePathInsideRoot(
      y,
      b ?? e.path,
      `case "${case_.name}" grader focus file "${e.path}"`,
      b !== null ? "stub publish directory" : "run sandbox",
    );
    signal.throwIfAborted();
    let focusFile = await openFocusFileSafely(y, R, e.path);
    signal.throwIfAborted();
    let T = Ph(focusFile);
    if (T !== null)
      return {
        kind: "image",
        bytes: focusFile,
        path: e.path,
        mediaType: T,
      };
    return {
      kind: "text",
      text: stripBom(focusFile.toString("utf8")),
      binaryHead: describeBinaryContent(focusFile),
    };
  }
  if (e === "last_message")
    return {
      kind: "text",
      text: run.lastAssistantText,
    };
  if (e === "files")
    return {
      kind: "text",
      text: cwdDiff ?? "",
    };
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
        .filter((toolCall) => toolCall.mock !== undefined)
        .map((toolCall) =>
          jsonStringify({
            tool: toolCall.name,
            input: toolCall.input,
            ...(toolCall.output !== undefined && {
              output: toolCall.output,
            }),
            ...(toolCall.isError && {
              isError: true,
            }),
            verdict: toolCall.mock?.verdict,
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
function describeBinaryContent(focusFile) {
  if (sniffDocumentType(focusFile) !== null) return `it is a ${detectHtmlDocument(focusFile)}`;
  let index = focusFile.indexOf(0);
  if (index !== -1)
    return `it contains a NUL byte at offset ${index} (binary data, UTF-16 text \u2014 save such artifacts as UTF-8 \u2014 or NUL-separated output; leading bytes: ${detectHtmlDocument(focusFile)})`;
  return;
}
//@ chunk-qchp9vrd.js:235714-235775 placement
/**
 * 描述评分目标（文件路径或文本）。
 */
function describeTarget(focus) {
  return typeof focus === "object" ? `file ${focus.path}` : focus;
}
//@ chunk-qchp9vrd.js:235775-235800 placement
/**
 * trace 摘要的长度（20000）。
 */
var MAX_JUDGE_ATTEMPTS = 3;
var MAX_JUDGE_INPUT_CHARS = 1e5;
var JUDGE_TRACE_CHARS = 20000;
//@ chunk-qchp9vrd.js:235800-237977 placement
/**
 * 用模型按标准评分（构建评分提示词、附图片与 trace 摘要）。
 */
async function gradeWithLlm(e, n) {
  let r =
    e.focus === "trace"
      ? {
          kind: "text",
          text: elideMessages(n.run.trace),
        }
      : await readGraderFocusFile(e.focus, n);
  if (r.kind === "unavailable") return failedGrader(e, r.reason);
  let a = `You are grading the output of a coding agent against a criterion.

Criterion:
${e.criteria}`;
  let s = "Respond with exactly one word: PASS or FAIL.";
  let h;
  let w;
  let b = "";
  if (r.kind === "text" && r.binaryHead !== undefined)
    return failedGrader(
      e,
      `${describeTarget(e.focus)} cannot be shown to the judge as text \u2014 ${r.binaryHead}. It is not a supported image either (PNG/JPEG/GIF/WebP), so have the case render it to an image or write its content as a UTF-8 text file, and grade that.`,
    );
  if (r.kind === "image") {
    let { block, dimensions } = await maybeResizeAndDownsampleImageBlock({
      data: r.bytes,
      mediaType: r.mediaType,
      limits: imageLimitsForModel(normalizeJudgeModel(n.judgeModel) ?? getSmallFastModel()),
    });
    if (block.type !== "image" || block.source.type !== "base64")
      return failedGrader(
        e,
        `focus file ${r.path} could not be prepared as an image for the judge: ${block.type === "text" ? block.text : "unexpected image source"}`,
      );
    h = [
      {
        type: "text",
        text: `${a}

Agent output (${describeTarget(e.focus)}) is the attached image:`,
      },
      block,
      {
        type: "text",
        text: s,
      },
    ];
    let N = dimensions?.displayWidth ? `, ${dimensions.displayWidth}x${dimensions.displayHeight}px` : "";
    let webpHeader = parseWebpHeader(r.bytes);
    let j = webpHeader ? `, ${webpHeader.width}x${webpHeader.height}px` : "";
    w = `[image shown to the judge: ${r.path} \u2014 sent as ${block.source.media_type}, ${formatFileSize(Buffer.byteLength(block.source.data, "base64"))}${N}; file on disk: ${r.mediaType}, ${formatFileSize(r.bytes.length)}${j}]`;
    b = " (image)";
  } else {
    let S =
      r.text === "" && e.focus === "files"
        ? "(no file changes)"
        : r.text === "" && e.focus === "mock_calls"
          ? "(no mocked tool calls)"
          : r.text;
    w = truncateMiddle(
      S,
      MAX_JUDGE_INPUT_CHARS - JUDGE_TRACE_CHARS,
      JUDGE_TRACE_CHARS,
      (T) => `
[\u2026${T} chars elided\u2026]
`,
    );
    h = `${a}


Agent output (${describeTarget(e.focus)}):
${w}


${s}`;
    b =
      typeof e.focus === "object" && S.length > MAX_FOCUS_SPECS
        ? ` \u2014 note: long file (${S.length} chars); llm judges are noisy on long inputs, prefer a regex grader for large artifacts`
        : "";
  }
  let y;
  try {
    y = await runEvalJudgeTrials(h, n);
  } catch (error) {
    if (r.kind === "image" && error instanceof AttachedMediaRejectedError)
      return failedGrader(
        e,
        `focus file ${r.path} was rejected by the API as an image (${error.reason}) \u2014 the artifact may be truncated or corrupt, or the judge route does not accept images`,
      );
    throw error;
  }
  let passed = count(y, Boolean) > y.length / 2;
  return {
    name: e.name,
    passed,
    weight: e.weight,
    explanation: `judge votes: ${y.map((S) => (S ? "PASS" : "FAIL")).join(" ")}${b}`,
    judge_votes: y,
    evidence: w,
  };
}
//@ chunk-qchp9vrd.js:237977-238811 placement
async function compareWithBaseline(e, n) {
  let { case_, run } = n;
  let s;
  try {
    let caseFileInsideSuite = await resolveCaseFileInsideSuite(case_, e.baseline_file, "baseline_file");
    let textFile = await readTextFile(caseFileInsideSuite, MAX_FOCUS_FILE_BYTES, "baseline file");
    if (textFile === null) return failedGrader(e, `baseline file ${e.baseline_file} does not exist`);
    s = textFile
      .split(
        `
`,
      )
      .filter((line) => line.trim())
      .map((line) => jsonParse(line));
  } catch (error) {
    return failedGrader(
      e,
      `failed to read baseline: ${error instanceof Error ? error.message : String(error)}`,
    );
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

`);
  let w = await runEvalJudgeTrials(joined, n);
  let passed = count(w, Boolean) > w.length / 2;
  return {
    name: e.name,
    passed,
    weight: e.weight,
    explanation: `judge votes: ${w.map((y) => (y ? "PASS" : "FAIL")).join(" ")}`,
    judge_votes: w,
  };
}
//@ chunk-qchp9vrd.js:238811-238944 placement
async function runEvalJudgeTrials(description, signal) {
  let r = [];
  for (let j = 0; j < MAX_JUDGE_ATTEMPTS; j++) {
    let s = await runEvalJudge(description, signal);
    r.push(/\bPASS\b/i.test(s) && !/\bFAIL\b/i.test(s));
  }
  return r;
}
//@ chunk-qchp9vrd.js:238944-239610 placement = generateTitleAndBranch (0.267)
async function runEvalJudge(description, signal) {
  let systemPrompt = asSystemPrompt(["You are a strict, terse evaluation judge for coding-agent traces."]);
  let reason;
  let s = {
    querySource: "plugin_eval_judge",
    agents: [],
    isNonInteractiveSession: true,
    hasAppendSystemPrompt: false,
    mcpTools: [],
    agentContext: mainAgentContext(),
    onMediaStripped: (y, R) => {
      reason = R;
    },
    credentials: signal.credentials,
  };
  let h = normalizeJudgeModel(signal.judgeModel);
  let w = h
    ? await queryHaiku({
        systemPrompt,
        userPrompt: description,
        signal: signal.signal,
        options: {
          ...s,
          model: h,
        },
      })
    : await queryHaikuWithFallback({
        systemPrompt,
        userPrompt: description,
        signal: signal.signal,
        options: s,
      });
  let parsed = extractTextContent_2(w.message.content);
  if (isSyntheticModelApiErrorMessage(w))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `judge call failed: ${parsed}${reason !== undefined ? ` (after the attached image was rejected: ${reason})` : ""}`,
      "plugin eval judge call failed",
    );
  if (reason !== undefined) throw new AttachedMediaRejectedError(reason);
  return parsed;
}
//@ chunk-qchp9vrd.js:239610-239753 layout
class AttachedMediaRejectedError extends Error {
  reason;
  constructor(reason) {
    super("attached media rejected by the API");
    this.reason = reason;
    this.name = "AttachedMediaRejectedError";
  }
}
//@ chunk-qchp9vrd.js:239753-239813 placement
/**
 * 规范化判分模型名（用户指定时解析成实际模型）。
 */
function normalizeJudgeModel(judgeModel) {
  return judgeModel && isModelKeyAlias(judgeModel.toLowerCase().trim())
    ? parseUserSpecifiedModel(judgeModel)
    : judgeModel;
}
//@ chunk-qchp9vrd.js:239813-240021 placement
function elideMessages(trace) {
  if (trace.length <= 24)
    return trace.map((h) => jsonStringify(h)).join(`
`);
  let mapped = trace.slice(0, 12).map((h) => jsonStringify(h));
  let mapped_2 = trace.slice(-12).map((h) => jsonStringify(h));
  return [...mapped, `[\u2026${trace.length - 12 - 12} messages elided\u2026]`, ...mapped_2].join(`
`);
}
//@ chunk-qchp9vrd.js:240021-241664 placement
async function openFocusFileSafely(e, n, path) {
  let a = () =>
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `focus file ${path} leaves the run directory through a link`,
      "grader focus file escapes the run directory via link",
    );
  let s = await lstat(e, {
    bigint: true,
  }).catch(() => null);
  if (s === null || !s.isDirectory() || s.isSymbolicLink()) throw a();
  let h = await realpath(e).catch(() => null);
  if (h === null || h !== e) throw a();
  let w = await lstat(h, {
    bigint: true,
  }).catch(() => null);
  if (w === null || w.ino !== s.ino || w.dev !== s.dev) throw a();
  let b;
  try {
    b = await open(n, constants.O_RDONLY | FILE_OPEN_EXTRA_FLAGS);
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `focus file ${path} does not exist`,
        "grader focus file does not exist",
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `focus file ${path} is unreadable (${getErrnoCode(error) ?? "unknown error"})`,
      "grader focus file unreadable",
    );
  }
  try {
    let stats = await b.stat({
      bigint: true,
    });
    if (!stats.isFile())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `focus file ${path} is not a regular file`,
        "grader focus file not a regular file",
      );
    if (stats.nlink > 1n)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `focus file ${path} has more than one hard link, so the grader cannot tell whether it also lives outside the run directory \u2014 not read (point the focus at a file with a single link, e.g. a copy)`,
        "grader focus file has multiple hard links",
      );
    if (stats.ino === 0n) throw a();
    let R = await fdRealPath(b.fd);
    let S = R ?? (await realpath(n).catch(() => null));
    if (S === null || !toEvalPathError(h, S)) throw a();
    if (R === null) {
      let x = await lstat(S, {
        bigint: true,
      }).catch(() => null);
      if (x === null || x.ino !== stats.ino || x.dev !== stats.dev || x.nlink !== 1n) throw a();
    }
    if (stats.size > BigInt(MAX_FOCUS_FILE_BYTES))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `focus file ${path} exceeds ${formatFileSize(MAX_FOCUS_FILE_BYTES)}`,
        "grader focus file too large",
      );
    let T = Number(stats.size);
    let exactBytes = await readExactBytes(b, T);
    if (exactBytes === null)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `focus file ${path} changed while being read (vetted at ${T} bytes); try again`,
        "grader focus file changed during read",
      );
    return exactBytes;
  } finally {
    await b.close().catch(() => {});
  }
}
//@ chunk-qchp9vrd.js:241664-241703 placement
/**
 * 打开文件时额外使用的标志（非 Windows 非阻塞）。
 */
var FILE_OPEN_EXTRA_FLAGS = getPlatform() === "windows" ? 0 : constants.O_NONBLOCK;
//@ chunk-qchp9vrd.js:241703-241918 placement
function EVAL_RUN_BASE_PATH(path) {
  let resolved = path_2.resolve("/eval-run-base");
  let resolved_2 = path_2.resolve(resolved, path.replaceAll("\\", "/"));
  let relativePath = path_2.relative(path_2.join(resolved, EVAL_ARTIFACTS_DIR), resolved_2);
  if (relativePath === "") return ".";
  return relativePath.startsWith("..") || path_2.isAbsolute(relativePath)
    ? null
    : relativePath.split(path_2.sep).join("/");
}
//@ chunk-qchp9vrd.js:241992-242163 placement
/**
 * 从文件路径向上查找最近的、以指定段结尾的模拟基准目录（不超出根）。
 */
function findMockBaseDir(caseDir, n, r) {
  if (r.length > 0) {
    let a = null;
    let resolved = path_2.resolve(caseDir);
    while (isSameOrInside(resolved, n) && resolved !== n) {
      if (pathEndsWith(pathSegments(resolved), r)) a = resolved;
      let dir = path_2.dirname(resolved);
      if (dir === resolved) break;
      resolved = dir;
    }
    if (a !== null) return a;
  }
  return n;
}
//@ chunk-qchp9vrd.js:242163-242327 placement
/**
 * 列出路径在根目录内的祖先目录链。
 */
function listAncestorChain(caseDir, mockBaseDir) {
  let dir = path_2.dirname(caseDir);
  if (!isSameOrInside(dir, mockBaseDir)) return [caseDir];
  let a = [];
  let s = dir;
  for (;;) {
    a.push(s);
    let dir = path_2.dirname(s);
    if (dir === s || !isSameOrInside(dir, mockBaseDir)) break;
    s = dir;
  }
  return [...a.reverse(), caseDir];
}
export { listAncestorChain, findMockBaseDir, checkGradersSatisfiable, normalizeJudgeModel, gradeCase };
