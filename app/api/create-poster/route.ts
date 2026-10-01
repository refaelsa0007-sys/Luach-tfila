import { NextRequest, NextResponse } from "next/server";

const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const fonts = ["arial", "david", "assistant", "frank", "noto", "heebo", "rubik", "alef"];
const style = (value: unknown, defaultBold = true) => {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    font: fonts.includes(String(item.font)) ? String(item.font) : "david",
    bold: typeof item.bold === "boolean" ? item.bold : defaultBold,
  };
};
const orderedItems = (value: unknown) =>
  Array.isArray(value)
    ? value.slice(0, 60).map((entry) => {
        const item = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
        const kind = item.kind === "heading" || item.kind === "timed" ? String(item.kind) : "text";
        const headingVariant = kind === "heading" && (item.headingVariant === "divider" || item.headingVariant === "spacer")
          ? String(item.headingVariant)
          : "title";
        return {
          id: crypto.randomUUID(),
          kind,
          headingVariant,
          text: text(item.text ?? item.label, 140),
          time: kind === "timed" ? text(item.time, 12) : "",
          style: style(item.style),
        };
      }).filter((item) => item.text || item.time || item.kind === "heading" && item.headingVariant !== "title")
    : [];
const legacyRows = (value: unknown) =>
  Array.isArray(value)
    ? value.slice(0, 20).map((entry) => {
        const row = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
        return { id: crypto.randomUUID(), kind: "timed", headingVariant: "title", text: text(row.label, 80), time: text(row.time, 12), style: style(row.style) };
      }).filter((item) => item.text || item.time)
    : [];
const legacyNotes = (value: unknown) => Array.isArray(value)
  ? value.slice(0, 20).map((entry) => {
      const note = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
      return { id: crypto.randomUUID(), kind: "text", headingVariant: "title", text: text(typeof entry === "string" ? entry : note.text, 140), time: "", style: style(note.style) };
    }).filter((item) => item.text)
  : [];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const fieldStyles = body.fieldStyles && typeof body.fieldStyles === "object" ? body.fieldStyles as Record<string, unknown> : {};
    let items = orderedItems(body.items);
    if (!Array.isArray(body.items)) {
      const pushText = (value: unknown, kind: "heading" | "text", valueStyle: unknown) => {
        const content = text(value, 140);
        if (content) items.push({ id: crypto.randomUUID(), kind, headingVariant: "title", text: content, time: "", style: style(valueStyle) });
      };
      pushText(body.dedication === undefined ? 'על שם הרב "דוד ומשה" זצוק״ל' : body.dedication, "text", fieldStyles.dedication);
      pushText(body.upperTitle, "heading", fieldStyles.upperTitle);
      pushText(body.upperSubtitle, "text", fieldStyles.upperSubtitle);
      items.push(...legacyRows(body.upperRows), ...legacyNotes(body.upperNotes));
      pushText(body.lowerTitle === undefined ? "יום שבת" : body.lowerTitle, "heading", fieldStyles.lowerTitle);
      const lowerRows = legacyRows(body.lowerRows);
      const lowerNotes = legacyNotes(body.lowerNotes);
      items.push(
        ...lowerRows.filter((item) => !/ערבית/.test(item.text)),
        ...lowerNotes.filter((item) => !/הבדלה|ברכת\s+לבנה/.test(item.text)),
        ...lowerRows.filter((item) => /ערבית/.test(item.text)),
        ...lowerNotes.filter((item) => /הבדלה|ברכת\s+לבנה/.test(item.text)),
      );
    }
    const data = {
      mainTitle: text(body.mainTitle === undefined ? "זמני תפילה" : body.mainTitle, 140),
      items,
      fieldStyles: { mainTitle: style(fieldStyles.mainTitle, true) },
    };
    const encoded = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
    const previewUrl = `${new URL(request.url).origin}/?d=${encoded}`;
    return NextResponse.json({
      preview_url: previewUrl,
      edit_url: previewUrl,
      message: "הלוח מוכן. פתחו את הקישור כדי לבדוק אותו ולהוריד PNG.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}