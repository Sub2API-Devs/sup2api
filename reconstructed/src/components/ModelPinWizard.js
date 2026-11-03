/**
 * components/ModelPinWizard.tsx
 *
 * 2.1.316 新增：模型固定向导。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-095ptjmr.js (10)
 * attribution: placement 10
 */
import { env } from "../utils/env.js";
import { j, Q, y, P } from "../../vendor/react/cjs/react.production.js";
import { useWizard } from "./wizard/useWizard.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ensure1mSuffix } from "../utils/model/model.js";
import { WizardDialogLayout } from "./wizard/WizardDialogLayout.js";
import { Box, Text } from "../ink/components/Text.js";
import { TIER_LABELS } from "../utils/model/thirdPartyDefaultFallbacks.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { supports1mBeta, modelHasNative1MContext } from "../utils/model/contextWindow1m.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { StatusIcon } from "./design-system/StatusIcon.js";
import { Spinner } from "./Spinner.js";
import { Lt } from "../utils/model/modelIds.js";

//@ chunk-095ptjmr.js:3989-4030 placement
var mB = ["sonnet", "opus", "haiku", "fable"];
//@ chunk-095ptjmr.js:4030-4204 placement
function readEnvModelPins() {
  return {
    sonnet: env.ANTHROPIC_DEFAULT_SONNET_MODEL,
    opus: env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    haiku: env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
    fable: env.ANTHROPIC_DEFAULT_FABLE_MODEL,
  };
}
//@ chunk-095ptjmr.js:4204-4208 placement
j();
/**
 * 第三方提供方（Bedrock/Vertex）配置向导中的"固定模型版本"步骤：对 sonnet/opus/haiku/fable 各探测候选模型，可一键固定可用模型（可选 1M 上下文）、手动逐档选择或跳过使用默认。
 */
//@ chunk-095ptjmr.js:4208-6032 placement
function ModelPinStep({ provider: provider, onPins: onPins }) {
  let { goBack: goBack, goNext: goNext, wizardData: wizardData } = useWizard(),
    t = Q(() => provider.resolveTierDefaults(wizardData), []),
    c = Q(() => readEnvModelPins(), []),
    [l, d] = y(() => Object.fromEntries(mB.map((a) => [a, c[a] ?? t[a].auto ?? t[a].fallback]))),
    [x, h] = y({ sonnet: "pending", opus: "pending", haiku: "pending", fable: "pending" }),
    [R, z] = y("summary"),
    mapped = mB.map((a) =>
      e(
        ModelProbe,
        {
          candidate: l[a],
          probe: (k) => provider.probe(wizardData, k),
          onState: (k) => h((B) => ({ ...B, [a]: k })),
        },
        a,
      ),
    );
  if (R !== "summary") {
    let picking = R.picking;
    return r(Fragment, {
      children: [
        mapped,
        e(
          TierModelPicker,
          {
            tier: picking,
            provider: provider,
            wizardData: wizardData,
            fallback: t[picking].fallback,
            current: l[picking],
            existingPin: c[picking],
            onPick: (k) => {
              d((F) => ({ ...F, [picking]: k }));
              let index = mB.indexOf(picking),
                J = mB[index + 1];
              z(J ? { picking: J } : "summary");
            },
            onCancel: () => z("summary"),
          },
          picking,
        ),
      ],
    });
  }
  let v = mB.every((a) => x[a] !== "pending") && mB.some((a) => x[a] !== "pending" && x[a].ok),
    u =
      v &&
      mB.some((a) => {
        let k = x[a];
        return k !== "pending" && k.ok && Ie(l[a]);
      }),
    m = (a) => {
      if (a === "manual") {
        z({ picking: "sonnet" });
        return;
      }
      if (a === "pin" || a === "pin1m") {
        let k = (B) => {
          let J = x[B];
          if (J === "pending" || !J.ok) return;
          let F = l[B];
          return a === "pin1m" && Ie(F) ? ensure1mSuffix(F) : F;
        };
        onPins({ pinSonnet: k("sonnet"), pinOpus: k("opus"), pinHaiku: k("haiku"), pinFable: k("fable") });
      } else onPins({ pinSonnet: void 0, pinOpus: void 0, pinHaiku: void 0, pinFable: void 0 });
      goNext();
    };
  return r(Fragment, {
    children: [
      mapped,
      e(WizardDialogLayout, {
        subtitle: "Pin model versions",
        children: r(Box, {
          flexDirection: "column",
          gap: 1,
          children: [
            e(Text, { children: provider.intro }),
            r(Box, {
              flexDirection: "column",
              children: [
                e(Text, { dimColor: !0, children: "Each candidate is tested with a one-token request:" }),
                mB.map((a) =>
                  e(
                    ModelProbeStatusRow,
                    { label: TIER_LABELS[a], modelId: l[a], state: x[a], reasonLabel: provider.reasonLabel },
                    a,
                  ),
                ),
              ],
            }),
            e(ModelSelector, {
              options: [
                ...(v ? [{ label: "Pin the working models", value: "pin" }] : []),
                ...(u ? [{ label: "Pin the working models with 1M context", value: "pin1m" }] : []),
                { label: "Choose different models\u2026", value: "manual" },
                { label: "Skip \u2014 use Claude Code defaults (auto-updates)", value: "skip" },
              ],
              onChange: m,
              onCancel: goBack,
            }),
          ],
        }),
      }),
    ],
  });
}
//@ chunk-095ptjmr.js:6032-6087 placement
function Ie(f) {
  return supports1mBeta(f) && !modelHasNative1MContext(f, { byItsOwnName: !0 });
}
//@ chunk-095ptjmr.js:6140-6420 placement
function ModelProbe(f) {
  let b = w(6),
    { candidate: candidate, probe: probe, onState: onState } = f,
    t;
  if (b[0] !== candidate || b[1] !== onState || b[2] !== probe)
    ((t = () => {
      let c = !1;
      return (
        onState("pending"),
        probe(candidate).then((l) => {
          if (!c) onState(l);
        }),
        () => {
          c = !0;
        }
      );
    }),
      (b[0] = candidate),
      (b[1] = onState),
      (b[2] = probe),
      (b[3] = t));
  else t = b[3];
  let d;
  if (b[4] !== candidate) ((d = [candidate]), (b[4] = candidate), (b[5] = d));
  else d = b[5];
  return (P(t, d), null);
}
/**
 * 某一档模型的手动选择：列出候选（含默认、当前、已固定），逐个探测，结果出来后可用的排前并预选。
 */
//@ chunk-095ptjmr.js:6420-7500 placement
function TierModelPicker({
  tier: tier,
  provider: provider,
  wizardData: wizardData,
  fallback: fallback,
  current: b,
  existingPin: existingPin,
  onPick: onPick,
  onCancel: onCancel,
}) {
  let d = Q(() => {
      let listTierCandidates = provider.listTierCandidates(tier, wizardData);
      for (let m of [fallback, b, existingPin])
        if (m && !listTierCandidates.includes(m)) listTierCandidates.push(m);
      return listTierCandidates;
    }, [tier, fallback, b, existingPin]),
    [x, h] = y(() => Object.fromEntries(d.map((u) => [u, "pending"])));
  P(() => {
    let u = !1;
    for (let m of d)
      provider.probe(wizardData, m).then((a) => {
        if (!u) h((k) => ({ ...k, [m]: a }));
      });
    return () => {
      u = !0;
    };
  }, []);
  let all = d.every((u) => x[u] !== "pending"),
    z = (u) => {
      let m = x[u];
      return m !== void 0 && m !== "pending" && m.ok;
    },
    A = Q(() => {
      if (!all) return d;
      return [...d].sort((u, m) => (z(u) ? 0 : 1) - (z(m) ? 0 : 1));
    }, [d, x, all]),
    mapped = A.map((u) => ({
      value: u,
      label: e(CandidateStatusRow, {
        id: u,
        state: x[u] ?? "pending",
        reasonLabel: provider.reasonLabel,
        suffix:
          u === existingPin
            ? "(currently pinned)"
            : u === fallback
              ? "(built-in default)"
              : u === b
                ? "(selected)"
                : void 0,
      }),
    })),
    v = () => {
      for (let u of provider.preferOnSettle ?? []) {
        let m = u === "current" ? b : fallback;
        if (z(m)) return m;
      }
      return A.find(z);
    };
  return e(WizardDialogLayout, {
    subtitle: `Pin ${TIER_LABELS[tier]} model`,
    children: r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        e(Text, { dimColor: !0, children: provider.pickerSubtitle(tier, wizardData) }),
        e(
          ModelSelector,
          { options: mapped, defaultValue: all ? v() : b, onChange: onPick, onCancel: onCancel },
          all ? "settled" : "pending",
        ),
      ],
    }),
  });
}
/**
 * （误归此处）模型档位候选的状态行组件：pending/ok/error 三态图标 + id + 后缀 + 失败原因。
 */
//@ chunk-095ptjmr.js:7500-8456 placement = waitForInitialization (0.633)
function CandidateStatusRow(f) {
  let t = w(19),
    { id: id, state: state, suffix: suffix, reasonLabel: reasonLabel } = f;
  if (state === "pending") {
    let c;
    if (t[0] === MEMO_CACHE_SENTINEL) ((c = e(StatusIcon, { status: "pending", withSpace: !0 })), (t[0] = c));
    else c = t[0];
    let l;
    if (t[1] !== suffix)
      ((l = suffix && r(Text, { dimColor: !0, children: [" ", suffix] })), (t[1] = suffix), (t[2] = l));
    else l = t[2];
    let d;
    if (t[3] !== id || t[4] !== l)
      ((d = r(Text, { children: [c, id, l] })), (t[3] = id), (t[4] = l), (t[5] = d));
    else d = t[5];
    return d;
  }
  if (state.ok) {
    let c;
    if (t[6] === MEMO_CACHE_SENTINEL) ((c = e(StatusIcon, { status: "success", withSpace: !0 })), (t[6] = c));
    else c = t[6];
    let l;
    if (t[7] !== suffix)
      ((l = suffix && r(Text, { dimColor: !0, children: [" ", suffix] })), (t[7] = suffix), (t[8] = l));
    else l = t[8];
    let d;
    if (t[9] !== id || t[10] !== l)
      ((d = r(Text, { children: [c, id, l] })), (t[9] = id), (t[10] = l), (t[11] = d));
    else d = t[11];
    return d;
  }
  let c;
  if (t[12] === MEMO_CACHE_SENTINEL) ((c = e(StatusIcon, { status: "error", withSpace: !0 })), (t[12] = c));
  else c = t[12];
  const l = suffix && ` ${suffix}`,
    d = reasonLabel[state.reason];
  let x;
  if (t[13] !== d) ((x = r(Text, { color: "error", children: ["(", d, ")"] })), (t[13] = d), (t[14] = x));
  else x = t[14];
  let h;
  if (t[15] !== id || t[16] !== l || t[17] !== x)
    ((h = r(Text, { dimColor: !0, children: [c, id, l, " ", x] })),
      (t[15] = id),
      (t[16] = l),
      (t[17] = x),
      (t[18] = h));
  else h = t[18];
  return h;
}
/**
 * 模型探测状态行：pending 显示 spinner，成功绿色显示模型 id，失败显示原因。
 */
//@ chunk-095ptjmr.js:8456-9639 placement
function ModelProbeStatusRow(f) {
  let t = w(26),
    { label: label, modelId: modelId, state: state, reasonLabel: reasonLabel } = f;
  if (state === "pending") {
    let c, l;
    if (t[0] === MEMO_CACHE_SENTINEL)
      ((c = e(Text, { children: "  " })), (l = e(Spinner, {})), (t[0] = c), (t[1] = l));
    else ((c = t[0]), (l = t[1]));
    let d;
    if (t[2] !== label) ((d = label.padEnd(7)), (t[2] = label), (t[3] = d));
    else d = t[3];
    let x;
    if (t[4] !== modelId || t[5] !== d)
      ((x = r(Box, { children: [c, l, r(Text, { children: [" ", d, "\u2192 ", modelId] })] })),
        (t[4] = modelId),
        (t[5] = d),
        (t[6] = x));
    else x = t[6];
    return x;
  }
  if (state.ok) {
    let c;
    if (t[7] === MEMO_CACHE_SENTINEL) ((c = e(StatusIcon, { status: "success", withSpace: !0 })), (t[7] = c));
    else c = t[7];
    let l;
    if (t[8] !== label) ((l = label.padEnd(7)), (t[8] = label), (t[9] = l));
    else l = t[9];
    let d;
    if (t[10] !== modelId)
      ((d = e(Text, { color: "success", children: modelId })), (t[10] = modelId), (t[11] = d));
    else d = t[11];
    let x;
    if (t[12] !== l || t[13] !== d)
      ((x = r(Text, { children: ["  ", c, l, "\u2192 ", d] })), (t[12] = l), (t[13] = d), (t[14] = x));
    else x = t[14];
    return x;
  }
  let c;
  if (t[15] === MEMO_CACHE_SENTINEL) ((c = e(StatusIcon, { status: "error", withSpace: !0 })), (t[15] = c));
  else c = t[15];
  let l;
  if (t[16] !== label) ((l = label.padEnd(7)), (t[16] = label), (t[17] = l));
  else l = t[17];
  let d;
  if (t[18] !== modelId) ((d = e(Text, { dimColor: !0, children: modelId })), (t[18] = modelId), (t[19] = d));
  else d = t[19];
  const x = reasonLabel[state.reason];
  let h;
  if (t[20] !== x) ((h = r(Text, { color: "error", children: ["(", x, ")"] })), (t[20] = x), (t[21] = h));
  else h = t[21];
  let R;
  if (t[22] !== l || t[23] !== d || t[24] !== h)
    ((R = r(Text, { children: ["  ", c, l, "\u2192 ", d, " ", h] })),
      (t[22] = l),
      (t[23] = d),
      (t[24] = h),
      (t[25] = R));
  else R = t[25];
  return R;
}
/**
 * 用一次 1 token 请求探测模型可用性：创建客户端失败用 g 映射原因；401→auth、403→permission、400/404→model、429 视为可用、无状态码→network。
 */
//@ chunk-095ptjmr.js:9639-10088 placement
async function probeModelAccess(f, o, g) {
  let p;
  try {
    p = await f();
  } catch (error) {
    return { ok: !1, reason: g(error) };
  }
  try {
    return (
      await p.messages.create({ model: Lt(o), max_tokens: 1, messages: [{ role: "user", content: "." }] }),
      { ok: !0 }
    );
  } catch (error) {
    let t = error?.status;
    if (t === 401) return { ok: !1, reason: "auth" };
    if (t === 403) return { ok: !1, reason: "permission" };
    if (t === 400 || t === 404) return { ok: !1, reason: "model" };
    if (t === 429) return { ok: !0 };
    if (t === void 0) return { ok: !1, reason: "network" };
    return { ok: !1, reason: "other" };
  }
}

export { probeModelAccess, mB, ModelPinStep };
