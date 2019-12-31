import { render, h } from 'preact';

function preact(node, component, props) {
  render(props ? h(component, props) : null, node, node);
}

export { preact };
//# sourceMappingURL=render-preact.js.map
