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
import { SessionRootSlot, xo } from "../../bootstrap/sessionSlices.js";
import { discoverOrgMemoryStores, getOrgMemoryPickerData } from "../../services/orgMemory/discovery.js";
import {
  Zci,
  getOrgMemoryDecision,
  classifyStorePath,
  hasPrivateGrouping,
  rv,
  N2,
  isOrgMemoryWriteOptedIn,
  canWriteOrgMemory,
  isOrgMemoryWritesEnabledForAccount,
  GEn,
  applyOrgMemoryDecision,
  shrinkOrgMemoryDecisionWriteAsk,
} from "../../services/orgMemory/orgMemoryDecision.js";
import { getMemoryDirNfc } from "../../memdir/teamMemPaths.js";
import { Ipt } from "../PackageManagerAutoUpdater.js";
import { Me } from "../design-system/ThemeProvider.js";
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
  yPe,
  sJo,
  saveOrgMemorySelection,
} from "../../services/orgMemory/selection.js";
import { isOrgMemoryReadEnabled } from "../../services/memorySync/availability.js";
import { getCurrentProjectConfig } from "../../utils/config.js";
import {
  getMemorySyncState,
  OXe,
  buildMemoryFileChoices,
  getAutoMemoryChoices,
  getAgentMemoryChoices,
  GRs,
  describeAutoMemoryToggle,
  describeAutoDreamToggle,
  $$n,
} from "../../commands/memory/memoryFileChoices.js";
import { getMemoryToggledOff, getAutoMemoryOffThisSession } from "../../bootstrap/state.js";
import { mergeByPath } from "../../context.js";
import { useAppState } from "../../state/AppState.js";
import { logEvent } from "../../services/analytics/index.js";
import { isAutoDreamEnabled, Mrn } from "../../services/autoDream/config.js";
import { onGrowthBookRefresh } from "../../services/analytics/growthbook.js";
import { readLastConsolidatedAt } from "../../services/autoDream/consolidationLock.js";
import {
  updateSettingsForSourceWithTransform,
  getInitialSettings_2,
  updateSettingsForSource,
} from "../../utils/settings/settings.js";
import { toggleAutoMemoryForSession } from "../../cli/startup/startupMisc.js";
import { saveAutoMemorySessionSwitch } from "../../utils/sessionStorage.js";
import { OPs, merged } from "../CustomSelect/selectA11y.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useGlobalExitKeybindings, useKeybinding } from "../../keybindings/useKeybinding.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
    return ((this.promise ??= b()), this.promise);
  }
  reset() {
    this.promise = null;
  }
}
//@ chunk-c55mbvfz.js:31816-31842 placement
var memoryRowsCache = new SessionRootSlot(() => new RowsOnce());
//@ chunk-c55mbvfz.js:31842-31854 layout
var yn = null;
//@ chunk-c55mbvfz.js:31854-31901 fingerprint = OPEN_FOLDER_PREFIX (1)
var gn = null,
  po = null,
  Ie = "__open_folder__",
  hn = 30;
/**
 * /memory 选择器里组织记忆的行：发现团队范围的记忆挂载点，按当前授权（公开/私有项目、读写权限）给每个挂载点生成说明。
 */
//@ chunk-c55mbvfz.js:31901-32834 layout
function loadOrgMemoryRows(cache, storageV5, signal) {
  return cache.rowsOnce(async () => {
    let v = await discoverOrgMemoryStores(storageV5, signal).catch(() => null),
      T = getOrgMemoryPickerData();
    if (v === null) return { mounts: [], picker: T };
    let x = Zci(),
      D = getOrgMemoryDecision(),
      N =
        D.state === "on"
          ? D.initialGrant.find(
              (L) =>
                classifyStorePath(L.path) === "grouping_root" ||
                (L.kind === "grouping_root" && classifyStorePath(L.path) === "unknown"),
            )
          : void 0,
      B =
        D.state === "on"
          ? D.initialGrant.find((L) => L.kind === "grouping" || classifyStorePath(L.path) === "grouping")
          : void 0,
      I = D.state === "on" && hasPrivateGrouping(D.initialGrant);
    return {
      mounts: v
        .filter((L) => L.scope === "team")
        .map((L) => ({
          mount: L.mount,
          dir: join(getMemoryDirNfc(), L.mount),
          description:
            N !== void 0 && rv(L.path) === rv(N.path)
              ? L.mode === "rw" && N2(L.path) === "rw" && isOrgMemoryWriteOptedIn()
                ? "public project memory, read-write"
                : "public project memory, read-only"
              : B !== void 0 && rv(L.path) === rv(B.path)
                ? I
                  ? "private project, read-only"
                  : "project memory, read-only"
                : L.mode === "rw" && N2(L.path) === "rw" && isOrgMemoryWriteOptedIn()
                  ? "read-write"
                  : I
                    ? "read-only \u2014 private project selected"
                    : x
                      ? "writes requested \u2014 granted read-only"
                      : "read-only",
        })),
      picker: T,
    };
  });
}
//@ chunk-c55mbvfz.js:32834-32905 layout
var yo = "__org_memory_project_picker__",
  Ze = "__org_memory_project_off__";
/**
 * /memory：列出可编辑的记忆文件（用户/项目/本地 CLAUDE.md、自动记忆目录），以及团队/账号记忆同步状态（paused/active），选择后用编辑器打开。
 */
//@ chunk-c55mbvfz.js:32905-41847 callgraph-witnessed = MemoryFileSelector (0.159)
function MemoryFileSelector({
  session: session,
  commandContext: commandContext,
  addedInstructionFiles: addedInstructionFiles,
  onSelect: onSelect,
  onCancel: onCancel,
  onProjectSwitch: onProjectSwitch,
}) {
  let originalCwd = xo(session).originalCwd,
    of = Ipt.of(session.host),
    of_2 = memoryRowsCache.of(session),
    { storageV5: storageV5, credentials: credentials } = Me(),
    U = Qr(getMemoryFilesCached(session, !1, storageV5, credentials)),
    V = isAutoMemoryEnabledIgnoringPause() || isSafeMode(),
    ee = isAutoMemoryEnabledIgnoringPause() && !isSafeMode(),
    { mounts: mounts, picker: picker } = ee
      ? Qr(loadOrgMemoryRows(of_2, storageV5, credentials))
      : { mounts: [], picker: null },
    [X, H, ae] = useLatestState(!1),
    [ve, oo] = y(!1),
    [J, go] = y(getEffectiveSelection),
    to = J !== null && yPe(J),
    [Xo] = y(isOrgMemoryReadEnabled),
    [no] = y(() => getCurrentProjectConfig().orgMemoryRead ?? !0),
    [Jo, ye] = y(null),
    [Qo, Zo] = y(!1),
    existingMemoryFiles = R(!1),
    ro = onProjectSwitch !== void 0 && isOrgMemoryReadEnabled(),
    te = getOrgMemoryDecision(),
    [wo] = y(() => (yn === null ? "closed" : getMemorySyncState())),
    et = wo !== "closed",
    On = wo === "pending",
    [xe] = y(OXe),
    [Cn, Rn] = y(() => null),
    [ot, _n] = y(getMemoryToggledOff),
    [vn] = y(() => null),
    io = !ee
      ? null
      : te.state === "on"
        ? { label: "active", note: te.stores.map((store) => store.mount).join(", ") }
        : te.state === "parked"
          ? {
              label: "parked",
              note: ro
                ? "paused for this session \u2014 pick a project to reconnect"
                : "paused for this session \u2014 a new pick still applies next session",
            }
          : te.state === "ended"
            ? {
                label: "ended",
                note:
                  te.cause === "account_switch"
                    ? "account changed \u2014 next session decides fresh"
                    : "signed out \u2014 next session decides fresh",
              }
            : null,
    memoryOptions = buildMemoryFileChoices(mergeByPath(U, addedInstructionFiles), originalCwd, "\xB7 ").map(
      (file) => ({ label: file.label, value: file.path, description: file.description }),
    ),
    Mo = [],
    De = [],
    agentDefinitions = useAppState((h) => h.agentDefinitions),
    [ge] = y(() => ({ write: !1, picker: !1, pickerData: null }));
  if (picker !== null) ge.pickerData = picker;
  let z = picker ?? ge.pickerData,
    So = z !== null && to;
  P(() => {
    if (So) logEvent("tengu_org_memory_legacy_pick_nudged", {});
  }, [So]);
  let st = te.state === "on" && J === te.request.selection,
    bo =
      J !== null &&
      (st
        ? hasPrivateGrouping(te.initialGrant)
        : z?.candidates.find((h) => h.id === J)?.visibility === "private"),
    ct =
      J === null || z === null
        ? Ze
        : (z.candidates.find((candidate) => candidate.id === J)?.id ??
          z.candidates.find((candidate) => candidate.isDefault)?.id ??
          z.candidates[0]?.id ??
          Ze);
  if (V) {
    for (let h of getAutoMemoryChoices())
      De.push({ label: h.label, value: `${Ie}${h.path}`, description: h.description });
    if (!Xo)
      for (let h of mounts)
        De.push({
          label: `Open synced project memory: ${h.mount}`,
          value: `${Ie}${h.dir}`,
          description: h.description,
        });
    if (((ge.picker ||= z !== null), z !== null && ge.picker)) {
      let h = J === null ? void 0 : z.candidates.find((candidate) => candidate.id === J),
        W = J === null ? null : (h?.name ?? (to ? "all public projects" : J)),
        Q = W === null ? "off" : no ? (bo ? `${W} (private)` : W) : "off \u2014 disabled in settings";
      Mo.push({
        label: `Sync memories from: ${Q}`,
        value: yo,
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
      De.push({ label: h.label, value: `${Ie}${h.path}`, description: h.description });
  }
  let Pe = [...Mo, ...memoryOptions, ...De],
    memorySelectorLastPath = of.memorySelectorLastPath,
    at =
      memorySelectorLastPath && Pe.some((h) => h.value === memorySelectorLastPath)
        ? memorySelectorLastPath
        : Pe[0]?.value || "",
    [he, ko] = y(isAutoMemoryEnabledIgnoringPause),
    [Oo, dt] = y(isAutoDreamEnabled),
    [mt] = y(() => po !== null && GRs()),
    [An, ut] = y(getAutoMemoryOffThisSession),
    [Le, pt] = y(isAutoMemoryDisabledForCurrentMainLoopModel);
  P(
    () =>
      onGrowthBookRefresh(() => {
        let h = isAutoMemoryDisabledForCurrentMainLoopModel();
        if (h !== Le) (pt(h), ko(isAutoMemoryEnabledIgnoringPause()));
      }),
    [Le],
  );
  let Ne = describeAutoMemoryToggle({
      enabled: he,
      modelDisabled: Le,
      safeMode: isSafeMode(),
      raiseAllowed: xe,
    }),
    ne = null,
    [Ve] = y(() => he && Mrn()),
    isGit = useAppState((h) =>
      Object.values(h.tasks).some((W) => W.type === "dream" && W.status === "running"),
    ),
    [yt, gt] = y(null);
  P(() => {
    if (!Ve) return;
    readLastConsolidatedAt(void 0, storageV5).then(gt);
  }, [Ve, isGit, storageV5]);
  let agentDefinitions_2 = describeAutoDreamToggle({
      autoMemoryOn: he,
      enabled: Oo,
      running: isGit,
      lastDreamAt: yt,
      raiseAllowed: xe,
      heldDetail: void 0,
    }),
    [, se, We] = useLatestState("list"),
    [Ro, ht] = y({ count: 0, first: !1 }),
    [be, _o] = y(isOrgMemoryWritesEnabledForAccount),
    [wt, ce] = y(null);
  ge.write ||= !GEn() && (be || (mounts.length > 0 && canWriteOrgMemory()));
  let vo = no && J !== null && ge.write;
  function Mt(h) {
    if (!vo) return;
    if (h && !OXe()) return;
    h5r(() => {
      let agentDir = applyOrgMemoryDecision(h, storageV5);
      if (agentDir === "granted" || agentDir === "withdrawn") (of_2.reset(), _o(h), ce(null));
      else if (agentDir === "noop") (_o(isOrgMemoryWritesEnabledForAccount()), ce(null));
      else if (agentDir === "refused_gates") ce("unavailable right now");
      else if (agentDir === "refused_identity") ce("requires an OAuth login");
      else if (agentDir === "refused_read_off") ce("enable reads first");
      else if (agentDir === "refused_session_kind") ce($$n);
    });
  }
  function St(h) {
    if (isSafeMode()) return;
    if (Le) return;
    if (h && !OXe()) return;
    (updateSettingsForSourceWithTransform(
      "userSettings",
      (W) => ({ autoMemoryEnabled: h, ...gn?.accountKeyKeptWithAutoMemory(W, h) }),
      void 0,
      storageV5,
    ),
      ko(h),
      logEvent("tengu_auto_memory_toggled", { enabled: h }));
  }
  function bt(h) {
    if (ne === null || !he || ot) return;
    if (h && !OXe()) return;
    (toggleAutoMemoryForSession(h, "memory_dialog", saveAutoMemorySessionSwitch), ut(!h));
  }
  function kt(h) {
    if (!Ve || !agentDefinitions_2.toggleable) return;
    if (h && !OXe()) return;
    let W = h && getInitialSettings_2().autoDreamEnabled === void 0;
    (updateSettingsForSource("userSettings", { autoDreamEnabled: h }, void 0, storageV5),
      dt(h),
      logEvent("tengu_auto_dream_toggled", { enabled: h, is_first_enable: W }));
  }
  let de = [
    {
      key: "auto-memory",
      label: "Auto-memory",
      value: he,
      description: Ne.dim ? [Ne.status, Ne.detail].filter(Boolean).join(" \xB7 ") : void 0,
      disabled: !Ne.toggleable,
      onChange: St,
    },
  ];
  if (mt && ne !== null && po !== null)
    de.push({
      key: "session-auto-memory",
      label: po.AUTO_MEMORY_SESSION_ROW_LABEL,
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
  if (vo)
    de.push({
      key: "org-writes",
      label: "Write to synced project memory",
      value: be,
      description:
        wt ??
        (!be && !xe
          ? `off \xB7 ${$$n}`
          : bo
            ? "no effect under a private project pick"
            : "this directory, applies next session"),
      disabled: !be && !xe,
      onChange: Mt,
    });
  let reduced = de.reduce((h, W) => h + OPs(W.description), 0),
    Be = useIsScreenReaderEnabled(),
    Ue = Be ? de : [],
    [Ao, Ct, Ye] = useLatestState(!1),
    [Rt, _t, me] = useLatestState(null),
    Po = Rt === null ? "flex" : "none";
  function vt() {
    (me()?.abort(), _t(null));
  }
  P(() => () => me()?.abort(), [me]);
  let Pn = null;
  return (
    useGlobalExitKeybindings(),
    useKeybinding(
      "confirm:no",
      () => {
        if (X) {
          H(!1);
          return;
        }
        if (Ye()) {
          if ((Ct(!1), Be)) se("list");
          return;
        }
        if (me() !== null) {
          vt();
          return;
        }
        onCancel();
      },
      { context: "Confirmation" },
    ),
    r(Box, {
      flexDirection: "column",
      width: "100%",
      children: [
        null,
        r(Box, {
          flexDirection: "column",
          marginBottom: 1,
          display: Po,
          children: [
            null,
            !Be &&
              e(Box, {
                flexDirection: "column",
                onFocus: () => {
                  if (!ae() && !Ye() && me() === null && We() !== "toggles") se("toggles");
                },
                children: e(
                  merged,
                  {
                    visibleCount: reduced,
                    defaultFocusIndex: Ro.first ? 0 : de.length - 1,
                    isDisabled: () => We() !== "toggles",
                    onDownFromLastItem: () => se("list"),
                    onDisabledRowClick: X || Ao ? void 0 : () => se("toggles"),
                    children: de.map((h) =>
                      e(
                        merged.Field,
                        {
                          label: h.label,
                          description: h.description,
                          children: e(merged.Toggle, {
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
              e(ListItem, {
                isFocused: !1,
                styled: !1,
                children: r(Text, {
                  children: [
                    "Synced project memory: ",
                    io.label,
                    r(Text, { dimColor: !0, children: [" \xB7 ", io.note] }),
                  ],
                }),
              }),
          ],
        }),
        X && z !== null
          ? e(useDialogKeybindings, {
              scope: "Confirmation",
              claimFocus: !0,
              bindings: [{ action: "confirm:no", run: () => H(!1) }],
              children: e(ModelSelector, {
                defaultFocusValue: ct,
                options: [
                  {
                    label: "off",
                    value: Ze,
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
                    let W = h === Ze,
                      Q = W ? void 0 : z.candidates.find((prev) => prev.id === h),
                      ke = W ? sJo : h,
                      oe = W ? null : h,
                      Oe = saveOrgMemorySelection(ke, storageV5),
                      Eo = Oe === "saved" || Oe === "cleared",
                      Re = getOrgMemoryDecision(),
                      At =
                        Oe === "noop" &&
                        (oe === null
                          ? Re.state === "on" || Re.state === "parked"
                          : !(Re.state === "on" && Re.request.selection === oe)),
                      Fo = ro && oe === null && (Re.state === "off" || Re.state === "ended"),
                      To =
                        (Eo || At) &&
                        !Fo &&
                        ro &&
                        onProjectSwitch(() =>
                          switchOrgMemoryProject(session, oe === null ? "off" : "project"),
                        );
                    if (Oe === "saved" && Q !== void 0)
                      logEvent("tengu_org_memory_project_selected", {
                        is_default: Q.isDefault === !0,
                        kind: fromEnum(Q.kind),
                        private: Q.visibility === "private",
                        reconnects_now: To,
                      });
                    if (To)
                      ((existingMemoryFiles.current = !0),
                        go(oe),
                        ce(null),
                        ye(oe === null ? "disconnecting\u2026" : "connecting\u2026"),
                        Zo(!0));
                    else if (Eo) {
                      let _e = getOrgMemoryDecision(),
                        co =
                          _e.state === "on" &&
                          _e.request.writeAccess &&
                          (oe === null || _e.request.selection !== oe) &&
                          shrinkOrgMemoryDecisionWriteAsk();
                      if (co || _e.state === "undecided") clearOrgMemoryCredential();
                      if ((go(oe), oe === null))
                        (ce(null),
                          ye(
                            co && be
                              ? "off \u2014 writes stop now; unsync next session"
                              : Fo
                                ? "off \u2014 saved for this directory"
                                : "off \u2014 applies next session",
                          ));
                      else
                        ye(
                          !no
                            ? "saved \u2014 enable reads in /config (orgMemoryRead) to apply"
                            : co && be
                              ? "saved \u2014 previous workspace writes stop now; applies next session"
                              : "saved \u2014 applies next session",
                        );
                      of_2.reset();
                    } else if (Oe === "refused") ye("requires an OAuth login");
                    else if (Oe === "refused_arms_writes")
                      ye("not saved \u2014 can't pick a project here while writes are on");
                    else ye(null);
                    H(!1);
                  });
                },
                onCancel: () => H(!1),
              }),
            })
          : e(Box, {
              flexDirection: "column",
              display: Po,
              onFocus: () => {
                if (!Ye() && me() === null && We() !== "list") se("list");
              },
              children: r(OrderedListWithItem, {
                defaultFocusIndex:
                  Ue.length +
                  Math.max(
                    0,
                    Pe.findIndex((h) => h.value === (ve ? yo : at)),
                  ),
                isDisabled: () => We() !== "list" || Qo || Ye() || me() !== null,
                onDisabledRowClick: Ao ? void 0 : () => se("list"),
                wrap: !0,
                onSelect: (value) => {
                  let W = Ue[value];
                  if (W !== void 0) {
                    if (!W.disabled) W.onChange(!W.value);
                    return;
                  }
                  let Q = Pe[value - Ue.length]?.value;
                  if (Q === void 0) return;
                  if (Q === yo) {
                    (H(!0), oo(!0));
                    return;
                  }
                  if (Q.startsWith(Ie)) {
                    let folderPath = Q.slice(Ie.length);
                    mkdir(folderPath, { recursive: !0 })
                      .catch(() => {})
                      .then(() => openPath(folderPath))
                      .catch(() => {});
                    return;
                  }
                  (of.rememberMemorySelectorPath(Q), onSelect(Q));
                },
                onUpFromFirstItem: () => {
                  (ht((h) => ({ count: h.count + 1, first: !1 })), se("toggles"));
                },
                onDownFromLastItem: et && !Be ? () => se("account") : void 0,
                children: [
                  Ue.map((h) =>
                    e(
                      OrderedListWithItem.Item,
                      { label: h.label, meta: [String(h.value)], description: h.description },
                      h.key,
                    ),
                  ),
                  Pe.map((h) =>
                    bunStringWidth(h.description) <= hn
                      ? e(OrderedListWithItem.Item, { label: h.label, meta: [h.description] }, h.value)
                      : e(OrderedListWithItem.Item, { label: h.label, description: h.description }, h.value),
                  ),
                  null,
                ],
              }),
            }),
        null,
      ],
    })
  );
}
//@ chunk-18hwfzwa.js:728716-728758 fingerprint = _temp5 (0.75)
function Y6t(t) {
  return t.type === "dream";
}
//@ chunk-e6aww6q8.js:1350609-1350685 fingerprint = _temp (1)
function D_e(f_1) {
  if (!isMemoryRecallEnabled()) return f_1;
  return f_1.filter((n) => n.type !== "AutoMem");
}

export { Y6t, memoryRowsCache, MemoryFileSelector, D_e };
