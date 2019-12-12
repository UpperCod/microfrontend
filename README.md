# @atomico/microfrontend

## Orchestrator example

```jsx
import { h, customElement } from "atomico";
import { Container, Sandbox, preact, vue } from "@atomico/microfrontend";

// Create a container to use preact
let App1 = Container(() => import("./team-1/app"), preact);
// Create a sandbox to use vue
let App2 = Sandbox(() => import("./team-2/app"), vue);

function MyApp() {
  function handler(message) {
    console.log(message); // from preact . . . from vue
  }
  return (
    <host>
      microfrontend apps!
      <App1 anyHandler={handler} />
      <App2 anyHandler={handler} />
    </host>
  );
}
```

## sandbox rules

The sandbox is a separate document that assimilates the execution of all the code associated with the sandbox, this allows to keep styles and js global without conflict, but does not allow a manipulation on `window.location`, to achieve this you must pass`location` as A prop for the sandbox.
