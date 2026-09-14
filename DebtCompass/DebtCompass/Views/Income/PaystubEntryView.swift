import SwiftUI
import SwiftData

struct PaystubEntryView: View {
    @Bindable var paystub: Paystub
    var isNew: Bool = false
    var onSave: () -> Void = {}

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Form {
            Section("Paystub") {
                TextField("Employer / Source Name", text: $paystub.employerName)
                Picker("Pay Frequency", selection: $paystub.payFrequency) {
                    ForEach(PayFrequency.allCases) { frequency in
                        Text(frequency.displayName).tag(frequency)
                    }
                }
                Toggle("Salaried", isOn: $paystub.isSalaried)
            }

            if paystub.isSalaried {
                Section("Salary") {
                    CurrencyField("Salary per Paycheck", value: $paystub.salaryPerPaycheck)
                }
            } else {
                Section("Hourly Pay") {
                    CurrencyField("Base Hourly Rate", value: $paystub.hourlyRate)
                    HoursField("Regular Hours per Period", value: $paystub.regularHours)
                    HoursField("Overtime Hours per Period", value: $paystub.overtimeHours)
                    if paystub.overtimeHours > 0 {
                        HStack {
                            Text("Overtime Rate (1.5x)")
                            Spacer()
                            Text(paystub.overtimeRate.asCurrency).foregroundStyle(.secondary)
                        }
                        HStack {
                            Text("Overtime Pay")
                            Spacer()
                            Text(paystub.overtimePay.asCurrency).foregroundStyle(.secondary)
                        }
                    }
                }
            }

            Section("Other Gross Pay") {
                CurrencyField("Bonus / Commission / Tips", value: $paystub.otherGrossPay)
            }

            Section {
                HStack {
                    Text("Gross Pay per Paycheck")
                    Spacer()
                    Text(paystub.grossPay.asCurrency).bold()
                }
                HStack {
                    Text("Gross Pay per Month")
                    Spacer()
                    Text(paystub.monthlyGrossPay.asCurrency).foregroundStyle(.secondary)
                }
            }

            DeductionSection(title: "Pretax Deductions",
                              helpText: "401(k), health insurance, HSA/FSA, and other deductions taken before taxes.",
                              items: $paystub.pretaxDeductions)

            TaxSection(items: $paystub.taxes)

            DeductionSection(title: "Post-Tax Deductions",
                              helpText: "Roth contributions, union dues, wage garnishments, and other after-tax deductions.",
                              items: $paystub.postTaxDeductions)

            Section("Take-Home Pay") {
                HStack {
                    Text("Net Pay per Paycheck")
                    Spacer()
                    Text(paystub.netPay.asCurrency).bold().foregroundStyle(.green)
                }
                HStack {
                    Text("Net Pay per Month")
                    Spacer()
                    Text(paystub.monthlyNetPay.asCurrency).bold().foregroundStyle(.green)
                }
            }
        }
        .navigationTitle(isNew ? "Add Income" : "Edit Income")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if isNew {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave()
                        dismiss()
                    }
                }
            }
        }
    }
}

private struct DeductionSection: View {
    let title: String
    let helpText: String
    @Binding var items: [DeductionItem]

    var body: some View {
        Section {
            ForEach($items) { $item in
                HStack {
                    TextField("Name", text: $item.name)
                    Spacer()
                    CurrencyField("Amount", value: $item.amountPerPaycheck, alignment: .trailing)
                        .frame(width: 110)
                }
            }
            .onDelete { items.remove(atOffsets: $0) }

            Button {
                items.append(DeductionItem(name: "", amountPerPaycheck: 0))
            } label: {
                Label("Add Item", systemImage: "plus.circle.fill")
            }
        } header: {
            Text(title)
        } footer: {
            Text(helpText)
        }
    }
}

private struct TaxSection: View {
    @Binding var items: [TaxWithholding]

    var body: some View {
        Section {
            ForEach($items) { $item in
                HStack {
                    TextField("Name", text: $item.name)
                    Spacer()
                    CurrencyField("Amount", value: $item.amountPerPaycheck, alignment: .trailing)
                        .frame(width: 110)
                }
            }
            .onDelete { items.remove(atOffsets: $0) }

            Button {
                items.append(TaxWithholding(name: "", amountPerPaycheck: 0))
            } label: {
                Label("Add Tax", systemImage: "plus.circle.fill")
            }
        } header: {
            Text("Taxes Withheld")
        } footer: {
            Text("Federal, state, local, Social Security, Medicare — as itemized on the paystub.")
        }
    }
}

/// A numeric text field bound to a Double, formatted as currency while editing.
struct CurrencyField: View {
    let title: String
    @Binding var value: Double
    var alignment: TextAlignment = .leading

    init(_ title: String, value: Binding<Double>, alignment: TextAlignment = .leading) {
        self.title = title
        self._value = value
        self.alignment = alignment
    }

    var body: some View {
        TextField(title, value: $value, format: .number.precision(.fractionLength(0...2)))
            .keyboardType(.decimalPad)
            .multilineTextAlignment(alignment)
    }
}

/// A numeric text field bound to a Double representing hours.
struct HoursField: View {
    let title: String
    @Binding var value: Double

    init(_ title: String, value: Binding<Double>) {
        self.title = title
        self._value = value
    }

    var body: some View {
        HStack {
            Text(title)
            Spacer()
            TextField("0", value: $value, format: .number.precision(.fractionLength(0...2)))
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .frame(width: 80)
        }
    }
}

#Preview {
    NavigationStack {
        PaystubEntryView(paystub: Paystub(employerName: "Acme Co", payFrequency: .biWeekly,
                                           hourlyRate: 28, regularHours: 80, overtimeHours: 5))
    }
    .modelContainer(for: [Paystub.self, Expense.self, Debt.self], inMemory: true)
}
