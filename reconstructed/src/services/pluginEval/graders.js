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
import { sniffImageMediaType } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
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
  caseSpec,
  allowTools,
  { scaffolded, artifactPublishGranted, mockedTools = [], withheldServers = [], disallowedTools = [] },
) {
  let allowed = buildRunToolRules(caseSpec.execution.allowed_tools, allowTools, {
    artifactPublishGranted,
    mockedTools,
    disallowedTools,
  }).allowed;
  let problems = [];
  let filtered = caseSpec.graders.filter((grader) => gradeFileExists(grader, scaffolded));
  if (
    filtered.length > 0 &&
    !artifactPublishGranted &&
    !allowed.some(
      (rule) =>
        !mockedTools.includes(rule) && !isWithheldServerTool(rule, withheldServers) && isWriteLikeTool(rule),
    )
  ) {
    let filtered_2 = disallowedTools.filter((disallowedTool) => WRITE_LIKE_TOOLS.has(disallowedTool));
    for (let grader of filtered)
      problems.push({
        grader: grader.name,
        text:
          filtered_2.length > 0
            ? `grader "${grader.name}" cannot pass: it checks a file the run creates, but no tool the run may use can create one (a plugin hook still could), and the case's disallowed_tools or --disallow-tools lists ${filtered_2.join(", ")} \u2014 take one off that list and grant it (allowed_tools and --allow-tools), or drop the grader`
            : `grader "${grader.name}" cannot pass with the granted tools: it checks a file the run creates, but no tool the run may use can create one (a plugin hook still could; a skill's own allowed-tools does not count inside a run) \u2014 add Write (or Edit / Bash) to the case's allowed_tools and grant it with --allow-tools`,
      });
  }
  let flattened = caseSpec.graders.flatMap((grader) => {
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
    let expandDisallowed = (disallowedTools) => {
      let names = new Set(disallowedTools);
      let expanded = new Set(names);
      for (let baseTool of allBaseTools) if (toolMatchesAnyName(baseTool, names)) expanded.add(baseTool.name);
      return expanded;
    };
    let blockedTools = expandDisallowed(buildDisallowedTools(allowed, disallowedTools));
    let findBlockingTool = (toolName) =>
      disallowedTools.includes(toolName)
        ? toolName
        : disallowedTools.find((disallowedTool) => expandDisallowed([disallowedTool]).has(toolName));
    let artifactToolNames = new Set([ARTIFACT_TOOL_NAME]);
    for (let baseTool of allBaseTools)
      if (baseTool.familyParentToolName === ARTIFACT_TOOL_NAME) artifactToolNames.add(baseTool.name);
    for (let { grader, tools } of flattened)
      for (let toolName of new Set(tools)) {
        if (artifactPublishGranted && artifactToolNames.has(toolName)) {
          problems.push({
            grader,
            text: `grader "${grader}" cannot pass: it needs a ${toolName} call in the trace, but a run opted into artifact publishing is offered the ${CLAUDE_ARTIFACTS} MCP tools in its place \u2014 name the tool the run calls (${mcpToolNames(PUBLISH_TOOL_NAMES).join(", ")}), or grade the publish itself under .eval-artifacts/`,
          });
          continue;
        }
        if (!blockedTools.has(toolName)) continue;
        let blockedBy = WORKTREE_TOOLS.includes(toolName) ? undefined : findBlockingTool(toolName);
        if (blockedBy !== undefined) {
          let blockReason =
            blockedBy === toolName
              ? `${toolName} is in the case's disallowed_tools or --disallow-tools`
              : `${blockedBy} is in the case's disallowed_tools or --disallow-tools, which also withholds ${toolName}`;
          problems.push({
            grader,
            text: `grader "${grader}" cannot pass: it needs a ${toolName} call in the trace, but ${blockReason}, so no call can occur \u2014 change that list (and grant the tool if it is not granted), drop the grader, or invert it (max: 0) if absence is the point`,
          });
          continue;
        }
        let remedy = WORKTREE_TOOLS.includes(toolName)
          ? `${toolName} is never available inside an eval run \u2014 drop the grader, or invert it (max: 0) if absence is the point`
          : artifactToolNames.has(toolName)
            ? `${toolName} comes only with the artifact-publishing opt-in this run does not have (not --allow-tools) \u2014 opt the case in, or drop the grader`
            : `add ${toolName} to the case's allowed_tools and grant it with --allow-tools ${toolName}`;
        problems.push({
          grader,
          text: `grader "${grader}" cannot pass with the granted tools: it needs a ${toolName} call in the trace, but ${toolName} is not granted, so the run withholds it from the model and no call (not even a refused one) can occur \u2014 ${remedy}`,
        });
      }
  }
  return problems;
}
//@ chunk-qchp9vrd.js:229800-229867 placement
/**
 * 判断工具是否为写入类或来自 MCP 服务器。
 */
function isWriteLikeTool(rule) {
  let toolName = permissionRuleValueFromString(rule).toolName;
  return WRITE_LIKE_TOOLS.has(toolName) || mcpInfoFromString(toolName) !== null;
}
//@ chunk-qchp9vrd.js:229867-229951 placement
/**
 * 判断工具是否属于被扣留的服务器。
 */
function isWithheldServerTool(toolName, withheldServers) {
  let mcpInfo = mcpInfoFromString(permissionRuleValueFromString(toolName).toolName);
  return mcpInfo !== null && withheldServers.includes(mcpInfo.serverName);
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
function isSkillToolUsed(grader) {
  return grader.arm === undefined && grader.type === "tool_used" && grader.tool === SKILL;
}
//@ chunk-qchp9vrd.js:230501-231055 placement
async function gradeCase(input) {
  let results = [];
  let totalCostUSD = getTotalCostUSD();
  let isMockOnlyGrader = (grader) =>
    input.mockCallsWithOnly === true &&
    grader.arm === undefined &&
    ((grader.type === "regex" && grader.target === "mock_calls") ||
      (grader.type === "llm" && grader.focus === "mock_calls"));
  let isWithOnlyGrader = (grader) =>
    grader.arm === "with-only" || isSkillToolUsed(grader) || isMockOnlyGrader(grader);
  let all = input.case_.graders.every(isWithOnlyGrader);
  let graders =
    input.arm === "without" && !all
      ? input.case_.graders.filter((grader) => !isWithOnlyGrader(grader))
      : input.case_.graders;
  let paidGradersSkipped =
    !!input.skipPaidGraders && graders.some((grader) => grader.type === "llm" || grader.type === "baseline");
  for (let grader of graders) {
    let result = await runGrader(grader, input);
    if (input.arm !== undefined && !all && isWithOnlyGrader(grader)) result.with_only = true;
    result.scored = !result.with_only;
    results.push(result);
  }
  return {
    results,
    judgeCostUsd: getTotalCostUSD() - totalCostUSD,
    paidGradersSkipped,
  };
}
//@ chunk-qchp9vrd.js:231055-231497 placement
async function runGrader(grader, input) {
  try {
    switch (grader.type) {
      case "regex":
        return await gradeLastMessage(grader, input);
      case "tool_order":
        return gradeToolOrder(grader, input);
      case "tool_used":
        return gradeToolCallCount(grader, input);
      case "file_exists":
        return gradeFileState(grader, input);
      case "llm":
      case "baseline":
        if (input.skipPaidGraders)
          return {
            name: grader.name,
            passed: false,
            weight: grader.weight,
            explanation: "skipped: cost ceiling",
          };
        return grader.type === "llm"
          ? await gradeWithLlm(grader, input)
          : await compareWithBaseline(grader, input);
    }
  } catch (error) {
    return {
      name: grader.name,
      passed: false,
      weight: grader.weight,
      explanation: `grader threw: ${errorMessage(error)}`,
    };
  }
}
//@ chunk-qchp9vrd.js:231497-232578 placement
async function gradeLastMessage(grader, input) {
  let graderFocusFile = await readGraderFocusFile(grader.target, input);
  let targetLabel = describeTarget(grader.target);
  if (graderFocusFile.kind === "unavailable") return failedGrader(grader, graderFocusFile.reason);
  if (graderFocusFile.kind === "image") {
    let hint =
      grader.match === "not_contains" || grader.match === "count:0"
        ? "to assert something is absent, have the case also write a text rendering and run this grader over that"
        : `grade what is visible with an llm grader (focus: {source: file, path: ${graderFocusFile.path}})`;
    return failedGrader(
      grader,
      `${targetLabel} is an image (${graderFocusFile.mediaType}); a regex grader needs text \u2014 ${hint}`,
    );
  }
  let text = graderFocusFile.text;
  let regExp = new RegExp(grader.pattern, grader.flags);
  let globalFlags = grader.flags.includes("g") ? grader.flags : `${grader.flags}g`;
  let matches = text.match(new RegExp(grader.pattern, globalFlags)) ?? [];
  let passed;
  let explanation;
  if (grader.match === "contains") {
    passed = regExp.test(text);
    explanation = passed ? `matched ${grader.pattern}` : `pattern not found in ${targetLabel}`;
  } else if (grader.match === "not_contains") {
    passed = !regExp.test(text);
    explanation = passed ? "pattern absent as expected" : "pattern found (expected absent)";
  } else if (grader.match.startsWith("count:")) {
    let expectedCount = parseInt(grader.match.slice(6), 10);
    passed = matches.length === expectedCount;
    explanation = `found ${matches.length} matches (expected ${expectedCount})`;
  } else {
    passed = false;
    explanation = `unknown match mode "${grader.match}" (use contains | not_contains | count:N)`;
  }
  return {
    name: grader.name,
    passed,
    weight: grader.weight,
    explanation,
  };
}
//@ chunk-qchp9vrd.js:232578-232979 placement
function gradeToolOrder(grader, { run }) {
  let toolCallIndex = findToolCallIndex(run.toolCalls, grader.before);
  let toolCallIndex_2 = findToolCallIndex(run.toolCalls, grader.after);
  if (toolCallIndex === -1) return failedGrader(grader, `"before" tool ${grader.before.tool} never called`);
  if (toolCallIndex_2 === -1) return failedGrader(grader, `"after" tool ${grader.after.tool} never called`);
  let inOrder = toolCallIndex < toolCallIndex_2;
  return {
    name: grader.name,
    passed: inOrder,
    weight: grader.weight,
    explanation: inOrder
      ? `${grader.before.tool}@${toolCallIndex} precedes ${grader.after.tool}@${toolCallIndex_2}`
      : `${grader.before.tool}@${toolCallIndex} does NOT precede ${grader.after.tool}@${toolCallIndex_2}`,
  };
}
//@ chunk-qchp9vrd.js:232979-233278 placement
function gradeToolCallCount(grader, { run }) {
  let expectation = {
    tool: grader.tool,
    input_match: grader.input_match,
  };
  let callCount = count(run.toolCalls, (call) => matchesToolExpectation(call, expectation));
  let min = grader.min ?? 1;
  let max = grader.max ?? Number.POSITIVE_INFINITY;
  let passed = callCount >= min && callCount <= max;
  return {
    name: grader.name,
    passed,
    weight: grader.weight,
    explanation: `${grader.tool} called ${callCount}x (expected ${min}..${max === Number.POSITIVE_INFINITY ? "\u221E" : max})`,
  };
}
//@ chunk-qchp9vrd.js:233278-233599 placement
function gradeFileState(grader, { cwdDiff }) {
  let pattern = fileGlobToRegExp(grader.path);
  let any = (cwdDiff ?? "")
    .split(
      `
`,
    )
    .filter((line) => line.trim())
    .some((line) => pattern.test(line.trim()));
  let passed = any === grader.exists;
  return {
    name: grader.name,
    passed,
    weight: grader.weight,
    explanation: passed
      ? `${grader.path} ${grader.exists ? "exists" : "absent"} as expected`
      : `${grader.path} ${any ? "exists" : "missing"} (expected ${grader.exists ? "present" : "absent"})`,
  };
}
//@ chunk-qchp9vrd.js:233599-233649 placement
/**
 * 找到第一个匹配工具期望的调用下标。
 */
function findToolCallIndex(toolCalls, expectation) {
  return toolCalls.findIndex((toolCall) => matchesToolExpectation(toolCall, expectation));
}
//@ chunk-qchp9vrd.js:233649-233771 placement
function matchesToolExpectation(toolCall, expectation) {
  if (toolCall.name !== expectation.tool) return false;
  if (expectation.input_match) return new RegExp(expectation.input_match).test(toolCall.inputText);
  return true;
}
//@ chunk-qchp9vrd.js:233771-233803 placement
/**
 * 需要转义的正则元字符。
 */
var REGEX_META_CHARS = new Set(".+^${}()|[]\\");
//@ chunk-qchp9vrd.js:233803-234073 placement
function fileGlobToRegExp(path) {
  let source = "^";
  for (let j = 0; j < path.length; j++) {
    let character = path.charAt(j);
    if (character === "*") {
      if (path.charAt(j + 1) === "*") {
        if (path.charAt(j + 2) === "/") {
          source += "(?:.*/)?";
          j += 2;
        } else {
          source += ".*";
          j++;
        }
      } else source += "[^/]*";
    } else if (character === "?") source += ".";
    else if (REGEX_META_CHARS.has(character)) source += `\\${character}`;
    else source += character;
  }
  return new RegExp(`${source}$`);
}
//@ chunk-qchp9vrd.js:234073-234150 placement
/**
 * 构造判失败的评分器结果。
 */
function failedGrader(grader, explanation) {
  return {
    name: grader.name,
    passed: false,
    weight: grader.weight,
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
async function readGraderFocusFile(focus, { run, cwdDiff, sandboxCwd, stubPublishDir, case_, signal }) {
  if (typeof focus === "object") {
    let stubPath = EVAL_RUN_BASE_PATH(focus.path);
    if (stubPath !== null && stubPublishDir === undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `focus file ${focus.path} does not exist (artifact publishing was not granted for this run, so nothing was published)`,
        "grader focus file does not exist",
      );
    let rootDir = stubPath !== null && stubPublishDir !== undefined ? stubPublishDir : sandboxCwd;
    let focusPath = await checkCasePathInsideRoot(
      rootDir,
      stubPath ?? focus.path,
      `case "${case_.name}" grader focus file "${focus.path}"`,
      stubPath !== null ? "stub publish directory" : "run sandbox",
    );
    signal.throwIfAborted();
    let focusFile = await openFocusFileSafely(rootDir, focusPath, focus.path);
    signal.throwIfAborted();
    let mediaType = sniffImageMediaType(focusFile);
    if (mediaType !== null)
      return {
        kind: "image",
        bytes: focusFile,
        path: focus.path,
        mediaType,
      };
    return {
      kind: "text",
      text: stripBom(focusFile.toString("utf8")),
      binaryHead: describeBinaryContent(focusFile),
    };
  }
  if (focus === "last_message")
    return {
      kind: "text",
      text: run.lastAssistantText,
    };
  if (focus === "files")
    return {
      kind: "text",
      text: cwdDiff ?? "",
    };
  if (focus === "mock_calls") {
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
    text: run.trace.map((entry) => jsonStringify(entry)).join(`
`),
  };
}
//@ chunk-qchp9vrd.js:235454-235714 placement
function describeBinaryContent(head) {
  if (sniffDocumentType(head) !== null) return `it is a ${detectHtmlDocument(head)}`;
  let index = head.indexOf(0);
  if (index !== -1)
    return `it contains a NUL byte at offset ${index} (binary data, UTF-16 text \u2014 save such artifacts as UTF-8 \u2014 or NUL-separated output; leading bytes: ${detectHtmlDocument(head)})`;
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
async function gradeWithLlm(grader, input) {
  let focusContent =
    grader.focus === "trace"
      ? {
          kind: "text",
          text: elideMessages(input.run.trace),
        }
      : await readGraderFocusFile(grader.focus, input);
  if (focusContent.kind === "unavailable") return failedGrader(grader, focusContent.reason);
  let promptHeader = `You are grading the output of a coding agent against a criterion.

Criterion:
${grader.criteria}`;
  let answerInstruction = "Respond with exactly one word: PASS or FAIL.";
  let judgePrompt;
  let evidence;
  let noteSuffix = "";
  if (focusContent.kind === "text" && focusContent.binaryHead !== undefined)
    return failedGrader(
      grader,
      `${describeTarget(grader.focus)} cannot be shown to the judge as text \u2014 ${focusContent.binaryHead}. It is not a supported image either (PNG/JPEG/GIF/WebP), so have the case render it to an image or write its content as a UTF-8 text file, and grade that.`,
    );
  if (focusContent.kind === "image") {
    let { block, dimensions } = await maybeResizeAndDownsampleImageBlock({
      data: focusContent.bytes,
      mediaType: focusContent.mediaType,
      limits: imageLimitsForModel(normalizeJudgeModel(input.judgeModel) ?? getSmallFastModel()),
    });
    if (block.type !== "image" || block.source.type !== "base64")
      return failedGrader(
        grader,
        `focus file ${focusContent.path} could not be prepared as an image for the judge: ${block.type === "text" ? block.text : "unexpected image source"}`,
      );
    judgePrompt = [
      {
        type: "text",
        text: `${promptHeader}

Agent output (${describeTarget(grader.focus)}) is the attached image:`,
      },
      block,
      {
        type: "text",
        text: answerInstruction,
      },
    ];
    let displaySize = dimensions?.displayWidth
      ? `, ${dimensions.displayWidth}x${dimensions.displayHeight}px`
      : "";
    let webpHeader = parseWebpHeader(focusContent.bytes);
    let webpSize = webpHeader ? `, ${webpHeader.width}x${webpHeader.height}px` : "";
    evidence = `[image shown to the judge: ${focusContent.path} \u2014 sent as ${block.source.media_type}, ${formatFileSize(Buffer.byteLength(block.source.data, "base64"))}${displaySize}; file on disk: ${focusContent.mediaType}, ${formatFileSize(focusContent.bytes.length)}${webpSize}]`;
    noteSuffix = " (image)";
  } else {
    let focusText =
      focusContent.text === "" && grader.focus === "files"
        ? "(no file changes)"
        : focusContent.text === "" && grader.focus === "mock_calls"
          ? "(no mocked tool calls)"
          : focusContent.text;
    evidence = truncateMiddle(
      focusText,
      MAX_JUDGE_INPUT_CHARS - JUDGE_TRACE_CHARS,
      JUDGE_TRACE_CHARS,
      (elidedCount) => `
[\u2026${elidedCount} chars elided\u2026]
`,
    );
    judgePrompt = `${promptHeader}


Agent output (${describeTarget(grader.focus)}):
${evidence}


${answerInstruction}`;
    noteSuffix =
      typeof grader.focus === "object" && focusText.length > MAX_FOCUS_SPECS
        ? ` \u2014 note: long file (${focusText.length} chars); llm judges are noisy on long inputs, prefer a regex grader for large artifacts`
        : "";
  }
  let votes;
  try {
    votes = await runEvalJudgeTrials(judgePrompt, input);
  } catch (error) {
    if (focusContent.kind === "image" && error instanceof AttachedMediaRejectedError)
      return failedGrader(
        grader,
        `focus file ${focusContent.path} was rejected by the API as an image (${error.reason}) \u2014 the artifact may be truncated or corrupt, or the judge route does not accept images`,
      );
    throw error;
  }
  let passed = count(votes, Boolean) > votes.length / 2;
  return {
    name: grader.name,
    passed,
    weight: grader.weight,
    explanation: `judge votes: ${votes.map((vote) => (vote ? "PASS" : "FAIL")).join(" ")}${noteSuffix}`,
    judge_votes: votes,
    evidence,
  };
}
//@ chunk-qchp9vrd.js:237977-238811 placement
async function compareWithBaseline(grader, runContext) {
  let { case_, run } = runContext;
  let baselineTrace;
  try {
    let caseFileInsideSuite = await resolveCaseFileInsideSuite(case_, grader.baseline_file, "baseline_file");
    let textFile = await readTextFile(caseFileInsideSuite, MAX_FOCUS_FILE_BYTES, "baseline file");
    if (textFile === null)
      return failedGrader(grader, `baseline file ${grader.baseline_file} does not exist`);
    baselineTrace = textFile
      .split(
        `
`,
      )
      .filter((line) => line.trim())
      .map((line) => jsonParse(line));
  } catch (error) {
    return failedGrader(
      grader,
      `failed to read baseline: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let joined = [
    "You are comparing a NEW coding-agent trajectory against a BASELINE.",
    `Criterion:
${grader.criteria}`,
    `
BASELINE trajectory:
${elideMessages(baselineTrace)}`,
    `
NEW trajectory:
${elideMessages(run.trace)}`,
    `
Does the NEW trajectory satisfy the criterion at least as well as the BASELINE?`,
    "Respond with exactly one word: PASS or FAIL.",
  ].join(`

`);
  let votes = await runEvalJudgeTrials(joined, runContext);
  let passed = count(votes, Boolean) > votes.length / 2;
  return {
    name: grader.name,
    passed,
    weight: grader.weight,
    explanation: `judge votes: ${votes.map((vote) => (vote ? "PASS" : "FAIL")).join(" ")}`,
    judge_votes: votes,
  };
}
//@ chunk-qchp9vrd.js:238811-238944 placement
async function runEvalJudgeTrials(description, signal) {
  let votes = [];
  for (let j = 0; j < MAX_JUDGE_ATTEMPTS; j++) {
    let answer = await runEvalJudge(description, signal);
    votes.push(/\bPASS\b/i.test(answer) && !/\bFAIL\b/i.test(answer));
  }
  return votes;
}
//@ chunk-qchp9vrd.js:238944-239610 placement = generateTitleAndBranch (0.267)
async function runEvalJudge(description, signal) {
  let systemPrompt = asSystemPrompt(["You are a strict, terse evaluation judge for coding-agent traces."]);
  let reason;
  let queryOptions = {
    querySource: "plugin_eval_judge",
    agents: [],
    isNonInteractiveSession: true,
    hasAppendSystemPrompt: false,
    mcpTools: [],
    agentContext: mainAgentContext(),
    onMediaStripped: (stripped, strippedReason) => {
      reason = strippedReason;
    },
    credentials: signal.credentials,
  };
  let judgeModel = normalizeJudgeModel(signal.judgeModel);
  let response = judgeModel
    ? await queryHaiku({
        systemPrompt,
        userPrompt: description,
        signal: signal.signal,
        options: {
          ...queryOptions,
          model: judgeModel,
        },
      })
    : await queryHaikuWithFallback({
        systemPrompt,
        userPrompt: description,
        signal: signal.signal,
        options: queryOptions,
      });
  let parsed = extractTextContent_2(response.message.content);
  if (isSyntheticModelApiErrorMessage(response))
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
function elideMessages(messages) {
  if (messages.length <= 24)
    return messages.map((message) => jsonStringify(message)).join(`
`);
  let mapped = messages.slice(0, 12).map((message) => jsonStringify(message));
  let mapped_2 = messages.slice(-12).map((message) => jsonStringify(message));
  return [...mapped, `[\u2026${messages.length - 12 - 12} messages elided\u2026]`, ...mapped_2].join(`
`);
}
//@ chunk-qchp9vrd.js:240021-241664 placement
async function openFocusFileSafely(rootDir, focusPath, path) {
  let escapeError = () =>
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `focus file ${path} leaves the run directory through a link`,
      "grader focus file escapes the run directory via link",
    );
  let rootStats = await lstat(rootDir, {
    bigint: true,
  }).catch(() => null);
  if (rootStats === null || !rootStats.isDirectory() || rootStats.isSymbolicLink()) throw escapeError();
  let rootReal = await realpath(rootDir).catch(() => null);
  if (rootReal === null || rootReal !== rootDir) throw escapeError();
  let rootRealStats = await lstat(rootReal, {
    bigint: true,
  }).catch(() => null);
  if (rootRealStats === null || rootRealStats.ino !== rootStats.ino || rootRealStats.dev !== rootStats.dev)
    throw escapeError();
  let handle;
  try {
    handle = await open(focusPath, constants.O_RDONLY | FILE_OPEN_EXTRA_FLAGS);
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
    let stats = await handle.stat({
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
    if (stats.ino === 0n) throw escapeError();
    let fdReal = await fdRealPath(handle.fd);
    let fileReal = fdReal ?? (await realpath(focusPath).catch(() => null));
    if (fileReal === null || !toEvalPathError(rootReal, fileReal)) throw escapeError();
    if (fdReal === null) {
      let fileRealStats = await lstat(fileReal, {
        bigint: true,
      }).catch(() => null);
      if (
        fileRealStats === null ||
        fileRealStats.ino !== stats.ino ||
        fileRealStats.dev !== stats.dev ||
        fileRealStats.nlink !== 1n
      )
        throw escapeError();
    }
    if (stats.size > BigInt(MAX_FOCUS_FILE_BYTES))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `focus file ${path} exceeds ${formatFileSize(MAX_FOCUS_FILE_BYTES)}`,
        "grader focus file too large",
      );
    let size = Number(stats.size);
    let exactBytes = await readExactBytes(handle, size);
    if (exactBytes === null)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `focus file ${path} changed while being read (vetted at ${size} bytes); try again`,
        "grader focus file changed during read",
      );
    return exactBytes;
  } finally {
    await handle.close().catch(() => {});
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
function findMockBaseDir(caseDir, pluginDir, suiteSegments) {
  if (suiteSegments.length > 0) {
    let found = null;
    let resolved = path_2.resolve(caseDir);
    while (isSameOrInside(resolved, pluginDir) && resolved !== pluginDir) {
      if (pathEndsWith(pathSegments(resolved), suiteSegments)) found = resolved;
      let dir = path_2.dirname(resolved);
      if (dir === resolved) break;
      resolved = dir;
    }
    if (found !== null) return found;
  }
  return pluginDir;
}
//@ chunk-qchp9vrd.js:242163-242327 placement
/**
 * 列出路径在根目录内的祖先目录链。
 */
function listAncestorChain(caseDir, mockBaseDir) {
  let dir = path_2.dirname(caseDir);
  if (!isSameOrInside(dir, mockBaseDir)) return [caseDir];
  let ancestors = [];
  let current = dir;
  for (;;) {
    ancestors.push(current);
    let dir = path_2.dirname(current);
    if (dir === current || !isSameOrInside(dir, mockBaseDir)) break;
    current = dir;
  }
  return [...ancestors.reverse(), caseDir];
}
export { listAncestorChain, findMockBaseDir, checkGradersSatisfiable, normalizeJudgeModel, gradeCase };
