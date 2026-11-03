/**
 * components/skills/SkillsMenu.tsx
 *
 * /skills 菜单：按来源（用户/项目/插件/命令）列出技能及描述。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/skills/SkillsMenu.tsx
 * pieces: chunk-00qhwn8e.js (1), chunk-ae5g0zb5.js (1), chunk-e6aww6q8.js (1), chunk-vrb44rx7.js (1), chunk-ygke3hz8.js (1)
 * attribution: callgraph-fingerprint 1, fingerprint 4
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { is, ns } from "./_new/SkillsMenu.helpers-00qh.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { plural } from "../../utils/stringUtils.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Byline } from "../design-system/Byline.js";
import { HintText } from "../design-system/HintText.js";
import { Box, Text } from "../../ink/components/Text.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { ls } from "../ui/OrderedList.js";
import { Dialog } from "../design-system/Dialog.js";
import { CLAUDE_TEST_3 } from "../../plugins/bundled/claudeTest/commandHook.js";
import { getPluginDisplayName } from "../ManagedSettingsSecurityDialog/utils.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { Iy, Py, xy, Ry } from "../../commands/plugin/pluginUsageStats.js";

/**
 * /skills：按来源分组列出技能（用户、项目、插件、旧 commands），显示描述与云会话中是否加载。
 */
//@ chunk-00qhwn8e.js:17596-19170 callgraph-fingerprint = SkillsMenu (0.279)
function SkillsMenu_2(t0) {
  let $ = w(19),
    { onExit: onExit } = t0,
    i = useAppState(is),
    p = useIsScreenReaderEnabled(),
    k;
  if ($[0] !== onExit)
    ((k = () => onExit("Skills dialog dismissed", { display: "system" })), ($[0] = onExit), ($[1] = k));
  else k = $[1];
  let ve = k,
    t;
  if ($[2] !== i)
    ((t =
      i && i.length > 0 ? `${i.length} ${plural(i.length, "skill")} loaded in the cloud session` : void 0),
      ($[2] = i),
      ($[3] = t));
  else t = $[3];
  let J;
  if ($[4] !== p || $[5] !== i)
    ((J = i && i.length > 0 && !p && e(KeyboardShortcutHint, { chord: ["up", "down"], action: "navigate" })),
      ($[4] = p),
      ($[5] = i),
      ($[6] = J));
  else J = $[6];
  let o;
  if ($[7] === MEMO_CACHE_SENTINEL)
    ((o = e(KeyboardShortcutHint, { chord: "escape", action: "close" })), ($[7] = o));
  else o = $[7];
  let X;
  if ($[8] !== J) ((X = r(Byline, { children: [J, o] })), ($[8] = J), ($[9] = X));
  else X = $[9];
  let u;
  if ($[10] !== p || $[11] !== i)
    ((u =
      i === void 0
        ? e(HintText, {
            hint: "It reports them at the start of each turn; /reload-skills re-scans its skill folders",
            children: "The cloud session hasn't reported which skills it loaded",
          })
        : i.length === 0
          ? e(HintText, {
              hint: "Skills come from the repo's .claude/skills and the plugins the session loaded",
              children: "No skills loaded in the cloud session",
            })
          : p
            ? e(Box, { flexDirection: "column", children: i.map(ns) })
            : e(OrderedListWithItem, { children: i.map(ls) })),
      ($[10] = p),
      ($[11] = i),
      ($[12] = u));
  else u = $[12];
  let Ce;
  if ($[13] === MEMO_CACHE_SENTINEL)
    ((Ce = e(Box, {
      children: e(Text, {
        dimColor: !0,
        wrap: "wrap-trim",
        children:
          "Read-only here: the cloud session sends skill names only, and per-skill toggles are this machine's setting \u2014 /skills in a local session changes those; /reload-skills re-scans the session's skill folders.",
      }),
    })),
      ($[13] = Ce));
  else Ce = $[13];
  let ze;
  if ($[14] !== ve || $[15] !== t || $[16] !== X || $[17] !== u)
    ((ze = r(Dialog, {
      title: "Skills",
      subtitle: t,
      onCancel: ve,
      color: "suggestion",
      inputGuide: X,
      children: [u, Ce],
    })),
      ($[14] = ve),
      ($[15] = t),
      ($[16] = X),
      ($[17] = u),
      ($[18] = ze));
  else ze = $[18];
  return ze;
}
//@ chunk-ae5g0zb5.js:106214-106307 fingerprint = _temp3 (0.607)
function Xt(skill_0) {
  return skill_0.some((n) => n.type === "prompt" && n.pluginInfo?.pluginManifest.name === CLAUDE_TEST_3);
}
//@ chunk-e6aww6q8.js:1476088-1476207 fingerprint = getSourceSubtitle (0.733)
function getSourceSubtitle(source, skills) {
  let found = source.find((s) => s.name === skills);
  return found?.loadedFrom === "skills" || found?.loadedFrom === "commands_DEPRECATED";
}
//@ chunk-vrb44rx7.js:141988-142243 fingerprint = getSourceTitle (0.506)
function getSourceTitle({ items: items, healthByPluginName: healthByPluginName, columns: columns }) {
  let C = 0;
  for (let x of items) {
    let T = x.type === "plugin" ? getPluginDisplayName(x) : x.name,
      D = x.type === "mcp" && x.indented ? 2 : 0,
      U = x.type === "plugin" && healthByPluginName?.has(x.name) ? 2 : 0;
    C = Math.max(C, bunStringWidth(T) + D + U);
  }
  return Math.min(C, Iy, Math.max(Py, columns - xy - Ry));
}
//@ chunk-ygke3hz8.js:583-796 fingerprint = _temp (0.858)
function isSkillCommand(cmd) {
  return (
    cmd.type === "prompt" &&
    cmd.hiddenBehindPlugin === void 0 &&
    (cmd.loadedFrom === "skills" ||
      cmd.loadedFrom === "syncedSkills" ||
      cmd.loadedFrom === "commands_DEPRECATED" ||
      cmd.loadedFrom === "plugin" ||
      cmd.loadedFrom === "mcp")
  );
}

export { SkillsMenu_2, Xt, getSourceTitle, getSourceSubtitle, isSkillCommand };
