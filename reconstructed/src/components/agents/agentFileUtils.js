/**
 * components/agents/agentFileUtils.ts
 *
 * 子代理定义文件读写：确保目录存在、更新 agent 文件、写入并刷盘。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/agentFileUtils.ts
 * pieces: chunk-0h4e7gnq.js (1), chunk-jhrww53q.js (1)
 * attribution: fingerprint 2
 */
import { mkdir, open } from "fs/promises";
import { dirname } from "path";
import { constants, constants as constants_2 } from "fs";
import { parkAgentBaseline } from "../../services/api/promptCacheBreakDetection.js";
import { Nd } from "../../tools/AgentTool/runAgent.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { pathToSessionSideKey } from "../../utils/storage/storageKeys.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { getPlatform } from "../../utils/platform.js";

//@ chunk-0h4e7gnq.js:81060-81304 fingerprint = ensureAgentDirectoryExists (0.584)
async function ensureAgentDirectoryExists(e, n, s) {
  let dirPath = parkAgentBaseline(e);
  if (dirPath === void 0 || !n) return;
  try {
    let r = Nd(e),
      S = isStorageV5Enabled() && s !== void 0 ? pathToSessionSideKey(r) : void 0;
    if (s !== void 0 && S !== void 0) {
      await s.write(S, dirPath, { mode: 438 & ~process.umask() });
      return;
    }
    (await mkdir(dirname(r), { recursive: !0 }), await writeFileAtomic(r, dirPath));
  } catch {}
}
//@ chunk-jhrww53q.js:48857-49040 fingerprint = writeFileAndFlush (0.4)
async function writeFileAndFlush(o, t) {
  let _ = getPlatform() === "windows" ? 0 : constants_2.O_NOFOLLOW | constants_2.O_NONBLOCK,
    E = await open(o, constants_2.O_WRONLY | constants_2.O_CREAT | constants_2.O_TRUNC | _, 438);
  try {
    await E.writeFile(t, "utf-8");
  } finally {
    await E.close();
  }
}

export { ensureAgentDirectoryExists, writeFileAndFlush };
