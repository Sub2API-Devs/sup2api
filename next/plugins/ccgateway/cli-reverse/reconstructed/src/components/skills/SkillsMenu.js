/**
 * components/skills/SkillsMenu.tsx
 *
 * /skills 菜单：按来源（用户/项目/插件/命令）列出技能及描述。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/skills/SkillsMenu.tsx
 * pieces: chunk-00qhwn8e.js (3), chunk-ae5g0zb5.js (1), chunk-e6aww6q8.js (1), chunk-vrb44rx7.js (1), chunk-ygke3hz8.js (1)
 * attribution: placement 2, callgraph-fingerprint 1, fingerprint 4
 */
import { CLAUDE_TEST_3 } from "../../plugins/bundled/claudeTest/commandHook.js";
import { getPluginDisplayName } from "../ManagedSettingsSecurityDialog/utils.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import {
  MAX_TITLE_COLUMN_WIDTH,
  MIN_TITLE_COLUMN_WIDTH,
  TITLE_COLUMN_RESERVED_LEFT,
  TITLE_COLUMN_RESERVED_RIGHT,
} from "../../commands/plugin/pluginUsageStats.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { plural } from "../../utils/stringUtils.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Byline } from "../design-system/Byline.js";
import { HintText } from "../design-system/HintText.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { renderSlashSkillItem } from "../ui/OrderedList.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-e6aww6q8.js:1476088-1476207 fingerprint (2.1.88 match: getSourceSubtitle, 0.733)
function getSourceSubtitle(source, skills) {
  let found = source.find((source) => source.name === skills);
  return found?.loadedFrom === "skills" || found?.loadedFrom === "commands_DEPRECATED";
}
//@ chunk-ae5g0zb5.js:106214-106307 fingerprint (2.1.88 match: _temp3, 0.607)
/**
 * 函数 hasPluginSkill（有来自该插件的技能命令）；位于「/skills 菜单：按来源（用户/项目/插件/命令）列出技能及描述」模块。
 */
function hasPluginSkill(skill_0) {
  return skill_0.some(
    (state) => state.type === "prompt" && state.pluginInfo?.pluginManifest.name === CLAUDE_TEST_3,
  );
}
//@ chunk-ygke3hz8.js:583-796 fingerprint (2.1.88 match: _temp, 0.858)
function isSkillCommand(cmd) {
  return (
    cmd.type === "prompt" &&
    cmd.hiddenBehindPlugin === undefined &&
    (cmd.loadedFrom === "skills" ||
      cmd.loadedFrom === "syncedSkills" ||
      cmd.loadedFrom === "commands_DEPRECATED" ||
      cmd.loadedFrom === "plugin" ||
      cmd.loadedFrom === "mcp")
  );
}
//@ chunk-vrb44rx7.js:141988-142243 fingerprint (2.1.88 match: getSourceTitle, 0.506)
function getSourceTitle({ items, healthByPluginName, columns }) {
  let maxWidth = 0;
  for (let item of items) {
    let title = item.type === "plugin" ? getPluginDisplayName(item) : item.name;
    let indentWidth = item.type === "mcp" && item.indented ? 2 : 0;
    let healthWidth = item.type === "plugin" && healthByPluginName?.has(item.name) ? 2 : 0;
    maxWidth = Math.max(maxWidth, bunStringWidth(title) + indentWidth + healthWidth);
  }
  return Math.min(
    maxWidth,
    MAX_TITLE_COLUMN_WIDTH,
    Math.max(MIN_TITLE_COLUMN_WIDTH, columns - TITLE_COLUMN_RESERVED_LEFT - TITLE_COLUMN_RESERVED_RIGHT),
  );
}
//@ chunk-00qhwn8e.js:17439-17489 placement
function workerSkillInventory(state) {
  return state.workerInventory?.skills;
}
//@ chunk-00qhwn8e.js:17489-17541 placement
function renderSlashSkill(skillName) {
  return jsxProd_default_2(
    Text,
    {
      children: ["/", stripInvisibleChars(skillName)],
    },
    skillName,
  );
}
//@ chunk-00qhwn8e.js:17596-19170 callgraph-fingerprint (2.1.88 match: SkillsMenu, 0.279)
/**
 * /skills：按来源分组列出技能（用户、项目、插件、旧 commands），显示描述与云会话中是否加载。
 */
function SkillsMenu_2(props) {
  let $ = useMemoCache(19);
  let { onExit } = props;
  let appState = useAppState(workerSkillInventory);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let handleExit;
  if ($[0] !== onExit) {
    handleExit = () =>
      onExit("Skills dialog dismissed", {
        display: "system",
      });
    $[0] = onExit;
    $[1] = handleExit;
  } else handleExit = $[1];
  let onCancel = handleExit;
  let subtitle;
  if ($[2] !== appState) {
    subtitle =
      appState && appState.length > 0
        ? `${appState.length} ${plural(appState.length, "skill")} loaded in the cloud session`
        : undefined;
    $[2] = appState;
    $[3] = subtitle;
  } else subtitle = $[3];
  let navigateHint;
  if ($[4] !== isScreenReaderEnabled || $[5] !== appState) {
    navigateHint =
      appState &&
      appState.length > 0 &&
      !isScreenReaderEnabled &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: ["up", "down"],
        action: "navigate",
      });
    $[4] = isScreenReaderEnabled;
    $[5] = appState;
    $[6] = navigateHint;
  } else navigateHint = $[6];
  let keyboardShortcutHintElement;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    keyboardShortcutHintElement = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "close",
    });
    $[7] = keyboardShortcutHintElement;
  } else keyboardShortcutHintElement = $[7];
  let inputGuide;
  if ($[8] !== navigateHint) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [navigateHint, keyboardShortcutHintElement],
    });
    $[8] = navigateHint;
    $[9] = inputGuide;
  } else inputGuide = $[9];
  let emptyHint;
  if ($[10] !== isScreenReaderEnabled || $[11] !== appState) {
    emptyHint =
      appState === undefined
        ? jsxProd_default(HintText, {
            hint: "It reports them at the start of each turn; /reload-skills re-scans its skill folders",
            children: "The cloud session hasn't reported which skills it loaded",
          })
        : appState.length === 0
          ? jsxProd_default(HintText, {
              hint: "Skills come from the repo's .claude/skills and the plugins the session loaded",
              children: "No skills loaded in the cloud session",
            })
          : isScreenReaderEnabled
            ? jsxProd_default(Box, {
                flexDirection: "column",
                children: appState.map(renderSlashSkill),
              })
            : jsxProd_default(OrderedListWithItem, {
                children: appState.map(renderSlashSkillItem),
              });
    $[10] = isScreenReaderEnabled;
    $[11] = appState;
    $[12] = emptyHint;
  } else emptyHint = $[12];
  let boxElement;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    boxElement = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap-trim",
        children:
          "Read-only here: the cloud session sends skill names only, and per-skill toggles are this machine's setting \u2014 /skills in a local session changes those; /reload-skills re-scans the session's skill folders.",
      }),
    });
    $[13] = boxElement;
  } else boxElement = $[13];
  let dialogElement;
  if ($[14] !== onCancel || $[15] !== subtitle || $[16] !== inputGuide || $[17] !== emptyHint) {
    dialogElement = jsxProd_default_2(Dialog, {
      title: "Skills",
      subtitle,
      onCancel,
      color: "suggestion",
      inputGuide,
      children: [emptyHint, boxElement],
    });
    $[14] = onCancel;
    $[15] = subtitle;
    $[16] = inputGuide;
    $[17] = emptyHint;
    $[18] = dialogElement;
  } else dialogElement = $[18];
  return dialogElement;
}
export { SkillsMenu_2, hasPluginSkill, getSourceTitle, getSourceSubtitle, isSkillCommand };
