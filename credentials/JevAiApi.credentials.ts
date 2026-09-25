import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class JevAiApi implements ICredentialType {
	name = 'jevAiApi';
	displayName = 'Jev AI API';
	documentationUrl = 'https://docs.typesafe.ai';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your TypeSafe Jev API Key. Obtain your key from console.typesafe.ai.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.typesafe.ai/v1',
			required: true,
			description: 'Base endpoint URL for TypeSafe Jev API',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/systemone',
			method: 'POST',
			body: {
				model: 'jev-latest',
				state: 'Health ping connection test',
				questions: {
					status: {
						type: 'noul',
						instructions: 'Is this connection active?',
					},
				},
			},
		},
	};
}
