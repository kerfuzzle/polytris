export const ROOM_CODE_LENGTH = 4;
import { Client } from './client';
import { UpdateType } from './multiplayerTyping';

export class Lobby {
	roomCode: string;
	// New room, no clients
	clients: Client[] = [];
	// No game is running when the room is created
	gameInProgress = false;

	constructor(currentLobbies: Map<string, Lobby>) {
		// Generate a random code
		this.roomCode = Lobby.generateCode(ROOM_CODE_LENGTH);
		// If code is already in use, repeatedly generate codes until one is not already in use
		while (currentLobbies.has(this.roomCode)) this.roomCode = Lobby.generateCode(ROOM_CODE_LENGTH);
	}

	addClient(newClient: Client) {
		// Stop if there is already a client with the same ID as this will be a duplicate
		if (this.clients.some(client => client.sessionId === newClient.sessionId)) return;
		else this.clients.push(newClient);
	}

	sendGarbage(amount: number, sourceClient: Client) {
		// Prepare update JSON with number of lines cleared and source to send to clients
		const updateJSON = JSON.stringify({ updateType: UpdateType.GARBAGE, data: { lines: amount, source: sourceClient.getDataObject() } });
		// Iterate through all clients
		this.clients.forEach((client) => {
			// Don't send garbage back to the source client or dead/specating players
			if (client !== sourceClient && !client.spectating && client.playerAlive) {
				client.webSocket.send(updateJSON);
			}
		});
	}

	sendPlayerList() {
		// Convert client list to the correct format to be sent over the WebSocket
		const playerList = this.clients.map(c => c.getDataObject());
		// Parse into JSON and send to all clients
		const updateJSON = JSON.stringify({ updateType: UpdateType.PLAYER_LIST, data: { gameInProgress: this.gameInProgress, players: playerList } });
		this.clients.forEach(client => client.webSocket.send(updateJSON));
	}

	checkForWin() {
		// If a game isn't in progress then no-one can have one
		if (!this.gameInProgress) return;

		// Filter out clients that are dead or spectating
		const aliveClients = this.clients.filter(c => c.playerAlive && !c.spectating);
		if (aliveClients.length === 1) {
			// Only one client matches the criteria, they must be the winner
			const winner = aliveClients[0];
			// Send results update to all clients
			const updateJSON = JSON.stringify({ updateType: UpdateType.GAME_RESULTS, data: { winner: winner.getDataObject() } });
			this.clients.forEach(client => client.webSocket.send(updateJSON));
			// Mark the game as completed
			this.gameInProgress = false;
		}
	}

	startGame() {
		// Mark the game as in progress
		this.gameInProgress = true;
		// Reset all clients info
		this.clients.forEach((client) => {
			client.score = 0;
			client.stackHeight = 0;
			client.playerAlive = !client.spectating;
		});

		// Send out up-to-date player list
		const playerList = this.clients.map(c => c.getDataObject());
		const updateJSON = JSON.stringify({ updateType: UpdateType.GAME_START, data: playerList });
		this.clients.forEach(client => client.webSocket.send(updateJSON));
	}

	static generateCode(length: number) {
		let result = '';
		for (let i = 0; i < length; i++) { // Runs length times
			// ASCII A is 65, Z is 90
			// Generate a random character code (65 to 90)
			const charCode = 65 + Math.floor(Math.random() * 26);
			// Convert code to chracter and concatenate it to result
			result += String.fromCharCode(charCode);
		}
		return result;
	}
}

export class PublicLobby extends Lobby {
	constructor(currentLobbies: Map<string, Lobby>) {
		super(currentLobbies);
		// Override the room code to be 0000
		this.roomCode = '0000';
	}
}
