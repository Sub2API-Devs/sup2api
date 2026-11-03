/**
 * commands/plugin/PluginSettings.tsx
 *
 * /plugin 主界面：发现、已安装、市场、错误等标签页的容器与导航
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/PluginSettings.tsx
 * pieces: chunk-9h8dr0qb.js (3), chunk-e6aww6q8.js (1), chunk-f3qhjfah.js (2), chunk-tyg7f3ek.js (1), chunk-vrb44rx7.js (53)
 * attribution: placement 4, fingerprint 17, affinity 4, sole-consumer 14, file-local 3, layout 17, callgraph-fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { R, j, P, y } from "../../../vendor/react/cjs/react.production.js";
import { stripInvisibleChars } from "../../utils/sanitization.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { FocusColumn } from "../../components/design-system/FocusColumn.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { NEEDS_CONFIG_NOTE, activatePluginsAfterInstall } from "./activatePluginsAfterInstall.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import {
  stripInvisibleKeepEmoji,
  stripInvisibleKeepNewlines,
} from "../../utils/settings/marketplaceSettingsAliases.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { installPluginOp } from "../../services/plugins/pluginOperations.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { errorMessage } from "../../utils/errors.js";
import { escapedDisplayText, displayMarketplaceName } from "../../utils/plugins/pluginDisplayMetadata.js";
import { hr } from "../../utils/invisibleChars.js";
import {
  isPluginDirectoryUnavailableFailure,
  loadMarketplacesWithErrors,
} from "../../utils/plugins/marketplaceHelpers.js";
import {
  isOfficialMarketplaceName_2,
  OFFICIAL_MARKETPLACE_NAME,
  OFFICIAL_MARKETPLACE_DISPLAY,
  isOfficialMarketplaceSpelling,
  marketplaceDisplayName,
  removedMarketplaceMessage,
  blockedPluginsNotice,
  ubr,
} from "../../utils/plugins/officialMarketplaceNames.js";
import { count, uniq } from "../../utils/collections.js";
import {
  loadKnownMarketplacesWithDeclared,
  removeMarketplaceWithReservedSiblings,
} from "../../utils/plugins/marketplaceManager.js";
import {
  listClaudeAiMarketplaces,
  filterUnaddedClaudeAiMarketplaces,
  formatGitSourceSpec,
  ljt,
  formatMarketplaceScopeLabel,
  Qbt,
} from "../../utils/plugins/claudeAiMarketplaces.js";
import { useAppState, useSetAppState, useActivePlugins, useMcpConnections } from "../../state/AppState.js";
import { getInstalledPlugins, formatFirstKnownVersion } from "../../utils/plugins/installedPluginsManager.js";
import { getPluginEditableScopes, editableScopeOf } from "../../utils/plugins/pluginStartupCheck.js";
import { firstLineOf, nfcLower } from "../../utils/stringUtils.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { printableName, quotedPrintable, printableMessage } from "../../utils/printableName.js";
import { StatusRow } from "../../components/Settings/Status.js";
import {
  getSettingsForSourceForUpkeep,
  getSettingsForSource,
  updateSettingsForSourceWithTransform,
} from "../../utils/settings/settings.js";
import { pluginDirectoryPolicyBlock } from "../../utils/plugins/marketplacePolicy.js";
import { isReservedMarketplaceName, NPM } from "../../utils/plugins/schemas.js";
import {
  marketplaceOf,
  marketplaceSuffix,
  splitPluginId,
  isOfficialMarketplaceName_3,
  parseNpmPluginId,
} from "../../utils/plugins/pluginIdentifier.js";
import { Io } from "./skillHealth.js";
import { getErrorGuidanceText } from "./PluginErrors.js";
import { findInstalledEntry } from "../../services/plugins/pluginTag.js";
import { pluginWarningText, pluginWarningFixText } from "../../utils/plugins/pluginComponentConflicts.js";
import { usePluginWarnings, ca, ua, ManagePlugins } from "./ManagePlugins.js";
import { useKeybinding, useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { ic } from "../../utils/plugins/cacheUtils.js";
import { QE, jF } from "../../utils/plugins/pluginGates.js";
import { logEvent } from "../../services/analytics/index.js";
import { r$e } from "../../utils/telemetry/pluginTelemetry.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import { HintText } from "../../components/design-system/HintText.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { TwoColumnRow } from "../../components/CustomSelect/select.js";
import { Byline } from "../../components/design-system/Byline.js";
import { l8 } from "../../utils/sessionPeers.js";
import { iP } from "../../context/session.js";
import { $Po } from "../../state/promptInputStore.js";
import { parseSlashCommand } from "../../utils/slashCommandParsing.js";
import { parsePluginArgs } from "./parseArgs.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { PluginDetailsStore } from "./PluginDetails.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import {
  logSkillDoctor,
  isPluginMenuCloseReloadEnabled,
  schedulePluginMenuReload,
  PLUGIN_CHANGES_DEFERRED_NOTICE,
  SkillDoctorConfirm,
} from "./SkillDoctor.js";
import { ValidatePlugin } from "./ValidatePlugin.js";
import { PluginEvalRunner } from "./PluginEval.js";
import { PluginTagFlow } from "./PluginTag.js";
import { AddMarketplace } from "./AddMarketplace.js";
import { Tab, Tabs } from "../../components/design-system/Tabs.js";
import { BrowseMarketplace } from "./BrowseMarketplace.js";
import { DiscoverPluginsScreen } from "./DiscoverPluginsScreen.js";
import { ManageMarketplaces } from "./ManageMarketplaces.js";
import { Pane } from "../../components/design-system/Pane.js";
import { logError } from "../../utils/log.js";

/**
 * y/n 确认运行命令的对话框
 */
//@ chunk-vrb44rx7.js:101922-103281 placement
function ConfirmCommandDialog(i) {
  let T = w(19),
    { command: command, onConfirm: onConfirm, onCancel: onCancel } = i,
    x = R(!1),
    D;
  if (T[0] !== onCancel)
    ((D = function U() {
      if (x.current) {
        return;
      }
      ((x.current = !0), onCancel());
    }),
      (T[0] = onCancel),
      (T[1] = D));
  else D = T[1];
  let U = D,
    L;
  if (T[2] !== U || T[3] !== onConfirm)
    ((L = function K(A) {
      if (A.ctrl || A.meta) {
        return;
      }
      if (A.key === "y" || A.key === "Y") {
        if ((A.preventDefault(), x.current)) {
          return;
        }
        ((x.current = !0), onConfirm());
      } else if (A.key === "n" || A.key === "N") (A.preventDefault(), U());
    }),
      (T[2] = U),
      (T[3] = onConfirm),
      (T[4] = L));
  else L = T[4];
  let K = L,
    V;
  if (T[5] !== command)
    ((V = stripInvisibleChars(command, " ").trim().split(/\s+/).join(" ")), (T[5] = command), (T[6] = V));
  else V = T[6];
  let B = V,
    _;
  if (T[7] === MEMO_CACHE_SENTINEL) ((_ = e(Text, { bold: !0, children: "y" })), (T[7] = _));
  else _ = T[7];
  let J;
  if (T[8] === MEMO_CACHE_SENTINEL)
    ((J = r(Text, {
      children: ["Press ", _, " to run or ", e(Text, { bold: !0, children: "n" }), " to cancel"],
    })),
      (T[8] = J));
  else J = T[8];
  let pe;
  if (T[9] === MEMO_CACHE_SENTINEL)
    ((pe = e(Text, { children: "This command came from a link:" })), (T[9] = pe));
  else pe = T[9];
  let fe;
  if (T[10] !== B)
    ((fe = r(Text, { children: ["  ", e(Text, { bold: !0, children: B })] })), (T[10] = B), (T[11] = fe));
  else fe = T[11];
  let me;
  if (T[12] === MEMO_CACHE_SENTINEL)
    ((me = e(Box, {
      marginTop: 1,
      children: e(Text, {
        dimColor: !0,
        children: "Nothing runs until you answer. Only run commands from links you trust.",
      }),
    })),
      (T[12] = me));
  else me = T[12];
  let ne;
  if (T[13] !== K || T[14] !== fe)
    ((ne = r(FocusColumn, { onKeyDown: K, children: [pe, fe, me] })),
      (T[13] = K),
      (T[14] = fe),
      (T[15] = ne));
  else ne = T[15];
  let he;
  if (T[16] !== U || T[17] !== ne)
    ((he = e(Dialog, {
      title: "Run this command?",
      color: "suggestion",
      onCancel: U,
      inputGuide: J,
      children: ne,
    })),
      (T[16] = U),
      (T[17] = ne),
      (T[18] = he));
  else he = T[18];
  return he;
}
//@ chunk-vrb44rx7.js:103281-103285 placement
j();
//@ chunk-vrb44rx7.js:217501-217505 sole-consumer
j();
//@ chunk-vrb44rx7.js:217505-217734 sole-consumer
var USER = "user",
  Ak = {
    activated: " Plugin is now active.",
    "needs-config": ` Plugin is now active.${NEEDS_CONFIG_NOTE}`,
    "load-failed": " The plugin couldn't be loaded \u2014 see /plugin for details.",
    "reload-required": " Run /reload-plugins to apply.",
  };
/**
 * 挂载时执行一次插件安装（installAndReport），显示"Installing …"进度，完成后把结果文字交给 onComplete。
 */
//@ chunk-vrb44rx7.js:217734-218060 sole-consumer
function PluginInstallRunner({ spec: spec, onComplete: onComplete, onInstallComplete: onInstallComplete }) {
  let { storageV5: storageV5 } = Me(),
    x = R({ onComplete: onComplete, onInstallComplete: onInstallComplete }),
    T = R(!1);
  return (
    (x.current = { onComplete: onComplete, onInstallComplete: onInstallComplete }),
    P(() => {
      if (T.current) return;
      ((T.current = !0),
        installPluginAndReport(spec, storageV5, x.current).then((D) =>
          x.current.onComplete(stripInvisibleKeepEmoji(D)),
        ));
    }, [spec, storageV5]),
    e(WorkerBadge, { message: stripInvisibleKeepEmoji(`Installing ${spec}\u2026`) })
  );
}
//@ chunk-vrb44rx7.js:218060-218336 sole-consumer
async function installPluginAndReport(i, h, { onInstallComplete: onInstallComplete }) {
  try {
    let C = await installPluginOp(i, USER, {}, h);
    if (!C.success) return `${re.cross} ${C.message}`;
    let { pluginId: pluginId } = C,
      D =
        Ak[
          onInstallComplete !== void 0 && pluginId !== void 0
            ? await onInstallComplete([pluginId])
            : "reload-required"
        ];
    return `${re.tick} ${C.message}.${D}`;
  } catch (error) {
    return `${re.cross} ${errorMessage(error)}`;
  }
}
//@ chunk-vrb44rx7.js:218336-218362 sole-consumer
function fv() {
  return null;
}
//@ chunk-vrb44rx7.js:218362-218406 sole-consumer
function hv(he) {
  return `  \u2022 ${escapedDisplayText(he)}`;
}
//@ chunk-vrb44rx7.js:218406-218447 sole-consumer
function yv(Ke) {
  return Ke.plugins.errors;
}
//@ chunk-vrb44rx7.js:218447-218489 sole-consumer
function kv(Et) {
  return Et.plugins.enabled;
}
//@ chunk-vrb44rx7.js:218489-218532 sole-consumer
function bv(He) {
  return He.plugins.disabled;
}
//@ chunk-vrb44rx7.js:218532-218565 sole-consumer
function vv(ct) {
  return ct.source;
}
//@ chunk-vrb44rx7.js:218565-218620 sole-consumer
function wv(D) {
  return D.workerInventory?.plugins ?? null;
}
//@ chunk-vrb44rx7.js:218620-218648 sole-consumer
function Sv(U) {
  return hr(U);
}
//@ chunk-vrb44rx7.js:218648-218689 sole-consumer
function Cv(_n) {
  return _n.plugins.errors;
}
//@ chunk-vrb44rx7.js:218689-218731 sole-consumer
function Iv(jn) {
  return jn.plugins.enabled;
}
//@ chunk-vrb44rx7.js:218731-218774 affinity
function Pv(Ro) {
  return Ro.plugins.disabled;
}
//@ chunk-vrb44rx7.js:218774-218827 fingerprint = _temp3 (1)
function xv(s_0) {
  return s_0.plugins.installationStatus;
}
//@ chunk-vrb44rx7.js:218827-218871 file-local
function Rv(m) {
  return m.status === "failed";
}
//@ chunk-vrb44rx7.js:218871-218902 file-local
function Tv(m_0) {
  return m_0.name;
}
//@ chunk-vrb44rx7.js:218902-218942 file-local
function Ev(prev_1) {
  return Math.max(0, prev_1 - 1);
}
//@ chunk-vrb44rx7.js:218942-218986 layout
function Dv(lo) {
  return isPluginDirectoryUnavailableFailure(lo) && isOfficialMarketplaceName_2(lo.name);
}
//@ chunk-vrb44rx7.js:218986-219017 layout
function Mv($c) {
  return $c.name;
}
//@ chunk-vrb44rx7.js:219017-219046 layout
function $v() {
  return new Set();
}
//@ chunk-vrb44rx7.js:219046-219077 layout
function Nv(ja) {
  return !isAutoupdateInfoError(ja);
}
//@ chunk-vrb44rx7.js:219077-219223 fingerprint = _temp0 (1)
function countPluginErrors(s) {
  let Xo = count(s.plugins.errors, Nv);
  for (const marketplace of s.plugins.installationStatus.marketplaces) {
    if (marketplace.status === "failed") Xo++;
  }
  return Xo;
}
//@ chunk-vrb44rx7.js:219223-220291 fingerprint = MarketplaceList (0.411)
function MarketplaceList(t0) {
  let C = w(5),
    { onComplete: onComplete } = t0,
    { storageV5: storageV5 } = Me(),
    x,
    T;
  if (C[0] !== onComplete || C[1] !== storageV5)
    ((x = () => {
      let loadList = async function fe() {
        let D = await loadKnownMarketplacesWithDeclared(storageV5);
        let names = Object.keys(D);
        let L = await listClaudeAiMarketplaces().catch(fv);
        let { available: available, hosted: hosted } = filterUnaddedClaudeAiMarketplaces(L, D);
        let V = L?.browseOnly ?? [];
        if (names.length === 0 && available.length === 0 && hosted.length === 0 && V.length === 0)
          onComplete("No marketplaces configured");
        else {
          let B =
            names.length > 0
              ? ["Configured marketplaces:", ...names.map(hv)]
              : ["No marketplaces configured"];
          if (available.length > 0 || hosted.length > 0 || V.length > 0) B.push("From claude.ai:");
          for (const _ of available)
            B.push(
              `  \u2022 ${stripInvisibleKeepEmoji(escapedDisplayText(_.name))} (available from claude.ai${_.scope ? `, ${_.scope}` : ""} \u2014 not added) \xB7 ${stripInvisibleKeepEmoji(formatGitSourceSpec(_.source))}`,
            );
          for (const J of hosted)
            B.push(
              `  \u2022 ${stripInvisibleKeepEmoji(ljt(J))} \u2014 hosted on claude.ai, ${formatMarketplaceScopeLabel(J.scope)} \xB7 not added`,
            );
          for (const pe of V) B.push(`  \u2022 ${stripInvisibleKeepEmoji(Qbt(pe))} (browse on claude.ai)`);
          onComplete(
            B.join(`
`),
          );
        }
      };
      loadList().catch((me) => onComplete(`Error loading marketplaces: ${errorMessage(me)}`));
    }),
      (T = [onComplete, storageV5]),
      (C[0] = onComplete),
      (C[1] = storageV5),
      (C[2] = x),
      (C[3] = T));
  else ((x = C[2]), (T = C[3]));
  P(x, T);
  let ne;
  if (C[4] === MEMO_CACHE_SENTINEL) ((ne = e(Text, { children: "Loading marketplaces..." })), (C[4] = ne));
  else ne = C[4];
  return ne;
}
/**
 * 文本模式列出已安装插件（/plugin list）：每个安装范围一行，标记 enabled/disabled/failed to load，需要 /reload-plugins 时附提示；可按 enabled/disabled 过滤。
 */
//@ chunk-vrb44rx7.js:220291-221458 layout
function PluginListPrinter(props) {
  let D = w(8),
    { onComplete: onComplete, filter: filter } = props,
    C = useAppState(yv),
    x = useAppState(kv),
    T = useAppState(bv),
    U,
    L;
  if (D[0] !== x || D[1] !== filter || D[2] !== T || D[3] !== C || D[4] !== onComplete)
    ((U = () => {
      let A = getInstalledPlugins();
      let sorted = Object.keys(A.plugins).sort();
      if (sorted.length === 0) {
        onComplete("No plugins installed. Use `/plugin install` to install a plugin.");
        return;
      }
      let V = getPluginEditableScopes();
      let B = new Set(x.map(vv));
      let _ = ["Installed plugins:"];
      let J = 0;
      for (const pe of sorted) {
        let fe = firstLineOf(pe, "@");
        let me = V.has(pe);
        if (filter !== void 0 && (filter === "enabled") !== me) {
          continue;
        }
        let any = C.some(
          (ne) => !isAutoupdateInfoError(ne) && (ne.source === pe || ("plugin" in ne && ne.plugin === fe)),
        );
        let W = any ? `${re.cross} failed to load` : me ? `${re.tick} enabled` : `${re.cross} disabled`;
        let Oe = !any && me !== B.has(pe) ? " \u2014 run /reload-plugins to apply" : "";
        let je = (x.find((rt) => rt.source === pe) ?? T.find((et) => et.source === pe))?.manifest.version;
        for (const ae of A.plugins[pe] ?? []) {
          let Se = formatFirstKnownVersion(ae.version, je);
          let kt = Se ? `${escapeXml(printableName(Se, 100))}, ${ae.scope}` : ae.scope;
          (_.push(`  \u2022 ${pe} (${kt}) ${W}${Oe}`), J++);
        }
      }
      if (J === 0) {
        onComplete(`No ${filter} plugins.`);
        return;
      }
      onComplete(
        _.join(`
`),
      );
    }),
      (L = [onComplete, C, x, T, filter]),
      (D[0] = x),
      (D[1] = filter),
      (D[2] = T),
      (D[3] = C),
      (D[4] = onComplete),
      (D[5] = U),
      (D[6] = L));
  else ((U = D[5]), (L = D[6]));
  P(U, L);
  let Tt;
  if (D[7] === MEMO_CACHE_SENTINEL) ((Tt = e(Text, { children: "Loading plugins..." })), (D[7] = Tt));
  else Tt = D[7];
  return Tt;
}
//@ chunk-vrb44rx7.js:221458-221484 layout
function Cc() {
  return null;
}
//@ chunk-vrb44rx7.js:221484-221668 layout
function SkillsMovedNotice() {
  let i = w(1),
    h;
  if (i[0] === MEMO_CACHE_SENTINEL)
    ((h = e(Box, {
      marginTop: 1,
      children: e(StatusRow, {
        status: "info",
        children: "Skills are now managed here under the Skills section.",
      }),
    })),
      (i[0] = h));
  else h = i[0];
  return h;
}
/**
 * 云会话下显示"云会话已加载哪些插件"及"这里的改动影响本机与之后的云会话"的说明。
 */
//@ chunk-vrb44rx7.js:221668-222519 layout
function CloudSessionPluginsNotice() {
  let h = w(7),
    i = useAppState(wv),
    k;
  if (h[0] !== i)
    ((k =
      i === null
        ? "The cloud session hasn't reported which plugins it loaded (it does at the start of each turn)."
        : i.length === 0
          ? "The cloud session loaded no plugins."
          : `The cloud session loaded: ${i.map(Sv).join(", ")}.`),
      (h[0] = i),
      (h[1] = k));
  else k = h[1];
  let C;
  if (h[2] !== k) ((C = e(StatusRow, { status: "info", children: k })), (h[2] = k), (h[3] = C));
  else C = h[3];
  let x;
  if (h[4] === MEMO_CACHE_SENTINEL)
    ((x = e(Text, {
      dimColor: !0,
      wrap: "wrap-trim",
      children:
        "Changes here update this machine's plugins and future cloud sessions (/cloud-plugins decides whether they are sent), and reach a running cloud session only when this machine next attaches to it (or on your first Yes in /cloud-plugins); /reload-plugins re-reads the running session's own.",
    })),
      (h[4] = x));
  else x = h[4];
  let T;
  if (h[5] !== C)
    ((T = r(Box, { marginTop: 1, flexDirection: "column", children: [C, x] })), (h[5] = C), (h[6] = T));
  else T = h[6];
  return T;
}
//@ chunk-vrb44rx7.js:222519-222734 layout
function SkillDoctorMovedNotice() {
  let i = w(1),
    h;
  if (i[0] === MEMO_CACHE_SENTINEL)
    ((h = e(Box, {
      marginTop: 1,
      children: e(StatusRow, {
        status: "info",
        children: "/skill-doctor moved \u2014 skill usage and context costs now live in this Stats tab.",
      }),
    })),
      (i[0] = h));
  else h = i[0];
  return h;
}
//@ chunk-vrb44rx7.js:222734-223036 fingerprint = getExtraMarketplaceSourceInfo (0.954)
function getExtraMarketplaceSourceInfo(name) {
  let editableSources = [],
    sourcesToCheck = [
      { source: "userSettings", scope: "user" },
      { source: "projectSettings", scope: "project" },
      { source: "localSettings", scope: "local" },
    ];
  for (let { source: source, scope: scope } of sourcesToCheck)
    if (removeExtraMarketplace(getSettingsForSourceForUpkeep(source), name))
      editableSources.push({ source: source, scope: scope });
  let settings = Boolean(removeExtraMarketplace(getSettingsForSource("policySettings"), name));
  return { editableSources: editableSources, isInPolicy: settings };
}
//@ chunk-vrb44rx7.js:223036-223111 layout
function Om(i) {
  return i?.extraKnownMarketplaces?.[OFFICIAL_MARKETPLACE_NAME]?.autoUpdate !== void 0;
}
/**
 * 决定删除某个市场时的动作：在 extraKnownMarketplaces 里时删设置项（官方市场可保留已启用插件），只在托管策略里时提示 managed-only，官方市场否则跳转到对应页，其他走常规市场删除。
 */
//@ chunk-vrb44rx7.js:223111-223525 layout
function planMarketplaceRemoval(i, h, k = !1) {
  let { editableSources: editableSources, isInPolicy: isInPolicy } = getExtraMarketplaceSourceInfo(i);
  if (i === OFFICIAL_MARKETPLACE_NAME) {
    let filtered = editableSources.filter(
      ({ source: source }) => !(source === "userSettings" && Om(getSettingsForSourceForUpkeep(source))),
    );
    if (k && filtered.length > 0)
      return { kind: "remove-extra-marketplace", name: i, sources: filtered, keepEnabledPlugins: !0 };
    if (k && isInPolicy) return { kind: "managed-only", name: i };
    return navigateToOfficialMarketplace(h);
  }
  if (editableSources.length > 0)
    return { kind: "remove-extra-marketplace", name: i, sources: editableSources };
  if (isInPolicy) return { kind: "managed-only", name: i };
  return buildMarketplaceAction(i);
}
//@ chunk-vrb44rx7.js:223525-223659 layout
function joinScopeNames(i) {
  let mapped = i.map((k) => k.scope);
  return mapped.length > 1
    ? `${mapped.slice(0, -1).join(", ")}${mapped.length > 2 ? "," : ""} and ${mapped.at(-1)}`
    : (mapped[0] ?? "");
}
/**
 * 生成删除市场前的确认文案：删除 extraKnownMarketplaces 设置项，或删除 known_marketplaces.json 条目并卸载其插件；官方市场与拼写相近的官方市场有额外说明。
 */
//@ chunk-vrb44rx7.js:223659-224942 layout
function describeMarketplaceRemoval(action, marketplaceNames) {
  if (action.kind === "remove-extra-marketplace") {
    let D = quotedPrintable(action.name);
    return action.keepEnabledPlugins
      ? `Remove "${D}" from extraKnownMarketplaces in ${joinScopeNames(action.sources)} settings? The built-in ${OFFICIAL_MARKETPLACE_DISPLAY} and its plugins are not changed.`
      : `Remove "${D}" from extraKnownMarketplaces in ${joinScopeNames(action.sources)} settings? Its plugins are also removed from enabledPlugins there.`;
  }
  let quotedNames = marketplaceNames.map((D) => `"${quotedPrintable(D)}"`),
    includesOfficial = marketplaceNames.includes(OFFICIAL_MARKETPLACE_NAME),
    nonOfficialNames = quotedNames.filter(
      (D, U) => !(includesOfficial && marketplaceNames[U] === OFFICIAL_MARKETPLACE_NAME),
    ),
    sentences = [
      quotedNames.length > 1
        ? `Remove the known_marketplaces.json entries named ${quotedNames.join(" and ")}?`
        : `Remove the known_marketplaces.json entry named ${quotedNames[0] ?? ""}?`,
    ];
  if (nonOfficialNames.length > 0)
    sentences.push(
      `Plugins installed from ${nonOfficialNames.join(" and ")} are uninstalled, and ${nonOfficialNames.length > 1 ? "their" : "its"} extraKnownMarketplaces and enabledPlugins entries in your user, project, and local settings are removed too.`,
    );
  if (includesOfficial)
    sentences.push(
      `Nothing installed from "${OFFICIAL_MARKETPLACE_NAME}" is uninstalled. Its extraKnownMarketplaces entries in your user, project, and local settings are removed too, except the one in user settings that sets autoUpdate.`,
    );
  if (marketplaceNames.some(isOfficialMarketplaceSpelling))
    sentences.push(
      `Installed ${OFFICIAL_MARKETPLACE_DISPLAY} plugins not at a commit it lists may have come from ${quotedNames.length > 1 ? "these entries" : "this entry"}, so they are turned off (all of them, if its cached list can't be read). The ${OFFICIAL_MARKETPLACE_DISPLAY} itself stays as it is.`,
    );
  return sentences.join(" ");
}
//@ chunk-vrb44rx7.js:224942-225083 fingerprint = buildMarketplaceAction (0.604)
function buildMarketplaceAction(name) {
  return {
    kind: "navigate",
    tab: "marketplaces",
    viewState: { type: "manage-marketplaces", targetMarketplace: name, action: "confirm-remove" },
  };
}
//@ chunk-vrb44rx7.js:225083-225338 layout
function navigateToOfficialMarketplace(i) {
  if (pluginDirectoryPolicyBlock() !== null && i !== void 0)
    return {
      kind: "navigate",
      tab: "installed",
      viewState: { type: "manage-plugins", targetPlugin: i, targetMarketplace: OFFICIAL_MARKETPLACE_NAME },
    };
  return {
    kind: "navigate",
    tab: "marketplaces",
    viewState: { type: "manage-marketplaces", targetMarketplace: OFFICIAL_MARKETPLACE_NAME },
  };
}
//@ chunk-vrb44rx7.js:225338-225624 fingerprint = buildPluginAction (0.87)
function buildPluginAction(i, { resolveByUninstall: resolveByUninstall }) {
  return {
    kind: "navigate",
    tab: "installed",
    viewState: {
      type: "manage-plugins",
      targetPlugin: i.name,
      ...(i.marketplace !== void 0 && { targetMarketplace: i.marketplace }),
      ...(resolveByUninstall &&
        i.marketplace !== void 0 &&
        (!isReservedMarketplaceName(i.marketplace) || i.marketplace === NPM) && { action: "uninstall" }),
    },
  };
}
//@ chunk-vrb44rx7.js:225624-225690 fingerprint = TRANSIENT_ERROR_TYPES (1)
var TRANSIENT_ERROR_TYPES = new Set(["git-auth-failed", "git-timeout", "network-error"]);
//@ chunk-vrb44rx7.js:225690-225823 fingerprint = _temp7 (1)
function isMarketplaceError(e_1) {
  return (
    e_1.type === "marketplace-not-found" ||
    e_1.type === "marketplace-load-failed" ||
    e_1.type === "marketplace-blocked-by-policy"
  );
}
//@ chunk-vrb44rx7.js:225823-225991 callgraph-fingerprint = _temp6 (0.65)
function isTransientPluginError(e_0) {
  if (TRANSIENT_ERROR_TYPES.has(e_0.type)) return !0;
  if (e_0.type === "marketplace-load-failed" && e_0.reason === "cache-miss") return !0;
  if (e_0.type === "marketplace-not-found") return !0;
  return !1;
}
/**
 * 从插件错误的 source 解析出插件名与市场：返回规范化 key、显示标签、可编辑范围、是否有名字。
 */
//@ chunk-vrb44rx7.js:225991-226328 layout
function describePluginErrorTarget(i, h, k) {
  let C = marketplaceOf(i.source),
    x = "marketplace" in i ? i.marketplace : void 0,
    T = h ?? (C || marketplaceSuffix(i.source) !== void 0 ? splitPluginId(i.source).name : void 0),
    D = C ?? x ?? marketplaceSuffix(i.source);
  return {
    key: T === void 0 ? void 0 : nfcLower(D ? `${T}@${D}` : T),
    label: T === void 0 ? i.source : D ? `${T} @ ${displayMarketplaceName(D)}` : T,
    scope: editableScopeOf(k, i.source) ?? (T !== void 0 && C ? editableScopeOf(k, `${T}@${C}`) : void 0),
    named: T !== void 0,
  };
}
//@ chunk-vrb44rx7.js:226328-228408 fingerprint = buildErrorRows (0.788)
function buildErrorRows(i, h, k, C, x, T, D, U, L) {
  let rows = [];
  for (let error of T) {
    let _ = "pluginId" in error ? error.pluginId : "plugin" in error ? error.plugin : void 0;
    rows.push({
      label: _ ?? error.source,
      message: Io(error),
      guidance: getErrorGuidanceText(error) ?? "Restart to retry loading plugins",
      action: { kind: "none" },
    });
  }
  let shownMarketplaceNames = new Set();
  for (let B of i) {
    shownMarketplaceNames.add(B.name);
    let _ = planMarketplaceRemoval(B.name, void 0, !0),
      action = getExtraMarketplaceSourceInfo(B.name),
      pe = action.isInPolicy ? "managed" : action.editableSources[0]?.scope;
    rows.push({
      label: displayMarketplaceName(B.name),
      message: B.error ?? "Installation failed",
      guidance: _.kind === "managed-only" ? "Managed by your organization \u2014 contact your admin" : void 0,
      action: _,
      scope: pe,
    });
  }
  for (let B of h) {
    let _ = "marketplace" in B ? B.marketplace : B.source;
    if (shownMarketplaceNames.has(_)) continue;
    shownMarketplaceNames.add(_);
    let J = planMarketplaceRemoval(_, "plugin" in B ? B.plugin : void 0),
      action = getExtraMarketplaceSourceInfo(_),
      fe = action.isInPolicy ? "managed" : action.editableSources[0]?.scope;
    rows.push({
      label: displayMarketplaceName(_),
      message: Io(B),
      guidance:
        J.kind === "managed-only"
          ? "Managed by your organization \u2014 contact your admin"
          : getErrorGuidanceText(B),
      action: J,
      scope: fe,
    });
  }
  for (let B of x) {
    let sourceInfo = isPluginDirectoryUnavailableFailure(B);
    if (!sourceInfo && shownMarketplaceNames.has(B.name)) continue;
    if (!sourceInfo) shownMarketplaceNames.add(B.name);
    let J = sourceInfo ? B.name : marketplaceDisplayName(B.name),
      pe = !1;
    ((pe = B.name === OFFICIAL_MARKETPLACE_NAME && !sourceInfo),
      rows.push({
        label: J === B.name ? displayMarketplaceName(B.name) : J,
        message: B.error,
        ...(pe && {
          guidance:
            "Reopen /plugin later to try again. Enter opens it in Marketplaces, where you can update it now or turn it off.",
        }),
        action: pe
          ? navigateToOfficialMarketplace()
          : sourceInfo
            ? { kind: "remove-ignored-name-entries", name: B.name }
            : buildMarketplaceAction(B.name),
      }));
  }
  let shownPluginNames = new Set();
  for (let error of k) {
    let _ = describePluginErrorTarget(error, getPluginNameFromError(error), U);
    if (_.key !== void 0 && shownPluginNames.has(_.key)) continue;
    if (_.key !== void 0) shownPluginNames.add(_.key);
    let pluginName = isAutoupdateInfoError(error);
    rows.push({
      label: _.label,
      message: Io(error),
      guidance: getErrorGuidanceText(error),
      action:
        _.named && !pluginName
          ? buildPluginAction(findInstalledEntry(error, L), { resolveByUninstall: !0 })
          : { kind: "none" },
      isAdvisory: pluginName || void 0,
      scope: _.scope,
    });
  }
  for (let B of C)
    rows.push({
      label: B.source,
      message: Io(B),
      guidance: getErrorGuidanceText(B),
      action: { kind: "none" },
    });
  for (let B of D) {
    let _ = describePluginErrorTarget(B, "plugin" in B ? B.plugin : void 0, U),
      J = _.key ?? nfcLower(B.source),
      pe =
        B.type === "mcpb-needs-config"
          ? `${B.type}:${J}:${B.serverName}`
          : "plugin" in B
            ? J
            : `${B.type}:${J}`;
    if (shownPluginNames.has(pe)) continue;
    (shownPluginNames.add(pe),
      rows.push({
        label: _.label,
        message: pluginWarningText(B),
        guidance: pluginWarningFixText(B),
        action:
          B.type === "mcpb-needs-config" && _.named
            ? buildPluginAction(findInstalledEntry(B, L), { resolveByUninstall: !1 })
            : { kind: "none" },
        scope: _.scope,
        isAdvisory: !0,
      }));
  }
  return rows;
}
/**
 * 界面里把多个市场批量写回各自设置源的 extraKnownMarketplaces（可删除）。
 */
//@ chunk-vrb44rx7.js:228408-228803 layout = saveMarketplaceToSettings (0.841)
function saveMarketplaceToSettings(i, h, k, C = !1) {
  for (let { source: source } of h)
    updateSettingsForSourceWithTransform(
      source,
      (T) => {
        if (!T) return null;
        let D = {},
          existing = C && source === "userSettings" && i === OFFICIAL_MARKETPLACE_NAME && Om(T);
        if (removeExtraMarketplace(T, i) && !existing)
          D.extraKnownMarketplaces = { ...T.extraKnownMarketplaces, [i]: void 0 };
        if (T.enabledPlugins && !C) {
          let L = `@${i}`,
            A = !1,
            current = { ...T.enabledPlugins };
          for (let key in current) if (key.endsWith(L)) ((current[key] = void 0), (A = !0));
          if (A) D.enabledPlugins = current;
        }
        return Object.keys(D).length > 0 ? D : null;
      },
      void 0,
      k,
    );
}
//@ chunk-vrb44rx7.js:228803-235684 fingerprint = ErrorsTabContent (0.612)
function ErrorsTabContent(t0) {
  let W = w(59),
    { setViewState: setViewState, setActiveTab: setActiveTab, markPluginsChanged: markPluginsChanged } = t0,
    { storageV5: storageV5, credentials: credentials } = Me(),
    errors = useAppState(Cv),
    U = usePluginWarnings(),
    installationStatus = useAppState(Iv),
    A = useAppState(Pv),
    K = useAppState(xv),
    setAppState = useSetAppState(),
    B = useActivePlugins(),
    [_, J] = y(0),
    [pe, fe] = y(null),
    [me, ne] = y(null),
    he = R(!1),
    Oe;
  if (W[0] === MEMO_CACHE_SENTINEL) ((Oe = []), (W[0] = Oe));
  else Oe = W[0];
  let [rt, et] = y(Oe),
    je,
    ae;
  if (W[1] !== storageV5)
    ((je = () => {
      (async () => {
        try {
          let Se = await loadKnownMarketplacesWithDeclared(storageV5);
          let { failures: failures } = await loadMarketplacesWithErrors(Se, storageV5);
          et(failures);
        } catch {}
      })();
    }),
      (ae = [storageV5]),
      (W[1] = storageV5),
      (W[2] = je),
      (W[3] = ae));
  else ((je = W[2]), (ae = W[3]));
  P(je, ae);
  let failedMarketplaces = K.marketplaces.filter(Rv),
    failedMarketplaceNames = new Set(failedMarketplaces.map(Tv)),
    Et = [],
    He = [],
    ct = [],
    Ct = [];
  for (const oe of errors) {
    if (isTransientPluginError(oe)) Et.push(oe);
    else if (isMarketplaceError(oe)) {
      if (!failedMarketplaceNames.has(oe.marketplace)) He.push(oe);
    } else if (getPluginNameFromError(oe) !== void 0) ct.push(oe);
    else Ct.push(oe);
  }
  let ft = buildErrorRows(failedMarketplaces, He, ct, Ct, rt, Et, U, getPluginEditableScopes(), [
      ...installationStatus,
      ...A,
    ]),
    at;
  if (W[4] !== me || W[5] !== setViewState)
    ((at = () => {
      if (me !== null) {
        ne(null);
        return;
      }
      setViewState({ type: "menu" });
    }),
      (W[4] = me),
      (W[5] = setViewState),
      (W[6] = at));
  else at = W[6];
  let Ot;
  if (W[7] === MEMO_CACHE_SENTINEL) ((Ot = { context: "Confirmation" }), (W[7] = Ot));
  else Ot = W[7];
  useKeybinding("confirm:no", at, Ot);
  let an;
  if (W[8] !== credentials || W[9] !== markPluginsChanged || W[10] !== setAppState || W[11] !== storageV5)
    ((an = (Yt) => {
      let _e = joinScopeNames(Yt.sources);
      (saveMarketplaceToSettings(Yt.name, Yt.sources, storageV5, Yt.keepEnabledPlugins === !0),
        ic(storageV5, credentials));
      let qe = Yt.keepEnabledPlugins === !0;
      (setAppState((vt) => ({
        ...vt,
        plugins: {
          ...vt.plugins,
          errors: vt.plugins.errors.filter(
            (error) => qe || !("marketplace" in error && error.marketplace === Yt.name),
          ),
          installationStatus: {
            ...vt.plugins.installationStatus,
            marketplaces: vt.plugins.installationStatus.marketplaces.filter(
              (prev_0) => prev_0.name !== Yt.name,
            ),
          },
        },
      })),
        fe(
          qe
            ? `${re.tick} Removed "${quotedPrintable(Yt.name)}" from extraKnownMarketplaces in ${_e} settings. The built-in ${OFFICIAL_MARKETPLACE_DISPLAY} and its plugins are not changed.`
            : `${re.tick} Removed "${quotedPrintable(Yt.name)}" and its enabledPlugins entries from ${_e} settings`,
        ),
        markPluginsChanged());
    }),
      (W[8] = credentials),
      (W[9] = markPluginsChanged),
      (W[10] = setAppState),
      (W[11] = storageV5),
      (W[12] = an));
  else an = W[12];
  let $t = an,
    ln;
  if (W[13] !== B || W[14] !== credentials || W[15] !== markPluginsChanged || W[16] !== storageV5)
    ((ln = (e_2) => {
      (async () => {
        let Ut = !1;
        if (isOfficialMarketplaceSpelling(e_2.name)) {
          if (he.current) {
            return;
          }
          ((he.current = !0), (Ut = !0));
        }
        try {
          let rn = await removeMarketplaceWithReservedSiblings(e_2.name, void 0, storageV5, credentials, {
            onlyIgnoredNameEntries: !0,
          });
          let mn = `${re.tick} Removed marketplace "${quotedPrintable(e_2.name)}"`;
          let xn = [e_2.name];
          let Ln = rn.kind !== "plugin-directory-built-in";
          let Mn = [];
          if (rn.kind !== "plugin-directory-built-in") Mn = rn.removedPluginIds;
          if (rn.kind === "ignored-plugin-directory-name-entry-removed") {
            let fn = QE();
            let mapped = rn.removedNames.map((m_1) => removedMarketplaceMessage(m_1, fn));
            mn = `${re.tick} ${mapped.join(" ")}`;
            let le = blockedPluginsNotice(rn.disabledPluginIds, rn.disabledReason);
            if (le !== null) mn = `${mn} ${le}`;
            if (((xn = [e_2.name, ...rn.removedNames]), (Ln = rn.removedNames.length > 0), !Ln))
              mn = `${re.tick} ${ubr(e_2.name)}`;
          }
          if (Ln)
            logEvent("tengu_marketplace_removed", {
              marketplace_name: r$e(e_2.name),
              _PROTO_marketplace_name: e_2.name,
              is_official_marketplace: isOfficialMarketplaceName_3(e_2.name),
            });
          ic(storageV5, credentials);
          let Te = rn.kind === "ignored-plugin-directory-name-entry-removed";
          (et((prev) =>
            prev.filter((dt) => !xn.includes(dt.name) || (Te && !isPluginDirectoryUnavailableFailure(dt))),
          ),
            B.removeErrorsOf(Mn),
            fe(mn),
            markPluginsChanged());
        } catch (t6) {
          let Dt = t6;
          fe(`Failed to remove "${quotedPrintable(e_2.name)}": ${printableMessage(Dt)}`);
        }
        if (Ut) he.current = !1;
      })();
    }),
      (W[13] = B),
      (W[14] = credentials),
      (W[15] = markPluginsChanged),
      (W[16] = storageV5),
      (W[17] = ln));
  else ln = W[17];
  let wt = ln,
    ke = () => {
      let We = ft[_];
      if (!We) {
        return;
      }
      let { action: action } = We;
      Ve: switch (action.kind) {
        case "navigate": {
          (setActiveTab(action.tab), setViewState(action.viewState));
          break Ve;
        }
        case "remove-extra-marketplace": {
          ne(action);
          break Ve;
        }
        case "remove-ignored-name-entries": {
          ne(action);
          break Ve;
        }
        case "managed-only": {
          break Ve;
        }
        case "none":
      }
    },
    on;
  if (W[18] === MEMO_CACHE_SENTINEL) ((on = () => J(Ev)), (W[18] = on));
  else on = W[18];
  const Jt = ft.length > 0 && !me;
  let qt;
  if (W[19] !== Jt) ((qt = { context: "Select", isActive: Jt }), (W[19] = Jt), (W[20] = qt));
  else qt = W[20];
  MessageActionsKeybindings(
    {
      "select:previous": on,
      "select:next": () => J((ht) => Math.min(ft.length - 1, ht + 1)),
      "select:accept": ke,
    },
    qt,
  );
  let xt;
  if (W[21] !== rt)
    ((xt = (_t) =>
      _t.kind === "remove-ignored-name-entries" && isOfficialMarketplaceName_2(_t.name)
        ? uniq([_t.name, ...rt.filter(Dv).map(Mv)])
        : [_t.name]),
      (W[21] = rt),
      (W[22] = xt));
  else xt = W[22];
  let Mt = xt,
    hn;
  if (W[23] !== me || W[24] !== $t || W[25] !== wt)
    ((hn = function sn(prev_2) {
      if (prev_2.ctrl || prev_2.meta || me === null) {
        return;
      }
      if (prev_2.key === "up" || prev_2.key === "down") {
        prev_2.preventDefault();
        return;
      }
      if (prev_2.key === "y" || prev_2.key === "Y") {
        prev_2.preventDefault();
        let Fn = me;
        if ((ne(null), Fn.kind === "remove-extra-marketplace")) $t(Fn);
        else wt(Fn);
      } else if (prev_2.key === "n" || prev_2.key === "N") (prev_2.preventDefault(), ne(null));
    }),
      (W[23] = me),
      (W[24] = $t),
      (W[25] = wt),
      (W[26] = hn));
  else hn = W[26];
  let sn = hn;
  if (ft.length === 0 && me !== null) ne(null);
  let clampedIndex = Math.min(_, Math.max(0, ft.length - 1));
  if (clampedIndex !== _) J(clampedIndex);
  let selectedAction = ft[clampedIndex]?.action,
    An = selectedAction && selectedAction.kind !== "none" && selectedAction.kind !== "managed-only";
  if (ft.length === 0) {
    let Bn;
    if (W[27] === MEMO_CACHE_SENTINEL)
      ((Bn = e(Box, { marginLeft: 1, children: e(HintText, { children: "No plugin errors" }) })),
        (W[27] = Bn));
    else Bn = W[27];
    let Tn;
    if (W[28] !== pe)
      ((Tn =
        pe &&
        e(Box, {
          marginTop: 1,
          marginLeft: 1,
          children: e(Text, { color: "claude", children: stripInvisibleKeepEmoji(pe) }),
        })),
        (W[28] = pe),
        (W[29] = Tn));
    else Tn = W[29];
    let ze;
    if (W[30] === MEMO_CACHE_SENTINEL)
      ((ze = e(Box, {
        marginTop: 1,
        children: e(Text, {
          dimColor: !0,
          italic: !0,
          children: e(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Confirmation",
            fallback: "Esc",
            description: "go back",
          }),
        }),
      })),
        (W[30] = ze));
    else ze = W[30];
    let At;
    if (W[31] !== Tn)
      ((At = r(Box, { flexDirection: "column", children: [Bn, Tn, ze] })), (W[31] = Tn), (W[32] = At));
    else At = W[32];
    return At;
  }
  const de = Box,
    t10 = "column",
    Tn = 1;
  let ze;
  if (W[33] !== clampedIndex || W[34] !== me)
    ((ze = (row_0, idx) => {
      let mt = idx === clampedIndex;
      let en = row_0.isAdvisory ? "warning" : "error";
      let Pt = mt ? re.pointer : row_0.isAdvisory ? re.triangleUpOutline : re.cross;
      return r(
        TwoColumnRow,
        {
          active: mt && !me,
          marginLeft: 1,
          flexDirection: "column",
          children: [
            r(Text, {
              children: [
                r(Text, { "aria-hidden": mt, color: mt ? "suggestion" : en, children: [Pt, " "] }),
                e(Text, { bold: mt, children: stripInvisibleKeepEmoji(row_0.label) }),
                row_0.scope && r(Text, { dimColor: !0, children: [" (", row_0.scope, ")"] }),
              ],
            }),
            e(Box, {
              marginLeft: 3,
              children: e(Text, {
                color: en,
                wrap: "wrap-trim",
                children: stripInvisibleKeepNewlines(row_0.message),
              }),
            }),
            row_0.guidance &&
              e(Box, {
                marginLeft: 3,
                children: e(Text, {
                  dimColor: !0,
                  italic: !0,
                  wrap: "wrap-trim",
                  children: stripInvisibleKeepNewlines(row_0.guidance),
                }),
              }),
          ],
        },
        idx,
      );
    }),
      (W[33] = clampedIndex),
      (W[34] = me),
      (W[35] = ze));
  else ze = W[35];
  const t12 = ft.map(ze);
  let kn;
  if (W[36] !== sn || W[37] !== me || W[38] !== Mt)
    ((kn =
      me &&
      e(FocusColumn, {
        onKeyDown: sn,
        children: e(TwoColumnRow, {
          active: !0,
          marginLeft: 1,
          children: r(Text, {
            color: "warning",
            wrap: "wrap-trim",
            children: [
              describeMarketplaceRemoval(me, Mt(me)),
              " ",
              "Press ",
              e(Text, { bold: !0, children: "y" }),
              " to remove or ",
              e(Text, { bold: !0, children: "n" }),
              " to keep",
              " ",
              Mt(me).length > 1 ? "them" : "it",
              ".",
            ],
          }),
        }),
      })),
      (W[36] = sn),
      (W[37] = me),
      (W[38] = Mt),
      (W[39] = kn));
  else kn = W[39];
  let bn;
  if (W[40] !== pe)
    ((bn =
      pe &&
      e(Box, {
        marginLeft: 1,
        children: e(Text, { color: "claude", children: stripInvisibleKeepEmoji(pe) }),
      })),
      (W[40] = pe),
      (W[41] = bn));
  else bn = W[41];
  let Hn;
  if (W[42] !== me)
    ((Hn =
      !me &&
      e(ConfigurableShortcutHint, {
        action: "select:previous",
        context: "Select",
        fallback: "\u2191",
        description: "navigate",
      })),
      (W[42] = me),
      (W[43] = Hn));
  else Hn = W[43];
  let wn;
  if (W[44] !== An || W[45] !== me)
    ((wn =
      An &&
      !me &&
      e(ConfigurableShortcutHint, {
        action: "select:accept",
        context: "Select",
        fallback: "Enter",
        description: "resolve",
      })),
      (W[44] = An),
      (W[45] = me),
      (W[46] = wn));
  else wn = W[46];
  const Ft = me ? (Mt(me).length > 1 ? "keep them" : "keep it") : "go back";
  let po;
  if (W[47] !== Ft)
    ((po = e(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Confirmation",
      fallback: "Esc",
      description: Ft,
    })),
      (W[47] = Ft),
      (W[48] = po));
  else po = W[48];
  let ao;
  if (W[49] !== Hn || W[50] !== wn || W[51] !== po)
    ((ao = e(Box, {
      children: e(Text, { dimColor: !0, italic: !0, children: r(Byline, { children: [Hn, wn, po] }) }),
    })),
      (W[49] = Hn),
      (W[50] = wn),
      (W[51] = po),
      (W[52] = ao));
  else ao = W[52];
  let Yn;
  if (W[53] !== de || W[54] !== t12 || W[55] !== kn || W[56] !== bn || W[57] !== ao)
    ((Yn = r(de, { flexDirection: t10, gap: Tn, children: [t12, kn, bn, ao] })),
      (W[53] = de),
      (W[54] = t12),
      (W[55] = kn),
      (W[56] = bn),
      (W[57] = ao),
      (W[58] = Yn));
  else Yn = W[58];
  return Yn;
}
//@ chunk-vrb44rx7.js:235684-237549 fingerprint = getInitialViewState (0.746)
function getInitialViewState(i, h) {
  switch (i.type) {
    case "help":
      return { type: "help" };
    case "validate":
      return { type: "validate", path: i.path };
    case "eval":
      return { type: "eval", target: i.target };
    case "tag":
      return {
        type: "tag",
        path: i.path,
        push: i.push,
        dryRun: i.dryRun,
        force: i.force,
        unknownFlag: i.unknownFlag,
      };
    case "install":
      if (
        i.marketplace !== void 0 &&
        i.plugin !== void 0 &&
        parseNpmPluginId(`${i.plugin}@${i.marketplace}`) !== null
      )
        return { type: "npm-install", spec: `${i.plugin}@${i.marketplace}` };
      if (i.marketplace)
        return { type: "browse-marketplace", targetMarketplace: i.marketplace, targetPlugin: i.plugin };
      if (i.plugin) return { type: "discover-plugins", targetPlugin: i.plugin };
      return { type: "discover-plugins" };
    case "usage-error":
      return { type: "menu" };
    case "install-from-source":
      return {
        type: "add-marketplace",
        initialValue: i.marketplaceSource,
        confirmAdd: { plugin: i.plugin, linkOrigin: h },
      };
    case "manage":
      return { type: "manage-plugins" };
    case "stats":
      return { type: "stats" };
    case "directory":
      return { type: "discover-plugins", marketplace: OFFICIAL_MARKETPLACE_NAME, searchQuery: i.query };
    case "uninstall":
      return { type: "manage-plugins", targetPlugin: i.plugin, action: "uninstall" };
    case "enable":
      return { type: "manage-plugins", targetPlugin: i.plugin, action: "enable" };
    case "disable":
      return { type: "manage-plugins", targetPlugin: i.plugin, action: "disable" };
    case "configure":
      return { type: "manage-plugins", targetPlugin: i.plugin, action: "configure" };
    case "list":
      return { type: "plugin-list", filter: i.filter };
    case "marketplace":
      if (i.action === "list") return { type: "marketplace-list" };
      if (i.action === "add")
        return i.target && h
          ? { type: "add-marketplace", initialValue: i.target, confirmAdd: { linkOrigin: !0 } }
          : { type: "add-marketplace", initialValue: i.target };
      if (i.action === "remove")
        return { type: "manage-marketplaces", targetMarketplace: i.target, action: "remove" };
      if (i.action === "update")
        return { type: "manage-marketplaces", targetMarketplace: i.target, action: "update" };
      return { type: "menu" };
    case "menu":
    default:
      return { type: "discover-plugins" };
  }
}
//@ chunk-vrb44rx7.js:237549-237717 fingerprint = getInitialTab (0.909)
function getInitialTab(viewState) {
  if (viewState.type === "manage-plugins") return "installed";
  if (viewState.type === "stats") return "stats";
  if (viewState.type === "manage-marketplaces") return "marketplaces";
  return "discover";
}
/**
 * PluginCommand：/plugin 的根组件（解析参数后渲染 PluginSettings）。
 */
//@ chunk-vrb44rx7.js:237717-239211 layout
function PluginCommand(i) {
  let k = w(21),
    { onComplete: onComplete } = i,
    C;
  if (k[0] !== onComplete)
    ((C = (...x) => {
      let T = x;
      if (typeof T[0] === "string") T[0] = l8(T[0]);
      onComplete(...T);
    }),
      (k[0] = onComplete),
      (k[1] = C));
  else C = k[1];
  let D = C,
    U = iP(),
    x;
  if (k[2] !== i.args || k[3] !== U)
    ((x = () => {
      let L = U ? $Po(U) : null;
      if (L === null) {
        return null;
      }
      let A = parseSlashCommand(L)?.args;
      let K = parsePluginArgs(i.args);
      if (A === void 0 || !En(parsePluginArgs(A), K)) {
        return null;
      }
      let V =
        K.type === "install-from-source" && !getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_tollgate", !1);
      return { command: L, held: !isReadOnlyPluginCommand(K), installLinkOff: V };
    }),
      (k[2] = i.args),
      (k[3] = U),
      (k[4] = x));
  else x = k[4];
  let [B] = y(x),
    [_, J] = y(!1),
    pe = B?.installLinkOff
      ? "Plugin install links are turned off. To install, type /plugin install yourself."
      : B?.held === !0 && !/^[\x20-\x7e]*$/.test(B.command)
        ? "The command from the link has characters that can't be shown faithfully, so it didn't run. To run it, type it yourself."
        : null,
    fe,
    me;
  if (k[5] !== D || k[6] !== pe)
    ((fe = () => {
      if (pe !== null) D(pe);
    }),
      (me = [pe, D]),
      (k[5] = D),
      (k[6] = pe),
      (k[7] = fe),
      (k[8] = me));
  else ((fe = k[7]), (me = k[8]));
  if ((P(fe, me), pe !== null)) {
    return null;
  }
  if (B?.held && !_) {
    let ne;
    if (k[9] === MEMO_CACHE_SENTINEL) ((ne = () => J(!0)), (k[9] = ne));
    else ne = k[9];
    let he;
    if (k[10] !== D)
      ((he = () => D("Cancelled. The command from the link didn't run.")), (k[10] = D), (k[11] = he));
    else he = k[11];
    let W;
    if (k[12] !== B.command || k[13] !== he)
      ((W = e(ConfirmCommandDialog, { command: B.command, onConfirm: ne, onCancel: he })),
        (k[12] = B.command),
        (k[13] = he),
        (k[14] = W));
    else W = k[14];
    return W;
  }
  let ne;
  if (k[15] !== D || k[16] !== i) ((ne = { ...i, onComplete: D }), (k[15] = D), (k[16] = i), (k[17] = ne));
  else ne = k[17];
  const he = B !== null;
  let W;
  if (k[18] !== ne || k[19] !== he)
    ((W = e(PluginSettings, { props: ne, fromLinkPrefill: he })), (k[18] = ne), (k[19] = he), (k[20] = W));
  else W = k[20];
  return W;
}
//@ chunk-vrb44rx7.js:239211-250512 fingerprint = PluginSettings (0.63)
function PluginSettings(t0) {
  let _ = w(147),
    { props: props, fromLinkPrefill: fromLinkPrefill } = t0,
    {
      onComplete: onComplete,
      args: args,
      showMcpRedirectMessage: showMcpRedirectMessage,
      showSkillsRedirectMessage: showSkillsRedirectMessage,
      showSkillDoctorRedirectMessage: showSkillDoctorRedirectMessage,
      getSessionContext: getSessionContext,
      getSkillStatsInputs: getSkillStatsInputs,
      commands: commands,
      getReloadCacheImpactOptions: getReloadCacheImpactOptions,
      cloudSession: cloudSession,
    } = props,
    J,
    pe;
  if (_[0] !== args || _[1] !== fromLinkPrefill)
    ((J = parsePluginArgs(args)),
      (pe = getInitialViewState(J, fromLinkPrefill)),
      (_[0] = args),
      (_[1] = fromLinkPrefill),
      (_[2] = J),
      (_[3] = pe));
  else ((J = _[2]), (pe = _[3]));
  let fe = pe,
    me;
  if (_[4] !== fe || _[5] !== J.message || _[6] !== J.type)
    ((me = () => {
      let ne = new PluginDetailsStore(fe);
      if (J.type === "usage-error") ne.setResult(J.message);
      return ne;
    }),
      (_[4] = fe),
      (_[5] = J.message),
      (_[6] = J.type),
      (_[7] = me));
  else me = _[7];
  let [he] = y(me),
    { viewState: viewState, result: Oe, error: error } = useStoreSelector(he),
    { setViewState: setViewState, setResult: setResult, setError: setError } = he,
    [Se] = y($v),
    kt = R(null),
    Tt;
  if (_[8] !== getSkillStatsInputs)
    ((Tt = () => {
      if (kt.current === null) {
        if (!getSkillStatsInputs) {
          throw Error("Stats tab rendered without getSkillStatsInputs");
        }
        kt.current = logSkillDoctor(getSkillStatsInputs());
      }
      return kt.current;
    }),
      (_[8] = getSkillStatsInputs),
      (_[9] = Tt));
  else Tt = _[9];
  let Ke = Tt,
    Et;
  if (_[10] !== fe) ((Et = getInitialTab(fe)), (_[10] = fe), (_[11] = Et));
  else Et = _[11];
  let [He, ct] = y(Et),
    [Ct, oe] = y(viewState.type === "add-marketplace" ? viewState.initialValue || "" : ""),
    [ft, at] = y(0),
    [Ot, an] = y(fe.type === "add-marketplace" && !!fe.initialValue && fe.confirmAdd === void 0),
    Yt;
  if (_[12] !== setViewState)
    ((Yt = (_e) => {
      if (_e.type === "add-marketplace") {
        let qe = _e.initialValue ?? "";
        (oe(qe), at(qe.length), an(!1));
      }
      setViewState(_e);
    }),
      (_[12] = setViewState),
      (_[13] = Yt));
  else Yt = _[13];
  let vt = Yt,
    [Lt, nn] = y(!1),
    setAppState = ca(),
    ln = useActivePlugins(),
    yt = useMcpConnections(),
    { storageV5: storageV5 } = Me(),
    pluginErrorCount = useAppState(countPluginErrors),
    rn = pluginErrorCount > 0 ? `Errors (${pluginErrorCount})` : "Errors",
    mn = J.type === "marketplace" && J.action === "add" && J.target !== void 0,
    xn;
  if (_[14] !== getSkillStatsInputs)
    ((xn = getSkillStatsInputs !== void 0 && jF()), (_[14] = getSkillStatsInputs), (_[15] = xn));
  else xn = _[15];
  let Ln = xn,
    Mn = R(!1),
    fn;
  if (_[16] !== ln)
    ((fn = () => {
      ((Mn.current = !0), ln.markNeedsRefresh());
    }),
      (_[16] = ln),
      (_[17] = fn));
  else fn = _[17];
  let Be = fn,
    jt;
  if (_[18] !== getReloadCacheImpactOptions)
    ((jt = getReloadCacheImpactOptions !== void 0 && isPluginMenuCloseReloadEnabled()),
      (_[18] = getReloadCacheImpactOptions),
      (_[19] = jt));
  else jt = _[19];
  let le = jt,
    Te = R(!1),
    Ue;
  if (_[20] !== ln || _[21] !== le || _[22] !== onComplete)
    ((Ue = (tabId) => {
      if (Te.current) {
        return;
      }
      Te.current = !0;
      let Dt = le && Mn.current ? schedulePluginMenuReload(ln) : "none";
      if (Dt === "none") {
        onComplete(tabId);
        return;
      }
      onComplete(Dt === "deferred" ? _m(tabId, PLUGIN_CHANGES_DEFERRED_NOTICE) : tabId, {
        nextInput: "/reload-plugins",
        submitNextInput: !0,
      });
    }),
      (_[20] = ln),
      (_[21] = le),
      (_[22] = onComplete),
      (_[23] = Ue));
  else Ue = _[23];
  let wt = Ue,
    We = useGlobalExitKeybindings(wt),
    Ce;
  if (
    _[24] !== ln ||
    _[25] !== getReloadCacheImpactOptions ||
    _[26] !== Be ||
    _[27] !== yt ||
    _[28] !== storageV5
  )
    ((Ce = async (Ve) => {
      if (!getReloadCacheImpactOptions) {
        return (Be(), "reload-required");
      }
      return (
        (Mn.current = !0),
        activatePluginsAfterInstall(
          () => ({ ...getReloadCacheImpactOptions(), mcpClients: yt.get().clients, storageV5: storageV5 }),
          ln,
          Ve,
          storageV5,
        )
      );
    }),
      (_[24] = ln),
      (_[25] = getReloadCacheImpactOptions),
      (_[26] = Be),
      (_[27] = yt),
      (_[28] = storageV5),
      (_[29] = Ce));
  else Ce = _[29];
  let ke = Ce,
    ht;
  if (_[30] !== he)
    ((ht = (Jt) => {
      let qt = Jt;
      xt: switch ((ct(qt), he.setError(null), qt)) {
        case "discover": {
          he.setViewState({ type: "discover-plugins" });
          break xt;
        }
        case "installed": {
          he.setViewState({ type: "manage-plugins" });
          break xt;
        }
        case "marketplaces": {
          he.setViewState({ type: "manage-marketplaces" });
          break xt;
        }
        case "errors": {
          break xt;
        }
        case "stats":
      }
    }),
      (_[30] = he),
      (_[31] = ht));
  else ht = _[31];
  let _t = ht,
    Mt,
    hn;
  if (_[32] !== wt || _[33] !== Oe || _[34] !== viewState.type)
    ((Mt = () => {
      if (viewState.type === "menu" && !Oe) wt();
    }),
      (hn = [viewState.type, Oe, wt]),
      (_[32] = wt),
      (_[33] = Oe),
      (_[34] = viewState.type),
      (_[35] = Mt),
      (_[36] = hn));
  else ((Mt = _[35]), (hn = _[36]));
  P(Mt, hn);
  let Nt = R(viewState.type),
    Fn,
    sn;
  if (_[37] !== viewState.type)
    ((Fn = () => {
      if (viewState.type === Nt.current) {
        return;
      }
      Nt.current = viewState.type;
      let Rn = {
        "browse-marketplace": "discover",
        "manage-plugins": "installed",
        "manage-marketplaces": "marketplaces",
      }[viewState.type];
      if (Rn) ct(Rn);
    }),
      (sn = [viewState.type]),
      (_[37] = viewState.type),
      (_[38] = Fn),
      (_[39] = sn));
  else ((Fn = _[38]), (sn = _[39]));
  P(Fn, sn);
  let Un;
  if (_[40] !== he)
    ((Un = () => {
      (ct("marketplaces"), he.setViewState({ type: "manage-marketplaces" }), oe(""), he.setError(null));
    }),
      (_[40] = he),
      (_[41] = Un));
  else Un = _[41];
  let An = Un;
  const Bn = viewState.type === "add-marketplace" && viewState.confirmAdd === void 0;
  let Tn;
  if (_[42] !== Bn) ((Tn = { context: "Settings", isActive: Bn }), (_[42] = Bn), (_[43] = Tn));
  else Tn = _[43];
  useKeybinding("confirm:no", An, Tn);
  let ze, At;
  if (_[44] !== wt || _[45] !== Oe)
    ((ze = () => {
      if (Oe) wt(Oe);
    }),
      (At = [Oe, wt]),
      (_[44] = wt),
      (_[45] = Oe),
      (_[46] = ze),
      (_[47] = At));
  else ((ze = _[46]), (At = _[47]));
  P(ze, At);
  let de, Ge;
  if (_[48] !== onComplete || _[49] !== viewState.type)
    ((de = () => {
      if (viewState.type === "help") onComplete();
    }),
      (Ge = [viewState.type, onComplete]),
      (_[48] = onComplete),
      (_[49] = viewState.type),
      (_[50] = de),
      (_[51] = Ge));
  else ((de = _[50]), (Ge = _[51]));
  if ((P(de, Ge), viewState.type === "help")) {
    let Ne;
    if (_[52] === MEMO_CACHE_SENTINEL)
      ((Ne = r(Box, {
        flexDirection: "column",
        children: [
          e(Text, { bold: !0, children: "Plugin Command Usage:" }),
          e(Text, { children: " " }),
          e(Text, { dimColor: !0, children: "Installation:" }),
          e(Text, { children: " /plugin install - Browse and install plugins" }),
          r(Text, { children: [" ", "/plugin install <marketplace> - Install from specific marketplace"] }),
          e(Text, { children: " /plugin install <plugin> - Install specific plugin" }),
          r(Text, { children: [" ", "/plugin install <plugin>@<market> - Install plugin from marketplace"] }),
          r(Text, {
            children: [
              " ",
              "/plugin install <plugin> --marketplace <source> - Install plugin from a marketplace source, adding it first",
            ],
          }),
          e(Text, { children: " " }),
          e(Text, { dimColor: !0, children: "Management:" }),
          r(Text, { children: [" ", "/plugin list [--enabled|--disabled] - List installed plugins"] }),
          e(Text, { children: " /plugin manage - Manage installed plugins" }),
          jF() && e(Text, { children: " /plugin stats - Show skill usage and context costs" }),
          QE()
            ? r(Text, {
                children: [" ", "/plugin directory [query] - Search the Anthropic Directory in Discover"],
              })
            : null,
          e(Text, { children: " /plugin enable <plugin> - Enable a plugin" }),
          e(Text, { children: " /plugin disable <plugin> - Disable a plugin" }),
          e(Text, { children: " /plugin configure <plugin> - Set userConfig options" }),
          e(Text, { children: " /plugin uninstall <plugin> - Uninstall a plugin" }),
          e(Text, { children: " " }),
          e(Text, { dimColor: !0, children: "Marketplaces:" }),
          e(Text, { children: " /plugin marketplace - Marketplace management menu" }),
          e(Text, { children: " /plugin marketplace add - Add a marketplace" }),
          r(Text, { children: [" ", "/plugin marketplace add <path/url> - Add marketplace directly"] }),
          e(Text, { children: " /plugin marketplace update - Update marketplaces" }),
          r(Text, { children: [" ", "/plugin marketplace update <name> - Update specific marketplace"] }),
          e(Text, { children: " /plugin marketplace remove - Remove a marketplace" }),
          r(Text, { children: [" ", "/plugin marketplace remove <name> - Remove specific marketplace"] }),
          e(Text, { children: " /plugin marketplace list - List all marketplaces" }),
          e(Text, { children: " " }),
          e(Text, { dimColor: !0, children: "Validation:" }),
          r(Text, { children: [" ", "/plugin validate <path> - Validate a manifest file or directory"] }),
          r(Text, {
            children: [
              " ",
              "/plugin tag [path] [--push] [--dry-run] [-f] - Create a release tag for the plugin",
            ],
          }),
          e(Text, { children: " " }),
          e(Text, { dimColor: !0, children: "Other:" }),
          e(Text, { children: " /plugin - Main plugin menu" }),
          e(Text, { children: " /plugin help - Show this help" }),
          e(Text, { children: " /plugins - Alias for /plugin" }),
        ],
      })),
        (_[52] = Ne));
    else Ne = _[52];
    return Ne;
  }
  if (viewState.type === "validate") {
    let Ne;
    if (_[53] !== onComplete || _[54] !== viewState.path)
      ((Ne = e(ValidatePlugin, { onComplete: onComplete, path: viewState.path })),
        (_[53] = onComplete),
        (_[54] = viewState.path),
        (_[55] = Ne));
    else Ne = _[55];
    return Ne;
  }
  if (viewState.type === "npm-install") {
    let Ne;
    if (_[56] !== ke || _[57] !== onComplete || _[58] !== viewState.spec)
      ((Ne = e(PluginInstallRunner, { spec: viewState.spec, onComplete: onComplete, onInstallComplete: ke })),
        (_[56] = ke),
        (_[57] = onComplete),
        (_[58] = viewState.spec),
        (_[59] = Ne));
    else Ne = _[59];
    return Ne;
  }
  if (viewState.type === "eval") {
    let Ne;
    if (_[60] !== onComplete || _[61] !== viewState.target)
      ((Ne = e(PluginEvalRunner, { onComplete: onComplete, target: viewState.target })),
        (_[60] = onComplete),
        (_[61] = viewState.target),
        (_[62] = Ne));
    else Ne = _[62];
    return Ne;
  }
  if (viewState.type === "tag") {
    let Ne;
    if (
      _[63] !== onComplete ||
      _[64] !== viewState.dryRun ||
      _[65] !== viewState.force ||
      _[66] !== viewState.path ||
      _[67] !== viewState.push ||
      _[68] !== viewState.unknownFlag
    )
      ((Ne = e(PluginTagFlow, {
        onComplete: onComplete,
        path: viewState.path,
        push: viewState.push,
        dryRun: viewState.dryRun,
        force: viewState.force,
        unknownFlag: viewState.unknownFlag,
      })),
        (_[63] = onComplete),
        (_[64] = viewState.dryRun),
        (_[65] = viewState.force),
        (_[66] = viewState.path),
        (_[67] = viewState.push),
        (_[68] = viewState.unknownFlag),
        (_[69] = Ne));
    else Ne = _[69];
    return Ne;
  }
  if (viewState.type === "marketplace-list") {
    let Ne;
    if (_[70] !== onComplete)
      ((Ne = e(MarketplaceList, { onComplete: onComplete })), (_[70] = onComplete), (_[71] = Ne));
    else Ne = _[71];
    return Ne;
  }
  if (viewState.type === "plugin-list") {
    let Ne;
    if (_[72] !== onComplete || _[73] !== viewState.filter)
      ((Ne = e(PluginListPrinter, { onComplete: onComplete, filter: viewState.filter })),
        (_[72] = onComplete),
        (_[73] = viewState.filter),
        (_[74] = Ne));
    else Ne = _[74];
    return Ne;
  }
  if (viewState.type === "add-marketplace") {
    let Ne;
    if (
      _[75] !== Ot ||
      _[76] !== mn ||
      _[77] !== ft ||
      _[78] !== error ||
      _[79] !== Ct ||
      _[80] !== Be ||
      _[81] !== Oe ||
      _[82] !== setError ||
      _[83] !== setResult ||
      _[84] !== setViewState ||
      _[85] !== viewState.claudeAiListing ||
      _[86] !== viewState.confirmAdd
    )
      ((Ne = e(AddMarketplace, {
        inputValue: Ct,
        setInputValue: oe,
        cursorOffset: ft,
        setCursorOffset: at,
        error: error,
        setError: setError,
        result: Oe,
        setResult: setResult,
        setViewState: setViewState,
        onAddComplete: Be,
        cliMode: mn,
        autoAdd: Ot,
        claudeAiListing: viewState.claudeAiListing,
        confirmAdd: viewState.confirmAdd,
      })),
        (_[75] = Ot),
        (_[76] = mn),
        (_[77] = ft),
        (_[78] = error),
        (_[79] = Ct),
        (_[80] = Be),
        (_[81] = Oe),
        (_[82] = setError),
        (_[83] = setResult),
        (_[84] = setViewState),
        (_[85] = viewState.claudeAiListing),
        (_[86] = viewState.confirmAdd),
        (_[87] = Ne));
    else Ne = _[87];
    return Ne;
  }
  let Ne;
  if (
    _[88] !== He ||
    _[89] !== cloudSession ||
    _[90] !== showMcpRedirectMessage ||
    _[91] !== showSkillDoctorRedirectMessage ||
    _[92] !== showSkillsRedirectMessage
  )
    ((Ne = cloudSession
      ? e(CloudSessionPluginsNotice, {})
      : showMcpRedirectMessage && He === "installed"
        ? e(Cc, {})
        : showSkillsRedirectMessage && He === "installed"
          ? e(SkillsMovedNotice, {})
          : showSkillDoctorRedirectMessage && He === "stats"
            ? e(SkillDoctorMovedNotice, {})
            : void 0),
      (_[88] = He),
      (_[89] = cloudSession),
      (_[90] = showMcpRedirectMessage),
      (_[91] = showSkillDoctorRedirectMessage),
      (_[92] = showSkillsRedirectMessage),
      (_[93] = Ne));
  else Ne = _[93];
  let mt = Ne,
    en;
  if (_[94] !== setAppState || _[95] !== mt)
    ((en = setAppState.length > 0 ? r(Fragment, { children: [e(ua, { names: setAppState }), mt] }) : mt),
      (_[94] = setAppState),
      (_[95] = mt),
      (_[96] = en));
  else en = _[96];
  let Pt;
  if (
    _[97] !== ke ||
    _[98] !== getSessionContext ||
    _[99] !== Se ||
    _[100] !== he ||
    _[101] !== viewState.marketplace ||
    _[102] !== viewState.searchQuery ||
    _[103] !== viewState.targetMarketplace ||
    _[104] !== viewState.targetPlugin ||
    _[105] !== viewState.type
  )
    ((Pt = e(
      Tab,
      {
        id: "discover",
        title: "Discover",
        children:
          viewState.type === "browse-marketplace"
            ? e(BrowseMarketplace, {
                screen: he,
                onInstallComplete: ke,
                onSearchModeChange: nn,
                targetMarketplace: viewState.targetMarketplace,
                targetPlugin: viewState.targetPlugin,
              })
            : e(DiscoverPluginsScreen, {
                screen: he,
                onInstallComplete: ke,
                onSearchModeChange: nn,
                getSessionContext: getSessionContext,
                grantedSuggestions: Se,
                targetPlugin: viewState.type === "discover-plugins" ? viewState.targetPlugin : void 0,
                initialMarketplace: viewState.type === "discover-plugins" ? viewState.marketplace : void 0,
                initialSearchQuery: viewState.type === "discover-plugins" ? viewState.searchQuery : void 0,
              }),
      },
      "discover",
    )),
      (_[97] = ke),
      (_[98] = getSessionContext),
      (_[99] = Se),
      (_[100] = he),
      (_[101] = viewState.marketplace),
      (_[102] = viewState.searchQuery),
      (_[103] = viewState.targetMarketplace),
      (_[104] = viewState.targetPlugin),
      (_[105] = viewState.type),
      (_[106] = Pt));
  else Pt = _[106];
  const kn = viewState.type === "manage-plugins" ? viewState.targetPlugin : void 0,
    bn = viewState.type === "manage-plugins" ? viewState.targetMarketplace : void 0,
    Hn = viewState.type === "manage-plugins" ? viewState.action : void 0;
  let wn;
  if (
    _[107] !== le ||
    _[108] !== commands ||
    _[109] !== Be ||
    _[110] !== setResult ||
    _[111] !== setViewState ||
    _[112] !== kn ||
    _[113] !== bn ||
    _[114] !== Hn
  )
    ((wn = e(
      Tab,
      {
        id: "installed",
        title: "Installed",
        children: e(ManagePlugins, {
          setViewState: setViewState,
          setResult: setResult,
          onManageComplete: Be,
          changesApplyOnClose: le,
          onSearchModeChange: nn,
          commands: commands,
          targetPlugin: kn,
          targetMarketplace: bn,
          action: Hn,
        }),
      },
      "installed",
    )),
      (_[107] = le),
      (_[108] = commands),
      (_[109] = Be),
      (_[110] = setResult),
      (_[111] = setViewState),
      (_[112] = kn),
      (_[113] = bn),
      (_[114] = Hn),
      (_[115] = wn));
  else wn = _[115];
  const Ft = viewState.type === "manage-marketplaces" ? viewState.targetMarketplace : void 0,
    po = viewState.type === "manage-marketplaces" ? viewState.action : void 0;
  let ao;
  if (
    _[116] !== error ||
    _[117] !== We ||
    _[118] !== Be ||
    _[119] !== vt ||
    _[120] !== setError ||
    _[121] !== setResult ||
    _[122] !== Ft ||
    _[123] !== po
  )
    ((ao = e(
      Tab,
      {
        id: "marketplaces",
        title: "Marketplaces",
        children: e(ManageMarketplaces, {
          setViewState: vt,
          error: error,
          setError: setError,
          setResult: setResult,
          exitState: We,
          onManageComplete: Be,
          targetMarketplace: Ft,
          action: po,
        }),
      },
      "marketplaces",
    )),
      (_[116] = error),
      (_[117] = We),
      (_[118] = Be),
      (_[119] = vt),
      (_[120] = setError),
      (_[121] = setResult),
      (_[122] = Ft),
      (_[123] = po),
      (_[124] = ao));
  else ao = _[124];
  let Yn;
  if (_[125] !== Be || _[126] !== setViewState)
    ((Yn = e(ErrorsTabContent, { setViewState: setViewState, setActiveTab: ct, markPluginsChanged: Be })),
      (_[125] = Be),
      (_[126] = setViewState),
      (_[127] = Yn));
  else Yn = _[127];
  let _n;
  if (_[128] !== rn || _[129] !== Yn)
    ((_n = e(Tab, { id: "errors", title: rn, children: Yn }, "errors")),
      (_[128] = rn),
      (_[129] = Yn),
      (_[130] = _n));
  else _n = _[130];
  let jn;
  if (_[131] !== Ke || _[132] !== setViewState || _[133] !== Ln)
    ((jn = Ln
      ? [
          e(
            Tab,
            {
              id: "stats",
              title: "Stats",
              children: e(SkillDoctorConfirm, {
                getReport: Ke,
                onExit: () => setViewState({ type: "menu" }),
              }),
            },
            "stats",
          ),
        ]
      : []),
      (_[131] = Ke),
      (_[132] = setViewState),
      (_[133] = Ln),
      (_[134] = jn));
  else jn = _[134];
  let Ro;
  if (_[135] !== Pt || _[136] !== wn || _[137] !== ao || _[138] !== _n || _[139] !== jn)
    ((Ro = [Pt, wn, ao, _n, ...jn]),
      (_[135] = Pt),
      (_[136] = wn),
      (_[137] = ao),
      (_[138] = _n),
      (_[139] = jn),
      (_[140] = Ro));
  else Ro = _[140];
  let Si;
  if (_[141] !== He || _[142] !== Lt || _[143] !== _t || _[144] !== en || _[145] !== Ro)
    ((Si = e(Pane, {
      color: "suggestion",
      children: e(Tabs, {
        title: "Plugins",
        selectedTab: He,
        onTabChange: _t,
        color: "suggestion",
        disableNavigation: Lt,
        banner: en,
        children: Ro,
      }),
    })),
      (_[141] = He),
      (_[142] = Lt),
      (_[143] = _t),
      (_[144] = en),
      (_[145] = Ro),
      (_[146] = Si));
  else Si = _[146];
  return Si;
}
//@ chunk-vrb44rx7.js:250512-250607 affinity
function _m(...i) {
  let filtered = i.filter((k) => k !== void 0 && k !== "");
  return filtered.length > 0
    ? filtered.join(`
`)
    : void 0;
}
//@ chunk-vrb44rx7.js:250607-250777 affinity
function isReadOnlyPluginCommand(i) {
  switch (i.type) {
    case "help":
    case "list":
    case "menu":
    case "usage-error":
      return !0;
    case "marketplace":
      return i.action === void 0 || i.action === "list";
    default:
      return !1;
  }
}
//@ chunk-9h8dr0qb.js:42590-42594 placement
j();
//@ chunk-9h8dr0qb.js:42594-42598 placement
j();
//@ chunk-9h8dr0qb.js:42598-42639 fingerprint = _temp2 (0.665)
function Ou(s) {
  return s.plugins.commands;
}
//@ chunk-f3qhjfah.js:13962-14141 fingerprint = getPluginNameFromError (0.923)
function getPluginNameFromError(error) {
  if ("pluginId" in error && error.pluginId) return error.pluginId;
  if ("plugin" in error && error.plugin) return error.plugin;
  let index = error.source.lastIndexOf("@");
  if (index > 0) return error.source.slice(0, index);
  return;
}
/**
 * 判断插件错误是否只是自动更新的提示类（延后条目辅助或被策略关闭），不算真正的加载失败。
 */
//@ chunk-f3qhjfah.js:14141-14250 affinity
function isAutoupdateInfoError(e) {
  return e.type === "autoupdate-deferred-entry-helper" || e.type === "autoupdate-disabled-by-policy";
}
//@ chunk-e6aww6q8.js:4236630-4236730 fingerprint = removeExtraMarketplace (0.702)
function removeExtraMarketplace(name, sources) {
  let r = name?.extraKnownMarketplaces;
  return r !== void 0 && Object.hasOwn(r, sources) ? r[sources] : void 0;
}
//@ chunk-tyg7f3ek.js:624262-624353 fingerprint = _temp1 (0.765)
function bz(prev) {
  let n = { needsRefresh: !1 };
  return (
    prev()
      .then((r) => {
        n.needsRefresh = r;
      })
      .catch(logError),
    n
  );
}

export { bz, isAutoupdateInfoError, Ou, getPluginNameFromError, removeExtraMarketplace, PluginCommand };
