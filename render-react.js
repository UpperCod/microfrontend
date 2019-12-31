import React from 'react';
import ReactDom from 'react-dom';

function react(node, component, props) {
  props ? ReactDom.render(React.createElement(component, props), node) : ReactDom.unmountComponentAtNode(node);
}

export default react;
//# sourceMappingURL=render-react.js.map
