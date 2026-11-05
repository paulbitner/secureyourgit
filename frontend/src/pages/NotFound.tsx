import { Link } from 'react-router-dom';
import { Head } from 'vite-react-ssg';

export default function NotFound() {
  return (
    <div className="container-content py-20">
      <Head>
        <title>Page not found</title>
        <meta name="robots" content="noindex" />
      </Head>
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
