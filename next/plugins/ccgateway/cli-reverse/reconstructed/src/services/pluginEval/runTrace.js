/**
 * services/pluginEval/runTrace.ts
 *
 * 2.1.316 新增：plugin eval 解析子会话 trace（stream-json）、统计用量与收集 Artifact 发布桩
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (18)
 * attribution: placement 18
 */
import { lstat, readdir, rm as rm_2, mkdir } from "fs/promises";
import path from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  create,
  create_25,
  create_2,
  create_6,
  create_12,
  create_15,
  create_16,
  create_3,
} from "../../../vendor/zod/lib/index.mjs";
import { mcpToolNames, PUBLISH_TOOL_NAMES } from "../artifacts/artifactsMcpServer.js";
import {
  ARTIFACT_TOOL_NAME,
  parseArtifactUrl,
  parseStubArtifactUrl,
  ARTIFACT_SLUG_RE,
  ARTIFACT_STUB_URL_PREFIX,
} from "../../tools/ArtifactTool/constants.js";
import { safeParseJSON } from "../../utils/json.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  getErrnoCode,
  isENOENT,
} from "../../utils/errors.js";
import {
  logForDebugging,
  MAX_DEBUG_LATEST_LINK_ATTEMPTS,
  MAX_DEBUG_LOG_ROTATE_BYTES,
  LATEST_DEBUG_LOG_LINK,
  MAX_DEBUG_LOG_TOTAL_BYTES,
} from "../../utils/debug.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { openNoFollow_2 } from "../../utils/fsSafety/hardenedRead.js";
import { readExactBytes } from "../artifacts/artifactUrl.js";
import { detectPlatformFlavor } from "./caseDiscovery.js";
import { replaceFileExclusive } from "../artifacts/stubPublishDir.js";
import { calculateUSDCost } from "../../utils/modelCost.js";
import { toolResultText } from "./mocks/mockVerification.js";
import { SANDBOX_UNAVAILABLE_MESSAGE } from "../../utils/sandbox/sandboxErrors.js";
import { truncateWithCount } from "../../utils/stringUtils.js";
import { getGitSafetyConfigPairs } from "../../utils/gitSafeExec.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { SUPPORTED_PLATFORMS } from "../../utils/platform.js";
import { normalizeCaseForComparison } from "../../utils/permissions/filesystem.js";

//@ chunk-qchp9vrd.js:193455-193781 placement = hasSuccessfulToolCall (0.813)
/**
 * 助手消息的 schema。
 */
var ToolUseBlockSchema = DoctorLazy(() =>
  create({
    type: create_25("tool_use"),
    id: create_2(),
    name: create_2(),
    input: create({
      action: create_2().optional(),
    })
      .passthrough()
      .optional(),
  }),
);
var HARNESS_TOOL_NAMES = DoctorLazy(() => new Set(mcpToolNames(PUBLISH_TOOL_NAMES)));
var ToolResultBlockSchema = DoctorLazy(() =>
  create({
    type: create_25("tool_result"),
    tool_use_id: create_2(),
    is_error: create_6().optional(),
    content: create_12().optional(),
  }),
);
var AssistantMessageSchema = DoctorLazy(() =>
  create({
    message: create({
      content: create_15(create_12()),
    }).passthrough(),
  }).passthrough(),
);
//@ chunk-qchp9vrd.js:193781-194060 placement
function findPublishToolUses(trace) {
  let toolUseIds = new Map();
  for (let message of trace) {
    if (message.type !== "assistant") continue;
    for (let block of assistantContent(message)) {
      let toolUse = ToolUseBlockSchema().safeParse(block);
      if (!toolUse.success) continue;
      let action = toolUse.data.input?.action;
      if (
        toolUse.data.name === ARTIFACT_TOOL_NAME
          ? action === undefined || action === "publish"
          : HARNESS_TOOL_NAMES().has(toolUse.data.name)
      )
        toolUseIds.set(toolUse.data.id, toolUse.data.name);
    }
  }
  return toolUseIds;
}
//@ chunk-qchp9vrd.js:194060-194324 placement
function* iteratePublishResults(trace) {
  let publishToolUses = findPublishToolUses(trace);
  if (publishToolUses.size === 0) return;
  for (let message of trace) {
    if (message.type !== "user") continue;
    for (let block of assistantContent(message)) {
      let result = ToolResultBlockSchema().safeParse(block);
      let toolName = result.success ? publishToolUses.get(result.data.tool_use_id) : undefined;
      if (!result.success || result.data.is_error === true || toolName === undefined) continue;
      yield {
        message,
        tool: toolName,
      };
    }
  }
}
//@ chunk-qchp9vrd.js:194324-194551 placement
function collectPublishedArtifacts(trace) {
  let seenSlugs = new Set();
  let artifacts = [];
  for (let { message, tool } of iteratePublishResults(trace)) {
    if (tool !== ARTIFACT_TOOL_NAME) continue;
    let toolResultUrl = getToolResultUrl(message);
    let parsedUrl = toolResultUrl === undefined ? null : parseArtifactUrl(toolResultUrl);
    if (toolResultUrl === undefined || !parsedUrl || seenSlugs.has(parsedUrl.slug)) continue;
    seenSlugs.add(parsedUrl.slug);
    artifacts.push({
      url: toolResultUrl,
      slug: parsedUrl.slug,
      env: parsedUrl.env,
    });
  }
  return artifacts;
}
//@ chunk-qchp9vrd.js:194551-194673 placement
/**
 * 从运行轨迹的消息中收集桩工件 URL 的 slug。
 */
function collectStubArtifactSlugs(trace) {
  let slugs = new Set();
  for (let { message } of iteratePublishResults(trace)) {
    let toolResultUrl = getToolResultUrl(message);
    let parsedUrl = toolResultUrl === undefined ? null : parseStubArtifactUrl(toolResultUrl);
    if (parsedUrl) slugs.add(parsedUrl.slug);
  }
  return slugs;
}
//@ chunk-qchp9vrd.js:194673-194914 placement
function getToolResultUrl(message) {
  let parsed = toolUseResultSchema().safeParse(message);
  if (!parsed.success) return;
  let toolUseResult = parsed.data.tool_use_result;
  if (typeof toolUseResult !== "string" && !Array.isArray(toolUseResult)) return toolUseResult.url;
  let urlResult = urlResultSchema().safeParse(
    safeParseJSON(typeof toolUseResult === "string" ? toolUseResult : toolUseResult[0]?.text, false),
  );
  return urlResult.success ? urlResult.data.url : undefined;
}
//@ chunk-qchp9vrd.js:194914-195143 placement
var urlResultSchema = DoctorLazy(() =>
  create({
    url: create_2(),
  }).passthrough(),
);
var toolUseResultSchema = DoctorLazy(() =>
  create({
    tool_use_result: create_16([
      urlResultSchema(),
      create_2(),
      create_15(
        create({
          text: create_2().optional(),
        }).passthrough(),
      ),
    ]),
  }).passthrough(),
);
var artifactStubSchema = DoctorLazy(() =>
  create({
    slug: create_2(),
    url: create_2(),
    publishedAtMs: create_3().optional(),
  }).passthrough(),
);
//@ chunk-qchp9vrd.js:195143-196768 placement
async function readStubPublishDir(dirPath, expectedSlugs) {
  let entries;
  try {
    let dirStats = await lstat(dirPath);
    if (!dirStats.isDirectory() || dirStats.isSymbolicLink())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "the stub publish directory is not a real directory",
        "eval: stub publish dir not a directory",
      );
    entries = await readdir(dirPath);
  } catch (error) {
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    logForDebugging(`eval: cannot read stub publish dir ${dirPath}: ${errorMessage(error)}`, {
      level: "warn",
    });
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `the stub publish directory could not be read (${getErrnoCode(error) ?? "unknown error"})`,
      "eval: stub publish dir unreadable",
    );
  }
  entries = entries.filter((slug) => ARTIFACT_SLUG_RE.test(slug) && expectedSlugs.has(slug));
  if (entries.length < expectedSlugs.size)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `a corroborated artifact publish is missing from the staging directory (${expectedSlugs.size - entries.length} of ${expectedSlugs.size})`,
      "eval: stub publish payload missing",
    );
  if (entries.length > MAX_DEBUG_LATEST_LINK_ATTEMPTS)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `the run made more artifact publishes (${entries.length}) than the harness indexes (${MAX_DEBUG_LATEST_LINK_ATTEMPTS})`,
      "eval: too many stub publishes",
    );
  let records = [];
  for (let slug of entries) {
    let joined = path.join(dirPath, slug);
    let filePath = path.join(joined, "manifest.json");
    let manifestError = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `a corroborated artifact publish's payload is not a real directory holding a regular manifest (or is over ${MAX_DEBUG_LOG_ROTATE_BYTES} bytes)`,
      "eval: stub publish manifest unreadable",
    );
    if (
      !(await Promise.all([lstat(joined), lstat(filePath)])
        .then(([payloadStats, manifestStats]) => payloadStats.isDirectory() && manifestStats.isFile())
        .catch(() => false))
    )
      throw manifestError;
    let singleLinkFile = await readSingleLinkFile(filePath, MAX_DEBUG_LOG_ROTATE_BYTES);
    if (singleLinkFile === null) throw manifestError;
    let str = singleLinkFile.toString("utf8");
    let invalidManifestError = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "a corroborated artifact publish's manifest is corrupt, or does not name its own slug and stub URL",
      "eval: stub publish manifest invalid",
    );
    let manifestJson;
    try {
      manifestJson = jsonParse(str);
    } catch {
      throw invalidManifestError;
    }
    let manifest = artifactStubSchema().safeParse(manifestJson);
    if (
      !manifest.success ||
      manifest.data.slug !== slug ||
      manifest.data.url !== `${ARTIFACT_STUB_URL_PREFIX}${slug}`
    )
      throw invalidManifestError;
    records.push({
      record: {
        url: manifest.data.url,
        slug: manifest.data.slug,
        env: "stub",
        payloadDir: joined,
      },
      at: manifest.data.publishedAtMs ?? 0,
    });
  }
  return records.sort((left, right) => left.at - right.at).map((item) => item.record);
}
//@ chunk-qchp9vrd.js:196814-197062 placement
async function readSingleLinkFile(filePath, maxBytes) {
  let noFollow = await openNoFollow_2(filePath);
  if (!noFollow.ok) return null;
  let handle = noFollow.value;
  try {
    let stats = await handle.stat({
      bigint: true,
    });
    if (!stats.isFile() || stats.nlink !== 1n || stats.size > BigInt(maxBytes)) return null;
    return await readExactBytes(handle, Number(stats.size));
  } catch {
    return null;
  } finally {
    await handle.close();
  }
}
//@ chunk-qchp9vrd.js:197062-197564 placement
async function readStubPublishesJson(outDir, stubPublishDir) {
  let outStats = await lstat(outDir).catch((error) => {
    if (isENOENT(error)) return null;
    throw error;
  });
  if (outStats === null || !outStats.isDirectory()) return;
  let joined = path.join(outDir, "publishes.json");
  let joined_2 = path.join(outDir, LATEST_DEBUG_LOG_LINK);
  await detectPlatformFlavor(joined_2, {
    harnessOwned: true,
  });
  await rm_2(joined_2, {
    recursive: true,
    force: true,
  });
  if (stubPublishDir.length === 0) {
    await rm_2(joined, {
      recursive: true,
      force: true,
    });
    return;
  }
  await replaceFileExclusive(joined, jsonStringify(stubPublishDir, null, 2));
  let last = stubPublishDir.at(-1);
  if (last && last.env === "stub") {
    await mkdir(joined_2);
    for (let fileName of ["index.html", "manifest.json"]) {
      let singleLinkFile = await readSingleLinkFile(
        path.join(last.payloadDir, fileName),
        MAX_DEBUG_LOG_TOTAL_BYTES,
      );
      if (singleLinkFile === null) continue;
      await replaceFileExclusive(path.join(joined_2, fileName), singleLinkFile);
    }
  }
}
//@ chunk-qchp9vrd.js:197564-197646 placement
/**
 * 取助手消息内容数组。
 */
function assistantContent(message) {
  let parsed = AssistantMessageSchema().safeParse(message);
  return parsed.success ? parsed.data.message.content : [];
}
//@ chunk-qchp9vrd.js:197646-199801 placement
/**
 * 从 trace 汇总助手消息、工具调用、成本与用量。
 */
function summarizeRunTrace(trace, timedOut, exitInfo, tracePath, { shellGranted, restoredCostUsd }) {
  let toolCalls = [];
  let callsById = new Map();
  let lastAssistantText = "";
  let numTurns = 0;
  let costUsd = 0;
  let computedCostUsd = 0;
  let requestCount = 0;
  let seenMessageIds = new Set();
  let resultText = null;
  let sawResult = false;
  let authRejected = false;
  let endedOnApiError = false;
  for (let event of trace) {
    if (event.type === "assistant") {
      let message = event.message;
      let id = typeof message?.id === "string" ? message.id : null;
      if (id === null || !seenMessageIds.has(id)) {
        if (id !== null) seenMessageIds.add(id);
        requestCount++;
        if (typeof message?.model === "string" && message.usage !== null && typeof message.usage === "object")
          try {
            computedCostUsd += calculateUSDCost(message.model, message.usage);
          } catch {}
      }
      let content = message?.content;
      if (Array.isArray(content)) {
        let textParts = [];
        for (let block of content)
          if (block?.type === "tool_use") {
            let input = block.input;
            let toolCall = {
              name: String(block.name ?? ""),
              input,
              inputText: safeStringify(input),
            };
            toolCalls.push(toolCall);
            let id = block.id;
            if (typeof id === "string") callsById.set(id, toolCall);
          } else if (block?.type === "text") textParts.push(String(block.text ?? ""));
        if (textParts.length > 0)
          lastAssistantText = textParts.join(`
`);
      }
    } else if (event.type === "user")
      for (let block of assistantContent(event)) {
        let result = ToolResultBlockSchema().safeParse(block);
        if (!result.success) continue;
        let toolCall = callsById.get(result.data.tool_use_id);
        if (toolCall) {
          toolCall.output = toolResultText(result.data.content);
          toolCall.isError = result.data.is_error === true;
        }
      }
    else if (event.type === "result") {
      let resultEvent = event;
      numTurns = resultEvent.num_turns ?? numTurns;
      costUsd =
        resultEvent.total_cost_usd === undefined
          ? costUsd
          : Math.max(0, resultEvent.total_cost_usd - restoredCostUsd);
      sawResult = true;
      endedOnApiError = resultEvent.is_error === true && typeof resultEvent.api_error_status === "number";
      if (Array.isArray(resultEvent.permission_denials))
        for (let permissionDenial of resultEvent.permission_denials) {
          let toolUseId = permissionDenial?.tool_use_id;
          let toolCall = typeof toolUseId === "string" ? callsById.get(toolUseId) : undefined;
          if (toolCall !== undefined) toolCall.deniedByChild = true;
        }
      if (resultEvent.is_error === true) {
        if (typeof resultEvent.result === "string") resultText = resultEvent.result;
        else if (Array.isArray(resultEvent.errors) && resultEvent.errors.length > 0) {
          let mapped = resultEvent.errors.map(String);
          resultText =
            shellGranted && mapped.some((message) => message.startsWith(SANDBOX_UNAVAILABLE_MESSAGE))
              ? `${SANDBOX_UNAVAILABLE_TEXT} ${mapped.map((message) => message.replace(/\s*Set sandbox\.failIfUnavailable=false[^.]*\.?/, "")).join(" ")}`
              : mapped.join(" ");
        }
      }
    }
    if (
      event.type === "assistant" &&
      event.parent_tool_use_id == null &&
      (event.error === "authentication_failed" || event.error === "oauth_org_not_allowed")
    )
      authRejected = true;
  }
  let errorMessage;
  switch (exitInfo.kind) {
    case "ok":
      errorMessage = null;
      break;
    case "error":
      errorMessage = exitInfo.message;
      break;
    case "exit": {
      let stderrTail = exitInfo.stderrTail;
      errorMessage =
        resultText !== null
          ? `exit ${exitInfo.code}: ${truncateWithCount(resultText, 2000)}${stderrTail ? ` \xB7 stderr: ${stderrTail}` : ""}`
          : `exit ${exitInfo.code}: ${stderrTail || NO_STDERR_TEXT}`;
      break;
    }
  }
  if (!sawResult) {
    costUsd = computedCostUsd;
    if (numTurns === 0) numTurns = requestCount;
  }
  return {
    trace,
    toolCalls,
    artifactPublishes: collectPublishedArtifacts(trace),
    lastAssistantText,
    numTurns,
    costUsd,
    timedOut,
    killedInFlight: timedOut,
    error: errorMessage,
    authRejected: sawResult ? authRejected && errorMessage !== null : null,
    endedOnApiError,
    tracePath,
    mockCalls: [],
    mockTally: null,
    mockRecordings: [],
    aborted: null,
    mockSetupFailure: null,
  };
}
//@ chunk-qchp9vrd.js:199801-200089 placement
/**
 * 无法沙箱化 shell 时拒绝运行的说明。
 */
var NO_STDERR_TEXT = "(no stderr)";
var SANDBOX_UNAVAILABLE_TEXT =
  "A shell tool (Bash or PowerShell) was granted but this machine cannot confine it (no sandbox backend on this platform, or it is not installed), so the run was refused rather than run unconfined \u2014 drop the shell grant, or on Linux/macOS install the backend.";
//@ chunk-qchp9vrd.js:200089-200140 placement
/**
 * 安全地把值转成 JSON 文本。
 */
function safeStringify(value) {
  try {
    return jsonStringify(value) ?? "";
  } catch {
    return "";
  }
}
//@ chunk-qchp9vrd.js:200140-200240 placement
/**
 * 评测运行用的 git 配置对：安全配置加上 pager=cat、editor=true、清空 credential.helper。
 */
function getEvalGitConfigPairs() {
  return [
    ...getGitSafetyConfigPairs(),
    ["core.pager", "cat"],
    ["core.editor", "true"],
    ["credential.helper", ""],
  ];
}
//@ chunk-qchp9vrd.js:200240-200291 placement
/**
 * 按环境缓存的 git 版本结果。
 */
var MIN_GIT_VERSION = [2, 31];
var GIT_VERSION_TIMEOUT_MS = 1e4;
var gitVersionCache = identity_2(new Map(), (map) => map.clear());
//@ chunk-qchp9vrd.js:200291-201628 placement
/**
 * 检查本机 git 版本是否足够新（超时无回应则无法判断）。
 */
async function checkGitVersionForEval(env) {
  let PATH = env.PATH ?? "";
  let cachedVersion = gitVersionCache.get(PATH);
  if (cachedVersion === undefined) {
    let result = await execFileNoThrow("git", ["--version"], {
      env,
      timeout: GIT_VERSION_TIMEOUT_MS,
    });
    let match = /git version (\d+)\.(\d+)/.exec(result.stdout);
    if (result.timedOut)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `git on this host did not report its version within ${GIT_VERSION_TIMEOUT_MS / 1000} seconds, so claude plugin eval cannot tell whether it is new enough (git ${MIN_GIT_VERSION[0]}.${MIN_GIT_VERSION[1]} or newer) to switch off the repository's git hooks and helper programs for the run. Try again, or install git ${MIN_GIT_VERSION[0]}.${MIN_GIT_VERSION[1]} or newer.`,
        "eval: git version probe timed out",
      );
    if (match === null) {
      if (result.code !== 0) cachedVersion = "absent";
      else
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `git on this host did not print a version claude plugin eval can read, so it cannot tell whether git is new enough (git ${MIN_GIT_VERSION[0]}.${MIN_GIT_VERSION[1]} or newer) to switch off the repository's git hooks and helper programs for the run. Run git --version to see what it prints, and install git ${MIN_GIT_VERSION[0]}.${MIN_GIT_VERSION[1]} or newer.`,
          "eval: git version probe unreadable",
        );
    } else cachedVersion = [Number(match[1]), Number(match[2])];
    gitVersionCache.set(PATH, cachedVersion);
  }
  if (cachedVersion === "absent") return;
  let [major, minor] = cachedVersion;
  let [minMajor, minMinor] = MIN_GIT_VERSION;
  if (major > minMajor || (major === minMajor && minor >= minMinor)) return;
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `git ${major}.${minor} is too old for claude plugin eval: it ignores the environment configuration (GIT_CONFIG_COUNT, added in git ${minMajor}.${minMinor}) that switches off the repository's git hooks and helper programs for the run. Install git ${minMajor}.${minMinor} or newer.`,
    "eval: git too old for env-scoped config",
  );
}
//@ chunk-qchp9vrd.js:201628-201680 placement = setCwdState (1)
function nfcKeyIfEnabled(cwd) {
  return SUPPORTED_PLATFORMS() ? normalizeCaseForComparison(cwd.normalize("NFC")) : cwd;
}
export {
  readStubPublishDir,
  readStubPublishesJson,
  checkGitVersionForEval,
  summarizeRunTrace,
  collectStubArtifactSlugs,
  SANDBOX_UNAVAILABLE_TEXT,
  nfcKeyIfEnabled,
  assistantContent,
  ToolResultBlockSchema,
  getEvalGitConfigPairs,
};
