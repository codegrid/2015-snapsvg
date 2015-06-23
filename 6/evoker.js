(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.evoker = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports", "module", "./lib/Evoker"], factory);
  } else if (typeof exports !== "undefined" && typeof module !== "undefined") {
    factory(exports, module, require("./lib/Evoker"));
  }
})(function (exports, module, _libEvoker) {
  var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

  var evoker = _interopRequire(_libEvoker);

  module.exports = evoker;
});

},{"./lib/Evoker":4}],2:[function(require,module,exports){
/*!
 * EventEmitter2
 * https://github.com/hij1nx/EventEmitter2
 *
 * Copyright (c) 2013 hij1nx
 * Licensed under the MIT license.
 */
;!function(undefined) {

  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };
  var defaultMaxListeners = 10;

  function init() {
    this._events = {};
    if (this._conf) {
      configure.call(this, this._conf);
    }
  }

  function configure(conf) {
    if (conf) {

      this._conf = conf;

      conf.delimiter && (this.delimiter = conf.delimiter);
      conf.maxListeners && (this._events.maxListeners = conf.maxListeners);
      conf.wildcard && (this.wildcard = conf.wildcard);
      conf.newListener && (this.newListener = conf.newListener);

      if (this.wildcard) {
        this.listenerTree = {};
      }
    }
  }

  function EventEmitter(conf) {
    this._events = {};
    this.newListener = false;
    configure.call(this, conf);
  }

  //
  // Attention, function return type now is array, always !
  // It has zero elements if no any matches found and one or more
  // elements (leafs) if there are matches
  //
  function searchListenerTree(handlers, type, tree, i) {
    if (!tree) {
      return [];
    }
    var listeners=[], leaf, len, branch, xTree, xxTree, isolatedBranch, endReached,
        typeLength = type.length, currentType = type[i], nextType = type[i+1];
    if (i === typeLength && tree._listeners) {
      //
      // If at the end of the event(s) list and the tree has listeners
      // invoke those listeners.
      //
      if (typeof tree._listeners === 'function') {
        handlers && handlers.push(tree._listeners);
        return [tree];
      } else {
        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
          handlers && handlers.push(tree._listeners[leaf]);
        }
        return [tree];
      }
    }

    if ((currentType === '*' || currentType === '**') || tree[currentType]) {
      //
      // If the event emitted is '*' at this part
      // or there is a concrete match at this patch
      //
      if (currentType === '*') {
        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+1));
          }
        }
        return listeners;
      } else if(currentType === '**') {
        endReached = (i+1 === typeLength || (i+2 === typeLength && nextType === '*'));
        if(endReached && tree._listeners) {
          // The next element has a _listeners, add it to the handlers.
          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
        }

        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            if(branch === '*' || branch === '**') {
              if(tree[branch]._listeners && !endReached) {
                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
              }
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            } else if(branch === nextType) {
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+2));
            } else {
              // No match on this one, shift into the tree but not in the type array.
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            }
          }
        }
        return listeners;
      }

      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i+1));
    }

    xTree = tree['*'];
    if (xTree) {
      //
      // If the listener tree will allow any match for this part,
      // then recursively explore all branches of the tree
      //
      searchListenerTree(handlers, type, xTree, i+1);
    }

    xxTree = tree['**'];
    if(xxTree) {
      if(i < typeLength) {
        if(xxTree._listeners) {
          // If we have a listener on a '**', it will catch all, so add its handler.
          searchListenerTree(handlers, type, xxTree, typeLength);
        }

        // Build arrays of matching next branches and others.
        for(branch in xxTree) {
          if(branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
            if(branch === nextType) {
              // We know the next element will match, so jump twice.
              searchListenerTree(handlers, type, xxTree[branch], i+2);
            } else if(branch === currentType) {
              // Current node matches, move into the tree.
              searchListenerTree(handlers, type, xxTree[branch], i+1);
            } else {
              isolatedBranch = {};
              isolatedBranch[branch] = xxTree[branch];
              searchListenerTree(handlers, type, { '**': isolatedBranch }, i+1);
            }
          }
        }
      } else if(xxTree._listeners) {
        // We have reached the end and still on a '**'
        searchListenerTree(handlers, type, xxTree, typeLength);
      } else if(xxTree['*'] && xxTree['*']._listeners) {
        searchListenerTree(handlers, type, xxTree['*'], typeLength);
      }
    }

    return listeners;
  }

  function growListenerTree(type, listener) {

    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();

    //
    // Looks for two consecutive '**', if so, don't add the event at all.
    //
    for(var i = 0, len = type.length; i+1 < len; i++) {
      if(type[i] === '**' && type[i+1] === '**') {
        return;
      }
    }

    var tree = this.listenerTree;
    var name = type.shift();

    while (name) {

      if (!tree[name]) {
        tree[name] = {};
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        }
        else if(typeof tree._listeners === 'function') {
          tree._listeners = [tree._listeners, listener];
        }
        else if (isArray(tree._listeners)) {

          tree._listeners.push(listener);

          if (!tree._listeners.warned) {

            var m = defaultMaxListeners;

            if (typeof this._events.maxListeners !== 'undefined') {
              m = this._events.maxListeners;
            }

            if (m > 0 && tree._listeners.length > m) {

              tree._listeners.warned = true;
              console.error('(node) warning: possible EventEmitter memory ' +
                            'leak detected. %d listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit.',
                            tree._listeners.length);
              console.trace();
            }
          }
        }
        return true;
      }
      name = type.shift();
    }
    return true;
  }

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.

  EventEmitter.prototype.delimiter = '.';

  EventEmitter.prototype.setMaxListeners = function(n) {
    this._events || init.call(this);
    this._events.maxListeners = n;
    if (!this._conf) this._conf = {};
    this._conf.maxListeners = n;
  };

  EventEmitter.prototype.event = '';

  EventEmitter.prototype.once = function(event, fn) {
    this.many(event, 1, fn);
    return this;
  };

  EventEmitter.prototype.many = function(event, ttl, fn) {
    var self = this;

    if (typeof fn !== 'function') {
      throw new Error('many only accepts instances of Function');
    }

    function listener() {
      if (--ttl === 0) {
        self.off(event, listener);
      }
      fn.apply(this, arguments);
    }

    listener._origin = fn;

    this.on(event, listener);

    return self;
  };

  EventEmitter.prototype.emit = function() {

    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener' && !this.newListener) {
      if (!this._events.newListener) { return false; }
    }

    // Loop through the *_all* functions and invoke them.
    if (this._all) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
      for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        this._all[i].apply(this, args);
      }
    }

    // If there is no 'error' event listener then throw.
    if (type === 'error') {

      if (!this._all &&
        !this._events.error &&
        !(this.wildcard && this.listenerTree.error)) {

        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
          throw new Error("Uncaught, unspecified 'error' event.");
        }
        return false;
      }
    }

    var handler;

    if(this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    }
    else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      if (arguments.length === 1) {
        handler.call(this);
      }
      else if (arguments.length > 1)
        switch (arguments.length) {
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[1], arguments[2]);
            break;
          // slower
          default:
            var l = arguments.length;
            var args = new Array(l - 1);
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
            handler.apply(this, args);
        }
      return true;
    }
    else if (handler) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        this.event = type;
        listeners[i].apply(this, args);
      }
      return (listeners.length > 0) || !!this._all;
    }
    else {
      return !!this._all;
    }

  };

  EventEmitter.prototype.on = function(type, listener) {

    if (typeof type === 'function') {
      this.onAny(type);
      return this;
    }

    if (typeof listener !== 'function') {
      throw new Error('on only accepts instances of Function');
    }
    this._events || init.call(this);

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if(this.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    }
    else if(typeof this._events[type] === 'function') {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    }
    else if (isArray(this._events[type])) {
      // If we've already got an array, just append.
      this._events[type].push(listener);

      // Check for listener leak
      if (!this._events[type].warned) {

        var m = defaultMaxListeners;

        if (typeof this._events.maxListeners !== 'undefined') {
          m = this._events.maxListeners;
        }

        if (m > 0 && this._events[type].length > m) {

          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
                        'leak detected. %d listeners added. ' +
                        'Use emitter.setMaxListeners() to increase limit.',
                        this._events[type].length);
          console.trace();
        }
      }
    }
    return this;
  };

  EventEmitter.prototype.onAny = function(fn) {

    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    if(!this._all) {
      this._all = [];
    }

    // Add the function to the event listener collection.
    this._all.push(fn);
    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype.off = function(type, listener) {
    if (typeof listener !== 'function') {
      throw new Error('removeListener only takes instances of Function');
    }

    var handlers,leafs=[];

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
    }
    else {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events[type]) return this;
      handlers = this._events[type];
      leafs.push({_listeners:handlers});
    }

    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
      var leaf = leafs[iLeaf];
      handlers = leaf._listeners;
      if (isArray(handlers)) {

        var position = -1;

        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i] === listener ||
            (handlers[i].listener && handlers[i].listener === listener) ||
            (handlers[i]._origin && handlers[i]._origin === listener)) {
            position = i;
            break;
          }
        }

        if (position < 0) {
          continue;
        }

        if(this.wildcard) {
          leaf._listeners.splice(position, 1);
        }
        else {
          this._events[type].splice(position, 1);
        }

        if (handlers.length === 0) {
          if(this.wildcard) {
            delete leaf._listeners;
          }
          else {
            delete this._events[type];
          }
        }
        return this;
      }
      else if (handlers === listener ||
        (handlers.listener && handlers.listener === listener) ||
        (handlers._origin && handlers._origin === listener)) {
        if(this.wildcard) {
          delete leaf._listeners;
        }
        else {
          delete this._events[type];
        }
      }
    }

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          return this;
        }
      }
    } else {
      this._all = [];
    }
    return this;
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

  EventEmitter.prototype.removeAllListeners = function(type) {
    if (arguments.length === 0) {
      !this._events || init.call(this);
      return this;
    }

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    }
    else {
      if (!this._events[type]) return this;
      this._events[type] = null;
    }
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if(this.wildcard) {
      var handlers = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
      return handlers;
    }

    this._events || init.call(this);

    if (!this._events[type]) this._events[type] = [];
    if (!isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };

  EventEmitter.prototype.listenersAny = function() {

    if(this._all) {
      return this._all;
    }
    else {
      return [];
    }

  };

  if (typeof define === 'function' && define.amd) {
     // AMD. Register as an anonymous module.
    define(function() {
      return EventEmitter;
    });
  } else if (typeof exports === 'object') {
    // CommonJS
    exports.EventEmitter2 = EventEmitter;
  }
  else {
    // Browser global.
    window.EventEmitter2 = EventEmitter;
  }
}();

},{}],3:[function(require,module,exports){
(function (factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports", "module", "./util/typeof"], factory);
  } else if (typeof exports !== "undefined" && typeof module !== "undefined") {
    factory(exports, module, require("./util/typeof"));
  }
})(function (exports, module, _utilTypeof) {
  var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

  var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

  var typeOf = _interopRequire(_utilTypeof);

  var className = {
    log: "evoker__color--log",
    warn: "evoker__color--warn",
    error: "evoker__color--error"
  };

  var ConsoleToDom = (function () {
    function ConsoleToDom(_ref) {
      var output = _ref.output;

      _classCallCheck(this, ConsoleToDom);

      this.types = ["log", "warn", "error"];
      this.output = output;
      this.origins = {};
      this.target = output.logarea || document.body;
      this._eventify();
      this._consolify();
    }

    _createClass(ConsoleToDom, {
      _eventify: {
        value: function _eventify() {
          this.output.on("enable", this._consolify.bind(this));
          this.output.on("disable", this._resetify.bind(this));
        }
      },
      _resetify: {
        value: function _resetify() {
          var _this = this;

          this.output.hideLogarea();
          this.types.forEach(function (type) {
            console[type] = _this.origins[type];
          });
        }
      },
      _consolify: {
        value: function _consolify() {
          var _this = this;

          this.output.showLogarea();
          this.types.forEach(function (type) {
            _this._interrupt({ type: type });
          });
        }
      },
      _interrupt: {
        value: function _interrupt(_ref) {
          var _this = this;

          var type = _ref.type;

          this.origins[type] = console[type];

          console[type] = function () {
            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
            }

            _this.origins[type].apply(console, args);
            var _wrap = document.createElement("div");
            _wrap.classList.add(className[type]);

            args.forEach((function (log) {
              _wrap.appendChild(_this._convert(log));
            }).bind(_this));

            _this._add(_wrap);
          };
        }
      },
      _convert: {
        value: function _convert(log) {
          var ret;
          switch (typeOf(log)) {
            case "String":
              ret = log;
              break;
            case "Object":
              ret = JSON.stringify(log, null, 2);
              break;
            // Todo: ElementとかFunctionのときの書く
            default:
              ret = log;
          }

          return this._createElement(ret);
        }
      },
      _createElement: {
        value: function _createElement(str) {
          return document.createTextNode("" + str + "\n");
        }
      },
      _add: {
        value: function _add(el) {
          this.target.appendChild(el);
        }
      }
    });

    return ConsoleToDom;
  })();

  module.exports = ConsoleToDom;
});

},{"./util/typeof":11}],4:[function(require,module,exports){
(function (factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports", "module", "eventemitter2", "./ConsoleToDom", "./el/Output", "./Vision"], factory);
  } else if (typeof exports !== "undefined" && typeof module !== "undefined") {
    factory(exports, module, require("eventemitter2"), require("./ConsoleToDom"), require("./el/Output"), require("./Vision"));
  }
})(function (exports, module, _eventemitter2, _ConsoleToDom, _elOutput, _Vision) {
  var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

  var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

  var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

  var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

  var EventEmitter = _eventemitter2.EventEmitter2;

  var ConsoleToDom = _interopRequire(_ConsoleToDom);

  var OutputElement = _interopRequire(_elOutput);

  // import scriptToCodeblock from "./util/scriptToCodeblock";

  var Vision = _interopRequire(_Vision);

  var Evoker = (function (_EventEmitter) {
    function Evoker(_ref) {
      var output = _ref.output;

      _classCallCheck(this, Evoker);

      _get(Object.getPrototypeOf(Evoker.prototype), "constructor", this).call(this);
      this.visions = [];
      this.output = output;
      this.target = output.codearea;
    }

    _inherits(Evoker, _EventEmitter);

    _createClass(Evoker, {
      add: {
        value: function add(_ref) {
          var script = _ref.script;
          var code = _ref.code;
          var html = _ref.html;
          var autorun = _ref.autorun;
          var caption = _ref.caption;
          var description = _ref.description;
          var log = _ref.log;

          var vision = new Vision({ script: script, code: code, html: html, autorun: autorun, caption: caption, description: description, log: log });
          vision.evoke(this.target);
          this.visions.push(vision);

          return this;
        }
      }
    });

    return Evoker;
  })(EventEmitter);

  var output = new OutputElement();

  var evoker = new Evoker({ output: output });

  module.exports = evoker;
});

},{"./ConsoleToDom":3,"./Vision":5,"./el/Output":7,"eventemitter2":2}],5:[function(require,module,exports){
(function (factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports", "module", "eventemitter2", "./util/fnToString", "./util/scriptToCodeblock", "./VisionLog", "./util/elem"], factory);
  } else if (typeof exports !== "undefined" && typeof module !== "undefined") {
    factory(exports, module, require("eventemitter2"), require("./util/fnToString"), require("./util/scriptToCodeblock"), require("./VisionLog"), require("./util/elem"));
  }
})(function (exports, module, _eventemitter2, _utilFnToString, _utilScriptToCodeblock, _VisionLog, _utilElem) {
  var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

  var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

  var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

  var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

  var EventEmitter = _eventemitter2.EventEmitter2;

  var fnToString = _interopRequire(_utilFnToString);

  var scriptToCodeblock = _interopRequire(_utilScriptToCodeblock);

  var VisionLog = _interopRequire(_VisionLog);

  var elem = _interopRequire(_utilElem);

  var addClass = _utilElem.addClass;
  var removeClass = _utilElem.removeClass;
  var attr = _utilElem.attr;

  var Prism = Prism || undefined;

  var className = {
    logarea: "evoker__log",
    main: "evoker__vision",
    btn: "evoker__btn",
    runbtn: "evoker__runBtn",
    caption: "evoker__caption",
    description: "evoker__description",
    tabs: "evoker__tabs",
    tab: "evoker__tab",
    tabactive: "evoker__tab--active",
    info: "evoker__info",
    contents: "evoker__contents",
    content: "evoker__content",
    contentactive: "evoker__content--active",
    html: "evoker__html",
    code: "evoker__script",
    css: "evoker__css",
    separate: "evoker__separate"
  };
  var _attr = "data-evoker-name";

  var Vision = (function (_EventEmitter) {
    function Vision(_ref) {
      var script = _ref.script;
      var code = _ref.code;
      var html = _ref.html;
      var autorun = _ref.autorun;
      var caption = _ref.caption;
      var description = _ref.description;
      var log = _ref.log;

      _classCallCheck(this, Vision);

      _get(Object.getPrototypeOf(Vision.prototype), "constructor", this).call(this);
      this.script = script;
      this.code = code;
      this.html = html;
      this.autorun = autorun;
      this.caption = caption;
      this.description = description;
      this.log = log !== undefined ? log : true;

      this._setup();
      this._transform();
      this._activate();
    }

    _inherits(Vision, _EventEmitter);

    _createClass(Vision, {
      _eventify: {
        value: function _eventify() {
          this.on("run", this.run);
        }
      },
      _enableTabUI: {
        value: function _enableTabUI() {
          var _this = this;

          var $tabs = this.el.tabs.querySelectorAll(".evoker__tab");
          var $contents = this.el.contents.querySelectorAll(".evoker__content");

          [].forEach.call($tabs, function ($tab) {
            $tab.addEventListener("click", (function () {
              _reset();
              var name = attr($tab, _attr);
              var $target = _this.el.contents.querySelector("[" + _attr + "=\"" + name + "\"]");
              addClass($tab, className.tabactive);
              addClass($target, className.contentactive);
            }).bind(_this));
          });
          var _reset = function () {
            [].forEach.call($tabs, function ($tab) {
              removeClass($tab, className.tabactive);
            });
            [].forEach.call($contents, function ($content) {
              removeClass($content, className.contentactive);
            });
          };
        }
      },
      _setup: {
        value: function _setup() {
          this.el = {};
          this.el.main = elem({ className: className.main });
          this.el.info = elem({ className: className.info });
          this.el.contents = elem({ className: className.contents });
          this.el.main.appendChild(this.el.info);
          this.el.main.appendChild(this.el.contents);
        }
      },
      _activate: {
        value: function _activate() {
          addClass(this.el.codeblock, className.contentactive);
          addClass(this.el.tabs.firstChild, className.tabactive);
        }
      },
      _autorun: {
        value: function _autorun() {
          if (this.autorun) {
            this.emit("run");
          }
        }
      },
      _makeSameHeight: {
        value: function _makeSameHeight() {
          var elements = [];
          if (this.el.codeblock) {
            elements.push(this.el.codeblock);
          }
          if (this.el.description) {
            elements.push(this.el.description);
          }
          if (this.el.htmlblock) {
            elements.push(this.el.htmlblock);
          }

          var height = 0;

          elements.forEach(function (el) {
            if (height < el.offsetHeight) {
              height = el.offsetHeight;
            }
          });

          elements.forEach(function (el) {
            el.style.height = "" + height + "px";
            addClass(el, className.content);
          });
        }
      },
      _transform: {
        value: function _transform() {
          this._addCaption();
          this._addDescription();
          this._addCodeblock();
          this._addHtmlblock();
          this._addLogarea();
          this._addTab();
          this._addRunbtn();
        }
      },
      _addCaption: {
        value: function _addCaption() {
          if (!this.caption) {
            return;
          }this.el.caption = elem({ className: className.caption, text: this.caption });
          this._add(this.el.caption, true);
        }
      },
      _addDescription: {
        value: function _addDescription() {
          if (!this.description) {
            return;
          } // this.el.description = elem({className: className.content, text: this.description, attribute: {name: _attr, value:"description"}});
          this.el.description = elem({ text: this.description, attribute: { name: _attr, value: "description" } });
          addClass(this.el.description, className.description);
          this._add(this.el.description);
        }
      },
      _addCodeblock: {
        value: function _addCodeblock() {
          var source = this.code ? this.code : this.script;
          this.el.codeblock = elem({ attribute: { name: _attr, value: "js" } });
          // this.el.codeblock = elem({className: className.content, attribute: {name: _attr, value:"js"}});
          this.el.codeblock.appendChild(scriptToCodeblock(source));
          addClass(this.el.codeblock, className.code);

          this._add(this.el.codeblock);
        }
      },
      _addHtmlblock: {
        value: function _addHtmlblock() {
          if (!this.html) {
            return;
          } // this.el.htmlblock = elem({className: className.content, attribute: {name: _attr, value:"html"}});
          this.el.htmlblock = elem({ attribute: { name: _attr, value: "html" } });
          addClass(this.el.htmlblock, className.html);
          var pre = elem({ type: "pre" });
          var code = elem({ type: "code", className: "language-markup", text: this.html.join("\n") });
          pre.appendChild(code);
          this.el.htmlblock.appendChild(pre);
          this._add(this.el.htmlblock);
        }
      },
      _addLogarea: {
        value: function _addLogarea() {
          if (!this.log) {
            return;
          }var separate = elem({ className: className.separate });
          this.el.logarea = elem({ className: className.logarea });
          this.el.main.appendChild(separate);
          this.el.main.appendChild(elem({ className: "evoker__bar" }));
          this.el.main.appendChild(this.el.logarea);
          this.el.main.appendChild(elem({ className: "evoker__bar" }));
          this.console = new VisionLog({ target: this.el.logarea });
        }
      },
      _addRunbtn: {
        value: function _addRunbtn() {
          var _this = this;

          if (!this.script) {
            return;
          }var runbtn = elem({ type: "button", className: className.runbtn, text: "run" });
          runbtn.addEventListener("click", function () {
            return _this.emit("run");
          });
          this.el.tabs.appendChild(runbtn);
          this.el.runbtn = runbtn;
        }
      },
      _addTab: {
        value: function _addTab() {
          var tabs = elem({ className: className.tabs });
          if (this.script) {
            tabs.appendChild(elem({ className: className.tab, text: "JS", attribute: { name: _attr, value: "js" } }));
          }
          if (this.html) {
            tabs.appendChild(elem({ className: className.tab, text: "HTML", attribute: { name: _attr, value: "html" } }));
          }
          if (this.css) {
            tabs.appendChild(elem({ className: className.tab, text: "CSS", attribute: { name: _attr, value: "css" } }));
          }
          if (this.description) {
            tabs.appendChild(elem({ className: className.tab, text: "Description", attribute: { name: _attr, value: "description" } }));
          }
          this.el.main.insertBefore(tabs, this.el.contents);
          this.el.tabs = tabs;
        }
      },
      _add: {
        value: function _add(el, info) {
          if (info) {
            this.el.info.appendChild(el);
          } else {
            this.el.contents.appendChild(el);
          }
        }
      },
      run: {
        value: function run() {
          if (typeof this.script === "function") {
            if (this.log) {
              this.console.removeLatestClass();
              this.console.enable();
              this.script();
              this._scrollBottom();
              this.console.disable();
            } else {
              this.script();
            }
          }
        }
      },
      _scrollBottom: {
        value: function _scrollBottom() {
          this.el.logarea.scrollTop = this.el.logarea.scrollHeight;
        }
      },
      evoke: {
        value: function evoke(targetElement) {
          targetElement.appendChild(this.el.main);
          this._makeSameHeight();
          this._eventify();
          this._enableTabUI();
          this._autorun();
          if (Prism) {
            [].forEach.call(this.el.main.querySelectorAll("code"), function (code) {
              Prism.highlightElement(code);
            });
          }
        }
      }
    });

    return Vision;
  })(EventEmitter);

  module.exports = Vision;
});

},{"./VisionLog":6,"./util/elem":8,"./util/fnToString":9,"./util/scriptToCodeblock":10,"eventemitter2":2}],6:[function(require,module,exports){
(function (factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports", "module", "./util/typeof", "./util/elem"], factory);
  } else if (typeof exports !== "undefined" && typeof module !== "undefined") {
    factory(exports, module, require("./util/typeof"), require("./util/elem"));
  }
})(function (exports, module, _utilTypeof, _utilElem) {
  var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

  var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

  var typeOf = _interopRequire(_utilTypeof);

  var elem = _interopRequire(_utilElem);

  var addClass = _utilElem.addClass;
  var removeClass = _utilElem.removeClass;

  var className = {
    log: "evoker__color--log",
    warn: "evoker__color--warn",
    error: "evoker__color--error",
    latest: "evoker__color--latest"
  };

  var types = ["log", "warn", "error"];
  var origins = {};

  types.forEach(function (type) {
    origins[type] = console[type];
  });

  var _log = function (type, args, vlog) {
    var wrapElem = vlog._createWrapElem(type);
    args.forEach(function (log) {
      wrapElem.appendChild(vlog._convert(log));
    });

    vlog.target.appendChild(wrapElem);
  };

  var VisionLog = (function () {
    function VisionLog(_ref) {
      var target = _ref.target;

      _classCallCheck(this, VisionLog);

      this.target = target;
    }

    _createClass(VisionLog, {
      log: {
        value: function log() {
          var _origins$type;

          for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          var type = "log";
          (_origins$type = origins[type]).call.apply(_origins$type, [console].concat(args));
          _log(type, args, this);
        }
      },
      warn: {
        value: function warn() {
          var _origins$type;

          for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          var type = "warn";
          (_origins$type = origins[type]).call.apply(_origins$type, [console].concat(args));
          _log(type, args, this);
        }
      },
      error: {
        value: function error() {
          var _origins$type;

          for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          var type = "error";
          (_origins$type = origins[type]).call.apply(_origins$type, [console].concat(args));
          _log(type, args, this);
        }
      },
      enable: {
        value: function enable() {
          var _this = this;

          types.forEach((function (type) {
            console[type] = _this[type].bind(_this);
          }).bind(this));
        }
      },
      disable: {
        value: function disable() {
          types.forEach(function (type) {
            console[type] = origins[type];
          });
        }
      },
      removeLatestClass: {
        value: function removeLatestClass() {
          var $latests = this.target.querySelectorAll("." + className.latest);
          [].forEach.call($latests, function ($latest) {
            removeClass($latest, className.latest);
          });
        }
      },
      _createWrapElem: {
        value: function _createWrapElem(type) {
          var el = elem({ className: className[type] });
          addClass(el, className.latest);
          return el;
        }
      },
      _convert: {
        value: function _convert(log) {
          var ret;
          switch (typeOf(log)) {
            case "String":
              ret = log;
              break;
            case "Object":
              ret = JSON.stringify(log, null, 2);
              break;
            // Todo: ElementとかFunctionのときの書く
            default:
              ret = log;
          }

          return this._createLog(ret);
        }
      },
      _createLog: {
        value: function _createLog(str) {
          return document.createTextNode("" + str + "\n");
        }
      }
    });

    return VisionLog;
  })();

  module.exports = VisionLog;
});

},{"./util/elem":8,"./util/typeof":11}],7:[function(require,module,exports){
(function (factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports", "module", "eventemitter2", "../util/elem"], factory);
  } else if (typeof exports !== "undefined" && typeof module !== "undefined") {
    factory(exports, module, require("eventemitter2"), require("../util/elem"));
  }
})(function (exports, module, _eventemitter2, _utilElem) {
  var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

  var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

  var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

  var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

  var EventEmitter = _eventemitter2.EventEmitter2;

  var elem = _interopRequire(_utilElem);

  var OutputElement = (function (_EventEmitter) {
    function OutputElement() {
      _classCallCheck(this, OutputElement);

      _get(Object.getPrototypeOf(OutputElement.prototype), "constructor", this).call(this);
      this.codearea = elem({ className: "evoker__visions" });
      document.body.appendChild(this.codearea);
    }

    _inherits(OutputElement, _EventEmitter);

    _createClass(OutputElement, {
      showLogarea: {
        value: function showLogarea() {
          this._show(this.codearea);
        }
      },
      hideLogarea: {
        value: function hideLogarea() {
          this._hide(this.codearea);
        }
      },
      _show: {
        value: function _show(el) {
          el.style.display = "block";
        }
      },
      _hide: {
        value: function _hide(el) {
          el.style.display = "none";
        }
      }
    });

    return OutputElement;
  })(EventEmitter);

  module.exports = OutputElement;
});

},{"../util/elem":8,"eventemitter2":2}],8:[function(require,module,exports){
(function (factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports"], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports);
  }
})(function (exports) {
  exports["default"] = elem;
  exports.addClass = addClass;
  exports.removeClass = removeClass;
  exports.attr = attr;
  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  function elem(_ref) {
    var className = _ref.className;
    var type = _ref.type;
    var text = _ref.text;
    var attribute = _ref.attribute;

    var el;
    type = type || "div";
    el = document.createElement(type);

    if (className) {
      addClass(el, className);
    }

    if (text) {
      el.textContent = text;
    }

    if (attribute) {
      attr(el, attribute.name, attribute.value);
    }

    return el;
  }

  function addClass(el, className) {
    el.classList.add(className);
  }

  function removeClass(el, className) {
    el.classList.remove(className);
  }

  function attr(el, attributeName, newValue) {
    if (newValue) {
      el.setAttribute(attributeName, newValue);
    } else {
      return el.getAttribute(attributeName);
    }
  }
});

},{}],9:[function(require,module,exports){
(function (factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports", "module"], factory);
  } else if (typeof exports !== "undefined" && typeof module !== "undefined") {
    factory(exports, module);
  }
})(function (exports, module) {
  module.exports = fnToString;

  function fnToString(fn) {
    var codestring = fn.toString().split("\n");
    codestring.splice(-1, 1);
    codestring.splice(0, 1);
    var firstIndent = codestring[0].match(/^\s*/)[0];
    var reg = new RegExp("^" + firstIndent);
    for (var i = 0, leng = codestring.length; i < leng; i++) {
      codestring[i] = codestring[i].replace(reg, "");
    }
    return codestring.join("\n");
  }
});

},{}],10:[function(require,module,exports){
(function (factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports", "module", "./fnToString", "./elem"], factory);
  } else if (typeof exports !== "undefined" && typeof module !== "undefined") {
    factory(exports, module, require("./fnToString"), require("./elem"));
  }
})(function (exports, module, _fnToString, _elem) {
  var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

  module.exports = scriptToCodeblock;

  var fnToString = _interopRequire(_fnToString);

  var elem = _interopRequire(_elem);

  var className = {
    code: "language-javascript"
  };

  function scriptToCodeblock(script) {
    var pre = elem({ type: "pre" });
    var code = elem({ className: className.code, type: "code", text: fnToString(script) });
    pre.appendChild(code);

    return pre;
  }
});

},{"./elem":8,"./fnToString":9}],11:[function(require,module,exports){
(function (factory) {
  if (typeof define === "function" && define.amd) {
    define(["exports", "module"], factory);
  } else if (typeof exports !== "undefined" && typeof module !== "undefined") {
    factory(exports, module);
  }
})(function (exports, module) {
  module.exports = typeOf;

  function typeOf(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
  }
});

},{}]},{},[1])(1)
});