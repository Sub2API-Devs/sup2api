/**
 * commands/plugin/PluginOptionsDialog.tsx
 *
 * 插件选项配置对话框
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/PluginOptionsDialog.tsx
 * pieces: chunk-ca06bv0t.js (3)
 * attribution: affinity 1, fingerprint 1, callgraph-fingerprint 1
 */
import {
  firstLine,
  pluginUserConfigValues,
  userConfigFieldParser,
} from "../../utils/plugins/pluginDisplayMetadata.js";
import { getOwn } from "../../utils/objectSafety.js";
import { h7e, Gan } from "../../utils/plugins/pluginConfigEnv.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y } from "../../../vendor/react/cjs/react.production.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { AgentsList } from "../../components/agents/AgentsList.js";

//@ chunk-ca06bv0t.js:3186-3228 affinity
function ot(Be) {
  return { label: Be, value: Be };
}
//@ chunk-ca06bv0t.js:3228-3596 fingerprint = buildFinalValues (0.825)
function buildFinalValues(fields, collected, configSchema, initialValues) {
  let finalValues = {};
  for (let fieldKey of fields) {
    let schema = configSchema[fieldKey],
      c = firstLine(getOwn(collected, fieldKey) ?? "");
    if (c === "") {
      if (schema?.sensitive === !0 && getOwn(initialValues ?? {}, fieldKey) !== void 0) continue;
      if (schema?.type === "number") continue;
      if (schema?.required !== !0 && getOwn(initialValues ?? {}, fieldKey) === void 0) continue;
    }
    if (schema?.type === "number") {
      let m = Number(c);
      finalValues[fieldKey] = Number.isNaN(m) ? c : m;
    } else if (schema?.type === "boolean") {
      let num = h7e(c);
      if (num !== void 0) finalValues[fieldKey] = num;
    } else finalValues[fieldKey] = c;
  }
  return finalValues;
}
//@ chunk-ca06bv0t.js:3596-4870 callgraph-fingerprint = PluginOptionsDialog (0.261)
function PluginOptionsDialog(t0) {
  let m = w(22),
    {
      title: title,
      subtitle: subtitle,
      configSchema: configSchema,
      initialValues: initialValues,
      onSave: onSave,
      onCancel: onCancel,
    } = t0,
    keys = Object.keys(configSchema),
    h;
  if (m[0] !== configSchema || m[1] !== initialValues)
    ((h = () => pluginUserConfigValues(configSchema, initialValues)),
      (m[0] = configSchema),
      (m[1] = initialValues),
      (m[2] = h));
  else h = m[2];
  let [P, b] = y(h),
    x;
  if (m[3] !== configSchema || m[4] !== initialValues)
    ((x = (key) => {
      let k = configSchema[key];
      let S = userConfigFieldParser(k);
      if (S !== void 0) {
        return {
          type: "select",
          key: key,
          label: k?.title || key,
          options: S.map(ot),
          hint: () => k?.description,
        };
      }
      let A = k?.sensitive === !0;
      let v = A && getOwn(initialValues ?? {}, key) !== void 0;
      return {
        type: "text",
        key: key,
        label: k?.title || key,
        required: k?.required === !0 && !v,
        mask: A ? "*" : void 0,
        placeholder: v ? "(unchanged)" : void 0,
        validate:
          k?.type === "number"
            ? (prev) =>
                firstLine(prev) === "" || Gan.numberOfInput(firstLine(prev), k) !== void 0
                  ? null
                  : Gan.numberInputHint(k)
            : void 0,
        hint: () => k?.description,
      };
    }),
      (m[3] = configSchema),
      (m[4] = initialValues),
      (m[5] = x));
  else x = m[5];
  let mapped = keys.map(x);
  if (keys.length === 0) {
    return null;
  }
  let W;
  if (m[6] !== b)
    ((W = (char, key_0) => b((prev_3) => ({ ...prev_3, [char]: key_0 }))), (m[6] = b), (m[7] = W));
  else W = m[7];
  let q;
  if (m[8] !== configSchema || m[9] !== keys || m[10] !== initialValues || m[11] !== onSave || m[12] !== P)
    ((q = () => onSave(buildFinalValues(keys, P, configSchema, initialValues))),
      (m[8] = configSchema),
      (m[9] = keys),
      (m[10] = initialValues),
      (m[11] = onSave),
      (m[12] = P),
      (m[13] = q));
  else q = m[13];
  let Ke;
  if (
    m[14] !== mapped ||
    m[15] !== onCancel ||
    m[16] !== subtitle ||
    m[17] !== W ||
    m[18] !== q ||
    m[19] !== title ||
    m[20] !== P
  )
    ((Ke = e(AgentsList, {
      title: title,
      subtitle: subtitle,
      fields: mapped,
      values: P,
      onChange: W,
      onSubmit: q,
      onCancel: onCancel,
      submitLabel: "Save configuration",
    })),
      (m[14] = mapped),
      (m[15] = onCancel),
      (m[16] = subtitle),
      (m[17] = W),
      (m[18] = q),
      (m[19] = title),
      (m[20] = P),
      (m[21] = Ke));
  else Ke = m[21];
  return Ke;
}

export { PluginOptionsDialog, buildFinalValues };
