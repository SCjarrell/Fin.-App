import SwiftUI
import SwiftData
import Charts

struct DashboardView: View {
    @Query(sort: \Paystub.createdAt) private var paystubs: [Paystub]
    @Query(sort: \Expense.createdAt) private var expenses: [Expense]
    @Query(sort: \Debt.createdAt) private var debts: [Debt]

    private var summary: MonthlyBudgetSummary {
        BudgetCalculator.summarize(paystubs: paystubs, expenses: expenses, debts: debts)
    }

    private var sortedCategories: [(ExpenseCategory, Double)] {
        summary.expenseByCategory
            .filter { $0.value > 0 }
            .sorted { $0.value > $1.value }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                CashFlowHeaderCard(summary: summary)

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    StatCard(title: "Gross Income / mo", value: summary.totalGrossIncome.asCurrency,
                             systemImage: "banknote.fill", tint: .green)
                    StatCard(title: "Taxes Paid / mo", value: summary.totalTaxes.asCurrency,
                             systemImage: "building.columns.fill", tint: .orange)
                    StatCard(title: "Pretax Deductions / mo", value: summary.totalPretaxDeductions.asCurrency,
                             systemImage: "shield.lefthalf.filled", tint: .teal)
                    StatCard(title: "Post-Tax Deductions / mo", value: summary.totalPostTaxDeductions.asCurrency,
                             systemImage: "minus.circle.fill", tint: .purple)
                    StatCard(title: "Debt Interest / mo", value: summary.totalMonthlyDebtInterest.asCurrency,
                             systemImage: "percent", tint: .red,
                             subtitle: "at minimum-payment pace")
                    StatCard(title: "Total Debt", value: debts.reduce(0) { $0 + $1.balance }.asCurrency,
                             systemImage: "creditcard.fill", tint: .red)
                }

                if !sortedCategories.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Spending by Category")
                            .font(.headline)

                        Chart(sortedCategories, id: \.0) { item in
                            BarMark(
                                x: .value("Amount", item.1),
                                y: .value("Category", item.0.displayName)
                            )
                            .foregroundStyle(item.0.color.gradient)
                            .annotation(position: .trailing) {
                                Text(item.1.asCurrencyWhole)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .frame(height: CGFloat(sortedCategories.count) * 34 + 20)
                        .chartXAxis(.hidden)
                    }
                    .padding()
                    .background(.background.secondary, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                } else {
                    ContentUnavailableView("No Expenses Yet",
                                            systemImage: "cart",
                                            description: Text("Add income, expenses, and debts to see your full financial picture."))
                        .padding(.top, 40)
                }

                NavigationLink {
                    StrategyComparisonView()
                } label: {
                    Label("Compare Debt Payoff Strategies", systemImage: "arrow.triangle.branch")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.accentColor, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .foregroundStyle(.white)
                }
            }
            .padding()
        }
        .navigationTitle("Dashboard")
    }
}

#Preview {
    NavigationStack { DashboardView() }
        .modelContainer(for: [Paystub.self, Expense.self, Debt.self], inMemory: true)
}
