import mongoose, { Document, Model, Schema } from "mongoose";

// ~ cards interface
interface ICards extends Document {
  Href?: string;
  ImageLink?: string;
  Alt?: string;
  hrefH1?: string;
  hrefNumbers?: [string];
  hrefNames?: [string];
  hrefPrices?: [string];
}

// ~ listofhrefs interface
interface IListOfHrefs extends Document {
  H1Tag?: string;
  cards?: ICards[];
}

// ~ products interface
interface IProduct extends Document {
  ParentTitle?: string;
  ImageLink?: string;
  Alt?: string;
  thumbnail: object;
  category?: string;
  subcategory?: string;
  product_name?: string;
  price: number;
  Family?: string;
  Years?: string;
  Frames?: string;
  Generation?: string;
  BreadcrumbsH1?: string;
  TypesDiv?: string;
  TextsDiv?: string;
  ListOfHrefs?: IListOfHrefs[];
  purchased?: number;
}

//! ---------------   schema for the products

// ~ card schema
const cardSchema = new Schema<ICards>({
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
const listOfHrefsSchema = new Schema<IListOfHrefs>({
  H1Tag: String,
  cards: [cardSchema],
});

// ~ products Schema
const productsSchema = new Schema<IProduct>(
  {
    ParentTitle: String,
    ImageLink: String,
    Alt: String,
    category: String,
    subcategory: String,
    product_name: String,
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
  },
  { timestamps: true }
);

const ProductModel: Model<IProduct> = mongoose.model("Product", productsSchema);

export default ProductModel;
