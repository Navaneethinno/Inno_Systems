import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { NAVIGATION } from "../../config/navigation";
import { findTrail } from "../../lib/navTree";
import { Icon } from "../icons/Icon";

const NOT_FOUND = [{ id: "not-found", label: "Page not found" }];

/**
 * Module › group › page for the current route, read from the same tree as
 * the sidebar so the two never disagree. Modules and groups have no page
 * of their own, so only the home link is clickable.
 */
export function PageBreadcrumbs() {
  const { pathname } = useLocation();
  const trail = findTrail(NAVIGATION, pathname);
  const crumbs = trail.length ? trail : NOT_FOUND;

  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol className="crumbs__list">
        <li className="crumbs__item">
          <Link to="/" className="crumbs__home" aria-label="Overview">
            <Icon name="home" size={16} />
          </Link>
        </li>
        {crumbs.map((node, i) => {
          const isCurrent = i === crumbs.length - 1;
          return (
            <Fragment key={node.path ?? node.id}>
              <li className="crumbs__sep" aria-hidden="true">
                <Icon name="chevronRight" size={14} />
              </li>
              <li className={`crumbs__item ${isCurrent ? "crumbs__item--current" : ""}`} aria-current={isCurrent ? "page" : undefined}>
                {node.label}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
