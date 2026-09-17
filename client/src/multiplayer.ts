import { showAlert } from './gui';
import { MultiplayerManager } from '../../lib/multiplayerManager';
import { config } from './main';
const URL_BASE = window.location.protocol + '//' + window.location.host + '/';

export let multiplayerManager: MultiplayerManager;

function onPrivateJoinButtonClick() {
	// Get HTML elements
	const usernameInput = document.getElementById('username-input')! as HTMLInputElement;
	const roomCodeInput = document.getElementById('room-code-input')! as HTMLInputElement;

	// Extract values from input elements
	const username = usernameInput.value;
	const roomCode = roomCodeInput.value;
	// Check that username and room code are a valid length
	if (username.length === 0) {
		showAlert('Please provide a username!', 2500);
	}
	else if (roomCode.length === 0) {
		showAlert('Please provide a room code!', 2500);
	}
	else if (roomCode.length != 4) {
		showAlert('Room codes must be 4 characters!', 2500);
	}
	else {
		// Username and room code valid -> try and join room
		joinLobby(roomCode.toUpperCase(), username);
	}
}

export const PUBLIC_LOBBY_CODE = '0000';
function onPublicJoinButtonClick() {
	const usernameInput = document.getElementById('username-input')! as HTMLInputElement;

	const username = usernameInput.value;
	if (username.length === 0) {
		showAlert('Please provide a username!', 2500);
	}
	else {
		joinLobby(PUBLIC_LOBBY_CODE, username);
	}
}

async function onPrivateCreateButtonClick() {
	// Get username input element
	const usernameInput = document.getElementById('username-input')! as HTMLInputElement;

	// Extract username and validate length
	const username = usernameInput.value;
	if (username.length === 0) {
		showAlert('Please provide a username!', 2500);
	}
	else {
		// Try and create a room
		const createdRoomCode = await requestLobby();
		// Only continue if a room was sucessfully created
		if (createdRoomCode) {
			// Try and join lobby with created room code
			joinLobby(createdRoomCode, username);
		}
	}
}

async function requestLobby() {
	// Specify the create route in the URL
	const url = URL_BASE + 'create';
	// Make POST request
	const result = await fetch(url, { method: 'POST' });
	// Parse result and return code
	const resultObject = await result.json() as { code: string };
	return resultObject.code;
}

function joinLobby(code: string, username: string) {
	console.log(code, username);
	const url = `${URL_BASE}join?code=${code}&name=${username}`;
	const socket = new WebSocket(url);
	socket.addEventListener('error', () => {
		if (socket.readyState === WebSocket.CLOSED) showAlert(`No room exists with code ${code}`, 2500);
	});
	multiplayerManager = new MultiplayerManager(code, username, socket, config);
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
	(window as any).multiplayerManager = multiplayerManager;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
(window as any).onPrivateJoinButtonClick = onPrivateJoinButtonClick;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
(window as any).onPublicJoinButtonClick = onPublicJoinButtonClick;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
(window as any).onPrivateCreateButtonClick = onPrivateCreateButtonClick;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
(window as any).requestLobby = requestLobby;
