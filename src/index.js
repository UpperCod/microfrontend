import { h, customElement } from "atomico";
import { preact } from "./microfront";

let Component = preact(() => import("./preact/example"));

function MyApp() {
  return (
    <host>
      Atomico containers
      <Component></Component>
    </host>
  );
}

customElement("my-app", MyApp);
