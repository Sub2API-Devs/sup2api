/**
 * utils/github/ghAuthStatus.ts
 *
 * 检测 gh CLI 是否安装与登录。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/github/ghAuthStatus.ts
 * pieces: chunk-1jrvb43n.js (1)
 * attribution: fingerprint 1
 */
import { whichAsync } from "../which.js";
import { safeExecFile } from "../safeSpawn.js";

//@ chunk-1jrvb43n.js:263-1481 fingerprint = getGhAuthStatus (0.561)
/**
 * 检测 gh CLI 登录状态：not_installed / 未登录 / 已登录（读 token），老版本 gh 可选网络回退。
 */
async function getGhAuthStatus({ allowNetworkFallbackForOldGh }) {
  if (!(await whichAsync("gh")))
    return {
      status: "not_installed",
    };
  try {
    let t = await safeExecFile("gh", ["auth", "token"], {
      stdout: "ignore",
      stderr: "pipe",
      timeout: 5000,
      reject: false,
    });
    if (t.exitCode === 0)
      return {
        status: "authenticated",
        supportsAuthTokenCommand: true,
      };
    if (t.timedOut)
      return {
        status: "unknown",
        error: "`gh auth token` timed out",
      };
    if (/not logged in|no oauth token/i.test(t.stderr))
      return {
        status: "not_authenticated",
      };
    if (/unknown command/i.test(t.stderr) || (Number.isInteger(t.exitCode) && t.stderr.trim() === "")) {
      if (!allowNetworkFallbackForOldGh)
        return {
          status: "unknown",
          error: "this GitHub CLI version has no `gh auth token`",
        };
      let e = await safeExecFile("gh", ["auth", "status"], {
        stdout: "ignore",
        stderr: "pipe",
        timeout: 5000,
        reject: false,
      });
      if (e.exitCode === 0)
        return {
          status: "authenticated",
          supportsAuthTokenCommand: false,
        };
      if (e.timedOut)
        return {
          status: "unknown",
          error: "`gh auth status` timed out",
        };
      if (/logged in to/i.test(e.stderr))
        return {
          status: "authenticated",
          supportsAuthTokenCommand: false,
        };
      if (/not logged in/i.test(e.stderr))
        return {
          status: "not_authenticated",
        };
      return {
        status: "unknown",
        error: e.stderr.trim() || "`gh auth status` failed to run",
      };
    }
    return {
      status: "unknown",
      error: t.stderr.trim() || "`gh auth token` failed to run",
    };
  } catch {
    return {
      status: "not_installed",
    };
  }
}
export { getGhAuthStatus };
