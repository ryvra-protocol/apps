export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

export type SpanStatus = "ok" | "error";

export interface Span {
  readonly name: string;
  readonly context: SpanContext;
  addAttribute(key: string, value: string | number | boolean): void;
  end(status?: SpanStatus): void;
}

export function createNoopSpan(name: string, context: SpanContext): Span {
  return {
    name,
    context,
    addAttribute() {
      // noop placeholder
    },
    end() {
      // noop placeholder
    },
  };
}
