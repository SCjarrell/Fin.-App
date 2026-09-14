import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Debt, Expense, Paystub } from "../models/types";

const STORAGE_KEY = "debtcompass.appData.v1";

interface StoredData {
  paystubs: Paystub[];
  expenses: Expense[];
  debts: Debt[];
}

function loadInitial(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { paystubs: [], expenses: [], debts: [] };
    const parsed = JSON.parse(raw) as Partial<StoredData>;
    return {
      paystubs: parsed.paystubs ?? [],
      expenses: parsed.expenses ?? [],
      debts: parsed.debts ?? [],
    };
  } catch {
    return { paystubs: [], expenses: [], debts: [] };
  }
}

interface AppDataContextValue {
  paystubs: Paystub[];
  expenses: Expense[];
  debts: Debt[];

  addPaystub: (p: Paystub) => void;
  updatePaystub: (p: Paystub) => void;
  removePaystub: (id: string) => void;

  addExpense: (e: Expense) => void;
  updateExpense: (e: Expense) => void;
  removeExpense: (id: string) => void;

  addDebt: (d: Debt) => void;
  updateDebt: (d: Debt) => void;
  removeDebt: (id: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoredData>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage can be unavailable (private browsing, quota) — data just
      // won't persist across reloads in that case.
    }
  }, [data]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      paystubs: data.paystubs,
      expenses: data.expenses,
      debts: data.debts,

      addPaystub: (p) => setData((d) => ({ ...d, paystubs: [...d.paystubs, p] })),
      updatePaystub: (p) =>
        setData((d) => ({ ...d, paystubs: d.paystubs.map((x) => (x.id === p.id ? p : x)) })),
      removePaystub: (id) => setData((d) => ({ ...d, paystubs: d.paystubs.filter((x) => x.id !== id) })),

      addExpense: (e) => setData((d) => ({ ...d, expenses: [...d.expenses, e] })),
      updateExpense: (e) =>
        setData((d) => ({ ...d, expenses: d.expenses.map((x) => (x.id === e.id ? e : x)) })),
      removeExpense: (id) => setData((d) => ({ ...d, expenses: d.expenses.filter((x) => x.id !== id) })),

      addDebt: (deb) => setData((d) => ({ ...d, debts: [...d.debts, deb] })),
      updateDebt: (deb) => setData((d) => ({ ...d, debts: d.debts.map((x) => (x.id === deb.id ? deb : x)) })),
      removeDebt: (id) => setData((d) => ({ ...d, debts: d.debts.filter((x) => x.id !== id) })),
    }),
    [data]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within an AppDataProvider");
  return ctx;
}
