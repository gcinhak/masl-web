// app/(public)/bracket/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SingleEliminationBracket, SVGViewer } from '@g-loot/react-tournament-brackets';

// ==========================================
// 1. 손글씨 스타일 폰트 스타일 정의
// ==========================================
const handwritingStyle = {
    fontFamily: '"Caveat", "Indie Flower", cursive',
    fontWeight: 700,
    fontSize: '1.1rem', // 잘림 방지를 위해 아주 살짝 줄임
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
    iconKey?: string;
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
// 3. Custom Match Card 컴포넌트 (잘림 현상 해결)
// ==========================================
const NyanMatchCard = ({ match }: CustomMatchProps) => {
    const participants = match?.participants || [];
    const team1 = participants[0];
    const team2 = participants[1];

    return (
        <div
            className="bg-transparent flex flex-col justify-center"
            style={{
                width: '100%',
                height: '100%', // ★ 핵심: 라이브러리가 만든 액자 높이에 꽉 차게 자동으로 맞춤
            }}
        >
            {/* 팀 1 영역 */}
            <div className={`flex items-center justify-center px-2 py-1 ${team1?.isWinner ? 'bg-gray-50' : ''}`}>
                <span
                    className={`font-bold text-center mx-2 flex-1 ${team1?.isWinner ? 'text-black font-black' : 'text-gray-700'}`}
                    style={handwritingStyle}
                >
                    {team1?.name || '(미정)'}
                </span>
                <span className="font-mono text-lg font-black text-black ml-auto">{team1?.resultText ?? '-'}</span>
            </div>

            {/* VS 구분선 */}
            <div className="relative text-center flex items-center justify-center w-full" style={{ height: '14px' }}>
                <div className="absolute w-full h-px bg-gray-200"></div>
                <span className="relative bg-white px-2 text-[10px] font-bold text-gray-400">VS</span>
            </div>

            {/* 팀 2 영역 */}
            <div className={`flex items-center justify-center px-2 py-1 ${team2?.isWinner ? 'bg-gray-50' : ''}`}>
                <span
                    className={`font-bold text-center mx-2 flex-1 ${team2?.isWinner ? 'text-black font-black' : 'text-gray-700'}`}
                    style={handwritingStyle}
                >
                    {team2?.name || '(미정)'}
                </span>
                <span className="font-mono text-lg font-black text-black ml-auto">{team2?.resultText ?? '-'}</span>
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

    // 폰트 로드
    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Indie+Flower&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }, []);

    // 종목 목록 불러오기
    useEffect(() => {
        const fetchSports = async () => {
            const { data } = await supabase.from('sports').select('id, name');
            if (data) setSports(data as Sport[]);
        };
        fetchSports();
    }, [supabase]);

    // 대진표 데이터 불러오기 및 변환
    useEffect(() => {
        if (!selectedSport) return;

        const fetchBracket = async () => {
            setIsLoading(true);
            const { data: matchData } = await supabase
                .from('matches')
                .select(`*, team1:team1_id(name, icon_key), team2:team2_id(name, icon_key)`)
                .eq('sport_id', selectedSport);

            if (matchData && matchData.length > 0) {
                const formattedMatches: BracketMatch[] = matchData.map((m) => {
                    const isFinished = m.status === '종료';
                    const team1Won = isFinished && m.team1_score > m.team2_score;
                    const team2Won = isFinished && m.team2_score > m.team1_score;

                    const resolveParticipant = (
                        team: { name?: string; icon_key?: string } | null,
                        teamId: string | number | null,
                        fallbackId: string | number,
                        isTeam1: boolean
                    ): Participant => ({
                        id: teamId || fallbackId,
                        isWinner: isTeam1 ? team1Won : team2Won,
                        name: team?.name || '미정',
                        resultText: isFinished
                            ? isTeam1
                                ? m.team1_score?.toString()
                                : m.team2_score?.toString()
                            : null,
                        iconKey: team?.icon_key,
                    });

                    const nextMatchId =
                        m.next_match_id === null || m.next_match_id === undefined ? null : m.next_match_id;

                    return {
                        id: m.id,
                        nextMatchId,
                        tournamentRoundText: m.round === 2 ? '결승전' : `${m.round}강전`,
                        state: isFinished ? 'DONE' : 'SCHEDULED',
                        participants: [
                            resolveParticipant(m.team1, m.team1_id, `t1-dummy-${m.id}`, true),
                            resolveParticipant(m.team2, m.team2_id, `t2-dummy-${m.id}`, false),
                        ],
                    };
                });
                setBracketData(formattedMatches);
            } else {
                setBracketData([]);
            }
            setIsLoading(false);
        };

        fetchBracket();
    }, [selectedSport, supabase]);

    const hasFinalMatch = bracketData.some((m) => m.nextMatchId === null || m.nextMatchId === undefined);

    return (
        <div className="min-h-screen bg-white p-6 md:p-12">
            <div className="max-w-7xl mx-auto flex flex-col items-center">
                <div className="text-center mb-10 w-full">
                    <h1 className="text-4xl font-extrabold text-black" style={{ fontFamily: 'sans-serif' }}>
                        8강 대진표
                    </h1>
                </div>

                <div className="mb-10 w-full" style={{ maxWidth: '280px' }}>
                    <select
                        className="w-full p-3 border-2 border-black rounded-sm focus:ring-2 focus:ring-gray-300 font-bold bg-white"
                        value={selectedSport}
                        onChange={(e) => setSelectedSport(e.target.value)}
                    >
                        <option value="">종목을 선택하세요</option>
                        {sports.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="bg-transparent p-0 w-full flex-1 relative overflow-x-auto flex justify-center items-center">
                    {isLoading ? (
                        <div className="text-center py-20 text-gray-500 text-lg font-bold">동물 선수들 입장 중...</div>
                    ) : bracketData.length > 0 && hasFinalMatch ? (
                        <div style={{ minWidth: '1000px', minHeight: '600px' }} className="relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white px-6 py-2 border-4 border-black">
                                <span className="text-4xl font-extrabold text-black">우 승</span>
                            </div>

                            <SingleEliminationBracket
                                matches={bracketData}
                                matchComponent={NyanMatchCard}
                                svgWrapper={({
                                    children,
                                    ...props
                                }: {
                                    children: React.ReactNode;
                                    [key: string]: unknown;
                                }) => (
                                    <SVGViewer width={1000} height={600} {...props}>
                                        {children}
                                    </SVGViewer>
                                )}
                                options={{
                                    style: {
                                        roundHeader: {
                                            isShown: false,
                                        },
                                    },
                                }}
                            />
                        </div>
                    ) : bracketData.length > 0 ? (
                        <div className="text-center py-20 text-red-500 text-lg font-bold">
                            대진표 데이터가 유효하지 않습니다. 최종 경기(nextMatchId가 null) 확인 후 다시 시도하세요.
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
