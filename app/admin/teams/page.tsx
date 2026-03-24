// app/admin/teams/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface TeamData {
    id: string;
    sport_id: string;
    name: string;
    roster: Array<{ grade: string; name: string; number: string }>;
    status: string;
    applicant_email: string;
    representative_student: string;
    created_at: string;
    sports?: { name: string };
}

export default function AdminTeamsPage() {
    const supabase = createClient();
    const [teams, setTeams] = useState<TeamData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 1. 데이터베이스에서 참가팀 목록 불러오기
    const fetchTeams = useCallback(async () => {
        setIsLoading(true);
        // 연결된 sports 테이블의 name(종목명)까지 한 번에 가져오는 쿼리입니다.
        const { data, error } = await supabase
            .from('teams')
            .select(
                `
        *,
        sports ( name )
      `
            )
            .order('created_at', { ascending: false }); // 최신 신청순으로 정렬

        if (error) {
            console.error('팀 목록 불러오기 에러:', error);
        } else if (data) {
            setTeams(data as TeamData[]);
        }
        setIsLoading(false);
    }, [supabase]);

    // 화면이 켜질 때 딱 한 번 실행
    useEffect(() => {
        (async () => {
            await fetchTeams();
        })();
    }, [fetchTeams]);

    // 2. 승인/거절 상태 변경 함수
    const updateTeamStatus = async (id: string, newStatus: string) => {
        const isConfirmed = confirm(`정말 이 팀을 '${newStatus}' 처리하시겠습니까?`);
        if (!isConfirmed) return;

        const { error } = await supabase.from('teams').update({ status: newStatus }).eq('id', id);

        if (error) {
            console.error('상태 업데이트 에러:', error);
            alert('업데이트 중 오류가 발생했습니다.');
        } else {
            alert(`성공적으로 ${newStatus} 처리되었습니다.`);
            fetchTeams(); // 변경된 데이터로 화면을 새로고침합니다.
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6 text-gray-800">참가팀 관리</h1>

            {isLoading ? (
                <p className="text-gray-500">데이터를 불러오는 중입니다...</p>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="p-4 font-semibold text-gray-600">신청 날짜</th>
                                <th className="p-4 font-semibold text-gray-600">종목</th>
                                <th className="p-4 font-semibold text-gray-600">팀 이름</th>
                                <th className="p-4 font-semibold text-gray-600">대표 학생</th>
                                <th className="p-4 font-semibold text-gray-600">신청자</th>
                                <th className="p-4 font-semibold text-gray-600">상태</th>
                                <th className="p-4 font-semibold text-gray-600 text-center">관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">
                                        아직 신청한 팀이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                teams.map((team: TeamData) => (
                                    <tr key={team.id} className="border-b hover:bg-gray-50 transition">
                                        <td className="p-4 text-sm text-gray-500">
                                            {new Date(team.created_at).toLocaleDateString()}
                                        </td>
                                        {/* sports 테이블에서 가져온 종목명 출력 */}
                                        <td className="p-4 font-medium">{team.sports?.name}</td>
                                        <td className="p-4 font-bold text-gray-800">{team.name}</td>
                                        <td className="p-4 text-sm">{team.representative_student || '-'}</td>
                                        <td className="p-4 text-sm">{team.applicant_email || '-'}</td>
                                        <td className="p-4">
                                            {/* 상태에 따라 뱃지 색상을 다르게 보여줍니다 */}
                                            <span
                                                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    team.status === '승인됨'
                                                        ? 'bg-green-100 text-green-700'
                                                        : team.status === '거절됨'
                                                          ? 'bg-red-100 text-red-700'
                                                          : 'bg-yellow-100 text-yellow-700'
                                                }`}
                                            >
                                                {team.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center space-x-2">
                                            <button
                                                onClick={() => updateTeamStatus(team.id, '승인됨')}
                                                disabled={team.status === '승인됨'}
                                                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                            >
                                                승인
                                            </button>
                                            <button
                                                onClick={() => updateTeamStatus(team.id, '거절됨')}
                                                disabled={team.status === '거절됨'}
                                                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                            >
                                                거절
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
