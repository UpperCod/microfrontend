import { createElement } from "react";
import { render } from "react-dom";

export function react(node, component, props) {
  render(props ? createElement(component, props) : null, node);
}
