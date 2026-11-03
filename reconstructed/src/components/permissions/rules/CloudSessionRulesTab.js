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
import { init_react_production, fo, Qr } from "../../../../vendor/react/cjs/react.production.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { array, string, u, unknown } from "../../../../vendor/zod/v4/classic/schemas.js";
import { stripInvisibleChars } from "../../../utils/invisibleChars.js";
import { parseThinClientReply } from "../../../cli/thinClient.js";
import { SETTING_SOURCES, getSettingSourceName } from "../../../utils/settings/constants.js";
import { truncateToLength, plural } from "../../../utils/stringUtils.js";
import { errorMessage } from "../../../utils/errors.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
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
function toRuleOption(h, b) {
  let { rule, source } = h;
  return {
    value: String(b),
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
  let h = array(string()).catch([]);
  let i = u({
    source: string(),
    settings: u({
      permissions: u({
        allow: h,
        ask: h,
        deny: h,
        additionalDirectories: h,
      })
        .optional()
        .catch(undefined),
    }).catch({
      permissions: undefined,
    }),
  });
  return u({
    sources: array(i.nullable().catch(null)),
    errors: array(unknown()).optional().catch(undefined),
  });
});
var ZERO_WIDTH_CHARS_RE = /[\u200b\u200e\u200f\u2060\ufeff]/g;
//@ chunk-p2qwpk2k.js:16675-16724 placement
function replaceControlChars(h) {
  return stripInvisibleChars(h.replace(ZERO_WIDTH_CHARS_RE, "\uFFFD"));
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
    let a = {
      allow: [],
      ask: [],
      deny: [],
      additionalDirectories: [],
    };
    for (let source of thinClientReply.sources) {
      if (source === null) continue;
      let { source: source_2, settings } = source;
      let found = SETTING_SOURCES.find((c) => c === source_2);
      let source_3 = found
        ? getSettingSourceName(found)
        : replaceControlChars(truncateToLength(source_2, 40)) + (source_2.length > 40 ? "\u2026" : "");
      for (let { kind } of CLOUD_RULE_SECTIONS)
        for (let M of settings.permissions?.[kind] ?? [])
          a[kind].push({
            rule: replaceControlChars(M),
            source: source_3,
          });
    }
    return {
      kind: "read",
      rules: a,
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
  let a = w(19);
  let { onExit, rulesRead } = props;
  let f;
  if (a[0] !== onExit) {
    f = () => onExit();
    a[0] = onExit;
    a[1] = f;
  } else f = a[1];
  let g;
  if (a[2] === MEMO_CACHE_SENTINEL) {
    g = {
      context: "Settings",
    };
    a[2] = g;
  } else g = a[2];
  useKeybinding("confirm:no", f, g);
  let v;
  if (a[3] !== onExit) {
    v = () => onExit();
    a[3] = onExit;
    a[4] = v;
  } else v = a[4];
  let globalExitKeybindings = useGlobalExitKeybindings(v);
  let children;
  if (a[5] !== onExit || a[6] !== rulesRead) {
    children = CLOUD_RULE_SECTIONS.map((c) => {
      let { kind, title, empty } = c;
      return jsxProd_default(
        Tab,
        {
          id: kind,
          title,
          children: jsxProd_default(fo, {
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
    a[5] = onExit;
    a[6] = rulesRead;
    a[7] = children;
  } else children = a[7];
  let c;
  if (a[8] !== children) {
    c = jsxProd_default(Tabs, {
      title: "Permissions",
      color: "permission",
      navFromContent: true,
      children,
    });
    a[8] = children;
    a[9] = c;
  } else c = a[9];
  let E;
  if (a[10] === MEMO_CACHE_SENTINEL) {
    E = jsxProd_default(Text, {
      dimColor: true,
      wrap: "wrap-trim",
      children:
        "Read-only here: these are the cloud session's rules, from its settings files (rules it added for itself this session aren't listed). To change them, ask Claude to edit .claude/settings.json in the session. Commands Claude runs on this computer follow this computer's rules \u2014 /permissions in a local session edits those.",
    });
    a[10] = E;
  } else E = a[10];
  let children_2;
  if (a[11] !== globalExitKeybindings.keyName || a[12] !== globalExitKeybindings.pending) {
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
    a[11] = globalExitKeybindings.keyName;
    a[12] = globalExitKeybindings.pending;
    a[13] = children_2;
  } else children_2 = a[13];
  let k;
  if (a[14] !== children_2) {
    k = jsxProd_default_2(Box, {
      marginTop: 1,
      flexDirection: "column",
      children: [
        E,
        jsxProd_default(Text, {
          dimColor: true,
          children: children_2,
        }),
      ],
    });
    a[14] = children_2;
    a[15] = k;
  } else k = a[15];
  let V;
  if (a[16] !== c || a[17] !== k) {
    V = jsxProd_default_2(Pane, {
      color: "permission",
      children: [c, k],
    });
    a[16] = c;
    a[17] = k;
    a[18] = V;
  } else V = a[18];
  return V;
}
//@ chunk-p2qwpk2k.js:18952-19779 placement
/**
 * 显示云会话某类规则：读取失败显示原因，部分设置文件解析失败时警告，空时显示空提示。
 */
function CloudRulesSection(props) {
  let v = w(11);
  let { rulesRead, kind, empty, onExit } = props;
  let g = Qr(rulesRead);
  if (g.kind === "unreadable") {
    let x;
    if (v[0] !== g.reason) {
      x = jsxProd_default_2(Text, {
        color: "error",
        children: ["Couldn't read the cloud session's rules: ", g.reason],
      });
      v[0] = g.reason;
      v[1] = x;
    } else x = v[1];
    return x;
  }
  let C = g.rules[kind];
  let x;
  if (v[2] !== g.skippedFiles) {
    x =
      g.skippedFiles > 0 &&
      jsxProd_default_2(Text, {
        color: "warning",
        wrap: "wrap-trim",
        children: [
          g.skippedFiles,
          " settings ",
          plural(g.skippedFiles, "file"),
          " in the session failed to parse; rules from",
          " ",
          plural(g.skippedFiles, "it", "them"),
          " aren't listed.",
        ],
      });
    v[2] = g.skippedFiles;
    v[3] = x;
  } else x = v[3];
  let c;
  if (v[4] !== empty || v[5] !== onExit || v[6] !== C) {
    c =
      C.length === 0
        ? jsxProd_default(Text, {
            dimColor: true,
            children: empty,
          })
        : jsxProd_default(Commands, {
            rules: C,
            onExit,
          });
    v[4] = empty;
    v[5] = onExit;
    v[6] = C;
    v[7] = c;
  } else c = v[7];
  let M;
  if (v[8] !== x || v[9] !== c) {
    M = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [x, c],
    });
    v[8] = x;
    v[9] = c;
    v[10] = M;
  } else M = v[10];
  return M;
}
export { toRuleOption, noopRulePicker, CloudSessionRulesTab, readCloudSessionRules };
