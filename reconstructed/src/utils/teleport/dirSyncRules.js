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
import { join, relative, sep, isAbsolute } from "path";
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
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
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

//@ chunk-e6aww6q8.js:1897069-1899609 placement
/**
 * 解析目录同步规则（启动位置、项目设置、根目录规则）。
 */
function resolveDirSyncRules(
  e,
  {
    realRoot: n = e,
    readRules: r = resolveUploadFilterRules({}),
    narrowRules: s,
    onlyAsLaunched: h = false,
    readsDenialsNarrowly: y = false,
    hostConfig: S,
    namesCredential: w,
  } = {},
) {
  let L = r;
  let G = n === e ? [e] : [e, n];
  let q = S ?? checkManagedConfigFile(e, n);
  if (q.ground !== null)
    return Object.assign(() => "rules_unreadable", {
      unreadableSettingsFiles: L.unreadableSettingsFiles,
      hostConfigGround: q.ground,
      hostConfig: q,
      deniesWrite: () => true,
    });
  let namesCredential = isSensitiveNameOrVariant;
  let Se = launchDirInfo(G, n, L.fromRoot?.root);
  let ke = !h
    ? Se
    : Se === "unknown"
      ? EMPTY_LAUNCH_DIR_INFO
      : {
          ...Se,
          isBelowRoot: false,
        };
  if (!h)
    logUploadFilterEvent(
      n,
      "launch_place",
      Se === "unknown"
        ? {
            placed: false,
          }
        : {
            placed: true,
            launch_dir_resolved: Se.isLaunchDirResolved,
            respelled: Se.launchDirSpellings.length > 1,
            below_root: Se.isBelowRoot,
            root_was_read: Se.isRootThatWasRead,
            ...{},
          },
    );
  if (ke === "unknown")
    return Object.assign(() => "rules_unreadable", {
      unreadableSettingsFiles: L.unreadableSettingsFiles,
      isLaunchPlaceUnknown: true,
      hostConfig: q,
      deniesWrite: () => true,
      ...{},
    });
  let isBelowRoot = ke.isBelowRoot;
  let fromRoot = ke.isRootThatWasRead ? L.fromRoot : undefined;
  let any = (L.ruleSetsApart ?? [])
    .flat()
    .some(({ ruleValue: { ruleContent = "" } }) =>
      [ruleContent, foldPathCase(ruleContent)].some((At) => At.includes("!")),
    );
  let Me = ((gt, At) => {
    let It = (rules, rn) =>
      checkDirSyncRule(
        G,
        {
          ...L,
          rules,
        },
        gt,
        rn,
        ke.resolvedPathBelowRoot,
        At,
        y,
      );
    let Yt = [L.rules, ...(any ? (L.ruleSetsApart ?? []) : [])];
    let qt = [
      ...Yt.map((Zt) => It(Zt, "as_given")),
      ...(isBelowRoot
        ? [
            ...Yt.map((Zt) =>
              It(
                Zt.filter((rn) => rn.source !== "projectSettings" && isRuleAnchoredAtProjectRoot(rn)),
                "as_from_root",
              ),
            ),
            ...(fromRoot?.ruleSets ?? []).flatMap((Zt) => [
              It(Zt.filter(isRuleAnchoredAtProjectRoot), "as_from_root"),
              It(
                Zt.filter((rn) => !isRuleAnchoredAtProjectRoot(rn)),
                "as_given",
              ),
            ]),
          ]
        : []),
    ];
    return {
      getReasonForFile: (Zt) => qt.reduce((acc, pn) => acc ?? pn.getReasonForFile(Zt), null),
      reasonForEveryFile: qt.reduce((acc, rn) => acc ?? rn.reasonForEveryFile, null),
    };
  })("read");
  let We = () => null;
  let ze = null;
  let syncDenyFilter = createSyncDenyFilter(G, L.sandbox, getPlatform(), y);
  let syncDenyFilter_2 = createSyncDenyFilter(
    ke.launchDirSpellings,
    fromRoot?.sandbox ?? EMPTY_DIR_SYNC_RULES,
    getPlatform(),
    y,
  );
  let sandboxMovedToRoot = L.sandboxMovedToRoot ?? EMPTY_DIR_SYNC_RULES;
  let syncDenyFilter_3 = createSyncDenyFilter(
    ke.launchDirSpellings,
    {
      ...sandboxMovedToRoot,
      reopens: [
        ...sandboxMovedToRoot.reopens,
        ...uniq(
          L.sandbox.reopens
            .filter((reopen) => !sandboxMovedToRoot.reopens.includes(reopen))
            .flatMap((reopen) => G.flatMap((At) => relativePosixPath(At, reopen) ?? [])),
        ).flatMap((gt) => ke.launchDirSpellings.map((launchDirSpelling) => join(launchDirSpelling, gt))),
      ],
    },
    getPlatform(),
    y,
  );
  let Et = (gt) => syncDenyFilter(gt) || (isBelowRoot && (syncDenyFilter_2(gt) || syncDenyFilter_3(gt)));
  return Object.assign(
    (gt, At) => {
      if (exceedsPathVariantBudget(gt))
        return Me.reasonForEveryFile ?? (At ? "sensitive_tracked" : "sensitive");
      let pathNormalizationVariants = getPathNormalizationVariants(gt);
      let Yt = [gt, ...(pathNormalizationVariants ?? [])];
      let qt =
        Yt.reduce((acc, rn) => acc ?? Me.getReasonForFile(rn), null) ?? (Yt.some(Et) ? "read_denied" : null);
      if (pathNormalizationVariants === null) return qt ?? (At ? "sensitive_tracked" : "sensitive");
      return (
        qt ??
        (isSensitiveSyncedPath(gt, {
          tracked: At,
          readings: pathNormalizationVariants,
          namesCredential,
        })
          ? At
            ? "sensitive_tracked"
            : "sensitive"
          : null) ??
        (q.covers(gt) ||
        pathNormalizationVariants.some((pathNormalizationVariant) => q.covers(pathNormalizationVariant))
          ? "host_config"
          : null)
      );
    },
    {
      unreadableSettingsFiles: L.unreadableSettingsFiles,
      hostConfig: q,
      deniesWrite: (gt) => We(gt) !== null,
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
var DENY_OR_ASK_BEHAVIORS = ["deny", "ask"];
var EDIT_WRITE_TOOL_STUBS = [FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME].map((name) => ({
  name,
  mcpInfo: undefined,
  familyParentToolName: undefined,
  aliasSkillToolNames: undefined,
}));
var ASCII_ONLY_RE_2 = /^[\x00-\x7f]*$/;
var LINE_BREAK_RE = /[\n\r\u2028\u2029]/g;
var MAX_LINE_BREAK_VARIANTS = 16;
//@ chunk-e6aww6q8.js:1899938-1900070 placement
function lineBreakVariants(e) {
  return [
    e,
    ...Array.from(e.matchAll(LINE_BREAK_RE))
      .slice(0, MAX_LINE_BREAK_VARIANTS)
      .map(({ index }) => e.slice(0, index) + e.slice(index).replace(LINE_BREAK_RE, "\x01")),
  ];
}
//@ chunk-e6aww6q8.js:1900070-1902037 placement
/**
 * 检查一条路径是否被目录同步规则拒绝读取或编辑。
 */
function checkDirSyncRule(e, { rules, complete }, s, h, resolvedPathBelowRoot, S = "deny", w) {
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
  let q = ((yt) => ({
    asWritten: applyPermissionRulesToPermissionContext(getEmptyToolPermissionContext(), [...rules], yt),
    folded: applyPermissionRulesToPermissionContext(getEmptyToolPermissionContext(), mapped, yt),
  }))();
  if (
    s === "read"
      ? getDenyRuleForTool(q.asWritten, READ_PATH_PROBE) !== null ||
        getAskRuleForTool(q.asWritten, READ_PATH_PROBE) !== null
      : EDIT_WRITE_TOOL_STUBS.some(
          (yt) => (S === "deny" ? getDenyRuleForTool : getAskRuleForTool)(q.asWritten, yt) !== null,
        )
  )
    return staticReasonResult("read_denied");
  let filtered = (s === "read" ? DENY_OR_ASK_BEHAVIORS : [S]).filter(
    (yt) =>
      getContentRulesMapForToolName(q.asWritten, s === "read" ? FILE_READ_TOOL_NAME : FILE_EDIT_TOOL_NAME, yt)
        .size > 0,
  );
  if (filtered.length === 0) return staticReasonResult(null);
  let all = [...e, ...rules.map((rule) => rule.ruleValue.ruleContent ?? "")].every((yt) =>
    ASCII_ONLY_RE_2.test(yt),
  );
  let originalCwd = getOriginalCwd();
  let Ee = () => {};
  let Ae = {
    unjudgedCountsAsMatched: !w,
    asSpelledOnly: true,
  };
  let Ie = (yt, gt, At) => {
    Ee(yt);
    return matchingRuleForInput(yt, q[gt], s, At, Ae) !== null;
  };
  let Me = (yt, gt) =>
    yt.some((At) => (At.match(LINE_BREAK_RE)?.length ?? 0) > MAX_LINE_BREAK_VARIANTS) ||
    uniq(yt.flatMap(lineBreakVariants)).some((At) =>
      filtered.some(
        (It) =>
          (s === "edit" && S === "deny" && At !== At.trim()) ||
          Ie(At, gt, It) ||
          (At !== At.trimEnd() && Ie(`${At}/.`, gt, It)),
      ),
    );
  let mapped_2 = Ji(
    [
      ...e.flatMap((yt) => {
        let gt = relativePosixPath(yt, originalCwd);
        return gt === null
          ? []
          : [
              {
                directory: join(yt, gt),
                below: gt,
              },
            ];
      }),
      ...(resolvedPathBelowRoot !== null && !(resolvedPathBelowRoot === "" && e.includes(originalCwd))
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
  let ze = (yt, gt) => {
    let At = mapped_2.length > 0 ? yt.split("/") : [];
    return mapped_2.flatMap(({ directory, depth, foldedBelow }) =>
      At.length > depth && foldPathCase(At.slice(0, depth).join("/")) === foldedBelow
        ? [join(directory, gt(At.slice(depth).join("/")))]
        : [],
    );
  };
  let lt = (yt) => [join(originalCwd, yt)];
  let Je = (yt) =>
    h === "as_from_root" ? lt(yt) : uniq([...e.map((gt) => join(gt, yt)), ...ze(yt, (gt) => gt)]);
  let nt = (yt) =>
    h === "as_from_root"
      ? lt(foldPathCase(yt))
      : [
          ...ze(yt, foldPathCase),
          ...e.flatMap((gt) => [join(gt, foldPathCase(yt)), foldPathCase(join(gt, yt))]),
        ];
  let pt = (yt) => {
    let gt = nt(yt);
    try {
      return Me(gt, "asWritten") || Me(gt, "folded");
    } catch {
      return true;
    }
  };
  return {
    getReasonForFile: (yt) =>
      runInRemoteCallFrameMain(
        originalCwd,
        () =>
          Me(Je(yt), "asWritten") ||
          (!(all && ASCII_ONLY_RE_2.test(yt)) &&
            pt(yt.trimEnd() + yt.slice(yt.trimEnd().length).replaceAll("\uFEFF", " "))),
      )
        ? "read_denied"
        : null,
    reasonForEveryFile: null,
  };
}
//@ chunk-e6aww6q8.js:1902037-1902105 placement
function staticReasonResult(e) {
  return {
    getReasonForFile: () => e,
    reasonForEveryFile: e,
  };
}
//@ chunk-e6aww6q8.js:1902105-1902716 placement
/**
 * 计算上传过滤规则：合并启动规则与仓库根目录规则，按过滤根目录换算路径。
 */
function resolveUploadFilterRules({
  filterRoot,
  isCredentialListCountedFromOutsideRoot: n = false,
  syncedRoot,
  launchRules = collectLaunchRules(syncedRoot),
} = {}) {
  let originalCwdOrNull = getOriginalCwdOrNull();
  let root = originalCwdOrNull === null ? null : findGitRoot(originalCwdOrNull);
  let rules = addLaunchRules(root, launchRules, {
    syncedRoot,
  });
  if (filterRoot === undefined || originalCwdOrNull === null) return rules;
  let w = (ke, we) => ke;
  if (filterRoot === root) return w(rules, relativePosixPath(filterRoot, originalCwdOrNull) !== null);
  let [L, G, q] = [filterRoot, originalCwdOrNull, root].map((ke) =>
    ke === null ? null : nativeRealpathLong(ke),
  );
  if (root !== null && (q === L || (q === null && rules.fromRoot !== undefined)))
    return w(rules, relativePosixPath(root, originalCwdOrNull) !== null);
  let Z = {
    isLaunchDirBelowRoot:
      relativePosixPath(filterRoot, originalCwdOrNull) !== null ||
      (L != null && G != null && relativePosixPath(L, G) !== null),
  };
  let Se = addLaunchRules(
    filterRoot,
    addLaunchRules(filterRoot, rules, {
      asFiltersOwnRoot: Z,
      syncedRoot,
    }),
    {
      asFiltersOwnRoot: Z,
      source: "localSettings",
      syncedRoot,
    },
  );
  return w(Se, Z.isLaunchDirBelowRoot);
}
//@ chunk-e6aww6q8.js:1902716-1902757 placement
function filterPermissionErrors(errors, n, r) {
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
  let h = (rule) => jsonStringify([rule.source, rule.ruleBehavior, rule.ruleValue]);
  let y = new Set(frozenRules.rules.map(h));
  return {
    rules: [...frozenRules.rules, ...liveRules.rules.filter((rule) => !y.has(h(rule)))],
    ruleSetsApart: Ji(
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
function loadDirSyncRules(e, userRules, syncedRoot) {
  invalidateCommandNames();
  let { errors } = getSettingsWithErrors_2();
  let filtered = loadAllPermissionRulesFromDisk().filter(
    (lt) => lt.ruleBehavior === "deny" || lt.ruleBehavior === "ask",
  );
  let y = new Set(filtered.map((lt) => jsonStringify(lt)));
  let filtered_2 = settingsJsonToRules(userRules ?? null, "userSettings").filter(
    (lt) => lt.ruleBehavior !== "allow",
  );
  let w = [...filtered, ...filtered_2.filter((lt) => !y.has(jsonStringify(lt)))];
  let L = launchDenyRulesForRead(FILE_READ_TOOL_NAME, [READ_PATH_PROBE]);
  let G = [];
  let q = shouldAllowManagedReadPathsOnly();
  let flattened = SETTING_SOURCES.flatMap((lt) => sandboxReadEntriesForSource(lt, q));
  let Se =
    userRules === undefined
      ? []
      : sandboxReadEntriesForSource("userSettings", q, {
          settings: withWindowsSandboxSpellings(userRules),
        });
  let ke = new Set(Se.flatMap((lt) => (lt.kind === "reopen" ? lt.resolved : [])));
  let we = [
    ...flattened.filter(
      (lt) =>
        userRules === undefined ||
        lt.kind !== "reopen" ||
        lt.source !== "userSettings" ||
        lt.resolved.every((Je) => ke.has(Je)),
    ),
    ...Se.filter((lt) => lt.kind !== "reopen"),
  ];
  let Ae = filterPermissionErrors(errors, syncedRoot, () =>
    [
      ...REPO_DIR_SETTING_SOURCE_LIST.map((lt) => ({
        source: lt,
        file: getSettingsFilePathForSource(lt),
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
  let filtered_3 = we.filter((lt) => lt.kind === "unresolvable");
  let complete = Ae.length === 0 && filtered_3.length === 0;
  let We = (lt, Je = we) => uniq(Je.flatMap((nt) => (nt.kind === lt ? nt.resolved : [])));
  let filtered_4 = we.filter((lt) => lt.isMovedToRoot === true);
  if (e)
    logDirSyncUploadRules({
      read_rules: w.length,
      startup_read_rules: L.length,
      sandbox_deny_read: count(we, (lt) => lt.kind === "deny_read"),
      sandbox_credential_files: count(we, (lt) => lt.kind === "credential_file"),
      sandbox_reopens: count(we, (lt) => lt.kind === "reopen"),
      sandbox_from_user: we.some((lt) => lt.source === "userSettings"),
      sandbox_from_project: we.some((lt) => REPO_DIR_SETTING_SOURCES.has(lt.source)),
      sandbox_from_flag: we.some((lt) => lt.source === "flagSettings"),
      sandbox_from_managed: we.some((lt) => lt.source === "policySettings"),
      complete,
      ...{},
    });
  return {
    rules: [...w, ...L, ...G],
    ruleSetsApart: [filtered, filtered_2],
    sandbox: {
      denies: We("deny_read"),
      credentials: We("credential_file"),
      reopens: We("reopen"),
    },
    sandboxMovedToRoot: {
      denies: We("deny_read", filtered_4),
      credentials: We("credential_file", filtered_4),
      reopens: We("reopen", filtered_4),
    },
    complete,
    unreadableSettingsFiles: uniq([
      ...Ae.flatMap((lt) => lt.file ?? []),
      ...filtered_3.flatMap((lt) => lt.file ?? []),
    ]),
  };
}
//@ chunk-e6aww6q8.js:1905458-1905574 placement
function relativePosixPath(e, n) {
  let r = relative(e, n);
  return r === "" || r === ".." || r.startsWith(".." + sep) || isAbsolute(r) ? null : r.split(sep).join("/");
}
//@ chunk-e6aww6q8.js:1905574-1905624 placement
function relativePosixOrNull(e, n) {
  return relative(e, n) === "" ? "" : relativePosixPath(e, n);
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
function launchDirInfo(e, n, root) {
  let originalCwdOrNull = getOriginalCwdOrNull();
  if (originalCwdOrNull === null) return EMPTY_LAUNCH_DIR_INFO;
  let h = nativeRealpathLong(originalCwdOrNull);
  let y = root === undefined || e.includes(root) ? n : nativeRealpathLong(root);
  if (y === null || (h === null && !e.some((w) => relativePosixOrNull(w, originalCwdOrNull) !== null)))
    return "unknown";
  let S = h === null ? null : relativePosixOrNull(n, h);
  return {
    launchDirSpellings: uniq([originalCwdOrNull, h ?? originalCwdOrNull]),
    isLaunchDirResolved: h !== null,
    resolvedPathBelowRoot: S,
    isBelowRoot: (S !== null && S !== "") || e.some((w) => relativePosixPath(w, originalCwdOrNull) !== null),
    isRootThatWasRead: root !== undefined && relativePosixOrNull(n, y) === "",
  };
}
//@ chunk-e6aww6q8.js:1906136-1906426 placement
function isPermissionSettingsError(e) {
  return (
    isBlockingSandboxSettingsError(e) ||
    (!e.removal &&
      (e.path === "permissions" ||
        (e.path.startsWith("permissions.") && !e.path.startsWith("permissions.allow")) ||
        (e.path.startsWith("sandbox.filesystem") &&
          !e.path.startsWith("sandbox.filesystem.allowRead") &&
          !e.path.startsWith("sandbox.filesystem.allowWrite"))))
  );
}
//@ chunk-e6aww6q8.js:1906426-1906585 placement
function isBlockingSandboxSettingsError(e) {
  return (
    !e.removal &&
    (e.severity !== "warning" ||
      e.path === "sandbox" ||
      e.path === "sandbox.credentials" ||
      e.path.startsWith("sandbox.credentials.files"))
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
  let G = withWindowsSandboxSpellings(settings);
  let q = filterPermissionErrors(errors, syncedRoot, () => [settingsPath]);
  let filtered = settingsJsonToRules(G, source).filter((ze) => ze.ruleBehavior !== "allow");
  let Se = (isSandboxFilesystemPathRelative) =>
    sandboxReadEntriesForSource(source, true, {
      settings: {
        sandbox: {
          filesystem: {
            denyRead: G?.sandbox?.filesystem?.denyRead?.filter(isSandboxFilesystemPathRelative),
          },
          credentials: {
            files: G?.sandbox?.credentials?.files?.filter((file) =>
              isSandboxFilesystemPathRelative(file.path),
            ),
          },
        },
      },
    });
  let ke = Se(isSandboxFilesystemPathRelative);
  let we = Se((ze) => !isSandboxFilesystemPathRelative(ze));
  let Ee = q.length === 0 && ![...ke, ...we].some((ze) => ze.kind === "unresolvable");
  logUploadFilterEvent(settingsPath, "root_project_rules", {
    rules: filtered.length,
    sandbox_entries: ke.length + we.length,
    complete: Ee,
    ...(asFiltersOwnRoot !== undefined && {
      read_as_filters_own_root: true,
      local_settings: source === "localSettings",
    }),
  });
  let Ae = (ze, lt) => ze.flatMap((Je) => (Je.kind === lt ? Je.resolved : []));
  let Ie = rulesWithFrozenRepo(settingsPath, Ee && !errors.some(isPermissionSettingsError), {
    rules: filtered,
    relative: {
      denies: Ae(ke, "deny_read"),
      credentials: Ae(ke, "credential_file"),
    },
    other: {
      denies: Ae(we, "deny_read"),
      credentials: Ae(we, "credential_file"),
    },
  });
  let Me = (ze, lt = []) => uniq([...lt, ...Ie.flatMap(ze)]);
  let fromRoot = rules.fromRoot?.root === root ? rules.fromRoot : undefined;
  return {
    ...rules,
    sandbox: {
      ...rules.sandbox,
      denies: Me((ze) => ze.other.denies, rules.sandbox.denies),
      credentials: Me((ze) => ze.other.credentials, rules.sandbox.credentials),
    },
    fromRoot: {
      root,
      ruleSets: [...(fromRoot?.ruleSets ?? []), ...Ie.map((ze) => ze.rules)],
      sandbox: {
        denies: Me((ze) => ze.relative.denies, fromRoot?.sandbox.denies),
        credentials: Me((ze) => ze.relative.credentials, fromRoot?.sandbox.credentials),
        reopens: [],
      },
    },
    complete: rules.complete && Ee,
    unreadableSettingsFiles: Ee
      ? rules.unreadableSettingsFiles
      : uniq([...(rules.unreadableSettingsFiles ?? []), settingsPath]),
  };
}
//@ chunk-e6aww6q8.js:1908176-1908227 placement
var repoFreezeRuleCache = identity_2(new Map(), (e) => e.clear());
var weakSet_4 = new WeakSet();
//@ chunk-e6aww6q8.js:1908227-1908419 placement
function rulesWithFrozenRepo(settingsPath, n, r) {
  if (!isRepoTierFreezeHeld()) return [r];
  let s = commandSyncNameState();
  if (!weakSet_4.has(s)) {
    weakSet_4.add(s);
    s.onInvalidate(() => {
      if (!isRepoTierFreezeHeld()) repoFreezeRuleCache.clear();
    });
  }
  let h = repoFreezeRuleCache.get(settingsPath);
  if (h !== undefined) return [h, r];
  if (n) repoFreezeRuleCache.set(settingsPath, r);
  return [r];
}
//@ chunk-e6aww6q8.js:1908419-1908583 placement
function launchDenyRulesForRead(e, n) {
  return launchDenyRules(getLaunchPermissions()).filter((r) =>
    r.ruleValue.ruleContent !== undefined
      ? r.ruleValue.toolName === e
      : r.source === "session" &&
        n.some((s) => getDenyRuleForTool(getEmptyToolPermissionContext(), s, [r]) !== null),
  );
}
//@ chunk-e6aww6q8.js:1908583-1908627 placement
var lastLoggedUploadRules = null;
var lastLoggedHostConfig = identity_2(new Map(), (e) => e.clear());
//@ chunk-e6aww6q8.js:1908627-1908740 placement
function logDirSyncHostConfig(e, n, r) {
  let s = jsonStringify(n);
  if (lastLoggedHostConfig.get(e) === s) return;
  lastLoggedHostConfig.set(e, s);
  logEvent("tengu_dir_sync_host_config", {
    ...n,
    ...r,
  });
}
//@ chunk-e6aww6q8.js:1908740-1908775 placement
var lastLoggedFilterEvent = identity_2(new Map(), (e) => e.clear());
//@ chunk-e6aww6q8.js:1908775-1908876 placement
function logUploadFilterEvent(e, n, r) {
  let s = jsonStringify(r);
  if (lastLoggedFilterEvent.get(e) === s) return;
  lastLoggedFilterEvent.set(e, s);
  logEvent(`tengu_upload_filter_${n}`, r);
}
//@ chunk-e6aww6q8.js:1908876-1909100 placement
function logDirSyncUploadRules(e) {
  let n =
    e.complete &&
    e.dropped_entries_ignored === undefined &&
    e.read_rules + e.startup_read_rules + e.sandbox_deny_read + e.sandbox_credential_files === 0;
  let r = jsonStringify(e);
  if (n || r === lastLoggedUploadRules) return;
  lastLoggedUploadRules = r;
  logEvent("tengu_dir_sync_upload_rules", e);
}
//@ chunk-e6aww6q8.js:1909192-1909843 placement
/**
 * 收集某个设置源的沙箱读取相关条目，无法解析时标记为 unresolvable。
 */
function sandboxReadEntriesForSource(source, n, r) {
  let s = isSettingSourceEnabled(source);
  let h = REPO_DIR_SETTING_SOURCES.has(source);
  if (!s && h) return [];
  let y = s ? undefined : getWritableSettingsPathForSource(source);
  if (y !== undefined && !isReadableSettingsFile(y))
    return [
      {
        kind: "unresolvable",
        source,
        resolved: [],
        file: y,
      },
    ];
  let sandbox = (r?.settings ?? withWindowsSandboxSpellings(getSettingsForSourceTightenOnly(source)))
    ?.sandbox;
  let w = s ? (sandbox?.filesystem?.denyRead ?? []) : [];
  let mapped = (sandbox?.credentials?.files ?? []).map((q) => q.path);
  let G =
    s &&
    !h &&
    (!env.CLAUDE_CODE_EVAL_CONFINED || source === "userSettings") &&
    (!n || source === "policySettings")
      ? (sandbox?.filesystem?.allowRead ?? []).filter((q) => q.trim() !== "")
      : [];
  return [
    ...w.map((q) =>
      resolveSandboxReadEntry("deny_read", source, q, () =>
        maskSweepSpellings(resolveSandboxDenyReadEntry(q, source)),
      ),
    ),
    ...mapped.map((q) =>
      resolveSandboxReadEntry("credential_file", source, q, () =>
        maskSweepSpellings(resolveSandboxDenyReadEntry(q, source)),
      ),
    ),
    ...G.flatMap((q) => {
      let sandboxReadEntry = resolveSandboxReadEntry("reopen", source, q, () => [
        resolveSandboxFilesystemPath(q, source),
      ]);
      return sandboxReadEntry.kind === "reopen" ? [sandboxReadEntry] : [];
    }),
  ];
}
//@ chunk-e6aww6q8.js:1909843-1910215 placement
/**
 * 在 Windows 上为沙箱拒绝路径补上大小写/别名拼写，避免漏拒。
 */
function withWindowsSandboxSpellings(e) {
  let sandbox = e?.sandbox;
  if (getPlatform() !== "windows" || !e || !sandbox) return e;
  return {
    ...e,
    sandbox: {
      ...sandbox,
      filesystem: sandbox.filesystem && {
        ...sandbox.filesystem,
        denyRead: sandbox.filesystem.denyRead?.flatMap((r) => {
          let s = sandboxFilesystemPathAsReadEarlier(r);
          return s === null ? [r] : [r, s];
        }),
      },
      credentials: sandbox.credentials && {
        ...sandbox.credentials,
        files: sandbox.credentials.files?.flatMap((file) => {
          let s = sandboxFilesystemPathAsReadEarlier(file.path);
          return s === null
            ? [file]
            : [
                file,
                {
                  ...file,
                  path: s,
                },
              ];
        }),
      },
    },
  };
}
//@ chunk-e6aww6q8.js:1910215-1910292 placement = getEnabledSettingSources (1)
function getWritableSettingsPathForSource(e) {
  return e === "policySettings" || e === "flagSettings" ? undefined : getSettingsFilePathForSource(e);
}
//@ chunk-e6aww6q8.js:1910292-1910338 placement
function isReadableSettingsFile(e) {
  return !parseSettingsFile(e).errors.some(isBlockingSandboxSettingsError);
}
//@ chunk-e6aww6q8.js:1910338-1910559 placement
function resolveSandboxReadEntry(kind, source, r, s) {
  try {
    return {
      kind,
      source,
      resolved: s(),
      isMovedToRoot:
        getOriginalCwdOrNull() !== null &&
        source !== "projectSettings" &&
        isSandboxFilesystemPathRelative(r) &&
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
  let n = getPlatform() === "windows";
  let r = sandboxDenyReadEntry.search(n ? /[*?]/ : /[*?[\]]/);
  let s =
    r === -1
      ? sandboxDenyReadEntry.length
      : Math.max(
          sandboxDenyReadEntry.lastIndexOf("/", r),
          n ? sandboxDenyReadEntry.lastIndexOf("\\", r) : -1,
        );
  if (s <= 0) return [sandboxDenyReadEntry];
  let h = canonicalizePathForMaskSweep(sandboxDenyReadEntry.slice(0, s)) + sandboxDenyReadEntry.slice(s);
  return h === sandboxDenyReadEntry ? [sandboxDenyReadEntry] : [sandboxDenyReadEntry, h];
}
//@ chunk-e6aww6q8.js:1910780-1911738 placement
function classifySyncedFileSensitivity(
  e = resolveUploadFilterRules(),
  {
    isCredentialListCountedFromOutsideRoot: n = false,
    onLaunchPlaceUnknown: r = () => {},
    onlyAsLaunched: s = false,
  } = {},
) {
  let y = (S, w) => e;
  return {
    withholdFor: async (S) => {
      let w = await realpath(S).catch(() => null);
      if (w === null) return () => true;
      let dirSyncRules = resolveDirSyncRules(S, {
        realRoot: w,
        readRules: y(S, w),
        onlyAsLaunched: s,
        readsDenialsNarrowly: true,
      });
      if (dirSyncRules.isLaunchPlaceUnknown) r();
      return (G) => {
        switch (dirSyncRules(G, true)) {
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
    neverReadFor: async (S) => {
      let w = await realpath(S).catch(() => null);
      if (w === null) return () => true;
      let dirSyncRules = resolveDirSyncRules(S, {
        realRoot: w,
        readRules: e,
        onlyAsLaunched: s,
        readsDenialsNarrowly: true,
        hostConfig: UNCOVERED_ROOT,
      });
      return (G) => {
        switch (dirSyncRules(G, true)) {
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
    rulesUnreadable: !e.complete,
    unreadableSettingsFiles: e.unreadableSettingsFiles ?? [],
  };
}
//@ chunk-e6aww6q8.js:1911738-1911748 placement
var MAX_LISTED_FAILURES = 3;
//@ chunk-e6aww6q8.js:1911748-1911921 placement = formatFailureDetails (0.777)
function formatFailureDetails_3(e) {
  if (e === undefined || e.length === 0) return "";
  let mapped = e
    .slice(0, MAX_LISTED_FAILURES)
    .map((s) => readHeadAndTail(sanitizeDisplayText(tildify(s)), 120));
  let remaining = e.length - mapped.length;
  return `${mapped.join(", ")}${remaining > 0 ? ` and ${remaining} more` : ""}`;
}
//@ chunk-e6aww6q8.js:1911921-1911987 placement
function settingsReadErrorsSuffix(e) {
  let n = formatFailureDetails_3(e);
  return n === "" ? "" : ` (errors in ${n})`;
}
//@ chunk-e6aww6q8.js:1911987-1912056 placement
/**
 * 「设置未能全部读取」提示。
 */
function settingsReadFailureText(e) {
  return `your settings could not all be read${settingsReadErrorsSuffix(e)}`;
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
