/**
 * skills/bundled/debug.ts
 *
 * 并入已有模块：内置 debug 技能
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/debug.ts
 * pieces: chunk-hantmvxa.js (6)
 * attribution: affinity 1, fingerprint 1, placement 4
 */
import { registerBundledSkill } from "../bundledSkills.js";
import {
  enableDebugLogging,
  getDebugLogPath,
  flushDebugLogs,
  isDefaultDebugLogPath,
} from "../../utils/debug.js";
import { getSessionId } from "../../bootstrap/state.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { getSettingsFilePathForSource } from "../../utils/settings/settings.js";
import { CLAUDE_CODE_GUIDE } from "../../constants/prompts.js";
import { Fye } from "../../services/daemon/paths.js";
import { daemonLockPath, daemonLockStateKey } from "../../utils/daemon/daemonLock.js";
import { daemonStatusPath, daemonStatusKey } from "../../daemon/daemonStatus.js";
import { Q6 } from "../../utils/sandbox/userNamespace.js";
import { getJobsDir } from "../../services/daemon/jobState.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { tailFile } from "../../utils/fsOperations.js";
import { isENOENT, errorMessage } from "../../utils/errors.js";
import { formatFileSize } from "../../utils/format.js";

//@ chunk-hantmvxa.js:102064-102091 affinity
var DEBUG_TAIL_LINES = 20,
  xo = 65536,
  Io = 8192;
/**
 * 注册 /debug 内置 skill：打开本会话调试日志，读取最近的 debug 日志与设置信息拼成诊断提示词；只能用户调用（disableModelInvocation）。
 */
//@ chunk-hantmvxa.js:102091-103906 fingerprint = registerDebugSkill (0.766)
function registerDebugSkill() {
  registerBundledSkill({
    name: "debug",
    menuDescription: "Turn on debug logging and investigate problems",
    description: "Enable debug logging for this session and help diagnose issues",
    allowedTools: ["Read", "Grep", "Glob"],
    argumentHint: "[issue description]",
    disableModelInvocation: !0,
    userInvocable: !0,
    async getPromptForCommand(e, n) {
      let wasAlreadyLogging = enableDebugLogging(),
        debugLogPath = getDebugLogPath();
      await flushDebugLogs();
      let h = getSessionId(),
        [y, w] = await Promise.all([
          readLogTailSection(
            debugLogPath,
            n.storageV5 && isDefaultDebugLogPath(debugLogPath, h)
              ? { backend: n.storageV5, key: STORAGE_SPACES.log(h, "debug") }
              : void 0,
          ),
          buildDaemonDebugSection(n.storageV5),
        ]);
      return [
        {
          type: "text",
          text: `# Debug Skill

Help the user debug an issue they're encountering in this current Claude Code session.
${
  wasAlreadyLogging
    ? ""
    : `
## Debug Logging Just Enabled

Debug logging was OFF for this session until now. Nothing prior to this /debug invocation was captured.

Tell the user that debug logging is now active at \`${debugLogPath}\`, ask them to reproduce the issue, then re-read the log. If they can't reproduce, they can also restart with \`claude --debug\` to capture logs from startup.
`
}
## Session Debug Log

The debug log for the current session is at: \`${debugLogPath}\`

${y}

For additional context, grep for [ERROR] and [WARN] lines across the full file.

${w}

## Issue Description

${e || "The user did not describe a specific issue. Read the debug log and summarize any errors, warnings, or notable issues."}

## Settings

Remember that settings are in:
* user - ${getSettingsFilePathForSource("userSettings")}
* project - ${getSettingsFilePathForSource("projectSettings")}
* local - ${getSettingsFilePathForSource("localSettings")}

## Instructions

1. Review the user's issue description
2. The last ${DEBUG_TAIL_LINES} lines show the debug file format. Look for [ERROR] and [WARN] entries, stack traces, and failure patterns across the file
3. Consider launching the ${CLAUDE_CODE_GUIDE} subagent to understand the relevant Claude Code features
4. Explain what you found in plain language
5. Suggest concrete fixes or next steps
`,
        },
      ];
    },
  });
}
/**
 * 为内置 debug 技能生成 "## Daemon" 段：读取后台守护进程的 lock、status 文件与日志尾部；都不存在时说明守护进程未运行并给出日志路径。
 */
//@ chunk-hantmvxa.js:103906-104808 placement
async function buildDaemonDebugSection(backend) {
  let n = Fye(),
    [s, r, h] = await Promise.all([
      readDaemonStateFile(daemonLockPath(), backend && { backend: backend, key: daemonLockStateKey() }),
      readDaemonStateFile(daemonStatusPath(), backend && { backend: backend, key: daemonStatusKey() }),
      readLogTailSection(n, backend && { backend: backend, key: STORAGE_SPACES.state("daemon-log") }),
    ]);
  if (s === null && r === null)
    return `## Daemon

No daemon lock or status file found \u2014 the background daemon does not appear to be running. If the issue involves background sessions or \`claude agents\`, the daemon log (if any) is at \`${n}\`.`;
  return `## Daemon

The background daemon manages \`& <prompt>\` jobs and \`claude agents\`. If the issue involves background sessions, look here.

### daemon.lock
\`\`\`json
${s ?? "(missing)"}
\`\`\`

### daemon.status.json
\`\`\`json
${r ?? "(missing)"}
\`\`\`

### Daemon log (\`${n}\`)
${h}

Other daemon state on disk (Read if relevant \u2014 roster contains user prompts and env vars):
- \`${Q6()}\` \u2014 live worker roster
- \`${getJobsDir()}/<short>/state.json\` \u2014 per-job state`;
}
/**
 * 读取调试日志末尾若干行（经存储后端或本地文件），失败时返回说明文字。
 */
//@ chunk-hantmvxa.js:104808-105223 placement
async function readLogTailSection(e, n) {
  if (n) {
    let read = await n.backend.read([{ key: n.key, tail: xo }]);
    if (!read.ok) return `Failed to read last ${DEBUG_TAIL_LINES} lines: ${formatStorageError(read.error)}`;
    let r = read.value.items[0];
    if (!r.found) return "No log file exists yet.";
    return formatLogTail({ content: Buffer.from(r.value).toString("utf8"), bytesTotal: r.totalBytes });
  }
  try {
    return formatLogTail(await tailFile(e, xo));
  } catch (error) {
    return isENOENT(error)
      ? "No log file exists yet."
      : `Failed to read last ${DEBUG_TAIL_LINES} lines: ${errorMessage(error)}`;
  }
}
//@ chunk-hantmvxa.js:105223-105370 placement
function formatLogTail({ content: content, bytesTotal: bytesTotal }) {
  let joined = content
    .split(
      `
`,
    )
    .slice(-DEBUG_TAIL_LINES).join(`
`);
  return `Log size: ${formatFileSize(bytesTotal)}

### Last ${DEBUG_TAIL_LINES} lines

\`\`\`
${joined}
\`\`\``;
}
/**
 * 读取守护进程状态文件内容，失败时返回错误说明，不存在时返回 null。
 */
//@ chunk-hantmvxa.js:105370-105673 placement
async function readDaemonStateFile(e, n) {
  if (n) {
    let read = await n.backend.read([{ key: n.key, tail: Io }]);
    if (!read.ok) return `(read error: ${formatStorageError(read.error)})`;
    let r = read.value.items[0];
    if (!r.found) return null;
    return Buffer.from(r.value).toString("utf8");
  }
  try {
    return (await tailFile(e, Io)).content;
  } catch (error) {
    return isENOENT(error) ? null : `(read error: ${errorMessage(error)})`;
  }
}

export { registerDebugSkill };
