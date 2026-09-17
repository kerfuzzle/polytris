import { URL } from 'url';
import { Lobby, PublicLobby, ROOM_CODE_LENGTH } from './lib/lobby';
import { Client } from './lib/client';
import { UpdateType, type GameStateUpdate, type PiecePlaceUpdate, type UpdateMessage } from './lib/multiplayerTyping';
const lobbies = new Map<string, Lobby>();
// Create the public lobby and at it to the lobby list
const publicLobby = new PublicLobby(lobbies);
lobbies.set(publicLobby.roomCode, publicLobby);
const clients = new Map<string, Client>();

export interface WebSocketData {
	room: string;
	name: string;
	sessionId: string;
};

// Creates a new webserver with bun at port 5173
Bun.serve<WebSocketData>({
	async fetch(req, server) {
		// Splits the URL to get the path section
		const url = new URL(req.url);
		const path = url.pathname;
		if (path === '/') {
			if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });
			// Returns a copy of the static game client
			return new Response(Bun.file('./client/dist/index.html'));
		}
		if (path === '/join') {
			if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });
			const params = url.searchParams;
			// Gets code from url query string
			const requestedCode = params.get('code');
			// No code / code is wrong length -> 400 Bad Request
			if (!requestedCode || requestedCode.length !== ROOM_CODE_LENGTH) return new Response('No 4 character room code given', { status: 400 });
			// Gets username from url query string
			const requestedName = params.get('name');
			// No username / username too long -> 400 Bad Request
			if (!requestedName || requestedName.length === 0 || requestedName.length > 12) return new Response('No username given/Username too long', { status: 400 });
			// Check that a lobby exists with the requested code
			if (!lobbies.has(requestedCode)) return new Response(`No lobby found with code: ${requestedCode}`, { status: 404 });
			// Attempt to upgrade the connection to a WebSocket, attach data to identify client in WebSocket communication
			const result = server.upgrade(req, { data: { room: requestedCode, name: requestedName, sessionId: Client.generateSessionId() } });
			if (result) return;
			else return new Response('Upgrade to websocket failed', { status: 500 });
		}

		if (path === '/create') {
			if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
			// Create a new lobby
			const newLobby = new Lobby(lobbies);
			// Add new lobby to list of lobbies
			lobbies.set(newLobby.roomCode, newLobby);
			console.log(lobbies.keys().toArray().join(', '));
			// Return the room code in a JSON object
			return new Response(JSON.stringify({ code: newLobby.roomCode }), { headers: { 'Content-Type': 'application/json' } });
		}
		// Path does not match a route -> must be CSS/image etc
		const resource = Bun.file('./client/dist' + path);
		// Check that the file exists
		if (await resource.exists()) return new Response(resource);
		// File does not exist -> Return error 404
		return new Response('Resource not found', { status: 404 });
	},
	websocket: {
		open(webSocket) {
			// Get lobby, it definitely exists as we checked right before upgrading the connection
			const lobby = lobbies.get(webSocket.data.room)!;
			// Create new client, add it to the global client list and the lobby's client list
			const newClient = new Client(webSocket, lobby, webSocket.data.sessionId, webSocket.data.name, false, !lobby.gameInProgress);
			clients.set(newClient.sessionId, newClient);
			lobby.addClient(newClient);
			lobby.sendPlayerList();
		},
		message(webSocket, message: string) {
			// Get the client that sent the message by its ID
			const sourceClient = clients.get(webSocket.data.sessionId);
			if (sourceClient === undefined) return; // Rouge message not from a known client, ignore

			// Set the last update timestamp to the current time
			sourceClient.lastUpdate = Date.now();
			// Get lobby client is connected to
			const lobby = sourceClient.connectedLobby;
			// Parse JSON string into object
			const messageObject = JSON.parse(message) as UpdateMessage;
			const messageType = messageObject.updateType;

			if (messageType === UpdateType.PIECE_PLACE) {
				const data = messageObject.data as PiecePlaceUpdate;
				// Piece was placed, update the server side copy of the clients score and stack height
				sourceClient.score = data.score;
				sourceClient.stackHeight = data.stackHeight;

				// Only try and distribute garbage if there was lines cleared
				if (data.linesCleared !== 0) {
					// Only send garbage to alive players
					const alivePlayers = lobby.clients.filter(client => client.playerAlive && !client.spectating);
					// Calculate the amount of garbage per client (evenly distributed around other clients)
					const garbagePerClient = Math.ceil(data.linesCleared / (alivePlayers.length - 1));
					lobby.sendGarbage(garbagePerClient, sourceClient);
				}
			}
			else if (messageType === UpdateType.GAME_STATE) {
				const data = messageObject.data as GameStateUpdate;
				// Update the state values for the client
				sourceClient.playerAlive = data.isAlive;
				sourceClient.spectating = data.isSpectating;
				// Since we could've just set the penultimate player's isAlive = false, there could be a winner -> check for a winner
				lobby.checkForWin();
			}
			else if (messageType === UpdateType.REQUEST_START) {
				// Filter to only players which are not spectating
				const participatingPlayers = lobby.clients.filter(client => !client.spectating);
				// If there is less than two players in the lobby then the game cannot start -> ignore the request
				if (participatingPlayers.length < 2 || lobby.gameInProgress) return;
				else lobby.startGame();
			}

			// Send out updated player info
			lobby.sendPlayerList();
		},
		close(webSocket) {
			// Get the client that sent the message by its ID
			const sourceClient = clients.get(webSocket.data.sessionId);
			if (sourceClient === undefined) return; // Rouge message not from a known client, ignore

			// Remove client from client list
			clients.delete(webSocket.data.sessionId);
			// Remove client from the lobby they are connected to
			const clientIndex = sourceClient.connectedLobby.clients.indexOf(sourceClient);
			sourceClient.connectedLobby.clients.splice(clientIndex, 1);
			// Send updated player list to all players
			sourceClient.connectedLobby.sendPlayerList();
			// Check for win in that lobby
			sourceClient.connectedLobby.checkForWin();
		},
	},
	port: 5173,
});
