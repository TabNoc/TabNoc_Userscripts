//https://formbuilder.online/
var ImportExportDialog = {
	SelectTypeOfOperation: {
		title: 'TypeOfOperation',
		html:'<label><input type="radio" name="OperationType" value="Import"> Import</label><br />'+
			 '<label><input type="radio" name="OperationType" value="Export"> Export</label><br />'+
			 '<label><input type="radio" name="OperationType" value="Merge"> Merge</label>',
		buttons: { Next: 1 },
		submit: function (event, value, message, formVals) {
			console.log(formVals);

			event.preventDefault();
			if (formVals.OperationType === "Merge") {
				$.prompt.goToState('MergeInput', true);
			}
			else {
				setTimeout(function(){$("#TN_OutPut").html(formVals.OperationType === "Import" ? true : "Chooser");}, 250);
				if (formVals.OperationType === "Export") {
					$.prompt.goToState('chooserExport', true);
				}
				else {
					$.prompt.goToState('Operation');
				}
			}
		}
	},
	Operation: {
		title: 'Some stuff to come, dynamic',
		html:'<input id="tn_output"></input>',
		buttons: { Back: -1, Close: 0 },
		submit: function (event, value, message, formVals) {
			console.log(formVals);

			event.preventDefault();
			if (value === 1) {
				$.prompt.goToState('confirming');
			}
			else if (value === -1) {
				$.prompt.goToState('SelectTypeOfOperation');
			}
			else if (value === 0) {
				$.prompt.close();
			}
		}
	},
	MergeInput: {
		title: 'Please insert old Data',
		html:'<input id="tn_input"></input>',
		buttons: { Back: -1, Submit: 0 },
		submit: function (event, value, message, formVals) {
			console.log(formVals);

			event.preventDefault();
			if (value === 1) {
				$.prompt.goToState('confirming');
			}
			else if (value === -1) {
				$.prompt.goToState('SelectTypeOfOperation');
			}
			else if (value === 0) {
				alert(MergeRequest($("#tn_input").val()));
				$.prompt.close();
			}
		}
	},
	confirming: {
		html:'Are you sure?',
		buttons: { No: -1, Yes: 0 },
		focus: 1,
		submit: function (event, value, message, formVals) {
			console.log(formVals);
			event.preventDefault();
			
			if (value === 0) {
				// Import
				$.prompt.goToState('finished');
			}
			else if (value === -1) {
				$.prompt.goToState('Operation');
			}
		}
	},
	chooserExport: {
		html:'witch Type of Export?',
		buttons: { VideoObjectDictionary: 1, WatchedVideoArray: 2 },
		submit: function (event, value, message, formVals) {
			console.log(formVals);
			event.preventDefault();
			
			window.prompt("Tada!", value === 1 ? ExportData("VideoObjectDictionary") : ExportData("WatchedVideoArray"));
			
			setTimeout(function(){$("#tn_output").val(value === 1 ? ExportData("VideoObjectDictionary") : ExportData("WatchedVideoArray"));}, 250);
				
			$.prompt.goToState('Operation');
		}
	},
	finished: {
		title: "You're Done!",
		html: "Congratulations, the Data has been imported!",
		buttons: { Close: 0 },
		focus: 0
	}
};

// $.prompt(statesdemo);
