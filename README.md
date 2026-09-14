# DebtCompass

A native iOS/iPadOS app (SwiftUI + SwiftData) that helps you get out of debt: track
income and expenses, see your real monthly cash flow, and compare debt avalanche,
debt snowball, and velocity banking payoff strategies side by side.

## Features

- **Income, calculated from a real paystub** — enter hourly rate, regular hours,
  and overtime hours (paid automatically at 1.5x the base rate), or a flat
  salary. Itemize pretax deductions (401(k), health insurance, HSA), taxes
  (federal, state, local, Social Security, Medicare), and post-tax deductions
  (Roth, garnishments, union dues) exactly as they appear on the paystub. The
  app calculates gross pay, taxable income, and net pay, and converts any pay
  frequency (weekly, bi-weekly, semi-monthly, monthly) into a monthly figure.
- **Expenses by category** — housing, utilities, groceries, transportation,
  clothing, subscriptions, insurance, medical, childcare, entertainment, and
  more.
- **Debts as a single source of truth** — every credit card, personal loan,
  line of credit, student loan, auto loan, and mortgage is tracked with its
  balance, APR, and minimum payment. Debt minimum payments automatically flow
  into the budget and the category breakdown, so they're never entered twice.
- **Monthly cash flow** — net income minus every expense (including debt
  minimums) shows exactly how much is left over each month to put toward
  accelerated payoff.
- **Three payoff strategies, simulated month by month:**
  - **Debt Avalanche** — extra cash always attacks the highest-APR debt first,
    minimizing total interest paid.
  - **Debt Snowball** — extra cash always attacks the smallest balance first,
    for quick psychological wins.
  - **Velocity Banking** — routes debt through a line of credit in large
    chunks, then aggressively pays down the line of credit with all available
    cash flow before moving to the next debt. This is a simplified model —
    real-world velocity banking results depend heavily on the day-to-day
    timing of cash flow through the line of credit, which a monthly
    simulation can only approximate. It is provided for comparison and
    education, not as financial advice.
  - All three strategies correctly roll a paid-off debt's freed-up minimum
    payment into the next target, which is what makes them accelerate over
    time.
- **Insight dashboard** — monthly gross income, taxes withheld, pretax/post-tax
  deductions, estimated debt interest accruing this month, total debt, and a
  spending-by-category chart, all in one place.

## Project Structure

```
DebtCompass/
  DebtCompass.xcodeproj/        Xcode project (open this in Xcode)
  DebtCompass/
    DebtCompassApp.swift        App entry point, SwiftData model container
    Models/                     Paystub, Expense, Debt + supporting types
    Engine/                     BudgetCalculator, DebtPayoffEngine (pure Swift, unit-tested)
    Extensions/                 Currency/percent formatting helpers
    Views/
      Dashboard/                Monthly summary, insights, category chart
      Income/                   Paystub list + entry form
      Expenses/                 Expense list + entry form
      Debts/                    Debt list + entry form
      Strategies/               Strategy comparison + month-by-month schedule
  DebtCompassTests/             XCTest coverage for payroll math, budget
                                 aggregation, and the payoff simulations
```

## Requirements

- Xcode 15 or later
- iOS 17+ (the app uses SwiftData, which requires iOS 17)

## Getting Started

1. Open `DebtCompass/DebtCompass.xcodeproj` in Xcode.
2. Select the `DebtCompass` scheme and a simulator (or your device).
3. In the target's **Signing & Capabilities** tab, choose your own team if
   running on a physical device (Automatic signing is already enabled).
4. Build and run (`⌘R`). Run the tests with `⌘U`.

All data is stored locally on-device via SwiftData — nothing is sent to a
server, and none of this constitutes financial, investment, or tax advice.

## How the numbers work

- **Overtime** is always base hourly rate × 1.5, applied to overtime hours
  entered on the paystub.
- **Cash flow** = total net income (across all income sources) − total
  expenses (manual categories + every tracked debt's minimum payment).
- **Extra monthly payment** for the strategies defaults to that cash flow,
  and is editable on the Strategies screen.
- **Debt interest this month** is estimated as `balance × APR ÷ 12` for each
  tracked debt, summed.
- The payoff simulations accrue interest monthly, apply minimum payments,
  then apply the extra payment pool (plus any minimums freed by debts already
  paid off) according to the selected strategy's priority order, until every
  balance reaches zero (capped at 50 years to guard against a payment plan
  that can't keep up with interest).
