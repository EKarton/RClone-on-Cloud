import { inject, Injectable } from '@angular/core';
import {
  AutoTokenizer,
  CLIPTextModelWithProjection,
  PreTrainedModel,
  PreTrainedTokenizer,
  Tensor,
} from '@huggingface/transformers';
import { from, map, Observable, of, shareReplay, switchMap, tap } from 'rxjs';

import { NAVIGATOR } from '../../../app.tokens';

export const MODEL_NAME = 'Xenova/clip-vit-large-patch14';

@Injectable({ providedIn: 'root' })
export class OpenClipEmbedderService {
  private readonly navigator = inject(NAVIGATOR);

  private model$: Observable<[PreTrainedTokenizer, PreTrainedModel] | null> =
    from(this.isEnabled() ? this.loadModels() : Promise.resolve(null)).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      tap((models) => {
        if (models) {
          console.log(`Loaded ${MODEL_NAME}`);
        } else {
          console.warn('Skipping model load due to low RAM or mobile device.');
        }
      }),
    );

  isEnabled(): boolean {
    const isMobile =
      /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
        this.navigator.userAgent,
      );

    return !isMobile;
  }

  private loadModels(): Promise<[PreTrainedTokenizer, PreTrainedModel]> {
    console.log(`Loading ${MODEL_NAME}`);

    const device = this.selectBestDevice();
    console.log('Device:', device);

    return Promise.all([
      AutoTokenizer.from_pretrained(MODEL_NAME),
      CLIPTextModelWithProjection.from_pretrained(MODEL_NAME, {
        device,
        dtype: 'fp32',
      }),
    ]);
  }

  private selectBestDevice(): 'webgpu' | 'wasm' {
    return typeof this.navigator !== 'undefined' && 'gpu' in this.navigator
      ? 'webgpu'
      : 'wasm';
  }

  /** Gets the text embeddings for a particular query */
  getTextEmbedding(text: string): Observable<Float32Array | null> {
    return this.model$.pipe(
      switchMap((models) => {
        if (!models) {
          return of(null);
        }

        const [tokenizer, textModel] = models;

        const textInputs = tokenizer(text, {
          padding: true,
          truncation: true,
        });

        return from(textModel(textInputs, {})).pipe(
          map((output: unknown) => {
            const { text_embeds } = output as { text_embeds: Tensor };
            return text_embeds.normalize(2, -1).data as Float32Array;
          }),
        );
      }),
    );
  }
}
