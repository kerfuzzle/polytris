import { KeybindAction } from '../../lib/configuration';
import { PlayerDataObject } from '../../lib/multiplayerTyping.ts';
import { config, startGame, stopGame } from './main.ts';
import { multiplayerManager } from './multiplayer.ts';
let currentViewContainer = document.getElementById('menu-container');

export function swapView(targetView: string) {
	// Gets the correct HTML element of the target view
	const targetContainer = document.getElementById(targetView + '-container');
	// Checks that the view actually exists otherwise we can't switch to it
	if (targetContainer == undefined) throw new Error('View invalid');

	// Hides the current container and activates the target container
	currentViewContainer?.classList.remove('active');
	targetContainer.classList.add('active');
	// Updates the current container to the target container
	currentViewContainer = targetContainer;

	// Gets the HTML element of the logo and the title
	const title = document.getElementById('page-title');
	const logo = document.getElementById('logo');
	if (title == undefined || logo == undefined) return;
	// Resizes logo dending on if the view is the main menu
	if (targetView == 'menu') {
		logo.style.width = '600px';
		// Hide the alert and clear the flag incase the game is currently waiting for a keypress
		hideAlert();
		waitingForKeybindAction = undefined;
		// Hide the results box incase the user just exited a game
		hideResults();
		// Force the game to stop if there is one runnin
		stopGame();

		hideMultiplayerResults();
		multiplayerManager.stopGame();
		multiplayerManager.webSocket.close();
	}
	else logo.style.width = '300px';

	// Changes the page title if the view is config or lobby
	if (targetView == 'config') {
		title.innerHTML = 'configuration';
		// Sync the keybind visuals to the user's configuration
		updateKeybindVisuals();
		// Update the slider visuals when the page loads
		const sliders = document.getElementsByClassName('handling-slider');
		for (let i = 0; i < sliders.length; i++) {
			const slider = sliders.item(i) as HTMLInputElement;
			const currentConfig = config.getHandlingConfig();
			switch (slider.id) {
				case 'das-range': {
					slider.value = currentConfig.das.toString();
					break;
				}
				case 'arr-range': {
					slider.value = currentConfig.arr.toString();
					break;
				}
				case 'sdf-range': {
					slider.value = currentConfig.sdf.toString();
					break;
				}
				default: {
					continue;
				}
			}
			updateSliderVisual(slider);
		}
	}
	else if (targetView == 'lobby') title.innerHTML = 'multiplayer';
	else if (targetView == 'game') startGame();
	else title.innerHTML = '';
}

export function showAlert(message: string, duration?: number) {
	// Get the alert box element
	const alertBox = document.getElementById('alert-box');
	if (!alertBox) return;
	// Get the text container
	const messageSpan = alertBox.children.item(1);
	if (!messageSpan) return;
	// Update the message
	messageSpan.innerHTML = message;
	// Show the alert box
	alertBox.classList.add('active');
	// Hide the message box after a timeout (If a duration is specified)
	if (duration) setTimeout(() => hideAlert(), duration);
}

function hideAlert() {
	// Get the alert box
	const alertBox = document.getElementById('alert-box');
	if (!alertBox) return;
	// Hide the alert box
	alertBox.classList.remove('active');
}

function updateSliderVisual(target: HTMLInputElement) {
	const newValue = target.value;
	if (!target.nextElementSibling) return;
	const sliderHead = target.nextElementSibling as HTMLElement;

	// Update the label text
	sliderHead.innerHTML = `${newValue}${target.id === 'sdf-range' ? 'X' : 'F'}`;
	// Calculate how far along the slider the slider head label should be
	const minValue = parseFloat(target.min);
	const maxValue = parseFloat(target.max);
	const proportion = (parseFloat(target.value) - minValue) / (maxValue - minValue);
	// Update the slider head label position
	sliderHead.style.transform = `translateX(${(target.clientWidth - sliderHead.clientWidth) * proportion}px)`;
};

function updateKeybindVisuals() {
	// Iterate through all the keybind elements on the page
	const keybindElements = document.getElementsByClassName('keybind');
	for (let i = 0; i < keybindElements.length; i++) {
		const keybindElement = keybindElements.item(i)!;
		// Get the action integer
		const action = keybindElement.getAttribute('action');
		if (!action) return;
		// Get the corresponding keybind from the config
		const keybind = config.getKeybind(parseInt(action));
		if (!keybind) return;
		// Update the text on the button itself
		const button = keybindElement.getElementsByTagName('button').item(0);
		if (!button) return;
		button.innerHTML = keybind.toUpperCase();
	}
}

export function showResults(score: number, linesCleared: number, timeSurvived: number) {
	// Get the HTML elements for the various parts of the results
	const resultsBox = document.getElementById('results-box')!;
	const resultsScore = document.getElementById('results-score')!;
	const resultsTime = document.getElementById('results-time')!;
	const resultsLines = document.getElementById('results-lines')!;

	// Convert the time from ms to MM:SS
	const timeString = formatTime(timeSurvived);
	// Add the active class, revealing the element
	resultsBox.classList.add('active');
	// Set the contet of each of the results elements to the releveant result
	resultsScore.innerHTML = `Score: ${score}`;
	resultsTime.innerHTML = `Time: ${timeString}`;
	resultsLines.innerHTML = `${linesCleared} Lines Cleared!`;
}

export function showMultiplayerResults(isWin: boolean) {
	// Get the HTML elements for the various parts of the results
	const resultsBox = document.getElementById('multiplayer-results-box')!;
	const resultsTitle = document.getElementById('results-title')!;

	resultsBox.classList.add('active');
	// Set the contet of each of the results elements to the releveant result
	resultsTitle.innerHTML = isWin ? 'You Won!' : 'Game Over!';
}

export function hideMultiplayerResults() {
	// Get the HTML element
	const resultsBox = document.getElementById('multiplayer-results-box')!;
	// Remove the active class, hiding the element
	resultsBox.classList.remove('active');
}

export function hideResults() {
	// Get the HTML element
	const resultsBox = document.getElementById('results-box')!;
	// Remove the active class, hiding the element
	resultsBox.classList.remove('active');
}

function formatTime(time: number) {
	// Convert ms to seconds
	const totalSeconds = Math.floor(time / 1000);
	// Calculate the number of minutes
	const minutes = Math.floor(totalSeconds / 60);
	// Calculate the number of seconds left after the minutes have been considered
	const remainingSeconds = totalSeconds % 60;

	// Convert times to string and pad with a leading 0 if it only has one digit
	let minuteString = minutes.toString();
	if (minuteString.length === 1) minuteString = '0' + minuteString;
	let secondsString = remainingSeconds.toString();
	if (secondsString.length === 1) secondsString = '0' + remainingSeconds;

	return `${minuteString}:${secondsString}`;
}

// Iterates all sliders with the handling-slider class
const sliders = document.getElementsByClassName('handling-slider');
for (let i = 0; i < sliders.length; i++) {
	const slider = sliders.item(i) as HTMLInputElement;
	// Register change event, fires whenever the slider is released
	slider.addEventListener('change', (event) => {
		if (!event.target) return;
		const target = event.target as HTMLInputElement;
		// Gets the id of the event target so the right config property is updated
		const propertyName = target.id;
		// Gets the updated value
		const newValue = target.value;
		// Update the corresponding property to the new value
		switch (propertyName) {
			case 'das-range': {
				config.setDAS(parseFloat(newValue));
				break;
			}
			case 'arr-range': {
				config.setARR(parseFloat(newValue));
				break;
			}
			case 'sdf-range': {
				config.setSDF(parseFloat(newValue));
				break;
			}
		}
	});

	// Register input event, fires whenever the slider moves
	slider.addEventListener('input', (event) => {
		// Gets the slider and the slider head label
		if (!event.target) return;
		const target = event.target as HTMLInputElement;
		updateSliderVisual(target);
	});
}

export function updateLeaderboardVisual(leaderboard: PlayerDataObject[]) {
	// Get the leaderboard HTML object
	const leaderboardItems = document.getElementById('leaderboard-items')!;
	// Clear out the current leaderboard
	leaderboardItems.innerHTML = '';
	leaderboard.forEach((player) => {
		// Create a new leaderboard item for each player
		const item = document.createElement('div');
		// Create an element containing the player's name
		const name = document.createElement('div');
		name.appendChild(document.createTextNode(player.name));
		// Create an element containing the player's score
		const score = document.createElement('div');
		score.appendChild(document.createTextNode(player.score.toString()));
		// Create an element containing the player's stack height
		const stack = document.createElement('div');
		stack.appendChild(document.createTextNode(player.stackHeight.toString()));
		// Add name, score and stack height elements to the leaderboard item
		item.appendChild(name);
		item.appendChild(score);
		item.appendChild(stack);
		// Add the dead class to any players that are not alive so their name shows up in red
		if (!player.isAlive) item.classList.add('dead');
		// Add the new leaderboard item to the leaderboard
		leaderboardItems.appendChild(item);
	});
}

export function displayMessage(message: string) {
	// Get HTML element
	const messageBox = document.getElementById('message-box')!;
	// Update text content to new message
	messageBox.innerHTML = message;
}

export function updateInfoVisual(code: string, playerCount: number) {
	// Get HTML element
	const infoBox = document.getElementById('info-box')!;
	// Clear out existing content
	infoBox.innerHTML = '';
	// Create new elements containing the code and the player count
	const roomBox = document.createElement('div');
	roomBox.appendChild(document.createTextNode(`Code: ${code}`));
	const countBox = document.createElement('div');
	// Add 's' onto the end of player depending on if there are multiple players or not
	countBox.appendChild(document.createTextNode(`${playerCount} Player${playerCount === 1 ? '' : 's'}`));
	// Add new elements into the info box element
	infoBox.appendChild(roomBox);
	infoBox.appendChild(countBox);
}

export function toggleSpectateVisual(visible: boolean) {
	// Toggle visibility class on the spectate message
	const spectateBox = document.getElementById('spectating-box')!;
	if (visible) spectateBox?.classList.add('active');
	else spectateBox?.classList.remove('active');
}

export function updateSpectateMessage(message: string) {
	// Update the message content
	const spectateMessage = document.getElementById('spectating-message')!;
	spectateMessage.innerHTML = message;
}

export function toggleStartButton(visible: boolean) {
	// Toggle the visibility of the start button
	const startButton = document.getElementById('start-button');
	if (visible) startButton?.classList.add('active');
	else startButton?.classList.remove('active');
}

// fix button activating when text is clicked
// change cursor when hovered

let waitingForKeybindAction: KeybindAction | undefined;

// Iterate through the keybind elements
const keybindElements = document.getElementsByClassName('keybind');
for (let i = 0; i < keybindElements.length; i++) {
	const keybindElement = keybindElements.item(i) as HTMLElement;
	// Register mouse click event on keybind element
	keybindElement.addEventListener('click', (event) => {
		if (!event.target) return;
		const target = event.target as HTMLElement;
		//	Get the corresponding keybind action integer from the button
		// This tells us what keybind needs to be changed
		const actionInteger = target.parentElement?.getAttribute('action');
		// Stop if there isn't an action or the program is already waiting for one
		if (!actionInteger || waitingForKeybindAction !== undefined) return;
		// Get description text element
		const description = target.parentElement?.getElementsByTagName('span').item(0);
		if (!description) return;
		/// Show an alert to the user telling them to press a key
		showAlert(`Press the key to map to "${description.innerHTML}"`);
		// Set the flag to the corresponding action
		waitingForKeybindAction = parseInt(actionInteger);
	});
}

document.addEventListener('keydown', (event) => {
	// Ignore keypresses if the program isn't waiting for one
	if (waitingForKeybindAction === undefined) return;
	// Hide the alert prompting the user to press a key
	hideAlert();
	// Try and assign they key that was presses to the action
	const result = config.setKeybind(waitingForKeybindAction, event.key);
	// Updating the config was sucessful so redraw the visual
	if (result) updateKeybindVisuals();
	// Alert the user the update was not successful
	else showAlert(`The key '${event.key}' is already in use!`, 2500);
	// Reset the flag so that no further keypresses are proccessed
	waitingForKeybindAction = undefined;
});

// Make methods available in the HTML/browser console
(window as any).swapView = swapView;
(window as any).showAlert = showAlert;
(window as any).hideAlert = hideAlert;
(window as any).updateKeybindVisuals = updateKeybindVisuals;
(window as any).formatTime = formatTime;
(window as any).showMultiplayerResults = showMultiplayerResults;
(window as any).displayMessage = displayMessage;
(window as any).updateInfoVisual = updateInfoVisual;
(window as any).toggleSpectateVisual = toggleSpectateVisual;
(window as any).toggleStartButton = toggleStartButton;
(window as any).updateSpectateMessage = updateSpectateMessage;
(window as any).hideMultiplayerResults = hideMultiplayerResults;
