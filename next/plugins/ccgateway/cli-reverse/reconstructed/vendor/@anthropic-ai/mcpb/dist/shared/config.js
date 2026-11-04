/**
 * @anthropic-ai/mcpb/dist/shared/config.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/mcpb@1.1.2..2.0.1
 * pieces: chunk-64s30qnv.js (4)
 * attribution: esm-fingerprint 3, esm-layout 1
 */

//@ chunk-64s30qnv.js:2213-2869 esm-fingerprint
function replaceVariables(value, variables) {
  if (typeof value === "string") {
    let result = value;
    for (let [key, replacement] of Object.entries(variables)) {
      let pattern = new RegExp(`\\$\\{${key}\\}`, "g");
      if (result.match(pattern))
        if (Array.isArray(replacement))
          console.warn(`Cannot replace ${key} with array value in string context: "${value}"`, {
            key,
            replacement,
          });
        else result = result.replace(pattern, replacement);
    }
    return result;
  } else if (Array.isArray(value)) {
    let result = [];
    for (let item of value)
      if (typeof item === "string" && item.match(/^\$\{user_config\.[^}]+\}$/)) {
        let varName = item.match(/^\$\{([^}]+)\}$/)?.[1];
        if (varName && variables[varName]) {
          let replacement = variables[varName];
          if (Array.isArray(replacement)) result.push(...replacement);
          else result.push(replacement);
        } else result.push(item);
      } else result.push(replaceVariables(item, variables));
    return result;
  } else if (value && typeof value === "object") {
    let result = {};
    for (let [key, val] of Object.entries(value)) result[key] = replaceVariables(val, variables);
    return result;
  }
  return value;
}
//@ chunk-64s30qnv.js:2869-3679 esm-fingerprint
async function getMcpConfigForManifest(options) {
  let { manifest, extensionPath, systemDirs, userConfig, pathSeparator, logger } = options;
  let baseConfig = manifest.server?.mcp_config;
  if (!baseConfig) return;
  let result = {
    ...baseConfig,
  };
  if (baseConfig.platform_overrides) {
    if ("linux" in baseConfig.platform_overrides) {
      let platformConfig = baseConfig.platform_overrides.linux;
      result.command = platformConfig.command || result.command;
      result.args = platformConfig.args || result.args;
      result.env = platformConfig.env || result.env;
    }
  }
  if (
    hasRequiredConfigMissing({
      manifest,
      userConfig,
    })
  ) {
    logger?.warn(`Extension ${manifest.name} has missing required configuration, skipping MCP config`);
    return;
  }
  let variables = {
    __dirname: extensionPath,
    pathSeparator,
    "/": pathSeparator,
    ...systemDirs,
  };
  let mergedConfig = {};
  if (manifest.user_config) {
    for (let [key, configOption] of Object.entries(manifest.user_config))
      if (configOption.default !== undefined) mergedConfig[key] = configOption.default;
  }
  if (userConfig) Object.assign(mergedConfig, userConfig);
  for (let [key, value] of Object.entries(mergedConfig)) {
    let userConfigKey = `user_config.${key}`;
    if (Array.isArray(value)) variables[userConfigKey] = value.map(String);
    else if (typeof value === "boolean") variables[userConfigKey] = value ? "true" : "false";
    else variables[userConfigKey] = String(value);
  }
  result = replaceVariables(result, variables);
  return result;
}
//@ chunk-64s30qnv.js:3679-3729 esm-layout
function isInvalidSingleValue(value) {
  return value === undefined || value === null || value === "";
}
//@ chunk-64s30qnv.js:3729-3948 esm-fingerprint
function hasRequiredConfigMissing({ manifest, userConfig }) {
  if (!manifest.user_config) return false;
  let config = userConfig || {};
  for (let [key, configOption] of Object.entries(manifest.user_config))
    if (configOption.required) {
      let value = config[key];
      if (
        isInvalidSingleValue(value) ||
        (Array.isArray(value) && (value.length === 0 || value.some(isInvalidSingleValue)))
      )
        return true;
    }
  return false;
}
export { getMcpConfigForManifest };
