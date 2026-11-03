/**
 * commands/team-onboarding/gather.ts
 *
 * 2.1.316 新增：/team-onboarding 收集本机会话记录中的工具与 MCP 使用情况
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import { readdir, stat, readFile } from "fs/promises";
import { extname, join, basename } from "path";
import { isFsInaccessible, isENOENT } from "../../utils/errors.js";
import {
  MAX_METADATA_SCAN_BYTES,
  COMMAND_NAME_CONTENT_MARKER,
  COMMAND_MESSAGE_CONTENT_MARKER,
  COMMAND_NAME_RE,
  TOOL_USE_TYPE_MARKER,
  MCP_TOOL_USE_NAME_RE,
  CUSTOM_TITLE_TYPE_MARKER,
  CUSTOM_TITLE_RE,
  PR_LINK_TYPE_MARKER,
  PR_NUMBER_RE,
  USER_ROLE_MARKER,
  USER_CONTENT_RE,
  MAX_FIRST_MESSAGE_CHARS,
  MAX_SESSION_DESCRIPTORS,
} from "../../utils/sessionStorage.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { getProjectDir } from "../../utils/sessionStoragePortable.js";
import { execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import { normalizeGitRemoteUrl } from "../../utils/git.js";

//@ chunk-e6aww6q8.js:1738199-1739826 placement
/**
 * scanSessionUsage：扫描会话 JSONL：斜杠命令次数、MCP 调用次数、会话描述。
 */
async function scanSessionUsage(projectDir, n) {
  let r = {
    slashCommandCounts: new Map(),
    mcpServerCounts: new Map(),
    sessionDescriptors: [],
    sessionFileCount: 0,
  };
  let s = Date.now() - n * 24 * 60 * 60 * 1000;
  let h;
  try {
    h = await readdir(projectDir);
  } catch (error) {
    if (isFsInaccessible(error)) return r;
    throw error;
  }
  let filtered = h.filter((w) => extname(w) === ".jsonl");
  let filtered_2 = (
    await Promise.all(
      filtered.map(async (w) => {
        let L = join(projectDir, w);
        try {
          let G = await stat(L);
          if (!G.isFile() || G.mtimeMs < s || G.size > MAX_METADATA_SCAN_BYTES) return null;
          return L;
        } catch (error) {
          if (isFsInaccessible(error)) return null;
          throw error;
        }
      }),
    )
  ).filter((w) => w !== null);
  for (let w of filtered_2) {
    let L;
    try {
      L = await readFile(w, "utf-8");
    } catch (error) {
      if (isFsInaccessible(error)) continue;
      throw error;
    }
    r.sessionFileCount++;
    let G = {
      prNumbers: [],
    };
    for (let line of L.split(`
`)) {
      if (line.length < 10) continue;
      if (line.includes(COMMAND_NAME_CONTENT_MARKER) || line.includes(COMMAND_MESSAGE_CONTENT_MARKER))
        for (let Z of line.matchAll(COMMAND_NAME_RE)) {
          let Se = Z[1];
          r.slashCommandCounts.set(Se, (r.slashCommandCounts.get(Se) ?? 0) + 1);
        }
      if (line.includes(TOOL_USE_TYPE_MARKER) && line.includes('"name":"mcp__'))
        for (let Z of line.matchAll(MCP_TOOL_USE_NAME_RE)) {
          let Se = Z[1];
          r.mcpServerCounts.set(Se, (r.mcpServerCounts.get(Se) ?? 0) + 1);
        }
      if (line.includes(CUSTOM_TITLE_TYPE_MARKER)) {
        let match = CUSTOM_TITLE_RE.exec(line);
        if (match) G.title = match[1];
      }
      if (line.includes(PR_LINK_TYPE_MARKER)) {
        let match = PR_NUMBER_RE.exec(line);
        if (match) {
          let Se = Number(match[1]);
          if (!G.prNumbers.includes(Se)) G.prNumbers.push(Se);
        }
      }
      if (
        !G.firstMessage &&
        line.includes(USER_ROLE_MARKER) &&
        !line.includes(COMMAND_NAME_CONTENT_MARKER) &&
        !line.includes('"content":[')
      ) {
        let match = USER_CONTENT_RE.exec(line);
        if (match) {
          let replaced = match[1].replace(/\\n/g, " ").replace(/\\"/g, '"');
          if (replaced.length > 3 && !replaced.startsWith("<"))
            G.firstMessage = replaced.slice(0, MAX_FIRST_MESSAGE_CHARS);
        }
      }
    }
    if (G.title || G.prNumbers.length > 0 || G.firstMessage) r.sessionDescriptors.push(G);
  }
  if (r.sessionDescriptors.length > MAX_SESSION_DESCRIPTORS) {
    r.sessionDescriptors.sort((w, L) => {
      let G = (w.title ? 2 : 0) + (w.prNumbers.length > 0 ? 1 : 0);
      return (L.title ? 2 : 0) + (L.prNumbers.length > 0 ? 1 : 0) - G;
    });
    r.sessionDescriptors = r.sessionDescriptors.slice(0, MAX_SESSION_DESCRIPTORS);
  }
  return r;
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
    let r = jsonParse(file);
    if (r && typeof r === "object" && "mcpServers" in r && r.mcpServers && typeof r.mcpServers === "object")
      return r.mcpServers;
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
async function collectTeamOnboardingUsage(e) {
  let originalCwd = getOriginalCwd();
  let projectDir = getProjectDir(originalCwd);
  let s = await scanSessionUsage(projectDir, e);
  let slashCommands = [...s.slashCommandCounts.entries()]
    .sort((q, Z) => Z[1] - q[1])
    .map(([q, Z]) => ({
      name: `/${q}`,
      count: Z,
    }));
  let projectMcpServers = await readProjectMcpServers(originalCwd);
  let mcpServers = [...s.mcpServerCounts.entries()]
    .sort((q, Z) => Z[1] - q[1])
    .map(([q, Z]) => {
      let Se = projectMcpServers[q];
      return {
        name: q,
        callCount: Z,
        urlOrigin: typeof Se?.url === "string" ? urlOriginOrUndefined(Se.url) : undefined,
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
        windowDays: e,
        sessionCount: s.sessionFileCount,
        slashCommands,
        mcpServers,
        sessionDescriptors: s.sessionDescriptors,
      },
      null,
      2,
    ),
    sessionCount: s.sessionFileCount,
    slashCommandCount: s.slashCommandCounts.size,
    mcpServerCount: s.mcpServerCounts.size,
  };
}
export { TEAM_ONBOARDING_DEFAULT_WINDOW_DAYS, collectTeamOnboardingUsage };
