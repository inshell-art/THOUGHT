import "./thought-v2-lab.css";

import latestRaw from "../artifacts/thought-v2/latest.json?raw";

type LatestChannel = {
  artifact_id: string;
  generated_at?: string;
  release_base_path: string;
  manifest_sha256?: string;
};

type SampleMetric = {
  byteLength: number;
  displayUnits: number;
};

type ThoughtSample = {
  file: string;
  fixtureId: string | null;
  fixtureName: string;
  corpusId: string | null;
  corpusName: string | null;
  promptLine: string;
  agentLine: string;
  prompt: SampleMetric;
  agent: SampleMetric;
  animated: boolean;
};

type SampleIndex = {
  schema_version: number;
  samples: ThoughtSample[];
};

type ManifestFile = {
  path: string;
  bytes: number;
  sha256: string;
};

type Manifest = {
  artifact_id?: string;
  channel?: string;
  generated_at?: string;
  files?: ManifestFile[];
};

type Provenance = {
  artifactId: string;
  releaseBasePath: string;
  sampleFile: string;
  fixtureId: string | null;
  fixtureName: string;
  corpusId: string | null;
  corpusName: string | null;
  animated: boolean;
  agentLine: string;
  promptLine: string;
  svgSha256: string | null;
  generatedFrom: string;
};

type WorkView = {
  index: number;
  sample: ThoughtSample;
  sourceSvg: string;
  displaySvg: string;
  svgDownloadName: string;
  svgSha256: string | null;
  provenanceJson: string;
  provenanceBits: number;
};

const sampleIndexModules = import.meta.glob(
  "../artifacts/thought-v2/releases/*/samples/index.json",
  {
    eager: true,
    import: "default",
    query: "?raw",
  },
) as Record<string, string>;

const manifestModules = import.meta.glob("../artifacts/thought-v2/releases/*/manifest.json", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

const sampleSvgModules = import.meta.glob("../artifacts/thought-v2/releases/*/samples/**/*.svg", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

const parseJson = <T>(raw: string, label: string): T => {
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(`Could not parse ${label}: ${(error as Error).message}`);
  }
};

const byteLength = (value: string) => new TextEncoder().encode(value).length;

const dataUrl = (mime: string, value: string) =>
  `data:${mime};charset=utf-8,${encodeURIComponent(value)}`;

const WORK_FRAME_SIZE = 16;
const WORK_FRAME_COLOR = "#202020";
const WORK_FRAME_CANVAS_SIZE = 960;
const WORK_FRAME_INNER_SIZE = WORK_FRAME_CANVAS_SIZE - WORK_FRAME_SIZE * 2;
const WORK_FRAME_SCALE = WORK_FRAME_INNER_SIZE / WORK_FRAME_CANVAS_SIZE;

const indentSvg = (svg: string, prefix: string) =>
  svg
    .split("\n")
    .map((line) => (line ? `${prefix}${line}` : line))
    .join("\n");

const withWorkFrame = (svg: string) => {
  const openTag = svg.match(/^<svg\b[^>]*>/)?.[0];
  const closeTagIndex = svg.lastIndexOf("</svg>");
  if (!openTag || closeTagIndex < openTag.length) {
    return svg;
  }

  const body = svg.slice(openTag.length, closeTagIndex).trim();
  return [
    openTag,
    `  <rect id="work-frame" width="${WORK_FRAME_CANVAS_SIZE}" height="${WORK_FRAME_CANVAS_SIZE}" fill="${WORK_FRAME_COLOR}"/>`,
    `  <g id="work-canvas" transform="translate(${WORK_FRAME_SIZE} ${WORK_FRAME_SIZE}) scale(${WORK_FRAME_SCALE})">`,
    indentSvg(body, "    "),
    `  </g>`,
    `</svg>`,
  ].join("\n");
};

const shortHash = (hash: string | null) => (hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : "");

const formatDate = (value: string | undefined) => {
  if (!value) {
    return "unknown generated_at";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
};

const element = <K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  textContent?: string,
) => {
  const node = document.createElement(tagName);
  if (className) {
    node.className = className;
  }
  if (typeof textContent === "string") {
    node.textContent = textContent;
  }
  return node;
};

const latest = parseJson<LatestChannel>(latestRaw, "artifacts/thought-v2/latest.json");
const releaseBase = `../${latest.release_base_path}`;
const sampleIndexPath = `${releaseBase}/samples/index.json`;
const manifestPath = `${releaseBase}/manifest.json`;
const sampleIndexRaw = sampleIndexModules[sampleIndexPath];
const manifestRaw = manifestModules[manifestPath];

if (!sampleIndexRaw) {
  throw new Error(`No sample index loaded for ${sampleIndexPath}`);
}

const sampleIndex = parseJson<SampleIndex>(sampleIndexRaw, sampleIndexPath);
const manifest = manifestRaw ? parseJson<Manifest>(manifestRaw, manifestPath) : {};
const fileByPath = new Map((manifest.files ?? []).map((file) => [file.path, file]));
const works = sampleIndex.samples.filter((sample) => sample.file.startsWith("samples/works/"));
const workViews: WorkView[] = works.map((sample, index) => {
  const svgPath = `${releaseBase}/${sample.file}`;
  const sourceSvg = sampleSvgModules[svgPath] ?? "";
  const displaySvg = sourceSvg ? withWorkFrame(sourceSvg) : "";
  const file = fileByPath.get(sample.file);
  const provenance: Provenance = {
    artifactId: manifest.artifact_id ?? latest.artifact_id,
    releaseBasePath: latest.release_base_path,
    sampleFile: sample.file,
    fixtureId: sample.fixtureId,
    fixtureName: sample.fixtureName,
    corpusId: sample.corpusId,
    corpusName: sample.corpusName,
    animated: sample.animated,
    agentLine: sample.agentLine,
    promptLine: sample.promptLine,
    svgSha256: file?.sha256 ?? null,
    generatedFrom: sampleIndexPath.slice(3),
  };
  const provenanceJson = JSON.stringify(provenance, null, 2);

  return {
    index,
    sample,
    sourceSvg,
    displaySvg,
    svgDownloadName: sample.file.split("/").pop() ?? `thought-v2-work-${index + 1}.svg`,
    svgSha256: file?.sha256 ?? null,
    provenanceJson,
    provenanceBits: byteLength(provenanceJson) * 8,
  };
});

const app = document.getElementById("thought-v2-lab");
if (!app) {
  throw new Error("missing #thought-v2-lab");
}

const header = element("header", "thought-v2-lab__header");
const title = element("h1", "thought-v2-lab__title", "THOUGHT V2");
const subline = element("p", "thought-v2-lab__subline");
subline.replaceChildren(
  element("span", undefined, `${works.length} works`),
  element("span", undefined, manifest.channel ? `channel ${manifest.channel}` : "channel unknown"),
  element("span", undefined, `generated ${formatDate(manifest.generated_at ?? latest.generated_at)}`),
  element("code", undefined, latest.artifact_id),
);
header.replaceChildren(title, subline);

const workLabel = (work: WorkView) => `THOUGHT #${String(work.index + 1).padStart(2, "0")}`;

const renderCaption = (work: WorkView, className: string) => {
  const caption = element("figcaption", className);
  const workId = element("span", `${className}-title`, workLabel(work));
  const agent = element("span", `${className}-agent`, "Agent: Codex");
  const provenanceLink = element(
    "a",
    `${className}-provenance`,
    `Provenance ${work.provenanceBits} bit`,
  ) as HTMLAnchorElement;
  provenanceLink.href = dataUrl("application/json", work.provenanceJson);
  provenanceLink.download = work.svgDownloadName.replace(/\.svg$/i, "-provenance.json");
  provenanceLink.title = `Download provenance JSON for ${work.sample.fixtureName}`;
  caption.replaceChildren(workId, agent, provenanceLink);
  return caption;
};

const detail = element("section", "thought-v2-lab__detail");
detail.setAttribute("aria-label", "THOUGHT V2 detail preview");

const detailFigure = element("figure", "thought-detail-work");
const detailImage = element("img", "thought-detail-work__image") as HTMLImageElement;
detailImage.decoding = "async";
detailImage.loading = "eager";
const detailCaptionSlot = element("div", "thought-detail-work__caption-slot");
detailFigure.replaceChildren(detailImage, detailCaptionSlot);
detail.append(detailFigure);

const grid = element("section", "thought-v2-lab__grid");
grid.setAttribute("aria-label", "THOUGHT V2 sample works");

const gridLinks: HTMLAnchorElement[] = [];

const selectWork = (work: WorkView) => {
  detailImage.alt = `${workLabel(work)} ${work.sample.fixtureName}`;
  detailImage.src = work.displaySvg ? dataUrl("image/svg+xml", work.displaySvg) : "";
  detailCaptionSlot.replaceChildren(renderCaption(work, "thought-detail-work__caption"));
  detail.setAttribute("data-selected-work", String(work.index + 1));
  gridLinks.forEach((link) => {
    const active = link.dataset.workIndex === String(work.index);
    link.setAttribute("aria-current", active ? "true" : "false");
  });
};

workViews.forEach((work) => {
  const figure = element("figure", "thought-work");
  const imageLink = element("a", "thought-work__link") as HTMLAnchorElement;
  imageLink.href = work.displaySvg ? dataUrl("image/svg+xml", work.displaySvg) : "#";
  imageLink.download = work.svgDownloadName;
  imageLink.dataset.workIndex = String(work.index);
  imageLink.title = work.sourceSvg
    ? `View ${work.sample.fixtureName}${work.svgSha256 ? ` (${shortHash(work.svgSha256)})` : ""}`
    : `Missing SVG: ${work.sample.file}`;
  imageLink.addEventListener("click", (event) => {
    event.preventDefault();
    selectWork(work);
    detail.scrollIntoView({ block: "start", behavior: "smooth" });
  });
  gridLinks.push(imageLink);

  const image = element("img", "thought-work__image") as HTMLImageElement;
  image.alt = work.sample.fixtureName;
  image.decoding = "async";
  image.loading = work.index < 6 ? "eager" : "lazy";
  image.src = work.displaySvg ? dataUrl("image/svg+xml", work.displaySvg) : "";
  imageLink.append(image);

  const caption = renderCaption(work, "thought-work__caption");
  figure.replaceChildren(imageLink, caption);
  grid.append(figure);
});

const empty = element(
  "p",
  "thought-v2-lab__empty",
  "No THOUGHT V2 work samples were found in the current artifact release.",
);

if (workViews.length > 0) {
  selectWork(workViews[0]);
  app.replaceChildren(header, detail, grid);
} else {
  app.replaceChildren(header, empty);
}
