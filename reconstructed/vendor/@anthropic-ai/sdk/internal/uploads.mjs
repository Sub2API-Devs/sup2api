/**
 * @anthropic-ai/sdk/internal/uploads.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (8)
 * attribution: esm-fingerprint 7, esm-layout 1
 */
import { $o } from "./shims.mjs";

//@ chunk-hwmsct5x.js:39341-39666 esm-fingerprint
var ea = () => {
  if (typeof File > "u") {
    let { process: e } = globalThis,
      n = typeof e?.versions?.node === "string" && parseInt(e.versions.node.split(".")) < 20;
    throw Error(
      "`File` is not defined as a global, which is required for file uploads." +
        (n
          ? " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`."
          : ""),
    );
  }
};
//@ chunk-hwmsct5x.js:39666-39729 esm-fingerprint
function rn(e, n, r) {
  return (ea(), new File(e, n ?? "unknown_file", r));
}
//@ chunk-hwmsct5x.js:39729-39991 esm-fingerprint
function cr(e, n) {
  let r =
    (typeof e === "object" &&
      e !== null &&
      (("name" in e && e.name && String(e.name)) ||
        ("url" in e && e.url && String(e.url)) ||
        ("filename" in e && e.filename && String(e.filename)) ||
        ("path" in e && e.path && String(e.path)))) ||
    "";
  return n ? r.split(/[\\/]/).pop() || void 0 : r;
}
//@ chunk-hwmsct5x.js:39991-40077 esm-fingerprint
var ta = (e) => e != null && typeof e === "object" && typeof e[Symbol.asyncIterator] === "function";
//@ chunk-hwmsct5x.js:40077-40151 esm-layout
var ut = async (e, n, r = !0) => ({ ...e, body: await Wh(e.body, n, r) }),
  weakMap_2 = new WeakMap();
//@ chunk-hwmsct5x.js:40151-40429 esm-fingerprint
function qh(e) {
  let n = typeof e === "function" ? e : e.fetch,
    r = weakMap_2.get(n);
  if (r) return r;
  let s = (async () => {
    try {
      let h = "Response" in n ? n.Response : (await n("data:,")).constructor,
        formData = new FormData();
      if (formData.toString() === (await new h(formData).text())) return !1;
      return !0;
    } catch {
      return !0;
    }
  })();
  return (weakMap_2.set(n, s), s);
}
//@ chunk-hwmsct5x.js:40429-40683 esm-fingerprint
var Wh = async (e, n, r = !0) => {
  if (!(await qh(n)))
    throw TypeError(
      "The provided fetch function does not support file uploads with the current global FormData class.",
    );
  let formData = new FormData();
  return (await Promise.all(Object.entries(e || {}).map(([h, y]) => Zi(formData, h, y, r))), formData);
};
//@ chunk-hwmsct5x.js:40683-41841 esm-fingerprint
var Zi = async (e, n, r, s) => {
  if (r === void 0) return;
  if (r == null)
    throw TypeError(`Received null for "${n}"; to pass null in FormData, you must use the string 'null'`);
  if (typeof r === "string" || typeof r === "number" || typeof r === "boolean") e.append(n, String(r));
  else if (r instanceof Response) {
    let h = {},
      y = r.headers.get("Content-Type");
    if (y) h = { type: y };
    e.append(n, rn([await r.blob()], cr(r, s), h));
  } else if (ta(r)) e.append(n, rn([await new Response($o(r)).blob()], cr(r, s)));
  else if (r instanceof Blob) e.append(n, rn([r], cr(r, s) || void 0, { type: r.type }));
  else if (Array.isArray(r)) await Promise.all(r.map((h) => Zi(e, n + "[]", h, s)));
  else if (typeof r.then === "function")
    throw TypeError(`Received a Promise for "${n}"; await it first, e.g. \`await toFile(...)\``);
  else if (r instanceof ArrayBuffer || ArrayBuffer.isView(r))
    throw TypeError(
      `Received ${r.constructor.name} for "${n}"; to upload raw bytes, wrap them with \`await toFile(bytes, 'filename')\``,
    );
  else if (typeof r === "object")
    await Promise.all(Object.entries(r).map(([h, y]) => Zi(e, `${n}[${h}]`, y, s)));
  else
    throw TypeError(
      `Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${r} instead`,
    );
};

export { ea, cr, rn, ta, ut };
