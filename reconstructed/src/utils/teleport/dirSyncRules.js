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
} from "path";
import {
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  realpath as realpath_10,
  realpath as realpath_11,
  realpath as realpath_12,
  realpath as realpath_13,
  realpath as realpath_14,
  realpath as realpath_15,
  realpath as realpath_16,
  realpath as realpath_17,
  realpath as realpath_18,
  realpath as realpath_19,
  realpath as realpath_20,
  realpath as realpath_21,
  realpath as realpath_22,
  realpath as realpath_23,
  realpath as realpath_24,
  realpath as realpath_25,
  realpath as realpath_26,
  realpath as realpath_27,
  realpath as realpath_28,
  realpath as realpath_29,
  realpath as realpath_30,
  realpath as realpath_31,
  realpath as realpath_32,
  realpath as realpath_33,
  realpath as realpath_34,
  realpath as realpath_35,
  realpath as realpath_36,
  realpath as realpath_37,
  realpath as realpath_38,
} from "fs/promises";
import {
  checkManagedConfigFile,
  createSyncDenyFilter,
  tXe,
  isSensitiveSyncedPath,
  launchDenyRules,
  OWt,
  wB,
} from "./dirSync.js";
import { _H, QSn, getPathNormalizationVariants } from "../permissions/sensitivePaths.js";
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
import { Yg } from "../../remote/remoteMode.js";
import { findGitRoot } from "../git.js";
import { Tm } from "../windowsUncPaths.js";
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
import { or, is } from "../settings/commandSyncNames.js";
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
import { ge } from "../identity.js";
import { logEvent } from "../../services/analytics/index.js";
import { env } from "../env.js";
import { readHeadAndTail } from "../printableName.js";
import { sanitizeDisplayText } from "../resultError.js";
import { tildify } from "../path.js";

/**
 * 解析目录同步规则（启动位置、项目设置、根目录规则）。
 */
//@ chunk-e6aww6q8.js:1897069-1899609 placement
function resolveDirSyncRules(
  e,
  {
    realRoot: n = e,
    readRules: r = resolveUploadFilterRules({}),
    narrowRules: s,
    onlyAsLaunched: h = !1,
    readsDenialsNarrowly: y = !1,
    hostConfig: S,
    namesCredential: w,
  } = {},
) {
  let L = r,
    G = n === e ? [e] : [e, n],
    q = S ?? checkManagedConfigFile(e, n);
  if (q.ground !== null)
    return Object.assign(() => "rules_unreadable", {
      unreadableSettingsFiles: L.unreadableSettingsFiles,
      hostConfigGround: q.ground,
      hostConfig: q,
      deniesWrite: () => !0,
    });
  let Z = _H,
    Se = mer(G, n, L.fromRoot?.root),
    ke = !h ? Se : Se === "unknown" ? EMPTY_LAUNCH_DIR_INFO : { ...Se, isBelowRoot: !1 };
  if (!h)
    logUploadFilterEvent(
      n,
      "launch_place",
      Se === "unknown"
        ? { placed: !1 }
        : {
            placed: !0,
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
      isLaunchPlaceUnknown: !0,
      hostConfig: q,
      deniesWrite: () => !0,
      ...{},
    });
  let isBelowRoot = ke.isBelowRoot,
    Ee = ke.isRootThatWasRead ? L.fromRoot : void 0,
    any = (L.ruleSetsApart ?? [])
      .flat()
      .some(({ ruleValue: { ruleContent: gt = "" } }) =>
        [gt, foldPathCase(gt)].some((At) => At.includes("!")),
      ),
    Me = ((gt, At) => {
      let It = (Zt, rn) => checkDirSyncRule(G, { ...L, rules: Zt }, gt, rn, ke.resolvedPathBelowRoot, At, y),
        Yt = [L.rules, ...(any ? (L.ruleSetsApart ?? []) : [])],
        qt = [
          ...Yt.map((Zt) => It(Zt, "as_given")),
          ...(isBelowRoot
            ? [
                ...Yt.map((Zt) =>
                  It(
                    Zt.filter((rn) => rn.source !== "projectSettings" && isRuleAnchoredAtProjectRoot(rn)),
                    "as_from_root",
                  ),
                ),
                ...(Ee?.ruleSets ?? []).flatMap((Zt) => [
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
        getReasonForFile: (Zt) => qt.reduce((rn, pn) => rn ?? pn.getReasonForFile(Zt), null),
        reasonForEveryFile: qt.reduce((Zt, rn) => Zt ?? rn.reasonForEveryFile, null),
      };
    })("read"),
    We = () => null,
    ze = null,
    lt = createSyncDenyFilter(G, L.sandbox, getPlatform(), y),
    Je = createSyncDenyFilter(ke.launchDirSpellings, Ee?.sandbox ?? tXe, getPlatform(), y),
    nt = L.sandboxMovedToRoot ?? tXe,
    pt = createSyncDenyFilter(
      ke.launchDirSpellings,
      {
        ...nt,
        reopens: [
          ...nt.reopens,
          ...uniq(
            L.sandbox.reopens
              .filter((reopen) => !nt.reopens.includes(reopen))
              .flatMap((gt) => G.flatMap((At) => relativePosixPath(At, gt) ?? [])),
          ).flatMap((gt) => ke.launchDirSpellings.map((launchDirSpelling) => join_71(launchDirSpelling, gt))),
        ],
      },
      getPlatform(),
      y,
    ),
    Et = (gt) => lt(gt) || (isBelowRoot && (Je(gt) || pt(gt)));
  return Object.assign(
    (gt, At) => {
      if (QSn(gt)) return Me.reasonForEveryFile ?? (At ? "sensitive_tracked" : "sensitive");
      let It = getPathNormalizationVariants(gt),
        Yt = [gt, ...(It ?? [])],
        qt =
          Yt.reduce((Zt, rn) => Zt ?? Me.getReasonForFile(rn), null) ?? (Yt.some(Et) ? "read_denied" : null);
      if (It === null) return qt ?? (At ? "sensitive_tracked" : "sensitive");
      return (
        qt ??
        (isSensitiveSyncedPath(gt, { tracked: At, readings: It, namesCredential: Z })
          ? At
            ? "sensitive_tracked"
            : "sensitive"
          : null) ??
        (q.covers(gt) || It.some((Zt) => q.covers(Zt)) ? "host_config" : null)
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
function isRuleAnchoredAtProjectRoot({ source: source, ruleValue: ruleValue }) {
  if (ruleValue.ruleContent === void 0) return !0;
  let { root: root } = patternWithRoot(ruleValue.ruleContent, source);
  return root === null || root === rootPathForSource("projectSettings");
}
//@ chunk-e6aww6q8.js:1899758-1899938 placement
var DENY_OR_ASK_BEHAVIORS = ["deny", "ask"],
  EDIT_WRITE_TOOL_STUBS = [FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME].map((e) => ({
    name: e,
    mcpInfo: void 0,
    familyParentToolName: void 0,
    aliasSkillToolNames: void 0,
  })),
  ASCII_ONLY_RE = /^[\x00-\x7f]*$/,
  LINE_BREAK_RE = /[\n\r\u2028\u2029]/g,
  MAX_LINE_BREAK_VARIANTS = 16;
//@ chunk-e6aww6q8.js:1899938-1900070 placement
function lineBreakVariants(e) {
  return [
    e,
    ...Array.from(e.matchAll(LINE_BREAK_RE))
      .slice(0, MAX_LINE_BREAK_VARIANTS)
      .map(({ index: index }) => e.slice(0, index) + e.slice(index).replace(LINE_BREAK_RE, "\x01")),
  ];
}
/**
 * 检查一条路径是否被目录同步规则拒绝读取或编辑。
 */
//@ chunk-e6aww6q8.js:1900070-1902037 placement
function checkDirSyncRule(e, { rules: rules, complete: complete }, s, h, y, S = "deny", w) {
  if (!complete) return oTe("rules_unreadable");
  if (rules.length === 0) return oTe(null);
  let mapped = rules.map((yt) => ({
      ...yt,
      ruleValue: {
        ...yt.ruleValue,
        ...(yt.ruleValue.ruleContent === void 0
          ? {}
          : { ruleContent: foldPathCase(yt.ruleValue.ruleContent) }),
      },
    })),
    q = ((yt) => ({
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
    return oTe("read_denied");
  let filtered = (s === "read" ? DENY_OR_ASK_BEHAVIORS : [S]).filter(
    (yt) =>
      getContentRulesMapForToolName(q.asWritten, s === "read" ? FILE_READ_TOOL_NAME : FILE_EDIT_TOOL_NAME, yt)
        .size > 0,
  );
  if (filtered.length === 0) return oTe(null);
  let all = [...e, ...rules.map((yt) => yt.ruleValue.ruleContent ?? "")].every((yt) =>
      ASCII_ONLY_RE.test(yt),
    ),
    we = getOriginalCwd(),
    Ee = () => {},
    Ae = { unjudgedCountsAsMatched: !w, asSpelledOnly: !0 },
    Ie = (yt, gt, At) => (Ee(yt), matchingRuleForInput(yt, q[gt], s, At, Ae) !== null),
    Me = (yt, gt) =>
      yt.some((At) => (At.match(LINE_BREAK_RE)?.length ?? 0) > MAX_LINE_BREAK_VARIANTS) ||
      uniq(yt.flatMap(lineBreakVariants)).some((At) =>
        filtered.some(
          (It) =>
            (s === "edit" && S === "deny" && At !== At.trim()) ||
            Ie(At, gt, It) ||
            (At !== At.trimEnd() && Ie(`${At}/.`, gt, It)),
        ),
      ),
    mapped_2 = Ji(
      [
        ...e.flatMap((yt) => {
          let gt = relativePosixPath(yt, we);
          return gt === null ? [] : [{ directory: join_71(yt, gt), below: gt }];
        }),
        ...(y !== null && !(y === "" && e.includes(we)) ? [{ directory: we, below: y }] : []),
      ],
      jsonStringify,
    ).map(({ directory: directory, below: below }) => ({
      directory: directory,
      depth: below === "" ? 0 : countCharInString(below, "/") + 1,
      foldedBelow: foldPathCase(below),
    })),
    ze = (yt, gt) => {
      let At = mapped_2.length > 0 ? yt.split("/") : [];
      return mapped_2.flatMap(({ directory: directory, depth: depth, foldedBelow: foldedBelow }) =>
        At.length > depth && foldPathCase(At.slice(0, depth).join("/")) === foldedBelow
          ? [join_71(directory, gt(At.slice(depth).join("/")))]
          : [],
      );
    },
    lt = (yt) => [join_71(we, yt)],
    Je = (yt) =>
      h === "as_from_root" ? lt(yt) : uniq([...e.map((gt) => join_71(gt, yt)), ...ze(yt, (gt) => gt)]),
    nt = (yt) =>
      h === "as_from_root"
        ? lt(foldPathCase(yt))
        : [
            ...ze(yt, foldPathCase),
            ...e.flatMap((gt) => [join_71(gt, foldPathCase(yt)), foldPathCase(join_71(gt, yt))]),
          ],
    pt = (yt) => {
      let gt = nt(yt);
      try {
        return Me(gt, "asWritten") || Me(gt, "folded");
      } catch {
        return !0;
      }
    };
  return {
    getReasonForFile: (yt) =>
      Yg(
        we,
        () =>
          Me(Je(yt), "asWritten") ||
          (!(all && ASCII_ONLY_RE.test(yt)) &&
            pt(yt.trimEnd() + yt.slice(yt.trimEnd().length).replaceAll("\uFEFF", " "))),
      )
        ? "read_denied"
        : null,
    reasonForEveryFile: null,
  };
}
//@ chunk-e6aww6q8.js:1902037-1902105 placement
function oTe(e) {
  return { getReasonForFile: () => e, reasonForEveryFile: e };
}
/**
 * 计算上传过滤规则：合并启动规则与仓库根目录规则，按过滤根目录换算路径。
 */
//@ chunk-e6aww6q8.js:1902105-1902716 placement
function resolveUploadFilterRules({
  filterRoot: filterRoot,
  isCredentialListCountedFromOutsideRoot: n = !1,
  syncedRoot: syncedRoot,
  launchRules: launchRules = collectLaunchRules(syncedRoot),
} = {}) {
  let h = getOriginalCwdOrNull(),
    y = h === null ? null : findGitRoot(h),
    S = sXe(y, launchRules, { syncedRoot: syncedRoot });
  if (filterRoot === void 0 || h === null) return S;
  let w = (ke, we) => ke;
  if (filterRoot === y) return w(S, relativePosixPath(filterRoot, h) !== null);
  let [L, G, q] = [filterRoot, h, y].map((ke) => (ke === null ? null : Tm(ke)));
  if (y !== null && (q === L || (q === null && S.fromRoot !== void 0)))
    return w(S, relativePosixPath(y, h) !== null);
  let Z = {
      isLaunchDirBelowRoot:
        relativePosixPath(filterRoot, h) !== null ||
        (L != null && G != null && relativePosixPath(L, G) !== null),
    },
    Se = sXe(filterRoot, sXe(filterRoot, S, { asFiltersOwnRoot: Z, syncedRoot: syncedRoot }), {
      asFiltersOwnRoot: Z,
      source: "localSettings",
      syncedRoot: syncedRoot,
    });
  return w(Se, Z.isLaunchDirBelowRoot);
}
//@ chunk-e6aww6q8.js:1902716-1902757 placement
function znn(e, n, r) {
  return e.filter(isPermissionSettingsError);
}
/**
 * 计算启动时的同步规则；仓库层设置冻结时，合并冻结值与实时值（规则去重、拒绝与凭据取并集），保证只会更严格。
 */
//@ chunk-e6aww6q8.js:1902757-1903680 placement
function collectLaunchRules(syncedRoot) {
  let n = getKeptServedOwnerSettings();
  if (!isRepoTierFreezeHeld()) {
    let S = loadDirSyncRules(!0, n, syncedRoot);
    return n === void 0 ? { ...S, ruleSetsApart: void 0 } : S;
  }
  let frozenRules = loadDirSyncRules(!1, n, syncedRoot),
    liveRules = withRepoTiersLive(() => loadDirSyncRules(!0, n, syncedRoot)),
    h = (S) => jsonStringify([S.source, S.ruleBehavior, S.ruleValue]),
    y = new Set(frozenRules.rules.map(h));
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
      frozenRules.sandboxMovedToRoot === void 0 || liveRules.sandboxMovedToRoot === void 0
        ? void 0
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
/**
 * 汇总目录同步上传要遵守的规则：磁盘上的 deny/ask 权限规则（含用户设置补充）、各设置源的沙箱 denyRead/凭据文件/allowRead（reopen），并记录无法解析的来源。
 */
//@ chunk-e6aww6q8.js:1903680-1905458 placement
function loadDirSyncRules(e, userRules, r) {
  or();
  let { errors: errors } = getSettingsWithErrors_2(),
    filtered = loadAllPermissionRulesFromDisk().filter(
      (lt) => lt.ruleBehavior === "deny" || lt.ruleBehavior === "ask",
    ),
    y = new Set(filtered.map((lt) => jsonStringify(lt))),
    filtered_2 = settingsJsonToRules(userRules ?? null, "userSettings").filter(
      (lt) => lt.ruleBehavior !== "allow",
    ),
    w = [...filtered, ...filtered_2.filter((lt) => !y.has(jsonStringify(lt)))],
    L = yer(FILE_READ_TOOL_NAME, [READ_PATH_PROBE]),
    G = [],
    q = shouldAllowManagedReadPathsOnly(),
    flattened = SETTING_SOURCES.flatMap((lt) => sandboxReadEntriesForSource(lt, q)),
    Se =
      userRules === void 0
        ? []
        : sandboxReadEntriesForSource("userSettings", q, { settings: uXe(userRules) }),
    ke = new Set(Se.flatMap((lt) => (lt.kind === "reopen" ? lt.resolved : []))),
    we = [
      ...flattened.filter(
        (lt) =>
          userRules === void 0 ||
          lt.kind !== "reopen" ||
          lt.source !== "userSettings" ||
          lt.resolved.every((Je) => ke.has(Je)),
      ),
      ...Se.filter((lt) => lt.kind !== "reopen"),
    ],
    Ae = znn(errors, r, () =>
      [
        ...REPO_DIR_SETTING_SOURCE_LIST.map((lt) => ({ source: lt, file: getSettingsFilePathForSource(lt) })),
        { source: "localSettings", file: getLegacyLocalSettingsFilePath() },
      ].flatMap(({ source: source, file: file }) =>
        file === void 0 || isRepoTierAnsweredByACopy(source) || !isSettingSourceEnabled(source) ? [] : [file],
      ),
    ),
    filtered_3 = we.filter((lt) => lt.kind === "unresolvable"),
    Me = Ae.length === 0 && filtered_3.length === 0,
    We = (lt, Je = we) => uniq(Je.flatMap((nt) => (nt.kind === lt ? nt.resolved : []))),
    filtered_4 = we.filter((lt) => lt.isMovedToRoot === !0);
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
      complete: Me,
      ...{},
    });
  return {
    rules: [...w, ...L, ...G],
    ruleSetsApart: [filtered, filtered_2],
    sandbox: { denies: We("deny_read"), credentials: We("credential_file"), reopens: We("reopen") },
    sandboxMovedToRoot: {
      denies: We("deny_read", filtered_4),
      credentials: We("credential_file", filtered_4),
      reopens: We("reopen", filtered_4),
    },
    complete: Me,
    unreadableSettingsFiles: uniq([
      ...Ae.flatMap((lt) => lt.file ?? []),
      ...filtered_3.flatMap((lt) => lt.file ?? []),
    ]),
  };
}
//@ chunk-e6aww6q8.js:1905458-1905574 placement
function relativePosixPath(e, n) {
  let r = relative_29(e, n);
  return r === "" || r === ".." || r.startsWith(".." + sep_44) || isAbsolute_35(r)
    ? null
    : r.split(sep_44).join("/");
}
//@ chunk-e6aww6q8.js:1905574-1905624 placement
function rXe(e, n) {
  return relative_29(e, n) === "" ? "" : relativePosixPath(e, n);
}
//@ chunk-e6aww6q8.js:1905624-1905742 placement
var EMPTY_LAUNCH_DIR_INFO = {
  launchDirSpellings: [],
  isLaunchDirResolved: !1,
  resolvedPathBelowRoot: null,
  isBelowRoot: !1,
  isRootThatWasRead: !1,
};
/**
 * 描述启动目录相对同步根的位置（之内、之外或未知）。
 */
//@ chunk-e6aww6q8.js:1905742-1906136 placement
function mer(e, n, r) {
  let s = getOriginalCwdOrNull();
  if (s === null) return EMPTY_LAUNCH_DIR_INFO;
  let h = Tm(s),
    y = r === void 0 || e.includes(r) ? n : Tm(r);
  if (y === null || (h === null && !e.some((w) => rXe(w, s) !== null))) return "unknown";
  let S = h === null ? null : rXe(n, h);
  return {
    launchDirSpellings: uniq([s, h ?? s]),
    isLaunchDirResolved: h !== null,
    resolvedPathBelowRoot: S,
    isBelowRoot: (S !== null && S !== "") || e.some((w) => relativePosixPath(w, s) !== null),
    isRootThatWasRead: r !== void 0 && rXe(n, y) === "",
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
/**
 * 把指定设置源的项目规则合并进现有规则，并按同步根换算路径。
 */
//@ chunk-e6aww6q8.js:1906585-1908176 placement
function sXe(
  root,
  rules,
  { asFiltersOwnRoot: asFiltersOwnRoot, source: source = "projectSettings", syncedRoot: syncedRoot },
) {
  let y = getOriginalCwdOrNull();
  if (
    y === null ||
    root === null ||
    !(asFiltersOwnRoot?.isLaunchDirBelowRoot ?? relativePosixPath(root, y) !== null) ||
    getProjectConfigRoot() !== null ||
    !isSettingSourceEnabled(source)
  )
    return rules;
  let settingsPath = join_71(root, getRelativeSettingsFilePathForSource(source)),
    { settings: settings, errors: errors } = parseSettingsFile(settingsPath),
    G = uXe(settings),
    q = znn(errors, syncedRoot, () => [settingsPath]),
    filtered = settingsJsonToRules(G, source).filter((ze) => ze.ruleBehavior !== "allow"),
    Se = (ze) =>
      sandboxReadEntriesForSource(source, !0, {
        settings: {
          sandbox: {
            filesystem: { denyRead: G?.sandbox?.filesystem?.denyRead?.filter(ze) },
            credentials: { files: G?.sandbox?.credentials?.files?.filter((lt) => ze(lt.path)) },
          },
        },
      }),
    ke = Se(isSandboxFilesystemPathRelative),
    we = Se((ze) => !isSandboxFilesystemPathRelative(ze)),
    Ee = q.length === 0 && ![...ke, ...we].some((ze) => ze.kind === "unresolvable");
  logUploadFilterEvent(settingsPath, "root_project_rules", {
    rules: filtered.length,
    sandbox_entries: ke.length + we.length,
    complete: Ee,
    ...(asFiltersOwnRoot !== void 0 && {
      read_as_filters_own_root: !0,
      local_settings: source === "localSettings",
    }),
  });
  let Ae = (ze, lt) => ze.flatMap((Je) => (Je.kind === lt ? Je.resolved : [])),
    Ie = ger(settingsPath, Ee && !errors.some(isPermissionSettingsError), {
      rules: filtered,
      relative: { denies: Ae(ke, "deny_read"), credentials: Ae(ke, "credential_file") },
      other: { denies: Ae(we, "deny_read"), credentials: Ae(we, "credential_file") },
    }),
    Me = (ze, lt = []) => uniq([...lt, ...Ie.flatMap(ze)]),
    We = rules.fromRoot?.root === root ? rules.fromRoot : void 0;
  return {
    ...rules,
    sandbox: {
      ...rules.sandbox,
      denies: Me((ze) => ze.other.denies, rules.sandbox.denies),
      credentials: Me((ze) => ze.other.credentials, rules.sandbox.credentials),
    },
    fromRoot: {
      root: root,
      ruleSets: [...(We?.ruleSets ?? []), ...Ie.map((ze) => ze.rules)],
      sandbox: {
        denies: Me((ze) => ze.relative.denies, We?.sandbox.denies),
        credentials: Me((ze) => ze.relative.credentials, We?.sandbox.credentials),
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
var iXe = ge(new Map(), (e) => e.clear()),
  weakSet_4 = new WeakSet();
//@ chunk-e6aww6q8.js:1908227-1908419 placement
function ger(e, n, r) {
  if (!isRepoTierFreezeHeld()) return [r];
  let s = is();
  if (!weakSet_4.has(s))
    (weakSet_4.add(s),
      s.onInvalidate(() => {
        if (!isRepoTierFreezeHeld()) iXe.clear();
      }));
  let h = iXe.get(e);
  if (h !== void 0) return [h, r];
  if (n) iXe.set(e, r);
  return [r];
}
//@ chunk-e6aww6q8.js:1908419-1908583 placement
function yer(e, n) {
  return launchDenyRules(OWt()).filter((r) =>
    r.ruleValue.ruleContent !== void 0
      ? r.ruleValue.toolName === e
      : r.source === "session" &&
        n.some((s) => getDenyRuleForTool(getEmptyToolPermissionContext(), s, [r]) !== null),
  );
}
//@ chunk-e6aww6q8.js:1908583-1908627 placement
var Hnn = null,
  Bnn = ge(new Map(), (e) => e.clear());
//@ chunk-e6aww6q8.js:1908627-1908740 placement
function logDirSyncHostConfig(e, n, r) {
  let s = jsonStringify(n);
  if (Bnn.get(e) === s) return;
  (Bnn.set(e, s), logEvent("tengu_dir_sync_host_config", { ...n, ...r }));
}
//@ chunk-e6aww6q8.js:1908740-1908775 placement
var Unn = ge(new Map(), (e) => e.clear());
//@ chunk-e6aww6q8.js:1908775-1908876 placement
function logUploadFilterEvent(e, n, r) {
  let s = jsonStringify(r);
  if (Unn.get(e) === s) return;
  (Unn.set(e, s), logEvent(`tengu_upload_filter_${n}`, r));
}
//@ chunk-e6aww6q8.js:1908876-1909100 placement
function logDirSyncUploadRules(e) {
  let n =
      e.complete &&
      e.dropped_entries_ignored === void 0 &&
      e.read_rules + e.startup_read_rules + e.sandbox_deny_read + e.sandbox_credential_files === 0,
    r = jsonStringify(e);
  if (n || r === Hnn) return;
  ((Hnn = r), logEvent("tengu_dir_sync_upload_rules", e));
}
/**
 * 收集某个设置源的沙箱读取相关条目，无法解析时标记为 unresolvable。
 */
//@ chunk-e6aww6q8.js:1909192-1909843 placement
function sandboxReadEntriesForSource(source, n, r) {
  let s = isSettingSourceEnabled(source),
    h = REPO_DIR_SETTING_SOURCES.has(source);
  if (!s && h) return [];
  let y = s ? void 0 : getWritableSettingsPathForSource(source);
  if (y !== void 0 && !Ter(y)) return [{ kind: "unresolvable", source: source, resolved: [], file: y }];
  let S = (r?.settings ?? uXe(getSettingsForSourceTightenOnly(source)))?.sandbox,
    w = s ? (S?.filesystem?.denyRead ?? []) : [],
    mapped = (S?.credentials?.files ?? []).map((q) => q.path),
    G =
      s &&
      !h &&
      (!env.CLAUDE_CODE_EVAL_CONFINED || source === "userSettings") &&
      (!n || source === "policySettings")
        ? (S?.filesystem?.allowRead ?? []).filter((q) => q.trim() !== "")
        : [];
  return [
    ...w.map((q) =>
      resolveSandboxReadEntry("deny_read", source, q, () => jnn(resolveSandboxDenyReadEntry(q, source))),
    ),
    ...mapped.map((q) =>
      resolveSandboxReadEntry("credential_file", source, q, () =>
        jnn(resolveSandboxDenyReadEntry(q, source)),
      ),
    ),
    ...G.flatMap((q) => {
      let Z = resolveSandboxReadEntry("reopen", source, q, () => [resolveSandboxFilesystemPath(q, source)]);
      return Z.kind === "reopen" ? [Z] : [];
    }),
  ];
}
/**
 * Windows 下为沙箱文件系统路径补充早期拼写形式。
 */
//@ chunk-e6aww6q8.js:1909843-1910215 placement
function uXe(e) {
  let n = e?.sandbox;
  if (getPlatform() !== "windows" || !e || !n) return e;
  return {
    ...e,
    sandbox: {
      ...n,
      filesystem: n.filesystem && {
        ...n.filesystem,
        denyRead: n.filesystem.denyRead?.flatMap((r) => {
          let s = sandboxFilesystemPathAsReadEarlier(r);
          return s === null ? [r] : [r, s];
        }),
      },
      credentials: n.credentials && {
        ...n.credentials,
        files: n.credentials.files?.flatMap((r) => {
          let s = sandboxFilesystemPathAsReadEarlier(r.path);
          return s === null ? [r] : [r, { ...r, path: s }];
        }),
      },
    },
  };
}
//@ chunk-e6aww6q8.js:1910215-1910292 placement = getEnabledSettingSources (1)
function getWritableSettingsPathForSource(e) {
  return e === "policySettings" || e === "flagSettings" ? void 0 : getSettingsFilePathForSource(e);
}
//@ chunk-e6aww6q8.js:1910292-1910338 placement
function Ter(e) {
  return !parseSettingsFile(e).errors.some(isBlockingSandboxSettingsError);
}
//@ chunk-e6aww6q8.js:1910338-1910559 placement
function resolveSandboxReadEntry(e, n, r, s) {
  try {
    return {
      kind: e,
      source: n,
      resolved: s(),
      isMovedToRoot:
        getOriginalCwdOrNull() !== null &&
        n !== "projectSettings" &&
        isSandboxFilesystemPathRelative(r) &&
        getRuleAnchorRootForSource(n) === getRuleAnchorRootForSource("projectSettings"),
    };
  } catch {
    return { kind: "unresolvable", source: n, resolved: [], file: getWritableSettingsPathForSource(n) };
  }
}
//@ chunk-e6aww6q8.js:1910559-1910780 placement
function jnn(e) {
  let n = getPlatform() === "windows",
    search = e.search(n ? /[*?]/ : /[*?[\]]/),
    s = search === -1 ? e.length : Math.max(e.lastIndexOf("/", search), n ? e.lastIndexOf("\\", search) : -1);
  if (s <= 0) return [e];
  let h = canonicalizePathForMaskSweep(e.slice(0, s)) + e.slice(s);
  return h === e ? [e] : [e, h];
}
//@ chunk-e6aww6q8.js:1910780-1911738 placement
function classifySyncedFileSensitivity(
  e = resolveUploadFilterRules(),
  {
    isCredentialListCountedFromOutsideRoot: n = !1,
    onLaunchPlaceUnknown: r = () => {},
    onlyAsLaunched: s = !1,
  } = {},
) {
  let y = (S, w) => e;
  return {
    withholdFor: async (S) => {
      let w = await realpath_23(S).catch(() => null);
      if (w === null) return () => !0;
      let L = resolveDirSyncRules(S, {
        realRoot: w,
        readRules: y(S, w),
        onlyAsLaunched: s,
        readsDenialsNarrowly: !0,
      });
      if (L.isLaunchPlaceUnknown) r();
      return (G) => {
        switch (L(G, !0)) {
          case "read_denied":
          case "rules_unreadable":
          case "sensitive":
          case "sensitive_tracked":
          case "content_filter":
          case "host_config":
            return !0;
          case null:
            return !1;
        }
      };
    },
    neverReadFor: async (S) => {
      let w = await realpath_23(S).catch(() => null);
      if (w === null) return () => !0;
      let L = resolveDirSyncRules(S, {
        realRoot: w,
        readRules: e,
        onlyAsLaunched: s,
        readsDenialsNarrowly: !0,
        hostConfig: wB,
      });
      return (G) => {
        switch (L(G, !0)) {
          case "read_denied":
          case "rules_unreadable":
            return !0;
          case "host_config":
          case "sensitive":
          case "sensitive_tracked":
          case "content_filter":
          case null:
            return !1;
        }
      };
    },
    rulesUnreadable: !e.complete,
    unreadableSettingsFiles: e.unreadableSettingsFiles ?? [],
  };
}
//@ chunk-e6aww6q8.js:1911738-1911748 placement
var ver = 3;
//@ chunk-e6aww6q8.js:1911748-1911921 placement = formatFailureDetails (0.777)
function formatFailureDetails_3(e) {
  if (e === void 0 || e.length === 0) return "";
  let mapped = e.slice(0, ver).map((s) => readHeadAndTail(sanitizeDisplayText(tildify(s)), 120)),
    remaining = e.length - mapped.length;
  return `${mapped.join(", ")}${remaining > 0 ? ` and ${remaining} more` : ""}`;
}
//@ chunk-e6aww6q8.js:1911921-1911987 placement
function cXe(e) {
  let n = formatFailureDetails_3(e);
  return n === "" ? "" : ` (errors in ${n})`;
}
//@ chunk-e6aww6q8.js:1911987-1912056 placement
function Y5s(e) {
  return `your settings could not all be read${cXe(e)}`;
}

export {
  collectLaunchRules,
  classifySyncedFileSensitivity,
  resolveUploadFilterRules,
  cXe,
  resolveDirSyncRules,
  logDirSyncHostConfig,
  formatFailureDetails_3,
  Y5s,
};
