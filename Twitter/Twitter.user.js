// ==UserScript==
// @name        Twitter
// @namespace   TabNoc
// @description Marking of already readed Tweets and some other nice features 		©2016 TabNoc
// @include     http*://twitter.com/*
// @version     1.13.0_14102016
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// @require     https://raw.githubusercontent.com/trentrichardson/jQuery-Impromptu/master/dist/jquery-impromptu.min.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/base/GM__.js
// @require		https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/Implement-TabNoc.js/base/TabNoc.js
// @require		https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/base/ImageHover.js
// @resource	Impromptu http://raw.githubusercontent.com/trentrichardson/jQuery-Impromptu/master/dist/jquery-impromptu.min.css
// @updateURL   https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/Twitter/Twitter.user.js
// @noframes
// @grant       GM_getResourceText
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @grant       GM_registerMenuCommand
// @grant       GM_addStyle
// @run-at      document-end
// ==/UserScript==

/*
ChangeList started at 24.09.2016

24.09.2016 - 1.12.3
[Global]
changed:	- Date.prototype.timeNow is now only added if not already existing
			- prototype existing check now uses non converting operator (===) and checks if it's "undefined" not "null"
added:		- String.prototype.replaceAll -> Firefox 49 removed possibility to add flags to String.prototype.replace("param1", "param2", "flags->deleted") cause non-standard implementation

[checkElement]
fixed:		- TabNoc.HTML.TweetsDropDownButtons.replace("{element}", ElementID, "g") is using depricated flags argument, changed to String.prototype.replaceAll("{element}", ElementID)

05.10.2016 - 1.12.4
[ImageHover]
bugfix:		- TwitterFlags or Emoticons are no longer displayed as file removed
[Global]
added:		- Version information on load

09.10.2016 - 1.12.5
[Global]
added:		- Possibility to Scan Ranges
added:		- Feedback after Scanning

11.10.2016 - 1.12.6
[Global]
bugfix: 	- some buttons not working correctly

11.10.2016 - 1.12.6.1 - 1.12.6.2
[Global]
bugfix:		- ActiveTime only displays hours till 24h

14.10.2016 - 1.13.0
[Global]
changed:	- Configuration will be created from multiScript object provider
*/


// STatistics.Name -> Merge over element.Tweet_from

try {
	setTabNoc({
		Variables: {
			startTime: new Date(),
			checkElementsInterval: null,
			Interval: null,
			MarkToggleState: true,
			lastCheckItemCount: 0,
			lastCheckScanBufferAmount: 0,
			Active: true,
			HiddenButtons: false,
			OldTwitterSaveData: "",
			
			WatchedTime: 0,
			LoadedWatchedTime: 0,
			SavedWatchedTime: 0,
			TimeSaveCycle: 0,
			
			ScanRangeElement: null
		},

		Settings: {
			SavingEnabled: true,
			MarkAfterScan: true,

			Personal: {
				ScanUninterestingTweet: false,
				HideUninterestingTweets: false,
				UninterestingTweetsText: [],
				TimerInterval: 5000
			}
		},

		HTML: {
			Scannen:
			'<li id = "btn_Scannen" style = "padding: 2px; display: inline-block; position: absolute; background-color: rgb(255, 255, 255);">' +
			'	<div class="not-following">' +
			'		<button class="follow-button btn" type="button" onclick="getAllElements();return true;">' +
			//			'			style = "padding:4px 12px 9px; border: 1px solid #E1E8ED; border-radius:4px;font-weight:bold; line-height: normal;cursor:pointer; font:inherit"' +
			'			<span id = "btn_Scannen_Text" style = "display:block; color:#292F33; font-weight:bold; line-height: normal; cursor:pointer; font:inherit; min-width:73px">' +
			'				Scannen' +
			'			</span>' +
			'		</button>' +
			'	</div>' +
			'</li>',

			Markieren:
			'<li id = "btn_Markieren" style = "margin-top:36px;padding: 2px; display: inline-block; position: absolute; background-color: rgb(255, 255, 255);">' +
			'	<div class="not-following">' +
			'		<button class="follow-button btn" type="button" onclick="startCheckElements(!TabNoc.Variables.MarkToggleState);return true;">' +
			'			<span id = "btn_Markieren_Text" style = "display:block; color:#292F33; font-weight:bold; line-height: normal; cursor:pointer; font:inherit; min-width:73px">' +
			'				Markieren' +
			'			</span>' +
			'		</button>' +
			'	</div>' +
			'</li>',

			StyleMarked: "background-color:rgb(151, 255, 139);background-image:linear-gradient(rgb(255, 255, 255), transparent)",
			StyleMustScanning: "background-color:rgb(255, 138, 138);background-image:linear-gradient(rgb(255, 255, 255), transparent)",
			TweetsDropDownButtons: '<br/><button class="dropdown-link js-dropdown-toggle" onclick="getAllElements({element});return true;">Bis hier Markieren [/\\]</button><button class="dropdown-link js-dropdown-toggle" onclick="getAllElements(null, {element});return true;">Ab hier Markieren [\\/]</button><button class="dropdown-link js-dropdown-toggle" onclick="scanRange({element});return true;">Markierbereich</button>'
		}
	});
	
	function registerTabNoc() {
		TabNoc = cloneInto(TabNoc, unsafeWindow, {
			wrapReflectors: true, cloneFunctions: true
		});


		// Scannen
		exportFunction(getAllElements, unsafeWindow, {
			defineAs: "getAllElements"
		});
		// Markieren
		exportFunction(startCheckElements, unsafeWindow, {
			defineAs: "startCheckElements"
		});
		// Bereich Scannen
		exportFunction(scanRange, unsafeWindow, {
			defineAs: "scanRange"
		});

		GM_registerMenuCommand("Automatik Aus-/Einschalten", function () {
			if (TabNoc.Variables.Active == true) {
				startCheckElements(false);
				setTimeout(function () { TabNoc.Variables.Active = false; alert("Die Automatische Tweet-Überprüfung wurde deaktiviert!"); }, 250);
			}
			else {
				TabNoc.Variables.Active = true;
				startCheckElements(true);
				alert("Die Automatische Tweet-Überprüfung wurde aktiviert!");
			}
		});

		GM_registerMenuCommand("Statistiken", function () {
			GM__getValue("Tweets", function (obj) {
				var returnval = "";
				var tweets = eval(obj);
				test = tweets;
				for (var i = 0; i < tweets.Values.length; i++) {
					var ReTweets = 0;
					for (var j = 0; j < tweets[tweets.Values[i]].length; j++) {
						if (tweets[tweets.Values[i]][j].Tweet_from != null) {
							ReTweets += 1;
						}
					}
					//TODO: maybe add SettingValue to define how mutch tweets someone must have
					if (tweets[tweets.Values[i]].length > 20) {
						returnval += tweets.Values[i] + " has " + tweets[tweets.Values[i]].length + " Tweets with " + ReTweets + " ReTweets.\r\n";
					}
				}
				alert(returnval);
			});
		});

		GM_registerMenuCommand("[DEV] TabNoc.Settings.Personal", function () {
			GM__getValue("TabNoc.Settings.Personal", function (obj) {
				try {
					if (obj == "" || obj == null) {
						obj = eval("({ScanUninterestingTweet:false,HideUninterestingTweets:false,UninterestingTweetsText:[],TimerInterval: 5000})").toSource();
					}
					var newPersonalSettings = prompt("TabNoc.Settings.Personal", obj);
					
					if (newPersonalSettings != null) {
						TabNoc.Settings.Personal = cloneInto(eval(newPersonalSettings), TabNoc.Settings, {
							wrapReflectors: true
						});

						GM__setValue("TabNoc.Settings.Personal", TabNoc.Settings.Personal.toSource());
						startCheckElements(TabNoc.Variables.MarkToggleState, true);
					}
				} catch (exc) {
					console.error(exc);
					alert(exc);
				}
			});
		});

		GM_registerMenuCommand("Rückgängig", Undo);
/*
		GM_registerMenuCommand("[DEV]", function () {
			try {
				var statesdemo = {
					state0: {
						title: 'Name',
						html:'<label>First <input type="text" name="fname" value=""></label><br />'+
							'<label>Last <input type="text" name="lname" value=""></label><br />',
						buttons: { Next: 1 },
						// focus: "input[name='fname']",
						submit:function(e,v,m,f){ 
							console.log(f);

							e.preventDefault();
							$.prompt.goToState('state1');
						}
					},
					state1: {
						title: 'Gender',
						html:'<label><input type="radio" name="gender" value="Male"> Male</label><br />'+
							'<label><input type="radio" name="gender" value="Female"> Female</label>',
						buttons: { Back: -1, Next: 1 },
						// focus: ":input:first",
						submit:function(e,v,m,f){ 
							console.log(f);

							if(v==1) $.prompt.goToState('state2')
							if(v==-1) $.prompt.goToState('state0');
							e.preventDefault();
						}
					},
					state2: {
						title: 'Transportation',
						html:'<label>Travels By <select name="travel" multiple>'+
								'<option value="Car" selected>Car</option>'+
								'<option value="Bus">Bus</option>'+
								'<option value="Plane" selected>Plane</option>'+
								'<option value="Train">Train</option>'+
							'</select></label>',
						buttons: { Back: -1, Done: 1 },
						focus: 1,
						submit:function(e,v,m,f){ 
							console.log(f);

							e.preventDefault();
							if(v==1) $.prompt.close();
							if(v==-1) $.prompt.goToState('state1');
						}
					},
				};

				$.prompt(statesdemo);
			} catch (exc) {
				console.error(exc);
				alert(exc);
			}
		});
*/
		GM_addStyle(".display-none{display:none}");
		GM_addStyle(GM_getResourceText("Impromptu"));
		

		// ### check Personal Settings ###
		var oldPersonal = GM_getValue("TabNoc.Settings.Personal")
		if (oldPersonal == "" || oldPersonal == null) {
			oldPersonal = eval("({})").toSource();
		}
		var Personal = eval(oldPersonal);
		
		if (Personal.ScanUninterestingTweet == null || typeof(Personal.ScanUninterestingTweet) != "boolean") Personal.ScanUninterestingTweet = false;
		if (Personal.HideUninterestingTweets == null || typeof(Personal.HideUninterestingTweets) != "boolean") Personal.HideUninterestingTweets = false;
		if (Personal.UninterestingTweetsText == null || typeof(Personal.UninterestingTweetsText) != "object") Personal.UninterestingTweetsText = ([]);
		if (Personal.TimerInterval == null || typeof(Personal.TimerInterval) != "number") Personal.TimerInterval = 5000;
		if (Personal.ImageHover == null || typeof(Personal.ImageHover) != "boolean") Personal.ImageHover = true;
		
		// load Personal Settings
		TabNoc.Settings.Personal = cloneInto(Personal, TabNoc.Settings, {
			wrapReflectors: true
		});
		
		if (oldPersonal != Personal.toSource()) {
			GM_setValue("TabNoc.Settings.Personal", Personal.toSource());
			alert("Updated Personal Settings from:\r\n" + oldPersonal + "\r\nto:\r\n" + Personal.toSource());
		}
		
		if (TabNoc.Settings.Personal.ImageHover === true) {
			AddImageHover({
				getElementSrc : function (eventElement, addLargeToSrc) {
					return (eventElement.className.includes("avatar ") ? (eventElement.getAttribute("src").replace("_normal", "_400x400").replace("_bigger", "_400x400")) : (eventElement.getAttribute("src").replace(":thumb", "") + (addLargeToSrc === true ? ":large" : "")))
				},
				getParentNode : function (eventElement) {
					return eventElement.parentNode.className == " is-preview" ? eventElement.parentNode.parentNode : eventElement.parentNode;
				},
				ShiftKeyShowsImageFullSize : true,
				CapsLockKeepsImageFullSize : true,
				ClickOnFullSizeImageToClose : true,
				PressStrgOrEscToCloseFullSizeImage : true,
				WaitTimeAfterClickFullSizeImage : 100,
				StartShiftState : false,
				HoverEventElements : [{
						condition : true,
						element : $("#stream-items-id")[0],
						getUserArgs : function (target) {
							return !(target.className.includes("avatar ") || target.className.includes("twitter-hashflag"));
						}
					}, {
						condition : ($(".PhotoRail-mediaBox").length > 0),
						element : $(".PhotoRail-mediaBox")[0],
						getUserArgs : function (target) {
							return target.parentNode.className.includes("has-native-media");
						}
					}
				]
			});
		}
	}
	
	function Undo() {
		try {
			if (TabNoc.Variables.OldTwitterSaveData == "") {
				alert("Es befindet sich keine Sicherung im Speicher.\r\nRückgängig machen nicht möglich!");
				return;
			}
			
			if (confirm("Der Alte Speicherstand beinhaltet " + eval(TabNoc.Variables.OldTwitterSaveData).length + " Elemente (Aktuell " + eval(GM_getValue("Twitter")).length + ")")) {
				var oldState = TabNoc.Variables.MarkToggleState;
				startCheckElements(false);
				GM_setValue("Twitter", TabNoc.Variables.OldTwitterSaveData);
				startCheckElements(oldState);
				TabNoc.Variables.OldTwitterSaveData = "";
			}
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	
	function startCheckElements(ToggleState, force) {
		try {
			ManageActiveTime();
			if (document.hidden === false && TabNoc.Variables.Active === true && document.hasFocus()) {
				var start = new Date().getTime();

				var elementIdArray = eval(GM_getValue("Twitter"));
				var PermaLinkTweet = $(".permalink-container").length == 1;
				var elements = $(".js-stream-tweet");

				// Überprüfung ob es sich nur um einen Tweet oder ähnliches handelt
				if (PermaLinkTweet && TabNoc.Variables.HiddenButtons == false) {
					$("#floatingButtons")[0].setAttribute("class", "display-none");
					TabNoc.Variables.HiddenButtons = true;
				}
				else if (!PermaLinkTweet && TabNoc.Variables.HiddenButtons == true) {
					$("#floatingButtons")[0].setAttribute("class", "");
					TabNoc.Variables.HiddenButtons = false;
				}
				
				var MinTopValue = $(".ProfileCanopy-inner").length == 1 ? 127 : $(".global-nav-inner")[0].getClientRects()[0].bottom;
				var MaxTopValue = document.documentElement.clientHeight;
				if (TabNoc.Settings.Personal.HideUninterestingTweets == true) {
					var currentTopValue = document.getElementsByClassName("stream-footer")[0].getClientRects()[0].top;
					if (currentTopValue < MaxTopValue && currentTopValue > MinTopValue) {
						document.getElementsByClassName("try-again-after-whale")[0].click()
					}
				}
				if (TabNoc.Variables.HiddenButtons == false && (
					TabNoc.Variables.MarkToggleState != ToggleState ||
					TabNoc.Variables.lastCheckItemCount !== elements.length ||
					TabNoc.Variables.lastCheckScanBufferAmount !== elementIdArray.length ||
					force === true)) {
					var UnScannedElements = checkElements(elementIdArray.reverse(), ToggleState, elements);
					TabNoc.Variables.lastCheckScanBufferAmount = elementIdArray.length;
					TabNoc.Variables.lastCheckItemCount = elements.length;
					
					var time = new Date().getTime() - start;

					console.log((elements.length - UnScannedElements) + " Marked Elements | "
					+ UnScannedElements + " UnMarked Elements | "
					+ elements.length + " Elements Total (" + elementIdArray.length + " Tweets listed) | "
					+ 'Execution time: ' + time);
				}
			}
		}
		catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	
	function checkElements(elementIdArray, ToggleState, elements) {
		var UnScannedElements = 0;

		if (ToggleState == null) {
			ToggleState = TabNoc.Variables.MarkToggleState;
		}

		for (i = 0; i < elements.length; i++) {
			var element = elements[i];

			if (element.className == "undefined") continue;

			if ((element.className.includes("js-original-tweet") && element.className.includes("js-stream-tweet") && 
				element.className.includes("js-actionable-tweet") && element.className.includes("js-profile-popup-actionable")) || 
				element.className.includes("conversation")) {
				//check if Adware
				if (element.className.includes("expanded-conversation") ?
					element.children[0].children[0].className.includes("promoted-tweet") :
					element.className.includes("promoted-tweet")) continue;

				UnScannedElements = checkElement(element, elementIdArray, ToggleState) === true ? UnScannedElements : UnScannedElements + 1;
			} else {
				console.warn(element);
				TabNoc.console.add(element, true);
			}
		}

		TabNoc.Variables.MarkToggleState = ToggleState;
		$("#btn_Markieren")[0].children[0].children[0].setAttribute("style", ToggleState ? TabNoc.HTML.StyleMarked : "");
		$("#btn_Scannen")[0].children[0].children[0].setAttribute("style", UnScannedElements != 0 ? TabNoc.HTML.StyleMustScanning : "");

		$("#btn_Scannen_Text")[0].textContent = "Scannen" + (UnScannedElements > 0 ? ":" + UnScannedElements : "");

		return UnScannedElements;
	}
	
	function checkElement(checkElement, elementIdArray, ToggleState) {
		//return true if checkedElement is already Scanned

		var ElementID = checkElement.getAttribute("data-item-id");
		
		// this consumes huge amounts of time  |  first time call: (100 elements ~ 35 ms)  |  later call: (100 elements ~ 0 ms)
		if (checkElement.getAttribute("TabNoc_DropDownButtons") != "true") {
			$(checkElement).find(".dropdown-menu")[0].children[1].innerHTML += TabNoc.HTML.TweetsDropDownButtons.replaceAll("{element}", ElementID);
			checkElement.setAttribute("TabNoc_DropDownButtons", "true");
			{
				var baseFixElement = $(checkElement).find(".dropdown-menu")[0].children[1].children;
				var fixElements = [baseFixElement[baseFixElement.length - 3], baseFixElement[baseFixElement.length - 2], baseFixElement[baseFixElement.length - 1]];
				for (ii = 0; ii < fixElements.length; ii++) {
					// Quickfix buttons
					var FixElement = fixElements[ii];
					FixElement.onclick = eval("(function() {" + FixElement.getAttribute("onclick") + "})");
					FixElement.setAttribute("onclick", "");
				}
			}
		}
		
		if (elementIdArray.indexOf(ElementID) != -1) {
			if (ToggleState === true) {
				checkElement.setAttribute("style", "background-color:rgb(151, 255, 139)");
			}
			else {
				checkElement.setAttribute("style", "");
			}
			return true;
		}

		markUninterestingTweets(checkElement);
		return false;
	}
	
	function markUninterestingTweets(checkElement) {
		if (TabNoc.Settings.Personal.ScanUninterestingTweet == true) {
			var data = $(checkElement).find(".TweetTextSize");
			
			if (data.length == 0) 
				return;
			
			var TextContent = data[0].textContent;

			for (var i = 0; i < TabNoc.Settings.Personal.UninterestingTweetsText.length; i++) {
				if (TextContent.includes(TabNoc.Settings.Personal.UninterestingTweetsText[i])) {
					if (TabNoc.Settings.Personal.HideUninterestingTweets == true) {
						checkElement.setAttribute("style", "display:none");
					} else {
						checkElement.setAttribute("style", "background-color:rgb(255, 138, 138)");
					}
				}
			}
		}
	}
	
	var Feedback = {
		messageTimeout : null,
		showMessage : (function (message, type, time, onClickFunction) {
			Feedback.hideMessage();
			var element = document.createElement("div");
			element.id = "feedback";
			element.title = "Dismiss";
			var style = "";
			if (type == "notify") {
				style = "background-color: #00A550;";
			} else if (type == "error") {
				style = "background-color: #C41E3A;";
			}
			element.setAttribute("style", "position: fixed; top: 10px; text-align: center; width: 100%; z-index: 9999;");
			element.innerHTML = '<span style="' + style + ' border-radius: 5px; cursor: pointer; color: #fff; padding: 3px 6px; font-size: 16px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.2); text-shadow: 0 1px rgba(0, 0, 0, 0.2);">' + message.replaceAll("\r\n", "<br>") + "</span>";
			element.addEventListener("click", onClickFunction || Feedback.hideMessage, !1);
			document.body.appendChild(element);
			time && (Feedback.messageTimeout = setTimeout(Feedback.hideMessage, time));
		}),
		hideMessage : (function () {
			var element = document.getElementById("feedback");
			element && (Feedback.messageTimeout && (clearTimeout(Feedback.messageTimeout), Feedback.messageTimeout = null), element.removeEventListener("click", Feedback.hideMessage, !1), document.body.removeChild(element))
		}),
		error : (function (message, time, onClickFunction) {
			Feedback.showMessage(message || "Something went wrong", "error", (time == null ? 8000 : time), onClickFunction)
		}),
		notify : (function (message, time, onClickFunction) {
			Feedback.showMessage(message, "notify", (time == null ? 5000 : time), onClickFunction)
		})
	};
	
	function scanRange(element){
		try {
			if (TabNoc.Variables.ScanRangeElement === null) {
				// show Messsage (maybe with ImageHover.Feedback)
				TabNoc.Variables.ScanRangeElement = element;
			}
			else {
				if (confirm("Elemente Markieren?") === true) {
					if (element > getAllElements(TabNoc.Variables.ScanRangeElement)) {
						getAllElements(TabNoc.Variables.ScanRangeElement, element);
					}
					else {
						getAllElements(element, TabNoc.Variables.ScanRangeElement);
					}
					TabNoc.Variables.ScanRangeElement = null;
				}
			}
		}
		catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	
	function getAllElements(from, till) {
		try {
			var start = new Date().getTime();
			var amount = 0;

			var ElementIds = GM_getValue("Twitter");
			if (ElementIds == null || ElementIds == "") {
				ElementIds = "([])";
				GM_setValue("Twitter", "([])");
			}
			TabNoc.Variables.OldTwitterSaveData = ElementIds;
			ElementIds = eval(ElementIds);

			var Tweets = GM_getValue("Tweets");
			if (Tweets == null || Tweets == "") {
				Tweets = "({Values:[]})";
				GM_setValue("Tweets", "({Values:[]})");
			}
			Tweets = eval(Tweets);

			var elements = $(".js-stream-tweet");

			var fromIndex = (from == null) ? 0 : elements.toArray().findIndex(function (element) { return element.getAttribute("data-item-id") == from; });
			if (fromIndex == -1) throw "from(" + from + ") were not found";

			var tillIndex = (till == null) ? elements.length : (elements.toArray().findIndex(function (element) { return element.getAttribute("data-item-id") == till; }) + 1);
			if (tillIndex == -1) throw "till(" + till + ") were not found";
			tillIndex > elements.length ? elements.length : tillIndex;

			for (i = fromIndex; i < tillIndex; i++) {
				var element = elements[i];
				if ((element.className.includes("js-original-tweet") && element.className.includes("js-stream-tweet") && 
					element.className.includes("js-actionable-tweet") && element.className.includes("js-profile-popup-actionable")) || 
					element.className.includes("conversation")) {
					var currentElementId = element.getAttribute("data-item-id");

					//Adware
					if (element.children[0].className.includes("expanded-conversation") ?
					element.children[0].children[0].children[0].className.includes("promoted-tweet") :
					element.children[0].className.includes("promoted-tweet")) { continue; }

					if (ElementIds.indexOf(currentElementId) == -1) {
						ElementIds.push(currentElementId);
						amount++;
					}
					exec(AddTweetStatistics, element, Tweets);
				} else {
					console.warn(element);
					TabNoc.console.add(element, true);
				}
			}

			GM_setValue("Twitter", ElementIds.toSource());
			GM_setValue("Tweets", Tweets.toSource());
			if (TabNoc.Settings.MarkAfterScan) {
				startCheckElements(true, true);
			}
			
			Feedback.notify("Es wurde" + (amount === 1 ? "" : "n") + " " + amount + " Element" + (amount === 1 ? "" : "e") + " eingelesen.      >Rückgängig<", 10000, (function(){Undo();Feedback.hideMessage();}));

			var time = new Date().getTime() - start;
			console.log('getAllElements() Execution time: ' + time);
		}
		catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	
	function AddTweetStatistics(element, Tweets) {
		element = element.children[0];
		var TweetID = element.getAttribute("data-tweet-id");
		var BaseTweeter = element.getAttribute("data-retweeter");
		var TweeterName = element.getAttribute("data-screen-name");

		if (TweetID == null || TweeterName == null) { return; }

		var Tweeter = Tweets[BaseTweeter == null ? TweeterName : BaseTweeter];
		if (Tweeter == null) {
			Tweeter = new Array();
			Tweets[BaseTweeter == null ? TweeterName : BaseTweeter] = Tweeter;
			Tweets.Values.push(BaseTweeter == null ? TweeterName : BaseTweeter);
		}
		if (Tweeter.findIndex(function (tweet_id) { return tweet_id == TweetID; }) == -1) {
			var TweetObj = {}
			TweetObj["id"] = TweetID;
			if (BaseTweeter != null) {
				TweetObj["Tweet_from"] = TweeterName;
				// eingebetteten tweet evtl auch noch
			}
			Tweeter.push(TweetObj);
		}
	}
	
	function setUpperTweetsThrottled(wait) {
		
		var MinTopValue = $(".ProfileCanopy-inner").length == 1 ? 127 : $(".global-nav-inner")[0].getClientRects()[0].bottom;
		var MaxTopValue = document.documentElement.clientHeight;
		
		var func = function () {
			try {
				var elements = $(".js-stream-item");
				var elementsLength = elements.length;
				
				var AdwareCounter = 0;

				for (var i = 0; i < elementsLength; i++) {
					var element = elements[i];
					
					if (element.className.includes("has-profile-promoted-tweet") || element.getClientRects().length == 0) {
						AdwareCounter++;
						continue;
					}
					var currentTopValue = element.getClientRects()[0].top;
					if (currentTopValue < MaxTopValue && currentTopValue > MinTopValue) {
						i -= AdwareCounter;
						$("#upperTweets")[0].textContent = i > 1 ? i - 1 : "";
						return;
					}
				}
			}
			catch (exc) {
				console.error(exc);
				alert(exc);
			}
		}

		var context, args;
		var previous = 0;
		return function () {
			var now = Date.now();
			if (!previous) previous = now;
			var remaining = wait - (now - previous);
			context = this;
			args = arguments;
			if (remaining <= 0 || remaining > wait) {
				previous = now;
				func.apply(context, args);
				context = args = null;
			}
		};
	};
	
	function ManageActiveTime(){
		if (document.hidden == false && document.hasFocus()) {
			if (TabNoc.Variables.WatchedTime == 0) {
				TabNoc.Variables.WatchedTime = GM_getValue("Time");
				
				if (TabNoc.Variables.WatchedTime == null) {
					TabNoc.Variables.WatchedTime = 0;
				}
				
				TabNoc.Variables.LoadedWatchedTime = TabNoc.Variables.WatchedTime;
				TabNoc.Variables.SavedWatchedTime = TabNoc.Variables.LoadedWatchedTime;
			}
			TabNoc.Variables.WatchedTime += (TabNoc.Settings.Personal.TimerInterval / 1000) / 1000;
			TabNoc.Variables.TimeSaveCycle++;
			
			var ConvertToTime = function (amount) {
				amount = Math.round(amount * 1000);
				var seconds = amount % 60;
				var minutes = ((amount - seconds) % (60 * 60)) / 60;
				var hours = (amount - seconds - (minutes * 60)) / (60 * 60); // ((amount - seconds - (minutes * 60)) % (60 * 60 * 24)) / (60 * 60); this old code displays hours of day
				return (hours > 0 ? hours + "h " : "") + ((minutes > 0 || hours > 0) ? minutes + "min " : "") + ((seconds > 0 || minutes > 0 || hours > 0) ? seconds + "sek" : "");
			};
			
			$("#TwitterTime")[0].textContent = ConvertToTime(TabNoc.Variables.WatchedTime) + "\r\n" + ConvertToTime(TabNoc.Variables.WatchedTime - TabNoc.Variables.LoadedWatchedTime);
			
			// Nach 25 durchläufen des Intervalls z.B. 2500ms interval == 62,5 sekunden
			if (TabNoc.Variables.TimeSaveCycle % 10 == 0) {
				// check ob in der zwischenzeit ein neuer wert gepeichert wurde, wenn ja diesen laden und dann abspeichern
				var currentValue = GM_getValue("Time");
				if (currentValue > TabNoc.Variables.SavedWatchedTime && currentValue != null) {
					TabNoc.Variables.WatchedTime = (TabNoc.Variables.WatchedTime - TabNoc.Variables.SavedWatchedTime) + currentValue;
					// differenz erhöhen, damit die lokale zeit gleich bleibt
					TabNoc.Variables.LoadedWatchedTime += currentValue - TabNoc.Variables.SavedWatchedTime;
				}
				TabNoc.Variables.SavedWatchedTime = TabNoc.Variables.WatchedTime;
				GM_setValue("Time", TabNoc.Variables.WatchedTime);
			}
		}
	}
	
	function Main() {
		console.info("Twitter.user.js[v" + GM_info.script.version + ", Autoupdate: " + GM_info.scriptWillUpdate + "] loading");
		
		registerTabNoc();

		// TabNoc.console.register();

		//###floatingButtons###
		var floatingButtons = document.createElement("div");
		floatingButtons.setAttribute("style", "position:fixed;left:01%;bottom:3cm;z-index:10");
		floatingButtons.setAttribute("id", "floatingButtons");

		document.body.appendChild(floatingButtons);

		//###btn_Scannen###
		var btn_Scannen = document.createElement("li");
		$("#floatingButtons").append(btn_Scannen);
		btn_Scannen.outerHTML = TabNoc.HTML.Scannen;

		//###btn_Markieren###
		var btn_Markieren = document.createElement("li");
		$("#floatingButtons").append(btn_Markieren);
		btn_Markieren.outerHTML = TabNoc.HTML.Markieren;

		// //###upperTweets###

		var upperTweets = document.createElement("div");
		upperTweets.setAttribute("style", "position: fixed; right: 1%; top: " + ($(".ProfileCanopy-inner").length == 1 ? 13 : 6) + "%;" +
								 "border: 1px solid rgb(225, 232, 237); border-radius: 4px; font-weight: bold; line-height: normal; background-color: rgb(255, 255, 255); padding: 5px 10px; white-space: pre-line");
		upperTweets.setAttribute("id", "upperTweets");

		unsafeWindow.document.body.appendChild(upperTweets);

		exportFunction(setUpperTweetsThrottled(100), unsafeWindow.document.body, {
			defineAs: "onscroll"
		});

		unsafeWindow.document.onscroll = unsafeWindow.document.body.onscroll;
		unsafeWindow.document.onscroll();

		//###TwitterTime###

		var TwitterTime = document.createElement("div");
		TwitterTime.setAttribute("style", "position: fixed; right: 1%; top: " + (($(".ProfileCanopy-inner").length == 1 ? 13 : 6) + 17) + "%;" +
								 "border: 1px solid rgb(225, 232, 237); border-radius: 4px; font-weight: bold; line-height: normal; background-color: rgb(255, 255, 255); padding: 5px 10px; white-space: pre-line");
		TwitterTime.setAttribute("id", "TwitterTime");

		unsafeWindow.document.body.appendChild(TwitterTime);

		//##startCheckElements##
		TabNoc.Variables.checkElementsInterval = setInterval(returnExec(function () {
			startCheckElements(TabNoc.Variables.MarkToggleState);
		}), TabNoc.Settings.Personal.TimerInterval);
		startCheckElements(TabNoc.Variables.MarkToggleState);

		console.log("Twitter.user.js done");
		{
			// Quickfix btn_Scannen
			var element = $("#btn_Scannen").children()[0].children[0];
			element.onclick = eval("(function() {" + element.getAttribute("onclick").replace(/TabNoc/g, "TabNoc") + "})");
			element.setAttribute("onclick", "");
		}
		{
			// Quickfix btn_Markieren
			var element = $("#btn_Markieren").children()[0].children[0];
			element.onclick = eval("(function() {" + element.getAttribute("onclick").replace(/TabNoc/g, "TabNoc") + "})");
			element.setAttribute("onclick", "");
		}
	}
	
	if ($(".TwitterCardsGrid").length == 0) {
		$(returnExec(Main));
		console.log("Twitter.user.js readed");
	}
} catch (exc) {
	console.error(exc);
	alert(exc);
}

