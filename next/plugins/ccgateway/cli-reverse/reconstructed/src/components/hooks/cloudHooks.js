/**
 * components/hooks/cloudHooks.tsx
 *
 * 2.1.316 新增：/hooks 中"云会话钩子"：本机钩子是否转发给云会话、状态与可接受性说明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5tpnqyt5.js (38)
 * attribution: placement 38
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename } from "path";
import { realpath } from "fs/promises";
import {
  init_react_production,
  useRef,
  suspenseTypeExport,
  use,
} from "../../../vendor/react/cjs/react.production.js";
import {
  deviceHooksRegistrationState,
  hasCapturedHooks,
  isHookScopeInReach,
} from "../../utils/hooks/deviceHooks/cloudRegistration.js";
import { sanitizeDisplayText } from "../../utils/resultError.js";
import { mayTouchCodeEditingTool } from "../../utils/hooks/hookEventSets.js";
import {
  deviceHooksConsentPath,
  readDeviceHooksConsent,
  resolveStoredConsent,
  probeWritability,
} from "../../utils/hooks/deviceHooks/consent.js";
import {
  deviceHooksPolicyEligibility,
  collectDeviceHookSources,
} from "../../utils/hooks/deviceHooks/eligibility.js";
import { findGitRootUncached } from "../../utils/git.js";
import {
  collectBaseReachRoots,
  collectSettingsWriteRoots,
  settingsReachRootsForSource,
} from "../../utils/git/builderGit/sandboxReach.js";
import { collectStickyRoots, anyPairMatches } from "../../utils/settings/stickyRoots.js";
import { SETTING_SOURCES } from "../../utils/settings/constants.js";
import { getSettingsFilePathForSource } from "../../utils/settings/settings.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { getFlagSettingsExpectedContent } from "../../bootstrap/state.js";
import { subprocessEnv } from "../../utils/subprocessEnv.js";
import { mergeHookEnv_2, resolveOptions } from "../../utils/hooks/hookCommandResolution.js";
import { getLatchedPreSettingsEnvSnapshot } from "../../utils/managedEnvApply.js";
import {
  settingsEnvInReach,
  legacyConfigFileOf,
  collectDeviceHookAttestations,
  projectConfigRootOr,
  shellPrefixOf,
} from "../../utils/hooks/deviceHooks/commandReach.js";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
import { scriptFileReaderDeps } from "../../utils/hooks/servedHooks/hookSandbox.js";
import { defaultShellKind } from "../../utils/shell/shellToolUtils.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { logError } from "../../utils/log.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import {
  plural,
  countCharInString,
  capitalize,
  escapeControlCharsForDisplay,
} from "../../utils/stringUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW, merged, isMenuOpen } from "../CustomSelect/select.js";
import { Dialog } from "../design-system/Dialog.js";
import { StatusIcon, STATUS_CONFIG } from "../design-system/StatusIcon.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useScrollColumnContext, SCROLL_COLUMN_MIN_ROWS } from "../design-system/ScrollColumn.js";
import { useScrollViewportSize, useHasScrollViewport } from "../ScrollViewportContext.js";
import { PANE_PADDING_X, PANE_PADDING } from "../design-system/Pane.js";
import { OverflowHint } from "../CtrlOToExpand.js";
import { wrapText } from "../../ink/wrap-text.js";
import { expandTabsInText } from "../../ink/wrapAnsi.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { getSortedMatchersForEvent } from "../../utils/hooks/hooksConfigManager.js";
import { StatusRow } from "../Settings/Status.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { hookSourceInlineDisplayString, getHookProgressDisplay } from "../../utils/hooks/hooksSettings.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5tpnqyt5.js:17575-17579 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5tpnqyt5.js:17575", () => {
  init_react_production();
});
//@ chunk-5tpnqyt5.js:17652-18229 placement
var NOT_REGISTERED_YET_TEXT = "not registered yet; your next message tries again";
var NOT_REGISTERED_NOW_TEXT = "not registered right now; reopen /hooks to check again";
var CLOUD_HOOK_STATE_LABELS = {
  dormant: "idle until your next message",
  kept_none: "the session kept none of them",
  paused: "paused until the session answers",
  declined: "off because the answer was No",
  disabled: "the session does not allow them",
  unsupported: "this session is too old; start a new one",
  invalid: "could not register; see the earlier notice",
  stale: "registration out of date; start a new session",
  muted: "turned off by Anthropic for now",
  flag_off: "not switched on for your account",
};
//@ chunk-5tpnqyt5.js:18229-18746 placement
function describeCloudHookState(standing, lapsesUnusedAt, state) {
  if (standing.kind === "dormant" && standing.senderUnverified)
    return {
      standing:
        "not running, because the session hasn't answered and doesn't recognize this machine as a trusted device; start a session from this machine to run them",
    };
  let registrationState = deviceHooksRegistrationState(
    {
      standing,
      lapsesUnusedAt,
    },
    state,
  );
  if (registrationState !== null)
    return {
      standing: registrationState === "dormant" ? CLOUD_HOOK_STATE_LABELS.dormant : NOT_REGISTERED_YET_TEXT,
      standingIsIdle: true,
    };
  switch (standing.kind) {
    case "paused":
    case "kept_none":
      return {
        standing: CLOUD_HOOK_STATE_LABELS[standing.kind],
      };
    case "stopped":
      return {
        standing: CLOUD_HOOK_STATE_LABELS[standing.reason],
      };
    case "registered":
    case "idle":
    case "dormant":
      return {};
  }
}
//@ chunk-5tpnqyt5.js:18746-20901 placement
/**
 * 钩子不能在云会话运行的原因（云端改文件、只支持 command/http、事件只在本机发生等）。
 */
var CLOUD_HOOK_INELIGIBLE_REASONS = {
  after_edit: "cloud edits change files in the cloud. Put the hook in the repository's .claude/settings.json",
  kind_unsupported: "only command and http hooks can run for a cloud session",
  event_runs_locally: "this event happens on this machine",
  event_later: "this event is not forwarded yet",
  event_low_value: "this event is not forwarded",
  event_container_internal: "this event only concerns the cloud container",
  source_in_sync_root: "the cloud session may change its settings file",
  sync_root_is_config_dir: "the cloud session may change its settings file",
  unverifiable_target: "its script could not be read to pin it",
  in_reach:
    "the cloud session can change the hook's script. Check the script, then move it to ~/.claude/hooks",
  interpreter_unvouched:
    "this machine cannot verify the script's interpreter. Use bash, python3 or node from your PATH",
  loads_from_reach:
    "the hook's script reads files the cloud session can change. Keep those files outside the project",
  unpinned_command:
    "this machine cannot verify what the command runs. If it is an inline command, make it one script in ~/.claude/hooks",
  duplicate: "the same hook is configured twice",
  over_cap:
    "more hooks than one registration carries, or its matcher is too long or holds an invisible character",
  pattern_matcher: "cloud sessions cannot take a pattern matcher. List the names to match",
  author_skip: 'it is marked cloud: "skip" in its settings entry',
};
var CLOUD_HOOK_BLOCK_REASONS = {
  dot_folder:
    "its script is in a dot-folder this machine does not read hooks from. Check the script, then move it to ~/.claude/hooks",
  shell_prefix: "it would run through your CLAUDE_CODE_SHELL_PREFIX, which this machine cannot verify",
  script_missing: "its script is missing",
  c_shell: "this machine cannot rule out that the script runs through csh or tcsh",
  makefile: "its script is a makefile, and what make would run from it cannot be checked on this machine",
  awk: "its script is an awk script, and what awk would run from it cannot be checked on this machine",
};
var HOOK_SOURCE_LABELS = {
  user: {
    tag: "user settings",
    phrase: "your user settings",
  },
  local: {
    tag: "settings.local.json",
    phrase: "this folder's settings.local.json",
  },
  flag: {
    tag: "--settings file",
    phrase: "the --settings file",
  },
};
//@ chunk-5tpnqyt5.js:20901-21066 placement
function hookDisplayName(command, path) {
  let label =
    path !== undefined
      ? basename(path)
      : /^https?:\/\//i.test(command.trim())
        ? httpHostLabel(command.trim())
        : basename(command.trim().split(/\s+/)[0] ?? "") || "hook";
  return (
    sanitizeDisplayText(label, {
      maxCodeUnits: 120,
    }) || "hook"
  );
}
//@ chunk-5tpnqyt5.js:21066-22074 placement
function classifyHookForCloud(deviceHookAttestations, writableSources = new Set()) {
  let writableFlag = (source) =>
    writableSources.has(source)
      ? {
          fromWritableFile: true,
        }
      : {};
  let mapped = deviceHookAttestations.forwarded.map((entry) => ({
    where: "here",
    label:
      entry.local.hook.type === "http"
        ? httpHostLabel(entry.local.hook.url)
        : entry.local.hook.type === "command"
          ? hookDisplayName(entry.local.hook.command, entry.local.pinnedTarget?.path)
          : "hook",
    event: entry.wire.event,
    ...(entry.wire.matcher !== undefined && {
      matcher: sanitizeDisplayText(entry.wire.matcher, {
        maxCodeUnits: 200,
      }),
    }),
    source: entry.local.source,
    ...writableFlag(entry.local.source),
    ...(mayTouchCodeEditingTool(entry.wire.event, entry.wire.matcher) && {
      exceptAfterEdits: true,
    }),
    ...(entry.wire.author_opt_in && {
      optedIn: true,
    }),
  }));
  let mapped_2 = deviceHookAttestations.templates.map((template) => ({
    where: "cloud",
    label: `${template.local.templateId}${template.local.label === "legacy" ? " (older copy)" : ""}`,
    event: template.wire.event,
    ...(template.wire.matcher !== undefined && {
      matcher: sanitizeDisplayText(template.wire.matcher, {
        maxCodeUnits: 200,
      }),
    }),
    source: template.local.source,
    ...writableFlag(template.local.source),
  }));
  let mapped_3 = deviceHookAttestations.held.map((held) => {
    let reasonText =
      held.cause !== undefined
        ? CLOUD_HOOK_BLOCK_REASONS[held.cause]
        : CLOUD_HOOK_INELIGIBLE_REASONS[held.reason];
    return {
      where: "local",
      label: hookDisplayName(held.command),
      event: held.event,
      ...(held.matcher !== undefined && {
        matcher: held.matcher,
      }),
      source: held.source,
      reason: held.reason,
      why: held.noRemedy ? reasonText.replace(/\. .*$/, "") : reasonText,
    };
  });
  return [...mapped, ...mapped_2, ...mapped_3];
}
//@ chunk-5tpnqyt5.js:22074-22154 placement
function httpHostLabel(url) {
  try {
    return new URL(url).host || "http hook";
  } catch {
    return "http hook";
  }
}
//@ chunk-5tpnqyt5.js:22154-22205 placement
var NO_HOOK_REASON = {
  kind: "none",
  reason: "disabled_by_settings",
};
//@ chunk-5tpnqyt5.js:22205-22472 placement
function reconcileCapturedHooks(captured, baseline, launchInReach) {
  if (
    captured.kind === "none" &&
    captured.reason === "disabled_by_settings" &&
    baseline !== null &&
    baseline.kind === "captured" &&
    launchInReach &&
    hasCapturedHooks(baseline)
  )
    return {
      captured: baseline,
      kept: "launch_hooks",
    };
  if (baseline?.kind === "none" && baseline.reason === "disabled_by_settings" && hasCapturedHooks(captured))
    return {
      captured: NO_HOOK_REASON,
      kept: "off",
    };
  return {
    captured,
  };
}
//@ chunk-5tpnqyt5.js:22472-26606 placement
/**
 * 计算每个钩子在云会话中的状态（dormant、idle、registered 等）。
 */
async function buildCloudHookRows({
  launchDir,
  storageV5,
  forwarding,
  consentPin,
  senderMemory,
  processMemory,
}) {
  let consentPath = deviceHooksConsentPath();
  if (forwarding !== "cloud")
    return {
      consent: forwarding,
      consentLocation: consentPath,
      rows: [],
    };
  let deps = readDeviceHooksConsent(storageV5);
  let standingFields = (rows = []) => {
    let now = Date.now();
    let described = describeCloudHookState(senderMemory.standing, senderMemory.lapsesUnusedAt, now);
    if (described.standing !== undefined)
      return described.standingIsIdle && deviceHooksRegistrationState(senderMemory, now) === "dormant"
        ? described
        : {
            ...described,
            notInForce: true,
          };
    return senderMemory.standing.kind === "idle" && rows.some((row) => row.where === "here")
      ? {
          standing: NOT_REGISTERED_NOW_TEXT,
          standingIsIdle: true,
          notInForce: true,
        }
      : {};
  };
  let consentPinRef = consentPin;
  let resolveConsent = async (fallback) =>
    consentPinRef.current?.origin === "given" ? consentPinRef.current.value.catch(() => "unset") : fallback;
  try {
    let { stored, origin } = await resolveStoredConsent(consentPinRef, deps);
    let storedConsent = stored;
    let eligibility = deviceHooksPolicyEligibility(collectDeviceHookSources());
    let gitRootUncached = findGitRootUncached(launchDir);
    let repoRoot = gitRootUncached ?? launchDir;
    let baseRoots = [
      launchDir,
      await realpath(launchDir).catch(() => launchDir),
      repoRoot,
      await realpath(repoRoot).catch(() => repoRoot),
    ];
    let commonRoots = senderMemory.commonRoots ?? collectBaseReachRoots(launchDir);
    let pinnedRoots = new Map(senderMemory.pinnedRoots);
    let roots = await collectStickyRoots({
      stickyRoots: new Set(senderMemory.stickyRoots),
      pinnedScopes: new Set(senderMemory.pinnedScopes),
      pinnedRoots,
      baseRoots,
      reachBaseline:
        senderMemory.reachBaseline ??
        new Map(SETTING_SOURCES.map((source) => [source, collectSettingsWriteRoots(source, launchDir)])),
      scopeSettingsFile: (source) => getSettingsFilePathForSource(source) ?? null,
      realpath,
      commonRoots: () => commonRoots,
      scopeRoots: (source, reachBaseline) => settingsReachRootsForSource(launchDir, source, reachBaseline),
    });
    let storedAnswerNote;
    if (origin === "read" && storedConsent !== "unset") {
      let resolvedPath = consentPath;
      let probeResult = await probeWritability(consentPath, roots, async (candidatePath) => {
        resolvedPath = await realpath(candidatePath);
        return resolvedPath;
      });
      if (probeResult !== false) storedConsent = "unset";
      let consentPathText = stripInvisibleChars(consentPath);
      if (probeResult === "unresolvable") storedAnswerNote = `${consentPathText} couldn't be read.`;
      else if (probeResult === "writable") {
        let pathPair = [consentPath, resolvedPath];
        let allowingSource = anyPairMatches(pathPair, [...baseRoots, ...commonRoots])
          ? undefined
          : SETTING_SOURCES.find((source) =>
              anyPairMatches(
                pathPair,
                pinnedRoots.get(source) ?? settingsReachRootsForSource(launchDir, source, null),
              ),
            );
        let allowingFile = allowingSource && getSettingsFilePathForSource(allowingSource);
        let allowsSuffix =
          allowingSource === "policySettings"
            ? ", which your managed settings allow"
            : allowingSource === "flagSettings" && getFlagSettingsExpectedContent() !== undefined
              ? ", which the --settings value allows"
              : allowingFile !== undefined
                ? `, which ${stripInvisibleChars(allowingFile)} allows`
                : "";
        storedAnswerNote = `This cloud session can write ${consentPathText}${allowsSuffix}.`;
      }
    }
    let { captured, kept } = reconcileCapturedHooks(
      eligibility,
      senderMemory.baseline,
      eligibility.kind === "none" && eligibility.reason === "disabled_by_settings"
        ? await isHookScopeInReach(roots, eligibility.switchSources ?? ["user", "flag"], {
            realpath,
            scopeSettingsFile: (source) => getSettingsFilePathForSource(source) ?? null,
            everInReach: senderMemory.everInReach,
          })
        : false,
    );
    if (captured.kind === "none")
      return {
        consent: await resolveConsent(storedConsent),
        consentLocation: consentPath,
        ...(storedAnswerNote !== undefined && {
          storedAnswerNotUsed: storedAnswerNote,
        }),
        ...standingFields(),
        rows: [],
        unavailableReason: kept === "off" ? HOOKS_OFF_AT_START_TEXT : POLICY_BLOCK_REASONS[captured.reason],
      };
    let baseEnv = subprocessEnv();
    let mergedEnv = mergeHookEnv_2({
      attached: baseEnv,
      beforeSettings: getLatchedPreSettingsEnvSnapshot(),
      ownEnv: settingsEnvInReach(senderMemory, legacyConfigFileOf(processMemory)),
      childrenSee: (key) => Object.hasOwn(baseEnv, key),
    });
    let deviceHookAttestations = await collectDeviceHookAttestations(
      captured,
      {
        instanceId: "dev-0000000000000000",
        launchDir,
        projectDir: projectConfigRootOr(launchDir),
        configHome: getClaudeConfigDir(),
        extraReachRoots: roots,
        ...(repoRoot !== launchDir && {
          repoRoot,
        }),
        inRepository: gitRootUncached !== null,
        ...(senderMemory.lastSyncRoot !== null && {
          sync: {
            rootReal: senderMemory.lastSyncRoot.real,
            root: senderMemory.lastSyncRoot.root,
          },
        }),
        allowLegacyTemplateDigests: true,
        refusedTemplateIds: [...senderMemory.refusedTemplates],
        optInPins: new Map(senderMemory.optInPins),
        reachMemory: senderMemory,
        localSettingsLocation: {
          ...senderMemory.localSettingsLocation,
        },
      },
      {
        realpath,
        open: scriptFileReaderDeps().openNoFollow,
        home: resolveOptions(mergedEnv),
        defaultShell: defaultShellKind(),
        shellPrefix: shellPrefixOf(mergedEnv),
      },
    );
    let reachableSources = new Set([
      ...senderMemory.everInReach,
      ...[captured, senderMemory.baseline].flatMap((captured) =>
        captured?.kind === "captured" ? captured.sources.map((source) => source.source) : [],
      ),
    ]);
    let sourceFiles = [
      ["user", getSettingsFilePathForSource("userSettings")],
      ["local", getSettingsFilePathForSource("localSettings")],
      [
        "flag",
        getFlagSettingsExpectedContent() === undefined
          ? getSettingsFilePathForSource("flagSettings")
          : undefined,
      ],
    ];
    let syncRootSources = new Set(
      deviceHookAttestations.held
        .filter((held) => held.reason === "source_in_sync_root" || held.reason === "sync_root_is_config_dir")
        .map((held) => held.source),
    );
    let withheldSources = new Set(captured.withheld.map((withheld) => withheld.source));
    let writableLocal = new Set();
    let writableOther = new Set();
    for (let [source, filePath] of sourceFiles) {
      if (
        filePath === undefined ||
        !reachableSources.has(source) ||
        syncRootSources.has(source) ||
        (withheldSources.has(source) && !senderMemory.everInReach.has(source))
      )
        continue;
      let targetSet = source === "local" ? writableLocal : writableOther;
      if (senderMemory.everInReach.has(source)) {
        targetSet.add(source);
        continue;
      }
      let spellings = normalizeCaseForComparison_2([
        filePath,
        await realpath(filePath).catch(() => filePath),
        ...(senderMemory.knownSpellings.get(source) ?? []),
      ]);
      if (anyPairMatches(spellings, roots)) targetSet.add(source);
    }
    let rows = classifyHookForCloud(deviceHookAttestations, writableLocal);
    let withheldNotes = [
      ...captured.withheld
        .filter((withheld) => !writableLocal.has(withheld.source) && !writableOther.has(withheld.source))
        .map(
          (withheld) =>
            `Hooks from ${HOOK_SOURCE_LABELS[withheld.source].phrase} are not offered to the cloud session: ${UNTRUSTED_BLOCK_REASONS[withheld.reason]}.`,
        ),
      ...[...writableOther].map(
        (source) =>
          `Hooks from ${HOOK_SOURCE_LABELS[source].phrase} are not offered to the cloud session: the cloud session may change that file.`,
      ),
    ];
    return {
      consent: await resolveConsent(storedConsent),
      consentLocation: consentPath,
      ...(storedAnswerNote !== undefined && {
        storedAnswerNotUsed: storedAnswerNote,
      }),
      ...standingFields(rows),
      rows,
      ...(kept === "launch_hooks" && {
        keptFromLaunch:
          "All hooks were switched off in your settings during this cloud session; for it, this machine keeps offering the hooks it had when you launched (listed here) until you restart claude --cloud.",
      }),
      ...(writableLocal.size > 0 && {
        writableSources: [...writableLocal].map(
          (source) =>
            `This cloud session can write ${HOOK_SOURCE_LABELS[source].phrase}, so only the hooks that file held when you attached are offered.`,
        ),
      }),
      ...(withheldNotes.length > 0 && {
        withheld: withheldNotes,
      }),
    };
  } catch (error) {
    logError(error);
    return {
      consent: await resolveConsent("unset"),
      consentLocation: consentPath,
      ...standingFields(),
      rows: [],
      unavailableReason: "they could not be read",
    };
  }
}
//@ chunk-5tpnqyt5.js:26606-27620 placement
var HOOKS_OFF_AT_START_TEXT =
  "all hooks were switched off in your settings when this cloud session started, and for it this machine keeps them off although that switch has since been removed \u2014 restart claude --cloud to offer them";
var POLICY_BLOCK_REASONS = {
  policy_unreadable: "the managed policy on this machine could not be read",
  policy_disable_all: "a managed policy switches all hooks off",
  managed_only: "only managed hooks may run here (a managed-only policy, or safe mode)",
  plugin_only: "a managed policy allows plugin hooks only",
  disabled_by_settings: "all hooks are switched off in your settings",
  bare: "this session runs without user configuration",
  untrusted_workspace: "this folder's trust prompt was not accepted",
};
var UNTRUSTED_BLOCK_REASONS = {
  untrusted: "this folder's trust prompt was not accepted",
  repo_provenance:
    "that file is part of the repository (or its provenance could not be read), which the cloud session has its own copy of",
  runtime_patch: "hooks set for this run only are not forwarded",
  served_folder: "the cloud session this computer serves can write that file",
};
//@ chunk-5tpnqyt5.js:27620-27624 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5tpnqyt5.js:27620", () => {
  init_react_production();
});
//@ chunk-5tpnqyt5.js:27624-27635 placement
var HOOK_LABEL_WIDTH = 250;
//@ chunk-5tpnqyt5.js:27635-30231 placement
function describeWhereHookRuns(props) {
  let $ = useMemoCache(34);
  let { forwarded, templateNames, consentLocation, current: currentAnswer, onDone } = props;
  let doneRef = useRef(false);
  let timeout = useTimeout(HOOK_LABEL_WIDTH);
  let finish;
  if ($[0] !== timeout || $[1] !== onDone) {
    finish = function finish(answer) {
      if (doneRef.current || !timeout) {
        return;
      }
      doneRef.current = true;
      onDone(answer);
    };
    $[0] = timeout;
    $[1] = onDone;
    $[2] = finish;
  } else finish = $[2];
  let finish_2 = finish;
  let hereLines;
  if ($[3] !== forwarded) {
    hereLines = forwarded > 0 ? [`${forwarded} ${plural(forwarded, "hook")} would run here`] : [];
    $[3] = forwarded;
    $[4] = hereLines;
  } else hereLines = $[4];
  let cloudLines;
  if ($[5] !== templateNames) {
    cloudLines =
      templateNames.length > 0 ? [`${templateNames.join(", ")} would run in the cloud session`] : [];
    $[5] = templateNames;
    $[6] = cloudLines;
  } else cloudLines = $[6];
  let lines;
  if ($[7] !== hereLines || $[8] !== cloudLines) {
    lines = [...hereLines, ...cloudLines];
    $[7] = hereLines;
    $[8] = cloudLines;
    $[9] = lines;
  } else lines = $[9];
  let joined = lines.join("; ");
  let onCancel;
  if ($[10] !== finish_2) {
    onCancel = () => finish_2("not_now");
    $[10] = finish_2;
    $[11] = onCancel;
  } else onCancel = $[11];
  let inputGuide;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "confirm",
        }),
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "skip for now",
        }),
      ],
    });
    $[12] = inputGuide;
  } else inputGuide = $[12];
  let introText;
  let timingText;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    introText = jsxProd_default(Text, {
      children:
        "Hooks in your user and local settings, or a --settings file, don't run in cloud sessions. If you say yes, cloud sessions started from this machine ask Claude Code here to run them. What a hook returns becomes part of the session's transcript.",
    });
    timingText = jsxProd_default(Text, {
      children:
        "Hooks run here only while Claude Code stays connected and answers in time. Otherwise the session continues without them: a hook that blocks a command here won't block it there, and your allow rules still apply.",
    });
    $[13] = introText;
    $[14] = timingText;
  } else {
    introText = $[13];
    timingText = $[14];
  }
  let rightNowText;
  if ($[15] !== joined) {
    rightNowText =
      joined !== "" &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Right now: ", joined, "."],
      });
    $[15] = joined;
    $[16] = rightNowText;
  } else rightNowText = $[16];
  const notNowNote =
    currentAnswer === "accepted"
      ? "Not now keeps your answer: yes."
      : currentAnswer === "declined"
        ? "Not now keeps your answer: no."
        : "Not now: no hooks run until you say yes.";
  let savedText;
  if ($[17] !== consentLocation || $[18] !== notNowNote) {
    savedText = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        "Yes or No is saved for this machine in ",
        consentLocation,
        ". Change it in /hooks.",
        " ",
        notNowNote,
      ],
    });
    $[17] = consentLocation;
    $[18] = notNowNote;
    $[19] = savedText;
  } else savedText = $[19];
  let body;
  if ($[20] !== savedText || $[21] !== rightNowText) {
    body = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [introText, timingText, rightNowText, savedText],
    });
    $[20] = savedText;
    $[21] = rightNowText;
    $[22] = body;
  } else body = $[22];
  let options;
  if ($[23] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        label: "Yes, run hooks for cloud sessions",
        value: "accepted",
      },
      {
        label: "No, don't run hooks for cloud sessions",
        value: "declined",
      },
      {
        label: "Not now",
        value: "not_now",
      },
    ];
    $[23] = options;
  } else options = $[23];
  const isDisabled = !timeout;
  let onCancel_2;
  if ($[24] !== finish_2) {
    onCancel_2 = () => finish_2("not_now");
    $[24] = finish_2;
    $[25] = onCancel_2;
  } else onCancel_2 = $[25];
  let selector;
  if ($[26] !== finish_2 || $[27] !== isDisabled || $[28] !== onCancel_2) {
    selector = jsxProd_default(ModelSelector, {
      selectedValue: NO_COMMITTED_ROW,
      options,
      defaultFocusValue: "not_now",
      hideIndexes: true,
      isDisabled,
      onChange: finish_2,
      onCancel: onCancel_2,
    });
    $[26] = finish_2;
    $[27] = isDisabled;
    $[28] = onCancel_2;
    $[29] = selector;
  } else selector = $[29];
  let dialog;
  if ($[30] !== body || $[31] !== selector || $[32] !== onCancel) {
    dialog = jsxProd_default_2(Dialog, {
      title: "Run this machine's hooks for cloud sessions?",
      onCancel,
      inputGuide,
      children: [body, selector],
    });
    $[30] = body;
    $[31] = selector;
    $[32] = onCancel;
    $[33] = dialog;
  } else dialog = $[33];
  return dialog;
}
//@ chunk-5tpnqyt5.js:30231-30235 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5tpnqyt5.js:30231", () => {
  init_react_production();
});
//@ chunk-5tpnqyt5.js:30235-30387 placement
var PLUGIN_HOOKS_NOTE =
  "Plugin hooks are not listed above. A plugin's hooks run in this cloud session only if the session loaded that plugin (see the top of /plugin).";
//@ chunk-5tpnqyt5.js:30387-30487 placement
function PluginHooksNote() {
  let $ = useMemoCache(1);
  let note;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    note = jsxProd_default(Text, {
      dimColor: true,
      children: PLUGIN_HOOKS_NOTE,
    });
    $[0] = note;
  } else note = $[0];
  return note;
}
//@ chunk-5tpnqyt5.js:30487-30531 placement
function dimSegment(text) {
  return {
    text,
    dimColor: true,
  };
}
//@ chunk-5tpnqyt5.js:30531-30562 placement
function segmentText(segment) {
  return segment.text;
}
//@ chunk-5tpnqyt5.js:30562-30684 placement
function renderStatusLine(row, key) {
  let { status, pieces } = row;
  return jsxProd_default_2(
    Text,
    {
      children: [
        jsxProd_default(StatusIcon, {
          status,
          withSpace: true,
        }),
        jsxProd_default(TextPieces, {
          pieces,
        }),
      ],
    },
    key,
  );
}
//@ chunk-5tpnqyt5.js:30684-30773 placement
function renderSegment(segment, index) {
  return jsxProd_default(
    Text,
    {
      dimColor: segment.dimColor,
      color: segment.color,
      children: segment.text,
    },
    index,
  );
}
//@ chunk-5tpnqyt5.js:30773-30938 placement
var CLOUD_HOOKS_INTRO =
  "Each row says where one of this machine's hooks runs for this cloud session. Hooks committed to the repository run in the cloud.";
var ROW_AGE_WIDTH = 40;
var ROW_COUNT_WIDTH = 7;
var ROW_NAME_WIDTH = 10;
var ROW_MATCHER_WIDTH = 8;
var ROW_COMMAND_WIDTH = 3;
//@ chunk-5tpnqyt5.js:30938-31592 placement
function renderCloudSessionBadge(props) {
  let $ = useMemoCache(11);
  let { summaryPromise, savedLine, hasPluginHooks } = props;
  let badge;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    badge = jsxProd_default_2(Text, {
      color: "suggestion",
      children: [figures_default.info, " Cloud session"],
    });
    $[0] = badge;
  } else badge = $[0];
  let savedText;
  if ($[1] !== savedLine) {
    savedText =
      savedLine !== undefined &&
      jsxProd_default(Text, {
        color: "success",
        children: savedLine,
      });
    $[1] = savedLine;
    $[2] = savedText;
  } else savedText = $[2];
  let fallback;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    fallback = jsxProd_default(Text, {
      dimColor: true,
      children: "Checking this machine's hooks\u2026",
    });
    $[3] = fallback;
  } else fallback = $[3];
  let notice;
  if ($[4] !== hasPluginHooks || $[5] !== savedLine || $[6] !== summaryPromise) {
    notice = jsxProd_default(suspenseTypeExport, {
      fallback,
      children: jsxProd_default(renderRemoteHostNotice, {
        summaryPromise,
        savedLine,
        hasPluginHooks,
      }),
    });
    $[4] = hasPluginHooks;
    $[5] = savedLine;
    $[6] = summaryPromise;
    $[7] = notice;
  } else notice = $[7];
  let box;
  if ($[8] !== savedText || $[9] !== notice) {
    box = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [badge, savedText, notice],
    });
    $[8] = savedText;
    $[9] = notice;
    $[10] = box;
  } else box = $[10];
  return box;
}
//@ chunk-5tpnqyt5.js:31592-32290 placement
function renderRemoteHostNotice(props) {
  let $ = useMemoCache(7);
  let { summaryPromise, savedLine, hasPluginHooks } = props;
  let summaryResult = use(summaryPromise);
  let consent = summaryResult.consent;
  if (consent === "off") {
    let offText;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      offText = jsxProd_default(Text, {
        dimColor: true,
        children:
          "Hooks from this machine's settings are not forwarded to this cloud session (hooks committed to the repository still run from the cloud's own copy).",
      });
      $[0] = offText;
    } else offText = $[0];
    return offText;
  }
  if (consent === "remote_host") {
    let remoteText;
    if ($[1] === MEMO_CACHE_SENTINEL) {
      remoteText = jsxProd_default(Text, {
        dimColor: true,
        children:
          "The hooks below are this machine's; this remote session runs the hooks configured on its own host.",
      });
      $[1] = remoteText;
    } else remoteText = $[1];
    return remoteText;
  }
  let offers;
  if ($[2] !== consent || $[3] !== hasPluginHooks || $[4] !== savedLine || $[5] !== summaryResult) {
    offers = jsxProd_default(renderCloudHookOffers, {
      summary: summaryResult,
      consent,
      savedLine,
      hasPluginHooks,
    });
    $[2] = consent;
    $[3] = hasPluginHooks;
    $[4] = savedLine;
    $[5] = summaryResult;
    $[6] = offers;
  } else offers = $[6];
  return offers;
}
//@ chunk-5tpnqyt5.js:32290-35042 placement
function renderCloudHookOffers(props) {
  let $ = useMemoCache(52);
  let { summary, consent, savedLine, hasPluginHooks } = props;
  let terminalSize = useTerminalSize();
  let reserve = useScrollColumnContext()?.reserve ?? SCROLL_COLUMN_MIN_ROWS;
  const rows = terminalSize.rows - reserve - ROW_COUNT_WIDTH;
  let size;
  if ($[0] !== rows || $[1] !== terminalSize.columns) {
    size = {
      rows,
      columns: terminalSize.columns,
    };
    $[0] = rows;
    $[1] = terminalSize.columns;
    $[2] = size;
  } else size = $[2];
  let { rows: rows_2, columns } = useScrollViewportSize(size);
  let width = columns - 2 * (useHasScrollViewport() ? PANE_PADDING_X : PANE_PADDING);
  let withheld;
  if ($[3] !== summary.withheld) {
    withheld = summary.withheld ?? [];
    $[3] = summary.withheld;
    $[4] = withheld;
  } else withheld = $[4];
  let notes;
  let inForce;
  let standIn;
  let total;
  let isIntroShown;
  let rows_3;
  if (
    $[5] !== consent ||
    $[6] !== hasPluginHooks ||
    $[7] !== rows_2 ||
    $[8] !== savedLine ||
    $[9] !== summary ||
    $[10] !== withheld ||
    $[11] !== width
  ) {
    let writableSources;
    if ($[18] !== summary.writableSources) {
      writableSources = summary.writableSources ?? [];
      $[18] = summary.writableSources;
      $[19] = writableSources;
    } else writableSources = $[19];
    let mapped = withheld.concat(writableSources).map(dimSegment);
    if (summary.keptFromLaunch !== undefined)
      mapped.push({
        text: summary.keptFromLaunch,
        color: "warning",
      });
    let inForce_2 = renderHookOriginSummary(summary, consent);
    const noteTexts = [
      ...(savedLine === undefined ? [] : [savedLine]),
      ...mapped.map(segmentText),
      ...(hasPluginHooks ? [PLUGIN_HOOKS_NOTE] : []),
      segmentsText(inForce_2),
    ];
    let subtractHeight;
    if ($[20] !== width) {
      subtractHeight = (acc, text) => acc - countWrappedLines(text, width);
      $[20] = width;
      $[21] = subtractHeight;
    } else subtractHeight = $[21];
    let availableRows = noteTexts.reduce(subtractHeight, rows_2 - 1);
    let introRows = countWrappedLines(CLOUD_HOOKS_INTRO, width) + 1;
    let standIn_2 =
      summary.unavailableReason !== undefined
        ? `None of this machine's hooks are offered (${summary.unavailableReason}).`
        : summary.rows.length === 0
          ? "This machine has no hooks a cloud session could use."
          : undefined;
    let total_2 = standIn_2 === undefined ? summary.rows.length : 0;
    let hookRows =
      standIn_2 === undefined
        ? summary.rows.slice(0, ROW_AGE_WIDTH).map((row) => classifyHookLocation(row, consent, summary))
        : [];
    let measureRow;
    if ($[22] !== width) {
      measureRow = (row) => {
        let { status, pieces } = row;
        return countWrappedLines(`${STATUS_CONFIG[status].icon} ${segmentsText(pieces)}`, width);
      };
      $[22] = width;
      $[23] = measureRow;
    } else measureRow = $[23];
    let heights = hookRows.map(measureRow);
    let visibleCount = fittingRowCount(heights, total_2, availableRows - introRows);
    let showIntro =
      standIn_2 === undefined
        ? visibleCount > 0
        : availableRows - introRows - countWrappedLines(standIn_2, width) >= ROW_NAME_WIDTH;
    notes = mapped;
    inForce = inForce_2;
    standIn = standIn_2;
    total = total_2;
    isIntroShown = showIntro;
    rows_3 = hookRows.slice(0, showIntro ? visibleCount : fittingRowCount(heights, total_2, availableRows));
    $[5] = consent;
    $[6] = hasPluginHooks;
    $[7] = rows_2;
    $[8] = savedLine;
    $[9] = summary;
    $[10] = withheld;
    $[11] = width;
    $[12] = notes;
    $[13] = inForce;
    $[14] = standIn;
    $[15] = total;
    $[16] = isIntroShown;
    $[17] = rows_3;
  } else {
    notes = $[12];
    inForce = $[13];
    standIn = $[14];
    total = $[15];
    isIntroShown = $[16];
    rows_3 = $[17];
  }
  let layout;
  if (
    $[24] !== notes ||
    $[25] !== inForce ||
    $[26] !== standIn ||
    $[27] !== total ||
    $[28] !== isIntroShown ||
    $[29] !== rows_3
  ) {
    layout = {
      notes,
      inForce,
      standIn,
      total,
      isIntroShown,
      rows: rows_3,
    };
    $[24] = notes;
    $[25] = inForce;
    $[26] = standIn;
    $[27] = total;
    $[28] = isIntroShown;
    $[29] = rows_3;
    $[30] = layout;
  } else layout = $[30];
  let layout_2 = layout;
  let introText;
  if ($[31] !== layout_2.isIntroShown) {
    introText =
      layout_2.isIntroShown &&
      jsxProd_default(Text, {
        dimColor: true,
        children: CLOUD_HOOKS_INTRO,
      });
    $[31] = layout_2.isIntroShown;
    $[32] = introText;
  } else introText = $[32];
  const marginTop = layout_2.isIntroShown ? 1 : 0;
  let rowsView;
  if ($[33] !== layout_2.rows || $[34] !== layout_2.standIn || $[35] !== layout_2.total) {
    rowsView =
      layout_2.standIn !== undefined
        ? jsxProd_default(Text, {
            dimColor: true,
            children: layout_2.standIn,
          })
        : jsxProd_default_2(Fragment, {
            children: [
              layout_2.rows.map(renderStatusLine),
              jsxProd_default(OverflowHint, {
                count: layout_2.total - layout_2.rows.length,
                unit: "hook",
              }),
            ],
          });
    $[33] = layout_2.rows;
    $[34] = layout_2.standIn;
    $[35] = layout_2.total;
    $[36] = rowsView;
  } else rowsView = $[36];
  let notesView;
  if ($[37] !== layout_2.notes) {
    notesView = layout_2.notes.map(renderSegment);
    $[37] = layout_2.notes;
    $[38] = notesView;
  } else notesView = $[38];
  let pluginNote;
  if ($[39] !== hasPluginHooks) {
    pluginNote = hasPluginHooks && jsxProd_default(PluginHooksNote, {});
    $[39] = hasPluginHooks;
    $[40] = pluginNote;
  } else pluginNote = $[40];
  let inForceView;
  if ($[41] !== layout_2.inForce) {
    inForceView = jsxProd_default(Text, {
      children: jsxProd_default(TextPieces, {
        pieces: layout_2.inForce,
      }),
    });
    $[41] = layout_2.inForce;
    $[42] = inForceView;
  } else inForceView = $[42];
  let content;
  if (
    $[43] !== marginTop ||
    $[44] !== rowsView ||
    $[45] !== notesView ||
    $[46] !== pluginNote ||
    $[47] !== inForceView
  ) {
    content = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop,
      children: [rowsView, notesView, pluginNote, inForceView],
    });
    $[43] = marginTop;
    $[44] = rowsView;
    $[45] = notesView;
    $[46] = pluginNote;
    $[47] = inForceView;
    $[48] = content;
  } else content = $[48];
  let root;
  if ($[49] !== introText || $[50] !== content) {
    root = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [introText, content],
    });
    $[49] = introText;
    $[50] = content;
    $[51] = root;
  } else root = $[51];
  return root;
}
//@ chunk-5tpnqyt5.js:35042-35158 placement
function TextPieces({ pieces }) {
  return pieces.map((piece, index) =>
    jsxProd_default(
      Text,
      {
        bold: piece.bold,
        dimColor: piece.dimColor,
        color: piece.color,
        children: piece.text,
      },
      index,
    ),
  );
}
//@ chunk-5tpnqyt5.js:35158-35267 placement
function fittingRowCount(heights, totalRows, availableRows) {
  let usedRows = 0;
  let shownCount = 0;
  for (let height of heights) {
    usedRows += height;
    let gutterWidth = shownCount < ROW_COMMAND_WIDTH ? ROW_MATCHER_WIDTH : ROW_NAME_WIDTH;
    if (usedRows + (shownCount + 1 < totalRows ? 1 : 0) > availableRows - gutterWidth) break;
    shownCount++;
  }
  return shownCount;
}
//@ chunk-5tpnqyt5.js:35267-35317 placement
function segmentsText(segments) {
  return segments.map((segment) => segment.text).join("");
}
//@ chunk-5tpnqyt5.js:35317-35383 placement
function countWrappedLines(text, width) {
  return (
    1 +
    countCharInString(
      wrapText(expandTabsInText(text), Math.max(1, width), "wrap"),
      `
`,
    )
  );
}
//@ chunk-5tpnqyt5.js:35383-36008 placement
function renderHookOriginSummary(summary, consent) {
  let prefix = {
    text: "Hooks from this machine: ",
  };
  switch (consent) {
    case "accepted":
      return [
        prefix,
        {
          text: "on",
          bold: true,
        },
        {
          text: " \xB7 change it below",
          dimColor: true,
        },
        ...(summary.standing === undefined
          ? []
          : [segmentStyle(` \xB7 for this session: ${summary.standing}`, summary.standingIsIdle)]),
      ];
    case "declined":
      return [
        prefix,
        {
          text: "off",
          bold: true,
        },
        {
          text: " \xB7 change it below",
          dimColor: true,
        },
      ];
    case "unset":
      return summary.storedAnswerNotUsed !== undefined
        ? [
            prefix,
            {
              text: "saved answer not used",
              bold: true,
            },
            {
              text: `. ${summary.storedAnswerNotUsed} Answer again below for this terminal.`,
              dimColor: true,
            },
          ]
        : [
            prefix,
            {
              text: "not decided",
              bold: true,
            },
            {
              text: " \xB7 none run for cloud sessions until you decide below",
              dimColor: true,
            },
          ];
  }
}
//@ chunk-5tpnqyt5.js:36008-36596 placement
function describeCloudAcceptance(row, consent) {
  switch (row.where) {
    case "cloud":
      return consent === "accepted"
        ? "runs in the cloud"
        : consent === "declined"
          ? "would run in the cloud (hooks from this machine are off)"
          : "will run in the cloud once you allow it";
    case "local":
      return row.reason === "event_runs_locally"
        ? "is not sent to the cloud"
        : row.reason === "duplicate"
          ? "duplicates a row above"
          : "does not run for cloud work";
    case "here":
      return consent === "declined"
        ? "does not run (hooks from this machine are off)"
        : `${consent === "accepted" ? "runs here when the session asks" : "will run here once you allow it"}${row.exceptAfterEdits ? ", except after cloud file edits" : ""}`;
  }
}
//@ chunk-5tpnqyt5.js:36596-37358 placement
function classifyHookLocation(row, consent, { notInForce, standingIsIdle }) {
  let isNotRunning = row.where === "here" && consent === "accepted" && notInForce === true;
  let eventLabel =
    row.matcher !== undefined && row.matcher !== "" ? `${row.event}:${row.matcher}` : row.event;
  return {
    status: row.where === "local" || consent !== "accepted" || isNotRunning ? "pending" : "success",
    pieces: [
      {
        text: row.label,
        bold: true,
      },
      {
        text: " ",
      },
      {
        text: `\xB7 ${eventLabel} \xB7 ${HOOK_SOURCE_LABELS[row.source].tag} \xB7`,
        dimColor: true,
      },
      {
        text: ` ${describeCloudAcceptance(row, consent)}`,
      },
      ...(consent !== "declined" && row.where === "here" && row.optedIn
        ? [
            {
              text: ', only because its entry is marked cloud: "device"',
              dimColor: true,
            },
          ]
        : []),
      ...(row.where === "local"
        ? [
            {
              text: `: ${row.why}`,
              dimColor: true,
            },
          ]
        : []),
      ...(row.where !== "local" && row.fromWritableFile
        ? [
            {
              text: " (its settings file can be written by the cloud session; what was registered when you attached is what runs)",
              dimColor: true,
            },
          ]
        : []),
      ...(isNotRunning ? [segmentStyle(" \xB7 not running now", standingIsIdle)] : []),
    ],
  };
}
//@ chunk-5tpnqyt5.js:37358-37430 placement
function segmentStyle(text, standingIsIdle) {
  return standingIsIdle
    ? {
        text,
        dimColor: true,
      }
    : {
        text,
        color: "warning",
      };
}
//@ chunk-5tpnqyt5.js:37430-37749 placement
function useEnterEscape(props) {
  let $ = useMemoCache(8);
  let { enter, escape: escapeAction } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let enterHint;
  if ($[0] !== enter || $[1] !== isScreenReaderEnabled) {
    enterHint =
      !isScreenReaderEnabled &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "enter",
        action: enter,
      });
    $[0] = enter;
    $[1] = isScreenReaderEnabled;
    $[2] = enterHint;
  } else enterHint = $[2];
  let escapeHint;
  if ($[3] !== escapeAction) {
    escapeHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: escapeAction,
    });
    $[3] = escapeAction;
    $[4] = escapeHint;
  } else escapeHint = $[4];
  let hints;
  if ($[5] !== enterHint || $[6] !== escapeHint) {
    hints = jsxProd_default_2(Byline, {
      children: [enterHint, escapeHint],
    });
    $[5] = enterHint;
    $[6] = escapeHint;
    $[7] = hints;
  } else hints = $[7];
  return hints;
}
//@ chunk-5tpnqyt5.js:37749-37781 placement
function hooksOf(entry) {
  return entry.hooks;
}
//@ chunk-5tpnqyt5.js:37781-37821 placement
function lowercase(text) {
  return text.toLowerCase();
}
//@ chunk-5tpnqyt5.js:37821-42121 placement
/**
 * /hooks 首页：列出事件及其钩子数量、托管钩子提示与云会话钩子状态。
 */
function HooksOverview(props) {
  let $ = useMemoCache(70);
  let {
    hookEventMetadata,
    hooksByEventAndMatcher,
    restrictedByPolicy,
    suspendedBySafeMode,
    cloudSessionPanel,
    onDecideCloudHooks,
    defaultFocusIndex,
    onFocusRow,
    onSelectHook,
    onOpenEvents,
    onCancel,
  } = props;
  let listComponent;
  let contentBox;
  let dialogComponent;
  let flatHooks;
  let defaultFocusIndex_2;
  let policyNotice;
  let readOnlyNote;
  let title;
  let subtitle;
  let onCancel_2;
  let inputGuide;
  let onFocus;
  let onSelect;
  let cloudDecisionRow;
  let eventRows;
  let flexDirection;
  let gap;
  let cloudPanel;
  let safeModeNotice;
  if (
    $[0] !== cloudSessionPanel ||
    $[1] !== defaultFocusIndex ||
    $[2] !== hookEventMetadata ||
    $[3] !== hooksByEventAndMatcher ||
    $[4] !== onCancel ||
    $[5] !== onDecideCloudHooks ||
    $[6] !== onFocusRow ||
    $[7] !== onOpenEvents ||
    $[8] !== onSelectHook ||
    $[9] !== restrictedByPolicy ||
    $[10] !== suspendedBySafeMode
  ) {
    const entries = Object.entries(hookEventMetadata);
    let eventMapper;
    if ($[30] !== hooksByEventAndMatcher) {
      eventMapper = (pair) => {
        let [event, metadata] = pair;
        let event_2 = event;
        let byMatcher = hooksByEventAndMatcher[event_2] ?? {};
        let flattened = getSortedMatchersForEvent(hooksByEventAndMatcher, event_2).flatMap(
          (matcher) => byMatcher[matcher] ?? [],
        );
        return flattened.length > 0
          ? [
              {
                event: event_2,
                metadata,
                hooks: flattened,
              },
            ]
          : [];
      };
      $[30] = hooksByEventAndMatcher;
      $[31] = eventMapper;
    } else eventMapper = $[31];
    let flattened = entries.flatMap(eventMapper);
    flatHooks = flattened.flatMap(hooksOf);
    let cloudRowCount = onDecideCloudHooks ? 1 : 0;
    dialogComponent = Dialog;
    title = "Hooks";
    subtitle =
      flatHooks.length === 0
        ? restrictedByPolicy
          ? "managed hooks only"
          : "no hooks yet"
        : `${flatHooks.length} ${plural(flatHooks.length, "hook")} on ${flattened.length} ${plural(flattened.length, "event")}`;
    onCancel_2 = onCancel;
    if ($[32] === MEMO_CACHE_SENTINEL) {
      inputGuide = jsxProd_default(useEnterEscape, {
        enter: "view",
        escape: "close",
      });
      $[32] = inputGuide;
    } else inputGuide = $[32];
    contentBox = Box;
    flexDirection = "column";
    gap = 1;
    cloudPanel = cloudSessionPanel;
    if ($[33] !== suspendedBySafeMode) {
      safeModeNotice =
        suspendedBySafeMode &&
        jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default(StatusRow, {
              status: "warning",
              children: "Safe mode: hooks from settings files won't run this session.",
            }),
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "Session hooks created by /goal, agents and skills still run",
                suspendedBySafeMode.managedHooksStillApply ? ", and managed policy hooks still apply" : "",
                ". Settings edits save but don't load until safe mode is off.",
                " ",
                capitalize(suspendedBySafeMode.exitHint),
                " to leave safe mode.",
              ],
            }),
          ],
        });
      $[33] = suspendedBySafeMode;
      $[34] = safeModeNotice;
    } else safeModeNotice = $[34];
    if ($[35] !== restrictedByPolicy) {
      policyNotice =
        restrictedByPolicy &&
        jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default(StatusRow, {
              status: "info",
              children: "Only hooks from managed settings run here.",
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children:
                "Hooks in your own settings files (user, project and local) are blocked and aren't listed. Managed hooks aren't shown here either.",
            }),
          ],
        });
      $[35] = restrictedByPolicy;
      $[36] = policyNotice;
    } else policyNotice = $[36];
    if ($[37] === MEMO_CACHE_SENTINEL) {
      readOnlyNote = jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "This menu is read-only. To add or change a hook, edit settings.json or ask Claude.",
          " ",
          jsxProd_default(Link, {
            url: "https://code.claude.com/docs/en/hooks",
            children: "Learn more",
          }),
        ],
      });
      $[37] = readOnlyNote;
    } else readOnlyNote = $[37];
    listComponent = OrderedListWithItem;
    defaultFocusIndex_2 = defaultFocusIndex;
    onFocus = onFocusRow;
    onSelect = (index) => {
      if (index < cloudRowCount) {
        onDecideCloudHooks?.();
        return;
      }
      let hook = flatHooks[index - cloudRowCount];
      if (hook) {
        onSelectHook(hook);
        return;
      }
      onOpenEvents();
    };
    if ($[38] !== onDecideCloudHooks) {
      cloudDecisionRow =
        onDecideCloudHooks &&
        jsxProd_default(
          merged.Item,
          {
            lines: 2,
            children: jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                jsxProd_default(Text, {
                  color: "suggestion",
                  wrap: "truncate-end",
                  children: "Decide whether cloud sessions run this machine's hooks\u2026",
                }),
                jsxProd_default(Text, {
                  dimColor: true,
                  wrap: "truncate-end",
                  children: "Saved for this machine; change the answer here any time",
                }),
              ],
            }),
          },
          "decide-cloud-hooks",
        );
      $[38] = onDecideCloudHooks;
      $[39] = cloudDecisionRow;
    } else cloudDecisionRow = $[39];
    let eventRowMapper;
    if ($[40] !== onDecideCloudHooks) {
      eventRowMapper = (eventGroup, eventIndex) => [
        ...(eventIndex > 0 || onDecideCloudHooks
          ? [jsxProd_default(merged.Heading, {}, `${eventGroup.event}-gap`)]
          : []),
        jsxProd_default(
          merged.Heading,
          {
            children: jsxProd_default_2(Text, {
              wrap: "truncate-end",
              children: [
                jsxProd_default(Text, {
                  bold: true,
                  children: eventGroup.event,
                }),
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["  ", eventGroup.metadata.summary.replace(/^\p{Lu}(?=\p{Ll}|\s)/u, lowercase)],
                }),
              ],
            }),
          },
          `${eventGroup.event}-heading`,
        ),
        ...eventGroup.hooks.map((hook, hookIndex) =>
          jsxProd_default(
            OrderedListWithItem.Item,
            {
              icon: jsxProd_default_2(Text, {
                dimColor: true,
                children: ["[", hookSourceInlineDisplayString(hook.source), "]"],
              }),
              label: getHookProgressDisplay(hook.config).command,
              meta: [
                hook.source === "pluginHook" && hook.pluginName
                  ? escapeControlCharsForDisplay(hook.pluginName)
                  : "",
                hook.matcher ? escapeControlCharsForDisplay(hook.matcher) : "",
                hook.config.type,
              ],
            },
            `${eventGroup.event}-${hookIndex}`,
          ),
        ),
      ];
      $[40] = onDecideCloudHooks;
      $[41] = eventRowMapper;
    } else eventRowMapper = $[41];
    eventRows = flattened.flatMap(eventRowMapper);
    $[0] = cloudSessionPanel;
    $[1] = defaultFocusIndex;
    $[2] = hookEventMetadata;
    $[3] = hooksByEventAndMatcher;
    $[4] = onCancel;
    $[5] = onDecideCloudHooks;
    $[6] = onFocusRow;
    $[7] = onOpenEvents;
    $[8] = onSelectHook;
    $[9] = restrictedByPolicy;
    $[10] = suspendedBySafeMode;
    $[11] = listComponent;
    $[12] = contentBox;
    $[13] = dialogComponent;
    $[14] = flatHooks;
    $[15] = defaultFocusIndex_2;
    $[16] = policyNotice;
    $[17] = readOnlyNote;
    $[18] = title;
    $[19] = subtitle;
    $[20] = onCancel_2;
    $[21] = inputGuide;
    $[22] = onFocus;
    $[23] = onSelect;
    $[24] = cloudDecisionRow;
    $[25] = eventRows;
    $[26] = flexDirection;
    $[27] = gap;
    $[28] = cloudPanel;
    $[29] = safeModeNotice;
  } else {
    listComponent = $[11];
    contentBox = $[12];
    dialogComponent = $[13];
    flatHooks = $[14];
    defaultFocusIndex_2 = $[15];
    policyNotice = $[16];
    readOnlyNote = $[17];
    title = $[18];
    subtitle = $[19];
    onCancel_2 = $[20];
    inputGuide = $[21];
    onFocus = $[22];
    onSelect = $[23];
    cloudDecisionRow = $[24];
    eventRows = $[25];
    flexDirection = $[26];
    gap = $[27];
    cloudPanel = $[28];
    safeModeNotice = $[29];
  }
  let eventsGap;
  if ($[42] !== flatHooks.length || $[43] !== onDecideCloudHooks) {
    eventsGap =
      (flatHooks.length > 0 || onDecideCloudHooks) && jsxProd_default(merged.Heading, {}, "events-gap");
    $[42] = flatHooks.length;
    $[43] = onDecideCloudHooks;
    $[44] = eventsGap;
  } else eventsGap = $[44];
  let allEventsRow;
  if ($[45] === MEMO_CACHE_SENTINEL) {
    allEventsRow = jsxProd_default(
      merged.Item,
      {
        children: jsxProd_default(AllEventsLabel, {}),
      },
      "events",
    );
    $[45] = allEventsRow;
  } else allEventsRow = $[45];
  let list;
  if (
    $[46] !== listComponent ||
    $[47] !== defaultFocusIndex_2 ||
    $[48] !== eventsGap ||
    $[49] !== onFocus ||
    $[50] !== onSelect ||
    $[51] !== cloudDecisionRow ||
    $[52] !== eventRows
  ) {
    list = jsxProd_default_2(listComponent, {
      defaultFocusIndex: defaultFocusIndex_2,
      onFocus,
      onSelect,
      children: [cloudDecisionRow, eventRows, eventsGap, allEventsRow],
    });
    $[46] = listComponent;
    $[47] = defaultFocusIndex_2;
    $[48] = eventsGap;
    $[49] = onFocus;
    $[50] = onSelect;
    $[51] = cloudDecisionRow;
    $[52] = eventRows;
    $[53] = list;
  } else list = $[53];
  let children;
  if (
    $[54] !== contentBox ||
    $[55] !== policyNotice ||
    $[56] !== readOnlyNote ||
    $[57] !== list ||
    $[58] !== flexDirection ||
    $[59] !== gap ||
    $[60] !== cloudPanel ||
    $[61] !== safeModeNotice
  ) {
    children = jsxProd_default_2(contentBox, {
      flexDirection,
      gap,
      children: [cloudPanel, safeModeNotice, policyNotice, readOnlyNote, list],
    });
    $[54] = contentBox;
    $[55] = policyNotice;
    $[56] = readOnlyNote;
    $[57] = list;
    $[58] = flexDirection;
    $[59] = gap;
    $[60] = cloudPanel;
    $[61] = safeModeNotice;
    $[62] = children;
  } else children = $[62];
  let dialog;
  if (
    $[63] !== dialogComponent ||
    $[64] !== title ||
    $[65] !== subtitle ||
    $[66] !== onCancel_2 ||
    $[67] !== inputGuide ||
    $[68] !== children
  ) {
    dialog = jsxProd_default(dialogComponent, {
      title,
      subtitle,
      onCancel: onCancel_2,
      inputGuide,
      children,
    });
    $[63] = dialogComponent;
    $[64] = title;
    $[65] = subtitle;
    $[66] = onCancel_2;
    $[67] = inputGuide;
    $[68] = children;
    $[69] = dialog;
  } else dialog = $[69];
  return dialog;
}
//@ chunk-5tpnqyt5.js:42121-42271 placement
function AllEventsLabel() {
  let $ = useMemoCache(2);
  const color = isMenuOpen() ? "suggestion" : undefined;
  let label;
  if ($[0] !== color) {
    label = jsxProd_default(Text, {
      color,
      children: "All events",
    });
    $[0] = color;
    $[1] = label;
  } else label = $[1];
  return label;
}
export { useEnterEscape, buildCloudHookRows, renderCloudSessionBadge, HooksOverview, describeWhereHookRuns };
