import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, jsonParse } from 'n8n-workflow';
import { formatState, jevApiRequest } from './GenericFunctions';
import type { IJevApiResponse } from './types';

export class JevAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Jev AI',
		name: 'jevAi',
		icon: 'file:jevai.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description:
			'Execute fast, calibrated System-1 decisions, intelligent routing, and policy guardrails with TypeSafe Jev AI',
		defaults: {
			name: 'Jev AI',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: `={{
			((params) => {
				if (params.operation === 'route') {
					const routesParam = params.routes || {};
					const routes = routesParam.values || [];
					const outputs = routes.map((r, i) => ({
						type: 'main',
						displayName: r.name || 'Route ' + (i + 1),
					}));
					if (params.lowConfidenceHandling !== 'sendToBestRouteAnyway') {
						outputs.push({ type: 'main', displayName: 'Low Confidence' });
					}
					return outputs.length > 0 ? outputs : [{ type: 'main' }];
				}
				if (params.operation === 'guardrail' && params.actionOnViolation === 'splitOutput') {
					return [
						{ type: 'main', displayName: 'Passed' },
						{ type: 'main', displayName: 'Violated' }
					];
				}
				return [{ type: 'main' }];
			})($parameter)
		}}`,
		credentials: [
			{
				name: 'jevAiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Ask Questions',
						value: 'askQuestions',
						description:
							'Ask structured typed questions (Choice, Score, Noul) with calibrated confidence',
						action: 'Ask structured questions with calibrated confidence',
					},
					{
						name: 'Route by Choice',
						value: 'route',
						description:
							'Evaluate state and dynamically route item to corresponding output branch',
						action: 'Route item dynamically based on Jev decision',
					},
					{
						name: 'Policy Guardrail',
						value: 'guardrail',
						description:
							'Verify safety, compliance, or hallucination criteria on text or LLM outputs',
						action: 'Check safety and compliance guardrails',
					},
				],
				default: 'askQuestions',
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'string',
				default: 'jev-latest',
				description: 'The TypeSafe Jev model version to invoke (e.g. jev-latest, jev-1.13.0)',
			},
			{
				displayName: 'State / Input Data',
				name: 'state',
				type: 'string',
				default: '={{ $json }}',
				required: true,
				description:
					'The text or JSON state to evaluate. Jev reads this state to answer questions.',
			},

			// --------------------------------------------------------------------------------
			// Operation: askQuestions
			// --------------------------------------------------------------------------------
			{
				displayName: 'Define Questions',
				name: 'defineQuestions',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['askQuestions'],
					},
				},
				options: [
					{
						name: 'Using Form Builder',
						value: 'ui',
						description: 'Add questions individually with intuitive UI fields',
					},
					{
						name: 'Using JSON',
						value: 'json',
						description: 'Paste a questions object matching the TypeSafe API schema',
					},
				],
				default: 'ui',
			},
			{
				displayName: 'Questions',
				name: 'questionsUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['askQuestions'],
						defineQuestions: ['ui'],
					},
				},
				placeholder: 'Add Question',
				default: {
					values: [
						{
							id: 'category',
							type: 'choice',
							instructions: 'What category does this text belong to?',
							choiceOptions: 'support: Customer support requests\nbilling: Invoices, refunds, and payments\nsales: Inquiries about purchasing or upgrades',
						},
					],
				},
				options: [
					{
						name: 'values',
						displayName: 'Question',
						values: [
							{
								displayName: 'Output Property ID',
								name: 'id',
								type: 'string',
								default: 'category',
								required: true,
								description: 'Field name where this answer will be written in the output',
							},
							{
								displayName: 'Answer Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Choice (Multi-Class Selection)',
										value: 'choice',
										description: 'Select one option from a defined set with confidence score',
									},
									{
										name: 'Score (Rubric / Level)',
										value: 'score',
										description: 'Rate along an ordered scale or rubric',
									},
									{
										name: 'Noul (Yes/No Probability)',
										value: 'noul',
										description: 'Boolean judgment with calibrated 0-1 probability',
									},
								],
								default: 'choice',
							},
							{
								displayName: 'Instructions',
								name: 'instructions',
								type: 'string',
								default: '',
								required: true,
								description: 'The exact question for Jev to evaluate on the state',
							},
							{
								displayName: 'Choices (One Per Line)',
								name: 'choiceOptions',
								type: 'string',
								typeOptions: {
									rows: 4,
								},
								displayOptions: {
									show: {
										type: ['choice'],
									},
								},
								default: '',
								placeholder: 'billing: Payments and invoices\ntech: Technical bugs\nsales: Product inquiries',
								description: 'Format: "option_key: description" per line. Jev picks the most fitting option.',
							},
							{
								displayName: 'Score Levels (Lowest First)',
								name: 'scoreLevels',
								type: 'string',
								typeOptions: {
									rows: 4,
								},
								displayOptions: {
									show: {
										type: ['score'],
									},
								},
								default: '1: Low\n2: Moderate\n3: High\n4: Critical',
								description: 'One level per line, from lowest to highest score',
							},
							{
								displayName: 'Yes Means',
								name: 'yesMeans',
								type: 'string',
								displayOptions: {
									show: {
										type: ['noul'],
									},
								},
								default: '',
								description: 'Optional guidance on when the answer should be evaluated as Yes',
							},
							{
								displayName: 'No Means',
								name: 'noMeans',
								type: 'string',
								displayOptions: {
									show: {
										type: ['noul'],
									},
								},
								default: '',
								description: 'Optional guidance on when the answer should be evaluated as No',
							},
						],
					},
				],
			},
			{
				displayName: 'Questions JSON',
				name: 'questionsJson',
				type: 'json',
				displayOptions: {
					show: {
						operation: ['askQuestions'],
						defineQuestions: ['json'],
					},
				},
				default:
					'{\n  "is_urgent": {\n    "type": "noul",\n    "instructions": "Does this need immediate attention?"\n  }\n}',
				required: true,
				description: 'Valid questions JSON object mapping field names to question schemas',
			},

			// --------------------------------------------------------------------------------
			// Operation: route
			// --------------------------------------------------------------------------------
			{
				displayName: 'Routing Instructions',
				name: 'routeInstructions',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['route'],
					},
				},
				default: 'Which route best fits this item?',
				required: true,
				description: 'Instructions explaining how Jev should choose between the routes',
			},
			{
				displayName: 'Routes',
				name: 'routes',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['route'],
					},
				},
				placeholder: 'Add Route',
				default: {
					values: [
						{
							name: 'billing',
							description: 'Payments, subscriptions, charges, refunds',
						},
						{
							name: 'technical',
							description: 'System bugs, outages, crashes, API errors',
						},
						{
							name: 'sales',
							description: 'Pricing, new licenses, enterprise plans',
						},
					],
				},
				options: [
					{
						name: 'values',
						displayName: 'Route',
						values: [
							{
								displayName: 'Route Name (Output Name)',
								name: 'name',
								type: 'string',
								default: '',
								required: true,
								description: 'Identifier for this branch. Becomes the canvas output label.',
							},
							{
								displayName: 'Criteria / Use When',
								name: 'description',
								type: 'string',
								default: '',
								required: true,
								description: 'Clear description of what should be routed to this branch',
							},
						],
					},
				],
			},
			{
				displayName: 'Low Confidence Handling',
				name: 'lowConfidenceHandling',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['route'],
					},
				},
				options: [
					{
						name: 'Send to Low Confidence Output',
						value: 'sendToLowConfidenceOutput',
						description: 'Add an extra output for items below the confidence threshold',
					},
					{
						name: 'Send to Best Route Anyway',
						value: 'sendToBestRouteAnyway',
						description: 'Always route to the highest-probability branch',
					},
				],
				default: 'sendToLowConfidenceOutput',
			},
			{
				displayName: 'Confidence Threshold',
				name: 'routeConfidenceThreshold',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberStepSize: 0.05,
				},
				displayOptions: {
					show: {
						operation: ['route'],
						lowConfidenceHandling: ['sendToLowConfidenceOutput'],
					},
				},
				default: 0.6,
				description:
					'Items with top route confidence below this value will be sent to the Low Confidence output',
			},

			// --------------------------------------------------------------------------------
			// Operation: guardrail
			// --------------------------------------------------------------------------------
			{
				displayName: 'Policy Criteria / Rules',
				name: 'policyCriteria',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				displayOptions: {
					show: {
						operation: ['guardrail'],
					},
				},
				default:
					'Check whether this text violates company safety policies, reveals private secrets, or contains toxic language',
				required: true,
				description:
					'Rule or policy to test against. Jev evaluates if the state satisfies or violates this policy.',
			},
			{
				displayName: 'Action on Violation',
				name: 'actionOnViolation',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['guardrail'],
					},
				},
				options: [
					{
						name: 'Split into Passed / Violated Outputs',
						value: 'splitOutput',
						description: 'Routes compliant items to output 1 and violations to output 2',
					},
					{
						name: 'Stop Workflow with Error',
						value: 'throwError',
						description: 'Halts workflow execution if a violation is detected',
					},
					{
						name: 'Flag in Output Only',
						value: 'flagOnly',
						description: 'Adds jev_guardrail boolean and risk metrics to output JSON',
					},
				],
				default: 'splitOutput',
			},
			{
				displayName: 'Violation Probability Threshold',
				name: 'guardrailThreshold',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberStepSize: 0.05,
				},
				displayOptions: {
					show: {
						operation: ['guardrail'],
					},
				},
				default: 0.7,
				description:
					'Probability threshold above which an item is considered a policy violation',
			},

			// --------------------------------------------------------------------------------
			// Common Options
			// --------------------------------------------------------------------------------
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Simplify Output',
						name: 'simplifyOutput',
						type: 'boolean',
						default: true,
						description:
							'Whether to flatten question answers and probabilities into clean top-level fields',
					},
					{
						displayName: 'Include Input Fields',
						name: 'includeInputFields',
						type: 'boolean',
						default: true,
						description: 'Whether to preserve existing fields from incoming items',
					},
					{
						displayName: 'Output Field',
						name: 'outputField',
						type: 'string',
						default: 'jev',
						description: 'The property key in output where Jev results will be stored',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						type: 'number',
						default: 3,
						description: 'Number of automatic retries on rate limits (429) or service load (529)',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;
		const model = this.getNodeParameter('model', 0) as string;

		// Calculate output ports
		let outputCount = 1;
		let routeNames: string[] = [];
		let hasLowConfidencePort = false;

		if (operation === 'route') {
			const routeFields = this.getNodeParameter('routes.values', 0, []) as Array<{
				name?: string;
				description?: string;
			}>;
			routeNames = routeFields.map((r) => (r.name ?? '').trim());
			hasLowConfidencePort =
				this.getNodeParameter('lowConfidenceHandling', 0) !== 'sendToBestRouteAnyway';
			outputCount = routeNames.length + (hasLowConfidencePort ? 1 : 0);
		} else if (operation === 'guardrail') {
			const action = this.getNodeParameter('actionOnViolation', 0) as string;
			if (action === 'splitOutput') {
				outputCount = 2; // [Passed, Violated]
			}
		}

		const returnData: INodeExecutionData[][] = Array.from(
			{ length: Math.max(outputCount, 1) },
			() => [],
		);

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const stateParam = this.getNodeParameter('state', itemIndex);
				const formattedState = formatState(stateParam);

				const options = this.getNodeParameter('options', itemIndex, {}) as {
					simplifyOutput?: boolean;
					includeInputFields?: boolean;
					outputField?: string;
					maxRetries?: number;
				};

				const simplifyOutput = options.simplifyOutput ?? true;
				const includeInput = options.includeInputFields ?? true;
				const outputField = options.outputField || 'jev';
				const maxRetries = options.maxRetries ?? 3;

				// ----------------------------------------------------------------------------
				// 1. Ask Questions
				// ----------------------------------------------------------------------------
				if (operation === 'askQuestions') {
					const defineQuestions = this.getNodeParameter(
						'defineQuestions',
						itemIndex,
					) as string;

					let questionsPayload: Record<string, any> = {};

					if (defineQuestions === 'json') {
						const rawJson = this.getNodeParameter('questionsJson', itemIndex) as string | object;
						if (typeof rawJson === 'string') {
							try {
								questionsPayload = jsonParse(rawJson);
							} catch {
								throw new NodeOperationError(
									this.getNode(),
									'Questions JSON is not valid JSON format',
									{ itemIndex },
								);
							}
						} else {
							questionsPayload = rawJson as Record<string, any>;
						}
					} else {
						const questionsUi = this.getNodeParameter(
							'questionsUi.values',
							itemIndex,
							[],
						) as Array<{
							id: string;
							type: 'choice' | 'score' | 'noul';
							instructions: string;
							choiceOptions?: string;
							scoreLevels?: string;
							yesMeans?: string;
							noMeans?: string;
						}>;

						if (questionsUi.length === 0) {
							throw new NodeOperationError(
								this.getNode(),
								'Please define at least one question in the form builder',
								{ itemIndex },
							);
						}

						for (const q of questionsUi) {
							const id = q.id.trim();
							if (!id) continue;

							if (q.type === 'choice') {
								const criteria: Record<string, string> = {};
								const lines = (q.choiceOptions || '')
									.split('\n')
									.map((l) => l.trim())
									.filter(Boolean);
								for (const line of lines) {
									const colonIdx = line.indexOf(':');
									if (colonIdx !== -1) {
										const key = line.slice(0, colonIdx).trim();
										const desc = line.slice(colonIdx + 1).trim();
										criteria[key] = desc;
									} else {
										criteria[line] = line;
									}
								}
								questionsPayload[id] = {
									type: 'choice',
									instructions: q.instructions,
									criteria,
								};
							} else if (q.type === 'score') {
								const levels = (q.scoreLevels || '')
									.split('\n')
									.map((l) => l.trim())
									.filter(Boolean);
								questionsPayload[id] = {
									type: 'score',
									instructions: q.instructions,
									levels,
								};
							} else if (q.type === 'noul') {
								const criteria: Record<string, string> = {};
								if (q.yesMeans) criteria.yes_means = q.yesMeans;
								if (q.noMeans) criteria.no_means = q.noMeans;

								questionsPayload[id] = {
									type: 'noul',
									instructions: q.instructions,
									...(Object.keys(criteria).length > 0 ? { criteria } : {}),
								};
							}
						}
					}

					const requestBody = {
						model,
						state: formattedState,
						questions: questionsPayload,
					};

					const response: IJevApiResponse = await jevApiRequest.call(
						this,
						'POST',
						'/systemone',
						requestBody,
						{},
						maxRetries,
					);

					let resultData: Record<string, any> = {};

					if (simplifyOutput && response.answers) {
						for (const [key, answer] of Object.entries(response.answers)) {
							resultData[key] = answer.value;
							if ('confidence' in answer && answer.confidence !== undefined) {
								resultData[`${key}_confidence`] = answer.confidence;
							}
							if ('probability' in answer && answer.probability !== undefined) {
								resultData[`${key}_probability`] = answer.probability;
							}
							if ('probabilities' in answer && answer.probabilities !== undefined) {
								resultData[`${key}_probabilities`] = answer.probabilities;
							}
							if ('level' in answer && answer.level !== undefined) {
								resultData[`${key}_level`] = answer.level;
							}
						}
						resultData._model = response.model;
						if (response.usage) {
							resultData._usage = response.usage;
						}
					} else {
						resultData = response as any;
					}

					const newItem: INodeExecutionData = {
						json: includeInput
							? { ...items[itemIndex].json, [outputField]: resultData }
							: { [outputField]: resultData },
						pairedItem: { item: itemIndex },
					};

					returnData[0].push(newItem);
				}

				// ----------------------------------------------------------------------------
				// 2. Route by Choice
				// ----------------------------------------------------------------------------
				else if (operation === 'route') {
					const routeInstructions = this.getNodeParameter(
						'routeInstructions',
						itemIndex,
					) as string;
					const routeFields = this.getNodeParameter('routes.values', itemIndex, []) as Array<{
						name: string;
						description: string;
					}>;
					const threshold = this.getNodeParameter(
						'routeConfidenceThreshold',
						itemIndex,
						0.6,
					) as number;

					if (routeFields.length < 2) {
						throw new NodeOperationError(
							this.getNode(),
							'Route by Choice requires at least 2 routes configured',
							{ itemIndex },
						);
					}

					const criteria: Record<string, string> = {};
					for (const r of routeFields) {
						const name = (r.name || '').trim();
						if (name) {
							criteria[name] = r.description || name;
						}
					}

					const requestBody = {
						model,
						state: formattedState,
						questions: {
							route_choice: {
								type: 'choice',
								instructions: routeInstructions,
								criteria,
							},
						},
					};

					const response: IJevApiResponse = await jevApiRequest.call(
						this,
						'POST',
						'/systemone',
						requestBody,
						{},
						maxRetries,
					);

					const choiceAnswer = response.answers?.route_choice as any;
					const selectedRoute = choiceAnswer?.value as string;
					const confidence = choiceAnswer?.confidence ?? 1.0;
					const isLowConfidence = hasLowConfidencePort && confidence < threshold;

					let targetPortIndex = routeNames.indexOf(selectedRoute);
					if (targetPortIndex === -1) {
						targetPortIndex = 0; // Fallback to first branch if choice unrecognized
					}

					if (isLowConfidence) {
						// Last port is reserved for Low Confidence
						targetPortIndex = routeNames.length;
					}

					const routingResult = {
						route: selectedRoute,
						confidence,
						lowConfidence: isLowConfidence,
						probabilities: choiceAnswer?.probabilities || {},
						_model: response.model,
					};

					const newItem: INodeExecutionData = {
						json: includeInput
							? { ...items[itemIndex].json, [outputField]: routingResult }
							: { [outputField]: routingResult },
						pairedItem: { item: itemIndex },
					};

					if (returnData[targetPortIndex]) {
						returnData[targetPortIndex].push(newItem);
					} else {
						returnData[0].push(newItem);
					}
				}

				// ----------------------------------------------------------------------------
				// 3. Policy Guardrail
				// ----------------------------------------------------------------------------
				else if (operation === 'guardrail') {
					const policyCriteria = this.getNodeParameter('policyCriteria', itemIndex) as string;
					const action = this.getNodeParameter('actionOnViolation', itemIndex) as string;
					const threshold = this.getNodeParameter('guardrailThreshold', itemIndex, 0.7) as number;

					const requestBody = {
						model,
						state: formattedState,
						questions: {
							policy_violation: {
								type: 'noul',
								instructions: `Does this content VIOLATE the following policy: "${policyCriteria}"?`,
								criteria: {
									yes_means: 'The state violates the policy or contains unsafe material',
									no_means: 'The state complies with the policy and is safe',
								},
							},
						},
					};

					const response: IJevApiResponse = await jevApiRequest.call(
						this,
						'POST',
						'/systemone',
						requestBody,
						{},
						maxRetries,
					);

					const violationAnswer = response.answers?.policy_violation as any;
					const violationProbability = violationAnswer?.probability ?? 0;
					const isViolated = violationProbability >= threshold;

					if (isViolated && action === 'throwError') {
						throw new NodeOperationError(
							this.getNode(),
							`Jev Guardrail violation detected (probability: ${(violationProbability * 100).toFixed(1)}%). Policy: "${policyCriteria}"`,
							{ itemIndex },
						);
					}

					const guardrailResult = {
						passed: !isViolated,
						violation_probability: violationProbability,
						threshold,
						policy: policyCriteria,
						_model: response.model,
					};

					const newItem: INodeExecutionData = {
						json: includeInput
							? { ...items[itemIndex].json, [outputField]: guardrailResult }
							: { [outputField]: guardrailResult },
						pairedItem: { item: itemIndex },
					};

					if (action === 'splitOutput') {
						// Port 0: Passed, Port 1: Violated
						const targetPort = isViolated ? 1 : 0;
						returnData[targetPort].push(newItem);
					} else {
						returnData[0].push(newItem);
					}
				}
			} catch (error: any) {
				if (this.continueOnFail()) {
					returnData[0].push({
						json: {
							error: error.message,
						},
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw error;
			}
		}

		return returnData;
	}
}
