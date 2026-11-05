import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { site } from '../config/site';

export default function NotFound() {
  return (
    <div className="container-content py-20">
      <Seo title={`Page not found | ${site.name}`} description="This page does not exist." path="/404/" noindex />
      <h1>Page not found</h1>
      <p className="mt-4">
        That page doesn’t exist.{' '}
        <Link to="/" className="link">
          Go to the scanner
        </Link>
        .
      </p>
    </div>
  );
}
