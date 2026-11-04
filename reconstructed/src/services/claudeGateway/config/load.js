/**
 * services/claudeGateway/config/load.ts
 *
 * 2.1.316 新增：网关配置加载
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (3)
 * attribution: placement 3
 */
import { isAbsolute } from "path";
import { readFile } from "fs/promises";
import { parseYaml } from "../../../utils/yaml.js";
import { GatewayConfigSchema } from "./schema.js";
import { runDeferredInits } from "../../../../runtime/deferred-init.js";

//@ chunk-1ny7cxrt.js:1413048-1413532 placement
/**
 * 递归展开配置：${file:绝对路径} 读文件内容，${VAR} 替换环境变量（未定义时报错）。
 */
async function expandConfigValues(value) {
  if (typeof value === "string") {
    let match = value.match(/^\$\{file:(.+)\}$/);
    if (match) {
      let filePath = match[1];
      if (!isAbsolute(filePath)) throw Error(`\${file:} path must be absolute: ${filePath}`);
      return (await readFile(filePath, "utf8")).trim();
    }
    return value.replace(/\$\{(\w+)\}/g, (envName, envValue) => {
      let replaced = process.env[envValue];
      if (replaced === undefined) throw Error(`undefined env var in config: ${envValue}`);
      return replaced;
    });
  }
  if (Array.isArray(value)) return Promise.all(value.map(expandConfigValues));
  if (value && typeof value === "object") {
    let out = {};
    for (let [key, value_2] of Object.entries(value)) out[key] = await expandConfigValues(value_2);
    return out;
  }
  return value;
}
//@ chunk-1ny7cxrt.js:1413532-1413844 placement
/**
 * 读取 YAML 网关配置、展开变量并按 schema 解析；拒绝已移除的 dev: 段。
 */
async function loadGatewayConfig(configPath) {
  let file = await readFile(configPath, "utf8");
  let yaml = parseYaml(file);
  let expanded = await expandConfigValues(yaml);
  if (typeof expanded === "object" && expanded !== null && "dev" in expanded)
    throw Error(
      "`dev:` was removed \u2014 the gateway is Postgres-only. Set store.postgres_url " +
        "(local: docker run --rm -p 5432:5432 -e POSTGRES_HOST_AUTH_METHOD=trust postgres)",
    );
  return GatewayConfigSchema().parse(expanded);
}
//@ chunk-1ny7cxrt.js:1413844-1413940 placement
/**
 * 取配置里的字符串数组字段：不是数组或含非字符串项时返回 undefined。
 */
function readStringListField(source, field) {
  let value = source[field];
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;
}

// The import cycle this module closes (3 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/services/claudeGateway/config/load.js");
export { readStringListField, loadGatewayConfig };
