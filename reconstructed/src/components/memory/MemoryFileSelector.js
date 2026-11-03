/**
 * components/memory/MemoryFileSelector.tsx
 *
 * /memory 记忆文件选择器：用户/项目/本地 CLAUDE.md 与自动记忆、团队/账号记忆同步状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/memory/MemoryFileSelector.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-c55mbvfz.js (7), chunk-e6aww6q8.js (1)
 * attribution: fingerprint 3, placement 2, layout 3, callgraph-witnessed 1
 */
import { join } from "path";
import { mkdir } from "fs/promises";
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
import { Qr, y, R, P, h5r } from "../../../vendor/react/cjs/react.production.js";
import { getMemoryFilesCached } from "../../utils/claudemd.js";
import {
  isAutoMemoryEnabledIgnoringPause,
  isAutoMemoryDisabledForCurrentMainLoopModel,
  isMemoryRecallEnabled,
} from "../../memdir/paths.js";
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
  getInitialSettings_2,
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

//@ chunk-c55mbvfz.js:31716-31816 placement
class RowsOnce {
  promise = null;
  rowsOnce(b) {
    this.promise ??= b();
    return this.promise;
  }
  reset() {
    this.promise = null;
  }
}
//@ chunk-c55mbvfz.js:31816-31842 placement
var memoryRowsCache = new SessionRootSlot(() => new RowsOnce());
//@ chunk-c55mbvfz.js:31842-31854 layout
var OPEN_FOLDER_API = null;
//@ chunk-c55mbvfz.js:31854-31901 fingerprint = OPEN_FOLDER_PREFIX (1)
var ORG_PICKER_API = null;
var MEMORY_DIALOG_API = null;
var OPEN_FOLDER_VALUE = "__open_folder__";
var MAX_VISIBLE_MEMORY_ROWS = 30;
//@ chunk-c55mbvfz.js:31901-32834 layout
/**
 * /memory 选择器里组织记忆的行：发现团队范围的记忆挂载点，按当前授权（公开/私有项目、读写权限）给每个挂载点生成说明。
 */
function loadOrgMemoryRows(cache, storageV5, signal) {
  return cache.rowsOnce(async () => {
    let v = await discoverOrgMemoryStores(storageV5, signal).catch(() => null);
    let picker = getOrgMemoryPickerData();
    if (v === null)
      return {
        mounts: [],
        picker,
      };
    let x = isLastAskDowngraded();
    let orgMemoryDecision = getOrgMemoryDecision();
    let N =
      orgMemoryDecision.state === "on"
        ? orgMemoryDecision.initialGrant.find(
            (L) =>
              classifyStorePath(L.path) === "grouping_root" ||
              (L.kind === "grouping_root" && classifyStorePath(L.path) === "unknown"),
          )
        : undefined;
    let B =
      orgMemoryDecision.state === "on"
        ? orgMemoryDecision.initialGrant.find(
            (L) => L.kind === "grouping" || classifyStorePath(L.path) === "grouping",
          )
        : undefined;
    let I = orgMemoryDecision.state === "on" && hasPrivateGrouping(orgMemoryDecision.initialGrant);
    return {
      mounts: v
        .filter((L) => L.scope === "team")
        .map((L) => ({
          mount: L.mount,
          dir: join(getMemoryDirNfc(), L.mount),
          description:
            N !== undefined && stripTrailingSlashes(L.path) === stripTrailingSlashes(N.path)
              ? L.mode === "rw" && grantedModeFor(L.path) === "rw" && isOrgMemoryWriteOptedIn()
                ? "public project memory, read-write"
                : "public project memory, read-only"
              : B !== undefined && stripTrailingSlashes(L.path) === stripTrailingSlashes(B.path)
                ? I
                  ? "private project, read-only"
                  : "project memory, read-only"
                : L.mode === "rw" && grantedModeFor(L.path) === "rw" && isOrgMemoryWriteOptedIn()
                  ? "read-write"
                  : I
                    ? "read-only \u2014 private project selected"
                    : x
                      ? "writes requested \u2014 granted read-only"
                      : "read-only",
        })),
      picker,
    };
  });
}
//@ chunk-c55mbvfz.js:32834-32905 layout
var ORG_PICKER_VALUE = "__org_memory_project_picker__";
var ORG_MEMORY_OFF_VALUE = "__org_memory_project_off__";
//@ chunk-c55mbvfz.js:32905-41847 callgraph-witnessed = MemoryFileSelector (0.159)
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
  let N = packageManagerAutoUpdaterSlot.of(session.host);
  let cache = memoryRowsCache.of(session);
  let { storageV5, credentials } = useTheme_2();
  let U = Qr(getMemoryFilesCached(session, false, storageV5, credentials));
  let V = isAutoMemoryEnabledIgnoringPause() || isSafeMode();
  let ee = isAutoMemoryEnabledIgnoringPause() && !isSafeMode();
  let { mounts, picker } = ee
    ? Qr(loadOrgMemoryRows(cache, storageV5, credentials))
    : {
        mounts: [],
        picker: null,
      };
  let [X, H, ae] = useLatestState(false);
  let [ve, oo] = y(false);
  let [J, go] = y(getEffectiveSelection);
  let to = J !== null && isPublicProjects(J);
  let [Xo] = y(isOrgMemoryReadEnabled);
  let [no] = y(() => getCurrentProjectConfig().orgMemoryRead ?? true);
  let [Jo, ye] = y(null);
  let [Qo, Zo] = y(false);
  let existingMemoryFiles = R(false);
  let ro = onProjectSwitch !== undefined && isOrgMemoryReadEnabled();
  let orgMemoryDecision = getOrgMemoryDecision();
  let [wo] = y(() => (OPEN_FOLDER_API === null ? "closed" : getMemorySyncState()));
  let et = wo !== "closed";
  let On = wo === "pending";
  let [xe] = y(autoMemoryToggleState);
  let [Cn, Rn] = y(() => null);
  let [ot, _n] = y(getMemoryToggledOff);
  let [vn] = y(() => null);
  let io = !ee
    ? null
    : orgMemoryDecision.state === "on"
      ? {
          label: "active",
          note: orgMemoryDecision.stores.map((store) => store.mount).join(", "),
        }
      : orgMemoryDecision.state === "parked"
        ? {
            label: "parked",
            note: ro
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
  let memoryOptions = buildMemoryFileChoices(mergeByPath(U, addedInstructionFiles), originalCwd, "\xB7 ").map(
    (file) => ({
      label: file.label,
      value: file.path,
      description: file.description,
    }),
  );
  let Mo = [];
  let De = [];
  let agentDefinitions = useAppState((h) => h.agentDefinitions);
  let [ge] = y(() => ({
    write: false,
    picker: false,
    pickerData: null,
  }));
  if (picker !== null) ge.pickerData = picker;
  let z = picker ?? ge.pickerData;
  let So = z !== null && to;
  P(() => {
    if (So) logEvent("tengu_org_memory_legacy_pick_nudged", {});
  }, [So]);
  let st = orgMemoryDecision.state === "on" && J === orgMemoryDecision.request.selection;
  let bo =
    J !== null &&
    (st
      ? hasPrivateGrouping(orgMemoryDecision.initialGrant)
      : z?.candidates.find((candidate) => candidate.id === J)?.visibility === "private");
  let defaultFocusValue =
    J === null || z === null
      ? ORG_MEMORY_OFF_VALUE
      : (z.candidates.find((candidate) => candidate.id === J)?.id ??
        z.candidates.find((candidate) => candidate.isDefault)?.id ??
        z.candidates[0]?.id ??
        ORG_MEMORY_OFF_VALUE);
  if (V) {
    for (let h of getAutoMemoryChoices())
      De.push({
        label: h.label,
        value: `${OPEN_FOLDER_VALUE}${h.path}`,
        description: h.description,
      });
    if (!Xo)
      for (let mount of mounts)
        De.push({
          label: `Open synced project memory: ${mount.mount}`,
          value: `${OPEN_FOLDER_VALUE}${mount.dir}`,
          description: mount.description,
        });
    ge.picker ||= z !== null;
    if (z !== null && ge.picker) {
      let h = J === null ? undefined : z.candidates.find((candidate) => candidate.id === J);
      let W = J === null ? null : (h?.name ?? (to ? "all public projects" : J));
      let Q = W === null ? "off" : no ? (bo ? `${W} (private)` : W) : "off \u2014 disabled in settings";
      Mo.push({
        label: `Sync memories from: ${Q}`,
        value: ORG_PICKER_VALUE,
        description:
          Jo ||
          (to
            ? "set automatically \u2014 pick a project to choose where saves go"
            : z.writeOptInAvailable && canWriteOrgMemory() && !isOrgMemoryWritesEnabledForAccount()
              ? "change \xB7 org allows write opt-in (/config)"
              : "change"),
      });
    }
    for (let h of getAgentMemoryChoices(agentDefinitions.activeAgents))
      De.push({
        label: h.label,
        value: `${OPEN_FOLDER_VALUE}${h.path}`,
        description: h.description,
      });
  }
  let Pe = [...Mo, ...memoryOptions, ...De];
  let memorySelectorLastPath = N.memorySelectorLastPath;
  let at =
    memorySelectorLastPath && Pe.some((h) => h.value === memorySelectorLastPath)
      ? memorySelectorLastPath
      : Pe[0]?.value || "";
  let [he, ko] = y(isAutoMemoryEnabledIgnoringPause);
  let [Oo, dt] = y(isAutoDreamEnabled);
  let [mt] = y(() => MEMORY_DIALOG_API !== null && alwaysFalse());
  let [An, ut] = y(getAutoMemoryOffThisSession);
  let [Le, pt] = y(isAutoMemoryDisabledForCurrentMainLoopModel);
  P(
    () =>
      onGrowthBookRefresh(() => {
        let h = isAutoMemoryDisabledForCurrentMainLoopModel();
        if (h !== Le) {
          pt(h);
          ko(isAutoMemoryEnabledIgnoringPause());
        }
      }),
    [Le],
  );
  let Ne = describeAutoMemoryToggle({
    enabled: he,
    modelDisabled: Le,
    safeMode: isSafeMode(),
    raiseAllowed: xe,
  });
  let ne = null;
  let [Ve] = y(() => he && isAutoDreamFeatureOn());
  let isGit = useAppState((h) =>
    Object.values(h.tasks).some((task) => task.type === "dream" && task.status === "running"),
  );
  let [yt, gt] = y(null);
  P(() => {
    if (!Ve) return;
    readLastConsolidatedAt(undefined, storageV5).then(gt);
  }, [Ve, isGit, storageV5]);
  let agentDefinitions_2 = describeAutoDreamToggle({
    autoMemoryOn: he,
    enabled: Oo,
    running: isGit,
    lastDreamAt: yt,
    raiseAllowed: xe,
    heldDetail: undefined,
  });
  let [, se, We] = useLatestState("list");
  let [Ro, ht] = y({
    count: 0,
    first: false,
  });
  let [be, _o] = y(isOrgMemoryWritesEnabledForAccount);
  let [wt, ce] = y(null);
  ge.write ||= !isMonorepoWriteBlocked() && (be || (mounts.length > 0 && canWriteOrgMemory()));
  let write = no && J !== null && ge.write;
  function Mt(h) {
    if (!write) return;
    if (h && !autoMemoryToggleState()) return;
    h5r(() => {
      let agentDir = applyOrgMemoryDecision(h, storageV5);
      if (agentDir === "granted" || agentDir === "withdrawn") {
        cache.reset();
        _o(h);
        ce(null);
      } else if (agentDir === "noop") {
        _o(isOrgMemoryWritesEnabledForAccount());
        ce(null);
      } else if (agentDir === "refused_gates") ce("unavailable right now");
      else if (agentDir === "refused_identity") ce("requires an OAuth login");
      else if (agentDir === "refused_read_off") ce("enable reads first");
      else if (agentDir === "refused_session_kind") ce(CANNOT_ENABLE_HERE_DETAIL);
    });
  }
  function St(h) {
    if (isSafeMode()) return;
    if (Le) return;
    if (h && !autoMemoryToggleState()) return;
    updateSettingsForSourceWithTransform(
      "userSettings",
      (W) => ({
        autoMemoryEnabled: h,
        ...ORG_PICKER_API?.accountKeyKeptWithAutoMemory(W, h),
      }),
      undefined,
      storageV5,
    );
    ko(h);
    logEvent("tengu_auto_memory_toggled", {
      enabled: h,
    });
  }
  function bt(h) {
    if (ne === null || !he || ot) return;
    if (h && !autoMemoryToggleState()) return;
    toggleAutoMemoryForSession(h, "memory_dialog", saveAutoMemorySessionSwitch);
    ut(!h);
  }
  function kt(h) {
    if (!Ve || !agentDefinitions_2.toggleable) return;
    if (h && !autoMemoryToggleState()) return;
    let isFirstEnable = h && getInitialSettings_2().autoDreamEnabled === undefined;
    updateSettingsForSource(
      "userSettings",
      {
        autoDreamEnabled: h,
      },
      undefined,
      storageV5,
    );
    dt(h);
    logEvent("tengu_auto_dream_toggled", {
      enabled: h,
      is_first_enable: isFirstEnable,
    });
  }
  let de = [
    {
      key: "auto-memory",
      label: "Auto-memory",
      value: he,
      description: Ne.dim ? [Ne.status, Ne.detail].filter(Boolean).join(" \xB7 ") : undefined,
      disabled: !Ne.toggleable,
      onChange: St,
    },
  ];
  if (mt && ne !== null && MEMORY_DIALOG_API !== null)
    de.push({
      key: "session-auto-memory",
      label: MEMORY_DIALOG_API.AUTO_MEMORY_SESSION_ROW_LABEL,
      value: ne.on,
      description: ne.dim ? [ne.status, ne.detail].filter(Boolean).join(" \xB7 ") : ne.detail,
      disabled: !ne.toggleable,
      onChange: bt,
    });
  if (Ve)
    de.push({
      key: "auto-dream",
      label: "Auto-dream",
      value: he && Oo,
      description: agentDefinitions_2.dim
        ? [agentDefinitions_2.status, agentDefinitions_2.detail].filter(Boolean).join(" \xB7 ")
        : agentDefinitions_2.detail || "\u2026",
      disabled: !agentDefinitions_2.toggleable,
      onChange: kt,
    });
  if (write)
    de.push({
      key: "org-writes",
      label: "Write to synced project memory",
      value: be,
      description:
        wt ??
        (!be && !xe
          ? `off \xB7 ${CANNOT_ENABLE_HERE_DETAIL}`
          : bo
            ? "no effect under a private project pick"
            : "this directory, applies next session"),
      disabled: !be && !xe,
      onChange: Mt,
    });
  let visibleCount = de.reduce((acc, W) => acc + a11yValueWidth(W.description), 0);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let Ue = isScreenReaderEnabled ? de : [];
  let [Ao, Ct, Ye] = useLatestState(false);
  let [Rt, _t, me] = useLatestState(null);
  let display = Rt === null ? "flex" : "none";
  function vt() {
    me()?.abort();
    _t(null);
  }
  P(() => () => me()?.abort(), [me]);
  let Pn = null;
  useGlobalExitKeybindings();
  useKeybinding(
    "confirm:no",
    () => {
      if (X) {
        H(false);
        return;
      }
      if (Ye()) {
        Ct(false);
        if (isScreenReaderEnabled) se("list");
        return;
      }
      if (me() !== null) {
        vt();
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
                if (!ae() && !Ye() && me() === null && We() !== "toggles") se("toggles");
              },
              children: jsxProd_default(
                merged,
                {
                  visibleCount,
                  defaultFocusIndex: Ro.first ? 0 : de.length - 1,
                  isDisabled: () => We() !== "toggles",
                  onDownFromLastItem: () => se("list"),
                  onDisabledRowClick: X || Ao ? undefined : () => se("toggles"),
                  children: de.map((h) =>
                    jsxProd_default(
                      merged.Field,
                      {
                        label: h.label,
                        description: h.description,
                        children: jsxProd_default(merged.Toggle, {
                          value: h.value,
                          onChange: h.onChange,
                          disabled: h.disabled,
                        }),
                      },
                      h.key,
                    ),
                  ),
                },
                Ro.count,
              ),
            }),
          io !== null &&
            jsxProd_default(ListItem, {
              isFocused: false,
              styled: false,
              children: jsxProd_default_2(Text, {
                children: [
                  "Synced project memory: ",
                  io.label,
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [" \xB7 ", io.note],
                  }),
                ],
              }),
            }),
        ],
      }),
      X && z !== null
        ? jsxProd_default(useDialogKeybindings, {
            scope: "Confirmation",
            claimFocus: true,
            bindings: [
              {
                action: "confirm:no",
                run: () => H(false),
              },
            ],
            children: jsxProd_default(ModelSelector, {
              defaultFocusValue,
              options: [
                {
                  label: "off",
                  value: ORG_MEMORY_OFF_VALUE,
                  description:
                    z.candidates.length === 0
                      ? "no projects to pick yet"
                      : J === null
                        ? ""
                        : "clear the saved pick",
                },
                ...z.candidates.map((candidate) => ({
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
              onChange: (h) => {
                if (existingMemoryFiles.current) return;
                h5r(() => {
                  let W = h === ORG_MEMORY_OFF_VALUE;
                  let Q = W ? undefined : z.candidates.find((prev) => prev.id === h);
                  let ke = W ? EXPLICIT_OFF_SELECTION : h;
                  let oe = W ? null : h;
                  let Oe = saveOrgMemorySelection(ke, storageV5);
                  let Eo = Oe === "saved" || Oe === "cleared";
                  let orgMemoryDecision = getOrgMemoryDecision();
                  let At =
                    Oe === "noop" &&
                    (oe === null
                      ? orgMemoryDecision.state === "on" || orgMemoryDecision.state === "parked"
                      : !(orgMemoryDecision.state === "on" && orgMemoryDecision.request.selection === oe));
                  let Fo =
                    ro &&
                    oe === null &&
                    (orgMemoryDecision.state === "off" || orgMemoryDecision.state === "ended");
                  let To =
                    (Eo || At) &&
                    !Fo &&
                    ro &&
                    onProjectSwitch(() => switchOrgMemoryProject(session, oe === null ? "off" : "project"));
                  if (Oe === "saved" && Q !== undefined)
                    logEvent("tengu_org_memory_project_selected", {
                      is_default: Q.isDefault === true,
                      kind: fromEnum(Q.kind),
                      private: Q.visibility === "private",
                      reconnects_now: To,
                    });
                  if (To) {
                    existingMemoryFiles.current = true;
                    go(oe);
                    ce(null);
                    ye(oe === null ? "disconnecting\u2026" : "connecting\u2026");
                    Zo(true);
                  } else if (Eo) {
                    let orgMemoryDecision = getOrgMemoryDecision();
                    let co =
                      orgMemoryDecision.state === "on" &&
                      orgMemoryDecision.request.writeAccess &&
                      (oe === null || orgMemoryDecision.request.selection !== oe) &&
                      shrinkOrgMemoryDecisionWriteAsk();
                    if (co || orgMemoryDecision.state === "undecided") clearOrgMemoryCredential();
                    go(oe);
                    if (oe === null) {
                      ce(null);
                      ye(
                        co && be
                          ? "off \u2014 writes stop now; unsync next session"
                          : Fo
                            ? "off \u2014 saved for this directory"
                            : "off \u2014 applies next session",
                      );
                    } else
                      ye(
                        !no
                          ? "saved \u2014 enable reads in /config (orgMemoryRead) to apply"
                          : co && be
                            ? "saved \u2014 previous workspace writes stop now; applies next session"
                            : "saved \u2014 applies next session",
                      );
                    cache.reset();
                  } else if (Oe === "refused") ye("requires an OAuth login");
                  else if (Oe === "refused_arms_writes")
                    ye("not saved \u2014 can't pick a project here while writes are on");
                  else ye(null);
                  H(false);
                });
              },
              onCancel: () => H(false),
            }),
          })
        : jsxProd_default(Box, {
            flexDirection: "column",
            display,
            onFocus: () => {
              if (!Ye() && me() === null && We() !== "list") se("list");
            },
            children: jsxProd_default_2(OrderedListWithItem, {
              defaultFocusIndex:
                Ue.length +
                Math.max(
                  0,
                  Pe.findIndex((h) => h.value === (ve ? ORG_PICKER_VALUE : at)),
                ),
              isDisabled: () => We() !== "list" || Qo || Ye() || me() !== null,
              onDisabledRowClick: Ao ? undefined : () => se("list"),
              wrap: true,
              onSelect: (value) => {
                let W = Ue[value];
                if (W !== undefined) {
                  if (!W.disabled) W.onChange(!W.value);
                  return;
                }
                let Q = Pe[value - Ue.length]?.value;
                if (Q === undefined) return;
                if (Q === ORG_PICKER_VALUE) {
                  H(true);
                  oo(true);
                  return;
                }
                if (Q.startsWith(OPEN_FOLDER_VALUE)) {
                  let folderPath = Q.slice(OPEN_FOLDER_VALUE.length);
                  mkdir(folderPath, {
                    recursive: true,
                  })
                    .catch(() => {})
                    .then(() => openPath(folderPath))
                    .catch(() => {});
                  return;
                }
                N.rememberMemorySelectorPath(Q);
                onSelect(Q);
              },
              onUpFromFirstItem: () => {
                ht((h) => ({
                  count: h.count + 1,
                  first: false,
                }));
                se("toggles");
              },
              onDownFromLastItem: et && !isScreenReaderEnabled ? () => se("account") : undefined,
              children: [
                Ue.map((h) =>
                  jsxProd_default(
                    OrderedListWithItem.Item,
                    {
                      label: h.label,
                      meta: [String(h.value)],
                      description: h.description,
                    },
                    h.key,
                  ),
                ),
                Pe.map((h) =>
                  bunStringWidth(h.description) <= MAX_VISIBLE_MEMORY_ROWS
                    ? jsxProd_default(
                        OrderedListWithItem.Item,
                        {
                          label: h.label,
                          meta: [h.description],
                        },
                        h.value,
                      )
                    : jsxProd_default(
                        OrderedListWithItem.Item,
                        {
                          label: h.label,
                          description: h.description,
                        },
                        h.value,
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
//@ chunk-18hwfzwa.js:728716-728758 fingerprint = _temp5 (0.75)
function isDreamTask(t) {
  return t.type === "dream";
}
//@ chunk-e6aww6q8.js:1350609-1350685 fingerprint = _temp (1)
function filterAutoMemWhenDisabled(f_1) {
  if (!isMemoryRecallEnabled()) return f_1;
  return f_1.filter((n) => n.type !== "AutoMem");
}
export { isDreamTask, memoryRowsCache, MemoryFileSelector, filterAutoMemWhenDisabled };
