/**
 * services/daemon/serviceInstall.ts
 *
 * 安装 systemd 用户服务（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ksvdmrg0.js (18)
 * attribution: placement 18
 */
import { stat, mkdir, writeFile, unlink, readFile, access } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../../vendor/semver/index.js";
import { env } from "../../utils/env.js";
import { isStandaloneExecutable } from "../../utils/slowOperations.js";
import { getUserBinDir } from "../../utils/xdg.js";
import { processWrapperProblem, processWrapperArgv, absoluteLauncher } from "../../utils/processWrapper.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { isPossibleClaudeBinary } from "../../utils/nativeInstaller/installer.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ksvdmrg0.js:2754-2772 placement
/**
 * 懒加载的 semver 模块。
 */
var semverModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ksvdmrg0.js:2754", () => {
  semverModule = __toESM(require_semver_3(), 1);
});
//@ chunk-ksvdmrg0.js:3090-3165 placement
/**
 * 调用 systemctl 时的固定选项。
 */
var COM_ANTHROPIC_CLAUDE_DAEMON = "com.anthropic.claude-daemon";
var SYSTEMCTL_OPTIONS = {
  useCwd: false,
  useToolMemoryCgroup: false,
};
//@ chunk-ksvdmrg0.js:3165-3311 placement
/**
 * 判断当前用户是否有 systemd 用户会话（XDG_RUNTIME_DIR 下存在 systemd 目录）。
 */
async function hasSystemdUserSession() {
  let runtimeDir = env.XDG_RUNTIME_DIR || `/run/user/${process.getuid()}`;
  try {
    return (await stat(join(runtimeDir, "systemd"))).isDirectory();
  } catch {
    return false;
  }
}
//@ chunk-ksvdmrg0.js:3311-3383 placement
/**
 * 服务里 ExecStart 指向的可执行文件路径。
 */
function daemonExecutablePath() {
  if (!isStandaloneExecutable()) return process.argv[1];
  return join(getUserBinDir(), "claude");
}
//@ chunk-ksvdmrg0.js:3383-3451 placement
/**
 * 转义 systemd 值（换行变空格，% 变 %%）。
 */
function escapeSystemdValue(logPath) {
  return logPath.replace(/[\r\n]/g, " ").replaceAll("%", "%%");
}
//@ chunk-ksvdmrg0.js:3451-3512 placement
/**
 * 需要时给 systemd 参数加引号。
 */
function quoteSystemdArg(value) {
  let escaped = escapeSystemdValue(value);
  return escaped.includes(" ") ? `"${escaped}"` : escaped;
}
//@ chunk-ksvdmrg0.js:3512-3616 placement
function getSystemdUnitPath() {
  let configHome = env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(configHome, "systemd", "user", `${COM_ANTHROPIC_CLAUDE_DAEMON}.service`);
}
//@ chunk-ksvdmrg0.js:3616-3672 placement
/**
 * 判断 daemon 服务单元文件是否存在。
 */
async function isDaemonServiceInstalled() {
  return stat(getSystemdUnitPath()).then(
    () => true,
    () => false,
  );
}
//@ chunk-ksvdmrg0.js:3672-4957 placement
/**
 * 安装 systemd 用户服务（拒绝安装未包装运行的服务）
 */
async function installDaemonService(options) {
  let { jsonPath, logPath } = options;
  let problem = await processWrapperProblem();
  if (problem)
    return {
      ok: false,
      error: `${problem} \u2014 refusing to install a service that would run unwrapped`,
      serviceId: COM_ANTHROPIC_CLAUDE_DAEMON,
      servicePath: "",
    };
  let argv = [...processWrapperArgv(), daemonExecutablePath()];
  let PATH = env.PATH || "/usr/local/bin:/usr/bin:/bin";
  {
    let systemdUnitPath = getSystemdUnitPath();
    let unit = `${COM_ANTHROPIC_CLAUDE_DAEMON}.service`;
    try {
      let result = env.XDG_CONFIG_HOME || join(homedir(), ".config");
      await mkdir(join(result, "systemd", "user"), {
        recursive: true,
      });
      await writeFile(
        systemdUnitPath,
        `[Unit]
Description=Claude Daemon
After=network-online.target
StartLimitIntervalSec=60
StartLimitBurst=10

[Service]
Type=simple
Environment="PATH=${escapeSystemdValue(PATH)}"
ExecStart=${argv.map(quoteSystemdArg).join(" ")} daemon --json-path ${quoteSystemdArg(jsonPath)} --log-file ${quoteSystemdArg(logPath)} --origin service
Restart=always
RestartSec=1
StandardOutput=append:${escapeSystemdValue(logPath)}
StandardError=append:${escapeSystemdValue(logPath)}

[Install]
WantedBy=default.target
`,
        "utf8",
      );
    } catch (error) {
      return {
        ok: false,
        error: errorMessage(error),
        serviceId: COM_ANTHROPIC_CLAUDE_DAEMON,
        servicePath: systemdUnitPath,
      };
    }
    await execFileNoThrow("systemctl", ["--user", "daemon-reload"], SYSTEMCTL_OPTIONS);
    let { code, stderr, error } = await execFileNoThrow(
      "systemctl",
      ["--user", "enable", "--now", unit],
      SYSTEMCTL_OPTIONS,
    );
    if (code !== 0)
      return {
        ok: false,
        error: stderr || error || "systemctl enable failed",
        serviceId: COM_ANTHROPIC_CLAUDE_DAEMON,
        servicePath: systemdUnitPath,
      };
    await execFileNoThrow("systemctl", ["--user", "restart", unit], SYSTEMCTL_OPTIONS);
    return {
      ok: true,
      serviceId: COM_ANTHROPIC_CLAUDE_DAEMON,
      servicePath: systemdUnitPath,
    };
  }
  return {
    ok: false,
    error: `service install not available on ${"linux"} \u2014 the daemon runs on demand instead`,
    serviceId: COM_ANTHROPIC_CLAUDE_DAEMON,
    servicePath: "",
  };
}
//@ chunk-ksvdmrg0.js:4957-5253 placement
async function uninstallDaemonService() {
  {
    let systemdUnitPath = getSystemdUnitPath();
    let unitName = `${COM_ANTHROPIC_CLAUDE_DAEMON}.service`;
    await execFileNoThrow("systemctl", ["--user", "disable", "--now", unitName], SYSTEMCTL_OPTIONS);
    try {
      await unlink(systemdUnitPath);
    } catch (error) {
      if (!isENOENT(error))
        return {
          ok: false,
          error: errorMessage(error),
        };
    }
    await execFileNoThrow("systemctl", ["--user", "daemon-reload"], SYSTEMCTL_OPTIONS);
    return {
      ok: true,
    };
  }
  return {
    ok: false,
    error: "service uninstall not available on linux",
  };
}
//@ chunk-ksvdmrg0.js:5253-5293 placement
/**
 * 启动 daemon 服务（systemctl --user start）。
 */
async function startDaemonService() {
  return runSystemctl("start");
}
//@ chunk-ksvdmrg0.js:5293-5332 placement
/**
 * 停止 daemon 服务。
 */
async function stopDaemonService() {
  return runSystemctl("stop");
}
//@ chunk-ksvdmrg0.js:5332-5374 placement
/**
 * 重启 daemon 服务。
 */
async function restartDaemonService() {
  return runSystemctl("restart");
}
//@ chunk-ksvdmrg0.js:5374-5710 placement
/**
 * 通过 systemctl --user 启停/重启 daemon 服务，失败时返回错误文字。
 */
async function runSystemctl(action) {
  if (false)
    switch (action) {
      case "start":
      case "stop":
      case "restart":
    }
  {
    let { code, stderr, error } = await execFileNoThrow(
      "systemctl",
      ["--user", action, `${COM_ANTHROPIC_CLAUDE_DAEMON}.service`],
      SYSTEMCTL_OPTIONS,
    );
    if (code !== 0)
      return {
        ok: false,
        error: stderr || error || `systemctl ${action} failed`,
      };
    return {
      ok: true,
    };
  }
  return {
    ok: false,
    error: `service ${action} not available on ${"linux"} \u2014 the daemon runs on demand instead`,
  };
}
//@ chunk-ksvdmrg0.js:5710-5969 placement
async function readServiceExecStart() {
  let systemdUnitPath = getSystemdUnitPath();
  if (!systemdUnitPath) return null;
  let text;
  try {
    let stats = await stat(systemdUnitPath);
    if (!stats.isFile() || stats.size > 1048576) return null;
    text = await readFile(systemdUnitPath, "utf8");
  } catch {
    return null;
  }
  return [...(text.match(/^ExecStart=(.*)$/m)?.[1]?.matchAll(/"([^"]+)"|(\S+)/g) ?? [])].map(
    (match) => match[1] ?? match[2],
  );
}
//@ chunk-ksvdmrg0.js:5969-6014 placement
/**
 * 反转义 systemd 值（%% 变回 %）。
 */
function unescapeSystemdValue(value) {
  return value.replaceAll("%%", "%");
}
//@ chunk-ksvdmrg0.js:6014-6326 placement
/**
 * 检查 systemd 服务的 ExecStart：daemon 前的可执行路径是否已不存在、启动前缀中的二进制是否失效。
 */
async function checkServiceExecStart() {
  let state = {
    execPathStale: false,
    launcherPrefixDead: false,
  };
  let serviceExecStart = await readServiceExecStart();
  if (!serviceExecStart) return state;
  let index = serviceExecStart.lastIndexOf("daemon");
  let execPath = index > 0 ? serviceExecStart[index - 1] : undefined;
  if (!execPath) return state;
  try {
    await access(unescapeSystemdValue(execPath));
  } catch {
    state.execPathStale = true;
  }
  let argv = serviceExecStart.slice(0, index - 1).map(unescapeSystemdValue);
  for (let candidate of absoluteLauncher(argv))
    if (!(await isPossibleClaudeBinary(candidate))) {
      state.launcherPrefixDead = true;
      break;
    }
  return state;
}
//@ chunk-ksvdmrg0.js:6326-6521 placement
async function daemonServiceStatus() {
  {
    let { code, stderr, error } = await execFileNoThrow(
      "systemctl",
      ["--user", "status", `${COM_ANTHROPIC_CLAUDE_DAEMON}.service`],
      SYSTEMCTL_OPTIONS,
    );
    if (error || stderr.includes("Failed to connect to bus")) return false;
    return code === 0 || code === 3;
  }
  return false;
}
export {
  daemonServiceStatus,
  hasSystemdUserSession,
  uninstallDaemonService,
  stopDaemonService,
  installDaemonService,
  checkServiceExecStart,
  startDaemonService,
  semverModule,
  isDaemonServiceInstalled,
  daemonExecutablePath,
  restartDaemonService,
};
