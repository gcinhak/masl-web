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
                <div className="w-full max-w-md bg-white border-4 border-black p-8 rounded-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
                    <h1
                        className="text-5xl md:text-6xl font-extrabold mb-4 text-black tracking-tighter"
                        style={{ fontFamily: 'sans-serif' }}
                    >
                        MASL
                    </h1>
                    <h2 className="text-3xl font-extrabold mb-6 text-black tracking-tighter">리그 매니저</h2>
                    <div className="w-16 h-2 bg-black mx-auto mb-6"></div>
                    <p className="mb-10 text-gray-700 font-bold text-lg">
                        학교 스포츠 리그에 참여하고
                        <br />
                        실시간 대진표를 확인하세요.
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
        redirect('/admin');
    }

    // ==========================================
    // [Case 3] 일반 사용자(user): 학생용 포털 화면 제공
    // ==========================================
    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-4xl mx-auto flex flex-col items-center">
                {/* 상단 헤더 영역 (타이틀 좌, 뱃지 우) */}
                <div className="w-full flex flex-col md:flex-row items-center justify-between border-b-8 border-black pb-6 mb-10 gap-6">
                    <div className="text-center md:text-left">
                        <h1
                            className="text-5xl md:text-6xl font-extrabold text-black tracking-tighter"
                            style={{ fontFamily: 'sans-serif' }}
                        >
                            환영합니다!
                        </h1>
                        <p className="text-lg md:text-xl text-gray-600 mt-3 font-bold">
                            {user.email} 님, 즐거운 스포츠 라이프를 즐겨보세요.
                        </p>
                    </div>

                    <div className="bg-white border-4 border-black px-4 py-2 rounded-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <span className="text-black font-extrabold text-lg">일반 사용자</span>
                    </div>
                </div>

                {/* 주요 기능 바로가기 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                    {/* 참가 신청 카드 */}
                    <Link href="/apply" className="block group">
                        <div className="bg-white rounded-sm p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] h-full transition-transform transform group-hover:-translate-y-2 group-hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center">
                            {/* ✅ 수정됨: 이모티콘 삭제 */}
                            <h2 className="text-3xl font-extrabold mb-4 text-black tracking-tighter">팀 참가 신청</h2>
                            <p className="text-gray-700 font-bold text-lg leading-relaxed">
                                새로운 시즌에 참가할 팀을
                                <br />
                                구성하고 신청서를 제출하세요.
                            </p>
                        </div>
                    </Link>

                    {/* 대진표 확인 카드 */}
                    <Link href="/bracket" className="block group">
                        <div className="bg-white rounded-sm p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] h-full transition-transform transform group-hover:-translate-y-2 group-hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center">
                            {/* ✅ 수정됨: 이모티콘 삭제 */}
                            <h2 className="text-3xl font-extrabold mb-4 text-black tracking-tighter">대진표 확인</h2>
                            <p className="text-gray-700 font-bold text-lg leading-relaxed">
                                진행 중인 대회의 실시간
                                <br />
                                대진표와 경기 결과를 확인하세요.
                            </p>
                        </div>
                    </Link>
                </div>

                {/* 하단 운영진 신청 배너 */}
                <div className="mt-12 w-full bg-white rounded-sm p-6 md:p-10 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                    <div>
                        <h3 className="text-2xl font-extrabold text-black mb-3 tracking-tighter">
                            혹시 리그 운영진이신가요?
                        </h3>
                        <p className="text-gray-700 font-bold text-lg">
                            팀 승인 및 대진표 관리 권한이 필요하다면 요청하세요.
                        </p>
                    </div>
                    {/* 앞서 만든 클라이언트 컴포넌트 호출 */}
                    <div className="border-2 border-black p-1 rounded-sm">
                        <RequestStaffButton initialStatus={userStatus} />
                    </div>
                </div>
            </div>
        </main>
    );
}
