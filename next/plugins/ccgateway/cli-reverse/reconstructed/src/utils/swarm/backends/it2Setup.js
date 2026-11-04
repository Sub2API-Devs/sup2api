/**
 * utils/swarm/backends/it2Setup.ts
 *
 * iTerm2 it2 CLI 的安装与验证（uv/pipx/pip），以及 preferTmuxOverIterm2、it2 安装完成标记的全局配置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/backends/it2Setup.ts
 * pieces: chunk-78rbfds1.js (8)
 * attribution: fingerprint 8
 */
import { homedir } from "os";
import { execFileNoThrow, execFileNoThrowWithCwd } from "../../execFileNoThrow.js";
import { logForDebugging } from "../../debug.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { getGlobalConfig, saveGlobalConfig } from "../../config.js";

//@ chunk-78rbfds1.js:537-1012 fingerprint = detectPythonPackageManager (1)
/**
 * 依次探测 uv、pipx、pip、pip3，返回可用的 Python 包管理器。
 */
async function detectPythonPackageManager() {
  if ((await execFileNoThrow("which", ["uv"])).code === 0) {
    logForDebugging("[it2Setup] Found uv (will use uv tool install)");
    return "uvx";
  }
  if ((await execFileNoThrow("which", ["pipx"])).code === 0) {
    logForDebugging("[it2Setup] Found pipx package manager");
    return "pipx";
  }
  if ((await execFileNoThrow("which", ["pip"])).code === 0) {
    logForDebugging("[it2Setup] Found pip package manager");
    return "pip";
  }
  if ((await execFileNoThrow("which", ["pip3"])).code === 0) {
    logForDebugging("[it2Setup] Found pip3 package manager");
    return "pip";
  }
  logForDebugging("[it2Setup] No Python package manager found");
  return null;
}
//@ chunk-78rbfds1.js:1012-1074 fingerprint = isIt2CliAvailable (1)
async function isIt2CliAvailable() {
  return (await execFileNoThrow("which", ["it2"])).code === 0;
}
//@ chunk-78rbfds1.js:1074-1754 fingerprint = installIt2 (0.915)
/**
 * 用选定的包管理器在 home 目录下安装 it2，记 swarm_iterm2_it2_install。
 */
async function installIt2(packageManager) {
  logForDebugging(`[it2Setup] Installing it2 using ${packageManager}`);
  let result;
  switch (packageManager) {
    case "uvx":
      result = await execFileNoThrowWithCwd("uv", ["tool", "install", "it2"], {
        cwd: homedir(),
      });
      break;
    case "pipx":
      result = await execFileNoThrowWithCwd("pipx", ["install", "it2"], {
        cwd: homedir(),
      });
      break;
    case "pip":
      result = await execFileNoThrowWithCwd("pip", ["install", "--user", "it2"], {
        cwd: homedir(),
      });
      if (result.code !== 0)
        result = await execFileNoThrowWithCwd("pip3", ["install", "--user", "it2"], {
          cwd: homedir(),
        });
      break;
  }
  if (result.code !== 0) {
    let error = result.stderr || "Unknown installation error";
    logForDebugging(`[it2Setup] Failed to install it2: ${error}`, {
      level: "error",
    });
    logFeatureBad("swarm_iterm2_it2_install", `${packageManager}_install_failed`);
    return {
      success: false,
      error,
      packageManager,
    };
  }
  logForDebugging("[it2Setup] it2 installed successfully");
  logFeatureOk("swarm_iterm2_it2_install");
  return {
    success: true,
    packageManager,
  };
}
//@ chunk-78rbfds1.js:1754-2552 fingerprint = verifyIt2Setup (0.862)
/**
 * 验证 it2：未安装、Python API 未开启（stderr 关键字判断）、通信失败或成功。
 */
async function verifyIt2Setup() {
  logForDebugging("[it2Setup] Verifying it2 setup...");
  if (!(await isIt2CliAvailable())) {
    logFeatureBad("swarm_iterm2_it2_verify", "not_installed");
    return {
      success: false,
      error: "it2 CLI is not installed or not in PATH",
    };
  }
  let result = await execFileNoThrow("it2", ["session", "list"]);
  if (result.code !== 0) {
    let stderr = result.stderr.toLowerCase();
    if (
      stderr.includes("api") ||
      stderr.includes("python") ||
      stderr.includes("connection refused") ||
      stderr.includes("not enabled")
    ) {
      logForDebugging("[it2Setup] Python API not enabled in iTerm2");
      logFeatureSad("swarm_iterm2_it2_verify", "python_api_not_enabled");
      return {
        success: false,
        error: "Python API not enabled in iTerm2 preferences",
        needsPythonApiEnabled: true,
      };
    }
    logFeatureBad("swarm_iterm2_it2_verify", "communication_failed");
    return {
      success: false,
      error: result.stderr || "Failed to communicate with iTerm2",
    };
  }
  logForDebugging("[it2Setup] it2 setup verified successfully");
  logFeatureOk("swarm_iterm2_it2_verify");
  return {
    success: true,
  };
}
//@ chunk-78rbfds1.js:2552-2759 fingerprint = getPythonApiInstructions (1)
/**
 * 开启 iTerm2 Python API 的操作说明文字。
 */
function getPythonApiInstructions() {
  return [
    "Almost done! Enable the Python API in iTerm2:",
    "",
    "  iTerm2 \u2192 Settings \u2192 General \u2192 Magic \u2192 Enable Python API",
    "",
    "After enabling, you may need to restart iTerm2.",
  ];
}
//@ chunk-78rbfds1.js:2759-2902 fingerprint = markIt2SetupComplete (1)
/**
 * 在全局配置写 iterm2It2SetupComplete=true。
 */
function markIt2SetupComplete(storageV5) {
  if (getGlobalConfig().iterm2It2SetupComplete !== true) {
    saveGlobalConfig(
      (current) => ({
        ...current,
        iterm2It2SetupComplete: true,
      }),
      storageV5,
    );
    logForDebugging("[it2Setup] Marked it2 setup as complete");
  }
}
//@ chunk-78rbfds1.js:2902-3044 fingerprint = setPreferTmuxOverIterm2 (1)
/**
 * 在全局配置写 preferTmuxOverIterm2。
 */
function setPreferTmuxOverIterm2(prefer, storageV5) {
  if (getGlobalConfig().preferTmuxOverIterm2 !== prefer) {
    saveGlobalConfig(
      (current) => ({
        ...current,
        preferTmuxOverIterm2: prefer,
      }),
      storageV5,
    );
    logForDebugging(`[it2Setup] Set preferTmuxOverIterm2 = ${prefer}`);
  }
}
//@ chunk-78rbfds1.js:3044-3095 fingerprint = getPreferTmuxOverIterm2 (1)
function getPreferTmuxOverIterm2() {
  return getGlobalConfig().preferTmuxOverIterm2 === true;
}
export {
  detectPythonPackageManager,
  verifyIt2Setup,
  markIt2SetupComplete,
  installIt2,
  setPreferTmuxOverIterm2,
  getPythonApiInstructions,
  getPreferTmuxOverIterm2,
};
