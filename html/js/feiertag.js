function isFeiertagStr(datum) {
  var year = datum.split('-')[0];
  return getFeiertage(year)[datum];
}
function getFeiertage(j) { 
 var ft = new Object();
 ft[j+'-01-01'] = "Neujahr";
 ft[j+'-01-06'] = "Heilig Drei Könige"; 
 ft[j+'-05-01'] = "Tag der Arbeit";
 ft[j+'-10-03'] = "Tag der Deutschen Einheit";
 ft[j+'-12-25'] = "1. Weihnachtsfeiertag";
 ft[j+'-12-26'] = "1. Weihnachtsfeiertag";
 ft[j+'-08-15'] = "Maria Himmelfahrt";
 ft[j+'-11-01'] = "Allerheiligen";

 var easter_date = new Date(getOstern(j));
 var karfreitag = new Date(easter_date.getTime());
 karfreitag.addDays(-2);
 var ostermontag = new Date(easter_date.getTime());
 ostermontag.addDays(1);
 var christi_himmelfahrt = new Date(easter_date.getTime());
 christi_himmelfahrt.addDays(39);
 var pfingstsonntag = new Date(easter_date.getTime());
 pfingstsonntag.addDays(49);
 var pfingstmontag = new Date(easter_date.getTime());
 pfingstmontag.addDays(50);
 var fronleichnam = new Date(easter_date.getTime());
 fronleichnam.addDays(60);
 
 ft[toDS(karfreitag)] = "Karfreitag";
 ft[toDS(ostermontag)] = "Ostermontag";
 ft[toDS(christi_himmelfahrt)] = "Christi Himmelfahrt";
 ft[toDS(pfingstmontag)] = "Pfingstmontag";
 return ft;
}

function getOstern(Y) {
 Y = +Y;
 var K  = Math.floor(Y/100);
 var M  = 15 + Math.floor((3*K + 3)/4) - Math.floor((8 * K + 13)/25);
 var S  = 2 - Math.floor((3 * K + 3) / 4);
 var A  = Y % 19;
 var D  = (19 * A + M) % 30;
 var R  = Math.floor((D + Math.floor(A / 11)) / 29);
 var OG = 21 + D - R;
 var SZ = 7 - (Y + Math.floor(Y / 4) + S) % 7;
 var OE = 7 - (OG - SZ) % 7;
 var OS = OG + OE;

 OSDate = new Date(Y, 2, 0);
 OSDate.addDays(OS);
 return OSDate.getTime();
}

// macht aus 1 => 01
function two(number) { return (number < 10) ? '0' + number : number; }

// wandelt ein Date-Objekt in einen Datumsstring um yyy-mm-dd
function toDS(date) { 
 var year = date.getYear() + 1900; 
 var month = date.getMonth()+1; 
 month = two(month);
 day = two(date.getDate());
 return year + '-' + month + '-' +day;
}
// Erweitert Date um eine addDays()-Methode
Date.prototype.addDays = function(days) {
     this.setDate(this.getDate()+days);
}
