// ==UserScript==
// @name        GreaseMonkey-ExtensionFunctions
// @description GreaseMonkey Lib ©2017 TabNoc
// @version     v2.0.0
// date			06.03.2017
// @require     http://code.jquery.com/jquery-2.1.1.min.js
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// ==/UserScript==

TabNoc_GM = {};

unsafeWindow.TabNoc_GM = cloneInto(TabNoc_GM, unsafeWindow, {
	wrapReflectors : true
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

exportFunction(exec, unsafeWindow.TabNoc_GM, {
	defineAs : "exec"
});
exportFunction(execTime, unsafeWindow.TabNoc_GM, {
	defineAs : "execTime"
});
exportFunction(returnExec, unsafeWindow.TabNoc_GM, {
	defineAs : "returnExec"
});

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

