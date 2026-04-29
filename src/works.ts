export type WorkRunContext = {
  mode: string;
  provider: string;
  model: string;
  prompt: string;
  clientGeneratedAt: string;
};

export type ThoughtWorkRecord = {
  id: number;
  title: string;
  rawOutput: string;
  image: string;
  runContext: WorkRunContext;
  createdAt: string;
};

export type ThoughtWorkInput = {
  title: string;
  rawOutput: string;
  image: string;
  runContext: WorkRunContext;
  createdAt?: string;
};

export type WorkStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const THOUGHT_WORKS_STORAGE_KEY = "thought-works";
export const THOUGHT_WORKS_LIMIT = 80;

const isWorkRunContext = (value: unknown): value is WorkRunContext => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<WorkRunContext>;
  return (
    (candidate.mode === "connect" || candidate.mode === "direct" || candidate.mode === "local") &&
    typeof candidate.provider === "string" &&
    typeof candidate.model === "string" &&
    typeof candidate.prompt === "string" &&
    typeof candidate.clientGeneratedAt === "string"
  );
};

export const sanitizeWorkRecord = (value: unknown): ThoughtWorkRecord | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<ThoughtWorkRecord>;
  const id = candidate.id;
  if (
    !Number.isSafeInteger(id) ||
    id === undefined ||
    id <= 0 ||
    typeof candidate.title !== "string" ||
    !candidate.title.trim() ||
    typeof candidate.rawOutput !== "string" ||
    typeof candidate.image !== "string" ||
    typeof candidate.createdAt !== "string" ||
    !isWorkRunContext(candidate.runContext)
  ) {
    return null;
  }

  return {
    id,
    title: candidate.title,
    rawOutput: candidate.rawOutput,
    image: candidate.image,
    runContext: candidate.runContext,
    createdAt: candidate.createdAt,
  };
};

export const readThoughtWorks = (
  storage: WorkStorage,
  storageKey = THOUGHT_WORKS_STORAGE_KEY,
) => {
  const raw = storage.getItem(storageKey);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .flatMap((record) => {
        const sanitized = sanitizeWorkRecord(record);
        return sanitized ? [sanitized] : [];
      })
      .slice(-THOUGHT_WORKS_LIMIT);
  } catch {
    return [];
  }
};

export const writeThoughtWorks = (
  storage: WorkStorage,
  works: ThoughtWorkRecord[],
  storageKey = THOUGHT_WORKS_STORAGE_KEY,
) => {
  if (!works.length) {
    storage.removeItem(storageKey);
    return;
  }

  storage.setItem(storageKey, JSON.stringify(works.slice(-THOUGHT_WORKS_LIMIT)));
};

export const appendThoughtWork = (
  existingWorks: ThoughtWorkRecord[],
  input: ThoughtWorkInput,
) => {
  const maxId = existingWorks.reduce((max, work) => Math.max(max, work.id), 0);
  const work: ThoughtWorkRecord = {
    id: maxId + 1,
    title: input.title,
    rawOutput: input.rawOutput,
    image: input.image,
    runContext: input.runContext,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };

  return {
    work,
    works: [...existingWorks, work].slice(-THOUGHT_WORKS_LIMIT),
  };
};

export const parseWorkId = (value: string) => {
  const normalized = value.trim().replace(/^#/, "");
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const id = Number(normalized);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

export const getWorkById = (works: ThoughtWorkRecord[], id: number) =>
  works.find((work) => work.id === id) ?? null;

export const getPreviousWork = (
  works: ThoughtWorkRecord[],
  currentWorkId: number | null,
) => {
  if (!works.length) {
    return null;
  }

  if (currentWorkId === null) {
    return works[works.length - 1] ?? null;
  }

  const currentIndex = works.findIndex((work) => work.id === currentWorkId);
  if (currentIndex > 0) {
    return works[currentIndex - 1] ?? null;
  }

  if (currentIndex === -1) {
    return works[works.length - 1] ?? null;
  }

  return null;
};
