import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BRAND } from '../brand/Logo';
import { FORMATS, GOLD, TEAMC } from '../data/maps';
import { cx } from '../lib/fx';
import { useTitle } from '../lib/useTitle';
import type { Format } from '../types';
import { SeqChips } from './Landing';

const SECTIONS = [
  ['basics', 'Veto basics'],
  ['formats', 'Formats'],
  ['sides', 'Side selection'],
  ['custom', 'Custom orders'],
  ['glossary', 'Glossary'],
  ['faq', 'FAQ'],
] as const;

const FORMAT_RULES: Record<Format, string> = {
  1: 'Teams alternate bans, starting with Team A, until a single map is left. That map is played and the team that did not make the last ban chooses the starting side.',
  2: 'Bans alternate until three maps remain. Team A picks the first map, Team B the second, and the last map is left unplayed. The opponent of each picker chooses sides.',
  3: 'Team A bans, Team B bans, Team A picks Map 1, Team B picks Map 2, then both teams ban once more. The remaining map is the decider.',
  5: 'Team A bans, Team B bans, then the teams alternate picks for Maps 1–4. The last map standing is the decider for Map 5.',
};

const FAQ: [string, string][] = [
  ['Is Map Veto free?', 'Yes. There are no accounts, no ads and nothing to install — everything runs in your browser.'],
  ['Where is my data stored?', 'Your setup and map notes are saved in your browser’s local storage. Share links carry the whole plan inside the URL itself, so nothing is uploaded to a server.'],
  ['Can two captains veto from different devices?', 'Not live yet — one person runs the veto (on stream or in a call) and shares the result. Real-time multi-device vetoes are on the roadmap.'],
  ['What happens if the turn timer runs out?', 'A random valid choice is made for that step: a random remaining map for bans and picks, or a random side for side selection.'],
  ['Can I use it for other games or custom maps?', 'Yes. Add custom maps in the setup with a name and an optional image URL. The veto logic works for any map pool.'],
  ['Why does a share link open the plan only on this site?', 'The link stores the plan after a # in the URL, so it needs Map Veto to read it. Anyone who opens it sees the same plan and can replay it.'],
];

export function GuidePage() {
  useTitle('Veto guide');
  const { hash } = useLocation();
  const [active, setActive] = useState<string>('basics');

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActive(vis.target.id);
    }, { rootMargin: '-20% 0px -65% 0px' });
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  return (
    <div className="container">
      <section className="page-hero">
        <h1>How the veto works</h1>
        <p>Everything you need to run a fair map veto — the default orders {BRAND.name} uses, how sides are decided and how to adapt it to your own rules.</p>
      </section>
      <div className="guide">
        <nav className="toc">
          {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`} className={cx(active === id && 'on')}>{label}</a>)}
        </nav>
        <div>
          <section className="gsec" id="basics">
            <h2>Veto basics</h2>
            <p>A map veto decides which maps a series is played on. Two teams take turns removing maps from the pool (<b>bans</b>) and choosing maps they want to play (<b>picks</b>). When only one map is left and the series still needs a map, it becomes the <b>decider</b>. Team A always acts first — choose who that is in setup, or settle it with a coin toss.</p>
          </section>

          <section className="gsec" id="formats">
            <h2>Formats</h2>
            <p>These are the default orders for a 7-map pool. With a larger or smaller pool, extra bans are added or removed so the format still produces the right number of maps.</p>
            <div className="gfmt">
              {([1, 2, 3, 5] as Format[]).map(f => (
                <div className="card" key={f}>
                  <h3>{FORMATS[f].label} <span>{FORMATS[f].name}</span></h3>
                  <p>{FORMAT_RULES[f]}</p>
                  <SeqChips fmt={f} />
                  <Link to={`/veto?format=${f}`} className="btn sm">Plan a {FORMATS[f].label}</Link>
                </div>
              ))}
            </div>
          </section>

          <section className="gsec" id="sides">
            <h2>Side selection</h2>
            <p>With side selection on, every pick is followed by a side choice from the <b>other</b> team: if Team A picks a map, Team B chooses whether to start on Attack or Defense there. For the decider, the side goes to the team that did <b>not</b> make the last ban — so the last ban is never a free advantage. You can turn side selection off in setup if your event uses knife rounds or fixed sides.</p>
          </section>

          <section className="gsec" id="custom">
            <h2>Custom orders</h2>
            <p>Leagues often tweak the order — two bans each up front, a pick-ban-pick pattern, and so on. In setup, click a step’s team badge to swap teams, click its action to switch between ban and pick, remove steps or add new ones. {BRAND.name} shows whether your order produces the number of maps the format needs and how many maps would be left unplayed.</p>
          </section>

          <section className="gsec" id="glossary">
            <h2>Glossary</h2>
            <dl className="gloss">
              <div><dt><i style={{ background: TEAMC[1] }} />Ban</dt><dd>Removes a map from the pool. Nobody plays it this series.</dd></div>
              <div><dt><i style={{ background: TEAMC[0] }} />Pick</dt><dd>Locks in a map to be played. The picker’s opponent chooses sides.</dd></div>
              <div><dt><i style={{ background: GOLD }} />Decider</dt><dd>The last map left in the pool, played when the series goes the distance.</dd></div>
              <div><dt><i style={{ background: '#7cc7ff' }} />Side</dt><dd>Attack or Defense for the first half. Teams swap at halftime.</dd></div>
            </dl>
          </section>

          <section className="gsec" id="faq">
            <h2>FAQ</h2>
            {FAQ.map(([q, a]) => (
              <details className="faq" key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
