/**
 * commands/plugin/SkillDoctor.tsx
 *
 * 2.1.316 新增：技能体检（cli_skill_doctor）：本会话加载的技能、最近未使用的插件、技能用量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vrb44rx7.js (16)
 * attribution: placement 16
 */
import {
  loadInstalledPlugins,
  PF,
  hasInstallationForCurrentProject,
} from "../../utils/plugins/installedPluginsManager.js";
import { findPluginName, pluginNamesEqual } from "../../utils/plugins/pluginIdentifier.js";
import { getPluginEditableScopes } from "../../utils/plugins/pluginStartupCheck.js";
import { INLINE_PLUGIN_MARKETPLACE, SKILLS_DIR, SYNCED } from "../../utils/telemetry/pluginTelemetry.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getMainQueryRunning } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { j, y, fo, Qr } from "../../../vendor/react/cjs/react.production.js";
import { printablePluginName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  runSkillDoctor,
  SkillDoctorStageError,
  formatSkillUsageTable,
  padEndToWidth,
  padStartToWidth,
} from "../skill-doctor/skillDoctor.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { han } from "../../services/usageInsights/transcriptScan.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { uniq } from "../../utils/collections.js";
import { plural } from "../../utils/stringUtils.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";

/**
 * 插件在当前项目没有安装记录、也不在任何可编辑设置范围里时返回 [插件名]，否则返回空数组（安装表读不到也返回空）。
 */
//@ chunk-vrb44rx7.js:204871-205045 placement
async function listUnscopedPluginForProject(i, h) {
  let k = await loadInstalledPlugins(h);
  if (PF(k)) return [];
  let plugins = k.plugins,
    x = findPluginName(Object.keys(plugins), i) ?? i,
    T = hasInstallationForCurrentProject(plugins[x] ?? []),
    any = [...getPluginEditableScopes().keys()].some((U) => pluginNamesEqual(U, i));
  return T || any ? [] : [i];
}
//@ chunk-vrb44rx7.js:205045-205507 placement
function formatCopyNotLoaded(i) {
  switch (i) {
    case INLINE_PLUGIN_MARKETPLACE:
      return "This --plugin-dir copy did not load (see above); nothing is running from it. Fix or drop the directory; edits take effect after /reload-plugins.";
    case SKILLS_DIR:
      return "This skills-directory copy did not load (see above) \u2014 fix, delete or rename the directory; edits take effect after /reload-plugins.";
    case SYNCED:
      return "This claude.ai copy did not load (see above) \u2014 remove or rename the plugin on claude.ai to clear it.";
  }
}
/**
 * 插件菜单关闭时的提示文案、默认开关值，以及读取 tengu_plugin_menu_close_reload 开关的函数（关闭插件菜单时是否自动排队 /reload-plugins）。
 */
//@ chunk-vrb44rx7.js:205507-205653 placement
var PLUGIN_CHANGES_DEFERRED_NOTICE =
    "Plugin changes apply when the current response finishes (/reload-plugins is queued).",
  CLOSE_RELOAD_DEFAULT = !0,
  isPluginMenuCloseReloadEnabled = () =>
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugin_menu_close_reload", CLOSE_RELOAD_DEFAULT);
/**
 * 插件状态需要刷新时决定 reload 方式：主查询运行中为 deferred、否则 queued，并打点；不需要刷新返回 none。
 */
//@ chunk-vrb44rx7.js:205653-205830 placement
function schedulePluginMenuReload(i, h = getMainQueryRunning) {
  if (!i.get().needsRefresh) return "none";
  let k = h() ? "deferred" : "queued";
  return (
    logEvent("tengu_plugin_menu_auto_reload", { outcome: fromEnum(k) }),
    logFeatureOk("plugin_menu_auto_reload"),
    k
  );
}
//@ chunk-vrb44rx7.js:205830-205834 placement
j();
//@ chunk-vrb44rx7.js:205834-205902 placement
function fk(W) {
  return W.pluginKey === void 0 ? W.source : printablePluginName(W.pluginKey);
}
//@ chunk-vrb44rx7.js:205902-205941 placement
function hk(Oe) {
  return Oe.usageCount > 0;
}
//@ chunk-vrb44rx7.js:205941-206113 placement
function formatLastUsed(L) {
  return r(
    Text,
    {
      children: [
        "  ",
        e(Text, { color: "warning", children: printablePluginName(L.name) }),
        e(Text, { dimColor: !0, children: `  last used ${L.daysSinceLastUse} days ago` }),
      ],
    },
    L.pluginId,
  );
}
//@ chunk-vrb44rx7.js:206113-206487 placement
function logSkillDoctor(i) {
  return runSkillDoctor(i).then(
    (h) => {
      if (h.rows.length === 0) logFeatureSad("cli_skill_doctor", "no_user_skills");
      else if (h.weekTokensNote !== null) logFeatureSad("cli_skill_doctor", "scan_policy_denied");
      else logFeatureOk("cli_skill_doctor");
      return { ok: !0, report: h };
    },
    (h) => {
      let k = h instanceof SkillDoctorStageError ? h.cause : h;
      return (
        logError(k),
        logFeatureBad(
          "cli_skill_doctor",
          h instanceof SkillDoctorStageError ? h.featureErrorCode : "render_failed",
        ),
        { ok: !1, message: errorMessage(k) }
      );
    },
  );
}
//@ chunk-vrb44rx7.js:206487-207190 placement
function SkillDoctorConfirm(i) {
  let C = w(11),
    { getReport: getReport, onExit: onExit } = i,
    x;
  if (C[0] !== getReport) ((x = () => getReport()), (C[0] = getReport), (C[1] = x));
  else x = C[1];
  let [T] = y(x),
    [D] = y(han),
    U;
  if (C[2] === MEMO_CACHE_SENTINEL) ((U = { context: "Confirmation" }), (C[2] = U));
  else U = C[2];
  useKeybinding("confirm:no", onExit, U);
  let L;
  if (C[3] === MEMO_CACHE_SENTINEL)
    ((L = e(Text, { bold: !0, children: "Skills loaded this session" })), (C[3] = L));
  else L = C[3];
  const A = D.allowed ? "Scanning local sessions\u2026" : "Computing skill usage\u2026";
  let K;
  if (C[4] !== A)
    ((K = r(Box, {
      flexDirection: "column",
      children: [L, e(Box, { marginTop: 1, children: e(Text, { dimColor: !0, children: A }) })],
    })),
      (C[4] = A),
      (C[5] = K));
  else K = C[5];
  let V = K,
    B;
  if (C[6] !== T) ((B = e(SkillUsageView, { reportPromise: T })), (C[6] = T), (C[7] = B));
  else B = C[7];
  let _;
  if (C[8] !== V || C[9] !== B)
    ((_ = e(fo, { fallback: V, children: B })), (C[8] = V), (C[9] = B), (C[10] = _));
  else _ = C[10];
  return _;
}
/**
 * 计算并展示技能用量（扫描本地会话），失败时提示 --debug。
 */
//@ chunk-vrb44rx7.js:207190-208911 placement
function SkillUsageView(i) {
  let C = w(22),
    { reportPromise: reportPromise } = i,
    k = Qr(reportPromise);
  if (!k.ok) {
    let x;
    if (C[0] !== k.message)
      ((x = r(Text, {
        dimColor: !0,
        wrap: "wrap",
        children: ["Couldn't compute skill usage. Run with --debug for details. (", k.message, ")"],
      })),
        (C[0] = k.message),
        (C[1] = x));
    else x = C[1];
    return x;
  }
  let {
      rows: rows,
      unusedOwned: unusedOwned,
      unusedFromPlugins: unusedFromPlugins,
      unusedFromMcp: unusedFromMcp,
      unusedSynced: unusedSynced,
      unusedMcpServers: unusedMcpServers,
      disusedPlugins: disusedPlugins,
      weekTokensNote: weekTokensNote,
    } = k.report,
    x;
  if (C[2] === MEMO_CACHE_SENTINEL)
    ((x = e(Text, { bold: !0, children: "Skills loaded this session" })), (C[2] = x));
  else x = C[2];
  let _;
  if (C[3] !== rows)
    ((_ = e(Box, { flexDirection: "column", marginTop: 1, children: e(renderLoadedSkills, { rows: rows }) })),
      (C[3] = rows),
      (C[4] = _));
  else _ = C[4];
  let J;
  if (C[5] !== rows.length || C[6] !== weekTokensNote)
    ((J =
      rows.length > 0 &&
      r(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          r(Text, {
            dimColor: !0,
            wrap: "wrap",
            children: [
              "  ",
              "context = this skill's one-line listing in the system prompt, included every turn",
            ],
          }),
          r(Text, {
            dimColor: !0,
            wrap: "wrap",
            children: [
              "  ",
              "(dash = not in the current listing, costs nothing; full SKILL.md loads only when it runs)",
            ],
          }),
          weekTokensNote === null
            ? r(Text, {
                dimColor: !0,
                wrap: "wrap",
                children: [
                  "  ",
                  "7d tokens = tokens attributed to the skill over the last 7 days of sessions on this machine",
                ],
              })
            : r(Text, { dimColor: !0, wrap: "wrap", children: ["  ", "7d tokens: ", weekTokensNote] }),
        ],
      })),
      (C[5] = rows.length),
      (C[6] = weekTokensNote),
      (C[7] = J));
  else J = C[7];
  let pe;
  if (
    C[8] !== rows ||
    C[9] !== unusedFromMcp ||
    C[10] !== unusedFromPlugins ||
    C[11] !== unusedMcpServers ||
    C[12] !== unusedOwned ||
    C[13] !== unusedSynced
  )
    ((pe = e(renderSkillRows, {
      rows: rows,
      unusedOwned: unusedOwned,
      unusedSynced: unusedSynced,
      unusedFromPlugins: unusedFromPlugins,
      unusedFromMcp: unusedFromMcp,
      unusedMcpServers: unusedMcpServers,
    })),
      (C[8] = rows),
      (C[9] = unusedFromMcp),
      (C[10] = unusedFromPlugins),
      (C[11] = unusedMcpServers),
      (C[12] = unusedOwned),
      (C[13] = unusedSynced),
      (C[14] = pe));
  else pe = C[14];
  let fe;
  if (C[15] !== disusedPlugins)
    ((fe = e(renderUnusedPlugins, { disusedPlugins: disusedPlugins })),
      (C[15] = disusedPlugins),
      (C[16] = fe));
  else fe = C[16];
  let me;
  if (C[17] !== _ || C[18] !== J || C[19] !== pe || C[20] !== fe)
    ((me = r(Box, { flexDirection: "column", children: [x, _, J, pe, fe] })),
      (C[17] = _),
      (C[18] = J),
      (C[19] = pe),
      (C[20] = fe),
      (C[21] = me));
  else me = C[21];
  return me;
}
//@ chunk-vrb44rx7.js:208911-209821 placement
function renderLoadedSkills(i) {
  let k = w(7),
    { rows: rows } = i;
  if (rows.length === 0) {
    let C;
    if (k[0] === MEMO_CACHE_SENTINEL)
      ((C = e(Text, { dimColor: !0, children: "  (no skills loaded)" })), (k[0] = C));
    else C = k[0];
    return C;
  }
  let C;
  if (k[1] !== rows) {
    let { cells: cells, widths: widths } = formatSkillUsageTable(rows);
    const D = padEndToWidth("skill", widths.name);
    const U = padEndToWidth("source", widths.source);
    const L = padStartToWidth("context", widths.context);
    const A = padStartToWidth("7d tokens", widths.week);
    const K = widths.uses + 1;
    let V;
    if (k[3] !== K) ((V = padStartToWidth("uses", K)), (k[3] = K), (k[4] = V));
    else V = k[4];
    const B = `  ${D}  ${U}  ${L}  ${A}  ${V}  last used`;
    let _;
    if (k[5] !== B) ((_ = e(Text, { dimColor: !0, children: B })), (k[5] = B), (k[6] = _));
    else _ = k[6];
    C = r(Box, {
      flexDirection: "column",
      children: [
        _,
        rows.map((J, pe) => {
          let fe = cells[pe];
          return r(
            Text,
            {
              color: J.usageCount === 0 ? "warning" : void 0,
              children: [
                `  ${padEndToWidth(J.name, widths.name)}  `,
                e(Text, { dimColor: !0, children: padEndToWidth(J.source, widths.source) }),
                `  ${padStartToWidth(fe.context, widths.context)}  ${padStartToWidth(fe.week, widths.week)}  ${padStartToWidth(String(J.usageCount), widths.uses)}\xD7  ${fe.lastUsed}`,
              ],
            },
            `${pe}:${J.name}`,
          );
        }),
      ],
    });
    ((k[1] = rows), (k[2] = C));
  } else C = k[2];
  return C;
}
/**
 * 渲染技能用量表（来源、调用次数、最近使用、警告）。
 */
//@ chunk-vrb44rx7.js:209821-212188 placement
function renderSkillRows(i) {
  let U = w(33),
    {
      rows: rows,
      unusedOwned: unusedOwned,
      unusedFromPlugins: unusedFromPlugins,
      unusedFromMcp: unusedFromMcp,
      unusedSynced: unusedSynced,
      unusedMcpServers: unusedMcpServers,
    } = i;
  if (rows.length === 0) {
    return null;
  }
  let L, A, K, V, B, _, J, pe;
  if (
    U[0] !== unusedFromPlugins ||
    U[1] !== unusedMcpServers ||
    U[2] !== unusedOwned.length ||
    U[3] !== unusedSynced.length
  ) {
    let fe = uniq(unusedFromPlugins.map(fk));
    let me;
    if (U[12] !== unusedMcpServers)
      ((me = unusedMcpServers.length > 0 ? `, from ${unusedMcpServers.join(", ")}` : ""),
        (U[12] = unusedMcpServers),
        (U[13] = me));
    else me = U[13];
    A = me;
    K = unusedMcpServers.length <= 1;
    L = Box;
    V = "column";
    B = 1;
    if (U[14] !== unusedOwned.length)
      ((_ =
        unusedOwned.length > 0 &&
        e(Text, {
          color: "warning",
          wrap: "wrap",
          children: `${unusedOwned.length} ${plural(unusedOwned.length, "skill")} loaded but never invoked. Each one adds to the system prompt every turn. Disable in /skills, or remove from .claude/skills.`,
        })),
        (U[14] = unusedOwned.length),
        (U[15] = _));
    else _ = U[15];
    if (U[16] !== unusedSynced.length)
      ((J =
        unusedSynced.length > 0 &&
        e(Text, {
          color: "warning",
          wrap: "wrap",
          children: `${unusedSynced.length} ${plural(unusedSynced.length, "skill")} synced from claude.ai loaded but never invoked. Each one adds to the system prompt every turn. Disable in /skills, or turn ${unusedSynced.length === 1 ? "it" : "them"} off on claude.ai \u2014 a deleted synced copy is re-downloaded on the next sync.`,
        })),
        (U[16] = unusedSynced.length),
        (U[17] = J));
    else J = U[17];
    pe =
      unusedFromPlugins.length > 0 &&
      e(Text, {
        color: "warning",
        wrap: "wrap",
        children: `${unusedFromPlugins.length} plugin ${plural(unusedFromPlugins.length, "skill")} loaded but never invoked, from ${fe.join(", ")}. Each one adds to the system prompt every turn. Plugin skills can't be turned off individually \u2014 disable ${fe.length === 1 ? "the plugin" : "those plugins"} in the Installed tab.`,
      });
    ((U[0] = unusedFromPlugins),
      (U[1] = unusedMcpServers),
      (U[2] = unusedOwned.length),
      (U[3] = unusedSynced.length),
      (U[4] = L),
      (U[5] = A),
      (U[6] = K),
      (U[7] = V),
      (U[8] = B),
      (U[9] = _),
      (U[10] = J),
      (U[11] = pe));
  } else ((L = U[4]), (A = U[5]), (K = U[6]), (V = U[7]), (B = U[8]), (_ = U[9]), (J = U[10]), (pe = U[11]));
  let me;
  if (U[18] !== A || U[19] !== K || U[20] !== unusedFromMcp.length)
    ((me =
      unusedFromMcp.length > 0 &&
      e(Text, {
        color: "warning",
        wrap: "wrap",
        children: `${unusedFromMcp.length} MCP ${plural(unusedFromMcp.length, "skill")} loaded but never invoked${A}. Each one adds to the system prompt every turn. MCP skills live on the server, not on disk \u2014 turning ${K ? "that server" : "those servers"} off in /mcp also removes ${K ? "its" : "their"} tools.`,
      })),
      (U[18] = A),
      (U[19] = K),
      (U[20] = unusedFromMcp.length),
      (U[21] = me));
  else me = U[21];
  let ne;
  if (U[22] !== rows)
    ((ne =
      rows.every(hk) &&
      e(Text, { color: "success", children: "All loaded skills have been used at least once." })),
      (U[22] = rows),
      (U[23] = ne));
  else ne = U[23];
  let he;
  if (
    U[24] !== L ||
    U[25] !== V ||
    U[26] !== B ||
    U[27] !== _ ||
    U[28] !== J ||
    U[29] !== pe ||
    U[30] !== me ||
    U[31] !== ne
  )
    ((he = r(L, { flexDirection: V, marginTop: B, children: [_, J, pe, me, ne] })),
      (U[24] = L),
      (U[25] = V),
      (U[26] = B),
      (U[27] = _),
      (U[28] = J),
      (U[29] = pe),
      (U[30] = me),
      (U[31] = ne),
      (U[32] = he));
  else he = U[32];
  return he;
}
//@ chunk-vrb44rx7.js:212188-212762 placement
function renderUnusedPlugins(i) {
  let k = w(8),
    { disusedPlugins: disusedPlugins } = i;
  if (disusedPlugins.length === 0) {
    return null;
  }
  let C;
  if (k[0] === MEMO_CACHE_SENTINEL)
    ((C = e(Text, { bold: !0, children: "Plugins not used recently" })), (k[0] = C));
  else C = k[0];
  let x;
  if (k[1] !== disusedPlugins)
    ((x = disusedPlugins.map(formatLastUsed)), (k[1] = disusedPlugins), (k[2] = x));
  else x = k[2];
  let T;
  if (k[3] !== x)
    ((T = e(Box, { flexDirection: "column", marginTop: 1, children: x })), (k[3] = x), (k[4] = T));
  else T = k[4];
  let D;
  if (k[5] === MEMO_CACHE_SENTINEL)
    ((D = e(Box, {
      marginTop: 1,
      children: r(Text, { dimColor: !0, children: ["  ", "Manage these in the Installed tab"] }),
    })),
      (k[5] = D));
  else D = k[5];
  let U;
  if (k[6] !== T)
    ((U = r(Box, { flexDirection: "column", marginTop: 1, children: [C, T, D] })), (k[6] = T), (k[7] = U));
  else U = k[7];
  return U;
}
//@ chunk-vrb44rx7.js:212762-212766 placement
j();
//@ chunk-vrb44rx7.js:212766-212810 placement
function wk(me) {
  return `${re.warning} ${me}`;
}

export {
  listUnscopedPluginForProject,
  formatCopyNotLoaded,
  logSkillDoctor,
  isPluginMenuCloseReloadEnabled,
  schedulePluginMenuReload,
  PLUGIN_CHANGES_DEFERRED_NOTICE,
  SkillDoctorConfirm,
  wk,
};
