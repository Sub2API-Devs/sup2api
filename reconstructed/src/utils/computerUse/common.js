/**
 * utils/computerUse/common.ts
 *
 * computer-use 公共常量：MCP 服务器名 computer-use、终端 bundle id 映射、CLI 能力描述，以及内置 MCP 工具渲染分派。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/computerUse/common.ts
 * pieces: chunk-ah34pb7m.js (1), chunk-dcmhvw5a.js (3)
 * attribution: fingerprint 4
 */
import { env } from "../env.js";
import { CFC_TOOL_PREFIX } from "../claudeInChrome/common.js";
import { createObjectResultRenderer, renderChromeViewTabLink } from "../claudeInChrome/toolRendering.js";
import { m1 } from "../../components/messages/SkillProposalMessage.js";
import { renderToolResultMessage_2 } from "./toolRendering.js";

/**
 * computer-use MCP 服务器名 "computer-use"、CLI 宿主 bundle id、TERM_PROGRAM→终端 bundle id 映射。
 */
//@ chunk-dcmhvw5a.js:204760-205032 fingerprint = TERMINAL_BUNDLE_ID_FALLBACK (0.903)
var COMPUTER_USE_MCP_SERVER_NAME = "computer-use",
  CLI_HOST_BUNDLE_ID = "com.anthropic.claude-code.cli-no-window",
  TERMINAL_BUNDLE_ID_FALLBACK = {
    "iTerm.app": "com.googlecode.iterm2",
    Apple_Terminal: "com.apple.Terminal",
    ghostty: "com.mitchellh.ghostty",
    kitty: "net.kovidgoyal.kitty",
    WarpTerminal: "dev.warp.Warp-Stable",
    vscode: "com.microsoft.VSCode",
  };
/**
 * 取终端的 bundle id：优先 __CFBundleIdentifier，否则按 TERM_PROGRAM 查表。
 */
//@ chunk-dcmhvw5a.js:205032-205122 fingerprint = getTerminalBundleId (1)
function getTerminalBundleId() {
  let cfBundleId = env.__CFBundleIdentifier;
  if (cfBundleId) return cfBundleId;
  return TERMINAL_BUNDLE_ID_FALLBACK[env.terminal ?? ""] ?? null;
}
/**
 * CLI 宿主的 computer-use 能力描述（darwin、原生截图过滤、无自适应分辨率、不落盘）。
 */
//@ chunk-dcmhvw5a.js:205122-205215 fingerprint = CLI_CU_CAPABILITIES (0.797)
var CLI_CU_CAPABILITIES = {
  screenshotFiltering: "native",
  platform: "darwin",
  adaptiveResolution: !1,
  saveToDisk: !1,
};
/**
 * 按 MCP 工具的 builtinRenderFamily（claude-in-chrome / computer-use）返回内置的结果渲染或标签渲染函数。
 */
//@ chunk-ah34pb7m.js:265304-265606 fingerprint = COMPUTER_USE_MCP_SERVER_NAME (0.378)
function getBuiltinMcpRenderOverride(tool, slot) {
  if (tool.builtinRenderFamily === "claude-in-chrome") {
    let sliced = tool.name.slice(CFC_TOOL_PREFIX.length);
    if (slot === "renderToolResultMessage") return createObjectResultRenderer(sliced);
    if (slot === "renderToolUseTag") return renderChromeViewTabLink;
  }
  if (tool.builtinRenderFamily === "computer-use") {
    let sliced = tool.name.slice(m1.length);
    if (slot === "renderToolResultMessage") return renderToolResultMessage_2(sliced);
  }
  return;
}

export { COMPUTER_USE_MCP_SERVER_NAME, getBuiltinMcpRenderOverride };
