/**
 * utils/claudeDesktop.ts
 *
 * Claude Desktop 集成：定位桌面版配置文件并读取其中的 mcpServers。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/claudeDesktop.ts
 * pieces: chunk-2sv0rqj8.js (2)
 * attribution: fingerprint 2
 */
import { join } from "path";
import { homedir } from "os";
import { stat, readdir, readFile } from "fs/promises";
import { getPlatform, SUPPORTED_PLATFORMS_2 } from "./platform.js";
import { env } from "./env.js";
import { logForDebugging } from "./debug.js";
import { getErrnoCode } from "./errors.js";
import { safeParseJSON } from "./json.js";
import { McpStdioServerConfigSchema } from "../services/mcp/types.js";

//@ chunk-2sv0rqj8.js:1143-2088 fingerprint (2.1.88 match: getClaudeDesktopConfigPath, 0.969)
/**
 * Claude Desktop 配置文件路径（macOS Application Support/Claude/claude_desktop_config.json，WSL 下映射 Windows APPDATA）。
 */
async function getClaudeDesktopConfigPath() {
  let platform = getPlatform();
  if (!SUPPORTED_PLATFORMS_2.includes(platform))
    throw Error(
      `Unsupported platform: ${platform} - Claude Desktop integration only works on macOS and WSL.`,
    );
  if (platform === "macos")
    return join(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
  let windowsHome = env.USERPROFILE ? env.USERPROFILE.replace(/\\/g, "/") : null;
  if (windowsHome) {
    let configPath = `/mnt/c${windowsHome.replace(/^[A-Z]:/, "")}/AppData/Roaming/Claude/claude_desktop_config.json`;
    try {
      await stat(configPath);
      return configPath;
    } catch {}
  }
  try {
    try {
      let userDirs = await readdir("/mnt/c/Users", {
        withFileTypes: true,
      });
      for (let user of userDirs) {
        if (
          user.name === "Public" ||
          user.name === "Default" ||
          user.name === "Default User" ||
          user.name === "All Users"
        )
          continue;
        let potentialConfigPath = join(
          "/mnt/c/Users",
          user.name,
          "AppData",
          "Roaming",
          "Claude",
          "claude_desktop_config.json",
        );
        try {
          await stat(potentialConfigPath);
          return potentialConfigPath;
        } catch {}
      }
    } catch {}
  } catch (dirError) {
    logForDebugging(`Failed scanning /mnt/c/Users for Claude Desktop config: ${dirError}`, {
      level: "error",
    });
  }
  throw Error(
    "Could not find Claude Desktop config file in Windows. Make sure Claude Desktop is installed on Windows.",
  );
}
//@ chunk-2sv0rqj8.js:2088-2655 fingerprint (2.1.88 match: readClaudeDesktopMcpServers, 0.763)
/**
 * 读取 Claude Desktop 配置中的 mcpServers，用于从桌面版导入 MCP 服务器。
 */
async function readClaudeDesktopMcpServers() {
  if (!SUPPORTED_PLATFORMS_2.includes(getPlatform()))
    throw Error("Unsupported platform - Claude Desktop integration only works on macOS and WSL.");
  try {
    let configPath = await getClaudeDesktopConfigPath();
    let configContent;
    try {
      configContent = await readFile(configPath, {
        encoding: "utf8",
      });
    } catch (e) {
      if (getErrnoCode(e) === "ENOENT") return {};
      throw e;
    }
    let config = safeParseJSON(configContent);
    if (!config || typeof config !== "object") return {};
    let mcpServers = config.mcpServers;
    if (!mcpServers || typeof mcpServers !== "object") return {};
    let servers = {};
    for (let [name, serverConfig] of Object.entries(mcpServers)) {
      if (!serverConfig || typeof serverConfig !== "object") continue;
      let result = McpStdioServerConfigSchema().safeParse(serverConfig);
      if (result.success) servers[name] = result.data;
    }
    return servers;
  } catch (error) {
    logForDebugging(`Failed to read Claude Desktop MCP servers: ${error}`, {
      level: "error",
    });
    return {};
  }
}
export { readClaudeDesktopMcpServers };
