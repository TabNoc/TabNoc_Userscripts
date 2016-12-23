// ==UserScript==
// @name        Golem.de Ad-Remover + Spritz
// @namespace   TabNoc
// @description Remove Golem.de Ads and append Spritz Reader
// @version     1.1.0
// @include     http*://www.golem.de/news/*
// @include     http*://video.golem.de/*
// @require		http://code.jquery.com/jquery-2.1.1.min.js
// @noframes
// ==/UserScript==

try {
	this.$ = this.jQuery = jQuery.noConflict(true);

	unsafeWindow.TabNoc = {
		EnableDarkTheme : true,
		DarkerThemeBackgroundColor : "#7A7A7A",
		ApplyDarkThemeAfterSpritz : true,

		RemoveCommentPosition : true,
		RemoveGolemServices : true,
	}

	//befehle	document.getElementById("header").appendChild(document.getElementById("list-jtoc"))
	//style		style="display: block;margin-right:-200px;margin-top:40px;border-width:1px;border-style:solid;border-color:blue;padding:2.5px;"
	//http://sdk.spritzinc.com/js/1.2/bookmarklet/index.html
	unsafeWindow.spritz_loader = function () {
		function loadScript() {
			var script = document.createElement('script');
			script.setAttribute('type', 'text/javascript');
			script.setAttribute('charset', 'UTF-8');
			script.setAttribute('async', 'true');
			script.setAttribute('src', 'https://sdk.spritzinc.com/js/1.2/bookmarklet/js/SpritzletOuter.js?' + (new Date().getTime()).toString().substring(0, 7));
			document.documentElement.appendChild(script);
			script.onload = script.onreadystatechange = function () {
				var rs = script.readyState;
				if (!rs || rs === 'loaded' || rs === 'complete') {
					script.onload = script.onreadystatechange = null;
					Spritzlet.init();
				}
			};
		}
		if (window.Spritzlet) {
			Spritzlet.activate();
		} else {
			window.Spritzlet = window.Spritzlet || {};
			window.Spritzlet = {
				origin : window.location.protocol + '//' + window.location.host,
				loaderVersion : 1.0
			};
			loadScript();
		}
	};

	if (document.getElementById("list-jtoc")) {
		document.getElementById("header").appendChild(document.getElementById("list-jtoc"));
		document.getElementById("list-jtoc").setAttribute("style", "display: block;margin-right:-200px;margin-top:40px;border-width:1px;border-style:solid;border-color:blue;padding:2.5px;")
	}

	var header = document.getElementById("header");

	var spritzGolemImg = document.createElement("img");
	spritzGolemImg.setAttribute("ID", "spritzing_golem");
	spritzGolemImg.setAttribute("src", "http://www.spritzinc.com/wp-content/themes/spritz/assets/img/powered_by_spritz_reticle.png");
	spritzGolemImg.setAttribute("style", "margin-right:-200px;border-width:1px;border-style:solid;border-color:blue;padding:2.5px;cursor:pointer");
	spritzGolemImg.setAttribute("align", "right");

	spritzGolemImg.setAttribute("onclick", 'spritzGolemImg_click()');

	header.insertBefore(spritzGolemImg, location.firstChild);

	unsafeWindow.spritzGolemImg_click = function () {
		// überschriften anpassen
		$(".formatted,.paged-cluster-header").children(":header").text(function (index, value) {
			return ". >>> " + value + " <<<.";
		})

		var spritzGolemImg = document.getElementById("spritzing_golem");
		spritzGolemImg.parentNode.removeChild(spritzGolemImg);

		spritz_loader();

		ApplyDarkTheme();

		var lastMessage = "";
		function MyKeyEvent(e) {
			try{
				var currentMessage = "TabNoc:" + e.type + ";" + e.keyCode;
				if (currentMessage != lastMessage) {
					// $("[src='https://sdk.spritzinc.com/js/1.2/bookmarklet/html/spritzlet.html?1.1.2']")[0].contentWindow.postMessage(currentMessage, "*"); //"http://www.golem.de");//"https://sdk.spritzinc.com");
					//TODO: adjust src link, possibly outdated and adjust spritz script
					$("[src='https://sdk.spritzinc.com/bookmarklet/latest/js/SpritzletOuter.js']")[0].contentWindow.postMessage(currentMessage, "*"); //"http://www.golem.de");//"https://sdk.spritzinc.com");
					lastMessage = currentMessage;
				}
			}
			catch(exc) {
				console.log(exc);
				alert(exc)
			}
		}

		$(document).keydown(MyKeyEvent);
		$(document).keyup(MyKeyEvent);
	}

	//apply Dark Theme
	unsafeWindow.ApplyDarkTheme = function () {
		if (TabNoc.EnableDarkTheme == true) {
			var style = "background-color:" + TabNoc.DarkerThemeBackgroundColor;
			var headerStyle = "border-left-color:" + TabNoc.DarkerThemeBackgroundColor + ";border-right-color:" + TabNoc.DarkerThemeBackgroundColor;
			var supperbannerStyle = style + ";border-bottom-color:" + TabNoc.DarkerThemeBackgroundColor;

			//Header Seitlich
			document.getElementById("header").setAttribute("style", headerStyle);
			//Header oben
			document.getElementById("superbanner").setAttribute("style", supperbannerStyle);
			//äußere umrandung
			document.getElementsByClassName("golemContentToHide")[0].setAttribute("style", style);
			//innere umrandung
			document.getElementById("screen").setAttribute("style", style);
			//Kommentare
			document.getElementById("comments").setAttribute("style", style);
			//artikel
			document.getElementsByClassName("g g4 g-ie6")[0].setAttribute("style", style);
		}
	}

	if (TabNoc.ApplyDarkThemeAfterSpritz == false) {
		ApplyDarkTheme();
	}

	function registerTabNoc() {
		unsafeWindow.TabNoc = cloneInto(TabNoc, unsafeWindow, {
				wrapReflectors : true
			});
	}

	function DisableVideoAds() {
		try {
			var allFlashvars = $("[name=flashvars]");
			for (var i = 0; i < allFlashvars.length; i++) {
				var flashvars = allFlashvars[i];
				console.log("Video found. ID: " + flashvars.parantNode + (flashvars != null ? ". Flashvars found" : ". Flashvars not found"));

				if (flashvars != null && flashvars.getAttribute("value").contains("homadglobal")) {
					flashvars.setAttribute("value", flashvars.getAttribute("value").split("&homadglobal=")[0] + "&suffix=" + flashvars.getAttribute("value").split("&suffix=")[1]);
					console.log("Video ads removed");
					$(flashvars).parent().parent().parent().children("div>p.text1").css("background-color", "green")
				} else {
					console.log("Video ads not removed");
				}
			}

			// von    &homadglobal=  bis  &suffix= auftrennen
		} catch (exc) {
			console.error(exc);
		}
	}

	function RemoveGolemAds() {
		try {
			// Golem Plus
			$($("[src='http://www.golem.de/microsite/abo/minibanner_flat_620.shtml']")[0].parentNode).remove();
			// $($("[src='http://www.golem.de/microsite/abo/desktop-medrec-art.html']")[0].parentNode).remove();

			// Big header Banner
			setTimeout(function(){$("#screen").children()[0].remove();}, 5000);
			
			// Side Ad Banner Header
			element = $("#iqadtile8").remove();
			
			// golem-promo side Information Ad
			$("#abo-clip").remove();

			// Content Ad Banner Header + PlaceHolder
			$($("#iqadtile4")[0].parentNode).remove();

			// "Folgen Sie uns" - Side
			$("#followrss").remove();

			// Content Social Sites (double with Side)
			$(".social-bar.social-bottom").remove();

			// Side Newsletter
			$("#newsletter").remove();

			//disable video ads
			$("article>div>p.text1").css("background-color", "red");
			DisableVideoAds();

			// from: golemAcceptCookies()
			var el = document.getElementById("golem-cookie-accept"),
			elF = document.getElementById('footer');
			el.style.display = 'none';
			el.style.visibility = 'hidden';
			elF.style['margin-bottom'] = 0;
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}

	function OtherImprovments() {
		// Comments
		if (unsafeWindow.TabNoc.RemoveCommentPosition === true) {
			$("#comments>div>.dh2").each(function (id, obj) {
				obj.children[0].setAttribute("href", obj.children[0].getAttribute("href").split("#")[0]);
			})
		}

		// Golem Services Header Line(Services: Preisvergleich, Stellenmarkt, Top-Angebote), Abo Login

		if (unsafeWindow.TabNoc.RemoveGolemServices === true) {
			$("#gservices").remove();
		}
	}

	function Main() {
		try {
			console.log("Spritzing_golem.de.user.js loading");

			// registerTabNoc();

			setTimeout(RemoveGolemAds, 500);

			OtherImprovments();

			console.log("Spritzing_golem.de.user.js done");
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}

	$(Main);
	console.log("Spritzing_golem.de.user.js readed");

} catch (exc) {
	console.error(exc);
}
