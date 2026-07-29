/* GoDice dashboard for Bangle.js 2 */
var Storage=require("Storage");
var P=require("godice.protocol.js");
var Manager=require("godice.manager.js");
var defaults={buzz:true,historySize:60,groupWindow:750,scanSeconds:6,rescanSeconds:20,maxConnections:2,types:{}};
var settings=Object.assign(defaults,Storage.readJSON("godice.json",1)||{});
var manager,screen=0,dashPage=0,history=[],stats={},popup,group=[],groupTimer,status="Starting",dragged=false,modal=false;
var COLORS=["#000","#f00","#0f0","#00f","#ff0","#f80"];
var COLOR_NAMES=["Black","Red","Green","Blue","Yellow","Orange"];

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
  if(event.kind==="scan")status=event.count?"Found "+event.count:"No dice; saw "+event.seen;
  if(event.kind==="connected")status="Connected "+event.die.name.substr(-4);
  if(event.kind==="disconnected")status="Reconnecting";
  if(event.kind==="error")status=event.die.error+": "+event.error;
  if(event.kind==="writeError")status="Write failed "+event.die.name.substr(-4);
  if(event.kind==="stable")addRoll(event); else draw();
}
function header(title){
  g.reset().clearRect(Bangle.appRect);g.setFont("6x8",2).setFontAlign(0,-1);
  g.drawString(title,88,26);g.drawLine(4,45,171,45);
}
function dot(x,y,color){g.setColor(color).fillCircle(x,y,4);}
function dashboard(){
  header("GoDice  "+manager.dice.filter(function(d){return d.connected;}).length+"/"+manager.dice.length);
  if(!manager.dice.length){g.setFont("6x8",2).setFontAlign(0,0).drawString(status,88,92);g.setFont("6x8",1).drawString("Tap to scan",88,120);return;}
  var pages=Math.ceil(manager.dice.length/3),start=dashPage*3;
  if(dashPage>=pages){dashPage=0;start=0;}
  for(var i=0;i<3&&start+i<manager.dice.length;i++){
    var d=manager.dice[start+i],y=48+i*37;
    g.setColor(i&1?g.theme.bg2:g.theme.bg).fillRect(2,y,173,y+34);
    dot(10,y+10,d.connected?"#0f0":d.connecting?"#ff0":"#888");
    g.setColor(g.theme.fg).setFont("6x8",2).setFontAlign(-1,-1).drawString(P.NAMES[d.type],20,y+2);
    g.setFont("Vector",28).setFontAlign(0,-1).drawString(d.lastRoll===null?"-":d.lastRoll,91,y);
    g.setFont("6x8",1).setFontAlign(1,-1).drawString(d.battery===null?"BAT --":("BAT "+d.battery+"%"),169,y+3);
    g.setColor(g.theme.fg2).drawString(d.connected?"ONLINE":d.connecting?"CONNECT":"OFFLINE",169,y+19);
    if(d.color!==null&&COLORS[d.color]){
      g.setColor(COLORS[d.color]).fillCircle(24,y+26,6);
      g.setColor(g.theme.fg).drawCircle(24,y+26,7);
    }
  }
  g.setFont("6x8",1).setFontAlign(0,-1).setColor(g.theme.fg2);
  g.drawString((pages>1?("Page "+(dashPage+1)+"/"+pages+"  "):"")+status,88,160);
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
function draw(){if(!manager||modal)return;if(popup&&Date.now()<popup.until)return popupScreen();if(screen===0)dashboard();else if(screen===1)historyScreen();else statsScreen();}
function closeMenu(){modal=false;E.showMenu();draw();}
function notice(text,die){
  modal=true;E.showMessage(text,"GoDice");
  setTimeout(function(){if(die)chooseType(die);else closeMenu();},1200);
}
function chooseType(die){
  modal=true;
  var menu={"":{"title":die.name.substr(-8)},"< Back":closeMenu,
    "Status":{value:die.connected,format:function(){return die.connected?"ONLINE":die.connecting?"CONNECT":"OFFLINE";}},
    "Battery":{value:die.battery||0,format:function(){return die.battery===null?"unknown":die.battery+"%";}},
    "Color":{value:die.color||0,format:function(){return die.color===null?"unknown":COLOR_NAMES[die.color]||("code "+die.color);}},
    "Connect":function(){
      if(die.connected)return notice("Already ONLINE",die);
      if(die.connecting)return notice("Connection in progress",die);
      modal=false;E.showMenu();status="Connecting "+die.name.substr(-4);manager.connect(die);draw();
    },
    "Refresh":function(){
      if(!die.connected)return notice("Die is OFFLINE\nWake it and scan.",die);
      E.showMessage("Requesting...","GoDice");
      manager.refresh(die).then(function(){setTimeout(function(){chooseType(die);},700);})
        .catch(function(e){notice("Write failed\n"+e,die);});
    },
    "Identify":function(){
      if(!die.connected)return notice("Die is OFFLINE\nWake it and scan.",die);
      E.showMessage("Lighting blue...","GoDice");
      manager.identify(die).then(function(){notice("LED command sent",die);})
        .catch(function(e){notice("Write failed\n"+e,die);});
    }};
  P.NAMES.forEach(function(n,i){menu[n]={value:die.type===i,format:function(v){return v?"selected":"";},onchange:function(v){if(v){manager.setType(die,i);closeMenu();}}};});
  E.showMenu(menu);
}
function mainMenu(){
  if(modal)return;
  modal=true;
  var m={"":{"title":"GoDice"},"< Back":closeMenu,"Scan now":function(){modal=false;E.showMenu();manager.scan();draw();},"Clear history":function(){history=[];Storage.erase("godice.history");closeMenu();},"Reset stats":function(){stats={};closeMenu();}};
  manager.dice.forEach(function(d,i){m[(i+1)+" "+P.NAMES[d.type]+" "+d.name.substr(-4)]=function(){chooseType(d);};});E.showMenu(m);
}
loadHistory();Bangle.loadWidgets();Bangle.drawWidgets();
manager=new Manager(settings,onEvent);manager.scan();draw();
Bangle.on("swipe",function(lr){if(modal)return;screen=(screen+(lr<0?1:2))%3;draw();});
Bangle.on("touch",function(_,xy){
  if(modal)return;
  if(screen===0&&xy.y>=46&&xy.y<158&&manager.dice.length){
    var i=dashPage*3+Math.floor((xy.y-48)/37);if(manager.dice[i])chooseType(manager.dice[i]);
  }
  else if(screen===0&&xy.y>=158&&manager.dice.length>3){dashPage=(dashPage+1)%Math.ceil(manager.dice.length/3);draw();}
  else if(screen===0&&!manager.dice.length)manager.scan();
});
setWatch(mainMenu,BTN,{repeat:true,edge:"rising",debounce:50});
E.on("kill",function(){manager.stop();});
