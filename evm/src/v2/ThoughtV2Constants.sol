// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library ThoughtV2Constants {
    string internal constant WORK_PROFILE_ID = "inshell.thought.work.v2.terminal-english-64";
    bytes32 internal constant WORK_PROFILE_ID_HASH = keccak256(bytes(WORK_PROFILE_ID));

    string internal constant RENDERER_ID = "inshell.thought.svg.v2.terminal-chat-path-glyphs";
    bytes32 internal constant RENDERER_ID_HASH = keccak256(bytes(RENDERER_ID));

    string internal constant CONTEXT_PROFILE_ID = "inshell.thought.context.v2.visible-utf8-64";
    bytes32 internal constant CONTEXT_PROFILE_ID_HASH = keccak256(bytes(CONTEXT_PROFILE_ID));

    string internal constant METADATA_PROFILE_ID = "inshell.thought.metadata.v2.terminal-chat";
    bytes32 internal constant METADATA_PROFILE_ID_HASH = keccak256(bytes(METADATA_PROFILE_ID));

    string internal constant CREATION_ATTESTATION_PROFILE = "inshell.thought.creation-workflow-attestation.v1";
    bytes32 internal constant CREATION_ATTESTATION_PROFILE_ID = keccak256(bytes(CREATION_ATTESTATION_PROFILE));

    bytes32 internal constant CONVERSATION_IDENTITY_DOMAIN =
        keccak256("INSHELL_THOUGHT_V2_CONVERSATION_IDENTITY");
    bytes32 internal constant WORK_DOMAIN = keccak256("INSHELL_THOUGHT_V2_WORK");

    uint256 internal constant MAX_LINE_BYTES = 64;
    uint256 internal constant MAX_CONTEXT_LABEL_BYTES = 64;
    uint256 internal constant MAX_PROVENANCE_BYTES = 20_000;

    uint256 internal constant CANVAS_SIZE = 960;
    uint256 internal constant FONT_REFERENCE_SIZE = 48;
    uint256 internal constant LINE_HEIGHT = 64;
    uint256 internal constant SIDE_INSET_TENTHS = 576;
    uint256 internal constant FIELD_WIDTH_TENTHS = 8_448;
    uint256 internal constant FIELD_HEIGHT = 256;
    string internal constant BACKGROUND_COLOR = "#000000";
    string internal constant GLYPH_COLOR = "#00ba00";
}
