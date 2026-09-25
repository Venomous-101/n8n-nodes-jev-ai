import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

export async function jevApiRequest(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: any = {},
	query: any = {},
	maxRetries = 3,
): Promise<any> {
	const credentials = await this.getCredentials('jevAiApi');
	const baseUrl = ((credentials.baseUrl as string) || 'https://api.typesafe.ai/v1').replace(/\/+$/, '');

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		body,
		qs: query,
		headers: {
			'Content-Type': 'application/json',
			'User-Agent': 'n8n-nodes-jev-ai/1.0.0',
		},
		json: true,
	};

	let attempt = 0;
	while (true) {
		try {
			attempt++;
			return await this.helpers.httpRequestWithAuthentication.call(this, 'jevAiApi', options);
		} catch (error: any) {
			const statusCode = error.statusCode || error.response?.status;
			// 429 = Rate Limit, 529 = Overloaded
			if ((statusCode === 429 || statusCode === 529) && attempt <= maxRetries) {
				const retryAfterHeader = error.response?.headers?.['retry-after'];
				let waitTimeMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
				if (retryAfterHeader) {
					const seconds = parseInt(retryAfterHeader, 10);
					if (!isNaN(seconds)) {
						waitTimeMs = seconds * 1000;
					}
				}
				await new Promise((resolve) => setTimeout(resolve, waitTimeMs));
				continue;
			}
			throw new NodeApiError(this.getNode(), error);
		}
	}
}

export function formatState(inputState: any): string | Record<string, any> {
	if (inputState === null || inputState === undefined) {
		return '';
	}
	if (typeof inputState === 'string') {
		return inputState;
	}
	if (typeof inputState === 'object') {
		try {
			return JSON.stringify(inputState);
		} catch {
			return String(inputState);
		}
	}
	return String(inputState);
}
