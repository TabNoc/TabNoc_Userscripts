// ==UserScript==
// @name        GreaseMonkey-ExtensionFunctions
// @description GreaseMonkey Lib ©2017 TabNoc
// @version     v2.0.2_21052017
// @require     http://code.jquery.com/jquery-2.1.1.min.js
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @grant       GM_listValues
// ==/UserScript==
if (unsafeWindow.TabNoc_GM == undefined) {
	TabNoc_GM = {};

	unsafeWindow.TabNoc_GM = cloneInto(TabNoc_GM, unsafeWindow, {
		wrapReflectors : true
	});
	exportFunction(returnExec(function(arg1, arg2, arg3){return GM_getValue(arg1, arg2, arg3);}), unsafeWindow.TabNoc_GM, {
		defineAs : "getValue"
	});
	exportFunction(returnExec(function(arg1, arg2, arg3){return GM_setValue(arg1, arg2, arg3);}), unsafeWindow.TabNoc_GM, {
		defineAs : "setValue"
	});
	exportFunction(returnExec(function(arg1, arg2, arg3){return GM_deleteValue(arg1, arg2, arg3);}), unsafeWindow.TabNoc_GM, {
		defineAs : "deleteValue"
	});
	exportFunction(returnExec(function(arg1, arg2, arg3){return GM_listValues(arg1, arg2, arg3);}), unsafeWindow.TabNoc_GM, {
		defineAs : "listValues"
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
		alert(exc);
		console.error(exc);
	}
}

function returnExec(func, arg1, arg2, arg3, arg4, arg5) {
	return function(arg1, arg2, arg3, arg4, arg5){
		try {
			return func(arg1, arg2, arg3, arg4, arg5);
		}
		catch (exc) {
			alert(exc);
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


var LockID = Math.floor(Math.random() * 1000000);

function GM_Lock() {
	if (GM_getValue("Lock") === undefined) {
		GM_setValue("Lock", 0);
	}
	// prüfen ob alles io ist
	if (GM_getValue("Lock") === LockID) {
		console.log("Database already locked!");
		return;
	}
	else {
		// wait until Database is unlocked
		while (GM_getValue("Lock") !== 0) {}
		// set unique LockID
		GM_setValue("Lock", LockID);
	}
}

function GM_setValueLocked(name, value) {
	GM_Lock();
	
	// prüfen ob alles io ist
	if (GM_getValue("Lock") === LockID) {
		GM_setValue(name, value);
	}
	else {
		alert("Desync des Lock wertes, 1");
		GM_setValue("Lock", 0);
		throw "Desync des Lock wertes, 1";
	}
	
	// aufräumen
	if (GM_getValue("Lock") === LockID) {
		GM_setValue("Lock", 0);
	}
	else {
		alert("Desync des Lock wertes, 2");
		GM_setValue("Lock", 0);
		throw "Desync des Lock wertes, 2";
	}
}