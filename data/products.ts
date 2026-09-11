export type ProductCategory = "tops" | "keychains" | "bouquets" | "bag-charms";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  shortDescription: string;
  description: string;
  images: string[];
  customisation?: string;
  preparationTime?: string;
  price?: string;
}

export const categories: { id: ProductCategory; label: string }[] = [
  { id: "tops", label: "Tops" },
  { id: "keychains", label: "Keychains" },
  { id: "bouquets", label: "Bouquets" },
  { id: "bag-charms", label: "Bag Charms" },
];

export const products: Product[] = [
  {
    id: "flower-bouquet",
    name: "Crochet Flower Bouquet",
    category: "bouquets",
    shortDescription: "A forever bouquet of softly stitched blooms for life’s sweetest moments.",
    description: "A thoughtfully arranged bouquet of hand-crocheted peonies, daisies and delicate leaves. Every stem is shaped and finished by hand, creating a keepsake that stays beautiful long after the occasion.",
    images: ["/images/crochet-bouquet.png"],
    customisation: "Flower mix, colour palette and bouquet size can be personalised.",
    preparationTime: "5–8 days",
    price: "From ₹1,299",
  },
  {
    id: "floral-keychain",
    name: "Handmade Floral Keychain",
    category: "keychains",
    shortDescription: "A tiny pop of crochet joy for keys, bags and thoughtful surprises.",
    description: "A petite floral keepsake crocheted with fine yarn and finished with secure gold-tone hardware. It makes a charming everyday accessory or a sweet addition to a gift.",
    images: ["/images/crochet-gifts.png"],
    customisation: "Choose the flower style, colours and an optional initial tag.",
    preparationTime: "3–5 days",
  },
  {
    id: "bunny-bag-charm",
    name: "Crochet Bunny Bag Charm",
    category: "bag-charms",
    shortDescription: "A soft little companion, hand stitched to brighten your favourite bag.",
    description: "This miniature crochet bunny is carefully shaped, embroidered and finished as a lightweight bag charm. Each one has its own gentle character and handmade details.",
    images: ["/images/crochet-gifts.png"],
    customisation: "Outfit colour, flower detail and hardware finish can be discussed.",
    preparationTime: "5–7 days",
    price: "From ₹699",
  },
  {
    id: "custom-floral-gift-set",
    name: "Custom Floral Gift Set",
    category: "bouquets",
    shortDescription: "A considered pairing of forever flowers and small crochet keepsakes.",
    description: "A made-to-order gift set centred on a crochet bouquet and finished with small handmade details chosen for the recipient. The selection and presentation are planned with you before making begins.",
    images: ["/images/crochet-bouquet.png", "/images/crochet-gifts.png"],
    customisation: "Bouquet colours, keepsake selection, message and presentation can be personalised.",
    preparationTime: "7–12 days",
    price: "Price confirmed after customisation",
  },];

