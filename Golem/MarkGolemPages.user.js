// ==UserScript==
// @name        MarkGolemPages
// @namespace   TabNoc
// @include     http*://www.golem.de/*
// @version     1.5.5_20092020
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/ImplementSync/base/GM__.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/ImplementSync/base/TabNoc.js
// @require     https://raw.githubusercontent.com/benjamine/jsondiffpatch/v0.2.5/public/build/jsondiffpatch.js
// @require     https://raw.githubusercontent.com/benjamine/jsondiffpatch/v0.2.5/public/build/jsondiffpatch-formatters.js
// @resource    JDiffHtml https://raw.githubusercontent.com/benjamine/jsondiffpatch/v0.2.5/public/formatters-styles/html.css
// @resource    JDiffAnno https://raw.githubusercontent.com/benjamine/jsondiffpatch/v0.2.5/public/formatters-styles/annotated.css
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/ImplementSync/base/States.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/ImplementSync/base/ImportAll.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/ImplementSync/base/jquery_ui/jquery-ui.min.js
// @require     https://gist.githubusercontent.com/TheDistantSea/8021359/raw/89d9c3250fd049deb23541b13faaa15239bd9d05/version_compare.js
// @resource	JqueryUI https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/ImplementSync/base/jquery_ui/jquery-ui.min.css
// @resource	MyCss https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/ImplementSync/Golem/MarkGolemPages.css
// updateURL	https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/Golem/MarkGolemPages.user.js
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @grant       GM_registerMenuCommand
// @grant       GM_listValues
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @grant       GM_xmlhttpRequest
// @grant       GM_addValueChangeListener
// @grant       GM_openInTab
// @connect     tabnoc.gear.host
// @noframes
// ==/UserScript==

/*
ChangeList started at 12.12.2016

12.12.2016 - 1.0.0
Start Writing Script

27.04.2017 - 1.1.0
	- changed a bunch

28.04.2017 - 1.1.1
	- optical Improvements

08.05.2017 - 1.2.0
	- rewritten Styling, Script now uses own css file instead of node styles
	- further optical Improvements

10.05.2017 - 1.2.1
	- added @updateURL
	- fixed wrong TabNoc.js file being loaded

21.08.2017 - 1.2.2
	- fixed: very short Message Display Time after Marking
	- changed: Marking Button will only be displayed, if Element isn't marked

19.09.2017 - 1.2.3
	- added: jsondiffpatch
	- added: SetData
	- changed: SetData now uses Diff to provide multiple States

30.09.2017 - 1.2.4
	- added: CreateHistoryDialog
	- added: Version checking from Imports

30.09.2017 - 09.04.2018 - 1.3.0 beta
	- changed alot

09.04.2018 - 1.3.1
	- added: Debug to show Refresh reason

26.04.2018 - 1.3.2
	- changed: modified src, so a webSite change is more easy to handle

02.05.2018 - 1.3.3
	- added: ScanWithKeyPress

07.05.2018 - 1.3.4
	- changed: Validating Element with CheckCurrentElementFunction
	- added: ScanWithKeyPress at Page view to Scan Page etc.
	- changed: replaced UpdateDataBase with a more generic version

14.05.2018 - 1.3.5
	- added: scrolling on NewsPage with < and >

17.05.2018 - 1.3.6
	- added support for mobile Devices
	- fixed: UpdateDatabaseTable CheckInit

22.05.2018 - 1.3.7
	- fixed: UpdateDatabase had not used functions object
	- changed:  Updated to ImportAll v1.1.0

02.06.2018 - 1.3.8
	- fixed: errors on mobile Sites
	- changed:  Elements with the wrong structure are now unknown Elements
	- changed: Improved message after marking elements

12.06.2018 - 1.3.9
	- added: Ticker Support

30.06.2018 - 1.4.0
	- changed: Changed Code to 2 different Clusters, one SiteSpecific and one abstract base Code

03.07.2018 - 1.4.1
	- fixed: UpdateDatabase get stuck

16.03.2019 - 1.4.2
	- added: basic Spritz Support

03.05.2019 - 1.4.3
	- added: ActRemover Command

03.08.2019 - 1.5.0
	- added: DeletedNewsArray

07.09.2019 - 1.5.1
	- fixed: new mobile Ticker format

07.09.2019 - 1.5.2
	- fixed: new mobile Ticker format - bugfix

23.09.2019 - 1.5.3
	- mobile optimizations

13.12.2019 - 1.5.4
	- added: Open Random NewsPage from ToReadArray
	- added: ToggleButton to close Page if Newspage is element of ToReadArray

20.09.2020 - 1.5.5
	- fixed: ScanWithKeyPress not working anymore
	- added: logging when no element is found from ScanWithKeyPress
*/

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

			promptOnClose : true,

			Debug: false, // WebKonsole: TabNoc_.MarkGolemPages.Variables.Debug = true;
			// Wird zurückgesetzt, wenn die Seite versteckt war
			WasHidden: true,
			// Status, wann die Funktion wieder bestätigt werden muss
			ScanWithKeyPressActiveTimeOut: 0,
			PageReaded: false
		},

		Settings: {
			SavingEnabled: true,
			MarkAfterScan: true,
			HideAlreadyWatchedNews : false,

			Personal: {
				ScanUninterestingTweet: false,
				HideUninterestingTweets: false,
				UninterestingTweetsText: [],
				TimerInterval: 1000
			},

			ScanWithKeyPressEnabled: true,
			ShowOpenInNewTabButton: false,

			ScanButtonDomParent: "#grandwrapper",
			ElementsSearchString: GetElementsSearchString(),
			NameOfElements: "Newspages",
			NameOfElement: "Newspage",
			GetIDFunction: function(element) {return (CurrentUrlIsTicker() || CurrentUrlIsArchive()) ? $(element).children("h3").eq(0).children("a")[0].getAttribute("href") : $(element).children("a")[0].getAttribute("href");},
			GetCurrentSiteIDFunction: function() {return document.URL;},
			CheckCurrentElementFunction: CheckCurrentElementFunction,
			GetHidingNode: function (element){return element.parentNode.nodeName == "li" ? element.parentNode : element;}
		},

		HTML: {
			ScanButton: '<div class="MyScanButton" title="Scannen"><div></div></div>',
			ReadButton: '<div class="MyReadButton" title="Lesen"><div></div></div>',
			OpenTabButton: '<div class="MyOpenTabButton" title="Open in new Tab"><div></div></div>'
		}
	});

	// ##########-##########-##########-##########-##########-########-########-##########-##########-##########-##########-##########
	// ##########-##########-##########-##########-####### Site specific Functions #######-##########-##########-##########-##########
	// ##########-##########-##########-##########-##########-########-########-##########-##########-##########-##########-##########

	function CurrentUrlIsTicker() {
		return document.URL == "https://www.golem.de/ticker/";
	}

	function CurrentUrlIsArchive() {
		return document.URL.contains("https://www.golem.de/aa-");
	}

	function CheckCurrentElementFunction(element) {
		if (CurrentUrlIsTicker() == true || CurrentUrlIsArchive ()) {
			return $(element).children("h3").length === 1 && $(element).children("h3").eq(0).children("a").length === 1 && $(element).children("h3").eq(0).children("a")[0].hasAttribute("href");
		} else {
			if (element.id === "index-promo") {
				return element.querySelectorAll("section>div>a").length == 1 && element.querySelector("section>div>a").id.startsWith("bigalt");
			}
			else {
				return
					$(element).children("a").length === 1 && (
						element.className.contains("media__teaser--articles") ||
						$(element).children("a")[0].getAttribute("id").includes("hpal" + (MobileCheck() === false ? "t" : "")) ||
						$(element).children("a")[0].getAttribute("id").includes("msalt")
				);
			}
		}
	}

	function GetElementsSearchString(){
		if (CurrentUrlIsTicker() || CurrentUrlIsArchive ()) {
			if (MobileCheck()) { // && !CurrentUrlIsArchive ()) {
				return ".list-ticker>li";
			}
			else {
				return ".list-tickers>li";
			}
		}
		else {
			if (MobileCheck()) {
				return ".leader, .media__teaser-list>li>div";
			}
			else {
				return "#index-promo, .list-articles>li";
			}
		}
	}

	function getRandomInt(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min)) + min;
	}

	function StartPageLoader_SiteSpecific() {
		console.log("StartPageLoader_SiteSpecific");


		GM_registerMenuCommand("Toggle CloseToReadNewsPage", function() {
			SetData("CloseToReadNewsPage", !GetData("CloseToReadNewsPage", false, false), false, true);
		});
		GM_registerMenuCommand("Open Random ToReadNews", function() {
			var ToReadNewsArray = GetData("ToReadNewsArray", "([])", true);
			console.log(ToReadNewsArray.length + " ToReadNews availible!");
			var win = window.open(ToReadNewsArray[getRandomInt(0, ToReadNewsArray.length)]);
  			win.focus();
		});


		$("#index-vica2").remove();

		$(".list-articles>li").detach().appendTo($(".list-articles").first());

		$(".iqadlinetop>div").css("border-color", "transparent");

		// Alle Nachrichten untereinander hängen
		let elements = $("div").filter(".g:gt(1).g4").detach();
		elements.insertAfter($("div").filter(".g.g4"));
	}

	function PageLoaderKeyListener(KeyPressActivated, event) {
		// return true sets finished to true
		if (event.key == "ArrowRight" && event.ctrlKey == true) {
			if (KeyPressActivated) {
				if ($("#jtoc_next,#atoc_next").length == 1) {
					$("#jtoc_next,#atoc_next")[0].click();
				}
				return true;
			}
		}
		else if (event.key == "ArrowLeft" && event.ctrlKey == true) {
			if (KeyPressActivated) {
				if ($("#atoc_prev").length == 1) {
					$("#atoc_prev")[0].click();
				}
				return true;
			}
		}
	}

	function ReadingNewspageFinishAction(){
		if (TabNoc.Variables.PageReaded == true){
			if ($("#jtoc_next,#atoc_next").length >= 1 && confirm("Soll die nächste Seite geöffnet werden?") == true) {
				$("#jtoc_next,#atoc_next")[0].click();
				return;
			}
			if (confirm("Soll die Seite geschlossen werden?") == true) {
				window.open('', '_self').close();
				alert("If you can see this you have to set 'dom.allow_scripts_to_close_windows' to 'true' in about:config.");
			}
		}
	}

	function UpdateDataBase(functions, silent) {
		silent = false;
		if (functions == null) {
			functions = ({
				lock: GM_Lock,
				unlock: GM_Unlock,
				getValue: GetData,
				setValue: GM_setValue
			});
		} else {
			functions.lock = functions.lock || GM_Lock;
			functions.unlock = functions.unlock || GM_Unlock;
			functions.getValue = functions.getValue || GetData;
			functions.setValue = functions.setValue || GM_setValue;
		}
		let ExpectedVersionNumber_ReadedNewsArray = 1;
		let ExpectedVersionNumber_SeenNewsArray = 1;
		let ExpectedVersionNumber_ToReadNewsArray = 1;
		let ExpectedVersionNumber_DeletedNewsArray = 1;

		// ### ReadedNewsArray-Version ###
		let CurrentVersionNumber_ReadedNewsArray = functions.getValue("ReadedNewsArray-Version", 0, true);
		// ### SeenNewsArray-Version ###
		let CurrentVersionNumber_SeenNewsArray = functions.getValue("SeenNewsArray-Version", 0, true);
		// ### ToReadNewsArray-Version ###
		let CurrentVersionNumber_ToReadNewsArray = functions.getValue("ToReadNewsArray-Version", 0, true);
		// ### ToReadNewsArray-Version ###
		let CurrentVersionNumber_DeletedNewsArray = functions.getValue("DeletedNewsArray-Version", 0, true);

		let TableUpdateObject = {
			"ReadedNewsArray": {
				"CheckInit": function (functions, silent) {
					return functions.getValue("ReadedNewsArray") == undefined;
				},
				"InitTable": function (functions, silent) {},
				0: function (functions, silent) {
					let returnStats = {
						ChangeCount: 0,
						OldSize: 0,
						NewSize: 0
					};
					return {
						Result: true,
						Stats: returnStats,
						NewVersionNumber: 1,
						Save: function (functions, silent) {}
					};
				}
			},
			"SeenNewsArray": {
				"CheckInit": function (functions, silent) {
					return functions.getValue("SeenNewsArray") == undefined;
				},
				"InitTable": function (functions, silent) {},
				0: function (functions, silent) {
					let returnStats = {
						ChangeCount: 0,
						OldSize: 0,
						NewSize: 0
					};
					return {
						Result: true,
						Stats: returnStats,
						NewVersionNumber: 1,
						Save: function (functions, silent) {}
					};
				}
			},
			"ToReadNewsArray": {
				"CheckInit": function (functions, silent) {
					return functions.getValue("ToReadNewsArray") == undefined;
				},
				"InitTable": function (functions, silent) {},
				0: function (functions, silent) {
					let returnStats = {
						ChangeCount: 0,
						OldSize: 0,
						NewSize: 0
					};
					return {
						Result: true,
						Stats: returnStats,
						NewVersionNumber: 1,
						Save: function (functions, silent) {}
					};
				}
			},
			"DeletedNewsArray": {
				"CheckInit": function (functions, silent) {
					return functions.getValue("DeletedNewsArray") == undefined;
				},
				"InitTable": function (functions, silent) {},
				0: function (functions, silent) {
					let returnStats = {
						ChangeCount: 0,
						OldSize: 0,
						NewSize: 0
					};
					return {
						Result: true,
						Stats: returnStats,
						NewVersionNumber: 1,
						Save: function (functions, silent) {}
					};
				}
			}
		};

		UpdateDatabaseTable(ExpectedVersionNumber_ReadedNewsArray, CurrentVersionNumber_ReadedNewsArray, "ReadedNewsArray", TableUpdateObject, functions, silent);
		UpdateDatabaseTable(ExpectedVersionNumber_SeenNewsArray, CurrentVersionNumber_SeenNewsArray, "SeenNewsArray", TableUpdateObject, functions, silent);
		UpdateDatabaseTable(ExpectedVersionNumber_ToReadNewsArray, CurrentVersionNumber_ToReadNewsArray, "ToReadNewsArray", TableUpdateObject, functions, silent);
		UpdateDatabaseTable(ExpectedVersionNumber_DeletedNewsArray, CurrentVersionNumber_DeletedNewsArray, "DeletedNewsArray", TableUpdateObject, functions, silent);
	}

	function Distribute() {
		var removeAdsInterval = setInterval(function() {
			if ($("div>img[src*='//www.golem.de']").length >= 5) {
				// header
				$("div>img[src*='//www.golem.de']:nth(1)").first().parent().parent().remove();
				// footer
				$("div>img[src*='//www.golem.de']").last().parent().parent().find(":lt(6)").remove();
				// side
				$("div>img[src*='//www.golem.de']").first().parent().remove();
				// under Jobs
				$("div>img[src*='//www.golem.de']").first().parent().parent().children().slice(2, 6).remove();

				$("div>img[src*='//www.golem.de']").first().parent().parent().remove();
				$("div>img[src*='//www.golem.de']").first().parent().parent().remove();
				// under Jobs
				$("div>img[src*='//www.golem.de']").first().parent().parent().children().slice(2, 6).remove();

				$(".supplementary").remove();
				clearInterval(removeAdsInterval);
			}
		}, 100);

		// if return == false a message will be show, than no LoadObject was found
		// Startseite
		if (document.URL.includes("news") == false) {
			StartPageLoader();
			return true;
		}
		// Nachrichtenseite
		else if (document.URL.includes("news") == true) {
			NewsPageLoader();


			GM_registerMenuCommand("Spritz", function() {
				// überschriften anpassen
				$(".formatted,.paged-cluster-header").children(":header").text(function (index, value) {
					return ". >>> " + value + " <<<.";
				})
				$(".formatted>p").text(function (index, value) {
					return value + " - .";
				})
				$("#job-market").remove();

				var lastMessage = "";
				function MyKeyEvent(e) {
					try{
						var currentMessage = "TabNoc:" + e.type + ";" + e.keyCode;
						if (currentMessage != lastMessage) {
							// $("[src='https://sdk.spritzinc.com/js/1.2/bookmarklet/html/spritzlet.html?1.1.2']")[0].contentWindow.postMessage(currentMessage, "*"); //"http://www.golem.de");//"https://sdk.spritzinc.com");
							//TODO: adjust src link, possibly outdated and adjust spritz script
							//$("[src='https://sdk.spritzinc.com/bookmarklet/latest/js/SpritzletOuter.js']")[0].contentWindow.postMessage(currentMessage, "*");
							$("[src^='https://sdk.spritzinc.com/bookmarklet/']")[0].contentWindow.postMessage(currentMessage, "*"); //"http://www.golem.de");//"https://sdk.spritzinc.com");
							lastMessage = currentMessage;
						}
						e.preventDefault = true;
						return true;
					}
					catch(exc) {
						console.log(exc);
						alert(exc)
					}
				}

				$(document).keydown(MyKeyEvent);
				$(document).keyup(MyKeyEvent);
			});
			GM_registerMenuCommand("ActRemover", function() {
				$(".popup-visible").removeClass("popup-visible");
				document.body.style.overflow = "";
			});

			return true;
		}
		return false;
	}

	//TODO: Rename NewsArrays to PageArrays
	// ##########-##########-##########-##########-##########-########-########-##########-##########-##########-##########-##########
	// ##########-##########-##########-##########-########## general Functions ##########-##########-##########-##########-##########
	// ##########-##########-##########-###### Changes Down here will be applied to all Sites #######-##########-##########-##########
	// ##########-##########-##########-##########-##########-########-########-##########-##########-##########-##########-##########
	
	function ErrorHandler(exc, msg) {
		if (msg != null && msg != "") {
			console.error(msg + ":\r\n\r\n" + exc);
			alert(msg + ":\r\n\r\n" + exc);
		} else {
			console.error(exc);
			alert(exc);
		}
	}

	function MobileCheck() {
		var check = false;
		(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
		return check;
	};

	function MobileAndTabletCheck() {
		var check = false;
		(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
		return check;
	};

	// ### http*://www.golem.de ###
	function StartPageLoader() {
		console.log(GM_info.script.name + ".user.js loading");
		try {
			registerTabNoc();
			if (TabNoc.Variables.Debug === true) {
				TabNoc.Variables.lastCheckItemCount = -1;
			}

			StartPageLoader_SiteSpecific();

			// ## ScanWithKeyPress ##

			if (MobileCheck() === false) {
				if (TabNoc.Settings.ScanWithKeyPressEnabled === true) {
					$(document).on("keydown", event => {
						if (event.keyCode == 160) {
							if (TabNoc.Variables.ScanWithKeyPressActiveTimeout > new Date() && TabNoc.Variables.WasHidden == false) {
								let scanElement = $(TabNoc.Settings.ElementsSearchString)
									.toArray()
									.find(element => element.className.endsWith("MyPageElement"));
								if (scanElement != null) {
									getAllElements(null, TabNoc.Settings.GetIDFunction(scanElement), false);
								}
								else {
									console.warn("no Element found from ScanWithKeyPress");
								}
								event.preventDefault();
								TabNoc.Variables.ScanWithKeyPressActiveTimeout = new Date(new Date().getTime() + 600000);
							}
							else {
								if (confirm("Soll die Bearbeitung durch ScanWithKeyPress aktiviert werden?") == true) {
									TabNoc.Variables.ScanWithKeyPressActiveTimeout = new Date(new Date().getTime() + 600000);
									TabNoc.Variables.WasHidden = false;
								}
							}
						}
					});
				}
			}

			// ## ScanWithKeyPress ##

			var ValueChangeCallback = function(name, old_value, new_value, remote) {
				startCheckElements(TabNoc.Variables.MarkToggleState, true);
			};
			GM_addValueChangeListener("ReadedNewsArray", ValueChangeCallback);
			GM_addValueChangeListener("SeenNewsArray", ValueChangeCallback);
			GM_addValueChangeListener("ToReadNewsArray", ValueChangeCallback);

			TabNoc.Variables.checkElementsInterval = setInterval(returnExec(function () {
				startCheckElements(TabNoc.Variables.MarkToggleState);
			}), TabNoc.Settings.Personal.TimerInterval);
			console.log(GM_info.script.name + ".user.js executed");

			console.log(GM_info.script.name + ".user.js done");
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}

	function registerTabNoc() {
		GM_registerMenuCommand("Einlesen", returnExec(getAllElements));

		GM_registerMenuCommand("CreateHistoryDialog", function() {CreateHistoryDialog(GetData("changes", "([])", true));});

		GM_registerMenuCommand("ManuelleSyncronisation", returnExec(Syncronisieren));
	}

	/**
	* [startCheckElements description]
	* @param  {bool} ToggleState Overwirtes ToggleState
	* @param  {bool} force       foreces Execution when true
	* @return {void}
	*/
	function startCheckElements(ToggleState, force) {
		if (document.hidden === false || force === true) {
			var elements = $(TabNoc.Settings.ElementsSearchString);
			if (TabNoc.Variables.Debug === true && TabNoc.Variables.lastCheckItemCount !== elements.length) {
				console.log("startCheckElements()", "elements:", elements);
            }

			if (force === true || TabNoc.Variables.lastCheckItemCount !== elements.length) {
				// ### ReadedNewsArray ###
				var ReadedNewsArray = GetData("ReadedNewsArray", "([])", true);
				// ### SeenNewsArray ###
				var SeenNewsArray = GetData("SeenNewsArray", "([])", true);
				// ### ToReadNewsArray ###
				var ToReadNewsArray = GetData("ToReadNewsArray", "([])", true);

				//TODO. revert this Hack and create Real Implementation!!!
				if (MobileCheck() && CurrentUrlIsTicker()) {
					ReadedNewsArray = ReadedNewsArray.map((element) => 	element.includes("-") ? "/" + element.substring(element.lastIndexOf("-") - 4).replace("-", "/") : element);
					SeenNewsArray = SeenNewsArray.map((element) => 		element.includes("-") ? "/" + element.substring(element.lastIndexOf("-") - 4).replace("-", "/") : element);
					ToReadNewsArray = ToReadNewsArray.map((element) => 	element.includes("-") ? "/" + element.substring(element.lastIndexOf("-") - 4).replace("-", "/") : element);
				}

				if (TabNoc.Variables.Debug === true) {
					console.log(force === true, TabNoc.Variables.lastCheckItemCount !== elements.length);
				}

				execTime(checkElements, ReadedNewsArray.reverse(), elements, ToggleState, SeenNewsArray.reverse(), ToReadNewsArray.reverse());

				TabNoc.Variables.lastCheckItemCount = elements.length;
			}
		}
		else {
			TabNoc.Variables.WasHidden = true;
		}
	}

	function checkElements(ReadedNewsArray, elements, ToggleState, SeenNewsArray, ToReadNewsArray) {
		let UnScannedElements = 0;
		let UnknownElements = 0;
		Feedback.showProgress(0, "Initialised Scan");

		if (ToggleState == null) {
			ToggleState = TabNoc.Variables.MarkToggleState;
		}

		for (var i = 0; i < elements.length; i++) {
			Feedback.showProgress(i / elements.length * 100, "Analysing Element " + i + " from " + elements.length);
			var element = elements[i];

			if (TabNoc.Settings.CheckCurrentElementFunction(element) == true) {
				UnScannedElements = checkElement(element, ReadedNewsArray, ToggleState, SeenNewsArray, ToReadNewsArray) == true ? UnScannedElements : UnScannedElements + 1;
			} else {
				console.error("CheckCurrentElementFunction: Folgendes Element entspricht nicht den Vorgaben", element);
				UnknownElements++;
			}
		}
		TabNoc.Variables.MarkToggleState = ToggleState;

		let markedElementsMessage = (elements.length - UnScannedElements - UnknownElements) + " von " + (elements.length - UnknownElements) + " " + TabNoc.Settings.NameOfElements + " markiert";
		if (UnknownElements > 0) {
			markedElementsMessage += " (" + UnknownElements + " unbekannte " + (UnknownElements > 1 ? TabNoc.Settings.NameOfElements : TabNoc.Settings.NameOfElement) + ")";
			console.error("Es wurden " + UnknownElements + " unspezifizierte Elemente gefunden");
		}
		Feedback.showProgress(100, markedElementsMessage, 3000);
		console.log((elements.length - UnScannedElements) + " Marked Elements | " + UnScannedElements + " UnMarked Elements | Total " + elements.length + " Elements (" + ReadedNewsArray.length + " " + TabNoc.Settings.NameOfElements + " readed, " + ToReadNewsArray.length + " " + TabNoc.Settings.NameOfElements + " to read, " + SeenNewsArray.length + " " + TabNoc.Settings.NameOfElements + " marked)");

		if (TabNoc.Settings.HideAlreadyWatchedNews === false) {
			Feedback.notify(markedElementsMessage, 10000, function(){TabNoc.Settings.HideAlreadyWatchedNews = !TabNoc.Settings.HideAlreadyWatchedNews; startCheckElements(true, true); Feedback.hideMessage();});
		}
	}

	function checkElement(checkElement, ReadedNewsArray, ToggleState, SeenNewsArray, ToReadNewsArray) {
		//return true if checkedElement is already Scanned
		var SearchString = TabNoc.Settings.GetIDFunction(checkElement);

		let ReadedID = ReadedNewsArray.indexOf(SearchString);
		let SeenID = SeenNewsArray.indexOf(SearchString);
		let ToReadID = ToReadNewsArray.indexOf(SearchString);

		if (ToggleState === true) {
			$(checkElement).addClass("MyPageElement");
			if (ReadedID !== -1) {
				$(checkElement).addClass("MyMarkedReadedElement").removeClass("MyMarkedSeenElement").removeClass("MyMarkedToReadElement").find(".MyScanButton,.MyReadButton").remove();
				if (TabNoc.Settings.HideAlreadyWatchedNews === true) {
					$(TabNoc.Settings.GetHidingNode(checkElement)).hide();
				}
				else {
					$(TabNoc.Settings.GetHidingNode(checkElement)).show();
				}
				return true;
			}
			else if (SeenID !== -1) {
				$(checkElement).removeClass("MyMarkedReadedElement").addClass("MyMarkedSeenElement").removeClass("MyMarkedToReadElement").find(".MyScanButton").remove();
				if (TabNoc.Settings.HideAlreadyWatchedNews === true) {
					$(TabNoc.Settings.GetHidingNode(checkElement)).hide();
				}
				else {
					$(TabNoc.Settings.GetHidingNode(checkElement)).show();
				}
				return true;
			}
			else if (ToReadID !== -1) {
				$(checkElement).removeClass("MyMarkedReadedElement").removeClass("MyMarkedSeenElement").addClass("MyMarkedToReadElement").find(".MyScanButton,.MyReadButton").remove();
				if (TabNoc.Settings.HideAlreadyWatchedNews === true) {
					$(TabNoc.Settings.GetHidingNode(checkElement)).hide();
				}
				else {
					$(TabNoc.Settings.GetHidingNode(checkElement)).show();
				}
				return true;
			}
			else {
				$(checkElement).removeClass("MyMarkedReadedElement").removeClass("MyMarkedSeenElement").removeClass("MyToReadElement").show();
			}
		}
		else {
			$(checkElement).removeClass("MyMarkedReadedElement").removeClass("MyMarkedSeenElement").removeClass("MyToReadElement").removeClass("MyPageElement").show().find(".MyScanButton,.MyReadButton").remove();
		}

		if ($(checkElement).find(".MyScanButton").length === 0 &&
			$(checkElement).find(".MyMarkedReadedElement").length === 0 &&
			$(checkElement).find(".MyOpenTabButton").length === 0 &&
			$(checkElement).find(".MyReadButton").length === 0 &&
			$(checkElement).find(".MyMarkedSeenElement").length === 0) {
			let ScanButton = $(TabNoc.HTML.ScanButton);
			ScanButton.click(function(){getAllElements(SearchString, SearchString);});
			$(checkElement).append(ScanButton);

			if (MobileCheck() === false) {
				let ReadButton = $(TabNoc.HTML.ReadButton);
				ReadButton.click(function(){if (confirm("Soll dieser Eintrag wirklich ohne zu öffnen auf ToRead gesetz werden?") == true) getAllElements(SearchString, SearchString, true);});
				$(checkElement).append(ReadButton);
			}
			if (TabNoc.Settings.ShowOpenInNewTabButton == true && MobileCheck() === false) {
				let OpenTabButton = $(TabNoc.HTML.OpenTabButton);
				OpenTabButton.click(function(){GM_openInTab(SearchString, {active: false, loadInBackground: true, insert: true, setParent: true});});
				$(checkElement).append(OpenTabButton);
			}
		}
		return false;
	}

	function getAllElements(from, till, asToRead) {
		try {
			var start = new Date().getTime();

			// ### ReadedNewsArray ###
			var ReadedNewsArray = GetData("ReadedNewsArray", "([])", true);
			// ### SeenNewsArray ###
			var SeenNewsArray = GetData("SeenNewsArray", "([])", true);
			// ### ToReadNewsArray ###
			var ToReadNewsArray = GetData("ToReadNewsArray", "([])", true);
			// ### DeletedNewsArray ###
			var DeletedNewsArray = GetData("DeletedNewsArray", "([])", true);

			var elements = $(TabNoc.Settings.ElementsSearchString);

			var fromIndex = from == null ? 0 : elements.toArray().findIndex(function (element) { try {return TabNoc.Settings.GetIDFunction(element) == from;} catch(exc) {console.error("getAllElements: getFromIndex", exc); return false;}});
			if (fromIndex == -1) throw "from(" + from + ") were not found";

			var tillIndex = till == null ? elements.length : (elements.toArray().findIndex(function (element) { try {return TabNoc.Settings.GetIDFunction(element) == till;} catch(exc) {console.error("getAllElements: getTillIndex", exc); return false;}}) + 1);
			if (tillIndex == -1) throw "till(" + till + ") were not found";
			// tillIndex > elements.length ? elements.length : tillIndex;

			for (var i = fromIndex; i < tillIndex; i++) {
				var element = elements[i];
				var currentElementId = TabNoc.Settings.GetIDFunction(element);

				if (TabNoc.Settings.CheckCurrentElementFunction(element) == true) {
					if (DeletedNewsArray.indexOf(currentElementId) === -1) {
						if (asToRead == true) {
							if (ReadedNewsArray.indexOf(currentElementId) == -1 && ToReadNewsArray.indexOf(currentElementId) == -1) {
								ToReadNewsArray.push(currentElementId);
								if (SeenNewsArray.indexOf(currentElementId) != -1) {
									SeenNewsArray.splice(SeenNewsArray.indexOf(currentElementId), 1);
								}
							}
						} else {
							if (SeenNewsArray.indexOf(currentElementId) == -1 && ReadedNewsArray.indexOf(currentElementId) == -1 && ToReadNewsArray.indexOf(currentElementId) == -1) {
								SeenNewsArray.push(currentElementId);
							}
						}
					}
				} else {
					console.error("CheckCurrentElementFunction: Folgendes Element entspricht nicht den Vorgaben", element);
				}
			}
			GM_Lock();
			SetData("SeenNewsArray", JSON.stringify(SeenNewsArray), true);
			SetData("ToReadNewsArray", JSON.stringify(ToReadNewsArray), true);
			GM_Unlock();

			if (TabNoc.Settings.MarkAfterScan) {
				startCheckElements(true);
			}

			var time = new Date().getTime() - start;
			console.log('getAllElements() Execution time: ' + time);
		}
		catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}

	// ### http*://www.golem.de ###

	// ### http*://www.golem.de/news/* ###
	function NewsPageLoader(){
		console.log(GM_info.script.name + ".user.js loading");
		try {
			OpenNewspage();

			GM_registerMenuCommand("Löschen", function () {
				ReadingNewspage(true);
			});

			$(window).on('beforeunload', function(e){
				if (TabNoc.Variables.promptOnClose === true) {
					console.log("on beforeunload()");
					e.returnValue = 'Die Seite wurde nicht als gelsesen markiert, fortfahren?';
					return 'Die Seite wurde nicht als gelsesen markiert, fortfahren?';
				}
			});

			// ## ScanWithKeyPress ##
			if (TabNoc.Settings.ScanWithKeyPressEnabled === true) {
				$(document).on("keydown", event => {
					let finished = false;
					let KeyPressActivated = TabNoc.Variables.ScanWithKeyPressActiveTimeout > new Date() && TabNoc.Variables.WasHidden == false;
					if (event.keyCode == 160) {
						if (KeyPressActivated == false) {
							if (confirm("Soll die Bearbeitung durch ScanWithKeyPress aktiviert werden?") == true) {
								TabNoc.Variables.WasHidden = false;
								finished = true;
								KeyPressActivated = true;
							}
							event.preventDefault();
						}
						if (KeyPressActivated && TabNoc.Variables.PageReaded == false && confirm("Soll die Seite als Gelesen markiert werden?") == true) {
							ReadingNewspage();
							finished = true;
						}
					}
					else if (PageLoaderKeyListener(KeyPressActivated, event)) {
						finished = true;
					}
					else if (event.key == "<" ) {
						window.scroll({
						  top: window.scrollY + (19 * 3) * 3,
						  behavior: "smooth"
						});
					}
					else if (event.key == ">" ) {
						window.scroll({
						  top: window.scrollY - (19 * 3) * 3,
						  behavior: "smooth"
						});
					}
					if (finished == true) {
						event.preventDefault();
						TabNoc.Variables.ScanWithKeyPressActiveTimeout = new Date(new Date().getTime() + 600000);
					}
				});
			}
			// ## ScanWithKeyPress ##

			console.log(GM_info.script.name + ".user.js done");
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}

	function OpenNewspage(){
		try {
			// ### ReadedNewsArray ###
			var ReadedNewsArray = GetData("ReadedNewsArray", "([])", true);
			// ### SeenNewsArray ###
			var SeenNewsArray = GetData("SeenNewsArray", "([])", true);
			// ### ToReadNewsArray ###
			var ToReadNewsArray = GetData("ToReadNewsArray", "([])", true);
			// ### DeletedNewsArray ###
			var DeletedNewsArray = GetData("DeletedNewsArray", "([])", true);

			GM_Lock();

			var currentID = TabNoc.Settings.GetCurrentSiteIDFunction();

			if (SeenNewsArray.indexOf(currentID) !== -1) {
				SeenNewsArray.splice(SeenNewsArray.indexOf(currentID), 1);
				SetData("SeenNewsArray", JSON.stringify(SeenNewsArray), true);
				console.info("OpenNewspage: " + TabNoc.Settings.NameOfElement + " removed from SeenNewsArray");
			}

			if (ToReadNewsArray.indexOf(currentID) === -1 && ReadedNewsArray.indexOf(currentID) === -1 && DeletedNewsArray.indexOf(currentID) === -1) {
				ToReadNewsArray.push(currentID);
				SetData("ToReadNewsArray", JSON.stringify(ToReadNewsArray), true);
				console.info("OpenNewspage: " + TabNoc.Settings.NameOfElement + " added to ToReadNewsArray");
			}

			if (DeletedNewsArray.indexOf(currentID) !== -1) {
				setTimeout(function(){alert("deleted!");}, 100);
				console.info("OpenNewspage: " + TabNoc.Settings.NameOfElement + " already deleted!");
				TabNoc.Variables.promptOnClose = false;
				TabNoc.Variables.PageReaded = true;
			}
			else if (ReadedNewsArray.indexOf(currentID) !== -1) {
				setTimeout(function(){alert("readed");}, 100);
				console.info("OpenNewspage: " + TabNoc.Settings.NameOfElement + " already readed!");
				TabNoc.Variables.promptOnClose = false;
				TabNoc.Variables.PageReaded = true;
			}
			else {
				$("body").append('<div id="reading" style="position: fixed;top: 20px;right: 20px;">Gelesen</div>');
				$("#reading").button().on("click", (function(){ReadingNewspage();}));
				console.info("OpenNewspage: " + TabNoc.Settings.NameOfElement + " not readed!");
			}

			// CloseTab
			if (ToReadNewsArray.indexOf(currentID) !== -1 && GetData("CloseToReadNewsPage", false, false) === true) {
				window.open('', '_self').close();
				alert("If you can see this you have to set 'dom.allow_scripts_to_close_windows' to 'true' in about:config.");
			}
			GM_Unlock();
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}

	function ReadingNewspage(deleteEntry){
		try {
			if (deleteEntry !== true) deleteEntry = false;

			var currentID = TabNoc.Settings.GetCurrentSiteIDFunction();

			// ### ReadedNewsArray ###
			var ReadedNewsArray = GetData("ReadedNewsArray", "([])", true);
			// ### SeenNewsArray ###
			var SeenNewsArray = GetData("SeenNewsArray", "([])", true);
			// ### ToReadNewsArray ###
			var ToReadNewsArray = GetData("ToReadNewsArray", "([])", true);
			// ### DeletedNewsArray ###
			var DeletedNewsArray = GetData("DeletedNewsArray", "([])", true);

			GM_Lock();

			if (deleteEntry === true) {
				if (ToReadNewsArray.indexOf(currentID) !== -1) {
					ToReadNewsArray.splice(ToReadNewsArray.indexOf(currentID), 1);
					SetData("ToReadNewsArray", JSON.stringify(ToReadNewsArray), true);
					console.info("ReadingNewspage: " + TabNoc.Settings.NameOfElement + " removed from ToReadNewspage");
				}

				if (ReadedNewsArray.indexOf(currentID) !== -1) {
					ReadedNewsArray.splice(SeenNewsArray.indexOf(currentID), 1);
					SetData("ReadedNewsArray", JSON.stringify(ReadedNewsArray), true);
					console.info("ReadingNewspage: " + TabNoc.Settings.NameOfElement + " removed from ReadedNewsArray!!!");
				}

				if (DeletedNewsArray.indexOf(currentID) === -1) {
					DeletedNewsArray.push(currentID);
					SetData("DeletedNewsArray", JSON.stringify(DeletedNewsArray), true);
					console.info("ReadingNewspage: " + TabNoc.Settings.NameOfElement + " added to DeletedNewsArray!!!");
				}
				TabNoc.Variables.promptOnClose = false;
				TabNoc.Variables.PageReaded = true;

				$("#reading").remove();
			}
			else {
				if (SeenNewsArray.indexOf(currentID) !== -1) {
					SeenNewsArray.splice(SeenNewsArray.indexOf(currentID), 1);
					SetData("SeenNewsArray", JSON.stringify(SeenNewsArray), true);
					console.info("ReadingNewspage: " + TabNoc.Settings.NameOfElement + " removed from SeenNewsArray");
				}

				if (ToReadNewsArray.indexOf(currentID) !== -1) {
					ToReadNewsArray.splice(ToReadNewsArray.indexOf(currentID), 1);
					SetData("ToReadNewsArray", JSON.stringify(ToReadNewsArray), true);
					console.info("ReadingNewspage: " + TabNoc.Settings.NameOfElement + " removed from ToReadNewspage");
				}

				if (ReadedNewsArray.indexOf(currentID) === -1 && DeletedNewsArray.indexOf(currentID) === -1) {
					ReadedNewsArray.push(currentID);
					SetData("ReadedNewsArray", JSON.stringify(ReadedNewsArray), true);
					console.info("ReadingNewspage: " + TabNoc.Settings.NameOfElement + " added to ReadedNewsArray");

					$("#reading").remove();
					TabNoc.Variables.promptOnClose = false;
					TabNoc.Variables.PageReaded = true;
				}
				else {
					setTimeout(function(){alert("readed");}, 100);
					console.info("ReadingNewspage: " + TabNoc.Settings.NameOfElement + " already readed!");
					TabNoc.Variables.promptOnClose = false;
					TabNoc.Variables.PageReaded = true;
					$("#reading").remove();
				}
			}
			GM_Unlock();
			ReadingNewspageFinishAction();
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	// ### http*://www.golem.de/news/* ###

	// TODO: removeScriptName
	function Syncronisieren(scriptName) {
		var onAbort = (function (response) {
			console.log("onabort");
			console.info(response);
		});

		var onError = (function (msg) {
			return (function (response) {
				console.log("onerror");
				console.info(response);
				alert(msg);
				Feedback.hideProgress();
			});
		});

		var onTimeout = (function (response) {
			console.log("ontimeout");
			console.info(response);
		});

		var onLoadPost = returnExec(function (response) {
				if (response.status !== 200) {
					console.error(response);
					alert("Statuscode:" + response.status);
					Feedback.showProgress(100, "Senden der Daten fehlgeschlagen");
					return;
				}
				if (response.responseText.charAt(0) === '#') {
					console.error(response);
					alert("Bei der Abfrage ist ein Fehler aufgetreten:" + response.responseText);
					Feedback.showProgress(100, "Senden der Daten fehlgeschlagen");
					return;
				}
				Feedback.showProgress(100, "Senden der Daten erfolgreich abgeschlossen");
				alert("Die Syncronisierung der Daten mit dem Server wurde erfolgreich abgeschlossen.\r\nAktueller Versionsstand: " + response.responseText);
			});

		var onLoadGet = returnExec(function (response) {
				console.error(response);
				Feedback.showProgress(40, "Servernachricht auswerten");
				var error = false;
				if (response.status !== 200) {
					console.error(response);
					alert("Statuscode:" + response.status);
					Feedback.showProgress(100, "Abgebrochen, es konnten keine Daten empfangen werden");
					return;
				}
				if (response.responseText.charAt(0) === '#') {
					console.error(response);
					var errorCode = response.responseText.split("\r\n")[0].substring(1);
					if (errorCode === "2") {
						error = true;
					} else {
						alert("Bei der Abfrage ist ein Fehler aufgetreten:" + response.responseText);
						Feedback.showProgress(100, "Abgebrochen, Fehler auf dem Server");
						return;
					}
				}
				Feedback.showProgress(50, "Empfangene Daten migrieren");
				if (!error) {
					var responseData = JSON.parse(response.responseText);
					console.info("Server response Data:", responseData);
					if (responseData.ReadedNewsArray != null && responseData.SeenNewsArray != null) {
						Feedback.lockProgress();
						ImportData(responseData, ([{
									Name: "ReadedNewsArray",
									defaultVersion: 0,
									defaultValue: "([])",
									ImportAction: function (dataStorage, currentEntry, importElement) {
										if (dataStorage[currentEntry.Name].indexOf(importElement) == -1) {
											dataStorage[currentEntry.Name].push(importElement);
										}
									}
								}, {
									Name: "ToReadNewsArray",
									defaultVersion: 0,
									defaultValue: "([])",
									ImportAction: function (dataStorage, currentEntry, importElement) {
										if (dataStorage.ReadedNewsArray.indexOf(importElement) == -1 && dataStorage.DeletedNewsArray.indexOf(importElement) == -1) {
											if (dataStorage[currentEntry.Name].indexOf(importElement) == -1) {
												dataStorage[currentEntry.Name].push(importElement);
											}
										}
									}
								}, {
									Name: "SeenNewsArray",
									defaultVersion: 0,
									defaultValue: "([])",
									ImportAction: function (dataStorage, currentEntry, importElement) {
										if (dataStorage.ReadedNewsArray.indexOf(importElement) == -1 && dataStorage.ToReadNewsArray.indexOf(importElement) == -1) {
											if (dataStorage[currentEntry.Name].indexOf(importElement) == -1) {
												dataStorage[currentEntry.Name].push(importElement);
											}
										}
									}
								}, {
									Name: "DeletedNewsArray",
									defaultVersion: 0,
									defaultValue: "([])",
									ImportAction: function (dataStorage, currentEntry, importElement) {
										if (dataStorage.DeletedNewsArray.indexOf(importElement) == -1) {
											if (dataStorage[currentEntry.Name].indexOf(importElement) == -1) {
												dataStorage[currentEntry.Name].push(importElement);
											}
										}
									}
								}
												  ]));
						Feedback.unlockProgress();
					} else {
						alert("Der Wert des Response des Servers war ungültig!");
					}
				}
				if (confirm("Sollen die aktuellen Daten auf dem Server gespeichert werden?") === false) {
					Feedback.showProgress(100, "Senden der Daten abgebrochen");
					return;
				}
				Feedback.showProgress(75, "Neue Daten auf dem Server speichern");

				var element = ({});
				element.ReadedNewsArray = JSON.parse(GM_getValue("ReadedNewsArray") || "([])");
				element.SeenNewsArray = JSON.parse(GM_getValue("SeenNewsArray") || "([])");
				element.ToReadNewsArray = JSON.parse(GM_getValue("ToReadNewsArray") || "([])");
				element.DeletedNewsArray = JSON.parse(GM_getValue("DeletedNewsArray") || "([])");
				element["ReadedNewsArray-Version"] = GetData("ReadedNewsArray-Version", 0, true);
				element["SeenNewsArray-Version"] = GetData("SeenNewsArray-Version", 0, true);
				element["ToReadNewsArray-Version"] = GetData("ToReadNewsArray-Version", 0, true);
				element["DeletedNewsArray-Version"] = GetData("DeletedNewsArray-Version", 0, true);
				GM_xmlhttpRequest({
					data: JSON.stringify({
						Token: Token,
						data: JSON.stringify(element)
					}),
					method: "POST",
					headers: {
						"Content-Type": "application/json"
					},
					onabort: onAbort,
					onerror: onError("Sending New Data Failed"),
					onload: onLoadPost,
					ontimeout: onTimeout,
					timeout: 60000,
					url: "https://tabnoc.gear.host/MyDataFiles//Input"
				});
			});

		Feedback.showProgress(10, "Token erfassen");
		var Token = prompt("Bitte Token eingeben") + scriptName;
		Feedback.showProgress(20, "Request starten");
		GM_xmlhttpRequest({
			data: JSON.stringify({
				Token: Token
			}),
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			onabort: onAbort,
			onerror: onError("Receving Server Data Failed"),
			onload: onLoadGet,
			ontimeout: onTimeout,
			timeout: 60000,
			url: "https://tabnoc.gear.host/MyDataFiles//Output"
		});
		Feedback.showProgress(30, "Warte auf Rückmeldung vom Server");
	}

	function ModuleImport(moduleName, moduleFunction, expectedVersion) {
		let currentVersion = moduleFunction().Version;
		let versionCompareResult = versionCompare(currentVersion, expectedVersion);
		var versionData = GetData("ImportVersion", "({show: true})", true);
		versionData[moduleName] = versionData[moduleName] || ({});
		if (versionData.show == true && versionData[moduleName].Version != currentVersion && versionData[moduleName].Version != undefined) {
			alert ("Das Modul " + moduleName + " wurde von Version " + versionData[moduleName].Version + " auf Version " + currentVersion + " aktualisiert (Die erwartete Version ist " + expectedVersion + ")");
		}

		if (versionCompareResult != 0) {
			var msg = "Das geladene " + moduleName + " Modul ist " + (versionCompareResult < 0 ? "älter" : "neuer") + " als die konfigurierte Version";
			msg += "\r\nDie erwartete Version ist: " + expectedVersion + " gegeben ist: " + currentVersion;
			if (versionData[moduleName].skipNotification !== currentVersion && !confirm(msg + "\r\n\r\nSoll diese Meldung für diese Version des Moduls weiterhin angezeigt werden?")) {
				versionData[moduleName].skipNotification = currentVersion;
			}
			console.info(msg);
		}
		versionData[moduleName].Version = currentVersion;
		SetData("ImportVersion", JSON.stringify(versionData), true);
	}

	function Main() {
		ModuleImport("States", getStatesVersion, "1.2.8");
		ModuleImport("TabNoc_GM", getTabNoc_GMVersion, "2.0.2");
		ModuleImport("TabNoc", getTabNocVersion, "1.2.2");
		ModuleImport("ImportAll", getImportAllVersion, "1.1.2");

		var count = 0;
		while (GM_Locked() == true) {
			count = count + 1;
			alert("Der Aktuelle Sperrzustand der Datenbank ist positiv, dies wird durch Fehlermeldungen während der Ausführung ausgelöst oder ist nur eine kurzweilige erscheinung. \r\n\r\n Bitte Meldung bestätigen!");
			if (count >= 2) {
				if (confirm("Soll der Sperrzustand der Datenbank aufgehoben werden [empfohlen]?") === true ) {
					GM_Unlock(true);
				}
			}
		}

		GM_addStyle(GM_getResourceText("JqueryUI"));
		UpdateDataBase();

		GM_addStyle(GM_getResourceText("MyCss"));
		GM_addStyle(GM_getResourceText("JDiffAnno"));
		GM_addStyle(GM_getResourceText("JDiffHtml"));

		if (Distribute() == false) {
			alert(GM_info.script.name + ".user.js:Main()->No LoadObject found!");
			console.info("No LoadObject found!");
		}
	}

	if (false) {
/* 		var Feedback = Feedback || null;
		var GM_Unlock = GM_Unlock || null;
		var GM_Locked = GM_Locked || null;
		var SetData = SetData || null;
		var GetData = GetData || null;
		var versionCompare = versionCompare || null;
		var ImportData = ImportData || null;
		var $ = $ || null;
		var returnExec = returnExec || null;
		var TabNoc = TabNoc || null;
		var GM_Lock = GM_Lock || null;
		var setTabNoc = setTabNoc || null;
		var exportFunction = exportFunction || null;
		var CreateHistoryDialog = CreateHistoryDialog || null;
		var execTime = execTime || null; */
	}

	$(Main());

	console.info(GM_info.script.name + ".user.js [v" + GM_info.script.version + ", Autoupdate: " + GM_info.scriptWillUpdate + "] readed");
} catch (exc) {
	console.error(exc);
	alert(exc);
}
