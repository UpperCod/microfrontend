const HOOK_MOUNT = Symbol("mount");
const HOOK_MOUNTED = Symbol("mounted");
const HOOK_UPDATE = Symbol("update");
const HOOK_UPDATED = Symbol("updated");
const HOOK_UNMOUNT = Symbol("unmount");
const HOOK_CURRENT = {};
const ELEMENT_PROPS = Symbol("props");
const ELEMENT_IGNORE_ATTR = Symbol("ignore");
const ELEMENT_TRUE_VALUES = [true, 1, "", "1", "true"];
const ARRAY_EMPTY = [];
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
  style: 1
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

function isRawNode(node) {
  return node instanceof HTMLElement || node instanceof SVGElement;
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

function useRef(current) {
  return useHook(0, {
    current
  });
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
let vNodeFill = createElement(null, {
  children: ARRAY_EMPTY
});
/**
 * @param {VnodeType} nodeType
 * @param {VnodeProps} [props]
 * @param {Vnode|Vnode[]} [children]
 * @returns {Vnode}
 **/

function createElement(nodeType, props, ...children) {
  return {
    children,
    ...props,
    nodeType: nodeType || null
  };
}
/**
 * toVnode, processes the object for correct use within the diff process.
 **/


function toVnode(value) {
  if (isVnodeValue(value)) {
    return value;
  } else {
    // this process occurs only once per vnode
    if (!value[META_MAP_CHILDREN]) {
      let {
        children,
        keyes
      } = mapChildren(value.children);
      value.children = children.length ? children : ARRAY_EMPTY;

      if (keyes) {
        value[META_KEYES] = keyes;
      }

      value[META_MAP_CHILDREN] = true;
    }

    if (value.styleSheet && !SUPPORT_STYLE_SHEET) {
      if (!value[META_STYLE_SHEET]) {
        // When patching styleSheet, define whether to keep ARRAY_EMPTY
        // or create a new array to fill and thus keep the reference intact
        value.children = value.children == ARRAY_EMPTY ? [] : value.children; // add the node to the children list

        value.children.unshift(toVnode(createElement("style", value[META_KEYES] ? {
          key: STYLE_SHEET_KEY
        } : {}, value.styleSheet))); // if it is a list with keys, add the key to keyes

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
  } = vnode || vNodeFill;
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
    if (isRawNode(type)) {
      return type;
    }

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

  if (isRawNode(node)) {
    return node;
  }

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

    if ({}.toString.call(value) == `[object ${type.name}]`) {
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
    return props => opts.extends ? createElement(opts.extends, { ...props,
      is: nodeType
    }) : createElement(nodeType, props);
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
      throw `the observable [${prop}] must be of the type [${schema.type.name}]`;
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
    initialize.push(self => {
      let {
        value
      } = schema;
      self[prop] = isFunction(value) ? value() : value;
    });
  }

  attrs.push(attr);
}

function getRoot(current) {
  return current.shadowRoot || current;
}

function Container({
  options,
  props
}) {
  let ref = useRef();
  let {
    sandbox
  } = props;
  useEffect(() => {
    let {
      current
    } = ref;

    if (sandbox) {
      let {
        contentDocument,
        contentWindow
      } = current;

      if (!ref.load) {
        let script = document.createElement("script");
        let style = document.createElement("style");
        style.textContent = `html,body{margin:0px;width:100%;height:100%;overflow:auto}`;
        /**
         * HACK, the use of code split, improves the micro frontend experience,
         * since it allows to assimilate the execution of the application in a
         * sandbox, this leaves the task of synchronizing with history
         */

        script.textContent = `window.$ =(${options.source})().then(md=>md.default)`;
        contentDocument.head.appendChild(script);
        contentDocument.head.appendChild(style);
        Object.defineProperty(contentWindow, "history", {
          value: history
        });
        ref.load = true;
      }

      contentWindow.$.then(component => {
        options.render(contentDocument.body, component, props);
      });
    } else {
      options.source().then(component => options.render(getRoot(current), component.default, props));
    }
  }, [props]);
  useEffect(() => {
    let {
      current
    } = ref;

    if (sandbox) {
      let {
        contentDocument
      } = current;
      return () => options.render(contentDocument.body, null, null);
    } else {
      return () => options.render(getRoot(current), null, null);
    }
  }, []);
  return sandbox ? createElement("host", null, createElement("iframe", {
    ref: ref,
    width: "100%",
    height: "100%",
    sandbox: "allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation",
    frameborder: "0"
  })) : createElement("host", {
    ref: ref,
    shadowDom: props.shadowDom
  });
}

Container.props = {
  options: Object,
  props: Object
};
var ComponentContainer = customElement("a-microfrontend-container", Container);

function createContainer(source, render) {
  return props => createElement(ComponentContainer, {
    options: {
      source,
      render
    },
    props: props
  });
}

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

/*
object-assign
(c) Sindre Sorhus
@license MIT
*/
/* eslint-disable no-unused-vars */

var getOwnPropertySymbols = Object.getOwnPropertySymbols;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
  if (val === null || val === undefined) {
    throw new TypeError('Object.assign cannot be called with null or undefined');
  }

  return Object(val);
}

function shouldUseNative() {
  try {
    if (!Object.assign) {
      return false;
    } // Detect buggy property enumeration order in older V8 versions.
    // https://bugs.chromium.org/p/v8/issues/detail?id=4118


    var test1 = new String('abc'); // eslint-disable-line no-new-wrappers

    test1[5] = 'de';

    if (Object.getOwnPropertyNames(test1)[0] === '5') {
      return false;
    } // https://bugs.chromium.org/p/v8/issues/detail?id=3056


    var test2 = {};

    for (var i = 0; i < 10; i++) {
      test2['_' + String.fromCharCode(i)] = i;
    }

    var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
      return test2[n];
    });

    if (order2.join('') !== '0123456789') {
      return false;
    } // https://bugs.chromium.org/p/v8/issues/detail?id=3056


    var test3 = {};
    'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
      test3[letter] = letter;
    });

    if (Object.keys(Object.assign({}, test3)).join('') !== 'abcdefghijklmnopqrst') {
      return false;
    }

    return true;
  } catch (err) {
    // We don't expect any of the above to throw, but better to be safe.
    return false;
  }
}

var objectAssign = shouldUseNative() ? Object.assign : function (target, source) {
  var from;
  var to = toObject(target);
  var symbols;

  for (var s = 1; s < arguments.length; s++) {
    from = Object(arguments[s]);

    for (var key in from) {
      if (hasOwnProperty.call(from, key)) {
        to[key] = from[key];
      }
    }

    if (getOwnPropertySymbols) {
      symbols = getOwnPropertySymbols(from);

      for (var i = 0; i < symbols.length; i++) {
        if (propIsEnumerable.call(from, symbols[i])) {
          to[symbols[i]] = from[symbols[i]];
        }
      }
    }
  }

  return to;
};

var n = "function" === typeof Symbol && Symbol.for,
    p = n ? Symbol.for("react.element") : 60103,
    q = n ? Symbol.for("react.portal") : 60106,
    r = n ? Symbol.for("react.fragment") : 60107,
    t = n ? Symbol.for("react.strict_mode") : 60108,
    u = n ? Symbol.for("react.profiler") : 60114,
    v = n ? Symbol.for("react.provider") : 60109,
    w = n ? Symbol.for("react.context") : 60110,
    x = n ? Symbol.for("react.forward_ref") : 60112,
    y = n ? Symbol.for("react.suspense") : 60113;
var z = n ? Symbol.for("react.memo") : 60115,
    aa = n ? Symbol.for("react.lazy") : 60116;
var A = "function" === typeof Symbol && Symbol.iterator;

function B(a) {
  for (var b = "https://reactjs.org/docs/error-decoder.html?invariant=" + a, c = 1; c < arguments.length; c++) b += "&args[]=" + encodeURIComponent(arguments[c]);

  return "Minified React error #" + a + "; visit " + b + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}

var C = {
  isMounted: function () {
    return !1;
  },
  enqueueForceUpdate: function () {},
  enqueueReplaceState: function () {},
  enqueueSetState: function () {}
},
    D = {};

function E(a, b, c) {
  this.props = a;
  this.context = b;
  this.refs = D;
  this.updater = c || C;
}

E.prototype.isReactComponent = {};

E.prototype.setState = function (a, b) {
  if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error(B(85));
  this.updater.enqueueSetState(this, a, b, "setState");
};

E.prototype.forceUpdate = function (a) {
  this.updater.enqueueForceUpdate(this, a, "forceUpdate");
};

function F() {}

F.prototype = E.prototype;

function G(a, b, c) {
  this.props = a;
  this.context = b;
  this.refs = D;
  this.updater = c || C;
}

var H = G.prototype = new F();
H.constructor = G;
objectAssign(H, E.prototype);
H.isPureReactComponent = !0;
var I = {
  current: null
},
    J = {
  current: null
},
    K = Object.prototype.hasOwnProperty,
    L = {
  key: !0,
  ref: !0,
  __self: !0,
  __source: !0
};

function M(a, b, c) {
  var e,
      d = {},
      g = null,
      l = null;
  if (null != b) for (e in void 0 !== b.ref && (l = b.ref), void 0 !== b.key && (g = "" + b.key), b) K.call(b, e) && !L.hasOwnProperty(e) && (d[e] = b[e]);
  var f = arguments.length - 2;
  if (1 === f) d.children = c;else if (1 < f) {
    for (var k = Array(f), m = 0; m < f; m++) k[m] = arguments[m + 2];

    d.children = k;
  }
  if (a && a.defaultProps) for (e in f = a.defaultProps, f) void 0 === d[e] && (d[e] = f[e]);
  return {
    $$typeof: p,
    type: a,
    key: g,
    ref: l,
    props: d,
    _owner: J.current
  };
}

function ba(a, b) {
  return {
    $$typeof: p,
    type: a.type,
    key: b,
    ref: a.ref,
    props: a.props,
    _owner: a._owner
  };
}

function N(a) {
  return "object" === typeof a && null !== a && a.$$typeof === p;
}

function escape(a) {
  var b = {
    "=": "=0",
    ":": "=2"
  };
  return "$" + ("" + a).replace(/[=:]/g, function (a) {
    return b[a];
  });
}

var O = /\/+/g,
    P = [];

function Q(a, b, c, e) {
  if (P.length) {
    var d = P.pop();
    d.result = a;
    d.keyPrefix = b;
    d.func = c;
    d.context = e;
    d.count = 0;
    return d;
  }

  return {
    result: a,
    keyPrefix: b,
    func: c,
    context: e,
    count: 0
  };
}

function R(a) {
  a.result = null;
  a.keyPrefix = null;
  a.func = null;
  a.context = null;
  a.count = 0;
  10 > P.length && P.push(a);
}

function S(a, b, c, e) {
  var d = typeof a;
  if ("undefined" === d || "boolean" === d) a = null;
  var g = !1;
  if (null === a) g = !0;else switch (d) {
    case "string":
    case "number":
      g = !0;
      break;

    case "object":
      switch (a.$$typeof) {
        case p:
        case q:
          g = !0;
      }

  }
  if (g) return c(e, a, "" === b ? "." + T(a, 0) : b), 1;
  g = 0;
  b = "" === b ? "." : b + ":";
  if (Array.isArray(a)) for (var l = 0; l < a.length; l++) {
    d = a[l];
    var f = b + T(d, l);
    g += S(d, f, c, e);
  } else if (null === a || "object" !== typeof a ? f = null : (f = A && a[A] || a["@@iterator"], f = "function" === typeof f ? f : null), "function" === typeof f) for (a = f.call(a), l = 0; !(d = a.next()).done;) d = d.value, f = b + T(d, l++), g += S(d, f, c, e);else if ("object" === d) throw c = "" + a, Error(B(31, "[object Object]" === c ? "object with keys {" + Object.keys(a).join(", ") + "}" : c, ""));
  return g;
}

function U(a, b, c) {
  return null == a ? 0 : S(a, "", b, c);
}

function T(a, b) {
  return "object" === typeof a && null !== a && null != a.key ? escape(a.key) : b.toString(36);
}

function ca(a, b) {
  a.func.call(a.context, b, a.count++);
}

function da(a, b, c) {
  var e = a.result,
      d = a.keyPrefix;
  a = a.func.call(a.context, b, a.count++);
  Array.isArray(a) ? V(a, e, c, function (a) {
    return a;
  }) : null != a && (N(a) && (a = ba(a, d + (!a.key || b && b.key === a.key ? "" : ("" + a.key).replace(O, "$&/") + "/") + c)), e.push(a));
}

function V(a, b, c, e, d) {
  var g = "";
  null != c && (g = ("" + c).replace(O, "$&/") + "/");
  b = Q(b, g, e, d);
  U(a, da, b);
  R(b);
}

function W() {
  var a = I.current;
  if (null === a) throw Error(B(321));
  return a;
}

var X = {
  Children: {
    map: function (a, b, c) {
      if (null == a) return a;
      var e = [];
      V(a, e, null, b, c);
      return e;
    },
    forEach: function (a, b, c) {
      if (null == a) return a;
      b = Q(null, null, b, c);
      U(a, ca, b);
      R(b);
    },
    count: function (a) {
      return U(a, function () {
        return null;
      }, null);
    },
    toArray: function (a) {
      var b = [];
      V(a, b, null, function (a) {
        return a;
      });
      return b;
    },
    only: function (a) {
      if (!N(a)) throw Error(B(143));
      return a;
    }
  },
  createRef: function () {
    return {
      current: null
    };
  },
  Component: E,
  PureComponent: G,
  createContext: function (a, b) {
    void 0 === b && (b = null);
    a = {
      $$typeof: w,
      _calculateChangedBits: b,
      _currentValue: a,
      _currentValue2: a,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    };
    a.Provider = {
      $$typeof: v,
      _context: a
    };
    return a.Consumer = a;
  },
  forwardRef: function (a) {
    return {
      $$typeof: x,
      render: a
    };
  },
  lazy: function (a) {
    return {
      $$typeof: aa,
      _ctor: a,
      _status: -1,
      _result: null
    };
  },
  memo: function (a, b) {
    return {
      $$typeof: z,
      type: a,
      compare: void 0 === b ? null : b
    };
  },
  useCallback: function (a, b) {
    return W().useCallback(a, b);
  },
  useContext: function (a, b) {
    return W().useContext(a, b);
  },
  useEffect: function (a, b) {
    return W().useEffect(a, b);
  },
  useImperativeHandle: function (a, b, c) {
    return W().useImperativeHandle(a, b, c);
  },
  useDebugValue: function () {},
  useLayoutEffect: function (a, b) {
    return W().useLayoutEffect(a, b);
  },
  useMemo: function (a, b) {
    return W().useMemo(a, b);
  },
  useReducer: function (a, b, c) {
    return W().useReducer(a, b, c);
  },
  useRef: function (a) {
    return W().useRef(a);
  },
  useState: function (a) {
    return W().useState(a);
  },
  Fragment: r,
  Profiler: u,
  StrictMode: t,
  Suspense: y,
  createElement: M,
  cloneElement: function (a, b, c) {
    if (null === a || void 0 === a) throw Error(B(267, a));
    var e = objectAssign({}, a.props),
        d = a.key,
        g = a.ref,
        l = a._owner;

    if (null != b) {
      void 0 !== b.ref && (g = b.ref, l = J.current);
      void 0 !== b.key && (d = "" + b.key);
      if (a.type && a.type.defaultProps) var f = a.type.defaultProps;

      for (k in b) K.call(b, k) && !L.hasOwnProperty(k) && (e[k] = void 0 === b[k] && void 0 !== f ? f[k] : b[k]);
    }

    var k = arguments.length - 2;
    if (1 === k) e.children = c;else if (1 < k) {
      f = Array(k);

      for (var m = 0; m < k; m++) f[m] = arguments[m + 2];

      e.children = f;
    }
    return {
      $$typeof: p,
      type: a.type,
      key: d,
      ref: g,
      props: e,
      _owner: l
    };
  },
  createFactory: function (a) {
    var b = M.bind(null, a);
    b.type = a;
    return b;
  },
  isValidElement: N,
  version: "16.12.0",
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {
    ReactCurrentDispatcher: I,
    ReactCurrentBatchConfig: {
      suspense: null
    },
    ReactCurrentOwner: J,
    IsSomeRendererActing: {
      current: !1
    },
    assign: objectAssign
  }
},
    Y = {
  default: X
},
    Z = Y && X || Y;
var react_production_min = Z.default || Z;

var react = createCommonjsModule(function (module) {

{
  module.exports = react_production_min;
}
});

var scheduler_production_min = createCommonjsModule(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: !0
});
var f, g, h, k, l;

if ("undefined" === typeof window || "function" !== typeof MessageChannel) {
  var p = null,
      q = null,
      t = function () {
    if (null !== p) try {
      var a = exports.unstable_now();
      p(!0, a);
      p = null;
    } catch (b) {
      throw setTimeout(t, 0), b;
    }
  },
      u = Date.now();

  exports.unstable_now = function () {
    return Date.now() - u;
  };

  f = function (a) {
    null !== p ? setTimeout(f, 0, a) : (p = a, setTimeout(t, 0));
  };

  g = function (a, b) {
    q = setTimeout(a, b);
  };

  h = function () {
    clearTimeout(q);
  };

  k = function () {
    return !1;
  };

  l = exports.unstable_forceFrameRate = function () {};
} else {
  var w = window.performance,
      x = window.Date,
      y = window.setTimeout,
      z = window.clearTimeout;

  if ("undefined" !== typeof console) {
    var A = window.cancelAnimationFrame;
    "function" !== typeof window.requestAnimationFrame && console.error("This browser doesn't support requestAnimationFrame. Make sure that you load a polyfill in older browsers. https://fb.me/react-polyfills");
    "function" !== typeof A && console.error("This browser doesn't support cancelAnimationFrame. Make sure that you load a polyfill in older browsers. https://fb.me/react-polyfills");
  }

  if ("object" === typeof w && "function" === typeof w.now) exports.unstable_now = function () {
    return w.now();
  };else {
    var B = x.now();

    exports.unstable_now = function () {
      return x.now() - B;
    };
  }
  var C = !1,
      D = null,
      E = -1,
      F = 5,
      G = 0;

  k = function () {
    return exports.unstable_now() >= G;
  };

  l = function () {};

  exports.unstable_forceFrameRate = function (a) {
    0 > a || 125 < a ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing framerates higher than 125 fps is not unsupported") : F = 0 < a ? Math.floor(1E3 / a) : 5;
  };

  var H = new MessageChannel(),
      I = H.port2;

  H.port1.onmessage = function () {
    if (null !== D) {
      var a = exports.unstable_now();
      G = a + F;

      try {
        D(!0, a) ? I.postMessage(null) : (C = !1, D = null);
      } catch (b) {
        throw I.postMessage(null), b;
      }
    } else C = !1;
  };

  f = function (a) {
    D = a;
    C || (C = !0, I.postMessage(null));
  };

  g = function (a, b) {
    E = y(function () {
      a(exports.unstable_now());
    }, b);
  };

  h = function () {
    z(E);
    E = -1;
  };
}

function J(a, b) {
  var c = a.length;
  a.push(b);

  a: for (;;) {
    var d = Math.floor((c - 1) / 2),
        e = a[d];
    if (void 0 !== e && 0 < K(e, b)) a[d] = b, a[c] = e, c = d;else break a;
  }
}

function L(a) {
  a = a[0];
  return void 0 === a ? null : a;
}

function M(a) {
  var b = a[0];

  if (void 0 !== b) {
    var c = a.pop();

    if (c !== b) {
      a[0] = c;

      a: for (var d = 0, e = a.length; d < e;) {
        var m = 2 * (d + 1) - 1,
            n = a[m],
            v = m + 1,
            r = a[v];
        if (void 0 !== n && 0 > K(n, c)) void 0 !== r && 0 > K(r, n) ? (a[d] = r, a[v] = c, d = v) : (a[d] = n, a[m] = c, d = m);else if (void 0 !== r && 0 > K(r, c)) a[d] = r, a[v] = c, d = v;else break a;
      }
    }

    return b;
  }

  return null;
}

function K(a, b) {
  var c = a.sortIndex - b.sortIndex;
  return 0 !== c ? c : a.id - b.id;
}

var N = [],
    O = [],
    P = 1,
    Q = null,
    R = 3,
    S = !1,
    T = !1,
    U = !1;

function V(a) {
  for (var b = L(O); null !== b;) {
    if (null === b.callback) M(O);else if (b.startTime <= a) M(O), b.sortIndex = b.expirationTime, J(N, b);else break;
    b = L(O);
  }
}

function W(a) {
  U = !1;
  V(a);
  if (!T) if (null !== L(N)) T = !0, f(X);else {
    var b = L(O);
    null !== b && g(W, b.startTime - a);
  }
}

function X(a, b) {
  T = !1;
  U && (U = !1, h());
  S = !0;
  var c = R;

  try {
    V(b);

    for (Q = L(N); null !== Q && (!(Q.expirationTime > b) || a && !k());) {
      var d = Q.callback;

      if (null !== d) {
        Q.callback = null;
        R = Q.priorityLevel;
        var e = d(Q.expirationTime <= b);
        b = exports.unstable_now();
        "function" === typeof e ? Q.callback = e : Q === L(N) && M(N);
        V(b);
      } else M(N);

      Q = L(N);
    }

    if (null !== Q) var m = !0;else {
      var n = L(O);
      null !== n && g(W, n.startTime - b);
      m = !1;
    }
    return m;
  } finally {
    Q = null, R = c, S = !1;
  }
}

function Y(a) {
  switch (a) {
    case 1:
      return -1;

    case 2:
      return 250;

    case 5:
      return 1073741823;

    case 4:
      return 1E4;

    default:
      return 5E3;
  }
}

var Z = l;
exports.unstable_ImmediatePriority = 1;
exports.unstable_UserBlockingPriority = 2;
exports.unstable_NormalPriority = 3;
exports.unstable_IdlePriority = 5;
exports.unstable_LowPriority = 4;

exports.unstable_runWithPriority = function (a, b) {
  switch (a) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      break;

    default:
      a = 3;
  }

  var c = R;
  R = a;

  try {
    return b();
  } finally {
    R = c;
  }
};

exports.unstable_next = function (a) {
  switch (R) {
    case 1:
    case 2:
    case 3:
      var b = 3;
      break;

    default:
      b = R;
  }

  var c = R;
  R = b;

  try {
    return a();
  } finally {
    R = c;
  }
};

exports.unstable_scheduleCallback = function (a, b, c) {
  var d = exports.unstable_now();

  if ("object" === typeof c && null !== c) {
    var e = c.delay;
    e = "number" === typeof e && 0 < e ? d + e : d;
    c = "number" === typeof c.timeout ? c.timeout : Y(a);
  } else c = Y(a), e = d;

  c = e + c;
  a = {
    id: P++,
    callback: b,
    priorityLevel: a,
    startTime: e,
    expirationTime: c,
    sortIndex: -1
  };
  e > d ? (a.sortIndex = e, J(O, a), null === L(N) && a === L(O) && (U ? h() : U = !0, g(W, e - d))) : (a.sortIndex = c, J(N, a), T || S || (T = !0, f(X)));
  return a;
};

exports.unstable_cancelCallback = function (a) {
  a.callback = null;
};

exports.unstable_wrapCallback = function (a) {
  var b = R;
  return function () {
    var c = R;
    R = b;

    try {
      return a.apply(this, arguments);
    } finally {
      R = c;
    }
  };
};

exports.unstable_getCurrentPriorityLevel = function () {
  return R;
};

exports.unstable_shouldYield = function () {
  var a = exports.unstable_now();
  V(a);
  var b = L(N);
  return b !== Q && null !== Q && null !== b && null !== b.callback && b.startTime <= a && b.expirationTime < Q.expirationTime || k();
};

exports.unstable_requestPaint = Z;

exports.unstable_continueExecution = function () {
  T || S || (T = !0, f(X));
};

exports.unstable_pauseExecution = function () {};

exports.unstable_getFirstCallbackNode = function () {
  return L(N);
};

exports.unstable_Profiling = null;
});

unwrapExports(scheduler_production_min);
var scheduler_production_min_1 = scheduler_production_min.unstable_now;
var scheduler_production_min_2 = scheduler_production_min.unstable_forceFrameRate;
var scheduler_production_min_3 = scheduler_production_min.unstable_ImmediatePriority;
var scheduler_production_min_4 = scheduler_production_min.unstable_UserBlockingPriority;
var scheduler_production_min_5 = scheduler_production_min.unstable_NormalPriority;
var scheduler_production_min_6 = scheduler_production_min.unstable_IdlePriority;
var scheduler_production_min_7 = scheduler_production_min.unstable_LowPriority;
var scheduler_production_min_8 = scheduler_production_min.unstable_runWithPriority;
var scheduler_production_min_9 = scheduler_production_min.unstable_next;
var scheduler_production_min_10 = scheduler_production_min.unstable_scheduleCallback;
var scheduler_production_min_11 = scheduler_production_min.unstable_cancelCallback;
var scheduler_production_min_12 = scheduler_production_min.unstable_wrapCallback;
var scheduler_production_min_13 = scheduler_production_min.unstable_getCurrentPriorityLevel;
var scheduler_production_min_14 = scheduler_production_min.unstable_shouldYield;
var scheduler_production_min_15 = scheduler_production_min.unstable_requestPaint;
var scheduler_production_min_16 = scheduler_production_min.unstable_continueExecution;
var scheduler_production_min_17 = scheduler_production_min.unstable_pauseExecution;
var scheduler_production_min_18 = scheduler_production_min.unstable_getFirstCallbackNode;
var scheduler_production_min_19 = scheduler_production_min.unstable_Profiling;

var scheduler = createCommonjsModule(function (module) {

{
  module.exports = scheduler_production_min;
}
});

function u$1(a) {
  for (var b = "https://reactjs.org/docs/error-decoder.html?invariant=" + a, c = 1; c < arguments.length; c++) b += "&args[]=" + encodeURIComponent(arguments[c]);

  return "Minified React error #" + a + "; visit " + b + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}

if (!react) throw Error(u$1(227));
var ba$1 = null,
    ca$1 = {};

function da$1() {
  if (ba$1) for (var a in ca$1) {
    var b = ca$1[a],
        c = ba$1.indexOf(a);
    if (!(-1 < c)) throw Error(u$1(96, a));

    if (!ea[c]) {
      if (!b.extractEvents) throw Error(u$1(97, a));
      ea[c] = b;
      c = b.eventTypes;

      for (var d in c) {
        var e = void 0;
        var f = c[d],
            g = b,
            h = d;
        if (fa.hasOwnProperty(h)) throw Error(u$1(99, h));
        fa[h] = f;
        var k = f.phasedRegistrationNames;

        if (k) {
          for (e in k) k.hasOwnProperty(e) && ha(k[e], g, h);

          e = !0;
        } else f.registrationName ? (ha(f.registrationName, g, h), e = !0) : e = !1;

        if (!e) throw Error(u$1(98, d, a));
      }
    }
  }
}

function ha(a, b, c) {
  if (ia[a]) throw Error(u$1(100, a));
  ia[a] = b;
  ja[a] = b.eventTypes[c].dependencies;
}

var ea = [],
    fa = {},
    ia = {},
    ja = {};

function ka(a, b, c, d, e, f, g, h, k) {
  var l = Array.prototype.slice.call(arguments, 3);

  try {
    b.apply(c, l);
  } catch (m) {
    this.onError(m);
  }
}

var la = !1,
    ma = null,
    na = !1,
    oa = null,
    pa = {
  onError: function (a) {
    la = !0;
    ma = a;
  }
};

function qa(a, b, c, d, e, f, g, h, k) {
  la = !1;
  ma = null;
  ka.apply(pa, arguments);
}

function ra(a, b, c, d, e, f, g, h, k) {
  qa.apply(this, arguments);

  if (la) {
    if (la) {
      var l = ma;
      la = !1;
      ma = null;
    } else throw Error(u$1(198));

    na || (na = !0, oa = l);
  }
}

var sa = null,
    ua = null,
    va = null;

function wa(a, b, c) {
  var d = a.type || "unknown-event";
  a.currentTarget = va(c);
  ra(d, b, void 0, a);
  a.currentTarget = null;
}

function xa(a, b) {
  if (null == b) throw Error(u$1(30));
  if (null == a) return b;

  if (Array.isArray(a)) {
    if (Array.isArray(b)) return a.push.apply(a, b), a;
    a.push(b);
    return a;
  }

  return Array.isArray(b) ? [a].concat(b) : [a, b];
}

function ya(a, b, c) {
  Array.isArray(a) ? a.forEach(b, c) : a && b.call(c, a);
}

var za = null;

function Aa(a) {
  if (a) {
    var b = a._dispatchListeners,
        c = a._dispatchInstances;
    if (Array.isArray(b)) for (var d = 0; d < b.length && !a.isPropagationStopped(); d++) wa(a, b[d], c[d]);else b && wa(a, b, c);
    a._dispatchListeners = null;
    a._dispatchInstances = null;
    a.isPersistent() || a.constructor.release(a);
  }
}

function Ba(a) {
  null !== a && (za = xa(za, a));
  a = za;
  za = null;

  if (a) {
    ya(a, Aa);
    if (za) throw Error(u$1(95));
    if (na) throw a = oa, na = !1, oa = null, a;
  }
}

var Ca = {
  injectEventPluginOrder: function (a) {
    if (ba$1) throw Error(u$1(101));
    ba$1 = Array.prototype.slice.call(a);
    da$1();
  },
  injectEventPluginsByName: function (a) {
    var b = !1,
        c;

    for (c in a) if (a.hasOwnProperty(c)) {
      var d = a[c];

      if (!ca$1.hasOwnProperty(c) || ca$1[c] !== d) {
        if (ca$1[c]) throw Error(u$1(102, c));
        ca$1[c] = d;
        b = !0;
      }
    }

    b && da$1();
  }
};

function Da(a, b) {
  var c = a.stateNode;
  if (!c) return null;
  var d = sa(c);
  if (!d) return null;
  c = d[b];

  a: switch (b) {
    case "onClick":
    case "onClickCapture":
    case "onDoubleClick":
    case "onDoubleClickCapture":
    case "onMouseDown":
    case "onMouseDownCapture":
    case "onMouseMove":
    case "onMouseMoveCapture":
    case "onMouseUp":
    case "onMouseUpCapture":
      (d = !d.disabled) || (a = a.type, d = !("button" === a || "input" === a || "select" === a || "textarea" === a));
      a = !d;
      break a;

    default:
      a = !1;
  }

  if (a) return null;
  if (c && "function" !== typeof c) throw Error(u$1(231, b, typeof c));
  return c;
}

var Ea = react.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
Ea.hasOwnProperty("ReactCurrentDispatcher") || (Ea.ReactCurrentDispatcher = {
  current: null
});
Ea.hasOwnProperty("ReactCurrentBatchConfig") || (Ea.ReactCurrentBatchConfig = {
  suspense: null
});
var Fa = /^(.*)[\\\/]/,
    w$1 = "function" === typeof Symbol && Symbol.for,
    Ga = w$1 ? Symbol.for("react.element") : 60103,
    Ha = w$1 ? Symbol.for("react.portal") : 60106,
    Ia = w$1 ? Symbol.for("react.fragment") : 60107,
    Ja = w$1 ? Symbol.for("react.strict_mode") : 60108,
    Ka = w$1 ? Symbol.for("react.profiler") : 60114,
    La = w$1 ? Symbol.for("react.provider") : 60109,
    Ma = w$1 ? Symbol.for("react.context") : 60110,
    Na = w$1 ? Symbol.for("react.concurrent_mode") : 60111,
    Oa = w$1 ? Symbol.for("react.forward_ref") : 60112,
    Pa = w$1 ? Symbol.for("react.suspense") : 60113,
    Qa = w$1 ? Symbol.for("react.suspense_list") : 60120,
    Ra = w$1 ? Symbol.for("react.memo") : 60115,
    Sa = w$1 ? Symbol.for("react.lazy") : 60116;
var Ta = "function" === typeof Symbol && Symbol.iterator;

function Ua(a) {
  if (null === a || "object" !== typeof a) return null;
  a = Ta && a[Ta] || a["@@iterator"];
  return "function" === typeof a ? a : null;
}

function Va(a) {
  if (-1 === a._status) {
    a._status = 0;
    var b = a._ctor;
    b = b();
    a._result = b;
    b.then(function (b) {
      0 === a._status && (b = b.default, a._status = 1, a._result = b);
    }, function (b) {
      0 === a._status && (a._status = 2, a._result = b);
    });
  }
}

function Wa(a) {
  if (null == a) return null;
  if ("function" === typeof a) return a.displayName || a.name || null;
  if ("string" === typeof a) return a;

  switch (a) {
    case Ia:
      return "Fragment";

    case Ha:
      return "Portal";

    case Ka:
      return "Profiler";

    case Ja:
      return "StrictMode";

    case Pa:
      return "Suspense";

    case Qa:
      return "SuspenseList";
  }

  if ("object" === typeof a) switch (a.$$typeof) {
    case Ma:
      return "Context.Consumer";

    case La:
      return "Context.Provider";

    case Oa:
      var b = a.render;
      b = b.displayName || b.name || "";
      return a.displayName || ("" !== b ? "ForwardRef(" + b + ")" : "ForwardRef");

    case Ra:
      return Wa(a.type);

    case Sa:
      if (a = 1 === a._status ? a._result : null) return Wa(a);
  }
  return null;
}

function Xa(a) {
  var b = "";

  do {
    a: switch (a.tag) {
      case 3:
      case 4:
      case 6:
      case 7:
      case 10:
      case 9:
        var c = "";
        break a;

      default:
        var d = a._debugOwner,
            e = a._debugSource,
            f = Wa(a.type);
        c = null;
        d && (c = Wa(d.type));
        d = f;
        f = "";
        e ? f = " (at " + e.fileName.replace(Fa, "") + ":" + e.lineNumber + ")" : c && (f = " (created by " + c + ")");
        c = "\n    in " + (d || "Unknown") + f;
    }

    b += c;
    a = a.return;
  } while (a);

  return b;
}

var Ya = !("undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement),
    Za = null,
    $a = null,
    ab = null;

function bb(a) {
  if (a = ua(a)) {
    if ("function" !== typeof Za) throw Error(u$1(280));
    var b = sa(a.stateNode);
    Za(a.stateNode, a.type, b);
  }
}

function cb(a) {
  $a ? ab ? ab.push(a) : ab = [a] : $a = a;
}

function db() {
  if ($a) {
    var a = $a,
        b = ab;
    ab = $a = null;
    bb(a);
    if (b) for (a = 0; a < b.length; a++) bb(b[a]);
  }
}

function eb(a, b) {
  return a(b);
}

function fb(a, b, c, d) {
  return a(b, c, d);
}

function gb() {}

var hb = eb,
    ib = !1,
    jb = !1;

function kb() {
  if (null !== $a || null !== ab) gb(), db();
}
var lb = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,
    mb = Object.prototype.hasOwnProperty,
    nb = {},
    ob = {};

function pb(a) {
  if (mb.call(ob, a)) return !0;
  if (mb.call(nb, a)) return !1;
  if (lb.test(a)) return ob[a] = !0;
  nb[a] = !0;
  return !1;
}

function qb(a, b, c, d) {
  if (null !== c && 0 === c.type) return !1;

  switch (typeof b) {
    case "function":
    case "symbol":
      return !0;

    case "boolean":
      if (d) return !1;
      if (null !== c) return !c.acceptsBooleans;
      a = a.toLowerCase().slice(0, 5);
      return "data-" !== a && "aria-" !== a;

    default:
      return !1;
  }
}

function rb(a, b, c, d) {
  if (null === b || "undefined" === typeof b || qb(a, b, c, d)) return !0;
  if (d) return !1;
  if (null !== c) switch (c.type) {
    case 3:
      return !b;

    case 4:
      return !1 === b;

    case 5:
      return isNaN(b);

    case 6:
      return isNaN(b) || 1 > b;
  }
  return !1;
}

function B$1(a, b, c, d, e, f) {
  this.acceptsBooleans = 2 === b || 3 === b || 4 === b;
  this.attributeName = d;
  this.attributeNamespace = e;
  this.mustUseProperty = c;
  this.propertyName = a;
  this.type = b;
  this.sanitizeURL = f;
}

var D$1 = {};
"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function (a) {
  D$1[a] = new B$1(a, 0, !1, a, null, !1);
});
[["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function (a) {
  var b = a[0];
  D$1[b] = new B$1(b, 1, !1, a[1], null, !1);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function (a) {
  D$1[a] = new B$1(a, 2, !1, a.toLowerCase(), null, !1);
});
["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function (a) {
  D$1[a] = new B$1(a, 2, !1, a, null, !1);
});
"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function (a) {
  D$1[a] = new B$1(a, 3, !1, a.toLowerCase(), null, !1);
});
["checked", "multiple", "muted", "selected"].forEach(function (a) {
  D$1[a] = new B$1(a, 3, !0, a, null, !1);
});
["capture", "download"].forEach(function (a) {
  D$1[a] = new B$1(a, 4, !1, a, null, !1);
});
["cols", "rows", "size", "span"].forEach(function (a) {
  D$1[a] = new B$1(a, 6, !1, a, null, !1);
});
["rowSpan", "start"].forEach(function (a) {
  D$1[a] = new B$1(a, 5, !1, a.toLowerCase(), null, !1);
});
var sb = /[\-:]([a-z])/g;

function tb(a) {
  return a[1].toUpperCase();
}

"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function (a) {
  var b = a.replace(sb, tb);
  D$1[b] = new B$1(b, 1, !1, a, null, !1);
});
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function (a) {
  var b = a.replace(sb, tb);
  D$1[b] = new B$1(b, 1, !1, a, "http://www.w3.org/1999/xlink", !1);
});
["xml:base", "xml:lang", "xml:space"].forEach(function (a) {
  var b = a.replace(sb, tb);
  D$1[b] = new B$1(b, 1, !1, a, "http://www.w3.org/XML/1998/namespace", !1);
});
["tabIndex", "crossOrigin"].forEach(function (a) {
  D$1[a] = new B$1(a, 1, !1, a.toLowerCase(), null, !1);
});
D$1.xlinkHref = new B$1("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0);
["src", "href", "action", "formAction"].forEach(function (a) {
  D$1[a] = new B$1(a, 1, !1, a.toLowerCase(), null, !0);
});

function ub(a) {
  switch (typeof a) {
    case "boolean":
    case "number":
    case "object":
    case "string":
    case "undefined":
      return a;

    default:
      return "";
  }
}

function vb(a, b, c, d) {
  var e = D$1.hasOwnProperty(b) ? D$1[b] : null;
  var f = null !== e ? 0 === e.type : d ? !1 : !(2 < b.length) || "o" !== b[0] && "O" !== b[0] || "n" !== b[1] && "N" !== b[1] ? !1 : !0;
  f || (rb(b, c, e, d) && (c = null), d || null === e ? pb(b) && (null === c ? a.removeAttribute(b) : a.setAttribute(b, "" + c)) : e.mustUseProperty ? a[e.propertyName] = null === c ? 3 === e.type ? !1 : "" : c : (b = e.attributeName, d = e.attributeNamespace, null === c ? a.removeAttribute(b) : (e = e.type, c = 3 === e || 4 === e && !0 === c ? "" : "" + c, d ? a.setAttributeNS(d, b, c) : a.setAttribute(b, c))));
}

function wb(a) {
  var b = a.type;
  return (a = a.nodeName) && "input" === a.toLowerCase() && ("checkbox" === b || "radio" === b);
}

function xb(a) {
  var b = wb(a) ? "checked" : "value",
      c = Object.getOwnPropertyDescriptor(a.constructor.prototype, b),
      d = "" + a[b];

  if (!a.hasOwnProperty(b) && "undefined" !== typeof c && "function" === typeof c.get && "function" === typeof c.set) {
    var e = c.get,
        f = c.set;
    Object.defineProperty(a, b, {
      configurable: !0,
      get: function () {
        return e.call(this);
      },
      set: function (a) {
        d = "" + a;
        f.call(this, a);
      }
    });
    Object.defineProperty(a, b, {
      enumerable: c.enumerable
    });
    return {
      getValue: function () {
        return d;
      },
      setValue: function (a) {
        d = "" + a;
      },
      stopTracking: function () {
        a._valueTracker = null;
        delete a[b];
      }
    };
  }
}

function yb(a) {
  a._valueTracker || (a._valueTracker = xb(a));
}

function zb(a) {
  if (!a) return !1;
  var b = a._valueTracker;
  if (!b) return !0;
  var c = b.getValue();
  var d = "";
  a && (d = wb(a) ? a.checked ? "true" : "false" : a.value);
  a = d;
  return a !== c ? (b.setValue(a), !0) : !1;
}

function Ab(a, b) {
  var c = b.checked;
  return objectAssign({}, b, {
    defaultChecked: void 0,
    defaultValue: void 0,
    value: void 0,
    checked: null != c ? c : a._wrapperState.initialChecked
  });
}

function Bb(a, b) {
  var c = null == b.defaultValue ? "" : b.defaultValue,
      d = null != b.checked ? b.checked : b.defaultChecked;
  c = ub(null != b.value ? b.value : c);
  a._wrapperState = {
    initialChecked: d,
    initialValue: c,
    controlled: "checkbox" === b.type || "radio" === b.type ? null != b.checked : null != b.value
  };
}

function Cb(a, b) {
  b = b.checked;
  null != b && vb(a, "checked", b, !1);
}

function Eb(a, b) {
  Cb(a, b);
  var c = ub(b.value),
      d = b.type;
  if (null != c) {
    if ("number" === d) {
      if (0 === c && "" === a.value || a.value != c) a.value = "" + c;
    } else a.value !== "" + c && (a.value = "" + c);
  } else if ("submit" === d || "reset" === d) {
    a.removeAttribute("value");
    return;
  }
  b.hasOwnProperty("value") ? Fb(a, b.type, c) : b.hasOwnProperty("defaultValue") && Fb(a, b.type, ub(b.defaultValue));
  null == b.checked && null != b.defaultChecked && (a.defaultChecked = !!b.defaultChecked);
}

function Gb(a, b, c) {
  if (b.hasOwnProperty("value") || b.hasOwnProperty("defaultValue")) {
    var d = b.type;
    if (!("submit" !== d && "reset" !== d || void 0 !== b.value && null !== b.value)) return;
    b = "" + a._wrapperState.initialValue;
    c || b === a.value || (a.value = b);
    a.defaultValue = b;
  }

  c = a.name;
  "" !== c && (a.name = "");
  a.defaultChecked = !a.defaultChecked;
  a.defaultChecked = !!a._wrapperState.initialChecked;
  "" !== c && (a.name = c);
}

function Fb(a, b, c) {
  if ("number" !== b || a.ownerDocument.activeElement !== a) null == c ? a.defaultValue = "" + a._wrapperState.initialValue : a.defaultValue !== "" + c && (a.defaultValue = "" + c);
}

function Hb(a) {
  var b = "";
  react.Children.forEach(a, function (a) {
    null != a && (b += a);
  });
  return b;
}

function Ib(a, b) {
  a = objectAssign({
    children: void 0
  }, b);
  if (b = Hb(b.children)) a.children = b;
  return a;
}

function Jb(a, b, c, d) {
  a = a.options;

  if (b) {
    b = {};

    for (var e = 0; e < c.length; e++) b["$" + c[e]] = !0;

    for (c = 0; c < a.length; c++) e = b.hasOwnProperty("$" + a[c].value), a[c].selected !== e && (a[c].selected = e), e && d && (a[c].defaultSelected = !0);
  } else {
    c = "" + ub(c);
    b = null;

    for (e = 0; e < a.length; e++) {
      if (a[e].value === c) {
        a[e].selected = !0;
        d && (a[e].defaultSelected = !0);
        return;
      }

      null !== b || a[e].disabled || (b = a[e]);
    }

    null !== b && (b.selected = !0);
  }
}

function Kb(a, b) {
  if (null != b.dangerouslySetInnerHTML) throw Error(u$1(91));
  return objectAssign({}, b, {
    value: void 0,
    defaultValue: void 0,
    children: "" + a._wrapperState.initialValue
  });
}

function Lb(a, b) {
  var c = b.value;

  if (null == c) {
    c = b.defaultValue;
    b = b.children;

    if (null != b) {
      if (null != c) throw Error(u$1(92));

      if (Array.isArray(b)) {
        if (!(1 >= b.length)) throw Error(u$1(93));
        b = b[0];
      }

      c = b;
    }

    null == c && (c = "");
  }

  a._wrapperState = {
    initialValue: ub(c)
  };
}

function Mb(a, b) {
  var c = ub(b.value),
      d = ub(b.defaultValue);
  null != c && (c = "" + c, c !== a.value && (a.value = c), null == b.defaultValue && a.defaultValue !== c && (a.defaultValue = c));
  null != d && (a.defaultValue = "" + d);
}

function Nb(a) {
  var b = a.textContent;
  b === a._wrapperState.initialValue && "" !== b && null !== b && (a.value = b);
}

var Ob = {
  html: "http://www.w3.org/1999/xhtml",
  mathml: "http://www.w3.org/1998/Math/MathML",
  svg: "http://www.w3.org/2000/svg"
};

function Pb(a) {
  switch (a) {
    case "svg":
      return "http://www.w3.org/2000/svg";

    case "math":
      return "http://www.w3.org/1998/Math/MathML";

    default:
      return "http://www.w3.org/1999/xhtml";
  }
}

function Qb(a, b) {
  return null == a || "http://www.w3.org/1999/xhtml" === a ? Pb(b) : "http://www.w3.org/2000/svg" === a && "foreignObject" === b ? "http://www.w3.org/1999/xhtml" : a;
}

var Rb,
    Sb = function (a) {
  return "undefined" !== typeof MSApp && MSApp.execUnsafeLocalFunction ? function (b, c, d, e) {
    MSApp.execUnsafeLocalFunction(function () {
      return a(b, c, d, e);
    });
  } : a;
}(function (a, b) {
  if (a.namespaceURI !== Ob.svg || "innerHTML" in a) a.innerHTML = b;else {
    Rb = Rb || document.createElement("div");
    Rb.innerHTML = "<svg>" + b.valueOf().toString() + "</svg>";

    for (b = Rb.firstChild; a.firstChild;) a.removeChild(a.firstChild);

    for (; b.firstChild;) a.appendChild(b.firstChild);
  }
});

function Tb(a, b) {
  if (b) {
    var c = a.firstChild;

    if (c && c === a.lastChild && 3 === c.nodeType) {
      c.nodeValue = b;
      return;
    }
  }

  a.textContent = b;
}

function Ub(a, b) {
  var c = {};
  c[a.toLowerCase()] = b.toLowerCase();
  c["Webkit" + a] = "webkit" + b;
  c["Moz" + a] = "moz" + b;
  return c;
}

var Vb = {
  animationend: Ub("Animation", "AnimationEnd"),
  animationiteration: Ub("Animation", "AnimationIteration"),
  animationstart: Ub("Animation", "AnimationStart"),
  transitionend: Ub("Transition", "TransitionEnd")
},
    Wb = {},
    Xb = {};
Ya && (Xb = document.createElement("div").style, "AnimationEvent" in window || (delete Vb.animationend.animation, delete Vb.animationiteration.animation, delete Vb.animationstart.animation), "TransitionEvent" in window || delete Vb.transitionend.transition);

function Yb(a) {
  if (Wb[a]) return Wb[a];
  if (!Vb[a]) return a;
  var b = Vb[a],
      c;

  for (c in b) if (b.hasOwnProperty(c) && c in Xb) return Wb[a] = b[c];

  return a;
}

var Zb = Yb("animationend"),
    $b = Yb("animationiteration"),
    ac = Yb("animationstart"),
    bc = Yb("transitionend"),
    cc = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange seeked seeking stalled suspend timeupdate volumechange waiting".split(" ");

function ec(a) {
  var b = a,
      c = a;
  if (a.alternate) for (; b.return;) b = b.return;else {
    a = b;

    do b = a, 0 !== (b.effectTag & 1026) && (c = b.return), a = b.return; while (a);
  }
  return 3 === b.tag ? c : null;
}

function fc(a) {
  if (13 === a.tag) {
    var b = a.memoizedState;
    null === b && (a = a.alternate, null !== a && (b = a.memoizedState));
    if (null !== b) return b.dehydrated;
  }

  return null;
}

function gc(a) {
  if (ec(a) !== a) throw Error(u$1(188));
}

function hc(a) {
  var b = a.alternate;

  if (!b) {
    b = ec(a);
    if (null === b) throw Error(u$1(188));
    return b !== a ? null : a;
  }

  for (var c = a, d = b;;) {
    var e = c.return;
    if (null === e) break;
    var f = e.alternate;

    if (null === f) {
      d = e.return;

      if (null !== d) {
        c = d;
        continue;
      }

      break;
    }

    if (e.child === f.child) {
      for (f = e.child; f;) {
        if (f === c) return gc(e), a;
        if (f === d) return gc(e), b;
        f = f.sibling;
      }

      throw Error(u$1(188));
    }

    if (c.return !== d.return) c = e, d = f;else {
      for (var g = !1, h = e.child; h;) {
        if (h === c) {
          g = !0;
          c = e;
          d = f;
          break;
        }

        if (h === d) {
          g = !0;
          d = e;
          c = f;
          break;
        }

        h = h.sibling;
      }

      if (!g) {
        for (h = f.child; h;) {
          if (h === c) {
            g = !0;
            c = f;
            d = e;
            break;
          }

          if (h === d) {
            g = !0;
            d = f;
            c = e;
            break;
          }

          h = h.sibling;
        }

        if (!g) throw Error(u$1(189));
      }
    }
    if (c.alternate !== d) throw Error(u$1(190));
  }

  if (3 !== c.tag) throw Error(u$1(188));
  return c.stateNode.current === c ? a : b;
}

function ic(a) {
  a = hc(a);
  if (!a) return null;

  for (var b = a;;) {
    if (5 === b.tag || 6 === b.tag) return b;
    if (b.child) b.child.return = b, b = b.child;else {
      if (b === a) break;

      for (; !b.sibling;) {
        if (!b.return || b.return === a) return null;
        b = b.return;
      }

      b.sibling.return = b.return;
      b = b.sibling;
    }
  }

  return null;
}

var jc,
    kc,
    lc,
    mc = !1,
    nc = [],
    oc = null,
    pc = null,
    qc = null,
    rc = new Map(),
    sc = new Map(),
    tc = [],
    uc = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput close cancel copy cut paste click change contextmenu reset submit".split(" "),
    vc = "focus blur dragenter dragleave mouseover mouseout pointerover pointerout gotpointercapture lostpointercapture".split(" ");

function wc(a) {
  var b = xc(a);
  uc.forEach(function (c) {
    yc(c, a, b);
  });
  vc.forEach(function (c) {
    yc(c, a, b);
  });
}

function zc(a, b, c, d) {
  return {
    blockedOn: a,
    topLevelType: b,
    eventSystemFlags: c | 32,
    nativeEvent: d
  };
}

function Ac(a, b) {
  switch (a) {
    case "focus":
    case "blur":
      oc = null;
      break;

    case "dragenter":
    case "dragleave":
      pc = null;
      break;

    case "mouseover":
    case "mouseout":
      qc = null;
      break;

    case "pointerover":
    case "pointerout":
      rc.delete(b.pointerId);
      break;

    case "gotpointercapture":
    case "lostpointercapture":
      sc.delete(b.pointerId);
  }
}

function Bc(a, b, c, d, e) {
  if (null === a || a.nativeEvent !== e) return a = zc(b, c, d, e), null !== b && (b = Cc(b), null !== b && kc(b)), a;
  a.eventSystemFlags |= d;
  return a;
}

function Dc(a, b, c, d) {
  switch (b) {
    case "focus":
      return oc = Bc(oc, a, b, c, d), !0;

    case "dragenter":
      return pc = Bc(pc, a, b, c, d), !0;

    case "mouseover":
      return qc = Bc(qc, a, b, c, d), !0;

    case "pointerover":
      var e = d.pointerId;
      rc.set(e, Bc(rc.get(e) || null, a, b, c, d));
      return !0;

    case "gotpointercapture":
      return e = d.pointerId, sc.set(e, Bc(sc.get(e) || null, a, b, c, d)), !0;
  }

  return !1;
}

function Ec(a) {
  var b = Fc(a.target);

  if (null !== b) {
    var c = ec(b);
    if (null !== c) if (b = c.tag, 13 === b) {
      if (b = fc(c), null !== b) {
        a.blockedOn = b;
        scheduler.unstable_runWithPriority(a.priority, function () {
          lc(c);
        });
        return;
      }
    } else if (3 === b && c.stateNode.hydrate) {
      a.blockedOn = 3 === c.tag ? c.stateNode.containerInfo : null;
      return;
    }
  }

  a.blockedOn = null;
}

function Gc(a) {
  if (null !== a.blockedOn) return !1;
  var b = Hc(a.topLevelType, a.eventSystemFlags, a.nativeEvent);

  if (null !== b) {
    var c = Cc(b);
    null !== c && kc(c);
    a.blockedOn = b;
    return !1;
  }

  return !0;
}

function Ic(a, b, c) {
  Gc(a) && c.delete(b);
}

function Jc() {
  for (mc = !1; 0 < nc.length;) {
    var a = nc[0];

    if (null !== a.blockedOn) {
      a = Cc(a.blockedOn);
      null !== a && jc(a);
      break;
    }

    var b = Hc(a.topLevelType, a.eventSystemFlags, a.nativeEvent);
    null !== b ? a.blockedOn = b : nc.shift();
  }

  null !== oc && Gc(oc) && (oc = null);
  null !== pc && Gc(pc) && (pc = null);
  null !== qc && Gc(qc) && (qc = null);
  rc.forEach(Ic);
  sc.forEach(Ic);
}

function Kc(a, b) {
  a.blockedOn === b && (a.blockedOn = null, mc || (mc = !0, scheduler.unstable_scheduleCallback(scheduler.unstable_NormalPriority, Jc)));
}

function Lc(a) {
  function b(b) {
    return Kc(b, a);
  }

  if (0 < nc.length) {
    Kc(nc[0], a);

    for (var c = 1; c < nc.length; c++) {
      var d = nc[c];
      d.blockedOn === a && (d.blockedOn = null);
    }
  }

  null !== oc && Kc(oc, a);
  null !== pc && Kc(pc, a);
  null !== qc && Kc(qc, a);
  rc.forEach(b);
  sc.forEach(b);

  for (c = 0; c < tc.length; c++) d = tc[c], d.blockedOn === a && (d.blockedOn = null);

  for (; 0 < tc.length && (c = tc[0], null === c.blockedOn);) Ec(c), null === c.blockedOn && tc.shift();
}

function Mc(a) {
  a = a.target || a.srcElement || window;
  a.correspondingUseElement && (a = a.correspondingUseElement);
  return 3 === a.nodeType ? a.parentNode : a;
}

function Nc(a) {
  do a = a.return; while (a && 5 !== a.tag);

  return a ? a : null;
}

function Oc(a, b, c) {
  if (b = Da(a, c.dispatchConfig.phasedRegistrationNames[b])) c._dispatchListeners = xa(c._dispatchListeners, b), c._dispatchInstances = xa(c._dispatchInstances, a);
}

function Pc(a) {
  if (a && a.dispatchConfig.phasedRegistrationNames) {
    for (var b = a._targetInst, c = []; b;) c.push(b), b = Nc(b);

    for (b = c.length; 0 < b--;) Oc(c[b], "captured", a);

    for (b = 0; b < c.length; b++) Oc(c[b], "bubbled", a);
  }
}

function Qc(a, b, c) {
  a && c && c.dispatchConfig.registrationName && (b = Da(a, c.dispatchConfig.registrationName)) && (c._dispatchListeners = xa(c._dispatchListeners, b), c._dispatchInstances = xa(c._dispatchInstances, a));
}

function Rc(a) {
  a && a.dispatchConfig.registrationName && Qc(a._targetInst, null, a);
}

function Sc(a) {
  ya(a, Pc);
}

function Tc() {
  return !0;
}

function Uc() {
  return !1;
}

function E$1(a, b, c, d) {
  this.dispatchConfig = a;
  this._targetInst = b;
  this.nativeEvent = c;
  a = this.constructor.Interface;

  for (var e in a) a.hasOwnProperty(e) && ((b = a[e]) ? this[e] = b(c) : "target" === e ? this.target = d : this[e] = c[e]);

  this.isDefaultPrevented = (null != c.defaultPrevented ? c.defaultPrevented : !1 === c.returnValue) ? Tc : Uc;
  this.isPropagationStopped = Uc;
  return this;
}

objectAssign(E$1.prototype, {
  preventDefault: function () {
    this.defaultPrevented = !0;
    var a = this.nativeEvent;
    a && (a.preventDefault ? a.preventDefault() : "unknown" !== typeof a.returnValue && (a.returnValue = !1), this.isDefaultPrevented = Tc);
  },
  stopPropagation: function () {
    var a = this.nativeEvent;
    a && (a.stopPropagation ? a.stopPropagation() : "unknown" !== typeof a.cancelBubble && (a.cancelBubble = !0), this.isPropagationStopped = Tc);
  },
  persist: function () {
    this.isPersistent = Tc;
  },
  isPersistent: Uc,
  destructor: function () {
    var a = this.constructor.Interface,
        b;

    for (b in a) this[b] = null;

    this.nativeEvent = this._targetInst = this.dispatchConfig = null;
    this.isPropagationStopped = this.isDefaultPrevented = Uc;
    this._dispatchInstances = this._dispatchListeners = null;
  }
});
E$1.Interface = {
  type: null,
  target: null,
  currentTarget: function () {
    return null;
  },
  eventPhase: null,
  bubbles: null,
  cancelable: null,
  timeStamp: function (a) {
    return a.timeStamp || Date.now();
  },
  defaultPrevented: null,
  isTrusted: null
};

E$1.extend = function (a) {
  function b() {}

  function c() {
    return d.apply(this, arguments);
  }

  var d = this;
  b.prototype = d.prototype;
  var e = new b();
  objectAssign(e, c.prototype);
  c.prototype = e;
  c.prototype.constructor = c;
  c.Interface = objectAssign({}, d.Interface, a);
  c.extend = d.extend;
  Vc(c);
  return c;
};

Vc(E$1);

function Wc(a, b, c, d) {
  if (this.eventPool.length) {
    var e = this.eventPool.pop();
    this.call(e, a, b, c, d);
    return e;
  }

  return new this(a, b, c, d);
}

function Xc(a) {
  if (!(a instanceof this)) throw Error(u$1(279));
  a.destructor();
  10 > this.eventPool.length && this.eventPool.push(a);
}

function Vc(a) {
  a.eventPool = [];
  a.getPooled = Wc;
  a.release = Xc;
}

var Yc = E$1.extend({
  animationName: null,
  elapsedTime: null,
  pseudoElement: null
}),
    Zc = E$1.extend({
  clipboardData: function (a) {
    return "clipboardData" in a ? a.clipboardData : window.clipboardData;
  }
}),
    $c = E$1.extend({
  view: null,
  detail: null
}),
    ad = $c.extend({
  relatedTarget: null
});

function bd(a) {
  var b = a.keyCode;
  "charCode" in a ? (a = a.charCode, 0 === a && 13 === b && (a = 13)) : a = b;
  10 === a && (a = 13);
  return 32 <= a || 13 === a ? a : 0;
}

var cd = {
  Esc: "Escape",
  Spacebar: " ",
  Left: "ArrowLeft",
  Up: "ArrowUp",
  Right: "ArrowRight",
  Down: "ArrowDown",
  Del: "Delete",
  Win: "OS",
  Menu: "ContextMenu",
  Apps: "ContextMenu",
  Scroll: "ScrollLock",
  MozPrintableKey: "Unidentified"
},
    dd = {
  8: "Backspace",
  9: "Tab",
  12: "Clear",
  13: "Enter",
  16: "Shift",
  17: "Control",
  18: "Alt",
  19: "Pause",
  20: "CapsLock",
  27: "Escape",
  32: " ",
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  45: "Insert",
  46: "Delete",
  112: "F1",
  113: "F2",
  114: "F3",
  115: "F4",
  116: "F5",
  117: "F6",
  118: "F7",
  119: "F8",
  120: "F9",
  121: "F10",
  122: "F11",
  123: "F12",
  144: "NumLock",
  145: "ScrollLock",
  224: "Meta"
},
    ed = {
  Alt: "altKey",
  Control: "ctrlKey",
  Meta: "metaKey",
  Shift: "shiftKey"
};

function gd(a) {
  var b = this.nativeEvent;
  return b.getModifierState ? b.getModifierState(a) : (a = ed[a]) ? !!b[a] : !1;
}

function hd() {
  return gd;
}

var id = $c.extend({
  key: function (a) {
    if (a.key) {
      var b = cd[a.key] || a.key;
      if ("Unidentified" !== b) return b;
    }

    return "keypress" === a.type ? (a = bd(a), 13 === a ? "Enter" : String.fromCharCode(a)) : "keydown" === a.type || "keyup" === a.type ? dd[a.keyCode] || "Unidentified" : "";
  },
  location: null,
  ctrlKey: null,
  shiftKey: null,
  altKey: null,
  metaKey: null,
  repeat: null,
  locale: null,
  getModifierState: hd,
  charCode: function (a) {
    return "keypress" === a.type ? bd(a) : 0;
  },
  keyCode: function (a) {
    return "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
  },
  which: function (a) {
    return "keypress" === a.type ? bd(a) : "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
  }
}),
    jd = 0,
    kd = 0,
    ld = !1,
    md = !1,
    nd = $c.extend({
  screenX: null,
  screenY: null,
  clientX: null,
  clientY: null,
  pageX: null,
  pageY: null,
  ctrlKey: null,
  shiftKey: null,
  altKey: null,
  metaKey: null,
  getModifierState: hd,
  button: null,
  buttons: null,
  relatedTarget: function (a) {
    return a.relatedTarget || (a.fromElement === a.srcElement ? a.toElement : a.fromElement);
  },
  movementX: function (a) {
    if ("movementX" in a) return a.movementX;
    var b = jd;
    jd = a.screenX;
    return ld ? "mousemove" === a.type ? a.screenX - b : 0 : (ld = !0, 0);
  },
  movementY: function (a) {
    if ("movementY" in a) return a.movementY;
    var b = kd;
    kd = a.screenY;
    return md ? "mousemove" === a.type ? a.screenY - b : 0 : (md = !0, 0);
  }
}),
    od = nd.extend({
  pointerId: null,
  width: null,
  height: null,
  pressure: null,
  tangentialPressure: null,
  tiltX: null,
  tiltY: null,
  twist: null,
  pointerType: null,
  isPrimary: null
}),
    pd = nd.extend({
  dataTransfer: null
}),
    qd = $c.extend({
  touches: null,
  targetTouches: null,
  changedTouches: null,
  altKey: null,
  metaKey: null,
  ctrlKey: null,
  shiftKey: null,
  getModifierState: hd
}),
    rd = E$1.extend({
  propertyName: null,
  elapsedTime: null,
  pseudoElement: null
}),
    sd = nd.extend({
  deltaX: function (a) {
    return "deltaX" in a ? a.deltaX : "wheelDeltaX" in a ? -a.wheelDeltaX : 0;
  },
  deltaY: function (a) {
    return "deltaY" in a ? a.deltaY : "wheelDeltaY" in a ? -a.wheelDeltaY : "wheelDelta" in a ? -a.wheelDelta : 0;
  },
  deltaZ: null,
  deltaMode: null
}),
    td = [["blur", "blur", 0], ["cancel", "cancel", 0], ["click", "click", 0], ["close", "close", 0], ["contextmenu", "contextMenu", 0], ["copy", "copy", 0], ["cut", "cut", 0], ["auxclick", "auxClick", 0], ["dblclick", "doubleClick", 0], ["dragend", "dragEnd", 0], ["dragstart", "dragStart", 0], ["drop", "drop", 0], ["focus", "focus", 0], ["input", "input", 0], ["invalid", "invalid", 0], ["keydown", "keyDown", 0], ["keypress", "keyPress", 0], ["keyup", "keyUp", 0], ["mousedown", "mouseDown", 0], ["mouseup", "mouseUp", 0], ["paste", "paste", 0], ["pause", "pause", 0], ["play", "play", 0], ["pointercancel", "pointerCancel", 0], ["pointerdown", "pointerDown", 0], ["pointerup", "pointerUp", 0], ["ratechange", "rateChange", 0], ["reset", "reset", 0], ["seeked", "seeked", 0], ["submit", "submit", 0], ["touchcancel", "touchCancel", 0], ["touchend", "touchEnd", 0], ["touchstart", "touchStart", 0], ["volumechange", "volumeChange", 0], ["drag", "drag", 1], ["dragenter", "dragEnter", 1], ["dragexit", "dragExit", 1], ["dragleave", "dragLeave", 1], ["dragover", "dragOver", 1], ["mousemove", "mouseMove", 1], ["mouseout", "mouseOut", 1], ["mouseover", "mouseOver", 1], ["pointermove", "pointerMove", 1], ["pointerout", "pointerOut", 1], ["pointerover", "pointerOver", 1], ["scroll", "scroll", 1], ["toggle", "toggle", 1], ["touchmove", "touchMove", 1], ["wheel", "wheel", 1], ["abort", "abort", 2], [Zb, "animationEnd", 2], [$b, "animationIteration", 2], [ac, "animationStart", 2], ["canplay", "canPlay", 2], ["canplaythrough", "canPlayThrough", 2], ["durationchange", "durationChange", 2], ["emptied", "emptied", 2], ["encrypted", "encrypted", 2], ["ended", "ended", 2], ["error", "error", 2], ["gotpointercapture", "gotPointerCapture", 2], ["load", "load", 2], ["loadeddata", "loadedData", 2], ["loadedmetadata", "loadedMetadata", 2], ["loadstart", "loadStart", 2], ["lostpointercapture", "lostPointerCapture", 2], ["playing", "playing", 2], ["progress", "progress", 2], ["seeking", "seeking", 2], ["stalled", "stalled", 2], ["suspend", "suspend", 2], ["timeupdate", "timeUpdate", 2], [bc, "transitionEnd", 2], ["waiting", "waiting", 2]],
    ud = {},
    vd = {},
    wd = 0;

for (; wd < td.length; wd++) {
  var yd = td[wd],
      zd = yd[0],
      Ad = yd[1],
      Bd = yd[2],
      Cd = "on" + (Ad[0].toUpperCase() + Ad.slice(1)),
      Dd = {
    phasedRegistrationNames: {
      bubbled: Cd,
      captured: Cd + "Capture"
    },
    dependencies: [zd],
    eventPriority: Bd
  };
  ud[Ad] = Dd;
  vd[zd] = Dd;
}

var Ed = {
  eventTypes: ud,
  getEventPriority: function (a) {
    a = vd[a];
    return void 0 !== a ? a.eventPriority : 2;
  },
  extractEvents: function (a, b, c, d) {
    var e = vd[a];
    if (!e) return null;

    switch (a) {
      case "keypress":
        if (0 === bd(c)) return null;

      case "keydown":
      case "keyup":
        a = id;
        break;

      case "blur":
      case "focus":
        a = ad;
        break;

      case "click":
        if (2 === c.button) return null;

      case "auxclick":
      case "dblclick":
      case "mousedown":
      case "mousemove":
      case "mouseup":
      case "mouseout":
      case "mouseover":
      case "contextmenu":
        a = nd;
        break;

      case "drag":
      case "dragend":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "dragstart":
      case "drop":
        a = pd;
        break;

      case "touchcancel":
      case "touchend":
      case "touchmove":
      case "touchstart":
        a = qd;
        break;

      case Zb:
      case $b:
      case ac:
        a = Yc;
        break;

      case bc:
        a = rd;
        break;

      case "scroll":
        a = $c;
        break;

      case "wheel":
        a = sd;
        break;

      case "copy":
      case "cut":
      case "paste":
        a = Zc;
        break;

      case "gotpointercapture":
      case "lostpointercapture":
      case "pointercancel":
      case "pointerdown":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "pointerup":
        a = od;
        break;

      default:
        a = E$1;
    }

    b = a.getPooled(e, b, c, d);
    Sc(b);
    return b;
  }
},
    Fd = scheduler.unstable_UserBlockingPriority,
    Gd = scheduler.unstable_runWithPriority,
    Hd = Ed.getEventPriority,
    Id = 10,
    Jd = [];

function Kd(a) {
  var b = a.targetInst,
      c = b;

  do {
    if (!c) {
      a.ancestors.push(c);
      break;
    }

    var d = c;
    if (3 === d.tag) d = d.stateNode.containerInfo;else {
      for (; d.return;) d = d.return;

      d = 3 !== d.tag ? null : d.stateNode.containerInfo;
    }
    if (!d) break;
    b = c.tag;
    5 !== b && 6 !== b || a.ancestors.push(c);
    c = Fc(d);
  } while (c);

  for (c = 0; c < a.ancestors.length; c++) {
    b = a.ancestors[c];
    var e = Mc(a.nativeEvent);
    d = a.topLevelType;

    for (var f = a.nativeEvent, g = a.eventSystemFlags, h = null, k = 0; k < ea.length; k++) {
      var l = ea[k];
      l && (l = l.extractEvents(d, b, f, e, g)) && (h = xa(h, l));
    }

    Ba(h);
  }
}

var Ld = !0;

function F$1(a, b) {
  Md(b, a, !1);
}

function Md(a, b, c) {
  switch (Hd(b)) {
    case 0:
      var d = Nd.bind(null, b, 1);
      break;

    case 1:
      d = Od.bind(null, b, 1);
      break;

    default:
      d = Pd.bind(null, b, 1);
  }

  c ? a.addEventListener(b, d, !0) : a.addEventListener(b, d, !1);
}

function Nd(a, b, c) {
  ib || gb();
  var d = Pd,
      e = ib;
  ib = !0;

  try {
    fb(d, a, b, c);
  } finally {
    (ib = e) || kb();
  }
}

function Od(a, b, c) {
  Gd(Fd, Pd.bind(null, a, b, c));
}

function Qd(a, b, c, d) {
  if (Jd.length) {
    var e = Jd.pop();
    e.topLevelType = a;
    e.eventSystemFlags = b;
    e.nativeEvent = c;
    e.targetInst = d;
    a = e;
  } else a = {
    topLevelType: a,
    eventSystemFlags: b,
    nativeEvent: c,
    targetInst: d,
    ancestors: []
  };

  try {
    if (b = Kd, c = a, jb) b(c, void 0);else {
      jb = !0;

      try {
        hb(b, c, void 0);
      } finally {
        jb = !1, kb();
      }
    }
  } finally {
    a.topLevelType = null, a.nativeEvent = null, a.targetInst = null, a.ancestors.length = 0, Jd.length < Id && Jd.push(a);
  }
}

function Pd(a, b, c) {
  if (Ld) if (0 < nc.length && -1 < uc.indexOf(a)) a = zc(null, a, b, c), nc.push(a);else {
    var d = Hc(a, b, c);
    null === d ? Ac(a, c) : -1 < uc.indexOf(a) ? (a = zc(d, a, b, c), nc.push(a)) : Dc(d, a, b, c) || (Ac(a, c), Qd(a, b, c, null));
  }
}

function Hc(a, b, c) {
  var d = Mc(c);
  d = Fc(d);

  if (null !== d) {
    var e = ec(d);
    if (null === e) d = null;else {
      var f = e.tag;

      if (13 === f) {
        d = fc(e);
        if (null !== d) return d;
        d = null;
      } else if (3 === f) {
        if (e.stateNode.hydrate) return 3 === e.tag ? e.stateNode.containerInfo : null;
        d = null;
      } else e !== d && (d = null);
    }
  }

  Qd(a, b, c, d);
  return null;
}

function Rd(a) {
  if (!Ya) return !1;
  a = "on" + a;
  var b = a in document;
  b || (b = document.createElement("div"), b.setAttribute(a, "return;"), b = "function" === typeof b[a]);
  return b;
}

var Sd = new ("function" === typeof WeakMap ? WeakMap : Map)();

function xc(a) {
  var b = Sd.get(a);
  void 0 === b && (b = new Set(), Sd.set(a, b));
  return b;
}

function yc(a, b, c) {
  if (!c.has(a)) {
    switch (a) {
      case "scroll":
        Md(b, "scroll", !0);
        break;

      case "focus":
      case "blur":
        Md(b, "focus", !0);
        Md(b, "blur", !0);
        c.add("blur");
        c.add("focus");
        break;

      case "cancel":
      case "close":
        Rd(a) && Md(b, a, !0);
        break;

      case "invalid":
      case "submit":
      case "reset":
        break;

      default:
        -1 === cc.indexOf(a) && F$1(a, b);
    }

    c.add(a);
  }
}

var Td = {
  animationIterationCount: !0,
  borderImageOutset: !0,
  borderImageSlice: !0,
  borderImageWidth: !0,
  boxFlex: !0,
  boxFlexGroup: !0,
  boxOrdinalGroup: !0,
  columnCount: !0,
  columns: !0,
  flex: !0,
  flexGrow: !0,
  flexPositive: !0,
  flexShrink: !0,
  flexNegative: !0,
  flexOrder: !0,
  gridArea: !0,
  gridRow: !0,
  gridRowEnd: !0,
  gridRowSpan: !0,
  gridRowStart: !0,
  gridColumn: !0,
  gridColumnEnd: !0,
  gridColumnSpan: !0,
  gridColumnStart: !0,
  fontWeight: !0,
  lineClamp: !0,
  lineHeight: !0,
  opacity: !0,
  order: !0,
  orphans: !0,
  tabSize: !0,
  widows: !0,
  zIndex: !0,
  zoom: !0,
  fillOpacity: !0,
  floodOpacity: !0,
  stopOpacity: !0,
  strokeDasharray: !0,
  strokeDashoffset: !0,
  strokeMiterlimit: !0,
  strokeOpacity: !0,
  strokeWidth: !0
},
    Ud = ["Webkit", "ms", "Moz", "O"];
Object.keys(Td).forEach(function (a) {
  Ud.forEach(function (b) {
    b = b + a.charAt(0).toUpperCase() + a.substring(1);
    Td[b] = Td[a];
  });
});

function Vd(a, b, c) {
  return null == b || "boolean" === typeof b || "" === b ? "" : c || "number" !== typeof b || 0 === b || Td.hasOwnProperty(a) && Td[a] ? ("" + b).trim() : b + "px";
}

function Wd(a, b) {
  a = a.style;

  for (var c in b) if (b.hasOwnProperty(c)) {
    var d = 0 === c.indexOf("--"),
        e = Vd(c, b[c], d);
    "float" === c && (c = "cssFloat");
    d ? a.setProperty(c, e) : a[c] = e;
  }
}

var Xd = objectAssign({
  menuitem: !0
}, {
  area: !0,
  base: !0,
  br: !0,
  col: !0,
  embed: !0,
  hr: !0,
  img: !0,
  input: !0,
  keygen: !0,
  link: !0,
  meta: !0,
  param: !0,
  source: !0,
  track: !0,
  wbr: !0
});

function Yd(a, b) {
  if (b) {
    if (Xd[a] && (null != b.children || null != b.dangerouslySetInnerHTML)) throw Error(u$1(137, a, ""));

    if (null != b.dangerouslySetInnerHTML) {
      if (null != b.children) throw Error(u$1(60));
      if (!("object" === typeof b.dangerouslySetInnerHTML && "__html" in b.dangerouslySetInnerHTML)) throw Error(u$1(61));
    }

    if (null != b.style && "object" !== typeof b.style) throw Error(u$1(62, ""));
  }
}

function Zd(a, b) {
  if (-1 === a.indexOf("-")) return "string" === typeof b.is;

  switch (a) {
    case "annotation-xml":
    case "color-profile":
    case "font-face":
    case "font-face-src":
    case "font-face-uri":
    case "font-face-format":
    case "font-face-name":
    case "missing-glyph":
      return !1;

    default:
      return !0;
  }
}

function $d(a, b) {
  a = 9 === a.nodeType || 11 === a.nodeType ? a : a.ownerDocument;
  var c = xc(a);
  b = ja[b];

  for (var d = 0; d < b.length; d++) yc(b[d], a, c);
}

function ae() {}

function be(a) {
  a = a || ("undefined" !== typeof document ? document : void 0);
  if ("undefined" === typeof a) return null;

  try {
    return a.activeElement || a.body;
  } catch (b) {
    return a.body;
  }
}

function ce(a) {
  for (; a && a.firstChild;) a = a.firstChild;

  return a;
}

function de(a, b) {
  var c = ce(a);
  a = 0;

  for (var d; c;) {
    if (3 === c.nodeType) {
      d = a + c.textContent.length;
      if (a <= b && d >= b) return {
        node: c,
        offset: b - a
      };
      a = d;
    }

    a: {
      for (; c;) {
        if (c.nextSibling) {
          c = c.nextSibling;
          break a;
        }

        c = c.parentNode;
      }

      c = void 0;
    }

    c = ce(c);
  }
}

function ee(a, b) {
  return a && b ? a === b ? !0 : a && 3 === a.nodeType ? !1 : b && 3 === b.nodeType ? ee(a, b.parentNode) : "contains" in a ? a.contains(b) : a.compareDocumentPosition ? !!(a.compareDocumentPosition(b) & 16) : !1 : !1;
}

function fe() {
  for (var a = window, b = be(); b instanceof a.HTMLIFrameElement;) {
    try {
      var c = "string" === typeof b.contentWindow.location.href;
    } catch (d) {
      c = !1;
    }

    if (c) a = b.contentWindow;else break;
    b = be(a.document);
  }

  return b;
}

function ge(a) {
  var b = a && a.nodeName && a.nodeName.toLowerCase();
  return b && ("input" === b && ("text" === a.type || "search" === a.type || "tel" === a.type || "url" === a.type || "password" === a.type) || "textarea" === b || "true" === a.contentEditable);
}

var he = "$",
    ie = "/$",
    je = "$?",
    ke = "$!",
    le = null,
    me = null;

function ne(a, b) {
  switch (a) {
    case "button":
    case "input":
    case "select":
    case "textarea":
      return !!b.autoFocus;
  }

  return !1;
}

function oe(a, b) {
  return "textarea" === a || "option" === a || "noscript" === a || "string" === typeof b.children || "number" === typeof b.children || "object" === typeof b.dangerouslySetInnerHTML && null !== b.dangerouslySetInnerHTML && null != b.dangerouslySetInnerHTML.__html;
}

var pe = "function" === typeof setTimeout ? setTimeout : void 0,
    qe = "function" === typeof clearTimeout ? clearTimeout : void 0;

function re(a) {
  for (; null != a; a = a.nextSibling) {
    var b = a.nodeType;
    if (1 === b || 3 === b) break;
  }

  return a;
}

function se(a) {
  a = a.previousSibling;

  for (var b = 0; a;) {
    if (8 === a.nodeType) {
      var c = a.data;

      if (c === he || c === ke || c === je) {
        if (0 === b) return a;
        b--;
      } else c === ie && b++;
    }

    a = a.previousSibling;
  }

  return null;
}

var te = Math.random().toString(36).slice(2),
    ue = "__reactInternalInstance$" + te,
    ve = "__reactEventHandlers$" + te,
    we = "__reactContainere$" + te;

function Fc(a) {
  var b = a[ue];
  if (b) return b;

  for (var c = a.parentNode; c;) {
    if (b = c[we] || c[ue]) {
      c = b.alternate;
      if (null !== b.child || null !== c && null !== c.child) for (a = se(a); null !== a;) {
        if (c = a[ue]) return c;
        a = se(a);
      }
      return b;
    }

    a = c;
    c = a.parentNode;
  }

  return null;
}

function Cc(a) {
  a = a[ue] || a[we];
  return !a || 5 !== a.tag && 6 !== a.tag && 13 !== a.tag && 3 !== a.tag ? null : a;
}

function xe(a) {
  if (5 === a.tag || 6 === a.tag) return a.stateNode;
  throw Error(u$1(33));
}

function ye(a) {
  return a[ve] || null;
}

var ze = null,
    Ae = null,
    Be = null;

function Ce() {
  if (Be) return Be;
  var a,
      b = Ae,
      c = b.length,
      d,
      e = "value" in ze ? ze.value : ze.textContent,
      f = e.length;

  for (a = 0; a < c && b[a] === e[a]; a++);

  var g = c - a;

  for (d = 1; d <= g && b[c - d] === e[f - d]; d++);

  return Be = e.slice(a, 1 < d ? 1 - d : void 0);
}

var De = E$1.extend({
  data: null
}),
    Ee = E$1.extend({
  data: null
}),
    Fe = [9, 13, 27, 32],
    Ge = Ya && "CompositionEvent" in window,
    He = null;
Ya && "documentMode" in document && (He = document.documentMode);
var Ie = Ya && "TextEvent" in window && !He,
    Je = Ya && (!Ge || He && 8 < He && 11 >= He),
    Ke = String.fromCharCode(32),
    Le = {
  beforeInput: {
    phasedRegistrationNames: {
      bubbled: "onBeforeInput",
      captured: "onBeforeInputCapture"
    },
    dependencies: ["compositionend", "keypress", "textInput", "paste"]
  },
  compositionEnd: {
    phasedRegistrationNames: {
      bubbled: "onCompositionEnd",
      captured: "onCompositionEndCapture"
    },
    dependencies: "blur compositionend keydown keypress keyup mousedown".split(" ")
  },
  compositionStart: {
    phasedRegistrationNames: {
      bubbled: "onCompositionStart",
      captured: "onCompositionStartCapture"
    },
    dependencies: "blur compositionstart keydown keypress keyup mousedown".split(" ")
  },
  compositionUpdate: {
    phasedRegistrationNames: {
      bubbled: "onCompositionUpdate",
      captured: "onCompositionUpdateCapture"
    },
    dependencies: "blur compositionupdate keydown keypress keyup mousedown".split(" ")
  }
},
    Me = !1;

function Ne(a, b) {
  switch (a) {
    case "keyup":
      return -1 !== Fe.indexOf(b.keyCode);

    case "keydown":
      return 229 !== b.keyCode;

    case "keypress":
    case "mousedown":
    case "blur":
      return !0;

    default:
      return !1;
  }
}

function Oe(a) {
  a = a.detail;
  return "object" === typeof a && "data" in a ? a.data : null;
}

var Pe = !1;

function Qe(a, b) {
  switch (a) {
    case "compositionend":
      return Oe(b);

    case "keypress":
      if (32 !== b.which) return null;
      Me = !0;
      return Ke;

    case "textInput":
      return a = b.data, a === Ke && Me ? null : a;

    default:
      return null;
  }
}

function Re(a, b) {
  if (Pe) return "compositionend" === a || !Ge && Ne(a, b) ? (a = Ce(), Be = Ae = ze = null, Pe = !1, a) : null;

  switch (a) {
    case "paste":
      return null;

    case "keypress":
      if (!(b.ctrlKey || b.altKey || b.metaKey) || b.ctrlKey && b.altKey) {
        if (b.char && 1 < b.char.length) return b.char;
        if (b.which) return String.fromCharCode(b.which);
      }

      return null;

    case "compositionend":
      return Je && "ko" !== b.locale ? null : b.data;

    default:
      return null;
  }
}

var Se = {
  eventTypes: Le,
  extractEvents: function (a, b, c, d) {
    var e;
    if (Ge) b: {
      switch (a) {
        case "compositionstart":
          var f = Le.compositionStart;
          break b;

        case "compositionend":
          f = Le.compositionEnd;
          break b;

        case "compositionupdate":
          f = Le.compositionUpdate;
          break b;
      }

      f = void 0;
    } else Pe ? Ne(a, c) && (f = Le.compositionEnd) : "keydown" === a && 229 === c.keyCode && (f = Le.compositionStart);
    f ? (Je && "ko" !== c.locale && (Pe || f !== Le.compositionStart ? f === Le.compositionEnd && Pe && (e = Ce()) : (ze = d, Ae = "value" in ze ? ze.value : ze.textContent, Pe = !0)), f = De.getPooled(f, b, c, d), e ? f.data = e : (e = Oe(c), null !== e && (f.data = e)), Sc(f), e = f) : e = null;
    (a = Ie ? Qe(a, c) : Re(a, c)) ? (b = Ee.getPooled(Le.beforeInput, b, c, d), b.data = a, Sc(b)) : b = null;
    return null === e ? b : null === b ? e : [e, b];
  }
},
    Te = {
  color: !0,
  date: !0,
  datetime: !0,
  "datetime-local": !0,
  email: !0,
  month: !0,
  number: !0,
  password: !0,
  range: !0,
  search: !0,
  tel: !0,
  text: !0,
  time: !0,
  url: !0,
  week: !0
};

function Ue(a) {
  var b = a && a.nodeName && a.nodeName.toLowerCase();
  return "input" === b ? !!Te[a.type] : "textarea" === b ? !0 : !1;
}

var Ve = {
  change: {
    phasedRegistrationNames: {
      bubbled: "onChange",
      captured: "onChangeCapture"
    },
    dependencies: "blur change click focus input keydown keyup selectionchange".split(" ")
  }
};

function We(a, b, c) {
  a = E$1.getPooled(Ve.change, a, b, c);
  a.type = "change";
  cb(c);
  Sc(a);
  return a;
}

var Xe = null,
    Ye = null;

function Ze(a) {
  Ba(a);
}

function $e(a) {
  var b = xe(a);
  if (zb(b)) return a;
}

function af(a, b) {
  if ("change" === a) return b;
}

var bf = !1;
Ya && (bf = Rd("input") && (!document.documentMode || 9 < document.documentMode));

function cf() {
  Xe && (Xe.detachEvent("onpropertychange", df), Ye = Xe = null);
}

function df(a) {
  if ("value" === a.propertyName && $e(Ye)) if (a = We(Ye, a, Mc(a)), ib) Ba(a);else {
    ib = !0;

    try {
      eb(Ze, a);
    } finally {
      ib = !1, kb();
    }
  }
}

function ef(a, b, c) {
  "focus" === a ? (cf(), Xe = b, Ye = c, Xe.attachEvent("onpropertychange", df)) : "blur" === a && cf();
}

function ff(a) {
  if ("selectionchange" === a || "keyup" === a || "keydown" === a) return $e(Ye);
}

function gf(a, b) {
  if ("click" === a) return $e(b);
}

function hf(a, b) {
  if ("input" === a || "change" === a) return $e(b);
}

var jf = {
  eventTypes: Ve,
  _isInputEventSupported: bf,
  extractEvents: function (a, b, c, d) {
    var e = b ? xe(b) : window,
        f = e.nodeName && e.nodeName.toLowerCase();
    if ("select" === f || "input" === f && "file" === e.type) var g = af;else if (Ue(e)) {
      if (bf) g = hf;else {
        g = ff;
        var h = ef;
      }
    } else (f = e.nodeName) && "input" === f.toLowerCase() && ("checkbox" === e.type || "radio" === e.type) && (g = gf);
    if (g && (g = g(a, b))) return We(g, c, d);
    h && h(a, e, b);
    "blur" === a && (a = e._wrapperState) && a.controlled && "number" === e.type && Fb(e, "number", e.value);
  }
},
    kf = {
  mouseEnter: {
    registrationName: "onMouseEnter",
    dependencies: ["mouseout", "mouseover"]
  },
  mouseLeave: {
    registrationName: "onMouseLeave",
    dependencies: ["mouseout", "mouseover"]
  },
  pointerEnter: {
    registrationName: "onPointerEnter",
    dependencies: ["pointerout", "pointerover"]
  },
  pointerLeave: {
    registrationName: "onPointerLeave",
    dependencies: ["pointerout", "pointerover"]
  }
},
    lf,
    mf = {
  eventTypes: kf,
  extractEvents: function (a, b, c, d, e) {
    var f = "mouseover" === a || "pointerover" === a,
        g = "mouseout" === a || "pointerout" === a;
    if (f && 0 === (e & 32) && (c.relatedTarget || c.fromElement) || !g && !f) return null;
    e = d.window === d ? d : (e = d.ownerDocument) ? e.defaultView || e.parentWindow : window;

    if (g) {
      if (g = b, b = (b = c.relatedTarget || c.toElement) ? Fc(b) : null, null !== b && (f = ec(b), b !== f || 5 !== b.tag && 6 !== b.tag)) b = null;
    } else g = null;

    if (g === b) return null;

    if ("mouseout" === a || "mouseover" === a) {
      var h = nd;
      var k = kf.mouseLeave;
      var l = kf.mouseEnter;
      var m = "mouse";
    } else if ("pointerout" === a || "pointerover" === a) h = od, k = kf.pointerLeave, l = kf.pointerEnter, m = "pointer";

    a = null == g ? e : xe(g);
    e = null == b ? e : xe(b);
    k = h.getPooled(k, g, c, d);
    k.type = m + "leave";
    k.target = a;
    k.relatedTarget = e;
    d = h.getPooled(l, b, c, d);
    d.type = m + "enter";
    d.target = e;
    d.relatedTarget = a;
    h = g;
    m = b;
    if (h && m) a: {
      l = h;
      a = m;
      g = 0;

      for (b = l; b; b = Nc(b)) g++;

      b = 0;

      for (e = a; e; e = Nc(e)) b++;

      for (; 0 < g - b;) l = Nc(l), g--;

      for (; 0 < b - g;) a = Nc(a), b--;

      for (; g--;) {
        if (l === a || l === a.alternate) break a;
        l = Nc(l);
        a = Nc(a);
      }

      l = null;
    } else l = null;
    a = l;

    for (l = []; h && h !== a;) {
      g = h.alternate;
      if (null !== g && g === a) break;
      l.push(h);
      h = Nc(h);
    }

    for (h = []; m && m !== a;) {
      g = m.alternate;
      if (null !== g && g === a) break;
      h.push(m);
      m = Nc(m);
    }

    for (m = 0; m < l.length; m++) Qc(l[m], "bubbled", k);

    for (m = h.length; 0 < m--;) Qc(h[m], "captured", d);

    if (c === lf) return lf = null, [k];
    lf = c;
    return [k, d];
  }
};

function nf(a, b) {
  return a === b && (0 !== a || 1 / a === 1 / b) || a !== a && b !== b;
}

var of = "function" === typeof Object.is ? Object.is : nf,
    pf = Object.prototype.hasOwnProperty;

function qf(a, b) {
  if (of(a, b)) return !0;
  if ("object" !== typeof a || null === a || "object" !== typeof b || null === b) return !1;
  var c = Object.keys(a),
      d = Object.keys(b);
  if (c.length !== d.length) return !1;

  for (d = 0; d < c.length; d++) if (!pf.call(b, c[d]) || !of(a[c[d]], b[c[d]])) return !1;

  return !0;
}

var rf = Ya && "documentMode" in document && 11 >= document.documentMode,
    sf = {
  select: {
    phasedRegistrationNames: {
      bubbled: "onSelect",
      captured: "onSelectCapture"
    },
    dependencies: "blur contextmenu dragend focus keydown keyup mousedown mouseup selectionchange".split(" ")
  }
},
    tf = null,
    uf = null,
    vf = null,
    wf = !1;

function xf(a, b) {
  var c = b.window === b ? b.document : 9 === b.nodeType ? b : b.ownerDocument;
  if (wf || null == tf || tf !== be(c)) return null;
  c = tf;
  "selectionStart" in c && ge(c) ? c = {
    start: c.selectionStart,
    end: c.selectionEnd
  } : (c = (c.ownerDocument && c.ownerDocument.defaultView || window).getSelection(), c = {
    anchorNode: c.anchorNode,
    anchorOffset: c.anchorOffset,
    focusNode: c.focusNode,
    focusOffset: c.focusOffset
  });
  return vf && qf(vf, c) ? null : (vf = c, a = E$1.getPooled(sf.select, uf, a, b), a.type = "select", a.target = tf, Sc(a), a);
}

var yf = {
  eventTypes: sf,
  extractEvents: function (a, b, c, d) {
    var e = d.window === d ? d.document : 9 === d.nodeType ? d : d.ownerDocument,
        f;

    if (!(f = !e)) {
      a: {
        e = xc(e);
        f = ja.onSelect;

        for (var g = 0; g < f.length; g++) if (!e.has(f[g])) {
          e = !1;
          break a;
        }

        e = !0;
      }

      f = !e;
    }

    if (f) return null;
    e = b ? xe(b) : window;

    switch (a) {
      case "focus":
        if (Ue(e) || "true" === e.contentEditable) tf = e, uf = b, vf = null;
        break;

      case "blur":
        vf = uf = tf = null;
        break;

      case "mousedown":
        wf = !0;
        break;

      case "contextmenu":
      case "mouseup":
      case "dragend":
        return wf = !1, xf(c, d);

      case "selectionchange":
        if (rf) break;

      case "keydown":
      case "keyup":
        return xf(c, d);
    }

    return null;
  }
};
Ca.injectEventPluginOrder("ResponderEventPlugin SimpleEventPlugin EnterLeaveEventPlugin ChangeEventPlugin SelectEventPlugin BeforeInputEventPlugin".split(" "));
var zf = Cc;
sa = ye;
ua = zf;
va = xe;
Ca.injectEventPluginsByName({
  SimpleEventPlugin: Ed,
  EnterLeaveEventPlugin: mf,
  ChangeEventPlugin: jf,
  SelectEventPlugin: yf,
  BeforeInputEventPlugin: Se
});
var Af = [],
    Bf = -1;

function G$1(a) {
  0 > Bf || (a.current = Af[Bf], Af[Bf] = null, Bf--);
}

function I$1(a, b) {
  Bf++;
  Af[Bf] = a.current;
  a.current = b;
}

var Cf = {},
    J$1 = {
  current: Cf
},
    K$1 = {
  current: !1
},
    Df = Cf;

function Ef(a, b) {
  var c = a.type.contextTypes;
  if (!c) return Cf;
  var d = a.stateNode;
  if (d && d.__reactInternalMemoizedUnmaskedChildContext === b) return d.__reactInternalMemoizedMaskedChildContext;
  var e = {},
      f;

  for (f in c) e[f] = b[f];

  d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = b, a.__reactInternalMemoizedMaskedChildContext = e);
  return e;
}

function L$1(a) {
  a = a.childContextTypes;
  return null !== a && void 0 !== a;
}

function Ff(a) {
  G$1(K$1);
  G$1(J$1);
}

function Gf(a) {
  G$1(K$1);
  G$1(J$1);
}

function Hf(a, b, c) {
  if (J$1.current !== Cf) throw Error(u$1(168));
  I$1(J$1, b);
  I$1(K$1, c);
}

function If(a, b, c) {
  var d = a.stateNode;
  a = b.childContextTypes;
  if ("function" !== typeof d.getChildContext) return c;
  d = d.getChildContext();

  for (var e in d) if (!(e in a)) throw Error(u$1(108, Wa(b) || "Unknown", e));

  return objectAssign({}, c, {}, d);
}

function Jf(a) {
  var b = a.stateNode;
  b = b && b.__reactInternalMemoizedMergedChildContext || Cf;
  Df = J$1.current;
  I$1(J$1, b);
  I$1(K$1, K$1.current);
  return !0;
}

function Kf(a, b, c) {
  var d = a.stateNode;
  if (!d) throw Error(u$1(169));
  c ? (b = If(a, b, Df), d.__reactInternalMemoizedMergedChildContext = b, G$1(K$1), G$1(J$1), I$1(J$1, b)) : G$1(K$1);
  I$1(K$1, c);
}

var Lf = scheduler.unstable_runWithPriority,
    Mf = scheduler.unstable_scheduleCallback,
    Nf = scheduler.unstable_cancelCallback,
    Of = scheduler.unstable_shouldYield,
    Pf = scheduler.unstable_requestPaint,
    Qf = scheduler.unstable_now,
    Rf = scheduler.unstable_getCurrentPriorityLevel,
    Sf = scheduler.unstable_ImmediatePriority,
    Tf = scheduler.unstable_UserBlockingPriority,
    Uf = scheduler.unstable_NormalPriority,
    Vf = scheduler.unstable_LowPriority,
    Wf = scheduler.unstable_IdlePriority,
    Xf = {},
    Yf = void 0 !== Pf ? Pf : function () {},
    Zf = null,
    $f = null,
    ag = !1,
    bg = Qf(),
    cg = 1E4 > bg ? Qf : function () {
  return Qf() - bg;
};

function dg() {
  switch (Rf()) {
    case Sf:
      return 99;

    case Tf:
      return 98;

    case Uf:
      return 97;

    case Vf:
      return 96;

    case Wf:
      return 95;

    default:
      throw Error(u$1(332));
  }
}

function eg(a) {
  switch (a) {
    case 99:
      return Sf;

    case 98:
      return Tf;

    case 97:
      return Uf;

    case 96:
      return Vf;

    case 95:
      return Wf;

    default:
      throw Error(u$1(332));
  }
}

function fg(a, b) {
  a = eg(a);
  return Lf(a, b);
}

function gg(a, b, c) {
  a = eg(a);
  return Mf(a, b, c);
}

function hg(a) {
  null === Zf ? (Zf = [a], $f = Mf(Sf, ig)) : Zf.push(a);
  return Xf;
}

function jg() {
  if (null !== $f) {
    var a = $f;
    $f = null;
    Nf(a);
  }

  ig();
}

function ig() {
  if (!ag && null !== Zf) {
    ag = !0;
    var a = 0;

    try {
      var b = Zf;
      fg(99, function () {
        for (; a < b.length; a++) {
          var c = b[a];

          do c = c(!0); while (null !== c);
        }
      });
      Zf = null;
    } catch (c) {
      throw null !== Zf && (Zf = Zf.slice(a + 1)), Mf(Sf, jg), c;
    } finally {
      ag = !1;
    }
  }
}

var kg = 3;

function lg(a, b, c) {
  c /= 10;
  return 1073741821 - (((1073741821 - a + b / 10) / c | 0) + 1) * c;
}

function mg(a, b) {
  if (a && a.defaultProps) {
    b = objectAssign({}, b);
    a = a.defaultProps;

    for (var c in a) void 0 === b[c] && (b[c] = a[c]);
  }

  return b;
}

var ng = {
  current: null
},
    og = null,
    pg = null,
    qg = null;

function rg() {
  qg = pg = og = null;
}

function sg(a, b) {
  var c = a.type._context;
  I$1(ng, c._currentValue);
  c._currentValue = b;
}

function tg(a) {
  var b = ng.current;
  G$1(ng);
  a.type._context._currentValue = b;
}

function ug(a, b) {
  for (; null !== a;) {
    var c = a.alternate;
    if (a.childExpirationTime < b) a.childExpirationTime = b, null !== c && c.childExpirationTime < b && (c.childExpirationTime = b);else if (null !== c && c.childExpirationTime < b) c.childExpirationTime = b;else break;
    a = a.return;
  }
}

function vg(a, b) {
  og = a;
  qg = pg = null;
  a = a.dependencies;
  null !== a && null !== a.firstContext && (a.expirationTime >= b && (wg = !0), a.firstContext = null);
}

function xg(a, b) {
  if (qg !== a && !1 !== b && 0 !== b) {
    if ("number" !== typeof b || 1073741823 === b) qg = a, b = 1073741823;
    b = {
      context: a,
      observedBits: b,
      next: null
    };

    if (null === pg) {
      if (null === og) throw Error(u$1(308));
      pg = b;
      og.dependencies = {
        expirationTime: 0,
        firstContext: b,
        responders: null
      };
    } else pg = pg.next = b;
  }

  return a._currentValue;
}

var yg = !1;

function zg(a) {
  return {
    baseState: a,
    firstUpdate: null,
    lastUpdate: null,
    firstCapturedUpdate: null,
    lastCapturedUpdate: null,
    firstEffect: null,
    lastEffect: null,
    firstCapturedEffect: null,
    lastCapturedEffect: null
  };
}

function Ag(a) {
  return {
    baseState: a.baseState,
    firstUpdate: a.firstUpdate,
    lastUpdate: a.lastUpdate,
    firstCapturedUpdate: null,
    lastCapturedUpdate: null,
    firstEffect: null,
    lastEffect: null,
    firstCapturedEffect: null,
    lastCapturedEffect: null
  };
}

function Bg(a, b) {
  return {
    expirationTime: a,
    suspenseConfig: b,
    tag: 0,
    payload: null,
    callback: null,
    next: null,
    nextEffect: null
  };
}

function Cg(a, b) {
  null === a.lastUpdate ? a.firstUpdate = a.lastUpdate = b : (a.lastUpdate.next = b, a.lastUpdate = b);
}

function Dg(a, b) {
  var c = a.alternate;

  if (null === c) {
    var d = a.updateQueue;
    var e = null;
    null === d && (d = a.updateQueue = zg(a.memoizedState));
  } else d = a.updateQueue, e = c.updateQueue, null === d ? null === e ? (d = a.updateQueue = zg(a.memoizedState), e = c.updateQueue = zg(c.memoizedState)) : d = a.updateQueue = Ag(e) : null === e && (e = c.updateQueue = Ag(d));

  null === e || d === e ? Cg(d, b) : null === d.lastUpdate || null === e.lastUpdate ? (Cg(d, b), Cg(e, b)) : (Cg(d, b), e.lastUpdate = b);
}

function Eg(a, b) {
  var c = a.updateQueue;
  c = null === c ? a.updateQueue = zg(a.memoizedState) : Fg(a, c);
  null === c.lastCapturedUpdate ? c.firstCapturedUpdate = c.lastCapturedUpdate = b : (c.lastCapturedUpdate.next = b, c.lastCapturedUpdate = b);
}

function Fg(a, b) {
  var c = a.alternate;
  null !== c && b === c.updateQueue && (b = a.updateQueue = Ag(b));
  return b;
}

function Gg(a, b, c, d, e, f) {
  switch (c.tag) {
    case 1:
      return a = c.payload, "function" === typeof a ? a.call(f, d, e) : a;

    case 3:
      a.effectTag = a.effectTag & -4097 | 64;

    case 0:
      a = c.payload;
      e = "function" === typeof a ? a.call(f, d, e) : a;
      if (null === e || void 0 === e) break;
      return objectAssign({}, d, e);

    case 2:
      yg = !0;
  }

  return d;
}

function Hg(a, b, c, d, e) {
  yg = !1;
  b = Fg(a, b);

  for (var f = b.baseState, g = null, h = 0, k = b.firstUpdate, l = f; null !== k;) {
    var m = k.expirationTime;
    m < e ? (null === g && (g = k, f = l), h < m && (h = m)) : (Ig(m, k.suspenseConfig), l = Gg(a, b, k, l, c, d), null !== k.callback && (a.effectTag |= 32, k.nextEffect = null, null === b.lastEffect ? b.firstEffect = b.lastEffect = k : (b.lastEffect.nextEffect = k, b.lastEffect = k)));
    k = k.next;
  }

  m = null;

  for (k = b.firstCapturedUpdate; null !== k;) {
    var C = k.expirationTime;
    C < e ? (null === m && (m = k, null === g && (f = l)), h < C && (h = C)) : (l = Gg(a, b, k, l, c, d), null !== k.callback && (a.effectTag |= 32, k.nextEffect = null, null === b.lastCapturedEffect ? b.firstCapturedEffect = b.lastCapturedEffect = k : (b.lastCapturedEffect.nextEffect = k, b.lastCapturedEffect = k)));
    k = k.next;
  }

  null === g && (b.lastUpdate = null);
  null === m ? b.lastCapturedUpdate = null : a.effectTag |= 32;
  null === g && null === m && (f = l);
  b.baseState = f;
  b.firstUpdate = g;
  b.firstCapturedUpdate = m;
  Jg(h);
  a.expirationTime = h;
  a.memoizedState = l;
}

function Kg(a, b, c) {
  null !== b.firstCapturedUpdate && (null !== b.lastUpdate && (b.lastUpdate.next = b.firstCapturedUpdate, b.lastUpdate = b.lastCapturedUpdate), b.firstCapturedUpdate = b.lastCapturedUpdate = null);
  Lg(b.firstEffect, c);
  b.firstEffect = b.lastEffect = null;
  Lg(b.firstCapturedEffect, c);
  b.firstCapturedEffect = b.lastCapturedEffect = null;
}

function Lg(a, b) {
  for (; null !== a;) {
    var c = a.callback;

    if (null !== c) {
      a.callback = null;
      var d = b;
      if ("function" !== typeof c) throw Error(u$1(191, c));
      c.call(d);
    }

    a = a.nextEffect;
  }
}

var Mg = Ea.ReactCurrentBatchConfig,
    Ng = new react.Component().refs;

function Og(a, b, c, d) {
  b = a.memoizedState;
  c = c(d, b);
  c = null === c || void 0 === c ? b : objectAssign({}, b, c);
  a.memoizedState = c;
  d = a.updateQueue;
  null !== d && 0 === a.expirationTime && (d.baseState = c);
}

var Sg = {
  isMounted: function (a) {
    return (a = a._reactInternalFiber) ? ec(a) === a : !1;
  },
  enqueueSetState: function (a, b, c) {
    a = a._reactInternalFiber;
    var d = Pg(),
        e = Mg.suspense;
    d = Qg(d, a, e);
    e = Bg(d, e);
    e.payload = b;
    void 0 !== c && null !== c && (e.callback = c);
    Dg(a, e);
    Rg(a, d);
  },
  enqueueReplaceState: function (a, b, c) {
    a = a._reactInternalFiber;
    var d = Pg(),
        e = Mg.suspense;
    d = Qg(d, a, e);
    e = Bg(d, e);
    e.tag = 1;
    e.payload = b;
    void 0 !== c && null !== c && (e.callback = c);
    Dg(a, e);
    Rg(a, d);
  },
  enqueueForceUpdate: function (a, b) {
    a = a._reactInternalFiber;
    var c = Pg(),
        d = Mg.suspense;
    c = Qg(c, a, d);
    d = Bg(c, d);
    d.tag = 2;
    void 0 !== b && null !== b && (d.callback = b);
    Dg(a, d);
    Rg(a, c);
  }
};

function Tg(a, b, c, d, e, f, g) {
  a = a.stateNode;
  return "function" === typeof a.shouldComponentUpdate ? a.shouldComponentUpdate(d, f, g) : b.prototype && b.prototype.isPureReactComponent ? !qf(c, d) || !qf(e, f) : !0;
}

function Ug(a, b, c) {
  var d = !1,
      e = Cf;
  var f = b.contextType;
  "object" === typeof f && null !== f ? f = xg(f) : (e = L$1(b) ? Df : J$1.current, d = b.contextTypes, f = (d = null !== d && void 0 !== d) ? Ef(a, e) : Cf);
  b = new b(c, f);
  a.memoizedState = null !== b.state && void 0 !== b.state ? b.state : null;
  b.updater = Sg;
  a.stateNode = b;
  b._reactInternalFiber = a;
  d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = e, a.__reactInternalMemoizedMaskedChildContext = f);
  return b;
}

function Vg(a, b, c, d) {
  a = b.state;
  "function" === typeof b.componentWillReceiveProps && b.componentWillReceiveProps(c, d);
  "function" === typeof b.UNSAFE_componentWillReceiveProps && b.UNSAFE_componentWillReceiveProps(c, d);
  b.state !== a && Sg.enqueueReplaceState(b, b.state, null);
}

function Wg(a, b, c, d) {
  var e = a.stateNode;
  e.props = c;
  e.state = a.memoizedState;
  e.refs = Ng;
  var f = b.contextType;
  "object" === typeof f && null !== f ? e.context = xg(f) : (f = L$1(b) ? Df : J$1.current, e.context = Ef(a, f));
  f = a.updateQueue;
  null !== f && (Hg(a, f, c, e, d), e.state = a.memoizedState);
  f = b.getDerivedStateFromProps;
  "function" === typeof f && (Og(a, b, f, c), e.state = a.memoizedState);
  "function" === typeof b.getDerivedStateFromProps || "function" === typeof e.getSnapshotBeforeUpdate || "function" !== typeof e.UNSAFE_componentWillMount && "function" !== typeof e.componentWillMount || (b = e.state, "function" === typeof e.componentWillMount && e.componentWillMount(), "function" === typeof e.UNSAFE_componentWillMount && e.UNSAFE_componentWillMount(), b !== e.state && Sg.enqueueReplaceState(e, e.state, null), f = a.updateQueue, null !== f && (Hg(a, f, c, e, d), e.state = a.memoizedState));
  "function" === typeof e.componentDidMount && (a.effectTag |= 4);
}

var Xg = Array.isArray;

function Yg(a, b, c) {
  a = c.ref;

  if (null !== a && "function" !== typeof a && "object" !== typeof a) {
    if (c._owner) {
      c = c._owner;

      if (c) {
        if (1 !== c.tag) throw Error(u$1(309));
        var d = c.stateNode;
      }

      if (!d) throw Error(u$1(147, a));
      var e = "" + a;
      if (null !== b && null !== b.ref && "function" === typeof b.ref && b.ref._stringRef === e) return b.ref;

      b = function (a) {
        var b = d.refs;
        b === Ng && (b = d.refs = {});
        null === a ? delete b[e] : b[e] = a;
      };

      b._stringRef = e;
      return b;
    }

    if ("string" !== typeof a) throw Error(u$1(284));
    if (!c._owner) throw Error(u$1(290, a));
  }

  return a;
}

function Zg(a, b) {
  if ("textarea" !== a.type) throw Error(u$1(31, "[object Object]" === Object.prototype.toString.call(b) ? "object with keys {" + Object.keys(b).join(", ") + "}" : b, ""));
}

function $g(a) {
  function b(b, c) {
    if (a) {
      var d = b.lastEffect;
      null !== d ? (d.nextEffect = c, b.lastEffect = c) : b.firstEffect = b.lastEffect = c;
      c.nextEffect = null;
      c.effectTag = 8;
    }
  }

  function c(c, d) {
    if (!a) return null;

    for (; null !== d;) b(c, d), d = d.sibling;

    return null;
  }

  function d(a, b) {
    for (a = new Map(); null !== b;) null !== b.key ? a.set(b.key, b) : a.set(b.index, b), b = b.sibling;

    return a;
  }

  function e(a, b, c) {
    a = ah(a, b);
    a.index = 0;
    a.sibling = null;
    return a;
  }

  function f(b, c, d) {
    b.index = d;
    if (!a) return c;
    d = b.alternate;
    if (null !== d) return d = d.index, d < c ? (b.effectTag = 2, c) : d;
    b.effectTag = 2;
    return c;
  }

  function g(b) {
    a && null === b.alternate && (b.effectTag = 2);
    return b;
  }

  function h(a, b, c, d) {
    if (null === b || 6 !== b.tag) return b = bh(c, a.mode, d), b.return = a, b;
    b = e(b, c);
    b.return = a;
    return b;
  }

  function k(a, b, c, d) {
    if (null !== b && b.elementType === c.type) return d = e(b, c.props), d.ref = Yg(a, b, c), d.return = a, d;
    d = ch(c.type, c.key, c.props, null, a.mode, d);
    d.ref = Yg(a, b, c);
    d.return = a;
    return d;
  }

  function l(a, b, c, d) {
    if (null === b || 4 !== b.tag || b.stateNode.containerInfo !== c.containerInfo || b.stateNode.implementation !== c.implementation) return b = dh(c, a.mode, d), b.return = a, b;
    b = e(b, c.children || []);
    b.return = a;
    return b;
  }

  function m(a, b, c, d, f) {
    if (null === b || 7 !== b.tag) return b = eh(c, a.mode, d, f), b.return = a, b;
    b = e(b, c);
    b.return = a;
    return b;
  }

  function C(a, b, c) {
    if ("string" === typeof b || "number" === typeof b) return b = bh("" + b, a.mode, c), b.return = a, b;

    if ("object" === typeof b && null !== b) {
      switch (b.$$typeof) {
        case Ga:
          return c = ch(b.type, b.key, b.props, null, a.mode, c), c.ref = Yg(a, null, b), c.return = a, c;

        case Ha:
          return b = dh(b, a.mode, c), b.return = a, b;
      }

      if (Xg(b) || Ua(b)) return b = eh(b, a.mode, c, null), b.return = a, b;
      Zg(a, b);
    }

    return null;
  }

  function y(a, b, c, d) {
    var e = null !== b ? b.key : null;
    if ("string" === typeof c || "number" === typeof c) return null !== e ? null : h(a, b, "" + c, d);

    if ("object" === typeof c && null !== c) {
      switch (c.$$typeof) {
        case Ga:
          return c.key === e ? c.type === Ia ? m(a, b, c.props.children, d, e) : k(a, b, c, d) : null;

        case Ha:
          return c.key === e ? l(a, b, c, d) : null;
      }

      if (Xg(c) || Ua(c)) return null !== e ? null : m(a, b, c, d, null);
      Zg(a, c);
    }

    return null;
  }

  function H(a, b, c, d, e) {
    if ("string" === typeof d || "number" === typeof d) return a = a.get(c) || null, h(b, a, "" + d, e);

    if ("object" === typeof d && null !== d) {
      switch (d.$$typeof) {
        case Ga:
          return a = a.get(null === d.key ? c : d.key) || null, d.type === Ia ? m(b, a, d.props.children, e, d.key) : k(b, a, d, e);

        case Ha:
          return a = a.get(null === d.key ? c : d.key) || null, l(b, a, d, e);
      }

      if (Xg(d) || Ua(d)) return a = a.get(c) || null, m(b, a, d, e, null);
      Zg(b, d);
    }

    return null;
  }

  function z(e, g, h, k) {
    for (var l = null, m = null, r = g, x = g = 0, A = null; null !== r && x < h.length; x++) {
      r.index > x ? (A = r, r = null) : A = r.sibling;
      var p = y(e, r, h[x], k);

      if (null === p) {
        null === r && (r = A);
        break;
      }

      a && r && null === p.alternate && b(e, r);
      g = f(p, g, x);
      null === m ? l = p : m.sibling = p;
      m = p;
      r = A;
    }

    if (x === h.length) return c(e, r), l;

    if (null === r) {
      for (; x < h.length; x++) r = C(e, h[x], k), null !== r && (g = f(r, g, x), null === m ? l = r : m.sibling = r, m = r);

      return l;
    }

    for (r = d(e, r); x < h.length; x++) A = H(r, e, x, h[x], k), null !== A && (a && null !== A.alternate && r.delete(null === A.key ? x : A.key), g = f(A, g, x), null === m ? l = A : m.sibling = A, m = A);

    a && r.forEach(function (a) {
      return b(e, a);
    });
    return l;
  }

  function ta(e, g, h, k) {
    var l = Ua(h);
    if ("function" !== typeof l) throw Error(u$1(150));
    h = l.call(h);
    if (null == h) throw Error(u$1(151));

    for (var m = l = null, r = g, x = g = 0, A = null, p = h.next(); null !== r && !p.done; x++, p = h.next()) {
      r.index > x ? (A = r, r = null) : A = r.sibling;
      var z = y(e, r, p.value, k);

      if (null === z) {
        null === r && (r = A);
        break;
      }

      a && r && null === z.alternate && b(e, r);
      g = f(z, g, x);
      null === m ? l = z : m.sibling = z;
      m = z;
      r = A;
    }

    if (p.done) return c(e, r), l;

    if (null === r) {
      for (; !p.done; x++, p = h.next()) p = C(e, p.value, k), null !== p && (g = f(p, g, x), null === m ? l = p : m.sibling = p, m = p);

      return l;
    }

    for (r = d(e, r); !p.done; x++, p = h.next()) p = H(r, e, x, p.value, k), null !== p && (a && null !== p.alternate && r.delete(null === p.key ? x : p.key), g = f(p, g, x), null === m ? l = p : m.sibling = p, m = p);

    a && r.forEach(function (a) {
      return b(e, a);
    });
    return l;
  }

  return function (a, d, f, h) {
    var k = "object" === typeof f && null !== f && f.type === Ia && null === f.key;
    k && (f = f.props.children);
    var l = "object" === typeof f && null !== f;
    if (l) switch (f.$$typeof) {
      case Ga:
        a: {
          l = f.key;

          for (k = d; null !== k;) {
            if (k.key === l) {
              if (7 === k.tag ? f.type === Ia : k.elementType === f.type) {
                c(a, k.sibling);
                d = e(k, f.type === Ia ? f.props.children : f.props);
                d.ref = Yg(a, k, f);
                d.return = a;
                a = d;
                break a;
              } else {
                c(a, k);
                break;
              }
            } else b(a, k);
            k = k.sibling;
          }

          f.type === Ia ? (d = eh(f.props.children, a.mode, h, f.key), d.return = a, a = d) : (h = ch(f.type, f.key, f.props, null, a.mode, h), h.ref = Yg(a, d, f), h.return = a, a = h);
        }

        return g(a);

      case Ha:
        a: {
          for (k = f.key; null !== d;) {
            if (d.key === k) {
              if (4 === d.tag && d.stateNode.containerInfo === f.containerInfo && d.stateNode.implementation === f.implementation) {
                c(a, d.sibling);
                d = e(d, f.children || []);
                d.return = a;
                a = d;
                break a;
              } else {
                c(a, d);
                break;
              }
            } else b(a, d);
            d = d.sibling;
          }

          d = dh(f, a.mode, h);
          d.return = a;
          a = d;
        }

        return g(a);
    }
    if ("string" === typeof f || "number" === typeof f) return f = "" + f, null !== d && 6 === d.tag ? (c(a, d.sibling), d = e(d, f), d.return = a, a = d) : (c(a, d), d = bh(f, a.mode, h), d.return = a, a = d), g(a);
    if (Xg(f)) return z(a, d, f, h);
    if (Ua(f)) return ta(a, d, f, h);
    l && Zg(a, f);
    if ("undefined" === typeof f && !k) switch (a.tag) {
      case 1:
      case 0:
        throw a = a.type, Error(u$1(152, a.displayName || a.name || "Component"));
    }
    return c(a, d);
  };
}

var fh = $g(!0),
    gh = $g(!1),
    hh = {},
    ih = {
  current: hh
},
    jh = {
  current: hh
},
    kh = {
  current: hh
};

function lh(a) {
  if (a === hh) throw Error(u$1(174));
  return a;
}

function mh(a, b) {
  I$1(kh, b);
  I$1(jh, a);
  I$1(ih, hh);
  var c = b.nodeType;

  switch (c) {
    case 9:
    case 11:
      b = (b = b.documentElement) ? b.namespaceURI : Qb(null, "");
      break;

    default:
      c = 8 === c ? b.parentNode : b, b = c.namespaceURI || null, c = c.tagName, b = Qb(b, c);
  }

  G$1(ih);
  I$1(ih, b);
}

function nh(a) {
  G$1(ih);
  G$1(jh);
  G$1(kh);
}

function oh(a) {
  lh(kh.current);
  var b = lh(ih.current);
  var c = Qb(b, a.type);
  b !== c && (I$1(jh, a), I$1(ih, c));
}

function ph(a) {
  jh.current === a && (G$1(ih), G$1(jh));
}

var M$1 = {
  current: 0
};

function qh(a) {
  for (var b = a; null !== b;) {
    if (13 === b.tag) {
      var c = b.memoizedState;
      if (null !== c && (c = c.dehydrated, null === c || c.data === je || c.data === ke)) return b;
    } else if (19 === b.tag && void 0 !== b.memoizedProps.revealOrder) {
      if (0 !== (b.effectTag & 64)) return b;
    } else if (null !== b.child) {
      b.child.return = b;
      b = b.child;
      continue;
    }

    if (b === a) break;

    for (; null === b.sibling;) {
      if (null === b.return || b.return === a) return null;
      b = b.return;
    }

    b.sibling.return = b.return;
    b = b.sibling;
  }

  return null;
}

function rh(a, b) {
  return {
    responder: a,
    props: b
  };
}

var sh = Ea.ReactCurrentDispatcher,
    N$1 = Ea.ReactCurrentBatchConfig,
    th = 0,
    uh = null,
    O$1 = null,
    vh = null,
    wh = null,
    P$1 = null,
    xh = null,
    yh = 0,
    zh = null,
    Ah = 0,
    Bh = !1,
    Ch = null,
    Gh = 0;

function Q$1() {
  throw Error(u$1(321));
}

function Hh(a, b) {
  if (null === b) return !1;

  for (var c = 0; c < b.length && c < a.length; c++) if (!of(a[c], b[c])) return !1;

  return !0;
}

function Ih(a, b, c, d, e, f) {
  th = f;
  uh = b;
  vh = null !== a ? a.memoizedState : null;
  sh.current = null === vh ? Jh : Kh;
  b = c(d, e);

  if (Bh) {
    do Bh = !1, Gh += 1, vh = null !== a ? a.memoizedState : null, xh = wh, zh = P$1 = O$1 = null, sh.current = Kh, b = c(d, e); while (Bh);

    Ch = null;
    Gh = 0;
  }

  sh.current = Lh;
  a = uh;
  a.memoizedState = wh;
  a.expirationTime = yh;
  a.updateQueue = zh;
  a.effectTag |= Ah;
  a = null !== O$1 && null !== O$1.next;
  th = 0;
  xh = P$1 = wh = vh = O$1 = uh = null;
  yh = 0;
  zh = null;
  Ah = 0;
  if (a) throw Error(u$1(300));
  return b;
}

function Mh() {
  sh.current = Lh;
  th = 0;
  xh = P$1 = wh = vh = O$1 = uh = null;
  yh = 0;
  zh = null;
  Ah = 0;
  Bh = !1;
  Ch = null;
  Gh = 0;
}

function Nh() {
  var a = {
    memoizedState: null,
    baseState: null,
    queue: null,
    baseUpdate: null,
    next: null
  };
  null === P$1 ? wh = P$1 = a : P$1 = P$1.next = a;
  return P$1;
}

function Oh() {
  if (null !== xh) P$1 = xh, xh = P$1.next, O$1 = vh, vh = null !== O$1 ? O$1.next : null;else {
    if (null === vh) throw Error(u$1(310));
    O$1 = vh;
    var a = {
      memoizedState: O$1.memoizedState,
      baseState: O$1.baseState,
      queue: O$1.queue,
      baseUpdate: O$1.baseUpdate,
      next: null
    };
    P$1 = null === P$1 ? wh = a : P$1.next = a;
    vh = O$1.next;
  }
  return P$1;
}

function Ph(a, b) {
  return "function" === typeof b ? b(a) : b;
}

function Qh(a) {
  var b = Oh(),
      c = b.queue;
  if (null === c) throw Error(u$1(311));
  c.lastRenderedReducer = a;

  if (0 < Gh) {
    var d = c.dispatch;

    if (null !== Ch) {
      var e = Ch.get(c);

      if (void 0 !== e) {
        Ch.delete(c);
        var f = b.memoizedState;

        do f = a(f, e.action), e = e.next; while (null !== e);

        of(f, b.memoizedState) || (wg = !0);
        b.memoizedState = f;
        b.baseUpdate === c.last && (b.baseState = f);
        c.lastRenderedState = f;
        return [f, d];
      }
    }

    return [b.memoizedState, d];
  }

  d = c.last;
  var g = b.baseUpdate;
  f = b.baseState;
  null !== g ? (null !== d && (d.next = null), d = g.next) : d = null !== d ? d.next : null;

  if (null !== d) {
    var h = e = null,
        k = d,
        l = !1;

    do {
      var m = k.expirationTime;
      m < th ? (l || (l = !0, h = g, e = f), m > yh && (yh = m, Jg(yh))) : (Ig(m, k.suspenseConfig), f = k.eagerReducer === a ? k.eagerState : a(f, k.action));
      g = k;
      k = k.next;
    } while (null !== k && k !== d);

    l || (h = g, e = f);
    of(f, b.memoizedState) || (wg = !0);
    b.memoizedState = f;
    b.baseUpdate = h;
    b.baseState = e;
    c.lastRenderedState = f;
  }

  return [b.memoizedState, c.dispatch];
}

function Rh(a) {
  var b = Nh();
  "function" === typeof a && (a = a());
  b.memoizedState = b.baseState = a;
  a = b.queue = {
    last: null,
    dispatch: null,
    lastRenderedReducer: Ph,
    lastRenderedState: a
  };
  a = a.dispatch = Sh.bind(null, uh, a);
  return [b.memoizedState, a];
}

function Th(a) {
  return Qh(Ph);
}

function Uh(a, b, c, d) {
  a = {
    tag: a,
    create: b,
    destroy: c,
    deps: d,
    next: null
  };
  null === zh ? (zh = {
    lastEffect: null
  }, zh.lastEffect = a.next = a) : (b = zh.lastEffect, null === b ? zh.lastEffect = a.next = a : (c = b.next, b.next = a, a.next = c, zh.lastEffect = a));
  return a;
}

function Vh(a, b, c, d) {
  var e = Nh();
  Ah |= a;
  e.memoizedState = Uh(b, c, void 0, void 0 === d ? null : d);
}

function Wh(a, b, c, d) {
  var e = Oh();
  d = void 0 === d ? null : d;
  var f = void 0;

  if (null !== O$1) {
    var g = O$1.memoizedState;
    f = g.destroy;

    if (null !== d && Hh(d, g.deps)) {
      Uh(0, c, f, d);
      return;
    }
  }

  Ah |= a;
  e.memoizedState = Uh(b, c, f, d);
}

function Xh(a, b) {
  return Vh(516, 192, a, b);
}

function Yh(a, b) {
  return Wh(516, 192, a, b);
}

function Zh(a, b) {
  if ("function" === typeof b) return a = a(), b(a), function () {
    b(null);
  };
  if (null !== b && void 0 !== b) return a = a(), b.current = a, function () {
    b.current = null;
  };
}

function $h() {}

function ai(a, b) {
  Nh().memoizedState = [a, void 0 === b ? null : b];
  return a;
}

function bi(a, b) {
  var c = Oh();
  b = void 0 === b ? null : b;
  var d = c.memoizedState;
  if (null !== d && null !== b && Hh(b, d[1])) return d[0];
  c.memoizedState = [a, b];
  return a;
}

function Sh(a, b, c) {
  if (!(25 > Gh)) throw Error(u$1(301));
  var d = a.alternate;
  if (a === uh || null !== d && d === uh) {
    if (Bh = !0, a = {
      expirationTime: th,
      suspenseConfig: null,
      action: c,
      eagerReducer: null,
      eagerState: null,
      next: null
    }, null === Ch && (Ch = new Map()), c = Ch.get(b), void 0 === c) Ch.set(b, a);else {
      for (b = c; null !== b.next;) b = b.next;

      b.next = a;
    }
  } else {
    var e = Pg(),
        f = Mg.suspense;
    e = Qg(e, a, f);
    f = {
      expirationTime: e,
      suspenseConfig: f,
      action: c,
      eagerReducer: null,
      eagerState: null,
      next: null
    };
    var g = b.last;
    if (null === g) f.next = f;else {
      var h = g.next;
      null !== h && (f.next = h);
      g.next = f;
    }
    b.last = f;
    if (0 === a.expirationTime && (null === d || 0 === d.expirationTime) && (d = b.lastRenderedReducer, null !== d)) try {
      var k = b.lastRenderedState,
          l = d(k, c);
      f.eagerReducer = d;
      f.eagerState = l;
      if (of(l, k)) return;
    } catch (m) {} finally {}
    Rg(a, e);
  }
}

var Lh = {
  readContext: xg,
  useCallback: Q$1,
  useContext: Q$1,
  useEffect: Q$1,
  useImperativeHandle: Q$1,
  useLayoutEffect: Q$1,
  useMemo: Q$1,
  useReducer: Q$1,
  useRef: Q$1,
  useState: Q$1,
  useDebugValue: Q$1,
  useResponder: Q$1,
  useDeferredValue: Q$1,
  useTransition: Q$1
},
    Jh = {
  readContext: xg,
  useCallback: ai,
  useContext: xg,
  useEffect: Xh,
  useImperativeHandle: function (a, b, c) {
    c = null !== c && void 0 !== c ? c.concat([a]) : null;
    return Vh(4, 36, Zh.bind(null, b, a), c);
  },
  useLayoutEffect: function (a, b) {
    return Vh(4, 36, a, b);
  },
  useMemo: function (a, b) {
    var c = Nh();
    b = void 0 === b ? null : b;
    a = a();
    c.memoizedState = [a, b];
    return a;
  },
  useReducer: function (a, b, c) {
    var d = Nh();
    b = void 0 !== c ? c(b) : b;
    d.memoizedState = d.baseState = b;
    a = d.queue = {
      last: null,
      dispatch: null,
      lastRenderedReducer: a,
      lastRenderedState: b
    };
    a = a.dispatch = Sh.bind(null, uh, a);
    return [d.memoizedState, a];
  },
  useRef: function (a) {
    var b = Nh();
    a = {
      current: a
    };
    return b.memoizedState = a;
  },
  useState: Rh,
  useDebugValue: $h,
  useResponder: rh,
  useDeferredValue: function (a, b) {
    var c = Rh(a),
        d = c[0],
        e = c[1];
    Xh(function () {
      scheduler.unstable_next(function () {
        var c = N$1.suspense;
        N$1.suspense = void 0 === b ? null : b;

        try {
          e(a);
        } finally {
          N$1.suspense = c;
        }
      });
    }, [a, b]);
    return d;
  },
  useTransition: function (a) {
    var b = Rh(!1),
        c = b[0],
        d = b[1];
    return [ai(function (b) {
      d(!0);
      scheduler.unstable_next(function () {
        var c = N$1.suspense;
        N$1.suspense = void 0 === a ? null : a;

        try {
          d(!1), b();
        } finally {
          N$1.suspense = c;
        }
      });
    }, [a, c]), c];
  }
},
    Kh = {
  readContext: xg,
  useCallback: bi,
  useContext: xg,
  useEffect: Yh,
  useImperativeHandle: function (a, b, c) {
    c = null !== c && void 0 !== c ? c.concat([a]) : null;
    return Wh(4, 36, Zh.bind(null, b, a), c);
  },
  useLayoutEffect: function (a, b) {
    return Wh(4, 36, a, b);
  },
  useMemo: function (a, b) {
    var c = Oh();
    b = void 0 === b ? null : b;
    var d = c.memoizedState;
    if (null !== d && null !== b && Hh(b, d[1])) return d[0];
    a = a();
    c.memoizedState = [a, b];
    return a;
  },
  useReducer: Qh,
  useRef: function () {
    return Oh().memoizedState;
  },
  useState: Th,
  useDebugValue: $h,
  useResponder: rh,
  useDeferredValue: function (a, b) {
    var c = Th(),
        d = c[0],
        e = c[1];
    Yh(function () {
      scheduler.unstable_next(function () {
        var c = N$1.suspense;
        N$1.suspense = void 0 === b ? null : b;

        try {
          e(a);
        } finally {
          N$1.suspense = c;
        }
      });
    }, [a, b]);
    return d;
  },
  useTransition: function (a) {
    var b = Th(),
        c = b[0],
        d = b[1];
    return [bi(function (b) {
      d(!0);
      scheduler.unstable_next(function () {
        var c = N$1.suspense;
        N$1.suspense = void 0 === a ? null : a;

        try {
          d(!1), b();
        } finally {
          N$1.suspense = c;
        }
      });
    }, [a, c]), c];
  }
},
    ci = null,
    di = null,
    ei = !1;

function fi(a, b) {
  var c = gi(5, null, null, 0);
  c.elementType = "DELETED";
  c.type = "DELETED";
  c.stateNode = b;
  c.return = a;
  c.effectTag = 8;
  null !== a.lastEffect ? (a.lastEffect.nextEffect = c, a.lastEffect = c) : a.firstEffect = a.lastEffect = c;
}

function hi(a, b) {
  switch (a.tag) {
    case 5:
      var c = a.type;
      b = 1 !== b.nodeType || c.toLowerCase() !== b.nodeName.toLowerCase() ? null : b;
      return null !== b ? (a.stateNode = b, !0) : !1;

    case 6:
      return b = "" === a.pendingProps || 3 !== b.nodeType ? null : b, null !== b ? (a.stateNode = b, !0) : !1;

    case 13:
      return !1;

    default:
      return !1;
  }
}

function ii(a) {
  if (ei) {
    var b = di;

    if (b) {
      var c = b;

      if (!hi(a, b)) {
        b = re(c.nextSibling);

        if (!b || !hi(a, b)) {
          a.effectTag = a.effectTag & -1025 | 2;
          ei = !1;
          ci = a;
          return;
        }

        fi(ci, c);
      }

      ci = a;
      di = re(b.firstChild);
    } else a.effectTag = a.effectTag & -1025 | 2, ei = !1, ci = a;
  }
}

function ji(a) {
  for (a = a.return; null !== a && 5 !== a.tag && 3 !== a.tag && 13 !== a.tag;) a = a.return;

  ci = a;
}

function ki(a) {
  if (a !== ci) return !1;
  if (!ei) return ji(a), ei = !0, !1;
  var b = a.type;
  if (5 !== a.tag || "head" !== b && "body" !== b && !oe(b, a.memoizedProps)) for (b = di; b;) fi(a, b), b = re(b.nextSibling);
  ji(a);

  if (13 === a.tag) {
    a = a.memoizedState;
    a = null !== a ? a.dehydrated : null;
    if (!a) throw Error(u$1(317));

    a: {
      a = a.nextSibling;

      for (b = 0; a;) {
        if (8 === a.nodeType) {
          var c = a.data;

          if (c === ie) {
            if (0 === b) {
              di = re(a.nextSibling);
              break a;
            }

            b--;
          } else c !== he && c !== ke && c !== je || b++;
        }

        a = a.nextSibling;
      }

      di = null;
    }
  } else di = ci ? re(a.stateNode.nextSibling) : null;

  return !0;
}

function li() {
  di = ci = null;
  ei = !1;
}

var mi = Ea.ReactCurrentOwner,
    wg = !1;

function R$1(a, b, c, d) {
  b.child = null === a ? gh(b, null, c, d) : fh(b, a.child, c, d);
}

function ni(a, b, c, d, e) {
  c = c.render;
  var f = b.ref;
  vg(b, e);
  d = Ih(a, b, c, d, f, e);
  if (null !== a && !wg) return b.updateQueue = a.updateQueue, b.effectTag &= -517, a.expirationTime <= e && (a.expirationTime = 0), oi(a, b, e);
  b.effectTag |= 1;
  R$1(a, b, d, e);
  return b.child;
}

function pi(a, b, c, d, e, f) {
  if (null === a) {
    var g = c.type;
    if ("function" === typeof g && !qi(g) && void 0 === g.defaultProps && null === c.compare && void 0 === c.defaultProps) return b.tag = 15, b.type = g, ri(a, b, g, d, e, f);
    a = ch(c.type, null, d, null, b.mode, f);
    a.ref = b.ref;
    a.return = b;
    return b.child = a;
  }

  g = a.child;
  if (e < f && (e = g.memoizedProps, c = c.compare, c = null !== c ? c : qf, c(e, d) && a.ref === b.ref)) return oi(a, b, f);
  b.effectTag |= 1;
  a = ah(g, d);
  a.ref = b.ref;
  a.return = b;
  return b.child = a;
}

function ri(a, b, c, d, e, f) {
  return null !== a && qf(a.memoizedProps, d) && a.ref === b.ref && (wg = !1, e < f) ? oi(a, b, f) : si(a, b, c, d, f);
}

function ti(a, b) {
  var c = b.ref;
  if (null === a && null !== c || null !== a && a.ref !== c) b.effectTag |= 128;
}

function si(a, b, c, d, e) {
  var f = L$1(c) ? Df : J$1.current;
  f = Ef(b, f);
  vg(b, e);
  c = Ih(a, b, c, d, f, e);
  if (null !== a && !wg) return b.updateQueue = a.updateQueue, b.effectTag &= -517, a.expirationTime <= e && (a.expirationTime = 0), oi(a, b, e);
  b.effectTag |= 1;
  R$1(a, b, c, e);
  return b.child;
}

function ui(a, b, c, d, e) {
  if (L$1(c)) {
    var f = !0;
    Jf(b);
  } else f = !1;

  vg(b, e);
  if (null === b.stateNode) null !== a && (a.alternate = null, b.alternate = null, b.effectTag |= 2), Ug(b, c, d), Wg(b, c, d, e), d = !0;else if (null === a) {
    var g = b.stateNode,
        h = b.memoizedProps;
    g.props = h;
    var k = g.context,
        l = c.contextType;
    "object" === typeof l && null !== l ? l = xg(l) : (l = L$1(c) ? Df : J$1.current, l = Ef(b, l));
    var m = c.getDerivedStateFromProps,
        C = "function" === typeof m || "function" === typeof g.getSnapshotBeforeUpdate;
    C || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== d || k !== l) && Vg(b, g, d, l);
    yg = !1;
    var y = b.memoizedState;
    k = g.state = y;
    var H = b.updateQueue;
    null !== H && (Hg(b, H, d, g, e), k = b.memoizedState);
    h !== d || y !== k || K$1.current || yg ? ("function" === typeof m && (Og(b, c, m, d), k = b.memoizedState), (h = yg || Tg(b, c, h, d, y, k, l)) ? (C || "function" !== typeof g.UNSAFE_componentWillMount && "function" !== typeof g.componentWillMount || ("function" === typeof g.componentWillMount && g.componentWillMount(), "function" === typeof g.UNSAFE_componentWillMount && g.UNSAFE_componentWillMount()), "function" === typeof g.componentDidMount && (b.effectTag |= 4)) : ("function" === typeof g.componentDidMount && (b.effectTag |= 4), b.memoizedProps = d, b.memoizedState = k), g.props = d, g.state = k, g.context = l, d = h) : ("function" === typeof g.componentDidMount && (b.effectTag |= 4), d = !1);
  } else g = b.stateNode, h = b.memoizedProps, g.props = b.type === b.elementType ? h : mg(b.type, h), k = g.context, l = c.contextType, "object" === typeof l && null !== l ? l = xg(l) : (l = L$1(c) ? Df : J$1.current, l = Ef(b, l)), m = c.getDerivedStateFromProps, (C = "function" === typeof m || "function" === typeof g.getSnapshotBeforeUpdate) || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== d || k !== l) && Vg(b, g, d, l), yg = !1, k = b.memoizedState, y = g.state = k, H = b.updateQueue, null !== H && (Hg(b, H, d, g, e), y = b.memoizedState), h !== d || k !== y || K$1.current || yg ? ("function" === typeof m && (Og(b, c, m, d), y = b.memoizedState), (m = yg || Tg(b, c, h, d, k, y, l)) ? (C || "function" !== typeof g.UNSAFE_componentWillUpdate && "function" !== typeof g.componentWillUpdate || ("function" === typeof g.componentWillUpdate && g.componentWillUpdate(d, y, l), "function" === typeof g.UNSAFE_componentWillUpdate && g.UNSAFE_componentWillUpdate(d, y, l)), "function" === typeof g.componentDidUpdate && (b.effectTag |= 4), "function" === typeof g.getSnapshotBeforeUpdate && (b.effectTag |= 256)) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && k === a.memoizedState || (b.effectTag |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && k === a.memoizedState || (b.effectTag |= 256), b.memoizedProps = d, b.memoizedState = y), g.props = d, g.state = y, g.context = l, d = m) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && k === a.memoizedState || (b.effectTag |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && k === a.memoizedState || (b.effectTag |= 256), d = !1);
  return vi(a, b, c, d, f, e);
}

function vi(a, b, c, d, e, f) {
  ti(a, b);
  var g = 0 !== (b.effectTag & 64);
  if (!d && !g) return e && Kf(b, c, !1), oi(a, b, f);
  d = b.stateNode;
  mi.current = b;
  var h = g && "function" !== typeof c.getDerivedStateFromError ? null : d.render();
  b.effectTag |= 1;
  null !== a && g ? (b.child = fh(b, a.child, null, f), b.child = fh(b, null, h, f)) : R$1(a, b, h, f);
  b.memoizedState = d.state;
  e && Kf(b, c, !0);
  return b.child;
}

function wi(a) {
  var b = a.stateNode;
  b.pendingContext ? Hf(a, b.pendingContext, b.pendingContext !== b.context) : b.context && Hf(a, b.context, !1);
  mh(a, b.containerInfo);
}

var xi = {
  dehydrated: null,
  retryTime: 0
};

function yi(a, b, c) {
  var d = b.mode,
      e = b.pendingProps,
      f = M$1.current,
      g = !1,
      h;
  (h = 0 !== (b.effectTag & 64)) || (h = 0 !== (f & 2) && (null === a || null !== a.memoizedState));
  h ? (g = !0, b.effectTag &= -65) : null !== a && null === a.memoizedState || void 0 === e.fallback || !0 === e.unstable_avoidThisFallback || (f |= 1);
  I$1(M$1, f & 1);

  if (null === a) {
    void 0 !== e.fallback && ii(b);

    if (g) {
      g = e.fallback;
      e = eh(null, d, 0, null);
      e.return = b;
      if (0 === (b.mode & 2)) for (a = null !== b.memoizedState ? b.child.child : b.child, e.child = a; null !== a;) a.return = e, a = a.sibling;
      c = eh(g, d, c, null);
      c.return = b;
      e.sibling = c;
      b.memoizedState = xi;
      b.child = e;
      return c;
    }

    d = e.children;
    b.memoizedState = null;
    return b.child = gh(b, null, d, c);
  }

  if (null !== a.memoizedState) {
    a = a.child;
    d = a.sibling;

    if (g) {
      e = e.fallback;
      c = ah(a, a.pendingProps);
      c.return = b;
      if (0 === (b.mode & 2) && (g = null !== b.memoizedState ? b.child.child : b.child, g !== a.child)) for (c.child = g; null !== g;) g.return = c, g = g.sibling;
      d = ah(d, e, d.expirationTime);
      d.return = b;
      c.sibling = d;
      c.childExpirationTime = 0;
      b.memoizedState = xi;
      b.child = c;
      return d;
    }

    c = fh(b, a.child, e.children, c);
    b.memoizedState = null;
    return b.child = c;
  }

  a = a.child;

  if (g) {
    g = e.fallback;
    e = eh(null, d, 0, null);
    e.return = b;
    e.child = a;
    null !== a && (a.return = e);
    if (0 === (b.mode & 2)) for (a = null !== b.memoizedState ? b.child.child : b.child, e.child = a; null !== a;) a.return = e, a = a.sibling;
    c = eh(g, d, c, null);
    c.return = b;
    e.sibling = c;
    c.effectTag |= 2;
    e.childExpirationTime = 0;
    b.memoizedState = xi;
    b.child = e;
    return c;
  }

  b.memoizedState = null;
  return b.child = fh(b, a, e.children, c);
}

function zi(a, b) {
  a.expirationTime < b && (a.expirationTime = b);
  var c = a.alternate;
  null !== c && c.expirationTime < b && (c.expirationTime = b);
  ug(a.return, b);
}

function Ai(a, b, c, d, e, f) {
  var g = a.memoizedState;
  null === g ? a.memoizedState = {
    isBackwards: b,
    rendering: null,
    last: d,
    tail: c,
    tailExpiration: 0,
    tailMode: e,
    lastEffect: f
  } : (g.isBackwards = b, g.rendering = null, g.last = d, g.tail = c, g.tailExpiration = 0, g.tailMode = e, g.lastEffect = f);
}

function Bi(a, b, c) {
  var d = b.pendingProps,
      e = d.revealOrder,
      f = d.tail;
  R$1(a, b, d.children, c);
  d = M$1.current;
  if (0 !== (d & 2)) d = d & 1 | 2, b.effectTag |= 64;else {
    if (null !== a && 0 !== (a.effectTag & 64)) a: for (a = b.child; null !== a;) {
      if (13 === a.tag) null !== a.memoizedState && zi(a, c);else if (19 === a.tag) zi(a, c);else if (null !== a.child) {
        a.child.return = a;
        a = a.child;
        continue;
      }
      if (a === b) break a;

      for (; null === a.sibling;) {
        if (null === a.return || a.return === b) break a;
        a = a.return;
      }

      a.sibling.return = a.return;
      a = a.sibling;
    }
    d &= 1;
  }
  I$1(M$1, d);
  if (0 === (b.mode & 2)) b.memoizedState = null;else switch (e) {
    case "forwards":
      c = b.child;

      for (e = null; null !== c;) a = c.alternate, null !== a && null === qh(a) && (e = c), c = c.sibling;

      c = e;
      null === c ? (e = b.child, b.child = null) : (e = c.sibling, c.sibling = null);
      Ai(b, !1, e, c, f, b.lastEffect);
      break;

    case "backwards":
      c = null;
      e = b.child;

      for (b.child = null; null !== e;) {
        a = e.alternate;

        if (null !== a && null === qh(a)) {
          b.child = e;
          break;
        }

        a = e.sibling;
        e.sibling = c;
        c = e;
        e = a;
      }

      Ai(b, !0, c, null, f, b.lastEffect);
      break;

    case "together":
      Ai(b, !1, null, null, void 0, b.lastEffect);
      break;

    default:
      b.memoizedState = null;
  }
  return b.child;
}

function oi(a, b, c) {
  null !== a && (b.dependencies = a.dependencies);
  var d = b.expirationTime;
  0 !== d && Jg(d);
  if (b.childExpirationTime < c) return null;
  if (null !== a && b.child !== a.child) throw Error(u$1(153));

  if (null !== b.child) {
    a = b.child;
    c = ah(a, a.pendingProps, a.expirationTime);
    b.child = c;

    for (c.return = b; null !== a.sibling;) a = a.sibling, c = c.sibling = ah(a, a.pendingProps, a.expirationTime), c.return = b;

    c.sibling = null;
  }

  return b.child;
}

function Ci(a) {
  a.effectTag |= 4;
}

var Hi, Ii, Ji, Ki;

Hi = function (a, b) {
  for (var c = b.child; null !== c;) {
    if (5 === c.tag || 6 === c.tag) a.appendChild(c.stateNode);else if (4 !== c.tag && null !== c.child) {
      c.child.return = c;
      c = c.child;
      continue;
    }
    if (c === b) break;

    for (; null === c.sibling;) {
      if (null === c.return || c.return === b) return;
      c = c.return;
    }

    c.sibling.return = c.return;
    c = c.sibling;
  }
};

Ii = function () {};

Ji = function (a, b, c, d, e) {
  var f = a.memoizedProps;

  if (f !== d) {
    var g = b.stateNode;
    lh(ih.current);
    a = null;

    switch (c) {
      case "input":
        f = Ab(g, f);
        d = Ab(g, d);
        a = [];
        break;

      case "option":
        f = Ib(g, f);
        d = Ib(g, d);
        a = [];
        break;

      case "select":
        f = objectAssign({}, f, {
          value: void 0
        });
        d = objectAssign({}, d, {
          value: void 0
        });
        a = [];
        break;

      case "textarea":
        f = Kb(g, f);
        d = Kb(g, d);
        a = [];
        break;

      default:
        "function" !== typeof f.onClick && "function" === typeof d.onClick && (g.onclick = ae);
    }

    Yd(c, d);
    var h, k;
    c = null;

    for (h in f) if (!d.hasOwnProperty(h) && f.hasOwnProperty(h) && null != f[h]) if ("style" === h) for (k in g = f[h], g) g.hasOwnProperty(k) && (c || (c = {}), c[k] = "");else "dangerouslySetInnerHTML" !== h && "children" !== h && "suppressContentEditableWarning" !== h && "suppressHydrationWarning" !== h && "autoFocus" !== h && (ia.hasOwnProperty(h) ? a || (a = []) : (a = a || []).push(h, null));

    for (h in d) {
      var l = d[h];
      g = null != f ? f[h] : void 0;
      if (d.hasOwnProperty(h) && l !== g && (null != l || null != g)) if ("style" === h) {
        if (g) {
          for (k in g) !g.hasOwnProperty(k) || l && l.hasOwnProperty(k) || (c || (c = {}), c[k] = "");

          for (k in l) l.hasOwnProperty(k) && g[k] !== l[k] && (c || (c = {}), c[k] = l[k]);
        } else c || (a || (a = []), a.push(h, c)), c = l;
      } else "dangerouslySetInnerHTML" === h ? (l = l ? l.__html : void 0, g = g ? g.__html : void 0, null != l && g !== l && (a = a || []).push(h, "" + l)) : "children" === h ? g === l || "string" !== typeof l && "number" !== typeof l || (a = a || []).push(h, "" + l) : "suppressContentEditableWarning" !== h && "suppressHydrationWarning" !== h && (ia.hasOwnProperty(h) ? (null != l && $d(e, h), a || g === l || (a = [])) : (a = a || []).push(h, l));
    }

    c && (a = a || []).push("style", c);
    e = a;
    (b.updateQueue = e) && Ci(b);
  }
};

Ki = function (a, b, c, d) {
  c !== d && Ci(b);
};

function Li(a, b) {
  switch (a.tailMode) {
    case "hidden":
      b = a.tail;

      for (var c = null; null !== b;) null !== b.alternate && (c = b), b = b.sibling;

      null === c ? a.tail = null : c.sibling = null;
      break;

    case "collapsed":
      c = a.tail;

      for (var d = null; null !== c;) null !== c.alternate && (d = c), c = c.sibling;

      null === d ? b || null === a.tail ? a.tail = null : a.tail.sibling = null : d.sibling = null;
  }
}

function Mi(a) {
  switch (a.tag) {
    case 1:
      L$1(a.type) && Ff();
      var b = a.effectTag;
      return b & 4096 ? (a.effectTag = b & -4097 | 64, a) : null;

    case 3:
      nh();
      Gf();
      b = a.effectTag;
      if (0 !== (b & 64)) throw Error(u$1(285));
      a.effectTag = b & -4097 | 64;
      return a;

    case 5:
      return ph(a), null;

    case 13:
      return G$1(M$1), b = a.effectTag, b & 4096 ? (a.effectTag = b & -4097 | 64, a) : null;

    case 19:
      return G$1(M$1), null;

    case 4:
      return nh(), null;

    case 10:
      return tg(a), null;

    default:
      return null;
  }
}

function Ni(a, b) {
  return {
    value: a,
    source: b,
    stack: Xa(b)
  };
}

var Oi = "function" === typeof WeakSet ? WeakSet : Set;

function Pi(a, b) {
  var c = b.source,
      d = b.stack;
  null === d && null !== c && (d = Xa(c));
  null !== c && Wa(c.type);
  b = b.value;
  null !== a && 1 === a.tag && Wa(a.type);

  try {
    console.error(b);
  } catch (e) {
    setTimeout(function () {
      throw e;
    });
  }
}

function Qi(a, b) {
  try {
    b.props = a.memoizedProps, b.state = a.memoizedState, b.componentWillUnmount();
  } catch (c) {
    Ri(a, c);
  }
}

function Si(a) {
  var b = a.ref;
  if (null !== b) if ("function" === typeof b) try {
    b(null);
  } catch (c) {
    Ri(a, c);
  } else b.current = null;
}

function Ti(a, b) {
  switch (b.tag) {
    case 0:
    case 11:
    case 15:
      Ui(2, 0, b);
      break;

    case 1:
      if (b.effectTag & 256 && null !== a) {
        var c = a.memoizedProps,
            d = a.memoizedState;
        a = b.stateNode;
        b = a.getSnapshotBeforeUpdate(b.elementType === b.type ? c : mg(b.type, c), d);
        a.__reactInternalSnapshotBeforeUpdate = b;
      }

      break;

    case 3:
    case 5:
    case 6:
    case 4:
    case 17:
      break;

    default:
      throw Error(u$1(163));
  }
}

function Ui(a, b, c) {
  c = c.updateQueue;
  c = null !== c ? c.lastEffect : null;

  if (null !== c) {
    var d = c = c.next;

    do {
      if (0 !== (d.tag & a)) {
        var e = d.destroy;
        d.destroy = void 0;
        void 0 !== e && e();
      }

      0 !== (d.tag & b) && (e = d.create, d.destroy = e());
      d = d.next;
    } while (d !== c);
  }
}

function Vi(a, b, c) {
  "function" === typeof Wi && Wi(b);

  switch (b.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      a = b.updateQueue;

      if (null !== a && (a = a.lastEffect, null !== a)) {
        var d = a.next;
        fg(97 < c ? 97 : c, function () {
          var a = d;

          do {
            var c = a.destroy;

            if (void 0 !== c) {
              var g = b;

              try {
                c();
              } catch (h) {
                Ri(g, h);
              }
            }

            a = a.next;
          } while (a !== d);
        });
      }

      break;

    case 1:
      Si(b);
      c = b.stateNode;
      "function" === typeof c.componentWillUnmount && Qi(b, c);
      break;

    case 5:
      Si(b);
      break;

    case 4:
      Xi(a, b, c);
  }
}

function Yi(a) {
  var b = a.alternate;
  a.return = null;
  a.child = null;
  a.memoizedState = null;
  a.updateQueue = null;
  a.dependencies = null;
  a.alternate = null;
  a.firstEffect = null;
  a.lastEffect = null;
  a.pendingProps = null;
  a.memoizedProps = null;
  null !== b && Yi(b);
}

function Zi(a) {
  return 5 === a.tag || 3 === a.tag || 4 === a.tag;
}

function $i(a) {
  a: {
    for (var b = a.return; null !== b;) {
      if (Zi(b)) {
        var c = b;
        break a;
      }

      b = b.return;
    }

    throw Error(u$1(160));
  }

  b = c.stateNode;

  switch (c.tag) {
    case 5:
      var d = !1;
      break;

    case 3:
      b = b.containerInfo;
      d = !0;
      break;

    case 4:
      b = b.containerInfo;
      d = !0;
      break;

    default:
      throw Error(u$1(161));
  }

  c.effectTag & 16 && (Tb(b, ""), c.effectTag &= -17);

  a: b: for (c = a;;) {
    for (; null === c.sibling;) {
      if (null === c.return || Zi(c.return)) {
        c = null;
        break a;
      }

      c = c.return;
    }

    c.sibling.return = c.return;

    for (c = c.sibling; 5 !== c.tag && 6 !== c.tag && 18 !== c.tag;) {
      if (c.effectTag & 2) continue b;
      if (null === c.child || 4 === c.tag) continue b;else c.child.return = c, c = c.child;
    }

    if (!(c.effectTag & 2)) {
      c = c.stateNode;
      break a;
    }
  }

  for (var e = a;;) {
    var f = 5 === e.tag || 6 === e.tag;

    if (f) {
      var g = f ? e.stateNode : e.stateNode.instance;
      if (c) {
        if (d) {
          f = b;
          var h = g;
          g = c;
          8 === f.nodeType ? f.parentNode.insertBefore(h, g) : f.insertBefore(h, g);
        } else b.insertBefore(g, c);
      } else d ? (h = b, 8 === h.nodeType ? (f = h.parentNode, f.insertBefore(g, h)) : (f = h, f.appendChild(g)), h = h._reactRootContainer, null !== h && void 0 !== h || null !== f.onclick || (f.onclick = ae)) : b.appendChild(g);
    } else if (4 !== e.tag && null !== e.child) {
      e.child.return = e;
      e = e.child;
      continue;
    }

    if (e === a) break;

    for (; null === e.sibling;) {
      if (null === e.return || e.return === a) return;
      e = e.return;
    }

    e.sibling.return = e.return;
    e = e.sibling;
  }
}

function Xi(a, b, c) {
  for (var d = b, e = !1, f, g;;) {
    if (!e) {
      e = d.return;

      a: for (;;) {
        if (null === e) throw Error(u$1(160));
        f = e.stateNode;

        switch (e.tag) {
          case 5:
            g = !1;
            break a;

          case 3:
            f = f.containerInfo;
            g = !0;
            break a;

          case 4:
            f = f.containerInfo;
            g = !0;
            break a;
        }

        e = e.return;
      }

      e = !0;
    }

    if (5 === d.tag || 6 === d.tag) {
      a: for (var h = a, k = d, l = c, m = k;;) if (Vi(h, m, l), null !== m.child && 4 !== m.tag) m.child.return = m, m = m.child;else {
        if (m === k) break;

        for (; null === m.sibling;) {
          if (null === m.return || m.return === k) break a;
          m = m.return;
        }

        m.sibling.return = m.return;
        m = m.sibling;
      }

      g ? (h = f, k = d.stateNode, 8 === h.nodeType ? h.parentNode.removeChild(k) : h.removeChild(k)) : f.removeChild(d.stateNode);
    } else if (4 === d.tag) {
      if (null !== d.child) {
        f = d.stateNode.containerInfo;
        g = !0;
        d.child.return = d;
        d = d.child;
        continue;
      }
    } else if (Vi(a, d, c), null !== d.child) {
      d.child.return = d;
      d = d.child;
      continue;
    }

    if (d === b) break;

    for (; null === d.sibling;) {
      if (null === d.return || d.return === b) return;
      d = d.return;
      4 === d.tag && (e = !1);
    }

    d.sibling.return = d.return;
    d = d.sibling;
  }
}

function aj(a, b) {
  switch (b.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      Ui(4, 8, b);
      break;

    case 1:
      break;

    case 5:
      var c = b.stateNode;

      if (null != c) {
        var d = b.memoizedProps,
            e = null !== a ? a.memoizedProps : d;
        a = b.type;
        var f = b.updateQueue;
        b.updateQueue = null;

        if (null !== f) {
          c[ve] = d;
          "input" === a && "radio" === d.type && null != d.name && Cb(c, d);
          Zd(a, e);
          b = Zd(a, d);

          for (e = 0; e < f.length; e += 2) {
            var g = f[e],
                h = f[e + 1];
            "style" === g ? Wd(c, h) : "dangerouslySetInnerHTML" === g ? Sb(c, h) : "children" === g ? Tb(c, h) : vb(c, g, h, b);
          }

          switch (a) {
            case "input":
              Eb(c, d);
              break;

            case "textarea":
              Mb(c, d);
              break;

            case "select":
              b = c._wrapperState.wasMultiple, c._wrapperState.wasMultiple = !!d.multiple, a = d.value, null != a ? Jb(c, !!d.multiple, a, !1) : b !== !!d.multiple && (null != d.defaultValue ? Jb(c, !!d.multiple, d.defaultValue, !0) : Jb(c, !!d.multiple, d.multiple ? [] : "", !1));
          }
        }
      }

      break;

    case 6:
      if (null === b.stateNode) throw Error(u$1(162));
      b.stateNode.nodeValue = b.memoizedProps;
      break;

    case 3:
      b = b.stateNode;
      b.hydrate && (b.hydrate = !1, Lc(b.containerInfo));
      break;

    case 12:
      break;

    case 13:
      c = b;
      null === b.memoizedState ? d = !1 : (d = !0, c = b.child, bj = cg());
      if (null !== c) a: for (a = c;;) {
        if (5 === a.tag) f = a.stateNode, d ? (f = f.style, "function" === typeof f.setProperty ? f.setProperty("display", "none", "important") : f.display = "none") : (f = a.stateNode, e = a.memoizedProps.style, e = void 0 !== e && null !== e && e.hasOwnProperty("display") ? e.display : null, f.style.display = Vd("display", e));else if (6 === a.tag) a.stateNode.nodeValue = d ? "" : a.memoizedProps;else if (13 === a.tag && null !== a.memoizedState && null === a.memoizedState.dehydrated) {
          f = a.child.sibling;
          f.return = a;
          a = f;
          continue;
        } else if (null !== a.child) {
          a.child.return = a;
          a = a.child;
          continue;
        }
        if (a === c) break a;

        for (; null === a.sibling;) {
          if (null === a.return || a.return === c) break a;
          a = a.return;
        }

        a.sibling.return = a.return;
        a = a.sibling;
      }
      cj(b);
      break;

    case 19:
      cj(b);
      break;

    case 17:
      break;

    case 20:
      break;

    case 21:
      break;

    default:
      throw Error(u$1(163));
  }
}

function cj(a) {
  var b = a.updateQueue;

  if (null !== b) {
    a.updateQueue = null;
    var c = a.stateNode;
    null === c && (c = a.stateNode = new Oi());
    b.forEach(function (b) {
      var d = dj.bind(null, a, b);
      c.has(b) || (c.add(b), b.then(d, d));
    });
  }
}

var ej = "function" === typeof WeakMap ? WeakMap : Map;

function fj(a, b, c) {
  c = Bg(c, null);
  c.tag = 3;
  c.payload = {
    element: null
  };
  var d = b.value;

  c.callback = function () {
    gj || (gj = !0, hj = d);
    Pi(a, b);
  };

  return c;
}

function ij(a, b, c) {
  c = Bg(c, null);
  c.tag = 3;
  var d = a.type.getDerivedStateFromError;

  if ("function" === typeof d) {
    var e = b.value;

    c.payload = function () {
      Pi(a, b);
      return d(e);
    };
  }

  var f = a.stateNode;
  null !== f && "function" === typeof f.componentDidCatch && (c.callback = function () {
    "function" !== typeof d && (null === jj ? jj = new Set([this]) : jj.add(this), Pi(a, b));
    var c = b.stack;
    this.componentDidCatch(b.value, {
      componentStack: null !== c ? c : ""
    });
  });
  return c;
}

var kj = Math.ceil,
    lj = Ea.ReactCurrentDispatcher,
    mj = Ea.ReactCurrentOwner,
    S$1 = 0,
    nj = 8,
    oj = 16,
    pj = 32,
    qj = 0,
    rj = 1,
    sj = 2,
    tj = 3,
    uj = 4,
    vj = 5,
    T$1 = S$1,
    U$1 = null,
    V$1 = null,
    W$1 = 0,
    X$1 = qj,
    wj = null,
    xj = 1073741823,
    yj = 1073741823,
    zj = null,
    Aj = 0,
    Bj = !1,
    bj = 0,
    Cj = 500,
    Y$1 = null,
    gj = !1,
    hj = null,
    jj = null,
    Dj = !1,
    Ej = null,
    Fj = 90,
    Gj = null,
    Hj = 0,
    Ij = null,
    Jj = 0;

function Pg() {
  return (T$1 & (oj | pj)) !== S$1 ? 1073741821 - (cg() / 10 | 0) : 0 !== Jj ? Jj : Jj = 1073741821 - (cg() / 10 | 0);
}

function Qg(a, b, c) {
  b = b.mode;
  if (0 === (b & 2)) return 1073741823;
  var d = dg();
  if (0 === (b & 4)) return 99 === d ? 1073741823 : 1073741822;
  if ((T$1 & oj) !== S$1) return W$1;
  if (null !== c) a = lg(a, c.timeoutMs | 0 || 5E3, 250);else switch (d) {
    case 99:
      a = 1073741823;
      break;

    case 98:
      a = lg(a, 150, 100);
      break;

    case 97:
    case 96:
      a = lg(a, 5E3, 250);
      break;

    case 95:
      a = 2;
      break;

    default:
      throw Error(u$1(326));
  }
  null !== U$1 && a === W$1 && --a;
  return a;
}

function Rg(a, b) {
  if (50 < Hj) throw Hj = 0, Ij = null, Error(u$1(185));
  a = Kj(a, b);

  if (null !== a) {
    var c = dg();
    1073741823 === b ? (T$1 & nj) !== S$1 && (T$1 & (oj | pj)) === S$1 ? Lj(a) : (Z$1(a), T$1 === S$1 && jg()) : Z$1(a);
    (T$1 & 4) === S$1 || 98 !== c && 99 !== c || (null === Gj ? Gj = new Map([[a, b]]) : (c = Gj.get(a), (void 0 === c || c > b) && Gj.set(a, b)));
  }
}

function Kj(a, b) {
  a.expirationTime < b && (a.expirationTime = b);
  var c = a.alternate;
  null !== c && c.expirationTime < b && (c.expirationTime = b);
  var d = a.return,
      e = null;
  if (null === d && 3 === a.tag) e = a.stateNode;else for (; null !== d;) {
    c = d.alternate;
    d.childExpirationTime < b && (d.childExpirationTime = b);
    null !== c && c.childExpirationTime < b && (c.childExpirationTime = b);

    if (null === d.return && 3 === d.tag) {
      e = d.stateNode;
      break;
    }

    d = d.return;
  }
  null !== e && (U$1 === e && (Jg(b), X$1 === uj && Mj(e, W$1)), Nj(e, b));
  return e;
}

function Oj(a) {
  var b = a.lastExpiredTime;
  if (0 !== b) return b;
  b = a.firstPendingTime;
  if (!Pj(a, b)) return b;
  b = a.lastPingedTime;
  a = a.nextKnownPendingLevel;
  return b > a ? b : a;
}

function Z$1(a) {
  if (0 !== a.lastExpiredTime) a.callbackExpirationTime = 1073741823, a.callbackPriority = 99, a.callbackNode = hg(Lj.bind(null, a));else {
    var b = Oj(a),
        c = a.callbackNode;
    if (0 === b) null !== c && (a.callbackNode = null, a.callbackExpirationTime = 0, a.callbackPriority = 90);else {
      var d = Pg();
      1073741823 === b ? d = 99 : 1 === b || 2 === b ? d = 95 : (d = 10 * (1073741821 - b) - 10 * (1073741821 - d), d = 0 >= d ? 99 : 250 >= d ? 98 : 5250 >= d ? 97 : 95);

      if (null !== c) {
        var e = a.callbackPriority;
        if (a.callbackExpirationTime === b && e >= d) return;
        c !== Xf && Nf(c);
      }

      a.callbackExpirationTime = b;
      a.callbackPriority = d;
      b = 1073741823 === b ? hg(Lj.bind(null, a)) : gg(d, Qj.bind(null, a), {
        timeout: 10 * (1073741821 - b) - cg()
      });
      a.callbackNode = b;
    }
  }
}

function Qj(a, b) {
  Jj = 0;
  if (b) return b = Pg(), Rj(a, b), Z$1(a), null;
  var c = Oj(a);

  if (0 !== c) {
    b = a.callbackNode;
    if ((T$1 & (oj | pj)) !== S$1) throw Error(u$1(327));
    Sj();
    a === U$1 && c === W$1 || Tj(a, c);

    if (null !== V$1) {
      var d = T$1;
      T$1 |= oj;
      var e = Uj();

      do try {
        Vj();
        break;
      } catch (h) {
        Wj(a, h);
      } while (1);

      rg();
      T$1 = d;
      lj.current = e;
      if (X$1 === rj) throw b = wj, Tj(a, c), Mj(a, c), Z$1(a), b;
      if (null === V$1) switch (e = a.finishedWork = a.current.alternate, a.finishedExpirationTime = c, d = X$1, U$1 = null, d) {
        case qj:
        case rj:
          throw Error(u$1(345));

        case sj:
          Rj(a, 2 < c ? 2 : c);
          break;

        case tj:
          Mj(a, c);
          d = a.lastSuspendedTime;
          c === d && (a.nextKnownPendingLevel = Xj(e));

          if (1073741823 === xj && (e = bj + Cj - cg(), 10 < e)) {
            if (Bj) {
              var f = a.lastPingedTime;

              if (0 === f || f >= c) {
                a.lastPingedTime = c;
                Tj(a, c);
                break;
              }
            }

            f = Oj(a);
            if (0 !== f && f !== c) break;

            if (0 !== d && d !== c) {
              a.lastPingedTime = d;
              break;
            }

            a.timeoutHandle = pe(Yj.bind(null, a), e);
            break;
          }

          Yj(a);
          break;

        case uj:
          Mj(a, c);
          d = a.lastSuspendedTime;
          c === d && (a.nextKnownPendingLevel = Xj(e));

          if (Bj && (e = a.lastPingedTime, 0 === e || e >= c)) {
            a.lastPingedTime = c;
            Tj(a, c);
            break;
          }

          e = Oj(a);
          if (0 !== e && e !== c) break;

          if (0 !== d && d !== c) {
            a.lastPingedTime = d;
            break;
          }

          1073741823 !== yj ? d = 10 * (1073741821 - yj) - cg() : 1073741823 === xj ? d = 0 : (d = 10 * (1073741821 - xj) - 5E3, e = cg(), c = 10 * (1073741821 - c) - e, d = e - d, 0 > d && (d = 0), d = (120 > d ? 120 : 480 > d ? 480 : 1080 > d ? 1080 : 1920 > d ? 1920 : 3E3 > d ? 3E3 : 4320 > d ? 4320 : 1960 * kj(d / 1960)) - d, c < d && (d = c));

          if (10 < d) {
            a.timeoutHandle = pe(Yj.bind(null, a), d);
            break;
          }

          Yj(a);
          break;

        case vj:
          if (1073741823 !== xj && null !== zj) {
            f = xj;
            var g = zj;
            d = g.busyMinDurationMs | 0;
            0 >= d ? d = 0 : (e = g.busyDelayMs | 0, f = cg() - (10 * (1073741821 - f) - (g.timeoutMs | 0 || 5E3)), d = f <= e ? 0 : e + d - f);

            if (10 < d) {
              Mj(a, c);
              a.timeoutHandle = pe(Yj.bind(null, a), d);
              break;
            }
          }

          Yj(a);
          break;

        default:
          throw Error(u$1(329));
      }
      Z$1(a);
      if (a.callbackNode === b) return Qj.bind(null, a);
    }
  }

  return null;
}

function Lj(a) {
  var b = a.lastExpiredTime;
  b = 0 !== b ? b : 1073741823;
  if (a.finishedExpirationTime === b) Yj(a);else {
    if ((T$1 & (oj | pj)) !== S$1) throw Error(u$1(327));
    Sj();
    a === U$1 && b === W$1 || Tj(a, b);

    if (null !== V$1) {
      var c = T$1;
      T$1 |= oj;
      var d = Uj();

      do try {
        Zj();
        break;
      } catch (e) {
        Wj(a, e);
      } while (1);

      rg();
      T$1 = c;
      lj.current = d;
      if (X$1 === rj) throw c = wj, Tj(a, b), Mj(a, b), Z$1(a), c;
      if (null !== V$1) throw Error(u$1(261));
      a.finishedWork = a.current.alternate;
      a.finishedExpirationTime = b;
      U$1 = null;
      Yj(a);
      Z$1(a);
    }
  }
  return null;
}

function ak() {
  if (null !== Gj) {
    var a = Gj;
    Gj = null;
    a.forEach(function (a, c) {
      Rj(c, a);
      Z$1(c);
    });
    jg();
  }
}

function bk(a, b) {
  var c = T$1;
  T$1 |= 1;

  try {
    return a(b);
  } finally {
    T$1 = c, T$1 === S$1 && jg();
  }
}

function ck(a, b) {
  var c = T$1;
  T$1 &= -2;
  T$1 |= nj;

  try {
    return a(b);
  } finally {
    T$1 = c, T$1 === S$1 && jg();
  }
}

function Tj(a, b) {
  a.finishedWork = null;
  a.finishedExpirationTime = 0;
  var c = a.timeoutHandle;
  -1 !== c && (a.timeoutHandle = -1, qe(c));
  if (null !== V$1) for (c = V$1.return; null !== c;) {
    var d = c;

    switch (d.tag) {
      case 1:
        var e = d.type.childContextTypes;
        null !== e && void 0 !== e && Ff();
        break;

      case 3:
        nh();
        Gf();
        break;

      case 5:
        ph(d);
        break;

      case 4:
        nh();
        break;

      case 13:
        G$1(M$1);
        break;

      case 19:
        G$1(M$1);
        break;

      case 10:
        tg(d);
    }

    c = c.return;
  }
  U$1 = a;
  V$1 = ah(a.current, null);
  W$1 = b;
  X$1 = qj;
  wj = null;
  yj = xj = 1073741823;
  zj = null;
  Aj = 0;
  Bj = !1;
}

function Wj(a, b) {
  do {
    try {
      rg();
      Mh();
      if (null === V$1 || null === V$1.return) return X$1 = rj, wj = b, null;

      a: {
        var c = a,
            d = V$1.return,
            e = V$1,
            f = b;
        b = W$1;
        e.effectTag |= 2048;
        e.firstEffect = e.lastEffect = null;

        if (null !== f && "object" === typeof f && "function" === typeof f.then) {
          var g = f,
              h = 0 !== (M$1.current & 1),
              k = d;

          do {
            var l;

            if (l = 13 === k.tag) {
              var m = k.memoizedState;
              if (null !== m) l = null !== m.dehydrated ? !0 : !1;else {
                var C = k.memoizedProps;
                l = void 0 === C.fallback ? !1 : !0 !== C.unstable_avoidThisFallback ? !0 : h ? !1 : !0;
              }
            }

            if (l) {
              var y = k.updateQueue;

              if (null === y) {
                var H = new Set();
                H.add(g);
                k.updateQueue = H;
              } else y.add(g);

              if (0 === (k.mode & 2)) {
                k.effectTag |= 64;
                e.effectTag &= -2981;
                if (1 === e.tag) if (null === e.alternate) e.tag = 17;else {
                  var z = Bg(1073741823, null);
                  z.tag = 2;
                  Dg(e, z);
                }
                e.expirationTime = 1073741823;
                break a;
              }

              f = void 0;
              e = b;
              var ta = c.pingCache;
              null === ta ? (ta = c.pingCache = new ej(), f = new Set(), ta.set(g, f)) : (f = ta.get(g), void 0 === f && (f = new Set(), ta.set(g, f)));

              if (!f.has(e)) {
                f.add(e);
                var r = dk.bind(null, c, g, e);
                g.then(r, r);
              }

              k.effectTag |= 4096;
              k.expirationTime = b;
              break a;
            }

            k = k.return;
          } while (null !== k);

          f = Error((Wa(e.type) || "A React component") + " suspended while rendering, but no fallback UI was specified.\n\nAdd a <Suspense fallback=...> component higher in the tree to provide a loading indicator or placeholder to display." + Xa(e));
        }

        X$1 !== vj && (X$1 = sj);
        f = Ni(f, e);
        k = d;

        do {
          switch (k.tag) {
            case 3:
              g = f;
              k.effectTag |= 4096;
              k.expirationTime = b;
              var x = fj(k, g, b);
              Eg(k, x);
              break a;

            case 1:
              g = f;
              var A = k.type,
                  p = k.stateNode;

              if (0 === (k.effectTag & 64) && ("function" === typeof A.getDerivedStateFromError || null !== p && "function" === typeof p.componentDidCatch && (null === jj || !jj.has(p)))) {
                k.effectTag |= 4096;
                k.expirationTime = b;
                var t = ij(k, g, b);
                Eg(k, t);
                break a;
              }

          }

          k = k.return;
        } while (null !== k);
      }

      V$1 = ek(V$1);
    } catch (v) {
      b = v;
      continue;
    }

    break;
  } while (1);
}

function Uj() {
  var a = lj.current;
  lj.current = Lh;
  return null === a ? Lh : a;
}

function Ig(a, b) {
  a < xj && 2 < a && (xj = a);
  null !== b && a < yj && 2 < a && (yj = a, zj = b);
}

function Jg(a) {
  a > Aj && (Aj = a);
}

function Zj() {
  for (; null !== V$1;) V$1 = fk(V$1);
}

function Vj() {
  for (; null !== V$1 && !Of();) V$1 = fk(V$1);
}

function fk(a) {
  var b = gk(a.alternate, a, W$1);
  a.memoizedProps = a.pendingProps;
  null === b && (b = ek(a));
  mj.current = null;
  return b;
}

function ek(a) {
  V$1 = a;

  do {
    var b = V$1.alternate;
    a = V$1.return;

    if (0 === (V$1.effectTag & 2048)) {
      a: {
        var c = b;
        b = V$1;
        var d = W$1;
        var e = b.pendingProps;

        switch (b.tag) {
          case 2:
            break;

          case 16:
            break;

          case 15:
          case 0:
            break;

          case 1:
            L$1(b.type) && Ff();
            break;

          case 3:
            nh();
            Gf();
            e = b.stateNode;
            e.pendingContext && (e.context = e.pendingContext, e.pendingContext = null);
            (null === c || null === c.child) && ki(b) && Ci(b);
            Ii(b);
            break;

          case 5:
            ph(b);
            d = lh(kh.current);
            var f = b.type;
            if (null !== c && null != b.stateNode) Ji(c, b, f, e, d), c.ref !== b.ref && (b.effectTag |= 128);else if (e) {
              var g = lh(ih.current);

              if (ki(b)) {
                e = b;
                var h = e.stateNode;
                c = e.type;
                var k = e.memoizedProps,
                    l = d;
                h[ue] = e;
                h[ve] = k;
                f = void 0;
                d = h;

                switch (c) {
                  case "iframe":
                  case "object":
                  case "embed":
                    F$1("load", d);
                    break;

                  case "video":
                  case "audio":
                    for (h = 0; h < cc.length; h++) F$1(cc[h], d);

                    break;

                  case "source":
                    F$1("error", d);
                    break;

                  case "img":
                  case "image":
                  case "link":
                    F$1("error", d);
                    F$1("load", d);
                    break;

                  case "form":
                    F$1("reset", d);
                    F$1("submit", d);
                    break;

                  case "details":
                    F$1("toggle", d);
                    break;

                  case "input":
                    Bb(d, k);
                    F$1("invalid", d);
                    $d(l, "onChange");
                    break;

                  case "select":
                    d._wrapperState = {
                      wasMultiple: !!k.multiple
                    };
                    F$1("invalid", d);
                    $d(l, "onChange");
                    break;

                  case "textarea":
                    Lb(d, k), F$1("invalid", d), $d(l, "onChange");
                }

                Yd(c, k);
                h = null;

                for (f in k) k.hasOwnProperty(f) && (g = k[f], "children" === f ? "string" === typeof g ? d.textContent !== g && (h = ["children", g]) : "number" === typeof g && d.textContent !== "" + g && (h = ["children", "" + g]) : ia.hasOwnProperty(f) && null != g && $d(l, f));

                switch (c) {
                  case "input":
                    yb(d);
                    Gb(d, k, !0);
                    break;

                  case "textarea":
                    yb(d);
                    Nb(d);
                    break;

                  case "select":
                  case "option":
                    break;

                  default:
                    "function" === typeof k.onClick && (d.onclick = ae);
                }

                f = h;
                e.updateQueue = f;
                e = null !== f ? !0 : !1;
                e && Ci(b);
              } else {
                c = b;
                l = f;
                k = e;
                h = 9 === d.nodeType ? d : d.ownerDocument;
                g === Ob.html && (g = Pb(l));
                g === Ob.html ? "script" === l ? (k = h.createElement("div"), k.innerHTML = "<script>\x3c/script>", h = k.removeChild(k.firstChild)) : "string" === typeof k.is ? h = h.createElement(l, {
                  is: k.is
                }) : (h = h.createElement(l), "select" === l && (l = h, k.multiple ? l.multiple = !0 : k.size && (l.size = k.size))) : h = h.createElementNS(g, l);
                k = h;
                k[ue] = c;
                k[ve] = e;
                Hi(k, b, !1, !1);
                b.stateNode = k;
                l = f;
                c = e;
                var m = d,
                    C = Zd(l, c);

                switch (l) {
                  case "iframe":
                  case "object":
                  case "embed":
                    F$1("load", k);
                    d = c;
                    break;

                  case "video":
                  case "audio":
                    for (d = 0; d < cc.length; d++) F$1(cc[d], k);

                    d = c;
                    break;

                  case "source":
                    F$1("error", k);
                    d = c;
                    break;

                  case "img":
                  case "image":
                  case "link":
                    F$1("error", k);
                    F$1("load", k);
                    d = c;
                    break;

                  case "form":
                    F$1("reset", k);
                    F$1("submit", k);
                    d = c;
                    break;

                  case "details":
                    F$1("toggle", k);
                    d = c;
                    break;

                  case "input":
                    Bb(k, c);
                    d = Ab(k, c);
                    F$1("invalid", k);
                    $d(m, "onChange");
                    break;

                  case "option":
                    d = Ib(k, c);
                    break;

                  case "select":
                    k._wrapperState = {
                      wasMultiple: !!c.multiple
                    };
                    d = objectAssign({}, c, {
                      value: void 0
                    });
                    F$1("invalid", k);
                    $d(m, "onChange");
                    break;

                  case "textarea":
                    Lb(k, c);
                    d = Kb(k, c);
                    F$1("invalid", k);
                    $d(m, "onChange");
                    break;

                  default:
                    d = c;
                }

                Yd(l, d);
                h = void 0;
                g = l;
                var y = k,
                    H = d;

                for (h in H) if (H.hasOwnProperty(h)) {
                  var z = H[h];
                  "style" === h ? Wd(y, z) : "dangerouslySetInnerHTML" === h ? (z = z ? z.__html : void 0, null != z && Sb(y, z)) : "children" === h ? "string" === typeof z ? ("textarea" !== g || "" !== z) && Tb(y, z) : "number" === typeof z && Tb(y, "" + z) : "suppressContentEditableWarning" !== h && "suppressHydrationWarning" !== h && "autoFocus" !== h && (ia.hasOwnProperty(h) ? null != z && $d(m, h) : null != z && vb(y, h, z, C));
                }

                switch (l) {
                  case "input":
                    yb(k);
                    Gb(k, c, !1);
                    break;

                  case "textarea":
                    yb(k);
                    Nb(k);
                    break;

                  case "option":
                    null != c.value && k.setAttribute("value", "" + ub(c.value));
                    break;

                  case "select":
                    d = k;
                    d.multiple = !!c.multiple;
                    k = c.value;
                    null != k ? Jb(d, !!c.multiple, k, !1) : null != c.defaultValue && Jb(d, !!c.multiple, c.defaultValue, !0);
                    break;

                  default:
                    "function" === typeof d.onClick && (k.onclick = ae);
                }

                (e = ne(f, e)) && Ci(b);
              }

              null !== b.ref && (b.effectTag |= 128);
            } else if (null === b.stateNode) throw Error(u$1(166));
            break;

          case 6:
            if (c && null != b.stateNode) Ki(c, b, c.memoizedProps, e);else {
              if ("string" !== typeof e && null === b.stateNode) throw Error(u$1(166));
              d = lh(kh.current);
              lh(ih.current);
              ki(b) ? (e = b, f = e.stateNode, d = e.memoizedProps, f[ue] = e, (e = f.nodeValue !== d) && Ci(b)) : (f = b, e = (9 === d.nodeType ? d : d.ownerDocument).createTextNode(e), e[ue] = f, b.stateNode = e);
            }
            break;

          case 11:
            break;

          case 13:
            G$1(M$1);
            e = b.memoizedState;

            if (0 !== (b.effectTag & 64)) {
              b.expirationTime = d;
              break a;
            }

            e = null !== e;
            f = !1;
            null === c ? void 0 !== b.memoizedProps.fallback && ki(b) : (d = c.memoizedState, f = null !== d, e || null === d || (d = c.child.sibling, null !== d && (k = b.firstEffect, null !== k ? (b.firstEffect = d, d.nextEffect = k) : (b.firstEffect = b.lastEffect = d, d.nextEffect = null), d.effectTag = 8)));
            if (e && !f && 0 !== (b.mode & 2)) if (null === c && !0 !== b.memoizedProps.unstable_avoidThisFallback || 0 !== (M$1.current & 1)) X$1 === qj && (X$1 = tj);else {
              if (X$1 === qj || X$1 === tj) X$1 = uj;
              0 !== Aj && null !== U$1 && (Mj(U$1, W$1), Nj(U$1, Aj));
            }
            if (e || f) b.effectTag |= 4;
            break;

          case 7:
            break;

          case 8:
            break;

          case 12:
            break;

          case 4:
            nh();
            Ii(b);
            break;

          case 10:
            tg(b);
            break;

          case 9:
            break;

          case 14:
            break;

          case 17:
            L$1(b.type) && Ff();
            break;

          case 19:
            G$1(M$1);
            e = b.memoizedState;
            if (null === e) break;
            f = 0 !== (b.effectTag & 64);
            k = e.rendering;
            if (null === k) {
              if (f) Li(e, !1);else {
                if (X$1 !== qj || null !== c && 0 !== (c.effectTag & 64)) for (c = b.child; null !== c;) {
                  k = qh(c);

                  if (null !== k) {
                    b.effectTag |= 64;
                    Li(e, !1);
                    f = k.updateQueue;
                    null !== f && (b.updateQueue = f, b.effectTag |= 4);
                    null === e.lastEffect && (b.firstEffect = null);
                    b.lastEffect = e.lastEffect;
                    e = d;

                    for (f = b.child; null !== f;) d = f, c = e, d.effectTag &= 2, d.nextEffect = null, d.firstEffect = null, d.lastEffect = null, k = d.alternate, null === k ? (d.childExpirationTime = 0, d.expirationTime = c, d.child = null, d.memoizedProps = null, d.memoizedState = null, d.updateQueue = null, d.dependencies = null) : (d.childExpirationTime = k.childExpirationTime, d.expirationTime = k.expirationTime, d.child = k.child, d.memoizedProps = k.memoizedProps, d.memoizedState = k.memoizedState, d.updateQueue = k.updateQueue, c = k.dependencies, d.dependencies = null === c ? null : {
                      expirationTime: c.expirationTime,
                      firstContext: c.firstContext,
                      responders: c.responders
                    }), f = f.sibling;

                    I$1(M$1, M$1.current & 1 | 2);
                    b = b.child;
                    break a;
                  }

                  c = c.sibling;
                }
              }
            } else {
              if (!f) if (c = qh(k), null !== c) {
                if (b.effectTag |= 64, f = !0, d = c.updateQueue, null !== d && (b.updateQueue = d, b.effectTag |= 4), Li(e, !0), null === e.tail && "hidden" === e.tailMode && !k.alternate) {
                  b = b.lastEffect = e.lastEffect;
                  null !== b && (b.nextEffect = null);
                  break;
                }
              } else cg() > e.tailExpiration && 1 < d && (b.effectTag |= 64, f = !0, Li(e, !1), b.expirationTime = b.childExpirationTime = d - 1);
              e.isBackwards ? (k.sibling = b.child, b.child = k) : (d = e.last, null !== d ? d.sibling = k : b.child = k, e.last = k);
            }

            if (null !== e.tail) {
              0 === e.tailExpiration && (e.tailExpiration = cg() + 500);
              d = e.tail;
              e.rendering = d;
              e.tail = d.sibling;
              e.lastEffect = b.lastEffect;
              d.sibling = null;
              e = M$1.current;
              e = f ? e & 1 | 2 : e & 1;
              I$1(M$1, e);
              b = d;
              break a;
            }

            break;

          case 20:
            break;

          case 21:
            break;

          default:
            throw Error(u$1(156, b.tag));
        }

        b = null;
      }

      e = V$1;

      if (1 === W$1 || 1 !== e.childExpirationTime) {
        f = 0;

        for (d = e.child; null !== d;) c = d.expirationTime, k = d.childExpirationTime, c > f && (f = c), k > f && (f = k), d = d.sibling;

        e.childExpirationTime = f;
      }

      if (null !== b) return b;
      null !== a && 0 === (a.effectTag & 2048) && (null === a.firstEffect && (a.firstEffect = V$1.firstEffect), null !== V$1.lastEffect && (null !== a.lastEffect && (a.lastEffect.nextEffect = V$1.firstEffect), a.lastEffect = V$1.lastEffect), 1 < V$1.effectTag && (null !== a.lastEffect ? a.lastEffect.nextEffect = V$1 : a.firstEffect = V$1, a.lastEffect = V$1));
    } else {
      b = Mi(V$1);
      if (null !== b) return b.effectTag &= 2047, b;
      null !== a && (a.firstEffect = a.lastEffect = null, a.effectTag |= 2048);
    }

    b = V$1.sibling;
    if (null !== b) return b;
    V$1 = a;
  } while (null !== V$1);

  X$1 === qj && (X$1 = vj);
  return null;
}

function Xj(a) {
  var b = a.expirationTime;
  a = a.childExpirationTime;
  return b > a ? b : a;
}

function Yj(a) {
  var b = dg();
  fg(99, ik.bind(null, a, b));
  return null;
}

function ik(a, b) {
  do Sj(); while (null !== Ej);

  if ((T$1 & (oj | pj)) !== S$1) throw Error(u$1(327));
  var c = a.finishedWork,
      d = a.finishedExpirationTime;
  if (null === c) return null;
  a.finishedWork = null;
  a.finishedExpirationTime = 0;
  if (c === a.current) throw Error(u$1(177));
  a.callbackNode = null;
  a.callbackExpirationTime = 0;
  a.callbackPriority = 90;
  a.nextKnownPendingLevel = 0;
  var e = Xj(c);
  a.firstPendingTime = e;
  d <= a.lastSuspendedTime ? a.firstSuspendedTime = a.lastSuspendedTime = a.nextKnownPendingLevel = 0 : d <= a.firstSuspendedTime && (a.firstSuspendedTime = d - 1);
  d <= a.lastPingedTime && (a.lastPingedTime = 0);
  d <= a.lastExpiredTime && (a.lastExpiredTime = 0);
  a === U$1 && (V$1 = U$1 = null, W$1 = 0);
  1 < c.effectTag ? null !== c.lastEffect ? (c.lastEffect.nextEffect = c, e = c.firstEffect) : e = c : e = c.firstEffect;

  if (null !== e) {
    var f = T$1;
    T$1 |= pj;
    mj.current = null;
    le = Ld;
    var g = fe();

    if (ge(g)) {
      if ("selectionStart" in g) var h = {
        start: g.selectionStart,
        end: g.selectionEnd
      };else a: {
        h = (h = g.ownerDocument) && h.defaultView || window;
        var k = h.getSelection && h.getSelection();

        if (k && 0 !== k.rangeCount) {
          h = k.anchorNode;
          var l = k.anchorOffset,
              m = k.focusNode;
          k = k.focusOffset;

          try {
            h.nodeType, m.nodeType;
          } catch (Db) {
            h = null;
            break a;
          }

          var C = 0,
              y = -1,
              H = -1,
              z = 0,
              ta = 0,
              r = g,
              x = null;

          b: for (;;) {
            for (var A;;) {
              r !== h || 0 !== l && 3 !== r.nodeType || (y = C + l);
              r !== m || 0 !== k && 3 !== r.nodeType || (H = C + k);
              3 === r.nodeType && (C += r.nodeValue.length);
              if (null === (A = r.firstChild)) break;
              x = r;
              r = A;
            }

            for (;;) {
              if (r === g) break b;
              x === h && ++z === l && (y = C);
              x === m && ++ta === k && (H = C);
              if (null !== (A = r.nextSibling)) break;
              r = x;
              x = r.parentNode;
            }

            r = A;
          }

          h = -1 === y || -1 === H ? null : {
            start: y,
            end: H
          };
        } else h = null;
      }
      h = h || {
        start: 0,
        end: 0
      };
    } else h = null;

    me = {
      focusedElem: g,
      selectionRange: h
    };
    Ld = !1;
    Y$1 = e;

    do try {
      jk();
    } catch (Db) {
      if (null === Y$1) throw Error(u$1(330));
      Ri(Y$1, Db);
      Y$1 = Y$1.nextEffect;
    } while (null !== Y$1);

    Y$1 = e;

    do try {
      for (g = a, h = b; null !== Y$1;) {
        var p = Y$1.effectTag;
        p & 16 && Tb(Y$1.stateNode, "");

        if (p & 128) {
          var t = Y$1.alternate;

          if (null !== t) {
            var v = t.ref;
            null !== v && ("function" === typeof v ? v(null) : v.current = null);
          }
        }

        switch (p & 1038) {
          case 2:
            $i(Y$1);
            Y$1.effectTag &= -3;
            break;

          case 6:
            $i(Y$1);
            Y$1.effectTag &= -3;
            aj(Y$1.alternate, Y$1);
            break;

          case 1024:
            Y$1.effectTag &= -1025;
            break;

          case 1028:
            Y$1.effectTag &= -1025;
            aj(Y$1.alternate, Y$1);
            break;

          case 4:
            aj(Y$1.alternate, Y$1);
            break;

          case 8:
            l = Y$1, Xi(g, l, h), Yi(l);
        }

        Y$1 = Y$1.nextEffect;
      }
    } catch (Db) {
      if (null === Y$1) throw Error(u$1(330));
      Ri(Y$1, Db);
      Y$1 = Y$1.nextEffect;
    } while (null !== Y$1);

    v = me;
    t = fe();
    p = v.focusedElem;
    h = v.selectionRange;

    if (t !== p && p && p.ownerDocument && ee(p.ownerDocument.documentElement, p)) {
      null !== h && ge(p) && (t = h.start, v = h.end, void 0 === v && (v = t), "selectionStart" in p ? (p.selectionStart = t, p.selectionEnd = Math.min(v, p.value.length)) : (v = (t = p.ownerDocument || document) && t.defaultView || window, v.getSelection && (v = v.getSelection(), l = p.textContent.length, g = Math.min(h.start, l), h = void 0 === h.end ? g : Math.min(h.end, l), !v.extend && g > h && (l = h, h = g, g = l), l = de(p, g), m = de(p, h), l && m && (1 !== v.rangeCount || v.anchorNode !== l.node || v.anchorOffset !== l.offset || v.focusNode !== m.node || v.focusOffset !== m.offset) && (t = t.createRange(), t.setStart(l.node, l.offset), v.removeAllRanges(), g > h ? (v.addRange(t), v.extend(m.node, m.offset)) : (t.setEnd(m.node, m.offset), v.addRange(t))))));
      t = [];

      for (v = p; v = v.parentNode;) 1 === v.nodeType && t.push({
        element: v,
        left: v.scrollLeft,
        top: v.scrollTop
      });

      "function" === typeof p.focus && p.focus();

      for (p = 0; p < t.length; p++) v = t[p], v.element.scrollLeft = v.left, v.element.scrollTop = v.top;
    }

    me = null;
    Ld = !!le;
    le = null;
    a.current = c;
    Y$1 = e;

    do try {
      for (p = d; null !== Y$1;) {
        var Dh = Y$1.effectTag;

        if (Dh & 36) {
          var dc = Y$1.alternate;
          t = Y$1;
          v = p;

          switch (t.tag) {
            case 0:
            case 11:
            case 15:
              Ui(16, 32, t);
              break;

            case 1:
              var fd = t.stateNode;
              if (t.effectTag & 4) if (null === dc) fd.componentDidMount();else {
                var hk = t.elementType === t.type ? dc.memoizedProps : mg(t.type, dc.memoizedProps);
                fd.componentDidUpdate(hk, dc.memoizedState, fd.__reactInternalSnapshotBeforeUpdate);
              }
              var Eh = t.updateQueue;
              null !== Eh && Kg(t, Eh, fd, v);
              break;

            case 3:
              var Fh = t.updateQueue;

              if (null !== Fh) {
                g = null;
                if (null !== t.child) switch (t.child.tag) {
                  case 5:
                    g = t.child.stateNode;
                    break;

                  case 1:
                    g = t.child.stateNode;
                }
                Kg(t, Fh, g, v);
              }

              break;

            case 5:
              var xk = t.stateNode;
              null === dc && t.effectTag & 4 && ne(t.type, t.memoizedProps) && xk.focus();
              break;

            case 6:
              break;

            case 4:
              break;

            case 12:
              break;

            case 13:
              if (null === t.memoizedState) {
                var Di = t.alternate;

                if (null !== Di) {
                  var Ei = Di.memoizedState;

                  if (null !== Ei) {
                    var Fi = Ei.dehydrated;
                    null !== Fi && Lc(Fi);
                  }
                }
              }

              break;

            case 19:
            case 17:
            case 20:
            case 21:
              break;

            default:
              throw Error(u$1(163));
          }
        }

        if (Dh & 128) {
          t = void 0;
          var xd = Y$1.ref;

          if (null !== xd) {
            var Gi = Y$1.stateNode;

            switch (Y$1.tag) {
              case 5:
                t = Gi;
                break;

              default:
                t = Gi;
            }

            "function" === typeof xd ? xd(t) : xd.current = t;
          }
        }

        Y$1 = Y$1.nextEffect;
      }
    } catch (Db) {
      if (null === Y$1) throw Error(u$1(330));
      Ri(Y$1, Db);
      Y$1 = Y$1.nextEffect;
    } while (null !== Y$1);

    Y$1 = null;
    Yf();
    T$1 = f;
  } else a.current = c;

  if (Dj) Dj = !1, Ej = a, Fj = b;else for (Y$1 = e; null !== Y$1;) b = Y$1.nextEffect, Y$1.nextEffect = null, Y$1 = b;
  b = a.firstPendingTime;
  0 === b && (jj = null);
  1073741823 === b ? a === Ij ? Hj++ : (Hj = 0, Ij = a) : Hj = 0;
  "function" === typeof kk && kk(c.stateNode, d);
  Z$1(a);
  if (gj) throw gj = !1, a = hj, hj = null, a;
  if ((T$1 & nj) !== S$1) return null;
  jg();
  return null;
}

function jk() {
  for (; null !== Y$1;) {
    var a = Y$1.effectTag;
    0 !== (a & 256) && Ti(Y$1.alternate, Y$1);
    0 === (a & 512) || Dj || (Dj = !0, gg(97, function () {
      Sj();
      return null;
    }));
    Y$1 = Y$1.nextEffect;
  }
}

function Sj() {
  if (90 !== Fj) {
    var a = 97 < Fj ? 97 : Fj;
    Fj = 90;
    return fg(a, lk);
  }
}

function lk() {
  if (null === Ej) return !1;
  var a = Ej;
  Ej = null;
  if ((T$1 & (oj | pj)) !== S$1) throw Error(u$1(331));
  var b = T$1;
  T$1 |= pj;

  for (a = a.current.firstEffect; null !== a;) {
    try {
      var c = a;
      if (0 !== (c.effectTag & 512)) switch (c.tag) {
        case 0:
        case 11:
        case 15:
          Ui(128, 0, c), Ui(0, 64, c);
      }
    } catch (d) {
      if (null === a) throw Error(u$1(330));
      Ri(a, d);
    }

    c = a.nextEffect;
    a.nextEffect = null;
    a = c;
  }

  T$1 = b;
  jg();
  return !0;
}

function mk(a, b, c) {
  b = Ni(c, b);
  b = fj(a, b, 1073741823);
  Dg(a, b);
  a = Kj(a, 1073741823);
  null !== a && Z$1(a);
}

function Ri(a, b) {
  if (3 === a.tag) mk(a, a, b);else for (var c = a.return; null !== c;) {
    if (3 === c.tag) {
      mk(c, a, b);
      break;
    } else if (1 === c.tag) {
      var d = c.stateNode;

      if ("function" === typeof c.type.getDerivedStateFromError || "function" === typeof d.componentDidCatch && (null === jj || !jj.has(d))) {
        a = Ni(b, a);
        a = ij(c, a, 1073741823);
        Dg(c, a);
        c = Kj(c, 1073741823);
        null !== c && Z$1(c);
        break;
      }
    }

    c = c.return;
  }
}

function dk(a, b, c) {
  var d = a.pingCache;
  null !== d && d.delete(b);
  U$1 === a && W$1 === c ? X$1 === uj || X$1 === tj && 1073741823 === xj && cg() - bj < Cj ? Tj(a, W$1) : Bj = !0 : Pj(a, c) && (b = a.lastPingedTime, 0 !== b && b < c || (a.lastPingedTime = c, a.finishedExpirationTime === c && (a.finishedExpirationTime = 0, a.finishedWork = null), Z$1(a)));
}

function dj(a, b) {
  var c = a.stateNode;
  null !== c && c.delete(b);
  b = 0;
  0 === b && (b = Pg(), b = Qg(b, a, null));
  a = Kj(a, b);
  null !== a && Z$1(a);
}

var gk;

gk = function (a, b, c) {
  var d = b.expirationTime;

  if (null !== a) {
    var e = b.pendingProps;
    if (a.memoizedProps !== e || K$1.current) wg = !0;else {
      if (d < c) {
        wg = !1;

        switch (b.tag) {
          case 3:
            wi(b);
            li();
            break;

          case 5:
            oh(b);
            if (b.mode & 4 && 1 !== c && e.hidden) return b.expirationTime = b.childExpirationTime = 1, null;
            break;

          case 1:
            L$1(b.type) && Jf(b);
            break;

          case 4:
            mh(b, b.stateNode.containerInfo);
            break;

          case 10:
            sg(b, b.memoizedProps.value);
            break;

          case 13:
            if (null !== b.memoizedState) {
              d = b.child.childExpirationTime;
              if (0 !== d && d >= c) return yi(a, b, c);
              I$1(M$1, M$1.current & 1);
              b = oi(a, b, c);
              return null !== b ? b.sibling : null;
            }

            I$1(M$1, M$1.current & 1);
            break;

          case 19:
            d = b.childExpirationTime >= c;

            if (0 !== (a.effectTag & 64)) {
              if (d) return Bi(a, b, c);
              b.effectTag |= 64;
            }

            e = b.memoizedState;
            null !== e && (e.rendering = null, e.tail = null);
            I$1(M$1, M$1.current);
            if (!d) return null;
        }

        return oi(a, b, c);
      }

      wg = !1;
    }
  } else wg = !1;

  b.expirationTime = 0;

  switch (b.tag) {
    case 2:
      d = b.type;
      null !== a && (a.alternate = null, b.alternate = null, b.effectTag |= 2);
      a = b.pendingProps;
      e = Ef(b, J$1.current);
      vg(b, c);
      e = Ih(null, b, d, a, e, c);
      b.effectTag |= 1;

      if ("object" === typeof e && null !== e && "function" === typeof e.render && void 0 === e.$$typeof) {
        b.tag = 1;
        Mh();

        if (L$1(d)) {
          var f = !0;
          Jf(b);
        } else f = !1;

        b.memoizedState = null !== e.state && void 0 !== e.state ? e.state : null;
        var g = d.getDerivedStateFromProps;
        "function" === typeof g && Og(b, d, g, a);
        e.updater = Sg;
        b.stateNode = e;
        e._reactInternalFiber = b;
        Wg(b, d, a, c);
        b = vi(null, b, d, !0, f, c);
      } else b.tag = 0, R$1(null, b, e, c), b = b.child;

      return b;

    case 16:
      e = b.elementType;
      null !== a && (a.alternate = null, b.alternate = null, b.effectTag |= 2);
      a = b.pendingProps;
      Va(e);
      if (1 !== e._status) throw e._result;
      e = e._result;
      b.type = e;
      f = b.tag = nk(e);
      a = mg(e, a);

      switch (f) {
        case 0:
          b = si(null, b, e, a, c);
          break;

        case 1:
          b = ui(null, b, e, a, c);
          break;

        case 11:
          b = ni(null, b, e, a, c);
          break;

        case 14:
          b = pi(null, b, e, mg(e.type, a), d, c);
          break;

        default:
          throw Error(u$1(306, e, ""));
      }

      return b;

    case 0:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : mg(d, e), si(a, b, d, e, c);

    case 1:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : mg(d, e), ui(a, b, d, e, c);

    case 3:
      wi(b);
      d = b.updateQueue;
      if (null === d) throw Error(u$1(282));
      e = b.memoizedState;
      e = null !== e ? e.element : null;
      Hg(b, d, b.pendingProps, null, c);
      d = b.memoizedState.element;
      if (d === e) li(), b = oi(a, b, c);else {
        if (e = b.stateNode.hydrate) di = re(b.stateNode.containerInfo.firstChild), ci = b, e = ei = !0;
        if (e) for (c = gh(b, null, d, c), b.child = c; c;) c.effectTag = c.effectTag & -3 | 1024, c = c.sibling;else R$1(a, b, d, c), li();
        b = b.child;
      }
      return b;

    case 5:
      return oh(b), null === a && ii(b), d = b.type, e = b.pendingProps, f = null !== a ? a.memoizedProps : null, g = e.children, oe(d, e) ? g = null : null !== f && oe(d, f) && (b.effectTag |= 16), ti(a, b), b.mode & 4 && 1 !== c && e.hidden ? (b.expirationTime = b.childExpirationTime = 1, b = null) : (R$1(a, b, g, c), b = b.child), b;

    case 6:
      return null === a && ii(b), null;

    case 13:
      return yi(a, b, c);

    case 4:
      return mh(b, b.stateNode.containerInfo), d = b.pendingProps, null === a ? b.child = fh(b, null, d, c) : R$1(a, b, d, c), b.child;

    case 11:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : mg(d, e), ni(a, b, d, e, c);

    case 7:
      return R$1(a, b, b.pendingProps, c), b.child;

    case 8:
      return R$1(a, b, b.pendingProps.children, c), b.child;

    case 12:
      return R$1(a, b, b.pendingProps.children, c), b.child;

    case 10:
      a: {
        d = b.type._context;
        e = b.pendingProps;
        g = b.memoizedProps;
        f = e.value;
        sg(b, f);

        if (null !== g) {
          var h = g.value;
          f = of(h, f) ? 0 : ("function" === typeof d._calculateChangedBits ? d._calculateChangedBits(h, f) : 1073741823) | 0;

          if (0 === f) {
            if (g.children === e.children && !K$1.current) {
              b = oi(a, b, c);
              break a;
            }
          } else for (h = b.child, null !== h && (h.return = b); null !== h;) {
            var k = h.dependencies;

            if (null !== k) {
              g = h.child;

              for (var l = k.firstContext; null !== l;) {
                if (l.context === d && 0 !== (l.observedBits & f)) {
                  1 === h.tag && (l = Bg(c, null), l.tag = 2, Dg(h, l));
                  h.expirationTime < c && (h.expirationTime = c);
                  l = h.alternate;
                  null !== l && l.expirationTime < c && (l.expirationTime = c);
                  ug(h.return, c);
                  k.expirationTime < c && (k.expirationTime = c);
                  break;
                }

                l = l.next;
              }
            } else g = 10 === h.tag ? h.type === b.type ? null : h.child : h.child;

            if (null !== g) g.return = h;else for (g = h; null !== g;) {
              if (g === b) {
                g = null;
                break;
              }

              h = g.sibling;

              if (null !== h) {
                h.return = g.return;
                g = h;
                break;
              }

              g = g.return;
            }
            h = g;
          }
        }

        R$1(a, b, e.children, c);
        b = b.child;
      }

      return b;

    case 9:
      return e = b.type, f = b.pendingProps, d = f.children, vg(b, c), e = xg(e, f.unstable_observedBits), d = d(e), b.effectTag |= 1, R$1(a, b, d, c), b.child;

    case 14:
      return e = b.type, f = mg(e, b.pendingProps), f = mg(e.type, f), pi(a, b, e, f, d, c);

    case 15:
      return ri(a, b, b.type, b.pendingProps, d, c);

    case 17:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : mg(d, e), null !== a && (a.alternate = null, b.alternate = null, b.effectTag |= 2), b.tag = 1, L$1(d) ? (a = !0, Jf(b)) : a = !1, vg(b, c), Ug(b, d, e), Wg(b, d, e, c), vi(null, b, d, !0, a, c);

    case 19:
      return Bi(a, b, c);
  }

  throw Error(u$1(156, b.tag));
};

var kk = null,
    Wi = null;

function ok(a) {
  if ("undefined" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) return !1;
  var b = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (b.isDisabled || !b.supportsFiber) return !0;

  try {
    var c = b.inject(a);

    kk = function (a) {
      try {
        b.onCommitFiberRoot(c, a, void 0, 64 === (a.current.effectTag & 64));
      } catch (e) {}
    };

    Wi = function (a) {
      try {
        b.onCommitFiberUnmount(c, a);
      } catch (e) {}
    };
  } catch (d) {}

  return !0;
}

function pk(a, b, c, d) {
  this.tag = a;
  this.key = c;
  this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null;
  this.index = 0;
  this.ref = null;
  this.pendingProps = b;
  this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null;
  this.mode = d;
  this.effectTag = 0;
  this.lastEffect = this.firstEffect = this.nextEffect = null;
  this.childExpirationTime = this.expirationTime = 0;
  this.alternate = null;
}

function gi(a, b, c, d) {
  return new pk(a, b, c, d);
}

function qi(a) {
  a = a.prototype;
  return !(!a || !a.isReactComponent);
}

function nk(a) {
  if ("function" === typeof a) return qi(a) ? 1 : 0;

  if (void 0 !== a && null !== a) {
    a = a.$$typeof;
    if (a === Oa) return 11;
    if (a === Ra) return 14;
  }

  return 2;
}

function ah(a, b) {
  var c = a.alternate;
  null === c ? (c = gi(a.tag, b, a.key, a.mode), c.elementType = a.elementType, c.type = a.type, c.stateNode = a.stateNode, c.alternate = a, a.alternate = c) : (c.pendingProps = b, c.effectTag = 0, c.nextEffect = null, c.firstEffect = null, c.lastEffect = null);
  c.childExpirationTime = a.childExpirationTime;
  c.expirationTime = a.expirationTime;
  c.child = a.child;
  c.memoizedProps = a.memoizedProps;
  c.memoizedState = a.memoizedState;
  c.updateQueue = a.updateQueue;
  b = a.dependencies;
  c.dependencies = null === b ? null : {
    expirationTime: b.expirationTime,
    firstContext: b.firstContext,
    responders: b.responders
  };
  c.sibling = a.sibling;
  c.index = a.index;
  c.ref = a.ref;
  return c;
}

function ch(a, b, c, d, e, f) {
  var g = 2;
  d = a;
  if ("function" === typeof a) qi(a) && (g = 1);else if ("string" === typeof a) g = 5;else a: switch (a) {
    case Ia:
      return eh(c.children, e, f, b);

    case Na:
      g = 8;
      e |= 7;
      break;

    case Ja:
      g = 8;
      e |= 1;
      break;

    case Ka:
      return a = gi(12, c, b, e | 8), a.elementType = Ka, a.type = Ka, a.expirationTime = f, a;

    case Pa:
      return a = gi(13, c, b, e), a.type = Pa, a.elementType = Pa, a.expirationTime = f, a;

    case Qa:
      return a = gi(19, c, b, e), a.elementType = Qa, a.expirationTime = f, a;

    default:
      if ("object" === typeof a && null !== a) switch (a.$$typeof) {
        case La:
          g = 10;
          break a;

        case Ma:
          g = 9;
          break a;

        case Oa:
          g = 11;
          break a;

        case Ra:
          g = 14;
          break a;

        case Sa:
          g = 16;
          d = null;
          break a;
      }
      throw Error(u$1(130, null == a ? a : typeof a, ""));
  }
  b = gi(g, c, b, e);
  b.elementType = a;
  b.type = d;
  b.expirationTime = f;
  return b;
}

function eh(a, b, c, d) {
  a = gi(7, a, d, b);
  a.expirationTime = c;
  return a;
}

function bh(a, b, c) {
  a = gi(6, a, null, b);
  a.expirationTime = c;
  return a;
}

function dh(a, b, c) {
  b = gi(4, null !== a.children ? a.children : [], a.key, b);
  b.expirationTime = c;
  b.stateNode = {
    containerInfo: a.containerInfo,
    pendingChildren: null,
    implementation: a.implementation
  };
  return b;
}

function qk(a, b, c) {
  this.tag = b;
  this.current = null;
  this.containerInfo = a;
  this.pingCache = this.pendingChildren = null;
  this.finishedExpirationTime = 0;
  this.finishedWork = null;
  this.timeoutHandle = -1;
  this.pendingContext = this.context = null;
  this.hydrate = c;
  this.callbackNode = null;
  this.callbackPriority = 90;
  this.lastExpiredTime = this.lastPingedTime = this.nextKnownPendingLevel = this.lastSuspendedTime = this.firstSuspendedTime = this.firstPendingTime = 0;
}

function Pj(a, b) {
  var c = a.firstSuspendedTime;
  a = a.lastSuspendedTime;
  return 0 !== c && c >= b && a <= b;
}

function Mj(a, b) {
  var c = a.firstSuspendedTime,
      d = a.lastSuspendedTime;
  c < b && (a.firstSuspendedTime = b);
  if (d > b || 0 === c) a.lastSuspendedTime = b;
  b <= a.lastPingedTime && (a.lastPingedTime = 0);
  b <= a.lastExpiredTime && (a.lastExpiredTime = 0);
}

function Nj(a, b) {
  b > a.firstPendingTime && (a.firstPendingTime = b);
  var c = a.firstSuspendedTime;
  0 !== c && (b >= c ? a.firstSuspendedTime = a.lastSuspendedTime = a.nextKnownPendingLevel = 0 : b >= a.lastSuspendedTime && (a.lastSuspendedTime = b + 1), b > a.nextKnownPendingLevel && (a.nextKnownPendingLevel = b));
}

function Rj(a, b) {
  var c = a.lastExpiredTime;
  if (0 === c || c > b) a.lastExpiredTime = b;
}

function rk(a, b, c, d) {
  var e = b.current,
      f = Pg(),
      g = Mg.suspense;
  f = Qg(f, e, g);

  a: if (c) {
    c = c._reactInternalFiber;

    b: {
      if (ec(c) !== c || 1 !== c.tag) throw Error(u$1(170));
      var h = c;

      do {
        switch (h.tag) {
          case 3:
            h = h.stateNode.context;
            break b;

          case 1:
            if (L$1(h.type)) {
              h = h.stateNode.__reactInternalMemoizedMergedChildContext;
              break b;
            }

        }

        h = h.return;
      } while (null !== h);

      throw Error(u$1(171));
    }

    if (1 === c.tag) {
      var k = c.type;

      if (L$1(k)) {
        c = If(c, k, h);
        break a;
      }
    }

    c = h;
  } else c = Cf;

  null === b.context ? b.context = c : b.pendingContext = c;
  b = Bg(f, g);
  b.payload = {
    element: a
  };
  d = void 0 === d ? null : d;
  null !== d && (b.callback = d);
  Dg(e, b);
  Rg(e, f);
  return f;
}

function sk(a) {
  a = a.current;
  if (!a.child) return null;

  switch (a.child.tag) {
    case 5:
      return a.child.stateNode;

    default:
      return a.child.stateNode;
  }
}

function tk(a, b) {
  a = a.memoizedState;
  null !== a && null !== a.dehydrated && a.retryTime < b && (a.retryTime = b);
}

function uk(a, b) {
  tk(a, b);
  (a = a.alternate) && tk(a, b);
}

function vk(a, b, c) {
  c = null != c && !0 === c.hydrate;
  var d = new qk(a, b, c),
      e = gi(3, null, null, 2 === b ? 7 : 1 === b ? 3 : 0);
  d.current = e;
  e.stateNode = d;
  a[we] = d.current;
  c && 0 !== b && wc(9 === a.nodeType ? a : a.ownerDocument);
  this._internalRoot = d;
}

vk.prototype.render = function (a, b) {
  rk(a, this._internalRoot, null, void 0 === b ? null : b);
};

vk.prototype.unmount = function (a) {
  var b = this._internalRoot,
      c = void 0 === a ? null : a,
      d = b.containerInfo;
  rk(null, b, null, function () {
    d[we] = null;
    null !== c && c();
  });
};

function wk(a) {
  return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType && (8 !== a.nodeType || " react-mount-point-unstable " !== a.nodeValue));
}

function yk(a, b) {
  b || (b = a ? 9 === a.nodeType ? a.documentElement : a.firstChild : null, b = !(!b || 1 !== b.nodeType || !b.hasAttribute("data-reactroot")));
  if (!b) for (var c; c = a.lastChild;) a.removeChild(c);
  return new vk(a, 0, b ? {
    hydrate: !0
  } : void 0);
}

function zk(a, b, c, d, e) {
  var f = c._reactRootContainer;

  if (f) {
    var g = f._internalRoot;

    if ("function" === typeof e) {
      var h = e;

      e = function () {
        var a = sk(g);
        h.call(a);
      };
    }

    rk(b, g, a, e);
  } else {
    f = c._reactRootContainer = yk(c, d);
    g = f._internalRoot;

    if ("function" === typeof e) {
      var k = e;

      e = function () {
        var a = sk(g);
        k.call(a);
      };
    }

    ck(function () {
      rk(b, g, a, e);
    });
  }

  return sk(g);
}

function Ak(a, b, c) {
  var d = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
  return {
    $$typeof: Ha,
    key: null == d ? null : "" + d,
    children: a,
    containerInfo: b,
    implementation: c
  };
}

jc = function (a) {
  if (13 === a.tag) {
    var b = lg(Pg(), 150, 100);
    Rg(a, b);
    uk(a, b);
  }
};

kc = function (a) {
  if (13 === a.tag) {
    Pg();
    var b = kg++;
    Rg(a, b);
    uk(a, b);
  }
};

lc = function (a) {
  if (13 === a.tag) {
    var b = Pg();
    b = Qg(b, a, null);
    Rg(a, b);
    uk(a, b);
  }
};

Za = function (a, b, c) {
  switch (b) {
    case "input":
      Eb(a, c);
      b = c.name;

      if ("radio" === c.type && null != b) {
        for (c = a; c.parentNode;) c = c.parentNode;

        c = c.querySelectorAll("input[name=" + JSON.stringify("" + b) + '][type="radio"]');

        for (b = 0; b < c.length; b++) {
          var d = c[b];

          if (d !== a && d.form === a.form) {
            var e = ye(d);
            if (!e) throw Error(u$1(90));
            zb(d);
            Eb(d, e);
          }
        }
      }

      break;

    case "textarea":
      Mb(a, c);
      break;

    case "select":
      b = c.value, null != b && Jb(a, !!c.multiple, b, !1);
  }
};

eb = bk;

fb = function (a, b, c, d) {
  var e = T$1;
  T$1 |= 4;

  try {
    return fg(98, a.bind(null, b, c, d));
  } finally {
    T$1 = e, T$1 === S$1 && jg();
  }
};

gb = function () {
  (T$1 & (1 | oj | pj)) === S$1 && (ak(), Sj());
};

hb = function (a, b) {
  var c = T$1;
  T$1 |= 2;

  try {
    return a(b);
  } finally {
    T$1 = c, T$1 === S$1 && jg();
  }
};

function Bk(a, b) {
  var c = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
  if (!wk(b)) throw Error(u$1(200));
  return Ak(a, b, null, c);
}

var Ck = {
  createPortal: Bk,
  findDOMNode: function (a) {
    if (null == a) return null;
    if (1 === a.nodeType) return a;
    var b = a._reactInternalFiber;

    if (void 0 === b) {
      if ("function" === typeof a.render) throw Error(u$1(188));
      throw Error(u$1(268, Object.keys(a)));
    }

    a = ic(b);
    a = null === a ? null : a.stateNode;
    return a;
  },
  hydrate: function (a, b, c) {
    if (!wk(b)) throw Error(u$1(200));
    return zk(null, a, b, !0, c);
  },
  render: function (a, b, c) {
    if (!wk(b)) throw Error(u$1(200));
    return zk(null, a, b, !1, c);
  },
  unstable_renderSubtreeIntoContainer: function (a, b, c, d) {
    if (!wk(c)) throw Error(u$1(200));
    if (null == a || void 0 === a._reactInternalFiber) throw Error(u$1(38));
    return zk(a, b, c, !1, d);
  },
  unmountComponentAtNode: function (a) {
    if (!wk(a)) throw Error(u$1(40));
    return a._reactRootContainer ? (ck(function () {
      zk(null, null, a, !1, function () {
        a._reactRootContainer = null;
        a[we] = null;
      });
    }), !0) : !1;
  },
  unstable_createPortal: function () {
    return Bk.apply(void 0, arguments);
  },
  unstable_batchedUpdates: bk,
  flushSync: function (a, b) {
    if ((T$1 & (oj | pj)) !== S$1) throw Error(u$1(187));
    var c = T$1;
    T$1 |= 1;

    try {
      return fg(99, a.bind(null, b));
    } finally {
      T$1 = c, jg();
    }
  },
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {
    Events: [Cc, xe, ye, Ca.injectEventPluginsByName, fa, Sc, function (a) {
      ya(a, Rc);
    }, cb, db, Pd, Ba, Sj, {
      current: !1
    }]
  }
};

(function (a) {
  var b = a.findFiberByHostInstance;
  return ok(objectAssign({}, a, {
    overrideHookState: null,
    overrideProps: null,
    setSuspenseHandler: null,
    scheduleUpdate: null,
    currentDispatcherRef: Ea.ReactCurrentDispatcher,
    findHostInstanceByFiber: function (a) {
      a = ic(a);
      return null === a ? null : a.stateNode;
    },
    findFiberByHostInstance: function (a) {
      return b ? b(a) : null;
    },
    findHostInstancesForRefresh: null,
    scheduleRefresh: null,
    scheduleRoot: null,
    setRefreshHandler: null,
    getCurrentFiber: null
  }));
})({
  findFiberByHostInstance: Fc,
  bundleType: 0,
  version: "16.12.0",
  rendererPackageName: "react-dom"
});

var Dk = {
  default: Ck
},
    Ek = Dk && Ck || Dk;
var reactDom_production_min = Ek.default || Ek;

var reactDom = createCommonjsModule(function (module) {

function checkDCE() {
  /* global __REACT_DEVTOOLS_GLOBAL_HOOK__ */
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined' || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== 'function') {
    return;
  }

  try {
    // Verify that the code above has been dead code eliminated (DCE'd).
    __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
  } catch (err) {
    // DevTools shouldn't crash React, no matter what.
    // We should still report in case we break this code.
    console.error(err);
  }
}

{
  // DCE check should happen before ReactDOM bundle executes so that
  // DevTools can report bad minification during injection.
  checkDCE();
  module.exports = reactDom_production_min;
}
});

function react$1(node, component, props) {
  props ? reactDom.render(react.createElement(component, props), node) : reactDom.unmountComponentAtNode(node);
}

let ComponentReact = createContainer(() => import('//localhost:8010/header.js'), react$1); //Component loading

function Loading() {
  return "...loading!";
}

function MyApp() {
  // handler that allows communication, to generate any effect
  function handler(message) {
    console.log(message);
  }

  return createElement("host", null, "react container!", createElement(ComponentReact, {
    loading: createElement(Loading, null),
    anyHandler: handler
  }));
}

var myApp = customElement("my-app", MyApp);

export default myApp;
//# sourceMappingURL=my-app.js.map
