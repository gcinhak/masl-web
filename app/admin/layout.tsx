// app/admin/layout.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();

    // 1. 로그인 상태 확인
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        redirect('/'); // 비로그인 시 홈으로 추방
    }

    // 2. 권한(Role) 확인
    const { data: roleData } = await supabase.from('user_roles').select('role, status').eq('id', user.id).single();

    // 일반 유저이거나, 권한 요청 중이거나, 데이터가 없으면 추방
    if (!roleData || roleData.role === 'user' || roleData.status === 'pending_staff') {
        redirect('/?error=unauthorized'); // 권한 없음 에러를 달고 홈으로 추방
    }

    // admin 또는 staff 권한이 통과된 사람만 아래 화면(children)을 볼 수 있음
    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* 관리자 공통 사이드바(LNB)가 들어갈 자리 */}
            <aside className="w-64 bg-white border-r shadow-sm p-4">
                <h2 className="text-xl font-bold mb-6 text-blue-600">MASL 운영진</h2>
                <nav className="flex flex-col gap-3">
                    {/* 메뉴 링크들 */}
                    <a href="/admin/teams" className="hover:text-blue-500">
                        참가팀 관리
                    </a>
                    <a href="/admin/bracket" className="hover:text-blue-500">
                        대진표 관리
                    </a>
                    {/* 최고 관리자만 볼 수 있는 메뉴 설정도 가능합니다 */}
                    {roleData.role === 'admin' && (
                        <a href="/admin/users" className="text-purple-600 font-bold mt-4 border-t pt-4">
                            권한 승인 관리
                        </a>
                    )}
                </nav>
            </aside>

            <main className="flex-1 p-8">{children}</main>
        </div>
    );
}
