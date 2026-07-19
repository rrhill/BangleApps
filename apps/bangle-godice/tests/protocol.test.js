const fs=require("fs"),vm=require("vm"),assert=require("assert");
const code=fs.readFileSync(__dirname+"/../apps/godice/godice.protocol.js","utf8");
const box={exports:{},DataView,Uint8Array};vm.runInNewContext(code,box);const p=box.exports;
function dec(a,t){return p.decode(new Uint8Array(a),t);}
assert.equal(dec([82],p.TYPES.D6).kind,"rolling");
assert.equal(dec([66,97,116,87],p.TYPES.D6).level,87);
assert.equal(dec([67,111,108,3],p.TYPES.D6).color,3);
assert.deepEqual(Array.from(dec([83,192,0,0],p.TYPES.D6).xyz),[-64,0,0]);
assert.equal(dec([83,192,0,0],p.TYPES.D6).value,1);
assert.equal(dec([83,64,0,0],p.TYPES.D6).value,6);
assert.equal(dec([83,64,0,22],p.TYPES.D20).value,20);
assert.equal(dec([83,64,0,234],p.TYPES.D10).value,0);
assert.equal(dec([83,64,0,234],p.TYPES.D10X).value,0);
assert.equal(dec([83,20,196,236],p.TYPES.D4).value,3);
assert.equal(dec([70,83,0,0,64],p.TYPES.D6).kind,"fake");
assert.deepEqual(Array.from(p.led([1,2,300],null)),[8,1,2,255,0,0,0]);
console.log("protocol tests passed");
