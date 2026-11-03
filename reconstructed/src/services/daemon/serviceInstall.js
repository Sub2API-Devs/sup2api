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
import {
  stat,
  stat as stat_2,
  mkdir,
  writeFile,
  unlink,
  unlink as unlink_2,
  readFile,
  readFile as readFile_2,
  access,
  access as access_2,
} from "fs/promises";
import { join, join as join_2 } from "path";
import { homedir, homedir as homedir_2 } from "os";
import { Re } from "../../../runtime/bun-runtime.js";
import { Vy } from "../../../vendor/semver/index.js";
import { env } from "../../utils/env.js";
import { isStandaloneExecutable } from "../../utils/slowOperations.js";
import { getUserBinDir } from "../../utils/xdg.js";
import { processWrapperProblem, processWrapperArgv, absoluteLauncher } from "../../utils/processWrapper.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { isPossibleClaudeBinary } from "../../utils/nativeInstaller/installer.js";

//@ chunk-ksvdmrg0.js:2754-2772 placement
var Ge = Re(Vy(), 1);
//@ chunk-ksvdmrg0.js:3090-3165 placement
var COM_ANTHROPIC_CLAUDE_DAEMON = "com.anthropic.claude-daemon",
  Pe = { useCwd: !1, useToolMemoryCgroup: !1 };
/**
 * 判断当前用户是否有 systemd 用户会话（XDG_RUNTIME_DIR 下存在 systemd 目录）。
 */
//@ chunk-ksvdmrg0.js:3165-3311 placement
async function hasSystemdUserSession() {
  let r = env.XDG_RUNTIME_DIR || `/run/user/${process.getuid()}`;
  try {
    return (await stat(join(r, "systemd"))).isDirectory();
  } catch {
    return !1;
  }
}
//@ chunk-ksvdmrg0.js:3311-3383 placement
function Eho() {
  if (!isStandaloneExecutable()) return process.argv[1];
  return join(getUserBinDir(), "claude");
}
//@ chunk-ksvdmrg0.js:3383-3451 placement
function ze(r) {
  return r.replace(/[\r\n]/g, " ").replaceAll("%", "%%");
}
//@ chunk-ksvdmrg0.js:3451-3512 placement
function dt(r) {
  let e = ze(r);
  return e.includes(" ") ? `"${e}"` : e;
}
//@ chunk-ksvdmrg0.js:3512-3616 placement
function getSystemdUnitPath() {
  let r = env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(r, "systemd", "user", `${COM_ANTHROPIC_CLAUDE_DAEMON}.service`);
}
//@ chunk-ksvdmrg0.js:3616-3672 placement
async function Ct() {
  return stat(getSystemdUnitPath()).then(
    () => !0,
    () => !1,
  );
}
/**
 * 安装 systemd 用户服务（拒绝安装未包装运行的服务）
 */
//@ chunk-ksvdmrg0.js:3672-4957 placement
async function installDaemonService(r) {
  let { jsonPath: jsonPath, logPath: logPath } = r,
    s = await processWrapperProblem();
  if (s)
    return {
      ok: !1,
      error: `${s} \u2014 refusing to install a service that would run unwrapped`,
      serviceId: COM_ANTHROPIC_CLAUDE_DAEMON,
      servicePath: "",
    };
  let h = [...processWrapperArgv(), Eho()],
    w = env.PATH || "/usr/local/bin:/usr/bin:/bin";
  {
    let p = getSystemdUnitPath(),
      E = `${COM_ANTHROPIC_CLAUDE_DAEMON}.service`;
    try {
      let x = env.XDG_CONFIG_HOME || join(homedir(), ".config");
      (await mkdir(join(x, "systemd", "user"), { recursive: !0 }),
        await writeFile(
          p,
          `[Unit]
Description=Claude Daemon
After=network-online.target
StartLimitIntervalSec=60
StartLimitBurst=10

[Service]
Type=simple
Environment="PATH=${ze(w)}"
ExecStart=${h.map(dt).join(" ")} daemon --json-path ${dt(jsonPath)} --log-file ${dt(logPath)} --origin service
Restart=always
RestartSec=1
StandardOutput=append:${ze(logPath)}
StandardError=append:${ze(logPath)}

[Install]
WantedBy=default.target
`,
          "utf8",
        ));
    } catch (error) {
      return { ok: !1, error: errorMessage(error), serviceId: COM_ANTHROPIC_CLAUDE_DAEMON, servicePath: p };
    }
    await execFileNoThrow("systemctl", ["--user", "daemon-reload"], Pe);
    let {
      code: code,
      stderr: stderr,
      error: error,
    } = await execFileNoThrow("systemctl", ["--user", "enable", "--now", E], Pe);
    if (code !== 0)
      return {
        ok: !1,
        error: stderr || error || "systemctl enable failed",
        serviceId: COM_ANTHROPIC_CLAUDE_DAEMON,
        servicePath: p,
      };
    return (
      await execFileNoThrow("systemctl", ["--user", "restart", E], Pe),
      { ok: !0, serviceId: COM_ANTHROPIC_CLAUDE_DAEMON, servicePath: p }
    );
  }
  return {
    ok: !1,
    error: `service install not available on ${"linux"} \u2014 the daemon runs on demand instead`,
    serviceId: COM_ANTHROPIC_CLAUDE_DAEMON,
    servicePath: "",
  };
}
//@ chunk-ksvdmrg0.js:4957-5253 placement
async function uninstallDaemonService() {
  {
    let r = getSystemdUnitPath(),
      e = `${COM_ANTHROPIC_CLAUDE_DAEMON}.service`;
    await execFileNoThrow("systemctl", ["--user", "disable", "--now", e], Pe);
    try {
      await unlink(r);
    } catch (error) {
      if (!isENOENT(error)) return { ok: !1, error: errorMessage(error) };
    }
    return (await execFileNoThrow("systemctl", ["--user", "daemon-reload"], Pe), { ok: !0 });
  }
  return { ok: !1, error: "service uninstall not available on linux" };
}
//@ chunk-ksvdmrg0.js:5253-5293 placement
async function TAr() {
  return runSystemctl("start");
}
//@ chunk-ksvdmrg0.js:5293-5332 placement
async function vtn() {
  return runSystemctl("stop");
}
//@ chunk-ksvdmrg0.js:5332-5374 placement
async function Exs() {
  return runSystemctl("restart");
}
/**
 * 通过 systemctl --user 启停/重启 daemon 服务，失败时返回错误文字。
 */
//@ chunk-ksvdmrg0.js:5374-5710 placement
async function runSystemctl(r) {
  if (!1)
    switch (r) {
      case "start":
      case "stop":
      case "restart":
    }
  {
    let {
      code: code,
      stderr: stderr,
      error: error,
    } = await execFileNoThrow("systemctl", ["--user", r, `${COM_ANTHROPIC_CLAUDE_DAEMON}.service`], Pe);
    if (code !== 0) return { ok: !1, error: stderr || error || `systemctl ${r} failed` };
    return { ok: !0 };
  }
  return {
    ok: !1,
    error: `service ${r} not available on ${"linux"} \u2014 the daemon runs on demand instead`,
  };
}
//@ chunk-ksvdmrg0.js:5710-5969 placement
async function readServiceExecStart() {
  let r = getSystemdUnitPath();
  if (!r) return null;
  let e;
  try {
    let n = await stat(r);
    if (!n.isFile() || n.size > 1048576) return null;
    e = await readFile_2(r, "utf8");
  } catch {
    return null;
  }
  return [...(e.match(/^ExecStart=(.*)$/m)?.[1]?.matchAll(/"([^"]+)"|(\S+)/g) ?? [])].map(
    (n) => n[1] ?? n[2],
  );
}
//@ chunk-ksvdmrg0.js:5969-6014 placement
function Pt(r) {
  return r.replaceAll("%%", "%");
}
/**
 * 检查 systemd 服务的 ExecStart：daemon 前的可执行路径是否已不存在、启动前缀中的二进制是否失效。
 */
//@ chunk-ksvdmrg0.js:6014-6326 placement
async function checkServiceExecStart() {
  let r = { execPathStale: !1, launcherPrefixDead: !1 },
    e = await readServiceExecStart();
  if (!e) return r;
  let index = e.lastIndexOf("daemon"),
    s = index > 0 ? e[index - 1] : void 0;
  if (!s) return r;
  try {
    await access(Pt(s));
  } catch {
    r.execPathStale = !0;
  }
  let mapped = e.slice(0, index - 1).map(Pt);
  for (let w of absoluteLauncher(mapped))
    if (!(await isPossibleClaudeBinary(w))) {
      r.launcherPrefixDead = !0;
      break;
    }
  return r;
}
//@ chunk-ksvdmrg0.js:6326-6521 placement
async function daemonServiceStatus() {
  {
    let {
      code: code,
      stderr: stderr,
      error: error,
    } = await execFileNoThrow(
      "systemctl",
      ["--user", "status", `${COM_ANTHROPIC_CLAUDE_DAEMON}.service`],
      Pe,
    );
    if (error || stderr.includes("Failed to connect to bus")) return !1;
    return code === 0 || code === 3;
  }
  return !1;
}

export {
  daemonServiceStatus,
  hasSystemdUserSession,
  uninstallDaemonService,
  vtn,
  installDaemonService,
  checkServiceExecStart,
  TAr,
  Ge,
  Ct,
  Eho,
  Exs,
};
