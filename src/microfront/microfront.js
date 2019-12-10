import { h, customElement, useEffect, useHost } from "atomico";

function eventRedirect(window) {
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function Microfront({ options, props }) {
  let ref = useHost();

  useEffect(() => {
    let { contentDocument, contentWindow } = ref.current;

    if (!ref.load) {
      let script = document.createElement("script");
      /**
       * HACK, the use of code split, improves the micro frontend experience,
       * since it allows to assimilate the execution of the application in a
       * sandbox, this leaves the task of synchronizing with history
       */
      script.textContent = `window.$ =(${options.source})().then(md=>md.default)`;

      contentDocument.body.appendChild(script);

      // let { history: sandboxHistory } = contentWindow;
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
    let { contentDocument } = ref.current;
    return () => options.render(contentDocument.body, null, null);
  }, []);

  return (
    <host
      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      frameBorder="0"
    ></host>
  );
}

Microfront.props = {
  options: Object,
  props: Object
};

export default customElement("atomico-microfront", Microfront, {
  base: HTMLIFrameElement,
  extends: "iframe"
});
