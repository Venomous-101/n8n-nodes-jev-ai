export interface IJevQuestionNoul {
	type: 'noul';
	instructions: string;
	criteria?: {
		yes_means?: string;
		no_means?: string;
	};
}

export interface IJevQuestionChoice {
	type: 'choice';
	instructions: string;
	criteria: Record<string, string>;
}

export interface IJevQuestionScore {
	type: 'score';
	instructions: string;
	levels: string[];
}

export type IJevQuestion = IJevQuestionNoul | IJevQuestionChoice | IJevQuestionScore;

export interface IJevAnswerNoul {
	type: 'noul';
	value: boolean;
	probability: number;
}

export interface IJevAnswerChoice {
	type: 'choice';
	value: string;
	probabilities: Record<string, number>;
	confidence: number;
}

export interface IJevAnswerScore {
	type: 'score';
	value: number;
	probability: number;
	confidence: number;
	level?: string;
}

export interface IJevApiResponse {
	model: string;
	answers: Record<string, IJevAnswerNoul | IJevAnswerChoice | IJevAnswerScore>;
	usage?: {
		input_tokens: number;
		output_tokens: number;
	};
}
