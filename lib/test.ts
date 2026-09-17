import GameState from './gameState';
import tetrominoBag from '../data/tetrominos';

const piece = tetrominoBag[0];
for (let i = 0; i < 4; i++) {
	console.log(piece.getShape(i));
}
