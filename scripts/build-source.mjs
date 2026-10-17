// MIT. Strict Worker/browser checking and deterministic local distributions.
import ts from "typescript";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const mode = process.argv[2];
if (!["--check", "--write", "--lint"].includes(mode))
  throw Error("Use --check, --write or --lint.");
let emitted = 0;
for (const name of ["tsconfig.json", "tsconfig.browser.json"]) {
  const config = ts.readConfigFile(resolve(root, name), ts.sys.readFile);
  if (config.error)
    throw Error(
      ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
    );
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  if (mode === "--lint")
    Object.assign(parsed.options, {
      noUnusedLocals: true,
      noUnusedParameters: true,
    });
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const outputs = [];
  const emit = program.emit(undefined, (path, bytes) =>
    outputs.push({ path, bytes }),
  );
  const errors = [
    ...parsed.errors,
    ...ts.getPreEmitDiagnostics(program),
    ...emit.diagnostics,
  ];
  if (errors.length)
    throw Error(
      ts.formatDiagnosticsWithColorAndContext(errors, {
        getCanonicalFileName: (path) => path,
        getCurrentDirectory: () => root,
        getNewLine: () => "\n",
      }),
    );
  if (mode === "--lint") continue;
  for (const { path, bytes } of outputs) {
    const file = basename(path);
    let destination;
    if (name === "tsconfig.browser.json")
      destination =
        file === "navigation.js" ? "public/brand/" + file : "public/" + file;
    else if (file === "publisher.mjs" || file === "publisher.d.mts")
      destination = "src/" + file;
    else continue; // Wrangler compiles the Worker directly from the checked TS entry.
    const output = resolve(root, destination);
    const source =
      "// Generated from checked TypeScript; edit the corresponding .ts/.mts source. MIT.\n" +
      bytes;
    if (mode === "--write") writeFileSync(output, source);
    else if (readFileSync(output, "utf8") !== source)
      throw Error(
        "Stale generated output: " + destination + ". Run pnpm source:write.",
      );
    emitted++;
  }
}
console.log(
  mode === "--lint"
    ? "Strict unused-source checks pass."
    : `${emitted} checked distribution files ${mode === "--write" ? "written" : "match"}.`,
);
