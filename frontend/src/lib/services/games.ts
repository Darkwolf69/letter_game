import api from '$lib/api';
import type { GameStateResponse } from '$lib/types/game';

export async function createGame(secondUserId: number): Promise<GameStateResponse> {
	const response = await api.post<GameStateResponse>('/games', { secondUserId });
	return response.data;
}

export async function startGame(gameId: number): Promise<GameStateResponse> {
	const response = await api.post<GameStateResponse>(`/games/${gameId}/start`);
	return response.data;
}

export async function getGameState(gameId: number): Promise<GameStateResponse> {
	const response = await api.get<GameStateResponse>(`/games/${gameId}/state`);
	return response.data;
}
