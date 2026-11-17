import test from 'node:test';import assert from 'node:assert/strict';
import {startSession,result,displayTime} from '../src/domain.mjs';
test('only a foreground deadline earns a finish',()=>{let s=startSession(1,100);assert.equal(result(s,60100,'deadline').outcome,'finished');assert.equal(result(s,100000,'background').outcome,'interrupted');assert.equal(result(s,300,'stop').elapsed,200);assert.equal(result(s,10,'stop').elapsed,0);assert.equal(displayTime(59999),'01:00');assert.throws(()=>startSession(0))});
