/**
 * cli/print/_new/elicitationRegistrar.helpers-tyg7.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (1)
 * attribution: sole-consumer-new 1
 */
import { tA } from "../../../../vendor/axios/dist/esm/axios.js";

//@ chunk-tyg7f3ek.js:378840-379702 sole-consumer-new
function nA(request, maxRequestBytes) {
  let r = 0;
  let s = [];
  let h = request;
  let y = true;
  for (;;) {
    if (y) {
      y = false;
      if (typeof h === "string") r += tA(h, maxRequestBytes - r);
      else if (typeof h === "number") r += Number.isFinite(h) ? String(h).length : 4;
      else if (typeof h === "boolean") r += h ? 4 : 5;
      else if (typeof h === "bigint") return true;
      else if (Array.isArray(h)) {
        if (h.length > maxRequestBytes - r) return true;
        r += 2;
        s.push({
          kind: "array",
          members: h,
          next: 0,
        });
      } else if (typeof h === "object" && h !== null) {
        r += 2;
        s.push({
          kind: "object",
          holder: h,
          keys: Object.keys(h),
          next: 0,
          written: 0,
        });
      } else r += 4;
      if (r > maxRequestBytes) return true;
      continue;
    }
    let last = s.at(-1);
    if (last === undefined) return false;
    if (last.kind === "array") {
      if (last.next >= last.members.length) {
        s.pop();
        continue;
      }
      if (last.next > 0) r += 1;
      h = last.members[last.next++];
      y = true;
      continue;
    }
    if (last.next >= last.keys.length) {
      s.pop();
      continue;
    }
    let R = last.keys[last.next++];
    let w = Reflect.get(last.holder, R);
    if (w === undefined || typeof w === "function" || typeof w === "symbol") continue;
    if (last.written++ > 0) r += 1;
    r += tA(R, maxRequestBytes - r) + 1;
    if (r > maxRequestBytes) return true;
    h = w;
    y = true;
  }
}
export { nA };
