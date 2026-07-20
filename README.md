This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Built-in construction dictionary

This version includes 1,000 building and construction entries in `data/buildingDictionary.json`.
Open `/dictionary` to search by English, Chinese, or category. The PDF reader also detects matching dictionary terms in extracted PDF text.

## AI dictionary cache

This version adds an optional AI fallback to the dictionary page:

1. BookRoot searches the built-in 1,000-term dictionary.
2. It then checks AI entries previously saved in the browser.
3. Only missing terms show the **Generate with AI** button.
4. The generated structured explanation is saved to `localStorage` and reused next time.

### Setup

```bash
cp .env.example .env.local
```

Add your OpenAI API key to `.env.local`, then restart `npm run dev`.
Never use a `NEXT_PUBLIC_` prefix for the API key.

The current cache is local to one browser/device. For a public multi-user release, replace the browser cache with Supabase/Postgres while keeping the same cache-first flow.
