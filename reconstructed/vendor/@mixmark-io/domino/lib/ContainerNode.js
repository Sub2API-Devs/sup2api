/**
 * @mixmark-io/domino/lib/ContainerNode.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { xe } from "./Node.js";
import { yt } from "./NodeList.js";

//@ chunk-vwj6ccer.js:23770-24885 cjs-fingerprint
var Qr = x(function (dd, os) {
  os.exports = cs;
  var ss = xe(),
    pl = yt();
  function cs() {
    (ss.call(this), (this._firstChild = this._childNodes = null));
  }
  cs.prototype = Object.create(ss.prototype, {
    hasChildNodes: {
      value: function () {
        if (this._childNodes) return this._childNodes.length > 0;
        return this._firstChild !== null;
      },
    },
    childNodes: {
      get: function () {
        return (this._ensureChildNodes(), this._childNodes);
      },
    },
    firstChild: {
      get: function () {
        if (this._childNodes) return this._childNodes.length === 0 ? null : this._childNodes[0];
        return this._firstChild;
      },
    },
    lastChild: {
      get: function () {
        var _childNodes = this._childNodes,
          t;
        if (_childNodes) return _childNodes.length === 0 ? null : _childNodes[_childNodes.length - 1];
        if (((t = this._firstChild), t === null)) return null;
        return t._previousSibling;
      },
    },
    _ensureChildNodes: {
      value: function () {
        if (this._childNodes) return;
        var _firstChild = this._firstChild,
          t = _firstChild,
          r = (this._childNodes = new pl());
        if (_firstChild)
          do (r.push(t), (t = t._nextSibling));
          while (t !== _firstChild);
        this._firstChild = null;
      },
    },
    removeChildren: {
      value: function () {
        var t = this.rooted ? this.ownerDocument : null,
          firstChild = this.firstChild,
          a;
        while (firstChild !== null) {
          if (((a = firstChild), (firstChild = a.nextSibling), t)) t.mutateRemove(a);
          a.parentNode = null;
        }
        if (this._childNodes) this._childNodes.length = 0;
        else this._firstChild = null;
        this.modify();
      },
    },
  });
});

export { Qr };
