/**
 * components/permissions/rules/CloudSessionRulesTab.tsx
 *
 * 权限规则界面中的云会话规则页（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p2qwpk2k.js (8)
 * attribution: placement 8
 */
import {
  init_react_production,
  suspenseTypeExport,
  use,
} from "../../../../vendor/react/cjs/react.production.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { array, stringSchema, objectSchema, unknown } from "../../../../vendor/zod/v4/classic/schemas.js";
import { stripInvisibleChars } from "../../../utils/invisibleChars.js";
import { parseThinClientReply } from "../../../cli/thinClient.js";
import { SETTING_SOURCES, getSettingSourceName } from "../../../utils/settings/constants.js";
import { truncateToLength, plural } from "../../../utils/stringUtils.js";
import { errorMessage } from "../../../utils/errors.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { useKeybinding, useGlobalExitKeybindings } from "../../../keybindings/useKeybinding.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Tab, Tabs } from "../../design-system/Tabs.js";
import { WorkerBadge } from "../WorkerBadge.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { Byline } from "../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { Pane } from "../../design-system/Pane.js";
import { Commands } from "../../HelpV2/Commands.js";

//@ chunk-p2qwpk2k.js:16014-16018 placement
init_react_production();
//@ chunk-p2qwpk2k.js:16018-16104 placement
function toRuleOption(entry, index) {
  let { rule, source } = entry;
  return {
    value: String(index),
    label: rule,
    description: source,
  };
}
//@ chunk-p2qwpk2k.js:16104-16119 placement
function noopRulePicker() {}
//@ chunk-p2qwpk2k.js:16119-16675 placement
/**
 * 云会话规则页的分节（allow/ask/deny/工作目录）、规则读取响应的宽松 zod 结构、需要去掉的零宽字符。
 */
var CLOUD_RULE_SECTIONS = [
  {
    kind: "allow",
    title: "Allow",
    empty: "No allow rules",
  },
  {
    kind: "ask",
    title: "Ask",
    empty: "No ask rules",
  },
  {
    kind: "deny",
    title: "Deny",
    empty: "No deny rules",
  },
  {
    kind: "additionalDirectories",
    title: "Workspace",
    empty: "No additional working directories",
  },
];
var cloudSessionRulesResponseSchema = DoctorLazy(() => {
  let ruleListSchema = array(stringSchema()).catch([]);
  let permissionsSchema = objectSchema({
    source: stringSchema(),
    settings: objectSchema({
      permissions: objectSchema({
        allow: ruleListSchema,
        ask: ruleListSchema,
        deny: ruleListSchema,
        additionalDirectories: ruleListSchema,
      })
        .optional()
        .catch(undefined),
    }).catch({
      permissions: undefined,
    }),
  });
  return objectSchema({
    sources: array(permissionsSchema.nullable().catch(null)),
    errors: array(unknown()).optional().catch(undefined),
  });
});
var ZERO_WIDTH_CHARS_RE = /[\u200b\u200e\u200f\u2060\ufeff]/g;
//@ chunk-p2qwpk2k.js:16675-16724 placement
function replaceControlChars(text) {
  return stripInvisibleChars(text.replace(ZERO_WIDTH_CHARS_RE, "\uFFFD"));
}
//@ chunk-p2qwpk2k.js:16724-17347 placement
/**
 * 通过 get_settings 读取云会话权限规则，版本不兼容时标记不可读
 */
async function readCloudSessionRules(remoteCaps, signal) {
  try {
    let thinClientReply = parseThinClientReply(
      "get_settings",
      cloudSessionRulesResponseSchema(),
      await remoteCaps.sendControlRequest(
        {
          subtype: "get_settings",
        },
        {
          signal,
        },
      ),
    );
    if (!thinClientReply)
      return {
        kind: "unreadable",
        reason: "the cloud session sent a reply this version can't display",
      };
    let bySection = {
      allow: [],
      ask: [],
      deny: [],
      additionalDirectories: [],
    };
    for (let source of thinClientReply.sources) {
      if (source === null) continue;
      let { source: source_2, settings } = source;
      let found = SETTING_SOURCES.find((matchedSource) => matchedSource === source_2);
      let source_3 = found
        ? getSettingSourceName(found)
        : replaceControlChars(truncateToLength(source_2, 40)) + (source_2.length > 40 ? "\u2026" : "");
      for (let { kind } of CLOUD_RULE_SECTIONS)
        for (let ruleText of settings.permissions?.[kind] ?? [])
          bySection[kind].push({
            rule: replaceControlChars(ruleText),
            source: source_3,
          });
    }
    return {
      kind: "read",
      rules: bySection,
      skippedFiles: thinClientReply.errors?.length ?? 0,
    };
  } catch (error) {
    return {
      kind: "unreadable",
      reason: stripInvisibleChars(errorMessage(error)),
    };
  }
}
//@ chunk-p2qwpk2k.js:17347-18952 placement
function CloudSessionRulesTab(props) {
  let $ = useMemoCache(19);
  let { onExit, rulesRead } = props;
  let handleExit;
  if ($[0] !== onExit) {
    handleExit = () => onExit();
    $[0] = onExit;
    $[1] = handleExit;
  } else handleExit = $[1];
  let exitHint;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    exitHint = {
      context: "Settings",
    };
    $[2] = exitHint;
  } else exitHint = $[2];
  useKeybinding("confirm:no", handleExit, exitHint);
  let dialogElement;
  if ($[3] !== onExit) {
    dialogElement = () => onExit();
    $[3] = onExit;
    $[4] = dialogElement;
  } else dialogElement = $[4];
  let globalExitKeybindings = useGlobalExitKeybindings(dialogElement);
  let children;
  if ($[5] !== onExit || $[6] !== rulesRead) {
    children = CLOUD_RULE_SECTIONS.map((section) => {
      let { kind, title, empty } = section;
      return jsxProd_default(
        Tab,
        {
          id: kind,
          title,
          children: jsxProd_default(suspenseTypeExport, {
            fallback: jsxProd_default(WorkerBadge, {
              message: "Reading the cloud session's rules\u2026",
            }),
            children: jsxProd_default(CloudRulesSection, {
              rulesRead,
              kind,
              empty,
              onExit,
            }),
          }),
        },
        kind,
      );
    });
    $[5] = onExit;
    $[6] = rulesRead;
    $[7] = children;
  } else children = $[7];
  let tabsElement;
  if ($[8] !== children) {
    tabsElement = jsxProd_default(Tabs, {
      title: "Permissions",
      color: "permission",
      navFromContent: true,
      children,
    });
    $[8] = children;
    $[9] = tabsElement;
  } else tabsElement = $[9];
  let textElement;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    textElement = jsxProd_default(Text, {
      dimColor: true,
      wrap: "wrap-trim",
      children:
        "Read-only here: these are the cloud session's rules, from its settings files (rules it added for itself this session aren't listed). To change them, ask Claude to edit .claude/settings.json in the session. Commands Claude runs on this computer follow this computer's rules \u2014 /permissions in a local session edits those.",
    });
    $[10] = textElement;
  } else textElement = $[10];
  let children_2;
  if ($[11] !== globalExitKeybindings.keyName || $[12] !== globalExitKeybindings.pending) {
    children_2 = globalExitKeybindings.pending
      ? `Press ${globalExitKeybindings.keyName} again to close`
      : jsxProd_default_2(Byline, {
          children: [
            jsxProd_default(KeyboardShortcutHint, {
              chord: ["up", "down"],
              action: "navigate",
            }),
            jsxProd_default(KeyboardShortcutHint, {
              chord: ["left", "right"],
              action: "switch",
            }),
            jsxProd_default(KeyboardShortcutHint, {
              chord: "escape",
              action: "close",
            }),
          ],
        });
    $[11] = globalExitKeybindings.keyName;
    $[12] = globalExitKeybindings.pending;
    $[13] = children_2;
  } else children_2 = $[13];
  let boxElement;
  if ($[14] !== children_2) {
    boxElement = jsxProd_default_2(Box, {
      marginTop: 1,
      flexDirection: "column",
      children: [
        textElement,
        jsxProd_default(Text, {
          dimColor: true,
          children: children_2,
        }),
      ],
    });
    $[14] = children_2;
    $[15] = boxElement;
  } else boxElement = $[15];
  let paneElement;
  if ($[16] !== tabsElement || $[17] !== boxElement) {
    paneElement = jsxProd_default_2(Pane, {
      color: "permission",
      children: [tabsElement, boxElement],
    });
    $[16] = tabsElement;
    $[17] = boxElement;
    $[18] = paneElement;
  } else paneElement = $[18];
  return paneElement;
}
//@ chunk-p2qwpk2k.js:18952-19779 placement
/**
 * 显示云会话某类规则：读取失败显示原因，部分设置文件解析失败时警告，空时显示空提示。
 */
function CloudRulesSection(props) {
  let $ = useMemoCache(11);
  let { rulesRead, kind, empty, onExit } = props;
  let rulesResult = use(rulesRead);
  if (rulesResult.kind === "unreadable") {
    let textElement;
    if ($[0] !== rulesResult.reason) {
      textElement = jsxProd_default_2(Text, {
        color: "error",
        children: ["Couldn't read the cloud session's rules: ", rulesResult.reason],
      });
      $[0] = rulesResult.reason;
      $[1] = textElement;
    } else textElement = $[1];
    return textElement;
  }
  let errorElement = rulesResult.rules[kind];
  let rows;
  if ($[2] !== rulesResult.skippedFiles) {
    rows =
      rulesResult.skippedFiles > 0 &&
      jsxProd_default_2(Text, {
        color: "warning",
        wrap: "wrap-trim",
        children: [
          rulesResult.skippedFiles,
          " settings ",
          plural(rulesResult.skippedFiles, "file"),
          " in the session failed to parse; rules from",
          " ",
          plural(rulesResult.skippedFiles, "it", "them"),
          " aren't listed.",
        ],
      });
    $[2] = rulesResult.skippedFiles;
    $[3] = rows;
  } else rows = $[3];
  let contentElement;
  if ($[4] !== empty || $[5] !== onExit || $[6] !== errorElement) {
    contentElement =
      errorElement.length === 0
        ? jsxProd_default(Text, {
            dimColor: true,
            children: empty,
          })
        : jsxProd_default(Commands, {
            rules: errorElement,
            onExit,
          });
    $[4] = empty;
    $[5] = onExit;
    $[6] = errorElement;
    $[7] = contentElement;
  } else contentElement = $[7];
  let boxElement;
  if ($[8] !== rows || $[9] !== contentElement) {
    boxElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [rows, contentElement],
    });
    $[8] = rows;
    $[9] = contentElement;
    $[10] = boxElement;
  } else boxElement = $[10];
  return boxElement;
}
export { toRuleOption, noopRulePicker, CloudSessionRulesTab, readCloudSessionRules };
