/**
 * @anthropic-ai/claude-agent-sdk/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/claude-agent-sdk/index.js
 * pieces: chunk-y805ph4h.js (29)
 * attribution: placement 29
 */
import {
  join,
  join as join_2,
  join as join_3,
  resolve,
  resolve as resolve_2,
  relative,
  sep,
  sep as sep_2,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  dirname,
  posix,
  win32,
} from "path";
import { homedir, homedir as homedir_2, tmpdir } from "os";
import {
  writeFile,
  writeFile as writeFile_2,
  readFile,
  readFile as readFile_2,
  copyFile,
  rm,
  rm as rm_2,
  mkdir,
} from "fs/promises";
import { realpathSync } from "fs";
import { randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { jsonParse, jsonStringify, alwaysTrue } from "../../../src/utils/slowOperations.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { Ol } from "../../@opentelemetry/api/build/src/index.js";
import { TOOL_HOOK_EXECUTION_TIMEOUT_MS } from "../../../src/utils/hooks/hookEvents.js";
import {
  getErrnoCode,
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  toError,
} from "../../../src/utils/errors.js";
import { logForDebugging } from "../../../src/utils/debug.js";
import { Mn } from "../../../src/utils/pathClassification.js";
import {
  getProjectKey,
  sanitizePath,
  validateUuid,
  writeEntriesToJsonlFile,
} from "../../../src/utils/sessionStoragePortable.js";
import {
  validateProjectDirName,
  getTrimmedEnvValue,
  parseIntLoose,
  isEnvVarTruthy,
} from "../../../src/utils/envUtils.js";
import { Wo } from "../../../src/utils/json.js";
import { withTimeout, sleep } from "../../../src/utils/sleep.js";
import { STORAGE_SPACES } from "../../../src/utils/storage/storageSpaces.js";
import { OAUTH_GLOBAL_FILE_SUFFIXES } from "../../../src/constants/oauth.js";
import { createAbortController } from "../../../src/utils/abortController.js";
import { $t, Lt, ProcessTransport } from "./transport.js";
import { DEFAULT_PRINT_BG_WAIT_CEILING_MS } from "../../../src/tasks/LocalShellTask/backgroundNotices.js";
import { Query } from "./query.js";
import { TranscriptMirrorBatcher, Me, we } from "./transcriptMirror.js";

//@ chunk-y805ph4h.js:63137-63633 placement
function sr(e) {
  try {
    let s = jsonParse(Buffer.from(e, "base64url").toString("utf8"));
    if (
      typeof s !== "object" ||
      s === null ||
      !("session_ingress_token" in s) ||
      typeof s.session_ingress_token !== "string"
    )
      return;
    let session_ingress_token = s.session_ingress_token,
      parts = (
        session_ingress_token.startsWith("sk-ant-si-")
          ? session_ingress_token.slice(10)
          : session_ingress_token
      ).split(".");
    if (parts.length !== 3 || !parts[1]) return;
    let m = jsonParse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof m === "object" &&
      m !== null &&
      "session_id" in m &&
      typeof m.session_id === "string" &&
      m.session_id
      ? m.session_id
      : void 0;
  } catch {
    return;
  }
}
//@ chunk-y805ph4h.js:63633-63651 placement
var Ue = Re(Ol(), 1);
//@ chunk-y805ph4h.js:63651-63679 placement
var qt = 60000,
  nr = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  ha = qt + nr;
//@ chunk-y805ph4h.js:63818-63936 placement
function Vt(e) {
  return {
    globalConfig: join_3(e || homedir_2(), ".claude.json"),
    userSettings: join_3(e || join_3(homedir_2(), ".claude"), "settings.json"),
  };
}
//@ chunk-y805ph4h.js:63936-64007 placement
function nt(e, s, r, n) {
  return e !== void 0 && s === r ? { backend: e, key: n } : void 0;
}
//@ chunk-y805ph4h.js:64007-64255 placement
async function de(e, s, r, n) {
  if (n) return ar(n, e, s, r);
  try {
    if (r) await writeFile_2(s, r(await readFile_2(e)), { mode: 384 });
    else await copyFile(e, s);
  } catch (error) {
    if (getErrnoCode(error) === void 0) throw error;
    if (!isENOENT(error))
      (await rm_2(s, { force: !0 }).catch(() => {}),
        logForDebugging(`sessionStore resume: skipping ${e} (${getErrnoCode(error)})`));
  }
}
//@ chunk-y805ph4h.js:64255-64868 placement
async function ar({ backend: backend, key: key }, r, n, i) {
  let read = await backend.read([key]);
  if (!read.ok) {
    if (read.error.code === "InvalidArgument")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `sessionStore resume: invalid v5 key for ${r}: ${read.error.argument}${read.error.reason ? ` (${read.error.reason})` : ""}`,
        "sessionStore resume: invalid v5 key (InvalidArgument from backend read)",
      );
    logForDebugging(`sessionStore resume: skipping ${r} (${read.error.code})`);
    return;
  }
  let l = read.value.items[0];
  if (!l?.found) return;
  let buffer = Buffer.from(l.value);
  try {
    await writeFile_2(n, i ? i(buffer) : buffer, { mode: 384 });
  } catch (error) {
    if (getErrnoCode(error) === void 0) throw error;
    if (!isENOENT(error))
      (await rm_2(n, { force: !0 }).catch(() => {}),
        logForDebugging(`sessionStore resume: skipping ${r} (${getErrnoCode(error)})`));
  }
}
//@ chunk-y805ph4h.js:64868-65572 placement
function lr(e, s) {
  if (e === "bypassPermissions")
    return "canUseTool will not be invoked: permissionMode 'bypassPermissions' auto-approves every tool call (except explicit deny rules) before the callback is consulted. To gate every tool call, use a PreToolUse hook instead.";
  let filtered = s.filter((n) => n.length > 0 && !n.includes("("));
  if (filtered.length === 0) return;
  return `canUseTool will not be invoked for: ${filtered.join(", ")}. Bare allowedTools entries auto-approve the whole tool before the callback is consulted. To gate every tool call, use a PreToolUse hook; or remove the bare names from allowedTools so they fall through to canUseTool. Allow rules from settings files can also shadow the callback but are not visible here.`;
}
//@ chunk-y805ph4h.js:65572-65704 placement
function Qt(e, s, r) {
  if (!e) return;
  let n = lr(s, r);
  if (n === void 0) return;
  process.emitWarning(n, { code: "CLAUDE_SDK_CAN_USE_TOOL_SHADOWED" });
}
//@ chunk-y805ph4h.js:65813-65882 placement
function Xt(e) {
  let s = resolve_2(e ?? "."),
    r;
  try {
    r = realpathSync(s);
  } catch {
    r = s;
  }
  return Mn(r);
}
//@ chunk-y805ph4h.js:65882-66016 placement
function be(e, s) {
  let r = Xt(e);
  if (s === void 0) return getProjectKey(r);
  return (
    (s.CLAUDE_CONFIG_DIR ? validateProjectDirName(s.CLAUDE_CODE_PROJECT_DIR_NAME) : void 0) ?? sanitizePath(r)
  );
}
//@ chunk-y805ph4h.js:66016-66107 placement
function ot(e) {
  return typeof e === "object" && e !== null && "type" in e && e.type === "agent_metadata";
}
//@ chunk-y805ph4h.js:66107-66473 placement
function it(e, s) {
  let r = relative(s, e),
    parts = r.split(sep_2);
  if (parts[0] === ".." || isAbsolute_2(r)) return null;
  if (parts.length < 2) return null;
  let i = parts[0],
    m = parts[1];
  if (parts.length === 2 && m.endsWith(".jsonl"))
    return { projectKey: i, sessionId: m.replace(/\.jsonl$/, "") };
  if (parts.length >= 4) {
    let sliced = parts.slice(2),
      h = sliced.length - 1;
    return (
      (sliced[h] = sliced.at(-1).replace(/\.jsonl$/, "")),
      { projectKey: i, sessionId: m, subpath: sliced.join("/") }
    );
  }
  return null;
}
//@ chunk-y805ph4h.js:66473-66524 placement
process.env.NoDefaultCurrentDirectoryInExePath = "1";
//@ chunk-y805ph4h.js:66524-66600 placement
var Tr = ["enabledPlugins", "extraKnownMarketplaces", "additionalMarketplaces"];
//@ chunk-y805ph4h.js:66600-66859 placement
function Yt(e) {
  let s;
  try {
    s = jsonParse(Wo(e.toString("utf8")));
  } catch {
    return e;
  }
  if (!Zt(s)) return e;
  let r = !1;
  for (let i of Tr) if (Object.hasOwn(s, i)) (delete s[i], (r = !0));
  let env = s.env;
  if (Zt(env) && Object.hasOwn(env, "CLAUDE_CONFIG_DIR")) (delete env.CLAUDE_CONFIG_DIR, (r = !0));
  return r ? jsonStringify(s) : e;
}
//@ chunk-y805ph4h.js:66859-66930 placement
function Zt(e) {
  return e !== null && typeof e === "object" && !Array.isArray(e);
}
//@ chunk-y805ph4h.js:66930-67099 placement
async function Pr(e, s) {
  if (!e) return;
  let r = e;
  try {
    let n = jsonParse(e);
    if (n?.claudeAiOauth?.refreshToken) (delete n.claudeAiOauth.refreshToken, (r = jsonStringify(n)));
  } catch {}
  await writeFile(s, r, { mode: 384 });
}
//@ chunk-y805ph4h.js:67099-67144 placement
function Mr() {
  return Promise.resolve(void 0);
}
//@ chunk-y805ph4h.js:67144-68342 placement
async function Ir(e, s, r, n, i = 60000, m) {
  if (!validateUuid(s)) return;
  let l = be(r, n),
    h = await withTimeout(
      e.load({ projectKey: l, sessionId: s }),
      i,
      `SessionStore.load() timed out after ${i}ms for session ${s}`,
    );
  if (!h || h.length === 0) return;
  let S = join_2(tmpdir(), `claude-resume-${randomUUID_3()}`);
  try {
    let y = join_2(S, "projects", l);
    await mkdir(y, { recursive: !0, mode: 448 });
    let w = join_2(y, `${s}.jsonl`);
    await writeEntriesToJsonlFile(w, h);
    let b = n?.CLAUDE_CONFIG_DIR ?? process.env.CLAUDE_CONFIG_DIR,
      R = b ?? join_2(homedir(), ".claude"),
      T;
    try {
      T = await readFile(join_2(R, ".credentials.json"), "utf-8");
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
    if (!b && !(n ?? process.env).ANTHROPIC_API_KEY && !(n ?? process.env).CLAUDE_CODE_OAUTH_TOKEN)
      T = (await Mr()) ?? T;
    await Pr(T, join_2(S, ".credentials.json"));
    let E = Vt(getTrimmedEnvValue("CLAUDE_CONFIG_DIR")),
      P = b || homedir(),
      D = join_2(P, ".claude.json");
    (await de(D, join_2(S, ".claude.json"), void 0, nt(m, D, E.globalConfig, STORAGE_SPACES.globalConfig())),
      await de(join_2(R, ".config.json"), join_2(S, ".config.json")));
    for (let K of OAUTH_GLOBAL_FILE_SUFFIXES)
      if (K) await de(join_2(P, `.claude${K}.json`), join_2(S, `.claude${K}.json`));
    let F = join_2(R, "settings.json");
    if (
      (await de(F, join_2(S, "settings.json"), Yt, nt(m, F, E.userSettings, STORAGE_SPACES.userSettings())),
      await de(join_2(R, "cowork_settings.json"), join_2(S, "cowork_settings.json"), Yt),
      e.listSubkeys)
    )
      await Dr(e, { projectKey: l, sessionId: s }, join_2(y, s), i);
    return S;
  } catch (error) {
    throw (await removeRecursiveWithRetry(S), error);
  }
}
//@ chunk-y805ph4h.js:68342-69181 placement
async function Dr(e, s, r, n) {
  let i = await withTimeout(
    e.listSubkeys({ projectKey: s.projectKey, sessionId: s.sessionId }),
    n,
    `SessionStore.listSubkeys() timed out after ${n}ms for session ${s.sessionId}`,
  );
  for (let m of i) {
    let l = resolve(r, m + ".jsonl");
    if (!m || isAbsolute(m) || m.split(/[\\/]/).includes("..") || !l.startsWith(r + sep)) {
      logForDebugging(`[SessionStore] skipping unsafe subpath from listSubkeys: ${m}`, { level: "warn" });
      continue;
    }
    let h = await withTimeout(
      e.load({ projectKey: s.projectKey, sessionId: s.sessionId, subpath: m }),
      n,
      `SessionStore.load() timed out after ${n}ms for session ${s.sessionId} subpath ${m}`,
    );
    if (!h || h.length === 0) continue;
    let S = [],
      y = [];
    for (let w of h)
      if (ot(w)) S.push(w);
      else y.push(w);
    if (y.length > 0) (await mkdir(dirname(l), { recursive: !0 }), await writeEntriesToJsonlFile(l, y));
    if (S.length > 0) {
      let at = S.at(-1),
        b = resolve(r, m + ".meta.json");
      await mkdir(dirname(b), { recursive: !0 });
      let { type: R, ...T } = at;
      await writeFile(b, jsonStringify(T), { mode: 384 });
    }
  }
}
//@ chunk-y805ph4h.js:69181-69476 placement
function Or(e) {
  let s =
    e?.accepted === !0 &&
    (typeof e.directory !== "string" || !(posix.isAbsolute(e.directory) || win32.isAbsolute(e.directory)))
      ? void 0
      : e;
  if (e !== void 0 && s === void 0)
    logForDebugging(
      "workspaceTrust ignored: accepted requires an absolute directory, as it exists where Claude Code runs",
      { level: "warn" },
    );
  return s;
}
/**
 * Agent SDK 的 query() 入口：解析选项、创建 ProcessTransport 与 Query，返回可异步迭代的消息流。
 */
//@ chunk-y805ph4h.js:69476-76596 placement
function query(e, s) {
  let {
      isSingleUserTurn: isSingleUserTurn,
      resumeConfigDir: resumeConfigDir,
      deferSpawn: deferSpawn,
      readsStartupMarks: readsStartupMarks,
    } = s,
    {
      systemPrompt: systemPrompt,
      settings: settings,
      managedSettings: managedSettings,
      settingSources: settingSources,
      sandbox: sandbox,
      ...b
    } = e ?? {},
    R,
    T,
    E,
    P;
  if (systemPrompt === void 0) R = "";
  else if (typeof systemPrompt === "string") R = systemPrompt;
  else if (Array.isArray(systemPrompt)) R = systemPrompt;
  else if (systemPrompt.type === "custom") ((R = systemPrompt.prompt), (P = systemPrompt.snapshot));
  else if (systemPrompt.type === "preset")
    ((T = systemPrompt.append), (E = systemPrompt.excludeDynamicSections), (P = systemPrompt.snapshot));
  process.env.CLAUDE_AGENT_SDK_VERSION = process.env.CLAUDE_AGENT_SDK_VERSION ?? "unknown";
  let {
      abortController: abortController = createAbortController(),
      additionalDirectories: additionalDirectories = [],
      projectConfigRoot: projectConfigRoot,
      agent: agent,
      agents: agents,
      allowedTools: allowedTools = [],
      betas: betas,
      canUseTool: canUseTool,
      continue: re,
      cwd: cwd,
      debug: debug,
      debugFile: debugFile,
      disallowedTools: disallowedTools = [],
      tools: tools,
      env: env,
      executable: executable = alwaysTrue() ? "bun" : "node",
      executableArgs: executableArgs = [],
      extraArgs: extraArgs = {},
      fallbackModel: fallbackModel,
      enableFileCheckpointing: enableFileCheckpointing,
      toolConfig: toolConfig,
      forkSession: forkSession,
      hooks: hooks,
      includeHookEvents: includeHookEvents,
      includePartialMessages: includePartialMessages,
      forwardSubagentText: forwardSubagentText,
      verbatimPrompts: verbatimPrompts = !1,
      onElicitation: onElicitation,
      onUserDialog: onUserDialog,
      supportedDialogKinds: supportedDialogKinds,
      perTaskStopAffordance: perTaskStopAffordance,
      rapidFollowupPreempt: rapidFollowupPreempt,
      workspaceTrust: workspaceTrust,
      persistSession: persistSession,
      sessionStore: sessionStore,
      sessionStoreFlush: sessionStoreFlush,
      thinking: thinking,
      effort: effort,
      maxThinkingTokens: maxThinkingTokens,
      maxTurns: maxTurns,
      maxBudgetUsd: maxBudgetUsd,
      taskBudget: taskBudget,
      mcpServers: mcpServers,
      model: model,
      outputFormat: outputFormat,
      permissionMode: permissionMode,
      allowDangerouslySkipPermissions: allowDangerouslySkipPermissions = !1,
      permissionPromptToolName: permissionPromptToolName,
      permissionPrompts: permissionPrompts,
      plugins: plugins,
      pluginDelivery: pluginDelivery = "argv",
      getOAuthToken: getOAuthToken,
      getHostAuthToken: getHostAuthToken,
      workload: workload,
      resume: resume,
      resumeSessionAt: resumeSessionAt,
      resumeDropsTurn: resumeDropsTurn,
      sessionId: sessionId,
      skills: skills,
      stderr: stderr,
      strictMcpConfig: strictMcpConfig,
    } = b,
    St = permissionMode;
  if (sessionStore && persistSession === !1)
    throw Error(
      "sessionStore cannot be used with persistSession: false -- the storage adapter requires local writes to mirror from. To avoid keeping a local copy, pass env: { ...process.env, CLAUDE_CONFIG_DIR: dir }, where dir is a new private directory such as fs.mkdtempSync(path.join(os.tmpdir(), 'claude-')), and delete dir when the query ends.",
    );
  $t({ supportedDialogKinds: supportedDialogKinds, onUserDialog: onUserDialog });
  let ws = Or(workspaceTrust);
  if (sessionStore && re && !resume && !sessionStore.listSessions)
    throw Error("Options.continue with sessionStore requires store.listSessions to be implemented");
  if (sessionStore && enableFileCheckpointing)
    throw Error(
      "enableFileCheckpointing is not yet supported with sessionStore (backup blobs are not mirrored, so rewindFiles() fails after a store-backed resume).",
    );
  if (sessionStore && b.spawnClaudeCodeProcess)
    logForDebugging(
      "sessionStore with custom spawnClaudeCodeProcess: ensure the subprocess CLAUDE_CONFIG_DIR matches the parent (same path, same separators) or transcript_mirror frames will be dropped.",
      { level: "warn" },
    );
  if (
    (Qt(!!canUseTool, St ?? "default", allowedTools),
    pluginDelivery !== "argv" && pluginDelivery !== "initialize")
  )
    throw Error("Invalid pluginDelivery. Expected 'argv' or 'initialize'.");
  let yt = pluginDelivery === "initialize" && plugins !== void 0 && plugins.length > 0,
    pathToClaudeCodeExecutable = b.pathToClaudeCodeExecutable;
  if (!pathToClaudeCodeExecutable) {
    let O = fileURLToPath(import.meta.url),
      U = createRequire(O),
      q = Lt((ie) => U.resolve(ie));
    if (!q)
      throw Error(
        "Native CLI binary for linux-x64 not found. Reinstall @anthropic-ai/claude-agent-sdk without --omit=optional, or set options.pathToClaudeCodeExecutable.",
      );
    pathToClaudeCodeExecutable = q;
  }
  let wt = outputFormat?.type === "json_schema" ? outputFormat.schema : void 0,
    I = env ? { ...env } : { ...process.env };
  if (!I.CLAUDE_CODE_ENTRYPOINT) I.CLAUDE_CODE_ENTRYPOINT = "sdk-ts";
  if (!I.CLAUDE_AGENT_SDK_VERSION) I.CLAUDE_AGENT_SDK_VERSION = process.env.CLAUDE_AGENT_SDK_VERSION;
  if (enableFileCheckpointing) I.CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING = "true";
  if (!Object.keys(I).some((O) => O.toUpperCase() === "CLAUDE_CODE_SDK_READS_SESSION_STATE"))
    I.CLAUDE_CODE_SDK_READS_SESSION_STATE = "1";
  if (
    readsStartupMarks &&
    !Object.keys(I).some((O) => O.toUpperCase() === "CLAUDE_CODE_SDK_READS_STARTUP_MARKS")
  )
    I.CLAUDE_CODE_SDK_READS_STARTUP_MARKS = "1";
  let We = parseIntLoose(I.CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS),
    bs = Number.isFinite(We) && We >= 0 ? We : DEFAULT_PRINT_BG_WAIT_CEILING_MS;
  if (getOAuthToken) I.CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH = "1";
  if (getHostAuthToken) I.CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH = "1";
  if (toolConfig?.askUserQuestion?.previewFormat)
    I.CLAUDE_CODE_QUESTION_PREVIEW_FORMAT = toolConfig.askUserQuestion.previewFormat;
  for (let [O, U] of [
    [toolConfig?.askUserQuestion?.extendedQuestions, "CLAUDE_CODE_QUESTION_EXTENDED"],
    [toolConfig?.askUserQuestion?.optionalDescriptions, "CLAUDE_CODE_QUESTION_OPTIONAL_DESCRIPTIONS"],
    [!1, "CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES"],
  ])
    if (O) I[U] = "1";
    else if (!env) {
      for (let q of Object.keys(I)) if (q.toUpperCase() === U) delete I[q];
    }
  let Ve = {};
  if ((Ue.propagation.inject(Ue.context.active(), Ve), "traceparent" in Ve)) {
    for (let O of ["TRACEPARENT", "TRACESTATE"]) if (!(O in (env ?? {}))) delete I[O];
  }
  for (let [O, U] of Object.entries(Ve)) {
    let upper = O.toUpperCase();
    if (!(upper in (env ?? {}))) I[upper] = U;
  }
  let bt = {},
    _t = new Map();
  if (mcpServers)
    for (let [O, U] of Object.entries(mcpServers))
      if (U.type === "sdk" && U.instance) _t.set(O, U);
      else bt[O] = U;
  let Se;
  if (thinking)
    switch (thinking.type) {
      case "adaptive":
        Se = { type: "adaptive", display: thinking.display };
        break;
      case "enabled":
        Se = { type: "enabled", budgetTokens: thinking.budgetTokens, display: thinking.display };
        break;
      case "disabled":
        Se = { type: "disabled" };
        break;
    }
  else if (maxThinkingTokens !== void 0)
    Se =
      maxThinkingTokens === 0 ? { type: "disabled" } : { type: "enabled", budgetTokens: maxThinkingTokens };
  if (resumeConfigDir) I.CLAUDE_CONFIG_DIR = resumeConfigDir;
  let kt = new ProcessTransport({
      abortController: abortController,
      additionalDirectories: additionalDirectories,
      projectConfigRoot: projectConfigRoot,
      agent: agent,
      betas: betas,
      cwd: cwd,
      debug: debug,
      debugFile: debugFile,
      executable: executable,
      executableArgs: executableArgs,
      extraArgs: workload ? { ...extraArgs, workload: workload } : extraArgs,
      pathToClaudeCodeExecutable: pathToClaudeCodeExecutable,
      env: I,
      forkSession: forkSession,
      stderr: stderr,
      thinkingConfig: Se,
      effort: effort,
      maxTurns: maxTurns,
      maxBudgetUsd: maxBudgetUsd,
      taskBudget: taskBudget,
      model: model,
      fallbackModel: fallbackModel,
      jsonSchema: wt,
      permissionMode: St,
      allowDangerouslySkipPermissions: allowDangerouslySkipPermissions,
      permissionPromptToolName: permissionPromptToolName,
      permissionPrompts: permissionPrompts,
      continueConversation: sessionStore ? void 0 : re,
      resume: resume,
      resumeSessionAt: resumeSessionAt,
      resumeDropsTurn: resumeDropsTurn,
      sessionId: sessionId,
      settings: typeof settings === "object" ? jsonStringify(settings) : settings,
      managedSettings: managedSettings ? jsonStringify(managedSettings) : void 0,
      settingSources: settingSources,
      skills: skills,
      allowedTools: allowedTools,
      disallowedTools: disallowedTools,
      tools: tools,
      mcpServers: bt,
      strictMcpConfig: strictMcpConfig,
      canUseTool: !!canUseTool,
      hooks: !!hooks,
      includeHookEvents: includeHookEvents,
      includePartialMessages: includePartialMessages,
      persistSession: persistSession,
      sessionMirror: !!sessionStore,
      plugins: plugins,
      pluginsViaInitialize: yt,
      sandbox: sandbox,
      spawnClaudeCodeProcess: b.spawnClaudeCodeProcess,
      onProcessSpawned: e?.onProcessSpawned,
      deferSpawn: deferSpawn,
    }),
    _s = {
      systemPrompt: R,
      appendSystemPrompt: T,
      planModeInstructions: b.planModeInstructions,
      systemPromptSnapshot: P,
      appendSubagentSystemPrompt: b.appendSubagentSystemPrompt,
      toolAliases: b.toolAliases,
      codeRunningMcpTools: b.codeRunningMcpTools,
      excludeDynamicSections: E,
      agents: agents,
      title: b.title,
      skills: skills,
      webSearchIsolationExemptMcpServers: b.webSearchIsolationExemptMcpServers,
      promptSuggestions: b.promptSuggestions,
      agentProgressSummaries: b.agentProgressSummaries,
      forwardSubagentText: forwardSubagentText,
      supportedDialogKinds: supportedDialogKinds,
      perTaskStopAffordance: perTaskStopAffordance,
      rapidFollowupPreempt: rapidFollowupPreempt,
      forwardNestedSubagentToolCalls: e?.forwardNestedSubagentToolCalls,
      workspaceTrust: ws,
      plugins: yt ? plugins : void 0,
      captureSdkMcpManifests: !isEnvVarTruthy("CLAUDE_AGENT_SDK_DISABLE_MCP_MANIFESTS"),
    },
    Qe = new Query(
      kt,
      isSingleUserTurn,
      canUseTool,
      hooks,
      abortController,
      _t,
      wt,
      _s,
      onElicitation,
      getOAuthToken,
      getHostAuthToken,
      onUserDialog,
      verbatimPrompts,
      bs,
    );
  if (sessionStore) {
    let O = () => join_2(I.CLAUDE_CONFIG_DIR ?? join_2(homedir(), ".claude"), "projects"),
      U = sessionStoreFlush === "eager",
      q = new TranscriptMirrorBatcher(
        async (ie, Xe) => {
          let ye = it(ie, O());
          if (ye) await sessionStore.append(ye, Xe);
          else
            logForDebugging(
              `[SessionStore] dropping mirror frame: filePath ${ie} is not under ${O()} -- subprocess CLAUDE_CONFIG_DIR likely differs from parent (custom spawnClaudeCodeProcess / container?)`,
              { level: "warn" },
            );
        },
        {
          onError: (ie, Xe) => {
            let ye = it(ie, O());
            if (ye) Qe.reportMirrorError(ye, Xe.message);
          },
          maxPendingEntries: U ? 0 : Me,
          maxPendingBytes: U ? 0 : we,
        },
      );
    Qe.setTranscriptMirrorBatcher(q);
  }
  return {
    queryInstance: Qe,
    transport: kt,
    abortController: abortController,
    processEnv: I,
    verbatimPrompts: verbatimPrompts,
  };
}
//@ chunk-y805ph4h.js:76596-76871 placement
function ss(e, s, r, n) {
  if (typeof s === "string")
    e.writeAfterInitialize(
      jsonStringify({
        type: "user",
        session_id: "",
        message: { role: "user", content: [{ type: "text", text: s }] },
        parent_tool_use_id: null,
        ...(n && { client_composed: !0 }),
      }) +
        `
`,
    ).catch((i) => r.abort(i));
  else e.streamInput(s).catch((i) => r.abort(i));
}
//@ chunk-y805ph4h.js:76871-76935 placement
var Ar = new Set(["EBUSY", "EMFILE", "ENFILE", "ENOTEMPTY", "EPERM"]);
/**
 * 带重试的递归删除（EBUSY/EPERM 等最多 5 次）。名字配错。
 */
//@ chunk-y805ph4h.js:76935-77083 placement = convertDirectoryToZipInPlace (1)
async function removeRecursiveWithRetry(e) {
  for (let s = 0; ; s++)
    try {
      return await rm(e, { recursive: !0, force: !0 });
    } catch (error) {
      if (s >= 4 || !Ar.has(getErrnoCode(error) ?? "")) return;
      await sleep((s + 1) * 100);
    }
}
//@ chunk-y805ph4h.js:77083-77149 placement
function xr(e, s) {
  e.waitForExit()
    .catch(() => {})
    .finally(() => removeRecursiveWithRetry(s));
}
//@ chunk-y805ph4h.js:77149-77366 placement
function jr({ prompt: prompt, options: options }) {
  if ((options?.resume || options?.continue) && options?.sessionStore) return Ur(prompt, options);
  let {
    queryInstance: queryInstance,
    abortController: abortController,
    verbatimPrompts: verbatimPrompts,
  } = query(options, { isSingleUserTurn: typeof prompt === "string" });
  return (ss(queryInstance, prompt, abortController, verbatimPrompts), queryInstance);
}
//@ chunk-y805ph4h.js:77366-78058 placement
function Ur(e, s) {
  let {
      queryInstance: queryInstance,
      transport: transport,
      abortController: abortController,
      processEnv: processEnv,
      verbatimPrompts: verbatimPrompts,
    } = query({ ...s }, { isSingleUserTurn: typeof e === "string", deferSpawn: !0 }),
    h = resolve(s.cwd ?? "."),
    sessionStore = s.sessionStore,
    y = s.loadTimeoutMs ?? 60000,
    resume = s.resume;
  return (
    (async () => {
      if (!resume)
        resume = (
          await withTimeout(
            sessionStore.listSessions(be(h, s.env)),
            y,
            `SessionStore.listSessions() timed out after ${y}ms`,
          )
        )
          .slice()
          .sort((T, E) => E.mtime - T.mtime)[0]?.sessionId;
      if (!resume) return;
      return Ir(sessionStore, resume, h, s.env, s.loadTimeoutMs);
    })()
      .then((R) => {
        if (R) {
          transport.updateResume(resume);
          let T = { CLAUDE_CONFIG_DIR: R };
          (transport.updateEnv(T),
            (processEnv.CLAUDE_CONFIG_DIR = R),
            queryInstance.addCleanupCallback(() => xr(transport, R)));
        }
        if (!queryInstance.isClosed()) transport.spawn();
      })
      .catch((R) => {
        let T = toError(R);
        (transport.spawnAbort(T), queryInstance.setError(T));
      }),
    ss(queryInstance, e, abortController, verbatimPrompts),
    queryInstance
  );
}

export { sr };
