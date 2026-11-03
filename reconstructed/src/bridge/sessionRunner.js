/**
 * bridge/sessionRunner.ts
 *
 * 并入会话运行器的少量辅助声明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/sessionRunner.ts
 * pieces: chunk-pjm08t7p.js (9)
 * attribution: placement 3, fingerprint 5, file-local 1
 */
import { join, join as join_2, dirname } from "path";
import { createWriteStream } from "fs";
import { rm, rm as rm_2 } from "fs/promises";
import { spawn } from "child_process";
import { createInterface } from "readline";
import { jsonStringify, jsonParse } from "../utils/slowOperations.js";
import { claudeTempDir } from "../utils/tempDir.js";
import { resolveBridgeChildFeatures } from "./bridgeEnabled.js";
import { or } from "../utils/settings/commandSyncNames.js";
import { getInitialSettings_2 } from "../utils/settings/settings.js";
import { withLaunchValuesOfHybridConnection } from "../utils/managedEnvApply.js";
import { wTe, KNOWN_ENV_VARS } from "../utils/knownEnvVars.js";
import { soe, stripInternalEntrypoint } from "../utils/background/envCarry.js";
import { REMOTE_IO_WARNING_PREFIX } from "./deviceAttestation.js";
import { Dr } from "../utils/stringUtils.js";
import { debugTruncate } from "./debugUtils.js";
import { redactSecrets } from "../services/teamMemorySync/secretScanner.js";

/**
 * 为派生的会话生成 --settings JSON：按需带 permissions.defaultMode=auto、autoCompactEnabled 和 autoMode.environment；都没有时返回 undefined。
 */
//@ chunk-pjm08t7p.js:1515-1763 placement
function buildSpawnSettingsJson(options) {
  let e = {
    ...(options.autoOverSettings && { permissions: { defaultMode: "auto" } }),
    ...(options.autoCompact && { autoCompactEnabled: !0 }),
    ...(options.autoModeEnvironment.length > 0 && { autoMode: { environment: options.autoModeEnvironment } }),
  };
  return Object.keys(e).length > 0 ? jsonStringify(e) : void 0;
}
//@ chunk-pjm08t7p.js:1763-1790 placement
var Se = 10,
  Ce = 10,
  ve = 3600000;
//@ chunk-pjm08t7p.js:1790-1846 placement
function safeFilenameId(id) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}
//@ chunk-pjm08t7p.js:1846-2209 fingerprint = TOOL_VERBS (1)
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
  FileReadTool: "Reading",
  FileWriteTool: "Writing",
  FileEditTool: "Editing",
  GlobTool: "Searching",
  GrepTool: "Searching",
  BashTool: "Running",
  NotebookEditTool: "Editing notebook",
  LSP: "LSP",
};
//@ chunk-pjm08t7p.js:2209-2360 fingerprint = toolSummary (1)
function toolSummary(toolName, input, i, r, o) {
  let s = TOOL_VERBS[toolName] ?? toolName,
    l =
      input.file_path ??
      input.filePath ??
      input.pattern ??
      input.command?.slice(0, 60) ??
      input.url ??
      input.query ??
      "";
  if (l) return `${s} ${l}`;
  return s;
}
/**
 * 解析子进程一行 stream-json：assistant 中的 tool_use/text 生成活动，result 生成完成或错误活动。
 */
//@ chunk-pjm08t7p.js:2360-3459 fingerprint = extractActivities (1)
function extractActivities(line, sessionId, debug, r, o) {
  let parsed;
  try {
    parsed = jsonParse(line);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  let l = parsed,
    activities = [],
    now = Date.now();
  switch (l.type) {
    case "assistant": {
      let message = l.message;
      if (!message) break;
      let content = message.content;
      if (!Array.isArray(content)) break;
      for (let block of content) {
        if (!block || typeof block !== "object") continue;
        let h = block;
        if (h.type === "tool_use") {
          let T = h.name ?? "Tool",
            D = h.input ?? {},
            U = toolSummary(T, D, r, activities, o);
          if (U !== void 0) activities.push({ type: "tool_start", summary: U, timestamp: now });
          debug(`[bridge:activity] sessionId=${sessionId} tool_use name=${T} ${inputPreview(D)}`);
        } else if (h.type === "text") {
          let T = h.text ?? "";
          if (T.length > 0)
            (activities.push({ type: "text", summary: T.slice(0, 80), timestamp: now }),
              debug(`[bridge:activity] sessionId=${sessionId} text "${T.slice(0, 100)}"`));
        }
      }
      break;
    }
    case "result": {
      let subtype = l.subtype;
      if (subtype === "success")
        (activities.push({ type: "result", summary: "Session completed", timestamp: now }),
          debug(`[bridge:activity] sessionId=${sessionId} result subtype=success`));
      else if (subtype) {
        let w = l.errors?.[0] ?? `Error: ${subtype}`;
        (activities.push({ type: "error", summary: w, timestamp: now }),
          debug(`[bridge:activity] sessionId=${sessionId} result subtype=${subtype} error="${w}"`));
      } else debug(`[bridge:activity] sessionId=${sessionId} result subtype=undefined`);
      break;
    }
    default:
      break;
  }
  return activities;
}
//@ chunk-pjm08t7p.js:3459-3723 fingerprint = extractUserMessageText (1)
function extractUserMessageText(msg) {
  if (msg.parent_tool_use_id != null || msg.isSynthetic || msg.isReplay) return;
  let content = msg.message?.content,
    text;
  if (typeof content === "string") text = content;
  else if (Array.isArray(content)) {
    for (let block of content)
      if (block && typeof block === "object" && block.type === "text") {
        text = block.text;
        break;
      }
  }
  return ((text = text?.trim()), text ? text : void 0);
}
//@ chunk-pjm08t7p.js:3723-3879 file-local
function inputPreview(input) {
  let parts = [];
  for (let [i, r] of Object.entries(input)) {
    if (typeof r === "string") parts.push(`${i}="${r.slice(0, 100)}"`);
    if (parts.length >= 3) break;
  }
  return parts.join(" ");
}
/**
 * 返回 {spawn}：为会话拼子进程参数（--print --sdk-url --session-id --input/output-format stream-json --replay-user-messages --resume、权限模式、chrome、settings、mcp-config、追加系统提示词、模型参数），
 * 设置环境（CLAUDE_CODE_SESSION_ACCESS_TOKEN、CLAUDE_CODE_ENVIRONMENT_KIND=bridge、CLAUDE_CODE_WORKER_EPOCH、属主账号/组织等，清除宿主凭证变量），
 * 读 stdout 生成活动并捕获首条用户消息，返回句柄（done、kill、forceKill、writeStdin、updateAccessToken 经 stdin 发 update_environment_variables）。
 */
//@ chunk-pjm08t7p.js:3879-10276 fingerprint = createSessionSpawner (0.696)
function createSessionSpawner(deps) {
  return {
    spawn(e, i) {
      let safeId = safeFilenameId(e.sessionId),
        o;
      if (deps.debugFile) {
        let ext = deps.debugFile.lastIndexOf(".");
        if (ext > 0) o = `${deps.debugFile.slice(0, ext)}-${safeId}${deps.debugFile.slice(ext)}`;
        else o = `${deps.debugFile}-${safeId}`;
      } else if (deps.verbose) o = join_2(claudeTempDir(), `bridge-session-${safeId}.log`);
      let s = resolveBridgeChildFeatures({
          roles: e.roles,
          modePinned: deps.permissionMode !== void 0,
          settings: () => (or(), getInitialSettings_2()),
        }),
        {
          autoDefault: autoDefault,
          autoOverSettings: autoOverSettings,
          artifact: artifact,
          machineSettings: machineSettings,
        } = s,
        transcriptStream = null,
        w;
      if (deps.debugFile)
        ((w = join_2(dirname(deps.debugFile), `bridge-transcript-${safeId}.jsonl`)),
          (transcriptStream = createWriteStream(w, { flags: "a" })),
          transcriptStream.on("error", (err) => {
            (deps.onDebug(`[bridge:session] Transcript write error: ${err.message}`),
              (transcriptStream = null));
          }),
          deps.onDebug(`[bridge:session] Transcript log: ${w}`));
      let h = [
          ...deps.scriptArgs,
          "--print",
          "--sdk-url",
          e.sdkUrl,
          "--session-id",
          e.sessionId,
          "--input-format",
          "stream-json",
          "--output-format",
          "stream-json",
          "--replay-user-messages",
          `--resume=${e.sdkUrl}`,
          ...(deps.verbose ? ["--verbose"] : []),
          ...(o ? ["--debug-file", o] : []),
          ...(deps.permissionMode ? ["--permission-mode", deps.permissionMode] : []),
          ...(deps.chrome === void 0 ? [] : [deps.chrome ? "--chrome" : "--no-chrome"]),
        ],
        T = h.length,
        serverConfig = e.serverConfig,
        U = serverConfig?.autoModeEnvironment ?? [],
        x = buildSpawnSettingsJson({
          autoOverSettings: autoOverSettings,
          autoCompact: s.autoCompact,
          autoModeEnvironment: U,
        });
      if (x !== void 0) h.push(`--settings=${x}`);
      let ge = h.length,
        P = serverConfig?.mcpConfig;
      if (P) h.push(`--mcp-config=${P.path}`);
      if (serverConfig?.appendSystemPrompt)
        h.push(`--append-system-prompt-file=${serverConfig.appendSystemPrompt.path}`);
      if (serverConfig) h.push(...serverConfig.extraArgs);
      let W = h.length - ge;
      h.push(...e.modelArgs);
      let K = serverConfig?.dir,
        B = () => {
          let u = K;
          return (
            (K = void 0),
            u ? rm_2(u, { recursive: !0, force: !0 }).catch(() => {}) : Promise.resolve()
          );
        },
        ownerIdentity = deps.ownerIdentity,
        V = {
          CLAUDE_CODE_OAUTH_TOKEN: void 0,
          CLAUDE_CODE_ENVIRONMENT_KIND: "bridge",
          CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT: void 0,
          CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT: void 0,
          CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS: void 0,
          CLAUDE_CODE_BRIDGE_CHILD_PROJECTS_ENTRYPOINT: void 0,
          CLAUDE_CODE_BRIDGE_CHILD_CLI_ENTRYPOINT: void 0,
          CLAUDE_CODE_SESSION_ACCESS_TOKEN: e.accessToken,
          CLAUDE_CODE_BRIDGE_OWNER_ACCOUNT_UUID: ownerIdentity?.accountUuid,
          CLAUDE_CODE_BRIDGE_OWNER_ORG_UUID: ownerIdentity?.organizationUuid,
          CLAUDE_CODE_BRIDGE_SOURCE_DIR: e.sourceDir,
          CLAUDE_CODE_BRIDGE_MCP_CARRIER: serverConfig ? "1" : void 0,
          CLAUDE_CODE_BRIDGE_PROMPT_SHA256: serverConfig?.appendSystemPrompt?.sha256,
          CLAUDE_CODE_WORKER_EPOCH: String(e.workerEpoch),
          CLAUDE_CODE_RESUME_INTERRUPTED_TURN: e.workerEpoch > 1 ? "1" : void 0,
          CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS:
            e.workerEpoch > 1 && e.boundResumedTurn ? String(ve) : void 0,
          CLAUDE_CODE_RESUME_FROM_SESSION: void 0,
          CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR: void 0,
          CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR: void 0,
          CLAUDE_CODE_GATEWAY_TOKEN_FILE_DESCRIPTOR: void 0,
          CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR: void 0,
          CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR: void 0,
          CLAUDE_BG_AUTH_SNAPSHOT_PATH: void 0,
          CLAUDE_CODE_ACCOUNT_UUID: void 0,
          CLAUDE_CODE_ORGANIZATION_UUID: void 0,
          CLAUDE_CODE_USER_EMAIL: void 0,
          CCR_SESSION_ACCOUNT_EMAIL: void 0,
          SESSION_INGRESS_URL: P ? P.ingressUrl : void 0,
          CLAUDE_CODE_EXIT_AFTER_STOP_DELAY: e.idleExitAfterMs > 0 ? String(e.idleExitAfterMs) : void 0,
        },
        R = {
          ...withLaunchValuesOfHybridConnection(deps.env),
          ...Object.fromEntries(wTe.map((u) => [u, void 0])),
          ...Object.fromEntries(KNOWN_ENV_VARS.map((u) => [u, deps.env[u]])),
          ...V,
        },
        J = new Set([...wTe, ...Object.keys(V)]);
      for (let u of Object.keys(R)) if (!J.has(u) && J.has(u.toUpperCase())) delete R[u];
      if ((soe(R), stripInternalEntrypoint(R), autoDefault)) R.CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT = "1";
      if (artifact) R.CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT = "1";
      if (machineSettings) R.CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS = "1";
      if (s.projectsEntrypoint) R.CLAUDE_CODE_BRIDGE_CHILD_PROJECTS_ENTRYPOINT = "1";
      if (s.cliEntrypoint) R.CLAUDE_CODE_BRIDGE_CHILD_CLI_ENTRYPOINT = "1";
      if (
        (deps.onDebug(
          `[bridge:session] Spawning sessionId=${e.sessionId} sdkUrl=${e.sdkUrl} accessToken=${e.accessToken ? "present" : "MISSING"}`,
        ),
        deps.onDebug(
          `[bridge:session] Child args: ${h.slice(0, T).join(" ")}${x !== void 0 ? ` (+settings: auto=${autoOverSettings}, facts=${U.length})` : ""}${W > 0 ? ` (+${W} server-config args, mcpConfig=${P ? "present" : "unset"}, appendPrompt=${serverConfig?.appendSystemPrompt ? "present" : "unset"})` : ""}${e.modelArgs.length > 0 ? ` (+${e.modelArgs.length} model args)` : ""}`,
        ),
        o)
      )
        deps.onDebug(`[bridge:session] Debug log: ${o}`);
      let S;
      try {
        S = spawn(deps.execPath, h, { cwd: i, stdio: ["pipe", "pipe", "pipe"], env: R, windowsHide: !0 });
      } catch (error) {
        throw (B(), error);
      }
      deps.onDebug(`[bridge:session] sessionId=${e.sessionId} pid=${S.pid}`);
      let L = [],
        ue = void 0,
        currentActivity = null,
        N = [],
        q = !1,
        z = !1,
        Z = !1;
      if (S.stderr)
        createInterface({ input: S.stderr }).on("line", (line) => {
          if (line.startsWith(REMOTE_IO_WARNING_PREFIX)) {
            let rl = Dr(line.slice(REMOTE_IO_WARNING_PREFIX.length));
            if (deps.onChildWarning) deps.onChildWarning(e.sessionId, rl);
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
          if (N.length >= Ce) N.shift();
          N.push(line);
        });
      if (S.stdout)
        createInterface({ input: S.stdout }).on("line", (line) => {
          if (transcriptStream)
            transcriptStream.write(
              line +
                `
`,
            );
          if ((deps.onDebug(`[bridge:ws] sessionId=${e.sessionId} <<< ${debugTruncate(line)}`), deps.verbose))
            process.stderr.write(
              line +
                `
`,
            );
          let M = extractActivities(line, e.sessionId, deps.onDebug, L, ue);
          for (let activity of M) {
            if (L.length >= Se) L.shift();
            (L.push(activity),
              (currentActivity = activity),
              deps.onActivity?.(e.sessionId, activity),
              e.onActivity?.(activity));
          }
          if (!Z && e.onFirstUserMessage) {
            let A;
            try {
              A = jsonParse(line);
            } catch {}
            if (A && typeof A === "object") {
              let Q = A;
              if (Q.type === "user") {
                let text = extractUserMessageText(Q);
                if (text) ((Z = !0), e.onFirstUserMessage(text));
              }
            }
          }
        });
      let done = new Promise((resolve) => {
          (S.on("close", (code, signal) => {
            if (transcriptStream) (transcriptStream.end(), (transcriptStream = null));
            let A;
            if (signal === "SIGTERM" || signal === "SIGINT" || (z && code !== 0))
              (deps.onDebug(
                `[bridge:session] sessionId=${e.sessionId} interrupted signal=${signal} exit_code=${code} pid=${S.pid}`,
              ),
                (A = "interrupted"));
            else if (code === 0)
              ((A = e.idleExitAfterMs > 0 ? "idle" : "completed"),
                deps.onDebug(`[bridge:session] sessionId=${e.sessionId} ${A} exit_code=0 pid=${S.pid}`));
            else
              (deps.onDebug(
                `[bridge:session] sessionId=${e.sessionId} failed exit_code=${code} pid=${S.pid}`,
              ),
                (A = "failed"));
            B().then(() => resolve(A));
          }),
            S.on("error", (err) => {
              (deps.onDebug(`[bridge:session] sessionId=${e.sessionId} spawn error: ${err.message}`),
                N.push(`spawn error: ${err.message}`),
                B().then(() => resolve("failed")));
            }));
        }),
        handle = {
          sessionId: e.sessionId,
          done: done,
          activities: L,
          accessToken: e.accessToken,
          lastStderr: N,
          get currentActivity() {
            return currentActivity;
          },
          kill() {
            if (!S.killed)
              ((z = !0),
                deps.onDebug(`[bridge:session] Sending SIGTERM to sessionId=${e.sessionId} pid=${S.pid}`),
                S.kill("SIGTERM"));
          },
          forceKill() {
            if (!q && S.pid)
              ((q = !0),
                deps.onDebug(`[bridge:session] Sending SIGKILL to sessionId=${e.sessionId} pid=${S.pid}`),
                S.kill("SIGKILL"));
          },
          writeStdin(u) {
            if (S.stdin && !S.stdin.destroyed)
              (deps.onDebug(`[bridge:ws] sessionId=${e.sessionId} >>> ${debugTruncate(redactSecrets(u))}`),
                S.stdin.write(u));
          },
          updateAccessToken(u) {
            ((handle.accessToken = u),
              handle.writeStdin(
                jsonStringify({
                  type: "update_environment_variables",
                  variables: { CLAUDE_CODE_SESSION_ACCESS_TOKEN: u },
                }) +
                  `
`,
              ),
              deps.onDebug(`[bridge:session] Sent token refresh via stdin for sessionId=${e.sessionId}`));
          },
        };
      return handle;
    },
  };
}

export { safeFilenameId, createSessionSpawner };
