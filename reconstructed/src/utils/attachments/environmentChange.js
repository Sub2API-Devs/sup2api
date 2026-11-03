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
import { shouldPrefetchArtifactOpening } from "./artifactOpeningPrefetch.js";
import { GFe } from "../model/promptBundles.js";
import {
  collectEnvironmentFacts,
  summarizeEnvironmentHistory,
  remoteEnvironmentFacts,
  missingEnvFields,
  buildEnvironmentInfo,
} from "../contextAttachments/environment.js";
import { gl } from "../cwd.js";
import { getToolPermissionContext } from "../permissions/toolPermissionContext.js";
import { Us } from "../../services/projects/threadRows.js";
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
import { oGe, proactivityAttachments } from "../proactivity.js";
import {
  changedSettingValue,
  lastOutputStyleAttachment,
  Qkt,
  lastLanguageAttachment,
} from "../contextAttachments/outputStyleLanguage.js";
import { getRuntimeModelSwitchAnnouncements } from "../model/model.js";
import { maybe } from "../attachments.js";

//@ chunk-e6aww6q8.js:3329793-3329885 placement
function VCn() {
  if (!isRemoteCowork() || env.CLAUDE_CODE_ARTIFACT_OPENING_PREFETCH === !1) return !1;
  return shouldPrefetchArtifactOpening();
}
//@ chunk-e6aww6q8.js:3331460-3331522 placement
function int(e) {
  return !GFe() && !e.bareFork && !e.isolatedContext;
}
//@ chunk-e6aww6q8.js:3331522-3331687 placement
function shouldSendEnvironmentAttachments(e) {
  if (!int(e.options)) return !1;
  let { agentContext: agentContext } = e;
  switch (agentContext.agentType) {
    case "main":
    case "teammate":
      return !0;
    case "subagent":
      return agentContext.isMainSession === !0;
  }
}
//@ chunk-e6aww6q8.js:3331687-3331744 placement
var iet = [{ field: "githubCli" }],
  YCn = [{ field: "agentProxy" }];
/**
 * 检测工作目录出现或消失，生成环境变化附件。
 */
//@ chunk-e6aww6q8.js:3331744-3332617 placement
async function detectEnvironmentDirectoryChange(e, n) {
  if (!int(e.options)) return [];
  let r = await collectEnvironmentFacts({
      cwd: gl(),
      additionalWorkingDirectories: Array.from(
        getToolPermissionContext(e).additionalWorkingDirectories.keys(),
      ),
    }),
    {
      latest: latest,
      newestReadable: newestReadable,
      hasWholeBlock: hasWholeBlock,
      standing: standing,
    } = summarizeEnvironmentHistory(Us(n ?? [])),
    w = remoteEnvironmentFacts(latest) ?? r,
    L = w.workingDirectory !== void 0,
    G = L ? void 0 : standing,
    q = newestReadable !== void 0 && newestReadable.workingDirectory === void 0,
    Z = L && q;
  if (G || Z)
    logEvent("tengu_environment_directory_change", {
      change: fromEnum(G ? "gone" : "appeared"),
      resent: G !== void 0 && q,
    });
  let Se = G ?? (getGitEmail(w) ? standing : void 0),
    ke = newestReadable?.githubCli !== void 0 && w.githubCli === void 0,
    we = [
      ...(Se ? missingEnvFields(Se, w) : []),
      ...(ke ? iet : []),
      ...(getGitEmail(w) && newestReadable?.agentProxy && !w.agentProxy ? YCn : []),
    ];
  if (!latest || !hasWholeBlock || !maybeRemoveApiKeyFromMacOSKeychainThrows(latest, w) || Z)
    return [
      { type: "environment", snapshot: w },
      ...(we.length > 0 ? [{ type: "environment", snapshot: w, changes: we }] : []),
    ];
  let Ee = buildEnvironmentInfo(latest, w),
    Ae = [...Ee, ...we.filter((Ie) => !Ee.some((Me) => Me.field === Ie.field))];
  return Ae.length === 0 ? [] : [{ type: "environment", snapshot: w, changes: Ae }];
}
/**
 * 压缩后重新生成环境附件：有当前快照时按需重发快照及目录/gh/代理变化；否则取最新或最近可读的快照（不保留工作目录时去掉 worktree/git 信息并记录目录变更），保留部分已含完整块时不重复发送。
 */
//@ chunk-e6aww6q8.js:3332617-3333467 placement
function getPostCompactEnvironmentAttachments(messages, keptMessages, keepWorkingDirectory) {
  let {
      latest: latest,
      newestReadable: newestReadable,
      standing: standing,
      mentioned: mentioned,
      toldOfBuiltinGh: toldOfBuiltinGh,
      toldOfAgentProxy: toldOfAgentProxy,
    } = summarizeEnvironmentHistory(messages),
    currentSnapshot = remoteEnvironmentFacts(latest);
  if (currentSnapshot !== void 0) {
    if (!newestReadable) return [];
    let snapshot = currentSnapshot,
      changes = [
        ...(mentioned ? missingEnvFields(mentioned, snapshot) : []),
        ...(toldOfBuiltinGh ? iet : []),
        ...(toldOfAgentProxy && !snapshot.agentProxy ? YCn : []),
      ],
      keptState = summarizeEnvironmentHistory(keptMessages);
    return [
      ...(keptState.hasWholeBlock &&
      keptState.latest &&
      maybeRemoveApiKeyFromMacOSKeychainThrows(keptState.latest, snapshot)
        ? []
        : [{ type: "environment", snapshot: snapshot }]),
      ...(changes.length > 0 ? [{ type: "environment", snapshot: snapshot, changes: changes }] : []),
    ];
  }
  let sourceSnapshot = keepWorkingDirectory ? latest : newestReadable;
  if (!sourceSnapshot) return [];
  let {
      workingDirectory: workingDirectory,
      scratchpadDirectory: scratchpadDirectory,
      ...ke
    } = sourceSnapshot,
    resentSnapshot = keepWorkingDirectory ? sourceSnapshot : { ...ke, isWorktree: !1, isGitRepo: !1 },
    goneDirectory = keepWorkingDirectory ? void 0 : mentioned;
  if (goneDirectory)
    logEvent("tengu_environment_directory_change", {
      change: lit_2("gone"),
      resent: standing === void 0 || sourceSnapshot.workingDirectory === void 0,
    });
  let resendBuiltinGh = toldOfBuiltinGh && resentSnapshot.githubCli === void 0,
    resentChanges = [
      ...(goneDirectory ? missingEnvFields(goneDirectory, resentSnapshot) : []),
      ...(resendBuiltinGh ? iet : []),
    ];
  return [
    ...(summarizeEnvironmentHistory(keptMessages).hasWholeBlock
      ? []
      : [{ type: "environment", snapshot: resentSnapshot }]),
    ...(resentChanges.length > 0
      ? [{ type: "environment", snapshot: resentSnapshot, changes: resentChanges }]
      : []),
  ];
}
//@ chunk-e6aww6q8.js:3333681-3333747 placement
function Iln(e, n) {
  if (getLastModelIdentity(n)) return [];
  let r = getLastModelAttachment(e);
  return r ? [r] : [];
}
/**
 * 当输出样式或语言偏好相对历史消息中最近一次发送的值发生变化时，生成 output_style_instructions / language 附件。
 */
//@ chunk-e6aww6q8.js:3333747-3334155 placement
async function getOutputStyleAndLanguageAttachments(e, n) {
  if (!shouldSendEnvironmentAttachments(e)) return [];
  let r = Us(n ?? []),
    s = await getOutputStyleConfig(),
    h = s ? { name: s.name, prompt: s.prompt } : null,
    y = getInitialSettings_2().language || null,
    S =
      (!s && (hasCustomOutputStyle() !== DEFAULT || oGe())) ||
      !outputStyleAttachmentSchema().safeParse(h).success
        ? void 0
        : changedSettingValue(lastOutputStyleAttachment(r), h, Qkt),
    w =
      languagePreferenceSchema().safeParse(y).success && !(y === null && oGe())
        ? changedSettingValue(lastLanguageAttachment(r), y, (L, G) => L === G)
        : void 0;
  return [
    ...(S ? [{ type: "output_style_instructions", style: S.value }] : []),
    ...(w ? [{ type: "language", language: w.value }] : []),
  ];
}
/**
 * 并行生成环境变化相关附件：目录变化、运行时模型切换、输出样式/语言与主动性提示。
 */
//@ chunk-e6aww6q8.js:3334155-3334304 placement
async function getEnvironmentChangeAttachments(e, n) {
  return (
    await Promise.all([
      detectEnvironmentDirectoryChange(e, n),
      getRuntimeModelSwitchAnnouncements(e, n),
      getOutputStyleAndLanguageAttachments(e, n),
      !e.options.bareFork ? maybe("proactivity", () => proactivityAttachments(Us(n ?? []), e)) : [],
    ])
  ).flat();
}

export {
  int,
  getEnvironmentChangeAttachments,
  getPostCompactEnvironmentAttachments,
  Iln,
  VCn,
  detectEnvironmentDirectoryChange,
  getOutputStyleAndLanguageAttachments,
};
