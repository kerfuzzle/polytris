export enum UpdateType {
	PLAYER_LIST, PIECE_PLACE, GARBAGE, GAME_STATE, GAME_RESULTS, REQUEST_START, GAME_START,
}

export interface PlayerDataObject { name: string; score: number; stackHeight: number; isAlive: boolean; isSpectating: boolean }

export interface PlayerListUpdate { gameInProgress: boolean; players: PlayerDataObject[] }; // PLAYER_LIST
export interface PiecePlaceUpdate { score: number; stackHeight: number; linesCleared: number } // PIECE_PLACE
export interface GarbageUpdate { lines: number; source: PlayerDataObject } // GARBAGE
export interface GameStateUpdate { isAlive: boolean; isSpectating: boolean } // GAME_STATE
export interface GameResultsUpdate { winner: PlayerDataObject } // GAME_RESULTS
export type RequestStartUpdate = undefined; // REQUEST START
export type GameStartUpdate = PlayerDataObject[]; // GAME_START
export type UpdateData =
	PlayerListUpdate | PiecePlaceUpdate
	| GarbageUpdate | GameStateUpdate
	| GameResultsUpdate | RequestStartUpdate
	| GameStartUpdate; // Union type of all the other update types

export interface UpdateMessage {
	updateType: UpdateType;
	data: UpdateData;
}
