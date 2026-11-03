/**
 * components/permissions/_new/ToolInputEntries.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0e8j1zzj.js (7)
 * attribution: sole-consumer-new 7
 */
import { useTheme } from "../../design-system/ThemeProvider.js";
import { qd } from "../../../hooks/useSettings.js";
import { R, Q } from "../../../../vendor/react/cjs/react.production.js";
import { Sz } from "../../../utils/cliHighlight.js";
import { canHighlightAsCode, pn } from "../ToolParameterDisplay.js";
import {
  hasDisplayUnsafeChar,
  hasVisibleText,
  SHORT_LABEL_WIDTH,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import { ValidationErrorsList_2 } from "../../ValidationErrorsList.js";
import { wrapAnsi } from "../../../ink/wrapAnsi.js";
import { wJe } from "../FallbackPermissionRequest.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { Ansi } from "../../../ink/components/AnsiText.js";
import { createHyperlink } from "../../../utils/hyperlink.js";
import { MessageActionsBar } from "../../messageActions.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { isConsentRow, parseConsentSuggestions } from "../consentRows.js";
import { RULE_ADDING_UPDATE_TYPES } from "../../../utils/permissions/permissions.js";
import { hr } from "../../../utils/invisibleChars.js";
import { tildify } from "../../../utils/path.js";
import { splitGraphemes } from "../../../utils/intl.js";

/**
 * 通用权限请求中按条目显示工具输入：inline 条目 key: value（可带超链接、注解），block 条目按语言高亮/着色后折行放入左边框块；结果按主题与文本缓存。
 */
//@ chunk-0e8j1zzj.js:41402-42744 sole-consumer-new
function ToolInputEntries({ entries: props, contentColumns: contentColumns }) {
  let [theme] = useTheme(),
    m = qd().syntaxHighlightingDisabled ?? !1,
    highlightCache = R(new Map()),
    highlighted = Q(() => {
      let g = m ? null : Sz(),
        M = new Map(),
        mapped = props.map((x) => {
          if (x.kind !== "block") return null;
          let A = `${theme}\x00${m}\x00${x.language ?? ""}\x00${x.text}`,
            T = M.get(A) ?? highlightCache.current.get(A);
          if (T === void 0)
            T =
              canHighlightAsCode(x, g) && x.language !== void 0 && g !== null
                ? g.highlight(x.text, { language: x.language })
                : hasDisplayUnsafeChar(x.text)
                  ? x.text
                  : ValidationErrorsList_2(x.text, theme);
          return (M.set(A, T), T);
        });
      return ((highlightCache.current = M), mapped);
    }, [props, theme, m]),
    wrapped = Q(
      () =>
        highlighted.map((g) =>
          g === null ? null : wrapAnsi(g, Math.max(10, contentColumns - 4), { hard: !0, trim: !1 }),
        ),
      [highlighted, contentColumns],
    ),
    supportsHyperlinks = wJe(),
    parseFailure =
      props.length === 1 && props[0].kind === "inline" && props[0].parseFailureSentinel === !0
        ? props[0]
        : null;
  if (parseFailure !== null) return e(Text, { dimColor: !0, children: parseFailure.text });
  if (props.length === 0) return null;
  return e(Box, {
    flexDirection: "column",
    children: props.map((g, M) =>
      g.kind === "inline"
        ? r(
            Text,
            {
              children: [
                r(Text, { dimColor: !0, children: [g.key, ": "] }),
                e(Ansi, {
                  children:
                    g.linkUrl !== void 0 && supportsHyperlinks ? createHyperlink(g.linkUrl, g.text) : g.text,
                }),
                g.annotation !== void 0 && r(Text, { dimColor: !0, children: [" (", g.annotation, ")"] }),
              ],
            },
            M,
          )
        : r(
            Box,
            {
              flexDirection: "column",
              children: [
                e(MessageActionsBar, { keyText: g.key, contentColumns: contentColumns }),
                e(Box, {
                  marginLeft: 2,
                  borderStyle: "single",
                  borderLeft: !0,
                  borderRight: !1,
                  borderTop: !1,
                  borderBottom: !1,
                  borderDimColor: !0,
                  paddingLeft: 1,
                  children: e(Ansi, { children: wrapped[M] ?? g.text }),
                }),
                g.annotation !== void 0 &&
                  e(Box, {
                    marginLeft: 2,
                    children: r(Text, { dimColor: !0, children: ["(", g.annotation, ")"] }),
                  }),
              ],
            },
            M,
          ),
    ),
  });
}
//@ chunk-0e8j1zzj.js:42744-42788 sole-consumer-new
function Kl(ed) {
  return ed.unrenderable === !0;
}
//@ chunk-0e8j1zzj.js:42788-42818 sole-consumer-new
function Xl(td) {
  return hasVisibleText(td);
}
//@ chunk-0e8j1zzj.js:42818-42844 sole-consumer-new
function zl(nd) {
  return !nd;
}
//@ chunk-0e8j1zzj.js:42844-42930 sole-consumer-new
function Zl(od, as) {
  return od + bunStringWidth(as) + (as.split(/\r\n|[\r\n\u2028\u2029]/).length - 1) * pn;
}
/**
 * 通用（Fallback）权限选项转换为结果：yes/启用 auto、不再询问（带权限更新）、no（带反馈）。
 */
//@ chunk-0e8j1zzj.js:42930-43282 sole-consumer-new
function fallbackChoiceToResult(o, t, d, c) {
  switch (o) {
    case "yes":
    case "yes-enable-auto-mode":
      return { behavior: "allow", updatedInput: t.input, ...(c && { feedback: c }) };
    case "yes-dont-ask-again": {
      if (d === null || !isConsentRow(d)) return { behavior: "allow", updatedInput: t.input };
      return { behavior: "allow", updatedInput: t.input, permissionUpdates: d.applies };
    }
    case "no":
      return { behavior: "deny", ...(c && { feedback: c }) };
  }
}
/**
 * 生成 "不再询问该工具在 <目录> 下的命令" 的 localSettings 规则行；目录名过长时逐字素截断并加省略号。
 */
//@ chunk-0e8j1zzj.js:43282-44090 sole-consumer-new
function buildToolDontAskAgainRule(tool, options) {
  return parseConsentSuggestions(
    [
      {
        type: "addRules",
        rules: [{ toolName: tool.toolName }],
        behavior: "allow",
        destination: "localSettings",
      },
    ],
    {
      displayedTypes: RULE_ADDING_UPDATE_TYPES,
      renderLabel: (d) => {
        let c = d.length === 1 ? d[0] : void 0;
        if (
          c === void 0 ||
          c.type !== "addRules" ||
          c.rules.length !== 1 ||
          c.rules[0]?.toolName !== tool.toolName ||
          c.rules[0]?.ruleContent !== void 0
        )
          return null;
        let m = String(tool.userFacingName);
        if (bunStringWidth(m) >= SHORT_LABEL_WIDTH || m.includes("\u2026")) return null;
        if (options.cwd.includes("\u2026")) return null;
        let max = Math.max(24, options.maxLabelWidth),
          formatLabel = (M) => `Yes, and don't ask again for ${tool.userFacingName} commands in ${M}`,
          displayCwd = hr(options.cwd);
        if (bunStringWidth(formatLabel(displayCwd)) <= max) return formatLabel(displayCwd);
        if (displayCwd !== options.cwd) return null;
        let tildeCwd = tildify(options.cwd);
        if (bunStringWidth(formatLabel(tildeCwd)) <= max) return formatLabel(tildeCwd);
        let f = splitGraphemes(tildeCwd),
          g = "";
        for (let M = 0; M < f.length; M++) {
          let N = g + f[M];
          if (bunStringWidth(formatLabel(`${N}\u2026`)) > max) break;
          g = N;
        }
        if (g.length > 0) return formatLabel(`${g}\u2026`);
        return null;
      },
    },
  );
}

export { Kl, buildToolDontAskAgainRule, fallbackChoiceToResult, Xl, zl, Zl, ToolInputEntries };
