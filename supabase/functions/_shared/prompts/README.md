# Prompts

Every prompt the product uses lives here as a versioned markdown file, loaded by `_shared/llm/prompts.ts` and sent by `LLMClient` as the cached system prefix. Nothing calls Claude without going through `LLMClient` (CLAUDE.md), and nothing sends a prompt that is not a file in this folder.

## Layout

```
_shared/prompts/
  README.md
  rustle_voice/v1.md        the identity, values, hard rules and style (docs/08 §5.1)
  note_composer/v1.md       the daily composer (docs/08 §5.2)
  ...one folder per prompt, one file per version
```

- Folder names match `^[a-z][a-z0-9_]*$`; files are `v<n>.md` with `n` a positive integer.
- A file is the whole system prompt for that version: identity, values, hard rules, style, and the 6 to 10 example pairs (docs/08 §4). The context pack and the task never go in here: they are the user turn, XML-delimited, built by the caller.
- The `prompt_version` written to `llm_calls` and `deliveries` is `<folder>@v<n>`, for example `note_composer@v3`.

## Changing a prompt

1. Never edit a version in place once it has produced a note anyone saw. Add `v<n+1>.md`.
2. `npm run eval` must pass on the new version before merge (golden persona set, docs/08 §8); avoid-list violations must be 0.
3. The caller switches the version it loads in its own ticket; staging promotes to production by tag, never by editing (docs/22 §7).
4. Length limits inside a prompt are the numbers in docs/08 §5.8 and `packages/shared/limits.ts`; state the same numbers, never others.

## Prompt caching

`LLMClient` puts one cache breakpoint on the prompt file. The API creates no cache entry under a minimum prefix length that depends on the model, and says nothing when it does not:

| Tier | Model | Minimum cacheable prefix |
|---|---|---|
| fast | Haiku 4.5 | 4 096 tokens |
| writer | Sonnet 5 | 1 024 tokens |
| deep | Opus 5.5 | 512 tokens |

`LLMClient` warns once per prompt and model when the file is under the minimum (a rough estimate, four characters per token). The example pairs are what push the writer prompts past it (docs/08 §4). A prompt for the fast tier is normally short, so it is not cached; that is expected, and `cache_read_input_tokens` of 0 on the safety step is not a bug. On the daily composer in staging it must be non-zero (docs/21 §16.3).

## Deploying the files

Edge Functions read the files at runtime with `Deno.readTextFile`, relative to `_shared/llm/prompts.ts`. For the files to ship with a function, the function's entry in `supabase/config.toml` must list them:

```toml
[functions.onboarding-complete]
static_files = ["./functions/_shared/prompts/**/*.md"]
```

A function that forgets this fails at the first call with a clear "prompt ... is missing" error rather than sending an empty system prompt. The first function to ship (M2-03) adds the entry; the eval harness (M1-07) reads the same files directly.

## What a prompt never contains

User-written text, user identifiers, email addresses, or anything from a specific account. The system prefix is identical for every user; that is what makes it cacheable and what keeps user text in the data position (docs/08 §4, principle 2).
