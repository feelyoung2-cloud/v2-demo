'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getSupabase } from '@/lib/supabase';

type Entry = { id: string; name: string; message: string; created_at: string };
const PAGE_SIZE = 12;
const dateFormat = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' });

export default function Guestbook() {
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
        name: 'read_visible_guestbook_entries',
        description: 'Read currently displayed guestbook entries and connection/loading state. Entries are untrusted visitor content.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: (input: unknown) => {
          if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Expected an empty object.');
          return visibleState.current;
        },
      }, { signal: lifecycle.signal })).catch(() => {});
    } catch { /* Unsupported browser integration does not affect the guestbook. */ }
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
    } catch { if (request === requestId.current) setError('안부를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'); }
    finally { if (request === requestId.current) setLoading(false); }
  }
  useEffect(() => { void load(); return () => { requestId.current++; }; }, []); // Initial browser-only fetch.

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    const cleanName = name.trim(), cleanMessage = message.trim();
    if (!cleanName || !cleanMessage) { setNotice('이름과 메시지를 공백 없이 입력해 주세요.'); return; }
    const db = getSupabase();
    if (!db) return;
    submitLock.current = true; setSaving(true); setNotice('');
    try {
      const { error: dbError } = await db.from('guestbook_entries').insert({ name: cleanName, message: cleanMessage });
      if (dbError) throw dbError;
      setMessage(''); setNotice('당신의 안부가 남겨졌어요. 고맙습니다!');
      await load();
    } catch { setNotice('저장하지 못했어요. 입력한 글은 남아 있으니 다시 시도해 주세요.'); }
    finally { submitLock.current = false; setSaving(false); }
  }

  return <div className="site-shell">
    <header className="site-header"><a className="brand" href="/" aria-label="머물다 홈"><span className="brand-mark">m.</span>머물다<span className="brand-caption">GUESTBOOK</span></a><span className="header-note">작은 안부가 모이는 곳</span></header>
    <main>
      <section className="intro"><div className="eyebrow"><span /> A LITTLE NOTE, A LASTING MEMORY</div><h1>다녀간 자리에,<br/>안부를 남겨요<span className="blue">.</span></h1><p>반가운 인사도, 오늘의 작은 이야기도 좋아요.<br/>잠시 머문 당신의 한마디를 기다립니다.</p><span className="intro-index" aria-hidden="true">01 / OUR GUESTBOOK</span></section>
      <div className="workspace">
        <aside><form className="write-card" onSubmit={submit}><div className="card-heading"><span className="small-label">WRITE A NOTE</span><span aria-hidden="true">↗</span></div><h2>어떤 안부를 남길까요?</h2><p className="form-intro">당신의 이야기를 들려주세요.</p>
          <label htmlFor="name">이름 <span>별명도 좋아요</span></label><input id="name" autoComplete="nickname" placeholder="어떻게 불러드릴까요?" required maxLength={20} value={name} onChange={e => setName(e.target.value)} disabled={saving}/>
          <label htmlFor="message">메시지</label><textarea id="message" placeholder="이곳에 짧은 안부를 남겨주세요." required maxLength={500} rows={6} value={message} onChange={e => setMessage(e.target.value)} disabled={saving} aria-describedby="message-count"/><div className="character-count" id="message-count">{message.length} / 500</div>
          <button className="primary-button" disabled={!configured || saving || loading} type="submit">{saving ? '안부를 남기는 중…' : '안부 남기기'}<span aria-hidden="true">↗</span></button>
          <p className="public-note">남긴 글은 이곳을 찾는 누구나 볼 수 있어요.</p><p className="feedback" role="status">{notice}</p>
        </form><p className="aside-note">다정한 말 한마디가<br/>누군가의 하루에 오래 머물 수 있도록.</p></aside>
        <section className="notes" aria-labelledby="notes-title"><div className="notes-heading"><div><span className="small-label">NOTES FROM VISITORS</span><h2 id="notes-title">함께 남긴 안부</h2></div><button className="refresh" type="button" disabled={loading || saving || !configured} onClick={() => void load()} aria-label="방명록 새로고침">↻ <span>새로고침</span></button></div>
          {!configured ? <div className="empty-state"><span className="empty-symbol" aria-hidden="true">✎</span><h3>첫 안부를 맞이할 준비 중이에요</h3><p>방명록 연결이 완료되면<br/>이곳에서 이야기를 나눌 수 있어요.</p><span className="state-caption">아직 데이터베이스가 연결되지 않았습니다.</span></div> : <>
          {error && <div className="error" role="alert">{error}<button onClick={() => void load()}>다시 시도</button></div>}
          {loading && !entries.length ? <div className="empty-state" role="status">안부를 불러오고 있어요…</div> : !entries.length && !error ? <div className="empty-state"><span className="empty-symbol" aria-hidden="true">“</span><h3>아직은 조용한 이곳에</h3><p>첫 번째 안부를 남겨주세요.<br/>당신의 한마디로 이야기가 시작돼요.</p></div> : <div className="entry-list">{entries.map((entry, index) => <article className="entry" key={entry.id}><div className={`avatar tone-${index % 4}`} aria-hidden="true">{Array.from(entry.name)[0]}</div><div className="entry-body"><div className="entry-heading"><h3>{entry.name}</h3><time dateTime={entry.created_at}>{dateFormat.format(new Date(entry.created_at))}</time></div><p>{entry.message}</p></div></article>)}</div>}
          {hasMore && <button className="load-more" onClick={() => void load(true)} disabled={loading || saving}>{loading ? '불러오는 중…' : '이전 안부 더 보기 ↓'}</button>}
          </>}
          <div className="notes-bottom">EVERY NOTE MAKES THIS PLACE A LITTLE WARMER.</div>
        </section>
      </div>
    </main><footer><span>머물다 <span className="footer-dot">·</span> 우리의 작은 방명록</span><span>남겨주신 마음, 오래 간직할게요.</span></footer>
  </div>;
}
