import Block from './block';
import type KickTable from './kickTable';

export default class Piece {
	readonly composingBlock: Block;
	private shape: boolean[][];
	readonly name: string;
	// Optional as some piece do not have a kick table
	readonly kickTable?: KickTable;

	constructor(shape: boolean[][], block: Block, name: string, kickTable?: KickTable) {
		this.shape = shape;
		this.composingBlock = block;
		this.name = name;
		this.kickTable = kickTable;
	}

	getShape(rotation: number) {
		// Normalises rotation under mod 4 as any other number of
		// 90° rotations would be equivalent to one of these
		rotation %= 4;

		// Set current working shape to the default shape
		let currentShape = structuredClone(this.shape);
		for (let i = 0; i < rotation; i++) { // Repeat for each rotation
			const rotatedShape: boolean[][] = [];
			// Iterate through the columns of the array
			for (let j = 0; j < currentShape[0].length; j++) {
				// For each column get and reverse its rows
				const reversedRow = currentShape.map(row => row[j]).reverse();
				// Append new row to new rotated shape
				rotatedShape.push(reversedRow);
			}
			// Store the result to be returned or rotated again
			currentShape = structuredClone(rotatedShape);
		}
		return currentShape;
	}
}
