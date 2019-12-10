# @atomico/microfrontend

I have analyzed the capacity of atomico to orchestrate microforntend strategies, for this atomico, it should cover the following aspects:

## avoid excessive configuration

Each development environment is unique among libraries, so it is recommended to maintain the format and only use an isolated distribution application, eg:

```jsx
export default function ReactApp() {
  return <Fragment>...mega app!</Fragment>;
}
```

> Note that the use of ReactDom.render does not exist within the code to be reused, only the use of the component is sought

## isolated documents

There are persistent frontend strategies with libraries such as React, an example of which is the use of css-in-js libraries, which define styles globally, this clashes with the shadow-dom and generates risks of css rewriting by hierarchy, for avoid that the most effective solution is the use of iframe to assimilate the execution of the application.

## Dinamic import

This strategy is ideal for the use of microforntend, since it allows to effectively insulate an application and all its dependencies in an effective way, this protects the integrity of the execution of global code and allows to apply a small import hack to ram the list in an iframe , the css-in-js code would work without problems.

## Example of api proposed by atomico

```js
import { h, customElement } from "atomico";
import { preact, react, vue } from "@atomico/microfront";

let ComponentPreact = preact(() => import("./app/preact/example"));
let ComponentReact = react(() => import("./app/react/example"));
let ComponentVue = vue(() => import("./app/vue/example"));

function MyApp() {
  function handler(messageFrom) {
    console.log(messageFrom);
  }
  return (
    <host shadowDom>
      <ComponentPreact anyProp={handler} root="/preact" />
      <ComponentReact anyProp={handler} root="/preact" />
      <ComponentVue anyProp={handler} root="/vue" />
    </host>
  );
}

customElement("my-app", MyApp);
```

where :

- `@atomico/microfront` : will allow the use of renders that work in an iframe in a secure and isolated way
- `ComponentPreact` : functional component that allows you to reflect the props to the component to be imported by the render from the iframe
- `ComponentPreact[root]` : allows to define the root of the route to be observed by iframe, with the aim of the router synchronizing effectively

## Live Example

the [Example](https://uppercod.github.io/microfrontend/dist/) teaches how preact exists inside the shadow Dom using css-in-js thanks to encapsulation with iframe.
