import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenRouterService {
  private readonly client: OpenAI;
  private readonly logger = new Logger(OpenRouterService.name);

  constructor(private readonly config: ConfigService) {
    const apiKey =
      this.config.get<string>('OPENROUTER_API_KEY') ||
      'missing-openrouter-api-key';
    const baseURL =
      this.config.get<string>('OPENROUTER_BASE_URL') ||
      'https://openrouter.ai/api/v1';

    this.logger.log(`Base URL : ${baseURL}`);
    this.logger.log(`API Key  : ${apiKey.slice(0, 8)}${'*'.repeat(Math.max(0, apiKey.length - 8))}`);
    this.logger.log(`Model    : ${this.config.get<string>('OPENROUTER_MODEL') || 'openai/gpt-3.5-turbo'}`);

    this.client = new OpenAI({
      baseURL,
      apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/whonodeswho/whonodeswho',
        'X-Title': 'whoNodeswho',
      },
    });
  }

  get model(): string {
    return (
      this.config.get<string>('OPENROUTER_MODEL') ||
      'openai/gpt-3.5-turbo'
    );
  }

  get sdk(): OpenAI {
    return this.client;
  }
}
