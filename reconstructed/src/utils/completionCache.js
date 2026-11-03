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
import { homedir } from "os";
import { join } from "path";
import { readFile, copyFile, writeFile } from "fs/promises";
import { randomBytes } from "crypto";
import { env } from "./env.js";
import { getLaunchCommand } from "./deepLink/registerProtocol.js";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { sequential } from "./sequential.js";
import {
  VSCODE_SCROLL_SENSITIVITY_KEY,
  We,
  isVSCodeRemoteSSH,
  NEWLINE,
  vscodeUserDirectories,
} from "../commands/terminalSetup/terminalSetup.js";
import { isFsInaccessible } from "./errors.js";
import { parseJsonc, setJsoncProperty } from "./json.js";
import { isPlainObject } from "./isPlainObject.js";
import { color } from "../components/design-system/color.js";
import { logForDebugging } from "./debug.js";

/**
 * 检测用户 shell（zsh/bash/fish/PowerShell）及对应补全脚本的缓存路径。
 */
//@ chunk-d0x4qj4e.js:416-1116 fingerprint = detectShell (1)
function detectShell() {
  let e = env.SHELL || "",
    home = homedir(),
    claudeDir = join(home, ".claude");
  if (e.endsWith("/zsh") || e.endsWith("/zsh.exe")) {
    let cacheFile = join(claudeDir, "completion.zsh");
    return {
      name: "zsh",
      rcFile: join(home, ".zshrc"),
      cacheFile: cacheFile,
      completionLine: `[[ -f "${cacheFile}" ]] && source "${cacheFile}"`,
      shellFlag: "zsh",
    };
  }
  if (e.endsWith("/bash") || e.endsWith("/bash.exe")) {
    let cacheFile = join(claudeDir, "completion.bash");
    return {
      name: "bash",
      rcFile: join(home, ".bashrc"),
      cacheFile: cacheFile,
      completionLine: `[ -f "${cacheFile}" ] && source "${cacheFile}"`,
      shellFlag: "bash",
    };
  }
  if (e.endsWith("/fish") || e.endsWith("/fish.exe")) {
    let o = env.XDG_CONFIG_HOME || join(home, ".config"),
      cacheFile = join(claudeDir, "completion.fish");
    return {
      name: "fish",
      rcFile: join(o, "fish", "config.fish"),
      cacheFile: cacheFile,
      completionLine: `[ -f "${cacheFile}" ] && source "${cacheFile}"`,
      shellFlag: "fish",
    };
  }
  return null;
}
//@ chunk-d0x4qj4e.js:1116-1144 layout
async function $_o() {
  return;
}
/**
 * 后台运行 claude completion --output 重新生成 shell 补全缓存。
 */
//@ chunk-d0x4qj4e.js:1144-1255 fingerprint = regenerateCompletionCache (0.766)
function regenerateCompletionCache(e) {
  let { cmd: cmd, prefixArgs: prefixArgs } = getLaunchCommand();
  return execFileNoThrow(cmd, [...prefixArgs, "completion", e.shellFlag, "--output", e.cacheFile]);
}
//@ chunk-7p2hc4jn.js:7657-8767 callgraph-witnessed = setupShellCompletion (0.201)
async function setupShellCompletion(e, r, n) {
  let dim = sequential.dim(
    `For smoother scrolling, set "${VSCODE_SCROLL_SENSITIVITY_KEY}": ${We} in ${r} settings.`,
  );
  if (isVSCodeRemoteSSH()) return `${dim}${NEWLINE}`;
  let o = join(await vscodeUserDirectories.of(e).pathFor(r), "settings.json");
  try {
    let u = "{}",
      d = !1;
    try {
      ((u = await readFile(o, { encoding: "utf-8" })), (d = !0));
    } catch (error) {
      if (!isFsInaccessible(error)) throw error;
    }
    let configDir = parseJsonc(u);
    if (!isPlainObject(configDir))
      return `${color("warning", n)(`${r} settings.json isn't a JSON object; not modifying it.`)}${NEWLINE}${dim}${NEWLINE}`;
    if (VSCODE_SCROLL_SENSITIVITY_KEY in configDir)
      return `${color("success", n)(`${r} ${VSCODE_SCROLL_SENSITIVITY_KEY} already set; leaving as-is`)}${NEWLINE}${sequential.dim(`See ${o}`)}${NEWLINE}`;
    let x = setJsoncProperty(u, VSCODE_SCROLL_SENSITIVITY_KEY, We);
    if (x === u)
      return `${color("warning", n)(`Couldn't update ${r} settings.json.`)}${NEWLINE}${dim}${NEWLINE}`;
    if (d) {
      let content = `${o}.${randomBytes(4).toString("hex")}.bak`;
      try {
        await copyFile(o, content);
      } catch {
        return `${color("warning", n)(`Couldn't back up ${r} settings.json; not modifying it.`)}${NEWLINE}${dim}${NEWLINE}`;
      }
    }
    return (
      await writeFile(o, x, { encoding: "utf-8" }),
      `${color("success", n)(`Set ${r} terminal scroll sensitivity to ${We}`)}${NEWLINE}${sequential.dim(`See ${o}`)}${NEWLINE}`
    );
  } catch (error) {
    return (
      logForDebugging(
        `Couldn't update ${r} settings.json at ${o}: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      `${color("warning", n)(`Couldn't update ${r} settings.json.`)}${NEWLINE}${dim}${NEWLINE}`
    );
  }
}

export { setupShellCompletion, $_o };
