import SwiftUI
import SwiftData

struct IncomeListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Paystub.createdAt) private var paystubs: [Paystub]
    @State private var draftPaystub: Paystub?

    private var totalMonthlyNet: Double { paystubs.reduce(0) { $0 + $1.monthlyNetPay } }

    var body: some View {
        List {
            if !paystubs.isEmpty {
                Section {
                    HStack {
                        Text("Total Monthly Take-Home")
                        Spacer()
                        Text(totalMonthlyNet.asCurrency).bold()
                    }
                }
            }

            Section {
                ForEach(paystubs) { paystub in
                    NavigationLink(value: paystub) {
                        IncomeRow(paystub: paystub)
                    }
                }
                .onDelete(perform: delete)
            } header: {
                if paystubs.isEmpty { Text("Income Sources") }
            }
        }
        .overlay {
            if paystubs.isEmpty {
                ContentUnavailableView("No Income Yet",
                                        systemImage: "dollarsign.circle",
                                        description: Text("Add a paystub to calculate your take-home pay, including overtime."))
            }
        }
        .navigationTitle("Income")
        .navigationDestination(for: Paystub.self) { paystub in
            PaystubEntryView(paystub: paystub)
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    draftPaystub = Paystub(employerName: "New Paystub")
                } label: {
                    Label("Add Income", systemImage: "plus")
                }
            }
        }
        .sheet(item: $draftPaystub) { paystub in
            NavigationStack {
                PaystubEntryView(paystub: paystub, isNew: true) {
                    modelContext.insert(paystub)
                }
            }
        }
    }

    private func delete(at offsets: IndexSet) {
        for index in offsets { modelContext.delete(paystubs[index]) }
    }
}

private struct IncomeRow: View {
    @Bindable var paystub: Paystub

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(paystub.employerName.isEmpty ? "Untitled Income" : paystub.employerName)
                .font(.headline)
            HStack(spacing: 8) {
                Text(paystub.payFrequency.displayName)
                if !paystub.isSalaried && paystub.overtimeHours > 0 {
                    Text("• \(paystub.overtimeHours.formatted()) OT hrs/period")
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
            Text("\(paystub.monthlyNetPay.asCurrency) / month net")
                .font(.subheadline.bold())
                .foregroundStyle(.green)
        }
        .padding(.vertical, 2)
    }
}

#Preview {
    NavigationStack { IncomeListView() }
        .modelContainer(for: [Paystub.self, Expense.self, Debt.self], inMemory: true)
}
