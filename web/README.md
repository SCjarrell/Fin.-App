# DebtCompass (Web)

A browser-based version of the DebtCompass debt payoff planner — same income,
expense, debt, and payoff-strategy logic as the iOS app, running anywhere a
modern browser runs (Windows, macOS, Linux, ChromeOS, mobile). No install,
no account, no server: all data is stored locally in the browser via
`localStorage` and never leaves the device.

See the [repo-level README](../README.md) for what the app does. This
document covers only how to run and build the web version.

## Requirements

- [Node.js](https://nodejs.org/) 20+ (works the same on Windows, macOS, and Linux)

## Run it locally

```bash
cd web
npm install
npm run dev
```

Then open the printed `http://localhost:5173` URL in any browser. On Windows,
run the same two commands from PowerShell or Command Prompt after installing
Node from nodejs.org — no other setup needed.

## Build a static bundle

```bash
npm run build
```

Output lands in `web/dist/` — a handful of static files (HTML/CSS/JS) you can
host anywhere: GitHub Pages, Netlify, Vercel, a plain S3 bucket, or just open
`dist/index.html`'s server via `npm run preview` locally. There is no backend
to deploy.

## Deploying to GitHub Pages

`.github/workflows/web-deploy.yml` builds and publishes `web/` to GitHub
Pages automatically on every push to `main` that touches the `web/`
directory. It needs to be turned on once: in the repository's **Settings →
Pages**, set **Source** to **GitHub Actions**. After that, the workflow's
job summary links to the live URL.

## Project structure

```
web/
  src/
    models/types.ts        Paystub, Expense, Debt + derived math (overtime, net pay, ...)
    engine/
      budgetCalculator.ts  Income/expense aggregation, cash flow, category breakdown
      debtPayoffEngine.ts  Avalanche / snowball / velocity-banking simulations
      payoffStrategy.ts    Shared result types
    store/AppDataContext.tsx  localStorage-backed React context (the app's only "database")
    pages/                Dashboard, Income, Expenses, Debts, Strategies, StrategyDetail
    components/           Shared UI: Layout, Modal, StatCard, CurrencyInput
```

The `models` and `engine` code is a straight port of the iOS app's Swift
model/engine layer (`../DebtCompass/DebtCompass/{Models,Engine}`) — same
formulas, same test cases (see `*.test.ts` files next to the code they
cover), so both versions agree on every calculation.

## Testing

```bash
npm test        # Vitest — engine/model unit tests
npx tsc -b      # type check
```
