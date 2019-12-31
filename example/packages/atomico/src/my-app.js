import { h, customElement } from "atomico";
import createContainer from "@atomico/microfrontend/create-container";
import renderReact from "@atomico/microfrontend/render-react";

let ComponentReact = createContainer(
  () => import("//localhost:8010/header.js"),
  renderReact
);

//Component loading
function Loading() {
  return "...loading!";
}

function MyApp() {
  // handler that allows communication, to generate any effect
  function handler(message) {
    console.log(message);
  }
  return (
    <host>
      react container!
      <ComponentReact
        loading={<Loading />}
        anyHandler={handler}
      ></ComponentReact>
    </host>
  );
}

export default customElement("my-app", MyApp);
