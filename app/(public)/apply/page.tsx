// app/(public)/apply/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// 팀원 데이터 구조 정의
interface Member {
    grade: string;
    name: string;
    number: string;
}

// 스포츠 데이터 구조 정의
interface Sport {
    id: string;
    name: string;
}

export default function ApplyPage() {
    const supabase = createClient();
    const router = useRouter();

    // 상태 관리
    const [sports, setSports] = useState<Sport[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // 폼 입력 데이터 상태
    const [selectedSport, setSelectedSport] = useState('');
    const [teamName, setTeamName] = useState('');

    // 팀원 명단 상태 (기본 5명 세팅)
    const [members, setMembers] = useState<Member[]>(
        Array(5)
            .fill(null)
            .map(() => ({ grade: '', name: '', number: '' }))
    );

    // 1. 모집중인 종목 불러오기
    useEffect(() => {
        async function fetchSports() {
            const { data, error } = await supabase.from('sports').select('id, name').eq('status', '모집중');

            if (!error && data) {
                setSports(data);
            }
        }
        fetchSports();
    }, [supabase]);

    // 팀원 추가 함수
    const addMember = () => {
        setMembers([...members, { grade: '', name: '', number: '' }]);
    };

    // 팀원 삭제 함수 (최소 1명 유지)
    const removeMember = (index: number) => {
        if (members.length <= 1) return;
        const newMembers = members.filter((_, i) => i !== index);
        setMembers(newMembers);
    };

    // 입력값 변경 함수
    const handleMemberChange = (index: number, field: keyof Member, value: string) => {
        const newMembers = [...members];
        newMembers[index][field] = value;
        setMembers(newMembers);
    };

    // 2. 제출 버튼 클릭 시 실행
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 유효성 검사: 이름이 비어있는 멤버 제외
        const validMembers = members.filter((m) => m.name.trim() !== '');
        if (validMembers.length === 0) {
            alert('최소 한 명 이상의 팀원 이름을 입력해 주세요.');
            return;
        }

        setIsLoading(true);

        // teams 테이블에 데이터 삽입
        const { error } = await supabase.from('teams').insert([
            {
                sport_id: selectedSport,
                name: teamName,
                // roster를 학년, 이름, 번호가 포함된 객체 배열로 저장
                roster: validMembers,
                status: '승인대기',
            },
        ]);

        setIsLoading(false);

        if (error) {
            console.error('신청 에러:', error);
            alert('신청 중 오류가 발생했습니다.');
        } else {
            alert('참가 신청이 완료되었습니다!');
            router.push('/');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-3xl mx-auto">
                {/* 타이틀 영역 */}
                <div className="w-full border-b-8 border-black pb-6 mb-10 text-center md:text-left">
                    <h1
                        className="text-5xl md:text-6xl font-extrabold text-black tracking-tighter"
                        style={{ fontFamily: 'sans-serif' }}
                    >
                        참가 신청
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-10">
                    {/* 기본 정보 상자 */}
                    <div className="bg-white border-4 border-black p-6 md:p-8 rounded-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-6">
                        {/* 참가 종목 선택 */}
                        <div>
                            <label className="block text-xl font-black text-black mb-3">▶ 참가 종목</label>
                            <select
                                required
                                value={selectedSport}
                                onChange={(e) => setSelectedSport(e.target.value)}
                                className="w-full p-4 border-4 border-black rounded-sm focus:ring-4 focus:ring-gray-300 font-bold text-lg bg-white"
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
                                <p className="text-sm text-red-500 mt-2 font-bold">현재 모집 중인 종목이 없습니다.</p>
                            )}
                        </div>

                        {/* 팀 이름 */}
                        <div>
                            <label className="block text-xl font-black text-black mb-3">▶ 팀 이름</label>
                            <input
                                type="text"
                                required
                                placeholder="팀 이름을 입력하세요"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                className="w-full p-4 border-4 border-black rounded-sm focus:ring-4 focus:ring-gray-300 font-bold text-lg"
                            />
                        </div>
                    </div>

                    {/* 팀원 명단 상자 */}
                    <div className="bg-white border-4 border-black p-6 md:p-8 rounded-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <label className="block text-2xl font-black text-black mb-6">
                            ▶ 팀원 명단 (학년 / 이름 / 번호)
                        </label>

                        <div className="flex flex-col gap-3">
                            {members.map((member, index) => (
                                <div
                                    key={index}
                                    className="flex flex-wrap md:flex-nowrap gap-2 items-center border-b-2 border-gray-100 pb-2 md:pb-0 md:border-none"
                                >
                                    <span className="font-black text-black min-w-[30px]">{index + 1}.</span>
                                    <input
                                        type="text"
                                        placeholder="학년"
                                        value={member.grade}
                                        onChange={(e) => handleMemberChange(index, 'grade', e.target.value)}
                                        className="w-20 p-2 border-2 border-black rounded-sm font-bold text-center"
                                    />
                                    <input
                                        type="text"
                                        placeholder="이름"
                                        value={member.name}
                                        onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                                        className="flex-1 min-w-[100px] p-2 border-2 border-black rounded-sm font-bold"
                                    />
                                    <input
                                        type="text"
                                        placeholder="번호"
                                        value={member.number}
                                        onChange={(e) => handleMemberChange(index, 'number', e.target.value)}
                                        className="w-20 p-2 border-2 border-black rounded-sm font-bold text-center"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeMember(index)}
                                        className="px-3 py-2 bg-gray-200 border-2 border-black font-black hover:bg-red-500 hover:text-white transition"
                                    >
                                        삭제
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* 팀원 추가 버튼 */}
                        <button
                            type="button"
                            onClick={addMember}
                            className="w-full mt-6 py-3 bg-white border-4 border-black font-black text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100 active:translate-y-1 active:shadow-none transition"
                        >
                            + 팀원 추가하기
                        </button>
                    </div>

                    {/* 최종 제출 버튼 */}
                    <button
                        type="submit"
                        disabled={isLoading || sports.length === 0}
                        className="w-full py-6 bg-black text-white font-black text-2xl rounded-sm shadow-[8px_8px_0px_0px_rgba(100,100,100,1)] hover:bg-gray-800 disabled:bg-gray-400 transition mb-10"
                    >
                        {isLoading ? '제출 중...' : '신청서 제출 완료'}
                    </button>
                </form>
            </div>
        </div>
    );
}
