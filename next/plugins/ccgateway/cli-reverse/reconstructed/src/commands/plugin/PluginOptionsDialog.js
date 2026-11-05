/**
 * commands/plugin/PluginOptionsDialog.tsx
 *
 * 插件选项配置对话框
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/PluginOptionsDialog.tsx
 * pieces: chunk-s4mtq5zk.js (3)
 * attribution: affinity 1, fingerprint 1, callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  firstLine,
  pluginUserConfigValues,
  userConfigFieldParser,
} from "../../utils/plugins/pluginDisplayMetadata.js";
import { getOwn } from "../../utils/objectSafety.js";
import { truthyOrFalsyEnv, emptyConfig } from "../../utils/plugins/pluginConfigEnv.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useState } from "../../../vendor/react/cjs/react.production.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { AgentsList } from "../../components/agents/AgentsList.js";

//@ chunk-s4mtq5zk.js:3189-3231 affinity
function valueOption(value) {
  return {
    label: value,
    value,
  };
}
//@ chunk-s4mtq5zk.js:3231-3599 fingerprint (2.1.88 match: buildFinalValues, 0.825)
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
//@ chunk-s4mtq5zk.js:3599-4873 callgraph-fingerprint (2.1.88 match: PluginOptionsDialog, 0.261)
function PluginOptionsDialog(props) {
  let $ = useMemoCache(22);
  let { title, subtitle, configSchema, initialValues, onSave, onCancel } = props;
  let keys = Object.keys(configSchema);
  let initialConfig;
  if ($[0] !== configSchema || $[1] !== initialValues) {
    initialConfig = () => pluginUserConfigValues(configSchema, initialValues);
    $[0] = configSchema;
    $[1] = initialValues;
    $[2] = initialConfig;
  } else initialConfig = $[2];
  let [collected, setCollected] = useState(initialConfig);
  let toField;
  if ($[3] !== configSchema || $[4] !== initialValues) {
    toField = (key) => {
      let fieldSchema = configSchema[key];
      let choices = userConfigFieldParser(fieldSchema);
      if (choices !== undefined) {
        return {
          type: "select",
          key,
          label: fieldSchema?.title || key,
          options: choices.map(valueOption),
          hint: () => fieldSchema?.description,
        };
      }
      let isSensitive = fieldSchema?.sensitive === true;
      let hasValue = isSensitive && getOwn(initialValues ?? {}, key) !== undefined;
      return {
        type: "text",
        key,
        label: fieldSchema?.title || key,
        required: fieldSchema?.required === true && !hasValue,
        mask: isSensitive ? "*" : undefined,
        placeholder: hasValue ? "(unchanged)" : undefined,
        validate:
          fieldSchema?.type === "number"
            ? (prev) =>
                firstLine(prev) === "" ||
                emptyConfig.numberOfInput(firstLine(prev), fieldSchema) !== undefined
                  ? null
                  : emptyConfig.numberInputHint(fieldSchema)
            : undefined,
        hint: () => fieldSchema?.description,
      };
    };
    $[3] = configSchema;
    $[4] = initialValues;
    $[5] = toField;
  } else toField = $[5];
  let fields = keys.map(toField);
  if (keys.length === 0) {
    return null;
  }
  let onChange;
  if ($[6] !== setCollected) {
    onChange = (char, key_0) =>
      setCollected((prev_3) => ({
        ...prev_3,
        [char]: key_0,
      }));
    $[6] = setCollected;
    $[7] = onChange;
  } else onChange = $[7];
  let onSubmit;
  if (
    $[8] !== configSchema ||
    $[9] !== keys ||
    $[10] !== initialValues ||
    $[11] !== onSave ||
    $[12] !== collected
  ) {
    onSubmit = () => onSave(buildFinalValues(keys, collected, configSchema, initialValues));
    $[8] = configSchema;
    $[9] = keys;
    $[10] = initialValues;
    $[11] = onSave;
    $[12] = collected;
    $[13] = onSubmit;
  } else onSubmit = $[13];
  let content;
  if (
    $[14] !== fields ||
    $[15] !== onCancel ||
    $[16] !== subtitle ||
    $[17] !== onChange ||
    $[18] !== onSubmit ||
    $[19] !== title ||
    $[20] !== collected
  ) {
    content = jsxProd_default(AgentsList, {
      title,
      subtitle,
      fields,
      values: collected,
      onChange,
      onSubmit,
      onCancel,
      submitLabel: "Save configuration",
    });
    $[14] = fields;
    $[15] = onCancel;
    $[16] = subtitle;
    $[17] = onChange;
    $[18] = onSubmit;
    $[19] = title;
    $[20] = collected;
    $[21] = content;
  } else content = $[21];
  return content;
}
export { buildFinalValues, PluginOptionsDialog };
