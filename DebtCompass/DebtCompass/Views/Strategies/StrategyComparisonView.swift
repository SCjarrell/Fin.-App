import SwiftUI
import SwiftData
import Charts

struct StrategyComparisonView: View {
    @Query private var paystubs: [Paystub]
    @Query private var expenses: [Expense]
    @Query(sort: \Debt.createdAt) private var debts: [Debt]

    @State private var extraPaymentText: String = ""
    @State private var hasCustomizedExtraPayment = false
    @State private var locAPRText: String = "10.00"
    @State private var locLimitText: String = ""

    private var summary: MonthlyBudgetSummary {
        BudgetCalculator.summarize(paystubs: paystubs, expenses: expenses, debts: debts)
    }

    private var extraMonthlyPayment: Double {
        Double(extraPaymentText) ?? 0
    }

    private var lineOfCreditAPR: Double { (Double(locAPRText) ?? 0) / 100 }
    private var lineOfCreditLimit: Double { Double(locLimitText) ?? 0 }

    private var results: [PayoffPlanResult] {
        guard !debts.isEmpty else { return [] }
        return [
            DebtPayoffEngine.simulateAvalanche(debts: debts, extraMonthlyPayment: extraMonthlyPayment),
            DebtPayoffEngine.simulateSnowball(debts: debts, extraMonthlyPayment: extraMonthlyPayment),
            DebtPayoffEngine.simulateVelocityBanking(debts: debts, extraMonthlyPayment: extraMonthlyPayment,
                                                      lineOfCreditAPR: lineOfCreditAPR,
                                                      lineOfCreditLimit: lineOfCreditLimit)
        ]
    }

    private var fastestStrategy: PayoffStrategy? {
        results.filter { !$0.neverPaysOff }.min { $0.monthsToPayoff < $1.monthsToPayoff }?.strategy
    }

    private var cheapestStrategy: PayoffStrategy? {
        results.filter { !$0.neverPaysOff }.min { $0.totalInterestPaid < $1.totalInterestPaid }?.strategy
    }

    var body: some View {
        Group {
            if debts.isEmpty {
                ContentUnavailableView("Add Debts to Compare Strategies",
                                        systemImage: "arrow.triangle.branch",
                                        description: Text("Once your debts are entered, you'll see avalanche, snowball, and velocity banking side by side."))
            } else {
                ScrollView {
                    VStack(spacing: 16) {
                        extraPaymentCard
                        velocityBankingAssumptionsCard

                        if !results.contains(where: { $0.neverPaysOff }) {
                            balanceOverTimeChart
                        }

                        ForEach(results, id: \.strategy) { result in
                            NavigationLink {
                                StrategyDetailView(result: result)
                            } label: {
                                StrategyCard(result: result,
                                             isFastest: result.strategy == fastestStrategy,
                                             isCheapest: result.strategy == cheapestStrategy)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Payoff Strategies")
        .onAppear {
            if !hasCustomizedExtraPayment {
                extraPaymentText = String(format: "%.0f", max(0, summary.cashFlow))
            }
            if locLimitText.isEmpty {
                let existingLOC = debts.first { $0.type == .lineOfCredit }
                locLimitText = String(format: "%.0f", existingLOC?.creditLimit ?? max(5000, debts.reduce(0) { $0 + $1.balance }))
                if let existingLOC, existingLOC.apr > 0 {
                    locAPRText = String(format: "%.2f", existingLOC.apr * 100)
                }
            }
        }
    }

    private var extraPaymentCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Extra Monthly Payment")
                .font(.headline)
            Text("Your current monthly cash flow is \(summary.cashFlow.asCurrency). This is how much extra you can put toward debt beyond the minimums.")
                .font(.caption)
                .foregroundStyle(.secondary)
            HStack {
                Text("$")
                TextField("0", text: $extraPaymentText)
                    .keyboardType(.numberPad)
                    .onChange(of: extraPaymentText) { _, _ in hasCustomizedExtraPayment = true }
                    .textFieldStyle(.roundedBorder)
            }
        }
        .padding()
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var velocityBankingAssumptionsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Velocity Banking Assumptions")
                .font(.headline)
            Text("Velocity banking needs a line of credit to cycle debt through.")
                .font(.caption)
                .foregroundStyle(.secondary)
            HStack {
                Text("APR")
                TextField("10.00", text: $locAPRText)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.roundedBorder)
                Text("%")
            }
            HStack {
                Text("Credit Limit")
                Text("$")
                TextField("0", text: $locLimitText)
                    .keyboardType(.numberPad)
                    .textFieldStyle(.roundedBorder)
            }
        }
        .padding()
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var balanceOverTimeChart: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Total Debt Remaining Over Time")
                .font(.headline)
            Chart {
                ForEach(results, id: \.strategy) { result in
                    ForEach(result.months) { month in
                        LineMark(
                            x: .value("Month", month.month),
                            y: .value("Balance", month.totalRemainingBalance)
                        )
                        .foregroundStyle(by: .value("Strategy", result.strategy.displayName))
                    }
                }
            }
            .chartXAxisLabel("Months")
            .chartYAxisLabel("Remaining Balance")
            .frame(height: 220)
        }
        .padding()
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private struct StrategyCard: View {
    let result: PayoffPlanResult
    let isFastest: Bool
    let isCheapest: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(result.strategy.displayName)
                    .font(.title3.bold())
                Spacer()
                if isFastest {
                    Badge(text: "Fastest", color: .blue)
                }
                if isCheapest {
                    Badge(text: "Least Interest", color: .green)
                }
            }

            Text(result.strategy.summary)
                .font(.caption)
                .foregroundStyle(.secondary)

            if result.neverPaysOff {
                Label("Minimum payments don't cover interest — increase your extra payment.", systemImage: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundStyle(.red)
            } else {
                HStack {
                    VStack(alignment: .leading) {
                        Text("Debt-Free In").font(.caption).foregroundStyle(.secondary)
                        let ym = result.yearsAndMonthsToPayoff
                        Text(ym.years > 0 ? "\(ym.years)y \(ym.months)m" : "\(ym.months)m")
                            .font(.headline)
                    }
                    Spacer()
                    VStack(alignment: .leading) {
                        Text("Total Interest").font(.caption).foregroundStyle(.secondary)
                        Text(result.totalInterestPaid.asCurrencyWhole).font(.headline)
                    }
                    Spacer()
                    Image(systemName: "chevron.right").foregroundStyle(.tertiary)
                }
            }
        }
        .padding()
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private struct Badge: View {
    let text: String
    let color: Color
    var body: some View {
        Text(text)
            .font(.caption2.bold())
            .padding(.horizontal, 8).padding(.vertical, 4)
            .background(color.opacity(0.15), in: Capsule())
            .foregroundStyle(color)
    }
}

#Preview {
    NavigationStack { StrategyComparisonView() }
        .modelContainer(for: [Paystub.self, Expense.self, Debt.self], inMemory: true)
}
