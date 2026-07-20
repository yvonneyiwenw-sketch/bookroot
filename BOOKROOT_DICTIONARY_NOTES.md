# BookRoot built-in dictionary

This version adds a local, no-AI professional dictionary with 100 curated terms across:

- Construction
- Landscape Architecture
- Planning
- Horticulture
- WHS / Site English

## New routes

- `/dictionary` — browse and search all entries
- `/dictionary/[word]` — full word entry
- `/vocabulary` — locally saved words

## Reader integration

The PDF reader now extracts text from the full selectable-text PDF, counts matching built-in dictionary words, and lets the user open or save each matched term.

## Data files

- `data/dictionary.ts`
- `types/dictionary.ts`
- `lib/dictionary.ts`

Saved words use the browser key `bookroot-saved-dictionary-v1`.

## Validation

- `npm run lint` passed
- `npm run build` passed

Scanned PDFs still require OCR, which is not included in this version.
