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
import { __toESM } from "../../../runtime/bun-runtime.js";
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
import { assertDialogKindsHandled, resolveNativeCliPath, ProcessTransport } from "./transport.js";
import { DEFAULT_PRINT_BG_WAIT_CEILING_MS } from "../../../src/tasks/LocalShellTask/backgroundNotices.js";
import { Query } from "./query.js";
import {
  TranscriptMirrorBatcher,
  DEFAULT_MAX_PENDING_ENTRIES,
  DEFAULT_MAX_PENDING_BYTES,
} from "./transcriptMirror.js";

//@ chunk-y805ph4h.js:63137-63633 placement
function extractSessionIdFromIngressToken(workSecret) {
  try {
    let payload = jsonParse(Buffer.from(workSecret, "base64url").toString("utf8"));
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("session_ingress_token" in payload) ||
      typeof payload.session_ingress_token !== "string"
    )
      return;
    let sessionIngressToken = payload.session_ingress_token;
    let parts = (
      sessionIngressToken.startsWith("sk-ant-si-") ? sessionIngressToken.slice(10) : sessionIngressToken
    ).split(".");
    if (parts.length !== 3 || !parts[1]) return;
    let claims = jsonParse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof claims === "object" &&
      claims !== null &&
      "session_id" in claims &&
      typeof claims.session_id === "string" &&
      claims.session_id
      ? claims.session_id
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-y805ph4h.js:63633-63651 placement
var import_api = __toESM(require_api(), 1);
//@ chunk-y805ph4h.js:63651-63679 placement
var DEFAULT_SESSION_LOAD_TIMEOUT_MS = 60000;
var CREDENTIALS_RESUME_TTL_MS = TOOL_HOOK_EXECUTION_TIMEOUT_MS;
var RESUME_TIMEOUT_MS = DEFAULT_SESSION_LOAD_TIMEOUT_MS + CREDENTIALS_RESUME_TTL_MS;
//@ chunk-y805ph4h.js:63818-63936 placement
function configPathsForDir(trimmedEnvValue) {
  return {
    globalConfig: join(trimmedEnvValue || homedir(), ".claude.json"),
    userSettings: join(trimmedEnvValue || join(homedir(), ".claude"), "settings.json"),
  };
}
//@ chunk-y805ph4h.js:63936-64007 placement
function pickSessionStoreTarget(backend, expectedKind, actualKind, key) {
  return backend !== undefined && expectedKind === actualKind
    ? {
        backend,
        key,
      }
    : undefined;
}
//@ chunk-y805ph4h.js:64007-64255 placement
async function restoreFileFromStore(sourcePath, targetPath, transform, v5Target) {
  if (v5Target) return restoreFileFromV5Store(v5Target, sourcePath, targetPath, transform);
  try {
    if (transform)
      await writeFile(targetPath, transform(await readFile(sourcePath)), {
        mode: 384,
      });
    else await copyFile(sourcePath, targetPath);
  } catch (error) {
    if (getErrnoCode(error) === undefined) throw error;
    if (!isENOENT(error)) {
      await rm(targetPath, {
        force: true,
      }).catch(() => {});
      logForDebugging(`sessionStore resume: skipping ${sourcePath} (${getErrnoCode(error)})`);
    }
  }
}
//@ chunk-y805ph4h.js:64255-64868 placement
async function restoreFileFromV5Store({ backend, key }, targetPath, sourcePath, transform) {
  let readResult = await backend.read([key]);
  if (!readResult.ok) {
    if (readResult.error.code === "InvalidArgument")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `sessionStore resume: invalid v5 key for ${targetPath}: ${readResult.error.argument}${readResult.error.reason ? ` (${readResult.error.reason})` : ""}`,
        "sessionStore resume: invalid v5 key (InvalidArgument from backend read)",
      );
    logForDebugging(`sessionStore resume: skipping ${targetPath} (${readResult.error.code})`);
    return;
  }
  let item = readResult.value.items[0];
  if (!item?.found) return;
  let buffer = Buffer.from(item.value);
  try {
    await writeFile(sourcePath, transform ? transform(buffer) : buffer, {
      mode: 384,
    });
  } catch (error) {
    if (getErrnoCode(error) === undefined) throw error;
    if (!isENOENT(error)) {
      await rm(sourcePath, {
        force: true,
      }).catch(() => {});
      logForDebugging(`sessionStore resume: skipping ${targetPath} (${getErrnoCode(error)})`);
    }
  }
}
//@ chunk-y805ph4h.js:64868-65572 placement
function canUseToolShadowWarning(permissionMode, allowedTools) {
  if (permissionMode === "bypassPermissions")
    return "canUseTool will not be invoked: permissionMode 'bypassPermissions' auto-approves every tool call (except explicit deny rules) before the callback is consulted. To gate every tool call, use a PreToolUse hook instead.";
  let filtered = allowedTools.filter((toolName) => toolName.length > 0 && !toolName.includes("("));
  if (filtered.length === 0) return;
  return `canUseTool will not be invoked for: ${filtered.join(", ")}. Bare allowedTools entries auto-approve the whole tool before the callback is consulted. To gate every tool call, use a PreToolUse hook; or remove the bare names from allowedTools so they fall through to canUseTool. Allow rules from settings files can also shadow the callback but are not visible here.`;
}
//@ chunk-y805ph4h.js:65572-65704 placement
function warnIfCanUseToolShadowed(canUseTool, permissionMode, allowedTools) {
  if (!canUseTool) return;
  let warning = canUseToolShadowWarning(permissionMode, allowedTools);
  if (warning === undefined) return;
  process.emitWarning(warning, {
    code: "CLAUDE_SDK_CAN_USE_TOOL_SHADOWED",
  });
}
//@ chunk-y805ph4h.js:65813-65882 placement
function canonicalProjectDir(cwd) {
  let resolved = resolve(cwd ?? ".");
  let realPath;
  try {
    realPath = realpathSync(resolved);
  } catch {
    realPath = resolved;
  }
  return identity(realPath);
}
//@ chunk-y805ph4h.js:65882-66016 placement
function projectKeyForCwd(cwd, env) {
  let dir = canonicalProjectDir(cwd);
  if (env === undefined) return getProjectKey(dir);
  return (
    (env.CLAUDE_CONFIG_DIR ? validateProjectDirName(env.CLAUDE_CODE_PROJECT_DIR_NAME) : undefined) ??
    sanitizePath(dir)
  );
}
//@ chunk-y805ph4h.js:66016-66107 placement
function isAgentMetadataFrame(frame) {
  return typeof frame === "object" && frame !== null && "type" in frame && frame.type === "agent_metadata";
}
//@ chunk-y805ph4h.js:66107-66473 placement
function parseMirrorPath(filePath, projectsRoot) {
  let relative_2 = relative(projectsRoot, filePath);
  let parts = relative_2.split(sep);
  if (parts[0] === ".." || isAbsolute(relative_2)) return null;
  if (parts.length < 2) return null;
  let projectKey = parts[0];
  let fileName = parts[1];
  if (parts.length === 2 && fileName.endsWith(".jsonl"))
    return {
      projectKey,
      sessionId: fileName.replace(/\.jsonl$/, ""),
    };
  if (parts.length >= 4) {
    let sliced = parts.slice(2);
    let lastIndex = sliced.length - 1;
    sliced[lastIndex] = sliced.at(-1).replace(/\.jsonl$/, "");
    return {
      projectKey,
      sessionId: fileName,
      subpath: sliced.join("/"),
    };
  }
  return null;
}
//@ chunk-y805ph4h.js:66473-66524 placement
process.env.NoDefaultCurrentDirectoryInExePath = "1";
//@ chunk-y805ph4h.js:66524-66600 placement
var STRIPPED_SETTINGS_KEYS = ["enabledPlugins", "extraKnownMarketplaces", "additionalMarketplaces"];
//@ chunk-y805ph4h.js:66600-66859 placement
function stripSettingsBeforeMirror(buffer) {
  let parsed;
  try {
    parsed = jsonParse(stripBom(buffer.toString("utf8")));
  } catch {
    return buffer;
  }
  if (!isPlainRecord(parsed)) return buffer;
  let changed = false;
  for (let key of STRIPPED_SETTINGS_KEYS)
    if (Object.hasOwn(parsed, key)) {
      delete parsed[key];
      changed = true;
    }
  let env = parsed.env;
  if (isPlainRecord(env) && Object.hasOwn(env, "CLAUDE_CONFIG_DIR")) {
    delete env.CLAUDE_CONFIG_DIR;
    changed = true;
  }
  return changed ? jsonStringify(parsed) : buffer;
}
//@ chunk-y805ph4h.js:66859-66930 placement
function isPlainRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
//@ chunk-y805ph4h.js:66930-67099 placement
async function stripOAuthRefreshToken(content, targetPath) {
  if (!content) return;
  let sanitized = content;
  try {
    let parsed = jsonParse(content);
    if (parsed?.claudeAiOauth?.refreshToken) {
      delete parsed.claudeAiOauth.refreshToken;
      sanitized = jsonStringify(parsed);
    }
  } catch {}
  await writeFile(targetPath, sanitized, {
    mode: 384,
  });
}
//@ chunk-y805ph4h.js:67099-67144 placement
function emptyCredentialsProvider() {
  return Promise.resolve(undefined);
}
//@ chunk-y805ph4h.js:67144-68342 placement
async function restoreSessionFromStore(store, resume, env, env_2, timeoutMs = 60000, transformCredentials) {
  if (!validateUuid(resume)) return;
  let projectKey = projectKeyForCwd(env, env_2);
  let entries = await withTimeout(
    store.load({
      projectKey,
      sessionId: resume,
    }),
    timeoutMs,
    `SessionStore.load() timed out after ${timeoutMs}ms for session ${resume}`,
  );
  if (!entries || entries.length === 0) return;
  let tempRoot = join(tmpdir(), `claude-resume-${randomUUID_2()}`);
  try {
    let projectsDir = join(tempRoot, "projects", projectKey);
    await mkdir(projectsDir, {
      recursive: true,
      mode: 448,
    });
    let sessionFile = join(projectsDir, `${resume}.jsonl`);
    await writeEntriesToJsonlFile(sessionFile, entries);
    let CLAUDE_CONFIG_DIR = env_2?.CLAUDE_CONFIG_DIR ?? process.env.CLAUDE_CONFIG_DIR;
    let configDir = CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
    let credentialsJson;
    try {
      credentialsJson = await readFile(join(configDir, ".credentials.json"), "utf-8");
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
    if (
      !CLAUDE_CONFIG_DIR &&
      !(env_2 ?? process.env).ANTHROPIC_API_KEY &&
      !(env_2 ?? process.env).CLAUDE_CODE_OAUTH_TOKEN
    )
      credentialsJson = (await emptyCredentialsProvider()) ?? credentialsJson;
    await stripOAuthRefreshToken(credentialsJson, join(tempRoot, ".credentials.json"));
    let configPaths = configPathsForDir(getTrimmedEnvValue("CLAUDE_CONFIG_DIR"));
    let homeDir = CLAUDE_CONFIG_DIR || homedir();
    let globalConfigPath = join(homeDir, ".claude.json");
    await restoreFileFromStore(
      globalConfigPath,
      join(tempRoot, ".claude.json"),
      undefined,
      pickSessionStoreTarget(
        transformCredentials,
        globalConfigPath,
        configPaths.globalConfig,
        STORAGE_SPACES.globalConfig(),
      ),
    );
    await restoreFileFromStore(join(configDir, ".config.json"), join(tempRoot, ".config.json"));
    for (let suffix of OAUTH_GLOBAL_FILE_SUFFIXES)
      if (suffix)
        await restoreFileFromStore(
          join(homeDir, `.claude${suffix}.json`),
          join(tempRoot, `.claude${suffix}.json`),
        );
    let settingsPath = join(configDir, "settings.json");
    await restoreFileFromStore(
      settingsPath,
      join(tempRoot, "settings.json"),
      stripSettingsBeforeMirror,
      pickSessionStoreTarget(
        transformCredentials,
        settingsPath,
        configPaths.userSettings,
        STORAGE_SPACES.userSettings(),
      ),
    );
    await restoreFileFromStore(
      join(configDir, "cowork_settings.json"),
      join(tempRoot, "cowork_settings.json"),
      stripSettingsBeforeMirror,
    );
    if (store.listSubkeys)
      await restoreSessionSubkeys(
        store,
        {
          projectKey,
          sessionId: resume,
        },
        join(projectsDir, resume),
        timeoutMs,
      );
    return tempRoot;
  } catch (error) {
    await removeRecursiveWithRetry(tempRoot);
    throw error;
  }
}
//@ chunk-y805ph4h.js:68342-69181 placement
async function restoreSessionSubkeys(store, target, projectsRoot, timeoutMs) {
  let subkeys = await withTimeout(
    store.listSubkeys({
      projectKey: target.projectKey,
      sessionId: target.sessionId,
    }),
    timeoutMs,
    `SessionStore.listSubkeys() timed out after ${timeoutMs}ms for session ${target.sessionId}`,
  );
  for (let subkey of subkeys) {
    let subkeyFile = resolve(projectsRoot, subkey + ".jsonl");
    if (
      !subkey ||
      isAbsolute(subkey) ||
      subkey.split(/[\\/]/).includes("..") ||
      !subkeyFile.startsWith(projectsRoot + sep)
    ) {
      logForDebugging(`[SessionStore] skipping unsafe subpath from listSubkeys: ${subkey}`, {
        level: "warn",
      });
      continue;
    }
    let entries = await withTimeout(
      store.load({
        projectKey: target.projectKey,
        sessionId: target.sessionId,
        subpath: subkey,
      }),
      timeoutMs,
      `SessionStore.load() timed out after ${timeoutMs}ms for session ${target.sessionId} subpath ${subkey}`,
    );
    if (!entries || entries.length === 0) continue;
    let metaEntries = [];
    let sessionEntries = [];
    for (let entry of entries)
      if (isAgentMetadataFrame(entry)) metaEntries.push(entry);
      else sessionEntries.push(entry);
    if (sessionEntries.length > 0) {
      await mkdir(dirname(subkeyFile), {
        recursive: true,
      });
      await writeEntriesToJsonlFile(subkeyFile, sessionEntries);
    }
    if (metaEntries.length > 0) {
      let last = metaEntries.at(-1);
      let metaPath = resolve(projectsRoot, subkey + ".meta.json");
      await mkdir(dirname(metaPath), {
        recursive: true,
      });
      let { type, ...rest } = last;
      await writeFile(metaPath, jsonStringify(rest), {
        mode: 384,
      });
    }
  }
}
//@ chunk-y805ph4h.js:69181-69476 placement
function sanitizeWorkspaceTrust(workspaceTrust) {
  let sanitized =
    workspaceTrust?.accepted === true &&
    (typeof workspaceTrust.directory !== "string" ||
      !(posix.isAbsolute(workspaceTrust.directory) || win32.isAbsolute(workspaceTrust.directory)))
      ? undefined
      : workspaceTrust;
  if (workspaceTrust !== undefined && sanitized === undefined)
    logForDebugging(
      "workspaceTrust ignored: accepted requires an absolute directory, as it exists where Claude Code runs",
      {
        level: "warn",
      },
    );
  return sanitized;
}
//@ chunk-y805ph4h.js:69476-76596 placement
/**
 * Agent SDK 的 query() 入口：解析选项、创建 ProcessTransport 与 Query，返回可异步迭代的消息流。
 */
function query(options, options_2) {
  let { isSingleUserTurn, resumeConfigDir, deferSpawn, readsStartupMarks } = options_2;
  let { systemPrompt, settings, managedSettings, settingSources, sandbox, ...options_3 } = options ?? {};
  let systemPrompt_2;
  let appendSystemPrompt;
  let excludeDynamicSections;
  let appendSystemPrompt_2;
  if (systemPrompt === undefined) systemPrompt_2 = "";
  else if (typeof systemPrompt === "string") systemPrompt_2 = systemPrompt;
  else if (Array.isArray(systemPrompt)) systemPrompt_2 = systemPrompt;
  else if (systemPrompt.type === "custom") {
    systemPrompt_2 = systemPrompt.prompt;
    appendSystemPrompt_2 = systemPrompt.snapshot;
  } else if (systemPrompt.type === "preset") {
    appendSystemPrompt = systemPrompt.append;
    excludeDynamicSections = systemPrompt.excludeDynamicSections;
    appendSystemPrompt_2 = systemPrompt.snapshot;
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
    continue: continueConversation,
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
  } = options_3;
  let sessionStoreKind = permissionMode;
  if (sessionStore && persistSession === false)
    throw Error(
      "sessionStore cannot be used with persistSession: false -- the storage adapter requires local writes to mirror from. To avoid keeping a local copy, pass env: { ...process.env, CLAUDE_CONFIG_DIR: dir }, where dir is a new private directory such as fs.mkdtempSync(path.join(os.tmpdir(), 'claude-')), and delete dir when the query ends.",
    );
  assertDialogKindsHandled({
    supportedDialogKinds,
    onUserDialog,
  });
  let workspaceTrust_2 = sanitizeWorkspaceTrust(workspaceTrust);
  if (sessionStore && continueConversation && !resume && !sessionStore.listSessions)
    throw Error("Options.continue with sessionStore requires store.listSessions to be implemented");
  if (sessionStore && enableFileCheckpointing)
    throw Error(
      "enableFileCheckpointing is not yet supported with sessionStore (backup blobs are not mirrored, so rewindFiles() fails after a store-backed resume).",
    );
  if (sessionStore && options_3.spawnClaudeCodeProcess)
    logForDebugging(
      "sessionStore with custom spawnClaudeCodeProcess: ensure the subprocess CLAUDE_CONFIG_DIR matches the parent (same path, same separators) or transcript_mirror frames will be dropped.",
      {
        level: "warn",
      },
    );
  warnIfCanUseToolShadowed(!!canUseTool, sessionStoreKind ?? "default", allowedTools);
  if (pluginDelivery !== "argv" && pluginDelivery !== "initialize")
    throw Error("Invalid pluginDelivery. Expected 'argv' or 'initialize'.");
  let awaitInitializePlugins = pluginDelivery === "initialize" && plugins !== undefined && plugins.length > 0;
  let pathToClaudeCodeExecutable = options_3.pathToClaudeCodeExecutable;
  if (!pathToClaudeCodeExecutable) {
    let moduleDir = fileURLToPath(import.meta.url);
    let packageDir = createRequire(moduleDir);
    let nativePath = resolveNativeCliPath((specifier) => packageDir.resolve(specifier));
    if (!nativePath)
      throw Error(
        "Native CLI binary for linux-x64 not found. Reinstall @anthropic-ai/claude-agent-sdk without --omit=optional, or set options.pathToClaudeCodeExecutable.",
      );
    pathToClaudeCodeExecutable = nativePath;
  }
  let schema = outputFormat?.type === "json_schema" ? outputFormat.schema : undefined;
  let env_2 = env
    ? {
        ...env,
      }
    : {
        ...process.env,
      };
  if (!env_2.CLAUDE_CODE_ENTRYPOINT) env_2.CLAUDE_CODE_ENTRYPOINT = "sdk-ts";
  if (!env_2.CLAUDE_AGENT_SDK_VERSION) env_2.CLAUDE_AGENT_SDK_VERSION = process.env.CLAUDE_AGENT_SDK_VERSION;
  if (enableFileCheckpointing) env_2.CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING = "true";
  if (!Object.keys(env_2).some((key) => key.toUpperCase() === "CLAUDE_CODE_SDK_READS_SESSION_STATE"))
    env_2.CLAUDE_CODE_SDK_READS_SESSION_STATE = "1";
  if (
    readsStartupMarks &&
    !Object.keys(env_2).some((key) => key.toUpperCase() === "CLAUDE_CODE_SDK_READS_STARTUP_MARKS")
  )
    env_2.CLAUDE_CODE_SDK_READS_STARTUP_MARKS = "1";
  let intLoose = parseIntLoose(env_2.CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS);
  let runEndCeilingMs =
    Number.isFinite(intLoose) && intLoose >= 0 ? intLoose : DEFAULT_PRINT_BG_WAIT_CEILING_MS;
  if (getOAuthToken) env_2.CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH = "1";
  if (getHostAuthToken) env_2.CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH = "1";
  if (toolConfig?.askUserQuestion?.previewFormat)
    env_2.CLAUDE_CODE_QUESTION_PREVIEW_FORMAT = toolConfig.askUserQuestion.previewFormat;
  for (let [flag, envName] of [
    [toolConfig?.askUserQuestion?.extendedQuestions, "CLAUDE_CODE_QUESTION_EXTENDED"],
    [toolConfig?.askUserQuestion?.optionalDescriptions, "CLAUDE_CODE_QUESTION_OPTIONAL_DESCRIPTIONS"],
    [false, "CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES"],
  ])
    if (flag) env_2[envName] = "1";
    else if (!env) {
      for (let key of Object.keys(env_2)) if (key.toUpperCase() === envName) delete env_2[key];
    }
  let traceHeaders = {};
  import_api.propagation.inject(import_api.context.active(), traceHeaders);
  if ("traceparent" in traceHeaders) {
    for (let headerName of ["TRACEPARENT", "TRACESTATE"])
      if (!(headerName in (env ?? {}))) delete env_2[headerName];
  }
  for (let [key, value] of Object.entries(traceHeaders)) {
    let upper = key.toUpperCase();
    if (!(upper in (env ?? {}))) env_2[upper] = value;
  }
  let fileServers = {};
  let sdkMcpServers = new Map();
  if (mcpServers)
    for (let [key, value] of Object.entries(mcpServers))
      if (value.type === "sdk" && value.instance) sdkMcpServers.set(key, value);
      else fileServers[key] = value;
  let dialogConfig;
  if (thinking)
    switch (thinking.type) {
      case "adaptive":
        dialogConfig = {
          type: "adaptive",
          display: thinking.display,
        };
        break;
      case "enabled":
        dialogConfig = {
          type: "enabled",
          budgetTokens: thinking.budgetTokens,
          display: thinking.display,
        };
        break;
      case "disabled":
        dialogConfig = {
          type: "disabled",
        };
        break;
    }
  else if (maxThinkingTokens !== undefined)
    dialogConfig =
      maxThinkingTokens === 0
        ? {
            type: "disabled",
          }
        : {
            type: "enabled",
            budgetTokens: maxThinkingTokens,
          };
  if (resumeConfigDir) env_2.CLAUDE_CONFIG_DIR = resumeConfigDir;
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
    env: env_2,
    forkSession,
    stderr,
    thinkingConfig: dialogConfig,
    effort,
    maxTurns,
    maxBudgetUsd,
    taskBudget,
    model,
    fallbackModel,
    jsonSchema: schema,
    permissionMode: sessionStoreKind,
    allowDangerouslySkipPermissions,
    permissionPromptToolName,
    permissionPrompts,
    continueConversation: sessionStore ? undefined : continueConversation,
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
    mcpServers: fileServers,
    strictMcpConfig,
    canUseTool: !!canUseTool,
    hooks: !!hooks,
    includeHookEvents,
    includePartialMessages,
    persistSession,
    sessionMirror: !!sessionStore,
    plugins,
    pluginsViaInitialize: awaitInitializePlugins,
    sandbox,
    spawnClaudeCodeProcess: options_3.spawnClaudeCodeProcess,
    onProcessSpawned: options?.onProcessSpawned,
    deferSpawn,
  });
  let initConfig = {
    systemPrompt: systemPrompt_2,
    appendSystemPrompt,
    planModeInstructions: options_3.planModeInstructions,
    systemPromptSnapshot: appendSystemPrompt_2,
    appendSubagentSystemPrompt: options_3.appendSubagentSystemPrompt,
    toolAliases: options_3.toolAliases,
    codeRunningMcpTools: options_3.codeRunningMcpTools,
    excludeDynamicSections,
    agents,
    title: options_3.title,
    skills,
    webSearchIsolationExemptMcpServers: options_3.webSearchIsolationExemptMcpServers,
    promptSuggestions: options_3.promptSuggestions,
    agentProgressSummaries: options_3.agentProgressSummaries,
    forwardSubagentText,
    supportedDialogKinds,
    perTaskStopAffordance,
    rapidFollowupPreempt,
    forwardNestedSubagentToolCalls: options?.forwardNestedSubagentToolCalls,
    workspaceTrust: workspaceTrust_2,
    plugins: awaitInitializePlugins ? plugins : undefined,
    captureSdkMcpManifests: !isEnvVarTruthy("CLAUDE_AGENT_SDK_DISABLE_MCP_MANIFESTS"),
  };
  let query = new Query(
    transport,
    isSingleUserTurn,
    canUseTool,
    hooks,
    abortController,
    sdkMcpServers,
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
    let projectsDirFn = () => join(env_2.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), "projects");
    let eagerMirror = sessionStoreFlush === "eager";
    let mirrorBatcher = new TranscriptMirrorBatcher(
      async (filePath, entries) => {
        let target = parseMirrorPath(filePath, projectsDirFn());
        if (target) await sessionStore.append(target, entries);
        else
          logForDebugging(
            `[SessionStore] dropping mirror frame: filePath ${filePath} is not under ${projectsDirFn()} -- subprocess CLAUDE_CONFIG_DIR likely differs from parent (custom spawnClaudeCodeProcess / container?)`,
            {
              level: "warn",
            },
          );
      },
      {
        onError: (filePath, error) => {
          let target = parseMirrorPath(filePath, projectsDirFn());
          if (target) query.reportMirrorError(target, error.message);
        },
        maxPendingEntries: eagerMirror ? 0 : DEFAULT_MAX_PENDING_ENTRIES,
        maxPendingBytes: eagerMirror ? 0 : DEFAULT_MAX_PENDING_BYTES,
      },
    );
    query.setTranscriptMirrorBatcher(mirrorBatcher);
  }
  return {
    queryInstance: query,
    transport,
    abortController,
    processEnv: env_2,
    verbatimPrompts,
  };
}
//@ chunk-y805ph4h.js:76596-76871 placement
function writeInitialPrompt(queryInstance, prompt, abortController, verbatimPrompts) {
  if (typeof prompt === "string")
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
                text: prompt,
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
  else queryInstance.streamInput(prompt).catch((error) => abortController.abort(error));
}
//@ chunk-y805ph4h.js:76871-76935 placement
var RETRYABLE_RM_ERRORS = new Set(["EBUSY", "EMFILE", "ENFILE", "ENOTEMPTY", "EPERM"]);
//@ chunk-y805ph4h.js:76935-77083 placement = convertDirectoryToZipInPlace (1)
/**
 * 带重试的递归删除（EBUSY/EPERM 等最多 5 次）。名字配错。
 */
async function removeRecursiveWithRetry(dirPath) {
  for (let i = 0; ; i++)
    try {
      return await rm(dirPath, {
        recursive: true,
        force: true,
      });
    } catch (error) {
      if (i >= 4 || !RETRYABLE_RM_ERRORS.has(getErrnoCode(error) ?? "")) return;
      await sleep((i + 1) * 100);
    }
}
//@ chunk-y805ph4h.js:77083-77149 placement
function cleanupTempDirAfterExit(transport, tempDir) {
  transport
    .waitForExit()
    .catch(() => {})
    .finally(() => removeRecursiveWithRetry(tempDir));
}
//@ chunk-y805ph4h.js:77149-77366 placement
function startQuery({ prompt, options }) {
  if ((options?.resume || options?.continue) && options?.sessionStore)
    return startResumedQuery(prompt, options);
  let { queryInstance, abortController, verbatimPrompts } = query(options, {
    isSingleUserTurn: typeof prompt === "string",
  });
  writeInitialPrompt(queryInstance, prompt, abortController, verbatimPrompts);
  return queryInstance;
}
//@ chunk-y805ph4h.js:77366-78058 placement
function startResumedQuery(prompt, options) {
  let { queryInstance, transport, abortController, processEnv, verbatimPrompts } = query(
    {
      ...options,
    },
    {
      isSingleUserTurn: typeof prompt === "string",
      deferSpawn: true,
    },
  );
  let projectKey = resolve(options.cwd ?? ".");
  let sessionStore = options.sessionStore;
  let loadTimeoutMs = options.loadTimeoutMs ?? 60000;
  let resume = options.resume;
  (async () => {
    if (!resume)
      resume = (
        await withTimeout(
          sessionStore.listSessions(projectKeyForCwd(projectKey, options.env)),
          loadTimeoutMs,
          `SessionStore.listSessions() timed out after ${loadTimeoutMs}ms`,
        )
      )
        .slice()
        .sort((left, right) => right.mtime - left.mtime)[0]?.sessionId;
    if (!resume) return;
    return restoreSessionFromStore(sessionStore, resume, projectKey, options.env, options.loadTimeoutMs);
  })()
    .then((resumeDir) => {
      if (resumeDir) {
        transport.updateResume(resume);
        let envPatch = {
          CLAUDE_CONFIG_DIR: resumeDir,
        };
        transport.updateEnv(envPatch);
        processEnv.CLAUDE_CONFIG_DIR = resumeDir;
        queryInstance.addCleanupCallback(() => cleanupTempDirAfterExit(transport, resumeDir));
      }
      if (!queryInstance.isClosed()) transport.spawn();
    })
    .catch((error) => {
      let error_2 = toError(error);
      transport.spawnAbort(error_2);
      queryInstance.setError(error_2);
    });
  writeInitialPrompt(queryInstance, prompt, abortController, verbatimPrompts);
  return queryInstance;
}
export { extractSessionIdFromIngressToken, startQuery };
