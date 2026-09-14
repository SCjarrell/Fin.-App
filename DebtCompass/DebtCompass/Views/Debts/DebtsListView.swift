import SwiftUI
import SwiftData

struct DebtsListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Debt.createdAt) private var debts: [Debt]
    @State private var draftDebt: Debt?
    @State private var editingDebt: Debt?

    private var totalBalance: Double { debts.reduce(0) { $0 + $1.balance } }
    private var totalMinimumPayments: Double { debts.reduce(0) { $0 + $1.minimumPayment } }
    private var blendedAPR: Double {
        guard totalBalance > 0 else { return 0 }
        return debts.reduce(0) { $0 + $1.balance * $1.apr } / totalBalance
    }

    var body: some View {
        List {
            if !debts.isEmpty {
                Section {
                    LabeledContent("Total Debt", value: totalBalance.asCurrency)
                    LabeledContent("Total Minimum Payments / mo", value: totalMinimumPayments.asCurrency)
                    LabeledContent("Blended APR", value: blendedAPR.asPercent)
                }
            }

            Section {
                ForEach(debts.sorted { $0.apr > $1.apr }) { debt in
                    Button {
                        editingDebt = debt
                    } label: {
                        DebtRow(debt: debt)
                    }
                    .buttonStyle(.plain)
                }
                .onDelete(perform: delete)
            } header: {
                if debts.isEmpty { Text("Debts") }
            }
        }
        .overlay {
            if debts.isEmpty {
                ContentUnavailableView("No Debts Tracked",
                                        systemImage: "creditcard",
                                        description: Text("Add every credit card, loan, and line of credit to unlock payoff strategies."))
            }
        }
        .navigationTitle("Debts")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    draftDebt = Debt()
                } label: {
                    Label("Add Debt", systemImage: "plus")
                }
            }
        }
        .sheet(item: $draftDebt) { debt in
            NavigationStack {
                AddEditDebtView(debt: debt, isNew: true) { modelContext.insert(debt) }
            }
        }
        .sheet(item: $editingDebt) { debt in
            NavigationStack {
                AddEditDebtView(debt: debt, isNew: false, onSave: {})
            }
        }
    }

    private func delete(at offsets: IndexSet) {
        let sorted = debts.sorted { $0.apr > $1.apr }
        for index in offsets { modelContext.delete(sorted[index]) }
    }
}

private struct DebtRow: View {
    let debt: Debt

    var body: some View {
        HStack {
            Image(systemName: debt.type.expenseCategory.systemImage)
                .foregroundStyle(debt.type.expenseCategory.color)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(debt.name.isEmpty ? debt.type.displayName : debt.name)
                    .foregroundStyle(.primary)
                Text("\(debt.type.displayName) • \(debt.apr.asPercent) APR")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(debt.balance.asCurrency).bold()
                Text("min \(debt.minimumPayment.asCurrency)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

#Preview {
    NavigationStack { DebtsListView() }
        .modelContainer(for: [Paystub.self, Expense.self, Debt.self], inMemory: true)
}
