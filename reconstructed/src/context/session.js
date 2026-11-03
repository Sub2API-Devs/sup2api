/**
 * context/session.tsx
 *
 * SessionProvider 及 useHost/useProject/useSession（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xzrznswy.js (9)
 * attribution: placement 9
 */
import { j, qt, y, Se, R, yt } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { xo } from "../bootstrap/sessionSlices.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-xzrznswy.js:345-349 placement
j();
//@ chunk-xzrznswy.js:349-399 placement
var l = qt(null),
  d = qt(null),
  P = qt(null),
  h = () => () => {};
/**
 * 会话上下文 Provider：提供 session 本身、其 host，以及一个可订阅的项目视图（subscribe + 读取当前项目）。
 */
//@ chunk-xzrznswy.js:399-866 placement
function SessionProvider(i) {
  let r = w(11),
    { session: session, children: children } = i,
    s;
  if (r[0] !== session)
    ((s = () => ({ subscribe: session.subscribe, get: () => xo(session) })), (r[0] = session), (r[1] = s));
  else s = r[1];
  let [u] = y(s),
    t;
  if (r[2] !== children || r[3] !== u)
    ((t = e(P.Provider, { value: u, children: children })), (r[2] = children), (r[3] = u), (r[4] = t));
  else t = r[4];
  let n;
  if (r[5] !== session.host || r[6] !== t)
    ((n = e(d.Provider, { value: session.host, children: t })),
      (r[5] = session.host),
      (r[6] = t),
      (r[7] = n));
  else n = r[7];
  let p;
  if (r[8] !== session || r[9] !== n)
    ((p = e(l.Provider, { value: session, children: n })), (r[8] = session), (r[9] = n), (r[10] = p));
  else p = r[10];
  return p;
}
/**
 * 在没有完整会话时直接提供 host 与固定的项目视图（不会变化的订阅）。
 */
//@ chunk-xzrznswy.js:866-1210 placement
function ProjectProvider(i) {
  let s = w(8),
    { host: host, project: project, children: children } = i,
    u;
  if (s[0] !== project) ((u = () => ({ subscribe: h, get: () => project })), (s[0] = project), (s[1] = u));
  else u = s[1];
  let [t] = y(u),
    n;
  if (s[2] !== children || s[3] !== t)
    ((n = e(P.Provider, { value: t, children: children })), (s[2] = children), (s[3] = t), (s[4] = n));
  else n = s[4];
  let p;
  if (s[5] !== host || s[6] !== n)
    ((p = e(d.Provider, { value: host, children: n })), (s[5] = host), (s[6] = n), (s[7] = p));
  else p = s[7];
  return p;
}
//@ chunk-xzrznswy.js:1210-1361 placement
function useHost() {
  let i = Se(d);
  if (!i) {
    throw ReferenceError(
      "useHost cannot be called outside of a <SessionProvider /> or <HostProjectProvider />",
    );
  }
  return i;
}
//@ chunk-xzrznswy.js:1361-1539 placement
function useProject(i) {
  let o = Se(P);
  if (!o) {
    throw ReferenceError(
      "useProject cannot be called outside of a <SessionProvider /> or <HostProjectProvider />",
    );
  }
  return useStableSelectorStore(o, o.subscribe, o.get, i);
}
//@ chunk-xzrznswy.js:1539-1574 placement
function iP() {
  return Se(l) ?? void 0;
}
//@ chunk-xzrznswy.js:1574-1780 placement
function useSession(i) {
  let c = w(2),
    o = Se(l);
  if (!o) {
    throw ReferenceError("useSession cannot be called outside of a <SessionProvider />");
  }
  let r;
  if (c[0] !== o) ((r = () => o), (c[0] = o), (c[1] = r));
  else r = c[1];
  return useStableSelectorStore(o, o.subscribe, r, i);
}
//@ chunk-xzrznswy.js:1780-2036 placement
function useStableSelectorStore(i, o, c, r) {
  let s = R(null);
  if (s.current === null || s.current.owner !== i) {
    let t = {
      owner: i,
      read: c,
      selector: r,
      get: () => {
        let read = t.read();
        return t.selector ? t.selector(read) : read;
      },
    };
    s.current = t;
  }
  ((s.current.read = c), (s.current.selector = r));
  let u = s.current.get;
  return yt(o, u, u);
}

export { iP, useHost, useSession, useProject, SessionProvider, ProjectProvider };
