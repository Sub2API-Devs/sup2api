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
function findPublishToolUses(e) {
  let n = new Map();
  for (let r of e) {
    if (r.type !== "assistant") continue;
    for (let a of assistantContent(r)) {
      let s = ToolUseBlockSchema().safeParse(a);
      if (!s.success) continue;
      let action = s.data.input?.action;
      if (
        s.data.name === ARTIFACT_TOOL_NAME
          ? action === undefined || action === "publish"
          : HARNESS_TOOL_NAMES().has(s.data.name)
      )
        n.set(s.data.id, s.data.name);
    }
  }
  return n;
}
//@ chunk-qchp9vrd.js:194060-194324 placement
function* iteratePublishResults(e) {
  let publishToolUses = findPublishToolUses(e);
  if (publishToolUses.size === 0) return;
  for (let r of e) {
    if (r.type !== "user") continue;
    for (let a of assistantContent(r)) {
      let s = ToolResultBlockSchema().safeParse(a);
      let h = s.success ? publishToolUses.get(s.data.tool_use_id) : undefined;
      if (!s.success || s.data.is_error === true || h === undefined) continue;
      yield {
        message: r,
        tool: h,
      };
    }
  }
}
//@ chunk-qchp9vrd.js:194324-194551 placement
function collectPublishedArtifacts(e) {
  let n = new Set();
  let r = [];
  for (let { message, tool } of iteratePublishResults(e)) {
    if (tool !== ARTIFACT_TOOL_NAME) continue;
    let toolResultUrl = getToolResultUrl(message);
    let w = toolResultUrl === undefined ? null : parseArtifactUrl(toolResultUrl);
    if (toolResultUrl === undefined || !w || n.has(w.slug)) continue;
    n.add(w.slug);
    r.push({
      url: toolResultUrl,
      slug: w.slug,
      env: w.env,
    });
  }
  return r;
}
//@ chunk-qchp9vrd.js:194551-194673 placement
/**
 * 从运行轨迹的消息中收集桩工件 URL 的 slug。
 */
function collectStubArtifactSlugs(e) {
  let n = new Set();
  for (let { message } of iteratePublishResults(e)) {
    let toolResultUrl = getToolResultUrl(message);
    let s = toolResultUrl === undefined ? null : parseStubArtifactUrl(toolResultUrl);
    if (s) n.add(s.slug);
  }
  return n;
}
//@ chunk-qchp9vrd.js:194673-194914 placement
function getToolResultUrl(message) {
  let n = toolUseResultSchema().safeParse(message);
  if (!n.success) return;
  let toolUseResult = n.data.tool_use_result;
  if (typeof toolUseResult !== "string" && !Array.isArray(toolUseResult)) return toolUseResult.url;
  let a = urlResultSchema().safeParse(
    safeParseJSON(typeof toolUseResult === "string" ? toolUseResult : toolUseResult[0]?.text, false),
  );
  return a.success ? a.data.url : undefined;
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
async function readStubPublishDir(e, n) {
  let r;
  try {
    let s = await lstat(e);
    if (!s.isDirectory() || s.isSymbolicLink())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "the stub publish directory is not a real directory",
        "eval: stub publish dir not a directory",
      );
    r = await readdir(e);
  } catch (error) {
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    logForDebugging(`eval: cannot read stub publish dir ${e}: ${errorMessage(error)}`, {
      level: "warn",
    });
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `the stub publish directory could not be read (${getErrnoCode(error) ?? "unknown error"})`,
      "eval: stub publish dir unreadable",
    );
  }
  r = r.filter((s) => ARTIFACT_SLUG_RE.test(s) && n.has(s));
  if (r.length < n.size)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `a corroborated artifact publish is missing from the staging directory (${n.size - r.length} of ${n.size})`,
      "eval: stub publish payload missing",
    );
  if (r.length > MAX_DEBUG_LATEST_LINK_ATTEMPTS)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `the run made more artifact publishes (${r.length}) than the harness indexes (${MAX_DEBUG_LATEST_LINK_ATTEMPTS})`,
      "eval: too many stub publishes",
    );
  let a = [];
  for (let s of r) {
    let joined = path.join(e, s);
    let joined_2 = path.join(joined, "manifest.json");
    let b = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `a corroborated artifact publish's payload is not a real directory holding a regular manifest (or is over ${MAX_DEBUG_LOG_ROTATE_BYTES} bytes)`,
      "eval: stub publish manifest unreadable",
    );
    if (
      !(await Promise.all([lstat(joined), lstat(joined_2)])
        .then(([j, K]) => j.isDirectory() && K.isFile())
        .catch(() => false))
    )
      throw b;
    let singleLinkFile = await readSingleLinkFile(joined_2, MAX_DEBUG_LOG_ROTATE_BYTES);
    if (singleLinkFile === null) throw b;
    let str = singleLinkFile.toString("utf8");
    let T = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "a corroborated artifact publish's manifest is corrupt, or does not name its own slug and stub URL",
      "eval: stub publish manifest invalid",
    );
    let N;
    try {
      N = jsonParse(str);
    } catch {
      throw T;
    }
    let x = artifactStubSchema().safeParse(N);
    if (!x.success || x.data.slug !== s || x.data.url !== `${ARTIFACT_STUB_URL_PREFIX}${s}`) throw T;
    a.push({
      record: {
        url: x.data.url,
        slug: x.data.slug,
        env: "stub",
        payloadDir: joined,
      },
      at: x.data.publishedAtMs ?? 0,
    });
  }
  return a.sort((s, h) => s.at - h.at).map((s) => s.record);
}
//@ chunk-qchp9vrd.js:196814-197062 placement
async function readSingleLinkFile(e, n) {
  let noFollow = await openNoFollow_2(e);
  if (!noFollow.ok) return null;
  let a = noFollow.value;
  try {
    let stats = await a.stat({
      bigint: true,
    });
    if (!stats.isFile() || stats.nlink !== 1n || stats.size > BigInt(n)) return null;
    return await readExactBytes(a, Number(stats.size));
  } catch {
    return null;
  } finally {
    await a.close();
  }
}
//@ chunk-qchp9vrd.js:197062-197564 placement
async function readStubPublishesJson(e, stubPublishDir) {
  let r = await lstat(e).catch((error) => {
    if (isENOENT(error)) return null;
    throw error;
  });
  if (r === null || !r.isDirectory()) return;
  let joined = path.join(e, "publishes.json");
  let joined_2 = path.join(e, LATEST_DEBUG_LOG_LINK);
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
    for (let w of ["index.html", "manifest.json"]) {
      let singleLinkFile = await readSingleLinkFile(path.join(last.payloadDir, w), MAX_DEBUG_LOG_TOTAL_BYTES);
      if (singleLinkFile === null) continue;
      await replaceFileExclusive(path.join(joined_2, w), singleLinkFile);
    }
  }
}
//@ chunk-qchp9vrd.js:197564-197646 placement
/**
 * 取助手消息内容数组。
 */
function assistantContent(e) {
  let n = AssistantMessageSchema().safeParse(e);
  return n.success ? n.data.message.content : [];
}
//@ chunk-qchp9vrd.js:197646-199801 placement
/**
 * 从 trace 汇总助手消息、工具调用、成本与用量。
 */
function summarizeRunTrace(e, n, r, tracePath, { shellGranted, restoredCostUsd }) {
  let w = [];
  let b = new Map();
  let lastAssistantText = "";
  let R = 0;
  let S = 0;
  let T = 0;
  let N = 0;
  let x = new Set();
  let j = null;
  let K = false;
  let X = false;
  let endedOnApiError = false;
  for (let J of e) {
    if (J.type === "assistant") {
      let message = J.message;
      let id = typeof message?.id === "string" ? message.id : null;
      if (id === null || !x.has(id)) {
        if (id !== null) x.add(id);
        N++;
        if (typeof message?.model === "string" && message.usage !== null && typeof message.usage === "object")
          try {
            T += calculateUSDCost(message.model, message.usage);
          } catch {}
      }
      let content = message?.content;
      if (Array.isArray(content)) {
        let Se = [];
        for (let we of content)
          if (we?.type === "tool_use") {
            let input = we.input;
            let Je = {
              name: String(we.name ?? ""),
              input,
              inputText: safeStringify(input),
            };
            w.push(Je);
            let id = we.id;
            if (typeof id === "string") b.set(id, Je);
          } else if (we?.type === "text") Se.push(String(we.text ?? ""));
        if (Se.length > 0)
          lastAssistantText = Se.join(`
`);
      }
    } else if (J.type === "user")
      for (let Z of assistantContent(J)) {
        let se = ToolResultBlockSchema().safeParse(Z);
        if (!se.success) continue;
        let Q = b.get(se.data.tool_use_id);
        if (Q) {
          Q.output = toolResultText(se.data.content);
          Q.isError = se.data.is_error === true;
        }
      }
    else if (J.type === "result") {
      let Z = J;
      R = Z.num_turns ?? R;
      S = Z.total_cost_usd === undefined ? S : Math.max(0, Z.total_cost_usd - restoredCostUsd);
      K = true;
      endedOnApiError = Z.is_error === true && typeof Z.api_error_status === "number";
      if (Array.isArray(Z.permission_denials))
        for (let permissionDenial of Z.permission_denials) {
          let toolUseId = permissionDenial?.tool_use_id;
          let Se = typeof toolUseId === "string" ? b.get(toolUseId) : undefined;
          if (Se !== undefined) Se.deniedByChild = true;
        }
      if (Z.is_error === true) {
        if (typeof Z.result === "string") j = Z.result;
        else if (Array.isArray(Z.errors) && Z.errors.length > 0) {
          let mapped = Z.errors.map(String);
          j =
            shellGranted && mapped.some((Q) => Q.startsWith(SANDBOX_UNAVAILABLE_MESSAGE))
              ? `${SANDBOX_UNAVAILABLE_TEXT} ${mapped.map((Q) => Q.replace(/\s*Set sandbox\.failIfUnavailable=false[^.]*\.?/, "")).join(" ")}`
              : mapped.join(" ");
        }
      }
    }
    if (
      J.type === "assistant" &&
      J.parent_tool_use_id == null &&
      (J.error === "authentication_failed" || J.error === "oauth_org_not_allowed")
    )
      X = true;
  }
  let G;
  switch (r.kind) {
    case "ok":
      G = null;
      break;
    case "error":
      G = r.message;
      break;
    case "exit": {
      let stderrTail = r.stderrTail;
      G =
        j !== null
          ? `exit ${r.code}: ${truncateWithCount(j, 2000)}${stderrTail ? ` \xB7 stderr: ${stderrTail}` : ""}`
          : `exit ${r.code}: ${stderrTail || NO_STDERR_TEXT}`;
      break;
    }
  }
  if (!K) {
    S = T;
    if (R === 0) R = N;
  }
  return {
    trace: e,
    toolCalls: w,
    artifactPublishes: collectPublishedArtifacts(e),
    lastAssistantText,
    numTurns: R,
    costUsd: S,
    timedOut: n,
    killedInFlight: n,
    error: G,
    authRejected: K ? X && G !== null : null,
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
function safeStringify(e) {
  try {
    return jsonStringify(e) ?? "";
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
var gitVersionCache = identity_2(new Map(), (e) => e.clear());
//@ chunk-qchp9vrd.js:200291-201628 placement
/**
 * 检查本机 git 版本是否足够新（超时无回应则无法判断）。
 */
async function checkGitVersionForEval(e) {
  let PATH = e.PATH ?? "";
  let r = gitVersionCache.get(PATH);
  if (r === undefined) {
    let b = await execFileNoThrow("git", ["--version"], {
      env: e,
      timeout: GIT_VERSION_TIMEOUT_MS,
    });
    let match = /git version (\d+)\.(\d+)/.exec(b.stdout);
    if (b.timedOut)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `git on this host did not report its version within ${GIT_VERSION_TIMEOUT_MS / 1000} seconds, so claude plugin eval cannot tell whether it is new enough (git ${MIN_GIT_VERSION[0]}.${MIN_GIT_VERSION[1]} or newer) to switch off the repository's git hooks and helper programs for the run. Try again, or install git ${MIN_GIT_VERSION[0]}.${MIN_GIT_VERSION[1]} or newer.`,
        "eval: git version probe timed out",
      );
    if (match === null) {
      if (b.code !== 0) r = "absent";
      else
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `git on this host did not print a version claude plugin eval can read, so it cannot tell whether git is new enough (git ${MIN_GIT_VERSION[0]}.${MIN_GIT_VERSION[1]} or newer) to switch off the repository's git hooks and helper programs for the run. Run git --version to see what it prints, and install git ${MIN_GIT_VERSION[0]}.${MIN_GIT_VERSION[1]} or newer.`,
          "eval: git version probe unreadable",
        );
    } else r = [Number(match[1]), Number(match[2])];
    gitVersionCache.set(PATH, r);
  }
  if (r === "absent") return;
  let [a, s] = r;
  let [h, w] = MIN_GIT_VERSION;
  if (a > h || (a === h && s >= w)) return;
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `git ${a}.${s} is too old for claude plugin eval: it ignores the environment configuration (GIT_CONFIG_COUNT, added in git ${h}.${w}) that switches off the repository's git hooks and helper programs for the run. Install git ${h}.${w} or newer.`,
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
