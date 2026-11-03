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

/**
 * Claude Desktop 配置文件路径（macOS Application Support/Claude/claude_desktop_config.json，WSL 下映射 Windows APPDATA）。
 */
//@ chunk-2sv0rqj8.js:1143-2088 fingerprint = getClaudeDesktopConfigPath (0.969)
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
      return (await stat(configPath), configPath);
    } catch {}
  }
  try {
    try {
      let e = await readdir("/mnt/c/Users", { withFileTypes: !0 });
      for (let user of e) {
        if (
          user.name === "Public" ||
          user.name === "Default" ||
          user.name === "Default User" ||
          user.name === "All Users"
        )
          continue;
        let s = join("/mnt/c/Users", user.name, "AppData", "Roaming", "Claude", "claude_desktop_config.json");
        try {
          return (await stat(s), s);
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
/**
 * 读取 Claude Desktop 配置中的 mcpServers，用于从桌面版导入 MCP 服务器。
 */
//@ chunk-2sv0rqj8.js:2088-2655 fingerprint = readClaudeDesktopMcpServers (0.763)
async function readClaudeDesktopMcpServers() {
  if (!SUPPORTED_PLATFORMS_2.includes(getPlatform()))
    throw Error("Unsupported platform - Claude Desktop integration only works on macOS and WSL.");
  try {
    let configPath = await getClaudeDesktopConfigPath(),
      configContent;
    try {
      configContent = await readFile(configPath, { encoding: "utf8" });
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") return {};
      throw error;
    }
    let code = safeParseJSON(configContent);
    if (!code || typeof code !== "object") return {};
    let mcpServers = code.mcpServers;
    if (!mcpServers || typeof mcpServers !== "object") return {};
    let servers = {};
    for (let [s, c] of Object.entries(mcpServers)) {
      if (!c || typeof c !== "object") continue;
      let result = McpStdioServerConfigSchema().safeParse(c);
      if (result.success) servers[s] = result.data;
    }
    return servers;
  } catch (error) {
    return (logForDebugging(`Failed to read Claude Desktop MCP servers: ${error}`, { level: "error" }), {});
  }
}
