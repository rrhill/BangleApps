/* Six-slot GoDice BLE connection manager for Bangle.js 2. */
var P=require("godice.protocol.js");
var SERVICE="6e400001-b5a3-f393-e0a9-e50e24dcca9e";
var WRITE="6e400002-b5a3-f393-e0a9-e50e24dcca9e";
var NOTIFY="6e400003-b5a3-f393-e0a9-e50e24dcca9e";

function Manager(settings, changed) {
  this.settings=settings; this.changed=changed||function(){};
  this.dice=[]; this.queue=[]; this.connecting=false; this.scanning=false;
  this.scanTimer=undefined; this.stopped=false;
}
Manager.prototype.find=function(id) {
  for(var i=0;i<this.dice.length;i++) if(this.dice[i].id===id) return this.dice[i];
};
Manager.prototype.slotType=function(id) {
  var map=this.settings.types||{};
  return map[id]===undefined?P.TYPES.D6:map[id];
};
Manager.prototype.scan=function() {
  var self=this;
  if(this.scanning||this.connecting||this.stopped) return;
  this.scanning=true; this.changed({kind:"status",message:"Scanning..."});
  NRF.findDevices(function(devices){
    self.scanning=false;
    devices.sort(function(a,b){return (b.rssi||-99)-(a.rssi||-99);});
    devices.forEach(function(dev){
      if (!dev.name || dev.name.indexOf("GoDice_")!==0) return;
      var die=self.find(dev.id);
      if (die) {
        die.device=dev; die.rssi=dev.rssi;
        if(!die.connected&&!die.connecting&&self.queue.indexOf(die)<0)self.queue.push(die);
        return;
      }
      if (self.dice.length>=6) return;
      die={id:dev.id,name:dev.name,device:dev,type:self.slotType(dev.id),connected:false,
        connecting:false,battery:null,color:null,lastRoll:null,lastSeen:Date.now(),error:""};
      self.dice.push(die); self.queue.push(die);
    });
    self.changed({kind:"scan",count:self.dice.length}); self.connectNext();
    if (!self.queue.length && self.dice.length<6) self.scheduleScan(5000);
  },{timeout:self.settings.scanSeconds*1000,filters:[{namePrefix:"GoDice_"}]});
};
Manager.prototype.scheduleScan=function(ms) {
  var self=this; if(this.scanTimer||this.stopped) return;
  this.scanTimer=setTimeout(function(){self.scanTimer=undefined;self.scan();},ms);
};
Manager.prototype.connectNext=function() {
  var self=this, die;
  if(this.connecting||this.stopped) return;
  if(this.dice.filter(function(d){return d.connected;}).length>=(this.settings.maxConnections||2)) return;
  while(this.queue.length) { die=this.queue.shift(); if(!die.connected&&!die.connecting) break; die=undefined; }
  if(!die) { this.scheduleScan(this.settings.rescanSeconds*1000); return; }
  this.connecting=true; die.connecting=true; die.error="";
  this.changed({kind:"connecting",die:die});
  die.device.gatt.connect().then(function(gatt){
    die.gatt=gatt;
    var remote=(gatt.device&&gatt.device.on)?gatt.device:die.device;
    if(remote&&remote.on) remote.on("gattserverdisconnected",function(){self.disconnected(die);});
    return gatt.getPrimaryService(SERVICE);
  }).then(function(service){
    die.service=service;
    return Promise.all([service.getCharacteristic(WRITE),service.getCharacteristic(NOTIFY)]);
  }).then(function(chars){
    die.tx=chars[0]; die.rx=chars[1];
    die.rx.on("characteristicvaluechanged",function(e){self.notification(die,e.target.value);});
    return die.rx.startNotifications();
  }).then(function(){
    die.connected=true; die.connecting=false; die.lastSeen=Date.now();
    self.connecting=false; self.changed({kind:"connected",die:die});
    self.write(die,P.batteryRequest()); self.write(die,P.colorRequest()); self.connectNext();
  }).catch(function(err){
    die.connecting=false; die.connected=false; die.error="Connect failed";
    self.connecting=false; self.changed({kind:"error",die:die,error:String(err)});
    self.connectNext();
  });
};
Manager.prototype.disconnected=function(die) {
  if(!die.connected&&!die.connecting) return;
  die.connected=false; die.connecting=false; die.gatt=die.service=die.tx=die.rx=undefined;
  this.changed({kind:"disconnected",die:die});
  if(!this.stopped) { this.queue.push(die); this.scheduleScan(3000); this.connectNext(); }
};
Manager.prototype.notification=function(die,data) {
  var event=P.decode(data,die.type); die.lastSeen=Date.now(); event.die=die;
  if(event.kind==="battery") die.battery=event.level;
  else if(event.kind==="color") die.color=event.color;
  else if(event.kind==="stable") die.lastRoll=event.value;
  this.changed(event);
};
Manager.prototype.write=function(die,data) {
  if(!die||!die.connected||!die.tx) return Promise.reject("Die is offline");
  return die.tx.writeValue(data).catch(function(){});
};
Manager.prototype.identify=function(die) { return this.write(die,P.pulse(3,15,10,[0,80,255])); };
Manager.prototype.refresh=function(die) { this.write(die,P.batteryRequest()); this.write(die,P.colorRequest()); };
Manager.prototype.setType=function(die,type) {
  die.type=type; this.settings.types=this.settings.types||{}; this.settings.types[die.id]=type;
  require("Storage").writeJSON("godice.json",this.settings);
  this.changed({kind:"type",die:die});
};
Manager.prototype.stop=function() {
  this.stopped=true; if(this.scanTimer) clearTimeout(this.scanTimer);
  this.dice.forEach(function(d){if(d.gatt)try{d.gatt.disconnect();}catch(e){}});
};
exports=Manager;
