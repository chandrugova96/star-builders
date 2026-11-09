import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paise,rupees,entryEarnings,monday,dateValue,signedAdd} from '../src/domain/values.js';
test('money uses exact integer paise and half-up overtime rounding per entry',()=>{
 assert.equal(paise('850.00'),85000);assert.equal(paise('.50'),50);assert.equal(rupees(85001),'850.01');
 assert.equal(entryEarnings(85000,0,'0.5'),5313);assert.equal(entryEarnings(85000,1,'0.5'),47813);
 assert.throws(()=>paise('9999999999999999999999'));assert.equal(monday('2026-11-08'),'2026-11-02');assert.equal(dateValue.safeParse('2026-02-30').success,false);
});

test('signed paise corrections preserve negative fractional rupees and reject overflow',()=>{
 assert.equal(rupees(-25),'-0.25');assert.equal(rupees(-10025),'-100.25');
 assert.equal(signedAdd(100, -125),-25);assert.equal(signedAdd(20000,-5025),14975);
 assert.throws(()=>signedAdd(Number.MAX_SAFE_INTEGER,1));
});
