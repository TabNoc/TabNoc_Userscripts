// ==UserScript==
// @name        GreaseMonkey-ExtensionFunctions
// @description GreaseMonkey Lib ©2015 TabNoc
// @version     v1.4.2
// date			12.07.2015
// @require     http://code.jquery.com/jquery-2.1.1.min.js
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// ==/UserScript==

TabNoc_GM = {};

unsafeWindow.TabNoc_GM = cloneInto(TabNoc_GM, unsafeWindow, {
	wrapReflectors : true
});
exportFunction(GM__getValue, unsafeWindow.TabNoc_GM, {
	defineAs : "_getValue"
});
exportFunction(GM__setValue, unsafeWindow.TabNoc_GM, {
	defineAs : "_setValue"
});
exportFunction(GM__deleteValue, unsafeWindow.TabNoc_GM, {
	defineAs : "_deleteValue"
});
exportFunction(function(arg1, arg2, arg3){return GM_getValue(arg1, arg2, arg3);}, unsafeWindow.TabNoc_GM, {
	defineAs : "getValue"
});
exportFunction(function(arg1, arg2, arg3){return GM_setValue(arg1, arg2, arg3);}, unsafeWindow.TabNoc_GM, {
	defineAs : "setValue"
});
exportFunction(function(arg1, arg2, arg3){return GM_deleteValue(arg1, arg2, arg3);}, unsafeWindow.TabNoc_GM, {
	defineAs : "deleteValue"
});
exportFunction(GM__alertValue, unsafeWindow.TabNoc_GM, {
	defineAs : "alertValue"
});
exportFunction(GM__logValue, unsafeWindow.TabNoc_GM, {
	defineAs : "logValue"
});

exportFunction(exec, unsafeWindow.TabNoc_GM, {
	defineAs : "exec"
});
exportFunction(execTime, unsafeWindow.TabNoc_GM, {
	defineAs : "execTime"
});
exportFunction(returnExec, unsafeWindow.TabNoc_GM, {
	defineAs : "returnExec"
});


function GM__getValue(name, func) {
// console.log("GM__getValue(\"" + name + "\", >" + func + "<)");
	if (func == null){ 
		alert("GM__getValue must be executed with a function!");
		return false;
	}
	else if (name == null || name == ""){ 
		alert("GM__getValue must be executed with a not null or empty string!");
		return false;
	}
	else {
		setTimeout(returnExec(function() {func(GM_getValue(name));}),0);
		return true;
	}
}

function GM__alertValue(name) {
	GM__getValue(name, returnExec(function(value){alert(value);}));
}

function GM__logValue(name) {
	GM__getValue(name, returnExec(function(value){console.log(value);}));
}

function GM__setValue(name, value) {
	try {
// console.log("GM__setValue(\"" + name + "\", >" + value + "<)");
		if(unsafeWindow.TabNoc.Settings.SavingEnabled == true || name == "SavingEnabled") {
			setTimeout(returnExec(function() {if (GM_getValue(name) != value){GM_setValue(name, value);}}),0);
		}
	} catch (exc) {
		alert(exc);
		console.error(exc);
	}
}

function GM__deleteValue(name) {
// console.log("GM__deleteValue(\"" + name + "\")");
    setTimeout(returnExec(function() {GM_deleteValue(name);}),0);
}

function execTime(func, arg1, arg2, arg3, arg4, arg5) {
	var start = new Date().getTime();
	
	var returnvar;
	
	if (typeof(func) === "string")
		returnvar = exec(arg1, arg2, arg3, arg4, arg5);
	else 
		returnvar = exec(func, arg1, arg2, arg3, arg4, arg5);
	
	var time = new Date().getTime() - start;
	
	if (typeof(func) === "string")
		console.log(func + ' time: ' + time);
	else 
		console.log('Execution time: ' + time);
	
	return returnvar;
}

function exec(func, arg1, arg2, arg3, arg4, arg5) {
	try {
		return func(arg1, arg2, arg3, arg4, arg5);
	}
	catch (exc) {
		console.error(exc);
	}
}

function returnExec(func, arg1, arg2, arg3, arg4, arg5) {
	return function(arg1, arg2, arg3, arg4, arg5){
		try {
			return func(arg1, arg2, arg3, arg4, arg5);
		}
		catch (exc) {
			console.error(exc);
		}
	};
}


function escapeRegExp(string) {
	return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}
function replaceAll(string, find, replace) {
	return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

