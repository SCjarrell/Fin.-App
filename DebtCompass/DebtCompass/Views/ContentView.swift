import SwiftUI
import SwiftData

struct ContentView: View {
    var body: some View {
        TabView {
            NavigationStack { DashboardView() }
                .tabItem { Label("Dashboard", systemImage: "chart.pie.fill") }

            NavigationStack { IncomeListView() }
                .tabItem { Label("Income", systemImage: "dollarsign.circle.fill") }

            NavigationStack { ExpensesListView() }
                .tabItem { Label("Expenses", systemImage: "cart.fill") }

            NavigationStack { DebtsListView() }
                .tabItem { Label("Debts", systemImage: "creditcard.fill") }

            NavigationStack { StrategyComparisonView() }
                .tabItem { Label("Strategies", systemImage: "arrow.triangle.branch") }
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: [Paystub.self, Expense.self, Debt.self], inMemory: true)
}
