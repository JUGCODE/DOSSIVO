import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFieldReviewValue as parse} from '../lib/field-review-input.js';
test('field review refuses empty and malformed values rather than manufacturing zero',()=>{for(const v of ['', ' ', '\n',null,undefined,0,false,'0x10','NaN','Infinity','1,000','1e','-1','1000000000001','1e999'])assert.equal(parse(v),null,String(v));});
test('field review accepts deliberate zero, decimal and bounded exponent values',()=>{for(const [v,n] of [['0',0],[' 0 ',0],['12.5',12.5],['.5',.5],['1e3',1000],['1e12',1e12]])assert.equal(parse(v),n);});
