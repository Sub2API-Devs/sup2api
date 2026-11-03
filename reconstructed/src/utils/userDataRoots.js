/**
 * utils/userDataRoots.ts
 *
 * 用户数据根目录（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (2)
 * attribution: placement 2
 */
import * as fsPromisesModule from "fs/promises";
import { env } from "./env.js";
import { getStageFileRoot, getOutputsRoot } from "./stageFileRoots.js";
import { getErrnoCode, errorMessage } from "./errors.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { logForDebugging } from "./debug.js";

//@ chunk-82kqcve8.js:178347-178411 placement
function S1(e, n) {
  return Boolean(e) && (!n || n === "anthropic_cloud");
}
//@ chunk-82kqcve8.js:178411-178775 placement
async function ensureUserDataRoot() {
  if (!S1(env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND)) return;
  try {
    let e = [getStageFileRoot(), getOutputsRoot()];
    await Promise.all(
      e.map((n) =>
        fsPromisesModule.mkdir(n).catch((r) => {
          let s = getErrnoCode(r);
          if (s !== "EEXIST" && s !== "ENOENT")
            logForDiagnosticsNoPII("warn", "user_data_roots_mkdir_failed", { code: s ?? "unknown" });
        }),
      ),
    );
  } catch (error) {
    logForDebugging(`uploads and outputs directories not created: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}

export { S1, ensureUserDataRoot };
