# BookRoot CEFR vocabulary profiler

This version adds an AI-assisted vocabulary level profiler inspired by tools that group words by CEFR difficulty.

## What it does

- Evaluates saved vocabulary as A1, A2, B1, B2, C1, C2, or Off-list.
- Evaluates up to 40 missing words per API request and processes longer lists in batches.
- Saves each result in browser localStorage, so the same word is not evaluated repeatedly.
- Shows a CEFR distribution panel at the top of My Vocabulary.
- Shows a CEFR badge and bilingual explanation on each word card.
- Marks specialist terms as technical and may classify specialist compounds as Off-list.
- New bilingual dictionary generations also include a CEFR estimate automatically.

## Use

1. Add `OPENAI_API_KEY` and `OPENAI_DICTIONARY_MODEL` to `.env.local`.
2. Run `npm install` and `npm run dev`.
3. Open `/vocabulary`.
4. Click **Evaluate word levels** to profile all missing words, or click **Evaluate CEFR level** on one card.

CEFR values are AI estimates for learning guidance and are not official certification results.
