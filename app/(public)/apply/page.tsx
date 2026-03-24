// app/(public)/apply/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ApplyPage() {
    const supabase = createClient();
    const router = useRouter();

    // 상태 관리
    const [sports, setSports] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // 폼 입력 데이터 상태
    const [selectedSport, setSelectedSport] = useState('');
    const [teamName, setTeamName] = useState('');
    const [contact, setContact] = useState('');
    const [rosterText, setRosterText] = useState('');

    // 1. 화면이 켜질 때 '모집중'인 종목 목록 불러오기
    useEffect(() => {
        async function fetchSports() {
            const { data, error } = await supabase.from('sports').select('id, name').eq('status', '모집중'); // 모집 중인 종목만 가져오기

            if (!error && data) {
                setSports(data);
            }
        }
        fetchSports();
    }, []);

    // 2. 제출 버튼 클릭 시 실행되는 함수
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // 팀원 명단을 줄바꿈(Enter) 기준으로 나누어 JSON 배열로 변환
        const rosterArray = rosterText.split('\n').filter((name) => name.trim() !== '');

        // teams 테이블에 데이터 삽입 (INSERT)
        const { error } = await supabase.from('teams').insert([
            {
                sport_id: selectedSport,
                name: teamName,
                contact: contact,
                roster: rosterArray, // JSONB 컬럼에 배열 형태로 저장됨
                status: '승인대기',
            },
        ]);

        setIsLoading(false);

        if (error) {
            console.error('신청 에러:', error);
            alert('신청 중 오류가 발생했습니다. 다시 시도해 주세요.');
        } else {
            alert('참가 신청이 완료되었습니다! 관리자 승인을 기다려주세요.');
            router.push('/'); // 신청 완료 후 메인 홈으로 이동
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 md:p-12">
            <h1 className="text-3xl font-bold mb-2">MASL 참가 신청</h1>
            <p className="text-gray-600 mb-8">2026년 1학기 리그에 참가할 팀 정보를 정확히 입력해 주세요.</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* 참가 종목 선택 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">참가 종목</label>
                    <select
                        required
                        value={selectedSport}
                        onChange={(e) => setSelectedSport(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="" disabled>
                            종목을 선택해 주세요
                        </option>
                        {sports.map((sport) => (
                            <option key={sport.id} value={sport.id}>
                                {sport.name}
                            </option>
                        ))}
                    </select>
                    {sports.length === 0 && (
                        <p className="text-sm text-red-500 mt-2">현재 모집 중인 종목이 없습니다.</p>
                    )}
                </div>

                {/* 팀 이름 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">팀 이름</label>
                    <input
                        type="text"
                        required
                        placeholder="예: 경영학과 불도저"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* 대표자 연락처 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">대표자 연락처</label>
                    <input
                        type="text"
                        required
                        placeholder="예: 010-1234-5678 (홍길동)"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* 팀원 명단 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        팀원 명단 <span className="text-gray-400 font-normal">(엔터로 구분해서 적어주세요)</span>
                    </label>
                    <textarea
                        required
                        rows={5}
                        placeholder={`홍길동(10번)\n김철수(11번)\n이영희(주장)`}
                        value={rosterText}
                        onChange={(e) => setRosterText(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                </div>

                {/* 제출 버튼 */}
                <button
                    type="submit"
                    disabled={isLoading || sports.length === 0}
                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition mt-4"
                >
                    {isLoading ? '제출 중...' : '신청서 제출하기'}
                </button>
            </form>
        </div>
    );
}
