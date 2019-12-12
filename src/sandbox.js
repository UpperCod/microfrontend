import { h } from "atomico";
import ComponentSandbox from "./component-sandbox";

export function Sandbox(source, render) {
  return props => (
    <ComponentSandbox
      options={{ source, render }}
      props={props}
    ></ComponentSandbox>
  );
}
