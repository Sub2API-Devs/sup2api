/**
 * diff/libcjs/diff/base.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: diff@9.0.0
 * pieces: chunk-7vb8p3zb.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-7vb8p3zb.js:191-3027 esm-fingerprint
class Diff {
  diff(oldStr, newStr, options = {}) {
    let callback;
    if (typeof options === "function") {
      callback = options;
      options = {};
    } else if ("callback" in options) callback = options.callback;
    let oldString = this.castInput(oldStr, options);
    let newString = this.castInput(newStr, options);
    let oldTokens = this.removeEmpty(this.tokenize(oldString, options));
    let newTokens = this.removeEmpty(this.tokenize(newString, options));
    return this.diffWithOptionsObj(oldTokens, newTokens, options, callback);
  }
  diffWithOptionsObj(oldTokens, newTokens, options, callback) {
    var _a;
    let done = (value) => {
      value = this.postProcess(value, options);
      if (callback) {
        setTimeout(function () {
          callback(value);
        }, 0);
        return;
      } else return value;
    };
    let newLen = newTokens.length;
    let oldLen = oldTokens.length;
    let editLength = 1;
    let maxEditLength = newLen + oldLen;
    if (options.maxEditLength != null) maxEditLength = Math.min(maxEditLength, options.maxEditLength);
    let maxExecutionTime = (_a = options.timeout) !== null && _a !== undefined ? _a : 1 / 0;
    let abortAfterTimestamp = Date.now() + maxExecutionTime;
    let bestPath = [
      {
        oldPos: -1,
        lastComponent: undefined,
      },
    ];
    let newPos = this.extractCommon(bestPath[0], newTokens, oldTokens, 0, options);
    if (bestPath[0].oldPos + 1 >= oldLen && newPos + 1 >= newLen)
      return done(this.buildValues(bestPath[0].lastComponent, newTokens, oldTokens));
    let minDiagonalToConsider = -1 / 0;
    let maxDiagonalToConsider = 1 / 0;
    let execEditLength = () => {
      for (
        let diagonalPath = Math.max(minDiagonalToConsider, -editLength);
        diagonalPath <= Math.min(maxDiagonalToConsider, editLength);
        diagonalPath += 2
      ) {
        let basePath;
        let removePath = bestPath[diagonalPath - 1];
        let addPath = bestPath[diagonalPath + 1];
        if (removePath) bestPath[diagonalPath - 1] = undefined;
        let canAdd = false;
        if (addPath) {
          let addPathNewPos = addPath.oldPos - diagonalPath;
          canAdd = addPath && 0 <= addPathNewPos && addPathNewPos < newLen;
        }
        let canRemove = removePath && removePath.oldPos + 1 < oldLen;
        if (!canAdd && !canRemove) {
          bestPath[diagonalPath] = undefined;
          continue;
        }
        if (!canRemove || (canAdd && removePath.oldPos < addPath.oldPos))
          basePath = this.addToPath(addPath, true, false, 0, options);
        else basePath = this.addToPath(removePath, false, true, 1, options);
        newPos = this.extractCommon(basePath, newTokens, oldTokens, diagonalPath, options);
        if (basePath.oldPos + 1 >= oldLen && newPos + 1 >= newLen)
          return done(this.buildValues(basePath.lastComponent, newTokens, oldTokens)) || true;
        else {
          bestPath[diagonalPath] = basePath;
          if (basePath.oldPos + 1 >= oldLen)
            maxDiagonalToConsider = Math.min(maxDiagonalToConsider, diagonalPath - 1);
          if (newPos + 1 >= newLen) minDiagonalToConsider = Math.max(minDiagonalToConsider, diagonalPath + 1);
        }
      }
      editLength++;
    };
    if (callback)
      (function exec() {
        setTimeout(function () {
          if (editLength > maxEditLength || Date.now() > abortAfterTimestamp) return callback(undefined);
          if (!execEditLength()) exec();
        }, 0);
      })();
    else
      while (editLength <= maxEditLength && Date.now() <= abortAfterTimestamp) {
        let ret = execEditLength();
        if (ret) return ret;
      }
  }
  addToPath(path, added, removed, oldPosInc, options) {
    let last = path.lastComponent;
    if (last && !options.oneChangePerToken && last.added === added && last.removed === removed)
      return {
        oldPos: path.oldPos + oldPosInc,
        lastComponent: {
          count: last.count + 1,
          added,
          removed,
          previousComponent: last.previousComponent,
        },
      };
    else
      return {
        oldPos: path.oldPos + oldPosInc,
        lastComponent: {
          count: 1,
          added,
          removed,
          previousComponent: last,
        },
      };
  }
  extractCommon(basePath, newTokens, oldTokens, diagonalPath, options) {
    let newLen = newTokens.length;
    let oldLen = oldTokens.length;
    let oldPos = basePath.oldPos;
    let newPos = oldPos - diagonalPath;
    let commonCount = 0;
    while (
      newPos + 1 < newLen &&
      oldPos + 1 < oldLen &&
      this.equals(oldTokens[oldPos + 1], newTokens[newPos + 1], options)
    ) {
      newPos++;
      oldPos++;
      commonCount++;
      if (options.oneChangePerToken)
        basePath.lastComponent = {
          count: 1,
          previousComponent: basePath.lastComponent,
          added: false,
          removed: false,
        };
    }
    if (commonCount && !options.oneChangePerToken)
      basePath.lastComponent = {
        count: commonCount,
        previousComponent: basePath.lastComponent,
        added: false,
        removed: false,
      };
    basePath.oldPos = oldPos;
    return newPos;
  }
  equals(left, right, options) {
    if (options.comparator) return options.comparator(left, right);
    else return left === right || (!!options.ignoreCase && left.toLowerCase() === right.toLowerCase());
  }
  removeEmpty(array) {
    let ret = [];
    for (let i = 0; i < array.length; i++) if (array[i]) ret.push(array[i]);
    return ret;
  }
  castInput(value, options) {
    return value;
  }
  tokenize(value, options) {
    return Array.from(value);
  }
  join(chars) {
    return chars.join("");
  }
  postProcess(changeObjects, options) {
    return changeObjects;
  }
  get useLongestToken() {
    return false;
  }
  buildValues(lastComponent, newTokens, oldTokens) {
    let components = [];
    let nextComponent;
    while (lastComponent) {
      components.push(lastComponent);
      nextComponent = lastComponent.previousComponent;
      delete lastComponent.previousComponent;
      lastComponent = nextComponent;
    }
    components.reverse();
    let componentLen = components.length;
    let componentPos = 0;
    let newPos = 0;
    let oldPos = 0;
    for (; componentPos < componentLen; componentPos++) {
      let component = components[componentPos];
      if (!component.removed) {
        if (!component.added && this.useLongestToken) {
          let value = newTokens.slice(newPos, newPos + component.count);
          value = value.map(function (value, i) {
            let oldValue = oldTokens[oldPos + i];
            return oldValue.length > value.length ? oldValue : value;
          });
          component.value = this.join(value);
        } else component.value = this.join(newTokens.slice(newPos, newPos + component.count));
        newPos += component.count;
        if (!component.added) oldPos += component.count;
      } else {
        component.value = this.join(oldTokens.slice(oldPos, oldPos + component.count));
        oldPos += component.count;
      }
    }
    return components;
  }
}
export { Diff };
