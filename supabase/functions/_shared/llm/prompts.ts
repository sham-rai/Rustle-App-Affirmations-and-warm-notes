// Versioned prompts (docs/08 §4 principle 7): one markdown file per version under
// `_shared/prompts/<name>/v<n>.md`, loaded by name and version, never edited in place. The
// `prompt_version` string (`<name>@v<n>`) is stored with every generation.

export interface LoadedPrompt {
  readonly name: string;
  readonly version: number;
  /** `<name>@v<n>`, the value written to `llm_calls.prompt_version` and `deliveries.prompt_version`. */
  readonly promptVersion: string;
  /** The whole file: identity, values, hard rules, style and the example pairs. Sent as the cached system prefix. */
  readonly system: string;
}

/** Reads one file as text. The default is Deno's; tests pass a map. */
export type PromptReader = (url: URL) => Promise<string>;

const NAME = /^[a-z][a-z0-9_]*$/;

export function promptVersionOf(name: string, version: number): string {
  return `${name}@v${version}`;
}

/** The file for a prompt, relative to this module, so bundling keeps the layout. */
export function promptUrl(name: string, version: number): URL {
  if (!NAME.test(name)) throw new Error(`prompt name must match ${NAME}: ${name}`);
  if (!Number.isInteger(version) || version < 1) throw new Error(`prompt version must be a positive integer: ${version}`);
  return new URL(`../prompts/${name}/v${version}.md`, import.meta.url);
}

const denoReader: PromptReader = (url) => Deno.readTextFile(url);

/**
 * Loads a prompt version. Throws when the file is missing or empty: a prompt that cannot load is a
 * deploy error, never something to paper over with a blank system prompt.
 */
export async function loadPrompt(name: string, version: number, read: PromptReader = denoReader): Promise<LoadedPrompt> {
  const url = promptUrl(name, version);
  const system = (await read(url)).trim();
  if (system.length === 0) throw new Error(`prompt ${promptVersionOf(name, version)} is empty`);
  return { name, version, promptVersion: promptVersionOf(name, version), system };
}
