import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	NodeApiError,
	NodeOperationError,
	sleep,
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
	const rawBaseUrl = (credentials.baseUrl as string) || 'https://api.typesafe.ai/v1';
	let parsedBaseUrl: URL;
	try {
		parsedBaseUrl = new URL(rawBaseUrl);
		if (!['http:', 'https:'].includes(parsedBaseUrl.protocol)) {
			throw new Error('Unsupported protocol');
		}
	} catch {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid Base URL provided: "${rawBaseUrl}". Only HTTP and HTTPS protocols are permitted.`,
		);
	}
	const baseUrl = rawBaseUrl.replace(/\/+$/, '');

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		body,
		qs: query,
		headers: {
			'Content-Type': 'application/json',
			'User-Agent': 'n8n-nodes-jev-ai',
		},
		json: true,
	};

	let attempt = 0;
	while (true) {
		try {
			attempt++;
			return await this.helpers.httpRequestWithAuthentication.call(this, 'jevAiApi', options);
		} catch (error: any) {
			const statusCode = error.statusCode || error.httpCode || error.response?.status;
			// Retry on rate limits (429), overload (529), or transient cloud gateways (502, 503, 504)
			const isTransient = [429, 502, 503, 504, 529].includes(statusCode);
			if (isTransient && attempt <= maxRetries) {
				const retryAfterHeader = error.response?.headers?.['retry-after'];
				let waitTimeMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
				if (retryAfterHeader) {
					const seconds = parseInt(retryAfterHeader, 10);
					if (!isNaN(seconds)) {
						waitTimeMs = seconds * 1000;
					}
				}
				await sleep(waitTimeMs);
				continue;
			}
			if (error instanceof NodeApiError || error instanceof NodeOperationError) {
				throw error;
			}
			throw new NodeApiError(this.getNode(), error);
		}
	}
}

const MAX_STATE_CHARACTERS = 2_000_000; // 2MB safety guardrail against memory exhaustion

export function formatState(inputState: any): string {
	if (inputState === null || inputState === undefined) {
		return '';
	}
	let result = '';
	if (typeof inputState === 'string') {
		result = inputState;
	} else if (typeof inputState === 'object') {
		try {
			result = JSON.stringify(inputState);
		} catch {
			result = String(inputState);
		}
	} else {
		result = String(inputState);
	}
	if (result.length > MAX_STATE_CHARACTERS) {
		return result.substring(0, MAX_STATE_CHARACTERS);
	}
	return result;
}
