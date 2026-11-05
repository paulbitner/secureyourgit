import { ChevronDown, ExternalLink, ScanSearch } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';
import { Md, stripMd } from '../components/Md';
import { SeverityBadge } from '../components/SeverityBadge';
import { Seo } from '../components/Seo';
import { SubHeader } from '../components/SubHeader';
import { RuleIcon } from '../components/RuleIcon';
import { site } from '../config/site';
import { getRuleDoc } from '../content/rules';
import { getRule, rules } from '../scanner/registry';
import NotFound from './NotFound';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'examples', label: 'Examples' },
  { id: 'faq', label: 'FAQ' },
  { id: 'references', label: 'References' },
];

export default function RulePage() {
  const { ruleId = '' } = useParams();
  const rule = getRule(ruleId);
  const doc = getRuleDoc(ruleId);
  if (!rule || !doc) return <NotFound />;

  const path = `/rules/${rule.id}/`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        headline: doc.h1,
        description: doc.metaDescription,
        url: `${site.url}${path}`,
        publisher: { '@type': 'Organization', name: site.name, url: site.url },
      },
      {
        '@type': 'FAQPage',
        mainEntity: doc.faq.map((f) => ({
          '@type': 'Question',
          name: stripMd(f.q),
          acceptedAnswer: { '@type': 'Answer', text: stripMd(f.a) },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Rules', item: `${site.url}/rules/` },
          { '@type': 'ListItem', position: 2, name: doc.h1, item: `${site.url}${path}` },
        ],
      },
    ],
  };

  return (
    <>
      <Seo title={`${doc.metaTitle} | ${site.name}`} description={doc.metaDescription} path={path} type="article" jsonLd={jsonLd} />
      <SubHeader crumbs={[{ label: 'Rules', to: '/rules/' }, { label: rule.title }]} />

      <div className="container-content pt-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-fg sm:h-28 sm:w-28">
              <RuleIcon id={rule.id} size={44} />
            </span>
            <div>
              <h1>{doc.h1}</h1>
              <p className="mt-1 text-fg-muted">
                Rule <code className="font-mono text-sm">{rule.id}</code>
              </p>
            </div>
          </div>
          <Link to="/" className="btn-primary shrink-0 self-start sm:self-center">
            <ScanSearch size={18} aria-hidden />
            Scan a workflow
          </Link>
        </div>

        <nav aria-label="On this page" className="mt-10 overflow-x-auto border-b border-border">
          <ul className="flex min-w-max">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`-mb-px block px-6 py-4 text-ui ${i === 0 ? 'rounded-t-md border border-b-bg border-border bg-bg' : 'hover:text-primary'}`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-12 grid grid-cols-1 gap-16 lg:grid-cols-main-sidebar">
          <article className="min-w-0">
            <section id="overview" className="scroll-mt-6">
              <p className="text-lead font-normal leading-8">
                <Md>{doc.summary}</Md>
              </p>
              {doc.sections.map((s) => (
                <div key={s.heading} className="mt-10">
                  <h2>{s.heading}</h2>
                  {s.paragraphs.map((p, i) => (
                    <p key={i} className="mt-4">
                      <Md>{p}</Md>
                    </p>
                  ))}
                  {s.list && (
                    <ul className="mt-4 list-disc space-y-2 pl-6">
                      {s.list.map((item, i) => (
                        <li key={i}>
                          <Md>{item}</Md>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>

            <section id="examples" className="mt-14 scroll-mt-6">
              <h2>Examples</h2>
              <h3 className="mt-6">Vulnerable</h3>
              <p className="mb-3 mt-1 text-fg-muted">{doc.vulnerable.caption}</p>
              <CodeBlock code={doc.vulnerable.code} label="Vulnerable" tone="bad" />
              <h3 className="mt-8">Fixed</h3>
              <p className="mb-3 mt-1 text-fg-muted">{doc.fixed.caption}</p>
              <CodeBlock code={doc.fixed.code} label="Fixed" tone="good" />
            </section>

            <section id="faq" className="mt-14 scroll-mt-6">
              <h2>FAQ</h2>
              <div className="mt-4 border-t border-border">
                {doc.faq.map((f) => (
                  <details key={f.q} className="group border-b border-border">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-primary underline underline-offset-2 [&::-webkit-details-marker]:hidden">
                      <span>
                        <Md>{f.q}</Md>
                      </span>
                      <ChevronDown size={20} aria-hidden className="shrink-0 text-fg transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="pb-5">
                      <Md>{f.a}</Md>
                    </p>
                  </details>
                ))}
              </div>
            </section>

            <section id="references" className="mt-14 scroll-mt-6">
              <h2>References</h2>
              <ul className="mt-4 space-y-3">
                {doc.references.map((r) => (
                  <li key={r.url}>
                    <a href={r.url} className="link inline-flex items-center gap-1.5" rel="noopener noreferrer">
                      {r.title}
                      <ExternalLink size={14} aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </article>

          <aside aria-label="Rule details" className="space-y-12">
            <section>
              <h2 className="text-h3">Details</h2>
              <dl className="mt-3">
                <div className="meta-row">
                  <dt>Rule ID</dt>
                  <dd>
                    <code className="font-mono">{rule.id}</code>
                  </dd>
                </div>
                <div className="meta-row">
                  <dt>Highest severity</dt>
                  <dd>
                    <SeverityBadge severity={rule.severity} />
                  </dd>
                </div>
                <div className="meta-row">
                  <dt>Runs</dt>
                  <dd>In your browser</dd>
                </div>
              </dl>
            </section>
            <section>
              <h2 className="text-h3">Other rules</h2>
              <ul className="mt-3">
                {rules
                  .filter((r) => r.id !== rule.id)
                  .map((r) => (
                    <li key={r.id} className="border-b border-border py-3 text-sm">
                      <Link to={`/rules/${r.id}/`} className="link">
                        {r.title}
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
