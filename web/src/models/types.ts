// Core domain types, ported 1:1 from the iOS app's Swift models so both
// versions agree on behavior (see ../../../DebtCompass/DebtCompass/Models).

export type ExpenseCategory =
  | "housing"
  | "utilities"
  | "groceries"
  | "transportation"
  | "clothing"
  | "subscriptions"
  | "insurance"
  | "medical"
  | "childcare"
  | "entertainment"
  | "creditCard"
  | "personalLoan"
  | "lineOfCredit"
  | "studentLoan"
  | "autoLoan"
  | "other";

// Categories a user adds by hand in the Expenses screen. Debt-payment
// categories are derived automatically from the Debts screen so a minimum
// payment is never counted twice.
export const MANUAL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "housing",
  "utilities",
  "groceries",
  "transportation",
  "clothing",
  "subscriptions",
  "insurance",
  "medical",
  "childcare",
  "entertainment",
  "other",
];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  housing: "Housing",
  utilities: "Utilities",
  groceries: "Groceries",
  transportation: "Transportation",
  clothing: "Clothing",
  subscriptions: "Subscriptions",
  insurance: "Insurance",
  medical: "Medical",
  childcare: "Childcare",
  entertainment: "Entertainment",
  creditCard: "Credit Cards",
  personalLoan: "Personal Loans",
  lineOfCredit: "Lines of Credit",
  studentLoan: "Student Loans",
  autoLoan: "Auto Loans",
  other: "Other",
};

export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  housing: "#3b82f6",
  utilities: "#eab308",
  groceries: "#22c55e",
  transportation: "#f97316",
  clothing: "#ec4899",
  subscriptions: "#a855f7",
  insurance: "#14b8a6",
  medical: "#ef4444",
  childcare: "#10b981",
  entertainment: "#6366f1",
  creditCard: "#dc2626",
  personalLoan: "#92400e",
  lineOfCredit: "#0891b2",
  studentLoan: "#4f46e5",
  autoLoan: "#ea580c",
  other: "#6b7280",
};

export type DebtType =
  | "creditCard"
  | "personalLoan"
  | "lineOfCredit"
  | "studentLoan"
  | "autoLoan"
  | "mortgage"
  | "other";

export const DEBT_TYPES: DebtType[] = [
  "creditCard",
  "personalLoan",
  "lineOfCredit",
  "studentLoan",
  "autoLoan",
  "mortgage",
  "other",
];

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  creditCard: "Credit Card",
  personalLoan: "Personal Loan",
  lineOfCredit: "Line of Credit",
  studentLoan: "Student Loan",
  autoLoan: "Auto Loan",
  mortgage: "Mortgage",
  other: "Other Debt",
};

/** Where this debt type's minimum payment shows up in the category breakdown. */
export function debtExpenseCategory(type: DebtType): ExpenseCategory {
  switch (type) {
    case "creditCard":
      return "creditCard";
    case "personalLoan":
      return "personalLoan";
    case "lineOfCredit":
      return "lineOfCredit";
    case "studentLoan":
      return "studentLoan";
    case "autoLoan":
      return "autoLoan";
    case "mortgage":
      return "housing";
    case "other":
      return "other";
  }
}

/** Whether this debt type carries a revolving credit limit (used by velocity banking). */
export function debtTypeHasCreditLimit(type: DebtType): boolean {
  return type === "creditCard" || type === "lineOfCredit";
}

export type PayFrequency = "weekly" | "biWeekly" | "semiMonthly" | "monthly";

export const PAY_FREQUENCIES: PayFrequency[] = [
  "weekly",
  "biWeekly",
  "semiMonthly",
  "monthly",
];

export const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  weekly: "Weekly",
  biWeekly: "Every 2 Weeks",
  semiMonthly: "Twice a Month",
  monthly: "Monthly",
};

/** Number of paychecks a year, used to convert a per-paycheck figure to a monthly one. */
export function payPeriodsPerYear(frequency: PayFrequency): number {
  switch (frequency) {
    case "weekly":
      return 52;
    case "biWeekly":
      return 26;
    case "semiMonthly":
      return 24;
    case "monthly":
      return 12;
  }
}

export function payPeriodsPerMonth(frequency: PayFrequency): number {
  return payPeriodsPerYear(frequency) / 12;
}

export interface DeductionItem {
  id: string;
  name: string;
  /** Amount for a single pay period, as it appears on the paystub. */
  amountPerPaycheck: number;
}

export interface TaxWithholding {
  id: string;
  name: string;
  /** Amount for a single pay period, as it appears on the paystub. */
  amountPerPaycheck: number;
}

/**
 * An income source modeled directly off a real paystub: hourly or salaried
 * pay, overtime at 1.5x the base rate, itemized pretax deductions, itemized
 * taxes, and itemized post-tax deductions.
 */
export interface Paystub {
  id: string;
  employerName: string;
  payFrequency: PayFrequency;
  isSalaried: boolean;
  /** Base salary for one pay period, used only when isSalaried is true. */
  salaryPerPaycheck: number;
  /** Base hourly rate, used only when isSalaried is false. */
  hourlyRate: number;
  regularHours: number;
  /** Hours worked beyond the regular schedule, paid at 1.5x hourlyRate. */
  overtimeHours: number;
  /** Anything else on the paystub that adds to gross pay: bonus, commission, tips, holiday pay. */
  otherGrossPay: number;
  pretaxDeductions: DeductionItem[];
  taxes: TaxWithholding[];
  postTaxDeductions: DeductionItem[];
  createdAt: number;
}

export function overtimeRate(p: Paystub): number {
  return p.hourlyRate * 1.5;
}

export function regularPay(p: Paystub): number {
  return p.isSalaried ? 0 : p.hourlyRate * p.regularHours;
}

export function overtimePay(p: Paystub): number {
  return p.isSalaried ? 0 : overtimeRate(p) * p.overtimeHours;
}

export function grossPay(p: Paystub): number {
  const base = p.isSalaried ? p.salaryPerPaycheck : regularPay(p) + overtimePay(p);
  return base + p.otherGrossPay;
}

export function totalPretaxDeductions(p: Paystub): number {
  return p.pretaxDeductions.reduce((sum, d) => sum + d.amountPerPaycheck, 0);
}

export function taxableIncome(p: Paystub): number {
  return Math.max(0, grossPay(p) - totalPretaxDeductions(p));
}

export function totalTaxes(p: Paystub): number {
  return p.taxes.reduce((sum, t) => sum + t.amountPerPaycheck, 0);
}

export function totalPostTaxDeductions(p: Paystub): number {
  return p.postTaxDeductions.reduce((sum, d) => sum + d.amountPerPaycheck, 0);
}

export function netPay(p: Paystub): number {
  return taxableIncome(p) - totalTaxes(p) - totalPostTaxDeductions(p);
}

function periodsPerMonth(p: Paystub): number {
  return payPeriodsPerMonth(p.payFrequency);
}

export function monthlyGrossPay(p: Paystub): number {
  return grossPay(p) * periodsPerMonth(p);
}

export function monthlyPretaxDeductions(p: Paystub): number {
  return totalPretaxDeductions(p) * periodsPerMonth(p);
}

export function monthlyTaxes(p: Paystub): number {
  return totalTaxes(p) * periodsPerMonth(p);
}

export function monthlyPostTaxDeductions(p: Paystub): number {
  return totalPostTaxDeductions(p) * periodsPerMonth(p);
}

export function monthlyNetPay(p: Paystub): number {
  return netPay(p) * periodsPerMonth(p);
}

export function makePaystub(overrides: Partial<Paystub> = {}): Paystub {
  return {
    id: crypto.randomUUID(),
    employerName: "",
    payFrequency: "biWeekly",
    isSalaried: false,
    salaryPerPaycheck: 0,
    hourlyRate: 0,
    regularHours: 0,
    overtimeHours: 0,
    otherGrossPay: 0,
    pretaxDeductions: [],
    taxes: [],
    postTaxDeductions: [],
    createdAt: Date.now(),
    ...overrides,
  };
}

/** A recurring monthly expense entered by hand (rent, groceries, a subscription, ...). */
export interface Expense {
  id: string;
  name: string;
  category: ExpenseCategory;
  monthlyAmount: number;
  notes: string;
  createdAt: number;
}

export function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: crypto.randomUUID(),
    name: "",
    category: "other",
    monthlyAmount: 0,
    notes: "",
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * A debt being tracked for payoff planning. This is the single source of
 * truth used both for the "cost per category" insight and for the
 * avalanche / snowball / velocity-banking simulations.
 */
export interface Debt {
  id: string;
  name: string;
  type: DebtType;
  balance: number;
  /** Annual percentage rate, as a decimal (e.g. 0.2499 for 24.99%). */
  apr: number;
  minimumPayment: number;
  /** Total revolving credit limit, relevant for credit cards and lines of credit. */
  creditLimit: number | null;
  createdAt: number;
}

export function debtMonthlyInterest(d: Debt): number {
  return Math.max(0, d.balance) * (d.apr / 12);
}

export function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: crypto.randomUUID(),
    name: "",
    type: "creditCard",
    balance: 0,
    apr: 0,
    minimumPayment: 0,
    creditLimit: null,
    createdAt: Date.now(),
    ...overrides,
  };
}
