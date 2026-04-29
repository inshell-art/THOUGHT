import { describe, expect, it } from "vitest";

import {
  THOUGHT_WORKS_LIMIT,
  appendThoughtWork,
  getPreviousWork,
  getWorkById,
  parseWorkId,
  readThoughtWorks,
  sanitizeWorkRecord,
  writeThoughtWorks,
  type ThoughtWorkInput,
  type ThoughtWorkRecord,
  type WorkStorage,
} from "./works";

const runContext = {
  mode: "connect",
  provider: "openrouter",
  model: "meta-llama/llama-3.3-70b-instruct:free",
  prompt: "when will we be done?",
  clientGeneratedAt: "2026-04-29T00:00:00.000Z",
};

const makeInput = (title: string, createdAt = "2026-04-29T00:00:00.000Z"): ThoughtWorkInput => ({
  title,
  rawOutput: title.toLowerCase(),
  image: `data:image/svg+xml,${title}`,
  runContext,
  createdAt,
});

const makeWork = (id: number, title = `WORK ${id}`): ThoughtWorkRecord => ({
  id,
  title,
  rawOutput: title.toLowerCase(),
  image: `data:image/svg+xml,${title}`,
  runContext,
  createdAt: "2026-04-29T00:00:00.000Z",
});

const createMemoryStorage = (): WorkStorage => {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
};

describe("thought works", () => {
  it("sanitizes valid records and rejects invalid records", () => {
    const valid = makeWork(1, "HELLO");

    expect(sanitizeWorkRecord(valid)).toEqual(valid);
    expect(sanitizeWorkRecord({ ...valid, id: 0 })).toBeNull();
    expect(sanitizeWorkRecord({ ...valid, title: "" })).toBeNull();
    expect(sanitizeWorkRecord({ ...valid, runContext: { ...runContext, mode: "unknown" } })).toBeNull();
    expect(sanitizeWorkRecord({ ...valid, runContext: { ...runContext, prompt: 1 } })).toBeNull();
    expect(sanitizeWorkRecord(null)).toBeNull();
  });

  it("reads only valid records from session storage", () => {
    const storage = createMemoryStorage();
    storage.setItem("thought-works", JSON.stringify([
      makeWork(1, "VALID"),
      { id: 2, title: "", runContext },
      "broken",
      makeWork(3, "ALSO VALID"),
    ]));

    expect(readThoughtWorks(storage).map((work) => work.id)).toEqual([1, 3]);
  });

  it("writes works and removes storage when empty", () => {
    const storage = createMemoryStorage();

    writeThoughtWorks(storage, [makeWork(1, "SAVED")]);
    expect(readThoughtWorks(storage).map((work) => work.title)).toEqual(["SAVED"]);

    writeThoughtWorks(storage, []);
    expect(readThoughtWorks(storage)).toEqual([]);
  });

  it("appends with monotonic ids and keeps the newest bounded history", () => {
    let works: ThoughtWorkRecord[] = [];

    for (let index = 0; index < THOUGHT_WORKS_LIMIT + 2; index += 1) {
      const appended = appendThoughtWork(works, makeInput(`WORK ${index + 1}`));
      works = appended.works;
    }

    expect(works).toHaveLength(THOUGHT_WORKS_LIMIT);
    expect(works[0]?.id).toBe(3);
    expect(works.at(-1)?.id).toBe(THOUGHT_WORKS_LIMIT + 2);
  });

  it("parses work ids with or without #", () => {
    expect(parseWorkId("7")).toBe(7);
    expect(parseWorkId("#7")).toBe(7);
    expect(parseWorkId("  #7  ")).toBe(7);
    expect(parseWorkId("0")).toBeNull();
    expect(parseWorkId("abc")).toBeNull();
  });

  it("loads works by id", () => {
    const works = [makeWork(1), makeWork(2), makeWork(3)];

    expect(getWorkById(works, 2)?.title).toBe("WORK 2");
    expect(getWorkById(works, 9)).toBeNull();
  });

  it("resolves last work as previous to current, or newest when no current exists", () => {
    const works = [makeWork(1), makeWork(2), makeWork(3)];

    expect(getPreviousWork(works, 3)?.id).toBe(2);
    expect(getPreviousWork(works, 2)?.id).toBe(1);
    expect(getPreviousWork(works, null)?.id).toBe(3);
    expect(getPreviousWork(works, 99)?.id).toBe(3);
    expect(getPreviousWork(works, 1)).toBeNull();
    expect(getPreviousWork([], null)).toBeNull();
  });
});
