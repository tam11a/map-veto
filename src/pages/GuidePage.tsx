import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BRAND } from '../brand/Logo';
import { FORMATS, DECIDER, TEAMC } from '../data/maps';
import { PlayIcon } from 'lucide-react';
import { PageHeader, Panel } from '../components/kit';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { cn } from '../lib/utils';
import { useTitle } from '../lib/useTitle';
import type { Format } from '../types';
import { SeqChips } from './Landing';
import { examplePlan } from '../data/examples';
import { planPath } from '../lib/share';

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
  ['Is Map Veto free?', 'Yes. There are no accounts, no ads and nothing to install. Everything runs in your browser.'],
  ['Where is my data stored?', 'Your setup, notes and rule sets are saved in your browser’s local storage. Online rooms and short share links are stored on the server; rooms close three days after the last move. Long share links carry the whole plan inside the URL.'],
  ['Can two captains veto from different devices?', 'Yes. In the lobby choose Start an online room. You get a link for each captain, a watch-only link for spectators and a stream overlay link. Each captain can only act on their own turns; the host can act for both, undo and restart.'],
  ['How do I show the veto on stream?', 'Start an online room and add the stream overlay link as a browser source in OBS at 1920×1080. Its background is transparent and it follows the room live. In the room’s invite panel you can choose the layout before copying the link: bottom or top, full or one row, and with or without the maps and the title.'],
  ['Are there keyboard shortcuts?', 'During a veto, 1 to 9 (and 0) choose the available maps in order, A and D choose attack or defense, P pauses the timer, M turns sound on or off, and Ctrl+Z undoes the last step.'],
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

  const h2 = 'scroll-mt-28 text-3xl font-extrabold tracking-[-0.03em]';
  const prose = 'mt-3 max-w-3xl leading-relaxed text-muted-foreground [&_b]:font-semibold [&_b]:text-foreground';
  return (
    <div className="container">
      <PageHeader title="How the veto works">
        Everything you need to run a fair map veto: the default orders {BRAND.name} uses, how sides are decided, and how to adapt it to your own rules.
      </PageHeader>
      <div className="grid items-start gap-10 pb-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="hidden lg:sticky lg:top-24 lg:block" aria-label="On this page">
          <Panel className="grid gap-0.5 p-2">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`} className={cn('rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground', active === id && 'bg-white/10 font-semibold text-foreground')}>{label}</a>
            ))}
          </Panel>
        </nav>
        <div className="grid gap-14">
          <section id="basics" className="scroll-mt-28">
            <h2 className={h2}>Veto basics</h2>
            <p className={prose}>A map veto decides which maps a series is played on. Two teams take turns removing maps from the pool (<b>bans</b>) and choosing maps they want to play (<b>picks</b>). When only one map is left and the series still needs a map, it becomes the <b>decider</b>. Team A always acts first. Choose who that is in setup, or settle it with a coin toss.</p>
          </section>

          <section id="formats" className="scroll-mt-28">
            <h2 className={h2}>Formats</h2>
            <p className={prose}>These are the default orders for a 7-map pool. With a larger or smaller pool, extra bans are added or removed so the format still produces the right number of maps.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {([1, 2, 3, 5] as Format[]).map(f => (
                <Card key={f}>
                  <CardHeader>
                    <CardTitle className="flex items-baseline gap-2 text-2xl font-extrabold">{FORMATS[f].label} <span className="text-sm font-medium text-muted-foreground">{FORMATS[f].name}</span></CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <p className="leading-relaxed text-muted-foreground">{FORMAT_RULES[f]}</p>
                    <SeqChips fmt={f} />
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="secondary"><Link to={`/veto?format=${f}`}>Plan a {FORMATS[f].label}</Link></Button>
                      <Button asChild size="sm" variant="ghost"><Link to={planPath(examplePlan(f))}><PlayIcon /> See an example</Link></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section id="sides" className="scroll-mt-28">
            <h2 className={h2}>Side selection</h2>
            <p className={prose}>With side selection on, every pick is followed by a side choice. By default the <b>other</b> team chooses: if Team A picks a map, Team B decides whether to start on Attack or Defense there. For the decider, the side goes to the team that did <b>not</b> make the last ban, so the last ban is never a free advantage. In setup you can let the picker choose instead, give the decider side to a fixed team, settle it with a knife round, or turn side selection off.</p>
          </section>

          <section id="custom" className="scroll-mt-28">
            <h2 className={h2}>Custom orders</h2>
            <p className={prose}>Leagues often tweak the order, with two bans each up front or a pick-ban-pick pattern. In setup, start from a rule set, click a step’s team to swap teams, switch a step between ban and pick, remove steps or add new ones, then save it as your own rule set. {BRAND.name} shows whether your order produces the number of maps the format needs and how many maps would be left unplayed.</p>
          </section>

          <section id="glossary" className="scroll-mt-28">
            <h2 className={h2}>Glossary</h2>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {([
                ['Ban', TEAMC[1], 'Removes a map from the pool. Nobody plays it this series.'],
                ['Pick', TEAMC[0], 'Locks in a map to be played. By default the picker’s opponent chooses sides.'],
                ['Decider', DECIDER, 'The last map left in the pool, played when the series goes the distance.'],
                ['Side', 'var(--def)', 'Attack or Defense for the first half. Teams swap at halftime.'],
              ] as const).map(([term, color, def]) => (
                <Panel key={term} className="p-4">
                  <dt className="flex items-center gap-2 font-bold"><i className="size-2.5 rounded-[3px]" style={{ background: color }} />{term}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{def}</dd>
                </Panel>
              ))}
            </dl>
          </section>

          <section id="faq" className="scroll-mt-28">
            <h2 className={h2}>FAQ</h2>
            <Panel className="mt-5 px-5">
              <Accordion type="multiple">
                {FAQ.map(([q, a]) => (
                  <AccordionItem key={q} value={q} className="border-white/10">
                    <AccordionTrigger className="text-base font-semibold hover:no-underline">{q}</AccordionTrigger>
                    <AccordionContent className="leading-relaxed text-muted-foreground">{a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Panel>
          </section>
        </div>
      </div>
    </div>
  );
}
