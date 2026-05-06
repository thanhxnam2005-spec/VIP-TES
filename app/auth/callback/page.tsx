'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, supabaseConfig } from '@/lib/supabase'
import { Loader2Icon, CheckCircle2Icon, XCircleIcon } from 'lucide-react'

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Đang xử lý đăng nhập...')
  const handledRef = useRef(false)

  useEffect(() => {
    if (!supabase || handledRef.current) return
    handledRef.current = true

    const doRedirect = () => {
      setStatus('success')
      setMessage('Đăng nhập thành công! Đang chuyển hướng...')
      // Use hard navigation to ensure clean page load with session from localStorage
      setTimeout(() => { window.location.href = '/dashboard' }, 600)
    }

    const doFail = (msg: string) => {
      console.error('[AuthCallback] FAIL:', msg)
      setStatus('error')
      setMessage(msg)
      setTimeout(() => { window.location.href = '/auth' }, 3000)
    }

    // Listen for auth state changes from detectSessionInUrl processing
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthCallback] onAuthStateChange:', event, !!session)
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
        doRedirect()
      }
    })

    // Also check after a delay to cover race conditions
    const checkTimer = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase!.auth.getSession()
        console.log('[AuthCallback] getSession check:', !!session)
        if (session) {
          doRedirect()
          return
        }

        // Try manual PKCE code exchange
        const code = new URLSearchParams(window.location.search).get('code')
        if (code) {
          console.log('[AuthCallback] Trying manual code exchange')
          const { data, error } = await supabase!.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('[AuthCallback] exchangeCodeForSession error:', error)
            // Code might already be consumed by detectSessionInUrl - check session again
            const { data: { session: retrySession } } = await supabase!.auth.getSession()
            if (retrySession) {
              doRedirect()
            } else {
              doFail('Lỗi xác thực: ' + error.message)
            }
          } else if (data.session) {
            doRedirect()
          } else {
            doFail('Không thể xác thực phiên đăng nhập')
          }
          return
        }

        // Check hash fragment (implicit flow)
        if (window.location.hash.includes('access_token')) {
          // Wait more for detectSessionInUrl to process
          await new Promise(r => setTimeout(r, 2000))
          const { data: { session: hashSession } } = await supabase!.auth.getSession()
          if (hashSession) {
            doRedirect()
            return
          }
        }
      } catch (err) {
        console.error('[AuthCallback] Exception:', err)
        doFail('Lỗi: ' + (err as Error).message)
      }
    }, 800)

    // Ultimate timeout
    const timeout = setTimeout(() => {
      doFail('Hết thời gian xử lý. Vui lòng thử đăng nhập lại.')
    }, 15000)

    return () => {
      listener.subscription.unsubscribe()
      clearTimeout(checkTimer)
      clearTimeout(timeout)
    }
  }, [])

  if (!supabase) {
    const missing: string[] = []
    if (!supabaseConfig.url) missing.push('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL')
    if (!supabaseConfig.anonKey)
      missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY')
    return (
      <div className="auth-cb-page">
        <div className="auth-cb-bg" />
        <div className="auth-cb-center">
          <div className="auth-cb-card">
            <p className="auth-cb-error-title">Không thể kết nối Supabase</p>
            <p className="auth-cb-desc">Vui lòng kiểm tra biến môi trường.</p>
            {missing.length > 0 && (
              <div className="auth-cb-error-list">
                <p style={{ fontWeight: 600 }}>Biến thiếu:</p>
                <ul>{missing.map(i => <li key={i}>{i}</li>)}</ul>
              </div>
            )}
          </div>
        </div>
        <style>{cbStyles}</style>
      </div>
    )
  }

  return (
    <div className="auth-cb-page">
      <div className="auth-cb-bg" />
      <div className="auth-cb-center">
        <div className="auth-cb-card">
          {status === 'loading' && (
            <>
              <div className="auth-cb-icon-wrap auth-cb-icon-loading">
                <Loader2Icon className="auth-cb-icon auth-cb-spin" />
              </div>
              <p className="auth-cb-title">Đang xử lý</p>
              <p className="auth-cb-desc">{message}</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="auth-cb-icon-wrap auth-cb-icon-success">
                <CheckCircle2Icon className="auth-cb-icon" />
              </div>
              <p className="auth-cb-title">Thành công</p>
              <p className="auth-cb-desc">{message}</p>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="auth-cb-icon-wrap auth-cb-icon-error">
                <XCircleIcon className="auth-cb-icon" />
              </div>
              <p className="auth-cb-title">Lỗi</p>
              <p className="auth-cb-desc">{message}</p>
              <p className="auth-cb-redirect-hint">Sẽ chuyển hướng về trang đăng nhập...</p>
            </>
          )}
        </div>
      </div>
      <style>{cbStyles}</style>
    </div>
  )
}

const cbStyles = `
  .auth-cb-page { position:fixed;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;font-family:var(--font-open-sans,system-ui,sans-serif); }
  .auth-cb-bg { position:absolute;inset:0;background:oklch(0.12 0.008 280);background-image:radial-gradient(at 20% 20%,oklch(0.18 0.04 150/40%) 0px,transparent 50%),radial-gradient(at 80% 80%,oklch(0.15 0.03 280/30%) 0px,transparent 50%); }
  .auth-cb-center { position:relative;z-index:10;padding:24px; }
  .auth-cb-card { max-width:420px;background:oklch(0.16 0.005 280/80%);backdrop-filter:blur(40px) saturate(1.5);border:1px solid oklch(1 0 0/8%);border-radius:24px;padding:40px 32px;text-align:center;box-shadow:0 20px 60px -10px oklch(0 0 0/50%);animation:auth-cb-enter .5s cubic-bezier(.16,1,.3,1); }
  @keyframes auth-cb-enter { from{opacity:0;transform:translateY(16px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  .auth-cb-icon-wrap { width:64px;height:64px;margin:0 auto 16px;border-radius:18px;display:flex;align-items:center;justify-content:center; }
  .auth-cb-icon-loading { background:oklch(0.65 0.15 150/10%);color:oklch(0.65 0.15 150); }
  .auth-cb-icon-success { background:oklch(0.65 0.15 150/15%);color:oklch(0.65 0.15 150); }
  .auth-cb-icon-error { background:oklch(0.60 0.15 25/15%);color:oklch(0.75 0.15 25); }
  .auth-cb-icon { width:32px;height:32px; }
  .auth-cb-spin { animation:auth-cb-spin-anim .8s linear infinite; }
  @keyframes auth-cb-spin-anim { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  .auth-cb-title { font-size:18px;font-weight:700;color:oklch(0.96 0.005 280);margin:0 0 6px; }
  .auth-cb-desc { font-size:14px;color:oklch(0.55 0.005 280);margin:0; }
  .auth-cb-redirect-hint { font-size:12px;color:oklch(0.40 0.005 280);margin-top:12px; }
  .auth-cb-error-title { color:oklch(0.75 0.15 25);font-size:18px;font-weight:700;margin:0 0 8px; }
  .auth-cb-error-list { background:oklch(0.15 0.04 25/30%);border-radius:12px;padding:12px 16px;text-align:left;font-size:13px;color:oklch(0.80 0.08 25);margin-top:12px; }
  .auth-cb-error-list ul { margin:6px 0 0;padding-left:20px; }
`
