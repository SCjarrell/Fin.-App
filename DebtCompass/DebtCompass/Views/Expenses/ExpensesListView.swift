import SwiftUI
import SwiftData

struct ExpensesListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Expense.createdAt) private var expenses: [Expense]
    @State private var draftExpense: Expense?
    @State private var editingExpense: Expense?

    private var groupedByCategory: [(category: ExpenseCategory, expenses: [Expense])] {
        let groups = Dictionary(grouping: expenses, by: \.category)
        return ExpenseCategory.manualCases.compactMap { category in
            guard let items = groups[category], !items.isEmpty else { return nil }
            return (category, items.sorted { $0.monthlyAmount > $1.monthlyAmount })
        }
    }

    private var totalMonthly: Double { expenses.reduce(0) { $0 + $1.monthlyAmount } }

    var body: some View {
        List {
            if !expenses.isEmpty {
                Section {
                    HStack {
                        Text("Total Monthly Expenses")
                        Spacer()
                        Text(totalMonthly.asCurrency).bold()
                    }
                }
            }

            ForEach(groupedByCategory, id: \.category) { group in
                Section {
                    ForEach(group.expenses) { expense in
                        Button {
                            editingExpense = expense
                        } label: {
                            ExpenseRow(expense: expense)
                        }
                        .buttonStyle(.plain)
                    }
                    .onDelete { offsets in delete(offsets, in: group.expenses) }
                } header: {
                    Label(group.category.displayName, systemImage: group.category.systemImage)
                }
            }

            Section {
                NavigationLink {
                    DebtsListView()
                } label: {
                    Label("Debt minimum payments are tracked in the Debts tab", systemImage: "info.circle")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .overlay {
            if expenses.isEmpty {
                ContentUnavailableView("No Expenses Yet",
                                        systemImage: "cart",
                                        description: Text("Add your monthly bills — utilities, groceries, housing, subscriptions, and more."))
            }
        }
        .navigationTitle("Expenses")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    draftExpense = Expense()
                } label: {
                    Label("Add Expense", systemImage: "plus")
                }
            }
        }
        .sheet(item: $draftExpense) { expense in
            NavigationStack {
                AddEditExpenseView(expense: expense, isNew: true) { modelContext.insert(expense) }
            }
        }
        .sheet(item: $editingExpense) { expense in
            NavigationStack {
                AddEditExpenseView(expense: expense, isNew: false, onSave: {})
            }
        }
    }

    private func delete(_ offsets: IndexSet, in items: [Expense]) {
        for index in offsets { modelContext.delete(items[index]) }
    }
}

private struct ExpenseRow: View {
    let expense: Expense

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(expense.name.isEmpty ? "Untitled Expense" : expense.name)
                    .foregroundStyle(.primary)
                if !expense.notes.isEmpty {
                    Text(expense.notes).font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
            Text(expense.monthlyAmount.asCurrency)
                .foregroundStyle(.primary)
        }
    }
}

#Preview {
    NavigationStack { ExpensesListView() }
        .modelContainer(for: [Paystub.self, Expense.self, Debt.self], inMemory: true)
}
