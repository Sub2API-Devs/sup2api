/**
 * bridge/sessionRunner.ts
 *
 * 并入会话运行器的少量辅助声明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/sessionRunner.ts
 * pieces: chunk-jx5trqed.js (9)
 * attribution: placement 3, fingerprint 5, file-local 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname } from "path";
import { createWriteStream } from "fs";
import { rm, stat } from "fs/promises";
import { spawn } from "child_process";
import { createInterface } from "readline";
import { jsonStringify, jsonParse } from "../utils/slowOperations.js";
import { claudeTempDir } from "../utils/tempDir.js";
import { resolveBridgeChildFeatures } from "./bridgeEnabled.js";
import { invalidateCommandNames } from "../utils/settings/commandSyncNames.js";
import { getInitialSettings } from "../utils/settings/settings.js";
import { withLaunchValuesOfHybridConnection } from "../utils/managedEnvApply.js";
import { KNOWN_HOST_ENV_VARS, KNOWN_ENV_VARS } from "../utils/knownEnvVars.js";
import { stripCoworkHostEnvKeys, stripInternalEntrypoint } from "../utils/background/envCarry.js";
import { REMOTE_IO_WARNING_PREFIX } from "./deviceAttestation.js";
import { collapseWhitespace } from "../utils/stringUtils.js";
import { debugTruncate } from "./debugUtils.js";
import { isENOENT, isPathAbsent } from "../utils/errors.js";
import { withDeadline } from "../utils/sleep.js";
import { redactSecrets } from "../services/teamMemorySync/secretScanner.js";

//@ chunk-jx5trqed.js:1601-1849 placement
/**
 * 为派生的会话生成 --settings JSON：按需带 permissions.defaultMode=auto、autoCompactEnabled 和 autoMode.environment；都没有时返回 undefined。
 */
function buildSpawnSettingsJson(options) {
  let settings = {
    ...(options.autoOverSettings && {
      permissions: {
        defaultMode: "auto",
      },
    }),
    ...(options.autoCompact && {
      autoCompactEnabled: true,
    }),
    ...(options.autoModeEnvironment.length > 0 && {
      autoMode: {
        environment: options.autoModeEnvironment,
      },
    }),
  };
  return Object.keys(settings).length > 0 ? jsonStringify(settings) : undefined;
}
//@ chunk-jx5trqed.js:1849-1884 placement
var MAX_RECENT_WORKER_STATUSES = 10;
var MAX_RECENT_PENDING_ASKS = 10;
var RECENT_STATUS_TTL_MS = 1000;
var BOUND_RESUMED_TURN_EPOCH_TAG = 3600000;
//@ chunk-jx5trqed.js:1884-1940 placement
function safeFilenameId(id) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}
//@ chunk-jx5trqed.js:1940-2136 fingerprint (2.1.88 match: TOOL_VERBS, 0.962)
var TOOL_VERBS = {
  Read: "Reading",
  Write: "Writing",
  Edit: "Editing",
  MultiEdit: "Editing",
  Bash: "Running",
  Glob: "Searching",
  Grep: "Searching",
  WebFetch: "Fetching",
  WebSearch: "Searching",
  Task: "Running task",
  LSP: "LSP",
};
//@ chunk-jx5trqed.js:2136-2287 fingerprint (2.1.88 match: toolSummary, 1)
function toolSummary(toolName, input, unused, activities, unusedOther) {
  let verb = TOOL_VERBS[toolName] ?? toolName;
  let target =
    input.file_path ??
    input.filePath ??
    input.pattern ??
    input.command?.slice(0, 60) ??
    input.url ??
    input.query ??
    "";
  if (target) return `${verb} ${target}`;
  return verb;
}
//@ chunk-jx5trqed.js:2287-3386 fingerprint (2.1.88 match: extractActivities, 1)
/**
 * 解析子进程一行 stream-json：assistant 中的 tool_use/text 生成活动，result 生成完成或错误活动。
 */
function extractActivities(line, sessionId, debug, unused, unused_2) {
  let parsed;
  try {
    parsed = jsonParse(line);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  let msg = parsed;
  let activities = [];
  let now = Date.now();
  switch (msg.type) {
    case "assistant": {
      let message = msg.message;
      if (!message) break;
      let content = message.content;
      if (!Array.isArray(content)) break;
      for (let block of content) {
        if (!block || typeof block !== "object") continue;
        let contentBlock = block;
        if (contentBlock.type === "tool_use") {
          let name = contentBlock.name ?? "Tool";
          let input = contentBlock.input ?? {};
          let summary = toolSummary(name, input, unused, activities, unused_2);
          if (summary !== undefined)
            activities.push({
              type: "tool_start",
              summary,
              timestamp: now,
            });
          debug(`[bridge:activity] sessionId=${sessionId} tool_use name=${name} ${inputPreview(input)}`);
        } else if (contentBlock.type === "text") {
          let text = contentBlock.text ?? "";
          if (text.length > 0) {
            activities.push({
              type: "text",
              summary: text.slice(0, 80),
              timestamp: now,
            });
            debug(`[bridge:activity] sessionId=${sessionId} text "${text.slice(0, 100)}"`);
          }
        }
      }
      break;
    }
    case "result": {
      let subtype = msg.subtype;
      if (subtype === "success") {
        activities.push({
          type: "result",
          summary: "Session completed",
          timestamp: now,
        });
        debug(`[bridge:activity] sessionId=${sessionId} result subtype=success`);
      } else if (subtype) {
        let errorText = msg.errors?.[0] ?? `Error: ${subtype}`;
        activities.push({
          type: "error",
          summary: errorText,
          timestamp: now,
        });
        debug(`[bridge:activity] sessionId=${sessionId} result subtype=${subtype} error="${errorText}"`);
      } else debug(`[bridge:activity] sessionId=${sessionId} result subtype=undefined`);
      break;
    }
    default:
      break;
  }
  return activities;
}
//@ chunk-jx5trqed.js:3386-3650 fingerprint (2.1.88 match: extractUserMessageText, 1)
function extractUserMessageText(msg) {
  if (msg.parent_tool_use_id != null || msg.isSynthetic || msg.isReplay) return;
  let content = msg.message?.content;
  let text;
  if (typeof content === "string") text = content;
  else if (Array.isArray(content)) {
    for (let block of content)
      if (block && typeof block === "object" && block.type === "text") {
        text = block.text;
        break;
      }
  }
  text = text?.trim();
  return text ? text : undefined;
}
//@ chunk-jx5trqed.js:3650-3806 file-local
function inputPreview(input) {
  let parts = [];
  for (let [key, val] of Object.entries(input)) {
    if (typeof val === "string") parts.push(`${key}="${val.slice(0, 100)}"`);
    if (parts.length >= 3) break;
  }
  return parts.join(" ");
}
//@ chunk-jx5trqed.js:3806-10448 fingerprint (2.1.88 match: createSessionSpawner, 0.684)
/**
 * 返回 {spawn}：为会话拼子进程参数（--print --sdk-url --session-id --input/output-format stream-json --replay-user-messages --resume、权限模式、chrome、settings、mcp-config、追加系统提示词、模型参数），
 * 设置环境（CLAUDE_CODE_SESSION_ACCESS_TOKEN、CLAUDE_CODE_ENVIRONMENT_KIND=bridge、CLAUDE_CODE_WORKER_EPOCH、属主账号/组织等，清除宿主凭证变量），
 * 读 stdout 生成活动并捕获首条用户消息，返回句柄（done、kill、forceKill、writeStdin、updateAccessToken 经 stdin 发 update_environment_variables）。
 */
function createSessionSpawner(deps) {
  return {
    chooseStandIn: deps.chooseStandIn,
    spawn(opts, cwd) {
      let safeId = safeFilenameId(opts.sessionId);
      let debugFile;
      if (deps.debugFile) {
        let ext = deps.debugFile.lastIndexOf(".");
        if (ext > 0) debugFile = `${deps.debugFile.slice(0, ext)}-${safeId}${deps.debugFile.slice(ext)}`;
        else debugFile = `${deps.debugFile}-${safeId}`;
      } else if (deps.verbose) debugFile = join(claudeTempDir(), `bridge-session-${safeId}.log`);
      let bridgeChildFeatures = resolveBridgeChildFeatures({
        roles: opts.roles,
        modePinned: deps.permissionMode !== undefined,
        settings: () => {
          invalidateCommandNames();
          return getInitialSettings();
        },
      });
      let { autoDefault, autoOverSettings, artifact, machineSettings } = bridgeChildFeatures;
      let transcriptStream = null;
      let transcriptPath;
      if (deps.debugFile) {
        transcriptPath = join(dirname(deps.debugFile), `bridge-transcript-${safeId}.jsonl`);
        transcriptStream = createWriteStream(transcriptPath, {
          flags: "a",
        });
        transcriptStream.on("error", (err) => {
          deps.onDebug(`[bridge:session] Transcript write error: ${err.message}`);
          transcriptStream = null;
        });
        deps.onDebug(`[bridge:session] Transcript log: ${transcriptPath}`);
      }
      let childArgs = [
        ...(opts.standIn?.prefixArgs ?? deps.scriptArgs),
        "--print",
        "--sdk-url",
        opts.sdkUrl,
        "--session-id",
        opts.sessionId,
        "--input-format",
        "stream-json",
        "--output-format",
        "stream-json",
        "--replay-user-messages",
        `--resume=${opts.sdkUrl}`,
        ...(deps.verbose ? ["--verbose"] : []),
        ...(debugFile ? ["--debug-file", debugFile] : []),
        ...(deps.permissionMode ? ["--permission-mode", deps.permissionMode] : []),
        ...(deps.chrome === undefined ? [] : [deps.chrome ? "--chrome" : "--no-chrome"]),
      ];
      let baseArgCount = childArgs.length;
      let serverConfig = opts.serverConfig;
      let autoModeEnvironment = serverConfig?.autoModeEnvironment ?? [];
      let spawnSettingsJson = buildSpawnSettingsJson({
        autoOverSettings,
        autoCompact: bridgeChildFeatures.autoCompact,
        autoModeEnvironment,
      });
      if (spawnSettingsJson !== undefined) childArgs.push(`--settings=${spawnSettingsJson}`);
      let serverConfigStart = childArgs.length;
      let mcpConfig = serverConfig?.mcpConfig;
      if (mcpConfig) childArgs.push(`--mcp-config=${mcpConfig.path}`);
      if (serverConfig?.appendSystemPrompt)
        childArgs.push(`--append-system-prompt-file=${serverConfig.appendSystemPrompt.path}`);
      if (serverConfig) childArgs.push(...serverConfig.extraArgs);
      let serverConfigArgCount = childArgs.length - serverConfigStart;
      childArgs.push(...opts.modelArgs);
      let dir = serverConfig?.dir;
      let cleanupDir = () => {
        let pendingDir = dir;
        dir = undefined;
        return pendingDir
          ? rm(pendingDir, {
              recursive: true,
              force: true,
            }).catch(() => {})
          : Promise.resolve();
      };
      let ownerIdentity = deps.ownerIdentity;
      let childEnvOverrides = {
        CLAUDE_CODE_OAUTH_TOKEN: undefined,
        CLAUDE_CODE_ENVIRONMENT_KIND: "bridge",
        CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT: undefined,
        CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT: undefined,
        CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS: undefined,
        CLAUDE_CODE_BRIDGE_CHILD_PROJECTS_ENTRYPOINT: undefined,
        CLAUDE_CODE_BRIDGE_CHILD_CLI_ENTRYPOINT: undefined,
        CLAUDE_CODE_SESSION_ACCESS_TOKEN: opts.accessToken,
        CLAUDE_CODE_BRIDGE_OWNER_ACCOUNT_UUID: ownerIdentity?.accountUuid,
        CLAUDE_CODE_BRIDGE_OWNER_ORG_UUID: ownerIdentity?.organizationUuid,
        CLAUDE_CODE_BRIDGE_SOURCE_DIR: opts.sourceDir,
        CLAUDE_CODE_BRIDGE_MCP_CARRIER: serverConfig ? "1" : undefined,
        CLAUDE_CODE_BRIDGE_PROMPT_SHA256: serverConfig?.appendSystemPrompt?.sha256,
        CLAUDE_CODE_WORKER_EPOCH: String(opts.workerEpoch),
        CLAUDE_CODE_RESUME_INTERRUPTED_TURN: opts.workerEpoch > 1 ? "1" : undefined,
        CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS:
          opts.workerEpoch > 1 && opts.boundResumedTurn ? String(BOUND_RESUMED_TURN_EPOCH_TAG) : undefined,
        CLAUDE_CODE_RESUME_FROM_SESSION: undefined,
        CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR: undefined,
        CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR: undefined,
        CLAUDE_CODE_GATEWAY_TOKEN_FILE_DESCRIPTOR: undefined,
        CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR: undefined,
        CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR: undefined,
        CLAUDE_BG_AUTH_SNAPSHOT_PATH: undefined,
        CLAUDE_CODE_ACCOUNT_UUID: undefined,
        CLAUDE_CODE_ORGANIZATION_UUID: undefined,
        CLAUDE_CODE_USER_EMAIL: undefined,
        CCR_SESSION_ACCOUNT_EMAIL: undefined,
        SESSION_INGRESS_URL: mcpConfig ? mcpConfig.ingressUrl : undefined,
        CLAUDE_CODE_EXIT_AFTER_STOP_DELAY:
          opts.idleExitAfterMs > 0 ? String(opts.idleExitAfterMs) : undefined,
      };
      let childEnv = {
        ...withLaunchValuesOfHybridConnection(deps.env),
        ...Object.fromEntries(KNOWN_HOST_ENV_VARS.map((key) => [key, undefined])),
        ...Object.fromEntries(KNOWN_ENV_VARS.map((key) => [key, deps.env[key]])),
        ...childEnvOverrides,
      };
      let managedKeys = new Set([...KNOWN_HOST_ENV_VARS, ...Object.keys(childEnvOverrides)]);
      for (let key of Object.keys(childEnv))
        if (!managedKeys.has(key) && managedKeys.has(key.toUpperCase())) delete childEnv[key];
      stripCoworkHostEnvKeys(childEnv);
      stripInternalEntrypoint(childEnv);
      if (autoDefault) childEnv.CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT = "1";
      if (artifact) childEnv.CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT = "1";
      if (machineSettings) childEnv.CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS = "1";
      if (bridgeChildFeatures.projectsEntrypoint) childEnv.CLAUDE_CODE_BRIDGE_CHILD_PROJECTS_ENTRYPOINT = "1";
      if (bridgeChildFeatures.cliEntrypoint) childEnv.CLAUDE_CODE_BRIDGE_CHILD_CLI_ENTRYPOINT = "1";
      deps.onDebug(
        `[bridge:session] Spawning sessionId=${opts.sessionId} sdkUrl=${opts.sdkUrl} accessToken=${opts.accessToken ? "present" : "MISSING"}`,
      );
      deps.onDebug(
        `[bridge:session] Child args: ${childArgs.slice(0, baseArgCount).join(" ")}${spawnSettingsJson !== undefined ? ` (+settings: auto=${autoOverSettings}, facts=${autoModeEnvironment.length})` : ""}${serverConfigArgCount > 0 ? ` (+${serverConfigArgCount} server-config args, mcpConfig=${mcpConfig ? "present" : "unset"}, appendPrompt=${serverConfig?.appendSystemPrompt ? "present" : "unset"})` : ""}${opts.modelArgs.length > 0 ? ` (+${opts.modelArgs.length} model args)` : ""}`,
      );
      if (debugFile) deps.onDebug(`[bridge:session] Debug log: ${debugFile}`);
      let child;
      try {
        child = spawn(opts.standIn?.cmd ?? deps.execPath, childArgs, {
          cwd,
          stdio: ["pipe", "pipe", "pipe"],
          env: childEnv,
          windowsHide: true,
        });
      } catch (error) {
        cleanupDir();
        throw error;
      }
      deps.onDebug(`[bridge:session] sessionId=${opts.sessionId} pid=${child.pid}`);
      let activities = [];
      let unused = undefined;
      let currentActivity = null;
      let lastStderr = [];
      let exitCode;
      let seenStdinEnd = false;
      let isTerminating = false;
      let firstUserMessageSeen = false;
      if (child.stderr)
        createInterface({
          input: child.stderr,
        }).on("line", (line) => {
          if (line.startsWith(REMOTE_IO_WARNING_PREFIX)) {
            let rl = collapseWhitespace(line.slice(REMOTE_IO_WARNING_PREFIX.length));
            if (deps.onChildWarning) deps.onChildWarning(opts.sessionId, rl);
            else
              process.stderr.write(
                REMOTE_IO_WARNING_PREFIX +
                  rl +
                  `
`,
              );
            return;
          }
          if (deps.verbose)
            process.stderr.write(
              line +
                `
`,
            );
          if (lastStderr.length >= MAX_RECENT_PENDING_ASKS) lastStderr.shift();
          lastStderr.push(line);
        });
      if (child.stdout)
        createInterface({
          input: child.stdout,
        }).on("line", (line) => {
          if (transcriptStream)
            transcriptStream.write(
              line +
                `
`,
            );
          deps.onDebug(`[bridge:ws] sessionId=${opts.sessionId} <<< ${debugTruncate(line)}`);
          if (deps.verbose)
            process.stderr.write(
              line +
                `
`,
            );
          let extracted = extractActivities(line, opts.sessionId, deps.onDebug, activities, unused);
          for (let activity of extracted) {
            if (activities.length >= MAX_RECENT_WORKER_STATUSES) activities.shift();
            activities.push(activity);
            currentActivity = activity;
            deps.onActivity?.(opts.sessionId, activity);
            opts.onActivity?.(activity);
          }
          if (!firstUserMessageSeen && opts.onFirstUserMessage) {
            let parsed;
            try {
              parsed = jsonParse(line);
            } catch {}
            if (parsed && typeof parsed === "object") {
              let msg = parsed;
              if (msg.type === "user") {
                let text = extractUserMessageText(msg);
                if (text) {
                  firstUserMessageSeen = true;
                  opts.onFirstUserMessage(text);
                }
              }
            }
          }
        });
      let done = new Promise((resolve) => {
        child.on("close", (code, signal) => {
          if (transcriptStream) {
            transcriptStream.end();
            transcriptStream = null;
          }
          let outcome;
          if (signal === "SIGTERM" || signal === "SIGINT" || (isTerminating && code !== 0)) {
            deps.onDebug(
              `[bridge:session] sessionId=${opts.sessionId} interrupted signal=${signal} exit_code=${code} pid=${child.pid}`,
            );
            outcome = "interrupted";
          } else if (code === 0) {
            outcome = opts.idleExitAfterMs > 0 ? "idle" : "completed";
            deps.onDebug(
              `[bridge:session] sessionId=${opts.sessionId} ${outcome} exit_code=0 pid=${child.pid}`,
            );
          } else {
            deps.onDebug(
              `[bridge:session] sessionId=${opts.sessionId} failed exit_code=${code} pid=${child.pid}`,
            );
            outcome = "failed";
          }
          Promise.all([exitCode, cleanupDir()]).then(() => resolve(outcome));
        });
        child.on("error", (err) => {
          deps.onDebug(`[bridge:session] sessionId=${opts.sessionId} spawn error: ${err.message}`);
          let a = isENOENT(err)
            ? withDeadline(
                stat(cwd).then((b) => !b.isDirectory(), isPathAbsent),
                RECENT_STATUS_TTL_MS,
              )
            : undefined;
          exitCode = Promise.resolve(a).then((c) => {
            lastStderr.push(c ? `working folder not found: '${cwd}'` : `spawn error: ${err.message}`);
          });
          Promise.all([exitCode, cleanupDir()]).then(() => resolve("failed"));
        });
      });
      let handle = {
        sessionId: opts.sessionId,
        done,
        activities,
        accessToken: opts.accessToken,
        lastStderr,
        get currentActivity() {
          return currentActivity;
        },
        kill() {
          if (!child.killed) {
            isTerminating = true;
            deps.onDebug(`[bridge:session] Sending SIGTERM to sessionId=${opts.sessionId} pid=${child.pid}`);
            child.kill("SIGTERM");
          }
        },
        forceKill() {
          if (!seenStdinEnd && child.pid) {
            seenStdinEnd = true;
            deps.onDebug(`[bridge:session] Sending SIGKILL to sessionId=${opts.sessionId} pid=${child.pid}`);
            child.kill("SIGKILL");
          }
        },
        writeStdin(data) {
          if (child.stdin && !child.stdin.destroyed) {
            deps.onDebug(`[bridge:ws] sessionId=${opts.sessionId} >>> ${debugTruncate(redactSecrets(data))}`);
            child.stdin.write(data);
          }
        },
        updateAccessToken(token) {
          handle.accessToken = token;
          handle.writeStdin(
            jsonStringify({
              type: "update_environment_variables",
              variables: {
                CLAUDE_CODE_SESSION_ACCESS_TOKEN: token,
              },
            }) +
              `
`,
          );
          deps.onDebug(`[bridge:session] Sent token refresh via stdin for sessionId=${opts.sessionId}`);
        },
      };
      return handle;
    },
  };
}
export { safeFilenameId, createSessionSpawner };
