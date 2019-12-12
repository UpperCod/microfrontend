import Vue from "vue";

let refVue = Symbol("vue");

export function vue(node, component, props) {
  if (!node[refVue]) {
    node[refVue] = new Vue({
      data: props,
      render: h => h(component)
    });
  } else if (props) {
    node[refVue].data = props;
  } else {
    node[refVue].$destroy();
  }
}
