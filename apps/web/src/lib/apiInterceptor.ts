/**
 * 全局 fetch 拦截器: 统一处理登录超时 / 会话失效.
 *
 * 后端 session (cookie hl.sid) 到期或服务器重启后, 受 AuthGuard 保护的接口返回 401.
 * 各页面散落的裸 fetch 不会逐个判断 401, 这里集中拦截:
 *   - 命中 /api 且状态 401 + 当前不在 /login  →  跳转登录页
 *   - 登录页自身的 /auth/me、/auth/login 401 由 pathname 守卫天然排除
 *
 * 单点安装 (main.tsx render 前调用一次), 未来新增的接口调用自动覆盖.
 */

let redirecting = false

function isApiRequest(url: string): boolean {
  try {
    return new URL(url, window.location.origin).pathname.startsWith('/api')
  } catch {
    return false
  }
}

export function installApiInterceptor(): void {
  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const res = await originalFetch(input, init)

    if (res.status === 401 && !redirecting && window.location.pathname !== '/login') {
      const url =
        typeof input === 'string' ? input
        : input instanceof URL ? input.href
        : input.url
      if (isApiRequest(url)) {
        redirecting = true
        // 整页跳转: 顺带清空过期会话遗留的内存 state
        window.location.assign('/login')
      }
    }

    return res
  }
}
