import Block from './block';
import type { Coordinate } from './coordinate';
import type GameState from './gameState';

export default class Renderer {
	gameState?: GameState;
	readonly gridDimensions: Coordinate;
	readonly gridPixelDimensions: Coordinate;
	readonly cellDimensions: Coordinate;
	readonly gridLineThickness: number = 2;
	readonly gridPosition: Coordinate;
	readonly queuePosition: Coordinate;
	readonly holdPosition: Coordinate;
	readonly canvas: HTMLCanvasElement;
	readonly renderingContext: CanvasRenderingContext2D;
	readonly blockBorderThickness = 4;

	constructor(givenCanvas: HTMLCanvasElement, givenGridDimensions: Coordinate, givenGridPixelDimensions: Coordinate, givenGridPosition: Coordinate, givenQueuePosition: Coordinate, givenHoldPosition: Coordinate) {
		this.canvas = givenCanvas;
		// Get rendering context from canvas
		const renderingContext = this.canvas.getContext('2d');
		// Throw user friendly error if the browser does not have canvas support
		if (!renderingContext) throw new Error('Canvas not supported by this browser:(');
		this.renderingContext = renderingContext;

		this.gridDimensions = givenGridDimensions; // Stores the dimensions of the grid in cells. e.g 10x20
		this.gridPixelDimensions = givenGridPixelDimensions; // Stores the dimensions of the grid in pixels. e.g 350x700px
		// Stores the dimensions of a single grid cell in pixels
		this.cellDimensions = { x: this.gridPixelDimensions.x / this.gridDimensions.x, y: this.gridPixelDimensions.y / this.gridDimensions.y };

		// Stores the pixel position on the canvas to act as the origin used to draw each element from
		this.gridPosition = givenGridPosition;
		this.queuePosition = givenQueuePosition;
		this.holdPosition = givenHoldPosition;
	}

	drawGridBackground() {
		this.renderingContext.fillStyle = 'rgb(54, 64, 72)';
		// Draw horizontal lines
		for (let i = 1; i < this.gridDimensions.y; i++) {
			// Draw line i * rowheight down, across the entire canvas
			this.renderingContext.fillRect(0, i * this.cellDimensions.y, this.gridPixelDimensions.x, this.gridLineThickness);
		}

		// Draw vertical lines
		for (let j = 1; j < this.gridDimensions.x; j++) {
			// Draw line j * columnWidth across, down the entire canvas
			this.renderingContext.fillRect(j * this.cellDimensions.x, 0, this.gridLineThickness, this.gridPixelDimensions.y);
		}
	}

	drawBlock(block: Block, xPosition: number, yPosition: number, width: number, height: number) {
		// Set colour slightly darker than block colour
		this.renderingContext.fillStyle = `rgb(${block.colour[0] - 50}, ${block.colour[1] - 50}, ${block.colour[2] - 50})`;
		// Draw full square
		this.renderingContext.fillRect(xPosition, yPosition, width, height);
		// Set coour to the brighter normal block colour
		this.renderingContext.fillStyle = `rgb(${block.colour[0]} ${block.colour[1]} ${block.colour[2]})`;
		// Draw a smaller square so that the darker square acts as a border
		this.renderingContext.fillRect(xPosition + this.blockBorderThickness, yPosition + this.blockBorderThickness, width - 2 * this.blockBorderThickness, height - 2 * this.blockBorderThickness);
	}

	drawGridBlocks() {
		// If the game state is not set the method cannot continue -> Throw a user friendly error
		if (!this.gameState) throw new Error('No game state to render!');

		const grid = this.gameState.staticGrid;
		// Iterate through all the grid cells, row by row
		for (let i = 0; i < grid.length; i++) {
			for (let j = 0; j < grid[i].length; j++) {
				const cell = grid[i][j];
				// Check if cell contains anything
				if (cell !== undefined) {
					// Map grid index to pixel coordinates on the canvas
					// thickness/2 accounts for the thickness of the gridlines
					const mappedX = j * this.cellDimensions.x + this.gridLineThickness / 2;
					const mappedY = i * this.cellDimensions.y + this.gridLineThickness / 2;
					// Draw block at the mapped pixel position
					this.drawBlock(cell, mappedX, mappedY, this.cellDimensions.x, this.cellDimensions.y);
				}
			}
		}
	}

	drawCurrentPiece() {
		// If the game state is not set the method cannot continue -> Throw a user friendly error
		if (!this.gameState) throw new Error('No game state to render!');

		const currentPiece = this.gameState.currentPiece;
		const block = currentPiece.composingBlock; // Get the block current piece is made of
		const shape = currentPiece.getShape(this.gameState.currentPieceRotation); // Get shape array
		const position = this.gameState.currentPiecePosition; // Get grid position

		// Iterate through piece shape array
		for (let i = 0; i < shape.length; i++) {
			for (let j = 0; j < shape[i].length; j++) {
				if (shape[i][j]) { // Only render a block if it is enabled in the shape 2D array
					// Map the (grid position + shape position) to pixel coordinates
					// thickness/2 accounts for the thickness of the gridlines
					const mappedX = (position.x + j) * this.cellDimensions.x + this.gridLineThickness / 2;
					const mappedY = (position.y + i) * this.cellDimensions.y + this.gridLineThickness / 2;
					// Draw block at the mapped pixel position
					this.drawBlock(block, mappedX, mappedY, this.cellDimensions.x, this.cellDimensions.y);
				}
			}
		}
		this.renderingContext.restore(); // Restores origin to original position
	}

	drawQueue() {
		// If the game state is not set the method cannot continue -> Throw a user friendly error
		if (!this.gameState) throw new Error('No game state to render!');

		// Extract the queue from the gameState, will be fixed length
		const queue = this.gameState.queue.queue;
		// Iterate through the pieces in the queue
		for (let i = 0; i < queue.length; i++) {
			const piece = queue[i];
			// Get the block the piece is made out of
			const block = piece.composingBlock;
			// Get piece shape unrotated
			const shape = piece.getShape(0);
			// Iterate through piece shape array
			for (let j = 0; j < shape.length; j++) {
				const xOffset = (4 - shape[j].length) * this.cellDimensions.x / 2;
				for (let k = 0; k < shape[j].length; k++) {
					if (shape[j][k]) { // Only render a block if it is enabled
						const mappedX = k * this.cellDimensions.x + xOffset;
						// i * 100 means consecutive pieces are 100px apart
						const mappedY = j * this.cellDimensions.y + i * this.cellDimensions.y * 3;
						// Draw block at the mapped pixel position
						this.drawBlock(block, mappedX, mappedY, this.cellDimensions.x, this.cellDimensions.y);
					}
				}
			}
		}
	}

	drawHoldPiece() {
		// If the game state is not set the method cannot continue -> Throw a user friendly error
		if (!this.gameState) throw new Error('No game state to render!');

		const holdPiece = this.gameState.currentHold;
		if (!holdPiece) return; // Stop if hold is empty

		// Get unrotated shape
		const shape = holdPiece.getShape(0);
		// Make block grey if the hold action is on cooldown
		const block = this.gameState.holdOnCooldown ? new Block(130, 130, 130) : holdPiece.composingBlock;
		for (let i = 0; i < shape.length; i++) {
			for (let j = 0; j < shape[i].length; j++) {
				if (shape[i][j]) {
					// Map shape index to pixel coordinates
					const mappedX = j * this.cellDimensions.x + (4 - shape[j].length) * this.cellDimensions.x / 2;
					const mappedY = i * this.cellDimensions.y + (holdPiece.name === 'I' ? 0 : this.cellDimensions.y / 2);
					// Draw block at the mapped pixel position
					this.drawBlock(block, mappedX, mappedY, this.cellDimensions.x, this.cellDimensions.y);
				}
			}
		}
	}

	drawInfo() {
		// If the game state is not set the method cannot continue -> Throw a user friendly error
		if (!this.gameState) throw new Error('No game state to render!');
		// Change font family and colour and align text to center
		this.renderingContext.font = '30px Comfortaa';
		this.renderingContext.fillStyle = 'white';
		this.renderingContext.textAlign = 'center';
		// Move origin so that it is centered horizontally with the grid and 50px bellow the bottom of grid
		this.renderingContext.translate(this.gridPosition.x + this.gridPixelDimensions.x / 2, this.gridPosition.y + this.gridPixelDimensions.y + 35);
		// Draw text at the translated origin
		this.renderingContext.fillText(`${this.gameState.lineCount} Line${this.gameState.lineCount === 1 ? '' : 's'} - Score: ${this.gameState.score}`, 0, 0);
		// Draw player name 50px below other text if there is a player name set
		if (this.gameState.playerName != '') this.renderingContext.fillText(this.gameState.playerName, 0, 35);
	}

	drawDecoration() {
		// If the game state is not set the method cannot continue -> Throw a user friendly error
		if (!this.gameState) throw new Error('No game state to render!');
		this.renderingContext.font = '35px Comfortaa';
		this.renderingContext.textAlign = 'center';
		this.renderingContext.fillStyle = 'white';
		this.renderingContext.lineWidth = 15;
		this.renderingContext.strokeStyle = 'rgb(22, 34, 43)';

		this.renderingContext.save();
		// Translate canvas to the grid position
		this.renderingContext.translate(this.gridPosition.x, this.gridPosition.y);
		// Draw grid background with a stroke/border
		this.renderingContext.fillStyle = 'rgb(40, 52, 61)';
		// Draw rounded rectangle border and then fill
		this.renderingContext.beginPath();
		this.renderingContext.roundRect(0, 0, this.gridPixelDimensions.x, this.gridPixelDimensions.y, 5);
		this.renderingContext.stroke();
		this.renderingContext.fill();
		this.renderingContext.restore();

		const paddingThickness = 5;
		this.renderingContext.save();
		let boxWidth = this.cellDimensions.x * 4 * 0.75 + paddingThickness * 2;
		let boxHeight = 0.75 * 3 * this.cellDimensions.y + paddingThickness * 2;
		// Translate canvas to the hold position
		this.renderingContext.translate(this.holdPosition.x - paddingThickness, this.holdPosition.y - paddingThickness);
		// Draw hold text
		this.renderingContext.fillText('hold', boxWidth / 2, -20);
		// Draw background with a stroke/border
		this.renderingContext.fillStyle = 'rgb(40, 52, 61)';
		this.renderingContext.beginPath();
		this.renderingContext.roundRect(0, 0, boxWidth, boxHeight, 5);
		this.renderingContext.stroke();
		this.renderingContext.fill();
		this.renderingContext.restore();

		this.renderingContext.save();
		boxWidth = this.cellDimensions.x * 4 * 0.75 + paddingThickness * 2;
		boxHeight = 0.75 * 3 * this.cellDimensions.y * this.gameState.queue.queue.length + paddingThickness * 2;
		// Translate canvas to the queue position
		this.renderingContext.translate(this.queuePosition.x - paddingThickness, this.queuePosition.y - paddingThickness * 2);
		// Draw queue text
		this.renderingContext.fillText('queue', boxWidth / 2, -20);
		// Draw background with a stroke/border
		this.renderingContext.fillStyle = 'rgb(40, 52, 61)';
		this.renderingContext.beginPath();
		this.renderingContext.roundRect(0, 0, boxWidth, boxHeight, 5);
		this.renderingContext.stroke();
		this.renderingContext.fill();
		this.renderingContext.restore();
	}

	assignGameState(newGameState: GameState) {
		this.gameState = newGameState;
	}

	render() {
		// Called in increasing Z-order:
		this.renderingContext.save(); // Saves the canvas origin
		this.drawDecoration();
		this.renderingContext.restore();

		this.renderingContext.save();
		this.renderingContext.translate(this.gridPosition.x, this.gridPosition.y); // Translates origin to grid position
		// Draw grid-lines
		this.drawGridBackground();
		// Draw static blocks
		this.drawGridBlocks();
		// Draw the piece the user is currently controlling
		this.drawCurrentPiece();
		this.renderingContext.restore(); // Restores origin to original position

		this.renderingContext.save();
		this.drawInfo();
		this.renderingContext.restore();

		this.renderingContext.save(); // Saves the canvas origin
		this.renderingContext.translate(this.queuePosition.x, this.queuePosition.y); // Translates origin to queue position
		this.renderingContext.scale(0.75, 0.75);
		this.drawQueue();
		this.renderingContext.restore(); // Restores origin to original position

		this.renderingContext.save(); // Saves the canvas origin
		this.renderingContext.translate(this.holdPosition.x, this.holdPosition.y); // Translates origin to hold position
		this.renderingContext.scale(0.75, 0.75);
		this.drawHoldPiece();
		this.renderingContext.restore(); // Restores origin to original position
	}

	clearFrame() {
		this.renderingContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}
}
