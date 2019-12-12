import { customElement, useHost, useEffect, h } from 'atomico';
import { render, h as h$1 } from 'preact';
import { createElement } from 'react';
import { render as render$1 } from 'react-dom';
import Vue from 'vue';

function getRoot(current) {
  return current.shadowRoot || current;
}

function Container({
  options,
  props
}) {
  let ref = useHost();
  useEffect(() => {
    let {
      current
    } = ref;
    options.source().then(component => options.render(getRoot(current), component.default || component, props));
  }, [props]);
  useEffect(() => {
    let {
      current
    } = ref;
    return () => options.render(getRoot(current), null, null);
  }, []);
  return h("host", {
    shadowDom: props.shadowDom
  });
}

Container.props = {
  options: Object,
  props: Object
};
var ComponentContainer = customElement("a-microfrontend-container", Container);

function Container$1(source, render) {
  return props => h(ComponentContainer, {
    options: {
      source,
      render
    },
    props: props
  });
}

function SandBox({
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
      let style = document.createElement("style");
      style.textContent = "html,body{margin:0px;width:100%;height:100%;overflow:auto}";
      /**
       * HACK, the use of code split, improves the micro frontend experience,
       * since it allows to assimilate the execution of the application in a
       * sandbox, this leaves the task of synchronizing with history
       */

      script.textContent = "window.$ =(".concat(options.source, ")().then(md=>md.default)");
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
  }, [props]);
  useEffect(() => {
    let {
      contentDocument
    } = ref.current;
    return () => options.render(contentDocument.body, null, null);
  }, []);
  return h("host", {
    width: "100%",
    height: "100%",
    sandbox: "allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation",
    frameBorder: "0"
  });
}

SandBox.props = {
  options: Object,
  props: Object
};
var ComponentSandbox = customElement("a-microfrontend-sandbox", SandBox, {
  base: HTMLIFrameElement,
  extends: "iframe"
});

function Sandbox(source, render) {
  return props => h(ComponentSandbox, {
    options: {
      source,
      render
    },
    props: props
  });
}

function preact(node, component, props) {
  render(props ? h$1(component, props) : null, node, node);
}

function react(node, component, props) {
  render$1(props ? createElement(component, props) : null, node);
}

let refVue = Symbol("vue");
function vue(node, component, props) {
  if (!node[refVue]) {
    node[refVue] = new Vue({
      data: props,
      render: h => h(component)
    });
  } else if (props) {
    node[refVue].data = props;
  } else {
    node[refVue].$destroy();
  }
}

export { Container$1 as Container, Sandbox, preact, react, vue };
//# sourceMappingURL=microfrontend.js.map
