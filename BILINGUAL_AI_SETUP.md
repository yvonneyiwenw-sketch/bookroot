# BookRoot Bilingual AI + Application Images

Create `.env.local` beside `package.json`:

```env
OPENAI_API_KEY=your-secret-api-key
OPENAI_DICTIONARY_MODEL=gpt-5-mini
OPENAI_IMAGE_MODEL=gpt-image-2
```

Then restart:

```bash
npm install
npm run dev
```

## Behaviour

1. BookRoot checks the built-in dictionary.
2. It then checks AI explanations already saved in localStorage.
3. Only missing words show the bilingual AI generation button.
4. Generated text is saved and reused in the same browser.
5. Application images are optional and generated separately to avoid unnecessary cost.
6. Images are saved in IndexedDB in the same browser.

## Important

- Do not commit `.env.local` to GitHub.
- The image button costs more than the text explanation, so it is deliberately separate.
- Some OpenAI accounts may need organisation verification before GPT Image models are available.
