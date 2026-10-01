import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    openapi: "3.1.0",
    info: { title: "Prayer Times Poster API", version: "1.0.0" },
    servers: [{ url: origin }],
    paths: {
      "/api/create-poster": {
        post: {
          operationId: "createPrayerPoster",
          summary: "Create a Hebrew prayer-times poster link",
          "x-openai-isConsequential": false,
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/Poster" } } },
          },
          responses: {
            "200": {
              description: "Poster link created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      preview_url: { type: "string", format: "uri" },
                      edit_url: { type: "string", format: "uri" },
                      message: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        TextStyle: {
          type: "object",
          properties: {
            font: {
              type: "string",
              enum: ["arial", "david", "assistant", "frank", "noto", "heebo", "rubik", "alef"],
              description: "Optional font choice. Defaults to david.",
            },
            bold: { type: "boolean", description: "Whether the entire line is bold. Defaults to true." },
          },
        },
        PosterItem: {
          type: "object",
          required: ["kind", "text"],
          properties: {
            kind: {
              type: "string",
              enum: ["heading", "text", "timed"],
              description: "heading for a removable section title, text for a regular centered line, timed for a label with a time",
            },
            text: { type: "string", description: "Exact Hebrew text or, for a timed item, the prayer/event label" },
            time: { type: "string", description: "Only for timed items; preserve the time exactly as supplied" },
            headingVariant: {
              type: "string",
              enum: ["title", "divider", "spacer"],
              description: "Only for heading items: title for a normal title, divider for a horizontal line, or spacer for blank vertical space",
            },
            style: { $ref: "#/components/schemas/TextStyle" },
          },
        },
        Poster: {
          type: "object",
          required: ["items"],
          properties: {
            mainTitle: { type: "string", description: "Editable main poster title, usually זמני תפילה. Send an empty string to hide it." },
            items: {
              type: "array",
              description: "Every visible content item in exact top-to-bottom order. Never reorder by meaning. By default use blank-name lines פרשת השבוע and הפטרה, then after הבדלה add a divider, the heading זמני תפילות ביום חול, and timed rows מנחה and ערבית with blank editable times.",
              maxItems: 60,
              items: { $ref: "#/components/schemas/PosterItem" },
            },
            fieldStyles: {
              type: "object",
              description: "Optional font and bold setting for the main title.",
              properties: { mainTitle: { $ref: "#/components/schemas/TextStyle" } },
            },
          },
        },
      },
    },
  });
}