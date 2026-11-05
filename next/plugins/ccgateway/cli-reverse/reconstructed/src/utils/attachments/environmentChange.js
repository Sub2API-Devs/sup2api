/**
 * utils/attachments/environmentChange.ts
 *
 * 2.1.316 新增：环境变化附件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: placement 9
 */
import { isRemoteCowork } from "../entrypointKinds.js";
import { env } from "../env.js";
import { shouldPrefetchArtifactOpening_2 } from "./artifactOpeningPrefetch.js";
import { simpleModeEnv } from "../model/promptBundles.js";
import {
  collectEnvironmentFacts,
  summarizeEnvironmentHistory,
  remoteEnvironmentFacts,
  missingEnvFields,
  buildEnvironmentInfo,
} from "../contextAttachments/environment.js";
import { getCwdOrNull } from "../cwd.js";
import { getToolPermissionContext } from "../permissions/toolPermissionContext.js";
import { messagesSinceCompactBoundary } from "../../services/projects/threadRows.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { getGitEmail } from "../user.js";
import { maybeRemoveApiKeyFromMacOSKeychainThrows } from "../authPortable.js";
import {
  getLastModelIdentity,
  getLastModelAttachment,
  outputStyleAttachmentSchema,
  languagePreferenceSchema,
} from "../../constants/prompts.js";
import { getOutputStyleConfig, hasCustomOutputStyle, DEFAULT_2 } from "../../constants/outputStyles.js";
import { getInitialSettings } from "../settings/settings.js";
import { isSkillOverridesUnread, proactivityAttachments } from "../proactivity.js";
import {
  changedSettingValue,
  lastOutputStyleAttachment,
  isSameSettingValue,
  lastLanguageAttachment,
} from "../contextAttachments/outputStyleLanguage.js";
import { getRuntimeModelSwitchAnnouncements } from "../model/model.js";
import { maybe } from "../attachments.js";

//@ chunk-5xgkngpb.js:3415550-3415642 placement
/**
 * 远端协作且未禁用时，是否预取 artifact 打开。
 */
function shouldPrefetchArtifactOpening() {
  if (!isRemoteCowork() || env.CLAUDE_CODE_ARTIFACT_OPENING_PREFETCH === false) return false;
  return shouldPrefetchArtifactOpening_2();
}
//@ chunk-5xgkngpb.js:3417473-3417535 placement
/**
 * 是否应发出环境变化附件（非 fork、非隔离上下文）。
 */
function shouldEmitEnvironmentChanges(options) {
  return !simpleModeEnv() && !options.bareFork && !options.isolatedContext;
}
//@ chunk-5xgkngpb.js:3417535-3417700 placement
function shouldSendEnvironmentAttachments(toolUseContext) {
  if (!shouldEmitEnvironmentChanges(toolUseContext.options)) return false;
  let { agentContext } = toolUseContext;
  switch (agentContext.agentType) {
    case "main":
    case "teammate":
      return true;
    case "subagent":
      return agentContext.isMainSession === true;
  }
}
//@ chunk-5xgkngpb.js:3417700-3417757 placement
/**
 * 内置 gh 可用性变化的附件字段。
 */
var BUILTIN_GH_CHANGE = [
  {
    field: "githubCli",
  },
];
var AGENT_PROXY_CHANGE = [
  {
    field: "agentProxy",
  },
];
//@ chunk-5xgkngpb.js:3417757-3418633 placement
/**
 * 检测工作目录出现或消失，生成环境变化附件。
 */
async function detectEnvironmentDirectoryChange(toolUseContext, messages) {
  if (!shouldEmitEnvironmentChanges(toolUseContext.options)) return [];
  let environmentFacts = await collectEnvironmentFacts({
    cwd: getCwdOrNull(),
    additionalWorkingDirectories: Array.from(
      getToolPermissionContext(toolUseContext).additionalWorkingDirectories.keys(),
    ),
  });
  let { latest, newestReadable, hasWholeBlock, standing } = summarizeEnvironmentHistory(
    messagesSinceCompactBoundary(messages ?? []),
  );
  let currentSnapshot = remoteEnvironmentFacts(latest) ?? environmentFacts;
  let hasWorkingDir = currentSnapshot.workingDirectory !== undefined;
  let goneDirectory = hasWorkingDir ? undefined : standing;
  let newestReadableLacksDir = newestReadable !== undefined && newestReadable.workingDirectory === undefined;
  let directoryAppeared = hasWorkingDir && newestReadableLacksDir;
  if (goneDirectory || directoryAppeared)
    logEvent("tengu_environment_directory_change", {
      change: fromEnum(goneDirectory ? "gone" : "appeared"),
      resent: goneDirectory !== undefined && newestReadableLacksDir,
    });
  let referenceFacts = goneDirectory ?? (getGitEmail(currentSnapshot) ? standing : undefined);
  let ghChanged = newestReadable?.githubCli !== undefined && currentSnapshot.githubCli === undefined;
  let changes = [
    ...(referenceFacts ? missingEnvFields(referenceFacts, currentSnapshot) : []),
    ...(ghChanged ? BUILTIN_GH_CHANGE : []),
    ...(getGitEmail(currentSnapshot) && newestReadable?.agentProxy && !currentSnapshot.agentProxy
      ? AGENT_PROXY_CHANGE
      : []),
  ];
  if (
    !latest ||
    !hasWholeBlock ||
    !maybeRemoveApiKeyFromMacOSKeychainThrows(latest, currentSnapshot) ||
    directoryAppeared
  )
    return [
      {
        type: "environment",
        snapshot: currentSnapshot,
      },
      ...(changes.length > 0
        ? [
            {
              type: "environment",
              snapshot: currentSnapshot,
              changes,
            },
          ]
        : []),
    ];
  let environmentInfo = buildEnvironmentInfo(latest, currentSnapshot);
  let mergedChanges = [
    ...environmentInfo,
    ...changes.filter((change) => !environmentInfo.some((existing) => existing.field === change.field)),
  ];
  return mergedChanges.length === 0
    ? []
    : [
        {
          type: "environment",
          snapshot: currentSnapshot,
          changes: mergedChanges,
        },
      ];
}
//@ chunk-5xgkngpb.js:3418633-3419484 placement
/**
 * 压缩后重新生成环境附件：有当前快照时按需重发快照及目录/gh/代理变化；否则取最新或最近可读的快照（不保留工作目录时去掉 worktree/git 信息并记录目录变更），保留部分已含完整块时不重复发送。
 */
function getPostCompactEnvironmentAttachments(messages, keptMessages, keepWorkingDirectory) {
  let { latest, newestReadable, standing, mentioned, toldOfBuiltinGh, toldOfAgentProxy } =
    summarizeEnvironmentHistory(messages);
  let currentSnapshot = remoteEnvironmentFacts(latest);
  if (currentSnapshot !== undefined) {
    if (!newestReadable) return [];
    let snapshot = currentSnapshot;
    let changes = [
      ...(mentioned ? missingEnvFields(mentioned, snapshot) : []),
      ...(toldOfBuiltinGh ? BUILTIN_GH_CHANGE : []),
      ...(toldOfAgentProxy && !snapshot.agentProxy ? AGENT_PROXY_CHANGE : []),
    ];
    let keptState = summarizeEnvironmentHistory(keptMessages);
    return [
      ...(keptState.hasWholeBlock &&
      keptState.latest &&
      maybeRemoveApiKeyFromMacOSKeychainThrows(keptState.latest, snapshot)
        ? []
        : [
            {
              type: "environment",
              snapshot,
            },
          ]),
      ...(changes.length > 0
        ? [
            {
              type: "environment",
              snapshot,
              changes,
            },
          ]
        : []),
    ];
  }
  let sourceSnapshot = keepWorkingDirectory ? latest : newestReadable;
  if (!sourceSnapshot) return [];
  let { workingDirectory, scratchpadDirectory, ...restSnapshot } = sourceSnapshot;
  let resentSnapshot = keepWorkingDirectory
    ? sourceSnapshot
    : {
        ...restSnapshot,
        isWorktree: false,
        isGitRepo: false,
      };
  let goneDirectory = keepWorkingDirectory ? undefined : mentioned;
  if (goneDirectory)
    logEvent("tengu_environment_directory_change", {
      change: lit_2("gone"),
      resent: standing === undefined || sourceSnapshot.workingDirectory === undefined,
    });
  let resendBuiltinGh = toldOfBuiltinGh && resentSnapshot.githubCli === undefined;
  let resentChanges = [
    ...(goneDirectory ? missingEnvFields(goneDirectory, resentSnapshot) : []),
    ...(resendBuiltinGh ? BUILTIN_GH_CHANGE : []),
  ];
  return [
    ...(summarizeEnvironmentHistory(keptMessages).hasWholeBlock
      ? []
      : [
          {
            type: "environment",
            snapshot: resentSnapshot,
          },
        ]),
    ...(resentChanges.length > 0
      ? [
          {
            type: "environment",
            snapshot: resentSnapshot,
            changes: resentChanges,
          },
        ]
      : []),
  ];
}
//@ chunk-5xgkngpb.js:3419698-3419764 placement
/**
 * 模型身份变化时返回模型附件（已记录过则不返回）。
 */
function modelAttachmentIfNew(messages, messages_2) {
  if (getLastModelIdentity(messages_2)) return [];
  let lastModelAttachment = getLastModelAttachment(messages);
  return lastModelAttachment ? [lastModelAttachment] : [];
}
//@ chunk-5xgkngpb.js:3419764-3420172 placement
/**
 * 当输出样式或语言偏好相对历史消息中最近一次发送的值发生变化时，生成 output_style_instructions / language 附件。
 */
async function getOutputStyleAndLanguageAttachments(toolUseContext, messages) {
  if (!shouldSendEnvironmentAttachments(toolUseContext)) return [];
  let normalizedMessages = messagesSinceCompactBoundary(messages ?? []);
  let outputStyleConfig = await getOutputStyleConfig();
  let outputStyleValue = outputStyleConfig
    ? {
        name: outputStyleConfig.name,
        prompt: outputStyleConfig.prompt,
      }
    : null;
  let language = getInitialSettings().language || null;
  let styleChange =
    (!outputStyleConfig && (hasCustomOutputStyle() !== DEFAULT_2 || isSkillOverridesUnread())) ||
    !outputStyleAttachmentSchema().safeParse(outputStyleValue).success
      ? undefined
      : changedSettingValue(
          lastOutputStyleAttachment(normalizedMessages),
          outputStyleValue,
          isSameSettingValue,
        );
  let languageChange =
    languagePreferenceSchema().safeParse(language).success && !(language === null && isSkillOverridesUnread())
      ? changedSettingValue(
          lastLanguageAttachment(normalizedMessages),
          language,
          (left, right) => left === right,
        )
      : undefined;
  return [
    ...(styleChange
      ? [
          {
            type: "output_style_instructions",
            style: styleChange.value,
          },
        ]
      : []),
    ...(languageChange
      ? [
          {
            type: "language",
            language: languageChange.value,
          },
        ]
      : []),
  ];
}
//@ chunk-5xgkngpb.js:3420172-3420321 placement
/**
 * 并行生成环境变化相关附件：目录变化、运行时模型切换、输出样式/语言与主动性提示。
 */
async function getEnvironmentChangeAttachments(toolUseContext, messages) {
  return (
    await Promise.all([
      detectEnvironmentDirectoryChange(toolUseContext, messages),
      getRuntimeModelSwitchAnnouncements(toolUseContext, messages),
      getOutputStyleAndLanguageAttachments(toolUseContext, messages),
      !toolUseContext.options.bareFork
        ? maybe("proactivity", () =>
            proactivityAttachments(messagesSinceCompactBoundary(messages ?? []), toolUseContext),
          )
        : [],
    ])
  ).flat();
}
export {
  getEnvironmentChangeAttachments,
  shouldPrefetchArtifactOpening,
  detectEnvironmentDirectoryChange,
  getOutputStyleAndLanguageAttachments,
  shouldEmitEnvironmentChanges,
  getPostCompactEnvironmentAttachments,
  modelAttachmentIfNew,
};
