import Piece from './piece';

export default class PieceQueue {
	// Stores the next queueLength pieces
	queue: Piece[] = [];
	// Stores the complete bag of pieces
	private readonly completeBag: Piece[];
	// Stores the indexes for pieces in completeBag that have yet to appear
	private currentBag: number[] = [];

	constructor(givenBag: Piece[], queueLength: number) {
		this.completeBag = givenBag;
		// Fills the bag with indexes
		this.fillBag();
		// Makes the initial queue the correct length
		for (let i = 0; i < queueLength; i++) {
			this.generateNewPiece();
		}
	}

	getNextPiece() {
		// Get and remove the first piece in the queue
		const next = this.queue.shift();
		// Generate and add another piece to the back of the queue, ensuring the queue is always the same length
		this.generateNewPiece();
		return next!;
	}

	private fillBag() {
		// Fills the currentBag with the indexes of completeBag
		for (let i = 0; i < this.completeBag.length; i++) {
			this.currentBag.push(i);
		}
	}

	private generateNewPiece() {
		// If there are no more remaining pieces, reset the remaining pieces back to the full bag
		if (this.currentBag.length === 0) this.fillBag();
		// Picks a random piece index from the remaining pieces
		const randomIndex = Math.floor(Math.random() * this.currentBag.length);
		// Adds selected piece to back of queue and removes the selected piece from the current bag
		const selectedPiece = this.completeBag[this.currentBag[randomIndex]];
		this.queue.push(selectedPiece);
		this.currentBag.splice(randomIndex, 1);
	}
}
