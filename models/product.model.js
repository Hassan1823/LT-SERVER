"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
//! ---------------   schema for the products
// ~ card schema
var cardSchema = new mongoose_1.Schema({
    Href: {
        type: String,
    },
    ImageLink: {
        type: String,
    },
    Alt: {
        type: String,
    },
    hrefH1: {
        type: String,
    },
    hrefNumbers: [
        {
            type: String,
        },
    ],
    hrefNames: [
        {
            type: String,
        },
    ],
    hrefPrices: [
        {
            type: String,
        },
    ],
});
// ~ ListOfHrefs Schema
var listOfHrefsSchema = new mongoose_1.Schema({
    H1Tag: String,
    cards: [cardSchema],
});
// ~ products Schema
var productsSchema = new mongoose_1.Schema({
    ParentTitle: String,
    ImageLink: String,
    Alt: String,
    thumbnail: {
        public_id: {
            type: String,
        },
        url: {
            type: String,
        },
    },
    price: {
        type: Number,
        default: 0,
    },
    Family: String,
    Years: String,
    Frames: String,
    Generation: String,
    BreadcrumbsH1: String,
    TypesDiv: String,
    TextsDiv: String,
    ListOfHrefs: [listOfHrefsSchema],
    purchased: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });
var ProductModel = mongoose_1.default.model("Product", productsSchema);
exports.default = ProductModel;
