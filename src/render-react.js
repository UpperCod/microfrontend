import React from "react";
import ReactDom from "react-dom";

export default function react(node, component, props) {
  props
    ? ReactDom.render(React.createElement(component, props), node)
    : ReactDom.unmountComponentAtNode(node);
}
