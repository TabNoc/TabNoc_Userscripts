function getImageHoverVersion(){
	return "v1.1.0-14102016";
}

try {
	var TabNoc_ImageHover = ({});
	
	function checkAndLoadConfig(Config) {
		if (Config == null) {
			throw "Config is missing";
			return false;
		}
		if (Config.ShiftKeyShowsImageFullSize == null || typeof(Config.ShiftKeyShowsImageFullSize) != "boolean") {
			throw "Element Config.ShiftKeyShowsImageFullSize is wrong";
			return false;
		}
		if (Config.CapsLockKeepsImageFullSize == null || typeof(Config.CapsLockKeepsImageFullSize) != "boolean") {
			throw "Element Config.CapsLockKeepsImageFullSize is wrong";
			return false;
		}
		if (Config.ClickOnFullSizeImageToClose == null || typeof(Config.ClickOnFullSizeImageToClose) != "boolean") {
			throw "Element Config.ClickOnFullSizeImageToClose is wrong";
			return false;
		}
		if (Config.PressStrgOrEscToCloseFullSizeImage == null || typeof(Config.PressStrgOrEscToCloseFullSizeImage) != "boolean") {
			throw "Element Config.PressStrgOrEscToCloseFullSizeImage is wrong";
			return false;
		}
		if (Config.WaitTimeAfterClickFullSizeImage == null || typeof(Config.WaitTimeAfterClickFullSizeImage) != "number") {
			throw "Element Config.WaitTimeAfterClickFullSizeImage is wrong";
			return false;
		}
		if (Config.HoverEventElements == null || typeof(Config.HoverEventElements) != "object") {
			throw "Element Config.HoverEventElements is wrong";
			return false;
		}
		if (Config.StartShiftState == null || typeof(Config.StartShiftState) != "boolean") {
			throw "Element Config.StartShiftState is wrong";
			return false;
		}
		for (let i = 0; i < Config.HoverEventElements; i++) {
			if (Config.HoverEventElements[i].condition == null) {
				throw "Element Config.HoverEventElements[" + i + "].condition is wrong";
				return false;
			}
			if (Config.HoverEventElements[i].element == null) {
				throw "Element Config.HoverEventElements[" + i + "].element is wrong";
				return false;
			}
			if (Config.HoverEventElements[i].getUserArgs == null) {
				throw "Element Config.HoverEventElements[" + i + "].getUserArgs is wrong";
				return false;
			}
		}
		
		var localTabNoc = ({
			Variables : {
				FullSizeImage : false,
				isShiftDown : false
			},
			Settings : {
				unmuteWebm : true,
				$ : {
					prettySeconds : (function (inputSeconds) {
						var minutes = Math.floor(inputSeconds / 60);
						var seconds = Math.round(inputSeconds - 60 * minutes);
						return [minutes, seconds];
					})
				},
				Config : Config
			}
		});
		TabNoc_ImageHover = localTabNoc;
		
		// unsafeWindow.tmpCloneInto = cloneInto(localTabNoc, unsafeWindow, {
			// wrapReflectors: true, cloneFunctions: true
		// });
		// TabNoc.Variables.ImageHover = unsafeWindow.tmpCloneInto;
		// console.log(TabNoc);
		
		// unsafeWindow.TabNoc_ImageHover --> TabNoc.Variables.ImageHover
		
		// TabNoc.Variables.ImageHover = cloneInto(localTabNoc, TabNoc.Variables, {
			// wrapReflectors: true, cloneFunctions: true
		// });
		// console.log(TabNoc);
		
		// unsafeWindow.TabNoc_ImageHover = cloneInto(localTabNoc, unsafeWindow, {
			// wrapReflectors: true, cloneFunctions: true
		// });
		// console.log(TabNoc);
		return true;
	}

	function AddImageHover(Config) {
		try {
			console.log("Loading ImageHover " + getImageHoverVersion() + " by TabNoc")
			if (!checkAndLoadConfig(Config)) {
				return;
			}
			console.log(TabNoc);
			TabNoc_ImageHover.Variables.isShiftDown = TabNoc_ImageHover.Settings.Config.StartShiftState;
			
			// Add Event Listener
			for (let i = 0; i < TabNoc_ImageHover.Settings.Config.HoverEventElements.length; i++) {
				if (TabNoc_ImageHover.Settings.Config.HoverEventElements[i].condition === true) {
					var index = i;
					// OnMouseOver Event
					TabNoc_ImageHover.Settings.Config.HoverEventElements[index].element.onmouseover = function (element) {
						try {
							var target = element.target;
							if (target && target.nodeName == "IMG" && !TabNoc.Variables.FullSizeImage) {
								if (TabNoc_ImageHover.Variables.isShiftDown) {
									TabNoc_ImageHover.Variables.FullSizeImage = true;
								}
								ImageHover.show(target, TabNoc_ImageHover.Settings.Config.HoverEventElements[index].getUserArgs(target));
							}
						} catch (exc) {
							console.error(exc);
							alert("ImageHover.js->TabNoc_ImageHover.Settings.Config.HoverEventElements[index:" + index + "].element.onmouseover()\r\n" + exc);
						}
					}
					// OnMouseOut Event
					TabNoc_ImageHover.Settings.Config.HoverEventElements[index].element.onmouseout = function (element) {
						var target = element.target;
						if (target && target.nodeName == "IMG" && !TabNoc_ImageHover.Variables.FullSizeImage) {
							ImageHover.hide();
						}
					}
				}
			}

			if (TabNoc_ImageHover.Settings.Config.ShiftKeyShowsImageFullSize) {
				document.body.onkeydown = function (e) {
					try {
						if (e.keyCode === 16 || (TabNoc_ImageHover.Settings.Config.CapsLockKeepsImageFullSize && e.keyCode === 20)) {
							TabNoc_ImageHover.Variables.isShiftDown = true;
						} else if (TabNoc_ImageHover.Settings.Config.PressStrgOrEscToCloseFullSizeImage && (e.keyCode === 27 || e.keyCode === 17)) {
							ImageHover.hide();
							setTimeout(function () {
								TabNoc_ImageHover.Variables.FullSizeImage = false;
							}, TabNoc_ImageHover.Settings.Config.WaitTimeAfterClickFullSizeImage);
						}
					}
					catch (exc) {
						console.error(exc);
						alert("ImageHover.js->document.body.onkeydown\r\n" + exc);
					}
				};
				document.body.onkeyup = function (e) {
					try {
						if (e.keyCode === 16) {
							TabNoc_ImageHover.Variables.isShiftDown = false;
							ImageHover.hide();
							TabNoc_ImageHover.Variables.FullSizeImage = false;
						}
					}
					catch (exc) {
						console.error(exc);
						alert("ImageHover.js->document.body.onkeyup\r\n" + exc);
					}
				};
			}

			var ImageHover = {
				show : (function (eventElement, userArgs) {
					try {
						var ElementSrc = TabNoc_ImageHover.Settings.Config.getElementSrc(eventElement, userArgs);
						var webmMatch = ElementSrc.match(/\.(?:webm|pdf)$/);

						if (webmMatch && webmMatch[0] == ".webm") {
							ImageHover.showWebm(eventElement);
						}
						var imageHoverElement = document.createElement("img");
						imageHoverElement.id = "image-hover";
						imageHoverElement.alt = "Image";
						imageHoverElement.onerror = ImageHover.onLoadError;
						imageHoverElement.src = ElementSrc;
						imageHoverElement.setAttribute("style", "position: absolute; max-width: 100%; max-height: 100%; top: 0px; right: 0px; z-index: 9002;");
						TabNoc_ImageHover.Settings.Config.imageHoverBg && (imageHoverElement.style.backgroundColor = "inherit");
						document.body.appendChild(imageHoverElement);
						if ("withCredentials" in new XMLHttpRequest) {
							imageHoverElement.style.display = "none";
							this.timeout = ImageHover.checkLoadStart(imageHoverElement, eventElement);
						} else {
							// not Calling
							imageHoverElement.style.bottom = eventElement.getBoundingClientRect().top + 10 + "px";
						}
					} catch (exc) {
						console.error(exc);
						alert("ImageHover.js->ImageHover.show()\r\n" + exc);
					}
				}),
				hide : (function () {
					var e;
					clearTimeout(this.timeout),
					(e = document.getElementById("image-hover")) && (e.play && (e.pause(), Tip.hide()), document.body.removeChild(e))
				}),
				showWebm : (function (e) {
					var t,
					a,
					i;
					t = document.createElement("video"),
					t.id = "image-hover",
					TabNoc_ImageHover.Settings.Config.imageHoverBg && (t.style.backgroundColor = "inherit"),
					t.src = "A" !== e.nodeName ? e.parentNode.getAttribute("href") : e.getAttribute("href"),
					t.loop = !0,
					t.muted = !TabNoc_ImageHover.Settings.Config.unmuteWebm,
					t.autoplay = !0,
					t.onerror = ImageHover.onLoadError,
					t.onloadedmetadata = function () {
						ImageHover.showWebMDuration(this, e)
					},
					a = e.getBoundingClientRect(),
					i = window.innerWidth - a.right - 20,
					t.style.maxWidth = i + "px",
					t.style.top = window.pageYOffset + "px",
					document.body.appendChild(t),
					TabNoc_ImageHover.Settings.Config.unmuteWebm && (t.volume = .5)
				}),
				showWebMDuration : (function (e, t) {
					if (e.parentNode) {
						var a,
						i = TabNoc_ImageHover.Settings.Config.$.prettySeconds(e.duration);
						a = e.mozHasAudio === !0 || e.webkitAudioDecodedByteCount > 0 || e.audioTracks && e.audioTracks.length ? " (audio)" : "",
						Tip.show(t, i[0] + ":" + ("0" + i[1]).slice(-2) + a)
					}
				}),
				onLoadError : (function () {
					Feedback.error("File no longer exists (404).", 2000)
				}),
				onLoadStart : (function (imageHoverElement, eventElement) {
					// On every Site different
					// Node from wich the BoundingClientRect comes
					var ParentNode = TabNoc_ImageHover.Settings.Config.getParentNode(eventElement);

					var optimalFromW = $('body').innerWidth() - ParentNode.getBoundingClientRect().right - 10;
					// gibt an was mit der breite erreicht werden kann(wenn src groß genug)
					var optimalFromW_H = optimalFromW * (imageHoverElement.naturalHeight / imageHoverElement.naturalWidth);

					var optimalFromH = ParentNode.getBoundingClientRect().top - 10;

					if (optimalFromW_H > optimalFromH) {
						// längliche Bilder oder Bildern im oberen Bereich
						imageHoverElement.style.maxWidth = optimalFromW + "px";
					} else {
						// breite Bilder
						imageHoverElement.style.maxHeight = optimalFromH + "px";
					}

					if (TabNoc_ImageHover.Settings.Config.ShiftKeyShowsImageFullSize && TabNoc_ImageHover.Variables.isShiftDown) {
						imageHoverElement.style.maxHeight = "100%";
						imageHoverElement.style.maxWidth = "100%";
						if (TabNoc_ImageHover.Settings.Config.ClickOnFullSizeImageToClose) {
							imageHoverElement.onclick = function (e) {
								ImageHover.hide();
								setTimeout(function () {
									TabNoc_ImageHover.Variables.FullSizeImage = false;
								}, TabNoc_ImageHover.Settings.Config.WaitTimeAfterClickFullSizeImage);
							};
						}
					}

					imageHoverElement.style.display = "";
					imageHoverElement.style.top = window.pageYOffset + "px";
				}),
				checkLoadStart : (function (imageHoverElement, eventElement) {
					// Check if the Image is alreadyy loaded (then return void and calling ImageHover.onLoadStart) else setRecursiveTimeout over 15ms and return Timer(pointless, only 15ms alive)
					return imageHoverElement.naturalWidth ? void ImageHover.onLoadStart(imageHoverElement, eventElement) : setTimeout(ImageHover.checkLoadStart, 15, imageHoverElement, eventElement)
				}),
				timeout : null
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
					element.innerHTML = '<span style="' + style + ' border-radius: 5px; cursor: pointer; color: #fff; padding: 3px 6px; font-size: 16px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.2); text-shadow: 0 1px rgba(0, 0, 0, 0.2);">' + message + "</span>";
					element.addEventListener("click", onClickFunction || Feedback.hideMessage, !1);
					document.body.appendChild(element);
					time && (Feedback.messageTimeout = setTimeout(Feedback.hideMessage, time))
				}),
				hideMessage : (function () {
					var element = document.getElementById("feedback");
					element && (Feedback.messageTimeout && (clearTimeout(Feedback.messageTimeout), Feedback.messageTimeout = null), element.removeEventListener("click", Feedback.hideMessage, !1), document.body.removeChild(element))
				}),
				error : (function (message, time) {
					Feedback.showMessage(message || "Something went wrong", "error", time || 5000)
				}),
				notify : (function (message, time) {
					Feedback.showMessage(message, "notify", time || 3000)
				})
			};
			setTabNoc(TabNoc);
		} catch (exc) {
			console.error(exc);
			alert("ImageHover.js->AddImageHover()\r\n" + exc);
		}
	}
	console.log("Readed ImageHover " + getImageHoverVersion() + " by TabNoc")
} catch (exc) {
	console.error(exc);
	alert("ImageHover.js\r\n" + exc);
}
