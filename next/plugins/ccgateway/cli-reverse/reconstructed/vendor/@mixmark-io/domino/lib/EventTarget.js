/**
 * @mixmark-io/domino/lib/EventTarget.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_Event } from "./Event.js";
import { require_MouseEvent } from "./MouseEvent.js";
import { require_utils } from "./utils.js";

//@ chunk-w04z664w.js:7704-11263 cjs-fingerprint
var require_EventTarget = __commonJS(function (cjsExports, cjsModule) {
  var EventModule = require_Event();
  var MouseEvent = require_MouseEvent();
  var utils = require_utils();
  cjsModule.exports = EventTargetClass;
  function EventTargetClass() {}
  EventTargetClass.prototype = {
    addEventListener: function (type, listener, capture) {
      if (!listener) return;
      if (capture === undefined) capture = false;
      if (!this._listeners) this._listeners = Object.create(null);
      if (!this._listeners[type]) this._listeners[type] = [];
      var list = this._listeners[type];
      for (var i = 0, n = list.length; i < n; i++) {
        var l = list[i];
        if (l.listener === listener && l.capture === capture) return;
      }
      var obj = {
        listener,
        capture,
      };
      if (typeof listener === "function") obj.f = listener;
      list.push(obj);
    },
    removeEventListener: function (type, listener, capture) {
      if (capture === undefined) capture = false;
      if (this._listeners) {
        var list = this._listeners[type];
        if (list)
          for (var i = 0, n = list.length; i < n; i++) {
            var l = list[i];
            if (l.listener === listener && l.capture === capture) {
              if (list.length === 1) this._listeners[type] = undefined;
              else list.splice(i, 1);
              return;
            }
          }
      }
    },
    dispatchEvent: function (event) {
      return this._dispatchEvent(event, false);
    },
    _dispatchEvent: function (event, trusted) {
      if (typeof trusted !== "boolean") trusted = false;
      function invoke(target, event) {
        var { type, eventPhase: phase } = event;
        event.currentTarget = target;
        if (phase !== EventModule.CAPTURING_PHASE && target._handlers && target._handlers[type]) {
          var handler = target._handlers[type];
          var rv;
          if (typeof handler === "function") rv = handler.call(event.currentTarget, event);
          else {
            var f = handler.handleEvent;
            if (typeof f !== "function")
              throw TypeError("handleEvent property of event handler object isnot a function.");
            rv = f.call(handler, event);
          }
          switch (event.type) {
            case "mouseover":
              if (rv === true) event.preventDefault();
              break;
            case "beforeunload":
            default:
              if (rv === false) event.preventDefault();
              break;
          }
        }
        var list = target._listeners && target._listeners[type];
        if (!list) return;
        list = list.slice();
        for (var i = 0, n = list.length; i < n; i++) {
          if (event._immediatePropagationStopped) return;
          var l = list[i];
          if (
            (phase === EventModule.CAPTURING_PHASE && !l.capture) ||
            (phase === EventModule.BUBBLING_PHASE && l.capture)
          )
            continue;
          if (l.f) l.f.call(event.currentTarget, event);
          else {
            var fn = l.listener.handleEvent;
            if (typeof fn !== "function")
              throw TypeError("handleEvent property of event listener object is not a function.");
            fn.call(l.listener, event);
          }
        }
      }
      if (!event._initialized || event._dispatching) utils.InvalidStateError();
      event.isTrusted = trusted;
      event._dispatching = true;
      event.target = this;
      var ancestors = [];
      for (var n = this.parentNode; n; n = n.parentNode) ancestors.push(n);
      event.eventPhase = EventModule.CAPTURING_PHASE;
      for (var i = ancestors.length - 1; i >= 0; i--) {
        invoke(ancestors[i], event);
        if (event._propagationStopped) break;
      }
      if (!event._propagationStopped) {
        event.eventPhase = EventModule.AT_TARGET;
        invoke(this, event);
      }
      if (event.bubbles && !event._propagationStopped) {
        event.eventPhase = EventModule.BUBBLING_PHASE;
        for (var ii = 0, nn = ancestors.length; ii < nn; ii++) {
          invoke(ancestors[ii], event);
          if (event._propagationStopped) break;
        }
      }
      event._dispatching = false;
      event.eventPhase = EventModule.AT_TARGET;
      event.currentTarget = null;
      if (trusted && !event.defaultPrevented && event instanceof MouseEvent)
        switch (event.type) {
          case "mousedown":
            this._armed = {
              x: event.clientX,
              y: event.clientY,
              t: event.timeStamp,
            };
            break;
          case "mouseout":
          case "mouseover":
            this._armed = null;
            break;
          case "mouseup":
            if (this._isClick(event)) this._doClick(event);
            this._armed = null;
            break;
        }
      return !event.defaultPrevented;
    },
    _isClick: function (event) {
      return (
        this._armed !== null &&
        event.type === "mouseup" &&
        event.isTrusted &&
        event.button === 0 &&
        event.timeStamp - this._armed.t < 1000 &&
        Math.abs(event.clientX - this._armed.x) < 10 &&
        Math.abs(event.clientY - this._armed.Y) < 10
      );
    },
    _doClick: function (event) {
      if (this._click_in_progress) return;
      this._click_in_progress = true;
      var activated = this;
      while (activated && !activated._post_click_activation_steps) activated = activated.parentNode;
      if (activated && activated._pre_click_activation_steps) activated._pre_click_activation_steps();
      var click = this.ownerDocument.createEvent("MouseEvent");
      click.initMouseEvent(
        "click",
        true,
        true,
        this.ownerDocument.defaultView,
        1,
        event.screenX,
        event.screenY,
        event.clientX,
        event.clientY,
        event.ctrlKey,
        event.altKey,
        event.shiftKey,
        event.metaKey,
        event.button,
        null,
      );
      var result = this._dispatchEvent(click, true);
      if (activated) {
        if (result) {
          if (activated._post_click_activation_steps) activated._post_click_activation_steps(click);
        } else if (activated._cancelled_activation_steps) activated._cancelled_activation_steps();
      }
    },
    _setEventHandler: function (type, handler) {
      if (!this._handlers) this._handlers = Object.create(null);
      this._handlers[type] = handler;
    },
    _getEventHandler: function (type) {
      return (this._handlers && this._handlers[type]) || null;
    },
  };
});
export { require_EventTarget };
