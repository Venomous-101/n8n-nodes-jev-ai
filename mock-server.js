const http = require('http');

const PORT = 3000;

const server = http.createServer((req, res) => {
	res.setHeader('Content-Type', 'application/json');

	if (req.method === 'POST' && req.url.includes('/systemone')) {
		let body = '';
		req.on('data', (chunk) => (body += chunk));
		req.on('end', () => {
			let parsed = {};
			try {
				parsed = JSON.parse(body || '{}');
			} catch {}

			const questions = parsed.questions || {};
			const answers = {};

			for (const [key, q] of Object.entries(questions)) {
				if (q.type === 'noul') {
					answers[key] = {
						type: 'noul',
						value: true,
						probability: 0.98,
					};
				} else if (q.type === 'choice') {
					const criteria = q.criteria || {};
					const choiceKeys = Object.keys(criteria);
					const chosen = choiceKeys.includes('billing') ? 'billing' : (choiceKeys[0] || 'billing');
					const probs = {};
					choiceKeys.forEach((k) => (probs[k] = k === chosen ? 0.95 : 0.02));
					if (!probs[chosen]) probs[chosen] = 0.95;

					answers[key] = {
						type: 'choice',
						value: chosen,
						confidence: 0.95,
						probabilities: probs,
					};
				} else if (q.type === 'score') {
					answers[key] = {
						type: 'score',
						value: 3,
						probability: 0.91,
						confidence: 0.93,
						level: 'High',
					};
				}
			}

			// If health check ping from n8n credential test
			if (Object.keys(answers).length === 0) {
				answers.status = {
					type: 'noul',
					value: true,
					probability: 0.99,
				};
			}

			const responsePayload = {
				model: 'jev-1.13.0',
				answers,
				usage: {
					input_tokens: 34,
					output_tokens: 0,
				},
			};

			console.log(`[Jev AI Mock] Handled ${req.method} ${req.url} -> 200 OK`);
			res.writeHead(200);
			res.end(JSON.stringify(responsePayload));
		});
	} else {
		res.writeHead(200);
		res.end(JSON.stringify({ status: 'ok', service: 'TypeSafe Jev AI Sandbox' }));
	}
});

server.listen(PORT, '0.0.0.0', () => {
	console.log(`=======================================================`);
	console.log(`🚀 TypeSafe Jev AI Mock Server running on port ${PORT}!`);
	console.log(`👉 Endpoint: http://localhost:${PORT}/v1`);
	console.log(`👉 Docker n8n Endpoint: http://host.docker.internal:${PORT}/v1`);
	console.log(`=======================================================`);
});
