const assert = require('assert');
const C = require('../assets/js/cart-core.js');
// panier vide
assert.strictEqual(C.computeTotals([], null).ttc, 0);
// 2x89 + 25 = 203 -> TTC 243.60
let t = C.computeTotals([{price:89,qty:2},{price:25,qty:1}], null);
assert.strictEqual(t.sousTotal, 203); assert.strictEqual(t.ttc, 243.60);
// promo AEGIS10 : 203 -> HT 182.70, TVA 36.54, TTC 219.24
t = C.computeTotals([{price:89,qty:2},{price:25,qty:1}], 'AEGIS10');
assert.strictEqual(t.ht, 182.70); assert.strictEqual(t.tva, 36.54); assert.strictEqual(t.ttc, 219.24);
// promo invalide = 0 remise
assert.strictEqual(C.computeTotals([{price:100,qty:1}], 'NOPE').remise, 0);
// addItem merge
let cart = []; C.addItem(cart, {title:'A', price:10}, 1); C.addItem(cart, {title:'A', price:10}, 2);
assert.strictEqual(cart[0].qty, 3);
// track number format
assert.match(C.makeTrackNumber(), /^TRK-2026-FR-\d{4}$/);
console.log('✅ Tests unitaires : 6/6 OK');
