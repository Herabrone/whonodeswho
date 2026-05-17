import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { MAX_CHAT_INPUT_CHARS } from '../chat.constants';

export class ChatStreamDto {
  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(MAX_CHAT_INPUT_CHARS)
  message!: string;
}
