function getTabNoc_GMVersion(){
	return {Version: "2.0.2", Date: "21.05.2017"};
}

try {
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

	function GM_Lock(ignoreLockedValue = false) {
		if (GM_getValue("Lock") == undefined) {
			GM_setValue("Lock", 0);
		}
		// prüfen ob alles io ist
		if (GM_getValue("Lock") === LockID) {
			// console.log(ignoreLockedValue);
			if (ignoreLockedValue === false) {
				console.log("Database already locked from this Session, continue");
				console.log(new Error().stack);
			}
			return;
		}
		else {
			// wait until Database is unlocked
			while (GM_getValue("Lock") !== 0) {}
			// set unique LockID
			// console.info("Locking Database");
			GM_setValue("Lock", LockID);
		}
	}

	function GM_Locked() {
		// when checking for boolean Value must compare with 2 '='
		// when checking for LockReason must compare with 3 '='
		if (GM_getValue("Lock") == undefined) {
			GM_setValue("Lock", 0);
		}
		// prüfen ob alles io ist
		if (GM_getValue("Lock") === 0) {
			// Database Unlocked
			return false;
		}
		else if (GM_getValue("Lock") === LockID) {
			// Database Locked from this Instance
			return 1;
		}
		else {
			// Database Locked from other Instance
			return true;
		}
	}

	function GM_setValueLocked(name, value) {
		// console.info("GM_setValueLocked");
		GM_Lock(true);
		
		// prüfen ob alles io ist
		if (GM_getValue("Lock") === LockID) {
			GM_setValue(name, value);
		}
		else {
			alert("Desync des Lock wertes, in GM_setValueLocked");
			GM_setValue("Lock", 0);
			throw "Desync des Lock wertes, in GM_setValueLocked";
		}
	}

	function GM_Unlock(forceUnlock = false){
		// aufräumen
		if (GM_getValue("Lock") === LockID || GM_getValue("Lock") === 0 || GM_getValue("Lock") == undefined || forceUnlock === true) {
			// console.info("Unlocking Database");
			GM_setValue("Lock", 0);
		}
		else {
			alert("Desync des Lock wertes, in GM_Unlock");
			GM_setValue("Lock", 0);
			throw "Desync des Lock wertes, in GM_Unlock";
		}
	}
	
	console.log("TabNoc.js: Readed TabNoc_GM " + getTabNoc_GMVersion().Version + " by TabNoc (namespace: " + GM_info.script.name + ")");
} catch (exc) {
	console.error(exc);
	alert(exc);
}
