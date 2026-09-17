import Renderer from '../../lib/renderer';
import GameState, { Direction, Rotation } from '../../lib/gameState';
import tetrominoBag from '../../data/tetrominos';
import { Configuration, KeybindAction } from '../../lib/configuration';
import InputHandler from '../../lib/inputHandler';
import { showResults } from './gui';
import './multiplayer';

const canvas = document.getElementById('canvas')! as HTMLCanvasElement;

// 10x20 cell grid
export const gridDimensions = { x: 10, y: 20 };
// Grid takes up 350px by 700px on canvas
export const gridPixelDimensions = { x: 350, y: 700 };
// Centres the grid horizontally in the canvas
export const gridPosition = { x: (canvas.width - gridPixelDimensions.x) / 2, y: (canvas.height - gridPixelDimensions.y) / 2 };
// Queue is drawn at (500px, 0)
export const queuePosition = { x: 530, y: 150 };
// Hold is drawn at (0, 0)
export const holdPosition = { x: 20, y: 150 };

export const config = new Configuration();
let renderer: Renderer;
let gameState: GameState;
let gameForceExit = false;
export function startGame() {
	gameForceExit = false;
	gameState = new GameState(tetrominoBag, config);
	const inputHandler = new InputHandler(config, gameState);

	if (!(canvas instanceof HTMLCanvasElement)) return;
	renderer = new Renderer(canvas, gridDimensions, gridPixelDimensions, gridPosition, queuePosition, holdPosition);
	renderer.assignGameState(gameState);

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

	// Start the game loop by telling the browser we are ready to generate a frame
	window.requestAnimationFrame(gameLoop);
	let lastTimestamp: number;
	function gameLoop(timestamp: number) {
		// Set the last time to current time for the first frame
		if (lastTimestamp === undefined) lastTimestamp = timestamp;
		// Calculate time elapsed since last frame
		const elapsed = (timestamp - lastTimestamp);

		inputHandler.processInputs(elapsed);
		// Update game state
		const isGameOver = gameState.doTick(elapsed);
		// Clear the current frame
		renderer.clearFrame();
		// Render a new frame
		renderer.render();
		// Update the timestamp to the current time
		lastTimestamp = timestamp;

		// The game has been exited by the user, stop without showing results
		if (gameForceExit) {
			// Reset the flag
			gameForceExit = false;
			return;
		}
		// The game has ended, calculate the duration and show the results
		else if (isGameOver) {
			const gameDuration = Date.now() - gameState.startTime;
			showResults(gameState.score, gameState.lineCount, gameDuration);
		}
		// Tell the browser that the game is ready to do the next frame as game hasn't ended
		else window.requestAnimationFrame(gameLoop);
	}

	// Make methods and variables acessible within the HTML/browser console
	(window as any).tetrominoBag = tetrominoBag;
	(window as any).test = renderer;
	(window as any).config = config;
	(window as any).Direction = Direction;
	(window as any).Rotation = Rotation;
	(window as any).KeybindAction = KeybindAction;
	(window as any).stopGame = stopGame;
}

export function stopGame() {
	gameForceExit = true;
}
