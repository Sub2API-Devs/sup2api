/**
 * utils/userDataRoots.ts
 *
 * 用户数据根目录（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import * as fsPromisesModule from "fs/promises";
import { env } from "./env.js";
import { getStageFileRoot, getOutputsRoot } from "./stageFileRoots.js";
import { getErrnoCode, errorMessage } from "./errors.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { logForDebugging } from "./debug.js";

//@ chunk-a2q0x549.js:176515-176579 placement
/**
 * 是否是第一方（console/云）远程会话。
 */
function isFirstPartyRemoteSession(remoteSessionId, provider) {
  return Boolean(remoteSessionId) && (!provider || provider === "anthropic_cloud");
}
//@ chunk-a2q0x549.js:176579-176944 placement
async function ensureUserDataRoot() {
  if (!isFirstPartyRemoteSession(env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND)) return;
  try {
    let roots = [getStageFileRoot(), getOutputsRoot()];
    await Promise.all(
      roots.map((root) =>
        fsPromisesModule.mkdir(root).catch((error) => {
          let errnoCode = getErrnoCode(error);
          if (errnoCode !== "EEXIST" && errnoCode !== "ENOENT")
            logForDiagnosticsNoPII("warn", "user_data_roots_mkdir_failed", {
              code: errnoCode ?? "unknown",
            });
        }),
      ),
    );
  } catch (error) {
    logForDebugging(`uploads and outputs directories not created: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
export { isFirstPartyRemoteSession, ensureUserDataRoot };
