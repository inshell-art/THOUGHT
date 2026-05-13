import { describe, expect, it } from "vitest";
import colorFontText from "../spec/COLOR_FONT.v1.txt?raw";
import { INSHELL_COLOR_FONT } from "./svg-raw-renderer";
import { buildColorFontPlainText, validateColorFontDataShape, type ColorFontDoc } from "./color-font-doc";

const canonicalData = [
  "A:1:aqua:#00ffff",
  "B:2:blue:#0000ff",
  "C:3:coffee:#6f4e37",
  "D:4:denim:#6699ff",
  "E:5:eggshell:#fff9e3",
  "F:6:fuchsia:#ff00ff",
  "G:7:green:#008000",
  "H:8:honey:#ffcc00",
  "I:9:indigo:#4b0082",
  "J:10:jade green:#00a86b",
  "K:11:khaki:#c3b091",
  "L:12:lime:#00ff00",
  "M:13:maroon:#800000",
  "N:14:navy:#0a1172",
  "O:15:orange:#ffa500",
  "P:16:pink:#ffaadd",
  "Q:17:quicksilver:#a6a6a6",
  "R:18:red:#ff0000",
  "S:19:salmon:#fa8072",
  "T:20:teal:#008080",
  "U:21:ultramarine:#5533ff",
  "V:22:violet:#aa55ff",
  "W:23:wheat:#f5deb3",
  "X:24:xray:#bbcccc",
  "Y:25:yellow:#ffff00",
  "Z:26:zombie gray:#778877",
].join("\n");

const doc: ColorFontDoc = {
  id: "inshell.colorfont.v1",
  version: "v1",
  chainId: 31337,
  chainName: "Anvil Local",
  contractAddress: "0x0000000000000000000000000000000000000001",
  hash: "0x1111111111111111111111111111111111111111111111111111111111111111",
  format: "LETTER:INDEX:ALIAS_TERM:HEX",
  data: canonicalData,
};

describe("color font doc", () => {
  it("builds a plain-text onchain document", () => {
    const text = buildColorFontPlainText(doc);

    expect(text).toContain("Color Font v1");
    expect(text).toContain("source: onchain ABI");
    expect(text).toContain("chain id: 31337");
    expect(text).toContain("contract: 0x0000000000000000000000000000000000000001");
    expect(text).toContain("format: LETTER:INDEX:ALIAS_TERM:HEX");
    expect(text).toContain(canonicalData);
  });

  it("validates compact A-Z mapping shape", () => {
    expect(validateColorFontDataShape(canonicalData)).toBe(true);
    expect(validateColorFontDataShape(`${canonicalData}\n`)).toBe(false);
    expect(validateColorFontDataShape(canonicalData.replace("A:1", "A:0"))).toBe(false);
  });

  it("keeps repository and frontend color maps aligned", () => {
    expect(colorFontText).toBe(canonicalData);
    for (const line of colorFontText.split("\n")) {
      const [letter, , , hex] = line.split(":");
      expect(`#${INSHELL_COLOR_FONT[letter]}`).toBe(hex);
    }
  });
});
