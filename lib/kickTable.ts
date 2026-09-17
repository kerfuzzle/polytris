import type { Coordinate } from './coordinate';

export type rawData = ([number, number][] | undefined)[][];
export type kickData = (Coordinate[] | undefined)[][];
export default class KickTable {
	private data: kickData;

	constructor(rawData: rawData) {
		// Convert coordinate tuples into Coordinate objects
		this.data = rawData.map(row => row.map((cell) => {
			if (cell == undefined) return undefined;
			else return	cell.map((offset) => {
				// Convert [x, y] into { x: x, y: y } objects
				return { x: offset[0], y: offset[1] };
			});
		}));
	}

	getOffsets(currentRotation: number, targetRotation: number) {
		// Get offset array
		return this.data[currentRotation][targetRotation];
	}
}
