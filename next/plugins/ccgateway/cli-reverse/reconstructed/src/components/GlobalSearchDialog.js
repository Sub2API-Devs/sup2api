/**
 * components/GlobalSearchDialog.tsx
 *
 * 全局搜索/主题保存对话框（GlobalSearchDialog），并含按 slug 去重的命名辅助。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/GlobalSearchDialog.tsx
 * pieces: chunk-fx2xa8vr.js (9), chunk-vb7ng9fr.js (1)
 * attribution: sole-consumer 8, callgraph-fingerprint 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { sep } from "path";
import { MAX_POSIX_PATH_LENGTH } from "../utils/posixPaths.js";
import { looksLikeCredentialIncludingNul } from "../services/homeSeed/portableSettings.js";
import { init_react_production, useState, useEffect } from "../../vendor/react/cjs/react.production.js";
import { FULL_BLOCK_GLYPH } from "../constants/figures.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { useTheme_2, useCustomThemes } from "./design-system/ThemeProvider.js";
import { stableEmptyObject } from "../utils/stableEmptyObject.js";
import { getTheme } from "../utils/theme.js";
import { saveCustomTheme, customThemeRef, getThemesDir, slugify } from "../utils/customThemes.js";
import { logForDebugging } from "../utils/debug.js";
import { isValidThemeColor } from "../utils/ink.js";
import { omitAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { TextInput } from "./TextInput.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { Byline } from "./design-system/Byline.js";
import { Pane } from "./design-system/Pane.js";
import { plural } from "../utils/stringUtils.js";
import { ParenHint } from "./diff/DiffDetailView.js";
import { FuzzyPicker } from "./design-system/FuzzyPicker.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-vb7ng9fr.js:28457-28565 fingerprint (2.1.88 match: matchKey, 0.685)
function matchKey(text, startLine) {
  let lines = text.split(`
`);
  let offset =
    lines.length > MAX_POSIX_PATH_LENGTH
      ? -1
      : lines.findIndex((line) => looksLikeCredentialIncludingNul(line));
  return offset === -1
    ? {}
    : {
        line: startLine + offset + 1,
      };
}
//@ chunk-fx2xa8vr.js:16182-16186 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fx2xa8vr.js:16182", () => {
  init_react_production();
});
//@ chunk-fx2xa8vr.js:16186-16190 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fx2xa8vr.js:16186", () => {
  init_react_production();
});
//@ chunk-fx2xa8vr.js:16218-16241 sole-consumer
function returnFalse() {
  return false;
}
//@ chunk-fx2xa8vr.js:16241-16267 sole-consumer
function identity(value) {
  return value;
}
//@ chunk-fx2xa8vr.js:16267-16314 sole-consumer
function noColorNamedText(name) {
  return `No color named "${name}"`;
}
//@ chunk-fx2xa8vr.js:16314-16329 sole-consumer
var DOUBLE_WIDTH = FULL_BLOCK_GLYPH + FULL_BLOCK_GLYPH;
//@ chunk-fx2xa8vr.js:16329-16446 sole-consumer
function ColorSwatch(props) {
  let $ = useMemoCache(2);
  let { value: color } = props;
  let swatch;
  if ($[0] !== color) {
    swatch = jsxProd_default(Text, {
      color,
      children: DOUBLE_WIDTH,
    });
    $[0] = color;
    $[1] = swatch;
  } else swatch = $[1];
  return swatch;
}
//@ chunk-fx2xa8vr.js:16446-24545 callgraph-fingerprint (2.1.88 match: GlobalSearchDialog, 0.218)
function GlobalSearchDialog(props) {
  let $ = useMemoCache(165);
  let { initial, defaultBase, onDone, onPick, onCancel } = props;
  let { storageV5 } = useTheme_2();
  let { customThemes, reloadCustomThemes, setPreviewOverrides } = useCustomThemes();
  let isFork = initial !== undefined && initial.source !== "user";
  let [step, setStep] = useState(initial && !isFork ? "colors" : "name");
  let [name, setName] = useState(initial?.name ?? "");
  let [nameCursor, setNameCursor] = useState(name.length);
  let [slug, setSlug] = useState(isFork ? "" : (initial?.slug ?? ""));
  let makeBase;
  if ($[0] !== defaultBase || $[1] !== initial?.base) {
    makeBase = () => initial?.base ?? defaultBase;
    $[0] = defaultBase;
    $[1] = initial?.base;
    $[2] = makeBase;
  } else makeBase = $[2];
  let [base] = useState(makeBase);
  let [emptyOverrides] = useState(returnFalse);
  let emptyHintProps;
  if ($[3] !== emptyOverrides) {
    emptyHintProps = stableEmptyObject(emptyOverrides);
    $[3] = emptyOverrides;
    $[4] = emptyHintProps;
  } else emptyHintProps = $[4];
  let hintProps = emptyHintProps;
  let baseTheme;
  if ($[5] !== base) {
    baseTheme = getTheme(base);
    $[5] = base;
    $[6] = baseTheme;
  } else baseTheme = $[6];
  let theme = baseTheme;
  let initialOverrides;
  if ($[7] !== initial?.overrides) {
    initialOverrides = initial?.overrides ?? {};
    $[7] = initial?.overrides;
    $[8] = initialOverrides;
  } else initialOverrides = $[8];
  let [overrides, setOverrides] = useState(initialOverrides);
  let tokenKeys;
  if ($[9] !== theme) {
    tokenKeys = Object.keys(theme).sort();
    $[9] = theme;
    $[10] = tokenKeys;
  } else tokenKeys = $[10];
  let allTokens = tokenKeys;
  let [query, setQuery] = useState("");
  let [activeToken, setActiveToken] = useState(null);
  let [colorInput, setColorInput] = useState("");
  let [colorCursor, setColorCursor] = useState(0);
  let items;
  if ($[11] !== allTokens || $[12] !== query) {
    let lower = query.toLowerCase();
    items = lower ? allTokens.filter((token) => token.toLowerCase().includes(lower)) : allTokens;
    $[11] = allTokens;
    $[12] = query;
    $[13] = items;
  } else items = $[13];
  let items_2 = items;
  let nextSlug;
  if ($[14] !== customThemes || $[15] !== name || $[16] !== slug) {
    nextSlug = slug || uniqueSlug(name, customThemes);
    $[14] = customThemes;
    $[15] = name;
    $[16] = slug;
    $[17] = nextSlug;
  } else nextSlug = $[17];
  let nextSlug_2 = nextSlug;
  let overrideKeys;
  if ($[18] !== overrides) {
    overrideKeys = Object.keys(overrides);
    $[18] = overrides;
    $[19] = overrideKeys;
  } else overrideKeys = $[19];
  let overrideCount = overrideKeys.length;
  let previewDeps;
  let clearPreviewEffect;
  if ($[20] !== setPreviewOverrides) {
    clearPreviewEffect = () => () => setPreviewOverrides(null);
    previewDeps = [setPreviewOverrides];
    $[20] = setPreviewOverrides;
    $[21] = previewDeps;
    $[22] = clearPreviewEffect;
  } else {
    previewDeps = $[21];
    clearPreviewEffect = $[22];
  }
  useEffect(clearPreviewEffect, previewDeps);
  let colorFor;
  if ($[23] !== overrides || $[24] !== theme) {
    colorFor = function colorFor(token) {
      return overrides[token] ?? theme[token];
    };
    $[23] = overrides;
    $[24] = theme;
    $[25] = colorFor;
  } else colorFor = $[25];
  let colorFor_2 = colorFor;
  let saveOverrides;
  if ($[26] !== base || $[27] !== name || $[28] !== setPreviewOverrides || $[29] !== storageV5) {
    saveOverrides = function saveOverrides(slug, nextOverrides) {
      setOverrides(nextOverrides);
      setPreviewOverrides(nextOverrides);
      saveCustomTheme(
        {
          slug,
          name: name.trim(),
          base,
          overrides: nextOverrides,
          source: "user",
        },
        storageV5,
      ).catch((error) => {
        logForDebugging(`[theme] save ${slug} failed: ${error}`, {
          level: "warn",
        });
      });
    };
    $[26] = base;
    $[27] = name;
    $[28] = setPreviewOverrides;
    $[29] = storageV5;
    $[30] = saveOverrides;
  } else saveOverrides = $[30];
  let commitOverrides = saveOverrides;
  let selectToken;
  if ($[31] !== colorFor_2) {
    selectToken = function selectToken(token) {
      let value = colorFor_2(token);
      setColorInput(value);
      setColorCursor(value.length);
      setActiveToken(token);
    };
    $[31] = colorFor_2;
    $[32] = selectToken;
  } else selectToken = $[32];
  let onSelect = selectToken;
  let submitColor;
  if (
    $[33] !== commitOverrides ||
    $[34] !== colorInput ||
    $[35] !== activeToken ||
    $[36] !== overrides ||
    $[37] !== theme ||
    $[38] !== slug
  ) {
    submitColor = function submitColor() {
      if (activeToken === null || !isValidThemeColor(colorInput)) {
        return;
      }
      commitOverrides(
        slug,
        colorInput === theme[activeToken]
          ? omitAlias(overrides, activeToken)
          : {
              ...overrides,
              [activeToken]: colorInput,
            },
      );
      setActiveToken(null);
    };
    $[33] = commitOverrides;
    $[34] = colorInput;
    $[35] = activeToken;
    $[36] = overrides;
    $[37] = theme;
    $[38] = slug;
    $[39] = submitColor;
  } else submitColor = $[39];
  let onSubmit = submitColor;
  let exitColor;
  if ($[40] !== overrides || $[41] !== setPreviewOverrides) {
    exitColor = function exitColor() {
      setPreviewOverrides(overrides);
      setActiveToken(null);
    };
    $[40] = overrides;
    $[41] = setPreviewOverrides;
    $[42] = exitColor;
  } else exitColor = $[42];
  let exitColor_2 = exitColor;
  let resetToken;
  if ($[43] !== commitOverrides || $[44] !== overrides || $[45] !== slug) {
    resetToken = function resetToken(m_0) {
      if (!(m_0 in overrides)) {
        return;
      }
      commitOverrides(slug, omitAlias(overrides, m_0));
    };
    $[43] = commitOverrides;
    $[44] = overrides;
    $[45] = slug;
    $[46] = resetToken;
  } else resetToken = $[46];
  let resetToken_2 = resetToken;
  let updatePreview;
  if ($[47] !== activeToken || $[48] !== overrides || $[49] !== setPreviewOverrides) {
    updatePreview = function updatePreview(match) {
      setColorInput(match);
      if (activeToken && isValidThemeColor(match))
        setPreviewOverrides({
          ...overrides,
          [activeToken]: match,
        });
    };
    $[47] = activeToken;
    $[48] = overrides;
    $[49] = setPreviewOverrides;
    $[50] = updatePreview;
  } else updatePreview = $[50];
  let onChange = updatePreview;
  let onEscape;
  if ($[51] !== exitColor_2 || $[52] !== activeToken || $[53] !== onCancel) {
    onEscape = () => {
      if (activeToken !== null) exitColor_2();
      else onCancel();
    };
    $[51] = exitColor_2;
    $[52] = activeToken;
    $[53] = onCancel;
    $[54] = onEscape;
  } else onEscape = $[54];
  const isActive = step === "name" || activeToken !== null;
  let keybindingOptions;
  if ($[55] !== isActive) {
    keybindingOptions = {
      context: "Settings",
      isActive,
    };
    $[55] = isActive;
    $[56] = keybindingOptions;
  } else keybindingOptions = $[56];
  useKeybinding("confirm:no", onEscape, keybindingOptions);
  if (step === "name") {
    let trimmedName;
    let hasName;
    if ($[57] !== name) {
      trimmedName = name.trim();
      hasName = trimmedName.length > 0;
      $[57] = name;
      $[58] = trimmedName;
      $[59] = hasName;
    } else {
      trimmedName = $[58];
      hasName = $[59];
    }
    let children = isFork && initial ? `Fork ${initial.name} to your themes` : "New custom theme";
    let titleText;
    if ($[60] !== emptyOverrides || $[61] !== children) {
      titleText =
        !emptyOverrides &&
        jsxProd_default(Text, {
          bold: true,
          color: "permission",
          children,
        });
      $[60] = emptyOverrides;
      $[61] = children;
      $[62] = titleText;
    } else titleText = $[62];
    let nameLabel;
    if ($[63] === MEMO_CACHE_SENTINEL) {
      nameLabel = jsxProd_default(Text, {
        children: "Name: ",
      });
      $[63] = nameLabel;
    } else nameLabel = $[63];
    let onSubmit;
    if (
      $[64] !== base ||
      $[65] !== nextSlug_2 ||
      $[66] !== onPick ||
      $[67] !== overrides ||
      $[68] !== reloadCustomThemes ||
      $[69] !== storageV5 ||
      $[70] !== trimmedName ||
      $[71] !== hasName
    ) {
      onSubmit = () => {
        if (!hasName) {
          return;
        }
        setSlug(nextSlug_2);
        setName(trimmedName);
        setStep("colors");
        saveCustomTheme(
          {
            slug: nextSlug_2,
            name: trimmedName,
            base,
            overrides,
            source: "user",
          },
          storageV5,
        )
          .then(() => reloadCustomThemes())
          .then(() => {
            onPick(customThemeRef(nextSlug_2));
          })
          .catch((m_3) => {
            logForDebugging(`[theme] save ${nextSlug_2} failed: ${m_3}`, {
              level: "warn",
            });
          });
      };
      $[64] = base;
      $[65] = nextSlug_2;
      $[66] = onPick;
      $[67] = overrides;
      $[68] = reloadCustomThemes;
      $[69] = storageV5;
      $[70] = trimmedName;
      $[71] = hasName;
      $[72] = onSubmit;
    } else onSubmit = $[72];
    let nameRow;
    if ($[73] !== name || $[74] !== nameCursor || $[75] !== onCancel || $[76] !== onSubmit) {
      nameRow = jsxProd_default_2(Box, {
        children: [
          nameLabel,
          jsxProd_default(TextInput, {
            value: name,
            onChange: setName,
            onSubmit,
            onExit: onCancel,
            placeholder: "my-theme",
            columns: 40,
            cursorOffset: nameCursor,
            onChangeCursorOffset: setNameCursor,
            disableCursorMovementForUpDownKeys: true,
            disableEscapeDoublePress: true,
            focus: true,
            showCursor: true,
          }),
        ],
      });
      $[73] = name;
      $[74] = nameCursor;
      $[75] = onCancel;
      $[76] = onSubmit;
      $[77] = nameRow;
    } else nameRow = $[77];
    let themesDir;
    if ($[78] === MEMO_CACHE_SENTINEL) {
      themesDir = getThemesDir();
      $[78] = themesDir;
    } else themesDir = $[78];
    let pathText;
    if ($[79] !== base || $[80] !== nextSlug_2) {
      pathText = jsxProd_default_2(Text, {
        dimColor: true,
        children: ["based on ", base, " \xB7 saved to ", themesDir, sep, nextSlug_2, ".json"],
      });
      $[79] = base;
      $[80] = nextSlug_2;
      $[81] = pathText;
    } else pathText = $[81];
    let nameBox;
    if ($[82] !== nameRow || $[83] !== pathText) {
      nameBox = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [nameRow, pathText],
      });
      $[82] = nameRow;
      $[83] = pathText;
      $[84] = nameBox;
    } else nameBox = $[84];
    let enterHint;
    if ($[85] !== hintProps || $[86] !== hasName) {
      enterHint =
        hasName &&
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "continue",
          ...hintProps,
        });
      $[85] = hintProps;
      $[86] = hasName;
      $[87] = enterHint;
    } else enterHint = $[87];
    let escapeHint;
    if ($[88] !== hintProps) {
      escapeHint = jsxProd_default(KeyboardShortcutHint, {
        chord: "escape",
        action: "cancel",
        ...hintProps,
      });
      $[88] = hintProps;
      $[89] = escapeHint;
    } else escapeHint = $[89];
    let children_2;
    if ($[90] !== enterHint || $[91] !== escapeHint) {
      children_2 = jsxProd_default_2(Byline, {
        children: [enterHint, escapeHint],
      });
      $[90] = enterHint;
      $[91] = escapeHint;
      $[92] = children_2;
    } else children_2 = $[92];
    let hintsText;
    if ($[93] !== emptyOverrides || $[94] !== children_2) {
      hintsText = jsxProd_default(Text, {
        dimColor: true,
        italic: emptyOverrides,
        children: children_2,
      });
      $[93] = emptyOverrides;
      $[94] = children_2;
      $[95] = hintsText;
    } else hintsText = $[95];
    let namePane;
    if ($[96] !== titleText || $[97] !== nameBox || $[98] !== hintsText) {
      let opened = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [titleText, nameBox, hintsText],
      });
      namePane = jsxProd_default(Pane, {
        color: "permission",
        children: opened,
      });
      $[96] = titleText;
      $[97] = nameBox;
      $[98] = hintsText;
      $[99] = namePane;
    } else namePane = $[99];
    return namePane;
  }
  if (activeToken !== null) {
    let colorValid;
    if ($[100] !== colorInput) {
      colorValid = isValidThemeColor(colorInput);
      $[100] = colorInput;
      $[101] = colorValid;
    } else colorValid = $[101];
    let colorValid_2 = colorValid;
    let tokenTitle;
    if ($[102] !== emptyOverrides || $[103] !== name) {
      tokenTitle =
        !emptyOverrides &&
        jsxProd_default(Text, {
          bold: true,
          color: "permission",
          children: name,
        });
      $[102] = emptyOverrides;
      $[103] = name;
      $[104] = tokenTitle;
    } else tokenTitle = $[104];
    const value = colorValid_2 ? colorInput : theme[activeToken];
    let swatch;
    if ($[105] !== value) {
      swatch = jsxProd_default(ColorSwatch, {
        value,
      });
      $[105] = value;
      $[106] = swatch;
    } else swatch = $[106];
    let space;
    if ($[107] === MEMO_CACHE_SENTINEL) {
      space = jsxProd_default(Text, {
        children: " ",
      });
      $[107] = space;
    } else space = $[107];
    let tokenName;
    if ($[108] !== activeToken) {
      tokenName = jsxProd_default(Text, {
        bold: true,
        children: activeToken,
      });
      $[108] = activeToken;
      $[109] = tokenName;
    } else tokenName = $[109];
    let currentRow;
    if ($[110] !== swatch || $[111] !== tokenName) {
      currentRow = jsxProd_default_2(Box, {
        children: [swatch, space, tokenName],
      });
      $[110] = swatch;
      $[111] = tokenName;
      $[112] = currentRow;
    } else currentRow = $[112];
    const presetColor = theme[activeToken];
    let presetText;
    if ($[113] !== presetColor) {
      presetText = jsxProd_default_2(Text, {
        dimColor: true,
        children: ["preset: ", presetColor],
      });
      $[113] = presetColor;
      $[114] = presetText;
    } else presetText = $[114];
    let currentBox;
    if ($[115] !== currentRow || $[116] !== presetText) {
      currentBox = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [currentRow, presetText],
      });
      $[115] = currentRow;
      $[116] = presetText;
      $[117] = currentBox;
    } else currentBox = $[117];
    let valueLabel;
    if ($[118] === MEMO_CACHE_SENTINEL) {
      valueLabel = jsxProd_default(Text, {
        children: "Value: ",
      });
      $[118] = valueLabel;
    } else valueLabel = $[118];
    let valueRow;
    if (
      $[119] !== exitColor_2 ||
      $[120] !== onSubmit ||
      $[121] !== colorCursor ||
      $[122] !== colorInput ||
      $[123] !== onChange
    ) {
      valueRow = jsxProd_default_2(Box, {
        children: [
          valueLabel,
          jsxProd_default(TextInput, {
            value: colorInput,
            onChange,
            onSubmit,
            onExit: exitColor_2,
            placeholder: "rgb(r,g,b) \xB7 #rrggbb \xB7 ansi:red",
            columns: 40,
            cursorOffset: colorCursor,
            onChangeCursorOffset: setColorCursor,
            disableCursorMovementForUpDownKeys: true,
            disableEscapeDoublePress: true,
            focus: true,
            showCursor: true,
          }),
        ],
      });
      $[119] = exitColor_2;
      $[120] = onSubmit;
      $[121] = colorCursor;
      $[122] = colorInput;
      $[123] = onChange;
      $[124] = valueRow;
    } else valueRow = $[124];
    let children;
    if ($[125] !== hintProps || $[126] !== colorValid_2) {
      children = colorValid_2
        ? jsxProd_default_2(Byline, {
            children: [
              jsxProd_default(KeyboardShortcutHint, {
                chord: "enter",
                action: "save",
                ...hintProps,
              }),
              jsxProd_default(KeyboardShortcutHint, {
                chord: "escape",
                action: "cancel",
                ...hintProps,
              }),
            ],
          })
        : "Accepts rgb(r,g,b), #rrggbb, ansi256(n), or ansi:name";
      $[125] = hintProps;
      $[126] = colorValid_2;
      $[127] = children;
    } else children = $[127];
    let validationText;
    if ($[128] !== emptyOverrides || $[129] !== children) {
      validationText = jsxProd_default(Text, {
        dimColor: true,
        italic: emptyOverrides,
        children,
      });
      $[128] = emptyOverrides;
      $[129] = children;
      $[130] = validationText;
    } else validationText = $[130];
    let colorPane;
    if ($[131] !== tokenTitle || $[132] !== currentBox || $[133] !== valueRow || $[134] !== validationText) {
      let children = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [tokenTitle, currentBox, valueRow, validationText],
      });
      colorPane = jsxProd_default(Pane, {
        color: "permission",
        children,
      });
      $[131] = tokenTitle;
      $[132] = currentBox;
      $[133] = valueRow;
      $[134] = validationText;
      $[135] = colorPane;
    } else colorPane = $[135];
    return colorPane;
  }
  const title = `${name} \xB7 based on ${base}`;
  let onTab;
  if ($[136] !== resetToken_2) {
    onTab = {
      action: "reset",
      handler: (m_5) => {
        if (m_5) resetToken_2(m_5);
      },
    };
    $[136] = resetToken_2;
    $[137] = onTab;
  } else onTab = $[137];
  let onCancel_2;
  if (
    $[138] !== base ||
    $[139] !== name ||
    $[140] !== onDone ||
    $[141] !== overrides ||
    $[142] !== setPreviewOverrides ||
    $[143] !== slug
  ) {
    onCancel_2 = () => {
      setPreviewOverrides(null);
      onDone({
        slug,
        name,
        base,
        overrides,
        source: "user",
      });
    };
    $[138] = base;
    $[139] = name;
    $[140] = onDone;
    $[141] = overrides;
    $[142] = setPreviewOverrides;
    $[143] = slug;
    $[144] = onCancel_2;
  } else onCancel_2 = $[144];
  let matchLabel;
  if ($[145] !== overrideCount || $[146] !== slug) {
    matchLabel =
      overrideCount > 0
        ? `${overrideCount} ${plural(overrideCount, "color")} customized \xB7 ${slug}.json`
        : `editing ${slug}.json`;
    $[145] = overrideCount;
    $[146] = slug;
    $[147] = matchLabel;
  } else matchLabel = $[147];
  let renderItem;
  if ($[148] !== overrides || $[149] !== colorFor_2) {
    renderItem = (m_7, isFocused) => {
      let when = overrides[m_7] !== undefined;
      return jsxProd_default_2(Box, {
        children: [
          jsxProd_default(ColorSwatch, {
            value: colorFor_2(m_7),
          }),
          jsxProd_default(Text, {
            children: " ",
          }),
          jsxProd_default(Text, {
            color: isFocused ? "suggestion" : undefined,
            children: m_7,
          }),
          jsxProd_default(ParenHint, {
            when,
            children: "custom",
          }),
        ],
      });
    };
    $[148] = overrides;
    $[149] = colorFor_2;
    $[150] = renderItem;
  } else renderItem = $[150];
  let renderPreview;
  if ($[151] !== overrides || $[152] !== theme || $[153] !== colorFor_2) {
    renderPreview = (m_8) =>
      jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default_2(Text, {
            children: [
              "current: ",
              jsxProd_default(ColorSwatch, {
                value: colorFor_2(m_8),
              }),
              " ",
              colorFor_2(m_8),
            ],
          }),
          overrides[m_8] !== undefined &&
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "preset: ",
                jsxProd_default(ColorSwatch, {
                  value: theme[m_8],
                }),
                " ",
                theme[m_8],
              ],
            }),
        ],
      });
    $[151] = overrides;
    $[152] = theme;
    $[153] = colorFor_2;
    $[154] = renderPreview;
  } else renderPreview = $[154];
  let picker;
  if (
    $[155] !== items_2 ||
    $[156] !== query ||
    $[157] !== onSelect ||
    $[158] !== title ||
    $[159] !== onTab ||
    $[160] !== onCancel_2 ||
    $[161] !== matchLabel ||
    $[162] !== renderItem ||
    $[163] !== renderPreview
  ) {
    picker = jsxProd_default(FuzzyPicker, {
      title,
      placeholder: "Filter color tokens\u2026",
      items: items_2,
      getKey: identity,
      initialQuery: query,
      onQueryChange: setQuery,
      onSelect,
      onTab,
      onCancel: onCancel_2,
      selectAction: "edit",
      cancelAction: "done",
      matchLabel,
      renderItem,
      renderPreview,
      emptyMessage: noColorNamedText,
    });
    $[155] = items_2;
    $[156] = query;
    $[157] = onSelect;
    $[158] = title;
    $[159] = onTab;
    $[160] = onCancel_2;
    $[161] = matchLabel;
    $[162] = renderItem;
    $[163] = renderPreview;
    $[164] = picker;
  } else picker = $[164];
  return picker;
}
//@ chunk-fx2xa8vr.js:24545-24691 sole-consumer
function uniqueSlug(base, customThemes) {
  let slug = slugify(base);
  if (!customThemes.some((theme) => theme.slug === slug)) return slug;
  for (let i = 2; ; i++) {
    let candidate = `${slug}-${i}`;
    if (!customThemes.some((theme) => theme.slug === candidate)) return candidate;
  }
}
export { GlobalSearchDialog, matchKey };
