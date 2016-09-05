var url;
var dev;
var token;
var user; //set at login time
var kunden;
var debugLevel = 0;
var projekte;
var techniker;
var loggedIn=0;
var level;
var currentFunction;
var dateFormat = 'yyyy-MM-dd HH:mm';
var dateFormatDay = 'yyyy-MM-dd';
var dateFormatShort = 'dd.MM';
var today = new Date();
var month = today.getMonth()+1;
var year  = today.getFullYear();
var day   = today.getDay();
var kw    = getKWFromDate(today); 
var quartal  = getQuartalFromDate(today);
var dateFrom = new Date();
var dateTo   = new Date();
dateFrom  = getDayFromKW(1,kw,today.getFullYear());
dateTo    = getDayFromKW(8,kw,today.getFullYear());
var editable = false;
var compact = true;
var oldValue = "";
var statusImage = new Object();
statusImage[0] = "<img src='img/notbilled.png'><span style='visibility: hidden;'>0</span>";
statusImage[1] = "<img src='img/euro-green.png'><span style='visibility: hidden;'>1</span>";

if (window.location.toString().search("/dev/") > 0) {
	url = "/cgi-bin/y.cgi";
	dev = 1;
} else {
	url = "/cgi-bin/x.cgi";
	dev = 0;
}
function login(){
	$("#loadingDiv").toggle(true);
	$.ajax({url: url, 
		data: JSON.stringify({	user: $("#loginName").val(),
					pass: $("#loginPass").val(),
					method: "login"}),
		method: "POST",
		contentType: "application/json; charset=utf-8",
		dataType: "json",
		error: function(jqxhr, text, error) {
			debug("Fehler: " + text + " - " + error, "error", 0);
		},
		success: function(result){ 
			checkError(result, 0);
			$("#loadingDiv").toggle(false);
			checkLogin(result); 
	}});
	$("#loginPass").val("");
}
function htmlNoBr(arg) {
	var x = $("<div>").text(arg).html();
	x = x.replace(/'/, "&#39;");
	x = x.replace('dl-ellipse', "&#x2026;");
	x = x.replace(/"/g, "&quot;");
	x = x.replace(/^OTRS #(\d+):/, "OTRS <a target='_blank' href='https://ticket.linkprotect.de/otrs/index.pl?Action=AgentTicketSearch&Subaction=Search&TicketNumber=$1'>#$1:</a>"); 
	return x;
}
function html(arg) {
	var x = htmlNoBr(arg);
	return x.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1'+ "<br/>" +'$2');
}
function debug(text, level, errorSticky) {
	level = level || "information";
	if (!defined(errorSticky)) {
		errorSticky = 1;
	}
	$("#loadingDiv").toggle(false);
	$("#debug").prepend(html(text) + "<br>");
	noty({	text: html(text), 
		type: level, 
		dismissQueue: true,
		maxVisible: 5,
		timeout: (level==="error" && errorSticky)?false:5000,
		layout: 'bottom',
		closewith: 'backdrop',
		animation: {
			open: 'animated bounceInUp',
			close: 'animated flipOutX'
		}, 
	});
}
function logoutConfirm() {
	debug("successfully logged out", "warning"); //never to be seen
	location.reload();
}
function logout() {
	$("#loadingDiv").toggle(true);
	$.ajax({url: url,
		data: JSON.stringify({	method: "logout", 
					token: token}),
		method: "POST",
                contentType: "application/json; charset=utf-8",
                dataType: "json",
		error: function(jqxhr, text, error) {
			debug("Fehler: " + text + " - " + error, "error");
		},
                success: function(result){ 
			checkError(result);
			$("#loadingDiv").toggle(false);
			logoutConfirm(result); 
	}});
}
function checkLogin(arg) {
        token = arg.token;
	user = arg.user;
	level = arg.level;
	if (arg.error) { 
		return; 
	}
	loggedIn = 1;
	debug("login successfull","success");
	$("#login").toggle(false);
	$("#login").dialog("close");
	$("#menu").toggle(400);
	$("#subMenu").toggle(400);
	if(level > 1) {
		getTechniker();
	}
	getKunden();
	//getProjekte();
	setDisplayFunction("requestUserDl");
}
function requestUserDl() {
	$("#loadingDiv").toggle(true);
	$.ajax({url: url,
		data: JSON.stringify({	method: "getMyDl", 
					dateFrom: $.format.date(dateFrom, dateFormatDay), 
					dateTo: $.format.date(dateTo, dateFormatDay), 
					token: token}),
		method: "POST",
                contentType: "application/json; charset=utf-8",
                dataType: "json",
		error: function(jqxhr, text, error) {
			debug("Fehler: " + text + " - " + error, "error");
		},
                success: function(result){ 
			checkError(result);
			$("#loadingDiv").toggle(false);
			displayUserDl(result); 
		}
	});
}
function defined(testvar) {
	if(typeof testvar !== 'undefined'){
		return true;
	}
	return false;
}
function checkError(result, sticky) {
	if (!defined(sticky)) {
		sticky = 1;
	}
	if (result.error) {
		debug(result.errormsg, "error", sticky);
	}
}
function getDayFromKW(day,kw,year) {
	dat = new Date(year,0,1);
	firstDay = dat.getDay();
	if( firstDay == 0 ) firstDay = 7;
	if( firstDay > 4 )
		dat.setTime( dat.getTime() + (8-firstDay) * 24*60*60*1000 );
	else
		dat.setTime( dat.getTime() + (1-firstDay) * 24*60*60*1000 );
	dat.setTime( dat.getTime() + (kw-1)*7*24*60*60*1000 + (day-1)*24*60*60*1000);
	return dat;
}
function getKWFromDate(date) {
	var DonnerstagDat = new Date(date.getTime() + (3-((date.getDay()+6) % 7)) * 86400000);
	var KWJahr = DonnerstagDat.getFullYear();
	var DonnerstagKW = new Date(new Date(KWJahr,0,4).getTime() + (3-((new Date(KWJahr,0,4).getDay()+6) % 7)) * 86400000);
	var kw = Math.floor(1.5 + (DonnerstagDat.getTime() - DonnerstagKW.getTime()) / 86400000/7);
	return kw;
}
function getQuartalFromDate(day) {
	return(Math.floor(day.getMonth()/3)+1);
}
function fixDate(type, mod) {
	window["fixDate" + type](mod);
	if ($("#year" + type + " option[value='" + year  + "']").length < 1) {
		$("#year" + type).append($('<option>', { text: year, value: year }));
	}
	$("#year" + type).val(year);
}
function fixDateMonate(mod){
	month = +$("#Monate").val();
	month += mod;
	if(month < 1) {
		month = 12;
		year--;
	}else if (month > 12) {
		month = 1;
		year++;
	}
	$("#Monate").val(month);
	dateFrom = new Date(year, month-1, 1, 0, 0, 0);
	dateTo   = new Date(year, month  , 1, 0, 0, 0);
}
function fixDateKW(mod){
	kw = +$("#KW").val();
	kw += mod;
	var maxKW = 52;
	dat = new Date(year,0,1);
	if (dat.getDay() == 4) maxKW=53;
	if(kw < 1) {
		year--;
		maxKW = 52;
		dat = new Date(year,0,1);
		if (dat.getDay() == 4) maxKW=53;
		kw = maxKW;
	} else if (kw > maxKW) {
		kw = 1;
		year++;
	}
	$("#KW").val(kw);
	dateFrom = getDayFromKW(1,kw,year);
	dateTo   = getDayFromKW(8,kw,year);
}
function fixDateQuartale(mod) {
	quartal = +$("#Quartale").val();
	quartal += mod;
	if (quartal < 1) {
		year--;
		quartal = 4;
	} else if (quartal > 4) {
		year++;
		quartal = 1;
	}
	$("#Quartale").val(quartal);
	dateFrom = new Date(year, (quartal-1)*3, 1, 0, 0, 0);
	dateTo   = new Date(year, (quartal-1)*3+3, 1, 0, 0, 0);
}	
function fixDateJahre(mod){
	year = +$("#yearJahre").val();
	year += mod;
	dateFrom = new Date(year  , 0, 1, 0, 0, 0);
	dateTo   = new Date(year+1, 0, 1, 0, 0, 0);
}
function setDisplayFunction(funcName) {
	currentFunction=funcName;
	var selectors = ["Tage", "KW", "Monate", "Quartale", "Jahre", "beliebig"];
	jQuery.each( selectors, function( i, val ) { // TODO: should just bind when initing picker mode
		$("#year" + val).unbind("change");
		$("#" + val).unbind("change");
		$("#next" + val).unbind("click");
		$("#prev" + val).unbind("click");
		$("#year" + val).change(function(){year=$("#year" + val).val();fixDate(val,0);window[funcName]();});
		$("#" + val).change(function(){fixDate(val,0);window[funcName]();});
		$("#next" + val).click(function(){fixDate(val,  1);window[funcName]();});
		$("#prev" + val).click(function(){fixDate(val, -1);window[funcName]();});
		
	});
	$("#dateSelectorType").unbind("change");
	$("#dateSelectorType").change(function(){
		chDateSelector($("#dateSelectorType").val());
	})
	$("#dateSelectorType").change(function(){window[funcName]();});
	var selectors = ["requestTecCust", "requestUserDl"];
	jQuery.each( selectors, function( i, val ) {
			$("#" + val + "Div").toggle(funcName === val);
	});
	$(".print").unbind("click");
	var tableID = (funcName + "XXX").replace("request","#").replace("XXX", "Table");
	$(".print").click(function(){
		$(tableID).trigger('printTable');
  	});
	$("#UserDlTableColumns").toggle(funcName === "requestUserDl");
	$("#TecCustTableColumns").toggle(funcName === "requestTecCust");
	window[funcName]();
}
function requestTecCust() {
	$("#loadingDiv").toggle(true);
	$.ajax({url: url,
		data: JSON.stringify({	method: "getTecCust", 
					dateFrom: dateFrom, 
					dateTo: dateTo, 
					token: token}),
		method: "POST",
                contentType: "application/json; charset=utf-8",
                dataType: "json",
		error: function(jqxhr, text, error) {
			debug("Fehler: " + text + " - " + error, "error");
		},
                success: function(result){ 
			checkError(result);
			$("#loadingDiv").toggle(false);
			displayTecCust(result); 
	}});
}
function displayTecCust(r){
	var theTable = new Object();
	var technikerHash = new Object();
	var technikerArray = new Array();
	var kundeKurzHash = new Object();
	for (var i=0; i<r.result.length; i++) { // fill sparse table
		if (!(r.result[i]['kunde'] in theTable)){ // create sub-objects
			theTable[r.result[i]['kunde']] = new Object();
			kundeKurzHash[r.result[i]['kunde']] = r.result[i]['kurz'] 
		}
		if (!(r.result[i]['kunde'][r.result[i]['techniker']] in theTable)){
			technikerHash[r.result[i]['techniker']]=0; // collect techniker
			theTable[r.result[i]['kunde']][r.result[i]['techniker']] = 0; // init
		}
		theTable[r.result[i]['kunde']][r.result[i]['techniker']] += parseInt(r.result[i]['ze']);
	}
	for (var tec in technikerHash){
		technikerArray.push(tec);
	}
	technikerArray.sort();
	$("#tecCustHead").html("<th>Kunde</th><th width=50''>Kurz</th><th>" + 
			technikerArray.join("</th><th>") + 
			"</th><th>Summe</th>");
	var tableBody = "";
	for (var kunde in theTable){
		var totalKunde = 0;
		tableBody += "<tr><td class='editable dlupdate-name'>" + html(kunde) + "</td><td class='editable dlupdate-kurz'>" + html(kundeKurzHash[kunde]) + "</td>";
		for (var i=0; i<technikerArray.length; i++){
			var val = 0;
			if (technikerArray[i] in theTable[kunde]) {
				val = theTable[kunde][technikerArray[i]];
			}
			totalKunde += parseInt(val);
			technikerHash[technikerArray[i]] += parseInt(val);
			if (val == 0) val ="";
			tableBody += '<td align="right">' + val + "</td>";
		}
		tableBody += '<td align="right">' + totalKunde + '</tr>';
	}
	$("#tecCustBody").html(tableBody);
	var totalTotal = 0;
	var tableFoot = "";
	for (var i=0; i<technikerArray.length; i++){
		tableFoot += '<th align="right">' + 
				technikerHash[technikerArray[i]] + 
			'</th>';
		totalTotal += technikerHash[technikerArray[i]];
	}
	$("#tecCustFoot").html(	"<th>Summe (Filter unbeachtet)</th><th></th>" +
		tableFoot +
		'<th align="right">' + 
			totalTotal + 
		'</th>');
	$("#requestTecCustDiv").toggle(true);
	$("#TecCustTable").trigger("updateAll");
	$("#TecCustTable").trigger('refreshColumnSelector',  [ 'selectors', true ]);
	editable = !editable;
	switchEditable();
	setupEditable();
}
function switchEditable(edit) {
	editable = edit || editable;
	if (editable) {
		editable = false;
		$("#switchEditable").html("bearbeiten: aus");
		$('.editable').attr('contenteditable','false');
		$('body').removeClass("alert");
	} else {
		editable = true;
		$("#switchEditable").html("bearbeiten: an");
		$('.editable').attr('contenteditable','true');
		$('.editable').focus(function(){
			oldValue = $(this).text();
		});
		$('body').addClass("alert");
		var id = window.setTimeout(switchEditable, 15*60*1000, true);
	}
}
function setupEditable() {
	$('.editable').blur(function(){
		if (oldValue != $(this).text()) {
			var field = $.grep(this.className.split(" "), function(v, i){
				return v.indexOf('dlupdate-') === 0;
			}).join();
			$("#loadingDiv").toggle(true);
			$.ajax({url: url,
				data: JSON.stringify({	method: "updateDl", 
							token: token,
							field: field,
							value: $(this).text(),
							oldvalue: oldValue,
							id: $(this).siblings(".dlupdate-id").attr("dlid")
				}),
				method: "POST",
		                contentType: "application/json; charset=utf-8",
		                dataType: "json",
				error: function(jqxhr, text, error) {
					debug("Fehler: " + text + " - " + error, "error");
				},
		                success: function(result){ 
					checkError(result);
					if(!result.error) {
						debug(result.errormsg, "success");
					} else {
						window[currentFunction]();
					}
					$("#loadingDiv").toggle(false);
					if(result.field == "kunde") {
						var split = result.newvalue.split(/dldelim/);
						result.newvalue = split[0];
						$("td.dlupdate-id[dlid='" + result.id + "']").siblings(".dlupdate-kundelang").text(split[1]);
					}
					$("td.dlupdate-id[dlid='" + result.id + "']").siblings(".dlupdate-" + result.field).text(result.newvalue);
					$("td.dlupdate-id[dlid='" + result.id + "']").siblings(".dlupdate-editor").text(result.editor);
					$("td.dlupdate-id[dlid='" + result.id + "']").siblings(".dlupdate-time_edit").text(result.timeedit.substr(0,16));
					$("#UserDlTable").trigger("update"); //ignore TecCust for now
					countDlTotal(); //could be conditional
			}});
		}
	});
	$('.editable').focus(function(){
		if( $(this).siblings(".dlupdate-status").attr("value") == 1) {
			oldValue = $(this).text(); //prevent triggering of update
			debug("Abgerechnete Eintäge dürfen nicht mehr editiert werden", "information");
			$(this).blur();
		}
	});
	if(level==2) {
		$('.dlupdate-status').click(function() {
			if (!editable) { return;}
			$("#loadingDiv").toggle(true);
			$.ajax({url: url,
				data: JSON.stringify({	method: "updateDl", 
							token: token,
							field: "status",
							value: (parseInt($(this).attr("value"))+1)%2 ,
							oldvalue: $(this).attr("value"),
							id: $(this).siblings(".dlupdate-id").attr("dlid")
				}),
				method: "POST",
		                contentType: "application/json; charset=utf-8",
		                dataType: "json",
				error: function(jqxhr, text, error) {
					debug("Fehler: " + text + " - " + error, "error");
				},
		                success: function(result){ 
					checkError(result);
					if(!result.error) {
						debug(result.errormsg, "success");
					}
					$("#loadingDiv").toggle(false);
					$("td.dlupdate-id[dlid='" + result.id + "']").siblings(".dlupdate-editor").html(result.editor);
					$("td.dlupdate-id[dlid='" + result.id + "']").siblings(".dlupdate-time_edit").html(result.timeedit.substr(0,16));
					$("td.dlupdate-id[dlid='" + result.id + "']").siblings(".dlupdate-status").html(statusImage[result.newvalue]); //gfx here
					$("td.dlupdate-id[dlid='" + result.id + "']").siblings(".dlupdate-status").attr("value",result.newvalue);
					$("#UserDlTable").trigger("update"); //ignore TecCust for now
			}});
		});
	}
}
function switchCompact() {
	compact = !compact;
	if(compact) {
		$("#switchCompact").html("kompakt: an");
		$(".dlupdate-projekt, .dlupdate-kundelang").addClass("nobr");
	} else {
		$("#switchCompact").html("kompakt: aus");
		$(".dlupdate-projekt, .dlupdate-kundelang").removeClass("nobr");
	}
}
function switchDebug() {
	$("#debug").toggle(100);
	debugLevel++;
	debugLevel %= 2;
}
function displayUserDl(res){
	var len = res.result.length; 
	var txt = "";
	var days  = new Array ("So", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So");
	for (var i=0; i<len; i++) {
		var tech = res.result[i]['techniker'].substr(0,20);
		var edit = res.result[i]['editor'].substr(0,20);
		var highlight = "";
		var highlightday ="";
		var feiertag = "";
		var hour = res.result[i]['time_dl'].substr(11,2);
		var day = new Date(res.result[i]['time_dl'].replace(/-/g, "/")).getDay();
		if (	hour <  9 ||  // arbeit vor 9h 
			hour > 18 ) {  // arbeit ab 19h
			highlight = "highlight";
		} 
		if (	day  >  5 ){   // arbeit am Wochenende
			highlightday = "highlight";
		} 
		if (	feiertag = isFeiertagStr(res.result[i]['time_dl'].substr(0,10))) { // arbeit am Feiertag
			highlightday = "highlight";
		} else {
			feiertag = "";
		}
		var css = "";
		if (res.result[i].deleted == 1) {
			css='class="deletedRow"';
		}
		htmlNoBr(html(res.result[i]['projekt']));
		txt +=  "<tr " + css +">" +
				"<td>"  + 
					tech + 
				"</td>" +
				'<td class="dlupdate-kunde editable" title="' + htmlNoBr(html(res.result[i]['name']))  + '">' +
					html(res.result[i]['kurz']) +
				"</td>" + 
				'<td class="dlupdate-kundelang">' +
					html(res.result[i]['name']) +
				"</td>" + 
				'<td class="dlupdate-projekt editable" title="' + htmlNoBr(html(res.result[i]['projekt'])) + '">' +  
					html(res.result[i]['projekt']) +
				"</td>" + 
				"<td align='right' class='dlupdate-ze editable'>" + 
					res.result[i]['ze'] +
				'</td>' +
				'<td class="nobr ' + highlightday + '" title="' + feiertag + '">' + 
					days[day] + 
				'</td>' +
				'<td class="dlupdate-time_dl editable nobr ' + highlight + '">' + 
					res.result[i]['time_dl'].substr(0,16) +
				'</td>'  +
				'<td class="nobr dlupdate-time_edit">' + 
					res.result[i]['time_edit'].substr(0,16) +
				'</td>' + 
				'<td align="right" class="dlupdate-anfahrt editable">' + 
					res.result[i]['anfahrt'] +
				"</td>" +
				"<td class='dlupdate-editor'>" + 
					edit +
				'</td>' +
				"<td class='dlupdate-status' align='center' value='" + res.result[i]['status'] + "'>" +
					statusImage[res.result[i]['status']] +
				'</td>' +
				'<td class="nobr dlupdate-id" align="right" dlid="' + res.result[i]['id'] + '">' + 
					res.result[i]['id']  +
					" <img src='img/clock.png'> " +
				"</td>" +
			"</tr>";
	}
	$("#userDl").html(txt);
	$("#UserDlTable").trigger("update");
	$("#requestUserDlDiv").toggle(true);
	$("#kunde").autocomplete({source: kunden, autoFocus: true});
	$("#timeDl").val("");//$.format.date(new Date(), dateFormat));
	$("#timeDl").datetimepicker({
		format:'Y-m-d H:i',
		validateOnBlur: false,
		dayOfWeekStart: 1,
		lang: 'de',
		defaultHours:14});
	$("#kunde").focus();
	if(level == 1) {
		$("#nameTec").prop('disabled', true);
		$("#nameTec").val(user);
	} else {
		$("#nameTec").autocomplete({source: techniker});
	}
	$(".dlupdate-id").click(function(){
		showDlHistory($(this).attr("dlid")); 
	});
	editable = !editable;
	switchEditable();
	setupEditable();
	compact = !compact; 
	switchCompact();
	autosize($("#projekt"));
}
function addDl(){
	if(! ($("#timeDl").val().match(/^\d\d\d\d-\d\d-\d\d \d\d:\d\d$/)) ){
		$("#timeDl").val($.format.date(new Date(), dateFormat));
	}
	var dateNow = new Date();
	var xx = $("#timeDl").val().substr(0,10);
	var dateThen = new Date(xx);
	var timediff = Math.ceil((dateThen - dateNow)/1000/60/60/24);
	if (Math.abs(timediff) > 6) {
		if(timediff > 0) {
			$("#dlTimeText").text(Math.abs(timediff) + " Tage in der Zukunft");
		} else {
			$("#dlTimeText").text(Math.abs(timediff) + " Tage in der Vergangenheit");
		}
		$("#dlTimediff").dialog({
			resizable: true,
			modal: true,
			width: 500,
			buttons: {
				"Abspeichern": function() {
					addDlDo();
					$(this).dialog("close");
				},
				"Abbrechen": function() {
					$("#timeDl").focus();
					$(this).dialog("close");
				}
			}
		});
	} else {
		addDlDo();
	}
}
String.prototype.shorten=function(maxlen){
	if(this.length > maxlen) {
		return this.substr(0,maxlen) + "dl-ellipse";
	} else {
		return this;
	}
}
function showDlHistory(id) {
	$("#loadingDiv").toggle(true);
	$.ajax({url: url,
		data: JSON.stringify({method: "getDlHistory",
					token: token,
					id: id}),
		method: "POST",
		contentType: "application/json; charset=utf-8",
                dataType: "json",
		error: function(jqxhr, text, error) {
			debug("Fehler: " + text + " - " + error, "error");
		},
                success: function(result){ 
			checkError(result);
			var table;	
			var cols = ['Aktiv', 'Techniker', 'Kunde', 'Projekt', 'ZEarbeit', 'ZeitDl', 'ZeitEdit', 'ZEfahrt', 'Editor', 'Status', 'id'];
			var classextra;
			jQuery.each( result.result, function( i, val ) {
				table += "<tr>";
				jQuery.each(cols, function(n, val2) {
					if(i>0 
						&& val2 != "id" 
						&& val2 != "ZeitEdit" 
						&& val2 != "Aktiv" 
						&& result.result[i-1][val2] != val[val2]) {
						classextra = "highlight";
					} else {
						classextra = "";
					}
					table += "<td class='nobr " + classextra + "' title='" + htmlNoBr(html(val[val2])) + "'>" + html(val[val2].shorten(30)) + "</td>";
				});
				table += "</tr>";
			});
			$("#dlHistoryTableBody").html(table);
			$("#dlHistoryTable").trigger("updateAll");
			$("#dlHistory").dialog({
				resizable: true,
				modal: true,
				width: 1100,
				title: "Historie von id " + result.id,
				buttons: {
					"OK": function() {
						$(this).dialog("close");
					},
				}
			});
			$("#loadingDiv").toggle(false);
		}
	});
}
function addDlDo(){
	$("#loadingDiv").toggle(true);
	$.ajax({url: url,
		data: JSON.stringify({method: "addDl",
					token: token,
					kunde: kunde=$("#kunde").val(),
					timeDl: $("#timeDl").val(),
					nameDl: $("#nameTec").val(),
					ze: $("#aufwand").val(),
					anfahrt: $("#anfahrt").val(),
					projekt: $("#projekt").val()}),
		method: "POST",
		contentType: "application/json; charset=utf-8",
                dataType: "json",
		error: function(jqxhr, text, error) {
			debug("Fehler: " + text + " - " + error, "error");
		},
                success: function(result){ 
			checkError(result);
			$("#loadingDiv").toggle(false);
			if (result.error == 3) {
				$("#newCust").dialog("open");
				$("#newCustName").val($("#kunde").val());
				$("#newCustKurz").val($("#kunde").val());
			}
			if(result.error == 0) {
				debug("Dienstleistung erfolgreich eingetragen", "success");
				$("#kunde").val("");
				$("#nameTec").val("");
				$("#projekt").val("");
				$("#aufwand").val("");
				$("#anfahrt").val("");
				requestUserDl();
			}
		}
	});
}
function autocompleteProjekte(){
	$("#loadingDiv").toggle(true);
	$("#projekt").autocomplete({
		autoFocus: true, 
		delay: 0, 
		minLength: 1, 
		source: function (request, response) {
			 $.ajax({url: url,
			 	data: JSON.stringify({method: "getProjects", token: token, project: "%" +request.term + "%"}),
				method: "POST",
				contentType: "application/json; charset=utf-8",
				dataType: "json",
				error: function(jqxhr, text, error) {
					debug("Fehler: " + text + " - " + error, "error");
				},
				success: function(result){ 
					checkError(result);
					$("#loadingDiv").toggle(false);
					response(result.result);
				}
			});
    		}
	});
}
function getTechniker() {
	$("#loadingDiv").toggle(true);
	$.ajax({url: url,
		data: JSON.stringify({method: "getTechnicans", token: token}),
                method: "POST",
		contentType: "application/json; charset=utf-8",
		dataType: "json",
		error: function(jqxhr, text, error) {
			debug("Fehler: " + text + " - " + error, "error");
		},
		success: function(result){ 
			checkError(result);
			$("#loadingDiv").toggle(false);
			populateTechniker(result.result); 
	}});
}
function populateTechniker(arg){
	techniker=arg;
	$("#userDl").autocomplete({source: techniker});
}
function getKunden() {
	$("#loadingDiv").toggle(true);
	$.ajax({url: url,
		data: JSON.stringify({method: "getCustomers", token: token}),
                method: "POST",
		contentType: "application/json; charset=utf-8",
		dataType: "json",
		error: function(jqxhr, text, error) {
			debug("Fehler: " + text + " - " + error, "error");
		},
		success: function(result){ 
			checkError(result);
			$("#loadingDiv").toggle(false);
			populateKunden(result.result); 
	}});
}
function populateKunden(arg){
	kunden=arg;
	$("#kunde").autocomplete({source: kunden});
}
function saveCust(kurz, name) {
	$("#loadingDiv").toggle(true);
	$.ajax({url: url,
		data: JSON.stringify({method: "addCustomer", token: token, name: name, kurz: kurz}),
		method: "POST",
                contentType: "application/json; charset=utf-8",
                dataType: "json",
		error: function(jqxhr, text, error) {
			debug("Fehler: " + text + " - " + error, "error");
		},
                success: function(result){ 
			checkError(result);
			$("#loadingDiv").toggle(false);
			if(result.error != 0) {
				debug("Error creating costumer: " + result.errormsg, "error");
			} else {		
				$("#newCust").dialog("close");
				getKunden();
				$("#kunde").val(name);
				addDl();
			}
	}});
}
function chDateSelector(selector){
	var selectors = ["Tage", "KW", "Monate", "Quartale", "Jahre", "beliebig"];
	jQuery.each( selectors, function( i, val ) {
			$("#" + val + "Div").toggle(selector === val);
	});
	year = dateFrom.getFullYear();
	$("#year" + selector).val(year);
	window["init" + selector]();
}
function initKW(){
	kw = getKWFromDate(dateFrom);
	$("#KW").val(kw);
	dateFrom = getDayFromKW(1, kw, year);
	dateTo   = getDayFromKW(8, kw, year);
}
function countDlTotal(){
	var total=0;
	$('#UserDlTable tr:visible > td.dlupdate-ze').each(function (i) {
		total += parseInt($(this).text());
	});
	$("#totalTime").html(total);
	total = 0;
	$('#UserDlTable tr:visible > td.dlupdate-anfahrt').each(function (i) {
		total += parseInt($(this).text());
	});
	$("#totalTimeAnfahrt").html(total);
}
function initQuartale(){
	$("#Quartale").val(getQuartalFromDate(dateFrom));
	dateFrom = new Date(year, (quartal-1)*3, 1, 0, 0, 0);
	dateTo   = new Date(year, (quartal-1)*3+3, 1, 0, 0, 0);
}
function initTage(){}
function initbeliebig(){}
function initJahre(){
	dateFrom = new Date(year    , 0 , 1, 0, 0, 0);
	dateTo = new Date(year + 1, 0 , 1, 0, 0, 0);
}
function initMonate(){
	$("#Monate").val(dateFrom.getMonth()+1);
	dateFrom = new Date ($("#yearMonate").val(), dateFrom.getMonth(),1,0,0,0);
	dateTo   = new Date ($("#yearMonate").val(), dateFrom.getMonth()+1,1,0,0,0);
}
$(function(){
	$("#projekt").keypress(function (e) {
			if ((e.keyCode == 10 || e.keyCode == 13) && e.ctrlKey){
			addDl(); 
			return false;
		}
	});
	$("#nameTec, #kunde, #timeDl, #aufwand, #anfahrt").keypress(function (e) { 
		if (e.which == 13) { 
			addDl(); 
			return false;
		}
	});
	autocompleteProjekte();
	$("#addLine").click(function() {
		addDl();
	});
	var sorting = new Object();
	sorting['TecCustTable'] = [[0,0]];
	sorting['UserDlTable'] = [[6,0],[0,0]];
	sorting['dlHistoryTable'] = [[0,0],[10,0]];
	$(".tablesorter").each(function(i, table){
		var $table = $(table);
		console.log($table[0].id);
		$table.tablesorter({
			theme: "blue", 
			widthFixed: false, 
			widgets: ["zebra", "filter", "print", "columnSelector"], 
			sortList: sorting[$table[0].id],
			widgetOptions : {
				filter_hideEmpty : true,
				filter_hideFilters : true,
				filter_resetOnEsc : true,
				filter_liveSearch : true,
				columnSelector_container : $('#columnSelector' + $table[0].id),
				columnSelector_mediaquery: false,
				print_title      : '',          // this option > caption > table id > "table"
				print_dataAttrib : 'data-name', // header attrib containing modified header name
				print_rows       : 'v',         // (a)ll, (v)isible, (f)iltered, or custom css selector
				print_columns    : 's',         // (a)ll, (v)isible or (s)elected (columnSelector widget)
				print_extraCSS   : '.noprint {display:none;}',          // add any extra css definitions for the popup window here
				print_styleSheet : './css/dl.css', // add the url of your print stylesheet
				print_now        : true,         // Open the print dialog immediately if true
				print_callback   : function(config, $table, printStyle){
					$.tablesorter.printTable.printOutput( config, $table.html(), printStyle );
				}
			}
		}).bind('filterStart', function(event, config){
			$("#loadingDiv").toggle(true);
		}).bind('filterEnd', function(event, config){
			countDlTotal();
			$("#loadingDiv").toggle(false);
		});
	});
	$("#debug").toggle(false);
	$("#newCust").toggle(false);
	$("#login").toggle(false);
	$("#menu").toggle(false);
	$("#dlHistory").toggle(false);
	$("#requestUserDlDiv").toggle(false);
	$("#loadingDiv").toggle(false);
	$("#subMenu").toggle(false);
	$("#dlTimediff").toggle(false);
	chDateSelector($("#dateSelectorType").val());
	$("#dateSelectorType").change(function(){
		chDateSelector($("#dateSelectorType").val());
	})
	$("#login").dialog({closeOnEscape: false,
				modal: true,
				open: function(event, ui) { 
				   	$(".ui-dialog-titlebar-close", $(this).parent()).hide(); 
				},
				resizable: false});
	$("#newCust").dialog({  autoOpen: false,
				modal: true,
				show: 100,
				buttons: [{
					text: "speichern",
					click: function() {
						saveCust($("#newCustKurz").val(),
							$("#newCustName").val()); 
					}
				},{
					text: "verwerfen",
					click: function() {
						$(this).dialog("close");
					}
				}]
					
	});

	$("#showDeleted").click(function(){$(".deletedRow").toggle(300);});
	$("#showDl").click(function(){setDisplayFunction("requestUserDl");});
	$("#showCustTec").click(function(){setDisplayFunction("requestTecCust");});
	$("#switchDebug").click(function(){switchDebug();});
	$("#switchCompact").click(function(){switchCompact();});
	$("#switchEditable").click(function(){switchEditable();});
	$("#logout").click(function(){logout();});
	$("#loginButton").click(function(){login();});
	$("#newCustKurz, #newCustName").keypress(function (e) {
		if (e.which == 13) { 
			saveCust($("#newCustKurz").val(),
				$("#newCustName").val()); 
			return false;
		}
	});
	$("#loginName, #loginPass").keypress(function (e) {
		if (e.which == 13) { 
			login(); 
			return false;
		}
	});
	for (var i=2015; i<year+2; i++){ 
		$("#yearMonate").append($('<option>', { text: i, value: i}));
		$("#yearKW").append($('<option>', { text: i, value: i }));
		$("#yearQuartale").append($('<option>', { text: i, value: i }));
		$("#yearJahre").append($('<option>', { text: i, value: i }));
	}
	$(document).tooltip({
        	content: function() {
            		var element = $( this );
            		if ( element.is( "[title]" ) ) {
              			return element.attr( "title" );
            		}
          	},
      		position: {
        		my: "center bottom-20",
        		at: "center top",
      		}
    	});	
	fixDate("KW", 0);
	login();	
}); 
