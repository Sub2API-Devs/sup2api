/**
 * utils/teleport/dirSyncRules.ts
 *
 * 2.1.316 新增：目录同步规则
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (36)
 * attribution: placement 36
 */
import { join, relative as relative_2, sep, isAbsolute } from "path";
import { realpath } from "fs/promises";
import {
  checkManagedConfigFile,
  createSyncDenyFilter,
  EMPTY_DIR_SYNC_RULES,
  isSensitiveSyncedPath,
  launchDenyRules,
  getLaunchPermissions,
  UNCOVERED_ROOT,
} from "./dirSync.js";
import {
  isSensitiveNameOrVariant,
  exceedsPathVariantBudget,
  getPathNormalizationVariants,
} from "../permissions/sensitivePaths.js";
import { foldPathCase } from "../pathCaseFolding.js";
import { getPlatform } from "../platform.js";
import { uniq, count } from "../collections.js";
import {
  patternWithRoot,
  rootPathForSource,
  READ_PATH_PROBE,
  matchingRuleForInput,
} from "../permissions/filesystem.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import {
  applyPermissionRulesToPermissionContext,
  getDenyRuleForTool,
  getAskRuleForTool,
  getContentRulesMapForToolName,
} from "../permissions/permissions.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { getOriginalCwd, getOriginalCwdOrNull, getProjectConfigRoot } from "../../bootstrap/state.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { jsonStringify } from "../slowOperations.js";
import { countCharInString } from "../stringUtils.js";
import { runInRemoteCallFrameMain } from "../../remote/remoteMode.js";
import { findGitRoot } from "../git.js";
import { nativeRealpathLong } from "../windowsUncPaths.js";
import { getKeptServedOwnerSettings } from "../../remote/tools/servedOwnerSettings.js";
import {
  isRepoTierFreezeHeld,
  withRepoTiersLive,
  getSettingsWithErrors_2,
  getSettingsFilePathForSource,
  getLegacyLocalSettingsFilePath,
  isRepoTierAnsweredByACopy,
  getRelativeSettingsFilePathForSource,
  parseSettingsFile,
  getSettingsForSourceTightenOnly,
  getRuleAnchorRootForSource,
} from "../settings/settings.js";
import { invalidateCommandNames, commandSyncNameState } from "../settings/commandSyncNames.js";
import { loadAllPermissionRulesFromDisk, settingsJsonToRules } from "../permissions/permissionsLoader.js";
import {
  shouldAllowManagedReadPathsOnly,
  isSandboxFilesystemPathRelative,
  resolveSandboxDenyReadEntry,
  resolveSandboxFilesystemPath,
  sandboxFilesystemPathAsReadEarlier,
  canonicalizePathForMaskSweep,
} from "../sandbox/sandbox-adapter.js";
import {
  SETTING_SOURCES,
  REPO_DIR_SETTING_SOURCE_LIST,
  isSettingSourceEnabled,
  REPO_DIR_SETTING_SOURCES,
} from "../settings/constants.js";
import { identity as identity_2 } from "../identity.js";
import { logEvent } from "../../services/analytics/index.js";
import { env } from "../env.js";
import { readHeadAndTail } from "../printableName.js";
import { sanitizeDisplayText } from "../resultError.js";
import { tildify } from "../path.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1897069-1899609 placement
/**
 * 解析目录同步规则（启动位置、项目设置、根目录规则）。
 */
function resolveDirSyncRules(
  root,
  {
    realRoot = root,
    readRules = resolveUploadFilterRules({}),
    narrowRules,
    onlyAsLaunched = false,
    readsDenialsNarrowly = false,
    hostConfig,
    namesCredential,
  } = {},
) {
  let readRuleSet = readRules;
  let rootSpellings = realRoot === root ? [root] : [root, realRoot];
  let hostConfigCheck = hostConfig ?? checkManagedConfigFile(root, realRoot);
  if (hostConfigCheck.ground !== null)
    return Object.assign(() => "rules_unreadable", {
      unreadableSettingsFiles: readRuleSet.unreadableSettingsFiles,
      hostConfigGround: hostConfigCheck.ground,
      hostConfig: hostConfigCheck,
      deniesWrite: () => true,
    });
  let namesCredential_2 = isSensitiveNameOrVariant;
  let launchDir = launchDirInfo(rootSpellings, realRoot, readRuleSet.fromRoot?.root);
  let launchPlaceInfo = !onlyAsLaunched
    ? launchDir
    : launchDir === "unknown"
      ? EMPTY_LAUNCH_DIR_INFO
      : {
          ...launchDir,
          isBelowRoot: false,
        };
  if (!onlyAsLaunched)
    logUploadFilterEvent(
      realRoot,
      "launch_place",
      launchDir === "unknown"
        ? {
            placed: false,
          }
        : {
            placed: true,
            launch_dir_resolved: launchDir.isLaunchDirResolved,
            respelled: launchDir.launchDirSpellings.length > 1,
            below_root: launchDir.isBelowRoot,
            root_was_read: launchDir.isRootThatWasRead,
            ...{},
          },
    );
  if (launchPlaceInfo === "unknown")
    return Object.assign(() => "rules_unreadable", {
      unreadableSettingsFiles: readRuleSet.unreadableSettingsFiles,
      isLaunchPlaceUnknown: true,
      hostConfig: hostConfigCheck,
      deniesWrite: () => true,
      ...{},
    });
  let isBelowRoot = launchPlaceInfo.isBelowRoot;
  let fromRoot = launchPlaceInfo.isRootThatWasRead ? readRuleSet.fromRoot : undefined;
  let any = (readRuleSet.ruleSetsApart ?? [])
    .flat()
    .some(({ ruleValue: { ruleContent = "" } }) =>
      [ruleContent, foldPathCase(ruleContent)].some((ruleContent) => ruleContent.includes("!")),
    );
  let readReasonChecks = ((ctx, readDenialsNarrowly) => {
    let checkRules = (rules, depth) =>
      checkDirSyncRule(
        rootSpellings,
        {
          ...readRuleSet,
          rules,
        },
        ctx,
        depth,
        launchPlaceInfo.resolvedPathBelowRoot,
        readDenialsNarrowly,
        readsDenialsNarrowly,
      );
    let ruleSets = [readRuleSet.rules, ...(any ? (readRuleSet.ruleSetsApart ?? []) : [])];
    let checks = [
      ...ruleSets.map((ruleSet) => checkRules(ruleSet, "as_given")),
      ...(isBelowRoot
        ? [
            ...ruleSets.map((ruleSet) =>
              checkRules(
                ruleSet.filter(
                  (rule) => rule.source !== "projectSettings" && isRuleAnchoredAtProjectRoot(rule),
                ),
                "as_from_root",
              ),
            ),
            ...(fromRoot?.ruleSets ?? []).flatMap((ruleSet) => [
              checkRules(ruleSet.filter(isRuleAnchoredAtProjectRoot), "as_from_root"),
              checkRules(
                ruleSet.filter((rule) => !isRuleAnchoredAtProjectRoot(rule)),
                "as_given",
              ),
            ]),
          ]
        : []),
    ];
    return {
      getReasonForFile: (filePath) =>
        checks.reduce((acc, check) => acc ?? check.getReasonForFile(filePath), null),
      reasonForEveryFile: checks.reduce((acc, check) => acc ?? check.reasonForEveryFile, null),
    };
  })("read");
  let noExtraDenial = () => null;
  let syncDenyFilter = null;
  let syncDenyFilter_2 = createSyncDenyFilter(
    rootSpellings,
    readRuleSet.sandbox,
    getPlatform(),
    readsDenialsNarrowly,
  );
  let syncDenyFilter_3 = createSyncDenyFilter(
    launchPlaceInfo.launchDirSpellings,
    fromRoot?.sandbox ?? EMPTY_DIR_SYNC_RULES,
    getPlatform(),
    readsDenialsNarrowly,
  );
  let sandboxMovedToRoot = readRuleSet.sandboxMovedToRoot ?? EMPTY_DIR_SYNC_RULES;
  let syncDenyFilter_4 = createSyncDenyFilter(
    launchPlaceInfo.launchDirSpellings,
    {
      ...sandboxMovedToRoot,
      reopens: [
        ...sandboxMovedToRoot.reopens,
        ...uniq(
          readRuleSet.sandbox.reopens
            .filter((reopen) => !sandboxMovedToRoot.reopens.includes(reopen))
            .flatMap((reopen) =>
              rootSpellings.flatMap((rootSpelling) => relativePosixPath(rootSpelling, reopen) ?? []),
            ),
        ).flatMap((reopenRel) =>
          launchPlaceInfo.launchDirSpellings.map((launchDirSpelling) => join(launchDirSpelling, reopenRel)),
        ),
      ],
    },
    getPlatform(),
    readsDenialsNarrowly,
  );
  let isReadDenied = (path) =>
    syncDenyFilter_2(path) || (isBelowRoot && (syncDenyFilter_3(path) || syncDenyFilter_4(path)));
  return Object.assign(
    (path, tracked) => {
      if (exceedsPathVariantBudget(path))
        return readReasonChecks.reasonForEveryFile ?? (tracked ? "sensitive_tracked" : "sensitive");
      let pathNormalizationVariants = getPathNormalizationVariants(path);
      let candidatePaths = [path, ...(pathNormalizationVariants ?? [])];
      let reason =
        candidatePaths.reduce(
          (acc, candidate) => acc ?? readReasonChecks.getReasonForFile(candidate),
          null,
        ) ?? (candidatePaths.some(isReadDenied) ? "read_denied" : null);
      if (pathNormalizationVariants === null) return reason ?? (tracked ? "sensitive_tracked" : "sensitive");
      return (
        reason ??
        (isSensitiveSyncedPath(path, {
          tracked,
          readings: pathNormalizationVariants,
          namesCredential: namesCredential_2,
        })
          ? tracked
            ? "sensitive_tracked"
            : "sensitive"
          : null) ??
        (hostConfigCheck.covers(path) ||
        pathNormalizationVariants.some((pathNormalizationVariant) =>
          hostConfigCheck.covers(pathNormalizationVariant),
        )
          ? "host_config"
          : null)
      );
    },
    {
      unreadableSettingsFiles: readRuleSet.unreadableSettingsFiles,
      hostConfig: hostConfigCheck,
      deniesWrite: (path) => noExtraDenial(path) !== null,
      ...{},
    },
  );
}
//@ chunk-e6aww6q8.js:1899609-1899758 placement
function isRuleAnchoredAtProjectRoot({ source, ruleValue }) {
  if (ruleValue.ruleContent === undefined) return true;
  let { root } = patternWithRoot(ruleValue.ruleContent, source);
  return root === null || root === rootPathForSource("projectSettings");
}
//@ chunk-e6aww6q8.js:1899758-1899938 placement
var DENY_OR_ASK_BEHAVIORS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EDIT_WRITE_TOOL_STUBS;
var ASCII_ONLY_RE_2;
var LINE_BREAK_RE;
var MAX_LINE_BREAK_VARIANTS;
deferInit("chunk-e6aww6q8.js:1899758", () => {
  DENY_OR_ASK_BEHAVIORS = ["deny", "ask"];
  EDIT_WRITE_TOOL_STUBS = [FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME].map((name) => ({
    name,
    mcpInfo: undefined,
    familyParentToolName: undefined,
    aliasSkillToolNames: undefined,
  }));
  ASCII_ONLY_RE_2 = /^[\x00-\x7f]*$/;
  LINE_BREAK_RE = /[\n\r\u2028\u2029]/g;
  MAX_LINE_BREAK_VARIANTS = 16;
});
//@ chunk-e6aww6q8.js:1899938-1900070 placement
function lineBreakVariants(text) {
  return [
    text,
    ...Array.from(text.matchAll(LINE_BREAK_RE))
      .slice(0, MAX_LINE_BREAK_VARIANTS)
      .map(({ index }) => text.slice(0, index) + text.slice(index).replace(LINE_BREAK_RE, "\x01")),
  ];
}
//@ chunk-e6aww6q8.js:1900070-1902037 placement
/**
 * 检查一条路径是否被目录同步规则拒绝读取或编辑。
 */
function checkDirSyncRule(
  target,
  { rules, complete },
  ctx,
  depth,
  resolvedPathBelowRoot,
  behavior = "deny",
  options,
) {
  if (!complete) return staticReasonResult("rules_unreadable");
  if (rules.length === 0) return staticReasonResult(null);
  let mapped = rules.map((rule) => ({
    ...rule,
    ruleValue: {
      ...rule.ruleValue,
      ...(rule.ruleValue.ruleContent === undefined
        ? {}
        : {
            ruleContent: foldPathCase(rule.ruleValue.ruleContent),
          }),
    },
  }));
  let contexts = ((rule) => ({
    asWritten: applyPermissionRulesToPermissionContext(getEmptyToolPermissionContext(), [...rules], rule),
    folded: applyPermissionRulesToPermissionContext(getEmptyToolPermissionContext(), mapped, rule),
  }))();
  if (
    ctx === "read"
      ? getDenyRuleForTool(contexts.asWritten, READ_PATH_PROBE) !== null ||
        getAskRuleForTool(contexts.asWritten, READ_PATH_PROBE) !== null
      : EDIT_WRITE_TOOL_STUBS.some(
          (rule_2) =>
            (behavior === "deny" ? getDenyRuleForTool : getAskRuleForTool)(contexts.asWritten, rule_2) !==
            null,
        )
  )
    return staticReasonResult("read_denied");
  let filtered = (ctx === "read" ? DENY_OR_ASK_BEHAVIORS : [behavior]).filter(
    (rule_3) =>
      getContentRulesMapForToolName(
        contexts.asWritten,
        ctx === "read" ? FILE_READ_TOOL_NAME : FILE_EDIT_TOOL_NAME,
        rule_3,
      ).size > 0,
  );
  if (filtered.length === 0) return staticReasonResult(null);
  let all = [...target, ...rules.map((rule) => rule.ruleValue.ruleContent ?? "")].every((rule_4) =>
    ASCII_ONLY_RE_2.test(rule_4),
  );
  let originalCwd = getOriginalCwd();
  let onUnjudged = () => {};
  let matchOptions = {
    unjudgedCountsAsMatched: !options,
    asSpelledOnly: true,
  };
  let matchesToolRule = (candidate, variant, behavior) => {
    onUnjudged(candidate);
    return matchingRuleForInput(candidate, contexts[variant], ctx, behavior, matchOptions) !== null;
  };
  let anyMatch = (rules, tool) =>
    rules.some((rule) => (rule.match(LINE_BREAK_RE)?.length ?? 0) > MAX_LINE_BREAK_VARIANTS) ||
    uniq(rules.flatMap(lineBreakVariants)).some((variant) =>
      filtered.some(
        (trialBehavior) =>
          (ctx === "edit" && behavior === "deny" && variant !== variant.trim()) ||
          matchesToolRule(variant, tool, trialBehavior) ||
          (variant !== variant.trimEnd() && matchesToolRule(`${variant}/.`, tool, trialBehavior)),
      ),
    );
  let mapped_2 = uniqByExport(
    [
      ...target.flatMap((targetPath) => {
        let relativeBelow = relativePosixPath(targetPath, originalCwd);
        return relativeBelow === null
          ? []
          : [
              {
                directory: join(targetPath, relativeBelow),
                below: relativeBelow,
              },
            ];
      }),
      ...(resolvedPathBelowRoot !== null && !(resolvedPathBelowRoot === "" && target.includes(originalCwd))
        ? [
            {
              directory: originalCwd,
              below: resolvedPathBelowRoot,
            },
          ]
        : []),
    ],
    jsonStringify,
  ).map(({ directory, below }) => ({
    directory,
    depth: below === "" ? 0 : countCharInString(below, "/") + 1,
    foldedBelow: foldPathCase(below),
  }));
  let belowVariants = (filePath, asWritten) => {
    let segments = mapped_2.length > 0 ? filePath.split("/") : [];
    return mapped_2.flatMap(({ directory, depth, foldedBelow }) =>
      segments.length > depth && foldPathCase(segments.slice(0, depth).join("/")) === foldedBelow
        ? [join(directory, asWritten(segments.slice(depth).join("/")))]
        : [],
    );
  };
  let fromRootCwd = (relativePath) => [join(originalCwd, relativePath)];
  let asWrittenPaths = (relativePath) =>
    depth === "as_from_root"
      ? fromRootCwd(relativePath)
      : uniq([
          ...target.map((root) => join(root, relativePath)),
          ...belowVariants(relativePath, (segment) => segment),
        ]);
  let foldedPaths = (relativePath) =>
    depth === "as_from_root"
      ? fromRootCwd(foldPathCase(relativePath))
      : [
          ...belowVariants(relativePath, foldPathCase),
          ...target.flatMap((root) => [
            join(root, foldPathCase(relativePath)),
            foldPathCase(join(root, relativePath)),
          ]),
        ];
  let matchesTrimmed = (relativePath) => {
    let paths = foldedPaths(relativePath);
    try {
      return anyMatch(paths, "asWritten") || anyMatch(paths, "folded");
    } catch {
      return true;
    }
  };
  return {
    getReasonForFile: (filePath) =>
      runInRemoteCallFrameMain(
        originalCwd,
        () =>
          anyMatch(asWrittenPaths(filePath), "asWritten") ||
          (!(all && ASCII_ONLY_RE_2.test(filePath)) &&
            matchesTrimmed(
              filePath.trimEnd() + filePath.slice(filePath.trimEnd().length).replaceAll("\uFEFF", " "),
            )),
      )
        ? "read_denied"
        : null,
    reasonForEveryFile: null,
  };
}
//@ chunk-e6aww6q8.js:1902037-1902105 placement
function staticReasonResult(reason) {
  return {
    getReasonForFile: () => reason,
    reasonForEveryFile: reason,
  };
}
//@ chunk-e6aww6q8.js:1902105-1902716 placement
/**
 * 计算上传过滤规则：合并启动规则与仓库根目录规则，按过滤根目录换算路径。
 */
function resolveUploadFilterRules({
  filterRoot,
  isCredentialListCountedFromOutsideRoot: countedFromOutside = false,
  syncedRoot,
  launchRules = collectLaunchRules(syncedRoot),
} = {}) {
  let originalCwdOrNull = getOriginalCwdOrNull();
  let root = originalCwdOrNull === null ? null : findGitRoot(originalCwdOrNull);
  let rules = addLaunchRules(root, launchRules, {
    syncedRoot,
  });
  if (filterRoot === undefined || originalCwdOrNull === null) return rules;
  let finish = (rules, belowRoot) => rules;
  if (filterRoot === root) return finish(rules, relativePosixPath(filterRoot, originalCwdOrNull) !== null);
  let [filterRootReal, cwdReal, rootReal] = [filterRoot, originalCwdOrNull, root].map((path) =>
    path === null ? null : nativeRealpathLong(path),
  );
  if (root !== null && (rootReal === filterRootReal || (rootReal === null && rules.fromRoot !== undefined)))
    return finish(rules, relativePosixPath(root, originalCwdOrNull) !== null);
  let asFiltersOwnRoot = {
    isLaunchDirBelowRoot:
      relativePosixPath(filterRoot, originalCwdOrNull) !== null ||
      (filterRootReal != null && cwdReal != null && relativePosixPath(filterRootReal, cwdReal) !== null),
  };
  let mergedRules = addLaunchRules(
    filterRoot,
    addLaunchRules(filterRoot, rules, {
      asFiltersOwnRoot,
      syncedRoot,
    }),
    {
      asFiltersOwnRoot,
      source: "localSettings",
      syncedRoot,
    },
  );
  return finish(mergedRules, asFiltersOwnRoot.isLaunchDirBelowRoot);
}
//@ chunk-e6aww6q8.js:1902716-1902757 placement
function filterPermissionErrors(errors, errors_2, root) {
  return errors.filter(isPermissionSettingsError);
}
//@ chunk-e6aww6q8.js:1902757-1903680 placement
/**
 * 计算启动时的同步规则；仓库层设置冻结时，合并冻结值与实时值（规则去重、拒绝与凭据取并集），保证只会更严格。
 */
function collectLaunchRules(syncedRoot) {
  let userRules = getKeptServedOwnerSettings();
  if (!isRepoTierFreezeHeld()) {
    let dirSyncRules = loadDirSyncRules(true, userRules, syncedRoot);
    return userRules === undefined
      ? {
          ...dirSyncRules,
          ruleSetsApart: undefined,
        }
      : dirSyncRules;
  }
  let frozenRules = loadDirSyncRules(false, userRules, syncedRoot);
  let liveRules = withRepoTiersLive(() => loadDirSyncRules(true, userRules, syncedRoot));
  let userRules_2 = (rule) => jsonStringify([rule.source, rule.ruleBehavior, rule.ruleValue]);
  let result = new Set(frozenRules.rules.map(userRules_2));
  return {
    rules: [...frozenRules.rules, ...liveRules.rules.filter((rule) => !result.has(userRules_2(rule)))],
    ruleSetsApart: uniqByExport(
      [...(frozenRules.ruleSetsApart ?? []), ...(liveRules.ruleSetsApart ?? [])],
      jsonStringify,
    ),
    sandbox: {
      denies: uniq([...frozenRules.sandbox.denies, ...liveRules.sandbox.denies]),
      credentials: uniq([...frozenRules.sandbox.credentials, ...liveRules.sandbox.credentials]),
      reopens: frozenRules.sandbox.reopens,
    },
    sandboxMovedToRoot:
      frozenRules.sandboxMovedToRoot === undefined || liveRules.sandboxMovedToRoot === undefined
        ? undefined
        : {
            denies: uniq([...frozenRules.sandboxMovedToRoot.denies, ...liveRules.sandboxMovedToRoot.denies]),
            credentials: uniq([
              ...frozenRules.sandboxMovedToRoot.credentials,
              ...liveRules.sandboxMovedToRoot.credentials,
            ]),
            reopens: frozenRules.sandboxMovedToRoot.reopens,
          },
    complete: frozenRules.complete && liveRules.complete,
    unreadableSettingsFiles: uniq([
      ...(frozenRules.unreadableSettingsFiles ?? []),
      ...(liveRules.unreadableSettingsFiles ?? []),
    ]),
  };
}
//@ chunk-e6aww6q8.js:1903680-1905458 placement
/**
 * 汇总目录同步上传要遵守的规则：磁盘上的 deny/ask 权限规则（含用户设置补充）、各设置源的沙箱 denyRead/凭据文件/allowRead（reopen），并记录无法解析的来源。
 */
function loadDirSyncRules(includeAll, userRules, syncedRoot) {
  invalidateCommandNames();
  let { errors } = getSettingsWithErrors_2();
  let filtered = loadAllPermissionRulesFromDisk().filter(
    (rule) => rule.ruleBehavior === "deny" || rule.ruleBehavior === "ask",
  );
  let seenRules = new Set(filtered.map((rule_2) => jsonStringify(rule_2)));
  let filtered_2 = settingsJsonToRules(userRules ?? null, "userSettings").filter(
    (rule_3) => rule_3.ruleBehavior !== "allow",
  );
  let readRules = [...filtered, ...filtered_2.filter((rule_4) => !seenRules.has(jsonStringify(rule_4)))];
  let startupReadRules = launchDenyRulesForRead(FILE_READ_TOOL_NAME, [READ_PATH_PROBE]);
  let extraRules = [];
  let managedReadOnly = shouldAllowManagedReadPathsOnly();
  let flattened = SETTING_SOURCES.flatMap((rule_5) => sandboxReadEntriesForSource(rule_5, managedReadOnly));
  let userReadEntries =
    userRules === undefined
      ? []
      : sandboxReadEntriesForSource("userSettings", managedReadOnly, {
          settings: withWindowsSandboxSpellings(userRules),
        });
  let userReopenResolved = new Set(
    userReadEntries.flatMap((rule_6) => (rule_6.kind === "reopen" ? rule_6.resolved : [])),
  );
  let sandboxEntries = [
    ...flattened.filter(
      (rule_7) =>
        userRules === undefined ||
        rule_7.kind !== "reopen" ||
        rule_7.source !== "userSettings" ||
        rule_7.resolved.every((resolvedPath) => userReopenResolved.has(resolvedPath)),
    ),
    ...userReadEntries.filter((entry) => entry.kind !== "reopen"),
  ];
  let permissionErrors = filterPermissionErrors(errors, syncedRoot, () =>
    [
      ...REPO_DIR_SETTING_SOURCE_LIST.map((source) => ({
        source,
        file: getSettingsFilePathForSource(source),
      })),
      {
        source: "localSettings",
        file: getLegacyLocalSettingsFilePath(),
      },
    ].flatMap(({ source, file }) =>
      file === undefined || isRepoTierAnsweredByACopy(source) || !isSettingSourceEnabled(source)
        ? []
        : [file],
    ),
  );
  let filtered_3 = sandboxEntries.filter((entry) => entry.kind === "unresolvable");
  let complete = permissionErrors.length === 0 && filtered_3.length === 0;
  let resolvedOfKind = (kind, entries = sandboxEntries) =>
    uniq(entries.flatMap((entry) => (entry.kind === kind ? entry.resolved : [])));
  let entries = sandboxEntries.filter((entry) => entry.isMovedToRoot === true);
  if (includeAll)
    logDirSyncUploadRules({
      read_rules: readRules.length,
      startup_read_rules: startupReadRules.length,
      sandbox_deny_read: count(sandboxEntries, (entry) => entry.kind === "deny_read"),
      sandbox_credential_files: count(sandboxEntries, (entry) => entry.kind === "credential_file"),
      sandbox_reopens: count(sandboxEntries, (entry) => entry.kind === "reopen"),
      sandbox_from_user: sandboxEntries.some((entry) => entry.source === "userSettings"),
      sandbox_from_project: sandboxEntries.some((entry) => REPO_DIR_SETTING_SOURCES.has(entry.source)),
      sandbox_from_flag: sandboxEntries.some((entry) => entry.source === "flagSettings"),
      sandbox_from_managed: sandboxEntries.some((entry) => entry.source === "policySettings"),
      complete,
      ...{},
    });
  return {
    rules: [...readRules, ...startupReadRules, ...extraRules],
    ruleSetsApart: [filtered, filtered_2],
    sandbox: {
      denies: resolvedOfKind("deny_read"),
      credentials: resolvedOfKind("credential_file"),
      reopens: resolvedOfKind("reopen"),
    },
    sandboxMovedToRoot: {
      denies: resolvedOfKind("deny_read", entries),
      credentials: resolvedOfKind("credential_file", entries),
      reopens: resolvedOfKind("reopen", entries),
    },
    complete,
    unreadableSettingsFiles: uniq([
      ...permissionErrors.flatMap((error) => error.file ?? []),
      ...filtered_3.flatMap((entry) => entry.file ?? []),
    ]),
  };
}
//@ chunk-e6aww6q8.js:1905458-1905574 placement
function relativePosixPath(from, to) {
  let relative = relative_2(from, to);
  return relative === "" || relative === ".." || relative.startsWith(".." + sep) || isAbsolute(relative)
    ? null
    : relative.split(sep).join("/");
}
//@ chunk-e6aww6q8.js:1905574-1905624 placement
function relativePosixOrNull(from, to) {
  return relative_2(from, to) === "" ? "" : relativePosixPath(from, to);
}
//@ chunk-e6aww6q8.js:1905624-1905742 placement
var EMPTY_LAUNCH_DIR_INFO = {
  launchDirSpellings: [],
  isLaunchDirResolved: false,
  resolvedPathBelowRoot: null,
  isBelowRoot: false,
  isRootThatWasRead: false,
};
//@ chunk-e6aww6q8.js:1905742-1906136 placement
/**
 * 计算启动目录的同步信息（拼写、是否已解析、是否在根下、根是否被读过）。
 */
function launchDirInfo(dirs, realRoot, root) {
  let originalCwdOrNull = getOriginalCwdOrNull();
  if (originalCwdOrNull === null) return EMPTY_LAUNCH_DIR_INFO;
  let cwdReal = nativeRealpathLong(originalCwdOrNull);
  let rootReal = root === undefined || dirs.includes(root) ? realRoot : nativeRealpathLong(root);
  if (
    rootReal === null ||
    (cwdReal === null && !dirs.some((dir) => relativePosixOrNull(dir, originalCwdOrNull) !== null))
  )
    return "unknown";
  let relative = cwdReal === null ? null : relativePosixOrNull(realRoot, cwdReal);
  return {
    launchDirSpellings: uniq([originalCwdOrNull, cwdReal ?? originalCwdOrNull]),
    isLaunchDirResolved: cwdReal !== null,
    resolvedPathBelowRoot: relative,
    isBelowRoot:
      (relative !== null && relative !== "") ||
      dirs.some((dir) => relativePosixPath(dir, originalCwdOrNull) !== null),
    isRootThatWasRead: root !== undefined && relativePosixOrNull(realRoot, rootReal) === "",
  };
}
//@ chunk-e6aww6q8.js:1906136-1906426 placement
function isPermissionSettingsError(error) {
  return (
    isBlockingSandboxSettingsError(error) ||
    (!error.removal &&
      (error.path === "permissions" ||
        (error.path.startsWith("permissions.") && !error.path.startsWith("permissions.allow")) ||
        (error.path.startsWith("sandbox.filesystem") &&
          !error.path.startsWith("sandbox.filesystem.allowRead") &&
          !error.path.startsWith("sandbox.filesystem.allowWrite"))))
  );
}
//@ chunk-e6aww6q8.js:1906426-1906585 placement
function isBlockingSandboxSettingsError(error) {
  return (
    !error.removal &&
    (error.severity !== "warning" ||
      error.path === "sandbox" ||
      error.path === "sandbox.credentials" ||
      error.path.startsWith("sandbox.credentials.files"))
  );
}
//@ chunk-e6aww6q8.js:1906585-1908176 placement
/**
 * 把仓库根设置里的上传过滤规则叠加到已有规则上（冻结仓库层、去重、只更严格）。
 */
function addLaunchRules(root, rules, { asFiltersOwnRoot, source = "projectSettings", syncedRoot }) {
  let originalCwdOrNull = getOriginalCwdOrNull();
  if (
    originalCwdOrNull === null ||
    root === null ||
    !(asFiltersOwnRoot?.isLaunchDirBelowRoot ?? relativePosixPath(root, originalCwdOrNull) !== null) ||
    getProjectConfigRoot() !== null ||
    !isSettingSourceEnabled(source)
  )
    return rules;
  let settingsPath = join(root, getRelativeSettingsFilePathForSource(source));
  let { settings, errors } = parseSettingsFile(settingsPath);
  let spelledSettings = withWindowsSandboxSpellings(settings);
  let settingsErrors = filterPermissionErrors(errors, syncedRoot, () => [settingsPath]);
  let filtered = settingsJsonToRules(spelledSettings, source).filter((rule) => rule.ruleBehavior !== "allow");
  let readEntriesFor = (isSandboxFilesystemPathRelative) =>
    sandboxReadEntriesForSource(source, true, {
      settings: {
        sandbox: {
          filesystem: {
            denyRead: spelledSettings?.sandbox?.filesystem?.denyRead?.filter(isSandboxFilesystemPathRelative),
          },
          credentials: {
            files: spelledSettings?.sandbox?.credentials?.files?.filter((file) =>
              isSandboxFilesystemPathRelative(file.path),
            ),
          },
        },
      },
    });
  let relativeEntries = readEntriesFor(isSandboxFilesystemPathRelative);
  let otherEntries = readEntriesFor((entry) => !isSandboxFilesystemPathRelative(entry));
  let complete =
    settingsErrors.length === 0 &&
    ![...relativeEntries, ...otherEntries].some((entry) => entry.kind === "unresolvable");
  logUploadFilterEvent(settingsPath, "root_project_rules", {
    rules: filtered.length,
    sandbox_entries: relativeEntries.length + otherEntries.length,
    complete,
    ...(asFiltersOwnRoot !== undefined && {
      read_as_filters_own_root: true,
      local_settings: source === "localSettings",
    }),
  });
  let resolvedOfKind = (entries, kind) =>
    entries.flatMap((sandboxEntry) => (sandboxEntry.kind === kind ? sandboxEntry.resolved : []));
  let repoRuleSet = rulesWithFrozenRepo(settingsPath, complete && !errors.some(isPermissionSettingsError), {
    rules: filtered,
    relative: {
      denies: resolvedOfKind(relativeEntries, "deny_read"),
      credentials: resolvedOfKind(relativeEntries, "credential_file"),
    },
    other: {
      denies: resolvedOfKind(otherEntries, "deny_read"),
      credentials: resolvedOfKind(otherEntries, "credential_file"),
    },
  });
  let mergeEntries = (rule, existing = []) => uniq([...existing, ...repoRuleSet.flatMap(rule)]);
  let fromRoot = rules.fromRoot?.root === root ? rules.fromRoot : undefined;
  return {
    ...rules,
    sandbox: {
      ...rules.sandbox,
      denies: mergeEntries((ruleSet) => ruleSet.other.denies, rules.sandbox.denies),
      credentials: mergeEntries((ruleSet) => ruleSet.other.credentials, rules.sandbox.credentials),
    },
    fromRoot: {
      root,
      ruleSets: [...(fromRoot?.ruleSets ?? []), ...repoRuleSet.map((ruleSet) => ruleSet.rules)],
      sandbox: {
        denies: mergeEntries((ruleSet) => ruleSet.relative.denies, fromRoot?.sandbox.denies),
        credentials: mergeEntries((ruleSet) => ruleSet.relative.credentials, fromRoot?.sandbox.credentials),
        reopens: [],
      },
    },
    complete: rules.complete && complete,
    unreadableSettingsFiles: complete
      ? rules.unreadableSettingsFiles
      : uniq([...(rules.unreadableSettingsFiles ?? []), settingsPath]),
  };
}
//@ chunk-e6aww6q8.js:1908176-1908227 placement
var repoFreezeRuleCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakSet_4;
deferInit("chunk-e6aww6q8.js:1908176", () => {
  repoFreezeRuleCache = identity_2(new Map(), (map) => map.clear());
  weakSet_4 = new WeakSet();
});
//@ chunk-e6aww6q8.js:1908227-1908419 placement
function rulesWithFrozenRepo(settingsPath, settingsPath_2, rules) {
  if (!isRepoTierFreezeHeld()) return [rules];
  let state = commandSyncNameState();
  if (!weakSet_4.has(state)) {
    weakSet_4.add(state);
    state.onInvalidate(() => {
      if (!isRepoTierFreezeHeld()) repoFreezeRuleCache.clear();
    });
  }
  let frozenRules = repoFreezeRuleCache.get(settingsPath);
  if (frozenRules !== undefined) return [frozenRules, rules];
  if (settingsPath_2) repoFreezeRuleCache.set(settingsPath, rules);
  return [rules];
}
//@ chunk-e6aww6q8.js:1908419-1908583 placement
function launchDenyRulesForRead(toolName, ruleContent) {
  return launchDenyRules(getLaunchPermissions()).filter((rule) =>
    rule.ruleValue.ruleContent !== undefined
      ? rule.ruleValue.toolName === toolName
      : rule.source === "session" &&
        ruleContent.some(
          (ruleContent) => getDenyRuleForTool(getEmptyToolPermissionContext(), ruleContent, [rule]) !== null,
        ),
  );
}
//@ chunk-e6aww6q8.js:1908583-1908627 placement
var lastLoggedUploadRules; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var lastLoggedHostConfig;
deferInit("chunk-e6aww6q8.js:1908583", () => {
  lastLoggedUploadRules = null;
  lastLoggedHostConfig = identity_2(new Map(), (map) => map.clear());
});
//@ chunk-e6aww6q8.js:1908627-1908740 placement
function logDirSyncHostConfig(source, hostConfig, extra) {
  let json = jsonStringify(hostConfig);
  if (lastLoggedHostConfig.get(source) === json) return;
  lastLoggedHostConfig.set(source, json);
  logEvent("tengu_dir_sync_host_config", {
    ...hostConfig,
    ...extra,
  });
}
//@ chunk-e6aww6q8.js:1908740-1908775 placement
var lastLoggedFilterEvent; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1908740", () => {
  lastLoggedFilterEvent = identity_2(new Map(), (map) => map.clear());
});
//@ chunk-e6aww6q8.js:1908775-1908876 placement
function logUploadFilterEvent(key, value, extra) {
  let json = jsonStringify(extra);
  if (lastLoggedFilterEvent.get(key) === json) return;
  lastLoggedFilterEvent.set(key, json);
  logEvent(`tengu_upload_filter_${value}`, extra);
}
//@ chunk-e6aww6q8.js:1908876-1909100 placement
function logDirSyncUploadRules(rulesResult) {
  let complete =
    rulesResult.complete &&
    rulesResult.dropped_entries_ignored === undefined &&
    rulesResult.read_rules +
      rulesResult.startup_read_rules +
      rulesResult.sandbox_deny_read +
      rulesResult.sandbox_credential_files ===
      0;
  let reason = jsonStringify(rulesResult);
  if (complete || reason === lastLoggedUploadRules) return;
  lastLoggedUploadRules = reason;
  logEvent("tengu_dir_sync_upload_rules", rulesResult);
}
//@ chunk-e6aww6q8.js:1909192-1909843 placement
/**
 * 收集某个设置源的沙箱读取相关条目，无法解析时标记为 unresolvable。
 */
function sandboxReadEntriesForSource(source, source_2, extra) {
  let enabled = isSettingSourceEnabled(source);
  let isRepoSource = REPO_DIR_SETTING_SOURCES.has(source);
  if (!enabled && isRepoSource) return [];
  let entries = enabled ? undefined : getWritableSettingsPathForSource(source);
  if (entries !== undefined && !isReadableSettingsFile(entries))
    return [
      {
        kind: "unresolvable",
        source,
        resolved: [],
        file: entries,
      },
    ];
  let sandbox = (extra?.settings ?? withWindowsSandboxSpellings(getSettingsForSourceTightenOnly(source)))
    ?.sandbox;
  let denyReadEntries = enabled ? (sandbox?.filesystem?.denyRead ?? []) : [];
  let mapped = (sandbox?.credentials?.files ?? []).map((file) => file.path);
  let allowReadEntries =
    enabled &&
    !isRepoSource &&
    (!env.CLAUDE_CODE_EVAL_CONFINED || source === "userSettings") &&
    (!source_2 || source === "policySettings")
      ? (sandbox?.filesystem?.allowRead ?? []).filter((path) => path.trim() !== "")
      : [];
  return [
    ...denyReadEntries.map((entry) =>
      resolveSandboxReadEntry("deny_read", source, entry, () =>
        maskSweepSpellings(resolveSandboxDenyReadEntry(entry, source)),
      ),
    ),
    ...mapped.map((entry) =>
      resolveSandboxReadEntry("credential_file", source, entry, () =>
        maskSweepSpellings(resolveSandboxDenyReadEntry(entry, source)),
      ),
    ),
    ...allowReadEntries.flatMap((allowReadEntry) => {
      let sandboxReadEntry = resolveSandboxReadEntry("reopen", source, allowReadEntry, () => [
        resolveSandboxFilesystemPath(allowReadEntry, source),
      ]);
      return sandboxReadEntry.kind === "reopen" ? [sandboxReadEntry] : [];
    }),
  ];
}
//@ chunk-e6aww6q8.js:1909843-1910215 placement
/**
 * 在 Windows 上为沙箱拒绝路径补上大小写/别名拼写，避免漏拒。
 */
function withWindowsSandboxSpellings(settings) {
  let sandbox = settings?.sandbox;
  if (getPlatform() !== "windows" || !settings || !sandbox) return settings;
  return {
    ...settings,
    sandbox: {
      ...sandbox,
      filesystem: sandbox.filesystem && {
        ...sandbox.filesystem,
        denyRead: sandbox.filesystem.denyRead?.flatMap((denyReadEntry) => {
          let canonicalEntry = sandboxFilesystemPathAsReadEarlier(denyReadEntry);
          return canonicalEntry === null ? [denyReadEntry] : [denyReadEntry, canonicalEntry];
        }),
      },
      credentials: sandbox.credentials && {
        ...sandbox.credentials,
        files: sandbox.credentials.files?.flatMap((file) => {
          let extra = sandboxFilesystemPathAsReadEarlier(file.path);
          return extra === null
            ? [file]
            : [
                file,
                {
                  ...file,
                  path: extra,
                },
              ];
        }),
      },
    },
  };
}
//@ chunk-e6aww6q8.js:1910215-1910292 placement = getEnabledSettingSources (1)
function getWritableSettingsPathForSource(source) {
  return source === "policySettings" || source === "flagSettings"
    ? undefined
    : getSettingsFilePathForSource(source);
}
//@ chunk-e6aww6q8.js:1910292-1910338 placement
function isReadableSettingsFile(path) {
  return !parseSettingsFile(path).errors.some(isBlockingSandboxSettingsError);
}
//@ chunk-e6aww6q8.js:1910338-1910559 placement
function resolveSandboxReadEntry(kind, source, resolve, extra) {
  try {
    return {
      kind,
      source,
      resolved: extra(),
      isMovedToRoot:
        getOriginalCwdOrNull() !== null &&
        source !== "projectSettings" &&
        isSandboxFilesystemPathRelative(resolve) &&
        getRuleAnchorRootForSource(source) === getRuleAnchorRootForSource("projectSettings"),
    };
  } catch {
    return {
      kind: "unresolvable",
      source,
      resolved: [],
      file: getWritableSettingsPathForSource(source),
    };
  }
}
//@ chunk-e6aww6q8.js:1910559-1910780 placement
function maskSweepSpellings(sandboxDenyReadEntry) {
  let isWindows = getPlatform() === "windows";
  let index = sandboxDenyReadEntry.search(isWindows ? /[*?]/ : /[*?[\]]/);
  let prefix =
    index === -1
      ? sandboxDenyReadEntry.length
      : Math.max(
          sandboxDenyReadEntry.lastIndexOf("/", index),
          isWindows ? sandboxDenyReadEntry.lastIndexOf("\\", index) : -1,
        );
  if (prefix <= 0) return [sandboxDenyReadEntry];
  let canonicalizedEntry =
    canonicalizePathForMaskSweep(sandboxDenyReadEntry.slice(0, prefix)) + sandboxDenyReadEntry.slice(prefix);
  return canonicalizedEntry === sandboxDenyReadEntry
    ? [sandboxDenyReadEntry]
    : [sandboxDenyReadEntry, canonicalizedEntry];
}
//@ chunk-e6aww6q8.js:1910780-1911738 placement
function classifySyncedFileSensitivity(
  options = resolveUploadFilterRules(),
  {
    isCredentialListCountedFromOutsideRoot: countedOutside = false,
    onLaunchPlaceUnknown: onUnknown = () => {},
    onlyAsLaunched = false,
  } = {},
) {
  let ignoreOptions = (root, realRoot) => options;
  return {
    withholdFor: async (root) => {
      let realRoot = await realpath(root).catch(() => null);
      if (realRoot === null) return () => true;
      let dirSyncRules = resolveDirSyncRules(root, {
        realRoot,
        readRules: ignoreOptions(root, realRoot),
        onlyAsLaunched,
        readsDenialsNarrowly: true,
      });
      if (dirSyncRules.isLaunchPlaceUnknown) onUnknown();
      return (path) => {
        switch (dirSyncRules(path, true)) {
          case "read_denied":
          case "rules_unreadable":
          case "sensitive":
          case "sensitive_tracked":
          case "content_filter":
          case "host_config":
            return true;
          case null:
            return false;
        }
      };
    },
    neverReadFor: async (root) => {
      let realRoot = await realpath(root).catch(() => null);
      if (realRoot === null) return () => true;
      let dirSyncRules = resolveDirSyncRules(root, {
        realRoot,
        readRules: options,
        onlyAsLaunched,
        readsDenialsNarrowly: true,
        hostConfig: UNCOVERED_ROOT,
      });
      return (filePath) => {
        switch (dirSyncRules(filePath, true)) {
          case "read_denied":
          case "rules_unreadable":
            return true;
          case "host_config":
          case "sensitive":
          case "sensitive_tracked":
          case "content_filter":
          case null:
            return false;
        }
      };
    },
    rulesUnreadable: !options.complete,
    unreadableSettingsFiles: options.unreadableSettingsFiles ?? [],
  };
}
//@ chunk-e6aww6q8.js:1911738-1911748 placement
var MAX_LISTED_FAILURES = 3;
//@ chunk-e6aww6q8.js:1911748-1911921 placement = formatFailureDetails (0.777)
function formatFailureDetails_3(errors) {
  if (errors === undefined || errors.length === 0) return "";
  let mapped = errors
    .slice(0, MAX_LISTED_FAILURES)
    .map((failure) => readHeadAndTail(sanitizeDisplayText(tildify(failure)), 120));
  let remaining = errors.length - mapped.length;
  return `${mapped.join(", ")}${remaining > 0 ? ` and ${remaining} more` : ""}`;
}
//@ chunk-e6aww6q8.js:1911921-1911987 placement
function settingsReadErrorsSuffix(errors) {
  let details = formatFailureDetails_3(errors);
  return details === "" ? "" : ` (errors in ${details})`;
}
//@ chunk-e6aww6q8.js:1911987-1912056 placement
/**
 * 「设置未能全部读取」提示。
 */
function settingsReadFailureText(errors) {
  return `your settings could not all be read${settingsReadErrorsSuffix(errors)}`;
}
export {
  collectLaunchRules,
  classifySyncedFileSensitivity,
  resolveUploadFilterRules,
  settingsReadErrorsSuffix,
  resolveDirSyncRules,
  logDirSyncHostConfig,
  formatFailureDetails_3,
  settingsReadFailureText,
};
