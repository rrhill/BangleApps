/* GoDice dashboard for Bangle.js 2 */
var Storage=require("Storage");
var P=require("godice.protocol.js");
var Manager=require("godice.manager.js");
var defaults={buzz:true,historySize:60,groupWindow:750,scanSeconds:6,rescanSeconds:20,maxConnections:2,types:{}};
var settings=Object.assign(defaults,Storage.readJSON("godice.json",1)||{});
var manager,screen=0,history=[],stats={},popup,group=[],groupTimer,status="Starting",dragged=false;
var COLORS=["#000","#f00","#0f0","#00f","#ff0","#f80"];

function loadHistory(){
  var f=Storage.open("godice.history","r"),line,row;
  while((line=f.readLine())!==undefined){try{row=JSON.parse(line);history.push(row);}catch(e){}}
  if(history.length>settings.historySize)history=history.slice(-settings.historySize);
}
function saveHistory(){
  Storage.write("godice.history",history.map(function(x){return JSON.stringify(x);}).join("\n")+(history.length?"\n":""));
}
function addRoll(event){
  var d=event.die,row={t:Date.now(),id:d.id,name:d.name,type:P.NAMES[d.type],v:event.value};
  history.push(row); if(history.length>settings.historySize)history.shift(); saveHistory();
  var s=stats[d.id]||(stats[d.id]={name:d.name,type:P.NAMES[d.type],count:0,total:0,min:999,max:-999,ones:0,maxes:0});
  s.count++;s.total+=event.value;s.min=Math.min(s.min,event.value);s.max=Math.max(s.max,event.value);
  if(event.value===1)s.ones++;
  var max=[6,20,9,90,4,8,12][d.type]; if(event.value===max)s.maxes++;
  group.push(row); if(groupTimer)clearTimeout(groupTimer);
  groupTimer=setTimeout(function(){group=[];draw();},settings.groupWindow);
  popup={die:d,value:event.value,until:Date.now()+1300};
  if(settings.buzz)Bangle.buzz(event.value===max?250:80);
  setTimeout(function(){popup=undefined;draw();},1300); draw();
}
function onEvent(event){
  if(event.kind==="status")status=event.message;
  if(event.kind==="connected")status="Connected "+event.die.name.substr(-4);
  if(event.kind==="disconnected")status="Reconnecting";
  if(event.kind==="error")status=event.die.error;
  if(event.kind==="stable")addRoll(event); else draw();
}
function header(title){
  g.reset().clearRect(Bangle.appRect);g.setFont("6x8",2).setFontAlign(0,-1);
  g.drawString(title,88,26);g.drawLine(4,45,171,45);
}
function dot(x,y,color){g.setColor(color).fillCircle(x,y,4);}
function dashboard(){
  header("GoDice  "+manager.dice.filter(function(d){return d.connected;}).length+"/"+manager.dice.length);
  g.setFont("6x8",1).setFontAlign(-1,-1);
  if(!manager.dice.length){g.setFont("6x8",2).setFontAlign(0,0).drawString(status,88,92);g.setFont("6x8",1).drawString("Tap to scan",88,120);return;}
  for(var i=0;i<Math.min(6,manager.dice.length);i++){
    var d=manager.dice[i],y=50+i*19;
    dot(9,y+5,d.connected?"#0f0":d.connecting?"#ff0":"#888");
    g.setColor(g.theme.fg).drawString(P.NAMES[d.type],18,y);
    g.setFont("6x8",2).drawString(d.lastRoll===null?"-":d.lastRoll,62,y-4).setFont("6x8",1);
    g.setFontAlign(1,-1).drawString(d.battery===null?"--":d.battery+"%",166,y).setFontAlign(-1,-1);
  }
  g.setFontAlign(0,-1).setColor(g.theme.fg2).drawString(status+" (max "+settings.maxConnections+")",88,166);
}
function historyScreen(){
  header("History");g.setFont("6x8",1).setFontAlign(-1,-1);
  var rows=history.slice(-10).reverse();
  if(!rows.length){g.setFontAlign(0,0).drawString("No rolls yet",88,100);return;}
  rows.forEach(function(r,i){var dt=new Date(r.t),time=("0"+dt.getHours()).slice(-2)+":"+("0"+dt.getMinutes()).slice(-2);g.drawString(time+" "+r.type,7,49+i*12);g.setFontAlign(1,-1).drawString(r.v,168,49+i*12).setFontAlign(-1,-1);});
}
function statsScreen(){
  header("Session stats");g.setFont("6x8",1).setFontAlign(-1,-1);
  var keys=Object.keys(stats);
  if(!keys.length){g.setFontAlign(0,0).drawString("No session rolls",88,100);return;}
  keys.slice(0,6).forEach(function(k,i){var s=stats[k],y=51+i*19;g.drawString(s.type+"  n="+s.count,7,y);g.setFontAlign(1,-1).drawString("avg "+(s.total/s.count).toFixed(1),169,y).setFontAlign(-1,-1);g.setColor(g.theme.fg2).drawString("min "+s.min+" max "+s.max+"  1s "+s.ones,18,y+9).setColor(g.theme.fg);});
}
function popupScreen(){
  g.reset().clearRect(Bangle.appRect).setFontAlign(0,0);
  if(group.length>1){g.setFont("6x8",2).drawString("GROUP  total "+group.reduce(function(a,r){return a+r.v;},0),88,48);g.setFont("6x8",2);group.slice(-5).forEach(function(r,i){g.drawString(r.type+"  "+r.v,88,75+i*18);});}
  else {g.setFont("6x8",2).drawString(P.NAMES[popup.die.type],88,62);g.setFont("Vector",64).drawString(popup.value,88,118);}
}
function draw(){if(!manager)return;if(popup&&Date.now()<popup.until)return popupScreen();if(screen===0)dashboard();else if(screen===1)historyScreen();else statsScreen();}
function chooseType(die){
  var menu={"":{"title":die.name.substr(-8)},"< Back":function(){E.showMenu();draw();},"Identify":function(){manager.identify(die);}};
  P.NAMES.forEach(function(n,i){menu[n]={value:die.type===i,format:function(v){return v?"selected":"";},onchange:function(v){if(v){manager.setType(die,i);E.showMenu();draw();}}};});
  E.showMenu(menu);
}
function mainMenu(){
  var m={"":{"title":"GoDice"},"< Back":function(){E.showMenu();draw();},"Scan now":function(){E.showMenu();manager.scan();},"Clear history":function(){history=[];Storage.erase("godice.history");E.showMenu();draw();},"Reset stats":function(){stats={};E.showMenu();draw();}};
  manager.dice.forEach(function(d,i){m[(i+1)+" "+P.NAMES[d.type]+" "+d.name.substr(-4)]=function(){chooseType(d);};});E.showMenu(m);
}
loadHistory();Bangle.loadWidgets();Bangle.drawWidgets();
manager=new Manager(settings,onEvent);manager.scan();draw();
Bangle.on("swipe",function(lr){screen=(screen+(lr<0?1:2))%3;draw();});
Bangle.on("touch",function(_,xy){
  if(screen===0&&xy.y>=46&&xy.y<164&&manager.dice.length){var i=Math.floor((xy.y-50)/19);if(manager.dice[i])chooseType(manager.dice[i]);}
  else if(screen===0&&!manager.dice.length)manager.scan();
});
setWatch(mainMenu,BTN,{repeat:true,edge:"rising",debounce:50});
E.on("kill",function(){manager.stop();});
