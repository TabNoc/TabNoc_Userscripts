// ==UserScript==
// @name        Youtube-Jumper
// @description ©Marco Neuthor 2016
// @include     http*://www.youtube.*/watch?*
// @version     v2.1.3
// @require		https://code.jquery.com/jquery-2.1.1.min.js
// @require		https://raw.githubusercontent.com/trentrichardson/jQuery-Impromptu/master/dist/jquery-impromptu.min.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/base/GM__.js
// @require		VideoGreyDetector.js
// @require		SomeOtherStuff.js
// add @ to switch to local solutions
// require		GM__.js
// @resource	Impromptu http://raw.githubusercontent.com/trentrichardson/jQuery-Impromptu/master/dist/jquery-impromptu.min.css
// @resource	TabNocCSS https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/Implement-TabNoc.js/Youtube/TabNoc.css
// @grant       GM_getResourceText
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @run-at      document-end
// @noframes
// ==/UserScript==

//TODO: add playbackspeed slider right to the volume slider

try {
	if (String.prototype.contains == null) {String.prototype.contains = String.prototype.includes;}
	this.$ = this.jQuery = jQuery.noConflict(true);
	var movie_player = unsafeWindow.document.getElementById("movie_player");

	TabNoc = {
		Const : {
			SearchbarID : "masthead-search-term",
			LabelContainerID : "masthead-search", //old: "yt-masthead"
			remainTimeID : "TabNoc_YT_Jump",
			LocationStartBtnLoggedIn : "yt-masthead-user",
			LocationStartBtnLoggedOut : "yt-masthead-signin", //old "masthead-search"
			LocationBtnSavingEnabled : "yt-masthead-logo-container",
			SavingExtensionForDateTime : "##DT",

			HideFieldZIndexID : ["movie_player"],
			HideFieldDisplayNoneID : ["watch7-container", "masthead-search-terms", "movie_player"]
		},
		
		Settings : {
			ModifyTitleToVideoState : true,
			AddMarginWhenRemainTime : true,
			MarginWhenRemainTime : 17, //Passend festgelegt am 09.01.2016
			PauseOnSpacePress : true,
			TogglePauseOnStrgPress : true,
			AskToJumpIfOverSkipPoint : true,
			AskToClosePageIfVideoDone : true,
			MarkRemainTimeOnLowBuffer : true,
			LowBufferSecondAmount : 10,
			ImgToDisableRestart : true,
			ImgToSwitchCloseTab : true,
			MarginWhenLowBuffer : 50, //Passend festgelegt am 07.01.2016
			
			//Hide
			AddButtonToHideAll : true,
			ShowHideAllButtonOnLaunch : true,
			PauseVideoWhenHide : true,
			HideTitleWhenPaused : true,
			HideOnEscPress : true,
			DisableEscOnDialog : true,

			//[Saving]
			SavingEnabled : false, // Is Saved as GMSetting("SavingEnabled")
			ImgToSwitchSavingEnabled : true,

			//Last Position Saving
			SaveLastVideoPosition : true,
			JumpDirectToLastVideoPos : true,
			DeleteLastPosAtEndOfVideo : true,
			AutoSavePosInLongVideos : true,
			AutoSavePosLongVideoLength : 60 * 10,
			AutoSavePosInterval : 60,

			//Last VisitTime
			SaveLastVisitDateTime : false,
			ShowLastVisitDateTime : true,

			//Video Quality
			ChangeVideoQualityOnLoad : true,
			DisableVideoQualityUpgradeWhenDoubledSpeed : false,
			PreferedVideoQuality : "hd1080", //"hd1080", "hd720", "large", "medium", "small", "tiny" ...
			SecondPreferedVideoQuality : "hd720", //"hd1080", "hd720", "large", "medium", "small", "tiny" ...

			// ChangeVideoSizeToLarge : true,

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
			isLoaded : null,
			SkipOver : [],
			remainingTimeString : "",
			lastCheckBufferSize : 0,
			OldTitleName : document.title,
			CurrentVideoID : "", //will be set whe the user click the button,
			HasPausedOnLowBuffer : false,
			ExpectedPlayerStateAfterSpace : 0
		},

		HTML : {
			Switch : '<div class="onoffswitch" style="margin-top:10px"><input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="TabNoc_VisibleSwitch" checked><label class="onoffswitch-label" for="TabNoc_VisibleSwitch"><div class="onoffswitch-inner"></div><div class="onoffswitch-switch"></div></label></div>'
		},
	};

	function registerTabNoc() {
		unsafeWindow.TabNoc = cloneInto(TabNoc, unsafeWindow, {
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
		exportFunction(resetLastVisitValues, unsafeWindow, {
			defineAs : "resetLastVisitValues"
		});
		
		GM_addStyle(GM_getResourceText("Impromptu"));
		GM_addStyle(GM_getResourceText("TabNocCSS"));
	}

	function InitializeUI() {
		// Add the UI to Youtube
		
		// get UI Location
		var position = null;
		if (document.getElementById(unsafeWindow.TabNoc.Const.LocationStartBtnLoggedOut) !== null) {
			position = document.getElementById(unsafeWindow.TabNoc.Const.LocationStartBtnLoggedOut);
		} else if (document.getElementById(unsafeWindow.TabNoc.Const.LocationStartBtnLoggedIn) !== null) {
			position = document.getElementById(unsafeWindow.TabNoc.Const.LocationStartBtnLoggedIn);
		}

		// place UI Elements
		if (position !== null) {
			// Hide Button
			if (unsafeWindow.TabNoc.Settings.AddButtonToHideAll === true) {
				var switchDiv = document.createElement("div");
				switchDiv.setAttribute("id", "switchDiv");
				switchDiv.innerHTML = unsafeWindow.TabNoc.HTML.Switch;

				position.insertBefore(switchDiv, position.firstChild);

				// enable VisibleSwitch
				document.getElementById("TabNoc_VisibleSwitch").setAttribute("onchange", "ytVisible(this.checked); return true;");

				if (unsafeWindow.TabNoc.Settings.ShowHideAllButtonOnLaunch === false) {
					switchDiv.style.display = "none";
				}
				switchDiv.className = "yt-uix-button";
			}

			// Last Visit Time
			if (unsafeWindow.TabNoc.Settings.ShowLastVisitDateTime) {
				var div = document.createElement("div");
				div.setAttribute("id", "LastVisitDateTime");
				div.setAttribute("style", "display:inline-block");
				div.setAttribute("onclick", "resetLastVisitValues()");
				// div.className = "yt-uix-button";

				position.insertBefore(div, position.firstChild);
			}
			
			if (unsafeWindow.TabNoc.Settings.ImgToSwitchCloseTab === true) {
				var imgSrcClose = "https://cdn4.iconfinder.com/data/icons/iconset-addictive-flavour/png/button_grey_close.png";

				var img = document.createElement("img");
				img.setAttribute("id", "SwitchCloseTab");
				img.setAttribute("onclick", 'TabNoc.Settings.AskToClosePageIfVideoDone = false;document.getElementById("SwitchCloseTab").style.display = "none";document.getElementById("SavingEnabled").style.marginLeft = "40px";');
				img.setAttribute("style", "width: 20px; vertical-align: middle; cursor: pointer; opacity: 0.4;margin-left:22px;");

				document.getElementsByClassName(unsafeWindow.TabNoc.Const.LocationBtnSavingEnabled)[0].appendChild(img);
				document.getElementById("SwitchCloseTab").setAttribute("src", imgSrcClose);
			}
			
			if (unsafeWindow.TabNoc.Settings.ImgToSwitchSavingEnabled === true && unsafeWindow.TabNoc.Settings.SavingEnabled === false) {
				var imgSrcTrue = "https://cdn4.iconfinder.com/data/icons/icocentre-free-icons/137/f-check_256-20.png";
				var imgSrcFalse = "https://cdn4.iconfinder.com/data/icons/icocentre-free-icons/114/f-cross_256-20.png";

				var changeEnabled = function() {
					switch (document.getElementById("SavingEnabled").getAttribute("SavingEnabled")) {
						case "true":
							unsafeWindow.TabNoc.Settings.SavingEnabled = false;
							GM__setValue("SavingEnabled", false);
							document.getElementById("SavingEnabled").setAttribute("src", imgSrcFalse);
							document.getElementById("SavingEnabled").setAttribute("SavingEnabled", "false");
							document.getElementById("SavingEnabled").setAttribute("title", "SavingDisabled");
							break;
						case "false":
							unsafeWindow.TabNoc.Settings.SavingEnabled = true;
							GM__setValue("SavingEnabled", true);
							document.getElementById("SavingEnabled").setAttribute("src", imgSrcTrue);
							document.getElementById("SavingEnabled").setAttribute("SavingEnabled", "true");
							document.getElementById("SavingEnabled").setAttribute("title", "SavingEnabled");
							break;
					}
					return false;
				};

				var img = document.createElement("img");
				img.setAttribute("id", "SavingEnabled");
				img.setAttribute("style", "display:inline-block;vertical-align:middle;margin-left:20px;cursor:pointer");
				img.onclick = changeEnabled;

				document.getElementsByClassName(unsafeWindow.TabNoc.Const.LocationBtnSavingEnabled)[0].appendChild(img);

				var SavingEnabled = GM_getValue("SavingEnabled");
				if (SavingEnabled !== null) {
					unsafeWindow.TabNoc.Settings.SavingEnabled = SavingEnabled;
				}

				img.setAttribute("SavingEnabled", !unsafeWindow.TabNoc.Settings.SavingEnabled);
			}
		}

		document.body.setAttribute("onbeforeunload", "TN_onBeforeUnload()");
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

				// get current VideoID
				unsafeWindow.TabNoc.Variables.CurrentVideoID = movie_player.getVideoUrl().split("v=")[1].split("&")[0];

				// ***ready***
				addKeyHandler()

				// getLastVisitDateTime befor set it
				if (unsafeWindow.TabNoc.Settings.ShowLastVisitDateTime) {
					GM__getValue(unsafeWindow.TabNoc.Variables.CurrentVideoID + unsafeWindow.TabNoc.Const.SavingExtensionForDateTime, function (value) {
						if (value !== null && value > 0) {
							showDateTime(value);
						}
					});
				}

				// setLastVisitDateTime
				if (unsafeWindow.TabNoc.Settings.SaveLastVisitDateTime && unsafeWindow.TabNoc.Settings.SavingEnabled) {
					GM__setValue(unsafeWindow.TabNoc.Variables.CurrentVideoID + unsafeWindow.TabNoc.Const.SavingExtensionForDateTime, Date.now());
				}

				if (unsafeWindow.TabNoc.Settings.AddButtonToHideAll === true) {
					document.getElementById("switchDiv").style.display = "";
				}
				if (unsafeWindow.TabNoc.Settings.ImgToSwitchSavingEnabled === true) {
					document.getElementById("SavingEnabled").click();
				}

				/*Check if Function has already been executed*/
				if (document.getElementById(unsafeWindow.TabNoc.Const.remainTimeID) === null) {
					/*create div to write the remainingTime*/
					unsafeWindow.TabNoc.Variables.Div_RemainTime = document.createElement('div');
					unsafeWindow.TabNoc.Variables.Div_RemainTime.setAttribute('id', unsafeWindow.TabNoc.Const.remainTimeID);
//					unsafeWindow.TabNoc.Variables.Div_RemainTime.setAttribute('onclick', 'document.getElementById(TabNoc.Const.remainTimeID).setAttribute("show", "false");return false');
//					unsafeWindow.TabNoc.Variables.Div_RemainTime.setAttribute('title', "Disable RemainTime");
					unsafeWindow.TabNoc.Variables.Div_RemainTime.setAttribute('show', "true");
					document.getElementById(unsafeWindow.TabNoc.Const.LabelContainerID).appendChild(unsafeWindow.TabNoc.Variables.Div_RemainTime);

					/*create the unsafeWindow.TabNoc.Variables.Interval*/
					unsafeWindow.TabNoc.Variables.Interval = setInterval(OnIntervalTick, 1000);
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
			for (index = 0; index < unsafeWindow.TabNoc.Const.HideFieldDisplayNoneID.length; ++index) {
				document.getElementById(unsafeWindow.TabNoc.Const.HideFieldDisplayNoneID[index]).style.display = visible === false ? "none" : "";
			}
			for (index = 0; index < unsafeWindow.TabNoc.Const.HideFieldZIndexID.length; ++index) {
				document.getElementById(unsafeWindow.TabNoc.Const.HideFieldZIndexID[index]).style.zIndex = visible === false ? "-1" : "";
			}
			if (unsafeWindow.TabNoc.Settings.PauseVideoWhenHide) {
				movie_player.pauseVideo();
				if (unsafeWindow.TabNoc.Settings.HideTitleWhenPaused) {
					document.title = "[Hidden]";
				}
			}
			unsafeWindow.TabNoc.Variables.Hidden = !visible;
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}

	function TN_onBeforeUnload() {
		// return true to show message about "sure to leafe this site?"
		try {
			// restore old Title Name for Chronic
			document.title = unsafeWindow.TabNoc.Variables.OldTitleName;

			if (unsafeWindow.TabNoc.Variables.CurrentVideoID !== "" && unsafeWindow.TabNoc.Variables.CurrentVideoID !== null && unsafeWindow.TabNoc.Settings.SaveLastVideoPosition && unsafeWindow.TabNoc.Settings.SavingEnabled) {
				// wenn das video am ende ist und der speicher am ende des videos gelöscht wird
				if (movie_player.getCurrentTime() >= movie_player.getDuration() && unsafeWindow.TabNoc.Settings.DeleteLastPosAtEndOfVideo === true) {
					GM__deleteValue(unsafeWindow.TabNoc.Variables.CurrentVideoID);
				} else {
					GM_setValue(unsafeWindow.TabNoc.Variables.CurrentVideoID, movie_player.getCurrentTime());
					console.log("Saved Time: " + movie_player.getCurrentTime());
				}
			}
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
		return false;
	}

	function resetLastVisitValues() {
		try {
			$.prompt("", {
				title : "Sollen die Daten für dieses Video gelöscht werden?",
				top : "55%",
				buttons : {
					"Ja" : true,
					"Nein" : false
				},
				submit : function (e, v, m, f) {
					try {
						if (v === true) {
							// Diabled to prevent new Values afer closing
							unsafeWindow.TabNoc.Settings.SaveLastVideoPosition = false;

							GM__deleteValue(unsafeWindow.TabNoc.Variables.CurrentVideoID);
							GM__deleteValue(unsafeWindow.TabNoc.Variables.CurrentVideoID + unsafeWindow.TabNoc.Const.SavingExtensionForDateTime);

							// remove last Visit div
							document.getElementById("LastVisitDateTime").parentNode.removeChild(document.getElementById("LastVisitDateTime"));
						}
					} catch (exc) {
						console.error(exc);
						alert(exc);
					}
				}
			});
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}

	function ManageTimes() {
		/*declare Variables*/

		var Name = document.getElementsByClassName("yt-user-info")[0].children[0].innerHTML;

		/*set predifined skip- and end-Times*/
		if (Name === "Kanzlei WBS") {
			unsafeWindow.TabNoc.Variables.EndTime = 17 + 7;
			movie_player.setPlaybackRate(1.25 + (document.title.contains("Recht für YouTuber") || document.title.contains("Challenge WBS") ? 0.25 : 0));
			if (document.title.contains("| Fernsehauftritt bei ")) {
				unsafeWindow.TabNoc.Variables.SkipTime = 24; // neuerdings am anfang sprechgedöns -> erhöhen
				unsafeWindow.TabNoc.Variables.EndTime += 12;
				// unsafeWindow.TabNoc.Variables.SkipOver.push({
					// start : 5,
					// end : 18//20
				// });
			} else {
				AddGreyDetector({
					CallBack : (function (amount) {
						console.log("VideoGreyDetector Triggered: " + amount);
						movie_player.seekTo(movie_player.getCurrentTime() + 11 + (document.title.contains("Dr. Carsten Föhlisch") ? 5 : 0));
					}),
					Interval : 50,
					DetectorInterval : null,
					CopySizePercentage : 10,
					BaseVideo : document.getElementsByClassName("html5-main-video")[0],
					TriggerAmount : 450, //200, //min 257, //500, //550,		22.09.2016, YT has changed the player? older vids don't functions ether
					TriggerDarkPercentage : 70,
					StopIntervalAfterTrigger : true,
				});
			}
		}
		if (Name === "SemperVideo" || Name === "SemperErratum" || Name === "SemperCensio") {
			unsafeWindow.TabNoc.Variables.SkipTime = 10.5;
			unsafeWindow.TabNoc.Variables.EndTime = 16;
			movie_player.setPlaybackRate(1.25);
		}
		if (Name === "minecraftpg5") {
			unsafeWindow.TabNoc.Variables.SkipTime = 6;
			unsafeWindow.TabNoc.Variables.EndTime = 15;
		}
		if (Name === "Space Engineers") {
			unsafeWindow.TabNoc.Variables.EndTime = 15;
		}
		if (Name === "BlackQuantumTV") {
			unsafeWindow.TabNoc.Variables.SkipTime = 0;
			unsafeWindow.TabNoc.Variables.EndTime = 0;
			// unsafeWindow.TabNoc.Variables.SkipOver.push({start:50, end:150});
			unsafeWindow.TabNoc.Variables.SkipOver.push({
				start : 1340,
				end : 1415
			});
		}
		if (Name === "XoXMeineAnimeWeltXoX") { //Anime: Kanon 2006
			unsafeWindow.TabNoc.Variables.SkipTime = 0;
			unsafeWindow.TabNoc.Variables.EndTime = 0;
			unsafeWindow.TabNoc.Variables.SkipOver.push({
				start : 105,
				end : 180
			});
			unsafeWindow.TabNoc.Variables.SkipOver.push({
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

		// definieren der Methode für die letzte VideoPosition
		var lastVideoPositionJump = function () {
			if (unsafeWindow.TabNoc.Settings.JumpDirectToLastVideoPos) {
				GM__getValue(unsafeWindow.TabNoc.Variables.CurrentVideoID, function (value) {
					if (value != null && value != 0) {
						console.log("Loaded Timestamp:" + value);
						movie_player.seekTo(value);
alert("Jumped to Previous position, maybe delete it if not used");
					}
				});
			}
		};

		// Ignoring "Over Skippoint" when the Jumper is loaded but the Intervall is not called at the right time
		var TimeOnLoadCalled = movie_player.getCurrentTime();

		/*apply unsafeWindow.TabNoc.Variables.SkipTime*/
		var checkYtInterval = setInterval(function () {
				try {
					if (movie_player !== null && movie_player.seekTo !== null) {
						clearInterval(checkYtInterval);
						
						if (movie_player.getCurrentTime() > unsafeWindow.TabNoc.Variables.SkipTime && TimeOnLoadCalled > unsafeWindow.TabNoc.Variables.SkipTime && 
							unsafeWindow.TabNoc.Variables.SkipTime > 0 && unsafeWindow.TabNoc.Settings.AskToJumpIfOverSkipPoint) {
							// save old Value (unsafeWindow.TabNoc.Settings.DisableEscOnDialog)
							var old_HideOnEscPress = unsafeWindow.TabNoc.Settings.HideOnEscPress;
							if (unsafeWindow.TabNoc.Settings.DisableEscOnDialog) {
								unsafeWindow.TabNoc.Settings.HideOnEscPress = false;
							}
							if (confirm("Already over skippoint, Jump?") === true) {
								movie_player.seekTo(unsafeWindow.TabNoc.Variables.SkipTime);
							}
alert("AskToJumpIfOverSkipPoint, maybe delete it if not used");
							if (unsafeWindow.TabNoc.Settings.DisableEscOnDialog) {
								unsafeWindow.TabNoc.Settings.HideOnEscPress = old_HideOnEscPress;
							}
						} else if (unsafeWindow.TabNoc.Variables.SkipTime > 0) {
							movie_player.seekTo(unsafeWindow.TabNoc.Variables.SkipTime);
						}
						lastVideoPositionJump();
					} else if (movie_player.getCurrentTime() < unsafeWindow.TabNoc.Variables.SkipTime){
						document.getElementById(unsafeWindow.TabNoc.Const.remainTimeID).innerHTML += "  appling skipTime...";
alert("appling skipTime, maybe delete it if not used");
					}
				}
				catch (exc) {
					console.error(exc);
					alert(exc);
				}
			}, 200);
			
		// change VideoQuality
		if (unsafeWindow.TabNoc.Settings.ChangeVideoQualityOnLoad === true) {
			if (movie_player.getPlaybackQuality() !== unsafeWindow.TabNoc.Settings.PreferedVideoQuality || true) { //when the VideoQuality is not the same as the PreferedVideoQuality
				// I have to Workaround because:
				// movie_player.getAvailableQualityLevels().some(function(x){return x === unsafeWindow.TabNoc.Settings.PreferedVideoQuality;})
				// throws an Error: Permission denied to access object
				var isVideoQualityAvailible = function(Quality) {
					var result = false;
					for (let x of movie_player.getAvailableQualityLevels()) { if (x === Quality) {result = true;}}
					return result;
				}
				if (isVideoQualityAvailible(unsafeWindow.TabNoc.Settings.PreferedVideoQuality) === true && screen.width > 1680 && !(movie_player.getPlaybackRate() > 1.5 && unsafeWindow.TabNoc.Settings.DisableVideoQualityUpgradeWhenDoubledSpeed === true)) { // when the PreferedVideoQuality can be choosen
					movie_player.setPlaybackQuality(unsafeWindow.TabNoc.Settings.PreferedVideoQuality); //choose the PreferedVideoQuality
				} else {
					if (isVideoQualityAvailible(unsafeWindow.TabNoc.Settings.SecondPreferedVideoQuality) === true) { // when the SecondPreferedVideoQuality can be choosen
						movie_player.setPlaybackQuality(unsafeWindow.TabNoc.Settings.SecondPreferedVideoQuality); //choose the PreferedVideoQuality
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
					if (document.getElementsByClassName("ytp-tooltip ytp-bottom ytp-preview").legth != 0) {
						// Vorschaubild anpassen
						document.getElementsByClassName("ytp-tooltip ytp-bottom ytp-preview")[0].style.marginLeft = "126px";
						clearInterval(VorschaubildInterval);
					}
				}, 1000);
			}
		}
	}

	function OnIntervalTick() {
		try {
			var duration = movie_player.getDuration();
			var currentTime = movie_player.getCurrentTime();
			var remainingTime = duration - currentTime;
			
			// modify Title
			if (unsafeWindow.TabNoc.Variables.Hidden && unsafeWindow.TabNoc.Settings.HideTitleWhenPaused) {
				document.title = "[Hidden]";
			} 
			else if (unsafeWindow.TabNoc.Settings.ModifyTitleToVideoState) {
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
					document.title = "🏁 " + unsafeWindow.TabNoc.Variables.OldTitleName.replace('\u25BA', '');
				} else if (movie_player.getPlayerState() === 1) {
					//\u25BA
					document.title = "[▶]" + unsafeWindow.TabNoc.Variables.OldTitleName.replace('\u25BA', '');
				} else if (movie_player.getPlayerState() === 2) {
					//http://www.fileformat.info/info/unicode/char/2759/index.htm
					document.title = "[❙❙]" + unsafeWindow.TabNoc.Variables.OldTitleName.replace('\u25BA', '');
				} else if (movie_player.getPlayerState() === 3) {
					//http://www.fileformat.info/info/unicode/char/21bb/index.htm
					document.title = "[↻]" + unsafeWindow.TabNoc.Variables.OldTitleName.replace('\u25BA', '');
				}
			}
			

			// wenn das Video abgelaufen ist(die zeit durch ist)
			if (remainingTime <= unsafeWindow.TabNoc.Variables.EndTime) {
				clearInterval(unsafeWindow.TabNoc.Variables.Interval);
				document.title = unsafeWindow.TabNoc.Variables.OldTitleName.replace('\u25BA', '');
				if (unsafeWindow.TabNoc.Settings.AskToClosePageIfVideoDone) {
					// save old Value (unsafeWindow.TabNoc.Settings.DisableEscOnDialog)
					var old_HideOnEscPress = unsafeWindow.TabNoc.Settings.HideOnEscPress;
					if (unsafeWindow.TabNoc.Settings.DisableEscOnDialog) {
						unsafeWindow.TabNoc.Settings.HideOnEscPress = false;
					}
					if (confirm("Video finished, shuld it been closed?") === true) {
						/* Changed the about:config settings (dom.allow_scripts_to_close_windows = true)*/
						window.open('', '_self').close();
						alert("If you can see this you have to set 'dom.allow_scripts_to_close_windows' to 'true' in about:config.");
					}
					if (unsafeWindow.TabNoc.Settings.DisableEscOnDialog) {
						unsafeWindow.TabNoc.Settings.HideOnEscPress = old_HideOnEscPress;
					}
				}
				unsafeWindow.TabNoc.Variables.Div_RemainTime.setAttribute("show", "false");
			}

			// SkipOver(sobald eine gewisse Zeit erreicht ist wird zu einer Zeit gesprungen)
			for (index = 0; index < unsafeWindow.TabNoc.Variables.SkipOver.length; ++index) {
				var skipOverElement = unsafeWindow.TabNoc.Variables.SkipOver[index];
				if (skipOverElement.start <= currentTime && skipOverElement.end >= currentTime) {
					movie_player.seekTo(skipOverElement.end);
					unsafeWindow.TabNoc.Variables.SkipOver.splice(index, 1);
					break;
				}
			}

			remainingTimeManager(duration, currentTime, remainingTime);

			// AutoSave VideoPosition in langen Videos
			if (unsafeWindow.TabNoc.Settings.AutoSavePosInLongVideos) {
				if (duration > unsafeWindow.TabNoc.Settings.AutoSavePosLongVideoLength) {
					if (Math.floor(movie_player.getCurrentTime()) % unsafeWindow.TabNoc.Settings.AutoSavePosInterval === 0) {
						// call the save Method
						unsafeWindow.TN_onBeforeUnload();
					}
				}
			}
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}

	function remainingTimeManager(duration, currentTime, remainingTime) {
		var oldRemainingTimeString = unsafeWindow.TabNoc.Variables.remainingTimeString;
		unsafeWindow.TabNoc.Variables.remainingTimeString = "";
		
		// Zeitwert-string formatieren
		remainingTime = Math.floor((remainingTime - unsafeWindow.TabNoc.Variables.EndTime) / movie_player.children[0].children[0].playbackRate); //movie_player.getPlaybackRate());
		if (remainingTime >= 60) { // über einer Minute
			unsafeWindow.TabNoc.Variables.remainingTimeString += Math.floor(remainingTime / 60)
			if (remainingTime < 120) {
				unsafeWindow.TabNoc.Variables.remainingTimeString += " Minute";
			} else {
				unsafeWindow.TabNoc.Variables.remainingTimeString += " Minuten";
			}

			unsafeWindow.TabNoc.Variables.remainingTimeString += " und ";
		}
		unsafeWindow.TabNoc.Variables.remainingTimeString += (remainingTime % 60 < 10 ? "0" : "") + (remainingTime % 60) + " Sekunde" + (remainingTime % 60 !== 1 ? "n" : "");

		
		// Verwaltung der RemainTime anzeige
		/* If attribute show is true then update the text else delete the text, but if searchbar is "show!" then show the text again */
		if (unsafeWindow.TabNoc.Variables.Div_RemainTime.getAttribute("show") === "true") {
			if (unsafeWindow.TabNoc.Variables.remainingTimeString !== oldRemainingTimeString) {
				remainingTimeOutput(unsafeWindow.TabNoc.Variables.remainingTimeString);
			}
			if (unsafeWindow.TabNoc.Settings.AddMarginWhenRemainTime === true) {
				document.getElementById("page").style.marginTop = unsafeWindow.TabNoc.Settings.MarginWhenRemainTime + "px";
				// Disable Change after executing finished
				unsafeWindow.TabNoc.Settings.AddMarginWhenRemainTime = false;
			}
			
			//MarkRemainTimeOnLowBuffer
			if (unsafeWindow.TabNoc.Settings.MarkRemainTimeOnLowBuffer === true) {
				//current Video Buffer Size
				var BufferSize = (movie_player.getVideoLoadedFraction() * movie_player.getDuration() - movie_player.getCurrentTime()) / movie_player.getPlaybackRate();
				//is the BufferSize below the SettingValue and not fully loaded
				var LowBuffer = BufferSize < unsafeWindow.TabNoc.Settings.LowBufferSecondAmount && movie_player.getVideoLoadedFraction() !== 1;

				// Buffer is getting Low -> Start Showing red Label
				if (LowBuffer === true && unsafeWindow.TabNoc.Variables.Div_RemainTime.getAttribute("LowBuffer") !== "true") {
					unsafeWindow.TabNoc.Variables.Div_RemainTime.setAttribute("style", "color:red;font-weight:bold;font-size:150%");
					if (document.getElementById("page").style !== "") {
						document.getElementById("page").style.marginTop = unsafeWindow.TabNoc.Settings.MarginWhenLowBuffer + "px"; //55:200
					}
				}
				
				// Buffer is Low and Buffersize has changed [Pause when to Low]
				if (LowBuffer === true && unsafeWindow.TabNoc.Variables.lastCheckBufferSize !== BufferSize) {
					// AutoPause
					if (BufferSize <= 1 & BufferSize >= 0 && movie_player.getPlayerState() !== 3) {
						unsafeWindow.TabNoc.Variables.HasPausedOnLowBuffer = true;
						movie_player.pauseVideo();
						remainingTimeOutput(unsafeWindow.TabNoc.Variables.remainingTimeString, BufferSize, true);
					}
					else {
						remainingTimeOutput(unsafeWindow.TabNoc.Variables.remainingTimeString, BufferSize);
					}
					unsafeWindow.TabNoc.Variables.lastCheckBufferSize = BufferSize;
				}
				// Buffer is getting hight -> remove red Label [Play when high enouth]
				else if (LowBuffer === false && unsafeWindow.TabNoc.Variables.Div_RemainTime.getAttribute("LowBuffer") !== "false") {
					unsafeWindow.TabNoc.Variables.Div_RemainTime.setAttribute("style", "");
					if (document.getElementById("page").style !== "") {
						document.getElementById("page").style.marginTop = unsafeWindow.TabNoc.Settings.MarginWhenRemainTime + "px";
					}
					// AutoPlay
					if (unsafeWindow.TabNoc.Variables.HasPausedOnLowBuffer === true) {
						unsafeWindow.TabNoc.Variables.HasPausedOnLowBuffer = false;
						movie_player.playVideo();
						remainingTimeOutput(unsafeWindow.TabNoc.Variables.remainingTimeString, false, false);
					}
					else {
						remainingTimeOutput(unsafeWindow.TabNoc.Variables.remainingTimeString, false, false);
					}
				}
				unsafeWindow.TabNoc.Variables.Div_RemainTime.setAttribute("LowBuffer", LowBuffer);
			}
		} else {
			if (document.getElementById(unsafeWindow.TabNoc.Const.SearchbarID).value === "show!") {
				document.getElementById(unsafeWindow.TabNoc.Const.remainTimeID).setAttribute('show', "true");
				// remove clear Searchbar after activation
				document.getElementById(unsafeWindow.TabNoc.Const.SearchbarID).value = "";
			}
			remainingTimeOutput("")
		}
	}
	
	function remainingTimeOutput(remainingTimeString, BufferSize, hasPaused) {
		var StartTextId = "#RemainTimeStart";
		var TimeTextId = "#RemainTimeTime";
		var BufferId = "#RemainTimeBuffer";
		var BufferTextId = "#RemainTimeBufferText";
		var ImageId = "#RemainTimeImage";
		
		if ($(StartTextId).length === 0) {
			// Initialize
			unsafeWindow.TabNoc.Variables.Div_RemainTime.innerHTML = '<span id="RemainTimeStart">Es verbleiben </span><span id="RemainTimeTime"></span><span id="RemainTimeBuffer" style="display:none"><br>Buffer : ca. <span id="RemainTimeBufferText"></span>s<img id="RemainTimeImage"></span>';
			
			img = $(ImageId)[0];
			img.setAttribute("onclick", 'TabNoc.Variables.HasPausedOnLowBuffer = false;document.getElementById("RemainTimeImage").style.display = "none";');
			img.setAttribute("style", "vertical-align: middle; cursor: pointer; width: 22px; display:none");
			img.setAttribute("src", "https://cdn0.iconfinder.com/data/icons/Tabs_Color_Social/40/Play-Pause.png");
		}
		
		if (remainingTimeString !== null && remainingTimeString !== undefined) {
			if (remainingTimeString !== "") {
				$(TimeTextId)[0].textContent = remainingTimeString;
			}
			else {
				$(TimeTextId)[0].textContent = "";
				$(StartTextId).hide();
			}
		}
		
		if (BufferSize !== "" && BufferSize !== null && BufferSize !== undefined) {
			if (BufferSize === false) {
				$(BufferId).hide();
				$(BufferId)[0].style.display = "none";
			}
			else {
				$(BufferId).show();
				$(BufferTextId)[0].textContent = Math.floor(BufferSize);
			}
		}
		
		if (hasPaused !== "" && hasPaused !== null && hasPaused !== undefined) {
			if (hasPaused === true) {
				if (unsafeWindow.TabNoc.Settings.ImgToDisableRestart === true) {
					$(ImageId).show();
				}
			}
			else if (hasPaused === false) {
				$(ImageId).hide();
			}
		}
	}

	function showDateTime(value) {
		var appendString = function (value) {
			value = value.toString();
			return (value.length === 1 ? "0" : "") + value;
		}
		var date = new Date(value);

		document.getElementById("LastVisitDateTime").innerHTML = "Last Visit:<br/>" + appendString(date.getDate()) + "." + appendString(date.getMonth() + 1) + "." + appendString(date.getFullYear()) + " " + appendString(date.getHours()) + ':' + appendString(date.getMinutes()) + ':' + appendString(date.getSeconds());
	}

	function changeSizeToLarge() {
		changeSizeToLargeInterval = setTimeout(returnExec(function(){
			if ((unsafeWindow.yt != null && unsafeWindow.yt.www != null && unsafeWindow.yt.www != null && unsafeWindow.yt.www.watch != null) && unsafeWindow.TabNoc.Settings.ChangeVideoSizeToLarge === true) {
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
		if (unsafeWindow.TabNoc.Settings.TogglePauseOnStrgPress) {
			var keyDown = false;
			var func = function (e) {
				try {
					// console.log(e);

					// console.log("KeyCode:" + e.keyCode + " Alt:" + e.altKey);
					if (e.keyCode === 17 /*&& e.altKey === true*/ && unsafeWindow.TabNoc.Settings.TogglePauseOnStrgPress) {
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
				else if (e.keyCode === 27 && unsafeWindow.TabNoc.Settings.HideOnEscPress) {
					unsafeWindow.ytVisible(false);
					e.preventDefault();
				}

				// Add Space Listener
				else if (e.keyCode === 32 && unsafeWindow.TabNoc.Settings.PauseOnSpacePress) {
					e.preventDefault();
				
					console.log("Pressed Space >Direct Function<");
					console.log("Old: movie_player.getPlayerState(): " + movie_player.getPlayerState());
					
					if (unsafeWindow.TabNoc.Variables.ExpectedPlayerStateAfterSpace == 0) {
						unsafeWindow.TabNoc.Variables.ExpectedPlayerStateAfterSpace = (movie_player.getPlayerState() === 1) ? 2 : 1;
						
						
						
						setTimeout(function() {
							console.log("Pressed Space >Timed Function<");
							console.log("ExpectedPlayerStateAfterSpace: " + unsafeWindow.TabNoc.Variables.ExpectedPlayerStateAfterSpace);
							console.log("Old: movie_player.getPlayerState(): " + movie_player.getPlayerState());
							
							if (movie_player.getPlayerState() !== unsafeWindow.TabNoc.Variables.ExpectedPlayerStateAfterSpace) {
								if (movie_player.getPlayerState() === 1) {
									movie_player.pauseVideo();
								} 
								else {
									movie_player.playVideo();
								}
							}
							
							console.log("New: movie_player.getPlayerState(): " + movie_player.getPlayerState());
							
							unsafeWindow.TabNoc.Variables.ExpectedPlayerStateAfterSpace = 0;
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
				else if (e.keyCode === 46 && e.altKey === true && e.shiftKey === true && unsafeWindow.TabNoc.Settings.DeleteSiteContentOnKeyPress) {
					if (confirm("Seiteninhalt löschen?") === true) {
						unsafeWindow.document.getElementById("page-container").parentNode.removeChild(document.getElementById("page-container"));
					}
					e.preventDefault();
				}
				

				// Change Video Position at "-" on Numpad
				else if (e.keyCode === 109 && e.altKey === true && unsafeWindow.TabNoc.Settings.ChangeVideoPosOnKeyPress) {
					movie_player.seekTo(movie_player.getCurrentTime() - 60);
				}

				// Change Video Position at "+" on Numpad
				else if (e.keyCode === 107 && e.altKey === true && unsafeWindow.TabNoc.Settings.ChangeVideoPosOnKeyPress) {
					movie_player.seekTo(movie_player.getCurrentTime() + 60);
				}

				
				// Change Video Position at "-" on Numpad
				else if (e.keyCode === 109 && unsafeWindow.TabNoc.Settings.ChangeVideoPosOnKeyPress) {
					movie_player.seekTo(movie_player.getCurrentTime() - unsafeWindow.TabNoc.Settings.ChangeVideoPosValue);
				}

				// Change Video Position at "+" on Numpad
				else if (e.keyCode === 107 && unsafeWindow.TabNoc.Settings.ChangeVideoPosOnKeyPress) {
					movie_player.seekTo(movie_player.getCurrentTime() + unsafeWindow.TabNoc.Settings.ChangeVideoPosValue);
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

