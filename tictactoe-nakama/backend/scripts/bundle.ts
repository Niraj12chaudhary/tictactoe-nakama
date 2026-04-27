/**
 * Bundles the TypeScript Nakama runtime into a single CommonJS artifact.
 * The emitted file targets ES5-compatible JavaScript and explicitly exposes
 * InitModule so Nakama can discover the runtime entrypoint at startup.
 */

import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

/**
 * Recursively collects all TypeScript source files within a directory.
 *
 * @param directory The directory to scan.
 * @returns A list of absolute TypeScript file paths.
 */
async function collectSourceFiles(directory: string): Promise<string[]> {
  const directoryEntries = await fs.readdir(directory, { withFileTypes: true });
  const sourceFiles: string[] = [];

  for (const entry of directoryEntries) {
    const absolutePath = path.resolve(directory, entry.name);
    if (entry.isDirectory()) {
      sourceFiles.push(...(await collectSourceFiles(absolutePath)));
      continue;
    }

    if (entry.isFile() && absolutePath.endsWith(".ts")) {
      sourceFiles.push(absolutePath);
    }
  }

  return sourceFiles;
}

/**
 * Transpiles backend TypeScript files to ES5-compatible CommonJS modules.
 *
 * @param sourceDir The TypeScript source directory.
 * @param outputDir The temporary JavaScript output directory.
 * @returns Nothing.
 */
async function transpileToEs5(
  sourceDir: string,
  outputDir: string,
): Promise<void> {
  const sourceFiles = await collectSourceFiles(sourceDir);

  for (const sourceFile of sourceFiles) {
    const sourceText = await fs.readFile(sourceFile, "utf8");
    const relativePath = path.relative(sourceDir, sourceFile);
    const outputPath = path.resolve(
      outputDir,
      relativePath.replace(/\.ts$/, ".js"),
    );
    const transpiled = ts.transpileModule(sourceText, {
      compilerOptions: {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.ESNext,
        strict: true,
        esModuleInterop: true,
        ignoreDeprecations: "6.0",
      },
      fileName: sourceFile,
      reportDiagnostics: true,
    });

    if (transpiled.diagnostics && transpiled.diagnostics.length > 0) {
      const message = transpiled.diagnostics
        .map((diagnostic) => {
          return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        })
        .join("\n");
      throw new Error(message);
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, transpiled.outputText, "utf8");
  }
}

/**
 * Bundles the backend source into the Nakama runtime output file.
 *
 * @returns A promise that resolves once the bundle is written.
 */
async function bundleRuntime(): Promise<void> {
  const rootDir = path.resolve(__dirname, "..");
  const sourceDir = path.resolve(rootDir, "src");
  const tempDir = path.resolve(rootDir, ".tmp-es5");
  const distDir = path.resolve(rootDir, "dist");

  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(distDir, { recursive: true });
  await transpileToEs5(sourceDir, tempDir);

  await build({
    entryPoints: [path.resolve(tempDir, "main.js")],
    outfile: path.resolve(rootDir, "dist/main.js"),
    bundle: true,
    format: "cjs",
    platform: "neutral",
    target: ["es2015"],
    charset: "ascii",
    logLevel: "info",
    sourcemap: false,
    legalComments: "none",
    treeShaking: false,
    banner: {
      js: "var module = { exports: {} }; var exports = module.exports;",
    },
  });

  await fs.rm(tempDir, { recursive: true, force: true });
}

bundleRuntime().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
