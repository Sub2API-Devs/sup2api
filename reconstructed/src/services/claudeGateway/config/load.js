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
import { readFile, readFile as readFile_2, readFile as readFile_3 } from "fs/promises";
import { parseYaml } from "../../../utils/yaml.js";
import { Yz } from "./schema.js";

/**
 * 递归展开配置：${file:绝对路径} 读文件内容，${VAR} 替换环境变量（未定义时报错）。
 */
//@ chunk-1ny7cxrt.js:1413048-1413532 placement
async function expandConfigValues(e) {
  if (typeof e === "string") {
    let match = e.match(/^\$\{file:(.+)\}$/);
    if (match) {
      let n = match[1];
      if (!isAbsolute(n)) throw Error(`\${file:} path must be absolute: ${n}`);
      return (await readFile_3(n, "utf8")).trim();
    }
    return e.replace(/\$\{(\w+)\}/g, (n, o) => {
      let r = process.env[o];
      if (r === void 0) throw Error(`undefined env var in config: ${o}`);
      return r;
    });
  }
  if (Array.isArray(e)) return Promise.all(e.map(expandConfigValues));
  if (e && typeof e === "object") {
    let t = {};
    for (let [n, o] of Object.entries(e)) t[n] = await expandConfigValues(o);
    return t;
  }
  return e;
}
/**
 * 读取 YAML 网关配置、展开变量并按 schema 解析；拒绝已移除的 dev: 段。
 */
//@ chunk-1ny7cxrt.js:1413532-1413844 placement
async function loadGatewayConfig(e) {
  let t = await readFile_3(e, "utf8"),
    n = parseYaml(t),
    o = await expandConfigValues(n);
  if (typeof o === "object" && o !== null && "dev" in o)
    throw Error(
      "`dev:` was removed \u2014 the gateway is Postgres-only. Set store.postgres_url " +
        "(local: docker run --rm -p 5432:5432 -e POSTGRES_HOST_AUTH_METHOD=trust postgres)",
    );
  return Yz().parse(o);
}
//@ chunk-1ny7cxrt.js:1413844-1413940 placement
function Kz(e, t) {
  let n = e[t];
  return Array.isArray(n) && n.every((o) => typeof o === "string") ? n : void 0;
}

export { Kz, loadGatewayConfig };
