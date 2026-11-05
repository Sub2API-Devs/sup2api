/**
 * commands/clear/caches.ts
 *
 * 清空对话时重置各类会话缓存（读文件状态、技能、命令缓存、teleport 缓存等）并触发 session_start 钩子
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/clear/caches.ts
 * pieces: chunk-abba4dz7.js (1)
 * attribution: facade-exports 1
 */
import { clearSessionContextCaches } from "../../context.js";
import { clearIsGitMemoFor } from "../../utils/git.js";
import { sessionDateCellSlot } from "../../utils/sessionTimeZone.js";
import { resetFileIndexCache, globalFileIndexCache } from "../../hooks/fileSuggestions.js";
import { clearCommandsCache } from "../../commands.js";
import { recordSummaryFork, promptCacheTrackers } from "../../services/api/promptCacheBreakDetection.js";
import { deferredToolCacheSlot } from "../../services/api/deferredToolsState.js";
import { loadCleanupHelpers, cleanupAfterCompaction } from "../../services/compact/postCompactCleanup.js";
import {
  noteSystemPromptSectionInvalidation,
  getStickyBetas,
  clearInvokedSkills,
} from "../../bootstrap/state.js";
import {
  resetStickyBetaNameOnlyEntries,
  clearAdvisorHeld,
  clearInlineToolsRefusal,
  dropWireShapeSeed,
  clearWebSearchHistoryRejected,
  clearMediaItemCap,
  clearRefusedToolSchemas,
} from "../../bootstrap/stateSlices.js";
import { invalidateToolDescriptions } from "../../services/api/toolDescriptionCache.js";
import { clearDeclared } from "../../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { resetGetMemoryFilesCache } from "../../utils/claudemd.js";
import { claudeMdAccessTrackerSlot } from "../../utils/instructionFileAccess.js";
import { spawnStatsSlots } from "../../tasks/taskState.js";
import { clearLastIngressUuid } from "../../utils/sessionStorage.js";
import { clearSwarmPermissions } from "../../hooks/useSwarmPermissionPoller.js";
import { clearRepositoryCaches } from "../../utils/detectRepository.js";
import { clearDumpPromptState } from "../../services/api/dumpPrompts.js";
import { clearResolveGitDirCache } from "../../utils/git/gitFilesystem.js";
import { clearDynamicSkills, resetProjectSkillDirectories } from "../../skills/loadSkillsDir.js";
import { resetAllLSPDiagnosticState } from "../../services/lsp/LSPDiagnosticRegistry.js";
import { IdHolder } from "../../utils/idHolder.js";
import { RecentItemsCache } from "../../utils/recentItemsCache.js";
import { AwayEpisodeTracker } from "../../services/awayEpisodes.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { logError } from "../../utils/log.js";

//@ chunk-abba4dz7.js:901-2296 facade-exports
function clearSessionCaches(
  session,
  keptAgentIds = new Set(),
  setAppState,
  toolState,
  storageV5,
  hasLiveAgents = false,
) {
  let hasPreserved = keptAgentIds.size > 0;
  clearSessionContextCaches(session);
  clearIsGitMemoFor(session);
  sessionDateCellSlot.of(session).clear();
  resetFileIndexCache(globalFileIndexCache);
  clearCommandsCache();
  recordSummaryFork(keptAgentIds);
  if (!hasPreserved) deferredToolCacheSlot.peek(session)?.clear();
  let cleanupHelpers = loadCleanupHelpers();
  if (cleanupHelpers?.getTeleportCacheState().status === "active")
    cleanupHelpers.revertTeleportCache("transcript_cleared", "main");
  cleanupAfterCompaction(session, undefined, setAppState, undefined, undefined, storageV5);
  noteSystemPromptSectionInvalidation("clear");
  resetStickyBetaNameOnlyEntries(getStickyBetas());
  clearAdvisorHeld(getStickyBetas());
  clearInlineToolsRefusal(getStickyBetas());
  dropWireShapeSeed(getStickyBetas());
  clearWebSearchHistoryRejected(getStickyBetas());
  clearMediaItemCap(getStickyBetas());
  clearRefusedToolSchemas(getStickyBetas());
  if (!hasLiveAgents) {
    invalidateToolDescriptions();
    clearDeclared(session.host);
  }
  resetGetMemoryFilesCache(session, "session_start");
  claudeMdAccessTrackerSlot.of(session).reset();
  promptCacheTrackers.of(session).clear();
  spawnStatsSlots.of(session).reset();
  setAppState?.((_opts) => {
    if (
      _opts.storedImagePaths.size === 0 &&
      _opts.imageDescriptions.size === 0 &&
      Object.keys(_opts.displayedMessageContent).length === 0
    )
      return _opts;
    return {
      ..._opts,
      storedImagePaths: new Map(),
      imageDescriptions: new Map(),
      displayedMessageContent: {},
    };
  });
  clearLastIngressUuid();
  if (!hasPreserved) clearSwarmPermissions();
  clearRepositoryCaches();
  if (!hasPreserved) clearDumpPromptState();
  clearInvokedSkills(keptAgentIds);
  clearResolveGitDirCache();
  clearDynamicSkills();
  resetProjectSkillDirectories().catch(() => {});
  resetAllLSPDiagnosticState(session);
  if (toolState) {
    toolState.get(IdHolder).clear();
    toolState.get(RecentItemsCache).clear();
    toolState.get(AwayEpisodeTracker).clear();
    if (codeModeAccepted())
      import("../../utils/messageQueueManager.lazy.js")
        .then(({ getProcessQueue }) => {
          let { endMainThreadConversation } = require("../../utils/codeMode/replSessionEnd.js");
          endMainThreadConversation(toolState, getProcessQueue(), "the conversation was cleared");
        })
        .catch(logError);
    import("../../tools/WebFetchTool/utils.js").then(({ WebFetchCache }) =>
      toolState.get(WebFetchCache).clear(),
    );
    import("../../tools/WebFetchTool/fetchHistory.js").then(({ WebFetchHistory }) =>
      toolState.get(WebFetchHistory).clear(),
    );
    import("../../tools/BashTool/repeatMeter.js").then(({ BashRepeatMeter }) =>
      toolState.get(BashRepeatMeter).clear(),
    );
    import("../../tools/ToolSearchTool/ToolSearchTool.js").then(({ ToolSearchDescriptionCache }) =>
      toolState.get(ToolSearchDescriptionCache).clear(),
    );
  }
  import("../../tools/AgentTool/loadAgentsDir.js").then(({ clearAgentDefinitionsCache }) =>
    clearAgentDefinitionsCache(),
  );
}
export { clearSessionCaches };
