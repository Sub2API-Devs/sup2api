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
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
} from "fs/promises";
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
import { vun, Eun } from "../artifacts/artifactsMcpServer.js";
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
import { logForDebugging, fl, pl, LATEST_DEBUG_LOG_LINK, Pp } from "../../utils/debug.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { openNoFollow_2 } from "../../utils/fsSafety/hardenedRead.js";
import { readExactBytes } from "../artifacts/artifactUrl.js";
import { detectPlatformFlavor } from "./caseDiscovery.js";
import { replaceFileExclusive } from "../artifacts/stubPublishDir.js";
import { calculateUSDCost } from "../../utils/modelCost.js";
import { toolResultText } from "./mocks/mockVerification.js";
import { wZt } from "../../utils/sandbox/sandboxErrors.js";
import { truncateWithCount } from "../../utils/stringUtils.js";
import { getGitSafetyConfigPairs } from "../../utils/gitSafeExec.js";
import { ge } from "../../utils/identity.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { SUPPORTED_PLATFORMS } from "../../utils/platform.js";
import { normalizeCaseForComparison } from "../../utils/permissions/filesystem.js";

//@ chunk-qchp9vrd.js:193455-193781 placement = hasSuccessfulToolCall (0.813)
var ToolUseBlockSchema = DoctorLazy(() =>
    create({
      type: create_25("tool_use"),
      id: create_2(),
      name: create_2(),
      input: create({ action: create_2().optional() }).passthrough().optional(),
    }),
  ),
  Ep = DoctorLazy(() => new Set(vun(Eun))),
  Hi = DoctorLazy(() =>
    create({
      type: create_25("tool_result"),
      tool_use_id: create_2(),
      is_error: create_6().optional(),
      content: create_12().optional(),
    }),
  ),
  kp = DoctorLazy(() =>
    create({ message: create({ content: create_15(create_12()) }).passthrough() }).passthrough(),
  );
//@ chunk-qchp9vrd.js:193781-194060 placement
function findPublishToolUses(e) {
  let n = new Map();
  for (let r of e) {
    if (r.type !== "assistant") continue;
    for (let a of Po(r)) {
      let safeParse = ToolUseBlockSchema().safeParse(a);
      if (!safeParse.success) continue;
      let h = safeParse.data.input?.action;
      if (
        safeParse.data.name === ARTIFACT_TOOL_NAME
          ? h === void 0 || h === "publish"
          : Ep().has(safeParse.data.name)
      )
        n.set(safeParse.data.id, safeParse.data.name);
    }
  }
  return n;
}
//@ chunk-qchp9vrd.js:194060-194324 placement
function* iteratePublishResults(e) {
  let n = findPublishToolUses(e);
  if (n.size === 0) return;
  for (let r of e) {
    if (r.type !== "user") continue;
    for (let a of Po(r)) {
      let safeParse = Hi().safeParse(a),
        h = safeParse.success ? n.get(safeParse.data.tool_use_id) : void 0;
      if (!safeParse.success || safeParse.data.is_error === !0 || h === void 0) continue;
      yield { message: r, tool: h };
    }
  }
}
//@ chunk-qchp9vrd.js:194324-194551 placement
function collectPublishedArtifacts(e) {
  let n = new Set(),
    r = [];
  for (let { message: message, tool: tool } of iteratePublishResults(e)) {
    if (tool !== ARTIFACT_TOOL_NAME) continue;
    let h = getToolResultUrl(message),
      w = h === void 0 ? null : parseArtifactUrl(h);
    if (h === void 0 || !w || n.has(w.slug)) continue;
    (n.add(w.slug), r.push({ url: h, slug: w.slug, env: w.env }));
  }
  return r;
}
/**
 * 从运行轨迹的消息中收集桩工件 URL 的 slug。
 */
//@ chunk-qchp9vrd.js:194551-194673 placement
function collectStubArtifactSlugs(e) {
  let n = new Set();
  for (let { message: message } of iteratePublishResults(e)) {
    let a = getToolResultUrl(message),
      s = a === void 0 ? null : parseStubArtifactUrl(a);
    if (s) n.add(s.slug);
  }
  return n;
}
//@ chunk-qchp9vrd.js:194673-194914 placement
function getToolResultUrl(e) {
  let safeParse = toolUseResultSchema().safeParse(e);
  if (!safeParse.success) return;
  let tool_use_result = safeParse.data.tool_use_result;
  if (typeof tool_use_result !== "string" && !Array.isArray(tool_use_result)) return tool_use_result.url;
  let safeParse_2 = urlResultSchema().safeParse(
    safeParseJSON(typeof tool_use_result === "string" ? tool_use_result : tool_use_result[0]?.text, !1),
  );
  return safeParse_2.success ? safeParse_2.data.url : void 0;
}
//@ chunk-qchp9vrd.js:194914-195143 placement
var urlResultSchema = DoctorLazy(() => create({ url: create_2() }).passthrough()),
  toolUseResultSchema = DoctorLazy(() =>
    create({
      tool_use_result: create_16([
        urlResultSchema(),
        create_2(),
        create_15(create({ text: create_2().optional() }).passthrough()),
      ]),
    }).passthrough(),
  ),
  artifactStubSchema = DoctorLazy(() =>
    create({ slug: create_2(), url: create_2(), publishedAtMs: create_3().optional() }).passthrough(),
  );
//@ chunk-qchp9vrd.js:195143-196768 placement
async function readStubPublishDir(e, n) {
  let r;
  try {
    let s = await lstat_11(e);
    if (!s.isDirectory() || s.isSymbolicLink())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "the stub publish directory is not a real directory",
        "eval: stub publish dir not a directory",
      );
    r = await readdir_10(e);
  } catch (error) {
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    throw (
      logForDebugging(`eval: cannot read stub publish dir ${e}: ${errorMessage(error)}`, { level: "warn" }),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `the stub publish directory could not be read (${getErrnoCode(error) ?? "unknown error"})`,
        "eval: stub publish dir unreadable",
      )
    );
  }
  if (((r = r.filter((s) => ARTIFACT_SLUG_RE.test(s) && n.has(s))), r.length < n.size))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `a corroborated artifact publish is missing from the staging directory (${n.size - r.length} of ${n.size})`,
      "eval: stub publish payload missing",
    );
  if (r.length > fl)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `the run made more artifact publishes (${r.length}) than the harness indexes (${fl})`,
      "eval: too many stub publishes",
    );
  let a = [];
  for (let s of r) {
    let joined = path_15.join(e, s),
      joined_2 = path_15.join(joined, "manifest.json"),
      b = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `a corroborated artifact publish's payload is not a real directory holding a regular manifest (or is over ${pl} bytes)`,
        "eval: stub publish manifest unreadable",
      );
    if (
      !(await Promise.all([lstat_11(joined), lstat_11(joined_2)])
        .then(([j, K]) => j.isDirectory() && K.isFile())
        .catch(() => !1))
    )
      throw b;
    let R = await readSingleLinkFile(joined_2, pl);
    if (R === null) throw b;
    let str = R.toString("utf8"),
      T = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "a corroborated artifact publish's manifest is corrupt, or does not name its own slug and stub URL",
        "eval: stub publish manifest invalid",
      ),
      N;
    try {
      N = jsonParse(str);
    } catch {
      throw T;
    }
    let safeParse = artifactStubSchema().safeParse(N);
    if (
      !safeParse.success ||
      safeParse.data.slug !== s ||
      safeParse.data.url !== `${ARTIFACT_STUB_URL_PREFIX}${s}`
    )
      throw T;
    a.push({
      record: { url: safeParse.data.url, slug: safeParse.data.slug, env: "stub", payloadDir: joined },
      at: safeParse.data.publishedAtMs ?? 0,
    });
  }
  return a.sort((s, h) => s.at - h.at).map((s) => s.record);
}
//@ chunk-qchp9vrd.js:196814-197062 placement
async function readSingleLinkFile(e, n) {
  let r = await openNoFollow_2(e);
  if (!r.ok) return null;
  let a = r.value;
  try {
    let stats = await a.stat({ bigint: !0 });
    if (!stats.isFile() || stats.nlink !== 1n || stats.size > BigInt(n)) return null;
    return await readExactBytes(a, Number(stats.size));
  } catch {
    return null;
  } finally {
    await a.close();
  }
}
//@ chunk-qchp9vrd.js:197062-197564 placement
async function readStubPublishesJson(e, n) {
  let r = await lstat_11(e).catch((w) => {
    if (isENOENT(w)) return null;
    throw w;
  });
  if (r === null || !r.isDirectory()) return;
  let joined = path_15.join(e, "publishes.json"),
    joined_2 = path_15.join(e, LATEST_DEBUG_LOG_LINK);
  if (
    (await detectPlatformFlavor(joined_2, { harnessOwned: !0 }),
    await rm_4(joined_2, { recursive: !0, force: !0 }),
    n.length === 0)
  ) {
    await rm_4(joined, { recursive: !0, force: !0 });
    return;
  }
  await replaceFileExclusive(joined, jsonStringify(n, null, 2));
  let at = n.at(-1);
  if (at && at.env === "stub") {
    await mkdir_4(joined_2);
    for (let w of ["index.html", "manifest.json"]) {
      let b = await readSingleLinkFile(path_15.join(at.payloadDir, w), Pp);
      if (b === null) continue;
      await replaceFileExclusive(path_15.join(joined_2, w), b);
    }
  }
}
//@ chunk-qchp9vrd.js:197564-197646 placement
function Po(e) {
  let safeParse = kp().safeParse(e);
  return safeParse.success ? safeParse.data.message.content : [];
}
/**
 * 从 trace 汇总助手消息、工具调用、成本与用量。
 */
//@ chunk-qchp9vrd.js:197646-199801 placement
function summarizeRunTrace(e, n, r, a, { shellGranted: shellGranted, restoredCostUsd: restoredCostUsd }) {
  let w = [],
    b = new Map(),
    y = "",
    R = 0,
    S = 0,
    T = 0,
    N = 0,
    x = new Set(),
    j = null,
    K = !1,
    X = !1,
    W = !1;
  for (let J of e) {
    if (J.type === "assistant") {
      let message = J.message,
        se = typeof message?.id === "string" ? message.id : null;
      if (se === null || !x.has(se)) {
        if (se !== null) x.add(se);
        if (
          (N++,
          typeof message?.model === "string" && message.usage !== null && typeof message.usage === "object")
        )
          try {
            T += calculateUSDCost(message.model, message.usage);
          } catch {}
      }
      let Q = message?.content;
      if (Array.isArray(Q)) {
        let Se = [];
        for (let we of Q)
          if (we?.type === "tool_use") {
            let input = we.input,
              Je = { name: String(we.name ?? ""), input: input, inputText: xp(input) };
            w.push(Je);
            let id = we.id;
            if (typeof id === "string") b.set(id, Je);
          } else if (we?.type === "text") Se.push(String(we.text ?? ""));
        if (Se.length > 0)
          y = Se.join(`
`);
      }
    } else if (J.type === "user")
      for (let Z of Po(J)) {
        let safeParse = Hi().safeParse(Z);
        if (!safeParse.success) continue;
        let Q = b.get(safeParse.data.tool_use_id);
        if (Q)
          ((Q.output = toolResultText(safeParse.data.content)), (Q.isError = safeParse.data.is_error === !0));
      }
    else if (J.type === "result") {
      let Z = J;
      if (
        ((R = Z.num_turns ?? R),
        (S = Z.total_cost_usd === void 0 ? S : Math.max(0, Z.total_cost_usd - restoredCostUsd)),
        (K = !0),
        (W = Z.is_error === !0 && typeof Z.api_error_status === "number"),
        Array.isArray(Z.permission_denials))
      )
        for (let permission_denial of Z.permission_denials) {
          let Q = permission_denial?.tool_use_id,
            Se = typeof Q === "string" ? b.get(Q) : void 0;
          if (Se !== void 0) Se.deniedByChild = !0;
        }
      if (Z.is_error === !0) {
        if (typeof Z.result === "string") j = Z.result;
        else if (Array.isArray(Z.errors) && Z.errors.length > 0) {
          let mapped = Z.errors.map(String);
          j =
            shellGranted && mapped.some((Q) => Q.startsWith(wZt))
              ? `${jl} ${mapped.map((Q) => Q.replace(/\s*Set sandbox\.failIfUnavailable=false[^.]*\.?/, "")).join(" ")}`
              : mapped.join(" ");
        }
      }
    }
    if (
      J.type === "assistant" &&
      J.parent_tool_use_id == null &&
      (J.error === "authentication_failed" || J.error === "oauth_org_not_allowed")
    )
      X = !0;
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
    if (((S = T), R === 0)) R = N;
  }
  return {
    trace: e,
    toolCalls: w,
    artifactPublishes: collectPublishedArtifacts(e),
    lastAssistantText: y,
    numTurns: R,
    costUsd: S,
    timedOut: n,
    killedInFlight: n,
    error: G,
    authRejected: K ? X && G !== null : null,
    endedOnApiError: W,
    tracePath: a,
    mockCalls: [],
    mockTally: null,
    mockRecordings: [],
    aborted: null,
    mockSetupFailure: null,
  };
}
//@ chunk-qchp9vrd.js:199801-200089 placement
var NO_STDERR_TEXT = "(no stderr)",
  jl =
    "A shell tool (Bash or PowerShell) was granted but this machine cannot confine it (no sandbox backend on this platform, or it is not installed), so the run was refused rather than run unconfined \u2014 drop the shell grant, or on Linux/macOS install the backend.";
//@ chunk-qchp9vrd.js:200089-200140 placement
function xp(e) {
  try {
    return jsonStringify(e) ?? "";
  } catch {
    return "";
  }
}
/**
 * 评测运行用的 git 配置对：安全配置加上 pager=cat、editor=true、清空 credential.helper。
 */
//@ chunk-qchp9vrd.js:200140-200240 placement
function getEvalGitConfigPairs() {
  return [
    ...getGitSafetyConfigPairs(),
    ["core.pager", "cat"],
    ["core.editor", "true"],
    ["credential.helper", ""],
  ];
}
//@ chunk-qchp9vrd.js:200240-200291 placement
var un = [2, 31],
  ml = 1e4,
  gl = ge(new Map(), (e) => e.clear());
/**
 * 检查本机 git 版本是否足够新（超时无回应则无法判断）。
 */
//@ chunk-qchp9vrd.js:200291-201628 placement
async function checkGitVersionForEval(e) {
  let n = e.PATH ?? "",
    r = gl.get(n);
  if (r === void 0) {
    let b = await execFileNoThrow("git", ["--version"], { env: e, timeout: ml }),
      match = /git version (\d+)\.(\d+)/.exec(b.stdout);
    if (b.timedOut)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `git on this host did not report its version within ${ml / 1000} seconds, so claude plugin eval cannot tell whether it is new enough (git ${un[0]}.${un[1]} or newer) to switch off the repository's git hooks and helper programs for the run. Try again, or install git ${un[0]}.${un[1]} or newer.`,
        "eval: git version probe timed out",
      );
    if (match === null)
      if (b.code !== 0) r = "absent";
      else
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `git on this host did not print a version claude plugin eval can read, so it cannot tell whether git is new enough (git ${un[0]}.${un[1]} or newer) to switch off the repository's git hooks and helper programs for the run. Run git --version to see what it prints, and install git ${un[0]}.${un[1]} or newer.`,
          "eval: git version probe unreadable",
        );
    else r = [Number(match[1]), Number(match[2])];
    gl.set(n, r);
  }
  if (r === "absent") return;
  let [a, s] = r,
    [h, w] = un;
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
  jl,
  nfcKeyIfEnabled,
  Po,
  Hi,
  getEvalGitConfigPairs,
};
