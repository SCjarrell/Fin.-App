import XCTest
@testable import DebtCompass

final class DebtPayoffEngineTests: XCTestCase {

    func testAvalanchePaysOffAllDebtsWithPositiveExtraPayment() {
        let debtA = Debt(name: "A", type: .creditCard, balance: 1000, apr: 0.10, minimumPayment: 40)
        let debtB = Debt(name: "B", type: .creditCard, balance: 1500, apr: 0.22, minimumPayment: 60)

        let result = DebtPayoffEngine.simulateAvalanche(debts: [debtA, debtB], extraMonthlyPayment: 200)

        XCTAssertFalse(result.neverPaysOff)
        XCTAssertEqual(result.months.last?.totalRemainingBalance ?? -1, 0, accuracy: 1.0)
    }

    func testAvalanchePaysHighestAPRDebtFirst() {
        let lowAPR = Debt(name: "LowAPR", type: .personalLoan, balance: 1000, apr: 0.08, minimumPayment: 40)
        let highAPR = Debt(name: "HighAPR", type: .creditCard, balance: 1000, apr: 0.27, minimumPayment: 40)

        let result = DebtPayoffEngine.simulateAvalanche(debts: [lowAPR, highAPR], extraMonthlyPayment: 150)
        let payoffMonths = result.payoffMonthByDebt

        XCTAssertNotNil(payoffMonths[highAPR.id])
        XCTAssertNotNil(payoffMonths[lowAPR.id])
        XCTAssertLessThan(payoffMonths[highAPR.id]!, payoffMonths[lowAPR.id]!,
                           "The higher-APR debt should be eliminated first under the avalanche strategy.")
    }

    func testSnowballPaysSmallestBalanceFirstEvenWithLowerAPR() {
        let smallBalance = Debt(name: "Small", type: .personalLoan, balance: 300, apr: 0.06, minimumPayment: 25)
        let largeBalance = Debt(name: "Large", type: .creditCard, balance: 3000, apr: 0.24, minimumPayment: 75)

        let result = DebtPayoffEngine.simulateSnowball(debts: [smallBalance, largeBalance], extraMonthlyPayment: 150)
        let payoffMonths = result.payoffMonthByDebt

        XCTAssertNotNil(payoffMonths[smallBalance.id])
        XCTAssertNotNil(payoffMonths[largeBalance.id])
        XCTAssertLessThan(payoffMonths[smallBalance.id]!, payoffMonths[largeBalance.id]!,
                           "The smallest-balance debt should be eliminated first under the snowball strategy, regardless of APR.")
    }

    func testFreedMinimumPaymentRollsIntoRemainingDebtInThePayoffMonth() {
        // Quick's lower APR means avalanche never sends it extra cash — it's paid off by its
        // minimum alone. Once that happens, its $25 minimum should immediately roll into Slow's
        // payment that same month.
        let quick = Debt(name: "Quick", type: .personalLoan, balance: 100, apr: 0.10, minimumPayment: 25)
        let slow = Debt(name: "Slow", type: .creditCard, balance: 5000, apr: 0.20, minimumPayment: 100)

        let result = DebtPayoffEngine.simulateAvalanche(debts: [quick, slow], extraMonthlyPayment: 50)
        guard let quickPayoffMonth = result.payoffMonthByDebt[quick.id], quickPayoffMonth >= 2 else {
            return XCTFail("Expected the small debt to be paid off after at least one full month")
        }

        let paymentBeforePayoff = result.months[quickPayoffMonth - 2].paymentByDebt[slow.id] ?? 0
        let paymentAtPayoff = result.months[quickPayoffMonth - 1].paymentByDebt[slow.id] ?? 0

        XCTAssertGreaterThan(paymentAtPayoff, paymentBeforePayoff,
                              "Once Quick is paid off, its freed minimum payment should accelerate payment toward Slow in the same month.")
    }

    func testVelocityBankingPaysOffOriginalDebtAndLineOfCredit() {
        let debt = Debt(name: "Card", type: .creditCard, balance: 4000, apr: 0.22, minimumPayment: 120)

        let result = DebtPayoffEngine.simulateVelocityBanking(
            debts: [debt],
            extraMonthlyPayment: 300,
            lineOfCreditAPR: 0.09,
            lineOfCreditLimit: 5000
        )

        XCTAssertFalse(result.neverPaysOff)
        XCTAssertEqual(result.months.last?.totalRemainingBalance ?? -1, 0, accuracy: 1.0)
    }

    func testVelocityBankingImmediatelyDrawsAgainstTheLineOfCredit() {
        let debt = Debt(name: "Card", type: .creditCard, balance: 4000, apr: 0.22, minimumPayment: 120)

        let result = DebtPayoffEngine.simulateVelocityBanking(
            debts: [debt],
            extraMonthlyPayment: 300,
            lineOfCreditAPR: 0.09,
            lineOfCreditLimit: 5000
        )

        let firstMonth = result.months[0]
        XCTAssertEqual(firstMonth.remainingBalanceByDebt[debt.id] ?? -1, 0, accuracy: 1.0,
                        "The line of credit should have enough room to absorb the whole balance in month one.")
    }

    func testNeverPaysOffWhenMinimumPaymentDoesNotCoverInterest() {
        let debt = Debt(name: "Trap", type: .creditCard, balance: 10_000, apr: 0.30, minimumPayment: 50)

        let result = DebtPayoffEngine.simulateAvalanche(debts: [debt], extraMonthlyPayment: 0)

        XCTAssertTrue(result.neverPaysOff)
        XCTAssertEqual(result.months.count, DebtPayoffEngine.maxMonths)
    }

    func testEmptyDebtListProducesEmptyPlan() {
        let result = DebtPayoffEngine.simulateAvalanche(debts: [], extraMonthlyPayment: 500)
        XCTAssertTrue(result.months.isEmpty)
        XCTAssertFalse(result.neverPaysOff)
    }
}
