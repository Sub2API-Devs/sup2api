/**
 * utils/screenshotClipboard.ts
 *
 * 把 ANSI 文本渲染为 PNG 并复制到剪贴板（按平台用 osascript/xclip/PowerShell）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/screenshotClipboard.ts
 * pieces: chunk-j6tt9nsa.js (3)
 * attribution: fingerprint 2, sole-consumer 1
 */
import { unlink } from "fs/promises";
import { spawn } from "child_process";
import { writeTempFile } from "./tempFiles.js";
import { logError } from "./log.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { getPlatform } from "./platform.js";
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { quotePowerShellSingleQuoted } from "./powershell/quoting.js";
import { moveKeeperPid } from "./toolCgroup.js";

//@ chunk-j6tt9nsa.js:70599-71186 fingerprint (2.1.88 match: copyAnsiToClipboard, 0.562)
/**
 * 把 ANSI 文本渲染成 PNG 截图并复制到剪贴板（临时文件放 screenshots 目录）。
 */
async function copyAnsiToClipboard(ansiText, options) {
  try {
    let { ansiToPng } = await import("./ansiToPng.js");
    let pngPath = ansiToPng(ansiText, options);
    let pngPath_2 = await writeTempFile("screenshot-", ".png", pngPath, "screenshots");
    let result;
    try {
      result = await copyPngToClipboard(pngPath_2);
    } catch (error) {
      logError(error);
      logFeatureBad("clipboard_write", "copy_failed");
      return {
        success: false,
        message: `Failed to copy screenshot: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    } finally {
      await unlink(pngPath_2).catch(() => {});
    }
    if (result.success) logFeatureOk("clipboard_write");
    else logFeatureBad("clipboard_write", "copy_failed");
    return result;
  } catch (error) {
    logError(error);
    logFeatureBad("clipboard_write", "render_failed");
    return {
      success: false,
      message: `Failed to copy screenshot: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
//@ chunk-j6tt9nsa.js:71186-72316 fingerprint (2.1.88 match: copyPngToClipboard, 0.791)
/**
 * 按平台把 PNG 写入剪贴板：macOS osascript、Linux xclip/wl-copy、Windows PowerShell。
 */
async function copyPngToClipboard(pngPath) {
  let platform = getPlatform();
  if (platform === "macos") {
    let script = `set the clipboard to (read (POSIX file "${pngPath.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}") as \xABclass PNGf\xBB)`;
    let result = await execFileNoThrowWithCwd("osascript", ["-e", script], {
      timeout: 5000,
    });
    if (result.code === 0)
      return {
        success: true,
        message: "Screenshot copied to clipboard",
      };
    return {
      success: false,
      message: `Failed to copy to clipboard: ${result.stderr}`,
    };
  }
  if (platform === "linux") {
    if (
      (await spawnDetachedWithTimeout("xclip", [
        "-selection",
        "clipboard",
        "-t",
        "image/png",
        "-i",
        pngPath,
      ])) === 0
    )
      return {
        success: true,
        message: "Screenshot copied to clipboard",
      };
    return {
      success: false,
      message: "Failed to copy to clipboard. Please install xclip: sudo apt install xclip",
    };
  }
  if (platform === "windows") {
    let psScript = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetImage([System.Drawing.Image]::FromFile(${quotePowerShellSingleQuoted(pngPath, "the screenshot temp path (override with CLAUDE_CODE_TMPDIR)")}))`;
    let result = await execFileNoThrowWithCwd("powershell", ["-NoProfile", "-Command", psScript], {
      timeout: 5000,
    });
    if (result.code === 0)
      return {
        success: true,
        message: "Screenshot copied to clipboard",
      };
    return {
      success: false,
      message: `Failed to copy to clipboard: ${result.stderr}`,
    };
  }
  return {
    success: false,
    message: `Screenshot to clipboard is not supported on ${platform}`,
  };
}
//@ chunk-j6tt9nsa.js:72316-72649 sole-consumer
function spawnDetachedWithTimeout(command, args, timeoutMs = 5000) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, {
        cwd: undefined,
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
    } catch {
      resolve(null);
      return;
    }
    moveKeeperPid(child.pid);
    let settled = false;
    function finish(exitCode) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(exitCode);
    }
    let timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(null);
    }, timeoutMs);
    child.once("exit", (exitCode) => finish(exitCode));
    child.once("error", () => finish(null));
    child.unref();
  });
}
export { copyAnsiToClipboard };
