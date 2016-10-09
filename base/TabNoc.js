try {
	if (String.prototype.contains === undefined) {String.prototype.contains = String.prototype.includes;}
	if (String.prototype.replaceAll === undefined) {String.prototype.replaceAll = function(search, replacement) {var target = this; return target.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'g'), replacement);};}
	if (Date.prototype.timeNow === undefined) {Date.prototype.timeNow = function () {return ((this.getHours() < 10) ? "0" : "") + this.getHours() + ":" + ((this.getMinutes() < 10) ? "0" : "") + this.getMinutes() + ":" + ((this.getSeconds() < 10) ? "0" : "") + this.getSeconds();}}
	
	function getTabNoc(){
		var ScriptName = GM_info.script.name;
		
		if (unsafeWindow.TabNoc_ == null) {
			unsafeWindow.TabNoc_ = ({});
		}
		if (unsafeWindow.TabNoc_[ScriptName] == null) {
			unsafeWindow.TabNoc_[ScriptName] = {};
		}
		return unsafeWindow.TabNoc_[ScriptName];
	}
	
	function setTabNoc(obj){
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
		
		unsafeWindow.TabNoc_[ScriptName] = cloneInto(obj, unsafeWindow.TabNoc_, {
			wrapReflectors: true
		});
	}
	
	unsafeWindow.TabNoc_ = cloneInto(({}), unsafeWindow, {
		wrapReflectors: true
	});

	TabNoc = {
		ScriptName : GM_info.script.name,
		
		get Const(){
			return unsafeWindow.TabNoc_[TabNoc.ScriptName].Const;
		},
		set Const(obj){},
		
		get console(){
			return unsafeWindow.TabNoc_[TabNoc.ScriptName].console;
		},
		set console(obj){},
		
		get Variables(){
			return unsafeWindow.TabNoc_[TabNoc.ScriptName].Variables;
		},
		set Variables(obj){},
		
		get Settings(){
			return unsafeWindow.TabNoc_[TabNoc.ScriptName].Settings;
		},
		set Settings(obj){},
		
		get HTML(){
			return unsafeWindow.TabNoc_[TabNoc.ScriptName].Settings;
		},
		set HTML(obj){},
	}
	
	setTabNoc({
		Variables: {
		},

		Settings: {
		},

		HTML: {
		}
	});