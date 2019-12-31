import React from "react";
import { styled, setPragma } from "goober";

setPragma(React.createElement);

const Title = styled("h1")`
  font-weight: bold;
  color: dodgerblue;
`;

export default function() {
  return (
    <header>
      <strong>Logo</strong>
      <nav>
        <a>1</a>
        <a>2</a>
        <a>3</a>
        <Title>...s</Title>
      </nav>
    </header>
  );
}
