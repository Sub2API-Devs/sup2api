/**
 * components/agents/agentFileUtils.ts
 *
 * 子代理定义文件读写：确保目录存在、更新 agent 文件、写入并刷盘。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/agentFileUtils.ts
 * pieces: chunk-frs14hy1.js (1), chunk-xjnnz630.js (1)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { constants } from "fs";
import { open, mkdir } from "fs/promises";
import { dirname } from "path";
import { getPlatform } from "../../utils/platform.js";
import { parkAgentBaseline } from "../../services/api/promptCacheBreakDetection.js";
import { prefixTranscriptPath } from "../../tools/AgentTool/runAgent.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { pathToSessionSideKey } from "../../utils/storage/storageKeys.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";

//@ chunk-xjnnz630.js:50539-50722 fingerprint (2.1.88 match: writeFileAndFlush, 0.4)
async function writeFileAndFlush(filePath, content) {
  let flag = getPlatform() === "windows" ? 0 : constants.O_NOFOLLOW | constants.O_NONBLOCK;
  let handle = await open(filePath, constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | flag, 438);
  try {
    await handle.writeFile(content, "utf-8");
  } finally {
    await handle.close();
  }
}
//@ chunk-frs14hy1.js:90433-90677 fingerprint (2.1.88 match: ensureAgentDirectoryExists, 0.584)
async function ensureAgentDirectoryExists(agentId, enabled, storageV5) {
  let dirPath = parkAgentBaseline(agentId);
  if (dirPath === undefined || !enabled) return;
  try {
    let baselinePath = prefixTranscriptPath(agentId);
    let sideKey =
      isStorageV5Enabled() && storageV5 !== undefined ? pathToSessionSideKey(baselinePath) : undefined;
    if (storageV5 !== undefined && sideKey !== undefined) {
      await storageV5.write(sideKey, dirPath, {
        mode: 438 & ~process.umask(),
      });
      return;
    }
    await mkdir(dirname(baselinePath), {
      recursive: true,
    });
    await writeFileAtomic(baselinePath, dirPath);
  } catch {}
}
export { writeFileAndFlush, ensureAgentDirectoryExists };
