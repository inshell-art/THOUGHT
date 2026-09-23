// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ThoughtV2Constants} from "./ThoughtV2Constants.sol";

library ThoughtV2Identity {
    function conversationIdentityHash(bytes32 promptLineHash, bytes32 agentLineHash)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(
            abi.encode(ThoughtV2Constants.CONVERSATION_IDENTITY_DOMAIN, promptLineHash, agentLineHash)
        );
    }

    function workHash(bytes32 promptLineHash, bytes32 agentLineHash) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                ThoughtV2Constants.WORK_DOMAIN,
                ThoughtV2Constants.RENDERER_ID_HASH,
                promptLineHash,
                agentLineHash
            )
        );
    }
}
