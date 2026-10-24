import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { readShortLink } from '../lib/rooms';
import { type Payload, planPath } from '../lib/share';

/** /p/:id — looks up a short link and opens the plan it points to. */
export function ShortLinkPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  useEffect(() => {
    readShortLink(id)
      .then(({ plan }) => navigate(planPath(plan as Payload), { replace: true }))
      .catch(e => setError((e as Error).message));
  }, [id, navigate]);
  return (
    <div className="container room-wait">
      <h1>{error ? 'This link doesn’t work' : 'Opening the plan…'}</h1>
      {error && <><p>{error}</p><Link className="btn" to="/veto">Start a new veto</Link></>}
    </div>
  );
}
