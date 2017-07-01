// ==UserScript==
// @name        Youtube-Jumper
// @description ©Marco Neuthor 2017
// @include     http*://www.youtube.*/watch?*
// @version     v2.2.1_18042017
// @require		https://code.jquery.com/jquery-2.1.1.min.js
// @require		https://raw.githubusercontent.com/trentrichardson/jQuery-Impromptu/master/dist/jquery-impromptu.min.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/base/GM__.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/base/TabNoc.js
// @require		https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/base/VideoGreyDetector.js
// require		SomeOtherStuff.js
// add @ to switch to local solutions
// require		GM__.js
// @resource	Impromptu https://raw.githubusercontent.com/trentrichardson/jQuery-Impromptu/master/dist/jquery-impromptu.min.css
// @resource	TabNocCSS https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/Youtube/TabNoc.css
// @resource	YoutubeJumperCSS https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/Youtube/YoutubeJumper.css
// @updateURL   https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/Youtube/Youtube-Jumper.user.js
// @grant       GM_getResourceText
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @run-at      document-end
// @noframes
// ==/UserScript==

//TODO: add playbackspeed slider right to the volume slider

/*
ChangeList started at 12.02.2017

12.02.2017 - v2.1.3.2
[ManageTimes]
	- changed: WBS Fernsehauftritt wird nun besser erkannt

24.02.2017 - v2.1.4
[Global]
	- changed: Imports werden nun vom Master verwendet

05.03.2017 - v2.1.5
[Global]
	- added: UpdateURL
[VideoGreyDetector]
	- changed: verwendet nun das komplette Video

06.03.2017 - v2.2.0
[Global]
	- implemented TabNoc.js
	- huge amount of cleanup, removed all Saving features
[VideoGreyDetector]
	- changed: liest nun echte Grauwerte aus
	
18.04.2017 - v2.2.1
[VideoGreyDetector]
	- added MaxVideoCheckTime, Timeout for VideoGreyDetector
[!!KnownBug!!]
	- "#TabNoc_YT_Jump" is getting overwritten instead of appended -> bugs with VideoGreyDetector
	
09.05.2017 - v2.2.2
[VideoGreyDetector]
	- now checks the complete Image
	- fixed Label bug
[RemainingTimeMagager]
	- rewritten all styling parts an building of string
*/

try {
	if (String.prototype.contains == null) {String.prototype.contains = String.prototype.includes;}
	var movie_player = unsafeWindow.document.getElementById("movie_player");

	setTabNoc({
		Const : {
			LabelContainerID : "masthead-search", //old: "yt-masthead"
			remainTimeID : "TabNoc_YT_Jump",
			LocationStartBtnLoggedIn : "yt-masthead-user",
			LocationStartBtnLoggedOut : "yt-masthead-signin", //old "masthead-search"
			LocationBtnSavingEnabled : "yt-masthead-logo-container",

			HideFieldZIndexID : ["movie_player"],
			HideFieldDisplayNoneID : ["watch7-container", "masthead-search-terms", "movie_player"]
		},
		
		Settings : {
			ModifyTitleToVideoState : true,
			AddMarginWhenRemainTime : true,
			PauseOnSpacePress : true,
			TogglePauseOnStrgPress : true,
			AskToJumpIfOverSkipPoint : true,
			AskToClosePageIfVideoDone : true,
			MarkRemainTimeOnLowBuffer : true,
			LowBufferSecondAmount : 10,
			ImgToDisableRestart : true,
			ImgToSwitchCloseTab : true,
			
			//Hide
			AddButtonToHideAll : true,
			ShowHideAllButtonOnLaunch : true,
			PauseVideoWhenHide : true,
			HideTitleWhenPaused : true,
			HideOnEscPress : true,
			DisableEscOnDialog : true,

			//Video Quality
			ChangeVideoQualityOnLoad : true,
			DisableVideoQualityUpgradeWhenDoubledSpeed : false,
			PreferedVideoQuality : "hd1080", //"hd1080", "hd720", "large", "medium", "small", "tiny" ...
			SecondPreferedVideoQuality : "hd720", //"hd1080", "hd720", "large", "medium", "small", "tiny" ...

			ChangeVideoSizeToLarge : true,

			ChangeVideoPosOnKeyPress : true,
			ChangeVideoPosValue : 5,
			DeleteSiteContentOnKeyPress : true,
		},

		Variables : {
			SkipTime : -1,
			EndTime : 0,
			Div_RemainTime : null,
			RefreshTimer : null,
			Hidden : false,
			SkipOver : [],
			RemainingTimeString : "",
			LastCheckBufferSize : 0,
			OldTitleName : document.title,
			HasPausedOnLowBuffer : false,
			LastCheckLowBuffer : false,
			ExpectedPlayerStateAfterSpace : 0
		},

		HTML : {
			Switch : '<div class="onoffswitch" style="margin-top:10px"><input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="TabNoc_VisibleSwitch" checked><label class="onoffswitch-label" for="TabNoc_VisibleSwitch"><div class="onoffswitch-inner"></div><div class="onoffswitch-switch"></div></label></div>'
		},
		// var imgSrcTrue = "https://cdn4.iconfinder.com/data/icons/icocentre-free-icons/137/f-check_256-20.png";
		// var imgSrcFalse = "https://cdn4.iconfinder.com/data/icons/icocentre-free-icons/114/f-cross_256-20.png";
	});

	function registerTabNoc() {
		TabNoc = cloneInto(TabNoc, unsafeWindow, {
				wrapReflectors : true
			});
		exportFunction(start, unsafeWindow, {
			defineAs : "start"
		});
		exportFunction(ytVisible, unsafeWindow, {
			defineAs : "ytVisible"
		});
		exportFunction(TN_onBeforeUnload, unsafeWindow, {
			defineAs : "TN_onBeforeUnload"
		});
		
		GM_addStyle(GM_getResourceText("Impromptu"));
		GM_addStyle(GM_getResourceText("TabNocCSS"));
		GM_addStyle(GM_getResourceText("YoutubeJumperCSS"));
	}

	function InitializeUI() {
		// Add the UI to Youtube
		
		// get UI Location
		var position = null;
		if (document.getElementById(TabNoc.Const.LocationStartBtnLoggedOut) !== null) {
			position = document.getElementById(TabNoc.Const.LocationStartBtnLoggedOut);
		} else if (document.getElementById(TabNoc.Const.LocationStartBtnLoggedIn) !== null) {
			position = document.getElementById(TabNoc.Const.LocationStartBtnLoggedIn);
		}

		// place UI Elements
		if (position !== null) {
			// Hide Button
			if (TabNoc.Settings.AddButtonToHideAll === true) {
				var switchDiv = document.createElement("div");
				switchDiv.setAttribute("id", "switchDiv");
				switchDiv.innerHTML = TabNoc.HTML.Switch;

				position.insertBefore(switchDiv, position.firstChild);

				// enable VisibleSwitch
				document.getElementById("TabNoc_VisibleSwitch").setAttribute("onchange", "ytVisible(this.checked); return true;");

				if (TabNoc.Settings.ShowHideAllButtonOnLaunch === false) {
					switchDiv.style.display = "none";
				}
				switchDiv.className = "yt-uix-button";
			}
			
			if (TabNoc.Settings.ImgToSwitchCloseTab === true) {
				var imgSrcClose = "https://cdn4.iconfinder.com/data/icons/iconset-addictive-flavour/png/button_grey_close.png";

				var img = document.createElement("img");
				img.setAttribute("id", "SwitchCloseTab");
				img.onclick = function(){
					TabNoc.Settings.AskToClosePageIfVideoDone = false;
					document.getElementById("SwitchCloseTab").style.display = "none";
				};
				img.setAttribute("style", "width: 20px; vertical-align: middle; cursor: pointer; opacity: 0.4;margin-left:22px;");

				document.getElementsByClassName(TabNoc.Const.LocationBtnSavingEnabled)[0].appendChild(img);
				document.getElementById("SwitchCloseTab").setAttribute("src", imgSrcClose);
			}
		}
		
		document.body.onbeforeunload = function(){TN_onBeforeUnload();};
	}

	function start() {
		try {
			// check if its Youtube
			if (movie_player !== null) {
				// check if the plugin is enabled
				if (!('getDuration' in movie_player)) {
					alert("Please enable the Flash-Plugin!");
					return;
				}

				// ***ready***
				addKeyHandler()

				if (TabNoc.Settings.AddButtonToHideAll === true) {
					document.getElementById("switchDiv").style.display = "";
				}

				/*Check if Function has already been executed*/
				if (document.getElementById(TabNoc.Const.remainTimeID) === null) {
					/*create div to write the remainingTime*/
					$("#" + TabNoc.Const.LabelContainerID).append("<div id='" + TabNoc.Const.remainTimeID + "'></div>");
					TabNoc.Variables.Div_RemainTime = $("#" + TabNoc.Const.remainTimeID)[0];
					
					/*create the TabNoc.Variables.Interval*/
					TabNoc.Variables.Interval = setInterval(OnIntervalTick, 1000);
				}

				// change Video Size to cimematic mode
				setTimeout(changeSizeToLarge, 5000);

				// Manage Skip and end-Times
				ManageTimes();
			} else {
				document.getElementById("yt-masthead-container").style.backgroundColor = "rgb(255, 187, 187)";
			}
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	
	function ytVisible(visible) {
		try {
			for (index = 0; index < TabNoc.Const.HideFieldDisplayNoneID.length; ++index) {
				document.getElementById(TabNoc.Const.HideFieldDisplayNoneID[index]).style.display = visible === false ? "none" : "";
			}
			for (index = 0; index < TabNoc.Const.HideFieldZIndexID.length; ++index) {
				document.getElementById(TabNoc.Const.HideFieldZIndexID[index]).style.zIndex = visible === false ? "-1" : "";
			}
			if (TabNoc.Settings.PauseVideoWhenHide) {
				movie_player.pauseVideo();
				if (TabNoc.Settings.HideTitleWhenPaused) {
					document.title = "[Hidden]";
				}
			}
			TabNoc.Variables.Hidden = !visible;
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}

	function TN_onBeforeUnload() {
		// return true to show message about "sure to leafe this site?"
		try {
			// restore old Title Name for Chronic
			document.title = TabNoc.Variables.OldTitleName;
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
		// return false;
	}

	function ManageTimes() {
		/*declare Variables*/

		var Name = document.getElementsByClassName("yt-user-info")[0].children[0].innerHTML;

		/*set predifined skip- and end-Times*/
		if (Name === "Kanzlei WBS") {
			TabNoc.Variables.EndTime = 17 + 7;
			movie_player.setPlaybackRate(1.25 + (document.title.contains("Recht für YouTuber") || document.title.contains("Challenge WBS") ? 0.25 : 0));
			if (document.title.contains("| Fernsehauftritt bei")) {
				TabNoc.Variables.SkipTime = 24; // neuerdings am anfang sprechgedöns -> erhöhen
				TabNoc.Variables.EndTime += 12;
				// TabNoc.Variables.SkipOver.push({
					// start : 5,
					// end : 18//20
				// });
			} else {
				AddGreyDetector({
					CallBack : (function (amount) {
						console.log("VideoGreyDetector Triggered: " + amount);
						movie_player.seekTo(movie_player.getCurrentTime() + 11 + (document.title.contains("Dr. Carsten Föhlisch") ? 5 : 0));
					}),
					Interval : 100,
					DetectorInterval : null,
					CopySizePercentage : 10,
					BaseVideo : document.getElementsByClassName("html5-main-video")[0],
					TriggerAmount : 5000, //14000,
					TriggerDarkPercentage : 70,
					StopIntervalAfterTrigger : true,
					MaxVideoCheckTime : 60000
				});
			}
		}
		if (Name === "SemperVideo" || Name === "SemperErratum" || Name === "SemperCensio") {
			TabNoc.Variables.SkipTime = 10.5;
			TabNoc.Variables.EndTime = 16;
			movie_player.setPlaybackRate(1.25);
		}
		if (Name === "minecraftpg5") {
			TabNoc.Variables.SkipTime = 6;
			TabNoc.Variables.EndTime = 15;
		}
		if (Name === "Space Engineers") {
			TabNoc.Variables.EndTime = 15;
		}
		if (Name === "BlackQuantumTV") {
			TabNoc.Variables.SkipTime = 0;
			TabNoc.Variables.EndTime = 0;
			// TabNoc.Variables.SkipOver.push({start:50, end:150});
			TabNoc.Variables.SkipOver.push({
				start : 1340,
				end : 1415
			});
		}
		if (Name === "XoXMeineAnimeWeltXoX") { //Anime: Kanon 2006
			TabNoc.Variables.SkipTime = 0;
			TabNoc.Variables.EndTime = 0;
			TabNoc.Variables.SkipOver.push({
				start : 105,
				end : 180
			});
			TabNoc.Variables.SkipOver.push({
				start : 1335,
				end : 150
			});
		}
		if (Name === "direwolf20") {
			if (document.title.contains("Space Engineers")) {
				movie_player.setPlaybackRate(1.5);
			} else {
				movie_player.setPlaybackRate(2);
			}
		}
		if (Name === "Arumba") {
			movie_player.setPlaybackRate(2);//(1.25);
		}
		if (Name === "ExcelIsFun") {
			movie_player.setPlaybackRate(2);//(1.5);
		}
		if (Name === "Nilaus") {
			movie_player.setPlaybackRate(2);
		}
		if (Name === "Cliff Harris") {
			movie_player.setPlaybackRate(1.25);
		}

		// Ignoring "Over Skippoint" when the Jumper is loaded but the Intervall is not called at the right time
		var TimeOnLoadCalled = movie_player.getCurrentTime();

		/*apply TabNoc.Variables.SkipTime*/
		var checkYtInterval = setInterval(function () {
				try {
					if (movie_player !== null && movie_player.seekTo !== null) {
						clearInterval(checkYtInterval);
						
						if (movie_player.getCurrentTime() > TabNoc.Variables.SkipTime && TimeOnLoadCalled > TabNoc.Variables.SkipTime && 
							TabNoc.Variables.SkipTime > 0 && TabNoc.Settings.AskToJumpIfOverSkipPoint) {
							// save old Value (TabNoc.Settings.DisableEscOnDialog)
							var old_HideOnEscPress = TabNoc.Settings.HideOnEscPress;
							if (TabNoc.Settings.DisableEscOnDialog) {
								TabNoc.Settings.HideOnEscPress = false;
							}
							if (confirm("Already over skippoint, Jump?") === true) {
								movie_player.seekTo(TabNoc.Variables.SkipTime);
							}
alert("AskToJumpIfOverSkipPoint, maybe delete it if not used");
							if (TabNoc.Settings.DisableEscOnDialog) {
								TabNoc.Settings.HideOnEscPress = old_HideOnEscPress;
							}
						} else if (TabNoc.Variables.SkipTime > 0) {
							movie_player.seekTo(TabNoc.Variables.SkipTime);
						}
					}
				}
				catch (exc) {
					console.error(exc);
					alert(exc);
				}
			}, 200);
			
		// change VideoQuality
		if (TabNoc.Settings.ChangeVideoQualityOnLoad === true) {
			if (movie_player.getPlaybackQuality() !== TabNoc.Settings.PreferedVideoQuality || true) { //when the VideoQuality is not the same as the PreferedVideoQuality
				// I have to Workaround because:
				// movie_player.getAvailableQualityLevels().some(function(x){return x === TabNoc.Settings.PreferedVideoQuality;})
				// throws an Error: Permission denied to access object
				var isVideoQualityAvailible = function(Quality) {
					var result = false;
					for (let x of movie_player.getAvailableQualityLevels()) { if (x === Quality) {result = true;}}
					return result;
				}
				if (isVideoQualityAvailible(TabNoc.Settings.PreferedVideoQuality) === true && screen.width > 1680 && !(movie_player.getPlaybackRate() > 1.5 && TabNoc.Settings.DisableVideoQualityUpgradeWhenDoubledSpeed === true)) { // when the PreferedVideoQuality can be choosen
					movie_player.setPlaybackQuality(TabNoc.Settings.PreferedVideoQuality); //choose the PreferedVideoQuality
				} else {
					if (isVideoQualityAvailible(TabNoc.Settings.SecondPreferedVideoQuality) === true) { // when the SecondPreferedVideoQuality can be choosen
						movie_player.setPlaybackQuality(TabNoc.Settings.SecondPreferedVideoQuality); //choose the PreferedVideoQuality
					}
					else {
						console.log("PreferedVideoQuality is not avalible");
					}
				}
			}
			if ($(".ytp-size-button")[0].getAttribute("title") === "Standardansicht") {
				var factor = 1.4;
//TODO implement minimize button (discard the changes)
				var newHeigth = parseInt(document.getElementsByClassName("video-stream html5-main-video")[0].style.height.replace("px", "")) * factor + "px";
				var newWidth = (newWidthInt = parseInt(document.getElementsByClassName("video-stream html5-main-video")[0].style.width.replace("px", "")) * factor) + "px";
				var newLeft = document.getElementById("player-api").style.left = ((newWidthInt / 2) * -1) + "px";

				// Hintergrund(der schwarze kasten)
				document.getElementsByClassName("player-height")[0].style.height = newHeigth;

				// Das Video (allerdings ohne Player)
				document.getElementsByClassName("video-stream html5-main-video")[0].style.height = newHeigth;
				document.getElementsByClassName("video-stream html5-main-video")[0].style.width = newWidth;

				// Player
				document.getElementsByClassName("player-api")[0].style.height = newHeigth;
				document.getElementsByClassName("player-api")[0].style.width = newWidth;
				document.getElementsByClassName("player-api")[0].style.left = newLeft;
				document.getElementsByClassName("player-api")[1].style.height = newHeigth;
				document.getElementsByClassName("player-api")[1].style.width = newWidth;
				document.getElementsByClassName("player-api")[1].style.left = newLeft;

				//Steuerelemente left anpassen
				document.getElementsByClassName("ytp-chrome-bottom")[0].style.left = (parseInt(document.getElementsByClassName("ytp-chrome-bottom")[0].style.left.replace("px", "")) + parseInt(document.getElementsByClassName("ytp-chrome-bottom")[0].style.width.replace("px", "")) * 0.1) + "px";
				
				// Warten bis das Vorschaubild Initialisiert wird
				var VorschaubildInterval = setInterval(function() {
					if (document.getElementsByClassName("ytp-tooltip ytp-bottom ytp-preview").length != 0) {
						// Vorschaubild anpassen
						document.getElementsByClassName("ytp-tooltip ytp-bottom ytp-preview")[0].style.marginLeft = "0px";
						clearInterval(VorschaubildInterval);
					}
				}, 1000);
				
				$("#watch-appbar-playlist").css("margin-top", "288px");
			}
		}
	}

	function OnIntervalTick() {
		try {
			var duration = movie_player.getDuration();
			var currentTime = movie_player.getCurrentTime();
			var remainingTime = duration - currentTime;
			
			// modify Title
			if (TabNoc.Variables.Hidden && TabNoc.Settings.HideTitleWhenPaused) {
				document.title = "[Hidden]";
			} 
			else if (TabNoc.Settings.ModifyTitleToVideoState) {
				/*
				-1 (unstarted)
				0 (ended)
				1 (playing)
				2 (paused)
				3 (buffering)
				5 (video cued)
				 */
				if (movie_player.getPlayerState() === 0) {
					//http://graphemica.com/%F0%9F%8F%81
					document.title = "🏁 " + TabNoc.Variables.OldTitleName.replace('\u25BA', '');
				} else if (movie_player.getPlayerState() === 1) {
					//\u25BA
					document.title = "[▶]" + TabNoc.Variables.OldTitleName.replace('\u25BA', '');
				} else if (movie_player.getPlayerState() === 2) {
					//http://www.fileformat.info/info/unicode/char/2759/index.htm
					document.title = "[❙❙]" + TabNoc.Variables.OldTitleName.replace('\u25BA', '');
				} else if (movie_player.getPlayerState() === 3) {
					//http://www.fileformat.info/info/unicode/char/21bb/index.htm
					document.title = "[↻]" + TabNoc.Variables.OldTitleName.replace('\u25BA', '');
				}
			}
			

			// wenn das Video abgelaufen ist(die zeit durch ist)
			if (remainingTime <= TabNoc.Variables.EndTime) {
				clearInterval(TabNoc.Variables.Interval);
				document.title = TabNoc.Variables.OldTitleName.replace('\u25BA', '');
				if (TabNoc.Settings.AskToClosePageIfVideoDone) {
					// save old Value (TabNoc.Settings.DisableEscOnDialog)
					var old_HideOnEscPress = TabNoc.Settings.HideOnEscPress;
					if (TabNoc.Settings.DisableEscOnDialog) {
						TabNoc.Settings.HideOnEscPress = false;
					}
					if (confirm("Video finished, shuld it been closed?") === true) {
						/* Changed the about:config settings (dom.allow_scripts_to_close_windows = true)*/
						window.open('', '_self').close();
						alert("If you can see this you have to set 'dom.allow_scripts_to_close_windows' to 'true' in about:config.");
					}
					if (TabNoc.Settings.DisableEscOnDialog) {
						TabNoc.Settings.HideOnEscPress = old_HideOnEscPress;
					}
				}
				$("#" + TabNoc.Const.remainTimeID).hide();
			}

			// SkipOver(sobald eine gewisse Zeit erreicht ist wird zu einer Zeit gesprungen)
			for (index = 0; index < TabNoc.Variables.SkipOver.length; ++index) {
				var skipOverElement = TabNoc.Variables.SkipOver[index];
				if (skipOverElement.start <= currentTime && skipOverElement.end >= currentTime) {
					movie_player.seekTo(skipOverElement.end);
					TabNoc.Variables.SkipOver.splice(index, 1);
					break;
				}
			}

			remainingTimeManager(duration, currentTime, remainingTime);
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}

	function remainingTimeManager(duration, currentTime, remainingTime) {
		var oldRemainingTimeString = TabNoc.Variables.RemainingTimeString;
		TabNoc.Variables.RemainingTimeString = "";
		
		remainingTime = Math.floor((remainingTime - TabNoc.Variables.EndTime) / movie_player.children[0].children[0].playbackRate); //movie_player.getPlaybackRate());
		
		// Zeitwert-string formatieren
		if (remainingTime >= 60) { // über einer Minute
			TabNoc.Variables.RemainingTimeString += Math.floor(remainingTime / 60) + ((remainingTime < 120) ? " Minute und " : " Minuten und ");
		}
		TabNoc.Variables.RemainingTimeString += (remainingTime % 60 < 10 ? "0" : "") + (remainingTime % 60) + " Sekunde" + (remainingTime % 60 !== 1 ? "n" : "");

		
		// Verwaltung der RemainTime anzeige
		if (TabNoc.Variables.RemainingTimeString !== oldRemainingTimeString) {
			remainingTimeOutput(TabNoc.Variables.RemainingTimeString);
		}
		if (TabNoc.Settings.AddMarginWhenRemainTime === true) {
			$("#page").addClass("MyAddMarginPage");
			// Disable Change after executing finished
			TabNoc.Settings.AddMarginWhenRemainTime = false;
		}
		
		//MarkRemainTimeOnLowBuffer
		if (TabNoc.Settings.MarkRemainTimeOnLowBuffer === true) {
			// current Video Buffer Size
			var BufferSize = (movie_player.getVideoLoadedFraction() * movie_player.getDuration() - movie_player.getCurrentTime()) / movie_player.getPlaybackRate();
			// is the BufferSize below the SettingValue and not fully loaded
			var LowBuffer = BufferSize < TabNoc.Settings.LowBufferSecondAmount && movie_player.getVideoLoadedFraction() !== 1;

			// Buffer is getting Low -> Start Showing red Label
			if (LowBuffer === true && TabNoc.Variables.LastCheckLowBuffer === false) {
				$("#page").removeClass("MyAddMarginPage").addClass("MyAddMarginPageWithoutImage");
				remainingTimeOutput(TabNoc.Variables.RemainingTimeString, BufferSize);
			}
			
			// Buffer is Low and Buffersize has changed [Pause when to Low]
			if (LowBuffer === true && TabNoc.Variables.LastCheckBufferSize !== BufferSize) {
				// AutoPause
				if (BufferSize <= 1 && BufferSize >= 0 && movie_player.getPlayerState() !== 3) {
					TabNoc.Variables.HasPausedOnLowBuffer = true;
					movie_player.pauseVideo();
					remainingTimeOutput(TabNoc.Variables.RemainingTimeString, BufferSize, true);
					$("#page").removeClass("MyAddMarginPage").removeClass("MyAddMarginPageWithoutImage").addClass("MyAddMarginPageWithImage");
				}
				else {
					remainingTimeOutput(TabNoc.Variables.RemainingTimeString, BufferSize);
				}
				TabNoc.Variables.LastCheckBufferSize = BufferSize;
			}
			// Buffer is getting high -> remove red Label [Play when high enouth]
			else if (LowBuffer === false && TabNoc.Variables.LastCheckLowBuffer === true) {
				$("#page").addClass("MyAddMarginPage").removeClass("MyAddMarginPageWithoutImage").removeClass("MyAddMarginPageWithImage");
				
				// AutoPlay
				if (TabNoc.Variables.HasPausedOnLowBuffer === true) {
					TabNoc.Variables.HasPausedOnLowBuffer = false;
					movie_player.playVideo();
				}
				remainingTimeOutput(TabNoc.Variables.RemainingTimeString, false, false);
			}
			TabNoc.Variables.LastCheckLowBuffer = LowBuffer;
		}
	}
	
	function remainingTimeOutput(RemainingTimeString, BufferSize, hasPaused) {
		var StartTextId = "#RemainTimeStart";
		var TimeTextId = "#RemainTimeTime";
		var BufferId = "#RemainTimeBuffer";
		var BufferTextId = "#RemainTimeBufferText";
		var ImageId = "#RemainTimeImage";
		
		if ($(StartTextId).length === 0) {
			// Initialize
			$(TabNoc.Variables.Div_RemainTime).append('<span id="RemainTimeStart">Es verbleiben </span><span id="RemainTimeTime"></span><span id="RemainTimeBuffer" style="display:none"><br>Buffer : ca. <span id="RemainTimeBufferText"></span>s<img id="RemainTimeImage"></span>');
			
			img = $($(ImageId)[0]);
			img.on("click", (function(){try{TabNoc.Variables.HasPausedOnLowBuffer = false;document.getElementById("RemainTimeImage").style.display = "none";}catch(exc){console.error(exc);alert(exc);}}));
			img.attr("src", "https://cdn0.iconfinder.com/data/icons/Tabs_Color_Social/40/Play-Pause.png");
		}
		
		if (RemainingTimeString !== null && RemainingTimeString != undefined) {
			$(TimeTextId)[0].textContent = RemainingTimeString;
			if (RemainingTimeString === "") {
				$(StartTextId).hide();
			}
		}
		
		if (BufferSize !== "" && BufferSize !== null && BufferSize != undefined) {
			if (BufferSize === false) {
				$(BufferId).hide();
			}
			else {
				$(BufferId).show();
				$(BufferTextId)[0].textContent = Math.floor(BufferSize);
			}
		}
		
		if (TabNoc.Settings.ImgToDisableRestart === true) {
			if (hasPaused !== "" && hasPaused !== null && hasPaused != undefined) {
				if (hasPaused === true) {
					$(ImageId).show();
				}
				else {
					$(ImageId).hide();
				}
			}
		}
	}

	function changeSizeToLarge() {
		changeSizeToLargeInterval = setTimeout(returnExec(function(){
			if ((unsafeWindow.yt != null && unsafeWindow.yt.www != null && unsafeWindow.yt.www != null && unsafeWindow.yt.www.watch != null) && TabNoc.Settings.ChangeVideoSizeToLarge === true) {
				// new YT Player
				if ($(".ytp-size-button").length === 0){
alert("Die Alte Methode wird noch verwendet!\r\nMittteilung Hinzugefügt am 26.10.2015");
					var changeToSmallBtn = document.getElementsByClassName("ytp-button ytp-size-toggle-small ytp-button-pressed");
					var changeToLargeBtn = document.getElementsByClassName("ytp-button ytp-size-toggle-large");
					if (changeToSmallBtn.length === 0 && changeToLargeBtn.length === 0) {
						throw ("TabNoc.Settings.ChangeVideoSizeToLarge [old] failed!");
					} else if (changeToLargeBtn.length !== 0) {
						changeToLargeBtn[0].click();
					}
				} else {
					var btn = $(".ytp-size-button");
					if (btn.length === 0) {
						throw ("TabNoc.Settings.ChangeVideoSizeToLarge [new] failed!");
					} else if (btn[0].getAttribute("title") === "Kinomodus") {
						btn[0].click();
					}
				}
			}
			clearInterval(changeSizeToLargeInterval);
		}), 1000);
	}

	function addKeyHandler() {
		//event.preventDefault(); hinzufügen (bedeutet das event wurde behandelt)

		//BUGGY!!!

		// add Strg+Alt Toggle Listeners
		if (TabNoc.Settings.TogglePauseOnStrgPress) {
			var keyDown = false;
			var func = function (e) {
				try {
					// console.log(e);

					// console.log("KeyCode:" + e.keyCode + " Alt:" + e.altKey);
					if (e.keyCode === 17 /*&& e.altKey === true*/ && TabNoc.Settings.TogglePauseOnStrgPress) {
						if (keyDown === false || e.type === "keyup") {
							keyDown = e.type === "keydown";
							if (movie_player.getPlayerState() === 2) {
								movie_player.playVideo();
							} else {
								movie_player.pauseVideo();
							}
						}
					}
				} catch (exc) {
					console.error(exc);
					alert(exc);
				}
			};
			$(document).keyup(func);
			$(document).keydown(func);
		}

		$(document).keydown(function (e) {
			try {
				if (e.target.nodeName == "INPUT") {
					return;
				}
				
				// Add Esc Listerner
				else if (e.keyCode === 27 && TabNoc.Settings.HideOnEscPress) {
					unsafeWindow.ytVisible(false);
					e.preventDefault();
				}

				// Add Space Listener
				else if (e.keyCode === 32 && TabNoc.Settings.PauseOnSpacePress) {
					e.preventDefault();
				
					console.log("Pressed Space >Direct Function<");
					console.log("Old: movie_player.getPlayerState(): " + movie_player.getPlayerState());
					
					if (TabNoc.Variables.ExpectedPlayerStateAfterSpace == 0) {
						TabNoc.Variables.ExpectedPlayerStateAfterSpace = (movie_player.getPlayerState() === 1) ? 2 : 1;
						
						
						
						setTimeout(function() {
							console.log("Pressed Space >Timed Function<");
							console.log("ExpectedPlayerStateAfterSpace: " + TabNoc.Variables.ExpectedPlayerStateAfterSpace);
							console.log("Old: movie_player.getPlayerState(): " + movie_player.getPlayerState());
							
							if (movie_player.getPlayerState() !== TabNoc.Variables.ExpectedPlayerStateAfterSpace) {
								if (movie_player.getPlayerState() === 1) {
									movie_player.pauseVideo();
								} 
								else {
									movie_player.playVideo();
								}
							}
							
							console.log("New: movie_player.getPlayerState(): " + movie_player.getPlayerState());
							
							TabNoc.Variables.ExpectedPlayerStateAfterSpace = 0;
						}, 200);
						
					}
					else {
						console.log("Ignored SpaceHandler");
					}
					// TODO: check if video has the right state(maybe check title)
					if (movie_player.getPlayerState() === 1) {
						movie_player.pauseVideo();
					}
					else {
						movie_player.playVideo();
					}
					console.log("New: movie_player.getPlayerState(): " + movie_player.getPlayerState());
				}

				// Add Alt+Shift+Del Delete SiteContent
				else if (e.keyCode === 46 && e.altKey === true && e.shiftKey === true && TabNoc.Settings.DeleteSiteContentOnKeyPress) {
					if (confirm("Seiteninhalt löschen?") === true) {
						unsafeWindow.document.getElementById("page-container").parentNode.removeChild(document.getElementById("page-container"));
					}
					e.preventDefault();
				}
				

				// Change Video Position at "-" on Numpad
				else if (e.keyCode === 109 && e.altKey === true && TabNoc.Settings.ChangeVideoPosOnKeyPress) {
					movie_player.seekTo(movie_player.getCurrentTime() - 60);
				}

				// Change Video Position at "+" on Numpad
				else if (e.keyCode === 107 && e.altKey === true && TabNoc.Settings.ChangeVideoPosOnKeyPress) {
					movie_player.seekTo(movie_player.getCurrentTime() + 60);
				}

				
				// Change Video Position at "-" on Numpad
				else if (e.keyCode === 109 && TabNoc.Settings.ChangeVideoPosOnKeyPress) {
					movie_player.seekTo(movie_player.getCurrentTime() - TabNoc.Settings.ChangeVideoPosValue);
				}

				// Change Video Position at "+" on Numpad
				else if (e.keyCode === 107 && TabNoc.Settings.ChangeVideoPosOnKeyPress) {
					movie_player.seekTo(movie_player.getCurrentTime() + TabNoc.Settings.ChangeVideoPosValue);
				}
				
				else {
					// return false is equivalent to call e.preventDefault()
					return true;
				}
			} catch (exc) {
				console.error(exc);
				alert(exc);
			}
		});
	}

	function Main() {
		try {
			console.log("Youtube-Jumper.user.js loading");

			if (document.URL.contains("&feature=youtu.be") || document.URL.contains("&a")) {
				location.replace(document.URL.replace("&a", "").replace("&feature=youtu.be", ""));
				return false;
			}
			
			registerTabNoc();

			InitializeUI();

			start();
			
			console.log("Youtube-Jumper.user.js done");
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}

	$(Main);

	console.log("Youtube-Jumper.user.js readed");
} catch (exc) {
	console.error(exc);
	alert(exc);
}

