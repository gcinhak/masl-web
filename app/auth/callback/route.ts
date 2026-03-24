// app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // 로그인 후 돌아갈 페이지 (기본값은 메인 홈페이지)
    const next = searchParams.get('next') ?? '/';

    if (code) {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                        } catch {
                            // 서버 컴포넌트에서 호출될 때 발생하는 에러 무시용
                        }
                    },
                },
            }
        );

        // 구글에서 받아온 코드를 세션(로그인 상태)으로 교환
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // 에러 발생 시 홈으로 돌려보내거나 에러 페이지로 이동
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
}
