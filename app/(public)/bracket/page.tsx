// app/(public)/bracket/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
// 대진표 라이브러리 임포트
import { SingleEliminationBracket } from '@g-loot/react-tournament-brackets';

// ==========================================
// 1. 손글씨 스타일 폰트 스타일 정의
// ==========================================
const handwritingStyle = {
    fontFamily: '"Caveat", "Indie Flower", cursive',
    fontWeight: 700,
    fontSize: '1.1rem',
    letterSpacing: '-0.5px',
};

// ==========================================
// 2. 타입 정의 (TypeScript & ESLint 통과용)
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
    [key: string]: unknown; // 라이브러리 내부에서 넘겨주는 기타 props 허용
}

interface Sport {
    id: string;
    name: string;
}

// ==========================================
// 3. Custom Match Card 컴포넌트 (냥코 대전쟁 스타일 구현)
// ==========================================
const NyanMatchCard = ({ match }: CustomMatchProps) => {
    // ★ 런타임 에러 해결: participants 데이터가 match 객체 안에 들어있음을 명확히 하고 빈 배열로 방어합니다.
    const participants = match?.participants || [];
    const team1 = participants[0];
    const team2 = participants[1];

    return (
        <div
            className="bg-transparent p-0"
            style={{
                width: '280px',
            }}
        >
            {/* 팀 1 영역 */}
            <div
                className={`flex flex-col items-center justify-center p-3 mb-3 ${team1?.isWinner ? 'bg-gray-50' : ''}`}
                style={{
                    border: '2px solid #000',
                    borderRadius: '1px',
                    minHeight: '60px',
                }}
            >
                <span
                    className={`font-bold text-base text-center ${team1?.isWinner ? 'font-black' : 'text-gray-700'}`}
                    style={handwritingStyle}
                >
                    {team1?.name || '(미정)'}
                </span>
                <span className="font-mono text-2xl font-black text-black mt-1">{team1?.resultText ?? '-'}</span>
            </div>

            {/* VS 선 */}
            <svg
                width="100%"
                height="24"
                viewBox="0 0 260 24"
                style={{ overflow: 'visible', margin: '6px 0' }}
                preserveAspectRatio="none"
            >
                {/* 손그린 느낌의 (약간 휘어진) 라인 */}
                <path d="M 10 12 Q 130 8, 250 12" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" />
                <text x="130" y="20" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#999">
                    VS
                </text>
            </svg>

            {/* 팀 2 영역 */}
            <div
                className={`flex flex-col items-center justify-center p-3 ${team2?.isWinner ? 'bg-gray-50' : ''}`}
                style={{
                    border: '2px solid #000',
                    borderRadius: '1px',
                    minHeight: '60px',
                }}
            >
                <span
                    className={`font-bold text-base text-center ${team2?.isWinner ? 'font-black' : 'text-gray-700'}`}
                    style={handwritingStyle}
                >
                    {team2?.name || '(미정)'}
                </span>
                <span className="font-mono text-2xl font-black text-black mt-1">{team2?.resultText ?? '-'}</span>
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
                .select(
                    `
                    *,
                    team1:team1_id(name, icon_key),
                    team2:team2_id(name, icon_key)
                `
                )
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
        <div className="min-h-screen bg-gray-100 p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-2xl font-bold text-black" style={{ fontFamily: 'sans-serif' }}>
                        대진표
                    </h1>
                </div>

                <div className="mb-10 mx-auto" style={{ width: '280px' }}>
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

                <div
                    className="bg-transparent p-0 md:p-0 overflow-x-auto relative"
                    style={{ width: '280px', margin: '0 auto' }}
                >
                    {isLoading ? (
                        <div className="text-center py-20 text-gray-500 text-lg font-bold">동물 선수들 입장 중...</div>
                    ) : bracketData.length > 0 && hasFinalMatch ? (
                        <div style={{ minWidth: '280px', minHeight: 'auto' }} className="relative">
                            <SingleEliminationBracket
                                matches={bracketData}
                                matchComponent={NyanMatchCard}
                                // 확대/축소(zoom) 및 panning을 제거하기 위해 SVGViewer 대신 기본 wrapper를 사용
                                svgWrapper={({ children }: { children: React.ReactNode }) => <>{children}</>}
                                // 라운드 헤더 비활성화
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
