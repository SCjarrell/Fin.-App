import { describe, expect, it } from "vitest";
import {
  grossPay,
  makePaystub,
  monthlyGrossPay,
  netPay,
  overtimePay,
  overtimeRate,
  regularPay,
  taxableIncome,
} from "./types";

describe("Paystub math", () => {
  it("calculates overtime at 1.5x the base rate", () => {
    const p = makePaystub({ payFrequency: "biWeekly", hourlyRate: 20, regularHours: 80, overtimeHours: 10 });
    expect(overtimeRate(p)).toBeCloseTo(30, 3);
    expect(overtimePay(p)).toBeCloseTo(300, 3); // 10 hrs * $30
    expect(regularPay(p)).toBeCloseTo(1600, 3); // 80 hrs * $20
    expect(grossPay(p)).toBeCloseTo(1900, 3);
  });

  it("matches regular pay only when there is no overtime", () => {
    const p = makePaystub({ payFrequency: "weekly", hourlyRate: 25, regularHours: 40, overtimeHours: 0 });
    expect(overtimePay(p)).toBe(0);
    expect(grossPay(p)).toBeCloseTo(1000, 3);
  });

  it("ignores hourly fields for a salaried paystub", () => {
    const p = makePaystub({
      payFrequency: "semiMonthly",
      isSalaried: true,
      salaryPerPaycheck: 2500,
      hourlyRate: 999,
      regularHours: 999,
      overtimeHours: 999,
    });
    expect(grossPay(p)).toBeCloseTo(2500, 3);
  });

  it("subtracts pretax deductions, taxes, and post-tax deductions from net pay", () => {
    const p = makePaystub({
      payFrequency: "biWeekly",
      hourlyRate: 30,
      regularHours: 80,
      overtimeHours: 0,
      pretaxDeductions: [
        { id: "1", name: "401k", amountPerPaycheck: 120 },
        { id: "2", name: "Health", amountPerPaycheck: 80 },
      ],
      taxes: [
        { id: "3", name: "Federal", amountPerPaycheck: 300 },
        { id: "4", name: "FICA", amountPerPaycheck: 150 },
      ],
      postTaxDeductions: [{ id: "5", name: "Roth", amountPerPaycheck: 50 }],
    });
    // Gross: 2400. Pretax: 200 -> taxable 2200. Taxes: 450. Post-tax: 50.
    expect(grossPay(p)).toBeCloseTo(2400, 3);
    expect(taxableIncome(p)).toBeCloseTo(2200, 3);
    expect(netPay(p)).toBeCloseTo(1700, 3);
  });

  it("converts to a monthly figure using pay periods per year over twelve", () => {
    const p = makePaystub({ payFrequency: "biWeekly", hourlyRate: 25, regularHours: 80, overtimeHours: 0 });
    // 2000/paycheck * 26 periods / 12 months
    expect(monthlyGrossPay(p)).toBeCloseTo((2000 * 26) / 12, 2);
  });

  it("never lets taxable income go negative when deductions exceed gross pay", () => {
    const p = makePaystub({
      payFrequency: "weekly",
      hourlyRate: 10,
      regularHours: 10,
      overtimeHours: 0,
      pretaxDeductions: [{ id: "1", name: "Huge", amountPerPaycheck: 500 }],
    });
    expect(taxableIncome(p)).toBe(0);
  });
});
