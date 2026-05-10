import axios from 'axios';

const backendPort = import.meta.env.VITE_EXPRESS_PORT;

const api = axios.create({
	baseURL: `http://localhost:${backendPort}/api`,
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json'
	}
});

export default api;
