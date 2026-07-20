# BookRoot Dictionary Format v1.0

The dictionary is static learning content. Personal review progress remains in `localStorage` or a future user database.

## Files

- `types/dictionary.ts` — TypeScript source of truth
- `data/dictionary/dictionary.schema.json` — JSON Schema for editors and CI
- `data/dictionary/template.json` — copy this when creating a new category file
- `data/dictionary/building-construction.sample.json` — complete example
- `lib/dictionary.ts` — lookup and search helpers

## Recommended file split

Do not put 1,000 entries into one giant file. Split them by trade or subject:

```text
data/dictionary/
  concrete.json
  masonry.json
  carpentry.json
  steelwork.json
  roofing.json
  waterproofing.json
  finishes.json
  services.json
  earthworks.json
  surveying.json
  whs.json
  contracts.json
```

Aim for 50–150 entries per file. This makes reviewing, merging and correcting easier.

## Required fields

Every entry must include:

- `id`: permanent unique ID, e.g. `bc-footing`
- `word`: learner-facing headword
- `slug`: URL-safe unique path
- `aliases`: plural forms, abbreviations and spelling variants
- `partOfSpeech`
- `domains`
- `tags`
- `level`
- `meaningZh`
- `definitionEn`
- at least one item in `examples`
- `status`, `version`, `createdAt`, `updatedAt`

## Editorial rules

1. Write original definitions and examples. Do not copy commercial dictionaries.
2. Use Australian spelling where appropriate: `reinforcement`, `metre`, `labour`.
3. Explain the professional meaning, not only the everyday meaning.
4. Use `whyThisWord` only when it genuinely helps memory.
5. Do not invent a word root. For compounds such as `formwork`, explain the compound parts instead.
6. Mark uncertain content as `draft`.
7. Change `status` to `reviewed` only after technical and language review.
8. Keep `id` stable forever. Increment `version` when meaningfully revising an entry.
9. Put inflections and abbreviations in `aliases`, not as duplicate entries, unless they have a distinct technical meaning.
10. Include Australian usage only when there is useful local context.

## Suggested workflow for 1,000 words

1. Create a master word list grouped by topic.
2. Remove duplicates and normalize spelling.
3. Produce 50–100 draft entries per batch.
4. Run schema and duplicate validation.
5. Review technical accuracy.
6. Review Chinese clarity and English naturalness.
7. Publish only reviewed entries.

## ID and slug convention

```text
id:   bc-safe-work-method-statement
slug: safe-work-method-statement
word: safe work method statement
aliases: ["SWMS"]
```

## Status meanings

- `draft`: generated or newly written; not checked
- `reviewed`: checked for language and technical accuracy
- `published`: approved for the public app
