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
import { truthyOrFalsyEnv, emptyConfig } from "../../utils/plugins/pluginConfigEnv.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y } from "../../../vendor/react/cjs/react.production.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { AgentsList } from "../../components/agents/AgentsList.js";

//@ chunk-ca06bv0t.js:3186-3228 affinity
function valueOption(Be) {
  return {
    label: Be,
    value: Be,
  };
}
//@ chunk-ca06bv0t.js:3228-3596 fingerprint = buildFinalValues (0.825)
function buildFinalValues(fields, collected, configSchema, initialValues) {
  let finalValues = {};
  for (let fieldKey of fields) {
    let schema = configSchema[fieldKey];
    let value = firstLine(getOwn(collected, fieldKey) ?? "");
    if (value === "") {
      if (schema?.sensitive === true && getOwn(initialValues ?? {}, fieldKey) !== undefined) continue;
      if (schema?.type === "number") continue;
      if (schema?.required !== true && getOwn(initialValues ?? {}, fieldKey) === undefined) continue;
    }
    if (schema?.type === "number") {
      let num = Number(value);
      finalValues[fieldKey] = Number.isNaN(num) ? value : num;
    } else if (schema?.type === "boolean") {
      let num = truthyOrFalsyEnv(value);
      if (num !== undefined) finalValues[fieldKey] = num;
    } else finalValues[fieldKey] = value;
  }
  return finalValues;
}
//@ chunk-ca06bv0t.js:3596-4870 callgraph-fingerprint = PluginOptionsDialog (0.261)
function PluginOptionsDialog(props) {
  let m = w(22);
  let { title, subtitle, configSchema, initialValues, onSave, onCancel } = props;
  let keys = Object.keys(configSchema);
  let h;
  if (m[0] !== configSchema || m[1] !== initialValues) {
    h = () => pluginUserConfigValues(configSchema, initialValues);
    m[0] = configSchema;
    m[1] = initialValues;
    m[2] = h;
  } else h = m[2];
  let [collected, b] = y(h);
  let x;
  if (m[3] !== configSchema || m[4] !== initialValues) {
    x = (key) => {
      let k = configSchema[key];
      let S = userConfigFieldParser(k);
      if (S !== undefined) {
        return {
          type: "select",
          key,
          label: k?.title || key,
          options: S.map(valueOption),
          hint: () => k?.description,
        };
      }
      let A = k?.sensitive === true;
      let v = A && getOwn(initialValues ?? {}, key) !== undefined;
      return {
        type: "text",
        key,
        label: k?.title || key,
        required: k?.required === true && !v,
        mask: A ? "*" : undefined,
        placeholder: v ? "(unchanged)" : undefined,
        validate:
          k?.type === "number"
            ? (prev) =>
                firstLine(prev) === "" || emptyConfig.numberOfInput(firstLine(prev), k) !== undefined
                  ? null
                  : emptyConfig.numberInputHint(k)
            : undefined,
        hint: () => k?.description,
      };
    };
    m[3] = configSchema;
    m[4] = initialValues;
    m[5] = x;
  } else x = m[5];
  let fields = keys.map(x);
  if (keys.length === 0) {
    return null;
  }
  let onChange;
  if (m[6] !== b) {
    onChange = (char, key_0) =>
      b((prev_3) => ({
        ...prev_3,
        [char]: key_0,
      }));
    m[6] = b;
    m[7] = onChange;
  } else onChange = m[7];
  let onSubmit;
  if (
    m[8] !== configSchema ||
    m[9] !== keys ||
    m[10] !== initialValues ||
    m[11] !== onSave ||
    m[12] !== collected
  ) {
    onSubmit = () => onSave(buildFinalValues(keys, collected, configSchema, initialValues));
    m[8] = configSchema;
    m[9] = keys;
    m[10] = initialValues;
    m[11] = onSave;
    m[12] = collected;
    m[13] = onSubmit;
  } else onSubmit = m[13];
  let Ke;
  if (
    m[14] !== fields ||
    m[15] !== onCancel ||
    m[16] !== subtitle ||
    m[17] !== onChange ||
    m[18] !== onSubmit ||
    m[19] !== title ||
    m[20] !== collected
  ) {
    Ke = jsxProd_default(AgentsList, {
      title,
      subtitle,
      fields,
      values: collected,
      onChange,
      onSubmit,
      onCancel,
      submitLabel: "Save configuration",
    });
    m[14] = fields;
    m[15] = onCancel;
    m[16] = subtitle;
    m[17] = onChange;
    m[18] = onSubmit;
    m[19] = title;
    m[20] = collected;
    m[21] = Ke;
  } else Ke = m[21];
  return Ke;
}
export { PluginOptionsDialog, buildFinalValues };
