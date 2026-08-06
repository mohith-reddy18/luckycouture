import { Link } from "react-router-dom";
import { Scissors } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-72px)] flex flex-col items-center justify-center text-center px-5">
      <span className="w-16 h-16 rounded-full bg-highlight/60 flex items-center justify-center mb-6">
        <Scissors size={26} className="text-primary" />
      </span>
      <h1 className="font-display text-6xl font-bold text-primary mb-2">404</h1>
      <p className="text-ink/60 mb-8 max-w-sm">
        Looks like this thread came loose. The page you're looking for doesn't exist.
      </p>
      <Link to="/" className="bg-primary text-bg px-7 py-3 rounded-full font-medium hover:bg-primary/90">
        Back to Home
      </Link>
    </div>
  );
}
