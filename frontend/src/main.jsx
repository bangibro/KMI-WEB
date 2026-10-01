import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './main.css'

const API = import.meta.env.VITE_API_URL || ''
const statuses = ['Menunggu', 'Diproses', 'Selesai']
const media = value => value?.startsWith('/') ? API + value : value
const notificationsKey = 'kmi_notifications'
const authStorage = window.sessionStorage
function getNotifications() { try { return JSON.parse(localStorage.getItem(notificationsKey) || '[]') } catch { return [] } }
function addNotification(message, audience = 'all', division = null) {
  const items = getNotifications()
  if (items.some(item => item.message === message && item.audience === audience && item.division === division)) return
  items.unshift({ id: `${Date.now()}-${Math.random()}`, message, audience, division, created_at: new Date().toISOString(), read: false })
  localStorage.setItem(notificationsKey, JSON.stringify(items.slice(0, 50)))
}
async function api(url, options = {}) {
  const token = authStorage.getItem('admin_token')
  const headers = options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(API + url, { ...options, headers })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw Error(data.error || 'Terjadi kesalahan')
  return data
}

function Home({ choose }) {
  return <main className="home-page min-h-screen bg-slate-950 px-5 py-8 sm:px-8">
    <section className="home-shell mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
      <div className="home-copy">
        <div className="home-brand"><span className="home-brand-mark">K</span><span>MEDIA KMI</span></div>
        <p className="home-kicker">Ruang kerja tim media</p>
        <h1 className="home-title">Ide baik,<br /><span>terbit tepat waktu.</span></h1>
        <p className="home-description">Ajukan kebutuhan konten, ikuti proses produksi, dan kelola setiap postingan dalam satu tempat.</p>
        <div className="home-actions">
          <button className="choice-card" onClick={() => choose('user')}><b>Masuk sebagai BaUBi</b><span>Pilih BaUBi, kirim request, dan pantau progress.</span><i>→</i></button>
          <button className="choice-card" onClick={() => choose('admin')}><b>Masuk sebagai Admin</b><span>Kelola request dan proses produksi.</span><i>→</i></button>
        </div>
        <p className="home-footnote"><span /> Alur kerja konten yang lebih teratur untuk seluruh bidang</p>
      </div>
      <div className="home-art" aria-hidden="true">
        <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
        <div className="art-card art-back"><span className="art-mini-label">JADWAL KONTEN</span><div className="art-calendar"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="art-progress"><span /></div></div>
        <div className="art-card art-front"><span className="art-mini-label">POSTINGAN MINGGU INI</span><div className="art-cover"><span>MEDIA<br />KMI</span><i>✳</i></div><div className="art-caption"><span className="art-dot" /><b>Konten siap diproses</b><span className="art-check">✓</span></div></div>
        <div className="art-floating">✦ <span>Setiap ide punya ruang</span></div>
      </div>
    </section>
  </main>
}

function UserApp({ back, division }) {
  const [page, setPage] = useState('request')
  const [showForm, setShowForm] = useState(false)
  const [requests, setRequests] = useState([])
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState(() => getNotifications())
  const knownStatuses = useRef(new Map())
  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 4500)
    return () => window.clearTimeout(timer)
  }, [notice])
  const load = (silent = false) => {
    if (!silent) setLoading(true)
    const tokenStore = JSON.parse(localStorage.getItem('public_request_tokens') || '{}')
    const legacy = localStorage.getItem('public_request_token')
    const tokens = [...new Set([...(tokenStore[division?.name] || []), legacy].filter(Boolean))]
    return Promise.all(tokens.map(token => api(`/api/public/requests?token=${encodeURIComponent(token)}&division=${encodeURIComponent(division?.name || '')}`))).then(groups => {
      const nextRequests = groups.flat()
      if (knownStatuses.current.size) nextRequests.forEach(request => {
        if (knownStatuses.current.get(request.id) !== 'Selesai' && request.status === 'Selesai') {
          addNotification(`Postingan "${request.title}" sudah selesai diproses.`, 'user', request.division)
        }
      })
      knownStatuses.current = new Map(nextRequests.map(request => [request.id, request.status]))
      setRequests(nextRequests)
      setNotifications(getNotifications())
    }).catch(() => setRequests([])).finally(() => { if (!silent) setLoading(false) })
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    const timer = window.setInterval(() => load(true), 8000)
    const syncNotifications = event => { if (event.key === notificationsKey) setNotifications(getNotifications()) }
    window.addEventListener('storage', syncNotifications)
    return () => { window.clearInterval(timer); window.removeEventListener('storage', syncNotifications) }
  }, [division?.name])
  return <div className="min-h-screen bg-slate-50">
    <Nav title={`Bidang ${division?.name || ''}`} onBack={back} links={[['request', 'Request Postingan'], ['progress', 'Progress Postingan'], ['notifications', 'Notifikasi']]} page={page} setPage={nextPage => { setNotice(''); setPage(nextPage) }} right={<button className="header-action header-action-logout" onClick={back}><span>↪</span> Keluar</button>} notificationCount={notifications.filter(item => !item.read && item.audience === 'user' && item.division === division?.name).length} />
    <main className="mx-auto max-w-6xl px-5 py-8">
      {notice && <Toast message={notice} onClose={() => setNotice('')} />}
      {page === 'notifications' ? <NotificationPage audience="user" division={division?.name} items={notifications} onChange={setNotifications} /> : page === 'request' ? (showForm
        ? <RequestForm division={division} onCreated={async token => { const tokenStore = JSON.parse(localStorage.getItem('public_request_tokens') || '{}'); tokenStore[division?.name] = [...new Set([...(tokenStore[division?.name] || []), token])]; localStorage.setItem('public_request_tokens', JSON.stringify(tokenStore)); localStorage.setItem('public_request_token', token); addNotification(`Request baru dari ${division?.name || 'bidang'} berhasil dibuat.`, 'admin'); await load(); setNotifications(getNotifications()); setNotice('Request berhasil dibuat. Token tersimpan di browser ini.'); setShowForm(false); setPage('progress') }} />
        : <RequestLanding onNewRequest={() => setShowForm(true)} />)
        : <Progress requests={requests} loading={loading} onRefresh={load} onNewRequest={() => { setPage('request'); setShowForm(true) }} />}
    </main>
  </div>
}

function RequestForm({ onCreated, division }) {
  const [form, setForm] = useState({ requester_name: '', division: division?.name || '', title: '', post_type: 'Feed', slide_count: 1, draft_url: '', deadline: '', description: '' })
  const [error, setError] = useState('')
  const set = (key, value) => setForm({ ...form, [key]: value })
  return <section className="panel max-w-3xl"><div><p className="eyebrow">Request baru</p><h1 className="page-title">Request Postingan</h1><p className="muted">Isi kebutuhan konten dengan ringkas dan jelas.</p></div>
    <form className="mt-7 grid gap-4 sm:grid-cols-2" onSubmit={async event => { event.preventDefault(); setError(''); try { const data = await api('/api/public/requests', { method: 'POST', body: JSON.stringify(form) }); await onCreated(data.public_token) } catch (e) { setError(e.message) } }}>
      <Field label="Nama Pemohon" required value={form.requester_name} onChange={e => set('requester_name', e.target.value)} />
      <label className="field"><span>Bidang/Divisi</span><input value={form.division || 'Bidang belum dipilih'} readOnly className="bg-slate-50" /></label>
      <Field label="Judul/Nama Postingan" required value={form.title} onChange={e => set('title', e.target.value)} />
      <label className="field"><span>Jenis Postingan</span><select value={form.post_type} onChange={e => set('post_type', e.target.value)}>{['Feed', 'Story', 'Reels'].map(x => <option key={x}>{x}</option>)}</select></label>
      <Field label="Jumlah Slide" type="number" min="1" required value={form.slide_count} onChange={e => set('slide_count', e.target.value)} />
      <Field label="Deadline" type="datetime-local" required value={form.deadline} onChange={e => set('deadline', e.target.value)} />
      <Field label="Link Draft/Referensi" type="url" required value={form.draft_url} onChange={e => set('draft_url', e.target.value)} />
      <label className="field sm:col-span-2"><span>Catatan/Keterangan</span><textarea value={form.description} onChange={e => set('description', e.target.value)} rows="4" /></label>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <button className="btn sm:col-span-2">Kirim Request</button>
    </form>
  </section>
}

function RequestLanding({ onNewRequest }) {
  return <section><p className="eyebrow">Request baru</p><h1 className="page-title">Request Postingan</h1><p className="muted">Buat request pembuatan atau editing postingan untuk bidang ini.</p><button className="btn mt-7" onClick={onNewRequest}>+ Request Postingan</button></section>
}

function Progress({ requests, loading, onRefresh, onNewRequest }) {
  const header = <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Pantauan Anda</p><h1 className="page-title">Progress Postingan</h1><p className="muted">Request yang tersimpan di browser ini.</p></div><button className="btn-secondary" onClick={onRefresh} disabled={loading}>{loading ? 'Memuat...' : 'Refresh'}</button></div>
  if (!requests.length) return <section>{header}<div className="panel mt-7 text-sm text-slate-500">Belum ada request. Klik tombol <b>+ Request Postingan</b> untuk mulai.</div><button className="btn mt-5" onClick={onNewRequest}>+ Request Postingan</button></section>
  return <section>{header}<div className="mt-7 grid gap-4">{requests.map(request => { const currentStep = statuses.indexOf(request.status); return <article className="panel" key={request.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{request.title}</h2><p className="muted">{request.requester_name} · {request.division}</p></div><span className="status">{request.status}</span></div><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5"><p><b>Tanggal Request</b><br />{new Date(request.created_at).toLocaleString('id-ID')}</p><p><b>Deadline</b><br />{new Date(request.deadline).toLocaleString('id-ID')}</p><p><b>Jenis</b><br />{request.post_type}</p><p><b>PIC</b><br />{request.assigned_to || 'Belum ditentukan'}</p><p><b>Catatan Admin</b><br />{request.admin_note || '-'}</p></div>{request.result_url && <a className="mt-5 inline-block text-sm font-bold text-orange-600 underline" href={request.result_url} target="_blank">Buka link hasil postingan</a>}<div className="progress-line" aria-label={`Progress request: ${request.status}`}>{statuses.map((status, index) => <div className={`progress-step ${index <= currentStep ? 'is-complete' : ''} ${index === currentStep ? 'is-current' : ''} ${index < currentStep ? 'is-past' : ''}`} key={status}><div className="progress-node"><div className="progress-marker">{index < currentStep ? '✓' : index + 1}</div></div><div className="progress-label"><b>{status}</b><small>{index < currentStep ? 'Selesai' : index === currentStep ? 'Sedang berjalan' : 'Menunggu'}</small></div></div>)}</div></article> })}</div></section>
}

function AdminApp({ back }) {
  const [user, setUser] = useState(() => JSON.parse(authStorage.getItem('admin_user') || 'null'))
  if (!user) return <AdminLogin onLogin={setUser} back={back} />
  return <AdminDashboard user={user} back={back} onLogout={() => { authStorage.removeItem('admin_token'); authStorage.removeItem('admin_user'); setUser(null) }} />
}

function AdminLogin({ onLogin, back }) {
  const [username, setUsername] = useState(() => localStorage.getItem('saved_admin_username') || ''), [password, setPassword] = useState(() => localStorage.getItem('saved_admin_password') || ''), [remember, setRemember] = useState(() => localStorage.getItem('saved_admin_remember') === 'true'), [error, setError] = useState('')
  return <main className="min-h-screen bg-slate-50 px-5 py-10"><form className="panel mx-auto mt-16 max-w-md" onSubmit={async e => { e.preventDefault(); setError(''); try { const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: username, password }) }); if (remember) { localStorage.setItem('saved_admin_username', username); localStorage.setItem('saved_admin_password', password); localStorage.setItem('saved_admin_remember', 'true') } else { localStorage.removeItem('saved_admin_username'); localStorage.removeItem('saved_admin_password'); localStorage.removeItem('saved_admin_remember') } authStorage.setItem('admin_token', data.token); authStorage.setItem('admin_user', JSON.stringify(data.user)); onLogin(data.user) } catch (x) { setError(x.message) } }}><button type="button" className="mb-8 text-sm text-slate-500" onClick={back}>← Kembali</button><p className="eyebrow">Area admin</p><h1 className="page-title">Masuk sebagai Admin</h1><div className="mt-7 grid gap-4"><Field label="Username" required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} /><Field label="Password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /><label className="remember-login"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> <span>Ingat data login di perangkat ini</span></label>{error && <p className="text-sm text-red-600">{error}</p>}<button className="btn">Masuk</button></div></form></main>
}

function AdminDashboard({ user, back, onLogout }) {
  const [requests, setRequests] = useState([]), [stats, setStats] = useState({}), [selected, setSelected] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [toast, setToast] = useState(null), [adminNotifications, setAdminNotifications] = useState(() => getNotifications()), [showNotifications, setShowNotifications] = useState(false), [showArchived, setShowArchived] = useState(false), [showDivisionPasswords, setShowDivisionPasswords] = useState(false), [confirmation, setConfirmation] = useState(null)
  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(() => setToast(null), 4200); return () => window.clearTimeout(timer) }, [toast])
  const load = () => { setLoading(true); const archiveQuery = showArchived ? '&archived=true' : ''; const requestsUrl = `/api/admin/requests?limit=100${archiveQuery}`; Promise.all([api(requestsUrl), api('/api/admin/stats')]).then(([list, summary]) => { setRequests(list.data); setStats(summary) }).catch(e => { setError(e.message); setToast({ type: 'error', message: e.message }) }).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [showArchived])
  useEffect(() => {
    const timer = window.setInterval(() => load(true), 8000)
    const syncNotifications = event => { if (event.key === notificationsKey) setAdminNotifications(getNotifications()) }
    window.addEventListener('storage', syncNotifications)
    return () => { window.clearInterval(timer); window.removeEventListener('storage', syncNotifications) }
  }, [showArchived])
  useEffect(() => {
    const closeOnEscape = event => { if (event.key === 'Escape') setConfirmation(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])
  const archive = request => setConfirmation({ action: 'archive', request })
  const remove = request => setConfirmation({ action: 'remove', request })
  const confirmAction = async () => {
    const { action, request } = confirmation
    setConfirmation(null)
    try {
      await api(`/api/admin/requests/${request.id}${action === 'archive' ? '/archive' : ''}`, { method: action === 'archive' ? 'POST' : 'DELETE' })
      setToast({ type: 'success', message: action === 'archive' ? 'Request berhasil diarsipkan.' : 'Request berhasil dihapus permanen.' })
      load()
    } catch (e) { setError(e.message); setToast({ type: 'error', message: e.message }) }
  }
  if (showNotifications) return <div className="min-h-screen bg-slate-50"><Nav title="Notifikasi Admin" onBack={back} links={[]} page="" setPage={() => {}} right={<button className="header-action header-action-back" onClick={() => setShowNotifications(false)}><span>←</span> Dashboard</button>} /><main className="mx-auto max-w-4xl px-5 py-8"><NotificationPage audience="admin" items={adminNotifications} onChange={setAdminNotifications} /></main></div>
  return <div className="min-h-screen bg-slate-50"><Nav title="Dashboard Admin" onBack={back} links={[['notifications', 'Notifikasi']]} page="" setPage={nextPage => { if (nextPage === 'notifications') setShowNotifications(true) }} right={<><span className="admin-identity"><span className="admin-avatar">{(user.name || 'A').slice(0, 1).toUpperCase()}</span><span className="hidden sm:inline">{user.name}</span></span><button onClick={onLogout} className="header-action header-action-logout"><span>↪</span> Keluar</button></>} notificationCount={getNotifications().filter(item => !item.read && (item.audience === 'all' || item.audience === 'admin')).length} /><main className="mx-auto max-w-7xl px-5 py-8"><div className="dashboard-heading"><div><p className="eyebrow">Ringkasan</p><h1 className="page-title">{showArchived ? 'Arsip Request' : 'Request Postingan'}</h1><p className="dashboard-subtitle">{showArchived ? 'Kelola request yang sudah selesai diproses.' : 'Pantau dan kelola seluruh request konten.'}</p></div><div className="dashboard-toolbar"><button className="toolbar-button" onClick={() => setShowDivisionPasswords(true)}><span>⌁</span> Password Bidang</button><button className="toolbar-button" onClick={() => setShowArchived(value => !value)}><span>▤</span> {showArchived ? 'Request Aktif' : 'Lihat Arsip'}</button><button className="toolbar-button toolbar-button-primary" onClick={() => { load(); setToast({ type: 'success', message: 'Data request diperbarui.' }) }}><span>↻</span> Refresh</button></div></div>{!showArchived && <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{['total', ...statuses].map(key => <div className="stat" key={key}><span>{key === 'total' ? 'Total' : key}</span><b>{stats[key] || 0}</b></div>)}</div>}{error && <div className="notice error mt-5">{error}</div>}{loading ? <div className="panel mt-7">Memuat request...</div> : <div className="mt-7 overflow-hidden rounded-2xl bg-white shadow-sm"><div className="overflow-x-auto"><table><thead><tr>  <th>Pemohon</th><th>Judul</th><th>BaUBi</th><th>Jenis</th><th>Tanggal Request</th><th>Deadline</th><th>Status</th><th>PIC</th><th /></tr></thead><tbody>{requests.map(r => <tr key={r.id}><td>{r.requester_name}</td><td className="font-semibold">{r.title}</td><td>{r.division}</td><td>{r.post_type}</td><td>{new Date(r.created_at).toLocaleString('id-ID')}</td><td>{new Date(r.deadline).toLocaleDateString('id-ID')}</td><td><span className="status">{r.status}</span></td><td>{r.assigned_to || '-'}</td><td><div className="flex items-center gap-3"><button className="text-sm font-bold text-orange-600" onClick={() => setSelected(r)}>Detail</button>{!showArchived && r.status === 'Selesai' && <button className="text-sm font-bold text-slate-600" onClick={() => archive(r)}>Arsipkan</button>}{showArchived && <button className="text-sm font-bold text-red-600" onClick={() => remove(r)}>Hapus</button>}</div></td></tr>)}</tbody></table></div>{!requests.length && <p className="p-6 text-sm text-slate-500">{showArchived ? 'Belum ada request yang diarsipkan.' : 'Belum ada request.'}</p>}</div>}</main>{selected && <AdminDetail request={selected} onClose={() => setSelected(null)} onSaved={payload => { if (payload.completed) addNotification(`Postingan "${payload.request.title}" sudah selesai diproses.`, 'user', payload.request.division); if (!payload.keepOpen) setSelected(null); setToast({ type: 'success', message: payload.keepOpen ? `PIC ${payload.request.assigned_to} berhasil ditentukan.` : 'Perubahan request berhasil disimpan.' }); load() }} />}{showDivisionPasswords && <DivisionPasswords onClose={() => setShowDivisionPasswords(false)} />}{confirmation && <ConfirmModal confirmation={confirmation} onCancel={() => setConfirmation(null)} onConfirm={confirmAction} />}{toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}</div>
}

function DivisionPasswords({ onClose }) {
  const [divisions, setDivisions] = useState([]), [values, setValues] = useState({}), [message, setMessage] = useState(''), [error, setError] = useState('')
  useEffect(() => { api('/api/admin/divisions').then(data => setDivisions(data.data || [])).catch(e => setError(e.message)) }, [])
  const update = async division => {
    const password = values[division.id] || ''
    setMessage(''); setError('')
    try { await api(`/api/admin/divisions/${division.id}/password`, { method: 'PATCH', body: JSON.stringify({ password }) }); setValues(current => ({ ...current, [division.id]: '' })); setMessage(`Password ${division.name} berhasil diperbarui.`) } catch (e) { setError(e.message) }
  }
  const toggle = async division => {
    setMessage(''); setError('')
    try {
      const data = await api(`/api/admin/divisions/${division.id}/password-mode`, { method: 'PATCH', body: JSON.stringify({ enabled: !division.password_enabled }) })
      setDivisions(current => current.map(item => item.id === division.id ? { ...item, password_enabled: data.division.password_enabled } : item))
      setMessage(`Password bidang ${division.name} ${data.division.password_enabled ? 'diaktifkan' : 'dinonaktifkan'}.`)
    } catch (e) { setError(e.message) }
  }
  return <div className="modal"><section className="panel max-w-2xl"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Pengaturan akses</p><h2 className="page-title">Password Bidang</h2><p className="muted">Aktifkan password jika bidang harus memasukkan password saat masuk.</p></div><button type="button" onClick={onClose} className="text-2xl text-slate-400">×</button></div>{message && <div className="notice mt-5">{message}</div>}{error && <div className="notice error mt-5">{error}</div>}<div className="mt-6 grid gap-3">{divisions.map(division => <div className="rounded-xl border border-slate-100 bg-slate-50 p-4" key={division.id}><div className="flex flex-col gap-3"><div><b>{division.name}</b><div><span className={division.password_enabled ? 'status mt-2' : 'status status-off mt-2'}>{division.password_enabled ? 'Password aktif' : 'Password nonaktif'}</span></div></div><div className="flex w-full flex-wrap items-center gap-2"><input className="field-input" type="password" minLength="6" placeholder="Password baru" value={values[division.id] || ''} onChange={e => setValues(current => ({ ...current, [division.id]: e.target.value }))} /><button className="btn" type="button" onClick={() => update(division)}>Simpan</button><button className={`switch ${division.password_enabled ? 'is-on' : ''}`} type="button" role="switch" aria-checked={division.password_enabled} aria-label={`${division.password_enabled ? 'Nonaktifkan' : 'Aktifkan'} password ${division.name}`} onClick={() => toggle(division)}><span className="switch-thumb" /></button><span className="switch-label">{division.password_enabled ? 'Aktif' : 'Off'}</span></div></div></div>)}</div></section></div>
}

function AdminDetail({ request, onClose, onSaved }) {
  const [form, setForm] = useState({ status: request.status, assigned_to: request.assigned_to || '', admin_note: request.admin_note || '', result_url: request.result_url || '' }), [error, setError] = useState(''), [deleteConfirmation, setDeleteConfirmation] = useState(false)
  const set = (key, value) => setForm({ ...form, [key]: value })
  const deleteRequest = async () => { setDeleteConfirmation(false); try { await api(`/api/admin/requests/${request.id}`, { method: 'DELETE' }); onSaved({ completed: false }) } catch (x) { setError(x.message) } }
  return <><div className="modal"><form className="panel max-w-2xl" onSubmit={async e => { e.preventDefault(); try { const saved = await api(`/api/admin/requests/${request.id}`, { method: 'PATCH', body: JSON.stringify(form) }); onSaved({ completed: request.status !== 'Selesai' && form.status === 'Selesai', request: saved }) } catch (x) { setError(x.message) } }}><div className="flex justify-between gap-4"><div><p className="eyebrow">Detail request</p><h2 className="text-2xl font-black">{request.title}</h2></div><button type="button" onClick={onClose} className="text-2xl text-slate-400">×</button></div><div className="mt-6 grid gap-3 text-sm sm:grid-cols-2"><p><b>Pemohon</b><br />{request.requester_name}</p><p><b>Bidang</b><br />{request.division}</p><p><b>Jenis</b><br />{request.post_type}</p><p><b>Jumlah slide</b><br />{request.slide_count}</p><p><b>Draft</b><br /><a className="text-orange-600 underline" href={request.draft_url} target="_blank">Buka draft</a></p><p><b>Deadline</b><br />{new Date(request.deadline).toLocaleString('id-ID')}</p></div><div className="mt-6 grid gap-4"><label className="field"><span>Status</span><select value={form.status} onChange={e => set('status', e.target.value)}>{statuses.map(status => <option key={status}>{status}</option>)}</select></label><div className="field"><span>PIC</span><div className="flex flex-wrap items-center gap-3"><div className="field-input flex-1">{form.assigned_to || 'Belum ditentukan'}</div><button type="button" className="btn-secondary" onClick={async () => { try { const assigned = await api(`/api/admin/requests/${request.id}/assign-random`, { method: 'POST' }); set('assigned_to', assigned.assigned_to); onSaved({ completed: false, request: assigned, keepOpen: true }) } catch (x) { setError(x.message) } }}>Ubah PIC</button></div><small className="text-slate-500">PIC ditentukan otomatis saat request dibuat. Gunakan tombol ini jika PIC sedang sibuk; rotasi tetap mengikuti giliran 8 PIC.</small></div><label className="field"><span>Catatan Admin</span><textarea rows="4" value={form.admin_note} onChange={e => set('admin_note', e.target.value)} /></label><Field label="Link Hasil Postingan" type="url" value={form.result_url} onChange={e => set('result_url', e.target.value)} placeholder="Diisi saat hasil siap" />{error && <p className="text-sm text-red-600">{error}</p>}<button className="btn">Simpan Perubahan</button>{request.status === 'Selesai' && <div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary" onClick={async () => { try { await api(`/api/admin/requests/${request.id}/archive`, { method: 'POST' }); onSaved({ completed: false }) } catch (x) { setError(x.message) } }}>Arsipkan Request</button><button type="button" className="rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600" onClick={() => setDeleteConfirmation(true)}>Hapus Permanen</button></div>}</div></form></div>{deleteConfirmation && <ConfirmModal confirmation={{ action: 'remove', request }} onCancel={() => setDeleteConfirmation(false)} onConfirm={deleteRequest} />}</>
}

function NotificationPage({ audience, division, items, onChange }) {
  const [storedItems, setStoredItems] = useState(() => getNotifications())
  useEffect(() => {
    const latest = getNotifications()
    setStoredItems(latest)
    onChange(latest)
  }, [audience])
  const sourceItems = storedItems.length || items.length ? storedItems : items
  const visible = sourceItems.filter(item => (item.audience === 'all' || item.audience === audience) && (audience !== 'user' || item.division === division))
  const markAllRead = () => {
    const updated = sourceItems.map(item => visible.some(visibleItem => visibleItem.id === item.id) ? { ...item, read: true } : item)
    localStorage.setItem(notificationsKey, JSON.stringify(updated))
    setStoredItems(updated)
    onChange(updated)
  }
  return <section><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Pusat informasi</p><h1 className="page-title">Notifikasi</h1><p className="muted">Informasi terbaru terkait request dan aktivitas aplikasi.</p></div>{visible.some(item => !item.read) && <button className="btn-secondary" onClick={markAllRead}>Tandai semua dibaca</button>}</div><div className="mt-7 grid gap-3">{visible.length ? visible.map(item => <article className={`notification-item ${item.read ? '' : 'unread'}`} key={item.id}><span className="toast-icon">{item.read ? '✓' : '•'}</span><div><b>{item.message}</b><p>{new Date(item.created_at).toLocaleString('id-ID')}</p></div></article>) : <div className="panel text-sm text-slate-500">Belum ada notifikasi.</div>}</div></section>
}
function ConfirmModal({ confirmation, onCancel, onConfirm }) {
  const isDelete = confirmation.action === 'remove'
  return <div className="confirm-modal" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onCancel() }}>
    <section className="confirm-card" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className={`confirm-icon ${isDelete ? 'confirm-icon-danger' : ''}`} aria-hidden="true">{isDelete ? '!' : '↗'}</div>
      <p className="confirm-eyebrow">{isDelete ? 'Tindakan permanen' : 'Pindahkan request'}</p>
      <h2 id="confirm-title">{isDelete ? 'Hapus request ini?' : 'Arsipkan request ini?'}</h2>
      <p className="confirm-copy"><b>{confirmation.request.title}</b>{isDelete ? ' akan dihapus permanen dan tidak dapat dipulihkan.' : ' akan dipindahkan ke arsip dan tidak tampil di request aktif.'}</p>
      <div className="confirm-actions"><button type="button" className="btn-secondary" onClick={onCancel}>Batal</button><button type="button" className={`confirm-submit ${isDelete ? 'confirm-submit-danger' : ''}`} onClick={onConfirm}>{isDelete ? 'Ya, hapus' : 'Ya, arsipkan'}</button></div>
    </section>
  </div>
}
function Toast({ message, type = 'success', onClose }) { return <div className={`toast ${type === 'error' ? 'toast-error' : ''}`} role="status"><span className="toast-icon">{type === 'error' ? '!' : '✓'}</span><span>{message}</span><button type="button" aria-label="Tutup notifikasi" onClick={onClose}>×</button></div> }
function Field({ label, ...props }) { return <label className="field"><span>{label}</span><input {...props} /></label> }
function Nav({ title, onBack, links, page, setPage, right, notificationCount = 0 }) { return <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4"><button className="text-left" onClick={onBack}><p className="font-black text-orange-600">WEB KMI</p><p className="text-xs text-slate-500">{title}</p></button><nav className="flex items-center gap-2">{links.map(([key, label]) => <button key={key} className={page === key ? 'nav-link active' : 'nav-link'} onClick={() => setPage(key)}>{label}{key === 'notifications' && notificationCount > 0 && <span className="notification-count">{notificationCount > 9 ? '9+' : notificationCount}</span>}</button>)}{right}</nav></div></header> }
function DivisionPassword({ division, onSuccess, onBack }) {
  const [password, setPassword] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(false)
  return <main className="min-h-screen bg-slate-950 px-5 py-10"><form className="panel mx-auto mt-16 max-w-md" onSubmit={async event => { event.preventDefault(); setLoading(true); setError(''); try { await api(`/api/public/divisions/${division.id}/access`, { method: 'POST', body: JSON.stringify({ password }) }); onSuccess() } catch (e) { setError(e.message) } finally { setLoading(false) } }}><button type="button" className="mb-8 text-sm text-slate-500" onClick={onBack}>← Pilih bidang lain</button><p className="eyebrow">Akses bidang</p><h1 className="page-title">{division.name}</h1><p className="muted">Masukkan password bidang untuk membuka request dan progress.</p><div className="mt-7 grid gap-4"><Field label="Password Bidang" type="password" required autoFocus value={password} onChange={e => setPassword(e.target.value)} />{error && <p className="text-sm text-red-600">{error}</p>}<button className="btn">{loading ? 'Memeriksa...' : 'Masuk ke Halaman Request'}</button></div></form></main>
}

function DivisionPicker({ onSelect, onBack }) {
  const [divisions, setDivisions] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('')
  useEffect(() => { api('/api/public/meta').then(data => setDivisions(data.divisions || [])).catch(e => setError(e.message)).finally(() => setLoading(false)) }, [])
  return <main className="min-h-screen bg-slate-950 px-6 py-10 text-white"><section className="mx-auto flex min-h-[80vh] max-w-6xl flex-col justify-center"><button className="mb-8 w-fit text-sm text-slate-400" onClick={onBack}>← Kembali</button><p className="eyebrow">Ruang User</p><h1 className="mt-2 text-4xl font-black">Pilih Bidang</h1><p className="mt-3 text-slate-300">Pilih bidang/divisi untuk melanjutkan membuat request postingan.</p>{loading ? <p className="mt-8 text-slate-300">Memuat bidang...</p> : error ? <p className="mt-8 text-red-300">{error}</p> : <div className="mt-8 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">{divisions.map(division => <button key={division.id} className="choice-card" onClick={() => onSelect(division)}><b>{division.name}</b></button>)}</div>}</section></main>
}
function App() { const [mode, setMode] = useState(() => { if (authStorage.getItem('admin_token') && authStorage.getItem('admin_user')) return 'admin'; if (authStorage.getItem('user_division')) return 'user'; return null }), [division, setDivision] = useState(() => { try { return JSON.parse(authStorage.getItem('user_division') || 'null') } catch { return null } }); const selectDivision = value => { setDivision(value); if (value.password_enabled) setMode('division-password'); else { authStorage.setItem('user_division', JSON.stringify(value)); setMode('user') } }; const leaveUser = () => { authStorage.removeItem('user_division'); setDivision(null); setMode('division') }; return mode === 'user' ? <UserApp division={division} back={leaveUser} /> : mode === 'admin' ? <AdminApp back={() => setMode(null)} /> : mode === 'division-password' ? <DivisionPassword division={division} onSuccess={() => { authStorage.setItem('user_division', JSON.stringify(division)); setMode('user') }} onBack={() => setMode('division')} /> : mode === 'division' ? <DivisionPicker onSelect={selectDivision} onBack={() => setMode(null)} /> : <Home choose={value => value === 'user' ? setMode('division') : setMode(value)} /> }
createRoot(document.getElementById('root')).render(<App />)
