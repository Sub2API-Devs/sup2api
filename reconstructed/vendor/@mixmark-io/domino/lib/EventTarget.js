/**
 * @mixmark-io/domino/lib/EventTarget.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Lt } from "./Event.js";
import { Xa } from "./MouseEvent.js";
import { ee } from "./utils.js";

//@ chunk-vwj6ccer.js:7704-11263 cjs-fingerprint
var Ka = x(function (sd, Bi) {
  var vt = Lt(),
    rl = Xa(),
    al = ee();
  Bi.exports = Fi;
  function Fi() {}
  Fi.prototype = {
    addEventListener: function (t, r, a) {
      if (!r) return;
      if (a === void 0) a = !1;
      if (!this._listeners) this._listeners = Object.create(null);
      if (!this._listeners[t]) this._listeners[t] = [];
      var s = this._listeners[t];
      for (var c = 0, d = s.length; c < d; c++) {
        var g = s[c];
        if (g.listener === r && g.capture === a) return;
      }
      var m = { listener: r, capture: a };
      if (typeof r === "function") m.f = r;
      s.push(m);
    },
    removeEventListener: function (t, r, a) {
      if (a === void 0) a = !1;
      if (this._listeners) {
        var s = this._listeners[t];
        if (s)
          for (var c = 0, d = s.length; c < d; c++) {
            var g = s[c];
            if (g.listener === r && g.capture === a) {
              if (s.length === 1) this._listeners[t] = void 0;
              else s.splice(c, 1);
              return;
            }
          }
      }
    },
    dispatchEvent: function (t) {
      return this._dispatchEvent(t, !1);
    },
    _dispatchEvent: function (t, r) {
      if (typeof r !== "boolean") r = !1;
      function a(v, T) {
        var { type: ne, eventPhase: eventPhase } = T;
        if (((T.currentTarget = v), eventPhase !== vt.CAPTURING_PHASE && v._handlers && v._handlers[ne])) {
          var l = v._handlers[ne],
            be;
          if (typeof l === "function") be = l.call(T.currentTarget, T);
          else {
            var handleEvent = l.handleEvent;
            if (typeof handleEvent !== "function")
              throw TypeError("handleEvent property of event handler object isnot a function.");
            be = handleEvent.call(l, T);
          }
          switch (T.type) {
            case "mouseover":
              if (be === !0) T.preventDefault();
              break;
            case "beforeunload":
            default:
              if (be === !1) T.preventDefault();
              break;
          }
        }
        var O = v._listeners && v._listeners[ne];
        if (!O) return;
        O = O.slice();
        for (var Ye = 0, H = O.length; Ye < H; Ye++) {
          if (T._immediatePropagationStopped) return;
          var ie = O[Ye];
          if (
            (eventPhase === vt.CAPTURING_PHASE && !ie.capture) ||
            (eventPhase === vt.BUBBLING_PHASE && ie.capture)
          )
            continue;
          if (ie.f) ie.f.call(T.currentTarget, T);
          else {
            var handleEvent_2 = ie.listener.handleEvent;
            if (typeof handleEvent_2 !== "function")
              throw TypeError("handleEvent property of event listener object is not a function.");
            handleEvent_2.call(ie.listener, T);
          }
        }
      }
      if (!t._initialized || t._dispatching) al.InvalidStateError();
      ((t.isTrusted = r), (t._dispatching = !0), (t.target = this));
      var s = [];
      for (var parentNode = this.parentNode; parentNode; parentNode = parentNode.parentNode)
        s.push(parentNode);
      t.eventPhase = vt.CAPTURING_PHASE;
      for (var d = s.length - 1; d >= 0; d--) if ((a(s[d], t), t._propagationStopped)) break;
      if (!t._propagationStopped) ((t.eventPhase = vt.AT_TARGET), a(this, t));
      if (t.bubbles && !t._propagationStopped) {
        t.eventPhase = vt.BUBBLING_PHASE;
        for (var g = 0, m = s.length; g < m; g++) if ((a(s[g], t), t._propagationStopped)) break;
      }
      if (
        ((t._dispatching = !1),
        (t.eventPhase = vt.AT_TARGET),
        (t.currentTarget = null),
        r && !t.defaultPrevented && t instanceof rl)
      )
        switch (t.type) {
          case "mousedown":
            this._armed = { x: t.clientX, y: t.clientY, t: t.timeStamp };
            break;
          case "mouseout":
          case "mouseover":
            this._armed = null;
            break;
          case "mouseup":
            if (this._isClick(t)) this._doClick(t);
            this._armed = null;
            break;
        }
      return !t.defaultPrevented;
    },
    _isClick: function (e) {
      return (
        this._armed !== null &&
        e.type === "mouseup" &&
        e.isTrusted &&
        e.button === 0 &&
        e.timeStamp - this._armed.t < 1000 &&
        Math.abs(e.clientX - this._armed.x) < 10 &&
        Math.abs(e.clientY - this._armed.Y) < 10
      );
    },
    _doClick: function (e) {
      if (this._click_in_progress) return;
      this._click_in_progress = !0;
      var t = this;
      while (t && !t._post_click_activation_steps) t = t.parentNode;
      if (t && t._pre_click_activation_steps) t._pre_click_activation_steps();
      var event = this.ownerDocument.createEvent("MouseEvent");
      event.initMouseEvent(
        "click",
        !0,
        !0,
        this.ownerDocument.defaultView,
        1,
        e.screenX,
        e.screenY,
        e.clientX,
        e.clientY,
        e.ctrlKey,
        e.altKey,
        e.shiftKey,
        e.metaKey,
        e.button,
        null,
      );
      var _dispatchEvent = this._dispatchEvent(event, !0);
      if (t) {
        if (_dispatchEvent) {
          if (t._post_click_activation_steps) t._post_click_activation_steps(event);
        } else if (t._cancelled_activation_steps) t._cancelled_activation_steps();
      }
    },
    _setEventHandler: function (t, r) {
      if (!this._handlers) this._handlers = Object.create(null);
      this._handlers[t] = r;
    },
    _getEventHandler: function (t) {
      return (this._handlers && this._handlers[t]) || null;
    },
  };
});

export { Ka };
