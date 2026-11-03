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
import { j, y } from "../../../vendor/react/cjs/react.production.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { useRegisterTabsNavigationOwner } from "../design-system/Tabs.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Text, Box } from "../../ink/components/Text.js";
import { ErrorText } from "../ErrorText.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { Dialog } from "../design-system/Dialog.js";
import { TextInput } from "../TextInput.js";

//@ chunk-6rcbehen.js:701-705 sole-consumer
j();
//@ chunk-6rcbehen.js:705-741 sole-consumer
function Oo(_o) {
  return bunStringWidth(_o.label);
}
//@ chunk-6rcbehen.js:741-774 affinity
function Go(jo) {
  return jo !== null;
}
//@ chunk-6rcbehen.js:774-5753 callgraph-fingerprint = AgentsList (0.176)
function AgentsList(t0) {
  let $ = w(107),
    {
      title: title,
      subtitle: subtitle,
      fields: fields,
      values: values,
      onChange: onChange,
      onSubmit: onSubmit,
      onCancel: onCancel,
      submitLabel: submitLabel,
    } = t0,
    I = submitLabel === void 0 ? "Save" : submitLabel,
    f = fields.length + 1,
    [d, h] = y(0),
    Z;
  if ($[0] !== fields[0] || $[1] !== values)
    ((Z = () => {
      let se = fields[0];
      return se?.type === "text" ? (values[se.key] ?? "").length : 0;
    }),
      ($[0] = fields[0]),
      ($[1] = values),
      ($[2] = Z));
  else Z = $[2];
  let [R, _] = y(Z),
    u = d < fields.length ? fields[d] : null,
    Te = u?.type === "text",
    M;
  if ($[3] !== fields) ((M = Math.max(...fields.map(Oo))), ($[3] = fields), ($[4] = M));
  else M = $[4];
  let A = M,
    N;
  if ($[5] !== values)
    ((N = function F(agent_0) {
      if (agent_0.type !== "text") {
        return null;
      }
      let P = values[agent_0.key] ?? "";
      if (agent_0.required && P.trim() === "") {
        return `${agent_0.label} is required`;
      }
      return agent_0.validate ? agent_0.validate(P, values) : null;
    }),
      ($[5] = values),
      ($[6] = N));
  else N = $[6];
  let F = N,
    Re;
  if ($[7] !== F || $[8] !== fields)
    ((Re = fields.map(F).find(Go)), ($[7] = F), ($[8] = fields), ($[9] = Re));
  else Re = $[9];
  let b = Re,
    E;
  if ($[10] !== fields || $[11] !== d || $[12] !== f || $[13] !== values)
    ((E = function m(Se) {
      let max = Math.max(0, Math.min(f - 1, Se));
      if (max === d) {
        return;
      }
      h(max);
      let Ze = fields[max];
      if (Ze?.type === "text") _((values[Ze.key] ?? "").length);
    }),
      ($[10] = fields),
      ($[11] = d),
      ($[12] = f),
      ($[13] = values),
      ($[14] = E));
  else E = $[14];
  let m = E,
    _e;
  if ($[15] !== b || $[16] !== onSubmit)
    ((_e = function D() {
      if (b) {
        return;
      }
      onSubmit();
    }),
      ($[15] = b),
      ($[16] = onSubmit),
      ($[17] = _e));
  else _e = $[17];
  let D = _e,
    je;
  if ($[18] !== u || $[19] !== onChange || $[20] !== values)
    ((je = function ee($o) {
      if (u?.type !== "select") {
        return;
      }
      let options = u.options;
      let zo = values[u.key] ?? options[0]?.value ?? "";
      let index = options.findIndex((agent_1) => agent_1.value === zo);
      let Ke = options[(index + $o + options.length) % options.length];
      if (Ke) onChange(u.key, Ke.value);
    }),
      ($[18] = u),
      ($[19] = onChange),
      ($[20] = values),
      ($[21] = je));
  else je = $[21];
  let ee = je,
    de,
    ue;
  if ($[22] !== d || $[23] !== m)
    ((ue = () => m(d - 1)), (de = () => m(d + 1)), ($[22] = d), ($[23] = m), ($[24] = de), ($[25] = ue));
  else ((de = $[24]), (ue = $[25]));
  let ce;
  if ($[26] !== d || $[27] !== m || $[28] !== f || $[29] !== D)
    ((ce = () => {
      if (d === f - 1) D();
      else m(d + 1);
    }),
      ($[26] = d),
      ($[27] = m),
      ($[28] = f),
      ($[29] = D),
      ($[30] = ce));
  else ce = $[30];
  let eo;
  if ($[31] !== onCancel || $[32] !== de || $[33] !== ce || $[34] !== ue)
    ((eo = { "select:previous": ue, "select:next": de, "select:accept": ce, "select:cancel": onCancel }),
      ($[31] = onCancel),
      ($[32] = de),
      ($[33] = ce),
      ($[34] = ue),
      ($[35] = eo));
  else eo = $[35];
  const Ae = !Te;
  let oo;
  if ($[36] !== Ae) ((oo = { context: "Select", isActive: Ae }), ($[36] = Ae), ($[37] = oo));
  else oo = $[37];
  MessageActionsKeybindings(eo, oo);
  let to;
  if ($[38] === MEMO_CACHE_SENTINEL) ((to = { context: "Settings" }), ($[38] = to));
  else to = $[38];
  (useKeybinding("confirm:no", onCancel, to), useRegisterTabsNavigationOwner());
  let lo;
  if ($[39] !== ee)
    ((lo = { "tabs:previous": () => ee(-1), "tabs:next": () => ee(1) }), ($[39] = ee), ($[40] = lo));
  else lo = $[40];
  const Ue = u?.type === "select";
  let io;
  if ($[41] !== Ue) ((io = { context: "Tabs", isActive: Ue }), ($[41] = Ue), ($[42] = io));
  else io = $[42];
  MessageActionsKeybindings(lo, io);
  let O = u ? (values[u.key] ?? "") : "",
    no;
  if ($[43] !== u || $[44] !== O || $[45] !== values)
    ((no = u?.type === "text" && u.validate ? u.validate(O, values) : null),
      ($[43] = u),
      ($[44] = O),
      ($[45] = values),
      ($[46] = no));
  else no = $[46];
  let L = no,
    ro;
  if ($[47] !== L || $[48] !== u || $[49] !== O || $[50] !== values)
    ((ro = !L && u?.hint ? u.hint(O, values) : void 0),
      ($[47] = L),
      ($[48] = u),
      ($[49] = O),
      ($[50] = values),
      ($[51] = ro));
  else ro = $[51];
  let ae = ro,
    fe;
  if (
    $[52] !== R ||
    $[53] !== fields ||
    $[54] !== d ||
    $[55] !== A ||
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
      $[65] !== A ||
      $[66] !== m ||
      $[67] !== onCancel ||
      $[68] !== onChange ||
      $[69] !== D ||
      $[70] !== values
    )
      ((G = (me, oe) => {
        let Xo = oe === d;
        let Yo = values[me.key] ?? "";
        return e(
          AgentFormFieldRow,
          {
            field: me,
            value: Yo,
            isFocused: Xo,
            labelWidth: A,
            cursor: R,
            setCursor: _,
            onChange: (Zo) => onChange(me.key, Zo),
            onCancel: onCancel,
            onUp: () => m(oe - 1),
            onDown: () => m(oe + 1),
            onEnter: () => {
              if (oe === fields.length - 1) D();
              else m(oe + 1);
            },
          },
          me.key,
        );
      }),
        ($[62] = R),
        ($[63] = fields.length),
        ($[64] = d),
        ($[65] = A),
        ($[66] = m),
        ($[67] = onCancel),
        ($[68] = onChange),
        ($[69] = D),
        ($[70] = values),
        ($[71] = G));
    else G = $[71];
    fe = fields.map(G);
    (($[52] = R),
      ($[53] = fields),
      ($[54] = d),
      ($[55] = A),
      ($[56] = m),
      ($[57] = onCancel),
      ($[58] = onChange),
      ($[59] = D),
      ($[60] = values),
      ($[61] = fe));
  } else fe = $[61];
  const G = d === f - 1 ? "suggestion" : void 0,
    Pe = d === f - 1 ? re.pointer : " ";
  let pe;
  if ($[72] !== G || $[73] !== Pe)
    ((pe = r(Text, { color: G, children: [Pe, " "] })), ($[72] = G), ($[73] = Pe), ($[74] = pe));
  else pe = $[74];
  const qe = d === f - 1,
    Le = !!b;
  let ve;
  if ($[75] !== I || $[76] !== qe || $[77] !== Le)
    ((ve = e(Text, { bold: qe, dimColor: Le, children: I })),
      ($[75] = I),
      ($[76] = qe),
      ($[77] = Le),
      ($[78] = ve));
  else ve = $[78];
  let ge;
  if ($[79] !== b || $[80] !== d || $[81] !== f)
    ((ge = b && d === f - 1 && r(Text, { color: "error", children: [" \xB7 ", b] })),
      ($[79] = b),
      ($[80] = d),
      ($[81] = f),
      ($[82] = ge));
  else ge = $[82];
  let be;
  if ($[83] !== pe || $[84] !== ve || $[85] !== ge)
    ((be = r(Box, { marginTop: 1, children: [pe, ve, ge] })),
      ($[83] = pe),
      ($[84] = ve),
      ($[85] = ge),
      ($[86] = be));
  else be = $[86];
  let Ce;
  if ($[87] !== L || $[88] !== ae)
    ((Ce = e(Box, {
      marginTop: 1,
      minHeight: 1,
      children: L
        ? e(ErrorText, { error: L })
        : ae
          ? e(Text, { dimColor: !0, children: ae })
          : e(Text, { children: " " }),
    })),
      ($[87] = L),
      ($[88] = ae),
      ($[89] = Ce));
  else Ce = $[89];
  let so;
  if ($[90] === MEMO_CACHE_SENTINEL)
    ((so = e(KeyboardShortcutHint, { chord: ["up", "down"], action: "move" })), ($[90] = so));
  else so = $[90];
  let he;
  if ($[91] !== u?.type)
    ((he = u?.type === "select" && e(KeyboardShortcutHint, { chord: ["left", "right"], action: "change" })),
      ($[91] = u?.type),
      ($[92] = he));
  else he = $[92];
  let uo, co;
  if ($[93] === MEMO_CACHE_SENTINEL)
    ((uo = e(KeyboardShortcutHint, { chord: "enter", action: "continue" })),
      (co = e(KeyboardShortcutHint, { chord: "escape", action: "cancel" })),
      ($[93] = uo),
      ($[94] = co));
  else ((uo = $[93]), (co = $[94]));
  let Fe;
  if ($[95] !== he)
    ((Fe = e(Box, {
      marginTop: 1,
      children: e(Text, { dimColor: !0, children: r(Byline, { children: [so, he, uo, co] }) }),
    })),
      ($[95] = he),
      ($[96] = Fe));
  else Fe = $[96];
  let ye;
  if ($[97] !== fe || $[98] !== be || $[99] !== Ce || $[100] !== Fe)
    ((ye = r(Box, { flexDirection: "column", children: [fe, be, Ce, Fe] })),
      ($[97] = fe),
      ($[98] = be),
      ($[99] = Ce),
      ($[100] = Fe),
      ($[101] = ye));
  else ye = $[101];
  let ao;
  if ($[102] !== onCancel || $[103] !== subtitle || $[104] !== ye || $[105] !== title)
    ((ao = e(Dialog, {
      title: title,
      subtitle: subtitle,
      onCancel: onCancel,
      hideInputGuide: !0,
      isCancelActive: !1,
      children: ye,
    })),
      ($[102] = onCancel),
      ($[103] = subtitle),
      ($[104] = ye),
      ($[105] = title),
      ($[106] = ao));
  else ao = $[106];
  return ao;
}
/**
 * 代理表单中的一行字段：左侧对齐标签与必填星号，select 字段显示 ◀ 值 ▶ 并左右切换，text 字段显示可编辑输入框；处理上下移动、回车与取消。
 */
//@ chunk-6rcbehen.js:5753-7919 sole-consumer
function AgentFormFieldRow(props) {
  let $ = w(44),
    {
      field: field,
      value: c,
      isFocused: isFocused,
      labelWidth: labelWidth,
      cursor: cursor,
      setCursor: setCursor,
      onChange: onChange,
      onCancel: onCancel,
      onUp: onUp,
      onDown: onDown,
      onEnter: onEnter,
    } = props,
    o;
  if ($[0] !== field.label || $[1] !== labelWidth)
    ((o = " ".repeat(Math.max(0, labelWidth - bunStringWidth(field.label)))),
      ($[0] = field.label),
      ($[1] = labelWidth),
      ($[2] = o));
  else o = $[2];
  let Z = o,
    se;
  if ($[3] !== field.required || $[4] !== field.type || $[5] !== c)
    ((se = field.type === "text" && field.required && c.trim() === ""),
      ($[3] = field.required),
      ($[4] = field.type),
      ($[5] = c),
      ($[6] = se));
  else se = $[6];
  let R = se;
  const _ = isFocused ? "suggestion" : void 0,
    u = isFocused ? re.pointer : " ";
  let Te;
  if ($[7] !== _ || $[8] !== u)
    ((Te = r(Text, { color: _, children: [u, " "] })), ($[7] = _), ($[8] = u), ($[9] = Te));
  else Te = $[9];
  let M = Te;
  const A = !isFocused;
  let N;
  if ($[10] !== R) ((N = R ? e(Text, { color: "error", children: "*" }) : " "), ($[10] = R), ($[11] = N));
  else N = $[11];
  let U;
  if ($[12] !== field.label || $[13] !== Z || $[14] !== A || $[15] !== N)
    ((U = r(Text, { dimColor: A, children: [field.label, N, Z, " "] })),
      ($[12] = field.label),
      ($[13] = Z),
      ($[14] = A),
      ($[15] = N),
      ($[16] = U));
  else U = $[16];
  let P = U;
  if (field.type === "select") {
    let F;
    if ($[17] !== field.options || $[18] !== c)
      ((F = field.options.find((option) => option.value === c) ?? field.options[0]),
        ($[17] = field.options),
        ($[18] = c),
        ($[19] = F));
    else F = $[19];
    let b = F;
    let E;
    if ($[20] !== isFocused || $[21] !== b?.label || $[22] !== c)
      ((E = isFocused
        ? r(Text, {
            children: [
              r(Text, { dimColor: !0, children: [re.triangleLeft, " "] }),
              b?.label ?? c,
              r(Text, { dimColor: !0, children: [" ", re.triangleRight] }),
            ],
          })
        : e(Text, { children: b?.label ?? c })),
        ($[20] = isFocused),
        ($[21] = b?.label),
        ($[22] = c),
        ($[23] = E));
    else E = $[23];
    let Se;
    if ($[24] !== P || $[25] !== M || $[26] !== E)
      ((Se = r(Box, { children: [M, P, E] })), ($[24] = P), ($[25] = M), ($[26] = E), ($[27] = Se));
    else Se = $[27];
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
  )
    ((F = isFocused
      ? e(TextInput, {
          value: c,
          onChange: onChange,
          onSubmit: () => onEnter(),
          onExit: onCancel,
          onHistoryUp: onUp,
          onHistoryDown: onDown,
          placeholder: field.placeholder,
          mask: field.mask,
          columns: 60,
          cursorOffset: cursor,
          onChangeCursorOffset: setCursor,
          disableCursorMovementForUpDownKeys: !0,
          disableEscapeDoublePress: !0,
          focus: !0,
          showCursor: !0,
        })
      : c
        ? e(Text, { children: field.mask ? field.mask.repeat(Math.min(bunStringWidth(c), 60)) : c })
        : e(Text, { dimColor: !0, children: field.placeholder ?? "" })),
      ($[28] = cursor),
      ($[29] = field.mask),
      ($[30] = field.placeholder),
      ($[31] = isFocused),
      ($[32] = onCancel),
      ($[33] = onChange),
      ($[34] = onDown),
      ($[35] = onEnter),
      ($[36] = onUp),
      ($[37] = setCursor),
      ($[38] = c),
      ($[39] = F));
  else F = $[39];
  let E;
  if ($[40] !== P || $[41] !== M || $[42] !== F)
    ((E = r(Box, { children: [M, P, F] })), ($[40] = P), ($[41] = M), ($[42] = F), ($[43] = E));
  else E = $[43];
  return E;
}

export { AgentsList };
