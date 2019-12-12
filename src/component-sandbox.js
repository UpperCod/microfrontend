import { h, customElement, useEffect, useHost } from "atomico";

function SandBox({ options, props }) {
  let ref = useHost();

  useEffect(() => {
    let { contentDocument, contentWindow } = ref.current;

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
  }, [props]);

  useEffect(() => {
    let { contentDocument } = ref.current;
    return () => options.render(contentDocument.body, null, null);
  }, []);

  return (
    <host
      width="100%"
      height="100%"
      sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
      frameBorder="0"
    ></host>
  );
}

SandBox.props = {
  options: Object,
  props: Object
};

export default customElement("a-microfrontend-sandbox", SandBox, {
  base: HTMLIFrameElement,
  extends: "iframe"
});
