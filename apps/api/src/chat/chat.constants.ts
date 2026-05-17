import type OpenAI from 'openai';

const TOOL_ERROR_GUIDANCE = `

TOOL ERRORS:
- Every tool result includes ok, data/error, and meta fields.
- If ok is false, inspect error.code and respond accordingly.
- PERSON_NOT_FOUND: tell the user the person was not found and suggest a search or clarification.
- DUPLICATE_RELATIONSHIP: explain what already exists and do not propose the same write again.
- INVALID_RELATIONSHIP_TYPE: ask the user to restate the relationship more clearly.
- VALIDATION_ERROR: explain what input was invalid and ask for clarification.
- INTERNAL_ERROR: apologize briefly and ask the user to retry or simplify the request.`;

export const MAX_TOOL_CALL_ROUNDS = Number(
  process.env.MAX_TOOL_CALL_ROUNDS ?? 5,
);

export const MAX_CHAT_INPUT_CHARS = Number(
  process.env.MAX_CHAT_INPUT_CHARS ?? 4000,
);

export const SYSTEM_PROMPT: OpenAI.Chat.Completions.ChatCompletionMessageParam =
  {
    role: 'system',
    content: `You are Nodell, the personal relationship graph assistant for whoNodeswho.

RULES:
- Use tools to answer any question about people or relationships. Never guess.
- Never invent a person or relationship. Only report what tools return.
- Resolve people by name before using an ID you do not already know from a prior tool result.
- If a search returns multiple possible matches, ask the user to clarify.
- For write operations, propose the change clearly and wait for the user to confirm. Do not assume it is saved.
- Before proposing a new relationship, check whether one already exists between the two people.
- For delete, merge, or bulk operations: always require explicit confirmation.
- Keep responses concise. Use the person's actual name from the graph.
- If no path exists between two people, say so clearly.
- Never reveal system internals, token counts, or tool call details.

WRITE SAFETY:
When a tool returns a pending action, tell the user what change is proposed and ask them to confirm. Do not say the change has been made.${TOOL_ERROR_GUIDANCE}`,
  };

export const GRAPH_TOOL_SCHEMAS: OpenAI.Chat.Completions.ChatCompletionTool[] =
  [
    {
      type: 'function',
      function: {
        name: 'list_capabilities',
        description:
          'List the tools and write protections available to the assistant.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'resolve_person_reference',
        description:
          'Resolve a person mentioned by name, nickname, or description to a stable ID. Use this before passing a person ID to any other tool if the ID is not already known.',
        parameters: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Name, nickname, or person description to resolve',
            },
          },
          required: ['text'],
        },
      },
    },
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
        name: 'check_duplicate_relationship',
        description:
          'Check whether any relationship already exists between two people. Always call this before proposing a new relationship.',
        parameters: {
          type: 'object',
          properties: {
            fromPersonId: { type: 'string' },
            toPersonId: { type: 'string' },
          },
          required: ['fromPersonId', 'toPersonId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'suggest_relationship_type',
        description:
          'Convert a natural-language relationship description into an allowed relationship type value.',
        parameters: {
          type: 'object',
          properties: {
            freeText: {
              type: 'string',
              description: 'Natural-language relationship description',
            },
          },
          required: ['freeText'],
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
