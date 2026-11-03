/**
 * utils/fetchWithDefaults.ts
 *
 * 2.1.316 新增：带默认值的 fetch。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pjt9hgpa.js (2)
 * attribution: placement 2
 */

/**
 * 把 Headers、二维数组或普通对象形式的请求头转成普通对象。
 */
//@ chunk-pjt9hgpa.js:319-475 placement
function headersToObject(e) {
  if (!e) return {};
  if (e instanceof Headers) return Object.fromEntries(e.entries());
  if (Array.isArray(e)) return Object.fromEntries(e);
  return { ...e };
}
/**
 * 包装 fetch，使每次请求合并默认 init（请求头逐项合并）。
 */
//@ chunk-pjt9hgpa.js:475-634 placement
function createFetchWithDefaults(e = fetch, t) {
  if (!t) return e;
  return async (r, s) => {
    let a = {
      ...t,
      ...s,
      headers: s?.headers ? { ...headersToObject(t.headers), ...headersToObject(s.headers) } : t.headers,
    };
    return e(r, a);
  };
}

export { createFetchWithDefaults, headersToObject };
