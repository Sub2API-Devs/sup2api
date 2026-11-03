/**
 * utils/attachments/environmentChange.ts
 *
 * 2.1.316 新增：环境变化附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
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
import { getOutputStyleConfig, hasCustomOutputStyle, DEFAULT } from "../../constants/outputStyles.js";
import { getInitialSettings_2 } from "../settings/settings.js";
import { isSkillOverridesUnread, proactivityAttachments } from "../proactivity.js";
import {
  changedSettingValue,
  lastOutputStyleAttachment,
  isSameSettingValue,
  lastLanguageAttachment,
} from "../contextAttachments/outputStyleLanguage.js";
import { getRuntimeModelSwitchAnnouncements } from "../model/model.js";
import { maybe } from "../attachments.js";

//@ chunk-e6aww6q8.js:3329793-3329885 placement
/**
 * 远端协作且未禁用时，是否预取 artifact 打开。
 */
function shouldPrefetchArtifactOpening() {
  if (!isRemoteCowork() || env.CLAUDE_CODE_ARTIFACT_OPENING_PREFETCH === false) return false;
  return shouldPrefetchArtifactOpening_2();
}
//@ chunk-e6aww6q8.js:3331460-3331522 placement
/**
 * 是否应发出环境变化附件（非 fork、非隔离上下文）。
 */
function shouldEmitEnvironmentChanges(options) {
  return !simpleModeEnv() && !options.bareFork && !options.isolatedContext;
}
//@ chunk-e6aww6q8.js:3331522-3331687 placement
function shouldSendEnvironmentAttachments(e) {
  if (!shouldEmitEnvironmentChanges(e.options)) return false;
  let { agentContext } = e;
  switch (agentContext.agentType) {
    case "main":
    case "teammate":
      return true;
    case "subagent":
      return agentContext.isMainSession === true;
  }
}
//@ chunk-e6aww6q8.js:3331687-3331744 placement
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
//@ chunk-e6aww6q8.js:3331744-3332617 placement
/**
 * 检测工作目录出现或消失，生成环境变化附件。
 */
async function detectEnvironmentDirectoryChange(e, n) {
  if (!shouldEmitEnvironmentChanges(e.options)) return [];
  let environmentFacts = await collectEnvironmentFacts({
    cwd: getCwdOrNull(),
    additionalWorkingDirectories: Array.from(getToolPermissionContext(e).additionalWorkingDirectories.keys()),
  });
  let { latest, newestReadable, hasWholeBlock, standing } = summarizeEnvironmentHistory(
    messagesSinceCompactBoundary(n ?? []),
  );
  let w = remoteEnvironmentFacts(latest) ?? environmentFacts;
  let L = w.workingDirectory !== undefined;
  let G = L ? undefined : standing;
  let q = newestReadable !== undefined && newestReadable.workingDirectory === undefined;
  let Z = L && q;
  if (G || Z)
    logEvent("tengu_environment_directory_change", {
      change: fromEnum(G ? "gone" : "appeared"),
      resent: G !== undefined && q,
    });
  let Se = G ?? (getGitEmail(w) ? standing : undefined);
  let ke = newestReadable?.githubCli !== undefined && w.githubCli === undefined;
  let we = [
    ...(Se ? missingEnvFields(Se, w) : []),
    ...(ke ? BUILTIN_GH_CHANGE : []),
    ...(getGitEmail(w) && newestReadable?.agentProxy && !w.agentProxy ? AGENT_PROXY_CHANGE : []),
  ];
  if (!latest || !hasWholeBlock || !maybeRemoveApiKeyFromMacOSKeychainThrows(latest, w) || Z)
    return [
      {
        type: "environment",
        snapshot: w,
      },
      ...(we.length > 0
        ? [
            {
              type: "environment",
              snapshot: w,
              changes: we,
            },
          ]
        : []),
    ];
  let environmentInfo = buildEnvironmentInfo(latest, w);
  let Ae = [...environmentInfo, ...we.filter((Ie) => !environmentInfo.some((Me) => Me.field === Ie.field))];
  return Ae.length === 0
    ? []
    : [
        {
          type: "environment",
          snapshot: w,
          changes: Ae,
        },
      ];
}
//@ chunk-e6aww6q8.js:3332617-3333467 placement
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
  let { workingDirectory, scratchpadDirectory, ...ke } = sourceSnapshot;
  let resentSnapshot = keepWorkingDirectory
    ? sourceSnapshot
    : {
        ...ke,
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
//@ chunk-e6aww6q8.js:3333681-3333747 placement
/**
 * 模型身份变化时返回模型附件（已记录过则不返回）。
 */
function modelAttachmentIfNew(preCompactMessages, messagesToKeep) {
  if (getLastModelIdentity(messagesToKeep)) return [];
  let lastModelAttachment = getLastModelAttachment(preCompactMessages);
  return lastModelAttachment ? [lastModelAttachment] : [];
}
//@ chunk-e6aww6q8.js:3333747-3334155 placement
/**
 * 当输出样式或语言偏好相对历史消息中最近一次发送的值发生变化时，生成 output_style_instructions / language 附件。
 */
async function getOutputStyleAndLanguageAttachments(e, n) {
  if (!shouldSendEnvironmentAttachments(e)) return [];
  let r = messagesSinceCompactBoundary(n ?? []);
  let outputStyleConfig = await getOutputStyleConfig();
  let h = outputStyleConfig
    ? {
        name: outputStyleConfig.name,
        prompt: outputStyleConfig.prompt,
      }
    : null;
  let language = getInitialSettings_2().language || null;
  let S =
    (!outputStyleConfig && (hasCustomOutputStyle() !== DEFAULT || isSkillOverridesUnread())) ||
    !outputStyleAttachmentSchema().safeParse(h).success
      ? undefined
      : changedSettingValue(lastOutputStyleAttachment(r), h, isSameSettingValue);
  let w =
    languagePreferenceSchema().safeParse(language).success && !(language === null && isSkillOverridesUnread())
      ? changedSettingValue(lastLanguageAttachment(r), language, (L, G) => L === G)
      : undefined;
  return [
    ...(S
      ? [
          {
            type: "output_style_instructions",
            style: S.value,
          },
        ]
      : []),
    ...(w
      ? [
          {
            type: "language",
            language: w.value,
          },
        ]
      : []),
  ];
}
//@ chunk-e6aww6q8.js:3334155-3334304 placement
/**
 * 并行生成环境变化相关附件：目录变化、运行时模型切换、输出样式/语言与主动性提示。
 */
async function getEnvironmentChangeAttachments(e, n) {
  return (
    await Promise.all([
      detectEnvironmentDirectoryChange(e, n),
      getRuntimeModelSwitchAnnouncements(e, n),
      getOutputStyleAndLanguageAttachments(e, n),
      !e.options.bareFork
        ? maybe("proactivity", () => proactivityAttachments(messagesSinceCompactBoundary(n ?? []), e))
        : [],
    ])
  ).flat();
}
export {
  shouldEmitEnvironmentChanges,
  getEnvironmentChangeAttachments,
  getPostCompactEnvironmentAttachments,
  modelAttachmentIfNew,
  shouldPrefetchArtifactOpening,
  detectEnvironmentDirectoryChange,
  getOutputStyleAndLanguageAttachments,
};
