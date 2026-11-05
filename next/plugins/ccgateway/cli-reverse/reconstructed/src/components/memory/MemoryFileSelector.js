/**
 * components/memory/MemoryFileSelector.tsx
 *
 * /memory 记忆文件选择器：用户/项目/本地 CLAUDE.md 与自动记忆、团队/账号记忆同步状态。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/memory/MemoryFileSelector.tsx
 * pieces: chunk-5xgkngpb.js (1), chunk-czq1j3j2.js (1), chunk-dzt5bmy4.js (7)
 * attribution: fingerprint 3, placement 2, layout 3, callgraph-witnessed 1
 */
import { join } from "path";
import { mkdir } from "fs/promises";
import {
  isMemoryRecallEnabled,
  isAutoMemoryEnabledIgnoringPause,
  isAutoMemoryDisabledForCurrentMainLoopModel,
} from "../../memdir/paths.js";
import { SessionRootSlot, getSessionProject } from "../../bootstrap/sessionSlices.js";
import { discoverOrgMemoryStores, getOrgMemoryPickerData } from "../../services/orgMemory/discovery.js";
import {
  isLastAskDowngraded,
  getOrgMemoryDecision,
  classifyStorePath,
  hasPrivateGrouping,
  stripTrailingSlashes,
  grantedModeFor,
  isOrgMemoryWriteOptedIn,
  canWriteOrgMemory,
  isOrgMemoryWritesEnabledForAccount,
  isMonorepoWriteBlocked,
  applyOrgMemoryDecision,
  shrinkOrgMemoryDecisionWriteAsk,
} from "../../services/orgMemory/orgMemoryDecision.js";
import { getMemoryDirNfc } from "../../memdir/teamMemPaths.js";
import { packageManagerAutoUpdaterSlot } from "../PackageManagerAutoUpdater.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import {
  use,
  useState,
  useRef,
  useEffect,
  startTransition,
} from "../../../vendor/react/cjs/react.production.js";
import { getMemoryFilesCached } from "../../utils/claudemd.js";
import { isSafeMode } from "../../utils/envUtils.js";
import { useLatestState } from "../CustomSelect/option-map.js";
import {
  getEffectiveSelection,
  isPublicProjects,
  EXPLICIT_OFF_SELECTION,
  saveOrgMemorySelection,
} from "../../services/orgMemory/selection.js";
import { isOrgMemoryReadEnabled } from "../../services/memorySync/availability.js";
import { getCurrentProjectConfig } from "../../utils/config.js";
import {
  getMemorySyncState,
  autoMemoryToggleState,
  buildMemoryFileChoices,
  getAutoMemoryChoices,
  getAgentMemoryChoices,
  alwaysFalse,
  describeAutoMemoryToggle,
  describeAutoDreamToggle,
  CANNOT_ENABLE_HERE_DETAIL,
} from "../../commands/memory/memoryFileChoices.js";
import { getMemoryToggledOff, getAutoMemoryOffThisSession } from "../../bootstrap/state.js";
import { mergeByPath } from "../../context.js";
import { useAppState } from "../../state/AppState.js";
import { logEvent } from "../../services/analytics/index.js";
import { isAutoDreamEnabled, isAutoDreamFeatureOn } from "../../services/autoDream/config.js";
import { onGrowthBookRefresh } from "../../services/analytics/growthbook.js";
import { readLastConsolidatedAt } from "../../services/autoDream/consolidationLock.js";
import {
  updateSettingsForSourceWithTransform,
  getInitialSettings,
  updateSettingsForSource,
} from "../../utils/settings/settings.js";
import { toggleAutoMemoryForSession } from "../../cli/startup/startupMisc.js";
import { saveAutoMemorySessionSwitch } from "../../utils/sessionStorage.js";
import { a11yValueWidth, merged } from "../CustomSelect/selectA11y.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useGlobalExitKeybindings, useKeybinding } from "../../keybindings/useKeybinding.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { ListItem } from "../design-system/ListItem.js";
import { useDialogKeybindings } from "../../keybindings/dialogKeyHints.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { switchOrgMemoryProject } from "./OrgMemoryProjectPicker.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { clearOrgMemoryCredential } from "../../services/orgMemory/credential.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { openPath } from "../../utils/browser.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1349778-1349854 fingerprint (2.1.88 match: _temp, 1)
function filterAutoMemWhenDisabled(f_1) {
  if (!isMemoryRecallEnabled()) return f_1;
  return f_1.filter((entry) => entry.type !== "AutoMem");
}
//@ chunk-czq1j3j2.js:749350-749392 fingerprint (2.1.88 match: _temp5, 0.751)
function isDreamTask(t) {
  return t.type === "dream";
}
//@ chunk-dzt5bmy4.js:32908-33008 placement
class RowsOnce {
  promise = null;
  rowsOnce(loader) {
    this.promise ??= loader();
    return this.promise;
  }
  reset() {
    this.promise = null;
  }
}
//@ chunk-dzt5bmy4.js:33008-33034 placement
var memoryRowsCache; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dzt5bmy4.js:33008", () => {
  memoryRowsCache = new SessionRootSlot(() => new RowsOnce());
});
//@ chunk-dzt5bmy4.js:33034-33046 layout
var OPEN_FOLDER_API = null;
//@ chunk-dzt5bmy4.js:33046-33093 fingerprint (2.1.88 match: OPEN_FOLDER_PREFIX, 1)
var ORG_PICKER_API = null;
var MEMORY_DIALOG_API = null;
var OPEN_FOLDER_VALUE = "__open_folder__";
var MAX_VISIBLE_MEMORY_ROWS = 30;
//@ chunk-dzt5bmy4.js:33093-34026 layout
/**
 * /memory 选择器里组织记忆的行：发现团队范围的记忆挂载点，按当前授权（公开/私有项目、读写权限）给每个挂载点生成说明。
 */
function loadOrgMemoryRows(cache, storageV5, signal) {
  return cache.rowsOnce(async () => {
    let discoveredStores = await discoverOrgMemoryStores(storageV5, signal).catch(() => null);
    let picker = getOrgMemoryPickerData();
    if (discoveredStores === null)
      return {
        mounts: [],
        picker,
      };
    let isWritesDowngraded = isLastAskDowngraded();
    let orgMemoryDecision = getOrgMemoryDecision();
    let publicGroupingRoot =
      orgMemoryDecision.state === "on"
        ? orgMemoryDecision.initialGrant.find(
            (groupingRootGrant) =>
              classifyStorePath(groupingRootGrant.path) === "grouping_root" ||
              (groupingRootGrant.kind === "grouping_root" &&
                classifyStorePath(groupingRootGrant.path) === "unknown"),
          )
        : undefined;
    let privateGrouping =
      orgMemoryDecision.state === "on"
        ? orgMemoryDecision.initialGrant.find(
            (groupingGrant) =>
              groupingGrant.kind === "grouping" || classifyStorePath(groupingGrant.path) === "grouping",
          )
        : undefined;
    let hasPrivateGroupingStore =
      orgMemoryDecision.state === "on" && hasPrivateGrouping(orgMemoryDecision.initialGrant);
    return {
      mounts: discoveredStores
        .filter((store) => store.scope === "team")
        .map((store) => ({
          mount: store.mount,
          dir: join(getMemoryDirNfc(), store.mount),
          description:
            publicGroupingRoot !== undefined &&
            stripTrailingSlashes(store.path) === stripTrailingSlashes(publicGroupingRoot.path)
              ? store.mode === "rw" && grantedModeFor(store.path) === "rw" && isOrgMemoryWriteOptedIn()
                ? "public project memory, read-write"
                : "public project memory, read-only"
              : privateGrouping !== undefined &&
                  stripTrailingSlashes(store.path) === stripTrailingSlashes(privateGrouping.path)
                ? hasPrivateGroupingStore
                  ? "private project, read-only"
                  : "project memory, read-only"
                : store.mode === "rw" && grantedModeFor(store.path) === "rw" && isOrgMemoryWriteOptedIn()
                  ? "read-write"
                  : hasPrivateGroupingStore
                    ? "read-only \u2014 private project selected"
                    : isWritesDowngraded
                      ? "writes requested \u2014 granted read-only"
                      : "read-only",
        })),
      picker,
    };
  });
}
//@ chunk-dzt5bmy4.js:34026-34097 layout
var ORG_PICKER_VALUE = "__org_memory_project_picker__";
var ORG_MEMORY_OFF_VALUE = "__org_memory_project_off__";
//@ chunk-dzt5bmy4.js:34097-43043 callgraph-witnessed (2.1.88 match: MemoryFileSelector, 0.16)
/**
 * /memory：列出可编辑的记忆文件（用户/项目/本地 CLAUDE.md、自动记忆目录），以及团队/账号记忆同步状态（paused/active），选择后用编辑器打开。
 */
function MemoryFileSelector({
  session,
  commandContext,
  addedInstructionFiles,
  onSelect,
  onCancel,
  onProjectSwitch,
}) {
  let originalCwd = getSessionProject(session).originalCwd;
  let updaterSlot = packageManagerAutoUpdaterSlot.of(session.host);
  let cache = memoryRowsCache.of(session);
  let { storageV5, credentials } = useTheme_2();
  let memoryFiles = use(getMemoryFilesCached(session, false, storageV5, credentials));
  let autoMemoryAvailable = isAutoMemoryEnabledIgnoringPause() || isSafeMode();
  let autoMemoryEnabled = isAutoMemoryEnabledIgnoringPause() && !isSafeMode();
  let { mounts, picker } = autoMemoryEnabled
    ? use(loadOrgMemoryRows(cache, storageV5, credentials))
    : {
        mounts: [],
        picker: null,
      };
  let [isProjectPickerOpen, setProjectPickerOpen, getProjectPickerOpen] = useLatestState(false);
  let [isPickerRequested, setIsPickerRequested] = useState(false);
  let [selectedPickId, setSelectedPickId] = useState(getEffectiveSelection);
  let isPublicProjectPick = selectedPickId !== null && isPublicProjects(selectedPickId);
  let [isOrgReadFeatureEnabled] = useState(isOrgMemoryReadEnabled);
  let [orgMemoryReadConfigured] = useState(() => getCurrentProjectConfig().orgMemoryRead ?? true);
  let [noticeText, setNoticeText] = useState(null);
  let [isSwitching, setIsSwitching] = useState(false);
  let existingMemoryFiles = useRef(false);
  let canSwitchProjects = onProjectSwitch !== undefined && isOrgMemoryReadEnabled();
  let orgMemoryDecision = getOrgMemoryDecision();
  let [memorySyncState] = useState(() => (OPEN_FOLDER_API === null ? "closed" : getMemorySyncState()));
  let hasMemorySync = memorySyncState !== "closed";
  let isSyncPending = memorySyncState === "pending";
  let [isAutoMemoryToggleAllowed] = useState(autoMemoryToggleState);
  let [orgMemoryWriteState, setOrgMemoryWriteState] = useState(() => null);
  let [isMemoryToggledOff, setMemoryToggledOff] = useState(getMemoryToggledOff);
  let [orgMemorySyncState] = useState(() => null);
  let syncStatusBadge = !autoMemoryEnabled
    ? null
    : orgMemoryDecision.state === "on"
      ? {
          label: "active",
          note: orgMemoryDecision.stores.map((store) => store.mount).join(", "),
        }
      : orgMemoryDecision.state === "parked"
        ? {
            label: "parked",
            note: canSwitchProjects
              ? "paused for this session \u2014 pick a project to reconnect"
              : "paused for this session \u2014 a new pick still applies next session",
          }
        : orgMemoryDecision.state === "ended"
          ? {
              label: "ended",
              note:
                orgMemoryDecision.cause === "account_switch"
                  ? "account changed \u2014 next session decides fresh"
                  : "signed out \u2014 next session decides fresh",
            }
          : null;
  let memoryOptions = buildMemoryFileChoices(
    mergeByPath(memoryFiles, addedInstructionFiles),
    originalCwd,
    "\xB7 ",
  ).map((file) => ({
    label: file.label,
    value: file.path,
    description: file.description,
  }));
  let orgMemoryRows = [];
  let fileChoiceRows = [];
  let agentDefinitions = useAppState((appState) => appState.agentDefinitions);
  let [orgMemoryUiState] = useState(() => ({
    write: false,
    picker: false,
    pickerData: null,
  }));
  if (picker !== null) orgMemoryUiState.pickerData = picker;
  let activePicker = picker ?? orgMemoryUiState.pickerData;
  let isLegacyPickNudged = activePicker !== null && isPublicProjectPick;
  useEffect(() => {
    if (isLegacyPickNudged) logEvent("tengu_org_memory_legacy_pick_nudged", {});
  }, [isLegacyPickNudged]);
  let isPickApplied =
    orgMemoryDecision.state === "on" && selectedPickId === orgMemoryDecision.request.selection;
  let isPrivatePick =
    selectedPickId !== null &&
    (isPickApplied
      ? hasPrivateGrouping(orgMemoryDecision.initialGrant)
      : activePicker?.candidates.find((candidate) => candidate.id === selectedPickId)?.visibility ===
        "private");
  let defaultFocusValue =
    selectedPickId === null || activePicker === null
      ? ORG_MEMORY_OFF_VALUE
      : (activePicker.candidates.find((candidate) => candidate.id === selectedPickId)?.id ??
        activePicker.candidates.find((candidate) => candidate.isDefault)?.id ??
        activePicker.candidates[0]?.id ??
        ORG_MEMORY_OFF_VALUE);
  if (autoMemoryAvailable) {
    for (let autoMemoryChoice of getAutoMemoryChoices())
      fileChoiceRows.push({
        label: autoMemoryChoice.label,
        value: `${OPEN_FOLDER_VALUE}${autoMemoryChoice.path}`,
        description: autoMemoryChoice.description,
      });
    if (!isOrgReadFeatureEnabled)
      for (let mount of mounts)
        fileChoiceRows.push({
          label: `Open synced project memory: ${mount.mount}`,
          value: `${OPEN_FOLDER_VALUE}${mount.dir}`,
          description: mount.description,
        });
    orgMemoryUiState.picker ||= activePicker !== null;
    if (activePicker !== null && orgMemoryUiState.picker) {
      let selectedCandidate =
        selectedPickId === null
          ? undefined
          : activePicker.candidates.find((candidate) => candidate.id === selectedPickId);
      let selectedPickName =
        selectedPickId === null
          ? null
          : (selectedCandidate?.name ?? (isPublicProjectPick ? "all public projects" : selectedPickId));
      let pickerValueLabel =
        selectedPickName === null
          ? "off"
          : orgMemoryReadConfigured
            ? isPrivatePick
              ? `${selectedPickName} (private)`
              : selectedPickName
            : "off \u2014 disabled in settings";
      orgMemoryRows.push({
        label: `Sync memories from: ${pickerValueLabel}`,
        value: ORG_PICKER_VALUE,
        description:
          noticeText ||
          (isPublicProjectPick
            ? "set automatically \u2014 pick a project to choose where saves go"
            : activePicker.writeOptInAvailable && canWriteOrgMemory() && !isOrgMemoryWritesEnabledForAccount()
              ? "change \xB7 org allows write opt-in (/config)"
              : "change"),
      });
    }
    for (let agentMemoryChoice of getAgentMemoryChoices(agentDefinitions.activeAgents))
      fileChoiceRows.push({
        label: agentMemoryChoice.label,
        value: `${OPEN_FOLDER_VALUE}${agentMemoryChoice.path}`,
        description: agentMemoryChoice.description,
      });
  }
  let allChoices = [...orgMemoryRows, ...memoryOptions, ...fileChoiceRows];
  let memorySelectorLastPath = updaterSlot.memorySelectorLastPath;
  let initialSelectorValue =
    memorySelectorLastPath && allChoices.some((choiceOption) => choiceOption.value === memorySelectorLastPath)
      ? memorySelectorLastPath
      : allChoices[0]?.value || "";
  let [isAutoMemoryEnabled, setIsAutoMemoryEnabled] = useState(isAutoMemoryEnabledIgnoringPause);
  let [isAutoDreamToggleOn, setIsAutoDreamEnabled] = useState(isAutoDreamEnabled);
  let [canShowSessionRow] = useState(() => MEMORY_DIALOG_API !== null && alwaysFalse());
  let [isAutoMemoryOffThisSession, setAutoMemoryOffThisSession] = useState(getAutoMemoryOffThisSession);
  let [isModelAutoMemoryDisabled, setModelAutoMemoryDisabled] = useState(
    isAutoMemoryDisabledForCurrentMainLoopModel,
  );
  useEffect(
    () =>
      onGrowthBookRefresh(() => {
        let nextModelDisabled = isAutoMemoryDisabledForCurrentMainLoopModel();
        if (nextModelDisabled !== isModelAutoMemoryDisabled) {
          setModelAutoMemoryDisabled(nextModelDisabled);
          setIsAutoMemoryEnabled(isAutoMemoryEnabledIgnoringPause());
        }
      }),
    [isModelAutoMemoryDisabled],
  );
  let autoMemoryStatus = describeAutoMemoryToggle({
    enabled: isAutoMemoryEnabled,
    modelDisabled: isModelAutoMemoryDisabled,
    safeMode: isSafeMode(),
    raiseAllowed: isAutoMemoryToggleAllowed,
  });
  let sessionToggleStatus = null;
  let [isAutoDreamAvailable] = useState(() => isAutoMemoryEnabled && isAutoDreamFeatureOn());
  let isGit = useAppState((appStateSnapshot) =>
    Object.values(appStateSnapshot.tasks).some((task) => task.type === "dream" && task.status === "running"),
  );
  let [lastDreamAt, setLastDreamAt] = useState(null);
  useEffect(() => {
    if (!isAutoDreamAvailable) return;
    readLastConsolidatedAt(undefined, storageV5).then(setLastDreamAt);
  }, [isAutoDreamAvailable, isGit, storageV5]);
  let agentDefinitions_2 = describeAutoDreamToggle({
    autoMemoryOn: isAutoMemoryEnabled,
    enabled: isAutoDreamToggleOn,
    running: isGit,
    lastDreamAt,
    raiseAllowed: isAutoMemoryToggleAllowed,
    heldDetail: undefined,
  });
  let [, setFocusPane, getFocusPane] = useLatestState("list");
  let [listFocusHint, setListFocusHint] = useState({
    count: 0,
    first: false,
  });
  let [areOrgWritesEnabled, setOrgWritesEnabled] = useState(isOrgMemoryWritesEnabledForAccount);
  let [orgWritesError, setOrgWritesError] = useState(null);
  orgMemoryUiState.write ||=
    !isMonorepoWriteBlocked() && (areOrgWritesEnabled || (mounts.length > 0 && canWriteOrgMemory()));
  let write = orgMemoryReadConfigured && selectedPickId !== null && orgMemoryUiState.write;
  function toggleOrgWrites(enabled) {
    if (!write) return;
    if (enabled && !autoMemoryToggleState()) return;
    startTransition(() => {
      let agentDir = applyOrgMemoryDecision(enabled, storageV5);
      if (agentDir === "granted" || agentDir === "withdrawn") {
        cache.reset();
        setOrgWritesEnabled(enabled);
        setOrgWritesError(null);
      } else if (agentDir === "noop") {
        setOrgWritesEnabled(isOrgMemoryWritesEnabledForAccount());
        setOrgWritesError(null);
      } else if (agentDir === "refused_gates") setOrgWritesError("unavailable right now");
      else if (agentDir === "refused_identity") setOrgWritesError("requires an OAuth login");
      else if (agentDir === "refused_read_off") setOrgWritesError("enable reads first");
      else if (agentDir === "refused_session_kind") setOrgWritesError(CANNOT_ENABLE_HERE_DETAIL);
    });
  }
  function setAutoMemory(autoMemoryOn) {
    if (isSafeMode()) return;
    if (isModelAutoMemoryDisabled) return;
    if (autoMemoryOn && !autoMemoryToggleState()) return;
    updateSettingsForSourceWithTransform(
      "userSettings",
      (settings) => ({
        autoMemoryEnabled: autoMemoryOn,
        ...ORG_PICKER_API?.accountKeyKeptWithAutoMemory(settings, autoMemoryOn),
      }),
      undefined,
      storageV5,
    );
    setIsAutoMemoryEnabled(autoMemoryOn);
    logEvent("tengu_auto_memory_toggled", {
      enabled: autoMemoryOn,
    });
  }
  function setSessionAutoMemory(sessionAutoMemoryOn) {
    if (sessionToggleStatus === null || !isAutoMemoryEnabled || isMemoryToggledOff) return;
    if (sessionAutoMemoryOn && !autoMemoryToggleState()) return;
    toggleAutoMemoryForSession(sessionAutoMemoryOn, "memory_dialog", saveAutoMemorySessionSwitch);
    setAutoMemoryOffThisSession(!sessionAutoMemoryOn);
  }
  function setAutoDream(autoDreamOn) {
    if (!isAutoDreamAvailable || !agentDefinitions_2.toggleable) return;
    if (autoDreamOn && !autoMemoryToggleState()) return;
    let isFirstEnable = autoDreamOn && getInitialSettings().autoDreamEnabled === undefined;
    updateSettingsForSource(
      "userSettings",
      {
        autoDreamEnabled: autoDreamOn,
      },
      undefined,
      storageV5,
    );
    setIsAutoDreamEnabled(autoDreamOn);
    logEvent("tengu_auto_dream_toggled", {
      enabled: autoDreamOn,
      is_first_enable: isFirstEnable,
    });
  }
  let toggleRows = [
    {
      key: "auto-memory",
      label: "Auto-memory",
      value: isAutoMemoryEnabled,
      description: autoMemoryStatus.dim
        ? [autoMemoryStatus.status, autoMemoryStatus.detail].filter(Boolean).join(" \xB7 ")
        : undefined,
      disabled: !autoMemoryStatus.toggleable,
      onChange: setAutoMemory,
    },
  ];
  if (canShowSessionRow && sessionToggleStatus !== null && MEMORY_DIALOG_API !== null)
    toggleRows.push({
      key: "session-auto-memory",
      label: MEMORY_DIALOG_API.AUTO_MEMORY_SESSION_ROW_LABEL,
      value: sessionToggleStatus.on,
      description: sessionToggleStatus.dim
        ? [sessionToggleStatus.status, sessionToggleStatus.detail].filter(Boolean).join(" \xB7 ")
        : sessionToggleStatus.detail,
      disabled: !sessionToggleStatus.toggleable,
      onChange: setSessionAutoMemory,
    });
  if (isAutoDreamAvailable)
    toggleRows.push({
      key: "auto-dream",
      label: "Auto-dream",
      value: isAutoMemoryEnabled && isAutoDreamToggleOn,
      description: agentDefinitions_2.dim
        ? [agentDefinitions_2.status, agentDefinitions_2.detail].filter(Boolean).join(" \xB7 ")
        : agentDefinitions_2.detail || "\u2026",
      disabled: !agentDefinitions_2.toggleable,
      onChange: setAutoDream,
    });
  if (write)
    toggleRows.push({
      key: "org-writes",
      label: "Write to synced project memory",
      value: areOrgWritesEnabled,
      description:
        orgWritesError ??
        (!areOrgWritesEnabled && !isAutoMemoryToggleAllowed
          ? `off \xB7 ${CANNOT_ENABLE_HERE_DETAIL}`
          : isPrivatePick
            ? "no effect under a private project pick"
            : "this directory, applies next session"),
      disabled: !areOrgWritesEnabled && !isAutoMemoryToggleAllowed,
      onChange: toggleOrgWrites,
    });
  let visibleCount = toggleRows.reduce((acc, row) => acc + a11yValueWidth(row.description), 0);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let screenReaderRows = isScreenReaderEnabled ? toggleRows : [];
  let [isConfirmDialogOpen, setConfirmDialogOpen, getConfirmDialogOpen] = useLatestState(false);
  let [switchAbortController, setSwitchAbortController, getSwitchAbortController] = useLatestState(null);
  let display = switchAbortController === null ? "flex" : "none";
  function abortProjectSwitch() {
    getSwitchAbortController()?.abort();
    setSwitchAbortController(null);
  }
  useEffect(() => () => getSwitchAbortController()?.abort(), [getSwitchAbortController]);
  let unusedValue = null;
  useGlobalExitKeybindings();
  useKeybinding(
    "confirm:no",
    () => {
      if (isProjectPickerOpen) {
        setProjectPickerOpen(false);
        return;
      }
      if (getConfirmDialogOpen()) {
        setConfirmDialogOpen(false);
        if (isScreenReaderEnabled) setFocusPane("list");
        return;
      }
      if (getSwitchAbortController() !== null) {
        abortProjectSwitch();
        return;
      }
      onCancel();
    },
    {
      context: "Confirmation",
    },
  );
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    width: "100%",
    children: [
      null,
      jsxProd_default_2(Box, {
        flexDirection: "column",
        marginBottom: 1,
        display,
        children: [
          null,
          !isScreenReaderEnabled &&
            jsxProd_default(Box, {
              flexDirection: "column",
              onFocus: () => {
                if (
                  !getProjectPickerOpen() &&
                  !getConfirmDialogOpen() &&
                  getSwitchAbortController() === null &&
                  getFocusPane() !== "toggles"
                )
                  setFocusPane("toggles");
              },
              children: jsxProd_default(
                merged,
                {
                  visibleCount,
                  defaultFocusIndex: listFocusHint.first ? 0 : toggleRows.length - 1,
                  isDisabled: () => getFocusPane() !== "toggles",
                  onDownFromLastItem: () => setFocusPane("list"),
                  onDisabledRowClick:
                    isProjectPickerOpen || isConfirmDialogOpen ? undefined : () => setFocusPane("toggles"),
                  children: toggleRows.map((row) =>
                    jsxProd_default(
                      merged.Field,
                      {
                        label: row.label,
                        description: row.description,
                        children: jsxProd_default(merged.Toggle, {
                          value: row.value,
                          onChange: row.onChange,
                          disabled: row.disabled,
                        }),
                      },
                      row.key,
                    ),
                  ),
                },
                listFocusHint.count,
              ),
            }),
          syncStatusBadge !== null &&
            jsxProd_default(ListItem, {
              isFocused: false,
              styled: false,
              children: jsxProd_default_2(Text, {
                children: [
                  "Synced project memory: ",
                  syncStatusBadge.label,
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [" \xB7 ", syncStatusBadge.note],
                  }),
                ],
              }),
            }),
        ],
      }),
      isProjectPickerOpen && activePicker !== null
        ? jsxProd_default(useDialogKeybindings, {
            scope: "Confirmation",
            claimFocus: true,
            bindings: [
              {
                action: "confirm:no",
                run: () => setProjectPickerOpen(false),
              },
            ],
            children: jsxProd_default(ModelSelector, {
              defaultFocusValue,
              options: [
                {
                  label: "off",
                  value: ORG_MEMORY_OFF_VALUE,
                  description:
                    activePicker.candidates.length === 0
                      ? "no projects to pick yet"
                      : selectedPickId === null
                        ? ""
                        : "clear the saved pick",
                },
                ...activePicker.candidates.map((candidate) => ({
                  label: candidate.name,
                  value: candidate.id,
                  description:
                    candidate.visibility === "private"
                      ? "private \u2014 org store becomes read-only"
                      : candidate.kind === "project"
                        ? "public project"
                        : "",
                })),
              ],
              onChange: (selectedValue) => {
                if (existingMemoryFiles.current) return;
                startTransition(() => {
                  let isOffSelection = selectedValue === ORG_MEMORY_OFF_VALUE;
                  let chosenCandidate = isOffSelection
                    ? undefined
                    : activePicker.candidates.find((prev) => prev.id === selectedValue);
                  let savedSelection = isOffSelection ? EXPLICIT_OFF_SELECTION : selectedValue;
                  let nextSelection = isOffSelection ? null : selectedValue;
                  let saveResult = saveOrgMemorySelection(savedSelection, storageV5);
                  let isSaveApplied = saveResult === "saved" || saveResult === "cleared";
                  let orgMemoryDecision = getOrgMemoryDecision();
                  let isStaleNoop =
                    saveResult === "noop" &&
                    (nextSelection === null
                      ? orgMemoryDecision.state === "on" || orgMemoryDecision.state === "parked"
                      : !(
                          orgMemoryDecision.state === "on" &&
                          orgMemoryDecision.request.selection === nextSelection
                        ));
                  let isClearedForDirectory =
                    canSwitchProjects &&
                    nextSelection === null &&
                    (orgMemoryDecision.state === "off" || orgMemoryDecision.state === "ended");
                  let willReconnect =
                    (isSaveApplied || isStaleNoop) &&
                    !isClearedForDirectory &&
                    canSwitchProjects &&
                    onProjectSwitch(() =>
                      switchOrgMemoryProject(session, nextSelection === null ? "off" : "project"),
                    );
                  if (saveResult === "saved" && chosenCandidate !== undefined)
                    logEvent("tengu_org_memory_project_selected", {
                      is_default: chosenCandidate.isDefault === true,
                      kind: fromEnum(chosenCandidate.kind),
                      private: chosenCandidate.visibility === "private",
                      reconnects_now: willReconnect,
                    });
                  if (willReconnect) {
                    existingMemoryFiles.current = true;
                    setSelectedPickId(nextSelection);
                    setOrgWritesError(null);
                    setNoticeText(nextSelection === null ? "disconnecting\u2026" : "connecting\u2026");
                    setIsSwitching(true);
                  } else if (isSaveApplied) {
                    let orgMemoryDecision = getOrgMemoryDecision();
                    let shouldShrinkWriteAsk =
                      orgMemoryDecision.state === "on" &&
                      orgMemoryDecision.request.writeAccess &&
                      (nextSelection === null || orgMemoryDecision.request.selection !== nextSelection) &&
                      shrinkOrgMemoryDecisionWriteAsk();
                    if (shouldShrinkWriteAsk || orgMemoryDecision.state === "undecided")
                      clearOrgMemoryCredential();
                    setSelectedPickId(nextSelection);
                    if (nextSelection === null) {
                      setOrgWritesError(null);
                      setNoticeText(
                        shouldShrinkWriteAsk && areOrgWritesEnabled
                          ? "off \u2014 writes stop now; unsync next session"
                          : isClearedForDirectory
                            ? "off \u2014 saved for this directory"
                            : "off \u2014 applies next session",
                      );
                    } else
                      setNoticeText(
                        !orgMemoryReadConfigured
                          ? "saved \u2014 enable reads in /config (orgMemoryRead) to apply"
                          : shouldShrinkWriteAsk && areOrgWritesEnabled
                            ? "saved \u2014 previous workspace writes stop now; applies next session"
                            : "saved \u2014 applies next session",
                      );
                    cache.reset();
                  } else if (saveResult === "refused") setNoticeText("requires an OAuth login");
                  else if (saveResult === "refused_arms_writes")
                    setNoticeText("not saved \u2014 can't pick a project here while writes are on");
                  else setNoticeText(null);
                  setProjectPickerOpen(false);
                });
              },
              onCancel: () => setProjectPickerOpen(false),
            }),
          })
        : jsxProd_default(Box, {
            flexDirection: "column",
            display,
            onFocus: () => {
              if (!getConfirmDialogOpen() && getSwitchAbortController() === null && getFocusPane() !== "list")
                setFocusPane("list");
            },
            children: jsxProd_default_2(OrderedListWithItem, {
              defaultFocusIndex:
                screenReaderRows.length +
                Math.max(
                  0,
                  allChoices.findIndex(
                    (choiceItem) =>
                      choiceItem.value === (isPickerRequested ? ORG_PICKER_VALUE : initialSelectorValue),
                  ),
                ),
              isDisabled: () =>
                getFocusPane() !== "list" ||
                isSwitching ||
                getConfirmDialogOpen() ||
                getSwitchAbortController() !== null,
              onDisabledRowClick: isConfirmDialogOpen ? undefined : () => setFocusPane("list"),
              wrap: true,
              onSelect: (value) => {
                let toggleRow = screenReaderRows[value];
                if (toggleRow !== undefined) {
                  if (!toggleRow.disabled) toggleRow.onChange(!toggleRow.value);
                  return;
                }
                let choiceValue = allChoices[value - screenReaderRows.length]?.value;
                if (choiceValue === undefined) return;
                if (choiceValue === ORG_PICKER_VALUE) {
                  setProjectPickerOpen(true);
                  setIsPickerRequested(true);
                  return;
                }
                if (choiceValue.startsWith(OPEN_FOLDER_VALUE)) {
                  let folderPath = choiceValue.slice(OPEN_FOLDER_VALUE.length);
                  mkdir(folderPath, {
                    recursive: true,
                  })
                    .catch(() => {})
                    .then(() => openPath(folderPath))
                    .catch(() => {});
                  return;
                }
                updaterSlot.rememberMemorySelectorPath(choiceValue);
                onSelect(choiceValue);
              },
              onUpFromFirstItem: () => {
                setListFocusHint((prevHint) => ({
                  count: prevHint.count + 1,
                  first: false,
                }));
                setFocusPane("toggles");
              },
              onDownFromLastItem:
                hasMemorySync && !isScreenReaderEnabled ? () => setFocusPane("account") : undefined,
              children: [
                screenReaderRows.map((row) =>
                  jsxProd_default(
                    OrderedListWithItem.Item,
                    {
                      label: row.label,
                      meta: [String(row.value)],
                      description: row.description,
                    },
                    row.key,
                  ),
                ),
                allChoices.map((choice) =>
                  bunStringWidth(choice.description) <= MAX_VISIBLE_MEMORY_ROWS
                    ? jsxProd_default(
                        OrderedListWithItem.Item,
                        {
                          label: choice.label,
                          meta: [choice.description],
                        },
                        choice.value,
                      )
                    : jsxProd_default(
                        OrderedListWithItem.Item,
                        {
                          label: choice.label,
                          description: choice.description,
                        },
                        choice.value,
                      ),
                ),
                null,
              ],
            }),
          }),
      null,
    ],
  });
}
export { filterAutoMemWhenDisabled, isDreamTask, memoryRowsCache, MemoryFileSelector };
