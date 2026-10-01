"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";

type FontKey = "arial" | "david" | "assistant" | "frank" | "noto" | "heebo" | "rubik" | "alef";
type TextStyle = { font: FontKey; bold: boolean };
type ItemKind = "heading" | "text" | "timed";
type HeadingVariant = "title" | "divider" | "spacer";
type ContentItem = { id: string; kind: ItemKind; headingVariant: HeadingVariant; text: string; time: string; style: TextStyle };
type Poster = {
  mainTitle: string;
  items: ContentItem[];
  fieldStyles: { mainTitle: TextStyle };
};

const FONT_FAMILIES: Record<FontKey, string> = {
  arial: "Arial, sans-serif",
  david: '"David Libre", serif',
  assistant: '"Assistant", sans-serif',
  frank: '"Frank Ruhl Libre", serif',
  noto: '"Noto Sans Hebrew", sans-serif',
  heebo: '"Heebo", sans-serif',
  rubik: '"Rubik", sans-serif',
  alef: '"Alef", sans-serif',
};
const FONT_OPTIONS: Array<{ value: FontKey; label: string }> = [
  { value: "arial", label: "Arial" },
  { value: "david", label: "David" },
  { value: "assistant", label: "Assistant" },
  { value: "frank", label: "Frank Ruhl Libre" },
  { value: "noto", label: "Noto Sans Hebrew" },
  { value: "heebo", label: "Heebo" },
  { value: "rubik", label: "Rubik" },
  { value: "alef", label: "Alef" },
];
const uid = () => Math.random().toString(36).slice(2, 9);
const normalStyle = (): TextStyle => ({ font: "david", bold: true });
const boldStyle = (): TextStyle => ({ font: "david", bold: true });
const newItem = (
  kind: ItemKind,
  text = "",
  time = "",
  style = kind === "heading" ? boldStyle() : normalStyle(),
  headingVariant: HeadingVariant = "title",
): ContentItem => ({ id: uid(), kind, headingVariant, text, time, style });
const example = (): Poster => ({
  mainTitle: "זמני תפילה",
  items: [
    newItem("text", 'על שם הרב "דוד ומשה" זצוק״ל'),
    newItem("heading", "פרשת השבוע"),
    newItem("text", "הפטרה"),
    newItem("timed", "מנחה", "19:25"),
    newItem("text", "שיר השירים לאחר מנחה"),
    newItem("text", "ערבית שבת קודש"),
    newItem("heading", "יום שבת"),
    newItem("timed", "שחרית", "07:30"),
    newItem("timed", "שיעור תורה", "17:45"),
    newItem("timed", "מנחה", "18:30"),
    newItem("text", "סעודה שלישית"),
    newItem("text", "דברי תורה מפי הרב אפרגן"),
    newItem("timed", "ערבית מוצ״ש", "20:20"),
    newItem("text", "הבדלה"),
    newItem("heading", "", "", boldStyle(), "divider"),
    newItem("heading", "זמני תפילות ביום חול"),
    newItem("timed", "מנחה", ""),
    newItem("timed", "ערבית", ""),
  ],
  fieldStyles: { mainTitle: { font: "david", bold: true } },
});

function normalize(rawValue: unknown): Poster {
  const raw = rawValue && typeof rawValue === "object" ? rawValue as Record<string, unknown> : {};
  const fallback = example();
  const style = (value: unknown, backup = normalStyle()): TextStyle => {
    const current = value && typeof value === "object" ? value as Partial<TextStyle> : {};
    const fonts: FontKey[] = ["arial", "david", "assistant", "frank", "noto", "heebo", "rubik", "alef"];
    return {
      font: fonts.includes(current.font as FontKey) ? current.font as FontKey : backup.font,
      bold: typeof current.bold === "boolean" ? current.bold : backup.bold,
    };
  };
  const sanitizeItems = (value: unknown): ContentItem[] => Array.isArray(value)
    ? value.slice(0, 60).map((entry) => {
        const item = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
        const kind: ItemKind = item.kind === "heading" || item.kind === "timed" ? item.kind : "text";
        const headingVariant: HeadingVariant = kind === "heading" && (item.headingVariant === "divider" || item.headingVariant === "spacer")
          ? item.headingVariant
          : "title";
        return {
          id: String(item.id ?? uid()),
          kind,
          headingVariant,
          text: String(item.text ?? item.label ?? "").slice(0, 140),
          time: kind === "timed" ? String(item.time ?? "").slice(0, 12) : "",
          style: style(item.style, kind === "heading" ? boldStyle() : normalStyle()),
        };
      })
    : [];
  const rawFieldStyles = raw.fieldStyles && typeof raw.fieldStyles === "object" ? raw.fieldStyles as Record<string, unknown> : {};
  let items = sanitizeItems(raw.items);
  if (!Array.isArray(raw.items)) {
    const legacyRows = (value: unknown): ContentItem[] => Array.isArray(value)
      ? value.map((entry) => {
          const row = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
          return newItem("timed", String(row.label ?? "").slice(0, 80), String(row.time ?? "").slice(0, 12), style(row.style));
        })
      : [];
    const legacyNotes = (value: unknown): ContentItem[] => Array.isArray(value)
      ? value.map((entry) => {
          const note = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
          return newItem("text", String(typeof entry === "string" ? entry : note.text ?? "").slice(0, 140), "", style(note.style));
        }).filter((item) => item.text)
      : [];
    const upperRows = legacyRows(raw.upperRows);
    const lowerRows = legacyRows(raw.lowerRows);
    const lowerNotes = legacyNotes(raw.lowerNotes);
    const regularRows = lowerRows.filter((item) => !/ערבית/.test(item.text));
    const arvitRows = lowerRows.filter((item) => /ערבית/.test(item.text));
    const regularNotes = lowerNotes.filter((item) => !/הבדלה|ברכת\s+לבנה/.test(item.text));
    const endingNotes = lowerNotes.filter((item) => /הבדלה|ברכת\s+לבנה/.test(item.text));
    const addLegacyText = (value: unknown, kind: ItemKind, itemStyle: TextStyle) => {
      const text = String(value ?? "").slice(0, 140);
      if (text.trim()) items.push(newItem(kind, text, "", itemStyle));
    };
    addLegacyText(raw.dedication, "text", style(rawFieldStyles.dedication));
    addLegacyText(raw.upperTitle, "heading", style(rawFieldStyles.upperTitle, boldStyle()));
    addLegacyText(raw.upperSubtitle, "text", style(rawFieldStyles.upperSubtitle));
    items.push(...upperRows, ...legacyNotes(raw.upperNotes));
    addLegacyText(raw.lowerTitle, "heading", style(rawFieldStyles.lowerTitle, boldStyle()));
    items.push(...regularRows, ...regularNotes, ...arvitRows, ...endingNotes);
  }
  if (!items.length && Object.keys(raw).length === 0) items = fallback.items;
  return {
    mainTitle: String(raw.mainTitle ?? fallback.mainTitle).slice(0, 140),
    items,
    fieldStyles: { mainTitle: style(rawFieldStyles.mainTitle, fallback.fieldStyles.mainTitle) },
  };
}

function encode(data: Poster) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decode(value: string) {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const bytes = Uint8Array.from(atob(padded), (letter) => letter.charCodeAt(0));
    return normalize(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

function parseFreeText(text: string, current: Poster): Poster {
  const source = text.replace(/(\d{1,2})[.](\d{2})/g, "$1:$2");
  const next = normalize(current);
  const capture = (pattern: RegExp) => source.match(pattern)?.[1]?.trim();
  const mainTitle = capture(/(?:כותרת הלוח|כותרת ראשית)\s*[:\-]\s*([^\n]+)/);
  const parasha = capture(/(?:פרשת השבוע|פרשת|פרשה)\s*[:\-]?\s*["״']?([^,\n;.]+)/);
  const haftara = capture(/(?:הפטרה|ההפטרה)\s*[:\-]?\s*["״']?([^,\n;.]+)/);
  if (mainTitle) next.mainTitle = mainTitle;
  const generated: Array<{ index: number; item: ContentItem }> = [];
  const dedication = next.items.find((item) => /דוד ומשה/.test(item.text));
  if (dedication) generated.push({ index: -300, item: { ...dedication, id: uid() } });
  if (parasha) generated.push({ index: -200, item: newItem("heading", `פרשת השבוע "${parasha.replace(/["״']/g, "")}"`) });
  if (haftara) generated.push({ index: -100, item: newItem("text", `הפטרה "${haftara.replace(/["״']/g, "")}"`) });
  [...source.matchAll(/(שחרית|שיעור תורה|מנחה(?:\s+ערב שבת|\s+שבת)?|ערבית(?:\s+מוצ["״']?ש)?|סליחות)\s*[:\-]?\s*(\d{1,2}:\d{2})/g)].forEach((match) => {
    generated.push({ index: match.index ?? 0, item: newItem("timed", match[1].replace(/\s+(ערב שבת|שבת)$/, ""), match[2]) });
  });
  ["שיר השירים לאחר מנחה", "ערבית שבת קודש", "סעודה שלישית", "הבדלה", "ברכת לבנה"].forEach((note) => {
    const index = source.indexOf(note);
    if (index !== -1) generated.push({ index, item: newItem("text", note) });
  });
  const torah = source.match(/דברי תורה[^,.;\n]*/);
  if (torah?.[0]) generated.push({ index: torah.index ?? 0, item: newItem("text", torah[0]) });
  const firstDayEvent = generated.find((entry) => entry.index >= 0 && entry.item.kind === "timed" && !/ערב שבת/.test(source.slice(Math.max(0, entry.index - 12), entry.index + entry.item.text.length + 12)));
  if (firstDayEvent) generated.push({ index: firstDayEvent.index - 0.5, item: newItem("heading", "יום שבת") });
  if (generated.length) next.items = generated.sort((a, b) => a.index - b.index).map((entry) => entry.item);
  return next;
}

type TextContrast = {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  shadowColor: string;
  shadowBlur: number;
  backdropStyle?: string;
};

function adaptiveTextContrast(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
): TextContrast {
  const left = Math.max(0, Math.floor(x - width / 2));
  const top = Math.max(0, Math.floor(y - height / 2));
  const sampleWidth = Math.max(1, Math.min(context.canvas.width - left, Math.ceil(width)));
  const sampleHeight = Math.max(1, Math.min(context.canvas.height - top, Math.ceil(height)));
  const pixels = context.getImageData(left, top, sampleWidth, sampleHeight).data;
  const step = Math.max(1, Math.floor(Math.sqrt((sampleWidth * sampleHeight) / 1400)));
  let count = 0;
  let sum = 0;
  let sumSquares = 0;
  let darkPixels = 0;
  let brightPixels = 0;
  let lightTextFailures = 0;
  let darkTextFailures = 0;
  let lightTextScore = 0;
  let darkTextScore = 0;

  const linear = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };

  for (let row = 0; row < sampleHeight; row += step) {
    for (let column = 0; column < sampleWidth; column += step) {
      const index = (row * sampleWidth + column) * 4;
      const luminance = 0.2126 * linear(pixels[index]) + 0.7152 * linear(pixels[index + 1]) + 0.0722 * linear(pixels[index + 2]);
      const lightContrast = 1.05 / (luminance + 0.05);
      const darkContrast = (luminance + 0.05) / 0.05;
      sum += luminance;
      sumSquares += luminance * luminance;
      lightTextScore += Math.min(lightContrast, 10);
      darkTextScore += Math.min(darkContrast, 10);
      if (lightContrast < 4.5) lightTextFailures += 1;
      if (darkContrast < 4.5) darkTextFailures += 1;
      if (luminance < 0.22) darkPixels += 1;
      if (luminance > 0.58) brightPixels += 1;
      count += 1;
    }
  }

  const average = count ? sum / count : 0.5;
  const deviation = Math.sqrt(Math.max(0, (count ? sumSquares / count : 0) - average * average));
  const lightText = lightTextFailures === darkTextFailures
    ? lightTextScore >= darkTextScore
    : lightTextFailures < darkTextFailures;
  const selectedFailures = lightText ? lightTextFailures : darkTextFailures;
  const failureRate = count ? selectedFailures / count : 0;
  const selectedScore = count ? (lightText ? lightTextScore : darkTextScore) / count : 4.5;
  const mixedBackground = count > 0 && darkPixels / count > 0.08 && brightPixels / count > 0.08;
  const needsBackdrop = failureRate > 0.07 || deviation > 0.12 || mixedBackground || selectedScore < 4.5;
  const strongBackdrop = failureRate > 0.22 || deviation > 0.2;

  return {
    fillStyle: lightText ? "#fffdf8" : "#15100c",
    strokeStyle: lightText ? "rgba(0, 0, 0, 0.94)" : "rgba(255, 255, 255, 0.96)",
    lineWidth: Math.max(2.4, fontSize * 0.11),
    shadowColor: lightText ? "rgba(0, 0, 0, 0.85)" : "rgba(255, 255, 255, 0.82)",
    shadowBlur: Math.max(2, fontSize * 0.12),
    backdropStyle: needsBackdrop
      ? lightText
        ? strongBackdrop ? "rgba(0, 0, 0, 0.72)" : "rgba(0, 0, 0, 0.58)"
        : strongBackdrop ? "rgba(255, 255, 255, 0.82)" : "rgba(255, 255, 255, 0.7)"
      : undefined,
  };
}

function contrastForText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  weight: number,
  font: string,
) {
  context.save();
  context.font = `${weight} ${size}px ${font}`;
  const measuredWidth = context.measureText(text).width;
  context.restore();
  const minimum = Math.max(8, size * 0.34);
  const fittedSize = Math.max(minimum, size * Math.min(1, maxWidth / Math.max(measuredWidth, 1)));
  const fittedWidth = Math.min(maxWidth, measuredWidth * (fittedSize / size));
  return adaptiveTextContrast(
    context,
    x,
    y,
    Math.max(fittedWidth + fittedSize * 0.9, fittedSize * 2),
    fittedSize * 1.72,
    fittedSize,
  );
}

function fit(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  weight: number,
  font: string,
  contrast?: TextContrast,
) {
  const alwaysBold = "דוד ומשה";
  const phraseIndex = text.indexOf(alwaysBold);
  const mixedWeight = phraseIndex !== -1 && weight < 700;
  const segments = mixedWeight
    ? [
        { text: text.slice(0, phraseIndex), weight },
        { text: alwaysBold, weight: 700 },
        { text: text.slice(phraseIndex + alwaysBold.length), weight },
      ]
    : [{ text, weight }];
  const measure = (actual: number) =>
    segments.reduce((total, segment) => {
      context.font = `${segment.weight} ${actual}px ${font}`;
      return total + context.measureText(segment.text).width;
    }, 0);
  let actual = size;
  const minimum = Math.max(8, size * 0.34);
  while (actual > minimum && measure(actual) > maxWidth) {
    actual -= 1;
  }
  const totalWidth = measure(actual);
  if (contrast?.backdropStyle) {
    const paddingX = actual * 0.42;
    const paddingY = actual * 0.18;
    context.save();
    context.fillStyle = contrast.backdropStyle;
    context.beginPath();
    context.roundRect(
      x - totalWidth / 2 - paddingX,
      y - actual * 0.62 - paddingY,
      totalWidth + paddingX * 2,
      actual * 1.24 + paddingY * 2,
      actual * 0.28,
    );
    context.fill();
    context.restore();
  }
  const drawSegment = (segmentText: string, segmentWeight: number, segmentX: number) => {
    context.save();
    context.font = `${segmentWeight} ${actual}px ${font}`;
    if (contrast) {
      context.fillStyle = contrast.fillStyle;
      context.strokeStyle = contrast.strokeStyle;
      context.lineWidth = contrast.lineWidth;
      context.lineJoin = "round";
      context.miterLimit = 2;
      context.shadowColor = contrast.shadowColor;
      context.shadowBlur = contrast.shadowBlur;
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 0;
      context.strokeText(segmentText, segmentX, y);
    }
    context.fillText(segmentText, segmentX, y);
    context.restore();
  };
  if (!mixedWeight) {
    drawSegment(text, weight, x);
    return actual;
  }
  const previousAlign = context.textAlign;
  const previousDirection = context.direction;
  context.textAlign = "right";
  context.direction = "rtl";
  let cursor = x + totalWidth / 2;
  segments.forEach((segment) => {
    if (!segment.text) return;
    context.font = `${segment.weight} ${actual}px ${font}`;
    drawSegment(segment.text, segment.weight, cursor);
    cursor -= context.measureText(segment.text).width;
  });
  context.textAlign = previousAlign;
  context.direction = previousDirection;
  return actual;
}

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = Math.max(0, (image.naturalWidth - sourceWidth) / 2);
  const sourceY = Math.max(0, (image.naturalHeight - sourceHeight) / 2);
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
}

function PosterPreview({ data, backgroundUrl }: { data: Poster; backgroundUrl: string | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const background = useRef<HTMLImageElement | null>(null);
  const header = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);

  const draw = useCallback(() => {
    if (!canvas.current || !background.current || !header.current) return;
    const context = canvas.current.getContext("2d");
    if (!context) return;
    const customBackground = Boolean(backgroundUrl);
    let canvasWidth = 1222;
    let canvasHeight = 1536;
    if (customBackground) {
      const imageWidth = background.current.naturalWidth || 1222;
      const imageHeight = background.current.naturalHeight || 1536;
      const longSide = Math.max(imageWidth, imageHeight);
      const shortSide = Math.min(imageWidth, imageHeight);
      const downscale = Math.min(1, 2000 / longSide);
      const upscale = Math.max(1, Math.min(2000 / longSide, 900 / shortSide));
      const scale = downscale < 1 ? downscale : upscale;
      canvasWidth = Math.round(imageWidth * scale);
      canvasHeight = Math.round(imageHeight * scale);
    }
    canvas.current.width = canvasWidth;
    canvas.current.height = canvasHeight;
    if (customBackground) {
      context.drawImage(background.current, 0, 0, canvasWidth, canvasHeight);
    } else {
      drawCover(context, background.current, 1222, 1536);
      context.drawImage(header.current, 0, 0, 1221, 360, 0, 0, 1222, 360);
    }
    context.save();
    context.direction = "rtl";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#17100b";

    if (!customBackground) {
      context.save();
      context.fillStyle = "#563317";
      context.fillRect(350, 281, 522, 74);
      if (data.mainTitle.trim()) {
        context.fillStyle = "#f4ead0";
        fit(
          context,
          data.mainTitle,
          611,
          318,
          490,
          58,
          data.fieldStyles.mainTitle.bold ? 700 : 400,
          FONT_FAMILIES[data.fieldStyles.mainTitle.font],
        );
      }
      context.restore();
    }

    type TextItem = { type: "text"; text: string; size: number; style: TextStyle; gap: number; underline?: boolean };
    type RowItem = { type: "row"; label: string; time: string; size: number; style: TextStyle; gap: number };
    type DividerItem = { type: "divider"; size: number; gap: number };
    type SpacerItem = { type: "spacer"; size: number; gap: number };
    type Item = TextItem | RowItem | DividerItem | SpacerItem;
    const posterItems: Item[] = data.items
      .filter((item) => item.kind === "heading" && item.headingVariant !== "title" || item.text.trim() || item.time.trim())
      .map((item): Item => item.kind === "timed"
        ? { type: "row", label: item.text, time: item.time, size: 33, style: item.style, gap: 10 }
        : item.kind === "heading" && item.headingVariant === "divider"
          ? { type: "divider", size: 18, gap: 12 }
          : item.kind === "heading" && item.headingVariant === "spacer"
            ? { type: "spacer", size: 34, gap: 6 }
            : {
            type: "text",
            text: item.text,
            size: item.kind === "heading" ? 38 : 31,
            style: item.style,
            gap: item.kind === "heading" ? 16 : 8,
            underline: item.kind === "heading",
          });

    const renderItems = (
      items: Item[],
      area: { x: number; y: number; width: number; height: number },
      sizeMultiplier = 1,
    ) => {
      const naturalHeight = items.reduce((sum, item) => sum + item.size * sizeMultiplier * 1.18 + item.gap * sizeMultiplier, 0);
      const maxGrowth = customBackground ? 1.28 : 1.12;
      const scale = Math.min(maxGrowth, area.height / Math.max(naturalHeight, 1));
      let y = area.y + Math.max(0, (area.height - naturalHeight * scale) / 2);
      items.forEach((item) => {
        const size = item.size * sizeMultiplier * scale;
        y += size * 0.58;
        if (item.type === "divider") {
          const centerX = area.x + area.width / 2;
          const dividerWidth = area.width * 0.52;
          const contrast = customBackground
            ? adaptiveTextContrast(context, centerX, y, dividerWidth, Math.max(12, size), Math.max(10, size))
            : undefined;
          context.save();
          context.lineCap = "round";
          context.strokeStyle = contrast?.strokeStyle ?? "rgba(255,255,255,.92)";
          context.lineWidth = Math.max(4, size * 0.28);
          context.beginPath();
          context.moveTo(centerX - dividerWidth / 2, y);
          context.lineTo(centerX + dividerWidth / 2, y);
          context.stroke();
          context.strokeStyle = contrast?.fillStyle ?? "#6f431f";
          context.lineWidth = Math.max(2, size * 0.13);
          context.stroke();
          context.restore();
        } else if (item.type === "spacer") {
          // The reserved height is intentional and creates a movable blank line.
        } else if (item.type === "text") {
          if (item.text.trim()) {
            const centerX = area.x + area.width / 2;
            const weight = item.style.bold ? 700 : 400;
            const font = FONT_FAMILIES[item.style.font];
            const contrast = customBackground
              ? contrastForText(context, item.text, centerX, y, area.width * 0.94, size, weight, font)
              : undefined;
            const actual = fit(
              context,
              item.text,
              centerX,
              y,
              area.width * 0.94,
              size,
              weight,
              font,
              contrast,
            );
            if (item.underline) {
              context.font = `${item.style.bold ? 700 : 400} ${actual}px ${FONT_FAMILIES[item.style.font]}`;
              const width = Math.min(context.measureText(item.text).width + actual * 0.45, area.width * 0.55);
              context.strokeStyle = contrast?.fillStyle ?? "#17100b";
              context.lineWidth = Math.max(2, actual / 14);
              context.beginPath();
              context.moveTo(centerX - width / 2, y + actual * 0.62);
              context.lineTo(centerX + width / 2, y + actual * 0.62);
              context.stroke();
            }
          }
        } else {
          const weight = item.style.bold ? 700 : 400;
          const font = FONT_FAMILIES[item.style.font];
          const labelX = area.x + area.width * 0.67;
          const timeX = area.x + area.width * 0.25;
          const labelContrast = customBackground
            ? contrastForText(context, item.label, labelX, y, area.width * 0.52, size, weight, font)
            : undefined;
          const timeContrast = customBackground
            ? contrastForText(context, item.time, timeX, y, area.width * 0.28, size, weight, font)
            : undefined;
          fit(context, item.label, labelX, y, area.width * 0.52, size, weight, font, labelContrast);
          context.direction = "ltr";
          fit(context, item.time, timeX, y, area.width * 0.28, size, weight, font, timeContrast);
          context.direction = "rtl";
        }
        y += size * 0.58 + item.gap * sizeMultiplier * scale;
      });
    };

    if (!customBackground) {
      renderItems(posterItems, { x: 231, y: 390, width: 760, height: 805 });
    } else {
      const landscape = canvasWidth > canvasHeight;
      const edge = Math.min(canvasWidth, canvasHeight) * 0.085;
      const headingSize = Math.min(canvasWidth, canvasHeight) * (landscape ? 0.055 : 0.06);
      const headingY = edge + headingSize * 0.4;
      if (data.mainTitle.trim()) {
        const headingWeight = data.fieldStyles.mainTitle.bold ? 700 : 400;
        const headingFont = FONT_FAMILIES[data.fieldStyles.mainTitle.font];
        const headingContrast = contrastForText(
          context,
          data.mainTitle,
          canvasWidth / 2,
          headingY,
          canvasWidth - edge * 2,
          headingSize,
          headingWeight,
          headingFont,
        );
        fit(
          context,
          data.mainTitle,
          canvasWidth / 2,
          headingY,
          canvasWidth - edge * 2,
          headingSize,
          headingWeight,
          headingFont,
          headingContrast,
        );
      }
      const contentTop = data.mainTitle.trim() ? edge + headingSize * 1.25 : edge;
      const contentHeight = canvasHeight - contentTop - edge * 0.45;
      if (landscape) {
        const gutter = canvasWidth * 0.045;
        const columnWidth = (canvasWidth - edge * 2 - gutter) / 2;
        const sectionScale = Math.min(columnWidth / 760, contentHeight / 805);
        const totalWeight = posterItems.reduce((sum, item) => sum + item.size * 1.18 + item.gap, 0);
        let runningWeight = 0;
        let splitIndex = posterItems.length;
        for (let index = 0; index < posterItems.length; index += 1) {
          runningWeight += posterItems[index].size * 1.18 + posterItems[index].gap;
          if (runningWeight >= totalWeight / 2) {
            splitIndex = Math.min(posterItems.length, index + 1);
            break;
          }
        }
        const firstColumn = posterItems.slice(0, splitIndex);
        const secondColumn = posterItems.slice(splitIndex);
        context.strokeStyle = "rgba(102, 67, 30, 0.28)";
        context.lineWidth = Math.max(2, canvasHeight * 0.003);
        context.beginPath();
        context.moveTo(canvasWidth / 2, contentTop);
        context.lineTo(canvasWidth / 2, contentTop + contentHeight);
        context.stroke();
        renderItems(firstColumn, { x: canvasWidth / 2 + gutter / 2, y: contentTop, width: columnWidth, height: contentHeight }, sectionScale);
        renderItems(secondColumn, { x: edge, y: contentTop, width: columnWidth, height: contentHeight }, sectionScale);
      } else {
        const contentWidth = canvasWidth - edge * 2;
        const sectionScale = Math.min(contentWidth / 760, contentHeight / 805);
        renderItems(posterItems, { x: edge, y: contentTop, width: contentWidth, height: contentHeight }, sectionScale);
      }
    }
    context.restore();
  }, [backgroundUrl, data]);

  useEffect(() => {
    const bg = new Image();
    const top = new Image();
    let loaded = 0;
    setReady(false);
    const done = () => {
      loaded += 1;
      if (loaded === 2) {
        background.current = bg;
        header.current = top;
        setReady(true);
      }
    };
    bg.src = backgroundUrl || "/clean-template.webp";
    top.src = "/header-source.webp";
    bg.onload = done;
    top.onload = done;
  }, [backgroundUrl]);
  useEffect(() => {
    if (ready) void document.fonts.ready.then(draw);
  }, [draw, ready]);

  const download = () => {
    if (!canvas.current) return;
    const link = document.createElement("a");
    link.download = `זמני-תפילה-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.current.toDataURL("image/png");
    link.click();
  };

  return (
    <aside className="preview-card">
      <div className="preview-head">
        <div><span className="eyebrow">תצוגה חיה</span><strong>{ready ? "מוכן להורדה" : "מכין תבנית…"}</strong></div>
        <button className="primary compact" onClick={download} disabled={!ready}>הורדת PNG</button>
      </div>
      <div className="canvas-wrap"><canvas ref={canvas} aria-label="תצוגה מקדימה של הלוח" /></div>
      <p className="hint">{backgroundUrl ? "הרקע שהעלית מחליף לחלוטין את התבנית המקורית. צבע הטקסט והניגודיות מותאמים אוטומטית לכל אזור בתמונה." : "גודל הטקסט מותאם אוטומטית לפי כמות התוכן והשטח הפנוי בתוך המסגרת."}</p>
    </aside>
  );
}

function StyleControls({ style, onChange }: { style: TextStyle; onChange: (style: TextStyle) => void }) {
  return (
    <div className="style-controls">
      <label>
        <span>פונט</span>
        <select value={style.font} onChange={(event) => onChange({ ...style, font: event.target.value as FontKey })}>
          {FONT_OPTIONS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
        </select>
      </label>
      <button
        type="button"
        className={style.bold ? "bold-toggle active" : "bold-toggle"}
        aria-pressed={style.bold}
        onClick={() => onChange({ ...style, bold: !style.bold })}
      >
        <strong>ב</strong> {style.bold ? "מודגש" : "רגיל"}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  style,
  onChange,
  onStyleChange,
  onRemove,
}: {
  label: string;
  value: string;
  style: TextStyle;
  onChange: (value: string) => void;
  onStyleChange: (style: TextStyle) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="styled-item">
      <div className="item-toolbar">
        <span className="item-kind">{label}</span>
        {onRemove && <button type="button" className="remove compact-remove" aria-label={`הסרת ${label}`} onClick={onRemove}>×</button>}
      </div>
      <label className="field"><span className="sr-only">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={label} /></label>
      <StyleControls style={style} onChange={onStyleChange} />
    </div>
  );
}

const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  heading: "כותרת",
  text: "שורה רגילה",
  timed: "שורה עם שעה",
};

function ContentEditor({ items, onChange }: { items: ContentItem[]; onChange: (items: ContentItem[]) => void }) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const [headingChoicesAt, setHeadingChoicesAt] = useState<number | null>(null);
  const insertAt = (index: number, kind: ItemKind, headingVariant: HeadingVariant = "title") => {
    onChange([...items.slice(0, index), newItem(kind, "", "", kind === "heading" ? boldStyle() : normalStyle(), headingVariant), ...items.slice(index)]);
    setOpenAt(null);
    setHeadingChoicesAt(null);
  };
  const update = (id: string, change: Partial<ContentItem>) =>
    onChange(items.map((item) => item.id === id ? { ...item, ...change } : item));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    onChange(reordered);
  };
  const insertion = (index: number, ending = false) => (
    <div className="insert-control">
      <button
        type="button"
        className={openAt === index ? "insert-line active" : "insert-line"}
        aria-expanded={openAt === index}
        onClick={() => {
          setOpenAt(openAt === index ? null : index);
          setHeadingChoicesAt(null);
        }}
      >
        {openAt === index ? "סגירת אפשרויות" : ending ? "+ הוספה בסוף" : "+ הוספה כאן"}
      </button>
      {openAt === index && (
        <div className="insert-menu" role="group" aria-label="בחירת סוג שורה">
          <span>מה להוסיף?</span>
          <button type="button" onClick={() => insertAt(index, "text")}>שורה רגילה</button>
          <button type="button" onClick={() => insertAt(index, "timed")}>שורה עם שעה</button>
          <button type="button" aria-expanded={headingChoicesAt === index} onClick={() => setHeadingChoicesAt(headingChoicesAt === index ? null : index)}>כותרת ▾</button>
          {headingChoicesAt === index && (
            <div className="heading-choices" role="group" aria-label="בחירת סוג כותרת">
              <span>איזו כותרת?</span>
              <button type="button" onClick={() => insertAt(index, "heading", "title")}>כותרת רגילה</button>
              <button type="button" onClick={() => insertAt(index, "heading", "divider")}>קו מפריד</button>
              <button type="button" onClick={() => insertAt(index, "heading", "spacer")}>רווח</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
  return (
    <div className="stack content-editor">
      {items.map((item, index) => (
        <Fragment key={item.id}>
          {insertion(index)}
          <div className={`styled-item content-item ${item.kind}`}>
            <div className="item-toolbar">
              <label className="kind-select">
                <span className="sr-only">סוג השורה</span>
                <select value={item.kind} onChange={(event) => {
                  const kind = event.target.value as ItemKind;
                  update(item.id, { kind, headingVariant: kind === "heading" ? "title" : item.headingVariant });
                }}>
                  <option value="text">שורה רגילה</option>
                  <option value="timed">שורה עם שעה</option>
                  <option value="heading">כותרת</option>
                </select>
              </label>
              {item.kind === "heading" && (
                <label className="kind-select heading-variant-select">
                  <span className="sr-only">סוג הכותרת</span>
                  <select value={item.headingVariant} onChange={(event) => update(item.id, { headingVariant: event.target.value as HeadingVariant })}>
                    <option value="title">כותרת רגילה</option>
                    <option value="divider">קו מפריד</option>
                    <option value="spacer">רווח</option>
                  </select>
                </label>
              )}
              <div className="item-actions">
                <button type="button" className="move-item" disabled={index === 0} aria-label="הזזה למעלה" onClick={() => move(index, -1)}>↑</button>
                <button type="button" className="move-item" disabled={index === items.length - 1} aria-label="הזזה למטה" onClick={() => move(index, 1)}>↓</button>
                <button type="button" className="remove compact-remove" aria-label={`מחיקת ${ITEM_KIND_LABELS[item.kind]}`} onClick={() => onChange(items.filter((entry) => entry.id !== item.id))}>×</button>
              </div>
            </div>
            {item.kind === "heading" && item.headingVariant !== "title" ? (
              <p className="structural-item-note">{item.headingVariant === "divider" ? "קו מפריד יוצג כאן בלוח" : "יישמר כאן רווח בין השורות"}</p>
            ) : item.kind === "timed" ? (
              <div className="row-input">
                <input aria-label="שם התפילה או האירוע" value={item.text} onChange={(event) => update(item.id, { text: event.target.value })} placeholder="מנחה" />
                <input aria-label="שעה" className="time" value={item.time} onChange={(event) => update(item.id, { time: event.target.value })} placeholder="19:25" />
              </div>
            ) : (
              <div className="note-input single-input">
                <input aria-label={ITEM_KIND_LABELS[item.kind]} value={item.text} onChange={(event) => update(item.id, { text: event.target.value })} placeholder={item.kind === "heading" ? "לדוגמה: יום שבת" : "טקסט ממורכז"} />
              </div>
            )}
            {!(item.kind === "heading" && item.headingVariant !== "title") && <StyleControls style={item.style} onChange={(style) => update(item.id, { style })} />}
          </div>
        </Fragment>
      ))}
      {insertion(items.length, true)}
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<Poster>(example);
  const [mode, setMode] = useState<"form" | "text">("form");
  const [freeText, setFreeText] = useState('מנחה ערב שבת 19:25, שחרית 07:30, שיעור תורה 17:45, מנחה שבת 18:30, סעודה שלישית, דברי תורה מפי הרב אפרגן, ערבית מוצ״ש 20:20, הבדלה.');
  const [copied, setCopied] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [backgroundName, setBackgroundName] = useState("");
  const [backgroundError, setBackgroundError] = useState("");
  const set = <K extends keyof Poster>(key: K, value: Poster[K]) => setData((current) => ({ ...current, [key]: value }));
  const setMainTitleStyle = (style: TextStyle) =>
    setData((current) => ({ ...current, fieldStyles: { ...current.fieldStyles, mainTitle: style } }));

  useEffect(() => {
    const shared = new URLSearchParams(window.location.search).get("d");
    if (shared) {
      const result = decode(shared);
      if (result) setData(result);
    }
  }, []);

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/?d=${encode(data)}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const chooseBackground = (file: File | undefined) => {
    setBackgroundError("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setBackgroundError("אפשר לבחור תמונת PNG, JPG או WEBP.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setBackgroundError("גודל התמונה יכול להיות עד 12MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBackgroundUrl(reader.result);
        setBackgroundName(file.name);
      }
    };
    reader.onerror = () => setBackgroundError("לא הצלחנו לקרוא את התמונה. נסו קובץ אחר.");
    reader.readAsDataURL(file);
  };

  const restoreExample = () => {
    setData(example());
    setBackgroundUrl(null);
    setBackgroundName("");
    setBackgroundError("");
  };

  return (
    <main className="app-shell" dir="rtl">
      <header className="site-head">
        <div><span className="kicker">בית כנסת אברך שלום</span><h1>יוצרים לוח זמני תפילה בדקות</h1><p>ממלאים, בודקים ומורידים תמונה מוכנה להפצה.</p></div>
        <Link href="/gpt" className="gpt-link">חיבור ל־GPT <span>←</span></Link>
      </header>
      <section className="workspace">
        <article className="editor-card">
          <div className="editor-head">
            <div><span className="eyebrow">עריכת הלוח</span><h2>מה יופיע השבוע?</h2></div>
            <div className="tabs"><button className={mode === "form" ? "active" : ""} onClick={() => setMode("form")}>טופס</button><button className={mode === "text" ? "active" : ""} onClick={() => setMode("text")}>טקסט חופשי</button></div>
          </div>
          {mode === "text" ? (
            <div className="free-panel">
              <label className="field"><span>כתבו את כל הפרטים במשפט או בכמה שורות</span><textarea rows={9} value={freeText} onChange={(event) => setFreeText(event.target.value)} /></label>
              <p className="hint">המערכת מזהה גם כותרת ראשית כשכותבים ״כותרת הלוח:״, וכן פרשה, הפטרה, תפילות ושעות. השורות נשמרות לפי סדר הופעתן בטקסט, ואפשר לדייק אחר כך בטופס.</p>
              <button className="primary" onClick={() => { setData(parseFreeText(freeText, data)); setMode("form"); }}>מילוי אוטומטי מהטקסט</button>
            </div>
          ) : (
            <div>
              <section className="form-section"><b>01</b><div><h3>כותרת ראשית</h3><Field label="כותרת ראשית של הלוח" value={data.mainTitle} style={data.fieldStyles.mainTitle} onChange={(value) => set("mainTitle", value)} onStyleChange={setMainTitleStyle} onRemove={() => set("mainTitle", "")} /><p className="hint">אפשר למחוק את הכותרת לחלוטין או להקליד אותה מחדש בכל שלב.</p></div></section>
              <section className="form-section"><b>02</b><div><h3>תוכן הלוח לפי הסדר</h3><p className="ordering-note">זהו הסדר המדויק שיופיע בתמונה. אפשר להזיז, למחוק או להוסיף כל רכיב — גם כותרות.</p><ContentEditor items={data.items} onChange={(value) => set("items", value)} /></div></section>
              <section className="form-section"><b>03</b><div><h3>תמונת רקע</h3><div className="background-picker"><label className="upload-button" htmlFor="background-upload">בחירת תמונת רקע</label><input id="background-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseBackground(event.target.files?.[0])} /><button type="button" className="secondary" disabled={!backgroundUrl} onClick={() => { setBackgroundUrl(null); setBackgroundName(""); setBackgroundError(""); }}>חזרה לרקע המקורי</button></div><p className="background-status">{backgroundName ? `נבחרה: ${backgroundName}` : "הרקע המקורי פעיל"}</p>{backgroundError && <p className="background-error">{backgroundError}</p>}<p className="hint">רקע חלופי מסיר לחלוטין את התבנית המקורית. צבע הטקסט מותאם אוטומטית לבהירות התמונה, ובאזורים עמוסים נוסף רקע קטן וצמוד לטקסט לשמירת הקריאות. ההתאמה לאורך ולרוחב נשמרת.</p></div></section>
            </div>
          )}
          <div className="actions"><button className="secondary" onClick={restoreExample}>שחזור דוגמה</button><button className="secondary" onClick={copyLink}>{copied ? "הקישור הועתק" : "העתקת קישור לעריכה"}</button></div>
        </article>
        <PosterPreview data={data} backgroundUrl={backgroundUrl} />
      </section>
      <footer><span>בית כנסת אהבת שלום · <small>נוצר על ידי רפאל ששון</small></span><Link href="/privacy">מדיניות פרטיות</Link></footer>
    </main>
  );
}