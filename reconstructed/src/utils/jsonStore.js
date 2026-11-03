/**
 * utils/jsonStore.ts
 *
 * 2.1.316 新增：创建 JSON 文件存储（默认值、权限、缩进、schema 校验）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5rq13jpv.js (2)
 * attribution: placement 2
 */
import { readFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { isENOENT } from "./errors.js";
import { jsonParse, jsonStringify } from "./slowOperations.js";
import { logForDebugging } from "./debug.js";
import { writeFileAtomic } from "./atomicPublishWrite.js";

//@ chunk-5rq13jpv.js:383-1160 placement
/**
 * 创建 JSON 文件存储（默认值、权限、缩进、schema 校验）。
 */
function createJsonStore(e, f, c) {
  let { defaultValue, mode, ensureDir = false, indent, trailingNewline = false } = c;
  function u() {
    return isFunction(defaultValue) ? defaultValue() : defaultValue;
  }
  async function m() {
    let n;
    try {
      n = await readFile(e, "utf8");
    } catch (error) {
      if (isENOENT(error)) return u();
      throw error;
    }
    let r;
    try {
      r = jsonParse(n);
    } catch (error) {
      logForDebugging(`jsonStore: ${e} is not valid JSON: ${error}`, {
        level: "warn",
      });
      return u();
    }
    let o = f().safeParse(r);
    if (!o.success) {
      logForDebugging(`jsonStore: ${e} failed schema validation: ${o.error.message}`, {
        level: "warn",
      });
      return u();
    }
    return o.data;
  }
  async function d(n) {
    if (ensureDir !== false)
      await mkdir(dirname(e), {
        recursive: true,
        mode: ensureDir === true ? undefined : ensureDir.mode,
      });
    let r =
      jsonStringify(n, null, indent) +
      (trailingNewline
        ? `
`
        : "");
    await writeFileAtomic(e, r, mode);
  }
  let resolved = Promise.resolve();
  function y(n) {
    let r = resolved.then(async () => {
      let o = n(await m());
      await d(o);
      return o;
    });
    resolved = r.then(
      () => {
        return;
      },
      () => {
        return;
      },
    );
    return r;
  }
  return {
    path() {
      return e;
    },
    read: m,
    write: d,
    update: y,
  };
}
//@ chunk-5rq13jpv.js:1160-1203 placement
function isFunction(defaultValue) {
  return typeof defaultValue === "function";
}
export { createJsonStore };
