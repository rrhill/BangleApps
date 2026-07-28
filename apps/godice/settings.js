(function(back){
  var S=require("Storage"),s=S.readJSON("godice.json",1)||{};
  function save(){S.writeJSON("godice.json",s);}
  E.showMenu({"":{"title":"GoDice"},"< Back":back,
    "Buzz on roll":{value:s.buzz!==false,onchange:function(v){s.buzz=v;save();}},
    "History rows":{value:s.historySize||60,min:10,max:200,step:10,onchange:function(v){s.historySize=v;save();}},
    "Group ms":{value:s.groupWindow||750,min:250,max:2000,step:250,onchange:function(v){s.groupWindow=v;save();}},
    "Live links":{value:s.maxConnections||2,min:1,max:6,step:1,onchange:function(v){s.maxConnections=v;save();}},
    "Scan seconds":{value:s.scanSeconds||6,min:3,max:15,step:1,onchange:function(v){s.scanSeconds=v;save();}},
    "Rescan sec":{value:s.rescanSeconds||20,min:10,max:120,step:5,onchange:function(v){s.rescanSeconds=v;save();}}
  });
})
