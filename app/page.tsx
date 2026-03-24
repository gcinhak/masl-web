// app/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LoginButton from '@/components/ui/LoginButton';
import RequestStaffButton from '@/components/ui/RequestStaffButton';

export default async function Home() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // ==========================================
    // [Case 1] 비로그인 상태: 기본 환영 화면 및 로그인 유도
    // ==========================================
    if (!user) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
                <div className="text-center max-w-md">
                    <h1 className="text-4xl font-extrabold mb-4 text-gray-900">MASL 리그 매니저</h1>
                    <p className="mb-8 text-gray-600 text-lg">
                        학교 스포츠 리그에 참여하고 실시간 대진표를 확인하세요. 서비스를 이용하려면 로그인이 필요합니다.
                    </p>
                    <div className="flex justify-center">
                        <LoginButton />
                    </div>
                </div>
            </main>
        );
    }

    // 로그인 상태라면 DB에서 유저 권한(Role)과 상태(Status)를 가져옴
    const { data: roleData } = await supabase.from('user_roles').select('role, status').eq('id', user.id).single();

    const userRole = roleData?.role || 'user';
    const userStatus = roleData?.status || 'approved';

    // ==========================================
    // [Case 2] 관리자(admin) & 운영진(staff): 전용 대시보드로 강제 이동
    // ==========================================
    if (userRole === 'admin' || userRole === 'staff') {
        // 관리자나 운영진은 일반 랜딩을 볼 필요 없이 곧바로 업무 화면으로 넘깁니다.
        redirect('/admin');
    }

    // ==========================================
    // [Case 3] 일반 사용자(user): 학생용 포털 화면 제공
    // ==========================================
    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                {/* 상단 환영 메시지 */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">환영합니다!</h1>
                        <p className="text-gray-600 font-medium">
                            {user.email} 님, MASL에서 즐거운 스포츠 라이프를 즐겨보세요.
                        </p>
                    </div>
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-semibold border">
                        일반 사용자
                    </span>
                </div>

                {/* 주요 기능 바로가기 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 참가 신청 카드 */}
                    <Link href="/apply" className="block group">
                        <div className="bg-white rounded-2xl p-8 shadow-sm border h-full transition duration-300 hover:border-blue-500 hover:shadow-md">
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                                📝
                            </div>
                            <h2 className="text-xl font-bold mb-3 text-gray-800">팀 참가 신청</h2>
                            <p className="text-gray-600 leading-relaxed">
                                새로운 시즌에 참가할 팀을 구성하고 신청서를 제출하세요. 승인 결과를 확인할 수 있습니다.
                            </p>
                        </div>
                    </Link>

                    {/* 대진표 확인 카드 */}
                    <Link href="/bracket" className="block group">
                        <div className="bg-white rounded-2xl p-8 shadow-sm border h-full transition duration-300 hover:border-green-500 hover:shadow-md">
                            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                                🏆
                            </div>
                            <h2 className="text-xl font-bold mb-3 text-gray-800">대진표 및 스코어</h2>
                            <p className="text-gray-600 leading-relaxed">
                                진행 중인 대회의 실시간 대진표와 경기 결과를 로그인 없이도 한눈에 확인하세요.
                            </p>
                        </div>
                    </Link>
                </div>

                {/* 하단 운영진 신청 배너 */}
                <div className="mt-12 bg-blue-50/50 rounded-2xl p-6 md:p-8 border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-blue-900 mb-2">혹시 리그 운영진이신가요?</h3>
                        <p className="text-blue-700/80 text-sm">
                            팀 승인 및 대진표 관리, 점수 입력 권한이 필요하다면 최고 관리자에게 권한을 요청하세요.
                        </p>
                    </div>
                    {/* 앞서 만든 클라이언트 컴포넌트 호출 */}
                    <RequestStaffButton initialStatus={userStatus} />
                </div>
            </div>
        </main>
    );
}
