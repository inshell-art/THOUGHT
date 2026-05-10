// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library ColorFontV1 {
    error InvalidColorFontIndex();
    error InvalidColorFontLetter();

    function id() internal pure returns (string memory) {
        return "thought.colorfont.v1";
    }

    function version() internal pure returns (string memory) {
        return "v1";
    }

    function length() internal pure returns (uint8) {
        return 26;
    }

    function data() internal pure returns (string memory) {
        return string.concat(
            "A:1:aqua:#00ffff\n",
            "B:2:blue:#0000ff\n",
            "C:3:coffee:#6f4e37\n",
            "D:4:denim:#6699ff\n",
            "E:5:eggshell:#fff9e3\n",
            "F:6:fuchsia:#ff00ff\n",
            "G:7:green:#008000\n",
            "H:8:honey:#ffcc00\n",
            "I:9:indigo:#4b0082\n",
            "J:10:jade green:#00a86b\n",
            "K:11:khaki:#c3b091\n",
            "L:12:lime:#00ff00\n",
            "M:13:maroon:#800000\n",
            "N:14:navy:#0a1172\n",
            "O:15:orange:#ffa500\n",
            "P:16:pink:#ffaadd\n",
            "Q:17:quicksilver:#a6a6a6\n",
            "R:18:red:#ff0000\n",
            "S:19:salmon:#fa8072\n",
            "T:20:teal:#008080\n",
            "U:21:ultramarine:#5533ff\n",
            "V:22:violet:#aa55ff\n",
            "W:23:wheat:#f5deb3\n",
            "X:24:xray:#bbcccc\n",
            "Y:25:yellow:#ffff00\n",
            "Z:26:zombie gray:#778877"
        );
    }

    function hash() internal pure returns (bytes32) {
        return keccak256(bytes(data()));
    }

    function glyph(uint8 index)
        internal
        pure
        returns (string memory letter, uint8 ordinal, string memory aliasTerm, string memory hexColor)
    {
        if (index == 1) return ("A", 1, "aqua", "#00ffff");
        if (index == 2) return ("B", 2, "blue", "#0000ff");
        if (index == 3) return ("C", 3, "coffee", "#6f4e37");
        if (index == 4) return ("D", 4, "denim", "#6699ff");
        if (index == 5) return ("E", 5, "eggshell", "#fff9e3");
        if (index == 6) return ("F", 6, "fuchsia", "#ff00ff");
        if (index == 7) return ("G", 7, "green", "#008000");
        if (index == 8) return ("H", 8, "honey", "#ffcc00");
        if (index == 9) return ("I", 9, "indigo", "#4b0082");
        if (index == 10) return ("J", 10, "jade green", "#00a86b");
        if (index == 11) return ("K", 11, "khaki", "#c3b091");
        if (index == 12) return ("L", 12, "lime", "#00ff00");
        if (index == 13) return ("M", 13, "maroon", "#800000");
        if (index == 14) return ("N", 14, "navy", "#0a1172");
        if (index == 15) return ("O", 15, "orange", "#ffa500");
        if (index == 16) return ("P", 16, "pink", "#ffaadd");
        if (index == 17) return ("Q", 17, "quicksilver", "#a6a6a6");
        if (index == 18) return ("R", 18, "red", "#ff0000");
        if (index == 19) return ("S", 19, "salmon", "#fa8072");
        if (index == 20) return ("T", 20, "teal", "#008080");
        if (index == 21) return ("U", 21, "ultramarine", "#5533ff");
        if (index == 22) return ("V", 22, "violet", "#aa55ff");
        if (index == 23) return ("W", 23, "wheat", "#f5deb3");
        if (index == 24) return ("X", 24, "xray", "#bbcccc");
        if (index == 25) return ("Y", 25, "yellow", "#ffff00");
        if (index == 26) return ("Z", 26, "zombie gray", "#778877");
        revert InvalidColorFontIndex();
    }

    function glyphOf(bytes1 letter_)
        internal
        pure
        returns (uint8 ordinal, string memory aliasTerm, string memory hexColor)
    {
        uint8 code = uint8(letter_);
        if (code < 65 || code > 90) {
            revert InvalidColorFontLetter();
        }

        (, ordinal, aliasTerm, hexColor) = glyph(code - 64);
    }

    function hexOf(bytes1 letter_) internal pure returns (string memory hexColor) {
        (,, hexColor) = glyphOf(letter_);
    }
}
