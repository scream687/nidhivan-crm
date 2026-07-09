import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class NimClientService implements OnModuleInit {
  private client!: OpenAI;
  private readonly logger = new Logger(NimClientService.name);
  private model = '';

  onModuleInit() {
    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    const baseURL = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
    this.model = process.env.NVIDIA_NIM_MODEL || 'nvidia/nemotron-3-ultra-550b-instruct';

    if (!apiKey) {
      this.logger.warn('NVIDIA_NIM_API_KEY not set — AI copilot will use rule-based fallback');
      return;
    }

    this.client = new OpenAI({ apiKey, baseURL });
    this.logger.log(`NVIDIA NIM client initialized — model: ${this.model}`);
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async chat(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[], opts?: { temperature?: number; maxTokens?: number }): Promise<string> {
    if (!this.client) throw new Error('NVIDIA NIM not configured — set NVIDIA_NIM_API_KEY');

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: opts?.temperature ?? 0.7,
      max_tokens: opts?.maxTokens ?? 1024,
    });

    return response.choices[0]?.message?.content ?? '';
  }

  async structuredChat<T>(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[], opts?: { temperature?: number; maxTokens?: number }): Promise<T> {
    const raw = await this.chat(messages, opts);
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    return JSON.parse(cleaned);
  }
}
