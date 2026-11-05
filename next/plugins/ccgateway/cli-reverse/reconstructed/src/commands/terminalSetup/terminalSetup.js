/**
 * commands/terminalSetup/terminalSetup.tsx
 *
 * /terminal-setup 实现：各终端 Shift+Enter 绑定、iTerm/VSCode/Zed 配置、Apple Terminal Option 键
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/terminalSetup/terminalSetup.tsx
 * pieces: chunk-42wa4pww.js (27), chunk-qqnmjrpr.js (1), chunk-rvv2d5j7.js (1)
 * attribution: fingerprint 9, facade-exports 12, layout 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { platform, homedir } from "os";
import { readFile, copyFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { randomBytes } from "crypto";
import { env } from "../../utils/env.js";
import { setupShellCompletion } from "../../utils/completionCache.js";
import { saveGlobalConfig, getGlobalConfig } from "../../utils/config.js";
import { sequential } from "../../utils/sequential.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { color } from "../../components/design-system/color.js";
import { logError } from "../../utils/log.js";
import { getPlatform, macOSMajorVersion } from "../../utils/platform.js";
import { parseJsonc_2, setJsoncProperty, addItemToJSONCArray, stripBom } from "../../utils/json.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { isFsInaccessible, isENOENT } from "../../utils/errors.js";
import { memoizeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { pathExists } from "../../utils/fsSafety/atomicWriteStaging.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  getTerminalPlistPath,
  backupTerminalPreferences,
  markTerminalSetupComplete,
  checkAndRestoreTerminalBackup,
} from "../../utils/appleTerminalBackup.js";
import { isScreenReaderMode } from "../../utils/accessibility/screenReader.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { parseJsonc, modifyJsonc, applyEdits } from "../../../vendor/jsonc-parser/lib/esm/main.js";
import { classifySetupFrame } from "../../services/cloudSessions/setupProgress.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-rvv2d5j7.js:256-441 facade-exports (2.1.88 match: shouldOfferTerminalSetup, 1)
function shouldOfferTerminalSetup() {
  return (
    (platform() === "darwin" && env.terminal === "Apple_Terminal") ||
    env.terminal === "vscode" ||
    env.terminal === "cursor" ||
    env.terminal === "windsurf" ||
    env.terminal === "alacritty" ||
    env.terminal === "zed"
  );
}
//@ chunk-42wa4pww.js:2478-2622 fingerprint (2.1.88 match: NATIVE_CSIU_TERMINALS, 0.87)
/**
 * NATIVE_CSIU_TERMINALS：同旧版。
 */
var NEWLINE = `
`;
var NATIVE_CSIU_TERMINALS = {
  ghostty: "Ghostty",
  kitty: "Kitty",
  "iTerm.app": "iTerm2",
  WezTerm: "WezTerm",
  WarpTerminal: "Warp",
  "windows-terminal": "Windows Terminal",
};
//@ chunk-42wa4pww.js:2622-2933 fingerprint (2.1.88 match: isVSCodeRemoteSSH, 0.885)
function isVSCodeRemoteSSH() {
  let askpassMain = env.VSCODE_GIT_ASKPASS_MAIN ?? "";
  let path = env.PATH ?? "";
  return (
    askpassMain.includes(".vscode-server") ||
    askpassMain.includes(".cursor-server") ||
    askpassMain.includes(".windsurf-server") ||
    askpassMain.includes(".devin-server") ||
    path.includes(".vscode-server") ||
    path.includes(".cursor-server") ||
    path.includes(".windsurf-server") ||
    path.includes(".devin-server")
  );
}
//@ chunk-42wa4pww.js:2933-3024 facade-exports
function getNativeCSIuTerminalDisplayName() {
  if (!env.terminal || !(env.terminal in NATIVE_CSIU_TERMINALS)) return null;
  return NATIVE_CSIU_TERMINALS[env.terminal] ?? null;
}
//@ chunk-42wa4pww.js:3024-3047 layout
function emptySuffix() {
  return "";
}
//@ chunk-42wa4pww.js:3047-3867 facade-exports (2.1.88 match: setupTerminal, 0.804)
async function setupTerminal(host, theme, storageV5) {
  let result = "";
  let anyInstalled = true;
  switch (env.terminal) {
    case "Apple_Terminal":
      result = await enableOptionAsMetaForTerminal(theme, storageV5);
      break;
    case "vscode":
      result = await installBindingsForVSCodeTerminal(host, "VSCode", theme);
      result += await setupShellCompletion(host, "VSCode", theme);
      result += await installVSCodeGpuAccelerationOff(host, "VSCode", theme);
      break;
    case "cursor":
      result = await installBindingsForVSCodeTerminal(host, "Cursor", theme);
      result += await setupShellCompletion(host, "Cursor", theme);
      result += await installVSCodeGpuAccelerationOff(host, "Cursor", theme);
      break;
    case "windsurf":
      result = await installBindingsForVSCodeTerminal(host, "Devin Desktop", theme);
      result += await setupShellCompletion(host, "Devin Desktop", theme);
      result += await installVSCodeGpuAccelerationOff(host, "Devin Desktop", theme);
      break;
    case "alacritty":
      result = await installBindingsForAlacritty(theme);
      break;
    case "zed": {
      let zedResult = await installBindingsForZed(theme);
      result = zedResult.message;
      anyInstalled = zedResult.installed;
      break;
    }
    case null:
      break;
  }
  await saveGlobalConfig((current) => {
    if (anyInstalled && SHIFT_ENTER_BINDING_TERMINALS.includes(env.terminal ?? "")) {
      if (current.shiftEnterKeyBindingInstalled === true) return current;
      return {
        ...current,
        shiftEnterKeyBindingInstalled: true,
      };
    } else if (env.terminal === "Apple_Terminal") {
      if (current.optionAsMetaKeyInstalled === true) return current;
      return {
        ...current,
        optionAsMetaKeyInstalled: true,
      };
    }
    return current;
  }, storageV5);
  return result;
}
//@ chunk-42wa4pww.js:3867-3992 layout
var ITERM_CLIPBOARD_SETTING_PATH =
  'iTerm2 \u2192 Settings \u2192 General \u2192 Selection \u2192 check "Applications in terminal may access clipboard"';
//@ chunk-42wa4pww.js:3992-4778 facade-exports
async function enableITerm2ClipboardAccess(theme) {
  let settingsPathHint = sequential.dim(ITERM_CLIPBOARD_SETTING_PATH);
  try {
    let { stdout, code } = await execFileNoThrow("defaults", [
      "read",
      "com.googlecode.iterm2",
      "AllowClipboardAccess",
    ]);
    if (code === 0 && stdout.trim() === "1")
      return `${color("success", theme)("iTerm2 clipboard access already enabled")}${NEWLINE}${NEWLINE}`;
    let { code: code_2 } = await execFileNoThrow("defaults", [
      "write",
      "com.googlecode.iterm2",
      "AllowClipboardAccess",
      "-bool",
      "true",
    ]);
    if (code_2 !== 0)
      return `${color("warning", theme)("Couldn't update iTerm2 clipboard setting.")}${NEWLINE}${settingsPathHint}${NEWLINE}${NEWLINE}`;
    return `${color("success", theme)('Enabled "Applications in terminal may access clipboard" in iTerm2')}${NEWLINE}${sequential.dim("Restart iTerm2 for this to take effect. Undo: defaults write com.googlecode.iterm2 AllowClipboardAccess -bool false")}${NEWLINE}${NEWLINE}`;
  } catch (error) {
    logError(error);
    return `${color("warning", theme)("Couldn't update iTerm2 clipboard setting.")}${NEWLINE}${settingsPathHint}${NEWLINE}${NEWLINE}`;
  }
}
//@ chunk-42wa4pww.js:4778-4840 facade-exports (2.1.88 match: isShiftEnterKeyBindingInstalled, 1)
function isShiftEnterKeyBindingInstalled() {
  return getGlobalConfig().shiftEnterKeyBindingInstalled === true;
}
//@ chunk-42wa4pww.js:4840-4896 layout
var SHIFT_ENTER_BINDING_TERMINALS = ["vscode", "cursor", "windsurf", "alacritty", "zed"];
//@ chunk-42wa4pww.js:4896-5053 facade-exports
function supportsShiftEnter() {
  if (env.terminal === "Apple_Terminal" && platform() === "darwin") return true;
  if (env.terminal && env.terminal in NATIVE_CSIU_TERMINALS) return true;
  return SHIFT_ENTER_BINDING_TERMINALS.includes(env.terminal ?? "") && isShiftEnterKeyBindingInstalled();
}
//@ chunk-42wa4pww.js:5053-5108 facade-exports (2.1.88 match: hasUsedBackslashReturn, 1)
function hasUsedBackslashReturn() {
  return getGlobalConfig().hasUsedBackslashReturn === true;
}
//@ chunk-42wa4pww.js:5108-5202 facade-exports (2.1.88 match: hasUsedBackslashReturn, 1)
function markBackslashReturnUsed(storageV5) {
  if (!getGlobalConfig().hasUsedBackslashReturn)
    saveGlobalConfig(
      (current) => ({
        ...current,
        hasUsedBackslashReturn: true,
      }),
      storageV5,
    );
}
//@ chunk-42wa4pww.js:5202-6729 facade-exports (2.1.88 match: call, 0.623)
async function call(onDone, context, args) {
  if (
    platform() === "darwin" &&
    env.__CFBundleIdentifier === "com.googlecode.iterm2" &&
    (env.terminal === "iTerm.app" ||
      env.terminal === "tmux" ||
      env.terminal === "screen" ||
      env.terminal === null)
  ) {
    let message = `${await enableITerm2ClipboardAccess(context.options.theme)}Shift+Enter is natively supported in iTerm2.

No configuration needed. Just use Shift+Enter to add newlines.${emptySuffix()}`;
    onDone(message);
    return null;
  }
  if (env.terminal && env.terminal in NATIVE_CSIU_TERMINALS) {
    let message = `Shift+Enter is natively supported in ${NATIVE_CSIU_TERMINALS[env.terminal]}.

No configuration needed. Just use Shift+Enter to add newlines.${emptySuffix()}`;
    onDone(message);
    return null;
  }
  if (!shouldOfferTerminalSetup()) {
    let terminalName = env.terminal || "your current terminal";
    let currentPlatform = getPlatform();
    let platformTerminals = "";
    if (currentPlatform === "macos")
      platformTerminals = `   \u2022 macOS: Apple Terminal
`;
    let remoteITermNote =
      env.LC_TERMINAL === "iTerm2"
        ? `${NEWLINE}${NEWLINE}You appear to be connected from iTerm2 on another machine. For /copy to reach your local clipboard, on that machine open:${NEWLINE}${sequential.dim(ITERM_CLIPBOARD_SETTING_PATH)}`
        : "";
    let message = `Terminal setup cannot be run from ${terminalName}.

This command configures a convenient Shift+Enter shortcut for multi-line prompts.
${sequential.dim("Note: You can already use backslash (\\\\) + return to add newlines.")}

To set up the shortcut (optional):
1. Exit tmux/screen temporarily
2. Run /terminal-setup directly in one of these terminals:
${platformTerminals}   \u2022 IDE: VSCode, Cursor, Devin Desktop, Zed
   \u2022 Other: Alacritty
3. Return to tmux/screen - settings will persist

${sequential.dim("Note: iTerm2, WezTerm, Ghostty, Kitty, Warp, and Windows Terminal support Shift+Enter natively.")}${remoteITermNote}${emptySuffix()}`;
    onDone(message);
    return null;
  }
  let result = await setupTerminal(context.session.host, context.options.theme, context.storageV5);
  onDone(result + emptySuffix());
  return null;
}
//@ chunk-42wa4pww.js:6729-6841 layout
var VSCODE_SCROLL_SENSITIVITY_KEY = "terminal.integrated.mouseWheelScrollSensitivity";
var VSCODE_RECOMMENDED_SCROLL_SENSITIVITY = 3;
var VSCODE_GPU_ACCELERATION_KEY = "terminal.integrated.gpuAcceleration";
var GPU_ACCELERATION_OFF = "off";
//@ chunk-42wa4pww.js:6841-7158 facade-exports
async function readVSCodeScrollSensitivity(host) {
  let vsCodeFamilyName = getVSCodeFamilyName();
  if (!vsCodeFamilyName || isVSCodeRemoteSSH()) return null;
  try {
    let file = await readFile(
      join(await vscodeUserDirectories.of(host).pathFor(vsCodeFamilyName), "settings.json"),
      {
        encoding: "utf-8",
      },
    );
    let jsonc = parseJsonc_2(file);
    let sensitivityValue = isPlainObject(jsonc) ? jsonc[VSCODE_SCROLL_SENSITIVITY_KEY] : undefined;
    return {
      editor: vsCodeFamilyName,
      sensitivity: typeof sensitivityValue === "number" ? sensitivityValue : null,
      recommended: VSCODE_RECOMMENDED_SCROLL_SENSITIVITY,
    };
  } catch (error) {
    if (!isFsInaccessible(error)) logError(error);
    return {
      editor: vsCodeFamilyName,
      sensitivity: null,
      recommended: VSCODE_RECOMMENDED_SCROLL_SENSITIVITY,
    };
  }
}
//@ chunk-42wa4pww.js:7158-7305 layout
function getVSCodeFamilyName() {
  switch (env.terminal) {
    case "vscode":
      return "VSCode";
    case "cursor":
      return "Cursor";
    case "windsurf":
      return "Devin Desktop";
    default:
      return null;
  }
}
//@ chunk-42wa4pww.js:7305-7631 layout
/**
 * 解析 VSCode 系编辑器（VSCode、Devin Desktop/Windsurf 等）的用户配置目录，按平台拼路径，结果按编辑器名与 home 目录缓存。
 */
class VSCodeUserDirResolver {
  pathFor = memoizeAlias(
    async (editorName) => {
      let userDirFor = (folderName) =>
        join(
          homedir(),
          platform() === "win32"
            ? join("AppData", "Roaming", folderName, "User")
            : platform() === "darwin"
              ? join("Library", "Application Support", folderName, "User")
              : join(".config", folderName, "User"),
        );
      if (editorName === "VSCode") return userDirFor("Code");
      if (editorName === "Devin Desktop") {
        let devinDir = userDirFor("Devin");
        return (await pathExists(devinDir)) ? devinDir : userDirFor("Windsurf");
      }
      return userDirFor(editorName);
    },
    (editorName) => `${editorName}:${homedir()}`,
  );
}
//@ chunk-42wa4pww.js:7631-7657 facade-exports
var vscodeUserDirectories; // deferred: uses VSCodeUserDirResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-42wa4pww.js:7631", () => {
  vscodeUserDirectories = new HostScoped(() => new VSCodeUserDirResolver());
});
//@ chunk-42wa4pww.js:8767-10303 facade-exports
async function installVSCodeGpuAccelerationOff(host, editor, theme) {
  let manualHint = sequential.dim(
    `To fix garbled text, set "${VSCODE_GPU_ACCELERATION_KEY}": "${GPU_ACCELERATION_OFF}" in ${editor} settings (undo: set it back to "auto").`,
  );
  if (isVSCodeRemoteSSH()) {
    logFeatureSad("terminal_setup_gpu_accel", "remote_ssh");
    return `${manualHint}${NEWLINE}`;
  }
  let settingsPath = join(await vscodeUserDirectories.of(host).pathFor(editor), "settings.json");
  try {
    let content = "{}";
    let settingsExists = false;
    try {
      content = await readFile(settingsPath, {
        encoding: "utf-8",
      });
      settingsExists = true;
    } catch (error) {
      if (!isFsInaccessible(error)) throw error;
    }
    let jsonc = parseJsonc_2(content);
    if (!isPlainObject(jsonc)) {
      logFeatureSad("terminal_setup_gpu_accel", "not_json_object");
      return `${color("warning", theme)(`${editor} settings.json isn't a JSON object; not modifying it.`)}${NEWLINE}${manualHint}${NEWLINE}`;
    }
    if (jsonc[VSCODE_GPU_ACCELERATION_KEY] === GPU_ACCELERATION_OFF) {
      logFeatureOk("terminal_setup_gpu_accel");
      return `${color("success", theme)(`${editor} GPU acceleration already off; leaving as-is`)}${NEWLINE}${sequential.dim(`See ${settingsPath}`)}${NEWLINE}`;
    }
    let updatedContent = setJsoncProperty(content, VSCODE_GPU_ACCELERATION_KEY, GPU_ACCELERATION_OFF);
    if (updatedContent === content) {
      logFeatureSad("terminal_setup_gpu_accel", "write_failed");
      return `${color("warning", theme)(`Couldn't update ${editor} settings.json.`)}${NEWLINE}${manualHint}${NEWLINE}`;
    }
    if (settingsExists) {
      let backupPath = `${settingsPath}.${randomBytes(4).toString("hex")}.bak`;
      try {
        await copyFile(settingsPath, backupPath);
      } catch {
        logFeatureSad("terminal_setup_gpu_accel", "backup_failed");
        return `${color("warning", theme)(`Couldn't back up ${editor} settings.json; not modifying it.`)}${NEWLINE}${manualHint}${NEWLINE}`;
      }
    }
    await writeFile(settingsPath, updatedContent, {
      encoding: "utf-8",
    });
    logFeatureOk("terminal_setup_gpu_accel");
    return `${color("success", theme)(`Turned off ${editor} GPU acceleration to fix garbled text`)}${NEWLINE}${sequential.dim(`Reload the ${editor} window to apply. Undo: set "${VSCODE_GPU_ACCELERATION_KEY}" back to "auto".`)}${NEWLINE}${sequential.dim(`See ${settingsPath}`)}${NEWLINE}`;
  } catch (error) {
    logFeatureSad("terminal_setup_gpu_accel", "write_failed");
    logForDebugging(
      `Couldn't update ${editor} settings.json at ${settingsPath}: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return `${color("warning", theme)(`Couldn't update ${editor} settings.json.`)}${NEWLINE}${manualHint}${NEWLINE}`;
  }
}
//@ chunk-42wa4pww.js:10303-12236 fingerprint (2.1.88 match: installBindingsForVSCodeTerminal, 0.827)
async function installBindingsForVSCodeTerminal(host, editor = "VSCode", theme) {
  if (isVSCodeRemoteSSH())
    return `${color("warning", theme)(`Cannot install keybindings from a remote ${editor} session.`)}${NEWLINE}${NEWLINE}${editor} keybindings must be installed on your local machine, not the remote server.${NEWLINE}${NEWLINE}To install the Shift+Enter keybinding:${NEWLINE}1. Open ${editor} on your local machine (not connected to remote)${NEWLINE}2. Open the Command Palette (Cmd/Ctrl+Shift+P) \u2192 "Preferences: Open Keyboard Shortcuts (JSON)"${NEWLINE}3. Add this keybinding (the file must be a JSON array):${NEWLINE}${NEWLINE}${sequential.dim(`[
  {
    "key": "shift+enter",
    "command": "workbench.action.terminal.sendSequence",
    "args": { "text": "\\u001b\\r" },
    "when": "terminalFocus"
  }
]`)}${NEWLINE}`;
  let userDir = await vscodeUserDirectories.of(host).pathFor(editor);
  let keybindingsPath = join(userDir, "keybindings.json");
  try {
    await mkdir(userDir, {
      recursive: true,
    });
    let content = "[]";
    let keybindings = [];
    let fileExists = false;
    try {
      content = await readFile(keybindingsPath, {
        encoding: "utf-8",
      });
      fileExists = true;
      keybindings = parseJsonc_2(content) ?? [];
    } catch (e) {
      if (!isFsInaccessible(e)) throw e;
    }
    if (fileExists) {
      let randomSha = randomBytes(4).toString("hex");
      let backupPath = `${keybindingsPath}.${randomSha}.bak`;
      try {
        await copyFile(keybindingsPath, backupPath);
      } catch {
        return `${color("warning", theme)(`Error backing up existing ${editor} terminal keybindings. Bailing out.`)}${NEWLINE}${sequential.dim(`See ${keybindingsPath}`)}${NEWLINE}${sequential.dim(`Backup path: ${backupPath}`)}${NEWLINE}`;
      }
    }
    let newItem = {
      key: "shift+enter",
      command: "workbench.action.terminal.sendSequence",
      args: {
        text: "\x1B\r",
      },
      when: "terminalFocus",
    };
    let existingBinding = keybindings.find(
      (binding) =>
        binding.key === newItem.key && binding.command === newItem.command && binding.when === newItem.when,
    );
    if (existingBinding) {
      let seePathHint = sequential.dim(`See ${keybindingsPath}`);
      if (existingBinding.args?.text === newItem.args.text)
        return `${color("success", theme)(`${editor} terminal Shift+Enter key binding already configured`)}${NEWLINE}${seePathHint}${NEWLINE}`;
      return `${color("warning", theme)(`${editor} already has a Shift+Enter terminal binding with different args; leaving it as-is.`)}${NEWLINE}${seePathHint}${NEWLINE}`;
    }
    let updatedContent = addItemToJSONCArray(content, newItem);
    await writeFile(keybindingsPath, updatedContent, {
      encoding: "utf-8",
    });
    return `${color("success", theme)(`Installed ${editor} terminal Shift+Enter key binding`)}${NEWLINE}${sequential.dim(`See ${keybindingsPath}`)}${NEWLINE}`;
  } catch (error) {
    logForDebugging(
      `Failed to install ${editor} terminal Shift+Enter keybinding: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    throw Error(`Failed to install ${editor} terminal Shift+Enter key binding`);
  }
}
//@ chunk-42wa4pww.js:12236-12622 fingerprint (2.1.88 match: enableOptionAsMetaForProfile, 1)
async function enableOptionAsMetaForProfile(profileName) {
  let { code: addCode } = await execFileNoThrow("/usr/libexec/PlistBuddy", [
    "-c",
    `Add :'Window Settings':'${profileName}':useOptionAsMetaKey bool true`,
    getTerminalPlistPath(),
  ]);
  if (addCode !== 0) {
    let { code: setCode } = await execFileNoThrow("/usr/libexec/PlistBuddy", [
      "-c",
      `Set :'Window Settings':'${profileName}':useOptionAsMetaKey true`,
      getTerminalPlistPath(),
    ]);
    if (setCode !== 0) {
      logForDebugging(`Failed to enable Option as Meta key for Terminal.app profile: ${profileName}`, {
        level: "error",
      });
      return false;
    }
  }
  return true;
}
//@ chunk-42wa4pww.js:12622-12975 fingerprint (2.1.88 match: disableAudioBellForProfile, 1)
async function disableAudioBellForProfile(profileName) {
  let { code: addCode } = await execFileNoThrow("/usr/libexec/PlistBuddy", [
    "-c",
    `Add :'Window Settings':'${profileName}':Bell bool false`,
    getTerminalPlistPath(),
  ]);
  if (addCode !== 0) {
    let { code: setCode } = await execFileNoThrow("/usr/libexec/PlistBuddy", [
      "-c",
      `Set :'Window Settings':'${profileName}':Bell false`,
      getTerminalPlistPath(),
    ]);
    if (setCode !== 0) {
      logForDebugging(`Failed to disable audio bell for Terminal.app profile: ${profileName}`, {
        level: "error",
      });
      return false;
    }
  }
  return true;
}
//@ chunk-42wa4pww.js:12975-15209 fingerprint (2.1.88 match: enableOptionAsMetaForTerminal, 0.816)
async function enableOptionAsMetaForTerminal(theme, storageV5) {
  let supportsShiftReturn = (macOSMajorVersion() ?? 0) >= 27;
  let screenReaderMode = isScreenReaderMode();
  if (supportsShiftReturn && screenReaderMode)
    return `${color("success", theme)("No Terminal.app changes needed.")}${NEWLINE}${sequential.dim("Shift+Return already enters a newline on this macOS version, and screen-reader mode leaves the audible bell setting unchanged.")}${NEWLINE}`;
  try {
    if (!(await backupTerminalPreferences(storageV5)))
      throw Error("Failed to create backup of Terminal.app preferences, bailing out");
    let { stdout: defaultProfile, code: readCode } = await execFileNoThrow("defaults", [
      "read",
      "com.apple.Terminal",
      "Default Window Settings",
    ]);
    if (readCode !== 0 || !defaultProfile.trim()) throw Error("Failed to read default Terminal.app profile");
    let { stdout: startupProfile, code: startupCode } = await execFileNoThrow("defaults", [
      "read",
      "com.apple.Terminal",
      "Startup Window Settings",
    ]);
    if (startupCode !== 0 || !startupProfile.trim())
      throw Error("Failed to read startup Terminal.app profile");
    let wasAnyProfileUpdated = false;
    let defaultProfileName = defaultProfile.trim();
    let optionAsMetaEnabled = supportsShiftReturn
      ? false
      : await enableOptionAsMetaForProfile(defaultProfileName);
    let audioBellDisabled = screenReaderMode ? false : await disableAudioBellForProfile(defaultProfileName);
    if (optionAsMetaEnabled || audioBellDisabled) wasAnyProfileUpdated = true;
    let startupProfileName = startupProfile.trim();
    if (startupProfileName !== defaultProfileName) {
      let startupOptionAsMetaEnabled = supportsShiftReturn
        ? false
        : await enableOptionAsMetaForProfile(startupProfileName);
      let startupAudioBellDisabled = screenReaderMode
        ? false
        : await disableAudioBellForProfile(startupProfileName);
      if (startupOptionAsMetaEnabled || startupAudioBellDisabled) wasAnyProfileUpdated = true;
    }
    if (!wasAnyProfileUpdated) {
      if (supportsShiftReturn) throw Error("Failed to disable audio bell for any Terminal.app profile");
      if (screenReaderMode) throw Error("Failed to enable Option as Meta key for any Terminal.app profile");
      throw Error("Failed to enable Option as Meta key or disable audio bell for any Terminal.app profile");
    }
    await execFileNoThrow("killall", ["cfprefsd"]);
    await markTerminalSetupComplete(storageV5);
    let successLines = [color("success", theme)("Configured Terminal.app settings:")];
    if (!supportsShiftReturn)
      successLines.push(color("success", theme)('- Enabled "Use Option as Meta key"'));
    if (!screenReaderMode) successLines.push(color("success", theme)("- Disabled the audible bell"));
    else
      successLines.push(
        sequential.dim("- Left the audible bell setting unchanged (screen-reader mode uses it)"),
      );
    let newlineHint = supportsShiftReturn
      ? sequential.dim("Shift+Return will now enter a newline.")
      : sequential.dim("Option+Enter will now enter a newline.");
    return `${successLines.join(NEWLINE)}${NEWLINE}${newlineHint}${NEWLINE}${sequential.dim("You must restart Terminal.app for changes to take effect.")}${NEWLINE}`;
  } catch (error) {
    logForDebugging(`Terminal.app setup failed: ${error instanceof Error ? error.message : String(error)}`, {
      level: "error",
    });
    let restoreResult = await checkAndRestoreTerminalBackup(storageV5);
    let errorMessage = supportsShiftReturn
      ? "Failed to disable the audio bell for Terminal.app."
      : "Failed to enable Option as Meta key for Terminal.app.";
    if (restoreResult.status === "restored")
      throw Error(`${errorMessage} Your settings have been restored from backup.`);
    else if (restoreResult.status === "failed")
      throw Error(
        `${errorMessage} Restoring from backup failed, try manually with: defaults import com.apple.Terminal ${restoreResult.backupPath}`,
      );
    else throw Error(`${errorMessage} No backup was available to restore from.`);
  }
}
//@ chunk-42wa4pww.js:15209-16609 fingerprint (2.1.88 match: installBindingsForAlacritty, 0.944)
async function installBindingsForAlacritty(theme) {
  let configPaths = [];
  let xdgConfigHome = env.XDG_CONFIG_HOME;
  if (xdgConfigHome) configPaths.push(join(xdgConfigHome, "alacritty", "alacritty.toml"));
  else configPaths.push(join(homedir(), ".config", "alacritty", "alacritty.toml"));
  if (platform() === "win32") {
    let appData = env.APPDATA;
    if (appData) configPaths.push(join(appData, "alacritty", "alacritty.toml"));
  }
  let configPath = null;
  let configContent = "";
  let configExists = false;
  for (let path of configPaths)
    try {
      configContent = await readFile(path, {
        encoding: "utf-8",
      });
      configPath = path;
      configExists = true;
      break;
    } catch (e) {
      if (!isFsInaccessible(e)) throw e;
    }
  if (!configPath) configPath = configPaths[0] ?? null;
  if (!configPath) throw Error("No valid config path found for Alacritty");
  try {
    if (configExists) {
      if (configContent.includes('mods = "Shift"') && configContent.includes('key = "Return"'))
        return `${color("success", theme)("Alacritty Shift+Enter key binding already configured")}${NEWLINE}${sequential.dim(`See ${configPath}`)}${NEWLINE}`;
      let randomSha = randomBytes(4).toString("hex");
      let backupPath = `${configPath}.${randomSha}.bak`;
      try {
        await copyFile(configPath, backupPath);
      } catch {
        return `${color("warning", theme)("Error backing up existing Alacritty config. Bailing out.")}${NEWLINE}${sequential.dim(`See ${configPath}`)}${NEWLINE}${sequential.dim(`Backup path: ${backupPath}`)}${NEWLINE}`;
      }
    } else
      await mkdir(dirname(configPath), {
        recursive: true,
      });
    let updatedContent = configContent;
    if (
      configContent &&
      !configContent.endsWith(`
`)
    )
      updatedContent += `
`;
    updatedContent += `
[[keyboard.bindings]]
key = "Return"
mods = "Shift"
chars = "\\u001B\\r"
`;
    await writeFile(configPath, updatedContent, {
      encoding: "utf-8",
    });
    return `${color("success", theme)("Installed Alacritty Shift+Enter key binding")}${NEWLINE}${color("success", theme)("You may need to restart Alacritty for changes to take effect")}${NEWLINE}${sequential.dim(`See ${configPath}`)}${NEWLINE}`;
  } catch (error) {
    logForDebugging(
      `Failed to install Alacritty keybinding: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    throw Error("Failed to install Alacritty Shift+Enter key binding");
  }
}
//@ chunk-42wa4pww.js:16609-16648 layout
var ZED_SHIFT_ENTER_ACTION = ["terminal::SendText", "\x1B\r"];
//@ chunk-42wa4pww.js:16648-16742 layout
function isZedTerminalShiftEnterBinding(keymapEntry) {
  return (
    isPlainObject(keymapEntry) &&
    keymapEntry.context === "Terminal" &&
    isPlainObject(keymapEntry.bindings) &&
    "shift-enter" in keymapEntry.bindings
  );
}
//@ chunk-42wa4pww.js:16742-19065 fingerprint (2.1.88 match: installBindingsForZed, 0.572)
async function installBindingsForZed(theme) {
  let XDG_CONFIG_HOME = getPlatform() === "linux" ? env.XDG_CONFIG_HOME : undefined;
  let zedDir = XDG_CONFIG_HOME ? join(XDG_CONFIG_HOME, "zed") : join(homedir(), ".config", "zed");
  let keymapPath = join(zedDir, "keymap.json");
  let seePathHint = sequential.dim(`See ${keymapPath}`);
  let manualHint = sequential.dim(
    `To add the binding yourself, add this block to the keymap array in ${keymapPath}:${NEWLINE}{ "context": "Terminal", "bindings": { "shift-enter": ["terminal::SendText", "\\u001b\\r"] } }`,
  );
  let message = `${color("success", theme)("Installed Zed Shift+Enter key binding")}${NEWLINE}${seePathHint}${NEWLINE}`;
  let message_2 = `${color("warning", theme)("Couldn't read your Zed keymap, so it was left unchanged.")}${NEWLINE}${manualHint}${NEWLINE}`;
  let message_3 = `${color("warning", theme)("Your Zed keymap isn't a readable list of keybindings, so it was left unchanged.")}${NEWLINE}${manualHint}${NEWLINE}`;
  try {
    await mkdir(zedDir, {
      recursive: true,
    });
    let existingText = null;
    try {
      existingText = await readFile(keymapPath, {
        encoding: "utf-8",
      });
    } catch (error) {
      if (!isFsInaccessible(error)) throw error;
      if (!isENOENT(error))
        return {
          message: message_2,
          installed: false,
        };
    }
    if (existingText === null || stripBom(existingText).trim() === "") {
      await writeFileAtomic(
        keymapPath,
        jsonStringify(
          [
            {
              context: "Terminal",
              bindings: {
                "shift-enter": ZED_SHIFT_ENTER_ACTION,
              },
            },
          ],
          null,
          2,
        ) +
          `
`,
      );
      return {
        message,
        installed: true,
      };
    }
    let parseErrors = [];
    let text = stripBom(existingText);
    let keymap = parseJsonc(text, parseErrors, {
      allowTrailingComma: true,
    });
    if (parseErrors.length > 0 || !Array.isArray(keymap))
      return {
        message: message_3,
        installed: false,
      };
    if (keymap.some(isZedTerminalShiftEnterBinding))
      return {
        message: `${color("success", theme)("Zed Shift+Enter key binding already configured")}${NEWLINE}${seePathHint}${NEWLINE}`,
        installed: true,
      };
    let randomSha = randomBytes(4).toString("hex");
    let backupPath = `${keymapPath}.${randomSha}.bak`;
    try {
      await copyFile(keymapPath, backupPath);
    } catch (error) {
      logForDebugging(
        `Failed to back up Zed keymap: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "error",
        },
      );
      return {
        message: `${color("warning", theme)("Couldn't back up your Zed keymap; not modifying it.")}${NEWLINE}${manualHint}${NEWLINE}`,
        installed: false,
      };
    }
    let index = keymap.findIndex(
      (entry) => isPlainObject(entry) && entry.context === "Terminal" && isPlainObject(entry.bindings),
    );
    let formattingOptions = {
      insertSpaces: true,
      tabSize: 2,
    };
    let updatedText = null;
    try {
      let edits =
        index >= 0
          ? modifyJsonc(text, [index, "bindings", "shift-enter"], ZED_SHIFT_ENTER_ACTION, {
              formattingOptions,
            })
          : modifyJsonc(
              text,
              [keymap.length],
              {
                context: "Terminal",
                bindings: {
                  "shift-enter": ZED_SHIFT_ENTER_ACTION,
                },
              },
              {
                formattingOptions,
                isArrayInsertion: true,
              },
            );
      updatedText = edits.length > 0 ? applyEdits(text, edits) : null;
    } catch (error) {
      logForDebugging(
        `Failed to edit Zed keymap: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "error",
        },
      );
    }
    let verifyErrors = [];
    let verified =
      updatedText === null
        ? null
        : parseJsonc(updatedText, verifyErrors, {
            allowTrailingComma: true,
          });
    if (
      updatedText === null ||
      verifyErrors.length > 0 ||
      !Array.isArray(verified) ||
      !verified.some(isZedTerminalShiftEnterBinding)
    )
      return {
        message: `${color("warning", theme)("Couldn't update your Zed keymap, so it was left unchanged.")}${NEWLINE}${manualHint}${NEWLINE}`,
        installed: false,
      };
    await writeFileAtomic(keymapPath, updatedText);
    return {
      message,
      installed: true,
    };
  } catch (error) {
    logForDebugging(
      `Failed to install Zed Shift+Enter key binding: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    throw Error("Failed to install Zed Shift+Enter key binding");
  }
}
//@ chunk-qqnmjrpr.js:2017-2106 fingerprint (2.1.88 match: getNativeCSIuTerminalDisplayName, 0.582)
function getNativeCSIuTerminalDisplayName_2(currentSetup, frame) {
  if (currentSetup === null || !currentSetup.hasStructuredSteps || currentSetup.terminal) return null;
  return classifySetupFrame(frame);
}
export {
  supportsShiftEnter,
  hasUsedBackslashReturn,
  VSCODE_SCROLL_SENSITIVITY_KEY,
  VSCODE_RECOMMENDED_SCROLL_SENSITIVITY,
  isVSCodeRemoteSSH,
  NEWLINE,
  vscodeUserDirectories,
  markBackslashReturnUsed,
  shouldOfferTerminalSetup,
  readVSCodeScrollSensitivity,
  getNativeCSIuTerminalDisplayName,
  getNativeCSIuTerminalDisplayName_2,
  setupTerminal,
  call,
  enableITerm2ClipboardAccess,
  installVSCodeGpuAccelerationOff,
  isShiftEnterKeyBindingInstalled,
};
