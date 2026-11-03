/**
 * @anthropic-ai/sdk/internal/to-file.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (4)
 * attribution: esm-fingerprint 4
 */
import { ea, cr, rn, ta } from "./uploads.mjs";

//@ chunk-hwmsct5x.js:41841-42220 esm-fingerprint
var isBlobLike = (e) =>
    e != null &&
    typeof e === "object" &&
    typeof e.size === "number" &&
    typeof e.type === "string" &&
    typeof e.text === "function" &&
    typeof e.slice === "function" &&
    typeof e.arrayBuffer === "function",
  zh = (e) =>
    e != null &&
    typeof e === "object" &&
    typeof e.name === "string" &&
    typeof e.lastModified === "number" &&
    isBlobLike(e),
  Gh = (e) => e != null && typeof e === "object" && typeof e.url === "string" && typeof e.blob === "function";
//@ chunk-hwmsct5x.js:42220-42684 esm-fingerprint
async function ra(e, n, r) {
  if ((ea(), (e = await e), n || (n = cr(e, !0)), zh(e))) {
    if (e instanceof File && n == null && r == null) return e;
    return rn([await e.arrayBuffer()], n ?? e.name, { type: e.type, lastModified: e.lastModified, ...r });
  }
  if (Gh(e)) {
    let blob = await e.blob();
    return (n || (n = new URL(e.url).pathname.split(/[\\/]/).pop()), rn(await na(blob), n, r));
  }
  let s = await na(e);
  if (!r?.type) {
    let found = s.find((y) => typeof y === "object" && "type" in y && y.type);
    if (typeof found === "string") r = { ...r, type: found };
  }
  return rn(s, n, r);
}
//@ chunk-hwmsct5x.js:42684-43045 esm-fingerprint
async function na(e) {
  let n = [];
  if (typeof e === "string" || ArrayBuffer.isView(e) || e instanceof ArrayBuffer) n.push(e);
  else if (isBlobLike(e)) n.push(e instanceof Blob ? e : await e.arrayBuffer());
  else if (ta(e)) for await (let r of e) n.push(...(await na(r)));
  else {
    let r = e?.constructor?.name;
    throw Error(`Unexpected data type: ${typeof e}${r ? `; constructor: ${r}` : ""}${Yh(e)}`);
  }
  return n;
}
//@ chunk-hwmsct5x.js:43045-43184 esm-fingerprint
function Yh(e) {
  if (typeof e !== "object" || e === null) return "";
  return `; props: [${Object.getOwnPropertyNames(e)
    .map((r) => `"${r}"`)
    .join(", ")}]`;
}

export { ra };
