import { h, customElement, useEffect, useHost } from "atomico";

function getRoot(current) {
  return current.shadowRoot || current;
}

function Container({ options, props }) {
  let ref = useHost();

  useEffect(() => {
    let { current } = ref;
    options
      .source()
      .then(component =>
        options.render(getRoot(current), component.default || component, props)
      );
  }, [props]);

  useEffect(() => {
    let { current } = ref;
    return () => options.render(getRoot(current), null, null);
  }, []);
  return <host shadowDom={props.shadowDom}></host>;
}

Container.props = {
  options: Object,
  props: Object
};

export default customElement("a-microfrontend-container", Container);
