import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useApp } from "../context/AppContext";
import SectionHeading from "../components/SectionHeading";
import ProductCard from "../components/ProductCard";
import SEO from "../components/SEO";

export default function Wishlist() {
  const { wishlist } = useApp();

  if (wishlist.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-24 text-center">
        <SEO title="Saved Wishlist | Lucky Couture" canonical="/wishlist" robots="noindex, nofollow" />
        <Heart size={40} className="mx-auto text-primary/30 mb-5" />
        <h1 className="font-display text-2xl font-semibold text-primary mb-2">No favorites yet</h1>
        <p className="text-ink/60 mb-8">Tap the heart on any product or design to save it here.</p>
        <Link to="/shop" className="inline-block bg-primary text-bg px-7 py-3 rounded-full font-medium hover:bg-primary/90">
          Browse Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <SEO title="Saved Wishlist | Lucky Couture" canonical="/wishlist" robots="noindex, nofollow" />
      <SectionHeading eyebrow="Saved" title="Your Wishlist" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-7">
        {wishlist.map((item) => (
          <ProductCard key={item.id} product={{ ...item, price: item.price || 0, mrp: item.mrp || 0, rating: item.rating || 5 }} />
        ))}
      </div>
    </div>
  );
}
