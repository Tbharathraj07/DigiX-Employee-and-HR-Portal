/**
 * TypeScript type definitions for Supabase Edge Functions (Deno Runtime)
 * Ensures IDE type resolution for Deno globals and esm.sh URL imports.
 */

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): Record<string, string>;
  }

  export const env: Env;

  export interface ServeOptions {
    port?: number;
    hostname?: string;
    signal?: AbortSignal;
    onError?: (error: unknown) => Response | Promise<Response>;
    onListen?: (params: { port: number; hostname: string }) => void;
  }

  export function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void;

  export function serve(
    options: ServeOptions,
    handler: (req: Request) => Response | Promise<Response>
  ): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@*' {
  export * from '@supabase/supabase-js';
}

declare module 'https://*' {
  const content: any;
  export default content;
  export const createClient: any;
}
