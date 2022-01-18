// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC777/ERC777.sol";

contract ERC777Mock is Context, ERC777 {
    event BeforeTokenTransfer();

    constructor() ERC777("ERC777Mock", "M777", new address[](0)) {}

    function mintInternal(
        address to,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData
    ) public {
        _mint(to, amount, userData, operatorData);
    }

    function mintInternalExtended(
        address to,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData,
        bool requireReceptionAck
    ) public {
        _mint(to, amount, userData, operatorData, requireReceptionAck);
    }

    function approveInternal(
        address holder,
        address spender,
        uint256 value
    ) public {
        _approve(holder, spender, value);
    }

    function _beforeTokenTransfer(
        address,
        address,
        address,
        uint256
    ) internal override {
        emit BeforeTokenTransfer();
    }
}