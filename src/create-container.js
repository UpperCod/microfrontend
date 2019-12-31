import { h } from "atomico";
import ComponentContainer from "./component-container";

export default function createContainer(source, render) {
  return props => (
    <ComponentContainer
      options={{ source, render }}
      props={props}
    ></ComponentContainer>
  );
}
