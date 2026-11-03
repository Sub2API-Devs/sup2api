/**
 * utils/screenshotClipboard.ts
 *
 * 把 ANSI 文本渲染为 PNG 并复制到剪贴板（按平台用 osascript/xclip/PowerShell）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/screenshotClipboard.ts
 * pieces: chunk-9h8dr0qb.js (3)
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

/**
 * 把 ANSI 文本渲染成 PNG 截图并复制到剪贴板（临时文件放 screenshots 目录）。
 */
//@ chunk-9h8dr0qb.js:70640-71227 fingerprint = copyAnsiToClipboard (0.559)
async function copyAnsiToClipboard(ansiText, options) {
  try {
    let { ansiToPng: ansiToPng } = await import("./chunk-t6e3jxy0.js"),
      pngPath = ansiToPng(ansiText, options),
      D = await writeTempFile("screenshot-", ".png", pngPath, "screenshots"),
      E;
    try {
      E = await copyPngToClipboard(D);
    } catch (error) {
      return (
        logError(error),
        logFeatureBad("clipboard_write", "copy_failed"),
        {
          success: !1,
          message: `Failed to copy screenshot: ${error instanceof Error ? error.message : "Unknown error"}`,
        }
      );
    } finally {
      await unlink(D).catch(() => {});
    }
    if (E.success) logFeatureOk("clipboard_write");
    else logFeatureBad("clipboard_write", "copy_failed");
    return E;
  } catch (error) {
    return (
      logError(error),
      logFeatureBad("clipboard_write", "render_failed"),
      {
        success: !1,
        message: `Failed to copy screenshot: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    );
  }
}
/**
 * 按平台把 PNG 写入剪贴板：macOS osascript、Linux xclip/wl-copy、Windows PowerShell。
 */
//@ chunk-9h8dr0qb.js:71227-72357 fingerprint = copyPngToClipboard (0.791)
async function copyPngToClipboard(pngPath) {
  let platform = getPlatform();
  if (platform === "macos") {
    let script = `set the clipboard to (read (POSIX file "${pngPath.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}") as \xABclass PNGf\xBB)`,
      result = await execFileNoThrowWithCwd("osascript", ["-e", script], { timeout: 5000 });
    if (result.code === 0) return { success: !0, message: "Screenshot copied to clipboard" };
    return { success: !1, message: `Failed to copy to clipboard: ${result.stderr}` };
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
      return { success: !0, message: "Screenshot copied to clipboard" };
    return {
      success: !1,
      message: "Failed to copy to clipboard. Please install xclip: sudo apt install xclip",
    };
  }
  if (platform === "windows") {
    let psScript = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetImage([System.Drawing.Image]::FromFile(${quotePowerShellSingleQuoted(pngPath, "the screenshot temp path (override with CLAUDE_CODE_TMPDIR)")}))`,
      result = await execFileNoThrowWithCwd("powershell", ["-NoProfile", "-Command", psScript], {
        timeout: 5000,
      });
    if (result.code === 0) return { success: !0, message: "Screenshot copied to clipboard" };
    return { success: !1, message: `Failed to copy to clipboard: ${result.stderr}` };
  }
  return { success: !1, message: `Screenshot to clipboard is not supported on ${platform}` };
}
//@ chunk-9h8dr0qb.js:72357-72690 sole-consumer
function spawnDetachedWithTimeout(o, u, p = 5000) {
  return new Promise((h) => {
    let D;
    try {
      D = spawn(o, u, { cwd: void 0, detached: !0, stdio: "ignore", windowsHide: !0 });
    } catch {
      h(null);
      return;
    }
    moveKeeperPid(D.pid);
    let E = !1;
    function T(v) {
      if (E) return;
      ((E = !0), clearTimeout(A), h(v));
    }
    let A = setTimeout(() => {
      (D.kill("SIGKILL"), T(null));
    }, p);
    (D.once("exit", (v) => T(v)), D.once("error", () => T(null)), D.unref());
  });
}

export { copyAnsiToClipboard };
