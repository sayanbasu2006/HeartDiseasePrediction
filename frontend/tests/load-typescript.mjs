import { readFileSync } from "node:fs";
import ts from "typescript";

// Compile the actual pure helper modules without requiring Node's newer TS loader.
export async function loadTypescript(url) {
  const { outputText } = ts.transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: url.pathname,
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  );
}
