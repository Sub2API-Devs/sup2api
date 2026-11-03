/**
 * utils/urlRedaction.ts
 *
 * 2.1.316 新增：把 URL 里的用户信息、查询里的密钥等敏感片段替换掉的脱敏函数。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yqnmafqp.js (1)
 * attribution: placement 1
 */
import {
  anySegmentTokenLike,
  looksRandomToken,
  SEPARATOR_SPLIT_RE,
  isEncodedUrl,
  hasEmbeddedSecret,
  safeDecodeURIComponent,
  userinfoAtIndex,
  looksLikeUrlWithScheme,
  HEADER_SEPARATOR_RE,
  redactUnlessSafe,
} from "../services/mcp/auth.js";
import { countCharInString } from "./stringUtils.js";
import { uniq } from "./collections.js";

//@ chunk-yqnmafqp.js:4135-5542 placement
/**
 * 脱敏 URL 用于日志：用户名/密码替换为 REDACTED，查询参数与片段中名称看似秘密的键值、令牌形状的值替换为 REDACTED；无法解析时返回 [unparseable url]。
 */
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
    if (index === -1 || /^=*$/.test(s.slice(index + 1))) return anySegmentTokenLike(s) ? "REDACTED" : s;
    let sliced = s.slice(0, index);
    return `${anySegmentTokenLike(sliced) || (anySegmentTokenLike(s) && looksRandomToken(sliced)) ? "REDACTED" : sliced}=REDACTED`;
  };
  let r = (s) =>
    s
      .split(SEPARATOR_SPLIT_RE)
      .map((i, a) => (a % 2 === 1 ? i : o(i)))
      .join("");
  let c = (s) => {
    let i = r(s);
    if (isEncodedUrl(i) || hasEmbeddedSecret(i)) return "REDACTED";
    let a = i;
    for (let idx = 0; idx < 3; idx++) {
      let u = safeDecodeURIComponent(a);
      if (u === a) break;
      if (r(u) !== u || userinfoAtIndex(u) !== -1 || hasEmbeddedSecret(u)) return "REDACTED";
      a = u;
    }
    return i;
  };
  let D = `${n ? e.protocol : ""}${e.pathname}`;
  let M = userinfoAtIndex(D);
  let f;
  if (looksLikeUrlWithScheme(e.pathname, true)) {
    let index = e.pathname.indexOf("/");
    let i = `${e.protocol}${index === -1 ? e.pathname : e.pathname.slice(0, index)}`;
    f =
      n && userinfoAtIndex(i) !== -1
        ? "REDACTED"
        : `${n ? e.protocol : ""}${e.pathname.startsWith("/") ? "/" : ""}REDACTED`;
  } else {
    let mapped = e.pathname.split("/").map(c);
    if (n) mapped[0] = `${e.protocol}${mapped[0] ?? ""}`;
    if (M !== -1) {
      let i = (B) => countCharInString(D.slice(0, B), "/");
      let a = i(D.indexOf(":"));
      let g = i(M);
      let u = mapped[g] ?? "";
      let U = u.includes("@") ? u.slice(u.lastIndexOf("@")) : "";
      mapped.splice(a, g - a + 1, `REDACTED${U}`);
    }
    f = mapped.join("/");
  }
  if (!n) {
    e.pathname = f;
    if (HEADER_SEPARATOR_RE.test(e.hostname)) e.hostname = "REDACTED";
  }
  let z = uniq(e.searchParams.keys());
  let j = new Set([...e.searchParams.entries()].filter(([, s]) => s === "").map(([s]) => s));
  let uRLSearchParams = new URLSearchParams();
  for (let s of z) uRLSearchParams.append(redactUnlessSafe(s, !j.has(s)), "REDACTED");
  e.search = uRLSearchParams.toString();
  e.hash = "";
  return n ? `${f}${e.search}` : e.href;
}
export { redactUrlSecrets };
