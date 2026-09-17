import { displayMessage, showMultiplayerResults, updateLeaderboardVisual, swapView, updateInfoVisual, showAlert, toggleSpectateVisual, updateSpectateMessage, toggleStartButton, hideMultiplayerResults } from '../client/src/gui';
import GameState from './gameState';
import { UpdateType, type GameResultsUpdate, type GameStartUpdate, type GarbageUpdate, type PlayerDataObject, type PlayerListUpdate, type UpdateMessage } from './multiplayerTyping';
import Renderer from './renderer';
import type { Configuration } from './configuration';
import InputHandler from './inputHandler';
import tetrominoBag from '../data/tetrominos';
import { gridDimensions, gridPixelDimensions, gridPosition, holdPosition, queuePosition } from '../client/src/main';
export class MultiplayerManager {
	webSocket: WebSocket;
	roomCode: string;
	username: string;
	isSpectating: boolean;
	isAlive: boolean;
	gameState?: GameState;
	renderer: Renderer;
	config: Configuration;
	gameForceExit = false;
	lastPlayerList?: PlayerDataObject[];

	constructor(givenCode: string, givenUsername: string, givenWebSocket: WebSocket, config: Configuration) {
		this.roomCode = givenCode;
		this.username = givenUsername;
		this.webSocket = givenWebSocket;
		this.isAlive = false;
		this.isSpectating = false;
		this.config = config;
		const canvas = document.getElementById('multiplayer-canvas') as HTMLCanvasElement;
		this.renderer = new Renderer(canvas, gridDimensions, gridPixelDimensions, gridPosition, queuePosition, holdPosition);
		this.renderer.clearFrame();

		this.webSocket.addEventListener('open', () => {
			// WebSocket sucessfully opened, swap view to multiplayer
			swapView('multiplayer');
			// Display the room code (client currently does not know the player count so use 1 as a placeholder)
			updateInfoVisual(givenCode, 1);

			// Reset the gameplay GUI elements that are disabled by default
			toggleStartButton(true);
			toggleSpectateVisual(true);
			updateSpectateMessage('Waiting for game to start...');
			displayMessage('');
		});

		this.webSocket.addEventListener('message', (event: MessageEvent<string>) => {
			// Parse JSON to object
			const messageObject = JSON.parse(event.data) as UpdateMessage;
			const messageType = messageObject.updateType;

			// Determine the type of the update
			if (messageType === UpdateType.PLAYER_LIST) {
				const data = messageObject.data as PlayerListUpdate;
				// If this is the first player list update and the game is in progress
				if (this.lastPlayerList === undefined && data.gameInProgress) {
					// Game is in progress, disable start button
					updateSpectateMessage('Waiting for game to end...');
					toggleStartButton(false);
				}
				this.lastPlayerList = data.players;
				// Sort the playeras list by alive/not alive and then by score
				const leaderboard = this.lastPlayerList.toSorted((a, b) => {
					// If A and B are both alive or both dead then sort by score
					if (a.isAlive === b.isAlive) return b.score - a.score;
					// If only A is alive then A comes before B
					if (a.isAlive) return -1;
					// If only B is alive then B comes before A
					return 1;
				});
				// Update the HTML element with the new leaderboard
				updateLeaderboardVisual(leaderboard);
				updateInfoVisual(givenCode, this.lastPlayerList.length);
			}
			else if (messageType === UpdateType.GARBAGE) {
				const data = messageObject.data as GarbageUpdate;
				// Add garbage to the game state and display a message indicating where it came from
				this.gameState?.addGarbage(data.lines);
				displayMessage(`Recieved ${data.lines} lines of garbage from ${data.source.name}!`);
			}
			else if (messageType === UpdateType.GAME_RESULTS) {
				const data = messageObject.data as GameResultsUpdate;
				// Extract winner
				const winner = data.winner;
				if (this.isAlive) {
					// If the client is alive then they must be the winner
					this.stopGame();
					// Display results screen
					showMultiplayerResults(true);
				}
				// Client not alive, show message indicating who won.
				else displayMessage(`${winner.name} won the game!`);
				// Renable game start button and waiting for game to start message
				toggleStartButton(true);
				toggleSpectateVisual(true);
				updateSpectateMessage('Waiting for game to start...');
			}
			else if (messageType === UpdateType.GAME_START) {
				// Update the leaderboard for the start of the game
				this.lastPlayerList = messageObject.data as GameStartUpdate;
				// Display updated information
				updateLeaderboardVisual(this.lastPlayerList);
				updateInfoVisual(givenCode, this.lastPlayerList.length);
				if (!this.isSpectating) {
					// If player isn't spectating disable the waiting for game start message
					toggleSpectateVisual(false);
					// Start the game loop
					this.startGame();
				}
				else {
					// Player is spectating, disable start button
					updateSpectateMessage('Waiting for game to end...');
					toggleStartButton(false);
				}
			}
		});
	}

	sendUpdatedState() {
		const updateJSON = JSON.stringify({ updateType: UpdateType.GAME_STATE, data: { isAlive: this.isAlive, isSpectating: this.isSpectating } });
		this.webSocket.send(updateJSON);
	}

	requestStart() {
		// Filter to only players which are not spectating
		console.log(this.lastPlayerList);
		const participatingPlayers = this.lastPlayerList?.filter(player => !player.isSpectating);
		// Check that there are two or more participating players
		if (!participatingPlayers || participatingPlayers.length >= 2) {
			const updateJSON = JSON.stringify({ updateType: UpdateType.REQUEST_START, data: undefined });
			this.webSocket.send(updateJSON);
		}
		else showAlert('There must be at least 2 people to start a game!', 2500);
	}

	onPiecePlace(linesCleared: number) {
		// Send updated score and stack height as well as the number of lines cleared by the piece
		const updateJSON = JSON.stringify({ updateType: UpdateType.PIECE_PLACE, data: { score: this.gameState?.score, stackHeight: this.gameState?.stackHeight, linesCleared: linesCleared } });
		this.webSocket.send(updateJSON);
	}

	toggleSpectating() {
		// Get the spectate button
		const spectateButton = document.getElementById('spectate-button')!;
		// Toggle the spectating flag
		this.isSpectating = !this.isSpectating;
		// Update the button label
		spectateButton.innerHTML = this.isSpectating ? 'Stop Spectating' : 'Spectate';
		// Send new state to server to make sure it has the most up to date information
		this.sendUpdatedState();
	}

	startGame() {
		// Hide results screen if it is visible
		hideMultiplayerResults();
		displayMessage('');
		this.isAlive = true;
		this.gameState = new GameState(tetrominoBag, this.config, this.username, (linesCleared: number) => this.onPiecePlace(linesCleared));
		const inputHandler = new InputHandler(this.config, this.gameState);
		this.renderer.assignGameState(this.gameState);

		document.addEventListener('keydown', (event) => {
			// Check if key is already registered
			const heldKey = inputHandler.heldKeys.get(event.key);
			if (!heldKey) {
				// Register new key
				inputHandler.heldKeys.set(event.key, {
					code: event.key,
					isRepeating: false,
					timeSinceLastExecute: 0,
				});
			}
		});

		document.addEventListener('keyup', (event) => {
			// Key released -> remove key from map if it exists
			if (inputHandler.heldKeys.has(event.key)) {
				inputHandler.heldKeys.delete(event.key);
			}
		});

		let lastTimestamp: number;
		// Start the game loop by telling the browser we are ready to generate a frame
		const gameLoop = (timestamp: number) => {
			if (!this.gameState || !this.renderer) return;
			// Set the last time to current time for the first frame
			if (lastTimestamp === undefined) lastTimestamp = timestamp;
			// Calculate time elapsed since last frame
			const elapsed = (timestamp - lastTimestamp);

			inputHandler.processInputs(elapsed);
			// Update game state
			const isGameOver = this.gameState.doTick(elapsed);
			if (this.isAlive === isGameOver) {
				this.isAlive = false;
				this.sendUpdatedState();
				toggleSpectateVisual(true);
				toggleStartButton(false);
				updateSpectateMessage('Waiting for game to end...');
			}
			// Clear the current frame
			this.renderer.clearFrame();
			// Render a new frame
			this.renderer.render();
			// Update the timestamp to the current time
			lastTimestamp = timestamp;

			// The game has been exited by the user, stop without showing results
			if (this.gameForceExit) {
				// Reset the flag
				this.gameForceExit = false;
				this.renderer.clearFrame();
				return;
			}
			// The game has ended, calculate the duration and show the results
			else if (isGameOver) {
				const gameDuration = Date.now() - this.gameState.startTime;
				console.log(gameDuration);
				this.renderer.clearFrame();
				showMultiplayerResults(false);
			}
			// Tell the browser that the game is ready to do the next frame as game hasn't ended
			else window.requestAnimationFrame(gameLoop);
		};
		window.requestAnimationFrame(gameLoop);
	}

	stopGame() {
		this.gameForceExit = true;
	}
}
