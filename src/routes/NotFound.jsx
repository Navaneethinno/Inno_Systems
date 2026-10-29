import { Link } from "react-router-dom";
import { Icon } from "../components/icons/Icon";
import "./NotFound.css";

export function NotFound() {
  return (
    <section className="not-found">
      <span className="not-found__icon" aria-hidden="true">
        <Icon name="compass" size={28} />
      </span>
      <h1 className="not-found__title">Page not found</h1>
      <p className="not-found__text">This address doesn’t match any page in the System Console. Pick one from the sidebar, or go back to the overview.</p>
      <Link to="/" className="not-found__link">
        <Icon name="home" size={16} />
        Back to Overview
      </Link>
    </section>
  );
}
