import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/utils/format.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {INR,sumMoney}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
test('signed financial display and totals retain fractional paise-unit precision',()=>{
    assert.equal(INR('-0.25'),'-₹0.25');assert.equal(INR('-10000.05'),'-₹10,000.05');
    assert.equal(sumMoney(['200.00','-50.25']),'149.75');
    assert.equal(sumMoney(['0.10','-0.35']),'-0.25');
    assert.equal(sumMoney(['-0.25','0.25']),'0.00');
    assert.equal(INR('90071992547409.91'),'₹9,00,71,99,25,47,409.91');
});
