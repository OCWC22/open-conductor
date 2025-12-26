type ParseFn<T> = (input: unknown) => T;

class ZSchema<T> {
  constructor(private parser: ParseFn<T>) {}

  parse(input: unknown): T {
    return this.parser(input);
  }

  optional(): ZSchema<T | undefined> {
    return new ZSchema<T | undefined>((input) => {
      if (input === undefined) return undefined;
      return this.parse(input);
    });
  }

  default(value: T): ZSchema<T> {
    return new ZSchema<T>((input) => {
      if (input === undefined) return value;
      return this.parse(input);
    });
  }
}

function string(): ZSchema<string> {
  return new ZSchema<string>((input) => {
    if (typeof input !== 'string') {
      throw new Error('Expected string');
    }
    return input;
  });
}

function any(): ZSchema<unknown> {
  return new ZSchema<unknown>((input) => input);
}

function array<T>(schema: ZSchema<T>): ZSchema<T[]> {
  return new ZSchema<T[]>((input) => {
    if (!Array.isArray(input)) {
      throw new Error('Expected array');
    }
    return input.map((item) => schema.parse(item));
  });
}

function record<T>(schema: ZSchema<T>): ZSchema<Record<string, T>> {
  return new ZSchema<Record<string, T>>((input) => {
    if (typeof input !== 'object' || input === null) {
      throw new Error('Expected object for record');
    }
    const result: Record<string, T> = {};
    for (const [key, value] of Object.entries(input)) {
      result[key] = schema.parse(value);
    }
    return result;
  });
}

function object<T extends Record<string, ZSchema<any>>>(shape: T): ZSchema<{ [K in keyof T]: ReturnType<T[K]['parse']> }>
function object<T extends Record<string, ZSchema<any>>>(shape: T): ZSchema<any> {
  return new ZSchema((input: unknown) => {
    if (typeof input !== 'object' || input === null) {
      throw new Error('Expected object');
    }
    const result: Record<string, unknown> = {};
    for (const [key, schema] of Object.entries(shape)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      result[key] = (schema as ZSchema<unknown>).parse((input as Record<string, unknown>)[key]);
    }
    return result;
  });
}

export type Infer<T extends ZSchema<any>> = T extends ZSchema<infer U> ? U : never;

export const z = {
  string,
  any,
  array,
  record,
  object,
};

export { ZSchema };
