import { swapView } from '../client/src/gui';
import { KeybindAction, type Configuration } from './configuration';
import type GameState from './gameState';
import { Direction, Rotation } from './gameState';

const MS_PER_FRAME = 1000 / 60;

interface HeldKey {
	code: string;
	isRepeating: boolean;
	timeSinceLastExecute: number;
}

export default class InputHandler {
	heldKeys = new Map<string, HeldKey>();
	readonly userConfig: Configuration;
	readonly gameState: GameState;

	constructor(userConfig: Configuration, gameState: GameState) {
		this.userConfig = userConfig;
		this.gameState = gameState;
	}

	processInputs(elapsed: number) {
		// Get handling config
		const handlingConfig = this.userConfig.getHandlingConfig();

		// Turn soft drop off, will be renabled again if the key is held
		this.gameState.softDropActive = false;

		// Iterate through held keys
		for (const value of this.heldKeys.values()) {
			// Get keybind from action
			const action = this.userConfig.getAction(value.code);
			// Left and right actions have repeating behaviour so need to be handled seperately
			if (action == KeybindAction.LEFT || action == KeybindAction.RIGHT) {
				// Check if this is the first frame the key has been pressed
				if (value.timeSinceLastExecute == 0 && !value.isRepeating) {
					this.executeAction(action);
				}

				// Keep track of how long has passed since the action was last executed
				value.timeSinceLastExecute += elapsed;

				// Check if action is already repeating
				if (value.isRepeating) {
					// Key is repeating so check if the time is greater than the ARR
					if (value.timeSinceLastExecute > handlingConfig.arr * MS_PER_FRAME) {
						// Time passed is greater than the ARR so the action needs to be repeated
						// Reset timer
						value.timeSinceLastExecute = 0;
						// Repeat action
						this.executeAction(action);
					}
				}
				else {
					// Key is not already repeating so check if the time is greater than the DAS
					if (value.timeSinceLastExecute > handlingConfig.das * MS_PER_FRAME) {
						// Time passed is greater than DAS so the key can now start repeating
						// Reset timer
						value.timeSinceLastExecute = 0;
						value.isRepeating = true;
						// Repeat action for the first time
						this.executeAction(action);
					}
				}
			}
			else if ((action !== undefined && !value.isRepeating) || action == KeybindAction.SOFT_DROP) {
				// Mark key as repeating so the action is not executed again for the same keypress
				value.isRepeating = true;
				// All other valid actions
				this.executeAction(action);
			}
		}
	}

	executeAction(action: KeybindAction) {
		switch (action) {
			case KeybindAction.LEFT: { // Move current piece left
				this.gameState.moveCurrentPiece(Direction.LEFT);
				break;
			}
			case KeybindAction.RIGHT: { // Move current piece right
				this.gameState.moveCurrentPiece(Direction.RIGHT);
				break;
			}
			case KeybindAction.SOFT_DROP: { // Enable soft drop
				this.gameState.softDropActive = true;
				break;
			}
			case KeybindAction.HARD_DROP: { // Hard drop current piece
				this.gameState.hardDropCurrentPiece();
				break;
			}
			case KeybindAction.SWAP_HOLD: { // Swap hold piece
				this.gameState.swapHold();
				break;
			}
			case KeybindAction.ROTATE_AC: { // Rotate anticlockwise
				this.gameState.rotateCurrentPiece(Rotation.ANTI_CLOCKWISE);
				break;
			}
			case KeybindAction.ROTATE_CW: { // Rotate clockwise
				this.gameState.rotateCurrentPiece(Rotation.CLOCKWISE);
				break;
			}
			case KeybindAction.ROTATE_180: { // Flip/Rotate 180
				this.gameState.rotateCurrentPiece(Rotation.FLIP);
				break;
			}
			case KeybindAction.EXIT: {
				// Swap back to main menu, exiting game
				swapView('menu');
				break;
			}
		}
	}
}
