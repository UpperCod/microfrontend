import "./microfront";
import { h } from "atomico";
import { render as preactRender, h as createElement } from "preact";
/**
 *
 * @param {Function} source - function to insert as string in the sandbox
 * @param {*} options -
 */
export function preact(source, options) {
  options = {
    ...options,
    source,
    /**
     *
     * @param {HTMLBodyElement} node
     * @param {Function} component
     * @param {?Object} props - if null indicates that the component has been unmounted
     */
    render(node, component, props) {
      preactRender(props ? createElement(component, props) : "", node);
    }
  };
  return props => (
    <iframe is="atomico-microfront" options={options} props={props}></iframe>
  );
}
