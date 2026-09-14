import SwiftUI
import SwiftData

struct AddEditDebtView: View {
    @Bindable var debt: Debt
    var isNew: Bool = false
    var onSave: () -> Void = {}

    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    @State private var aprPercentText: String = ""
    @State private var hasCreditLimit: Bool = false
    @State private var creditLimitValue: Double = 0

    var body: some View {
        Form {
            Section("Details") {
                TextField("Name (e.g. Chase Sapphire)", text: $debt.name)
                Picker("Type", selection: $debt.type) {
                    ForEach(DebtType.allCases) { type in
                        Text(type.displayName).tag(type)
                    }
                }
                CurrencyField("Current Balance", value: $debt.balance)
                CurrencyField("Minimum Monthly Payment", value: $debt.minimumPayment)
                HStack {
                    Text("Interest Rate (APR)")
                    Spacer()
                    TextField("0.00", text: $aprPercentText)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                        .onChange(of: aprPercentText) { _, newValue in
                            debt.apr = (Double(newValue) ?? 0) / 100
                        }
                    Text("%")
                }
            }

            if debt.type.hasCreditLimit {
                Section {
                    Toggle("Has a Credit Limit", isOn: $hasCreditLimit)
                    if hasCreditLimit {
                        CurrencyField("Credit Limit", value: $creditLimitValue)
                            .onChange(of: creditLimitValue) { _, newValue in
                                debt.creditLimit = newValue
                            }
                    }
                } footer: {
                    Text("Used to estimate available room for a velocity banking strategy.")
                }
            }
        }
        .navigationTitle(isNew ? "Add Debt" : "Edit Debt")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            aprPercentText = debt.apr > 0 ? String(format: "%.2f", debt.apr * 100) : ""
            if let limit = debt.creditLimit {
                hasCreditLimit = true
                creditLimitValue = limit
            }
        }
        .onChange(of: hasCreditLimit) { _, newValue in
            if !newValue { debt.creditLimit = nil }
        }
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    onSave()
                    dismiss()
                }
                .disabled(debt.name.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            if !isNew {
                ToolbarItem(placement: .destructiveAction) {
                    Button(role: .destructive) {
                        modelContext.delete(debt)
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
        AddEditDebtView(debt: Debt(name: "Visa", type: .creditCard, balance: 4200, apr: 0.2499, minimumPayment: 125, creditLimit: 6000),
                         isNew: true)
    }
    .modelContainer(for: [Paystub.self, Expense.self, Debt.self], inMemory: true)
}
