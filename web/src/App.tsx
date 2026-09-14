import { Route, HashRouter, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Debts from "./pages/Debts";
import Expenses from "./pages/Expenses";
import Income from "./pages/Income";
import Strategies from "./pages/Strategies";
import StrategyDetail from "./pages/StrategyDetail";
import { AppDataProvider } from "./store/AppDataContext";

export default function App() {
  return (
    <AppDataProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="income" element={<Income />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="debts" element={<Debts />} />
            <Route path="strategies" element={<Strategies />} />
            <Route path="strategies/:strategy" element={<StrategyDetail />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppDataProvider>
  );
}
