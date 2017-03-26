function getTabNocVersion(){
	return "v1.1.2-26032017";
}


try {
	if (String.prototype.contains === undefined) {String.prototype.contains = String.prototype.includes;}
	if (String.prototype.replaceAll === undefined) {String.prototype.replaceAll = function(search, replacement) {var target = this; return target.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'g'), replacement);};}
	if (Date.prototype.timeNow === undefined) {Date.prototype.timeNow = function () {return ((this.getHours() < 10) ? "0" : "") + this.getHours() + ":" + ((this.getMinutes() < 10) ? "0" : "") + this.getMinutes() + ":" + ((this.getSeconds() < 10) ? "0" : "") + this.getSeconds();}}
	
	function getTabNoc(){
		var ScriptName = GM_info.script.name;
		
		if (unsafeWindow.TabNoc_ == null) {
			unsafeWindow.TabNoc_ = cloneInto(({}), unsafeWindow, {
				wrapReflectors: true
			});
		}
		if (unsafeWindow.TabNoc_[ScriptName] == null) {
			unsafeWindow.TabNoc_[ScriptName] = cloneInto(({}), unsafeWindow.TabNoc_, {
				wrapReflectors: true
			});
		}
		return unsafeWindow.TabNoc_[ScriptName];
	}
	
	function setTabNoc(obj){
		var ScriptName = GM_info.script.name;
		console.log("TabNoc.js.setTabNoc(): Adding " + ScriptName + " to TabNoc.js");
		
		if (unsafeWindow.TabNoc_ == null) {
			// console.log("Adding " + ScriptName + ": unsafeWindow.TabNoc_ is null");
			unsafeWindow.TabNoc_ = cloneInto(({}), unsafeWindow, {
				wrapReflectors: true
			});
		}
		if (unsafeWindow.TabNoc_[ScriptName] == null) {
			// console.log("Adding " + ScriptName + ": unsafeWindow.TabNoc_[ScriptName] is null");
			unsafeWindow.TabNoc_[ScriptName] = cloneInto(({}), unsafeWindow.TabNoc_, {
				wrapReflectors: true
			});
		}
		
		unsafeWindow.TabNoc_[ScriptName] = cloneInto(obj, unsafeWindow.TabNoc_, {
			wrapReflectors: true, cloneFunctions: true
		});
	}

	TabNoc = {
		get Const(){
			return unsafeWindow.TabNoc_[GM_info.script.name].Const;
		},
		set Const(obj){},
		
		get console(){
			return unsafeWindow.TabNoc_[GM_info.script.name].console;
		},
		set console(obj){},
		
		get Variables(){
			return unsafeWindow.TabNoc_[GM_info.script.name].Variables;
		},
		set Variables(obj){},
		
		get Settings(){
			return unsafeWindow.TabNoc_[GM_info.script.name].Settings;
		},
		set Settings(obj){},
		
		get HTML(){
			return unsafeWindow.TabNoc_[GM_info.script.name].HTML;
		},
		set HTML(obj){},
	}
	
	console.log("TabNoc.js: Readed TabNoc_Config " + getTabNocVersion() + " by TabNoc");
} catch (exc) {
	console.error(exc);
	alert(exc);
}
