import type { DataConnector, ImportedItem } from "./types";

function mockConnector(name: string, items: ImportedItem[]): DataConnector {
  return {
    name,
    async import() {
      return items;
    },
    isConfigured() {
      return true;
    },
  };
}

export const obsidianConnector = mockConnector("Obsidian", [
  {
    source: "obsidian",
    externalId: "obs-001",
    title: "Research Notes: ML Fundamentals",
    content: "Key concepts reviewed for upcoming interview preparation",
    timestamp: new Date("2024-01-15"),
  },
  {
    source: "obsidian",
    externalId: "obs-002",
    title: "Meeting Notes: Prof. Chen",
    content: "Discussed TA position requirements and timeline",
    timestamp: new Date("2024-01-20"),
  },
]);

export const notionConnector = mockConnector("Notion", [
  {
    source: "notion",
    externalId: "not-001",
    title: "Startup Pitch Deck Draft",
    content: "v3 of pitch deck with updated market size",
    timestamp: new Date("2024-02-01"),
  },
]);

export const gmailConnector = mockConnector("Gmail", [
  {
    source: "gmail",
    externalId: "gm-001",
    title: "Re: TA Application Follow-up",
    content: "Professor confirmed receipt of application",
    timestamp: new Date("2024-02-10"),
  },
]);

export const calendarConnector = mockConnector("Google Calendar", [
  {
    source: "calendar",
    externalId: "cal-001",
    title: "Office Hours with Prof. Chen",
    timestamp: new Date("2024-02-15"),
  },
]);

export const attioConnector = mockConnector("Attio", [
  {
    source: "attio",
    externalId: "att-001",
    title: "Contact: Sarah Kim, Venture Partner",
    metadata: { organization: "Sequoia", role: "Partner" },
  },
]);

export const csvConnector = mockConnector("CSV Import", []);

export const allConnectors: DataConnector[] = [
  obsidianConnector,
  notionConnector,
  gmailConnector,
  calendarConnector,
  attioConnector,
  csvConnector,
];
