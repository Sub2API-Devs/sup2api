/**
 * utils/completionCache.ts
 *
 * shell 补全：检测 shell、生成并缓存补全脚本、安装到 shell 配置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/completionCache.ts
 * pieces: chunk-7p2hc4jn.js (1), chunk-d0x4qj4e.js (3)
 * attribution: callgraph-witnessed 1, fingerprint 2, layout 1
 */
import { join } from "path";
import { readFile, copyFile, writeFile } from "fs/promises";
import { randomBytes } from "crypto";
import { homedir } from "os";
import { sequential } from "./sequential.js";
import {
  VSCODE_SCROLL_SENSITIVITY_KEY,
  VSCODE_RECOMMENDED_SCROLL_SENSITIVITY,
  isVSCodeRemoteSSH,
  NEWLINE,
  vscodeUserDirectories,
} from "../commands/terminalSetup/terminalSetup.js";
import { isFsInaccessible } from "./errors.js";
import { parseJsonc_2, setJsoncProperty } from "./json.js";
import { isPlainObject } from "./isPlainObject.js";
import { color } from "../components/design-system/color.js";
import { logForDebugging } from "./debug.js";
import { env } from "./env.js";
import { getLaunchCommand } from "./deepLink/registerProtocol.js";
import { execFileNoThrow } from "./execFileNoThrow.js";

//@ chunk-7p2hc4jn.js:7657-8767 callgraph-witnessed = setupShellCompletion (0.201)
async function setupShellCompletion(editor, productName, label) {
  let scrollHint = sequential.dim(
    `For smoother scrolling, set "${VSCODE_SCROLL_SENSITIVITY_KEY}": ${VSCODE_RECOMMENDED_SCROLL_SENSITIVITY} in ${productName} settings.`,
  );
  if (isVSCodeRemoteSSH()) return `${scrollHint}${NEWLINE}`;
  let settingsPath = join(await vscodeUserDirectories.of(editor).pathFor(productName), "settings.json");
  try {
    let content = "{}";
    let settingsExisted = false;
    try {
      content = await readFile(settingsPath, {
        encoding: "utf-8",
      });
      settingsExisted = true;
    } catch (error) {
      if (!isFsInaccessible(error)) throw error;
    }
    let configDir = parseJsonc_2(content);
    if (!isPlainObject(configDir))
      return `${color("warning", label)(`${productName} settings.json isn't a JSON object; not modifying it.`)}${NEWLINE}${scrollHint}${NEWLINE}`;
    if (VSCODE_SCROLL_SENSITIVITY_KEY in configDir)
      return `${color("success", label)(`${productName} ${VSCODE_SCROLL_SENSITIVITY_KEY} already set; leaving as-is`)}${NEWLINE}${sequential.dim(`See ${settingsPath}`)}${NEWLINE}`;
    let updatedSettings = setJsoncProperty(
      content,
      VSCODE_SCROLL_SENSITIVITY_KEY,
      VSCODE_RECOMMENDED_SCROLL_SENSITIVITY,
    );
    if (updatedSettings === content)
      return `${color("warning", label)(`Couldn't update ${productName} settings.json.`)}${NEWLINE}${scrollHint}${NEWLINE}`;
    if (settingsExisted) {
      let content = `${settingsPath}.${randomBytes(4).toString("hex")}.bak`;
      try {
        await copyFile(settingsPath, content);
      } catch {
        return `${color("warning", label)(`Couldn't back up ${productName} settings.json; not modifying it.`)}${NEWLINE}${scrollHint}${NEWLINE}`;
      }
    }
    await writeFile(settingsPath, updatedSettings, {
      encoding: "utf-8",
    });
    return `${color("success", label)(`Set ${productName} terminal scroll sensitivity to ${VSCODE_RECOMMENDED_SCROLL_SENSITIVITY}`)}${NEWLINE}${sequential.dim(`See ${settingsPath}`)}${NEWLINE}`;
  } catch (error) {
    logForDebugging(
      `Couldn't update ${productName} settings.json at ${settingsPath}: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return `${color("warning", label)(`Couldn't update ${productName} settings.json.`)}${NEWLINE}${scrollHint}${NEWLINE}`;
  }
}
//@ chunk-d0x4qj4e.js:416-1116 fingerprint = detectShell (1)
/**
 * 检测用户 shell（zsh/bash/fish/PowerShell）及对应补全脚本的缓存路径。
 */
function detectShell() {
  let shell = env.SHELL || "";
  let home = homedir();
  let claudeDir = join(home, ".claude");
  if (shell.endsWith("/zsh") || shell.endsWith("/zsh.exe")) {
    let cacheFile = join(claudeDir, "completion.zsh");
    return {
      name: "zsh",
      rcFile: join(home, ".zshrc"),
      cacheFile,
      completionLine: `[[ -f "${cacheFile}" ]] && source "${cacheFile}"`,
      shellFlag: "zsh",
    };
  }
  if (shell.endsWith("/bash") || shell.endsWith("/bash.exe")) {
    let cacheFile = join(claudeDir, "completion.bash");
    return {
      name: "bash",
      rcFile: join(home, ".bashrc"),
      cacheFile,
      completionLine: `[ -f "${cacheFile}" ] && source "${cacheFile}"`,
      shellFlag: "bash",
    };
  }
  if (shell.endsWith("/fish") || shell.endsWith("/fish.exe")) {
    let xdg = env.XDG_CONFIG_HOME || join(home, ".config");
    let cacheFile = join(claudeDir, "completion.fish");
    return {
      name: "fish",
      rcFile: join(xdg, "fish", "config.fish"),
      cacheFile,
      completionLine: `[ -f "${cacheFile}" ] && source "${cacheFile}"`,
      shellFlag: "fish",
    };
  }
  return null;
}
//@ chunk-d0x4qj4e.js:1116-1144 layout
/**
 * 重新生成 shell 补全缓存的占位函数（当前不做任何事）。
 */
async function regenerateCompletionCache() {
  return;
}
//@ chunk-d0x4qj4e.js:1144-1255 fingerprint = regenerateCompletionCache (0.766)
/**
 * 后台运行 claude completion --output 重新生成 shell 补全缓存。
 */
function regenerateCompletionCache_2(options) {
  let { cmd, prefixArgs } = getLaunchCommand();
  return execFileNoThrow(cmd, [
    ...prefixArgs,
    "completion",
    options.shellFlag,
    "--output",
    options.cacheFile,
  ]);
}
export { setupShellCompletion, regenerateCompletionCache };
