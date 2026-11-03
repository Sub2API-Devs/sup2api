/**
 * utils/shell/_new/probeSpawnEnv.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: sole-consumer-new 1
 */
import { safeExecFile } from "../../safeSpawn.js";
import { SNAPSHOT_TIMEOUT_MS, ENV_ASSIGNMENT_RE_3 } from "../../bash/ShellSnapshot.js";
import { subprocessEnv } from "../../subprocessEnv.js";
import { logForDebugging } from "../../debug.js";
import { zhe } from "../shellEnvSnapshot.js";

/**
 * 用目标 shell 执行 env 探测启动时会带上的环境变量名（受控环境、有超时），记录并保存键列表；失败时保存 null。
 */
//@ chunk-e6aww6q8.js:3064610-3065136 sole-consumer-new
async function probeSpawnEnv(shellPath) {
  try {
    let result = await safeExecFile(shellPath, ["-c", "env"], {
      reject: !1,
      timeout: SNAPSHOT_TIMEOUT_MS,
      maxBuffer: 1048576,
      extendEnv: !1,
      env: {
        ...(process.env.CLAUDE_CODE_DONT_INHERIT_ENV ? {} : subprocessEnv()),
        SHELL: shellPath,
        GIT_EDITOR: "true",
        CLAUDECODE: "1",
      },
    });
    if (result.exitCode !== 0 || !result.stdout) {
      (logForDebugging(
        `Spawn-env probe failed: exit=${result.exitCode} stderr=${result.stderr?.slice(0, 200)}`,
      ),
        zhe(null));
      return;
    }
    let keys = [];
    for (let s of result.stdout.split(`
`)) {
      let match = s.match(ENV_ASSIGNMENT_RE_3);
      if (match) keys.push(match[1]);
    }
    (logForDebugging(`Spawn-env probe captured ${keys.length} keys`), zhe(keys));
  } catch (error) {
    (logForDebugging(`Spawn-env probe error: ${error}`), zhe(null));
  }
}

export { probeSpawnEnv };
