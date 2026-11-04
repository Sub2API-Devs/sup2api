/**
 * utils/deepLink/terminalLauncher.ts
 *
 * 检测用户终端并以正确的参数/转义在其中启动 claude（macOS/Linux/Windows 终端清单）；混入多处同名 shellQuote/detectTerminal 克隆。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/deepLink/terminalLauncher.ts
 * pieces: chunk-bh9w80kx.js (16)
 * attribution: fingerprint 10, layout 6
 */
import { basename } from "path";
import { spawn } from "child_process";
import { getGlobalConfig } from "../config.js";
import { env } from "../env.js";
import { execFileNoThrow } from "../execFileNoThrow.js";
import { whichAsync } from "../which.js";
import { logForDebugging } from "../debug.js";
import { moveKeeperPid } from "../toolCgroup.js";

//@ chunk-bh9w80kx.js:3781-4323 fingerprint (2.1.88 match: MACOS_TERMINALS, 0.753)
/**
 * 深链接可用的终端清单：macOS（iTerm2、Ghostty、Kitty、Alacritty、WezTerm、Terminal.app）与 Linux（ghostty、kitty、alacritty、wezterm、gnome-terminal、konsole、xfce4-terminal、mate-terminal、tilix、xterm）。
 */
var MACOS_TERMINALS = [
  {
    name: "iTerm2",
    bundleId: "com.googlecode.iterm2",
    app: "iTerm",
  },
  {
    name: "Ghostty",
    bundleId: "com.mitchellh.ghostty",
    app: "Ghostty",
  },
  {
    name: "Kitty",
    bundleId: "net.kovidgoyal.kitty",
    app: "kitty",
  },
  {
    name: "Alacritty",
    bundleId: "org.alacritty",
    app: "Alacritty",
  },
  {
    name: "WezTerm",
    bundleId: "com.github.wez.wezterm",
    app: "WezTerm",
  },
  {
    name: "Terminal.app",
    bundleId: "com.apple.Terminal",
    app: "Terminal",
    termProgramAliases: ["apple_terminal"],
  },
];
var LINUX_TERMINALS = [
  "ghostty",
  "kitty",
  "alacritty",
  "wezterm",
  "gnome-terminal",
  "konsole",
  "xfce4-terminal",
  "mate-terminal",
  "tilix",
  "xterm",
];
//@ chunk-bh9w80kx.js:4323-5035 fingerprint (2.1.88 match: detectMacosTerminal, 0.968)
/**
 * macOS 终端选择：全局配置 deepLinkTerminal → TERM_PROGRAM → mdfind 查 bundle id → /Applications 下是否存在，最后默认 Terminal.app。
 */
async function detectMacosTerminal() {
  let stored = getGlobalConfig().deepLinkTerminal;
  if (stored) {
    let match = MACOS_TERMINALS.find((t) => t.app === stored);
    if (match)
      return {
        name: match.name,
        command: match.app,
      };
  }
  let termProgram = env.TERM_PROGRAM;
  if (termProgram) {
    let normalized = termProgram.replace(/\.app$/i, "").toLowerCase();
    let match = MACOS_TERMINALS.find(
      (terminal) =>
        terminal.app.toLowerCase() === normalized ||
        terminal.name.toLowerCase() === normalized ||
        terminal.termProgramAliases?.includes(normalized),
    );
    if (match)
      return {
        name: match.name,
        command: match.app,
      };
  }
  for (let terminal of MACOS_TERMINALS) {
    let { code, stdout } = await execFileNoThrow(
      "mdfind",
      [`kMDItemCFBundleIdentifier == "${terminal.bundleId}"`],
      {
        timeout: 5000,
        useCwd: false,
      },
    );
    if (code === 0 && stdout.trim().length > 0)
      return {
        name: terminal.name,
        command: terminal.app,
      };
  }
  for (let terminal of MACOS_TERMINALS) {
    let { code: lsCode } = await execFileNoThrow("ls", [`/Applications/${terminal.app}.app`], {
      timeout: 1000,
      useCwd: false,
    });
    if (lsCode === 0)
      return {
        name: terminal.name,
        command: terminal.app,
      };
  }
  return {
    name: "Terminal.app",
    command: "Terminal",
  };
}
//@ chunk-bh9w80kx.js:5035-5292 fingerprint (2.1.88 match: detectLinuxTerminal, 1)
/**
 * Linux 终端选择：$TERMINAL → x-terminal-emulator → 清单中第一个可执行的。
 */
async function detectLinuxTerminal() {
  let termEnv = env.TERMINAL;
  if (termEnv) {
    let resolved = await whichAsync(termEnv);
    if (resolved)
      return {
        name: basename(termEnv),
        command: resolved,
      };
  }
  let xte = await whichAsync("x-terminal-emulator");
  if (xte)
    return {
      name: "x-terminal-emulator",
      command: xte,
    };
  for (let terminal of LINUX_TERMINALS) {
    let resolved = await whichAsync(terminal);
    if (resolved)
      return {
        name: terminal,
        command: resolved,
      };
  }
  return null;
}
//@ chunk-bh9w80kx.js:5292-5626 fingerprint (2.1.88 match: detectWindowsTerminal, 0.739)
/**
 * Windows 终端选择：wt.exe → pwsh.exe → powershell.exe → cmd.exe（ComSpec）。
 */
async function detectWindowsTerminal() {
  let wt = await whichAsync("wt.exe");
  if (wt)
    return {
      name: "Windows Terminal",
      command: wt,
    };
  let pwsh = await whichAsync("pwsh.exe");
  if (pwsh)
    return {
      name: "PowerShell",
      command: pwsh,
    };
  let powershell = await whichAsync("powershell.exe");
  if (powershell)
    return {
      name: "PowerShell",
      command: powershell,
    };
  return {
    name: "Command Prompt",
    command: env.ComSpec || `${env.SystemRoot || "C:\\Windows"}\\System32\\cmd.exe`,
  };
}
//@ chunk-bh9w80kx.js:5626-5752 layout (2.1.88 match: detectTerminal, 0.92)
/**
 * 按平台选择终端（分派到 macOS/Linux/Windows 的检测函数）。
 */
async function detectTerminal() {
  switch ("linux") {
    case "darwin":
      return detectMacosTerminal();
    case "linux":
      return detectLinuxTerminal();
    case "win32":
      return detectWindowsTerminal();
    default:
      return null;
  }
}
//@ chunk-bh9w80kx.js:5752-6228 fingerprint (2.1.88 match: launchInTerminal, 0.649)
/**
 * 在检测到的终端里启动 claude，附带 --deep-link-origin、--deep-link-repo、--deep-link-last-fetch、--prefill 等参数，按平台分派。
 */
async function launchInTerminal(claudePath, action) {
  let terminal = await detectTerminal();
  if (!terminal) {
    logForDebugging("No terminal emulator detected", {
      level: "error",
    });
    return false;
  }
  logForDebugging(`Launching in terminal: ${terminal.name} (${terminal.command})`);
  let claudeArgs = ["--deep-link-origin"];
  if (action.repo) {
    claudeArgs.push(`--deep-link-repo=${action.repo}`);
    if (action.lastFetchMs !== undefined) claudeArgs.push(`--deep-link-last-fetch=${action.lastFetchMs}`);
  }
  if (action.query) claudeArgs.push(`--prefill=${action.query}`);
  switch ("linux") {
    case "darwin":
      return launchMacosTerminal(terminal, claudePath, claudeArgs, action);
    case "linux":
      return launchLinuxTerminal(terminal, claudePath, claudeArgs, action);
    case "win32":
      return launchWindowsTerminal(terminal, claudePath, action);
    default:
      return false;
  }
}
//@ chunk-bh9w80kx.js:6228-7575 fingerprint (2.1.88 match: launchMacosTerminal, 1)
/**
 * macOS 启动：iTerm/Terminal.app 用 osascript 执行登录 shell 命令，Ghostty/Alacritty/kitty/WezTerm 用 open -na 传参与工作目录；失败回退 Terminal.app。
 */
async function launchMacosTerminal(terminal, claudePath, claudeArgs, cwd) {
  let { cwd: cwd_2 } = cwd;
  switch (terminal.command) {
    case "iTerm": {
      let shCmd = buildLoginShellCommand(claudePath, cwd);
      let script = `tell application "iTerm"
  if running then
    create window with default profile
  else
    activate
  end if
  tell current session of current window
    write text ${appleScriptQuote(shCmd)}
  end tell
end tell`;
      let { code } = await execFileNoThrow("osascript", ["-e", script], {
        useCwd: false,
      });
      if (code === 0) return true;
      break;
    }
    case "Terminal": {
      let shCmd = buildLoginShellCommand(claudePath, cwd);
      let script = `tell application "Terminal"
  do script ${appleScriptQuote(shCmd)}
  activate
end tell`;
      let { code } = await execFileNoThrow("osascript", ["-e", script], {
        useCwd: false,
      });
      return code === 0;
    }
    case "Ghostty": {
      let args = ["-na", terminal.command, "--args", "--window-save-state=never"];
      if (cwd_2) args.push(`--working-directory=${cwd_2}`);
      args.push("-e", claudePath, ...buildShellSafeDeepLinkArgs(cwd));
      let { code } = await execFileNoThrow("open", args, {
        useCwd: false,
      });
      if (code === 0) return true;
      break;
    }
    case "Alacritty": {
      let args = ["-na", terminal.command, "--args"];
      if (cwd_2) args.push("--working-directory", cwd_2);
      args.push("-e", claudePath, ...claudeArgs);
      let { code } = await execFileNoThrow("open", args, {
        useCwd: false,
      });
      if (code === 0) return true;
      break;
    }
    case "kitty": {
      let args = ["-na", terminal.command, "--args"];
      if (cwd_2) args.push("--directory", cwd_2);
      args.push(claudePath, ...claudeArgs);
      let { code } = await execFileNoThrow("open", args, {
        useCwd: false,
      });
      if (code === 0) return true;
      break;
    }
    case "WezTerm": {
      let args = ["-na", terminal.command, "--args", "start"];
      if (cwd_2) args.push("--cwd", cwd_2);
      args.push("--", claudePath, ...claudeArgs);
      let { code } = await execFileNoThrow("open", args, {
        useCwd: false,
      });
      if (code === 0) return true;
      break;
    }
  }
  logForDebugging(`Failed to launch ${terminal.name}, falling back to Terminal.app`);
  return launchMacosTerminal(
    {
      name: "Terminal.app",
      command: "Terminal",
    },
    claudePath,
    claudeArgs,
    cwd,
  );
}
//@ chunk-bh9w80kx.js:7575-8341 fingerprint (2.1.88 match: launchLinuxTerminal, 1)
/**
 * Linux 启动：按终端名拼工作目录与执行参数（gnome-terminal --、konsole -e、kitty --directory 等），未知终端用 -e 并以 cwd 启动。
 */
async function launchLinuxTerminal(terminal, claudePath, claudeArgs, cwd) {
  let { cwd: cwd_2 } = cwd;
  let terminalArgs;
  let spawnCwd;
  switch (terminal.name) {
    case "gnome-terminal":
      terminalArgs = cwd_2 ? [`--working-directory=${cwd_2}`, "--"] : ["--"];
      terminalArgs.push(claudePath, ...claudeArgs);
      break;
    case "konsole":
      terminalArgs = cwd_2 ? ["--workdir", cwd_2, "-e"] : ["-e"];
      terminalArgs.push(claudePath, ...claudeArgs);
      break;
    case "kitty":
      terminalArgs = cwd_2 ? ["--directory", cwd_2] : [];
      terminalArgs.push(claudePath, ...claudeArgs);
      break;
    case "wezterm":
      terminalArgs = cwd_2 ? ["start", "--cwd", cwd_2, "--"] : ["start", "--"];
      terminalArgs.push(claudePath, ...claudeArgs);
      break;
    case "alacritty":
      terminalArgs = cwd_2 ? ["--working-directory", cwd_2, "-e"] : ["-e"];
      terminalArgs.push(claudePath, ...claudeArgs);
      break;
    case "ghostty":
      terminalArgs = cwd_2 ? [`--working-directory=${cwd_2}`, "-e"] : ["-e"];
      terminalArgs.push(claudePath, ...buildShellSafeDeepLinkArgs(cwd));
      break;
    case "xfce4-terminal":
    case "mate-terminal":
      terminalArgs = cwd_2 ? [`--working-directory=${cwd_2}`, "-x"] : ["-x"];
      terminalArgs.push(claudePath, ...claudeArgs);
      break;
    case "tilix":
      terminalArgs = cwd_2 ? [`--working-directory=${cwd_2}`, "-e"] : ["-e"];
      terminalArgs.push(claudePath, ...buildShellSafeDeepLinkArgs(cwd));
      break;
    default:
      terminalArgs = ["-e", claudePath, ...buildShellSafeDeepLinkArgs(cwd)];
      spawnCwd = cwd_2;
      break;
  }
  return spawnDetached(terminal.command, terminalArgs, {
    cwd: spawnCwd,
  });
}
//@ chunk-bh9w80kx.js:8341-8775 fingerprint (2.1.88 match: launchWindowsTerminal, 0.827)
/**
 * Windows 启动：Windows Terminal（-d cwd -- …，; 需转义）、PowerShell（-NoExit -Command & '…'）、cmd（/k 原样参数）。
 */
async function launchWindowsTerminal(terminal, claudePath, action) {
  let args = [];
  let claudeArgs = buildShellSafeDeepLinkArgs(action);
  let cwd = action.cwd;
  switch (terminal.name) {
    case "Windows Terminal": {
      let escapeSemicolons = (value) => value.replaceAll(";", "\\;");
      if (cwd) args.push("-d", escapeSemicolons(cwd));
      args.push("--", escapeSemicolons(claudePath), ...claudeArgs);
      break;
    }
    case "PowerShell": {
      args.push("-NoExit", "-Command", `& ${psQuote(claudePath)} ${claudeArgs.join(" ")}`);
      break;
    }
    default: {
      let commandLine = `${cmdQuote(claudePath)} ${claudeArgs.map(cmdQuote).join(" ")}`;
      args.push("/d", "/v:off", "/s", "/k", `"${commandLine}"`);
      break;
    }
  }
  return spawnDetached(terminal.command, args, {
    windowsVerbatimArguments: terminal.name === "Command Prompt",
    cwd: action.cwd,
  });
}
//@ chunk-bh9w80kx.js:8775-9174 fingerprint (2.1.88 match: spawnDetached, 0.93)
/**
 * 分离启动终端进程（detached、stdio ignore、unref）；带 cwd 失败时不带 cwd 重试。
 */
async function spawnDetached(command, args, opts = {}) {
  let trySpawn = (resolve) =>
    new Promise((resolve_2) => {
      let onError = (err) => {
        logForDebugging(`Failed to spawn ${command}: ${err.message}`, {
          level: "error",
        });
        resolve_2(false);
      };
      let child;
      try {
        child = spawn(command, args, {
          detached: true,
          stdio: "ignore",
          windowsHide: false,
          cwd: resolve,
          windowsVerbatimArguments: opts.windowsVerbatimArguments,
        });
      } catch (error) {
        return onError(error);
      }
      moveKeeperPid(child.pid);
      child.once("error", onError);
      child.once("spawn", () => {
        child.unref();
        resolve_2(true);
      });
    });
  if (await trySpawn(opts.cwd)) return true;
  if (opts.cwd) return trySpawn(undefined);
  return false;
}
//@ chunk-bh9w80kx.js:9174-9203 layout
/**
 * 拼进 shell 命令行的深链接参数允许的字符集。
 */
var SHELL_SAFE_ARGS = /^[A-Za-z0-9 /._=-]+$/;
//@ chunk-bh9w80kx.js:9203-9529 layout
/**
 * 生成 shell 安全的深链接参数：cwd 与 query 以 base64url 传（--deep-link-cwd-b64、--prefill-b64）。
 */
function buildShellSafeDeepLinkArgs(action) {
  let toBase64Url = (text) => Buffer.from(text, "utf8").toString("base64url");
  let args = ["--deep-link-origin"];
  if (action.repo) args.push(`--deep-link-repo=${action.repo}`);
  if (action.lastFetchMs !== undefined) args.push(`--deep-link-last-fetch=${action.lastFetchMs}`);
  if (action.cwd) args.push(`--deep-link-cwd-b64=${toBase64Url(action.cwd)}`);
  if (action.query) args.push(`--prefill-b64=${toBase64Url(action.query)}`);
  return args;
}
//@ chunk-bh9w80kx.js:9529-10057 layout
/**
 * 为 iTerm/Terminal.app 拼登录 shell 命令行；参数必须只含安全字符，claude 路径含 ' \ ! $ 换行时拒绝。
 */
function buildLoginShellCommand(claudePath, cwd) {
  let joined = buildShellSafeDeepLinkArgs(cwd).join(" ");
  if (!SHELL_SAFE_ARGS.test(joined))
    throw Error(`Internal error: shell-safe args contain metacharacters: ${joined}`);
  if (/^[A-Za-z0-9/._-]+$/.test(claudePath)) return `${claudePath} ${joined}`;
  if (/['\\!$\n]/.test(claudePath))
    throw Error(
      `Deep-link launch unsupported: the claude binary path "${claudePath}" contains a single quote, backslash, exclamation mark, dollar sign, or newline, which cannot be portably quoted for every login shell. Reinstall claude to a path without these characters to use deep links with iTerm2 or Terminal.app.`,
    );
  return `'${claudePath}' ${joined}`;
}
//@ chunk-bh9w80kx.js:10057-10178 layout
/**
 * AppleScript 字符串字面量转义。
 */
function appleScriptQuote(shCmd) {
  return `"${shCmd
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll(
      `
`,
      "\\n",
    )
    .replaceAll("\t", "\\t")}"`;
}
//@ chunk-bh9w80kx.js:10178-10426 layout
/**
 * PowerShell 单引号字符串转义；遇到 U+2018–201B 引号变体拒绝。
 */
function psQuote(value) {
  if (/[\u2018\u2019\u201A\u201B]/.test(value))
    throw Error(
      "Cannot safely quote a Unicode single-quote variant (U+2018-U+201B) in a PowerShell path; install Windows Terminal (wt.exe).",
    );
  return `'${value.replaceAll('"', "").replaceAll("'", "''")}'`;
}
//@ chunk-bh9w80kx.js:10426-10523 fingerprint (2.1.88 match: cmdQuote, 1)
/**
 * cmd.exe 参数加引号（去掉 " 和 %、换行变空格、尾部反斜杠加倍）。
 */
function cmdQuote(arg) {
  return `"${arg
    .replace(/[\n\t]/g, " ")
    .replace(/["%]/g, "")
    .replace(/(\\+)$/, "$1$1")}"`;
}
export { launchInTerminal };
