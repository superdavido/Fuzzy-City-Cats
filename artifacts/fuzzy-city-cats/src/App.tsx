import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, Compass } from 'lucide-react';
import CityScene from './CityScene';

type GameStatus = 'intro' | 'playing' | 'won' | 'lost';
const ROUND_SECONDS = 120;
const CAT_NAMES = ['Marmalade', 'Pip', 'Biscuit', 'Peaches', 'Clover'];

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function App() {
  const [status, setStatus] = useState<GameStatus>('intro');
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [found, setFound] = useState<number[]>([]);
  const [rotation, setRotation] = useState(0);
  const elapsed = ROUND_SECONDS - secondsLeft;

  useEffect(() => {
    if (status !== 'playing') return;
    const timerId = window.setInterval(() => {
      if (secondsLeft <= 1) {
        setSecondsLeft(0);
        setStatus('lost');
      } else setSecondsLeft(secondsLeft - 1);
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [status, secondsLeft]);

  const rotate = useCallback((direction: number) => {
    setRotation((current) => current + direction * Math.PI / 4);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      rotate(event.key === 'ArrowLeft' ? -1 : 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [rotate]);

  const findCat = useCallback((id: number) => {
    if (status !== 'playing' || found.includes(id) || found.length >= 5) return;
    const next = [...found, id];
    setFound(next);
    if (next.length === 5) setStatus('won');
  }, [found, status]);

  const begin = () => setStatus('playing');
  const playAgain = () => {
    setFound([]);
    setSecondsLeft(ROUND_SECONDS);
    setRotation(0);
    setStatus('intro');
  };

  return (
    <main className="game-shell">
      <div className="fuzzy-texture" aria-hidden="true" />
      <section className="game-frame" aria-label="Fuzzy City Cats game">
        <header className="topbar">
          <div className="brand">
            <div className="brand-stamp" aria-hidden="true"><span className="cat-silhouette" /></div>
            <div>
              <div className="brand-title" data-testid="text-game-title">Fuzzy City Cats</div>
              <div className="brand-sub">A tiny-town cat hunt</div>
            </div>
          </div>
          <div className="game-info">
            <div className={`timer ${secondsLeft <= 20 && status === 'playing' ? 'low' : ''}`} aria-live="off" data-testid="game-timer">
              <div className="timer-label">Time left</div>
              <div className="timer-value" data-testid="text-time-left">{formatTime(secondsLeft)}</div>
            </div>
            <div className="progress-chip" aria-label={`${found.length} of 5 cats found`} data-testid="cat-progress">
              <span className="progress-dots" aria-hidden="true">
                {CAT_NAMES.map((name, index) => <span key={name} className={`progress-dot ${found.includes(index) ? 'found' : ''}`} />)}
              </span>
              <span>{found.length} / 5 found</span>
            </div>
          </div>
        </header>

        <div className="game-content">
          <div className="game-heading">
            <div>
              <div className="eyebrow">Postcard district · day 04</div>
              <div className="heading-main">A city full of little secrets</div>
            </div>
            <div className="heading-hint">Five curious cats are on the move.</div>
          </div>
          <div className="board-wrap" data-testid="game-board">
            <CityScene playing={status === 'playing'} found={found} rotation={rotation} onCatFound={findCat} />
            <div className="city-caption" data-testid="text-city-caption"><Compass size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} /> TINY STREETS, BIG WHISKERS</div>
            <div className="rotate-controls" aria-label="Rotate the city">
              <button className="rotate-btn" type="button" aria-label="Rotate city left" title="Rotate city left" data-testid="button-rotate-left" onClick={() => rotate(-1)}><ArrowLeft size={20} /></button>
              <button className="rotate-btn" type="button" aria-label="Rotate city right" title="Rotate city right" data-testid="button-rotate-right" onClick={() => rotate(1)}><ArrowRight size={20} /></button>
            </div>
            {(status === 'intro' || status === 'won' || status === 'lost') && (
              <div className="overlay" data-testid={`overlay-${status}`}>
                <section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
                  {status === 'intro' && <>
                    <div className="dialog-kicker">Welcome to Whiskerwick</div>
                    <h1 className="dialog-title" id="dialog-title">Can you spot<br />all five?</h1>
                    <p className="dialog-copy">A handful of fuzzy neighbors have slipped out into the city. Find them before the clock runs out.</p>
                    <div className="rules">
                      <span className="rule-mark"><Compass size={19} /></span>
                      <span>Click a cat when you see one. Sweep around with the on-screen arrows, or use your keyboard’s <kbd>←</kbd> and <kbd>→</kbd> keys.</span>
                    </div>
                    <button className="primary-btn" onClick={begin} type="button" data-testid="button-start-game">Let’s find the cats</button>
                  </>}
                  {status === 'won' && <>
                    <div className="dialog-kicker">Every tail accounted for</div>
                    <h2 className="dialog-title" id="dialog-title">City saved.<br />Cats found.</h2>
                    <p className="dialog-copy">All five little wanderers are safely back in the neighborhood.</p>
                    <div className="result-stat" data-testid="text-completion-time"><Clock3 size={17} /> Time used&nbsp; {formatTime(elapsed)}</div>
                    <button className="primary-btn" onClick={playAgain} type="button" data-testid="button-play-again">Play again</button>
                  </>}
                  {status === 'lost' && <>
                    <div className="dialog-kicker">The town clock chimed</div>
                    <h2 className="dialog-title" id="dialog-title">Still a few<br />cats at large.</h2>
                    <p className="dialog-copy" data-testid="text-timeout-message">Time is up. You found {found.length} of 5 cats — the others are already planning their next stroll.</p>
                    <div className="result-stat" data-testid="text-timeout-progress"><Clock3 size={17} /> {found.length} of 5 found</div>
                    <button className="primary-btn" onClick={playAgain} type="button" data-testid="button-play-again">Try another round</button>
                  </>}
                </section>
              </div>
            )}
          </div>
          <div className="bottom-row">
            <div className="cat-tracker" aria-label="Five cats to find">
              {CAT_NAMES.map((name, index) => (
                <div className={`cat-token ${found.includes(index) ? 'found' : ''}`} key={name} aria-label={`${name}: ${found.includes(index) ? 'found' : 'not found'}`} title={found.includes(index) ? `${name} found` : 'Cat not found yet'} data-testid={`cat-status-${index}`}>
                  <span className="cat-silhouette" aria-hidden="true" />
                </div>
              ))}
              <span className="progress-copy" data-testid="text-found-count">{found.length} of 5 neighborhood cats found</span>
            </div>
            <div className="controls-note" data-testid="text-controls-help">
              Find them all before <strong>2:00</strong> runs out<br />
              Turn the town with <kbd>←</kbd> <kbd>→</kbd> or the arrows
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
