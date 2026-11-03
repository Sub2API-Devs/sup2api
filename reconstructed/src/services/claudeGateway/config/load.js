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

//@ chunk-1ny7cxrt.js:1413048-1413532 placement
/**
 * 递归展开配置：${file:绝对路径} 读文件内容，${VAR} 替换环境变量（未定义时报错）。
 */
async function expandConfigValues(e) {
  if (typeof e === "string") {
    let match = e.match(/^\$\{file:(.+)\}$/);
    if (match) {
      let n = match[1];
      if (!isAbsolute(n)) throw Error(`\${file:} path must be absolute: ${n}`);
      return (await readFile(n, "utf8")).trim();
    }
    return e.replace(/\$\{(\w+)\}/g, (n, o) => {
      let r = process.env[o];
      if (r === undefined) throw Error(`undefined env var in config: ${o}`);
      return r;
    });
  }
  if (Array.isArray(e)) return Promise.all(e.map(expandConfigValues));
  if (e && typeof e === "object") {
    let t = {};
    for (let [key, value] of Object.entries(e)) t[key] = await expandConfigValues(value);
    return t;
  }
  return e;
}
//@ chunk-1ny7cxrt.js:1413532-1413844 placement
/**
 * 读取 YAML 网关配置、展开变量并按 schema 解析；拒绝已移除的 dev: 段。
 */
async function loadGatewayConfig(e) {
  let file = await readFile(e, "utf8");
  let yaml = parseYaml(file);
  let o = await expandConfigValues(yaml);
  if (typeof o === "object" && o !== null && "dev" in o)
    throw Error(
      "`dev:` was removed \u2014 the gateway is Postgres-only. Set store.postgres_url " +
        "(local: docker run --rm -p 5432:5432 -e POSTGRES_HOST_AUTH_METHOD=trust postgres)",
    );
  return GatewayConfigSchema().parse(o);
}
//@ chunk-1ny7cxrt.js:1413844-1413940 placement
/**
 * 取配置里的字符串数组字段：不是数组或含非字符串项时返回 undefined。
 */
function readStringListField(e, t) {
  let n = e[t];
  return Array.isArray(n) && n.every((o) => typeof o === "string") ? n : undefined;
}
export { readStringListField, loadGatewayConfig };
