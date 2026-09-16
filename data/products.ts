export type ProductCategory = "tops" | "keychains" | "bouquets" | "bag-charms" | "jewellery";

export interface ProductImage {
  src: string;
  alt: string;
  colour: string;
}

export interface ProductVariant {
  id: string;
  label: string;
  images: string[];
  swatch: string;
}

export interface ProductReview {
  id: string;
  customerName?: string;
  rating?: number;
  text?: string;
  media?: string;
}

export interface Product {
  id: string;
  productNumber: string;
  name: string;
  category: ProductCategory;
  thumbnail: string;
  images: ProductImage[];
  variants: ProductVariant[];
  description?: string;
  customisation?: string;
  preparationTime: string;
  reviews: ProductReview[];
}

export const categories: { id: ProductCategory; label: string }[] = [
  { id: "tops", label: "Tops" },
  { id: "keychains", label: "Keychains" },
  { id: "bouquets", label: "Bouquets" },
  { id: "bag-charms", label: "Bag Charms" },
  { id: "jewellery", label: "Jewellery" },
];

const preparationTime = "12–15 days";
const customisation = "Customization, final price, availability, and delivery details will be confirmed over WhatsApp.";

export const products: Product[] = [
  {
    id: "top-001",
    productNumber: "TOP-001",
    name: "Crochet Top 1",
    category: "tops",
    thumbnail: "/images/top_1.jpg",
    images: [
      { src: "/images/top_1.jpg", alt: "Crochet Top 1 in Red & Black", colour: "Red & Black" },
      { src: "/images/top_1(1).png", alt: "Crochet Top 1 in Black & White", colour: "Black & White" },
    ],
    variants: [
      { id: "red-black", label: "Red & Black", images: ["/images/top_1.jpg"], swatch: "linear-gradient(135deg, #d61624 0 49%, #111 50% 100%)" },
      { id: "black-white", label: "Black & White", images: ["/images/top_1(1).png"], swatch: "linear-gradient(135deg, #111 0 49%, #fff 50% 100%)" },
    ],
    customisation,
    preparationTime,
    reviews: [],
  },
  {
    id: "keychain-001",
    productNumber: "KEYCHAIN-001",
    name: "Keychain 1",
    category: "keychains",
    thumbnail: "/images/keychain_1.jpg",
    images: [
      { src: "/images/keychain_1.jpg", alt: "Keychain 1 in Sunflower Yellow", colour: "Sunflower Yellow" },
    ],
    variants: [
      { id: "sunflower-yellow", label: "Sunflower Yellow", images: ["/images/keychain_1.jpg"], swatch: "#f2d525" },
    ],
    customisation,
    preparationTime,
    reviews: [],
  },
  {
    id: "keychain-002",
    productNumber: "KEYCHAIN-002",
    name: "Keychain 2",
    category: "keychains",
    thumbnail: "/images/keychain_2.JPG",
    images: [
      { src: "/images/keychain_2.JPG", alt: "Keychain 2 in Dusty Rose", colour: "Dusty Rose" },
      { src: "/images/keychain_2(2).jpg", alt: "Keychain 2 in Dusty Rose, alternate view", colour: "Dusty Rose" },
    ],
    variants: [
      { id: "dusty-rose", label: "Dusty Rose", images: ["/images/keychain_2.JPG", "/images/keychain_2(2).jpg"], swatch: "#b66b75" },
    ],
    customisation,
    preparationTime,
    reviews: [],
  },
  {
    id: "keychain-003",
    productNumber: "KEYCHAIN-003",
    name: "Keychain 3",
    category: "keychains",
    thumbnail: "/images/keychain_3.jpg",
    images: [
      { src: "/images/keychain_3.jpg", alt: "Keychain 3 in Pink & White", colour: "Pink & White" },
    ],
    variants: [
      { id: "pink-white", label: "Pink & White", images: ["/images/keychain_3.jpg"], swatch: "linear-gradient(135deg, #e0167a 0 49%, #fff 50% 100%)" },
    ],
    customisation,
    preparationTime,
    reviews: [],
  },
  {
    id: "keychain-004",
    productNumber: "KEYCHAIN-004",
    name: "Keychain 4",
    category: "keychains",
    thumbnail: "/images/keychain_4.jpg",
    images: [
      { src: "/images/keychain_4.jpg", alt: "Keychain 4 in White, Black & Lavender", colour: "White, Black & Lavender" },
    ],
    variants: [
      { id: "white-black-lavender", label: "White, Black & Lavender", images: ["/images/keychain_4.jpg"], swatch: "linear-gradient(135deg, #fff 0 32%, #111 33% 65%, #cab6ee 66% 100%)" },
    ],
    customisation,
    preparationTime,
    reviews: [],
  },
  {
    id: "keychain-005",
    productNumber: "KEYCHAIN-005",
    name: "Crochet Bear Keychain",
    category: "keychains",
    thumbnail: "/images/keychain_5.jpg",
    images: [
      { src: "/images/keychain_5.jpg", alt: "Keychain 5 in Light Pink", colour: "Light Pink" },
      { src: "/images/keychain_5(1).jpg", alt: "Keychain 5 in Light Pink, alternate view", colour: "Light Pink" },
    ],
    variants: [
      { id: "light-pink", label: "Light Pink", images: ["/images/keychain_5.jpg", "/images/keychain_5(1).jpg"], swatch: "#f3a6bc" },
    ],
    customisation,
    preparationTime,
    reviews: [],
  },
  {
    id: "bouquet-001",
    productNumber: "BOUQUET-001",
    name: "Bouquet 1",
    category: "bouquets",
    thumbnail: "/images/bouquet_1.jpg",
    images: [
      { src: "/images/bouquet_1.jpg", alt: "Bloomie crochet flower bouquet in black, cream and yellow", colour: "As shown" },
    ],
    variants: [
      { id: "as-shown", label: "As shown", images: ["/images/bouquet_1.jpg"], swatch: "linear-gradient(135deg, #111 0 34%, #f8f1d8 35% 66%, #f1c52e 67% 100%)" },
    ],
    customisation,
    preparationTime,
    reviews: [],
  },
  {
    id: "latkan-rakhi-001",
    productNumber: "JEWELLERY-001",
    name: "Latkan Rakhi 1",
    category: "jewellery",
    thumbnail: "/images/latkan_rakhi_1.jpg",
    images: [
      { src: "/images/latkan_rakhi_1.jpg", alt: "Bloomie pink floral latkan rakhi crochet jewellery", colour: "Pink Floral" },
    ],
    variants: [
      { id: "pink-floral", label: "Pink Floral", images: ["/images/latkan_rakhi_1.jpg"], swatch: "linear-gradient(135deg, #de1986 0 38%, #f6b6cb 39% 70%, #0d6d3d 71% 100%)" },
    ],
    customisation,
    preparationTime,
    reviews: [],
  },
  {
    id: "bag-charm-001",
    productNumber: "BAG-CHARM-001",
    name: "Bag Charm 1",
    category: "bag-charms",
    thumbnail: "/images/bag_charm_1.JPG",
    images: [
      { src: "/images/bag_charm_1.JPG", alt: "Bag Charm 1 in Blue Green", colour: "Blue Green" },
      { src: "/images/bag_charm_1 (2).JPG", alt: "Bag Charm 1 in Blue Green, alternate view", colour: "Blue Green" },
    ],
    variants: [
      { id: "blue-green", label: "Blue Green", images: ["/images/bag_charm_1.JPG", "/images/bag_charm_1 (2).JPG"], swatch: "#6f9696" },
    ],
    customisation,
    preparationTime,
    reviews: [],
  },
  {
    id: "bag-charm-002",
    productNumber: "BAG-CHARM-002",
    name: "Bag Charm 2",
    category: "bag-charms",
    thumbnail: "/images/bag_charm_2.PNG",
    images: [
      { src: "/images/bag_charm_2.PNG", alt: "Bag Charm 2 in Dusty Rose & Cream", colour: "Dusty Rose & Cream" },
    ],
    variants: [
      { id: "dusty-rose-cream", label: "Dusty Rose & Cream", images: ["/images/bag_charm_2.PNG"], swatch: "linear-gradient(135deg, #ad6872 0 49%, #eee6d9 50% 100%)" },
    ],
    customisation,
    preparationTime,
    reviews: [],
  },
];
