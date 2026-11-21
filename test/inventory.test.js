const assert = require('node:assert/strict');
const test = require('node:test');
const inventory = require('../lib/inventory');
const orders = require('../lib/orders');

function products() {
  return [
    { id: 1, name: 'Ghee', stock: 1, reserved: 0 },
    { id: 2, name: 'Chilli Powder', stock: 4, reserved: 3 }
  ];
}

test('CURRENT BEHAVIOUR: rejects purchases above sellable stock and unknown products', () => {
  const catalog = products();
  assert.deepEqual(inventory.check(catalog, [{ id: 2, qty: 2 }]), {
    ok: false,
    msg: 'Chilli Powder is out of stock (1 sellable available)'
  });
  assert.deepEqual(inventory.check(catalog, [{ id: 3, qty: 1 }]), {
    ok: false,
    msg: 'Unknown product 3'
  });
});

test('CURRENT BEHAVIOUR: releasing a wholesale quote reduces reserved stock only', () => {
  const catalog = products();
  inventory.release(catalog, [{ productId: 2, qty: 2 }]);
  assert.deepEqual(catalog[1], { id: 2, name: 'Chilli Powder', stock: 4, reserved: 1 });
});

test('allows the last sellable unit with and without wholesale reservations', () => {
  const catalog = products();
  const items = [{ id: 1, qty: 1 }, { id: 2, qty: 1 }];
  assert.deepEqual(inventory.check(catalog, items), { ok: true });

  inventory.reserve(catalog, items);
  assert.deepEqual(catalog.map(product => product.stock), [0, 3]);
  assert.deepEqual(catalog.map(inventory.getSellableStock), [0, 0]);
});

test('checks the combined quantity when a product appears on multiple lines', () => {
  const catalog = [{ id: 1, name: 'Ghee', stock: 5, reserved: 1 }];
  const firstLine = { id: 1, qty: 2 };
  assert.equal(inventory.check(catalog, [firstLine, { id: '1', qty: 2 }]).ok, true);
  assert.equal(inventory.check(catalog, [firstLine, { id: '1', qty: 3 }]).ok, false);
});

test('cancelling a pending order restores physical and sellable stock once', () => {
  const db = { products: products(), orders: [], nextOrderId: 1 };
  const items = [{ id: 1, qty: 1 }, { id: 2, qty: 1 }];
  inventory.reserve(db.products, items);
  const order = orders.add(db, { items, status: 'pending' });

  assert.equal(orders.cancel(db, order.id).ok, true);
  assert.equal(order.status, 'cancelled');
  assert.deepEqual(db.products, products());
  assert.deepEqual(db.products.map(inventory.getSellableStock), [1, 1]);

  assert.equal(orders.cancel(db, order.id).ok, false);
  assert.deepEqual(db.products, products());
});
