/**
 * @anthropic-ai/claude-agent-sdk/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/claude-agent-sdk/index.js
 * pieces: chunk-y805ph4h.js (29)
 * attribution: placement 29
 */
import { join, resolve, relative, sep, isAbsolute, dirname, posix, win32 } from "path";
import { homedir, tmpdir } from "os";
import { writeFile, readFile, copyFile, rm, mkdir } from "fs/promises";
import { realpathSync } from "fs";
import { randomUUID as randomUUID_2 } from "crypto";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { jsonParse, jsonStringify, alwaysTrue } from "../../../src/utils/slowOperations.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { require_api } from "../../@opentelemetry/api/build/src/index.js";
import { TOOL_HOOK_EXECUTION_TIMEOUT_MS } from "../../../src/utils/hooks/hookEvents.js";
import {
  getErrnoCode,
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  toError,
} from "../../../src/utils/errors.js";
import { logForDebugging } from "../../../src/utils/debug.js";
import { identity } from "../../../src/utils/pathClassification.js";
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
import { stripBom } from "../../../src/utils/json.js";
import { withTimeout, sleep } from "../../../src/utils/sleep.js";
import { STORAGE_SPACES } from "../../../src/utils/storage/storageSpaces.js";
import { OAUTH_GLOBAL_FILE_SUFFIXES } from "../../../src/constants/oauth.js";
import { createAbortController } from "../../../src/utils/abortController.js";
import { $t, Lt, ProcessTransport } from "./transport.js";
import { DEFAULT_PRINT_BG_WAIT_CEILING_MS } from "../../../src/tasks/LocalShellTask/backgroundNotices.js";
import { Query } from "./query.js";
import { TranscriptMirrorBatcher, Me, we } from "./transcriptMirror.js";

//@ chunk-y805ph4h.js:63137-63633 placement
function sr(workSecret) {
  try {
    let s = jsonParse(Buffer.from(workSecret, "base64url").toString("utf8"));
    if (
      typeof s !== "object" ||
      s === null ||
      !("session_ingress_token" in s) ||
      typeof s.session_ingress_token !== "string"
    )
      return;
    let sessionIngressToken = s.session_ingress_token;
    let parts = (
      sessionIngressToken.startsWith("sk-ant-si-") ? sessionIngressToken.slice(10) : sessionIngressToken
    ).split(".");
    if (parts.length !== 3 || !parts[1]) return;
    let m = jsonParse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof m === "object" &&
      m !== null &&
      "session_id" in m &&
      typeof m.session_id === "string" &&
      m.session_id
      ? m.session_id
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-y805ph4h.js:63633-63651 placement
var Ue = Re(require_api(), 1);
//@ chunk-y805ph4h.js:63651-63679 placement
var qt = 60000;
var nr = TOOL_HOOK_EXECUTION_TIMEOUT_MS;
var ha = qt + nr;
//@ chunk-y805ph4h.js:63818-63936 placement
function Vt(trimmedEnvValue) {
  return {
    globalConfig: join(trimmedEnvValue || homedir(), ".claude.json"),
    userSettings: join(trimmedEnvValue || join(homedir(), ".claude"), "settings.json"),
  };
}
//@ chunk-y805ph4h.js:63936-64007 placement
function nt(e, s, r, key) {
  return e !== undefined && s === r
    ? {
        backend: e,
        key,
      }
    : undefined;
}
//@ chunk-y805ph4h.js:64007-64255 placement
async function de(e, s, r, n) {
  if (n) return ar(n, e, s, r);
  try {
    if (r)
      await writeFile(s, r(await readFile(e)), {
        mode: 384,
      });
    else await copyFile(e, s);
  } catch (error) {
    if (getErrnoCode(error) === undefined) throw error;
    if (!isENOENT(error)) {
      await rm(s, {
        force: true,
      }).catch(() => {});
      logForDebugging(`sessionStore resume: skipping ${e} (${getErrnoCode(error)})`);
    }
  }
}
//@ chunk-y805ph4h.js:64255-64868 placement
async function ar({ backend, key }, r, n, i) {
  let m = await backend.read([key]);
  if (!m.ok) {
    if (m.error.code === "InvalidArgument")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `sessionStore resume: invalid v5 key for ${r}: ${m.error.argument}${m.error.reason ? ` (${m.error.reason})` : ""}`,
        "sessionStore resume: invalid v5 key (InvalidArgument from backend read)",
      );
    logForDebugging(`sessionStore resume: skipping ${r} (${m.error.code})`);
    return;
  }
  let l = m.value.items[0];
  if (!l?.found) return;
  let buffer = Buffer.from(l.value);
  try {
    await writeFile(n, i ? i(buffer) : buffer, {
      mode: 384,
    });
  } catch (error) {
    if (getErrnoCode(error) === undefined) throw error;
    if (!isENOENT(error)) {
      await rm(n, {
        force: true,
      }).catch(() => {});
      logForDebugging(`sessionStore resume: skipping ${r} (${getErrnoCode(error)})`);
    }
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
function Qt(e, s, allowedTools) {
  if (!e) return;
  let n = lr(s, allowedTools);
  if (n === undefined) return;
  process.emitWarning(n, {
    code: "CLAUDE_SDK_CAN_USE_TOOL_SHADOWED",
  });
}
//@ chunk-y805ph4h.js:65813-65882 placement
function Xt(e) {
  let s = resolve(e ?? ".");
  let r;
  try {
    r = realpathSync(s);
  } catch {
    r = s;
  }
  return identity(r);
}
//@ chunk-y805ph4h.js:65882-66016 placement
function be(e, s) {
  let r = Xt(e);
  if (s === undefined) return getProjectKey(r);
  return (
    (s.CLAUDE_CONFIG_DIR ? validateProjectDirName(s.CLAUDE_CODE_PROJECT_DIR_NAME) : undefined) ??
    sanitizePath(r)
  );
}
//@ chunk-y805ph4h.js:66016-66107 placement
function ot(e) {
  return typeof e === "object" && e !== null && "type" in e && e.type === "agent_metadata";
}
//@ chunk-y805ph4h.js:66107-66473 placement
function it(e, s) {
  let r = relative(s, e);
  let parts = r.split(sep);
  if (parts[0] === ".." || isAbsolute(r)) return null;
  if (parts.length < 2) return null;
  let projectKey = parts[0];
  let m = parts[1];
  if (parts.length === 2 && m.endsWith(".jsonl"))
    return {
      projectKey,
      sessionId: m.replace(/\.jsonl$/, ""),
    };
  if (parts.length >= 4) {
    let sliced = parts.slice(2);
    let h = sliced.length - 1;
    sliced[h] = sliced.at(-1).replace(/\.jsonl$/, "");
    return {
      projectKey,
      sessionId: m,
      subpath: sliced.join("/"),
    };
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
    s = jsonParse(stripBom(e.toString("utf8")));
  } catch {
    return e;
  }
  if (!Zt(s)) return e;
  let r = false;
  for (let i of Tr)
    if (Object.hasOwn(s, i)) {
      delete s[i];
      r = true;
    }
  let env = s.env;
  if (Zt(env) && Object.hasOwn(env, "CLAUDE_CONFIG_DIR")) {
    delete env.CLAUDE_CONFIG_DIR;
    r = true;
  }
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
    if (n?.claudeAiOauth?.refreshToken) {
      delete n.claudeAiOauth.refreshToken;
      r = jsonStringify(n);
    }
  } catch {}
  await writeFile(s, r, {
    mode: 384,
  });
}
//@ chunk-y805ph4h.js:67099-67144 placement
function Mr() {
  return Promise.resolve(undefined);
}
//@ chunk-y805ph4h.js:67144-68342 placement
async function Ir(sessionStore, resume, r, env, loadTimeoutMs = 60000, m) {
  if (!validateUuid(resume)) return;
  let l = be(r, env);
  let h = await withTimeout(
    sessionStore.load({
      projectKey: l,
      sessionId: resume,
    }),
    loadTimeoutMs,
    `SessionStore.load() timed out after ${loadTimeoutMs}ms for session ${resume}`,
  );
  if (!h || h.length === 0) return;
  let S = join(tmpdir(), `claude-resume-${randomUUID_2()}`);
  try {
    let y = join(S, "projects", l);
    await mkdir(y, {
      recursive: true,
      mode: 448,
    });
    let w = join(y, `${resume}.jsonl`);
    await writeEntriesToJsonlFile(w, h);
    let CLAUDE_CONFIG_DIR = env?.CLAUDE_CONFIG_DIR ?? process.env.CLAUDE_CONFIG_DIR;
    let R = CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
    let T;
    try {
      T = await readFile(join(R, ".credentials.json"), "utf-8");
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
    if (
      !CLAUDE_CONFIG_DIR &&
      !(env ?? process.env).ANTHROPIC_API_KEY &&
      !(env ?? process.env).CLAUDE_CODE_OAUTH_TOKEN
    )
      T = (await Mr()) ?? T;
    await Pr(T, join(S, ".credentials.json"));
    let E = Vt(getTrimmedEnvValue("CLAUDE_CONFIG_DIR"));
    let P = CLAUDE_CONFIG_DIR || homedir();
    let D = join(P, ".claude.json");
    await de(D, join(S, ".claude.json"), undefined, nt(m, D, E.globalConfig, STORAGE_SPACES.globalConfig()));
    await de(join(R, ".config.json"), join(S, ".config.json"));
    for (let K of OAUTH_GLOBAL_FILE_SUFFIXES)
      if (K) await de(join(P, `.claude${K}.json`), join(S, `.claude${K}.json`));
    let F = join(R, "settings.json");
    await de(F, join(S, "settings.json"), Yt, nt(m, F, E.userSettings, STORAGE_SPACES.userSettings()));
    await de(join(R, "cowork_settings.json"), join(S, "cowork_settings.json"), Yt);
    if (sessionStore.listSubkeys)
      await Dr(
        sessionStore,
        {
          projectKey: l,
          sessionId: resume,
        },
        join(y, resume),
        loadTimeoutMs,
      );
    return S;
  } catch (error) {
    await removeRecursiveWithRetry(S);
    throw error;
  }
}
//@ chunk-y805ph4h.js:68342-69181 placement
async function Dr(e, s, r, n) {
  let i = await withTimeout(
    e.listSubkeys({
      projectKey: s.projectKey,
      sessionId: s.sessionId,
    }),
    n,
    `SessionStore.listSubkeys() timed out after ${n}ms for session ${s.sessionId}`,
  );
  for (let m of i) {
    let l = resolve(r, m + ".jsonl");
    if (!m || isAbsolute(m) || m.split(/[\\/]/).includes("..") || !l.startsWith(r + sep)) {
      logForDebugging(`[SessionStore] skipping unsafe subpath from listSubkeys: ${m}`, {
        level: "warn",
      });
      continue;
    }
    let h = await withTimeout(
      e.load({
        projectKey: s.projectKey,
        sessionId: s.sessionId,
        subpath: m,
      }),
      n,
      `SessionStore.load() timed out after ${n}ms for session ${s.sessionId} subpath ${m}`,
    );
    if (!h || h.length === 0) continue;
    let S = [];
    let y = [];
    for (let w of h)
      if (ot(w)) S.push(w);
      else y.push(w);
    if (y.length > 0) {
      await mkdir(dirname(l), {
        recursive: true,
      });
      await writeEntriesToJsonlFile(l, y);
    }
    if (S.length > 0) {
      let last = S.at(-1);
      let b = resolve(r, m + ".meta.json");
      await mkdir(dirname(b), {
        recursive: true,
      });
      let { type: R, ...T } = last;
      await writeFile(b, jsonStringify(T), {
        mode: 384,
      });
    }
  }
}
//@ chunk-y805ph4h.js:69181-69476 placement
function Or(workspaceTrust) {
  let s =
    workspaceTrust?.accepted === true &&
    (typeof workspaceTrust.directory !== "string" ||
      !(posix.isAbsolute(workspaceTrust.directory) || win32.isAbsolute(workspaceTrust.directory)))
      ? undefined
      : workspaceTrust;
  if (workspaceTrust !== undefined && s === undefined)
    logForDebugging(
      "workspaceTrust ignored: accepted requires an absolute directory, as it exists where Claude Code runs",
      {
        level: "warn",
      },
    );
  return s;
}
//@ chunk-y805ph4h.js:69476-76596 placement
/**
 * Agent SDK 的 query() 入口：解析选项、创建 ProcessTransport 与 Query，返回可异步迭代的消息流。
 */
function query(options, s) {
  let { isSingleUserTurn, resumeConfigDir, deferSpawn, readsStartupMarks } = s;
  let { systemPrompt, settings, managedSettings, settingSources, sandbox, ...b } = options ?? {};
  let R;
  let appendSystemPrompt;
  let excludeDynamicSections;
  let P;
  if (systemPrompt === undefined) R = "";
  else if (typeof systemPrompt === "string") R = systemPrompt;
  else if (Array.isArray(systemPrompt)) R = systemPrompt;
  else if (systemPrompt.type === "custom") {
    R = systemPrompt.prompt;
    P = systemPrompt.snapshot;
  } else if (systemPrompt.type === "preset") {
    appendSystemPrompt = systemPrompt.append;
    excludeDynamicSections = systemPrompt.excludeDynamicSections;
    P = systemPrompt.snapshot;
  }
  process.env.CLAUDE_AGENT_SDK_VERSION = process.env.CLAUDE_AGENT_SDK_VERSION ?? "unknown";
  let {
    abortController = createAbortController(),
    additionalDirectories = [],
    projectConfigRoot,
    agent,
    agents,
    allowedTools = [],
    betas,
    canUseTool,
    continue: re,
    cwd,
    debug,
    debugFile,
    disallowedTools = [],
    tools,
    env,
    executable = alwaysTrue() ? "bun" : "node",
    executableArgs = [],
    extraArgs = {},
    fallbackModel,
    enableFileCheckpointing,
    toolConfig,
    forkSession,
    hooks,
    includeHookEvents,
    includePartialMessages,
    forwardSubagentText,
    verbatimPrompts = false,
    onElicitation,
    onUserDialog,
    supportedDialogKinds,
    perTaskStopAffordance,
    rapidFollowupPreempt,
    workspaceTrust,
    persistSession,
    sessionStore,
    sessionStoreFlush,
    thinking,
    effort,
    maxThinkingTokens,
    maxTurns,
    maxBudgetUsd,
    taskBudget,
    mcpServers,
    model,
    outputFormat,
    permissionMode,
    allowDangerouslySkipPermissions = false,
    permissionPromptToolName,
    permissionPrompts,
    plugins,
    pluginDelivery = "argv",
    getOAuthToken,
    getHostAuthToken,
    workload,
    resume,
    resumeSessionAt,
    resumeDropsTurn,
    sessionId,
    skills,
    stderr,
    strictMcpConfig,
  } = b;
  let St = permissionMode;
  if (sessionStore && persistSession === false)
    throw Error(
      "sessionStore cannot be used with persistSession: false -- the storage adapter requires local writes to mirror from. To avoid keeping a local copy, pass env: { ...process.env, CLAUDE_CONFIG_DIR: dir }, where dir is a new private directory such as fs.mkdtempSync(path.join(os.tmpdir(), 'claude-')), and delete dir when the query ends.",
    );
  $t({
    supportedDialogKinds,
    onUserDialog,
  });
  let workspaceTrust_2 = Or(workspaceTrust);
  if (sessionStore && re && !resume && !sessionStore.listSessions)
    throw Error("Options.continue with sessionStore requires store.listSessions to be implemented");
  if (sessionStore && enableFileCheckpointing)
    throw Error(
      "enableFileCheckpointing is not yet supported with sessionStore (backup blobs are not mirrored, so rewindFiles() fails after a store-backed resume).",
    );
  if (sessionStore && b.spawnClaudeCodeProcess)
    logForDebugging(
      "sessionStore with custom spawnClaudeCodeProcess: ensure the subprocess CLAUDE_CONFIG_DIR matches the parent (same path, same separators) or transcript_mirror frames will be dropped.",
      {
        level: "warn",
      },
    );
  Qt(!!canUseTool, St ?? "default", allowedTools);
  if (pluginDelivery !== "argv" && pluginDelivery !== "initialize")
    throw Error("Invalid pluginDelivery. Expected 'argv' or 'initialize'.");
  let yt = pluginDelivery === "initialize" && plugins !== undefined && plugins.length > 0;
  let pathToClaudeCodeExecutable = b.pathToClaudeCodeExecutable;
  if (!pathToClaudeCodeExecutable) {
    let O = fileURLToPath(import.meta.url);
    let U = createRequire(O);
    let q = Lt((ie) => U.resolve(ie));
    if (!q)
      throw Error(
        "Native CLI binary for linux-x64 not found. Reinstall @anthropic-ai/claude-agent-sdk without --omit=optional, or set options.pathToClaudeCodeExecutable.",
      );
    pathToClaudeCodeExecutable = q;
  }
  let schema = outputFormat?.type === "json_schema" ? outputFormat.schema : undefined;
  let I = env
    ? {
        ...env,
      }
    : {
        ...process.env,
      };
  if (!I.CLAUDE_CODE_ENTRYPOINT) I.CLAUDE_CODE_ENTRYPOINT = "sdk-ts";
  if (!I.CLAUDE_AGENT_SDK_VERSION) I.CLAUDE_AGENT_SDK_VERSION = process.env.CLAUDE_AGENT_SDK_VERSION;
  if (enableFileCheckpointing) I.CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING = "true";
  if (!Object.keys(I).some((key) => key.toUpperCase() === "CLAUDE_CODE_SDK_READS_SESSION_STATE"))
    I.CLAUDE_CODE_SDK_READS_SESSION_STATE = "1";
  if (
    readsStartupMarks &&
    !Object.keys(I).some((key) => key.toUpperCase() === "CLAUDE_CODE_SDK_READS_STARTUP_MARKS")
  )
    I.CLAUDE_CODE_SDK_READS_STARTUP_MARKS = "1";
  let intLoose = parseIntLoose(I.CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS);
  let runEndCeilingMs =
    Number.isFinite(intLoose) && intLoose >= 0 ? intLoose : DEFAULT_PRINT_BG_WAIT_CEILING_MS;
  if (getOAuthToken) I.CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH = "1";
  if (getHostAuthToken) I.CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH = "1";
  if (toolConfig?.askUserQuestion?.previewFormat)
    I.CLAUDE_CODE_QUESTION_PREVIEW_FORMAT = toolConfig.askUserQuestion.previewFormat;
  for (let [O, U] of [
    [toolConfig?.askUserQuestion?.extendedQuestions, "CLAUDE_CODE_QUESTION_EXTENDED"],
    [toolConfig?.askUserQuestion?.optionalDescriptions, "CLAUDE_CODE_QUESTION_OPTIONAL_DESCRIPTIONS"],
    [false, "CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES"],
  ])
    if (O) I[U] = "1";
    else if (!env) {
      for (let key of Object.keys(I)) if (key.toUpperCase() === U) delete I[key];
    }
  let Ve = {};
  Ue.propagation.inject(Ue.context.active(), Ve);
  if ("traceparent" in Ve) {
    for (let O of ["TRACEPARENT", "TRACESTATE"]) if (!(O in (env ?? {}))) delete I[O];
  }
  for (let [key, value] of Object.entries(Ve)) {
    let upper = key.toUpperCase();
    if (!(upper in (env ?? {}))) I[upper] = value;
  }
  let bt = {};
  let _t = new Map();
  if (mcpServers)
    for (let [key, value] of Object.entries(mcpServers))
      if (value.type === "sdk" && value.instance) _t.set(key, value);
      else bt[key] = value;
  let Se;
  if (thinking)
    switch (thinking.type) {
      case "adaptive":
        Se = {
          type: "adaptive",
          display: thinking.display,
        };
        break;
      case "enabled":
        Se = {
          type: "enabled",
          budgetTokens: thinking.budgetTokens,
          display: thinking.display,
        };
        break;
      case "disabled":
        Se = {
          type: "disabled",
        };
        break;
    }
  else if (maxThinkingTokens !== undefined)
    Se =
      maxThinkingTokens === 0
        ? {
            type: "disabled",
          }
        : {
            type: "enabled",
            budgetTokens: maxThinkingTokens,
          };
  if (resumeConfigDir) I.CLAUDE_CONFIG_DIR = resumeConfigDir;
  let transport = new ProcessTransport({
    abortController,
    additionalDirectories,
    projectConfigRoot,
    agent,
    betas,
    cwd,
    debug,
    debugFile,
    executable,
    executableArgs,
    extraArgs: workload
      ? {
          ...extraArgs,
          workload,
        }
      : extraArgs,
    pathToClaudeCodeExecutable,
    env: I,
    forkSession,
    stderr,
    thinkingConfig: Se,
    effort,
    maxTurns,
    maxBudgetUsd,
    taskBudget,
    model,
    fallbackModel,
    jsonSchema: schema,
    permissionMode: St,
    allowDangerouslySkipPermissions,
    permissionPromptToolName,
    permissionPrompts,
    continueConversation: sessionStore ? undefined : re,
    resume,
    resumeSessionAt,
    resumeDropsTurn,
    sessionId,
    settings: typeof settings === "object" ? jsonStringify(settings) : settings,
    managedSettings: managedSettings ? jsonStringify(managedSettings) : undefined,
    settingSources,
    skills,
    allowedTools,
    disallowedTools,
    tools,
    mcpServers: bt,
    strictMcpConfig,
    canUseTool: !!canUseTool,
    hooks: !!hooks,
    includeHookEvents,
    includePartialMessages,
    persistSession,
    sessionMirror: !!sessionStore,
    plugins,
    pluginsViaInitialize: yt,
    sandbox,
    spawnClaudeCodeProcess: b.spawnClaudeCodeProcess,
    onProcessSpawned: options?.onProcessSpawned,
    deferSpawn,
  });
  let initConfig = {
    systemPrompt: R,
    appendSystemPrompt,
    planModeInstructions: b.planModeInstructions,
    systemPromptSnapshot: P,
    appendSubagentSystemPrompt: b.appendSubagentSystemPrompt,
    toolAliases: b.toolAliases,
    codeRunningMcpTools: b.codeRunningMcpTools,
    excludeDynamicSections,
    agents,
    title: b.title,
    skills,
    webSearchIsolationExemptMcpServers: b.webSearchIsolationExemptMcpServers,
    promptSuggestions: b.promptSuggestions,
    agentProgressSummaries: b.agentProgressSummaries,
    forwardSubagentText,
    supportedDialogKinds,
    perTaskStopAffordance,
    rapidFollowupPreempt,
    forwardNestedSubagentToolCalls: options?.forwardNestedSubagentToolCalls,
    workspaceTrust: workspaceTrust_2,
    plugins: yt ? plugins : undefined,
    captureSdkMcpManifests: !isEnvVarTruthy("CLAUDE_AGENT_SDK_DISABLE_MCP_MANIFESTS"),
  };
  let Qe = new Query(
    transport,
    isSingleUserTurn,
    canUseTool,
    hooks,
    abortController,
    _t,
    schema,
    initConfig,
    onElicitation,
    getOAuthToken,
    getHostAuthToken,
    onUserDialog,
    verbatimPrompts,
    runEndCeilingMs,
  );
  if (sessionStore) {
    let O = () => join(I.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), "projects");
    let U = sessionStoreFlush === "eager";
    let q = new TranscriptMirrorBatcher(
      async (ie, Xe) => {
        let ye = it(ie, O());
        if (ye) await sessionStore.append(ye, Xe);
        else
          logForDebugging(
            `[SessionStore] dropping mirror frame: filePath ${ie} is not under ${O()} -- subprocess CLAUDE_CONFIG_DIR likely differs from parent (custom spawnClaudeCodeProcess / container?)`,
            {
              level: "warn",
            },
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
    transport,
    abortController,
    processEnv: I,
    verbatimPrompts,
  };
}
//@ chunk-y805ph4h.js:76596-76871 placement
function ss(queryInstance, s, abortController, verbatimPrompts) {
  if (typeof s === "string")
    queryInstance
      .writeAfterInitialize(
        jsonStringify({
          type: "user",
          session_id: "",
          message: {
            role: "user",
            content: [
              {
                type: "text",
                text: s,
              },
            ],
          },
          parent_tool_use_id: null,
          ...(verbatimPrompts && {
            client_composed: true,
          }),
        }) +
          `
`,
      )
      .catch((error) => abortController.abort(error));
  else queryInstance.streamInput(s).catch((error) => abortController.abort(error));
}
//@ chunk-y805ph4h.js:76871-76935 placement
var Ar = new Set(["EBUSY", "EMFILE", "ENFILE", "ENOTEMPTY", "EPERM"]);
//@ chunk-y805ph4h.js:76935-77083 placement = convertDirectoryToZipInPlace (1)
/**
 * 带重试的递归删除（EBUSY/EPERM 等最多 5 次）。名字配错。
 */
async function removeRecursiveWithRetry(e) {
  for (let i = 0; ; i++)
    try {
      return await rm(e, {
        recursive: true,
        force: true,
      });
    } catch (error) {
      if (i >= 4 || !Ar.has(getErrnoCode(error) ?? "")) return;
      await sleep((i + 1) * 100);
    }
}
//@ chunk-y805ph4h.js:77083-77149 placement
function xr(transport, s) {
  transport
    .waitForExit()
    .catch(() => {})
    .finally(() => removeRecursiveWithRetry(s));
}
//@ chunk-y805ph4h.js:77149-77366 placement
function jr({ prompt, options }) {
  if ((options?.resume || options?.continue) && options?.sessionStore) return Ur(prompt, options);
  let { queryInstance, abortController, verbatimPrompts } = query(options, {
    isSingleUserTurn: typeof prompt === "string",
  });
  ss(queryInstance, prompt, abortController, verbatimPrompts);
  return queryInstance;
}
//@ chunk-y805ph4h.js:77366-78058 placement
function Ur(prompt, options) {
  let { queryInstance, transport, abortController, processEnv, verbatimPrompts } = query(
    {
      ...options,
    },
    {
      isSingleUserTurn: typeof prompt === "string",
      deferSpawn: true,
    },
  );
  let h = resolve(options.cwd ?? ".");
  let sessionStore = options.sessionStore;
  let loadTimeoutMs = options.loadTimeoutMs ?? 60000;
  let resume = options.resume;
  (async () => {
    if (!resume)
      resume = (
        await withTimeout(
          sessionStore.listSessions(be(h, options.env)),
          loadTimeoutMs,
          `SessionStore.listSessions() timed out after ${loadTimeoutMs}ms`,
        )
      )
        .slice()
        .sort((T, E) => E.mtime - T.mtime)[0]?.sessionId;
    if (!resume) return;
    return Ir(sessionStore, resume, h, options.env, options.loadTimeoutMs);
  })()
    .then((R) => {
      if (R) {
        transport.updateResume(resume);
        let T = {
          CLAUDE_CONFIG_DIR: R,
        };
        transport.updateEnv(T);
        processEnv.CLAUDE_CONFIG_DIR = R;
        queryInstance.addCleanupCallback(() => xr(transport, R));
      }
      if (!queryInstance.isClosed()) transport.spawn();
    })
    .catch((error) => {
      let error_2 = toError(error);
      transport.spawnAbort(error_2);
      queryInstance.setError(error_2);
    });
  ss(queryInstance, prompt, abortController, verbatimPrompts);
  return queryInstance;
}
export { sr };
