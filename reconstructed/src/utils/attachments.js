/**
 * utils/attachments.ts
 *
 * 每轮附件生成：getAttachments 按用户输入（@ 文件/MCP 资源/代理/技能/同伴提及）与会话状态（队列命令、计划/自动模式、待办与任务提醒、延迟工具/代理/MCP 指令增量、嵌套与相关记忆、IDE 选区、诊断、token/预算提醒等）并发产出 Attachment 对象，由 getAttachmentMessages 包成 attachment 消息进入对话，normalizeAttachmentForAPI 再转成 system-reminder。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/attachments.ts
 * pieces: chunk-bnwcqde4.js (1), chunk-e6aww6q8.js (133)
 * attribution: fingerprint 49, placement 8, layout 70, file-local 5, callgraph-fingerprint 2
 */
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  parse,
  parse as parse_2,
  parse as parse_3,
  parse as parse_4,
  parse as parse_5,
  parse as parse_6,
  parse as parse_7,
  parse as parse_8,
  parse as parse_9,
  parse as parse_10,
  parse as parse_11,
  parse as parse_12,
  parse as parse_13,
  parse as parse_14,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
} from "path";
import { setImmediate as lHo, setImmediate as THo } from "timers/promises";
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import {
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  stat as stat_6,
  stat as stat_7,
  stat as stat_8,
  stat as stat_9,
  stat as stat_10,
  stat as stat_11,
  stat as stat_12,
  stat as stat_13,
  stat as stat_14,
  stat as stat_15,
  stat as stat_16,
  stat as stat_17,
  stat as stat_18,
  stat as stat_19,
  stat as stat_20,
  stat as stat_21,
  stat as stat_22,
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readdir as readdir_11,
  readdir as readdir_12,
  readdir as readdir_13,
  readdir as readdir_14,
  readdir as readdir_15,
  readdir as readdir_16,
  readdir as readdir_17,
  readdir as readdir_18,
  readdir as readdir_19,
  readdir as readdir_20,
  readdir as readdir_21,
  readdir as readdir_22,
  readdir as readdir_23,
  readdir as readdir_24,
  readdir as readdir_25,
  readdir as readdir_26,
  readdir as readdir_27,
  readdir as readdir_28,
  readdir as readdir_29,
  readdir as readdir_30,
  readdir as readdir_31,
  readdir as readdir_32,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
} from "fs/promises";
import { memoryFreshnessText } from "../memdir/memoryAge.js";
import { pCn, Fae, MEMORY_FILE_RECALL_BYTES, DUe } from "../memdir/memdir.js";
import {
  Q_,
  Mq,
  isFileReadDenied_2,
  isFileReadDenied,
  O5t,
  Yb,
  OVe,
  seenWithheldPaths,
  iB,
  WGr,
  SHo,
  fjt,
  MVe,
  recordWithheldInstructionFiles,
  logWithheldInstructionFiles,
  SM,
  createReadThrottle,
  pathSpellingsForRead,
  C_e,
  readDirIfSpellingsStable,
  stashAttachedReadPermission,
  checkPathRefused,
  ICe,
  readPinnedFile,
} from "./instructionFileAccess.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../services/analytics/growthbook.js";
import { getServerUrl as getServerUrl_2, unwrapCcrProxyUrl } from "../services/mcp/config.js";
import { isHostedDesktopSession } from "./computerUse/toolRendering.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "./computerUse/common.js";
import { env } from "./env.js";
import { getCachedClientData, getGlobalConfig } from "./config.js";
import { isDelegatedObservationContext, isMainConversationContext } from "./agentContext.js";
import {
  Cqe,
  hasDeclaredToolSet,
  resolveDeclaredToolSet,
  shouldAnnounceDeferredTools,
  canInlineToolAdditions,
} from "../services/api/declaredToolSet.js";
import { Us } from "../services/projects/threadRows.js";
import { classifyQuerySource } from "../services/api/requestHeaders.js";
import { getToolPermissionContext, getUltracodeRequested } from "./permissions/toolPermissionContext.js";
import { seedWireShapeFromRecord } from "../services/api/tether.js";
import { j_e, recordedDeferredTools } from "./contextAttachments/promptSnapshot.js";
import {
  seedDeferredToolReferences,
  keptDeferredToolNames,
  logRetractionFailure,
} from "../services/api/deferredToolsState.js";
import { isEchoWireToolInputsEnabled, adoptWireToolInputCopies } from "./wireToolInputEcho.js";
import { logError } from "./log.js";
import { imageLimitsForModel } from "./attachmentMedia.js";
import { getSandboxInstructionsAttachments } from "./attachments/sandboxInstructions.js";
import {
  getEnvironmentChangeAttachments,
  VCn,
  detectEnvironmentDirectoryChange,
  getOutputStyleAndLanguageAttachments,
} from "./attachments/environmentChange.js";
import {
  withdrawCoworkMemoryContext,
  collectCcrMemoryAttachments,
} from "../services/accountMemory/memoryContext.js";
import { getAttachmentTimingStore, timeAttachment } from "./attachments/attachmentTiming.js";
import { createAbortController, createChildAbortController } from "./abortController.js";
import {
  getReplyGatePolicy,
  getDisableFileMentions,
  getDisableSlashCommands,
  getIsNonInteractiveSession,
  getStickyBetas,
  notePersonPrompt,
  getConversationToolsUsed,
  isDiskless,
  getSessionId,
  hasExitedPlanModeInSession,
  setHasExitedPlanMode,
  setNeedsPlanModeExitAttachment,
  needsPlanModeExitAttachment,
  needsAutoModeExitAttachment,
  setNeedsAutoModeExitAttachment,
  getOriginalCwd,
  getToolsMachine,
  getEnsureConnectedClient,
  getProjectRoot,
  getSessionSkillAllowlist,
  getProjectRootOrNull,
  getSdkBetas,
} from "../bootstrap/state.js";
import { uniq, stringArray, count } from "./collections.js";
import { isCoordinatorMainThread } from "../coordinator/coordinatorMode.js";
import { toolMatchesName, isProactivityActive } from "../Tool.js";
import { SKILL } from "../tools/SkillTool/skillToolNames.js";
import { kRn, buildSkillMentionAttachments } from "./attachments/skillMentions.js";
import {
  withNamedFolderYieldsRestored,
  getSkillToolCommands,
  filterCommandsByAllowlist,
  F7,
  dedupeBundledSkills,
  dropShadowedFallbackSkills,
  getCommands,
} from "../commands.js";
import { todoToolsEnabled } from "./sessionKind.js";
import { isTaskToolsEnabled, listTasks, getTaskListId } from "./tasks.js";
import {
  isRemoteToolForwardingSwitchOn,
  isCloudSessionProcess,
  isForwardingOffNoticeOn,
  forwardingOffReasonNow,
} from "../services/remoteTools/servingGates.js";
import { XVe } from "./worktreeIsolation.js";
import {
  shouldConsiderToolHostsNotice,
  buildToolHostsNoticeAttachments,
} from "../remote/tools/toolHostsNotice.js";
import { prefetchArtifactOpening } from "./attachments/artifactOpeningPrefetch.js";
import { getRuntimeModelSwitchAnnouncements, CK } from "./model/model.js";
import { nXr, isSortedOtterOn } from "../services/mcp/mcpGates.js";
import { collectFailedMcpServers, redialAllowsServer } from "../services/mcp/redactMcpErrors.js";
import {
  claudeMdExtraState,
  getWorktreeRoots,
  isInMainRepoOutsideWorktree,
  getAdditionalClaudeMdDirs,
  getMaxMemoryFileChars,
  K3t,
  getManagedAndUserConditionalRules,
  getMemoryFilesForNestedDirectory,
  getConditionalRulesForCwdLevelDirectory,
  getWithheldInstructionFiles,
  applyClaudeMdExcludesToInjected,
} from "./claudemd.js";
import { proactivityAttachments } from "./proactivity.js";
import { Nas } from "../services/analytics/juniperShoalConfig.js";
import { isAgentSwarmsEnabled } from "./agentSwarmsEnabled.js";
import { isFocusModeFlag } from "./focusMode.js";
import {
  isSilentTurnReminderEnabled,
  getSilentTurnReminderSeconds,
  SILENT_TURN_REMINDER_MIN_GAP,
  NRn,
  getSilentTurnReminderText,
} from "./attachments/silentTurnReminder.js";
import { getCriticalReminderAttachment } from "./attachments/criticalReminders.js";
import {
  isTurnCompanion,
  extractTextContent_2,
  isOnlySystemReminders,
  lnt,
  fAn,
  getUserMessageText,
  isThinkingOnlyMessage,
} from "./messages.js";
import {
  isElapsedTimeReminderEnabled,
  getElapsedTimeReminderAttachments,
} from "./attachments/elapsedTimeReminder.js";
import {
  getTotalTokensReminderMode,
  shouldRemindAfterUserTurn,
  pXn,
  getTotalTokensReminderBudget,
  formatTotalTokensTag,
} from "./attachments/totalTokensReminder.js";
import { isWorkflowsAvailable, nTn, isProSubscriber } from "./workflows/workflowGates.js";
import { latestWorkflowSize } from "./workflowSizeGuideline.js";
import { JRn, lowResourceReminders } from "./resourceWatchdog.js";
import { W7e, gdn, hdn, AttachmentTimingProfile, sdn, mdn } from "./queryProfiler.js";
import { jsonStringify } from "./slowOperations.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromNumber } from "../services/analytics/safeMetadata.js";
import {
  ImageResizeError,
  checkImageBlockSource,
  maybeResizeAndDownsampleImageBlock,
} from "./imageResizer.js";
import { logForDebugging, logAntError, createAttachmentMessage_2 } from "./debug.js";
import {
  withTelemetryMessage,
  toError,
  isAbortError,
  isENOENT,
  AbortError as AbortError_2,
} from "./errors.js";
import { isGlimmeringFinchGateOn } from "./messages/untrustedArtifactContent.js";
import { Bbt, Z1t, TZ, listUnreadableToolsUsed } from "./agentListing.js";
import { hasSendMessageTool } from "../tools/SendMessageTool/constants.js";
import { e6 } from "../tools/SendMessageTool/SendMessageTool.js";
import {
  isHumanOrUnset,
  isAutoContinuationOrigin,
  isProjectsRelay,
  egr,
  mintedDeliveries,
} from "./messageProvenance.js";
import { xBr, rSt, isHiddenFromModel, B7, dropSyncedNameClashes } from "./commandPredicates.js";
import { isHumanOrigin } from "./turnOrigin.js";
import { replacePromptText, formatNewDiagnosticsAttachment } from "./attachments/diagnostics.js";
import { getTaskRunState } from "./task/taskNotifications.js";
import { keepBridgeFileIds } from "./attachments/bridgeAttachments.js";
import { normalizeTaskNotificationOrigin } from "./backgroundSessionResume.js";
import { Kv, collectDeclaredPollEvents, eCt, getPollEventEnvelope } from "./pollEvents.js";
import { cue } from "./messages/crossSessionMessages.js";
import { DTt, ltt } from "./messages/apiNormalization.js";
import { declaredRoundStamp } from "./pollEvents/declarations.js";
import { drainPendingMessages } from "../tasks/LocalAgentTask/pendingMessages.js";
import { agentMessageOrigin, receiveAgentMessage } from "../plugins/functionHooks/sessionReceive.js";
import { SQ } from "./peerMessageHeaders.js";
import { n8n } from "../services/mcp/ccrTurnId.js";
import { isNonEmptyImageAttachment } from "./messages/messagePredicates.js";
import { NO_CONTENT_MESSAGE, NO_RESPONSE_REQUESTED } from "../constants/messages.js";
import { ASKUSERQUESTION } from "../tools/AskUserQuestionTool/prompt.js";
import { BRIEF_TOOL_NAME, LEGACY_BRIEF_TOOL_NAME } from "./conversationRecovery.js";
import { EXITPLANMODE } from "../tools/ExitPlanModeTool/constants.js";
import { SEND_USER_FILE_TOOL_NAME } from "../tools/SendUserFileTool/prompt.js";
import { jb } from "../bootstrap/sessionSlices.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { settlePlanFileCachePrime, getPlanSlug, getPlanFilePath, getPlan } from "./plans.js";
import { g3, getPromptModel, isThriftySonicEnabled, Vgi } from "./model/promptBundles.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { FILE_EDIT_TOOL_NAME } from "../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../tools/FileWriteTool/prompt.js";
import { isTeammate, getTeamName, getAgentId, getAgentName, getTeammateContext } from "./teammate.js";
import {
  isAutoModeConsentFlowEnabled,
  getDenyRuleIndex,
  getDispatchableAgents,
  mergePersistedDenyRules,
} from "./permissions/permissions.js";
import { isAutoModeActive } from "./permissions/autoModeState.js";
import { isUltrathinkEnabled, hasUltrathinkKeyword } from "./thinking.js";
import { hasUltraplanKeyword } from "./ultraplan/keyword.js";
import { isUltracodeActive } from "./effort.js";
import {
  getNonDeferrableBuiltins,
  toolSearchToolFilteredOut,
  isToolSearchEnabledOptimistic,
  modelSupportsToolReference,
  isVertexModelWithoutToolSearch,
  isToolSearchToolAvailable,
  toolSearchDeclaredIn,
  toolSearchRejectedOn,
  getDeferredToolsDelta,
  maybeAddBrowserBatchToChromeSelect,
  getToolSearchMode,
  extractDiscoveredToolNames,
} from "./toolSearch.js";
import { computeDeclaredToolSet } from "../services/api/claude.js";
import {
  isDeferredTool,
  isDeferredToolByEngine,
  isDeferredToolInConversation,
  TOOL_SEARCH_TOOL_NAME,
} from "../tools/ToolSearchTool/prompt.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import { findLatestDeferredToolsDelta } from "../services/api/toolDefinitionShape.js";
import { getToolListingHash, buildToolListingEntries } from "./api.js";
import { UNCLASSIFIED } from "../services/mcp/mcpToolRemovalReasons.js";
import { WXn } from "../cli/printUsageSummary.js";
import {
  describeToolAvailability,
  isPermanentUnavailability,
  pendingServersForTool,
} from "../services/mcp/mcpToolAvailability.js";
import { AGENT, FORK } from "../tools/AgentTool/constants.js";
import { getMcpServerNameOfTool } from "../services/mcp/utils.js";
import { filterAgentsByMcpRequirements } from "../tools/AgentTool/loadAgentsDir.js";
import { compareStringsGrouped, plural, countCharInString } from "./stringUtils.js";
import { formatAgentLine, uAe } from "../tools/AgentTool/prompt.js";
import { marketplaceSuffix } from "./plugins/pluginIdentifier.js";
import { BUILTIN } from "./telemetry/pluginTelemetry.js";
import { getSubagentSteer } from "./model/subagentSteer.js";
import { Yi } from "../commands/mobile/mobile.js";
import { CLAUDE_IN_CHROME_MCP_SERVER_NAME } from "./claudeInChrome/common.js";
import { isClaudeAiProxyServer } from "../services/mcp/builtinServerNames.js";
import { CHROME_TOOL_SEARCH_REMINDER } from "./toolSearchChrome.js";
import { getMcpInstructionsDelta } from "./mcpInstructionsDelta.js";
import { buildMcpDroppedToolsDelta } from "./attachments/mcpDroppedTools.js";
import { getSettings_DEPRECATED } from "./settings/settings.js";
import { getOutputStyleConfig } from "../constants/outputStyles.js";
import { T_ } from "../tools/AgentTool/backgroundGates.js";
import { isTidySlothGateOn } from "../tasks/LocalShellTask/backgroundNotices.js";
import { isMonitorShellTask } from "../tasks/taskKinds.js";
import { isLocalShellTask } from "../tasks/LocalShellTask/guards.js";
import { hasAccessToIDEExtensionDiffFeature_2 } from "./ide.js";
import {
  kW,
  cC,
  findWorktreeForPath,
  UZe,
  mapPathIntoWorktree,
  getAttachmentReadBlockReason,
  ret,
} from "./attachments/fileAttachments.js";
import { isRestrictedReadBlocked } from "./claudeInChrome/fileUpload.js";
import { getCwd, gl } from "./cwd.js";
import { getFsImplementation } from "./fsOperations.js";
import {
  hasInstructionsLoadedHook,
  executeInstructionsLoadedHooks,
  executePreToolHooks,
  emitHookMetrics,
} from "./hooks.js";
import { getReadTimestamp } from "../tools/FileReadTool/savedOutputPaths.js";
import {
  isTruncatedCopyOf,
  truncateInstructionsAtLine,
  latestInstructionFiles,
} from "./contextAttachments/instructions.js";
import { __, bAt, y1, Gie } from "./remoteFileState.js";
import { collectNestedMemoryContents } from "./attachments/nestedMemory.js";
import { pathInAllowedWorkingPath, outsideReadBlocked } from "./permissions/filesystem.js";
import { uCn, cCn, selectMemoryRecall } from "../memdir/memoryRecallSelect.js";
import { getModelContextInfo } from "./model/modelContextInfo.js";
import { getAutoCompactThresholdTokens, Tp, OSt } from "../services/compact/autoCompact.js";
import { stripInProgressAssistantMessage } from "../commands/btw/btw.js";
import { isCoworkAny } from "./entrypointKinds.js";
import { getDefaultFileReadingLimits } from "../tools/FileReadTool/limits.js";
import { MAX_LINES_TO_READ } from "../tools/FileReadTool/prompt.js";
import {
  readFileInRangeFast,
  mor,
  checkFileStateResyncOnce,
  FileTooLargeError,
  SelectedRangeTooLargeError,
} from "./readFileInRange.js";
import { addLineNumbers, getFileModificationTimeAsync, QSr } from "./file.js";
import {
  validateContentTokens,
  MaxFileReadTokenExceededError,
  allowLargeRoomTokens,
  FileReadTool,
  readImageWithTokenBudget,
  isUncountedPDFOverWholeReadCap,
} from "../tools/FileReadTool/FileReadTool.js";
import { expandPath, isNotebookPath } from "./path.js";
import { logAtMention } from "./telemetry/thirdPartyEventRecords.js";
import { hasBinaryExtension } from "../constants/files.js";
import { isCrossSessionMessagingEnabled } from "./crossSessionMessagingGate.js";
import { parsePeerMentions, resolveTeamName, resolvePeerMentions } from "./peerAddressing.js";
import { isConnectedOrCached } from "../skills/bundled/scheduleRemoteAgents.js";
import { Lfn } from "../services/mcp/withheldResources.js";
import {
  Ifn,
  classifySkillResourceUri,
  countUniqueFiles,
  verifySkillFile,
  MCP_SKILL_FILE_PROBLEMS,
} from "../services/mcp/mcpSkills.js";
import { Uv } from "../services/compact/keptTools.js";
import { READMCPRESOURCETOOL } from "../tools/ReadMcpResourceTool/prompt.js";
import { readMcpResource, callMcpTool } from "../services/mcp/mcpWireUtils.js";
import { reportOnce } from "./reportOnce.js";
import { getSnippetForTwoFileDiff } from "../tools/FileEditTool/utils.js";
import { isSensitiveFileName } from "./permissions/sensitivePaths.js";
import { getFileExtensionForAnalytics, agentTypeForTelemetry } from "../services/analytics/metadata.js";
import { errorTelemetryFields } from "./accessibility/screenReader.js";
import {
  getAutoMemPathState,
  getAutoMemPath,
  isIndexRecallEnabled,
  activeSessionLogExcluder,
  isAutoMemoryEnabled,
  isMemoryRecallEnabled,
  getAutoMemEntrypoint,
} from "../memdir/paths.js";
import { isAutoMemReadFenced } from "./permissions/readBlock.js";
import { waitForFirstStorePull, firstStorePullPending } from "../services/orgMemory/storePulls.js";
import { resolveAgentMemoryDirForRecall, isRealpathWithin } from "../tools/AgentTool/agentMemory.js";
import { isMultiStoreSyncAvailable } from "../services/memorySync/availability.js";
import { readMemoryFileForRecall } from "../memdir/memoryRecall.js";
import { FILE_READ_TOOL_NAME, Mge } from "../tools/FileReadTool/constants.js";
import { MEMDIR_RELEVANCE } from "../memdir/findRelevantMemories.js";
import { normalizeNfkc, isNonEmptyIdentifier, Ywr } from "./sanitization.js";
import { hasClearedToolResultsAfterIdle } from "../services/compact/microCompact.js";
import { getOrgMemoryDecision } from "../services/orgMemory/orgMemoryDecision.js";
import { withDeadline } from "./sleep.js";
import { addSkillDirectories } from "../skills/loadSkillsDir.js";
import { QRe, QKo } from "../services/memorySync/memorySkills.js";
import { Ji } from "../../vendor/lodash-es/uniqBy.js";
import { getSkillListingDigest, formatCommandsWithinBudget } from "../tools/SkillTool/prompt.js";
import { getContextWindow } from "./model/configs.js";
import { getSkillUsageScore } from "./suggestions/skillUsageTracking.js";
import { bytesPerTokenForModel } from "./model/modelDisplay.js";
import { gq, rAe, Rfn } from "./attachments/atMentions.js";
import { SHELL_TOOL_NAMES as SHELL_TOOL_NAMES_2 } from "./shell/shellToolUtils.js";
import { Zar } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { Q2e } from "../services/diagnosticTracking.js";
import { checkForLSPDiagnostics, clearAllLSPDiagnostics } from "../services/lsp/LSPDiagnosticRegistry.js";
import { roughTokenCountEstimationForObject } from "../services/tokenEstimation.js";
import { CFe, $Yt } from "./model/claude3Models.js";
import { getPdfPageCount } from "./pdf.js";
import { mut } from "./truncateGraphemes.js";
import { isInboundFileArriving } from "../bridge/attachmentFilesWait.js";
import { SymlinkReadRefusedError } from "./fsSafety/atomicWriteStaging.js";
import { TODO_WRITE_TOOL_NAME } from "../tools/TodoWriteTool/constants.js";
import { isBriefToolActive } from "../constants/prompts.js";
import { TASK_CREATE_TOOL_NAME } from "../tools/TaskCreateTool/constants.js";
import { TASK_UPDATE_TOOL_NAME } from "../tools/TaskUpdateTool/constants.js";
import { getSurfacedToolNames } from "../bootstrap/stateSlices.js";
import { generateTaskAttachments } from "./task/framework.js";
import { HM } from "../services/compact/compactCarry.js";
import { getTaskOutputPath } from "./task/diskOutput.js";
import { checkForNewAsyncHookResponses } from "./hooks/AsyncHookRegistry.js";
import { isAsyncHookResponseDuplicate } from "./attachments/asyncHookResponses.js";
import { hUt } from "./hooks/hookEventHelpers.js";
import { messageIdentityKey, markMessagesAsReadByPredicate } from "./teammateMailbox.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { effectiveContextWindow } from "../services/compact/autoCompactWindow.js";
import { tokenCountFromLastAPIResponse, getTokenUsage } from "./tokens.js";
import { isForkBoilerplateMessage } from "../constants/xml.js";
import { getTokenCountFromUsage as getTokenCountFromUsage_5 } from "./messages/usageAndStopReason.js";
import { ACe } from "../cost-tracker.js";
import { buildGoalSentinelAttachment } from "../commands/goal/goal.js";

/**
 * 记忆文件标题行："<相对时间> Memory: <路径>:"，无时间时 "Memory: <路径>:"；relevant_memories 附件与 normalizeAttachmentForAPI 共用。
 */
//@ chunk-e6aww6q8.js:117298-117385 fingerprint = memoryHeader (1)
function memoryHeader(path, mtimeMs) {
  let staleness = memoryFreshnessText(mtimeMs),
    s = pCn(path);
  return staleness
    ? `${staleness}

Memory: ${s}:`
    : `Memory: ${s}:`;
}
/**
 * origin.kind 为 task-notification 时返回 "task-notification"，否则 "prompt"。旧版名 INLINE_NOTIFICATION_MODES 为错配（那是常量集合 jxr）。
 */
//@ chunk-e6aww6q8.js:195424-195506 fingerprint = INLINE_NOTIFICATION_MODES (1)
function getQueuedNotificationMode(e) {
  return e?.kind === "task-notification" ? "task-notification" : "prompt";
}
/**
 * （误归 computerUse）判断目录项在读权限下是否应隐藏。
 */
//@ chunk-e6aww6q8.js:1327724-1327982 placement
async function isEntryHiddenByPermissions(entry, ctx, r) {
  let mapped = ctx.spellings.map((spelling) => join_59(spelling, entry.name)),
    [primaryPath] = mapped;
  if (primaryPath === void 0 || ctx.isDenied(primaryPath, ctx.context)) return !0;
  let w = !entry.isFile() && !entry.isDirectory() && Q_(ctx.context) ? await Mq(primaryPath, ctx, r) : mapped;
  return (
    w === void 0 ||
    isFileReadDenied_2(w, ctx.context) ||
    (!entry.isFile() && isFileReadDenied(w, ctx.context))
  );
}
/**
 * 目录项扫描上限 1 万。
 */
//@ chunk-e6aww6q8.js:1327982-1327994 placement
var MAX_SCANNED_ENTRIES = 1e4;
/**
 * 目录项列出上限 1000。
 */
//@ chunk-e6aww6q8.js:1327994-1328007 placement
var MAX_LISTED_ENTRIES = 1000;
/**
 * （误归 computerUse）过滤被拒绝的目录项，最多扫描 1 万、列出 1000，超出追加 "… and N more entries"。
 */
//@ chunk-e6aww6q8.js:1328056-1328376 placement = sanitizeAppNames (0.528)
async function filterListableEntries(entries, n, r) {
  let s = Q_(n.context),
    names = [],
    min = Math.min(entries.length, MAX_SCANNED_ENTRIES),
    index = 0;
  while (index < min && names.length < MAX_LISTED_ENTRIES) {
    if (s && index > 0 && index % O5t === 0) await THo();
    let entry = entries[index],
      q = entry === void 0 || (await isEntryHiddenByPermissions(entry, n, r).catch(() => !0));
    if (s && r.aborted) break;
    if ((index++, entry !== void 0 && !q)) names.push(entry.name);
  }
  return index < entries.length ? [...names, `\u2026 and ${entries.length - index} more entries`] : names;
}
/**
 * 记忆文件是否计入：tengu_paper_halyard 开时排除 Project/Local 类型，其余要求有内容。旧版名 getNestedMemoryAttachmentsForFile 为错配。
 */
//@ chunk-e6aww6q8.js:1351122-1351244 fingerprint = getNestedMemoryAttachmentsForFile (0.777)
function shouldIncludeMemoryFile(e) {
  if (
    (e.type === "Project" || e.type === "Local") &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_paper_halyard", !1)
  )
    return !1;
  return Boolean(e.content);
}
/**
 * URL 是否为 https://mcp.slack.com（严格校验）。
 */
//@ chunk-e6aww6q8.js:2305550-2305865 placement
function isSlackMcpUrl(e) {
  if (typeof e !== "string" || /[^\u0021-\u007e]|[\\@]/.test(e)) return !1;
  let lower = e.slice(0, 21).toLowerCase(),
    charAt = e.charAt(21);
  if (
    lower !== "https://mcp.slack.com" ||
    (charAt !== "" && charAt !== "/" && charAt !== "?" && charAt !== "#")
  )
    return !1;
  try {
    let s = new URL(e);
    return s.origin === "https://mcp.slack.com" && !s.pathname.startsWith("//");
  } catch {
    return !1;
  }
}
/**
 * computer-use MCP 的使用说明长文本（工具分层选择、访问流程、链接与金融操作安全）。
 */
//@ chunk-e6aww6q8.js:2305865-2311068 placement
var COMPUTER_USE_MCP_INSTRUCTIONS = `You have a computer-use MCP available (tools named \`mcp__computer-use__*\`). It lets you take screenshots of the user's desktop and control it with mouse clicks, keyboard input, and scrolling.

**Pick the right tool for the app.** Each tier trades speed/precision against coverage:

1. **Dedicated MCP for the app** \u2014 if the task is in an app that has its own MCP (Slack, Gmail, Calendar, Linear, etc.) and that MCP is connected, use it. API-backed tools are fast and precise.
2. **Chrome MCP** (\`mcp__claude-in-chrome__*\`) \u2014 if the target is a web app and there's no dedicated MCP for it, use the browser tools. DOM-aware, much faster than clicking pixels. If the Chrome extension isn't connected, ask the user to install it rather than falling through to computer use.
3. **Computer use** \u2014 for native desktop apps (Maps, Notes, Finder, Photos, System Settings, any third-party native app) and cross-app workflows. Computer use IS the right tool here \u2014 don't decline a native-app task just because there's no dedicated MCP for it.

This is about what's available, not error handling \u2014 if a dedicated MCP tool errors, debug or report it rather than silently retrying via a slower tier.

**Look before you assert.** If the user asks about app state (what's open, what's connected, what an app can do), take a screenshot and check before answering. Don't answer from memory \u2014 the user's setup or app version may differ from what you expect. If you're about to say an app doesn't support an action, that claim should be grounded in what you just saw on screen, not general knowledge. Similarly, \`list_granted_applications\` or a fresh \`screenshot\` is cheaper than a wrong assertion about what's running.

**Loading via ToolSearch \u2014 load in bulk, not one-by-one:** if computer-use tools are in the deferred list, load them ALL in a single ToolSearch call: \`{ query: "computer-use", max_results: 30 }\`. The keyword search matches the server-name substring in every tool name, so one query returns the entire toolkit. Don't use \`select:\` for individual tools \u2014 that's one round-trip per tool.

**Access flow:** before any computer-use action you must call \`request_access\` with the list of applications you need. The user approves each application explicitly, and you may need to call it again mid-task if you discover you need another application. Finder is an application like any other: clicking the desktop, the Dock, or a Finder window (including Go to Folder) requires a Finder grant. The menu bar does not, as long as the app that is frontmost is one you already have access to.

**Tiered apps:** some apps are granted at a restricted tier based on their category \u2014 the tier is displayed in the approval dialog and returned in the \`request_access\` response:
- **Browsers** (Safari, Chrome, Firefox, Edge, Arc, etc.) \u2192 tier **"read"**: visible in screenshots, but clicks and typing are blocked. You can read what's already on screen. For navigation, clicking, or form-filling, use the claude-in-chrome MCP (tools named \`mcp__claude-in-chrome__*\`; load via ToolSearch if deferred).
- **Terminals and IDEs** (Terminal, iTerm, VS Code, JetBrains, etc.) \u2192 tier **"click"**: visible and left-clickable, but typing, key presses, right-click, modifier-clicks, and drag-drop are blocked. You can click a Run button or scroll test output, but cannot type into the editor or integrated terminal, cannot right-click (the context menu has Paste), and cannot drag text onto them. For shell commands, use the Bash tool.
- **Everything else** \u2192 tier **"full"**: no restrictions.

The tier is enforced by the frontmost-app check: if a tier-"read" app is in front, \`left_click\` returns an error; if a tier-"click" app is in front, \`type\` and \`right_click\` return errors. The error tells you what tier the app has and what to do instead. \`open_application\` works at any tier \u2014 bringing an app forward is a read-level operation.

**Link safety \u2014 treat links in emails and messages as suspicious by default.**
- **Never click web links with computer-use tools.** If you encounter a link in a native app (Mail, Messages, a PDF, etc.), do NOT \`left_click\` it. Open the URL via the claude-in-chrome MCP instead.
- **See the full URL before following any link.** Visible link text can be misleading \u2014 hover or inspect to get the real destination.
- **Links from emails, messages, or unknown-sender documents are suspicious by default.** If the destination URL is at all unfamiliar or looks off, ask the user for confirmation before proceeding.
- **Inside the Chrome extension** you can click links with the extension's tools, but the suspicion check still applies \u2014 verify unfamiliar URLs with the user.

**Financial actions - do not execute trades or move money.** Budgeting and accounting apps (Quicken, YNAB, QuickBooks, etc.) are granted at full tier so you can categorize transactions, generate reports, and help the user organize their finances. But never execute a trade, place an order, send money, or initiate a transfer on the user's behalf - always ask the user to perform those actions themselves.`;
/**
 * Slack MCP 发消息前查看频道说明的提示。
 */
//@ chunk-e6aww6q8.js:2311068-2311297 placement
var SLACK_MCP_POSTING_GUIDANCE =
  "Before posting a new message to a Slack channel the user didn't name, read its topic and description with slack_search_channels, and if they say that kind of message belongs elsewhere, tell the user instead of posting.";
/**
 * MCP 服务器附加说明块：Slack MCP 的发帖提示，以及（未禁用时）computer-use 说明。旧版名 pinCacheEdits 为错配；属于 MCP 说明，归错文件。
 */
//@ chunk-e6aww6q8.js:2311297-2311501 placement = pinCacheEdits (0.707)
function getMcpServerInstructionBlocks(e) {
  let mapped = [
    ...new Set(
      e
        .filter((s) => {
          let h = getServerUrl_2(s.config);
          return h !== null && isSlackMcpUrl(unwrapCcrProxyUrl(h));
        })
        .map((s) => s.name),
    ),
  ].map((s) => ({ serverName: s, block: SLACK_MCP_POSTING_GUIDANCE }));
  return isHostedDesktopSession()
    ? mapped
    : [{ serverName: COMPUTER_USE_MCP_SERVER_NAME, block: COMPUTER_USE_MCP_INSTRUCTIONS }, ...mapped];
}
/**
 * {TURNS_SINCE_WRITE:10, TURNS_BETWEEN_REMINDERS:10}：距上次 TodoWrite 与上次提醒都满 10 轮才发 todo_reminder。
 */
//@ chunk-e6aww6q8.js:3310228-3310295 fingerprint = TODO_REMINDER_CONFIG (1)
var accountMemoryRecall = null,
  TODO_REMINDER_CONFIG = { TURNS_SINCE_WRITE: 10, TURNS_BETWEEN_REMINDERS: 10 };
/**
 * CLAUDE_CODE_TODO_REMINDER_MODE 优先；否则 GrowthBook tengu_soft_slate_nudge 为 off 时 "off"，默认 "baseline"。
 */
//@ chunk-e6aww6q8.js:3310295-3310443 layout
function getTodoReminderMode() {
  let CLAUDE_CODE_TODO_REMINDER_MODE = env.CLAUDE_CODE_TODO_REMINDER_MODE;
  if (CLAUDE_CODE_TODO_REMINDER_MODE !== void 0) return CLAUDE_CODE_TODO_REMINDER_MODE;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_soft_slate_nudge", "baseline") === "off"
    ? "off"
    : "baseline";
}
/**
 * {TURNS_BETWEEN_MAINTENANCE:10}：ultra effort 维持期间每 10 轮重发一次精简 ultra_effort_enter。
 */
//@ chunk-e6aww6q8.js:3310443-3310552 fingerprint = PLAN_MODE_ATTACHMENT_CONFIG (0.8)
var PLAN_MODE_ATTACHMENT_CONFIG = { TURNS_BETWEEN_ATTACHMENTS: 5, FULL_REMINDER_EVERY_N_ATTACHMENTS: 5 },
  ULTRA_EFFORT_CONFIG = { TURNS_BETWEEN_MAINTENANCE: 10 };
/**
 * 有限数字向下取整且至少为 1，否则 undefined。
 */
//@ chunk-e6aww6q8.js:3310552-3310652 layout
function toPositiveInt(e) {
  if (typeof e !== "number" || !Number.isFinite(e)) return;
  return Math.max(1, Math.floor(e));
}
/**
 * ultra effort 精简提醒间隔：CLAUDE_CODE_JUNIPER_SUNDIAL → 远程设置/GrowthBook tengu_juniper_sundial → 默认 10。
 */
//@ chunk-e6aww6q8.js:3310652-3310891 layout
function getUltraEffortReminderInterval() {
  let CLAUDE_CODE_JUNIPER_SUNDIAL = env.CLAUDE_CODE_JUNIPER_SUNDIAL;
  if (CLAUDE_CODE_JUNIPER_SUNDIAL !== void 0) return CLAUDE_CODE_JUNIPER_SUNDIAL;
  let n = toPositiveInt(getCachedClientData()?.tengu_juniper_sundial);
  if (n !== void 0) return n;
  let r = toPositiveInt(getFeatureValue_CACHED_MAY_BE_STALE("tengu_juniper_sundial", null));
  if (r !== void 0) return r;
  return ULTRA_EFFORT_CONFIG.TURNS_BETWEEN_MAINTENANCE;
}
/**
 * {MAX_SESSION_BYTES:61440}：一个会话里相关记忆附件累计上限 60KB，超过不再预取。
 */
//@ chunk-e6aww6q8.js:3310891-3310925 fingerprint = RELEVANT_MEMORIES_CONFIG (1)
var RELEVANT_MEMORIES_CONFIG = { MAX_SESSION_BYTES: 61440 };
/**
 * CLAUDE_CODE_DISABLE_ATTACHMENTS、CLAUDE_CODE_SIMPLE 或 bareFork 时为真；此时 getAttachments 只产出队列命令与少数必需增量。
 */
//@ chunk-e6aww6q8.js:3310925-3311033 layout
function areAttachmentsDisabled(e) {
  return Boolean(env.CLAUDE_CODE_DISABLE_ATTACHMENTS || env.CLAUDE_CODE_SIMPLE || e.options.bareFork);
}
/**
 * getAttachments：每轮生成附件的入口。子代理委托观察时返回空；附件被禁用时只给队列命令、代理列表增量、沙箱说明等。否则在 1 秒超时的独立 AbortController 下并发运行各生成器（每个经 maybe 包装、计时、出错返回空）：用户输入类（@ 文件、MCP 资源、代理/技能/同伴提及）、全线程类（队列命令、环境、模型、延迟工具/代理/MCP 增量、变更文件、嵌套记忆、技能列表、计划/自动模式、待办、团队、关键提醒、token/预算提醒…）、仅主线程类（IDE 选区/打开文件、输出风格、诊断、任务状态、异步钩子、记忆更新、withheld 记忆、token 用量）。结果经 dedupeWithheldMemory 去重。
 */
//@ chunk-e6aww6q8.js:3311033-3319176 fingerprint = getAttachments (0.511)
async function getAttachments(
  input,
  toolUseContext,
  ideSelection,
  queuedCommands,
  messages,
  querySource,
  options,
) {
  if (isDelegatedObservationContext(toolUseContext.agentContext)) return [];
  let conversationLatches = options?.conversationLatches ?? Cqe(toolUseContext),
    normalizedMessages = Us(messages ?? []),
    shouldWithdrawSpawnedLoopMemory =
      options?.afterToolStep === !0 &&
      (toolUseContext.agentId !== void 0 || classifyQuerySource(querySource) !== "main") &&
      normalizedMessages.some(
        (rn) =>
          rn.type === "attachment" &&
          rn.attachment.type === "cowork_memory_context" &&
          rn.attachment.content !== null,
      ),
    declaredToolSource =
      conversationLatches === void 0
        ? void 0
        : getDeclaredToolSource(
            conversationLatches,
            normalizedMessages,
            toolUseContext.options,
            toolUseContext.options.tools,
            getToolPermissionContext(toolUseContext),
          );
  if (messages !== void 0)
    try {
      let rn = options?.conversationLatches ?? Cqe(toolUseContext);
      if (rn !== void 0 && !rn.declaredToolsDecided) {
        seedWireShapeFromRecord(
          rn,
          j_e(messages, toolUseContext.options)?.wireShape,
          toolUseContext.options.mainLoopModel,
        );
        let pn = recordedDeferredTools(normalizedMessages);
        if (
          (mergeNameOnlyAnnouncements(rn, pn),
          seedDeferredToolReferences(normalizedMessages, [...pn.entries.values()], {
            strippedReferences: pn.strippedReferences,
          }),
          pn.toolInputCopies.size > 0 && isEchoWireToolInputsEnabled(normalizedMessages))
        )
          adoptWireToolInputCopies(normalizedMessages, pn.toolInputCopies);
      }
    } catch (error) {
      logError(error);
    }
  let toolPoolRefreshes = toolUseContext.options.refreshTools !== void 0,
    modelImageLimits = imageLimitsForModel(toolUseContext.options.mainLoopModel),
    countRemainingWakePollEventsAfter =
      toolUseContext.messageQueue.countRemainingWakePollEventsAfter(queuedCommands);
  if (areAttachmentsDisabled(toolUseContext)) {
    if (options?.inputMentionsOnly) return [];
    let rn = await getQueuedCommandAttachments(
      queuedCommands,
      modelImageLimits,
      countRemainingWakePollEventsAfter,
      { tools: toolUseContext.options.tools, messages: toolUseContext.messages },
    );
    if (env.CLAUDE_CODE_SIMPLE) return rn;
    return [
      ...rn,
      ...(await getAgentListingDeltaAttachment(toolUseContext, normalizedMessages)),
      ...getSandboxInstructionsAttachments(toolUseContext.options.tools, messages),
      ...(await getEnvironmentChangeAttachments(toolUseContext, messages)),
      ...(shouldWithdrawSpawnedLoopMemory
        ? await maybe("spawned_loop_memory_withdrawal", async () =>
            withdrawCoworkMemoryContext(toolUseContext.session.host, normalizedMessages),
          )
        : []),
    ];
  }
  let abortController = getAttachmentTimingStore();
  abortController?.mark("setup");
  let attachmentAbortController = createAbortController(),
    timeoutId = setTimeout((ac) => ac.abort(), 1000, attachmentAbortController),
    timedContext = { ...toolUseContext, abortController: attachmentAbortController },
    isMainThread = !toolUseContext.agentId,
    hostStatusNudge = getReplyGatePolicy()?.statusNudge,
    hostPromptReminder = getReplyGatePolicy()?.promptReminder,
    mentionedFiles = input ? extractAtMentionedFiles(input) : uniq(options?.ownFilePaths ?? []),
    atMentionedFilesPromise =
      mentionedFiles.length > 0 && !env.CLAUDE_CODE_EVAL_CONFINED
        ? getDisableFileMentions() || env.CLAUDE_CODE_DISABLE_FILE_MENTIONS
          ? getFileMentionReferences(mentionedFiles, toolUseContext, messages ?? toolUseContext.messages)
          : getAtMentionedFileAttachments(
              mentionedFiles,
              timedContext,
              toolUseContext.abortController,
              options?.promptLoopId,
            )
        : Promise.resolve([]),
    userInputProducers = input
      ? [
          maybe("at_mentioned_files", () => atMentionedFilesPromise),
          maybe("mcp_resources", () =>
            env.CLAUDE_CODE_EVAL_CONFINED
              ? Promise.resolve([])
              : getMcpResourceAttachments(
                  input,
                  timedContext.options.mcpClients,
                  timedContext.options.mcpResources,
                  messages ?? timedContext.messages,
                  timedContext.inheritedMcpSkillMessages,
                  timedContext.abortController.signal,
                  toolUseContext.abortController.signal,
                ),
          ),
          maybe("agent_mentions", () =>
            Promise.resolve(
              processAgentMentions(input, toolUseContext.options.agentDefinitions.activeAgents),
            ),
          ),
          maybe("skill_mentions", () =>
            Promise.resolve(
              options?.isHumanTypedPrompt &&
                isMainThread &&
                !isCoordinatorMainThread(toolUseContext) &&
                !getDisableSlashCommands() &&
                toolUseContext.options.tools.some((tool) => toolMatchesName(tool, SKILL)) &&
                kRn()
                ? buildSkillMentionAttachments(
                    options.preExpansionInput ?? input,
                    withNamedFolderYieldsRestored(toolUseContext.options.commands),
                    {
                      typed: options.preExpansionInput !== void 0,
                      pastedContents: options.pastedContents,
                      permissionContext: getToolPermissionContext(toolUseContext),
                    },
                  )
                : [],
            ),
          ),
          maybe("peer_mentions", () =>
            options?.isHumanTypedPrompt && options.preExpansionInput !== void 0
              ? atMentionedFilesPromise.then((rn) =>
                  getPeerMentionAttachments(options.preExpansionInput, toolUseContext, rn),
                )
              : Promise.resolve([]),
          ),
        ]
      : mentionedFiles.length > 0
        ? [maybe("at_mentioned_files", () => atMentionedFilesPromise)]
        : [];
  abortController?.mark("prompt_producers");
  let userAttachmentResults = await Promise.all(userInputProducers);
  if ((abortController?.mark("prompt_producers"), options?.inputMentionsOnly)) {
    let rn = await maybe("nested_memory", () => getNestedMemoryTriggerAttachments(timedContext));
    return (
      abortController?.mark("ambient_wait"),
      clearTimeout(timeoutId),
      [...userAttachmentResults.flat(), ...rn].filter((pn) => pn !== void 0 && pn !== null)
    );
  }
  let getTodoOrTaskReminders = (() => {
      let rn;
      return () =>
        (rn ??= todoToolsEnabled()
          ? isTaskToolsEnabled()
            ? getTaskReminderAttachments(messages, toolUseContext.options.tools, toolUseContext.storageV5)
            : getTodoReminderAttachments(messages, toolUseContext)
          : Promise.resolve([]));
    })(),
    remoteToolHostsNotice = isRemoteToolForwardingSwitchOn() ? XVe().remote?.noticeAttachment : void 0,
    remoteToolHostsCorrection = isRemoteToolForwardingSwitchOn()
      ? XVe().remote?.correctionAttachment
      : void 0,
    shouldShowToolHostsNotice =
      !isRemoteToolForwardingSwitchOn() &&
      isCloudSessionProcess() &&
      toolUseContext.agentId === void 0 &&
      shouldConsiderToolHostsNotice(toolUseContext.toolState, messages ?? []) &&
      isForwardingOffNoticeOn(),
    allThreadProducers = [
      maybe("queued_commands", () =>
        getQueuedCommandAttachments(queuedCommands, modelImageLimits, countRemainingWakePollEventsAfter, {
          tools: toolUseContext.options.tools,
          messages: toolUseContext.messages,
        }),
      ),
      maybe("sandbox_instructions", () =>
        Promise.resolve(getSandboxInstructionsAttachments(toolUseContext.options.tools, messages)),
      ),
      ...(VCn()
        ? [
            maybe("artifact_opening_prefetch", () =>
              prefetchArtifactOpening(toolUseContext, messages, input, options?.heldAppend === !0),
            ),
          ]
        : []),
      maybe("environment", () => detectEnvironmentDirectoryChange(toolUseContext, messages)),
      maybe("model", () => getRuntimeModelSwitchAnnouncements(toolUseContext, messages)),
      maybe("session_settings", () => getOutputStyleAndLanguageAttachments(toolUseContext, messages)),
      maybe("ultrathink_effort", () => Promise.resolve(getUltrathinkEffortAttachment(input))),
      maybe("deferred_tools_delta", () =>
        Promise.resolve(
          getDeferredToolsDeltaAttachments(
            toolUseContext.options.tools,
            toolUseContext.options.mainLoopModel,
            normalizedMessages,
            {
              callSite: isMainThread ? "attachments_main" : "attachments_subagent",
              querySource: querySource,
            },
            toolUseContext.options.mcpClients
              .filter((mcpClient) => mcpClient.type === "pending")
              .map((rn) => rn.name),
            getIsNonInteractiveSession()
              ? getNeedsAuthMcpServerNames(toolUseContext.options.mcpClients, toolUseContext.options.tools)
              : void 0,
            nXr()
              ? collectFailedMcpServers(
                  toolUseContext.options.mcpClients,
                  redialAllowsServer(toolPoolRefreshes && !0),
                )
              : void 0,
            () => {
              let tools = toolUseContext.options.tools,
                pn = !0,
                no = keptDeferredToolNames(normalizedMessages, tools, {
                  keepMcp: !0,
                  surfacedOnWire: (toolUseContext.stickyBetas ?? getStickyBetas()).surfacedOnWire,
                }),
                hn = [];
              try {
                hn = hasDeclaredToolSet(declaredToolSource, tools, !0);
              } catch (error) {
                logRetractionFailure(error);
                let yn = new Set(tools.map((Kn) => Kn.name));
                hn = declaredToolSource?.names.filter((Kn) => !yn.has(Kn)) ?? [];
              }
              return classifyRevokedTools(
                no === void 0 && hn.length === 0 ? void 0 : uniq([...(no ?? []), ...hn]),
                toolUseContext.options.mcpClients,
                getToolPermissionContext(toolUseContext),
                declaredToolSource,
              );
            },
            declaredToolSource,
            buildDeferredToolsLatchContext(
              options?.conversationLatches ?? Cqe(toolUseContext),
              toolUseContext,
              querySource,
            ),
            toolPoolRefreshes
              ? {
                  ...buildToolRevocationClassifier(toolUseContext),
                  serversDeclaredInline: new Set(
                    declaredToolSource?.names.flatMap(
                      (rn) => declaredToolSource.sourceFor(rn)?.mcpInfo?.serverName ?? [],
                    ),
                  ),
                }
              : void 0,
            toolUseContext.options,
          ),
        ),
      ),
      maybe("agent_listing_delta", () => getAgentListingDeltaAttachment(toolUseContext, normalizedMessages)),
      maybe("mcp_instructions_delta", () =>
        Promise.resolve(
          getMcpInstructionsDeltaAttachment(
            toolUseContext.options.mcpClients,
            toolUseContext.options.tools,
            toolUseContext.options.mainLoopModel,
            normalizedMessages,
            declaredToolSource,
            toolPoolRefreshes && isSortedOtterOn(),
          ),
        ),
      ),
      maybe("mcp_dropped_tools_delta", () =>
        Promise.resolve(getMcpDroppedToolsAttachment(toolUseContext, normalizedMessages)),
      ),
      ...(remoteToolHostsNotice
        ? [
            maybe("tool_hosts_notice", () =>
              remoteToolHostsNotice(timedContext, messages ?? [], "attachment_scan"),
            ),
          ]
        : shouldShowToolHostsNotice
          ? [
              maybe("tool_hosts_notice", () =>
                Promise.resolve(
                  buildToolHostsNoticeAttachments(
                    timedContext,
                    messages ?? [],
                    isForwardingOffNoticeOn,
                    forwardingOffReasonNow,
                  ),
                ),
              ),
            ]
          : []),
      ...(remoteToolHostsCorrection
        ? [
            maybe("tool_hosts_correction", () =>
              remoteToolHostsCorrection(timedContext, {
                turnStart: input !== null || options?.isRegularUserPrompt === !0,
              }),
            ),
          ]
        : []),
      maybe("changed_files", () => getChangedFiles(timedContext)),
      maybe("nested_memory", () =>
        getNestedMemoryTriggerAttachments(
          claudeMdExtraState.peek(toolUseContext.session)?.readFor ? toolUseContext : timedContext,
          messages,
        ),
      ),
      maybe("dynamic_skill", () => getDynamicSkillAttachments(timedContext)),
      maybe("skill_listing", () => getSkillListingAttachmentsLazy(timedContext, normalizedMessages)),
      maybe("plan_mode", () => getPlanModeAttachments(input, messages, toolUseContext, options)),
      maybe("plan_mode_exit", () => getPlanModeExitAttachment(messages, toolUseContext)),
      maybe("proactivity", () => proactivityAttachments(Us(messages ?? []), toolUseContext)),
      maybe("auto_mode", () => getAutoModeAttachments(messages, toolUseContext)),
      maybe("auto_mode_exit", () => getAutoModeExitAttachment(messages, toolUseContext)),
      maybe("todo_reminders", getTodoOrTaskReminders),
      ...(Nas() !== null
        ? [
            maybe("tool_search_usage_reminder", () =>
              getToolSearchUsageReminderAttachment(
                messages,
                toolUseContext,
                async () => (await getTodoOrTaskReminders()).length > 0,
                declaredToolSource,
              ),
            ),
          ]
        : []),
      ...(isAgentSwarmsEnabled()
        ? [
            maybe("teammate_mailbox", async () => getTeammateMailboxAttachments(toolUseContext)),
            maybe("team_context", async () => getTeamContextAttachment(messages ?? [])),
          ]
        : []),
      maybe("agent_pending_messages", async () =>
        getAgentPendingMessageAttachments(
          toolUseContext.agentId,
          toolUseContext.taskRegistry,
          toolUseContext.options.tools,
          toolUseContext.messages,
        ),
      ),
      maybe("critical_system_reminder", () =>
        Promise.resolve(
          getCriticalSystemReminderAttachment(toolUseContext.criticalSystemReminder_EXPERIMENTAL),
        ),
      ),
      ...(shouldWithdrawSpawnedLoopMemory
        ? [
            maybe("spawned_loop_memory_withdrawal", async () =>
              withdrawCoworkMemoryContext(toolUseContext.session.host, normalizedMessages),
            ),
          ]
        : []),
      ...(isMainThread &&
      input === null &&
      !options?.isRegularUserPrompt &&
      !options?.deliveredTurnStart &&
      !isFocusModeFlag() &&
      hostStatusNudge === void 0 &&
      isSilentTurnReminderEnabled(toolUseContext.options.mainLoopModel)
        ? [
            maybe("silent_turn_reminder", () =>
              Promise.resolve(
                getSilentTurnReminderAttachment(
                  messages ?? [],
                  toolUseContext.options.mainLoopModel,
                  toolUseContext.session.host.clock.now(),
                ),
              ),
            ),
          ]
        : []),
      ...(isMainThread &&
      input === null &&
      !options?.isRegularUserPrompt &&
      !options?.deliveredTurnStart &&
      !options?.heldAppend &&
      hostStatusNudge !== void 0 &&
      !queuedCommands.some((rn) => rn.projectsUserTurn === !0)
        ? [
            maybe("host_status_nudge", () =>
              Promise.resolve(
                getCriticalReminderAttachment(
                  messages ?? [],
                  hostStatusNudge,
                  toolUseContext.session.host.clock.now(),
                  isTurnCompanion,
                  toolUseContext.options.tools,
                ),
              ),
            ),
          ]
        : []),
      ...(isMainThread &&
      (options?.isRegularUserPrompt || options?.deliveredTurnStart) &&
      hostPromptReminder !== void 0
        ? [
            maybe("host_prompt_reminder", () =>
              Promise.resolve(getCriticalSystemReminderAttachment(hostPromptReminder)),
            ),
          ]
        : []),
      ...(input === null &&
      !options?.isRegularUserPrompt &&
      !options?.deliveredTurnStart &&
      !options?.heldAppend &&
      isElapsedTimeReminderEnabled(toolUseContext.options.mainLoopModel)
        ? [
            maybe("elapsed_time_reminder", () =>
              Promise.resolve(getElapsedTimeReminderAttachments(toolUseContext)),
            ),
          ]
        : []),
      maybe("total_tokens_reminder", () => {
        let rn =
          (options?.isRegularUserPrompt ?? !1) &&
          getTotalTokensReminderMode(toolUseContext.options.mainLoopModel, void 0) !== "off" &&
          shouldRemindAfterUserTurn();
        return Promise.resolve(
          (input === null && !options?.deliveredTurnStart) || rn
            ? getTotalTokensReminderAttachment(
                toolUseContext.session,
                messages ?? [],
                toolUseContext.options.mainLoopModel,
                toolUseContext.agentId,
                rn,
                toolUseContext.options.totalTokensReminderBudget,
                toolUseContext.options.isTotalTokensReminderBudgetOnTopOfStart === !0,
              )
            : [],
        );
      }),
      maybe("budget_usd", async () =>
        Promise.resolve(getMaxBudgetUsdAttachment(toolUseContext.options.maxBudgetUsd)),
      ),
    ],
    mainThreadProducers = isMainThread
      ? [
          ...(isWorkflowsAvailable()
            ? [
                maybe("workflow_keyword_request", () =>
                  Promise.resolve(
                    options?.isHumanTypedPrompt && !options.suppressWorkflowKeyword && nTn()
                      ? getWorkflowKeywordAttachment(options.preExpansionInput ?? input)
                      : [],
                  ),
                ),
                maybe("ultra_effort_enter", () =>
                  Promise.resolve(
                    options?.isRegularUserPrompt || options?.deliveredTurnStart
                      ? getUltraEffortAttachments(messages, toolUseContext)
                      : [],
                  ),
                ),
                maybe("workflow_size_guideline_change", () =>
                  Promise.resolve(
                    options?.isRegularUserPrompt
                      ? latestWorkflowSize(
                          Us(messages ?? []),
                          getGlobalConfig().workflowSizeGuideline,
                          isProSubscriber(),
                        )
                      : [],
                  ),
                ),
              ]
            : []),
          maybe("ide_selection", async () => getSelectedLinesFromIDE(ideSelection, toolUseContext)),
          maybe("ide_opened_file", async () => getOpenedFileFromIDE(ideSelection, toolUseContext, messages)),
          maybe("queued_ide_selections", async () =>
            (
              await Promise.all(
                queuedCommands
                  .filter(isInlineNotificationMode)
                  .flatMap(({ ideSelection: ideSelection }) =>
                    ideSelection
                      ? [
                          getSelectedLinesFromIDE(ideSelection, toolUseContext),
                          getOpenedFileFromIDE(ideSelection, toolUseContext, messages),
                        ]
                      : [],
                  ),
              )
            ).flat(),
          ),
          maybe("output_style", () => getOutputStyleAttachment(toolUseContext)),
          maybe("diagnostics", async () =>
            getDiagnosticAttachments(toolUseContext.options.tools, toolUseContext.session),
          ),
          maybe("lsp_diagnostics", async () =>
            getLSPDiagnosticAttachments(toolUseContext.options.tools, toolUseContext.session),
          ),
          maybe("unified_tasks", async () =>
            getUnifiedTaskAttachments(toolUseContext.options.tools, toolUseContext.taskRegistry),
          ),
          maybe("async_hook_responses", async () => getAsyncHookResponseAttachments(messages ?? [])),
          ...(options?.afterToolStep &&
          classifyQuerySource(querySource) === "main" &&
          env.CLAUDE_CODE_MEMORY_CONTEXT_NO_WAIT
            ? [
                maybe("late_memory_context", async () =>
                  collectCcrMemoryAttachments(toolUseContext.session.host, normalizedMessages),
                ),
              ]
            : []),
          ...(JRn()
            ? [maybe("low_resource_status", () => Promise.resolve(lowResourceReminders(normalizedMessages)))]
            : []),
          maybe("memory_update", () => Promise.resolve(getMemoryUpdateAttachments(toolUseContext, messages))),
          ...[],
          maybe("withheld_memory", () =>
            Promise.resolve(
              Yb.of(toolUseContext.session).owed.size === 0
                ? []
                : getWithheldMemoryAttachment(
                    toolUseContext.session,
                    OVe(toolUseContext.session, seenWithheldPaths(toolUseContext, messages ?? [])),
                  ),
            ),
          ),
          maybe("token_usage", async () =>
            Promise.resolve(
              getTokenUsageAttachment(
                messages ?? [],
                toolUseContext.options.mainLoopModel,
                toolUseContext.options.autoCompactWindow,
              ),
            ),
          ),
        ]
      : [];
  abortController?.mark("ambient_start");
  let [allThreadResults, mainThreadResults] = await Promise.all([
    Promise.all(allThreadProducers),
    Promise.all(mainThreadProducers),
  ]);
  return (
    abortController?.mark("ambient_wait"),
    clearTimeout(timeoutId),
    dedupeWithheldMemory(
      [...userAttachmentResults.flat(), ...allThreadResults.flat(), ...mainThreadResults.flat()].filter(
        (rn) => rn !== void 0 && rn !== null,
      ),
    )
  );
}
/**
 * 去掉 withheld_memory 里已作为 nested_memory 出现或重复的路径，条目为空则丢弃整条附件。
 */
//@ chunk-e6aww6q8.js:3319176-3319423 layout
function dedupeWithheldMemory(e) {
  let n = new Set(e.flatMap((r) => (r.type === "nested_memory" ? [r.path] : [])));
  return e.flatMap((r) => {
    if (r.type !== "withheld_memory") return [r];
    let filtered = r.entries.filter(({ path: path }) => !n.has(path) && n.add(path));
    return filtered.length === 0 ? [] : [{ ...r, entries: filtered }];
  });
}
/**
 * maybe(label, fn)：运行一个附件生成器并计时；5% 采样记 tengu_attachment_compute_duration（大小、数量、是否出错）；出错时记日志并返回空数组，不影响其他附件。
 */
//@ chunk-e6aww6q8.js:3319423-3320109 fingerprint = maybe (0.706)
async function maybe(label, f) {
  let startTime = Date.now(),
    startTime_2 = performance.now(),
    h = getAttachmentTimingStore();
  h?.producerBegan();
  let y = Math.random() < 0.05;
  try {
    let result = await f(),
      w = Date.now() - startTime;
    if ((W7e(label, startTime_2, h?.markedAt), y)) {
      let attachmentSizeBytes = result
        .filter((G) => G !== void 0 && G !== null)
        .reduce((total, attachment) => total + jsonStringify(attachment).length, 0);
      logEvent("tengu_attachment_compute_duration", {
        label: fromEnum(label),
        duration_ms: w,
        attachment_size_bytes: attachmentSizeBytes,
        attachment_count: result.length,
      });
    }
    return result;
  } catch (error) {
    let w = Date.now() - startTime;
    if ((W7e(label, startTime_2, h?.markedAt), y))
      logEvent("tengu_attachment_compute_duration", { label: fromEnum(label), duration_ms: w, error: !0 });
    if (error instanceof ImageResizeError)
      logForDebugging(`Attachment image resize failed in ${label}: ${error.message}`, { level: "error" });
    else logError(withTelemetryMessage(toError(error), "attachment generator failed"));
    return (logAntError(`Attachment error in ${label}`, error), []);
  }
}
/**
 * 能作为队列命令附件送入的模式集合：prompt、task-notification。
 */
//@ chunk-e6aww6q8.js:3320109-3320157 layout = INLINE_NOTIFICATION_MODES (1)
var INLINE_NOTIFICATION_MODES = new Set(["prompt", "task-notification"]);
/**
 * 队列命令自带 toolsUsed 且开关开启时，算出与对话里已用工具的差集 {toolsUsedDelta}。
 */
//@ chunk-e6aww6q8.js:3320157-3320260 layout
function getToolsUsedDelta(e, n) {
  let r = e === void 0 || !isGlimmeringFinchGateOn() ? void 0 : Bbt(e, n);
  return r === void 0 ? void 0 : { toolsUsedDelta: r };
}
/**
 * 开关关闭时把队列命令 toolsUsed 说明拼进提示词文本；开启时原样返回（改由 toolsUsedDelta 字段携带）。
 */
//@ chunk-e6aww6q8.js:3320260-3320322 layout
function appendToolsUsedNote(e, n, r) {
  return n === void 0 || isGlimmeringFinchGateOn() ? e : Z1t(e, TZ(n, r));
}
/**
 * 队列命令模式是否在 INLINE_NOTIFICATION_MODES 里。
 */
//@ chunk-e6aww6q8.js:3320322-3320361 layout
function isInlineNotificationMode(e) {
  return INLINE_NOTIFICATION_MODES.has(e.mode);
}
/**
 * 把消息队列里的 prompt/task-notification 命令转成 queued_command 附件（含图片块、粘贴内容、来源、uuid、delivery_id），前面加上 poll_events 附件；记录用户提交的提示词。2.1.88 同名函数的 316 版本。
 */
//@ chunk-e6aww6q8.js:3320361-3323197 layout
async function getQueuedCommandAttachments(commands, imageLimits, remainingWakePollEvents = 0, opts) {
  if (!commands) return [];
  let h = opts?.tools !== void 0 && !hasSendMessageTool(opts.tools),
    y = opts?.tools !== void 0 && e6(),
    S = buildPollEventsAttachment(commands, remainingWakePollEvents, opts?.messages ?? []),
    filtered = commands.filter(isInlineNotificationMode);
  for (let L of filtered)
    if (
      L.mode === "prompt" &&
      !L.isMeta &&
      L.shouldQuery !== !1 &&
      L.textNotTyped !== !0 &&
      isHumanOrUnset(L.origin)
    )
      xBr(
        typeof L.value === "string"
          ? L.value
          : extractTextContent_2(
              L.value,
              `
`,
            ),
        void 0,
        void 0,
        void 0,
      );
  return Promise.all(
    filtered.map(async (command) => {
      let G = command.uuid || randomUUID_32();
      if (
        ((command.attachmentSourceUuid = G),
        command.mode === "prompt" &&
          isHumanOrigin(command.origin) &&
          !command.isMeta &&
          !command.verifiedSlackHumanTurn)
      )
        notePersonPrompt(G, new Date().toISOString(), command.clientPlatform);
      let q = [],
        Z = [],
        ke =
          command.isMeta === !0 && isAutoContinuationOrigin(command.origin)
            ? void 0
            : command.promptSubmitted?.text,
        we = ke === void 0 ? command.value : replacePromptText(command.value, ke);
      if (typeof we === "string") we = appendToolsUsedNote(we, command.toolsUsed, opts?.messages ?? []);
      try {
        if (typeof we !== "string")
          we = await Promise.all(
            we.map(async (Ie) =>
              Ie.type === "image" ? (await checkImageBlockSource(Ie, imageLimits)).block : Ie,
            ),
          );
        let Ae = await buildPastedImageBlocks(command.pastedContents, imageLimits);
        ((q = Ae.blocks), (Z = Ae.ids));
      } catch (error) {
        if (error instanceof ImageResizeError)
          logForDebugging(
            `getQueuedCommandAttachments: dropping images for one queued command, keeping its text: ${error.message}`,
            { level: "error" },
          );
        else
          (logError(withTelemetryMessage(toError(error), "queued command image build failed")),
            logAntError("getQueuedCommandAttachments image build", error));
      }
      let Ee =
        command.taskDelivery && !getTaskRunState().bashTaskSnapshots.get(command.taskDelivery.taskId)?.fetched
          ? command.taskDelivery
          : void 0;
      if (q.length > 0) {
        let Ae =
          typeof we === "string"
            ? we
            : (ke ??
              (typeof command.value === "string"
                ? command.value
                : extractTextContent_2(
                    command.value,
                    `
`,
                  )));
        we = ke !== void 0 && ke.trim() === "" ? [...q] : [{ type: "text", text: Ae }, ...q];
      }
      return (
        (command.deliveryId ??= randomUUID_32()),
        {
          type: "queued_command",
          prompt: we,
          source_uuid: G,
          delivery_id: command.deliveryId,
          imagePasteIds: q.length > 0 ? Z : void 0,
          fileAttachments: command.fileAttachments,
          inlinedImagePaths: command.inlinedImagePaths,
          imageFileUuids: keepBridgeFileIds(command.imageFileUuids, command.value, we),
          commandMode: command.mode,
          origin: normalizeTaskNotificationOrigin(command.origin),
          ...(ke !== void 0 &&
            ke !==
              (typeof command.value === "string"
                ? command.value
                : extractTextContent_2(
                    command.value,
                    `
`,
                  )) && { promptRewritten: !0 }),
          ...(command.runId !== void 0 && { runId: command.runId }),
          timestamp: command.timestamp,
          isMeta: command.isMeta,
          ...getToolsUsedDelta(command.toolsUsed, opts?.messages ?? []),
          ...(command.usage && { usage: command.usage }),
          ...(Ee && { taskDelivery: Ee }),
          ...(command.verifiedSlackHumanTurn && { verifiedSlackHumanTurn: !0 }),
          ...(command.projectsUserTurn && { projectsUserTurn: !0 }),
          ...(command.emailSenderTurn !== void 0 && { emailSenderTurn: command.emailSenderTurn }),
          ...(command.inputSource !== void 0 && { inputSource: command.inputSource }),
          ...(command.origin?.kind === "peer" &&
            (h || (y && command.origin.senderTaskId === void 0)) && { sendMessageToolAbsent: !0 }),
          ...(command.hearthRelayRows && { hearthRelayRows: command.hearthRelayRows }),
          ...(command.hearthRelayThreadTs && { hearthRelayThreadTs: command.hearthRelayThreadTs }),
          ...(command.hearthRelayMessageIds && { hearthRelayMessageIds: command.hearthRelayMessageIds }),
          ...(command.mode === "prompt" &&
            !command.isMeta &&
            isHumanOrigin(command.origin) &&
            !command.verifiedSlackHumanTurn &&
            !isOnlySystemReminders(
              (typeof we === "string"
                ? we
                : extractTextContent_2(
                    we,
                    `
`,
                  )
              ).trimStart(),
            ) &&
            lnt() && { humanTurn: !0 }),
          ...(isProjectsRelay(command.origin) && fAn() && { besideToolResults: !0 }),
          ...egr({
            origin: command.origin,
            isMeta: command.isMeta,
            verifiedSlackHumanTurn: command.verifiedSlackHumanTurn,
            commandMode: command.mode,
          }),
        }
      );
    }),
  )
    .then(batchRelayedSlackPrompts)
    .then((L) => (S ? [S, ...L] : L));
}
/**
 * 队列中的轮询事件（poll event）合并成一个 poll_events 附件：envelopes、kinds、toolsUsed、媒体、剩余唤醒数、来源等。
 */
//@ chunk-e6aww6q8.js:3323197-3323716 layout
function buildPollEventsAttachment(e, n, r) {
  let filtered = e.filter(Kv);
  if (filtered.length === 0) return null;
  let h = collectDeclaredPollEvents(filtered),
    mapped = filtered.map((w) => w.pollEvent?.kind ?? "unknown"),
    S = mapped.every(eCt) ? [] : listUnreadableToolsUsed(getConversationToolsUsed().names(), r);
  return {
    type: "poll_events",
    envelopes: filtered.map(getPollEventEnvelope),
    kinds: mapped,
    ...(S.length > 0 && { toolsUsed: S }),
    ...(filtered.some((w) => w.pollEvent?.media !== void 0) && {
      media: filtered.map((w) => w.pollEvent?.media ?? []),
    }),
    remainingWakeCount: n,
    timestamp: filtered.at(-1)?.timestamp,
    provenance: filtered.map((w) => w.pollEvent?.provenance ?? null),
    ...(h !== void 0 && { declared: h }),
    ...{},
    ...(cue(mapped) && DTt() && { userRoleGuard: !0 }),
    ...declaredRoundStamp(filtered),
  };
}
/**
 * 连续的已验证 Slack 人工轮次提示词合并：第一条带 batchedRelayPrompts，其余标记 renderedByBatchHead。
 */
//@ chunk-e6aww6q8.js:3323716-3324119 layout
function batchRelayedSlackPrompts(e) {
  let n = (s) =>
      s.verifiedSlackHumanTurn === !0 &&
      s.isMeta !== !0 &&
      isHumanOrUnset(s.origin) &&
      typeof s.prompt === "string" &&
      !s.inlinedImagePaths?.length &&
      !s.toolsUsedDelta?.length,
    r = 0;
  while (r < e.length) {
    if (!n(e[r])) {
      r++;
      continue;
    }
    let s = r + 1;
    while (s < e.length && n(e[s])) s++;
    if (s - r >= 2) {
      let sliced = e.slice(r, s);
      sliced[0].batchedRelayPrompts = sliced.map((y) => y.prompt);
      for (let y = 1; y < sliced.length; y++) sliced[y].renderedByBatchHead = !0;
    }
    r = s;
  }
  return e;
}
/**
 * 子代理待处理消息（来自主线程/同伴）转成 queued_command 附件；同伴来源时经过转发处理，缺 SendMessage 工具时标记 sendMessageToolAbsent。
 */
//@ chunk-e6aww6q8.js:3324119-3324744 layout
async function getAgentPendingMessageAttachments(agentId, n, r, s = []) {
  if (!agentId) return [];
  let h = drainPendingMessages(agentId, n),
    y = [];
  for (let L of h) {
    let G = agentMessageOrigin(L.origin);
    if (G === void 0) {
      y.push(L);
      continue;
    }
    let q = await receiveAgentMessage(G, L.text, agentId);
    if (q.consumed === void 0)
      y.push(
        q.text === L.text
          ? L
          : {
              ...L,
              text: q.text,
              ...(L.origin?.kind === "peer" && { origin: SQ(L.origin, q.text, L.text) }),
            },
      );
  }
  n8n(y);
  let S = !hasSendMessageTool(r),
    w = mintedDeliveries(y.map((L) => L.forwarded));
  return y.flatMap((L, G) => [
    ...(w[G] ?? []),
    {
      type: "queued_command",
      prompt: appendToolsUsedNote(L.text, L.toolsUsed, s),
      source_uuid: L.shownAs ?? randomUUID_32(),
      origin: L.origin,
      isMeta: L.isMeta,
      ...(S && L.origin?.kind === "peer" && { sendMessageToolAbsent: !0 }),
      ...egr({ origin: L.origin, isMeta: L.isMeta }),
      ...getToolsUsedDelta(L.toolsUsed, s),
    },
  ]);
}
/**
 * 把粘贴内容里的图片转成 image 块（按模型限制压缩），返回块与粘贴 id。
 */
//@ chunk-e6aww6q8.js:3324744-3325029 layout
async function buildPastedImageBlocks(e, n) {
  if (!e) return { blocks: [], ids: [] };
  let filtered = Object.values(e).filter(isNonEmptyImageAttachment);
  if (filtered.length === 0) return { blocks: [], ids: [] };
  return {
    blocks: await Promise.all(
      filtered.map(async (h) => {
        let { block: block } = await maybeResizeAndDownsampleImageBlock({
          data: h.content,
          mediaType: h.mediaType,
          limits: n,
        });
        return block;
      }),
    ),
    ids: filtered.map((h) => h.id),
  };
}
/**
 * 从最新往回数自上一条 plan_mode/plan_mode_reentry 附件以来的真实用户轮数；遇到 plan_mode_exit 停止。
 */
//@ chunk-e6aww6q8.js:3325029-3325400 fingerprint = getPlanModeAttachmentTurnCount (0.9)
function getPlanModeAttachmentTurnCount(messages) {
  let turnsSinceLastAttachment = 0,
    r = !1;
  for (let s = messages.length - 1; s >= 0; s--) {
    let message = messages[s];
    if (message?.type === "user" && !message.isMeta && !hasToolResultContent(message.message.content))
      turnsSinceLastAttachment++;
    else if (
      message?.type === "attachment" &&
      (message.attachment.type === "plan_mode" || message.attachment.type === "plan_mode_reentry")
    ) {
      r = !0;
      break;
    } else if (message?.type === "attachment" && message.attachment.type === "plan_mode_exit") break;
  }
  return { turnCount: turnsSinceLastAttachment, foundPlanModeAttachment: r };
}
/**
 * 文本非空且不是 "(no content)" 等占位。
 */
//@ chunk-e6aww6q8.js:3325400-3325461 layout
function isMeaningfulText(e) {
  let trimmed = e.trim();
  return trimmed !== "" && trimmed !== NO_CONTENT_MESSAGE && trimmed !== NO_RESPONSE_REQUESTED;
}
/**
 * AskUserQuestion、ExitPlanMode、SendUserFile、Brief 等会被视为"对用户说话"的工具名集合（静默轮判断用）。
 */
//@ chunk-e6aww6q8.js:3325461-3325497 layout
var USER_FACING_TOOL_NAMES = new Set([
  ASKUSERQUESTION,
  BRIEF_TOOL_NAME,
  LEGACY_BRIEF_TOOL_NAME,
  EXITPLANMODE,
  SEND_USER_FILE_TOOL_NAME,
]);
/**
 * 统计静默轮：从最新往回数没有对用户输出（文本/可见思考/用户可见工具）的助手轮数、本段内已发 silent_turn_reminder 次数、静默开始时间。旧版名 getAutoModeAttachmentTurnCount 为错配。
 */
//@ chunk-e6aww6q8.js:3325497-3326453 file-local
function getSilentTurnStats(messages) {
  let n = 0,
    r = 0,
    s,
    h,
    y,
    S = !1,
    w,
    L = () => {
      if (h === void 0) return !1;
      if (S) return ((s ??= y), !0);
      if (r === 0) n++;
      return ((h = void 0), (S = !1), !1);
    };
  for (let G = messages.length - 1; G >= 0; G--) {
    let message = messages[G];
    if (message !== void 0 && jb(message)) continue;
    if (((w = message?.timestamp), message?.type === "assistant")) {
      let id = message.message.id;
      if (id !== h) {
        if (L()) return { turnsSinceLastReminder: n, remindersInStretch: r, silentSince: s };
        ((h = id), (y = message.timestamp));
      }
      let content = message.message.content;
      if (
        Array.isArray(content) &&
        content.some(
          (ke) =>
            (ke.type === "text" && isMeaningfulText(ke.text)) ||
            (ke.type === "thinking" && ltt(ke)) ||
            (ke.type === "tool_use" && USER_FACING_TOOL_NAMES.has(ke.name)),
        )
      )
        S = !0;
      continue;
    }
    if (L()) return { turnsSinceLastReminder: n, remindersInStretch: r, silentSince: s };
    if (message?.type === "attachment" && message.attachment.type === "silent_turn_reminder") {
      (r++, (s ??= message.timestamp));
      continue;
    }
    if (message?.type === "user" && !message.isMeta && !hasToolResultContent(message.message.content)) {
      s ??= message.timestamp;
      break;
    }
    if (
      message?.type === "user" &&
      message.isMeta &&
      !hasToolResultContent(message.message.content) &&
      !isTurnCompanion(message)
    )
      s ??= message.timestamp;
  }
  return (L(), (s ??= w), { turnsSinceLastReminder: n, remindersInStretch: r, silentSince: s });
}
/**
 * 静默轮达到阈值（轮数或秒数，按模型配置）时产出 silent_turn_reminder 附件。
 */
//@ chunk-e6aww6q8.js:3326453-3326819 layout
function getSilentTurnReminderAttachment(e, n, r) {
  let {
      turnsSinceLastReminder: turnsSinceLastReminder,
      remindersInStretch: remindersInStretch,
      silentSince: silentSince,
    } = getSilentTurnStats(e),
    S = silentSince === void 0 ? NaN : r - Date.parse(silentSince),
    w = Number.isFinite(S) ? Math.floor(S / 1000) : void 0,
    L = getSilentTurnReminderSeconds(n);
  if (
    !(L === void 0
      ? remindersInStretch < SILENT_TURN_REMINDER_MIN_GAP && turnsSinceLastReminder >= NRn()
      : turnsSinceLastReminder >= 1 && w !== void 0 && w >= L)
  )
    return [];
  return (
    logFeatureOk("silent_turn_reminder", {
      turns: turnsSinceLastReminder,
      ...(w !== void 0 && { silent_seconds: w }),
    }),
    [{ type: "silent_turn_reminder", text: getSilentTurnReminderText() }]
  );
}
/**
 * 最近一次 plan_mode_exit 之后的 plan_mode 附件数（决定完整/精简提醒）。
 */
//@ chunk-e6aww6q8.js:3326819-3327007 fingerprint = countPlanModeAttachmentsSinceLastExit (1)
function countPlanModeAttachmentsSinceLastExit(messages) {
  let count = 0;
  for (let r = messages.length - 1; r >= 0; r--) {
    let message = messages[r];
    if (message?.type === "attachment") {
      if (message.attachment.type === "plan_mode_exit") break;
      if (message.attachment.type === "plan_mode") count++;
    }
  }
  return count;
}
/**
 * 最近一条 plan_mode 附件的 planFilePath/planGoesToExitTool；先遇到 plan_mode_exit 返回 null。
 */
//@ chunk-e6aww6q8.js:3327007-3327339 layout = countPlanModeAttachmentsSinceLastExit (0.837)
function getLastPlanModeAttachmentInfo(messages) {
  for (let n = messages.length - 1; n >= 0; n--) {
    let message = messages[n];
    if (message?.type !== "attachment") continue;
    if (message.attachment.type === "plan_mode_exit") return null;
    if (message.attachment.type === "plan_mode")
      return {
        planFilePath: message.attachment.planFilePath,
        planGoesToExitTool:
          message.attachment.planFilePath === void 0 ? message.attachment.planGoesToExitTool : void 0,
      };
  }
  return null;
}
/**
 * 工具列表里有 ExitPlanMode。
 */
//@ chunk-e6aww6q8.js:3327339-3327384 layout
function hasExitPlanModeTool(e) {
  return e.some((n) => toolMatchesName(n, EXITPLANMODE));
}
/**
 * 构造 plan_mode 附件 {reminderType, isSubAgent, planExists:false, planGoesToExitTool?}。
 */
//@ chunk-e6aww6q8.js:3327384-3327508 layout
function buildPlanModeAttachment(e, n, r) {
  return {
    type: "plan_mode",
    reminderType: e,
    isSubAgent: !!n,
    planExists: !1,
    ...(hasExitPlanModeTool(r) && { planGoesToExitTool: !0 }),
  };
}
/**
 * 计划模式（permission mode=plan）时产出 plan_mode 附件：首轮或每 5 轮一次，每 5 次一次完整版，其余精简；计划文件状态变化时立即重发；曾退出后重新进入时给 plan_mode_reentry。
 */
//@ chunk-e6aww6q8.js:3327508-3328319 fingerprint = getPlanModeAttachments (0.856)
async function getPlanModeAttachments(e, n, r, s) {
  if (getToolPermissionContext(r).mode !== "plan") return [];
  let y = getLastPlanModeAttachmentInfo(n ?? []),
    S =
      y !== null &&
      ((y.planFilePath === void 0) !== isDiskless() ||
        (isDiskless() && (y.planGoesToExitTool === !0) !== hasExitPlanModeTool(r.options.tools)));
  if (n && n.length > 0 && !S) {
    let { turnCount: turnCount, foundPlanModeAttachment: foundPlanModeAttachment } =
      getPlanModeAttachmentTurnCount(n);
    if (foundPlanModeAttachment && turnCount < PLAN_MODE_ATTACHMENT_CONFIG.TURNS_BETWEEN_ATTACHMENTS)
      return [];
  }
  let L =
    (countPlanModeAttachmentsSinceLastExit(n ?? []) + 1) %
      PLAN_MODE_ATTACHMENT_CONFIG.FULL_REMINDER_EVERY_N_ATTACHMENTS ===
    1;
  if (isDiskless()) return [buildPlanModeAttachment(L || S ? "full" : "sparse", r.agentId, r.options.tools)];
  if (isStorageV5Enabled() && r.storageV5 !== void 0) await settlePlanFileCachePrime();
  getPlanSlug(getSessionId(), s?.planSlugSeed ?? e ?? void 0);
  let planFilePath = getPlanFilePath(r.agentId),
    existingPlan = getPlan(r.agentId),
    attachments = [];
  if (hasExitedPlanModeInSession() && existingPlan !== null)
    (attachments.push({ type: "plan_mode_reentry", planFilePath: planFilePath }), setHasExitedPlanMode(!1));
  let reminderType = S || L ? "full" : "sparse";
  return (
    attachments.push({
      type: "plan_mode",
      reminderType: reminderType,
      isSubAgent: !!r.agentId,
      planFilePath: planFilePath,
      planExists: existingPlan !== null,
      customInstructions: r.options.planModeInstructions,
    }),
    attachments
  );
}
/**
 * 刚离开计划模式时产出一次 plan_mode_exit（带计划文件路径与是否存在）。
 */
//@ chunk-e6aww6q8.js:3328319-3328611 fingerprint = getPlanModeExitAttachment (0.8)
async function getPlanModeExitAttachment(e, n) {
  if (getToolPermissionContext(n).mode === "plan") return (setNeedsPlanModeExitAttachment(!1), []);
  let { foundPlanModeAttachment: foundPlanModeAttachment } = getPlanModeAttachmentTurnCount(e ?? []);
  if (!needsPlanModeExitAttachment() && !foundPlanModeAttachment) return [];
  if ((setNeedsPlanModeExitAttachment(!1), isDiskless())) return [{ type: "plan_mode_exit", planExists: !1 }];
  let planFilePath = getPlanFilePath(n.agentId),
    planExists = getPlan(n.agentId) !== null;
  return [{ type: "plan_mode_exit", planFilePath: planFilePath, planExists: planExists }];
}
/**
 * 返回最近一条 auto_mode 附件（遇到 auto_mode_exit 返回 null）。旧版名 countAutoModeAttachmentsSinceLastExit 不准确。
 */
//@ chunk-e6aww6q8.js:3328611-3328823 fingerprint = countAutoModeAttachmentsSinceLastExit (1)
function getLastAutoModeAttachment(messages) {
  for (let n = messages.length - 1; n >= 0; n--) {
    let message = messages[n];
    if (message?.type !== "attachment") continue;
    if (message.attachment.type === "auto_mode") return message.attachment;
    if (message.attachment.type === "auto_mode_exit") return null;
  }
  return null;
}
/**
 * auto/bypassPermissions 模式下产出 auto_mode 附件（同意流程、bashFirst、steerOnly、finishExposedWork 等字段），已发过且状态未变则不重复。
 */
//@ chunk-e6aww6q8.js:3328823-3329537 callgraph-fingerprint = getAutoModeAttachments (0.186)
async function getAutoModeAttachments(messages, toolUseContext) {
  let r = getToolPermissionContext(toolUseContext),
    s = r.mode === "bypassPermissions";
  if (r.mode !== "auto" && !s) return [];
  let h = s || g3(getPromptModel(toolUseContext.options.mainLoopModel)),
    tools = toolUseContext.options.tools,
    S =
      tools.some((Z) => toolMatchesName(Z, BASH_TOOL_NAME)) &&
      tools.some(
        (Z) => toolMatchesName(Z, FILE_EDIT_TOOL_NAME) || toolMatchesName(Z, FILE_WRITE_TOOL_NAME),
      ) &&
      !0 &&
      !0 &&
      isThriftySonicEnabled(),
    w =
      !s &&
      toolUseContext.agentId === void 0 &&
      !isTeammate() &&
      (!isProactivityActive() || toolUseContext.getProactivityLevel() === "default");
  if (h && !S && !w) return [];
  let L = getLastAutoModeAttachment(messages ?? []),
    G = L?.steerOnly === !0 && L.bashFirst === !1 && h && S && !s;
  if (L && !(L.steerOnly && !h) && !G) return [];
  let reminderType = G
    ? L?.finishExposedWork === !0
    : w && getFeatureValue_SESSION_PINNED("tengu_vivid_crown", !1);
  if (h && !S && !reminderType) return [];
  return [
    {
      type: "auto_mode",
      autoModeConsentFlow: !s && isAutoModeConsentFlowEnabled(toolUseContext.agentId),
      finishExposedWork: reminderType,
      bashFirst: S,
      ...(S && { bashFirstSteer: L?.bashFirst ? (L.bashFirstSteer ?? "strict") : Vgi() }),
      steerOnly: h,
      bypass: s,
      ...!1,
    },
  ];
}
/**
 * 离开 auto 模式时产出一次 auto_mode_exit（主线程）。
 */
//@ chunk-e6aww6q8.js:3329537-3329793 fingerprint = getAutoModeExitAttachment (0.507)
async function getAutoModeExitAttachment(e, n) {
  if (n.agentId) return [];
  if (!needsAutoModeExitAttachment()) return [];
  if ((setNeedsAutoModeExitAttachment(!1), getToolPermissionContext(n).mode === "auto" || isAutoModeActive()))
    return [];
  let r = getLastAutoModeAttachment(e ?? []);
  if (!r) return [];
  return [
    {
      type: "auto_mode_exit",
      bashFirst: r.bashFirst,
      steerOnly: r.steerOnly,
      finishExposedWork: r.finishExposedWork,
    },
  ];
}
/**
 * 输入含 ultrathink 关键词且开关开启时产出 ultrathink_effort（记 tengu_ultrathink）。
 */
//@ chunk-e6aww6q8.js:3334304-3334413 fingerprint = getUltrathinkEffortAttachment (0.855)
function getUltrathinkEffortAttachment(input) {
  if (!isUltrathinkEnabled() || !input || !hasUltrathinkKeyword(input)) return [];
  return (logEvent("tengu_ultrathink", {}), [{ type: "ultrathink_effort" }]);
}
/**
 * 人工输入含工作流关键词时产出 workflow_keyword_request（记 tengu_workflow_keyword）。
 */
//@ chunk-e6aww6q8.js:3334413-3334527 layout
function getWorkflowKeywordAttachment(e) {
  if (!e || !hasUltraplanKeyword(e)) return [];
  return (logEvent("tengu_workflow_keyword", {}), [{ type: "workflow_keyword_request" }]);
}
/**
 * effort 为 ultra 时：首次给完整 ultra_effort_enter，之后每 N 轮给精简版；退出 ultra 时给 ultra_effort_exit。
 */
//@ chunk-e6aww6q8.js:3334527-3335234 layout
function getUltraEffortAttachments(e, n) {
  let r = isUltracodeActive(getUltracodeRequested(n), n.options.mainLoopModel),
    s = "none",
    h = 0;
  if (e)
    for (let y = e.length - 1; y >= 0; y--) {
      let S = e[y];
      if (S === void 0) continue;
      if (S.type === "attachment") {
        if (S.attachment.type === "ultra_effort_enter") {
          s = "enter";
          break;
        }
        if (S.attachment.type === "ultra_effort_exit") {
          s = "exit";
          break;
        }
      } else if (S.type === "user" && !S.isMeta && !hasToolResultContent(S.message.content)) h++;
    }
  if (r) {
    if (s !== "enter")
      return (
        logEvent("tengu_ultra_effort", { is_enter: !0, is_full: !0 }),
        [{ type: "ultra_effort_enter", reminderType: "full" }]
      );
    if (h >= getUltraEffortReminderInterval())
      return (
        logEvent("tengu_ultra_effort", { is_enter: !0, is_full: !1 }),
        [{ type: "ultra_effort_enter", reminderType: "sparse" }]
      );
    return [];
  }
  if (s === "enter")
    return (logEvent("tengu_ultra_effort", { is_enter: !1 }), [{ type: "ultra_effort_exit" }]);
  return [];
}
/**
 * 无已记录工具声明时，从对话推断上次请求声明的工具集合（Fmn）。
 */
//@ chunk-e6aww6q8.js:3335234-3335333 layout
function inferDeclaredToolsFromHistory(e, n, r, s) {
  let h = getNonDeferrableBuiltins();
  return computeDeclaredToolSet(e, n, (y) => isDeferredTool(y, h), r, !s.some((y) => y.type === "assistant"));
}
/**
 * 由 toolUseContext 构造延迟工具增量所需的上下文 {latches, toolPoolRefreshes, byValue}。
 */
//@ chunk-e6aww6q8.js:3335333-3335492 layout
function buildDeferredToolsLatchContext(e, n, r) {
  return e === void 0
    ? void 0
    : {
        latches: e,
        toolPoolRefreshes: n.options.refreshTools !== void 0,
        byValue: buildToolListingRenderer(() => getToolPermissionContext(n), n.options.agentDefinitions, r),
      };
}
/**
 * 同上，参数直接给出（runAgent 用）。
 */
//@ chunk-e6aww6q8.js:3335492-3335577 layout
function buildDeferredToolsLatchContextFrom(e, n, r, s, h) {
  return { latches: e, toolPoolRefreshes: n, byValue: buildToolListingRenderer(() => r, s, h) };
}
/**
 * 把历史里只宣布名字的延迟工具并入会话门闩。
 */
//@ chunk-e6aww6q8.js:3335577-3335663 layout
function mergeNameOnlyAnnouncements(e, n) {
  for (let nameOnlyAnnouncement of n.nameOnlyAnnouncements) e.nameOnlyAnnouncements.add(nameOnlyAnnouncement);
}
/**
 * 生成工具描述渲染参数（权限上下文、代理列表、listed/deferred 放置）与 querySource。
 */
//@ chunk-e6aww6q8.js:3335663-3335862 layout
function buildToolListingRenderer(e, n, r) {
  return {
    render: {
      getToolPermissionContext: async () => e(),
      agents: n.activeAgents,
      allowedAgentTypes: n.allowedAgentTypes,
      enginePlacementOf: (s) => (isDeferredToolByEngine(s) ? "deferred" : "listed"),
    },
    querySource: r,
  };
}
/**
 * 取上次请求声明的工具（名字/服务器/条目），没有记录时推断。
 */
//@ chunk-e6aww6q8.js:3335862-3336096 layout
function getDeclaredToolSource(e, n, r, s, h) {
  try {
    return (
      resolveDeclaredToolSet(
        e,
        () => {
          let y = j_e(n, r);
          return y && { names: y.toolDescriptions.keys(), servers: y.toolServers, entries: y.toolEntries };
        },
        s,
        { latch: !1, permissionContext: h },
      ) ?? inferDeclaredToolsFromHistory(e, s, r.mainLoopModel, n)
    );
  } catch (error) {
    logError(error);
    return;
  }
}
/**
 * 工具搜索可用时产出 deferred_tools_delta：新出现/撤回的延迟工具名（getDeferredToolsDelta）；按值声明的工具改为 computeByValueToolsDelta 的结果；有工具被拒时可加 deniedLead（tengu_composed_treehouse）。
 */
//@ chunk-e6aww6q8.js:3336096-3336970 layout
async function getDeferredToolsDeltaAttachments(e, n, r, s, h, y, S, w, L, G, q, Z = {}) {
  let Se = !1;
  if (G !== void 0)
    try {
      Se = shouldAnnounceDeferredTools(G.latches, n, {
        toolSearchToolFilteredOut: toolSearchToolFilteredOut(n, e, G.latches),
        toolPoolRefreshes: G.toolPoolRefreshes,
        aheadOfRequest: !0,
      });
    } catch (error) {
      logError(toError(error));
    }
  if (!Se) {
    if (!isToolSearchEnabledOptimistic()) return [];
    if (!modelSupportsToolReference(n)) return [];
    if (isVertexModelWithoutToolSearch(getCanonicalName(n))) return [];
    if (!isToolSearchToolAvailable(e)) return [];
    if (toolSearchDeclaredIn(j_e(Us(r ?? []), Z)?.toolDescriptions) === !1) return [];
    if (G && toolSearchRejectedOn(G.latches, n)) return [];
  }
  let ke = getDeferredToolsDelta(
    e,
    r ?? [],
    s,
    h,
    y,
    S,
    w?.(),
    L,
    Se && G !== void 0 ? { nameOnlyAnnouncements: G.latches.nameOnlyAnnouncements } : void 0,
    G?.latches.nameOnlyAnnouncements,
    q,
  );
  if (
    ke?.retractedTools?.some((Ee) => Ee.cause === "denied") &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_composed_treehouse", !1)
  )
    ke.deniedLead = !0;
  let we = ke ? [{ type: "deferred_tools_delta", ...ke }] : [];
  if (G === void 0) return we;
  try {
    if (!canInlineToolAdditions(G.latches, n)) return we;
    let Ee = await computeByValueToolsDelta(ke, e, n, r ?? [], G);
    return Ee ? [{ type: "deferred_tools_delta", ...Ee }] : [];
  } catch (error) {
    return (logError(toError(error)), we);
  }
}
/**
 * 按值内联声明的工具：比较当前描述与已声明描述，得出需要重新声明、移除的工具。
 */
//@ chunk-e6aww6q8.js:3336970-3338419 layout
async function computeByValueToolsDelta(e, n, r, s, h) {
  let { definedByValue: definedByValue, withdrawn: withdrawn } = findLatestDeferredToolsDelta(
      s,
      h.latches.nameOnlyAnnouncements,
    ),
    w = (Je) => definedByValue.has(Je) && !withdrawn.has(Je),
    { render: render, querySource: querySource } = h.byValue,
    q = (Je) => getToolListingHash(Je, n, render),
    Z = new Map();
  for (let Je of e?.readdedNames ?? []) {
    let nt = definedByValue.get(Je),
      found = n.find((yt) => toolMatchesName(yt, Je));
    if (!withdrawn.has(Je) || nt === void 0 || found === void 0) continue;
    let Et = await q(found);
    Z.set(Je, Et === nt.listing ? { name: Je, listing: Et, sameAs: nt.definedIn } : "afresh");
  }
  let Se = new Set([...(e?.surfacedNames ?? []), ...Z.keys()]),
    ke = new Set(e?.removedNames ?? []),
    we = [];
  for (let Je of n)
    if (
      w(Je.name) &&
      !Se.has(Je.name) &&
      !ke.has(Je.name) &&
      (await q(Je)) !== definedByValue.get(Je.name)?.listing
    )
      we.push(Je);
  let filtered = [...ke].filter(w);
  if (e === null && we.length === 0) return null;
  let Ae = await buildToolListingEntries(
    n.filter(
      (Je) =>
        (Se.has(Je.name) && Z.get(Je.name) !== void 0 ? Z.get(Je.name) === "afresh" : Se.has(Je.name)) ||
        we.includes(Je),
    ),
    n,
    r,
    render,
    querySource,
  );
  if (Ae === void 0) return e;
  let Ie = e ?? { addedNames: [], addedLines: [], removedNames: [], wireHiddenNames: [], readdedNames: [] },
    filtered_2 = [...Z.values()].filter((Je) => Je !== "afresh"),
    sorted = [...Ae, ...filtered_2].sort((Je, nt) => Je.name.localeCompare(nt.name)),
    sorted_2 = we.map((Je) => Je.name).sort(),
    lt = {
      definitions: Ae.length - sorted_2.length,
      replacements: sorted_2.length,
      pointers: filtered_2.length,
      withdrawals: filtered.length,
    };
  if (Object.values(lt).some((Je) => Je > 0)) logEvent("tengu_inline_tools_announced", lt);
  return {
    ...Ie,
    ...(Se.size > 0 && { surfacedNames: [...Se].sort() }),
    ...(sorted.length > 0 && { surfacedDefinitions: sorted }),
    ...(sorted_2.length > 0 && { replacedNames: sorted_2 }),
    ...(filtered.length > 0 && { removedByBlock: filtered.sort() }),
  };
}
/**
 * 已声明但现在被撤回（权限或配置变化，不含未配置/替换）的工具名。压缩时使用。
 */
//@ chunk-e6aww6q8.js:3338419-3338745 layout
function getRevokedDeferredToolNames(e, n) {
  let r;
  try {
    r = hasDeclaredToolSet(e, n.options.tools, !0);
  } catch (error) {
    return (logRetractionFailure(error), []);
  }
  if (r.length === 0) return [];
  let s = getToolPermissionContext(n);
  return (
    classifyRevokedTools(r, n.options.mcpClients, s, e)
      ?.revoked.filter(
        (h) =>
          h.cause !== "not_configured" &&
          h.cause !== "replaced" &&
          h.cause !== UNCLASSIFIED &&
          !WXn(s, { name: h.name, mcpInfo: e?.sourceFor(h.name)?.mcpInfo }),
      )
      .map((h) => h.name) ?? []
  );
}
/**
 * 对一组工具名逐个判断撤回原因，返回 {revoked:[{name,cause}], causeCounts}。
 */
//@ chunk-e6aww6q8.js:3338745-3339051 layout
function classifyRevokedTools(e, n, r, s) {
  if (e === void 0) return;
  try {
    let h = [],
      y = {},
      S;
    for (let w of e) {
      S ??= getDenyRuleIndex(r);
      let L = describeToolAvailability(w, n, r, s?.sourceFor(w), S);
      if (((y[L.kind] = (y[L.kind] ?? 0) + 1), isPermanentUnavailability(L)))
        h.push({ name: w, cause: L.kind });
    }
    return { revoked: h, causeCounts: y };
  } catch (error) {
    return (
      logRetractionFailure(error),
      { revoked: e.map((y) => ({ name: y, cause: UNCLASSIFIED })), causeCounts: {} }
    );
  }
}
/**
 * 返回 causeKindOf/holdWhileConnecting/connectingServersOf，供延迟工具增量判断 MCP 连接中的工具。
 */
//@ chunk-e6aww6q8.js:3339051-3339285 layout
function buildToolRevocationClassifier(e) {
  let n, r;
  return {
    causeKindOf: (s) => {
      try {
        return (
          (n ??= getToolPermissionContext(e)),
          (r ??= getDenyRuleIndex(n)),
          describeToolAvailability(s, e.options.mcpClients, n, void 0, r).kind
        );
      } catch (error) {
        return (logRetractionFailure(error), UNCLASSIFIED);
      }
    },
    holdWhileConnecting: isSortedOtterOn(),
    connectingServersOf: (s) => pendingServersForTool(s, e.options.mcpClients),
  };
}
/**
 * 有 Agent 工具时，对比历史 agent_listing_delta，产出可用代理类型的增减（addedTypes/removedTypes/addedLines）。
 */
//@ chunk-e6aww6q8.js:3339285-3340409 fingerprint = getAgentListingDeltaAttachment (0.709)
async function getAgentListingDeltaAttachment(toolUseContext, messages) {
  if (!toolUseContext.options.tools.some((tool) => toolMatchesName(tool, AGENT))) return [];
  let { activeAgents: activeAgents, allowedAgentTypes: allowedAgentTypes } =
      toolUseContext.options.agentDefinitions,
    mcpServers = new Set();
  for (let tool of toolUseContext.options.tools) {
    let info = getMcpServerNameOfTool(tool);
    if (info) mcpServers.add(info);
  }
  let y = await getDispatchableAgents(
      filterAgentsByMcpRequirements(activeAgents, [...mcpServers]),
      allowedAgentTypes,
      getToolPermissionContext(toolUseContext),
      toolUseContext,
    ),
    announced = new Set();
  for (let msg of messages ?? []) {
    if (msg.type !== "attachment") continue;
    if (msg.attachment.type !== "agent_listing_delta") continue;
    if (Array.isArray(msg.attachment.addedLines))
      for (let Se of stringArray(msg.attachment.addedTypes)) announced.add(Se);
    for (let Se of stringArray(msg.attachment.removedTypes)) announced.delete(Se);
  }
  let currentTypes = new Set(y.map((Z) => Z.agentType)),
    added = y.filter((Z) => !announced.has(Z.agentType)),
    removed = [];
  for (let Z of announced) if (!currentTypes.has(Z)) removed.push(Z);
  if (added.length === 0 && removed.length === 0) return [];
  (added.sort((Z, Se) => compareStringsGrouped(Z.agentType, Se.agentType)), removed.sort());
  let q = g3(getPromptModel(toolUseContext.options.mainLoopModel));
  return [
    {
      type: "agent_listing_delta",
      addedTypes: added.map((Z) => Z.agentType),
      addedLines: added.map((Z) => formatAgentLine(Z, q)),
      builtInTypes: added.filter((Z) => Z.source === "built-in").map((Z) => Z.agentType),
      builtInPluginTypes: added
        .filter((Z) => Z.source === "plugin" && marketplaceSuffix(Z.plugin) === BUILTIN)
        .map((Z) => Z.agentType),
      removedTypes: removed,
      isInitial: announced.size === 0,
      showConcurrencyNote: !uAe() && getSubagentSteer() === "default",
    },
  ];
}
/**
 * 需要认证（needs-auth）且未有认证占位工具的 MCP 服务器名。
 */
//@ chunk-e6aww6q8.js:3340409-3340643 layout
function getNeedsAuthMcpServerNames(e, n = []) {
  let r = new Set(n.flatMap((s) => (s.mcpInfo?.isAuthStub ? [s.mcpInfo.serverName] : [])));
  return e
    .filter(
      (s) =>
        s.type === "needs-auth" &&
        !r.has(s.name) &&
        !(
          Yi().attachedInstructions &&
          s.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME &&
          isClaudeAiProxyServer(s.config)
        ),
    )
    .map((s) => s.name);
}
/**
 * MCP 服务器 instructions 的增减 → mcp_instructions_delta；含内置服务器附加说明。
 */
//@ chunk-e6aww6q8.js:3340643-3340968 fingerprint = getMcpInstructionsDeltaAttachment (0.777)
function getMcpInstructionsDeltaAttachment(e, n, r, s, h, y = !1) {
  let S = [...getMcpServerInstructionBlocks(e)],
    { attachedInstructions: attachedInstructions } = Yi();
  if (attachedInstructions)
    S.push({ serverName: CLAUDE_IN_CHROME_MCP_SERVER_NAME, block: attachedInstructions });
  if (
    isToolSearchEnabledOptimistic() &&
    modelSupportsToolReference(r) &&
    !isVertexModelWithoutToolSearch(getCanonicalName(r)) &&
    isToolSearchToolAvailable(n) &&
    n.some(
      (G) =>
        G.mcpInfo?.serverName === CLAUDE_IN_CHROME_MCP_SERVER_NAME && isDeferredToolInConversation(G, h, n),
    )
  )
    S.push({
      serverName: CLAUDE_IN_CHROME_MCP_SERVER_NAME,
      block: maybeAddBrowserBatchToChromeSelect(CHROME_TOOL_SEARCH_REMINDER),
    });
  let L = getMcpInstructionsDelta(e, s ?? [], S, y);
  if (!L) return [];
  return [{ type: "mcp_instructions_delta", ...L }];
}
/**
 * MCP 工具被丢弃时产出 mcp_dropped_tools_delta。
 */
//@ chunk-e6aww6q8.js:3340968-3341091 layout
function getMcpDroppedToolsAttachment(e, n) {
  let r = buildMcpDroppedToolsDelta(e.options.mcpClients, n ?? [], getToolPermissionContext(e));
  if (!r) return [];
  return [{ type: "mcp_dropped_tools_delta", ...r }];
}
/**
 * 有 criticalSystemReminder_EXPERIMENTAL 文本时产出 critical_system_reminder（宿主 promptReminder 也复用它）。
 */
//@ chunk-e6aww6q8.js:3341091-3341174 fingerprint = getCriticalSystemReminderAttachment (0.764)
function getCriticalSystemReminderAttachment(toolUseContext) {
  if (!toolUseContext) return [];
  return [{ type: "critical_system_reminder", content: toolUseContext }];
}
/**
 * 非默认输出风格时产出 output_style（风格名与本轮提醒文本；有后台任务运行时用 waitingTurnReminder）。
 */
//@ chunk-e6aww6q8.js:3341174-3341636 layout
async function getOutputStyleAttachment(e) {
  if ((getSettings_DEPRECATED()?.outputStyle || "default") === "default") return [];
  let s = await getOutputStyleConfig();
  if (!s) return [];
  let h = !T_(),
    y = h && (isTidySlothGateOn() || !getIsNonInteractiveSession()),
    S =
      s.waitingTurnReminder !== void 0 &&
      e.agentId === void 0 &&
      Object.values(e.taskRegistry.all()).some(
        (w) =>
          w.status === "running" &&
          w.toolUseId !== void 0 &&
          !("agentId" in w && w.agentId !== void 0) &&
          ((h && isMonitorShellTask(w)) || (y && isLocalShellTask(w) && w.isBackgrounded)),
      );
  return [{ type: "output_style", style: s.name, turnReminder: S ? s.waitingTurnReminder : s.turnReminder }];
}
/**
 * IDE 选区：diff 视图选区给 selected_lines_in_diff；普通选区（连接了 IDE MCP、路径未被拒）给 selected_lines_in_ide（行号、内容、显示路径）。
 */
//@ chunk-e6aww6q8.js:3341636-3342183 fingerprint = getSelectedLinesFromIDE (0.751)
async function getSelectedLinesFromIDE(ideSelection, toolUseContext) {
  if (ideSelection?.source === "diff" && ideSelection.text)
    return [
      {
        type: "selected_lines_in_diff",
        lineCount: ideSelection.lineCount,
        content: ideSelection.text,
        filePath: ideSelection.filePath,
      },
    ];
  let ideName = hasAccessToIDEExtensionDiffFeature_2(toolUseContext.options.mcpClients);
  if (!ideName || ideSelection?.lineStart === void 0 || !ideSelection.text || !ideSelection.filePath)
    return [];
  if (
    kW(ideSelection.filePath, getToolPermissionContext(toolUseContext)) ||
    (Q_(getToolPermissionContext(toolUseContext)) &&
      (await Mq(
        ideSelection.filePath,
        { context: getToolPermissionContext(toolUseContext), isHeldOutside: isRestrictedReadBlocked },
        AbortSignal.timeout(iB),
      )) === void 0)
  )
    return [];
  return [
    {
      type: "selected_lines_in_ide",
      ideName: ideName,
      lineStart: ideSelection.lineStart,
      lineEnd: ideSelection.lineStart + ideSelection.lineCount - 1,
      filename: ideSelection.filePath,
      content: ideSelection.text,
      displayPath: relative_31(getCwd(), ideSelection.filePath),
    },
  ];
}
/**
 * 计算从 cwd 到目标文件之间需要加载 CLAUDE.md 的目录：嵌套目录、cwd 及其祖先、worktree 信息、检出目标路径。
 */
//@ chunk-e6aww6q8.js:3342183-3342595 fingerprint = getDirectoriesToProcess (0.715)
function getDirectoriesToProcess(targetPath, originalCwd) {
  let targetDir = dirname_48(resolve_35(targetPath));
  if (!cC(targetDir, originalCwd))
    try {
      let realpathSync = getFsImplementation().realpathSync(targetDir);
      if (cC(realpathSync, originalCwd)) targetDir = realpathSync;
    } catch {}
  let s = findWorktreeForPath(targetDir, originalCwd),
    h = UZe(targetDir, s),
    y = [];
  for (let G = h; G !== originalCwd && G !== parse_10(G).root; G = dirname_48(G))
    if (cC(G, originalCwd)) y.push(mapPathIntoWorktree(G, s));
  y.reverse();
  let S = [],
    w = originalCwd;
  while (w !== parse_10(w).root) (S.push(w), (w = dirname_48(w)));
  S.reverse();
  let L = getWorktreeRoots(originalCwd);
  return {
    nestedDirs: y,
    cwdLevelDirs: S.filter((G) => !isInMainRepoOutsideWorktree(G, L)),
    worktree: s,
    checkoutTargetPath: s === null ? targetPath : join_88(h, basename_49(resolve_35(targetPath))),
  };
}
/**
 * 附加工作目录不在 cwd 下且其 CLAUDE.md 没有嵌套目录。
 */
//@ chunk-e6aww6q8.js:3342595-3342705 layout
function isAdditionalDirWithoutNestedMemory(e) {
  let n = getOriginalCwd();
  return (
    getAdditionalClaudeMdDirs().includes(e) &&
    !cC(e, n) &&
    getDirectoriesToProcess(join_88(e, "CLAUDE.md"), n).nestedDirs.length === 0
  );
}
/**
 * 记忆类型是否为 User/Project/Local/Managed。
 */
//@ chunk-e6aww6q8.js:3342705-3342782 callgraph-fingerprint = isInstructionsMemoryType (1)
function isInstructionsMemoryType_2(type) {
  return type === "User" || type === "Project" || type === "Local" || type === "Managed";
}
/**
 * 把记忆文件（CLAUDE.md 等）转成 nested_memory 附件：跳过已读文件、已在上下文里的相同内容；超长时按模型截断（记 context_claude_md_load nested_file_cut）。
 */
//@ chunk-e6aww6q8.js:3342782-3344175 fingerprint = memoryFilesToAttachments (0.665)
async function memoryFilesToAttachments(
  memoryFiles,
  toolUseContext,
  triggerPath,
  announcementState,
  worktree = null,
  y = !1,
) {
  let attachments = [],
    shouldFireHook = hasInstructionsLoadedHook(),
    L = getMaxMemoryFileChars(toolUseContext.options.mainLoopModel);
  for (let memoryFile of memoryFiles) {
    if (toolUseContext.readFileState.has(memoryFile.path)) continue;
    let q = await getReadTimestamp(memoryFile, !y, toolUseContext.storageV5);
    if (toolUseContext.readFileState.has(memoryFile.path)) continue;
    let trimmed = memoryFile.content.trim(),
      flattened = uniq([memoryFile.path, UZe(memoryFile.path, worktree)]).flatMap(
        (lt) => announcementState?.announced?.get(lt) ?? [],
      ),
      any = flattened.some((lt) => lt.content === trimmed),
      we = !any && flattened.some((lt) => isTruncatedCopyOf(lt, trimmed)),
      Ee = any || we,
      Ae = we || (!any && memoryFile.type !== "Managed" && trimmed.length > L),
      Ie = Ae ? truncateInstructionsAtLine(trimmed, memoryFile.path, L) : trimmed,
      Me = announcementState?.nested.get(memoryFile.path),
      We = Me === Ie || Me === trimmed;
    if (!Ee && !We) {
      if (Ae) logFeatureSad("context_claude_md_load", "nested_file_cut");
      attachments.push({
        type: "nested_memory",
        path: memoryFile.path,
        content: Ae ? { ...memoryFile, content: Ie, rawContent: void 0 } : memoryFile,
        displayPath: y ? memoryFile.path : relative_31(getCwd(), memoryFile.path),
      });
    }
    if (y) announcementState?.nested.set(memoryFile.path, Ie);
    let ze = y ? void 0 : toolUseContext.readFileState;
    if (
      (ze?.set(memoryFile.path, {
        content: memoryFile.contentDiffersFromDisk
          ? (memoryFile.rawContent ?? memoryFile.content)
          : __(memoryFile.content),
        timestamp: q,
        offset: void 0,
        limit: void 0,
        isPartialView: Ae || memoryFile.contentDiffersFromDisk,
        seededFromContext: !0,
        keepContent: !0,
      }),
      Ae && getFeatureValue_CACHED_MAY_BE_STALE("tengu_quizzical_mango", !0))
    )
      ze?.markStartOnly(memoryFile.path);
    if (Ee) continue;
    if (We) continue;
    if (isInstructionsMemoryType_2(memoryFile.type))
      rSt(
        memoryFile.content,
        "claudemd",
        toolUseContext.credentials,
        toolUseContext.storageV5,
        toolUseContext.appendSystemMessage,
      );
    if (shouldFireHook && isInstructionsMemoryType_2(memoryFile.type)) {
      let lt = memoryFile.globs ? "path_glob_match" : memoryFile.parent ? "include" : "nested_traversal";
      executeInstructionsLoadedHooks(toolUseContext.session, memoryFile.path, memoryFile.type, lt, {
        globs: memoryFile.globs,
        triggerFilePath: triggerPath,
        parentFilePath: memoryFile.parent,
        agentInfo: toolUseContext,
        storageV5: toolUseContext.storageV5,
        credentials: toolUseContext.credentials,
      });
    }
  }
  return attachments;
}
/**
 * 汇总对话里已宣布/嵌套/withheld 的记忆文件，用于去重。
 */
//@ chunk-e6aww6q8.js:3344175-3344488 layout
async function getMemoryAnnouncementState(e, n) {
  try {
    let r = Us(n),
      s = latestInstructionFiles(r);
    if (s && s.size > 0) {
      let h = await K3t(
          e.session,
          isStorageV5Enabled() ? e.storageV5 : void 0,
          isStorageV5Enabled() ? e.credentials : void 0,
        ),
        y = new Set(h && WGr(h, e.options).map((S) => S.path));
      for (let S of [...s.keys()]) if (!y.has(S)) s.delete(S);
    }
    return { announced: s, nested: collectNestedMemoryContents(r), withheld: seenWithheldPaths(e, n) };
  } catch (error) {
    logError(error);
    return;
  }
}
/**
 * 按 getDirectoriesToProcess 的目录顺序依次产出各级目录的记忆文件（异步生成器）。
 */
//@ chunk-e6aww6q8.js:3344488-3344799 layout
async function* iterateMemoryFilesForPath(e, n, r = getDirectoriesToProcess(e, getOriginalCwd()), s) {
  let h = new Set(),
    {
      nestedDirs: nestedDirs,
      cwdLevelDirs: cwdLevelDirs,
      worktree: worktree,
      checkoutTargetPath: checkoutTargetPath,
    } = r;
  yield await getManagedAndUserConditionalRules(checkoutTargetPath, h, n);
  for (let G of nestedDirs) {
    let q = worktree !== null && cC(G, worktree.worktreeRoot);
    yield await getMemoryFilesForNestedDirectory(G, q ? e : checkoutTargetPath, h, { held: s?.within });
  }
  for (let G of cwdLevelDirs)
    yield await getConditionalRulesForCwdLevelDirectory(
      G,
      checkoutTargetPath,
      h,
      G === cwdLevelDirs.at(-1) ? s?.within : s?.above(G),
    );
}
/**
 * 读取受限时返回记录"被拦在外面"的记忆文件的跟踪器。
 */
//@ chunk-e6aww6q8.js:3344799-3344886 layout
function buildHeldOutsideTracker(e, n) {
  let r = mergePersistedDenyRules(e);
  return Q_(r) ? SHo({ context: r, isHeldOutside: isRestrictedReadBlocked }, n) : void 0;
}
/**
 * 因权限未显示的记忆文件 → withheld_memory 附件。
 */
//@ chunk-e6aww6q8.js:3344886-3345142 layout
function getWithheldMemoryAttachment(e, n) {
  let r = new Set(fjt(getWithheldInstructionFiles(e)).shown.map(({ path: path }) => path));
  OVe(e, r);
  let filtered = n.filter(({ path: path }) => !r.has(path));
  if (filtered.length === 0 || getIsNonInteractiveSession()) return [];
  return [
    {
      type: "withheld_memory",
      entries: filtered.map((h) => ({ ...h, displayPath: relative_31(getCwd(), h.path) })),
      by: Yb.of(e).token,
    },
  ];
}
/**
 * 某文件路径触发的嵌套记忆（CLAUDE.md）附件；CLAUDE_CODE_DISABLE_CLAUDE_MDS 时为空。
 */
//@ chunk-e6aww6q8.js:3345142-3346117 layout
async function getNestedMemoryAttachmentsForFile(
  filePath,
  toolUseContext,
  permissionState,
  announcementState,
  includeTriggerFile = !1,
) {
  if (env.CLAUDE_CODE_DISABLE_CLAUDE_MDS) return [];
  let y = [];
  try {
    let S = claudeMdExtraState.peek(toolUseContext.session)?.readFor;
    if (S)
      return getFeatureValue_CACHED_MAY_BE_STALE("tengu_paper_halyard", !1)
        ? y
        : await memoryFilesToAttachments(
            applyClaudeMdExcludesToInjected(
              await S(filePath, toolUseContext.abortController.signal, function () {
                return getToolPermissionContext(toolUseContext);
              }),
            ).filter(function (ke) {
              return includeTriggerFile || ke.path !== filePath;
            }),
            toolUseContext,
            filePath,
            announcementState,
            null,
            !0,
          );
    if (!pathInAllowedWorkingPath(filePath, permissionState.toolPermissionContext)) return y;
    let w = getDirectoriesToProcess(filePath, getOriginalCwd()),
      L = getFeatureValue_CACHED_MAY_BE_STALE("tengu_paper_halyard", !1),
      G = new Map();
    for await (let Se of iterateMemoryFilesForPath(
      filePath,
      toolUseContext.storageV5,
      w,
      buildHeldOutsideTracker(permissionState.toolPermissionContext, (ke, we) => {
        G.set(ke, we);
      }),
    ))
      y.push(
        ...(await memoryFilesToAttachments(
          Se.filter((ke) => !L || (ke.type !== "Project" && ke.type !== "Local")),
          toolUseContext,
          filePath,
          announcementState,
          w.worktree,
        )),
      );
    let flattened = Array.from(G).flatMap(([Se, ke]) => (ke === void 0 ? [] : [{ path: Se, why: ke }])),
      { session: session } = toolUseContext;
    if (
      (MVe(
        session,
        Array.from(G).flatMap(([Se, ke]) => (ke === void 0 ? [Se] : [])),
      ),
      toolUseContext.agentId !== void 0)
    )
      recordWithheldInstructionFiles(session, flattened);
    else {
      logWithheldInstructionFiles(session, flattened);
      let { owed: owed } = Yb.of(session),
        sliced = flattened
          .filter(({ path: path }) => announcementState?.withheld.has(path) !== !0 && !owed.has(path))
          .slice(0, SM);
      y.push(...getWithheldMemoryAttachment(session, sliced));
      for (let { path: path } of sliced) announcementState?.withheld.add(path);
    }
  } catch (error) {
    logError(error);
  }
  return y;
}
/**
 * IDE 打开文件：附带该文件触发的嵌套记忆，再加 opened_file_in_ide。
 */
//@ chunk-e6aww6q8.js:3346117-3346436 fingerprint = getOpenedFileFromIDE (0.784)
async function getOpenedFileFromIDE(e, n, r) {
  if (!e?.filePath || e.text) return [];
  let s = getToolPermissionContext(n);
  if (
    kW(e.filePath, s) ||
    (Q_(s) &&
      (await Mq(
        e.filePath,
        { context: s, isHeldOutside: isRestrictedReadBlocked },
        n.abortController.signal,
      )) === void 0)
  )
    return [];
  return [
    ...(await getNestedMemoryAttachmentsForFile(
      e.filePath,
      n,
      { toolPermissionContext: s },
      r && (await getMemoryAnnouncementState(n, r)),
    )),
    { type: "opened_file_in_ide", filename: e.filePath },
  ];
}
/**
 * 文件提及只作引用（CLAUDE_CODE_DISABLE_FILE_MENTIONS 或宿主不读时）：已缓存内容能内联的读出，其余汇成 at_mention_reference。
 */
//@ chunk-e6aww6q8.js:3346436-3347306 layout
async function getFileMentionReferences(e, n, r) {
  let peek = uCn.peek(n.session),
    h;
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_snuggly_goblet", !1)) {
    let { mainLoopModel: mainLoopModel, autoCompactWindow: autoCompactWindow } = n.options,
      ke = getModelContextInfo(mainLoopModel),
      we = getAutoCompactThresholdTokens(ke, autoCompactWindow);
    if (we > CK) {
      let Ee = Tp(r, ke.bytesPerToken) + stripInProgressAssistantMessage(r) + (OSt(r) ? 0 : CK),
        Ae = 0;
      h = {
        threshold: we,
        held: () => Ee,
        claimed: () => Ae,
        claim: (Ie) => {
          Ae += Ie;
        },
      };
    }
  }
  let peek_2 = cCn.peek(n.session),
    S = [],
    w = [],
    L = [],
    G = () => isCoworkAny() && getToolsMachine()?.directory?.isGitRepo === !1,
    maxSizeBytes = getDefaultFileReadingLimits().maxSizeBytes;
  for (let Z of e) {
    if (peek_2?.delete(Z)) {
      L.push(Z);
      continue;
    }
    let Se = peek?.get(Z);
    peek?.delete(Z);
    let ke = Buffer.isBuffer(Se) ? Se.length : 0,
      we =
        Se &&
        ke <= maxSizeBytes &&
        getAttachmentReadBlockReason(Z, getToolPermissionContext(n), "person") === void 0 &&
        (await readCachedMentionContent(Z, Se, n, h));
    if (we) (S.push(we), (maxSizeBytes -= ke));
    else if (isAbsolute_44(Z) || !G()) w.push(Z);
  }
  if (w.length + L.length > 0) logFeatureSad("input_file_at_mention", "referenced_not_read");
  if (w.length > 0) S.push({ type: "at_mention_reference", mentions: w });
  if (L.length > 0) S.push({ type: "at_mention_reference", mentions: L, arePdfsToReadPlainly: !0 });
  return S;
}
/**
 * 宿主提供的提及文件内容：太大给 at_mention_reference（too_large），否则按读取上限截断后生成文件附件。
 */
//@ chunk-e6aww6q8.js:3347306-3348215 layout
async function readCachedMentionContent(e, n, { credentials: credentials }, s) {
  let h = gl(),
    y = h === null ? e : relative_31(h, e);
  if ("tooLargeBytes" in n)
    return (
      logFeatureSad("input_file_at_mention", "too_large"),
      {
        type: "at_mention_reference",
        mentions: [e],
        unread: "too_large",
        fileSize: n.tooLargeBytes,
        displayPath: y,
      }
    );
  let { maxTokens: maxTokens } = getDefaultFileReadingLimits(),
    sliced = parse_10(e).ext.toLowerCase().slice(1);
  for (let L of [void 0, MAX_LINES_TO_READ]) {
    let {
        content: content,
        lineCount: lineCount,
        totalLines: totalLines,
      } = readFileInRangeFast(n.toString("utf8"), n.length, 0, 0, L, void 0, void 0),
      Se = s === void 0 ? 0 : Buffer.byteLength(addLineNumbers({ content: content, startLine: 1 })),
      ke = !1;
    try {
      await validateContentTokens(content, sliced, maxTokens, credentials, !1, !0);
    } catch (error) {
      if (!(error instanceof MaxFileReadTokenExceededError)) {
        logError(error);
        return;
      }
      if (s === void 0 || Se > allowLargeRoomTokens(s, 0)) continue;
      ke = !0;
    }
    if ((s?.claim(Se), L === void 0)) logFeatureOk("input_file_at_mention");
    else logFeatureSad("input_file_at_mention", "first_lines_only");
    return {
      type: "file",
      filename: e,
      content: {
        type: "text",
        file: { filePath: e, content: content, numLines: lineCount, startLine: 1, totalLines: totalLines },
      },
      ...(L !== void 0 && { truncated: !0 }),
      ...(ke && { overTokenLimit: !0 }),
      displayPath: y,
    };
  }
  return;
}
/**
 * 运行 processAtMentionedFiles，合并附件与钩子上下文。
 */
//@ chunk-e6aww6q8.js:3348215-3348324 layout
async function getAtMentionedFileAttachments(e, n, r, s) {
  let h = await processAtMentionedFiles(e, n, r, s);
  return [...h.attached, ...h.hookContexts].filter(Boolean);
}
/**
 * 处理 @ 提及的文件/目录：解析 #L 行范围，权限检查（拒绝/网络路径跳过），目录列出、文件生成 file/compact_file_reference/pdf_reference 等，记 tengu_at_mention_* 事件。
 */
//@ chunk-e6aww6q8.js:3348324-3352037 fingerprint = processAtMentionedFiles (0.3)
async function processAtMentionedFiles(
  mentionedPaths,
  toolUseContext,
  parentAbortController,
  agentIdOverride,
) {
  let permissionContext = getToolPermissionContext(toolUseContext),
    y = [],
    S = agentIdOverride ?? toolUseContext.agentId,
    w = createReadThrottle();
  return {
    attached: await Promise.all(
      mentionedPaths.map(async (G, q) => {
        let Z;
        try {
          let { filename: filename, lineStart: lineStart, lineEnd: lineEnd } = parseAtMentionedFileLines(G),
            Ee =
              isAbsolute_44(filename) || filename.startsWith("~") || /(^|[\\/])\.\.([\\/]|$)/.test(filename),
            Ae = getAttachmentReadBlockReason(filename, permissionContext, "person");
          if (Ae === "network") return (logFeatureBad("input_file_at_mention", "denied"), null);
          let absoluteFilename = expandPath(filename);
          if (Ae === "denied") {
            if (Ee) logFeatureBad("input_file_at_mention", "denied");
            return null;
          }
          let Me = Q_(permissionContext);
          Z = Me ? await w() : void 0;
          let We = Me
            ? await pathSpellingsForRead(absoluteFilename, toolUseContext.abortController.signal)
            : [absoluteFilename];
          if (
            Me &&
            We !== void 0 &&
            C_e(We, { context: permissionContext, isHeldOutside: isRestrictedReadBlocked })
          )
            return (logFeatureBad("input_file_at_mention", "denied_at_landing"), null);
          let ze = We,
            lt = ze === void 0 && toolUseContext.abortController.signal.aborted;
          if (ze === void 0 && !lt)
            return (
              logFeatureBad("input_file_at_mention", "landing_unsettled"),
              { type: "at_mention_reference", mentions: [filename], unread: "unexamined" }
            );
          let Je = "none";
          try {
            let ho = lt ? void 0 : await stat_17(absoluteFilename);
            if (((Je = Me && ho?.isFile() ? "through-open" : "none"), ho?.isDirectory() && ze !== void 0))
              try {
                if (Me && isFileReadDenied(ze, permissionContext))
                  return (logFeatureBad("input_dir_at_mention", "denied"), null);
                let yn = Me
                  ? await readDirIfSpellingsStable(absoluteFilename, ze, (Xn) =>
                      readdir_24(Xn, { withFileTypes: !0 }),
                    )
                  : await readdir_24(absoluteFilename, { withFileTypes: !0 });
                if (yn === void 0)
                  return (
                    logFeatureBad("input_dir_at_mention", "listing_unsettled"),
                    { type: "at_mention_reference", mentions: [filename], unread: "unexamined" }
                  );
                let joined = (
                  await filterListableEntries(
                    yn,
                    {
                      spellings: ze,
                      context: permissionContext,
                      isDenied: kW,
                      isHeldOutside: isRestrictedReadBlocked,
                    },
                    toolUseContext.abortController.signal,
                  )
                ).join(`
`);
                return (
                  logEvent("tengu_at_mention_extracting_directory_success", {}),
                  logFeatureOk("input_dir_at_mention"),
                  logAtMention({ mentionType: "directory", success: !0 }),
                  {
                    type: "directory",
                    path: absoluteFilename,
                    content: joined,
                    displayPath: relative_31(getCwd(), absoluteFilename),
                  }
                );
              } catch {
                return (
                  logEvent("tengu_at_mention_extracting_directory_error", {}),
                  logFeatureBad("input_dir_at_mention", "readdir_failed"),
                  null
                );
              }
          } catch {}
          let nt = lineStart,
            pt = lineEnd && lineStart ? lineEnd - lineStart + 1 : void 0,
            Et = (ho) => (ho.path === absoluteFilename ? absoluteFilename : expandPath(ho.path)),
            yt = new Map(),
            gt = !1,
            At = !1,
            It = !1,
            Yt = !1,
            qt = [];
          (Z?.(), (Z = void 0));
          let { readThroughMention: readThroughMention } = await import("./chunk-hg7yd2v7.js"),
            stats = await readThroughMention({
              raised: {
                mention: G,
                path: absoluteFilename,
                ...(nt !== void 0 && { offset: nt }),
                ...(pt !== void 0 && { limit: pt }),
                ...(S !== void 0 && { agentId: S }),
              },
              signalOf: () => (parentAbortController ?? toolUseContext.abortController).signal,
              skipping: toolUseContext.hookOrigin,
              isIsolated: toolUseContext.options.settingsHooksOff === !0,
              storageV5: toolUseContext.storageV5,
              refusal: (ho) =>
                ho.path !== absoluteFilename &&
                getAttachmentReadBlockReason(ho.path, getToolPermissionContext(toolUseContext), "hook") !==
                  void 0
                  ? "the path may not be read here"
                  : void 0,
              read: (ho, yn) => {
                let Kn = Et(ho);
                yt.set(Kn, {
                  state: toolUseContext.readFileState.get(Kn),
                  triggers: count(toolUseContext.nestedMemoryAttachmentTriggers ?? [], (fo) => fo === Kn),
                });
                let Xn =
                  yn === "hooked" && parentAbortController !== void 0
                    ? {
                        ...toolUseContext,
                        abortController: createChildAbortController(parentAbortController),
                      }
                    : toolUseContext;
                return (
                  (gt ||= Xn.abortController.signal.aborted),
                  (At ||= !Xn.abortController.signal.aborted),
                  generateFileAttachment(
                    Kn,
                    Xn,
                    "tengu_at_mention_extracting_filename_success",
                    "tengu_at_mention_extracting_filename_error",
                    "at-mention",
                    {
                      offset: ho.offset,
                      limit: ho.limit,
                      pdfAbortParent: parentAbortController,
                      onRefusedAtOpen: () => {
                        Yt = !0;
                      },
                      onTooLarge: (fo) => {
                        qt.push({ path: Kn, fileSize: fo });
                      },
                      ...(Me && Kn === absoluteFilename && ze !== void 0 && { landing: ze, sizeProbe: Je }),
                    },
                  )
                );
              },
              forget: (ho) => {
                It = !0;
                let yn = Et(ho),
                  Kn = yt.get(yn);
                if (Kn?.state === void 0) toolUseContext.readFileState.delete(yn);
                else toolUseContext.readFileState.set(yn, Kn.state);
                let nestedMemoryAttachmentTriggers = toolUseContext.nestedMemoryAttachmentTriggers,
                  fo = Kn?.triggers ?? 0;
                while (
                  nestedMemoryAttachmentTriggers !== void 0 &&
                  count(nestedMemoryAttachmentTriggers, (To) => To === yn) > fo
                )
                  nestedMemoryAttachmentTriggers.splice(nestedMemoryAttachmentTriggers.lastIndexOf(yn), 1);
              },
            }),
            attachment = stats.attachment;
          if (stats.context) y[q] = stats.context;
          if (attachment) logFeatureOk("input_file_at_mention");
          if (!attachment && !It && (Yt || (lt && (Ee || lineStart !== void 0) && gt && !At))) {
            if (Yt) logFeatureBad("input_file_at_mention", "refused_at_open");
            return { type: "at_mention_reference", mentions: [filename], unread: "unexamined" };
          }
          let at = qt.at(-1);
          if (
            !attachment &&
            !It &&
            at !== void 0 &&
            parse_10(at.path).ext !== "" &&
            !hasBinaryExtension(at.path) &&
            !isNotebookPath(at.path)
          )
            return (
              logFeatureSad("input_file_at_mention", "too_large"),
              {
                type: "at_mention_reference",
                mentions: [at.path],
                unread: "too_large",
                fileSize: at.fileSize,
                displayPath: relative_31(getCwd(), at.path),
              }
            );
          return attachment;
        } catch {
          (logEvent("tengu_at_mention_extracting_filename_error", {}),
            logAtMention({ mentionType: "file", success: !1 }));
        } finally {
          Z?.();
        }
      }),
    ),
    hookContexts: y,
  };
}
/**
 * @agent-xxx 或 @"xxx (agent)" 提及 → agent_mention 附件（找不到的代理丢弃）。
 */
//@ chunk-e6aww6q8.js:3352037-3352324 fingerprint = processAgentMentions (0.595)
function processAgentMentions(input, agents) {
  let agentMentions = extractAgentMentions(input);
  if (agentMentions.length === 0) return [];
  return (
    logUnreportedMentions("agent", agentMentions.length),
    agentMentions
      .map((h, y) => {
        let agentType = h.replace("agent-", ""),
          agentDef = agents.find((def) => def.agentType === agentType);
        if (!agentDef) return (logMentionResult(y, "agent", !1), null);
        return (logMentionResult(y, "agent", !0), { type: "agent_mention", agentType: agentDef.agentType });
      })
      .filter((result) => result !== null)
  );
}
/**
 * @ 同伴提及解析：唯一匹配给 resolved，多个候选给 ask（peer_mention）。
 */
//@ chunk-e6aww6q8.js:3352324-3352884 layout
async function getPeerMentionAttachments(e, n, r) {
  if (isCrossSessionMessagingEnabled()) {
    let s = new Set(
        r.flatMap((S) => [
          ...("displayPath" in S ? [S.displayPath] : []),
          ...("filename" in S ? [S.filename] : []),
          ...(S.type === "directory" ? [S.path] : []),
        ]),
      ),
      filtered = parsePeerMentions(e).filter((S) => S.ref !== void 0 || !s.has(S.name));
    if (filtered.length === 0) return [];
    let y = await resolveTeamName(n.session, n.getAppState(), { storageV5: n.storageV5 });
    return resolvePeerMentions(filtered, y).map((S) =>
      S.kind === "resolved"
        ? {
            type: "peer_mention",
            mention: S.mention,
            status: "resolved",
            candidates: [S.candidate],
            total: 1,
          }
        : {
            type: "peer_mention",
            mention: S.mention,
            status: "ask",
            candidates: S.candidates,
            total: S.total,
          },
    );
  }
  return [];
}
/**
 * @server:uri 提及的 MCP 资源读取成 mcp_resource 附件（检查连接、权限与资源存在）。
 */
//@ chunk-e6aww6q8.js:3352884-3355459 layout
async function getMcpResourceAttachments(e, n, r, s, h, y, S) {
  let w = extractMcpResourceMentions(e);
  if (w.length === 0) return [];
  let L = n || [];
  return (
    logUnreportedMentions("mcp_resource", w.length),
    (
      await Promise.all(
        w.map(async (q, Z) => {
          try {
            let [Se, ...ke] = q.split(":"),
              joined = ke.join(":");
            if (!Se || !joined) return (logMentionResult(Z, "mcp_resource", !1), null);
            let found = L.find((ze) => ze.name === Se);
            if (!found || !isConnectedOrCached(found)) return (logMentionResult(Z, "mcp_resource", !1), null);
            if (Lfn(found, void 0)) return (logMentionResult(Z, "mcp_resource", !1), null);
            let found_2 = (r?.[Se] || []).find((ze) => ze.uri === joined);
            if (!found_2) return (logMentionResult(Z, "mcp_resource", !1), null);
            let Me = Ifn(found.name, joined, s, h);
            if (Me !== void 0)
              return (
                logMentionResult(Z, "mcp_resource", !1),
                logForDebugging(`MCP resource ${Se} ${joined} not read: ${Me}`, { level: "warn" }),
                null
              );
            let We = getEnsureConnectedClient();
            if (!We) return (logMentionResult(Z, "mcp_resource", !1), null);
            try {
              let ze = await We(found, { signal: y, context: "MCP @-mention resource read" });
              if (Lfn(ze, void 0)) return (logMentionResult(Z, "mcp_resource", !1), null);
              let lt = classifySkillResourceUri(joined, countUniqueFiles(ze.name, s, h));
              if (lt.case === "unlisted")
                return (
                  logMentionResult(Z, "mcp_resource", !1),
                  logForDebugging(
                    lt.reason === "uri_too_long"
                      ? `MCP resource ${Se} (an address of ${Buffer.byteLength(joined)} bytes) not read: its address is longer than 2048 bytes, and ${plural(lt.skills.length, "skill")} ${lt.skills.map((skill) => skill.skillName).join(", ")} from this server ${lt.skills.length === 1 ? "is" : "are"} loaded`
                      : lt.reason === "unparseable_uri"
                        ? `MCP resource ${Se} ${joined} not read: its address is not a valid URL, and ${plural(lt.skills.length, "skill")} ${lt.skills.map((skill) => skill.skillName).join(", ")} from this server ${lt.skills.length === 1 ? "is" : "are"} loaded`
                        : lt.reason === "other_spelling"
                          ? `MCP resource ${Se} ${joined} not read: its address begins with another spelling of the address of loaded ${plural(lt.skills.length, "skill")} ${lt.skills.map((skill) => skill.skillName).join(", ")}`
                          : `MCP resource ${Se} ${joined} not read: it is in the directory of loaded ${plural(lt.skills.length, "skill")} ${lt.skills.map((skill) => skill.skillName).join(", ")}, but ${lt.skills.length === 1 ? "that skill does not list it" : "none of them lists it"}, or MCP skills are turned off`,
                    { level: "warn" },
                  ),
                  null
                );
              Uv(READMCPRESOURCETOOL);
              let Je = await readMcpResource(ze, joined, { signal: S }),
                nt = lt.case === "listed" ? verifySkillFile(Je.contents, joined, lt.rows) : void 0;
              if (nt !== void 0 && !nt.ok)
                return (
                  logMentionResult(Z, "mcp_resource", !1),
                  logForDebugging(
                    `MCP resource ${Se} ${joined} not attached: ${MCP_SKILL_FILE_PROBLEMS[nt.reason]}`,
                    { level: "warn" },
                  ),
                  null
                );
              return (
                logMentionResult(Z, "mcp_resource", !0),
                {
                  type: "mcp_resource",
                  server: Se,
                  uri: joined,
                  name: found_2.name || joined,
                  description: found_2.description,
                  content: nt !== void 0 && nt.ok ? { ...Je, contents: [nt.item] } : Je,
                }
              );
            } catch (error) {
              if (isAbortError(error) || S.aborted) return null;
              return (
                logMentionResult(Z, "mcp_resource", !1),
                logForDebugging(
                  `MCP resource read failed for ${Se} ${joined}: ${error instanceof Error ? error.message : String(error)}`,
                  { level: "error" },
                ),
                null
              );
            }
          } catch {
            return (logMentionResult(Z, "mcp_resource", !1), null);
          }
        }),
      )
    ).filter((q) => q !== null)
  );
}
/**
 * 100：每类提及最多单独上报 100 个事件，其余合并为 tengu_at_mention_unreported。
 */
//@ chunk-e6aww6q8.js:3355459-3355471 layout
var MAX_REPORTED_MENTIONS = 100;
/**
 * 记录一个提及处理结果事件（agent/mcp_resource 成功或失败）。旧版名 processMcpResourceAttachments 为错配。
 */
//@ chunk-e6aww6q8.js:3355471-3355720 file-local
function logMentionResult(e, n, r) {
  if (e >= MAX_REPORTED_MENTIONS) return;
  if (n === "agent") logEvent(r ? "tengu_at_mention_agent_success" : "tengu_at_mention_agent_not_found", {});
  else logEvent(r ? "tengu_at_mention_mcp_resource_success" : "tengu_at_mention_mcp_resource_error", {});
  logAtMention({ mentionType: n, success: r });
}
/**
 * 提及数超过上限时记 tengu_at_mention_unreported。
 */
//@ chunk-e6aww6q8.js:3355720-3355812 layout
function logUnreportedMentions(e, n) {
  if (n > MAX_REPORTED_MENTIONS)
    logEvent("tengu_at_mention_unreported", { mention_type: fromEnum(e), count: n - MAX_REPORTED_MENTIONS });
}
/**
 * 按 readFileState 记录变更文件检查顺序的 WeakMap。
 */
//@ chunk-e6aww6q8.js:3355812-3355842 layout
var MAX_CHANGED_FILE_SNIPPET_CHARS = 16384,
  changedFilesOrderByState = new WeakMap();
/**
 * 检查已读文件（readFileState）在磁盘上是否变化：变化的文本文件给 edited_text_file（diff 片段，总长 16KB 内），图片给 edited_image_file；计划模式下跳过。
 */
//@ chunk-e6aww6q8.js:3355842-3358973 fingerprint = getChangedFiles (0.432)
async function getChangedFiles(toolUseContext) {
  let filePaths = bAt(toolUseContext.readFileState);
  if (filePaths.length === 0) return [];
  if (isDiskless()) return (reportOnce("changed_files"), []);
  let r = changedFilesOrderByState.get(toolUseContext.readFileState) ?? [],
    s = new Set(filePaths),
    h = new Set(r),
    combined = r.filter((We) => s.has(We)).concat(filePaths.filter((We) => !h.has(We))),
    S = new Set(),
    w = new Set(),
    L = getToolPermissionContext(toolUseContext),
    G = getFeatureValue_CACHED_MAY_BE_STALE("tengu_fallow_plover", !1),
    q = G && getFeatureValue_CACHED_MAY_BE_STALE("tengu_mossy_thrush", !1) ? mor() : void 0,
    Z = {},
    Se = 0,
    ke = Q_(L),
    we = createReadThrottle(),
    results = await Promise.all(
      combined.map(async (filePath) => {
        let fileState = toolUseContext.readFileState.get(filePath);
        if (!fileState) return null;
        if (fileState.offset !== void 0 || fileState.limit !== void 0) return null;
        let normalizedPath = expandPath(filePath);
        if (kW(normalizedPath, L)) return null;
        let Je;
        try {
          Je = ke ? await we() : void 0;
          let nt = toolUseContext.abortController.signal.aborted ? S : w,
            pt = ke
              ? await Mq(
                  normalizedPath,
                  { context: L, isHeldOutside: isRestrictedReadBlocked },
                  toolUseContext.abortController.signal,
                )
              : [normalizedPath];
          if (pt === void 0) {
            if (toolUseContext.abortController.signal.aborted) nt.add(filePath);
            return null;
          }
          if ((await getFileModificationTimeAsync(normalizedPath)) <= fileState.timestamp) return null;
          let fileInput = { file_path: normalizedPath };
          if (!(await FileReadTool.validateInput(fileInput, toolUseContext)).result) return null;
          if (
            G &&
            (await checkFileStateResyncOnce(
              toolUseContext.readFileState,
              normalizedPath,
              fileState,
              toolUseContext.fileReadingLimits?.maxSizeBytes ?? getDefaultFileReadingLimits().maxSizeBytes,
              toolUseContext.abortController.signal,
              {
                outputsLink: q,
                isLandingJudged: ke ? (Zt) => pt.includes(Zt) : () => !0,
                onOutcome: (Zt, rn, pn) => {
                  if (((Z[Zt] = (Z[Zt] ?? 0) + 1), rn)) Z.via_outputs_link = (Z.via_outputs_link ?? 0) + 1;
                  if (Zt === "differs" && pn !== void 0)
                    getAttachmentTimingStore()?.noteDiffersFile(
                      pn,
                      fileState.content === "" && (fileState.contentLength ?? 0) > 0,
                    );
                },
              },
            ))
          )
            return null;
          Se++;
          let holdsOnlyStartOf = toolUseContext.readFileState.holdsOnlyStartOf(normalizedPath);
          Uv(FileReadTool.name);
          let It = ke
              ? await stashAttachedReadPermission(normalizedPath, pt, toolUseContext)
              : toolUseContext,
            Yt = timeAttachment("changed_file_read", () => FileReadTool.call(fileInput, It));
          Je?.();
          let qt = await Yt;
          if (fileState.isPartialView || holdsOnlyStartOf) {
            let Zt = toolUseContext.readFileState.get(normalizedPath);
            if (Zt)
              toolUseContext.readFileState.set(normalizedPath, {
                ...Zt,
                ...(fileState.isPartialView && { isPartialView: !0 }),
                ...(holdsOnlyStartOf && { contentNotInModelContext: !0 }),
              });
          }
          if (qt.data.type === "text") {
            if (qt.data.file.truncatedByTokenCap === !0) return null;
            if (y1(fileState, qt.data.file.content)) return null;
            if (fileState.content === "" && (fileState.contentLength ?? 0) > 0)
              return (
                ret(toolUseContext.readFileState, normalizedPath),
                { type: "edited_text_file", filename: normalizedPath, snippet: "" }
              );
            let snippet = getSnippetForTwoFileDiff(fileState.content, qt.data.file.content);
            if (snippet === "") return null;
            if (isSensitiveFileName(normalizedPath))
              return (
                ret(toolUseContext.readFileState, normalizedPath),
                { type: "edited_text_file", filename: normalizedPath, snippet: "" }
              );
            return { type: "edited_text_file", filename: normalizedPath, snippet: snippet };
          }
          if (qt.data.type === "image")
            try {
              let Zt = ke
                ? await checkPathRefused(normalizedPath, pt, toolUseContext.abortController.signal)
                : void 0;
              try {
                let rn = await readImageWithTokenBudget(
                  Zt ?? normalizedPath,
                  void 0,
                  void 0,
                  imageLimitsForModel(toolUseContext.options.mainLoopModel),
                );
                return { type: "edited_image_file", filename: normalizedPath, content: rn };
              } finally {
                if (Zt !== void 0) await Zt.close().catch(() => {});
              }
            } catch (compressionError) {
              return (
                logForDebugging(
                  `Failed to read changed image file ${normalizedPath}: ${compressionError instanceof Error ? compressionError.message : String(compressionError)}`,
                  { level: "error" },
                ),
                logEvent("tengu_watched_file_compression_failed", {
                  ext: getFileExtensionForAnalytics(normalizedPath),
                  ...errorTelemetryFields(compressionError),
                }),
                null
              );
            }
          return null;
        } catch (err) {
          if (isENOENT(err)) toolUseContext.readFileState.delete(filePath);
          return null;
        } finally {
          Je?.();
        }
      }),
    ),
    Ae = S.size + w.size;
  if (Ae === 0) changedFilesOrderByState.delete(toolUseContext.readFileState);
  else
    (changedFilesOrderByState.set(
      toolUseContext.readFileState,
      combined.filter((result) => S.has(result)).concat(combined.filter((We) => w.has(We))),
    ),
      logForDebugging(
        `Changed files: the pass ended with ${Ae} of ${combined.length} tracked files not examined; the next pass begins with them.`,
        { level: "warn" },
      ));
  if (!toolUseContext.agentId) (gdn(Se), hdn(Z));
  let filtered = results.filter((We) => We != null),
    Me = 0;
  for (let We of filtered) {
    if (We.type !== "edited_text_file") continue;
    if (Me >= MAX_CHANGED_FILE_SNIPPET_CHARS)
      ((We.snippet = ""), ret(toolUseContext.readFileState, We.filename));
    else Me += We.snippet.length;
  }
  return filtered;
}
/**
 * 消费 nestedMemoryAttachmentTriggers（读文件等操作触发的路径），生成对应嵌套记忆附件。
 */
//@ chunk-e6aww6q8.js:3358973-3359439 layout
async function getNestedMemoryTriggerAttachments(e, n) {
  let {
      nestedMemoryAttachmentTriggers: nestedMemoryAttachmentTriggers,
      pendingNestedMemoryTriggers: pendingNestedMemoryTriggers,
    } = e,
    h = new Set();
  if (nestedMemoryAttachmentTriggers && pendingNestedMemoryTriggers && !e.agentId) {
    for (let L of pendingNestedMemoryTriggers)
      if (!nestedMemoryAttachmentTriggers.includes(L)) (nestedMemoryAttachmentTriggers.push(L), h.add(L));
    (e.consumedNestedMemoryTriggers?.push(...pendingNestedMemoryTriggers),
      (pendingNestedMemoryTriggers.length = 0));
  }
  if (env.CLAUDE_CODE_DISABLE_CLAUDE_MDS) {
    if (nestedMemoryAttachmentTriggers) nestedMemoryAttachmentTriggers.length = 0;
    return [];
  }
  if (!nestedMemoryAttachmentTriggers || nestedMemoryAttachmentTriggers.length === 0) return [];
  let y = getToolPermissionContext(e),
    S = [],
    w = n && (await getMemoryAnnouncementState(e, n));
  for (let L of nestedMemoryAttachmentTriggers) {
    let G = await getNestedMemoryAttachmentsForFile(L, e, { toolPermissionContext: y }, w, h.has(L));
    S.push(...G);
  }
  return ((nestedMemoryAttachmentTriggers.length = 0), S);
}
/**
 * readFileState 已有该路径（可选要求完整读取）。
 */
//@ chunk-e6aww6q8.js:3359439-3359508 layout
function isAlreadyReadWhole(e, n, r) {
  return e.has(n) && (!r || e.get(n)?.offset === void 0);
}
/**
 * 相关记忆检索：按提及的代理记忆或自动记忆目录列出候选，用记忆选择器挑选，读取后生成 relevant_memories（可含账户召回）。
 */
//@ chunk-e6aww6q8.js:3359508-3360723 fingerprint = getRelevantMemoryAttachments (0.541)
async function getRelevantMemoryAttachments(
  session,
  input,
  activeAgents,
  memorySelector,
  readFileState,
  signal,
  surfaced,
  storageV5,
  credentials,
  G,
  isBlockedPath,
  earlierReadsMayBeCleared,
  autoMemoryOn,
  accountRecall,
) {
  let we = autoMemoryOn
      ? extractAgentMentions(input).flatMap((mention) => {
          let agentType = mention.replace("agent-", ""),
            agentDef = activeAgents.find((def) => def.agentType === agentType);
          return agentDef?.memory ? [{ agentType: agentType, scope: agentDef.memory }] : [];
        })
      : [],
    Ee = we.length === 0 ? accountRecall?.listing() : void 0;
  await getAutoMemPathState().warmCanonicalWcRoot();
  let Ae = autoMemoryOn && !(we.length === 0 && isAutoMemReadFenced()),
    Ie = await Ee;
  if (!Ae && Ie === void 0) return [];
  await waitForFirstStorePull(signal);
  let Me =
      we.length > 0
        ? (
            await Promise.all(
              we.map(({ agentType: agentType, scope: scope }) =>
                resolveAgentMemoryDirForRecall(agentType, scope),
              ),
            )
          ).filter((dir) => dir !== null)
        : [{ dir: getAutoMemPath(), regularFilesOnly: !1, containedIn: void 0 }],
    selected = (
      await Promise.all(
        Me.map(({ dir: dir, regularFilesOnly: regularFilesOnly, containedIn: containedIn }) =>
          selectMemoryRecall(
            session,
            input,
            dir,
            memorySelector,
            signal,
            surfaced.paths,
            isIndexRecallEnabled(),
            activeSessionLogExcluder(),
            dir === getAutoMemPath(),
            (yt) => isAlreadyReadWhole(readFileState, yt, earlierReadsMayBeCleared),
            isMultiStoreSyncAvailable,
            storageV5,
            credentials,
            G,
            regularFilesOnly,
            dir === getAutoMemPath() ? Ie : void 0,
            Ae,
            dir === getAutoMemPath()
              ? (accountRecall?.scope() ?? accountMemoryRecall?.NO_ACCOUNT_SCOPE)
              : void 0,
          )
            .then((yt) =>
              yt.map((gt) => ({ ...gt, regularFilesOnly: regularFilesOnly, containedIn: containedIn })),
            )
            .catch(() => []),
        ),
      )
    )
      .flat()
      .filter((nt) =>
        nt.account
          ? accountRecall?.pickable(nt.path) === !0
          : !isAlreadyReadWhole(readFileState, nt.path, earlierReadsMayBeCleared) &&
            !surfaced.paths.has(nt.path) &&
            !isBlockedPath(nt.path),
      )
      .slice(0, 5),
    [lt, Je] = await Promise.all([
      readMemoriesForSurfacing(
        selected.filter((nt) => !nt.account),
        signal,
      ),
      accountRecall?.attachmentsFor(
        selected.filter((nt) => nt.account).map((nt) => nt.path),
        RELEVANT_MEMORIES_CONFIG.MAX_SESSION_BYTES - surfaced.totalBytes,
        signal,
      ) ?? [],
    ]);
  return [...(lt.length > 0 ? [{ type: "relevant_memories", memories: lt }] : []), ...Je];
}
/**
 * 统计对话里已出现的相关记忆路径与总字节数（含账户召回）。
 */
//@ chunk-e6aww6q8.js:3360723-3361031 fingerprint = collectSurfacedMemories (0.869)
function collectSurfacedMemories(messages) {
  let paths = new Set(),
    totalBytes = 0;
  for (let s of messages) {
    if (s.type !== "attachment") continue;
    if (s.attachment.type === "relevant_memories")
      for (let mem of s.attachment.memories) (paths.add(mem.path), (totalBytes += mem.content.length));
    else if (s.attachment.type === "account_memory_recall") totalBytes += s.attachment.content.length;
  }
  return { paths: paths, totalBytes: totalBytes };
}
/**
 * 读取选中的记忆文件：限制为普通文件/目录内，截断时附提示（用 Read 看全文），返回 {path, content, mtimeMs, header, limit}。
 */
//@ chunk-e6aww6q8.js:3361031-3361660 fingerprint = readMemoriesForSurfacing (0.843)
async function readMemoriesForSurfacing(selected, signal) {
  return (
    await Promise.all(
      selected.map(async (s) => {
        let {
          path: path,
          mtimeMs: mtimeMs,
          regularFilesOnly: regularFilesOnly,
          containedIn: containedIn,
        } = s;
        try {
          if (regularFilesOnly && !(await lstat_30(path)).isFile()) return null;
          if (containedIn !== void 0 && !(await isRealpathWithin(path, containedIn))) return null;
          let L = await readMemoryFileForRecall(path, signal);
          if (L === void 0) return null;
          let G = Fae(L.content),
            content = L.truncated
              ? G +
                `

> This memory file was truncated (${L.truncatedByBytes ? `${MEMORY_FILE_RECALL_BYTES} byte limit` : `first ${DUe} lines`}). Use the ${FILE_READ_TOOL_NAME} tool to view the complete file at: ${pCn(path)}`
              : G;
          return {
            path: path,
            content: content,
            mtimeMs: mtimeMs,
            header: memoryHeader(path, mtimeMs),
            limit: L.truncated || L.itemBlockRemoved || G !== L.content ? L.lineCount : void 0,
          };
        } catch {
          return null;
        }
      }),
    )
  ).filter((s) => s !== null);
}
/**
 * 不做相关记忆预取的 querySource：extract_memories、auto_dream、prompt_suggestion、compact 等。
 */
//@ chunk-e6aww6q8.js:3361660-3361745 layout
var MEMORY_PREFETCH_SKIP_SOURCES = new Set([
  "extract_memories",
  "auto_dream",
  MEMDIR_RELEVANCE,
  "prompt_suggestion",
  "compact",
]);
/**
 * 在 queryLoop 入口启动相关记忆预取：主线程、非跳过来源、自动记忆或账户召回开启、最后一条用户消息有空白（或含 CJK）、会话预算未超 60KB 时，异步调用 getRelevantMemoryAttachments，返回可 using 释放的句柄。
 */
//@ chunk-e6aww6q8.js:3361745-3363462 fingerprint = startRelevantMemoryPrefetch (0.544)
function startRelevantMemoryPrefetch(messages, toolUseContext, querySource, s) {
  let memorySelector = toolUseContext.memorySelector;
  if (!memorySelector || toolUseContext.agentId || MEMORY_PREFETCH_SKIP_SOURCES.has(querySource)) return;
  let y = isAutoMemoryEnabled() && isMemoryRecallEnabled(),
    S = accountMemoryRecall?.isAccountRecallOn() === !0 && !isIndexRecallEnabled();
  if (!y && !S) return;
  let lastUserMessage = messages.findLast((Ie) => Ie.type === "user" && !Ie.isMeta);
  if (!lastUserMessage) return;
  let input = getUserMessageText(lastUserMessage);
  if (!input) return;
  if (
    !/\s/.test(input.trim()) &&
    !(
      isIndexRecallEnabled() &&
      /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/.test(normalizeNfkc(input))
    )
  )
    return;
  let surfaced = collectSurfacedMemories(messages);
  if (surfaced.totalBytes >= RELEVANT_MEMORIES_CONFIG.MAX_SESSION_BYTES) {
    logFeatureSad("memory_recall_select", "session_budget_exhausted");
    return;
  }
  let accountRecall =
    S && accountMemoryRecall
      ? accountMemoryRecall.startAccountRecall(Us([...messages]), toolUseContext, querySource, s, {
          callMcpToolRaw: callMcpTool,
          executePreToolHooks: executePreToolHooks,
        })
      : void 0;
  if (!y && !accountRecall) return;
  let Z = hasClearedToolResultsAfterIdle(
      messages,
      toolUseContext.options.mainLoopModel,
      void 0,
      toolUseContext.session,
    ),
    controller = createChildAbortController(toolUseContext.abortController),
    firedAt = Date.now(),
    we = [],
    promise = getRelevantMemoryAttachments(
      toolUseContext.session,
      input,
      toolUseContext.options.agentDefinitions.activeAgents,
      memorySelector,
      toolUseContext.readFileState,
      controller.signal,
      surfaced,
      toolUseContext.storageV5,
      toolUseContext.credentials,
      we,
      (Ie) => {
        let Me = getToolPermissionContext(toolUseContext);
        if (Me?.blockReadsOutsideWorkingDirectories !== !0) return !1;
        try {
          return outsideReadBlocked(Ie, Me);
        } catch {
          return !0;
        }
      },
      Z,
      y,
      accountRecall,
    ).catch((Ie) => {
      if (!isAbortError(Ie)) logError(Ie);
      return [];
    }),
    prefetchHandle = {
      promise: promise,
      settledAt: null,
      consumedOnIteration: -1,
      consumedBlocking: !1,
      earlierReadsMayBeCleared: Z,
      screen(Ie, Me) {
        return accountRecall ? accountRecall.screen(Ie, Me) : [...Ie];
      },
      [Symbol.dispose]() {
        if ((controller.abort(), prefetchHandle.consumedOnIteration === -1))
          promise.then(() => we.forEach((Me) => Me()));
        accountRecall?.finish(prefetchHandle);
        let lastUsage = memorySelector.lastUsage;
        logEvent("tengu_memdir_prefetch_collected", {
          hidden_by_first_iteration:
            prefetchHandle.settledAt !== null &&
            prefetchHandle.consumedOnIteration === 0 &&
            !prefetchHandle.consumedBlocking,
          blocking_consume: prefetchHandle.consumedBlocking,
          consumed_on_iteration: prefetchHandle.consumedOnIteration,
          latency_ms: (prefetchHandle.settledAt ?? Date.now()) - firedAt,
          cache_read_input_tokens: lastUsage?.cacheReadInputTokens,
          cache_creation_input_tokens: lastUsage?.cacheCreationInputTokens,
          selector_turn_count: lastUsage?.turnCount,
        });
      },
    };
  return (
    promise.finally(() => {
      prefetchHandle.settledAt = Date.now();
    }),
    prefetchHandle
  );
}
/**
 * 2000：阻塞等待记忆预取的上限。
 */
//@ chunk-e6aww6q8.js:3363462-3363475 layout
var MEMORY_PREFETCH_DEADLINE_MS = 2000;
/**
 * 是否在请求前阻塞等待记忆预取（tengu_mill_orange 且记忆同步不在待定状态）。
 */
//@ chunk-e6aww6q8.js:3363475-3363547 layout
function shouldBlockOnMemoryPrefetch() {
  return (
    isIndexRecallEnabled() &&
    !firstStorePullPending() &&
    !(isMultiStoreSyncAvailable() && getOrgMemoryDecision().state === "undecided")
  );
}
/**
 * 最多等 2 秒或中止，记 tengu_memdir_prefetch_blocking_wait，返回预取到的附件。
 */
//@ chunk-e6aww6q8.js:3363547-3364082 layout
async function awaitMemoryPrefetch(e, n) {
  let now = Date.now(),
    s,
    promise = new Promise((w) => {
      if (n.aborted) {
        w(void 0);
        return;
      }
      ((s = () => w(void 0)), n.addEventListener("abort", s, { once: !0 }));
    }),
    y;
  try {
    y = await Promise.race([withDeadline(e.promise, MEMORY_PREFETCH_DEADLINE_MS), promise]);
  } finally {
    if (s !== void 0) n.removeEventListener("abort", s);
  }
  let S = Date.now() - now;
  return (
    logEvent("tengu_memdir_prefetch_blocking_wait", {
      outcome: fromEnum(n.aborted ? "aborted" : y !== void 0 ? "consumed" : "deadline"),
      blocking_wait_ms: S,
      deadline_fired: y === void 0 && !n.aborted,
      result_in_time: y !== void 0 && !n.aborted,
      attachment_count: y?.length ?? -1,
    }),
    n.aborted ? void 0 : y
  );
}
/**
 * 对象且 type=tool_result、tool_use_id 为字符串。
 */
//@ chunk-e6aww6q8.js:3364082-3364192 file-local
function isToolResultBlock_2(b) {
  return typeof b === "object" && b !== null && b.type === "tool_result" && typeof b.tool_use_id === "string";
}
/**
 * 内容数组里含 tool_result 块（用于区分真实用户轮与工具结果轮）。
 */
//@ chunk-e6aww6q8.js:3364192-3364245 file-local
function hasToolResultContent(content) {
  return Array.isArray(content) && content.some(isToolResultBlock_2);
}
/**
 * 去掉已读过的相关记忆，把新记忆写入 readFileState 并记入已呈现集合；空的附件丢弃。
 */
//@ chunk-e6aww6q8.js:3364245-3364589 fingerprint = filterDuplicateMemoryAttachments (0.9)
function filterDuplicateMemoryAttachments(e, n, r, s) {
  let of = ICe.of(r);
  return e
    .map((attachment) => {
      if (attachment.type !== "relevant_memories") return attachment;
      let filtered = attachment.memories.filter((memory) => !isAlreadyReadWhole(n, memory.path, s));
      for (let w of filtered)
        n.set(w.path, { content: w.content, timestamp: w.mtimeMs, offset: void 0, limit: w.limit });
      return (
        of.recordSurfaced(filtered.map((w) => w.path)),
        filtered.length > 0 ? { ...attachment, memories: filtered } : null
      );
    })
    .filter((y) => y !== null);
}
/**
 * 技能附件附加字段（当前构建恒为空对象）。
 */
//@ chunk-e6aww6q8.js:3364589-3364614 layout
function getSkillAttachmentExtras(e) {
  return {};
}
/**
 * 文件操作触发的新技能目录：扫描技能目录，产出 dynamic_skill 附件（目录、技能名）。
 */
//@ chunk-e6aww6q8.js:3364614-3365645 fingerprint = getDynamicSkillAttachments (0.901)
async function getDynamicSkillAttachments(toolUseContext) {
  let dynamicSkillDirTriggers = toolUseContext.dynamicSkillDirTriggers;
  if (!dynamicSkillDirTriggers || dynamicSkillDirTriggers.length === 0) return [];
  let r = [...dynamicSkillDirTriggers];
  if (((dynamicSkillDirTriggers.length = 0), getDisableSlashCommands())) return [];
  if (!toolUseContext.options.tools.some((tool) => toolMatchesName(tool, SKILL))) return [];
  await addSkillDirectories(r).catch(() => {});
  let s = getProjectRoot(),
    h = s.endsWith(sep_51) ? s : s + sep_51,
    y = await getSkillToolCommands(getProjectRoot(), toolUseContext.storageV5);
  if (toolUseContext.agentId === void 0) y = filterCommandsByAllowlist(y, getSessionSkillAllowlist());
  let S = new Map();
  for (let G of y) if (G.type === "prompt" && G.skillRoot) S.set(G.skillRoot, G.name);
  let attachments = [],
    perDirResults = await Promise.all(
      r.map(async (skillDir) => {
        try {
          let candidates = (await readdir_24(skillDir, { withFileTypes: !0 }))
              .filter((ke) => ke.isDirectory() || ke.isSymbolicLink())
              .map((ke) => ke.name),
            checked = await Promise.all(
              candidates.map(async (name) => {
                try {
                  await stat_17(resolve_35(skillDir, name, "SKILL.md"));
                } catch {
                  return null;
                }
                let we = S.get(resolve_35(skillDir, name));
                if (!we || !isNonEmptyIdentifier(we)) return null;
                return we;
              }),
            );
          return { skillDir: skillDir, skillNames: checked.filter((ke) => ke !== null) };
        } catch {
          return { skillDir: skillDir, skillNames: [] };
        }
      }),
    );
  for (let { skillDir: skillDir, skillNames: skillNames } of perDirResults) {
    if (skillNames.length === 0) continue;
    let Z = relative_31(s, skillDir);
    if (Ywr.test(Z) || !skillDir.startsWith(h)) continue;
    attachments.push({
      type: "dynamic_skill",
      skillDir: skillDir,
      skillNames: skillNames,
      displayPath: Z,
      ...getSkillAttachmentExtras(toolUseContext.options.tools),
    });
  }
  return attachments;
}
/**
 * getSkillListingAttachments 的转发包装。
 */
//@ chunk-e6aww6q8.js:3365645-3365687 layout
async function getSkillListingAttachmentsLazy(...e) {
  return getSkillListingAttachments(...e);
}
/**
 * 有 Skill 工具时产出 skill_listing：首次完整列表，之后只给新增（对比历史 digest），带技能数与名字。
 */
//@ chunk-e6aww6q8.js:3365687-3366805 fingerprint = getSkillListingAttachments (0.674)
async function getSkillListingAttachments(toolUseContext, messages) {
  if (getDisableSlashCommands()) return [];
  if (!toolUseContext.options.tools.some((tool) => toolMatchesName(tool, SKILL))) return [];
  let r = await getSkillToolCommands(getProjectRootOrNull(), toolUseContext.storageV5),
    s = F7(toolUseContext.getMcp().commands),
    filtered = QRe().filter((we) => !we.disableModelInvocation && !isHiddenFromModel(we)),
    y = B7(toolUseContext.getMcp().commands),
    S = dropSyncedNameClashes(r, y),
    mcpSkills = dedupeBundledSkills(
      s.length > 0
        ? dropShadowedFallbackSkills(Ji([...S, ...filtered, ...s], "name"))
        : Ji([...S, ...filtered], "name"),
    ),
    { agentContext: agentContext } = toolUseContext;
  if (
    isMainConversationContext(agentContext) ||
    (agentContext.agentType === "subagent" &&
      agentContext.isBuiltIn === !0 &&
      agentContext.subagentName === FORK)
  )
    mcpSkills = filterCommandsByAllowlist(mcpSkills, getSessionSkillAllowlist());
  let G = new Map();
  for (let cmd of messages)
    if (cmd.type === "attachment" && cmd.attachment.type === "skill_listing") {
      let { names: names = [], digests: digests } = cmd.attachment;
      for (let [Ie, Me] of names.entries()) G.set(Me, (G.get(Me) ?? new Set()).add(digests?.[Ie]));
    }
  let newSkills = mcpSkills.filter((cmd) => {
    let Ee = G.get(cmd.name);
    return !Ee?.has(void 0) && !Ee?.has(getSkillListingDigest(cmd));
  });
  if (newSkills.length === 0) return [];
  let isInitial = G.size === 0;
  logForDebugging(`Sending ${newSkills.length} skills via attachment (${isInitial ? "initial" : "dynamic"})`);
  let contextWindowTokens = getContextWindow(toolUseContext.options.mainLoopModel, getSdkBetas());
  return [
    {
      type: "skill_listing",
      content: formatCommandsWithinBudget(
        newSkills,
        (we) => getSkillUsageScore(we.name),
        contextWindowTokens,
        bytesPerTokenForModel(toolUseContext.options.mainLoopModel),
        [...(await getCommands(getProjectRootOrNull(), toolUseContext.storageV5)), ...y],
      ),
      skillCount: newSkills.length,
      isInitial: isInitial,
      names: newSkills.map((we) => we.name),
      ...getSkillAttachmentExtras(toolUseContext.options.tools),
      digests: newSkills.map(getSkillListingDigest),
    },
  ];
}
/**
 * 从输入中提取 @ 文件提及（@"带空格路径" 与普通 @path，排除 (agent)）。
 */
//@ chunk-e6aww6q8.js:3366805-3367028 fingerprint = extractAtMentionedFiles (0.486)
function extractAtMentionedFiles(content) {
  let regExp = new RegExp(String.raw`(^|${gq})@"([^"]+)"`, "g"),
    r = [],
    match;
  while ((match = regExp.exec(content)) !== null)
    if (match[2] && !match[2].endsWith(" (agent)")) r.push(match[2]);
  let filtered = extractAtTokens(content, !1).filter((match) => !match.startsWith('"'));
  return uniq([...r, ...filtered]);
}
/**
 * 提取 @server:uri 形式的 MCP 资源提及。
 */
//@ chunk-e6aww6q8.js:3367028-3367064 layout
function extractMcpResourceMentions(e) {
  return uniq(extractAtTokens(e, !0));
}
/**
 * 按空白切词找 @ 后的 token（可要求含冒号），去掉尾部成对标点。
 */
//@ chunk-e6aww6q8.js:3367064-3367395 layout
function extractAtTokens(e, n) {
  let r = [];
  if (!e.includes("@")) return r;
  for (let [s] of e.matchAll(/[^\s]+/g)) {
    let index = s.indexOf("@");
    while (index > 0 && !rAe.includes(s[index - 1])) index = s.indexOf("@", index + 1);
    if (index === -1) continue;
    let y = n ? s.indexOf(":", index + 2) : index;
    if (y === -1) continue;
    let S = s.length;
    while (S >= y + 2 && Rfn(s, S - 1) === Rfn(s, S)) S--;
    if (S >= y + 2) r.push(s.slice(index + 1, S));
  }
  return r;
}
/**
 * 提取 @"name (agent)" 与 @agent-name 形式的代理提及。
 */
//@ chunk-e6aww6q8.js:3367395-3367674 layout
function extractAgentMentions(e) {
  let n = [],
    regExp = new RegExp(String.raw`(^|${gq})@"([\w:.@-]+) \(agent\)"`, "g"),
    s;
  while ((s = regExp.exec(e)) !== null) if (s[2]) n.push(s[2]);
  let regExp_2 = new RegExp(String.raw`(^|${gq})@(agent-[\w:.@-]+)`, "g"),
    y = e.match(regExp_2) || [];
  for (let S of y) n.push(S.slice(S.indexOf("@") + 1));
  return uniq(n);
}
/**
 * 解析 "file#L10-20" 形式的行范围。
 */
//@ chunk-e6aww6q8.js:3367674-3367881 fingerprint = parseAtMentionedFileLines (1)
function parseAtMentionedFileLines(mention) {
  let match = mention.match(/^([^#]+)(?:#L(\d+)(?:-(\d+))?)?(?:#[^#]*)?$/);
  if (!match) return { filename: mention };
  let [, r, s, h] = match,
    y = s ? parseInt(s, 10) : void 0,
    S = h ? parseInt(h, 10) : y;
  return { filename: r ?? mention, lineStart: y, lineEnd: S };
}
/**
 * 记 tengu_lsp_diagnostics_injected（字符数、诊断数、文件数、来源）。
 */
//@ chunk-e6aww6q8.js:3367881-3368060 layout
function logDiagnosticsInjected(e, n) {
  logEvent("tengu_lsp_diagnostics_injected", {
    diagnostics_chars: formatNewDiagnosticsAttachment(e).length,
    diagnostic_count: e.reduce((r, s) => r + s.diagnostics.length, 0),
    file_count: e.length,
    source: fromEnum(n),
  });
}
/**
 * 工具列表含编辑类工具（诊断附件前提）。
 */
//@ chunk-e6aww6q8.js:3368060-3368126 layout
function hasFileEditTools(e) {
  return e.some((n) => SHELL_TOOL_NAMES_2.some((r) => toolMatchesName(n, r))) || Zar(e);
}
/**
 * IDE MCP 新诊断 → diagnostics 附件（isNew）。
 */
//@ chunk-e6aww6q8.js:3368126-3368301 fingerprint = getDiagnosticAttachments (0.782)
async function getDiagnosticAttachments(e, n) {
  if (!hasFileEditTools(e)) return [];
  let newDiagnostics = await Q2e.of(n).getNewDiagnostics();
  if (newDiagnostics.length === 0) return [];
  return (
    logDiagnosticsInjected(newDiagnostics, "ide-mcp"),
    [{ type: "diagnostics", files: newDiagnostics, isNew: !0 }]
  );
}
/**
 * LSP 待发诊断 → diagnostics 附件。
 */
//@ chunk-e6aww6q8.js:3368301-3368866 fingerprint = getLSPDiagnosticAttachments (0.958)
async function getLSPDiagnosticAttachments(e, n) {
  if (!hasFileEditTools(e)) return [];
  logForDebugging("LSP Diagnostics: getLSPDiagnosticAttachments called");
  try {
    let r = checkForLSPDiagnostics(n);
    if (r.length === 0) return [];
    logForDebugging(`LSP Diagnostics: Found ${r.length} pending diagnostic set(s)`);
    let attachments = r.map(
      ({ files: files }) => (
        logDiagnosticsInjected(files, "lsp"),
        { type: "diagnostics", files: files, isNew: !0 }
      ),
    );
    if (r.length > 0)
      (clearAllLSPDiagnostics(n),
        logForDebugging(`LSP Diagnostics: Cleared ${r.length} delivered diagnostic(s) from registry`));
    return (
      logForDebugging(`LSP Diagnostics: Returning ${attachments.length} diagnostic attachment(s)`),
      attachments
    );
  } catch (error) {
    let err = toError(error);
    return (logError(Error(`Failed to get LSP diagnostic attachments: ${err.message}`)), []);
  }
}
/**
 * getAttachmentMessages：调用 getAttachments，记 tengu_attachments（类型与 token 估算），逐个包装成 attachment 消息产出；记录本轮附件耗时。
 */
//@ chunk-e6aww6q8.js:3368866-3369068 fingerprint = getAttachmentMessages (0.686)
async function* getAttachmentMessages(e, n, r, s, h, y, S, w) {
  let L = new AttachmentTimingProfile(),
    G = await sdn(L, () => getAttachments(e, n, r, s, y, S, w));
  if (G.length > 0) {
    logEvent("tengu_attachments", buildAttachmentsEventPayload(G, S));
    for (let attachment of G) yield createAttachmentMessage_2(attachment, h);
  }
  let finish = L.finish();
  if (!n.agentId) mdn(finish);
}
/**
 * tengu_attachments 事件字段：附件类型、token 估算、技能列表是否完整、querySource。
 */
//@ chunk-e6aww6q8.js:3369068-3369320 layout
function buildAttachmentsEventPayload(e, n) {
  let found = e.find((h) => h.type === "skill_listing"),
    s;
  try {
    s = e.map((h) => fromNumber(roughTokenCountEstimationForObject(h)));
  } catch (error) {
    logError(error);
  }
  return {
    attachment_types: e.map((h) => fromEnum(h.type)),
    attachment_token_estimates: s,
    ...(found && { skill_listing_is_full: found.isInitial }),
    ...(n && { query_source: agentTypeForTelemetry(n) }),
  };
}
/**
 * PDF 超过页数/大小阈值或模型按页读取时，返回 pdf_reference（只给引用，不内联内容）。
 */
//@ chunk-e6aww6q8.js:3369320-3370101 fingerprint = tryGetPDFReference (0.732)
async function tryGetPDFReference(e, n, r) {
  let ext = parse_10(e).ext.toLowerCase();
  if (!CFe(ext)) return null;
  try {
    let [h, y] = await Promise.all([r ?? getFsImplementation().stat(e), getPdfPageCount(r?.ioPath ?? e, r)]),
      ceil = Math.ceil(h.size / 102400),
      w =
        y.pageCount !== null
          ? y.pageCount > mut
          : ceil > mut || (await isUncountedPDFOverWholeReadCap(h.size, y.pdfinfoFailure)),
      L = !$Yt(n),
      effectivePageCount = !w && L;
    if (w || effectivePageCount)
      return (
        logEvent("tengu_pdf_reference_attachment", {
          pageCount: y.pageCount ?? ceil,
          fileSize: h.size,
          hadPdfinfo: y.pageCount !== null,
          ...(effectivePageCount && { wholeRefusedByModel: effectivePageCount }),
          ...(L && { modelReadsByPage: L }),
          ...(y.pageCount === null && {
            pdfinfoFailure: fromEnum(y.pdfinfoFailure.reason),
            ...(y.pdfinfoFailure.reason === "nonzero_exit" && { pdfinfoExitCode: y.pdfinfoFailure.exitCode }),
          }),
        }),
        {
          type: "pdf_reference",
          filename: e,
          pageCount: y.pageCount,
          fileSize: h.size,
          displayPath: relative_31(getCwd(), e),
          ...(effectivePageCount && { wholeRefusedByModel: effectivePageCount }),
          ...(L && { modelReadsByPage: L }),
        }
      );
  } catch {}
  return null;
}
/**
 * 生成单个文件的附件：权限检查后按类型产出 text/image/notebook/pdf/pdf_reference/compact_file_reference/already_read_file 等，支持 offset/limit。
 */
//@ chunk-e6aww6q8.js:3370101-3373785 fingerprint = generateFileAttachment (0.627)
async function generateFileAttachment(
  filename,
  toolUseContext,
  successEventName,
  errorEventName,
  mode,
  options,
) {
  let { offset: offset, limit: limit } = options ?? {};
  if (kW(filename, getToolPermissionContext(toolUseContext))) return null;
  let isReadRestricted = Q_(getToolPermissionContext(toolUseContext)),
    landingPaths = !isReadRestricted
      ? [filename]
      : (options?.landing ??
        (await Mq(
          filename,
          { context: getToolPermissionContext(toolUseContext), isHeldOutside: isRestrictedReadBlocked },
          toolUseContext.abortController.signal,
        )));
  if (landingPaths === void 0) return null;
  if (
    isReadRestricted &&
    options?.landing !== void 0 &&
    C_e(options.landing, {
      context: getToolPermissionContext(toolUseContext),
      isHeldOutside: isRestrictedReadBlocked,
    })
  )
    return null;
  let q = landingPaths;
  if (mode === "at-mention" && CFe(parse_10(filename).ext) && isInboundFileArriving(filename))
    return (
      logEvent("tengu_pdf_reference_attachment", { stillArriving: !0 }),
      logEvent(successEventName, {}),
      logAtMention({ mentionType: "file", success: !0 }),
      {
        type: "pdf_reference",
        filename: filename,
        displayPath: relative_31(getCwd(), filename),
        stillArriving: !0,
      }
    );
  if (
    !isReadRestricted &&
    mode === "at-mention" &&
    !(await QSr(filename, getDefaultFileReadingLimits().maxSizeBytes))
  ) {
    let ext = parse_10(filename).ext.toLowerCase();
    if (!CFe(ext))
      try {
        let stats = await getFsImplementation().stat(filename);
        return (
          logEvent("tengu_attachment_file_too_large", { size_bytes: stats.size, mode: fromEnum(mode) }),
          options?.onTooLarge?.(stats.size),
          null
        );
      } catch {}
  }
  if (!isReadRestricted && mode === "at-mention") {
    let we = await tryGetPDFReference(filename, toolUseContext.options.mainLoopModel);
    if (we) return (logEvent(successEventName, {}), logAtMention({ mentionType: "file", success: !0 }), we);
  }
  let Z;
  if (isReadRestricted && mode === "at-mention" && options?.sizeProbe !== "none") {
    let we = await readPinnedFile(
      filename,
      q,
      toolUseContext.abortController.signal,
    )(async (Ee, Ae) => ({
      size: Number(Ae.size),
      modified: Number(Ae.mtimeMs),
      pdfRef: await tryGetPDFReference(filename, toolUseContext.options.mainLoopModel, {
        ioPath: Ee.ioPath,
        size: Number(Ae.size),
        handle: Ee.handle,
        signal: toolUseContext.abortController.signal,
      }),
    }));
    if (
      ((Z = we?.modified),
      we !== void 0 &&
        we.size > getDefaultFileReadingLimits().maxSizeBytes &&
        !CFe(parse_10(filename).ext.toLowerCase()))
    )
      return (
        logEvent("tengu_attachment_file_too_large", { size_bytes: we.size, mode: fromEnum(mode) }),
        options?.onTooLarge?.(we.size),
        null
      );
    if (we?.pdfRef)
      return (logEvent(successEventName, {}), logAtMention({ mentionType: "file", success: !0 }), we.pdfRef);
  }
  let existingFileState = toolUseContext.readFileState.get(filename),
    ke =
      existingFileState !== void 0 &&
      mode === "at-mention" &&
      hasClearedToolResultsAfterIdle(
        toolUseContext.messages,
        toolUseContext.options.mainLoopModel,
        new Date().toISOString(),
        toolUseContext.session,
      );
  if (existingFileState && mode === "at-mention") {
    let we =
      Gie(existingFileState) &&
      (existingFileState.content !== "" || (existingFileState.contentLength ?? 0) === 0) &&
      !ke;
    try {
      if (
        we &&
        (isReadRestricted ? Z : await getFileModificationTimeAsync(filename)) === existingFileState.timestamp
      ) {
        if ((logEvent(successEventName, {}), mode === "at-mention"))
          logAtMention({ mentionType: "file", success: !0 });
        return {
          type: "already_read_file",
          filename: filename,
          displayPath: relative_31(getCwd(), filename),
          content: {
            type: "text",
            file: {
              filePath: filename,
              content: existingFileState.content,
              numLines:
                countCharInString(
                  existingFileState.content,
                  `
`,
                ) + 1,
              startLine: offset ?? 1,
              totalLines:
                countCharInString(
                  existingFileState.content,
                  `
`,
                ) + 1,
            },
          },
        };
      }
    } catch {}
  }
  try {
    let fileInput = { file_path: filename, offset: offset, limit: limit };
    async function readTruncatedFile() {
      if (mode === "compact")
        return {
          type: "compact_file_reference",
          filename: filename,
          displayPath: relative_31(getCwd(), filename),
        };
      if (kW(filename, getToolPermissionContext(toolUseContext))) return null;
      try {
        let truncatedInput = { file_path: filename, offset: offset ?? 1, limit: MAX_LINES_TO_READ },
          We = ke ? { ...toolUseContext, dedupUnchangedReads: !1 } : toolUseContext,
          result = await FileReadTool.call(
            truncatedInput,
            isReadRestricted ? await stashAttachedReadPermission(filename, q, We) : We,
          );
        if ((Uv(FileReadTool.name), logEvent(successEventName, {}), mode === "at-mention"))
          logAtMention({ mentionType: "file", success: !0 });
        return {
          type: "file",
          filename: filename,
          content: result.data,
          truncated: !0,
          displayPath: relative_31(getCwd(), filename),
        };
      } catch (error) {
        if (isReadRestricted && error instanceof SymlinkReadRefusedError) options?.onRefusedAtOpen?.();
        if ((logEvent(errorEventName, {}), mode === "at-mention"))
          logAtMention({ mentionType: "file", success: !1 });
        return null;
      }
    }
    if (!(await FileReadTool.validateInput(fileInput, toolUseContext)).result) return null;
    let Ie =
      options?.pdfAbortParent !== void 0 && Mge(filename)
        ? createChildAbortController(options.pdfAbortParent)
        : void 0;
    try {
      let Me = ke ? { ...toolUseContext, dedupUnchangedReads: !1 } : toolUseContext,
        We = await FileReadTool.call(
          fileInput,
          isReadRestricted ? await stashAttachedReadPermission(filename, q, Me) : Me,
          void 0,
          void 0,
          void 0,
          { pdfRenderSignal: Ie?.signal },
        );
      if ((Uv(FileReadTool.name), We.data.type === "file_unchanged")) {
        if ((logEvent(successEventName, {}), mode === "at-mention"))
          logAtMention({ mentionType: "file", success: !0 });
        return {
          type: "already_read_file",
          filename: filename,
          displayPath: relative_31(getCwd(), filename),
          content: We.data,
        };
      }
      if (We.data.type === "text" && We.data.file.truncatedByTokenCap === !0)
        return await readTruncatedFile();
      if ((logEvent(successEventName, {}), mode === "at-mention"))
        logAtMention({ mentionType: "file", success: !0 });
      return {
        type: "file",
        filename: filename,
        content: We.data.type === "pdf" ? { ...We.data, file: { ...We.data.file, base64: "" } } : We.data,
        displayPath: relative_31(getCwd(), filename),
      };
    } catch (error) {
      if (
        error instanceof MaxFileReadTokenExceededError ||
        error instanceof FileTooLargeError ||
        error instanceof SelectedRangeTooLargeError
      )
        return await readTruncatedFile();
      if (Ie?.signal.aborted && error instanceof AbortError_2) return null;
      throw error;
    } finally {
      Ie?.abort();
    }
  } catch (error) {
    if (isReadRestricted && error instanceof SymlinkReadRefusedError) options?.onRefusedAtOpen?.();
    if ((logEvent(errorEventName, {}), mode === "at-mention"))
      logAtMention({ mentionType: "file", success: !1 });
    return null;
  }
}
/**
 * 统计距上次 TodoWrite 与上次 todo_reminder 的助手轮数。
 */
//@ chunk-e6aww6q8.js:3374007-3374459 fingerprint = getTodoReminderTurnCounts (1)
function getTodoReminderTurnCounts(messages) {
  let lastTodoWriteIndex = -1,
    lastReminderIndex = -1,
    s = 0,
    h = 0;
  for (let y = messages.length - 1; y >= 0; y--) {
    let message = messages[y];
    if (message?.type === "assistant") {
      if (isThinkingOnlyMessage(message)) continue;
      if (
        lastTodoWriteIndex === -1 &&
        "message" in message &&
        Array.isArray(message.message?.content) &&
        message.message.content.some((block) => block.type === "tool_use" && block.name === "TodoWrite")
      )
        lastTodoWriteIndex = y;
      if (lastTodoWriteIndex === -1) s++;
      if (lastReminderIndex === -1) h++;
    } else if (
      lastReminderIndex === -1 &&
      message?.type === "attachment" &&
      message.attachment.type === "todo_reminder"
    )
      lastReminderIndex = y;
    if (lastTodoWriteIndex !== -1 && lastReminderIndex !== -1) break;
  }
  return { turnsSinceLastTodoWrite: s, turnsSinceLastReminder: h };
}
/**
 * 有 TodoWrite 工具、提醒模式非 off、距上次写与上次提醒都 ≥10 轮时产出 todo_reminder（当前待办内容）。
 */
//@ chunk-e6aww6q8.js:3374608-3375014 fingerprint = getTodoReminderAttachments (0.943)
async function getTodoReminderAttachments(messages, toolUseContext) {
  if (!toolUseContext.options.tools.some((tool) => toolMatchesName(tool, TODO_WRITE_TOOL_NAME))) return [];
  if (isBriefToolActive(toolUseContext.options.tools)) return [];
  if (!messages || messages.length === 0) return [];
  if (getTodoReminderMode() === "off") return [];
  let { turnsSinceLastTodoWrite: turnsSinceLastTodoWrite, turnsSinceLastReminder: turnsSinceLastReminder } =
    getTodoReminderTurnCounts(messages);
  if (
    turnsSinceLastTodoWrite >= TODO_REMINDER_CONFIG.TURNS_SINCE_WRITE &&
    turnsSinceLastReminder >= TODO_REMINDER_CONFIG.TURNS_BETWEEN_REMINDERS
  ) {
    let h = toolUseContext.agentId ?? getSessionId(),
      S = toolUseContext.getAppState().todos[h] ?? [];
    return [{ type: "todo_reminder", content: S, itemCount: S.length }];
  }
  return [];
}
/**
 * 统计距上次任务管理工具调用与上次 task_reminder 的助手轮数。
 */
//@ chunk-e6aww6q8.js:3375014-3375477 fingerprint = getTaskReminderTurnCounts (1)
function getTaskReminderTurnCounts(messages) {
  let lastTaskManagementIndex = -1,
    lastReminderIndex = -1,
    s = 0,
    h = 0;
  for (let y = messages.length - 1; y >= 0; y--) {
    let message = messages[y];
    if (message?.type === "assistant") {
      if (isThinkingOnlyMessage(message)) continue;
      if (
        lastTaskManagementIndex === -1 &&
        "message" in message &&
        Array.isArray(message.message?.content) &&
        message.message.content.some(
          (block) =>
            block.type === "tool_use" &&
            (block.name === TASK_CREATE_TOOL_NAME || block.name === TASK_UPDATE_TOOL_NAME),
        )
      )
        lastTaskManagementIndex = y;
      if (lastTaskManagementIndex === -1) s++;
      if (lastReminderIndex === -1) h++;
    } else if (
      lastReminderIndex === -1 &&
      message?.type === "attachment" &&
      message.attachment.type === "task_reminder"
    )
      lastReminderIndex = y;
    if (lastTaskManagementIndex !== -1 && lastReminderIndex !== -1) break;
  }
  return { turnsSinceLastTaskManagement: s, turnsSinceLastReminder: h };
}
/**
 * 任务工具（新任务系统）版提醒 → task_reminder，条件同 todo。
 */
//@ chunk-e6aww6q8.js:3375477-3375851 fingerprint = getTaskReminderAttachments (0.791)
async function getTaskReminderAttachments(e, n, r) {
  if (!isTaskToolsEnabled()) return [];
  if (!n.some((y) => toolMatchesName(y, TASK_UPDATE_TOOL_NAME))) return [];
  if (isBriefToolActive(n)) return [];
  if (!e || e.length === 0) return [];
  if (getTodoReminderMode() === "off") return [];
  let {
    turnsSinceLastTaskManagement: turnsSinceLastTaskManagement,
    turnsSinceLastReminder: turnsSinceLastReminder,
  } = getTaskReminderTurnCounts(e);
  if (
    turnsSinceLastTaskManagement >= TODO_REMINDER_CONFIG.TURNS_SINCE_WRITE &&
    turnsSinceLastReminder >= TODO_REMINDER_CONFIG.TURNS_BETWEEN_REMINDERS
  ) {
    let y = await listTasks(getTaskListId(), r);
    return [{ type: "task_reminder", content: y, itemCount: y.length }];
  }
  return [];
}
/**
 * 统计距上次 ToolSearch 调用与上次 tool_search_usage_reminder 的轮数。
 */
//@ chunk-e6aww6q8.js:3375851-3376308 layout
function getToolSearchReminderTurnCounts(e) {
  let n = -1,
    r = -1,
    s = 0,
    h = 0;
  for (let y = e.length - 1; y >= 0; y--) {
    let S = e[y];
    if (S?.type === "assistant") {
      if (isThinkingOnlyMessage(S)) continue;
      if (
        n === -1 &&
        "message" in S &&
        Array.isArray(S.message?.content) &&
        S.message.content.some((w) => w.type === "tool_use" && w.name === TOOL_SEARCH_TOOL_NAME)
      )
        n = y;
      if (n === -1) s++;
      if (r === -1) h++;
    } else if (r === -1 && S?.type === "attachment" && S.attachment.type === "tool_search_usage_reminder")
      r = y;
    if (n !== -1 && r !== -1) break;
  }
  return { turnsSinceLastToolSearch: s, turnsSinceLastReminder: h };
}
/**
 * 实验配置开启时每 N 轮提醒使用 ToolSearch（tool_search_usage_reminder），不满足条件记 tengu_juniper_shoal_shown。
 */
//@ chunk-e6aww6q8.js:3376308-3377501 layout
async function getToolSearchUsageReminderAttachment(e, n, r, s) {
  let h = Nas();
  if (h === null) return [];
  if (!e || e.length === 0) return [];
  let { turnsSinceLastToolSearch: turnsSinceLastToolSearch, turnsSinceLastReminder: turnsSinceLastReminder } =
    getToolSearchReminderTurnCounts(e);
  if (turnsSinceLastToolSearch < h.everyNTurns || turnsSinceLastReminder < h.everyNTurns) return [];
  let w = (Z) => {
    if (turnsSinceLastReminder % h.everyNTurns === 0)
      logEvent("tengu_juniper_shoal_shown", {
        delivered: !1,
        skipReason: fromEnum(Z),
        everyNTurns: h.everyNTurns,
        turnsSinceLastReminder: turnsSinceLastReminder,
      });
    return [];
  };
  if (getToolSearchMode() !== "tst") return w("mode_not_tst");
  if (!modelSupportsToolReference(n.options.mainLoopModel)) return w("model_unsupported");
  if (isVertexModelWithoutToolSearch(getCanonicalName(n.options.mainLoopModel)))
    return w("vertex_model_unsupported");
  if (
    !isToolSearchToolAvailable(n.options.tools) ||
    toolSearchRejectedOn(n.stickyBetas ?? getStickyBetas(), n.options.mainLoopModel)
  )
    return w("toolsearch_unavailable");
  let L = extractDiscoveredToolNames(e, {
      surfaced: getSurfacedToolNames(n.stickyBetas ?? getStickyBetas()),
    }),
    sorted = n.options.tools
      .filter((tool) => isDeferredToolInConversation(tool, s, n.options.tools) && !L.has(tool.name))
      .map((Z) => Z.name)
      .sort();
  if (sorted.length === 0) return w("no_undiscovered_tools");
  let q = !1;
  try {
    q = await r();
  } catch {
    q = !1;
  }
  if (q) return w("task_reminder_same_turn");
  return (
    logEvent("tengu_juniper_shoal_shown", {
      delivered: !0,
      undiscoveredCount: sorted.length,
      listedCount: Math.min(sorted.length, h.maxNames),
      everyNTurns: h.everyNTurns,
      maxNames: h.maxNames,
    }),
    [
      {
        type: "tool_search_usage_reminder",
        undiscoveredToolNames: sorted.slice(0, h.maxNames),
        undiscoveredCount: sorted.length,
      },
    ]
  );
}
/**
 * 后台任务状态变化 → task_status 附件（状态、描述、增量摘要、输出文件路径）。
 */
//@ chunk-e6aww6q8.js:3377501-3377849 fingerprint = getUnifiedTaskAttachments (0.833)
async function getUnifiedTaskAttachments(e, n) {
  let {
    attachments: attachments,
    updatedTaskOffsets: updatedTaskOffsets,
    evictedTaskIds: evictedTaskIds,
  } = await generateTaskAttachments(n.all());
  n.applyOffsetsAndEvict(updatedTaskOffsets, evictedTaskIds);
  let y = hasSendMessageTool(e);
  return attachments.map((taskAttachment) => ({
    type: "task_status",
    taskId: taskAttachment.taskId,
    taskType: taskAttachment.taskType,
    status: taskAttachment.status,
    description: taskAttachment.description,
    deltaSummary: taskAttachment.deltaSummary,
    outputFilePath: HM(e) ? getTaskOutputPath(taskAttachment.taskId) : void 0,
    canContinueAgent: y,
  }));
}
/**
 * 未保存同步与待处理的记忆更新 → memory_update 附件，并清空 pendingMemoryUpdates。
 */
//@ chunk-e6aww6q8.js:3377849-3378450 layout
function getMemoryUpdateAttachments(e, n = []) {
  let mapped = QKo.of(e.session.host)
      .drain()
      .map((G) => ({
        type: "memory_update",
        source: "sync_unsaved",
        summary: G,
        paths: [],
        inContextPaths: [],
      })),
    pendingMemoryUpdates = e.getAppState().pendingMemoryUpdates;
  if (pendingMemoryUpdates.length === 0) return mapped;
  let h =
      isAutoMemoryEnabled() && process.env.CLAUDE_COWORK_MEMORY_INDEX_CONTENT !== ""
        ? getAutoMemEntrypoint()
        : null,
    y = Us(n),
    S = latestInstructionFiles(y),
    w = collectNestedMemoryContents(y),
    L = (G) => G === h || e.readFileState.has(G) || S?.has(G) === !0 || w.has(G);
  return (
    e.setAppState((G) => (G.pendingMemoryUpdates.length === 0 ? G : { ...G, pendingMemoryUpdates: [] })),
    mapped.concat(
      pendingMemoryUpdates.map((G) => ({
        type: "memory_update",
        source: G.source,
        summary: G.summary,
        paths: G.paths,
        inContextPaths: G.paths.filter(L),
      })),
    )
  );
}
/**
 * 已完成的异步钩子响应 → async_hook_response 系列附件（SessionStart 重复输出跳过）。
 */
//@ chunk-e6aww6q8.js:3378450-3379394 fingerprint = getAsyncHookResponseAttachments (0.774)
async function getAsyncHookResponseAttachments(e) {
  let responses = await checkForNewAsyncHookResponses();
  if (responses.length === 0) return [];
  logForDebugging(`Hooks: getAsyncHookResponseAttachments found ${responses.length} responses`);
  let r = responses.some((h) => h.hookEvent === "SessionStart")
      ? Us(e).flatMap((h) => (h?.type === "attachment" ? [h.attachment] : []))
      : [],
    s = [];
  for (let {
    processId: processId,
    response: response,
    hookName: hookName,
    hookEvent: hookEvent,
    toolName: toolName,
    pluginId: pluginId,
    command: command,
    stdout: stdout,
    stderr: stderr,
    exitCode: exitCode,
  } of responses) {
    if (
      (emitHookMetrics(response.metrics, pluginId, hookEvent),
      hookEvent === "SessionStart" &&
        isAsyncHookResponseDuplicate({ response: response, command: command, pluginId: pluginId }, r))
    ) {
      logForDebugging(
        `Hooks: Not adding the output of ${processId} (${hookName}) to the conversation: Claude already sees the same text from an earlier SessionStart run`,
      );
      continue;
    }
    logForDebugging(`Hooks: Creating attachment for ${processId} (${hookName}): ${jsonStringify(response)}`);
    let we = {
      type: "async_hook_response",
      processId: processId,
      hookName: hookName,
      hookEvent: hookEvent,
      toolName: toolName,
      ...(hookEvent === "SessionStart" && { command: command, pluginId: pluginId }),
      response: hUt(response),
      stdout: stdout,
      stderr: stderr,
      exitCode: exitCode,
    };
    (s.push(we), r.push(we));
  }
  return (logForDebugging(`Hooks: getAsyncHookResponseAttachments found ${s.length} attachments`), s);
}
/**
 * 把已附加的非结构化邮箱消息标记为已读（失败则下轮再附加）。旧版名 getTeammateMailboxAttachments 不准确。
 */
//@ chunk-e6aww6q8.js:3379394-3379803 file-local
async function markMailboxMessagesRead(e, n, r, s) {
  if (r.length === 0) return;
  let pendingIds = new Set(r.map(messageIdentityKey)),
    y = await markMessagesAsReadByPredicate(e, (S) => pendingIds.has(messageIdentityKey(S)), n, s);
  logForDebugging(
    y
      ? `[MailboxBridge] marked ${r.length} non-structured message(s) as read for agent="${e}" team="${n || "default"}"`
      : `[MailboxBridge] could not mark ${r.length} non-structured message(s) read for agent="${e}" team="${n || "default"}"; they will be attached again next turn`,
    { level: y ? "debug" : "warn" },
  );
}
/**
 * 316 里恒返回空（邮箱消息改走别处）。
 */
//@ chunk-e6aww6q8.js:3379803-3379852 layout
async function getTeammateMailboxAttachments(e) {
  if (!isAgentSwarmsEnabled()) return [];
  return [];
}
/**
 * 代理团队成员首轮产出 team_context（团队名、配置与任务列表路径、是否有任务工具）。
 */
//@ chunk-e6aww6q8.js:3379852-3380299 fingerprint = getTeamContextAttachment (0.901)
function getTeamContextAttachment(messages) {
  let teamName = getTeamName(),
    agentId = getAgentId(),
    agentName = getAgentName();
  if (!teamName || !agentId) return [];
  if (messages.some((q) => q.type === "assistant")) return [];
  let y,
    configDir = getTeammateContext();
  if (configDir) {
    for (let q of messages)
      if (q.type === "attachment" && q.attachment.type === "team_context") {
        y = q.attachment.hasTaskListTools;
        break;
      }
    y ??= configDir.hasTaskListTools;
  }
  let w = getClaudeConfigDir(),
    teamConfigPath = `${w}/teams/${teamName}/config.json`,
    taskListPath = `${w}/tasks/${getTaskListId()}/`;
  return [
    {
      type: "team_context",
      agentId: agentId,
      agentName: agentName || agentId,
      teamName: teamName,
      teamConfigPath: teamConfigPath,
      taskListPath: taskListPath,
      hasTaskListTools: y,
    },
  ];
}
/**
 * CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT 时产出 token_usage（已用/总量/剩余）。
 */
//@ chunk-e6aww6q8.js:3380299-3380461 fingerprint = getTokenUsageAttachment (1)
function getTokenUsageAttachment(e, n, r) {
  if (!env.CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT) return [];
  let s = effectiveContextWindow(getModelContextInfo(n), r),
    contextWindow = tokenCountFromLastAPIResponse(e);
  return [{ type: "token_usage", used: contextWindow, total: s, remaining: s - contextWindow }];
}
/**
 * total_tokens_reminder：按模式（countdown/padded-countdown/fixed/infinite）输出 "<total_tokens>N tokens left</total_tokens>"。
 */
//@ chunk-e6aww6q8.js:3380461-3380786 layout
function getTotalTokensReminderAttachment(e, n, r, s, h, y, S) {
  let w = getTotalTokensReminderMode(r, y);
  if (w === "off") return [];
  let L = s ?? "main",
    G = tokenCountFromLastAPIResponse(n),
    of = pXn.of(e);
  if (h) of.reanchorTaskBudget(L, G);
  if (y !== void 0 && S) of.excludeStartContext(L, () => getMinInputTokensSinceLastCompact(n));
  let Z =
    w === "countdown"
      ? getContextWindow(r, getSdkBetas()) - G
      : w === "padded-countdown"
        ? of.remaining(L, G, y ?? getTotalTokensReminderBudget())
        : 0;
  return [{ type: "total_tokens_reminder", text: formatTotalTokensTag(w, Z) }];
}
/**
 * 最近一次压缩边界之后各回答 usage 的输入 token（首个与最后一个中较小者）。
 */
//@ chunk-e6aww6q8.js:3380786-3381047 layout = getTokenCountFromUsage (0.754)
function getMinInputTokensSinceLastCompact(usage) {
  let n = usage.findLastIndex(isForkBoilerplateMessage) + 1,
    r,
    s;
  for (let h = n; h < usage.length; h++) {
    let y = getTokenUsage(usage[h]);
    if (!y) continue;
    let S = getTokenCountFromUsage_5(y),
      w = S.input_tokens + S.cache_creation_input_tokens + S.cache_read_input_tokens;
    if (w > 0) ((r ??= w), (s = w));
  }
  return r === void 0 || s === void 0 ? void 0 : Math.min(r, s);
}
/**
 * 设置了 --max-budget-usd 时产出 budget_usd（已用/总额/剩余美元）。
 */
//@ chunk-e6aww6q8.js:3381047-3381159 fingerprint = getMaxBudgetUsdAttachment (1)
function getMaxBudgetUsdAttachment(maxBudgetUsd) {
  if (maxBudgetUsd === void 0) return [];
  let usedCost = ACe(),
    remainingBudget = maxBudgetUsd - usedCost;
  return [{ type: "budget_usd", used: usedCost, total: maxBudgetUsd, remaining: remainingBudget }];
}
/**
 * 把一个 Attachment 包成内部 attachment 消息 {type:"attachment", uuid, timestamp, attachment}（jlr 规整附件字段）。
 */
//@ chunk-bnwcqde4.js:4394-4502 fingerprint = createAttachmentMessage (1)
function createAttachmentMessage(t, o) {
  return {
    type: "attachment",
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
    attachment: buildGoalSentinelAttachment(t, o),
  };
}

export {
  memoryHeader,
  mergeNameOnlyAnnouncements,
  getDeferredToolsDeltaAttachments,
  getDeclaredToolSource,
  buildDeferredToolsLatchContextFrom,
  getSkillListingAttachmentsLazy,
  getQueuedNotificationMode,
  getQueuedCommandAttachments,
  isAdditionalDirWithoutNestedMemory,
  startRelevantMemoryPrefetch,
  shouldBlockOnMemoryPrefetch,
  awaitMemoryPrefetch,
  filterDuplicateMemoryAttachments,
  isInlineNotificationMode,
  getAttachmentMessages,
  shouldIncludeMemoryFile,
  getRevokedDeferredToolNames,
  buildDeferredToolsLatchContext,
  buildToolRevocationClassifier,
  getAgentListingDeltaAttachment,
  areAttachmentsDisabled,
  getMcpInstructionsDeltaAttachment,
  getMcpDroppedToolsAttachment,
  generateFileAttachment,
  buildPlanModeAttachment,
  createAttachmentMessage,
  getMcpServerInstructionBlocks,
  maybe,
  getChangedFiles,
  buildHeldOutsideTracker,
  iterateMemoryFilesForPath,
};
