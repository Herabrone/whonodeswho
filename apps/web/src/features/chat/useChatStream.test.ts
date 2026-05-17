import { describe, expect, it } from "vitest";
import { parseSseBuffer } from "./useChatStream";

describe("parseSseBuffer", () => {
  it("parses complete SSE data frames", () => {
    const result = parseSseBuffer(
      'data: {"type":"token","content":"Hi"}\n\ndata: {"type":"done"}\n\n',
    );

    expect(result.remainder).toBe("");
    expect(result.events).toEqual([
      { type: "token", content: "Hi" },
      { type: "done" },
    ]);
  });

  it("keeps incomplete frames as the remainder", () => {
    const result = parseSseBuffer(
      'data: {"type":"token","content":"Hi"}\n\ndata: {"type":"token"',
    );

    expect(result.events).toEqual([{ type: "token", content: "Hi" }]);
    expect(result.remainder).toBe('data: {"type":"token"');
  });
});
