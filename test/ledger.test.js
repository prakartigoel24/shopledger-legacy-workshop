const assert = require('node:assert/strict');
const test = require('node:test');
const ledger = require('../lib/ledger');

function khata(totalSettled = 1200) {
  return {
    customers: [{ id: 1, name: 'Meera', openingBalance: 450, totalBilled: 1982.01, totalSettled }],
    nextSettlementId: 1
  };
}

test('CURRENT BEHAVIOUR: records numeric payments and reports the balance including opening credit', () => {
  const db = khata();
  const result = ledger.recordSettlement(db, 1, 500, 'cash', 'Counter payment');

  assert.equal(result.ok, true);
  assert.equal(result.settlement.amount, 500);
  assert.equal(result.settlement.mode, 'cash');
  assert.equal(result.settlement.note, 'Counter payment');
  assert.equal(result.customer.totalSettled, 1700);
  assert.equal(result.customer.balance, 732.01);
  assert.equal(ledger.listCustomers(db)[0].balance, 732.01);
  assert.deepEqual(db.settlements, [result.settlement]);
});

test('adds a payment from the browser to a numeric or legacy string running total', () => {
  for (const totalSettled of [1200, '1200']) {
    const db = khata(totalSettled);
    const result = ledger.recordSettlement(db, '1', '500');

    assert.equal(result.ok, true);
    assert.equal(result.settlement.amount, 500);
    assert.equal(result.customer.totalSettled, 1700);
    assert.equal(result.customer.balance, 732.01);
    assert.equal(ledger.listCustomers(db)[0].balance, 732.01);
  }
});

test('stores fractional rupees numerically starting from a missing running total', () => {
  const db = khata();
  delete db.customers[0].totalSettled;
  ledger.recordSettlement(db, 1, '0.10');
  const result = ledger.recordSettlement(db, 1, '0.20');

  assert.equal(result.customer.totalSettled, 0.30);
  assert.equal(result.customer.balance, 2431.71);
  assert.deepEqual(db.settlements.map(entry => entry.amount), [0.20, 0.10]);
});

test('rejects invalid payment amounts without changing the ledger', () => {
  const db = khata();
  for (const amount of ['abc', 'Infinity', Infinity, '0', -1, '', true, [500]]) {
    assert.equal(ledger.recordSettlement(db, 1, amount).ok, false);
  }
  assert.deepEqual(db, khata());
});
