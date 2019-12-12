import { h, render } from "preact";

export function preact(node, component, props) {
  render(props ? h(component, props) : null, node, node);
}
