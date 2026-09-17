export default class Block {
	readonly colour: [number, number, number];

	constructor(r: number, g: number, b: number) {
		this.colour = [r, g, b];
	}
}
