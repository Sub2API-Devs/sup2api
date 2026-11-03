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

/**
 * 创建 JSON 文件存储（默认值、权限、缩进、schema 校验）。
 */
//@ chunk-5rq13jpv.js:383-1160 placement
function createJsonStore(e, f, c) {
  let {
    defaultValue: defaultValue,
    mode: mode,
    ensureDir: ensureDir = !1,
    indent: indent,
    trailingNewline: trailingNewline = !1,
  } = c;
  function u() {
    return S(defaultValue) ? defaultValue() : defaultValue;
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
      return (logForDebugging(`jsonStore: ${e} is not valid JSON: ${error}`, { level: "warn" }), u());
    }
    let safeParse = f().safeParse(r);
    if (!safeParse.success)
      return (
        logForDebugging(`jsonStore: ${e} failed schema validation: ${safeParse.error.message}`, {
          level: "warn",
        }),
        u()
      );
    return safeParse.data;
  }
  async function d(n) {
    if (ensureDir !== !1)
      await mkdir(dirname(e), { recursive: !0, mode: ensureDir === !0 ? void 0 : ensureDir.mode });
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
      return (await d(o), o);
    });
    return (
      (resolved = r.then(
        () => {
          return;
        },
        () => {
          return;
        },
      )),
      r
    );
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
function S(e) {
  return typeof e === "function";
}

export { createJsonStore };
