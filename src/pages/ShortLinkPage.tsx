import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
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
    <div className="container grid justify-items-center gap-4 py-32 text-center">
      <h1 className="text-4xl font-extrabold tracking-[-0.03em]">{error ? 'This link doesn’t work' : 'Opening the plan…'}</h1>
      {error && <><p className="max-w-[52ch] text-muted-foreground">{error}</p><Button asChild variant="secondary"><Link to="/veto">Start a new veto</Link></Button></>}
    </div>
  );
}
