https://formbuilder.online/
var statesdemo = {
	SelectTypeOfOperation: {
		title: 'TypeOfOperation',
		html:'<label><input type="radio" name="OperationType" value="Import"> Import</label><br />'+
			'<label><input type="radio" name="OperationType" value="Export"> Export</label>',
		buttons: { Next: 1 },
		submit: function (event, value, message, formVals) {
			console.log(formVals);

			event.preventDefault();
			$.prompt.goToState('Operation');
		}
	},
	Operation: {
		title: 'Some stuff to come, ',
		html:'',
		buttons: { Back: -1, Next: 1 },
		submit: function (event, value, message, formVals) {
			console.log(formVals);

			event.preventDefault();
			if (value === 1) {
				$.prompt.goToState('state2');
			}
			else if(value === -1) {
				$.prompt.goToState('state0');
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
	finished: {
		title: "You're Done!",
		html: "Congratulations, the Data has been imported!",
		buttons: { Close: 0 },
		focus: 0
	}
};

$.prompt(statesdemo);