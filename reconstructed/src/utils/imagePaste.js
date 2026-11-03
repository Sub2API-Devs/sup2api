/**
 * utils/imagePaste.ts
 *
 * 剪贴板图片：各平台读取命令（osascript/PowerShell/xclip/wl-paste）、从剪贴板或路径读图片、图片路径识别与引号/转义处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/imagePaste.ts
 * pieces: chunk-n770a3wm.js (15)
 * attribution: placement 3, fingerprint 4, layout 4, callgraph-fingerprint 1, file-local 3
 */
import { join, dirname, isAbsolute, basename } from "path";
import { randomBytes } from "crypto";
import { claudeTempDir } from "./tempDir.js";
import { shellQuoteArgs } from "./bash/bashPipeCommand.js";
import { getPlatform } from "./platform.js";
import { safeExecShell, safeExecFile } from "./safeSpawn.js";
import { logError } from "./log.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { getFsImplementation } from "./fsOperations.js";
import { s4, maybeResizeAndDownsampleImageBuffer, detectImageFormatFromBase64 } from "./imageResizer.js";
import { logForDebugging } from "./debug.js";
import { WindowsToWSLConverter } from "./idePathConversion.js";
import { env } from "./env.js";
import { Ph } from "../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { wt } from "../remote/remoteMode.js";
import { fEn } from "./imageWebp.js";
import { vY } from "./truncateGraphemes.js";

/**
 * 粘贴阈值与各平台读取剪贴板文件路径的命令。
 */
//@ chunk-n770a3wm.js:783-1027 placement
var PASTE_THRESHOLD = 800,
  CLIPBOARD_PATH_COMMANDS = {
    darwin: "osascript -e 'get POSIX path of (the clipboard as \xABclass furl\xBB)'",
    linux: "xclip -selection clipboard -t text/plain -o 2>/dev/null || wl-paste 2>/dev/null",
    win32: ["powershell", "-NoProfile", "-Command", "Get-Clipboard"],
  };
/**
 * 各平台剪贴板图片命令表：macOS osascript（PNGf）、Windows/WSL PowerShell、Linux xclip/wl-paste，以及截图临时文件名。
 */
//@ chunk-n770a3wm.js:1027-3646 fingerprint = getClipboardCommands (0.376)
function getClipboardCommands() {
  let o = claudeTempDir(),
    screenshotFilename = "claude_cli_latest_screenshot.png",
    tempPaths = {
      darwin: join(o, "claude_cli_latest_screenshot.png"),
      linux: join(o, "claude_cli_latest_screenshot.png"),
      win32: join(o, "claude_cli_latest_screenshot.png"),
    },
    s = tempPaths.linux || tempPaths.linux,
    r = shellQuoteArgs([s]),
    f = `set fp to open for access POSIX file ${`"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`} with write permission`,
    c = "",
    u = getPlatform() === "wsl",
    d =
      '"$(command -v powershell.exe 2>/dev/null || echo /mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe)"',
    y = u
      ? ` || "$(command -v powershell.exe 2>/dev/null || echo /mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe)" -NoProfile -NonInteractive -Sta -Command 'Add-Type -AssemblyName System.Windows.Forms; if (-not [System.Windows.Forms.Clipboard]::ContainsImage()) { exit 1 }' 2>/dev/null`
      : "",
    v = u
      ? ` 2>/dev/null || "$(command -v powershell.exe 2>/dev/null || echo /mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe)" -NoProfile -NonInteractive -Sta -Command 'Add-Type -AssemblyName System.Windows.Forms; $i = [System.Windows.Forms.Clipboard]::GetImage(); if ($null -eq $i) { exit 1 }; $ms = New-Object System.IO.MemoryStream; $i.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); [Convert]::ToBase64String($ms.ToArray())' 2>/dev/null | tr -d '\\r' | base64 -d > ${r}`
      : "",
    commands = {
      darwin: {
        checkImage: "osascript -e 'the clipboard as \xABclass PNGf\xBB'",
        saveImage: `osascript -e 'set png_data to (the clipboard as \xABclass PNGf\xBB)' -e ${shellQuoteArgs([f])} -e 'write png_data to fp' -e 'close access fp'`,
        getPath: CLIPBOARD_PATH_COMMANDS.darwin,
        deleteFile: `rm -f -- ${r}`,
      },
      linux: {
        checkImage: `xclip -selection clipboard -t TARGETS -o 2>/dev/null | grep -E "image/(png|jpeg|jpg|gif|webp|bmp)" || wl-paste -l 2>/dev/null | grep -E "image/(png|jpeg|jpg|gif|webp|bmp)"${y}`,
        saveImage: `xclip -selection clipboard -t image/png -o > ${r} 2>/dev/null || wl-paste --type image/png > ${r} 2>/dev/null || xclip -selection clipboard -t image/bmp -o > ${r} 2>/dev/null || wl-paste --type image/bmp > ${r}${v}`,
        getPath: CLIPBOARD_PATH_COMMANDS.linux,
        deleteFile: `rm -f -- ${r}`,
      },
      win32: {
        checkImage: [
          "powershell",
          "-NoProfile",
          "-NonInteractive",
          "-Sta",
          "-Command",
          "Add-Type -AssemblyName System.Windows.Forms; if (-not [System.Windows.Forms.Clipboard]::ContainsImage()) { exit 1 }",
        ],
        saveImage: [
          "powershell",
          "-NoProfile",
          "-NonInteractive",
          "-Sta",
          "-Command",
          "Add-Type -AssemblyName System.Windows.Forms; $img = [System.Windows.Forms.Clipboard]::GetImage(); if ($null -eq $img) { exit 1 }; $img.Save(, [System.Drawing.Imaging.ImageFormat]::Png)",
        ],
        getPath: CLIPBOARD_PATH_COMMANDS.win32,
        deleteFile: ["powershell", "-NoProfile", "-Command", "Remove-Item -Force -LiteralPath "],
      },
    };
  return { commands: commands.linux || commands.linux, screenshotPath: s };
}
//@ chunk-n770a3wm.js:3646-3755 layout
async function runClipboardCommand(e) {
  if (typeof e === "string") return safeExecShell(e, { reject: !1 });
  let [o, ...a] = e;
  return safeExecFile(o, a, { reject: !1 });
}
//@ chunk-n770a3wm.js:3755-3785 layout
async function nGs() {
  return !1;
}
/**
 * 从剪贴板读取图片：执行平台命令保存到临时文件，读取并转 base64，返回 {base64, mediaType, dimensions}；失败记录 clipboard_read 错误类型。
 */
//@ chunk-n770a3wm.js:3785-4452 fingerprint = getImageFromClipboard (0.549)
async function getImageFromClipboard(e) {
  let o;
  try {
    o = getClipboardCommands();
  } catch (error) {
    return (logError(error), logFeatureBad("clipboard_read", "construct_failed"), null);
  }
  let { commands: commands, screenshotPath: screenshotPath } = o;
  try {
    if ((await runClipboardCommand(commands.checkImage)).exitCode !== 0) return null;
    if (
      (await getFsImplementation().mkdir(dirname(screenshotPath), { mode: 448 }),
      (await runClipboardCommand(commands.saveImage)).exitCode !== 0)
    )
      return (logFeatureBad("clipboard_read", "save_failed"), null);
    let fileBytes = await getFsImplementation().readFileBytes(screenshotPath);
    if (fileBytes.length >= 2 && fileBytes[0] === 66 && fileBytes[1] === 77)
      fileBytes = await (await s4())(fileBytes).png().toBuffer();
    let f = await maybeResizeAndDownsampleImageBuffer(fileBytes, fileBytes.length, "png", e, {
        directWebpMaxBytes: F(),
      }),
      base64Image = f.buffer.toString("base64"),
      mediaType = detectImageFormatFromBase64(base64Image);
    return (
      runClipboardCommand(commands.deleteFile),
      logFeatureOk("clipboard_read"),
      { base64: base64Image, mediaType: mediaType, dimensions: f.dimensions }
    );
  } catch {
    return (logFeatureBad("clipboard_read", "read_failed"), null);
  }
}
//@ chunk-n770a3wm.js:4452-4702 callgraph-fingerprint = getImagePathFromClipboard (0.173)
async function getImagePathFromClipboard() {
  try {
    let o = CLIPBOARD_PATH_COMMANDS.linux || CLIPBOARD_PATH_COMMANDS.linux,
      a = await runClipboardCommand(o);
    if (a.exitCode !== 0 || !a.stdout) return null;
    return a.stdout.trim();
  } catch (error) {
    return (
      logForDebugging(
        `Failed to read image path from clipboard: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      null
    );
  }
}
//@ chunk-n770a3wm.js:4702-4737 layout
var FUt = /\.(png|jpe?g|gif|webp)$/i;
//@ chunk-n770a3wm.js:4737-4855 file-local
function removeOuterQuotes(text) {
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")))
    return text.slice(1, -1);
  return text;
}
//@ chunk-n770a3wm.js:4855-4885 layout
var x = /^(?:[A-Za-z]:\\|\\\\)/;
//@ chunk-n770a3wm.js:4885-5072 fingerprint = stripBackslashEscapes (0.676)
function stripBackslashEscapes(path) {
  if (getPlatform() === "wsl" && x.test(path)) return path;
  let placeholder = `__DOUBLE_BACKSLASH_${randomBytes(8).toString("hex")}__`;
  return path
    .replaceAll("\\\\", placeholder)
    .replace(/\\(.)/g, "$1")
    .replace(new RegExp(placeholder, "g"), "\\");
}
//@ chunk-n770a3wm.js:5072-5132 file-local
function isImageFilePath(text) {
  let cleaned = removeOuterQuotes(text.trim()),
    unescaped = stripBackslashEscapes(cleaned);
  return FUt.test(unescaped);
}
//@ chunk-n770a3wm.js:5132-5209 file-local
function asImageFilePath(text) {
  let cleaned = removeOuterQuotes(text.trim()),
    unescaped = stripBackslashEscapes(cleaned);
  if (FUt.test(unescaped)) return unescaped;
  return null;
}
/**
 * 从粘贴的文件路径读取图片：去引号/转义、权限检查（可能 refused）、空文件警告，返回图片数据或 null。
 */
//@ chunk-n770a3wm.js:5209-6094 fingerprint = tryReadImageFromPath (0.642)
async function tryReadImageFromPath(e, o, a) {
  let cleanedPath = asImageFilePath(e);
  if (!cleanedPath) return null;
  let imagePath = cleanedPath;
  if (getPlatform() === "wsl" && x.test(imagePath))
    imagePath = await new WindowsToWSLConverter(env.WSL_DISTRO_NAME).toLocalPath(imagePath);
  let imageBuffer;
  try {
    if (isAbsolute(imagePath)) imageBuffer = await a(imagePath);
    else {
      let clipboardPath = await getImagePathFromClipboard();
      if (clipboardPath && imagePath === basename(clipboardPath)) imageBuffer = await a(clipboardPath);
    }
  } catch (error) {
    return (
      logForDebugging(
        `Failed to read pasted image file ${imagePath}: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      null
    );
  }
  if (imageBuffer === "refused") return "refused";
  if (!imageBuffer || imageBuffer === "absent") return null;
  if (imageBuffer.length === 0)
    return (logForDebugging(`Image file is empty: ${imagePath}`, { level: "warn" }), null);
  if (imageBuffer.length >= 2 && imageBuffer[0] === 66 && imageBuffer[1] === 77)
    imageBuffer = await (await s4())(imageBuffer).png().toBuffer();
  let p = Ph(imageBuffer);
  if (p === null)
    return (
      logForDebugging(`Pasted path has image extension but content is not a supported image: ${imagePath}`, {
        level: "warn",
      }),
      null
    );
  let ext = p.split("/")[1] || "png",
    c = await maybeResizeAndDownsampleImageBuffer(imageBuffer, imageBuffer.length, ext, o, {
      directWebpMaxBytes: F(),
    }),
    base64Image = c.buffer.toString("base64");
  return {
    path: imagePath,
    base64: base64Image,
    mediaType: `image/${c.mediaType}`,
    dimensions: c.dimensions,
  };
}
/**
 * 判断粘贴文本是否像二进制（含空字节或替换字符比例过高）。
 */
//@ chunk-n770a3wm.js:6094-6253 placement
function looksLikeBinaryText(e) {
  if (e.includes("\x00")) return !0;
  let sliced = e.slice(0, 4096);
  if (sliced.length < 32) return !1;
  let a = 0;
  for (let n of sliced) if (n === "\uFFFD") a++;
  return a / sliced.length > 0.05;
}
//@ chunk-n770a3wm.js:6253-6293 placement
function F() {
  return wt() ? void 0 : fEn(vY);
}

export {
  PASTE_THRESHOLD,
  getImageFromClipboard,
  looksLikeBinaryText,
  isImageFilePath,
  tryReadImageFromPath,
  asImageFilePath,
  nGs,
  FUt,
};
