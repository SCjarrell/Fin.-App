import SwiftUI
import SwiftData

struct AddEditExpenseView: View {
    @Bindable var expense: Expense
    var isNew: Bool = false
    var onSave: () -> Void = {}

    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        Form {
            Section("Details") {
                TextField("Name (e.g. Electric Bill)", text: $expense.name)
                Picker("Category", selection: $expense.category) {
                    ForEach(ExpenseCategory.manualCases) { category in
                        Label(category.displayName, systemImage: category.systemImage).tag(category)
                    }
                }
                CurrencyField("Monthly Amount", value: $expense.monthlyAmount)
                TextField("Notes (optional)", text: $expense.notes)
            }
        }
        .navigationTitle(isNew ? "Add Expense" : "Edit Expense")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    onSave()
                    dismiss()
                }
                .disabled(expense.name.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            if !isNew {
                ToolbarItem(placement: .destructiveAction) {
                    Button(role: .destructive) {
                        modelContext.delete(expense)
                        dismiss()
                    } label: {
                        Image(systemName: "trash")
                    }
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        AddEditExpenseView(expense: Expense(name: "Groceries", category: .groceries, monthlyAmount: 500), isNew: true)
    }
    .modelContainer(for: [Paystub.self, Expense.self, Debt.self], inMemory: true)
}
