import { h } from "preact";
import { styled, setPragma } from "goober";

setPragma(h);

const Button = styled("button")`
  padding: 10px;
  margin: 10px;
  background: black;
  color: White;
  box-shadow: 0 12px 22px rgba(0, 0, 0, 0.05);
  font-size: 20px;
  border: none;
  border-radius: 100px;
`;

function redirect() {
  window.history.pushState({}, "root", "/root");
}

export default function Component() {
  return (
    <h1>
      preact app, Shadow Dom style does not affect preact content
      <Button onclick={redirect}>css-in-js inside the shadowDom</Button>
    </h1>
  );
}
