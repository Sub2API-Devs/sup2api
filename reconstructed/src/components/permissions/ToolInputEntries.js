/**
 * components/permissions/ToolInputEntries.tsx
 *
 * 2.1.316 新增：通用权限请求里按条目显示工具输入（inline 的 key: value 与高亮折行的 block），按主题与文本缓存结果。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0e8j1zzj.js (7)
 * attribution: placement 7
 */
import { useTheme } from "../design-system/ThemeProvider.js";
import { useSettingsState } from "../../hooks/useSettings.js";
import { R, Q } from "../../../vendor/react/cjs/react.production.js";
import { getCliHighlightModule } from "../../utils/cliHighlight.js";
import { canHighlightAsCode, VALUE_WRAP_WIDTH } from "./ToolParameterDisplay.js";
import {
  hasDisplayUnsafeChar,
  hasVisibleText,
  SHORT_LABEL_WIDTH,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import { ValidationErrorsList_2 } from "../ValidationErrorsList.js";
import { wrapAnsi } from "../../ink/wrapAnsi.js";
import { useFallbackPermission } from "./FallbackPermissionRequest.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { createHyperlink } from "../../utils/hyperlink.js";
import { MessageActionsBar } from "../messageActions.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { isConsentRow, parseConsentSuggestions } from "./consentRows.js";
import { RULE_ADDING_UPDATE_TYPES } from "../../utils/permissions/permissions.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { tildify } from "../../utils/path.js";
import { splitGraphemes } from "../../utils/intl.js";

//@ chunk-0e8j1zzj.js:41402-42744 placement
/**
 * 通用权限请求中按条目显示工具输入：inline 条目 key: value（可带超链接、注解），block 条目按语言高亮/着色后折行放入左边框块；结果按主题与文本缓存。
 */
function ToolInputEntries({ entries: props, contentColumns }) {
  let [theme] = useTheme();
  let syntaxHighlightingDisabled = useSettingsState().syntaxHighlightingDisabled ?? false;
  let highlightCache = R(new Map());
  let highlighted = Q(() => {
    let g = syntaxHighlightingDisabled ? null : getCliHighlightModule();
    let M = new Map();
    let mapped = props.map((prop) => {
      if (prop.kind !== "block") return null;
      let A = `${theme}\x00${syntaxHighlightingDisabled}\x00${prop.language ?? ""}\x00${prop.text}`;
      let T = M.get(A) ?? highlightCache.current.get(A);
      if (T === undefined)
        T =
          canHighlightAsCode(prop, g) && prop.language !== undefined && g !== null
            ? g.highlight(prop.text, {
                language: prop.language,
              })
            : hasDisplayUnsafeChar(prop.text)
              ? prop.text
              : ValidationErrorsList_2(prop.text, theme);
      M.set(A, T);
      return T;
    });
    highlightCache.current = M;
    return mapped;
  }, [props, theme, syntaxHighlightingDisabled]);
  let wrapped = Q(
    () =>
      highlighted.map((g) =>
        g === null
          ? null
          : wrapAnsi(g, Math.max(10, contentColumns - 4), {
              hard: true,
              trim: false,
            }),
      ),
    [highlighted, contentColumns],
  );
  let supportsHyperlinks = useFallbackPermission();
  let parseFailure =
    props.length === 1 && props[0].kind === "inline" && props[0].parseFailureSentinel === true
      ? props[0]
      : null;
  if (parseFailure !== null)
    return jsxProd_default(Text, {
      dimColor: true,
      children: parseFailure.text,
    });
  if (props.length === 0) return null;
  return jsxProd_default(Box, {
    flexDirection: "column",
    children: props.map((prop, M) =>
      prop.kind === "inline"
        ? jsxProd_default_2(
            Text,
            {
              children: [
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [prop.key, ": "],
                }),
                jsxProd_default(Ansi, {
                  children:
                    prop.linkUrl !== undefined && supportsHyperlinks
                      ? createHyperlink(prop.linkUrl, prop.text)
                      : prop.text,
                }),
                prop.annotation !== undefined &&
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [" (", prop.annotation, ")"],
                  }),
              ],
            },
            M,
          )
        : jsxProd_default_2(
            Box,
            {
              flexDirection: "column",
              children: [
                jsxProd_default(MessageActionsBar, {
                  keyText: prop.key,
                  contentColumns,
                }),
                jsxProd_default(Box, {
                  marginLeft: 2,
                  borderStyle: "single",
                  borderLeft: true,
                  borderRight: false,
                  borderTop: false,
                  borderBottom: false,
                  borderDimColor: true,
                  paddingLeft: 1,
                  children: jsxProd_default(Ansi, {
                    children: wrapped[M] ?? prop.text,
                  }),
                }),
                prop.annotation !== undefined &&
                  jsxProd_default(Box, {
                    marginLeft: 2,
                    children: jsxProd_default_2(Text, {
                      dimColor: true,
                      children: ["(", prop.annotation, ")"],
                    }),
                  }),
              ],
            },
            M,
          ),
    ),
  });
}
//@ chunk-0e8j1zzj.js:42744-42788 placement
function isUnrenderableEntry(ed) {
  return ed.unrenderable === true;
}
//@ chunk-0e8j1zzj.js:42788-42818 placement
function describeToolInputEntry(td) {
  return hasVisibleText(td);
}
//@ chunk-0e8j1zzj.js:42818-42844 placement
function isMissingEntry(nd) {
  return !nd;
}
//@ chunk-0e8j1zzj.js:42844-42930 placement
function entryDisplayWidth(od, as) {
  return od + bunStringWidth(as) + (as.split(/\r\n|[\r\n\u2028\u2029]/).length - 1) * VALUE_WRAP_WIDTH;
}
//@ chunk-0e8j1zzj.js:42930-43282 placement
/**
 * 通用（Fallback）权限选项转换为结果：yes/启用 auto、不再询问（带权限更新）、no（带反馈）。
 */
function fallbackChoiceToResult(o, payload, d, feedback) {
  switch (o) {
    case "yes":
    case "yes-enable-auto-mode":
      return {
        behavior: "allow",
        updatedInput: payload.input,
        ...(feedback && {
          feedback,
        }),
      };
    case "yes-dont-ask-again": {
      if (d === null || !isConsentRow(d))
        return {
          behavior: "allow",
          updatedInput: payload.input,
        };
      return {
        behavior: "allow",
        updatedInput: payload.input,
        permissionUpdates: d.applies,
      };
    }
    case "no":
      return {
        behavior: "deny",
        ...(feedback && {
          feedback,
        }),
      };
  }
}
//@ chunk-0e8j1zzj.js:43282-44090 placement
/**
 * 生成 "不再询问该工具在 <目录> 下的命令" 的 localSettings 规则行；目录名过长时逐字素截断并加省略号。
 */
function buildToolDontAskAgainRule(tool, options) {
  return parseConsentSuggestions(
    [
      {
        type: "addRules",
        rules: [
          {
            toolName: tool.toolName,
          },
        ],
        behavior: "allow",
        destination: "localSettings",
      },
    ],
    {
      displayedTypes: RULE_ADDING_UPDATE_TYPES,
      renderLabel: (d) => {
        let c = d.length === 1 ? d[0] : undefined;
        if (
          c === undefined ||
          c.type !== "addRules" ||
          c.rules.length !== 1 ||
          c.rules[0]?.toolName !== tool.toolName ||
          c.rules[0]?.ruleContent !== undefined
        )
          return null;
        let m = String(tool.userFacingName);
        if (bunStringWidth(m) >= SHORT_LABEL_WIDTH || m.includes("\u2026")) return null;
        if (options.cwd.includes("\u2026")) return null;
        let max = Math.max(24, options.maxLabelWidth);
        let formatLabel = (M) => `Yes, and don't ask again for ${tool.userFacingName} commands in ${M}`;
        let displayCwd = stripInvisibleChars(options.cwd);
        if (bunStringWidth(formatLabel(displayCwd)) <= max) return formatLabel(displayCwd);
        if (displayCwd !== options.cwd) return null;
        let tildeCwd = tildify(options.cwd);
        if (bunStringWidth(formatLabel(tildeCwd)) <= max) return formatLabel(tildeCwd);
        let f = splitGraphemes(tildeCwd);
        let g = "";
        for (let idx = 0; idx < f.length; idx++) {
          let N = g + f[idx];
          if (bunStringWidth(formatLabel(`${N}\u2026`)) > max) break;
          g = N;
        }
        if (g.length > 0) return formatLabel(`${g}\u2026`);
        return null;
      },
    },
  );
}
export {
  isUnrenderableEntry,
  buildToolDontAskAgainRule,
  fallbackChoiceToResult,
  describeToolInputEntry,
  isMissingEntry,
  entryDisplayWidth,
  ToolInputEntries,
};
