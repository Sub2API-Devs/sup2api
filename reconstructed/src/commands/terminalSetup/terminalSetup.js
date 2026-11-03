/**
 * commands/terminalSetup/terminalSetup.tsx
 *
 * /terminal-setup 实现：各终端 Shift+Enter 绑定、iTerm/VSCode/Zed 配置、Apple Terminal Option 键
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/terminalSetup/terminalSetup.tsx
 * pieces: chunk-7p2hc4jn.js (27), chunk-e6aww6q8.js (1), chunk-xafnw064.js (1)
 * attribution: fingerprint 9, facade-exports 12, layout 8
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
import { getPlatform, JMi } from "../../utils/platform.js";
import { parseJsonc, setJsoncProperty, addItemToJSONCArray, Wo } from "../../utils/json.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { isFsInaccessible, isENOENT } from "../../utils/errors.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
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
import { b8e, KOn, Wbr } from "../../../vendor/jsonc-parser/lib/esm/main.js";
import { hT, tx, isVSCodeIde } from "../../utils/ide.js";

/**
 * NATIVE_CSIU_TERMINALS：同旧版。
 */
//@ chunk-7p2hc4jn.js:2478-2622 fingerprint = NATIVE_CSIU_TERMINALS (0.87)
var NEWLINE = `
`,
  NATIVE_CSIU_TERMINALS = {
    ghostty: "Ghostty",
    kitty: "Kitty",
    "iTerm.app": "iTerm2",
    WezTerm: "WezTerm",
    WarpTerminal: "Warp",
    "windows-terminal": "Windows Terminal",
  };
//@ chunk-7p2hc4jn.js:2622-2933 fingerprint = isVSCodeRemoteSSH (0.885)
function isVSCodeRemoteSSH() {
  let e = env.VSCODE_GIT_ASKPASS_MAIN ?? "",
    r = env.PATH ?? "";
  return (
    e.includes(".vscode-server") ||
    e.includes(".cursor-server") ||
    e.includes(".windsurf-server") ||
    e.includes(".devin-server") ||
    r.includes(".vscode-server") ||
    r.includes(".cursor-server") ||
    r.includes(".windsurf-server") ||
    r.includes(".devin-server")
  );
}
//@ chunk-7p2hc4jn.js:2933-3024 facade-exports
function getNativeCSIuTerminalDisplayName() {
  if (!env.terminal || !(env.terminal in NATIVE_CSIU_TERMINALS)) return null;
  return NATIVE_CSIU_TERMINALS[env.terminal] ?? null;
}
//@ chunk-7p2hc4jn.js:3024-3047 layout
function Ze() {
  return "";
}
//@ chunk-7p2hc4jn.js:3047-3867 facade-exports = setupTerminal (0.804)
async function setupTerminal(e, r, n) {
  let result = "",
    o = !0;
  switch (env.terminal) {
    case "Apple_Terminal":
      result = await enableOptionAsMetaForTerminal(r, n);
      break;
    case "vscode":
      ((result = await installBindingsForVSCodeTerminal(e, "VSCode", r)),
        (result += await setupShellCompletion(e, "VSCode", r)),
        (result += await installVSCodeGpuAccelerationOff(e, "VSCode", r)));
      break;
    case "cursor":
      ((result = await installBindingsForVSCodeTerminal(e, "Cursor", r)),
        (result += await setupShellCompletion(e, "Cursor", r)),
        (result += await installVSCodeGpuAccelerationOff(e, "Cursor", r)));
      break;
    case "windsurf":
      ((result = await installBindingsForVSCodeTerminal(e, "Devin Desktop", r)),
        (result += await setupShellCompletion(e, "Devin Desktop", r)),
        (result += await installVSCodeGpuAccelerationOff(e, "Devin Desktop", r)));
      break;
    case "alacritty":
      result = await installBindingsForAlacritty(r);
      break;
    case "zed": {
      let u = await installBindingsForZed(r);
      ((result = u.message), (o = u.installed));
      break;
    }
    case null:
      break;
  }
  return (
    await saveGlobalConfig((current) => {
      if (o && SHIFT_ENTER_BINDING_TERMINALS.includes(env.terminal ?? "")) {
        if (current.shiftEnterKeyBindingInstalled === !0) return current;
        return { ...current, shiftEnterKeyBindingInstalled: !0 };
      } else if (env.terminal === "Apple_Terminal") {
        if (current.optionAsMetaKeyInstalled === !0) return current;
        return { ...current, optionAsMetaKeyInstalled: !0 };
      }
      return current;
    }, n),
    result
  );
}
//@ chunk-7p2hc4jn.js:3867-3992 layout
var ITERM_CLIPBOARD_SETTING_PATH =
  'iTerm2 \u2192 Settings \u2192 General \u2192 Selection \u2192 check "Applications in terminal may access clipboard"';
//@ chunk-7p2hc4jn.js:3992-4778 facade-exports
async function enableITerm2ClipboardAccess(e) {
  let dim = sequential.dim(ITERM_CLIPBOARD_SETTING_PATH);
  try {
    let { stdout: stdout, code: code } = await execFileNoThrow("defaults", [
      "read",
      "com.googlecode.iterm2",
      "AllowClipboardAccess",
    ]);
    if (code === 0 && stdout.trim() === "1")
      return `${color("success", e)("iTerm2 clipboard access already enabled")}${NEWLINE}${NEWLINE}`;
    let { code: code_2 } = await execFileNoThrow("defaults", [
      "write",
      "com.googlecode.iterm2",
      "AllowClipboardAccess",
      "-bool",
      "true",
    ]);
    if (code_2 !== 0)
      return `${color("warning", e)("Couldn't update iTerm2 clipboard setting.")}${NEWLINE}${dim}${NEWLINE}${NEWLINE}`;
    return `${color("success", e)('Enabled "Applications in terminal may access clipboard" in iTerm2')}${NEWLINE}${sequential.dim("Restart iTerm2 for this to take effect. Undo: defaults write com.googlecode.iterm2 AllowClipboardAccess -bool false")}${NEWLINE}${NEWLINE}`;
  } catch (error) {
    return (
      logError(error),
      `${color("warning", e)("Couldn't update iTerm2 clipboard setting.")}${NEWLINE}${dim}${NEWLINE}${NEWLINE}`
    );
  }
}
//@ chunk-7p2hc4jn.js:4778-4840 facade-exports = isShiftEnterKeyBindingInstalled (1)
function isShiftEnterKeyBindingInstalled() {
  return getGlobalConfig().shiftEnterKeyBindingInstalled === !0;
}
//@ chunk-7p2hc4jn.js:4840-4896 layout
var SHIFT_ENTER_BINDING_TERMINALS = ["vscode", "cursor", "windsurf", "alacritty", "zed"];
//@ chunk-7p2hc4jn.js:4896-5053 facade-exports
function supportsShiftEnter() {
  if (env.terminal === "Apple_Terminal" && platform() === "darwin") return !0;
  if (env.terminal && env.terminal in NATIVE_CSIU_TERMINALS) return !0;
  return SHIFT_ENTER_BINDING_TERMINALS.includes(env.terminal ?? "") && isShiftEnterKeyBindingInstalled();
}
//@ chunk-7p2hc4jn.js:5053-5108 facade-exports = hasUsedBackslashReturn (1)
function hasUsedBackslashReturn() {
  return getGlobalConfig().hasUsedBackslashReturn === !0;
}
//@ chunk-7p2hc4jn.js:5108-5202 facade-exports = hasUsedBackslashReturn (1)
function markBackslashReturnUsed(e) {
  if (!getGlobalConfig().hasUsedBackslashReturn)
    saveGlobalConfig((n) => ({ ...n, hasUsedBackslashReturn: !0 }), e);
}
//@ chunk-7p2hc4jn.js:5202-6729 facade-exports = call (0.623)
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

No configuration needed. Just use Shift+Enter to add newlines.${Ze()}`;
    return (onDone(message), null);
  }
  if (env.terminal && env.terminal in NATIVE_CSIU_TERMINALS) {
    let o = `Shift+Enter is natively supported in ${NATIVE_CSIU_TERMINALS[env.terminal]}.

No configuration needed. Just use Shift+Enter to add newlines.${Ze()}`;
    return (onDone(o), null);
  }
  if (!shouldOfferTerminalSetup()) {
    let terminalName = env.terminal || "your current terminal",
      currentPlatform = getPlatform(),
      platformTerminals = "";
    if (currentPlatform === "macos")
      platformTerminals = `   \u2022 macOS: Apple Terminal
`;
    let h =
        env.LC_TERMINAL === "iTerm2"
          ? `${NEWLINE}${NEWLINE}You appear to be connected from iTerm2 on another machine. For /copy to reach your local clipboard, on that machine open:${NEWLINE}${sequential.dim(ITERM_CLIPBOARD_SETTING_PATH)}`
          : "",
      message = `Terminal setup cannot be run from ${terminalName}.

This command configures a convenient Shift+Enter shortcut for multi-line prompts.
${sequential.dim("Note: You can already use backslash (\\\\) + return to add newlines.")}

To set up the shortcut (optional):
1. Exit tmux/screen temporarily
2. Run /terminal-setup directly in one of these terminals:
${platformTerminals}   \u2022 IDE: VSCode, Cursor, Devin Desktop, Zed
   \u2022 Other: Alacritty
3. Return to tmux/screen - settings will persist

${sequential.dim("Note: iTerm2, WezTerm, Ghostty, Kitty, Warp, and Windows Terminal support Shift+Enter natively.")}${h}${Ze()}`;
    return (onDone(message), null);
  }
  let s = await setupTerminal(context.session.host, context.options.theme, context.storageV5);
  return (onDone(s + Ze()), null);
}
//@ chunk-7p2hc4jn.js:6729-6841 layout
var VSCODE_SCROLL_SENSITIVITY_KEY = "terminal.integrated.mouseWheelScrollSensitivity",
  We = 3,
  VSCODE_GPU_ACCELERATION_KEY = "terminal.integrated.gpuAcceleration",
  GPU_ACCELERATION_OFF = "off";
//@ chunk-7p2hc4jn.js:6841-7158 facade-exports
async function readVSCodeScrollSensitivity(e) {
  let r = getVSCodeFamilyName();
  if (!r || isVSCodeRemoteSSH()) return null;
  try {
    let n = await readFile(join(await vscodeUserDirectories.of(e).pathFor(r), "settings.json"), {
        encoding: "utf-8",
      }),
      s = parseJsonc(n),
      o = isPlainObject(s) ? s[VSCODE_SCROLL_SENSITIVITY_KEY] : void 0;
    return { editor: r, sensitivity: typeof o === "number" ? o : null, recommended: We };
  } catch (error) {
    if (!isFsInaccessible(error)) logError(error);
    return { editor: r, sensitivity: null, recommended: We };
  }
}
//@ chunk-7p2hc4jn.js:7158-7305 layout
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
/**
 * 解析 VSCode 系编辑器（VSCode、Devin Desktop/Windsurf 等）的用户配置目录，按平台拼路径，结果按编辑器名与 home 目录缓存。
 */
//@ chunk-7p2hc4jn.js:7305-7631 layout
class VSCodeUserDirResolver {
  pathFor = io(
    async (e) => {
      let r = (n) =>
        join(
          homedir(),
          platform() === "win32"
            ? join("AppData", "Roaming", n, "User")
            : platform() === "darwin"
              ? join("Library", "Application Support", n, "User")
              : join(".config", n, "User"),
        );
      if (e === "VSCode") return r("Code");
      if (e === "Devin Desktop") {
        let n = r("Devin");
        return (await pathExists(n)) ? n : r("Windsurf");
      }
      return r(e);
    },
    (e) => `${e}:${homedir()}`,
  );
}
//@ chunk-7p2hc4jn.js:7631-7657 facade-exports
var vscodeUserDirectories = new HostScoped(() => new VSCodeUserDirResolver());
//@ chunk-7p2hc4jn.js:8767-10303 facade-exports
async function installVSCodeGpuAccelerationOff(e, r, n) {
  let dim = sequential.dim(
    `To fix garbled text, set "${VSCODE_GPU_ACCELERATION_KEY}": "${GPU_ACCELERATION_OFF}" in ${r} settings (undo: set it back to "auto").`,
  );
  if (isVSCodeRemoteSSH())
    return (logFeatureSad("terminal_setup_gpu_accel", "remote_ssh"), `${dim}${NEWLINE}`);
  let o = join(await vscodeUserDirectories.of(e).pathFor(r), "settings.json");
  try {
    let u = "{}",
      d = !1;
    try {
      ((u = await readFile(o, { encoding: "utf-8" })), (d = !0));
    } catch (error) {
      if (!isFsInaccessible(error)) throw error;
    }
    let h = parseJsonc(u);
    if (!isPlainObject(h))
      return (
        logFeatureSad("terminal_setup_gpu_accel", "not_json_object"),
        `${color("warning", n)(`${r} settings.json isn't a JSON object; not modifying it.`)}${NEWLINE}${dim}${NEWLINE}`
      );
    if (h[VSCODE_GPU_ACCELERATION_KEY] === GPU_ACCELERATION_OFF)
      return (
        logFeatureOk("terminal_setup_gpu_accel"),
        `${color("success", n)(`${r} GPU acceleration already off; leaving as-is`)}${NEWLINE}${sequential.dim(`See ${o}`)}${NEWLINE}`
      );
    let x = setJsoncProperty(u, VSCODE_GPU_ACCELERATION_KEY, GPU_ACCELERATION_OFF);
    if (x === u)
      return (
        logFeatureSad("terminal_setup_gpu_accel", "write_failed"),
        `${color("warning", n)(`Couldn't update ${r} settings.json.`)}${NEWLINE}${dim}${NEWLINE}`
      );
    if (d) {
      let T = `${o}.${randomBytes(4).toString("hex")}.bak`;
      try {
        await copyFile(o, T);
      } catch {
        return (
          logFeatureSad("terminal_setup_gpu_accel", "backup_failed"),
          `${color("warning", n)(`Couldn't back up ${r} settings.json; not modifying it.`)}${NEWLINE}${dim}${NEWLINE}`
        );
      }
    }
    return (
      await writeFile(o, x, { encoding: "utf-8" }),
      logFeatureOk("terminal_setup_gpu_accel"),
      `${color("success", n)(`Turned off ${r} GPU acceleration to fix garbled text`)}${NEWLINE}${sequential.dim(`Reload the ${r} window to apply. Undo: set "${VSCODE_GPU_ACCELERATION_KEY}" back to "auto".`)}${NEWLINE}${sequential.dim(`See ${o}`)}${NEWLINE}`
    );
  } catch (error) {
    return (
      logFeatureSad("terminal_setup_gpu_accel", "write_failed"),
      logForDebugging(
        `Couldn't update ${r} settings.json at ${o}: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      `${color("warning", n)(`Couldn't update ${r} settings.json.`)}${NEWLINE}${dim}${NEWLINE}`
    );
  }
}
//@ chunk-7p2hc4jn.js:10303-12236 fingerprint = installBindingsForVSCodeTerminal (0.827)
async function installBindingsForVSCodeTerminal(e, r = "VSCode", n) {
  if (isVSCodeRemoteSSH())
    return `${color("warning", n)(`Cannot install keybindings from a remote ${r} session.`)}${NEWLINE}${NEWLINE}${r} keybindings must be installed on your local machine, not the remote server.${NEWLINE}${NEWLINE}To install the Shift+Enter keybinding:${NEWLINE}1. Open ${r} on your local machine (not connected to remote)${NEWLINE}2. Open the Command Palette (Cmd/Ctrl+Shift+P) \u2192 "Preferences: Open Keyboard Shortcuts (JSON)"${NEWLINE}3. Add this keybinding (the file must be a JSON array):${NEWLINE}${NEWLINE}${sequential.dim(`[
  {
    "key": "shift+enter",
    "command": "workbench.action.terminal.sendSequence",
    "args": { "text": "\\u001b\\r" },
    "when": "terminalFocus"
  }
]`)}${NEWLINE}`;
  let pathFor = await vscodeUserDirectories.of(e).pathFor(r),
    keybindingsPath = join(pathFor, "keybindings.json");
  try {
    await mkdir(pathFor, { recursive: !0 });
    let content = "[]",
      keybindings = [],
      h = !1;
    try {
      ((content = await readFile(keybindingsPath, { encoding: "utf-8" })),
        (h = !0),
        (keybindings = parseJsonc(content) ?? []));
    } catch (error) {
      if (!isFsInaccessible(error)) throw error;
    }
    if (h) {
      let randomSha = randomBytes(4).toString("hex"),
        backupPath = `${keybindingsPath}.${randomSha}.bak`;
      try {
        await copyFile(keybindingsPath, backupPath);
      } catch {
        return `${color("warning", n)(`Error backing up existing ${r} terminal keybindings. Bailing out.`)}${NEWLINE}${sequential.dim(`See ${keybindingsPath}`)}${NEWLINE}${sequential.dim(`Backup path: ${backupPath}`)}${NEWLINE}`;
      }
    }
    let x = {
        key: "shift+enter",
        command: "workbench.action.terminal.sendSequence",
        args: { text: "\x1B\r" },
        when: "terminalFocus",
      },
      existingBinding = keybindings.find(
        (binding) => binding.key === x.key && binding.command === x.command && binding.when === x.when,
      );
    if (existingBinding) {
      let dim = sequential.dim(`See ${keybindingsPath}`);
      if (existingBinding.args?.text === x.args.text)
        return `${color("success", n)(`${r} terminal Shift+Enter key binding already configured`)}${NEWLINE}${dim}${NEWLINE}`;
      return `${color("warning", n)(`${r} already has a Shift+Enter terminal binding with different args; leaving it as-is.`)}${NEWLINE}${dim}${NEWLINE}`;
    }
    let updatedContent = addItemToJSONCArray(content, x);
    return (
      await writeFile(keybindingsPath, updatedContent, { encoding: "utf-8" }),
      `${color("success", n)(`Installed ${r} terminal Shift+Enter key binding`)}${NEWLINE}${sequential.dim(`See ${keybindingsPath}`)}${NEWLINE}`
    );
  } catch (error) {
    throw (
      logForDebugging(
        `Failed to install ${r} terminal Shift+Enter keybinding: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      Error(`Failed to install ${r} terminal Shift+Enter key binding`)
    );
  }
}
//@ chunk-7p2hc4jn.js:12236-12622 fingerprint = enableOptionAsMetaForProfile (1)
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
    if (setCode !== 0)
      return (
        logForDebugging(`Failed to enable Option as Meta key for Terminal.app profile: ${profileName}`, {
          level: "error",
        }),
        !1
      );
  }
  return !0;
}
//@ chunk-7p2hc4jn.js:12622-12975 fingerprint = disableAudioBellForProfile (1)
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
    if (setCode !== 0)
      return (
        logForDebugging(`Failed to disable audio bell for Terminal.app profile: ${profileName}`, {
          level: "error",
        }),
        !1
      );
  }
  return !0;
}
//@ chunk-7p2hc4jn.js:12975-15209 fingerprint = enableOptionAsMetaForTerminal (0.816)
async function enableOptionAsMetaForTerminal(e, r) {
  let n = (JMi() ?? 0) >= 27,
    s = isScreenReaderMode();
  if (n && s)
    return `${color("success", e)("No Terminal.app changes needed.")}${NEWLINE}${sequential.dim("Shift+Return already enters a newline on this macOS version, and screen-reader mode leaves the audible bell setting unchanged.")}${NEWLINE}`;
  try {
    if (!(await backupTerminalPreferences(r)))
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
    let T = !1,
      defaultProfileName = defaultProfile.trim(),
      A = n ? !1 : await enableOptionAsMetaForProfile(defaultProfileName),
      F = s ? !1 : await disableAudioBellForProfile(defaultProfileName);
    if (A || F) T = !0;
    let startupProfileName = startupProfile.trim();
    if (startupProfileName !== defaultProfileName) {
      let fe = n ? !1 : await enableOptionAsMetaForProfile(startupProfileName),
        H = s ? !1 : await disableAudioBellForProfile(startupProfileName);
      if (fe || H) T = !0;
    }
    if (!T) {
      if (n) throw Error("Failed to disable audio bell for any Terminal.app profile");
      if (s) throw Error("Failed to enable Option as Meta key for any Terminal.app profile");
      throw Error("Failed to enable Option as Meta key or disable audio bell for any Terminal.app profile");
    }
    (await execFileNoThrow("killall", ["cfprefsd"]), await markTerminalSetupComplete(r));
    let Z = [color("success", e)("Configured Terminal.app settings:")];
    if (!n) Z.push(color("success", e)('- Enabled "Use Option as Meta key"'));
    if (!s) Z.push(color("success", e)("- Disabled the audible bell"));
    else Z.push(sequential.dim("- Left the audible bell setting unchanged (screen-reader mode uses it)"));
    let ee = n
      ? sequential.dim("Shift+Return will now enter a newline.")
      : sequential.dim("Option+Enter will now enter a newline.");
    return `${Z.join(NEWLINE)}${NEWLINE}${ee}${NEWLINE}${sequential.dim("You must restart Terminal.app for changes to take effect.")}${NEWLINE}`;
  } catch (error) {
    logForDebugging(`Terminal.app setup failed: ${error instanceof Error ? error.message : String(error)}`, {
      level: "error",
    });
    let startupOptionAsMetaEnabled = await checkAndRestoreTerminalBackup(r),
      d = n
        ? "Failed to disable the audio bell for Terminal.app."
        : "Failed to enable Option as Meta key for Terminal.app.";
    if (startupOptionAsMetaEnabled.status === "restored")
      throw Error(`${d} Your settings have been restored from backup.`);
    else if (startupOptionAsMetaEnabled.status === "failed")
      throw Error(
        `${d} Restoring from backup failed, try manually with: defaults import com.apple.Terminal ${startupOptionAsMetaEnabled.backupPath}`,
      );
    else throw Error(`${d} No backup was available to restore from.`);
  }
}
//@ chunk-7p2hc4jn.js:15209-16609 fingerprint = installBindingsForAlacritty (0.944)
async function installBindingsForAlacritty(theme) {
  let configPaths = [],
    xdgConfigHome = env.XDG_CONFIG_HOME;
  if (xdgConfigHome) configPaths.push(join(xdgConfigHome, "alacritty", "alacritty.toml"));
  else configPaths.push(join(homedir(), ".config", "alacritty", "alacritty.toml"));
  if (platform() === "win32") {
    let appData = env.APPDATA;
    if (appData) configPaths.push(join(appData, "alacritty", "alacritty.toml"));
  }
  let configPath = null,
    configContent = "",
    d = !1;
  for (let path of configPaths)
    try {
      ((configContent = await readFile(path, { encoding: "utf-8" })), (configPath = path), (d = !0));
      break;
    } catch (error) {
      if (!isFsInaccessible(error)) throw error;
    }
  if (!configPath) configPath = configPaths[0] ?? null;
  if (!configPath) throw Error("No valid config path found for Alacritty");
  try {
    if (d) {
      if (configContent.includes('mods = "Shift"') && configContent.includes('key = "Return"'))
        return `${color("success", theme)("Alacritty Shift+Enter key binding already configured")}${NEWLINE}${sequential.dim(`See ${configPath}`)}${NEWLINE}`;
      let randomSha = randomBytes(4).toString("hex"),
        backupPath = `${configPath}.${randomSha}.bak`;
      try {
        await copyFile(configPath, backupPath);
      } catch {
        return `${color("warning", theme)("Error backing up existing Alacritty config. Bailing out.")}${NEWLINE}${sequential.dim(`See ${configPath}`)}${NEWLINE}${sequential.dim(`Backup path: ${backupPath}`)}${NEWLINE}`;
      }
    } else await mkdir(dirname(configPath), { recursive: !0 });
    let updatedContent = configContent;
    if (
      configContent &&
      !configContent.endsWith(`
`)
    )
      updatedContent += `
`;
    return (
      (updatedContent += `
[[keyboard.bindings]]
key = "Return"
mods = "Shift"
chars = "\\u001B\\r"
`),
      await writeFile(configPath, updatedContent, { encoding: "utf-8" }),
      `${color("success", theme)("Installed Alacritty Shift+Enter key binding")}${NEWLINE}${color("success", theme)("You may need to restart Alacritty for changes to take effect")}${NEWLINE}${sequential.dim(`See ${configPath}`)}${NEWLINE}`
    );
  } catch (error) {
    throw (
      logForDebugging(
        `Failed to install Alacritty keybinding: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      Error("Failed to install Alacritty Shift+Enter key binding")
    );
  }
}
//@ chunk-7p2hc4jn.js:16609-16648 layout
var ZED_SHIFT_ENTER_ACTION = ["terminal::SendText", "\x1B\r"];
//@ chunk-7p2hc4jn.js:16648-16742 layout
function isZedTerminalShiftEnterBinding(e) {
  return (
    isPlainObject(e) && e.context === "Terminal" && isPlainObject(e.bindings) && "shift-enter" in e.bindings
  );
}
//@ chunk-7p2hc4jn.js:16742-19065 fingerprint = installBindingsForZed (0.572)
async function installBindingsForZed(theme) {
  let r = getPlatform() === "linux" ? env.XDG_CONFIG_HOME : void 0,
    n = r ? join(r, "zed") : join(homedir(), ".config", "zed"),
    keymapPath = join(n, "keymap.json"),
    dim = sequential.dim(`See ${keymapPath}`),
    dim_2 = sequential.dim(
      `To add the binding yourself, add this block to the keymap array in ${keymapPath}:${NEWLINE}{ "context": "Terminal", "bindings": { "shift-enter": ["terminal::SendText", "\\u001b\\r"] } }`,
    ),
    d = `${color("success", theme)("Installed Zed Shift+Enter key binding")}${NEWLINE}${dim}${NEWLINE}`,
    h = `${color("warning", theme)("Couldn't read your Zed keymap, so it was left unchanged.")}${NEWLINE}${dim_2}${NEWLINE}`,
    x = `${color("warning", theme)("Your Zed keymap isn't a readable list of keybindings, so it was left unchanged.")}${NEWLINE}${dim_2}${NEWLINE}`;
  try {
    await mkdir(n, { recursive: !0 });
    let T = null;
    try {
      T = await readFile(keymapPath, { encoding: "utf-8" });
    } catch (error) {
      if (!isFsInaccessible(error)) throw error;
      if (!isENOENT(error)) return { message: h, installed: !1 };
    }
    if (T === null || Wo(T).trim() === "")
      return (
        await writeFileAtomic(
          keymapPath,
          jsonStringify(
            [{ context: "Terminal", bindings: { "shift-enter": ZED_SHIFT_ENTER_ACTION } }],
            null,
            2,
          ) +
            `
`,
        ),
        { message: d, installed: !0 }
      );
    let E = [],
      A = Wo(T),
      F = b8e(A, E, { allowTrailingComma: !0 });
    if (E.length > 0 || !Array.isArray(F)) return { message: x, installed: !1 };
    if (F.some(isZedTerminalShiftEnterBinding))
      return {
        message: `${color("success", theme)("Zed Shift+Enter key binding already configured")}${NEWLINE}${dim}${NEWLINE}`,
        installed: !0,
      };
    let randomSha = randomBytes(4).toString("hex"),
      backupPath = `${keymapPath}.${randomSha}.bak`;
    try {
      await copyFile(keymapPath, backupPath);
    } catch (error) {
      return (
        logForDebugging(
          `Failed to back up Zed keymap: ${error instanceof Error ? error.message : String(error)}`,
          { level: "error" },
        ),
        {
          message: `${color("warning", theme)("Couldn't back up your Zed keymap; not modifying it.")}${NEWLINE}${dim_2}${NEWLINE}`,
          installed: !1,
        }
      );
    }
    let index = F.findIndex((k) => isPlainObject(k) && k.context === "Terminal" && isPlainObject(k.bindings)),
      fe = { insertSpaces: !0, tabSize: 2 },
      H = null;
    try {
      let k =
        index >= 0
          ? KOn(A, [index, "bindings", "shift-enter"], ZED_SHIFT_ENTER_ACTION, { formattingOptions: fe })
          : KOn(
              A,
              [F.length],
              { context: "Terminal", bindings: { "shift-enter": ZED_SHIFT_ENTER_ACTION } },
              { formattingOptions: fe, isArrayInsertion: !0 },
            );
      H = k.length > 0 ? Wbr(A, k) : null;
    } catch (error) {
      logForDebugging(
        `Failed to edit Zed keymap: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      );
    }
    let K = [],
      V = H === null ? null : b8e(H, K, { allowTrailingComma: !0 });
    if (H === null || K.length > 0 || !Array.isArray(V) || !V.some(isZedTerminalShiftEnterBinding))
      return {
        message: `${color("warning", theme)("Couldn't update your Zed keymap, so it was left unchanged.")}${NEWLINE}${dim_2}${NEWLINE}`,
        installed: !1,
      };
    return (await writeFileAtomic(keymapPath, H), { message: d, installed: !0 });
  } catch (error) {
    throw (
      logForDebugging(
        `Failed to install Zed Shift+Enter key binding: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      Error("Failed to install Zed Shift+Enter key binding")
    );
  }
}
//@ chunk-e6aww6q8.js:3235972-3236107 fingerprint = getNativeCSIuTerminalDisplayName (0.555)
function getNativeCSIuTerminalDisplayName_2() {
  let e = hT();
  if (e.supportedVSCodeTerminal === tx) e.supportedVSCodeTerminal = isVSCodeIde(env.terminal);
  return e.supportedVSCodeTerminal;
}
//@ chunk-xafnw064.js:256-441 facade-exports = shouldOfferTerminalSetup (1)
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

export {
  supportsShiftEnter,
  hasUsedBackslashReturn,
  getNativeCSIuTerminalDisplayName,
  getNativeCSIuTerminalDisplayName_2,
  shouldOfferTerminalSetup,
  setupTerminal,
  VSCODE_SCROLL_SENSITIVITY_KEY,
  We,
  isVSCodeRemoteSSH,
  NEWLINE,
  vscodeUserDirectories,
  markBackslashReturnUsed,
  readVSCodeScrollSensitivity,
};
