import { h } from "atomico";
import ComponentContainer from "./component-container";

export function Container(source, render) {
  return props => (
    <ComponentContainer
      options={{ source, render }}
      props={props}
    ></ComponentContainer>
  );
}
