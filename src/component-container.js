import { h, customElement, useEffect, useRef } from "atomico";

function getRoot(current) {
  return current.shadowRoot || current;
}

function Container({ options, props }) {
  let ref = useRef();
  let { sandbox } = props;

  useEffect(() => {
    let { current } = ref;

    if (sandbox) {
      let { contentDocument, contentWindow } = current;

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
      options
        .source()
        .then(component =>
          options.render(getRoot(current), component.default, props)
        );
    }
  }, [props]);

  useEffect(() => {
    let { current } = ref;
    if (sandbox) {
      let { contentDocument } = current;
      return () => options.render(contentDocument.body, null, null);
    } else {
      return () => options.render(getRoot(current), null, null);
    }
  }, []);

  return sandbox ? (
    <host>
      <iframe
        ref={ref}
        width="100%"
        height="100%"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
        frameborder="0"
      ></iframe>
    </host>
  ) : (
    <host ref={ref} shadowDom={props.shadowDom}></host>
  );
}

Container.props = {
  options: Object,
  props: Object
};

export default customElement("a-microfrontend-container", Container);
