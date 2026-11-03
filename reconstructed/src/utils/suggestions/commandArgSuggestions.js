/**
 * utils/suggestions/commandArgSuggestions.ts
 *
 * 2.1.316 新增。命令参数建议。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */

//@ chunk-18hwfzwa.js:550092-550115 placement
var COMMAND_ARG = "command-arg-";
//@ chunk-18hwfzwa.js:550115-550716 placement
async function commandArgSuggestions(h, x, D) {
  let index = h.indexOf(" ");
  if (!h.startsWith("/") || index === -1) return [];
  let sliced = h.slice(1, index),
    sliced_2 = h.slice(index + 1),
    filtered = sliced_2.split(/\s+/).filter(Boolean),
    Be = sliced_2 === "" || /\s$/.test(sliced_2),
    He = Be ? "" : (filtered.at(-1) ?? ""),
    We = Be ? filtered : filtered.slice(0, -1),
    ze = await x(We, He, D),
    joined = [`/${sliced}`, ...We].join(" ");
  return ze.slice(0, 12).map((rt) => {
    let kt = rt.isFinal === !0 || rt.value.toLowerCase() === He.toLowerCase(),
      At = !kt && (rt.appendSpace ?? !0);
    return {
      id: `command-arg-${rt.value}`,
      displayText: rt.value,
      description: rt.description,
      query: He === "" ? void 0 : He.toLowerCase(),
      metadata: { replacement: `${joined} ${rt.value}${At ? " " : ""}`, partial: !kt },
    };
  });
}
//@ chunk-18hwfzwa.js:550787-550848 placement
var o2 = new Set(["add-dir", "cd"]),
  KVe = 15000,
  zVe = 2500,
  JVe = 5000;

export { JVe, KVe, zVe, o2, commandArgSuggestions, COMMAND_ARG };
