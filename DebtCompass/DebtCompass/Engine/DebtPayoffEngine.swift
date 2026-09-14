import Foundation

/// Simulates paying off a set of debts month by month under each of the three strategies.
///
/// All three strategies share the same monthly interest accrual (`balance * apr / 12`) so
/// their results are directly comparable. They differ only in how extra cash flow is targeted:
///  - **Avalanche**: extra cash always goes to the active debt with the highest APR.
///  - **Snowball**: extra cash always goes to the active debt with the smallest balance.
///  - **Velocity banking**: a line of credit is used to pay off one debt at a time in a lump
///    sum, then every dollar of monthly cash flow attacks the line of credit before moving to
///    the next debt. This is a simplified model — real-world velocity banking depends heavily
///    on the timing of daily cash flow through the line of credit, which a monthly simulation
///    can only approximate.
///
/// In every strategy, once a debt is paid off its minimum payment is "freed" and rolls into
/// the pool of extra cash applied to the next target, which is what makes these strategies
/// accelerate over time instead of just applying a flat extra payment.
enum DebtPayoffEngine {
    static let maxMonths = 600 // 50-year safety cap so a plan that can't amortize still terminates.

    // MARK: - Avalanche & Snowball

    static func simulateAvalanche(debts: [Debt], extraMonthlyPayment: Double) -> PayoffPlanResult {
        simulateWaterfall(debts: debts, extraMonthlyPayment: extraMonthlyPayment, strategy: .avalanche) { active in
            active.sorted {
                $0.apr != $1.apr ? $0.apr > $1.apr : $0.balance < $1.balance
            }.map(\.id)
        }
    }

    static func simulateSnowball(debts: [Debt], extraMonthlyPayment: Double) -> PayoffPlanResult {
        simulateWaterfall(debts: debts, extraMonthlyPayment: extraMonthlyPayment, strategy: .snowball) { active in
            active.sorted {
                $0.balance != $1.balance ? $0.balance < $1.balance : $0.apr > $1.apr
            }.map(\.id)
        }
    }

    private static func simulateWaterfall(
        debts: [Debt],
        extraMonthlyPayment: Double,
        strategy: PayoffStrategy,
        priorityOrder: ([DebtSnapshot]) -> [UUID]
    ) -> PayoffPlanResult {
        var snapshots = debts.map {
            DebtSnapshot(id: $0.id, name: $0.name, type: $0.type,
                         balance: max(0, $0.balance), apr: max(0, $0.apr),
                         minimumPayment: max(0, $0.minimumPayment))
        }
        let debtNames = Dictionary(uniqueKeysWithValues: snapshots.map { ($0.id, $0.name) })
        let totalOriginalMinimum = snapshots.reduce(0) { $0 + $1.minimumPayment }
        let extra = max(0, extraMonthlyPayment)

        var months: [PayoffMonthEntry] = []
        var totalInterestPaid = 0.0
        var totalPaid = 0.0
        var month = 0

        while snapshots.contains(where: { $0.balance > 0.005 }) && month < maxMonths {
            month += 1
            var interestByDebt: [UUID: Double] = [:]
            var paymentByDebt: [UUID: Double] = [:]

            // 1. Accrue a month of interest on every active balance.
            for i in snapshots.indices where snapshots[i].balance > 0.005 {
                let interest = snapshots[i].balance * (snapshots[i].apr / 12)
                snapshots[i].balance += interest
                interestByDebt[snapshots[i].id] = interest
                totalInterestPaid += interest
            }

            // 2. Pay the minimum on every active debt.
            for i in snapshots.indices where snapshots[i].balance > 0.005 {
                let payment = min(snapshots[i].minimumPayment, snapshots[i].balance)
                snapshots[i].balance -= payment
                paymentByDebt[snapshots[i].id, default: 0] += payment
                totalPaid += payment
            }

            // 3. Roll extra cash flow, plus any minimums freed by already-paid-off debts,
            //    into the highest-priority remaining debt (waterfalling to the next if paid off).
            let active = snapshots.filter { $0.balance > 0.005 }
            let activeMinimums = active.reduce(0) { $0 + $1.minimumPayment }
            var pool = extra + max(0, totalOriginalMinimum - activeMinimums)

            for debtID in priorityOrder(active) {
                guard pool > 0.005 else { break }
                guard let i = snapshots.firstIndex(where: { $0.id == debtID }), snapshots[i].balance > 0.005 else { continue }
                let payment = min(pool, snapshots[i].balance)
                snapshots[i].balance -= payment
                paymentByDebt[debtID, default: 0] += payment
                totalPaid += payment
                pool -= payment
            }

            let remainingBalanceByDebt = Dictionary(uniqueKeysWithValues: snapshots.map { ($0.id, max(0, $0.balance)) })
            months.append(PayoffMonthEntry(month: month, interestByDebt: interestByDebt,
                                            paymentByDebt: paymentByDebt,
                                            remainingBalanceByDebt: remainingBalanceByDebt))
        }

        let neverPaysOff = snapshots.contains { $0.balance > 0.005 }
        return PayoffPlanResult(strategy: strategy, debtNames: debtNames, months: months,
                                 totalInterestPaid: totalInterestPaid, totalPaid: totalPaid,
                                 neverPaysOff: neverPaysOff)
    }

    // MARK: - Velocity Banking

    static func simulateVelocityBanking(
        debts: [Debt],
        extraMonthlyPayment: Double,
        lineOfCreditAPR: Double,
        lineOfCreditLimit: Double,
        existingLineOfCreditBalance: Double = 0
    ) -> PayoffPlanResult {
        var snapshots = debts.map {
            DebtSnapshot(id: $0.id, name: $0.name, type: $0.type,
                         balance: max(0, $0.balance), apr: max(0, $0.apr),
                         minimumPayment: max(0, $0.minimumPayment))
        }
        let locID = UUID()
        var debtNames = Dictionary(uniqueKeysWithValues: snapshots.map { ($0.id, $0.name) })
        debtNames[locID] = "Line of Credit"

        // Fixed avalanche-style targeting order, decided once up front: highest APR first,
        // since that's the debt where an early lump-sum payoff saves the most interest.
        let priorityOrder = snapshots
            .sorted { $0.apr != $1.apr ? $0.apr > $1.apr : $0.balance < $1.balance }
            .map(\.id)

        let totalOriginalMinimum = snapshots.reduce(0) { $0 + $1.minimumPayment }
        let extra = max(0, extraMonthlyPayment)
        let creditLimit = max(0, lineOfCreditLimit)
        let locAPR = max(0, lineOfCreditAPR)

        var absorbed = Set<UUID>()
        var locBalance = max(0, existingLineOfCreditBalance)

        var months: [PayoffMonthEntry] = []
        var totalInterestPaid = 0.0
        var totalPaid = 0.0
        var month = 0

        func currentTarget() -> Int? {
            for id in priorityOrder {
                if absorbed.contains(id) { continue }
                if let i = snapshots.firstIndex(where: { $0.id == id }), snapshots[i].balance > 0.005 {
                    return i
                }
            }
            return nil
        }

        while (snapshots.contains { !absorbed.contains($0.id) && $0.balance > 0.005 } || locBalance > 0.005)
                && month < maxMonths {
            month += 1
            var interestByDebt: [UUID: Double] = [:]
            var paymentByDebt: [UUID: Double] = [:]

            // 1. Accrue interest: on every non-absorbed original debt, and on the LOC balance.
            for i in snapshots.indices where !absorbed.contains(snapshots[i].id) && snapshots[i].balance > 0.005 {
                let interest = snapshots[i].balance * (snapshots[i].apr / 12)
                snapshots[i].balance += interest
                interestByDebt[snapshots[i].id] = interest
                totalInterestPaid += interest
            }
            if locBalance > 0.005 {
                let locInterest = locBalance * (locAPR / 12)
                locBalance += locInterest
                interestByDebt[locID] = locInterest
                totalInterestPaid += locInterest
            }

            // 2. Pay minimums on every debt that hasn't yet been absorbed into the LOC.
            for i in snapshots.indices where !absorbed.contains(snapshots[i].id) && snapshots[i].balance > 0.005 {
                let payment = min(snapshots[i].minimumPayment, snapshots[i].balance)
                snapshots[i].balance -= payment
                paymentByDebt[snapshots[i].id, default: 0] += payment
                totalPaid += payment
            }

            // 3. Draw against the LOC to knock out as much of the current target debt as
            //    available credit allows. This is a balance transfer, not new cash spent, so
            //    it counts toward that debt's payoff progress but not toward totalPaid.
            if let targetIndex = currentTarget() {
                let availableRoom = max(0, creditLimit - locBalance)
                if availableRoom > 0.005 {
                    let draw = min(availableRoom, snapshots[targetIndex].balance)
                    snapshots[targetIndex].balance -= draw
                    locBalance += draw
                    paymentByDebt[snapshots[targetIndex].id, default: 0] += draw
                    if snapshots[targetIndex].balance <= 0.005 {
                        absorbed.insert(snapshots[targetIndex].id)
                    }
                }
            }

            // 4. Every dollar of freed-up minimums plus extra cash flow attacks the LOC first.
            let activeMinimums = snapshots
                .filter { !absorbed.contains($0.id) && $0.balance > 0.005 }
                .reduce(0) { $0 + $1.minimumPayment }
            var pool = extra + max(0, totalOriginalMinimum - activeMinimums)

            if locBalance > 0.005 && pool > 0.005 {
                let payment = min(pool, locBalance)
                locBalance -= payment
                paymentByDebt[locID, default: 0] += payment
                totalPaid += payment
                pool -= payment
            }

            // 5. Any cash flow left over (LOC already clear) goes straight at the current target.
            if pool > 0.005, let targetIndex = currentTarget() {
                let payment = min(pool, snapshots[targetIndex].balance)
                snapshots[targetIndex].balance -= payment
                paymentByDebt[snapshots[targetIndex].id, default: 0] += payment
                totalPaid += payment
                if snapshots[targetIndex].balance <= 0.005 {
                    absorbed.insert(snapshots[targetIndex].id)
                }
            }

            var remainingBalanceByDebt = Dictionary(uniqueKeysWithValues: snapshots.map { ($0.id, max(0, $0.balance)) })
            remainingBalanceByDebt[locID] = max(0, locBalance)
            months.append(PayoffMonthEntry(month: month, interestByDebt: interestByDebt,
                                            paymentByDebt: paymentByDebt,
                                            remainingBalanceByDebt: remainingBalanceByDebt))
        }

        let neverPaysOff = snapshots.contains { !absorbed.contains($0.id) && $0.balance > 0.005 } || locBalance > 0.005
        return PayoffPlanResult(strategy: .velocityBanking, debtNames: debtNames, months: months,
                                 totalInterestPaid: totalInterestPaid, totalPaid: totalPaid,
                                 neverPaysOff: neverPaysOff)
    }
}
