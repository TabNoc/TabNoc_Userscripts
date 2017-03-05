// Add Configurable Watching Position

// Config.TriggerDarkPercentage
// Gibt an ab welchem schwellwert der Pixel gezählt wird

/*{
	// the CallBack function: called when Config.amount was reached
	CallBack : (function (amount) {}),
	// the Interval the video is checked
	Interval : int32,
	// the percentage by witch the video size is shrinked
	CopySizePercentage : int32[0-100],
	// the Video from witch the image is loaded
	BaseVideo : HTML5Video,
	// the amount of 
	TriggerAmount : int32, 
	TriggerDarkPercentage : int32[0-100],
	StopIntervalAfterTrigger : bool[default:true],
}
	*/

function AddGreyDetector(Config) {
	console.log("VideoGreyDetector loaded");
	var WaitInterval = setInterval(function () {
			try {
				if (Config.BaseVideo.videoHeight === 0 && Config.BaseVideo.videoWidth === 0)
					return;
				else
					clearInterval(WaitInterval);
				Config.TN_canvas = document.createElement("canvas");
				var CanvasContent = Config.TN_canvas.getContext('2d');
				var VidHeigth = Math.floor(Config.BaseVideo.videoHeight * (Config.CopySizePercentage / 100));
				var VidWidth = Math.floor(Config.BaseVideo.videoWidth * (Config.CopySizePercentage / 100));

				document.body.appendChild(Config.TN_canvas);
				Config.TN_canvas.style.display = "none";
				Config.TN_canvas.height = VidHeigth;
				Config.TN_canvas.width = VidWidth;

				function GetDarkerPercentage(DarkPercentage) {
					var ColorDefinition = Math.floor(255 * (DarkPercentage / 100));

					// check performance
					// maybe use clipped Function	context.drawImage(img,sx,sy,swidth,sheight,x,y,width,height);
					CanvasContent.drawImage(Config.BaseVideo, 0, 0, VidWidth, VidHeigth);
					// check performance
					// maybe get complete Image
					var data = CanvasContent.getImageData(0, Math.floor(VidHeigth / 10 * 0), VidWidth, Math.floor(VidHeigth / 10)).data;
					var amount = 0;
					// check performance
					// maybe positionate i based on getImageData
					for (i = 0; i < data.length; i += 4) {
						if (data[i] >= ColorDefinition && data[i + 1] >= ColorDefinition && data[i + 2] >= ColorDefinition) {
							amount++;
						}
					}
					return amount;
				}

				return Config.DetectorInterval = setInterval(function () {
						try {
							if (document.hidden === true) {return;}
							var amount = 0;
							if ((amount = GetDarkerPercentage(Config.TriggerDarkPercentage)) > Config.TriggerAmount) {
								if (Config.StopIntervalAfterTrigger !== false) {
									clearInterval(Config.DetectorInterval);
								}
								Config.CallBack(amount);
							}
						} catch (exc) {
							console.error(exc);
							alert(exc);
						}
					}, Config.Interval);
			} catch (exc) {
				console.error(exc);
				alert(exc);
			}
		}, 250);
};
