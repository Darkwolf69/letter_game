import api from '$lib/api';
import type { GameStateResponse, SubmittedMoveTile, SubmitMoveResponse } from '$lib/types/game';

type ApiMessageResponse = {
	message?: string;
	msg?: string;
};

function isSubmitMoveResponse(data: unknown): data is SubmitMoveResponse {
	return typeof data === 'object' && data !== null && 'valid' in data;
}

function getApiMessage(data: unknown): string {
	const apiMessage = data as ApiMessageResponse;

	return apiMessage.message ?? apiMessage.msg ?? 'Ismeretlen backend válasz érkezett.';
}

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

export async function validateMoveRules(
	gameId: number,
	tiles: SubmittedMoveTile[]
): Promise<SubmitMoveResponse> {
	const response = await api.post<SubmitMoveResponse | ApiMessageResponse>(
		`/games/${gameId}/moves/validate`,
		{ tiles },
		{
			validateStatus: (status) => (status >= 200 && status < 300) || status === 400
		}
	);

	if (!isSubmitMoveResponse(response.data)) {
		throw new Error(getApiMessage(response.data));
	}

	return response.data;
}

export async function submitMove(
	gameId: number,
	tiles: SubmittedMoveTile[]
): Promise<SubmitMoveResponse> {
	const response = await api.post<SubmitMoveResponse | ApiMessageResponse>(
		`/games/${gameId}/moves`,
		{ tiles },
		{
			validateStatus: (status) => (status >= 200 && status < 300) || status === 400
		}
	);

	if (!isSubmitMoveResponse(response.data)) {
		throw new Error(getApiMessage(response.data));
	}

	return response.data;
}
