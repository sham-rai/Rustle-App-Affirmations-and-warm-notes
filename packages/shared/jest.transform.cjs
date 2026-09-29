// Minimal Jest transformer: TypeScript to CommonJS through `typescript` itself.
// Type checking is `npm run typecheck`'s job, not this one's.
const ts = require('typescript');

module.exports = {
  process(sourceText, sourcePath) {
    const { outputText, sourceMapText } = ts.transpileModule(sourceText, {
      fileName: sourcePath,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        sourceMap: true,
      },
    });
    return { code: outputText, map: sourceMapText };
  },
};
