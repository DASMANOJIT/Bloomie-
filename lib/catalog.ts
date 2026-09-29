import { categories, products, type Product, type ProductCategory } from "@/data/products";

export const categoryDetails: Record<ProductCategory, { title: string; description: string; intro: string }> = {
  tops: {
    title: "Handmade Crochet Tops for Women",
    description: "Explore Bloomie handmade crochet tops for women. Ask on WhatsApp about custom crochet top colours, sizing, availability, and timing.",
    intro: "Explore Bloomie handmade crochet tops. Ask before ordering to discuss the design, preferred sizing, colours, availability, and delivery details.",
  },
  keychains: {
    title: "Handmade Crochet Keychains",
    description: "Explore Bloomie crochet keychains and handmade keepsakes. Ask on WhatsApp about custom crochet gifts, colours, availability, and timing.",
    intro: "A small collection of handmade crochet keychains and keepsakes. Ask Bloomie about the selected design and any customisation options before ordering.",
  },
  bouquets: {
    title: "Crochet Flower Bouquet Gifts",
    description: "Explore Bloomie crochet flower bouquet gifts, handmade slowly in India. Ask on WhatsApp about custom crochet gifts, availability, and delivery details.",
    intro: "Bloomie crochet flower bouquets are handmade gifts for a thoughtful occasion. Ask before ordering to confirm customisation, availability, and delivery details.",
  },
  "bag-charms": {
    title: "Handmade Crochet Bag Charms",
    description: "Explore Bloomie crochet bag charms and handmade handbag accessories. Ask on WhatsApp about colours, custom crochet gifts, availability, and timing.",
    intro: "Browse handmade crochet bag charms and handbag accessories. Bloomie can confirm the available colours and customisation options for each piece.",
  },
  jewellery: {
    title: "Handmade Crochet Jewellery",
    description: "Explore Bloomie handmade crochet jewellery and accessories. Ask on WhatsApp about the current collection, availability, and customisation.",
    intro: "Browse Bloomie handmade crochet jewellery and accessories. Ask about the current collection, colours, and availability before ordering.",
  },
};

export const getCategory = (value: string): ProductCategory | undefined =>
  categories.find(category => category.id === value)?.id;

export const productSlug = (product: Product) => product.name
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

export const productPath = (product: Product) => `/creations/${product.category}/${productSlug(product)}`;

export const getProduct = (category: string, slug: string) =>
  products.find(product => product.category === category && productSlug(product) === slug);

export const getProductDescription = (product: Product) => {
  if (product.description) return product.description;

  const colours = product.variants.map(variant => variant.label).join(", ");
  const itemType: Record<ProductCategory, string> = {
    tops: "top",
    keychains: "keychain",
    bouquets: "flower bouquet",
    "bag-charms": "bag charm",
    jewellery: "jewellery piece",
  };
  return `${product.name} is a Bloomie handmade crochet ${itemType[product.category]}. Shown in ${colours}. ${product.customisation}`;
};
