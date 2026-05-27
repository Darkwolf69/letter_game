import api from './api.js';

export const getUserStatus = async () => {
	try {
		const res = await api.get('/me');
		return res.data.user;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (e: any) {
		if (e.response && e.response.status === 401) {
			return null;
		}
		throw e;
	}
};
