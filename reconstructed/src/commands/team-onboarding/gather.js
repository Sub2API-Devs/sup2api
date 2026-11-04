/**
 * commands/team-onboarding/gather.ts
 *
 * 2.1.316 新增：/team-onboarding 收集本机会话记录中的工具与 MCP 使用情况
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 6
 */
import { readdir, stat, readFile } from "fs/promises";
import { extname, join, basename } from "path";
import { isFsInaccessible, isENOENT } from "../../utils/errors.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { getProjectDir } from "../../utils/sessionStoragePortable.js";
import { execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import { normalizeGitRemoteUrl } from "../../utils/git.js";

//@ chunk-e6aww6q8.js:1737819-1738199 placement = METADATA_TYPE_MARKERS (0.44)
/**
 * MAX_FIRST_MESSAGE_CHARS：首条消息截断长度（200）；MAX_SESSION_DESCRIPTORS：会话描述条数上限（60）；COMMAND_NAME_RE：transcript 里的斜杠命令名（同一声明共 13 个绑定）。
 */
var MAX_METADATA_SCAN_BYTES = 52428800;
var MAX_FIRST_MESSAGE_CHARS = 200;
var MAX_SESSION_DESCRIPTORS = 60;
var COMMAND_NAME_RE = /<command-name>\/([\w:-]+)<\/command-name>/g;
var MCP_TOOL_USE_NAME_RE = /"name":"mcp__([^"]+?)__([^"]+)"/g;
var COMMAND_NAME_CONTENT_MARKER = '"content":"<command-name>/';
var COMMAND_MESSAGE_CONTENT_MARKER = '"content":"<command-message>';
var TOOL_USE_TYPE_MARKER = '"type":"tool_use"';
var CUSTOM_TITLE_TYPE_MARKER = '"type":"custom-title"';
var PR_LINK_TYPE_MARKER = '"type":"pr-link"';
var USER_ROLE_MARKER = '"role":"user"';
var CUSTOM_TITLE_RE = /"customTitle":"([^"]+)"/;
var PR_NUMBER_RE = /"prNumber":(\d+)/;
var USER_CONTENT_RE = /"role":"user"[^}]*"content":"([^"]+)"/;
//@ chunk-e6aww6q8.js:1738199-1739826 placement
/**
 * scanSessionUsage：扫描会话 JSONL：斜杠命令次数、MCP 调用次数、会话描述。
 */
async function scanSessionUsage(projectDir, windowDays) {
  let summary = {
    slashCommandCounts: new Map(),
    mcpServerCounts: new Map(),
    sessionDescriptors: [],
    sessionFileCount: 0,
  };
  let cutoffTime = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  let entries;
  try {
    entries = await readdir(projectDir);
  } catch (error) {
    if (isFsInaccessible(error)) return summary;
    throw error;
  }
  let filtered = entries.filter((entryName) => extname(entryName) === ".jsonl");
  let filtered_2 = (
    await Promise.all(
      filtered.map(async (entryName) => {
        let filePath = join(projectDir, entryName);
        try {
          let fileStats = await stat(filePath);
          if (
            !fileStats.isFile() ||
            fileStats.mtimeMs < cutoffTime ||
            fileStats.size > MAX_METADATA_SCAN_BYTES
          )
            return null;
          return filePath;
        } catch (error) {
          if (isFsInaccessible(error)) return null;
          throw error;
        }
      }),
    )
  ).filter((filePath) => filePath !== null);
  for (let filePath of filtered_2) {
    let fileText;
    try {
      fileText = await readFile(filePath, "utf-8");
    } catch (error) {
      if (isFsInaccessible(error)) continue;
      throw error;
    }
    summary.sessionFileCount++;
    let descriptor = {
      prNumbers: [],
    };
    for (let line of fileText.split(`
`)) {
      if (line.length < 10) continue;
      if (line.includes(COMMAND_NAME_CONTENT_MARKER) || line.includes(COMMAND_MESSAGE_CONTENT_MARKER))
        for (let match of line.matchAll(COMMAND_NAME_RE)) {
          let commandName = match[1];
          summary.slashCommandCounts.set(commandName, (summary.slashCommandCounts.get(commandName) ?? 0) + 1);
        }
      if (line.includes(TOOL_USE_TYPE_MARKER) && line.includes('"name":"mcp__'))
        for (let match of line.matchAll(MCP_TOOL_USE_NAME_RE)) {
          let serverName = match[1];
          summary.mcpServerCounts.set(serverName, (summary.mcpServerCounts.get(serverName) ?? 0) + 1);
        }
      if (line.includes(CUSTOM_TITLE_TYPE_MARKER)) {
        let match = CUSTOM_TITLE_RE.exec(line);
        if (match) descriptor.title = match[1];
      }
      if (line.includes(PR_LINK_TYPE_MARKER)) {
        let match = PR_NUMBER_RE.exec(line);
        if (match) {
          let prNumber = Number(match[1]);
          if (!descriptor.prNumbers.includes(prNumber)) descriptor.prNumbers.push(prNumber);
        }
      }
      if (
        !descriptor.firstMessage &&
        line.includes(USER_ROLE_MARKER) &&
        !line.includes(COMMAND_NAME_CONTENT_MARKER) &&
        !line.includes('"content":[')
      ) {
        let match = USER_CONTENT_RE.exec(line);
        if (match) {
          let replaced = match[1].replace(/\\n/g, " ").replace(/\\"/g, '"');
          if (replaced.length > 3 && !replaced.startsWith("<"))
            descriptor.firstMessage = replaced.slice(0, MAX_FIRST_MESSAGE_CHARS);
        }
      }
    }
    if (descriptor.title || descriptor.prNumbers.length > 0 || descriptor.firstMessage)
      summary.sessionDescriptors.push(descriptor);
  }
  if (summary.sessionDescriptors.length > MAX_SESSION_DESCRIPTORS) {
    summary.sessionDescriptors.sort((descriptorA, descriptorB) => {
      let scoreA = (descriptorA.title ? 2 : 0) + (descriptorA.prNumbers.length > 0 ? 1 : 0);
      return (descriptorB.title ? 2 : 0) + (descriptorB.prNumbers.length > 0 ? 1 : 0) - scoreA;
    });
    summary.sessionDescriptors = summary.sessionDescriptors.slice(0, MAX_SESSION_DESCRIPTORS);
  }
  return summary;
}
//@ chunk-e6aww6q8.js:1739826-1739837 placement
/**
 * TEAM_ONBOARDING_DEFAULT_WINDOW_DAYS：30。
 */
var TEAM_ONBOARDING_DEFAULT_WINDOW_DAYS = 30;
//@ chunk-e6aww6q8.js:1739837-1739896 placement
function urlOriginOrUndefined(url) {
  try {
    return new URL(url).origin;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:1739896-1740216 placement
/**
 * readProjectMcpServers：读 .mcp.json 的 mcpServers。
 */
async function readProjectMcpServers(originalCwd) {
  try {
    let file = await readFile(join(originalCwd, ".mcp.json"), "utf8");
    let config = jsonParse(file);
    if (
      config &&
      typeof config === "object" &&
      "mcpServers" in config &&
      config.mcpServers &&
      typeof config.mcpServers === "object"
    )
      return config.mcpServers;
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(
        `team-onboarding: failed to read .mcp.json: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "error",
        },
      );
  }
  return {};
}
//@ chunk-e6aww6q8.js:1740216-1741001 placement
/**
 * collectTeamOnboardingUsage：组装 /team-onboarding 的 usageData。
 */
async function collectTeamOnboardingUsage(windowDays) {
  let originalCwd = getOriginalCwd();
  let projectDir = getProjectDir(originalCwd);
  let scanResult = await scanSessionUsage(projectDir, windowDays);
  let slashCommands = [...scanResult.slashCommandCounts.entries()]
    .sort((entryA, entryB) => entryB[1] - entryA[1])
    .map(([commandName, count]) => ({
      name: `/${commandName}`,
      count,
    }));
  let projectMcpServers = await readProjectMcpServers(originalCwd);
  let mcpServers = [...scanResult.mcpServerCounts.entries()]
    .sort((entryA, entryB) => entryB[1] - entryA[1])
    .map(([serverName, callCount]) => {
      let serverConfig = projectMcpServers[serverName];
      return {
        name: serverName,
        callCount,
        urlOrigin: typeof serverConfig?.url === "string" ? urlOriginOrUndefined(serverConfig.url) : undefined,
      };
    });
  let trimmed = (
    await execFileNoThrowWithCwd("git", ["config", "user.name"], {
      cwd: originalCwd,
    })
  ).stdout.trim();
  let trimmed_2 = (
    await execFileNoThrowWithCwd("git", ["remote", "get-url", "origin"], {
      cwd: originalCwd,
    })
  ).stdout.trim();
  return {
    usageData: jsonStringify(
      {
        generatedBy: trimmed || undefined,
        currentRepo: normalizeGitRemoteUrl(trimmed_2) ?? basename(originalCwd),
        windowDays,
        sessionCount: scanResult.sessionFileCount,
        slashCommands,
        mcpServers,
        sessionDescriptors: scanResult.sessionDescriptors,
      },
      null,
      2,
    ),
    sessionCount: scanResult.sessionFileCount,
    slashCommandCount: scanResult.slashCommandCounts.size,
    mcpServerCount: scanResult.mcpServerCounts.size,
  };
}
export { TEAM_ONBOARDING_DEFAULT_WINDOW_DAYS, collectTeamOnboardingUsage };
