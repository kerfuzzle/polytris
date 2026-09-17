import { randomBytes } from 'crypto';
import type { Lobby } from './lobby';
import type { ServerWebSocket } from 'bun';
import type { WebSocketData } from '..';
import type { PlayerDataObject } from './multiplayerTyping';

export class Client {
	sessionId: string;
	webSocket: ServerWebSocket<WebSocketData>;
	score = 0;
	stackHeight = 0;
	name: string;
	playerAlive: boolean;
	spectating: boolean;
	lastUpdate: number;
	connectedLobby: Lobby;

	constructor(givenWebSocket: ServerWebSocket<WebSocketData>, givenLobby: Lobby, sessionId: string, givenName: string, isSpectating: boolean, isAlive: boolean) {
		// Fill attributes with passed parameters
		this.webSocket = givenWebSocket;
		this.connectedLobby = givenLobby;
		this.sessionId = sessionId;
		this.name = givenName;
		this.spectating = isSpectating;
		this.playerAlive = isAlive;
		// This is the first update so set it to the current time
		this.lastUpdate = Date.now();
	}

	getDataObject(): PlayerDataObject {
		// Return class data in the correct format
		return { name: this.name, score: this.score, stackHeight: this.stackHeight, isAlive: this.playerAlive, isSpectating: this.spectating };
	}

	static generateSessionId() {
		// Generate 16 random bytes and convert it to a base64 string
		const bytes = randomBytes(16);
		return bytes.toString('base64');
	}
}
