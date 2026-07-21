/* GoDice protocol adapter for Espruino/Bangle.js 2.
 * Vector and transform data is derived from Particula's GoDiceJavaScriptAPI.
 * See THIRD_PARTY_LICENSE.md.
 */
var TYPES = {D6:0,D20:1,D10:2,D10X:3,D4:4,D8:5,D12:6};
var NAMES = ["D6","D20","D10","D10X","D4","D8","D12"];
var D6 = [
  [-64,0,0],[0,0,64],[0,64,0],[0,-64,0],[0,0,-64],[64,0,0]
];
var D20 = [
  [-64,0,-22],[42,-42,40],[0,22,-64],[0,22,64],[-42,-42,42],
  [22,64,0],[-42,-42,-42],[64,0,-22],[-22,64,0],[42,-42,-42],
  [-42,42,42],[22,-64,0],[-64,0,22],[42,42,42],[-22,-64,0],
  [42,42,-42],[0,-22,-64],[0,-22,64],[-42,42,-42],[64,0,22]
];
var D24 = [
  [20,-60,-20],[20,0,60],[-40,-40,40],[-60,0,20],[40,20,40],
  [-20,-60,-20],[20,60,20],[-40,20,-40],[-40,40,40],[-20,0,60],
  [-20,-60,20],[60,0,20],[-60,0,-20],[20,60,-20],[20,0,-60],
  [40,-20,-40],[-20,60,-20],[-40,-40,-40],[40,-20,40],[20,-60,20],
  [60,0,-20],[40,20,-40],[-20,0,-60],[-20,60,20]
];
var D10 = [8,2,6,1,4,3,9,0,7,5,5,7,0,9,3,4,1,6,2,8];
var D10X = [80,20,60,10,40,30,90,0,70,50,50,70,0,90,30,40,10,60,20,80];
var D4 = [3,1,4,1,4,4,1,4,2,3,1,1,1,4,2,3,3,2,2,2,4,1,3,2];
var D8 = [3,3,6,1,2,8,1,1,4,7,5,5,4,4,2,5,7,7,8,2,8,3,6,6];
var D12 = [1,2,3,4,5,6,7,8,9,10,11,12,1,2,3,4,5,6,7,8,9,10,11,12];

function bytes(data) {
  if (data instanceof DataView) return data;
  if (data && data.buffer) return new DataView(data.buffer,data.byteOffset||0,data.byteLength);
  return new DataView(data);
}
function xyz(view, at) {
  return [view.getInt8(at),view.getInt8(at+1),view.getInt8(at+2)];
}
function closest(table, p) {
  var best=0, min=1e12, i, v, x, y, z, dist;
  for (i=0;i<table.length;i++) {
    v=table[i]; x=p[0]-v[0]; y=p[1]-v[1]; z=p[2]-v[2];
    dist=x*x+y*y+z*z;
    if (dist<min) { min=dist; best=i; }
  }
  return best;
}
function face(type, p) {
  var i;
  if (type===TYPES.D6) return closest(D6,p)+1;
  if (type>=TYPES.D20 && type<=TYPES.D10X) {
    i=closest(D20,p);
    if (type===TYPES.D10) return D10[i];
    if (type===TYPES.D10X) return D10X[i];
    return i+1;
  }
  i=closest(D24,p);
  if (type===TYPES.D4) return D4[i];
  if (type===TYPES.D8) return D8[i];
  if (type===TYPES.D12) return D12[i];
  return 0;
}
function decode(data, type) {
  var v=bytes(data), n=v.byteLength, a, b, c, at=-1, kind="unknown";
  if (!n) return {kind:"unknown"};
  a=v.getUint8(0); b=n>1?v.getUint8(1):0; c=n>2?v.getUint8(2):0;
  if (a===82) return {kind:"rolling"};
  if (a===66 && b===97 && c===116 && n>3) return {kind:"battery",level:v.getUint8(3)};
  if (a===67 && b===111 && c===108 && n>3) return {kind:"color",color:v.getUint8(3)};
  if (a===83 && n>=4) { kind="stable"; at=1; }
  else if (a===70 && b===83 && n>=5) { kind="fake"; at=2; }
  else if (a===84 && b===83 && n>=5) { kind="tilt"; at=2; }
  else if (a===77 && b===83 && n>=5) { kind="move"; at=2; }
  if (at>=0) { a=xyz(v,at); return {kind:kind,value:face(type,a),xyz:a}; }
  return {kind:"unknown"};
}
function clamp(v) { return Math.max(0,Math.min(255,v|0)); }
function led(a,b) {
  a=a||[0,0,0]; b=b||[0,0,0];
  return new Uint8Array([8,clamp(a[0]),clamp(a[1]),clamp(a[2]),clamp(b[0]),clamp(b[1]),clamp(b[2])]);
}
function pulse(count,onTime,offTime,rgb) {
  return new Uint8Array([16,clamp(count),clamp(onTime),clamp(offTime),clamp(rgb[0]),clamp(rgb[1]),clamp(rgb[2]),1,0]);
}
exports.TYPES=TYPES;
exports.NAMES=NAMES;
exports.decode=decode;
exports.face=face;
exports.batteryRequest=function(){return new Uint8Array([3]);};
exports.colorRequest=function(){return new Uint8Array([23]);};
exports.led=led;
exports.pulse=pulse;
