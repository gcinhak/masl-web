// app/(public)/bracket/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
// 대진표 라이브러리 임포트 (SVGViewer 제거)
import { SingleEliminationBracket } from '@g-loot/react-tournament-brackets';

// ==========================================
// 1. 손글씨 스타일 폰트 스타일 정의
// ✅ 수정됨: 글자 크기를 기존보다 약 1.5배(1.5rem)로 키움
// ==========================================
const handwritingStyle = {
    fontFamily: '"Caveat", "Indie Flower", cursive',
    fontWeight: 700,
    fontSize: '1.5rem',
    letterSpacing: '-0.5px',
};

// ==========================================
// 2. 타입 정의
// ==========================================
interface Participant {
    id: string | number;
    isWinner?: boolean;
    name?: string;
    resultText?: string | null;
}

interface BracketMatch {
    id: string | number;
    nextMatchId: string | number | null;
    tournamentRoundText: string;
    state: 'SCHEDULED' | 'DONE';
    participants: Participant[];
}

interface CustomMatchProps {
    match: BracketMatch;
    [key: string]: unknown;
}

interface Sport {
    id: string;
    name: string;
}

// ==========================================
// 3. Custom Match Card 컴포넌트
// ==========================================
const NyanMatchCard = ({ match }: CustomMatchProps) => {
    const participants = match?.participants || [];
    const team1 = participants[0];
    const team2 = participants[1];

    return (
        <div className="bg-transparent flex flex-col justify-center" style={{ width: '100%', height: '100%' }}>
            {/* 팀 1 영역 */}
            <div className={`flex items-center justify-center px-2 py-1 ${team1?.isWinner ? 'bg-gray-50' : ''}`}>
                {/* ✅ 수정됨: 팀별 이미지(동물 아이콘) 박스 삭제 */}

                <span
                    className={`text-center mx-2 flex-1 ${team1?.isWinner ? 'text-black font-black' : 'text-gray-700'}`}
                    style={handwritingStyle}
                >
                    {team1?.name || '(미정)'}
                </span>
                <span className="font-mono text-xl font-black text-black ml-auto">{team1?.resultText ?? '-'}</span>
            </div>

            {/* VS 구분선 */}
            <div className="relative text-center flex items-center justify-center w-full" style={{ height: '12px' }}>
                <div className="absolute w-full h-px bg-gray-200"></div>
                <span className="relative bg-white px-2 text-[10px] font-bold text-gray-300">VS</span>
            </div>

            {/* 팀 2 영역 */}
            <div className={`flex items-center justify-center px-2 py-1 ${team2?.isWinner ? 'bg-gray-50' : ''}`}>
                {/* ✅ 수정됨: 팀별 이미지(동물 아이콘) 박스 삭제 */}

                <span
                    className={`text-center mx-2 flex-1 ${team2?.isWinner ? 'text-black font-black' : 'text-gray-700'}`}
                    style={handwritingStyle}
                >
                    {team2?.name || '(미정)'}
                </span>
                <span className="font-mono text-xl font-black text-black ml-auto">{team2?.resultText ?? '-'}</span>
            </div>
        </div>
    );
};

// ==========================================
// 4. 메인 Public 대진표 페이지
// ==========================================
export default function PublicBracketPage() {
    const supabase = createClient();
    const [sports, setSports] = useState<Sport[]>([]);
    const [selectedSport, setSelectedSport] = useState('');
    const [bracketData, setBracketData] = useState<BracketMatch[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [maxRound, setMaxRound] = useState(0);

    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Indie+Flower&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }, []);

    useEffect(() => {
        const fetchSports = async () => {
            const { data } = await supabase.from('sports').select('id, name');
            if (data) setSports(data as Sport[]);
        };
        fetchSports();
    }, [supabase]);

    useEffect(() => {
        if (!selectedSport) return;

        const fetchBracket = async () => {
            setIsLoading(true);
            const { data: matchData } = await supabase
                .from('matches')
                .select(`*, team1:team1_id(name), team2:team2_id(name)`) // ✅ 수정됨: 불필요한 icon_key 데이터 호출 삭제
                .eq('sport_id', selectedSport);

            if (matchData && matchData.length > 0) {
                const max = Math.max(...matchData.map((m) => m.round));
                setMaxRound(max);

                const formattedMatches: BracketMatch[] = matchData.map((m) => {
                    const isFinished = m.status === '종료';
                    const team1Won = isFinished && m.team1_score > m.team2_score;
                    const team2Won = isFinished && m.team2_score > m.team1_score;

                    return {
                        id: m.id,
                        nextMatchId: m.next_match_id,
                        tournamentRoundText: m.round === 2 ? '결승전' : `${m.round}강전`,
                        state: isFinished ? 'DONE' : 'SCHEDULED',
                        participants: [
                            {
                                id: m.team1_id || `t1-dummy-${m.id}`,
                                isWinner: team1Won,
                                name: m.team1?.name || '미정',
                                resultText: isFinished ? m.team1_score?.toString() : null,
                            },
                            {
                                id: m.team2_id || `t2-dummy-${m.id}`,
                                isWinner: team2Won,
                                name: m.team2?.name || '미정',
                                resultText: isFinished ? m.team2_score?.toString() : null,
                            },
                        ],
                    };
                });
                setBracketData(formattedMatches);
            } else {
                setBracketData([]);
                setMaxRound(0);
            }
            setIsLoading(false);
        };

        fetchBracket();
    }, [selectedSport, supabase]);

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-7xl mx-auto flex flex-col items-center">
                {/* 상단 헤더 영역 (타이틀 좌, 드롭박스 우) - 디자인 유지 */}
                <div className="w-full flex flex-col md:flex-row items-center justify-between border-b-8 border-black pb-6 mb-10 gap-6">
                    <div className="text-center md:text-left">
                        <h1
                            className="text-5xl md:text-6xl font-extrabold text-black tracking-tighter"
                            style={{ fontFamily: 'sans-serif' }}
                        >
                            {maxRound > 0 ? `${maxRound}강 대진표` : '대진표 확인'}
                        </h1>
                        <p className="text-lg md:text-xl text-gray-600 mt-2 font-bold">MASL 스포츠 리그 실시간 상황</p>
                    </div>

                    <div
                        className="w-full md:w-auto bg-white border-4 border-black p-2 rounded-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        style={{ minWidth: '260px' }}
                    >
                        <select
                            className="w-full p-2 border-2 border-black rounded-sm focus:ring-4 focus:ring-gray-300 font-bold text-lg bg-white cursor-pointer"
                            value={selectedSport}
                            onChange={(e) => setSelectedSport(e.target.value)}
                        >
                            <option value="">▶ 종목 선택 ◀</option>
                            {sports.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 대진표 구역 (흰 바탕, 굵은 테두리 상자) - 디자인 유지 */}
                <div className="bg-white border-4 border-black p-4 md:p-8 rounded-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full flex-1 relative overflow-x-auto flex justify-center items-center">
                    {isLoading ? (
                        <div className="text-center py-20 text-gray-500 text-lg font-bold">
                            대진표를 불러오는 중입니다...
                        </div>
                    ) : bracketData.length > 0 ? (
                        <div style={{ minWidth: '1000px', minHeight: '600px' }} className="relative">
                            <SingleEliminationBracket
                                matches={bracketData}
                                matchComponent={NyanMatchCard}
                                // ✅ 수정됨: 확대/축소 기능을 완전히 차단하기 위해 SVGViewer 대신 기본 <svg> 태그를 사용
                                svgWrapper={({
                                    children,
                                    ...props
                                }: {
                                    children: React.ReactNode;
                                    [key: string]: unknown;
                                }) => (
                                    <svg width={1000} height={600} {...(props as React.SVGProps<SVGSVGElement>)}>
                                        {children}
                                    </svg>
                                )}
                                options={{
                                    style: {
                                        roundHeader: { isShown: false },
                                    },
                                }}
                            />
                        </div>
                    ) : selectedSport ? (
                        <div className="text-center py-20 text-gray-500 text-lg font-bold">
                            아직 대진표가 생성되지 않았습니다.
                        </div>
                    ) : (
                        <div className="text-center py-20 text-gray-400 text-lg font-bold">
                            위에서 종목을 선택하면 대진표가 표시됩니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
