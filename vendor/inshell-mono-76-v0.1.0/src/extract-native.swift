#!/usr/bin/env swift

import CoreGraphics
import CoreText
import Foundation

private let canonicalOrder =
  " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'\"-()/&"
private let numericPrecision = 6

private struct OutlineCommand {
  let kind: String
  let points: [CGPoint]
}

private struct NativeGlyph {
  let character: Character
  let glyphID: CGGlyph
  let advanceWidth: Double
  let commands: [OutlineCommand]
}

private struct BoundsAccumulator {
  var xMin = Double.infinity
  var yMin = Double.infinity
  var xMax = -Double.infinity
  var yMax = -Double.infinity

  var isEmpty: Bool { !xMin.isFinite }

  mutating func include(_ point: CGPoint) {
    xMin = min(xMin, Double(point.x))
    yMin = min(yMin, Double(point.y))
    xMax = max(xMax, Double(point.x))
    yMax = max(yMax, Double(point.y))
  }

  func jsonObject() -> [String: Any] {
    [
      "xMin": clean(xMin),
      "yMin": clean(yMin),
      "xMax": clean(xMax),
      "yMax": clean(yMax)
    ]
  }
}

private func fail(_ message: String) -> Never {
  FileHandle.standardError.write(Data("error: \(message)\n".utf8))
  Foundation.exit(2)
}

private func clean(_ value: Double) -> Double {
  guard value.isFinite else { return value }
  let factor = pow(10.0, Double(numericPrecision))
  let result = (value * factor).rounded() / factor
  return result == 0 ? 0 : result
}

private func numberString(_ value: Double) -> String {
  let value = clean(value)
  var result = String(
    format: "%.\(numericPrecision)f",
    locale: Locale(identifier: "en_US_POSIX"),
    value
  )
  while result.contains(".") && result.last == "0" {
    result.removeLast()
  }
  if result.last == "." {
    result.removeLast()
  }
  return result == "-0" ? "0" : result
}

private func commands(in path: CGPath) -> [OutlineCommand] {
  var result: [OutlineCommand] = []
  path.applyWithBlock { elementPointer in
    let element = elementPointer.pointee
    switch element.type {
    case .moveToPoint:
      result.append(OutlineCommand(kind: "M", points: [element.points[0]]))
    case .addLineToPoint:
      result.append(OutlineCommand(kind: "L", points: [element.points[0]]))
    case .addQuadCurveToPoint:
      result.append(
        OutlineCommand(
          kind: "Q",
          points: [element.points[0], element.points[1]]
        )
      )
    case .addCurveToPoint:
      result.append(
        OutlineCommand(
          kind: "C",
          points: [element.points[0], element.points[1], element.points[2]]
        )
      )
    case .closeSubpath:
      result.append(OutlineCommand(kind: "Z", points: []))
    @unknown default:
      fail("encountered an unknown Core Graphics path command")
    }
  }
  return result
}

private func nativeGlyphs(from font: CTFont) -> [NativeGlyph] {
  canonicalOrder.map { character in
    guard let scalar = character.unicodeScalars.first, scalar.value <= UInt16.max else {
      fail("canonical character \(String(reflecting: character)) is not a BMP scalar")
    }

    var unicode = UniChar(scalar.value)
    var glyph = CGGlyph()
    guard CTFontGetGlyphsForCharacters(font, &unicode, &glyph, 1), glyph != 0 else {
      fail("font does not provide \(String(reflecting: character))")
    }

    var glyphForAdvance = glyph
    var advance = CGSize.zero
    _ = CTFontGetAdvancesForGlyphs(
      font,
      .horizontal,
      &glyphForAdvance,
      &advance,
      1
    )

    let outline: [OutlineCommand]
    if character == " " {
      outline = []
    } else {
      guard let path = CTFontCreatePathForGlyph(font, glyph, nil) else {
        fail("font returned no outline for \(String(reflecting: character))")
      }
      outline = commands(in: path)
      if outline.isEmpty {
        fail("font returned an empty outline for \(String(reflecting: character))")
      }
    }

    return NativeGlyph(
      character: character,
      glyphID: glyph,
      advanceWidth: clean(Double(advance.width)),
      commands: outline
    )
  }
}

private func pathData(_ commands: [OutlineCommand]) -> String {
  var d = ""
  for command in commands {
    d += command.kind
    for (index, point) in command.points.enumerated() {
      if index > 0 {
        d += " "
      }
      d += "\(numberString(Double(point.x))) \(numberString(Double(point.y)))"
    }
  }
  return d
}

private func jsonGlyph(_ glyph: NativeGlyph) -> [String: Any] {
  var commandCounts = ["M": 0, "L": 0, "Q": 0, "C": 0, "Z": 0]
  var coordinateCount = 0
  var coordinateBounds = BoundsAccumulator()

  for command in glyph.commands {
    commandCounts[command.kind, default: 0] += 1
    coordinateCount += command.points.count
    for point in command.points {
      coordinateBounds.include(point)
    }
  }

  return [
    "character": String(glyph.character),
    "codepoint": Int(glyph.character.unicodeScalars.first!.value),
    "glyphID": Int(glyph.glyphID),
    "advanceWidth": glyph.advanceWidth,
    "d": pathData(glyph.commands),
    "commandCount": glyph.commands.count,
    "commandCounts": commandCounts,
    "coordinateCount": coordinateCount,
    "coordinateBounds": coordinateBounds.isEmpty
      ? NSNull()
      : coordinateBounds.jsonObject()
  ]
}

guard CommandLine.arguments.count == 2 else {
  fail("usage: swift extract-native.swift /absolute/path/to/font.ttf")
}

guard canonicalOrder.count == 76, Set(canonicalOrder).count == 76 else {
  fail("internal canonical repertoire is not exactly 76 unique characters")
}

let sourceURL = URL(fileURLWithPath: CommandLine.arguments[1]).standardizedFileURL
guard sourceURL.pathExtension.lowercased() == "ttf" else {
  fail("input must be a .ttf file")
}
guard FileManager.default.isReadableFile(atPath: sourceURL.path) else {
  fail("cannot read \(sourceURL.path)")
}
guard
  let provider = CGDataProvider(url: sourceURL as CFURL),
  let graphicsFont = CGFont(provider)
else {
  fail("Core Graphics could not load \(sourceURL.path)")
}

let unitsPerEm = Int(graphicsFont.unitsPerEm)
guard unitsPerEm > 0 else {
  fail("font reports an invalid units-per-em value")
}

let font = CTFontCreateWithGraphicsFont(
  graphicsFont,
  CGFloat(unitsPerEm),
  nil,
  nil
)
private let glyphs = nativeGlyphs(from: font)
guard glyphs.allSatisfy({ $0.advanceWidth == 600 }) else {
  fail("the restricted repertoire is not uniformly 600 units wide")
}

let glyphObjects = glyphs.map(jsonGlyph)
let fontBounds = CTFontGetBoundingBox(font)
let pathBytes = glyphObjects.reduce(0) {
  $0 + (($1["d"] as! String).lengthOfBytes(using: .utf8))
}
let commandCount = glyphObjects.reduce(0) {
  $0 + ($1["commandCount"] as! Int)
}
let coordinateCount = glyphObjects.reduce(0) {
  $0 + ($1["coordinateCount"] as! Int)
}

let postScriptName = CTFontCopyPostScriptName(font) as String
let fullName = CTFontCopyFullName(font) as String
let familyName = CTFontCopyFamilyName(font) as String
let styleName = (
  CTFontCopyName(font, kCTFontStyleNameKey) as String?
) ?? ""
let versionName = (
  CTFontCopyName(font, kCTFontVersionNameKey) as String?
) ?? ""

let output: [String: Any] = [
  "schema": "inshell.mono-76.native-source.v1",
  "canonicalOrder": canonicalOrder,
  "source": [
    "fileName": sourceURL.lastPathComponent,
    "postScriptName": postScriptName,
    "fullName": fullName,
    "familyName": familyName,
    "styleName": styleName,
    "versionName": versionName,
    "unitsPerEm": unitsPerEm,
    "fontMetrics": [
      "baseline": 0,
      "ascent": clean(Double(CTFontGetAscent(font))),
      "descent": clean(Double(CTFontGetDescent(font))),
      "leading": clean(Double(CTFontGetLeading(font))),
      "capHeight": clean(Double(CTFontGetCapHeight(font))),
      "xHeight": clean(Double(CTFontGetXHeight(font))),
      "fontBoundingBox": [
        "xMin": clean(Double(fontBounds.minX)),
        "yMin": clean(Double(fontBounds.minY)),
        "xMax": clean(Double(fontBounds.maxX)),
        "yMax": clean(Double(fontBounds.maxY))
      ]
    ]
  ],
  "metrics": [
    "unitsPerEm": unitsPerEm,
    "baseline": 0,
    "fixedAdvanceWidth": 600,
    "coordinateSystem": "native font units, y-up",
    "fillRule": "nonzero",
    "space": [
      "advanceWidth": 600,
      "drawsPath": false
    ]
  ],
  "glyphs": glyphObjects,
  "totals": [
    "glyphCount": glyphObjects.count,
    "visibleGlyphCount": glyphObjects.filter {
      !(($0["d"] as! String).isEmpty)
    }.count,
    "pathBytes": pathBytes,
    "commandCount": commandCount,
    "coordinateCount": coordinateCount
  ]
]

guard JSONSerialization.isValidJSONObject(output) else {
  fail("output is not valid JSON")
}

let data = try JSONSerialization.data(
  withJSONObject: output,
  options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
)
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write(Data("\n".utf8))
