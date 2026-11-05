/**
 * context/session.tsx
 *
 * SessionProvider 及 useHost/useProject/useSession（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9rmr50wd.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  createContext,
  useState,
  useContext,
  useRef,
  useSyncExternalStore,
} from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { getSessionProject } from "../bootstrap/sessionSlices.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-9rmr50wd.js:345-349 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9rmr50wd.js:345", () => {
  init_react_production();
});
//@ chunk-9rmr50wd.js:349-399 placement
var sessionContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var hostContext;
var storageContext;
var noopUnsubscribe;
deferInit("chunk-9rmr50wd.js:349", () => {
  sessionContext = createContext(null);
  hostContext = createContext(null);
  storageContext = createContext(null);
  noopUnsubscribe = () => () => {};
});
//@ chunk-9rmr50wd.js:399-866 placement
/**
 * 会话上下文 Provider：提供 session 本身、其 host，以及一个可订阅的项目视图（subscribe + 读取当前项目）。
 */
function SessionProvider(props) {
  let $ = useMemoCache(11);
  let { session, children } = props;
  let sessionValue;
  if ($[0] !== session) {
    sessionValue = () => ({
      subscribe: session.subscribe,
      get: () => getSessionProject(session),
    });
    $[0] = session;
    $[1] = sessionValue;
  } else sessionValue = $[1];
  let [sessionValue_] = useState(sessionValue);
  let children_2;
  if ($[2] !== children || $[3] !== sessionValue_) {
    children_2 = jsxProd_default(storageContext.Provider, {
      value: sessionValue_,
      children,
    });
    $[2] = children;
    $[3] = sessionValue_;
    $[4] = children_2;
  } else children_2 = $[4];
  let children_3;
  if ($[5] !== session.host || $[6] !== children_2) {
    children_3 = jsxProd_default(hostContext.Provider, {
      value: session.host,
      children: children_2,
    });
    $[5] = session.host;
    $[6] = children_2;
    $[7] = children_3;
  } else children_3 = $[7];
  let providerElement;
  if ($[8] !== session || $[9] !== children_3) {
    providerElement = jsxProd_default(sessionContext.Provider, {
      value: session,
      children: children_3,
    });
    $[8] = session;
    $[9] = children_3;
    $[10] = providerElement;
  } else providerElement = $[10];
  return providerElement;
}
//@ chunk-9rmr50wd.js:866-1210 placement
/**
 * 在没有完整会话时直接提供 host 与固定的项目视图（不会变化的订阅）。
 */
function ProjectProvider(props) {
  let $ = useMemoCache(8);
  let { host, project, children } = props;
  let projectValue;
  if ($[0] !== project) {
    projectValue = () => ({
      subscribe: noopUnsubscribe,
      get: () => project,
    });
    $[0] = project;
    $[1] = projectValue;
  } else projectValue = $[1];
  let [projectValue_] = useState(projectValue);
  let children_2;
  if ($[2] !== children || $[3] !== projectValue_) {
    children_2 = jsxProd_default(storageContext.Provider, {
      value: projectValue_,
      children,
    });
    $[2] = children;
    $[3] = projectValue_;
    $[4] = children_2;
  } else children_2 = $[4];
  let providerElement;
  if ($[5] !== host || $[6] !== children_2) {
    providerElement = jsxProd_default(hostContext.Provider, {
      value: host,
      children: children_2,
    });
    $[5] = host;
    $[6] = children_2;
    $[7] = providerElement;
  } else providerElement = $[7];
  return providerElement;
}
//@ chunk-9rmr50wd.js:1210-1361 placement
function useHost() {
  let contextValue = useContext(hostContext);
  if (!contextValue) {
    throw ReferenceError(
      "useHost cannot be called outside of a <SessionProvider /> or <HostProjectProvider />",
    );
  }
  return contextValue;
}
//@ chunk-9rmr50wd.js:1361-1539 placement
function useProject(selector) {
  let contextValue = useContext(storageContext);
  if (!contextValue) {
    throw ReferenceError(
      "useProject cannot be called outside of a <SessionProvider /> or <HostProjectProvider />",
    );
  }
  return useStableSelectorStore(contextValue, contextValue.subscribe, contextValue.get, selector);
}
//@ chunk-9rmr50wd.js:1539-1574 placement
/**
 * 函数 useSessionOrUndefined（取会话，缺省 undefined）；位于「SessionProvider 及 useHost/useProject/useSession（2.1.316 新增）」模块。
 */
function useSessionOrUndefined() {
  return useContext(sessionContext) ?? undefined;
}
//@ chunk-9rmr50wd.js:1574-1780 placement
function useSession(selector) {
  let $ = useMemoCache(2);
  let contextValue = useContext(sessionContext);
  if (!contextValue) {
    throw ReferenceError("useSession cannot be called outside of a <SessionProvider />");
  }
  let read;
  if ($[0] !== contextValue) {
    read = () => contextValue;
    $[0] = contextValue;
    $[1] = read;
  } else read = $[1];
  return useStableSelectorStore(contextValue, contextValue.subscribe, read, selector);
}
//@ chunk-9rmr50wd.js:1780-2036 placement
function useStableSelectorStore(storeKey, subscribe, read, selector) {
  let selectedRef = useRef(null);
  if (selectedRef.current === null || selectedRef.current.owner !== storeKey) {
    let store = {
      owner: storeKey,
      read,
      selector,
      get: () => {
        let current = store.read();
        return store.selector ? store.selector(current) : current;
      },
    };
    selectedRef.current = store;
  }
  selectedRef.current.read = read;
  selectedRef.current.selector = selector;
  let getCached = selectedRef.current.get;
  return useSyncExternalStore(subscribe, getCached, getCached);
}
export { useHost, useSession, useSessionOrUndefined, useProject, SessionProvider, ProjectProvider };
