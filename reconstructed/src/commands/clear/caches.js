/**
 * commands/clear/caches.ts
 *
 * 清空对话时重置各类会话缓存（读文件状态、技能、命令缓存、teleport 缓存等）并触发 session_start 钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/clear/caches.ts
 * pieces: chunk-7egnrh1d.js (1)
 * attribution: facade-exports 1
 */
import { clearSessionContextCaches } from "../../context.js";
import { clearIsGitMemoFor } from "../../utils/git.js";
import { Gvn } from "../../utils/sessionTimeZone.js";
import { resetFileIndexCache, globalFileIndexCache } from "../../hooks/fileSuggestions.js";
import { clearCommandsCache } from "../../commands.js";
import { recordSummaryFork, promptCacheTrackers } from "../../services/api/promptCacheBreakDetection.js";
import { Sbn } from "../../services/api/deferredToolsState.js";
import { Ywt, cleanupAfterCompaction } from "../../services/compact/postCompactCleanup.js";
import {
  noteSystemPromptSectionInvalidation,
  getStickyBetas,
  clearInvokedSkills,
} from "../../bootstrap/state.js";
import {
  resetStickyBetaNameOnlyEntries,
  xDt,
  clearInlineToolsRefusal,
  dropWireShapeSeed,
  fEr,
  ODt,
  pEr,
} from "../../bootstrap/stateSlices.js";
import { invalidateToolDescriptions } from "../../services/api/toolDescriptionCache.js";
import { wXn } from "../../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { resetGetMemoryFilesCache } from "../../utils/claudemd.js";
import { ICe } from "../../utils/instructionFileAccess.js";
import { R7e } from "../../tasks/taskState.js";
import { BVs } from "../../utils/sessionStorage.js";
import { Xjs } from "../../hooks/useSwarmPermissionPoller.js";
import { clearRepositoryCaches } from "../../utils/detectRepository.js";
import { dWs } from "../../services/api/dumpPrompts.js";
import { clearResolveGitDirCache } from "../../utils/git/gitFilesystem.js";
import { clearDynamicSkills, resetProjectSkillDirectories } from "../../skills/loadSkillsDir.js";
import { resetAllLSPDiagnosticState } from "../../services/lsp/LSPDiagnosticRegistry.js";
import { wUt } from "../../utils/idHolder.js";
import { RecentItemsCache } from "../../utils/recentItemsCache.js";
import { AwayEpisodeTracker } from "../../services/awayEpisodes.js";

//@ chunk-7egnrh1d.js:863-2075 facade-exports
function clearSessionCaches(t, r = new Set(), s, o, n, m = !1) {
  let hasPreserved = r.size > 0;
  if (
    (clearSessionContextCaches(t),
    clearIsGitMemoFor(t),
    Gvn.of(t).clear(),
    resetFileIndexCache(globalFileIndexCache),
    clearCommandsCache(),
    recordSummaryFork(r),
    !hasPreserved)
  )
    Sbn.peek(t)?.clear();
  let l = Ywt();
  if (l?.getTeleportCacheState().status === "active") l.revertTeleportCache("transcript_cleared", "main");
  if (
    (cleanupAfterCompaction(t, void 0, s, void 0, void 0, n),
    noteSystemPromptSectionInvalidation("clear"),
    resetStickyBetaNameOnlyEntries(getStickyBetas()),
    xDt(getStickyBetas()),
    clearInlineToolsRefusal(getStickyBetas()),
    dropWireShapeSeed(getStickyBetas()),
    fEr(getStickyBetas()),
    ODt(getStickyBetas()),
    pEr(getStickyBetas()),
    !m)
  )
    (invalidateToolDescriptions(), wXn(t.host));
  if (
    (resetGetMemoryFilesCache(t, "session_start"),
    ICe.of(t).reset(),
    promptCacheTrackers.of(t).clear(),
    R7e.of(t).reset(),
    s?.((e) => {
      if (
        e.storedImagePaths.size === 0 &&
        e.imageDescriptions.size === 0 &&
        Object.keys(e.displayedMessageContent).length === 0
      )
        return e;
      return { ...e, storedImagePaths: new Map(), imageDescriptions: new Map(), displayedMessageContent: {} };
    }),
    BVs(),
    !hasPreserved)
  )
    Xjs();
  if ((clearRepositoryCaches(), !hasPreserved)) dWs();
  if (
    (clearInvokedSkills(r),
    clearResolveGitDirCache(),
    clearDynamicSkills(),
    resetProjectSkillDirectories().catch(() => {}),
    resetAllLSPDiagnosticState(t),
    o)
  )
    (o.get(wUt).clear(),
      o.get(RecentItemsCache).clear(),
      o.get(AwayEpisodeTracker).clear(),
      import("./chunk-8esf3qf8.js").then(({ WebFetchCache: WebFetchCache }) => o.get(WebFetchCache).clear()),
      import("./chunk-mp05jpbx.js").then(({ WebFetchHistory: WebFetchHistory }) =>
        o.get(WebFetchHistory).clear(),
      ),
      import("./chunk-veja3kzs.js").then(({ BashRepeatMeter: BashRepeatMeter }) =>
        o.get(BashRepeatMeter).clear(),
      ),
      import("./chunk-k9ccmfj2.js").then(({ ToolSearchDescriptionCache: ToolSearchDescriptionCache }) =>
        o.get(ToolSearchDescriptionCache).clear(),
      ));
  import("./chunk-t271r49x.js").then(({ clearAgentDefinitionsCache: clearAgentDefinitionsCache }) =>
    clearAgentDefinitionsCache(),
  );
}

export { clearSessionCaches };
