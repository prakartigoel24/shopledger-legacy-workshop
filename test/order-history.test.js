const assert = require('node:assert/strict');
const test = require('node:test');
const dates = require('../lib/dates');
const orders = require('../lib/orders');

function history() {
  return {
    orders: [
      { id: 1001, date: '28/12/2021', customer: 'Meera' },
      { id: 1002, date: '01/01/2022', customer: 'Meera', status: 'cancelled' },
      { id: 1004, date: '30/01/2022', customer: 'Suresh' },
      { id: 1005, date: '31/01/2022', customer: 'Suresh' },
      { id: 1006, date: '01/02/2022', customer: 'Meera', status: 'pending' },
      { id: 1007, date: '04/03/2022', customer: 'Suresh', status: 'pending' },
      { id: 1008, date: '15/03/2022', customer: 'Meera' },
      { id: 1009, date: '15/03/2022', customer: 'Suresh' }
    ]
  };
}

test('CURRENT BEHAVIOUR: order history combines status and case-insensitive search', () => {
  assert.deepEqual(orders.list(history(), { status: 'pending', search: ' MEERA ' }).map(order => order.id), [1006]);
});

test('CURRENT BEHAVIOUR: both supported date formats work across the April fiscal-year boundary', () => {
  assert.equal(dates.getFiscalYear('31/03/2022'), 'FY21-22');
  assert.equal(dates.getFiscalYear('2022-03-31'), 'FY21-22');
  assert.equal(dates.getFiscalYear('01/04/2022'), 'FY22-23');
  assert.equal(dates.getFiscalYear('2022-04-01'), 'FY22-23');
});

test('lists orders newest first across months and years, including orders placed on the same day', () => {
  const db = history();
  assert.deepEqual(orders.list(db).map(order => order.id), [1009, 1008, 1007, 1006, 1005, 1004, 1002, 1001]);
  assert.equal(db.orders[0].id, 1001);
});

test('filters the entire inclusive January range using either supported date format', () => {
  const db = history();
  assert.deepEqual(orders.list(db, { from: '2022-01-01', to: '2022-01-31' }).map(order => order.id), [1005, 1004, 1002]);
  assert.deepEqual(orders.list(db, { from: '01/01/2022', to: '31/01/2022' }).map(order => order.id), [1005, 1004, 1002]);
});
