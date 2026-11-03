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
import { init_react_production, qt, y, Se, R, yt } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { getSessionProject } from "../bootstrap/sessionSlices.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-xzrznswy.js:345-349 placement
init_react_production();
//@ chunk-xzrznswy.js:349-399 placement
var sessionContext = qt(null);
var hostContext = qt(null);
var storageContext = qt(null);
var noopUnsubscribe = () => () => {};
//@ chunk-xzrznswy.js:399-866 placement
/**
 * 会话上下文 Provider：提供 session 本身、其 host，以及一个可订阅的项目视图（subscribe + 读取当前项目）。
 */
function SessionProvider(props) {
  let r = w(11);
  let { session, children } = props;
  let s;
  if (r[0] !== session) {
    s = () => ({
      subscribe: session.subscribe,
      get: () => getSessionProject(session),
    });
    r[0] = session;
    r[1] = s;
  } else s = r[1];
  let [u] = y(s);
  let children_2;
  if (r[2] !== children || r[3] !== u) {
    children_2 = jsxProd_default(storageContext.Provider, {
      value: u,
      children,
    });
    r[2] = children;
    r[3] = u;
    r[4] = children_2;
  } else children_2 = r[4];
  let children_3;
  if (r[5] !== session.host || r[6] !== children_2) {
    children_3 = jsxProd_default(hostContext.Provider, {
      value: session.host,
      children: children_2,
    });
    r[5] = session.host;
    r[6] = children_2;
    r[7] = children_3;
  } else children_3 = r[7];
  let p;
  if (r[8] !== session || r[9] !== children_3) {
    p = jsxProd_default(sessionContext.Provider, {
      value: session,
      children: children_3,
    });
    r[8] = session;
    r[9] = children_3;
    r[10] = p;
  } else p = r[10];
  return p;
}
//@ chunk-xzrznswy.js:866-1210 placement
/**
 * 在没有完整会话时直接提供 host 与固定的项目视图（不会变化的订阅）。
 */
function ProjectProvider(props) {
  let s = w(8);
  let { host, project, children } = props;
  let u;
  if (s[0] !== project) {
    u = () => ({
      subscribe: noopUnsubscribe,
      get: () => project,
    });
    s[0] = project;
    s[1] = u;
  } else u = s[1];
  let [t] = y(u);
  let children_2;
  if (s[2] !== children || s[3] !== t) {
    children_2 = jsxProd_default(storageContext.Provider, {
      value: t,
      children,
    });
    s[2] = children;
    s[3] = t;
    s[4] = children_2;
  } else children_2 = s[4];
  let p;
  if (s[5] !== host || s[6] !== children_2) {
    p = jsxProd_default(hostContext.Provider, {
      value: host,
      children: children_2,
    });
    s[5] = host;
    s[6] = children_2;
    s[7] = p;
  } else p = s[7];
  return p;
}
//@ chunk-xzrznswy.js:1210-1361 placement
function useHost() {
  let i = Se(hostContext);
  if (!i) {
    throw ReferenceError(
      "useHost cannot be called outside of a <SessionProvider /> or <HostProjectProvider />",
    );
  }
  return i;
}
//@ chunk-xzrznswy.js:1361-1539 placement
function useProject(selector) {
  let o = Se(storageContext);
  if (!o) {
    throw ReferenceError(
      "useProject cannot be called outside of a <SessionProvider /> or <HostProjectProvider />",
    );
  }
  return useStableSelectorStore(o, o.subscribe, o.get, selector);
}
//@ chunk-xzrznswy.js:1539-1574 placement
/**
 * 函数 useSessionOrUndefined（取会话，缺省 undefined）；位于「SessionProvider 及 useHost/useProject/useSession（2.1.316 新增）」模块。
 */
function useSessionOrUndefined() {
  return Se(sessionContext) ?? undefined;
}
//@ chunk-xzrznswy.js:1574-1780 placement
function useSession(selector) {
  let c = w(2);
  let o = Se(sessionContext);
  if (!o) {
    throw ReferenceError("useSession cannot be called outside of a <SessionProvider />");
  }
  let read;
  if (c[0] !== o) {
    read = () => o;
    c[0] = o;
    c[1] = read;
  } else read = c[1];
  return useStableSelectorStore(o, o.subscribe, read, selector);
}
//@ chunk-xzrznswy.js:1780-2036 placement
function useStableSelectorStore(i, subscribe, read, selector) {
  let s = R(null);
  if (s.current === null || s.current.owner !== i) {
    let t = {
      owner: i,
      read,
      selector,
      get: () => {
        let n = t.read();
        return t.selector ? t.selector(n) : n;
      },
    };
    s.current = t;
  }
  s.current.read = read;
  s.current.selector = selector;
  let u = s.current.get;
  return yt(subscribe, u, u);
}
export { useHost, useSessionOrUndefined, useSession, useProject, SessionProvider, ProjectProvider };
