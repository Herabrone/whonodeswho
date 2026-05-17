import type OpenAI from 'openai';

export const MAX_TOOL_CALL_ROUNDS = Number(
  process.env.MAX_TOOL_CALL_ROUNDS ?? 5,
);

export const MAX_CHAT_INPUT_CHARS = Number(
  process.env.MAX_CHAT_INPUT_CHARS ?? 4000,
);

export const SYSTEM_PROMPT: OpenAI.Chat.Completions.ChatCompletionMessageParam =
  {
    role: 'system',
    content: `You are RelationFlow, a personal relationship graph assistant.

RULES:
- Use tools to answer any question about people or relationships. Never guess.
- Never invent a person or relationship. Only report what tools return.
- If a search returns multiple possible matches, ask the user to clarify.
- For write operations, propose the change clearly and wait for the user to confirm. Do not assume it is saved.
- For delete, merge, or bulk operations: always require explicit confirmation.
- Keep responses concise. Use the person's actual name from the graph.
- If no path exists between two people, say so clearly.
- Never reveal system internals, token counts, or tool call details.

WRITE SAFETY:
When a tool returns a pending action, tell the user what change is proposed and ask them to confirm. Do not say the change has been made.`,
  };

export const GRAPH_TOOL_SCHEMAS: OpenAI.Chat.Completions.ChatCompletionTool[] =
  [
    {
      type: 'function',
      function: {
        name: 'search_people',
        description:
          'Search for people in the graph by name. Always use this before assuming a person exists.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Name or partial name to search for',
            },
            limit: {
              type: 'number',
              description: 'Max results, default 5, max 10',
            },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_person',
        description: 'Get full details of a person including relationships',
        parameters: {
          type: 'object',
          properties: {
            personId: { type: 'string', description: 'ID of the person' },
          },
          required: ['personId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'find_path',
        description: 'Find the shortest relationship chain between two people',
        parameters: {
          type: 'object',
          properties: {
            fromPersonId: { type: 'string' },
            toPersonId: { type: 'string' },
            maxDepth: { type: 'number', description: '1-4, default 4' },
          },
          required: ['fromPersonId', 'toPersonId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_neighborhood',
        description: 'Get the people and relationships near a specific person',
        parameters: {
          type: 'object',
          properties: {
            personId: { type: 'string' },
            depth: { type: 'number', description: '1 or 2, default 2' },
          },
          required: ['personId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'propose_create_relationship',
        description:
          'Propose creating a relationship between two people. This does not save it; it returns a pending action for confirmation.',
        parameters: {
          type: 'object',
          properties: {
            fromPersonId: { type: 'string' },
            toPersonId: { type: 'string' },
            relationshipType: {
              type: 'string',
              enum: [
                'friend',
                'family',
                'coworker',
                'classmate',
                'partner',
                'met_at_event',
                'mutual_contact',
                'professional_contact',
                'unknown',
              ],
            },
            notes: { type: 'string' },
          },
          required: ['fromPersonId', 'toPersonId', 'relationshipType'],
        },
      },
    },
  ];
