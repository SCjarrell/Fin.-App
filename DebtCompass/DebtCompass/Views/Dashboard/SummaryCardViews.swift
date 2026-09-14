import SwiftUI

struct StatCard: View {
    let title: String
    let value: String
    let systemImage: String
    var tint: Color = .accentColor
    var subtitle: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(title, systemImage: systemImage)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.title2.bold())
                .foregroundStyle(tint)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
            if let subtitle {
                Text(subtitle)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct CashFlowHeaderCard: View {
    let summary: MonthlyBudgetSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Monthly Cash Flow")
                .font(.headline)
                .foregroundStyle(.secondary)
            Text(summary.cashFlow.asCurrency)
                .font(.system(size: 40, weight: .bold, design: .rounded))
                .foregroundStyle(summary.isRunningDeficit ? .red : .green)

            HStack {
                VStack(alignment: .leading) {
                    Text("Net Income").font(.caption).foregroundStyle(.secondary)
                    Text(summary.totalNetIncome.asCurrency).font(.subheadline.bold())
                }
                Spacer()
                Image(systemName: "minus").foregroundStyle(.secondary)
                Spacer()
                VStack(alignment: .leading) {
                    Text("Expenses").font(.caption).foregroundStyle(.secondary)
                    Text(summary.totalExpenses.asCurrency).font(.subheadline.bold())
                }
            }

            if summary.isRunningDeficit {
                Label("You're spending more than you bring home this month.", systemImage: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
        .padding()
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}
