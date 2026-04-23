export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Flashcards API',
    version: '1.1.0',
    description:
      'REST API for vocabulary flashcards app. Supports translation (any language pair) and definition modes. AI generation and validation use OpenAI (default `gpt-5.4-mini`; set `OPENAI_MODEL` to override).',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Local dev server',
    },
  ],
  tags: [
    { name: 'Health', description: 'Server health check' },
    { name: 'Groups', description: 'CRUD operations for flashcard groups' },
    { name: 'Flashcards', description: 'Update individual flashcards' },
    { name: 'Exam', description: 'Submit exam scores' },
    { name: 'AI', description: 'Generate flashcards and validate answers via OpenAI' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Server is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { ok: { type: 'boolean', example: true } },
                },
              },
            },
          },
        },
      },
    },
    '/api/groups': {
      get: {
        tags: ['Groups'],
        summary: 'List all groups',
        description: 'Returns a summary of every group (id, title, status, mode, languages, card count).',
        responses: {
          '200': {
            description: 'Array of group summaries',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/GroupSummary' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Groups'],
        summary: 'Create a new group',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string', example: 'Travel vocabulary' },
                  mode: { $ref: '#/components/schemas/GroupMode' },
                  frontLang: { type: 'string', example: 'English', default: 'English' },
                  backLang: { type: 'string', example: 'Ukrainian', default: 'Ukrainian' },
                  flashcards: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/FlashcardDraft' },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created group',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FlashcardGroup' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/api/groups/{id}': {
      get: {
        tags: ['Groups'],
        summary: 'Get a group by ID',
        parameters: [{ $ref: '#/components/parameters/GroupId' }],
        responses: {
          '200': {
            description: 'Full group with flashcards',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FlashcardGroup' },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Groups'],
        summary: 'Update a group',
        description:
          'Update title, mode, languages, and/or replace the flashcards list. Existing cards matched by id are merged; new cards get a fresh id.',
        parameters: [{ $ref: '#/components/parameters/GroupId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  mode: { $ref: '#/components/schemas/GroupMode' },
                  frontLang: { type: 'string' },
                  backLang: { type: 'string' },
                  flashcards: {
                    type: 'array',
                    items: {
                      allOf: [
                        { $ref: '#/components/schemas/FlashcardDraft' },
                        {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid', description: 'Pass to update an existing card' },
                            status: { $ref: '#/components/schemas/FlashcardStatus' },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated group',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FlashcardGroup' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Groups'],
        summary: 'Delete a group',
        parameters: [{ $ref: '#/components/parameters/GroupId' }],
        responses: {
          '204': { description: 'Deleted successfully' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/groups/{groupId}/flashcards/{cardId}': {
      patch: {
        tags: ['Flashcards'],
        summary: 'Update a flashcard status',
        parameters: [
          {
            name: 'groupId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'cardId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { $ref: '#/components/schemas/FlashcardStatus' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated flashcard',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Flashcard' },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/groups/{id}/exam/complete': {
      post: {
        tags: ['Exam'],
        summary: 'Submit exam score',
        description:
          'Submit a score between 0 and 1. If score > 0.9, the group status is set to "learnt".',
        parameters: [{ $ref: '#/components/parameters/GroupId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['score'],
                properties: {
                  score: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                    example: 0.95,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Score saved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    group: { $ref: '#/components/schemas/FlashcardGroup' },
                    passed: { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/ai/generate': {
      post: {
        tags: ['AI'],
        summary: 'Generate flashcards with AI',
        description:
          'Calls OpenAI to generate vocabulary flashcards. Supports translation (any language pair) and definition modes.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['topic'],
                properties: {
                  topic: { type: 'string', example: 'travel' },
                  englishLevel: {
                    type: 'string',
                    enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
                    default: 'B1',
                  },
                  count: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 30,
                    default: 10,
                  },
                  mode: { $ref: '#/components/schemas/GroupMode' },
                  frontLang: { type: 'string', default: 'English' },
                  backLang: { type: 'string', default: 'Ukrainian' },
                  preferences: {
                    type: 'string',
                    description: 'Optional hints (e.g. "formal vocabulary", "verbs only")',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Generated flashcards',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    flashcards: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/FlashcardDraft' },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': {
            description: 'Invalid or missing API key',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '429': {
            description: 'OpenAI rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'OPENAI_API_KEY not configured',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '502': {
            description: 'OpenAI returned an unexpected response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/ai/validate-answer': {
      post: {
        tags: ['AI'],
        summary: 'Validate a typed answer',
        description:
          'Checks if the user answer is close enough to the correct answer. Uses exact match, then Levenshtein distance for typos, then OpenAI for synonyms/alternative translations. Supports both translation and definition modes.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userAnswer', 'correctAnswer'],
                properties: {
                  userAnswer: { type: 'string', example: 'подорж' },
                  correctAnswer: { type: 'string', example: 'подорож' },
                  englishWord: { type: 'string', example: 'journey' },
                  mode: { $ref: '#/components/schemas/GroupMode' },
                  frontLang: { type: 'string', default: 'English' },
                  backLang: { type: 'string', default: 'Ukrainian' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Validation result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    correct: { type: 'boolean', example: true },
                    feedback: { type: 'string', example: 'Close enough — minor typo accepted.' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '429': {
            description: 'OpenAI rate limit (falls back to strict)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '502': {
            description: 'AI validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    parameters: {
      GroupId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'Group UUID',
      },
    },
    schemas: {
      FlashcardStatus: {
        type: 'string',
        enum: ['new', 'learning', 'learnt'],
      },
      GroupStatus: {
        type: 'string',
        enum: ['in_progress', 'learnt'],
      },
      GroupMode: {
        type: 'string',
        enum: ['translation', 'definition'],
        default: 'translation',
        description: 'translation = word → translation in another language; definition = word → definition in the same language',
      },
      FlashcardDraft: {
        type: 'object',
        required: ['english', 'back'],
        properties: {
          english: { type: 'string', example: 'journey' },
          back: { type: 'string', example: 'подорож' },
          backKind: { type: 'string', enum: ['translation', 'meaning'], default: 'translation' },
        },
      },
      Flashcard: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          english: { type: 'string', example: 'journey' },
          back: { type: 'string', example: 'подорож' },
          backKind: { type: 'string', enum: ['translation', 'meaning'] },
          status: { $ref: '#/components/schemas/FlashcardStatus' },
        },
      },
      FlashcardGroup: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string', example: 'Travel vocabulary' },
          groupStatus: { $ref: '#/components/schemas/GroupStatus' },
          mode: { $ref: '#/components/schemas/GroupMode' },
          frontLang: { type: 'string', example: 'English' },
          backLang: { type: 'string', example: 'Ukrainian' },
          flashcards: {
            type: 'array',
            items: { $ref: '#/components/schemas/Flashcard' },
          },
        },
      },
      GroupSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          groupStatus: { $ref: '#/components/schemas/GroupStatus' },
          mode: { $ref: '#/components/schemas/GroupMode' },
          frontLang: { type: 'string', example: 'English' },
          backLang: { type: 'string', example: 'Ukrainian' },
          flashcardCount: { type: 'integer', example: 12 },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
    },
  },
}
