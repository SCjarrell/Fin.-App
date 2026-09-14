import SwiftUI
import Charts

struct StrategyDetailView: View {
    let result: PayoffPlanResult

    private var debtIDs: [UUID] {
        Array(result.debtNames.keys).sorted { (result.debtNames[$0] ?? "") < (result.debtNames[$1] ?? "") }
    }

    var body: some View {
        List {
            Section {
                LabeledContent("Debt-Free Date", value: debtFreeDateText)
                LabeledContent("Months to Payoff", value: "\(result.monthsToPayoff)")
                LabeledContent("Total Paid", value: result.totalPaid.asCurrency)
                LabeledContent("Total Interest Paid", value: result.totalInterestPaid.asCurrency)
            }

            if result.neverPaysOff {
                Section {
                    Label("At this payment level, interest accrues faster than it's paid down. Increase your extra monthly payment.",
                          systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                }
            }

            if !result.months.isEmpty {
                Section("Balance Over Time") {
                    Chart {
                        ForEach(debtIDs, id: \.self) { debtID in
                            ForEach(result.months) { month in
                                LineMark(
                                    x: .value("Month", month.month),
                                    y: .value("Balance", month.remainingBalanceByDebt[debtID] ?? 0)
                                )
                                .foregroundStyle(by: .value("Debt", result.debtNames[debtID] ?? "Debt"))
                            }
                        }
                    }
                    .frame(height: 220)
                }

                Section("Payoff Order") {
                    ForEach(payoffOrder, id: \.debtID) { entry in
                        HStack {
                            Text(result.debtNames[entry.debtID] ?? "Debt")
                            Spacer()
                            Text("Month \(entry.month)").foregroundStyle(.secondary)
                        }
                    }
                }

                Section("Monthly Schedule") {
                    ForEach(result.months) { month in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text("Month \(month.month)").font(.subheadline.bold())
                                Spacer()
                                Text("Balance: \(month.totalRemainingBalance.asCurrencyWhole)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            HStack {
                                Text("Paid \(month.totalPayment.asCurrency)")
                                Text("•")
                                Text("Interest \(month.totalInterest.asCurrency)")
                            }
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
        }
        .navigationTitle(result.strategy.displayName)
        .navigationBarTitleDisplayMode(.inline)
    }

    private var payoffOrder: [(debtID: UUID, month: Int)] {
        result.payoffMonthByDebt
            .map { ($0.key, $0.value) }
            .sorted { $0.1 < $1.1 }
    }

    private var debtFreeDateText: String {
        guard !result.months.isEmpty else { return "—" }
        guard let date = Calendar.current.date(byAdding: .month, value: result.monthsToPayoff, to: Date()) else {
            return "—"
        }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: date)
    }
}
