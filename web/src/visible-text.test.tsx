import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import indexHtml from "../index.html?raw";
import viteConfig from "../vite.config.ts?raw";

// The engine needs a real canvas; the title is what we're checking here.
vi.mock("./game", () => ({ startGame: () => () => {} }));

const GAME_TITLE = "Slice Master";
const RETIRED = /good\s+pizza|great\s+pizza|tap\s?blaze/i;

describe("visible game text", () => {
  it("shows the new title in the topbar", () => {
    render(<App />);
    expect(screen.getByText(GAME_TITLE)).toBeInTheDocument();
  });

  it("has no retired name or TapBlaze text in the rendered app", () => {
    const { container } = render(<App />);
    expect(container.textContent ?? "").not.toMatch(RETIRED);
  });

  it("uses the new name in the HTML document title", () => {
    const title = indexHtml.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
    expect(title).toBe("Slice Master — FreeGameStore");
    expect(title).not.toMatch(RETIRED);
  });

  it("uses the new name in the PWA manifest fields", () => {
    const fields = ["name", "short_name", "description"].map((key) => {
      const match = viteConfig.match(new RegExp(`\\b${key}: "([^"]*)"`));
      return match?.[1] ?? "";
    });
    expect(fields[0]).toBe(GAME_TITLE);
    expect(fields[1]).toBe(GAME_TITLE);
    for (const value of fields) expect(value).not.toMatch(RETIRED);
  });
});
