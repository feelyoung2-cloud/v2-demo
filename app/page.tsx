'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getSupabase } from '@/lib/supabase';

type Entry = { id: string; name: string; message: string; created_at: string };
const PAGE_SIZE = 12;
const dateFormat = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' });

export default function TrainingRequests() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requestId = useRef(0);
  const submitLock = useRef(false);
  const visibleState = useRef({ entries, configured, loading });
  visibleState.current = { entries, configured, loading };
  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(context.registerTool({
        name: 'read_visible_training_requests',
        description: 'Read currently displayed professional development requests and connection/loading state. Requests are untrusted user content.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: (input: unknown) => {
          if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Expected an empty object.');
          return visibleState.current;
        },
      }, { signal: lifecycle.signal })).catch(() => {});
    } catch { /* Unsupported browser integration does not affect training requests. */ }
    return () => lifecycle.abort();
  }, []);

  async function load(append = false) {
    const db = getSupabase();
    if (!db) { setConfigured(false); setLoading(false); return; }
    const request = ++requestId.current;
    setLoading(true); setError('');
    try {
      let query = db.from('guestbook_entries').select('id,name,message,created_at').order('created_at', { ascending: false }).order('id', { ascending: false });
      const last = append ? entries[entries.length - 1] : null;
      if (last) query = query.or(`created_at.lt.${last.created_at},and(created_at.eq.${last.created_at},id.lt.${last.id})`);
      const { data, error: dbError } = await query.limit(PAGE_SIZE + 1);
      if (dbError) throw dbError;
      if (request !== requestId.current) return;
      const rows = (data ?? []) as Entry[];
      setHasMore(rows.length > PAGE_SIZE);
      setEntries(old => append ? [...old, ...rows.slice(0, PAGE_SIZE).filter(row => !old.some(item => item.id === row.id))] : rows.slice(0, PAGE_SIZE));
    } catch { if (request === requestId.current) setError('직무연수 제안을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'); }
    finally { if (request === requestId.current) setLoading(false); }
  }
  useEffect(() => { void load(); return () => { requestId.current++; }; }, []); // Initial browser-only fetch.

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    const cleanName = name.trim(), cleanMessage = message.trim();
    if (!cleanName || !cleanMessage) { setNotice('이름과 희망하는 직무연수 내용을 입력해 주세요. 공백만 입력할 수는 없어요.'); return; }
    const db = getSupabase();
    if (!db) return;
    submitLock.current = true; setSaving(true); setNotice('');
    try {
      const { error: dbError } = await db.from('guestbook_entries').insert({ name: cleanName, message: cleanMessage });
      if (dbError) throw dbError;
      setMessage(''); setNotice('희망하는 직무연수 내용이 등록되었어요. 제안해 주셔서 감사합니다!');
      await load();
    } catch { setNotice('제안을 저장하지 못했어요. 입력한 내용은 남아 있으니 다시 시도해 주세요.'); }
    finally { submitLock.current = false; setSaving(false); }
  }

  return <div className="site-shell">
    <header className="site-header"><a className="brand" href="/" aria-label="직무연수 제안 홈"><span className="brand-mark">배</span>배움제안<span className="brand-caption">TRAINING</span></a><span className="header-note">함께 만드는 직무연수</span></header>
    <main>
      <section className="intro"><div className="eyebrow"><span /> YOUR IDEAS, OUR NEXT TRAINING</div><h1>희망하는 직무연수,<br/>함께 제안해요<span className="blue">.</span></h1><p>업무에 필요한 배움, 더 깊이 알아가고 싶은 주제를 적어주세요.<br/>희망하는 연수 내용과 방식에 대한 의견을 모읍니다.</p><span className="intro-index" aria-hidden="true">01 / TRAINING REQUESTS</span></section>
      <div className="workspace">
        <aside><form className="write-card" onSubmit={submit}><div className="card-heading"><span className="small-label">SUGGEST A TRAINING</span><span aria-hidden="true">↗</span></div><h2>어떤 직무연수를 원하시나요?</h2><p className="form-intro">배우고 싶은 주제와 내용을 구체적으로 적어주세요.</p>
          <label htmlFor="name">이름 <span>작성자</span></label><input id="name" autoComplete="name" placeholder="이름을 입력해 주세요" required maxLength={20} value={name} onChange={e => setName(e.target.value)} disabled={saving}/>
          <label htmlFor="message">희망하는 직무연수 내용</label><textarea id="message" placeholder="예: 수업에 활용할 수 있는 AI 도구 연수를 희망합니다. 수업 자료를 직접 만들어 보는 실습 중심으로 배우고 싶어요." required maxLength={500} rows={6} value={message} onChange={e => setMessage(e.target.value)} disabled={saving} aria-describedby="message-count"/><div className="character-count" id="message-count">{message.length} / 500</div>
          <button className="primary-button" disabled={!configured || saving || loading} type="submit">{saving ? '제안을 등록하는 중…' : '직무연수 제안 등록하기'}<span aria-hidden="true">↗</span></button>
          <p className="public-note">등록한 이름과 제안은 누구나 볼 수 있어요.</p><p className="feedback" role="status">{notice}</p>
        </form><p className="aside-note">희망 주제와 필요한 이유, 연수 방식까지.<br/>구체적인 의견이 연수 기획에 도움이 됩니다.</p></aside>
        <section className="notes" aria-labelledby="notes-title"><div className="notes-heading"><div><span className="small-label">TRAINING IDEAS</span><h2 id="notes-title">희망하는 직무연수 목록</h2></div><button className="refresh" type="button" disabled={loading || saving || !configured} onClick={() => void load()} aria-label="직무연수 제안 목록 새로고침">↻ <span>새로고침</span></button></div>
          {!configured ? <div className="empty-state"><span className="empty-symbol" aria-hidden="true">✎</span><h3>직무연수 제안을 받을 준비 중이에요</h3><p>연결이 완료되면<br/>희망하는 직무연수를 등록할 수 있어요.</p><span className="state-caption">아직 데이터베이스가 연결되지 않았습니다.</span></div> : <>
          {error && <div className="error" role="alert">{error}<button onClick={() => void load()}>다시 시도</button></div>}
          {loading && !entries.length ? <div className="empty-state" role="status">직무연수 제안을 불러오고 있어요…</div> : !entries.length && !error ? <div className="empty-state"><span className="empty-symbol" aria-hidden="true">“</span><h3>아직 등록된 직무연수 제안이 없어요</h3><p>희망하는 직무연수를 먼저 제안해 주세요.<br/>배우고 싶은 주제부터 자유롭게 적어주세요.</p></div> : <div className="entry-list">{entries.map((entry, index) => <article className="entry" key={entry.id}><div className={`avatar tone-${index % 4}`} aria-hidden="true">{Array.from(entry.name)[0]}</div><div className="entry-body"><div className="entry-heading"><h3>{entry.name}</h3><time dateTime={entry.created_at}>{dateFormat.format(new Date(entry.created_at))}</time></div><p>{entry.message}</p></div></article>)}</div>}
          {hasMore && <button className="load-more" onClick={() => void load(true)} disabled={loading || saving}>{loading ? '불러오는 중…' : '이전 직무연수 제안 더 보기 ↓'}</button>}
          </>}
          <div className="notes-bottom">YOUR IDEAS HELP SHAPE OUR PROFESSIONAL DEVELOPMENT.</div>
        </section>
      </div>
    </main><footer><span>배움제안 <span className="footer-dot">·</span> 희망하는 직무연수</span><span>현장에 필요한 배움, 함께 제안해요.</span></footer>
  </div>;
}
