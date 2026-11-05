/**
 * @smithy/middleware-stack/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/middleware-stack@4.2.0..4.2.14
 * pieces: chunk-x53tzdyc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-x53tzdyc.js:307-3961 cjs-fingerprint
var require_middleware_stack = __commonJS(function (cjsExports) {
  var getAllAliases = (name, aliases) => {
    let _aliases = [];
    if (name) _aliases.push(name);
    if (aliases) for (let alias of aliases) _aliases.push(alias);
    return _aliases;
  };
  var getMiddlewareNameWithAliases = (name, aliases) =>
    `${name || "anonymous"}${aliases && aliases.length > 0 ? ` (a.k.a. ${aliases.join(",")})` : ""}`;
  var constructStack = () => {
    let absoluteEntries = [];
    let relativeEntries = [];
    let identifyOnResolve = false;
    let entriesNameSet = new Set();
    let sort = (entries) =>
      entries.sort(
        (a, b) =>
          stepWeights[b.step] - stepWeights[a.step] ||
          priorityWeights[b.priority || "normal"] - priorityWeights[a.priority || "normal"],
      );
    let removeByName = (toRemove) => {
      let isRemoved = false;
      let filterCb = (entry) => {
        let aliases = getAllAliases(entry.name, entry.aliases);
        if (aliases.includes(toRemove)) {
          isRemoved = true;
          for (let alias of aliases) entriesNameSet.delete(alias);
          return false;
        }
        return true;
      };
      absoluteEntries = absoluteEntries.filter(filterCb);
      relativeEntries = relativeEntries.filter(filterCb);
      return isRemoved;
    };
    let removeByReference = (toRemove) => {
      let isRemoved = false;
      let filterCb = (entry) => {
        if (entry.middleware === toRemove) {
          isRemoved = true;
          for (let alias of getAllAliases(entry.name, entry.aliases)) entriesNameSet.delete(alias);
          return false;
        }
        return true;
      };
      absoluteEntries = absoluteEntries.filter(filterCb);
      relativeEntries = relativeEntries.filter(filterCb);
      return isRemoved;
    };
    let cloneTo = (toStack) => {
      absoluteEntries.forEach((entry) => {
        toStack.add(entry.middleware, {
          ...entry,
        });
      });
      relativeEntries.forEach((entry) => {
        toStack.addRelativeTo(entry.middleware, {
          ...entry,
        });
      });
      toStack.identifyOnResolve?.(stack.identifyOnResolve());
      return toStack;
    };
    let expandRelativeMiddlewareList = (from) => {
      let expandedMiddlewareList = [];
      from.before.forEach((entry) => {
        if (entry.before.length === 0 && entry.after.length === 0) expandedMiddlewareList.push(entry);
        else expandedMiddlewareList.push(...expandRelativeMiddlewareList(entry));
      });
      expandedMiddlewareList.push(from);
      from.after.reverse().forEach((entry) => {
        if (entry.before.length === 0 && entry.after.length === 0) expandedMiddlewareList.push(entry);
        else expandedMiddlewareList.push(...expandRelativeMiddlewareList(entry));
      });
      return expandedMiddlewareList;
    };
    let getMiddlewareList = (debug = false) => {
      let normalizedAbsoluteEntries = [];
      let normalizedRelativeEntries = [];
      let normalizedEntriesNameMap = {};
      absoluteEntries.forEach((entry) => {
        let normalizedEntry = {
          ...entry,
          before: [],
          after: [],
        };
        for (let alias of getAllAliases(normalizedEntry.name, normalizedEntry.aliases))
          normalizedEntriesNameMap[alias] = normalizedEntry;
        normalizedAbsoluteEntries.push(normalizedEntry);
      });
      relativeEntries.forEach((entry) => {
        let normalizedEntry = {
          ...entry,
          before: [],
          after: [],
        };
        for (let alias of getAllAliases(normalizedEntry.name, normalizedEntry.aliases))
          normalizedEntriesNameMap[alias] = normalizedEntry;
        normalizedRelativeEntries.push(normalizedEntry);
      });
      normalizedRelativeEntries.forEach((entry) => {
        if (entry.toMiddleware) {
          let toMiddleware = normalizedEntriesNameMap[entry.toMiddleware];
          if (toMiddleware === undefined) {
            if (debug) return;
            throw Error(
              `${entry.toMiddleware} is not found when adding ${getMiddlewareNameWithAliases(entry.name, entry.aliases)} middleware ${entry.relation} ${entry.toMiddleware}`,
            );
          }
          if (entry.relation === "after") toMiddleware.after.push(entry);
          if (entry.relation === "before") toMiddleware.before.push(entry);
        }
      });
      return sort(normalizedAbsoluteEntries)
        .map(expandRelativeMiddlewareList)
        .reduce((wholeList, expandedMiddlewareList) => {
          wholeList.push(...expandedMiddlewareList);
          return wholeList;
        }, []);
    };
    let stack = {
      add: (middleware, options = {}) => {
        let { name, override, aliases: _aliases } = options;
        let entry = {
          step: "initialize",
          priority: "normal",
          middleware,
          ...options,
        };
        let aliases = getAllAliases(name, _aliases);
        if (aliases.length > 0) {
          if (aliases.some((alias) => entriesNameSet.has(alias))) {
            if (!override)
              throw Error(`Duplicate middleware name '${getMiddlewareNameWithAliases(name, _aliases)}'`);
            for (let alias of aliases) {
              let toOverrideIndex = absoluteEntries.findIndex(
                (entry) => entry.name === alias || entry.aliases?.some((a) => a === alias),
              );
              if (toOverrideIndex === -1) continue;
              let toOverride = absoluteEntries[toOverrideIndex];
              if (toOverride.step !== entry.step || entry.priority !== toOverride.priority)
                throw Error(
                  `"${getMiddlewareNameWithAliases(toOverride.name, toOverride.aliases)}" middleware with ${toOverride.priority} priority in ${toOverride.step} step cannot be overridden by "${getMiddlewareNameWithAliases(name, _aliases)}" middleware with ${entry.priority} priority in ${entry.step} step.`,
                );
              absoluteEntries.splice(toOverrideIndex, 1);
            }
          }
          for (let alias of aliases) entriesNameSet.add(alias);
        }
        absoluteEntries.push(entry);
      },
      addRelativeTo: (middleware, options) => {
        let { name, override, aliases: _aliases } = options;
        let entry = {
          middleware,
          ...options,
        };
        let aliases = getAllAliases(name, _aliases);
        if (aliases.length > 0) {
          if (aliases.some((alias) => entriesNameSet.has(alias))) {
            if (!override)
              throw Error(`Duplicate middleware name '${getMiddlewareNameWithAliases(name, _aliases)}'`);
            for (let alias of aliases) {
              let toOverrideIndex = relativeEntries.findIndex(
                (entry) => entry.name === alias || entry.aliases?.some((a) => a === alias),
              );
              if (toOverrideIndex === -1) continue;
              let toOverride = relativeEntries[toOverrideIndex];
              if (toOverride.toMiddleware !== entry.toMiddleware || toOverride.relation !== entry.relation)
                throw Error(
                  `"${getMiddlewareNameWithAliases(toOverride.name, toOverride.aliases)}" middleware ${toOverride.relation} "${toOverride.toMiddleware}" middleware cannot be overridden by "${getMiddlewareNameWithAliases(name, _aliases)}" middleware ${entry.relation} "${entry.toMiddleware}" middleware.`,
                );
              relativeEntries.splice(toOverrideIndex, 1);
            }
          }
          for (let alias of aliases) entriesNameSet.add(alias);
        }
        relativeEntries.push(entry);
      },
      clone: () => cloneTo(constructStack()),
      use: (plugin) => {
        plugin.applyToStack(stack);
      },
      remove: (toRemove) => {
        if (typeof toRemove === "string") return removeByName(toRemove);
        else return removeByReference(toRemove);
      },
      removeByTag: (toRemove) => {
        let isRemoved = false;
        let filterCb = (entry) => {
          let { tags, name, aliases: _aliases } = entry;
          if (tags && tags.includes(toRemove)) {
            let aliases = getAllAliases(name, _aliases);
            for (let alias of aliases) entriesNameSet.delete(alias);
            isRemoved = true;
            return false;
          }
          return true;
        };
        absoluteEntries = absoluteEntries.filter(filterCb);
        relativeEntries = relativeEntries.filter(filterCb);
        return isRemoved;
      },
      concat: (from) => {
        let cloned = cloneTo(constructStack());
        cloned.use(from);
        cloned.identifyOnResolve(
          identifyOnResolve || cloned.identifyOnResolve() || (from.identifyOnResolve?.() ?? false),
        );
        return cloned;
      },
      applyToStack: cloneTo,
      identify: () =>
        getMiddlewareList(true).map((mw) => {
          let step = mw.step ?? mw.relation + " " + mw.toMiddleware;
          return getMiddlewareNameWithAliases(mw.name, mw.aliases) + " - " + step;
        }),
      identifyOnResolve(toggle) {
        if (typeof toggle === "boolean") identifyOnResolve = toggle;
        return identifyOnResolve;
      },
      resolve: (handler, context) => {
        for (let middleware of getMiddlewareList()
          .map((entry) => entry.middleware)
          .reverse())
          handler = middleware(handler, context);
        if (identifyOnResolve) console.log(stack.identify());
        return handler;
      },
    };
    return stack;
  };
  var stepWeights = {
    initialize: 5,
    serialize: 4,
    build: 3,
    finalizeRequest: 2,
    deserialize: 1,
  };
  var priorityWeights = {
    high: 3,
    normal: 2,
    low: 1,
  };
  cjsExports.constructStack = constructStack;
});
export { require_middleware_stack };
