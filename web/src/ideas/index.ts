/**
 * The curated Ideas catalogue (contract C5): the same `ideas.en.json` / `ideas.zh.json` the
 * Android app and the harness ship, byte for byte (a test holds them identical). The web
 * app ships English only, so only the English catalogue is shown; the zh file stays as
 * data so the byte-identity check across the platforms keeps passing. It is what the
 * Ideas page shows until the model has written ideas of its own from what it knows.
 */
import type { Idea } from "../types";
import en from "./ideas.en.json";

export interface CatalogueIdea {
  id: string;
  emoji: string;
  title: string;
  body: string;
  kind: "CHAT" | "ROUTINE" | "GOAL" | string;
  time?: string;
  category?: string;
  prompt: string;
}

export interface CatalogueSection {
  id: string;
  title: string;
  ideas: CatalogueIdea[];
}

export interface Catalogue {
  sections: CatalogueSection[];
}

/** The catalogue, English only. */
export function catalogue(_locale: string): Catalogue {
  return en as Catalogue;
}

/** A catalogue idea in the shape the page renders (the runtime's `Idea`), with its own emoji. */
export function asIdea(c: CatalogueIdea): Idea & { emoji: string; id: string } {
  return {
    id: c.id,
    emoji: c.emoji,
    title: c.title,
    detail: c.body,
    prompt: c.prompt,
    kind: c.kind.toLowerCase(),
    time: c.time,
    category: c.category,
  };
}
