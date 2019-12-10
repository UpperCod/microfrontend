import { E, h } from './chunks/727393db.js';

const HOOK_MOUNT = Symbol("mount");
const HOOK_MOUNTED = Symbol("mounted");
const HOOK_UPDATE = Symbol("update");
const HOOK_UPDATED = Symbol("updated");
const HOOK_UNMOUNT = Symbol("unmount");
const HOOK_CURRENT = {};
const ELEMENT_PROPS = Symbol("props");
const ELEMENT_IGNORE_ATTR = Symbol("ignore");
const ELEMENT_TRUE_VALUES = [true, 1, "", "1", "true"];
const NODE_TYPE = "localName";
const KEY = Symbol("key");
const META_STYLE_SHEET = Symbol("styleSheet");
const META_MAP_CHILDREN = Symbol("mapChildren");
const META_KEYES = Symbol("keyes");
const NODE_HOST = "host";
const IGNORE_CHILDREN = {
  innerHTML: 1,
  textContent: 1,
  contenteditable: 1
};
const JOIN_CHILDREN = {
  style: 1,
  children: 1
};
const HYDRATE_PROPS = {
  className: 1,
  id: 1,
  checked: 1,
  value: 1,
  selected: 1
};
const CACHE_STYLE_SHEET = {};
const SUPPORT_STYLE_SHEET = "adoptedStyleSheets" in document;
const STYLE_SHEET_KEY = Symbol();

/**
 * Return if value is array
 * @param {*}
 * @return {boolean}
 */
function isArray(value) {
  return Array.isArray(value);
}
/**
 * compare 2 array
 * @param {array} before
 * @param {array} after
 * @example
 * isEqualArray([1,2,3,4],[1,2,3,4]) // true
 * isEqualArray([1,2,3,4],[1,2,3])   // false
 * isEqualArray([5,1,2,3],[1,2,3,5]) // false
 * isEqualArray([],[]) // true
 * @returns {boolean}
 */


function isEqualArray(before, after) {
  let length = before.length;
  if (length !== after.length) return false;

  for (let i = 0; i < length; i++) {
    if (before[i] !== after[i]) return false;
  }

  return true;
}

function isFunction(value) {
  return typeof value == "function";
} // export function fps(callback, count = 3) {
//     count-- ? requestAnimationFrame(() => fps(callback, count)) : callback();
// }


function promise(callback) {
  return new Promise(callback);
}

function update(hook, type) {
  hook[0] && (hook[1] = hook[0](hook[1], type));
}

function updateAll(hooks, type) {
  for (let i in hooks) update(hooks[i], type);
}

function useHook(reducer, initialState) {
  if (HOOK_CURRENT.ref.hook) {
    return HOOK_CURRENT.ref.hook.use(reducer, initialState)[1];
  }
}

function useHost() {
  return useHook(0, {
    current: HOOK_CURRENT.ref.host
  });
}

function createHookCollection(render, host) {
  let hooks = {};
  let mounted;
  let hook = {
    use,
    load,
    updated,
    unmount
  };
  let ref = {
    hook,
    host,
    render
  };

  function load(callback, param) {
    HOOK_CURRENT.index = 0;
    HOOK_CURRENT.ref = ref;
    let resolve = callback(param);
    HOOK_CURRENT.ref = 0;
    return resolve;
  }

  function use(reducer, state) {
    let index = HOOK_CURRENT.index++;
    let mount; // record the hook and the initial state of this

    if (!hooks[index]) {
      hooks[index] = [null, state];
      mount = 1;
    } // The hook always receives the last reduce.


    hooks[index][0] = reducer;
    update(hooks[index], mount ? HOOK_MOUNT : HOOK_UPDATE);
    return hooks[index];
  }

  function updated() {
    let type = mounted ? HOOK_UPDATED : HOOK_MOUNTED;
    mounted = 1;
    updateAll(hooks, type);
  }

  function unmount() {
    updateAll(hooks, HOOK_UNMOUNT);
  }

  return hook;
}

function useEffect(callback, args) {
  // define whether the effect in the render cycle should be regenerated
  let executeEffect;
  useHook((state, type) => {
    if (executeEffect == null) {
      executeEffect = args && state[0] ? !isEqualArray(args, state[0]) : true;
      state[0] = args;
    }

    switch (type) {
      case HOOK_UPDATE:
      case HOOK_UNMOUNT:
        // save the current args, for comparison
        if ((executeEffect || type == HOOK_UNMOUNT) && state[1]) {
          // compare the previous snapshot with the generated state
          state[1](); // clean the effect collector

          state[1] = 0;
        } // delete the previous argument for a hook
        // run if the hook is inserted in a new node
        // Why? ... to perform again dom operations associated with the parent


        if (type == HOOK_UNMOUNT) {
          state[0] = null;
        }

        break;

      case HOOK_MOUNTED:
      case HOOK_UPDATED:
        // save the current args, for comparison, repeats due to additional type HOOK_MOUNTED
        if (executeEffect || type == HOOK_MOUNTED) {
          // save the effect collector
          state[1] = callback();
        } // save the comparison argument


        break;
    }

    return state;
  }, []);
}
/**
 *
 * @param {import("./render").HTMLNode} node
 * @param {Object} props
 * @param {Object} nextProps
 * @param {boolean} isSvg
 * @param {Object} handlers
 **/


function diffProps(node, props, nextProps, isSvg, handlers) {
  props = props || {};

  for (let key in props) {
    if (!(key in nextProps)) {
      setProperty(node, key, props[key], null, isSvg, handlers);
    }
  }

  let ignoreChildren;

  for (let key in nextProps) {
    setProperty(node, key, props[key], nextProps[key], isSvg, handlers);
    ignoreChildren = ignoreChildren || IGNORE_CHILDREN[key];
  }

  return ignoreChildren;
}

function setProperty(node, key, prevValue, nextValue, isSvg, handlers) {
  key = key == "class" && !isSvg ? "className" : key; // define empty value

  prevValue = prevValue == null ? null : prevValue;
  nextValue = nextValue == null ? null : nextValue;

  if (key in node && HYDRATE_PROPS[key]) {
    prevValue = node[key];
  }

  if (nextValue === prevValue) return;

  if (key[0] == "o" && key[1] == "n" && (isFunction(nextValue) || isFunction(prevValue))) {
    setEvent(node, key, nextValue, handlers);
    return;
  }

  switch (key) {
    /**
     * add support {@link https://developer.mozilla.org/es/docs/Web/API/CSSStyleSheet}
     */
    case "styleSheet":
      if (SUPPORT_STYLE_SHEET) node.shadowRoot.adoptedStyleSheets = [].concat(nextValue).map(cssText => {
        if (cssText instanceof CSSStyleSheet) {
          return cssText;
        }

        if (!CACHE_STYLE_SHEET[cssText]) {
          CACHE_STYLE_SHEET[cssText] = new CSSStyleSheet();
          CACHE_STYLE_SHEET[cssText].replace(cssText);
        }

        return CACHE_STYLE_SHEET[cssText];
      });
      break;

    case "ref":
      if (nextValue) nextValue.current = node;
      break;

    case "style":
      setStyle(node, prevValue || "", nextValue || "");
      break;

    case "key":
      node[KEY] = nextValue;
      break;

    default:
      if (!isSvg && key != "list" && key in node) {
        node[key] = nextValue == null ? "" : nextValue;
      } else if (nextValue == null) {
        node.removeAttribute(key);
      } else {
        node.setAttribute(key, typeof nextValue == "object" ? JSON.stringify(nextValue) : nextValue);
      }

  }
}
/**
 *
 * @param {import("./render").HTMLNode} node
 * @param {string} type
 * @param {function} [nextHandler]
 * @param {object} handlers
 */


function setEvent(node, type, nextHandler, handlers) {
  // get the name of the event to use
  type = type.slice(type[2] == "-" ? 3 : 2); // add handleEvent to handlers

  if (!handlers.handleEvent) {
    /**
     * {@link https://developer.mozilla.org/es/docs/Web/API/EventTarget/addEventListener#The_value_of_this_within_the_handler}
     **/
    handlers.handleEvent = event => handlers[event.type].call(node, event);
  }

  if (nextHandler) {
    // create the subscriber if it does not exist
    if (!handlers[type]) {
      node.addEventListener(type, handlers);
    } // update the associated event


    handlers[type] = nextHandler;
  } else {
    // 	delete the associated event
    if (handlers[type]) {
      node.removeEventListener(type, handlers);
      delete handlers[type];
    }
  }
}
/**
 * define style as string inline,this generates less mutation
 * to the sun and cleans the previously defined properties.
 * @param {import("./render").HTMLNode} node
 * @param {(string|object)} prevValue
 * @param {(string|object)} nextValue
 */


function setStyle(node, prevValue, nextValue) {
  let style = node.style,
      prevIsObject;

  if (typeof prevValue == "object") {
    prevIsObject = true;

    for (let key in prevValue) {
      if (!(key in nextValue)) setPropertyStyle(style, key, null);
    }
  }

  if (typeof nextValue == "object") {
    for (let key in nextValue) {
      let value = nextValue[key];
      if (prevIsObject && prevValue[key] === value) continue;
      setPropertyStyle(style, key, value);
    }
  } else {
    style.cssText = nextValue;
  }
}

function setPropertyStyle(style, key, value) {
  let method = "setProperty";

  if (value == null) {
    method = "removeProperty";
    value = null;
  }

  if (~key.indexOf("-")) {
    style[method](key, value);
  } else {
    style[key] = value;
  }
}

let vNodeEmpty = createElement(null, {
  children: ""
});
/**
 * @param {VnodeType} nodeType
 * @param {VnodeProps} [props]
 * @param {Vnode|Vnode[]} [children]
 * @returns {Vnode}
 **/

function createElement(nodeType, props, ...children) {
  let vnode = {
    children,
    ...props,
    nodeType: nodeType || null
  };
  return vnode;
}
/**
 * toVnode, processes the object for correct use within the diff process.
 **/


function toVnode(value) {
  if (isVnodeValue(value)) {
    return value;
  } else {
    if (!value[META_MAP_CHILDREN]) {
      let scan = mapChildren(value.children);
      value.children = scan.children;

      if (scan.keyes) {
        value[META_KEYES] = scan.keyes;
      }

      value[META_MAP_CHILDREN] = true;
    }

    if (value.styleSheet && !SUPPORT_STYLE_SHEET) {
      if (!value[META_STYLE_SHEET]) {
        value.children.unshift(toVnode(createElement("style", value[META_KEYES] ? {
          key: STYLE_SHEET_KEY
        } : {}, value.styleSheet)));

        if (value[META_KEYES]) {
          value[META_KEYES].unshift(STYLE_SHEET_KEY);
        }
      }

      value[META_STYLE_SHEET] = true;
    }
  }

  return value;
}

function mapChildren(children, scan = {
  children: []
}, deep = 0) {
  if (isArray(children)) {
    let length = children.length;

    for (let i = 0; i < length; i++) {
      mapChildren(children[i], scan, deep + 1);
    }
  } else {
    if (children == null && !deep) return scan;
    let vnode = toVnode(children);

    if (vnode != null && typeof vnode == "object") {
      if (isFunction(vnode.nodeType)) {
        let {
          nodeType,
          ...props
        } = vnode;
        return mapChildren(nodeType(props), scan, deep + 1);
      }

      if ("key" in vnode) {
        scan.keyes = scan.keyes || [];

        if (!~scan.keyes.indexOf(vnode.key)) {
          scan.keyes.push(vnode.key);
        }
      }
    }

    scan.children.push(vnode);
  }

  return scan;
}

function isVnodeEmpty(value) {
  let type = typeof value;
  return value == null || type == "boolean" || type == "function";
}

function fillVnodeValue(value) {
  return isVnodeEmpty(value) ? vNodeEmpty : createElement(null, {
    children: "" + value
  });
}

function isVnodeValue(value) {
  let type = typeof value;
  return value == null || type == "string" || type == "number" || type == "function" || type == "boolean";
}
/**
 * @typedef {(Object<string,any>)} VnodeProps;
 *
 * @typedef {(Function|string)} VnodeType;
 *
 * @typedef {{type:VnodeType,props:VnodeProps}} Vnode
 **/

/**
 *
 * @param {import("./render").ConfigRender} config
 * @param {import("./render").HTMLNode} node
 * @param {import("./vnode").Vnode} nextVnode
 * @param {boolean} isSvg
 * @param {Function} currentUpdateComponent
 * @return {import("./render").HTMLNode}
 **/


function diff(id, node, nextVnode, isSvg) {
  let {
    vnode,
    handlers = {}
  } = node && node[id] || {};
  if (vnode == nextVnode && vnode != null) return node;
  nextVnode = isVnodeValue(nextVnode) ? fillVnodeValue(nextVnode) : nextVnode;
  let {
    nodeType,
    shadowDom,
    children,
    is,
    ...props
  } = vnode || {};
  let {
    nodeType: nextNodeType,
    shadowDom: nextShadowDom,
    children: nextChildren,
    is: nextIs,
    ...nextProps
  } = nextVnode;
  isSvg = isSvg || nextNodeType == "svg";

  if (nextNodeType != NODE_HOST && (getNodeName(node) !== nextNodeType || is != nextIs)) {
    let nextNode = createNode(nextNodeType, isSvg, nextIs);
    let parent = node && node.parentNode;

    if (parent) {
      parent.replaceChild(nextNode, node);
    }

    node = nextNode;
    handlers = {};
  }

  if (JOIN_CHILDREN[nextNodeType]) {
    nextNodeType = null;
    nextChildren = nextChildren.join("");
  }

  if (nextNodeType == null) {
    if (node.textContent != nextChildren) {
      node.textContent = nextChildren;
    }
  } else {
    if (shadowDom != nextShadowDom) {
      let {
        shadowRoot
      } = node;
      let mode = nextShadowDom && !shadowRoot ? "open" : !nextShadowDom && shadowRoot ? "closed" : 0;
      if (mode) node.attachShadow({
        mode
      });
    }

    let ignoreChildren = diffProps(node, props, nextProps, isSvg, handlers);

    if (!ignoreChildren && children != nextChildren) {
      diffChildren(id, nextShadowDom ? node.shadowRoot : node, nextChildren, nextProps[META_KEYES], isSvg);
    }
  }

  node[id] = {
    vnode: nextVnode,
    handlers
  };
  return node;
}
/**
 *
 * @param {import("./render").ConfigRender} config
 * @param {import("./render").HTMLNode} parent
 * @param {import("./vnode").Vnode[]} [nextChildren]
 * @param {boolean} isSvg
 */


function diffChildren(id, parent, children, keyes, isSvg) {
  let childrenLenght = children.length;
  let {
    childNodes
  } = parent;
  let childNodesKeyes = {};
  let childNodesLength = childNodes.length;
  let index = keyes ? 0 : childNodesLength > childrenLenght ? childrenLenght : childNodesLength;

  for (; index < childNodesLength; index++) {
    let childNode = childNodes[index];
    let key = index;

    if (keyes) {
      key = childNode[KEY];

      if (keyes.indexOf(key) > -1) {
        childNodesKeyes[key] = childNode;
        continue;
      }
    }

    index--;
    childNodesLength--;
    parent.removeChild(childNode);
  }

  for (let i = 0; i < childrenLenght; i++) {
    let child = children[i];
    let indexChildNode = childNodes[i];
    let key = keyes ? child.key : i;
    let childNode = keyes ? childNodesKeyes[key] : indexChildNode;

    if (keyes && childNode) {
      if (childNode != indexChildNode) {
        parent.insertBefore(childNode, indexChildNode);
      }
    }

    let nextChildNode = diff(id, childNode, child, isSvg);

    if (!childNode) {
      if (childNodes[i]) {
        parent.insertBefore(nextChildNode, childNodes[i]);
      } else {
        parent.appendChild(nextChildNode);
      }
    }
  }
}
/**
 *
 * @param {string} type
 * @param {boolean} isSvg
 * @returns {import("./render").HTMLNode}
 */


function createNode(type, isSvg, is) {
  let doc = document;
  let nextNode;

  if (type != null) {
    nextNode = isSvg ? doc.createElementNS("http://www.w3.org/2000/svg", type) : doc.createElement(type, is ? {
      is
    } : null);
  } else {
    nextNode = doc.createTextNode("");
  }

  return nextNode;
}
/**
 * returns the localName of the node
 * @param {import("./render").HTMLNode} node
 */


function getNodeName(node) {
  if (!node) return;

  if (!node[NODE_TYPE]) {
    node[NODE_TYPE] = node.nodeName.toLowerCase();
  }

  let localName = node[NODE_TYPE];
  return localName == "#text" ? null : localName;
}

function render(vnode, node, id = "vnode") {
  if (vnode != null && typeof vnode == "object" && vnode.nodeType != NODE_HOST) {
    vnode = createElement(NODE_HOST, {
      children: vnode
    });
  }

  vnode = toVnode(vnode);
  diff(id, node, vnode);
  return node;
}

function setAttr(node, attr, value) {
  if (value == null) {
    node.removeAttribute(attr);
  } else {
    node.setAttribute(attr, typeof value == "object" ? JSON.stringify(value) : value);
  }
}

function formatType(value, type = String) {
  try {
    if (type == Boolean) {
      value = ELEMENT_TRUE_VALUES.indexOf(value) > -1;
    } else if (typeof value == "string") {
      value = type == Number ? Number(value) : type == Object || type == Array ? JSON.parse(value) : type == Date ? new Date(value) : value;
    }

    if ({}.toString.call(value) == "[object ".concat(type.name, "]")) {
      return {
        value,
        error: type == Number && Number.isNaN(value)
      };
    }
  } catch (e) {}

  return {
    value,
    error: true
  };
}

function propToAttr(prop) {
  return prop.replace(/([A-Z])/g, "-$1").toLowerCase();
}

function attrToProp(attr) {
  return attr.replace(/-(\w)/g, (all, letter) => letter.toUpperCase());
}

function dispatchEvent(node, type, customEventInit) {
  node.dispatchEvent(new CustomEvent(type, typeof customEventInit == "object" ? customEventInit : null));
}

let defer = Promise.resolve();
let queue = [];
let running;
let maxFps = 1000 / 60;
const IMPORTANT = Symbol("important");

function clearQueue() {
  let time = performance.now();
  let length = queue.length;
  let current = queue;
  queue = [];

  while (length--) {
    let callback = current[length];

    if (callback[IMPORTANT] || performance.now() - time < maxFps) {
      callback();
    } else {
      queue = queue.concat(current.slice(0, length + 1));
      break;
    }
  }

  if (queue.length) {
    requestAnimationFrame(clearQueue);
    return;
  }

  running = false;
}
/**
 * add a task to the queue
 * @param {Function} callback
 * @returns {Promise} Generate a promise that show  if the queue is complete
 */


function addQueue(callback) {
  if (!running) {
    running = true;
    defer.then(clearQueue);
  }

  if (!queue.includes(callback)) queue.push(callback);
}

function load(self, componentRender, componentError) {
  if (self.mount) return;
  let id = Symbol("vnode");
  let isPrevent;
  let isUnmount;
  self[ELEMENT_PROPS] = {};
  let isMounted;
  let resolveUpdate;

  let rerender = () => {
    // disables blocking, allowing the cycle to be regenerate
    isPrevent = false; // After the first render it disables the important condition

    if (rerender[IMPORTANT]) rerender[IMPORTANT] = false;

    try {
      render(hooks.load(componentRender, { ...self[ELEMENT_PROPS]
      }), self, id);
      resolveUpdate();
    } catch (e) {
      (componentError || console.error)(e);
    }
  }; // mark the first render as important, self speeds up the rendering


  rerender[IMPORTANT] = true;

  self.update = () => {
    if (isUnmount) return;
    let rendered = self.rendered;

    if (!isPrevent) {
      isPrevent = true; // create a promise to observe the status of the update

      rendered = promise(resolve => resolveUpdate = resolve).then( // the UPDATED state is only propagated through
      // the resolution of the promise
      // Why? ... to improve communication between web-component parent and children
      hooks.updated); // if the component is already mounted, avoid using self.mounted,
      // to speed up the microtask

      isMounted ? addQueue(rerender) : self.mounted.then(() => {
        isMounted = true;
        addQueue(rerender);
      });
    }

    return self.rendered = rendered;
  }; // any update from hook is added to a separate queue


  let hooks = createHookCollection(() => addQueue(self.update), self); // creates a collection of microtask
  // associated with the mounted of the component

  self.mounted = promise(resolve => self.mount = () => {
    isMounted = false; // allows the reuse of the component when it is isUnmounted and mounted

    if (isUnmount == true) {
      isUnmount = false;
      self.mounted = self.update();
    }

    resolve();
  });
  /**
   * creates a collection of microtask
   * associated with the unmounted of the component
   */

  self.unmounted = promise(resolve => self.unmount = () => {
    isUnmount = true;
    hooks.unmount();
    resolve();
  });
  self.initialize();
  self.update();
}
/**
 * register the component, be it a class or function
 * @param {string} nodeType
 * @param {Function} component
 * @return {Function} returns a jsx component
 */


function customElement(nodeType, component, options) {
  if (isFunction(nodeType)) {
    // By defining nodeType as a function, custom ELement
    // allows the assignment of a constructor to be extended
    let BaseElement = component || HTMLElement;
    component = nodeType;
    let {
      props,
      error
    } = component;
    /**@type {Function[]}*/

    let initialize = [];
    /**@type {string[]} */

    let attrs = [];
    let CustomElement = class extends BaseElement {
      constructor() {
        super();
        /**
         * identifier to store the virtual-dom state,
         * this is unique between instances of the
         * component to securely consider the host status
         */

        load(this, component, error);
      }

      connectedCallback() {
        load(this, component, error);
        this.mount();
      }

      disconnectedCallback() {
        this.unmount();
      }

      attributeChangedCallback(attr, oldValue, value) {
        if (attr === this[ELEMENT_IGNORE_ATTR] || oldValue === value) return;
        this[attrToProp(attr)] = value;
      }

      initialize() {
        let length = initialize.length;

        while (length--) initialize[length](this);
      }

    };
    let prototype = CustomElement.prototype;

    for (let prop in props) setProperty$1(prototype, initialize, attrs, prop, props[prop]);

    CustomElement.observedAttributes = attrs;
    return CustomElement;
  } else {
    let {
      base,
      ...opts
    } = options || {};
    customElements.define(nodeType, customElement(component, base), opts);
    return props => createElement(nodeType, props);
  }
}

function setProperty$1(prototype, initialize, attrs, prop, schema) {
  let attr = propToAttr(prop);
  schema = schema.name ? {
    type: schema
  } : schema; // avoid rewriting the prototype

  if (prop in prototype) return;

  function set(nextValue) {
    let prevValue = this[ELEMENT_PROPS][prop];

    if (isFunction(nextValue)) {
      nextValue = nextValue(prevValue);
    }

    let {
      value,
      error
    } = formatType(nextValue, schema.type);

    if (error && value != null) {
      throw "the observable [".concat(prop, "] must be of the type [").concat(schema.type.name, "]");
    }

    if (prevValue == value) return;
    this[ELEMENT_PROPS][prop] = value;
    let rendered = this.update();

    if (schema.event) {
      // The event is only dispatched if the component has finished
      // the rendering cycle, this is useful to observe the changes
      rendered.then(() => dispatchEvent(this, schema.event.type || prop, schema.event));
    }

    if (schema.reflect) {
      // the default properties are only reflected once the web-component is mounted
      this.mounted.then(() => {
        this[ELEMENT_IGNORE_ATTR] = attr; //update is prevented

        setAttr(this, attr, schema.type == Boolean && !value ? null : value //
        );
        this[ELEMENT_IGNORE_ATTR] = false; // an upcoming update is allowed
      });
    }
  }

  function get() {
    return this[ELEMENT_PROPS][prop];
  }

  Object.defineProperty(prototype, prop, {
    set,
    get
  });

  if ("value" in schema) {
    initialize.push(self => self[prop] = schema.value);
  }

  attrs.push(attr);
}

function Microfront({
  options,
  props
}) {
  let ref = useHost();
  useEffect(() => {
    let {
      contentDocument,
      contentWindow
    } = ref.current;

    if (!ref.load) {
      let script = document.createElement("script");
      /**
       * HACK, the use of code split, improves the micro frontend experience,
       * since it allows to assimilate the execution of the application in a
       * sandbox, this leaves the task of synchronizing with history
       */

      script.textContent = "window.$ =(".concat(options.source, ")().then(md=>md.default)");
      contentDocument.body.appendChild(script); // let { history: sandboxHistory } = contentWindow;
      // let { root } = props;
      // sandboxHistory.pushState = function(state, title, path) {
      //   /**
      //    * @todo find a way to synchronize the status of the iframe route
      //    **/
      //   pushState.call(this, state, title, "/sandbox" + path);
      //   history.pushState(state, title, path);
      //   eventRedirect(contentWindow);
      // };

      ref.load = true;
    }

    contentWindow.$.then(component => {
      options.render(contentDocument.body, component, props);
    });
  }, [props]);
  useEffect(() => {
    let {
      contentDocument
    } = ref.current;
    return () => options.render(contentDocument.body, null, null);
  }, []);
  return createElement("host", {
    sandbox: "allow-same-origin allow-scripts allow-popups allow-forms",
    frameBorder: "0"
  });
}

Microfront.props = {
  options: Object,
  props: Object
};
customElement("atomico-microfront", Microfront, {
  base: HTMLIFrameElement,
  extends: "iframe"
});

/**
 *
 * @param {Function} source - function to insert as string in the sandbox
 * @param {*} options -
 */

function preact(source, options) {
  options = { ...options,
    source,

    /**
     *
     * @param {HTMLBodyElement} node
     * @param {Function} component
     * @param {?Object} props - if null indicates that the component has been unmounted
     */
    render(node, component, props) {
      E(props ? h(component, props) : "", node);
    }

  };
  return props => createElement("iframe", {
    is: "atomico-microfront",
    options: options,
    props: props
  });
}

let Component = preact(() => import('./chunks/aa18fb5d.js'));

function MyApp() {
  return createElement("host", null, "Atomico containers", createElement(Component, null));
}

customElement("my-app", MyApp);
//# sourceMappingURL=index.js.map
