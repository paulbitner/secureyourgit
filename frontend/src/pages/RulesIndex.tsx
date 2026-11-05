import { Link } from 'react-router-dom';
import { Md } from '../components/Md';
import { SeverityBadge } from '../components/SeverityBadge';
import { Seo } from '../components/Seo';
import { SubHeader } from '../components/SubHeader';
import { RuleIcon } from '../components/RuleIcon';
import { site } from '../config/site';
import { rules } from '../scanner/registry';
import { SEVERITY_ORDER } from '../scanner/types';

const ordered = [...rules].sort(
  (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || a.title.localeCompare(b.title),
);

export default function RulesIndex() {
  return (
    <>
      <Seo
        title={`GitHub Actions Security Rules | ${site.name}`}
        description="Every check the Secure Your Git scanner runs on GitHub Actions workflows, with plain-English explanations, vulnerable and fixed examples, and official references."
        path="/rules/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: ordered.map((r, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${site.url}/rules/${r.id}/`,
            name: r.title,
          })),
        }}
      />
      <SubHeader crumbs={[{ label: 'Rules' }]} />
      <div className="container-content pt-10">
        <div className="max-w-main">
          <h1>GitHub Actions security rules</h1>
          <p className="mt-4">
            These are the checks the scanner runs on every workflow. Each page explains the risk in plain English,
            shows a vulnerable and a fixed example, and links to GitHub’s official documentation.
          </p>
        </div>
        <ul className="mt-10 max-w-main border-t border-border">
          {ordered.map((r) => {
            return (
              <li key={r.id} className="flex gap-5 border-b border-border py-6">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary text-primary-fg">
                  <RuleIcon id={r.id} size={24} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-h3">
                      <Link to={`/rules/${r.id}/`} className="link">
                        {r.title}
                      </Link>
                    </h2>
                    <SeverityBadge severity={r.severity} />
                  </div>
                  <p className="mt-1 text-fg-muted">
                    <Md>{r.description}</Md>
                  </p>
                  <code className="mt-1 block text-sm text-fg-muted">{r.id}</code>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
