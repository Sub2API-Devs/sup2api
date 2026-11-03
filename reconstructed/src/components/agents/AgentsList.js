/**
 * components/agents/AgentsList.tsx
 *
 * 子代理列表与表单字段（选择/必填校验）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/AgentsList.tsx
 * pieces: chunk-6rcbehen.js (5)
 * attribution: sole-consumer 3, affinity 1, callgraph-fingerprint 1
 */
import { init_react_production, y } from "../../../vendor/react/cjs/react.production.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { useRegisterTabsNavigationOwner } from "../design-system/Tabs.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Text, Box } from "../../ink/components/Text.js";
import { ErrorText } from "../ErrorText.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { Dialog } from "../design-system/Dialog.js";
import { TextInput } from "../TextInput.js";

//@ chunk-6rcbehen.js:701-705 sole-consumer
init_react_production();
//@ chunk-6rcbehen.js:705-741 sole-consumer
function labelWidth(_o) {
  return bunStringWidth(_o.label);
}
//@ chunk-6rcbehen.js:741-774 affinity
function isNotNull_2(jo) {
  return jo !== null;
}
//@ chunk-6rcbehen.js:774-5753 callgraph-fingerprint = AgentsList (0.176)
function AgentsList(props) {
  let $ = w(107);
  let { title, subtitle, fields, values, onChange, onSubmit, onCancel, submitLabel } = props;
  let children = submitLabel === undefined ? "Save" : submitLabel;
  let f = fields.length + 1;
  let [d, h] = y(0);
  let Z;
  if ($[0] !== fields[0] || $[1] !== values) {
    Z = () => {
      let se = fields[0];
      return se?.type === "text" ? (values[se.key] ?? "").length : 0;
    };
    $[0] = fields[0];
    $[1] = values;
    $[2] = Z;
  } else Z = $[2];
  let [R, _] = y(Z);
  let u = d < fields.length ? fields[d] : null;
  let Te = u?.type === "text";
  let M;
  if ($[3] !== fields) {
    M = Math.max(...fields.map(labelWidth));
    $[3] = fields;
    $[4] = M;
  } else M = $[4];
  let labelWidth_2 = M;
  let N;
  if ($[5] !== values) {
    N = function F(agent_0) {
      if (agent_0.type !== "text") {
        return null;
      }
      let P = values[agent_0.key] ?? "";
      if (agent_0.required && P.trim() === "") {
        return `${agent_0.label} is required`;
      }
      return agent_0.validate ? agent_0.validate(P, values) : null;
    };
    $[5] = values;
    $[6] = N;
  } else N = $[6];
  let F = N;
  let Re;
  if ($[7] !== F || $[8] !== fields) {
    Re = fields.map(F).find(isNotNull_2);
    $[7] = F;
    $[8] = fields;
    $[9] = Re;
  } else Re = $[9];
  let b = Re;
  let E;
  if ($[10] !== fields || $[11] !== d || $[12] !== f || $[13] !== values) {
    E = function m(Se) {
      let max = Math.max(0, Math.min(f - 1, Se));
      if (max === d) {
        return;
      }
      h(max);
      let Ze = fields[max];
      if (Ze?.type === "text") _((values[Ze.key] ?? "").length);
    };
    $[10] = fields;
    $[11] = d;
    $[12] = f;
    $[13] = values;
    $[14] = E;
  } else E = $[14];
  let m = E;
  let _e;
  if ($[15] !== b || $[16] !== onSubmit) {
    _e = function D() {
      if (b) {
        return;
      }
      onSubmit();
    };
    $[15] = b;
    $[16] = onSubmit;
    $[17] = _e;
  } else _e = $[17];
  let D = _e;
  let je;
  if ($[18] !== u || $[19] !== onChange || $[20] !== values) {
    je = function ee($o) {
      if (u?.type !== "select") {
        return;
      }
      let options = u.options;
      let zo = values[u.key] ?? options[0]?.value ?? "";
      let index = options.findIndex((agent_1) => agent_1.value === zo);
      let Ke = options[(index + $o + options.length) % options.length];
      if (Ke) onChange(u.key, Ke.value);
    };
    $[18] = u;
    $[19] = onChange;
    $[20] = values;
    $[21] = je;
  } else je = $[21];
  let ee = je;
  let de;
  let ue;
  if ($[22] !== d || $[23] !== m) {
    ue = () => m(d - 1);
    de = () => m(d + 1);
    $[22] = d;
    $[23] = m;
    $[24] = de;
    $[25] = ue;
  } else {
    de = $[24];
    ue = $[25];
  }
  let ce;
  if ($[26] !== d || $[27] !== m || $[28] !== f || $[29] !== D) {
    ce = () => {
      if (d === f - 1) D();
      else m(d + 1);
    };
    $[26] = d;
    $[27] = m;
    $[28] = f;
    $[29] = D;
    $[30] = ce;
  } else ce = $[30];
  let eo;
  if ($[31] !== onCancel || $[32] !== de || $[33] !== ce || $[34] !== ue) {
    eo = {
      "select:previous": ue,
      "select:next": de,
      "select:accept": ce,
      "select:cancel": onCancel,
    };
    $[31] = onCancel;
    $[32] = de;
    $[33] = ce;
    $[34] = ue;
    $[35] = eo;
  } else eo = $[35];
  const isActive = !Te;
  let oo;
  if ($[36] !== isActive) {
    oo = {
      context: "Select",
      isActive,
    };
    $[36] = isActive;
    $[37] = oo;
  } else oo = $[37];
  MessageActionsKeybindings(eo, oo);
  let to;
  if ($[38] === MEMO_CACHE_SENTINEL) {
    to = {
      context: "Settings",
    };
    $[38] = to;
  } else to = $[38];
  useKeybinding("confirm:no", onCancel, to);
  useRegisterTabsNavigationOwner();
  let lo;
  if ($[39] !== ee) {
    lo = {
      "tabs:previous": () => ee(-1),
      "tabs:next": () => ee(1),
    };
    $[39] = ee;
    $[40] = lo;
  } else lo = $[40];
  const isActive_2 = u?.type === "select";
  let io;
  if ($[41] !== isActive_2) {
    io = {
      context: "Tabs",
      isActive: isActive_2,
    };
    $[41] = isActive_2;
    $[42] = io;
  } else io = $[42];
  MessageActionsKeybindings(lo, io);
  let O = u ? (values[u.key] ?? "") : "";
  let no;
  if ($[43] !== u || $[44] !== O || $[45] !== values) {
    no = u?.type === "text" && u.validate ? u.validate(O, values) : null;
    $[43] = u;
    $[44] = O;
    $[45] = values;
    $[46] = no;
  } else no = $[46];
  let L = no;
  let ro;
  if ($[47] !== L || $[48] !== u || $[49] !== O || $[50] !== values) {
    ro = !L && u?.hint ? u.hint(O, values) : undefined;
    $[47] = L;
    $[48] = u;
    $[49] = O;
    $[50] = values;
    $[51] = ro;
  } else ro = $[51];
  let ae = ro;
  let fe;
  if (
    $[52] !== R ||
    $[53] !== fields ||
    $[54] !== d ||
    $[55] !== labelWidth_2 ||
    $[56] !== m ||
    $[57] !== onCancel ||
    $[58] !== onChange ||
    $[59] !== D ||
    $[60] !== values
  ) {
    let G;
    if (
      $[62] !== R ||
      $[63] !== fields.length ||
      $[64] !== d ||
      $[65] !== labelWidth_2 ||
      $[66] !== m ||
      $[67] !== onCancel ||
      $[68] !== onChange ||
      $[69] !== D ||
      $[70] !== values
    ) {
      G = (me, oe) => {
        let isFocused = oe === d;
        let value = values[me.key] ?? "";
        return jsxProd_default(
          AgentFormFieldRow,
          {
            field: me,
            value,
            isFocused,
            labelWidth: labelWidth_2,
            cursor: R,
            setCursor: _,
            onChange: (Zo) => onChange(me.key, Zo),
            onCancel,
            onUp: () => m(oe - 1),
            onDown: () => m(oe + 1),
            onEnter: () => {
              if (oe === fields.length - 1) D();
              else m(oe + 1);
            },
          },
          me.key,
        );
      };
      $[62] = R;
      $[63] = fields.length;
      $[64] = d;
      $[65] = labelWidth_2;
      $[66] = m;
      $[67] = onCancel;
      $[68] = onChange;
      $[69] = D;
      $[70] = values;
      $[71] = G;
    } else G = $[71];
    fe = fields.map(G);
    $[52] = R;
    $[53] = fields;
    $[54] = d;
    $[55] = labelWidth_2;
    $[56] = m;
    $[57] = onCancel;
    $[58] = onChange;
    $[59] = D;
    $[60] = values;
    $[61] = fe;
  } else fe = $[61];
  const color = d === f - 1 ? "suggestion" : undefined;
  const pointer = d === f - 1 ? figures_default.pointer : " ";
  let pe;
  if ($[72] !== color || $[73] !== pointer) {
    pe = jsxProd_default_2(Text, {
      color,
      children: [pointer, " "],
    });
    $[72] = color;
    $[73] = pointer;
    $[74] = pe;
  } else pe = $[74];
  const bold = d === f - 1;
  const dimColor = !!b;
  let ve;
  if ($[75] !== children || $[76] !== bold || $[77] !== dimColor) {
    ve = jsxProd_default(Text, {
      bold,
      dimColor,
      children,
    });
    $[75] = children;
    $[76] = bold;
    $[77] = dimColor;
    $[78] = ve;
  } else ve = $[78];
  let ge;
  if ($[79] !== b || $[80] !== d || $[81] !== f) {
    ge =
      b &&
      d === f - 1 &&
      jsxProd_default_2(Text, {
        color: "error",
        children: [" \xB7 ", b],
      });
    $[79] = b;
    $[80] = d;
    $[81] = f;
    $[82] = ge;
  } else ge = $[82];
  let be;
  if ($[83] !== pe || $[84] !== ve || $[85] !== ge) {
    be = jsxProd_default_2(Box, {
      marginTop: 1,
      children: [pe, ve, ge],
    });
    $[83] = pe;
    $[84] = ve;
    $[85] = ge;
    $[86] = be;
  } else be = $[86];
  let Ce;
  if ($[87] !== L || $[88] !== ae) {
    Ce = jsxProd_default(Box, {
      marginTop: 1,
      minHeight: 1,
      children: L
        ? jsxProd_default(ErrorText, {
            error: L,
          })
        : ae
          ? jsxProd_default(Text, {
              dimColor: true,
              children: ae,
            })
          : jsxProd_default(Text, {
              children: " ",
            }),
    });
    $[87] = L;
    $[88] = ae;
    $[89] = Ce;
  } else Ce = $[89];
  let so;
  if ($[90] === MEMO_CACHE_SENTINEL) {
    so = jsxProd_default(KeyboardShortcutHint, {
      chord: ["up", "down"],
      action: "move",
    });
    $[90] = so;
  } else so = $[90];
  let he;
  if ($[91] !== u?.type) {
    he =
      u?.type === "select" &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: ["left", "right"],
        action: "change",
      });
    $[91] = u?.type;
    $[92] = he;
  } else he = $[92];
  let uo;
  let co;
  if ($[93] === MEMO_CACHE_SENTINEL) {
    uo = jsxProd_default(KeyboardShortcutHint, {
      chord: "enter",
      action: "continue",
    });
    co = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "cancel",
    });
    $[93] = uo;
    $[94] = co;
  } else {
    uo = $[93];
    co = $[94];
  }
  let Fe;
  if ($[95] !== he) {
    Fe = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default_2(Byline, {
          children: [so, he, uo, co],
        }),
      }),
    });
    $[95] = he;
    $[96] = Fe;
  } else Fe = $[96];
  let children_2;
  if ($[97] !== fe || $[98] !== be || $[99] !== Ce || $[100] !== Fe) {
    children_2 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [fe, be, Ce, Fe],
    });
    $[97] = fe;
    $[98] = be;
    $[99] = Ce;
    $[100] = Fe;
    $[101] = children_2;
  } else children_2 = $[101];
  let ao;
  if ($[102] !== onCancel || $[103] !== subtitle || $[104] !== children_2 || $[105] !== title) {
    ao = jsxProd_default(Dialog, {
      title,
      subtitle,
      onCancel,
      hideInputGuide: true,
      isCancelActive: false,
      children: children_2,
    });
    $[102] = onCancel;
    $[103] = subtitle;
    $[104] = children_2;
    $[105] = title;
    $[106] = ao;
  } else ao = $[106];
  return ao;
}
//@ chunk-6rcbehen.js:5753-7919 sole-consumer
/**
 * 代理表单中的一行字段：左侧对齐标签与必填星号，select 字段显示 ◀ 值 ▶ 并左右切换，text 字段显示可编辑输入框；处理上下移动、回车与取消。
 */
function AgentFormFieldRow(props) {
  let $ = w(44);
  let {
    field,
    value: c,
    isFocused,
    labelWidth,
    cursor,
    setCursor,
    onChange,
    onCancel,
    onUp,
    onDown,
    onEnter,
  } = props;
  let o;
  if ($[0] !== field.label || $[1] !== labelWidth) {
    o = " ".repeat(Math.max(0, labelWidth - bunStringWidth(field.label)));
    $[0] = field.label;
    $[1] = labelWidth;
    $[2] = o;
  } else o = $[2];
  let Z = o;
  let se;
  if ($[3] !== field.required || $[4] !== field.type || $[5] !== c) {
    se = field.type === "text" && field.required && c.trim() === "";
    $[3] = field.required;
    $[4] = field.type;
    $[5] = c;
    $[6] = se;
  } else se = $[6];
  let R = se;
  const color = isFocused ? "suggestion" : undefined;
  const pointer = isFocused ? figures_default.pointer : " ";
  let Te;
  if ($[7] !== color || $[8] !== pointer) {
    Te = jsxProd_default_2(Text, {
      color,
      children: [pointer, " "],
    });
    $[7] = color;
    $[8] = pointer;
    $[9] = Te;
  } else Te = $[9];
  let M = Te;
  const dimColor = !isFocused;
  let N;
  if ($[10] !== R) {
    N = R
      ? jsxProd_default(Text, {
          color: "error",
          children: "*",
        })
      : " ";
    $[10] = R;
    $[11] = N;
  } else N = $[11];
  let U;
  if ($[12] !== field.label || $[13] !== Z || $[14] !== dimColor || $[15] !== N) {
    U = jsxProd_default_2(Text, {
      dimColor,
      children: [field.label, N, Z, " "],
    });
    $[12] = field.label;
    $[13] = Z;
    $[14] = dimColor;
    $[15] = N;
    $[16] = U;
  } else U = $[16];
  let P = U;
  if (field.type === "select") {
    let F;
    if ($[17] !== field.options || $[18] !== c) {
      F = field.options.find((option) => option.value === c) ?? field.options[0];
      $[17] = field.options;
      $[18] = c;
      $[19] = F;
    } else F = $[19];
    let b = F;
    let E;
    if ($[20] !== isFocused || $[21] !== b?.label || $[22] !== c) {
      E = isFocused
        ? jsxProd_default_2(Text, {
            children: [
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [figures_default.triangleLeft, " "],
              }),
              b?.label ?? c,
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [" ", figures_default.triangleRight],
              }),
            ],
          })
        : jsxProd_default(Text, {
            children: b?.label ?? c,
          });
      $[20] = isFocused;
      $[21] = b?.label;
      $[22] = c;
      $[23] = E;
    } else E = $[23];
    let Se;
    if ($[24] !== P || $[25] !== M || $[26] !== E) {
      Se = jsxProd_default_2(Box, {
        children: [M, P, E],
      });
      $[24] = P;
      $[25] = M;
      $[26] = E;
      $[27] = Se;
    } else Se = $[27];
    return Se;
  }
  let F;
  if (
    $[28] !== cursor ||
    $[29] !== field.mask ||
    $[30] !== field.placeholder ||
    $[31] !== isFocused ||
    $[32] !== onCancel ||
    $[33] !== onChange ||
    $[34] !== onDown ||
    $[35] !== onEnter ||
    $[36] !== onUp ||
    $[37] !== setCursor ||
    $[38] !== c
  ) {
    F = isFocused
      ? jsxProd_default(TextInput, {
          value: c,
          onChange,
          onSubmit: () => onEnter(),
          onExit: onCancel,
          onHistoryUp: onUp,
          onHistoryDown: onDown,
          placeholder: field.placeholder,
          mask: field.mask,
          columns: 60,
          cursorOffset: cursor,
          onChangeCursorOffset: setCursor,
          disableCursorMovementForUpDownKeys: true,
          disableEscapeDoublePress: true,
          focus: true,
          showCursor: true,
        })
      : c
        ? jsxProd_default(Text, {
            children: field.mask ? field.mask.repeat(Math.min(bunStringWidth(c), 60)) : c,
          })
        : jsxProd_default(Text, {
            dimColor: true,
            children: field.placeholder ?? "",
          });
    $[28] = cursor;
    $[29] = field.mask;
    $[30] = field.placeholder;
    $[31] = isFocused;
    $[32] = onCancel;
    $[33] = onChange;
    $[34] = onDown;
    $[35] = onEnter;
    $[36] = onUp;
    $[37] = setCursor;
    $[38] = c;
    $[39] = F;
  } else F = $[39];
  let E;
  if ($[40] !== P || $[41] !== M || $[42] !== F) {
    E = jsxProd_default_2(Box, {
      children: [M, P, F],
    });
    $[40] = P;
    $[41] = M;
    $[42] = F;
    $[43] = E;
  } else E = $[43];
  return E;
}
export { AgentsList };
