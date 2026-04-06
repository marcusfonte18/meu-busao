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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Build do app (Capacitor / Android)

O app usa export estático (sem servidor Next no dispositivo). A **busca e os dados** vêm da API em produção.

1. Faça o deploy do projeto na web (ex.: Vercel) para ter a API disponível em uma URL (ex: `https://meubusao.vercel.app`).
2. Defina a URL da API ao buildar o app:
   - No `.env`: `NEXT_PUBLIC_API_URL=https://sua-url-de-producao.com`
   - Ou na hora: `NEXT_PUBLIC_API_URL=https://sua-url-de-producao.com pnpm build:app`
3. Rode o build do app: `pnpm build:app`

Sem `NEXT_PUBLIC_API_URL` o script de build do app falha e mostra instruções.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
