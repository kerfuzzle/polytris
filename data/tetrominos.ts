import Piece from '../lib/piece';
import Block from '../lib/block';
import type { rawData } from '../lib/kickTable';
import KickTable from '../lib/kickTable';
const JLSTZData = [
	// 0 -> 0	0 -> 1											0 -> 2												0 -> 3
	[undefined, [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], [[0, 0], [0, -1], [1, -1], [-1, -1], [1, 0], [-1, 0]], [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]],
	// 1 -> 0									1 -> 1		1 -> 2										1 -> 3
	[[[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], undefined, [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], [[0, 0], [1, 0], [1, -2], [1, -1], [0, -2], [0, -1]]],
	// 2 -> 0										2 -> 1										// 2 -> 2	 // 2 -> 3
	[[[0, 0], [0, 1], [-1, 1], [1, 1], [-1, 0], [1, 0]], [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], undefined, [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]],
	// 3-> 0										3 -> 1												3 -> 2										  3 -> 3
	[[[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], [[0, 0], [-1, 0], [-1, -2], [-1, -1], [0, -2], [0, -1]], [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], undefined],
] as rawData;

const IData = [
	// 0 -> 0	0 -> 1										  0 -> 2   0 -> 3
	[undefined, [[0, 0], [1, 0], [-2, 0], [-2, 1], [1, -2]], [[0, 0]], [[0, 0], [-1, 0], [2, 0], [2, 1], [1, -2]]],
	// 1 -> 0									  1 -> 1	 1 -> 2										   1 -> 3
	[[[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]], undefined, [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]], [[0, 0]]],
	// 2 -> 0 // 2 -> 1									  2 -> 2     2 -> 3
	[[[0, 0]], [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], undefined, [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]]],
	// 3 -> 0									   3 -> 1	3 -> 2										 3 -> 3
	[[[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]], [[0, 0]], [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], undefined],
] as rawData;

const IKickTable = new KickTable(IData);
const JLSTZKickTable = new KickTable(JLSTZData);

const tPiece = new Piece([
	[false, true, false],
	[true, true, true],
	[false, false, false],
], new Block(255, 73, 73), 'T', JLSTZKickTable);

const sPiece = new Piece([
	[false, true, true],
	[true, true, false],
	[false, false, false],
], new Block(78, 205, 196), 'S', JLSTZKickTable);

const zPiece = new Piece([
	[true, true, false],
	[false, true, true],
	[false, false, false],
], new Block(255, 132, 100), 'Z', JLSTZKickTable);

const oPiece = new Piece([
	[true, true],
	[true, true],
], new Block(255, 170, 69), 'O');

const lPiece = new Piece([
	[false, false, true],
	[true, true, true],
	[false, false, false],
], new Block(133, 120, 252), 'L', JLSTZKickTable);

const jPiece = new Piece([
	[true, false, false],
	[true, true, true],
	[false, false, false],
], new Block(199, 244, 100), 'J', JLSTZKickTable);

const iPiece = new Piece([
	[false, false, false, false],
	[true, true, true, true],
	[false, false, false, false],
	[false, false, false, false],
], new Block(211, 121, 142), 'I', IKickTable);

const tetrominoBag = [tPiece, sPiece, zPiece, oPiece, lPiece, jPiece, iPiece];
export default tetrominoBag;
