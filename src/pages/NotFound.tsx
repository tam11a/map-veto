import { Link } from 'react-router-dom';
import { useTitle } from '../lib/useTitle';

export function NotFound() {
  useTitle('Page not found');
  return (
    <div className="container nf">
      <div>
        <div className="code">404<span className="stamp">BANNED</span></div>
        <h1>This page got vetoed.</h1>
        <p>The page you’re looking for isn’t in the pool.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn primary">Back home</Link>
          <Link to="/veto" className="btn">Start a veto</Link>
        </div>
      </div>
    </div>
  );
}
