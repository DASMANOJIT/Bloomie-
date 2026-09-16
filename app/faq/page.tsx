import type { Metadata } from "next";
import { InfoPageShell } from "@/components/info-page";
import { BreadcrumbSchema } from "@/components/structured-data";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = createPageMetadata("FAQ | Bloomie Handmade Crochet India", "Answers about Bloomie handmade crochet gifts in India, crochet tops, custom orders, preparation time, delivery, and existing-order support.", "/faq");

const questions = [
  ["What does Bloomie make?", "Bloomie creates handmade crochet flowers, gifts, accessories, and personalised keepsakes. The collection includes crochet flower bouquets, crochet keychains, bag charms, jewellery, and crochet tops for women."],
  ["How do I order through WhatsApp?", "Browse the creations, then use a product or custom-order WhatsApp link to start an enquiry. Bloomie confirms customisation, final price, availability, delivery details, and payment details in that conversation before you place an order."],
  ["Can I ask for a custom crochet gift?", "Yes. Share the product you have in mind, preferred colours, sizing where relevant, and any meaningful details. Customisation is confirmed with Bloomie before an order is placed."],
  ["How do crochet top sizes work?", "For handmade crochet tops and custom crochet tops, ask about the selected design before ordering and share your preferred sizing. Bloomie will confirm what is possible for that item."],
  ["How long will my order take?", "The current listed preparation estimate is 12-15 days. Preparation is the time needed to make the piece; delivery time is additional and should be confirmed for your order."],
  ["Can I check delivery availability and charges?", "Yes. Ask on WhatsApp before ordering. Bloomie will confirm delivery availability, charges, and the expected delivery timing for the selected item."],
  ["Can I order a crochet gift for delivery to Kolkata?", "Ask Bloomie on WhatsApp with your PIN code and the creation you have in mind. Bloomie will confirm whether delivery is available, along with timing and charges, before you order."],
  ["Will a handmade item look exactly like the photos?", "Each Bloomie piece is handmade, so small colour or size variations can happen. Ask about the specific creation before ordering if a detail is important to you."],
  ["How should I care for a crochet item?", "Care can depend on the item and the materials used. Ask Bloomie for care guidance for your specific crochet flower bouquet, accessory, or gift before ordering or after it arrives."],
  ["Who can help with an existing order?", "Use WhatsApp or email Bloomie with the product name and the relevant order details already shared. Do not include sensitive payment information in your message."],
] as const;

export default function FaqPage() {
  return <><BreadcrumbSchema title="FAQ" path="/faq" /><InfoPageShell title="FAQ"><header className="info-intro"><span className="eyebrow">Bloomie answers</span><h1>Frequently asked questions</h1><p>Helpful answers about handmade crochet India, custom crochet gifts, and ordering a Bloomie creation.</p></header><div className="faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div><p className="info-closing">Need a hand with something specific? <a className="text-link" href="/support">Contact Bloomie support</a>.</p></InfoPageShell></>;
}
