// app/admin/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function AdminDashboard() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // 현재 로그인한 관리자의 권한 정보 가져오기
    const { data: roleData } = await supabase.from('user_roles').select('role').eq('id', user?.id).single();

    return (
        <div>
            <h1 className="text-3xl font-bold mb-4">관리자 대시보드</h1>
            <p className="text-gray-600 mb-8">
                환영합니다, <span className="font-semibold text-blue-600">{user?.email}</span> 님! (현재 권한:{' '}
                <span className="font-bold text-purple-600">{roleData?.role}</span>)
            </p>

            {/* 대시보드 요약 카드 (향후 실제 데이터를 연결할 자리입니다) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="text-gray-500 font-medium">진행 중인 시즌</h3>
                    <p className="text-3xl font-bold mt-2">2026년 1학기</p>
                </div>

                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="text-gray-500 font-medium">승인 대기 중인 팀</h3>
                    <p className="text-3xl font-bold mt-2 text-orange-500">0 건</p>
                </div>

                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="text-gray-500 font-medium">예정된 경기</h3>
                    <p className="text-3xl font-bold mt-2 text-blue-600">0 건</p>
                </div>
            </div>
        </div>
    );
}
