/**
 * utils/urlRedaction.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yqnmafqp.js (1)
 * attribution: placement 1
 */
import {
  m,
  p_yqnm,
  Y,
  R,
  A,
  safeDecodeURIComponent,
  userinfoAtIndex,
  looksLikeUrlWithScheme,
  tt_yqnm,
  x,
} from "../services/mcp/auth.js";
import { countCharInString } from "./stringUtils.js";
import { uniq } from "./collections.js";

/**
 * 脱敏 URL 用于日志：用户名/密码替换为 REDACTED，查询参数与片段中名称看似秘密的键值、令牌形状的值替换为 REDACTED；无法解析时返回 [unparseable url]。
 */
//@ chunk-yqnmafqp.js:4135-5542 placement
function redactUrlSecrets(t) {
  let e;
  try {
    e = new URL(t);
  } catch {
    return "[unparseable url]";
  }
  let n = e.host === "" && !e.href.startsWith(`${e.protocol}//`);
  if (e.username !== "") e.username = "REDACTED";
  if (e.password !== "") e.password = "REDACTED";
  let o = (s) => {
      let index = s.indexOf("=");
      if (index === -1 || /^=*$/.test(s.slice(index + 1))) return m(s) ? "REDACTED" : s;
      let sliced = s.slice(0, index);
      return `${m(sliced) || (m(s) && p_yqnm(sliced)) ? "REDACTED" : sliced}=REDACTED`;
    },
    r = (s) =>
      s
        .split(Y)
        .map((i, a) => (a % 2 === 1 ? i : o(i)))
        .join(""),
    c = (s) => {
      let i = r(s);
      if (R(i) || A(i)) return "REDACTED";
      let a = i;
      for (let g = 0; g < 3; g++) {
        let u = safeDecodeURIComponent(a);
        if (u === a) break;
        if (r(u) !== u || userinfoAtIndex(u) !== -1 || A(u)) return "REDACTED";
        a = u;
      }
      return i;
    },
    D = `${n ? e.protocol : ""}${e.pathname}`,
    M = userinfoAtIndex(D),
    f;
  if (looksLikeUrlWithScheme(e.pathname, !0)) {
    let index = e.pathname.indexOf("/"),
      i = `${e.protocol}${index === -1 ? e.pathname : e.pathname.slice(0, index)}`;
    f =
      n && userinfoAtIndex(i) !== -1
        ? "REDACTED"
        : `${n ? e.protocol : ""}${e.pathname.startsWith("/") ? "/" : ""}REDACTED`;
  } else {
    let mapped = e.pathname.split("/").map(c);
    if (n) mapped[0] = `${e.protocol}${mapped[0] ?? ""}`;
    if (M !== -1) {
      let i = (B) => countCharInString(D.slice(0, B), "/"),
        a = i(D.indexOf(":")),
        g = i(M),
        u = mapped[g] ?? "",
        U = u.includes("@") ? u.slice(u.lastIndexOf("@")) : "";
      mapped.splice(a, g - a + 1, `REDACTED${U}`);
    }
    f = mapped.join("/");
  }
  if (!n) {
    if (((e.pathname = f), tt_yqnm.test(e.hostname))) e.hostname = "REDACTED";
  }
  let z = uniq(e.searchParams.keys()),
    j = new Set([...e.searchParams.entries()].filter(([, s]) => s === "").map(([s]) => s)),
    uRLSearchParams = new URLSearchParams();
  for (let s of z) uRLSearchParams.append(x(s, !j.has(s)), "REDACTED");
  return ((e.search = uRLSearchParams.toString()), (e.hash = ""), n ? `${f}${e.search}` : e.href);
}

export { redactUrlSecrets };
