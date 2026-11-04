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
import {
  loadImageDecoder,
  maybeResizeAndDownsampleImageBuffer,
  detectImageFormatFromBase64,
} from "./imageResizer.js";
import { logForDebugging } from "./debug.js";
import { WindowsToWSLConverter } from "./idePathConversion.js";
import { env } from "./env.js";
import { sniffImageMediaType } from "../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { webpMaxBytesIfOn } from "./imageWebp.js";
import { MODEL_COPY_IMAGE_BYTES } from "./mediaLimits.js";

//@ chunk-n770a3wm.js:783-1027 placement
/**
 * 粘贴阈值与各平台读取剪贴板文件路径的命令。
 */
var PASTE_THRESHOLD = 800;
var CLIPBOARD_PATH_COMMANDS = {
  darwin: "osascript -e 'get POSIX path of (the clipboard as \xABclass furl\xBB)'",
  linux: "xclip -selection clipboard -t text/plain -o 2>/dev/null || wl-paste 2>/dev/null",
  win32: ["powershell", "-NoProfile", "-Command", "Get-Clipboard"],
};
//@ chunk-n770a3wm.js:1027-3646 fingerprint (2.1.88 match: getClipboardCommands, 0.376)
/**
 * 官方行为，保留：getClipboardCommands 末行 return {commands: commands.linux || commands.linux, …}，三元退化成同一分支，darwin/win32 两张命令表构造后从不返回；另有一个声明后未使用的空串。
 */
function getClipboardCommands() {
  let tempDir = claudeTempDir();
  let screenshotFilename = "claude_cli_latest_screenshot.png";
  let tempPaths = {
    darwin: join(tempDir, "claude_cli_latest_screenshot.png"),
    linux: join(tempDir, "claude_cli_latest_screenshot.png"),
    win32: join(tempDir, "claude_cli_latest_screenshot.png"),
  };
  let linux = tempPaths.linux || tempPaths.linux;
  let quotedPath = shellQuoteArgs([linux]);
  let appleScriptFileRef = `set fp to open for access POSIX file ${`"${linux.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`} with write permission`;
  let unusedEmpty = "";
  let isWsl = getPlatform() === "wsl";
  let unusedPowershellPath =
    '"$(command -v powershell.exe 2>/dev/null || echo /mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe)"';
  let wslCheckSuffix = isWsl
    ? ` || "$(command -v powershell.exe 2>/dev/null || echo /mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe)" -NoProfile -NonInteractive -Sta -Command 'Add-Type -AssemblyName System.Windows.Forms; if (-not [System.Windows.Forms.Clipboard]::ContainsImage()) { exit 1 }' 2>/dev/null`
    : "";
  let wslSaveSuffix = isWsl
    ? ` 2>/dev/null || "$(command -v powershell.exe 2>/dev/null || echo /mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe)" -NoProfile -NonInteractive -Sta -Command 'Add-Type -AssemblyName System.Windows.Forms; $i = [System.Windows.Forms.Clipboard]::GetImage(); if ($null -eq $i) { exit 1 }; $ms = New-Object System.IO.MemoryStream; $i.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); [Convert]::ToBase64String($ms.ToArray())' 2>/dev/null | tr -d '\\r' | base64 -d > ${quotedPath}`
    : "";
  let commands = {
    darwin: {
      checkImage: "osascript -e 'the clipboard as \xABclass PNGf\xBB'",
      saveImage: `osascript -e 'set png_data to (the clipboard as \xABclass PNGf\xBB)' -e ${shellQuoteArgs([appleScriptFileRef])} -e 'write png_data to fp' -e 'close access fp'`,
      getPath: CLIPBOARD_PATH_COMMANDS.darwin,
      deleteFile: `rm -f -- ${quotedPath}`,
    },
    linux: {
      checkImage: `xclip -selection clipboard -t TARGETS -o 2>/dev/null | grep -E "image/(png|jpeg|jpg|gif|webp|bmp)" || wl-paste -l 2>/dev/null | grep -E "image/(png|jpeg|jpg|gif|webp|bmp)"${wslCheckSuffix}`,
      saveImage: `xclip -selection clipboard -t image/png -o > ${quotedPath} 2>/dev/null || wl-paste --type image/png > ${quotedPath} 2>/dev/null || xclip -selection clipboard -t image/bmp -o > ${quotedPath} 2>/dev/null || wl-paste --type image/bmp > ${quotedPath}${wslSaveSuffix}`,
      getPath: CLIPBOARD_PATH_COMMANDS.linux,
      deleteFile: `rm -f -- ${quotedPath}`,
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
  return {
    commands: commands.linux || commands.linux,
    screenshotPath: linux,
  };
}
//@ chunk-n770a3wm.js:3646-3755 layout
async function runClipboardCommand(command) {
  if (typeof command === "string")
    return safeExecShell(command, {
      reject: false,
    });
  let [file, ...args] = command;
  return safeExecFile(file, args, {
    reject: false,
  });
}
//@ chunk-n770a3wm.js:3755-3785 layout
/**
 * 此构建不支持从剪贴板读图（恒为 false）。
 */
async function isClipboardImageUnsupported() {
  return false;
}
//@ chunk-n770a3wm.js:3785-4452 fingerprint (2.1.88 match: getImageFromClipboard, 0.549)
/**
 * 从剪贴板读取图片：执行平台命令保存到临时文件，读取并转 base64，返回 {base64, mediaType, dimensions}；失败记录 clipboard_read 错误类型。
 */
async function getImageFromClipboard(options) {
  let clipboard;
  try {
    clipboard = getClipboardCommands();
  } catch (e) {
    logError(e);
    logFeatureBad("clipboard_read", "construct_failed");
    return null;
  }
  let { commands, screenshotPath } = clipboard;
  try {
    if ((await runClipboardCommand(commands.checkImage)).exitCode !== 0) return null;
    await getFsImplementation().mkdir(dirname(screenshotPath), {
      mode: 448,
    });
    if ((await runClipboardCommand(commands.saveImage)).exitCode !== 0) {
      logFeatureBad("clipboard_read", "save_failed");
      return null;
    }
    let imageBuffer = await getFsImplementation().readFileBytes(screenshotPath);
    if (imageBuffer.length >= 2 && imageBuffer[0] === 66 && imageBuffer[1] === 77)
      imageBuffer = await (await loadImageDecoder())(imageBuffer).png().toBuffer();
    let resized = await maybeResizeAndDownsampleImageBuffer(imageBuffer, imageBuffer.length, "png", options, {
      directWebpMaxBytes: configuredDirectWebpMaxBytes(),
    });
    let base64Image = resized.buffer.toString("base64");
    let mediaType = detectImageFormatFromBase64(base64Image);
    runClipboardCommand(commands.deleteFile);
    logFeatureOk("clipboard_read");
    return {
      base64: base64Image,
      mediaType,
      dimensions: resized.dimensions,
    };
  } catch {
    logFeatureBad("clipboard_read", "read_failed");
    return null;
  }
}
//@ chunk-n770a3wm.js:4452-4702 callgraph-fingerprint (2.1.88 match: getImagePathFromClipboard, 0.173)
async function getImagePathFromClipboard() {
  try {
    let linux = CLIPBOARD_PATH_COMMANDS.linux || CLIPBOARD_PATH_COMMANDS.linux;
    let result = await runClipboardCommand(linux);
    if (result.exitCode !== 0 || !result.stdout) return null;
    return result.stdout.trim();
  } catch (error) {
    logForDebugging(
      `Failed to read image path from clipboard: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return null;
  }
}
//@ chunk-n770a3wm.js:4702-4737 layout
/**
 * 图片文件扩展名正则。
 */
var IMAGE_FILE_EXT_RE = /\.(png|jpe?g|gif|webp)$/i;
//@ chunk-n770a3wm.js:4737-4855 file-local
function removeOuterQuotes(text) {
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")))
    return text.slice(1, -1);
  return text;
}
//@ chunk-n770a3wm.js:4855-4885 layout
var WINDOWS_PATH_RE = /^(?:[A-Za-z]:\\|\\\\)/;
//@ chunk-n770a3wm.js:4885-5072 fingerprint (2.1.88 match: stripBackslashEscapes, 0.676)
function stripBackslashEscapes(path) {
  if (getPlatform() === "wsl" && WINDOWS_PATH_RE.test(path)) return path;
  let placeholder = `__DOUBLE_BACKSLASH_${randomBytes(8).toString("hex")}__`;
  return path
    .replaceAll("\\\\", placeholder)
    .replace(/\\(.)/g, "$1")
    .replace(new RegExp(placeholder, "g"), "\\");
}
//@ chunk-n770a3wm.js:5072-5132 file-local
function isImageFilePath(text) {
  let cleaned = removeOuterQuotes(text.trim());
  let unescaped = stripBackslashEscapes(cleaned);
  return IMAGE_FILE_EXT_RE.test(unescaped);
}
//@ chunk-n770a3wm.js:5132-5209 file-local
function asImageFilePath(text) {
  let cleaned = removeOuterQuotes(text.trim());
  let unescaped = stripBackslashEscapes(cleaned);
  if (IMAGE_FILE_EXT_RE.test(unescaped)) return unescaped;
  return null;
}
//@ chunk-n770a3wm.js:5209-6094 fingerprint (2.1.88 match: tryReadImageFromPath, 0.642)
/**
 * 从粘贴的文件路径读取图片：去引号/转义、权限检查（可能 refused）、空文件警告，返回图片数据或 null。
 */
async function tryReadImageFromPath(text, clipboardPlatform, readFile) {
  let cleanedPath = asImageFilePath(text);
  if (!cleanedPath) return null;
  let imagePath = cleanedPath;
  if (getPlatform() === "wsl" && WINDOWS_PATH_RE.test(imagePath))
    imagePath = await new WindowsToWSLConverter(env.WSL_DISTRO_NAME).toLocalPath(imagePath);
  let imageBuffer;
  try {
    if (isAbsolute(imagePath)) imageBuffer = await readFile(imagePath);
    else {
      let clipboardPath = await getImagePathFromClipboard();
      if (clipboardPath && imagePath === basename(clipboardPath)) imageBuffer = await readFile(clipboardPath);
    }
  } catch (error) {
    logForDebugging(
      `Failed to read pasted image file ${imagePath}: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return null;
  }
  if (imageBuffer === "refused") return "refused";
  if (!imageBuffer || imageBuffer === "absent") return null;
  if (imageBuffer.length === 0) {
    logForDebugging(`Image file is empty: ${imagePath}`, {
      level: "warn",
    });
    return null;
  }
  if (imageBuffer.length >= 2 && imageBuffer[0] === 66 && imageBuffer[1] === 77)
    imageBuffer = await (await loadImageDecoder())(imageBuffer).png().toBuffer();
  let mediaType = sniffImageMediaType(imageBuffer);
  if (mediaType === null) {
    logForDebugging(`Pasted path has image extension but content is not a supported image: ${imagePath}`, {
      level: "warn",
    });
    return null;
  }
  let ext = mediaType.split("/")[1] || "png";
  let resized = await maybeResizeAndDownsampleImageBuffer(
    imageBuffer,
    imageBuffer.length,
    ext,
    clipboardPlatform,
    {
      directWebpMaxBytes: configuredDirectWebpMaxBytes(),
    },
  );
  let base64Image = resized.buffer.toString("base64");
  return {
    path: imagePath,
    base64: base64Image,
    mediaType: `image/${resized.mediaType}`,
    dimensions: resized.dimensions,
  };
}
//@ chunk-n770a3wm.js:6094-6253 placement
/**
 * 判断粘贴文本是否像二进制（含空字节或替换字符比例过高）。
 */
function looksLikeBinaryText(clipboard) {
  if (clipboard.includes("\x00")) return true;
  let sliced = clipboard.slice(0, 4096);
  if (sliced.length < 32) return false;
  let replacementCount = 0;
  for (let char of sliced) if (char === "\uFFFD") replacementCount++;
  return replacementCount / sliced.length > 0.05;
}
//@ chunk-n770a3wm.js:6253-6293 placement
function configuredDirectWebpMaxBytes() {
  return isRemoteSessionAvailable() ? undefined : webpMaxBytesIfOn(MODEL_COPY_IMAGE_BYTES);
}
export {
  PASTE_THRESHOLD,
  getImageFromClipboard,
  looksLikeBinaryText,
  isImageFilePath,
  tryReadImageFromPath,
  asImageFilePath,
  isClipboardImageUnsupported,
  IMAGE_FILE_EXT_RE,
};
