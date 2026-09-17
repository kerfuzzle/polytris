import type { Coordinate } from './coordinate';
import Block from './block';
import Piece from './piece';
import PieceQueue from './pieceQueue';
import type { Configuration } from './configuration';

const PIECE_SPAWN_POSITION: Coordinate = { x: 3, y: -2 };
const GARBAGE_BLOCK = new Block(70, 70, 70);

export enum Direction {
	UP,
	RIGHT,
	DOWN,
	LEFT,
}

export enum Rotation {
	ANTI_CLOCKWISE,
	CLOCKWISE,
	FLIP,
}

export default class GameState {
	readonly queue: PieceQueue;
	currentPiece: Piece;
	currentPiecePosition: Coordinate = { x: PIECE_SPAWN_POSITION.x, y: PIECE_SPAWN_POSITION.y };
	currentPieceRotation = 0;
	currentHold?: Piece;
	holdOnCooldown = false;
	userConfig: Configuration;
	softDropActive = false;
	staticGrid: (Block | undefined)[][] = [];
	score = 0;
	playerName: string;
	lineCount = 0;
	startTime: number;
	currentGravity = 1;
	baseGravity = 1000;
	gravityTimer = 0;
	stackHeight = 0;
	piecePlaceEvent?: (linesCleared: number) => void;

	constructor(givenBag: Piece[], userConfig: Configuration, givenName = '', piecePlaceEvent?: (linesCleared: number) => void) {
		this.piecePlaceEvent = piecePlaceEvent;
		this.userConfig = userConfig;
		// Creates a new queue and puts the first piece into the current piece
		this.queue = new PieceQueue(givenBag, 5);
		this.currentPiece = this.queue.getNextPiece();

		// Set the player name
		this.playerName = givenName;

		// Store when the game started
		this.startTime = Date.now();

		// Manually fills the staticGrid to the desired size with undefined
		const gridRows = 20;
		const gridColumns = 10;
		for (let i = 0; i < gridRows; i++) {
			const row = [];
			// Fills row with undefined
			for (let j = 0; j < gridColumns; j++) row.push(undefined);
			this.staticGrid.push(row);
		}
	}

	moveCurrentPiece(direction: Direction) {
		// Determine where the piece would be if this move works
		const desiredPosition = structuredClone(this.currentPiecePosition);
		if (direction == Direction.UP) desiredPosition.y -= 1;
		else if (direction == Direction.RIGHT) desiredPosition.x += 1;
		else if (direction == Direction.DOWN) desiredPosition.y += 1;
		else if (direction == Direction.LEFT) desiredPosition.x -= 1;
		else throw new Error('Invalid movement direction');

		const positionValid = this.checkIfPieceStateValid(desiredPosition, this.currentPieceRotation);
		if (positionValid) {
			// Move is valid so is safe to actually carry out
			this.currentPiecePosition = desiredPosition;
			return true;
		}
		else return false;
	}

	checkIfPieceStateValid(position: Coordinate, rotation: number) {
		const shape = this.currentPiece.getShape(rotation);
		// Iterate through the piece blocks
		for (let i = 0; i < shape.length; i++) {
			for (let j = 0; j < shape[i].length; j++) {
				// Cell only needs to be checked if it is active
				if (shape[i][j]) {
					// Determine where on the grid the piece block would be
					const gridPositionX = position.x + j;
					const gridPositionY = position.y + i;

					// Check that the block is within the bounds of the grid
					if (gridPositionY < this.staticGrid.length && gridPositionX >= 0 && gridPositionX < this.staticGrid[0].length) {
						// Check if there is a static placed block intersecting
						if (gridPositionY >= 0 && this.staticGrid[gridPositionY][gridPositionX] !== undefined) {
							// Block intersects -> Move invalid
							return false;
						}
					}
					// Block is out of the grid -> Move invalid
					else return false;
				}
			}
		}
		// If the code reaches here, none of the piece blocks intersected or went out of bounds
		// This means the position & rotation is valid
		return true;
	}

	doTick(elapsed: number) {
		// Keep track of time passed since last gravity movement (ms)
		this.gravityTimer += elapsed;

		// Decrease threshold for higher gravity multipliers
		let threshold = (this.baseGravity / this.currentGravity);
		// Decrease threshold further if soft drop is active
		if (this.softDropActive) threshold /= this.userConfig.getHandlingConfig().sdf;
		// Check if time passed exceeds threshold
		if (this.gravityTimer > threshold) {
			// Attempt to move piece down 1 cell
			const result = this.moveCurrentPiece(Direction.DOWN);
			// Piece could not be moved downwards -> piece must be grounded
			if (!result) {
				// Place the piece
				const placementResult = this.placeCurrentPiece();
				if (!placementResult) {
					// Piece could not be placed -> game-over!
					console.log('Game over detected!');
					return true;
				}
			}
			this.gravityTimer = 0; // Reset timer
		}
		this.currentGravity = 1 + (this.score / 50000);
		return false;
	}

	placeCurrentPiece() {
		// Get the block the current piece is made of
		const block = this.currentPiece.composingBlock;
		const shape = this.currentPiece.getShape(this.currentPieceRotation);

		// Keep track of which rows were modified
		const potentialClearedLines: number[] = [];
		// Iterate through the piece's shape array
		for (let i = 0; i < shape.length; i++) {
			for (let j = 0; j < shape[i].length; j++) {
				// Check if the cell of the piece is enabled
				if (shape[i][j]) {
					// Determine where on the grid the piece block would be
					const gridPositionX = this.currentPiecePosition.x + j;
					const gridPositionY = this.currentPiecePosition.y + i;

					// Check if block is above the top of the grid
					if (gridPositionY < 0) return false;
					// Set the the grid corresponding cell to the piece block
					this.staticGrid[gridPositionY][gridPositionX] = block;

					// Add modified row index if it is not already in the array
					if (!potentialClearedLines.includes(gridPositionY)) {
						potentialClearedLines.push(gridPositionY);
					}

					// Check if the current block is higher than the current stack height
					const newStackHeight = 20 - gridPositionY;
					if (newStackHeight > this.stackHeight) this.stackHeight = newStackHeight;
				}
			}
		}

		// Keep track of the number of lines cleared to calculate score
		let numClearedLines = 0;
		// Iterate through rows marked as modified
		potentialClearedLines.forEach((currentLine) => {
			// Check if line is completed
			if (this.checkIfLineCompleted(currentLine)) {
				// Line complete -> clear line and increment counter
				this.clearLine(currentLine);
				numClearedLines++;
			}
		});

		// Calculate score
		this.score += Math.round(Math.pow(numClearedLines, 2) * 1000 * this.currentGravity);
		// Increase the line count by the number of lines cleared
		this.lineCount += numClearedLines;
		// Decrease the stack height depending on the number of lines cleared
		this.stackHeight -= numClearedLines;
		// If there is a piece place callback event, call it with the number of cleared lines
		if (this.piecePlaceEvent) this.piecePlaceEvent(numClearedLines);

		// Dequeue a piece from the queue and make it the current piece
		this.currentPiece = this.queue.getNextPiece();
		// Resest position and rotation
		this.currentPiecePosition = { x: PIECE_SPAWN_POSITION.x, y: PIECE_SPAWN_POSITION.y };
		this.currentPieceRotation = 0;
		// Piece was placed -> Hold no longer on cooldown
		this.holdOnCooldown = false;

		return true;
	}

	checkIfLineCompleted(yPosition: number) {
		// Check if the row includes anything that is not undefined
		return !this.staticGrid[yPosition].includes(undefined);
	}

	clearLine(yPosition: number) {
		// Move each line down by one row, starting from the row above the cleared row
		for (let i = yPosition; i >= 1; i--) {
			this.staticGrid[i] = this.staticGrid[i - 1];
		}

		// Clear out the line at the top of the grid that doesnt have a row above to be replaced by
		this.staticGrid[0] = this.staticGrid[0].map(() => undefined);
	}

	addGarbage(numLines: number) {
		// Increase the stack height by the number of lines added
		this.stackHeight += numLines;
		// Call the piece place event to send updated stack height to server
		if (this.piecePlaceEvent) this.piecePlaceEvent(0);

		// Pick where in the line the gap will be
		const gapPosition = Math.floor(Math.random() * this.staticGrid[0].length);
		// Find the index of the bottom row of the grid
		const bottomRowIndex = this.staticGrid.length - 1;
		// Keep track of if adding garbage caused a gameover
		let gameOver = false;

		for (let i = 0; i < numLines; i++) {
			// Check if current piece will be in the way of the garbage coming upwards
			const moveResult = this.moveCurrentPiece(Direction.DOWN);
			// If piece cannot be moved down, place it
			if (!moveResult) this.placeCurrentPiece();
			// If piece was moved down, move it back up to its original position
			else this.moveCurrentPiece(Direction.UP);

			// Check if top line is empty, If it isnt then blocks
			// will be pushed off the top of the grid resulting in a gameover
			for (const cell of this.staticGrid[0]) {
				if (cell != undefined) gameOver = true;
			}

			// Shift all rows up by one
			for (let j = 0; j < bottomRowIndex; j++) {
				this.staticGrid[j] = this.staticGrid[j + 1];
			}

			// Replace bottom row with row of garbage blocks
			this.staticGrid[bottomRowIndex] = this.staticGrid[bottomRowIndex].map((_, index) => {
				// Leave gap in the correct position
				if (index == gapPosition) return undefined;
				else return GARBAGE_BLOCK;
			});
		}
		return gameOver;
	}

	swapHold() {
		// Check if hold is on cooldown
		if (this.holdOnCooldown) return false;

		// Check if hold is empty
		if (this.currentHold == undefined) {
			// Hold empty, put current piece in and get next piece from queue
			this.currentHold = this.currentPiece;
			this.currentPiece = this.queue.getNextPiece();
		}
		else {
			// Hold not empty, swap hold and current piece
			const tempPiece = this.currentPiece;
			this.currentPiece = this.currentHold;
			this.currentHold = tempPiece;
		}

		// Reset piece position and rotation
		this.currentPiecePosition = { x: PIECE_SPAWN_POSITION.x, y: PIECE_SPAWN_POSITION.y };
		this.currentPieceRotation = 0;

		// Activate hold cooldown
		this.holdOnCooldown = true;
		return true;
	}

	rotateCurrentPiece(rotationType: Rotation) {
		// Calculate target rotation from current rotation
		let targetRotation = this.currentPieceRotation;
		// Increment/decrement the number of 90 degree rotations
		if (rotationType == Rotation.ANTI_CLOCKWISE) targetRotation--;
		else if (rotationType == Rotation.CLOCKWISE) targetRotation++;
		else if (rotationType == Rotation.FLIP) targetRotation += 2;

		// Normalise rotation under mod 4
		targetRotation %= 4;
		// If rotation is negative (anticlockwise), add 4 to convert to clockwise
		if (targetRotation < 0) targetRotation += 4;

		// Get kick offsets for currentPieceRotation -> targetRotation
		const kickOffsets = this.currentPiece.kickTable?.getOffsets(this.currentPieceRotation, targetRotation);
		if (kickOffsets == undefined) return; // No kick offsets/kick table -> rotation cannot happen

		// Test offsetes
		for (const kickOffset of kickOffsets) {
			// Calculate position with offset
			const offsetPosition = { x: this.currentPiecePosition.x + kickOffset.x, y: this.currentPiecePosition.y + kickOffset.y };
			// Check if offset position and target rotation are valid
			const stateValid = this.checkIfPieceStateValid(offsetPosition, targetRotation);
			if (stateValid) {
				// Offset position and target rotation valid -> update piece position and rotation
				this.currentPiecePosition = offsetPosition;
				this.currentPieceRotation = targetRotation;
				// Valid offset found -> No need to test other more extreme offsets
				return;
			}
		}
	}

	hardDropCurrentPiece() {
		// Repeatedly move piece down until the movement fails
		while (this.moveCurrentPiece(Direction.DOWN));

		// Place current piece
		this.placeCurrentPiece();
	}
}
